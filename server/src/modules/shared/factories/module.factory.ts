/**
 * Module Factory - Centralized Dependency Injection & Module Management
 * 
 * Implements factory pattern for creating and managing Luna modules.
 * Provides centralized DI container and module registration system.
 */

import { 
  BaseProcessor, 
  BaseService, 
  BaseController, 
  BaseAdapter,
  BaseFactory,
  ModuleDefinition,
  FeatureFlags,
  ToggleableProcessor
} from '../interfaces/base.interfaces';

// =============================================================================
// CENTRALIZED MODULE FACTORY (DI Container)
// =============================================================================

export class ModuleFactory implements BaseFactory<any> {
  private static instance: ModuleFactory;
  
  // Registry maps for different component types
  private processors = new Map<string, () => BaseProcessor<any, any>>();
  private services = new Map<string, () => BaseService>();
  private controllers = new Map<string, () => BaseController>();
  private adapters = new Map<string, () => BaseAdapter>();
  private modules = new Map<string, ModuleDefinition>();
  
  // Singleton pattern
  private constructor() {}
  
  public static getInstance(): ModuleFactory {
    if (!ModuleFactory.instance) {
      ModuleFactory.instance = new ModuleFactory();
    }
    return ModuleFactory.instance;
  }

  // =============================================================================
  // GENERIC FACTORY METHODS
  // =============================================================================

  create(type: string, options?: any): any {
    // Try to create from different registries
    if (this.processors.has(type)) {
      return this.createProcessor(type, options);
    }
    if (this.services.has(type)) {
      return this.createService(type, options);
    }
    if (this.controllers.has(type)) {
      return this.createController(type, options);
    }
    if (this.adapters.has(type)) {
      return this.createAdapter(type, options);
    }
    
    throw new Error(`Unknown component type: ${type}`);
  }

  register(type: string, creator: () => any): void {
    // Auto-detect component type and register appropriately
    const instance = creator();
    
    if (this.isProcessor(instance)) {
      this.processors.set(type, creator as () => BaseProcessor<any, any>);
    } else if (this.isService(instance)) {
      this.services.set(type, creator as () => BaseService);
    } else if (this.isController(instance)) {
      this.controllers.set(type, creator as () => BaseController);
    } else if (this.isAdapter(instance)) {
      this.adapters.set(type, creator as () => BaseAdapter);
    } else {
      throw new Error(`Cannot determine component type for: ${type}`);
    }
  }

  getAvailableTypes(): string[] {
    return [
      ...Array.from(this.processors.keys()).map(k => `processor:${k}`),
      ...Array.from(this.services.keys()).map(k => `service:${k}`),
      ...Array.from(this.controllers.keys()).map(k => `controller:${k}`),
      ...Array.from(this.adapters.keys()).map(k => `adapter:${k}`),
    ];
  }

  // =============================================================================
  // SPECIFIC COMPONENT FACTORIES
  // =============================================================================

  // Processor Factory (for processing pipelines)
  createProcessor<TInput, TOutput>(
    type: string, 
    options?: { features?: FeatureFlags }
  ): BaseProcessor<TInput, TOutput> {
    const creator = this.processors.get(type);
    if (!creator) {
      throw new Error(`Processor type not registered: ${type}`);
    }
    
    const processor = creator();
    
    // Apply feature flags if provided
    if (options?.features && this.isToggleableProcessor(processor)) {
      processor.features = { ...processor.features, ...options.features };
    }
    
    return processor;
  }

  // Service Factory
  createService(type: string, config?: any): BaseService {
    const creator = this.services.get(type);
    if (!creator) {
      throw new Error(`Service type not registered: ${type}`);
    }
    
    return creator();
  }

  // Controller Factory
  createController(type: string, dependencies?: any): BaseController {
    const creator = this.controllers.get(type);
    if (!creator) {
      throw new Error(`Controller type not registered: ${type}`);
    }
    
    return creator();
  }

  // Adapter Factory
  createAdapter<TConfig = any>(type: string, config?: TConfig): BaseAdapter<TConfig> {
    const creator = this.adapters.get(type);
    if (!creator) {
      throw new Error(`Adapter type not registered: ${type}`);
    }
    
    return creator();
  }

