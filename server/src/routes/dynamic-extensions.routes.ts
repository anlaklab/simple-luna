import { z } from "zod";
/**
 * Dynamic Extensions Routes
 * 
 * Endpoints for managing, testing, and monitoring the dynamic extension loading system.
 * Provides administrative interface for runtime extension management.
 */

import { Router } from 'express';
import { 
  getDynamicRegistry,
  getDynamicExtension,
  getExtensionMetadata,
  getLoadedExtensionTypes,
  getDynamicLoadingStats,
  validateDynamicRegistry,
  reloadDynamicComponents,
  moduleFactory
} from '../modules/shared/factories/module.factory';
import { logger } from '../utils/logger';

const router = Router();

// =============================================================================
// EXTENSION REGISTRY ENDPOINTS
// =============================================================================

/**
 * @swagger
 * /dynamic-extensions:
 *   get:
 *     tags: [Dynamic Extensions]
 *     summary: List all loaded dynamic extensions
 *     description: Retrieves a list of all currently loaded dynamic extensions with their metadata
 *     responses:
 *       200:
 *         description: Successfully retrieved extensions list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalExtensions:
 *                       type: number
 *                       description: Total number of loaded extensions
 *                       example: 3
 *                     loadedTypes:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: Array of loaded extension types
 *                       example: ["chart", "table", "video"]
 *                     extensions:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                             example: "chart"
 *                           version:
 *                             type: string
 *                             example: "1.0.0"
 *                           loadedAt:
 *                             type: string
 *                             format: date-time
 *                           supportedTypes:
 *                             type: array
 *                             items:
 *                               type: string
 *                             example: ["Chart", "ChartObject"]
 *                           filePath:
 *                             type: string
 *                             example: "./src/modules/shared/extensions/chart-extension.ts"
 *       500:
 *         description: Failed to retrieve extension registry
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/', (req, res) => {
  try {
    const registry = getDynamicRegistry();
    const loadedTypes = getLoadedExtensionTypes();
    const metadata = getExtensionMetadata() as any[];

    res.json({
      success: true,
      data: {
        totalExtensions: registry.size,
        loadedTypes,
        extensions: metadata.map(meta => ({
          name: meta.name,
          version: meta.version,
          loadedAt: meta.loadedAt,
          supportedTypes: meta.supportedTypes,
          filePath: meta.filePath.replace(process.cwd(), '.')
        }))
      }
    });

  } catch (error) {
    logger.error('Failed to list dynamic extensions', { error: (error as Error).message });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve extension registry'
    });
  }
});

/**
 * @swagger
 * /dynamic-extensions/stats:
 *   get:
 *     tags: [Dynamic Extensions]
 *     summary: Get comprehensive statistics about dynamic loading system
 *     description: Returns detailed statistics about the dynamic extension loading system including security metrics
 *     responses:
 *       200:
 *         description: Successfully retrieved system statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     loading:
 *                       type: object
 *                       description: Dynamic loading statistics
 *                     factory:
 *                       type: object
 *                       description: Factory statistics
 *                     validation:
 *                       type: object
 *                       properties:
 *                         valid:
 *                           type: boolean
 *                         issues:
 *                           type: array
 *                           items:
 *                             type: string
 *                     systemHealth:
 *                       type: object
 *                       properties:
 *                         registryValid:
 *                           type: boolean
 *                         totalIssues:
 *                           type: number
 *                         lastCheck:
 *                           type: string
 *                           format: date-time
 *       500:
 *         description: Failed to retrieve system statistics
 */
router.get('/stats', (req, res) => {
  try {
    const stats = getDynamicLoadingStats();
    const factoryStats = moduleFactory.getDynamicExtensionStats();
    const validation = validateDynamicRegistry();

    res.json({
      success: true,
      data: {
        loading: stats,
        factory: factoryStats,
        validation,
        systemHealth: {
          registryValid: validation.valid,
          totalIssues: validation.issues.length,
          lastCheck: new Date().toISOString()
        }
      }
    });

  } catch (error) {
    logger.error('Failed to get dynamic loading stats', { error: (error as Error).message });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve system statistics'
    });
  }
});

