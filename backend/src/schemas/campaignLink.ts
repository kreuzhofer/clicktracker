import Joi from 'joi';

const youtubeUrlPattern = /^https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;

export const createCampaignLinkSchema = Joi.object({
  landing_page_url: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .required()
    .messages({
      'string.uri': 'Landing page URL must be a valid HTTP or HTTPS URL',
      'any.required': 'Landing page URL is required'
    }),
  
  youtube_video_id: Joi.string()
    .pattern(/^[a-zA-Z0-9_-]{11}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid YouTube video ID format',
      'any.required': 'YouTube video ID is required'
    }),
  
  custom_alias: Joi.string()
    .trim()
    .min(3)
    .max(10)
    .pattern(/^[a-zA-Z0-9\-_]+$/)
    .optional()
    .messages({
      'string.min': 'Custom alias must be at least 3 characters long',
      'string.max': 'Custom alias cannot exceed 10 characters',
      'string.pattern.base': 'Custom alias can only contain letters, numbers, hyphens, and underscores'
    })
});

export const updateCampaignLinkSchema = Joi.object({
  landing_page_url: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .optional()
    .messages({
      'string.uri': 'Landing page URL must be a valid HTTP or HTTPS URL'
    }),
  
  youtube_video_id: Joi.string()
    .pattern(/^[a-zA-Z0-9_-]{11}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Invalid YouTube video ID format'
    }),
  
  custom_alias: Joi.string()
    .trim()
    .min(3)
    .max(10)
    .pattern(/^[a-zA-Z0-9\-_]+$/)
    .optional()
    .messages({
      'string.min': 'Custom alias must be at least 3 characters long',
      'string.max': 'Custom alias cannot exceed 10 characters',
      'string.pattern.base': 'Custom alias can only contain letters, numbers, hyphens, and underscores'
    })
});

export const campaignLinkParamsSchema = Joi.object({
  id: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.uuid': 'Invalid campaign ID format',
      'any.required': 'Campaign ID is required'
    }),
  
  linkId: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.uuid': 'Invalid link ID format',
      'any.required': 'Link ID is required'
    })
});

export const youtubeValidationSchema = Joi.object({
  url: Joi.string()
    .pattern(youtubeUrlPattern)
    .required()
    .messages({
      'string.pattern.base': 'Invalid YouTube URL format',
      'any.required': 'YouTube URL is required'
    })
});

export const shortCodeParamsSchema = Joi.object({
  shortCode: Joi.string()
    .min(6)
    .max(10)
    .pattern(/^[a-zA-Z0-9]+$/)
    .required()
    .messages({
      'string.min': 'Invalid short code format',
      'string.max': 'Invalid short code format',
      'string.pattern.base': 'Invalid short code format',
      'any.required': 'Short code is required'
    })
});