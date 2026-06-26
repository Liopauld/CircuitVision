import { Router } from 'express';
import {
  listListings,
  listMyListings,
  listHighlights,
  getListing,
  createListing,
  updateListing,
  repostListing,
  deleteListing,
} from '../controllers/listingController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = Router();

router.get('/', asyncHandler(listListings));
router.get('/mine', requireAuth, asyncHandler(listMyListings));
router.get('/highlights', asyncHandler(listHighlights));
router.get('/:id', asyncHandler(getListing));
router.post(
  '/',
  requireAuth,
  requireRole('seller', 'admin'),
  upload.array('images', 5),
  asyncHandler(createListing)
);
router.patch('/:id', requireAuth, upload.array('images', 5), asyncHandler(updateListing));
router.delete('/:id', requireAuth, asyncHandler(deleteListing));
router.post('/:id/repost', requireAuth, asyncHandler(repostListing));

export default router;
