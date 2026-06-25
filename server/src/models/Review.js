import mongoose from 'mongoose';

// A buyer's rating of a seller, tied 1:1 to a completed order so reviews can't
// be faked without a real purchase.
const reviewSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      unique: true, // one review per order
      index: true,
    },
    listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: '', trim: true, maxlength: 1000 },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } }
);

export const Review = mongoose.model('Review', reviewSchema);
