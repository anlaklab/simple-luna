/**
 * SlideService - Individual Slide Operations
 * 
 * Handles single slide operations (extract/transform) with toggleable features.
 * Integrates with base extractor + extensions for shapes.
 * Uses common mappers for fidelity and round-trip accuracy.
 */

import { logger } from '../../../utils/logger';
import { randomUUID } from 'crypto';
import { AsposeAdapterRefactored } from '../../../adapters/aspose/AsposeAdapterRefactored';
import { ShapeExtractor } from '../../../adapters/aspose/shape-extractor';
import { BaseService, ServiceHealth } from '../../shared/interfaces/base.interfaces';
import { ConversionOptions } from '../../../adapters/aspose/types/interfaces';
import { NotesService } from './notes.service';

// ✅ ROBUST IMPORT: Use AsposeDriverFactory for unified access
const asposeDriver = require('/app/lib/AsposeDriverFactory');

// =============================================================================
// SLIDE SERVICE INTERFACES
// =============================================================================

export interface SlideOptions {
  mode: 'local' | 'cloud';
  processShapes?: boolean;
  extensions?: string[];
  includeNotes?: boolean;
  includeBackground?: boolean;
  maxShapesPerSlide?: number;
  validateOutput?: boolean;
}

export interface UniversalSlide {
  id: number;
  slideNumber: number;
  name?: string;
  background?: any;
  shapes?: any[];
  notes?: string;
  animations?: any[];
  transitions?: any;
  layout?: any;
  master?: any;
  hidden?: boolean;
  metadata?: {
    extractedAt: string;
    shapeCount: number;
    hasNotes: boolean;
    processingTime: number;
  };
}

export interface SlideMapper {
  extract(slide: any, options: SlideOptions): Promise<UniversalSlide>;
  reconstruct(json: UniversalSlide, parentPresentation: any): Promise<any>;
}

// =============================================================================
// SLIDE SERVICE IMPLEMENTATION
// =============================================================================

export class SlideService implements BaseService {
  readonly name = 'slide';
  readonly version = '1.0.0';
  readonly description = 'Individual slide operations with toggleable features';

  private extensionsRegistry = new Map<string, any>();
  private slideMapper: SlideMapper;
  private isAsposeInitialized = false;

  constructor(
    private aspose: AsposeAdapterRefactored,
    private shapeExtractor: ShapeExtractor,
    private notesService?: NotesService
  ) {
    this.initializeDefaults();
    this.slideMapper = this.createSlideMapper();
  }

  // =============================================================================
  // INITIALIZATION
  // =============================================================================

  private initializeDefaults(): void {
    // Register default extensions
    this.extensionsRegistry.set('chart', {
      extract: async (shape: any) => this.extractChartData(shape),
      name: 'Chart Extension'
    });
    
    this.extensionsRegistry.set('table', {
      extract: async (shape: any) => this.extractTableData(shape),
      name: 'Table Extension'
    });
    
    this.extensionsRegistry.set('smartart', {
      extract: async (shape: any) => this.extractSmartArtData(shape),
      name: 'SmartArt Extension'
    });

    logger.info('SlideService initialized with default extensions', {
      extensions: Array.from(this.extensionsRegistry.keys())
    });
  }

  async initialize(): Promise<void> {
    try {
      // Validate Aspose adapter is available
      if (!this.aspose) {
        throw new Error('Aspose adapter not available');
      }

      // Validate shape extractor
      if (!this.shapeExtractor) {
        throw new Error('Shape extractor not available');
      }

      // ✅ Initialize AsposeDriverFactory
      await this.initializeAsposeDriver();

      logger.info('✅ SlideService initialized successfully');
    } catch (error) {
      logger.error('❌ SlideService initialization failed:', { error: (error as Error).message });
      throw error;
    }
  }

  private async initializeAsposeDriver(): Promise<void> {
    if (!this.isAsposeInitialized) {
      await asposeDriver.initialize();
      this.isAsposeInitialized = true;
      logger.info('✅ AsposeDriverFactory initialized in SlideService');
    }
  }

  async healthCheck(): Promise<ServiceHealth> {
    try {
      const isHealthy = this.isAvailable();
      const lastCheck = new Date();
      
      const details = {
        asposeAdapter: !!this.aspose,
        shapeExtractor: !!this.shapeExtractor,
        extensionsCount: this.extensionsRegistry.size,
        availableExtensions: Array.from(this.extensionsRegistry.keys())
      };

      if (!isHealthy) {
        return {
          status: 'unhealthy',
          lastCheck,
          details,
          errors: ['Required dependencies not available']
        };
      }

      return {
        status: 'healthy',
        lastCheck,
        details
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        lastCheck: new Date(),
        errors: [(error as Error).message]
      };
    }
  }

