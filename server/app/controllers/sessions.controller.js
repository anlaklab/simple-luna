/**
 * Sessions Controller
 * 
 * Handles chat session CRUD operations and message management
 */

const { getSessionService, isFirebaseInitialized } = require('../../config/firebase');

/**
 * @swagger
 * /sessions:
 *   get:
 *     tags: [Sessions]
 *     summary: List user sessions
 *     description: Retrieve chat sessions for a user with pagination and filtering
 *     parameters:
 *       - name: userId
 *         in: query
 *         description: User identifier (null for anonymous)
 *         schema:
 *           type: string
 *       - name: limit
 *         in: query
 *         description: Maximum number of sessions to return
 *         schema:
 *           type: number
 *           default: 20
 *       - name: offset
 *         in: query
 *         description: Number of sessions to skip for pagination
 *         schema:
 *           type: number
 *           default: 0
 *       - name: status
 *         in: query
 *         description: Filter by session status
 *         schema:
 *           type: string
 *           enum: ['active', 'archived', 'deleted', 'all']
 *           default: 'active'
 *       - name: bookmarkedOnly
 *         in: query
 *         description: Show only bookmarked sessions
 *         schema:
 *           type: boolean
 *           default: false
 *     responses:
 *       200:
 *         description: Sessions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/SessionData'
 *       503:
 *         description: Session service not available
 */
const getUserSessions = async (req, res) => {
  try {
    const sessionService = getSessionService();
    
    if (!sessionService) {
      return res.status(503).json({
        success: false,
        error: {
          type: 'service_unavailable',
          code: 'SESSION_SERVICE_NOT_AVAILABLE',
          message: 'Session service is not available. Please check Firebase configuration.'
        }
      });
    }

    const { 
      userId = null, 
      limit = 20, 
      offset = 0, 
      status = 'active', 
      bookmarkedOnly = false 
    } = req.query;
    
    console.log(`📋 Getting sessions for user ${userId || 'anonymous'}...`);
    
    const options = {
      limit: parseInt(limit),
      offset: parseInt(offset),
      status,
      bookmarkedOnly: bookmarkedOnly === 'true',
      orderBy: 'lastActiveAt',
      orderDirection: 'desc'
    };
    
    const result = await sessionService.getUserSessions(userId, options);
    
    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: `req_${Date.now()}`,
        processingTimeMs: 25
      }
    });
    
  } catch (error) {
    console.error('❌ Error getting user sessions:', error);
    res.status(500).json({
      success: false,
      error: {
        type: 'server_error',
        code: 'SESSIONS_GET_ERROR',
        message: error.message || 'Failed to get sessions'
      }
    });
  }
};

/**
 * @swagger
 * /sessions:
 *   post:
 *     tags: [Sessions]
 *     summary: Create new session
 *     description: Create a new chat session
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *                 nullable: true
 *                 description: User identifier (null for anonymous)
 *               title:
 *                 type: string
 *                 description: Session title
 *                 example: "New Chat Session"
 *               metadata:
 *                 type: object
 *                 description: Additional session metadata
 *               userAgent:
 *                 type: string
 *                 description: User agent string
 *               ipAddress:
 *                 type: string
 *                 description: Client IP address
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Session tags
 *     responses:
 *       200:
 *         description: Session created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/SessionData'
 */
const createSession = async (req, res) => {
  try {
    const sessionService = getSessionService();
    
    if (!sessionService) {
      return res.status(503).json({
        success: false,
        error: {
          type: 'service_unavailable',
          code: 'SESSION_SERVICE_NOT_AVAILABLE',
          message: 'Session service is not available. Please check Firebase configuration.'
        }
      });
    }

    const { userId, title, metadata, userAgent, ipAddress, tags } = req.body;
    
    console.log(`🆕 Creating new session for user ${userId || 'anonymous'}...`);
    
    const sessionData = {
      userId: userId || null,
      title: title || 'New Chat Session',
      metadata: metadata || {},
      userAgent: userAgent || req.get('User-Agent'),
      ipAddress: ipAddress || req.ip,
      tags: tags || []
    };
    
    const result = await sessionService.createSession(sessionData);
    
    res.json({
      success: true,
      data: result.data,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: `req_${Date.now()}`,
        processingTimeMs: 12
      }
    });
    
  } catch (error) {
    console.error('❌ Error creating session:', error);
    res.status(500).json({
      success: false,
      error: {
        type: 'server_error',
        code: 'SESSION_CREATE_ERROR',
        message: error.message || 'Failed to create session'
      }
    });
  }
};

