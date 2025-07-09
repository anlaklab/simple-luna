/**
 * Thumbnails Routes - Refactored with ThumbnailManager
 * 
 * Comprehensive thumbnail management with clear distinction between:
 * - PLACEHOLDERS: Text-based thumbnails from Universal JSON
 * - REAL THUMBNAILS: Image thumbnails from PPTX using Aspose.Slides
 */

const express = require('express');
const router = express.Router();
const thumbnailsController = require('../controllers/thumbnails.controller');

// Individual presentation thumbnail endpoints
router.post('/presentations/:id/generate-thumbnails', thumbnailsController.generateThumbnails);
router.get('/presentations/:presentationId/thumbnails', thumbnailsController.getThumbnails);
router.delete('/presentations/:presentationId/thumbnails', thumbnailsController.deleteThumbnails);
router.get('/presentations/:presentationId/thumbnails/stats', thumbnailsController.getThumbnailStats);

// Batch operations
router.post('/thumbnails/batch-generate', thumbnailsController.batchGenerateThumbnails);

module.exports = router; 