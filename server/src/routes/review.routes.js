import { Router } from 'express';
import {
  createReview,
  getSellerReviews,
  getOrderReview,
} from '../controllers/reviewController.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = Router();

// Public: a seller's reviews + average (shown on listings to guests too).
router.get('/seller/:sellerId', asyncHandler(getSellerReviews));

router.use(requireAuth);
router.post('/', asyncHandler(createReview));
router.get('/order/:orderId', asyncHandler(getOrderReview));

export default router;
