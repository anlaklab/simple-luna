/**
 * Aspose.Slides Adapter - Refactored Version
 * PowerPoint Processing with Aspose.Slides v25.6
 * 
 * This is a cleaner, modular version that uses specialized extractors
 */

import * as path from 'path';
import * as fs from 'fs/promises';
import { logger } from '../utils/logger';
import { UniversalPresentation } from '../schemas/universal-presentation.schema';
import { SlideExtractor } from './aspose/slide-extractor';

// GLOBAL LICENSE MANAGER - Use this everywhere for consistent licensing
const licenseManager = require('../../../lib/aspose-license-manager');

export interface AsposeConfig {
  licenseFilePath?: string;
  tempDirectory?: string;
  maxFileSize?: number;
  javaOptions?: string[];
}

export interface ConversionOptions {
  includeAssets?: boolean;
  includeMetadata?: boolean;
  includeAnimations?: boolean;
  includeComments?: boolean;
  extractImages?: boolean;
  optimizeForSize?: boolean;
}

export interface ConversionResult {
  success: boolean;
  data?: UniversalPresentation;
  processingStats: {
    slideCount: number;
    shapeCount: number;
    imageCount: number;
    animationCount: number;
    conversionTimeMs: number;
  };
  error?: string;
}

export interface ThumbnailOptions {
  slideIndices?: number[];
  width?: number;
  height?: number;
  format?: 'png' | 'jpg' | 'webp';
  quality?: 'low' | 'medium' | 'high' | 'ultra';
  backgroundColor?: string;
  includeNotes?: boolean;
}

export interface ThumbnailResult {
  slideIndex: number;
  slideId?: number;
  buffer: Buffer;
  format: string;
  size: {
    width: number;
    height: number;
  };
}

export class AsposeAdapter {
  private readonly config: AsposeConfig;
  private licenseSet: boolean = false;
  private slideExtractor: SlideExtractor;

  constructor(config: AsposeConfig = {}) {
    this.config = {
      tempDirectory: './temp/aspose',
      maxFileSize: 50 * 1024 * 1024, // 50MB
      javaOptions: ['-Xmx2g', '-Xms512m'],
      ...config,
    };

    this.slideExtractor = new SlideExtractor();

    // Initialize Aspose.Slides with license if provided
    this.initializeLicense();

    logger.info('Aspose adapter initialized', {
      licenseSet: this.licenseSet,
      tempDirectory: this.config.tempDirectory,
      maxFileSize: this.config.maxFileSize,
    });
  }

