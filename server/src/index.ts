/**
 * Luna Server - Main Express Application
 * 
 * Professional Node.js backend for PowerPoint processing
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { logger } from './utils/logger';
import apiRoutes from './routes/index';
import { errorHandler, notFoundHandler, setupGlobalErrorHandlers } from './middleware/error.middleware';

// Environment configuration
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const API_VERSION = process.env.API_VERSION || 'v1';

// Create Express app
const app = express();

// =============================================================================
// GLOBAL ERROR HANDLERS SETUP
// =============================================================================

// Setup global error handlers for unhandled rejections and exceptions
setupGlobalErrorHandlers();

// =============================================================================
// MIDDLEWARE CONFIGURATION
// =============================================================================

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Allow Swagger UI
}));

// CORS configuration - Allow localhost and anlaklab.com domains
const corsOptions = {
  origin: (origin: string | undefined, callback: (error: Error | null, success?: boolean) => void) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    // Allow custom CORS origins from environment variable
    const customOrigins = process.env.CORS_ORIGIN?.split(',') || [];
    if (customOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Allow any localhost port (http://localhost:XXXX)
    if (origin.match(/^https?:\/\/localhost(:\d+)?$/)) {
      return callback(null, true);
    }
    
    // Allow any anlaklab.com subdomain (https://anything.anlaklab.com or http://anlaklab.com)
    if (origin.match(/^https?:\/\/([a-zA-Z0-9-]+\.)?anlaklab\.com$/)) {
      return callback(null, true);
    }
    
    // Allow any IP address on local network (192.168.x.x, 127.x.x.x, 10.x.x.x)
    if (origin.match(/^https?:\/\/(127\.|10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.)[\d.]+/)) {
      return callback(null, true);
    }
    
    // Log rejected origins for debugging
    logger.warn('CORS blocked origin', { origin });
    callback(new Error('CORS policy violation'), false);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-ID'],
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// Compression
app.use(compression());

// Body parsing
app.use(express.json({ 
  limit: process.env.BODY_PARSER_LIMIT || '50mb' 
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: process.env.BODY_PARSER_LIMIT || '50mb' 
}));

// Request logging middleware
app.use((req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const processingTime = Date.now() - startTime;
    
    logger.http('HTTP Request', {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      responseTime: processingTime,
      userAgent: req.get('User-Agent') || '',
      ip: req.ip || '',
      contentLength: res.get('content-length') || '',
      requestId: req.get('X-Request-ID') || '',
    });
  });
  
  next();
});

// =============================================================================
// ROUTES CONFIGURATION
// =============================================================================

const API_BASE = `/api/${API_VERSION}`;

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Luna Server',
    version: '1.0.0',
    description: 'Professional PowerPoint processing API with AI capabilities',
    status: 'running',
    endpoints: {
      health: `${API_BASE}/health`,
      documentation: `${API_BASE}/docs`,
      pptx2json: `${API_BASE}/pptx2json`,
      json2pptx: `${API_BASE}/json2pptx`,
      convertformat: `${API_BASE}/convertformat`,
      thumbnails: `${API_BASE}/thumbnails`,
      aitranslate: `${API_BASE}/aitranslate`,
      analyze: `${API_BASE}/analyze`,
      'extract-assets': `${API_BASE}/extract-assets`,
      'extract-metadata': `${API_BASE}/extract-metadata`,
    },
    environment: NODE_ENV,
    timestamp: new Date().toISOString(),
    features: {
      firebase: !!process.env.FIREBASE_PROJECT_ID,
      openai: !!process.env.OPENAI_API_KEY,
      aspose: true,
    },
  });
});

// Mount API routes
app.use(API_BASE, apiRoutes);

// =============================================================================
// ERROR HANDLING
// =============================================================================

// 404 handler for all unmatched routes
app.use('*', notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

// =============================================================================
// SERVER STARTUP
// =============================================================================

// Graceful shutdown handler
const gracefulShutdown = (signal: string) => {
  logger.info(`Received ${signal}, shutting down gracefully...`);
  
  server.close(() => {
    logger.info('Server closed successfully');
    process.exit(0);
  });
  
  // Force close after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

// Start server
const server = app.listen(PORT, () => {
  logger.info('Luna Server started successfully', {
    port: PORT,
    environment: NODE_ENV,
    apiVersion: API_VERSION,
    endpoints: {
      health: `http://localhost:${PORT}${API_BASE}/health`,
      documentation: `http://localhost:${PORT}${API_BASE}/docs`,
      root: `http://localhost:${PORT}/`,
    },
    features: {
      firebase: !!process.env.FIREBASE_PROJECT_ID,
      openai: !!process.env.OPENAI_API_KEY,
      aspose: true,
    },
    notes: {
      ai_features: 'AI translation, analysis, and conversational chat endpoints are available with real OpenAI integrations',
      routes: 'All routes are organized with proper validation and error handling',
      middleware: 'Request validation, error handling, and logging middleware are active',
    },
  });
});

// Handle graceful shutdown
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default app; 