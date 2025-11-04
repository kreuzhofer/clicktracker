import express from 'express';
import { getYouTubeService } from '../services/YouTubeService';
import { getYouTubeCronService } from '../services/YouTubeCronService';
import { YouTubeVideoStatsModel } from '../models/YouTubeVideoStats';
import { CampaignLinkModel } from '../models/CampaignLink';
import { validateRequest, validateParams } from '../middleware/validation';
import { youtubeValidationSchema } from '../schemas/campaignLink';
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
        return res.status(400).json({
          error: 'Invalid YouTube URL',
          message: validation.error
        });
      }

      return res.json({
        isValid: true,
        videoId: validation.videoId,
        extractedUrl: url
      });

    } catch (error) {
      console.error('YouTube URL validation error:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to validate YouTube URL'
      });
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
      
      return res.json({
        success: true,
        data: metadata
      });

    } catch (error) {
      console.error('YouTube metadata fetch error:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('Video not found')) {
          return res.status(404).json({
            error: 'Video not found',
            message: `YouTube video ${req.params.videoId} does not exist or is not accessible`
          });
        }
        
        if (error.message.includes('quota exceeded')) {
          return res.status(429).json({
            error: 'API quota exceeded',
            message: 'YouTube API quota has been exceeded. Please try again later.',
            retryAfter: 86400
          });
        }
      }
      
      return res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to fetch video metadata'
      });
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
      
      return res.json({
        success: true,
        data: metadata,
        count: metadata.length,
        requested: videoIds.length
      });

    } catch (error) {
      console.error('YouTube bulk metadata fetch error:', error);
      
      if (error instanceof Error && error.message.includes('quota exceeded')) {
        return res.status(429).json({
          error: 'API quota exceeded',
          message: 'YouTube API quota has been exceeded. Please try again later.',
          retryAfter: 86400
        });
      }
      
      return res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to fetch bulk video metadata'
      });
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
      
      return res.json({
        success: true,
        videoId,
        viewCount,
        fetchedAt: new Date().toISOString()
      });

    } catch (error) {
      console.error('YouTube view count fetch error:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('Video not found')) {
          return res.status(404).json({
            error: 'Video not found',
            message: `YouTube video ${req.params.videoId} does not exist or is not accessible`
          });
        }
        
        if (error.message.includes('quota exceeded')) {
          return res.status(429).json({
            error: 'API quota exceeded',
            message: 'YouTube API quota has been exceeded. Please try again later.',
            retryAfter: 86400
          });
        }
      }
      
      return res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to fetch video view count'
      });
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
      
      return res.json({
        success: true,
        data: viewCounts,
        count: Object.keys(viewCounts).length,
        requested: videoIds.length,
        fetchedAt: new Date().toISOString()
      });

    } catch (error) {
      console.error('YouTube bulk view count fetch error:', error);
      
      if (error instanceof Error && error.message.includes('quota exceeded')) {
        return res.status(429).json({
          error: 'API quota exceeded',
          message: 'YouTube API quota has been exceeded. Please try again later.',
          retryAfter: 86400
        });
      }
      
      return res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to fetch bulk view counts'
      });
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
    
    return res.json({
      success: result.success,
      message: result.success ? 'View counts updated successfully' : 'View count update completed with errors',
      updatedCount: result.updatedCount,
      errors: result.errors,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Manual view count refresh error:', error);
    
    if (error instanceof Error && error.message.includes('already in progress')) {
      return res.status(409).json({
        error: 'Update in progress',
        message: 'A view count update is already in progress. Please wait for it to complete.'
      });
    }
    
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to trigger view count refresh'
    });
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
      
      return res.json({
        success: result.success,
        message: result.success ? 'Specific video view counts updated successfully' : 'View count update completed with errors',
        updatedCount: result.updatedCount,
        errors: result.errors,
        videoIds,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Specific view count refresh error:', error);
      
      if (error instanceof Error && error.message.includes('already in progress')) {
        return res.status(409).json({
          error: 'Update in progress',
          message: 'A view count update is already in progress. Please wait for it to complete.'
        });
      }
      
      return res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to refresh specific video view counts'
      });
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
    
    return res.json({
      success: true,
      data: stats,
      count: stats.length
    });

  } catch (error) {
    console.error('Video stats fetch error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch video statistics'
    });
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
        return res.status(404).json({
          error: 'Stats not found',
          message: `No statistics found for video ${videoId}`
        });
      }
      
      return res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('Video stats fetch error:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to fetch video statistics'
      });
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
    
    return res.json({
      success: true,
      data: status
    });

  } catch (error) {
    console.error('Cron status fetch error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch cron job status'
    });
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
    
    return res.json({
      success: true,
      healthy: isHealthy,
      quota: quotaInfo,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('YouTube health check error:', error);
    return res.status(500).json({
      success: false,
      healthy: false,
      error: 'Health check failed',
      timestamp: new Date().toISOString()
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
    
    return res.json({
      success: true,
      message: 'Stale statistics cleaned up successfully',
      deletedCount: result.deletedCount,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Cleanup error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to clean up stale statistics'
    });
  }
});

export default router;