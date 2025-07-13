import { z } from "zod";
/**
 * Async Extraction Routes - Routes for async asset and metadata extraction
 */

import { Router } from 'express';
import { AsyncExtractionController } from '../controllers/async-extraction.controller';
import { createUploadMiddleware } from '../middleware/upload.middleware';
import { UploadTierService } from '../services/upload-tier.service';
import { handleAsyncErrors } from '../middleware/error.middleware';

// =============================================================================
// ROUTE FACTORY
// =============================================================================

export function createAsyncExtractionRoutes async (
  controller: AsyncExtractionController
): Router {
  const router = Router();

  // Create upload middleware with tier support
  const uploadMiddleware = createUploadMiddleware({
    enableTierValidation: true,
    fieldName: 'file',
  });

  // =============================================================================
  // ASYNC EXTRACTION ENDPOINTS
  // =============================================================================

  /**
   * @swagger
   * /extract-assets-async:
   *   post:
   *     tags:
   *       - Async Operations
   *     summary: Queue async asset extraction job
   *     description: |
   *       Queue an asynchronous job to extract embedded assets from large PPTX files.
   *       This endpoint is optimized for large files and provides job tracking with progress updates.
   *       Returns immediately with a job ID that can be used to monitor progress and retrieve results.
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
   *                 description: PPTX file to extract assets from (supports large files up to 200MB)
   *               assetTypes:
   *                 type: string
   *                 description: JSON array of asset types to extract
   *                 example: '["images", "videos", "audio"]'
   *               generateThumbnails:
   *                 type: string
   *                 description: Whether to generate thumbnails for media assets
   *                 enum: ['true', 'false']
   *                 default: 'false'
   *               timeoutMs:
   *                 type: string
   *                 description: Custom timeout in milliseconds (max 5 minutes)
   *                 example: '300000'
   *               userId:
   *                 type: string
   *                 description: User identifier for tracking and organization
   *                 example: 'user_123'
   *             required:
   *               - file
   *           examples:
   *             basic:
   *               summary: Basic asset extraction
   *               value:
   *                 file: (binary)
   *                 assetTypes: '["images", "videos"]'
   *                 generateThumbnails: 'false'
   *             comprehensive:
   *               summary: Comprehensive extraction with thumbnails
   *               value:
   *                 file: (binary)
   *                 assetTypes: '["images", "videos", "audio", "documents"]'
   *                 generateThumbnails: 'true'
   *                 timeoutMs: '300000'
   *                 userId: 'user_123'
   *     responses:
   *       202:
   *         description: Job queued successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   type: object
   *                   properties:
   *                     jobId:
   *                       type: string
   *                       description: Unique job identifier
   *                       example: 'job_abc123_extract_assets'
   *                     status:
   *                       type: string
   *                       enum: [pending, queued]
   *                       example: 'queued'
   *                     estimatedDurationMs:
   *                       type: number
   *                       description: Estimated processing time in milliseconds
   *                       example: 45000
   *                     pollUrl:
   *                       type: string
   *                       description: URL to check job status
   *                       example: '/jobs/job_abc123_extract_assets'
   *                     queuePosition:
   *                       type: number
   *                       description: Position in processing queue
   *                       example: 2
   *                 meta:
   *                   $ref: '#/components/schemas/SuccessMeta'
   *       400:
   *         $ref: '#/components/responses/ValidationError'
   *       413:
   *         $ref: '#/components/responses/FileTooLarge'
   *       503:
   *         $ref: '#/components/responses/ServiceUnavailable'
   */
  router.post(
    '/extract-assets-async',
    uploadMiddleware.single('file'), // Use single file upload
    handleAsyncErrors(controller.extractAssetsAsync)
  );

  /**
   * @swagger
   * /extract-metadata-async:
   *   post:
   *     tags:
   *       - Async Operations
   *     summary: Queue async metadata extraction job
   *     description: |
   *       Queue an asynchronous job to extract comprehensive metadata from large PPTX files.
   *       This endpoint handles extensive metadata extraction including system properties,
   *       custom properties, document statistics, and revision history for large presentations.
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
   *                 description: PPTX file to extract metadata from (supports large files up to 200MB)
   *               includeSystemProperties:
   *                 type: string
   *                 description: Include system metadata properties
   *                 enum: ['true', 'false']
   *                 default: 'true'
   *               includeCustomProperties:
   *                 type: string
   *                 description: Include custom document properties
   *                 enum: ['true', 'false']
   *                 default: 'true'
   *               includeDocumentStatistics:
   *                 type: string
   *                 description: Include document statistics (word count, slide count, etc.)
   *                 enum: ['true', 'false']
   *                 default: 'true'
   *               includeRevisionHistory:
   *                 type: string
   *                 description: Include revision history and version information
   *                 enum: ['true', 'false']
   *                 default: 'false'
   *               timeoutMs:
   *                 type: string
   *                 description: Custom timeout in milliseconds (max 5 minutes)
   *                 example: '300000'
   *               userId:
   *                 type: string
   *                 description: User identifier for tracking and organization
   *                 example: 'user_123'
   *             required:
   *               - file
   *           examples:
   *             standard:
   *               summary: Standard metadata extraction
   *               value:
   *                 file: (binary)
   *                 includeSystemProperties: 'true'
   *                 includeCustomProperties: 'true'
   *                 includeDocumentStatistics: 'true'
   *             comprehensive:
   *               summary: Comprehensive metadata with revision history
   *               value:
   *                 file: (binary)
   *                 includeSystemProperties: 'true'
   *                 includeCustomProperties: 'true'
   *                 includeDocumentStatistics: 'true'
   *                 includeRevisionHistory: 'true'
   *                 timeoutMs: '300000'
   *                 userId: 'user_456'
   *     responses:
   *       202:
   *         description: Job queued successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   type: object
   *                   properties:
   *                     jobId:
   *                       type: string
   *                       description: Unique job identifier
   *                       example: 'job_def456_extract_metadata'
   *                     status:
   *                       type: string
   *                       enum: [pending, queued]
   *                       example: 'queued'
   *                     estimatedDurationMs:
   *                       type: number
   *                       description: Estimated processing time in milliseconds
   *                       example: 25000
   *                     pollUrl:
   *                       type: string
   *                       description: URL to check job status
   *                       example: '/jobs/job_def456_extract_metadata'
   *                     queuePosition:
   *                       type: number
   *                       description: Position in processing queue
   *                       example: 1
   *                 meta:
   *                   $ref: '#/components/schemas/SuccessMeta'
   *       400:
   *         $ref: '#/components/responses/ValidationError'
   *       413:
   *         $ref: '#/components/responses/FileTooLarge'
   *       503:
   *         $ref: '#/components/responses/ServiceUnavailable'
   */
  router.post(
    '/extract-metadata-async',
    uploadMiddleware.single('file'), // Use single file upload
    handleAsyncErrors(controller.extractMetadataAsync)
  );

  // =============================================================================
  // JOB MANAGEMENT ENDPOINTS
  // =============================================================================

  /**
   * @swagger
   * /jobs/{jobId}:
   *   get:
   *     tags:
   *       - Async Operations
   *     summary: Get job status and result
   *     description: |
   *       Retrieve the current status, progress, and results of an asynchronous job.
   *       This endpoint provides real-time updates on job execution and returns
   *       the final results when the job is completed.
   *     parameters:
   *       - in: path
   *         name: jobId
   *         required: true
   *         schema:
   *           type: string
   *         description: Job identifier returned when the job was created
   *         example: 'job_abc123_extract_assets'
   *     responses:
   *       200:
   *         description: Job status retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   type: object
   *                   properties:
   *                     job:
   *                       type: object
   *                       properties:
   *                         id:
   *                           type: string
   *                           example: 'job_abc123_extract_assets'
   *                         type:
   *                           type: string
   *                           enum: [extract-assets, extract-metadata]
   *                           example: 'extract-assets'
   *                         status:
   *                           type: string
   *                           enum: [pending, queued, processing, completed, failed, cancelled]
   *                           example: 'completed'
   *                         progress:
   *                           type: number
   *                           minimum: 0
   *                           maximum: 100
   *                           description: Progress percentage
   *                           example: 100
   *                         result:
   *                           type: object
   *                           description: Job results (when status is completed)
   *                           properties:
   *                             assets:
   *                               type: array
   *                               description: Extracted assets (for asset extraction jobs)
   *                               items:
   *                                 type: object
   *                             metadata:
   *                               type: object
   *                               description: Extracted metadata (for metadata extraction jobs)
   *                         error:
   *                           type: string
   *                           description: Error message (when status is failed)
   *                         estimatedRemainingMs:
   *                           type: number
   *                           description: Estimated remaining time in milliseconds
   *                           example: 15000
   *                         createdAt:
   *                           type: string
   *                           format: date-time
   *                           description: Job creation timestamp
   *                         startedAt:
   *                           type: string
   *                           format: date-time
   *                           description: Job start timestamp
   *                         completedAt:
   *                           type: string
   *                           format: date-time
   *                           description: Job completion timestamp
   *                         userId:
   *                           type: string
   *                           description: User who created the job
   *                 meta:
   *                   $ref: '#/components/schemas/SuccessMeta'
   *       404:
   *         description: Job not found
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *       500:
   *         $ref: '#/components/responses/ServerError'
   */
  router.get(
    '/jobs/:jobId',
    handleAsyncErrors(controller.getJobStatus)
  );

  /**
   * @swagger
   * /jobs/{jobId}:
   *   delete:
   *     tags:
   *       - Async Operations
   *     summary: Cancel a job
   *     description: |
   *       Cancel a pending or processing asynchronous job. Once cancelled,
   *       the job cannot be resumed and any partial results will be discarded.
   *       Only jobs in 'pending', 'queued', or 'processing' status can be cancelled.
   *     parameters:
   *       - in: path
   *         name: jobId
   *         required: true
   *         schema:
   *           type: string
   *         description: Job identifier to cancel
   *         example: 'job_abc123_extract_assets'
   *     responses:
   *       200:
   *         description: Job cancelled successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   type: object
   *                   properties:
   *                     jobId:
   *                       type: string
   *                       example: 'job_abc123_extract_assets'
   *                     previousStatus:
   *                       type: string
   *                       enum: [pending, queued, processing]
   *                       example: 'processing'
   *                     cancelledAt:
   *                       type: string
   *                       format: date-time
   *                       description: Cancellation timestamp
   *                     reason:
   *                       type: string
   *                       example: 'Cancelled by user request'
   *                 meta:
   *                   $ref: '#/components/schemas/SuccessMeta'
   *       400:
   *         description: Job cannot be cancelled (already completed or failed)
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *       404:
   *         description: Job not found
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *       500:
   *         $ref: '#/components/responses/ServerError'
   */
  router.delete(
    '/jobs/:jobId',
    handleAsyncErrors(controller.cancelJob)
  );

  /**
   * @swagger
   * /jobs:
   *   get:
   *     tags:
   *       - Async Operations
   *     summary: Get list of jobs with filtering
   *     description: |
   *       Retrieve a list of asynchronous jobs with optional filtering and pagination.
   *       This endpoint allows monitoring of all jobs created by a user or across the system.
   *     parameters:
   *       - in: query
   *         name: userId
   *         schema:
   *           type: string
   *         description: Filter jobs by user ID
   *         example: 'user_123'
   *       - in: query
   *         name: type
   *         schema:
   *           type: string
   *           enum: [extract-assets, extract-metadata]
   *         description: Filter jobs by type
   *         example: 'extract-assets'
   *       - in: query
   *         name: status
   *         schema:
   *           type: string
   *           enum: [pending, queued, processing, completed, failed, cancelled]
   *         description: Filter jobs by status
   *         example: 'completed'
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 100
   *           default: 20
   *         description: Maximum number of jobs to return
   *         example: 20
   *       - in: query
   *         name: offset
   *         schema:
   *           type: integer
   *           minimum: 0
   *           default: 0
   *         description: Number of jobs to skip for pagination
   *         example: 0
   *       - in: query
   *         name: orderBy
   *         schema:
   *           type: string
   *           enum: [createdAt, updatedAt, completedAt]
   *           default: createdAt
   *         description: Field to order results by
   *         example: 'createdAt'
   *       - in: query
   *         name: orderDirection
   *         schema:
   *           type: string
   *           enum: [asc, desc]
   *           default: desc
   *         description: Order direction
   *         example: 'desc'
   *     responses:
   *       200:
   *         description: Jobs retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   type: object
   *                   properties:
   *                     jobs:
   *                       type: array
   *                       items:
   *                         type: object
   *                         properties:
   *                           id:
   *                             type: string
   *                           type:
   *                             type: string
   *                             enum: [extract-assets, extract-metadata]
   *                           status:
   *                             type: string
   *                             enum: [pending, queued, processing, completed, failed, cancelled]
   *                           progress:
   *                             type: number
   *                             minimum: 0
   *                             maximum: 100
   *                           createdAt:
   *                             type: string
   *                             format: date-time
   *                           completedAt:
   *                             type: string
   *                             format: date-time
   *                           userId:
   *                             type: string
   *                           processingTimeMs:
   *                             type: number
   *                     pagination:
   *                       type: object
   *                       properties:
   *                         total:
   *                           type: number
   *                           description: Total number of jobs matching filter
   *                         limit:
   *                           type: number
   *                           description: Limit used for this request
   *                         offset:
   *                           type: number
   *                           description: Offset used for this request
   *                         hasNext:
   *                           type: boolean
   *                           description: Whether there are more results
   *                 meta:
   *                   $ref: '#/components/schemas/SuccessMeta'
   *       400:
   *         $ref: '#/components/responses/ValidationError'
   *       500:
   *         $ref: '#/components/responses/ServerError'
   */
  router.get(
    '/jobs',
    handleAsyncErrors(controller.getJobs)
  );

  // =============================================================================
  // UTILITY ENDPOINTS
  // =============================================================================

  /**
   * @swagger
   * /extraction-queue:
   *   get:
   *     tags:
   *       - Async Operations
   *     summary: Get extraction queue status
   *     description: |
   *       Retrieve the current status of the extraction processing queue including
   *       active jobs, queue length, performance metrics, and system health information.
   *       This endpoint is useful for monitoring system load and performance.
   *     responses:
   *       200:
   *         description: Queue status retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   type: object
   *                   properties:
   *                     queue:
   *                       type: object
   *                       properties:
   *                         active:
   *                           type: number
   *                           description: Number of currently processing jobs
   *                           example: 2
   *                         pending:
   *                           type: number
   *                           description: Number of jobs waiting in queue
   *                           example: 5
   *                         completed:
   *                           type: number
   *                           description: Number of completed jobs in last 24h
   *                           example: 45
   *                         failed:
   *                           type: number
   *                           description: Number of failed jobs in last 24h
   *                           example: 2
   *                         maxConcurrent:
   *                           type: number
   *                           description: Maximum concurrent jobs allowed
   *                           example: 3
   *                     health:
   *                       type: object
   *                       properties:
   *                         status:
   *                           type: string
   *                           enum: [healthy, degraded, unhealthy]
   *                           example: 'healthy'
   *                         uptime:
   *                           type: number
   *                           description: Queue service uptime in seconds
   *                           example: 86400
   *                         memoryUsage:
   *                           type: object
   *                           properties:
   *                             used:
   *                               type: number
   *                               description: Used memory in MB
   *                             total:
   *                               type: number
   *                               description: Total available memory in MB
   *                             percentage:
   *                               type: number
   *                               description: Memory usage percentage
   *                     performance:
   *                       type: object
   *                       properties:
   *                         averageProcessingTime:
   *                           type: number
   *                           description: Average job processing time in milliseconds
   *                           example: 35000
   *                         throughputPerHour:
   *                           type: number
   *                           description: Jobs processed per hour
   *                           example: 12
   *                         successRate:
   *                           type: number
   *                           description: Success rate percentage
   *                           example: 95.5
   *                         errorRate:
   *                           type: number
   *                           description: Error rate percentage
   *                           example: 4.5
   *                     lastUpdated:
   *                       type: string
   *                       format: date-time
   *                       description: When these metrics were last updated
   *                 meta:
   *                   $ref: '#/components/schemas/SuccessMeta'
   *       500:
   *         $ref: '#/components/responses/ServerError'
   */
  router.get(
    '/extraction-queue',
    handleAsyncErrors(controller.getQueueStatus)
  );

  return router;
}

// =============================================================================
// DEPRECATED LEGACY ROUTES (for backward compatibility)
// =============================================================================

export function createLegacyAsyncRoutes async (
  controller: AsyncExtractionController
): Router {
  const router = Router();
  const uploadMiddleware = createUploadMiddleware({
    enableTierValidation: true,
    fieldName: 'file',
  });

  // Legacy route: /api/extract-assets-async (redirects to new route)
  router.post(
    '/api/extract-assets-async',
    uploadMiddleware.single('file'),
    handleAsyncErrors(controller.extractAssetsAsync)
  );

  // Legacy route: /api/extract-metadata-async (redirects to new route)
  router.post(
    '/api/extract-metadata-async',
    uploadMiddleware.single('file'),
    handleAsyncErrors(controller.extractMetadataAsync)
  );

  return router;
} 