import { z } from "zod";
/**
 * Geometry Extractor - Handles shape position, size, rotation
 */

import { logger } from '../../utils/logger';

export class GeometryExtractor {
  /**
   * Extract comprehensive geometry information
   */
  extractGeometry(shape: any): any {
    try {
      const frame = shape.getFrame();
      return {
        x: frame.getX(),
        y: frame.getY(),
        width: frame.getWidth(),
        height: frame.getHeight(),
        rotation: shape.getRotation() || 0,
      };
    } catch (error) {
      logger.error('Error extracting geometry', { error });
      return {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        rotation: 0,
      };
    }
  }
}