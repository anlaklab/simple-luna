/**
 * Health Routes
 * 
 * Routes for health check and system status
 */

const express = require('express');
const router = express.Router();
const healthController = require('../controllers/health.controller');

// Health check endpoint
router.get('/health', healthController.getHealthStatus);

// Server status endpoint
router.get('/status', healthController.getServerStatus);

module.exports = router; 