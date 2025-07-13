import { z } from "zod";
/**
 * Asset Service Refactored - Main Orchestrator
 * 
 * Main service that orchestrates all modular asset extraction components.
 * Uses real Aspose.Slides library and Firebase integration for comprehensive
 * asset extraction, storage, and metadata management.
 */

import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../../utils/logger';
import { FirebaseAdapter } from '../../firebase.adapter';
import {
  IAssetService,
  AssetResult,
  AssetType,
  AssetExtractionOptions,
  AssetServiceConfig,
  ExtractionResult,
  ExtractionContext,
  AssetExtractorRegistry
} from '../types/asset-interfaces';

// Import all modular components
import { ImageAssetExtractor } from '../extractors/assets/ImageAssetExtractor';
import { VideoAssetExtractor } from '../extractors/assets/VideoAssetExtractor';
import { AudioAssetExtractor } from '../extractors/assets/AudioAssetExtractor';
import { DocumentAssetExtractor } from '../extractors/assets/DocumentAssetExtractor';
import { AssetMetadataServiceImpl } from './AssetMetadataService';
import { AssetStorageServiceImpl } from './AssetStorageService';
import { AssetMetadataRepositoryImpl } from './AssetMetadataRepository';

// ✅ ROBUST IMPORT: Use AsposeDriverFactory for unified access
const asposeDriver = require('/app/lib/AsposeDriverFactory');

export class AssetServiceRefactored implements IAssetService {
  private config: AssetServiceConfig;
  private firebaseAdapter: FirebaseAdapter;
  private extractors: AssetExtractorRegistry;
  private metadataService: AssetMetadataServiceImpl;
  private storageService: AssetStorageServiceImpl;
  private repository: AssetMetadataRepositoryImpl;

  constructor(config: AssetServiceConfig) {
    this.config = config;
    
    // Initialize Firebase adapter
    this.firebaseAdapter = new FirebaseAdapter(config.firebase);
    
    // Initialize services
    this.metadataService = new AssetMetadataServiceImpl();
    this.storageService = new AssetStorageServiceImpl(this.firebaseAdapter);
    this.repository = new AssetMetadataRepositoryImpl(this.firebaseAdapter);
    
    // Initialize extractors registry
    this.extractors = new Map();
    this.initializeExtractors();
    
    logger.info('Asset Service Refactored initialized', {
      extractorCount: this.extractors.size,
      maxFileSize: config.storage.maxFileSize,
      enableParallelProcessing: config.processing.enableParallelProcessing
    });
  }

  async extractAssets(
    filePath: string,
    options: AssetExtractionOptions = {}
  ): Promise<AssetResult[]> {
    const startTime = Date.now();
    const extractionId = uuidv4();
    
    // Set default options
    const extractionOptions: AssetExtractionOptions = {
      assetTypes: ['image', 'video', 'audio', 'document'],
      returnFormat: 'firebase-urls',
      extractThumbnails: true,
      saveToFirebase: true,
      generateDownloadUrls: true,
      includeMetadata: true,
      includeTransforms: true,
      includeStyles: true,
      ...options
    };

    // Expand "all" asset type to all available types
    if (extractionOptions.assetTypes?.includes('all' as any)) {
      extractionOptions.assetTypes = ['image', 'video', 'audio', 'document'];
    }

    try {
      logger.info('Starting comprehensive asset extraction', {
        filePath,
        extractionId,
        options: extractionOptions
      });

      // ✅ REFACTORED: Load presentation using AsposeDriverFactory
      await asposeDriver.initialize();
      const presentation = await asposeDriver.loadPresentation(filePath);
      const slideCount = presentation.getSlides().size();
      
      logger.info('Presentation loaded successfully', {
        extractionId,
        slideCount,
        fileName: filePath.split('/').pop()
      });

      // Create extraction context
      const context: ExtractionContext = {
        presentationId: uuidv4(),
        extractionId,
        startTime,
        options: extractionOptions
      };

      // Extract assets using all extractors
      const allAssets = await this.executeExtraction(presentation, extractionOptions, context);
      
      // Process and enrich assets
      const processedAssets = await this.processExtractedAssets(allAssets, extractionOptions, context);
      
      // Generate final extraction result
      const result = await this.generateExtractionResult(processedAssets, context);
      
      // Cleanup
      presentation.dispose();
      
      logger.info('Asset extraction completed successfully', {
        extractionId,
        totalAssets: result.assets.length,
        processingTimeMs: result.processingTimeMs,
        assetsByType: this.categorizeAssetsByType(result.assets)
      });

      return result.assets;

    } catch (error) {
      logger.error('Asset extraction failed', {
        extractionId,
        filePath,
        error: (error as Error).message,
        processingTimeMs: Date.now() - startTime
      });
      throw new Error(`Asset extraction failed: ${(error as Error).message}`);
    }
  }

