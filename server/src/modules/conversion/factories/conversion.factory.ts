/**
 * Conversion Factory - Specialized Factory for Conversion Module
 * 
 * Provides DI and component creation specific to conversion operations.
 * Integrates with shared adapters and central module factory.
 * Enhanced with Dynamic Extension Registry for ultimate scalability.
 */

import { 
  BaseProcessor, 
  BaseService, 
  BaseController,
  FeatureFlags 
} from '../../shared/interfaces/base.interfaces';
import { sharedAdapters } from '../../shared/adapters/shared-adapters';
import { getDynamicRegistry, getDynamicExtension } from '../../shared/factories/module.factory';
import { PPTX2JSONProcessor } from '../endpoints/pptx2json/pptx2json.processor';
import { JSON2PPTXProcessor } from '../endpoints/json2pptx/json2pptx.processor';
import { ThumbnailsProcessor } from '../endpoints/thumbnails/thumbnails.processor';
import { ConversionService } from '../services/conversion.service';
import { logger } from '../../../utils/logger';

// =============================================================================
// CONVERSION-SPECIFIC INTERFACES (Enhanced with Dynamic Registry)
// =============================================================================

export interface ConversionProcessorOptions {
  features?: FeatureFlags;
  useSharedAdapters?: boolean;
  cacheResults?: boolean;
  validateInput?: boolean;
  dynamicRegistry?: Map<string, any>; // Added for dynamic extension support
  enabledExtensions?: string[];
}

export interface ConversionServiceDependencies {
  firebase?: any;
  aspose?: any;
  openai?: any;
  dynamicRegistry?: Map<string, any>; // Added for dynamic support
}

// =============================================================================
// CONVERSION FACTORY (Enhanced with Dynamic Loading)
// =============================================================================

export class ConversionFactory {
  private static instance: ConversionFactory;
  
  // Registry for conversion-specific components
  private processors = new Map<string, () => BaseProcessor<any, any>>();
  private services = new Map<string, () => BaseService>();
  private controllers = new Map<string, () => BaseController>();
  
  // Dependencies from shared adapters (enhanced with dynamic registry)
  private dependencies: ConversionServiceDependencies = {};

  private constructor() {
    this.initializeDefaults();
  }

  public static getInstance(): ConversionFactory {
    if (!ConversionFactory.instance) {
      ConversionFactory.instance = new ConversionFactory();
    }
    return ConversionFactory.instance;
  }

  // =============================================================================
  // INITIALIZATION (Enhanced with Dynamic Registry)
  // =============================================================================

  private initializeDefaults(): void {
    // Register default processors
    this.processors.set('pptx2json', () => new PPTX2JSONProcessor());
    this.processors.set('json2pptx', () => new JSON2PPTXProcessor());
    this.processors.set('thumbnails', () => new ThumbnailsProcessor());
    
    // Register comprehensive conversion service (enhanced with dynamic support)
    this.services.set('conversion', () => this.createComprehensiveConversionService());
    
    // TODO: Add other processors when created
    // this.processors.set('formats', () => new FormatsProcessor());
  }

  async initialize(): Promise<void> {
    try {
      // Load dependencies from shared adapters
      this.dependencies = {
        firebase: sharedAdapters.getFirebase(),
        aspose: sharedAdapters.getAspose(),
        openai: sharedAdapters.getOpenAI(),
        dynamicRegistry: getDynamicRegistry() // Include dynamic registry
      };
      
      logger.info('✅ Conversion Factory initialized with shared adapters and dynamic registry', {
        dynamicExtensions: this.dependencies.dynamicRegistry?.size || 0
      });
    } catch (error) {
      logger.warn('⚠️ Some shared adapters not available:', (error as Error).message);
      // Continue with available adapters
    }
  }

  // =============================================================================
  // PROCESSOR FACTORY METHODS (Enhanced with Dynamic Extensions)
  // =============================================================================

