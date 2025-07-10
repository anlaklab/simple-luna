/**
 * Module Factory - Central DI Container & Factory Registry
 * 
 * Integrates specialized factories and provides centralized component management.
 * Updated to work with shared adapters and specialized module factories.
 * Enhanced with Dynamic Component Loading for ultimate scalability.
 */

import fs from 'fs';
import path from 'path';
import { 
  BaseProcessor, 
  BaseService, 
  BaseController,
  BaseAdapter,
  FeatureFlags 
} from '../interfaces/base.interfaces';
import { sharedAdapters, SharedAdapterRegistry } from '../adapters/shared-adapters';
import { logger } from '../../../utils/logger';
import { 
  DynamicLoadingSecurityManager,
  DEFAULT_SECURITY_CONFIG,
  DEFAULT_VALIDATION_CONFIG,
  DEFAULT_ROBUSTNESS_CONFIG
} from '../config/dynamic-loading.config';

// Import specialized factories
import { conversionFactory, ConversionFactory } from '../../conversion/factories/conversion.factory';
import { aiFactory, AIFactory } from '../../ai/factories/ai.factory';

// =============================================================================
// DYNAMIC LOADING INTERFACES
// =============================================================================

export interface DynamicLoadConfig {
  options: {
    enabledExtensions: string[];
    mode: 'local' | 'cloud';
    extensionsDir?: string;
    maxExtensions?: number;
  };
  dependencies?: {
    aspose?: any;
    firebase?: any;
    openai?: any;
  };
}

export interface ExtensionMetadata {
  name: string;
  version: string;
  loadedAt: Date;
  filePath: string;
  supportedTypes: string[];
}

// =============================================================================
// GLOBAL DYNAMIC REGISTRY (Enhanced with Security)
// =============================================================================

const dynamicRegistry = new Map<string, any>();
const extensionMetadata = new Map<string, ExtensionMetadata>();
let registryInitialized = false;
let securityManager: DynamicLoadingSecurityManager;

// =============================================================================
// DYNAMIC COMPONENT LOADING FUNCTIONS (Enhanced with Security)
// =============================================================================

export function loadDynamicComponents(config: DynamicLoadConfig): Map<string, any> {
  const startTime = Date.now();
  
  try {
    logger.info('Starting dynamic component loading with enhanced security', { config: config.options });

    // Initialize security manager if not already done
    if (!securityManager) {
      securityManager = new DynamicLoadingSecurityManager(
        {
          ...DEFAULT_SECURITY_CONFIG,
          allowedExtensionTypes: config.options.enabledExtensions || DEFAULT_SECURITY_CONFIG.allowedExtensionTypes
        },
        DEFAULT_VALIDATION_CONFIG,
        {
          ...DEFAULT_ROBUSTNESS_CONFIG,
          enableHotReload: process.env.NODE_ENV === 'development'
        }
      );
    }

    // Use provided dir or default
    const extensionsDir = config.options.extensionsDir || path.join(__dirname, '../extensions');
    
    if (!fs.existsSync(extensionsDir)) {
      logger.warn('Extensions directory not found - skipping dynamic load', { extensionsDir });
      return dynamicRegistry;
    }

    // Security check: Validate extensions directory
    const dirValidation = securityManager['security'].validateFilePath(extensionsDir);
    if (!dirValidation.valid) {
      logger.error('Extensions directory failed security validation', { 
        extensionsDir, 
        reason: dirValidation.reason 
      });
      return dynamicRegistry;
    }

    // Get extension files matching pattern
    const files = fs.readdirSync(extensionsDir).filter(file => 
      (file.endsWith('-extension.ts') || file.endsWith('-extension.js')) &&
      !file.startsWith('.')
    );

    logger.info(`Found ${files.length} potential extensions`, { files });

    // Limit extensions for security/performance
    const maxExtensions = config.options.maxExtensions || 20;
    const filesToProcess = files.slice(0, maxExtensions);

    let loadedCount = 0;
    let failedCount = 0;

    // Load extensions with enhanced security
    const loadPromises = filesToProcess.map(async file => {
      try {
        const type = file.replace('-extension.ts', '').replace('-extension.js', '');
        
        // Check if extension is enabled
        if (config.options.enabledExtensions.includes(type)) {
          const success = await loadSingleExtensionSecure(extensionsDir, file, type, config);
          if (success) {
            loadedCount++;
          } else {
            failedCount++;
          }
        } else {
          logger.debug(`Extension ${type} not enabled - skipping`);
        }
      } catch (error) {
        logger.error(`Failed to process extension file ${file}`, { error: (error as Error).message });
        failedCount++;
      }
    });

    // Wait for all extensions to load (with timeout)
    Promise.allSettled(loadPromises).then(() => {
      const loadTime = Date.now() - startTime;
      
      logger.info('Dynamic component loading completed with security validation', {
        totalFiles: files.length,
        processed: filesToProcess.length,
        loaded: loadedCount,
        failed: failedCount,
        loadTime: `${loadTime}ms`,
        mode: config.options.mode,
        securityValidated: true
      });
    });

    registryInitialized = true;
    return dynamicRegistry;

  } catch (error) {
    logger.error('Dynamic component loading failed', { error: (error as Error).message });
    return dynamicRegistry;
  }
}

