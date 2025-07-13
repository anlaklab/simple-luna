import { z } from "zod";
/**
 * Base Extensions System - Modular Functionality Injection
 * 
 * Provides reusable extensions that can be injected into any processor
 * following the CrewAI/LangChain style of modular composition.
 */

import { BaseProcessor } from '../interfaces/base.interfaces';

// =============================================================================
// EXTENSION INTERFACES
// =============================================================================

export interface Extension<T = any> {
  readonly name: string;
  readonly version: string;
  readonly dependencies: string[];
  
  // Lifecycle hooks
  beforeProcess?(input: T, context?: any): Promise<T>;
  afterProcess?(output: any, input: T, context?: any): Promise<any>;
  onError?(error: Error, input: T, context?: any): Promise<void>;
  
  // Extension-specific methods
  initialize?(processor: BaseProcessor<any, any>): Promise<void>;
  configure?(config: any): Promise<void>;
  dispose?(): Promise<void>;
}

export interface ExtensibleProcessor<TInput, TOutput, TOptions = any> extends BaseProcessor<TInput, TOutput, TOptions> {
  extensions: Map<string, Extension>;
  
  addExtension(extension: Extension): void;
  removeExtension(name: string): void;
  hasExtension(name: string): boolean;
  getExtension<T extends Extension>(name: string): T | undefined;
}

// =============================================================================
// VALIDATION EXTENSION
// =============================================================================

export interface ValidationConfig {
  enabled: boolean;
  rules: ValidationRule[];
  stopOnError: boolean;
  logValidation: boolean;
}

export interface ValidationRule {
  name: string;
  validate: (input: any) => boolean | Promise<boolean>;
  message: string;
  severity: 'error' | 'warning';
}

export class ValidationExtension implements Extension {
  readonly name = 'validation';
  readonly version = '1.0.0';
  readonly dependencies: string[] = [];
  
  private config: ValidationConfig = {
    enabled: true,
    rules: [],
    stopOnError: true,
    logValidation: false
  };

  constructor(config?: Partial<ValidationConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  async beforeProcess(input: any, context?: any): Promise<any> {
    if (!this.config.enabled) return input;

    const errors: string[] = [];
    const warnings: string[] = [];

    for (const rule of this.config.rules) {
      try {
        const isValid = await rule.validate(input);
        
        if (!isValid) {
          if (rule.severity === 'error') {
            errors.push(rule.message);
          } else {
            warnings.push(rule.message);
          }
        }
      } catch (error) {
        errors.push(`Validation rule '${rule.name}' failed: ${(error as Error).message}`);
      }
    }

    if (this.config.logValidation && (errors.length > 0 || warnings.length > 0)) {
      console.log(`Validation results - Errors: ${errors.length}, Warnings: ${warnings.length}`);
    }

    if (errors.length > 0 && this.config.stopOnError) {
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }

    // Attach validation results to context
    if (context) {
      context.validation = { errors, warnings };
    }

    return input;
  }

  async configure(config: Partial<ValidationConfig>): Promise<void> {
    this.config = { ...this.config, ...config };
  }

  addRule(rule: ValidationRule): void {
    this.config.rules.push(rule);
  }

  removeRule(name: string): void {
    this.config.rules = this.config.rules.filter(rule => rule.name !== name);
  }
}

// =============================================================================
// CACHING EXTENSION
// =============================================================================

export interface CachingConfig {
  enabled: boolean;
  ttl: number; // Time to live in milliseconds
  maxSize: number;
  keyGenerator: (input: any) => string;
  storage: 'memory' | 'redis' | 'custom';
}

export class CachingExtension implements Extension {
  readonly name = 'caching';
  readonly version = '1.0.0';
  readonly dependencies: string[] = [];
  
  private config: CachingConfig;
  private cache = new Map<string, { data: any; timestamp: number }>();

  constructor(config?: Partial<CachingConfig>) {
    this.config = {
      enabled: true,
      ttl: 300000, // 5 minutes
      maxSize: 1000,
      keyGenerator: (input: any) => JSON.stringify(input),
      storage: 'memory',
      ...config
    };
  }

  async beforeProcess(input: any, context?: any): Promise<any> {
    if (!this.config.enabled) return input;

    const cacheKey = this.config.keyGenerator(input);
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.config.ttl) {
      // Cache hit - inject result into context to skip processing
      if (context) {
        context.cacheHit = true;
        context.cachedResult = cached.data;
      }
    }

    return input;
  }

  async afterProcess(output: any, input: any, context?: any): Promise<any> {
    if (!this.config.enabled || context?.cacheHit) return output;

    // Store result in cache
    const cacheKey = this.config.keyGenerator(input);
    
    // Implement LRU eviction if cache is full
    if (this.cache.size >= this.config.maxSize) {
      const firstEntry = this.cache.keys().next();
      if (!firstEntry.done) {
        this.cache.delete(firstEntry.value);
      }
    }

    this.cache.set(cacheKey, {
      data: output,
      timestamp: Date.now()
    });

    return output;
  }

  async configure(config: Partial<CachingConfig>): Promise<void> {
    this.config = { ...this.config, ...config };
  }

  clearCache(): void {
    this.cache.clear();
  }

  getCacheStats() {
    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      ttl: this.config.ttl
    };
  }
}

// =============================================================================
// METRICS EXTENSION
// =============================================================================

export interface MetricsConfig {
  enabled: boolean;
  trackTiming: boolean;
  trackMemory: boolean;
  trackErrors: boolean;
  reportInterval: number; // milliseconds
}

export interface ProcessingMetrics {
  executionTime: number;
  memoryUsage?: {
    before: number;
    after: number;
    delta: number;
  };
  errorCount: number;
  successCount: number;
  totalProcessed: number;
}

