import { z } from "zod";
/**
 * Batch Routes
 * 
 * RESTful routes for batch operations on presentations, sessions, and other entities
 */

import { Router } from 'express';
import { BatchController } from '../controllers/batch.controller';
import { validateRequest } from '../middleware/validation.middleware';
import { z } from 'zod';

const router = Router();
const batchController = new BatchController();

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const operationParamsSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid operation ID'),
  }),
});

const listOperationsSchema = z.object({
  query: z.object({
    userId: z.string().uuid('Invalid user ID').optional(),
    limit: z.string().regex(/^\d+$/, 'Limit must be a number').optional(),
    offset: z.string().regex(/^\d+$/, 'Offset must be a number').optional(),
  }),
});

const batchDeletePresentationsSchema = z.object({
  body: z.object({
    presentationIds: z.array(z.string().uuid('Invalid presentation ID')).min(1, 'At least one presentation ID is required').max(50, 'Cannot delete more than 50 presentations at once'),
    deleteType: z.enum(['soft', 'hard']).optional(),
    deleteAttachments: z.boolean().optional(),
    deleteThumbnails: z.boolean().optional(),
    reason: z.string().max(500, 'Reason too long').optional(),
    notifyUsers: z.boolean().optional(),
  }),
});

const batchUpdatePresentationsSchema = z.object({
  body: z.object({
    updates: z.array(z.object({
      presentationId: z.string().uuid('Invalid presentation ID'),
      title: z.string().min(1).max(200).optional(),
      description: z.string().max(1000).optional(),
      tags: z.array(z.string().max(50)).max(20).optional(),
      metadata: z.record(z.any()).optional(),
      settings: z.record(z.any()).optional(),
    })).min(1, 'At least one update is required').max(50, 'Cannot update more than 50 presentations at once'),
    validateChanges: z.boolean().optional(),
    preserveHistory: z.boolean().optional(),
    notifyUsers: z.boolean().optional(),
  }),
});

const batchArchiveSessionsSchema = z.object({
  body: z.object({
    sessionIds: z.array(z.string().uuid('Invalid session ID')).min(1, 'At least one session ID is required').max(100, 'Cannot archive more than 100 sessions at once'),
    archiveReason: z.string().max(500, 'Reason too long').optional(),
    preserveMessages: z.boolean().optional(),
    preservePresentations: z.boolean().optional(),
    notifyUsers: z.boolean().optional(),
    retentionPeriod: z.number().min(1).max(365).optional(),
  }),
});

const batchDeleteSessionsSchema = z.object({
  body: z.object({
    sessionIds: z.array(z.string().uuid('Invalid session ID')).min(1, 'At least one session ID is required').max(100, 'Cannot delete more than 100 sessions at once'),
    deleteType: z.enum(['soft', 'hard']).optional(),
    deleteMessages: z.boolean().optional(),
    deletePresentations: z.boolean().optional(),
    reason: z.string().max(500, 'Reason too long').optional(),
    notifyUsers: z.boolean().optional(),
  }),
});

const batchGenerateThumbnailsSchema = z.object({
  body: z.object({
    presentations: z.array(z.object({
      id: z.string().uuid('Invalid presentation ID'),
      slideIndices: z.array(z.number().min(0)).optional(),
      strategy: z.enum(['real', 'placeholder', 'auto']),
    })).min(1, 'At least one presentation is required').max(20, 'Cannot generate thumbnails for more than 20 presentations at once'),
    thumbnailOptions: z.object({
      width: z.number().min(50).max(2000).optional(),
      height: z.number().min(50).max(2000).optional(),
      format: z.enum(['png', 'jpg', 'webp']).optional(),
      quality: z.enum(['low', 'medium', 'high', 'ultra']).optional(),
      backgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid background color').optional(),
    }).optional(),
    overwriteExisting: z.boolean().optional(),
    storage: z.object({
      provider: z.enum(['firebase', 'local', 's3', 'azure']).optional(),
      bucketName: z.string().optional(),
      pathPrefix: z.string().optional(),
      publicAccess: z.boolean().optional(),
    }).optional(),
    optimization: z.object({
      compress: z.boolean().optional(),
      compressionLevel: z.number().min(0).max(100).optional(),
      stripMetadata: z.boolean().optional(),
      progressive: z.boolean().optional(),
    }).optional(),
  }),
});

// =============================================================================
// BATCH OPERATION MANAGEMENT ROUTES
// =============================================================================

/**
 * @swagger
 * /api/v1/batch/operations:
 *   get:
 *     summary: List batch operations
 *     tags: [Batch Operations]
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by user ID
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *         description: Number of operations to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of operations to skip
 *     responses:
 *       200:
 *         description: Batch operations retrieved successfully
 *       400:
 *         description: Invalid query parameters
 *       500:
 *         description: Internal server error
 */
router.get('/operations', validateRequest(listOperationsSchema), batchController.listBatchOperations);

