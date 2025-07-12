/**
 * Upload Middleware - Advanced file upload handling with tier-based limits
 * 
 * Integrates with UploadTierService for dynamic file size and type validation
 */

import multer, { MulterError } from 'multer';
import { Request, Response, NextFunction } from 'express';
import { UploadTierService } from '../services/upload-tier.service';
import { FirebaseAdapter } from '../adapters/firebase.adapter';
import { logger } from '../utils/logger';

// =============================================================================
// TYPES
// =============================================================================

interface UploadOptions {
  maxFileSize?: number;
  allowedMimeTypes?: string[];
  maxFiles?: number;
  requireAuth?: boolean;
  fieldName?: string;
  enableTierValidation?: boolean;
}

interface RequestWithTier extends Request {
  userTier?: {
    tier: string;
    limits: any;
  };
}

// =============================================================================
// UPLOAD MIDDLEWARE FACTORY
// =============================================================================

/**
 * Creates a multer upload middleware with tier-based validation
 */
export function createUploadMiddleware(options: UploadOptions = {}) {
  const {
    maxFileSize = parseInt(process.env.MAX_FILE_SIZE || '52428800'), // 50MB default
    allowedMimeTypes = [
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.slideshow',
    ],
    maxFiles = 1,
    fieldName = 'file',
    enableTierValidation = true,
  } = options;

  // Initialize tier service if enabled
  let tierService: UploadTierService | null = null;
  if (enableTierValidation && process.env.FIREBASE_PROJECT_ID && 
      process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL && 
      process.env.FIREBASE_STORAGE_BUCKET) {
    try {
      const firebase = new FirebaseAdapter({
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      });
      tierService = new UploadTierService(firebase);
    } catch (error) {
      logger.warn('Failed to initialize tier service for upload validation', { error });
    }
  }

  // Configure multer
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: maxFileSize,
      files: maxFiles,
      fieldSize: 1024 * 1024, // 1MB for form fields
    },
    fileFilter: async (req: RequestWithTier, file, cb) => {
      try {
        // Basic mime type validation
        if (!allowedMimeTypes.includes(file.mimetype)) {
          return cb(new MulterError('LIMIT_UNEXPECTED_FILE', fieldName));
        }

        // Tier-based validation if enabled
        if (enableTierValidation && tierService) {
          const userId = req.headers['x-user-id'] as string || 'anonymous';
          
          try {
            const validation = await tierService.validateFileUpload(
              userId,
              file.size || 0,
              file.originalname,
              file.mimetype
            );

                         if (!validation.isValid) {
               logger.warn('File upload blocked by tier limits', {
                 userId,
                 fileName: file.originalname,
                 fileSize: file.size,
                 reasons: validation.reasons,
               });
               return cb(new Error(`Upload blocked: ${validation.reasons?.join(', ') || 'Tier limits exceeded'}`));
             }

            // Store tier info in request for later use
            const tierInfo = await tierService.getUserTierInfo(userId);
            if (tierInfo) {
              const tierConfig = tierService.getTierConfiguration(tierInfo.currentTier);
              req.userTier = {
                tier: tierInfo.currentTier,
                limits: tierConfig?.limits,
              };
            }
          } catch (tierError) {
            logger.error('Tier validation failed, allowing upload with basic validation', { tierError });
          }
        }

        cb(null, true);
      } catch (error) {
        logger.error('File filter error', { error, fileName: file.originalname });
        cb(error as any);
      }
    },
  });

  return upload;
}

// =============================================================================
// SPECIALIZED UPLOAD MIDDLEWARES
// =============================================================================

/**
 * Standard upload for conversions (PPTX files)
 */
export const conversionUpload = createUploadMiddleware({
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '52428800'),
  allowedMimeTypes: [
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.slideshow',
  ],
  fieldName: 'file',
  enableTierValidation: true,
});

/**
 * Large file upload for premium tiers
 */
export const largeFileUpload = createUploadMiddleware({
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '52428800'),
  allowedMimeTypes: [
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.slideshow',
    'application/pdf',
    'application/vnd.oasis.opendocument.presentation',
  ],
  fieldName: 'file',
  enableTierValidation: true,
});

