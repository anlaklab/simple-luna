/**
 * Enhanced Presentation Management Controller
 * 
 * Handles comprehensive presentation operations including CRUD, versioning, 
 * analytics, search, and bulk operations
 */

import { Request, Response, NextFunction } from 'express';
import { PresentationService } from '../services/presentation.service';
import { ConversionService } from '../services/conversion.service';
import { ThumbnailManagerService } from '../services/thumbnail-manager.service';
import { validationResult } from 'express-validator';
import { handleAsyncErrors } from '../middleware/error.middleware';
import { logger } from '../utils/logger';
import { firebaseConfig } from '../config/firebase';
import { 
  PresentationCreateRequest,
  PresentationUpdateRequest,
  PresentationListQuery,
  PresentationListResponse,
  PresentationGetResponse,
  PresentationAnalytics,
  PresentationExportRequest,
  PresentationExportResponse,
  PresentationSharingRequest,
  PresentationSharingResponse,
  PresentationBulkDeleteRequest,
  PresentationBulkUpdateRequest,
  PresentationMetadata,
  PresentationStatus,
  PresentationVersionInfo,
  PresentationSearchResponse,
  PresentationAnalyticsResponse,
  PresentationAnalyticsSummary,
  PresentationCreateResponse,
  PresentationDeleteResponse,
  PresentationVersionResponse,
  PresentationVersionCreateResponse,
  PresentationVersionRestoreResponse,
  PresentationRenderRequest,
  PresentationRenderResponse,
  PresentationBulkResponse,
  PresentationSharingLinkResponse,
  PresentationVersionsResponse,
  PresentationAssetResponse,
  PresentationSlideResponse,
  PresentationShapeResponse,
  PresentationSlideCreateResponse,
  PresentationSlideUpdateResponse,
  PresentationSlideDeleteResponse,
  PresentationShapeCreateResponse,
  PresentationShapeUpdateResponse,
  PresentationShapeDeleteResponse,
} from '../types/presentation.types';
import { v4 as uuidv4 } from 'uuid';

export class PresentationController {
  private presentationService: PresentationService;
  private conversionService: ConversionService;
  private thumbnailManager: ThumbnailManagerService;

  constructor() {
    // Initialize services with proper configuration
    const firebaseConfig = {
      projectId: process.env.FIREBASE_PROJECT_ID!,
      privateKey: process.env.FIREBASE_PRIVATE_KEY!,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET!,
    };

    this.presentationService = new PresentationService();
    this.conversionService = new ConversionService({
      ...firebaseConfig,
      asposeConfig: {
        licenseFile: process.env.ASPOSE_LICENSE_FILE || '',
        enableLogging: process.env.NODE_ENV === 'development',
      },
    });
    this.thumbnailManager = new ThumbnailManagerService({
      ...firebaseConfig,
      asposeConfig: {
        licenseFile: process.env.ASPOSE_LICENSE_FILE || '',
        enableLogging: process.env.NODE_ENV === 'development',
      },
    });
  }

  // =============================================================================
  // CRUD OPERATIONS
  // =============================================================================

