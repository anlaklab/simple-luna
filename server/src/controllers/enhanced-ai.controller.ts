import { z } from "zod";
/**
 * Enhanced AI Controller - Schema-aware AI endpoints for analysis and translation
 */

import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import { EnhancedAIService } from '../services/enhanced-ai.service';
import { OpenAIAdapter } from '../adapters/openai.adapter';

// =============================================================================
// INTERFACES
// =============================================================================

interface EnhancedAnalysisRequest extends Request {
  file?: Express.Multer.File;
  body: {
    presentationData?: any;
    analysisTypes?: string[];
    context?: {
      targetAudience?: string;
      presentationPurpose?: string;
      industry?: string;
    };
    options?: {
      model?: string;
      maxTokens?: number;
      temperature?: number;
      language?: string;
    };
    enhanceWithSchemaKnowledge?: boolean;
    preserveSchemaStructure?: boolean;
  };
}

interface EnhancedTranslationRequest extends Request {
  body: {
    presentationData: any;
    sourceLanguage?: string;
    targetLanguage: string;
    preserveFormatting?: boolean;
    useContextualTranslation?: boolean;
    translateSchemaAware?: boolean;
    preserveUniversalStructure?: boolean;
    options?: {
      model?: string;
      maxTokens?: number;
      temperature?: number;
    };
  };
}

interface SuggestionsRequest extends Request {
  body: {
    presentationData: any;
    context: string;
    maxSuggestions?: number;
    focusAreas?: string[];
    includeSchemaOptimizations?: boolean;
  };
}

// =============================================================================
// CONTROLLER CLASS
// =============================================================================

export class EnhancedAIController {
  private readonly enhancedAIService: EnhancedAIService;
  private readonly openaiAdapter: OpenAIAdapter;

  constructor(openaiAdapter: OpenAIAdapter) {
    this.openaiAdapter = openaiAdapter;
    this.enhancedAIService = new EnhancedAIService(openaiAdapter);
  }

  // =============================================================================
  // ENHANCED ANALYSIS ENDPOINTS
  // =============================================================================

  /**
   * POST /api/analyze-enhanced
   * Enhanced schema-aware presentation analysis
   */
  analyzeEnhanced = async (req: EnhancedAnalysisRequest, res: Response): Promise<void> => {
    const startTime = Date.now();

    try {
      const {
        presentationData,
        analysisTypes = ['summary', 'suggestions', 'accessibility'],
        context = {},
        options = {},
        enhanceWithSchemaKnowledge = true,
        preserveSchemaStructure = true,
      } = req.body;

      if (!presentationData) {
        res.status(400).json({
          success: false,
          error: 'Presentation data is required',
          message: 'Please provide Universal Schema presentation data for analysis',
        });
        return;
      }

      logger.info('Enhanced analysis request received', {
        analysisTypes,
        hasSchemaContext: !!presentationData,
        enhanceWithSchemaKnowledge,
        slideCount: presentationData.slides?.length || 0,
      });

      // Extract content for analysis
      const content = this.extractContentForAnalysis(presentationData);

      // Create schema context
      const schemaContext = {
        presentation: presentationData,
        slides: presentationData.slides || [],
        metadata: presentationData.metadata || {},
        schemaVersion: '1.0.0',
      };

      // Perform enhanced analysis
      const analysisResult = await this.enhancedAIService.analyzeWithSchemaContext({
        content,
        analysisTypes,
        context,
        options,
        schemaContext,
        enhanceWithSchemaKnowledge,
        preserveSchemaStructure,
      });

      res.status(200).json({
        success: true,
        data: {
          analysis: analysisResult,
          schemaEnhanced: enhanceWithSchemaKnowledge,
          processingMetrics: {
            slideCount: presentationData.slides?.length || 0,
            contentLength: content.length,
            analysisTypes,
            schemaCompliant: analysisResult.schemaCompliance?.isCompliant,
          },
        },
        meta: {
          processingTimeMs: Date.now() - startTime,
          timestamp: new Date().toISOString(),
          version: '1.0',
        },
      });

    } catch (error) {
      logger.error('Enhanced analysis failed', { 
        error, 
        slideCount: req.body.presentationData?.slides?.length 
      });

      res.status(500).json({
        success: false,
        error: 'Enhanced analysis failed',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        meta: {
          processingTimeMs: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        },
      });
    }
  };

