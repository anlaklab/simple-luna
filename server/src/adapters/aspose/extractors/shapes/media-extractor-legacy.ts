/**
 * Media Extractor - Unified Extractor for Media Shapes
 * 
 * Handles extraction of all media types:
 * - Picture/Image frames
 * - Video frames  
 * - Audio frames
 * 
 * Provides common media utilities and type-specific processing.
 */

import { BaseShapeExtractor, ExtractorMetadata, ExtractionResult, ExtractionContext } from '../base/base-shape-extractor';
import { ConversionOptions } from '../../types/interfaces';
import { PictureExtractionResult, VideoExtractionResult, AudioExtractionResult, MediaExtractionResult } from '../base/extraction-interfaces';

export class MediaExtractor extends BaseShapeExtractor {
  protected metadata: ExtractorMetadata = {
    name: 'MediaExtractor',
    version: '1.0.0',
    supportedShapeTypes: ['Picture', 'VideoFrame', 'AudioFrame'],
    extractorType: 'media'
  };

  // =============================================================================
  // MAIN EXTRACTION METHOD
  // =============================================================================

  async extract(
    shape: any, 
    options: ConversionOptions, 
    context?: ExtractionContext
  ): Promise<ExtractionResult> {
    const startTime = Date.now();

    try {
      if (!this.canHandle(shape)) {
        return this.createErrorResult('Shape is not a valid media object', Date.now() - startTime);
      }

      // Extract basic shape properties
      const baseProperties = this.extractBasicProperties(shape);
      
      // Determine media type and extract accordingly
      const shapeType = this.getMediaShapeType(shape);
      let mediaData: MediaExtractionResult;

      switch (shapeType) {
        case 'Picture':
          mediaData = await this.extractPictureData(shape, options);
          break;
        case 'VideoFrame':
          mediaData = await this.extractVideoData(shape, options);
          break;
        case 'AudioFrame':
          mediaData = await this.extractAudioData(shape, options);
          break;
        default:
          throw new Error(`Unsupported media type: ${shapeType}`);
      }

      const result = {
        ...baseProperties,
        shapeType,
        mediaProperties: mediaData
      };

      this.logSuccess(`${shapeType.toLowerCase()} extraction`, result, Date.now() - startTime);
      return this.createSuccessResult(result, Date.now() - startTime);

    } catch (error) {
      this.handleError(error as Error, 'extract');
      return this.createErrorResult((error as Error).message, Date.now() - startTime);
    }
  }

  canHandle(shape: any): boolean {
    try {
      const AsposeSlides = require('../../../../../lib/aspose.slides.js');
      const ShapeType = AsposeSlides.ShapeType;
      const shapeType = shape.getShapeType();
      
      return shapeType === ShapeType.Picture || 
             shapeType === ShapeType.VideoFrame || 
             shapeType === ShapeType.AudioFrame;
    } catch (error) {
      this.handleError(error as Error, 'canHandle');
      return false;
    }
  }

  // =============================================================================
  // MEDIA TYPE DETECTION
  // =============================================================================

  private getMediaShapeType(shape: any): string {
    try {
      const AsposeSlides = require('../../../../../lib/aspose.slides.js');
      const ShapeType = AsposeSlides.ShapeType;
      const shapeType = shape.getShapeType();

      if (shapeType === ShapeType.Picture) return 'Picture';
      if (shapeType === ShapeType.VideoFrame) return 'VideoFrame';
      if (shapeType === ShapeType.AudioFrame) return 'AudioFrame';
      
      return 'Unknown';
    } catch (error) {
      this.handleError(error as Error, 'getMediaShapeType');
      return 'Unknown';
    }
  }

  // =============================================================================
  // PICTURE EXTRACTION
  // =============================================================================

  private async extractPictureData(shape: any, options: ConversionOptions): Promise<PictureExtractionResult> {
    try {
      const pictureFormat = shape.getPictureFormat();
      if (!pictureFormat) {
        throw new Error('Picture format not available');
      }

      const picture = pictureFormat.getPicture();
      if (!picture) {
        throw new Error('Picture data not available');
      }

      const result: PictureExtractionResult = {
        mediaType: 'picture',
        fileName: this.getPictureFileName(picture),
        originalSize: this.getPictureOriginalSize(picture),
        embedded: this.isPictureEmbedded(picture),
        hasData: true,
        preserveAspectRatio: this.getPreserveAspectRatio(pictureFormat),
        mimeType: this.getPictureMimeType(picture)
      };

      // Extract image data if requested
      if (options.extractImages && options.includeAssets) {
        result.imageData = await this.extractImageData(picture);
        result.dataSize = result.imageData ? result.imageData.length : 0;
      }

      // Extract crop settings
      result.cropSettings = this.extractCropSettings(pictureFormat);

      return result;

    } catch (error) {
      this.handleError(error as Error, 'extractPictureData');
      return {
        mediaType: 'picture',
        embedded: false,
        hasData: false,
        preserveAspectRatio: true
      };
    }
  }

