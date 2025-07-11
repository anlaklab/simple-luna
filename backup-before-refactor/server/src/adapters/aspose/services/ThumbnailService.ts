/**
 * ThumbnailService - Slide Thumbnail Generation
 */

import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../../../utils/logger';
import { 
  IThumbnailService,
  AsposeConfig,
  ThumbnailOptions,
  ThumbnailResult,
  UniversalPresentation
} from '../types/interfaces';

// Import local Aspose.Slides library via license manager (singleton)
const licenseManager = require('/app/lib/aspose-license-manager.js');

export class ThumbnailService implements IThumbnailService {
  private config: AsposeConfig;

  constructor(config: AsposeConfig) {
    this.config = config;
    logger.info('ThumbnailService: Initialized with license manager');
  }

  async generateThumbnails(input: string | UniversalPresentation, options: ThumbnailOptions = {}): Promise<ThumbnailResult[]> {
    const startTime = Date.now();
    const { size = { width: 800, height: 600 }, format = 'png' } = options;

    try {
      if (!licenseManager.Aspose) {
        throw new Error('Aspose.Slides library not available. License not loaded.');
      }

      if (typeof input !== 'string') {
        throw new Error('Universal Presentation JSON input not yet supported for thumbnails');
      }

      if (!fs.existsSync(input)) {
        throw new Error(`Input file not found: ${input}`);
      }

      const presentation = new licenseManager.Aspose.Presentation(input);
      const slides = presentation.getSlides();
      const slideCount = slides.size(); // ✅ Usar size() en lugar de getCount()
      const thumbnails: ThumbnailResult[] = [];

      logger.info('ThumbnailService: Generating thumbnails', { 
        slideCount, 
        size, 
        format,
        inputPath: input
      });

      // Ensure temp directory exists
      const tempDir = this.config.tempDirectory || './temp';
      const outputDir = path.join(tempDir, 'thumbnails', `thumb_${Date.now()}`);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Generate thumbnail for each slide
      for (let i = 0; i < slideCount; i++) {
        try {
          const slide = slides.get_Item(i); // ✅ Usar get_Item() para acceder al slide
          const thumbnail = await this.generateSingleThumbnailInternal(slide, i, outputDir, { size, format });
          thumbnails.push(thumbnail);
        } catch (slideError) {
          const errorMessage = slideError instanceof Error ? slideError.message : String(slideError);
          logger.warn('ThumbnailService: Failed to generate thumbnail for slide', { 
            slideIndex: i, 
            error: errorMessage 
          });
          
          // Add placeholder result for failed slide
          thumbnails.push({
            slideIndex: i,
            thumbnail: '',
            format,
            size,
            error: errorMessage,
          });
        }
      }

      // Clean up presentation
      if (presentation && presentation.dispose) {
        presentation.dispose();
      }

      const processingTime = Date.now() - startTime;
      logger.info('ThumbnailService: Thumbnails generated successfully', {
        slideCount,
        generatedCount: thumbnails.filter(t => t.thumbnail).length,
        processingTimeMs: processingTime,
      });

      return thumbnails;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('ThumbnailService: Failed to generate thumbnails', { 
        error: errorMessage,
        inputType: typeof input,
      });
      throw new Error(`Thumbnail generation failed: ${errorMessage}`);
    }
  }

