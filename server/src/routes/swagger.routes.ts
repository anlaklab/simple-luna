/**
 * Swagger UI Routes - Interactive API Documentation
 * 
 * Serves Swagger UI for exploring and testing the API
 */

import { Router, Request, Response } from 'express';
import swaggerUi from 'swagger-ui-express';
import path from 'path';
import fs from 'fs';

// =============================================================================
// ROUTER SETUP
// =============================================================================

const router = Router();

// =============================================================================
// SWAGGER UI CONFIGURATION
// =============================================================================

const swaggerUiOptions = {
  customCss: `
    .swagger-ui .topbar { display: none; }
    .swagger-ui .info { margin: 50px 0; }
    .swagger-ui .info .title { color: #3b82f6; }
    .swagger-ui .scheme-container { background: #f8fafc; padding: 20px; border-radius: 8px; }
    .swagger-ui .btn.authorize { background-color: #10b981; border-color: #10b981; }
    .swagger-ui .btn.authorize:hover { background-color: #059669; border-color: #059669; }
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
  },
};

// =============================================================================
// STATIC OPENAPI SPEC LOADING
// =============================================================================

/**
 * Load pre-generated OpenAPI spec or fallback to basic spec
 */
function loadOpenApiSpec(): any {
  try {
    // ✅ Try to load pre-generated spec from build time
    const specPath = path.join(__dirname, '../openapi.json');
    if (fs.existsSync(specPath)) {
      const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
      console.log('✅ Loaded pre-generated OpenAPI spec with', Object.keys(spec.paths || {}).length, 'endpoints');
      return spec;
    }
    
    // ✅ Fallback to basic spec if pre-generated doesn't exist
    console.log('⚠️ Pre-generated OpenAPI spec not found, using fallback spec');
    return {
      openapi: '3.0.0',
      info: {
        title: 'Luna Server API',
        version: '1.0.0',
        description: 'Professional PowerPoint processing API with AI capabilities'
      },
      servers: [
        { url: 'https://luna.anlaklab.com/api/v1', description: 'Production' },
        { url: 'http://localhost:3000/api/v1', description: 'Development' }
      ],
      paths: {
        '/health': {
          get: {
            tags: ['System'],
            summary: 'Health Check',
            description: 'Check API health status',
            responses: {
              '200': {
                description: 'API is healthy',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        status: { type: 'string', example: 'healthy' },
                        timestamp: { type: 'string', format: 'date-time' }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    };
  } catch (error) {
    console.error('❌ Error loading OpenAPI spec:', error);
    return {
      openapi: '3.0.0',
      info: {
        title: 'Luna Server API',
        version: '1.0.0',
        description: 'Professional PowerPoint processing API with AI capabilities'
      },
      paths: {}
    };
  }
}

// Load spec once at startup
const openApiSpec = loadOpenApiSpec();

// =============================================================================
// SWAGGER ROUTES
// =============================================================================

/**
 * JSON API Routes
 */
router.get('/swagger.json', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.json(openApiSpec);
});

router.get('/openapi.json', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.json(openApiSpec);
});

/**
 * Documentation info routes
 */
router.get('/docs/info', (req: Request, res: Response) => {
  const baseUrl = `${req.protocol}://${req.get('host')}${req.baseUrl}`;
  
  const response = {
    success: true,
    data: {
      api: {
        name: 'Luna Server API',
        version: '1.0.0',
        description: 'Professional PowerPoint processing API with AI capabilities',
      },
      documentation: {
        swagger: `${baseUrl}/swagger/`,
        redoc: `${baseUrl}/redoc`,
        openapi: `${baseUrl}/swagger.json`,
        postman: `${baseUrl}/docs/postman`,
      },
      endpoints: {
        interactive: `${baseUrl}/swagger/`,
        json: `${baseUrl}/swagger.json`,
        alternative: `${baseUrl}/redoc`,
      },
      features: [
        'Interactive API testing',
        'Complete endpoint documentation',
        'Request/response examples',
        'Schema validation details',
        'Authentication information',
        'Rate limiting details',
      ],
      support: {
        email: 'support@lunaserver.com',
        documentation: `${baseUrl}/docs`,
        github: 'https://github.com/lunaserver/api',
      },
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.get('X-Request-ID') || `req_${Date.now()}`,
      version: '1.0',
    },
  };
  
  res.json(response);
});

