/**
 * OpenAI Adapter - Clean abstraction over OpenAI SDK
 * 
 * Provides AI-powered analysis, translation, and content generation
 */

import OpenAI from 'openai';
import { logger } from '../utils/logger';

export interface OpenAIConfig {
  apiKey: string;
  organizationId?: string;
  baseURL?: string;
  defaultModel?: string;
  defaultMaxTokens?: number;
  defaultTemperature?: number;
}

export interface AnalysisRequest {
  content: string;
  analysisTypes: string[];
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
}

export interface TranslationRequest {
  content: string;
  sourceLanguage?: string;
  targetLanguage: string;
  preserveFormatting?: boolean;
  useContextualTranslation?: boolean;
  customPrompt?: string;
  options?: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
  };
}

export interface AnalysisResult {
  summary?: {
    title?: string;
    overview: string;
    keyPoints: string[];
    slideCount: number;
    estimatedDuration?: string;
  };
  tags?: Array<{
    tag: string;
    confidence: number;
    category?: string;
  }>;
  topics?: Array<{
    topic: string;
    relevance: number;
    slideReferences: number[];
  }>;
  sentiment?: {
    overall: 'positive' | 'neutral' | 'negative';
    score: number;
    confidence: number;
    bySlide: Array<{
      slideIndex: number;
      sentiment: 'positive' | 'neutral' | 'negative';
      score: number;
    }>;
  };
  readability?: {
    overallScore: number;
    level: string;
    averageWordsPerSlide: number;
    complexSentences: number;
    recommendations: string[];
  };
  suggestions?: Array<{
    type: string;
    priority: string;
    title: string;
    description: string;
    affectedSlides?: number[];
    implementation?: string;
  }>;
  accessibility?: {
    score: number;
    issues: Array<{
      type: string;
      severity: string;
      description: string;
      slideIndex?: number;
      recommendation: string;
    }>;
    compliance: {
      wcag2_1: string;
      section508: boolean;
    };
  };
  designCritique?: {
    overallRating: number;
    aspects: {
      layout: number;
      typography: number;
      colorScheme: number;
      consistency: number;
      visualHierarchy: number;
    };
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
  };
  contentOptimization?: {
    wordCount: {
      total: number;
      bySlide: number[];
      recommendation: string;
    };
    slideStructure: {
      hasTitle: boolean;
      hasConclusion: boolean;
      logicalFlow: number;
      recommendations: string[];
    };
    engagement: {
      interactiveElements: number;
      visualElements: number;
      callsToAction: number;
      recommendations: string[];
    };
  };
  audienceTargeting?: {
    identifiedAudience?: string;
    targetingScore: number;
    recommendations: string[];
    contentAlignment: {
      technicalLevel: string;
      formalityLevel: string;
      industryAlignment?: string;
    };
  };
}

export interface TranslationResult {
  translatedContent: string;
  sourceLanguage: string;
  targetLanguage: string;
  confidence: number;
  translationMethod: 'openai';
  metadata: {
    model: string;
    tokensUsed: number;
    processingTimeMs: number;
  };
}

export interface UsageMetrics {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  model: string;
  cost?: number;
}

export class OpenAIAdapter {
  private readonly client: OpenAI;
  private readonly config: OpenAIConfig;

  constructor(config: OpenAIConfig) {
    this.config = {
      defaultModel: 'gpt-4-turbo-preview',
      defaultMaxTokens: 2000,
      defaultTemperature: 0.7,
      ...config,
    };

    this.client = new OpenAI({
      apiKey: config.apiKey,
      organization: config.organizationId,
      baseURL: config.baseURL,
    });

    logger.info('OpenAI adapter initialized', {
      model: this.config.defaultModel,
      hasOrganization: !!config.organizationId,
    });
  }

  // =============================================================================
  // ANALYSIS METHODS
  // =============================================================================

