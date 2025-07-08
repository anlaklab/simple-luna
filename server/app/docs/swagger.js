/**
 * Swagger/OpenAPI Configuration
 * 
 * Comprehensive API documentation configuration
 */

const swaggerJsdoc = require('swagger-jsdoc');

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Luna Server API',
      version: '1.0.0',
      description: `
# Luna Server API

Professional PowerPoint processing API with AI capabilities built on Node.js.

## Features

- **File Conversion**: PPTX ↔ JSON conversions using Universal Presentation Schema
- **AI Generation**: AI-powered presentation generation
- **Session Management**: Persistent chat sessions with Firebase
- **Schema Validation**: Dynamic validation against Universal PowerPoint Schema
- **Thumbnail Generation**: High-quality slide thumbnails
- **Complete Conversion Workflow**: All-in-one upload + convert + save + thumbnails
- **Health Monitoring**: Service health and status endpoints

## Architecture

Built with Clean Architecture principles:
- **Controllers**: HTTP request/response handling  
- **Services**: Business logic orchestration
- **Adapters**: External service integrations (Firebase, OpenAI)
- **Schemas**: Universal Presentation Schema validation
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
        name: 'Health',
        description: 'Service health and status monitoring',
      },
      {
        name: 'Presentations', 
        description: 'Presentation management and retrieval',
      },
      {
        name: 'AI Generation',
        description: 'AI-powered presentation generation',
      },
      {
        name: 'Sessions',
        description: 'Chat session management with Firebase',
      },
      {
        name: 'File Upload',
        description: 'File upload and PPTX to JSON conversion',
      },
      {
        name: 'Conversion',
        description: 'Complete conversion workflow (upload + convert + save all-in-one)',
      },
      {
        name: 'Thumbnails',
        description: 'Thumbnail generation for presentations',
      },
      {
        name: 'Batch Operations',
        description: 'Batch operations for multiple resources',
      },
      {
        name: 'Validation',
        description: 'Schema validation and analysis',
      },
      {
        name: 'Documentation',
        description: 'API documentation and specifications',
      },
    ],
    components: {
      schemas: {
        ApiResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              description: 'Whether the request was successful',
            },
            data: {
              type: 'object',
              description: 'Response data payload',
            },
            error: {
              type: 'object',
              properties: {
                type: { type: 'string' },
                code: { type: 'string' },
                message: { type: 'string' },
              },
              description: 'Error information if request failed',
            },
            meta: {
              type: 'object',
              properties: {
                timestamp: { type: 'string', format: 'date-time' },
                requestId: { type: 'string' },
                processingTimeMs: { type: 'number' },
                version: { type: 'string' },
              },
              description: 'Request metadata',
            },
          },
          required: ['success'],
        },
        HealthStatus: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['healthy', 'degraded', 'unhealthy'] },
            timestamp: { type: 'string', format: 'date-time' },
            uptime: { type: 'number' },
            version: { type: 'string' },
            services: {
              type: 'object',
              properties: {
                conversion: { type: 'string' },
                aspose: { type: 'string' },
                firebase: { type: 'string' },
              },
            },
          },
        },
        PresentationData: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            description: { type: 'string' },
            status: { type: 'string', enum: ['draft', 'processing', 'completed', 'failed'] },
            slideCount: { type: 'number' },
            author: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        SessionData: {
          type: 'object',
          properties: {
            sessionId: { type: 'string' },
            title: { type: 'string' },
            userId: { type: 'string', nullable: true },
            status: { type: 'string', enum: ['active', 'archived', 'deleted'] },
            messageCount: { type: 'number' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        ValidationResult: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            errors: { 
              type: 'array',
              items: { type: 'string' }
            },
            warnings: {
              type: 'array', 
              items: { type: 'string' }
            },
            validationTimeMs: { type: 'number' },
            schemaCompliance: {
              type: 'object',
              properties: {
                completeness: { type: 'number' },
                version: { type: 'string' }
              }
            }
          },
        },
      },
    },
  },
  apis: [
    './app/routes/*.js',
    './app/controllers/*.js',
  ],
};

// Swagger UI options
const swaggerUiOptions = {
  customCss: `
    .swagger-ui .topbar { display: none; }
    .swagger-ui .info { margin: 50px 0; }
    .swagger-ui .info .title { color: #3b82f6; }
    .swagger-ui .scheme-container { background: #f8fafc; padding: 20px; border-radius: 8px; }
    .swagger-ui .btn.authorize { background-color: #10b981; border-color: #10b981; }
    .swagger-ui .btn.authorize:hover { background-color: #059669; border-color: #059669; }
    .swagger-ui .btn.execute { background-color: #3b82f6; border-color: #3b82f6; }
    .swagger-ui .btn.execute:hover { background-color: #2563eb; border-color: #2563eb; }
  `,
  customSiteTitle: 'Luna Server API Documentation',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    docExpansion: 'list',
    filter: true,
    showExtensions: true,
    showCommonExtensions: true,
    tryItOutEnabled: true,
    syntaxHighlight: {
      activate: true,
      theme: 'agate'
    },
  },
};

/**
 * Generate Swagger specification
 * @returns {Object} Swagger specification object
 */
const generateSwaggerSpec = () => {
  return swaggerJsdoc(swaggerOptions);
};

/**
 * Get Swagger UI options
 * @returns {Object} Swagger UI configuration
 */
const getSwaggerUiOptions = () => swaggerUiOptions;

module.exports = {
  generateSwaggerSpec,
  getSwaggerUiOptions,
  swaggerOptions
}; 