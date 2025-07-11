/**
 * Application Configuration
 * 
 * Centralized configuration management for the Luna frontend application.
 * Handles environment variables, feature flags, and application settings.
 */

// =============================================================================
// ENVIRONMENT DETECTION
// =============================================================================

export const getEnvironment = (): 'development' | 'production' | 'test' => {
  if (import.meta.env.MODE === 'test') return 'test';
  if (import.meta.env.MODE === 'development') return 'development';
  return 'production';
};

export const isDevelopment = () => getEnvironment() === 'development';
export const isProduction = () => getEnvironment() === 'production';
export const isTest = () => getEnvironment() === 'test';

// =============================================================================
// APPLICATION CONFIGURATION
// =============================================================================

export const APP_CONFIG = {
  // Application Info
  name: 'Luna',
  description: 'AI-powered PowerPoint processing platform',
  version: import.meta.env.VITE_APP_VERSION || '1.0.0',
  homepage: import.meta.env.VITE_APP_HOMEPAGE || 'https://luna.app',
  
  // Environment
  environment: getEnvironment(),
  
  // API Configuration
  api: {
    baseUrl: import.meta.env.VITE_API_BASE_URL || '/api/v1',
    timeout: parseInt(import.meta.env.VITE_API_TIMEOUT || '30000'),
    retryAttempts: parseInt(import.meta.env.VITE_API_RETRY_ATTEMPTS || '3'),
    retryDelay: parseInt(import.meta.env.VITE_API_RETRY_DELAY || '1000'),
  },
  
  // File Upload Configuration
  upload: {
    maxFileSize: parseInt(import.meta.env.VITE_MAX_FILE_SIZE || '524288000'), // 500MB
    allowedTypes: [
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-powerpoint',
    ],
    chunkSize: parseInt(import.meta.env.VITE_UPLOAD_CHUNK_SIZE || '10485760'), // 10MB
  },
  
  // Theme Configuration
  theme: {
    defaultTheme: (import.meta.env.VITE_DEFAULT_THEME as 'light' | 'dark' | 'system') || 'system',
    storageKey: 'luna-ui-theme',
    enableSystemTheme: import.meta.env.VITE_ENABLE_SYSTEM_THEME !== 'false',
  },
  
  // Performance Configuration
  performance: {
    enableDevTools: isDevelopment(),
    enableAnalytics: isProduction() && import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
    enableServiceWorker: isProduction() && import.meta.env.VITE_ENABLE_SW === 'true',
    preloadRoutes: import.meta.env.VITE_PRELOAD_ROUTES === 'true',
  },
  
  // Storage Configuration
  storage: {
    prefix: 'luna_',
    version: '1',
    enableCompression: import.meta.env.VITE_ENABLE_STORAGE_COMPRESSION === 'true',
  },
  
  // Debug Configuration
  debug: {
    enableLogs: isDevelopment() || import.meta.env.VITE_ENABLE_LOGS === 'true',
    enableVerboseLogs: isDevelopment() && import.meta.env.VITE_VERBOSE_LOGS === 'true',
    showPerformanceMetrics: isDevelopment() && import.meta.env.VITE_SHOW_METRICS === 'true',
  },
  
  // External Services
  services: {
    analytics: {
      enabled: isProduction() && import.meta.env.VITE_ANALYTICS_ID,
      id: import.meta.env.VITE_ANALYTICS_ID,
    },
    monitoring: {
      enabled: isProduction() && import.meta.env.VITE_SENTRY_DSN,
      dsn: import.meta.env.VITE_SENTRY_DSN,
      environment: getEnvironment(),
    },
  },
};

// =============================================================================
// FEATURE FLAGS
// =============================================================================

export const FEATURE_FLAGS = {
  // Core Features
  enableThemeSwitcher: import.meta.env.VITE_FEATURE_THEME_SWITCHER !== 'false',
  enableOfflineMode: import.meta.env.VITE_FEATURE_OFFLINE_MODE === 'true',
  enableRealTimeUpdates: import.meta.env.VITE_FEATURE_REALTIME === 'true',
  
  // UI Features
  enableCommandPalette: import.meta.env.VITE_FEATURE_COMMAND_PALETTE !== 'false',
  enableAdvancedSearch: import.meta.env.VITE_FEATURE_ADVANCED_SEARCH !== 'false',
  enableBulkOperations: import.meta.env.VITE_FEATURE_BULK_OPERATIONS !== 'false',
  enableDragAndDrop: import.meta.env.VITE_FEATURE_DRAG_DROP !== 'false',
  
  // Analysis Features
  enableAIAnalysis: import.meta.env.VITE_FEATURE_AI_ANALYSIS !== 'false',
  enableAdvancedAnalytics: import.meta.env.VITE_FEATURE_ADVANCED_ANALYTICS !== 'false',
  enableExportOptions: import.meta.env.VITE_FEATURE_EXPORT_OPTIONS !== 'false',
  enableVersionControl: import.meta.env.VITE_FEATURE_VERSION_CONTROL === 'true',
  
  // Collaboration Features
  enableSharing: import.meta.env.VITE_FEATURE_SHARING === 'true',
  enableComments: import.meta.env.VITE_FEATURE_COMMENTS === 'true',
  enableTeamWorkspaces: import.meta.env.VITE_FEATURE_TEAM_WORKSPACES === 'true',
  
  // Developer Features
  enableDevConsole: isDevelopment(),
  enableFeatureFlagEditor: isDevelopment(),
  enableMockData: isDevelopment() && import.meta.env.VITE_ENABLE_MOCK_DATA === 'true',
  enableBetaFeatures: import.meta.env.VITE_ENABLE_BETA_FEATURES === 'true',
};