  // =============================================================================
  // CORE SLIDE OPERATIONS (Main Interface)
  // =============================================================================

  async extractSingleSlide(
    slide: any, 
    options: SlideOptions = { mode: 'local', processShapes: true }
  ): Promise<UniversalSlide> {
    const startTime = Date.now();
    
    try {
      logger.info('Extracting single slide', { 
        slideNumber: slide.getSlideNumber ? slide.getSlideNumber() : 'unknown',
        options 
      });

      // Build base slide data
      const baseData: UniversalSlide = {
        id: slide.getSlideNumber ? slide.getSlideNumber() : randomUUID(),
        slideNumber: slide.getSlideNumber ? slide.getSlideNumber() : 0,
        name: slide.getName ? slide.getName() : undefined,
        shapes: [],
        metadata: {
          extractedAt: new Date().toISOString(),
          shapeCount: 0,
          hasNotes: false,
          processingTime: 0
        }
      };

      // Extract background if enabled
      if (options.includeBackground !== false) {
        baseData.background = await this.extractSlideBackground(slide);
      }

      // Extract shapes if enabled
      if (options.processShapes !== false) {
        baseData.shapes = await this.extractSlideShapes(slide, options);
        baseData.metadata!.shapeCount = baseData.shapes.length;
      }

      // Extract notes if enabled
      if (options.includeNotes !== false) {
        baseData.notes = await this.extractSlideNotes(slide);
        baseData.metadata!.hasNotes = !!baseData.notes;
      }

      // Extract layout and master info
      baseData.layout = await this.extractSlideLayout(slide);
      baseData.master = await this.extractSlideMaster(slide);

      // Extract animations and transitions
      baseData.animations = await this.extractSlideAnimations(slide);
      baseData.transitions = await this.extractSlideTransitions(slide);

      // Check if slide is hidden
      baseData.hidden = slide.getHidden ? slide.getHidden() : false;

      // Validate output if enabled
      if (options.validateOutput) {
        this.validateSlideSchema(baseData);
      }

      // Calculate processing time
      baseData.metadata!.processingTime = Date.now() - startTime;

      logger.info('Single slide extraction completed', {
        slideNumber: baseData.slideNumber,
        shapeCount: baseData.metadata!.shapeCount,
        processingTime: baseData.metadata!.processingTime
      });

      return baseData;

    } catch (error) {
      logger.error('Single slide extraction failed', { 
        error: (error as Error).message,
        slideNumber: slide.getSlideNumber ? slide.getSlideNumber() : 'unknown'
      });
      throw error;
    }
  }

  async transformSingleSlide(
    json: UniversalSlide, 
    parentPresentation: any, 
    options: SlideOptions = { mode: 'local' }
  ): Promise<any> {
    try {
      logger.info('Transforming single slide', { 
        slideId: json.id, 
        shapeCount: json.shapes?.length || 0,
        options 
      });

      // Use common mapper for fidelity
      const newSlide = await this.slideMapper.reconstruct(json, parentPresentation);

      // Apply extensions for shape reconstruction if needed
      if (json.shapes && options.extensions?.length) {
        await this.applyReconstructionExtensions(newSlide, json.shapes, options.extensions);
      }

      logger.info('Single slide transformation completed', {
        slideId: json.id,
        success: true
      });

      return newSlide;

    } catch (error) {
      logger.error('Single slide transformation failed', { 
        error: (error as Error).message,
        slideId: json.id 
      });
      throw error;
    }
  }

  // =============================================================================
  // PRIVATE EXTRACTION METHODS
  // =============================================================================

  private async extractSlideShapes(slide: any, options: SlideOptions): Promise<any[]> {
    try {
      const shapes: any[] = [];
      
      if (!slide.getShapes) {
        return shapes;
      }

      const shapeCollection = slide.getShapes();
      const shapeCount = shapeCollection.size ? shapeCollection.size() : 0;
      const maxShapes = options.maxShapesPerSlide || 1000;

      logger.info(`Processing ${Math.min(shapeCount, maxShapes)} shapes on slide`);

      for (let i = 0; i < Math.min(shapeCount, maxShapes); i++) {
        try {
          const shape = shapeCollection.get_Item(i);
          if (!shape) continue;

          // Extract base shape using shape extractor
          let extractedShape = await this.shapeExtractor.processShape(shape, {
            includeAssets: true,
            includeMetadata: true
          });

          if (!extractedShape) continue;

          // Apply extensions if specified
          if (options.extensions?.length) {
            extractedShape = await this.applyShapeExtensions(shape, extractedShape, options.extensions);
          }

          shapes.push(extractedShape);

        } catch (shapeError) {
          logger.warn(`Failed to process shape ${i}`, { error: (shapeError as Error).message });
          // Continue with next shape
        }
      }

      return shapes;

    } catch (error) {
      logger.error('Failed to extract slide shapes', { error: (error as Error).message });
      return [];
    }
  }

