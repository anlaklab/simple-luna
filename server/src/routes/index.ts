/**
 * Main Routes Index - Central route organization
 * 
 * Organizes all API routes with proper middleware and structure
 */

import { Router, Request, Response } from 'express';
import { timeoutHandler } from '../middleware/error.middleware';
import conversionRoutes from './conversion.routes';
import aiRoutes from './ai.routes';
import swaggerRoutes from './swagger.routes';
import adminRoutes from './admin.routes';
import conversationRoutes from './conversation.routes';

// =============================================================================
// ROUTER SETUP
// =============================================================================

const router = Router();

// =============================================================================
// GLOBAL MIDDLEWARE FOR API ROUTES
// =============================================================================

// Request timeout middleware (30 seconds for all API routes)
router.use(timeoutHandler(30000));

// Request logging middleware
router.use((req: Request, res: Response, next) => {
  req.requestId = req.requestId || `req_${Date.now()}`;
  next();
});

// =============================================================================
// ROUTE MOUNTING
// =============================================================================

/**
 * Mount conversion routes
 * Handles PPTX ↔ JSON conversions, format conversion, thumbnails
 */
router.use('/', conversionRoutes);

/**
 * Mount AI-powered routes  
 * Handles translation, analysis, asset extraction, metadata extraction
 */
router.use('/', aiRoutes);

/**
 * Mount admin routes
 * Handles file uploads, job management, system status
 */
router.use('/', adminRoutes);

/**
 * Mount conversation routes
 * Handles AI dialogue, streaming LLM interactions
 */
router.use('/', conversationRoutes);

/**
 * Mount API documentation routes
 * Handles Swagger/OpenAPI documentation
 */
router.use('/', swaggerRoutes);

// =============================================================================
// API DOCUMENTATION ROUTE
// =============================================================================

/**
 * GET /docs - API documentation endpoint
 * 
 * @route GET /docs
 * @desc Serve API documentation and endpoint information
 * @access Public
 * @returns {Object} API documentation and endpoint list
 */