async function loadSingleExtensionSecure(
  extensionsDir: string, 
  file: string, 
  type: string, 
  config: DynamicLoadConfig
): Promise<boolean> {
  try {
    const extensionPath = path.join(extensionsDir, file);
    
    logger.info(`Loading extension ${type} with enhanced security validation`, { file });

    // Use security manager for comprehensive validation and loading
    const result = await securityManager.secureLoadExtension(
      extensionPath,
      type,
      dynamicRegistry,
      {
        aspose: config.dependencies?.aspose,
        firebase: config.dependencies?.firebase,
        openai: config.dependencies?.openai
      }
    );

    if (!result.success || !result.instance) {
      logger.error(`Security validation failed for extension ${type}`, { 
        error: result.error,
        file 
      });
      return false;
    }

    const instance = result.instance;

    // Initialize extension if it supports it
    if (instance.initialize && typeof instance.initialize === 'function') {
      try {
        await instance.initialize();
      } catch (initError) {
        logger.warn(`Extension ${type} initialization failed`, { 
          error: (initError as Error).message 
        });
        // Continue loading even if initialization fails
      }
    }

    // Register extension
    dynamicRegistry.set(type, instance);

    // Store metadata
    extensionMetadata.set(type, {
      name: instance.name || type,
      version: instance.version || '1.0.0',
      loadedAt: new Date(),
      filePath: extensionPath,
      supportedTypes: instance.supportedTypes || [type]
    });

    logger.info(`Successfully loaded and validated dynamic extension: ${type}`, {
      name: instance.name,
      version: instance.version,
      supportedTypes: instance.supportedTypes,
      mode: config.options.mode,
      securityValidated: true
    });

    return true;

  } catch (error) {
    logger.error(`Failed to load extension ${type} from ${file} with security validation`, { 
      error: (error as Error).message,
      stack: (error as Error).stack 
    });
    return false;
  }
}

// Legacy function for backward compatibility (now uses secure loading)
function loadSingleExtension(
  extensionsDir: string, 
  file: string, 
  type: string, 
  config: DynamicLoadConfig
): boolean {
  // Redirect to secure loading
  loadSingleExtensionSecure(extensionsDir, file, type, config)
    .then(success => {
      if (!success) {
        logger.warn(`Legacy load fallback failed for ${type}`);
      }
    })
    .catch(error => {
      logger.error(`Legacy load fallback error for ${type}`, { error: (error as Error).message });
    });
  
  return true; // Return true to avoid blocking, actual result handled async
}

// =============================================================================
// DYNAMIC REGISTRY ACCESS FUNCTIONS
// =============================================================================

export function getDynamicRegistry(): Map<string, any> {
  return dynamicRegistry;
}

