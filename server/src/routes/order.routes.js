import { Router } from 'express';
import {
  placeOrder,
  listOrders,
  getOrder,
  transitionOrder,
} from '../controllers/orderController.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = Router();

router.use(requireAuth);
router.post('/', asyncHandler(placeOrder));
router.get('/', asyncHandler(listOrders));
router.get('/:id', asyncHandler(getOrder));
router.post('/:id/actions', asyncHandler(transitionOrder));

export default router;
