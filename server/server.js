/**
 * Luna Server - Clean Architecture
 * 
 * Main Express application with modular configuration
 */

const express = require('express');
const path = require('path');
const fs = require('fs');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Import configurations
const { initializeFirebase } = require('./config/firebase');
const schemaValidator = require('./universal-schema-validator');

// Import middlewares
const corsMiddleware = require('./app/middlewares/cors');
const { errorHandler, notFound } = require('./app/middlewares/errorHandler');

// Import routes
const healthRoutes = require('./app/routes/health.routes');
const presentationsRoutes = require('./app/routes/presentations.routes');
const aiRoutes = require('./app/routes/ai.routes');
const validationRoutes = require('./app/routes/validation.routes');
const docsRoutes = require('./app/routes/docs.routes');
const sessionsRoutes = require('./app/routes/sessions.routes');
const uploadRoutes = require('./app/routes/upload.routes');
const thumbnailsRoutes = require('./app/routes/thumbnails.routes');
const batchRoutes = require('./app/routes/batch.routes');
const conversionRoutes = require('./app/routes/conversion.routes');

// Create Express app
const app = express();

// =============================================================================
// DIRECTORY SETUP
// =============================================================================

// Create temp directory for uploads if it doesn't exist
const tempDir = path.join(__dirname, 'temp');
const uploadsDir = path.join(tempDir, 'uploads');

try {
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
    console.log('📁 Created temp directory');
  }
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('📁 Created uploads directory');
  }
} catch (error) {
  console.warn('⚠️ Could not create temp directories:', error.message);
}

// =============================================================================
// MIDDLEWARE CONFIGURATION
// =============================================================================

// CORS
app.use(corsMiddleware);

// Body parsing with premium tier support
app.use(express.json({ limit: '2gb' })); // Support Enterprise tier
app.use(express.urlencoded({ extended: true, limit: '2gb' }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  req.requestId = requestId;
  req.startTime = start;
  
  // Log request
  console.log(`📝 ${req.method} ${req.path} - ${requestId}`);
  
  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const statusEmoji = status >= 500 ? '❌' : status >= 400 ? '⚠️' : '✅';
    
    console.log(`${statusEmoji} ${req.method} ${req.path} - ${status} - ${duration}ms - ${requestId}`);
  });
  
  next();
});

// =============================================================================
// INITIALIZATION
// =============================================================================

console.log('🔧 Environment loaded from:', path.join(__dirname, '../.env'));
console.log('🔥 Firebase Project ID:', process.env.FIREBASE_PROJECT_ID ? 'Found' : 'Missing');

// Initialize Firebase and SessionService
initializeFirebase().then(success => {
  if (success) {
    console.log('✅ Server initialization complete. Firebase and SessionService are ready.');
  } else {
    console.log('⚠️ Server initialization failed. Firebase or SessionService might not be available.');
  }
});

// Initialize Universal Schema Validator
console.log('📋 Loading Universal PowerPoint Schema...');
const schemaInfo = schemaValidator.getSchemaInfo();
console.log(`📊 Schema contains ${schemaInfo.definitionCount} definitions`);

// =============================================================================
// ROUTES CONFIGURATION
// =============================================================================

const API_BASE = '/api/v1';

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Luna Server - Clean Architecture',
    version: '1.0.0',
    status: 'running',
    architecture: 'Clean/Screaming Architecture',
    description: 'Professional PowerPoint processing API with AI capabilities',
    endpoints: {
      // 📖 Documentation
      docs: `${API_BASE}/docs`,
      swagger: `${API_BASE}/swagger.json`,
      docsInfo: `${API_BASE}/docs/info`,
      // 🏥 Core endpoints
      health: `${API_BASE}/health`,
      presentations: `${API_BASE}/presentations`,
      aiGenerate: `${API_BASE}/ai/generate-presentation`,
      validateSchema: `${API_BASE}/validate-schema`,
      validateAndFix: `${API_BASE}/validate-and-fix`,
      schemaInfo: `${API_BASE}/schema-info`,
      // 💬 Session management
      sessions: `${API_BASE}/sessions`,
      // 📁 File uploads
      uploadPPTX: `${API_BASE}/upload/pptx`,
      uploadJSON: `${API_BASE}/upload/json`,
      // 🔄 Complete conversion pipeline (ALL-IN-ONE)
      convertAndSave: `${API_BASE}/convert-and-save`,
      conversionStatus: `${API_BASE}/convert-status/{id}`,
      // 🖼️ Thumbnails
      generateThumbnails: `${API_BASE}/presentations/{id}/generate-thumbnails`,
      batchThumbnails: `${API_BASE}/thumbnails/batch-generate`,
      // 🔄 Batch operations
      batchDelete: `${API_BASE}/batch/presentations/delete`,
      batchUpdate: `${API_BASE}/batch/presentations/update`,
      batchExport: `${API_BASE}/batch/export`,
      batchArchive: `${API_BASE}/batch/sessions/archive`,
    },
    features: {
      firebase: process.env.FIREBASE_PROJECT_ID ? 'configured' : 'not_configured',
      universalSchemaValidation: 'enabled',
      aiGeneration: 'enabled',
      autoFix: 'enabled',
      sessionManagement: 'enabled',
      persistentChat: 'enabled',
      fileUpload: 'enabled',
      completeConversionPipeline: 'enabled',
      thumbnailGeneration: 'enabled',
      batchOperations: 'enabled',
      swaggerDocs: 'enabled',
      cleanArchitecture: 'enabled'
    },
    workflows: {
      simpleUpload: {
        description: 'Basic file upload and conversion',
        endpoint: `${API_BASE}/upload/pptx`,
        steps: ['upload', 'convert']
      },
      completeConversion: {
        description: 'Complete workflow: upload → convert → validate → save → thumbnails → session link',
        endpoint: `${API_BASE}/convert/upload`,
        steps: ['upload', 'convert', 'validate', 'auto-fix', 'save-firebase', 'generate-thumbnails', 'link-session'],
        recommended: true
      },
      batchConversion: {
        description: 'Convert multiple files at once',
        endpoint: `${API_BASE}/convert/batch`,
        steps: ['multi-upload', 'batch-convert', 'batch-save']
      }
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.requestId,
    },
  });
});

// Mount API routes
app.use(API_BASE, healthRoutes);
app.use(API_BASE, presentationsRoutes);
app.use(API_BASE, aiRoutes);
app.use(API_BASE, validationRoutes);
app.use(API_BASE, docsRoutes);
app.use(API_BASE, sessionsRoutes);
app.use(API_BASE, uploadRoutes);
app.use(API_BASE, thumbnailsRoutes);
app.use(API_BASE, batchRoutes);
app.use(API_BASE, conversionRoutes);

// =============================================================================
// ERROR HANDLING
// =============================================================================

// 404 handler
app.use(notFound);

// Global error handler
app.use(errorHandler);

// =============================================================================
// GRACEFUL SHUTDOWN
// =============================================================================

const gracefulShutdown = () => {
  console.log('🔄 Shutting down gracefully...');
  process.exit(0);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

module.exports = app; 