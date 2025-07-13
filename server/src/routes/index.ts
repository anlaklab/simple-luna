import { z } from "zod";
/**
 * Main Routes Index - Central route organization
 * 
 * Organizes all API routes with proper middleware and structure
 */

import { Router, Request, Response } from 'express';
import { timeoutHandler } from '../middleware/error.middleware';
import conversionRoutes from './conversion.routes';
import aiRoutes from './ai.routes';
import analysisRoutes from './analysis.routes';
import extractionRoutes from './extraction.routes';
import swaggerRoutes from './swagger.routes';
import adminRoutes from './admin.routes';
import conversationRoutes from './conversation.routes';
import sessionsRoutes from './sessions.routes';
import { createAsyncExtractionRoutes } from './async-extraction.routes';
import { AsyncExtractionController } from '../controllers/async-extraction.controller';
import { AsyncExtractionService } from '../services/async-extraction.service';
import { JobsService } from '../services/jobs.service';
import { AsposeAdapterRefactored } from '../adapters/aspose/AsposeAdapterRefactored';
import { FirebaseAdapter } from '../adapters/firebase.adapter';
import { createEnhancedAIRoutes } from './enhanced-ai.routes';
import { createGranularControlRoutes } from './granular-control.routes';
import enhancedSwaggerRoutes from './enhanced-swagger.routes';
import dynamicExtensionsRoutes from './dynamic-extensions.routes';
import debugRoutes from './debug.routes';
import licenseDebugRoutes from './license-debug.routes';
import logsRoutes from './logs.routes';
import metricsRoutes from './metrics.routes';
// import batchRoutes from './batch.routes'; // Temporarily disabled due to Firebase config issue

// =============================================================================
// ROUTER SETUP
// =============================================================================

const router = Router();

// =============================================================================
// GLOBAL MIDDLEWARE FOR API ROUTES
// =============================================================================

// Request timeout middleware (30 seconds for all API routes, except debug endpoints)
router.use((req: Request, res: Response, next) => {
  // Skip timeout for debug endpoints that need more time
  if (req.originalUrl?.includes('debug-extract-assets')) {
    return next();
  }
  return timeoutHandler(30000)(req, res, next);
});

// Request logging middleware
router.use((req: Request, res: Response, next) => {
  req.requestId = req.requestId || `req_${Date.now()}`;
  next();
});

// =============================================================================
// ASYNC EXTRACTION SERVICES INITIALIZATION
// =============================================================================

// Initialize services for async extraction
let asyncExtractionRoutes: Router | null = null;

try {
  // Initialize Firebase adapter if configured
  let firebaseAdapter: FirebaseAdapter | undefined;
  if (process.env.FIREBASE_PROJECT_ID && 
      process.env.FIREBASE_PRIVATE_KEY && 
      process.env.FIREBASE_CLIENT_EMAIL && 
      process.env.FIREBASE_STORAGE_BUCKET) {
    firebaseAdapter = new FirebaseAdapter({
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    });
  }

  // Initialize AsposeAdapter  
  const asposeAdapter = new AsposeAdapterRefactored({
    licenseFilePath: process.env.ASPOSE_LICENSE_PATH || './Aspose.Slides.Product.Family.lic',
    tempDirectory: process.env.ASPOSE_TEMP_DIR || './temp/aspose',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '52428800'),
  });

  // Initialize JobsService
  const jobsService = new JobsService({
    firebaseConfig: firebaseAdapter ? {
      projectId: process.env.FIREBASE_PROJECT_ID!,
      privateKey: process.env.FIREBASE_PRIVATE_KEY!,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET!,
    } : undefined,
  });

  // Initialize AsyncExtractionService
  const asyncExtractionService = new AsyncExtractionService({
    jobsService,
    firebaseAdapter,
    asposeAdapter,
    defaultTimeout: 5 * 60 * 1000, // 5 minutes
    maxConcurrentJobs: 3,
  });

  // Initialize AsyncExtractionController
  const asyncExtractionController = new AsyncExtractionController(
    asyncExtractionService,
    jobsService
  );

  // Create async extraction routes
  asyncExtractionRoutes = createAsyncExtractionRoutes(asyncExtractionController);

} catch (error) {
  console.warn('Failed to initialize async extraction services:', error);
  // Continue without async extraction functionality
}

// Initialize Enhanced AI routes
let enhancedAIRoutes: Router | null = null;