  createProcessor<TInput, TOutput>(
    type: 'pptx2json' | 'json2pptx' | 'thumbnails' | 'formats',
    options: ConversionProcessorOptions = {}
  ): BaseProcessor<TInput, TOutput> {
    const creator = this.processors.get(type);
    if (!creator) {
      throw new Error(`Conversion processor not found: ${type}`);
    }

    const processor = creator() as BaseProcessor<TInput, TOutput>;

    // Apply feature flags if provided
    if (options.features && this.isToggleableProcessor(processor)) {
      (processor as any).features = { ...(processor as any).features, ...options.features };
    }

    // Inject shared adapters AND dynamic registry if requested
    if (options.useSharedAdapters && this.hasAdapterInjection(processor)) {
      const dependencies = {
        ...this.dependencies,
        dynamicRegistry: options.dynamicRegistry || getDynamicRegistry()
      };
      (processor as any).injectAdapters(dependencies);
    }

    // Inject dynamic registry directly if processor supports it
    if (this.hasDynamicRegistrySupport(processor)) {
      (processor as any).setDynamicRegistry(options.dynamicRegistry || getDynamicRegistry());
    }

    return processor;
  }

  // Specific factory methods for each processor type (enhanced)
  createPPTX2JSONProcessor(options: ConversionProcessorOptions = {}): PPTX2JSONProcessor {
    const defaultFeatures: FeatureFlags = {
      extractAssets: true,
      includeMetadata: true,
      enableAI: false,
      cacheResults: true,
      validateInput: true,
      generateThumbnails: false,
      mode: 'local'
    };

    const effectiveFeatures = { ...defaultFeatures, ...options.features };
    
    // Get dynamic registry for enhanced processing
    const dynamicRegistry = getDynamicRegistry();
    
    logger.info('Creating PPTX2JSON processor with dynamic extensions', {
      enabledExtensions: Array.from(dynamicRegistry.keys()),
      features: effectiveFeatures
    });
    
    return this.createProcessor<any, any>('pptx2json', {
      ...options,
      features: effectiveFeatures,
      useSharedAdapters: true,
      dynamicRegistry
    }) as PPTX2JSONProcessor;
  }

  // =============================================================================
  // COMPREHENSIVE SERVICE FACTORY (Enhanced with Dynamic Registry)
  // =============================================================================

  createComprehensiveConversionService(options: ConversionProcessorOptions = {}): ConversionService {
    try {
      // Get required dependencies including dynamic registry
      const asposeAdapter = this.dependencies.aspose || sharedAdapters.getAspose();
      if (!asposeAdapter) {
        throw new Error('Aspose adapter not available for ConversionService');
      }

      // Get dynamic registry for enhanced functionality
      const dynamicRegistry = getDynamicRegistry();

      // Create required sub-services
      const asposeConversion = new (require('../../../adapters/aspose/services/ConversionService')).ConversionService({
        licenseFilePath: './Aspose.Slides.Product.Family.lic',
        tempDirectory: './temp/aspose',
        maxFileSize: 62914560,
        enableLogging: true,
        timeoutMs: 120000
      });

      const assetService = new (require('../../../adapters/aspose/services/AssetService')).AssetService({});
      const metadataService = new (require('../../../adapters/aspose/services/MetadataService')).MetadataService({});
      const thumbnailService = new (require('../../../adapters/aspose/services/ThumbnailService')).ThumbnailService({});

      // Create comprehensive ConversionService with dynamic registry
      const conversionService = new ConversionService(
        asposeAdapter,
        asposeConversion,
        assetService,
        metadataService,
        thumbnailService,
        dynamicRegistry // Pass dynamic registry as additional parameter
      );

      // Initialize with dynamic extensions info
      if (conversionService.initialize) {
        conversionService.initialize().then(() => {
          logger.info('ConversionService initialized with dynamic extensions', {
            extensions: Array.from(dynamicRegistry.keys())
          });
        }).catch(error => {
          logger.error('ConversionService initialization failed:', error);
        });
      }

      return conversionService;

    } catch (error) {
      throw new Error(`Failed to create ConversionService: ${(error as Error).message}`);
    }
  }

  // =============================================================================
  // SERVICE FACTORY METHODS (Enhanced)
  // =============================================================================

  createService(type: string, config?: any): BaseService {
    const creator = this.services.get(type);
    if (!creator) {
      throw new Error(`Conversion service not found: ${type}`);
    }

    const service = creator();

    // Inject dependencies including dynamic registry if service supports it
    if (this.hasServiceDependencyInjection(service)) {
      const enhancedDependencies = {
        ...this.dependencies,
        dynamicRegistry: getDynamicRegistry()
      };
      (service as any).injectDependencies(enhancedDependencies);
    }

    return service;
  }

