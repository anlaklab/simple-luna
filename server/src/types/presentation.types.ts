import { z } from "zod";
/**
 * Presentation Management Types
 * 
 * Comprehensive type definitions for presentation CRUD operations and management
 */

export interface PresentationMetadata {
  id: string;
  title: string;
  description?: string;
  fileName: string;
  originalFileName: string;
  fileSize: number;
  filePath: string;
  mimeType: string;
  
  // Presentation structure
  slideCount: number;
  slideSize: {
    width: number;
    height: number;
    type: string;
    orientation: 'landscape' | 'portrait';
  };
  
  // Content statistics
  stats: {
    totalShapes: number;
    totalImages: number;
    totalVideos: number;
    totalAudios: number;
    totalCharts: number;
    totalTables: number;
    totalAnimations: number;
    totalWords: number;
    totalCharacters: number;
    averageWordsPerSlide: number;
  };
  
  // Document properties
  documentProperties: {
    title: string;
    author: string;
    subject: string;
    keywords: string;
    comments: string;
    category: string;
    manager: string;
    company: string;
    createdTime: Date;
    lastSavedTime: Date;
    lastPrintedDate?: Date;
    revisionNumber: number;
    totalEditingTime: number;
  };
  
  // Security and access
  security: {
    isEncrypted: boolean;
    isPasswordProtected: boolean;
    isWriteProtected: boolean;
    hasDigitalSignature: boolean;
    hasVbaProject: boolean;
  };
  
  // Processing status
  processing: {
    status: 'pending' | 'processing' | 'completed' | 'failed';
    conversionStatus: 'not_started' | 'in_progress' | 'completed' | 'failed';
    thumbnailStatus: 'not_started' | 'in_progress' | 'completed' | 'failed';
    lastProcessed: Date;
    processingTime: number;
    errors: string[];
  };
  
  // Versions and history
  version: {
    current: number;
    history: Array<{
      version: number;
      createdAt: Date;
      createdBy: string;
      changes: string;
      filePath: string;
      fileSize: number;
    }>;
  };
  
  // User and access management
  access: {
    owner: string;
    createdBy: string;
    lastModifiedBy: string;
    visibility: 'private' | 'shared' | 'public';
    permissions: {
      canView: string[];
      canEdit: string[];
      canDelete: string[];
      canShare: string[];
    };
  };
  
  // Organization and categorization
  organization: {
    tags: string[];
    categories: string[];
    collections: string[];
    starred: boolean;
    archived: boolean;
    favorite: boolean;
  };
  
  // Timestamps
  timestamps: {
    created: Date;
    updated: Date;
    lastViewed: Date;
    lastDownloaded?: Date;
    archived?: Date;
    deleted?: Date;
  };
  
  // External references
  references: {
    universalSchemaId?: string;
    thumbnailUrls: string[];
    exportUrls: Record<string, string>; // format -> url
    sessionIds: string[];
    backupPaths: string[];
  };
  
  // Custom metadata
  customFields: Record<string, any>;
}

export interface PresentationCreateRequest {
  title: string;
  description?: string;
  file: {
    originalName: string;
    buffer: Buffer;
    mimetype: string;
    size: number;
  };
  options?: {
    generateThumbnails?: boolean;
    extractAssets?: boolean;
    processImmediately?: boolean;
    visibility?: 'private' | 'shared' | 'public';
    tags?: string[];
    categories?: string[];
  };
  owner: string;
}

export interface PresentationUpdateRequest {
  title?: string;
  description?: string;
  tags?: string[];
  categories?: string[];
  visibility?: 'private' | 'shared' | 'public';
  starred?: boolean;
  archived?: boolean;
  favorite?: boolean;
  customFields?: Record<string, any>;
}

export interface PresentationListQuery {
  owner?: string;
  visibility?: 'private' | 'shared' | 'public';
  tags?: string[];
  categories?: string[];
  collections?: string[];
  search?: string;
  starred?: boolean;
  archived?: boolean;
  favorite?: boolean;
  status?: 'pending' | 'processing' | 'completed' | 'failed';
  limit?: number;
  offset?: number;
  sortBy?: 'created' | 'updated' | 'title' | 'fileSize' | 'slideCount';
  sortOrder?: 'asc' | 'desc';
  dateFrom?: Date;
  dateTo?: Date;
  minFileSize?: number;
  maxFileSize?: number;
  minSlideCount?: number;
  maxSlideCount?: number;
}

