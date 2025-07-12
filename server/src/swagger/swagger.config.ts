/**
 * Swagger/OpenAPI Configuration - Dynamic Auto-Discovery
 * 
 * Automatically discovers and documents all endpoints from JSDoc comments
 * Scans all route files, controllers, and service files for @swagger annotations
 */

import swaggerJsdoc from 'swagger-jsdoc';
import { Request } from 'express';
import path from 'path';
import fs from 'fs';
import { glob } from 'glob';

// =============================================================================
// ENHANCED DYNAMIC PATH RESOLUTION
// =============================================================================

/**
 * Dynamically discover all TypeScript files with potential Swagger documentation
 * Uses glob patterns to find all .ts files in relevant directories
 */
function resolveSourcePaths(): string[] {
  // In production, we need to use compiled .js files since .ts files don't exist
  const isProduction = process.env.NODE_ENV === 'production';
  
  const possibleBasePaths = [
    // If running from compiled dist/ directory (production)
    path.resolve(__dirname, '../'),
    // If running from src/ directory directly
    path.resolve(__dirname, '../'),
    // If running from server/ directory
    path.resolve(process.cwd(), 'src'),
    // If running from project root
    path.resolve(process.cwd(), 'server/src'),
    // Additional production paths
    path.resolve(process.cwd(), 'server/dist'),
    path.resolve(__dirname, '../../src'),
  ];

  // Find the first valid base path that contains the routes directory
  let sourcePath: string | null = null;
  for (const basePath of possibleBasePaths) {
    const routesPath = path.join(basePath, 'routes');
    if (fs.existsSync(routesPath)) {
      sourcePath = basePath;
      console.log(`📖 Swagger: Found valid base path: ${sourcePath}`);
      break;
    }
  }

  if (!sourcePath) {
    console.warn('⚠️  Swagger: Could not find source files for JSDoc documentation');
    // Fallback: Use current directory structure
    return [
      path.join(__dirname, '../routes/*.{ts,js}'),
      path.join(__dirname, '../controllers/*.{ts,js}'),
    ];
  }

  console.log('📖 Swagger: Base source path found:', sourcePath);

  // Use both .ts and .js files for compatibility
  const fileExtension = isProduction ? '{ts,js}' : 'ts';
  const searchPatterns = [
    // All route files - MOST IMPORTANT
    path.join(sourcePath, `routes/**/*.${fileExtension}`),
    // All controller files
    path.join(sourcePath, `controllers/**/*.${fileExtension}`),
    // Main index files
    path.join(sourcePath, `index.${fileExtension}`),
  ];

  console.log('📁 Swagger: Search patterns:', searchPatterns);

  const allFiles: string[] = [];
  
  try {
    for (const pattern of searchPatterns) {
      const files = glob.sync(pattern, {
        ignore: [
          '**/*.d.ts',      // Ignore type definition files
          '**/*.test.{ts,js}',   // Ignore test files
          '**/*.spec.{ts,js}',   // Ignore spec files
          '**/node_modules/**', // Ignore node_modules
          '**/build/**',    // Ignore build files
        ],
        absolute: true
      });
      
      // Filter files that likely contain Swagger documentation
      const swaggerFiles = files.filter(file => {
        try {
          const content = fs.readFileSync(file, 'utf8');
          // Check if file contains @swagger JSDoc comments
          const hasSwagger = content.includes('@swagger') || 
                           content.includes('swagger') || 
                           content.includes('router.') ||
                           file.includes('routes');
          
          if (hasSwagger && content.includes('@swagger')) {
            console.log(`✅ Found swagger file: ${path.relative(sourcePath, file)}`);
          }
          
          return hasSwagger;
        } catch (error) {
          console.warn(`⚠️  Could not read file ${file}:`, error);
          return false;
        }
      });
      
      allFiles.push(...swaggerFiles);
      
      if (swaggerFiles.length > 0) {
        console.log(`📁 Found ${swaggerFiles.length} files in pattern:`, pattern);
      }
    }
  } catch (error) {
    console.error('❌ Error scanning for source files:', error);
    // Enhanced fallback with absolute paths
    const fallbackPatterns = [
      path.join(sourcePath, 'routes', `*.${fileExtension}`),
      path.join(sourcePath, 'controllers', `*.${fileExtension}`),
    ];
    console.log('🔄 Using fallback patterns:', fallbackPatterns);
    return fallbackPatterns;
  }

  // Remove duplicates and sort
  const uniqueFiles = [...new Set(allFiles)].sort();
  
  console.log(`📖 Swagger: Total ${uniqueFiles.length} files will be scanned for API documentation`);
  console.log('📋 Files to process:');
  uniqueFiles.forEach(file => {
    console.log(`   📄 ${path.relative(sourcePath, file)}`);
  });
  
  return uniqueFiles;
}

