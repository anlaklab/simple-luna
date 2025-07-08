/**
 * AI Routes
 * 
 * Routes for AI-powered presentation generation
 */

const express = require('express');
const router = express.Router();
const aiController = require('../controllers/ai.controller');

// Generate presentation with AI
router.post('/ai/generate-presentation', aiController.generatePresentation);

module.exports = router; 