export function getDynamicExtension(type: string): any | null {
  return dynamicRegistry.get(type) || null;
}

export function getExtensionMetadata(type?: string): ExtensionMetadata[] | ExtensionMetadata | null {
  if (type) {
    return extensionMetadata.get(type) || null;
  }
  return Array.from(extensionMetadata.values());
}

export function isDynamicRegistryInitialized(): boolean {
  return registryInitialized;
}

export function getLoadedExtensionTypes(): string[] {
  return Array.from(dynamicRegistry.keys());
}

export function clearDynamicRegistry(): void {
  // Dispose extensions if they support it
  dynamicRegistry.forEach((extension, type) => {
    if (extension.dispose && typeof extension.dispose === 'function') {
      extension.dispose().catch((error: Error) => {
        logger.warn(`Extension ${type} disposal failed`, { error: error.message });
      });
    }
  });

  dynamicRegistry.clear();
  extensionMetadata.clear();
  registryInitialized = false;
  logger.info('Dynamic registry cleared');
}

// =============================================================================
// HOT RELOAD SUPPORT (Development)
// =============================================================================

export function reloadDynamicComponents(config: DynamicLoadConfig): Map<string, any> {
  logger.info('Reloading dynamic components');
  clearDynamicRegistry();
  return loadDynamicComponents(config);
}

// =============================================================================
// SECURITY AND HEALTH CHECK FUNCTIONS
// =============================================================================

export function getDynamicLoadingStats(): any {
  const baseStats = {
    registry: {
      initialized: registryInitialized,
      totalExtensions: dynamicRegistry.size,
      types: Array.from(dynamicRegistry.keys()),
      metadata: Array.from(extensionMetadata.values())
    }
  };

  if (securityManager) {
    return {
      ...baseStats,
      security: securityManager.getSecurityStats()
    };
  }

  return baseStats;
}

export function validateDynamicRegistry(): { valid: boolean; issues: string[] } {
  const issues: string[] = [];

  if (!registryInitialized) {
    issues.push('Registry not initialized');
  }

  if (dynamicRegistry.size === 0) {
    issues.push('No extensions loaded');
  }

  // Validate each extension
  for (const [type, extension] of dynamicRegistry.entries()) {
    try {
      if (!extension.extract || typeof extension.extract !== 'function') {
        issues.push(`Extension ${type} missing extract method`);
      }
      
      if (!extension.name || typeof extension.name !== 'string') {
        issues.push(`Extension ${type} missing valid name`);
      }

      if (!extension.version || typeof extension.version !== 'string') {
        issues.push(`Extension ${type} missing valid version`);
      }

    } catch (error) {
      issues.push(`Extension ${type} validation error: ${(error as Error).message}`);
    }
  }

  return {
    valid: issues.length === 0,
    issues
  };
}

// =============================================================================
// CENTRAL MODULE FACTORY (Enhanced with Dynamic Loading)
// =============================================================================

export class ModuleFactory {
  private static instance: ModuleFactory;
  
  // Central registries
  private processors = new Map<string, BaseProcessor<any, any>>();
  private services = new Map<string, BaseService>();
  private controllers = new Map<string, BaseController>();
  private adapters = new Map<string, BaseAdapter>();
  
  // Specialized factory references
  private conversionFactory: ConversionFactory;
  private aiFactory: AIFactory;
  private adapterRegistry: SharedAdapterRegistry;
  
  // Global feature flags and config
  private globalFeatures: FeatureFlags = {
    extractAssets: true,
    includeMetadata: true,
    enableAI: false,
    cacheResults: true,
    validateInput: true,
    generateThumbnails: false,
    mode: 'local'
  };

  // Dynamic loading config
  private dynamicConfig: DynamicLoadConfig = {
    options: {
      enabledExtensions: ['chart', 'table'], // Default enabled
      mode: 'local',
      maxExtensions: 20
    }
  };

  private constructor() {
    this.conversionFactory = conversionFactory;
    this.aiFactory = aiFactory;
    this.adapterRegistry = sharedAdapters;
  }

