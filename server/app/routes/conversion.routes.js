/**
 * Conversion Routes
 * 
 * Routes for complete conversion workflow (upload + convert + save)
 */

const express = require('express');
const router = express.Router();
const conversionController = require('../controllers/conversion.controller');

// Complete conversion workflow endpoints
router.post('/convert/upload', conversionController.convertAndSave);
router.post('/convert/batch', conversionController.batchConvertAndSave);

module.exports = router; 