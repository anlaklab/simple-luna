import { z } from "zod";
/**
 * Conversion Service - Main business logic for file conversions
 * 
 * Orchestrates PPTX ↔ JSON conversions using Aspose.Slides
 */

import { logger } from '../utils/logger';
import { AsposeAdapterRefactored } from '../adapters/aspose/AsposeAdapterRefactored';
import { FirebaseAdapter } from '../adapters/firebase.adapter';
import { FidelityTrackerService } from './fidelity-tracker.service';
import { 
  UniversalPresentation,
  UniversalPresentationSchema 
} from '../schemas/universal-presentation.schema';
import { 
  ConversionOptions,
  ConversionResult,
  AssetResult
} from '../adapters/aspose/types/interfaces';
import { UploadTierService } from './upload-tier.service';
import {
  Pptx2JsonRequest,
  Json2PptxRequest,
  ConvertFormatRequest,
  ThumbnailsRequest
} from '../schemas/api-request.schema';
import {
  Pptx2JsonResponse,
  Json2PptxResponse,
  ConvertFormatResponse,
  ThumbnailsResponse,
  ErrorResponse
} from '../schemas/api-response.schema';

export interface ConversionServiceConfig {
  asposeConfig: {
    licenseFilePath?: string;
    tempDirectory?: string;
    maxFileSize?: number;
  };
  firebaseConfig?: {
    projectId: string;
    privateKey: string;
    clientEmail: string;
    storageBucket: string;
  };
  uploadToStorage?: boolean;
  cleanupTempFiles?: boolean;
}

export class ConversionService {
  private readonly asposeAdapter: AsposeAdapterRefactored;
  private readonly firebaseAdapter?: FirebaseAdapter;
  private readonly fidelityTracker: FidelityTrackerService;
  private readonly config: ConversionServiceConfig;

  constructor(config: ConversionServiceConfig) {
    this.config = config;
    this.asposeAdapter = new AsposeAdapterRefactored(config.asposeConfig || {});
    this.fidelityTracker = new FidelityTrackerService();
    
    if (config.firebaseConfig) {
      this.firebaseAdapter = new FirebaseAdapter(config.firebaseConfig);
    }

    logger.info('Conversion service initialized', {
      hasFirebase: !!this.firebaseAdapter,
      uploadToStorage: config.uploadToStorage,
      fidelityTracking: true,
    });
  }

  // =============================================================================
  // PPTX TO JSON CONVERSION
  // =============================================================================

  /**
   * Convert PPTX file to Universal Schema JSON
   */
  async convertPptxToJson(
    filePath: string,
    originalFilename: string,
    options: Pptx2JsonRequest
  ): Promise<Pptx2JsonResponse | ErrorResponse> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    // Start fidelity tracking
    const fidelityTrackingId = this.fidelityTracker.startConversionTracking(originalFilename);

    try {
      logger.info('Starting PPTX to JSON conversion with fidelity tracking', {
        requestId,
        filePath,
        originalFilename,
        fidelityTrackingId,
        options,
      });

      // Convert using Aspose adapter
      const result = await this.asposeAdapter.convertPptxToJson(filePath, {
        includeAssets: options.includeAssets,
        includeMetadata: options.includeMetadata,
        includeAnimations: options.includeAnimations,
        includeComments: options.includeComments,
        extractImages: options.extractImages,
      });

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Conversion failed');
      }

      // Validate the schema
      const validationResult = UniversalPresentationSchema.safeParse(result.data);
      if (!validationResult.success) {
        logger.error('Schema validation failed', {
          requestId,
          errors: validationResult.error.errors,
        });
        throw new Error('Generated JSON does not match Universal Schema');
      }

      const processingTime = Date.now() - startTime;

      // Extract assets if requested
      let extractedAssets;
      if (options.extractImages || options.includeAssets) {
        const assetResult = await this.asposeAdapter.extractAssetsLegacy(filePath, {
          assetTypes: options.extractImages ? ['images'] : ['images', 'videos', 'audio'],
          generateThumbnails: false,
        });
        
        if (assetResult.success && assetResult.assets) {
          extractedAssets = assetResult.assets.map((asset: any) => ({
            type: asset.type,
            filename: asset.filename,
            originalName: asset.originalName,
            size: asset.size,
            mimetype: asset.mimetype,
            metadata: asset.metadata,
          }));
        }
      }

