import { z } from "zod";
/**
 * Sessions Routes
 * 
 * RESTful routes for session management operations
 */

import { Router } from 'express';
import { SessionsController } from '../controllers/sessions.controller';
import { validateRequest } from '../middleware/validation.middleware';
import { z } from 'zod';

const router = Router();
const sessionsController = new SessionsController();

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const createSessionSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
    description: z.string().max(1000, 'Description too long').optional(),
    userId: z.string().uuid('Invalid user ID').optional(),
    initialMessage: z.string().max(10000, 'Initial message too long').optional(),
    settings: z.object({
      autoSave: z.boolean().optional(),
      notifications: z.boolean().optional(),
      theme: z.enum(['light', 'dark', 'auto']).optional(),
      aiModel: z.string().optional(),
      maxTokens: z.number().min(1).max(32000).optional(),
      temperature: z.number().min(0).max(2).optional(),
      topP: z.number().min(0).max(1).optional(),
      streamResponses: z.boolean().optional(),
    }).optional(),
    tags: z.array(z.string().max(50)).max(20, 'Too many tags').optional(),
  }),
});

const updateSessionSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid session ID'),
  }),
  body: z.object({
    title: z.string().min(1, 'Title is required').max(200, 'Title too long').optional(),
    description: z.string().max(1000, 'Description too long').optional(),
    settings: z.object({
      autoSave: z.boolean().optional(),
      notifications: z.boolean().optional(),
      theme: z.enum(['light', 'dark', 'auto']).optional(),
      aiModel: z.string().optional(),
      maxTokens: z.number().min(1).max(32000).optional(),
      temperature: z.number().min(0).max(2).optional(),
      topP: z.number().min(0).max(1).optional(),
      streamResponses: z.boolean().optional(),
    }).optional(),
    tags: z.array(z.string().max(50)).max(20, 'Too many tags').optional(),
    bookmarked: z.boolean().optional(),
    archived: z.boolean().optional(),
  }),
});

const sessionParamsSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid session ID'),
  }),
});

const addMessageSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid session ID'),
  }),
  body: z.object({
    content: z.string().min(1, 'Message content is required').max(50000, 'Message too long'),
    role: z.enum(['user', 'assistant', 'system']).optional(),
    metadata: z.object({
      tokens: z.number().min(0).optional(),
      model: z.string().optional(),
      processingTime: z.number().min(0).optional(),
      contentType: z.enum(['text', 'presentation', 'analysis', 'error']).optional(),
      attachments: z.array(z.string()).optional(),
    }).optional(),
  }),
});

const addPresentationSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid session ID'),
  }),
  body: z.object({
    id: z.string().uuid('Invalid presentation ID'),
    title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
    fileName: z.string().min(1, 'File name is required').max(255, 'File name too long'),
    fileSize: z.number().min(1, 'Invalid file size'),
    slideCount: z.number().min(1, 'Invalid slide count'),
    thumbnailUrl: z.string().url('Invalid thumbnail URL').optional(),
    universalSchemaId: z.string().uuid('Invalid schema ID').optional(),
  }),
});

const listSessionsSchema = z.object({
  query: z.object({
    userId: z.string().uuid('Invalid user ID').optional(),
    status: z.enum(['active', 'archived', 'deleted']).optional(),
    archived: z.enum(['true', 'false']).optional(),
    bookmarked: z.enum(['true', 'false']).optional(),
    tags: z.string().optional(), // Comma-separated tags
    search: z.string().max(100, 'Search query too long').optional(),
    limit: z.string().regex(/^\d+$/, 'Limit must be a number').optional(),
    offset: z.string().regex(/^\d+$/, 'Offset must be a number').optional(),
    sortBy: z.enum(['createdAt', 'updatedAt', 'lastMessageAt', 'title']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
    dateFrom: z.string().datetime('Invalid date format').optional(),
    dateTo: z.string().datetime('Invalid date format').optional(),
  }),
});

const archiveSessionSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid session ID'),
  }),
  body: z.object({
    reason: z.string().max(500, 'Reason too long').optional(),
    preserveMessages: z.boolean().optional(),
    preservePresentations: z.boolean().optional(),
    notifyUser: z.boolean().optional(),
  }),
});

const restoreSessionSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid session ID'),
  }),
  body: z.object({
    reason: z.string().max(500, 'Reason too long').optional(),
    restoreMessages: z.boolean().optional(),
    restorePresentations: z.boolean().optional(),
    notifyUser: z.boolean().optional(),
  }),
});

const exportSessionSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid session ID'),
  }),
  query: z.object({
    format: z.enum(['json', 'csv', 'pdf', 'html']).optional(),
    includeMetadata: z.enum(['true', 'false']).optional(),
    includeMessages: z.enum(['true', 'false']).optional(),
    includePresentations: z.enum(['true', 'false']).optional(),
    dateFrom: z.string().datetime('Invalid date format').optional(),
    dateTo: z.string().datetime('Invalid date format').optional(),
  }),
});

const searchSessionsSchema = z.object({
  query: z.object({
    q: z.string().min(1, 'Search query is required').max(200, 'Search query too long'),
    userId: z.string().uuid('Invalid user ID').optional(),
  }),
});

