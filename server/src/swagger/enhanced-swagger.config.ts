/**
 * Enhanced Swagger Configuration - OpenAPI 3.0 with comprehensive schemas
 */

import { Request } from 'express';

// =============================================================================
// OPENAPI 3.0 SPECIFICATION
// =============================================================================

export function generateEnhancedSwaggerSpec(req: Request) {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  
  return {
    openapi: '3.0.3',
    info: {
      title: 'Luna Server API',
      version: '1.0.0',
      description: `
        # Luna Server API - Professional PowerPoint Processing Platform
        
        Luna is a comprehensive PowerPoint processing platform with AI capabilities that converts PPTX files 
        to Universal JSON schema and provides advanced analysis through a powerful REST API.
        
        ## Key Features
        - 🔄 **PPTX ↔ JSON Conversion** with Universal Schema support
        - 🤖 **AI-Powered Analysis** including sentiment, accessibility, and design critique  
        - 🌍 **AI Translation** with schema preservation
        - 📊 **Asset Extraction** from presentations (images, videos, audio)
        - 🔍 **Metadata Extraction** with comprehensive document properties
        - ⚡ **Async Processing** for large files with job tracking
        - 📈 **Batch Operations** with performance optimization
        - 🎯 **Enhanced AI** with Universal Schema awareness
        
        ## Getting Started
        1. Upload a PPTX file using the conversion endpoints
        2. Extract assets or metadata as needed
        3. Use AI features for analysis and translation
        4. Monitor async operations through job endpoints
        
        ## Rate Limits
        - Basic operations: 100 requests/minute
        - File uploads: 50 requests/minute  
        - AI operations: 20 requests/minute
      `,
      termsOfService: `${baseUrl}/terms`,
      contact: {
        name: 'Luna API Support',
        email: 'support@lunaserver.com',
        url: `${baseUrl}/support`,
      },
      license: {
        name: 'MIT License',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    
    servers: [
      {
        url: baseUrl,
        description: 'Current Server (Production)',
      },
    ],
    
    tags: [
      {
        name: 'Conversion',
        description: 'File format conversion operations (PPTX ↔ JSON, PDF, HTML)',
      },
      {
        name: 'AI Features',
        description: 'AI-powered analysis, translation, and chat functionality',
      },
      {
        name: 'Enhanced AI',
        description: 'Schema-aware AI with Universal Schema optimization',
      },
      {
        name: 'Extraction',
        description: 'Asset and metadata extraction from presentations',
      },
      {
        name: 'Dynamic Extensions',
        description: 'Runtime extension management and testing - zero-config scalability',
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
        name: 'System',
        description: 'Health checks, monitoring, and system information',
      },
    ],
    
    paths: {
      '/health': {
        get: {
          tags: ['System'],
          summary: 'System health check',
          description: 'Check the health of all system components including Aspose, OpenAI, Firebase, and system resources',
          responses: {
            '200': {
              description: 'System health status',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/HealthCheckResponse' },
                  examples: {
                    healthy: {
                      summary: 'All systems healthy',
                      value: {
                        success: true,
                        data: {
                          status: 'healthy',
                          services: {
                            aspose: { status: 'healthy', responseTime: 45 },
                            openai: { status: 'healthy', responseTime: 120 },
                            firebase: { status: 'healthy', responseTime: 80 },
                          },
                          system: {
                            memory: { used: 256, total: 1024, percentage: 25 },
                            cpu: { usage: 15 },
                            uptime: 86400,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      
      '/pptx2json': {
        post: {
          tags: ['Conversion'],
          summary: 'Convert PPTX to Universal JSON',
          description: 'Convert PowerPoint presentations to Universal Schema JSON format with full fidelity tracking',
          requestBody: {
            required: true,
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  properties: {
                    file: {
                      type: 'string',
                      format: 'binary',
                      description: 'PPTX file to convert (max 50MB)',
                    },
                    options: {
                      type: 'string',
                      description: 'JSON string with conversion options',
                      example: '{"includeAssets":true,"includeMetadata":true,"includeAnimations":true}',
                    },
                  },
                  required: ['file'],
                },
                examples: {
                  basic: {
                    summary: 'Basic conversion',
                    value: {
                      options: '{"includeMetadata":true,"includeAnimations":true}',
                    },
                  },
                  withAssets: {
                    summary: 'Conversion with asset extraction',
                    value: {
                      options: '{"includeAssets":true,"includeMetadata":true,"includeAnimations":true,"extractImages":true}',
                    },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Conversion successful',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ConversionResponse' },
                  examples: {
                    success: {
                      summary: 'Successful conversion',
                      value: {
                        success: true,
                        data: {
                          presentation: {
                            metadata: {
                              id: 'pres_abc123',
                              title: 'Business Presentation',
                              slideCount: 15,
                            },
                            slides: [],
                          },
                          fidelityReport: {
                            score: 95,
                            quality: 'excellent',
                            issues: [],
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            '400': { $ref: '#/components/responses/ValidationError' },
            '413': { $ref: '#/components/responses/FileTooLarge' },
            '500': { $ref: '#/components/responses/ServerError' },
          },
        },
      },
      
      '/analyze-enhanced': {
        post: {
          tags: ['Enhanced AI'],
          summary: 'Schema-aware presentation analysis',
          description: 'Advanced AI analysis with Universal Schema awareness and compliance validation',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/EnhancedAnalysisRequest' },
                examples: {
                  comprehensive: {
                    summary: 'Comprehensive analysis',
                    value: {
                      presentationData: {
                        metadata: { title: 'Sample Presentation', slideCount: 10 },
                        slides: [],
                      },
                      analysisTypes: ['summary', 'accessibility', 'sentiment', 'designCritique'],
                      enhanceWithSchemaKnowledge: true,
                      context: {
                        targetAudience: 'executives',
                        presentationPurpose: 'quarterly_review',
                        industry: 'technology',
                      },
                    },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Analysis completed',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/EnhancedAnalysisResponse' },
                },
              },
            },
            '400': { $ref: '#/components/responses/ValidationError' },
            '503': { $ref: '#/components/responses/ServiceUnavailable' },
          },
        },
      },
    },
    
    components: {
      schemas: {
        // Base Response Schemas
        SuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: { type: 'object' },
            meta: { $ref: '#/components/schemas/ResponseMeta' },
          },
        },
        
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                type: { type: 'string', example: 'validation_error' },
                code: { type: 'string', example: 'INVALID_FILE_TYPE' },
                message: { type: 'string', example: 'File type not supported' },
                details: { type: 'array', items: { type: 'object' } },
              },
            },
            meta: { $ref: '#/components/schemas/ResponseMeta' },
          },
        },
        
        ResponseMeta: {
          type: 'object',
          properties: {
            timestamp: { type: 'string', format: 'date-time' },
            requestId: { type: 'string', example: 'req_abc123' },
            processingTimeMs: { type: 'number', example: 1250 },
            version: { type: 'string', example: '1.0.0' },
          },
        },
        
        // System Schemas
        HealthCheckResponse: {
          allOf: [
            { $ref: '#/components/schemas/SuccessResponse' },
            {
              type: 'object',
              properties: {
                data: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', enum: ['healthy', 'degraded', 'unhealthy'] },
                    services: {
                      type: 'object',
                      properties: {
                        aspose: { $ref: '#/components/schemas/ServiceHealth' },
                        openai: { $ref: '#/components/schemas/ServiceHealth' },
                        firebase: { $ref: '#/components/schemas/ServiceHealth' },
                      },
                    },
                    system: {
                      type: 'object',
                      properties: {
                        memory: {
                          type: 'object',
                          properties: {
                            used: { type: 'number' },
                            total: { type: 'number' },
                            percentage: { type: 'number' },
                          },
                        },
                        cpu: { type: 'object', properties: { usage: { type: 'number' } } },
                        uptime: { type: 'number' },
                      },
                    },
                  },
                },
              },
            },
          ],
        },
        
        ServiceHealth: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['healthy', 'degraded', 'unhealthy'] },
            responseTime: { type: 'number' },
            lastCheck: { type: 'string', format: 'date-time' },
            errors: { type: 'array', items: { type: 'string' } },
          },
        },
        
        // Conversion Schemas
        ConversionResponse: {
          allOf: [
            { $ref: '#/components/schemas/SuccessResponse' },
            {
              type: 'object',
              properties: {
                data: {
                  type: 'object',
                  properties: {
                    presentation: { $ref: '#/components/schemas/UniversalPresentation' },
                    fidelityReport: { $ref: '#/components/schemas/FidelityReport' },
                    processingStats: { $ref: '#/components/schemas/ProcessingStats' },
                  },
                },
              },
            },
          ],
        },
        
        UniversalPresentation: {
          type: 'object',
          properties: {
            metadata: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                title: { type: 'string' },
                author: { type: 'string' },
                created: { type: 'string', format: 'date-time' },
                modified: { type: 'string', format: 'date-time' },
                slideCount: { type: 'number' },
                version: { type: 'string' },
              },
            },
            slides: {
              type: 'array',
              items: { $ref: '#/components/schemas/UniversalSlide' },
            },
          },
        },
        
        UniversalSlide: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            index: { type: 'number' },
            title: { type: 'string' },
            shapes: {
              type: 'array',
              items: { $ref: '#/components/schemas/UniversalShape' },
            },
            background: { type: 'object' },
            animations: { type: 'array' },
            transitions: { type: 'object' },
          },
        },
        
        UniversalShape: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            type: { type: 'string', enum: ['textBox', 'rectangle', 'ellipse', 'image', 'chart', 'table'] },
            geometry: { type: 'object' },
            text: { type: 'string' },
            formatting: { type: 'object' },
            animations: { type: 'array' },
          },
        },
        
        FidelityReport: {
          type: 'object',
          properties: {
            score: { type: 'number', minimum: 0, maximum: 100 },
            quality: { type: 'string', enum: ['excellent', 'good', 'fair', 'poor'] },
            issues: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: { type: 'string' },
                  severity: { type: 'string', enum: ['low', 'medium', 'high'] },
                  description: { type: 'string' },
                  recommendation: { type: 'string' },
                },
              },
            },
          },
        },
        
        ProcessingStats: {
          type: 'object',
          properties: {
            processingTimeMs: { type: 'number' },
            slideCount: { type: 'number' },
            shapeCount: { type: 'number' },
            memoryUsedMB: { type: 'number' },
            conversionMethod: { type: 'string' },
          },
        },
        
        // =============================================================================
        // DYNAMIC EXTENSIONS SCHEMAS
        // =============================================================================
        
        DynamicExtension: {
          type: 'object',
          description: 'Dynamic extension metadata and capabilities',
          properties: {
            name: {
              type: 'string',
              description: 'Extension name',
              example: 'chart',
            },
            version: {
              type: 'string',
              description: 'Extension version',
              example: '1.0.0',
            },
            loadedAt: {
              type: 'string',
              format: 'date-time',
              description: 'When the extension was loaded',
            },
            supportedTypes: {
              type: 'array',
              items: { type: 'string' },
              description: 'Shape types supported by this extension',
              example: ['Chart', 'ChartObject'],
            },
            filePath: {
              type: 'string',
              description: 'Path to extension file',
              example: './src/modules/shared/extensions/chart-extension.ts',
            },
          },
          required: ['name', 'version', 'loadedAt', 'supportedTypes'],
        },
        
        DynamicExtensionCapabilities: {
          type: 'object',
          description: 'Extension runtime capabilities',
          properties: {
            name: { type: 'string' },
            version: { type: 'string' },
            supportedTypes: {
              type: 'array',
              items: { type: 'string' },
            },
            hasInitialize: {
              type: 'boolean',
              description: 'Extension has initialize method',
            },
            hasDispose: {
              type: 'boolean',
              description: 'Extension has dispose method',
            },
            hasValidate: {
              type: 'boolean',
              description: 'Extension has validate method',
            },
            hasExtract: {
              type: 'boolean',
              description: 'Extension has extract method (required)',
            },
          },
        },
        
        ExtensionTestResult: {
          type: 'object',
          description: 'Result of extension testing',
          properties: {
            extensionType: { type: 'string' },
            testTimestamp: { type: 'string', format: 'date-time' },
            tests: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  test: { type: 'string' },
                  success: { type: 'boolean' },
                  result: { type: 'object' },
                  error: { type: 'string' },
                  note: { type: 'string' },
                },
              },
            },
            summary: {
              type: 'object',
              properties: {
                total: { type: 'number' },
                passed: { type: 'number' },
                failed: { type: 'number' },
                passRate: { type: 'string' },
              },
            },
          },
        },
        
        DynamicExtensionsStats: {
          type: 'object',
          description: 'Comprehensive dynamic extensions system statistics',
          properties: {
            loading: {
              type: 'object',
              description: 'Dynamic loading statistics',
              properties: {
                registry: {
                  type: 'object',
                  properties: {
                    initialized: { type: 'boolean' },
                    totalExtensions: { type: 'number' },
                    types: {
                      type: 'array',
                      items: { type: 'string' },
                    },
                  },
                },
                security: {
                  type: 'object',
                  nullable: true,
                  description: 'Security validation statistics',
                },
              },
            },
            factory: {
              type: 'object',
              description: 'Factory statistics',
              properties: {
                totalLoaded: { type: 'number' },
                types: {
                  type: 'array',
                  items: { type: 'string' },
                },
                config: { type: 'object' },
              },
            },
            validation: {
              type: 'object',
              properties: {
                valid: { type: 'boolean' },
                issues: {
                  type: 'array',
                  items: { type: 'string' },
                },
              },
            },
            systemHealth: {
              type: 'object',
              properties: {
                registryValid: { type: 'boolean' },
                totalIssues: { type: 'number' },
                lastCheck: { type: 'string', format: 'date-time' },
              },
            },
          },
        },
        
        ExtensionReloadRequest: {
          type: 'object',
          description: 'Request to reload extensions with new configuration',
          properties: {
            enabledExtensions: {
              type: 'array',
              items: { type: 'string' },
              description: 'Extension types to enable',
              default: ['chart', 'table', 'video'],
              example: ['chart', 'table', 'video', 'audio'],
            },
            maxExtensions: {
              type: 'number',
              description: 'Maximum extensions to load',
              default: 20,
              minimum: 1,
              maximum: 50,
            },
          },
        },
        
        ExtensionHealthCheck: {
          type: 'object',
          description: 'Dynamic extensions system health status',
          properties: {
            status: {
              type: 'string',
              enum: ['healthy', 'degraded', 'unhealthy'],
              description: 'Overall system health',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
            },
            registry: {
              type: 'object',
              properties: {
                initialized: { type: 'boolean' },
                extensionCount: { type: 'number' },
                loadedTypes: {
                  type: 'array',
                  items: { type: 'string' },
                },
              },
            },
            validation: {
              type: 'object',
              properties: {
                valid: { type: 'boolean' },
                issues: {
                  type: 'array',
                  items: { type: 'string' },
                },
              },
            },
            security: {
              type: 'object',
              nullable: true,
              description: 'Security validation results',
            },
          },
        },
        
        // Enhanced AI Schemas
        EnhancedAnalysisRequest: {
          type: 'object',
          properties: {
            presentationData: { $ref: '#/components/schemas/UniversalPresentation' },
            analysisTypes: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['summary', 'sentiment', 'accessibility', 'designCritique', 'suggestions'],
              },
            },
            enhanceWithSchemaKnowledge: { type: 'boolean', default: true },
            context: {
              type: 'object',
              properties: {
                targetAudience: { type: 'string' },
                presentationPurpose: { type: 'string' },
                industry: { type: 'string' },
              },
            },
          },
          required: ['presentationData'],
        },
        
        EnhancedAnalysisResponse: {
          allOf: [
            { $ref: '#/components/schemas/SuccessResponse' },
            {
              type: 'object',
              properties: {
                data: {
                  type: 'object',
                  properties: {
                    analysis: {
                      type: 'object',
                      properties: {
                        summary: { type: 'object' },
                        sentiment: { type: 'object' },
                        accessibility: { type: 'object' },
                        suggestions: { type: 'array' },
                      },
                    },
                    schemaCompliance: {
                      type: 'object',
                      properties: {
                        isCompliant: { type: 'boolean' },
                        version: { type: 'string' },
                        recommendations: { type: 'array', items: { type: 'string' } },
                      },
                    },
                  },
                },
              },
            },
          ],
        },
      },
      
      responses: {
        ValidationError: {
          description: 'Validation error',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              examples: {
                invalidFile: {
                  summary: 'Invalid file type',
                  value: {
                    success: false,
                    error: {
                      type: 'validation_error',
                      code: 'INVALID_FILE_TYPE',
                      message: 'File type not supported',
                      details: [
                        {
                          field: 'file',
                          message: 'Only PPTX files are supported',
                          code: 'invalid_type',
                        },
                      ],
                    },
                  },
                },
              },
            },
          },
        },
        
        FileTooLarge: {
          description: 'File size exceeds limit',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              examples: {
                fileTooLarge: {
                  summary: 'File exceeds size limit',
                  value: {
                    success: false,
                    error: {
                      type: 'validation_error',
                      code: 'FILE_TOO_LARGE',
                      message: 'File size exceeds maximum allowed limit of 50MB',
                    },
                  },
                },
              },
            },
          },
        },
        
        ServiceUnavailable: {
          description: 'Service temporarily unavailable',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              examples: {
                aiUnavailable: {
                  summary: 'AI service unavailable',
                  value: {
                    success: false,
                    error: {
                      type: 'service_error',
                      code: 'AI_SERVICE_UNAVAILABLE',
                      message: 'AI analysis service is temporarily unavailable',
                    },
                  },
                },
              },
            },
          },
        },
        
        ServerError: {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              examples: {
                generic: {
                  summary: 'Generic server error',
                  value: {
                    success: false,
                    error: {
                      type: 'server_error',
                      code: 'INTERNAL_ERROR',
                      message: 'An internal server error occurred',
                    },
                  },
                },
              },
            },
          },
        },
      },
      
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'API key for authentication (if required)',
        },
      },
    },
    
    security: [],
    
    externalDocs: {
      description: 'Find more information about Luna Server',
      url: `${baseUrl}/docs/guide`,
    },
  };
}

