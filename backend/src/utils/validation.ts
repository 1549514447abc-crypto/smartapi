import Joi from 'joi';

// User registration validation schema
export const registerSchema = Joi.object({
  username: Joi.string()
    .alphanum()
    .min(3)
    .max(50)
    .required()
    .messages({
      'string.alphanum': 'Username must contain only alphanumeric characters',
      'string.min': 'Username must be at least 3 characters',
      'string.max': 'Username cannot exceed 50 characters',
      'any.required': 'Username is required'
    }),
  email: Joi.string()
    .email()
    .max(100)
    .optional()
    .allow(null, '')
    .messages({
      'string.email': 'Invalid email format',
      'string.max': 'Email cannot exceed 100 characters'
    }),
  phone: Joi.string()
    .pattern(/^1[3-9]\d{9}$/)
    .optional()
    .allow(null, '')
    .messages({
      'string.pattern.base': 'Invalid phone number format (Chinese mobile)'
    }),
  password: Joi.string()
    .min(6)
    .max(100)
    .required()
    .messages({
      'string.min': 'Password must be at least 6 characters',
      'string.max': 'Password cannot exceed 100 characters',
      'any.required': 'Password is required'
    }),
  confirm: Joi.string()
    .valid(Joi.ref('password'))
    .required()
    .messages({
      'any.only': 'Passwords do not match',
      'any.required': 'Password confirmation is required'
    }),
  nickname: Joi.string()
    .max(50)
    .optional()
    .allow(null, '')
    .messages({
      'string.max': 'Nickname cannot exceed 50 characters'
    }),
  referral_code: Joi.string()
    .length(6)
    .optional()
    .allow(null, '')
    .messages({
      'string.length': '推荐码必须是6位字符'
    })
});

// User login validation schema
export const loginSchema = Joi.object({
  username: Joi.string()
    .required()
    .messages({
      'any.required': 'Username is required'
    }),
  password: Joi.string()
    .required()
    .messages({
      'any.required': 'Password is required'
    })
});
