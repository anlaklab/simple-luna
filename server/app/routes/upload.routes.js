/**
 * Upload Routes
 * 
 * Routes for file uploads with Premium Tier System
 */

const express = require('express');
const { uploadPPTX, uploadJSON, getUploadStatus, getTiers } = require('../controllers/upload.controller');

const router = express.Router();

// Get available upload tiers
router.get('/upload/tiers', getTiers);

// Upload PPTX file and convert to Universal JSON
router.post('/upload/pptx', uploadPPTX);

// Upload JSON file for validation
router.post('/upload/json', uploadJSON);

// Get upload status by ID
router.get('/upload/status/:uploadId', getUploadStatus);

module.exports = router; 