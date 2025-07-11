/**
 * Abstract Base Processors - CrewAI/LangChain Style Hierarchy
 * 
 * Provides abstract base classes that define common behavior patterns
 * and can be extended by concrete processors.
 */

import { 
  BaseProcessor, 
  FeatureFlags, 
  ToggleableProcessor 
} from '../interfaces/base.interfaces';
import { 
  Extension, 
  ExtensibleProcessor,
  extensionRegistry 
} from '../extensions/base.extensions';

// =============================================================================
// ABSTRACT EXTENDABLE PROCESSOR (Base of all processors)
// =============================================================================

export abstract class AbstractExtendableProcessor<TInput, TOutput, TOptions = any> 
  implements ExtensibleProcessor<TInput, TOutput, TOptions> {
  
  // Base processor interface
  abstract readonly name: string;
  abstract readonly version: string;
  abstract readonly description: string;
  
  // Extensions management
  public extensions = new Map<string, Extension>();
  
  // Processing context
  protected context: any = {};

  // =============================================================================
  // CORE PROCESSING WITH EXTENSION LIFECYCLE
  // =============================================================================

  async process(input: TInput, options?: TOptions): Promise<TOutput> {
    this.context = { input, options, startTime: Date.now() };
    
    try {
      // Run beforeProcess hooks from extensions
      let processedInput = input;
      for (const extension of this.extensions.values()) {
        if (extension.beforeProcess) {
          processedInput = await extension.beforeProcess(processedInput, this.context);
        }
      }

      // Check for cache hit
      if (this.context.cacheHit) {
        return this.context.cachedResult;
      }

      // Execute main processing logic
      let output = await this.executeProcessing(processedInput, options);

      // Run afterProcess hooks from extensions
      for (const extension of this.extensions.values()) {
        if (extension.afterProcess) {
          output = await extension.afterProcess(output, processedInput, this.context);
        }
      }

      return output;

    } catch (error) {
      // Run error hooks from extensions
      for (const extension of this.extensions.values()) {
        if (extension.onError) {
          await extension.onError(error as Error, input, this.context);
        }
      }
      
      throw error;
    }
  }

  // Abstract method that concrete processors must implement
  protected abstract executeProcessing(input: TInput, options?: TOptions): Promise<TOutput>;

  // =============================================================================
  // EXTENSION MANAGEMENT
  // =============================================================================

  addExtension(extension: Extension): void {
    this.extensions.set(extension.name, extension);
    
    // Initialize extension with this processor
    if (extension.initialize) {
      extension.initialize(this);
    }
  }

  removeExtension(name: string): void {
    const extension = this.extensions.get(name);
    if (extension && extension.dispose) {
      extension.dispose();
    }
    this.extensions.delete(name);
  }

  hasExtension(name: string): boolean {
    return this.extensions.has(name);
  }

  getExtension<T extends Extension>(name: string): T | undefined {
    return this.extensions.get(name) as T;
  }

  // Convenience method to add multiple extensions
  addExtensions(extensionNames: string[], configs?: Record<string, any>): void {
    for (const name of extensionNames) {
      const config = configs?.[name];
      const extension = extensionRegistry.create(name, config);
      this.addExtension(extension);
    }
  }

  // =============================================================================
  // BASE PROCESSOR INTERFACE IMPLEMENTATION
  // =============================================================================

  abstract getCapabilities(): string[];
  abstract getRequiredDependencies(): string[];
  abstract isAvailable(): boolean;

  // =============================================================================
  // LIFECYCLE HOOKS (Optional overrides)
  // =============================================================================

  async initialize(): Promise<void> {
    // Initialize all extensions
    for (const extension of this.extensions.values()) {
      if (extension.initialize) {
        await extension.initialize(this);
      }
    }
  }

  async cleanup(): Promise<void> {
    // Dispose all extensions
    for (const extension of this.extensions.values()) {
      if (extension.dispose) {
        await extension.dispose();
      }
    }
    this.extensions.clear();
  }
}

// =============================================================================
// ABSTRACT TOGGLABLE PROCESSOR (With Feature Flags)
// =============================================================================

export abstract class AbstractToggleableProcessor<TInput, TOutput, TOptions = any> 
  extends AbstractExtendableProcessor<TInput, TOutput, TOptions>
  implements ToggleableProcessor<TInput, TOutput, TOptions> {
  
  // Feature flags for toggling functionality
  public features: FeatureFlags = {
    extractAssets: true,
    includeMetadata: true,
    enableAI: false,
    cacheResults: true,
    validateInput: true,
    generateThumbnails: false,
    mode: 'local'
  };

  // Enhanced processing with feature flag support
  async processWithFeatures(
    input: TInput, 
    options?: TOptions, 
    features?: Partial<FeatureFlags>
  ): Promise<TOutput> {
    // Temporarily override features
    const originalFeatures = { ...this.features };
    if (features) {
      this.features = { ...this.features, ...features };
    }

    try {
      return await this.process(input, options);
    } finally {
      // Restore original features
      this.features = originalFeatures;
    }
  }

  // Feature-aware validation (can be overridden)
  protected async validateInput(input: TInput): Promise<boolean> {
    if (!this.features.validateInput) return true;
    
    // Default validation - can be overridden by concrete processors
    return input !== null && input !== undefined;
  }
}

