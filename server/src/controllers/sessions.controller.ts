import { z } from "zod";
/**
 * Sessions Controller
 * 
 * Handles HTTP requests for session management operations
 */

import { Request, Response } from 'express';
import { SessionService } from '../services/session.service';
import { FirebaseAdapter, FirebaseConfig } from '../adapters/firebase.adapter';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/error.middleware';
import { 
  SessionCreateRequest, 
  SessionUpdateRequest, 
  MessageCreateRequest,
  SessionListQuery,
  SessionArchiveOptions,
  SessionRestoreOptions,
  SessionCleanupOptions,
  SessionExportOptions
} from '../types/session.types';

export class SessionsController {
  private sessionService: SessionService;

  constructor() {
    // Create Firebase config from environment variables
    const firebaseConfig: FirebaseConfig = {
      projectId: process.env.FIREBASE_PROJECT_ID!,
      privateKey: process.env.FIREBASE_PRIVATE_KEY!,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET!,
    };

    const firebaseAdapter = new FirebaseAdapter(firebaseConfig);
    this.sessionService = new SessionService(firebaseAdapter);
  }

  /**
   * Create a new session
   * POST /api/v1/sessions
   */
  createSession = async (req: Request, res: Response): Promise<void> => {
    try {
      const request: SessionCreateRequest = {
        title: req.body.title || 'New Session',
        description: req.body.description,
        userId: req.body.userId || req.headers['user-id'] as string,
        initialMessage: req.body.initialMessage,
        settings: req.body.settings,
        tags: req.body.tags,
      };

      // Validate required fields
      if (!request.title || request.title.trim().length === 0) {
        throw new AppError('Title is required', 400);
      }

      const session = await this.sessionService.createSession(request);

      res.status(201).json({
        success: true,
        message: 'Session created successfully',
        data: session,
        metadata: {
          sessionId: session.id,
          createdAt: session.createdAt,
          messageCount: session.messages.length,
        },
      });
    } catch (error) {
      logger.error('Failed to create session', { error, body: req.body });
      throw error;
    }
  };

  /**
   * Get session by ID
   * GET /api/v1/sessions/:id
   */
  getSession = async (req: Request, res: Response): Promise<void> => {
    try {
      const sessionId = req.params.id;
      const userId = req.headers['user-id'] as string;

      if (!sessionId) {
        throw new AppError('Session ID is required', 400);
      }

      const session = await this.sessionService.getSession(sessionId, userId);

      if (!session) {
        throw new AppError('Session not found', 404);
      }

      res.json({
        success: true,
        data: session,
        metadata: {
          sessionId: session.id,
          messageCount: session.messages.length,
          presentationCount: session.presentations.length,
          lastActivity: session.metadata.lastActivity,
        },
      });
    } catch (error) {
      logger.error('Failed to get session', { error, sessionId: req.params.id });
      throw error;
    }
  };

  /**
   * Update session
   * PUT /api/v1/sessions/:id
   */
  updateSession = async (req: Request, res: Response): Promise<void> => {
    try {
      const sessionId = req.params.id;
      const userId = req.headers['user-id'] as string;

      if (!sessionId) {
        throw new AppError('Session ID is required', 400);
      }

      const updates: SessionUpdateRequest = {
        title: req.body.title,
        description: req.body.description,
        settings: req.body.settings,
        tags: req.body.tags,
        bookmarked: req.body.bookmarked,
        archived: req.body.archived,
      };

      const session = await this.sessionService.updateSession(sessionId, updates, userId);

      if (!session) {
        throw new AppError('Session not found', 404);
      }

      res.json({
        success: true,
        message: 'Session updated successfully',
        data: session,
        metadata: {
          sessionId: session.id,
          updatedAt: session.updatedAt,
        },
      });
    } catch (error) {
      logger.error('Failed to update session', { error, sessionId: req.params.id, body: req.body });
      throw error;
    }
  };

  /**
   * Delete session
   * DELETE /api/v1/sessions/:id
   */
  deleteSession = async (req: Request, res: Response): Promise<void> => {
    try {
      const sessionId = req.params.id;
      const userId = req.headers['user-id'] as string;

      if (!sessionId) {
        throw new AppError('Session ID is required', 400);
      }

      const deleted = await this.sessionService.deleteSession(sessionId, userId);

      if (!deleted) {
        throw new AppError('Session not found', 404);
      }

      res.json({
        success: true,
        message: 'Session deleted successfully',
        metadata: {
          sessionId: sessionId,
          deletedAt: new Date(),
        },
      });
    } catch (error) {
      logger.error('Failed to delete session', { error, sessionId: req.params.id });
      throw error;
    }
  };