/**
 * Check if swagger-jsdoc can process the discovered files
 */
function validateSwaggerSources(apiPaths: string[]): string[] {
  const validPaths: string[] = [];
  
  for (const apiPath of apiPaths) {
    if (fs.existsSync(apiPath)) {
      try {
        const content = fs.readFileSync(apiPath, 'utf8');
        if (content.includes('@swagger')) {
          validPaths.push(apiPath);
        }
      } catch (error) {
        console.warn(`⚠️  Could not validate swagger source ${apiPath}:`, error);
      }
    }
  }
  
  console.log(`✅ Swagger: ${validPaths.length} files contain @swagger documentation`);
  return validPaths;
}

// =============================================================================
// SWAGGER OPTIONS CONFIGURATION
// =============================================================================

const swaggerOptions: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Luna Server API - Auto-Generated Documentation',
      version: '1.0.0',
      description: `
# Luna Server API - Complete Auto-Generated Documentation

Professional PowerPoint processing API with AI capabilities built on Node.js + TypeScript.

## 🚀 Auto-Discovery Features

This documentation is **automatically generated** by scanning all source files for JSDoc @swagger comments.

- **Routes Auto-Detection**: Scans all files in \`routes/\` directory
- **Controllers Auto-Detection**: Includes all controller files  
- **Services Auto-Detection**: Documents service endpoints
- **Real-Time Updates**: Documentation updates when code changes

## 📋 API Features

- **File Conversion**: PPTX ↔ JSON conversions using Universal Presentation Schema
- **Format Export**: Convert to PDF, HTML, images (PNG, JPG, SVG)
- **Thumbnail Generation**: High-quality slide thumbnails
- **AI Translation**: Multi-language presentation translation (OpenAI + Aspose)
- **Content Analysis**: AI-powered sentiment, accessibility, and design analysis
- **Asset Extraction**: Extract embedded images, videos, documents
- **Metadata Extraction**: Comprehensive document metadata and statistics
- **Debug Tools**: Comprehensive debugging and diagnostic endpoints

## 🏗️ Architecture

Built with Clean Architecture principles:
- **Controllers**: HTTP request/response handling
- **Services**: Business logic orchestration
- **Adapters**: External service integrations (Aspose, Firebase, OpenAI)
- **Schemas**: Universal Presentation Schema with Zod validation
- **Middleware**: Request validation, error handling, logging

## 📊 Universal Presentation Schema

All conversions use a standardized JSON schema that preserves:
- Slide layouts and master slides
- Text formatting and styles
- Images, videos, and embedded objects
- Animations and transitions
- Charts, tables, and SmartArt
- Comments and metadata

## 🔧 Debugging & Diagnostics

The API includes comprehensive debugging tools:
- **Standard Debug**: General-purpose debugging for most files
- **Large File Debug**: Specialized debugging for files >10MB
- **License Debug**: Aspose license validation and troubleshooting
- **JAR Validation**: Java environment and JAR file validation
- **Performance Analysis**: Memory usage and processing time analysis

## 📚 Dynamic Documentation

This documentation is generated from JSDoc comments in the source code. 
To add or modify endpoint documentation, update the @swagger comments in the respective source files.
      `,
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
      contact: {
        name: 'Luna Server Support',
        email: 'support@lunaserver.com',
      },
    },
    servers: process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'dev'
      ? [
          {
            url: 'http://localhost:3000/api/v1',
            description: 'Development Server (Auto-Discovery Enabled)',
          },
          {
            url: 'http://localhost:8080/api/v1',
            description: 'Alternative Development Server',
          },
        ]
      : [
          {
            url: 'https://luna.anlaklab.com/api/v1',
            description: 'Production Server',
          },
        ],
    tags: [
      {
        name: 'Conversion',
        description: 'File conversion endpoints - PPTX ↔ JSON, format conversion, thumbnails',
      },
      {
        name: 'AI Features',
        description: 'AI-powered features - translation, analysis, insights',
      },
      {
        name: 'Enhanced AI',
        description: 'Advanced AI operations with Universal Schema awareness',
      },
      {
        name: 'Extraction',
        description: 'Data extraction - assets, metadata, content analysis',
      },
      {
        name: 'Dynamic Extensions',
        description: 'Runtime extension management - load, test, enable/disable extensions dynamically',
      },
      {
        name: 'Async Operations',
        description: 'Background processing with job tracking and queuing',
      },
      {
        name: 'Batch Operations',
        description: 'High-performance bulk operations with concurrency control',
      },
      {
        name: 'Sessions',
        description: 'Session management and conversation tracking',
      },
      {
        name: 'Granular Control',
        description: 'Individual slide/shape operations and raw rendering capabilities',
      },
      {
        name: 'Debug & Diagnostics',
        description: 'Debugging tools, diagnostics, and system validation',
      },
      {
        name: 'Admin',
        description: 'Administrative endpoints and system management',
      },
      {
        name: 'Presentations',
        description: 'Presentation management and operations',
      },
      {
        name: 'Analysis',
        description: 'Content analysis and insights',
      },
      {
        name: 'Utility',
        description: 'Health checks, documentation, system status',
      },
    ],
    
    // =============================================================================
    // COMPONENTS - REUSABLE SCHEMAS AND RESPONSES (Enhanced)
    // =============================================================================
    
    components: {
      schemas: {
        // Success Response Meta
        SuccessMeta: {
          type: 'object',
          properties: {
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'ISO 8601 timestamp',
              example: '2024-01-15T10:30:00.000Z',
            },
            requestId: {
              type: 'string',
              description: 'Unique request identifier',
              example: 'req_1705316200000_abc123',
            },
            processingTimeMs: {
              type: 'number',
              description: 'Processing time in milliseconds',
              example: 2500,
              minimum: 0,
            },
            version: {
              type: 'string',
              description: 'API version',
              example: '1.0',
            },
          },
          required: ['timestamp', 'requestId', 'processingTimeMs', 'version'],
        },
        
        // Error Response Schema
        ErrorResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              enum: [false],
            },
            error: {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  enum: [
                    'validation_error',
                    'file_error',
                    'processing_error',
                    'conversion_error',
                    'translation_error',
                    'analysis_error',
                    'storage_error',
                    'external_api_error',
                    'rate_limit_error',
                    'authentication_error',
                    'authorization_error',
                    'server_error',
                    'timeout_error',
                    'service_unavailable',
                  ],
                  description: 'Error category',
                },
                code: {
                  type: 'string',
                  description: 'Specific error code',
                  example: 'INVALID_FILE_TYPE',
                },
                message: {
                  type: 'string',
                  description: 'Human-readable error message',
                  example: 'File type application/pdf is not supported',
                },
                details: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      field: {
                        type: 'string',
                        description: 'Field that caused the error',
                      },
                      message: {
                        type: 'string',
                        description: 'Field-specific error message',
                      },
                      code: {
                        type: 'string',
                        description: 'Field-specific error code',
                      },
                    },
                  },
                  description: 'Detailed error information',
                },
              },
              required: ['type', 'code', 'message'],
            },
            meta: {
              type: 'object',
              properties: {
                timestamp: {
                  type: 'string',
                  format: 'date-time',
                },
                requestId: {
                  type: 'string',
                },
                error: {
                  type: 'object',
                  properties: {
                    type: { type: 'string' },
                    code: { type: 'string' },
                    message: { type: 'string' },
                  },
                },
              },
              required: ['timestamp', 'requestId', 'error'],
            },
          },
          required: ['success', 'error', 'meta'],
        },
        
        // File Information Schema
        FileInfo: {
          type: 'object',
          properties: {
            filename: {
              type: 'string',
              description: 'Generated filename',
              example: 'presentation_2024-01-15T10-30-00.pptx',
            },
            originalName: {
              type: 'string',
              description: 'Original filename',
              example: 'my-presentation.pptx',
            },
            size: {
              type: 'number',
              description: 'File size in bytes',
              example: 1048576,
              minimum: 0,
            },
            mimetype: {
              type: 'string',
              description: 'MIME type',
              example: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            },
            url: {
              type: 'string',
              format: 'uri',
              description: 'Direct file URL (if available)',
              example: 'https://storage.googleapis.com/bucket/files/presentation.pptx',
            },
            downloadUrl: {
              type: 'string',
              format: 'uri',
              description: 'Download URL with authentication',
              example: 'https://api.lunaserver.com/v1/download/abc123',
            },
            previewUrl: {
              type: 'string',
              format: 'uri',
              description: 'Preview/thumbnail URL',
              example: 'https://storage.googleapis.com/bucket/thumbnails/preview.png',
            },
          },
          required: ['filename', 'originalName', 'size', 'mimetype'],
        },
        
        // Universal Presentation Schema (simplified for docs)
        UniversalPresentation: {
          type: 'object',
          description: 'Universal Presentation Schema - standardized PowerPoint representation',
          properties: {
            metadata: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  description: 'Unique presentation identifier',
                  example: 'pres_abc123',
                },
                title: {
                  type: 'string',
                  description: 'Presentation title',
                  example: 'Q4 Business Review',
                },
                author: {
                  type: 'string',
                  description: 'Author name',
                  example: 'John Smith',
                },
                created: {
                  type: 'string',
                  format: 'date-time',
                  description: 'Creation timestamp',
                },
                modified: {
                  type: 'string',
                  format: 'date-time',
                  description: 'Last modification timestamp',
                },
                slideCount: {
                  type: 'number',
                  description: 'Total number of slides',
                  example: 15,
                  minimum: 0,
                },
              },
              required: ['id', 'created', 'modified', 'slideCount'],
            },
            slides: {
              type: 'array',
              description: 'Array of slide objects',
              items: {
                type: 'object',
                properties: {
                  id: {
                    type: 'string',
                    description: 'Unique slide identifier',
                    example: 'slide_001',
                  },
                  index: {
                    type: 'number',
                    description: 'Slide position (0-based)',
                    example: 0,
                    minimum: 0,
                  },
                  title: {
                    type: 'string',
                    description: 'Slide title',
                    example: 'Executive Summary',
                  },
                  layout: {
                    type: 'string',
                    description: 'Slide layout type',
                    example: 'Title and Content',
                  },
                  shapes: {
                    type: 'array',
                    description: 'Shapes and objects on the slide',
                    items: {
                      type: 'object',
                      description: 'Shape object (text, image, chart, etc.)',
                    },
                  },
                },
                required: ['id', 'index', 'layout', 'shapes'],
              },
            },
            assets: {
              type: 'array',
              description: 'Embedded assets (images, videos, etc.)',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  type: { type: 'string', enum: ['image', 'video', 'audio', 'document'] },
                  filename: { type: 'string' },
                  size: { type: 'number' },
                },
              },
            },
          },
          required: ['metadata', 'slides'],
        },
        
        // Processing Statistics
        ProcessingStats: {
          type: 'object',
          properties: {
            slideCount: {
              type: 'number',
              description: 'Number of slides processed',
              example: 10,
              minimum: 0,
            },
            shapeCount: {
              type: 'number',
              description: 'Total shapes processed',
              example: 45,
              minimum: 0,
            },
            imageCount: {
              type: 'number',
              description: 'Images processed',
              example: 8,
              minimum: 0,
            },
            animationCount: {
              type: 'number',
              description: 'Animations processed',
              example: 3,
              minimum: 0,
            },
            conversionTimeMs: {
              type: 'number',
              description: 'Processing time in milliseconds',
              example: 2500,
              minimum: 0,
            },
          },
          required: ['slideCount', 'conversionTimeMs'],
        },

        // Debug Diagnostic Response
        DebugDiagnostic: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            diagnostics: {
              type: 'object',
              properties: {
                step1_presentationLoaded: { type: 'boolean' },
                step2_firebaseConnected: { type: 'boolean' },
                step3_asposeInitialized: { type: 'boolean' },
                step4_assetsExtracted: { type: 'boolean' },
                step5_assetsAnalyzed: { type: 'boolean' },
                step6_firebaseStorageSaved: { type: 'boolean' },
                step7_responseGenerated: { type: 'boolean' },
                errors: {
                  type: 'array',
                  items: { type: 'string' },
                },
                warnings: {
                  type: 'array', 
                  items: { type: 'string' },
                },
                summary: {
                  type: 'object',
                  properties: {
                    overallHealth: { type: 'string', enum: ['healthy', 'issues_detected'] },
                    stepsPassedRatio: { type: 'string', example: '6/7' },
                    criticalIssues: { type: 'number' },
                    warnings: { type: 'number' },
                  },
                },
              },
            },
            recommendations: {
              type: 'array',
              items: { type: 'string' },
            },
          },
        },
      },
      
      // =============================================================================
      // RESPONSE TEMPLATES (Enhanced)
      // =============================================================================
      
      responses: {
        ValidationError: {
          description: 'Validation Error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
              example: {
                success: false,
                error: {
                  type: 'validation_error',
                  code: 'INVALID_FILE_TYPE',
                  message: 'File type application/pdf is not supported. Allowed types: application/vnd.openxmlformats-officedocument.presentationml.presentation',
                },
                meta: {
                  timestamp: '2024-01-15T10:30:00.000Z',
                  requestId: 'req_1705316200000_abc123',
                  error: {
                    type: 'validation_error',
                    code: 'INVALID_FILE_TYPE',
                    message: 'File type application/pdf is not supported',
                  },
                },
              },
            },
          },
        },
        
        ServerError: {
          description: 'Internal Server Error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
              example: {
                success: false,
                error: {
                  type: 'server_error',
                  code: 'CONVERSION_ERROR',
                  message: 'An error occurred during file conversion',
                },
                meta: {
                  timestamp: '2024-01-15T10:30:00.000Z',
                  requestId: 'req_1705316200000_abc123',
                  error: {
                    type: 'server_error',
                    code: 'CONVERSION_ERROR',
                    message: 'An error occurred during file conversion',
                  },
                },
              },
            },
          },
        },

        ServiceUnavailable: {
          description: 'Service Unavailable',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
              example: {
                success: false,
                error: {
                  type: 'service_unavailable',
                  code: 'ASSET_SERVICE_NOT_CONFIGURED',
                  message: 'Asset extraction requires proper service configuration. Please contact administrator.',
                },
                meta: {
                  timestamp: '2024-01-15T10:30:00.000Z',
                  requestId: 'req_1705316200000_abc123',
                  error: {
                    type: 'service_unavailable',
                    code: 'ASSET_SERVICE_NOT_CONFIGURED',
                    message: 'Service configuration error',
                  },
                },
              },
            },
          },
        },
      },
      
      // =============================================================================
      // REQUEST BODY EXAMPLES (Enhanced)
      // =============================================================================
      
      examples: {
        BasicConversionOptions: {
          summary: 'Basic conversion options',
          value: {
            includeAssets: false,
            includeMetadata: true,
            includeAnimations: true,
            optimizeForSize: false,
          },
        },
        
        AdvancedConversionOptions: {
          summary: 'Advanced conversion with assets',
          value: {
            includeAssets: true,
            includeMetadata: true,
            includeAnimations: true,
            includeComments: true,
            extractImages: true,
            optimizeForSize: true,
          },
        },
        
        PDFConversionOptions: {
          summary: 'PDF conversion options',
          value: {
            outputFormat: 'pdf',
            quality: 'high',
            includeNotes: false,
            includeHiddenSlides: false,
            slideRange: {
              start: 1,
              end: 10,
            },
            pdfOptions: {
              compliance: 'PDF/A-1b',
              embedFonts: true,
              imageCompression: 'auto',
            },
          },
        },
        
        ThumbnailOptions: {
          summary: 'Thumbnail generation options',
          value: {
            slideIndices: [0, 1, 2],
            size: {
              width: 800,
              height: 600,
            },
            format: 'png',
            quality: 'high',
            returnFormat: 'urls',
            uploadToStorage: true,
          },
        },
        
        TranslationRequest: {
          summary: 'AI translation request',
          value: {
            presentationData: {
              metadata: {
                id: 'pres_123',
                title: 'Business Presentation',
                created: '2024-01-15T10:00:00.000Z',
                modified: '2024-01-15T10:30:00.000Z',
                slideCount: 5,
              },
              slides: [
                {
                  id: 'slide_001',
                  index: 0,
                  title: 'Welcome',
                  layout: 'Title Slide',
                  shapes: [],
                },
              ],
            },
            sourceLanguage: 'en',
            targetLanguage: 'es',
            translationMethod: 'openai',
            preserveFormatting: true,
            translateComments: true,
            translateMetadata: false,
          },
        },

        AssetExtractionOptions: {
          summary: 'Asset extraction options',
          value: {
            assetTypes: ['image', 'video', 'audio'],
            returnFormat: 'urls',
            generateThumbnails: true,
            extractToStorage: false,
            includeMetadata: true,
          },
        },

        DebugOptions: {
          summary: 'Debug extraction options',
          value: {
            enableVerboseLogging: true,
            includePerformanceMetrics: true,
            checkAllServices: true,
            validateFileStructure: true,
          },
        },
      },
    },
  },
  // ✅ ENHANCED: Use dynamic path resolution with validation
  apis: (() => {
    console.log('🔍 Swagger: Starting dynamic API discovery...');
    const discoveredPaths = resolveSourcePaths();
    const validatedPaths = validateSwaggerSources(discoveredPaths);
    console.log(`✅ Swagger: API discovery complete. Processing ${validatedPaths.length} files with documentation.`);
    return validatedPaths.length > 0 ? validatedPaths : discoveredPaths;
  })(),
};