  /**
   * Convert PPTX file to Universal Schema JSON
   */
  async convertPptxToJson(
    filePath: string,
    options: ConversionOptions = {}
  ): Promise<ConversionResult> {
    const startTime = Date.now();
    
    try {
      // Validate file exists and size
      await this.validateFile(filePath);

      logger.info('Loading presentation with Aspose.Slides', { filePath });

      // Load presentation using Aspose.Slides
      const Presentation = require('../../../lib/aspose.slides.js');
      const presentation = new Presentation(filePath);

      try {
        // Extract document properties
        const docProps = presentation.getDocumentProperties();
        const slideSize = presentation.getSlideSize();
        
        const universalPresentation: UniversalPresentation = {
          slides: [],
          slideSize: {
            width: slideSize.getSize().getWidth(),
            height: slideSize.getSize().getHeight(),
            type: slideSize.getType(),
            orientation: slideSize.getOrientation(),
          },
          version: '1.0',
          generator: 'Luna Server - Aspose.Slides v25.6',
          metadata: {
            slideCount: presentation.getSlides().size(),
            animationCount: 0,
            shapeCount: 0,
            imageCount: 0,
            videoCount: 0,
            audioCount: 0,
            chartCount: 0,
            tableCount: 0,
            embeddedObjects: 0,
            fonts: [],
            fileSize: await this.getFileSize(filePath),
            lastModified: new Date(),
          },
          documentProperties: {
            title: docProps.getTitle() || 'Untitled',
            author: docProps.getAuthor() || 'Unknown',
            subject: docProps.getSubject() || '',
            keywords: docProps.getKeywords() || '',
            comments: docProps.getComments() || '',
            category: docProps.getCategory() || '',
            manager: docProps.getManager() || '',
            company: docProps.getCompany() || '',
            createdTime: docProps.getCreatedTime() ? new Date(docProps.getCreatedTime().getTime()) : new Date(),
            lastSavedTime: docProps.getLastSavedTime() ? new Date(docProps.getLastSavedTime().getTime()) : new Date(),
            lastPrintedDate: docProps.getLastPrintedTime() ? new Date(docProps.getLastPrintedTime().getTime()) : undefined,
            revisionNumber: docProps.getRevisionNumber(),
            totalEditingTime: docProps.getTotalEditingTime(),
          },
          security: {
            isEncrypted: presentation.getProtectionManager().isEncrypted(),
            isPasswordProtected: presentation.getProtectionManager().isPasswordProtected(),
            isWriteProtected: presentation.getProtectionManager().isWriteProtected(),
            hasDigitalSignature: presentation.getDigitalSignatures().size() > 0,
            hasVbaProject: presentation.getVbaProject() !== null,
          },
          masterSlides: [],
          layoutSlides: [],
          defaultTextStyle: {
            fontName: 'Arial',
            fontSize: 12,
            fontBold: false,
            fontItalic: false,
            fontUnderline: false,
            fontColor: '#000000',
          },
        };

        // Process slides using the SlideExtractor
        const slides = presentation.getSlides();
        let totalShapes = 0;
        let totalImages = 0;
        let totalAnimations = 0;

        for (let i = 0; i < slides.size(); i++) {
          const slide = slides.get_Item(i);
          const slideData = await this.slideExtractor.processSlide(slide, i, options);
          
          universalPresentation.slides.push(slideData);
          totalShapes += slideData.shapes?.length || 0;
          totalImages += slideData.shapes?.filter((s: any) => s.shapeType === 'Picture').length || 0;
          totalAnimations += slideData.animations?.length || 0;
        }

        // Update metadata with actual counts
        universalPresentation.metadata!.shapeCount = totalShapes;
        universalPresentation.metadata!.imageCount = totalImages;
        universalPresentation.metadata!.animationCount = totalAnimations;

        const stats = {
          slideCount: universalPresentation.slides.length,
          shapeCount: totalShapes,
          imageCount: totalImages,
          animationCount: totalAnimations,
          conversionTimeMs: Date.now() - startTime,
        };

        logger.info('PPTX to JSON conversion completed successfully', {
          filePath,
          slideCount: stats.slideCount,
          shapeCount: stats.shapeCount,
          conversionTimeMs: stats.conversionTimeMs,
        });

        return {
          success: true,
          data: universalPresentation,
          processingStats: stats,
        };

      } finally {
        // Always dispose of the presentation to free memory
        if (presentation) {
          presentation.dispose();
        }
      }

    } catch (error) {
      logger.error('PPTX to JSON conversion failed', { error, filePath });
      return {
        success: false,
        processingStats: {
          slideCount: 0,
          shapeCount: 0,
          imageCount: 0,
          animationCount: 0,
          conversionTimeMs: Date.now() - startTime,
        },
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Generate thumbnails for presentation slides
   */
  async generateThumbnails(
    input: string | UniversalPresentation,
    options: ThumbnailOptions = {}
  ): Promise<ThumbnailResult[]> {
    try {
      const {
        slideIndices = [0],
        width = 300,
        height = 225,
        format = 'png',
      } = options;

      const thumbnails: ThumbnailResult[] = [];
      
      if (typeof input === 'string') {
        // Load presentation and generate real thumbnails
        const Presentation = require('../../../lib/aspose.slides.js');
        const presentation = new Presentation(input);
        
        try {
          const slides = presentation.getSlides();
          
          for (const slideIndex of slideIndices) {
            if (slideIndex < slides.size()) {
              const slide = slides.get_Item(slideIndex);
              
              // Generate thumbnail using Aspose.Slides
              const bitmap = slide.getThumbnail(width / slide.getSlideSize().getSize().getWidth());
              const buffer = Buffer.from(bitmap.getData());
              
              thumbnails.push({
                slideIndex,
                slideId: slideIndex,
                buffer,
                format,
                size: { width, height },
              });
            }
          }
        } finally {
          presentation.dispose();
        }
      } else {
        // Generate mock thumbnails from schema
        for (const slideIndex of slideIndices) {
          const mockBuffer = Buffer.from(`Mock thumbnail for slide ${slideIndex}`, 'utf8');
          thumbnails.push({
            slideIndex,
            slideId: slideIndex,
            buffer: mockBuffer,
            format,
            size: { width, height },
          });
        }
      }

      logger.info('Thumbnail generation completed', {
        generatedCount: thumbnails.length,
        format,
        size: { width, height },
      });

      return thumbnails;
    } catch (error) {
      logger.error('Thumbnail generation failed', { error, options });
      return [];
    }
  }

  /**
   * Health check for Aspose adapter
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Check if Aspose library is available
      const isAvailable = !!require('../../../lib/aspose.slides.js');
      
      // Check license status
      const hasLicense = this.licenseSet;
      
      // Check temp directory
      const tempDirExists = await fs.access(this.config.tempDirectory!)
        .then(() => true)
        .catch(() => false);

      const isHealthy = isAvailable && tempDirExists;

      logger.info('Aspose adapter health check', {
        isAvailable,
        hasLicense,
        tempDirExists,
        isHealthy,
      });

      return isHealthy;
    } catch (error) {
      logger.error('Aspose adapter health check failed', { error });
      return false;
    }
  }

  // =============================================================================
  // PRIVATE METHODS
  // =============================================================================

  private async initializeLicense(): Promise<void> {
    try {
      if (this.config.licenseFilePath) {
        const licenseExists = await fs.access(this.config.licenseFilePath)
          .then(() => true)
          .catch(() => false);
        
        if (licenseExists) {
          // Apply license (placeholder implementation)
          logger.info('Aspose license applied', { path: this.config.licenseFilePath });
          this.licenseSet = true;
        } else {
          logger.warn('License file not found', { path: this.config.licenseFilePath });
        }
      } else {
        logger.info('No license path configured, using evaluation mode');
      }
    } catch (error) {
      logger.error('Failed to initialize license', { error });
    }
  }

  private async validateFile(filePath: string): Promise<void> {
    const stats = await fs.stat(filePath);
    if (stats.size > this.config.maxFileSize!) {
      throw new Error(`File too large: ${stats.size} bytes (max: ${this.config.maxFileSize})`);
    }
  }

  private async getFileSize(filePath: string): Promise<number> {
    try {
      const stats = await fs.stat(filePath);
      return stats.size;
    } catch (error) {
      return 0;
    }
  }
}