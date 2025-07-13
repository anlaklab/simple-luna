import { z } from "zod";
/**
 * Presentations Factory - Specialized Factory for Presentation Module
 * 
 * Provides DI and component creation specific to presentation operations.
 * Integrates with shared adapters and central module factory.
 */

import { 
  BaseProcessor, 
  BaseService, 
  BaseController,
  FeatureFlags 
} from '../shared/interfaces/base.interfaces';
import { sharedAdapters } from '../shared/adapters/shared-adapters';
import { SlideService } from './subservices/slide.service';
import { TemplateService } from './subservices/template.service';
import { NotesService } from './subservices/notes.service';
import { AsposeAdapterRefactored } from '../../adapters/aspose/AsposeAdapterRefactored';
import { ShapeExtractor } from '../../adapters/aspose/shape-extractor';

// =============================================================================
// PRESENTATIONS-SPECIFIC INTERFACES
// =============================================================================

export interface PresentationServiceOptions {
  features?: FeatureFlags;
  useSharedAdapters?: boolean;
  cacheResults?: boolean;
  validateInput?: boolean;
}

export interface PresentationServiceDependencies {
  firebase?: any;
  aspose?: any;
  openai?: any;
}

// =============================================================================
// PRESENTATIONS FACTORY (Specialized)
// =============================================================================

export class PresentationsFactory {
  private static instance: PresentationsFactory;
  
  // Registry for presentation-specific components
  private processors = new Map<string, () => BaseProcessor<any, any>>();
  private services = new Map<string, () => BaseService>();
  private controllers = new Map<string, () => BaseController>();
  
  // Dependencies from shared adapters
  private dependencies: PresentationServiceDependencies = {};

  private constructor() {
    this.initializeDefaults();
  }

  public static getInstance(): PresentationsFactory {
    if (!PresentationsFactory.instance) {
      PresentationsFactory.instance = new PresentationsFactory();
    }
    return PresentationsFactory.instance;
  }

  // =============================================================================
  // INITIALIZATION
  // =============================================================================

  private initializeDefaults(): void {
    // Register default services
    this.services.set('slide', () => this.createSlideService());
    this.services.set('template', () => this.createTemplateService());
    this.services.set('notes', () => this.createNotesService());
  }

  async initialize(): Promise<void> {
    try {
      // Load dependencies from shared adapters
      this.dependencies = {
        firebase: sharedAdapters.getFirebase(),
        aspose: sharedAdapters.getAspose(),
        openai: sharedAdapters.getOpenAI(),
      };
      
      console.log('✅ Presentations Factory initialized with shared adapters');
    } catch (error) {
      console.warn('⚠️ Some shared adapters not available:', (error as Error).message);
      // Continue with available adapters
    }
  }

  // =============================================================================
  // SERVICE FACTORY METHODS
  // =============================================================================

  createService(type: string, config?: any): BaseService {
    const creator = this.services.get(type);
    if (!creator) {
      throw new Error(`Presentation service not found: ${type}`);
    }

    const service = creator();

    // Inject dependencies if service supports it
    if (this.hasServiceDependencyInjection(service)) {
      (service as any).injectDependencies(this.dependencies);
    }

    return service;
  }

  // Specific factory methods for each service type
  createSlideService(options: PresentationServiceOptions = {}): SlideService {
    try {
      // Get required dependencies
      const asposeAdapter = this.dependencies.aspose || sharedAdapters.getAspose();
      if (!asposeAdapter) {
        throw new Error('Aspose adapter not available for SlideService');
      }

      // Create shape extractor
      const shapeExtractor = new ShapeExtractor();

      // Create SlideService with dependencies
      const slideService = new SlideService(asposeAdapter, shapeExtractor);

      // Initialize if needed
      if (slideService.initialize) {
        slideService.initialize().catch(error => {
          console.error('SlideService initialization failed:', error);
        });
      }

      return slideService;

    } catch (error) {
      throw new Error(`Failed to create SlideService: ${(error as Error).message}`);
    }
  }

  createTemplateService(options: PresentationServiceOptions = {}): TemplateService {
    try {
      // Get required dependencies
      const asposeAdapter = this.dependencies.aspose || sharedAdapters.getAspose();
      if (!asposeAdapter) {
        throw new Error('Aspose adapter not available for TemplateService');
      }

      // Create TemplateService with dependencies
      const templateService = new TemplateService(asposeAdapter);

      // Initialize if needed
      if (templateService.initialize) {
        templateService.initialize().catch(error => {
          console.error('TemplateService initialization failed:', error);
        });
      }

      return templateService;

    } catch (error) {
      throw new Error(`Failed to create TemplateService: ${(error as Error).message}`);
    }
  }

  createNotesService(options: PresentationServiceOptions = {}): NotesService {
    try {
      // Get required dependencies
      const asposeAdapter = this.dependencies.aspose || sharedAdapters.getAspose();
      if (!asposeAdapter) {
        throw new Error('Aspose adapter not available for NotesService');
      }

      // Create NotesService with dependencies
      const notesService = new NotesService(asposeAdapter);

      // Initialize if needed
      if (notesService.initialize) {
        notesService.initialize().catch(error => {
          console.error('NotesService initialization failed:', error);
        });
      }

      return notesService;

    } catch (error) {
      throw new Error(`Failed to create NotesService: ${(error as Error).message}`);
    }
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  private hasServiceDependencyInjection(service: any): boolean {
    return service && typeof service.injectDependencies === 'function';
  }

  // =============================================================================
  // FACTORY STATS & INTROSPECTION
  // =============================================================================

  getAvailableServices(): string[] {
    return Array.from(this.services.keys());
  }

  getDependencies(): PresentationServiceDependencies {
    return this.dependencies;
  }

  getStats() {
    return {
      processors: this.processors.size,
      services: this.services.size,
      controllers: this.controllers.size,
      dependencies: Object.keys(this.dependencies).length,
      adapterStatus: {
        firebase: !!this.dependencies.firebase,
        aspose: !!this.dependencies.aspose,
        openai: !!this.dependencies.openai,
      }
    };
  }

  // Register custom services dynamically
  registerService(name: string, creator: () => BaseService): void {
    this.services.set(name, creator);
  }
}

// =============================================================================
// CONVENIENCE EXPORTS
// =============================================================================

export const presentationsFactory = PresentationsFactory.getInstance(); 