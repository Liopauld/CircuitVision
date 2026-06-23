import mongoose from 'mongoose';

// A 1:1 conversation between two users, optionally anchored to a listing so
// buyer questions keep their product context. The participant pair + listing
// uniquely identifies a thread (see findOrCreateConversation).
const conversationSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
      },
    ],
    listingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Listing',
      default: null,
    },
    listingTitle: { type: String, default: '' },
    // Denormalized preview for the conversation list (avoids a join per row).
    lastMessage: { type: String, default: '' },
    lastMessageAt: { type: Date, default: null },
    lastSenderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    // Per-participant unread counters, keyed by userId string.
    unread: { type: Map, of: Number, default: {} },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } }
);

conversationSchema.index({ participants: 1, listingId: 1 });

export const Conversation = mongoose.model('Conversation', conversationSchema);
