import express from 'express';
import { getYouTubeService } from '../services/YouTubeService';
import { getYouTubeCronService } from '../services/YouTubeCronService';
import { YouTubeVideoStatsModel } from '../models/YouTubeVideoStats';
import { CampaignLinkModel } from '../models/CampaignLink';
import { validateRequest, validateParams } from '../middleware/validation';
import { youtubeValidationSchema } from '../schemas/campaignLink';
import { sendSuccess, sendError, CommonErrors, SuccessResponses } from '../utils/apiResponse';
import Joi from 'joi';

const router = express.Router();
const videoStatsModel = new YouTubeVideoStatsModel();
const campaignLinkModel = new CampaignLinkModel();

// Lazy initialization functions to avoid crashes when env vars are missing
const getYouTubeServiceSafe = () => {
  try {
    return getYouTubeService();
  } catch (error) {
    throw new Error('YouTube service not configured. Please set YOUTUBE_API_KEY environment variable.');
  }
};

const getCronServiceSafe = () => {
  try {
    return getYouTubeCronService();
  } catch (error) {
    throw new Error('YouTube cron service not configured. Please set YOUTUBE_API_KEY environment variable.');
  }
};

// Validation schemas
const videoIdSchema = Joi.object({
  videoId: Joi.string()
    .pattern(/^[a-zA-Z0-9_-]{11}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid YouTube video ID format',
      'any.required': 'Video ID is required'
    })
});

const bulkVideoIdsSchema = Joi.object({
  videoIds: Joi.array()
    .items(Joi.string().pattern(/^[a-zA-Z0-9_-]{11}$/))
    .min(1)
    .max(50)
    .required()
    .messages({
      'array.min': 'At least one video ID is required',
      'array.max': 'Maximum 50 video IDs allowed per request',
      'any.required': 'Video IDs array is required'
    })
});

/**
 * POST /api/youtube/validate
 * Validate a YouTube URL and extract video ID
 */
router.post('/validate',
  validateRequest(youtubeValidationSchema),
  async (req, res) => {
    try {
      const { url } = req.body;
      
      const youtubeService = getYouTubeServiceSafe();
      const validation = youtubeService.validateYouTubeUrl(url);
      
      if (!validation.isValid) {
        return sendError(res, CommonErrors.VALIDATION_ERROR(validation.error || 'Invalid YouTube URL'));
      }

      return SuccessResponses.OK(res, {
        isValid: true,
        videoId: validation.videoId,
        extractedUrl: url
      }, 'YouTube URL validated successfully');

    } catch (error) {
      console.error('YouTube URL validation error:', error);
      return sendError(res, CommonErrors.INTERNAL_ERROR('Failed to validate YouTube URL'));
    }
  }
);

/**
 * GET /api/youtube/metadata/:videoId
 * Get video metadata from YouTube API
 */
router.get('/metadata/:videoId',
  validateParams(videoIdSchema),
  async (req, res) => {
    try {
      const { videoId } = req.params;
      
      const youtubeService = getYouTubeServiceSafe();
      const metadata = await youtubeService.getVideoMetadata(videoId);
      
      return SuccessResponses.OK(res, metadata, 'Video metadata retrieved successfully');

    } catch (error) {
      console.error('YouTube metadata fetch error:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('Video not found')) {
          return sendError(res, CommonErrors.NOT_FOUND(`YouTube video ${req.params.videoId}`));
        }
        
        if (error.message.includes('quota exceeded')) {
          const retryAfter = (error as any).retryAfter || 3600; // Default to 1 hour if not provided
          return sendError(res, {
            statusCode: 429,
            error: 'RATE_LIMITED',
            message: 'YouTube API quota has been exceeded. Please try again later.',
            details: { retryAfter }
          });
        }
      }
      
      return sendError(res, CommonErrors.INTERNAL_ERROR('Failed to fetch video metadata'));
    }
  }
);

/**
 * POST /api/youtube/metadata/bulk
 * Get metadata for multiple videos
 */
