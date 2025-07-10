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

export function createEnhancedAIRoutes(): Router {
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
     * POST /analyze-enhanced
     * Enhanced schema-aware presentation analysis
     */
    router.post(
      '/analyze-enhanced',
      handleAsyncErrors(enhancedAIController.analyzeEnhanced)
    );

    /**
     * POST /translate-enhanced
     * Enhanced schema-aware translation
     */
    router.post(
      '/translate-enhanced',
      handleAsyncErrors(enhancedAIController.translateEnhanced)
    );

    /**
     * POST /suggestions-enhanced
     * Generate enhanced schema-aware content suggestions
     */
    router.post(
      '/suggestions-enhanced',
      handleAsyncErrors(enhancedAIController.generateEnhancedSuggestions)
    );

    /**
     * GET /ai-health-enhanced
     * Health check for enhanced AI services
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

export function createLegacyEnhancedAIRoutes(): Router {
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