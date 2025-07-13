import { z } from "zod";
/**
 * Video Extractor - Specialized Component for Video Frame Processing
 * 
 * Handles extraction of video frames, playback settings, and media data.
 * Part of the componentized media extraction system.
 */

import { logger } from '../../../../../utils/logger';
import { VideoExtractionResult, PictureExtractionResult } from '../../base/extraction-interfaces';
import { ConversionOptions } from '../../../types/interfaces';

export class VideoExtractor {
  
  /**
   * Extract video data from shape
   */
  async extractVideoData(shape: any, options: ConversionOptions): Promise<VideoExtractionResult> {
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

      // Extract thumbnail if requested
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

  /**
   * Get video file name
   */
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

  /**
   * Check if video is embedded
   */
  private isVideoEmbedded(videoData: any): boolean {
    try {
      return videoData.getEmbeddedVideo() !== null;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if video has data
   */
  private hasVideoData(videoData: any): boolean {
    try {
      const embeddedVideo = videoData.getEmbeddedVideo();
      return embeddedVideo && embeddedVideo.getBinaryData();
    } catch (error) {
      return false;
    }
  }

  /**
   * Get auto play setting
   */
  private getVideoAutoPlay(shape: any): boolean {
    try {
      const playMode = shape.getPlayMode();
      return playMode === 1; // 1 = Auto
    } catch (error) {
      return false;
    }
  }

  /**
   * Get loop setting
   */
  private getVideoLoop(shape: any): boolean {
    try {
      return shape.getRewindVideo ? shape.getRewindVideo() : false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get volume setting
   */
  private getVideoVolume(shape: any): number {
    try {
      return shape.getVolume ? shape.getVolume() : 50;
    } catch (error) {
      return 50;
    }
  }

  /**
   * Get video data size
   */
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

  /**
   * Get video duration (placeholder - may need additional Aspose methods)
   */
  private getVideoDuration(videoData: any): number | undefined {
    try {
      // Duration extraction logic would go here
      // This may require additional Aspose.Slides methods
      return undefined;
    } catch (error) {
      return undefined;
    }
  }

  /**
   * Extract video thumbnail
   */
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

  /**
   * Error handling
   */
  private handleError(error: Error, context: string): void {
    logger.error(`VideoExtractor - ${context}`, {
      error: error.message,
      context
    });
  }
} 