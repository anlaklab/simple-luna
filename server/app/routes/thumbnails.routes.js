/**
 * Thumbnails Routes
 * 
 * Routes for thumbnail generation functionality
 */

const express = require('express');
const router = express.Router();
const thumbnailsController = require('../controllers/thumbnails.controller');

// Thumbnail generation endpoints
router.post('/presentations/:id/generate-thumbnails', thumbnailsController.generateThumbnails);
router.post('/thumbnails/batch-generate', thumbnailsController.batchGenerateThumbnails);
router.delete('/thumbnails/:presentationId', thumbnailsController.deleteThumbnails);

module.exports = router; 