export class MetricsExtension implements Extension {
  readonly name = 'metrics';
  readonly version = '1.0.0';
  readonly dependencies: string[] = [];
  
  private config: MetricsConfig;
  private metrics: ProcessingMetrics = {
    executionTime: 0,
    errorCount: 0,
    successCount: 0,
    totalProcessed: 0
  };
  
  private startTime: number = 0;
  private startMemory: number = 0;

  constructor(config?: Partial<MetricsConfig>) {
    this.config = {
      enabled: true,
      trackTiming: true,
      trackMemory: true,
      trackErrors: true,
      reportInterval: 60000, // 1 minute
      ...config
    };
  }

  async beforeProcess(input: any, context?: any): Promise<any> {
    if (!this.config.enabled) return input;

    this.startTime = Date.now();
    
    if (this.config.trackMemory) {
      this.startMemory = process.memoryUsage().heapUsed;
    }

    return input;
  }

  async afterProcess(output: any, input: any, context?: any): Promise<any> {
    if (!this.config.enabled) return output;

    // Track timing
    if (this.config.trackTiming) {
      const executionTime = Date.now() - this.startTime;
      this.metrics.executionTime = (this.metrics.executionTime + executionTime) / 2; // Moving average
    }

    // Track memory
    if (this.config.trackMemory) {
      const endMemory = process.memoryUsage().heapUsed;
      this.metrics.memoryUsage = {
        before: this.startMemory,
        after: endMemory,
        delta: endMemory - this.startMemory
      };
    }

    this.metrics.successCount++;
    this.metrics.totalProcessed++;

    return output;
  }

  async onError(error: Error, input: any, context?: any): Promise<void> {
    if (!this.config.enabled || !this.config.trackErrors) return;

    this.metrics.errorCount++;
    this.metrics.totalProcessed++;
  }

  getMetrics(): ProcessingMetrics {
    return { ...this.metrics };
  }

  resetMetrics(): void {
    this.metrics = {
      executionTime: 0,
      errorCount: 0,
      successCount: 0,
      totalProcessed: 0
    };
  }
}

// =============================================================================
// LOGGING EXTENSION
// =============================================================================

export interface LoggingConfig {
  enabled: boolean;
  level: 'debug' | 'info' | 'warn' | 'error';
  logInput: boolean;
  logOutput: boolean;
  logTiming: boolean;
  logErrors: boolean;
  maxInputLength: number;
  maxOutputLength: number;
}

export class LoggingExtension implements Extension {
  readonly name = 'logging';
  readonly version = '1.0.0';
  readonly dependencies: string[] = [];
  
  private config: LoggingConfig;
  private startTime: number = 0;

  constructor(config?: Partial<LoggingConfig>) {
    this.config = {
      enabled: true,
      level: 'info',
      logInput: false,
      logOutput: false,
      logTiming: true,
      logErrors: true,
      maxInputLength: 500,
      maxOutputLength: 500,
      ...config
    };
  }

  async beforeProcess(input: any, context?: any): Promise<any> {
    if (!this.config.enabled) return input;

    this.startTime = Date.now();

    if (this.config.logInput) {
      const inputStr = this.truncate(JSON.stringify(input), this.config.maxInputLength);
      this.log('info', `Processing input: ${inputStr}`);
    }

    return input;
  }

  async afterProcess(output: any, input: any, context?: any): Promise<any> {
    if (!this.config.enabled) return output;

    if (this.config.logTiming) {
      const duration = Date.now() - this.startTime;
      this.log('info', `Processing completed in ${duration}ms`);
    }

    if (this.config.logOutput) {
      const outputStr = this.truncate(JSON.stringify(output), this.config.maxOutputLength);
      this.log('info', `Processing output: ${outputStr}`);
    }

    return output;
  }

  async onError(error: Error, input: any, context?: any): Promise<void> {
    if (!this.config.enabled || !this.config.logErrors) return;

    this.log('error', `Processing failed: ${error.message}`);
    if (error.stack) {
      this.log('debug', `Stack trace: ${error.stack}`);
    }
  }

  private log(level: string, message: string): void {
    const levels = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.config.level);
    const messageLevelIndex = levels.indexOf(level);

    if (messageLevelIndex >= currentLevelIndex) {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
    }
  }

  private truncate(str: string, maxLength: number): string {
    return str.length > maxLength ? str.substring(0, maxLength) + '...' : str;
  }
}

// =============================================================================
// EXTENSION REGISTRY
// =============================================================================

export class ExtensionRegistry {
  private static instance: ExtensionRegistry;
  private extensions = new Map<string, () => Extension>();

  private constructor() {
    this.registerDefaults();
  }

  public static getInstance(): ExtensionRegistry {
    if (!ExtensionRegistry.instance) {
      ExtensionRegistry.instance = new ExtensionRegistry();
    }
    return ExtensionRegistry.instance;
  }

  private registerDefaults(): void {
    this.extensions.set('validation', () => new ValidationExtension());
    this.extensions.set('caching', () => new CachingExtension());
    this.extensions.set('metrics', () => new MetricsExtension());
    this.extensions.set('logging', () => new LoggingExtension());
  }

  register(name: string, creator: () => Extension): void {
    this.extensions.set(name, creator);
  }

  create(name: string, config?: any): Extension {
    const creator = this.extensions.get(name);
    if (!creator) {
      throw new Error(`Extension not found: ${name}`);
    }
    
    const extension = creator();
    if (config && extension.configure) {
      extension.configure(config);
    }
    
    return extension;
  }

  getAvailable(): string[] {
    return Array.from(this.extensions.keys());
  }
}

export const extensionRegistry = ExtensionRegistry.getInstance(); 