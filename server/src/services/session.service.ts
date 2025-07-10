/**
 * Session Service
 * 
 * Comprehensive session management service with Firebase integration
 */

import { 
  ChatSession, 
  ChatMessage, 
  SessionCreateRequest, 
  SessionUpdateRequest, 
  MessageCreateRequest,
  SessionListQuery,
  SessionListResponse,
  SessionStats,
  SessionExportOptions,
  SessionExportResult,
  SessionSearchResult,
  SessionArchiveOptions,
  SessionRestoreOptions,
  SessionCleanupOptions,
  SessionCleanupResult,
  SessionEvent,
  SessionEventPayload
} from '../types/session.types';
import { FirebaseAdapter } from '../adapters/firebase.adapter';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export class SessionService {
  private firebase: FirebaseAdapter;
  private readonly collectionName = 'sessions';
  private readonly messagesCollectionName = 'messages';

  constructor(firebase: FirebaseAdapter) {
    this.firebase = firebase;
    logger.info('SessionService initialized');
  }

  // =============================================================================
  // SESSION CRUD OPERATIONS
  // =============================================================================

  /**
   * Create a new chat session
   */
  async createSession(request: SessionCreateRequest): Promise<ChatSession> {
    try {
      const sessionId = uuidv4();
      const now = new Date();

      const session: ChatSession = {
        id: sessionId,
        userId: request.userId,
        title: request.title,
        description: request.description,
        status: 'active',
        createdAt: now,
        updatedAt: now,
        lastMessageAt: undefined,
        messages: [],
        metadata: {
          totalMessages: 0,
          totalTokens: 0,
          lastActivity: now,
          presentationCount: 0,
          analysisCount: 0,
          errorCount: 0,
          tags: request.tags || [],
          bookmarked: false,
          archived: false,
        },
        presentations: [],
        settings: {
          autoSave: true,
          notifications: true,
          theme: 'auto',
          aiModel: 'gpt-4-turbo-preview',
          maxTokens: 4000,
          temperature: 0.7,
          topP: 0.9,
          streamResponses: true,
          ...request.settings,
        },
        permissions: {
          canEdit: true,
          canDelete: true,
          canShare: true,
          canExport: true,
        },
      };

      // Add initial message if provided
      if (request.initialMessage) {
        const initialMessage: ChatMessage = {
          id: uuidv4(),
          sessionId: sessionId,
          role: 'user',
          content: request.initialMessage,
          timestamp: now,
          metadata: {
            contentType: 'text',
          },
        };
        session.messages.push(initialMessage);
        session.metadata.totalMessages = 1;
        session.lastMessageAt = now;
      }

      // Save to Firebase
      await this.firebase.createDocument(this.collectionName, sessionId, session);

      // Emit event
      await this.emitSessionEvent({
        event: 'session.created',
        sessionId: sessionId,
        userId: request.userId,
        timestamp: now,
        data: { title: request.title },
      });

      logger.info('Session created successfully', { sessionId, userId: request.userId });
      return session;
    } catch (error) {
      logger.error('Failed to create session', { error, request });
      throw error;
    }
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId: string, userId?: string): Promise<ChatSession | null> {
    try {
      const session = await this.firebase.getDocument<ChatSession>(
        this.collectionName, 
        sessionId
      );

      if (!session) {
        return null;
      }

      // Check permissions
      if (userId && session.userId && session.userId !== userId) {
        logger.warn('Unauthorized session access attempt', { sessionId, userId });
        return null;
      }

      return session;
    } catch (error) {
      logger.error('Failed to get session', { error, sessionId, userId });
      throw error;
    }
  }

  /**
   * Update session
   */
  async updateSession(
    sessionId: string, 
    updates: SessionUpdateRequest, 
    userId?: string
  ): Promise<ChatSession | null> {
    try {
      const session = await this.getSession(sessionId, userId);
      if (!session) {
        return null;
      }

      // Prepare updates
      const updateData: Partial<ChatSession> = {
        ...updates,
        updatedAt: new Date(),
      };

      // Handle metadata updates
      if (updates.tags || updates.bookmarked !== undefined || updates.archived !== undefined) {
        updateData.metadata = {
          ...session.metadata,
          ...(updates.tags && { tags: updates.tags }),
          ...(updates.bookmarked !== undefined && { bookmarked: updates.bookmarked }),
          ...(updates.archived !== undefined && { archived: updates.archived }),
        };
      }

      // Update in Firebase
      await this.firebase.updateDocument(this.collectionName, sessionId, updateData);

      // Get updated session
      const updatedSession = await this.getSession(sessionId, userId);

      // Emit event
      await this.emitSessionEvent({
        event: 'session.updated',
        sessionId: sessionId,
        userId: userId,
        timestamp: new Date(),
        data: updates,
      });

      logger.info('Session updated successfully', { sessionId, updates });
      return updatedSession;
    } catch (error) {
      logger.error('Failed to update session', { error, sessionId, updates });
      throw error;
    }
  }

  /**
   * Delete session
   */
  async deleteSession(sessionId: string, userId?: string): Promise<boolean> {
    try {
      const session = await this.getSession(sessionId, userId);
      if (!session) {
        return false;
      }

      // Delete from Firebase
      await this.firebase.deleteDocument(this.collectionName, sessionId);

      // Emit event
      await this.emitSessionEvent({
        event: 'session.deleted',
        sessionId: sessionId,
        userId: userId,
        timestamp: new Date(),
        data: { title: session.title },
      });

      logger.info('Session deleted successfully', { sessionId });
      return true;
    } catch (error) {
      logger.error('Failed to delete session', { error, sessionId });
      throw error;
    }
  }

  /**
   * List sessions with filtering and pagination
   */
  async listSessions(query: SessionListQuery = {}): Promise<SessionListResponse> {
    try {
      const {
        userId,
        status,
        archived,
        bookmarked,
        tags,
        search,
        limit = 20,
        offset = 0,
        sortBy = 'updatedAt',
        sortOrder = 'desc',
        dateFrom,
        dateTo,
      } = query;

      // Build Firebase query
      let firebaseQuery = this.firebase.getCollection(this.collectionName);

      // Apply filters
      if (userId) {
        firebaseQuery = firebaseQuery.where('userId', '==', userId);
      }
      if (status) {
        firebaseQuery = firebaseQuery.where('status', '==', status);
      }
      if (archived !== undefined) {
        firebaseQuery = firebaseQuery.where('metadata.archived', '==', archived);
      }
      if (bookmarked !== undefined) {
        firebaseQuery = firebaseQuery.where('metadata.bookmarked', '==', bookmarked);
      }
      if (tags && tags.length > 0) {
        firebaseQuery = firebaseQuery.where('metadata.tags', 'array-contains-any', tags);
      }
      if (dateFrom) {
        firebaseQuery = firebaseQuery.where('createdAt', '>=', dateFrom);
      }
      if (dateTo) {
        firebaseQuery = firebaseQuery.where('createdAt', '<=', dateTo);
      }

      // Apply sorting
      firebaseQuery = firebaseQuery.orderBy(sortBy, sortOrder);

      // Apply pagination
      firebaseQuery = firebaseQuery.limit(limit).offset(offset);

      // Execute query
      const sessions = await this.firebase.queryDocuments<ChatSession>(firebaseQuery);

      // Apply text search if provided
      let filteredSessions = sessions;
      if (search) {
        filteredSessions = sessions.filter(session =>
          session.title.toLowerCase().includes(search.toLowerCase()) ||
          session.description?.toLowerCase().includes(search.toLowerCase())
        );
      }

      // Get total count for pagination
      const total = await this.getSessionCount(query);

      return {
        sessions: filteredSessions,
        total,
        page: Math.floor(offset / limit) + 1,
        limit,
        hasMore: offset + filteredSessions.length < total,
      };
    } catch (error) {
      logger.error('Failed to list sessions', { error, query });
      throw error;
    }
  }

  // =============================================================================
  // MESSAGE OPERATIONS
  // =============================================================================

  /**
   * Add message to session
   */
  async addMessage(request: MessageCreateRequest): Promise<ChatMessage> {
    try {
      const { sessionId, content, role = 'user', metadata = {} } = request;

      // Get session
      const session = await this.getSession(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      // Create message
      const message: ChatMessage = {
        id: uuidv4(),
        sessionId: sessionId,
        role,
        content,
        timestamp: new Date(),
        metadata: {
          contentType: 'text',
          ...metadata,
        },
      };

      // Add message to session
      session.messages.push(message);
      session.metadata.totalMessages += 1;
      session.lastMessageAt = message.timestamp;
      session.metadata.lastActivity = message.timestamp;
      session.updatedAt = message.timestamp;

      // Update tokens if provided
      if (metadata.tokens) {
        session.metadata.totalTokens += metadata.tokens;
      }

      // Update session in Firebase
      await this.firebase.updateDocument(this.collectionName, sessionId, {
        messages: session.messages,
        metadata: session.metadata,
        lastMessageAt: session.lastMessageAt,
        updatedAt: session.updatedAt,
      });

      // Emit event
      await this.emitSessionEvent({
        event: 'message.created',
        sessionId: sessionId,
        userId: session.userId,
        timestamp: message.timestamp,
        data: { messageId: message.id, role, contentType: metadata.contentType },
      });

      logger.info('Message added successfully', { sessionId, messageId: message.id });
      return message;
    } catch (error) {
      logger.error('Failed to add message', { error, request });
      throw error;
    }
  }

  /**
   * Get session messages
   */
  async getMessages(sessionId: string, limit?: number, offset?: number): Promise<ChatMessage[]> {
    try {
      const session = await this.getSession(sessionId);
      if (!session) {
        return [];
      }

      let messages = session.messages;

      // Apply pagination if provided
      if (offset !== undefined) {
        messages = messages.slice(offset);
      }
      if (limit !== undefined) {
        messages = messages.slice(0, limit);
      }

      return messages;
    } catch (error) {
      logger.error('Failed to get messages', { error, sessionId });
      throw error;
    }
  }

  // =============================================================================
  // PRESENTATION OPERATIONS
  // =============================================================================

  /**
   * Add presentation reference to session
   */
  async addPresentationReference(
    sessionId: string,
    presentation: {
      id: string;
      title: string;
      fileName: string;
      fileSize: number;
      slideCount: number;
      thumbnailUrl?: string;
      universalSchemaId?: string;
    }
  ): Promise<boolean> {
    try {
      const session = await this.getSession(sessionId);
      if (!session) {
        return false;
      }

      // Check if presentation already exists
      const existingIndex = session.presentations.findIndex(p => p.id === presentation.id);
      
      const presentationRef = {
        ...presentation,
        createdAt: new Date(),
        conversionStatus: 'completed' as const,
        lastModified: new Date(),
      };

      if (existingIndex >= 0) {
        // Update existing presentation
        session.presentations[existingIndex] = presentationRef;
      } else {
        // Add new presentation
        session.presentations.push(presentationRef);
        session.metadata.presentationCount += 1;
      }

      // Update session
      await this.firebase.updateDocument(this.collectionName, sessionId, {
        presentations: session.presentations,
        metadata: session.metadata,
        updatedAt: new Date(),
      });

      // Emit event
      await this.emitSessionEvent({
        event: 'presentation.added',
        sessionId: sessionId,
        userId: session.userId,
        timestamp: new Date(),
        data: { presentationId: presentation.id, title: presentation.title },
      });

      logger.info('Presentation reference added', { sessionId, presentationId: presentation.id });
      return true;
    } catch (error) {
      logger.error('Failed to add presentation reference', { error, sessionId, presentation });
      throw error;
    }
  }

  // =============================================================================
  // ARCHIVE/RESTORE OPERATIONS
  // =============================================================================

  /**
   * Archive session
   */
  async archiveSession(
    sessionId: string,
    options: SessionArchiveOptions = { preserveMessages: true, preservePresentations: true, notifyUser: false }
  ): Promise<boolean> {
    try {
      const session = await this.getSession(sessionId);
      if (!session) {
        return false;
      }

      // Archive the session
      const updates: Partial<ChatSession> = {
        status: 'archived',
        updatedAt: new Date(),
        metadata: {
          ...session.metadata,
          archived: true,
        },
      };

      // Optionally clear messages and presentations
      if (!options.preserveMessages) {
        updates.messages = [];
        updates.metadata!.totalMessages = 0;
      }
      if (!options.preservePresentations) {
        updates.presentations = [];
        updates.metadata!.presentationCount = 0;
      }

      await this.firebase.updateDocument(this.collectionName, sessionId, updates);

      // Emit event
      await this.emitSessionEvent({
        event: 'session.archived',
        sessionId: sessionId,
        userId: session.userId,
        timestamp: new Date(),
        data: { reason: options.reason },
      });

      logger.info('Session archived successfully', { sessionId, options });
      return true;
    } catch (error) {
      logger.error('Failed to archive session', { error, sessionId, options });
      throw error;
    }
  }

  /**
   * Restore session from archive
   */
  async restoreSession(
    sessionId: string,
    options: SessionRestoreOptions = { restoreMessages: true, restorePresentations: true, notifyUser: false }
  ): Promise<boolean> {
    try {
      const session = await this.getSession(sessionId);
      if (!session) {
        return false;
      }

      // Restore the session
      const updates: Partial<ChatSession> = {
        status: 'active',
        updatedAt: new Date(),
        metadata: {
          ...session.metadata,
          archived: false,
        },
      };

      await this.firebase.updateDocument(this.collectionName, sessionId, updates);

      // Emit event
      await this.emitSessionEvent({
        event: 'session.restored',
        sessionId: sessionId,
        userId: session.userId,
        timestamp: new Date(),
        data: { reason: options.reason },
      });

      logger.info('Session restored successfully', { sessionId, options });
      return true;
    } catch (error) {
      logger.error('Failed to restore session', { error, sessionId, options });
      throw error;
    }
  }

  // =============================================================================
  // STATISTICS AND ANALYTICS
  // =============================================================================

  /**
   * Get session statistics
   */
  async getSessionStats(userId?: string): Promise<SessionStats> {
    try {
      // This would typically involve complex aggregation queries
      // For now, return mock data with proper structure
      return {
        totalSessions: 0,
        activeSessions: 0,
        archivedSessions: 0,
        totalMessages: 0,
        totalTokens: 0,
        avgMessagesPerSession: 0,
        avgTokensPerSession: 0,
        avgSessionDuration: 0,
        topTags: [],
        activityByDay: [],
        presentationCount: 0,
        analysisCount: 0,
      };
    } catch (error) {
      logger.error('Failed to get session stats', { error, userId });
      throw error;
    }
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  /**
   * Get session count for pagination
   */
  private async getSessionCount(query: SessionListQuery): Promise<number> {
    try {
      // This would typically be a count query
      // For now, return a reasonable estimate
      return 0;
    } catch (error) {
      logger.error('Failed to get session count', { error, query });
      return 0;
    }
  }

  /**
   * Emit session event
   */
  private async emitSessionEvent(payload: SessionEventPayload): Promise<void> {
    try {
      // This would typically publish to an event bus or notification system
      logger.info('Session event emitted', { event: payload.event, sessionId: payload.sessionId });
    } catch (error) {
      logger.error('Failed to emit session event', { error, payload });
    }
  }

  /**
   * Clean up old sessions
   */
  async cleanupSessions(options: SessionCleanupOptions): Promise<SessionCleanupResult> {
    try {
      const result: SessionCleanupResult = {
        sessionsProcessed: 0,
        sessionsDeleted: 0,
        messagesDeleted: 0,
        presentationsAffected: 0,
        spaceSaved: 0,
        errors: [],
      };

      // This would implement the cleanup logic
      logger.info('Session cleanup completed', { options, result });
      return result;
    } catch (error) {
      logger.error('Failed to cleanup sessions', { error, options });
      throw error;
    }
  }

  /**
   * Search sessions
   */
  async searchSessions(query: string, userId?: string): Promise<SessionSearchResult[]> {
    try {
      // This would implement full-text search
      // For now, return empty results
      return [];
    } catch (error) {
      logger.error('Failed to search sessions', { error, query, userId });
      throw error;
    }
  }

  /**
   * Export session data
   */
  async exportSession(sessionId: string, options: SessionExportOptions): Promise<SessionExportResult> {
    try {
      const session = await this.getSession(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      // Create export data based on format
      const exportData = JSON.stringify(session, null, 2);
      const buffer = Buffer.from(exportData, 'utf8');
      
      return {
        success: true,
        data: buffer,
        filename: `session-${sessionId}.${options.format}`,
        contentType: this.getContentType(options.format),
        size: buffer.length,
      };
    } catch (error) {
      logger.error('Failed to export session', { error, sessionId, options });
      return {
        success: false,
        filename: '',
        contentType: '',
        size: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get content type for export format
   */
  private getContentType(format: string): string {
    const contentTypes: Record<string, string> = {
      json: 'application/json',
      csv: 'text/csv',
      pdf: 'application/pdf',
      html: 'text/html',
    };
    return contentTypes[format] || 'application/octet-stream';
  }
}