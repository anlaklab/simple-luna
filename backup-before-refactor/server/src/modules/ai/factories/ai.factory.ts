/**
 * AI Factory - Specialized Factory for AI Module
 * 
 * Provides DI and component creation specific to AI operations.
 * Integrates with shared adapters and supports various AI processors.
 */

import { 
  BaseProcessor, 
  BaseService, 
  BaseController,
  FeatureFlags 
} from '../../shared/interfaces/base.interfaces';
import { sharedAdapters } from '../../shared/adapters/shared-adapters';
import { ChatProcessor } from '../endpoints/chat/chat.processor';

// =============================================================================
// AI-SPECIFIC INTERFACES
// =============================================================================

export interface AIProcessorOptions {
  features?: FeatureFlags;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  useOpenAI?: boolean;
  enableCaching?: boolean;
}

export interface AIServiceDependencies {
  openai?: any;
  firebase?: any;
}

export interface TranslateInput {
  text: string;
  targetLanguage: string;
  sourceLanguage?: string;
  preserveFormatting?: boolean;
}

export interface TranslateOutput {
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  confidence: number;
}

export interface AnalyzeInput {
  content: any;
  analysisType: 'summary' | 'sentiment' | 'keywords' | 'structure';
  options?: any;
}

export interface AnalyzeOutput {
  analysis: any;
  type: string;
  confidence: number;
  metadata: any;
}

// =============================================================================
// AI PROCESSORS PLACEHOLDERS (To be implemented)
// =============================================================================

export class TranslateProcessor implements BaseProcessor<TranslateInput, TranslateOutput> {
  readonly name = 'translate';
  readonly version = '1.0.0';
  readonly description = 'AI-powered text translation processor using OpenAI GPT models';
  
  private dependencies: AIServiceDependencies = {};

  async process(input: TranslateInput, options?: any): Promise<TranslateOutput> {
    // TODO: Implement translation using OpenAI
    const openai = this.dependencies.openai;
    
    if (!openai) {
      throw new Error('OpenAI adapter not available for translation');
    }

    return {
      translatedText: `[TRANSLATED: ${input.text}]`, // Placeholder
      sourceLanguage: input.sourceLanguage || 'auto',
      targetLanguage: input.targetLanguage,
      confidence: 0.95
    };
  }

  getCapabilities(): string[] {
    return ['text-translation', 'multi-language', 'formatting-preservation', 'batch-processing'];
  }

  getRequiredDependencies(): string[] {
    return ['openai'];
  }

  isAvailable(): boolean {
    return !!this.dependencies.openai;
  }

  injectAdapters(dependencies: AIServiceDependencies): void {
    this.dependencies = dependencies;
  }
}

export class AnalyzeProcessor implements BaseProcessor<AnalyzeInput, AnalyzeOutput> {
  readonly name = 'analyze';
  readonly version = '1.0.0';
  readonly description = 'AI-powered content analysis processor for summaries, sentiment, and insights';
  
  private dependencies: AIServiceDependencies = {};

  async process(input: AnalyzeInput, options?: any): Promise<AnalyzeOutput> {
    // TODO: Implement analysis using OpenAI
    const openai = this.dependencies.openai;
    
    if (!openai) {
      throw new Error('OpenAI adapter not available for analysis');
    }

    return {
      analysis: { summary: `Analysis of ${input.analysisType}` }, // Placeholder
      type: input.analysisType,
      confidence: 0.88,
      metadata: { timestamp: new Date() }
    };
  }

  getCapabilities(): string[] {
    return ['content-analysis', 'sentiment-analysis', 'keyword-extraction', 'structure-analysis'];
  }

  getRequiredDependencies(): string[] {
    return ['openai'];
  }

  isAvailable(): boolean {
    return !!this.dependencies.openai;
  }

  injectAdapters(dependencies: AIServiceDependencies): void {
    this.dependencies = dependencies;
  }
}

// =============================================================================
// AI FACTORY (Specialized)
// =============================================================================

export class AIFactory {
  private static instance: AIFactory;
  
  // Registry for AI-specific components
  private processors = new Map<string, () => BaseProcessor<any, any>>();
  private services = new Map<string, () => BaseService>();
  private controllers = new Map<string, () => BaseController>();
  
  // Dependencies from shared adapters
  private dependencies: AIServiceDependencies = {};

  private constructor() {
    this.initializeDefaults();
  }

  public static getInstance(): AIFactory {
    if (!AIFactory.instance) {
      AIFactory.instance = new AIFactory();
    }
    return AIFactory.instance;
  }

  // =============================================================================
  // INITIALIZATION
  // =============================================================================

  private initializeDefaults(): void {
    // Register default processors
    this.processors.set('translate', () => new TranslateProcessor());
    this.processors.set('analyze', () => new AnalyzeProcessor());
    this.processors.set('chat', () => new ChatProcessor());
    // TODO: Add other processors when created
    // this.processors.set('suggestions', () => new SuggestionsProcessor());
  }

  async initialize(): Promise<void> {
    try {
      // Load dependencies from shared adapters
      this.dependencies = {
        openai: sharedAdapters.getOpenAI(),
        firebase: sharedAdapters.getFirebase(),
      };
      
      console.log('✅ AI Factory initialized with shared adapters');
    } catch (error) {
      console.warn('⚠️ Some shared adapters not available for AI:', (error as Error).message);
      // Continue with available adapters
    }
  }

  // =============================================================================
  // PROCESSOR FACTORY METHODS
  // =============================================================================

