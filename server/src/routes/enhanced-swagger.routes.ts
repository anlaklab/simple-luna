import { z } from "zod";
/**
 * Enhanced Swagger Routes - Interactive API Documentation with OpenAPI 3.0
 */

import { Router, Request, Response } from 'express';
import swaggerUi from 'swagger-ui-express';
import { generateEnhancedSwaggerSpec, enhancedSwaggerUIOptions } from '../swagger/enhanced-swagger.config';

// =============================================================================
// ROUTER SETUP
// =============================================================================

const router = Router();

// =============================================================================
// ENHANCED SWAGGER CONFIGURATION
// =============================================================================

// Cache for performance
let cachedSpec: any = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const getEnhancedSpec = async (req: Request) => {
  const now = Date.now();
  
  // Refresh cache if expired or not exists
  if (!cachedSpec || (now - cacheTimestamp) > CACHE_DURATION) {
    cachedSpec = generateEnhancedSwaggerSpec(req);
    cacheTimestamp = now;
  }
  
  return cachedSpec;
};

// =============================================================================
// ENHANCED API DOCUMENTATION ROUTES
// =============================================================================

/**
 * OpenAPI 3.0 JSON Specification
 */
router.get('/openapi.json', (req: Request, res: Response) => {
  try {
    const spec = getEnhancedSpec(req);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'public, max-age=300'); // 5 minutes cache
    res.json(spec);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to generate OpenAPI specification',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Legacy Swagger 2.0 format (for compatibility)
 */
router.get('/swagger.json', (req: Request, res: Response) => {
  try {
    const spec = getEnhancedSpec(req);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.json(spec);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to generate Swagger specification',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * API Documentation Info and Metadata
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
        openApiVersion: '3.0.3',
      },
      documentation: {
        interactive: `${baseUrl}/docs/`,
        redoc: `${baseUrl}/docs/redoc`,
        openapi: `${baseUrl}/openapi.json`,
        swagger: `${baseUrl}/swagger.json`,
        postman: `${baseUrl}/docs/postman`,
        insomnia: `${baseUrl}/docs/insomnia`,
      },
      features: [
        'OpenAPI 3.0 specification',
        'Interactive API testing with Swagger UI',
        'Comprehensive request/response examples',
        'Schema validation and documentation',
        'Authentication flow documentation',
        'Rate limiting information',
        'Error handling examples',
        'ReDoc alternative documentation',
        'Postman and Insomnia collection exports',
      ],
      endpoints: {
        total: Object.keys(getEnhancedSpec(req).paths || {}).length,
        categories: [
          { name: 'Conversion', count: 4, description: 'File format conversion operations' },
          { name: 'AI Features', count: 3, description: 'AI-powered analysis and translation' },
          { name: 'Enhanced AI', count: 4, description: 'Schema-aware AI operations' },
          { name: 'Extraction', count: 4, description: 'Asset and metadata extraction' },
          { name: 'Async Operations', count: 6, description: 'Background processing with job tracking' },
          { name: 'Batch Operations', count: 3, description: 'High-performance bulk operations' },
          { name: 'System', count: 2, description: 'Health checks and monitoring' },
        ],
      },
      support: {
        email: 'support@lunaserver.com',
        documentation: `${baseUrl}/docs/guide`,
        github: 'https://github.com/lunaserver/api',
        discord: 'https://discord.gg/lunaserver',
      },
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.get('X-Request-ID') || `req_${Date.now()}`,
      version: '1.0.0',
      cacheAge: Math.floor((Date.now() - cacheTimestamp) / 1000),
    },
  };
  
  res.json(response);
});

/**
 * Enhanced Swagger UI Documentation
 */
router.use('/docs/ui', swaggerUi.serve);
router.get('/docs/ui/', (req: Request, res: Response, next) => {
  try {
    const spec = getEnhancedSpec(req);
    const swaggerUiHandler = swaggerUi.setup(spec, enhancedSwaggerUIOptions);
    swaggerUiHandler(req, res, next);
  } catch (error) {
    res.status(500).send(`
      <html>
        <head><title>Documentation Error</title></head>
        <body>
          <h1>Documentation Generation Error</h1>
          <p>Failed to generate API documentation: ${error instanceof Error ? error.message : 'Unknown error'}</p>
          <p><a href="${req.baseUrl}/docs/info">View API Info</a></p>
        </body>
      </html>
    `);
  }
});

