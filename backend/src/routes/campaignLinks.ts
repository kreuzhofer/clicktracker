import { Router, Response } from 'express';
import { validateRequest, validateParams } from '../middleware/validation';
import { asyncHandler } from '../middleware/errorHandler';
import { 
  createCampaignLinkSchema, 
  updateCampaignLinkSchema, 
  campaignLinkParamsSchema,
  youtubeValidationSchema,
  shortCodeParamsSchema
} from '../schemas/campaignLink';
import { AuthenticatedRequest } from '../types';
import { sendError, CommonErrors, SuccessResponses } from '../utils/apiResponse';
import { CampaignModel } from '../models/Campaign';
import { CampaignLinkModel } from '../models/CampaignLink';
import { getYouTubeService } from '../services/YouTubeService';
import Joi from 'joi';

const router = Router();
const campaignModel = new CampaignModel();
const campaignLinkModel = new CampaignLinkModel();

// Get YouTube service safely
const getYouTubeServiceSafe = () => {
  try {
    return getYouTubeService();
  } catch (error) {
    throw new Error('YouTube service not configured. Please set YOUTUBE_API_KEY environment variable.');
  }
};

// Add campaign link
router.post('/:id/links',
  validateParams(Joi.object({ id: Joi.string().uuid().required() })),
  validateRequest(createCampaignLinkSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id: campaignId } = req.params;
    const { landing_page_url, youtube_video_id, custom_alias } = req.body;

    // Check if campaign exists
    const campaign = await campaignModel.findById(campaignId);
    if (!campaign) {
      return sendError(res, CommonErrors.NOT_FOUND('Campaign'));
    }

    // Check if custom alias is already taken (if provided)
    if (custom_alias) {
      const existingAlias = await campaignLinkModel.findByCustomAlias(custom_alias);
      if (existingAlias) {
        return sendError(res, CommonErrors.CONFLICT('Custom alias is already taken'));
      }
    }

    // Fetch YouTube video metadata to validate video exists and get metadata
    try {
      const youtubeService = getYouTubeServiceSafe();
      const metadata = await youtubeService.getVideoMetadata(youtube_video_id);
      
      // Create campaign link
      const campaignLink = await campaignLinkModel.create(campaignId, {
        landing_page_url,
        youtube_video_id,
        custom_alias
      });

      // Update with YouTube metadata
      const updatedLink = await campaignLinkModel.updateYouTubeMetadata(
        campaignLink.id,
        metadata.title,
        metadata.thumbnail_url
      );

      return SuccessResponses.CREATED(res, updatedLink, 'Campaign link created successfully');
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('Video not found')) {
          return sendError(res, CommonErrors.VALIDATION_ERROR('YouTube video not found or is not accessible'));
        }
        if (error.message.includes('quota exceeded')) {
          return sendError(res, {
            statusCode: 429,
            error: 'RATE_LIMITED',
            message: 'YouTube API quota exceeded. Link created without metadata.',
            details: { retryAfter: 86400 }
          });
        }
        if (error.message.includes('not configured')) {
          return sendError(res, CommonErrors.INTERNAL_ERROR('YouTube service not configured'));
        }
      }
      
      // Create link without metadata if YouTube API fails
      const campaignLink = await campaignLinkModel.create(campaignId, {
        landing_page_url,
        youtube_video_id,
        custom_alias
      });

      return SuccessResponses.CREATED(res, campaignLink, 'Campaign link created successfully (YouTube metadata unavailable)');
    }
  })
);

// Get campaign links
router.get('/:id/links',
  validateParams(Joi.object({ id: Joi.string().uuid().required() })),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id: campaignId } = req.params;

    // Check if campaign exists
    const campaign = await campaignModel.findById(campaignId);
    if (!campaign) {
      return sendError(res, CommonErrors.NOT_FOUND('Campaign'));
    }

    const links = await campaignLinkModel.findByCampaignId(campaignId);
    return SuccessResponses.OK(res, links, 'Campaign links retrieved successfully');
  })
);

// Get single campaign link
router.get('/:id/links/:linkId',
  validateParams(campaignLinkParamsSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id: campaignId, linkId } = req.params;

    // Check if campaign exists
    const campaign = await campaignModel.findById(campaignId);
    if (!campaign) {
      return sendError(res, CommonErrors.NOT_FOUND('Campaign'));
    }

    const link = await campaignLinkModel.findById(linkId);
    if (!link) {
      return sendError(res, CommonErrors.NOT_FOUND('Campaign link'));
    }

    // Verify link belongs to campaign
    if (link.campaign_id !== campaignId) {
      return sendError(res, CommonErrors.NOT_FOUND('Campaign link'));
    }

    return SuccessResponses.OK(res, link, 'Campaign link retrieved successfully');
  })
);