  /**
   * List sessions with filtering and pagination
   * GET /api/v1/sessions
   */
  listSessions = async (req: Request, res: Response): Promise<void> => {
    try {
      const query: SessionListQuery = {
        userId: req.query.userId as string || req.headers['user-id'] as string,
        status: req.query.status as any,
        archived: req.query.archived === 'true',
        bookmarked: req.query.bookmarked === 'true',
        tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
        search: req.query.search as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
        offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
        sortBy: req.query.sortBy as any || 'updatedAt',
        sortOrder: req.query.sortOrder as any || 'desc',
        dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
        dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
      };

      const result = await this.sessionService.listSessions(query);

      res.json({
        success: true,
        data: result.sessions,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          hasMore: result.hasMore,
          totalPages: Math.ceil(result.total / result.limit),
        },
        metadata: {
          queryTime: new Date(),
          filters: query,
        },
      });
    } catch (error) {
      logger.error('Failed to list sessions', { error, query: req.query });
      throw error;
    }
  };

  /**
   * Add message to session
   * POST /api/v1/sessions/:id/messages
   */
  addMessage = async (req: Request, res: Response): Promise<void> => {
    try {
      const sessionId = req.params.id;

      if (!sessionId) {
        throw new AppError('Session ID is required', 400);
      }

      const request: MessageCreateRequest = {
        sessionId: sessionId,
        content: req.body.content,
        role: req.body.role || 'user',
        metadata: req.body.metadata,
      };

      // Validate required fields
      if (!request.content || request.content.trim().length === 0) {
        throw new AppError('Message content is required', 400);
      }

      const message = await this.sessionService.addMessage(request);

      res.status(201).json({
        success: true,
        message: 'Message added successfully',
        data: message,
        metadata: {
          messageId: message.id,
          sessionId: sessionId,
          timestamp: message.timestamp,
        },
      });
    } catch (error) {
      logger.error('Failed to add message', { error, sessionId: req.params.id, body: req.body });
      throw error;
    }
  };

  /**
   * Get session messages
   * GET /api/v1/sessions/:id/messages
   */
  getMessages = async (req: Request, res: Response): Promise<void> => {
    try {
      const sessionId = req.params.id;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : undefined;

      if (!sessionId) {
        throw new AppError('Session ID is required', 400);
      }

      const messages = await this.sessionService.getMessages(sessionId, limit, offset);

      res.json({
        success: true,
        data: messages,
        metadata: {
          sessionId: sessionId,
          messageCount: messages.length,
          pagination: {
            limit: limit || null,
            offset: offset || 0,
          },
        },
      });
    } catch (error) {
      logger.error('Failed to get messages', { error, sessionId: req.params.id });
      throw error;
    }
  };

  /**
   * Add presentation reference to session
   * POST /api/v1/sessions/:id/presentations
   */
  addPresentationReference = async (req: Request, res: Response): Promise<void> => {
    try {
      const sessionId = req.params.id;

      if (!sessionId) {
        throw new AppError('Session ID is required', 400);
      }

      const presentation = {
        id: req.body.id,
        title: req.body.title,
        fileName: req.body.fileName,
        fileSize: req.body.fileSize,
        slideCount: req.body.slideCount,
        thumbnailUrl: req.body.thumbnailUrl,
        universalSchemaId: req.body.universalSchemaId,
      };

      // Validate required fields
      if (!presentation.id || !presentation.title || !presentation.fileName) {
        throw new AppError('Presentation ID, title, and fileName are required', 400);
      }

      const added = await this.sessionService.addPresentationReference(sessionId, presentation);

      if (!added) {
        throw new AppError('Session not found', 404);
      }

      res.json({
        success: true,
        message: 'Presentation reference added successfully',
        metadata: {
          sessionId: sessionId,
          presentationId: presentation.id,
          addedAt: new Date(),
        },
      });
    } catch (error) {
      logger.error('Failed to add presentation reference', { error, sessionId: req.params.id, body: req.body });
      throw error;
    }
  };

  /**
   * Archive session
   * POST /api/v1/sessions/:id/archive
   */
  archiveSession = async (req: Request, res: Response): Promise<void> => {
    try {
      const sessionId = req.params.id;

      if (!sessionId) {
        throw new AppError('Session ID is required', 400);
      }

      const options: SessionArchiveOptions = {
        reason: req.body.reason,
        preserveMessages: req.body.preserveMessages !== false,
        preservePresentations: req.body.preservePresentations !== false,
        notifyUser: req.body.notifyUser === true,
      };

      const archived = await this.sessionService.archiveSession(sessionId, options);

      if (!archived) {
        throw new AppError('Session not found', 404);
      }

      res.json({
        success: true,
        message: 'Session archived successfully',
        metadata: {
          sessionId: sessionId,
          archivedAt: new Date(),
          options: options,
        },
      });
    } catch (error) {
      logger.error('Failed to archive session', { error, sessionId: req.params.id, body: req.body });
      throw error;
    }
  };

  /**
   * Restore session from archive
   * POST /api/v1/sessions/:id/restore
   */
  restoreSession = async (req: Request, res: Response): Promise<void> => {
    try {
      const sessionId = req.params.id;

      if (!sessionId) {
        throw new AppError('Session ID is required', 400);
      }

      const options: SessionRestoreOptions = {
        reason: req.body.reason,
        restoreMessages: req.body.restoreMessages !== false,
        restorePresentations: req.body.restorePresentations !== false,
        notifyUser: req.body.notifyUser === true,
      };

      const restored = await this.sessionService.restoreSession(sessionId, options);

      if (!restored) {
        throw new AppError('Session not found', 404);
      }

      res.json({
        success: true,
        message: 'Session restored successfully',
        metadata: {
          sessionId: sessionId,
          restoredAt: new Date(),
          options: options,
        },
      });
    } catch (error) {
      logger.error('Failed to restore session', { error, sessionId: req.params.id, body: req.body });
      throw error;
    }
  };

  /**
   * Get session statistics
   * GET /api/v1/sessions/stats
   */
  getSessionStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.query.userId as string || req.headers['user-id'] as string;

      const stats = await this.sessionService.getSessionStats(userId);

      res.json({
        success: true,
        data: stats,
        metadata: {
          userId: userId,
          generatedAt: new Date(),
        },
      });
    } catch (error) {
      logger.error('Failed to get session stats', { error, userId: req.query.userId as string });
      throw error;
    }
  };

  /**
   * Search sessions
   * GET /api/v1/sessions/search
   */
  searchSessions = async (req: Request, res: Response): Promise<void> => {
    try {
      const query = req.query.q as string;
      const userId = req.query.userId as string || req.headers['user-id'] as string;

      if (!query || query.trim().length === 0) {
        throw new AppError('Search query is required', 400);
      }

      const results = await this.sessionService.searchSessions(query, userId);

      res.json({
        success: true,
        data: results,
        metadata: {
          query: query,
          resultCount: results.length,
          searchTime: new Date(),
        },
      });
    } catch (error) {
      logger.error('Failed to search sessions', { error, query: req.query });
      throw error;
    }
  };

  /**
   * Export session
   * GET /api/v1/sessions/:id/export
   */
  exportSession = async (req: Request, res: Response): Promise<void> => {
    try {
      const sessionId = req.params.id;

      if (!sessionId) {
        throw new AppError('Session ID is required', 400);
      }

      const options: SessionExportOptions = {
        format: req.query.format as any || 'json',
        includeMetadata: req.query.includeMetadata !== 'false',
        includeMessages: req.query.includeMessages !== 'false',
        includePresentations: req.query.includePresentations !== 'false',
        dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
        dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
      };

      const result = await this.sessionService.exportSession(sessionId, options);

      if (!result.success) {
        throw new AppError(result.error || 'Export failed', 500);
      }

      res.setHeader('Content-Type', result.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.setHeader('Content-Length', result.size);

      res.end(result.data);
    } catch (error) {
      logger.error('Failed to export session', { error, sessionId: req.params.id });
      throw error;
    }
  };

  /**
   * Clean up old sessions
   * POST /api/v1/sessions/cleanup
   */
  cleanupSessions = async (req: Request, res: Response): Promise<void> => {
    try {
      const options: SessionCleanupOptions = {
        olderThan: req.body.olderThan ? new Date(req.body.olderThan) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days
        status: req.body.status,
        preserveBookmarked: req.body.preserveBookmarked !== false,
        preserveWithPresentations: req.body.preserveWithPresentations !== false,
        dryRun: req.body.dryRun === true,
      };

      const result = await this.sessionService.cleanupSessions(options);

      res.json({
        success: true,
        message: 'Session cleanup completed',
        data: result,
        metadata: {
          executedAt: new Date(),
          options: options,
        },
      });
    } catch (error) {
      logger.error('Failed to cleanup sessions', { error, body: req.body });
      throw error;
    }
  };
}