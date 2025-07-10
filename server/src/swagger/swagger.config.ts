/**
 * Swagger/OpenAPI Configuration
 * 
 * Comprehensive API documentation with all endpoints, schemas, and examples
 */

import swaggerJsdoc from 'swagger-jsdoc';
import { Request } from 'express';
import path from 'path';
import fs from 'fs';

// =============================================================================
// DYNAMIC PATH RESOLUTION
// =============================================================================

/**
 * Dynamically resolve paths to TypeScript source files
 * swagger-jsdoc needs the actual .ts files with JSDoc comments, not compiled .js files
 */
function resolveSourcePaths(): string[] {
  const possibleBasePaths = [
    // If running from compiled dist/ directory
    path.resolve(__dirname, '../../src'),
    // If running from src/ directory directly
    path.resolve(__dirname, '../'),
    // If running from server/ directory
    path.resolve(process.cwd(), 'src'),
    // If running from project root
    path.resolve(process.cwd(), 'server/src'),
  ];

  // Find the first valid base path that contains the routes directory
  let sourcePath: string | null = null;
  for (const basePath of possibleBasePaths) {
    const routesPath = path.join(basePath, 'routes');
    if (fs.existsSync(routesPath)) {
      sourcePath = basePath;
      break;
    }
  }

  if (!sourcePath) {
    console.warn('⚠️  Swagger: Could not find source files for JSDoc documentation');
    return [];
  }

  const apiPaths = [
    path.join(sourcePath, 'routes/*.ts'),
    path.join(sourcePath, 'controllers/*.ts'),
  ];

  console.log('📖 Swagger: Using source paths for JSDoc documentation:', apiPaths);
  return apiPaths;
}

// =============================================================================
// SWAGGER OPTIONS CONFIGURATION
// =============================================================================

const swaggerOptions: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Luna Server API',
      version: '1.0.0',
      description: `
# Luna Server API

Professional PowerPoint processing API with AI capabilities built on Node.js + TypeScript.

## Features

- **File Conversion**: PPTX ↔ JSON conversions using Universal Presentation Schema
- **Format Export**: Convert to PDF, HTML, images (PNG, JPG, SVG)
- **Thumbnail Generation**: High-quality slide thumbnails
- **AI Translation**: Multi-language presentation translation (OpenAI + Aspose)
- **Content Analysis**: AI-powered sentiment, accessibility, and design analysis
- **Asset Extraction**: Extract embedded images, videos, documents
- **Metadata Extraction**: Comprehensive document metadata and statistics

## Architecture

Built with Clean Architecture principles:
- **Controllers**: HTTP request/response handling
- **Services**: Business logic orchestration
- **Adapters**: External service integrations (Aspose, Firebase, OpenAI)
- **Schemas**: Universal Presentation Schema with Zod validation
- **Middleware**: Request validation, error handling, logging

## Universal Presentation Schema

All conversions use a standardized JSON schema that preserves:
- Slide layouts and master slides
- Text formatting and styles
- Images, videos, and embedded objects
- Animations and transitions
- Charts, tables, and SmartArt
- Comments and metadata
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
    servers: [
      {
        url: 'http://localhost:3000/api/v1',
        description: 'Development Server',
      },
      {
        url: 'https://api.lunaserver.com/v1',
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
        name: 'Extraction',
        description: 'Data extraction - assets, metadata, content analysis',
      },
      {
        name: 'Utility',
        description: 'Health checks, documentation, system status',
      },
    ],
    
    // =============================================================================
    // COMPONENTS - REUSABLE SCHEMAS AND RESPONSES
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
      },
      
      // =============================================================================
      // RESPONSE TEMPLATES
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
      },
      
      // =============================================================================
      // REQUEST BODY EXAMPLES
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
      },
    },
  },
  // Dynamically resolve paths to TypeScript source files with JSDoc comments
  apis: resolveSourcePaths(),
};

// =============================================================================
// DYNAMIC SERVER URL GENERATION
// =============================================================================

export function generateSwaggerSpec(req?: Request): object {
  const spec = swaggerJsdoc(swaggerOptions) as any;
  
  // Update servers based on request if available
  if (req) {
    const baseUrl = `${req.protocol}://${req.get('host')}${req.baseUrl}`;
    spec.servers = [
      {
        url: baseUrl,
        description: 'Current Server',
      },
      ...spec.servers.filter((server: any) => server.url !== baseUrl),
    ];
  }
  
  return spec;
}

export default swaggerOptions; 