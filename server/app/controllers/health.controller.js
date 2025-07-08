/**
 * Health Controller
 * 
 * Handles health check and system status endpoints
 */

const { isFirebaseInitialized } = require('../../config/firebase');

/**
 * @swagger
 * /health:
 *   get:
 *     tags: [Health]
 *     summary: Service health check
 *     description: Returns the current health status of all services
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/HealthStatus'
 */
const getHealthStatus = (req, res) => {
  try {
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '1.0',
      services: {
        conversion: 'healthy',
        aspose: 'not_implemented',
        firebase: isFirebaseInitialized() ? 'connected' : 'not_configured',
      },
    };

    res.json({
      success: true,
      data: healthData,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: `req_${Date.now()}`,
        processingTimeMs: 0,
        version: '1.0',
      },
    });
  } catch (error) {
    console.error('❌ Health check failed:', error);
    res.status(500).json({
      success: false,
      error: {
        type: 'server_error',
        code: 'HEALTH_CHECK_ERROR',
        message: 'Health check failed',
      },
    });
  }
};

/**
 * @swagger
 * /status:
 *   get:
 *     tags: [Health]
 *     summary: Server status endpoint
 *     description: Returns server status and basic metrics
 *     responses:
 *       200:
 *         description: Server status retrieved successfully
 */
const getServerStatus = (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        status: 'running',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        firebase: isFirebaseInitialized() ? 'connected' : 'not_configured',
        jobs: {
          recent: [],
          stats: {
            total: 0,
            completed: 0,
            processing: 0,
            failed: 0,
          },
        },
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: `req_${Date.now()}`,
        processingTimeMs: 1,
      },
    });
  } catch (error) {
    console.error('❌ Status check failed:', error);
    res.status(500).json({
      success: false,
      error: {
        type: 'server_error',
        code: 'STATUS_CHECK_ERROR',
        message: 'Status check failed',
      },
    });
  }
};

module.exports = {
  getHealthStatus,
  getServerStatus
}; 