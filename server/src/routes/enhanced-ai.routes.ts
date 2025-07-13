import { z } from "zod";
/**
 * Enhanced AI Routes - Schema-aware AI endpoints
 */

import { Router } from 'express';
import { EnhancedAIController } from '../controllers/enhanced-ai.controller';
import { OpenAIAdapter } from '../adapters/openai.adapter';
import { handleAsyncErrors } from '../middleware/error.middleware';
import { validateRequest } from '../middleware/validation.middleware';

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const enhancedAnalysisSchema = {
  type: 'object',
  properties: {
    presentationData: {
      type: 'object',
      description: 'Universal Schema presentation data',
    },
    analysisTypes: {
      type: 'array',
      items: {
        type: 'string',
        enum: ['summary', 'tags', 'topics', 'sentiment', 'readability', 'suggestions', 'accessibility', 'designCritique', 'contentOptimization', 'audienceTargeting'],
      },
      default: ['summary', 'suggestions', 'accessibility'],
    },
    context: {
      type: 'object',
      properties: {
        targetAudience: { type: 'string' },
        presentationPurpose: { type: 'string' },
        industry: { type: 'string' },
      },
    },
    options: {
      type: 'object',
      properties: {
        model: { type: 'string' },
        maxTokens: { type: 'number' },
        temperature: { type: 'number' },
        language: { type: 'string' },
      },
    },
    enhanceWithSchemaKnowledge: {
      type: 'boolean',
      default: true,
    },
    preserveSchemaStructure: {
      type: 'boolean',
      default: true,
    },
  },
  required: ['presentationData'],
  additionalProperties: false,
};

const enhancedTranslationSchema = {
  type: 'object',
  properties: {
    presentationData: {
      type: 'object',
      description: 'Universal Schema presentation data',
    },
    sourceLanguage: {
      type: 'string',
      description: 'Source language code (optional, auto-detect)',
    },
    targetLanguage: {
      type: 'string',
      description: 'Target language code',
    },
    preserveFormatting: {
      type: 'boolean',
      default: true,
    },
    useContextualTranslation: {
      type: 'boolean',
      default: true,
    },
    translateSchemaAware: {
      type: 'boolean',
      default: true,
    },
    preserveUniversalStructure: {
      type: 'boolean',
      default: true,
    },
    options: {
      type: 'object',
      properties: {
        model: { type: 'string' },
        maxTokens: { type: 'number' },
        temperature: { type: 'number' },
      },
    },
  },
  required: ['presentationData', 'targetLanguage'],
  additionalProperties: false,
};

const enhancedSuggestionsSchema = {
  type: 'object',
  properties: {
    presentationData: {
      type: 'object',
      description: 'Universal Schema presentation data',
    },
    context: {
      type: 'string',
      description: 'Context for generating suggestions',
    },
    maxSuggestions: {
      type: 'number',
      minimum: 1,
      maximum: 20,
      default: 10,
    },
    focusAreas: {
      type: 'array',
      items: {
        type: 'string',
        enum: ['structure', 'content', 'schema', 'accessibility'],
      },
      default: ['structure', 'content', 'accessibility'],
    },
    includeSchemaOptimizations: {
      type: 'boolean',
      default: true,
    },
  },
  required: ['presentationData', 'context'],
  additionalProperties: false,
};

// =============================================================================
// ROUTE FACTORY
// =============================================================================

