import {
  Listing,
  CATEGORIES,
  CONDITIONS,
  STATUSES,
  listingExpiry,
} from '../models/Listing.js';
import { Order } from '../models/Order.js';
import { uploadImageBuffer } from '../config/cloudinary.js';
import { ApiError } from '../middleware/errorHandler.js';

// Match for listings that should surface in public, browsable catalog rows.
const liveMatch = () => ({
  status: 'available',
  $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
});

// Escape user input before building a RegExp so search terms with special
// characters (., *, (, etc.) match literally instead of throwing / misbehaving.
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Supported Browse sort orders (all listing-level fields, so they're cheap).
const SORTS = {
  newest: { createdAt: -1 },
  price_asc: { price: 1 },
  price_desc: { price: -1 },
  views: { viewCount: -1, createdAt: -1 },
};

// GET /api/listings — public browse with filters + live partial-match search.
export async function listListings(req, res) {
  const { q, category, condition, status, minPrice, maxPrice, sort } = req.query;
  const sortBy = SORTS[sort] || SORTS.newest;

  const filter = {};

  // Public browse defaults to available items; callers may override — but a
  // soft-deleted ('removed') listing is never exposed through browse.
  filter.status =
    status && STATUSES.includes(status) && status !== 'removed'
      ? status
      : 'available';

  if (category && CATEGORIES.includes(category)) filter.category = category;
  if (condition && CONDITIONS.includes(condition)) filter.condition = condition;

  if (minPrice != null || maxPrice != null) {
    filter.price = {};
    if (minPrice != null && minPrice !== '') filter.price.$gte = Number(minPrice);
    if (maxPrice != null && maxPrice !== '') filter.price.$lte = Number(maxPrice);
  }

  // Both the text search and the expiry guard need an $or; combine them under a
  // single $and so neither clause clobbers the other.
  const and = [];

  // Case-insensitive substring match over title + description (so "esp" matches
  // "ESP32"), instead of Mongo $text which only matches whole indexed words.
  if (q && q.trim()) {
    const rx = new RegExp(escapeRegex(q.trim()), 'i');
    and.push({ $or: [{ title: rx }, { description: rx }] });
  }

  // Hide stale (expired) listings from public browse. A null expiry (legacy /
  // not-yet-approved) is treated as still live.
  if (filter.status === 'available') {
    and.push({ $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }] });
  }

  if (and.length) filter.$and = and;

  const listings = await Listing.find(filter)
    .sort(sortBy)
    .populate('sellerId', 'name avatarUrl ratingAvg ratingCount')
    .lean();

  res.json({ listings });
}

// GET /api/listings/mine — current user's own listings (any status except
// soft-deleted ones, which are hidden from the seller's management view too).
export async function listMyListings(req, res) {
  const listings = await Listing.find({
    sellerId: req.user.id,
    status: { $ne: 'removed' },
  })
    .sort({ createdAt: -1 })
    .lean();
  res.json({ listings });
}

// GET /api/listings/highlights — curated catalog rows for the home page:
//   bestSellers  — live listings ranked by units sold (completed orders)
//   trending     — live listings ranked by view count
//   newArrivals  — most recently created live listings
export async function listHighlights(req, res) {
  // Rank by units sold across completed orders, then hydrate the live listings.
  const sales = await Order.aggregate([
    { $match: { status: 'completed' } },
    { $group: { _id: '$listingId', sold: { $sum: '$quantity' } } },
    { $sort: { sold: -1 } },
    { $limit: 12 },
  ]);
  const soldByListing = new Map(sales.map((s) => [String(s._id), s.sold]));
  const bestDocs = await Listing.find({
    _id: { $in: sales.map((s) => s._id) },
    ...liveMatch(),
  })
    .populate('sellerId', 'name avatarUrl ratingAvg ratingCount')
    .lean();
  // Keep the aggregation's ranking order and attach the sold count for the UI.
  const bestSellers = sales
    .map((s) => bestDocs.find((d) => String(d._id) === String(s._id)))
    .filter(Boolean)
    .map((d) => ({ ...d, soldCount: soldByListing.get(String(d._id)) || 0 }))
    .slice(0, 10);

  const [trending, newArrivals] = await Promise.all([
    Listing.find(liveMatch())
      .sort({ viewCount: -1, createdAt: -1 })
      .limit(10)
      .populate('sellerId', 'name avatarUrl ratingAvg ratingCount')
      .lean(),
    Listing.find(liveMatch())
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('sellerId', 'name avatarUrl ratingAvg ratingCount')
      .lean(),
  ]);

  res.json({ bestSellers, trending, newArrivals });
}