// Update campaign link
router.put('/:id/links/:linkId',
  validateParams(campaignLinkParamsSchema),
  validateRequest(updateCampaignLinkSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id: campaignId, linkId } = req.params;
    const updateData = req.body;

    // Check if campaign exists
    const campaign = await campaignModel.findById(campaignId);
    if (!campaign) {
      return sendError(res, CommonErrors.NOT_FOUND('Campaign'));
    }

    // Check if link exists and belongs to campaign
    const existingLink = await campaignLinkModel.findById(linkId);
    if (!existingLink) {
      return sendError(res, CommonErrors.NOT_FOUND('Campaign link'));
    }

    if (existingLink.campaign_id !== campaignId) {
      return sendError(res, CommonErrors.NOT_FOUND('Campaign link'));
    }

    // Check if custom alias is already taken (if being updated)
    if (updateData.custom_alias && updateData.custom_alias !== existingLink.custom_alias) {
      const existingAlias = await campaignLinkModel.findByCustomAlias(updateData.custom_alias);
      if (existingAlias) {
        return sendError(res, CommonErrors.CONFLICT('Custom alias is already taken'));
      }
    }

    // If YouTube video ID is being updated, fetch new metadata
    if (updateData.youtube_video_id && updateData.youtube_video_id !== existingLink.youtube_video_id) {
      try {
        const youtubeService = getYouTubeServiceSafe();
        const metadata = await youtubeService.getVideoMetadata(updateData.youtube_video_id);
        
        // Update link with new data
        const updatedLink = await campaignLinkModel.update(linkId, updateData);
        
        // Update YouTube metadata
        const finalLink = await campaignLinkModel.updateYouTubeMetadata(
          linkId,
          metadata.title,
          metadata.thumbnail_url
        );

        return SuccessResponses.OK(res, finalLink, 'Campaign link updated successfully');
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes('Video not found')) {
            return sendError(res, CommonErrors.VALIDATION_ERROR('YouTube video not found or is not accessible'));
          }
          if (error.message.includes('quota exceeded')) {
            // Update without metadata if quota exceeded
            const updatedLink = await campaignLinkModel.update(linkId, updateData);
            return SuccessResponses.OK(res, updatedLink, 'Campaign link updated successfully (YouTube metadata unavailable)');
          }
        }
        
        // Update without metadata if YouTube API fails
        const updatedLink = await campaignLinkModel.update(linkId, updateData);
        return SuccessResponses.OK(res, updatedLink, 'Campaign link updated successfully (YouTube metadata unavailable)');
      }
    } else {
      // Update without YouTube metadata changes
      const updatedLink = await campaignLinkModel.update(linkId, updateData);
      return SuccessResponses.OK(res, updatedLink, 'Campaign link updated successfully');
    }
  })
);

// Delete campaign link
router.delete('/:id/links/:linkId',
  validateParams(campaignLinkParamsSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id: campaignId, linkId } = req.params;

    // Check if campaign exists
    const campaign = await campaignModel.findById(campaignId);
    if (!campaign) {
      return sendError(res, CommonErrors.NOT_FOUND('Campaign'));
    }

    // Check if link exists and belongs to campaign
    const existingLink = await campaignLinkModel.findById(linkId);
    if (!existingLink) {
      return sendError(res, CommonErrors.NOT_FOUND('Campaign link'));
    }

    if (existingLink.campaign_id !== campaignId) {
      return sendError(res, CommonErrors.NOT_FOUND('Campaign link'));
    }

    const deleted = await campaignLinkModel.delete(linkId);
    if (deleted) {
      return SuccessResponses.NO_CONTENT(res);
    } else {
      return sendError(res, CommonErrors.INTERNAL_ERROR('Failed to delete campaign link'));
    }
  })
);

// Validate YouTube URL
router.post('/youtube/validate',
  validateRequest(youtubeValidationSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { url } = req.body;
    
    try {
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
  })
);

// Get YouTube video metadata
router.get('/youtube/metadata/:videoId',
  validateParams(Joi.object({ videoId: Joi.string().pattern(/^[a-zA-Z0-9_-]{11}$/).required() })),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { videoId } = req.params;
    
    try {
      const youtubeService = getYouTubeServiceSafe();
      const metadata = await youtubeService.getVideoMetadata(videoId);
      
      return SuccessResponses.OK(res, metadata, 'Video metadata retrieved successfully');
    } catch (error) {
      console.error('YouTube metadata fetch error:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('Video not found')) {
          return sendError(res, CommonErrors.NOT_FOUND(`YouTube video ${videoId}`));
        }
        
        if (error.message.includes('quota exceeded')) {
          const retryAfter = (error as any).retryAfter || 3600;
          return sendError(res, {
            statusCode: 429,
            error: 'RATE_LIMITED',
            message: 'YouTube API quota has been exceeded. Please try again later.',
            details: { retryAfter }
          });
        }
        
        if (error.message.includes('not configured')) {
          return sendError(res, CommonErrors.INTERNAL_ERROR('YouTube service not configured'));
        }
      }
      
      return sendError(res, CommonErrors.INTERNAL_ERROR('Failed to fetch video metadata'));
    }
  })
);

export default router;