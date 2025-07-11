/**
 * Validation Middleware - Request validation using Zod schemas
 * 
 * Provides reusable validation functions for API endpoints
 */

import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import multer from 'multer';
import { randomUUID } from 'crypto';
import { logger } from '../utils/logger';

/**
 * Generic request validation middleware factory
 */
export function validateRequest<T>(schema: ZodSchema<T>, source: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    const requestId = req.get('X-Request-ID') || `req_${randomUUID().replace(/-/g, '').substring(0, 16)}`;
    
    // Set request ID for tracking
    req.requestId = requestId;
    
    logger.info('Request validation started', {
      requestId,
      method: req.method,
      url: req.originalUrl,
      source,
    });

    try {
      let dataToValidate;
      
      switch (source) {
        case 'body':
          dataToValidate = req.body;
          break;
        case 'query':
          dataToValidate = req.query;
          break;
        case 'params':
          dataToValidate = req.params;
          break;
      }

      const validationResult = schema.safeParse(dataToValidate);
      
      if (!validationResult.success) {
        const validationTime = Date.now() - startTime;
        
        logger.warn('Request validation failed', {
          requestId,
          source,
          errors: validationResult.error.errors,
          validationTime,
        });

        return res.status(400).json({
          success: false,
          error: {
            type: 'validation_error',
            code: 'INVALID_REQUEST_DATA',
            message: 'Request validation failed',
            details: validationResult.error.errors.map(err => ({
              field: err.path.join('.'),
              message: err.message,
              code: err.code,
            })),
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId,
            validationTime,
          },
        });
      }

      // Replace the original data with validated data
      switch (source) {
        case 'body':
          req.body = validationResult.data;
          break;
        case 'query':
          req.query = validationResult.data as any;
          break;
        case 'params':
          req.params = validationResult.data as any;
          break;
      }

      const validationTime = Date.now() - startTime;
      
      logger.info('Request validation successful', {
        requestId,
        source,
        validationTime,
      });

      next();
      
    } catch (error) {
      const validationTime = Date.now() - startTime;
      
      logger.error('Request validation error', {
        requestId,
        source,
        error,
        validationTime,
      });

      return res.status(500).json({
        success: false,
        error: {
          type: 'server_error',
          code: 'VALIDATION_ERROR',
          message: 'Internal validation error',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
          validationTime,
        },
      });
    }
    
    return; // Explicit return for TypeScript
  };
}

/**
 * File upload validation middleware
 */
export function validateFileUpload(options: {
  required?: boolean;
  maxSize?: number;
  allowedMimeTypes?: string[];
  fieldName?: string;
} = {}) {
  const {
    required = true,
    maxSize = 50 * 1024 * 1024, // 50MB
    allowedMimeTypes = [
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.slideshow',
    ],
    fieldName = 'file',
  } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    const requestId = req.requestId || `req_${Date.now()}`;
    
    logger.info('File upload validation started', {
      requestId,
      fieldName,
      required,
      maxSize,
      allowedMimeTypes: allowedMimeTypes.length,
    });

    // Check if file is required and missing
    if (required && !req.file) {
      logger.warn('Required file missing', {
        requestId,
        fieldName,
      });

      return res.status(400).json({
        success: false,
        error: {
          type: 'validation_error',
          code: 'NO_FILE_UPLOADED',
          message: `No ${fieldName} was uploaded`,
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
        },
      });
    }

    // If file is not required and missing, continue
    if (!required && !req.file) {
      logger.info('Optional file not provided', { requestId });
      return next();
    }

    const file = req.file!;

    // Validate file size
    if (file.size > maxSize) {
      logger.warn('File too large', {
        requestId,
        fileSize: file.size,
        maxSize,
        filename: file.originalname,
      });

      return res.status(400).json({
        success: false,
        error: {
          type: 'validation_error',
          code: 'FILE_TOO_LARGE',
          message: `File size (${file.size} bytes) exceeds maximum allowed size (${maxSize} bytes)`,
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
        },
      });
    }

    // Validate MIME type
    if (!allowedMimeTypes.includes(file.mimetype)) {
      logger.warn('Invalid file type', {
        requestId,
        fileMimeType: file.mimetype,
        allowedMimeTypes,
        filename: file.originalname,
      });

      return res.status(400).json({
        success: false,
        error: {
          type: 'validation_error',
          code: 'INVALID_FILE_TYPE',
          message: `File type '${file.mimetype}' is not supported. Allowed types: ${allowedMimeTypes.join(', ')}`,
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
        },
      });
    }

    logger.info('File upload validation successful', {
      requestId,
      filename: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
    });

    next();
  };
}

/**
 * Options validation middleware for multipart forms
 * Validates JSON options field in multipart/form-data requests
 */
export function validateFormOptions<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const requestId = req.requestId || `req_${Date.now()}`;
    
    logger.info('Form options validation started', {
      requestId,
      hasOptions: !!req.body.options,
    });

    // If no options provided, use empty object and validate
    let options = {};
    
    if (req.body.options) {
      // If options is already an object (parsed by multer), use it directly
      if (typeof req.body.options === 'object' && req.body.options !== null) {
        options = req.body.options;
      } else if (typeof req.body.options === 'string') {
        // Handle empty string
        if (req.body.options.trim() === '') {
          options = {};
        } else if (req.body.options === '[object Object]' || req.body.options.startsWith('[object')) {
          // Handle object string representation - use empty object
          logger.warn('Received object string representation in options, using empty object', {
            requestId,
            options: req.body.options,
          });
          options = {};
        } else {
          // Try to parse as JSON
          try {
            options = JSON.parse(req.body.options);
          } catch (error) {
            logger.warn('Invalid JSON in options field, using empty object', {
              requestId,
              options: req.body.options,
              error,
            });
            
            // Use empty object instead of failing - be more forgiving
            options = {};
          }
        }
      } else {
        // For any other type, use empty object
        logger.warn('Unexpected options type, using empty object', {
          requestId,
          optionsType: typeof req.body.options,
          options: req.body.options,
        });
        options = {};
      }
    }

    const validationResult = schema.safeParse(options);
    
    if (!validationResult.success) {
      logger.warn('Form options validation failed', {
        requestId,
        errors: validationResult.error.errors,
      });

      return res.status(400).json({
        success: false,
        error: {
          type: 'validation_error',
          code: 'INVALID_OPTIONS',
          message: 'Options validation failed',
          details: validationResult.error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code,
          })),
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
        },
      });
    }

    // Replace options with validated data
    req.body.options = validationResult.data;

    logger.info('Form options validation successful', {
      requestId,
    });

    next();
    
    return; // Explicit return for TypeScript
  };
}

// Type augmentation for Express Request
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
} 