// =============================================================================
// SWAGGER UI OPTIONS
// =============================================================================

export const enhancedSwaggerUIOptions = {
  customCss: `
    .swagger-ui .topbar { display: none; }
    .swagger-ui .info { margin: 50px 0; }
    .swagger-ui .info .title { color: #3b82f6; font-size: 36px; }
    .swagger-ui .info .description { font-size: 16px; line-height: 1.6; }
    .swagger-ui .scheme-container { 
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
      padding: 20px; 
      border-radius: 12px; 
      color: white;
    }
    .swagger-ui .btn.authorize { 
      background-color: #10b981; 
      border-color: #10b981; 
      border-radius: 8px;
    }
    .swagger-ui .btn.authorize:hover { 
      background-color: #059669; 
      border-color: #059669; 
    }
    .swagger-ui .opblock.opblock-get .opblock-summary-method {
      background: #61affe;
    }
    .swagger-ui .opblock.opblock-post .opblock-summary-method {
      background: #49cc90;
    }
    .swagger-ui .opblock.opblock-delete .opblock-summary-method {
      background: #f93e3e;
    }
    .swagger-ui .response-col_status {
      font-weight: bold;
    }
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
    requestInterceptor: (req: any) => {
      req.headers['X-API-Client'] = 'swagger-ui';
      return req;
    },
    responseInterceptor: (res: any) => {
      console.log('Response:', res);
      return res;
    },
  },
}; 