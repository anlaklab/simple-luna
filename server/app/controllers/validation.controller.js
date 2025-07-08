/**
 * Validation Controller
 * 
 * Handles Universal PowerPoint Schema validation operations
 */

const schemaValidator = require('../../universal-schema-validator');

/**
 * @swagger
 * /validate-schema:
 *   post:
 *     tags: [Validation]
 *     summary: Validate presentation data
 *     description: Validate presentation data against Universal PowerPoint Schema
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Presentation data to validate
 *     responses:
 *       200:
 *         description: Validation completed
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/ValidationResult'
 */
const validateSchema = (req, res) => {
  try {
    console.log('🔍 Schema validation request received...');
    
    const presentationData = req.body;
    
    if (!presentationData || typeof presentationData !== 'object') {
      return res.status(400).json({
        success: false,
        error: {
          type: 'validation_error',
          code: 'INVALID_INPUT',
          message: 'Valid presentation data object is required',
        },
      });
    }

    // Perform validation
    const validationResult = schemaValidator.validatePresentation(presentationData);
    
    console.log(`📊 Validation completed: ${validationResult.success ? 'PASSED' : 'FAILED'}`);
    if (validationResult.validationTimeMs) {
      console.log(`⏱️ Validation time: ${validationResult.validationTimeMs}ms`);
    }

    res.json({
      success: true,
      data: {
        validationResult,
        isValid: validationResult.success,
        errors: validationResult.errors || [],
        warnings: validationResult.warnings || [],
        schemaCompliance: validationResult.schemaCompliance,
        structure: validationResult.structure
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: `req_${Date.now()}`,
        processingTimeMs: validationResult.validationTimeMs || 0,
        schemaVersion: '1.0',
      },
    });

  } catch (error) {
    console.error('❌ Schema validation error:', error);
    res.status(500).json({
      success: false,
      error: {
        type: 'server_error',
        code: 'VALIDATION_ERROR',
        message: 'Schema validation failed',
        details: error.message,
      },
    });
  }
};

/**
 * @swagger
 * /validate-and-fix:
 *   post:
 *     tags: [Validation]
 *     summary: Validate and auto-fix presentation data
 *     description: Validate presentation data and attempt to auto-fix common issues
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Presentation data to validate and fix
 *     responses:
 *       200:
 *         description: Validation and fixing completed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
const validateAndFix = (req, res) => {
  try {
    console.log('🔧 Schema validation and auto-fix request received...');
    
    const presentationData = req.body;
    
    if (!presentationData || typeof presentationData !== 'object') {
      return res.status(400).json({
        success: false,
        error: {
          type: 'validation_error',
          code: 'INVALID_INPUT',
          message: 'Valid presentation data object is required',
        },
      });
    }

    // Perform validation and auto-fix
    const fixResult = schemaValidator.validateAndFix(presentationData);
    
    console.log(`📊 Validation and fix completed`);
    console.log(`🔧 Applied ${fixResult.appliedFixes?.length || 0} fixes`);
    
    if (fixResult.revalidation) {
      console.log(`✅ Revalidation: ${fixResult.revalidation.success ? 'PASSED' : 'FAILED'}`);
    }

    res.json({
      success: true,
      data: {
        originalValidation: fixResult.originalValidation,
        appliedFixes: fixResult.appliedFixes || [],
        fixedData: fixResult.fixedData,
        revalidation: fixResult.revalidation,
        autoFixSuccess: fixResult.revalidation?.success || false
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: `req_${Date.now()}`,
        processingTimeMs: (fixResult.originalValidation?.validationTimeMs || 0) + 
                         (fixResult.revalidation?.validationTimeMs || 0),
        schemaVersion: '1.0',
      },
    });

  } catch (error) {
    console.error('❌ Schema validation and fix error:', error);
    res.status(500).json({
      success: false,
      error: {
        type: 'server_error',
        code: 'VALIDATION_FIX_ERROR',
        message: 'Schema validation and fix failed',
        details: error.message,
      },
    });
  }
};

/**
 * @swagger
 * /schema-info:
 *   get:
 *     tags: [Validation]
 *     summary: Get schema information
 *     description: Retrieve information about the Universal PowerPoint Schema
 *     responses:
 *       200:
 *         description: Schema information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
const getSchemaInfo = (req, res) => {
  try {
    console.log('📋 Schema info request received...');
    
    const schemaInfo = schemaValidator.getSchemaInfo();
    
    res.json({
      success: true,
      data: schemaInfo,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: `req_${Date.now()}`,
        processingTimeMs: 1,
        schemaVersion: '1.0',
      },
    });

  } catch (error) {
    console.error('❌ Schema info error:', error);
    res.status(500).json({
      success: false,
      error: {
        type: 'server_error',
        code: 'SCHEMA_INFO_ERROR',
        message: 'Failed to retrieve schema information',
        details: error.message,
      },
    });
  }
};

module.exports = {
  validateSchema,
  validateAndFix,
  getSchemaInfo
}; 