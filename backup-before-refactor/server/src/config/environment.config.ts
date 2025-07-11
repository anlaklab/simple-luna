/**
 * Environment Configuration Management
 * 
 * Centralized configuration system with validation, type safety, and defaults
 * Prevents runtime failures due to missing or invalid environment variables
 */

import { logger } from '../utils/logger';
import * as fs from 'fs';
import * as path from 'path';

export interface AppConfig {
  // Server Configuration
  server: {
    port: number;
    host: string;
    environment: 'development' | 'production' | 'test';
    apiVersion: string;
    corsOrigins: string[];
    requestTimeout: number;
    bodyParserLimit: string;
  };

  // Firebase Configuration
  firebase: {
    projectId: string;
    privateKey: string;
    clientEmail: string;
    storageBucket: string;
    databaseUrl?: string;
    enabled: boolean;
  };

  // OpenAI Configuration
  openai: {
    apiKey: string;
    model: string;
    maxTokens: number;
    temperature: number;
    enabled: boolean;
  };

  // Aspose.Slides Configuration
  aspose: {
    licenseFilePath: string;
    tempDirectory: string;
    maxFileSize: number;
    javaHeapSize: string;
    enabled: boolean;
  };

  // File Upload Configuration
  upload: {
    maxFileSize: number;
    allowedMimeTypes: string[];
    uploadDirectory: string;
    tempDirectory: string;
    cleanupInterval: number;
  };

  // Security Configuration
  security: {
    enableHelmet: boolean;
    enableCors: boolean;
    enableRateLimit: boolean;
    rateLimit: {
      windowMs: number;
      maxRequests: number;
    };
    jwtSecret?: string;
    encryptionKey?: string;
  };

  // Logging Configuration
  logging: {
    level: 'error' | 'warn' | 'info' | 'debug';
    enableConsole: boolean;
    enableFile: boolean;
    logDirectory: string;
    maxFileSize: string;
    maxFiles: number;
  };

  // Performance Configuration
  performance: {
    enableCompression: boolean;
    enableCache: boolean;
    cacheDirectory: string;
    cacheTTL: number;
    maxConcurrentJobs: number;
  };

  // Feature Flags
  features: {
    enableThumbnails: boolean;
    enableAI: boolean;
    enableBatchOperations: boolean;
    enableVersioning: boolean;
    enableAnalytics: boolean;
    enableDynamicExtensions: boolean;
  };
}

export interface ConfigValidationResult {
  isValid: boolean;
  errors: ConfigValidationError[];
  warnings: ConfigValidationWarning[];
}

export interface ConfigValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
  suggestion?: string;
}

export interface ConfigValidationWarning {
  field: string;
  message: string;
  recommendation: string;
}

class EnvironmentConfigManager {
  private config: AppConfig;
  private validationResult: ConfigValidationResult;

  constructor() {
    this.config = this.loadConfiguration();
    this.validationResult = this.validateConfiguration();
    
    if (!this.validationResult.isValid) {
      this.handleValidationFailure();
    }

    this.logConfigurationSummary();
  }

