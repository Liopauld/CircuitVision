import { User } from '../models/User.js';
import { Listing } from '../models/Listing.js';
import { ApiError } from '../middleware/errorHandler.js';

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
