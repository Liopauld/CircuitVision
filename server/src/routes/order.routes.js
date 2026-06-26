import { Router } from 'express';
import {
  placeOrder,
  listOrders,
  getOrder,
  transitionOrder,
  sellerDashboard,
} from '../controllers/orderController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = Router();

router.use(requireAuth);
router.post('/', asyncHandler(placeOrder));
router.get('/', asyncHandler(listOrders));
// Must precede '/:id' so "seller" isn't captured as an order id.
router.get('/seller/dashboard', requireRole('seller', 'admin'), asyncHandler(sellerDashboard));
router.get('/:id', asyncHandler(getOrder));
router.post('/:id/actions', asyncHandler(transitionOrder));

export default router;
