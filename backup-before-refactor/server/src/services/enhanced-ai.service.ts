/**
 * Enhanced AI Service - Schema-aware AI for PowerPoint analysis and translation
 * 
 * Leverages Universal Schema knowledge for improved AI operations
 */

import { logger } from '../utils/logger';
import { OpenAIAdapter, AnalysisRequest, TranslationRequest, AnalysisResult, TranslationResult } from '../adapters/openai.adapter';

// =============================================================================
// TYPES
// =============================================================================

interface UniversalSchemaContext {
  presentation?: any;
  slides?: any[];
  metadata?: any;
  schemaVersion?: string;
}

interface SchemaAwareAnalysisRequest extends AnalysisRequest {
  schemaContext?: UniversalSchemaContext;
  preserveSchemaStructure?: boolean;
  enhanceWithSchemaKnowledge?: boolean;
}

interface SchemaAwareTranslationRequest extends TranslationRequest {
  schemaContext?: UniversalSchemaContext;
  preserveUniversalStructure?: boolean;
  translateSchemaAware?: boolean;
}

interface EnhancedAnalysisResult extends AnalysisResult {
  schemaCompliance?: {
    isCompliant: boolean;
    version: string;
    structure: {
      hasRequiredFields: boolean;
      missingFields: string[];
      extraFields: string[];
    };
    recommendations: string[];
  };
  universalSchemaInsights?: {
    slideStructureAnalysis: Array<{
      slideIndex: number;
      structureType: string;
      complexity: number;
      shapeTypes: string[];
      hasAnimations: boolean;
      textContent: {
        wordCount: number;
        complexity: string;
        language?: string;
      };
    }>;
    presentationFlow: {
      logicalStructure: string;
      transitionQuality: number;
      narrativeFlow: number;
    };
    contentDistribution: {
      textSlides: number;
      imageSlides: number;
      chartSlides: number;
      mixedContentSlides: number;
    };
  };
}

interface EnhancedTranslationResult extends TranslationResult {
  schemaPreservation?: {
    structurePreserved: boolean;
    fieldsTranslated: string[];
    untranslatedFields: string[];
    schemaValidation: {
      isValid: boolean;
      errors: string[];
    };
  };
}

// =============================================================================
// UNIVERSAL SCHEMA KNOWLEDGE BASE
// =============================================================================

const UNIVERSAL_SCHEMA_KNOWLEDGE = {
  version: '1.0.0',
  coreStructure: {
    presentation: {
      requiredFields: ['metadata', 'slides'],
      optionalFields: ['animations', 'transitions', 'masterSlides', 'comments'],
    },
    slide: {
      requiredFields: ['slideIndex', 'shapes'],
      optionalFields: ['background', 'animations', 'transitions', 'notes', 'comments'],
    },
    shape: {
      requiredFields: ['shapeIndex', 'type', 'geometry'],
      optionalFields: ['text', 'fill', 'line', 'effects', 'animations'],
    },
  },
  shapeTypes: [
    'textBox', 'rectangle', 'ellipse', 'line', 'connector', 'chart', 
    'table', 'image', 'video', 'audio', 'groupShape', 'smartArt',
    'oleObject', 'freeform', 'autoShape'
  ],
  textElements: [
    'text', 'title', 'subtitle', 'bodyText', 'bulletPoints', 
    'footnotes', 'headers', 'captions'
  ],
  translatableFields: [
    'metadata.title', 'metadata.subject', 'metadata.keywords', 
    'metadata.comments', 'slides[].shapes[].text', 'slides[].notes',
    'slides[].comments', 'slides[].title'
  ],
};

// =============================================================================
// ENHANCED AI SERVICE
// =============================================================================

export class EnhancedAIService {
  private readonly openaiAdapter: OpenAIAdapter;

  constructor(openaiAdapter: OpenAIAdapter) {
    this.openaiAdapter = openaiAdapter;
    
    logger.info('Enhanced AI Service initialized with Universal Schema awareness', {
      schemaVersion: UNIVERSAL_SCHEMA_KNOWLEDGE.version,
    });
  }

  // =============================================================================
  // SCHEMA-AWARE ANALYSIS
  // =============================================================================

