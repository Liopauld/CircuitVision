import mongoose from 'mongoose';

// Backs the existing `disputed` order status with a full record so admins can
// review and resolve. Settlement still flows through walletService (a `refund`
// to the buyer or a `credit`/`release` to the seller) — this model never
// touches balances itself.
export const DISPUTE_STATUSES = ['open', 'under_review', 'resolved', 'rejected'];
export const DISPUTE_RESOLUTIONS = ['refund', 'release', 'partial', 'none'];

const disputeSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      unique: true, // one open dispute record per order
      index: true,
    },
    raisedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    status: {
      type: String,
      enum: DISPUTE_STATUSES,
      default: 'open',
      index: true,
    },
    resolution: { type: String, enum: DISPUTE_RESOLUTIONS, default: 'none' },
    reason: { type: String, required: true, trim: true, maxlength: 2000 },
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } }
);

export const Dispute = mongoose.model('Dispute', disputeSchema);
