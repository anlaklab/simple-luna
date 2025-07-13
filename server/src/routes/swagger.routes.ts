import { z } from "zod";
/**
 * Swagger UI Routes - Dynamic Interactive API Documentation
 * 
 * Serves dynamically generated Swagger UI for exploring and testing the API
 * Auto-discovers all endpoints from JSDoc comments in real-time
 */

import { Router, Request, Response } from 'express';
import swaggerUi from 'swagger-ui-express';
import path from 'path';
import fs from 'fs';
import { generateSwaggerSpec } from '../swagger/swagger.config';

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
    .swagger-ui .info .description .markdown h2 { color: #1f2937; font-size: 1.25rem; }
    .swagger-ui .info .description .markdown h3 { color: #374151; font-size: 1.1rem; }
    .swagger-ui .scheme-container .schemes > label { color: #059669; font-weight: 600; }
    .swagger-ui .info .description { line-height: 1.6; }
  `,
  customSiteTitle: 'Luna Server API - Auto-Generated Documentation',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    docExpansion: 'list',
    filter: true,
    showExtensions: true,
    showCommonExtensions: true,
    tryItOutEnabled: true,
    supportedSubmitMethods: ['get', 'post', 'put', 'delete', 'patch'],
    validatorUrl: null, // Disable online validator
  },
};

// =============================================================================
// DYNAMIC SWAGGER SPEC GENERATION
// =============================================================================

/**
 * Generate dynamic OpenAPI spec with current request context
 */
function getDynamicSwaggerSpec async (req: Request): any {
  try {
    console.log('🔄 Generating dynamic Swagger spec for request:', req.url);
    const spec = generateSwaggerSpec(req);
    
         // Add runtime information
     const enhancedSpec = {
       ...spec,
       info: {
         ...(spec as any).info,
         'x-runtime-info': {
           generatedAt: new Date().toISOString(),
           method: 'dynamic-auto-discovery',
           requestUrl: req.url,
           userAgent: req.get('User-Agent') || 'unknown',
           filesScanned: (spec as any).info?.['x-generated']?.filesScanned || 0,
           endpointsFound: Object.keys((spec as any).paths || {}).length,
         },
       },
     };
     
     console.log(`✅ Dynamic spec generated with ${Object.keys((spec as any).paths || {}).length} endpoints`);
    return enhancedSpec;
  } catch (error) {
    console.error('❌ Error generating dynamic Swagger spec:', error);
    
    // Return fallback spec
    return {
      openapi: '3.0.0',
      info: {
        title: 'Luna Server API - Dynamic Generation Error',
        version: '1.0.0',
        description: `
# Dynamic Generation Error

An error occurred while generating the API documentation dynamically.

## Error Details
- **Error**: ${error instanceof Error ? error.message : 'Unknown error'}
- **Time**: ${new Date().toISOString()}
- **URL**: ${req.url}

## Troubleshooting
1. Check server logs for detailed error information
2. Ensure all route files have proper JSDoc @swagger comments
3. Verify TypeScript compilation is successful
4. Check file permissions for source files

## Fallback Options
- Try refreshing the page
- Check /api/v1/health endpoint
- Review server logs for configuration issues
        `,
      },
      servers: [
        {
          url: `${req.protocol}://${req.get('host')}/api/v1`,
          description: 'Current Server (Fallback)',
        },
      ],
      paths: {
        '/health': {
          get: {
            tags: ['System'],
            summary: 'Health Check (Fallback)',
            description: 'Basic health check endpoint',
            responses: {
              '200': {
                description: 'API is healthy',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        status: { type: 'string', example: 'healthy' },
                        timestamp: { type: 'string', format: 'date-time' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      'x-error': {
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        stack: error instanceof Error ? error.stack : undefined,
      },
    };
  }
}

// =============================================================================
// SWAGGER ROUTES
// =============================================================================

/**
 * Dynamic JSON API Routes
 */
router.get('/swagger.json', (req: Request, res: Response) => {
  try {
    const spec = getDynamicSwaggerSpec(req);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.json(spec);
  } catch (error) {
    console.error('❌ Error serving swagger.json:', error);
    res.status(500).json({
      error: 'Failed to generate API specification',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

router.get('/openapi.json', (req: Request, res: Response) => {
  try {
    const spec = getDynamicSwaggerSpec(req);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.json(spec);
  } catch (error) {
    console.error('❌ Error serving openapi.json:', error);
    res.status(500).json({
      error: 'Failed to generate OpenAPI specification',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Documentation info routes
 */
router.get('/docs/info', (req: Request, res: Response) => {
  const baseUrl = `${req.protocol}://${req.get('host')}${req.baseUrl}`;
  
  try {
    const spec = getDynamicSwaggerSpec(req);
    const endpointCount = Object.keys((spec as any).paths || {}).length;
    
    const response = {
      success: true,
      data: {
        api: {
          name: 'Luna Server API',
          version: '1.0.0',
          description: 'Professional PowerPoint processing API with AI capabilities',
          generationMethod: 'dynamic-auto-discovery',
          endpointsFound: endpointCount,
          lastGenerated: new Date().toISOString(),
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
          'Dynamic endpoint discovery',
          'Real-time documentation updates',
          'Interactive API testing',
          'Complete endpoint documentation',
          'Request/response examples',
          'Schema validation details',
          'Authentication information',
          'Rate limiting details',
          'Auto-generated from JSDoc comments',
        ],
                 discovery: {
           method: 'auto-scan',
           filesScanned: (spec as any).info?.['x-runtime-info']?.filesScanned || 0,
           endpointsDiscovered: endpointCount,
           lastScan: new Date().toISOString(),
         },
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
        generated: 'dynamic',
      },
    };
    
    res.json(response);
  } catch (error) {
    console.error('❌ Error serving docs info:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate documentation info',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Dynamic Swagger UI Routes - Setup for both /swagger and /docs
 */

// Main Swagger UI on /swagger/
router.use('/swagger', swaggerUi.serve);
router.get('/swagger/', (req: Request, res: Response, next) => {
  try {
    const dynamicSpec = getDynamicSwaggerSpec(req);
    const swaggerUiHandler = swaggerUi.setup(dynamicSpec, swaggerUiOptions);
    swaggerUiHandler(req, res, next);
  } catch (error) {
    console.error('❌ Error serving Swagger UI on /swagger:', error);
    res.status(500).json({
      error: 'Failed to generate Swagger UI',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

// Alternative Swagger UI on /docs/
router.use('/docs', swaggerUi.serve);
router.get('/docs/', (req: Request, res: Response, next) => {
  try {
    const dynamicSpec = getDynamicSwaggerSpec(req);
    const swaggerUiHandler = swaggerUi.setup(dynamicSpec, swaggerUiOptions);
    swaggerUiHandler(req, res, next);
  } catch (error) {
    console.error('❌ Error serving Swagger UI on /docs:', error);
    res.status(500).json({
      error: 'Failed to generate Swagger UI',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Dynamic stats endpoint
 */
router.get('/docs/stats', (req: Request, res: Response) => {
  try {
    const spec = getDynamicSwaggerSpec(req);
    const paths = async (spec as any).paths || {};
    
    // Analyze endpoints
    const stats = {
      total: Object.keys(paths).length,
      byMethod: {} as Record<string, number>,
      byTag: {} as Record<string, number>,
      endpoints: [] as any[],
    };
    
    Object.entries(paths).forEach(([path, pathItem]: [string, any]) => {
      Object.entries(pathItem).forEach(([method, operation]: [string, any]) => {
        if (method !== 'parameters') {
          // Count by method
          stats.byMethod[method.toUpperCase()] = (stats.byMethod[method.toUpperCase()] || 0) + 1;
          
          // Count by tags
          if (operation.tags) {
            operation.tags.forEach((tag: string) => {
              stats.byTag[tag] = (stats.byTag[tag] || 0) + 1;
            });
          }
          
          // Add endpoint info
          stats.endpoints.push({
            path,
            method: method.toUpperCase(),
            summary: operation.summary || 'No summary',
            tags: operation.tags || [],
            deprecated: operation.deprecated || false,
          });
        }
      });
    });
    
    res.json({
      success: true,
      data: {
                 discovery: {
           generatedAt: new Date().toISOString(),
           method: 'dynamic-auto-discovery',
           filesScanned: (spec as any).info?.['x-runtime-info']?.filesScanned || 0,
         },
         statistics: stats,
         info: (spec as any).info,
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.get('X-Request-ID') || `req_${Date.now()}`,
      },
    });
  } catch (error) {
    console.error('❌ Error serving stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate API statistics',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /docs/postman - Dynamic Postman Collection
 */
router.get('/docs/postman', (req: Request, res: Response) => {
  try {
    const baseUrl = `${req.protocol}://${req.get('host')}/api/v1`;
    const spec = getDynamicSwaggerSpec(req);
    const paths = async (spec as any).paths || {};
    
    // Generate dynamic Postman collection
    const postmanCollection = {
      info: {
        name: 'Luna Server API - Auto-Generated',
        description: 'Dynamically generated Postman collection from Swagger documentation',
        version: '1.0.0',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
        'x-generated': {
          timestamp: new Date().toISOString(),
          method: 'dynamic',
          endpointsCount: Object.keys(paths).length,
        },
      },
      auth: {
        type: 'noauth',
      },
      item: [] as any[],
      variable: [
        {
          key: 'baseUrl',
          value: baseUrl,
          type: 'string',
        },
      ],
    };
    
    // Group endpoints by tags
    const groupedEndpoints: Record<string, any[]> = {};
    
    Object.entries(paths).forEach(([path, pathItem]: [string, any]) => {
      Object.entries(pathItem).forEach(([method, operation]: [string, any]) => {
        if (method !== 'parameters') {
          const tags = operation.tags || ['Uncategorized'];
          const primaryTag = tags[0];
          
          if (!groupedEndpoints[primaryTag]) {
            groupedEndpoints[primaryTag] = [];
          }
          
          groupedEndpoints[primaryTag].push({
            name: operation.summary || `${method.toUpperCase()} ${path}`,
            request: {
              method: method.toUpperCase(),
              header: method.toLowerCase() === 'post' || method.toLowerCase() === 'put' ? [
                {
                  key: 'Content-Type',
                  value: 'application/json',
                },
              ] : [],
              url: {
                raw: `{{baseUrl}}${path}`,
                host: ['{{baseUrl}}'],
                path: path.split('/').filter(p => p),
              },
              description: operation.description || operation.summary || '',
            },
          });
        }
      });
    });
    
    // Add grouped endpoints to collection
    Object.entries(groupedEndpoints).forEach(([groupName, endpoints]) => {
      postmanCollection.item.push({
        name: groupName,
        description: `Endpoints for ${groupName}`,
        item: endpoints,
      });
    });
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="luna-server-api-dynamic.postman_collection.json"');
    res.json(postmanCollection);
  } catch (error) {
    console.error('❌ Error generating Postman collection:', error);
    res.status(500).json({
      error: 'Failed to generate Postman collection',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Refresh/regenerate documentation
 */
router.post('/docs/refresh', (req: Request, res: Response) => {
  try {
    console.log('🔄 Manual documentation refresh requested');
    const spec = getDynamicSwaggerSpec(req);
    
    res.json({
      success: true,
      message: 'Documentation refreshed successfully',
             data: {
         endpointsFound: Object.keys((spec as any).paths || {}).length,
         generatedAt: new Date().toISOString(),
         filesScanned: (spec as any).info?.['x-runtime-info']?.filesScanned || 0,
       },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.get('X-Request-ID') || `req_${Date.now()}`,
      },
    });
  } catch (error) {
    console.error('❌ Error refreshing documentation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh documentation',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router; 