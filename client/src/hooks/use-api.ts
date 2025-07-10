/**
 * API Layer - Screaming Architecture Frontend
 * 🎯 RESPONSIBILITY: Centralized API communication
 * 📋 SCOPE: All /api/v1/* endpoints, error handling, typing
 * ⚠️  NEVER call localhost:8080 directly - always via /api/v1/*
 */

import { UniversalPresentation } from '@/types/universal-json';

// Base API configuration
const API_BASE = '/api/v1';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Generic API call wrapper
async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `API Error: ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error('API Call Error:', { endpoint, error });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'API call failed',
      timestamp: new Date().toISOString(),
    };
  }
}

// Generic multipart/form-data wrapper for file uploads
async function apiUpload<T>(
  endpoint: string,
  formData: FormData
): Promise<ApiResponse<T>> {
  try {
    const url = `${API_BASE}${endpoint}`;
    
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `Upload Error: ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error('API Upload Error:', { endpoint, error });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
      timestamp: new Date().toISOString(),
    };
  }
}

// 🔥 HEALTH & SYSTEM
export const healthApi = {
  // Get system health
  getHealth: () => apiCall<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    services: Array<{
      name: string;
      status: 'up' | 'down' | 'degraded';
      responseTime?: number;
      lastCheck: string;
    }>;
    uptime: number;
    version: string;
  }>('/health'),

  // Get API documentation
  getApiInfo: () => apiCall<{
    name: string;
    version: string;
    description: string;
    baseUrl: string;
    endpoints: Record<string, any>;
  }>('/'),
};

// 📄 PRESENTATIONS
export const presentationsApi = {
  // List presentations
  list: (params?: { 
    page?: number; 
    limit?: number; 
    sortBy?: string; 
    sortOrder?: 'asc' | 'desc' 
  }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.sortBy) query.set('sortBy', params.sortBy);
    if (params?.sortOrder) query.set('sortOrder', params.sortOrder);
    
    return apiCall<PaginatedResponse<any>>(`/presentations?${query.toString()}`);
  },

  // Get presentation metadata
  get: (id: string) => apiCall<any>(`/presentations/${id}`),

  // Get presentation versions
  getVersions: (id: string) => apiCall<{
    presentationId: string;
    versions: Array<{
      id: string;
      version: string;
      createdAt: string;
      author?: string;
      comment?: string;
    }>;
    currentVersion: string;
  }>(`/presentations/${id}/versions`),

  // Search presentations
  search: (params: {
    q: string;
    page?: number;
    limit?: number;
    author?: string;
    dateFrom?: string;
    dateTo?: string;
  }) => {
    const query = new URLSearchParams();
    query.set('q', params.q);
    if (params.page) query.set('page', params.page.toString());
    if (params.limit) query.set('limit', params.limit.toString());
    if (params.author) query.set('author', params.author);
    if (params.dateFrom) query.set('dateFrom', params.dateFrom);
    if (params.dateTo) query.set('dateTo', params.dateTo);
    
    return apiCall<PaginatedResponse<any>>(`/presentations/search?${query.toString()}`);
  },
};

// 🔄 CONVERSION
export const conversionApi = {
  // Convert PPTX to Universal JSON
  pptxToJson: (file: File, options?: {
    includeAssets?: boolean;
    includeHidden?: boolean;
  }) => {
    const formData = new FormData();
    formData.append('file', file);
    if (options?.includeAssets !== undefined) {
      formData.append('includeAssets', options.includeAssets.toString());
    }
    if (options?.includeHidden !== undefined) {
      formData.append('includeHidden', options.includeHidden.toString());
    }

    return apiUpload<{
      inputFormat: string;
      outputFormat: string;
      inputSize: number;
      conversionTime: number;
      presentation: UniversalPresentation;
    }>('/pptx2json', formData);
  },

  // Convert Universal JSON to PPTX
  jsonToPptx: (presentation: UniversalPresentation, outputFilename?: string) => 
    apiCall<{
      inputFormat: string;
      outputFormat: string;
      outputSize: number;
      conversionTime: number;
      downloadUrl: string;
      filename: string;
    }>('/json2pptx', {
      method: 'POST',
      body: JSON.stringify({ presentationData: presentation, outputFilename }),
    }),

  // Export PPTX to PDF
  pptxToPdf: (file: File, quality?: 'high' | 'medium' | 'low') => {
    const formData = new FormData();
    formData.append('file', file);
    if (quality) formData.append('quality', quality);

    return apiUpload<{
      inputFormat: string;
      outputFormat: string;
      inputSize: number;
      outputSize: number;
      conversionTime: number;
      downloadUrl: string;
      filename: string;
    }>('/convertformat', formData);
  },

  // Generate thumbnails
  generateThumbnails: (file: File, options?: {
    formats?: string[];
    sizes?: Array<{ width: number; height: number; name: string }>;
  }) => {
    const formData = new FormData();
    formData.append('file', file);
    if (options?.formats) {
      formData.append('formats', JSON.stringify(options.formats));
    }
    if (options?.sizes) {
      formData.append('sizes', JSON.stringify(options.sizes));
    }

    return apiUpload<{
      inputFormat: string;
      outputFormat: string;
      inputSize: number;
      conversionTime: number;
      thumbnails: any[];
      downloadUrl: string;
    }>('/thumbnails', formData);
  },
};