/**
 * Batch upload for multiple files (premium tiers only)
 */
export const batchUpload = createUploadMiddleware({
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '52428800'),
  maxFiles: 20,
  allowedMimeTypes: [
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.slideshow',
    'application/pdf',
  ],
  fieldName: 'files',
  enableTierValidation: true,
});

/**
 * Debug upload middleware using disk storage for large files
 * This prevents memory truncation issues with large PPTX files
 */
export const debugFileUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = process.env.UPLOAD_TEMP_DIR || './temp/uploads';
      const fs = require('fs');
      
      // Ensure directory exists
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const requestId = req.requestId || `debug_${Date.now()}`;
      const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
      cb(null, `${requestId}_${sanitizedName}`);
    }
  }),
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '52428800'), // 50MB default
    files: 1,
    fieldSize: 1024 * 1024, // 1MB for form fields
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.slideshow',
      'application/pdf',
      'application/vnd.oasis.opendocument.presentation',
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      return cb(new MulterError('LIMIT_UNEXPECTED_FILE', 'file'));
    }

    cb(null, true);
  },
});

// =============================================================================
// UPLOAD VALIDATION MIDDLEWARE
// =============================================================================

/**
 * Enhanced upload validation middleware with tier integration
 */
export const validateUploadWithTiers = async (
  req: RequestWithTier,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.file && !req.files) {
      res.status(400).json({
        success: false,
        error: {
          type: 'validation_error',
          code: 'FILE_REQUIRED',
          message: 'File upload is required',
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    // Track usage if tier service is available
    if (req.userTier && process.env.FIREBASE_PROJECT_ID && 
        process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL && 
        process.env.FIREBASE_STORAGE_BUCKET) {
      try {
        const firebase = new FirebaseAdapter({
          projectId: process.env.FIREBASE_PROJECT_ID,
          privateKey: process.env.FIREBASE_PRIVATE_KEY,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
        });
        const tierService = new UploadTierService(firebase);
        
        const userId = req.headers['x-user-id'] as string || 'anonymous';
        const fileSize = req.file?.size || 0;
        
        await tierService.trackFileUpload(userId, fileSize);
        
        logger.info('Upload tracked for tier usage', {
          userId,
          fileSize,
          tier: req.userTier.tier,
        });
      } catch (trackingError) {
        logger.warn('Failed to track upload for tier usage', { trackingError });
      }
    }

    next();
  } catch (error) {
    logger.error('Upload validation failed', { error });
    res.status(500).json({
      success: false,
      error: {
        type: 'upload_error',
        code: 'VALIDATION_FAILED',
        message: 'Upload validation failed',
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  }
};

// =============================================================================
// ERROR HANDLING MIDDLEWARE
// =============================================================================

/**
 * Enhanced multer error handler
 */
export const handleUploadError = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (error instanceof MulterError) {
    let message = 'File upload error';
    let code = 'UPLOAD_ERROR';

    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        message = `File too large. Maximum size is ${formatBytes(parseInt(process.env.MAX_FILE_SIZE || '52428800'))}`;
        code = 'FILE_TOO_LARGE';
        break;
      case 'LIMIT_FILE_COUNT':
        message = 'Too many files uploaded';
        code = 'TOO_MANY_FILES';
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        message = 'Invalid file type or field name';
        code = 'INVALID_FILE_TYPE';
        break;
      case 'LIMIT_FIELD_VALUE':
        message = 'Form field value too large';
        code = 'FIELD_TOO_LARGE';
        break;
      default:
        message = error.message || 'Upload failed';
    }

    logger.warn('Upload error handled', {
      error: error.code,
      message,
      fieldName: error.field,
    });

    res.status(400).json({
      success: false,
      error: {
        type: 'upload_error',
        code,
        message,
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }

  // Handle other upload-related errors
  if (error.message && error.message.includes('Upload blocked')) {
    res.status(402).json({
      success: false,
      error: {
        type: 'tier_limit_error',
        code: 'UPLOAD_BLOCKED_BY_TIER',
        message: error.message,
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }

  next(error);
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Format bytes to human readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
} 