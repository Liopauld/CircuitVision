import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true },
    studentId: { type: String, trim: true },
    // customer: can buy. seller: can buy AND list. admin: manages the platform.
    role: {
      type: String,
      enum: ['customer', 'seller', 'admin'],
      default: 'customer',
    },
    isVerified: { type: Boolean, default: false },
    isBanned: { type: Boolean, default: false },

    // Wallet fields are seeded now so later phases (orders, top-ups) need no
    // migration. They are not exposed in the Phase 1 UI.
    walletBalance: { type: Number, default: 500 },
    reservedBalance: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } }
);

// Strip sensitive/internal fields from any JSON responses.
userSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    studentId: this.studentId,
    role: this.role,
    isVerified: this.isVerified,
    isBanned: this.isBanned,
    walletBalance: this.walletBalance,
    reservedBalance: this.reservedBalance,
    createdAt: this.createdAt,
  };
};

export const User = mongoose.model('User', userSchema);
