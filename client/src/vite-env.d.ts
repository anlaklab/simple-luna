/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly DEV: boolean
  readonly PROD: boolean
  readonly MODE: string
  readonly BASE_URL: string
  // Add more env variables as needed
  readonly VITE_API_BASE_URL?: string
  readonly VITE_APP_VERSION?: string
  readonly VITE_APP_HOMEPAGE?: string
  readonly VITE_API_TIMEOUT?: string
  readonly VITE_API_RETRY_ATTEMPTS?: string
  readonly VITE_API_RETRY_DELAY?: string
  readonly VITE_MAX_FILE_SIZE?: string
  readonly VITE_UPLOAD_CHUNK_SIZE?: string
  readonly VITE_DEFAULT_THEME?: string
  readonly VITE_ENABLE_SYSTEM_THEME?: string
  readonly VITE_ENABLE_ANALYTICS?: string
  readonly VITE_ENABLE_SW?: string
  readonly VITE_PRELOAD_ROUTES?: string
  readonly VITE_ENABLE_STORAGE_COMPRESSION?: string
  readonly VITE_ENABLE_LOGS?: string
  readonly VITE_VERBOSE_LOGS?: string
  readonly VITE_SHOW_METRICS?: string
  readonly VITE_ANALYTICS_ID?: string
  readonly VITE_SENTRY_DSN?: string
  readonly VITE_FEATURE_THEME_SWITCHER?: string
  readonly VITE_FEATURE_OFFLINE_MODE?: string
  readonly VITE_FEATURE_REALTIME?: string
  readonly VITE_FEATURE_COMMAND_PALETTE?: string
  readonly VITE_FEATURE_ADVANCED_SEARCH?: string
  readonly VITE_FEATURE_BULK_OPERATIONS?: string
  readonly VITE_FEATURE_DRAG_DROP?: string
  readonly VITE_FEATURE_AI_ANALYSIS?: string
  readonly VITE_FEATURE_ADVANCED_ANALYTICS?: string
  readonly VITE_FEATURE_EXPORT_OPTIONS?: string
  readonly VITE_FEATURE_VERSION_CONTROL?: string
  readonly VITE_FEATURE_SHARING?: string
  readonly VITE_FEATURE_COMMENTS?: string
  readonly VITE_FEATURE_TEAM_WORKSPACES?: string
  readonly VITE_ENABLE_MOCK_DATA?: string
  readonly VITE_ENABLE_BETA_FEATURES?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
} 