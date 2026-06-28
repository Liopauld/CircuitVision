import { Router } from 'express';
import { listCatalog } from '../controllers/catalogController.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = Router();

// Public reference data — known components and their basic specs.
router.get('/', asyncHandler(listCatalog));

export default router;
