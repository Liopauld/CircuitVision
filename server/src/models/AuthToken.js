import mongoose from 'mongoose';

// Single-use, expiring tokens for email verification and password recovery.
// Only the hash of the token is stored; the raw token is emailed to the user
// and never persisted. A TTL index purges expired rows automatically.
export const TOKEN_PURPOSES = ['email_verify', 'password_reset'];

const authTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    purpose: { type: String, enum: TOKEN_PURPOSES, required: true },
    tokenHash: { type: String, required: true, index: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: false } }
);

// TTL: Mongo removes the document once expiresAt passes.
authTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const AuthToken = mongoose.model('AuthToken', authTokenSchema);
