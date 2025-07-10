/**
 * SmartArt Extractor - Specialized for SmartArt Graphics
 * 
 * Handles extraction of SmartArt diagrams, nodes, and layout information.
 * Part of the complete shape extraction system.
 */

import { BaseShapeExtractor, ExtractorMetadata, ExtractionResult, ExtractionContext } from '../base/base-shape-extractor';
import { ConversionOptions } from '../../types/interfaces';
import { SmartArtExtractionResult } from '../base/extraction-interfaces';

export class SmartArtExtractor extends BaseShapeExtractor {
  protected metadata: ExtractorMetadata = {
    name: 'SmartArtExtractor',
    version: '1.0.0',
    supportedShapeTypes: ['SmartArt', 'SmartArtShape'],
    extractorType: 'complex'
  };

  async extract(
    shape: any, 
    options: ConversionOptions, 
    context?: ExtractionContext
  ): Promise<ExtractionResult> {
    const startTime = Date.now();

    try {
      if (!this.canHandle(shape)) {
        return this.createErrorResult('Shape is not a valid SmartArt', Date.now() - startTime);
      }

      const baseProperties = this.extractBasicProperties(shape);
      const smartArtData = await this.extractSmartArtData(shape, options);

      const result = {
        ...baseProperties,
        shapeType: 'SmartArt',
        smartArtProperties: smartArtData
      };

      this.logSuccess('smartart extraction', result, Date.now() - startTime);
      return this.createSuccessResult(result, Date.now() - startTime);

    } catch (error) {
      this.handleError(error as Error, 'extract');
      return this.createErrorResult((error as Error).message, Date.now() - startTime);
    }
  }

  canHandle(shape: any): boolean {
    try {
      const AsposeSlides = require('../../../../../lib/aspose.slides.js');
      const ShapeType = AsposeSlides.ShapeType;
      const shapeType = shape.getShapeType();
      return shapeType === ShapeType.SmartArt;
    } catch (error) {
      this.handleError(error as Error, 'canHandle');
      return false;
    }
  }

  private async extractSmartArtData(shape: any, options: ConversionOptions): Promise<SmartArtExtractionResult> {
    try {
      const smartArt = shape.getSmartArt();
      if (!smartArt) {
        throw new Error('SmartArt data not available');
      }

      return {
        layoutType: this.getLayoutType(smartArt),
        colorStyle: this.getColorStyle(smartArt),
        quickStyle: this.getQuickStyle(smartArt),
        nodes: this.extractNodes(smartArt)
      };

    } catch (error) {
      this.handleError(error as Error, 'extractSmartArtData');
      return {
        layoutType: 'Unknown',
        nodes: []
      };
    }
  }

  private getLayoutType(smartArt: any): string {
    try {
      return smartArt.getLayout ? smartArt.getLayout().toString() : 'Unknown';
    } catch (error) {
      return 'Unknown';
    }
  }

  private getColorStyle(smartArt: any): string | undefined {
    try {
      return smartArt.getColorStyle ? smartArt.getColorStyle().toString() : undefined;
    } catch (error) {
      return undefined;
    }
  }

  private getQuickStyle(smartArt: any): string | undefined {
    try {
      return smartArt.getQuickStyle ? smartArt.getQuickStyle().toString() : undefined;
    } catch (error) {
      return undefined;
    }
  }

  private extractNodes(smartArt: any): any[] {
    try {
      const nodes: any[] = [];
      const nodeCollection = smartArt.getAllNodes();
      
      if (nodeCollection) {
        for (let i = 0; i < nodeCollection.size(); i++) {
          const node = nodeCollection.get_Item(i);
          nodes.push({
            text: node.getTextFrame ? node.getTextFrame().getText() : '',
            level: node.getLevel ? node.getLevel() : 0,
            position: node.getPosition ? node.getPosition() : i
          });
        }
      }

      return nodes;
    } catch (error) {
      this.handleError(error as Error, 'extractNodes');
      return [];
    }
  }
} 