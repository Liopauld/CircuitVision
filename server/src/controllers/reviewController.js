import mongoose from 'mongoose';
import { Review } from '../models/Review.js';
import { Order } from '../models/Order.js';
import { User } from '../models/User.js';
import { ApiError } from '../middleware/errorHandler.js';
import { notify } from '../services/notificationService.js';

// Recompute and cache a seller's average rating + count on their User doc so
// listing cards and storefronts don't need a per-request aggregation.
async function recomputeSellerRating(sellerId) {
  const [agg] = await Review.aggregate([
    { $match: { sellerId: new mongoose.Types.ObjectId(String(sellerId)) } },
    { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  await User.updateOne(
    { _id: sellerId },
    {
      ratingAvg: agg ? Math.round(agg.avg * 10) / 10 : 0,
      ratingCount: agg?.count || 0,
    }
  );
}

// POST /api/reviews  { orderId, rating, comment } — buyer reviews a completed order.
export async function createReview(req, res) {
  const { orderId, rating, comment } = req.body;
  const stars = Number(rating);
  if (!orderId) throw new ApiError(400, 'orderId is required.');
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
    throw new ApiError(400, 'Rating must be a whole number from 1 to 5.');
  }

  const order = await Order.findById(orderId);
  if (!order) throw new ApiError(404, 'Order not found.');
  if (String(order.buyerId) !== req.user.id) {
    throw new ApiError(403, 'Only the buyer can review this order.');
  }
  if (order.status !== 'completed') {
    throw new ApiError(409, 'You can only review a completed order.');
  }

  const existing = await Review.findOne({ orderId });
  if (existing) throw new ApiError(409, 'You have already reviewed this order.');

  const review = await Review.create({
    orderId,
    listingId: order.listingId,
    sellerId: order.sellerId,
    buyerId: order.buyerId,
    rating: stars,
    comment: (comment || '').trim(),
  });

  await recomputeSellerRating(order.sellerId);

  await notify(order.sellerId, 'review', `You received a ${stars}★ review.`, '/profile');

  res.status(201).json({ review });
}

// GET /api/reviews/seller/:sellerId — public: a seller's reviews + average.
export async function getSellerReviews(req, res) {
  const { sellerId } = req.params;
  const reviews = await Review.find({ sellerId })
    .sort({ createdAt: -1 })
    .populate('buyerId', 'name')
    .lean();

  const count = reviews.length;
  const average = count
    ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / count) * 10) / 10
    : 0;

  res.json({ reviews, average, count });
}

// GET /api/reviews/order/:orderId — the review for an order (if any).
export async function getOrderReview(req, res) {
  const review = await Review.findOne({ orderId: req.params.orderId }).lean();
  res.json({ review: review || null });
}
