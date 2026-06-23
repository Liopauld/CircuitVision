import mongoose from 'mongoose';

export const TX_TYPES = [
  'top_up', // money added to wallet
  'reserve', // funds soft-held when placing an order
  'release', // reserved funds returned (order cancelled)
  'debit', // reserved funds taken from buyer on payment verification
  'credit', // funds paid to seller on payment verification
  'refund', // funds returned after a dispute/admin action
  'adjustment', // manual admin adjustment
];

const walletTransactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: { type: String, enum: TX_TYPES, required: true },
    amount: { type: Number, required: true }, // PHP, always positive
    referenceOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
    },
    description: { type: String, default: '' },
    balanceBefore: { type: Number, required: true },
    balanceAfter: { type: Number, required: true },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: false } }
);

export const WalletTransaction = mongoose.model(
  'WalletTransaction',
  walletTransactionSchema
);
