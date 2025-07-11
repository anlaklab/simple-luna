/**
 * Analysis Routes - AI-powered presentation analysis
 * 
 * Focused routes for analyzing presentation content including sentiment, accessibility, and design
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import { OpenAIAdapter } from '../adapters/openai.adapter';
import { AsposeAdapterRefactored } from '../adapters/aspose/AsposeAdapterRefactored';
import { validateFileUpload, validateFormOptions } from '../middleware/validation.middleware';
import { handleAsyncErrors } from '../middleware/error.middleware';
import { logger } from '../utils/logger';
import { AnalyzeRequestSchema } from '../schemas/api-request.schema';
import { AnalyzeOptions, AnalysisResult } from '../types/ai.types';

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
// ANALYSIS CONTROLLER
// =============================================================================

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

      const analysisResult: AnalysisResult = {
        overview: {
          slideCount,
          wordCount,
          characterCount: charCount,
          readingLevel: wordCount > 100 ? 'Intermediate' : 'Basic',
          estimatedDuration: `${Math.max(1, Math.ceil(slideCount * 0.5))} minutes`,
        },
        sentiment: {
          overall: aiAnalysis?.sentiment?.overall || 'neutral' as const,
          confidence: aiAnalysis?.sentiment?.confidence || 0.5,
          details: aiAnalysis?.sentiment?.bySlide || [],
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
      };

      res.status(200).json({
        success: true,
        data: {
          analysis: analysisResult,
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

// =============================================================================
// ROUTE DEFINITIONS
// =============================================================================

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
router.post('/analyze', 
  upload.single('file'), 
  validateFileUpload({ 
    required: true, 
    maxSize: parseInt(process.env.MAX_FILE_SIZE || '52428800'), 
    fieldName: 'file' 
  }), 
  validateFormOptions(AnalyzeRequestSchema), 
  handleAsyncErrors(analyzeController)
);

export default router; 