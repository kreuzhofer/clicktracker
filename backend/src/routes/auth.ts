import { Router, Response } from 'express';
import { AuthService } from '../services/AuthService';
import { validateRequest } from '../middleware/validation';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticateToken } from '../middleware/auth';
import { registerSchema, loginSchema, refreshTokenSchema } from '../schemas/auth';
import { AuthenticatedRequest } from '../types';
import { sendSuccess, sendError, CommonErrors, SuccessResponses } from '../utils/apiResponse';

const router = Router();
const authService = new AuthService();

// Register new user
router.post('/register', 
  validateRequest(registerSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const authResponse = await authService.register(req.body);
      return SuccessResponses.CREATED(res, authResponse, 'User registered successfully');
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('already exists')) {
          return sendError(res, CommonErrors.CONFLICT(error.message));
        }
      }
      throw error; // Let the global error handler deal with it
    }
  })
);

// Login user
router.post('/login',
  validateRequest(loginSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const authResponse = await authService.login(req.body);
      return SuccessResponses.OK(res, authResponse, 'Login successful');
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('Invalid email or password')) {
          return sendError(res, CommonErrors.UNAUTHORIZED('Invalid email or password'));
        }
      }
      throw error; // Let the global error handler deal with it
    }
  })
);

// Refresh token
router.post('/refresh',
  validateRequest(refreshTokenSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { token } = req.body;
      const newToken = await authService.refreshToken(token);
      return SuccessResponses.OK(res, { token: newToken }, 'Token refreshed successfully');
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('Invalid or expired token') || error.message.includes('User not found')) {
          return sendError(res, CommonErrors.UNAUTHORIZED(error.message));
        }
      }
      throw error; // Let the global error handler deal with it
    }
  })
);

// Get current user profile (requires authentication)
router.get('/profile',
  authenticateToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    return SuccessResponses.OK(res, { user: req.user }, 'Profile retrieved successfully');
  })
);

export default router;