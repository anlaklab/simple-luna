/**
 * Async Extraction Controller - Handles async asset and metadata extraction
 */

import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import { AsyncExtractionService } from '../services/async-extraction.service';
import { JobsService } from '../services/jobs.service';

// =============================================================================
// INTERFACES
// =============================================================================

interface AsyncExtractionRequest extends Request {
  file?: Express.Multer.File;
  body: {
    assetTypes?: string[];
    generateThumbnails?: boolean;
    includeSystemProperties?: boolean;
    includeCustomProperties?: boolean;
    includeDocumentStatistics?: boolean;
    includeRevisionHistory?: boolean;
    timeoutMs?: number;
    userId?: string;
  };
}

// =============================================================================
// CONTROLLER CLASS
// =============================================================================

export class AsyncExtractionController {
  private readonly asyncExtractionService: AsyncExtractionService;
  private readonly jobsService: JobsService;

  constructor(
    asyncExtractionService: AsyncExtractionService,
    jobsService: JobsService
  ) {
    this.asyncExtractionService = asyncExtractionService;
    this.jobsService = jobsService;
  }

  // =============================================================================
  // ASYNC EXTRACTION ENDPOINTS
  // =============================================================================

  /**
   * POST /api/extract-assets-async
   * Queue an async asset extraction job
   */
  extractAssetsAsync = async (req: AsyncExtractionRequest, res: Response): Promise<void> => {
    const startTime = Date.now();

    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          error: 'No file provided',
          message: 'Please upload a PowerPoint file for asset extraction',
        });
        return;
      }

      const {
        assetTypes = ['images', 'videos', 'audio'],
        generateThumbnails = false,
        timeoutMs,
        userId,
      } = req.body;

      logger.info('Async asset extraction request received', {
        filename: req.file.originalname,
        size: req.file.size,
        userId,
        assetTypes,
        generateThumbnails,
      });

      // Queue the extraction job
      const jobId = await this.asyncExtractionService.queueAssetExtraction(
        req.file.path,
        req.file.originalname,
        {
          assetTypes,
          generateThumbnails,
          returnFormat: 'urls',
        },
        userId,
        timeoutMs
      );

      // Get initial job status
      const job = await this.jobsService.getJob(jobId);

      res.status(202).json({
        success: true,
        data: {
          jobId,
          status: job?.status || 'pending',
          message: 'Asset extraction job queued successfully',
          pollUrl: `/api/jobs/${jobId}`,
          estimatedDurationMs: timeoutMs || 300000, // 5 minutes default
        },
        meta: {
          processingTimeMs: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        },
      });

    } catch (error) {
      logger.error('Async asset extraction failed', {
        error,
        filename: req.file?.originalname,
        userId: req.body.userId,
      });

      res.status(500).json({
        success: false,
        error: 'Asset extraction failed',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        meta: {
          processingTimeMs: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        },
      });
    }
  };

  /**
   * POST /api/extract-metadata-async
   * Queue an async metadata extraction job
   */
  extractMetadataAsync = async (req: AsyncExtractionRequest, res: Response): Promise<void> => {
    const startTime = Date.now();

    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          error: 'No file provided',
          message: 'Please upload a PowerPoint file for metadata extraction',
        });
        return;
      }

      const {
        includeSystemProperties = true,
        includeCustomProperties = true,
        includeDocumentStatistics = true,
        includeRevisionHistory = false,
        timeoutMs,
        userId,
      } = req.body;

      logger.info('Async metadata extraction request received', {
        filename: req.file.originalname,
        size: req.file.size,
        userId,
        includeSystemProperties,
        includeCustomProperties,
        includeDocumentStatistics,
        includeRevisionHistory,
      });

      // Queue the extraction job
      const jobId = await this.asyncExtractionService.queueMetadataExtraction(
        req.file.path,
        req.file.originalname,
        {
          includeSystemProperties,
          includeCustomProperties,
          includeDocumentStatistics,
          includeRevisionHistory,
        },
        userId,
        timeoutMs
      );

      // Get initial job status
      const job = await this.jobsService.getJob(jobId);

      res.status(202).json({
        success: true,
        data: {
          jobId,
          status: job?.status || 'pending',
          message: 'Metadata extraction job queued successfully',
          pollUrl: `/api/jobs/${jobId}`,
          estimatedDurationMs: timeoutMs || 300000, // 5 minutes default
        },
        meta: {
          processingTimeMs: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        },
      });

    } catch (error) {
      logger.error('Async metadata extraction failed', {
        error,
        filename: req.file?.originalname,
        userId: req.body.userId,
      });

      res.status(500).json({
        success: false,
        error: 'Metadata extraction failed',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        meta: {
          processingTimeMs: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        },
      });
    }
  };

  // =============================================================================
  // JOB MANAGEMENT ENDPOINTS
  // =============================================================================

  /**
   * GET /api/jobs/:jobId
   * Get job status and result
   */
  getJobStatus = async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();

    try {
      const { jobId } = req.params;

      if (!jobId) {
        res.status(400).json({
          success: false,
          error: 'Job ID required',
          message: 'Please provide a valid job ID',
        });
        return;
      }

      const job = await this.jobsService.getJob(jobId);

      if (!job) {
        res.status(404).json({
          success: false,
          error: 'Job not found',
          message: `Job with ID ${jobId} does not exist`,
        });
        return;
      }

      // Calculate remaining time for pending/processing jobs
      let estimatedRemainingMs: number | undefined;
      if (job.status === 'pending' || job.status === 'processing') {
        const timeoutMs = job.metadata?.timeoutMs || 300000; // 5 minutes default
        const elapsedMs = Date.now() - job.createdAt.getTime();
        estimatedRemainingMs = Math.max(0, timeoutMs - elapsedMs);
      }

      res.status(200).json({
        success: true,
        data: {
          jobId: job.id,
          type: job.type,
          status: job.status,
          progress: job.progress || 0,
          result: job.metadata?.result,
          error: job.error,
          createdAt: job.createdAt.toISOString(),
          updatedAt: job.updatedAt.toISOString(),
          completedAt: job.completedAt?.toISOString(),
          processingTimeMs: job.processingTimeMs,
          estimatedRemainingMs,
          // Additional metadata for completed jobs
          ...(job.status === 'completed' && {
            uploadedAssets: job.metadata?.uploadedAssets,
            firebaseUrls: job.metadata?.firebaseUrls,
            metadataDocId: job.metadata?.result?.metadataDocId,
          }),
        },
        meta: {
          processingTimeMs: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        },
      });

    } catch (error) {
      logger.error('Get job status failed', {
        error,
        jobId: req.params.jobId,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to get job status',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        meta: {
          processingTimeMs: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        },
      });
    }
  };

  /**
   * DELETE /api/jobs/:jobId
   * Cancel a job
   */
  cancelJob = async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();

    try {
      const { jobId } = req.params;

      if (!jobId) {
        res.status(400).json({
          success: false,
          error: 'Job ID required',
          message: 'Please provide a valid job ID',
        });
        return;
      }

      const success = await this.asyncExtractionService.cancelJob(jobId);

      if (!success) {
        res.status(404).json({
          success: false,
          error: 'Job not found or cannot be cancelled',
          message: `Job with ID ${jobId} does not exist or is already completed`,
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          jobId,
          message: 'Job cancelled successfully',
        },
        meta: {
          processingTimeMs: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        },
      });

    } catch (error) {
      logger.error('Cancel job failed', {
        error,
        jobId: req.params.jobId,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to cancel job',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        meta: {
          processingTimeMs: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        },
      });
    }
  };

  // =============================================================================
  // UTILITY ENDPOINTS
  // =============================================================================

  /**
   * GET /api/extraction-queue
   * Get extraction queue status
   */
  getQueueStatus = async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();

    try {
      const queueStatus = this.asyncExtractionService.getQueueStatus();
      const healthCheck = await this.asyncExtractionService.healthCheck();

      res.status(200).json({
        success: true,
        data: {
          queue: queueStatus,
          health: healthCheck,
          performance: {
            utilizationPercent: Math.round((queueStatus.processingCount / queueStatus.maxConcurrent) * 100),
            isHealthy: healthCheck.overall,
            queueBacklog: queueStatus.queueLength,
          },
        },
        meta: {
          processingTimeMs: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        },
      });

    } catch (error) {
      logger.error('Get queue status failed', { error });

      res.status(500).json({
        success: false,
        error: 'Failed to get queue status',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        meta: {
          processingTimeMs: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        },
      });
    }
  };

  /**
   * GET /api/jobs
   * Get list of jobs with filtering
   */
  getJobs = async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();

    try {
      const {
        userId,
        type,
        status,
        limit = '20',
        offset = '0',
        orderBy = 'createdAt',
        orderDirection = 'desc',
      } = req.query;

      const jobs = await this.jobsService.getJobs({
        userId: userId as string,
        type: type as any,
        status: status as any,
        limit: parseInt(limit as string, 10),
        offset: parseInt(offset as string, 10),
        orderBy: orderBy as any,
        orderDirection: orderDirection as any,
      });

      res.status(200).json({
        success: true,
        data: {
          jobs,
          pagination: {
            total: jobs.length,
            limit: parseInt(limit as string, 10),
            offset: parseInt(offset as string, 10),
            hasMore: jobs.length === parseInt(limit as string, 10),
          },
        },
        meta: {
          processingTimeMs: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        },
      });

    } catch (error) {
      logger.error('Get jobs failed', { error });

      res.status(500).json({
        success: false,
        error: 'Failed to get jobs',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        meta: {
          processingTimeMs: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        },
      });
    }
  };
} 