router.get('/docs', (req: Request, res: Response) => {
  const requestId = req.requestId || `req_${Date.now()}`;
  const baseUrl = `${req.protocol}://${req.get('host')}${req.baseUrl}`;
  
  const documentation = {
    name: 'Luna Server API',
    version: '1.0.0',
    description: 'Professional PowerPoint processing API with AI capabilities',
    baseUrl,
    
    endpoints: {
      conversion: {
        description: 'File conversion endpoints',
        routes: {
          'POST /pptx2json': {
            description: 'Convert PPTX file to Universal Schema JSON',
            contentType: 'multipart/form-data',
            parameters: {
              file: 'PPTX file (required)',
              options: 'JSON string with conversion options (optional)',
            },
            example: {
              file: 'presentation.pptx',
              options: JSON.stringify({
                includeAssets: false,
                includeMetadata: true,
                includeAnimations: true,
              }),
            },
          },
          'POST /json2pptx': {
            description: 'Convert Universal Schema JSON to PPTX file',
            contentType: 'application/json',
            parameters: {
              presentationData: 'Universal Presentation Schema (required)',
              outputFormat: 'Output format: pptx, pptm (default: pptx)',
            },
          },
          'POST /convertformat': {
            description: 'Convert PPTX to various formats (PDF, HTML, images)',
            contentType: 'multipart/form-data',
            parameters: {
              file: 'PPTX file (required)',
              options: 'JSON string with format options (required)',
            },
            example: {
              file: 'presentation.pptx',
              options: JSON.stringify({
                outputFormat: 'pdf',
                quality: 'high',
              }),
            },
          },
          'POST /thumbnails': {
            description: 'Generate slide thumbnails',
            contentType: 'multipart/form-data',
            parameters: {
              file: 'PPTX file (required)',
              options: 'JSON string with thumbnail options (optional)',
            },
            example: {
              file: 'presentation.pptx',
              options: JSON.stringify({
                size: { width: 800, height: 600 },
                format: 'png',
                quality: 'high',
              }),
            },
          },
        },
      },
      
      ai: {
        description: 'AI-powered features',
        routes: {
          'POST /aitranslate': {
            description: 'AI-powered presentation translation',
            contentType: 'application/json',
            parameters: {
              presentationData: 'Universal Presentation Schema (required)',
              sourceLanguage: 'Source language code (optional, auto-detect)',
              targetLanguage: 'Target language code (required)',
              translationMethod: 'Translation method: aspose-ai, openai, hybrid',
            },
          },
          'POST /analyze': {
            description: 'AI content analysis for insights and accessibility',
            contentType: 'multipart/form-data',
            parameters: {
              file: 'PPTX file (required)',
              options: 'JSON string with analysis options (optional)',
            },
            example: {
              file: 'presentation.pptx',
              options: JSON.stringify({
                includeSentiment: true,
                includeAccessibility: true,
                includeDesignCritique: true,
              }),
            },
          },
          'POST /extract-assets': {
            description: 'Extract embedded assets from presentation',
            contentType: 'multipart/form-data',
            parameters: {
              file: 'PPTX file (required)',
              options: 'JSON string with extraction options (optional)',
            },
            example: {
              file: 'presentation.pptx',
              options: JSON.stringify({
                assetTypes: ['images', 'videos'],
                returnFormat: 'urls',
                generateThumbnails: true,
              }),
            },
          },
          'POST /extract-metadata': {
            description: 'Extract comprehensive document metadata',
            contentType: 'multipart/form-data',
            parameters: {
              file: 'PPTX file (required)',
              options: 'JSON string with extraction options (optional)',
            },
          },
        },
      },
      
      utility: {
        description: 'Utility endpoints',
        routes: {
          'GET /health': {
            description: 'Health check for all services',
            contentType: 'application/json',
            parameters: {},
          },
          'GET /docs': {
            description: 'API documentation (this endpoint)',
            contentType: 'application/json',
            parameters: {},
          },
        },
      },
    },
    
    responseFormat: {
      success: {
        success: true,
        data: '... endpoint-specific data ...',
        meta: {
          timestamp: 'ISO 8601 timestamp',
          requestId: 'Unique request identifier',
          processingTimeMs: 'Processing time in milliseconds',
          version: 'API version',
        },
      },
      error: {
        success: false,
        error: {
          type: 'Error type category',
          code: 'Specific error code',
          message: 'Human-readable error message',
          details: '... optional error details ...',
        },
        meta: {
          timestamp: 'ISO 8601 timestamp',
          requestId: 'Unique request identifier',
          error: {
            type: 'Error type',
            code: 'Error code',
            message: 'Error message',
          },
        },
      },
    },
    
    supportedFormats: {
      input: [
        'application/vnd.openxmlformats-officedocument.presentationml.presentation (.pptx)',
        'application/vnd.ms-powerpoint (.ppt)',
        'application/vnd.openxmlformats-officedocument.presentationml.slideshow (.ppsx)',
      ],
      output: [
        'pptx - PowerPoint Presentation',
        'pptm - PowerPoint Macro-Enabled Presentation',
        'pdf - Portable Document Format',
        'html - HTML format',
        'png - PNG images (one per slide)',
        'jpg - JPEG images (one per slide)',
        'svg - SVG images (one per slide)',
      ],
    },
    
    limits: {
      maxFileSize: '50MB',
      requestTimeout: '30 seconds',
      supportedLanguages: 'All OpenAI supported languages',
    },
    
    authentication: {
      type: 'none',
      note: 'Currently no authentication required. Production deployment may require API keys.',
    },
    
    meta: {
      timestamp: new Date().toISOString(),
      requestId,
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    },
  };
  
  res.status(200).json(documentation);
});

export default router; 