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

    // Profile customization.
    avatarUrl: { type: String, default: '' },
    bio: { type: String, default: '', trim: true, maxlength: 280 },
    accentColor: { type: String, default: '' }, // hex like #c98a3a, '' = theme default

    // Cached seller rating, recomputed whenever a review lands (so listing cards
    // and storefronts can show a rating without a per-request aggregation).
    ratingAvg: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },

    // Favourited listings (wishlist).
    favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Listing' }],

    // Wallet fields are seeded now so later phases (orders, top-ups) need no
    // migration. They are not exposed in the Phase 1 UI.
    walletBalance: { type: Number, default: 500 },
    reservedBalance: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } }
);

// Strip sensitive/internal fields from any JSON responses (the owner's view).
userSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    studentId: this.studentId,
    role: this.role,
    avatarUrl: this.avatarUrl,
    bio: this.bio,
    accentColor: this.accentColor,
    ratingAvg: this.ratingAvg,
    ratingCount: this.ratingCount,
    favorites: this.favorites,
    isVerified: this.isVerified,
    isBanned: this.isBanned,
    walletBalance: this.walletBalance,
    reservedBalance: this.reservedBalance,
    createdAt: this.createdAt,
  };
};

// Public storefront view of a seller — no email, wallet, or private fields.
userSchema.methods.toStorefrontJSON = function toStorefrontJSON() {
  return {
    id: this._id,
    name: this.name,
    role: this.role,
    avatarUrl: this.avatarUrl,
    bio: this.bio,
    accentColor: this.accentColor,
    ratingAvg: this.ratingAvg,
    ratingCount: this.ratingCount,
    createdAt: this.createdAt,
  };
};

export const User = mongoose.model('User', userSchema);