  async extractAssetsByType(
    filePath: string,
    assetType: AssetType,
    options: AssetExtractionOptions = {}
  ): Promise<AssetResult[]> {
    const filteredOptions = {
      ...options,
      assetTypes: [assetType]
    };
    
    const allAssets = await this.extractAssets(filePath, filteredOptions);
    return allAssets.filter(asset => asset.type === assetType);
  }

  async extractAssetsFromSlideRange(
    filePath: string,
    startSlide: number,
    endSlide: number,
    options: AssetExtractionOptions = {}
  ): Promise<AssetResult[]> {
    const rangeOptions = {
      ...options,
      slideRange: { start: startSlide, end: endSlide }
    };
    
    return this.extractAssets(filePath, rangeOptions);
  }

  async getAssetMetadata(assetId: string): Promise<AssetResult | null> {
    try {
      return await this.repository.getAssetMetadata(assetId);
    } catch (error) {
      logger.error('Failed to get asset metadata', {
        assetId,
        error: (error as Error).message
      });
      throw error;
    }
  }

  async searchAssets(
    presentationId: string,
    query: Record<string, any>
  ): Promise<AssetResult[]> {
    try {
      return await this.repository.searchAssets(presentationId, query);
    } catch (error) {
      logger.error('Failed to search assets', {
        presentationId,
        query,
        error: (error as Error).message
      });
      throw error;
    }
  }

  // Private methods for orchestration

  private initializeExtractors(): void {
    // Register all extractors
    const imageExtractor = new ImageAssetExtractor();
    const videoExtractor = new VideoAssetExtractor();
    const audioExtractor = new AudioAssetExtractor();
    const documentExtractor = new DocumentAssetExtractor();

    this.extractors.set('image', imageExtractor);
    this.extractors.set('video', videoExtractor);
    this.extractors.set('audio', audioExtractor);
    this.extractors.set('document', documentExtractor);

    logger.debug('Asset extractors initialized', {
      extractors: Array.from(this.extractors.keys())
    });
  }

