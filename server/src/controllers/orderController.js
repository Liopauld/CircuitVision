import mongoose from 'mongoose';
import { Order } from '../models/Order.js';
import { Listing } from '../models/Listing.js';
import { User } from '../models/User.js';
import { ApiError } from '../middleware/errorHandler.js';
import {
  moveToReserved,
  releaseReserved,
  settlePayment,
} from '../services/walletService.js';
import { notify } from '../services/notificationService.js';

// Transition table. For each action: which order statuses it is valid from,
// which party (relative to the order) may perform it, and the resulting status.
// `actor` is resolved per-request to 'buyer' | 'seller' | 'admin'.
const TRANSITIONS = {
  submit_payment: { from: ['awaiting_payment'], by: ['buyer'], to: 'payment_submitted' },
  verify_payment: { from: ['payment_submitted'], by: ['seller', 'admin'], to: 'payment_verified' },
  prepare: { from: ['payment_verified'], by: ['seller', 'admin'], to: 'preparing' },
  ship: { from: ['preparing'], by: ['seller', 'admin'], to: 'ready' },
  complete: { from: ['ready'], by: ['buyer', 'admin'], to: 'completed' },
  cancel: {
    from: ['awaiting_payment', 'payment_submitted'],
    by: ['buyer', 'seller', 'admin'],
    to: 'cancelled',
  },
  // Disputes are owned by disputeController (it also creates the Dispute record
  // + thread), so the `disputed` status is not reachable from this table.
};

function actorFor(order, user) {
  if (user.role === 'admin') return 'admin';
  // buyerId/sellerId may be raw ObjectIds (transitionOrder) or populated User
  // subdocuments (getOrder); normalize to the id string before comparing.
  const buyerId = order.buyerId?._id || order.buyerId;
  const sellerId = order.sellerId?._id || order.sellerId;
  if (String(buyerId) === user.id) return 'buyer';
  if (String(sellerId) === user.id) return 'seller';
  return null;
}

// POST /api/orders — place an order against an available listing.
export async function placeOrder(req, res) {
  const { listingId, quantity = 1, fulfillment = 'pickup' } = req.body;
  const qty = Number(quantity);
  if (!listingId) throw new ApiError(400, 'listingId is required.');
  if (qty < 1) throw new ApiError(400, 'Quantity must be at least 1.');

  const listing = await Listing.findById(listingId);
  if (!listing) throw new ApiError(404, 'Listing not found.');
  if (listing.status !== 'available') {
    throw new ApiError(409, 'This listing is not available for purchase.');
  }
  if (String(listing.sellerId) === req.user.id) {
    throw new ApiError(400, 'You cannot buy your own listing.');
  }
  if (qty > listing.quantity) {
    throw new ApiError(400, `Only ${listing.quantity} in stock.`);
  }

  const buyer = await User.findById(req.user.id);
  const amount = listing.price * qty;
  if (buyer.walletBalance < amount) {
    throw new ApiError(400, 'Insufficient wallet balance. Top up to continue.');
  }

  const order = await Order.create({
    buyerId: buyer._id,
    sellerId: listing.sellerId,
    listingId: listing._id,
    titleSnapshot: listing.title,
    imageSnapshot: listing.cloudinaryUrl?.[0] || '',
    quantity: qty,
    unitPrice: listing.price,
    amountReserved: amount,
    fulfillment,
    status: 'awaiting_payment',
    statusHistory: [{ status: 'awaiting_payment', note: 'Order placed' }],
  });

  // Soft-hold the buyer's funds and draw down the listing's stock. The listing
  // stays browsable while units remain; it only flips to 'reserved' (and out of
  // browse) once this order claims the last unit.
  await moveToReserved(buyer, amount, order._id, `Reserved for "${listing.title}"`);
  listing.quantity -= qty;
  listing.status = listing.quantity > 0 ? 'available' : 'reserved';
  await listing.save();

  res.status(201).json({ order });
}

// GET /api/orders?role=buyer|seller — orders for the current user.
export async function listOrders(req, res) {
  const { role } = req.query;
  const filter =
    role === 'seller'
      ? { sellerId: req.user.id }
      : role === 'buyer'
      ? { buyerId: req.user.id }
      : { $or: [{ buyerId: req.user.id }, { sellerId: req.user.id }] };

  const orders = await Order.find(filter)
    .sort({ createdAt: -1 })
    .populate('buyerId', 'name')
    .populate('sellerId', 'name')
    .lean();
  res.json({ orders });
}

// GET /api/orders/:id — single order (must be a participant or admin).
export async function getOrder(req, res) {
  const order = await Order.findById(req.params.id)
    .populate('buyerId', 'name')
    .populate('sellerId', 'name');
  if (!order) throw new ApiError(404, 'Order not found.');
  if (!actorFor(order, req.user)) {
    throw new ApiError(403, 'You are not a participant in this order.');
  }
  res.json({ order });
}