  /**
   * List presentations with advanced filtering and pagination
   */
  async listPresentations(req: Request, res: Response): Promise<void> {
    try {
      const requestId = req.requestId || uuidv4();
      logger.info('List presentations request', { requestId, query: req.query });

      const query: PresentationListQuery = {
        page: parseInt(req.query.page as string) || 1,
        limit: Math.min(parseInt(req.query.limit as string) || 20, 100),
        sortBy: req.query.sortBy as any || 'createdAt',
        sortOrder: req.query.sortOrder as any || 'desc',
        author: req.query.author as string,
        company: req.query.company as string,
        status: req.query.status as any,
        minSlideCount: req.query.minSlideCount ? parseInt(req.query.minSlideCount as string) : undefined,
        maxSlideCount: req.query.maxSlideCount ? parseInt(req.query.maxSlideCount as string) : undefined,
        tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
      };

      const result = await this.presentationService.listPresentations(query);

      res.json({
        success: true,
        data: result,
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
          query,
        },
      });

    } catch (error) {
      logger.error('Failed to list presentations', { error, requestId: req.requestId });
      res.status(500).json({
        success: false,
        error: {
          type: 'server_error',
          code: 'LIST_PRESENTATIONS_FAILED',
          message: 'Failed to retrieve presentations',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.requestId,
        },
      });
    }
  }

  /**
   * Create new presentation from uploaded PPTX file
   */
  async createPresentation(req: Request, res: Response): Promise<void> {
    try {
      const requestId = req.requestId || uuidv4();
      logger.info('Create presentation request', { requestId, file: req.file?.originalname });

      // Validate file upload
      if (!req.file) {
        res.status(400).json({
          success: false,
          error: {
            type: 'validation_error',
            code: 'FILE_REQUIRED',
            message: 'PPTX file upload is required',
          },
        });
        return;
      }

      // Validate file type
      const allowedMimeTypes = [
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/vnd.ms-powerpoint',
      ];

      if (!allowedMimeTypes.includes(req.file.mimetype)) {
        res.status(400).json({
          success: false,
          error: {
            type: 'validation_error',
            code: 'INVALID_FILE_TYPE',
            message: 'Only PPTX and PPT files are allowed',
          },
        });
        return;
      }

      const createRequest: PresentationCreateRequest = {
        file: {
          originalName: req.file.originalname,
          buffer: req.file.buffer,
          mimetype: req.file.mimetype,
          size: req.file.size,
        },
        title: req.body.title || req.file.originalname,
        description: req.body.description || '',
        tags: req.body.tags ? JSON.parse(req.body.tags) : [],
        metadata: {
          author: req.body.author || '',
          company: req.body.company || '',
          category: req.body.category || '',
          language: req.body.language || 'en',
          keywords: req.body.keywords ? JSON.parse(req.body.keywords) : [],
        },
      };

      const result = await this.presentationService.createPresentation(createRequest);

      res.status(201).json({
        success: true,
        data: result,
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
        },
      });

    } catch (error) {
      logger.error('Failed to create presentation', { error, requestId: req.requestId });
      res.status(500).json({
        success: false,
        error: {
          type: 'server_error',
          code: 'CREATE_PRESENTATION_FAILED',
          message: 'Failed to create presentation',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.requestId,
        },
      });
    }
  }

  /**
   * Get presentation by ID with optional version and analytics data
   */
  async getPresentation(req: Request, res: Response): Promise<void> {
    try {
      const requestId = req.requestId || uuidv4();
      const { id } = req.params;
      const includeVersions = req.query.includeVersions === 'true';
      const includeAnalytics = req.query.includeAnalytics === 'true';

      logger.info('Get presentation request', { requestId, id, includeVersions, includeAnalytics });

      const result = await this.presentationService.getPresentation(id, {
        includeVersions,
        includeAnalytics,
      });

      if (!result) {
        res.status(404).json({
          success: false,
          error: {
            type: 'not_found',
            code: 'PRESENTATION_NOT_FOUND',
            message: `Presentation with ID ${id} not found`,
          },
        });
        return;
      }

      res.json({
        success: true,
        data: result,
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
        },
      });

    } catch (error) {
      logger.error('Failed to get presentation', { error, requestId: req.requestId, id: req.params.id });
      res.status(500).json({
        success: false,
        error: {
          type: 'server_error',
          code: 'GET_PRESENTATION_FAILED',
          message: 'Failed to retrieve presentation',
        },
      });
    }
  }

  /**
   * Update presentation metadata
   */
  async updatePresentation(req: Request, res: Response): Promise<void> {
    try {
      const requestId = req.requestId || uuidv4();
      const { id } = req.params;

      logger.info('Update presentation request', { requestId, id, updates: req.body });

      const updateRequest: PresentationUpdateRequest = {
        title: req.body.title,
        description: req.body.description,
        tags: req.body.tags,
        isPublic: req.body.isPublic,
        allowDownload: req.body.allowDownload,
        metadata: req.body.metadata,
      };

      const result = await this.presentationService.updatePresentation(id, updateRequest);

      res.json({
        success: true,
        data: result,
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
        },
      });

    } catch (error) {
      logger.error('Failed to update presentation', { error, requestId: req.requestId, id: req.params.id });
      res.status(500).json({
        success: false,
        error: {
          type: 'server_error',
          code: 'UPDATE_PRESENTATION_FAILED',
          message: 'Failed to update presentation',
        },
      });
    }
  }

  /**
   * Delete presentation and associated data
   */
  async deletePresentation(req: Request, res: Response): Promise<void> {
    try {
      const requestId = req.requestId || uuidv4();
      const { id } = req.params;
      const deleteVersions = req.query.deleteVersions !== 'false';
      const deleteThumbnails = req.query.deleteThumbnails !== 'false';

      logger.info('Delete presentation request', { requestId, id, deleteVersions, deleteThumbnails });

      await this.presentationService.deletePresentation(id, {
        deleteVersions,
        deleteThumbnails,
      });

      res.json({
        success: true,
        message: 'Presentation deleted successfully',
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
        },
      });

    } catch (error) {
      logger.error('Failed to delete presentation', { error, requestId: req.requestId, id: req.params.id });
      res.status(500).json({
        success: false,
        error: {
          type: 'server_error',
          code: 'DELETE_PRESENTATION_FAILED',
          message: 'Failed to delete presentation',
        },
      });
    }
  }

  // =============================================================================
  // VERSION MANAGEMENT
  // =============================================================================

  /**
   * Get version history for presentation
   */
  async getVersionHistory(req: Request, res: Response): Promise<void> {
    try {
      const requestId = req.requestId || uuidv4();
      const { id } = req.params;

      const result = await this.presentationService.getVersionHistory(id);

      res.json({
        success: true,
        data: result,
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
        },
      });

    } catch (error) {
      logger.error('Failed to get version history', { error, requestId: req.requestId });
      res.status(500).json({
        success: false,
        error: {
          type: 'server_error',
          code: 'GET_VERSION_HISTORY_FAILED',
          message: 'Failed to retrieve version history',
        },
      });
    }
  }

  /**
   * Create new version of presentation
   */
  async createVersion(req: Request, res: Response): Promise<void> {
    try {
      const requestId = req.requestId || uuidv4();
      const { id } = req.params;

      if (!req.file) {
        res.status(400).json({
          success: false,
          error: {
            type: 'validation_error',
            code: 'FILE_REQUIRED',
            message: 'PPTX file upload is required for new version',
          },
        });
        return;
      }

      const result = await this.presentationService.createVersion(id, req.file, {
        versionNotes: req.body.versionNotes,
        generateThumbnails: req.body.generateThumbnails !== 'false',
      });

      res.status(201).json({
        success: true,
        data: result,
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
        },
      });

    } catch (error) {
      logger.error('Failed to create version', { error, requestId: req.requestId });
      res.status(500).json({
        success: false,
        error: {
          type: 'server_error',
          code: 'CREATE_VERSION_FAILED',
          message: 'Failed to create new version',
        },
      });
    }
  }

  /**
   * Restore presentation to specific version
   */
  async restoreVersion(req: Request, res: Response): Promise<void> {
    try {
      const requestId = req.requestId || uuidv4();
      const { id, version } = req.params;

      const result = await this.presentationService.restoreVersion(id, parseInt(version));

      res.json({
        success: true,
        data: result,
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
        },
      });

    } catch (error) {
      logger.error('Failed to restore version', { error, requestId: req.requestId });
      res.status(500).json({
        success: false,
        error: {
          type: 'server_error',
          code: 'RESTORE_VERSION_FAILED',
          message: 'Failed to restore version',
        },
      });
    }
  }

  // =============================================================================
  // ANALYTICS AND INSIGHTS
  // =============================================================================

  /**
   * Get detailed analytics for presentation
   */
  async getPresentationAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const requestId = req.requestId || uuidv4();
      const { id } = req.params;

      const result = await this.presentationService.getPresentationAnalytics(id);

      res.json({
        success: true,
        data: result,
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
        },
      });

    } catch (error) {
      logger.error('Failed to get presentation analytics', { error, requestId: req.requestId });
      res.status(500).json({
        success: false,
        error: {
          type: 'server_error',
          code: 'GET_ANALYTICS_FAILED',
          message: 'Failed to retrieve analytics',
        },
      });
    }
  }

  /**
   * Get aggregated analytics summary
   */
  async getAnalyticsSummary(req: Request, res: Response): Promise<void> {
    try {
      const requestId = req.requestId || uuidv4();

      const result = await this.presentationService.getAnalyticsSummary();

      res.json({
        success: true,
        data: result,
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
        },
      });

    } catch (error) {
      logger.error('Failed to get analytics summary', { error, requestId: req.requestId });
      res.status(500).json({
        success: false,
        error: {
          type: 'server_error',
          code: 'GET_ANALYTICS_SUMMARY_FAILED',
          message: 'Failed to retrieve analytics summary',
        },
      });
    }
  }

  // =============================================================================
  // SEARCH AND DISCOVERY
  // =============================================================================

  /**
   * Search presentations with full-text search
   */
  async searchPresentations(req: Request, res: Response): Promise<void> {
    try {
      const requestId = req.requestId || uuidv4();

      if (!req.query.q) {
        res.status(400).json({
          success: false,
          error: {
            type: 'validation_error',
            code: 'SEARCH_QUERY_REQUIRED',
            message: 'Search query parameter "q" is required',
          },
        });
        return;
      }

      const searchQuery: PresentationListQuery = {
        query: req.query.q as string,
        searchIn: req.query.searchIn ? (req.query.searchIn as string).split(',') as any : ['title', 'content', 'tags'],
        limit: Math.min(parseInt(req.query.limit as string) || 20, 100),
        page: parseInt(req.query.page as string) || 1,
      };

      const result = await this.presentationService.searchPresentations(searchQuery);

      res.json({
        success: true,
        data: result,
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
          searchQuery,
        },
      });

    } catch (error) {
      logger.error('Failed to search presentations', { error, requestId: req.requestId });
      res.status(500).json({
        success: false,
        error: {
          type: 'server_error',
          code: 'SEARCH_PRESENTATIONS_FAILED',
          message: 'Failed to search presentations',
        },
      });
    }
  }

  // =============================================================================
  // EXPORT AND SHARING
  // =============================================================================

  /**
   * Export presentation in various formats
   */
  async exportPresentation(req: Request, res: Response): Promise<void> {
    try {
      const requestId = req.requestId || uuidv4();
      const { id } = req.params;

      const exportOptions: PresentationExportRequest = {
        format: req.body.format || 'pdf',
        includeNotes: req.body.includeNotes || false,
        quality: req.body.quality || 'high',
        slideRange: req.body.slideRange,
      };

      const result = await this.presentationService.exportPresentation(id, exportOptions);

      res.json({
        success: true,
        data: result,
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
        },
      });

    } catch (error) {
      logger.error('Failed to export presentation', { error, requestId: req.requestId });
      res.status(500).json({
        success: false,
        error: {
          type: 'server_error',
          code: 'EXPORT_PRESENTATION_FAILED',
          message: 'Failed to export presentation',
        },
      });
    }
  }

  /**
   * Create secure sharing link
   */
  async createSharingLink(req: Request, res: Response): Promise<void> {
    try {
      const requestId = req.requestId || uuidv4();
      const { id } = req.params;

      const result = await this.presentationService.createSharingLink(id, {
        expiresIn: req.body.expiresIn || '7d',
        allowDownload: req.body.allowDownload || false,
        requirePassword: req.body.requirePassword || false,
      });

      res.json({
        success: true,
        data: result,
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
        },
      });

    } catch (error) {
      logger.error('Failed to create sharing link', { error, requestId: req.requestId });
      res.status(500).json({
        success: false,
        error: {
          type: 'server_error',
          code: 'CREATE_SHARING_LINK_FAILED',
          message: 'Failed to create sharing link',
        },
      });
    }
  }

  // =============================================================================
  // BULK OPERATIONS
  // =============================================================================

  /**
   * Bulk delete presentations
   */
  async bulkDeletePresentations(req: Request, res: Response): Promise<void> {
    try {
      const requestId = req.requestId || uuidv4();
      const { presentationIds } = req.body;

      if (!Array.isArray(presentationIds) || presentationIds.length === 0) {
        res.status(400).json({
          success: false,
          error: {
            type: 'validation_error',
            code: 'INVALID_PRESENTATION_IDS',
            message: 'presentationIds must be a non-empty array',
          },
        });
        return;
      }

      const result = await this.presentationService.bulkDeletePresentations(presentationIds);

      res.json({
        success: true,
        data: result,
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
        },
      });

    } catch (error) {
      logger.error('Failed to bulk delete presentations', { error, requestId: req.requestId });
      res.status(500).json({
        success: false,
        error: {
          type: 'server_error',
          code: 'BULK_DELETE_FAILED',
          message: 'Failed to delete presentations',
        },
      });
    }
  }

  /**
   * Bulk update presentation metadata
   */
  async bulkUpdatePresentations(req: Request, res: Response): Promise<void> {
    try {
      const requestId = req.requestId || uuidv4();
      const { presentationIds, updates } = req.body;

      if (!Array.isArray(presentationIds) || presentationIds.length === 0) {
        res.status(400).json({
          success: false,
          error: {
            type: 'validation_error',
            code: 'INVALID_PRESENTATION_IDS',
            message: 'presentationIds must be a non-empty array',
          },
        });
        return;
      }

      const result = await this.presentationService.bulkUpdatePresentations(presentationIds, updates);

      res.json({
        success: true,
        data: result,
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
        },
      });

    } catch (error) {
      logger.error('Failed to bulk update presentations', { error, requestId: req.requestId });
      res.status(500).json({
        success: false,
        error: {
          type: 'server_error',
          code: 'BULK_UPDATE_FAILED',
          message: 'Failed to update presentations',
        },
      });
    }
  }
} 