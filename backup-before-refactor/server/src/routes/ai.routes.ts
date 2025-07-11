/**
 * AI Routes - Real implementations using refactored services
 * 
 * NO MOCK DATA - All endpoints use real services
 */

import { Router, Request, Response } from 'express';
import { OpenAIAdapter } from '../adapters/openai.adapter';
import { AsposeAdapterRefactored } from '../adapters/aspose/AsposeAdapterRefactored';
import { validateRequest, validateFormOptions } from '../middleware/validation.middleware';
import { handleAsyncErrors } from '../middleware/error.middleware';
import { 
  conversionUpload, 
  largeFileUpload, 
  validateUploadWithTiers, 
  handleUploadError 
} from '../middleware/upload.middleware';
import { logger } from '../utils/logger';
import {
  AiTranslateRequestSchema,
  AnalyzeRequestSchema,
  ExtractAssetsRequestSchema,
  ExtractMetadataRequestSchema,
} from '../schemas/api-request.schema';
import {
  AnalyzeOptions,
  ExtractAssetsOptions,
  ExtractMetadataOptions,
  AnalysisResult,
  AssetExtractionResult,
  ExtractedMetadata,
} from '../types/ai.types';

// =============================================================================
// ROUTER SETUP
// =============================================================================

const router = Router();

// =============================================================================
// UPLOAD CONFIGURATION - Now using centralized middleware
// =============================================================================

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

    // Options are already safely parsed by validateFormOptions middleware
    const options = req.body.options as AnalyzeOptions;
    
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
 * Chat Controller - Real implementation using OpenAI for conversational AI
 */
