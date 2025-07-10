/**
 * Conversion Routes - File conversion endpoints
 * 
 * Organized routes for PPTX ↔ JSON conversions and format conversion
 */

import { Router } from 'express';
import multer from 'multer';
import { ConversionController } from '../controllers/conversion.controller';
import { ConversionService } from '../services/conversion.service';
import { validateRequest, validateFileUpload, validateFormOptions } from '../middleware/validation.middleware';
import { handleAsyncErrors } from '../middleware/error.middleware';
import {
  Pptx2JsonRequestSchema,
  Json2PptxRequestSchema,
  ConvertFormatRequestSchema,
  ThumbnailsRequestSchema,
} from '../schemas/api-request.schema';

// =============================================================================
// ROUTER SETUP
// =============================================================================

const router = Router();

// =============================================================================
// MULTER CONFIGURATION
// =============================================================================

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '52428800'), // 50MB default
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.slideshow',
    ];
    
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type. Allowed types: ${allowedMimeTypes.join(', ')}`));
    }
  },
});

// =============================================================================
// CONTROLLER INITIALIZATION
// =============================================================================

// Initialize services with configuration
    // Aspose.Slides configuration
    const asposeConfig = {
      licenseFilePath: process.env.ASPOSE_LICENSE_PATH || './Aspose.Slides.Product.Family.lic',
      tempDirectory: process.env.ASPOSE_TEMP_DIR || './temp'
    };
    if (process.env.ASPOSE_LICENSE_PATH) {
      asposeConfig.licenseFilePath = process.env.ASPOSE_LICENSE_PATH;
    }

const conversionServiceConfig: any = {
  asposeConfig,
  uploadToStorage: process.env.FEATURE_FIREBASE_STORAGE === 'true',
  cleanupTempFiles: true,
};

if (process.env.FIREBASE_PROJECT_ID) {
  conversionServiceConfig.firebaseConfig = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  };
}

const conversionService = new ConversionService(conversionServiceConfig);

const conversionController = new ConversionController({
  conversionService,
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '52428800'),
  tempDirectory: process.env.UPLOAD_TEMP_DIR || './temp/uploads',
});

// =============================================================================
// ROUTE DEFINITIONS
// =============================================================================

/**
 * @swagger
 * /pptx2json:
 *   post:
 *     tags:
 *       - Conversion
 *     summary: Convert PPTX file to Universal Schema JSON
 *     description: |
 *       Converts a PowerPoint PPTX file to Universal Presentation Schema JSON format.
 *       This endpoint preserves all presentation elements including slides, shapes,
 *       animations, and metadata in a standardized JSON structure.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: PPTX file to convert
 *               options:
 *                 type: string
 *                 description: JSON string with conversion options
 *                 example: '{"includeAssets":false,"includeMetadata":true,"includeAnimations":true}'
 *             required:
 *               - file
 *           examples:
 *             basic:
 *               summary: Basic conversion
 *               value:
 *                 file: (binary)
 *                 options: '{"includeMetadata":true,"includeAnimations":true}'
 *             advanced:
 *               summary: Advanced conversion with assets
 *               value:
 *                 file: (binary)
 *                 options: '{"includeAssets":true,"includeMetadata":true,"includeAnimations":true,"extractImages":true}'
 *     responses:
 *       200:
 *         description: Conversion successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     presentation:
 *                       $ref: '#/components/schemas/UniversalPresentation'
 *                     originalFilename:
 *                       type: string
 *                       example: 'business-presentation.pptx'
 *                     processingStats:
 *                       $ref: '#/components/schemas/ProcessingStats'
 *                 meta:
 *                   $ref: '#/components/schemas/SuccessMeta'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post(
  '/pptx2json',
  upload.single('file'),
  validateFileUpload({
    required: true,
    maxSize: parseInt(process.env.MAX_FILE_SIZE || '52428800'),
    fieldName: 'file',
  }),
  validateFormOptions(Pptx2JsonRequestSchema),
  handleAsyncErrors(conversionController.convertPptxToJson)
);

/**
 * @swagger
 * /json2pptx:
 *   post:
 *     tags:
 *       - Conversion
 *     summary: Convert Universal Schema JSON to PPTX file
 *     description: |
 *       Converts Universal Presentation Schema JSON back to a PowerPoint PPTX file.
 *       This endpoint reconstructs all presentation elements from the JSON format.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               presentationData:
 *                 $ref: '#/components/schemas/UniversalPresentation'
 *               outputFormat:
 *                 type: string
 *                 enum: [pptx, pptm]
 *                 default: pptx
 *                 description: Output format
 *               includeMetadata:
 *                 type: boolean
 *                 default: true
 *                 description: Include document metadata
 *               preserveOriginalAssets:
 *                 type: boolean
 *                 default: true
 *                 description: Preserve original asset quality
 *               compressionLevel:
 *                 type: string
 *                 enum: [none, fast, maximum]
 *                 default: fast
 *                 description: File compression level
 *             required:
 *               - presentationData
 *           examples:
 *             basic:
 *               summary: Basic JSON to PPTX conversion
 *               value:
 *                 presentationData:
 *                   metadata:
 *                     id: 'pres_123'
 *                     title: 'Sample Presentation'
 *                     created: '2024-01-15T10:00:00.000Z'
 *                     modified: '2024-01-15T10:30:00.000Z'
 *                     slideCount: 1
 *                   slides:
 *                     - id: 'slide_001'
 *                       index: 0
 *                       title: 'Title Slide'
 *                       layout: 'Title Slide'
 *                       shapes: []
 *                 outputFormat: 'pptx'
 *     responses:
 *       200:
 *         description: Conversion successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     file:
 *                       $ref: '#/components/schemas/FileInfo'
 *                     outputFormat:
 *                       type: string
 *                       example: 'pptx'
 *                     processingStats:
 *                       $ref: '#/components/schemas/ProcessingStats'
 *                 meta:
 *                   $ref: '#/components/schemas/SuccessMeta'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post(
  '/json2pptx',
  validateRequest(Json2PptxRequestSchema, 'body'),
  handleAsyncErrors(conversionController.convertJsonToPptx)
);

/**
 * @swagger
 * /convertformat:
 *   post:
 *     tags:
 *       - Conversion
 *     summary: Convert presentation to different formats
 *     description: |
 *       Converts PPTX files to various output formats including PDF, HTML, and images.
 *       Supports batch conversion and format-specific optimization options.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: PPTX file to convert
 *               options:
 *                 type: string
 *                 description: JSON string with conversion options
 *                 example: '{"outputFormat":"pdf","quality":"high","includeNotes":false}'
 *             required:
 *               - file
 *               - options
 *           examples:
 *             pdf:
 *               summary: Convert to PDF
 *               value:
 *                 file: (binary)
 *                 options: '{"outputFormat":"pdf","quality":"high","includeNotes":false}'
 *             images:
 *               summary: Convert to PNG images
 *               value:
 *                 file: (binary)
 *                 options: '{"outputFormat":"png","quality":"high","slideRange":{"start":1,"end":5}}'
 *     responses:
 *       200:
 *         description: Conversion successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     files:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/FileInfo'
 *                     outputFormat:
 *                       type: string
 *                       example: 'pdf'
 *                     slideCount:
 *                       type: number
 *                       example: 10
 *                     totalSize:
 *                       type: number
 *                       example: 2048576
 *                 meta:
 *                   $ref: '#/components/schemas/SuccessMeta'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post(
  '/convertformat',
  upload.single('file'),
  validateFileUpload({
    required: true,
    maxSize: parseInt(process.env.MAX_FILE_SIZE || '52428800'),
    fieldName: 'file',
  }),
  validateFormOptions(ConvertFormatRequestSchema),
  handleAsyncErrors(conversionController.convertFormat)
);

/**
 * @swagger
 * /thumbnails:
 *   post:
 *     tags:
 *       - Conversion
 *     summary: Generate slide thumbnails
 *     description: |
 *       Generates thumbnail images for presentation slides with customizable
 *       size, format, and quality options. Supports batch generation.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: PPTX file to process
 *               options:
 *                 type: string
 *                 description: JSON string with thumbnail options
 *                 example: '{"size":{"width":800,"height":600},"format":"png","quality":"high"}'
 *             required:
 *               - file
 *           examples:
 *             standard:
 *               summary: Standard thumbnails
 *               value:
 *                 file: (binary)
 *                 options: '{"size":{"width":800,"height":600},"format":"png","quality":"high"}'
 *             custom:
 *               summary: Custom size and specific slides
 *               value:
 *                 file: (binary)
 *                 options: '{"slideIndices":[0,1,2],"size":{"width":1200,"height":900},"format":"jpg","quality":"medium"}'
 *     responses:
 *       200:
 *         description: Thumbnails generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     thumbnails:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           slideIndex:
 *                             type: number
 *                             example: 0
 *                           thumbnail:
 *                             type: string
 *                             description: Base64 encoded image or URL
 *                           format:
 *                             type: string
 *                             example: 'png'
 *                           size:
 *                             type: object
 *                             properties:
 *                               width:
 *                                 type: number
 *                                 example: 800
 *                               height:
 *                                 type: number
 *                                 example: 600
 *                     totalSlides:
 *                       type: number
 *                       example: 10
 *                     generatedCount:
 *                       type: number
 *                       example: 10
 *                 meta:
 *                   $ref: '#/components/schemas/SuccessMeta'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post(
  '/thumbnails',
  upload.single('file'),
  validateFileUpload({
    required: true,
    maxSize: parseInt(process.env.MAX_FILE_SIZE || '52428800'),
    fieldName: 'file',
  }),
  validateFormOptions(ThumbnailsRequestSchema),
  handleAsyncErrors(conversionController.generateThumbnails)
);

/**
 * @swagger
 * /health:
 *   get:
 *     tags:
 *       - Utility
 *     summary: Health check for conversion services
 *     description: |
 *       Checks the health status of the conversion services including
 *       Aspose.Slides, Firebase connectivity, and system resources.
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       enum: [healthy, degraded, unhealthy]
 *                       example: 'healthy'
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                       example: '2024-01-15T10:30:00.000Z'
 *                     uptime:
 *                       type: number
 *                       description: Server uptime in seconds
 *                       example: 3600
 *                     version:
 *                       type: string
 *                       example: '1.0'
 *                     services:
 *                       type: object
 *                       properties:
 *                         conversion:
 *                           type: string
 *                           enum: [healthy, degraded, unhealthy]
 *                           example: 'healthy'
 *                         aspose:
 *                           type: string
 *                           enum: [healthy, degraded, unhealthy]
 *                           example: 'healthy'
 *                         firebase:
 *                           type: string
 *                           enum: [healthy, degraded, unhealthy]
 *                           example: 'healthy'
 *                 meta:
 *                   $ref: '#/components/schemas/SuccessMeta'
 *       503:
 *         description: Service is unhealthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get(
  '/health',
  handleAsyncErrors(conversionController.healthCheck)
);

export default router; 