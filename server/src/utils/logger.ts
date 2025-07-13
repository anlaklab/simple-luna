/**
 * Enhanced Logger Utility - Winston-based logging system with Loki integration
 * 
 * Provides structured logging for the Luna server with PLG stack integration
 */

import winston from 'winston';
import LokiTransport from 'winston-loki';
import path from 'path';
import { promisify } from 'util';

export interface LogContext {
  requestId?: string;
  userId?: string;
  action?: string;
  resource?: string;
  correlationId?: string;
  traceId?: string;
  spanId?: string;
  [key: string]: any;
}

class Logger {
  private winston: winston.Logger;
  private isLokiEnabled: boolean;

  constructor() {
    this.isLokiEnabled = process.env.ENABLE_LOKI_LOGGING === 'true';
    this.winston = this.createLogger();
  }

  private createLogger(): winston.Logger {
    const isProduction = process.env.NODE_ENV === 'production';
    const logLevel = process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug');
    const logDir = process.env.LOG_FILE_PATH ? path.dirname(process.env.LOG_FILE_PATH) : './logs';

    // Enhanced format with correlation IDs for distributed tracing
    const customFormat = winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json(),
      winston.format.printf(({ timestamp, level, message, stack, requestId, correlationId, traceId, ...meta }) => {
        const logObject = {
          timestamp,
          level,
          message,
          service: 'luna-server',
          environment: process.env.NODE_ENV || 'development',
          ...(requestId && { requestId }),
          ...(correlationId && { correlationId }),
          ...(traceId && { traceId }),
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
      winston.format.printf(({ timestamp, level, message, requestId, correlationId, ...meta }) => {
        const contextStr = requestId ? `[${requestId}]` : '';
        const corrStr = correlationId ? `[${correlationId}]` : '';
        const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
        return `${timestamp} [${level}]${contextStr}${corrStr}: ${message}${metaStr}`;
      })
    );

    const transports: winston.transport[] = [
      // Console transport
      new winston.transports.Console({
        format: isProduction ? customFormat : consoleFormat,
      }),
    ];

    // File transports
    if (isProduction || process.env.LOG_FILE_PATH) {
      const logPath = process.env.LOG_FILE_PATH || path.join(logDir, 'app.log');
      
      transports.push(
        // All logs
        new winston.transports.File({
          filename: logPath,
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

    // Loki transport for log aggregation
    if (this.isLokiEnabled && process.env.LOKI_URL) {
      try {
        const lokiTransport = new LokiTransport({
          host: process.env.LOKI_URL,
          labels: {
            service: 'luna-server',
            environment: process.env.NODE_ENV || 'development',
            version: process.env.npm_package_version || '1.0.0',
            instance: process.env.HOSTNAME || 'unknown',
          },
          json: true,
          format: winston.format.json(),
          replaceTimestamp: true,
          onConnectionError: (err) => {
            console.error('Loki connection error:', err);
          },
        });

        transports.push(lokiTransport);
      } catch (error) {
        console.error('Failed to initialize Loki transport:', error);
      }
    }

    return winston.createLogger({
      level: logLevel,
      format: customFormat,
      transports,
      exitOnError: false,
      handleExceptions: true,
      handleRejections: true,
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
   * Log Aspose.Slides processing event
   */
  aspose(message: string, context: LogContext & {
    operation: string;
    slideCount?: number;
    processingTime?: number;
    fileSize?: number;
    error?: boolean;
  }): void {
    this.winston.info(message, {
      type: 'aspose_processing',
      component: 'aspose-slides',
      ...context,
    });
  }

  /**
   * Log Firebase/Firestore event
   */
  firebase(message: string, context: LogContext & {
    operation: string;
    collection?: string;
    documentId?: string;
    duration?: number;
    error?: boolean;
  }): void {
    this.winston.info(message, {
      type: 'firebase_operation',
      component: 'firebase',
      ...context,
    });
  }

  /**
   * Log OpenAI API event
   */
  openai(message: string, context: LogContext & {
    operation: string;
    model?: string;
    tokens?: number;
    duration?: number;
    error?: boolean;
  }): void {
    this.winston.info(message, {
      type: 'openai_operation',
      component: 'openai',
      ...context,
    });
  }

  /**
   * Create child logger with default context
   */
  child(defaultContext: LogContext): Logger {
    const childLogger = new Logger();
    
    // Override methods to include default context
    const originalMethods = ['debug', 'info', 'warn', 'error', 'http', 'security', 'performance', 'business', 'aspose', 'firebase', 'openai'] as const;
    
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
   * Create request-scoped logger
   */
  forRequest(requestId: string, additionalContext?: LogContext): Logger {
    return this.child({
      requestId,
      correlationId: requestId,
      ...additionalContext,
    });
  }

  /**
   * Create component-scoped logger
   */
  forComponent(component: string, additionalContext?: LogContext): Logger {
    return this.child({
      component,
      ...additionalContext,
    });
  }

  /**
   * Flush all logs (useful for graceful shutdown)
   */
  async flush(): Promise<void> {
    const flushPromises = this.winston.transports.map(transport => {
      if (transport.close) {
        return promisify(transport.close.bind(transport))();
      }
      return Promise.resolve();
    });

    await Promise.all(flushPromises);
  }

  /**
   * Get the underlying Winston logger instance
   */
  getWinstonLogger(): winston.Logger {
    return this.winston;
  }

  /**
   * Get Loki status
   */
  isLokiTransportEnabled(): boolean {
    return this.isLokiEnabled;
  }
}

// Create and export singleton instance
export const logger = new Logger();

// Export Logger class for creating child loggers
export { Logger };

export default logger; 