import { Router } from 'express';
import {
  listConversations,
  unreadCount,
  openConversation,
  getConversation,
  sendMessage,
} from '../controllers/messageController.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = Router();

router.use(requireAuth);
router.get('/conversations', asyncHandler(listConversations));
router.post('/conversations', asyncHandler(openConversation));
router.get('/unread-count', asyncHandler(unreadCount));
router.get('/conversations/:id', asyncHandler(getConversation));
router.post('/conversations/:id', asyncHandler(sendMessage));

export default router;