const cleanupSessionsSchema = z.object({
  body: z.object({
    olderThan: z.string().datetime('Invalid date format').optional(),
    status: z.enum(['active', 'archived', 'deleted']).optional(),
    preserveBookmarked: z.boolean().optional(),
    preserveWithPresentations: z.boolean().optional(),
    dryRun: z.boolean().optional(),
  }),
});

// =============================================================================
// ROUTES
// =============================================================================

/**
 * @swagger
 * /api/v1/sessions:
 *   post:
 *     summary: Create a new session
 *     tags: [Sessions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *                 description: Session title
 *               description:
 *                 type: string
 *                 description: Session description
 *               userId:
 *                 type: string
 *                 format: uuid
 *                 description: User ID
 *               initialMessage:
 *                 type: string
 *                 description: Initial message for the session
 *               settings:
 *                 type: object
 *                 description: Session settings
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Session tags
 *     responses:
 *       201:
 *         description: Session created successfully
 *       400:
 *         description: Invalid request data
 *       500:
 *         description: Internal server error
 */
router.post('/', validateRequest(createSessionSchema), sessionsController.createSession);

/**
 * @swagger
 * /api/v1/sessions:
 *   get:
 *     summary: List sessions with filtering and pagination
 *     tags: [Sessions]
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by user ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, archived, deleted]
 *         description: Filter by session status
 *       - in: query
 *         name: archived
 *         schema:
 *           type: boolean
 *         description: Filter by archived status
 *       - in: query
 *         name: bookmarked
 *         schema:
 *           type: boolean
 *         description: Filter by bookmarked status
 *       - in: query
 *         name: tags
 *         schema:
 *           type: string
 *         description: Filter by tags (comma-separated)
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in title and description
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of sessions to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of sessions to skip
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, updatedAt, lastMessageAt, title]
 *           default: updatedAt
 *         description: Sort field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Sessions retrieved successfully
 *       400:
 *         description: Invalid query parameters
 *       500:
 *         description: Internal server error
 */
router.get('/', validateRequest(listSessionsSchema), sessionsController.listSessions);

/**
 * @swagger
 * /api/v1/sessions/stats:
 *   get:
 *     summary: Get session statistics
 *     tags: [Sessions]
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter statistics by user ID
 *     responses:
 *       200:
 *         description: Session statistics retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get('/stats', sessionsController.getSessionStats);

/**
 * @swagger
 * /api/v1/sessions/search:
 *   get:
 *     summary: Search sessions
 *     tags: [Sessions]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by user ID
 *     responses:
 *       200:
 *         description: Search results retrieved successfully
 *       400:
 *         description: Invalid search query
 *       500:
 *         description: Internal server error
 */
router.get('/search', validateRequest(searchSessionsSchema), sessionsController.searchSessions);

/**
 * @swagger
 * /api/v1/sessions/cleanup:
 *   post:
 *     summary: Clean up old sessions
 *     tags: [Sessions]
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               olderThan:
 *                 type: string
 *                 format: date-time
 *                 description: Delete sessions older than this date
 *               status:
 *                 type: string
 *                 enum: [active, archived, deleted]
 *                 description: Filter by session status
 *               preserveBookmarked:
 *                 type: boolean
 *                 default: true
 *                 description: Preserve bookmarked sessions
 *               preserveWithPresentations:
 *                 type: boolean
 *                 default: true
 *                 description: Preserve sessions with presentations
 *               dryRun:
 *                 type: boolean
 *                 default: false
 *                 description: Perform dry run without actual deletion
 *     responses:
 *       200:
 *         description: Cleanup completed successfully
 *       400:
 *         description: Invalid request data
 *       500:
 *         description: Internal server error
 */
router.post('/cleanup', validateRequest(cleanupSessionsSchema), sessionsController.cleanupSessions);

/**
 * @swagger
 * /api/v1/sessions/{id}:
 *   get:
 *     summary: Get session by ID
 *     tags: [Sessions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Session ID
 *     responses:
 *       200:
 *         description: Session retrieved successfully
 *       404:
 *         description: Session not found
 *       500:
 *         description: Internal server error
 */
router.get('/:id', validateRequest(sessionParamsSchema), sessionsController.getSession);

/**
 * @swagger
 * /api/v1/sessions/{id}:
 *   put:
 *     summary: Update session
 *     tags: [Sessions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Session ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: Session title
 *               description:
 *                 type: string
 *                 description: Session description
 *               settings:
 *                 type: object
 *                 description: Session settings
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Session tags
 *               bookmarked:
 *                 type: boolean
 *                 description: Bookmark status
 *               archived:
 *                 type: boolean
 *                 description: Archive status
 *     responses:
 *       200:
 *         description: Session updated successfully
 *       404:
 *         description: Session not found
 *       400:
 *         description: Invalid request data
 *       500:
 *         description: Internal server error
 */
router.put('/:id', validateRequest(updateSessionSchema), sessionsController.updateSession);