  // =============================================================================
  // MODULE MANAGEMENT
  // =============================================================================

  registerModule(module: ModuleDefinition): void {
    this.modules.set(module.name, module);
    
    // Auto-register all components from the module
    module.processors.forEach((processor, key) => {
      this.processors.set(`${module.name}:${key}`, () => processor);
    });
    
    module.services.forEach((service, key) => {
      this.services.set(`${module.name}:${key}`, () => service);
    });
    
    module.controllers.forEach((controller, key) => {
      this.controllers.set(`${module.name}:${key}`, () => controller);
    });
    
    module.adapters.forEach((adapter, key) => {
      this.adapters.set(`${module.name}:${key}`, () => adapter);
    });
  }

  async initializeModule(moduleName: string): Promise<void> {
    const module = this.modules.get(moduleName);
    if (!module) {
      throw new Error(`Module not found: ${moduleName}`);
    }
    
    await module.initialize();
  }

  async initializeAllModules(): Promise<void> {
    const initPromises = Array.from(this.modules.values()).map(module => 
      module.initialize()
    );
    
    await Promise.all(initPromises);
  }

  getModule(name: string): ModuleDefinition | undefined {
    return this.modules.get(name);
  }

  getAvailableModules(): string[] {
    return Array.from(this.modules.keys());
  }

  // =============================================================================
  // FEATURE-SPECIFIC FACTORIES (por módulo)
  // =============================================================================

  // Conversion Module Factory
  createConversionProcessor(
    type: 'pptx2json' | 'json2pptx' | 'thumbnails' | 'formats',
    features?: FeatureFlags
  ): BaseProcessor<any, any> {
    return this.createProcessor(`conversion:${type}`, { features });
  }

  // AI Module Factory
  createAIProcessor(
    type: 'translate' | 'analyze' | 'chat' | 'suggestions',
    features?: FeatureFlags
  ): BaseProcessor<any, any> {
    return this.createProcessor(`ai:${type}`, { features });
  }

  // Extraction Module Factory
  createExtractionProcessor(
    type: 'assets' | 'metadata' | 'async',
    features?: FeatureFlags
  ): BaseProcessor<any, any> {
    return this.createProcessor(`extraction:${type}`, { features });
  }

  // =============================================================================
  // TYPE DETECTION HELPERS (private)
  // =============================================================================

  private isProcessor(obj: any): obj is BaseProcessor<any, any> {
    return obj && 
           typeof obj.process === 'function' &&
           typeof obj.name === 'string' &&
           typeof obj.getCapabilities === 'function';
  }

  private isService(obj: any): obj is BaseService {
    return obj && 
           typeof obj.name === 'string' &&
           typeof obj.healthCheck === 'function';
  }

  private isController(obj: any): obj is BaseController {
    return obj && 
           typeof obj.module === 'string' &&
           Array.isArray(obj.endpoints) &&
           typeof obj.handleRequest === 'function';
  }

  private isAdapter(obj: any): obj is BaseAdapter {
    return obj && 
           typeof obj.name === 'string' &&
           typeof obj.type === 'string' &&
           typeof obj.initialize === 'function' &&
           typeof obj.isConnected === 'function';
  }

  private isToggleableProcessor(obj: any): obj is ToggleableProcessor<any, any> {
    return this.isProcessor(obj) && 
           'features' in obj &&
           typeof (obj as any).processWithFeatures === 'function';
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  clear(): void {
    this.processors.clear();
    this.services.clear();
    this.controllers.clear();
    this.adapters.clear();
    this.modules.clear();
  }

  getStats() {
    return {
      processors: this.processors.size,
      services: this.services.size,
      controllers: this.controllers.size,
      adapters: this.adapters.size,
      modules: this.modules.size,
      total: this.processors.size + this.services.size + this.controllers.size + this.adapters.size
    };
  }
}

// =============================================================================
// CONVENIENCE EXPORT (Singleton Instance)
// =============================================================================

export const moduleFactory = ModuleFactory.getInstance(); 