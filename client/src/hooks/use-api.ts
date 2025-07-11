/**
 * Unified API Layer - Enhanced with Configuration and Error Handling
 * 🎯 RESPONSIBILITY: Centralized API communication with robust error handling
 * 📋 SCOPE: All /api/v1/* endpoints, error handling, typing, retry logic
 * ⚡ FEATURES: Auto-retry, caching, monitoring, type safety
 */

import { UniversalPresentation } from '@/types/universal-json';
import { 
  API_CONFIG, 
  buildApiUrl, 
  buildQueryString, 
  getRequestConfig, 
  createApiError, 
  isRetryableError, 
  calculateRetryDelay, 
  delay,
  apiMonitor,
  type ApiError,
  type RequestMetrics 
} from '@/lib/config/api.config';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
  meta?: {
    requestId?: string;
    processingTime?: number;
    version?: string;
  };
}

export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface ApiCallOptions extends RequestInit {
  timeout?: number;
  retries?: number;
  onProgress?: (progress: UploadProgress) => void;
  skipRetry?: boolean;
}

// =============================================================================
// CORE API FUNCTIONS
// =============================================================================

/**
 * Enhanced API call wrapper with retry logic and monitoring
 */
async function apiCall<T>(
  endpoint: string,
  options: ApiCallOptions = {}
): Promise<ApiResponse<T>> {
  const startTime = Date.now();
  const { retries = API_CONFIG.retry.attempts, skipRetry = false, ...requestOptions } = options;
  
  let lastError: any;
  let attempt = 0;

  while (attempt < retries) {
    attempt++;
    
    try {
      const url = buildApiUrl(endpoint);
      const config = getRequestConfig(requestOptions);
      
      const response = await fetch(url, config);
      const data = await response.json();
      
      const duration = Date.now() - startTime;
      const metrics: RequestMetrics = {
        url,
        method: config.method || 'GET',
        duration,
        status: response.status,
        success: response.ok,
        timestamp: new Date().toISOString(),
        retryCount: attempt - 1,
      };

      if (!response.ok) {
        const error = createApiError(
          data.error || `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          data.code,
          data.details
        );
        
        metrics.error = error.message;
        apiMonitor.recordRequest(metrics);
        
        // Check if we should retry
        if (!skipRetry && attempt < retries && isRetryableError({ status: response.status })) {
          const retryDelay = calculateRetryDelay(attempt);
          await delay(retryDelay);
          continue;
        }
        
        return {
          success: false,
          error: error.message,
          timestamp: error.timestamp,
          meta: {
            requestId: data.meta?.requestId,
          },
        };
      }

      apiMonitor.recordRequest(metrics);
      return data;

    } catch (error) {
      lastError = error;
      const duration = Date.now() - startTime;
      
      const metrics: RequestMetrics = {
        url: buildApiUrl(endpoint),
        method: requestOptions.method || 'GET',
        duration,
        status: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        retryCount: attempt - 1,
      };
      
      apiMonitor.recordRequest(metrics);
      
      // Check if we should retry
      if (!skipRetry && attempt < retries && isRetryableError(error)) {
        const retryDelay = calculateRetryDelay(attempt);
        await delay(retryDelay);
        continue;
      }
      
      break;
    }
  }

  // All retries exhausted
  const finalError = createApiError(
    lastError instanceof Error ? lastError.message : 'API call failed after retries',
    undefined,
    'NETWORK_ERROR'
  );

  return {
    success: false,
    error: finalError.message,
    timestamp: finalError.timestamp,
  };
}

/**
 * Enhanced file upload with progress tracking
 */
async function apiUpload<T>(
  endpoint: string,
  formData: FormData,
  options: ApiCallOptions = {}
): Promise<ApiResponse<T>> {
  const { onProgress, ...otherOptions } = options;
  
  try {
    const url = buildApiUrl(endpoint);
    
    // Create XMLHttpRequest for progress tracking
    if (onProgress) {
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const progress: UploadProgress = {
              loaded: event.loaded,
              total: event.total,
              percentage: Math.round((event.loaded / event.total) * 100),
            };
            onProgress(progress);
          }
        });
        
        xhr.addEventListener('load', async () => {
          try {
            const data = JSON.parse(xhr.responseText);
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve(data);
            } else {
              resolve({
                success: false,
                error: data.error || `Upload failed: ${xhr.status}`,
                timestamp: new Date().toISOString(),
              });
            }
          } catch (error) {
            resolve({
              success: false,
              error: 'Failed to parse upload response',
              timestamp: new Date().toISOString(),
            });
          }
        });
        
        xhr.addEventListener('error', () => {
          resolve({
            success: false,
            error: 'Upload failed',
            timestamp: new Date().toISOString(),
          });
        });
        
        xhr.open('POST', url);
        xhr.send(formData);
      });
    }
    
    // Fall back to regular fetch for uploads without progress
    const config = getRequestConfig({
      method: 'POST',
      body: formData,
      ...otherOptions,
    }, 'upload');
    
    // Remove Content-Type header for FormData
    if (config.headers && 'Content-Type' in config.headers) {
      delete (config.headers as any)['Content-Type'];
    }
    
    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || `Upload Error: ${response.status}`,
        timestamp: new Date().toISOString(),
      };
    }

    return data;

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
      timestamp: new Date().toISOString(),
    };
  }
}

// =============================================================================
// HEALTH & SYSTEM API
// =============================================================================

export const healthApi = {
  getHealth: () => apiCall<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    services: Array<{
      name: string;
      status: 'up' | 'down' | 'degraded';
      responseTime?: number;
      lastCheck: string;
      details?: any;
    }>;
    uptime: number;
    version: string;
    environment: string;
  }>('/health'),

  getApiInfo: () => apiCall<{
    name: string;
    version: string;
    description: string;
    baseUrl: string;
    environment: string;
    endpoints: Record<string, any>;
    features: Record<string, boolean>;
  }>('/'),

  getStats: () => apiCall<{
    requests: {
      total: number;
      successful: number;
      failed: number;
      avgResponseTime: number;
    };
    system: {
      uptime: number;
      memory: {
        used: number;
        total: number;
        percentage: number;
      };
      cpu: {
        usage: number;
      };
    };
    services: Record<string, any>;
  }>('/stats'),
};

// =============================================================================
// ENHANCED PRESENTATIONS API
// =============================================================================

export const presentationsApi = {
  // List presentations with advanced filtering
  list: (params?: { 
    page?: number; 
    limit?: number; 
    sortBy?: string; 
    sortOrder?: 'asc' | 'desc';
    author?: string;
    company?: string;
    status?: string;
    minSlideCount?: number;
    maxSlideCount?: number;
    tags?: string[];
    dateFrom?: string;
    dateTo?: string;
  }) => {
    const queryString = buildQueryString(params || {});
    return apiCall<PaginatedResponse<any>>(`/presentations${queryString}`);
  },

  // Get presentation with optional includes
  get: (id: string, options?: {
    includeVersions?: boolean;
    includeAnalytics?: boolean;
  }) => {
    const queryString = buildQueryString(options || {});
    return apiCall<any>(`/presentations/${id}${queryString}`);
  },

  // Create new presentation
  create: (formData: FormData, onProgress?: (progress: UploadProgress) => void) => 
    apiUpload<any>('/presentations', formData, { onProgress }),

  // Update presentation metadata
  update: (id: string, data: {
    title?: string;
    description?: string;
    tags?: string[];
    category?: string;
    isPublic?: boolean;
    allowDownload?: boolean;
  }) => apiCall<any>(`/presentations/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),

  // Delete presentation
  delete: (id: string, options?: {
    deleteVersions?: boolean;
    deleteThumbnails?: boolean;
  }) => {
    const queryString = buildQueryString(options || {});
    return apiCall<{ message: string }>(`/presentations/${id}${queryString}`, {
      method: 'DELETE',
    });
  },

  // Search presentations
  search: (params: {
    q: string;
    page?: number;
    limit?: number;
    searchIn?: string[];
  }) => {
    const queryString = buildQueryString(params);
    return apiCall<PaginatedResponse<any>>(`/presentations/search${queryString}`);
  },

  // Get presentation versions
  getVersions: (id: string) => apiCall<{
    presentationId: string;
    versions: Array<{
      version: number;
      createdAt: string;
      createdBy: string;
      changes: string;
      filePath: string;
      fileSize: number;
    }>;
    currentVersion: number;
  }>(`/presentations/${id}/versions`),

  // Create new version
  createVersion: (id: string, formData: FormData) => 
    apiUpload<any>(`/presentations/${id}/versions`, formData),

  // Restore version
  restoreVersion: (id: string, version: number) => 
    apiCall<any>(`/presentations/${id}/versions/${version}/restore`, {
      method: 'POST',
    }),

  // Get analytics
  getAnalytics: (id: string) => apiCall<any>(`/presentations/${id}/analytics`),

  // Get analytics summary
  getAnalyticsSummary: () => apiCall<any>('/presentations/analytics/summary'),

  // Export presentation
  export: (id: string, options: {
    format: 'pdf' | 'pptx' | 'json' | 'html';
    quality?: 'high' | 'medium' | 'low';
    includeNotes?: boolean;
    slideRange?: { start: number; end: number };
  }) => apiCall<{
    exportId: string;
    downloadUrl: string;
    filename: string;
    format: string;
    size: number;
    expiresAt: string;
  }>(`/presentations/${id}/export`, {
    method: 'POST',
    body: JSON.stringify(options),
  }),

  // Create sharing link
  createSharingLink: (id: string, options: {
    expiresIn?: string;
    allowDownload?: boolean;
    requirePassword?: boolean;
    password?: string;
  }) => apiCall<{
    shareId: string;
    shareUrl: string;
    expiresAt: string;
    permissions: any;
  }>(`/presentations/${id}/share`, {
    method: 'POST',
    body: JSON.stringify(options),
  }),

  // Bulk operations
  bulkDelete: (presentationIds: string[]) => 
    apiCall<{
      successful: string[];
      failed: Array<{ id: string; error: string }>;
    }>('/presentations/bulk/delete', {
      method: 'POST',
      body: JSON.stringify({ presentationIds }),
    }),

  bulkUpdate: (presentationIds: string[], updates: any) => 
    apiCall<{
      successful: string[];
      failed: Array<{ id: string; error: string }>;
    }>('/presentations/bulk/update', {
      method: 'POST',
      body: JSON.stringify({ presentationIds, updates }),
    }),
};

// =============================================================================
// CONVERSION API (Enhanced)
// =============================================================================

export const conversionApi = {
  // Convert PPTX to Universal JSON
  pptxToJson: (
    file: File, 
    options?: {
      includeAssets?: boolean;
      includeHidden?: boolean;
      includeNotes?: boolean;
      generateThumbnails?: boolean;
    },
    onProgress?: (progress: UploadProgress) => void
  ) => {
    const formData = new FormData();
    formData.append('file', file);
    
    Object.entries(options || {}).forEach(([key, value]) => {
      if (value !== undefined) {
        formData.append(key, value.toString());
      }
    });

    return apiUpload<{
      inputFormat: string;
      outputFormat: string;
      inputSize: number;
      conversionTime: number;
      presentation: UniversalPresentation;
      metadata: {
        slideCount: number;
        shapeCount: number;
        imageCount: number;
        chartCount: number;
        tableCount: number;
      };
      thumbnails?: any[];
    }>('/pptx2json', formData, { onProgress });
  },

  // Convert Universal JSON to PPTX
  jsonToPptx: (presentation: UniversalPresentation, options?: {
    outputFilename?: string;
    template?: string;
    quality?: 'high' | 'medium' | 'low';
  }) => apiCall<{
    inputFormat: string;
    outputFormat: string;
    outputSize: number;
    conversionTime: number;
    downloadUrl: string;
    filename: string;
    expiresAt: string;
  }>('/json2pptx', {
    method: 'POST',
    body: JSON.stringify({ 
      presentationData: presentation, 
      ...options 
    }),
  }),

  // Convert to various formats
  convertFormat: (
    file: File, 
    targetFormat: 'pdf' | 'html' | 'images',
    options?: {
      quality?: 'high' | 'medium' | 'low';
      includeNotes?: boolean;
      imageFormat?: 'png' | 'jpg' | 'svg';
      resolution?: number;
    },
    onProgress?: (progress: UploadProgress) => void
  ) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('format', targetFormat);
    
    Object.entries(options || {}).forEach(([key, value]) => {
      if (value !== undefined) {
        formData.append(key, value.toString());
      }
    });

    return apiUpload<{
      inputFormat: string;
      outputFormat: string;
      inputSize: number;
      outputSize: number;
      conversionTime: number;
      downloadUrl: string;
      filename: string;
      files?: Array<{
        name: string;
        url: string;
        size: number;
      }>;
    }>('/convertformat', formData, { onProgress });
  },

  // Generate thumbnails
  generateThumbnails: (
    file: File, 
    options?: {
      formats?: ('png' | 'jpg' | 'webp')[];
      sizes?: Array<{ width: number; height: number; name: string }>;
      quality?: number;
      slideIndices?: number[];
    },
    onProgress?: (progress: UploadProgress) => void
  ) => {
    const formData = new FormData();
    formData.append('file', file);
    
    if (options) {
      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined) {
          formData.append(key, JSON.stringify(value));
        }
      });
    }

    return apiUpload<{
      inputFormat: string;
      outputFormat: string;
      inputSize: number;
      conversionTime: number;
      thumbnails: Array<{
        slideIndex: number;
        format: string;
        width: number;
        height: number;
        url: string;
        size: number;
      }>;
      downloadUrl: string;
      totalCount: number;
    }>('/thumbnails', formData, { onProgress });
  },
};

