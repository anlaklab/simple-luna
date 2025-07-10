/**
 * Shape Extractor - Refactored using Componentized Architecture
 * 
 * Lightweight coordinator that delegates to specialized extractors.
 * Maintains backward compatibility while using modular components.
 */

import { logger } from '../../utils/logger';
import { ConversionOptions } from './types/interfaces';
import { ShapeExtractorCoordinator } from './extractors/shapes/shape-extractor-coordinator';

// Re-export types for backward compatibility
export {
  ShapeExtractionResult,
  BasicShapeProperties,
  ChartSeries,
  ChartDataPoint,
  ChartCategory,
  ChartAxis,
  TableRow,
  TableCell,
  TableColumn,
  MediaExtractionResult,
  PictureExtractionResult,
  VideoExtractionResult,
  AudioExtractionResult
} from './extractors/base/extraction-interfaces';

export class ShapeExtractor {
  private coordinator: ShapeExtractorCoordinator;

  constructor() {
    this.coordinator = new ShapeExtractorCoordinator();
  }

  /**
   * Process individual shape using componentized architecture
   */
  async processShape(shape: any, options: ConversionOptions): Promise<any | null> {
    try {
      // Delegate to coordinator for processing
      const result = await this.coordinator.processShape(shape, options);
      
      if (!result.success) {
        logger.error('Shape processing failed', { 
          error: result.error,
          shapeId: shape.getName ? shape.getName() : 'unknown'
        });
        return null;
      }

      return result.data;

    } catch (error) {
      logger.error('Error in shape processing', { 
        error: (error as Error).message,
        shapeId: shape.getName ? shape.getName() : 'unknown'
      });
      return null;
    }
  }

  /**
   * Get supported shape types from coordinator
   */
  getSupportedShapeTypes(): string[] {
    return this.coordinator.getSupportedShapeTypes();
  }

  /**
   * Check if shape type is supported
   */
  canProcessShape(shape: any): boolean {
    try {
      return this.coordinator.canProcessShape(shape);
    } catch (error) {
      logger.error('Error checking shape support', { error: (error as Error).message });
      return false;
    }
  }

  /**
   * Get extractor metadata for debugging
   */
  getExtractorMetadata(): any {
    return this.coordinator.getMetadata();
  }

  /**
   * Batch process multiple shapes
   */
  async processShapes(shapes: any[], options: ConversionOptions): Promise<any[]> {
    const results: any[] = [];
    
    for (let i = 0; i < shapes.length; i++) {
      try {
        const shapeResult = await this.processShape(shapes[i], options);
        if (shapeResult) {
          results.push(shapeResult);
        }
      } catch (error) {
        logger.error(`Error processing shape ${i}`, { error: (error as Error).message });
        // Continue processing other shapes
      }
    }

    return results;
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    try {
      this.coordinator.dispose();
    } catch (error) {
      logger.error('Error disposing shape extractor', { error: (error as Error).message });
    }
  }
} 