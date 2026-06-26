import { Router } from 'express';
import { getStorefront } from '../controllers/userController.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = Router();

// Public — anyone can view a seller's storefront.
router.get('/:id/storefront', asyncHandler(getStorefront));

export default router;