// =============================================================================
// AI API (Enhanced)
// =============================================================================

export const aiApi = {
  // Enhanced AI analysis
  analyzePresentation: (id: string, analysisTypes?: string[]) => 
    apiCall<{
      presentationId: string;
      analysis: {
        summary?: any;
        sentiment?: any;
        accessibility?: any;
        suggestions?: any[];
        tags?: string[];
        topics?: string[];
        readability?: any;
      };
      tokensUsed: number;
      analysisTime: number;
    }>('/ai/analyze', {
      method: 'POST',
      body: JSON.stringify({ presentationId: id, analysisTypes }),
    }),

  // Chat with presentation
  chat: (id: string, message: string, sessionId?: string) => 
    apiCall<{
      response: string;
      sessionId: string;
      tokensUsed: number;
      responseTime: number;
      suggestions?: string[];
      actions?: any[];
    }>('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ presentationId: id, message, sessionId }),
    }),

  // Generate presentation from prompt
  generate: (prompt: string, options?: {
    slideCount?: number;
    template?: string;
    style?: string;
    audience?: string;
  }) => apiCall<{
    presentationId: string;
    prompt: string;
    tokensUsed: number;
    generationTime: number;
    slideCount: number;
    presentation: UniversalPresentation;
  }>('/ai/generate', {
    method: 'POST',
    body: JSON.stringify({ prompt, ...options }),
  }),

  // Enhance presentation
  enhance: (id: string, options: {
    type: 'style' | 'content' | 'structure' | 'accessibility';
    targetAudience?: string;
    preferences?: any;
  }) => apiCall<{
    presentationId: string;
    enhancementType: string;
    tokensUsed: number;
    enhancementTime: number;
    changes: any[];
    enhancedPresentation: UniversalPresentation;
  }>('/ai/enhance', {
    method: 'POST',
    body: JSON.stringify({ presentationId: id, ...options }),
  }),
};