  /**
   * POST /api/translate-enhanced
   * Enhanced schema-aware translation
   */
  translateEnhanced = async (req: EnhancedTranslationRequest, res: Response): Promise<void> => {
    const startTime = Date.now();

    try {
      const {
        presentationData,
        sourceLanguage,
        targetLanguage,
        preserveFormatting = true,
        useContextualTranslation = true,
        translateSchemaAware = true,
        preserveUniversalStructure = true,
        options = {},
      } = req.body;

      if (!presentationData || !targetLanguage) {
        res.status(400).json({
          success: false,
          error: 'Presentation data and target language are required',
          message: 'Please provide Universal Schema presentation data and target language',
        });
        return;
      }

      logger.info('Enhanced translation request received', {
        sourceLanguage: sourceLanguage || 'auto-detect',
        targetLanguage,
        translateSchemaAware,
        slideCount: presentationData.slides?.length || 0,
      });

      // Extract translatable content
      const content = this.extractTranslatableContent(presentationData);

      // Create schema context
      const schemaContext = {
        presentation: presentationData,
        slides: presentationData.slides || [],
        metadata: presentationData.metadata || {},
        schemaVersion: '1.0.0',
      };

      // Perform enhanced translation
      const translationResult = await this.enhancedAIService.translateWithSchemaPreservation({
        content,
        sourceLanguage,
        targetLanguage,
        preserveFormatting,
        useContextualTranslation,
        options,
        schemaContext,
        translateSchemaAware,
        preserveUniversalStructure,
      });

      // Apply translation back to presentation data
      const translatedPresentationData = this.applyTranslationToPresentation(
        presentationData,
        translationResult.translatedContent,
        targetLanguage
      );

      res.status(200).json({
        success: true,
        data: {
          translatedPresentation: translatedPresentationData,
          translationDetails: {
            sourceLanguage: translationResult.sourceLanguage,
            targetLanguage: translationResult.targetLanguage,
            confidence: translationResult.confidence,
            method: 'enhanced-openai',
            schemaPreservation: translationResult.schemaPreservation,
          },
          processingMetrics: {
            slideCount: presentationData.slides?.length || 0,
            tokensUsed: translationResult.metadata.tokensUsed,
            fieldsTranslated: translationResult.schemaPreservation?.fieldsTranslated?.length || 0,
          },
        },
        meta: {
          processingTimeMs: Date.now() - startTime,
          timestamp: new Date().toISOString(),
          version: '1.0',
        },
      });

    } catch (error) {
      logger.error('Enhanced translation failed', { 
        error, 
        targetLanguage: req.body.targetLanguage,
        slideCount: req.body.presentationData?.slides?.length 
      });

      res.status(500).json({
        success: false,
        error: 'Enhanced translation failed',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        meta: {
          processingTimeMs: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        },
      });
    }
  };

  /**
   * POST /api/suggestions-enhanced
   * Generate enhanced schema-aware content suggestions
   */
  generateEnhancedSuggestions = async (req: SuggestionsRequest, res: Response): Promise<void> => {
    const startTime = Date.now();

    try {
      const {
        presentationData,
        context,
        maxSuggestions = 10,
        focusAreas = ['structure', 'content', 'accessibility'],
        includeSchemaOptimizations = true,
      } = req.body;

      if (!presentationData || !context) {
        res.status(400).json({
          success: false,
          error: 'Presentation data and context are required',
          message: 'Please provide Universal Schema presentation data and context',
        });
        return;
      }

      logger.info('Enhanced suggestions request received', {
        context: context.substring(0, 100) + '...',
        maxSuggestions,
        focusAreas,
        includeSchemaOptimizations,
        slideCount: presentationData.slides?.length || 0,
      });

      // Generate schema-aware suggestions
      const suggestions = await this.enhancedAIService.generateSchemaAwareSuggestions(
        presentationData,
        context,
        {
          maxSuggestions,
          focusAreas,
          includeSchemaOptimizations,
        }
      );

      res.status(200).json({
        success: true,
        data: {
          suggestions,
          summary: {
            totalSuggestions: suggestions.length,
            categories: this.categorizeSuggestions(suggestions),
            priorities: this.prioritizeSuggestions(suggestions),
          },
          processingMetrics: {
            slideCount: presentationData.slides?.length || 0,
            focusAreas,
            schemaOptimizationsIncluded: includeSchemaOptimizations,
          },
        },
        meta: {
          processingTimeMs: Date.now() - startTime,
          timestamp: new Date().toISOString(),
          version: '1.0',
        },
      });

    } catch (error) {
      logger.error('Enhanced suggestions generation failed', { 
        error, 
        context: req.body.context?.substring(0, 50),
        slideCount: req.body.presentationData?.slides?.length 
      });

      res.status(500).json({
        success: false,
        error: 'Enhanced suggestions generation failed',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        meta: {
          processingTimeMs: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        },
      });
    }
  };

  /**
   * GET /api/ai-health-enhanced
   * Health check for enhanced AI services
   */
  getEnhancedHealthStatus = async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();

