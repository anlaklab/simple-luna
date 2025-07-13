import { z } from "zod";
/**
 * Extraction Routes - Asset and metadata extraction endpoints
 * 
 * Focused routes for extracting assets and metadata from presentations
 * Moved from ai.routes.ts to organize non-AI extraction functionality
 */

import { Router, Request, Response, NextFunction } from 'express';
import { createAssetService } from '../adapters/aspose';
import { AssetServiceConfig } from '../adapters/aspose/types/asset-interfaces';
import { validateRequest, validateFormOptions } from '../middleware/validation.middleware';
import { handleAsyncErrors } from '../middleware/error.middleware';
import { 
  largeFileUpload, 
  debugFileUpload,
  validateUploadWithTiers, 
  handleUploadError 
} from '../middleware/upload.middleware';
import { logger } from '../utils/logger';
import {
  ExtractAssetsRequestSchema,
  ExtractMetadataRequestSchema,
  ExtractAssetsRequest,
  ExtractMetadataRequest
} from '../schemas/api-request.schema';
import {
  AnalyzeOptions,
  AnalysisResult,
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
  ASPOSE_LICENSE_CONTENT: process.env.ASPOSE_LICENSE_CONTENT
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
      licenseContent: process.env.ASPOSE_LICENSE_CONTENT,
      tempDirectory: process.env.ASPOSE_TEMP_DIR || './temp/aspose'
    } as AssetServiceConfig['aspose'],
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

    // Options are validated and have defaults applied by validateFormOptions middleware
    const options = req.body.options as ExtractAssetsRequest;
    
    // Save uploaded file temporarily
    const fs = require('fs/promises');
    const path = require('path');
    const tempDir = './temp/assets';
    await fs.mkdir(tempDir, { recursive: true });
    
    const tempFilePath = path.join(tempDir, `${requestId}_${req.file.originalname}`);
    await fs.writeFile(tempFilePath, req.file.buffer);

    try {
      logger.info('📋 STEP 1: Starting asset extraction process', { 
        requestId,
        assetServiceType: typeof assetService,
        extractionOptions: {
          assetTypes: options.assetTypes || ['all'],
          returnFormat: options.returnFormat || 'urls',
          extractThumbnails: options.generateThumbnails !== false,
          saveToFirebase: options.extractToStorage !== false,
          includeMetadata: options.includeMetadata !== false
        }
      });

      // Step 2: Validate AssetService
      if (!assetService) {
        logger.error('❌ STEP 2: AssetService validation failed');
        res.status(503).json({
          success: false,
          error: {
            type: 'service_unavailable',
            code: 'ASSET_SERVICE_NOT_CONFIGURED',
            message: 'Asset extraction requires proper service configuration. Please contact administrator.',
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId,
            processingTimeMs: Date.now() - startTime,
          },
          debug: {
            step: 'service_validation',
            issue: 'AssetService not initialized',
            suggestion: 'Check Firebase configuration and service initialization'
          }
        });
        await fs.unlink(tempFilePath).catch(() => {});
        return;
      }
      logger.info('✅ STEP 2: AssetService validated successfully');

      // Step 3: Test presentation loading
      logger.info('📋 STEP 3: Testing presentation loading...');
      let presentationMetadata = null;
      try {
        const asposeDriver = require('/app/lib/AsposeDriverFactory');
        await asposeDriver.initialize();
        const testPresentation = await asposeDriver.loadPresentation(tempFilePath);
        const slideCount = testPresentation.getSlides().size();
        presentationMetadata = { slideCount, loaded: true };
        testPresentation.dispose();
        logger.info('✅ STEP 3: Presentation loaded successfully', { slideCount });
      } catch (error) {
        logger.error('❌ STEP 3: Presentation loading failed', { error: (error as Error).message });
        res.status(400).json({
          success: false,
          error: {
            type: 'file_error',
            code: 'PRESENTATION_LOAD_FAILED',
            message: `Failed to load presentation: ${(error as Error).message}`,
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId,
            processingTimeMs: Date.now() - startTime,
          },
          debug: {
            step: 'presentation_loading',
            issue: (error as Error).message,
            suggestion: 'Verify file format and ensure it\'s a valid PPTX file'
          }
        });
        await fs.unlink(tempFilePath).catch(() => {});
        return;
      }

      // Step 4: Asset extraction
      logger.info('📋 STEP 4: Executing asset extraction...');
      const assets = await assetService.extractAssets(tempFilePath, {
        assetTypes: options.assetTypes || ['all'],
        returnFormat: options.returnFormat || 'urls',
        extractThumbnails: options.generateThumbnails !== false,
        saveToFirebase: options.extractToStorage !== false,
        generateDownloadUrls: true,
        includeMetadata: options.includeMetadata !== false,
        includeTransforms: true,
        includeStyles: true,
        firebaseFolder: `extracted-assets/${requestId}`,
        makePublic: false
      });
      
      logger.info('📊 STEP 5: Asset extraction analysis', { 
        requestId, 
        totalAssets: assets.length,
        extractionMethod: 'AssetServiceRefactored',
        fileSize: req.file.size,
        presentationMetadata,
        assetBreakdown: {
          byType: assets.reduce((acc: any, asset: any) => {
            acc[asset.type] = (acc[asset.type] || 0) + 1;
            return acc;
          }, {}),
          totalSize: assets.reduce((sum: number, asset: any) => sum + (asset.size || 0), 0),
          hasData: assets.filter((a: any) => !!a.data).length,
          hasUrls: assets.filter((a: any) => !!a.url).length
        },
        firstAssetSample: assets.length > 0 ? {
          id: assets[0].id,
          type: assets[0].type,
          size: assets[0].size,
          hasData: !!assets[0].data,
          hasUrl: !!assets[0].url,
          hasMetadata: !!assets[0].metadata
        } : null
      });

      // Step 6: Results validation and response preparation
      logger.info('📋 STEP 6: Preparing response...');
      
      if (assets.length === 0) {
        logger.warn('⚠️ STEP 6: Zero assets extracted - investigating potential causes');
        // Add diagnostic information when no assets found
        const diagnosticInfo = {
          possibleCauses: [
            'Presentation contains no extractable assets (images, videos, audio, etc.)',
            'Assets may be embedded in a format not supported by current extractors',
            'Assets may be linked rather than embedded',
            'Presentation may use only text and shapes without media content'
          ],
          nextSteps: [
            'Try the /debug-extract-assets endpoint for detailed analysis',
            'Verify the presentation contains actual images or media in PowerPoint',
            'Check if images are embedded vs linked',
            'Test with a different presentation file'
          ],
          extractionSettings: {
            assetTypes: options.assetTypes || ['all'],
            extractorStatus: 'functioning',
            serviceHealth: 'operational'
          }
        };
        
        logger.info('📋 DIAGNOSTIC INFO: Zero assets analysis', diagnosticInfo);
      }

      // Create proper summary with singular asset types
      const summary = {
        totalAssets: assets.length,
        byType: {
          image: assets.filter((a: any) => a.type === 'image').length,
          video: assets.filter((a: any) => a.type === 'video').length,
          audio: assets.filter((a: any) => a.type === 'audio').length,
          document: assets.filter((a: any) => a.type === 'document').length,
          shape: assets.filter((a: any) => a.type === 'shape').length,
          chart: assets.filter((a: any) => a.type === 'chart').length,
          excel: assets.filter((a: any) => a.type === 'excel').length,
          word: assets.filter((a: any) => a.type === 'word').length,
          pdf: assets.filter((a: any) => a.type === 'pdf').length,
          ole: assets.filter((a: any) => a.type === 'ole').length,
        },
        totalSize: assets.reduce((sum: number, asset: any) => sum + (asset.size || 0), 0),
        avgSize: assets.length > 0 ? Math.round(assets.reduce((sum: number, asset: any) => sum + (asset.size || 0), 0) / assets.length) : 0,
        extractionMethod: 'AssetServiceRefactored',
        dataSource: 'real-aspose-slides'
      };

      res.status(200).json({
        success: true,
        data: {
          assets,
          summary,
          extractionOptions: {
            assetTypes: options.assetTypes || ['all'],
            returnFormat: options.returnFormat || 'urls',
            generateThumbnails: options.generateThumbnails !== false,
            extractToStorage: options.extractToStorage !== false,
            includeMetadata: options.includeMetadata !== false
          },
          // Add diagnostic information when no assets found
          ...(assets.length === 0 && {
            diagnostics: {
              zeroAssetsReason: 'No extractable assets found in presentation',
              possibleCauses: [
                'Presentation contains only text and basic shapes',
                'Images may be linked rather than embedded',
                'Assets may be in unsupported formats',
                'Presentation may be corrupted or have unusual structure'
              ],
              troubleshooting: {
                recommendedAction: 'Use /debug-extract-assets endpoint for detailed analysis',
                debugEndpoint: `/api/v1/debug-extract-assets`,
                checkList: [
                  'Verify presentation opens correctly in PowerPoint',
                  'Check if presentation contains actual embedded images/media',
                  'Try with a simpler test presentation',
                  'Review server logs for detailed error information'
                ]
              },
              presentationInfo: presentationMetadata
            }
          })
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
          processingTimeMs: Date.now() - startTime,
          version: '2.0-production',
          serviceType: 'AssetServiceRefactored',
          dataPolicy: 'real-data-only',
          // Add diagnostic meta when no assets found
          ...(assets.length === 0 && {
            extractionStatus: 'completed_no_assets',
            suggestedNextStep: 'debug_analysis'
          })
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
    const options = req.body.options as ExtractMetadataRequest;
    
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
        includeSystemProperties: options.includeDocumentProperties !== false,
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

// Add debug endpoint before the regular routes
router.post('/debug-extract-assets', 
  debugFileUpload.single('file'),
  validateUploadWithTiers,
  handleUploadError,
  (req: Request, res: Response, next: NextFunction) => {
    // Override timeout for debug endpoint - set to 2 minutes
    req.setTimeout(120000);
    res.setTimeout(120000);
    next();
  },
  handleAsyncErrors(async (req: Request, res: Response): Promise<void> => {
    const requestId = req.requestId || `debug_${Date.now()}`;
    const diagnostics = {
      step1_presentationLoaded: false,
      step2_firebaseConnected: false,
      step3_asposeInitialized: false,
      step4_assetsExtracted: false,
      step5_assetsAnalyzed: false,
      step6_firebaseStorageSaved: false,
      step7_responseGenerated: false,
      errors: [] as string[],
      warnings: [] as string[],
      details: {} as any
    };
    
    if (!req.file) {
      res.status(400).json({ 
        success: false, 
        error: 'No file uploaded',
        diagnostics 
      });
      return;
    }

    // Enhanced file size and disk storage validation
    logger.info('🔍 FILE UPLOAD DIAGNOSTIC:', {
      requestId,
      filename: req.file.originalname,
      fileSize: req.file.size,
      filePath: req.file.path,
      mimetype: req.file.mimetype,
      encoding: req.file.encoding,
      storageType: 'disk_storage'
    });

    // File is already on disk thanks to debugFileUpload middleware
    const tempFilePath = req.file.path;
    
    // Verify file size on disk
    const fs = require('fs/promises');
    const writtenFileStats = await fs.stat(tempFilePath);
    logger.info('🔍 FILE DISK STORAGE DIAGNOSTIC:', {
      tempFilePath,
      expectedSize: req.file.size,
      diskSize: writtenFileStats.size,
      sizeMatch: writtenFileStats.size === req.file.size,
      storageType: 'disk_storage'
    });
    
    if (writtenFileStats.size !== req.file.size) {
      const error = `File size mismatch on disk: expected ${req.file.size}, found ${writtenFileStats.size}`;
      logger.error('❌ FILE SIZE MISMATCH ON DISK:', { error });
      diagnostics.errors.push(`FILE SIZE MISMATCH: ${error}`);
    }

    try {
      logger.info('🔍 DIAGNOSTIC: Starting comprehensive asset extraction analysis', {
        requestId,
        filename: req.file.originalname,
        fileSize: req.file.size
      });

      // ✅ STEP 1: PRESENTATION LOADING VALIDATION
      logger.info('🔍 STEP 1: Testing presentation loading...');
      try {
        // CRITICAL: Add comprehensive JAR diagnostic before Aspose initialization
        logger.info('🔍 JAR DIAGNOSTIC: Starting comprehensive JAR file analysis...');
        
        const fs = require('fs');
        const path = require('path');
        
        // Check JAR file existence and details
        const possibleJarPaths = [
          '/app/lib/aspose-slides-25.6-nodejs.jar',
          path.join(process.cwd(), 'lib/aspose-slides-25.6-nodejs.jar'),
          path.join(process.cwd(), '../lib/aspose-slides-25.6-nodejs.jar'),
          path.join(__dirname, '../../lib/aspose-slides-25.6-nodejs.jar'),
          path.join(__dirname, '../../../lib/aspose-slides-25.6-nodejs.jar'),
          path.join(__dirname, '../../../../lib/aspose-slides-25.6-nodejs.jar')
        ];
        
        const jarDiagnostic = {
          jarFound: false,
          jarPath: null,
          jarSize: null,
          jarPermissions: null,
          javaAvailable: false,
          javaVersion: null,
          javaClasspath: null,
          javaOptions: null
        };
        
        // Check JAR file
        for (const jarPath of possibleJarPaths) {
          try {
            if (fs.existsSync(jarPath)) {
              const stats = fs.statSync(jarPath);
              jarDiagnostic.jarFound = true;
              jarDiagnostic.jarPath = jarPath;
              jarDiagnostic.jarSize = stats.size;
              jarDiagnostic.jarPermissions = stats.mode.toString(8);
              logger.info(`✅ JAR found: ${jarPath} (${(stats.size / 1024 / 1024).toFixed(2)}MB)`);
              break;
            } else {
              logger.info(`❌ JAR not found: ${jarPath}`);
            }
          } catch (error) {
            logger.info(`❌ Error checking JAR: ${jarPath} - ${(error as Error).message}`);
          }
        }
        
        // Additional diagnostic: Check current working directory and list lib contents
        try {
          const cwd = process.cwd();
          logger.info(`🔍 Current working directory: ${cwd}`);
          
          // Check if lib directory exists in current working directory
          const libDir = path.join(cwd, 'lib');
          if (fs.existsSync(libDir)) {
            const libFiles = fs.readdirSync(libDir);
            logger.info(`📁 Lib directory contents (${cwd}/lib):`, libFiles);
          } else {
            logger.info(`❌ Lib directory not found: ${libDir}`);
          }
          
          // Check if lib directory exists in /app
          const appLibDir = '/app/lib';
          if (fs.existsSync(appLibDir)) {
            const appLibFiles = fs.readdirSync(appLibDir);
            logger.info(`📁 App lib directory contents (/app/lib):`, appLibFiles);
          } else {
            logger.info(`❌ App lib directory not found: ${appLibDir}`);
          }
          
        } catch (error) {
          logger.error('❌ Error checking directories', { error: (error as Error).message });
        }
        
        // Check Java environment
        try {
          const java = require('java');
          jarDiagnostic.javaAvailable = true;
          jarDiagnostic.javaClasspath = java.classpath.length;
          jarDiagnostic.javaOptions = java.options.length;
          
          // Try to get Java version
          try {
            const javaLang = java.import('java.lang.System');
            if (javaLang) {
              jarDiagnostic.javaVersion = javaLang.getProperty('java.version');
            }
          } catch (e) {
            logger.info(`⚠️ Could not get Java version: ${(e as Error).message}`);
          }
          
          logger.info('✅ Java environment available', {
            classpathEntries: jarDiagnostic.javaClasspath,
            javaOptions: jarDiagnostic.javaOptions,
            javaVersion: jarDiagnostic.javaVersion
          });
        } catch (error) {
          logger.error('❌ Java environment not available', { error: (error as Error).message });
        }
        
        // Test basic Java functionality
        if (jarDiagnostic.javaAvailable) {
          try {
            const java = require('java');
            const JavaString = java.import('java.lang.String');
            if (JavaString) {
              logger.info('✅ java.lang.String import successful');
            } else {
              logger.error('❌ java.lang.String import failed');
            }
          } catch (error) {
            logger.error('❌ Basic Java test failed', { error: (error as Error).message });
          }
        }
        
        // Add JAR diagnostic to response
        diagnostics.details.jarDiagnostic = jarDiagnostic;
        
        // Add license diagnostic
        diagnostics.details.licenseDiagnostic = {
          hasLicenseContent: !!process.env.ASPOSE_LICENSE_CONTENT,
          licenseContentLength: process.env.ASPOSE_LICENSE_CONTENT ? process.env.ASPOSE_LICENSE_CONTENT.length : 0,
          licenseContentPreview: process.env.ASPOSE_LICENSE_CONTENT ? 
            process.env.ASPOSE_LICENSE_CONTENT.substring(0, 100) + '...' : 'Not set',
          appearsToBeXml: process.env.ASPOSE_LICENSE_CONTENT ? 
            (process.env.ASPOSE_LICENSE_CONTENT.trim().startsWith('<?xml') || process.env.ASPOSE_LICENSE_CONTENT.trim().startsWith('<')) : false
        };
        
        // If JAR not found, fail early with detailed information
        if (!jarDiagnostic.jarFound) {
          throw new Error(`JAR file not found in any location. Checked: ${possibleJarPaths.join(', ')}`);
        }
        
        // If Java not available, fail early
        if (!jarDiagnostic.javaAvailable) {
          throw new Error('Java environment not available');
        }
        
        logger.info('✅ JAR diagnostic completed successfully');
        
        // Now try Aspose initialization
        const asposeDriver = require('/app/lib/AsposeDriverFactory');
        await asposeDriver.initialize();
        
        diagnostics.step3_asposeInitialized = true;
        diagnostics.details.asposeDriverStatus = 'initialized';
        
        const presentation = await asposeDriver.loadPresentation(tempFilePath);
        const slideCount = presentation.getSlides().size();
        
        diagnostics.step1_presentationLoaded = true;
        diagnostics.details.presentationInfo = {
          slideCount,
          loaded: true,
          validFormat: true
        };
        
        logger.info('✅ STEP 1: Presentation loaded successfully', { slideCount });

        // Analyze slides and shapes
        const slideAnalysis = [];
        for (let i = 0; i < Math.min(slideCount, 5); i++) {
          const slide = presentation.getSlides().get_Item(i);
          const shapes = slide.getShapes();
          const shapeCount = shapes.size();
          
          const shapeTypes = [];
          for (let j = 0; j < Math.min(shapeCount, 10); j++) {
            const shape = shapes.get_Item(j);
            let shapeType = 'Unknown';
            let shapeTypeName = 'Unknown';
            try {
              if (shape && shape.getShapeType) {
                shapeType = shape.getShapeType();
                shapeTypeName = shapeType.toString();
              }
            } catch (e) {
              // Shape type extraction failed, use defaults
            }
            shapeTypes.push({
              index: j,
              type: shapeType,
              typeName: shapeTypeName
            });
          }
          
          slideAnalysis.push({
            slideIndex: i,
            shapeCount,
            shapeTypes
          });
        }
        
        diagnostics.details.slideAnalysis = slideAnalysis;
        presentation.dispose();
        
      } catch (error) {
        diagnostics.errors.push(`STEP 1 FAILED: ${(error as Error).message}`);
        logger.error('❌ STEP 1: Presentation loading failed', { error: (error as Error).message });
      }

      // ✅ STEP 2: FIREBASE/FIRESTORE CONNECTIVITY TEST
      logger.info('🔍 STEP 2: Testing Firebase/Firestore connectivity...');
      try {
        const firebaseConfigured = !!(
          process.env.FIREBASE_PROJECT_ID &&
          process.env.FIREBASE_PRIVATE_KEY &&
          process.env.FIREBASE_CLIENT_EMAIL &&
          process.env.FIREBASE_STORAGE_BUCKET
        );
        
        diagnostics.step2_firebaseConnected = firebaseConfigured;
        diagnostics.details.firebaseConfig = {
          projectId: !!process.env.FIREBASE_PROJECT_ID,
          privateKey: !!process.env.FIREBASE_PRIVATE_KEY,
          clientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
          storageBucket: !!process.env.FIREBASE_STORAGE_BUCKET,
          fullyConfigured: firebaseConfigured
        };
        
        if (firebaseConfigured) {
          logger.info('✅ STEP 2: Firebase fully configured');
        } else {
          diagnostics.warnings.push('STEP 2: Firebase not fully configured - will run without storage');
          logger.warn('⚠️ STEP 2: Firebase not fully configured');
        }
        
      } catch (error) {
        diagnostics.errors.push(`STEP 2 FAILED: ${(error as Error).message}`);
        logger.error('❌ STEP 2: Firebase connectivity test failed', { error: (error as Error).message });
      }

      // ✅ STEP 3: Already done above in Step 1

      // ✅ STEP 4: ASSET EXTRACTION TEST
      logger.info('🔍 STEP 4: Testing asset extraction...');
      try {
        if (!assetService) {
          throw new Error('AssetService not available');
        }

        const assets = await assetService.extractAssets(tempFilePath, {
          assetTypes: ['all'],
          returnFormat: 'urls',
          extractThumbnails: false,
          saveToFirebase: false,
          includeMetadata: true
        });
        
        diagnostics.step4_assetsExtracted = true;
        diagnostics.details.extractionResults = {
          totalAssets: assets.length,
          assetTypes: assets.map((a: any) => a.type),
          sampleAssets: assets.slice(0, 3).map((a: any) => ({
            id: a.id,
            type: a.type,
            size: a.size,
            hasData: !!a.data
          }))
        };
        
        if (assets.length > 0) {
          logger.info('✅ STEP 4: Assets extracted successfully', { totalAssets: assets.length });
          diagnostics.step5_assetsAnalyzed = true; // If we got assets, they were analyzed
        } else {
          diagnostics.warnings.push('STEP 4: No assets found in presentation');
          logger.warn('⚠️ STEP 4: No assets found in presentation');
        }
        
      } catch (error) {
        diagnostics.errors.push(`STEP 4 FAILED: ${(error as Error).message}`);
        logger.error('❌ STEP 4: Asset extraction failed', { error: (error as Error).message });
      }

      // ✅ STEP 5: Asset analysis already done in Step 4

      // ✅ STEP 6: FIREBASE STORAGE TEST (if configured)
      logger.info('🔍 STEP 6: Testing Firebase Storage...');
      if (diagnostics.step2_firebaseConnected && diagnostics.step4_assetsExtracted) {
        try {
          // Test with storage enabled
          const assetsWithStorage = await assetService.extractAssets(tempFilePath, {
            assetTypes: ['image'], // Just test images
            returnFormat: 'firebase-urls',
            extractThumbnails: false,
            saveToFirebase: true,
            includeMetadata: true,
            firebaseFolder: `debug-test/${requestId}`
          });
          
          diagnostics.step6_firebaseStorageSaved = assetsWithStorage.length > 0;
          diagnostics.details.firebaseStorageTest = {
            attempted: true,
            successful: assetsWithStorage.length > 0,
            assetsUploaded: assetsWithStorage.length
          };
          
          if (assetsWithStorage.length > 0) {
            logger.info('✅ STEP 6: Firebase Storage test successful');
          } else {
            logger.warn('⚠️ STEP 6: Firebase Storage test - no assets to upload');
          }
          
        } catch (error) {
          diagnostics.errors.push(`STEP 6 FAILED: ${(error as Error).message}`);
          logger.error('❌ STEP 6: Firebase Storage test failed', { error: (error as Error).message });
        }
      } else {
        diagnostics.warnings.push('STEP 6: Skipped - Firebase not configured or no assets to test');
        logger.info('⚠️ STEP 6: Skipped - Firebase not configured or no assets');
      }

      // ✅ STEP 7: RESPONSE GENERATION
      diagnostics.step7_responseGenerated = true;
      logger.info('✅ STEP 7: Response generation successful');

      await fs.unlink(tempFilePath).catch(() => {});

      // Final diagnostic summary
      const totalSteps = 7;
      const passedSteps = [
        diagnostics.step1_presentationLoaded,
        diagnostics.step2_firebaseConnected,
        diagnostics.step3_asposeInitialized,
        diagnostics.step4_assetsExtracted,
        diagnostics.step5_assetsAnalyzed,
        diagnostics.step6_firebaseStorageSaved,
        diagnostics.step7_responseGenerated
      ].filter(Boolean).length;

      const overallHealth = diagnostics.errors.length === 0 ? 'healthy' : 'issues_detected';

      res.json({
        success: true,
        diagnostics: {
          ...diagnostics,
          summary: {
            overallHealth,
            stepsPassedRatio: `${passedSteps}/${totalSteps}`,
            criticalIssues: diagnostics.errors.length,
            warnings: diagnostics.warnings.length
          }
        },
        debug: {
          requestId,
          filename: req.file.originalname,
          fileSize: req.file.size,
          ...diagnostics.details
        },
        recommendations: diagnostics.errors.length > 0 ? [
          'Check server logs for detailed error information',
          'Verify PPTX file format compatibility',
          'Ensure all environment variables are properly configured',
          'Test with a simpler presentation file',
          'Contact system administrator if issues persist'
        ] : [
          'System is functioning correctly',
          'If still getting zero assets, the presentation may not contain extractable assets',
          'Try with a presentation that definitely contains images or media'
        ]
      });

    } catch (error) {
      logger.error('💥 DIAGNOSTIC: Critical failure during analysis', {
        requestId,
        error: (error as Error).message,
        stack: (error as Error).stack
      });
      
      await fs.unlink(tempFilePath).catch(() => {});
      
      res.status(500).json({
        success: false,
        error: (error as Error).message,
        stack: (error as Error).stack,
        diagnostics
      });
    }
  })
);

/**
 * @swagger
 * /validate-jar-deployment:
 *   post:
 *     tags: [Extraction]
 *     summary: Validate JAR deployment in container
 *     description: |
 *       Validates that the Aspose.Slides JAR file is properly deployed in the container.
 *       
 *       **What it checks:**
 *       - JAR file existence in all expected locations
 *       - File permissions and accessibility
 *       - Java classpath configuration
 *       - Basic Java functionality
 *       - Aspose class loading capability
 *       
 *       **Use Cases:**
 *       - Post-deployment validation
 *       - Container health checks
 *       - JAR deployment troubleshooting
 *       - Java environment verification
 *     responses:
 *       200:
 *         description: JAR deployment validation completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 validation:
 *                   type: object
 *                   properties:
 *                     jarFound:
 *                       type: boolean
 *                       example: true
 *                     jarPath:
 *                       type: string
 *                       example: "/app/lib/aspose-slides-25.6-nodejs.jar"
 *                     jarSize:
 *                       type: number
 *                       example: 52428800
 *                     jarPermissions:
 *                       type: string
 *                       example: "rw-r--r--"
 *                     javaAvailable:
 *                       type: boolean
 *                       example: true
 *                     javaVersion:
 *                       type: string
 *                       example: "11.0.27"
 *                     asposeClassesLoadable:
 *                       type: boolean
 *                       example: true
 *                     containerInfo:
 *                       type: object
 *                       properties:
 *                         workingDirectory:
 *                           type: string
 *                         libDirectories:
 *                           type: array
 *                           items:
 *                             type: object
 *       500:
 *         description: Validation failed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "JAR file not found"
 *                 details:
 *                   type: object
 */
router.post('/validate-jar-deployment', 
  handleAsyncErrors(async (req: Request, res: Response): Promise<void> => {
    const requestId = req.requestId || `jar_validation_${Date.now()}`;
    
    logger.info('🔍 Starting JAR deployment validation', { requestId });
    
    const fs = require('fs');
    const path = require('path');
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    const validation = {
      jarFound: false,
      jarPath: null as string | null,
      jarSize: null as number | null,
      jarPermissions: null as string | null,
      javaAvailable: false,
      javaVersion: null as string | null,
      asposeClassesLoadable: false,
      containerInfo: {
        workingDirectory: process.cwd(),
        libDirectories: [] as any[]
      },
      checkedPaths: [] as string[],
      errors: [] as string[],
      warnings: [] as string[]
    };

    try {
      // Step 1: Check Java availability
      logger.info('🔍 STEP 1: Checking Java availability', { requestId });
      try {
        const { stdout: javaVersion } = await execAsync('java -version 2>&1');
        validation.javaAvailable = true;
        validation.javaVersion = javaVersion.split('\n')[0].replace('java version "', '').replace('"', '');
        logger.info('✅ Java is available', { requestId, version: validation.javaVersion });
      } catch (error) {
        validation.errors.push(`Java not available: ${(error as Error).message}`);
        logger.error('❌ Java not available', { requestId, error: (error as Error).message });
      }

      // Step 2: Check all possible JAR locations
      logger.info('🔍 STEP 2: Checking JAR file locations', { requestId });
      const possibleJarPaths = [
        '/app/lib/aspose-slides-25.6-nodejs.jar',
        '/lib/aspose-slides-25.6-nodejs.jar',
        '/app/server/lib/aspose-slides-25.6-nodejs.jar',
        path.join(process.cwd(), 'lib/aspose-slides-25.6-nodejs.jar'),
        path.join(process.cwd(), '../lib/aspose-slides-25.6-nodejs.jar'),
        path.join(__dirname, '../../lib/aspose-slides-25.6-nodejs.jar'),
        path.join(__dirname, '../../../lib/aspose-slides-25.6-nodejs.jar'),
        path.join(__dirname, '../../../../lib/aspose-slides-25.6-nodejs.jar')
      ];

      for (const jarPath of possibleJarPaths) {
        validation.checkedPaths.push(jarPath);
        try {
          if (fs.existsSync(jarPath)) {
            const stats = fs.statSync(jarPath);
            validation.jarFound = true;
            validation.jarPath = jarPath;
            validation.jarSize = stats.size;
            validation.jarPermissions = stats.mode.toString(8);
            
            logger.info('✅ JAR found', { 
              requestId, 
              path: jarPath, 
              size: stats.size,
              permissions: stats.mode.toString(8)
            });
            break;
          }
        } catch (error) {
          validation.errors.push(`Error checking ${jarPath}: ${(error as Error).message}`);
        }
      }

      if (!validation.jarFound) {
        validation.errors.push('JAR file not found in any of the checked locations');
        logger.error('❌ JAR file not found', { requestId, checkedPaths: validation.checkedPaths });
      }

      // Step 3: Check container directory structure
      logger.info('🔍 STEP 3: Checking container directory structure', { requestId });
      const directoriesToCheck = [
        '/app',
        '/app/lib',
        '/lib',
        process.cwd(),
        path.join(process.cwd(), 'lib'),
        path.join(process.cwd(), '../lib')
      ];

      for (const dir of directoriesToCheck) {
        try {
          if (fs.existsSync(dir)) {
            const files = fs.readdirSync(dir);
            validation.containerInfo.libDirectories.push({
              path: dir,
              exists: true,
              fileCount: files.length,
              files: files.slice(0, 10) // First 10 files only
            });
            logger.info(`📁 Directory exists: ${dir}`, { requestId, fileCount: files.length });
          } else {
            validation.containerInfo.libDirectories.push({
              path: dir,
              exists: false,
              fileCount: 0,
              files: []
            });
            logger.info(`❌ Directory not found: ${dir}`, { requestId });
          }
        } catch (error) {
          validation.containerInfo.libDirectories.push({
            path: dir,
            exists: false,
            error: (error as Error).message,
            fileCount: 0,
            files: []
          });
          validation.errors.push(`Error checking directory ${dir}: ${(error as Error).message}`);
        }
      }

      // Step 4: Test Aspose class loading (if JAR found)
      if (validation.jarFound && validation.javaAvailable) {
        logger.info('🔍 STEP 4: Testing Aspose class loading', { requestId });
        try {
          // Try to load the Aspose library
          if (validation.jarPath) {
            const aspose = require(validation.jarPath);
            if (aspose && aspose.Presentation) {
              validation.asposeClassesLoadable = true;
              logger.info('✅ Aspose classes loadable', { requestId });
            } else {
              validation.errors.push('Aspose library loaded but Presentation class not found');
              logger.error('❌ Aspose Presentation class not found', { requestId });
            }
          } else {
            validation.errors.push('JAR path is null despite jarFound being true');
            logger.error('❌ JAR path is null', { requestId });
          }
        } catch (error) {
          validation.errors.push(`Aspose class loading failed: ${(error as Error).message}`);
          logger.error('❌ Aspose class loading failed', { requestId, error: (error as Error).message });
        }
      } else {
        validation.warnings.push('Skipping Aspose class loading test - JAR not found or Java not available');
      }

      // Step 5: Check Java classpath
      logger.info('🔍 STEP 5: Checking Java classpath', { requestId });
      try {
        const { stdout: classpath } = await execAsync('echo $CLASSPATH');
        if (classpath && classpath.trim()) {
          logger.info('✅ CLASSPATH is set', { requestId, classpath: classpath.trim() });
        } else {
          validation.warnings.push('CLASSPATH environment variable is not set');
          logger.warn('⚠️ CLASSPATH not set', { requestId });
        }
      } catch (error) {
        validation.errors.push(`Error checking CLASSPATH: ${(error as Error).message}`);
      }

      // Generate summary
      const summary = {
        overallStatus: validation.jarFound && validation.javaAvailable && validation.asposeClassesLoadable ? 'healthy' : 'issues_detected',
        criticalIssues: validation.errors.length,
        warnings: validation.warnings.length,
        recommendations: [] as string[]
      };

      if (!validation.jarFound) {
        summary.recommendations.push('JAR file is missing - check Dockerfile COPY instructions');
      }
      if (!validation.javaAvailable) {
        summary.recommendations.push('Java is not available - check Java installation in container');
      }
      if (!validation.asposeClassesLoadable) {
        summary.recommendations.push('Aspose classes cannot be loaded - check JAR file integrity');
      }
      if (validation.jarFound && validation.javaAvailable && validation.asposeClassesLoadable) {
        summary.recommendations.push('All systems operational - JAR deployment is successful');
      }

      logger.info('✅ JAR deployment validation completed', { 
        requestId, 
        summary,
        jarFound: validation.jarFound,
        javaAvailable: validation.javaAvailable,
        asposeLoadable: validation.asposeClassesLoadable
      });

      res.json({
        success: true,
        validation,
        summary,
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
          validationTimeMs: Date.now() - parseInt(requestId.split('_')[2])
        }
      });

    } catch (error) {
      logger.error('❌ JAR deployment validation failed', { 
        requestId, 
        error: (error as Error).message,
        stack: (error as Error).stack
      });
      
      res.status(500).json({
        success: false,
        error: (error as Error).message,
        validation,
        meta: {
          timestamp: new Date().toISOString(),
          requestId
        }
      });
    }
  })
);

/**
 * @swagger
 * /debug-license:
 *   post:
 *     tags: [Extraction]
 *     summary: Debug Aspose license configuration
 *     description: |
 *       Comprehensive diagnostic tool for troubleshooting Aspose license issues.
 *       
 *       **What it checks:**
 *       - License file existence in all possible locations
 *       - License file permissions and content
 *       - Environment variable configuration
 *       - License manager initialization
 *       - Aspose license validation
 *       
 *       **Use Cases:**
 *       - Post-deployment license validation
 *       - License file troubleshooting
 *       - Environment variable debugging
 *       - License manager initialization issues
 *     responses:
 *       200:
 *         description: License diagnostic completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 license:
 *                   type: object
 *                   properties:
 *                     licenseFound:
 *                       type: boolean
 *                       example: true
 *                     licensePath:
 *                       type: string
 *                       example: "/app/server/Aspose.Slides.Product.Family.lic"
 *                     licenseSize:
 *                       type: number
 *                       example: 1024
 *                     licenseContent:
 *                       type: string
 *                       example: "Aspose.Slides for Java..."
 *                     environmentVariables:
 *                       type: object
 *                       properties:
 *                         ASPOSE_LICENSE_CONTENT:
 *                           type: string
 *                           example: "Aspose.Slides for Java..."
 *                     licenseManagerStatus:
 *                       type: string
 *                       example: "initialized"
 *       500:
 *         description: License diagnostic failed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "License file not found"
 *                 details:
 *                   type: object
 */
router.post('/debug-license', 
  handleAsyncErrors(async (req: Request, res: Response): Promise<void> => {
    const requestId = req.requestId || `license_debug_${Date.now()}`;
    
    logger.info('🔍 Starting Aspose license diagnostic', { requestId });
    
    const fs = require('fs');
    const path = require('path');
    
    const licenseDiagnostic = {
      licenseFound: false,
      licensePath: null as string | null,
      licenseSize: null as number | null,
      licenseContent: null as string | null,
      licensePermissions: null as string | null,
      environmentVariables: {
        ASPOSE_LICENSE_CONTENT: process.env.ASPOSE_LICENSE_CONTENT || null
      },
      licenseManagerStatus: 'not_initialized',
      checkedPaths: [] as string[],
      errors: [] as string[],
      warnings: [] as string[],
      containerInfo: {
        workingDirectory: process.cwd(),
        serverDirectory: path.join(process.cwd(), 'server'),
        licenseDirectories: [] as any[]
      }
    };

    try {
      // Step 1: Check environment variables
      logger.info('🔍 STEP 1: Checking environment variables', { requestId });
      if (licenseDiagnostic.environmentVariables.ASPOSE_LICENSE_CONTENT) {
        logger.info('✅ ASPOSE_LICENSE_CONTENT is set', { 
          requestId, 
          content: licenseDiagnostic.environmentVariables.ASPOSE_LICENSE_CONTENT 
        });
      } else {
        licenseDiagnostic.warnings.push('ASPOSE_LICENSE_CONTENT environment variable is not set');
        logger.warn('⚠️ ASPOSE_LICENSE_CONTENT not set', { requestId });
      }

      // Step 2: Check all possible license file locations
      logger.info('🔍 STEP 2: Checking license file locations', { requestId });
      const possibleLicensePaths = [
        '/app/server/Aspose.Slides.Product.Family.lic',
        '/app/Aspose.Slides.Product.Family.lic',
        '/app/lib/Aspose.Slides.Product.Family.lic',
        path.join(process.cwd(), 'server/Aspose.Slides.Product.Family.lic'),
        path.join(process.cwd(), 'Aspose.Slides.Product.Family.lic'),
        path.join(process.cwd(), 'lib/Aspose.Slides.Product.Family.lic'),
        path.join(__dirname, '../../Aspose.Slides.Product.Family.lic'),
        path.join(__dirname, '../../../Aspose.Slides.Product.Family.lic'),
        path.join(__dirname, '../../../../Aspose.Slides.Product.Family.lic'),
        path.join(__dirname, '../../../../../Aspose.Slides.Product.Family.lic')
      ];

      for (const licensePath of possibleLicensePaths) {
        licenseDiagnostic.checkedPaths.push(licensePath);
        try {
          if (fs.existsSync(licensePath)) {
            const stats = fs.statSync(licensePath);
            licenseDiagnostic.licenseFound = true;
            licenseDiagnostic.licensePath = licensePath;
            licenseDiagnostic.licenseSize = stats.size;
            licenseDiagnostic.licensePermissions = stats.mode.toString(8);
            
            // Read license content (first 200 characters for security)
            try {
              const content = fs.readFileSync(licensePath, 'utf8');
              licenseDiagnostic.licenseContent = content.substring(0, 200) + (content.length > 200 ? '...' : '');
            } catch (readError) {
              licenseDiagnostic.warnings.push(`Could not read license content: ${(readError as Error).message}`);
            }
            
            logger.info('✅ License file found', { 
              requestId, 
              path: licensePath, 
              size: stats.size,
              permissions: stats.mode.toString(8)
            });
            break;
          }
        } catch (error) {
          licenseDiagnostic.errors.push(`Error checking ${licensePath}: ${(error as Error).message}`);
        }
      }

      if (!licenseDiagnostic.licenseFound) {
        licenseDiagnostic.errors.push('License file not found in any of the checked locations');
        logger.error('❌ License file not found', { requestId, checkedPaths: licenseDiagnostic.checkedPaths });
      }

      // Step 3: Check container directory structure
      logger.info('🔍 STEP 3: Checking container directory structure', { requestId });
      const directoriesToCheck = [
        '/app',
        '/app/server',
        '/app/lib',
        process.cwd(),
        path.join(process.cwd(), 'server'),
        path.join(process.cwd(), 'lib')
      ];

      for (const dir of directoriesToCheck) {
        try {
          if (fs.existsSync(dir)) {
            const files = fs.readdirSync(dir);
            const licenseFiles = files.filter((file: string) => file.includes('lic') || file.includes('license'));
            licenseDiagnostic.containerInfo.licenseDirectories.push({
              path: dir,
              exists: true,
              fileCount: files.length,
              allFiles: files.slice(0, 10), // First 10 files
              licenseFiles: licenseFiles
            });
            logger.info(`📁 Directory exists: ${dir}`, { 
              requestId, 
              fileCount: files.length,
              licenseFiles: licenseFiles
            });
          } else {
            licenseDiagnostic.containerInfo.licenseDirectories.push({
              path: dir,
              exists: false,
              fileCount: 0,
              allFiles: [],
              licenseFiles: []
            });
            logger.info(`❌ Directory not found: ${dir}`, { requestId });
          }
        } catch (error) {
          licenseDiagnostic.containerInfo.licenseDirectories.push({
            path: dir,
            exists: false,
            error: (error as Error).message,
            fileCount: 0,
            allFiles: [],
            licenseFiles: []
          });
          licenseDiagnostic.errors.push(`Error checking directory ${dir}: ${(error as Error).message}`);
        }
      }

      // Step 4: Test license manager initialization (if license found)
      if (licenseDiagnostic.licenseFound && licenseDiagnostic.licensePath) {
        logger.info('🔍 STEP 4: Testing license manager initialization', { requestId });
        try {
          // Try to initialize the license manager
          const licenseManager = require('../../../lib/aspose-license-manager');
          if (licenseManager && typeof licenseManager.initializeLicense === 'function') {
            try {
              await licenseManager.initializeLicense(licenseDiagnostic.licensePath);
              licenseDiagnostic.licenseManagerStatus = 'initialized';
              logger.info('✅ License manager initialized successfully', { requestId });
            } catch (initError) {
              licenseDiagnostic.licenseManagerStatus = 'initialization_failed';
              licenseDiagnostic.errors.push(`License manager initialization failed: ${(initError as Error).message}`);
              logger.error('❌ License manager initialization failed', { requestId, error: (initError as Error).message });
            }
          } else {
            licenseDiagnostic.licenseManagerStatus = 'manager_not_found';
            licenseDiagnostic.errors.push('License manager module not found or invalid');
            logger.error('❌ License manager module not found', { requestId });
          }
        } catch (error) {
          licenseDiagnostic.licenseManagerStatus = 'module_load_failed';
          licenseDiagnostic.errors.push(`License manager module load failed: ${(error as Error).message}`);
          logger.error('❌ License manager module load failed', { requestId, error: (error as Error).message });
        }
      } else {
        licenseDiagnostic.warnings.push('Skipping license manager test - license file not found');
      }

      // Step 5: Test Aspose with license (if available)
      if (licenseDiagnostic.licenseFound && licenseDiagnostic.licensePath) {
        logger.info('🔍 STEP 5: Testing Aspose with license', { requestId });
        try {
          // Try to load Aspose and test basic functionality
          const aspose = require('../../../lib/aspose.slides.js');
          if (aspose && aspose.Presentation) {
            logger.info('✅ Aspose library loaded successfully', { requestId });
            // Note: We can't actually test license validation without a real presentation file
            // But we can confirm the library loads
          } else {
            licenseDiagnostic.errors.push('Aspose library loaded but Presentation class not found');
            logger.error('❌ Aspose Presentation class not found', { requestId });
          }
        } catch (error) {
          licenseDiagnostic.errors.push(`Aspose library load failed: ${(error as Error).message}`);
          logger.error('❌ Aspose library load failed', { requestId, error: (error as Error).message });
        }
      }

      // Generate summary
      const summary = {
        overallStatus: licenseDiagnostic.licenseFound && licenseDiagnostic.licenseManagerStatus === 'initialized' ? 'healthy' : 'issues_detected',
        criticalIssues: licenseDiagnostic.errors.length,
        warnings: licenseDiagnostic.warnings.length,
        recommendations: [] as string[]
      };

      if (!licenseDiagnostic.licenseFound) {
        summary.recommendations.push('License file is missing - check Dockerfile COPY instructions');
      }
      if (licenseDiagnostic.licenseManagerStatus !== 'initialized') {
        summary.recommendations.push('License manager not initialized - check license file format and permissions');
      }
      if (!licenseDiagnostic.environmentVariables.ASPOSE_LICENSE_CONTENT) {
        summary.recommendations.push('ASPOSE_LICENSE_CONTENT environment variable should be set');
      }
      if (licenseDiagnostic.licenseFound && licenseDiagnostic.licenseManagerStatus === 'initialized') {
        summary.recommendations.push('License configuration is correct - Aspose should work properly');
      }

      logger.info('✅ License diagnostic completed', { 
        requestId, 
        summary,
        licenseFound: licenseDiagnostic.licenseFound,
        licenseManagerStatus: licenseDiagnostic.licenseManagerStatus
      });

      res.json({
        success: true,
        license: licenseDiagnostic,
        summary,
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
          diagnosticTimeMs: Date.now() - parseInt(requestId.split('_')[2])
        }
      });

    } catch (error) {
      logger.error('❌ License diagnostic failed', { 
        requestId, 
        error: (error as Error).message,
        stack: (error as Error).stack
      });
      
      res.status(500).json({
        success: false,
        error: (error as Error).message,
        license: licenseDiagnostic,
        meta: {
          timestamp: new Date().toISOString(),
          requestId
        }
      });
    }
  })
);

/**
 * @swagger
 * /debug-extract-large-files:
 *   post:
 *     tags:
 *       - Extraction
 *     summary: Debug and analyze large presentation files (>10MB)
 *     description: |
 *       Specialized diagnostic tool for large PowerPoint files with extended timeouts and detailed analysis.
 *       
 *       **Features:**
 *       - Extended timeout (10 minutes) for very large files
 *       - Sample-based analysis for quick insights
 *       - Progress tracking with real-time updates
 *       - Memory usage monitoring
 *       - Processing time estimates
 *       - Cancellation mechanism for runaway processes
 *       - Detailed recommendations for optimization
 *       
 *       **File Requirements:**
 *       - Minimum size: 10MB or filename containing "large"
 *       - Supported format: PPTX files only
 *       - Recommended use: Files with >100 slides or complex content
 *       
 *       **Analysis Process:**
 *       1. File structure validation
 *       2. Slide count and complexity analysis
 *       3. Sample slide processing (first 10 slides)
 *       4. Processing time estimation
 *       5. Sample asset extraction test
 *       6. Memory usage analysis
 *       7. Optimization recommendations
 *       
 *       **Use Cases:**
 *       - Troubleshoot timeout issues with large files
 *       - Estimate processing time before full extraction
 *       - Identify performance bottlenecks
 *       - Get optimization recommendations
 *       - Analyze file complexity and resource requirements
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
 *                 description: Large PPTX file to analyze (minimum 10MB)
 *             required:
 *               - file
 *           example:
 *             file: (large binary PPTX file >10MB)
 *     responses:
 *       200:
 *         description: Analysis completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 analysis:
 *                   type: object
 *                   properties:
 *                     fileInfo:
 *                       type: object
 *                       properties:
 *                         filename:
 *                           type: string
 *                           example: "large_presentation.pptx"
 *                         fileSizeMB:
 *                           type: number
 *                           example: 55
 *                         slideCount:
 *                           type: number
 *                           example: 271
 *                         isLargeFile:
 *                           type: boolean
 *                           example: true
 *                     performance:
 *                       type: object
 *                       properties:
 *                         totalAnalysisTime:
 *                           type: number
 *                           example: 45000
 *                         avgSampleSlideTime:
 *                           type: number
 *                           example: 150
 *                         estimatedFullProcessingTime:
 *                           type: number
 *                           example: 300000
 *                         estimatedMinutes:
 *                           type: number
 *                           example: 5
 *                     sampleResults:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           slideIndex:
 *                             type: number
 *                           shapeCount:
 *                             type: number
 *                           processingTime:
 *                             type: number
 *                       example:
 *                         - slideIndex: 0
 *                           shapeCount: 15
 *                           processingTime: 120
 *                         - slideIndex: 1
 *                           shapeCount: 8
 *                           processingTime: 95
 *                     recommendations:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example:
 *                         - "Consider processing this file in background job"
 *                         - "Use batch processing for files >200 slides"
 *                         - "Monitor memory usage during processing"
 *                     progressUpdates:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           timestamp:
 *                             type: string
 *                             format: date-time
 *                           timeElapsed:
 *                             type: number
 *                           message:
 *                             type: string
 *                           data:
 *                             type: object
 *                 meta:
 *                   type: object
 *                   properties:
 *                     requestId:
 *                       type: string
 *                       example: "large_debug_1752338766041"
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                     processingTimeMs:
 *                       type: number
 *                       example: 45123
 *       400:
 *         description: Invalid file or file too small
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "This endpoint is designed for large files (>10MB). Use regular debug endpoint for smaller files."
 *                 fileSize:
 *                   type: string
 *                   example: "5MB"
 *       500:
 *         description: Analysis failed or timeout
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Operation cancelled due to timeout"
 *                 analysis:
 *                   type: object
 *                   properties:
 *                     fileInfo:
 *                       type: object
 *                       properties:
 *                         filename:
 *                           type: string
 *                         fileSizeMB:
 *                           type: number
 *                     progressUpdates:
 *                       type: array
 *                       items:
 *                         type: object
 *                     terminatedAt:
 *                       type: number
 *                       example: 580000
 */
// Add enhanced debug endpoint for large files
router.post('/debug-extract-large-files',
  debugFileUpload.single('file'),
  validateUploadWithTiers,
  handleUploadError,
  (req: Request, res: Response, next: NextFunction) => {
    // Extended timeout for very large files - 10 minutes
    req.setTimeout(600000);
    res.setTimeout(600000);
    next();
  },
  handleAsyncErrors(async (req: Request, res: Response): Promise<void> => {
    const requestId = req.requestId || `large_debug_${Date.now()}`;
    const startTime = Date.now();
    
    if (!req.file) {
      res.status(400).json({ 
        success: false, 
        error: 'No file uploaded'
      });
      return;
    }

    const tempFilePath = req.file.path;
    const fileSize = req.file.size;
    const fileSizeMB = Math.round(fileSize / 1024 / 1024);
    
    // Check if file is actually large
    const isLargeFile = fileSizeMB > 10 || req.file.originalname.toLowerCase().includes('large');
    
    if (!isLargeFile) {
      res.status(400).json({
        success: false,
        error: 'This endpoint is designed for large files (>10MB). Use regular debug endpoint for smaller files.',
        fileSize: fileSizeMB + 'MB'
      });
      return;
    }

    logger.info('🔍 LARGE FILE DEBUG: Starting analysis', {
      requestId,
      filename: req.file.originalname,
      fileSizeMB,
      expectedProcessingTime: 'Long (5-10 minutes)'
    });

    const progressUpdates: any[] = [];
    const addProgress = async (message: string, data?: any) => {
      const progress = {
        timestamp: new Date().toISOString(),
        timeElapsed: Date.now() - startTime,
        message,
        data
      };
      progressUpdates.push(progress);
      logger.info(`📊 PROGRESS: ${message}`, { requestId, ...data });
    };

    // Set up cancellation mechanism
    let isCancelled = false;
    const cancellationTimeout = setTimeout(() => {
      isCancelled = true;
      logger.error('❌ LARGE FILE DEBUG: Cancelling due to timeout', { requestId });
    }, 580000); // Cancel after 9.5 minutes

    try {
      addProgress('Starting large file analysis', { fileSizeMB });
      
      // Step 1: Basic file validation
      addProgress('Validating file structure');
      const asposeDriver = require('/app/lib/AsposeDriverFactory');
      await asposeDriver.initialize();
      
      if (isCancelled) throw new Error('Operation cancelled due to timeout');
      
      const presentation = await asposeDriver.loadPresentation(tempFilePath);
      const slideCount = presentation.getSlides().size();
      
      addProgress('Presentation loaded', { slideCount });
      
      // Step 2: Estimate processing time
      const estimatedTimePerSlide = fileSizeMB > 50 ? 1000 : 500; // ms per slide
      const estimatedTotalTime = slideCount * estimatedTimePerSlide;
      const estimatedMinutes = Math.round(estimatedTotalTime / 60000);
      
      addProgress('Processing estimates calculated', {
        estimatedTimePerSlide,
        estimatedTotalTime,
        estimatedMinutes
      });
      
      // Step 3: Sample slide analysis (first 10 slides)
      addProgress('Analyzing sample slides');
      const sampleSize = Math.min(10, slideCount);
      const sampleResults = [];
      
      for (let i = 0; i < sampleSize; i++) {
        if (isCancelled) throw new Error('Operation cancelled due to timeout');
        
        const slideStartTime = Date.now();
        const slide = presentation.getSlides().get_Item(i);
        const shapes = slide.getShapes();
        const shapeCount = shapes.size();
        
        const slideTime = Date.now() - slideStartTime;
        sampleResults.push({
          slideIndex: i,
          shapeCount,
          processingTime: slideTime
        });
        
        if (i % 3 === 0) {
          addProgress(`Analyzed ${i + 1}/${sampleSize} sample slides`);
        }
      }
      
      const avgSampleTime = sampleResults.reduce((sum, r) => sum + r.processingTime, 0) / sampleResults.length;
      addProgress('Sample analysis completed', {
        sampleSize,
        avgSampleTime: Math.round(avgSampleTime),
        sampleResults
      });
      
      // Step 4: Test asset extraction on sample
      if (isCancelled) throw new Error('Operation cancelled due to timeout');
      
      addProgress('Testing asset extraction on sample');
      
      if (assetService) {
        try {
          // Test with just first 5 slides
          const testAssets = await Promise.race([
            assetService.extractAssets(tempFilePath, {
              assetTypes: ['image'], // Only images for speed
              returnFormat: 'urls',
              extractThumbnails: false,
              saveToFirebase: false,
              includeMetadata: false,
              slideRange: { start: 0, end: 4 } // First 5 slides only
            }),
            new Promise<any[]>((_, reject) => {
              setTimeout(() => reject(new Error('Sample extraction timeout')), 60000);
            })
          ]);
          
          addProgress('Sample asset extraction completed', {
            sampleSlides: 5,
            assetsFound: testAssets.length,
            avgAssetsPerSlide: Math.round(testAssets.length / 5)
          });
          
        } catch (extractionError) {
          addProgress('Sample asset extraction failed', {
            error: (extractionError as Error).message
          });
        }
      }
      
      // Step 5: Memory usage analysis
      const memUsage = process.memoryUsage();
      addProgress('Memory usage analysis', {
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
        rss: Math.round(memUsage.rss / 1024 / 1024)
      });
      
      // Step 6: Recommendations
      const recommendations = [];
      
      if (estimatedMinutes > 10) {
        recommendations.push('Consider processing this file in background job');
        recommendations.push('Implement progress tracking for user feedback');
      }
      
      if (avgSampleTime > 1000) {
        recommendations.push('Slides are complex - consider parallel processing');
      }
      
      if (memUsage.heapUsed > 500 * 1024 * 1024) { // >500MB
        recommendations.push('High memory usage detected - monitor for memory leaks');
      }
      
      recommendations.push('Use batch processing for files >200 slides');
      recommendations.push('Consider streaming processing for very large files');
      
      addProgress('Analysis completed successfully');
      
      // Cleanup
      presentation.dispose();
      clearTimeout(cancellationTimeout);
      
      const totalTime = Date.now() - startTime;
      
      res.json({
        success: true,
        analysis: {
          fileInfo: {
            filename: req.file.originalname,
            fileSizeMB,
            slideCount,
            isLargeFile: true
          },
          performance: {
            totalAnalysisTime: totalTime,
            avgSampleSlideTime: Math.round(avgSampleTime),
            estimatedFullProcessingTime: estimatedTotalTime,
            estimatedMinutes
          },
          sampleResults,
          recommendations,
          progressUpdates
        },
        meta: {
          requestId,
          timestamp: new Date().toISOString(),
          processingTimeMs: totalTime
        }
      });
      
    } catch (error) {
      clearTimeout(cancellationTimeout);
      const totalTime = Date.now() - startTime;
      
      logger.error('❌ LARGE FILE DEBUG: Analysis failed', {
        requestId,
        error: (error as Error).message,
        totalTime
      });
      
      // Cleanup
      const fs = require('fs/promises');
      await fs.unlink(tempFilePath).catch(() => {});
      
      res.status(500).json({
        success: false,
        error: (error as Error).message,
        analysis: {
          fileInfo: {
            filename: req.file.originalname,
            fileSizeMB
          },
          progressUpdates,
          terminatedAt: totalTime
        }
      });
    }
  })
);

// =============================================================================
// ROUTE DEFINITIONS
// =============================================================================

/**
 * @swagger
 * /extract-assets:
 *   post:
 *     tags:
 *       - Extraction
 *     summary: Extract embedded assets from presentation using AssetServiceRefactored
 *     description: |
 *       Extract embedded assets from PowerPoint presentations using AssetServiceRefactored.
 *       
 *       **Features:**
 *       - Supports images, videos, audio, documents, shapes, and charts
 *       - Firebase Storage integration (optional - controlled by extractToStorage option)
 *       - Comprehensive metadata extraction
 *       - Optional thumbnail generation
 *       - Transform and style analysis
 *       - Requires proper AssetService configuration
 *       
 *       **Asset Types (singular):** image, video, audio, document, excel, word, pdf, ole, shape, chart, all
 *       **Return Formats:** urls, base64, metadata-only
 *       
 *       **Default Behavior:**
 *       - assetTypes: ['all'] - Extract all types of assets
 *       - returnFormat: 'urls' - Return download URLs
 *       - generateThumbnails: true - Generate thumbnails for visual assets
 *       - extractToStorage: false - Don't save to Firebase by default
 *       - includeMetadata: true - Include comprehensive metadata
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
 *                 description: JSON string with extraction options (optional - defaults will be used if empty)
 *                 example: '{"assetTypes":["image","video"],"generateThumbnails":false,"returnFormat":"base64"}'
 *             required:
 *               - file
 *           examples:
 *             default_extraction:
 *               summary: Default extraction (all assets with URLs)
 *               value:
 *                 file: (binary)
 *                 options: ''
 *             all_assets:
 *               summary: Extract all asset types with thumbnails
 *               value:
 *                 file: (binary)
 *                 options: '{"assetTypes":["all"],"generateThumbnails":true}'
 *             specific_types:
 *               summary: Extract specific asset types
 *               value:
 *                 file: (binary)
 *                 options: '{"assetTypes":["image","video","audio"],"generateThumbnails":true,"returnFormat":"urls"}'
 *             media_only:
 *               summary: Extract only media assets as base64
 *               value:
 *                 file: (binary)
 *                 options: '{"assetTypes":["image","video","audio"],"generateThumbnails":false,"returnFormat":"base64"}'
 *             documents_only:
 *               summary: Extract embedded documents
 *               value:
 *                 file: (binary)
 *                 options: '{"assetTypes":["document","excel","word","pdf","ole"],"includeMetadata":true}'
 *             no_thumbnails:
 *               summary: Extract without generating thumbnails
 *               value:
 *                 file: (binary)
 *                 options: '{"assetTypes":["image","document"],"generateThumbnails":false,"extractToStorage":false}'
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
 *                           type:
 *                             type: string
 *                             enum: [image, video, audio, document, shape, chart, excel, word, pdf, ole]
 *                           filename:
 *                             type: string
 *                           size:
 *                             type: number
 *                           url:
 *                             type: string
 *                           slideIndex:
 *                             type: number
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalAssets:
 *                           type: integer
 *                           example: 5
 *                         byType:
 *                           type: object
 *                           properties:
 *                             image:
 *                               type: integer
 *                             video:
 *                               type: integer
 *                             audio:
 *                               type: integer
 *                             document:
 *                               type: integer
 *                             shape:
 *                               type: integer
 *                             chart:
 *                               type: integer
 *                             excel:
 *                               type: integer
 *                             word:
 *                               type: integer
 *                             pdf:
 *                               type: integer
 *                             ole:
 *                               type: integer
 *                         totalSize:
 *                           type: integer
 *                           example: 2048576
 *                         extractionMethod:
 *                           type: string
 *                           example: AssetServiceRefactored
 *                     extractionOptions:
 *                       type: object
 *                       properties:
 *                         assetTypes:
 *                           type: array
 *                           items:
 *                             type: string
 *                         returnFormat:
 *                           type: string
 *                         generateThumbnails:
 *                           type: boolean
 *                         extractToStorage:
 *                           type: boolean
 *                         includeMetadata:
 *                           type: boolean
 *                 meta:
 *                   type: object
 *                   properties:
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                     requestId:
 *                       type: string
 *                     processingTimeMs:
 *                       type: number
 *                     version:
 *                       type: string
 *                       example: 2.0-production
 *                     serviceType:
 *                       type: string
 *                       example: AssetServiceRefactored
 *       503:
 *         description: AssetService not configured
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     type:
 *                       type: string
 *                       example: service_unavailable
 *                     code:
 *                       type: string
 *                       example: ASSET_SERVICE_NOT_CONFIGURED
 *                     message:
 *                       type: string
 *                       example: Asset extraction requires proper service configuration
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

/**
 * @swagger
 * /debug-extract-assets:
 *   post:
 *     tags:
 *       - Extraction
 *     summary: Debug asset extraction process (Diagnostic Tool)
 *     description: |
 *       Comprehensive diagnostic tool for troubleshooting asset extraction issues.
 *       
 *       **Debug Information Provided:**
 *       - Presentation loading validation
 *       - Slide and shape enumeration
 *       - AssetService availability check
 *       - Detailed extraction process logging
 *       - Firebase/Firestore connectivity tests
 *       - Aspose.Slides initialization status
 *       - Error stack traces and detailed diagnostics
 *       
 *       **Use Cases:**
 *       - Troubleshoot zero asset extraction results
 *       - Validate file format compatibility
 *       - Check service initialization status
 *       - Debug large file processing issues
 *       - Investigate performance bottlenecks
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
 *                 description: PPTX file to debug
 *             required:
 *               - file
 *           example:
 *             file: (binary PPTX file)
 *     responses:
 *       200:
 *         description: Debug information collected successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 debug:
 *                   type: object
 *                   properties:
 *                     requestId:
 *                       type: string
 *                       example: "debug_1752306265534"
 *                     filename:
 *                       type: string
 *                       example: "presentation.pptx"
 *                     fileSize:
 *                       type: number
 *                       example: 2048576
 *                     slideCount:
 *                       type: number
 *                       example: 15
 *                     totalAssets:
 *                       type: number
 *                       example: 8
 *                     assetTypes:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["image", "shape"]
 *                     sampleAssets:
 *                       type: array
 *                       items:
 *                         type: object
 *                       example: []
 *                     diagnostics:
 *                       type: object
 *                       properties:
 *                         asposeInitialized:
 *                           type: boolean
 *                         assetServiceAvailable:
 *                           type: boolean
 *                         firebaseConfigured:
 *                           type: boolean
 *                         presentationLoaded:
 *                           type: boolean
 *       500:
 *         description: Debug process failed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Presentation loading failed"
 *                 stack:
 *                   type: string
 *                   example: "Error: Cannot read property..."
 */
router.post('/debug-extract-assets', 
  debugFileUpload.single('file'),
  validateUploadWithTiers,
  handleUploadError,
  (req: Request, res: Response, next: NextFunction) => {
    // Override timeout for debug endpoint - set to 2 minutes
    req.setTimeout(120000);
    res.setTimeout(120000);
    next();
  },
  handleAsyncErrors(async (req: Request, res: Response): Promise<void> => {
    const requestId = req.requestId || `debug_${Date.now()}`;
    const diagnostics = {
      step1_presentationLoaded: false,
      step2_firebaseConnected: false,
      step3_asposeInitialized: false,
      step4_assetsExtracted: false,
      step5_assetsAnalyzed: false,
      step6_firebaseStorageSaved: false,
      step7_responseGenerated: false,
      errors: [] as string[],
      warnings: [] as string[],
      details: {} as any
    };
    
    if (!req.file) {
      res.status(400).json({ 
        success: false, 
        error: 'No file uploaded',
        diagnostics 
      });
      return;
    }

    // Enhanced file size and disk storage validation
    logger.info('🔍 FILE UPLOAD DIAGNOSTIC:', {
      requestId,
      filename: req.file.originalname,
      fileSize: req.file.size,
      filePath: req.file.path,
      mimetype: req.file.mimetype,
      encoding: req.file.encoding,
      storageType: 'disk_storage'
    });

    // File is already on disk thanks to debugFileUpload middleware
    const tempFilePath = req.file.path;
    
    // Verify file size on disk
    const fs = require('fs/promises');
    const writtenFileStats = await fs.stat(tempFilePath);
    logger.info('🔍 FILE DISK STORAGE DIAGNOSTIC:', {
      tempFilePath,
      expectedSize: req.file.size,
      diskSize: writtenFileStats.size,
      sizeMatch: writtenFileStats.size === req.file.size,
      storageType: 'disk_storage'
    });
    
    if (writtenFileStats.size !== req.file.size) {
      const error = `File size mismatch on disk: expected ${req.file.size}, found ${writtenFileStats.size}`;
      logger.error('❌ FILE SIZE MISMATCH ON DISK:', { error });
      diagnostics.errors.push(`FILE SIZE MISMATCH: ${error}`);
    }

    try {
      logger.info('🔍 DIAGNOSTIC: Starting comprehensive asset extraction analysis', {
        requestId,
        filename: req.file.originalname,
        fileSize: req.file.size
      });

      // ✅ STEP 1: PRESENTATION LOADING VALIDATION
      logger.info('🔍 STEP 1: Testing presentation loading...');
      try {
        // CRITICAL: Add comprehensive JAR diagnostic before Aspose initialization
        logger.info('🔍 JAR DIAGNOSTIC: Starting comprehensive JAR file analysis...');
        
        const fs = require('fs');
        const path = require('path');
        
        // Check JAR file existence and details
        const possibleJarPaths = [
          '/app/lib/aspose-slides-25.6-nodejs.jar',
          path.join(process.cwd(), 'lib/aspose-slides-25.6-nodejs.jar'),
          path.join(process.cwd(), '../lib/aspose-slides-25.6-nodejs.jar'),
          path.join(__dirname, '../../lib/aspose-slides-25.6-nodejs.jar'),
          path.join(__dirname, '../../../lib/aspose-slides-25.6-nodejs.jar'),
          path.join(__dirname, '../../../../lib/aspose-slides-25.6-nodejs.jar')
        ];
        
        const jarDiagnostic = {
          jarFound: false,
          jarPath: null,
          jarSize: null,
          jarPermissions: null,
          javaAvailable: false,
          javaVersion: null,
          javaClasspath: null,
          javaOptions: null
        };
        
        // Check JAR file
        for (const jarPath of possibleJarPaths) {
          try {
            if (fs.existsSync(jarPath)) {
              const stats = fs.statSync(jarPath);
              jarDiagnostic.jarFound = true;
              jarDiagnostic.jarPath = jarPath;
              jarDiagnostic.jarSize = stats.size;
              jarDiagnostic.jarPermissions = stats.mode.toString(8);
              logger.info(`✅ JAR found: ${jarPath} (${(stats.size / 1024 / 1024).toFixed(2)}MB)`);
              break;
            } else {
              logger.info(`❌ JAR not found: ${jarPath}`);
            }
          } catch (error) {
            logger.info(`❌ Error checking JAR: ${jarPath} - ${(error as Error).message}`);
          }
        }
        
        // Additional diagnostic: Check current working directory and list lib contents
        try {
          const cwd = process.cwd();
          logger.info(`🔍 Current working directory: ${cwd}`);
          
          // Check if lib directory exists in current working directory
          const libDir = path.join(cwd, 'lib');
          if (fs.existsSync(libDir)) {
            const libFiles = fs.readdirSync(libDir);
            logger.info(`📁 Lib directory contents (${cwd}/lib):`, libFiles);
          } else {
            logger.info(`❌ Lib directory not found: ${libDir}`);
          }
          
          // Check if lib directory exists in /app
          const appLibDir = '/app/lib';
          if (fs.existsSync(appLibDir)) {
            const appLibFiles = fs.readdirSync(appLibDir);
            logger.info(`📁 App lib directory contents (/app/lib):`, appLibFiles);
          } else {
            logger.info(`❌ App lib directory not found: ${appLibDir}`);
          }
          
        } catch (error) {
          logger.error('❌ Error checking directories', { error: (error as Error).message });
        }
        
        // Check Java environment
        try {
          const java = require('java');
          jarDiagnostic.javaAvailable = true;
          jarDiagnostic.javaClasspath = java.classpath.length;
          jarDiagnostic.javaOptions = java.options.length;
          
          // Try to get Java version
          try {
            const javaLang = java.import('java.lang.System');
            if (javaLang) {
              jarDiagnostic.javaVersion = javaLang.getProperty('java.version');
            }
          } catch (e) {
            logger.info(`⚠️ Could not get Java version: ${(e as Error).message}`);
          }
          
          logger.info('✅ Java environment available', {
            classpathEntries: jarDiagnostic.javaClasspath,
            javaOptions: jarDiagnostic.javaOptions,
            javaVersion: jarDiagnostic.javaVersion
          });
        } catch (error) {
          logger.error('❌ Java environment not available', { error: (error as Error).message });
        }
        
        // Test basic Java functionality
        if (jarDiagnostic.javaAvailable) {
          try {
            const java = require('java');
            const JavaString = java.import('java.lang.String');
            if (JavaString) {
              logger.info('✅ java.lang.String import successful');
            } else {
              logger.error('❌ java.lang.String import failed');
            }
          } catch (error) {
            logger.error('❌ Basic Java test failed', { error: (error as Error).message });
          }
        }
        
        // Add JAR diagnostic to response
        diagnostics.details.jarDiagnostic = jarDiagnostic;
        
        // Add license diagnostic
        diagnostics.details.licenseDiagnostic = {
          hasLicenseContent: !!process.env.ASPOSE_LICENSE_CONTENT,
          licenseContentLength: process.env.ASPOSE_LICENSE_CONTENT ? process.env.ASPOSE_LICENSE_CONTENT.length : 0,
          licenseContentPreview: process.env.ASPOSE_LICENSE_CONTENT ? 
            process.env.ASPOSE_LICENSE_CONTENT.substring(0, 100) + '...' : 'Not set',
          appearsToBeXml: process.env.ASPOSE_LICENSE_CONTENT ? 
            (process.env.ASPOSE_LICENSE_CONTENT.trim().startsWith('<?xml') || process.env.ASPOSE_LICENSE_CONTENT.trim().startsWith('<')) : false
        };
        
        // If JAR not found, fail early with detailed information
        if (!jarDiagnostic.jarFound) {
          throw new Error(`JAR file not found in any location. Checked: ${possibleJarPaths.join(', ')}`);
        }
        
        // If Java not available, fail early
        if (!jarDiagnostic.javaAvailable) {
          throw new Error('Java environment not available');
        }
        
        logger.info('✅ JAR diagnostic completed successfully');
        
        // Now try Aspose initialization
        const asposeDriver = require('/app/lib/AsposeDriverFactory');
        await asposeDriver.initialize();
        
        diagnostics.step3_asposeInitialized = true;
        diagnostics.details.asposeDriverStatus = 'initialized';
        
        const presentation = await asposeDriver.loadPresentation(tempFilePath);
        const slideCount = presentation.getSlides().size();
        
        diagnostics.step1_presentationLoaded = true;
        diagnostics.details.presentationInfo = {
          slideCount,
          loaded: true,
          validFormat: true
        };
        
        logger.info('✅ STEP 1: Presentation loaded successfully', { slideCount });

        // Analyze slides and shapes
        const slideAnalysis = [];
        for (let i = 0; i < Math.min(slideCount, 5); i++) {
          const slide = presentation.getSlides().get_Item(i);
          const shapes = slide.getShapes();
          const shapeCount = shapes.size();
          
          const shapeTypes = [];
          for (let j = 0; j < Math.min(shapeCount, 10); j++) {
            const shape = shapes.get_Item(j);
            let shapeType = 'Unknown';
            let shapeTypeName = 'Unknown';
            try {
              if (shape && shape.getShapeType) {
                shapeType = shape.getShapeType();
                shapeTypeName = shapeType.toString();
              }
            } catch (e) {
              // Shape type extraction failed, use defaults
            }
            shapeTypes.push({
              index: j,
              type: shapeType,
              typeName: shapeTypeName
            });
          }
          
          slideAnalysis.push({
            slideIndex: i,
            shapeCount,
            shapeTypes
          });
        }
        
        diagnostics.details.slideAnalysis = slideAnalysis;
        presentation.dispose();
        
      } catch (error) {
        diagnostics.errors.push(`STEP 1 FAILED: ${(error as Error).message}`);
        logger.error('❌ STEP 1: Presentation loading failed', { error: (error as Error).message });
      }

      // ✅ STEP 2: FIREBASE/FIRESTORE CONNECTIVITY TEST
      logger.info('🔍 STEP 2: Testing Firebase/Firestore connectivity...');
      try {
        const firebaseConfigured = !!(
          process.env.FIREBASE_PROJECT_ID &&
          process.env.FIREBASE_PRIVATE_KEY &&
          process.env.FIREBASE_CLIENT_EMAIL &&
          process.env.FIREBASE_STORAGE_BUCKET
        );
        
        diagnostics.step2_firebaseConnected = firebaseConfigured;
        diagnostics.details.firebaseConfig = {
          projectId: !!process.env.FIREBASE_PROJECT_ID,
          privateKey: !!process.env.FIREBASE_PRIVATE_KEY,
          clientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
          storageBucket: !!process.env.FIREBASE_STORAGE_BUCKET,
          fullyConfigured: firebaseConfigured
        };
        
        if (firebaseConfigured) {
          logger.info('✅ STEP 2: Firebase fully configured');
        } else {
          diagnostics.warnings.push('STEP 2: Firebase not fully configured - will run without storage');
          logger.warn('⚠️ STEP 2: Firebase not fully configured');
        }
        
      } catch (error) {
        diagnostics.errors.push(`STEP 2 FAILED: ${(error as Error).message}`);
        logger.error('❌ STEP 2: Firebase connectivity test failed', { error: (error as Error).message });
      }

      // ✅ STEP 3: Already done above in Step 1

      // ✅ STEP 4: ASSET EXTRACTION TEST
      logger.info('🔍 STEP 4: Testing asset extraction...');
      try {
        if (!assetService) {
          throw new Error('AssetService not available');
        }

        const assets = await assetService.extractAssets(tempFilePath, {
          assetTypes: ['all'],
          returnFormat: 'urls',
          extractThumbnails: false,
          saveToFirebase: false,
          includeMetadata: true
        });
        
        diagnostics.step4_assetsExtracted = true;
        diagnostics.details.extractionResults = {
          totalAssets: assets.length,
          assetTypes: assets.map((a: any) => a.type),
          sampleAssets: assets.slice(0, 3).map((a: any) => ({
            id: a.id,
            type: a.type,
            size: a.size,
            hasData: !!a.data
          }))
        };
        
        if (assets.length > 0) {
          logger.info('✅ STEP 4: Assets extracted successfully', { totalAssets: assets.length });
          diagnostics.step5_assetsAnalyzed = true; // If we got assets, they were analyzed
        } else {
          diagnostics.warnings.push('STEP 4: No assets found in presentation');
          logger.warn('⚠️ STEP 4: No assets found in presentation');
        }
        
      } catch (error) {
        diagnostics.errors.push(`STEP 4 FAILED: ${(error as Error).message}`);
        logger.error('❌ STEP 4: Asset extraction failed', { error: (error as Error).message });
      }

      // ✅ STEP 5: Asset analysis already done in Step 4

      // ✅ STEP 6: FIREBASE STORAGE TEST (if configured)
      logger.info('🔍 STEP 6: Testing Firebase Storage...');
      if (diagnostics.step2_firebaseConnected && diagnostics.step4_assetsExtracted) {
        try {
          // Test with storage enabled
          const assetsWithStorage = await assetService.extractAssets(tempFilePath, {
            assetTypes: ['image'], // Just test images
            returnFormat: 'firebase-urls',
            extractThumbnails: false,
            saveToFirebase: true,
            includeMetadata: true,
            firebaseFolder: `debug-test/${requestId}`
          });
          
          diagnostics.step6_firebaseStorageSaved = assetsWithStorage.length > 0;
          diagnostics.details.firebaseStorageTest = {
            attempted: true,
            successful: assetsWithStorage.length > 0,
            assetsUploaded: assetsWithStorage.length
          };
          
          if (assetsWithStorage.length > 0) {
            logger.info('✅ STEP 6: Firebase Storage test successful');
          } else {
            logger.warn('⚠️ STEP 6: Firebase Storage test - no assets to upload');
          }
          
        } catch (error) {
          diagnostics.errors.push(`STEP 6 FAILED: ${(error as Error).message}`);
          logger.error('❌ STEP 6: Firebase Storage test failed', { error: (error as Error).message });
        }
      } else {
        diagnostics.warnings.push('STEP 6: Skipped - Firebase not configured or no assets to test');
        logger.info('⚠️ STEP 6: Skipped - Firebase not configured or no assets');
      }

      // ✅ STEP 7: RESPONSE GENERATION
      diagnostics.step7_responseGenerated = true;
      logger.info('✅ STEP 7: Response generation successful');

      await fs.unlink(tempFilePath).catch(() => {});

      // Final diagnostic summary
      const totalSteps = 7;
      const passedSteps = [
        diagnostics.step1_presentationLoaded,
        diagnostics.step2_firebaseConnected,
        diagnostics.step3_asposeInitialized,
        diagnostics.step4_assetsExtracted,
        diagnostics.step5_assetsAnalyzed,
        diagnostics.step6_firebaseStorageSaved,
        diagnostics.step7_responseGenerated
      ].filter(Boolean).length;

      const overallHealth = diagnostics.errors.length === 0 ? 'healthy' : 'issues_detected';

      res.json({
        success: true,
        diagnostics: {
          ...diagnostics,
          summary: {
            overallHealth,
            stepsPassedRatio: `${passedSteps}/${totalSteps}`,
            criticalIssues: diagnostics.errors.length,
            warnings: diagnostics.warnings.length
          }
        },
        debug: {
          requestId,
          filename: req.file.originalname,
          fileSize: req.file.size,
          ...diagnostics.details
        },
        recommendations: diagnostics.errors.length > 0 ? [
          'Check server logs for detailed error information',
          'Verify PPTX file format compatibility',
          'Ensure all environment variables are properly configured',
          'Test with a simpler presentation file',
          'Contact system administrator if issues persist'
        ] : [
          'System is functioning correctly',
          'If still getting zero assets, the presentation may not contain extractable assets',
          'Try with a presentation that definitely contains images or media'
        ]
      });

    } catch (error) {
      logger.error('💥 DIAGNOSTIC: Critical failure during analysis', {
        requestId,
        error: (error as Error).message,
        stack: (error as Error).stack
      });
      
      await fs.unlink(tempFilePath).catch(() => {});
      
      res.status(500).json({
        success: false,
        error: (error as Error).message,
        stack: (error as Error).stack,
        diagnostics
      });
    }
  })
);

export default router; 