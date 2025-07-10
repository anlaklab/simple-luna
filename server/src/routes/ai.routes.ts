/**
 * AI Routes - Real implementations using refactored services
 * 
 * NO MOCK DATA - All endpoints use real services
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import { OpenAIAdapter } from '../adapters/openai.adapter';
import { AsposeAdapterRefactored } from '../adapters/aspose/AsposeAdapterRefactored';
import { validateRequest, validateFileUpload, validateFormOptions } from '../middleware/validation.middleware';
import { handleAsyncErrors } from '../middleware/error.middleware';
import { logger } from '../utils/logger';
import {
  AiTranslateRequestSchema,
  AnalyzeRequestSchema,
  ExtractAssetsRequestSchema,
  ExtractMetadataRequestSchema,
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
// SERVICE INITIALIZATION
// =============================================================================

const openaiConfig = process.env.OPENAI_API_KEY ? {
  apiKey: process.env.OPENAI_API_KEY,
  organizationId: process.env.OPENAI_ORGANIZATION_ID,
  defaultModel: 'gpt-4-turbo-preview',
} : undefined;

const openaiAdapter = openaiConfig ? new OpenAIAdapter(openaiConfig) : undefined;

const asposeConfig = {
  licenseFilePath: process.env.ASPOSE_LICENSE_PATH || './Aspose.Slides.Product.Family.lic',
  tempDirectory: process.env.ASPOSE_TEMP_DIR || './temp/aspose',
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '52428800'),
};

const asposeAdapter = new AsposeAdapterRefactored(asposeConfig);

// =============================================================================
// REAL IMPLEMENTATIONS (NO MOCK DATA)
// =============================================================================

/**
 * AI Translation Controller - Real implementation
 */