/**
 * @swagger
 * /dynamic-extensions/{type}:
 *   get:
 *     tags: [Dynamic Extensions]
 *     summary: Get specific extension details and capabilities
 *     description: Retrieves detailed information about a specific loaded extension
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *         description: Extension type (e.g., chart, table, video)
 *         example: chart
 *     responses:
 *       200:
 *         description: Successfully retrieved extension details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     type:
 *                       type: string
 *                       example: "chart"
 *                     capabilities:
 *                       type: object
 *                       properties:
 *                         name:
 *                           type: string
 *                         version:
 *                           type: string
 *                         supportedTypes:
 *                           type: array
 *                           items:
 *                             type: string
 *                         hasInitialize:
 *                           type: boolean
 *                         hasDispose:
 *                           type: boolean
 *                         hasValidate:
 *                           type: boolean
 *                         hasExtract:
 *                           type: boolean
 *                     metadata:
 *                       type: object
 *                     runtime:
 *                       type: object
 *                       properties:
 *                         loaded:
 *                           type: boolean
 *                         available:
 *                           type: boolean
 *                         lastAccessed:
 *                           type: string
 *                           format: date-time
 *       404:
 *         description: Extension not found
 *       500:
 *         description: Failed to retrieve extension details
 */
router.get('/:type', (req, res) => {
  try {
    const { type } = req.params;
    const extension = getDynamicExtension(type);
    const metadata = getExtensionMetadata(type);

    if (!extension) {
      return res.status(404).json({
        success: false,
        error: `Extension '${type}' not found`
      });
    }

    // Get extension capabilities
    const capabilities = {
      name: extension.name || type,
      version: extension.version || 'unknown',
      supportedTypes: extension.supportedTypes || [],
      hasInitialize: typeof extension.initialize === 'function',
      hasDispose: typeof extension.dispose === 'function',
      hasValidate: typeof extension.validate === 'function',
      hasExtract: typeof extension.extract === 'function'
    };

    return res.json({
      success: true,
      data: {
        type,
        capabilities,
        metadata,
        runtime: {
          loaded: true,
          available: true,
          lastAccessed: new Date().toISOString()
        }
      }
    });

  } catch (error) {
    logger.error(`Failed to get extension ${req.params.type}`, { error: (error as Error).message });
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve extension details'
    });
  }
});

// =============================================================================
// EXTENSION TESTING ENDPOINTS
// =============================================================================

/**
 * @swagger
 * /dynamic-extensions/{type}/test:
 *   post:
 *     tags: [Dynamic Extensions]
 *     summary: Test extension with mock data
 *     description: Tests a specific extension with optional test data to verify functionality
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *         description: Extension type to test
 *         example: chart
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               testData:
 *                 type: object
 *                 nullable: true
 *                 description: Test data to pass to extension (optional)
 *               options:
 *                 type: object
 *                 description: Extension options (optional)
 *           example:
 *             testData: null
 *             options: {}
 *     responses:
 *       200:
 *         description: Test completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     extensionType:
 *                       type: string
 *                     testTimestamp:
 *                       type: string
 *                       format: date-time
 *                     tests:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           test:
 *                             type: string
 *                           success:
 *                             type: boolean
 *                           result:
 *                             type: object
 *                           error:
 *                             type: string
 *                     summary:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: number
 *                         passed:
 *                           type: number
 *                         failed:
 *                           type: number
 *                         passRate:
 *                           type: string
 *       404:
 *         description: Extension not found
 *       500:
 *         description: Extension test failed
 */
