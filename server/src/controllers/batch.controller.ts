/**
 * Batch Controller
 * 
 * Handles HTTP requests for batch operations on presentations, sessions, and other entities
 */

import { Request, Response } from 'express';
import { BatchService } from '../services/batch.service';
import { SessionService } from '../services/session.service';
import { ConversionService } from '../services/conversion.service';
import { FirebaseAdapter, FirebaseConfig } from '../adapters/firebase.adapter';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/error.middleware';
import {
  BatchPresentationDeleteRequest,
  BatchPresentationUpdateRequest,
  BatchSessionArchiveRequest,
  BatchSessionDeleteRequest,
  BatchThumbnailGenerateRequest,
} from '../types/batch.types';

export class BatchController {
  private batchService: BatchService;

  constructor() {
    // Create Firebase config from environment variables
    const firebaseConfig: FirebaseConfig = {
      projectId: process.env.FIREBASE_PROJECT_ID!,
      privateKey: process.env.FIREBASE_PRIVATE_KEY!,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET!,
    };

    const firebaseAdapter = new FirebaseAdapter(firebaseConfig);
    const sessionService = new SessionService(firebaseAdapter);
    
    // Create ConversionService with proper config
    const conversionServiceConfig = {
      asposeConfig: {
        licenseFilePath: process.env.ASPOSE_LICENSE_PATH || './Aspose.Slides.Product.Family.lic',
        tempDirectory: process.env.ASPOSE_TEMP_DIR || './temp/aspose',
      },
      firebaseConfig,
      uploadToStorage: false,
      cleanupTempFiles: true,
    };
    
    const conversionService = new ConversionService(conversionServiceConfig);
    this.batchService = new BatchService(firebaseAdapter, sessionService, conversionService);
  }

  // =============================================================================
  // BATCH OPERATION MANAGEMENT
  // =============================================================================

  /**
   * Get batch operation status
   * GET /api/v1/batch/operations/:id
   */
  getBatchOperation = async (req: Request, res: Response): Promise<void> => {
    try {
      const operationId = req.params.id;

      if (!operationId) {
        throw new AppError('Operation ID is required', 400);
      }

      const operation = await this.batchService.getBatchOperation(operationId);

      if (!operation) {
        throw new AppError('Batch operation not found', 404);
      }

      res.json({
        success: true,
        data: operation,
        metadata: {
          operationId: operation.id,
          type: operation.type,
          status: operation.status,
          progress: {
            completed: operation.metadata.processedItems,
            total: operation.metadata.totalItems,
            percentage: operation.metadata.totalItems > 0 
              ? Math.round((operation.metadata.processedItems / operation.metadata.totalItems) * 100) 
              : 0,
          },
        },
      });
    } catch (error) {
      logger.error('Failed to get batch operation', { error, operationId: req.params.id });
      throw error;
    }
  };

  /**
   * Get batch operation progress
   * GET /api/v1/batch/operations/:id/progress
   */
  getBatchProgress = async (req: Request, res: Response): Promise<void> => {
    try {
      const operationId = req.params.id;

      if (!operationId) {
        throw new AppError('Operation ID is required', 400);
      }

      const progress = await this.batchService.getBatchProgress(operationId);

      if (!progress) {
        throw new AppError('Batch operation not found', 404);
      }

      res.json({
        success: true,
        data: progress,
        metadata: {
          operationId: progress.operationId,
          phase: progress.phase,
          lastUpdated: new Date(),
        },
      });
    } catch (error) {
      logger.error('Failed to get batch progress', { error, operationId: req.params.id });
      throw error;
    }
  };

  /**
   * Cancel batch operation
   * POST /api/v1/batch/operations/:id/cancel
   */
  cancelBatchOperation = async (req: Request, res: Response): Promise<void> => {
    try {
      const operationId = req.params.id;

      if (!operationId) {
        throw new AppError('Operation ID is required', 400);
      }

      const cancelled = await this.batchService.cancelBatchOperation(operationId);

      if (!cancelled) {
        throw new AppError('Batch operation not found or cannot be cancelled', 404);
      }

      res.json({
        success: true,
        message: 'Batch operation cancelled successfully',
        metadata: {
          operationId: operationId,
          cancelledAt: new Date(),
        },
      });
    } catch (error) {
      logger.error('Failed to cancel batch operation', { error, operationId: req.params.id });
      throw error;
    }
  };

  /**
   * List batch operations
   * GET /api/v1/batch/operations
   */
  listBatchOperations = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.query.userId as string || req.headers['user-id'] as string;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

      if (limit > 100) {
        throw new AppError('Limit cannot exceed 100', 400);
      }

      const result = await this.batchService.listBatchOperations(userId, limit, offset);