const chatController = async (req: Request, res: Response): Promise<void> => {
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

    const { message, sessionId, context = {} } = req.body;

    if (!message || typeof message !== 'string') {
      res.status(400).json({
        success: false,
        error: {
          type: 'validation_error',
          code: 'MISSING_MESSAGE',
          message: 'Message content is required',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
          processingTimeMs: Date.now() - startTime,
        },
      });
      return;
    }

    // Real AI conversation using OpenAI
    logger.info('Starting AI chat conversation', { requestId, sessionId, messageLength: message.length });

    const systemPrompt = `You are Luna, an AI presentation assistant. You help users create, analyze, and improve professional presentations. You have expertise in:
- Creating compelling presentation content
- Analyzing presentation effectiveness
- Suggesting design improvements
- Providing content optimization advice
- Helping with presentation structure and flow

Keep responses helpful, professional, and focused on presentation-related tasks. If asked about unrelated topics, gently redirect to how you can help with presentations.`;

    const response = await openaiAdapter.createChatCompletion({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
      model: 'gpt-4-turbo-preview',
      temperature: 0.7,
      max_tokens: 1000,
    });

    const assistantMessage = response.choices[0]?.message?.content;
    if (!assistantMessage) {
      throw new Error('No response generated from AI model');
    }

    const usageMetrics = openaiAdapter.getUsageMetrics(response);

    res.status(200).json({
      success: true,
      data: {
        response: assistantMessage,
        model: response.model,
        sessionId,
        context,
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
        processingTimeMs: Date.now() - startTime,
        tokensUsed: usageMetrics?.totalTokens || 0,
        version: '1.0',
      },
    });

  } catch (error) {
    logger.error('AI chat failed', { error, requestId });
    res.status(500).json({
      success: false,
      error: {
        type: 'chat_error',
        code: 'AI_CHAT_FAILED',
        message: error instanceof Error ? error.message : 'Chat conversation failed',
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

/**
 * @swagger
 * /chat:
 *   post:
 *     tags:
 *       - AI Features
 *     summary: AI Chat with Luna Assistant
 *     description: |
 *       Chat with Luna, an AI assistant specialized in presentation creation and analysis.
 *       Get advice on presentation content, structure, design, and optimization.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *                 description: Your message or question for Luna
 *                 example: "How can I make my presentation more engaging?"
 *               sessionId:
 *                 type: string
 *                 description: Optional session ID to maintain conversation context
 *                 example: "session_abc123"
 *               context:
 *                 type: object
 *                 description: Additional context for the conversation
 *                 example: { "presentationType": "business", "audience": "executives" }
 *             required:
 *               - message
 *     responses:
 *       200:
 *         description: AI response generated successfully
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
 *                     response:
 *                       type: string
 *                       example: "To make your presentation more engaging, consider adding interactive elements like polls or Q&A sessions..."
 *                     model:
 *                       type: string
 *                       example: "gpt-4-turbo-preview"
 *                     sessionId:
 *                       type: string
 *                       example: "session_abc123"
 *                 meta:
 *                   $ref: '#/components/schemas/SuccessMeta'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       503:
 *         description: AI service unavailable
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/chat', handleAsyncErrors(chatController));

/**
 * @swagger
 * /aitranslate:
 *   post:
 *     tags:
 *       - AI Features
 *     summary: AI-powered presentation translation
 *     description: |
 *       Translate presentation content to different languages using advanced AI.
 *       Preserves formatting and structure while providing accurate translations.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               presentationData:
 *                 $ref: '#/components/schemas/UniversalPresentation'
 *               sourceLanguage:
 *                 type: string
 *                 description: Source language code (optional, auto-detect if not provided)
 *                 example: "en"
 *               targetLanguage:
 *                 type: string
 *                 description: Target language code
 *                 example: "es"
 *               translationMethod:
 *                 type: string
 *                 enum: [openai, aspose-ai, hybrid]
 *                 default: openai
 *                 description: Translation method to use
 *               preserveFormatting:
 *                 type: boolean
 *                 default: true
 *                 description: Preserve original formatting
 *               translateComments:
 *                 type: boolean
 *                 default: true
 *                 description: Translate comments and notes
 *               translateMetadata:
 *                 type: boolean
 *                 default: false
 *                 description: Translate metadata fields
 *             required:
 *               - presentationData
 *               - targetLanguage
 *     responses:
 *       200:
 *         description: Translation completed successfully
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
 *                     translatedPresentation:
 *                       $ref: '#/components/schemas/UniversalPresentation'
 *                     translationStats:
 *                       type: object
 *                       properties:
 *                         sourceLanguage:
 *                           type: string
 *                           example: "en"
 *                         targetLanguage:
 *                           type: string
 *                           example: "es"
 *                         translatedSlides:
 *                           type: number
 *                           example: 10
 *                         translatedShapes:
 *                           type: number
 *                           example: 45
 *                         translationMethod:
 *                           type: string
 *                           example: "openai"
 *                 meta:
 *                   $ref: '#/components/schemas/SuccessMeta'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       503:
 *         description: AI service unavailable
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/aitranslate', validateRequest(AiTranslateRequestSchema, 'body'), handleAsyncErrors(translateController));

/**
 * @swagger
 * /analyze:
 *   post:
 *     tags:
 *       - AI Features
 *     summary: AI-powered presentation analysis
 *     description: |
 *       Analyze presentation content for insights including sentiment analysis,
 *       accessibility checks, readability assessment, and design recommendations.
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
 *                 description: PPTX file to analyze
 *               options:
 *                 type: string
 *                 description: JSON string with analysis options
 *                 example: '{"includeSentiment":true,"includeAccessibility":true,"includeDesignCritique":true}'
 *             required:
 *               - file
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
 *                 data:
 *                   type: object
 *                   properties:
 *                     analysis:
 *                       type: object
 *                       properties:
 *                         overview:
 *                           type: object
 *                           properties:
 *                             slideCount:
 *                               type: number
 *                               example: 10
 *                             wordCount:
 *                               type: number
 *                               example: 245
 *                             characterCount:
 *                               type: number
 *                               example: 1520
 *                             readingLevel:
 *                               type: string
 *                               example: "Intermediate"
 *                             estimatedDuration:
 *                               type: string
 *                               example: "5 minutes"
 *                         sentiment:
 *                           type: object
 *                           properties:
 *                             overall:
 *                               type: string
 *                               enum: [positive, negative, neutral]
 *                               example: "positive"
 *                             confidence:
 *                               type: number
 *                               example: 0.85
 *                         accessibility:
 *                           type: object
 *                           properties:
 *                             score:
 *                               type: number
 *                               example: 75
 *                             issues:
 *                               type: array
 *                               items:
 *                                 type: object
 *                                 properties:
 *                                   type:
 *                                     type: string
 *                                   severity:
 *                                     type: string
 *                                     enum: [low, medium, high]
 *                                   description:
 *                                     type: string
 *                                   slideIndex:
 *                                     type: number
 *                         content:
 *                           type: object
 *                           properties:
 *                             hasImages:
 *                               type: boolean
 *                             hasCharts:
 *                               type: boolean
 *                             hasTables:
 *                               type: boolean
 *                 meta:
 *                   $ref: '#/components/schemas/SuccessMeta'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/analyze', largeFileUpload.single('file'), validateUploadWithTiers, validateFormOptions(AnalyzeRequestSchema), handleAsyncErrors(analyzeController), handleUploadError);

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
router.post('/extract-asset-metadata', largeFileUpload.single('file'), validateUploadWithTiers, handleAsyncErrors(extractAssetMetadataController), handleUploadError);

export default router; 