  /**
   * Load configuration from environment variables with defaults
   */
  private loadConfiguration(): AppConfig {
    // Load environment variables
    require('dotenv').config();

    return {
      server: {
        port: parseInt(process.env.PORT || '3000'),
        host: process.env.HOST || '0.0.0.0',
        environment: (process.env.NODE_ENV as any) || 'development',
        apiVersion: process.env.API_VERSION || 'v1',
        corsOrigins: this.parseArray(process.env.CORS_ORIGINS, [
          'http://localhost:3000',
          'http://localhost:5173',
          'https://anlaklab.com',
        ]),
        requestTimeout: parseInt(process.env.REQUEST_TIMEOUT || '30000'),
        bodyParserLimit: process.env.BODY_PARSER_LIMIT || '500mb',
      },

      firebase: {
        projectId: process.env.FIREBASE_PROJECT_ID || '',
        privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET || '',
        databaseUrl: process.env.FIREBASE_DATABASE_URL,
        enabled: !!(process.env.FIREBASE_PROJECT_ID && 
                   process.env.FIREBASE_PRIVATE_KEY && 
                   process.env.FIREBASE_CLIENT_EMAIL && 
                   process.env.FIREBASE_STORAGE_BUCKET),
      },

      openai: {
        apiKey: process.env.OPENAI_API_KEY || '',
        model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
        maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '2000'),
        temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.7'),
        enabled: !!process.env.OPENAI_API_KEY,
      },

      aspose: {
        licenseFilePath: process.env.ASPOSE_LICENSE_PATH || '/app/lib/Aspose.Slides.lic',
        tempDirectory: process.env.ASPOSE_TEMP_DIR || '/tmp/aspose',
        maxFileSize: this.parseFileSize(process.env.ASPOSE_MAX_FILE_SIZE || '500MB'),
        javaHeapSize: process.env.JAVA_HEAP_SIZE || '2g',
        enabled: true, // Always enabled for core functionality
      },

      upload: {
        maxFileSize: this.parseFileSize(process.env.UPLOAD_MAX_FILE_SIZE || '500MB'),
        allowedMimeTypes: this.parseArray(process.env.UPLOAD_ALLOWED_TYPES, [
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'application/vnd.ms-powerpoint',
        ]),
        uploadDirectory: process.env.UPLOAD_DIR || '/tmp/uploads',
        tempDirectory: process.env.TEMP_DIR || '/tmp',
        cleanupInterval: parseInt(process.env.CLEANUP_INTERVAL || '3600000'), // 1 hour
      },

      security: {
        enableHelmet: process.env.ENABLE_HELMET !== 'false',
        enableCors: process.env.ENABLE_CORS !== 'false',
        enableRateLimit: process.env.ENABLE_RATE_LIMIT === 'true',
        rateLimit: {
          windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '900000'), // 15 minutes
          maxRequests: parseInt(process.env.RATE_LIMIT_MAX || '100'),
        },
        jwtSecret: process.env.JWT_SECRET,
        encryptionKey: process.env.ENCRYPTION_KEY,
      },

      logging: {
        level: (process.env.LOG_LEVEL as any) || 'info',
        enableConsole: process.env.LOG_CONSOLE !== 'false',
        enableFile: process.env.LOG_FILE === 'true',
        logDirectory: process.env.LOG_DIR || '/tmp/logs',
        maxFileSize: process.env.LOG_MAX_SIZE || '10m',
        maxFiles: parseInt(process.env.LOG_MAX_FILES || '5'),
      },

      performance: {
        enableCompression: process.env.ENABLE_COMPRESSION !== 'false',
        enableCache: process.env.ENABLE_CACHE === 'true',
        cacheDirectory: process.env.CACHE_DIR || '/tmp/cache',
        cacheTTL: parseInt(process.env.CACHE_TTL || '3600'), // 1 hour
        maxConcurrentJobs: parseInt(process.env.MAX_CONCURRENT_JOBS || '5'),
      },

