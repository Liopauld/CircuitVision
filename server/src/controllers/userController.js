import { User } from '../models/User.js';
import { Listing } from '../models/Listing.js';
import { Order } from '../models/Order.js';
import { ApiError } from '../middleware/errorHandler.js';

// Achievements derived from activity — no extra persisted state to drift.
const BADGE_DEFS = [
  { id: 'verified', label: 'Verified', icon: '✅', desc: 'Email verified', earned: (s) => s.isVerified },
  { id: 'first-listing', label: 'First Listing', icon: '📦', desc: 'Posted a listing', earned: (s) => s.listingCount >= 1 },
  { id: 'stocked', label: 'Stocked Up', icon: '🏭', desc: '5+ active listings', earned: (s) => s.listingCount >= 5 },
  { id: 'first-sale', label: 'First Sale', icon: '🎉', desc: 'Completed a sale', earned: (s) => s.salesCount >= 1 },
  { id: 'trusted', label: 'Trusted Seller', icon: '🤝', desc: '10+ sales', earned: (s) => s.salesCount >= 10 },
  { id: 'top-rated', label: 'Top Rated', icon: '🌟', desc: '4.5★+ across 3+ reviews', earned: (s) => s.ratingCount >= 3 && s.ratingAvg >= 4.5 },
  { id: 'well-reviewed', label: 'Well Reviewed', icon: '💬', desc: '5+ reviews', earned: (s) => s.ratingCount >= 5 },
  { id: 'first-buy', label: 'First Purchase', icon: '🛍️', desc: 'Bought a component', earned: (s) => s.purchaseCount >= 1 },
  { id: 'regular', label: 'Regular', icon: '🔁', desc: '5+ purchases', earned: (s) => s.purchaseCount >= 5 },
  { id: 'on-fire', label: 'On Fire', icon: '🔥', desc: '7-day login streak', earned: (s) => s.streak >= 7 },
];

// GET /api/users/:id/badges — public list of achievements a user has earned.
export async function getBadges(req, res) {
  const user = await User.findById(req.params.id).lean().catch(() => null);
  if (!user) throw new ApiError(404, 'User not found.');

  const [listingCount, salesCount, purchaseCount] = await Promise.all([
    Listing.countDocuments({ sellerId: user._id, status: { $ne: 'removed' } }),
    Order.countDocuments({ sellerId: user._id, status: 'completed' }),
    Order.countDocuments({ buyerId: user._id, status: 'completed' }),
  ]);
  const stats = {
    listingCount,
    salesCount,
    purchaseCount,
    ratingAvg: user.ratingAvg || 0,
    ratingCount: user.ratingCount || 0,
    isVerified: user.isVerified,
    streak: user.dailyStreak || 0,
  };

  const badges = BADGE_DEFS.filter((b) => b.earned(stats)).map(({ earned, ...b }) => b);
  res.json({ badges });
}

// GET /api/users/me/favorites — the current user's wishlist (hydrated listings,
// soft-deleted ones filtered out).
export async function listFavorites(req, res) {
  const user = await User.findById(req.user.id).populate({
    path: 'favorites',
    match: { status: { $ne: 'removed' } },
    populate: { path: 'sellerId', select: 'name avatarUrl ratingAvg ratingCount' },
  });
  if (!user) throw new ApiError(404, 'User not found.');
  res.json({ listings: user.favorites });
}

// POST /api/users/me/favorites/:listingId — add a listing to the wishlist.
export async function addFavorite(req, res) {
  const listing = await Listing.findById(req.params.listingId).catch(() => null);
  if (!listing) throw new ApiError(404, 'Listing not found.');
  await User.updateOne(
    { _id: req.user.id },
    { $addToSet: { favorites: listing._id } }
  );
  res.json({ ok: true, listingId: listing._id });
}

// DELETE /api/users/me/favorites/:listingId — remove a listing from the wishlist.
export async function removeFavorite(req, res) {
  await User.updateOne(
    { _id: req.user.id },
    { $pull: { favorites: req.params.listingId } }
  );
  res.json({ ok: true, listingId: req.params.listingId });
}

// GET /api/users/:id/storefront — public seller storefront: the seller's safe
// public profile plus their currently-available listings.
export async function getStorefront(req, res) {
  const seller = await User.findById(req.params.id).catch(() => null);
  if (!seller || seller.role === 'customer') {
    throw new ApiError(404, 'Seller not found.');
  }

  const listings = await Listing.find({
    sellerId: seller._id,
    status: 'available',
    $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
  })
    .sort({ createdAt: -1 })
    .lean();

  res.json({ seller: seller.toStorefrontJSON(), listings });
}
