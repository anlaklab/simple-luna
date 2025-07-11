/**
 * OLE Object Extractor - Specialized for OLE Objects
 * 
 * Handles extraction of embedded OLE objects like Excel sheets, Word docs, etc.
 * Part of the complete shape extraction system.
 */

import { BaseShapeExtractor, ExtractorMetadata, ExtractionResult, ExtractionContext } from '../base/base-shape-extractor';
import { ConversionOptions } from '../../types/interfaces';
import { OleObjectExtractionResult } from '../base/extraction-interfaces';

export class OleObjectExtractor extends BaseShapeExtractor {
  protected metadata: ExtractorMetadata = {
    name: 'OleObjectExtractor',
    version: '1.0.0',
    supportedShapeTypes: ['OleObject', 'OleObjectFrame'],
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
        return this.createErrorResult('Shape is not a valid OLE object', Date.now() - startTime);
      }

      const baseProperties = this.extractBasicProperties(shape);
      const oleData = await this.extractOleObjectData(shape, options);

      const result = {
        ...baseProperties,
        shapeType: 'OleObject',
        oleObjectProperties: oleData
      };

      this.logSuccess('ole object extraction', result, Date.now() - startTime);
      return this.createSuccessResult(result, Date.now() - startTime);

    } catch (error) {
      this.handleError(error as Error, 'extract');
      return this.createErrorResult((error as Error).message, Date.now() - startTime);
    }
  }

  canHandle(shape: any): boolean {
    try {
      const AsposeSlides = require('/app/lib/aspose.slides.js');
      const ShapeType = AsposeSlides.ShapeType;
      const shapeType = shape.getShapeType();
      return shapeType === ShapeType.OleObjectFrame;
    } catch (error) {
      this.handleError(error as Error, 'canHandle');
      return false;
    }
  }

  private async extractOleObjectData(shape: any, options: ConversionOptions): Promise<OleObjectExtractionResult> {
    try {
      const oleObjectData = shape.getOleObjectData();
      if (!oleObjectData) {
        throw new Error('OLE object data not available');
      }

      const result: OleObjectExtractionResult = {
        objectProgId: this.getProgId(oleObjectData),
        linkPath: this.getLinkPath(oleObjectData),
        embedded: this.isEmbedded(oleObjectData),
        hasData: this.hasObjectData(oleObjectData),
        fileName: this.getFileName(oleObjectData)
      };

      // Extract object data size if available
      if (result.embedded && result.hasData) {
        result.dataSize = this.getObjectDataSize(oleObjectData);
      }

      return result;

    } catch (error) {
      this.handleError(error as Error, 'extractOleObjectData');
      return {
        embedded: false,
        hasData: false
      };
    }
  }

  private getProgId(oleObjectData: any): string | undefined {
    try {
      return oleObjectData.getObjectProgId ? oleObjectData.getObjectProgId() : undefined;
    } catch (error) {
      return undefined;
    }
  }

  private getLinkPath(oleObjectData: any): string | undefined {
    try {
      return oleObjectData.getLinkPath ? oleObjectData.getLinkPath() : undefined;
    } catch (error) {
      return undefined;
    }
  }

  private isEmbedded(oleObjectData: any): boolean {
    try {
      return oleObjectData.getEmbeddedFileData() !== null;
    } catch (error) {
      return false;
    }
  }

  private hasObjectData(oleObjectData: any): boolean {
    try {
      const embeddedData = oleObjectData.getEmbeddedFileData();
      return embeddedData && embeddedData.length > 0;
    } catch (error) {
      return false;
    }
  }

  private getFileName(oleObjectData: any): string | undefined {
    try {
      return oleObjectData.getEmbeddedFileName ? oleObjectData.getEmbeddedFileName() : undefined;
    } catch (error) {
      return undefined;
    }
  }

  private getObjectDataSize(oleObjectData: any): number {
    try {
      const embeddedData = oleObjectData.getEmbeddedFileData();
      return embeddedData ? embeddedData.length : 0;
    } catch (error) {
      return 0;
    }
  }
} 