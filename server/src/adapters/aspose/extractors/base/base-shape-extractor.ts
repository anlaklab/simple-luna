import { z } from "zod";
/**
 * Base Shape Extractor - Abstract Foundation for All Shape Extractors
 * 
 * Provides common functionality and enforces interface consistency
 * across all specialized shape extractors in Phase 6 componentization.
 */

import { logger } from '../../../../utils/logger';
import { ConversionOptions } from '../../types/interfaces';
import { FillExtractor } from '../../fill-extractor';
import { EffectExtractor } from '../../effect-extractor';
import { TextExtractor } from '../../text-extractor';
import { GeometryExtractor } from '../../geometry-extractor';

// =============================================================================
// BASE INTERFACES
// =============================================================================

export interface ExtractorMetadata {
  name: string;
  version: string;
  supportedShapeTypes: string[];
  extractorType: 'shape' | 'slide' | 'media' | 'complex';
}

export interface ExtractionContext {
  slideIndex?: number;
  shapeIndex?: number;
  parentShape?: any;
  extractionPath?: string;
  shapeType?: string;
  processingTime?: number;
}

export interface ExtractionResult {
  success: boolean;
  data?: any;
  error?: string;
  processingTime?: number;
  metadata: {
    extractorUsed: string;
    processingTime: number;
    extractedAt: string;
  };
}

// =============================================================================
// BASE ABSTRACT EXTRACTOR
// =============================================================================

export abstract class BaseShapeExtractor {
  // Shared extractor dependencies
  protected fillExtractor: FillExtractor;
  protected effectExtractor: EffectExtractor;
  protected textExtractor: TextExtractor;
  protected geometryExtractor: GeometryExtractor;
  
  // Extractor metadata
  protected abstract metadata: ExtractorMetadata;

  constructor() {
    this.fillExtractor = new FillExtractor();
    this.effectExtractor = new EffectExtractor();
    this.textExtractor = new TextExtractor();
    this.geometryExtractor = new GeometryExtractor();
  }

  // =============================================================================
  // ABSTRACT METHODS (Must be implemented by subclasses)
  // =============================================================================

  /**
   * Main extraction method - must be implemented by each extractor
   */
  abstract extract(
    shape: any, 
    options: ConversionOptions, 
    context?: ExtractionContext
  ): Promise<ExtractionResult>;

  /**
   * Validate if this extractor can handle the given shape
   */
  abstract canHandle(shape: any): boolean;

  // =============================================================================
  // SHARED UTILITY METHODS
  // =============================================================================

  /**
   * Extract line format properties (shared across all shapes)
   */
  protected extractLineFormat(lineFormat: any): any | null {
    try {
      if (!lineFormat) return null;

      return {
        style: lineFormat.getStyle ? lineFormat.getStyle() : 'Single',
        width: lineFormat.getWidth ? lineFormat.getWidth() : 1,
        fillFormat: lineFormat.getFillFormat ? 
          this.fillExtractor.extractFillFormat(lineFormat.getFillFormat()) : null,
        dashStyle: lineFormat.getDashStyle ? lineFormat.getDashStyle() : 'Solid',
        joinStyle: lineFormat.getJoinStyle ? lineFormat.getJoinStyle() : 'Round',
        capStyle: lineFormat.getCapStyle ? lineFormat.getCapStyle() : 'Round',
      };
    } catch (error) {
      this.handleError(error as Error, 'extractLineFormat');
      return null;
    }
  }

  /**
   * Extract hyperlink properties (shared across all shapes)
   */
  protected extractHyperlink(hyperlink: any): any | null {
    try {
      if (!hyperlink) return null;

      return {
        targetUrl: hyperlink.getExternalUrl ? hyperlink.getExternalUrl() : '',
        tooltip: hyperlink.getTooltip ? hyperlink.getTooltip() : '',
        actionType: hyperlink.getActionType ? hyperlink.getActionType() : 'Hyperlink',
      };
    } catch (error) {
      this.handleError(error as Error, 'extractHyperlink');
      return null;
    }
  }

