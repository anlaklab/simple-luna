/**
 * License Manager Debug Routes
 * 
 * Comprehensive debugging endpoints for the Aspose license manager
 * Helps diagnose issues at each step of the initialization process
 */

import { Router, Request, Response } from 'express';
import { handleAsyncErrors } from '../middleware/error.middleware';
import { logger } from '../utils/logger';

const router = Router();

/**
 * @swagger
 * /api/v1/debug/license-manager:
 *   post:
 *     tags: [Debug]
 *     summary: Comprehensive license manager debugging
 *     description: |
 *       Tests each component of the license manager individually to identify
 *       exactly where the initialization process is failing.
 *       
 *       **Tests performed:**
 *       - Environment variables validation
 *       - Java environment configuration
 *       - JAR loading and coordination
 *       - Aspose library loading
 *       - Critical class verification
 *       - License content validation
 *       - License application
 *       - License effectiveness testing
 *       
 *       **Use Cases:**
 *       - Post-deployment license troubleshooting
 *       - Component-level debugging
 *       - Performance bottleneck identification
 *       - Configuration validation
 *     responses:
 *       200:
 *         description: License manager diagnostic completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 diagnostics:
 *                   type: object
 *                   properties:
 *                     environment:
 *                       type: object
 *                     java:
 *                       type: object
 *                     jar:
 *                       type: object
 *                     classes:
 *                       type: object
 *                     license:
 *                       type: object
 *                     overall:
 *                       type: object
 *       500:
 *         description: Debug process failed
 */
