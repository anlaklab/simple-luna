/**
 * Extraction Routes - Asset and metadata extraction endpoints
 * 
 * Focused routes for extracting assets and metadata from presentations
 * Moved from ai.routes.ts to organize non-AI extraction functionality
 */

import { Router, Request, Response } from 'express';
import { AsposeAdapterRefactored } from '../adapters/aspose/AsposeAdapterRefactored';
import { validateRequest, validateFormOptions } from '../middleware/validation.middleware';
import { handleAsyncErrors } from '../middleware/error.middleware';
import { 
  largeFileUpload, 
  validateUploadWithTiers, 
  handleUploadError 
} from '../middleware/upload.middleware';
import { logger } from '../utils/logger';
import {
  ExtractAssetsRequestSchema,
  ExtractMetadataRequestSchema,
} from '../schemas/api-request.schema';
import {
  ExtractAssetsOptions,
  ExtractMetadataOptions,
  AssetExtractionResult,
  ExtractedMetadata,
} from '../types/ai.types';

// =============================================================================
// ROUTER SETUP
// =============================================================================

const router = Router();

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
// EXTRACTION CONTROLLERS
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

      res.status(200).json({
        success: true,
        data: {
          assets,
          summary,
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
      // Real metadata extraction using refactored services
      const metadata = await asposeAdapter.extractMetadata(tempFilePath, {
        includeSystemProperties: options.includeSystemMetadata !== false,
        includeCustomProperties: options.includeCustomProperties !== false,
        includeDocumentStatistics: options.includeStatistics !== false,
      });

      res.status(200).json({
        success: true,
        data: {
          metadata,
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
 * Asset Metadata Extraction Controller - Future implementation placeholder
 */
const extractAssetMetadataController = async (req: Request, res: Response): Promise<void> => {
  const requestId = req.requestId || `req_${Date.now()}`;
  const startTime = Date.now();

  res.status(501).json({
    success: false,
    error: {
      type: 'not_implemented',
      code: 'FEATURE_NOT_IMPLEMENTED',
      message: 'Asset metadata extraction will be implemented in Phase 2 of refactoring',
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
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/extract-assets', largeFileUpload.single('file'), validateUploadWithTiers, validateFormOptions(ExtractAssetsRequestSchema), handleAsyncErrors(extractAssetsController), handleUploadError);

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
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/extract-metadata', largeFileUpload.single('file'), validateUploadWithTiers, validateFormOptions(ExtractMetadataRequestSchema), handleAsyncErrors(extractMetadataController), handleUploadError);

/**
 * @swagger
 * /extract-asset-metadata:
 *   post:
 *     tags:
 *       - Extraction
 *     summary: Extract metadata from embedded assets
 *     description: |
 *       Extract detailed metadata from embedded assets within presentations.
 *       Scheduled for implementation in Phase 2 of refactoring.
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
 *         description: Feature scheduled for Phase 2 implementation
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/extract-asset-metadata', largeFileUpload.single('file'), validateUploadWithTiers, handleAsyncErrors(extractAssetMetadataController), handleUploadError);

export default router; 