import { z } from "zod";
/**
 * Shape Extractor Coordinator - Delegates to registry and detector
 */
import { logger } from '../../../../utils/logger';
import { ConversionOptions } from '../../types/interfaces';
import { ExtractionResult } from '../base/base-shape-extractor';
import { ExtractorRegistry } from '../coordinator/extractor-registry';
import { ShapeTypeDetector } from '../coordinator/shape-type-detector';

export class ShapeExtractorCoordinator {
  private registry = new ExtractorRegistry();
  private detector = new ShapeTypeDetector();

  async processShape(shape: any, options: ConversionOptions): Promise<ExtractionResult> {
    const startTime = Date.now();
    try {
      const shapeType = await this.detector.detectShapeType(shape);
      const extractor = this.registry.getExtractor(shapeType);
      
      const result = await extractor.extract(shape, options, {
        processingTime: Date.now() - startTime
      });

      this.logProcessingResult(shapeType, result, Date.now() - startTime);
      return result;

    } catch (error) {
      logger.error('Shape processing failed in coordinator', { error: (error as Error).message });
      return {
        success: false, 
        error: (error as Error).message,
        processingTime: Date.now() - startTime, 
        data: null,
        metadata: {
          extractorUsed: 'ShapeExtractorCoordinator',
          processingTime: Date.now() - startTime,
          extractedAt: new Date().toISOString()
        }
      };
    }
  }

  async canProcessShape(shape: any): Promise<boolean> {
    try {
      const shapeType = await this.detector.detectShapeType(shape);
      return this.registry.hasExtractor(shapeType) || this.detector.isSupportedType(shapeType);
    } catch (error) {
      return false;
    }
  }

  getSupportedShapeTypes(): string[] {
    return this.detector.getSupportedShapeTypes();
  }

  getMetadata(): any {
    return {
      coordinator: 'ShapeExtractorCoordinator', version: '2.0.0',
      registry: this.registry.getMetadata(),
      supportedTypes: this.detector.getSupportedShapeTypes()
    };
  }

  private logProcessingResult(shapeType: string, result: ExtractionResult, processingTime: number): void {
    if (result.success) {
      logger.debug(`Shape processed successfully`, { shapeType, processingTime: `${processingTime}ms` });
    } else {
      logger.warn(`Shape processing failed`, { shapeType, error: result.error, processingTime: `${processingTime}ms` });
    }
  }

  dispose(): void {
    try {
      this.registry.dispose();
      logger.info('ShapeExtractorCoordinator disposed');
    } catch (error) {
      logger.error('Error disposing coordinator', { error: (error as Error).message });
    }
  }
} 