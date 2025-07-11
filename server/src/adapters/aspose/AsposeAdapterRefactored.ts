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
import { randomUUID } from 'crypto';

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
   * Extract embedded assets from presentation (legacy format)
   */
  async extractAssetsLegacy(filePath: string, options: any = {}): Promise<{ success: boolean; assets?: AssetResult[]; error?: string }> {
    try {
      const assets = await this.extractAssets(filePath, options);
      return {
        success: true,
        assets: assets
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Asset extraction failed'
      };
    }
  }

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
  // ADDITIONAL COMPATIBILITY METHODS
  // =============================================================================

  /**
   * Convert to buffer (for legacy compatibility)
   */
  async convertToBuffer(
    filePath: string, 
    format: string, 
    options: any = {}
  ): Promise<{ success: boolean; buffer?: Buffer; size?: number; error?: string; processingStats?: any }> {
    try {
      // ✅ REFACTORED: Use AsposeDriverFactory instead of direct import
      const asposeDriver = require('/app/lib/AsposeDriverFactory');
      await asposeDriver.initialize();
      
      const fs = require('fs');
      const path = require('path');

      if (format === 'pdf' || format === 'html') {
        // Load the presentation using AsposeDriverFactory
        const presentation = await asposeDriver.loadPresentation(filePath);
        
        try {
          // Generate unique output filename
          const outputFileName = `converted_${randomUUID()}.${format}`;
          const outputPath = path.join(this.config.tempDirectory || './temp', outputFileName);
          
          // Ensure temp directory exists
          await ensureDirectoryExists(path.dirname(outputPath));
          
          // Perform real conversion using Aspose.Slides
          if (format === 'pdf') {
            const SaveFormat = await asposeDriver.getSaveFormat();
            presentation.save(outputPath, SaveFormat.Pdf);
          } else if (format === 'html') {
            const SaveFormat = await asposeDriver.getSaveFormat();
            presentation.save(outputPath, SaveFormat.Html);
          }
          
          // Read the converted file into buffer
          const buffer = fs.readFileSync(outputPath);
          
          // Get processing stats
          // Get basic presentation info
          const slideCount = presentation.getSlides().size(); // ✅ Usar size() en lugar de getCount()
          let shapeCount = 0;
          for (let i = 0; i < slideCount; i++) {
            const slide = presentation.getSlides().get_Item(i);
            shapeCount += slide.getShapes().size(); // ✅ Usar size() en lugar de getCount()
          }
          
          // Clean up temp file
          try {
            fs.unlinkSync(outputPath);
          } catch (cleanupError) {
            logger.warn('Failed to cleanup temp file', { outputPath, error: cleanupError });
          }
          
          presentation.dispose();
          
          logger.info(`Successfully converted to ${format}`, { 
            filePath, 
            outputSize: buffer.length,
            slideCount,
            shapeCount 
          });
          
          return {
            success: true,
            buffer,
            size: buffer.length,
            processingStats: { slideCount, shapeCount }
          };
          
        } catch (conversionError) {
          presentation.dispose();
          throw conversionError;
        }
      }
      
      return {
        success: false,
        error: `Format ${format} not supported in convertToBuffer`
      };
    } catch (error) {
      logger.error('Failed to convert to buffer', { error, filePath, format });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Conversion failed'
      };
    }
  }

  /**
   * Legacy thumbnail generation (returns buffers)
   */
  async generateThumbnailsLegacy(
    filePath: string,
    options: any = {}
  ): Promise<Array<{ slideIndex: number; buffer: Buffer; size: { width: number; height: number }; format: string; slideId?: number }>> {
    try {
      const thumbnails = await this.generateThumbnails(filePath, {
        returnFormat: 'buffers',
        format: options.format || 'png',
        size: options.size || { width: 300, height: 225 }
      });

      return thumbnails.map(thumb => ({
        slideIndex: thumb.slideIndex,
        buffer: thumb.thumbnail as Buffer,
        size: thumb.size,
        format: thumb.format,
        slideId: thumb.slideIndex
      }));
    } catch (error) {
      logger.error('Legacy thumbnail generation failed', { error });
      return [];
    }
  }

  // =============================================================================
  // HEALTH CHECK
  // =============================================================================

  async healthCheck(): Promise<HealthCheckResult> {
    try {
      // ✅ REFACTORED: Use AsposeDriverFactory instead of direct import
      const asposeDriver = require('/app/lib/AsposeDriverFactory');
      await asposeDriver.initialize();
      
      const tempDir = this.config.tempDirectory;
      
      const result: HealthCheckResult = {
        isAvailable: true,
        hasLicense: this.licenseApplied,
        tempDirExists: require('fs').existsSync(tempDir || './temp'),
        isHealthy: false,
      };

      // Test if we can create a basic presentation
      try {
        const presentation = await asposeDriver.createPresentation();
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