export function createEnhancedAIRoutes async (): Router {
  const router = Router();

  // Initialize OpenAI adapter with environment configuration
  let openaiAdapter: OpenAIAdapter | null = null;
  
  try {
    if (!process.env.OPENAI_API_KEY) {
      console.warn('OpenAI API key not configured - enhanced AI features will be unavailable');
      return router; // Return empty router if OpenAI not configured
    }

    openaiAdapter = new OpenAIAdapter({
      apiKey: process.env.OPENAI_API_KEY,
      organizationId: process.env.OPENAI_ORGANIZATION_ID,
      baseURL: process.env.OPENAI_BASE_URL,
      defaultModel: process.env.OPENAI_DEFAULT_MODEL || 'gpt-4-turbo-preview',
      defaultMaxTokens: parseInt(process.env.OPENAI_DEFAULT_MAX_TOKENS || '2000'),
      defaultTemperature: parseFloat(process.env.OPENAI_DEFAULT_TEMPERATURE || '0.7'),
    });

    // Initialize controller
    const enhancedAIController = new EnhancedAIController(openaiAdapter);

    // =============================================================================
    // ENHANCED AI ENDPOINTS
    // =============================================================================

    /**
     * @swagger
     * /analyze-enhanced:
     *   post:
     *     tags:
     *       - Enhanced AI
     *     summary: Schema-aware presentation analysis
     *     description: |
     *       Advanced AI analysis with Universal Schema awareness and compliance validation.
     *       This endpoint provides deeper insights by understanding the presentation structure
     *       and generating recommendations that preserve schema integrity.
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               presentationData:
     *                 $ref: '#/components/schemas/UniversalPresentation'
     *                 description: Universal Schema presentation data
     *               analysisTypes:
     *                 type: array
     *                 items:
     *                   type: string
     *                   enum: [summary, tags, topics, sentiment, readability, suggestions, accessibility, designCritique, contentOptimization, audienceTargeting]
     *                 default: [summary, suggestions, accessibility]
     *                 description: Types of analysis to perform
     *               context:
     *                 type: object
     *                 properties:
     *                   targetAudience:
     *                     type: string
     *                     description: Target audience for the presentation
     *                     example: "executives"
     *                   presentationPurpose:
     *                     type: string
     *                     description: Purpose of the presentation
     *                     example: "quarterly_review"
     *                   industry:
     *                     type: string
     *                     description: Industry context
     *                     example: "technology"
     *                 description: Context for generating targeted analysis
     *               enhanceWithSchemaKnowledge:
     *                 type: boolean
     *                 default: true
     *                 description: Use schema structure for enhanced analysis
     *               preserveSchemaStructure:
     *                 type: boolean
     *                 default: true
     *                 description: Preserve Universal Schema structure in results
     *             required:
     *               - presentationData
     *           examples:
     *             comprehensive:
     *               summary: Comprehensive business presentation analysis
     *               value:
     *                 presentationData:
     *                   metadata:
     *                     title: "Q4 Business Review"
     *                     slideCount: 15
     *                   slides: []
     *                 analysisTypes: ["summary", "accessibility", "sentiment", "designCritique"]
     *                 context:
     *                   targetAudience: "executives"
     *                   presentationPurpose: "quarterly_review"
     *                   industry: "technology"
     *                 enhanceWithSchemaKnowledge: true
     *     responses:
     *       200:
     *         description: Analysis completed successfully
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/EnhancedAnalysisResponse'
     *       400:
     *         $ref: '#/components/responses/ValidationError'
     *       503:
     *         $ref: '#/components/responses/ServiceUnavailable'
     */
    router.post(
      '/analyze-enhanced',
      handleAsyncErrors(enhancedAIController.analyzeEnhanced)
    );

    /**
     * @swagger
     * /translate-enhanced:
     *   post:
     *     tags:
     *       - Enhanced AI
     *     summary: Schema-aware presentation translation
     *     description: |
     *       Advanced translation with Universal Schema preservation and contextual awareness.
     *       This endpoint translates presentation content while maintaining the structure
     *       and integrity of the Universal Schema format.
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               presentationData:
     *                 $ref: '#/components/schemas/UniversalPresentation'
     *                 description: Universal Schema presentation data
     *               sourceLanguage:
     *                 type: string
     *                 description: Source language code (optional, auto-detect)
     *                 example: "en"
     *               targetLanguage:
     *                 type: string
     *                 description: Target language code (required)
     *                 example: "es"
     *               preserveFormatting:
     *                 type: boolean
     *                 default: true
     *                 description: Preserve text formatting and styles
     *               useContextualTranslation:
     *                 type: boolean
     *                 default: true
     *                 description: Use contextual awareness for better translation
     *               translateSchemaAware:
     *                 type: boolean
     *                 default: true
     *                 description: Use schema-aware translation methods
     *               preserveUniversalStructure:
     *                 type: boolean
     *                 default: true
     *                 description: Preserve Universal Schema structure
     *               options:
     *                 type: object
     *                 properties:
     *                   model:
     *                     type: string
     *                     description: AI model to use
     *                     example: "gpt-4-turbo-preview"
     *                   maxTokens:
     *                     type: number
     *                     description: Maximum tokens for AI response
     *                     example: 2000
     *                   temperature:
     *                     type: number
     *                     description: AI creativity temperature (0-2)
     *                     example: 0.3
     *                 description: AI generation options
     *             required:
     *               - presentationData
     *               - targetLanguage
     *           examples:
     *             spanish:
     *               summary: Translate business presentation to Spanish
     *               value:
     *                 presentationData:
     *                   metadata:
     *                     title: "Business Quarterly Review"
     *                     slideCount: 10
     *                   slides: []
     *                 targetLanguage: "es"
     *                 preserveFormatting: true
     *                 translateSchemaAware: true
     *             french:
     *               summary: Translate with custom options to French
     *               value:
     *                 presentationData:
     *                   metadata:
     *                     title: "Product Launch Strategy"
     *                     slideCount: 12
     *                   slides: []
     *                 sourceLanguage: "en"
     *                 targetLanguage: "fr"
     *                 options:
     *                   temperature: 0.2
     *                   maxTokens: 3000
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
     *                       description: Translated presentation with preserved schema
     *                     schemaPreservation:
     *                       type: object
     *                       properties:
     *                         isPreserved:
     *                           type: boolean
     *                         validationReport:
     *                           type: object
     *                         issues:
     *                           type: array
     *                           items:
     *                             type: string
     *                     translationDetails:
     *                       type: object
     *                       properties:
     *                         sourceLanguage:
     *                           type: string
     *                         targetLanguage:
     *                           type: string
     *                         translatedSlides:
     *                           type: number
     *                         translatedElements:
     *                           type: number
     *                         qualityScore:
     *                           type: number
     *                         processingTimeMs:
     *                           type: number
     *                 meta:
     *                   $ref: '#/components/schemas/SuccessMeta'
     *       400:
     *         $ref: '#/components/responses/ValidationError'
     *       503:
     *         $ref: '#/components/responses/ServiceUnavailable'
     */
    router.post(
      '/translate-enhanced',
      handleAsyncErrors(enhancedAIController.translateEnhanced)
    );

    /**
     * @swagger
     * /suggestions-enhanced:
     *   post:
     *     tags:
     *       - Enhanced AI
     *     summary: Generate schema-aware content suggestions
     *     description: |
     *       Generate intelligent content suggestions with Universal Schema optimization.
     *       This endpoint analyzes presentation structure and content to provide
     *       actionable recommendations that improve both content quality and schema compliance.
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               presentationData:
     *                 $ref: '#/components/schemas/UniversalPresentation'
     *                 description: Universal Schema presentation data
     *               context:
     *                 type: string
     *                 description: Context for generating suggestions
     *                 example: "Improve this sales presentation for executive audience"
     *               maxSuggestions:
     *                 type: number
     *                 minimum: 1
     *                 maximum: 20
     *                 default: 10
     *                 description: Maximum number of suggestions to generate
     *               focusAreas:
     *                 type: array
     *                 items:
     *                   type: string
     *                   enum: [structure, content, schema, accessibility]
     *                 default: [structure, content, accessibility]
     *                 description: Areas to focus suggestions on
     *               includeSchemaOptimizations:
     *                 type: boolean
     *                 default: true
     *                 description: Include Universal Schema optimizations
     *             required:
     *               - presentationData
     *               - context
     *           examples:
     *             sales:
     *               summary: Improve sales presentation
     *               value:
     *                 presentationData:
     *                   metadata:
     *                     title: "Product Sales Pitch"
     *                     slideCount: 8
     *                   slides: []
     *                 context: "Improve this sales presentation for executive audience"
     *                 maxSuggestions: 8
     *                 focusAreas: ["structure", "content"]
     *             accessibility:
     *               summary: Focus on accessibility improvements
     *               value:
     *                 presentationData:
     *                   metadata:
     *                     title: "Company Training"
     *                     slideCount: 15
     *                   slides: []
     *                 context: "Make this training presentation more accessible"
     *                 focusAreas: ["accessibility", "schema"]
     *                 includeSchemaOptimizations: true
     *     responses:
     *       200:
     *         description: Suggestions generated successfully
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
     *                     suggestions:
     *                       type: array
     *                       items:
     *                         type: object
     *                         properties:
     *                           id:
     *                             type: string
     *                           category:
     *                             type: string
     *                             enum: [structure, content, schema, accessibility, design]
     *                           priority:
     *                             type: string
     *                             enum: [low, medium, high, critical]
     *                           title:
     *                             type: string
     *                           description:
     *                             type: string
     *                           implementation:
     *                             type: string
     *                           impact:
     *                             type: string
     *                           effort:
     *                             type: string
     *                             enum: [low, medium, high]
     *                           slideIndex:
     *                             type: number
     *                             description: Specific slide affected (optional)
     *                     summary:
     *                       type: object
     *                       properties:
     *                         totalSuggestions:
     *                           type: number
     *                         byCategory:
     *                           type: object
     *                           additionalProperties:
     *                             type: number
     *                         byPriority:
     *                           type: object
     *                           additionalProperties:
     *                             type: number
     *                         overallScore:
     *                           type: number
     *                           description: Presentation quality score (0-100)
     *                     schemaOptimizations:
     *                       type: array
     *                       items:
     *                         type: object
     *                         properties:
     *                           type:
     *                             type: string
     *                           description:
     *                             type: string
     *                           benefit:
     *                             type: string
     *                           implementation:
     *                             type: string
     *                 meta:
     *                   $ref: '#/components/schemas/SuccessMeta'
     *       400:
     *         $ref: '#/components/responses/ValidationError'
     *       503:
     *         $ref: '#/components/responses/ServiceUnavailable'
     */
    router.post(
      '/suggestions-enhanced',
      handleAsyncErrors(enhancedAIController.generateEnhancedSuggestions)
    );

    /**
     * @swagger
     * /ai-health-enhanced:
     *   get:
     *     tags:
     *       - Enhanced AI
     *     summary: Enhanced AI services health check
     *     description: |
     *       Check the health and availability of enhanced AI services including
     *       OpenAI connectivity, schema validation, and service performance metrics.
     *     responses:
     *       200:
     *         description: Enhanced AI services are healthy
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
     *                       example: "healthy"
     *                     services:
     *                       type: object
     *                       properties:
     *                         openai:
     *                           type: object
     *                           properties:
     *                             status:
     *                               type: string
     *                               enum: [healthy, degraded, unhealthy]
     *                             responseTime:
     *                               type: number
     *                               description: Response time in milliseconds
     *                             model:
     *                               type: string
     *                               description: Current AI model
     *                             tokensUsed:
     *                               type: number
     *                               description: Tokens used in last request
     *                         schemaValidator:
     *                           type: object
     *                           properties:
     *                             status:
     *                               type: string
     *                               enum: [healthy, degraded, unhealthy]
     *                             version:
     *                               type: string
     *                               description: Schema version
     *                     capabilities:
     *                       type: array
     *                       items:
     *                         type: string
     *                       example: ["analysis", "translation", "suggestions", "schema-optimization"]
     *                     performance:
     *                       type: object
     *                       properties:
     *                         averageResponseTime:
     *                           type: number
     *                           description: Average response time in milliseconds
     *                         requestsLast24h:
     *                           type: number
     *                           description: Requests processed in last 24 hours
     *                         successRate:
     *                           type: number
     *                           description: Success rate percentage
     *                         errorRate:
     *                           type: number
     *                           description: Error rate percentage
     *                 meta:
     *                   $ref: '#/components/schemas/SuccessMeta'
     *       503:
     *         description: Enhanced AI services are unavailable
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ErrorResponse'
     */
    router.get(
      '/ai-health-enhanced',
      handleAsyncErrors(enhancedAIController.getEnhancedHealthStatus)
    );

  } catch (error) {
    console.error('Failed to initialize enhanced AI routes:', error);
    
    // Return a router with error endpoints
    router.all('*', (req, res) => {
      res.status(503).json({
        success: false,
        error: 'Enhanced AI services unavailable',
        message: 'Enhanced AI features are currently unavailable due to configuration issues',
        meta: {
          timestamp: new Date().toISOString(),
          service: 'enhanced-ai',
        },
      });
    });
  }

  return router;
}