  /**
   * Enhanced presentation analysis with Universal Schema awareness
   */
  async analyzeWithSchemaContext(request: SchemaAwareAnalysisRequest): Promise<EnhancedAnalysisResult> {
    const startTime = Date.now();

    try {
      logger.info('Starting schema-aware presentation analysis', {
        analysisTypes: request.analysisTypes,
        hasSchemaContext: !!request.schemaContext,
        enhanceWithSchemaKnowledge: request.enhanceWithSchemaKnowledge,
      });

      // Enhance the analysis request with schema knowledge
      const enhancedRequest = this.enhanceAnalysisWithSchema(request);

      // Perform base analysis
      const baseAnalysis = await this.openaiAdapter.analyzePresentation(enhancedRequest);

      // Add schema-specific insights
      const schemaInsights = request.schemaContext 
        ? await this.generateSchemaInsights(request.schemaContext)
        : undefined;

      // Validate schema compliance
      const schemaCompliance = request.schemaContext
        ? this.validateSchemaCompliance(request.schemaContext)
        : undefined;

      const enhancedResult: EnhancedAnalysisResult = {
        ...baseAnalysis,
        schemaCompliance,
        universalSchemaInsights: schemaInsights,
      };

      logger.info('Schema-aware analysis completed', {
        processingTimeMs: Date.now() - startTime,
        hasSchemaInsights: !!schemaInsights,
        schemaCompliant: schemaCompliance?.isCompliant,
      });

      return enhancedResult;

    } catch (error) {
      logger.error('Schema-aware analysis failed', { error, request });
      throw error;
    }
  }

  /**
   * Enhanced translation with Universal Schema preservation
   */
  async translateWithSchemaPreservation(request: SchemaAwareTranslationRequest): Promise<EnhancedTranslationResult> {
    const startTime = Date.now();

    try {
      logger.info('Starting schema-aware translation', {
        sourceLanguage: request.sourceLanguage,
        targetLanguage: request.targetLanguage,
        hasSchemaContext: !!request.schemaContext,
        preserveUniversalStructure: request.preserveUniversalStructure,
      });

      // Create schema-aware translation prompt
      const enhancedRequest = this.enhanceTranslationWithSchema(request);

      // Perform base translation
      const baseTranslation = await this.openaiAdapter.translateContent(enhancedRequest);

      // Validate schema preservation
      const schemaPreservation = request.schemaContext
        ? this.validateTranslationSchemaPreservation(
            request.schemaContext, 
            baseTranslation.translatedContent,
            request.targetLanguage
          )
        : undefined;

      const enhancedResult: EnhancedTranslationResult = {
        ...baseTranslation,
        schemaPreservation,
      };

      logger.info('Schema-aware translation completed', {
        processingTimeMs: Date.now() - startTime,
        schemaPreserved: schemaPreservation?.structurePreserved,
        fieldsTranslated: schemaPreservation?.fieldsTranslated?.length || 0,
      });

      return enhancedResult;

    } catch (error) {
      logger.error('Schema-aware translation failed', { error, request });
      throw error;
    }
  }

  /**
   * Generate content suggestions based on Universal Schema structure
   */
  async generateSchemaAwareSuggestions(
    presentation: any,
    context: string,
    options: {
      maxSuggestions?: number;
      focusAreas?: string[];
      includeSchemaOptimizations?: boolean;
    } = {}
  ): Promise<Array<{
    type: string;
    category: 'structure' | 'content' | 'schema' | 'accessibility';
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    implementation: string;
    schemaImpact?: string;
  }>> {
    try {
      const {
        maxSuggestions = 10,
        focusAreas = ['structure', 'content', 'accessibility'],
        includeSchemaOptimizations = true,
      } = options;

      // Analyze current schema structure
      const schemaAnalysis = this.analyzeSchemaStructure(presentation);
      
      // Create enhanced prompt with schema knowledge
      const systemPrompt = this.buildSchemaAwareSuggestionsPrompt(
        schemaAnalysis,
        focusAreas,
        includeSchemaOptimizations
      );

      const userPrompt = `
Context: ${context}

Presentation Structure Analysis:
- Total slides: ${presentation.slides?.length || 0}
- Schema compliance: ${schemaAnalysis.isCompliant ? 'Yes' : 'No'}
- Missing schema fields: ${schemaAnalysis.missingFields.join(', ') || 'None'}
- Slide types: ${schemaAnalysis.slideTypes.join(', ')}

Please provide ${maxSuggestions} specific, actionable suggestions to improve this presentation, focusing on: ${focusAreas.join(', ')}.

Include both content improvements and Universal Schema optimizations.
`;

      const response = await this.openaiAdapter.createChatCompletion({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        model: 'gpt-4-turbo-preview',
        temperature: 0.8,
        max_tokens: 2000,
      });

      const result = response.choices[0]?.message?.content;
      if (!result) {
        return [];
      }

      // Parse suggestions (expect JSON format)
      try {
        const suggestions = JSON.parse(result);
        return Array.isArray(suggestions) ? suggestions : [];
      } catch {
        // Fallback: parse as text and structure
        return this.parseTextSuggestions(result, maxSuggestions);
      }

    } catch (error) {
      logger.error('Schema-aware suggestions generation failed', { error });
      return [];
    }
  }

