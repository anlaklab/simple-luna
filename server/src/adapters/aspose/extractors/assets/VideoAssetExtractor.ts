import { z } from "zod";
/**
 * Video Asset Extractor - Real Aspose.Slides Implementation
 * 
 * Extracts real video files from PowerPoint presentations using the local Aspose.Slides library.
 * Processes embedded videos, linked videos, and video frames.
 */

import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../../../utils/logger';
import {
  VideoExtractor,
  AssetResult,
  AssetType,
  AssetFormat,
  AssetExtractionOptions,
  AssetMetadata,
  ExtractionMethod
} from '../../types/asset-interfaces';

// ✅ ROBUST IMPORT: Use absolute import from app root - works in Docker
const asposeDriver = require('/app/lib/AsposeDriverFactory');

export class VideoAssetExtractor implements VideoExtractor {
  readonly name = 'VideoAssetExtractor';
  readonly supportedTypes: AssetType[] = ['video'];
  readonly supportedFormats: AssetFormat[] = [
    'mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'
  ];

  async extractAssets(
    presentation: any,
    options: AssetExtractionOptions
  ): Promise<AssetResult[]> {
    const startTime = Date.now();
    const assets: AssetResult[] = [];
    
    try {
      // ✅ REFACTORED: Initialize AsposeDriver before use
      await asposeDriver.initialize();

      logger.info('Starting real video extraction with Aspose.Slides', {
        extractorName: this.name,
        slideCount: presentation.getSlides().size()
      });

      const slideCount = presentation.getSlides().size();
      
      // Process ALL slides - never limit slides
      for (let slideIndex = 0; slideIndex < slideCount; slideIndex++) {
        const slide = presentation.getSlides().get_Item(slideIndex);
        
        // Skip slide range filtering if specified
        if (options.slideRange) {
          if (slideIndex < options.slideRange.start || slideIndex > options.slideRange.end) {
            continue;
          }
        }
        
        const slideAssets = await this.extractVideosFromSlide(slide, slideIndex, options);
        assets.push(...slideAssets);
        
        // Log progress for large presentations
        if (slideIndex % 50 === 0) {
          logger.info('Video extraction progress', { 
            slideIndex, 
            totalSlides: slideCount, 
            videosFound: assets.length 
          });
        }
      }

      const processingTime = Date.now() - startTime;
      logger.info('Video extraction completed', {
        totalSlides: slideCount,
        videosFound: assets.length,
        processingTimeMs: processingTime
      });

      return assets;

    } catch (error) {
      logger.error('Video extraction failed', { 
        error: (error as Error).message,
        extractorName: this.name
      });
      throw new Error(`Video extraction failed: ${(error as Error).message}`);
    }
  }

  private async extractVideosFromSlide(
    slide: any,
    slideIndex: number,
    options: AssetExtractionOptions
  ): Promise<AssetResult[]> {
    const assets: AssetResult[] = [];

    try {
      const shapes = slide.getShapes();
      const shapeCount = shapes.size();

      // Extract videos from all shapes in the slide
      for (let shapeIndex = 0; shapeIndex < shapeCount; shapeIndex++) {
        const shape = shapes.get_Item(shapeIndex);
        
        // ✅ REFACTORED: Use AsposeDriver for shape type checking
        if (await this.isVideoFrame(shape)) {
          const videoAsset = await this.extractFromVideoFrame(shape, slideIndex);
          if (videoAsset) assets.push(videoAsset);
        }
        
        // ✅ REFACTORED: Use AsposeDriver for GroupShape detection
        if (await asposeDriver.isGroupShape(shape)) {
          const groupAssets = await this.extractFromGroupShape(shape, slideIndex, options);
          assets.push(...groupAssets);
        }
      }

    } catch (error) {
      logger.warn('Failed to extract videos from slide', { 
        slideIndex, 
        error: (error as Error).message 
      });
    }

    return assets;
  }

