import { Router, Response } from 'express';
import { validateRequest, validateParams } from '../middleware/validation';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../types';
import { sendError, sendSuccess, CommonErrors } from '../utils/apiResponse';
import { ConversionService } from '../services/ConversionService';
import Joi from 'joi';

const router = Router();
const conversionService = new ConversionService();

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
    .custom((value, helpers) => {
      if (value !== undefined && value !== null) {
        if (value <= 0) {
          return helpers.error('number.positive');
        }
        // Check for more than 2 decimal places
        if ((value * 100) % 1 !== 0) {
          return helpers.error('number.precision');
        }
      }
      return value;
    })
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

const campaignLinkIdParamsSchema = Joi.object({
  campaignLinkId: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.uuid': 'Invalid campaign link ID format',
      'any.required': 'Campaign link ID is required'
    })
});

// Record conversion event
router.post('/',
  validateRequest(createConversionSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const conversion = await conversionService.recordConversion(req.body);
      
      return sendSuccess(res, {
        conversion,
        attribution: await conversionService.getAttributionData(conversion.tracking_id)
      }, { 
        message: 'Conversion recorded successfully',
        statusCode: 201 
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('validation failed') || 
            error.message.includes('attribution window') ||
            error.message.includes('not found') ||
            error.message.includes('No click event found') ||
            error.message.includes('Campaign link not found')) {
          return sendError(res, {
            statusCode: 400,
            error: 'VALIDATION_ERROR',
            message: error.message
          });
        }
      }
      
      return sendError(res, CommonErrors.INTERNAL_ERROR('Failed to record conversion'));
    }
  })
);

// Get attribution data for tracking ID
router.get('/attribution/:trackingId',
  validateParams(trackingIdParamsSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const attribution = await conversionService.getAttributionData(req.params.trackingId);
      
      return sendSuccess(res, attribution, { 
        message: 'Attribution data retrieved successfully' 
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('No click event found')) {
        return sendError(res, {
          statusCode: 404,
          error: 'NOT_FOUND',
          message: 'No attribution data found for tracking ID'
        });
      }
      
      return sendError(res, CommonErrors.INTERNAL_ERROR('Failed to retrieve attribution data'));
    }
  })
);

// Get conversion funnel for campaign link
router.get('/funnel/:campaignLinkId',
  validateParams(campaignLinkIdParamsSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const funnel = await conversionService.getConversionFunnel(req.params.campaignLinkId);
      
      return sendSuccess(res, { funnel }, { 
        message: 'Conversion funnel retrieved successfully' 
      });
    } catch (error) {
      return sendError(res, CommonErrors.INTERNAL_ERROR('Failed to retrieve conversion funnel'));
    }
  })
);

// Get conversions by type for campaign link
router.get('/types/:campaignLinkId',
  validateParams(campaignLinkIdParamsSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const conversionsByType = await conversionService.getConversionsByType(req.params.campaignLinkId);
      
      return sendSuccess(res, { conversions_by_type: conversionsByType }, { 
        message: 'Conversions by type retrieved successfully' 
      });
    } catch (error) {
      return sendError(res, CommonErrors.INTERNAL_ERROR('Failed to retrieve conversions by type'));
    }
  })
);

// Get tracking script
router.get('/script',
  asyncHandler(async (req: any, res: Response) => {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const script = conversionService.generateTrackingScript(baseUrl);
    
    res.setHeader('Content-Type', 'application/javascript');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    res.send(script);
  })
);

// Cleanup attribution window (admin endpoint)
router.post('/cleanup',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const deletedCount = await conversionService.cleanupAttributionWindow();
      
      return sendSuccess(res, { 
        deleted_conversions: deletedCount 
      }, { 
        message: 'Attribution window cleanup completed' 
      });
    } catch (error) {
      return sendError(res, CommonErrors.INTERNAL_ERROR('Failed to cleanup attribution window'));
    }
  })
);

export default router;