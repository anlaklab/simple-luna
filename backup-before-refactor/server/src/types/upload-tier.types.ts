/**
 * Upload Tier System Types
 * 
 * Type definitions for the premium tier upload system with file size limits and feature access
 */

export type TierLevel = 'basic' | 'pro' | 'premium' | 'enterprise';

export interface TierLimits {
  maxFileSize: number; // bytes
  maxFilesPerUpload: number;
  maxConcurrentUploads: number;
  maxTotalStoragePerUser: number; // bytes
  maxPresentationsPerUser: number;
  maxSessionsPerUser: number;
  dailyUploadLimit: number; // number of uploads per day
  monthlyUploadLimit: number; // number of uploads per month
  allowedFileTypes: string[];
  maxThumbnailResolution: { width: number; height: number };
  maxSlidesPerPresentation: number;
  retentionPeriod: number; // days
}

export interface TierFeatures {
  // Core Features
  pptxToJsonConversion: boolean;
  jsonToPptxConversion: boolean;
  thumbnailGeneration: boolean;
  assetExtraction: boolean;
  
  // AI Features
  aiAnalysis: boolean;
  aiTranslation: boolean;
  aiSuggestions: boolean;
  aiChatSupport: boolean;
  customAiModels: boolean;
  
  // Advanced Features
  batchOperations: boolean;
  advancedThumbnails: boolean;
  customFormats: boolean;
  apiAccess: boolean;
  webhookSupport: boolean;
  customBranding: boolean;
  
  // Collaboration Features
  sessionSharing: boolean;
  teamManagement: boolean;
  userPermissions: boolean;
  auditLogs: boolean;
  
  // Export Features
  exportToPdf: boolean;
  exportToHtml: boolean;
  exportToImages: boolean;
  exportToVideo: boolean;
  customExportTemplates: boolean;
  
  // Storage Features
  extendedRetention: boolean;
  backupAndRestore: boolean;
  versionHistory: boolean;
  cloudStorage: boolean;
  
  // Support Features
  prioritySupport: boolean;
  phoneSupport: boolean;
  dedicatedAccount: boolean;
  onboardingSupport: boolean;
  customIntegration: boolean;
}

export interface TierConfiguration {
  id: TierLevel;
  name: string;
  description: string;
  price: {
    monthly: number;
    yearly: number;
    currency: string;
  };
  limits: TierLimits;
  features: TierFeatures;
  popular?: boolean;
  recommended?: boolean;
  color?: string;
  icon?: string;
}

export interface UserTierInfo {
  userId: string;
  currentTier: TierLevel;
  subscriptionId?: string;
  subscriptionStatus: 'active' | 'inactive' | 'cancelled' | 'expired' | 'trial';
  subscriptionStart: Date;
  subscriptionEnd?: Date;
  trialEnd?: Date;
  autoRenew: boolean;
  paymentMethod?: string;
  
  // Usage tracking
  usage: {
    storageUsed: number; // bytes
    uploadsThisMonth: number;
    uploadsToday: number;
    presentationsCount: number;
    sessionsCount: number;
    lastUpload?: Date;
    lastActivity?: Date;
  };
  
  // Feature overrides (for custom plans)
  customLimits?: Partial<TierLimits>;
  customFeatures?: Partial<TierFeatures>;
  
  // Billing info
  billingInfo?: {
    email: string;
    name: string;
    company?: string;
    address?: {
      street: string;
      city: string;
      state: string;
      zipCode: string;
      country: string;
    };
    taxId?: string;
  };
}

export interface TierUsageValidation {
  isValid: boolean;
  tier: TierLevel;
  reasons?: string[];
  suggestions?: string[];
  upgradeRecommendation?: TierLevel;
}

export interface FileUploadValidation extends TierUsageValidation {
  fileSize: number;
  fileName: string;
  fileType: string;
  exceedsFileSize: boolean;
  exceedsStorageLimit: boolean;
  exceedsDailyLimit: boolean;
  exceedsMonthlyLimit: boolean;
  unsupportedFileType: boolean;
}

