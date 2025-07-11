/**
 * Batch Operations Types
 * 
 * Type definitions for bulk operations on presentations, sessions, and other entities
 */

export interface BatchOperation<T = any> {
  id: string;
  type: 'create' | 'update' | 'delete' | 'archive' | 'restore' | 'process';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  userId?: string;
  metadata: {
    totalItems: number;
    processedItems: number;
    successfulItems: number;
    failedItems: number;
    estimatedTimeRemaining?: number;
    processingSpeed?: number; // items per second
    errorRate?: number; // percentage
  };
  configuration: T;
  results: BatchOperationResult[];
  errors: string[];
}

export interface BatchOperationResult {
  itemId: string;
  status: 'success' | 'failed' | 'skipped';
  error?: string;
  processingTime: number;
  data?: any;
}

// =============================================================================
// PRESENTATION BATCH OPERATIONS
// =============================================================================

export interface BatchPresentationDeleteRequest {
  presentationIds: string[];
  deleteType: 'soft' | 'hard';
  deleteAttachments: boolean;
  deleteThumbnails: boolean;
  reason?: string;
  notifyUsers: boolean;
}

export interface BatchPresentationUpdateRequest {
  updates: Array<{
    presentationId: string;
    title?: string;
    description?: string;
    tags?: string[];
    metadata?: Record<string, any>;
    settings?: Record<string, any>;
  }>;
  validateChanges: boolean;
  preserveHistory: boolean;
  notifyUsers: boolean;
}

export interface BatchPresentationProcessRequest {
  presentationIds: string[];
  operations: Array<{
    type: 'convert' | 'thumbnail' | 'analyze' | 'export' | 'optimize';
    parameters?: Record<string, any>;
  }>;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  maxConcurrency: number;
  retryOnFailure: boolean;
  maxRetries: number;
}

export interface BatchPresentationConvertRequest {
  presentations: Array<{
    id: string;
    inputFormat: string;
    outputFormats: string[];
    quality?: 'low' | 'medium' | 'high' | 'ultra';
    compression?: 'none' | 'fast' | 'maximum';
    customSettings?: Record<string, any>;
  }>;
  generateThumbnails: boolean;
  preserveMetadata: boolean;
  outputDirectory?: string;
}

// =============================================================================
// SESSION BATCH OPERATIONS
// =============================================================================

export interface BatchSessionArchiveRequest {
  sessionIds: string[];
  archiveReason?: string;
  preserveMessages: boolean;
  preservePresentations: boolean;
  notifyUsers: boolean;
  retentionPeriod?: number; // days
}

export interface BatchSessionDeleteRequest {
  sessionIds: string[];
  deleteType: 'soft' | 'hard';
  deleteMessages: boolean;
  deletePresentations: boolean;
  reason?: string;
  notifyUsers: boolean;
}

export interface BatchSessionExportRequest {
  sessionIds: string[];
  exportFormat: 'json' | 'csv' | 'pdf' | 'html';
  includeMetadata: boolean;
  includeMessages: boolean;
  includePresentations: boolean;
  dateRange?: {
    from: Date;
    to: Date;
  };
  compressionLevel?: 'none' | 'fast' | 'maximum';
}

export interface BatchSessionUpdateRequest {
  updates: Array<{
    sessionId: string;
    title?: string;
    description?: string;
    tags?: string[];
    settings?: Record<string, any>;
    archived?: boolean;
    bookmarked?: boolean;
  }>;
  validateChanges: boolean;
  preserveHistory: boolean;
  notifyUsers: boolean;
}

// =============================================================================
// THUMBNAIL BATCH OPERATIONS
// =============================================================================

export interface BatchThumbnailGenerateRequest {
  presentations: Array<{
    id: string;
    slideIndices?: number[]; // If not provided, generate for all slides
    strategy: 'real' | 'placeholder' | 'auto';
  }>;
  thumbnailOptions: {
    width: number;
    height: number;
    format: 'png' | 'jpg' | 'webp';
    quality: 'low' | 'medium' | 'high' | 'ultra';
    backgroundColor?: string;
  };
  overwriteExisting: boolean;
  storage: {
    provider: 'firebase' | 'local' | 's3' | 'azure';
    bucketName?: string;
    pathPrefix?: string;
    publicAccess: boolean;
  };
  optimization: {
    compress: boolean;
    compressionLevel: number;
    stripMetadata: boolean;
    progressive: boolean;
  };
}

export interface BatchThumbnailDeleteRequest {
  presentationIds: string[];
  slideIndices?: number[]; // If not provided, delete all thumbnails
  deleteFromStorage: boolean;
  cleanupMetadata: boolean;
}

export interface BatchThumbnailOptimizeRequest {
  presentationIds: string[];
  optimization: {
    targetSize?: number; // bytes
    quality?: number; // 0-100
    format?: 'png' | 'jpg' | 'webp';
    removeOldVersions: boolean;
  };
  preserveOriginals: boolean;
}

// =============================================================================
// FILE BATCH OPERATIONS
// =============================================================================

