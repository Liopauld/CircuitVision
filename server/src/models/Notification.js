import mongoose from 'mongoose';

// Lightweight in-app notification. `link` is a client route the row deep-links
// to (e.g. /orders/123). `readAt` null means unread.
const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: { type: String, required: true }, // order | message | review | dispute
    message: { type: String, required: true },
    link: { type: String, default: '' },
    readAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: false } }
);

export const Notification = mongoose.model('Notification', notificationSchema);
