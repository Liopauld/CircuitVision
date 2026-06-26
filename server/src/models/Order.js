import mongoose from 'mongoose';

// Order lifecycle (mock-payment marketplace):
//   awaiting_payment -> payment_submitted -> payment_verified
//     -> preparing -> ready -> completed
// Cancelled / disputed are terminal states reachable from earlier steps.
export const ORDER_STATUSES = [
  'awaiting_payment',
  'payment_submitted',
  'payment_verified',
  'preparing',
  'ready',
  'completed',
  'cancelled',
  'disputed',
];

const orderSchema = new mongoose.Schema(
  {
    buyerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    listingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Listing',
      required: true,
    },
    // Snapshot of listing details at purchase time (listing may change later).
    titleSnapshot: { type: String, required: true },
    imageSnapshot: { type: String, default: '' },
    quantity: { type: Number, required: true, min: 1, default: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    amountReserved: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ORDER_STATUSES,
      default: 'awaiting_payment',
      index: true,
    },
    fulfillment: { type: String, enum: ['pickup', 'shipping'], default: 'pickup' },
    paymentVerifiedAt: { type: Date, default: null },
    // Append-only audit trail for the UI timeline.
    statusHistory: [
      {
        status: String,
        at: { type: Date, default: Date.now },
        note: String,
        _id: false,
      },
    ],
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } }
);

// Seller dashboard aggregates by seller + status (+ updatedAt for the trend);
// the admin queue scans by status. buyerId/sellerId already have field indexes.
orderSchema.index({ sellerId: 1, status: 1, updatedAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });

export const Order = mongoose.model('Order', orderSchema);