// POST /api/orders/:id/actions — drive the order through its lifecycle.
export async function transitionOrder(req, res) {
  const { action, note } = req.body;
  const rule = TRANSITIONS[action];
  if (!rule) {
    throw new ApiError(400, `Unknown action: ${action}.`);
  }

  const order = await Order.findById(req.params.id);
  if (!order) throw new ApiError(404, 'Order not found.');

  const actor = actorFor(order, req.user);
  if (!actor) throw new ApiError(403, 'You are not a participant in this order.');
  if (!rule.by.includes(actor)) {
    throw new ApiError(403, `Only the ${rule.by.join('/')} can ${action.replace('_', ' ')}.`);
  }
  if (!rule.from.includes(order.status)) {
    throw new ApiError(409, `Cannot ${action.replace('_', ' ')} an order that is ${order.status}.`);
  }

  // Side effects on entering the new state.
  // Escrow model: the buyer's funds stay reserved through the whole fulfilment
  // and are only released to the seller when the buyer confirms completion.
  // verify_payment merely acknowledges the buyer paid into escrow.
  if (rule.to === 'payment_verified') {
    order.paymentVerifiedAt = new Date();
  }

  if (rule.to === 'cancelled') {
    const buyer = await User.findById(order.buyerId);
    await releaseReserved(buyer, order.amountReserved, order._id, 'Order cancelled');
    // Return the held units to stock and make the listing browsable again.
    await Listing.findByIdAndUpdate(order.listingId, {
      status: 'available',
      $inc: { quantity: order.quantity },
    });
  }

  if (rule.to === 'completed') {
    // Release escrow: settle the reserved funds to the seller for good.
    const buyer = await User.findById(order.buyerId);
    const seller = await User.findById(order.sellerId);
    await settlePayment(buyer, seller, order.amountReserved, order._id);
    // The units were already drawn down at order time; only mark the listing
    // 'sold' once its stock is exhausted, otherwise leave it available.
    const listing = await Listing.findById(order.listingId);
    if (listing) {
      listing.status = listing.quantity > 0 ? 'available' : 'sold';
      await listing.save();
    }
  }

  order.status = rule.to;
  order.statusHistory.push({ status: rule.to, note: note || `${actor} → ${action}` });
  await order.save();

  // Notify the other party (or both, when an admin acts) about the change.
  const label = rule.to.replace(/_/g, ' ');
  const msg = `Order "${order.titleSnapshot}" is now ${label}.`;
  const link = `/orders/${order._id}`;
  if (actor === 'admin') {
    await notify(order.buyerId, 'order', msg, link);
    await notify(order.sellerId, 'order', msg, link);
  } else {
    await notify(actor === 'buyer' ? order.sellerId : order.buyerId, 'order', msg, link);
  }

  res.json({ order });
}

// GET /api/orders/seller/dashboard — sales analytics for the current seller:
// realized revenue, escrowed (pending) payout, listing/view counts, the
// seller's best-selling items, and a dense 7-day revenue trend.
export async function sellerDashboard(req, res) {
  const sellerId = new mongoose.Types.ObjectId(req.user.id);
  const IN_FLIGHT = ['payment_verified', 'preparing', 'ready'];
  const since = new Date();
  since.setDate(since.getDate() - 6);
  since.setHours(0, 0, 0, 0);

  const [soldAgg, escrowAgg, listingAgg, topRaw, trendRaw] = await Promise.all([
    Order.aggregate([
      { $match: { sellerId, status: 'completed' } },
      {
        $group: {
          _id: null,
          revenue: { $sum: '$amountReserved' },
          units: { $sum: '$quantity' },
          count: { $sum: 1 },
        },
      },
    ]),
    Order.aggregate([
      { $match: { sellerId, status: { $in: IN_FLIGHT } } },
      { $group: { _id: null, amount: { $sum: '$amountReserved' }, count: { $sum: 1 } } },
    ]),
    Listing.aggregate([
      { $match: { sellerId, status: { $ne: 'removed' } } },
      {
        $group: {
          _id: null,
          active: { $sum: { $cond: [{ $eq: ['$status', 'available'] }, 1, 0] } },
          total: { $sum: 1 },
          views: { $sum: '$viewCount' },
        },
      },
    ]),
    Order.aggregate([
      { $match: { sellerId, status: 'completed' } },
      {
        $group: {
          _id: '$listingId',
          title: { $first: '$titleSnapshot' },
          image: { $first: '$imageSnapshot' },
          units: { $sum: '$quantity' },
          revenue: { $sum: '$amountReserved' },
        },
      },
      { $sort: { units: -1 } },
      { $limit: 5 },
    ]),
    Order.aggregate([
      { $match: { sellerId, status: 'completed', updatedAt: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$updatedAt' } },
          revenue: { $sum: '$amountReserved' },
        },
      },
    ]),
  ]);

  // Fill in the last 7 calendar days so the chart has no gaps.
  const trendMap = new Map(trendRaw.map((t) => [t._id, t.revenue]));
  const trend = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    trend.push({ date: key, revenue: trendMap.get(key) || 0 });
  }

  res.json({
    revenue: soldAgg[0]?.revenue || 0,
    unitsSold: soldAgg[0]?.units || 0,
    salesCount: soldAgg[0]?.count || 0,
    pendingPayout: escrowAgg[0]?.amount || 0,
    pendingCount: escrowAgg[0]?.count || 0,
    activeListings: listingAgg[0]?.active || 0,
    totalListings: listingAgg[0]?.total || 0,
    totalViews: listingAgg[0]?.views || 0,
    topListings: topRaw.map((t) => ({
      listingId: t._id,
      title: t.title,
      image: t.image,
      units: t.units,
      revenue: t.revenue,
    })),
    trend,
  });
}
