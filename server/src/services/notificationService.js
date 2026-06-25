import { Notification } from '../models/Notification.js';

// Create an in-app notification for a user. Best-effort: a notification failure
// must never break the primary action (placing an order, sending a message…),
// so errors are swallowed and logged rather than thrown.
export async function notify(userId, type, message, link = '') {
  if (!userId) return;
  try {
    await Notification.create({ userId, type, message, link });
  } catch (err) {
    console.error('[notify] failed to create notification:', err.message);
  }
}
