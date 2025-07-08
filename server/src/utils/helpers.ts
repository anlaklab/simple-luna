/**
 * Helper Utilities - Common functions for the Luna server
 * 
 * File processing, validation, and utility functions
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import * as mimeTypes from 'mime-types';

// =============================================================================
// FILE PROCESSING HELPERS
// =============================================================================

export interface FileInfo {
  name: string;
  ext: string;
  size: number;
  mimeType: string;
  buffer: Buffer;
  encoding: string;
}

export interface ProcessedFile extends FileInfo {
  id: string;
  originalName: string;
  processedAt: Date;
  tempPath?: string;
}

/**
 * Process uploaded file and extract metadata
 */
export function processUploadedFile(file: any): ProcessedFile {
  const ext = path.extname(file.originalname).toLowerCase();
  const mimeType = file.mimetype || mimeTypes.lookup(ext) || 'application/octet-stream';
  
  return {
    id: uuidv4(),
    name: file.filename || `${uuidv4()}${ext}`,
    originalName: file.originalname,
    ext,
    size: file.size,
    mimeType,
    buffer: file.buffer,
    encoding: file.encoding || 'binary',
    processedAt: new Date(),
  };
}

/**
 * Validate file type against allowed types
 */
export function validateFileType(file: FileInfo, allowedTypes: string[]): boolean {
  const extension = file.ext.toLowerCase();
  const mimeType = file.mimeType.toLowerCase();
  
  return allowedTypes.some(type => {
    if (type.startsWith('.')) {
      return extension === type.toLowerCase();
    }
    return mimeType.includes(type.toLowerCase());
  });
}

/**
 * Validate file size
 */
export function validateFileSize(file: FileInfo, maxSizeBytes: number): boolean {
  return file.size <= maxSizeBytes;
}

/**
 * Create temporary file from buffer
 */
export async function createTempFile(
  buffer: Buffer,
  filename: string,
  tempDir: string = './temp'
): Promise<string> {
  await ensureDirectoryExists(tempDir);
  
  const tempPath = path.join(tempDir, `${uuidv4()}_${filename}`);
  await fs.writeFile(tempPath, buffer);
  
  return tempPath;
}

/**
 * Clean up temporary files
 */
export async function cleanupTempFiles(filePaths: string[]): Promise<void> {
  const cleanupPromises = filePaths.map(async (filePath) => {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      // Ignore cleanup errors (file might not exist)
    }
  });
  
  await Promise.all(cleanupPromises);
}

/**
 * Ensure directory exists
 */
export async function ensureDirectoryExists(dirPath: string): Promise<void> {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error: any) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
}

// =============================================================================
// STRING & TEXT HELPERS
// =============================================================================

/**
 * Generate a safe filename from string
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-z0-9\-_.]/gi, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
}

/**
 * Truncate text to specified length
 */
export function truncateText(text: string, maxLength: number, suffix: string = '...'): string {
  if (text.length <= maxLength) {
    return text;
  }
  
  return text.substring(0, maxLength - suffix.length) + suffix;
}

/**
 * Extract text content from presentation schema
 */
export function extractTextFromPresentation(presentation: any): string {
  const textParts: string[] = [];
  
  if (presentation.slides) {
    presentation.slides.forEach((slide: any) => {
      if (slide.shapes) {
        slide.shapes.forEach((shape: any) => {
          if (shape.textFrame?.text) {
            textParts.push(shape.textFrame.text);
          }
        });
      }
      
      if (slide.notes) {
        textParts.push(slide.notes);
      }
    });
  }
  
  return textParts.join('\n\n');
}

/**
 * Count words in text
 */
export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

/**
 * Count characters in text (excluding whitespace)
 */
export function countCharacters(text: string, includeSpaces: boolean = true): number {
  return includeSpaces ? text.length : text.replace(/\s/g, '').length;
}

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate hex color format
 */
export function isValidHexColor(color: string): boolean {
  const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;
  return hexColorRegex.test(color);
}

/**
 * Validate language code (2-letter ISO 639-1)
 */
export function isValidLanguageCode(code: string): boolean {
  const languageCodeRegex = /^[a-z]{2}$/;
  return languageCodeRegex.test(code);
}

// =============================================================================
// DATA TRANSFORMATION HELPERS
// =============================================================================

/**
 * Convert bytes to human readable format
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Convert milliseconds to human readable duration
 */
export function formatDuration(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Deep clone an object
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime()) as unknown as T;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => deepClone(item)) as unknown as T;
  }

  const clonedObj: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      clonedObj[key] = deepClone(obj[key]);
    }
  }

  return clonedObj;
}

/**
 * Safely parse JSON with error handling
 */
export function safeJsonParse<T>(jsonString: string, defaultValue: T): T {
  try {
    return JSON.parse(jsonString);
  } catch {
    return defaultValue;
  }
}

/**
 * Merge objects deeply
 */
export function deepMerge<T extends Record<string, any>>(target: T, ...sources: Partial<T>[]): T {
  if (!sources.length) return target;
  const source = sources.shift();

  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        if (!target[key]) Object.assign(target, { [key]: {} });
        deepMerge(target[key], source[key]);
      } else {
        Object.assign(target, { [key]: source[key] });
      }
    }
  }

  return deepMerge(target, ...sources);
}

function isObject(item: any): boolean {
  return item && typeof item === 'object' && !Array.isArray(item);
}

// =============================================================================
// ASYNC HELPERS
// =============================================================================

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry async operation with exponential backoff
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
  maxDelay: number = 10000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) {
        break;
      }

      const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
      await sleep(delay);
    }
  }

  throw lastError!;
}

/**
 * Execute promises with limited concurrency
 */
export async function limitConcurrency<T>(
  tasks: (() => Promise<T>)[],
  limit: number
): Promise<T[]> {
  const results: T[] = [];
  const executing: Promise<void>[] = [];

  for (const task of tasks) {
    const promise = task().then(result => {
      results.push(result);
    });

    executing.push(promise);

    if (executing.length >= limit) {
      await Promise.race(executing);
      executing.splice(executing.findIndex(p => p === promise), 1);
    }
  }

  await Promise.all(executing);
  return results;
}

// =============================================================================
// SECURITY HELPERS
// =============================================================================

/**
 * Generate cryptographically secure random string
 */
export function generateSecureToken(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
}

/**
 * Hash string using simple algorithm (for non-security purposes)
 */
export function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(16);
}

// =============================================================================
// ENVIRONMENT HELPERS
// =============================================================================

/**
 * Get environment variable with default value
 */
export function getEnvVar(name: string, defaultValue?: string): string {
  const value = process.env[name];
  if (value === undefined) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(`Environment variable ${name} is required but not set`);
  }
  return value;
}

/**
 * Get environment variable as number
 */
export function getEnvVarAsNumber(name: string, defaultValue?: number): number {
  const value = process.env[name];
  if (value === undefined) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(`Environment variable ${name} is required but not set`);
  }
  
  const numValue = Number(value);
  if (isNaN(numValue)) {
    throw new Error(`Environment variable ${name} must be a valid number`);
  }
  
  return numValue;
}

/**
 * Get environment variable as boolean
 */
export function getEnvVarAsBoolean(name: string, defaultValue?: boolean): boolean {
  const value = process.env[name];
  if (value === undefined) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(`Environment variable ${name} is required but not set`);
  }
  
  return value.toLowerCase() === 'true' || value === '1';
}

/**
 * Check if running in development mode
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

/**
 * Check if running in production mode
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Check if running in test mode
 */
export function isTest(): boolean {
  return process.env.NODE_ENV === 'test';
} 