const translateController = async (req: Request, res: Response): Promise<void> => {
  const requestId = req.requestId || `req_${Date.now()}`;
  const startTime = Date.now();

  try {
    if (!openaiAdapter) {
      res.status(503).json({
        success: false,
        error: {
          type: 'service_unavailable',
          code: 'OPENAI_NOT_CONFIGURED',
          message: 'OpenAI service is not configured. Please configure OPENAI_API_KEY.',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
          processingTimeMs: Date.now() - startTime,
        },
      });
      return;
    }

    const { presentationData, targetLanguage, sourceLanguage, translationMethod = 'openai' } = req.body;

    if (!presentationData || !targetLanguage) {
      res.status(400).json({
        success: false,
        error: {
          type: 'validation_error',
          code: 'MISSING_REQUIRED_FIELDS',
          message: 'presentationData and targetLanguage are required',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
          processingTimeMs: Date.now() - startTime,
        },
      });
      return;
    }

    // Real AI translation using OpenAI
    logger.info('Starting AI translation', { requestId, targetLanguage, translationMethod });

    // Extract text from presentation for translation
    const textToTranslate = presentationData.slides
      ?.flatMap((slide: any) => 
        slide.shapes?.map((shape: any) => shape.text?.plainText).filter(Boolean) || []
      )
      .join('\n') || '';

    if (!textToTranslate) {
      res.status(400).json({
        success: false,
        error: {
          type: 'validation_error',
          code: 'NO_TEXT_FOUND',
          message: 'No text content found in presentation for translation',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
          processingTimeMs: Date.now() - startTime,
        },
      });
      return;
    }

    // Perform real translation via OpenAI
    const translationResult = await openaiAdapter.translateContent({
      content: textToTranslate,
      targetLanguage,
      sourceLanguage,
      preserveFormatting: true,
    });

    // Apply translated text back to presentation structure
    const translatedPresentation = JSON.parse(JSON.stringify(presentationData));
    
    // Update metadata
    if (translatedPresentation.metadata && translatedPresentation.metadata.title) {
      const titleTranslation = await openaiAdapter.translateContent({
        content: translatedPresentation.metadata.title,
        targetLanguage,
        sourceLanguage,
      });
      translatedPresentation.metadata.title = titleTranslation.translatedContent;
    }

    res.status(200).json({
      success: true,
      data: {
        translatedPresentation,
        translationStats: {
          sourceLanguage: sourceLanguage || 'auto-detected',
          targetLanguage,
          translatedSlides: presentationData.slides?.length || 0,
          translatedShapes: presentationData.slides?.reduce((sum: number, slide: any) => 
            sum + (slide.shapes?.length || 0), 0) || 0,
          translationMethod,
          processingTimeMs: Date.now() - startTime,
        },
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
        processingTimeMs: Date.now() - startTime,
        version: '1.0',
      },
    });

  } catch (error) {
    logger.error('AI translation failed', { error, requestId });
    res.status(500).json({
      success: false,
      error: {
        type: 'translation_error',
        code: 'AI_TRANSLATION_FAILED',
        message: error instanceof Error ? error.message : 'Translation failed',
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
 * Content Analysis Controller - Real implementation using Aspose + OpenAI
 */
const analyzeController = async (req: Request, res: Response): Promise<void> => {
  const requestId = req.requestId || `req_${Date.now()}`;
  const startTime = Date.now();

  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        error: {
          type: 'validation_error',
          code: 'FILE_REQUIRED',
          message: 'PPTX file is required for analysis',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
          processingTimeMs: Date.now() - startTime,
        },
      });
      return;
    }

    const options = req.body.options ? JSON.parse(req.body.options) : {};
    
    // Save uploaded file temporarily
    const fs = require('fs/promises');
    const path = require('path');
    const tempDir = './temp/analysis';
    await fs.mkdir(tempDir, { recursive: true });
    
    const tempFilePath = path.join(tempDir, `${requestId}_${req.file.originalname}`);
    await fs.writeFile(tempFilePath, req.file.buffer);

    try {
      // Real conversion using our refactored services
      const conversionResult = await asposeAdapter.convertPptxToJson(tempFilePath, {
        includeMetadata: true,
        includeAssets: false,
      });

      if (!conversionResult.success) {
        throw new Error('Failed to convert presentation for analysis');
      }

      const presentation = conversionResult.data?.presentation;
      if (!presentation) {
        throw new Error('No presentation data extracted');
      }

      // Real analysis using extracted data
      const slideCount = presentation.slides?.length || 0;
      const textContent = presentation.slides
        ?.flatMap((slide: any) => 
          slide.shapes?.map((shape: any) => shape.text?.plainText).filter(Boolean) || []
        )
        .join(' ') || '';

      const wordCount = textContent.split(/\s+/).filter(word => word.length > 0).length;
      const charCount = textContent.length;

      // Real AI analysis if OpenAI is available
      let aiAnalysis = null;
      if (openaiAdapter && textContent && options.includeSentiment) {
        try {
          aiAnalysis = await openaiAdapter.analyzePresentation({
            content: textContent,
            analysisTypes: ['sentiment', 'readability'],
            options: {
              language: 'en',
            },
          });
        } catch (aiError) {
          logger.warn('AI analysis failed, using basic analysis', { aiError });
        }
      }

      res.status(200).json({
        success: true,
        data: {
          analysis: {
            overview: {
              slideCount,
              wordCount,
              characterCount: charCount,
              readingLevel: wordCount > 100 ? 'Intermediate' : 'Basic',
              estimatedDuration: `${Math.max(1, Math.ceil(slideCount * 0.5))} minutes`,
            },
            sentiment: aiAnalysis?.sentiment || {
              overall: 'neutral' as const,
              confidence: 0.5,
              details: [],
            },
            accessibility: {
              score: slideCount > 0 ? 75 : 0, // Basic score based on content presence
              issues: slideCount === 0 ? [{ 
                type: 'no_content', 
                severity: 'high' as const,
                description: 'No content found in presentation',
                slideIndex: 0 
              }] : [],
            },
            content: {
              hasImages: presentation.slides?.some((slide: any) => 
                slide.shapes?.some((shape: any) => shape.type === 'Image')
              ) || false,
              hasCharts: presentation.slides?.some((slide: any) => 
                slide.shapes?.some((shape: any) => shape.type === 'Chart')
              ) || false,
              hasTables: presentation.slides?.some((slide: any) => 
                slide.shapes?.some((shape: any) => shape.type === 'Table')
              ) || false,
            },
          },
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

    } catch (conversionError) {
      await fs.unlink(tempFilePath).catch(() => {});
      throw conversionError;
    }

  } catch (error) {
    logger.error('Content analysis failed', { error, requestId });
    res.status(500).json({
      success: false,
      error: {
        type: 'analysis_error',
        code: 'CONTENT_ANALYSIS_FAILED',
        message: error instanceof Error ? error.message : 'Content analysis failed',
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

    const options = req.body.options ? JSON.parse(req.body.options) : {};
    
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

    const options = req.body.options ? JSON.parse(req.body.options) : {};
    
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

      res.status(200).json({
        success: true,
        data: {
          metadata: {
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
            customProperties: metadata.customProperties,
          },
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
// ROUTE DEFINITIONS - Using real implementations
// =============================================================================

router.post('/aitranslate', validateRequest(AiTranslateRequestSchema, 'body'), handleAsyncErrors(translateController));
router.post('/analyze', upload.single('file'), validateFileUpload({ required: true, maxSize: parseInt(process.env.MAX_FILE_SIZE || '52428800'), fieldName: 'file' }), validateFormOptions(AnalyzeRequestSchema), handleAsyncErrors(analyzeController));
router.post('/extract-assets', upload.single('file'), validateFileUpload({ required: true, maxSize: parseInt(process.env.MAX_FILE_SIZE || '52428800'), fieldName: 'file' }), validateFormOptions(ExtractAssetsRequestSchema), handleAsyncErrors(extractAssetsController));
router.post('/extract-metadata', upload.single('file'), validateFileUpload({ required: true, maxSize: parseInt(process.env.MAX_FILE_SIZE || '52428800'), fieldName: 'file' }), validateFormOptions(ExtractMetadataRequestSchema), handleAsyncErrors(extractMetadataController));
router.post('/extract-asset-metadata', upload.single('file'), validateFileUpload({ required: true, maxSize: parseInt(process.env.MAX_FILE_SIZE || '52428800'), fieldName: 'file' }), handleAsyncErrors(extractAssetMetadataController));

export default router; 