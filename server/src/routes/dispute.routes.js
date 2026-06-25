import { Router } from 'express';
import {
  raiseDispute,
  getDisputeForOrder,
  listDisputes,
  postDisputeMessage,
  resolveDispute,
} from '../controllers/disputeController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = Router();

router.use(requireAuth);

// Admin queue + resolution.
router.get('/', requireRole('admin'), asyncHandler(listDisputes));
router.post('/:id/resolve', requireRole('admin'), asyncHandler(resolveDispute));

// Participant (buyer/seller) + admin.
router.post('/', asyncHandler(raiseDispute));
router.get('/order/:orderId', asyncHandler(getDisputeForOrder));
router.post('/:id/messages', asyncHandler(postDisputeMessage));

export default router;