export interface TierUpgradeQuote {
  currentTier: TierLevel;
  targetTier: TierLevel;
  pricing: {
    monthlyPrice: number;
    yearlyPrice: number;
    currency: string;
    discount?: {
      percentage: number;
      amount: number;
      description: string;
    };
  };
  benefits: string[];
  immediateAccess: string[];
  upgradeUrl: string;
  validUntil: Date;
}

export interface TierAnalytics {
  userId: string;
  tier: TierLevel;
  period: {
    start: Date;
    end: Date;
  };
  usage: {
    totalUploads: number;
    totalStorageUsed: number;
    totalPresentations: number;
    totalSessions: number;
    averageFileSize: number;
    averageProcessingTime: number;
    peakUsage: {
      date: Date;
      uploads: number;
      storageUsed: number;
    };
  };
  features: {
    [feature: string]: {
      used: boolean;
      usage_count: number;
      last_used: Date;
    };
  };
  limits: {
    [limit: string]: {
      used: number;
      limit: number;
      percentage: number;
      exceeded: boolean;
    };
  };
  recommendations: {
    type: 'upgrade' | 'downgrade' | 'optimize' | 'warning';
    title: string;
    description: string;
    action?: string;
    urgency: 'low' | 'medium' | 'high' | 'critical';
  }[];
}

export interface TierNotification {
  id: string;
  userId: string;
  type: 'limit_warning' | 'limit_exceeded' | 'tier_upgrade' | 'subscription_expiry' | 'payment_issue';
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'success';
  actionRequired: boolean;
  actionText?: string;
  actionUrl?: string;
  dismissed: boolean;
  createdAt: Date;
  expiresAt?: Date;
  metadata?: Record<string, any>;
}

export interface TierMigration {
  id: string;
  userId: string;
  fromTier: TierLevel;
  toTier: TierLevel;
  reason: 'upgrade' | 'downgrade' | 'cancellation' | 'admin_change';
  scheduledDate: Date;
  completedDate?: Date;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  
  // Data handling during migration
  dataHandling: {
    preserveAllData: boolean;
    deleteExcessData: boolean;
    archiveExcessData: boolean;
    notifyUser: boolean;
  };
  
  // Migration results
  results?: {
    dataPreserved: number; // bytes
    dataArchived: number; // bytes
    dataDeleted: number; // bytes
    presentationsAffected: number;
    sessionsAffected: number;
    errors: string[];
  };
  
  metadata?: Record<string, any>;
}

export interface TierPromotion {
  id: string;
  name: string;
  description: string;
  type: 'percentage_discount' | 'fixed_discount' | 'extended_trial' | 'feature_unlock' | 'free_upgrade';
  value: number; // percentage or amount depending on type
  targetTiers: TierLevel[];
  eligibleTiers: TierLevel[];
  
  validity: {
    start: Date;
    end: Date;
    maxUses?: number;
    usesRemaining?: number;
    perUserLimit?: number;
  };
  
  conditions?: {
    newUsersOnly?: boolean;
    existingUsersOnly?: boolean;
    minSubscriptionLength?: number; // months
    requiresPaymentMethod?: boolean;
    geoRestrictions?: string[];
  };
  
  benefits: {
    discountedPrice?: number;
    extendedTrial?: number; // days
    bonusFeatures?: string[];
    bonusLimits?: Partial<TierLimits>;
  };
  
  active: boolean;
  code?: string;
  metadata?: Record<string, any>;
}

export interface TierComparisonMatrix {
  tiers: TierLevel[];
  categories: {
    name: string;
    items: {
      feature: string;
      description?: string;
      values: Record<TierLevel, string | number | boolean>;
      highlight?: boolean;
      type: 'boolean' | 'number' | 'text' | 'limit';
      unit?: string;
    }[];
  }[];
}

export interface TierAdminOverride {
  userId: string;
  adminId: string;
  overrideType: 'temporary_upgrade' | 'custom_limits' | 'feature_unlock' | 'emergency_access';
  expiresAt?: Date;
  reason: string;
  appliedAt: Date;
  
  overrides: {
    tier?: TierLevel;
    limits?: Partial<TierLimits>;
    features?: Partial<TierFeatures>;
    duration?: number; // days
  };
  
  autoRevert: boolean;
  notifyUser: boolean;
  metadata?: Record<string, any>;
}