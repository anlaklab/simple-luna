/**
 * Batch Operations Routes
 * 
 * Routes for batch operations on multiple resources
 */

const express = require('express');
const router = express.Router();
const batchController = require('../controllers/batch.controller');

// Batch operations for presentations
router.post('/batch/presentations/delete', batchController.batchDeletePresentations);
router.post('/batch/presentations/update', batchController.batchUpdatePresentations);
router.post('/batch/export', batchController.batchExportPresentations);

// Batch operations for sessions
router.post('/batch/sessions/archive', batchController.batchArchiveSessions);

module.exports = router; 