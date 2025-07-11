/**
 * API Configuration
 * 
 * Centralized configuration for API endpoints, environment variables,
 * and connection settings across the application
 */

// =============================================================================
// ENVIRONMENT DETECTION
// =============================================================================

export const getEnvironment = (): 'development' | 'production' | 'test' => {
  if (typeof window === 'undefined') return 'development';
  
  const hostname = window.location.hostname;
  
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'development';
  } else if (hostname.includes('test') || hostname.includes('staging')) {
    return 'test';
  } else {
    return 'production';
  }
};

// =============================================================================
// API CONFIGURATION
// =============================================================================

export const API_CONFIG = {
  // Environment
  environment: getEnvironment(),
  
  // API Base URLs by environment
  baseUrls: {
    development: '/api/v1',
    test: '/api/v1',
    production: '/api/v1',
  },
  
  // Get current base URL
  get baseUrl() {
    return this.baseUrls[this.environment];
  },
  
  // Timeout settings
  timeouts: {
    default: 30000,     // 30 seconds
    upload: 300000,     // 5 minutes for file uploads
    download: 600000,   // 10 minutes for downloads
    ai: 120000,         // 2 minutes for AI operations
  },
  
  // Retry settings
  retry: {
    attempts: 3,
    delay: 1000,
    backoff: 'exponential' as const,
  },
  
  // File upload limits
  upload: {
    maxFileSize: 500 * 1024 * 1024, // 500MB
    allowedTypes: [
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-powerpoint',
    ],
    chunkSize: 10 * 1024 * 1024, // 10MB chunks for large files
  },
  
  // Cache settings
  cache: {
    defaultStaleTime: 30000,    // 30 seconds
    defaultGcTime: 300000,      // 5 minutes
    refetchInterval: 60000,     // 1 minute for polling
  },
  
  // Feature flags
  features: {
    enableCaching: true,
    enableRetry: true,
    enablePolling: true,
    enableOffline: false,
    enableAnalytics: true,
    enableRealtime: false,
  },
};

// =============================================================================
// URL BUILDERS
// =============================================================================

export const buildApiUrl = (endpoint: string): string => {
  // Handle absolute URLs
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    return endpoint;
  }
  
  // Handle relative URLs
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${API_CONFIG.baseUrl}${cleanEndpoint}`;
};

export const buildQueryString = (params: Record<string, any>): string => {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      if (Array.isArray(value)) {
        value.forEach(item => searchParams.append(key, String(item)));
      } else {
        searchParams.set(key, String(value));
      }
    }
  });
  
  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
};

// =============================================================================
// REQUEST CONFIGURATION
// =============================================================================

export const getRequestConfig = (
  options: RequestInit = {},
  type: 'default' | 'upload' | 'download' | 'ai' = 'default'
): RequestInit => {
  const timeout = API_CONFIG.timeouts[type];
  
  const defaultHeaders: Record<string, string> = {
    'Accept': 'application/json',
  };
  
  // Don't set Content-Type for FormData (let browser set it with boundary)
  if (!(options.body instanceof FormData)) {
    defaultHeaders['Content-Type'] = 'application/json';
  }
  
  // Add environment-specific headers
  if (API_CONFIG.environment === 'development') {
    defaultHeaders['X-Environment'] = 'development';
  }
  
  return {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
    signal: options.signal || AbortSignal.timeout(timeout),
  };
};

// =============================================================================
// ERROR HANDLING
// =============================================================================

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
  details?: any;
  timestamp: string;
}

export const createApiError = (
  message: string,
  status?: number,
  code?: string,
  details?: any
): ApiError => ({
  message,
  code,
  status,
  details,
  timestamp: new Date().toISOString(),
});

export const isRetryableError = (error: any): boolean => {
  if (!API_CONFIG.features.enableRetry) return false;
  
  // Network errors
  if (error.name === 'TypeError' && error.message.includes('fetch')) {
    return true;
  }
  
  // Timeout errors
  if (error.name === 'AbortError') {
    return true;
  }
  
  // HTTP status codes that are retryable
  if (error.status) {
    const retryableStatuses = [408, 429, 500, 502, 503, 504];
    return retryableStatuses.includes(error.status);
  }
  
  return false;
};

// =============================================================================
// VALIDATION
// =============================================================================

export const validateEnvironment = (): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  // Check required environment variables (if any)
  // For now, we rely on the backend configuration
  
  // Validate URLs
  try {
    new URL(API_CONFIG.baseUrl, window.location.origin);
  } catch {
    errors.push('Invalid API base URL');
  }
  
  // Check upload limits
  if (API_CONFIG.upload.maxFileSize <= 0) {
    errors.push('Invalid max file size');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

// =============================================================================
// MONITORING
// =============================================================================

export interface RequestMetrics {
  url: string;
  method: string;
  duration: number;
  status: number;
  success: boolean;
  error?: string;
  timestamp: string;
  retryCount?: number;
}

class ApiMonitor {
  private metrics: RequestMetrics[] = [];
  private maxMetrics = 1000;
  
  recordRequest(metrics: RequestMetrics): void {
    this.metrics.push(metrics);
    
    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
    
    // Log errors in development
    if (API_CONFIG.environment === 'development' && !metrics.success) {
      console.warn('API Request Failed:', metrics);
    }
  }
  
  getMetrics(): RequestMetrics[] {
    return [...this.metrics];
  }
  
  getStats() {
    const total = this.metrics.length;
    const successful = this.metrics.filter(m => m.success).length;
    const failed = total - successful;
    const avgDuration = total > 0 
      ? this.metrics.reduce((sum, m) => sum + m.duration, 0) / total 
      : 0;
    
    return {
      total,
      successful,
      failed,
      successRate: total > 0 ? (successful / total) * 100 : 0,
      avgDuration,
      recentErrors: this.metrics
        .filter(m => !m.success)
        .slice(-10)
        .map(m => ({ url: m.url, error: m.error, timestamp: m.timestamp })),
    };
  }
  
  clear(): void {
    this.metrics = [];
  }
}

export const apiMonitor = new ApiMonitor();

// =============================================================================
// UTILITIES
// =============================================================================

export const delay = (ms: number): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, ms));

export const calculateRetryDelay = (attempt: number): number => {
  if (API_CONFIG.retry.backoff === 'exponential') {
    return API_CONFIG.retry.delay * Math.pow(2, attempt - 1);
  }
  return API_CONFIG.retry.delay;
};

export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export const getFileExtension = (filename: string): string => {
  return filename.split('.').pop()?.toLowerCase() || '';
};

export const formatFileSize = (bytes: number): string => {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`;
};

// =============================================================================
// EXPORTS
// =============================================================================

export default API_CONFIG; 