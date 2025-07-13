/**
 * Logs Routes - Handle frontend logs and forward to PLG stack
 * 
 * Receives structured logs from frontend and forwards them to Loki
 */

import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { logger } from '../utils/logger';
import { handleAsyncErrors } from '../middleware/error.middleware';

const router = Router();

// Validation middleware for log entries
const validateLogEntry = [
  body('logs').isArray({ min: 1 }).withMessage('Logs must be a non-empty array'),
  body('logs.*.level').isIn(['debug', 'info', 'warn', 'error']).withMessage('Invalid log level'),
  body('logs.*.message').isString().notEmpty().withMessage('Log message is required'),
  body('logs.*.timestamp').isISO8601().withMessage('Invalid timestamp format'),
  body('logs.*.service').equals('luna-client').withMessage('Invalid service name'),
  body('source').equals('frontend').withMessage('Invalid log source'),
  body('sessionId').isString().notEmpty().withMessage('Session ID is required'),
];

/**
 * POST /api/v1/logs
 * Receive frontend logs and forward to PLG stack
 */
router.post('/', validateLogEntry, handleAsyncErrors(async (req, res) => {
  // Check validation results
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: {
        type: 'validation_error',
        code: 'INVALID_LOG_DATA',
        message: 'Invalid log data format',
        details: errors.array(),
      },
    });
  }

  const { logs, source, sessionId } = req.body;

  try {
    // Process each log entry
    for (const logEntry of logs) {
      const {
        level,
        message,
        context,
        timestamp,
        service,
        environment,
        url,
        userAgent,
      } = logEntry;

      // Create enhanced context with frontend metadata
      const enhancedContext = {
        ...context,
        source: 'frontend',
        sessionId,
        originalTimestamp: timestamp,
        frontendUrl: url,
        frontendUserAgent: userAgent,
        frontendEnvironment: environment,
        requestId: req.get('X-Request-ID') || `req_${Date.now()}`,
      };

      // Forward to backend logger (which will send to Loki)
      switch (level) {
        case 'debug':
          logger.debug(`[FRONTEND] ${message}`, enhancedContext);
          break;
        case 'info':
          logger.info(`[FRONTEND] ${message}`, enhancedContext);
          break;
        case 'warn':
          logger.warn(`[FRONTEND] ${message}`, enhancedContext);
          break;
        case 'error':
          logger.error(`[FRONTEND] ${message}`, enhancedContext);
          break;
      }
    }

    // Log the successful processing
    logger.info('Frontend logs processed successfully', {
      logCount: logs.length,
      sessionId,
      source,
      requestId: req.get('X-Request-ID'),
    });

    res.json({
      success: true,
      data: {
        processed: logs.length,
        sessionId,
        timestamp: new Date().toISOString(),
      },
    });

  } catch (error) {
    logger.error('Failed to process frontend logs', {
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : error,
      logCount: logs.length,
      sessionId,
      source,
    });

    res.status(500).json({
      success: false,
      error: {
        type: 'server_error',
        code: 'LOG_PROCESSING_FAILED',
        message: 'Failed to process frontend logs',
      },
    });
  }
}));

/**
 * GET /api/v1/logs/status
 * Get logging system status
 */
router.get('/status', handleAsyncErrors(async (req, res) => {
  try {
    const lokiStatus = logger.isLokiTransportEnabled();
    const logLevel = process.env.LOG_LEVEL || 'info';
    
    res.json({
      success: true,
      data: {
        status: 'operational',
        logLevel,
        lokiEnabled: lokiStatus,
        lokiUrl: process.env.LOKI_URL || 'not_configured',
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Failed to get logging status', { error });
    
    res.status(500).json({
      success: false,
      error: {
        type: 'server_error',
        code: 'STATUS_CHECK_FAILED',
        message: 'Failed to check logging system status',
      },
    });
  }
}));

/**
 * POST /api/v1/logs/flush
 * Manually flush logs (for testing/debugging)
 */
router.post('/flush', handleAsyncErrors(async (req, res) => {
  try {
    await logger.flush();
    
    logger.info('Manual log flush completed', {
      requestId: req.get('X-Request-ID'),
    });

    res.json({
      success: true,
      data: {
        message: 'Logs flushed successfully',
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Failed to flush logs', { error });
    
    res.status(500).json({
      success: false,
      error: {
        type: 'server_error',
        code: 'FLUSH_FAILED',
        message: 'Failed to flush logs',
      },
    });
  }
}));

export default router; 