router.post('/:type/test', async (req, res) => {
  try {
    const { type } = req.params;
    const { testData = null, options = {} } = req.body;

    const extension = getDynamicExtension(type);
    if (!extension) {
      return res.status(404).json({
        success: false,
        error: `Extension '${type}' not found`
      });
    }

    logger.info(`Testing dynamic extension: ${type}`);

    // Test basic functionality
    const testResults: any = {
      extensionType: type,
      testTimestamp: new Date().toISOString(),
      tests: []
    };

    // Test 1: Basic properties
    try {
      testResults.tests.push({
        test: 'properties',
        success: true,
        result: {
          name: extension.name,
          version: extension.version,
          supportedTypes: extension.supportedTypes
        }
      });
    } catch (error) {
      testResults.tests.push({
        test: 'properties',
        success: false,
        error: (error as Error).message
      });
    }

    // Test 2: Extract method with null (should handle gracefully)
    try {
      const extractResult = await extension.extract(null, options);
      testResults.tests.push({
        test: 'extract_null',
        success: true,
        result: extractResult
      });
    } catch (error) {
      testResults.tests.push({
        test: 'extract_null',
        success: false,
        error: (error as Error).message,
        note: 'Expected to fail gracefully with null input'
      });
    }

    // Test 3: Extract method with test data (if provided)
    if (testData) {
      try {
        const extractResult = await extension.extract(testData, options);
        testResults.tests.push({
          test: 'extract_data',
          success: true,
          result: extractResult
        });
      } catch (error) {
        testResults.tests.push({
          test: 'extract_data',
          success: false,
          error: (error as Error).message
        });
      }
    }

    // Test 4: Optional methods
    if (extension.initialize) {
      try {
        await extension.initialize();
        testResults.tests.push({
          test: 'initialize',
          success: true,
          result: 'Initialization completed'
        });
      } catch (error) {
        testResults.tests.push({
          test: 'initialize',
          success: false,
          error: (error as Error).message
        });
      }
    }

    const successfulTests = testResults.tests.filter((t: any) => t.success).length;
    const totalTests = testResults.tests.length;

    return res.json({
      success: true,
      data: {
        ...testResults,
        summary: {
          total: totalTests,
          passed: successfulTests,
          failed: totalTests - successfulTests,
          passRate: totalTests > 0 ? (successfulTests / totalTests * 100).toFixed(2) + '%' : '0%'
        }
      }
    });

  } catch (error) {
    logger.error(`Extension test failed for ${req.params.type}`, { error: (error as Error).message });
    return res.status(500).json({
      success: false,
      error: 'Extension test failed',
      details: (error as Error).message
    });
  }
});

/**
 * @swagger
 * /dynamic-extensions/test-all:
 *   post:
 *     tags: [Dynamic Extensions]
 *     summary: Test all loaded extensions
 *     description: Runs tests on all currently loaded extensions and returns a summary
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               options:
 *                 type: object
 *                 description: Options to pass to all extensions
 *           example:
 *             options: {}
 *     responses:
 *       200:
 *         description: Bulk testing completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     summary:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: number
 *                         passed:
 *                           type: number
 *                         failed:
 *                           type: number
 *                         passRate:
 *                           type: string
 *                     results:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           type:
 *                             type: string
 *                           timestamp:
 *                             type: string
 *                             format: date-time
 *                           success:
 *                             type: boolean
 *                           tests:
 *                             type: object
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *       500:
 *         description: Bulk testing failed
 */