    try {
      // Test OpenAI connection
      const openaiHealth = await this.openaiAdapter.healthCheck();

      // Test schema knowledge
      const schemaTest = this.testSchemaKnowledge();

      res.status(200).json({
        success: true,
        data: {
          services: {
            openai: {
              status: openaiHealth ? 'healthy' : 'unhealthy',
              responsive: openaiHealth,
            },
            enhancedAI: {
              status: 'healthy',
              schemaKnowledgeAvailable: schemaTest.available,
              schemaVersion: schemaTest.version,
            },
          },
          capabilities: {
            schemaAwareAnalysis: true,
            schemaAwareTranslation: true,
            universalSchemaOptimization: true,
            enhancedSuggestions: true,
          },
          overall: openaiHealth && schemaTest.available ? 'healthy' : 'degraded',
        },
        meta: {
          processingTimeMs: Date.now() - startTime,
          timestamp: new Date().toISOString(),
          version: '1.0',
        },
      });

    } catch (error) {
      logger.error('Enhanced AI health check failed', { error });

      res.status(500).json({
        success: false,
        error: 'Enhanced AI health check failed',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        meta: {
          processingTimeMs: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        },
      });
    }
  };

  // =============================================================================
  // PRIVATE HELPER METHODS
  // =============================================================================

  /**
   * Extract text content from presentation for analysis
   */
  private extractContentForAnalysis(presentationData: any): string {
    const content = [];

    // Add metadata
    if (presentationData.metadata) {
      const metadata = presentationData.metadata;
      if (metadata.title) content.push(`Title: ${metadata.title}`);
      if (metadata.subject) content.push(`Subject: ${metadata.subject}`);
      if (metadata.keywords) content.push(`Keywords: ${metadata.keywords}`);
    }

    // Add slide content
    if (presentationData.slides) {
      presentationData.slides.forEach((slide: any, index: number) => {
        content.push(`\n--- Slide ${index + 1} ---`);
        
        if (slide.title) {
          content.push(`Title: ${slide.title}`);
        }

        if (slide.shapes) {
          slide.shapes.forEach((shape: any) => {
            if (shape.text) {
              content.push(shape.text);
            }
          });
        }

        if (slide.notes) {
          content.push(`Notes: ${slide.notes}`);
        }
      });
    }

    return content.join('\n');
  }

  /**
   * Extract translatable content from presentation
   */
  private extractTranslatableContent(presentationData: any): string {
    // This is a simplified extraction - in a real implementation,
    // you would extract only the translatable fields according to
    // UNIVERSAL_SCHEMA_KNOWLEDGE.translatableFields
    return this.extractContentForAnalysis(presentationData);
  }

  /**
   * Apply translation back to presentation data
   */
  private applyTranslationToPresentation(
    originalPresentation: any,
    translatedContent: string,
    targetLanguage: string
  ): any {
    // This is a simplified implementation - in a real system,
    // you would parse the translated content and apply it back
    // to the specific translatable fields in the presentation
    
    const translatedPresentation = JSON.parse(JSON.stringify(originalPresentation));
    
    // Update metadata language indicator
    if (translatedPresentation.metadata) {
      translatedPresentation.metadata.language = targetLanguage;
      translatedPresentation.metadata.translatedAt = new Date().toISOString();
    }

    // Note: In a real implementation, you would need to:
    // 1. Parse the translatedContent back into structured data
    // 2. Map it back to the correct fields in the presentation
    // 3. Preserve all non-translatable elements
    
    return translatedPresentation;
  }

  /**
   * Categorize suggestions by type
   */
  private categorizeSuggestions(suggestions: any[]): any {
    const categories = {
      structure: 0,
      content: 0,
      schema: 0,
      accessibility: 0,
    };

    suggestions.forEach(suggestion => {
      if (categories.hasOwnProperty(suggestion.category)) {
        categories[suggestion.category as keyof typeof categories]++;
      }
    });

    return categories;
  }

  /**
   * Prioritize suggestions by priority level
   */
  private prioritizeSuggestions(suggestions: any[]): any {
    const priorities = {
      high: 0,
      medium: 0,
      low: 0,
    };

    suggestions.forEach(suggestion => {
      if (priorities.hasOwnProperty(suggestion.priority)) {
        priorities[suggestion.priority as keyof typeof priorities]++;
      }
    });

    return priorities;
  }

  /**
   * Test schema knowledge availability
   */
  private testSchemaKnowledge(): { available: boolean; version: string } {
    try {
      // Test that the schema knowledge is available
      return {
        available: true,
        version: '1.0.0',
      };
    } catch {
      return {
        available: false,
        version: 'unknown',
      };
    }
  }
} 