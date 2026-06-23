import { Router } from 'express';
import {
  adminListListings,
  approveListing,
  rejectListing,
  overrideCategory,
  adminListUsers,
  setUserBan,
  adjustWallet,
  adminListOrders,
  adminListTransactions,
  adminStats,
} from '../controllers/adminController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = Router();

// Every admin route requires an authenticated admin.
router.use(requireAuth, requireRole('admin'));

router.get('/stats', asyncHandler(adminStats));

router.get('/listings', asyncHandler(adminListListings));
router.post('/listings/:id/approve', asyncHandler(approveListing));
router.post('/listings/:id/reject', asyncHandler(rejectListing));
router.patch('/listings/:id/category', asyncHandler(overrideCategory));

router.get('/users', asyncHandler(adminListUsers));
router.post('/users/:id/ban', asyncHandler(setUserBan));
router.post('/users/:id/adjust', asyncHandler(adjustWallet));

router.get('/orders', asyncHandler(adminListOrders));
router.get('/transactions', asyncHandler(adminListTransactions));

export default router;
