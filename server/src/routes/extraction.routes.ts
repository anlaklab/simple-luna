/**
 * Extraction Routes - Asset and metadata extraction from presentations
 * 
 * Focused routes for extracting embedded assets and document metadata
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import { AsposeAdapterRefactored } from '../adapters/aspose/AsposeAdapterRefactored';
import { validateFileUpload, validateFormOptions } from '../middleware/validation.middleware';
import { handleAsyncErrors } from '../middleware/error.middleware';
import { logger } from '../utils/logger';
import { ExtractAssetsRequestSchema, ExtractMetadataRequestSchema } from '../schemas/api-request.schema';
import { ExtractAssetsOptions, ExtractMetadataOptions, AssetExtractionResult, ExtractedMetadata } from '../types/ai.types';

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
// SERVICE INITIALIZATION
// =============================================================================

const asposeConfig = {
  licenseFilePath: process.env.ASPOSE_LICENSE_PATH || './Aspose.Slides.Product.Family.lic',
  tempDirectory: process.env.ASPOSE_TEMP_DIR || './temp/aspose',
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '52428800'),
};

const asposeAdapter = new AsposeAdapterRefactored(asposeConfig);

// =============================================================================
// CONTROLLERS
// =============================================================================

/**
 * Asset Extraction Controller - Real implementation using refactored AssetService
 */
const extractAssetsController = async (req: Request, res: Response): Promise<void> => {
  const requestId = req.requestId || `req_${Date.now()}`;
  const startTime = Date.now();

  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        error: {
          type: 'validation_error',
          code: 'FILE_REQUIRED',
          message: 'PPTX file is required for asset extraction',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
          processingTimeMs: Date.now() - startTime,
        },
      });
      return;
    }

    // Options are already safely parsed by validateFormOptions middleware
    const options = req.body.options as ExtractAssetsOptions;
    
    // Save uploaded file temporarily
    const fs = require('fs/promises');
    const path = require('path');
    const tempDir = './temp/assets';
    await fs.mkdir(tempDir, { recursive: true });
    
    const tempFilePath = path.join(tempDir, `${requestId}_${req.file.originalname}`);
    await fs.writeFile(tempFilePath, req.file.buffer);

    try {
      // Real asset extraction using refactored AssetService
      const assets = await asposeAdapter.extractAssets(tempFilePath, {
        assetTypes: options.assetTypes || ['images', 'videos', 'audio'],
        returnFormat: options.returnFormat || 'urls',
        generateThumbnails: options.generateThumbnails || false,
      });

      const summary = {
        totalAssets: assets.length,
        byType: {
          images: assets.filter(a => a.type === 'image').length,
          videos: assets.filter(a => a.type === 'video').length,
          audio: assets.filter(a => a.type === 'audio').length,
          documents: assets.filter(a => a.type === 'document').length,
        },
        totalSize: assets.reduce((sum, asset) => sum + asset.size, 0),
      };

      const result: AssetExtractionResult = {
        assets,
        summary,
      };

      res.status(200).json({
        success: true,
        data: result,
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
          processingTimeMs: Date.now() - startTime,
          version: '1.0',
        },
      });

      // Clean up temp file
      await fs.unlink(tempFilePath).catch(() => {});

    } catch (extractionError) {
      await fs.unlink(tempFilePath).catch(() => {});
      throw extractionError;
    }

  } catch (error) {
    logger.error('Asset extraction failed', { error, requestId });
    res.status(500).json({
      success: false,
      error: {
        type: 'extraction_error',
        code: 'ASSET_EXTRACTION_FAILED',
        message: error instanceof Error ? error.message : 'Asset extraction failed',
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
        processingTimeMs: Date.now() - startTime,
      },
    });
  }
};

/**
 * Metadata Extraction Controller - Real implementation using refactored MetadataService
 */