router.post('/test-all', async (req, res) => {
  try {
    const { options = {} } = req.body;
    const loadedTypes = getLoadedExtensionTypes();

    logger.info(`Testing all dynamic extensions: ${loadedTypes.length} extensions`);

    const allResults: any[] = [];

    for (const type of loadedTypes) {
      try {
        const extension = getDynamicExtension(type);
        if (!extension) continue;

        const testResult = {
          type,
          timestamp: new Date().toISOString(),
          success: false,
          error: null as string | null,
          tests: {
            properties: false,
            extract: false,
            initialize: false
          }
        };

        // Test properties
        try {
          const _ = extension.name && extension.version && extension.supportedTypes;
          testResult.tests.properties = true;
        } catch (error) {
          testResult.error = `Properties test failed: ${(error as Error).message}`;
        }

        // Test extract method
        try {
          await extension.extract(null, options);
          testResult.tests.extract = true;
        } catch (error) {
          // Expected to fail with null, but shouldn't crash
          if (!(error as Error).message.includes('system') && !(error as Error).message.includes('process')) {
            testResult.tests.extract = true;
          }
        }

        // Test initialize if available
        if (extension.initialize) {
          try {
            await extension.initialize();
            testResult.tests.initialize = true;
          } catch (error) {
            testResult.error = `Initialize test failed: ${(error as Error).message}`;
          }
        } else {
          testResult.tests.initialize = true; // Not required
        }

        testResult.success = testResult.tests.properties && testResult.tests.extract && testResult.tests.initialize;
        allResults.push(testResult);

      } catch (error) {
        allResults.push({
          type,
          timestamp: new Date().toISOString(),
          success: false,
          error: (error as Error).message,
          tests: { properties: false, extract: false, initialize: false }
        });
      }
    }

    const successfulExtensions = allResults.filter(r => r.success).length;
    const totalExtensions = allResults.length;

    res.json({
      success: true,
      data: {
        summary: {
          total: totalExtensions,
          passed: successfulExtensions,
          failed: totalExtensions - successfulExtensions,
          passRate: totalExtensions > 0 ? (successfulExtensions / totalExtensions * 100).toFixed(2) + '%' : '0%'
        },
        results: allResults,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Bulk extension testing failed', { error: (error as Error).message });
    res.status(500).json({
      success: false,
      error: 'Bulk testing failed',
      details: (error as Error).message
    });
  }
});

// =============================================================================
// EXTENSION MANAGEMENT ENDPOINTS
// =============================================================================

/**
 * @swagger
 * /dynamic-extensions/reload:
 *   post:
 *     tags: [Dynamic Extensions]
 *     summary: Reload all dynamic extensions
 *     description: Reloads all dynamic extensions with optional configuration changes
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               enabledExtensions:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of extension types to enable
 *                 default: ["chart", "table", "video"]
 *               maxExtensions:
 *                 type: number
 *                 description: Maximum number of extensions to load
 *                 default: 20
 *           example:
 *             enabledExtensions: ["chart", "table", "video", "audio"]
 *             maxExtensions: 25
 *     responses:
 *       200:
 *         description: Extensions reloaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     reloaded:
 *                       type: boolean
 *                     extensionCount:
 *                       type: number
 *                     loadedTypes:
 *                       type: array
 *                       items:
 *                         type: string
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *       500:
 *         description: Extension reload failed
 */
router.post('/reload', async (req, res) => {
  try {
    const { enabledExtensions = ['chart', 'table', 'video'], maxExtensions = 20 } = req.body;

    logger.info('Reloading dynamic extensions', { enabledExtensions });

    const config = {
      options: {
        enabledExtensions,
        mode: 'local' as 'local' | 'cloud',
        maxExtensions
      }
    };

    const reloadedRegistry = reloadDynamicComponents(config);

    res.json({
      success: true,
      data: {
        reloaded: true,
        extensionCount: reloadedRegistry.size,
        loadedTypes: Array.from(reloadedRegistry.keys()),
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Extension reload failed', { error: (error as Error).message });
    res.status(500).json({
      success: false,
      error: 'Extension reload failed',
      details: (error as Error).message
    });
  }
});

/**
 * @swagger
 * /dynamic-extensions/{type}/enable:
 *   post:
 *     tags: [Dynamic Extensions]
 *     summary: Enable specific extension type
 *     description: Enables a specific extension type if it's available
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *         description: Extension type to enable
 *         example: audio
 *     responses:
 *       200:
 *         description: Extension enabled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     type:
 *                       type: string
 *                     enabled:
 *                       type: boolean
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                 error:
 *                   type: string
 *                   description: Error message if enabling failed
 *       500:
 *         description: Failed to enable extension
 */
router.post('/:type/enable', (req, res) => {
  try {
    const { type } = req.params;
    const enabled = moduleFactory.enableDynamicExtension(type);

    if (enabled) {
      logger.info(`Dynamic extension enabled: ${type}`);
      res.json({
        success: true,
        data: {
          type,
          enabled: true,
          timestamp: new Date().toISOString()
        }
      });
    } else {
      res.json({
        success: false,
        error: `Extension '${type}' already enabled or failed to enable`
      });
    }

  } catch (error) {
    logger.error(`Failed to enable extension ${req.params.type}`, { error: (error as Error).message });
    res.status(500).json({
      success: false,
      error: 'Failed to enable extension'
    });
  }
});

/**
 * @swagger
 * /dynamic-extensions/{type}/disable:
 *   post:
 *     tags: [Dynamic Extensions]
 *     summary: Disable specific extension type
 *     description: Disables a specific extension type and removes it from the registry
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *         description: Extension type to disable
 *         example: video
 *     responses:
 *       200:
 *         description: Extension disabled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     type:
 *                       type: string
 *                     disabled:
 *                       type: boolean
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                 error:
 *                   type: string
 *                   description: Error message if disabling failed
 *       500:
 *         description: Failed to disable extension
 */
router.post('/:type/disable', (req, res) => {
  try {
    const { type } = req.params;
    const disabled = moduleFactory.disableDynamicExtension(type);

    if (disabled) {
      logger.info(`Dynamic extension disabled: ${type}`);
      res.json({
        success: true,
        data: {
          type,
          disabled: true,
          timestamp: new Date().toISOString()
        }
      });
    } else {
      res.json({
        success: false,
        error: `Extension '${type}' not found or already disabled`
      });
    }

  } catch (error) {
    logger.error(`Failed to disable extension ${req.params.type}`, { error: (error as Error).message });
    res.status(500).json({
      success: false,
      error: 'Failed to disable extension'
    });
  }
});

// =============================================================================
// HEALTH CHECK ENDPOINT
// =============================================================================

/**
 * @swagger
 * /dynamic-extensions/health:
 *   get:
 *     tags: [Dynamic Extensions]
 *     summary: Health check for dynamic loading system
 *     description: Performs comprehensive health check of the dynamic extension loading system
 *     responses:
 *       200:
 *         description: System is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       enum: [healthy, degraded]
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                     registry:
 *                       type: object
 *                       properties:
 *                         initialized:
 *                           type: boolean
 *                         extensionCount:
 *                           type: number
 *                         loadedTypes:
 *                           type: array
 *                           items:
 *                             type: string
 *                     validation:
 *                       type: object
 *                       properties:
 *                         valid:
 *                           type: boolean
 *                         issues:
 *                           type: array
 *                           items:
 *                             type: string
 *                     security:
 *                       type: object
 *                       nullable: true
 *       503:
 *         description: System is degraded or unhealthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 data:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       example: "degraded"
 *       500:
 *         description: Health check failed
 */
router.get('/health', (req, res) => {
  try {
    const validation = validateDynamicRegistry();
    const stats = getDynamicLoadingStats();
    
    const health = {
      status: validation.valid ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      registry: {
        initialized: stats.registry?.initialized || false,
        extensionCount: stats.registry?.totalExtensions || 0,
        loadedTypes: stats.registry?.types || []
      },
      validation: {
        valid: validation.valid,
        issues: validation.issues
      },
      security: stats.security || null
    };

    const statusCode = validation.valid ? 200 : 503;

    res.status(statusCode).json({
      success: validation.valid,
      data: health
    });

  } catch (error) {
    logger.error('Dynamic extensions health check failed', { error: (error as Error).message });
    res.status(500).json({
      success: false,
      error: 'Health check failed'
    });
  }
});

export default router; 