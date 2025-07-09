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

// Direct conversion endpoints
router.post('/pptx2json', conversionController.convertPPTXToJSON);
router.post('/json2pptx', conversionController.convertJSONToPPTX);

// JSON file upload to PPTX conversion with consistent naming
router.post('/jsonfile2pptx', conversionController.convertJSONFileToPPTX);

module.exports = router; 