/**
 * @swagger
 * /sessions/{sessionId}:
 *   get:
 *     tags: [Sessions]
 *     summary: Get session by ID
 *     description: Retrieve a specific session with full message history
 *     parameters:
 *       - name: sessionId
 *         in: path
 *         required: true
 *         description: Session identifier
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Session retrieved successfully
 *       404:
 *         description: Session not found
 */
const getSessionById = async (req, res) => {
  try {
    const sessionService = getSessionService();
    
    if (!sessionService) {
      return res.status(503).json({
        success: false,
        error: {
          type: 'service_unavailable',
          code: 'SESSION_SERVICE_NOT_AVAILABLE',
          message: 'Session service is not available. Please check Firebase configuration.'
        }
      });
    }

    const { sessionId } = req.params;
    console.log(`📋 Getting session ${sessionId}...`);
    
    const result = await sessionService.getSession(sessionId);
    
    res.json({
      success: true,
      data: result.data,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: `req_${Date.now()}`,
        processingTimeMs: 5
      }
    });
    
  } catch (error) {
    console.error(`❌ Error getting session:`, error);
    const status = error.message.includes('not found') ? 404 : 500;
    res.status(status).json({
      success: false,
      error: {
        type: status === 404 ? 'not_found' : 'server_error',
        code: status === 404 ? 'SESSION_NOT_FOUND' : 'SESSION_GET_ERROR',
        message: error.message || 'Failed to get session'
      }
    });
  }
};

/**
 * @swagger
 * /sessions/{sessionId}:
 *   put:
 *     tags: [Sessions]
 *     summary: Update session
 *     description: Update session metadata, title, or status
 *     parameters:
 *       - name: sessionId
 *         in: path
 *         required: true
 *         description: Session identifier
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: New session title
 *               isBookmarked:
 *                 type: boolean
 *                 description: Bookmark status
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Session tags
 *               status:
 *                 type: string
 *                 enum: ['active', 'archived', 'deleted']
 *                 description: Session status
 *               settings:
 *                 type: object
 *                 description: Session settings
 *     responses:
 *       200:
 *         description: Session updated successfully
 */
const updateSession = async (req, res) => {
  try {
    const sessionService = getSessionService();
    
    if (!sessionService) {
      return res.status(503).json({
        success: false,
        error: {
          type: 'service_unavailable',
          code: 'SESSION_SERVICE_NOT_AVAILABLE',
          message: 'Session service is not available. Please check Firebase configuration.'
        }
      });
    }

    const { sessionId } = req.params;
    const updates = req.body;
    
    console.log(`📝 Updating session ${sessionId}...`);
    
    const result = await sessionService.updateSession(sessionId, updates);
    
    res.json({
      success: true,
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: `req_${Date.now()}`,
        processingTimeMs: 8
      }
    });
    
  } catch (error) {
    console.error(`❌ Error updating session:`, error);
    res.status(500).json({
      success: false,
      error: {
        type: 'server_error',
        code: 'SESSION_UPDATE_ERROR',
        message: error.message || 'Failed to update session'
      }
    });
  }
};

/**
 * @swagger
 * /sessions/{sessionId}:
 *   delete:
 *     tags: [Sessions]
 *     summary: Delete session permanently
 *     description: Permanently delete a session and all its messages
 *     parameters:
 *       - name: sessionId
 *         in: path
 *         required: true
 *         description: Session identifier
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Session deleted successfully
 */
