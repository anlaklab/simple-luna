/**
 * Extractor Registry - Manages shape extractor registration and lookup
 * 
 * Centralizes extractor management with fallback capabilities.
 * Part of the componentized coordinator system.
 */

import { logger } from '../../../../utils/logger';
import { BaseShapeExtractor, ExtractionResult, ExtractionContext } from '../base/base-shape-extractor';
import { ConversionOptions } from '../../types/interfaces';

// Import all specialized extractors
import { ChartExtractor } from '../shapes/chart-extractor';
import { TableExtractor } from '../shapes/table-extractor';
import { MediaExtractor } from '../shapes/media-extractor';
import { SmartArtExtractor } from '../shapes/smartart-extractor';
import { OleObjectExtractor } from '../shapes/ole-object-extractor';
import { ExtractorMetadata } from '../base/base-shape-extractor';

// Concrete implementation for fallback
class DefaultShapeExtractor extends BaseShapeExtractor {
  protected metadata: ExtractorMetadata = {
    name: 'DefaultShapeExtractor',
    version: '1.0.0',
    supportedShapeTypes: ['*'],
    extractorType: 'shape'
  };

  async extract(shape: any, options: ConversionOptions, context?: ExtractionContext): Promise<ExtractionResult> {
    const startTime = Date.now();
    try {
      const baseProperties = this.extractBasicProperties(shape);
      return this.createSuccessResult(baseProperties, Date.now() - startTime);
    } catch (error) {
      return this.createErrorResult((error as Error).message, Date.now() - startTime);
    }
  }

  canHandle(shape: any): boolean {
    return true; // Fallback handles any shape
  }
}

export class ExtractorRegistry {
  private extractors: Map<string, BaseShapeExtractor> = new Map();
  private fallbackExtractor: BaseShapeExtractor;

  constructor() {
    this.initializeExtractors();
    this.fallbackExtractor = new DefaultShapeExtractor();
  }

  /**
   * Initialize and register all extractors
   */
  private initializeExtractors(): void {
    try {
      // Register specialized extractors
      this.registerExtractor('Chart', new ChartExtractor());
      this.registerExtractor('Table', new TableExtractor());
      this.registerExtractor('Picture', new MediaExtractor());
      this.registerExtractor('VideoFrame', new MediaExtractor());
      this.registerExtractor('AudioFrame', new MediaExtractor());
      this.registerExtractor('SmartArt', new SmartArtExtractor());
      this.registerExtractor('OleObject', new OleObjectExtractor());
      
      logger.info('ExtractorRegistry initialized', {
        registeredExtractors: Array.from(this.extractors.keys())
      });

    } catch (error) {
      logger.error('Failed to initialize extractors', { error: (error as Error).message });
    }
  }

  /**
   * Register an extractor for a shape type
   */
  private registerExtractor(shapeType: string, extractor: BaseShapeExtractor): void {
    try {
      this.extractors.set(shapeType, extractor);
      logger.debug(`Registered extractor for ${shapeType}`);
    } catch (error) {
      logger.error(`Failed to register extractor for ${shapeType}`, { error: (error as Error).message });
    }
  }

  /**
   * Get extractor for shape type
   */
  getExtractor(shapeType: string): BaseShapeExtractor {
    const extractor = this.extractors.get(shapeType);
    if (extractor) {
      return extractor;
    }

    logger.warn(`No specialized extractor found for ${shapeType}, using fallback`);
    return this.fallbackExtractor;
  }

  /**
   * Check if extractor exists for shape type
   */
  hasExtractor(shapeType: string): boolean {
    return this.extractors.has(shapeType);
  }

  /**
   * Get all registered shape types
   */
  getSupportedShapeTypes(): string[] {
    return Array.from(this.extractors.keys());
  }

  /**
   * Get registry metadata
   */
  getMetadata(): any {
    const metadata: any = {
      totalExtractors: this.extractors.size,
      supportedTypes: this.getSupportedShapeTypes(),
      extractorDetails: {}
    };

    this.extractors.forEach((extractor, shapeType) => {
      metadata.extractorDetails[shapeType] = {
        name: extractor.constructor.name,
        canHandle: true
      };
    });

    return metadata;
  }

  /**
   * Dispose all extractors
   */
  dispose(): void {
    try {
      this.extractors.forEach((extractor, shapeType) => {
        try {
          if (extractor.dispose) {
            extractor.dispose();
          }
        } catch (error) {
          logger.error(`Error disposing extractor for ${shapeType}`, { error: (error as Error).message });
        }
      });

      this.extractors.clear();
      logger.info('ExtractorRegistry disposed');

    } catch (error) {
      logger.error('Error disposing ExtractorRegistry', { error: (error as Error).message });
    }
  }
} 