// =============================================================================
// VALIDATION AND SETUP
// =============================================================================

export const validateConfig = (): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  // Validate required environment variables
  if (!APP_CONFIG.api.baseUrl) {
    errors.push('API base URL is required');
  }
  
  // Validate file upload settings
  if (APP_CONFIG.upload.maxFileSize <= 0) {
    errors.push('Max file size must be greater than 0');
  }
  
  if (APP_CONFIG.upload.chunkSize <= 0) {
    errors.push('Upload chunk size must be greater than 0');
  }
  
  // Validate API settings
  if (APP_CONFIG.api.timeout <= 0) {
    errors.push('API timeout must be greater than 0');
  }
  
  if (APP_CONFIG.api.retryAttempts < 0) {
    errors.push('Retry attempts cannot be negative');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

export const setupConfig = () => {
  const validation = validateConfig();
  
  if (!validation.isValid) {
    console.error('Configuration validation failed:', validation.errors);
    
    if (isProduction()) {
      // In production, we might want to show a user-friendly error
      throw new Error('Application configuration is invalid');
    } else {
      // In development, log warnings but continue
      console.warn('Configuration issues detected, continuing with defaults');
    }
  }
  
  // Log configuration in development
  if (isDevelopment()) {
    console.log('Luna Configuration:', {
      environment: APP_CONFIG.environment,
      version: APP_CONFIG.version,
      features: Object.entries(FEATURE_FLAGS)
        .filter(([, enabled]) => enabled)
        .map(([key]) => key),
    });
  }
  
  return APP_CONFIG;
};

// =============================================================================
// FEATURE FLAG UTILITIES
// =============================================================================

export const isFeatureEnabled = (feature: keyof typeof FEATURE_FLAGS): boolean => {
  return FEATURE_FLAGS[feature] ?? false;
};

export const getEnabledFeatures = (): string[] => {
  return Object.entries(FEATURE_FLAGS)
    .filter(([, enabled]) => enabled)
    .map(([key]) => key);
};

export const getDisabledFeatures = (): string[] => {
  return Object.entries(FEATURE_FLAGS)
    .filter(([, enabled]) => !enabled)
    .map(([key]) => key);
};

// =============================================================================
// RUNTIME CONFIG UPDATES
// =============================================================================

let runtimeConfig = { ...APP_CONFIG };
let runtimeFeatures = { ...FEATURE_FLAGS };

export const updateRuntimeConfig = <K extends keyof typeof APP_CONFIG>(
  key: K,
  value: Partial<typeof APP_CONFIG[K]>
) => {
  runtimeConfig[key] = { ...runtimeConfig[key], ...value };
};

export const updateFeatureFlag = (
  feature: keyof typeof FEATURE_FLAGS,
  enabled: boolean
) => {
  runtimeFeatures[feature] = enabled;
};

export const getRuntimeConfig = () => runtimeConfig;
export const getRuntimeFeatures = () => runtimeFeatures;

// =============================================================================
// STORAGE UTILITIES
// =============================================================================

export const storage = {
  set: (key: string, value: any) => {
    try {
      const prefixedKey = `${APP_CONFIG.storage.prefix}${key}`;
      const serialized = JSON.stringify({
        value,
        timestamp: Date.now(),
        version: APP_CONFIG.storage.version,
      });
      localStorage.setItem(prefixedKey, serialized);
    } catch (error) {
      console.warn('Failed to save to localStorage:', error);
    }
  },
  
  get: <T = any>(key: string, defaultValue?: T): T | null => {
    try {
      const prefixedKey = `${APP_CONFIG.storage.prefix}${key}`;
      const item = localStorage.getItem(prefixedKey);
      
      if (!item) return defaultValue ?? null;
      
      const parsed = JSON.parse(item);
      
      // Check version compatibility
      if (parsed.version !== APP_CONFIG.storage.version) {
        storage.remove(key);
        return defaultValue ?? null;
      }
      
      return parsed.value;
    } catch (error) {
      console.warn('Failed to read from localStorage:', error);
      return defaultValue ?? null;
    }
  },
  
  remove: (key: string) => {
    try {
      const prefixedKey = `${APP_CONFIG.storage.prefix}${key}`;
      localStorage.removeItem(prefixedKey);
    } catch (error) {
      console.warn('Failed to remove from localStorage:', error);
    }
  },
  
  clear: () => {
    try {
      const keys = Object.keys(localStorage).filter(key => 
        key.startsWith(APP_CONFIG.storage.prefix)
      );
      keys.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.warn('Failed to clear localStorage:', error);
    }
  },
};

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  ...APP_CONFIG,
  features: FEATURE_FLAGS,
  isDevelopment,
  isProduction,
  isTest,
  isFeatureEnabled,
  validateConfig,
  setupConfig,
  storage,
}; 