  private getPictureFileName(picture: any): string {
    try {
      return picture.getName ? picture.getName() : 'image';
    } catch (error) {
      return 'image';
    }
  }

  private getPictureOriginalSize(picture: any): { width: number; height: number } {
    try {
      return {
        width: picture.getWidth ? picture.getWidth() : 0,
        height: picture.getHeight ? picture.getHeight() : 0
      };
    } catch (error) {
      return { width: 0, height: 0 };
    }
  }

  private isPictureEmbedded(picture: any): boolean {
    try {
      return picture.getBinaryData ? true : false;
    } catch (error) {
      return false;
    }
  }

  private getPreserveAspectRatio(pictureFormat: any): boolean {
    try {
      const fillMode = pictureFormat.getPictureFillMode();
      return fillMode === 0; // 0 = Stretch (preserve aspect ratio)
    } catch (error) {
      return true;
    }
  }

  private getPictureMimeType(picture: any): string {
    try {
      const contentType = picture.getContentType();
      return contentType || 'image/jpeg';
    } catch (error) {
      return 'image/jpeg';
    }
  }

  private async extractImageData(picture: any): Promise<string | undefined> {
    try {
      const binaryData = picture.getBinaryData();
      if (binaryData) {
        return Buffer.from(binaryData).toString('base64');
      }
      return undefined;
    } catch (error) {
      this.handleError(error as Error, 'extractImageData');
      return undefined;
    }
  }

  private extractCropSettings(pictureFormat: any): PictureExtractionResult['cropSettings'] {
    try {
      const cropLeft = pictureFormat.getCropLeft ? pictureFormat.getCropLeft() : 0;
      const cropRight = pictureFormat.getCropRight ? pictureFormat.getCropRight() : 0;
      const cropTop = pictureFormat.getCropTop ? pictureFormat.getCropTop() : 0;
      const cropBottom = pictureFormat.getCropBottom ? pictureFormat.getCropBottom() : 0;

      if (cropLeft || cropRight || cropTop || cropBottom) {
        return { left: cropLeft, right: cropRight, top: cropTop, bottom: cropBottom };
      }
      return undefined;
    } catch (error) {
      return undefined;
    }
  }

  // =============================================================================
  // VIDEO EXTRACTION
  // =============================================================================

  private async extractVideoData(shape: any, options: ConversionOptions): Promise<VideoExtractionResult> {
    try {
      const videoData = shape.getVideoData();
      if (!videoData) {
        throw new Error('Video data not available');
      }

      const result: VideoExtractionResult = {
        mediaType: 'video',
        fileName: this.getVideoFileName(videoData),
        embedded: this.isVideoEmbedded(videoData),
        hasData: this.hasVideoData(videoData),
        autoPlay: this.getVideoAutoPlay(shape),
        loop: this.getVideoLoop(shape),
        volume: this.getVideoVolume(shape)
      };

      // Extract video file information
      if (videoData.getLinkPathLong) {
        result.linkPath = videoData.getLinkPathLong();
      }

      // Extract embedded video data size
      if (result.embedded && result.hasData) {
        result.dataSize = this.getVideoDataSize(videoData);
      }

      // Extract video duration if available
      result.duration = this.getVideoDuration(videoData);

      // Extract thumbnail if available
      if (options.includeAssets) {
        result.thumbnail = await this.extractVideoThumbnail(shape);
      }

      return result;

    } catch (error) {
      this.handleError(error as Error, 'extractVideoData');
      return {
        mediaType: 'video',
        embedded: false,
        hasData: false,
        autoPlay: false,
        loop: false,
        volume: 50
      };
    }
  }

  private getVideoFileName(videoData: any): string {
    try {
      const embeddedVideo = videoData.getEmbeddedVideo();
      if (embeddedVideo && embeddedVideo.getName) {
        return embeddedVideo.getName();
      }
      return 'video';
    } catch (error) {
      return 'video';
    }
  }

  private isVideoEmbedded(videoData: any): boolean {
    try {
      return videoData.getEmbeddedVideo() !== null;
    } catch (error) {
      return false;
    }
  }

  private hasVideoData(videoData: any): boolean {
    try {
      const embeddedVideo = videoData.getEmbeddedVideo();
      return embeddedVideo && embeddedVideo.getBinaryData();
    } catch (error) {
      return false;
    }
  }

