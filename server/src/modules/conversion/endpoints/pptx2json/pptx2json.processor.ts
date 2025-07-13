import { z } from "zod";
/**
 * PPTX2JSON Processor - Base + Extensions Pattern
 * 
 * Converts PPTX files to Universal Schema JSON using Aspose.Slides.
 * Implements ToggleableProcessor for feature flags and modular processing.
 */

import { 
  ToggleableProcessor, 
  FeatureFlags,
  PipelineContext 
} from '../../../shared/interfaces/base.interfaces';

// ✅ ROBUST IMPORT: Use AsposeDriverFactory for unified access
const asposeDriver = require('/app/lib/AsposeDriverFactory');

// Types specific to this processor
export interface PPTX2JSONInput {
  filePath: string;
  buffer?: Buffer;
  metadata?: Record<string, any>;
}

export interface PPTX2JSONOutput {
  presentation: any; // Universal Schema JSON
  metadata: {
    slideCount: number;
    fileSize: number;
    processingTime: number;
    features: string[];
  };
  assets?: {
    images: string[];
    videos: string[];
    audio: string[];
  };
}

export interface PPTX2JSONOptions {
  includeAssets?: boolean;
  includeMetadata?: boolean;
  includeAnimations?: boolean;
  validateOutput?: boolean;
  extractImages?: boolean;
  mode?: 'local' | 'cloud' | 'hybrid';
}

// =============================================================================
// PPTX2JSON PROCESSOR (Base + Extensions Implementation)
// =============================================================================

export class PPTX2JSONProcessor implements ToggleableProcessor<PPTX2JSONInput, PPTX2JSONOutput, PPTX2JSONOptions> {
  name = 'pptx2json';
  version = '1.0.0';
  description = 'Converts PPTX files to Universal Schema JSON format';

  private isAsposeInitialized = false;

  // Feature flags (toggleable functionality)
  features: FeatureFlags = {
    extractAssets: true,
    includeMetadata: true,
    enableAI: false,
    cacheResults: true,
    validateInput: true,
    generateThumbnails: false,
    mode: 'local'
  };

  // =============================================================================
  // CORE PROCESSOR METHODS (BaseProcessor Implementation)
  // =============================================================================

  async process(input: PPTX2JSONInput, options?: PPTX2JSONOptions): Promise<PPTX2JSONOutput> {
    const startTime = Date.now();
    
    // Use the default features
    return this.processWithFeatures(input, options, this.features);
  }

  async processWithFeatures(
    input: PPTX2JSONInput, 
    options: PPTX2JSONOptions = {},
    features: Partial<FeatureFlags> = {}
  ): Promise<PPTX2JSONOutput> {
    const startTime = Date.now();
    const effectiveFeatures = { ...this.features, ...features };
    
    // Validate input if feature enabled
    if (effectiveFeatures.validateInput) {
      await this.validate(input, options);
    }

    // Build processing pipeline based on features
    const pipeline = this.buildPipeline(effectiveFeatures, options);
    
    // Execute processing
    const result = await this.executeConversion(input, options, effectiveFeatures);
    
    const processingTime = Date.now() - startTime;
    
    // Build metadata
    const metadata = {
      slideCount: result.slideCount || 0,
      fileSize: input.buffer?.length || 0,
      processingTime,
      features: this.getActiveFeatures(effectiveFeatures)
    };

    // Build output with conditional assets
    const output: PPTX2JSONOutput = {
      presentation: result.presentation,
      metadata
    };

    // Include assets if feature enabled
    if (effectiveFeatures.extractAssets && options.includeAssets) {
      output.assets = result.assets;
    }

    return output;
  }

  async validate(input: PPTX2JSONInput, options?: PPTX2JSONOptions): Promise<boolean> {
    if (!input.filePath && !input.buffer) {
      throw new Error('Either filePath or buffer must be provided');
    }

    if (input.filePath && !input.filePath.endsWith('.pptx')) {
      throw new Error('File must have .pptx extension');
    }

    return true;
  }

  async initialize(): Promise<void> {
    // ✅ Initialize AsposeDriverFactory
    await this.initializeAsposeDriver();
    console.log(`🔧 Initializing ${this.name} processor`);
  }

  private async initializeAsposeDriver(): Promise<void> {
    if (!this.isAsposeInitialized) {
      await asposeDriver.initialize();
      this.isAsposeInitialized = true;
      console.log('✅ AsposeDriverFactory initialized in PPTX2JSONProcessor');
    }
  }

  async cleanup(): Promise<void> {
    // Cleanup resources
    console.log(`🧹 Cleaning up ${this.name} processor`);
  }