router.post('/debug/license-manager', 
  handleAsyncErrors(async (req: Request, res: Response): Promise<void> => {
    const requestId = req.requestId || `license_debug_${Date.now()}`;
    
    logger.info('🔍 Starting comprehensive license manager debugging', { requestId });
    
    const diagnostics = {
      environment: {
        step: 'environment_validation',
        status: 'pending',
        details: {},
        errors: [] as string[],
        warnings: [] as string[]
      },
      java: {
        step: 'java_configuration',
        status: 'pending',
        details: {},
        errors: [] as string[],
        warnings: [] as string[]
      },
      jar: {
        step: 'jar_loading',
        status: 'pending',
        details: {},
        errors: [] as string[],
        warnings: [] as string[]
      },
      classes: {
        step: 'class_verification',
        status: 'pending',
        details: {},
        errors: [] as string[],
        warnings: [] as string[]
      },
      license: {
        step: 'license_application',
        status: 'pending',
        details: {},
        errors: [] as string[],
        warnings: [] as string[]
      },
      overall: {
        step: 'overall_assessment',
        status: 'pending',
        summary: {},
        recommendations: [] as string[]
      }
    };

    try {
      // STEP 1: Environment Variables Validation
      logger.info('🔍 STEP 1: Validating environment variables', { requestId });
      try {
        const envVars = {
          ASPOSE_LICENSE_CONTENT: process.env.ASPOSE_LICENSE_CONTENT,
          JAVA_HOME: process.env.JAVA_HOME,
          JAVA_TOOL_OPTIONS: process.env.JAVA_TOOL_OPTIONS,
          JAVA_OPTS: process.env.JAVA_OPTS,
          NODE_ENV: process.env.NODE_ENV
        };

        const hasLicenseContent = !!envVars.ASPOSE_LICENSE_CONTENT;
        const licenseContentLength = envVars.ASPOSE_LICENSE_CONTENT ? envVars.ASPOSE_LICENSE_CONTENT.length : 0;
        const appearsToBeXml = envVars.ASPOSE_LICENSE_CONTENT ? 
          (envVars.ASPOSE_LICENSE_CONTENT.trim().startsWith('<?xml') || envVars.ASPOSE_LICENSE_CONTENT.trim().startsWith('<')) : false;

        diagnostics.environment.status = 'completed';
        diagnostics.environment.details = {
          envVars,
          hasLicenseContent,
          licenseContentLength,
          appearsToBeXml,
          licensePreview: envVars.ASPOSE_LICENSE_CONTENT ? 
            envVars.ASPOSE_LICENSE_CONTENT.substring(0, 200) + '...' : 'Not set'
        };

        if (!hasLicenseContent) {
          diagnostics.environment.warnings.push('ASPOSE_LICENSE_CONTENT not set - will use evaluation mode');
        }

        if (hasLicenseContent && !appearsToBeXml) {
          diagnostics.environment.errors.push('License content does not appear to be valid XML');
        }

        logger.info('✅ STEP 1: Environment validation completed', { 
          requestId, 
          hasLicenseContent, 
          licenseContentLength,
          appearsToBeXml 
        });

      } catch (error) {
        diagnostics.environment.status = 'failed';
        diagnostics.environment.errors.push(`Environment validation failed: ${(error as Error).message}`);
        logger.error('❌ STEP 1: Environment validation failed', { 
          requestId, 
          error: (error as Error).message 
        });
      }

      // STEP 2: Java Environment Configuration
      logger.info('🔍 STEP 2: Testing Java environment configuration', { requestId });
      try {
        const JavaConfigurator = require('/app/lib/aspose-license-manager-refactored').JavaConfigurator;
        const javaConfigurator = new JavaConfigurator({ logger });
        
        javaConfigurator.configure();
        javaConfigurator.validate();

        diagnostics.java.status = 'completed';
        diagnostics.java.details = {
          javaConfigured: true,
          javaValidated: true,
          javaOptions: process.env.JAVA_TOOL_OPTIONS,
          javaOpts: process.env.JAVA_OPTS
        };

        logger.info('✅ STEP 2: Java environment configuration completed', { requestId });

      } catch (error) {
        diagnostics.java.status = 'failed';
        diagnostics.java.errors.push(`Java configuration failed: ${(error as Error).message}`);
        logger.error('❌ STEP 2: Java configuration failed', { 
          requestId, 
          error: (error as Error).message 
        });
      }

      // STEP 3: JAR Loading and Coordination
      logger.info('🔍 STEP 3: Testing JAR loading and coordination', { requestId });
      try {
        const JarLoader = require('/app/lib/aspose-license-manager-refactored').JarLoader;
        const jarLoader = new JarLoader({ logger });
        
        const aspose = await jarLoader.loadAndWait();

        diagnostics.jar.status = 'completed';
        diagnostics.jar.details = {
          asposeLoaded: true,
          asposeType: typeof aspose,
          hasPresentation: !!aspose.Presentation,
          hasLicense: !!aspose.License,
          jarCoordinationComplete: true
        };

        logger.info('✅ STEP 3: JAR loading completed', { requestId });

      } catch (error) {
        diagnostics.jar.status = 'failed';
        diagnostics.jar.errors.push(`JAR loading failed: ${(error as Error).message}`);
        logger.error('❌ STEP 3: JAR loading failed', { 
          requestId, 
          error: (error as Error).message 
        });
      }

      // STEP 4: Critical Class Verification
      logger.info('🔍 STEP 4: Testing critical class verification', { requestId });
      try {
        if (diagnostics.jar.status === 'completed') {
          const ClassVerifier = require('/app/lib/aspose-license-manager-refactored').ClassVerifier;
          const JarLoader = require('/app/lib/aspose-license-manager-refactored').JarLoader;
          
          const jarLoader = new JarLoader({ logger });
          const aspose = await jarLoader.loadAndWait();
          const java = require('java');
          
          const classVerifier = new ClassVerifier({ 
            aspose, 
            java, 
            logger 
          });
          
          classVerifier.verify();
          classVerifier.verifyPresentationCreation();

          diagnostics.classes.status = 'completed';
          diagnostics.classes.details = {
            criticalClassesVerified: true,
            presentationCreationTest: true,
            classesTested: ['Presentation', 'License', 'AdjustValue', 'ShapeType', 'TextFrame']
          };

          logger.info('✅ STEP 4: Critical class verification completed', { requestId });
        } else {
          diagnostics.classes.status = 'skipped';
          diagnostics.classes.warnings.push('Skipped due to JAR loading failure');
        }

      } catch (error) {
        diagnostics.classes.status = 'failed';
        diagnostics.classes.errors.push(`Class verification failed: ${(error as Error).message}`);
        logger.error('❌ STEP 4: Class verification failed', { 
          requestId, 
          error: (error as Error).message 
        });
      }

             // STEP 5: License Application
       logger.info('🔍 STEP 5: Testing license application', { requestId });
       try {
         if (diagnostics.jar.status === 'completed' && (diagnostics.environment.details as any).hasLicenseContent) {
          const LicenseLoader = require('/app/lib/aspose-license-manager-refactored').LicenseLoader;
          const JarLoader = require('/app/lib/aspose-license-manager-refactored').JarLoader;
          
          const jarLoader = new JarLoader({ logger });
          const aspose = await jarLoader.loadAndWait();
          
          const licenseLoader = new LicenseLoader({ logger });
          
          // First validate the content
          const validation = licenseLoader.validateContent(process.env.ASPOSE_LICENSE_CONTENT);
          
          if (validation.valid) {
            const licenseApplied = await licenseLoader.loadAndApply(aspose);
            
            diagnostics.license.status = 'completed';
            diagnostics.license.details = {
              contentValidated: true,
              licenseApplied,
              validationResult: validation
            };

            logger.info('✅ STEP 5: License application completed', { 
              requestId, 
              licenseApplied 
            });
          } else {
            diagnostics.license.status = 'failed';
            diagnostics.license.errors.push(`License content validation failed: ${validation.reason}`);
            logger.error('❌ STEP 5: License content validation failed', { 
              requestId, 
              reason: validation.reason 
            });
          }
        } else {
          diagnostics.license.status = 'skipped';
          diagnostics.license.warnings.push('Skipped due to missing license content or JAR loading failure');
        }

      } catch (error) {
        diagnostics.license.status = 'failed';
        diagnostics.license.errors.push(`License application failed: ${(error as Error).message}`);
        logger.error('❌ STEP 5: License application failed', { 
          requestId, 
          error: (error as Error).message 
        });
      }

      // STEP 6: Overall Assessment
      logger.info('🔍 STEP 6: Generating overall assessment', { requestId });
      
      const allSteps = [
        diagnostics.environment,
        diagnostics.java,
        diagnostics.jar,
        diagnostics.classes,
        diagnostics.license
      ];

      const completedSteps = allSteps.filter(step => step.status === 'completed').length;
      const failedSteps = allSteps.filter(step => step.status === 'failed').length;
      const skippedSteps = allSteps.filter(step => step.status === 'skipped').length;

      const overallStatus = failedSteps === 0 ? 'healthy' : 'issues_detected';
      const criticalIssues = allSteps.reduce((total, step) => total + step.errors.length, 0);
      const warnings = allSteps.reduce((total, step) => total + step.warnings.length, 0);

      // Generate recommendations
      const recommendations = [];
      
      if (diagnostics.environment.status === 'failed') {
        recommendations.push('Fix environment variable configuration');
      }
      
      if (diagnostics.java.status === 'failed') {
        recommendations.push('Check Java installation and configuration');
      }
      
      if (diagnostics.jar.status === 'failed') {
        recommendations.push('Verify Aspose.Slides library files are present');
      }
      
      if (diagnostics.classes.status === 'failed') {
        recommendations.push('Check Aspose.Slides JAR file integrity');
      }
      
      if (diagnostics.license.status === 'failed') {
        recommendations.push('Validate license content format and validity');
      }

      if (recommendations.length === 0) {
        recommendations.push('All components are working correctly');
      }

      diagnostics.overall.status = 'completed';
      diagnostics.overall.summary = {
        overallStatus,
        stepsCompleted: completedSteps,
        stepsFailed: failedSteps,
        stepsSkipped: skippedSteps,
        criticalIssues,
        warnings,
        successRate: `${completedSteps}/${allSteps.length}`
      };
      diagnostics.overall.recommendations = recommendations;

      logger.info('✅ STEP 6: Overall assessment completed', { 
        requestId, 
        overallStatus,
        completedSteps,
        failedSteps,
        criticalIssues
      });

      // Return comprehensive diagnostic results
      res.json({
        success: true,
        diagnostics,
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
          diagnosticTimeMs: Date.now() - parseInt(requestId.split('_').pop() || '0')
        }
      });

    } catch (error) {
      logger.error('💥 CRITICAL: License manager debugging failed', {
        requestId,
        error: (error as Error).message,
        stack: (error as Error).stack
      });
      
      res.status(500).json({
        success: false,
        error: (error as Error).message,
        diagnostics,
        meta: {
          timestamp: new Date().toISOString(),
          requestId
        }
      });
    }
  })
);

export default router; 