export interface PresentationListResponse {
  presentations: PresentationMetadata[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  aggregations: {
    totalSize: number;
    totalSlides: number;
    averageFileSize: number;
    averageSlideCount: number;
    statusCounts: Record<string, number>;
    tagCounts: Record<string, number>;
    categoryCounts: Record<string, number>;
  };
}

export interface PresentationVersionInfo {
  id: string;
  presentationId: string;
  version: number;
  createdAt: Date;
  createdBy: string;
  changes: string;
  filePath: string;
  fileSize: number;
  slideCount: number;
  processingStatus: string;
  isActive: boolean;
  metadata: Record<string, any>;
}

export interface PresentationAccessInfo {
  presentationId: string;
  userId: string;
  role: 'owner' | 'editor' | 'viewer';
  permissions: {
    canView: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canShare: boolean;
    canExport: boolean;
    canCreateVersion: boolean;
  };
  grantedAt: Date;
  grantedBy: string;
  expiresAt?: Date;
  lastAccessed?: Date;
  accessCount: number;
}

export interface PresentationAnalytics {
  presentationId: string;
  period: {
    start: Date;
    end: Date;
  };
  usage: {
    totalViews: number;
    uniqueViewers: number;
    totalDownloads: number;
    totalShares: number;
    totalExports: number;
    averageViewDuration: number;
    peakViewDate: Date;
    viewsByDay: Array<{ date: string; views: number }>;
  };
  performance: {
    averageLoadTime: number;
    conversionTimes: number[];
    thumbnailGenerationTime: number;
    failureRate: number;
    errorCount: number;
    mostCommonErrors: Array<{ error: string; count: number }>;
  };
  engagement: {
    slidesViewed: Record<number, number>; // slideIndex -> viewCount
    averageSlidesViewed: number;
    completionRate: number; // percentage who viewed all slides
    bounceRate: number; // percentage who viewed only first slide
    timeSpentPerSlide: Record<number, number>; // slideIndex -> averageTime
  };
  exports: {
    formatCounts: Record<string, number>; // format -> count
    popularFormats: string[];
    totalExportSize: number;
    averageExportTime: number;
  };
  social: {
    shareCount: number;
    sharesByPlatform: Record<string, number>;
    shareEngagement: number;
    referralTraffic: number;
  };
}

export interface PresentationSearchResult {
  presentation: PresentationMetadata;
  matches: Array<{
    type: 'title' | 'description' | 'content' | 'tags' | 'metadata';
    field: string;
    value: string;
    highlight: string;
    slideIndex?: number;
    shapeId?: string;
  }>;
  score: number;
  relevance: number;
}

export interface PresentationExportOptions {
  format: 'pptx' | 'pdf' | 'html' | 'images' | 'json' | 'video';
  quality?: 'low' | 'medium' | 'high' | 'ultra';
  includeNotes?: boolean;
  includeAnimations?: boolean;
  includeTransitions?: boolean;
  slideRange?: {
    start: number;
    end: number;
  };
  customOptions?: Record<string, any>;
  watermark?: {
    text: string;
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
    opacity: number;
  };
}

export interface PresentationExportResult {
  success: boolean;
  presentationId: string;
  format: string;
  filePath?: string;
  downloadUrl?: string;
  fileSize: number;
  expiresAt?: Date;
  processingTime: number;
  error?: string;
  metadata: {
    slideCount: number;
    resolution?: { width: number; height: number };
    quality: string;
    compressionRatio?: number;
  };
}

export interface PresentationDuplicateRequest {
  presentationId: string;
  newTitle: string;
  newDescription?: string;
  copyOptions: {
    copyThumbnails: boolean;
    copyVersionHistory: boolean;
    copyCustomFields: boolean;
    copyTags: boolean;
    copyCategories: boolean;
  };
  owner: string;
}

export interface PresentationMergeRequest {
  targetPresentationId: string;
  sourcePresentationIds: string[];
  mergeOptions: {
    preserveSourceFormatting: boolean;
    insertPosition: 'beginning' | 'end' | 'specific';
    specificPosition?: number;
    updateReferences: boolean;
    combineTags: boolean;
    combineCategories: boolean;
  };
}

export interface PresentationComparisonResult {
  presentation1Id: string;
  presentation2Id: string;
  differences: {
    slideCount: { p1: number; p2: number };
    fileSize: { p1: number; p2: number };
    lastModified: { p1: Date; p2: Date };
    contentChanges: Array<{
      slideIndex: number;
      changeType: 'added' | 'removed' | 'modified';
      description: string;
      details: any;
    }>;
    structuralChanges: Array<{
      type: 'slide_added' | 'slide_removed' | 'slide_reordered';
      slideIndex: number;
      description: string;
    }>;
    metadataChanges: Array<{
      field: string;
      oldValue: any;
      newValue: any;
    }>;
  };
  similarity: {
    overall: number; // 0-1
    content: number;
    structure: number;
    metadata: number;
  };
  comparedAt: Date;
  comparisonTime: number;
}

export interface PresentationTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  thumbnailUrl: string;
  previewUrls: string[];
  slideCount: number;
  fileSize: number;
  filePath: string;
  author: string;
  isPublic: boolean;
  downloadCount: number;
  rating: number;
  ratingCount: number;
  createdAt: Date;
  updatedAt: Date;
  metadata: {
    slideSize: { width: number; height: number };
    colorScheme: string[];
    fontFamilies: string[];
    hasAnimations: boolean;
    hasTransitions: boolean;
    complexity: 'simple' | 'medium' | 'complex';
    industry: string[];
    useCase: string[];
  };
}