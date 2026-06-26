import { User } from '../models/User.js';
import { Listing } from '../models/Listing.js';
import { ApiError } from '../middleware/errorHandler.js';

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