  private getVideoAutoPlay(shape: any): boolean {
    try {
      const playMode = shape.getPlayMode();
      return playMode === 1; // 1 = Auto
    } catch (error) {
      return false;
    }
  }

  private getVideoLoop(shape: any): boolean {
    try {
      return shape.getRewindVideo ? shape.getRewindVideo() : false;
    } catch (error) {
      return false;
    }
  }

  private getVideoVolume(shape: any): number {
    try {
      return shape.getVolume ? shape.getVolume() : 50;
    } catch (error) {
      return 50;
    }
  }

  private getVideoDataSize(videoData: any): number {
    try {
      const embeddedVideo = videoData.getEmbeddedVideo();
      if (embeddedVideo && embeddedVideo.getBinaryData) {
        return embeddedVideo.getBinaryData().length;
      }
      return 0;
    } catch (error) {
      return 0;
    }
  }

  private getVideoDuration(videoData: any): number | undefined {
    try {
      // Duration extraction logic would go here
      // This may require additional Aspose.Slides methods
      return undefined;
    } catch (error) {
      return undefined;
    }
  }

  private async extractVideoThumbnail(shape: any): Promise<PictureExtractionResult | undefined> {
    try {
      // Extract video thumbnail if available
      const thumbnail = shape.getThumbnail ? shape.getThumbnail() : null;
      if (thumbnail) {
        // Convert thumbnail to picture extraction result
        return {
          mediaType: 'picture',
          embedded: true,
          hasData: true,
          preserveAspectRatio: true,
          mimeType: 'image/jpeg'
        };
      }
      return undefined;
    } catch (error) {
      return undefined;
    }
  }

  // =============================================================================
  // AUDIO EXTRACTION
  // =============================================================================

  private async extractAudioData(shape: any, options: ConversionOptions): Promise<AudioExtractionResult> {
    try {
      const audioData = shape.getAudioData();
      if (!audioData) {
        throw new Error('Audio data not available');
      }

      const result: AudioExtractionResult = {
        mediaType: 'audio',
        fileName: this.getAudioFileName(audioData),
        embedded: this.isAudioEmbedded(audioData),
        hasData: this.hasAudioData(audioData),
        autoPlay: this.getAudioAutoPlay(shape),
        loop: this.getAudioLoop(shape),
        volume: this.getAudioVolume(shape)
      };

      // Extract audio file information
      if (audioData.getLinkPathLong) {
        result.linkPath = audioData.getLinkPathLong();
      }

      // Extract embedded audio data size
      if (result.embedded && result.hasData) {
        result.dataSize = this.getAudioDataSize(audioData);
      }

      // Extract audio duration if available
      result.duration = this.getAudioDuration(audioData);

      return result;

    } catch (error) {
      this.handleError(error as Error, 'extractAudioData');
      return {
        mediaType: 'audio',
        embedded: false,
        hasData: false,
        autoPlay: false,
        loop: false,
        volume: 50
      };
    }
  }

  private getAudioFileName(audioData: any): string {
    try {
      const embeddedAudio = audioData.getEmbeddedAudio();
      if (embeddedAudio && embeddedAudio.getName) {
        return embeddedAudio.getName();
      }
      return 'audio';
    } catch (error) {
      return 'audio';
    }
  }

  private isAudioEmbedded(audioData: any): boolean {
    try {
      return audioData.getEmbeddedAudio() !== null;
    } catch (error) {
      return false;
    }
  }

  private hasAudioData(audioData: any): boolean {
    try {
      const embeddedAudio = audioData.getEmbeddedAudio();
      return embeddedAudio && embeddedAudio.getBinaryData();
    } catch (error) {
      return false;
    }
  }

  private getAudioAutoPlay(shape: any): boolean {
    try {
      const playMode = shape.getPlayMode();
      return playMode === 1; // 1 = Auto
    } catch (error) {
      return false;
    }
  }

  private getAudioLoop(shape: any): boolean {
    try {
      return shape.getRewindAudio ? shape.getRewindAudio() : false;
    } catch (error) {
      return false;
    }
  }

  private getAudioVolume(shape: any): number {
    try {
      return shape.getVolume ? shape.getVolume() : 50;
    } catch (error) {
      return 50;
    }
  }

  private getAudioDataSize(audioData: any): number {
    try {
      const embeddedAudio = audioData.getEmbeddedAudio();
      if (embeddedAudio && embeddedAudio.getBinaryData) {
        return embeddedAudio.getBinaryData().length;
      }
      return 0;
    } catch (error) {
      return 0;
    }
  }

  private getAudioDuration(audioData: any): number | undefined {
    try {
      // Duration extraction logic would go here
      // This may require additional Aspose.Slides methods
      return undefined;
    } catch (error) {
      return undefined;
    }
  }
} 