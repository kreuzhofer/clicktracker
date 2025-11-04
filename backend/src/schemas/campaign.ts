import Joi from 'joi';

export const createCampaignSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(1)
    .max(255)
    .pattern(/^[a-zA-Z0-9\s\-_]+$/)
    .required()
    .messages({
      'string.min': 'Campaign name cannot be empty',
      'string.max': 'Campaign name cannot exceed 255 characters',
      'string.pattern.base': 'Campaign name can only contain letters, numbers, spaces, hyphens, and underscores',
      'any.required': 'Campaign name is required'
    }),
  
  description: Joi.string()
    .trim()
    .max(1000)
    .allow('')
    .optional()
    .messages({
      'string.max': 'Description cannot exceed 1000 characters'
    }),
  
  tags: Joi.array()
    .items(Joi.string().trim().min(1).max(50))
    .max(10)
    .optional()
    .messages({
      'array.max': 'Cannot have more than 10 tags',
      'string.min': 'Tag cannot be empty',
      'string.max': 'Tag cannot exceed 50 characters'
    })
});

export const updateCampaignSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(1)
    .max(255)
    .pattern(/^[a-zA-Z0-9\s\-_]+$/)
    .optional()
    .messages({
      'string.min': 'Campaign name cannot be empty',
      'string.max': 'Campaign name cannot exceed 255 characters',
      'string.pattern.base': 'Campaign name can only contain letters, numbers, spaces, hyphens, and underscores'
    }),
  
  description: Joi.string()
    .trim()
    .max(1000)
    .allow('')
    .optional()
    .messages({
      'string.max': 'Description cannot exceed 1000 characters'
    }),
  
  tags: Joi.array()
    .items(Joi.string().trim().min(1).max(50))
    .max(10)
    .optional()
    .messages({
      'array.max': 'Cannot have more than 10 tags',
      'string.min': 'Tag cannot be empty',
      'string.max': 'Tag cannot exceed 50 characters'
    })
});

export const campaignParamsSchema = Joi.object({
  id: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': 'Invalid campaign ID format',
      'any.required': 'Campaign ID is required'
    })
});

export const campaignQuerySchema = Joi.object({
  search: Joi.string()
    .trim()
    .min(1)
    .max(100)
    .optional()
    .messages({
      'string.min': 'Search term cannot be empty',
      'string.max': 'Search term cannot exceed 100 characters'
    }),
  
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(20)
    .optional()
    .messages({
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 100'
    }),
  
  offset: Joi.number()
    .integer()
    .min(0)
    .default(0)
    .optional()
    .messages({
      'number.min': 'Offset cannot be negative'
    }),
  
  sort: Joi.string()
    .valid('name', 'created_at', 'updated_at')
    .default('created_at')
    .optional(),
  
  order: Joi.string()
    .valid('asc', 'desc')
    .default('desc')
    .optional()
});