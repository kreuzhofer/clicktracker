import { Request, Response, NextFunction } from 'express';
import { authenticateToken, optionalAuth } from '../../../src/middleware/auth';
import { AuthenticatedRequest } from '../../../src/types';
import { AuthService } from '../../../src/services/AuthService';

// Mock the entire auth middleware module
jest.mock('../../../src/services/AuthService', () => {
  return {
    AuthService: jest.fn().mockImplementation(() => ({
      verifyToken: jest.fn(),
      findUserById: jest.fn()
    }))
  };
});

describe('Authentication Middleware Unit Tests', () => {
  let mockReq: Partial<AuthenticatedRequest>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let mockAuthService: jest.Mocked<AuthService>;

  beforeEach(() => {
    mockReq = {
      headers: {},
      user: undefined
    };
    
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    
    mockNext = jest.fn();

    // Reset mocks
    jest.clearAllMocks();
    
    // Mock AuthService methods
    mockAuthService = new AuthService() as jest.Mocked<AuthService>;
    mockAuthService.verifyToken = jest.fn();
    mockAuthService.findUserById = jest.fn();
  });

  describe('authenticateToken', () => {
    it('should authenticate valid token', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        password_hash: 'hash',
        created_at: new Date(),
        updated_at: new Date()
      };

      mockReq.headers = {
        authorization: 'Bearer valid-token'
      };

      mockAuthService.verifyToken.mockReturnValue({
        userId: 'user-id',
        email: 'test@example.com'
      });
      
      mockAuthService.findUserById.mockResolvedValue(mockUser);

      await authenticateToken(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockAuthService.verifyToken).toHaveBeenCalledWith('valid-token');
      expect(mockAuthService.findUserById).toHaveBeenCalledWith('user-id');
      expect(mockReq.user).toEqual({
        id: 'user-id',
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User'
      });
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should reject request without authorization header', async () => {
      mockReq.headers = {};

      await authenticateToken(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Access token required' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject request with malformed authorization header', async () => {
      mockReq.headers = {
        authorization: 'InvalidFormat'
      };

      await authenticateToken(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Access token required' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject invalid token', async () => {
      mockReq.headers = {
        authorization: 'Bearer invalid-token'
      };

      mockAuthService.verifyToken.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await authenticateToken(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject token for non-existent user', async () => {
      mockReq.headers = {
        authorization: 'Bearer valid-token'
      };

      mockAuthService.verifyToken.mockReturnValue({
        userId: 'non-existent-user',
        email: 'test@example.com'
      });
      
      mockAuthService.findUserById.mockResolvedValue(null);

      await authenticateToken(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'User not found' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      mockReq.headers = {
        authorization: 'Bearer valid-token'
      };

      mockAuthService.verifyToken.mockReturnValue({
        userId: 'user-id',
        email: 'test@example.com'
      });
      
      mockAuthService.findUserById.mockRejectedValue(new Error('Database error'));

      await authenticateToken(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('optionalAuth', () => {
    it('should authenticate valid token when provided', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        password_hash: 'hash',
        created_at: new Date(),
        updated_at: new Date()
      };

      mockReq.headers = {
        authorization: 'Bearer valid-token'
      };

      mockAuthService.verifyToken.mockReturnValue({
        userId: 'user-id',
        email: 'test@example.com'
      });
      
      mockAuthService.findUserById.mockResolvedValue(mockUser);

      await optionalAuth(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockReq.user).toEqual({
        id: 'user-id',
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User'
      });
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should continue without authentication when no token provided', async () => {
      mockReq.headers = {};

      await optionalAuth(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockReq.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should continue without authentication when invalid token provided', async () => {
      mockReq.headers = {
        authorization: 'Bearer invalid-token'
      };

      mockAuthService.verifyToken.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await optionalAuth(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockReq.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should continue without authentication when user not found', async () => {
      mockReq.headers = {
        authorization: 'Bearer valid-token'
      };

      mockAuthService.verifyToken.mockReturnValue({
        userId: 'non-existent-user',
        email: 'test@example.com'
      });
      
      mockAuthService.findUserById.mockResolvedValue(null);

      await optionalAuth(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockReq.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });
});