/**
 * Main documentation route (redirects to enhanced UI)
 */
router.get('/docs/', (req: Request, res: Response) => {
  res.redirect(301, `${req.baseUrl}/docs/ui/`);
});

/**
 * Enhanced ReDoc Documentation
 */
router.get('/docs/redoc', (req: Request, res: Response) => {
  const baseUrl = `${req.protocol}://${req.get('host')}${req.baseUrl}`;
  
  const redocHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Luna Server API Documentation - ReDoc</title>
        <meta charset="utf-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
        <style>
          body { 
            margin: 0; 
            padding: 0; 
            font-family: 'Inter', sans-serif;
          }
          redoc {
            --redoc-brand-color: #3b82f6;
            --redoc-font-family: 'Inter', sans-serif;
          }
        </style>
      </head>
      <body>
        <redoc 
          spec-url='${baseUrl}/openapi.json'
          theme='light'
          show-object-schema-examples='true'
          expand-responses='200,201'
          required-props-first='true'
          sort-props-alphabetically='true'
          expand-single-schema-field='true'
          menu-toggle='true'
          search-box='true'
          hide-loading='true'
        ></redoc>
        <script src="https://cdn.jsdelivr.net/npm/redoc@2.1.2/bundles/redoc.standalone.js"></script>
      </body>
    </html>
  `;
  
  res.setHeader('Content-Type', 'text/html');
  res.setHeader('Cache-Control', 'public, max-age=3600'); // 1 hour cache
  res.send(redocHtml);
});

/**
 * Enhanced Postman Collection Export
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
    event: [
      {
        listen: 'prerequest',
        script: {
          type: 'text/javascript',
          exec: [
            'pm.globals.set("baseUrl", "' + baseUrl + '");',
            'pm.globals.set("timestamp", new Date().toISOString());',
          ],
        },
      },
    ],
    variable: [
      {
        key: 'baseUrl',
        value: baseUrl,
        type: 'string',
        description: 'Base URL for the Luna API',
      },
    ],
    item: [
      {
        name: 'System',
        description: 'Health checks and system monitoring',
        item: [
          {
            name: 'Health Check',
            request: {
              method: 'GET',
              header: [
                {
                  key: 'Accept',
                  value: 'application/json',
                },
              ],
              url: {
                raw: '{{baseUrl}}/health',
                host: ['{{baseUrl}}'],
                path: ['health'],
              },
              description: 'Check the health of all system components',
            },
            response: [
              {
                name: 'Healthy System',
                originalRequest: {
                  method: 'GET',
                  url: '{{baseUrl}}/health',
                },
                status: 'OK',
                code: 200,
                body: JSON.stringify({
                  success: true,
                  data: {
                    status: 'healthy',
                    services: {
                      aspose: { status: 'healthy', responseTime: 45 },
                      openai: { status: 'healthy', responseTime: 120 },
                      firebase: { status: 'healthy', responseTime: 80 },
                    },
                  },
                }, null, 2),
              },
            ],
          },
        ],
      },
      {
        name: 'Conversion',
        description: 'File format conversion operations',
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
                    description: 'PPTX file to convert (max 50MB)',
                  },
                  {
                    key: 'options',
                    value: JSON.stringify({
                      includeAssets: true,
                      includeMetadata: true,
                      includeAnimations: true,
                    }),
                    type: 'text',
                    description: 'Conversion options (JSON string)',
                  },
                ],
              },
              url: {
                raw: '{{baseUrl}}/pptx2json',
                host: ['{{baseUrl}}'],
                path: ['pptx2json'],
              },
              description: 'Convert PowerPoint presentations to Universal Schema JSON',
            },
          },
        ],
      },
      {
        name: 'Enhanced AI',
        description: 'Schema-aware AI operations',
        item: [
          {
            name: 'Enhanced Analysis',
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
                      title: 'Sample Business Presentation',
                      slideCount: 10,
                    },
                    slides: [],
                  },
                  analysisTypes: ['summary', 'accessibility', 'sentiment'],
                  enhanceWithSchemaKnowledge: true,
                  context: {
                    targetAudience: 'executives',
                    presentationPurpose: 'quarterly_review',
                    industry: 'technology',
                  },
                }, null, 2),
              },
              url: {
                raw: '{{baseUrl}}/analyze-enhanced',
                host: ['{{baseUrl}}'],
                path: ['analyze-enhanced'],
              },
              description: 'Perform schema-aware presentation analysis',
            },
          },
        ],
      },
    ],
  };
  
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename="luna-server-api.postman_collection.json"');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.json(postmanCollection);
});

/**
 * Insomnia Collection Export
 */
router.get('/docs/insomnia', (req: Request, res: Response) => {
  const baseUrl = `${req.protocol}://${req.get('host')}${req.baseUrl}`;
  
  const insomniaExport = {
    _type: 'export',
    __export_format: 4,
    __export_date: new Date().toISOString(),
    __export_source: 'luna-server-api',
    resources: [
      {
        _id: 'wrk_luna',
        _type: 'workspace',
        name: 'Luna Server API',
        description: 'Professional PowerPoint processing API with AI capabilities',
      },
      {
        _id: 'env_base',
        _type: 'environment',
        name: 'Base Environment',
        data: {
          baseUrl: baseUrl,
        },
        parentId: 'wrk_luna',
      },
      {
        _id: 'req_health',
        _type: 'request',
        name: 'Health Check',
        method: 'GET',
        url: '{{ _.baseUrl }}/health',
        headers: [
          {
            name: 'Accept',
            value: 'application/json',
          },
        ],
        parentId: 'wrk_luna',
      },
    ],
  };
  
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename="luna-server-api.insomnia_export.json"');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.json(insomniaExport);
});