const extractMetadataController = async (req: Request, res: Response): Promise<void> => {
  const requestId = req.requestId || `req_${Date.now()}`;
  const startTime = Date.now();

  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        error: {
          type: 'validation_error',
          code: 'FILE_REQUIRED',
          message: 'PPTX file is required for metadata extraction',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
          processingTimeMs: Date.now() - startTime,
        },
      });
      return;
    }

    // Options are already safely parsed by validateFormOptions middleware
    const options = req.body.options as ExtractMetadataOptions;
    
    // Save uploaded file temporarily
    const fs = require('fs/promises');
    const path = require('path');
    const tempDir = './temp/metadata';
    await fs.mkdir(tempDir, { recursive: true });
    
    const tempFilePath = path.join(tempDir, `${requestId}_${req.file.originalname}`);
    await fs.writeFile(tempFilePath, req.file.buffer);

    try {
      // Real metadata extraction using refactored MetadataService
      const metadata = await asposeAdapter.extractMetadata(tempFilePath, {
        includeSystemProperties: options.includeSystemMetadata !== false,
        includeCustomProperties: options.includeCustomProperties || false,
        includeDocumentStatistics: options.includeStatistics !== false,
      });

      const statistics = await asposeAdapter.getDocumentStatistics(tempFilePath);

      const result: ExtractedMetadata = {
        basic: {
          title: metadata.title,
          author: metadata.author,
          subject: metadata.subject,
          category: metadata.category,
          keywords: metadata.keywords,
          comments: metadata.comments,
        },
        system: {
          created: metadata.creationTime?.toISOString(),
          modified: metadata.lastModifiedTime?.toISOString(),
          createdBy: metadata.createdBy,
          lastModifiedBy: metadata.lastModifiedBy,
          applicationName: metadata.applicationName,
        },
        statistics: {
          slideCount: statistics.slideCount,
          shapeCount: statistics.shapeCount,
          wordCount: statistics.textLength,
          fileSize: statistics.fileSize,
          imageCount: statistics.imageCount,
          chartCount: statistics.chartCount,
          tableCount: statistics.tableCount,
        },
        customProperties: metadata.customProperties || {},
      };

      res.status(200).json({
        success: true,
        data: {
          metadata: result,
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
          processingTimeMs: Date.now() - startTime,
          version: '1.0',
        },
      });

      // Clean up temp file
      await fs.unlink(tempFilePath).catch(() => {});

    } catch (extractionError) {
      await fs.unlink(tempFilePath).catch(() => {});
      throw extractionError;
    }

  } catch (error) {
    logger.error('Metadata extraction failed', { error, requestId });
    res.status(500).json({
      success: false,
      error: {
        type: 'extraction_error',
        code: 'METADATA_EXTRACTION_FAILED',
        message: error instanceof Error ? error.message : 'Metadata extraction failed',
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
        processingTimeMs: Date.now() - startTime,
      },
    });
  }
};

/**
 * Asset Metadata Extraction Controller - Real implementation
 */
const extractAssetMetadataController = async (req: Request, res: Response): Promise<void> => {
  const requestId = req.requestId || `req_${Date.now()}`;
  const startTime = Date.now();

  res.status(501).json({
    success: false,
    error: {
      type: 'not_implemented',
      code: 'FEATURE_NOT_IMPLEMENTED',
      message: 'Asset metadata extraction is not yet implemented. Use /extract-assets for basic asset extraction.',
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId,
      processingTimeMs: Date.now() - startTime,
    },
  });
};

// =============================================================================
// ROUTE DEFINITIONS
// =============================================================================

