import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/AuthService';
import { AuthenticatedRequest } from '../types';

// Create a singleton instance that can be mocked in tests
let authServiceInstance: AuthService | null = null;

const getAuthService = (): AuthService => {
  if (!authServiceInstance) {
    authServiceInstance = new AuthService();
  }
  return authServiceInstance;
};

// Export for testing purposes
export const setAuthService = (service: AuthService): void => {
  authServiceInstance = service;
};

// Export for resetting in tests
export const resetAuthService = (): void => {
  authServiceInstance = null;
};

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({ error: 'Access token required' });
      return;
    }

    // Verify token
    let payload;
    try {
      payload = getAuthService().verifyToken(token);
    } catch (tokenError) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }
    
    // Get user details
    const user = await getAuthService().findUserById(payload.userId);
    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      try {
        const payload = getAuthService().verifyToken(token);
        const user = await getAuthService().findUserById(payload.userId);
        
        if (user) {
          req.user = {
            id: user.id,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name
          };
        }
      } catch (tokenError) {
        // Invalid token, but we continue without authentication for optional auth
      }
    }

    next();
  } catch (error) {
    // For optional auth, we don't fail on invalid tokens
    next();
  }
};