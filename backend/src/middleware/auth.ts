import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/AuthService';
import { AuthenticatedRequest } from '../types';

const authService = new AuthService();

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
    const payload = authService.verifyToken(token);
    
    // Get user details
    const user = await authService.findUserById(payload.userId);
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
      const payload = authService.verifyToken(token);
      const user = await authService.findUserById(payload.userId);
      
      if (user) {
        req.user = {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name
        };
      }
    }

    next();
  } catch (error) {
    // For optional auth, we don't fail on invalid tokens
    next();
  }
};