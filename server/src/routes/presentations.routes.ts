import { z } from "zod";
/**
 * Enhanced Presentation Management Routes
 * 
 * Comprehensive CRUD operations, versioning, analytics, and search for presentations
 */

import { Router } from 'express';
import { body, param, query } from 'express-validator';
import multer from 'multer';
import { PresentationController } from '../controllers/presentations.controller';
import { validate, handleAsyncErrors, validateRequest } from '../middleware/validate.middleware';
import { auth } from '../middleware/auth.middleware';
import { rateLimit } from '../middleware/rate-limit.middleware';

const router = Router();
const presentationController = new PresentationController();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
      cb(null, true);
    } else {
      cb(new Error('Only PPTX files are allowed'));
    }
  },
});

// =============================================================================
// PRESENTATION CRUD OPERATIONS
// =============================================================================

/**
 * @swagger
 * /presentations:
 *   get:
 *     tags: [Enhanced Presentations]
 *     summary: List presentations with advanced filtering
 *     description: Retrieve presentations with pagination, filtering, and sorting
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of presentations per page
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, updatedAt, title, slideCount, fileSize]
 *           default: createdAt
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *       - in: query
 *         name: author
 *         schema:
 *           type: string
 *         description: Filter by author
 *       - in: query
 *         name: company
 *         schema:
 *           type: string
 *         description: Filter by company
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [completed, processing, failed, draft]
 *         description: Filter by processing status
 *       - in: query
 *         name: minSlideCount
 *         schema:
 *           type: integer
 *         description: Minimum number of slides
 *       - in: query
 *         name: maxSlideCount
 *         schema:
 *           type: integer
 *         description: Maximum number of slides
 *     responses:
 *       200:
 *         description: Successfully retrieved presentations
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PresentationListResponse'
 */
router.get('/', handleAsyncErrors(presentationController.listPresentations.bind(presentationController)));

/**
 * @swagger
 * /presentations:
 *   post:
 *     tags: [Enhanced Presentations]
 *     summary: Create new presentation
 *     description: Upload and process a new PPTX file with metadata
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: PPTX file to upload
 *               title:
 *                 type: string
 *                 description: Presentation title (optional)
 *               description:
 *                 type: string
 *                 description: Presentation description
 *               tags:
 *                 type: string
 *                 description: Comma-separated tags
 *               generateThumbnails:
 *                 type: boolean
 *                 default: true
 *               processImmediately:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       201:
 *         description: Presentation created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PresentationResponse'
 */
router.post(
  '/',
  upload.single('file'),
  validateRequest({
    body: {
      type: 'object',
      properties: {
        title: { type: 'string', maxLength: 200 },
        description: { type: 'string', maxLength: 1000 },
        tags: { type: 'string' },
        generateThumbnails: { type: 'boolean', default: true },
        processImmediately: { type: 'boolean', default: true },
      },
    },
  }),
  handleAsyncErrors(presentationController.createPresentation.bind(presentationController))
);

/**
 * @swagger
 * /presentations/{id}:
 *   get:
 *     tags: [Enhanced Presentations]
 *     summary: Get presentation by ID
 *     description: Retrieve detailed presentation information including metadata and processing status
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Presentation ID
 *       - in: query
 *         name: includeVersions
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Include version history
 *       - in: query
 *         name: includeAnalytics
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Include analytics data
 *     responses:
 *       200:
 *         description: Presentation retrieved successfully
 *       404:
 *         description: Presentation not found
 */
router.get('/:id', handleAsyncErrors(presentationController.getPresentation.bind(presentationController)));

/**
 * @swagger
 * /presentations/{id}:
 *   put:
 *     tags: [Enhanced Presentations]
 *     summary: Update presentation metadata
 *     description: Update presentation title, description, tags, and other metadata
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PresentationUpdateRequest'
 *     responses:
 *       200:
 *         description: Presentation updated successfully
 */
router.put(
  '/:id',
  validateRequest({
    params: {
      type: 'object',
      properties: {
        id: { type: 'string', minLength: 1 },
      },
      required: ['id'],
    },
    body: {
      type: 'object',
      properties: {
        title: { type: 'string', maxLength: 200 },
        description: { type: 'string', maxLength: 1000 },
        tags: { type: 'array', items: { type: 'string' } },
        category: { type: 'string' },
        isPublic: { type: 'boolean' },
        allowDownload: { type: 'boolean' },
      },
    },
  }),
  handleAsyncErrors(presentationController.updatePresentation.bind(presentationController))
);

