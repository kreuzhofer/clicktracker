import Joi from 'joi';

export const registerSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
  
  password: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters long',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      'any.required': 'Password is required'
    }),
  
  first_name: Joi.string()
    .trim()
    .min(1)
    .max(50)
    .required()
    .messages({
      'string.min': 'First name cannot be empty',
      'string.max': 'First name cannot exceed 50 characters',
      'any.required': 'First name is required'
    }),
  
  last_name: Joi.string()
    .trim()
    .min(1)
    .max(50)
    .required()
    .messages({
      'string.min': 'Last name cannot be empty',
      'string.max': 'Last name cannot exceed 50 characters',
      'any.required': 'Last name is required'
    })
});

export const loginSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
  
  password: Joi.string()
    .required()
    .messages({
      'any.required': 'Password is required'
    })
});

export const refreshTokenSchema = Joi.object({
  token: Joi.string()
    .required()
    .messages({
      'any.required': 'Token is required'
    })
});