  /**
   * Analyze presentation content using AI
   */
  async analyzePresentation(request: AnalysisRequest): Promise<AnalysisResult> {
    try {
      const startTime = Date.now();
      const {
        content,
        analysisTypes,
        context = {},
        options = {},
      } = request;

      const model = options.model || this.config.defaultModel!;
      const maxTokens = options.maxTokens || this.config.defaultMaxTokens!;
      const temperature = options.temperature || this.config.defaultTemperature!;

      const systemPrompt = this.buildAnalysisSystemPrompt(analysisTypes, context);
      const userPrompt = this.buildAnalysisUserPrompt(content, analysisTypes);

      const response = await this.client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: maxTokens,
        temperature,
        response_format: { type: 'json_object' },
      });

      const result = response.choices[0]?.message?.content;
      if (!result) {
        throw new Error('No response from OpenAI');
      }

      const analysis = JSON.parse(result) as AnalysisResult;
      
      const processingTime = Date.now() - startTime;

      logger.info('Presentation analysis completed', {
        analysisTypes,
        model,
        tokensUsed: response.usage?.total_tokens || 0,
        processingTimeMs: processingTime,
      });

      return analysis;
    } catch (error) {
      logger.error('Presentation analysis failed', { error, request });
      throw error;
    }
  }

  /**
   * Translate presentation content
   */
  async translateContent(request: TranslationRequest): Promise<TranslationResult> {
    try {
      const startTime = Date.now();
      const {
        content,
        sourceLanguage,
        targetLanguage,
        preserveFormatting = true,
        useContextualTranslation = true,
        customPrompt,
        options = {},
      } = request;

      const model = options.model || this.config.defaultModel!;
      const maxTokens = options.maxTokens || this.config.defaultMaxTokens!;
      const temperature = options.temperature || 0.3; // Lower temperature for translation

      const systemPrompt = this.buildTranslationSystemPrompt(
        sourceLanguage,
        targetLanguage,
        preserveFormatting,
        useContextualTranslation,
        customPrompt
      );

      const response = await this.client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: content },
        ],
        max_tokens: maxTokens,
        temperature,
      });

      const translatedContent = response.choices[0]?.message?.content;
      if (!translatedContent) {
        throw new Error('No translation response from OpenAI');
      }

      const processingTime = Date.now() - startTime;

      const result: TranslationResult = {
        translatedContent,
        sourceLanguage: sourceLanguage || 'auto-detected',
        targetLanguage,
        confidence: 0.9, // OpenAI doesn't provide confidence scores
        translationMethod: 'openai',
        metadata: {
          model,
          tokensUsed: response.usage?.total_tokens || 0,
          processingTimeMs: processingTime,
        },
      };

      logger.info('Content translation completed', {
        sourceLanguage: result.sourceLanguage,
        targetLanguage,
        model,
        tokensUsed: result.metadata.tokensUsed,
        processingTimeMs: processingTime,
      });

      return result;
    } catch (error) {
      logger.error('Content translation failed', { error, request });
      throw error;
    }
  }

  /**
   * Generate content suggestions
   */
  async generateSuggestions(
    content: string,
    context: string,
    maxSuggestions: number = 5
  ): Promise<string[]> {
    try {
      const systemPrompt = `You are an expert presentation consultant. Generate practical, actionable suggestions to improve the given presentation content. Focus on clarity, engagement, and effectiveness. Return only an array of suggestion strings.`;

      const userPrompt = `Context: ${context}\n\nContent to improve:\n${content}\n\nProvide ${maxSuggestions} specific suggestions for improvement.`;

      const response = await this.client.chat.completions.create({
        model: this.config.defaultModel!,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 1000,
        temperature: 0.8,
      });

      const result = response.choices[0]?.message?.content;
      if (!result) {
        return [];
      }

      // Parse the response as a JSON array or split by lines
      try {
        const suggestions = JSON.parse(result);
        return Array.isArray(suggestions) ? suggestions : [result];
      } catch {
        // If not JSON, split by lines and clean up
        return result
          .split('\n')
          .map(line => line.trim())
          .filter(line => line && !line.match(/^\d+\./))
          .slice(0, maxSuggestions);
      }
    } catch (error) {
      logger.error('Generate suggestions failed', { error, content: content.substring(0, 100) });
      return [];
    }
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  /**
   * Test the OpenAI connection
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 5,
      });

      return !!response.choices[0]?.message?.content;
    } catch (error) {
      logger.error('OpenAI health check failed', { error });
      return false;
    }
  }

  /**
   * Get usage metrics from the last request
   */
  getUsageMetrics(response: OpenAI.Chat.Completions.ChatCompletion): UsageMetrics | null {
    if (!response.usage) {
      return null;
    }

    return {
      promptTokens: response.usage.prompt_tokens,
      completionTokens: response.usage.completion_tokens,
      totalTokens: response.usage.total_tokens,
      model: response.model,
    };
  }

  // =============================================================================
  // PRIVATE HELPER METHODS
  // =============================================================================

  private buildAnalysisSystemPrompt(analysisTypes: string[], context: any): string {
    const basePrompt = `You are an expert presentation analyst. Analyze the given presentation content and provide insights based on the requested analysis types. Always respond with valid JSON.`;

    let specificInstructions = '';

    if (analysisTypes.includes('summary')) {
      specificInstructions += `
- summary: Provide a concise overview with title, key points, and estimated presentation duration.`;
    }

    if (analysisTypes.includes('tags')) {
      specificInstructions += `
- tags: Extract relevant tags with confidence scores (0-1) and categories.`;
    }

    if (analysisTypes.includes('sentiment')) {
      specificInstructions += `
- sentiment: Analyze the overall sentiment and provide scores (-1 to 1).`;
    }

    if (analysisTypes.includes('readability')) {
      specificInstructions += `
- readability: Assess readability level and provide improvement recommendations.`;
    }

    if (analysisTypes.includes('suggestions')) {
      specificInstructions += `
- suggestions: Provide actionable improvement suggestions with priorities.`;
    }

    if (analysisTypes.includes('accessibility')) {
      specificInstructions += `
- accessibility: Evaluate accessibility compliance and identify issues.`;
    }

    const contextInfo = context.targetAudience || context.presentationPurpose || context.industry
      ? `\n\nContext: Target audience: ${context.targetAudience || 'General'}, Purpose: ${context.presentationPurpose || 'General presentation'}, Industry: ${context.industry || 'General'}`
      : '';

    return `${basePrompt}${specificInstructions}${contextInfo}

Response format: Return a JSON object with only the requested analysis types as keys.`;
  }

  private buildAnalysisUserPrompt(content: string, analysisTypes: string[]): string {
    return `Please analyze this presentation content for: ${analysisTypes.join(', ')}.

Content:
${content}

Provide your analysis in the requested JSON format.`;
  }

  private buildTranslationSystemPrompt(
    sourceLanguage?: string,
    targetLanguage?: string,
    preserveFormatting?: boolean,
    useContextualTranslation?: boolean,
    customPrompt?: string
  ): string {
    if (customPrompt) {
      return customPrompt;
    }

    const sourceInfo = sourceLanguage ? `from ${sourceLanguage}` : 'auto-detecting the source language';
    const formattingInfo = preserveFormatting ? 'Preserve all formatting, structure, and layout.' : '';
    const contextInfo = useContextualTranslation ? 'Use contextual understanding to maintain meaning and tone.' : '';

    return `You are a professional translator specializing in presentation content. Translate the given text ${sourceInfo} to ${targetLanguage}.

Guidelines:
- Maintain professional tone and presentation style
- Keep technical terms accurate
- ${formattingInfo}
- ${contextInfo}
- Return only the translated content, no explanations

Target language: ${targetLanguage}`;
  }
}

export default OpenAIAdapter; 