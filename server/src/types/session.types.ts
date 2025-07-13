import { z } from "zod";
/**
 * Session Management Types
 * 
 * Comprehensive type definitions for chat sessions, conversations, and related entities
 */

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    tokens?: number;
    model?: string;
    processingTime?: number;
    contentType?: 'text' | 'presentation' | 'analysis' | 'error';
    attachments?: string[];
  };
}

export interface SessionMetadata {
  totalMessages: number;
  totalTokens: number;
  totalCost?: number;
  lastActivity: Date;
  avgResponseTime?: number;
  presentationCount: number;
  analysisCount: number;
  errorCount: number;
  sessionDuration?: number;
  userRating?: number;
  tags?: string[];
  bookmarked?: boolean;
  archived?: boolean;
}

export interface PresentationReference {
  id: string;
  title: string;
  fileName: string;
  fileSize: number;
  slideCount: number;
  createdAt: Date;
  thumbnailUrl?: string;
  universalSchemaId?: string;
  conversionStatus: 'pending' | 'processing' | 'completed' | 'failed';
  lastModified: Date;
}

export interface ChatSession {
  id: string;
  userId?: string;
  title: string;
  description?: string;
  status: 'active' | 'archived' | 'deleted';
  createdAt: Date;
  updatedAt: Date;
  lastMessageAt?: Date;
  messages: ChatMessage[];
  metadata: SessionMetadata;
  presentations: PresentationReference[];
  settings: {
    autoSave: boolean;
    notifications: boolean;
    theme: 'light' | 'dark' | 'auto';
    aiModel: string;
    maxTokens: number;
    temperature: number;
    topP: number;
    streamResponses: boolean;
  };
  permissions: {
    canEdit: boolean;
    canDelete: boolean;
    canShare: boolean;
    canExport: boolean;
  };
}

export interface SessionCreateRequest {
  title: string;
  description?: string;
  userId?: string;
  initialMessage?: string;
  settings?: Partial<ChatSession['settings']>;
  tags?: string[];
}

export interface SessionUpdateRequest {
  title?: string;
  description?: string;
  settings?: Partial<ChatSession['settings']>;
  tags?: string[];
  bookmarked?: boolean;
  archived?: boolean;
}

export interface MessageCreateRequest {
  sessionId: string;
  content: string;
  role?: 'user' | 'system';
  metadata?: ChatSessionMetadata;
}

export interface SessionListQuery {
  userId?: string;
  status?: ChatSession['status'];
  archived?: boolean;
  bookmarked?: boolean;
  tags?: string[];
  search?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'lastMessageAt' | 'title';
  sortOrder?: 'asc' | 'desc';
  dateFrom?: Date;
  dateTo?: Date;
}

export interface SessionListResponse {
  sessions: ChatSession[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface SessionStats {
  totalSessions: number;
  activeSessions: number;
  archivedSessions: number;
  totalMessages: number;
  totalTokens: number;
  avgMessagesPerSession: number;
  avgTokensPerSession: number;
  avgSessionDuration: number;
  topTags: Array<{ tag: string; count: number }>;
  activityByDay: Array<{ date: string; count: number }>;
  presentationCount: number;
  analysisCount: number;
}

export interface SessionExportOptions {
  format: 'json' | 'csv' | 'pdf' | 'html';
  includeMetadata: boolean;
  includeMessages: boolean;
  includePresentations: boolean;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface SessionExportResult {
  success: boolean;
  data?: Buffer;
  filename: string;
  contentType: string;
  size: number;
  error?: string;
}

export interface SessionSearchResult {
  sessionId: string;
  title: string;
  description?: string;
  matches: Array<{
    messageId: string;
    content: string;
    highlight: string;
    timestamp: Date;
  }>;
  score: number;
}

export interface SessionArchiveOptions {
  reason?: string;
  preserveMessages: boolean;
  preservePresentations: boolean;
  notifyUser: boolean;
}

export interface SessionRestoreOptions {
  reason?: string;
  restoreMessages: boolean;
  restorePresentations: boolean;
  notifyUser: boolean;
}

export interface SessionCleanupOptions {
  olderThan: Date;
  status?: ChatSession['status'];
  preserveBookmarked: boolean;
  preserveWithPresentations: boolean;
  dryRun: boolean;
}

export interface SessionCleanupResult {
  sessionsProcessed: number;
  sessionsDeleted: number;
  messagesDeleted: number;
  presentationsAffected: number;
  spaceSaved: number;
  errors: string[];
}

export type SessionEvent = 
  | 'session.created'
  | 'session.updated'
  | 'session.archived'
  | 'session.restored'
  | 'session.deleted'
  | 'message.created'
  | 'message.updated'
  | 'message.deleted'
  | 'presentation.added'
  | 'presentation.removed';

export interface SessionEventPayload {
  event: SessionEvent;
  sessionId: string;
  userId?: string;
  timestamp: Date;
  data: Record<string, any>;
  metadata?: {
    userAgent?: string;
    ipAddress?: string;
    source?: string;
  };
}

export interface ChatSessionMetadata {
  contentType?: 'text' | 'presentation' | 'analysis';
  attachments?: string[];
  context?: Record<string, any>;
  tokens?: number; // For backward compatibility
  totalTokens?: number; // For backward compatibility
}