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

export function createAsyncExtractionRoutes(
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
   * POST /extract-assets-async
   * Queue async asset extraction job
   */
  router.post(
    '/extract-assets-async',
    uploadMiddleware.single('file'), // Use single file upload
    handleAsyncErrors(controller.extractAssetsAsync)
  );

  /**
   * POST /extract-metadata-async
   * Queue async metadata extraction job
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
   * GET /jobs/:jobId
   * Get job status and result
   */
  router.get(
    '/jobs/:jobId',
    handleAsyncErrors(controller.getJobStatus)
  );

  /**
   * DELETE /jobs/:jobId
   * Cancel a job
   */
  router.delete(
    '/jobs/:jobId',
    handleAsyncErrors(controller.cancelJob)
  );

  /**
   * GET /jobs
   * Get list of jobs with filtering
   */
  router.get(
    '/jobs',
    handleAsyncErrors(controller.getJobs)
  );

  // =============================================================================
  // UTILITY ENDPOINTS
  // =============================================================================

  /**
   * GET /extraction-queue
   * Get extraction queue status
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

export function createLegacyAsyncRoutes(
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