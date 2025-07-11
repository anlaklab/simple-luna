/**
 * Shape Extractor Coordinator - Modular Shape Processing Hub
 * 
 * Replaces the monolithic shape-extractor.ts with a clean coordinator
 * that delegates to specialized extractors based on shape type.
 * 
 * This is the main interface that maintains backward compatibility
 * while providing the new componentized architecture.
 */

import { BaseShapeExtractor, ExtractorMetadata, ExtractionResult, ExtractionContext } from '../base/base-shape-extractor';
import { ConversionOptions } from '../../types/interfaces';
import { logger } from '../../../../utils/logger';

// Update imports to use current extractors
import { ChartExtractor } from './chart-extractor';
import { TableExtractor } from './table-extractor';
import { MediaExtractor } from './media-extractor';

// =============================================================================
// SHAPE TYPE MAPPING UTILITY
// =============================================================================

class ShapeTypeMapper {
  private static typeMap: Record<string, string> = {
    'Rectangle': 'Rectangle',
    'RoundCornerRectangle': 'RoundedRectangle', 
    'Ellipse': 'Ellipse',
    'Triangle': 'Triangle',
    'Line': 'Line',
    'TextBox': 'TextBox',
    'Picture': 'Picture',
    'Chart': 'Chart',
    'Table': 'Table',
    'SmartArt': 'SmartArt',
    'OleObject': 'OleObject',
    'VideoFrame': 'VideoFrame',
    'AudioFrame': 'AudioFrame',
    'GroupShape': 'GroupShape',
    'Connector': 'Connector'
  };

  static mapShapeType(asposeShapeType: any): string {
    try {
      const typeString = asposeShapeType?.toString();
      return this.typeMap[typeString] || typeString || 'Unknown';
    } catch (error) {
      logger.warn('Shape type mapping failed', { asposeShapeType, error });
      return 'Unknown';
    }
  }

  static getAllSupportedTypes(): string[] {
    return Object.values(this.typeMap);
  }
}

// =============================================================================
// MAIN SHAPE EXTRACTOR COORDINATOR
// =============================================================================

export class ShapeExtractor extends BaseShapeExtractor {
  protected metadata: ExtractorMetadata = {
    name: 'ShapeExtractorCoordinator',
    version: '2.0.0',
    supportedShapeTypes: ShapeTypeMapper.getAllSupportedTypes(),
    extractorType: 'shape'
  };

  // Registry of specialized extractors
  private extractors: Map<string, BaseShapeExtractor>;
  private initialized: boolean = false;

  constructor() {
    super();
    this.extractors = new Map();
    this.initializeExtractors();
  }

  // =============================================================================
  // INITIALIZATION
  // =============================================================================

  private initializeExtractors(): void {
    try {
      // Register specialized extractors
      this.extractors.set('Chart', new ChartExtractor());
      this.extractors.set('Table', new TableExtractor());
      
      // Media extractor handles multiple types
      const mediaExtractor = new MediaExtractor();
      this.extractors.set('Picture', mediaExtractor);
      this.extractors.set('VideoFrame', mediaExtractor);
      this.extractors.set('AudioFrame', mediaExtractor);

      // TODO: Add remaining extractors as they're implemented
      // this.extractors.set('SmartArt', new SmartArtExtractor());
      // this.extractors.set('OleObject', new OleExtractor());
      // this.extractors.set('Connector', new ConnectorExtractor());
      // this.extractors.set('GroupShape', new GroupExtractor());

      this.initialized = true;

      logger.info('Shape extractor coordinator initialized', {
        specializedExtractors: Array.from(this.extractors.keys()),
        totalExtractors: this.extractors.size
      });

    } catch (error) {
      this.handleError(error as Error, 'initializeExtractors');
      this.initialized = false;
    }
  }

  // =============================================================================
  // MAIN PUBLIC API (Backward Compatible)
  // =============================================================================

  /**
   * Main shape processing method - maintains backward compatibility
   * with original ShapeExtractor.processShape() API
   */
  async processShape(shape: any, options: ConversionOptions): Promise<any | null> {
    const startTime = Date.now();

    try {
      if (!this.initialized) {
        this.initializeExtractors();
      }

      if (!shape) {
        logger.warn('Null shape provided to processShape');
        return null;
      }

      // Get shape type
      const shapeType = this.getShapeType(shape);
      
      // Extract using specialized extractor if available
      const extractor = this.getExtractorForType(shapeType);
      
      if (extractor) {
        logger.debug(`Using specialized extractor for ${shapeType}`, {
          extractorName: extractor.getName()
        });

        const result = await extractor.extract(shape, options, {
          extractionPath: 'specialized'
        });

        if (result.success) {
          return result.data;
        } else {
          logger.warn(`Specialized extraction failed for ${shapeType}, falling back to basic`, {
            error: result.error
          });
          return await this.extractBasicShape(shape, options);
        }
      } else {
        logger.debug(`No specialized extractor for ${shapeType}, using basic extraction`);
        return await this.extractBasicShape(shape, options);
      }

    } catch (error) {
      this.handleError(error as Error, 'processShape');
      return null;
    }
  }

  /**
   * New extraction method using the BaseShapeExtractor interface
   */
  async extract(
    shape: any, 
    options: ConversionOptions, 
    context?: ExtractionContext
  ): Promise<ExtractionResult> {
    const startTime = Date.now();

    try {
      const result = await this.processShape(shape, options);
      
      if (result) {
        return this.createSuccessResult(result, Date.now() - startTime);
      } else {
        return this.createErrorResult('Shape extraction failed', Date.now() - startTime);
      }

    } catch (error) {
      this.handleError(error as Error, 'extract');
      return this.createErrorResult((error as Error).message, Date.now() - startTime);
    }
  }

