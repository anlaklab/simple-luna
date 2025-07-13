import { z } from "zod";
/**
 * Picture Extractor - Specialized Component for Picture/Image Processing
 * 
 * Handles extraction of picture frames, image data, and crop settings.
 * Part of the componentized media extraction system.
 */

import { logger } from '../../../../../utils/logger';
import { PictureExtractionResult } from '../../base/extraction-interfaces';
import { ConversionOptions } from '../../../types/interfaces';

export class PictureExtractor {
  
  /**
   * Extract picture data from shape
   */
  async extractPictureData(shape: any, options: ConversionOptions): Promise<PictureExtractionResult> {
    try {
      const pictureFormat = shape.getPictureFormat();
      if (!pictureFormat) {
        throw new Error('Picture format not available');
      }

      const picture = pictureFormat.getPicture();
      if (!picture) {
        throw new Error('Picture data not available');
      }

      const result: PictureExtractionResult = {
        mediaType: 'picture',
        fileName: this.getPictureFileName(picture),
        originalSize: this.getPictureOriginalSize(picture),
        embedded: this.isPictureEmbedded(picture),
        hasData: true,
        preserveAspectRatio: this.getPreserveAspectRatio(pictureFormat),
        mimeType: this.getPictureMimeType(picture)
      };

      // Extract image data if requested
      if (options.extractImages && options.includeAssets) {
        result.imageData = await this.extractImageData(picture);
        result.dataSize = result.imageData ? result.imageData.length : 0;
      }

      // Extract crop settings
      result.cropSettings = this.extractCropSettings(pictureFormat);

      return result;

    } catch (error) {
      this.handleError(error as Error, 'extractPictureData');
      return {
        mediaType: 'picture',
        embedded: false,
        hasData: false,
        preserveAspectRatio: true
      };
    }
  }

  /**
   * Get picture file name
   */
  private getPictureFileName(picture: any): string {
    try {
      return picture.getName ? picture.getName() : 'image';
    } catch (error) {
      return 'image';
    }
  }

  /**
   * Get picture original size
   */
  private getPictureOriginalSize(picture: any): { width: number; height: number } {
    try {
      return {
        width: picture.getWidth ? picture.getWidth() : 0,
        height: picture.getHeight ? picture.getHeight() : 0
      };
    } catch (error) {
      return { width: 0, height: 0 };
    }
  }

  /**
   * Check if picture is embedded
   */
  private isPictureEmbedded(picture: any): boolean {
    try {
      return picture.getBinaryData ? true : false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get preserve aspect ratio setting
   */
  private getPreserveAspectRatio(pictureFormat: any): boolean {
    try {
      const fillMode = pictureFormat.getPictureFillMode();
      return fillMode === 0; // 0 = Stretch (preserve aspect ratio)
    } catch (error) {
      return true;
    }
  }

  /**
   * Get picture MIME type
   */
  private getPictureMimeType(picture: any): string {
    try {
      const contentType = picture.getContentType();
      return contentType || 'image/jpeg';
    } catch (error) {
      return 'image/jpeg';
    }
  }

  /**
   * Extract image binary data as base64
   */
  private async extractImageData(picture: any): Promise<string | undefined> {
    try {
      const binaryData = picture.getBinaryData();
      if (binaryData) {
        return Buffer.from(binaryData).toString('base64');
      }
      return undefined;
    } catch (error) {
      this.handleError(error as Error, 'extractImageData');
      return undefined;
    }
  }

  /**
   * Extract crop settings
   */
  private extractCropSettings(pictureFormat: any): PictureExtractionResult['cropSettings'] {
    try {
      const cropLeft = pictureFormat.getCropLeft ? pictureFormat.getCropLeft() : 0;
      const cropRight = pictureFormat.getCropRight ? pictureFormat.getCropRight() : 0;
      const cropTop = pictureFormat.getCropTop ? pictureFormat.getCropTop() : 0;
      const cropBottom = pictureFormat.getCropBottom ? pictureFormat.getCropBottom() : 0;

      if (cropLeft || cropRight || cropTop || cropBottom) {
        return { left: cropLeft, right: cropRight, top: cropTop, bottom: cropBottom };
      }
      return undefined;
    } catch (error) {
      return undefined;
    }
  }

  /**
   * Error handling
   */
  private handleError(error: Error, context: string): void {
    logger.error(`PictureExtractor - ${context}`, {
      error: error.message,
      context
    });
  }
} 