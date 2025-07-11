/**
 * Shape Type Detector - Identifies shape types from Aspose objects
 * 
 * Centralizes shape type detection logic with mapping capabilities.
 * Part of the componentized coordinator system.
 */

import { logger } from '../../../../utils/logger';

// ✅ ROBUST IMPORT: Use AsposeDriverFactory for unified access
const asposeDriver = require('/app/lib/AsposeDriverFactory');

export class ShapeTypeDetector {
  
  /**
   * Detect shape type from Aspose shape object
   */
  async detectShapeType(shape: any): Promise<string> {
    try {
      // ✅ REFACTORED: Use AsposeDriverFactory instead of direct import
      await asposeDriver.initialize();
      const ShapeType = await asposeDriver.getShapeTypes();
      const shapeType = shape.getShapeType();

      return this.mapAsposeToUniversal(shapeType, ShapeType);

    } catch (error) {
      logger.error('Error detecting shape type', { error: (error as Error).message });
      return 'Unknown';
    }
  }

  /**
   * Map Aspose shape types to Universal schema types
   */
  private mapAsposeToUniversal(asposeShapeType: any, ShapeType: any): string {
    try {
      // Direct type mapping
      if (asposeShapeType === ShapeType.Chart) return 'Chart';
      if (asposeShapeType === ShapeType.Table) return 'Table';
      if (asposeShapeType === ShapeType.Picture) return 'Picture';
      if (asposeShapeType === ShapeType.VideoFrame) return 'VideoFrame';
      if (asposeShapeType === ShapeType.AudioFrame) return 'AudioFrame';
      if (asposeShapeType === ShapeType.SmartArt) return 'SmartArt';
      if (asposeShapeType === ShapeType.OleObjectFrame) return 'OleObject';
      if (asposeShapeType === ShapeType.GroupShape) return 'GroupShape';
      if (asposeShapeType === ShapeType.Connector) return 'Connector';

      // Geometry shapes
      if (asposeShapeType === ShapeType.Rectangle) return 'Rectangle';
      if (asposeShapeType === ShapeType.RoundCornerRectangle) return 'RoundedRectangle';
      if (asposeShapeType === ShapeType.Ellipse) return 'Ellipse';
      if (asposeShapeType === ShapeType.Triangle) return 'Triangle';
      if (asposeShapeType === ShapeType.Line) return 'Line';

      // Text shapes
      if (asposeShapeType === ShapeType.TextBox) return 'TextBox';
      if (asposeShapeType === ShapeType.AutoShape) return 'AutoShape';

      // Fallback for unknown types
      return `Unknown_${asposeShapeType}`;

    } catch (error) {
      logger.error('Error mapping shape type', { error: (error as Error).message });
      return 'Unknown';
    }
  }

  /**
   * Check if shape type is supported
   */
  isSupportedType(shapeType: string): boolean {
    const supportedTypes = [
      'Chart', 'Table', 'Picture', 'VideoFrame', 'AudioFrame',
      'SmartArt', 'OleObject', 'GroupShape', 'Connector',
      'Rectangle', 'RoundedRectangle', 'Ellipse', 'Triangle',
      'Line', 'TextBox', 'AutoShape'
    ];

    return supportedTypes.includes(shapeType);
  }

  /**
   * Get shape type category
   */
  getShapeCategory(shapeType: string): string {
    const categories: Record<string, string> = {
      'Chart': 'complex',
      'Table': 'complex',
      'SmartArt': 'complex',
      'OleObject': 'complex',
      'Picture': 'media',
      'VideoFrame': 'media',
      'AudioFrame': 'media',
      'GroupShape': 'container',
      'Rectangle': 'geometry',
      'RoundedRectangle': 'geometry',
      'Ellipse': 'geometry',
      'Triangle': 'geometry',
      'Line': 'geometry',
      'TextBox': 'text',
      'AutoShape': 'text',
      'Connector': 'special'
    };

    return categories[shapeType] || 'unknown';
  }

  /**
   * Get all supported shape types
   */
  getSupportedShapeTypes(): string[] {
    return [
      'Chart', 'Table', 'Picture', 'VideoFrame', 'AudioFrame',
      'SmartArt', 'OleObject', 'GroupShape', 'Connector',
      'Rectangle', 'RoundedRectangle', 'Ellipse', 'Triangle',
      'Line', 'TextBox', 'AutoShape'
    ];
  }
} 