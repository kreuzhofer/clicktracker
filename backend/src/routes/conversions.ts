import { Router, Response } from 'express';
import { validateRequest, validateParams } from '../middleware/validation';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../types';
import { sendError, CommonErrors } from '../utils/apiResponse';
import Joi from 'joi';

const router = Router();

// Conversion event schema
const createConversionSchema = Joi.object({
  tracking_id: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.uuid': 'Invalid tracking ID format',
      'any.required': 'Tracking ID is required'
    }),
  
  campaign_link_id: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.uuid': 'Invalid campaign link ID format',
      'any.required': 'Campaign link ID is required'
    }),
  
  event_type: Joi.string()
    .valid('newsletter_signup', 'purchase', 'course_enrollment')
    .required()
    .messages({
      'any.only': 'Event type must be one of: newsletter_signup, purchase, course_enrollment',
      'any.required': 'Event type is required'
    }),
  
  revenue_amount: Joi.number()
    .positive()
    .precision(2)
    .optional()
    .messages({
      'number.positive': 'Revenue amount must be positive',
      'number.precision': 'Revenue amount cannot have more than 2 decimal places'
    }),
  
  event_data: Joi.object()
    .optional()
});

const trackingIdParamsSchema = Joi.object({
  trackingId: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.uuid': 'Invalid tracking ID format',
      'any.required': 'Tracking ID is required'
    })
});

// Record conversion event
router.post('/',
  validateRequest(createConversionSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    // Implementation will be added when conversion service is available
    return sendError(res, CommonErrors.NOT_IMPLEMENTED('Conversion tracking not implemented yet'));
  })
);

// Get attribution data for tracking ID
router.get('/attribution/:trackingId',
  validateParams(trackingIdParamsSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    // Implementation will be added when conversion service is available
    return sendError(res, CommonErrors.NOT_IMPLEMENTED('Attribution data not implemented yet'));
  })
);

export default router;