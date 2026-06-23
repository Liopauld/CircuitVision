import { Conversation } from '../models/Conversation.js';
import { Message } from '../models/Message.js';
import { Listing } from '../models/Listing.js';
import { User } from '../models/User.js';
import { ApiError } from '../middleware/errorHandler.js';

// Ensures the requester is one of the conversation's participants.
function assertParticipant(conversation, userId) {
  const isMember = conversation.participants.some((p) => String(p) === userId);
  if (!isMember) throw new ApiError(403, 'You are not part of this conversation.');
}

// GET /api/messages/conversations — the caller's threads, newest activity first.
export async function listConversations(req, res) {
  const conversations = await Conversation.find({ participants: req.user.id })
    .sort({ lastMessageAt: -1, updatedAt: -1 })
    .populate('participants', 'name role')
    .lean();

  // Shape each row for the current viewer: surface the *other* party + own unread count.
  const rows = conversations.map((c) => {
    const other = c.participants.find((p) => String(p._id) !== req.user.id) || null;
    const unread = (c.unread && c.unread[req.user.id]) || 0;
    return {
      id: c._id,
      other,
      listingId: c.listingId,
      listingTitle: c.listingTitle,
      lastMessage: c.lastMessage,
      lastMessageAt: c.lastMessageAt,
      lastSenderId: c.lastSenderId,
      unread,
    };
  });
  res.json({ conversations: rows });
}

// GET /api/messages/unread-count — total unread across all threads (for the nav badge).
export async function unreadCount(req, res) {
  const conversations = await Conversation.find({ participants: req.user.id })
    .select('unread')
    .lean();
  const total = conversations.reduce(
    (sum, c) => sum + ((c.unread && c.unread[req.user.id]) || 0),
    0
  );
  res.json({ count: total });
}

// POST /api/messages/conversations — open (or reuse) a thread with another user.
// Body: { userId?, listingId?, body? }. Either userId or listingId is required.
export async function openConversation(req, res) {
  let { userId, listingId, body } = req.body;
  let listingTitle = '';

  // Starting from a listing: the seller becomes the other participant.
  if (listingId) {
    const listing = await Listing.findById(listingId).lean();
    if (!listing) throw new ApiError(404, 'Listing not found.');
    listingTitle = listing.title;
    if (!userId) userId = String(listing.sellerId);
  }

  if (!userId) throw new ApiError(400, 'A recipient (userId or listingId) is required.');
  if (userId === req.user.id) throw new ApiError(400, 'You cannot message yourself.');

  const other = await User.findById(userId).lean();
  if (!other) throw new ApiError(404, 'Recipient not found.');

  const pair = [req.user.id, userId];
  let conversation = await Conversation.findOne({
    participants: { $all: pair, $size: 2 },
    listingId: listingId || null,
  });

  if (!conversation) {
    conversation = await Conversation.create({
      participants: pair,
      listingId: listingId || null,
      listingTitle,
      unread: { [req.user.id]: 0, [userId]: 0 },
    });
  }

  // Optional first message in the same call.
  if (body && body.trim()) {
    await postToConversation(conversation, req.user.id, userId, body.trim());
  }

  res.status(201).json({ conversationId: conversation._id });
}

// GET /api/messages/conversations/:id — thread + messages; marks them read for the caller.
export async function getConversation(req, res) {
  const conversation = await Conversation.findById(req.params.id).populate(
    'participants',
    'name role'
  );
  if (!conversation) throw new ApiError(404, 'Conversation not found.');
  assertParticipant(conversation, req.user.id);

  const messages = await Message.find({ conversationId: conversation._id })
    .sort({ createdAt: 1 })
    .lean();

  // Mark unread incoming messages as read for the caller.
  await Message.updateMany(
    { conversationId: conversation._id, senderId: { $ne: req.user.id }, readAt: null },
    { $set: { readAt: new Date() } }
  );
  conversation.unread.set(req.user.id, 0);
  await conversation.save();

  const other =
    conversation.participants.find((p) => String(p._id) !== req.user.id) || null;

  res.json({
    conversation: {
      id: conversation._id,
      other,
      listingId: conversation.listingId,
      listingTitle: conversation.listingTitle,
    },
    messages,
  });
}

// Shared write path used by openConversation and sendMessage.
async function postToConversation(conversation, senderId, recipientId, body) {
  const message = await Message.create({
    conversationId: conversation._id,
    senderId,
    body,
  });
  conversation.lastMessage = body.slice(0, 140);
  conversation.lastMessageAt = message.createdAt;
  conversation.lastSenderId = senderId;
  const current = conversation.unread.get(String(recipientId)) || 0;
  conversation.unread.set(String(recipientId), current + 1);
  await conversation.save();
  return message;
}

// POST /api/messages/conversations/:id — send a message into an existing thread.
export async function sendMessage(req, res) {
  const { body } = req.body;
  if (!body || !body.trim()) throw new ApiError(400, 'Message cannot be empty.');

  const conversation = await Conversation.findById(req.params.id);
  if (!conversation) throw new ApiError(404, 'Conversation not found.');
  assertParticipant(conversation, req.user.id);

  const recipientId = conversation.participants.find(
    (p) => String(p) !== req.user.id
  );
  const message = await postToConversation(
    conversation,
    req.user.id,
    String(recipientId),
    body.trim()
  );
  res.status(201).json({ message });
}