  canHandle(shape: any): boolean {
    try {
      return shape && shape.getShapeType;
    } catch (error) {
      return false;
    }
  }

  // =============================================================================
  // SHAPE TYPE & EXTRACTOR SELECTION
  // =============================================================================

  private getShapeType(shape: any): string {
    try {
      const asposeShapeType = shape.getShapeType();
      return ShapeTypeMapper.mapShapeType(asposeShapeType);
    } catch (error) {
      this.handleError(error as Error, 'getShapeType');
      return 'Unknown';
    }
  }

  private getExtractorForType(shapeType: string): BaseShapeExtractor | null {
    return this.extractors.get(shapeType) || null;
  }

  // =============================================================================
  // BASIC SHAPE EXTRACTION (Fallback)
  // =============================================================================

  private async extractBasicShape(shape: any, options: ConversionOptions): Promise<any> {
    try {
      const shapeType = this.getShapeType(shape);
      
      // Extract common properties
      const baseShape = {
        shapeType,
        ...this.extractBasicProperties(shape)
      };

      // Extract text frame if available
      if (shape.getTextFrame && shape.getTextFrame()) {
        const textFrame = this.textExtractor.extractTextFrame(shape.getTextFrame());
        if (textFrame) {
          baseShape.textFrame = textFrame;
        }
      }

      // For unknown shape types, try to extract any available properties
      if (shapeType === 'Unknown' || shapeType === 'Rectangle' || shapeType === 'Ellipse') {
        // These are basic shapes that don't need specialized extractors
        return baseShape;
      }

      // For other types without specialized extractors, log a warning
      logger.warn(`No specialized extractor available for shape type: ${shapeType}`, {
        shapeType,
        fallbackUsed: true
      });

      return baseShape;

    } catch (error) {
      this.handleError(error as Error, 'extractBasicShape');
      return {
        shapeType: 'Unknown',
        name: '',
        hidden: false,
        error: 'Basic extraction failed'
      };
    }
  }

  // =============================================================================
  // EXTRACTOR MANAGEMENT
  // =============================================================================

  /**
   * Register a new specialized extractor
   */
  public registerExtractor(shapeType: string, extractor: BaseShapeExtractor): void {
    try {
      this.extractors.set(shapeType, extractor);
      logger.info(`Registered new extractor for ${shapeType}`, {
        extractorName: extractor.getName()
      });
    } catch (error) {
      this.handleError(error as Error, 'registerExtractor');
    }
  }

  /**
   * Unregister an extractor
   */
  public unregisterExtractor(shapeType: string): void {
    try {
      if (this.extractors.delete(shapeType)) {
        logger.info(`Unregistered extractor for ${shapeType}`);
      }
    } catch (error) {
      this.handleError(error as Error, 'unregisterExtractor');
    }
  }

  /**
   * Get list of supported shape types
   */
  public getSupportedShapeTypes(): string[] {
    return Array.from(this.extractors.keys());
  }

  /**
   * Get extractor information
   */
  public getExtractorInfo(): any {
    const info: any = {
      coordinatorVersion: this.metadata.version,
      totalExtractors: this.extractors.size,
      supportedTypes: this.getSupportedShapeTypes(),
      extractors: {}
    };

    this.extractors.forEach((extractor, shapeType) => {
      info.extractors[shapeType] = {
        name: extractor.getName(),
        metadata: extractor.getMetadata()
      };
    });

    return info;
  }

  // =============================================================================
  // PERFORMANCE & MONITORING
  // =============================================================================

  /**
   * Get performance statistics
   */
  public getPerformanceStats(): any {
    return {
      extractorsLoaded: this.extractors.size,
      memoryUsage: process.memoryUsage(),
      initialized: this.initialized,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Health check for all registered extractors
   */
  public async healthCheck(): Promise<any> {
    const results: any = {
      coordinator: 'healthy',
      extractors: {},
      timestamp: new Date().toISOString()
    };

    for (const [shapeType, extractor] of this.extractors.entries()) {
      try {
        // Basic health check - verify extractor can be called
        const metadata = extractor.getMetadata();
        results.extractors[shapeType] = {
          status: 'healthy',
          name: metadata.name,
          version: metadata.version
        };
      } catch (error) {
        results.extractors[shapeType] = {
          status: 'unhealthy',
          error: (error as Error).message
        };
      }
    }

    return results;
  }

  // =============================================================================
  // LIFECYCLE METHODS
  // =============================================================================

  public async initialize(): Promise<void> {
    logger.info('Initializing Shape Extractor Coordinator');
    
    if (!this.initialized) {
      this.initializeExtractors();
    }

    // Initialize all registered extractors
    for (const [shapeType, extractor] of this.extractors.entries()) {
      try {
        if (extractor.initialize) {
          await extractor.initialize();
        }
      } catch (error) {
        logger.warn(`Failed to initialize extractor for ${shapeType}`, { error });
      }
    }

    logger.info('Shape Extractor Coordinator initialization complete');
  }

  public async dispose(): Promise<void> {
    logger.info('Disposing Shape Extractor Coordinator');

    // Dispose all registered extractors
    for (const [shapeType, extractor] of this.extractors.entries()) {
      try {
        if (extractor.dispose) {
          await extractor.dispose();
        }
      } catch (error) {
        logger.warn(`Failed to dispose extractor for ${shapeType}`, { error });
      }
    }

    this.extractors.clear();
    this.initialized = false;

    logger.info('Shape Extractor Coordinator disposal complete');
  }
} 