  private async extractSlideBackground(slide: any): Promise<any> {
    try {
      if (!slide.getBackground) {
        return null;
      }

      const background = slide.getBackground();
      const fillFormat = background.getFillFormat ? background.getFillFormat() : null;
      
      if (!fillFormat) {
        return null;
      }

      // Use existing fill extractor logic
      return {
        type: 'fill',
        fillType: fillFormat.getFillType ? fillFormat.getFillType().toString() : 'unknown',
        // Add more background extraction logic as needed
      };

    } catch (error) {
      logger.warn('Failed to extract slide background', { error: (error as Error).message });
      return null;
    }
  }

  private async extractSlideNotes(slide: any): Promise<string | undefined> {
    try {
      // Use NotesService if available for enhanced notes extraction
      if (this.notesService) {
        const notes = await this.notesService.extractNotes(slide, { 
          includeSpeakerNotes: true,
          includeComments: false 
        });
        return notes?.speakerNotes || notes?.plainText;
      }

      // Fallback to basic notes extraction
      if (!slide.getNotesSlideManager) {
        return undefined;
      }

      const notesSlideManager = slide.getNotesSlideManager();
      const notesSlide = notesSlideManager.getNotesSlide();
      
      if (!notesSlide || !notesSlide.getNotesTextFrame) {
        return undefined;
      }

      const textFrame = notesSlide.getNotesTextFrame();
      const text = textFrame.getText ? textFrame.getText() : '';
      
      return text || undefined;

    } catch (error) {
      logger.warn('Failed to extract slide notes', { error: (error as Error).message });
      return undefined;
    }
  }

  private async extractSlideLayout(slide: any): Promise<any> {
    try {
      if (!slide.getLayoutSlide) {
        return null;
      }

      const layoutSlide = slide.getLayoutSlide();
      return {
        name: layoutSlide.getName ? layoutSlide.getName() : undefined,
        type: layoutSlide.getLayoutType ? layoutSlide.getLayoutType().toString() : undefined
      };

    } catch (error) {
      logger.warn('Failed to extract slide layout', { error: (error as Error).message });
      return null;
    }
  }

  private async extractSlideMaster(slide: any): Promise<any> {
    try {
      if (!slide.getLayoutSlide || !slide.getLayoutSlide().getMasterSlide) {
        return null;
      }

      const masterSlide = slide.getLayoutSlide().getMasterSlide();
      return {
        name: masterSlide.getName ? masterSlide.getName() : undefined
      };

    } catch (error) {
      logger.warn('Failed to extract slide master', { error: (error as Error).message });
      return null;
    }
  }

  private async extractSlideAnimations(slide: any): Promise<any[]> {
    try {
      // Placeholder for animation extraction
      // Aspose.Slides animation extraction would go here
      return [];
    } catch (error) {
      logger.warn('Failed to extract slide animations', { error: (error as Error).message });
      return [];
    }
  }

  private async extractSlideTransitions(slide: any): Promise<any> {
    try {
      if (!slide.getSlideShowTransition) {
        return null;
      }

      const transition = slide.getSlideShowTransition();
      return {
        type: transition.getType ? transition.getType().toString() : undefined,
        duration: transition.getAdvanceTime ? transition.getAdvanceTime() : undefined
      };

    } catch (error) {
      logger.warn('Failed to extract slide transitions', { error: (error as Error).message });
      return null;
    }
  }

  // =============================================================================
  // EXTENSION METHODS
  // =============================================================================

  private async applyShapeExtensions(shape: any, baseShape: any, extensions: string[]): Promise<any> {
    let enhancedShape = { ...baseShape };

    for (const extName of extensions) {
      const extension = this.extensionsRegistry.get(extName);
      if (extension && this.isShapeCompatible(shape, extName)) {
        try {
          const extData = await extension.extract(shape);
          enhancedShape = { ...enhancedShape, ...extData };
        } catch (extError) {
          logger.warn(`Extension ${extName} failed`, { error: (extError as Error).message });
        }
      }
    }

    return enhancedShape;
  }

  private async applyReconstructionExtensions(slide: any, shapes: any[], extensions: string[]): Promise<void> {
    // Placeholder for reconstruction extensions
    // Would apply extensions during slide reconstruction
  }

