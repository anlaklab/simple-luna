/**
 * Enhanced PPTX2JSON Processor - Using Base + Extensions Pattern
 * 
 * Demonstrates the new CrewAI/LangChain style hierarchy with:
 * - AbstractPPTXProcessor inheritance
 * - Modular extensions (validation, caching, metrics, logging)
 * - Enhanced processing pipeline
 */

import { AbstractPPTXProcessor } from '../../../shared/base/abstract.processors';
import { ValidationExtension, CachingExtension, MetricsExtension, LoggingExtension } from '../../../shared/extensions/base.extensions';

// =============================================================================
// ENHANCED PPTX2JSON INTERFACES
// =============================================================================

export interface EnhancedPPTX2JSONInput {
  filePath: string;
  options?: {
    extractAssets: boolean;
    includeMetadata: boolean;
    generateThumbnails: boolean;
    maxSlides?: number;
    extractNotes?: boolean;
  };
}

export interface EnhancedPPTX2JSONOutput {
  universalJson: any;
  metadata: {
    conversionTime: number;
    slideCount: number;
    assetCount: number;
    quality: 'high' | 'medium' | 'low';
    processingInfo: {
      extensionsUsed: string[];
      cacheHit: boolean;
      validationPassed: boolean;
      metricsCollected: boolean;
      performanceMetrics?: {
        averageExecutionTime: number;
        totalProcessed: number;
        successRate: number;
      };
    };
  };
}

export interface EnhancedPPTX2JSONOptions {
  quality?: 'high' | 'medium' | 'low';
  timeout?: number;
  enableExtensions?: string[];
  extensionConfigs?: Record<string, any>;
}

// =============================================================================
// ENHANCED PPTX2JSON PROCESSOR (Using Base + Extensions)
// =============================================================================

export class EnhancedPPTX2JSONProcessor extends AbstractPPTXProcessor<
  EnhancedPPTX2JSONInput, 
  EnhancedPPTX2JSONOutput, 
  EnhancedPPTX2JSONOptions