export interface BatchFileUploadRequest {
  files: Array<{
    name: string;
    content: Buffer;
    contentType: string;
    size: number;
    metadata?: Record<string, any>;
  }>;
  uploadOptions: {
    destination: string;
    overwriteExisting: boolean;
    generateUniqueNames: boolean;
    validateFileTypes: boolean;
    maxFileSize: number;
    compression?: {
      enabled: boolean;
      level: number;
      format: string;
    };
  };
  postUploadActions: Array<{
    action: 'convert' | 'thumbnail' | 'analyze' | 'index';
    parameters?: Record<string, any>;
  }>;
}

export interface BatchFileDeleteRequest {
  fileIds: string[];
  deleteFromStorage: boolean;
  deleteMetadata: boolean;
  deleteThumbnails: boolean;
  deleteBackups: boolean;
  reason?: string;
}

export interface BatchFileConvertRequest {
  conversions: Array<{
    fileId: string;
    sourceFormat: string;
    targetFormats: string[];
    quality?: string;
    customOptions?: Record<string, any>;
  }>;
  generateThumbnails: boolean;
  preserveOriginals: boolean;
  outputDirectory?: string;
}

// =============================================================================
// ANALYTICS BATCH OPERATIONS
// =============================================================================

export interface BatchAnalyticsRequest {
  presentationIds: string[];
  analysisTypes: Array<{
    type: 'content' | 'structure' | 'accessibility' | 'performance' | 'usage';
    parameters?: Record<string, any>;
    aiModel?: string;
    depth?: 'shallow' | 'deep' | 'comprehensive';
  }>;
  includeRecommendations: boolean;
  generateReports: boolean;
  reportFormats: string[];
}

// =============================================================================
// BATCH CONFIGURATION AND MONITORING
// =============================================================================

export interface BatchConfiguration {
  maxConcurrency: number;
  retryPolicy: {
    enabled: boolean;
    maxRetries: number;
    backoffStrategy: 'linear' | 'exponential' | 'fixed';
    initialDelay: number;
    maxDelay: number;
  };
  timeout: {
    perItem: number; // milliseconds
    total: number; // milliseconds
  };
  monitoring: {
    enableProgressTracking: boolean;
    enableMetrics: boolean;
    enableNotifications: boolean;
    notificationThresholds: {
      errorRate: number; // percentage
      completionTime: number; // milliseconds
    };
  };
  resources: {
    maxMemoryUsage: number; // bytes
    maxCpuUsage: number; // percentage
    priorityLevel: 'low' | 'normal' | 'high';
  };
}

export interface BatchProgress {
  operationId: string;
  phase: 'initializing' | 'processing' | 'finalizing' | 'completed' | 'failed';
  progress: {
    current: number;
    total: number;
    percentage: number;
  };
  timing: {
    startTime: Date;
    estimatedCompletion?: Date;
    elapsedTime: number;
    averageItemTime: number;
  };
  performance: {
    itemsPerSecond: number;
    memoryUsage: number;
    cpuUsage: number;
  };
  currentItem?: {
    id: string;
    name: string;
    startTime: Date;
  };
}

export interface BatchNotification {
  operationId: string;
  type: 'started' | 'progress' | 'completed' | 'failed' | 'warning';
  message: string;
  timestamp: Date;
  data?: Record<string, any>;
  recipients: string[];
  channels: Array<'email' | 'sms' | 'webhook' | 'in-app'>;
}

export interface BatchReport {
  operationId: string;
  summary: {
    totalItems: number;
    successfulItems: number;
    failedItems: number;
    skippedItems: number;
    totalProcessingTime: number;
    averageItemTime: number;
    successRate: number;
  };
  performance: {
    peakMemoryUsage: number;
    peakCpuUsage: number;
    averageItemsPerSecond: number;
    bottlenecks: string[];
  };
  errors: Array<{
    itemId: string;
    error: string;
    timestamp: Date;
    retryCount: number;
  }>;
  warnings: Array<{
    itemId: string;
    warning: string;
    timestamp: Date;
  }>;
  recommendations: string[];
  artifacts: Array<{
    type: string;
    name: string;
    url: string;
    size: number;
  }>;
}

// =============================================================================
// BATCH QUEUE MANAGEMENT
// =============================================================================

export interface BatchQueue {
  id: string;
  name: string;
  description?: string;
  maxConcurrency: number;
  priority: number;
  status: 'active' | 'paused' | 'stopped';
  operations: BatchOperation[];
  statistics: {
    totalOperations: number;
    completedOperations: number;
    failedOperations: number;
    averageCompletionTime: number;
    currentLoad: number;
  };
}

export interface BatchSchedule {
  id: string;
  operationType: string;
  configuration: any;
  schedule: {
    type: 'once' | 'recurring';
    startTime: Date;
    endTime?: Date;
    recurrence?: {
      pattern: 'daily' | 'weekly' | 'monthly' | 'custom';
      interval: number;
      daysOfWeek?: number[];
      dayOfMonth?: number;
      customCron?: string;
    };
  };
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
  runHistory: Array<{
    startTime: Date;
    endTime: Date;
    status: 'completed' | 'failed' | 'cancelled';
    operationId: string;
  }>;
}