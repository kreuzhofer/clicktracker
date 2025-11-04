import { Response } from 'express';

/**
 * Standardized API Response Utility
 * 
 * This utility ensures all API endpoints return responses in a consistent format
 * as defined in the design documentation.
 */

export interface ApiSuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
  meta?: {
    pagination?: {
      total: number;
      limit: number;
      offset: number;
      hasMore: boolean;
    };
    [key: string]: any;
  };
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  message: string;
  details?: {
    [key: string]: any;
  };
}

export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Send a successful response with data
 */
export const sendSuccess = <T>(
  res: Response,
  data: T,
  options?: {
    statusCode?: number;
    message?: string;
    meta?: ApiSuccessResponse['meta'];
  }
): Response => {
  const { statusCode = 200, message, meta } = options || {};
  
  const response: ApiSuccessResponse<T> = {
    success: true,
    data,
    ...(message && { message }),
    ...(meta && { meta })
  };

  return res.status(statusCode).json(response);
};

/**
 * Send an error response
 */
export const sendError = (
  res: Response,
  options: {
    statusCode: number;
    error: string;
    message: string;
    details?: ApiErrorResponse['details'];
  }
): Response => {
  const { statusCode, error, message, details } = options;
  
  const response: ApiErrorResponse = {
    success: false,
    error,
    message,
    ...(details && { details })
  };

  return res.status(statusCode).json(response);
};

/**
 * Common error responses for consistency
 */
export const CommonErrors = {
  VALIDATION_ERROR: (message: string, details?: any) => ({
    statusCode: 400,
    error: 'VALIDATION_ERROR',
    message,
    details
  }),

  UNAUTHORIZED: (message: string = 'Authentication required') => ({
    statusCode: 401,
    error: 'UNAUTHORIZED',
    message
  }),

  FORBIDDEN: (message: string = 'Access denied') => ({
    statusCode: 403,
    error: 'FORBIDDEN',
    message
  }),

  NOT_FOUND: (resource: string) => ({
    statusCode: 404,
    error: 'NOT_FOUND',
    message: `${resource} not found`
  }),

  CONFLICT: (message: string) => ({
    statusCode: 409,
    error: 'CONFLICT',
    message
  }),

  RATE_LIMITED: (message: string = 'Too many requests') => ({
    statusCode: 429,
    error: 'RATE_LIMITED',
    message
  }),

  INTERNAL_ERROR: (message: string = 'Internal server error') => ({
    statusCode: 500,
    error: 'INTERNAL_ERROR',
    message
  }),

  NOT_IMPLEMENTED: (message: string = 'Feature not implemented') => ({
    statusCode: 501,
    error: 'NOT_IMPLEMENTED',
    message
  })
};

/**
 * Pagination helper for consistent pagination responses
 */
export const createPaginationMeta = (
  total: number,
  limit: number,
  offset: number
) => ({
  pagination: {
    total,
    limit,
    offset,
    hasMore: offset + limit < total
  }
});

/**
 * Success response helpers for common scenarios
 */
export const SuccessResponses = {
  CREATED: <T>(res: Response, data: T, message?: string) =>
    sendSuccess(res, data, { statusCode: 201, message }),

  OK: <T>(res: Response, data: T, message?: string) =>
    sendSuccess(res, data, { statusCode: 200, message }),

  NO_CONTENT: (res: Response) =>
    res.status(204).send(),

  WITH_PAGINATION: <T>(
    res: Response,
    data: T,
    total: number,
    limit: number,
    offset: number,
    message?: string
  ) =>
    sendSuccess(res, data, {
      statusCode: 200,
      message,
      meta: createPaginationMeta(total, limit, offset)
    })
};

/**
 * Type-safe error response helper
 */
export const sendCommonError = (
  res: Response,
  errorType: keyof typeof CommonErrors,
  ...args: any[]
) => {
  const errorConfig = (CommonErrors[errorType] as any)(...args);
  return sendError(res, errorConfig);
};

/**
 * Middleware to catch and format validation errors
 */
export const formatValidationError = (error: any) => {
  if (error.details) {
    // Joi validation error
    const details = error.details.reduce((acc: any, detail: any) => {
      const field = detail.path.join('.');
      acc[field] = detail.message;
      return acc;
    }, {});

    return {
      statusCode: 400,
      error: 'VALIDATION_ERROR',
      message: 'Invalid input data',
      details
    };
  }

  return {
    statusCode: 400,
    error: 'VALIDATION_ERROR',
    message: error.message || 'Invalid input data'
  };
};