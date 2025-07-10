/**
 * Thumbnail Manager Service - Generates and manages slide thumbnails
 */

import { promises as fs } from 'fs';
import path from 'path';
import { FirebaseAdapter } from '../adapters/firebase.adapter';
import { AsposeAdapterRefactored } from '../adapters/aspose/AsposeAdapterRefactored';
import { ThumbnailOptions, ThumbnailResult } from '../adapters/aspose/types/interfaces';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export interface ThumbnailGenerationOptions {
  format?: 'png' | 'jpg' | 'webp';
  width?: number;
  height?: number;
  quality?: 'low' | 'medium' | 'high';
  backgroundColor?: string;
  includeNotes?: boolean;
  strategy?: string;
}

export interface ThumbnailGenerationResult {
  success: boolean;
  presentationId: string;
  thumbnails: ThumbnailResult[];
  strategy: string; // Changed from restricted enum to string
  stats: {
    totalSlides: number;
    generatedCount: number;
    failedCount: number;
    totalProcessingTime: number;
    averageTimePerSlide: number;
  };
  errors?: string[];
}

export interface ThumbnailStats {
  presentationId: string;
  totalThumbnails: number;
  realThumbnails: number;
  placeholderThumbnails: number;
  totalSize: number;
  averageSize: number;
  formats: Record<string, number>;
  lastGenerated: Date;
  generationStrategy: string;
}

export interface ThumbnailManagerConfig {
  asposeConfig: any; // Configuration for AsposeAdapterRefactored
  outputDirectory?: string;
  defaultFormat?: string;
  defaultSize?: { width: number; height: number };
  quality?: string;
  enableCaching?: boolean;
}

export class ThumbnailManagerService {
  private asposeAdapter: AsposeAdapterRefactored;
  private firebase: FirebaseAdapter;
  private readonly tempDir: string;
  private readonly thumbnailCollectionName = 'thumbnails';
  private readonly statsCollectionName = 'thumbnail_stats';
  private config: ThumbnailManagerConfig;

  constructor(config: ThumbnailManagerConfig) {
    this.config = {
      outputDirectory: './temp/thumbnails',
      defaultFormat: 'png',
      defaultSize: { width: 960, height: 540 },
      quality: 'medium',
      enableCaching: true,
      ...config,
    };

    this.asposeAdapter = new AsposeAdapterRefactored(config.asposeConfig);
    
    // Create Firebase config from environment variables
    const firebaseConfig: any = { // Assuming FirebaseConfig is no longer needed or replaced
      projectId: process.env.FIREBASE_PROJECT_ID!,
      privateKey: process.env.FIREBASE_PRIVATE_KEY!,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET!,
    };
    
    this.firebase = new FirebaseAdapter(firebaseConfig);
    this.tempDir = path.join(process.cwd(), 'temp', 'thumbnails');
    this.ensureTempDirectory();
    logger.info('ThumbnailManagerService initialized');
  }

  // =============================================================================
  // THUMBNAIL GENERATION
  // =============================================================================