  /**
   * Extract basic shape properties (common to all shapes)
   */
  protected extractBasicProperties(shape: any): any {
    try {
      return {
        name: shape.getName ? shape.getName() : '',
        alternativeText: shape.getAlternativeText ? shape.getAlternativeText() : '',
        hidden: shape.getHidden ? shape.getHidden() : false,
        locked: shape.isLocked ? shape.isLocked() : false,
        zOrder: shape.getZOrderPosition ? shape.getZOrderPosition() : 0,
        
        // Geometry
        geometry: this.geometryExtractor.extractGeometry(shape),
        
        // Fill format
        fillFormat: shape.getFillFormat ? 
          this.fillExtractor.extractFillFormat(shape.getFillFormat()) : null,
        
        // Line format
        lineFormat: shape.getLineFormat ? 
          this.extractLineFormat(shape.getLineFormat()) : null,
        
        // Effect format
        effectFormat: shape.getEffectFormat ? 
          this.effectExtractor.extractEffectFormat(shape.getEffectFormat()) : null,
        
        // 3D format
        threeDFormat: shape.getThreeDFormat ? 
          this.effectExtractor.extractThreeDFormat(shape.getThreeDFormat()) : null,
        
        // Hyperlinks
        hyperlinkClick: shape.getHyperlinkClick ? 
          this.extractHyperlink(shape.getHyperlinkClick()) : null,
        hyperlinkMouseOver: shape.getHyperlinkMouseOver ? 
          this.extractHyperlink(shape.getHyperlinkMouseOver()) : null,
      };
    } catch (error) {
      this.handleError(error as Error, 'extractBasicProperties');
      return {};
    }
  }

  // =============================================================================
  // ERROR HANDLING & LOGGING
  // =============================================================================

  /**
   * Standardized error handling across all extractors
   */
  protected handleError(error: Error, context: string): void {
    logger.error(`${this.metadata.name} - ${context}`, {
      error: error.message,
      stack: error.stack,
      extractor: this.metadata.name,
      context
    });
  }

  /**
   * Log extraction success with metrics
   */
  protected logSuccess(context: string, data: any, processingTime: number): void {
    logger.info(`${this.metadata.name} - ${context} successful`, {
      extractor: this.metadata.name,
      context,
      processingTime: `${processingTime}ms`,
      dataSize: JSON.stringify(data).length
    });
  }

  /**
   * Create standardized success result
   */
  protected createSuccessResult(data: any, processingTime: number): ExtractionResult {
    return {
      success: true,
      data,
      metadata: {
        extractorUsed: this.metadata.name,
        processingTime,
        extractedAt: new Date().toISOString()
      }
    };
  }

  /**
   * Create standardized error result
   */
  protected createErrorResult(error: string, processingTime: number): ExtractionResult {
    return {
      success: false,
      error,
      metadata: {
        extractorUsed: this.metadata.name,
        processingTime,
        extractedAt: new Date().toISOString()
      }
    };
  }

  // =============================================================================
  // METADATA & INFO
  // =============================================================================

  /**
   * Get extractor metadata
   */
  public getMetadata(): ExtractorMetadata {
    return { ...this.metadata };
  }

  /**
   * Check if extractor supports given shape type
   */
  public supportsShapeType(shapeType: string): boolean {
    return this.metadata.supportedShapeTypes.includes(shapeType);
  }

  /**
   * Get extractor name
   */
  public getName(): string {
    return this.metadata.name;
  }

  /**
   * Initialize extractor (optional override)
   */
  public async initialize(): Promise<void> {
    logger.info(`Initializing ${this.metadata.name}`, {
      supportedTypes: this.metadata.supportedShapeTypes
    });
  }

  /**
   * Dispose extractor resources (optional override)
   */
  public async dispose(): Promise<void> {
    logger.info(`Disposing ${this.metadata.name}`);
  }
} 