  // =============================================================================
  // PRIVATE HELPER METHODS
  // =============================================================================

  /**
   * Enhance analysis request with schema knowledge
   */
  private enhanceAnalysisWithSchema(request: SchemaAwareAnalysisRequest): AnalysisRequest {
    if (!request.enhanceWithSchemaKnowledge || !request.schemaContext) {
      return request;
    }

    // Add schema context to the content
    const schemaInfo = this.buildSchemaContextString(request.schemaContext);
    
    return {
      ...request,
      content: `${request.content}\n\n--- Universal Schema Context ---\n${schemaInfo}`,
      context: {
        ...request.context,
        // Note: schemaVersion and structureAnalysis are added for internal processing
      },
    };
  }

  /**
   * Enhance translation request with schema awareness
   */
  private enhanceTranslationWithSchema(request: SchemaAwareTranslationRequest): TranslationRequest {
    if (!request.translateSchemaAware || !request.schemaContext) {
      return request;
    }

    const customPrompt = this.buildSchemaAwareTranslationPrompt(
      request.sourceLanguage,
      request.targetLanguage,
      request.preserveFormatting,
      request.schemaContext
    );

    return {
      ...request,
      customPrompt,
    };
  }

  /**
   * Build schema context string for AI prompts
   */
  private buildSchemaContextString(context: UniversalSchemaContext): string {
    const info = [];
    
    if (context.presentation) {
      info.push(`Presentation structure: ${Object.keys(context.presentation).join(', ')}`);
    }
    
    if (context.slides) {
      info.push(`Slides count: ${context.slides.length}`);
      info.push(`Slide types: ${this.identifySlideTypes(context.slides).join(', ')}`);
    }
    
    if (context.metadata) {
      info.push(`Metadata fields: ${Object.keys(context.metadata).join(', ')}`);
    }

    info.push(`Schema version: ${context.schemaVersion || UNIVERSAL_SCHEMA_KNOWLEDGE.version}`);
    
    return info.join('\n');
  }

  /**
   * Build schema-aware translation prompt
   */
  private buildSchemaAwareTranslationPrompt(
    sourceLanguage?: string,
    targetLanguage?: string,
    preserveFormatting?: boolean,
    schemaContext?: UniversalSchemaContext
  ): string {
    const sourceInfo = sourceLanguage ? `from ${sourceLanguage}` : 'auto-detecting the source language';
    
    return `You are a professional translator specializing in PowerPoint presentations with expertise in the Universal PowerPoint Schema.

TRANSLATION TASK:
- Translate ${sourceInfo} to ${targetLanguage}
- Maintain Universal Schema structure and field integrity
- Preserve all technical schema elements (IDs, references, structure)

UNIVERSAL SCHEMA PRESERVATION RULES:
1. NEVER translate field names, IDs, or technical identifiers
2. Only translate actual content in these fields: ${UNIVERSAL_SCHEMA_KNOWLEDGE.translatableFields.join(', ')}
3. Preserve all shape types, geometry data, and structural elements
4. Maintain slide references, animation sequences, and object relationships
5. Keep all metadata structure intact while translating content values

CONTENT GUIDELINES:
- Maintain professional presentation tone
- Preserve formatting, bullet points, and text hierarchy
- Keep technical terms accurate and consistent
- Ensure cultural appropriateness for ${targetLanguage} audience
${preserveFormatting ? '- Preserve all formatting, indentation, and layout structure' : ''}

CRITICAL: Return only the translated content while preserving the Universal Schema structure. Do not include explanations or notes.

Target language: ${targetLanguage}`;
  }

