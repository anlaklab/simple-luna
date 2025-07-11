/**
 * Extraction Routes - Asset and metadata extraction endpoints
 * 
 * Focused routes for extracting assets and metadata from presentations
 * Moved from ai.routes.ts to organize non-AI extraction functionality
 */

import { Router, Request, Response } from 'express';
import { createAssetService } from '../adapters/aspose';
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

// No legacy adapters - Luna uses ONLY AssetServiceRefactored

// =============================================================================
// MANDATORY ASSETSERVICE INITIALIZATION - NO FALLBACKS
// =============================================================================

// Validate required environment variables
const requiredVars = {
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
  FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY,
  FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL,
  FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET,
  ASPOSE_LICENSE_PATH: process.env.ASPOSE_LICENSE_PATH
};

const missingVars = Object.entries(requiredVars)
  .filter(([key, value]) => !value)
  .map(([key]) => key);

if (missingVars.length > 0) {
  const errorMessage = `CRITICAL: Luna AssetService requires ALL environment variables. Missing: ${missingVars.join(', ')}`;
  logger.error('AssetService initialization failed - missing required configuration', {
    missingVars,
    requiredVars: Object.keys(requiredVars),
    error: errorMessage
  });
  throw new Error(errorMessage);
}

// Initialize AssetService - MUST succeed or fail clearly
let assetService: any;
try {
  logger.info('Initializing Luna AssetService with complete configuration...');
  
  assetService = createAssetService({
    aspose: {
      licenseFilePath: process.env.ASPOSE_LICENSE_PATH,
      tempDirectory: process.env.ASPOSE_TEMP_DIR || './temp/aspose'
    },
    firebase: {
      projectId: process.env.FIREBASE_PROJECT_ID!,
      privateKey: process.env.FIREBASE_PRIVATE_KEY!,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET!
    },
    storage: {
      defaultFolder: 'extracted-assets',
      generateThumbnails: true,
      thumbnailSize: { width: 200, height: 150, aspectRatio: 1.33 },
      maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '52428800')
    },
    processing: {
      defaultImageQuality: 85,
      enableParallelProcessing: true,
      maxConcurrentExtractions: 4,
      timeoutMs: 5 * 60 * 1000
    }
  });
  
  logger.info('Luna AssetService initialized successfully', { 
    serviceType: 'AssetServiceRefactored',
    hasFirebase: true,
    hasAspose: true
  });
  
} catch (error) {
  const errorMessage = `CRITICAL: Luna AssetService initialization failed. ${error instanceof Error ? error.message : String(error)}`;
  logger.error('AssetService initialization failed catastrophically', { 
    error: errorMessage,
    stack: error instanceof Error ? error.stack : undefined
  });
  throw new Error(errorMessage);
}

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
      logger.info('Extracting assets using Luna AssetService', { requestId, filename: req.file.originalname });
      
      // Convert legacy API format to internal format
      const normalizeAssetTypes = (types: string[]): string[] => {
        return types.map(type => {
          switch (type) {
            case 'images': return 'image';
            case 'videos': return 'video';
            case 'audio': return 'audio';
            case 'documents': return 'document';
            default: return type;
          }
        });
      };
      
      // Extract assets using ONLY AssetServiceRefactored - no fallbacks
      const assets = await assetService.extractAssets(tempFilePath, {
        assetTypes: normalizeAssetTypes(options.assetTypes || ['images', 'videos', 'audio', 'documents']),
        returnFormat: options.returnFormat || 'urls',
        extractThumbnails: options.generateThumbnails !== false,
        saveToFirebase: true,
        generateDownloadUrls: true,
        includeMetadata: true,
        includeTransforms: true,
        includeStyles: true,
        firebaseFolder: `extracted-assets/${requestId}`,
        makePublic: false
      });
      
      logger.info('Asset extraction completed successfully', { 
        requestId, 
        totalAssets: assets.length,
        realDataExtracted: true
      });

      const summary = {
        totalAssets: assets.length,
        byType: {
          images: assets.filter((a: any) => a.type === 'image').length,
          videos: assets.filter((a: any) => a.type === 'video').length,
          audio: assets.filter((a: any) => a.type === 'audio').length,
          documents: assets.filter((a: any) => a.type === 'document').length,
          shapes: assets.filter((a: any) => a.type === 'shape').length,
          charts: assets.filter((a: any) => a.type === 'chart').length,
        },
        totalSize: assets.reduce((sum: number, asset: any) => sum + (asset.size || 0), 0),
        avgSize: assets.length > 0 ? Math.round(assets.reduce((sum: number, asset: any) => sum + (asset.size || 0), 0) / assets.length) : 0,
        extractionMethod: 'AssetServiceRefactored',
        dataSource: 'real-aspose-slides',
        firebaseIntegration: true,
        noFallbacks: true
      };

      res.status(200).json({
        success: true,
        data: {
          assets,
          summary,
          capabilities: {
            realDataOnly: true,
            comprehensiveMetadata: true,
            firebaseStorage: true,
            thumbnailGeneration: true,
            detailedTransforms: true,
            qualityAnalysis: true,
            asposeIntegration: true,
            noMockData: true,
            noPlaceholders: true
          }
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
          processingTimeMs: Date.now() - startTime,
          version: '2.0-production',
          serviceType: 'AssetServiceRefactored',
          dataPolicy: 'real-data-only'
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
      // Real metadata extraction using AssetServiceRefactored
      const metadata = await assetService.extractMetadata(tempFilePath, {
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
          version: '2.0-production',
          serviceType: 'AssetServiceRefactored',
          dataPolicy: 'real-data-only'
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
 * Asset Metadata Extraction Controller - Real implementation using AssetServiceRefactored
 */
const extractAssetMetadataController = async (req: Request, res: Response): Promise<void> => {
  const requestId = req.requestId || `req_${Date.now()}`;
  const startTime = Date.now();

  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        error: {
          type: 'validation_error',
          code: 'FILE_REQUIRED',
          message: 'PPTX file is required for asset metadata extraction',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
          processingTimeMs: Date.now() - startTime,
        },
      });
      return;
    }

    if (!assetService) {
      res.status(503).json({
        success: false,
        error: {
          type: 'service_unavailable',
          code: 'FIREBASE_NOT_CONFIGURED',
          message: 'Asset metadata extraction requires Firebase configuration. Please configure Firebase to use this feature.',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
          processingTimeMs: Date.now() - startTime,
        },
      });
      return;
    }
    
    // Save uploaded file temporarily
    const fs = require('fs/promises');
    const path = require('path');
    const tempDir = './temp/asset-metadata';
    await fs.mkdir(tempDir, { recursive: true });
    
    const tempFilePath = path.join(tempDir, `${requestId}_${req.file.originalname}`);
    await fs.writeFile(tempFilePath, req.file.buffer);

    try {
      logger.info('Extracting comprehensive asset metadata using AssetServiceRefactored', { requestId });
      
      // Extract assets with comprehensive metadata
      const assets = await assetService.extractAssets(tempFilePath, {
        assetTypes: ['image', 'video', 'audio', 'document', 'shape', 'chart'],
        returnFormat: 'buffers', // Get raw data for metadata analysis
        extractThumbnails: false, // Focus on metadata, not thumbnails
        saveToFirebase: false, // Don't save, just extract metadata
        includeMetadata: true,
        includeTransforms: true,
        includeStyles: true,
        extractCustomProperties: true
      });

      // Organize metadata by asset type and slide
      const metadataBySlide: Record<number, any> = {};
      const metadataByType: Record<string, any[]> = {
        image: [],
        video: [],
        audio: [],
        document: [],
        shape: [],
        chart: []
      };

      assets.forEach((asset: any) => {
        // Group by slide
        if (!metadataBySlide[asset.slideIndex]) {
          metadataBySlide[asset.slideIndex] = {
            slideIndex: asset.slideIndex,
            assets: [],
            totalAssets: 0,
            totalSize: 0
          };
        }
        
        metadataBySlide[asset.slideIndex].assets.push({
          id: asset.id,
          type: asset.type,
          format: asset.format,
          filename: asset.filename,
          size: asset.size,
          metadata: asset.metadata
        });
        metadataBySlide[asset.slideIndex].totalAssets++;
        metadataBySlide[asset.slideIndex].totalSize += asset.size;

        // Group by type
        if (metadataByType[asset.type]) {
          metadataByType[asset.type].push({
            id: asset.id,
            slideIndex: asset.slideIndex,
            format: asset.format,
            filename: asset.filename,
            size: asset.size,
            metadata: asset.metadata
          });
        }
      });

      // Generate comprehensive statistics
      const statistics = {
        overview: {
          totalAssets: assets.length,
          totalSize: assets.reduce((sum: number, asset: any) => sum + asset.size, 0),
          avgSize: assets.length > 0 ? Math.round(assets.reduce((sum: number, asset: any) => sum + asset.size, 0) / assets.length) : 0,
          slidesWithAssets: Object.keys(metadataBySlide).length,
          extractionMethod: 'AssetServiceRefactored'
        },
        byType: Object.keys(metadataByType).reduce((acc: Record<string, any>, type: string) => {
          const typeAssets = metadataByType[type];
          acc[type] = {
            count: typeAssets.length,
            totalSize: typeAssets.reduce((sum: number, asset: any) => sum + asset.size, 0),
            avgSize: typeAssets.length > 0 ? Math.round(typeAssets.reduce((sum: number, asset: any) => sum + asset.size, 0) / typeAssets.length) : 0,
            formats: [...new Set(typeAssets.map((asset: any) => asset.format))]
          };
          return acc;
        }, {} as Record<string, any>),
        quality: {
          hasTransformData: assets.some((a: any) => a.metadata.transform),
          hasStyleData: assets.some((a: any) => a.metadata.style),
          hasQualityData: assets.some((a: any) => a.metadata.quality),
          hasCustomProperties: assets.some((a: any) => a.metadata.customProperties),
          avgProcessingTime: assets.length > 0 ? Math.round(assets.reduce((sum: number, asset: any) => sum + (asset.metadata.processingTimeMs || 0), 0) / assets.length) : 0
        }
      };

      res.status(200).json({
        success: true,
        data: {
          overview: statistics.overview,
          metadataBySlide: Object.values(metadataBySlide),
          metadataByType,
          statistics,
          capabilities: {
            comprehensiveMetadata: true,
            transformAnalysis: true,
            styleAnalysis: true,
            qualityAnalysis: true,
            customProperties: true,
            aspose_integration: true
          }
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
          processingTimeMs: Date.now() - startTime,
          version: '2.0-refactored',
          serviceType: 'AssetServiceRefactored'
        },
      });

      // Clean up temp file
      await fs.unlink(tempFilePath).catch(() => {});

    } catch (extractionError) {
      await fs.unlink(tempFilePath).catch(() => {});
      throw extractionError;
    }

  } catch (error) {
    logger.error('Asset metadata extraction failed', { error, requestId });
    res.status(500).json({
      success: false,
      error: {
        type: 'extraction_error',
        code: 'ASSET_METADATA_EXTRACTION_FAILED',
        message: error instanceof Error ? error.message : 'Asset metadata extraction failed',
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
        processingTimeMs: Date.now() - startTime,
      },
    });
  }
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
 *     summary: Extract embedded assets from presentation (Enhanced with AssetServiceRefactored)
 *     description: |
 *       Extract embedded assets from PowerPoint presentations using advanced AssetServiceRefactored.
 *       
 *       **Features:**
 *       - Supports images, videos, audio, documents, shapes, and charts
 *       - Firebase Storage integration (when configured)
 *       - Comprehensive metadata extraction
 *       - Thumbnail generation and quality analysis
 *       - Transform and style analysis
 *       - Fallback to legacy extraction when Firebase not configured
 *       
 *       **Asset Types:** image, video, audio, document, shape, chart
 *       **Return Formats:** urls, firebase-urls, base64, buffers
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
 *                 example: '{"assetTypes":["image","video","audio"],"generateThumbnails":true}'
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
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalAssets:
 *                           type: integer
 *                         byType:
 *                           type: object
 *                         totalSize:
 *                           type: integer
 *                         hasFirebaseStorage:
 *                           type: boolean
 *                         extractionMethod:
 *                           type: string
 *                           enum: [AssetServiceRefactored, legacy]
 *                     extractionStats:
 *                       type: object
 *                       properties:
 *                         comprehensiveMetadata:
 *                           type: boolean
 *                         firebaseStorage:
 *                           type: boolean
 *                         thumbnailGeneration:
 *                           type: boolean
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
 *     summary: Extract comprehensive metadata from embedded assets
 *     description: |
 *       Extract detailed metadata from embedded assets within presentations using AssetServiceRefactored.
 *       Provides comprehensive metadata including transforms, styles, quality metrics, and custom properties.
 *       Requires Firebase configuration for full functionality.
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
 *                 description: PPTX file to process for asset metadata extraction
 *             required:
 *               - file
 *     responses:
 *       200:
 *         description: Asset metadata extracted successfully
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
 *                     overview:
 *                       type: object
 *                       properties:
 *                         totalAssets:
 *                           type: integer
 *                         totalSize:
 *                           type: integer
 *                         avgSize:
 *                           type: integer
 *                         slidesWithAssets:
 *                           type: integer
 *                     metadataBySlide:
 *                       type: array
 *                       items:
 *                         type: object
 *                     metadataByType:
 *                       type: object
 *                     statistics:
 *                       type: object
 *                     capabilities:
 *                       type: object
 *       503:
 *         description: Firebase not configured - feature requires Firebase setup
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/extract-asset-metadata', largeFileUpload.single('file'), validateUploadWithTiers, handleAsyncErrors(extractAssetMetadataController), handleUploadError);

export default router; 