/**
 * @swagger
 * /api/v1/batch/operations/{id}:
 *   get:
 *     summary: Get batch operation status
 *     tags: [Batch Operations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Operation ID
 *     responses:
 *       200:
 *         description: Batch operation retrieved successfully
 *       404:
 *         description: Batch operation not found
 *       500:
 *         description: Internal server error
 */
router.get('/operations/:id', validateRequest(operationParamsSchema), batchController.getBatchOperation);

/**
 * @swagger
 * /api/v1/batch/operations/{id}/progress:
 *   get:
 *     summary: Get batch operation progress
 *     tags: [Batch Operations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Operation ID
 *     responses:
 *       200:
 *         description: Batch operation progress retrieved successfully
 *       404:
 *         description: Batch operation not found
 *       500:
 *         description: Internal server error
 */
router.get('/operations/:id/progress', validateRequest(operationParamsSchema), batchController.getBatchProgress);

/**
 * @swagger
 * /api/v1/batch/operations/{id}/cancel:
 *   post:
 *     summary: Cancel batch operation
 *     tags: [Batch Operations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Operation ID
 *     responses:
 *       200:
 *         description: Batch operation cancelled successfully
 *       404:
 *         description: Batch operation not found or cannot be cancelled
 *       500:
 *         description: Internal server error
 */
router.post('/operations/:id/cancel', validateRequest(operationParamsSchema), batchController.cancelBatchOperation);

/**
 * @swagger
 * /api/v1/batch/operations/{id}/report:
 *   get:
 *     summary: Generate batch operation report
 *     tags: [Batch Operations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Operation ID
 *     responses:
 *       200:
 *         description: Batch operation report generated successfully
 *       404:
 *         description: Batch operation not found
 *       500:
 *         description: Internal server error
 */
router.get('/operations/:id/report', validateRequest(operationParamsSchema), batchController.generateBatchReport);

// =============================================================================
// PRESENTATION BATCH OPERATIONS ROUTES
// =============================================================================

/**
 * @swagger
 * /api/v1/batch/presentations/delete:
 *   post:
 *     summary: Batch delete presentations
 *     tags: [Batch Operations]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - presentationIds
 *             properties:
 *               presentationIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 minItems: 1
 *                 maxItems: 50
 *                 description: Array of presentation IDs to delete
 *               deleteType:
 *                 type: string
 *                 enum: [soft, hard]
 *                 default: soft
 *                 description: Type of deletion
 *               deleteAttachments:
 *                 type: boolean
 *                 default: true
 *                 description: Whether to delete attachments
 *               deleteThumbnails:
 *                 type: boolean
 *                 default: true
 *                 description: Whether to delete thumbnails
 *               reason:
 *                 type: string
 *                 maxLength: 500
 *                 description: Reason for deletion
 *               notifyUsers:
 *                 type: boolean
 *                 default: false
 *                 description: Whether to notify users
 *     responses:
 *       202:
 *         description: Batch delete operation started
 *       400:
 *         description: Invalid request data
 *       500:
 *         description: Internal server error
 */
router.post('/presentations/delete', validateRequest(batchDeletePresentationsSchema), batchController.batchDeletePresentations);

/**
 * @swagger
 * /api/v1/batch/presentations/update:
 *   post:
 *     summary: Batch update presentations
 *     tags: [Batch Operations]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - updates
 *             properties:
 *               updates:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - presentationId
 *                   properties:
 *                     presentationId:
 *                       type: string
 *                       format: uuid
 *                       description: Presentation ID
 *                     title:
 *                       type: string
 *                       minLength: 1
 *                       maxLength: 200
 *                       description: New title
 *                     description:
 *                       type: string
 *                       maxLength: 1000
 *                       description: New description
 *                     tags:
 *                       type: array
 *                       items:
 *                         type: string
 *                         maxLength: 50
 *                       maxItems: 20
 *                       description: Tags
 *                     metadata:
 *                       type: object
 *                       description: Additional metadata
 *                     settings:
 *                       type: object
 *                       description: Presentation settings
 *                 minItems: 1
 *                 maxItems: 50
 *                 description: Array of updates to apply
 *               validateChanges:
 *                 type: boolean
 *                 default: true
 *                 description: Whether to validate changes
 *               preserveHistory:
 *                 type: boolean
 *                 default: true
 *                 description: Whether to preserve history
 *               notifyUsers:
 *                 type: boolean
 *                 default: false
 *                 description: Whether to notify users
 *     responses:
 *       202:
 *         description: Batch update operation started
 *       400:
 *         description: Invalid request data
 *       500:
 *         description: Internal server error
 */
router.post('/presentations/update', validateRequest(batchUpdatePresentationsSchema), batchController.batchUpdatePresentations);

// =============================================================================
// SESSION BATCH OPERATIONS ROUTES
// =============================================================================

