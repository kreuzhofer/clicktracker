import { Router, Response } from 'express';
import { validateParams, validateQuery } from '../middleware/validation';
import { asyncHandler } from '../middleware/errorHandler';
import { campaignParamsSchema } from '../schemas/campaign';
import { AuthenticatedRequest, ConversionEventType } from '../types';
import { sendError, sendSuccess, CommonErrors } from '../utils/apiResponse';
import { AnalyticsService, AnalyticsFilters } from '../services/AnalyticsService';
import Joi from 'joi';

const router = Router();
const analyticsService = new AnalyticsService();

// Analytics query schema
const analyticsQuerySchema = Joi.object({
  start_date: Joi.date()
    .iso()
    .optional()
    .messages({
      'date.format': 'Start date must be in ISO format (YYYY-MM-DD)'
    }),
  
  end_date: Joi.date()
    .iso()
    .min(Joi.ref('start_date'))
    .optional()
    .messages({
      'date.format': 'End date must be in ISO format (YYYY-MM-DD)',
      'date.min': 'End date must be after start date'
    }),
  
  event_type: Joi.string()
    .valid('newsletter_signup', 'purchase', 'course_enrollment')
    .optional()
});

// Top links query schema
const topLinksQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(10),
  metric: Joi.string().valid('clicks', 'conversions', 'revenue', 'ctr').default('clicks')
});

// Campaign comparison schema
const campaignComparisonSchema = Joi.object({
  campaign_ids: Joi.array().items(Joi.string().uuid()).min(1).max(10).required()
}).concat(analyticsQuerySchema);

// Get campaign analytics
router.get('/campaigns/:id',
  validateParams(campaignParamsSchema),
  validateQuery(analyticsQuerySchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const filters: AnalyticsFilters = {};
      
      if (req.query.start_date) {
        filters.startDate = new Date(req.query.start_date as string);
      }
      
      if (req.query.end_date) {
        filters.endDate = new Date(req.query.end_date as string);
      }
      
      if (req.query.event_type) {
        filters.eventType = req.query.event_type as ConversionEventType;
      }

      const analytics = await analyticsService.getCampaignAnalytics(id, filters);
      return sendSuccess(res, analytics, { message: 'Campaign analytics retrieved successfully' });
    } catch (error: any) {
      if (error.message === 'Campaign not found') {
        return sendError(res, CommonErrors.NOT_FOUND('Campaign not found'));
      }
      throw error;
    }
  })
);

// Get link analytics
router.get('/links/:linkId',
  validateParams(Joi.object({ linkId: Joi.string().uuid().required() })),
  validateQuery(analyticsQuerySchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { linkId } = req.params;
      const filters: AnalyticsFilters = {};
      
      if (req.query.start_date) {
        filters.startDate = new Date(req.query.start_date as string);
      }
      
      if (req.query.end_date) {
        filters.endDate = new Date(req.query.end_date as string);
      }
      
      if (req.query.event_type) {
        filters.eventType = req.query.event_type as ConversionEventType;
      }

      const analytics = await analyticsService.getCampaignLinkAnalytics(linkId, filters);
      return sendSuccess(res, analytics, { message: 'Link analytics retrieved successfully' });
    } catch (error: any) {
      if (error.message === 'Campaign link not found') {
        return sendError(res, CommonErrors.NOT_FOUND('Campaign link not found'));
      }
      throw error;
    }
  })
);

// Get conversion funnel for a campaign link
router.get('/links/:linkId/funnel',
  validateParams(Joi.object({ linkId: Joi.string().uuid().required() })),
  validateQuery(analyticsQuerySchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { linkId } = req.params;
      const filters: AnalyticsFilters = {};
      
      if (req.query.start_date) {
        filters.startDate = new Date(req.query.start_date as string);
      }
      
      if (req.query.end_date) {
        filters.endDate = new Date(req.query.end_date as string);
      }
      
      if (req.query.event_type) {
        filters.eventType = req.query.event_type as ConversionEventType;
      }

      const funnel = await analyticsService.getConversionFunnel(linkId, filters);
      return sendSuccess(res, funnel, { message: 'Conversion funnel retrieved successfully' });
    } catch (error: any) {
      throw error;
    }
  })
);

// Get revenue attribution for a campaign link
router.get('/links/:linkId/revenue',
  validateParams(Joi.object({ linkId: Joi.string().uuid().required() })),
  validateQuery(analyticsQuerySchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { linkId } = req.params;
      const filters: AnalyticsFilters = {};
      
      if (req.query.start_date) {
        filters.startDate = new Date(req.query.start_date as string);
      }
      
      if (req.query.end_date) {
        filters.endDate = new Date(req.query.end_date as string);
      }
      
      if (req.query.event_type) {
        filters.eventType = req.query.event_type as ConversionEventType;
      }

      const revenueAttribution = await analyticsService.getRevenueAttribution(linkId, filters);
      return sendSuccess(res, revenueAttribution, { message: 'Revenue attribution retrieved successfully' });
    } catch (error: any) {
      throw error;
    }
  })
);

// Get top performing links
router.get('/top-links',
  validateQuery(topLinksQuerySchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { limit, metric } = req.query;
      const topLinks = await analyticsService.getTopPerformingLinks(
        Number(limit), 
        metric as 'clicks' | 'conversions' | 'revenue' | 'ctr'
      );
      return sendSuccess(res, topLinks, { message: 'Top performing links retrieved successfully' });
    } catch (error: any) {
      throw error;
    }
  })
);

// Compare multiple campaigns
router.post('/campaigns/compare',
  validateQuery(analyticsQuerySchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { campaign_ids } = req.body;
      
      if (!campaign_ids || !Array.isArray(campaign_ids) || campaign_ids.length === 0) {
        return sendError(res, CommonErrors.VALIDATION_ERROR('campaign_ids array is required'));
      }

      const filters: AnalyticsFilters = {};
      
      if (req.query.start_date) {
        filters.startDate = new Date(req.query.start_date as string);
      }
      
      if (req.query.end_date) {
        filters.endDate = new Date(req.query.end_date as string);
      }
      
      if (req.query.event_type) {
        filters.eventType = req.query.event_type as ConversionEventType;
      }

      const comparison = await analyticsService.getCampaignComparison(campaign_ids, filters);
      return sendSuccess(res, comparison, { message: 'Campaign comparison retrieved successfully' });
    } catch (error: any) {
      throw error;
    }
  })
);

export default router;