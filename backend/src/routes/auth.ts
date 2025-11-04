import { Router, Response } from 'express';
import { AuthService } from '../services/AuthService';
import { validateRequest } from '../middleware/validation';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticateToken } from '../middleware/auth';
import { registerSchema, loginSchema, refreshTokenSchema } from '../schemas/auth';
import { AuthenticatedRequest } from '../types';

const router = Router();
const authService = new AuthService();

// Register new user
router.post('/register', 
  validateRequest(registerSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const authResponse = await authService.register(req.body);
    res.status(201).json(authResponse);
  })
);

// Login user
router.post('/login',
  validateRequest(loginSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const authResponse = await authService.login(req.body);
    res.json(authResponse);
  })
);

// Refresh token
router.post('/refresh',
  validateRequest(refreshTokenSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { token } = req.body;
    const newToken = await authService.refreshToken(token);
    res.json({ token: newToken });
  })
);

// Get current user profile (requires authentication)
router.get('/profile',
  authenticateToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    res.json({ user: req.user });
  })
);

export default router;