import { z } from "zod";
/**
 * Fill Format Extractor - Handles fill, gradient, pattern extraction
 */

import { logger } from '../../utils/logger';
import { ColorUtils } from './color-utils';

// ✅ ROBUST IMPORT: Use AsposeDriverFactory for unified access
const asposeDriver = require('/app/lib/AsposeDriverFactory');

export class FillExtractor {
  private colorUtils: ColorUtils;

  constructor() {
    this.colorUtils = new ColorUtils();
  }

  /**
   * Extract fill format properties from shape
   */
  async extractFillFormat(fillFormat: any): Promise<any | null> {
    try {
      if (!fillFormat) return null;

      // ✅ REFACTORED: Use AsposeDriverFactory instead of direct import
      await asposeDriver.initialize();
      const FillType = await asposeDriver.getFillTypes();
      const fillType = fillFormat.getFillType();

      const result: any = {
        type: this.mapFillType(fillType),
      };

      switch (fillType) {
        case FillType.Solid:
          const solidFillColor = fillFormat.getSolidFillColor();
          if (solidFillColor) {
            result.solidFillColor = {
              color: this.colorUtils.colorToHex(solidFillColor.getColor()),
              transparency: solidFillColor.getAlpha ? (100 - solidFillColor.getAlpha()) / 100 : 0,
            };
          }
          break;
        
        case FillType.Gradient:
          const gradientFormat = fillFormat.getGradientFormat();
          if (gradientFormat) {
            result.gradientFillFormat = {
              direction: gradientFormat.getGradientDirection ? gradientFormat.getGradientDirection() : undefined,
              shape: gradientFormat.getGradientShape ? gradientFormat.getGradientShape() : undefined,
              angle: gradientFormat.getLinearGradientAngle ? gradientFormat.getLinearGradientAngle() : undefined,
              gradientStops: this.extractGradientStops(gradientFormat.getGradientStops()),
            };
          }
          break;
        
        case FillType.Pattern:
          const patternFormat = fillFormat.getPatternFormat();
          if (patternFormat) {
            result.patternFormat = {
              patternStyle: patternFormat.getPatternStyle ? patternFormat.getPatternStyle() : undefined,
              foreColor: patternFormat.getForeColor ? this.colorUtils.colorToHex(patternFormat.getForeColor().getColor()) : undefined,
              backColor: patternFormat.getBackColor ? this.colorUtils.colorToHex(patternFormat.getBackColor().getColor()) : undefined,
            };
          }
          break;
        
        case FillType.Picture:
          const pictureFillFormat = fillFormat.getPictureFillFormat();
          if (pictureFillFormat && pictureFillFormat.getPicture()) {
            result.pictureFormat = {
              stretchMode: pictureFillFormat.getPictureFillMode ? pictureFillFormat.getPictureFillMode() : undefined,
              imageData: this.extractImageData(pictureFillFormat.getPicture()),
            };
          }
          break;
      }

      return result;
    } catch (error) {
      logger.error('Error extracting fill format', { error });
      return null;
    }
  }

  /**
   * Extract gradient stops
   */
  private extractGradientStops(gradientStops: any): any[] {
    const result: any[] = [];
    
    try {
      if (!gradientStops) return result;

      for (let i = 0; i < gradientStops.size(); i++) {
        const stop = gradientStops.get_Item(i);
        result.push({
          position: stop.getPosition(),
          color: this.colorUtils.colorToHex(stop.getColor()),
          transparency: stop.getAlpha ? (100 - stop.getAlpha()) / 100 : 0,
        });
      }
    } catch (error) {
      logger.error('Error extracting gradient stops', { error });
    }

    return result;
  }

  /**
   * Map Aspose fill type to schema fill type
   */
  private mapFillType(asposeFillType: any): string {
    const typeMap: Record<string, string> = {
      '0': 'NotDefined',
      '1': 'Solid',
      '2': 'Gradient',
      '3': 'Pattern',
      '4': 'Picture',
      '5': 'NoFill',
      '6': 'Group',
    };

    return typeMap[asposeFillType?.toString()] || 'NotDefined';
  }

  /**
   * Extract image data from picture
   */
  private extractImageData(picture: any): string | null {
    try {
      const imageData = picture.getBinaryData();
      return Buffer.from(imageData).toString('base64');
    } catch (error) {
      logger.error('Error extracting image data', { error });
      return null;
    }
  }
}