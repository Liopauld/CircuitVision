import {
  Listing,
  CATEGORIES,
  CONDITIONS,
  STATUSES,
} from '../models/Listing.js';
import { uploadImageBuffer } from '../config/cloudinary.js';
import { ApiError } from '../middleware/errorHandler.js';

// GET /api/listings — public browse with filters + text search.
export async function listListings(req, res) {
  const { q, category, condition, status, minPrice, maxPrice } = req.query;

  const filter = {};

  // Public browse defaults to available items; callers may override.
  filter.status = status && STATUSES.includes(status) ? status : 'available';

  if (category && CATEGORIES.includes(category)) filter.category = category;
  if (condition && CONDITIONS.includes(condition)) filter.condition = condition;

  if (minPrice != null || maxPrice != null) {
    filter.price = {};
    if (minPrice != null && minPrice !== '') filter.price.$gte = Number(minPrice);
    if (maxPrice != null && maxPrice !== '') filter.price.$lte = Number(maxPrice);
  }

  if (q && q.trim()) {
    filter.$text = { $search: q.trim() };
  }

  const listings = await Listing.find(filter)
    .sort({ createdAt: -1 })
    .populate('sellerId', 'name')
    .lean();

  res.json({ listings });
}

// GET /api/listings/mine — current user's own listings (any status).
export async function listMyListings(req, res) {
  const listings = await Listing.find({ sellerId: req.user.id })
    .sort({ createdAt: -1 })
    .lean();
  res.json({ listings });
}

// GET /api/listings/:id — single listing; increments view count.
export async function getListing(req, res) {
  const listing = await Listing.findByIdAndUpdate(
    req.params.id,
    { $inc: { viewCount: 1 } },
    { new: true }
  ).populate('sellerId', 'name');

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