try {
  // Create enhanced AI routes (they handle their own OpenAI initialization)
  enhancedAIRoutes = createEnhancedAIRoutes();
} catch (error) {
  console.warn('Failed to initialize enhanced AI services:', error);
  // Continue without enhanced AI functionality
}

// Initialize Granular Control routes
let granularControlRoutes: Router | null = null;

try {
  // Create granular control routes for individual slide/shape operations
  granularControlRoutes = createGranularControlRoutes();
} catch (error) {
  console.warn('Failed to initialize granular control services:', error);
  // Continue without granular control functionality
}

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
 * Handles translation and chat functionality
 */
router.use('/', aiRoutes);

/**
 * Mount analysis routes
 * Handles AI-powered presentation analysis (sentiment, accessibility, etc.)
 */
router.use('/', analysisRoutes);

/**
 * Mount extraction routes
 * Handles asset and metadata extraction from presentations
 */
router.use('/', extractionRoutes);

/**
 * Mount async extraction routes
 * Handles background asset and metadata extraction with job tracking
 */
if (asyncExtractionRoutes) {
  router.use('/', asyncExtractionRoutes);
}

/**
 * Mount enhanced AI routes
 * Handles schema-aware AI analysis, translation, and suggestions
 */
if (enhancedAIRoutes) {
  router.use('/', enhancedAIRoutes);
}

/**
 * Mount granular control routes
 * Handles individual slide/shape operations and raw rendering
 */
if (granularControlRoutes) {
  router.use('/', granularControlRoutes);
}

/**
 * Mount dynamic extensions routes
 * Handles dynamic extension management and execution
 */
router.use('/dynamic-extensions', dynamicExtensionsRoutes);

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
 * Mount session management routes
 * Handles chat sessions, messages, archival
 */
router.use('/sessions', sessionsRoutes);

/**
 * Mount batch operations routes
 * Handles bulk operations on presentations, sessions, thumbnails
 */
// router.use('/batch', batchRoutes); // Temporarily disabled due to Firebase config issue

/**
 * Mount API documentation routes
 * Handles Swagger/OpenAPI documentation
 */
router.use('/', swaggerRoutes);

/**
 * Mount enhanced documentation routes
 * Handles enhanced OpenAPI 3.0 documentation with examples
 */
router.use('/', enhancedSwaggerRoutes);

/**
 * Mount debug routes
 * Handles system monitoring, debugging, and internal metrics
 * ⚠️  WARNING: These routes should be protected in production
 */
router.use('/debug', debugRoutes);

/**
 * Mount license debug routes
 * Handles comprehensive license manager debugging and diagnostics
 * ⚠️  WARNING: These routes should be protected in production
 */
router.use('/', licenseDebugRoutes);

/**
 * Mount logs routes
 * Handles frontend logs forwarding to PLG stack
 */
router.use('/logs', logsRoutes);

/**
 * Mount metrics routes
 * Handles Prometheus metrics scraping
 */
router.use('/metrics', metricsRoutes);

// =============================================================================
// HEALTH CHECK ENDPOINT
// =============================================================================

/**
 * GET /health - Health check and server info endpoint
 * 
 * @route GET /health
 * @desc Health check with comprehensive server information
 * @access Public
 * @returns {Object} Server health status and information
 */