      features: {
        enableThumbnails: process.env.ENABLE_THUMBNAILS !== 'false',
        enableAI: process.env.ENABLE_AI !== 'false',
        enableBatchOperations: process.env.ENABLE_BATCH_OPS !== 'false',
        enableVersioning: process.env.ENABLE_VERSIONING === 'true',
        enableAnalytics: process.env.ENABLE_ANALYTICS === 'true',
        enableDynamicExtensions: process.env.ENABLE_DYNAMIC_EXTENSIONS === 'true',
      },
    };
  }

  /**
   * Validate configuration and check dependencies
   */
  private validateConfiguration(): ConfigValidationResult {
    const errors: ConfigValidationError[] = [];
    const warnings: ConfigValidationWarning[] = [];

    // Validate server configuration
    if (this.config.server.port < 1 || this.config.server.port > 65535) {
      errors.push({
        field: 'server.port',
        message: 'Port must be between 1 and 65535',
        severity: 'error',
        suggestion: 'Set PORT environment variable to a valid port number',
      });
    }

    if (!['development', 'production', 'test'].includes(this.config.server.environment)) {
      errors.push({
        field: 'server.environment',
        message: 'Invalid environment value',
        severity: 'error',
        suggestion: 'Set NODE_ENV to development, production, or test',
      });
    }

    // Validate Firebase configuration if enabled
    if (this.config.features.enableAI || this.config.features.enableAnalytics) {
      if (!this.config.firebase.enabled) {
        errors.push({
          field: 'firebase',
          message: 'Firebase configuration required for AI and Analytics features',
          severity: 'error',
          suggestion: 'Set FIREBASE_* environment variables or disable AI features',
        });
      } else {
        if (!this.config.firebase.projectId) {
          errors.push({
            field: 'firebase.projectId',
            message: 'Firebase project ID is required',
            severity: 'error',
            suggestion: 'Set FIREBASE_PROJECT_ID environment variable',
          });
        }

        if (!this.config.firebase.privateKey || this.config.firebase.privateKey.length < 50) {
          errors.push({
            field: 'firebase.privateKey',
            message: 'Firebase private key is invalid or missing',
            severity: 'error',
            suggestion: 'Set FIREBASE_PRIVATE_KEY environment variable with valid private key',
          });
        }

        if (!this.config.firebase.clientEmail || !this.config.firebase.clientEmail.includes('@')) {
          errors.push({
            field: 'firebase.clientEmail',
            message: 'Firebase client email is invalid',
            severity: 'error',
            suggestion: 'Set FIREBASE_CLIENT_EMAIL environment variable with valid email',
          });
        }
      }
    }

    // Validate OpenAI configuration if AI is enabled
    if (this.config.features.enableAI) {
      if (!this.config.openai.enabled) {
        warnings.push({
          field: 'openai',
          message: 'OpenAI configuration missing - AI features will be disabled',
          recommendation: 'Set OPENAI_API_KEY environment variable to enable AI features',
        });
      } else {
        if (!this.config.openai.apiKey.startsWith('sk-')) {
          errors.push({
            field: 'openai.apiKey',
            message: 'OpenAI API key format is invalid',
            severity: 'error',
            suggestion: 'Set OPENAI_API_KEY with a valid API key starting with sk-',
          });
        }
      }
    }

    // Validate Aspose.Slides configuration
    if (!fs.existsSync(this.config.aspose.licenseFilePath)) {
      warnings.push({
        field: 'aspose.licenseFilePath',
        message: 'Aspose.Slides license file not found',
        recommendation: 'Place license file at the specified path for full functionality',
      });
    }

    // Validate directories exist and are writable
    const directoriesToCheck = [
      { path: this.config.upload.uploadDirectory, name: 'upload.uploadDirectory' },
      { path: this.config.upload.tempDirectory, name: 'upload.tempDirectory' },
      { path: this.config.aspose.tempDirectory, name: 'aspose.tempDirectory' },
      { path: this.config.logging.logDirectory, name: 'logging.logDirectory' },
    ];

    for (const dir of directoriesToCheck) {
      try {
        if (!fs.existsSync(dir.path)) {
          fs.mkdirSync(dir.path, { recursive: true });
        }
        // Test write access
        const testFile = path.join(dir.path, '.write-test');
        fs.writeFileSync(testFile, 'test');
        fs.unlinkSync(testFile);
      } catch (error) {
        errors.push({
          field: dir.name,
          message: `Directory ${dir.path} is not accessible or writable`,
          severity: 'error',
          suggestion: `Ensure ${dir.path} exists and is writable by the application`,
        });
      }
    }

    // Validate file size limits
    if (this.config.upload.maxFileSize > 2 * 1024 * 1024 * 1024) { // 2GB
      warnings.push({
        field: 'upload.maxFileSize',
        message: 'Very large file size limit may impact performance',
        recommendation: 'Consider reducing max file size for better performance',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Handle configuration validation failure
   */
  private handleValidationFailure(): void {
    logger.error('Configuration validation failed', {
      errors: this.validationResult.errors,
      warnings: this.validationResult.warnings,
    });

    console.error('\n🚨 CONFIGURATION VALIDATION FAILED 🚨\n');
    
    this.validationResult.errors.forEach(error => {
      console.error(`❌ ${error.field}: ${error.message}`);
      if (error.suggestion) {
        console.error(`   💡 ${error.suggestion}`);
      }
    });

    if (this.validationResult.warnings.length > 0) {
      console.warn('\n⚠️  Configuration Warnings:');
      this.validationResult.warnings.forEach(warning => {
        console.warn(`⚠️  ${warning.field}: ${warning.message}`);
        console.warn(`   💡 ${warning.recommendation}`);
      });
    }

    console.error('\nApplication startup aborted due to configuration errors.\n');
    process.exit(1);
  }

  /**
   * Log configuration summary
   */
  private logConfigurationSummary(): void {
    logger.info('Configuration loaded successfully', {
      environment: this.config.server.environment,
      port: this.config.server.port,
      features: {
        firebase: this.config.firebase.enabled,
        openai: this.config.openai.enabled,
        thumbnails: this.config.features.enableThumbnails,
        ai: this.config.features.enableAI,
        analytics: this.config.features.enableAnalytics,
      },
      warnings: this.validationResult.warnings.length,
    });

    if (this.validationResult.warnings.length > 0) {
      logger.warn('Configuration warnings detected', {
        count: this.validationResult.warnings.length,
        warnings: this.validationResult.warnings.map(w => w.field),
      });
    }
  }

  /**
   * Parse array from environment variable
   */
  private parseArray(value: string | undefined, defaultValue: string[]): string[] {
    if (!value) return defaultValue;
    return value.split(',').map(item => item.trim()).filter(Boolean);
  }

  /**
   * Parse file size from string (e.g., "500MB", "2GB")
   */
  private parseFileSize(value: string): number {
    const match = value.match(/^(\d+)([KMGT]?B?)$/i);
    if (!match) return 50 * 1024 * 1024; // Default 50MB

    const size = parseInt(match[1]);
    const unit = match[2].toUpperCase();

    switch (unit) {
      case 'B': return size;
      case 'KB': return size * 1024;
      case 'MB': return size * 1024 * 1024;
      case 'GB': return size * 1024 * 1024 * 1024;
      case 'TB': return size * 1024 * 1024 * 1024 * 1024;
      default: return size * 1024 * 1024; // Default to MB
    }
  }

  /**
   * Get configuration
   */
  public getConfig(): AppConfig {
    return this.config;
  }

  /**
   * Get validation result
   */
  public getValidationResult(): ConfigValidationResult {
    return this.validationResult;
  }

  /**
   * Update configuration at runtime
   */
  public updateConfig(updates: Partial<AppConfig>): void {
    this.config = { ...this.config, ...updates };
    this.validationResult = this.validateConfiguration();
    
    if (!this.validationResult.isValid) {
      logger.error('Configuration update validation failed', {
        errors: this.validationResult.errors,
      });
      throw new Error('Configuration update failed validation');
    }

    logger.info('Configuration updated successfully', { updates });
  }

  /**
   * Get configuration for specific service
   */
  public getServiceConfig<K extends keyof AppConfig>(service: K): AppConfig[K] {
    return this.config[service];
  }

  /**
   * Check if feature is enabled
   */
  public isFeatureEnabled(feature: keyof AppConfig['features']): boolean {
    return this.config.features[feature];
  }

  /**
   * Get environment-specific configuration
   */
  public getEnvironmentConfig(): {
    isDevelopment: boolean;
    isProduction: boolean;
    isTest: boolean;
  } {
    return {
      isDevelopment: this.config.server.environment === 'development',
      isProduction: this.config.server.environment === 'production',
      isTest: this.config.server.environment === 'test',
    };
  }

  /**
   * Generate configuration report
   */
  public generateConfigReport(): {
    summary: Record<string, any>;
    validation: ConfigValidationResult;
    recommendations: string[];
  } {
    const summary = {
      server: {
        environment: this.config.server.environment,
        port: this.config.server.port,
        host: this.config.server.host,
      },
      services: {
        firebase: this.config.firebase.enabled,
        openai: this.config.openai.enabled,
        aspose: this.config.aspose.enabled,
      },
      features: this.config.features,
      security: {
        helmet: this.config.security.enableHelmet,
        cors: this.config.security.enableCors,
        rateLimit: this.config.security.enableRateLimit,
      },
    };

    const recommendations = [
      ...this.validationResult.warnings.map(w => w.recommendation),
      ...(this.config.server.environment === 'development' ? [
        'Enable rate limiting for production',
        'Set up proper logging directory for production',
        'Configure JWT secret for authentication',
      ] : []),
    ];

    return {
      summary,
      validation: this.validationResult,
      recommendations: [...new Set(recommendations)],
    };
  }
}

// Export singleton instance
export const config = new EnvironmentConfigManager();
export default config; 