// =============================================================================
// DYNAMIC SERVER URL GENERATION (Enhanced)
// =============================================================================

export function generateSwaggerSpec(req?: Request): object {
  console.log('🔄 Swagger: Generating dynamic API specification...');
  
  try {
    const spec = swaggerJsdoc(swaggerOptions) as any;
    
    // Update servers based on request if available
    if (req) {
      const protocol = req.get('x-forwarded-proto') || req.protocol;
      const host = req.get('x-forwarded-host') || req.get('host');
      const baseUrl = `${protocol}://${host}`;
      const apiUrl = `${baseUrl}/api/v1`;
      
      // Only include current server in production
      if (process.env.NODE_ENV === 'production') {
        spec.servers = [
          {
            url: apiUrl,
            description: 'Current Server (Production)',
          },
        ];
      } else {
        spec.servers = [
          {
            url: apiUrl,
            description: 'Current Server (Dynamic)',
          },
          {
            url: 'http://localhost:3000/api/v1',
            description: 'Development Server',
          },
        ];
      }
    }
    
    // Add metadata about dynamic generation
    spec.info['x-generated'] = {
      timestamp: new Date().toISOString(),
      method: 'dynamic',
      filesScanned: swaggerOptions.apis?.length || 0,
      endpointsFound: Object.keys(spec.paths || {}).length,
      environment: process.env.NODE_ENV || 'development',
    };
    
    console.log(`✅ Swagger: Generated specification with ${Object.keys(spec.paths || {}).length} endpoints`);
    
    // Log endpoint summary for debugging
    if (spec.paths && Object.keys(spec.paths).length > 0) {
      console.log('📋 Swagger: Available endpoints:');
      Object.keys(spec.paths).forEach(path => {
        const methods = Object.keys(spec.paths[path]);
        console.log(`   ${methods.map(m => m.toUpperCase()).join(', ')} ${path}`);
      });
    } else {
      console.warn('⚠️  Swagger: No endpoints found in specification!');
      console.log('🔍 Debugging info:', {
        sourcePaths: swaggerOptions.apis,
        environment: process.env.NODE_ENV,
      });
    }
    
    return spec;
  } catch (error) {
    console.error('❌ Swagger: Error generating specification:', error);
    
    // Return fallback spec on error
    return {
      openapi: '3.0.0',
      info: {
        title: 'Luna Server API - Error in Dynamic Generation',
        version: '1.0.0',
        description: 'Error occurred during dynamic API discovery. Please check server logs.',
      },
      servers: process.env.NODE_ENV === 'production' 
        ? [{ url: 'https://luna.anlaklab.com/api/v1', description: 'Production Server' }]
        : [{ url: 'http://localhost:3000/api/v1', description: 'Development Server' }],
      paths: {},
      'x-error': {
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
    };
  }
}

export default swaggerOptions;

// =============================================================================
// COMMONJS EXPORTS FOR BUILD-TIME COMPATIBILITY
// =============================================================================

// Export for CommonJS compatibility (used in Dockerfile build-time generation)
module.exports = {
  generateSwaggerSpec,
  swaggerOptions,
  default: swaggerOptions
}; 