const deleteSession = async (req, res) => {
  try {
    const sessionService = getSessionService();
    
    if (!sessionService) {
      return res.status(503).json({
        success: false,
        error: {
          type: 'service_unavailable',
          code: 'SESSION_SERVICE_NOT_AVAILABLE',
          message: 'Session service is not available. Please check Firebase configuration.'
        }
      });
    }

    const { sessionId } = req.params;
    console.log(`🗑️ Deleting session ${sessionId}...`);
    
    const result = await sessionService.deleteSession(sessionId);
    
    res.json({
      success: true,
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: `req_${Date.now()}`,
        processingTimeMs: 10
      }
    });
    
  } catch (error) {
    console.error(`❌ Error deleting session:`, error);
    res.status(500).json({
      success: false,
      error: {
        type: 'server_error',
        code: 'SESSION_DELETE_ERROR',
        message: error.message || 'Failed to delete session'
      }
    });
  }
};

/**
 * @swagger
 * /sessions/{sessionId}/messages:
 *   post:
 *     tags: [Sessions]
 *     summary: Add message to session
 *     description: Add a new message to a chat session
 *     parameters:
 *       - name: sessionId
 *         in: path
 *         required: true
 *         description: Session identifier
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               role:
 *                 type: string
 *                 enum: ['user', 'assistant', 'system']
 *                 description: Message role
 *               content:
 *                 type: string
 *                 description: Message content
 *               metadata:
 *                 type: object
 *                 description: Message metadata (tokens, model, etc.)
 *                 properties:
 *                   promptTokens:
 *                     type: number
 *                   completionTokens:
 *                     type: number
 *                   model:
 *                     type: string
 *                   temperature:
 *                     type: number
 *                   processingTimeMs:
 *                     type: number
 *             required: ['role', 'content']
 *     responses:
 *       200:
 *         description: Message added successfully
 */
const addMessage = async (req, res) => {
  try {
    const sessionService = getSessionService();
    
    if (!sessionService) {
      return res.status(503).json({
        success: false,
        error: {
          type: 'service_unavailable',
          code: 'SESSION_SERVICE_NOT_AVAILABLE',
          message: 'Session service is not available. Please check Firebase configuration.'
        }
      });
    }

    const { sessionId } = req.params;
    const { role, content, metadata } = req.body;
    
    if (!role || !content) {
      return res.status(400).json({
        success: false,
        error: {
          type: 'validation_error',
          code: 'MISSING_REQUIRED_FIELDS',
          message: 'Role and content are required'
        }
      });
    }
    
    console.log(`💬 Adding ${role} message to session ${sessionId}...`);
    
    const message = {
      role,
      content,
      metadata: metadata || {}
    };
    
    const result = await sessionService.addMessage(sessionId, message);
    
    res.json({
      success: true,
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: `req_${Date.now()}`,
        processingTimeMs: 15
      }
    });
    
  } catch (error) {
    console.error(`❌ Error adding message:`, error);
    res.status(500).json({
      success: false,
      error: {
        type: 'server_error',
        code: 'MESSAGE_ADD_ERROR',
        message: error.message || 'Failed to add message'
      }
    });
  }
};

/**
 * @swagger
 * /sessions/{sessionId}/archive:
 *   post:
 *     tags: [Sessions]
 *     summary: Archive session
 *     description: Archive a session (soft delete)
 *     parameters:
 *       - name: sessionId
 *         in: path
 *         required: true
 *         description: Session identifier
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Session archived successfully
 */