/**
 * @swagger
 * /api/v1/sessions/{id}:
 *   delete:
 *     summary: Delete session
 *     tags: [Sessions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Session ID
 *     responses:
 *       200:
 *         description: Session deleted successfully
 *       404:
 *         description: Session not found
 *       500:
 *         description: Internal server error
 */
router.delete('/:id', validateRequest(sessionParamsSchema), sessionsController.deleteSession);

/**
 * @swagger
 * /api/v1/sessions/{id}/messages:
 *   post:
 *     summary: Add message to session
 *     tags: [Sessions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Session ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 description: Message content
 *               role:
 *                 type: string
 *                 enum: [user, assistant, system]
 *                 default: user
 *                 description: Message role
 *               metadata:
 *                 type: object
 *                 description: Message metadata
 *     responses:
 *       201:
 *         description: Message added successfully
 *       404:
 *         description: Session not found
 *       400:
 *         description: Invalid request data
 *       500:
 *         description: Internal server error
 */
router.post('/:id/messages', validateRequest(addMessageSchema), sessionsController.addMessage);

/**
 * @swagger
 * /api/v1/sessions/{id}/messages:
 *   get:
 *     summary: Get session messages
 *     tags: [Sessions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Session ID
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of messages to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *         description: Number of messages to skip
 *     responses:
 *       200:
 *         description: Messages retrieved successfully
 *       404:
 *         description: Session not found
 *       500:
 *         description: Internal server error
 */
router.get('/:id/messages', validateRequest(sessionParamsSchema), sessionsController.getMessages);

/**
 * @swagger
 * /api/v1/sessions/{id}/presentations:
 *   post:
 *     summary: Add presentation reference to session
 *     tags: [Sessions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Session ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id
 *               - title
 *               - fileName
 *               - fileSize
 *               - slideCount
 *             properties:
 *               id:
 *                 type: string
 *                 format: uuid
 *                 description: Presentation ID
 *               title:
 *                 type: string
 *                 description: Presentation title
 *               fileName:
 *                 type: string
 *                 description: Original file name
 *               fileSize:
 *                 type: integer
 *                 description: File size in bytes
 *               slideCount:
 *                 type: integer
 *                 description: Number of slides
 *               thumbnailUrl:
 *                 type: string
 *                 format: uri
 *                 description: Thumbnail URL
 *               universalSchemaId:
 *                 type: string
 *                 format: uuid
 *                 description: Universal schema ID
 *     responses:
 *       200:
 *         description: Presentation reference added successfully
 *       404:
 *         description: Session not found
 *       400:
 *         description: Invalid request data
 *       500:
 *         description: Internal server error
 */
router.post('/:id/presentations', validateRequest(addPresentationSchema), sessionsController.addPresentationReference);

/**
 * @swagger
 * /api/v1/sessions/{id}/archive:
 *   post:
 *     summary: Archive session
 *     tags: [Sessions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Session ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Reason for archiving
 *               preserveMessages:
 *                 type: boolean
 *                 default: true
 *                 description: Preserve messages when archiving
 *               preservePresentations:
 *                 type: boolean
 *                 default: true
 *                 description: Preserve presentations when archiving
 *               notifyUser:
 *                 type: boolean
 *                 default: false
 *                 description: Notify user about archiving
 *     responses:
 *       200:
 *         description: Session archived successfully
 *       404:
 *         description: Session not found
 *       400:
 *         description: Invalid request data
 *       500:
 *         description: Internal server error
 */
router.post('/:id/archive', validateRequest(archiveSessionSchema), sessionsController.archiveSession);

/**
 * @swagger
 * /api/v1/sessions/{id}/restore:
 *   post:
 *     summary: Restore session from archive
 *     tags: [Sessions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Session ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Reason for restoring
 *               restoreMessages:
 *                 type: boolean
 *                 default: true
 *                 description: Restore messages when restoring
 *               restorePresentations:
 *                 type: boolean
 *                 default: true
 *                 description: Restore presentations when restoring
 *               notifyUser:
 *                 type: boolean
 *                 default: false
 *                 description: Notify user about restoring
 *     responses:
 *       200:
 *         description: Session restored successfully
 *       404:
 *         description: Session not found
 *       400:
 *         description: Invalid request data
 *       500:
 *         description: Internal server error
 */
router.post('/:id/restore', validateRequest(restoreSessionSchema), sessionsController.restoreSession);

/**
 * @swagger
 * /api/v1/sessions/{id}/export:
 *   get:
 *     summary: Export session data
 *     tags: [Sessions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Session ID
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [json, csv, pdf, html]
 *           default: json
 *         description: Export format
 *       - in: query
 *         name: includeMetadata
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Include metadata in export
 *       - in: query
 *         name: includeMessages
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Include messages in export
 *       - in: query
 *         name: includePresentations
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Include presentations in export
 *     responses:
 *       200:
 *         description: Session exported successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *           text/csv:
 *             schema:
 *               type: string
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *           text/html:
 *             schema:
 *               type: string
 *       404:
 *         description: Session not found
 *       400:
 *         description: Invalid export parameters
 *       500:
 *         description: Internal server error
 */
router.get('/:id/export', validateRequest(exportSessionSchema), sessionsController.exportSession);

export default router;