// GET /api/listings/:id — single listing; increments view count.
export async function getListing(req, res) {
  const listing = await Listing.findByIdAndUpdate(
    req.params.id,
    { $inc: { viewCount: 1 } },
    { new: true }
  ).populate('sellerId', 'name avatarUrl ratingAvg ratingCount');

  if (!listing) throw new ApiError(404, 'Listing not found.');
  res.json({ listing });
}

// POST /api/listings — create a listing (requires auth + at least one image).
export async function createListing(req, res) {
  const { title, description, category, price, condition, quantity, specs } =
    req.body;

  if (!title || !category || price == null || !condition) {
    throw new ApiError(
      400,
      'Title, category, price, and condition are required.'
    );
  }
  if (!CATEGORIES.includes(category)) {
    throw new ApiError(400, `Category must be one of: ${CATEGORIES.join(', ')}.`);
  }
  if (!CONDITIONS.includes(condition)) {
    throw new ApiError(400, `Condition must be one of: ${CONDITIONS.join(', ')}.`);
  }
  if (!req.files || req.files.length === 0) {
    throw new ApiError(400, 'At least one image is required.');
  }

  const urls = await Promise.all(
    req.files.map((file) => uploadImageBuffer(file.buffer))
  );

  let parsedSpecs = {};
  if (specs) {
    try {
      parsedSpecs = typeof specs === 'string' ? JSON.parse(specs) : specs;
    } catch {
      throw new ApiError(400, 'specs must be valid JSON.');
    }
  }

  const listing = await Listing.create({
    sellerId: req.user.id,
    title,
    description: description || '',
    category,
    price: Number(price),
    condition,
    quantity: quantity ? Number(quantity) : 1,
    specs: parsedSpecs,
    cloudinaryUrl: urls,
    status: 'pending', // awaits admin approval (Phase 2+)
  });

  res.status(201).json({ listing });
}

// PATCH /api/listings/:id — owner updates fields or status.
export async function updateListing(req, res) {
  const listing = await Listing.findById(req.params.id);
  if (!listing) throw new ApiError(404, 'Listing not found.');

  if (String(listing.sellerId) !== req.user.id && req.user.role !== 'admin') {
    throw new ApiError(403, 'You can only edit your own listings.');
  }

  const editable = [
    'title',
    'description',
    'price',
    'condition',
    'quantity',
    'status',
    'category',
  ];

  for (const key of editable) {
    if (req.body[key] === undefined) continue;
    if (key === 'category' && !CATEGORIES.includes(req.body.category)) {
      throw new ApiError(400, `Invalid category.`);
    }
    if (key === 'condition' && !CONDITIONS.includes(req.body.condition)) {
      throw new ApiError(400, `Invalid condition.`);
    }
    if (key === 'status' && !STATUSES.includes(req.body.status)) {
      throw new ApiError(400, `Invalid status.`);
    }
    listing[key] = req.body[key];
  }

  await listing.save();
  res.json({ listing });
}

// POST /api/listings/:id/repost — owner refreshes a stale listing's live window.
export async function repostListing(req, res) {
  const listing = await Listing.findById(req.params.id);
  if (!listing) throw new ApiError(404, 'Listing not found.');
  if (String(listing.sellerId) !== req.user.id && req.user.role !== 'admin') {
    throw new ApiError(403, 'You can only repost your own listings.');
  }
  if (!['available', 'pending'].includes(listing.status)) {
    throw new ApiError(409, `A ${listing.status} listing cannot be reposted.`);
  }
  listing.expiresAt = listingExpiry();
  await listing.save();
  res.json({ listing });
}

// DELETE /api/listings/:id — owner/admin soft-deletes (archives) a listing.
// The document is kept (so order history + disputes stay intact) but marked
// 'removed' and hidden everywhere. Blocked while an order is in flight.
export async function deleteListing(req, res) {
  const listing = await Listing.findById(req.params.id);
  if (!listing) throw new ApiError(404, 'Listing not found.');
  if (String(listing.sellerId) !== req.user.id && req.user.role !== 'admin') {
    throw new ApiError(403, 'You can only delete your own listings.');
  }
  if (listing.status === 'reserved') {
    throw new ApiError(
      409,
      'This listing has an order in progress and cannot be deleted.'
    );
  }
  if (listing.status !== 'removed') {
    listing.status = 'removed';
    await listing.save();
  }
  res.json({ ok: true });
}