// =============================================================================
// GRANULAR CONTROL API (NEW)
// =============================================================================

export const granularApi = {
  // Individual slide operations
  getSlide: (presentationId: string, slideIndex: number) => 
    apiCall<any>(`/presentations/${presentationId}/slides/${slideIndex}`),

  updateSlide: (presentationId: string, slideIndex: number, slideData: any) => 
    apiCall<any>(`/presentations/${presentationId}/slides/${slideIndex}`, {
      method: 'PUT',
      body: JSON.stringify(slideData),
    }),

  deleteSlide: (presentationId: string, slideIndex: number) => 
    apiCall<any>(`/presentations/${presentationId}/slides/${slideIndex}`, {
      method: 'DELETE',
    }),

  // Individual shape operations
  getShape: (presentationId: string, slideIndex: number, shapeId: string) => 
    apiCall<any>(`/presentations/${presentationId}/slides/${slideIndex}/shapes/${shapeId}`),

  updateShape: (presentationId: string, slideIndex: number, shapeId: string, shapeData: any) => 
    apiCall<any>(`/presentations/${presentationId}/slides/${slideIndex}/shapes/${shapeId}`, {
      method: 'PUT',
      body: JSON.stringify(shapeData),
    }),

  deleteShape: (presentationId: string, slideIndex: number, shapeId: string) => 
    apiCall<any>(`/presentations/${presentationId}/slides/${slideIndex}/shapes/${shapeId}`, {
      method: 'DELETE',
    }),

  // Render operations
  renderSlide: (slideData: any, options?: { format?: 'png' | 'svg'; quality?: number }) => 
    apiCall<{
      imageUrl: string;
      format: string;
      width: number;
      height: number;
      size: number;
    }>('/render/slide', {
      method: 'POST',
      body: JSON.stringify({ slideData, options }),
    }),

  renderShape: (shapeData: any, options?: { format?: 'png' | 'svg'; quality?: number }) => 
    apiCall<{
      imageUrl: string;
      format: string;
      width: number;
      height: number;
      size: number;
    }>('/render/shape', {
      method: 'POST',
      body: JSON.stringify({ shapeData, options }),
    }),
};

