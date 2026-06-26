import { Router } from 'express';
import {
  register,
  login,
  me,
  updateMe,
  requestVerification,
  verifyEmail,
  forgotPassword,
  resetPassword,
} from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = Router();

// Throttle the sensitive/abusable endpoints (per IP).
const loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 10,
  message: 'Too many login attempts. Please try again in a few minutes.',
});
const emailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many requests. Please try again later.',
});

router.post('/register', emailLimiter, asyncHandler(register));
router.post('/login', loginLimiter, asyncHandler(login));
router.get('/me', requireAuth, asyncHandler(me));
router.patch('/me', requireAuth, upload.single('avatar'), asyncHandler(updateMe));

router.post('/verify/request', requireAuth, emailLimiter, asyncHandler(requestVerification));
router.post('/verify', asyncHandler(verifyEmail));
router.post('/password/forgot', emailLimiter, asyncHandler(forgotPassword));
router.post('/password/reset', asyncHandler(resetPassword));

export default router;
