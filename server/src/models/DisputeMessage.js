import mongoose from 'mongoose';

// Threaded back-and-forth on a dispute between the buyer, seller, and the
// admin handling it. Kept separate from Message/Conversation because the
// participant set and access rules differ (admins can always read/write).
const disputeMessageSchema = new mongoose.Schema(
  {
    disputeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Dispute',
      required: true,
      index: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    body: { type: String, required: true, trim: true, maxlength: 2000 },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: false } }
);

export const DisputeMessage = mongoose.model(
  'DisputeMessage',
  disputeMessageSchema
);
