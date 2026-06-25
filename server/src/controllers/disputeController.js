import { Dispute, DISPUTE_RESOLUTIONS } from '../models/Dispute.js';
import { DisputeMessage } from '../models/DisputeMessage.js';
import { Order } from '../models/Order.js';
import { Listing } from '../models/Listing.js';
import { User } from '../models/User.js';
import { ApiError } from '../middleware/errorHandler.js';
import { refundSettledPayment } from '../services/walletService.js';

// A dispute can only be raised once the payment has settled but before the
// order is closed. Mirrors the `dispute` rule in the order transition table.
const DISPUTABLE_STATUSES = ['payment_verified', 'preparing', 'ready'];

// Resolve a viewer's relationship to an order. Handles raw ObjectIds and
// populated User subdocuments (compare against `ref?._id || ref`, never
// String(ref) — see CLAUDE.md gotcha).
function actorForOrder(order, user) {
  if (user.role === 'admin') return 'admin';
  const buyerId = order.buyerId?._id || order.buyerId;
  const sellerId = order.sellerId?._id || order.sellerId;
  if (String(buyerId) === user.id) return 'buyer';
  if (String(sellerId) === user.id) return 'seller';
  return null;
}

// POST /api/disputes  { orderId, reason } — buyer or seller opens a dispute.
export async function raiseDispute(req, res) {
  const { orderId, reason } = req.body;
  if (!orderId) throw new ApiError(400, 'orderId is required.');
  if (!reason || !reason.trim()) throw new ApiError(400, 'A reason is required.');

  const order = await Order.findById(orderId);
  if (!order) throw new ApiError(404, 'Order not found.');

  const actor = actorForOrder(order, req.user);
  if (actor !== 'buyer' && actor !== 'seller') {
    throw new ApiError(403, 'Only the buyer or seller can dispute this order.');
  }
  if (!DISPUTABLE_STATUSES.includes(order.status)) {
    throw new ApiError(409, `Cannot dispute an order that is ${order.status}.`);
  }

  const existing = await Dispute.findOne({ orderId: order._id });
  if (existing) throw new ApiError(409, 'A dispute already exists for this order.');

  const dispute = await Dispute.create({
    orderId: order._id,
    raisedBy: req.user.id,
    reason: reason.trim(),
    status: 'open',
  });

  // Seed the thread with the opening reason so admins see it in context.
  await DisputeMessage.create({
    disputeId: dispute._id,
    senderId: req.user.id,
    body: reason.trim(),
  });

  order.status = 'disputed';
  order.statusHistory.push({ status: 'disputed', note: `${actor} opened a dispute` });
  await order.save();

  res.status(201).json({ dispute });
}

// GET /api/disputes/order/:orderId — the dispute (if any) for an order, plus
// its message thread. Participants and admins only.
export async function getDisputeForOrder(req, res) {
  const order = await Order.findById(req.params.orderId);
  if (!order) throw new ApiError(404, 'Order not found.');
  if (!actorForOrder(order, req.user)) {
    throw new ApiError(403, 'You are not a participant in this order.');
  }

  const dispute = await Dispute.findOne({ orderId: order._id })
    .populate('raisedBy', 'name')
    .populate('resolvedBy', 'name')
    .lean();
  if (!dispute) return res.json({ dispute: null, messages: [] });

  const messages = await DisputeMessage.find({ disputeId: dispute._id })
    .sort({ createdAt: 1 })
    .populate('senderId', 'name role')
    .lean();

  res.json({ dispute, messages });
}

// GET /api/disputes?status=open — admin queue of disputes.
export async function listDisputes(req, res) {
  const { status } = req.query;
  const filter = status ? { status } : {};
  const disputes = await Dispute.find(filter)
    .sort({ createdAt: -1 })
    .populate('raisedBy', 'name')
    .populate({
      path: 'orderId',
      select: 'titleSnapshot amountReserved status buyerId sellerId',
      populate: [
        { path: 'buyerId', select: 'name' },
        { path: 'sellerId', select: 'name' },
      ],
    })
    .lean();
  res.json({ disputes });
}

// POST /api/disputes/:id/messages  { body } — add to the dispute thread.
// Participants (buyer/seller of the order) and admins may post.
export async function postDisputeMessage(req, res) {
  const { body } = req.body;
  if (!body || !body.trim()) throw new ApiError(400, 'Message cannot be empty.');

  const dispute = await Dispute.findById(req.params.id);
  if (!dispute) throw new ApiError(404, 'Dispute not found.');

  const order = await Order.findById(dispute.orderId);
  if (!order || !actorForOrder(order, req.user)) {
    throw new ApiError(403, 'You are not part of this dispute.');
  }

  const message = await DisputeMessage.create({
    disputeId: dispute._id,
    senderId: req.user.id,
    body: body.trim(),
  });
  const populated = await message.populate('senderId', 'name role');
  res.status(201).json({ message: populated });
}

// POST /api/disputes/:id/resolve  { resolution, refundAmount?, note? } — admin
// closes a dispute and applies the financial + lifecycle outcome.
//   refund  -> full refund to buyer, order cancelled, listing back to available
//   partial -> refundAmount to buyer (seller keeps the rest), order completed
//   release -> seller keeps everything, order completed, listing sold
//   none    -> dispute rejected (treated as release in the seller's favour)
export async function resolveDispute(req, res) {
  const { resolution, refundAmount, note } = req.body;
  if (!DISPUTE_RESOLUTIONS.includes(resolution)) {
    throw new ApiError(400, `Resolution must be one of: ${DISPUTE_RESOLUTIONS.join(', ')}.`);
  }

  const dispute = await Dispute.findById(req.params.id);
  if (!dispute) throw new ApiError(404, 'Dispute not found.');
  if (dispute.status === 'resolved' || dispute.status === 'rejected') {
    throw new ApiError(409, 'This dispute has already been closed.');
  }

  const order = await Order.findById(dispute.orderId);
  if (!order) throw new ApiError(404, 'Order for this dispute no longer exists.');

  const buyer = await User.findById(order.buyerId);
  const seller = await User.findById(order.sellerId);

  let amount = 0;
  let orderStatus;
  let listingStatus;

  if (resolution === 'refund') {
    amount = order.amountReserved;
    orderStatus = 'cancelled';
    listingStatus = 'available';
  } else if (resolution === 'partial') {
    amount = Number(refundAmount);
    if (!amount || amount <= 0 || amount >= order.amountReserved) {
      throw new ApiError(400, `Partial refund must be between 0 and ${order.amountReserved}.`);
    }
    orderStatus = 'completed';
    listingStatus = 'sold';
  } else {
    // 'release' or 'none' — seller keeps the funds.
    orderStatus = 'completed';
    listingStatus = 'sold';
  }

  if (amount > 0) {
    await refundSettledPayment(seller, buyer, amount, order._id);
  }

  await Listing.findByIdAndUpdate(order.listingId, { status: listingStatus });

  order.status = orderStatus;
  order.statusHistory.push({
    status: orderStatus,
    note: note?.trim() || `Dispute resolved: ${resolution}`,
  });
  await order.save();

  dispute.status = resolution === 'none' ? 'rejected' : 'resolved';
  dispute.resolution = resolution;
  dispute.refundAmount = amount;
  dispute.resolvedBy = req.user.id;
  dispute.resolvedAt = new Date();
  await dispute.save();

  // Record the admin's closing note in the thread for both parties.
  await DisputeMessage.create({
    disputeId: dispute._id,
    senderId: req.user.id,
    body: note?.trim() || `Resolved as "${resolution}".`,
  });

  res.json({ dispute, order });
}