  private async executeExtraction(
    presentation: any,
    options: AssetExtractionOptions,
    context: ExtractionContext
  ): Promise<AssetResult[]> {
    const allAssets: AssetResult[] = [];
    const assetTypes = options.assetTypes || ['image', 'video', 'audio', 'document'];
    const slideCount = presentation.getSlides().size();
    const isLargeFile = slideCount > 100;

    logger.info('🔍 Starting asset extraction execution', {
      extractionId: context.extractionId,
      assetTypes,
      slideCount,
      isLargeFile,
      parallelProcessing: this.config.processing.enableParallelProcessing,
      estimatedTime: isLargeFile ? 'Long (>2 minutes)' : 'Short (<1 minute)'
    });

    try {
      if (this.config.processing.enableParallelProcessing) {
        logger.info('🔄 Using parallel extraction mode');
        
        // Parallel extraction with timeout monitoring
        const extractionPromises = assetTypes.map(async (assetType) => {
          const extractor = this.extractors.get(assetType);
          if (!extractor) {
            logger.warn('⚠️ No extractor found for asset type', { assetType });
            return [];
          }

          const extractorStartTime = Date.now();
          logger.info(`🔍 Starting ${assetType} extraction`, {
            extractionId: context.extractionId,
            extractorName: extractor.name,
            assetType
          });

          try {
            // Add timeout for individual extractors
            const timeoutMs = isLargeFile ? 300000 : 60000; // 5 minutes for large files
            const timeoutPromise = new Promise<AssetResult[]>((_, reject) => {
              setTimeout(() => {
                reject(new Error(`${assetType} extraction timeout after ${timeoutMs/1000} seconds`));
              }, timeoutMs);
            });

            const extractionPromise = extractor.extractAssets(presentation, options);
            const assets = await Promise.race([extractionPromise, timeoutPromise]);
            
            const extractorTime = Date.now() - extractorStartTime;
            logger.info(`✅ ${assetType} extraction completed`, {
              extractionId: context.extractionId,
              extractorName: extractor.name,
              assetsFound: assets.length,
              processingTimeMs: extractorTime
            });
            
            return assets;
            
          } catch (error) {
            const extractorTime = Date.now() - extractorStartTime;
            logger.error(`❌ ${assetType} extraction failed`, {
              extractionId: context.extractionId,
              extractorName: extractor.name,
              error: (error as Error).message,
              processingTimeMs: extractorTime
            });
            return [];
          }
        });

        // Wait for all extractors with overall timeout
        const overallTimeoutMs = isLargeFile ? 600000 : 120000; // 10 minutes for large files
        const overallTimeoutPromise = new Promise<AssetResult[][]>((_, reject) => {
          setTimeout(() => {
            reject(new Error(`Overall extraction timeout after ${overallTimeoutMs/1000} seconds`));
          }, overallTimeoutMs);
        });

        const allExtractionPromise = Promise.all(extractionPromises);
        const extractionResults = await Promise.race([allExtractionPromise, overallTimeoutPromise]);
        
        extractionResults.forEach(assets => allAssets.push(...assets));

      } else {
        logger.info('🔄 Using sequential extraction mode');
        
        // Sequential extraction with detailed monitoring
        for (const assetType of assetTypes) {
          const extractor = this.extractors.get(assetType);
          if (!extractor) {
            logger.warn('⚠️ No extractor found for asset type', { assetType });
            continue;
          }

          const extractorStartTime = Date.now();
          logger.info(`🔍 Starting ${assetType} extraction (sequential)`, {
            extractionId: context.extractionId,
            extractorName: extractor.name,
            assetType
          });

          try {
            const assets = await extractor.extractAssets(presentation, options);
            allAssets.push(...assets);
            
            const extractorTime = Date.now() - extractorStartTime;
            logger.info(`✅ ${assetType} extraction completed (sequential)`, {
              extractionId: context.extractionId,
              extractorName: extractor.name,
              assetsFound: assets.length,
              processingTimeMs: extractorTime
            });
            
          } catch (error) {
            const extractorTime = Date.now() - extractorStartTime;
            logger.error(`❌ ${assetType} extraction failed (sequential)`, {
              extractionId: context.extractionId,
              extractorName: extractor.name,
              error: (error as Error).message,
              processingTimeMs: extractorTime
            });
          }
        }
      }

      const totalTime = Date.now() - context.startTime;
      logger.info('✅ Asset extraction execution completed', {
        extractionId: context.extractionId,
        totalAssets: allAssets.length,
        totalTimeMs: totalTime,
        avgTimePerAsset: allAssets.length > 0 ? Math.round(totalTime / allAssets.length) : 0,
        assetBreakdown: allAssets.reduce((acc, asset) => {
          acc[asset.type] = (acc[asset.type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      });

      return allAssets;

    } catch (error) {
      logger.error('❌ Extraction execution failed', {
        extractionId: context.extractionId,
        error: (error as Error).message,
        stack: (error as Error).stack,
        totalTimeMs: Date.now() - context.startTime
      });
      throw error;
    }
  }

  private async processExtractedAssets(
    assets: AssetResult[],
    options: AssetExtractionOptions,
    context: ExtractionContext
  ): Promise<AssetResult[]> {
    const processedAssets: AssetResult[] = [];

    logger.info('Processing extracted assets', {
      extractionId: context.extractionId,
      assetCount: assets.length,
      saveToFirebase: options.saveToFirebase
    });

    for (const asset of assets) {
      try {
        const processedAsset = await this.processIndividualAsset(asset, options, context);
        processedAssets.push(processedAsset);
      } catch (error) {
        logger.error('Failed to process asset', {
          assetId: asset.id,
          error: (error as Error).message
        });
        
        // Add asset without processing if processing fails
        processedAssets.push(asset);
      }
    }

    return processedAssets;
  }

  private async processIndividualAsset(
    asset: AssetResult,
    options: AssetExtractionOptions,
    context: ExtractionContext
  ): Promise<AssetResult> {
    const processedAsset = { ...asset };

    try {
      // Enrich metadata
      if (options.includeMetadata && processedAsset.data) {
        processedAsset.metadata = await this.metadataService.enrichMetadata(
          processedAsset.metadata,
          processedAsset.data
        );
      }

      // Upload to Firebase Storage if requested
      if (options.saveToFirebase && processedAsset.data) {
        const uploadResult = await this.storageService.uploadAsset(
          processedAsset.data,
          processedAsset.filename,
          processedAsset.metadata,
          options
        );

        processedAsset.firebaseUrl = uploadResult.firebaseUrl;
        processedAsset.firebasePath = uploadResult.firebasePath;
        
        if (uploadResult.downloadUrl) {
          processedAsset.url = uploadResult.downloadUrl;
        }

        // Generate thumbnail if requested
        if (options.extractThumbnails && processedAsset.type === 'image') {
          await this.generateAndUploadThumbnail(processedAsset, options);
        }
      }

      // Save metadata to repository
      if (options.saveToFirebase && context.presentationId) {
        await this.repository.saveAssetMetadata(
          processedAsset.id,
          processedAsset,
          context.presentationId
        );
      }

      // Clear data based on return format
      if (options.returnFormat === 'urls' || options.returnFormat === 'firebase-urls') {
        delete processedAsset.data;
        delete processedAsset.base64;
      } else if (options.returnFormat === 'base64' && processedAsset.data) {
        processedAsset.base64 = processedAsset.data.toString('base64');
        delete processedAsset.data;
      }

      return processedAsset;

    } catch (error) {
      logger.error('Individual asset processing failed', {
        assetId: asset.id,
        error: (error as Error).message
      });
      throw error;
    }
  }

  private async generateAndUploadThumbnail(
    asset: AssetResult,
    options: AssetExtractionOptions
  ): Promise<void> {
    try {
      if (!asset.data || asset.type !== 'image') {
        return;
      }

      // For now, use the original image as thumbnail
      // In a real implementation, you'd resize the image
      const thumbnailData = asset.data;

      const thumbnailResult = await this.storageService.uploadThumbnail(
        thumbnailData,
        asset.id,
        asset.metadata
      );

      asset.thumbnail = {
        url: thumbnailResult.url,
        size: thumbnailData.length
      };

      logger.debug('Thumbnail generated and uploaded', {
        assetId: asset.id,
        thumbnailUrl: thumbnailResult.url
      });

    } catch (error) {
      logger.warn('Failed to generate thumbnail', {
        assetId: asset.id,
        error: (error as Error).message
      });
    }
  }

  private async generateExtractionResult(
    assets: AssetResult[],
    context: ExtractionContext
  ): Promise<ExtractionResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Collect errors and warnings from asset metadata
    assets.forEach(asset => {
      if (asset.metadata.warnings) {
        warnings.push(...asset.metadata.warnings);
      }
      if (asset.metadata.errorCount && asset.metadata.errorCount > 0) {
        errors.push(`Asset ${asset.id} had ${asset.metadata.errorCount} errors`);
      }
    });

    const result: ExtractionResult = {
      success: assets.length > 0,
      assets,
      totalAssets: assets.length,
      processingTimeMs: Date.now() - context.startTime,
      errors,
      warnings,
      context
    };

    return result;
  }

  private categorizeAssetsByType(assets: AssetResult[]): Record<AssetType, number> {
    const categories: Record<AssetType, number> = {
      image: 0,
      video: 0,
      audio: 0,
      document: 0,
      shape: 0,
      chart: 0
    };

    assets.forEach(asset => {
      categories[asset.type]++;
    });

    return categories;
  }

  // Utility methods

  async getExtractionStatistics(presentationId: string): Promise<{
    totalAssets: number;
    assetsByType: Record<AssetType, number>;
    assetsByFormat: Record<string, number>;
    totalSize: number;
    averageSize: number;
  }> {
    try {
      return await this.repository.getAssetStatistics(presentationId);
    } catch (error) {
      logger.error('Failed to get extraction statistics', {
        presentationId,
        error: (error as Error).message
      });
      throw error;
    }
  }

  async deleteAssets(assetIds: string[]): Promise<{
    deletedCount: number;
    failedDeletes: Array<{ assetId: string; error: string }>;
  }> {
    try {
      return await this.repository.bulkDeleteAssets(assetIds);
    } catch (error) {
      logger.error('Failed to delete assets', {
        assetIds,
        error: (error as Error).message
      });
      throw error;
    }
  }

  async validateConfiguration(): Promise<boolean> {
    try {
      // Validate Firebase connection
      const firebaseHealth = await this.firebaseAdapter.healthCheck();
      if (!firebaseHealth.overall) {
        logger.error('Firebase health check failed', firebaseHealth);
        return false;
      }

      // ✅ REFACTORED: Validate Aspose.Slides library using AsposeDriverFactory
      try {
        await asposeDriver.initialize();
        const testPresentation = await asposeDriver.createPresentation();
        testPresentation.dispose();
      } catch (error) {
        logger.error('Aspose.Slides library validation failed', {
          error: (error as Error).message
        });
        return false;
      }

      // Validate extractors
      const extractorCount = this.extractors.size;
      if (extractorCount === 0) {
        logger.error('No asset extractors initialized');
        return false;
      }

      logger.info('Asset Service configuration validated successfully');
      return true;

    } catch (error) {
      logger.error('Configuration validation failed', {
        error: (error as Error).message
      });
      return false;
    }
  }

  // Cleanup and disposal
  async dispose(): Promise<void> {
    try {
      await this.firebaseAdapter.close();
      this.extractors.clear();
      
      logger.info('Asset service disposed successfully');
    } catch (error) {
      logger.error('Failed to dispose asset service', {
        error: (error as Error).message
      });
    }
  }
} 