      res.json({
        success: true,
        data: result.operations,
        pagination: {
          total: result.total,
          limit: limit,
          offset: offset,
          page: Math.floor(offset / limit) + 1,
          totalPages: Math.ceil(result.total / limit),
          hasMore: offset + result.operations.length < result.total,
        },
        metadata: {
          queryTime: new Date(),
          userId: userId,
        },
      });
    } catch (error) {
      logger.error('Failed to list batch operations', { error, query: req.query });
      throw error;
    }
  };

  /**
   * Generate batch operation report
   * GET /api/v1/batch/operations/:id/report
   */
  generateBatchReport = async (req: Request, res: Response): Promise<void> => {
    try {
      const operationId = req.params.id;

      if (!operationId) {
        throw new AppError('Operation ID is required', 400);
      }

      const report = await this.batchService.generateBatchReport(operationId);

      if (!report) {
        throw new AppError('Batch operation not found', 404);
      }

      res.json({
        success: true,
        data: report,
        metadata: {
          operationId: report.operationId,
          generatedAt: new Date(),
          reportVersion: '1.0',
        },
      });
    } catch (error) {
      logger.error('Failed to generate batch report', { error, operationId: req.params.id });
      throw error;
    }
  };

  // =============================================================================
  // PRESENTATION BATCH OPERATIONS
  // =============================================================================

  /**
   * Batch delete presentations
   * POST /api/v1/batch/presentations/delete
   */
  batchDeletePresentations = async (req: Request, res: Response): Promise<void> => {
    try {
      const request: BatchPresentationDeleteRequest = {
        presentationIds: req.body.presentationIds || [],
        deleteType: req.body.deleteType || 'soft',
        deleteAttachments: req.body.deleteAttachments !== false,
        deleteThumbnails: req.body.deleteThumbnails !== false,
        reason: req.body.reason,
        notifyUsers: req.body.notifyUsers === true,
      };

      // Validate request
      if (!Array.isArray(request.presentationIds) || request.presentationIds.length === 0) {
        throw new AppError('Presentation IDs array is required and cannot be empty', 400);
      }

      if (request.presentationIds.length > 50) {
        throw new AppError('Cannot delete more than 50 presentations at once', 400);
      }

      const userId = req.headers['user-id'] as string;
      const operationId = await this.batchService.batchDeletePresentations(request, userId);

      res.status(202).json({
        success: true,
        message: 'Batch delete operation started',
        data: {
          operationId: operationId,
          estimatedItems: request.presentationIds.length,
        },
        metadata: {
          operationId: operationId,
          type: 'batch_delete_presentations',
          startedAt: new Date(),
          statusUrl: `/api/v1/batch/operations/${operationId}`,
          progressUrl: `/api/v1/batch/operations/${operationId}/progress`,
        },
      });
    } catch (error) {
      logger.error('Failed to start batch delete presentations', { error, body: req.body });
      throw error;
    }
  };

  /**
   * Batch update presentations
   * POST /api/v1/batch/presentations/update
   */
  batchUpdatePresentations = async (req: Request, res: Response): Promise<void> => {
    try {
      const request: BatchPresentationUpdateRequest = {
        updates: req.body.updates || [],
        validateChanges: req.body.validateChanges !== false,
        preserveHistory: req.body.preserveHistory !== false,
        notifyUsers: req.body.notifyUsers === true,
      };

      // Validate request
      if (!Array.isArray(request.updates) || request.updates.length === 0) {
        throw new AppError('Updates array is required and cannot be empty', 400);
      }

      if (request.updates.length > 50) {
        throw new AppError('Cannot update more than 50 presentations at once', 400);
      }

      // Validate each update
      for (const update of request.updates) {
        if (!update.presentationId) {
          throw new AppError('Each update must have a presentationId', 400);
        }
      }

      const userId = req.headers['user-id'] as string;
      const operationId = await this.batchService.batchUpdatePresentations(request, userId);

      res.status(202).json({
        success: true,
        message: 'Batch update operation started',
        data: {
          operationId: operationId,
          estimatedItems: request.updates.length,
        },
        metadata: {
          operationId: operationId,
          type: 'batch_update_presentations',
          startedAt: new Date(),
          statusUrl: `/api/v1/batch/operations/${operationId}`,
          progressUrl: `/api/v1/batch/operations/${operationId}/progress`,
        },
      });
    } catch (error) {
      logger.error('Failed to start batch update presentations', { error, body: req.body });
      throw error;
    }
  };

  // =============================================================================
  // SESSION BATCH OPERATIONS
  // =============================================================================

  /**
   * Batch archive sessions
   * POST /api/v1/batch/sessions/archive
   */
  batchArchiveSessions = async (req: Request, res: Response): Promise<void> => {
    try {
      const request: BatchSessionArchiveRequest = {
        sessionIds: req.body.sessionIds || [],
        archiveReason: req.body.archiveReason,
        preserveMessages: req.body.preserveMessages !== false,
        preservePresentations: req.body.preservePresentations !== false,
        notifyUsers: req.body.notifyUsers === true,
        retentionPeriod: req.body.retentionPeriod,
      };

      // Validate request
      if (!Array.isArray(request.sessionIds) || request.sessionIds.length === 0) {
        throw new AppError('Session IDs array is required and cannot be empty', 400);
      }

      if (request.sessionIds.length > 100) {
        throw new AppError('Cannot archive more than 100 sessions at once', 400);
      }

      const userId = req.headers['user-id'] as string;
      const operationId = await this.batchService.batchArchiveSessions(request, userId);

      res.status(202).json({
        success: true,
        message: 'Batch archive operation started',
        data: {
          operationId: operationId,
          estimatedItems: request.sessionIds.length,
        },
        metadata: {
          operationId: operationId,
          type: 'batch_archive_sessions',
          startedAt: new Date(),
          statusUrl: `/api/v1/batch/operations/${operationId}`,
          progressUrl: `/api/v1/batch/operations/${operationId}/progress`,
        },
      });
    } catch (error) {
      logger.error('Failed to start batch archive sessions', { error, body: req.body });
      throw error;
    }
  };

  /**
   * Batch delete sessions
   * POST /api/v1/batch/sessions/delete
   */
  batchDeleteSessions = async (req: Request, res: Response): Promise<void> => {
    try {
      const request: BatchSessionDeleteRequest = {
        sessionIds: req.body.sessionIds || [],
        deleteType: req.body.deleteType || 'soft',
        deleteMessages: req.body.deleteMessages !== false,
        deletePresentations: req.body.deletePresentations === true,
        reason: req.body.reason,
        notifyUsers: req.body.notifyUsers === true,
      };

      // Validate request
      if (!Array.isArray(request.sessionIds) || request.sessionIds.length === 0) {
        throw new AppError('Session IDs array is required and cannot be empty', 400);
      }

      if (request.sessionIds.length > 100) {
        throw new AppError('Cannot delete more than 100 sessions at once', 400);
      }

      const userId = req.headers['user-id'] as string;
      const operationId = await this.batchService.batchDeleteSessions(request, userId);

      res.status(202).json({
        success: true,
        message: 'Batch delete operation started',
        data: {
          operationId: operationId,
          estimatedItems: request.sessionIds.length,
        },
        metadata: {
          operationId: operationId,
          type: 'batch_delete_sessions',
          startedAt: new Date(),
          statusUrl: `/api/v1/batch/operations/${operationId}`,
          progressUrl: `/api/v1/batch/operations/${operationId}/progress`,
        },
      });
    } catch (error) {
      logger.error('Failed to start batch delete sessions', { error, body: req.body });
      throw error;
    }
  };

  // =============================================================================
  // THUMBNAIL BATCH OPERATIONS
  // =============================================================================

  /**
   * Batch generate thumbnails
   * POST /api/v1/batch/thumbnails/generate
   */
  batchGenerateThumbnails = async (req: Request, res: Response): Promise<void> => {
    try {
      const request: BatchThumbnailGenerateRequest = {
        presentations: req.body.presentations || [],
        thumbnailOptions: {
          width: req.body.thumbnailOptions?.width || 300,
          height: req.body.thumbnailOptions?.height || 225,
          format: req.body.thumbnailOptions?.format || 'png',
          quality: req.body.thumbnailOptions?.quality || 'medium',
          backgroundColor: req.body.thumbnailOptions?.backgroundColor,
        },
        overwriteExisting: req.body.overwriteExisting === true,
        storage: {
          provider: req.body.storage?.provider || 'firebase',
          bucketName: req.body.storage?.bucketName,
          pathPrefix: req.body.storage?.pathPrefix,
          publicAccess: req.body.storage?.publicAccess !== false,
        },
        optimization: {
          compress: req.body.optimization?.compress !== false,
          compressionLevel: req.body.optimization?.compressionLevel || 80,
          stripMetadata: req.body.optimization?.stripMetadata !== false,
          progressive: req.body.optimization?.progressive === true,
        },
      };

      // Validate request
      if (!Array.isArray(request.presentations) || request.presentations.length === 0) {
        throw new AppError('Presentations array is required and cannot be empty', 400);
      }

      if (request.presentations.length > 20) {
        throw new AppError('Cannot generate thumbnails for more than 20 presentations at once', 400);
      }

      // Validate each presentation
      for (const presentation of request.presentations) {
        if (!presentation.id) {
          throw new AppError('Each presentation must have an ID', 400);
        }
        if (!['real', 'placeholder', 'auto'].includes(presentation.strategy)) {
          throw new AppError('Invalid thumbnail strategy', 400);
        }
      }

      const userId = req.headers['user-id'] as string;
      const operationId = await this.batchService.batchGenerateThumbnails(request, userId);

      res.status(202).json({
        success: true,
        message: 'Batch thumbnail generation started',
        data: {
          operationId: operationId,
          estimatedItems: request.presentations.length,
        },
        metadata: {
          operationId: operationId,
          type: 'batch_generate_thumbnails',
          startedAt: new Date(),
          statusUrl: `/api/v1/batch/operations/${operationId}`,
          progressUrl: `/api/v1/batch/operations/${operationId}/progress`,
        },
      });
    } catch (error) {
      logger.error('Failed to start batch thumbnail generation', { error, body: req.body });
      throw error;
    }
  };
}