      // Update fidelity tracking with conversion results
      this.fidelityTracker.updateConversionStage(fidelityTrackingId, 'pptx_to_json', validationResult.data);
      
      // Analyze each slide for fidelity
      if (validationResult.data.slides) {
        validationResult.data.slides.forEach((slide, index) => {
          this.fidelityTracker.analyzeSlide(fidelityTrackingId, index, slide);
        });
      }

      // Generate fidelity report
      const fidelityReport = this.fidelityTracker.generateFidelityReport(
        fidelityTrackingId,
        originalFilename,
        processingTime
      );

      const response: Pptx2JsonResponse = {
        success: true,
        data: {
          presentation: validationResult.data,
          originalFilename,
          extractedAssets,
          processingStats: {
            slideCount: result.data?.processingStats?.slideCount || 0,
            shapeCount: result.data?.processingStats?.shapeCount || 0,
            imageCount: result.data?.processingStats?.imageCount || 0,
            animationCount: result.data?.processingStats?.animationCount || 0,
            conversionTimeMs: processingTime,
          },
          fidelityReport: fidelityReport || undefined, // Include fidelity report in response
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
          processingTimeMs: processingTime,
          version: '1.0',
          fidelityScore: fidelityReport?.fidelityScore,
          fidelityQuality: fidelityReport?.overallQuality,
        },
      };

      logger.info('PPTX to JSON conversion completed successfully with fidelity analysis', {
        requestId,
        slideCount: result.data?.processingStats?.slideCount || 0,
        processingTimeMs: processingTime,
        fidelityScore: fidelityReport?.fidelityScore,
        fidelityQuality: fidelityReport?.overallQuality,
        issueCount: fidelityReport?.issues.length || 0,
      });

      return response;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      logger.error('PPTX to JSON conversion failed', {
        requestId,
        error,
        filePath,
        processingTimeMs: processingTime,
      });

