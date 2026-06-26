import { Router } from 'express';
import { register, login, me, updateMe } from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = Router();

router.post('/register', asyncHandler(register));
router.post('/login', asyncHandler(login));
router.get('/me', requireAuth, asyncHandler(me));
router.patch('/me', requireAuth, upload.single('avatar'), asyncHandler(updateMe));

export default router;
