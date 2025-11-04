import { Router, Response } from 'express';
import { validateParams } from '../middleware/validation';
import { asyncHandler } from '../middleware/errorHandler';
import { shortCodeParamsSchema } from '../schemas/campaignLink';
import { AuthenticatedRequest } from '../types';

const router = Router();

// Redirect shortened URL and track click
router.get('/:shortCode',
  validateParams(shortCodeParamsSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    // Implementation will be added when URL shortener service is available
    res.status(501).json({ error: 'Not implemented yet' });
  })
);

export default router;