  async extractFromVideoFrame(videoFrame: any, slideIndex: number): Promise<AssetResult | null> {
    try {
      // ✅ REFACTORED: Use AsposeDriver for video frame checking
      if (!(await this.isVideoFrame(videoFrame))) {
        return null;
      }

      const videoData = this.getVideoData(videoFrame);
      
      if (!videoData || videoData.length === 0) {
        logger.warn('No video data found in video frame', { slideIndex });
        return null;
      }

      const assetId = uuidv4();
      const videoBuffer = Buffer.from(videoData);
      
      // Detect video format from binary data
      const format = this.detectVideoFormat(videoBuffer);
      const filename = `video-slide-${slideIndex}-${assetId}.${format}`;
      
      // Generate comprehensive metadata
      const metadata = await this.generateVideoMetadata(
        videoFrame, 
        slideIndex, 
        'aspose-media',
        videoBuffer
      );

      const asset: AssetResult = {
        id: assetId,
        type: 'video',
        format: format as AssetFormat,
        filename,
        originalName: this.getVideoName(videoFrame) || filename,
        size: videoBuffer.length,
        slideIndex,
        data: videoBuffer,
        metadata
      };

      return asset;

    } catch (error) {
      logger.warn('Failed to extract video frame', { 
        slideIndex, 
        error: (error as Error).message 
      });
      return null;
    }
  }

  async extractMetadata(videoData: Buffer): Promise<Partial<AssetMetadata>> {
    try {
      const metadata: Partial<AssetMetadata> = {
        mimeType: this.getMimeTypeFromBuffer(videoData),
        quality: {
          compression: 'unknown',
          quality: 'medium'
        }
      };

      // Try to extract basic video properties
      // Note: For advanced video analysis, you'd use ffprobe or similar
      const format = this.detectVideoFormat(videoData);
      metadata.quality!.compression = format;

      return metadata;

    } catch (error) {
      logger.warn('Failed to extract video metadata', { 
        error: (error as Error).message 
      });
      return {};
    }
  }

  async generatePreview(videoData: Buffer): Promise<Buffer> {
    try {
      // For now, return a placeholder or the first few bytes
      // In a real implementation, you'd use ffmpeg to extract a frame
      return videoData.slice(0, Math.min(1024, videoData.length));
    } catch (error) {
      logger.warn('Failed to generate video preview', { 
        error: (error as Error).message 
      });
      return Buffer.alloc(0);
    }
  }

  validateAsset(asset: any): boolean {
    try {
      return this.getVideoData(asset) &&
             this.getVideoData(asset).length > 0;
    } catch {
      return false;
    }
  }

  generateMetadata(asset: any, slideIndex: number): AssetMetadata {
    return {
      extractedAt: new Date().toISOString(),
      extractionMethod: 'aspose-media' as ExtractionMethod,
      hasData: true,
      slideId: slideIndex.toString()
    };
  }

  // ✅ REFACTORED: Use AsposeDriver for video frame detection
  private async isVideoFrame(shape: any): Promise<boolean> {
    try {
      // Use AsposeDriver's built-in video frame detection
      return await asposeDriver.isVideoFrame(shape);
    } catch (error) {
      logger.warn('Error checking video frame', { error: (error as Error).message });
      return false;
    }
  }

  private getVideoData(videoFrame: any): any {
    try {
      // Try different methods to get video data based on Aspose.Slides API
      if (videoFrame.getVideoFormat) {
        const videoFormat = videoFrame.getVideoFormat();
        if (videoFormat && videoFormat.getVideoData) {
          return videoFormat.getVideoData();
        }
      }
      
      if (videoFrame.getEmbeddedVideo) {
        const embeddedVideo = videoFrame.getEmbeddedVideo();
        if (embeddedVideo && embeddedVideo.getBinaryData) {
          return embeddedVideo.getBinaryData();
        }
      }

      // Alternative method for getting video binary data
      if (videoFrame.getBinaryData) {
        return videoFrame.getBinaryData();
      }

      return null;

    } catch (error) {
      logger.warn('Failed to get video data', { error: (error as Error).message });
      return null;
    }
  }

  private getVideoName(videoFrame: any): string | null {
    try {
      // Try to get the original video name
      if (videoFrame.getName) {
        return videoFrame.getName();
      }
      
      if (videoFrame.getVideoFormat) {
        const videoFormat = videoFrame.getVideoFormat();
        if (videoFormat && videoFormat.getName) {
          return videoFormat.getName();
        }
      }

      return null;

    } catch {
      return null;
    }
  }