/**
 * @swagger
 * /extract-assets:
 *   post:
 *     tags:
 *       - Extraction
 *     summary: Extract embedded assets from presentation
 *     description: |
 *       Extract embedded assets (images, videos, audio files) from a PowerPoint presentation.
 *       Supports various output formats and can generate thumbnails for media files.
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
 *                 description: PPTX file to extract assets from
 *               options:
 *                 type: string
 *                 description: JSON string with extraction options
 *                 example: '{"assetTypes":["images","videos"],"returnFormat":"urls","generateThumbnails":true}'
 *             required:
 *               - file
 *     responses:
 *       200:
 *         description: Assets extracted successfully
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
 *                     assets:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             example: "asset_001"
 *                           type:
 *                             type: string
 *                             enum: [image, video, audio, document]
 *                             example: "image"
 *                           filename:
 *                             type: string
 *                             example: "chart.png"
 *                           size:
 *                             type: number
 *                             example: 1048576
 *                           url:
 *                             type: string
 *                             example: "https://storage.googleapis.com/bucket/assets/chart.png"
 *                           thumbnailUrl:
 *                             type: string
 *                             example: "https://storage.googleapis.com/bucket/thumbnails/chart_thumb.png"
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalAssets:
 *                           type: number
 *                           example: 5
 *                         byType:
 *                           type: object
 *                           properties:
 *                             images:
 *                               type: number
 *                               example: 3
 *                             videos:
 *                               type: number
 *                               example: 1
 *                             audio:
 *                               type: number
 *                               example: 1
 *                         totalSize:
 *                           type: number
 *                           example: 5242880
 *                 meta:
 *                   $ref: '#/components/schemas/SuccessMeta'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/extract-assets', 
  upload.single('file'), 
  validateFileUpload({ 
    required: true, 
    maxSize: parseInt(process.env.MAX_FILE_SIZE || '52428800'), 
    fieldName: 'file' 
  }), 
  validateFormOptions(ExtractAssetsRequestSchema), 
  handleAsyncErrors(extractAssetsController)
);

/**
 * @swagger
 * /extract-metadata:
 *   post:
 *     tags:
 *       - Extraction
 *     summary: Extract comprehensive document metadata
 *     description: |
 *       Extract detailed metadata from PowerPoint presentations including basic properties,
 *       system information, document statistics, and custom properties.
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
 *                 description: PPTX file to extract metadata from
 *               options:
 *                 type: string
 *                 description: JSON string with extraction options
 *                 example: '{"includeSystemMetadata":true,"includeCustomProperties":true,"includeStatistics":true}'
 *             required:
 *               - file
 *     responses:
 *       200:
 *         description: Metadata extracted successfully
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
 *                     metadata:
 *                       type: object
 *                       properties:
 *                         basic:
 *                           type: object
 *                           properties:
 *                             title:
 *                               type: string
 *                               example: "Q4 Business Review"
 *                             author:
 *                               type: string
 *                               example: "John Smith"
 *                             subject:
 *                               type: string
 *                               example: "Quarterly Results"
 *                             category:
 *                               type: string
 *                               example: "Business"
 *                             keywords:
 *                               type: string
 *                               example: "quarterly, results, business"
 *                             comments:
 *                               type: string
 *                               example: "Final version for executive review"
 *                         system:
 *                           type: object
 *                           properties:
 *                             created:
 *                               type: string
 *                               format: date-time
 *                               example: "2024-01-15T10:00:00.000Z"
 *                             modified:
 *                               type: string
 *                               format: date-time
 *                               example: "2024-01-15T15:30:00.000Z"
 *                             createdBy:
 *                               type: string
 *                               example: "John Smith"
 *                             lastModifiedBy:
 *                               type: string
 *                               example: "Jane Doe"
 *                             applicationName:
 *                               type: string
 *                               example: "Microsoft PowerPoint"
 *                         statistics:
 *                           type: object
 *                           properties:
 *                             slideCount:
 *                               type: number
 *                               example: 15
 *                             shapeCount:
 *                               type: number
 *                               example: 85
 *                             wordCount:
 *                               type: number
 *                               example: 1250
 *                             fileSize:
 *                               type: number
 *                               example: 2048576
 *                             imageCount:
 *                               type: number
 *                               example: 8
 *                             chartCount:
 *                               type: number
 *                               example: 3
 *                             tableCount:
 *                               type: number
 *                               example: 2
 *                         customProperties:
 *                           type: object
 *                           description: Custom document properties
 *                 meta:
 *                   $ref: '#/components/schemas/SuccessMeta'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/extract-metadata', 
  upload.single('file'), 
  validateFileUpload({ 
    required: true, 
    maxSize: parseInt(process.env.MAX_FILE_SIZE || '52428800'), 
    fieldName: 'file' 
  }), 
  validateFormOptions(ExtractMetadataRequestSchema), 
  handleAsyncErrors(extractMetadataController)
);

/**
 * @swagger
 * /extract-asset-metadata:
 *   post:
 *     tags:
 *       - Extraction
 *     summary: Extract metadata from embedded assets
 *     description: |
 *       Extract detailed metadata from embedded assets within presentations.
 *       Currently not implemented - use /extract-assets for basic asset extraction.
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
 *             required:
 *               - file
 *     responses:
 *       501:
 *         description: Feature not yet implemented
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/extract-asset-metadata', 
  upload.single('file'), 
  validateFileUpload({ 
    required: true, 
    maxSize: parseInt(process.env.MAX_FILE_SIZE || '52428800'), 
    fieldName: 'file' 
  }), 
  handleAsyncErrors(extractAssetMetadataController)
);

export default router; 