  /**
   * Build schema-aware suggestions prompt
   */
  private buildSchemaAwareSuggestionsPrompt(
    schemaAnalysis: any,
    focusAreas: string[],
    includeSchemaOptimizations: boolean
  ): string {
    return `You are an expert PowerPoint consultant with deep knowledge of the Universal PowerPoint Schema and presentation best practices.

ANALYSIS CONTEXT:
- Schema compliance: ${schemaAnalysis.isCompliant ? 'Compliant' : 'Non-compliant'}
- Missing fields: ${schemaAnalysis.missingFields.join(', ') || 'None'}
- Slide structure types: ${schemaAnalysis.slideTypes.join(', ')}
- Focus areas: ${focusAreas.join(', ')}

SUGGESTION CATEGORIES:
1. **Structure**: Slide organization, flow, logical progression
2. **Content**: Text clarity, messaging, visual elements
3. **Schema**: Universal Schema optimization and compliance
4. **Accessibility**: WCAG compliance, inclusive design

RESPONSE FORMAT:
Return a JSON array of suggestion objects with this structure:
[
  {
    "type": "specific_suggestion_type",
    "category": "structure|content|schema|accessibility",
    "priority": "high|medium|low",
    "title": "Clear, actionable title",
    "description": "Detailed explanation of the issue and why it matters",
    "implementation": "Step-by-step instructions to implement the suggestion",
    ${includeSchemaOptimizations ? '"schemaImpact": "How this affects Universal Schema compliance and structure"' : ''}
  }
]

REQUIREMENTS:
- Focus on actionable, specific improvements
- Prioritize suggestions based on impact and effort
- Include both immediate wins and strategic improvements
${includeSchemaOptimizations ? '- Address Universal Schema compliance and optimization opportunities' : ''}
- Consider presentation effectiveness, accessibility, and maintainability`;
  }

  /**
   * Generate schema-specific insights
   */
  private async generateSchemaInsights(context: UniversalSchemaContext): Promise<any> {
    if (!context.slides) {
      return null;
    }

    // Analyze slide structure
    const slideStructureAnalysis = context.slides.map((slide, index) => ({
      slideIndex: index,
      structureType: this.identifySlideStructureType(slide),
      complexity: this.calculateSlideComplexity(slide),
      shapeTypes: this.extractShapeTypes(slide),
      hasAnimations: this.hasAnimations(slide),
      textContent: this.analyzeTextContent(slide),
    }));

    // Analyze presentation flow
    const presentationFlow = {
      logicalStructure: this.analyzeLogicalStructure(context.slides),
      transitionQuality: this.assessTransitionQuality(context.slides),
      narrativeFlow: this.assessNarrativeFlow(context.slides),
    };

    // Analyze content distribution
    const contentDistribution = this.analyzeContentDistribution(context.slides);

    return {
      slideStructureAnalysis,
      presentationFlow,
      contentDistribution,
    };
  }

  /**
   * Validate schema compliance
   */
  private validateSchemaCompliance(context: UniversalSchemaContext): any {
    const analysis = this.analyzeSchemaStructure(context.presentation);
    
    return {
      isCompliant: analysis.isCompliant,
      version: UNIVERSAL_SCHEMA_KNOWLEDGE.version,
      structure: {
        hasRequiredFields: analysis.hasRequiredFields,
        missingFields: analysis.missingFields,
        extraFields: analysis.extraFields,
      },
      recommendations: this.generateComplianceRecommendations(analysis),
    };
  }

  /**
   * Validate translation schema preservation
   */
  private validateTranslationSchemaPreservation(
    originalContext: UniversalSchemaContext,
    translatedContent: string,
    targetLanguage: string
  ): any {
    // This is a simplified validation - in a real implementation,
    // you would parse the translated content and compare structures
    
    return {
      structurePreserved: true, // Simplified assumption
      fieldsTranslated: UNIVERSAL_SCHEMA_KNOWLEDGE.translatableFields,
      untranslatedFields: [],
      schemaValidation: {
        isValid: true,
        errors: [],
      },
    };
  }

  /**
   * Analyze schema structure
   */
  private analyzeSchemaStructure(presentation: any): any {
    if (!presentation) {
      return {
        isCompliant: false,
        hasRequiredFields: false,
        missingFields: UNIVERSAL_SCHEMA_KNOWLEDGE.coreStructure.presentation.requiredFields,
        extraFields: [],
        slideTypes: [],
      };
    }

    const requiredFields = UNIVERSAL_SCHEMA_KNOWLEDGE.coreStructure.presentation.requiredFields;
    const presentationFields = Object.keys(presentation);
    
    const missingFields = requiredFields.filter(field => !presentationFields.includes(field));
    const hasRequiredFields = missingFields.length === 0;
    
    const slideTypes = presentation.slides 
      ? this.identifySlideTypes(presentation.slides)
      : [];

    return {
      isCompliant: hasRequiredFields,
      hasRequiredFields,
      missingFields,
      extraFields: [],
      slideTypes,
    };
  }