// =============================================================================
// LEGACY COMPATIBILITY ROUTES
// =============================================================================

export function createLegacyEnhancedAIRoutes async (): Router {
  const router = Router();

  try {
    if (!process.env.OPENAI_API_KEY) {
      return router; // Return empty router if OpenAI not configured
    }

    const openaiAdapter = new OpenAIAdapter({
      apiKey: process.env.OPENAI_API_KEY,
      organizationId: process.env.OPENAI_ORGANIZATION_ID,
      baseURL: process.env.OPENAI_BASE_URL,
    });

    const enhancedAIController = new EnhancedAIController(openaiAdapter);

    // Legacy routes with /api prefix for backward compatibility
    router.post(
      '/api/analyze-enhanced',
      handleAsyncErrors(enhancedAIController.analyzeEnhanced)
    );

    router.post(
      '/api/translate-enhanced',
      handleAsyncErrors(enhancedAIController.translateEnhanced)
    );

    router.post(
      '/api/suggestions-enhanced',
      handleAsyncErrors(enhancedAIController.generateEnhancedSuggestions)
    );

    router.get(
      '/api/ai-health-enhanced',
      handleAsyncErrors(enhancedAIController.getEnhancedHealthStatus)
    );

  } catch (error) {
    console.error('Failed to initialize legacy enhanced AI routes:', error);
  }

  return router;
} 