router.post('/metadata/bulk',
  validateRequest(bulkVideoIdsSchema),
  async (req, res) => {
    try {
      const { videoIds } = req.body;
      
      const youtubeService = getYouTubeServiceSafe();
      const metadata = await youtubeService.getBulkVideoMetadata(videoIds);
      
      return sendSuccess(res, metadata, {
        message: 'Bulk video metadata retrieved successfully',
        meta: {
          count: metadata.length,
          requested: videoIds.length
        }
      });

    } catch (error) {
      console.error('YouTube bulk metadata fetch error:', error);
      
      if (error instanceof Error && error.message.includes('quota exceeded')) {
        return sendError(res, {
          statusCode: 429,
          error: 'RATE_LIMITED',
          message: 'YouTube API quota has been exceeded. Please try again later.',
          details: { retryAfter: 86400 }
        });
      }
      
      return sendError(res, CommonErrors.INTERNAL_ERROR('Failed to fetch bulk video metadata'));
    }
  }
);

/**
 * GET /api/youtube/views/:videoId
 * Get current view count for a video
 */
router.get('/views/:videoId',
  validateParams(videoIdSchema),
  async (req, res) => {
    try {
      const { videoId } = req.params;
      
      const youtubeService = getYouTubeServiceSafe();
      const viewCount = await youtubeService.getVideoViewCount(videoId);
      
      return SuccessResponses.OK(res, {
        videoId,
        viewCount,
        fetchedAt: new Date().toISOString()
      }, 'Video view count retrieved successfully');

    } catch (error) {
      console.error('YouTube view count fetch error:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('Video not found')) {
          return sendError(res, CommonErrors.NOT_FOUND(`YouTube video ${req.params.videoId}`));
        }
        
        if (error.message.includes('quota exceeded')) {
          return sendError(res, {
            statusCode: 429,
            error: 'RATE_LIMITED',
            message: 'YouTube API quota has been exceeded. Please try again later.',
            details: { retryAfter: 86400 }
          });
        }
      }
      
      return sendError(res, CommonErrors.INTERNAL_ERROR('Failed to fetch video view count'));
    }
  }
);

/**
 * POST /api/youtube/views/bulk
 * Get view counts for multiple videos
 */
