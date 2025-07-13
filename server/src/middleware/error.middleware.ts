import { z } from "zod";
/**
 * Error Handling Middleware - Centralized error management
 * 
 * Provides consistent error responses across all endpoints
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { ErrorResponse } from '../schemas/api-response.schema';

/**
 * Custom application error class
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly type: string;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    type: string = 'server_error',
    code: string = 'INTERNAL_ERROR',
    isOperational: boolean = true
  ) {
    super(message);
    
    this.statusCode = statusCode;
    this.type = type;
    this.code = code;
    this.isOperational = isOperational;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation error class
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: any[]) {
    super(message, 400, 'validation_error', 'VALIDATION_FAILED');
    this.name = 'ValidationError';
    
    if (details) {
      (this as any).details = details;
    }
  }
}

/**
 * File processing error class
 */
export class FileProcessingError extends AppError {
  constructor(message: string, code: string = 'FILE_PROCESSING_ERROR') {
    super(message, 422, 'processing_error', code);
    this.name = 'FileProcessingError';
  }
}

/**
 * Service unavailable error class
 */
export class ServiceUnavailableError extends AppError {
  constructor(message: string, service: string) {
    super(message, 503, 'service_error', 'SERVICE_UNAVAILABLE');
    this.name = 'ServiceUnavailableError';
    (this as any).service = service;
  }
}

/**
 * Not found error class
 */
export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, 'not_found_error', 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

/**
 * Rate limit error class
 */
export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(message, 429, 'rate_limit_error', 'RATE_LIMIT_EXCEEDED');
    this.name = 'RateLimitError';
  }
}

/**
 * Main error handling middleware
 */
export function errorHandler async (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const requestId = req.requestId || `req_${Date.now()}`;
  const timestamp = new Date().toISOString();

  // Log the error
  logger.error('Application error occurred', {
    requestId,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    request: {
      method: req.method,
      url: req.originalUrl,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
    },
  });

  // Handle different types of errors
  if (error instanceof AppError) {
    const errorResponse: ErrorResponse = {
      success: false,
      error: {
        type: error.type as any,
        code: error.code,
        message: error.message,
        ...(error as any).details && { details: (error as any).details },
      },
      meta: {
        timestamp,
        requestId,
        error: {
          type: error.type,
          code: error.code,
          message: error.message,
          ...(error as any).details && { details: (error as any).details },
        },
      },
    };

    res.status(error.statusCode).json(errorResponse);
    return;
  }

  // Handle Multer file upload errors
  if (error.name === 'MulterError') {
    const multerError = error as any;
    let message = 'File upload error';
    let code = 'FILE_UPLOAD_ERROR';

    switch (multerError.code) {
      case 'LIMIT_FILE_SIZE':
        message = 'File too large';
        code = 'FILE_TOO_LARGE';
        break;
      case 'LIMIT_FILE_COUNT':
        message = 'Too many files';
        code = 'TOO_MANY_FILES';
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        message = 'Unexpected file field';
        code = 'UNEXPECTED_FILE';
        break;
      default:
        message = multerError.message || message;
    }

    const errorResponse: ErrorResponse = {
      success: false,
      error: {
        type: 'file_error',
        code,
        message,
      },
      meta: {
        timestamp,
        requestId,
        error: {
          type: 'file_error',
          code,
          message,
        },
      },
    };

    res.status(400).json(errorResponse);
    return;
  }

  // Handle JSON parsing errors
  if (error instanceof SyntaxError && 'body' in error) {
    const errorResponse: ErrorResponse = {
      success: false,
      error: {
        type: 'validation_error',
        code: 'INVALID_JSON',
        message: 'Invalid JSON in request body',
      },
      meta: {
        timestamp,
        requestId,
        error: {
          type: 'validation_error',
          code: 'INVALID_JSON',
          message: 'Invalid JSON in request body',
        },
      },
    };

    res.status(400).json(errorResponse);
    return;
  }

  // Handle generic errors
  const errorResponse: ErrorResponse = {
    success: false,
    error: {
      type: 'server_error',
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production' 
        ? 'Internal server error' 
        : error.message,
    },
    meta: {
      timestamp,
      requestId,
      error: {
        type: 'server_error',
        code: 'INTERNAL_ERROR',
        message: process.env.NODE_ENV === 'production' 
          ? 'Internal server error' 
          : error.message,
      },
    },
  };

  res.status(500).json(errorResponse);
}

/**
 * 404 Not Found handler
 */
export function notFoundHandler async (req: Request, res: Response, next: NextFunction): void {
  const requestId = req.requestId || `req_${Date.now()}`;
  
  logger.warn('Route not found', {
    requestId,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
  });

  const errorResponse: ErrorResponse = {
    success: false,
    error: {
      type: 'server_error',
      code: 'ROUTE_NOT_FOUND',
      message: `Route ${req.method} ${req.originalUrl} not found`,
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId,
      error: {
        type: 'server_error',
        code: 'ROUTE_NOT_FOUND',
        message: `Route ${req.method} ${req.originalUrl} not found`,
      },
    },
  };

  res.status(404).json(errorResponse);
}

/**
 * Async error wrapper - catches async errors and passes them to error middleware
 */
export function asyncHandler<T extends Request, U extends Response>(
  fn: (req: T, res: U, next: NextFunction) => Promise<any>
) {
  return (req: T, res: U, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Express error handler wrapper for promise rejections
 */
export function handleAsyncErrors async (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Request timeout handler
 */
export function timeoutHandler async (timeoutMs: number = 30000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const requestId = req.requestId || `req_${Date.now()}`;
    
    // Set timeout
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        logger.warn('Request timeout', {
          requestId,
          method: req.method,
          url: req.originalUrl,
          timeout: timeoutMs,
        });

        const errorResponse: ErrorResponse = {
          success: false,
          error: {
            type: 'server_error',
            code: 'REQUEST_TIMEOUT',
            message: `Request timeout after ${timeoutMs}ms`,
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId,
            error: {
              type: 'server_error',
              code: 'REQUEST_TIMEOUT',
              message: `Request timeout after ${timeoutMs}ms`,
            },
          },
        };

        res.status(408).json(errorResponse);
      }
    }, timeoutMs);

    // Clear timeout when response finishes
    res.on('finish', () => {
      clearTimeout(timeout);
    });

    res.on('close', () => {
      clearTimeout(timeout);
    });

    next();
  };
}

/**
 * Global unhandled rejection handler
 */
export function setupGlobalErrorHandlers async (): void {
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Promise Rejection', {
      reason,
      promise,
    });
    
    // Don't exit the process in production
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1);
    }
  });

  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception', {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
    });

    // Exit the process for uncaught exceptions
    process.exit(1);
  });
} 