/**
 * API Schema Download
 */
router.get('/docs/schema', (req: Request, res: Response) => {
  try {
    const spec = getEnhancedSpec(req);
    const format = req.query.format as string || 'json';
    
    if (format === 'yaml') {
      // Convert to YAML format
      const yaml = require('js-yaml');
      const yamlContent = yaml.dump(spec);
      
      res.setHeader('Content-Type', 'application/x-yaml');
      res.setHeader('Content-Disposition', 'attachment; filename="luna-api-schema.yaml"');
      res.send(yamlContent);
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="luna-api-schema.json"');
      res.json(spec);
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to generate API schema',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Documentation Analytics
 */
router.get('/docs/analytics', (req: Request, res: Response) => {
  const spec = getEnhancedSpec(req);
  const paths = spec.paths || {};
  
  const analytics = {
    success: true,
    data: {
      endpoints: {
        total: Object.keys(paths).length,
        byMethod: Object.values(paths).reduce((acc: any, pathItem: any) => {
          Object.keys(pathItem).forEach(method => {
            acc[method.toLowerCase()] = (acc[method.toLowerCase()] || 0) + 1;
          });
          return acc;
        }, {}),
        byTag: Object.values(paths).reduce((acc: any, pathItem: any) => {
          Object.values(pathItem).forEach((operation: any) => {
            if (operation.tags) {
              operation.tags.forEach((tag: string) => {
                acc[tag] = (acc[tag] || 0) + 1;
              });
            }
          });
          return acc;
        }, {}),
      },
      schemas: {
        total: Object.keys(spec.components?.schemas || {}).length,
        examples: Object.values(spec.components?.schemas || {}).reduce((count: number, schema: any) => {
          return count + (schema.examples ? Object.keys(schema.examples).length : 0);
        }, 0),
      },
      documentation: {
        lastGenerated: new Date(cacheTimestamp).toISOString(),
        cacheAge: Math.floor((Date.now() - cacheTimestamp) / 1000),
        version: spec.info?.version || '1.0.0',
      },
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.get('X-Request-ID') || `req_${Date.now()}`,
    },
  };
  
  res.json(analytics);
});

export default router; 