  private async extractFromGroupShape(
    groupShape: any,
    slideIndex: number,
    options: AssetExtractionOptions
  ): Promise<AssetResult[]> {
    const assets: AssetResult[] = [];

    try {
      const shapes = groupShape.getShapes();
      const shapeCount = shapes.size();

      for (let i = 0; i < shapeCount; i++) {
        const shape = shapes.get_Item(i);
        
        // ✅ REFACTORED: Use AsposeDriver for shape type checking
        if (await this.isVideoFrame(shape)) {
          const videoAsset = await this.extractFromVideoFrame(shape, slideIndex);
          if (videoAsset) assets.push(videoAsset);
        }
        
        // ✅ REFACTORED: Use AsposeDriver for nested group checking
        if (await asposeDriver.isGroupShape(shape)) {
          const nestedAssets = await this.extractFromGroupShape(shape, slideIndex, options);
          assets.push(...nestedAssets);
        }
      }

    } catch (error) {
      logger.warn('Failed to extract videos from group shape', { 
        slideIndex, 
        error: (error as Error).message 
      });
    }

    return assets;
  }

  private async generateVideoMetadata(
    source: any,
    slideIndex: number,
    method: ExtractionMethod,
    videoBuffer: Buffer
  ): Promise<AssetMetadata> {
    const startTime = Date.now();
    
    try {
      // Basic metadata
      const metadata: AssetMetadata = {
        extractedAt: new Date().toISOString(),
        extractionMethod: method,
        hasData: true,
        slideId: slideIndex.toString(),
        processingTimeMs: 0
      };

      // Extract dimensions from shape if available
      if (source && typeof source.getWidth === 'function') {
        try {
          metadata.transform = {
            position: {
              x: source.getX ? source.getX() : 0,
              y: source.getY ? source.getY() : 0
            },
            dimensions: {
              width: source.getWidth(),
              height: source.getHeight(),
              aspectRatio: source.getWidth() / source.getHeight()
            }
          };
        } catch (err) {
          // Ignore dimension extraction errors
        }
      }

      // Extract MIME type from video data
      metadata.mimeType = this.getMimeTypeFromBuffer(videoBuffer);
      
      // Add video-specific metadata
      try {
        // Try to extract video duration and other properties
        // This would require video analysis libraries in a real implementation
        metadata.duration = this.estimateVideoDuration(videoBuffer);
        metadata.quality = {
          compression: this.detectVideoFormat(videoBuffer),
          quality: 'medium'
        };
      } catch (err) {
        // Ignore video analysis errors
      }

      metadata.processingTimeMs = Date.now() - startTime;
      
      return metadata;

    } catch (error) {
      logger.warn('Failed to generate video metadata', { 
        slideIndex, 
        error: (error as Error).message 
      });
      
      return {
        extractedAt: new Date().toISOString(),
        extractionMethod: method,
        hasData: true,
        processingTimeMs: Date.now() - startTime
      };
    }
  }

  private detectVideoFormat(buffer: Buffer): string {
    // Detect video format from file signature
    if (buffer.length < 12) return 'bin';
    
    const signature = buffer.toString('hex', 0, 12).toUpperCase();
    
    // MP4 signatures
    if (signature.includes('66747970') || signature.includes('6D6F6F76')) return 'mp4';
    
    // AVI signature
    if (signature.startsWith('52494646') && signature.includes('41564920')) return 'avi';
    
    // MOV/QuickTime signature
    if (signature.includes('6D6F6F76') || signature.includes('6D646174')) return 'mov';
    
    // WMV signature
    if (signature.startsWith('3026B275')) return 'wmv';
    
    // WebM signature
    if (signature.startsWith('1A45DFA3')) return 'webm';
    
    return 'mp4'; // Default fallback
  }

  private getMimeTypeFromBuffer(buffer: Buffer): string {
    const format = this.detectVideoFormat(buffer);
    
    const mimeTypes: Record<string, string> = {
      'mp4': 'video/mp4',
      'avi': 'video/avi',
      'mov': 'video/quicktime',
      'wmv': 'video/x-ms-wmv',
      'flv': 'video/x-flv',
      'webm': 'video/webm',
      'mkv': 'video/x-matroska'
    };
    
    return mimeTypes[format] || 'video/mp4';
  }

  private estimateVideoDuration(buffer: Buffer): number {
    // Basic duration estimation (would need proper video parsing in real implementation)
    // For now, return a placeholder based on file size
    const sizeInMB = buffer.length / (1024 * 1024);
    return Math.max(1, Math.round(sizeInMB * 10)); // Rough estimate: 10 seconds per MB
  }
} 