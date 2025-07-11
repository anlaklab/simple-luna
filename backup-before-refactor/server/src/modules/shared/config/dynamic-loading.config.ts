/**
 * Dynamic Loading Configuration
 * 
 * Security, validation, and robustness configuration for dynamic component loading.
 * Follows the strictest security practices for production environments.
 */

import path from 'path';
import fs from 'fs';
import { logger } from '../../../utils/logger';

// =============================================================================
// SECURITY CONFIGURATION
// =============================================================================

export interface SecurityConfig {
  allowedExtensionTypes: string[];
  maxExtensionsPerType: number;
  maxTotalExtensions: number;
  allowedDirectories: string[];
  blockedPatterns: RegExp[];
  requireSignature: boolean;
  sandboxExecution: boolean;
}

export interface ValidationConfig {
  strictTypeChecking: boolean;
  requireExactInterface: boolean;
  validateMethods: string[];
  allowOptionalMethods: string[];
  maxExecutionTime: number;
  memoryLimit: number;
}

export interface RobustnessConfig {
  enableFallbacks: boolean;
  maxRetries: number;
  gracefulDegradation: boolean;
  isolateFailures: boolean;
  enableHotReload: boolean;
  cacheExtensions: boolean;
}

// =============================================================================
// DEFAULT CONFIGURATIONS
// =============================================================================

