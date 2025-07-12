/**
 * Luna Server - Main Express Application
 * 
 * Professional Node.js backend for PowerPoint processing
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import fs from 'fs';
import path from 'path';
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
    
    // Allow Docker internal networking (host.docker.internal, *.docker.internal)
    if (origin.includes('docker.internal')) {
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

// Body parsing with improved large file handling
app.use(express.json({ 
  limit: process.env.BODY_PARSER_LIMIT || '500mb',
  verify: (req: any, res, buf) => {
    try {
      // Add request size tracking for monitoring
      const contentLength = parseInt(req.headers['content-length'] || '0');
      if (contentLength > 0) {
        logger.debug('JSON body parsing', { 
          contentLength, 
          url: req.url,
          method: req.method 
        });
      }
    } catch (error) {
      logger.warn('Error during JSON body verification', { error });
    }
  }
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: process.env.BODY_PARSER_LIMIT || '500mb',
  verify: (req: any, res, buf) => {
    try {
      // Add request size tracking for monitoring  
      const contentLength = parseInt(req.headers['content-length'] || '0');
      if (contentLength > 0) {
        logger.debug('URL-encoded body parsing', { 
          contentLength, 
          url: req.url,
          method: req.method 
        });
      }
    } catch (error) {
      logger.warn('Error during URL-encoded body verification', { error });
    }
  }
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

// Mount API routes
app.use(API_BASE, apiRoutes);

// =============================================================================
// FRONTEND SERVING CONFIGURATION
// =============================================================================

// Serve static files from the React app build directory
const frontendDistPath = path.join(__dirname, '../../client/dist');
app.use(express.static(frontendDistPath));

// Handle React Router - serve index.html for all non-API routes
app.get('*', (req, res) => {
  // Only serve frontend for non-API routes
  if (!req.path.startsWith('/api/')) {
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  } else {
    // Let the API routes handle API requests
    res.status(404).json({
      success: false,
      error: {
        type: "server_error",
        code: "ROUTE_NOT_FOUND",
        message: `Route ${req.method} ${req.path} not found`
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.get('X-Request-ID') || `req_${Date.now()}`,
        error: {
          type: "server_error",
          code: "ROUTE_NOT_FOUND",
          message: `Route ${req.method} ${req.path} not found`
        }
      }
    });
  }
});

// =============================================================================
// ERROR HANDLING
// =============================================================================

// Global error handler (must be last)
app.use(errorHandler);

// =============================================================================
// SYSTEM VERIFICATION FUNCTIONS
// =============================================================================

/**
 * Verifies that all required directories exist and are accessible
 */
function verifySystemDirectories(): { success: boolean; errors: string[] } {
  const errors: string[] = [];
  
  const requiredDirs = [
    { 
      path: process.env.UPLOAD_TEMP_DIR || '/app/temp/uploads', 
      name: 'Upload Temp Directory',
      envVar: 'UPLOAD_TEMP_DIR'
    },
    { 
      path: process.env.ASPOSE_TEMP_DIR || '/app/temp/aspose', 
      name: 'Aspose Temp Directory',
      envVar: 'ASPOSE_TEMP_DIR'
    },
    { 
      path: process.env.PROCESSED_FILES_DIR || '/app/temp/processed', 
      name: 'Processed Files Directory',
      envVar: 'PROCESSED_FILES_DIR'
    },
  ];

  requiredDirs.forEach(({ path: dirPath, name, envVar }) => {
    try {
      // Create directory if it doesn't exist
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        logger.info(`Created missing directory: ${dirPath}`, { envVar, name });
      }
      
      // Verify directory is writable
      fs.accessSync(dirPath, fs.constants.F_OK | fs.constants.W_OK);
      logger.debug(`Directory verification passed: ${dirPath}`, { name });
    } catch (error) {
      const errorMsg = `${name} (${envVar}) not accessible: ${dirPath} - ${error}`;
      errors.push(errorMsg);
      logger.error(errorMsg, { envVar, path: dirPath, error });
    }
  });

  return { success: errors.length === 0, errors };
}

/**
 * Verifies critical dependencies and configurations
 */
