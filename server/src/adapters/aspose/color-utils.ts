import { z } from "zod";
/**
 * Color Utilities - Handles color conversions
 */

export class ColorUtils {
  /**
   * Convert color to hex string
   */
  colorToHex(color: any): string {
    try {
      if (!color) return '#000000';
      
      const r = color.getR();
      const g = color.getG();
      const b = color.getB();
      
      return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    } catch (error) {
      return '#000000';
    }
  }

  /**
   * Convert RGBA to hex with alpha
   */
  rgbaToHex(r: number, g: number, b: number, a?: number): string {
    const hex = this.colorToHex({ getR: () => r, getG: () => g, getB: () => b });
    if (a !== undefined && a < 1) {
      const alpha = Math.round(a * 255).toString(16).padStart(2, '0');
      return hex + alpha;
    }
    return hex;
  }
}