  private isShapeCompatible(shape: any, extensionName: string): boolean {
    try {
      const shapeType = shape.getShapeType ? shape.getShapeType().toString() : '';
      
      switch (extensionName) {
        case 'chart':
          return shapeType.includes('Chart');
        case 'table':
          return shapeType.includes('Table');
        case 'smartart':
          return shapeType.includes('SmartArt');
        default:
          return false;
      }
    } catch (error) {
      return false;
    }
  }

  // =============================================================================
  // EXTENSION IMPLEMENTATIONS
  // =============================================================================

  private async extractChartData(shape: any): Promise<any> {
    try {
      if (!shape.getChartData) {
        return null;
      }

      const chartData = shape.getChartData();
      return {
        chartType: chartData.getChartType ? chartData.getChartType().toString() : undefined,
        // Add more chart extraction logic
      };
    } catch (error) {
      logger.warn('Chart extraction failed', { error: (error as Error).message });
      return null;
    }
  }

  private async extractTableData(shape: any): Promise<any> {
    try {
      if (!shape.getTable) {
        return null;
      }

      const table = shape.getTable();
      return {
        rows: table.getRows ? table.getRows().size() : 0,
        columns: table.getColumns ? table.getColumns().size() : 0,
        // Add more table extraction logic
      };
    } catch (error) {
      logger.warn('Table extraction failed', { error: (error as Error).message });
      return null;
    }
  }

  private async extractSmartArtData(shape: any): Promise<any> {
    try {
      if (!shape.getSmartArtData) {
        return null;
      }

      const smartArt = shape.getSmartArtData();
      return {
        layout: smartArt.getLayout ? smartArt.getLayout().toString() : undefined,
        // Add more SmartArt extraction logic
      };
    } catch (error) {
      logger.warn('SmartArt extraction failed', { error: (error as Error).message });
      return null;
    }
  }

  // =============================================================================
  // COMMON MAPPER FOR FIDELITY
  // =============================================================================

  private createSlideMapper(): SlideMapper {
    return {
      extract: async (slide: any, options: SlideOptions): Promise<UniversalSlide> => {
        // Delegate to main extract method
        return this.extractSingleSlide(slide, options);
      },

      reconstruct: async (json: UniversalSlide, parentPresentation: any): Promise<any> => {
        try {
          // ✅ Ensure AsposeDriverFactory is initialized
          await this.initializeAsposeDriver();
          
          // Add new slide to presentation
          const slides = parentPresentation.getSlides();
          const newSlide = slides.addSlide(json.slideNumber - 1, parentPresentation.getLayoutSlides().get_Item(0));

          // Set slide properties
          if (json.name) {
            newSlide.setName(json.name);
          }

          if (json.hidden !== undefined) {
            newSlide.setHidden(json.hidden);
          }

          // Reconstruct shapes
          if (json.shapes?.length) {
            await this.reconstructShapes(newSlide, json.shapes);
          }

          // Add notes if present
          if (json.notes) {
            const notesSlide = newSlide.getNotesSlideManager().addNotesSlide();
            notesSlide.getNotesTextFrame().setText(json.notes);
          }

          return newSlide;

        } catch (error) {
          logger.error('Slide reconstruction failed', { error: (error as Error).message });
          throw error;
        }
      }
    };
  }

  private async reconstructShapes(slide: any, shapes: any[]): Promise<void> {
    // Placeholder for shape reconstruction
    // Would rebuild shapes from Universal JSON
    logger.info(`Reconstructing ${shapes.length} shapes on slide`);
  }

  // =============================================================================
  // VALIDATION
  // =============================================================================

  private validateSlideSchema(slide: UniversalSlide): void {
    if (!slide.id) {
      throw new Error('Slide ID is required');
    }

    if (slide.slideNumber < 1) {
      throw new Error('Slide number must be positive');
    }

    if (slide.shapes && !Array.isArray(slide.shapes)) {
      throw new Error('Shapes must be an array');
    }

    if (slide.metadata && !slide.metadata.extractedAt) {
      throw new Error('Extraction timestamp is required in metadata');
    }
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  getCapabilities(): string[] {
    return [
      'extract-single-slide',
      'transform-single-slide', 
      'process-shapes',
      'extract-notes',
      'extract-background',
      'apply-extensions'
    ];
  }

  getRequiredDependencies(): string[] {
    return ['aspose', 'shape-extractor'];
  }

  isAvailable(): boolean {
    return !!(this.aspose && this.shapeExtractor);
  }

  getStats() {
    return {
      extensionsCount: this.extensionsRegistry.size,
      availableExtensions: Array.from(this.extensionsRegistry.keys()),
      dependencies: {
        aspose: !!this.aspose,
        shapeExtractor: !!this.shapeExtractor
      }
    };
  }
} 