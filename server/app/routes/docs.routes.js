/**
 * Documentation Routes
 * 
 * Routes for API documentation and Swagger UI
 */

const express = require('express');
const router = express.Router();
const swaggerUi = require('swagger-ui-express');
const { generateSwaggerSpec, getSwaggerUiOptions } = require('../docs/swagger');

// Get swagger UI options (static)
const swaggerUiOptions = getSwaggerUiOptions();

// Swagger UI - generate spec dynamically
router.use('/docs', swaggerUi.serve, (req, res, next) => {
  const swaggerSpec = generateSwaggerSpec();
  swaggerUi.setup(swaggerSpec, swaggerUiOptions)(req, res, next);
});

// Swagger JSON endpoint - generate spec dynamically
router.get('/swagger.json', (req, res) => {
  const swaggerSpec = generateSwaggerSpec();
  res.setHeader('Content-Type', 'application/json');
  res.json(swaggerSpec);
});

// Documentation info endpoint  
router.get('/docs/info', (req, res) => {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  
  res.json({
    success: true,
    data: {
      api: {
        name: 'Luna Server API',
        version: '1.0.0',
        description: 'Professional PowerPoint processing API with AI capabilities',
      },
      documentation: {
        swagger: `${baseUrl}/api/v1/docs`,
        json: `${baseUrl}/api/v1/swagger.json`,
        interactive: `${baseUrl}/api/v1/docs`,
      },
      endpoints: {
        health: `${baseUrl}/api/v1/health`,
        presentations: `${baseUrl}/api/v1/presentations`,
        aiGenerate: `${baseUrl}/api/v1/ai/generate-presentation`,
        sessions: `${baseUrl}/api/v1/sessions`,
        validation: `${baseUrl}/api/v1/validate-schema`,
      },
      features: [
        'Interactive API testing',
        'Complete endpoint documentation', 
        'Request/response examples',
        'Schema validation details',
        'Session management',
        'AI presentation generation',
        'Firebase integration',
      ],
      services: {
        firebase: process.env.FIREBASE_PROJECT_ID ? 'configured' : 'not_configured',
        openai: process.env.OPENAI_API_KEY ? 'configured' : 'not_configured',
        validation: 'active',
      },
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: `req_${Date.now()}`,
      version: '1.0',
    },
  });
});

module.exports = router; 