  // =============================================================================
  // PROCESSOR INTROSPECTION
  // =============================================================================

  getCapabilities(): string[] {
    return [
      'pptx-parsing',
      'universal-schema-conversion',
      'asset-extraction',
      'metadata-extraction',
      'feature-toggling',
      'pipeline-processing'
    ];
  }

  getRequiredDependencies(): string[] {
    return [
      'aspose.slides',
      'filesystem',
      'memory'
    ];
  }

  isAvailable(): boolean {
    try {
      // ✅ REFACTORED: Use AsposeDriverFactory instead of direct import
      return asposeDriver.isInitialized();
    } catch (error) {
      return false;
    }
  }

  // =============================================================================
  // PRIVATE IMPLEMENTATION (Extensions Pattern)
  // =============================================================================

  private buildPipeline(features: FeatureFlags, options: PPTX2JSONOptions) {
    const steps = ['load-presentation'];
    
    if (features.validateInput) {
      steps.push('validate-content');
    }
    
    steps.push('extract-slides');
    
    if (features.extractAssets && options.includeAssets) {
      steps.push('extract-assets');
    }
    
    if (features.includeMetadata && options.includeMetadata) {
      steps.push('extract-metadata');
    }
    
    if (features.enableAI) {
      steps.push('ai-enhancement');
    }
    
    steps.push('generate-universal-schema');
    
    if (features.validateInput) {
      steps.push('validate-output');
    }

    return steps;
  }

  private async executeConversion(
    input: PPTX2JSONInput, 
    options: PPTX2JSONOptions,
    features: FeatureFlags
  ): Promise<any> {
    try {
      // ✅ Ensure AsposeDriverFactory is initialized
      await this.initializeAsposeDriver();
      
      // Load presentation using AsposeDriverFactory
      const presentation = await asposeDriver.loadPresentation(input.filePath);
      const slides = presentation.getSlides();
      const slideCount = slides.size();

      // Extract slides data
      const slidesData = [];
      for (let i = 0; i < slideCount; i++) {
        const slide = slides.get_Item(i);
        const slideData = this.extractSlideData(slide, i, features);
        slidesData.push(slideData);
      }

      // Build Universal Schema
      const universalSchema = {
        version: '1.0.0',
        metadata: {
          title: 'Converted Presentation',
          slideCount,
          createdAt: new Date().toISOString(),
          source: 'aspose-slides'
        },
        slides: slidesData
      };

      // Extract assets if enabled
      let assets;
      if (features.extractAssets && options.includeAssets) {
        assets = await this.extractAssets(presentation, features);
      }

      // Cleanup
      if (presentation && presentation.dispose) {
        presentation.dispose();
      }

      return {
        presentation: universalSchema,
        slideCount,
        assets
      };

    } catch (error) {
      throw new Error(`PPTX conversion failed: ${(error as Error).message}`);
    }
  }

  private extractSlideData(slide: any, index: number, features: FeatureFlags) {
    // Basic slide structure
    const slideData = {
      id: `slide_${index}`,
      index,
      title: `Slide ${index + 1}`,
      layout: 'standard',
      background: {},
      shapes: [] as any[] // ✅ Explicitly type the shapes array
    };

    try {
      // Extract shapes if available
      const shapes = slide.getShapes();
      const shapeCount = shapes.size();
      
      for (let i = 0; i < shapeCount; i++) {
        const shape = shapes.get_Item(i);
        const shapeData = this.extractShapeData(shape, i);
        slideData.shapes.push(shapeData);
      }
    } catch (error) {
      console.warn(`Warning: Could not extract shapes from slide ${index}:`, (error as Error).message);
    }

    return slideData;
  }

  private extractShapeData(shape: any, index: number) {
    return {
      id: `shape_${index}`,
      type: 'unknown',
      position: { x: 0, y: 0 },
      size: { width: 100, height: 100 },
      content: {},
      style: {}
    };
  }

  private async extractAssets(presentation: any, features: FeatureFlags) {
    return {
      images: [],
      videos: [],
      audio: []
    };
  }

  private getActiveFeatures(features: FeatureFlags): string[] {
    const active = [];
    if (features.extractAssets) active.push('asset-extraction');
    if (features.includeMetadata) active.push('metadata-inclusion');
    if (features.enableAI) active.push('ai-enhancement');
    if (features.cacheResults) active.push('result-caching');
    if (features.validateInput) active.push('input-validation');
    if (features.generateThumbnails) active.push('thumbnail-generation');
    active.push(`mode-${features.mode}`);
    return active;
  }
} 