  public static getInstance(): ModuleFactory {
    if (!ModuleFactory.instance) {
      ModuleFactory.instance = new ModuleFactory();
    }
    return ModuleFactory.instance;
  }

  // =============================================================================
  // INITIALIZATION & ADAPTER SETUP (Enhanced with Dynamic Loading)
  // =============================================================================

  async initialize(configs?: {
    firebase?: any;
    openai?: any;
    aspose?: any;
    features?: FeatureFlags;
    dynamicLoading?: {
      enabledExtensions?: string[];
      extensionsDir?: string;
      maxExtensions?: number;
    };
  }): Promise<void> {
    try {
      // Apply global features if provided
      if (configs?.features) {
        this.globalFeatures = { ...this.globalFeatures, ...configs.features };
      }

      // Configure dynamic loading
      if (configs?.dynamicLoading) {
        this.dynamicConfig.options = {
          ...this.dynamicConfig.options,
          ...configs.dynamicLoading
        };
      }

      // Initialize shared adapters first
      if (configs?.firebase || configs?.openai || configs?.aspose) {
        await this.adapterRegistry.initializeAll({
          firebase: configs.firebase,
          openai: configs.openai,
          aspose: configs.aspose
        });
      }

      // Set up dynamic loading dependencies
      this.dynamicConfig.dependencies = {
        aspose: this.adapterRegistry.getAspose(),
        firebase: this.adapterRegistry.getFirebase(),
        openai: this.adapterRegistry.getOpenAI()
      };

      // Load dynamic components
      const loadedExtensions = loadDynamicComponents(this.dynamicConfig);
      
      // Initialize specialized factories
      await this.conversionFactory.initialize();
      await this.aiFactory.initialize();

      logger.info('✅ Central Module Factory initialized successfully', {
        loadedExtensions: loadedExtensions.size,
        globalFeatures: this.globalFeatures,
        dynamicConfig: this.dynamicConfig.options
      });

    } catch (error) {
      logger.error('❌ Module Factory initialization failed:', (error as Error).message);
      throw error;
    }
  }

  // =============================================================================
  // DYNAMIC EXTENSION MANAGEMENT
  // =============================================================================

  public enableDynamicExtension(type: string): boolean {
    if (!this.dynamicConfig.options.enabledExtensions.includes(type)) {
      this.dynamicConfig.options.enabledExtensions.push(type);
      
      // Reload to pick up newly enabled extension
      loadDynamicComponents(this.dynamicConfig);
      return true;
    }
    return false;
  }

  public disableDynamicExtension(type: string): boolean {
    const index = this.dynamicConfig.options.enabledExtensions.indexOf(type);
    if (index !== -1) {
      this.dynamicConfig.options.enabledExtensions.splice(index, 1);
      
      // Remove from registry
      const extension = dynamicRegistry.get(type);
      if (extension && extension.dispose) {
        extension.dispose().catch((error: Error) => {
          logger.warn(`Extension ${type} disposal failed`, { error: error.message });
        });
      }
      dynamicRegistry.delete(type);
      extensionMetadata.delete(type);
      
      return true;
    }
    return false;
  }

  public getDynamicExtensionStats(): any {
    return {
      totalLoaded: dynamicRegistry.size,
      types: Array.from(dynamicRegistry.keys()),
      metadata: Array.from(extensionMetadata.values()),
      initialized: registryInitialized,
      config: this.dynamicConfig.options
    };
  }

  // =============================================================================
  // PROCESSOR FACTORY METHODS (Routing to Specialized Factories)
  // =============================================================================

  createProcessor<TInput, TOutput>(
    type: string,
    options?: any
  ): BaseProcessor<TInput, TOutput> {
    // Route to appropriate specialized factory
    if (this.isConversionProcessor(type)) {
      return this.conversionFactory.createProcessor<TInput, TOutput>(
        type as any, 
        { ...options, features: this.globalFeatures, dynamicRegistry }
      );
    }
    
    if (this.isAIProcessor(type)) {
      return this.aiFactory.createProcessor<TInput, TOutput>(
        type as any,
        { ...options, useOpenAI: true, dynamicRegistry }
      );
    }

    // Check central registry
    const processor = this.processors.get(type);
    if (!processor) {
      throw new Error(`Processor not found: ${type}`);
    }
    
    return processor as BaseProcessor<TInput, TOutput>;
  }

