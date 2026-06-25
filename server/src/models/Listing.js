import mongoose from 'mongoose';

export const CATEGORIES = ['esp32', 'raspi', 'arduino'];
export const CONDITIONS = ['new', 'used'];
export const STATUSES = [
  'pending',
  'available',
  'reserved',
  'sold',
  'rejected',
];

const listingSchema = new mongoose.Schema(
  {
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    category: { type: String, enum: CATEGORIES, required: true, index: true },
    price: { type: Number, required: true, min: 0 }, // PHP
    condition: { type: String, enum: CONDITIONS, required: true },
    quantity: { type: Number, required: true, min: 1, default: 1 },
    status: { type: String, enum: STATUSES, default: 'pending', index: true },
    cloudinaryUrl: { type: [String], default: [] },
    specs: { type: mongoose.Schema.Types.Mixed, default: {} },
    viewCount: { type: Number, default: 0 },
    // Set when a listing is approved; once past, an available listing is
    // considered stale and hidden from public browse until the seller reposts.
    expiresAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } }
);

// Full-text search over title + description.
listingSchema.index({ title: 'text', description: 'text' });

// How long an approved listing stays live before it goes stale.
export const LISTING_LIFETIME_DAYS = 30;
export const listingExpiry = () =>
  new Date(Date.now() + LISTING_LIFETIME_DAYS * 24 * 60 * 60 * 1000);

export const Listing = mongoose.model('Listing', listingSchema);
