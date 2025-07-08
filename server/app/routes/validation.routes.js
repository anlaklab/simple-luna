/**
 * Validation Routes
 * 
 * Routes for Universal PowerPoint Schema validation
 */

const express = require('express');
const router = express.Router();
const validationController = require('../controllers/validation.controller');

// Validate presentation data
router.post('/validate-schema', validationController.validateSchema);

// Validate and auto-fix presentation data
router.post('/validate-and-fix', validationController.validateAndFix);

// Get schema information
router.get('/schema-info', validationController.getSchemaInfo);

module.exports = router; 