function verifySystemDependencies(): { success: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Verify Aspose license path (if specified)
  const licensePath = process.env.ASPOSE_LICENSE_PATH;
  if (licensePath && licensePath !== '') {
    try {
      if (!fs.existsSync(licensePath)) {
        warnings.push(`Aspose license file not found: ${licensePath} - will use evaluation mode`);
        logger.warn('Aspose license file not found, using evaluation mode', { licensePath });
      } else {
        logger.info('Aspose license file found', { licensePath });
      }
    } catch (error) {
      warnings.push(`Cannot access Aspose license file: ${licensePath} - ${error}`);
    }
  }

  // Verify Java configuration for Aspose
  const javaHome = process.env.JAVA_HOME;
  if (javaHome) {
    try {
      const javaPath = path.join(javaHome, 'bin', 'java');
      if (!fs.existsSync(javaPath)) {
        errors.push(`Java executable not found at: ${javaPath} (JAVA_HOME: ${javaHome})`);
      } else {
        logger.info('Java executable found', { javaHome, javaPath });
      }
    } catch (error) {
      warnings.push(`Cannot verify Java installation: ${error}`);
    }
  }

  // Verify critical environment variables
  const criticalEnvVars = [
    'NODE_ENV',
    'PORT',
    'MAX_FILE_SIZE',
  ];

  criticalEnvVars.forEach(envVar => {
    if (!process.env[envVar]) {
      warnings.push(`Environment variable not set: ${envVar}`);
    }
  });

  // Verify file size limits are reasonable
  const maxFileSize = parseInt(process.env.MAX_FILE_SIZE || '0');
  if (maxFileSize > 1073741824) { // 1GB
    warnings.push(`MAX_FILE_SIZE is very large (${maxFileSize} bytes). Consider if this is intentional.`);
  }

  return { success: errors.length === 0, errors, warnings };
}

/**
 * Runs complete system verification before server startup
 */
function runStartupChecks(): boolean {
  logger.info('Running system verification checks...');

  // Check directories
  const dirCheck = verifySystemDirectories();
  if (!dirCheck.success) {
    logger.error('Critical directory verification failed', { errors: dirCheck.errors });
    dirCheck.errors.forEach(error => logger.error(error));
    return false;
  }

  // Check dependencies
  const depCheck = verifySystemDependencies();
  if (!depCheck.success) {
    logger.error('Critical dependency verification failed', { errors: depCheck.errors });
    depCheck.errors.forEach(error => logger.error(error));
    return false;
  }

  // Log warnings if any
  if (depCheck.warnings.length > 0) {
    logger.warn('System verification completed with warnings', { warnings: depCheck.warnings });
    depCheck.warnings.forEach(warning => logger.warn(warning));
  }

  logger.info('System verification completed successfully', {
    status: 'all_checks_passed',
    directories: 'verified',
    dependencies: 'verified',
    warnings: depCheck.warnings.length
  });

  return true;
}

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
  // Run startup checks before confirming server is ready
  const systemHealthy = runStartupChecks();
  
  if (!systemHealthy) {
    logger.error('System verification failed - server may not function correctly');
    // Note: We don't exit here to allow for manual debugging, but log clearly
  }

  logger.info('Luna Server started successfully', {
    port: PORT,
    environment: NODE_ENV,
    apiVersion: API_VERSION,
    systemHealthy,
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
    systemInfo: {
      uploadTempDir: process.env.UPLOAD_TEMP_DIR || '/app/temp/uploads',
      asposeTempDir: process.env.ASPOSE_TEMP_DIR || '/app/temp/aspose',
      maxFileSize: process.env.MAX_FILE_SIZE || '52428800',
      javaHome: process.env.JAVA_HOME || 'not_set',
      asposeLicense: process.env.ASPOSE_LICENSE_PATH ? 'configured' : 'evaluation_mode',
    },
    notes: {
      ai_features: 'AI translation, analysis, and conversational chat endpoints are available with real OpenAI integrations',
      routes: 'All routes are organized with proper validation and error handling',
      middleware: 'Request validation, error handling, and logging middleware are active',
      system_verification: systemHealthy ? 'All system checks passed' : 'Some system checks failed - check logs',
    },
  });
});

// Handle graceful shutdown
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default app; 