// 🧠 JSON UNIVERSAL
export const jsonApi = {
  // Get full Universal JSON
  getFull: (id: string) => apiCall<UniversalPresentation>(`/json/${id}`),

  // Get specific slide
  getSlide: (id: string, slideIndex: number) => 
    apiCall<any>(`/json/${id}/slide/${slideIndex}`),

  // Get specific shape
  getShape: (id: string, slideIndex: number, shapeIndex: number) => 
    apiCall<any>(`/json/${id}/slide/${slideIndex}/shape/${shapeIndex}`),

  // Get only metadata
  getMetadata: (id: string) => apiCall<any>(`/json/${id}/metadata`),

  // Get structure without visual content
  getStructure: (id: string) => apiCall<{
    presentationId: string;
    slideCount: number;
    structure: Array<{
      slideIndex: number;
      title?: string;
      shapeCount: number;
      hasImages: boolean;
      hasCharts: boolean;
      hasTables: boolean;
      hasVideos: boolean;
      hasAudio: boolean;
    }>;
  }>(`/json/${id}/structure`),
};

// 🖼️ ASSETS
export const assetsApi = {
  // Get all assets from presentation
  getAll: (id: string) => apiCall<{
    presentationId: string;
    totalAssets: number;
    assetsByType: Record<string, number>;
    assets: any[];
  }>(`/assets/${id}`),

  // Get only images
  getImages: (id: string) => apiCall<any[]>(`/assets/${id}/images`),

  // Get only audio
  getAudio: (id: string) => apiCall<any[]>(`/assets/${id}/audio`),

  // Get only OLE objects
  getOle: (id: string) => apiCall<any[]>(`/assets/${id}/ole`),

  // Get global assets list
  listGlobal: (params?: {
    page?: number;
    limit?: number;
    type?: string;
    presentationId?: string;
  }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.type) query.set('type', params.type);
    if (params?.presentationId) query.set('presentationId', params.presentationId);
    
    return apiCall<PaginatedResponse<any>>(`/assets?${query.toString()}`);
  },
};

// 💬 AI & OPENAI
export const aiApi = {
  // Generate presentation from prompt
  generatePresentation: (params: {
    description: string;
    slides?: number;
    style?: string;
    template?: string;
  }) => apiCall<{
    presentationId: string;
    prompt: string;
    tokensUsed: number;
    generationTime: number;
    slideCount: number;
    downloadUrl?: string;
    previewUrl?: string;
  }>('/ai/generate-presentation', {
    method: 'POST',
    body: JSON.stringify(params),
  }),

  // Get semantic digest
  getSemanticDigest: (id: string) => apiCall<{
    presentationId: string;
    summary: {
      title: string;
      mainTopics: string[];
      keyPoints: string[];
      slideStructure: {
        introduction: number[];
        mainContent: number[];
        conclusion: number[];
      };
      complexity: 'simple' | 'moderate' | 'complex';
      audience: 'general' | 'technical' | 'executive' | 'academic';
      narrative: {
        flow: 'linear' | 'modular' | 'mixed';
        coherence: number;
        engagement: number;
      };
    };
    analysisTime: number;
  }>(`/ai/semantic-digest/${id}`),

  // Enhance presentation
  enhancePresentation: (id: string, params: {
    enhancementType?: string;
    targetAudience?: string;
    improvementAreas?: string[];
  }) => apiCall<{
    presentationId: string;
    enhancementType: string;
    tokensUsed: number;
    enhancementTime: number;
    suggestions: any[];
    enhancedSlides: any[];
  }>(`/ai/enhance-presentation/${id}`, {
    method: 'POST',
    body: JSON.stringify(params),
  }),

  // Generate slide content
  generateSlideContent: (params: {
    topic: string;
    slideType?: string;
    context?: string;
    targetLength?: number;
  }) => apiCall<{
    topic: string;
    slideType: string;
    tokensUsed: number;
    generationTime: number;
    content: any;
    suggestions: any[];
  }>('/ai/generate-slide-content', {
    method: 'POST',
    body: JSON.stringify(params),
  }),

  // Chat with presentation
  chatWithPresentation: (id: string, params: {
    message: string;
    conversationHistory?: any[];
  }) => apiCall<{
    presentationId: string;
    userMessage: string;
    aiResponse: string;
    tokensUsed: number;
    responseTime: number;
    conversationId: string;
  }>(`/ai/chat/${id}`, {
    method: 'POST',
    body: JSON.stringify(params),
  }),
};

// 📦 DOWNLOADS
export const downloadsApi = {
  // Download PPTX
  getPptx: (id: string) => apiCall<{
    downloadUrl: string;
    filename: string;
    size: number;
    mimeType: string;
    expiresAt: string;
    format: string;
  }>(`/download/${id}/pptx`),

  // Download PDF
  getPdf: (id: string) => apiCall<{
    downloadUrl: string;
    filename: string;
    size: number;
    mimeType: string;
    expiresAt: string;
    format: string;
  }>(`/download/${id}/pdf`),

  // Download JSON
  getJson: (id: string) => apiCall<{
    downloadUrl: string;
    filename: string;
    size: number;
    mimeType: string;
    expiresAt: string;
    format: string;
  }>(`/download/${id}/json`),

  // Download thumbnails ZIP
  getThumbnails: (id: string) => apiCall<{
    downloadUrl: string;
    filename: string;
    size: number;
    mimeType: string;
    expiresAt: string;
    format: string;
  }>(`/download/${id}/thumbnails`),
};

// Export all APIs
export const api = {
  health: healthApi,
  presentations: presentationsApi,
  conversion: conversionApi,
  json: jsonApi,
  assets: assetsApi,
  ai: aiApi,
  downloads: downloadsApi,
}; 