/**
 * @swagger
 * /api/v1/batch/sessions/archive:
 *   post:
 *     summary: Batch archive sessions
 *     tags: [Batch Operations]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sessionIds
 *             properties:
 *               sessionIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 minItems: 1
 *                 maxItems: 100
 *                 description: Array of session IDs to archive
 *               archiveReason:
 *                 type: string
 *                 maxLength: 500
 *                 description: Reason for archiving
 *               preserveMessages:
 *                 type: boolean
 *                 default: true
 *                 description: Whether to preserve messages
 *               preservePresentations:
 *                 type: boolean
 *                 default: true
 *                 description: Whether to preserve presentations
 *               notifyUsers:
 *                 type: boolean
 *                 default: false
 *                 description: Whether to notify users
 *               retentionPeriod:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 365
 *                 description: Retention period in days
 *     responses:
 *       202:
 *         description: Batch archive operation started
 *       400:
 *         description: Invalid request data
 *       500:
 *         description: Internal server error
 */
router.post('/sessions/archive', validateRequest(batchArchiveSessionsSchema), batchController.batchArchiveSessions);

/**
 * @swagger
 * /api/v1/batch/sessions/delete:
 *   post:
 *     summary: Batch delete sessions
 *     tags: [Batch Operations]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sessionIds
 *             properties:
 *               sessionIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 minItems: 1
 *                 maxItems: 100
 *                 description: Array of session IDs to delete
 *               deleteType:
 *                 type: string
 *                 enum: [soft, hard]
 *                 default: soft
 *                 description: Type of deletion
 *               deleteMessages:
 *                 type: boolean
 *                 default: true
 *                 description: Whether to delete messages
 *               deletePresentations:
 *                 type: boolean
 *                 default: false
 *                 description: Whether to delete presentations
 *               reason:
 *                 type: string
 *                 maxLength: 500
 *                 description: Reason for deletion
 *               notifyUsers:
 *                 type: boolean
 *                 default: false
 *                 description: Whether to notify users
 *     responses:
 *       202:
 *         description: Batch delete operation started
 *       400:
 *         description: Invalid request data
 *       500:
 *         description: Internal server error
 */
router.post('/sessions/delete', validateRequest(batchDeleteSessionsSchema), batchController.batchDeleteSessions);

// =============================================================================
// THUMBNAIL BATCH OPERATIONS ROUTES
// =============================================================================

/**
 * @swagger
 * /api/v1/batch/thumbnails/generate:
 *   post:
 *     summary: Batch generate thumbnails
 *     tags: [Batch Operations]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - presentations
 *             properties:
 *               presentations:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - id
 *                     - strategy
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                       description: Presentation ID
 *                     slideIndices:
 *                       type: array
 *                       items:
 *                         type: integer
 *                         minimum: 0
 *                       description: Specific slide indices (optional)
 *                     strategy:
 *                       type: string
 *                       enum: [real, placeholder, auto]
 *                       description: Thumbnail generation strategy
 *                 minItems: 1
 *                 maxItems: 20
 *                 description: Array of presentations to generate thumbnails for
 *               thumbnailOptions:
 *                 type: object
 *                 properties:
 *                   width:
 *                     type: integer
 *                     minimum: 50
 *                     maximum: 2000
 *                     default: 300
 *                     description: Thumbnail width
 *                   height:
 *                     type: integer
 *                     minimum: 50
 *                     maximum: 2000
 *                     default: 225
 *                     description: Thumbnail height
 *                   format:
 *                     type: string
 *                     enum: [png, jpg, webp]
 *                     default: png
 *                     description: Thumbnail format
 *                   quality:
 *                     type: string
 *                     enum: [low, medium, high, ultra]
 *                     default: medium
 *                     description: Thumbnail quality
 *                   backgroundColor:
 *                     type: string
 *                     pattern: '^#[0-9A-Fa-f]{6}$'
 *                     description: Background color (hex)
 *                 description: Thumbnail generation options
 *               overwriteExisting:
 *                 type: boolean
 *                 default: false
 *                 description: Whether to overwrite existing thumbnails
 *               storage:
 *                 type: object
 *                 properties:
 *                   provider:
 *                     type: string
 *                     enum: [firebase, local, s3, azure]
 *                     default: firebase
 *                     description: Storage provider
 *                   bucketName:
 *                     type: string
 *                     description: Storage bucket name
 *                   pathPrefix:
 *                     type: string
 *                     description: Storage path prefix
 *                   publicAccess:
 *                     type: boolean
 *                     default: true
 *                     description: Whether thumbnails should be publicly accessible
 *                 description: Storage configuration
 *               optimization:
 *                 type: object
 *                 properties:
 *                   compress:
 *                     type: boolean
 *                     default: true
 *                     description: Whether to compress thumbnails
 *                   compressionLevel:
 *                     type: integer
 *                     minimum: 0
 *                     maximum: 100
 *                     default: 80
 *                     description: Compression level
 *                   stripMetadata:
 *                     type: boolean
 *                     default: true
 *                     description: Whether to strip metadata
 *                   progressive:
 *                     type: boolean
 *                     default: false
 *                     description: Whether to use progressive encoding
 *                 description: Optimization settings
 *     responses:
 *       202:
 *         description: Batch thumbnail generation started
 *       400:
 *         description: Invalid request data
 *       500:
 *         description: Internal server error
 */
router.post('/thumbnails/generate', validateRequest(batchGenerateThumbnailsSchema), batchController.batchGenerateThumbnails);

export default router;