// =============================================================================
// ABSTRACT CONVERSION PROCESSOR
// =============================================================================

export abstract class AbstractConversionProcessor<TInput, TOutput, TOptions = any> 
  extends AbstractToggleableProcessor<TInput, TOutput, TOptions> {
  
  // Common conversion capabilities
  getCapabilities(): string[] {
    return [
      'format-conversion',
      'feature-toggling',
      'pipeline-processing',
      'error-handling'
    ];
  }

  getRequiredDependencies(): string[] {
    return ['filesystem'];
  }

  // Common conversion processing pipeline
  protected async executeProcessing(input: TInput, options?: TOptions): Promise<TOutput> {
    // Validate input if enabled
    if (this.features.validateInput) {
      await this.validateInput(input);
    }

    // Execute pre-processing hooks
    const preprocessedInput = await this.preProcess(input, options);
    
    // Execute main conversion logic
    const result = await this.convert(preprocessedInput, options);
    
    // Execute post-processing hooks
    const postprocessedResult = await this.postProcess(result, input, options);
    
    return postprocessedResult;
  }

  // Abstract methods for conversion pipeline
  protected abstract convert(input: TInput, options?: TOptions): Promise<TOutput>;
  
  // Hook methods (can be overridden)
  protected async preProcess(input: TInput, options?: TOptions): Promise<TInput> {
    return input;
  }
  
  protected async postProcess(
    result: TOutput, 
    originalInput: TInput, 
    options?: TOptions
  ): Promise<TOutput> {
    return result;
  }
}

// =============================================================================
// ABSTRACT AI PROCESSOR
// =============================================================================

export abstract class AbstractAIProcessor<TInput, TOutput, TOptions = any> 
  extends AbstractExtendableProcessor<TInput, TOutput, TOptions> {
  
  // AI-specific dependencies
  protected adapters: {
    openai?: any;
    firebase?: any;
  } = {};

  // Common AI capabilities
  getCapabilities(): string[] {
    return [
      'ai-processing',
      'context-awareness',
      'model-flexibility',
      'error-handling'
    ];
  }

  getRequiredDependencies(): string[] {
    return ['openai'];
  }

  isAvailable(): boolean {
    return !!this.adapters.openai;
  }

  // Common AI processing pipeline
  protected async executeProcessing(input: TInput, options?: TOptions): Promise<TOutput> {
    // Prepare AI context
    const aiContext = await this.prepareAIContext(input, options);
    
    // Execute AI processing
    const result = await this.processWithAI(input, aiContext, options);
    
    // Post-process AI results
    const finalResult = await this.postProcessAI(result, input, options);
    
    return finalResult;
  }

  // Abstract methods for AI pipeline
  protected abstract processWithAI(
    input: TInput, 
    aiContext: any, 
    options?: TOptions
  ): Promise<TOutput>;
  
  // Hook methods (can be overridden)
  protected async prepareAIContext(input: TInput, options?: TOptions): Promise<any> {
    return { timestamp: Date.now(), model: 'gpt-3.5-turbo' };
  }
  
  protected async postProcessAI(
    result: TOutput, 
    originalInput: TInput, 
    options?: TOptions
  ): Promise<TOutput> {
    return result;
  }

  // Dependency injection
  injectAdapters(adapters: { openai?: any; firebase?: any }): void {
    this.adapters = adapters;
  }
}

// =============================================================================
// ABSTRACT PPTX PROCESSOR (Specialized Conversion)
// =============================================================================

export abstract class AbstractPPTXProcessor<TInput, TOutput, TOptions = any> 
  extends AbstractConversionProcessor<TInput, TOutput, TOptions> {
  
  // PPTX-specific dependencies
  protected adapters: {
    aspose?: any;
    firebase?: any;
  } = {};

  // PPTX-specific capabilities
  getCapabilities(): string[] {
    return [
      ...super.getCapabilities(),
      'pptx-processing',
      'slide-manipulation',
      'asset-extraction',
      'metadata-processing'
    ];
  }

  getRequiredDependencies(): string[] {
    return ['aspose.slides', 'filesystem'];
  }

  isAvailable(): boolean {
    return !!this.adapters.aspose;
  }

  // Enhanced conversion pipeline for PPTX
  protected async executeProcessing(input: TInput, options?: TOptions): Promise<TOutput> {
    // Load Aspose.Slides if needed
    const aspose = this.adapters.aspose;
    if (!aspose) {
      throw new Error('Aspose.Slides adapter not available');
    }

    // Execute base conversion logic
    return await super.executeProcessing(input, options);
  }

  // Dependency injection
  injectAdapters(adapters: { aspose?: any; firebase?: any }): void {
    this.adapters = adapters;
  }

  // PPTX-specific utility methods
  protected async createPresentation(filePath?: string): Promise<any> {
    const aspose = this.adapters.aspose;
    return aspose.createPresentation(filePath);
  }

  protected async disposePresentation(presentation: any): Promise<void> {
    if (presentation && presentation.dispose) {
      presentation.dispose();
    }
  }
} 