  createProcessor<TInput, TOutput>(
    type: 'translate' | 'analyze' | 'chat' | 'suggestions',
    options: AIProcessorOptions = {}
  ): BaseProcessor<TInput, TOutput> {
    const creator = this.processors.get(type);
    if (!creator) {
      throw new Error(`AI processor not found: ${type}`);
    }

    const processor = creator() as BaseProcessor<TInput, TOutput>;

    // Inject shared adapters if requested
    if (options.useOpenAI && this.hasAdapterInjection(processor)) {
      (processor as any).injectAdapters(this.dependencies);
    }

    return processor;
  }

  // Specific factory methods for each processor type
  createTranslateProcessor(options: AIProcessorOptions = {}): BaseProcessor<TranslateInput, TranslateOutput> {
    const defaultOptions: AIProcessorOptions = {
      model: 'gpt-3.5-turbo',
      temperature: 0.3,
      maxTokens: 2000,
      useOpenAI: true,
      enableCaching: true
    };

    const effectiveOptions = { ...defaultOptions, ...options };
    
    return this.createProcessor<TranslateInput, TranslateOutput>('translate', effectiveOptions);
  }

  createAnalyzeProcessor(options: AIProcessorOptions = {}): BaseProcessor<AnalyzeInput, AnalyzeOutput> {
    const defaultOptions: AIProcessorOptions = {
      model: 'gpt-4',
      temperature: 0.7,
      maxTokens: 1500,
      useOpenAI: true,
      enableCaching: false
    };

    const effectiveOptions = { ...defaultOptions, ...options };
    
    return this.createProcessor<AnalyzeInput, AnalyzeOutput>('analyze', effectiveOptions);
  }

  // TODO: Add other specific processor factories
  // createChatProcessor(options: AIProcessorOptions = {}): ChatProcessor
  // createSuggestionsProcessor(options: AIProcessorOptions = {}): SuggestionsProcessor

  // =============================================================================
  // AI PIPELINE FACTORY (Multi-step AI workflows)
  // =============================================================================

  createAIPipeline(
    steps: Array<'translate' | 'analyze' | 'chat' | 'suggestions'>,
    globalOptions?: AIProcessorOptions
  ) {
    const processors = steps.map(step => 
      this.createProcessor(step, { ...globalOptions, useOpenAI: true })
    );

    // Capture reference to factory methods
    const hasAdapterInjection = this.hasAdapterInjection.bind(this);

    return {
      processors,
      async execute(input: any, context?: any) {
        let result = input;
        
        for (const processor of processors) {
          result = await processor.process(result);
        }
        
        return result;
      },
      async executeWithModel(input: any, model: string, context?: any) {
        let result = input;
        
        for (const processor of processors) {
          // Inject model preference if processor supports it
          if (hasAdapterInjection(processor)) {
            (processor as any).setModel(model);
          }
          result = await processor.process(result);
        }
        
        return result;
      }
    };
  }

  // =============================================================================
  // MULTI-LANGUAGE PROCESSOR
  // =============================================================================

  createMultiLanguageProcessor(
    targetLanguages: string[],
    options: AIProcessorOptions = {}
  ) {
    const translateProcessor = this.createTranslateProcessor(options);
    
    return {
      async translateToMultipleLanguages(
        text: string,
        sourceLanguage?: string
      ): Promise<Record<string, TranslateOutput>> {
        const results: Record<string, TranslateOutput> = {};
        
        // Process languages in parallel with rate limiting
        const batchSize = 3; // Limit concurrent requests
        
        for (let i = 0; i < targetLanguages.length; i += batchSize) {
          const batch = targetLanguages.slice(i, i + batchSize);
          
          const batchPromises = batch.map(async (lang) => {
            const result = await translateProcessor.process({
              text,
              targetLanguage: lang,
              sourceLanguage,
              preserveFormatting: true
            });
            return { lang, result };
          });
          
          const batchResults = await Promise.allSettled(batchPromises);
          
          batchResults.forEach((result) => {
            if (result.status === 'fulfilled') {
              results[result.value.lang] = result.value.result;
            } else {
              console.error(`Translation failed:`, result.reason);
            }
          });
          
          // Rate limiting between batches
          if (i + batchSize < targetLanguages.length) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
        
        return results;
      }
    };
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  private hasAdapterInjection(processor: any): boolean {
    return processor && typeof processor.injectAdapters === 'function';
  }

  // =============================================================================
  // FACTORY STATS & INTROSPECTION
  // =============================================================================

  getAvailableProcessors(): string[] {
    return Array.from(this.processors.keys());
  }

  getAvailableServices(): string[] {
    return Array.from(this.services.keys());
  }

  getDependencies(): AIServiceDependencies {
    return this.dependencies;
  }

  getStats() {
    return {
      processors: this.processors.size,
      services: this.services.size,
      controllers: this.controllers.size,
      dependencies: Object.keys(this.dependencies).length,
      adapterStatus: {
        openai: !!this.dependencies.openai,
        firebase: !!this.dependencies.firebase,
      }
    };
  }

  // Register custom processors dynamically
  registerProcessor(name: string, creator: () => BaseProcessor<any, any>): void {
    this.processors.set(name, creator);
  }

  // Register custom services dynamically
  registerService(name: string, creator: () => BaseService): void {
    this.services.set(name, creator);
  }
}

// =============================================================================
// CONVENIENCE EXPORTS
// =============================================================================

export const aiFactory = AIFactory.getInstance(); 