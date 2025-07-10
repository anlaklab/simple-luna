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
 * GET /dynamic-extensions
 * List all loaded dynamic extensions
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
 * GET /dynamic-extensions/stats
 * Get comprehensive statistics about dynamic loading system
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
 * GET /dynamic-extensions/:type
 * Get specific extension details and capabilities
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

    res.json({
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
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve extension details'
    });
  }
});

// =============================================================================
// EXTENSION TESTING ENDPOINTS
// =============================================================================

/**
 * POST /dynamic-extensions/:type/test
 * Test extension with mock data
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

    res.json({
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
    res.status(500).json({
      success: false,
      error: 'Extension test failed',
      details: (error as Error).message
    });
  }
});

/**
 * POST /dynamic-extensions/test-all
 * Test all loaded extensions
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
 * POST /dynamic-extensions/reload
 * Reload all dynamic extensions
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
 * POST /dynamic-extensions/:type/enable
 * Enable specific extension type
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
 * POST /dynamic-extensions/:type/disable
 * Disable specific extension type
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
 * GET /dynamic-extensions/health
 * Health check for dynamic loading system
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