  // =============================================================================
  // CONVENIENCE FACTORY METHODS (High-level APIs)
  // =============================================================================

  // Conversion processors
  createConversionProcessor<TInput, TOutput>(
    type: 'pptx2json' | 'json2pptx' | 'thumbnails' | 'formats',
    options?: any
  ): BaseProcessor<TInput, TOutput> {
    return this.conversionFactory.createProcessor<TInput, TOutput>(type, {
      features: this.globalFeatures,
      useSharedAdapters: true,
      ...options
    });
  }

  // AI processors
  createAIProcessor<TInput, TOutput>(
    type: 'translate' | 'analyze' | 'chat' | 'suggestions',
    options?: any
  ): BaseProcessor<TInput, TOutput> {
    return this.aiFactory.createProcessor<TInput, TOutput>(type, {
      useOpenAI: true,
      enableCaching: this.globalFeatures.cacheResults,
      ...options
    });
  }

  // =============================================================================
  // PIPELINE FACTORY (Cross-module pipelines)
  // =============================================================================

  createCrossModulePipeline(steps: Array<{
    type: string;
    module: 'conversion' | 'ai' | 'extraction' | 'analysis';
    options?: any;
  }>) {
    const processors = steps.map(step => {
      switch (step.module) {
        case 'conversion':
          return this.createConversionProcessor(step.type as any, step.options);
        case 'ai':
          return this.createAIProcessor(step.type as any, step.options);
        default:
          return this.createProcessor(step.type, step.options);
      }
    });

    return {
      processors,
      async execute(input: any, context?: any) {
        let result = input;
        const executionLog: any[] = [];
        
        for (const [index, processor] of processors.entries()) {
          const stepStart = Date.now();
          try {
            result = await processor.process(result);
            executionLog.push({
              step: index,
              processor: processor.name,
              duration: Date.now() - stepStart,
              success: true
            });
          } catch (error) {
            executionLog.push({
              step: index,
              processor: processor.name,
              duration: Date.now() - stepStart,
              success: false,
              error: (error as Error).message
            });
            throw error;
          }
        }
        
        return { result, executionLog };
      }
    };
  }

  // =============================================================================
  // FEATURE-DRIVEN PROCESSOR CREATION
  // =============================================================================

  createFeatureDrivenProcessor(
    baseType: string,
    features: FeatureFlags,
    module?: 'conversion' | 'ai'
  ) {
    const effectiveFeatures = { ...this.globalFeatures, ...features };
    
    if (module === 'conversion' || this.isConversionProcessor(baseType)) {
      return this.conversionFactory.createProcessor(baseType as any, {
        features: effectiveFeatures,
        useSharedAdapters: true
      });
    }
    
    if (module === 'ai' || this.isAIProcessor(baseType)) {
      return this.aiFactory.createProcessor(baseType as any, {
        features: effectiveFeatures,
        useOpenAI: true
      });
    }
    
    throw new Error(`Cannot create feature-driven processor for unknown type: ${baseType}`);
  }

  // =============================================================================
  // BATCH PROCESSING FACTORY
  // =============================================================================