/**
 * @swagger
 * /presentations/{id}:
 *   delete:
 *     tags: [Enhanced Presentations]
 *     summary: Delete presentation
 *     description: Permanently delete presentation and all associated data
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: deleteVersions
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Also delete all versions
 *       - in: query
 *         name: deleteThumbnails
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Also delete thumbnails
 *     responses:
 *       200:
 *         description: Presentation deleted successfully
 */
router.delete('/:id', handleAsyncErrors(presentationController.deletePresentation.bind(presentationController)));

// =============================================================================
// VERSION MANAGEMENT
// =============================================================================

/**
 * @swagger
 * /presentations/{id}/versions:
 *   get:
 *     tags: [Enhanced Presentations]
 *     summary: Get presentation version history
 *     description: Retrieve all versions of a presentation with metadata
 */
router.get('/:id/versions', handleAsyncErrors(presentationController.getVersionHistory.bind(presentationController)));

/**
 * @swagger
 * /presentations/{id}/versions:
 *   post:
 *     tags: [Enhanced Presentations]
 *     summary: Create new version
 *     description: Upload a new version of an existing presentation
 */
router.post(
  '/:id/versions',
  upload.single('file'),
  handleAsyncErrors(presentationController.createVersion.bind(presentationController))
);

/**
 * @swagger
 * /presentations/{id}/versions/{version}/restore:
 *   post:
 *     tags: [Enhanced Presentations]
 *     summary: Restore presentation to specific version
 */
router.post('/:id/versions/:version/restore', handleAsyncErrors(presentationController.restoreVersion.bind(presentationController)));

// =============================================================================
// ANALYTICS AND INSIGHTS
// =============================================================================

/**
 * @swagger
 * /presentations/{id}/analytics:
 *   get:
 *     tags: [Enhanced Presentations]
 *     summary: Get presentation analytics
 *     description: Retrieve detailed analytics and insights for a presentation
 */
router.get('/:id/analytics', handleAsyncErrors(presentationController.getPresentationAnalytics.bind(presentationController)));

/**
 * @swagger
 * /presentations/analytics/summary:
 *   get:
 *     tags: [Enhanced Presentations]
 *     summary: Get analytics summary
 *     description: Get aggregated analytics across all user presentations
 */
router.get('/analytics/summary', handleAsyncErrors(presentationController.getAnalyticsSummary.bind(presentationController)));

// =============================================================================
// SEARCH AND DISCOVERY
// =============================================================================

/**
 * @swagger
 * /presentations/search:
 *   get:
 *     tags: [Enhanced Presentations]
 *     summary: Search presentations
 *     description: Full-text search across presentation content, metadata, and tags
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query
 *       - in: query
 *         name: searchIn
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *             enum: [title, content, tags, author, company]
 *           default: [title, content, tags]
 *         description: Fields to search in
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 */
router.get('/search', handleAsyncErrors(presentationController.searchPresentations.bind(presentationController)));

// =============================================================================
// EXPORT AND SHARING
// =============================================================================

/**
 * @swagger
 * /presentations/{id}/export:
 *   post:
 *     tags: [Enhanced Presentations]
 *     summary: Export presentation
 *     description: Export presentation in various formats
 */
router.post('/:id/export', handleAsyncErrors(presentationController.exportPresentation.bind(presentationController)));

/**
 * @swagger
 * /presentations/{id}/share:
 *   post:
 *     tags: [Enhanced Presentations]
 *     summary: Create sharing link
 *     description: Generate secure sharing link for presentation
 */
router.post('/:id/share', handleAsyncErrors(presentationController.createSharingLink.bind(presentationController)));

// =============================================================================
// BULK OPERATIONS
// =============================================================================

/**
 * @swagger
 * /presentations/bulk/delete:
 *   post:
 *     tags: [Enhanced Presentations]
 *     summary: Bulk delete presentations
 *     description: Delete multiple presentations at once
 */
router.post('/bulk/delete', handleAsyncErrors(presentationController.bulkDeletePresentations.bind(presentationController)));

/**
 * @swagger
 * /presentations/bulk/update:
 *   post:
 *     tags: [Enhanced Presentations]
 *     summary: Bulk update presentations
 *     description: Update metadata for multiple presentations
 */
router.post('/bulk/update', handleAsyncErrors(presentationController.bulkUpdatePresentations.bind(presentationController)));

export default router; 