router.post('/views/bulk',
  validateRequest(bulkVideoIdsSchema),
  async (req, res) => {
    try {
      const { videoIds } = req.body;
      
      const youtubeService = getYouTubeServiceSafe();
      const viewCounts = await youtubeService.getBulkVideoViewCounts(videoIds);
      
      return sendSuccess(res, viewCounts, {
        message: 'Bulk video view counts retrieved successfully',
        meta: {
          count: Object.keys(viewCounts).length,
          requested: videoIds.length,
          fetchedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('YouTube bulk view count fetch error:', error);
      
      if (error instanceof Error && error.message.includes('quota exceeded')) {
        return sendError(res, {
          statusCode: 429,
          error: 'RATE_LIMITED',
          message: 'YouTube API quota has been exceeded. Please try again later.',
          details: { retryAfter: 86400 }
        });
      }
      
      return sendError(res, CommonErrors.INTERNAL_ERROR('Failed to fetch bulk view counts'));
    }
  }
);

/**
 * POST /api/youtube/refresh-views
 * Manually trigger view count refresh for all active videos
 */
router.post('/refresh-views', async (req, res) => {
  try {
    const cronService = getCronServiceSafe();
    const result = await cronService.triggerUpdate();
    
    return SuccessResponses.OK(res, {
      updatedCount: result.updatedCount,
      errors: result.errors,
      timestamp: new Date().toISOString()
    }, result.success ? 'View counts updated successfully' : 'View count update completed with errors');

  } catch (error) {
    console.error('Manual view count refresh error:', error);
    
    if (error instanceof Error && error.message.includes('already in progress')) {
      return sendError(res, CommonErrors.CONFLICT('A view count update is already in progress. Please wait for it to complete.'));
    }
    
    return sendError(res, CommonErrors.INTERNAL_ERROR('Failed to trigger view count refresh'));
  }
});

/**
 * POST /api/youtube/refresh-views/specific
 * Manually trigger view count refresh for specific videos
 */
router.post('/refresh-views/specific',
  validateRequest(bulkVideoIdsSchema),
  async (req, res) => {
    try {
      const { videoIds } = req.body;
      
      const cronService = getCronServiceSafe();
      const result = await cronService.updateSpecificVideos(videoIds);
      
      return SuccessResponses.OK(res, {
        updatedCount: result.updatedCount,
        errors: result.errors,
        videoIds,
        timestamp: new Date().toISOString()
      }, result.success ? 'Specific video view counts updated successfully' : 'View count update completed with errors');

    } catch (error) {
      console.error('Specific view count refresh error:', error);
      
      if (error instanceof Error && error.message.includes('already in progress')) {
        return sendError(res, CommonErrors.CONFLICT('A view count update is already in progress. Please wait for it to complete.'));
      }
      
      return sendError(res, CommonErrors.INTERNAL_ERROR('Failed to refresh specific video view counts'));
    }
  }
);

/**
 * GET /api/youtube/stats
 * Get stored video statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await videoStatsModel.findAll();
    
    return sendSuccess(res, stats, {
      message: 'Video statistics retrieved successfully',
      meta: { count: stats.length }
    });

  } catch (error) {
    console.error('Video stats fetch error:', error);
    return sendError(res, CommonErrors.INTERNAL_ERROR('Failed to fetch video statistics'));
  }
});

/**
 * GET /api/youtube/stats/:videoId
 * Get stored statistics for a specific video
 */
router.get('/stats/:videoId',
  validateParams(videoIdSchema),
  async (req, res) => {
    try {
      const { videoId } = req.params;
      
      const stats = await videoStatsModel.findByVideoId(videoId);
      
      if (!stats) {
        return sendError(res, CommonErrors.NOT_FOUND(`Statistics for video ${videoId}`));
      }
      
      return SuccessResponses.OK(res, stats, 'Video statistics retrieved successfully');

    } catch (error) {
      console.error('Video stats fetch error:', error);
      return sendError(res, CommonErrors.INTERNAL_ERROR('Failed to fetch video statistics'));
    }
  }
);

/**
 * GET /api/youtube/cron/status
 * Get cron job status
 */
router.get('/cron/status', (req, res) => {
  try {
    const cronService = getCronServiceSafe();
    const status = cronService.getStatus();
    
    return SuccessResponses.OK(res, status, 'Cron job status retrieved successfully');

  } catch (error) {
    console.error('Cron status fetch error:', error);
    return sendError(res, CommonErrors.INTERNAL_ERROR('Failed to fetch cron job status'));
  }
});

/**
 * GET /api/youtube/health
 * Health check for YouTube service
 */
router.get('/health', async (req, res) => {
  try {
    const youtubeService = getYouTubeServiceSafe();
    const isHealthy = await youtubeService.healthCheck();
    const quotaInfo = youtubeService.getQuotaInfo();
    
    return SuccessResponses.OK(res, {
      healthy: isHealthy,
      quota: quotaInfo,
      timestamp: new Date().toISOString()
    }, 'YouTube API health check completed');

  } catch (error) {
    console.error('YouTube health check error:', error);
    return sendError(res, {
      statusCode: 500,
      error: 'HEALTH_CHECK_FAILED',
      message: 'YouTube API health check failed',
      details: {
        healthy: false,
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * DELETE /api/youtube/cleanup
 * Clean up stale video statistics
 */
router.delete('/cleanup', async (req, res) => {
  try {
    const cronService = getCronServiceSafe();
    const result = await cronService.cleanupStaleStats();
    
    return SuccessResponses.OK(res, {
      deletedCount: result.deletedCount,
      timestamp: new Date().toISOString()
    }, 'Stale statistics cleaned up successfully');

  } catch (error) {
    console.error('Cleanup error:', error);
    return sendError(res, CommonErrors.INTERNAL_ERROR('Failed to clean up stale statistics'));
  }
});

export default router;