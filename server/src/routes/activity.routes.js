import { Router } from 'express';
import { getActivity } from '../controllers/activityController.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = Router();

// Public — drives the homepage activity ticker.
router.get('/', asyncHandler(getActivity));

export default router;
