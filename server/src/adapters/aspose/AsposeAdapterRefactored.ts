/**
 * AsposeAdapter (Refactored) - Lightweight Facade
 * 
 * Composes modular services for clean, maintainable architecture
 */

import { logger } from '../../utils/logger';
import { 
  AsposeConfig,
  ConversionOptions,
  ConversionResult,
  ThumbnailOptions,
  ThumbnailResult,
  AssetOptions,
  AssetResult,
  MetadataOptions,
  DocumentMetadata,
  DocumentStatistics,
  HealthCheckResult,
  UniversalPresentation,
  FileGenerationOptions,
  FileGenerationResult,
  FileStats,
  IConversionService,
  IThumbnailService,
  IAssetService,
  IMetadataService
} from './types/interfaces';

import { ConversionService } from './services/ConversionService';
import { ThumbnailService } from './services/ThumbnailService';
import { AssetService } from './services/AssetService';
import { MetadataService } from './services/MetadataService';
import { ensureDirectoryExists } from './utils/asposeUtils';

export class AsposeAdapterRefactored {
  private conversionService: IConversionService;
  private thumbnailService: IThumbnailService;
  private assetService: IAssetService;
  private metadataService: IMetadataService;
  private config: AsposeConfig;
  private licenseApplied: boolean = false;

  constructor(config: AsposeConfig = {}) {
    this.config = {
      licenseFilePath: './Aspose.Slides.Product.Family.lic',
      tempDirectory: './temp/aspose',
      maxFileSize: 62914560, // 60MB
      enableLogging: true,
      timeoutMs: 120000,
      ...config,
    };

    // Initialize all services with the same config
    this.conversionService = new ConversionService(this.config);
    this.thumbnailService = new ThumbnailService(this.config);
    this.assetService = new AssetService(this.config);
    this.metadataService = new MetadataService(this.config);

    // Initialize adapter
    this.initialize();
  }

  // =============================================================================
  // INITIALIZATION
  // =============================================================================

  private async initialize(): Promise<void> {
    try {
      await this.initializeLicense();
      await this.ensureTempDirectory();
      logger.info('Aspose adapter initialized', {
        licenseSet: this.licenseApplied,
        tempDirectory: this.config.tempDirectory,
        maxFileSize: this.config.maxFileSize,
      });
    } catch (error) {
      logger.error('Failed to initialize Aspose adapter', { error });
    }
  }

  private async initializeLicense(): Promise<void> {
    try {
      if (this.config.licenseFilePath) {
        const fs = require('fs');
        if (fs.existsSync(this.config.licenseFilePath)) {
          const License = require('../../../lib/aspose-license-manager.js');
          License.applyLicense(this.config.licenseFilePath);
          this.licenseApplied = true;
          logger.info('Aspose license applied', { path: this.config.licenseFilePath });
        } else {
          logger.warn('License file not found', { path: this.config.licenseFilePath });
        }
      }
    } catch (error) {
      logger.error('Failed to apply license', { error });
    }
  }

  private async ensureTempDirectory(): Promise<void> {
    if (this.config.tempDirectory) {
      await ensureDirectoryExists(this.config.tempDirectory);
    }
  }

  // =============================================================================
  // CONVERSION SERVICES (DELEGATE TO ConversionService)
  // =============================================================================

  /**
   * Convert PPTX file to Universal JSON Schema with robust shape extraction
   */
  async convertPptxToJson(filePath: string, options: ConversionOptions = {}): Promise<ConversionResult> {
    logger.info('Starting PPTX to JSON conversion via refactored service', { filePath });
    return this.conversionService.convertPptxToJson(filePath, options);
  }

  /**
   * Convert Universal JSON Schema to PPTX file
   */
  async convertJsonToPptx(presentationData: UniversalPresentation, outputPath: string, options: FileGenerationOptions = {}): Promise<FileGenerationResult> {
    logger.info('Starting JSON to PPTX conversion via refactored service', { outputPath });
    return this.conversionService.convertJsonToPptx(presentationData, outputPath, options);
  }

  /**
   * Validate PPTX file
   */
  async validateFile(filePath: string): Promise<boolean> {
    return this.conversionService.validateFile(filePath);
  }

