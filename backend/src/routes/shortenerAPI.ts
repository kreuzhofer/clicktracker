import { Router, Response } from 'express';
import { validateRequest } from '../middleware/validation';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../types';
import { URLShortenerService } from '../services/URLShortenerService';
import { sendSuccess, sendError, CommonErrors, SuccessResponses } from '../utils/apiResponse';
import Joi from 'joi';

const router = Router();
const urlShortenerService = new URLShortenerService();

// Validation schemas
const shortenUrlSchema = Joi.object({
  campaignId: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.uuid': 'Invalid campaign ID format',
      'any.required': 'Campaign ID is required'
    }),
  
  landingPageUrl: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .required()
    .messages({
      'string.uri': 'Landing page URL must be a valid HTTP or HTTPS URL',
      'any.required': 'Landing page URL is required'
    }),
  
  youtubeVideoId: Joi.string()
    .pattern(/^[a-zA-Z0-9_-]{11}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid YouTube video ID format',
      'any.required': 'YouTube video ID is required'
    }),
  
  customAlias: Joi.string()
    .trim()
    .min(3)
    .max(50)
    .pattern(/^[a-zA-Z0-9\-_]+$/)
    .optional()
    .messages({
      'string.min': 'Custom alias must be at least 3 characters long',
      'string.max': 'Custom alias cannot exceed 50 characters',
      'string.pattern.base': 'Custom alias can only contain letters, numbers, hyphens, and underscores'
    })
});

const validateUrlSchema = Joi.object({
  url: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .required()
    .messages({
      'string.uri': 'URL must be a valid HTTP or HTTPS URL',
      'any.required': 'URL is required'
    })
});

const extractVideoIdSchema = Joi.object({
  url: Joi.string()
    .required()
    .messages({
      'any.required': 'YouTube URL is required'
    })
});

// Create shortened URL
router.post('/shorten',
  validateRequest(shortenUrlSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { campaignId, landingPageUrl, youtubeVideoId, customAlias } = req.body;

    try {
      const result = await urlShortenerService.shortenUrl({
        campaignId,
        landingPageUrl,
        youtubeVideoId,
        customAlias
      });

      return SuccessResponses.CREATED(res, result, 'Short URL created successfully');
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Custom alias is already taken') {
          return sendError(res, CommonErrors.CONFLICT(error.message));
        } else if (error.message.includes('Unable to generate unique short code')) {
          return sendError(res, CommonErrors.INTERNAL_ERROR('Unable to generate unique short code. Please try again.'));
        } else {
          throw error; // Let the error handler deal with it
        }
      } else {
        throw error;
      }
    }
  })
);

// Validate URL format
router.post('/validate-url',
  validateRequest(validateUrlSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { url } = req.body;

    const isValid = urlShortenerService.validateUrl(url);

    return SuccessResponses.OK(res, {
      url,
      isValid,
      message: isValid ? 'URL is valid' : 'URL format is invalid'
    }, 'URL validation completed');
  })
);

// Extract YouTube video ID from URL
router.post('/extract-video-id',
  validateRequest(extractVideoIdSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { url } = req.body;

    const videoId = urlShortenerService.extractYouTubeVideoId(url);

    if (videoId) {
      const isValidId = urlShortenerService.validateYouTubeVideoId(videoId);
      
      return SuccessResponses.OK(res, {
        url,
        videoId,
        isValid: isValidId
      }, 'YouTube video ID extracted successfully');
    } else {
      return sendError(res, CommonErrors.VALIDATION_ERROR('Unable to extract YouTube video ID from the provided URL'));
    }
  })
);

// Get click statistics for a campaign link
router.get('/stats/:campaignLinkId',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { campaignLinkId } = req.params;

    // Validate UUID format
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidPattern.test(campaignLinkId)) {
      return sendError(res, CommonErrors.VALIDATION_ERROR('Invalid campaign link ID format'));
    }

    try {
      const stats = await urlShortenerService.getClickStats(campaignLinkId);

      return SuccessResponses.OK(res, {
        campaignLinkId,
        ...stats
      }, 'Click statistics retrieved successfully');
    } catch (error) {
      return sendError(res, CommonErrors.NOT_FOUND('Campaign link'));
    }
  })
);

// Batch process clicks (for performance testing)
router.post('/batch-clicks',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { clicks } = req.body;

    if (!Array.isArray(clicks) || clicks.length === 0) {
      return sendError(res, CommonErrors.VALIDATION_ERROR('Clicks array is required and must not be empty'));
    }

    if (clicks.length > 1000) {
      return sendError(res, CommonErrors.VALIDATION_ERROR('Maximum 1000 clicks allowed per batch'));
    }

    const startTime = Date.now();
    const results = await urlShortenerService.batchProcessClicks(clicks);
    const processingTime = Date.now() - startTime;

    const successCount = results.filter(result => !(result instanceof Error)).length;
    const errorCount = results.length - successCount;

    return SuccessResponses.OK(res, {
      totalClicks: results.length,
      successfulClicks: successCount,
      failedClicks: errorCount,
      processingTimeMs: processingTime,
      averageTimePerClick: processingTime / results.length,
      results: results.map((result, index) => ({
        index,
        success: !(result instanceof Error),
        data: result instanceof Error ? { error: result.message } : result
      }))
    }, 'Batch clicks processed successfully');
  })
);

// Cleanup old click events
router.delete('/cleanup/:days',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const days = parseInt(req.params.days);

    if (isNaN(days) || days < 1 || days > 365) {
      return sendError(res, CommonErrors.VALIDATION_ERROR('Days must be a number between 1 and 365'));
    }

    const deletedCount = await urlShortenerService.cleanupOldClicks(days);

    return SuccessResponses.OK(res, {
      deletedEvents: deletedCount,
      daysKept: days,
      message: `Cleaned up ${deletedCount} click events older than ${days} days`
    }, 'Cleanup completed successfully');
  })
);

export default router;