/**
 * Logger Utility - Winston-based logging system
 * 
 * Provides structured logging for the Luna server
 */

import winston from 'winston';
import path from 'path';

export interface LogContext {
  requestId?: string;
  userId?: string;
  action?: string;
  resource?: string;
  [key: string]: any;
}

class Logger {
  private winston: winston.Logger;

  constructor() {
    this.winston = this.createLogger();
  }

  private createLogger(): winston.Logger {
    const isProduction = process.env.NODE_ENV === 'production';
    const logLevel = process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug');
    const logDir = process.env.LOG_FILE_PATH ? path.dirname(process.env.LOG_FILE_PATH) : './logs';

    // Custom format for structured logging
    const customFormat = winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json(),
      winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
        const logObject = {
          timestamp,
          level,
          message,
          ...(stack && { stack }),
          ...meta,
        };
        return JSON.stringify(logObject);
      })
    );

    // Console format for development
    const consoleFormat = winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
        return `${timestamp} [${level}]: ${message}${metaStr}`;
      })
    );

    const transports: winston.transport[] = [
      // Console transport
      new winston.transports.Console({
        format: isProduction ? customFormat : consoleFormat,
      }),
    ];

    // File transports for production
    if (isProduction && process.env.LOG_FILE_PATH) {
      transports.push(
        // All logs
        new winston.transports.File({
          filename: process.env.LOG_FILE_PATH,
          format: customFormat,
          maxsize: parseInt(process.env.LOG_MAX_SIZE || '10485760'), // 10MB
          maxFiles: parseInt(process.env.LOG_MAX_FILES || '5'),
        }),
        // Error logs only
        new winston.transports.File({
          filename: path.join(logDir, 'error.log'),
          level: 'error',
          format: customFormat,
          maxsize: parseInt(process.env.LOG_MAX_SIZE || '10485760'), // 10MB
          maxFiles: parseInt(process.env.LOG_MAX_FILES || '5'),
        })
      );
    }

    return winston.createLogger({
      level: logLevel,
      format: customFormat,
      transports,
      exitOnError: false,
    });
  }

  /**
   * Log debug message
   */
  debug(message: string, context?: LogContext): void {
    this.winston.debug(message, context);
  }

  /**
   * Log info message
   */
  info(message: string, context?: LogContext): void {
    this.winston.info(message, context);
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: LogContext): void {
    this.winston.warn(message, context);
  }

  /**
   * Log error message
   */
  error(message: string, context?: LogContext | Error): void {
    if (context instanceof Error) {
      this.winston.error(message, {
        error: {
          name: context.name,
          message: context.message,
          stack: context.stack,
        },
      });
    } else {
      this.winston.error(message, context);
    }
  }

  /**
   * Log HTTP request
   */
  http(message: string, context: LogContext & {
    method?: string;
    url?: string;
    statusCode?: number;
    responseTime?: number;
    userAgent?: string;
    ip?: string;
  }): void {
    this.winston.info(message, {
      type: 'http_request',
      ...context,
    });
  }

  /**
   * Log security event
   */
  security(message: string, context: LogContext & {
    event: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    ip?: string;
    userAgent?: string;
  }): void {
    this.winston.warn(message, {
      type: 'security_event',
      ...context,
    });
  }

  /**
   * Log performance metric
   */
  performance(message: string, context: LogContext & {
    metric: string;
    value: number;
    unit: string;
    threshold?: number;
  }): void {
    this.winston.info(message, {
      type: 'performance_metric',
      ...context,
    });
  }

  /**
   * Log business event
   */
  business(message: string, context: LogContext & {
    event: string;
    entity?: string;
    entityId?: string;
  }): void {
    this.winston.info(message, {
      type: 'business_event',
      ...context,
    });
  }

  /**
   * Create child logger with default context
   */
  child(defaultContext: LogContext): Logger {
    const childLogger = new Logger();
    
    // Override methods to include default context
    const originalMethods = ['debug', 'info', 'warn', 'error'] as const;
    
    originalMethods.forEach(method => {
      const original = childLogger[method].bind(childLogger);
      childLogger[method] = (message: string, context?: LogContext | Error) => {
        if (context instanceof Error) {
          original(message, context);
        } else {
          original(message, { ...defaultContext, ...context });
        }
      };
    });

    return childLogger;
  }

  /**
   * Get the underlying Winston logger instance
   */
  getWinstonLogger(): winston.Logger {
    return this.winston;
  }
}

// Create and export singleton instance
export const logger = new Logger();

// Export Logger class for creating child loggers
export { Logger };

export default logger; 