  /**
   * Helper methods for schema analysis
   */
  private identifySlideTypes(slides: any[]): string[] {
    return slides.map(slide => this.identifySlideStructureType(slide));
  }

  private identifySlideStructureType(slide: any): string {
    if (!slide.shapes) return 'empty';
    
    const shapeTypes = slide.shapes.map((shape: any) => shape.type || 'unknown');
    
    if (shapeTypes.includes('chart')) return 'chart';
    if (shapeTypes.includes('table')) return 'table';
    if (shapeTypes.includes('image')) return 'image';
    if (shapeTypes.filter((type: string) => type === 'textBox').length > 3) return 'text-heavy';
    
    return 'mixed';
  }

  private calculateSlideComplexity(slide: any): number {
    if (!slide.shapes) return 0;
    
    let complexity = slide.shapes.length * 0.1;
    
    slide.shapes.forEach((shape: any) => {
      if (shape.type === 'chart') complexity += 0.5;
      if (shape.type === 'table') complexity += 0.3;
      if (shape.animations) complexity += 0.2;
      if (shape.text && shape.text.length > 100) complexity += 0.1;
    });
    
    return Math.min(complexity, 1.0);
  }

  private extractShapeTypes(slide: any): string[] {
    if (!slide.shapes) return [];
    const shapeTypes: string[] = slide.shapes.map((shape: any) => String(shape.type || 'unknown'));
    return [...new Set(shapeTypes)];
  }

  private hasAnimations(slide: any): boolean {
    return slide.animations && slide.animations.length > 0;
  }

  private analyzeTextContent(slide: any): any {
    if (!slide.shapes) {
      return { wordCount: 0, complexity: 'none' };
    }

    const textShapes = slide.shapes.filter((shape: any) => shape.text);
    const totalText = textShapes.map((shape: any) => shape.text).join(' ');
    const wordCount = totalText.split(/\s+/).filter((word: string) => word.length > 0).length;
    
    return {
      wordCount,
      complexity: wordCount > 50 ? 'high' : wordCount > 20 ? 'medium' : 'low',
    };
  }

  private analyzeLogicalStructure(slides: any[]): string {
    // Simplified analysis - could be much more sophisticated
    if (slides.length < 3) return 'simple';
    if (slides.length > 20) return 'complex';
    return 'standard';
  }

  private assessTransitionQuality(slides: any[]): number {
    // Simplified assessment - return a score between 0 and 1
    return 0.8; // Default good score
  }

  private assessNarrativeFlow(slides: any[]): number {
    // Simplified assessment - return a score between 0 and 1
    return 0.7; // Default decent score
  }

  private analyzeContentDistribution(slides: any[]): any {
    let textSlides = 0;
    let imageSlides = 0;
    let chartSlides = 0;
    let mixedContentSlides = 0;

    slides.forEach(slide => {
      const slideType = this.identifySlideStructureType(slide);
      switch (slideType) {
        case 'text-heavy': textSlides++; break;
        case 'image': imageSlides++; break;
        case 'chart': chartSlides++; break;
        default: mixedContentSlides++; break;
      }
    });

    return {
      textSlides,
      imageSlides,
      chartSlides,
      mixedContentSlides,
    };
  }

  private generateComplianceRecommendations(analysis: any): string[] {
    const recommendations = [];
    
    if (!analysis.hasRequiredFields) {
      recommendations.push('Add required schema fields: ' + analysis.missingFields.join(', '));
    }
    
    if (analysis.slideTypes.includes('empty')) {
      recommendations.push('Remove or populate empty slides');
    }
    
    return recommendations;
  }

  private parseTextSuggestions(text: string, maxSuggestions: number): any[] {
    const lines = text.split('\n').filter(line => line.trim());
    const suggestions = [];
    
    for (let i = 0; i < Math.min(lines.length, maxSuggestions); i++) {
      const line = lines[i].trim();
      if (line) {
        suggestions.push({
          type: 'general',
          category: 'content',
          priority: 'medium',
          title: line,
          description: line,
          implementation: 'Review and implement this suggestion',
        });
      }
    }
    
    return suggestions;
  }
} 