import { z } from "zod";
/**
 * Upload Tier Service
 * 
 * Comprehensive service for managing premium tier upload limits and feature access
 */

import {
  TierLevel,
  TierConfiguration,
  UserTierInfo,
  TierUsageValidation,
  FileUploadValidation,
  TierUpgradeQuote,
  TierAnalytics,
  TierNotification,
  TierMigration,
  TierPromotion,
  TierComparisonMatrix,
  TierAdminOverride
} from '../types/upload-tier.types';
import { FirebaseAdapter } from '../adapters/firebase.adapter';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export class UploadTierService {
  private firebase: FirebaseAdapter;
  private readonly tierConfigurations: Map<TierLevel, TierConfiguration>;
  private readonly userTierCollectionName = 'user_tiers';
  private readonly analyticsCollectionName = 'tier_analytics';
  private readonly notificationsCollectionName = 'tier_notifications';

  constructor(firebase: FirebaseAdapter) {
    this.firebase = firebase;
    this.tierConfigurations = new Map();
    this.initializeTierConfigurations();
    logger.info('UploadTierService initialized');
  }

  // =============================================================================
  // TIER CONFIGURATION
  // =============================================================================

  /**
   * Initialize default tier configurations
   */
  private initializeTierConfigurations(): void {
    const tiers: TierConfiguration[] = [
      {
        id: 'basic',
        name: 'Basic',
        description: 'Perfect for personal use and small projects',
        price: { monthly: 0, yearly: 0, currency: 'USD' },
        limits: {
          maxFileSize: 10 * 1024 * 1024, // 10MB
          maxFilesPerUpload: 1,
          maxConcurrentUploads: 1,
          maxTotalStoragePerUser: 100 * 1024 * 1024, // 100MB
          maxPresentationsPerUser: 10,
          maxSessionsPerUser: 5,
          dailyUploadLimit: 5,
          monthlyUploadLimit: 50,
          allowedFileTypes: ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
          maxThumbnailResolution: { width: 300, height: 225 },
          maxSlidesPerPresentation: 50,
          retentionPeriod: 30,
        },
        features: {
          pptxToJsonConversion: true,
          jsonToPptxConversion: false,
          thumbnailGeneration: true,
          assetExtraction: false,
          aiAnalysis: false,
          aiTranslation: false,
          aiSuggestions: false,
          aiChatSupport: false,
          customAiModels: false,
          batchOperations: false,
          advancedThumbnails: false,
          customFormats: false,
          apiAccess: false,
          webhookSupport: false,
          customBranding: false,
          sessionSharing: false,
          teamManagement: false,
          userPermissions: false,
          auditLogs: false,
          exportToPdf: false,
          exportToHtml: false,
          exportToImages: false,
          exportToVideo: false,
          customExportTemplates: false,
          extendedRetention: false,
          backupAndRestore: false,
          versionHistory: false,
          cloudStorage: true,
          prioritySupport: false,
          phoneSupport: false,
          dedicatedAccount: false,
          onboardingSupport: false,
          customIntegration: false,
        },
      },
      {
        id: 'pro',
        name: 'Pro',
        description: 'Advanced features for professionals and growing teams',
        price: { monthly: 19, yearly: 190, currency: 'USD' },
        limits: {
          maxFileSize: 50 * 1024 * 1024, // 50MB
          maxFilesPerUpload: 5,
          maxConcurrentUploads: 3,
          maxTotalStoragePerUser: 1024 * 1024 * 1024, // 1GB
          maxPresentationsPerUser: 100,
          maxSessionsPerUser: 50,
          dailyUploadLimit: 25,
          monthlyUploadLimit: 500,
          allowedFileTypes: [
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'application/vnd.ms-powerpoint',
            'application/pdf'
          ],
          maxThumbnailResolution: { width: 800, height: 600 },
          maxSlidesPerPresentation: 200,
          retentionPeriod: 90,
        },
        features: {
          pptxToJsonConversion: true,
          jsonToPptxConversion: true,
          thumbnailGeneration: true,
          assetExtraction: true,
          aiAnalysis: true,
          aiTranslation: true,
          aiSuggestions: true,
          aiChatSupport: true,
          customAiModels: false,
          batchOperations: true,
          advancedThumbnails: true,
          customFormats: true,
          apiAccess: true,
          webhookSupport: false,
          customBranding: false,
          sessionSharing: true,
          teamManagement: false,
          userPermissions: false,
          auditLogs: false,
          exportToPdf: true,
          exportToHtml: true,
          exportToImages: true,
          exportToVideo: false,
          customExportTemplates: false,
          extendedRetention: true,
          backupAndRestore: true,
          versionHistory: true,
          cloudStorage: true,
          prioritySupport: true,
          phoneSupport: false,
          dedicatedAccount: false,
          onboardingSupport: true,
          customIntegration: false,
        },
        popular: true,
        color: '#4F46E5',
      },
      {
        id: 'premium',
        name: 'Premium',
        description: 'Full-featured solution for teams and organizations',
        price: { monthly: 49, yearly: 490, currency: 'USD' },
        limits: {
          maxFileSize: 500 * 1024 * 1024, // 500MB
          maxFilesPerUpload: 20,
          maxConcurrentUploads: 10,
          maxTotalStoragePerUser: 10 * 1024 * 1024 * 1024, // 10GB
          maxPresentationsPerUser: 1000,
          maxSessionsPerUser: 500,
          dailyUploadLimit: 100,
          monthlyUploadLimit: 2000,
          allowedFileTypes: [
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'application/vnd.ms-powerpoint',
            'application/pdf',
            'application/vnd.oasis.opendocument.presentation',
            'image/png',
            'image/jpeg',
            'text/plain'
          ],
          maxThumbnailResolution: { width: 1920, height: 1080 },
          maxSlidesPerPresentation: 1000,
          retentionPeriod: 365,
        },
        features: {
          pptxToJsonConversion: true,
          jsonToPptxConversion: true,
          thumbnailGeneration: true,
          assetExtraction: true,
          aiAnalysis: true,
          aiTranslation: true,
          aiSuggestions: true,
          aiChatSupport: true,
          customAiModels: true,
          batchOperations: true,
          advancedThumbnails: true,
          customFormats: true,
          apiAccess: true,
          webhookSupport: true,
          customBranding: true,
          sessionSharing: true,
          teamManagement: true,
          userPermissions: true,
          auditLogs: true,
          exportToPdf: true,
          exportToHtml: true,
          exportToImages: true,
          exportToVideo: true,
          customExportTemplates: true,
          extendedRetention: true,
          backupAndRestore: true,
          versionHistory: true,
          cloudStorage: true,
          prioritySupport: true,
          phoneSupport: true,
          dedicatedAccount: false,
          onboardingSupport: true,
          customIntegration: true,
        },
        recommended: true,
        color: '#059669',
      },
      {
        id: 'enterprise',
        name: 'Enterprise',
        description: 'Unlimited power for large organizations with custom needs',
        price: { monthly: 199, yearly: 1990, currency: 'USD' },
        limits: {
          maxFileSize: 2 * 1024 * 1024 * 1024, // 2GB
          maxFilesPerUpload: 100,
          maxConcurrentUploads: 50,
          maxTotalStoragePerUser: 100 * 1024 * 1024 * 1024, // 100GB
          maxPresentationsPerUser: 10000,
          maxSessionsPerUser: 5000,
          dailyUploadLimit: 1000,
          monthlyUploadLimit: 20000,
          allowedFileTypes: ['*'], // All file types
          maxThumbnailResolution: { width: 4096, height: 4096 },
          maxSlidesPerPresentation: 10000,
          retentionPeriod: 2555, // 7 years
        },
        features: {
          pptxToJsonConversion: true,
          jsonToPptxConversion: true,
          thumbnailGeneration: true,
          assetExtraction: true,
          aiAnalysis: true,
          aiTranslation: true,
          aiSuggestions: true,
          aiChatSupport: true,
          customAiModels: true,
          batchOperations: true,
          advancedThumbnails: true,
          customFormats: true,
          apiAccess: true,
          webhookSupport: true,
          customBranding: true,
          sessionSharing: true,
          teamManagement: true,
          userPermissions: true,
          auditLogs: true,
          exportToPdf: true,
          exportToHtml: true,
          exportToImages: true,
          exportToVideo: true,
          customExportTemplates: true,
          extendedRetention: true,
          backupAndRestore: true,
          versionHistory: true,
          cloudStorage: true,
          prioritySupport: true,
          phoneSupport: true,
          dedicatedAccount: true,
          onboardingSupport: true,
          customIntegration: true,
        },
        color: '#DC2626',
      },
    ];

    tiers.forEach(tier => {
      this.tierConfigurations.set(tier.id, tier);
    });
  }

  /**
   * Get tier configuration
   */
  getTierConfiguration(tier: TierLevel): TierConfiguration | null {
    return this.tierConfigurations.get(tier) || null;
  }

  /**
   * Get all tier configurations
   */
  getAllTierConfigurations(): TierConfiguration[] {
    return Array.from(this.tierConfigurations.values());
  }

  // =============================================================================
  // USER TIER MANAGEMENT
  // =============================================================================

  /**
   * Get user tier information
   */
  async getUserTierInfo(userId: string): Promise<UserTierInfo | null> {
    try {
      const tierInfo = await this.firebase.getDocument<UserTierInfo>(
        this.userTierCollectionName,
        userId
      );

      if (!tierInfo) {
        // Create default tier info for new users
        return await this.createDefaultUserTierInfo(userId);
      }

      return tierInfo;
    } catch (error) {
      logger.error('Failed to get user tier info', { error, userId });
      throw error;
    }
  }

  /**
   * Create default tier info for new user
   */
  private async createDefaultUserTierInfo(userId: string): Promise<UserTierInfo> {
    const now = new Date();
    const trialEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 days trial

    const tierInfo: UserTierInfo = {
      userId,
      currentTier: 'basic',
      subscriptionStatus: 'trial',
      subscriptionStart: now,
      trialEnd,
      autoRenew: false,
      usage: {
        storageUsed: 0,
        uploadsThisMonth: 0,
        uploadsToday: 0,
        presentationsCount: 0,
        sessionsCount: 0,
      },
    };

    await this.firebase.createDocument(this.userTierCollectionName, userId, tierInfo);
    logger.info('Created default tier info for user', { userId });
    return tierInfo;
  }

  /**
   * Update user tier
   */
  async updateUserTier(
    userId: string,
    newTier: TierLevel,
    subscriptionData?: Partial<UserTierInfo>
  ): Promise<UserTierInfo | null> {
    try {
      const currentTierInfo = await this.getUserTierInfo(userId);
      if (!currentTierInfo) {
        throw new Error('User tier info not found');
      }

      const updates: Partial<UserTierInfo> = {
        currentTier: newTier,
        ...subscriptionData,
      };

      await this.firebase.updateDocument(this.userTierCollectionName, userId, updates);

      const updatedTierInfo = await this.getUserTierInfo(userId);
      logger.info('Updated user tier', { userId, newTier, oldTier: currentTierInfo.currentTier });
      
      return updatedTierInfo;
    } catch (error) {
      logger.error('Failed to update user tier', { error, userId, newTier });
      throw error;
    }
  }

  // =============================================================================
  // VALIDATION METHODS
  // =============================================================================

  /**
   * Validate file upload against tier limits
   */
  async validateFileUpload(
    userId: string,
    fileSize: number,
    fileName: string,
    fileType: string
  ): Promise<FileUploadValidation> {
    try {
      const tierInfo = await this.getUserTierInfo(userId);
      if (!tierInfo) {
        throw new Error('User tier info not found');
      }

      const tierConfig = this.getTierConfiguration(tierInfo.currentTier);
      if (!tierConfig) {
        throw new Error('Tier configuration not found');
      }

      const limits = { ...tierConfig.limits, ...tierInfo.customLimits };

      // Check various limits
      const exceedsFileSize = fileSize > limits.maxFileSize;
      const exceedsStorageLimit = async (tierInfo.usage.storageUsed + fileSize) > limits.maxTotalStoragePerUser;
      const exceedsDailyLimit = tierInfo.usage.uploadsToday >= limits.dailyUploadLimit;
      const exceedsMonthlyLimit = tierInfo.usage.uploadsThisMonth >= limits.monthlyUploadLimit;
      
      const unsupportedFileType = !limits.allowedFileTypes.includes('*') && 
        !limits.allowedFileTypes.includes(fileType);

      const isValid = !exceedsFileSize && !exceedsStorageLimit && !exceedsDailyLimit && 
        !exceedsMonthlyLimit && !unsupportedFileType;

      const reasons: string[] = [];
      const suggestions: string[] = [];

      if (exceedsFileSize) {
        reasons.push(`File size ${this.formatBytes(fileSize)} exceeds limit of ${this.formatBytes(limits.maxFileSize)}`);
        suggestions.push('Try compressing your file or upgrade to a higher tier');
      }

      if (exceedsStorageLimit) {
        reasons.push(`Would exceed storage limit of ${this.formatBytes(limits.maxTotalStoragePerUser)}`);
        suggestions.push('Delete some existing files or upgrade to a higher tier');
      }

      if (exceedsDailyLimit) {
        reasons.push(`Daily upload limit of ${limits.dailyUploadLimit} exceeded`);
        suggestions.push('Wait until tomorrow or upgrade to a higher tier');
      }

      if (exceedsMonthlyLimit) {
        reasons.push(`Monthly upload limit of ${limits.monthlyUploadLimit} exceeded`);
        suggestions.push('Wait until next month or upgrade to a higher tier');
      }

      if (unsupportedFileType) {
        reasons.push(`File type ${fileType} is not supported in ${tierInfo.currentTier} tier`);
        suggestions.push('Convert to a supported format or upgrade to a higher tier');
      }

      let upgradeRecommendation: TierLevel | undefined;
      if (!isValid) {
        upgradeRecommendation = this.getRecommendedUpgradeTier(tierInfo.currentTier, {
          fileSize,
          fileType,
          dailyUploads: tierInfo.usage.uploadsToday,
          monthlyUploads: tierInfo.usage.uploadsThisMonth,
          storageUsed: tierInfo.usage.storageUsed,
        });
      }

      return {
        isValid,
        tier: tierInfo.currentTier,
        fileSize,
        fileName,
        fileType,
        exceedsFileSize,
        exceedsStorageLimit,
        exceedsDailyLimit,
        exceedsMonthlyLimit,
        unsupportedFileType,
        reasons,
        suggestions,
        upgradeRecommendation,
      };
    } catch (error) {
      logger.error('Failed to validate file upload', { error, userId, fileSize, fileName });
      throw error;
    }
  }

  /**
   * Validate feature access
   */
  async validateFeatureAccess(userId: string, feature: keyof TierConfiguration['features']): Promise<TierUsageValidation> {
    try {
      const tierInfo = await this.getUserTierInfo(userId);
      if (!tierInfo) {
        throw new Error('User tier info not found');
      }

      const tierConfig = this.getTierConfiguration(tierInfo.currentTier);
      if (!tierConfig) {
        throw new Error('Tier configuration not found');
      }

      const features = { ...tierConfig.features, ...tierInfo.customFeatures };
      const hasAccess = features[feature] === true;

      const result: TierUsageValidation = {
        isValid: hasAccess,
        tier: tierInfo.currentTier,
      };

      if (!hasAccess) {
        result.reasons = [`Feature '${feature}' is not available in ${tierInfo.currentTier} tier`];
        result.suggestions = ['Upgrade to a higher tier to access this feature'];
        result.upgradeRecommendation = this.getRecommendedUpgradeTierForFeature(tierInfo.currentTier, feature);
      }

      return result;
    } catch (error) {
      logger.error('Failed to validate feature access', { error, userId, feature });
      throw error;
    }
  }

  // =============================================================================
  // USAGE TRACKING
  // =============================================================================

  /**
   * Track file upload
   */
  async trackFileUpload(userId: string, fileSize: number): Promise<void> {
    try {
      const tierInfo = await this.getUserTierInfo(userId);
      if (!tierInfo) {
        throw new Error('User tier info not found');
      }

      const now = new Date();
      const today = now.toDateString();
      const lastUploadDate = tierInfo.usage.lastUpload?.toDateString();

      const updates: Partial<UserTierInfo> = {
        usage: {
          ...tierInfo.usage,
          storageUsed: tierInfo.usage.storageUsed + fileSize,
          uploadsThisMonth: tierInfo.usage.uploadsThisMonth + 1,
          uploadsToday: lastUploadDate === today ? tierInfo.usage.uploadsToday + 1 : 1,
          lastUpload: now,
          lastActivity: now,
        },
      };

      await this.firebase.updateDocument(this.userTierCollectionName, userId, updates);
      logger.debug('Tracked file upload', { userId, fileSize });
    } catch (error) {
      logger.error('Failed to track file upload', { error, userId, fileSize });
      throw error;
    }
  }

  /**
   * Track presentation creation
   */
  async trackPresentationCreation(userId: string): Promise<void> {
    try {
      const tierInfo = await this.getUserTierInfo(userId);
      if (!tierInfo) {
        throw new Error('User tier info not found');
      }

      const updates: Partial<UserTierInfo> = {
        usage: {
          ...tierInfo.usage,
          presentationsCount: tierInfo.usage.presentationsCount + 1,
          lastActivity: new Date(),
        },
      };

      await this.firebase.updateDocument(this.userTierCollectionName, userId, updates);
      logger.debug('Tracked presentation creation', { userId });
    } catch (error) {
      logger.error('Failed to track presentation creation', { error, userId });
      throw error;
    }
  }

  /**
   * Track session creation
   */
  async trackSessionCreation(userId: string): Promise<void> {
    try {
      const tierInfo = await this.getUserTierInfo(userId);
      if (!tierInfo) {
        throw new Error('User tier info not found');
      }

      const updates: Partial<UserTierInfo> = {
        usage: {
          ...tierInfo.usage,
          sessionsCount: tierInfo.usage.sessionsCount + 1,
          lastActivity: new Date(),
        },
      };

      await this.firebase.updateDocument(this.userTierCollectionName, userId, updates);
      logger.debug('Tracked session creation', { userId });
    } catch (error) {
      logger.error('Failed to track session creation', { error, userId });
      throw error;
    }
  }

  // =============================================================================
  // TIER COMPARISON AND RECOMMENDATIONS
  // =============================================================================

  /**
   * Get tier comparison matrix
   */
  getTierComparisonMatrix(): TierComparisonMatrix {
    const tiers: TierLevel[] = ['basic', 'pro', 'premium', 'enterprise'];
    
    return {
      tiers,
      categories: [
        {
          name: 'File Limits',
          items: [
            {
              feature: 'Max File Size',
              type: 'limit',
              unit: 'MB',
              values: {
                basic: this.formatBytes(this.tierConfigurations.get('basic')!.limits.maxFileSize),
                pro: this.formatBytes(this.tierConfigurations.get('pro')!.limits.maxFileSize),
                premium: this.formatBytes(this.tierConfigurations.get('premium')!.limits.maxFileSize),
                enterprise: this.formatBytes(this.tierConfigurations.get('enterprise')!.limits.maxFileSize),
              },
            },
            {
              feature: 'Storage Limit',
              type: 'limit',
              unit: 'GB',
              values: {
                basic: this.formatBytes(this.tierConfigurations.get('basic')!.limits.maxTotalStoragePerUser),
                pro: this.formatBytes(this.tierConfigurations.get('pro')!.limits.maxTotalStoragePerUser),
                premium: this.formatBytes(this.tierConfigurations.get('premium')!.limits.maxTotalStoragePerUser),
                enterprise: this.formatBytes(this.tierConfigurations.get('enterprise')!.limits.maxTotalStoragePerUser),
              },
            },
          ],
        },
        {
          name: 'AI Features',
          items: [
            {
              feature: 'AI Analysis',
              type: 'boolean',
              values: {
                basic: this.tierConfigurations.get('basic')!.features.aiAnalysis,
                pro: this.tierConfigurations.get('pro')!.features.aiAnalysis,
                premium: this.tierConfigurations.get('premium')!.features.aiAnalysis,
                enterprise: this.tierConfigurations.get('enterprise')!.features.aiAnalysis,
              },
            },
            {
              feature: 'AI Translation',
              type: 'boolean',
              values: {
                basic: this.tierConfigurations.get('basic')!.features.aiTranslation,
                pro: this.tierConfigurations.get('pro')!.features.aiTranslation,
                premium: this.tierConfigurations.get('premium')!.features.aiTranslation,
                enterprise: this.tierConfigurations.get('enterprise')!.features.aiTranslation,
              },
            },
          ],
        },
      ],
    };
  }

  /**
   * Get recommended upgrade tier based on usage patterns
   */
  private getRecommendedUpgradeTier(
    currentTier: TierLevel,
    usage: {
      fileSize?: number;
      fileType?: string;
      dailyUploads?: number;
      monthlyUploads?: number;
      storageUsed?: number;
    }
  ): TierLevel | undefined {
    const tiers: TierLevel[] = ['basic', 'pro', 'premium', 'enterprise'];
    const currentIndex = tiers.indexOf(currentTier);

    for (let i = currentIndex + 1; i < tiers.length; i++) {
      const tier = tiers[i];
      const config = this.getTierConfiguration(tier);
      if (!config) continue;

      // Check if this tier would accommodate the usage
      const wouldFit = 
        (!usage.fileSize || usage.fileSize <= config.limits.maxFileSize) &&
        (!usage.storageUsed || usage.storageUsed <= config.limits.maxTotalStoragePerUser) &&
        (!usage.dailyUploads || usage.dailyUploads <= config.limits.dailyUploadLimit) &&
        (!usage.monthlyUploads || usage.monthlyUploads <= config.limits.monthlyUploadLimit) &&
        (!usage.fileType || config.limits.allowedFileTypes.includes('*') || 
         config.limits.allowedFileTypes.includes(usage.fileType));

      if (wouldFit) {
        return tier;
      }
    }

    return 'enterprise';
  }

  /**
   * Get recommended upgrade tier for specific feature
   */
  private getRecommendedUpgradeTierForFeature(
    currentTier: TierLevel,
    feature: keyof TierConfiguration['features']
  ): TierLevel | undefined {
    const tiers: TierLevel[] = ['basic', 'pro', 'premium', 'enterprise'];
    const currentIndex = tiers.indexOf(currentTier);

    for (let i = currentIndex + 1; i < tiers.length; i++) {
      const tier = tiers[i];
      const config = this.getTierConfiguration(tier);
      if (!config) continue;

      if (config.features[feature]) {
        return tier;
      }
    }

    return undefined;
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  /**
   * Format bytes to human readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Generate tier upgrade quote
   */
  async generateUpgradeQuote(userId: string, targetTier: TierLevel): Promise<TierUpgradeQuote | null> {
    try {
      const tierInfo = await this.getUserTierInfo(userId);
      if (!tierInfo) {
        throw new Error('User tier info not found');
      }

      const targetConfig = this.getTierConfiguration(targetTier);
      if (!targetConfig) {
        throw new Error('Target tier configuration not found');
      }

      // Calculate pricing with potential discounts
      const pricing = {
        monthlyPrice: targetConfig.price.monthly,
        yearlyPrice: targetConfig.price.yearly,
        currency: targetConfig.price.currency,
        discount: {
          percentage: targetConfig.price.yearly > 0 ? 
            Math.round(((targetConfig.price.monthly * 12 - targetConfig.price.yearly) / (targetConfig.price.monthly * 12)) * 100) : 0,
          amount: targetConfig.price.monthly * 12 - targetConfig.price.yearly,
          description: 'Annual billing discount',
        },
      };

      return {
        currentTier: tierInfo.currentTier,
        targetTier,
        pricing,
        benefits: this.getTierUpgradeBenefits(tierInfo.currentTier, targetTier),
        immediateAccess: this.getImmediateAccessFeatures(targetTier),
        upgradeUrl: `/upgrade?from=${tierInfo.currentTier}&to=${targetTier}`,
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      };
    } catch (error) {
      logger.error('Failed to generate upgrade quote', { error, userId, targetTier });
      throw error;
    }
  }

  /**
   * Get tier upgrade benefits
   */
  private getTierUpgradeBenefits(fromTier: TierLevel, toTier: TierLevel): string[] {
    const fromConfig = this.getTierConfiguration(fromTier);
    const toConfig = this.getTierConfiguration(toTier);
    
    if (!fromConfig || !toConfig) return [];

    const benefits: string[] = [];

    // Compare limits
    if (toConfig.limits.maxFileSize > fromConfig.limits.maxFileSize) {
      benefits.push(`Increase file size limit to ${this.formatBytes(toConfig.limits.maxFileSize)}`);
    }

    if (toConfig.limits.maxTotalStoragePerUser > fromConfig.limits.maxTotalStoragePerUser) {
      benefits.push(`Increase storage to ${this.formatBytes(toConfig.limits.maxTotalStoragePerUser)}`);
    }

    // Compare features
    const featureNames: Record<keyof TierConfiguration['features'], string> = {
      aiAnalysis: 'AI-powered analysis',
      aiTranslation: 'AI translation',
      batchOperations: 'Batch operations',
      exportToPdf: 'PDF export',
      prioritySupport: 'Priority support',
      customBranding: 'Custom branding',
      teamManagement: 'Team management',
      apiAccess: 'API access',
      webhookSupport: 'Webhook support',
      // ... add more feature names as needed
    } as any;

    Object.keys(toConfig.features).forEach(feature => {
      const featureKey = feature as keyof TierConfiguration['features'];
      if (toConfig.features[featureKey] && !fromConfig.features[featureKey]) {
        benefits.push(`Access to ${featureNames[featureKey] || feature}`);
      }
    });

    return benefits;
  }

  /**
   * Get immediate access features
   */
  private getImmediateAccessFeatures(tier: TierLevel): string[] {
    const config = this.getTierConfiguration(tier);
    if (!config) return [];

    const features: string[] = [];

    if (config.features.aiAnalysis) features.push('AI Analysis');
    if (config.features.batchOperations) features.push('Batch Operations');
    if (config.features.exportToPdf) features.push('PDF Export');
    if (config.features.prioritySupport) features.push('Priority Support');

    return features;
  }
}