import { Request, Response, NextFunction } from 'express';
import { 
  errorHandler, 
  notFoundHandler, 
  asyncHandler,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError
} from '../../../src/middleware/errorHandler';

describe('Error Handler Middleware Unit Tests', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      url: '/test',
      method: 'GET',
      path: '/test'
    };
    
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    
    mockNext = jest.fn();

    // Mock console.error to avoid noise in tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Set test environment
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('errorHandler', () => {
    it('should handle ValidationError with correct status code', () => {
      const error = new ValidationError('Invalid input');

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Invalid input',
        timestamp: expect.any(String)
      });
    });

    it('should handle AuthenticationError with correct status code', () => {
      const error = new AuthenticationError('Authentication required');

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Authentication required',
        timestamp: expect.any(String)
      });
    });

    it('should handle AuthorizationError with correct status code', () => {
      const error = new AuthorizationError('Access denied');

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Access denied',
        timestamp: expect.any(String)
      });
    });

    it('should handle NotFoundError with correct status code', () => {
      const error = new NotFoundError('Resource not found');

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Resource not found',
        timestamp: expect.any(String)
      });
    });

    it('should handle ConflictError with correct status code', () => {
      const error = new ConflictError('Resource conflict');

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Resource conflict',
        timestamp: expect.any(String)
      });
    });

    it('should handle RateLimitError with correct status code', () => {
      const error = new RateLimitError('Too many requests');

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(429);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Too many requests',
        timestamp: expect.any(String)
      });
    });

    it('should handle generic errors with 500 status code', () => {
      const error = new Error('Generic error');

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Generic error',
        timestamp: expect.any(String)
      });
    });

    it('should handle database duplicate key errors', () => {
      const error = new Error('duplicate key value violates unique constraint');

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Resource already exists',
        timestamp: expect.any(String)
      });
    });

    it('should handle database foreign key constraint errors', () => {
      const error = new Error('foreign key constraint violation');

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Invalid reference to related resource',
        timestamp: expect.any(String)
      });
    });

    it('should handle database not-null constraint errors', () => {
      const error = new Error('not-null constraint violation');

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Required field is missing',
        timestamp: expect.any(String)
      });
    });

    it('should include stack trace in development environment', () => {
      process.env.NODE_ENV = 'development';
      const error = new Error('Test error');
      error.stack = 'Error stack trace';

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Test error',
        timestamp: expect.any(String),
        stack: 'Error stack trace'
      });
    });

    it('should not include stack trace in production environment', () => {
      process.env.NODE_ENV = 'production';
      const error = new Error('Test error');
      error.stack = 'Error stack trace';

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Test error',
        timestamp: expect.any(String)
      });
    });
  });

  describe('notFoundHandler', () => {
    it('should return 404 with correct error message', () => {
      notFoundHandler(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Endpoint not found',
        path: '/test',
        method: 'GET',
        timestamp: expect.any(String)
      });
    });
  });

  describe('asyncHandler', () => {
    it('should call next function on successful async operation', async () => {
      const asyncFn = jest.fn().mockResolvedValue('success');
      const wrappedFn = asyncHandler(asyncFn);

      await wrappedFn(mockReq as Request, mockRes as Response, mockNext);

      expect(asyncFn).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next with error on async operation failure', async () => {
      const error = new Error('Async error');
      const asyncFn = jest.fn().mockRejectedValue(error);
      const wrappedFn = asyncHandler(asyncFn);

      await wrappedFn(mockReq as Request, mockRes as Response, mockNext);

      expect(asyncFn).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('Custom Error Classes', () => {
    it('should create ValidationError with correct properties', () => {
      const error = new ValidationError('Validation failed');

      expect(error.name).toBe('ValidationError');
      expect(error.message).toBe('Validation failed');
      expect(error.statusCode).toBe(400);
      expect(error.isOperational).toBe(true);
    });

    it('should create AuthenticationError with default message', () => {
      const error = new AuthenticationError();

      expect(error.name).toBe('AuthenticationError');
      expect(error.message).toBe('Authentication required');
      expect(error.statusCode).toBe(401);
      expect(error.isOperational).toBe(true);
    });

    it('should create AuthorizationError with default message', () => {
      const error = new AuthorizationError();

      expect(error.name).toBe('AuthorizationError');
      expect(error.message).toBe('Access denied');
      expect(error.statusCode).toBe(403);
      expect(error.isOperational).toBe(true);
    });

    it('should create NotFoundError with default message', () => {
      const error = new NotFoundError();

      expect(error.name).toBe('NotFoundError');
      expect(error.message).toBe('Resource not found');
      expect(error.statusCode).toBe(404);
      expect(error.isOperational).toBe(true);
    });

    it('should create ConflictError with default message', () => {
      const error = new ConflictError();

      expect(error.name).toBe('ConflictError');
      expect(error.message).toBe('Resource conflict');
      expect(error.statusCode).toBe(409);
      expect(error.isOperational).toBe(true);
    });

    it('should create RateLimitError with default message', () => {
      const error = new RateLimitError();

      expect(error.name).toBe('RateLimitError');
      expect(error.message).toBe('Too many requests');
      expect(error.statusCode).toBe(429);
      expect(error.isOperational).toBe(true);
    });
  });
});