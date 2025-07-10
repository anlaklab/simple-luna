/**
 * Aspose Utilities
 * 
 * Shared utility functions extracted from monolithic AsposeAdapter
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { logger } from '../../../utils/logger';
import { ValidationError, FileStats } from '../types/interfaces';

// =============================================================================
// FILE VALIDATION UTILITIES
// =============================================================================

export async function validateFile(filePath: string, maxSize?: number): Promise<boolean> {
  try {
    const stats = await fs.stat(filePath);
    
    if (maxSize && stats.size > maxSize) {
      throw new ValidationError(`File too large: ${stats.size} bytes (max: ${maxSize})`);
    }
    
    const ext = path.extname(filePath).toLowerCase();
    const validExtensions = ['.pptx', '.ppt', '.ppsx'];
    
    if (!validExtensions.includes(ext)) {
      throw new ValidationError(`Invalid file extension: ${ext}. Allowed: ${validExtensions.join(', ')}`);
    }
    
    return true;
  } catch (error) {
    logger.error('File validation failed', { filePath, error });
    throw error;
  }
}

export async function getFileStats(filePath: string): Promise<FileStats> {
  try {
    const stats = await fs.stat(filePath);
    const ext = path.extname(filePath).toLowerCase();
    
    const mimeTypeMap: Record<string, string> = {
      '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      '.ppt': 'application/vnd.ms-powerpoint',
      '.ppsx': 'application/vnd.openxmlformats-officedocument.presentationml.slideshow',
    };
    
    return {
      size: stats.size,
      lastModified: stats.mtime,
      isValid: true,
      mimeType: mimeTypeMap[ext] || 'application/octet-stream',
    };
  } catch (error) {
    logger.error('Failed to get file stats', { filePath, error });
    throw new ValidationError(`Cannot access file: ${filePath}`);
  }
}

export function getFileSize(filePath: string): number {
  try {
    const stats = require('fs').statSync(filePath);
    return stats.size;
  } catch {
    return 0;
  }
}

// =============================================================================
// COLOR UTILITIES
// =============================================================================

export function colorToHex(color: any): string {
  try {
    if (!color) return '#000000';
    
    // Handle different color formats from Aspose
    if (typeof color === 'string') {
      return color.startsWith('#') ? color : `#${color}`;
    }
    
    if (typeof color === 'number') {
      return `#${color.toString(16).padStart(6, '0')}`;
    }
    
    // Handle Color object with getRed, getGreen, getBlue methods
    if (color.getRed && color.getGreen && color.getBlue) {
      const r = Math.floor(color.getRed()).toString(16).padStart(2, '0');
      const g = Math.floor(color.getGreen()).toString(16).padStart(2, '0');
      const b = Math.floor(color.getBlue()).toString(16).padStart(2, '0');
      return `#${r}${g}${b}`;
    }
    
    // Handle RGB object
    if (color.r !== undefined && color.g !== undefined && color.b !== undefined) {
      const r = Math.floor(color.r).toString(16).padStart(2, '0');
      const g = Math.floor(color.g).toString(16).padStart(2, '0');
      const b = Math.floor(color.b).toString(16).padStart(2, '0');
      return `#${r}${g}${b}`;
    }
    
    return '#000000';
  } catch (error) {
    logger.warn('Color conversion failed', { color, error });
    return '#000000';
  }
}

export function formatColor(color: any): string {
  return colorToHex(color);
}

// =============================================================================
// SHAPE TYPE MAPPING
// =============================================================================

export function mapShapeType(asposeShapeType: any): string {
  try {
    if (!asposeShapeType) return 'Unknown';
    
    const shapeTypeString = asposeShapeType.toString();
    
    const typeMap: Record<string, string> = {
      'AutoShape': 'AutoShape',
      'Picture': 'Image',
      'Chart': 'Chart',
      'Table': 'Table',
      'GroupShape': 'Group',
      'VideoFrame': 'Video',
      'AudioFrame': 'Audio',
      'SmartArt': 'SmartArt',
      'OleObjectFrame': 'EmbeddedObject',
      'Connector': 'Connector',
      'TextBox': 'TextBox',
      'Rectangle': 'Rectangle',
      'Ellipse': 'Ellipse',
      'Line': 'Line',
      'Freeform': 'Freeform',
      'PlaceHolder': 'Placeholder',
    };
    
    return typeMap[shapeTypeString] || shapeTypeString;
  } catch (error) {
    logger.warn('Shape type mapping failed', { asposeShapeType, error });
    return 'Unknown';
  }
}

// =============================================================================
// TEXT UTILITIES
// =============================================================================

export function sanitizeText(text: string): string {
  if (!text) return '';
  
  return text
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters
    .replace(/\r\n/g, '\n') // Normalize line endings
    .replace(/\r/g, '\n')
    .trim();
}

export function extractPlainText(textFrame: any): string {
  try {
    if (!textFrame) return '';
    
    if (textFrame.getText) {
      return sanitizeText(textFrame.getText());
    }
    
    return '';
  } catch (error) {
    logger.warn('Text extraction failed', { error });
    return '';
  }
}

// =============================================================================
// GEOMETRY UTILITIES
// =============================================================================

export function extractGeometry(shape: any): any {
  try {
    const frame = shape.getFrame();
    return {
      x: frame.getX() || 0,
      y: frame.getY() || 0,
      width: frame.getWidth() || 0,
      height: frame.getHeight() || 0,
    };
  } catch (error) {
    logger.warn('Geometry extraction failed', { error });
    return { x: 0, y: 0, width: 0, height: 0 };
  }
}

// =============================================================================
// TEMP FILE UTILITIES
// =============================================================================

export async function createTempFile(content: Buffer | string, extension: string, tempDir: string): Promise<string> {
  try {
    await fs.mkdir(tempDir, { recursive: true });
    
    const fileName = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}${extension}`;
    const filePath = path.join(tempDir, fileName);
    
    await fs.writeFile(filePath, content);
    return filePath;
  } catch (error) {
    logger.error('Failed to create temp file', { extension, tempDir, error });
    throw error;
  }
}

export async function cleanupTempFile(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
    logger.debug('Temp file cleaned up', { filePath });
  } catch (error) {
    logger.warn('Failed to cleanup temp file', { filePath, error });
  }
}

export async function ensureDirectoryExists(dirPath: string): Promise<void> {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    logger.error('Failed to create directory', { dirPath, error });
    throw error;
  }
}

// =============================================================================
// RESOURCE MANAGEMENT
// =============================================================================

export function safeDispose(resource: any): void {
  try {
    if (resource && typeof resource.dispose === 'function') {
      resource.dispose();
    }
  } catch (error) {
    logger.warn('Resource disposal failed', { error });
  }
}

export function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
}

// =============================================================================
// FORMAT EXTRACTION HELPERS
// =============================================================================

export function extractFillFormat(fillFormat: any): any {
  try {
    if (!fillFormat) return null;
    
    const result: any = {
      type: 'solid', // Default
    };
    
    if (fillFormat.getFillType) {
      const fillType = fillFormat.getFillType();
      result.type = fillType.toString().toLowerCase();
    }
    
    // Extract solid color
    if (fillFormat.getSolidFillColor && fillFormat.getSolidFillColor()) {
      const color = fillFormat.getSolidFillColor().getColor();
      if (color) {
        result.color = colorToHex(color);
      }
    }
    
    return result;
  } catch (error) {
    logger.warn('Fill format extraction failed', { error });
    return null;
  }
}

export function extractLineFormat(lineFormat: any): any {
  try {
    if (!lineFormat) return null;
    
    const result: any = {};
    
    if (lineFormat.getWidth) {
      result.width = lineFormat.getWidth();
    }
    
    if (lineFormat.getFillFormat) {
      const fillFormat = extractFillFormat(lineFormat.getFillFormat());
      if (fillFormat) {
        result.color = fillFormat.color;
      }
    }
    
    return Object.keys(result).length > 0 ? result : null;
  } catch (error) {
    logger.warn('Line format extraction failed', { error });
    return null;
  }
}

// =============================================================================
// PERFORMANCE UTILITIES
// =============================================================================

export function measureTime<T>(fn: () => T): { result: T; timeMs: number } {
  const start = Date.now();
  const result = fn();
  const timeMs = Date.now() - start;
  return { result, timeMs };
}

export async function measureTimeAsync<T>(fn: () => Promise<T>): Promise<{ result: T; timeMs: number }> {
  const start = Date.now();
  const result = await fn();
  const timeMs = Date.now() - start;
  return { result, timeMs };
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

export function isValidPath(filePath: string): boolean {
  try {
    return path.isAbsolute(filePath) || path.normalize(filePath) === filePath;
  } catch {
    return false;
  }
}

export function isValidExtension(filePath: string, allowedExtensions: string[]): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return allowedExtensions.includes(ext);
}

export function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_+|_+$/g, '');
} 