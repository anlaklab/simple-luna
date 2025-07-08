/**
 * Sessions Routes
 * 
 * Routes for chat session management and CRUD operations
 */

const express = require('express');
const router = express.Router();
const sessionsController = require('../controllers/sessions.controller');

// Session CRUD operations
router.get('/sessions', sessionsController.getUserSessions);
router.post('/sessions', sessionsController.createSession);
router.get('/sessions/:sessionId', sessionsController.getSessionById);
router.put('/sessions/:sessionId', sessionsController.updateSession);
router.delete('/sessions/:sessionId', sessionsController.deleteSession);

// Session operations
router.post('/sessions/:sessionId/messages', sessionsController.addMessage);
router.post('/sessions/:sessionId/archive', sessionsController.archiveSession);
router.post('/sessions/:sessionId/presentations', sessionsController.addPresentationReference);

// Maintenance operations
router.post('/sessions/cleanup', sessionsController.cleanupSessions);

module.exports = router; 