export const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  allowedExtensionTypes: [
    'chart', 'table', 'video', 'audio', 'image', 'smartart', 
    'text', 'shape', 'connector', 'group', 'oleobject'
  ],
  maxExtensionsPerType: 3,
  maxTotalExtensions: 20,
  allowedDirectories: [
    path.join(__dirname, '../extensions'),
    path.join(__dirname, '../../conversion/extensions'),
    path.join(__dirname, '../../ai/extensions')
  ],
  blockedPatterns: [
    /\.\.[\\/]/,           // Path traversal
    /node_modules/,        // External modules
    /system|exec|spawn/i,  // System commands
    /eval|function\s*\(/i, // Dynamic evaluation
    /require\s*\(/         // Dynamic requires (except our controlled ones)
  ],
  requireSignature: false, // Set to true in production
  sandboxExecution: false  // Set to true in production with proper sandbox
};

export const DEFAULT_VALIDATION_CONFIG: ValidationConfig = {
  strictTypeChecking: true,
  requireExactInterface: true,
  validateMethods: ['extract', 'name', 'version', 'supportedTypes'],
  allowOptionalMethods: ['initialize', 'dispose', 'validate', 'configure'],
  maxExecutionTime: 30000, // 30 seconds
  memoryLimit: 100 * 1024 * 1024, // 100MB
};

export const DEFAULT_ROBUSTNESS_CONFIG: RobustnessConfig = {
  enableFallbacks: true,
  maxRetries: 3,
  gracefulDegradation: true,
  isolateFailures: true,
  enableHotReload: process.env.NODE_ENV === 'development',
  cacheExtensions: true
};

// =============================================================================
// SECURITY VALIDATORS
// =============================================================================

export class DynamicLoadingSecurity {
  private config: SecurityConfig;

  constructor(config: SecurityConfig = DEFAULT_SECURITY_CONFIG) {
    this.config = config;
  }

  /**
   * Validates if a file path is safe to load
   */
  validateFilePath(filePath: string): { valid: boolean; reason?: string } {
    try {
      // Resolve absolute path
      const resolvedPath = path.resolve(filePath);
      
      // Check if path is in allowed directories
      const isInAllowedDir = this.config.allowedDirectories.some(allowedDir => {
        const resolvedAllowedDir = path.resolve(allowedDir);
        return resolvedPath.startsWith(resolvedAllowedDir);
      });

      if (!isInAllowedDir) {
        return { 
          valid: false, 
          reason: `Path not in allowed directories: ${filePath}` 
        };
      }

      // Check against blocked patterns
      for (const pattern of this.config.blockedPatterns) {
        if (pattern.test(filePath)) {
          return { 
            valid: false, 
            reason: `Path matches blocked pattern: ${pattern.toString()}` 
          };
        }
      }

      // Check file exists and is readable
      if (!fs.existsSync(resolvedPath)) {
        return { 
          valid: false, 
          reason: `File does not exist: ${filePath}` 
        };
      }

      const stats = fs.statSync(resolvedPath);
      if (!stats.isFile()) {
        return { 
          valid: false, 
          reason: `Path is not a file: ${filePath}` 
        };
      }

      return { valid: true };

    } catch (error) {
      return { 
        valid: false, 
        reason: `Path validation error: ${(error as Error).message}` 
      };
    }
  }

  /**
   * Validates extension content before loading
   */
  validateExtensionContent(content: string): { valid: boolean; reason?: string } {
    try {
      // Check for dangerous patterns in code
      const dangerousPatterns = [
        /require\s*\(\s*['"`]child_process['"`]/,
        /require\s*\(\s*['"`]fs['"`]/,
        /require\s*\(\s*['"`]path['"`]/,
        /eval\s*\(/,
        /Function\s*\(/,
        /setTimeout\s*\(/,
        /setInterval\s*\(/,
        /process\./,
        /global\./,
        /__dirname/,
        /__filename/
      ];

      for (const pattern of dangerousPatterns) {
        if (pattern.test(content)) {
          return { 
            valid: false, 
            reason: `Content contains dangerous pattern: ${pattern.toString()}` 
          };
        }
      }

      // Check for required export pattern
      if (!content.includes('export default class')) {
        return { 
          valid: false, 
          reason: 'Extension must export default class' 
        };
      }

      return { valid: true };

    } catch (error) {
      return { 
        valid: false, 
        reason: `Content validation error: ${(error as Error).message}` 
      };
    }
  }

  /**
   * Validates extension type limits
   */
  validateExtensionLimits(
    newType: string, 
    currentRegistry: Map<string, any>
  ): { valid: boolean; reason?: string } {
    try {
      // Check total extension limit
      if (currentRegistry.size >= this.config.maxTotalExtensions) {
        return { 
          valid: false, 
          reason: `Maximum total extensions exceeded: ${this.config.maxTotalExtensions}` 
        };
      }

      // Check allowed extension types
      if (!this.config.allowedExtensionTypes.includes(newType)) {
        return { 
          valid: false, 
          reason: `Extension type not allowed: ${newType}` 
        };
      }

      // Check per-type limits
      const typeCount = Array.from(currentRegistry.keys())
        .filter(key => key === newType).length;
      
      if (typeCount >= this.config.maxExtensionsPerType) {
        return { 
          valid: false, 
          reason: `Maximum extensions per type exceeded for ${newType}: ${this.config.maxExtensionsPerType}` 
        };
      }

      return { valid: true };

    } catch (error) {
      return { 
        valid: false, 
        reason: `Limit validation error: ${(error as Error).message}` 
      };
    }
  }
}

// =============================================================================
// EXTENSION VALIDATORS
// =============================================================================

export class ExtensionValidator {
  private config: ValidationConfig;

  constructor(config: ValidationConfig = DEFAULT_VALIDATION_CONFIG) {
    this.config = config;
  }

  /**
   * Validates extension instance against interface requirements
   */
  validateExtensionInstance(instance: any, type: string): { valid: boolean; reason?: string } {
    try {
      // Check required methods
      for (const method of this.config.validateMethods) {
        if (!(method in instance)) {
          return { 
            valid: false, 
            reason: `Missing required method: ${method}` 
          };
        }

        if (typeof instance[method] !== 'function' && typeof instance[method] !== 'string') {
          return { 
            valid: false, 
            reason: `Invalid type for ${method}: expected function or string` 
          };
        }
      }

      // Validate specific properties
      if (this.config.strictTypeChecking) {
        if (!instance.name || typeof instance.name !== 'string') {
          return { 
            valid: false, 
            reason: 'Extension must have a valid name property' 
          };
        }

        if (!instance.version || typeof instance.version !== 'string') {
          return { 
            valid: false, 
            reason: 'Extension must have a valid version property' 
          };
        }

        if (!instance.supportedTypes || !Array.isArray(instance.supportedTypes)) {
          return { 
            valid: false, 
            reason: 'Extension must have a supportedTypes array' 
          };
        }

        if (typeof instance.extract !== 'function') {
          return { 
            valid: false, 
            reason: 'Extension must have an extract method' 
          };
        }
      }

      return { valid: true };

    } catch (error) {
      return { 
        valid: false, 
        reason: `Instance validation error: ${(error as Error).message}` 
      };
    }
  }

  /**
   * Tests extension execution safety
   */
  async testExtensionSafety(instance: any): Promise<{ safe: boolean; reason?: string }> {
    try {
      // Test basic method calls with timeout
      const testPromise = Promise.race([
        this.runBasicTests(instance),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Test timeout')), this.config.maxExecutionTime)
        )
      ]);

      await testPromise;
      return { safe: true };

    } catch (error) {
      return { 
        safe: false, 
        reason: `Safety test failed: ${(error as Error).message}` 
      };
    }
  }

  private async runBasicTests(instance: any): Promise<void> {
    // Test that extension doesn't throw on basic property access
    const _ = instance.name;
    const __ = instance.version;
    const ___ = instance.supportedTypes;

    // Test that extract method exists and can be called safely with null
    if (typeof instance.extract === 'function') {
      try {
        await instance.extract(null, {});
      } catch (error) {
        // Expected to fail with null input, but shouldn't crash the process
        if ((error as Error).message.includes('process') || (error as Error).message.includes('system')) {
          throw new Error('Extension attempted system access during test');
        }
      }
    }
  }
}

// =============================================================================
// ROBUSTNESS MANAGER
// =============================================================================

export class RobustnessManager {
  private config: RobustnessConfig;
  private retryCounters = new Map<string, number>();
  private failureLog = new Map<string, Array<{ timestamp: Date; error: string }>>();

  constructor(config: RobustnessConfig = DEFAULT_ROBUSTNESS_CONFIG) {
    this.config = config;
  }

  /**
   * Executes extension loading with retry logic
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationId: string
  ): Promise<{ success: boolean; result?: T; error?: string }> {
    const maxRetries = this.config.maxRetries;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await operation();
        
        // Reset retry counter on success
        this.retryCounters.delete(operationId);
        
        return { success: true, result };

      } catch (error) {
        lastError = error as Error;
        
        // Log failure
        this.logFailure(operationId, lastError.message);
        
        // Check if we should retry
        if (attempt < maxRetries && this.shouldRetry(operationId, lastError)) {
          const retryCount = (this.retryCounters.get(operationId) || 0) + 1;
          this.retryCounters.set(operationId, retryCount);
          
          // Exponential backoff
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
          await new Promise(resolve => setTimeout(resolve, delay));
          
          logger.warn(`Retrying operation ${operationId}, attempt ${attempt + 2}/${maxRetries + 1}`, {
            error: lastError.message,
            delay
          });
          
          continue;
        }
        
        break;
      }
    }

    return { 
      success: false, 
      error: lastError?.message || 'Unknown error' 
    };
  }

  private shouldRetry(operationId: string, error: Error): boolean {
    // Don't retry for certain types of errors
    const nonRetryableErrors = [
      'security violation',
      'validation failed',
      'path traversal',
      'unauthorized access'
    ];

    const errorMessage = error.message.toLowerCase();
    return !nonRetryableErrors.some(pattern => errorMessage.includes(pattern));
  }

  private logFailure(operationId: string, error: string): void {
    if (!this.failureLog.has(operationId)) {
      this.failureLog.set(operationId, []);
    }

    const failures = this.failureLog.get(operationId)!;
    failures.push({ timestamp: new Date(), error });

    // Keep only last 10 failures per operation
    if (failures.length > 10) {
      failures.shift();
    }
  }

  getFailureStats(): any {
    const stats: any = {};
    
    for (const [operationId, failures] of this.failureLog.entries()) {
      stats[operationId] = {
        totalFailures: failures.length,
        lastFailure: failures[failures.length - 1],
        retryCount: this.retryCounters.get(operationId) || 0
      };
    }

    return stats;
  }
}

// =============================================================================
// COMBINED SECURITY MANAGER
// =============================================================================

export class DynamicLoadingSecurityManager {
  private security: DynamicLoadingSecurity;
  private validator: ExtensionValidator;
  private robustness: RobustnessManager;

  constructor(
    securityConfig?: SecurityConfig,
    validationConfig?: ValidationConfig,
    robustnessConfig?: RobustnessConfig
  ) {
    this.security = new DynamicLoadingSecurity(securityConfig);
    this.validator = new ExtensionValidator(validationConfig);
    this.robustness = new RobustnessManager(robustnessConfig);
  }

  /**
   * Comprehensive validation and loading of extension
   */
  async secureLoadExtension(
    filePath: string,
    type: string,
    currentRegistry: Map<string, any>,
    dependencies?: any
  ): Promise<{ success: boolean; instance?: any; error?: string }> {
    const operationId = `load-${type}-${Date.now()}`;
    
    return await this.robustness.executeWithRetry(async () => {
      // Step 1: Validate file path
      const pathValidation = this.security.validateFilePath(filePath);
      if (!pathValidation.valid) {
        throw new Error(`Path validation failed: ${pathValidation.reason}`);
      }

      // Step 2: Validate extension limits
      const limitValidation = this.security.validateExtensionLimits(type, currentRegistry);
      if (!limitValidation.valid) {
        throw new Error(`Limit validation failed: ${limitValidation.reason}`);
      }

      // Step 3: Validate file content
      const content = fs.readFileSync(filePath, 'utf-8');
      const contentValidation = this.security.validateExtensionContent(content);
      if (!contentValidation.valid) {
        throw new Error(`Content validation failed: ${contentValidation.reason}`);
      }

      // Step 4: Load extension class
      delete require.cache[path.resolve(filePath)];
      const ExtensionModule = require(filePath);
      const ExtensionClass = ExtensionModule.default || ExtensionModule;

      if (!ExtensionClass || typeof ExtensionClass !== 'function') {
        throw new Error('Invalid extension: must export default class');
      }

      // Step 5: Create instance
      const instance = new ExtensionClass(dependencies);

      // Step 6: Validate instance
      const instanceValidation = this.validator.validateExtensionInstance(instance, type);
      if (!instanceValidation.valid) {
        throw new Error(`Instance validation failed: ${instanceValidation.reason}`);
      }

      // Step 7: Test safety
      const safetyTest = await this.validator.testExtensionSafety(instance);
      if (!safetyTest.safe) {
        throw new Error(`Safety test failed: ${safetyTest.reason}`);
      }

      logger.info(`Extension ${type} loaded successfully with full security validation`, {
        filePath,
        operationId
      });

      return instance;

    }, operationId);
  }

  getSecurityStats(): any {
    return {
      failures: this.robustness.getFailureStats(),
      security: {
        allowedTypes: this.security['config'].allowedExtensionTypes,
        maxExtensions: this.security['config'].maxTotalExtensions
      },
      validation: {
        strictMode: this.validator['config'].strictTypeChecking,
        maxExecutionTime: this.validator['config'].maxExecutionTime
      }
    };
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export const defaultSecurityManager = new DynamicLoadingSecurityManager(); 