import { Router } from 'express';
import {
  getWallet,
  topUp,
  getTransactions,
} from '../controllers/walletController.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = Router();

router.use(requireAuth);
router.get('/', asyncHandler(getWallet));
router.post('/topup', asyncHandler(topUp));
router.get('/transactions', asyncHandler(getTransactions));

export default router;