/**
 * Swagger UI Routes - Setup for both /swagger and /docs
 */

// Main Swagger UI on /swagger/
router.use('/swagger', swaggerUi.serve);
router.get('/swagger/', (req: Request, res: Response, next) => {
  const swaggerUiHandler = swaggerUi.setup(openApiSpec, swaggerUiOptions);
  swaggerUiHandler(req, res, next);
});

// Alternative Swagger UI on /docs/
router.use('/docs', swaggerUi.serve);
router.get('/docs/', (req: Request, res: Response, next) => {
  const swaggerUiHandler = swaggerUi.setup(openApiSpec, swaggerUiOptions);
  swaggerUiHandler(req, res, next);
});

/**
 * GET /docs/postman - Postman Collection
 */
router.get('/docs/postman', (req: Request, res: Response) => {
  const baseUrl = `${req.protocol}://${req.get('host')}${req.baseUrl}`;
  
  const postmanCollection = {
    info: {
      name: 'Luna Server API',
      description: 'Professional PowerPoint processing API with AI capabilities',
      version: '1.0.0',
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    },
    auth: {
      type: 'noauth',
    },
    item: [
      {
        name: 'Conversion',
        description: 'File conversion endpoints',
        item: [
          {
            name: 'Convert PPTX to JSON',
            request: {
              method: 'POST',
              header: [],
              body: {
                mode: 'formdata',
                formdata: [
                  {
                    key: 'file',
                    type: 'file',
                    description: 'PPTX file to convert',
                  },
                  {
                    key: 'options',
                    value: JSON.stringify({
                      includeAssets: false,
                      includeMetadata: true,
                      includeAnimations: true,
                    }),
                    type: 'text',
                    description: 'Conversion options (JSON string)',
                  },
                ],
              },
              url: {
                raw: `${baseUrl}/pptx2json`,
                host: [baseUrl.replace(/^https?:\/\//, '')],
                path: ['pptx2json'],
              },
            },
          },
          {
            name: 'Convert JSON to PPTX',
            request: {
              method: 'POST',
              header: [
                {
                  key: 'Content-Type',
                  value: 'application/json',
                },
              ],
              body: {
                mode: 'raw',
                raw: JSON.stringify({
                  presentationData: {
                    metadata: {
                      id: 'example_presentation',
                      title: 'Example Presentation',
                      created: new Date().toISOString(),
                      modified: new Date().toISOString(),
                      slideCount: 1,
                    },
                    slides: [],
                  },
                  outputFormat: 'pptx',
                }, null, 2),
              },
              url: {
                raw: `${baseUrl}/json2pptx`,
                host: [baseUrl.replace(/^https?:\/\//, '')],
                path: ['json2pptx'],
              },
            },
          },
        ],
      },
      {
        name: 'AI Features',
        description: 'AI-powered features',
        item: [
          {
            name: 'AI Translation',
            request: {
              method: 'POST',
              header: [
                {
                  key: 'Content-Type',
                  value: 'application/json',
                },
              ],
              body: {
                mode: 'raw',
                raw: JSON.stringify({
                  presentationData: {
                    metadata: {
                      id: 'example_presentation',
                      title: 'Example Presentation',
                      created: new Date().toISOString(),
                      modified: new Date().toISOString(),
                      slideCount: 1,
                    },
                    slides: [],
                  },
                  sourceLanguage: 'en',
                  targetLanguage: 'es',
                  translationMethod: 'openai',
                }, null, 2),
              },
              url: {
                raw: `${baseUrl}/aitranslate`,
                host: [baseUrl.replace(/^https?:\/\//, '')],
                path: ['aitranslate'],
              },
            },
          },
        ],
      },
      {
        name: 'Utility',
        description: 'Health checks and system status',
        item: [
          {
            name: 'Health Check',
            request: {
              method: 'GET',
              header: [],
              url: {
                raw: `${baseUrl}/health`,
                host: [baseUrl.replace(/^https?:\/\//, '')],
                path: ['health'],
              },
            },
          },
        ],
      },
    ],
    variable: [
      {
        key: 'baseUrl',
        value: baseUrl,
        type: 'string',
      },
    ],
  };
  
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename="luna-server-api.postman_collection.json"');
  res.json(postmanCollection);
});

export default router; 