const archiveSession = async (req, res) => {
  try {
    const sessionService = getSessionService();
    
    if (!sessionService) {
      return res.status(503).json({
        success: false,
        error: {
          type: 'service_unavailable',
          code: 'SESSION_SERVICE_NOT_AVAILABLE',
          message: 'Session service is not available. Please check Firebase configuration.'
        }
      });
    }

    const { sessionId } = req.params;
    console.log(`📦 Archiving session ${sessionId}...`);
    
    const result = await sessionService.archiveSession(sessionId);
    
    res.json({
      success: true,
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: `req_${Date.now()}`,
        processingTimeMs: 8
      }
    });
    
  } catch (error) {
    console.error(`❌ Error archiving session:`, error);
    res.status(500).json({
      success: false,
      error: {
        type: 'server_error',
        code: 'SESSION_ARCHIVE_ERROR',
        message: error.message || 'Failed to archive session'
      }
    });
  }
};

/**
 * @swagger
 * /sessions/{sessionId}/presentations:
 *   post:
 *     tags: [Sessions]
 *     summary: Link presentation to session
 *     description: Add a generated presentation reference to the session
 *     parameters:
 *       - name: sessionId
 *         in: path
 *         required: true
 *         description: Session identifier
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               presentationId:
 *                 type: string
 *                 description: Presentation identifier
 *               title:
 *                 type: string
 *                 description: Presentation title
 *               description:
 *                 type: string
 *                 description: Presentation description
 *               slideCount:
 *                 type: number
 *                 description: Number of slides
 *             required: ['presentationId']
 *     responses:
 *       200:
 *         description: Presentation linked successfully
 */
const addPresentationReference = async (req, res) => {
  try {
    const sessionService = getSessionService();
    
    if (!sessionService) {
      return res.status(503).json({
        success: false,
        error: {
          type: 'service_unavailable',
          code: 'SESSION_SERVICE_NOT_AVAILABLE',
          message: 'Session service is not available. Please check Firebase configuration.'
        }
      });
    }

    const { sessionId } = req.params;
    const presentation = req.body;
    
    if (!presentation.presentationId) {
      return res.status(400).json({
        success: false,
        error: {
          type: 'validation_error',
          code: 'MISSING_PRESENTATION_ID',
          message: 'Presentation ID is required'
        }
      });
    }
    
    console.log(`🔗 Linking presentation ${presentation.presentationId} to session ${sessionId}...`);
    
    const result = await sessionService.addGeneratedPresentation(sessionId, presentation);
    
    res.json({
      success: true,
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: `req_${Date.now()}`,
        processingTimeMs: 10
      }
    });
    
  } catch (error) {
    console.error(`❌ Error linking presentation:`, error);
    res.status(500).json({
      success: false,
      error: {
        type: 'server_error',
        code: 'PRESENTATION_LINK_ERROR',
        message: error.message || 'Failed to link presentation'
      }
    });
  }
};

/**
 * @swagger
 * /sessions/cleanup:
 *   post:
 *     tags: [Sessions]
 *     summary: Cleanup old sessions
 *     description: Archive and delete old sessions (maintenance operation)
 *     responses:
 *       200:
 *         description: Cleanup completed successfully
 */
const cleanupSessions = async (req, res) => {
  try {
    const sessionService = getSessionService();
    
    if (!sessionService) {
      return res.status(503).json({
        success: false,
        error: {
          type: 'service_unavailable',
          code: 'SESSION_SERVICE_NOT_AVAILABLE',
          message: 'Session service is not available. Please check Firebase configuration.'
        }
      });
    }

    console.log(`🧹 Starting session cleanup...`);
    
    const result = await sessionService.cleanupOldSessions();
    
    res.json({
      success: true,
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: `req_${Date.now()}`,
        processingTimeMs: 50
      }
    });
    
  } catch (error) {
    console.error(`❌ Error during cleanup:`, error);
    res.status(500).json({
      success: false,
      error: {
        type: 'server_error',
        code: 'SESSION_CLEANUP_ERROR',
        message: error.message || 'Failed to cleanup sessions'
      }
    });
  }
};

module.exports = {
  getUserSessions,
  createSession,
  getSessionById,
  updateSession,
  deleteSession,
  addMessage,
  archiveSession,
  addPresentationReference,
  cleanupSessions
}; 