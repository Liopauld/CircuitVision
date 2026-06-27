import { Router } from 'express';
import { scanComponent } from '../controllers/scanController.js';
import { requireAuth } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = Router();

// Any signed-in user can scan a component — both the create-listing auto-fill
// (sellers) and the standalone scanner / live camera (everyone).
router.post('/', requireAuth, upload.single('image'), asyncHandler(scanComponent));

export default router;
