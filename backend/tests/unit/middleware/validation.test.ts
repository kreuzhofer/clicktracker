import { Request, Response, NextFunction } from 'express';
import { validateRequest, validateQuery, validateParams } from '../../../src/middleware/validation';
import Joi from 'joi';

describe('Validation Middleware Unit Tests', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      body: {},
      query: {},
      params: {}
    };
    
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    
    mockNext = jest.fn();

    jest.clearAllMocks();
  });

  describe('validateRequest', () => {
    const testSchema = Joi.object({
      name: Joi.string().required(),
      email: Joi.string().email().required(),
      age: Joi.number().min(18).optional()
    });

    it('should pass validation with valid data', () => {
      mockReq.body = {
        name: 'John Doe',
        email: 'john@example.com',
        age: 25
      };

      const middleware = validateRequest(testSchema);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockReq.body).toEqual({
        name: 'John Doe',
        email: 'john@example.com',
        age: 25
      });
    });

    it('should pass validation with minimal valid data', () => {
      mockReq.body = {
        name: 'John Doe',
        email: 'john@example.com'
      };

      const middleware = validateRequest(testSchema);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should strip unknown fields', () => {
      mockReq.body = {
        name: 'John Doe',
        email: 'john@example.com',
        unknownField: 'should be removed'
      };

      const middleware = validateRequest(testSchema);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.body).not.toHaveProperty('unknownField');
      expect(mockReq.body).toEqual({
        name: 'John Doe',
        email: 'john@example.com'
      });
    });

    it('should fail validation with missing required fields', () => {
      mockReq.body = {
        name: 'John Doe'
        // missing email
      };

      const middleware = validateRequest(testSchema);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: expect.arrayContaining([
          expect.objectContaining({
            field: 'email',
            message: expect.stringContaining('required')
          })
        ])
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should fail validation with invalid data types', () => {
      mockReq.body = {
        name: 'John Doe',
        email: 'invalid-email',
        age: 'not-a-number'
      };

      const middleware = validateRequest(testSchema);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: expect.arrayContaining([
          expect.objectContaining({
            field: 'email',
            message: expect.stringContaining('email')
          }),
          expect.objectContaining({
            field: 'age',
            message: expect.stringContaining('number')
          })
        ])
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should fail validation with constraint violations', () => {
      mockReq.body = {
        name: 'John Doe',
        email: 'john@example.com',
        age: 16 // below minimum
      };

      const middleware = validateRequest(testSchema);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: expect.arrayContaining([
          expect.objectContaining({
            field: 'age',
            message: expect.stringContaining('18')
          })
        ])
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return all validation errors', () => {
      mockReq.body = {
        // missing name and email
        age: 'invalid'
      };

      const middleware = validateRequest(testSchema);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      const jsonCall = (mockRes.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall.details).toHaveLength(3); // name, email, age errors
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('validateQuery', () => {
    const querySchema = Joi.object({
      search: Joi.string().optional(),
      limit: Joi.number().min(1).max(100).default(20),
      offset: Joi.number().min(0).default(0)
    });

    it('should pass validation with valid query parameters', () => {
      mockReq.query = {
        search: 'test',
        limit: '10',
        offset: '0'
      };

      const middleware = validateQuery(querySchema);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockReq.query).toEqual({
        search: 'test',
        limit: 10, // converted to number
        offset: 0  // converted to number
      });
    });

    it('should apply default values', () => {
      mockReq.query = {};

      const middleware = validateQuery(querySchema);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.query).toEqual({
        limit: 20,
        offset: 0
      });
    });

    it('should fail validation with invalid query parameters', () => {
      mockReq.query = {
        limit: '200', // exceeds maximum
        offset: '-1'  // below minimum
      };

      const middleware = validateQuery(querySchema);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Query validation failed',
        details: expect.arrayContaining([
          expect.objectContaining({
            field: 'limit',
            message: expect.stringContaining('100')
          }),
          expect.objectContaining({
            field: 'offset',
            message: expect.stringContaining('0')
          })
        ])
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('validateParams', () => {
    const paramsSchema = Joi.object({
      id: Joi.string().uuid().required(),
      slug: Joi.string().alphanum().optional()
    });

    it('should pass validation with valid parameters', () => {
      mockReq.params = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        slug: 'test123'
      };

      const middleware = validateParams(paramsSchema);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should fail validation with invalid UUID', () => {
      mockReq.params = {
        id: 'invalid-uuid'
      };

      const middleware = validateParams(paramsSchema);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Parameter validation failed',
        details: expect.arrayContaining([
          expect.objectContaining({
            field: 'id',
            message: expect.stringContaining('GUID')
          })
        ])
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should fail validation with missing required parameter', () => {
      mockReq.params = {};

      const middleware = validateParams(paramsSchema);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Parameter validation failed',
        details: expect.arrayContaining([
          expect.objectContaining({
            field: 'id',
            message: expect.stringContaining('required')
          })
        ])
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Complex validation scenarios', () => {
    it('should handle nested object validation', () => {
      const nestedSchema = Joi.object({
        user: Joi.object({
          name: Joi.string().required(),
          email: Joi.string().email().required()
        }).required(),
        preferences: Joi.object({
          theme: Joi.string().valid('light', 'dark').default('light')
        }).optional()
      });

      mockReq.body = {
        user: {
          name: 'John Doe',
          email: 'john@example.com'
        }
      };

      const middleware = validateRequest(nestedSchema);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.body).toEqual({
        user: {
          name: 'John Doe',
          email: 'john@example.com'
        }
      });
    });

    it('should handle array validation', () => {
      const arraySchema = Joi.object({
        tags: Joi.array().items(Joi.string().min(1)).max(5).required()
      });

      mockReq.body = {
        tags: ['tag1', 'tag2', 'tag3']
      };

      const middleware = validateRequest(arraySchema);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.body.tags).toEqual(['tag1', 'tag2', 'tag3']);
    });

    it('should fail array validation with too many items', () => {
      const arraySchema = Joi.object({
        tags: Joi.array().items(Joi.string().min(1)).max(2).required()
      });

      mockReq.body = {
        tags: ['tag1', 'tag2', 'tag3'] // exceeds maximum
      };

      const middleware = validateRequest(arraySchema);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: expect.arrayContaining([
          expect.objectContaining({
            field: 'tags',
            message: expect.stringContaining('2')
          })
        ])
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});