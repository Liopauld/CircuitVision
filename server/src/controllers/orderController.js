import { Order } from '../models/Order.js';
import { Listing } from '../models/Listing.js';
import { User } from '../models/User.js';
import { ApiError } from '../middleware/errorHandler.js';
import {
  moveToReserved,
  releaseReserved,
  settlePayment,
} from '../services/walletService.js';

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
  dispute: {
    from: ['payment_verified', 'preparing', 'ready'],
    by: ['buyer', 'seller'],
    to: 'disputed',
  },
};

function actorFor(order, user) {
  if (user.role === 'admin') return 'admin';
  if (String(order.buyerId) === user.id) return 'buyer';
  if (String(order.sellerId) === user.id) return 'seller';
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

  // Soft-hold the buyer's funds and reserve the listing.
  await moveToReserved(buyer, amount, order._id, `Reserved for "${listing.title}"`);
  listing.status = 'reserved';
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
  if (rule.to === 'payment_verified') {
    const buyer = await User.findById(order.buyerId);
    const seller = await User.findById(order.sellerId);
    await settlePayment(buyer, seller, order.amountReserved, order._id);
    order.paymentVerifiedAt = new Date();
  }

  if (rule.to === 'cancelled') {
    const buyer = await User.findById(order.buyerId);
    await releaseReserved(buyer, order.amountReserved, order._id, 'Order cancelled');
    await Listing.findByIdAndUpdate(order.listingId, { status: 'available' });
  }

  if (rule.to === 'completed') {
    await Listing.findByIdAndUpdate(order.listingId, { status: 'sold' });
  }

  order.status = rule.to;
  order.statusHistory.push({ status: rule.to, note: note || `${actor} → ${action}` });
  await order.save();

  res.json({ order });
}
