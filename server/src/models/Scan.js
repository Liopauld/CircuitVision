import mongoose from 'mongoose';

import { CATEGORIES } from './Listing.js';

// Result of a Roboflow component-recognition scan. A scan can stand alone
// (the seller is exploring) or be linked to the listing it was used to
// pre-fill. The raw Roboflow payload is kept for debugging / re-mapping.
const scanSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    listingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Listing',
      default: null,
    },
    imageUrl: { type: String, required: true },
    detectedCategory: { type: String, enum: CATEGORIES, default: null },
    confidence: { type: Number, min: 0, max: 1, default: 0 },
    roboflowRaw: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: false } }
);

export const Scan = mongoose.model('Scan', scanSchema);
