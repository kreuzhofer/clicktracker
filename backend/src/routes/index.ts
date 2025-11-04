import { Router } from 'express';
import { authenticateToken, optionalAuth } from '../middleware/auth';

// Import route modules
import authRoutes from './auth';
import campaignRoutes from './campaigns';
import campaignLinkRoutes from './campaignLinks';
import shortenerRoutes from './shortener';
import analyticsRoutes from './analytics';
import conversionRoutes from './conversions';
import youtubeRoutes from './youtube';

const router = Router();

// Public routes (no authentication required)
router.use('/auth', authRoutes);

// Protected routes (authentication required)
router.use('/campaigns', authenticateToken, campaignRoutes);
router.use('/campaigns', authenticateToken, campaignLinkRoutes);
router.use('/analytics', authenticateToken, analyticsRoutes);
router.use('/youtube', authenticateToken, youtubeRoutes);

// Conversion tracking can be public (for tracking scripts)
router.use('/conversions', optionalAuth, conversionRoutes);

// Short URL redirects should be last to avoid conflicts (catch-all pattern)
router.use('/', shortenerRoutes);

export default router;