/**
 * Presentations Routes
 * 
 * Routes for presentation CRUD operations and related functionality
 */

const express = require('express');
const router = express.Router();
const presentationsController = require('../controllers/presentations.controller');

// Get all presentations
router.get('/presentations', presentationsController.getAllPresentations);

// Get presentation by ID
router.get('/presentations/:id', presentationsController.getPresentationById);

// Get presentation thumbnails
router.get('/presentations/:id/thumbnails', presentationsController.getPresentationThumbnails);

// Get Universal JSON for presentation
router.get('/json/:id', presentationsController.getPresentationUniversalJson);

module.exports = router; 