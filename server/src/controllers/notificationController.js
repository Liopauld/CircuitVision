import { Notification } from '../models/Notification.js';

// GET /api/notifications — the caller's notifications, newest first.
export async function listNotifications(req, res) {
  const notifications = await Notification.find({ userId: req.user.id })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
  res.json({ notifications });
}

// GET /api/notifications/unread-count — for the nav badge.
export async function unreadCount(req, res) {
  const count = await Notification.countDocuments({
    userId: req.user.id,
    readAt: null,
  });
  res.json({ count });
}

// POST /api/notifications/read — mark all of the caller's notifications read.
export async function markAllRead(req, res) {
  await Notification.updateMany(
    { userId: req.user.id, readAt: null },
    { $set: { readAt: new Date() } }
  );
  res.json({ ok: true });
}
