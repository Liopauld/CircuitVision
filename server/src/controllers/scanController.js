import { classifyComponent } from '../services/roboflowService.js';
import { ApiError } from '../middleware/errorHandler.js';

// POST /api/scan — classify an uploaded component photo into a category
// suggestion. Returns { enabled, suggestedCategory, confidence, label }.
export async function scanComponent(req, res) {
  if (!req.file) throw new ApiError(400, 'An image file is required.');
  const result = await classifyComponent(req.file.buffer);
  res.json(result);
}