  // =============================================================================
  // PIPELINE FACTORY (Enhanced with Dynamic Extensions)
  // =============================================================================

  createProcessingPipeline(
    steps: Array<'pptx2json' | 'json2pptx' | 'thumbnails' | 'formats'>,
    globalFeatures?: FeatureFlags
  ) {
    const dynamicRegistry = getDynamicRegistry();
    
    const processors = steps.map(step => 
      this.createProcessor(step, { 
        features: globalFeatures, 
        useSharedAdapters: true,
        dynamicRegistry 
      })
    );

    // Capture reference to factory methods
    const isToggleableProcessor = this.isToggleableProcessor.bind(this);

    return {
      processors,
      dynamicRegistry, // Expose registry for pipeline access
      
      async execute(input: any, context?: any) {
        let result = input;
        
        for (const processor of processors) {
          result = await processor.process(result);
        }
        
        return result;
      },
      
      async executeWithFeatures(input: any, features: FeatureFlags, context?: any) {
        let result = input;
        
        for (const processor of processors) {
          if (isToggleableProcessor(processor)) {
            result = await (processor as any).processWithFeatures(result, {}, features);
          } else {
            result = await processor.process(result);
          }
        }
        
        return result;
      },

      // New method: Execute with dynamic extensions
      async executeWithDynamicExtensions(
        input: any, 
        enabledExtensions: string[], 
        context?: any
      ) {
        let result = input;
        
        for (const processor of processors) {
          // Filter dynamic registry based on enabled extensions
          const filteredRegistry = new Map();
          enabledExtensions.forEach(ext => {
            const extension = dynamicRegistry.get(ext);
            if (extension) {
              filteredRegistry.set(ext, extension);
            }
          });

          // Set filtered registry if processor supports it
          if (this.hasDynamicRegistrySupport(processor)) {
            (processor as any).setDynamicRegistry(filteredRegistry);
          }

          result = await processor.process(result);
        }
        
        return result;
      }
    };
  }

  // =============================================================================
  // DYNAMIC EXTENSION UTILITIES
  // =============================================================================

  public getDynamicExtension(type: string): any | null {
    return getDynamicExtension(type);
  }

  public getAvailableDynamicExtensions(): string[] {
    return Array.from(getDynamicRegistry().keys());
  }

  public isDynamicExtensionAvailable(type: string): boolean {
    return getDynamicRegistry().has(type);
  }

  // =============================================================================
  // UTILITY METHODS (Enhanced)
  // =============================================================================

  private isToggleableProcessor(processor: any): boolean {
    return processor && 
           'features' in processor && 
           typeof processor.processWithFeatures === 'function';
  }

  private hasAdapterInjection(processor: any): boolean {
    return processor && typeof processor.injectAdapters === 'function';
  }

  private hasServiceDependencyInjection(service: any): boolean {
    return service && typeof service.injectDependencies === 'function';
  }

  // New utility: Check if processor supports dynamic registry
  private hasDynamicRegistrySupport(processor: any): boolean {
    return processor && typeof processor.setDynamicRegistry === 'function';
  }

  // =============================================================================
  // FACTORY STATS & INTROSPECTION (Enhanced)
  // =============================================================================

  getAvailableProcessors(): string[] {
    return Array.from(this.processors.keys());
  }

  getAvailableServices(): string[] {
    return Array.from(this.services.keys());
  }

  getDependencies(): ConversionServiceDependencies {
    return this.dependencies;
  }

  getStats() {
    const dynamicRegistry = getDynamicRegistry();
    
    return {
      processors: this.processors.size,
      services: this.services.size,
      controllers: this.controllers.size,
      dependencies: Object.keys(this.dependencies).length,
      adapterStatus: {
        firebase: !!this.dependencies.firebase,
        aspose: !!this.dependencies.aspose,
        openai: !!this.dependencies.openai,
      },
      dynamicExtensions: {
        available: dynamicRegistry.size,
        types: Array.from(dynamicRegistry.keys()),
        registry: !!this.dependencies.dynamicRegistry
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

export const conversionFactory = ConversionFactory.getInstance(); 