router.get('/health', (req: Request, res: Response) => {
  const requestId = req.requestId || `req_${Date.now()}`;
  
  res.json({
    name: 'Luna Server',
    version: '1.0.0',
    description: 'Professional PowerPoint processing API with AI capabilities',
    status: 'running',
    health: 'healthy',
    endpoints: {
      health: '/api/v1/health',
      documentation: '/api/v1/docs',
      pptx2json: '/api/v1/pptx2json',
      json2pptx: '/api/v1/json2pptx',
      convertformat: '/api/v1/convertformat',
      thumbnails: '/api/v1/thumbnails',
      aitranslate: '/api/v1/aitranslate',
      analyze: '/api/v1/analyze',
      'extract-assets': '/api/v1/extract-assets',
      'extract-metadata': '/api/v1/extract-metadata',
    },
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    features: {
      firebase: !!process.env.FIREBASE_PROJECT_ID,
      openai: !!process.env.OPENAI_API_KEY,
      aspose: true,
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId,
      version: '1.0.0',
    },
  });
});

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
          'POST /chat': {
            description: 'AI-powered chat with Luna assistant',
            contentType: 'application/json',
            parameters: {
              message: 'Your message or question for Luna (required)',
              sessionId: 'Optional session ID to maintain conversation context',
              context: 'Additional context for the conversation',
            },
          },
          'POST /extract-assets-async': {
            description: 'Queue async asset extraction job (for large files)',
            contentType: 'multipart/form-data',
            parameters: {
              file: 'PPTX file (required)',
              assetTypes: 'Array of asset types: images, videos, audio (optional)',
              generateThumbnails: 'Boolean to generate thumbnails (optional)',
              timeoutMs: 'Custom timeout in milliseconds (optional, max 5 minutes)',
              userId: 'User identifier for tracking (optional)',
            },
            response: {
              jobId: 'Job ID for polling status',
              pollUrl: 'URL to check job status',
              estimatedDurationMs: 'Estimated processing time',
            },
          },
          'POST /extract-metadata-async': {
            description: 'Queue async metadata extraction job (for large files)',
            contentType: 'multipart/form-data',
            parameters: {
              file: 'PPTX file (required)',
              includeSystemProperties: 'Include system metadata (default: true)',
              includeCustomProperties: 'Include custom properties (default: true)',
              includeDocumentStatistics: 'Include document statistics (default: true)',
              includeRevisionHistory: 'Include revision history (default: false)',
              timeoutMs: 'Custom timeout in milliseconds (optional, max 5 minutes)',
              userId: 'User identifier for tracking (optional)',
            },
          },
        },
      },
      
      extraction: {
        description: 'Asset and metadata extraction endpoints',
        routes: {
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
            example: {
              file: 'presentation.pptx',
              options: JSON.stringify({
                includeSystemMetadata: true,
                includeCustomProperties: true,
                includeStatistics: true,
              }),
            },
          },
          'POST /extract-asset-metadata': {
            description: 'Extract metadata from embedded assets (Phase 2 implementation)',
            contentType: 'multipart/form-data',
            parameters: {
              file: 'PPTX file (required)',
            },
            note: 'Scheduled for implementation in Phase 2 of refactoring',
          },
        },
      },
      
      jobs: {
        description: 'Job management endpoints for async operations',
        routes: {
          'GET /jobs/:jobId': {
            description: 'Get job status and result',
            contentType: 'application/json',
            parameters: {
              jobId: 'Job identifier (required)',
            },
            response: {
              status: 'Job status: pending, processing, completed, failed',
              progress: 'Progress percentage (0-100)',
              result: 'Job result data (when completed)',
              estimatedRemainingMs: 'Estimated remaining time',
            },
          },
          'DELETE /jobs/:jobId': {
            description: 'Cancel a pending or processing job',
            contentType: 'application/json',
            parameters: {
              jobId: 'Job identifier (required)',
            },
          },
          'GET /jobs': {
            description: 'List jobs with filtering options',
            contentType: 'application/json',
            parameters: {
              userId: 'Filter by user ID (optional)',
              type: 'Filter by job type: extract-assets, extract-metadata (optional)',
              status: 'Filter by status: pending, processing, completed, failed (optional)',
              limit: 'Number of jobs to return (default: 20)',
              offset: 'Number of jobs to skip (default: 0)',
            },
          },
          'GET /extraction-queue': {
            description: 'Get extraction queue status and health',
            contentType: 'application/json',
            parameters: {},
            response: {
              queue: 'Queue status with active and pending jobs',
              health: 'Service health information',
              performance: 'Performance metrics and utilization',
            },
          },
        },
      },

      enhancedAI: {
        description: 'Enhanced AI endpoints with Universal Schema awareness',
        routes: {
          'POST /analyze-enhanced': {
            description: 'Schema-aware presentation analysis with enhanced insights',
            contentType: 'application/json',
            parameters: {
              presentationData: 'Universal Schema presentation data (required)',
              analysisTypes: 'Array of analysis types: summary, suggestions, accessibility, etc.',
              context: 'Analysis context: targetAudience, presentationPurpose, industry',
              enhanceWithSchemaKnowledge: 'Use schema structure for enhanced analysis (default: true)',
              preserveSchemaStructure: 'Preserve Universal Schema structure (default: true)',
            },
            response: {
              analysis: 'Enhanced analysis with schema compliance and insights',
              schemaCompliance: 'Universal Schema compliance report',
              universalSchemaInsights: 'Schema-specific insights and recommendations',
            },
          },
          'POST /translate-enhanced': {
            description: 'Schema-aware translation preserving Universal Schema structure',
            contentType: 'application/json',
            parameters: {
              presentationData: 'Universal Schema presentation data (required)',
              targetLanguage: 'Target language code (required)',
              sourceLanguage: 'Source language code (optional, auto-detect)',
              translateSchemaAware: 'Use schema-aware translation (default: true)',
              preserveUniversalStructure: 'Preserve Universal Schema structure (default: true)',
            },
            response: {
              translatedPresentation: 'Translated presentation with preserved schema',
              schemaPreservation: 'Schema preservation validation report',
              translationDetails: 'Translation metadata and quality metrics',
            },
          },
          'POST /suggestions-enhanced': {
            description: 'Generate schema-aware content suggestions',
            contentType: 'application/json',
            parameters: {
              presentationData: 'Universal Schema presentation data (required)',
              context: 'Context for generating suggestions (required)',
              maxSuggestions: 'Maximum suggestions to generate (default: 10)',
              focusAreas: 'Focus areas: structure, content, schema, accessibility',
              includeSchemaOptimizations: 'Include Universal Schema optimizations (default: true)',
            },
            response: {
              suggestions: 'Categorized and prioritized suggestions',
              summary: 'Suggestions summary by category and priority',
              processingMetrics: 'Processing metrics and schema analysis',
            },
          },
          'GET /ai-health-enhanced': {
            description: 'Health check for enhanced AI services',
            contentType: 'application/json',
            parameters: {},
            response: {
              services: 'OpenAI and Enhanced AI service status',
              capabilities: 'Available AI capabilities and features',
              overall: 'Overall health status: healthy, degraded, unhealthy',
            },
          },
        },
      },

      granularControl: {
        description: 'Granular control endpoints for individual slide/shape operations',
        routes: {
          'GET /presentations/{presentationId}/slides/{slideIndex}': {
            description: 'Extract individual slide data with Universal Schema compliance',
            contentType: 'application/json',
            parameters: {
              presentationId: 'Presentation identifier (required)',
              slideIndex: 'Zero-based slide index (required)',
              includeShapes: 'Include shape data (default: true)',
              includeNotes: 'Include slide notes (default: true)',
              includeBackground: 'Include background formatting (default: true)',
            },
            response: {
              slide: 'Complete slide data in Universal Schema format',
              metadata: 'Extraction metadata and processing statistics',
            },
          },
          'GET /presentations/{presentationId}/slides/{slideIndex}/shapes/{shapeId}': {
            description: 'Extract individual shape data with detailed formatting',
            contentType: 'application/json',
            parameters: {
              presentationId: 'Presentation identifier (required)',
              slideIndex: 'Zero-based slide index (required)',
              shapeId: 'Shape identifier (required)',
              includeFormatting: 'Include formatting details (default: true)',
              includeText: 'Include text content (default: true)',
            },
            response: {
              shape: 'Complete shape data with geometry, formatting, and content',
            },
          },
          'POST /render/slide': {
            description: 'Render slide from Universal Schema JSON to various formats',
            contentType: 'application/json',
            parameters: {
              slideData: 'Universal Schema slide data (required)',
              renderOptions: 'Rendering options: format, dimensions, quality',
            },
            response: {
              renderedSlide: 'Base64 encoded result or download URL',
              format: 'Output format used',
              dimensions: 'Final dimensions',
              renderingStats: 'Performance and processing statistics',
            },
            formats: ['json', 'pptx', 'png', 'svg'],
          },
          'POST /render/shape': {
            description: 'Render individual shape from Universal Schema JSON',
            contentType: 'application/json',
            parameters: {
              shapeData: 'Universal Schema shape data (required)',
              renderOptions: 'Rendering options: format, size, background',
            },
            response: {
              renderedShape: 'SVG markup or base64 encoded image',
              format: 'Output format used',
              bounds: 'Shape boundaries and positioning',
            },
            formats: ['json', 'svg', 'png'],
          },
          'POST /transform/slide': {
            description: 'Apply transformations to slide data without affecting full presentation',
            contentType: 'application/json',
            parameters: {
              slideData: 'Original slide data (required)',
              transformations: 'Array of transformations: translate, resize, recolor, rotate',
              preserveAspectRatio: 'Preserve aspect ratio during transformations (default: true)',
            },
            response: {
              transformedSlide: 'Transformed slide data',
              appliedTransformations: 'List of applied transformations',
              transformationStats: 'Transformation statistics and metrics',
            },
            transformations: ['translate', 'resize', 'recolor', 'rotate', 'scale'],
          },
        },
        benefits: [
          'Surgical precision for individual slides and shapes',
          'Real-time preview generation',
          'Performance optimization (process only what you need)',
          'Fine-grained control over transformations',
          'Universal Schema compliance maintained',
          'Multiple output formats supported',
        ],
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