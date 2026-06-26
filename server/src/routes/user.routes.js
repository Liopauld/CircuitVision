import { Router } from 'express';
import {
  getStorefront,
  listFavorites,
  addFavorite,
  removeFavorite,
} from '../controllers/userController.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = Router();

// Wishlist — current user's favourites (literal "/me/..." precede "/:id/...").
router.get('/me/favorites', requireAuth, asyncHandler(listFavorites));
router.post('/me/favorites/:listingId', requireAuth, asyncHandler(addFavorite));
router.delete('/me/favorites/:listingId', requireAuth, asyncHandler(removeFavorite));

// Public — anyone can view a seller's storefront.
router.get('/:id/storefront', asyncHandler(getStorefront));

export default router;
