import { z } from "zod";
/**
 * Metrics Routes - Prometheus metrics endpoint
 * 
 * Provides metrics for Prometheus scraping
 */

import { Router } from 'express';
import { register, collectDefaultMetrics, Counter, Histogram, Gauge } from 'prom-client';
import { handleAsyncErrors } from '../middleware/error.middleware';
import { logger } from '../utils/logger';

const router = Router();

// Initialize default metrics collection
collectDefaultMetrics();

// Custom metrics for Luna Platform
const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
});

const asposeProcessingDuration = new Histogram({
  name: 'aspose_processing_duration_seconds',
  help: 'Duration of Aspose.Slides processing in seconds',
  labelNames: ['operation', 'status'],
  buckets: [1, 5, 10, 30, 60, 120, 300],
});

const asposeProcessingTotal = new Counter({
  name: 'aspose_processing_total',
  help: 'Total number of Aspose.Slides processing operations',
  labelNames: ['operation', 'status'],
});

const firebaseOperationDuration = new Histogram({
  name: 'firebase_operation_duration_seconds',
  help: 'Duration of Firebase operations in seconds',
  labelNames: ['operation', 'status'],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
});

const firebaseOperationTotal = new Counter({
  name: 'firebase_operation_total',
  help: 'Total number of Firebase operations',
  labelNames: ['operation', 'status'],
});

const openaiRequestDuration = new Histogram({
  name: 'openai_request_duration_seconds',
  help: 'Duration of OpenAI API requests in seconds',
  labelNames: ['operation', 'model', 'status'],
  buckets: [1, 5, 10, 30, 60, 120],
});

const openaiRequestTotal = new Counter({
  name: 'openai_request_total',
  help: 'Total number of OpenAI API requests',
  labelNames: ['operation', 'model', 'status'],
});

const openaiTokensUsed = new Counter({
  name: 'openai_tokens_used_total',
  help: 'Total number of OpenAI tokens used',
  labelNames: ['operation', 'model', 'type'],
});

const memoryUsage = new Gauge({
  name: 'nodejs_memory_usage_bytes',
  help: 'Node.js memory usage in bytes',
  labelNames: ['type'],
});

const activeConnections = new Gauge({
  name: 'active_connections',
  help: 'Number of active connections',
});

const jobsInQueue = new Gauge({
  name: 'jobs_in_queue',
  help: 'Number of jobs in processing queue',
  labelNames: ['type'],
});

// Update memory metrics periodically
setInterval(() => {
  const memUsage = process.memoryUsage();
  memoryUsage.set({ type: 'rss' }, memUsage.rss);
  memoryUsage.set({ type: 'heapUsed' }, memUsage.heapUsed);
  memoryUsage.set({ type: 'heapTotal' }, memUsage.heapTotal);
  memoryUsage.set({ type: 'external' }, memUsage.external);
}, 10000);

// Middleware to track HTTP requests
export const metricsMiddleware = async (req: any, res: any, next: any) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = async (Date.now() - start) / 1000;
    const route = req.route?.path || req.path;
    const method = req.method;
    const statusCode = res.statusCode.toString();
    
    httpRequestsTotal.inc({ method, route, status_code: statusCode });
    httpRequestDuration.observe({ method, route, status_code: statusCode }, duration);
  });
  
  next();
};

// Functions to update custom metrics
export const updateAsposeMetrics = async (operation: string, status: string, duration: number) => {
  asposeProcessingTotal.inc({ operation, status });
  asposeProcessingDuration.observe({ operation, status }, duration);
};

export const updateFirebaseMetrics = async (operation: string, status: string, duration: number) => {
  firebaseOperationTotal.inc({ operation, status });
  firebaseOperationDuration.observe({ operation, status }, duration);
};

export const updateOpenAIMetrics = async (operation: string, model: string, status: string, duration: number, tokens?: { prompt: number; completion: number }) => {
  openaiRequestTotal.inc({ operation, model, status });
  openaiRequestDuration.observe({ operation, model, status }, duration);
  
  if (tokens) {
    openaiTokensUsed.inc({ operation, model, type: 'prompt' }, tokens.prompt);
    openaiTokensUsed.inc({ operation, model, type: 'completion' }, tokens.completion);
  }
};

export const updateJobsInQueue = async (type: string, count: number) => {
  jobsInQueue.set({ type }, count);
};

export const updateActiveConnections = async (count: number) => {
  activeConnections.set(count);
};

/**
 * GET /api/v1/metrics
 * Prometheus metrics endpoint
 */
router.get('/', handleAsyncErrors(async (req, res) => {
  try {
    const metrics = await register.metrics();
    
    res.set('Content-Type', register.contentType);
    res.send(metrics);
    
    logger.debug('Metrics scraped successfully', {
      userAgent: req.get('User-Agent'),
      ip: req.ip,
    });
  } catch (error) {
    logger.error('Failed to generate metrics', { error });
    
    res.status(500).json({
      success: false,
      error: {
        type: 'server_error',
        code: 'METRICS_GENERATION_FAILED',
        message: 'Failed to generate metrics',
      },
    });
  }
}));

/**
 * GET /api/v1/metrics/health
 * Health check for metrics system
 */
router.get('/health', handleAsyncErrors(async (req, res) => {
  try {
    const metricsCount = async (await register.metrics()).split('\n').length;
    
    res.json({
      success: true,
      data: {
        status: 'healthy',
        metricsCount,
        contentType: register.contentType,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Metrics health check failed', { error });
    
    res.status(500).json({
      success: false,
      error: {
        type: 'server_error',
        code: 'METRICS_HEALTH_CHECK_FAILED',
        message: 'Metrics health check failed',
      },
    });
  }
}));

export default router; 