  async generateSingleThumbnail(slideIndex: number, input: string | UniversalPresentation, options: ThumbnailOptions = {}): Promise<ThumbnailResult> {
    const { size = { width: 800, height: 600 }, format = 'png' } = options;

    try {
      if (!licenseManager.Aspose) {
        throw new Error('Aspose.Slides library not available. License not loaded.');
      }

      if (typeof input !== 'string') {
        throw new Error('Universal Presentation JSON input not yet supported for thumbnails');
      }

      if (!fs.existsSync(input)) {
        throw new Error(`Input file not found: ${input}`);
      }

      const presentation = new licenseManager.Aspose.Presentation(input);
      const slides = presentation.getSlides();
      const slideCount = slides.size(); // ✅ Usar size() en lugar de getCount()

      if (slideIndex >= slideCount || slideIndex < 0) {
        throw new Error(`Invalid slide index: ${slideIndex}. Presentation has ${slideCount} slides.`);
      }

      const slide = slides.get_Item(slideIndex);
      const tempDir = this.config.tempDirectory || './temp';
      const outputDir = path.join(tempDir, 'thumbnails', `thumb_single_${Date.now()}`);
      
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const result = await this.generateSingleThumbnailInternal(slide, slideIndex, outputDir, { size, format });

      // Clean up presentation
      if (presentation && presentation.dispose) {
        presentation.dispose();
      }

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('ThumbnailService: Failed to generate single thumbnail', { 
        slideIndex,
        error: errorMessage,
      });
      
      return {
        slideIndex,
        thumbnail: '',
        format,
        size,
        error: errorMessage,
      };
    }
  }

  private async generateSingleThumbnailInternal(
    slide: any, 
    slideIndex: number, 
    outputDir: string, 
    options: { size: { width: number; height: number }; format: string }
  ): Promise<ThumbnailResult> {
    try {
      const { size, format } = options;
      const filename = `slide_${slideIndex}.${format}`;
      const outputPath = path.join(outputDir, filename);

      // Create thumbnail using Aspose.Slides
      // Try different approaches based on available methods
      let thumbnail: any;
      let thumbnailBase64 = '';

      try {
        // Method 1: Try with Dimension
        const Dimension = licenseManager.Aspose.Dimension;
        if (Dimension) {
          const thumbnailSize = new Dimension(size.width, size.height);
          thumbnail = slide.getThumbnail(thumbnailSize);
        } else {
          // Method 2: Try direct size parameters
          thumbnail = slide.getThumbnail(size.width, size.height);
        }

        if (thumbnail) {
          // Try to save the thumbnail
          if (thumbnail.save) {
            thumbnail.save(outputPath, this.getImageFormat(format));
          }

          // Read the file if it was saved
          if (fs.existsSync(outputPath)) {
            const thumbnailBuffer = fs.readFileSync(outputPath);
            thumbnailBase64 = `data:image/${format};base64,${thumbnailBuffer.toString('base64')}`;
            
            // Clean up the temporary file
            try {
              fs.unlinkSync(outputPath);
            } catch (cleanupError) {
              const errorMessage = cleanupError instanceof Error ? cleanupError.message : String(cleanupError);
              logger.warn('ThumbnailService: Failed to cleanup temporary file', { 
                outputPath, 
                error: errorMessage 
              });
            }
          }
        }
      } catch (thumbnailError) {
        const errorMessage = thumbnailError instanceof Error ? thumbnailError.message : String(thumbnailError);
        logger.warn('ThumbnailService: Thumbnail generation method failed, using fallback', { 
          slideIndex,
          error: errorMessage 
        });
        
        // Fallback: create a simple placeholder
        thumbnailBase64 = '';
      }

      return {
        slideIndex,
        thumbnail: thumbnailBase64,
        format,
        size,
        filePath: outputPath,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('ThumbnailService: Internal thumbnail generation failed', { 
        slideIndex,
        error: errorMessage,
      });
      throw new Error(errorMessage);
    }
  }

  private getImageFormat(format: string): any {
    try {
      // Try to get ImageFormat enum from Aspose
      if (licenseManager.Aspose.ImageFormat) {
        const ImageFormat = licenseManager.Aspose.ImageFormat;
        
        switch (format.toLowerCase()) {
          case 'png':
            return ImageFormat.Png || 'png';
          case 'jpg':
          case 'jpeg':
            return ImageFormat.Jpeg || 'jpeg';
          case 'bmp':
            return ImageFormat.Bmp || 'bmp';
          case 'gif':
            return ImageFormat.Gif || 'gif';
          default:
            logger.warn('ThumbnailService: Unsupported format, defaulting to PNG', { format });
            return ImageFormat.Png || 'png';
        }
      } else {
        // Fallback to string format
        return format.toLowerCase();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('ThumbnailService: Failed to get image format', { format, error: errorMessage });
      return 'png'; // Safe fallback
    }
  }
} 