  createUniversalBatchProcessor(
    processorType: string,
    module: 'conversion' | 'ai',
    batchOptions: {
      concurrency?: number;
      retryAttempts?: number;
      features?: FeatureFlags;
    } = {}
  ) {
    const { concurrency = 3, retryAttempts = 2, features } = batchOptions;
    
    // Capture references to factory methods
    const createConversionProcessor = this.createConversionProcessor.bind(this);
    const createAIProcessor = this.createAIProcessor.bind(this);
    
    return {
      async processBatch<TInput, TOutput>(
        inputs: TInput[],
        progressCallback?: (completed: number, total: number, errors: Error[]) => void
      ): Promise<{ results: TOutput[]; errors: Error[] }> {
        const results: TOutput[] = [];
        const errors: Error[] = [];
        
        for (let i = 0; i < inputs.length; i += concurrency) {
          const chunk = inputs.slice(i, i + concurrency);
          
          const chunkPromises = chunk.map(async (input): Promise<TOutput | null> => {
            let attempt = 0;
            while (attempt <= retryAttempts) {
              try {
                const processor = module === 'conversion'
                  ? createConversionProcessor(processorType as any, { features })
                  : createAIProcessor(processorType as any, { features });
                
                const result = await processor.process(input);
                return result as TOutput;
              } catch (error) {
                attempt++;
                if (attempt > retryAttempts) {
                  errors.push(error as Error);
                  return null;
                }
                await new Promise(resolve => setTimeout(resolve, attempt * 1000));
              }
            }
            return null;
          });
          
          const chunkResults = await Promise.allSettled(chunkPromises);
          
          chunkResults.forEach((result) => {
            if (result.status === 'fulfilled' && result.value !== null) {
              results.push(result.value);
            }
          });
          
          if (progressCallback) {
            progressCallback(Math.min(i + concurrency, inputs.length), inputs.length, errors);
          }
        }
        
        return { results, errors };
      }
    };
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  private isConversionProcessor(type: string): boolean {
    return ['pptx2json', 'json2pptx', 'thumbnails', 'formats'].includes(type);
  }

  private isAIProcessor(type: string): boolean {
    return ['translate', 'analyze', 'chat', 'suggestions'].includes(type);
  }

  // =============================================================================
  // REGISTRY MANAGEMENT
  // =============================================================================

  registerProcessor(name: string, processor: BaseProcessor<any, any>): void {
    this.processors.set(name, processor);
  }

  registerService(name: string, service: BaseService): void {
    this.services.set(name, service);
  }

  registerController(name: string, controller: BaseController): void {
    this.controllers.set(name, controller);
  }

  // =============================================================================
  // INTROSPECTION & HEALTH CHECK
  // =============================================================================

  getStats() {
    const dynamicStats = this.getDynamicExtensionStats();
    
    return {
      central: {
        processors: this.processors.size,
        services: this.services.size,
        controllers: this.controllers.size,
        adapters: this.adapters.size
      },
      specialized: {
        conversion: this.conversionFactory.getStats(),
        ai: this.aiFactory.getStats()
      },
      dynamic: dynamicStats,
      adapters: this.adapterRegistry.getAvailableAdapters(),
      globalFeatures: this.globalFeatures
    };
  }

  getAllAvailableProcessors(): Record<string, string[]> {
    return {
      central: Array.from(this.processors.keys()),
      conversion: this.conversionFactory.getAvailableProcessors(),
      ai: this.aiFactory.getAvailableProcessors()
    };
  }

  async healthCheckAll() {
    const results = {
      adapters: await this.adapterRegistry.healthCheckAll(),
      central: {
        processors: this.processors.size,
        services: this.services.size,
        lastCheck: new Date()
      }
    };
    
    return results;
  }

  // =============================================================================
  // GLOBAL FEATURE FLAGS MANAGEMENT
  // =============================================================================

  updateGlobalFeatures(features: Partial<FeatureFlags>): void {
    this.globalFeatures = { ...this.globalFeatures, ...features };
    console.log('✅ Global features updated:', this.globalFeatures);
  }

  getGlobalFeatures(): FeatureFlags {
    return { ...this.globalFeatures };
  }

  // Reset to defaults
  resetGlobalFeatures(): void {
    this.globalFeatures = {
      extractAssets: true,
      includeMetadata: true,
      enableAI: false,
      cacheResults: true,
      validateInput: true,
      generateThumbnails: false,
      mode: 'local'
    };
  }
}

// =============================================================================
// CONVENIENCE EXPORTS
// =============================================================================

export const moduleFactory = ModuleFactory.getInstance(); 