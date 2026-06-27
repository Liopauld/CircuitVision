import { Router } from 'express';
import { scanComponent } from '../controllers/scanController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = Router();

// Sellers/admins scan a photo while creating a listing.
router.post(
  '/',
  requireAuth,
  requireRole('seller', 'admin'),
  upload.single('image'),
  asyncHandler(scanComponent)
);

export default router;
