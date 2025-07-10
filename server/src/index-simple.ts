/**
 * Luna Server - Simplified Version for Testing
 * 
 * Basic Express server to test functionality
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import multer from 'multer';

// Environment configuration
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const API_VERSION = process.env.API_VERSION || 'v1';

// Create Express app
const app = express();

// =============================================================================
// MIDDLEWARE CONFIGURATION
// =============================================================================

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Allow Swagger UI
}));

// CORS configuration
const corsOptions = {
  origin: ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// Compression
app.use(compression());

// Body parsing
app.use(express.json({ 
  limit: '50mb' 
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: '50mb' 
}));

// Multer configuration for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
  fileFilter: (req: any, file: any, cb: any) => {
    const allowedMimeTypes = [
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.slideshow',
    ];
    
    if (allowedMimeTypes.includes(file.mimetype)) {
      return cb(null, true);
    } else {
      return cb(new Error(`Invalid file type. Allowed types: ${allowedMimeTypes.join(', ')}`));
    }
  },
});

// Request logging middleware
app.use((req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const processingTime = Date.now() - startTime;
    console.log(`${req.method} ${req.originalUrl} - ${res.statusCode} - ${processingTime}ms`);
  });
  
  next();
});

// =============================================================================
// ROUTES CONFIGURATION
// =============================================================================

const API_BASE = `/api/${API_VERSION}`;

// Health check endpoint
app.get(`${API_BASE}/health`, async (req, res) => {
  try {
    const response = {
      success: true,
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: '1.0',
        services: {
          conversion: 'healthy',
          aspose: 'not_implemented',
          firebase: 'not_configured',
        },
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: `req_${Date.now()}`,
        processingTimeMs: 0,
        version: '1.0',
      },
    };

    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        type: 'server_error',
        code: 'HEALTH_CHECK_ERROR',
        message: 'Health check failed',
      },
    });
  }
});

// Conversion endpoints (placeholder implementations)
app.post(`${API_BASE}/pptx2json`, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: {
        type: 'validation_error',
        code: 'NO_FILE_UPLOADED',
        message: 'No PPTX file was uploaded',
      },
    });
  }

  return res.json({
    success: true,
    data: {
      message: 'PPTX to JSON conversion endpoint working',
      fileName: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      note: 'Full conversion functionality will be implemented with proper Aspose.Slides integration',
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: `req_${Date.now()}`,
      version: '1.0',
    },
  });
});

app.post(`${API_BASE}/json2pptx`, (req, res) => {
  res.json({
    success: true,
    data: {
      message: 'JSON to PPTX conversion endpoint working',
      note: 'Full conversion functionality will be implemented with proper Aspose.Slides integration',
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: `req_${Date.now()}`,
      version: '1.0',
    },
  });
});

app.post(`${API_BASE}/convertformat`, upload.single('file'), (req, res) => {
  res.json({
    success: true,
    data: {
      message: 'Format conversion endpoint working',
      note: 'Full conversion functionality will be implemented',
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: `req_${Date.now()}`,
      version: '1.0',
    },
  });
});

app.post(`${API_BASE}/thumbnails`, upload.single('file'), (req, res) => {
  res.json({
    success: true,
    data: {
      message: 'Thumbnail generation endpoint working',
      note: 'Full thumbnail functionality will be implemented',
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: `req_${Date.now()}`,
      version: '1.0',
    },
  });
});

// Placeholder endpoints for future implementation
app.post(`${API_BASE}/aitranslate`, upload.single('file'), (req, res) => {
  res.status(501).json({
    success: false,
    error: {
      type: 'not_implemented',
      code: 'FEATURE_NOT_IMPLEMENTED',
      message: 'AI Translation feature coming soon',
    },
  });
});

app.post(`${API_BASE}/analyze`, upload.single('file'), (req, res) => {
  res.status(501).json({
    success: false,
    error: {
      type: 'not_implemented',
      code: 'FEATURE_NOT_IMPLEMENTED',
      message: 'AI Analysis feature coming soon',
    },
  });
});

app.post(`${API_BASE}/extract-assets`, upload.single('file'), (req, res) => {
  res.status(501).json({
    success: false,
    error: {
      type: 'not_implemented',
      code: 'FEATURE_NOT_IMPLEMENTED',
      message: 'Asset extraction feature coming soon',
    },
  });
});

app.post(`${API_BASE}/extract-metadata`, upload.single('file'), (req, res) => {
  res.status(501).json({
    success: false,
    error: {
      type: 'not_implemented',
      code: 'FEATURE_NOT_IMPLEMENTED',
      message: 'Metadata extraction feature coming soon',
    },
  });
});

// Swagger documentation placeholder
app.get(`${API_BASE}/swagger`, (req, res) => {
  res.json({
    openapi: '3.0.0',
    info: {
      title: 'Luna Server API',
      version: '1.0.0',
      description: 'Professional PowerPoint processing API',
    },
    servers: [
      {
        url: `http://localhost:${PORT}${API_BASE}`,
        description: 'Development server',
      },
    ],
    paths: {
      '/health': {
        get: {
          summary: 'Health check endpoint',
          responses: {
            '200': {
              description: 'Service is healthy',
            },
          },
        },
      },
      '/pptx2json': {
        post: {
          summary: 'Convert PPTX to Universal Schema JSON',
          requestBody: {
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  properties: {
                    file: {
                      type: 'string',
                      format: 'binary',
                      description: 'PPTX file to convert',
                    },
                  },
                  required: ['file'],
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Conversion successful',
            },
            '400': {
              description: 'Invalid file or request',
            },
          },
        },
      },
      '/json2pptx': {
        post: {
          summary: 'Convert Universal Schema JSON to PPTX',
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  description: 'Universal Presentation Schema',
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Conversion successful',
            },
          },
        },
      },
    },
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Luna Server',
    version: '1.0.0',
    description: 'Professional PowerPoint processing API',
    status: 'running',
    mode: 'simplified',
    endpoints: {
      health: `${API_BASE}/health`,
      documentation: `${API_BASE}/swagger`,
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
    note: 'This is a simplified version. Full Aspose.Slides integration available in the complete version.',
  });
});

// =============================================================================
// ERROR HANDLING
// =============================================================================

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      type: 'not_found',
      code: 'ENDPOINT_NOT_FOUND',
      message: `Endpoint ${req.method} ${req.originalUrl} not found`,
    },
    meta: {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.originalUrl,
    },
  });
});

// Global error handler
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', error);

  res.status(500).json({
    success: false,
    error: {
      type: 'server_error',
      code: 'INTERNAL_SERVER_ERROR',
      message: NODE_ENV === 'production' 
        ? 'Internal server error' 
        : error.message,
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: `err_${Date.now()}`,
    },
  });
});

// =============================================================================
// SERVER STARTUP
// =============================================================================

// Start server
const server = app.listen(PORT, () => {
  console.log('🌙 Luna Server started successfully!');
  console.log(`📍 Port: ${PORT}`);
  console.log(`🔧 Environment: ${NODE_ENV}`);
  console.log(`📡 API Version: ${API_VERSION}`);
  console.log('');
  console.log('🔗 Available endpoints:');
  console.log(`   Health: http://localhost:${PORT}${API_BASE}/health`);
  console.log(`   Docs:   http://localhost:${PORT}${API_BASE}/swagger`);
  console.log(`   Root:   http://localhost:${PORT}/`);
  console.log('');
  console.log('✅ Server ready to accept requests!');
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed successfully');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed successfully');
    process.exit(0);
  });
});

export default app; 