  /**
   * Generate thumbnails for a presentation
   */
  async generateThumbnails(
    presentationId: string,
    inputPath: string,
    options: ThumbnailOptions = {}
  ): Promise<ThumbnailGenerationResult> {
    const startTime = Date.now();
    
    try {
      const {
        width = 300,
        height = 225,
        format = 'png',
        quality = 'medium',
        strategy = 'auto',
        slideIndices,
      } = options;

      logger.info('Starting thumbnail generation', { 
        presentationId, 
        strategy, 
        format, 
        quality 
      });

      // Determine strategy if auto
      const finalStrategy = strategy === 'auto' 
        ? await this.determineOptimalStrategy(inputPath)
        : strategy;

      let thumbnails: ThumbnailResult[] = [];
      let errors: string[] = [];

      if (finalStrategy === 'real') {
        const result = await this.generateRealThumbnails(
          presentationId,
          inputPath,
          { width, height, format, quality, slideIndices }
        );
        thumbnails = result.thumbnails;
        errors = result.errors;
      } else {
        const result = await this.generatePlaceholderThumbnails(
          presentationId,
          inputPath,
          { width, height, format, slideIndices }
        );
        thumbnails = result.thumbnails;
        errors = result.errors;
      }

      // Save thumbnail metadata to Firebase
      await this.saveThumbnailMetadata(presentationId, thumbnails);

      // Update statistics
      await this.updateThumbnailStats(presentationId, thumbnails, finalStrategy);

      const stats = {
        totalSlides: thumbnails.length + errors.length,
        generatedCount: thumbnails.length,
        failedCount: errors.length,
        totalProcessingTime: Date.now() - startTime,
        averageTimePerSlide: thumbnails.length > 0 
          ? (Date.now() - startTime) / thumbnails.length 
          : 0,
      };

      logger.info('Thumbnail generation completed', {
        presentationId,
        strategy: finalStrategy,
        generatedCount: thumbnails.length,
        failedCount: errors.length,
        processingTime: stats.totalProcessingTime,
      });

      return {
        success: true,
        presentationId,
        thumbnails,
        strategy: finalStrategy,
        stats,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      logger.error('Thumbnail generation failed', { error, presentationId });
      return {
        success: false,
        presentationId,
        thumbnails: [],
        strategy: 'real',
        stats: {
          totalSlides: 0,
          generatedCount: 0,
          failedCount: 1,
          totalProcessingTime: Date.now() - startTime,
          averageTimePerSlide: 0,
        },
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  /**
   * Get file path for a presentation
   */
  private async getFilePath(presentationId: string): Promise<string> {
    // Mock implementation - in real app this would fetch from database
    return `./temp/presentations/${presentationId}.pptx`;
  }

  /**
   * Generate single thumbnail with options
   */
  async generateSingleThumbnail(
    presentationId: string,
    slideIndex: number,
    options: ThumbnailGenerationOptions = {}
  ): Promise<ThumbnailResult> {
    const startTime = Date.now();

    try {
      logger.info('Generating single thumbnail', {
        presentationId,
        slideIndex,
        options,
      });

      // Get presentation file path
      const filePath = await this.getFilePath(presentationId);

      // Generate thumbnail using Aspose adapter
      const result = await this.asposeAdapter.generateThumbnailsLegacy(filePath, {
        slideIndices: [slideIndex],
        format: options.format || this.config.defaultFormat,
        size: {
          width: options.width || this.config.defaultSize?.width || 960,
          height: options.height || this.config.defaultSize?.height || 540,
        },
        quality: options.quality || this.config.quality,
        backgroundColor: options.backgroundColor,
        includeNotes: options.includeNotes,
      });

      if (!result || result.length === 0) {
        throw new Error('Failed to generate thumbnail');
      }

      const thumbnail = result[0];
      const processingTime = Date.now() - startTime;

      // Upload to Firebase Storage if enabled
      const uploadResult = await this.firebase.uploadFile(
        thumbnail.buffer || Buffer.from(''),
        `thumbnail_${presentationId}_${slideIndex}.${thumbnail.format}`,
        `image/${thumbnail.format}`,
        {
          folder: 'thumbnails',
          makePublic: true,
          metadata: {
            presentationId,
            slideIndex,
            generatedAt: new Date().toISOString(),
            generationStrategy: options.strategy || 'standard',
          },
        }
      );

      // Create thumbnail result
      const thumbnailResult: ThumbnailResult = {
        slideIndex,
        thumbnail: thumbnail.buffer || Buffer.from(''),
        url: uploadResult.url,
        format: thumbnail.format,
        size: thumbnail.size,
        fileSize: thumbnail.buffer?.length || 0,
        generatedAt: new Date(),
        strategy: options.strategy || 'standard',
        presentationId,
      };

      return thumbnailResult;
    } catch (error) {
      logger.error('Single thumbnail generation failed', { error, presentationId, slideIndex });
      throw error;
    }
  }

  /**
   * Generate real thumbnails using Aspose.Slides
   */
  private async generateRealThumbnails(
    presentationId: string,
    inputPath: string,
    options: { width: number; height: number; format: string; quality: string; slideIndices?: number[] }
  ): Promise<{ thumbnails: ThumbnailResult[]; errors: string[] }> {
    try {
      const thumbnailResults = await this.asposeAdapter.generateThumbnails(inputPath, {
        width: options.width,
        height: options.height,
        format: options.format as any,
        quality: options.quality as any,
        slideIndices: options.slideIndices,
      });

      const thumbnails: ThumbnailResult[] = [];
      const errors: string[] = [];

      for (const result of thumbnailResults) {
        try {
          // Upload to Firebase Storage
          const fileName = `${presentationId}/slide-${result.slideIndex}.${options.format}`;
          const uploadResult = await this.firebase.uploadFile(
            result.buffer || Buffer.from(''),
            fileName,
            `image/${options.format}`,
            { 
              presentationId,
              slideIndex: result.slideIndex,
              strategy: 'real',
              generated: new Date().toISOString(),
            }
          );

          thumbnails.push({
            id: uuidv4(),
            slideIndex: result.slideIndex,
            url: uploadResult.url,
            format: result.format,
            size: result.size,
            fileSize: result.buffer?.length ?? 0,
            strategy: 'real',
            createdAt: new Date(),
            metadata: {
              uploadPath: uploadResult.path,
              quality: options.quality,
            },
          });
        } catch (uploadError) {
          errors.push(`Failed to upload thumbnail for slide ${result.slideIndex}: ${uploadError}`);
        }
      }

      return { thumbnails, errors };
    } catch (error) {
      logger.error('Real thumbnail generation failed', { error, presentationId });
      return { 
        thumbnails: [], 
        errors: [error instanceof Error ? error.message : 'Unknown error'] 
      };
    }
  }

  /**
   * Generate placeholder thumbnails from presentation data
   */
  private async generatePlaceholderThumbnails(
    presentationId: string,
    inputPath: string,
    options: { width: number; height: number; format: string; slideIndices?: number[] }
  ): Promise<{ thumbnails: ThumbnailResult[]; errors: string[] }> {
    try {
      // First convert PPTX to Universal Schema to get slide data
      const conversionResult = await this.asposeAdapter.convertPptxToJson(inputPath);
      
      if (!conversionResult.success || !conversionResult.data) {
        throw new Error('Failed to convert presentation for placeholder generation');
      }

      const slides = conversionResult.data.slides ?? [];
      const targetSlides = options.slideIndices 
        ? slides.filter((_, index) => options.slideIndices!.includes(index))
        : slides;

      const thumbnails: ThumbnailResult[] = [];
      const errors: string[] = [];

      for (let i = 0; i < targetSlides.length; i++) {
        const slide = targetSlides[i];
        const slideIndex = options.slideIndices ? options.slideIndices[i] : i;

        try {
          // Generate placeholder image
          const placeholderBuffer = await this.generatePlaceholderImage(slide, {
            width: options.width,
            height: options.height,
            format: options.format,
          });

          // Upload to Firebase Storage
          const fileName = `${presentationId}/placeholder-slide-${slideIndex}.${options.format}`;
          const uploadResult = await this.firebase.uploadFile(
            placeholderBuffer,
            fileName,
            `image/${options.format}`,
            { 
              presentationId,
              slideIndex,
              strategy: 'placeholder',
              generated: new Date().toISOString(),
            }
          );

          thumbnails.push({
            id: uuidv4(),
            slideIndex,
            url: uploadResult.url,
            format: options.format,
            size: { width: options.width, height: options.height },
            fileSize: placeholderBuffer.length,
            strategy: 'placeholder',
            createdAt: new Date(),
            metadata: {
              uploadPath: uploadResult.path,
              slideTitle: slide.name || `Slide ${slideIndex + 1}`,
              shapeCount: slide.shapes?.length || 0,
            },
          });
        } catch (slideError) {
          errors.push(`Failed to generate placeholder for slide ${slideIndex}: ${slideError}`);
        }
      }

      return { thumbnails, errors };
    } catch (error) {
      logger.error('Placeholder thumbnail generation failed', { error, presentationId });
      return { 
        thumbnails: [], 
        errors: [error instanceof Error ? error.message : 'Unknown error'] 
      };
    }
  }

  /**
   * Generate placeholder image from slide data
   */
  private async generatePlaceholderImage(
    slide: any,
    options: { width: number; height: number; format: string }
  ): Promise<Buffer> {
    // This is a simplified placeholder generation
    // In a real implementation, you might use a library like Canvas or Sharp
    // to create actual images based on slide content
    
    const slideTitle = slide.name || 'Untitled Slide';
    const shapeCount = slide.shapes?.length || 0;
    const hasImages = slide.shapes?.some((shape: any) => shape.type === 'Picture') || false;
    
    // Create a simple text-based representation
    const placeholderText = `${slideTitle}\n${shapeCount} elements\n${hasImages ? 'Contains images' : 'Text only'}`;
    
    // For now, return a simple buffer representing the placeholder
    // In production, you'd generate an actual image
    return Buffer.from(placeholderText, 'utf8');
  }

  // =============================================================================
  // THUMBNAIL MANAGEMENT
  // =============================================================================

  /**
   * Get thumbnails for a presentation
   */
  async getThumbnails(presentationId: string): Promise<ThumbnailResult[]> {
    try {
      const thumbnails = await this.firebase.queryDocuments<ThumbnailResult>(
        this.firebase.getCollection(this.thumbnailCollectionName)
          .where('presentationId', '==', presentationId)
          .orderBy('slideIndex', 'asc')
      );

      return thumbnails;
    } catch (error) {
      logger.error('Failed to get thumbnails', { error, presentationId });
      throw error;
    }
  }

  /**
   * Delete thumbnails for a presentation
   */
  async deleteThumbnails(presentationId: string, slideIndices?: number[]): Promise<boolean> {
    try {
      const thumbnails = await this.getThumbnails(presentationId);
      const thumbnailsToDelete = slideIndices 
        ? thumbnails.filter(t => slideIndices.includes(t.slideIndex))
        : thumbnails;

      // Delete from storage
      for (const thumbnail of thumbnailsToDelete) {
        try {
          if (thumbnail.metadata?.uploadPath) {
            await this.firebase.deleteFile(thumbnail.metadata.uploadPath);
          }
        } catch (deleteError) {
          logger.warn('Failed to delete thumbnail file', { 
            error: deleteError, 
            thumbnailId: thumbnail.id 
          });
        }
      }

      // Delete metadata from Firestore
      for (const thumbnail of thumbnailsToDelete) {
        if (thumbnail.id) {
          await this.firebase.deleteDocument(this.thumbnailCollectionName, thumbnail.id);
        }
      }

      // Update stats
      if (thumbnailsToDelete.length > 0) {
        await this.updateThumbnailStatsAfterDeletion(presentationId, thumbnailsToDelete.length);
      }

      logger.info('Thumbnails deleted successfully', { 
        presentationId, 
        deletedCount: thumbnailsToDelete.length 
      });

      return true;
    } catch (error) {
      logger.error('Failed to delete thumbnails', { error, presentationId });
      throw error;
    }
  }

  /**
   * Get thumbnail statistics
   */
  async getThumbnailStats(presentationId: string): Promise<ThumbnailStats | null> {
    try {
      const stats = await this.firebase.getDocument<ThumbnailStats>(
        this.statsCollectionName,
        presentationId
      );

      return stats;
    } catch (error) {
      logger.error('Failed to get thumbnail stats', { error, presentationId });
      throw error;
    }
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  /**
   * Determine optimal strategy based on presentation characteristics
   */
  private async determineOptimalStrategy(inputPath: string): Promise<'real' | 'placeholder'> {
    try {
      // Check file size - larger files get placeholder strategy for speed
      const stats = await fs.stat(inputPath);
      const fileSizeMB = stats.size / (1024 * 1024);

      if (fileSizeMB > 10) {
        return 'placeholder';
      }

      // For smaller files, try real thumbnails
      return 'real';
    } catch (error) {
      logger.warn('Failed to determine optimal strategy, defaulting to placeholder', { error });
      return 'placeholder';
    }
  }

  /**
   * Save thumbnail metadata to Firebase
   */
  private async saveThumbnailMetadata(
    presentationId: string,
    thumbnails: ThumbnailResult[]
  ): Promise<void> {
    try {
      for (const thumbnail of thumbnails) {
        await this.firebase.createDocument(
          this.thumbnailCollectionName,
          thumbnail.id || 'unknown-id',
          { ...thumbnail, presentationId }
        );
      }
    } catch (error) {
      logger.error('Failed to save thumbnail metadata', { error, presentationId });
      throw error;
    }
  }

  /**
   * Update thumbnail statistics
   */
  private async updateThumbnailStats(
    presentationId: string,
    thumbnails: ThumbnailResult[],
    strategy: string
  ): Promise<void> {
    try {
      const realCount = thumbnails.filter(t => t.strategy === 'real').length;
      const placeholderCount = thumbnails.filter(t => t.strategy === 'placeholder').length;
      const totalSize = thumbnails.reduce((sum, t) => sum + (t.fileSize ?? 0), 0);
      const formats = thumbnails.reduce((acc, t) => {
        acc[t.format] = (acc[t.format] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const stats: ThumbnailStats = {
        presentationId,
        totalThumbnails: thumbnails.length,
        realThumbnails: realCount,
        placeholderThumbnails: placeholderCount,
        totalSize,
        averageSize: thumbnails.length > 0 ? totalSize / thumbnails.length : 0,
        formats,
        lastGenerated: new Date(),
        generationStrategy: strategy,
      };

      await this.firebase.updateDocument(this.statsCollectionName, presentationId, stats);
    } catch (error) {
      logger.error('Failed to update thumbnail stats', { error, presentationId });
    }
  }

  /**
   * Update stats after deletion
   */
  private async updateThumbnailStatsAfterDeletion(
    presentationId: string,
    deletedCount: number
  ): Promise<void> {
    try {
      const currentStats = await this.getThumbnailStats(presentationId);
      if (currentStats) {
        const updatedStats: Partial<ThumbnailStats> = {
          totalThumbnails: Math.max(0, currentStats.totalThumbnails - deletedCount),
          lastGenerated: new Date(),
        };

        await this.firebase.updateDocument(this.statsCollectionName, presentationId, updatedStats);
      }
    } catch (error) {
      logger.error('Failed to update stats after deletion', { error, presentationId });
    }
  }

  /**
   * Ensure temp directory exists
   */
  private async ensureTempDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      logger.error('Failed to create temp directory', { error, tempDir: this.tempDir });
    }
  }

  /**
   * Health check for thumbnail manager
   */
  async healthCheck(): Promise<boolean> {
    try {
      const asposeHealthy = await this.asposeAdapter.healthCheck();
      const tempDirExists = await fs.access(this.tempDir).then(() => true).catch(() => false);
      
      return asposeHealthy && tempDirExists;
    } catch (error) {
      logger.error('Thumbnail manager health check failed', { error });
      return false;
    }
  }
}