> {
  readonly name = 'enhanced-pptx2json';
  readonly version = '2.0.0';
  readonly description = 'Enhanced PPTX to JSON converter with modular extensions and advanced processing pipeline';

  constructor() {
    super();
    
    // Initialize with default extensions
    this.setupDefaultExtensions();
  }

  // =============================================================================
  // EXTENSION SETUP
  // =============================================================================

  private setupDefaultExtensions(): void {
    // Add validation extension with PPTX-specific rules
    const validationExt = new ValidationExtension({
      enabled: true,
      stopOnError: true,
      logValidation: true,
      rules: [
        {
          name: 'file-exists',
          validate: async (input: EnhancedPPTX2JSONInput) => {
            // TODO: Check if file exists
            return !!input.filePath;
          },
          message: 'File path is required',
          severity: 'error'
        },
        {
          name: 'file-extension',
          validate: async (input: EnhancedPPTX2JSONInput) => {
            return input.filePath.toLowerCase().endsWith('.pptx');
          },
          message: 'File must be a PPTX file',
          severity: 'error'
        },
        {
          name: 'max-slides-check',
          validate: async (input: EnhancedPPTX2JSONInput) => {
            const maxSlides = input.options?.maxSlides;
            return !maxSlides || maxSlides <= 500; // Reasonable limit
          },
          message: 'Maximum slides limit exceeded (500)',
          severity: 'warning'
        }
      ]
    });

    // Add caching extension with intelligent key generation
    const cachingExt = new CachingExtension({
      enabled: true,
      ttl: 600000, // 10 minutes
      maxSize: 100,
      keyGenerator: (input: EnhancedPPTX2JSONInput) => {
        const options = input.options || {};
        return `pptx2json:${input.filePath}:${JSON.stringify(options)}`;
      }
    });

    // Add metrics extension
    const metricsExt = new MetricsExtension({
      enabled: true,
      trackTiming: true,
      trackMemory: true,
      trackErrors: true
    });

    // Add logging extension
    const loggingExt = new LoggingExtension({
      enabled: true,
      level: 'info',
      logInput: false, // Don't log file paths for security
      logOutput: false, // Don't log large JSON for performance
      logTiming: true,
      logErrors: true
    });

    // Add all extensions
    this.addExtension(validationExt);
    this.addExtension(cachingExt);
    this.addExtension(metricsExt);
    this.addExtension(loggingExt);
  }

  // =============================================================================
  // ENHANCED CAPABILITIES
  // =============================================================================

  getCapabilities(): string[] {
    return [
      ...super.getCapabilities(),
      'enhanced-validation',
      'intelligent-caching',
      'performance-metrics',
      'detailed-logging',
      'extension-system',
      'quality-assessment',
      'processing-insights'
    ];
  }

  // =============================================================================
  // CORE CONVERSION LOGIC (Abstract method implementation)
  // =============================================================================

  protected async convert(
    input: EnhancedPPTX2JSONInput, 
    options?: EnhancedPPTX2JSONOptions
  ): Promise<EnhancedPPTX2JSONOutput> {
    
    // Create presentation using base class utility
    const presentation = await this.createPresentation(input.filePath);
    
    try {
      // Extract slide count
      const slideCount = presentation.getSlides().size();
      
      // Check max slides limit if specified
      const maxSlides = input.options?.maxSlides;
      if (maxSlides && slideCount > maxSlides) {
        throw new Error(`Presentation has ${slideCount} slides, but maximum allowed is ${maxSlides}`);
      }

      // Convert presentation to Universal JSON
      const universalJson = await this.convertToUniversalJson(presentation, input, options);
      
      // Count assets if extraction is enabled
      const assetCount = input.options?.extractAssets ? 
        await this.countAssets(universalJson) : 0;

      // Determine quality based on processing
      const quality = this.determineQuality(slideCount, assetCount, options);

      // Get processing info from extensions
      const processingInfo = this.getProcessingInfo();

      return {
        universalJson,
        metadata: {
          conversionTime: Date.now() - this.context.startTime,
          slideCount,
          assetCount,
          quality,
          processingInfo
        }
      };

    } finally {
      // Cleanup using base class utility
      await this.disposePresentation(presentation);
    }
  }

  // =============================================================================
  // CONVERSION PIPELINE METHODS
  // =============================================================================

  private async convertToUniversalJson(
    presentation: any,
    input: EnhancedPPTX2JSONInput,
    options?: EnhancedPPTX2JSONOptions
  ): Promise<any> {
    const slides = [];
    const slideCount = presentation.getSlides().size();

    // Process slides
    for (let i = 0; i < slideCount; i++) {
      const slide = presentation.getSlides().get_Item(i);
      const slideData = await this.processSlide(slide, i, input, options);
      slides.push(slideData);
    }

    // Build Universal JSON structure
    return {
      type: 'presentation',
      version: '1.0',
      metadata: {
        title: presentation.getDocumentProperties().getTitle() || 'Untitled',
        slideCount,
        createdAt: new Date().toISOString(),
        source: 'enhanced-pptx2json-processor'
      },
      slides,
      assets: input.options?.extractAssets ? await this.extractAssets(presentation) : [],
      notes: input.options?.extractNotes ? await this.extractNotes(presentation) : []
    };
  }

  private async processSlide(
    slide: any,
    index: number,
    input: EnhancedPPTX2JSONInput,
    options?: EnhancedPPTX2JSONOptions
  ): Promise<any> {
    return {
      index,
      type: 'slide',
      layout: 'default',
      background: await this.extractBackground(slide),
      shapes: await this.extractShapes(slide),
      timing: {
        duration: 5000 // Default 5 seconds
      }
    };
  }

  private async extractBackground(slide: any): Promise<any> {
    // TODO: Extract slide background
    return { type: 'solid', color: '#FFFFFF' };
  }

  private async extractShapes(slide: any): Promise<any[]> {
    // TODO: Extract slide shapes
    return [];
  }

  private async extractAssets(presentation: any): Promise<any[]> {
    // TODO: Extract presentation assets
    return [];
  }

  private async extractNotes(presentation: any): Promise<any[]> {
    // TODO: Extract slide notes
    return [];
  }

  // =============================================================================
  // QUALITY ASSESSMENT & PROCESSING INFO
  // =============================================================================

  private determineQuality(
    slideCount: number,
    assetCount: number,
    options?: EnhancedPPTX2JSONOptions
  ): 'high' | 'medium' | 'low' {
    if (options?.quality) return options.quality;
    
    // Determine quality based on complexity
    if (slideCount > 100 || assetCount > 50) return 'low';
    if (slideCount > 30 || assetCount > 20) return 'medium';
    return 'high';
  }

  private async countAssets(universalJson: any): Promise<number> {
    return universalJson.assets?.length || 0;
  }

  private getProcessingInfo() {
    return {
      extensionsUsed: Array.from(this.extensions.keys()),
      cacheHit: !!this.context.cacheHit,
      validationPassed: !this.context.validation?.errors?.length,
      metricsCollected: this.hasExtension('metrics')
    };
  }

  // =============================================================================
  // ENHANCED PRE/POST PROCESSING
  // =============================================================================

  protected async preProcess(
    input: EnhancedPPTX2JSONInput, 
    options?: EnhancedPPTX2JSONOptions
  ): Promise<EnhancedPPTX2JSONInput> {
    // Apply any preprocessing based on options
    if (options?.enableExtensions) {
      // Dynamically enable additional extensions
      for (const extName of options.enableExtensions) {
        if (!this.hasExtension(extName)) {
          const extConfig = options.extensionConfigs?.[extName];
          this.addExtensions([extName], { [extName]: extConfig });
        }
      }
    }

    return input;
  }

  protected async postProcess(
    result: EnhancedPPTX2JSONOutput,
    originalInput: EnhancedPPTX2JSONInput,
    options?: EnhancedPPTX2JSONOptions
  ): Promise<EnhancedPPTX2JSONOutput> {
    // Add extension metrics to result if available
    const metricsExt = this.getExtension<MetricsExtension>('metrics');
    if (metricsExt) {
      const metrics = metricsExt.getMetrics();
      result.metadata.processingInfo = {
        ...result.metadata.processingInfo,
        performanceMetrics: {
          averageExecutionTime: metrics.executionTime,
          totalProcessed: metrics.totalProcessed,
          successRate: metrics.totalProcessed > 0 ? 
            metrics.successCount / metrics.totalProcessed : 0
        }
      };
    }

    return result;
  }
} 