      return this.createErrorResponse(
        'conversion_error',
        'PPTX_TO_JSON_FAILED',
        error instanceof Error ? error.message : 'Unknown conversion error',
        requestId,
        processingTime
      );
    }
  }

  // =============================================================================
  // JSON TO PPTX CONVERSION
  // =============================================================================

  /**
   * Convert Universal Schema JSON to PPTX file
   */
  async convertJsonToPptx(
    request: Json2PptxRequest
  ): Promise<Json2PptxResponse | ErrorResponse> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      logger.info('Starting JSON to PPTX conversion', {
        requestId,
        outputFormat: request.outputFormat,
        slideCount: request.presentationData.slides.length,
      });

      // Validate the input schema
      const validationResult = UniversalPresentationSchema.safeParse(request.presentationData);
      if (!validationResult.success) {
        throw new Error(`Invalid presentation schema: ${validationResult.error.message}`);
      }

      // Generate unique filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const outputFilename = `presentation_${timestamp}.${request.outputFormat}`;
      const tempPath = `./temp/${outputFilename}`;

      // Convert using Aspose adapter
      const result = await this.asposeAdapter.convertJsonToPptx(
        validationResult.data,
        tempPath,
        {
          outputFormat: 'pptx' as const,
          includeMetadata: request.includeMetadata,
          preserveOriginalAssets: request.preserveOriginalAssets,
          compressionLevel: request.compressionLevel,
        }
      );

      if (!result.success || !result.filePath) {
        throw new Error(result.error || 'Conversion failed');
      }

      const processingTime = Date.now() - startTime;

      // Upload to Firebase Storage if configured
      let fileInfo = {
        filename: outputFilename,
        originalName: outputFilename,
        size: result.size,
        mimetype: this.getMimeTypeForFormat(request.outputFormat),
        url: result.filePath,
        downloadUrl: result.filePath,
      };

      if (this.config.uploadToStorage && this.firebaseAdapter) {
        try {
          // Read file buffer
          const fs = require('fs/promises');
          const buffer = await fs.readFile(result.filePath);
          
          const uploadResult = await this.firebaseAdapter.uploadFile(
            buffer,
            outputFilename,
            fileInfo.mimetype,
            {
              folder: 'conversions',
              makePublic: true,
              metadata: {
                requestId,
                originalFormat: 'json',
                targetFormat: request.outputFormat,
                slideCount: request.presentationData.slides.length,
              },
            }
          );

          fileInfo = {
            ...fileInfo,
            url: uploadResult.url,
            downloadUrl: uploadResult.downloadUrl,
          };

        } catch (uploadError) {
          logger.warn('Failed to upload to Firebase Storage', {
            requestId,
            error: uploadError,
          });
        }
      }

      const response: Json2PptxResponse = {
        success: true,
        data: {
          file: {
            ...fileInfo,
            size: fileInfo.size ?? 0
          },
          outputFormat: request.outputFormat,
          processingStats: {
            slideCount: result.processingStats?.slideCount ?? 0,
            shapeCount: result.processingStats?.shapeCount ?? 0,
            fileSize: result.size ?? 0,
            conversionTimeMs: processingTime,
          },
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
          processingTimeMs: processingTime,
          version: '1.0',
        },
      };

      logger.info('JSON to PPTX conversion completed successfully', {
        requestId,
        outputFormat: request.outputFormat,
        fileSize: result.size,
        processingTimeMs: processingTime,
      });

      return response;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      logger.error('JSON to PPTX conversion failed', {
        requestId,
        error,
        processingTimeMs: processingTime,
      });

      return this.createErrorResponse(
        'conversion_error',
        'JSON_TO_PPTX_FAILED',
        error instanceof Error ? error.message : 'Unknown conversion error',
        requestId,
        processingTime
      );
    }
  }

  // =============================================================================
  // FORMAT CONVERSION
  // =============================================================================

  /**
   * Convert presentation to different formats (PDF, HTML, images)
   */
  async convertFormat(
    inputPath: string,
    request: ConvertFormatRequest
  ): Promise<ConvertFormatResponse | ErrorResponse> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      logger.info('Starting format conversion', {
        requestId,
        inputPath,
        outputFormat: request.outputFormat,
        slideIndices: request.slideIndices,
      });

      // Convert using Aspose adapter
      const result = await this.asposeAdapter.convertToBuffer(
        inputPath,
        request.outputFormat,
        {
          outputFormat: request.outputFormat,
          quality: request.quality,
        }
      );

      if (!result.success || !result.buffer) {
        throw new Error(result.error || 'Format conversion failed');
      }

      const processingTime = Date.now() - startTime;

      // For image formats, we might have multiple files (one per slide)
      const files = [{
        filename: `converted.${request.outputFormat}`,
        originalName: `converted.${request.outputFormat}`,
        size: result.size,
        mimetype: this.getMimeTypeForFormat(request.outputFormat),
        url: '', // Would be set if uploaded to storage
      }];

      const response: ConvertFormatResponse = {
        success: true,
        data: {
          files: files.map(f => ({ ...f, size: f.size ?? 0 })),
          outputFormat: request.outputFormat,
          slideCount: result.processingStats?.slideCount ?? 0,
          processedSlides: request.slideIndices || Array.from(
            { length: result.processingStats?.slideCount ?? 0 }, 
            (_, i) => i
          ),
          totalSize: result.size ?? 0,
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
          processingTimeMs: processingTime,
          version: '1.0',
        },
      };

      logger.info('Format conversion completed successfully', {
        requestId,
        outputFormat: request.outputFormat,
        fileSize: result.size,
        processingTimeMs: processingTime,
      });

      return response;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      logger.error('Format conversion failed', {
        requestId,
        error,
        processingTimeMs: processingTime,
      });

      return this.createErrorResponse(
        'conversion_error',
        'FORMAT_CONVERSION_FAILED',
        error instanceof Error ? error.message : 'Unknown conversion error',
        requestId,
        processingTime
      );
    }
  }

  // =============================================================================
  // THUMBNAIL GENERATION
  // =============================================================================

  /**
   * Generate thumbnails for presentation slides
   */
  async generateThumbnails(
    inputPath: string,
    request: ThumbnailsRequest
  ): Promise<ThumbnailsResponse | ErrorResponse> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      logger.info('Starting thumbnail generation', {
        requestId,
        inputPath,
        slideIndices: request.slideIndices,
        size: request.size,
        format: request.format,
      });

      // Generate thumbnails using Aspose adapter
      const thumbnails = await this.asposeAdapter.generateThumbnails(inputPath, {
        slideIndices: request.slideIndices,
        width: request.size?.width || 300,
        height: request.size?.height || 225,
        format: request.format,
        quality: request.quality,
        backgroundColor: request.backgroundColor,
        includeNotes: request.includeNotes,
      });

      const processingTime = Date.now() - startTime;

      // Convert thumbnails to requested format
      const thumbnailData = thumbnails.map(thumbnail => ({
        slideIndex: thumbnail.slideIndex,
        slideId: thumbnail.slideId,
        thumbnail: request.returnFormat === 'base64' 
          ? (thumbnail.buffer?.toString('base64') ?? '')
          : '', // Would handle URL/buffer formats here
        format: thumbnail.format,
        size: thumbnail.size,
        url: undefined as string | undefined,
      }));

      const response: ThumbnailsResponse = {
        success: true,
        data: {
          thumbnails: thumbnailData,
          totalSlides: thumbnails.length > 0 ? Math.max(...thumbnails.map(t => t.slideIndex)) + 1 : 0,
          generatedCount: thumbnails.length,
          format: request.format || 'png',
          size: {
            width: request.size?.width ?? 300,
            height: request.size?.height ?? 225
          },
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
          processingTimeMs: processingTime,
          version: '1.0',
        },
      };

      logger.info('Thumbnail generation completed successfully', {
        requestId,
        generatedCount: thumbnails.length,
        processingTimeMs: processingTime,
      });

      return response;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      logger.error('Thumbnail generation failed', {
        requestId,
        error,
        processingTimeMs: processingTime,
      });

      return this.createErrorResponse(
        'processing_error',
        'THUMBNAIL_GENERATION_FAILED',
        error instanceof Error ? error.message : 'Unknown thumbnail generation error',
        requestId,
        processingTime
      );
    }
  }

  // =============================================================================
  // FIDELITY REPORTING
  // =============================================================================

  /**
   * Get fidelity statistics for all conversions
   */
  getFidelityStatistics() {
    return this.fidelityTracker.getFidelityStatistics();
  }

  /**
   * Get conversion history with fidelity reports
   */
  getConversionHistory(limit: number = 50): any[] {
    return this.fidelityTracker.getConversionHistory(limit);
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  /**
   * Health check for the conversion service
   */
  async healthCheck(): Promise<{
    conversion: boolean;
    aspose: boolean;
    firebase: boolean;
    overall: boolean;
  }> {
    const health = {
      conversion: false,
      aspose: false,
      firebase: false,
      overall: false,
    };

    try {
      // Test Aspose adapter
      const asposeHealth = await this.asposeAdapter.healthCheck();
      health.aspose = typeof asposeHealth === 'boolean' ? asposeHealth : asposeHealth.isHealthy;
      
      // Test Firebase adapter if configured
      if (this.firebaseAdapter) {
        const firebaseHealth = await this.firebaseAdapter.healthCheck();
        health.firebase = firebaseHealth.overall;
      } else {
        health.firebase = true; // Not configured, so not a failure
      }

      // Overall conversion service health
      health.conversion = health.aspose;
      health.overall = health.conversion && health.firebase;

    } catch (error) {
      logger.error('Conversion service health check failed', { error });
    }

    return health;
  }

  // =============================================================================
  // PRIVATE HELPER METHODS
  // =============================================================================

  private generateRequestId(): string {
    return `req_${Date.now()}_${require('crypto').randomUUID().replace(/-/g, '').substring(0, 9)}`;
  }

  private getMimeTypeForFormat(format: string): string {
    const mimeTypes: Record<string, string> = {
      'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'pdf': 'application/pdf',
      'html': 'text/html',
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'svg': 'image/svg+xml',
      'bmp': 'image/bmp',
      'gif': 'image/gif',
      'tiff': 'image/tiff',
    };

    return mimeTypes[format.toLowerCase()] || 'application/octet-stream';
  }

  private createErrorResponse(
    type: string,
    code: string,
    message: string,
    requestId: string,
    processingTimeMs: number
  ): ErrorResponse {
    return {
      success: false,
      error: {
        type: type as any,
        code,
        message,
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
        error: {
          type,
          code,
          message,
        },
      },
    };
  }
}

export default ConversionService; 