// =============================================================================
// DOWNLOADS API
// =============================================================================

export const downloadsApi = {
  getThumbnails: (presentationId: string) => 
    apiCall<{
      thumbnails: Array<{
        slideIndex: number;
        url: string;
        width: number;
        height: number;
        format: string;
      }>;
    }>(`/presentations/${presentationId}/thumbnails`),

  getAssets: (presentationId: string) => 
    apiCall<{
      assets: Array<{
        id: string;
        type: string;
        url: string;
        filename: string;
        size: number;
      }>;
    }>(`/presentations/${presentationId}/assets`),
};

// =============================================================================
// ASSETS API
// =============================================================================

export const assetsApi = {
  getAll: (presentationId: string) => 
    apiCall<{
      assets: Array<{
        id: string;
        type: string;
        url: string;
        filename: string;
        size: number;
        slideIndex: number;
        shapeId: string;
      }>;
    }>(`/presentations/${presentationId}/assets`),

  get: (presentationId: string, assetId: string) => 
    apiCall<{
      id: string;
      type: string;
      url: string;
      filename: string;
      size: number;
      slideIndex: number;
      shapeId: string;
      metadata: any;
    }>(`/presentations/${presentationId}/assets/${assetId}`),
};

// =============================================================================
// ENHANCED AI API
// =============================================================================

export const enhancedAiApi = {
  ...aiApi,
  
  getSemanticDigest: (presentationId: string) => 
    apiCall<{
      digest: {
        summary: string;
        keyTopics: string[];
        mainThemes: string[];
        targetAudience: string[];
        tone: string;
        complexity: 'low' | 'medium' | 'high';
        readingTime: number;
        keyInsights: string[];
        actionItems: string[];
        questions: string[];
      };
      confidence: number;
      tokensUsed: number;
      processingTime: number;
    }>(`/ai/presentations/${presentationId}/digest`),
};

// =============================================================================
// EXPORT ALL APIS
// =============================================================================

export const api = {
  health: healthApi,
  presentations: presentationsApi,
  conversion: conversionApi,
  ai: enhancedAiApi,
  granular: granularApi,
  downloads: downloadsApi,
  assets: assetsApi,
}; 