  /**
   * Get file statistics
   */
  async getFileStats(filePath: string): Promise<FileStats> {
    return this.conversionService.getFileStats(filePath);
  }

  // =============================================================================
  // THUMBNAIL SERVICES (DELEGATE TO ThumbnailService)
  // =============================================================================

  /**
   * Generate slide thumbnails
   */
  async generateThumbnails(input: string | UniversalPresentation, options: ThumbnailOptions = {}): Promise<ThumbnailResult[]> {
    logger.info('Generating thumbnails via refactored service');
    return this.thumbnailService.generateThumbnails(input, options);
  }

  /**
   * Generate single slide thumbnail
   */
  async generateSingleThumbnail(slideIndex: number, input: string | UniversalPresentation, options: ThumbnailOptions = {}): Promise<ThumbnailResult> {
    return this.thumbnailService.generateSingleThumbnail(slideIndex, input, options);
  }

  // =============================================================================
  // ASSET SERVICES (DELEGATE TO AssetService)
  // =============================================================================

  /**
   * Extract embedded assets from presentation
   */
  async extractAssets(filePath: string, options: AssetOptions = {}): Promise<AssetResult[]> {
    logger.info('Extracting assets via refactored service', { filePath });
    return this.assetService.extractAssets(filePath, options);
  }

  /**
   * Extract image assets only
   */
  async extractImageAssets(filePath: string, options: AssetOptions = {}): Promise<AssetResult[]> {
    return this.assetService.extractImageAssets(filePath, options);
  }

  /**
   * Extract video assets only
   */
  async extractVideoAssets(filePath: string, options: AssetOptions = {}): Promise<AssetResult[]> {
    return this.assetService.extractVideoAssets(filePath, options);
  }

  /**
   * Extract audio assets only
   */
  async extractAudioAssets(filePath: string, options: AssetOptions = {}): Promise<AssetResult[]> {
    return this.assetService.extractAudioAssets(filePath, options);
  }

  // =============================================================================
  // METADATA SERVICES (DELEGATE TO MetadataService)
  // =============================================================================

  /**
   * Extract document metadata
   */
  async extractMetadata(filePath: string, options: MetadataOptions = {}): Promise<DocumentMetadata> {
    logger.info('Extracting metadata via refactored service', { filePath });
    return this.metadataService.extractMetadata(filePath, options);
  }

  /**
   * Update document metadata
   */
  async updateMetadata(filePath: string, metadata: Partial<DocumentMetadata>): Promise<boolean> {
    return this.metadataService.updateMetadata(filePath, metadata);
  }

  /**
   * Get document statistics
   */
  async getDocumentStatistics(filePath: string): Promise<DocumentStatistics> {
    return this.metadataService.getDocumentStatistics(filePath);
  }

  // =============================================================================
  // HEALTH CHECK
  // =============================================================================

  async healthCheck(): Promise<HealthCheckResult> {
    try {
      // Test basic Aspose functionality
      const aspose = require('../../../lib/aspose.slides.js');
      const tempDir = this.config.tempDirectory;
      
      const result: HealthCheckResult = {
        isAvailable: !!aspose,
        hasLicense: this.licenseApplied,
        tempDirExists: require('fs').existsSync(tempDir || './temp'),
        isHealthy: false,
      };

      // Test if we can create a basic presentation
      try {
        const presentation = new aspose.Presentation();
        presentation.dispose();
        result.isHealthy = true;
      } catch (error) {
        logger.error('Aspose health check failed', { error });
        result.isHealthy = false;
      }

      logger.info('Aspose adapter health check', result);
      return result;
    } catch (error) {
      logger.error('Aspose adapter health check failed', { error });
      return {
        isAvailable: false,
        hasLicense: false,
        tempDirExists: false,
        isHealthy: false,
      };
    }
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  /**
   * Get adapter configuration
   */
  getConfig(): AsposeConfig {
    return { ...this.config };
  }

  /**
   * Update adapter configuration
   */
  updateConfig(newConfig: Partial<AsposeConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('Aspose adapter configuration updated', { newConfig });
  }

  /**
   * Get service instances (for advanced usage)
   */
  getServices() {
    return {
      conversion: this.conversionService,
      thumbnail: this.thumbnailService,
      asset: this.assetService,
      metadata: this.metadataService,
    };
  }
} 