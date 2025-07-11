/**
 * VideoExtension - Dynamic Extension for Video Processing
 * 
 * Dynamically loaded extension for video shape processing.
 * Demonstrates how new extensions can be added without code changes.
 */

import { logger } from '../../../utils/logger';
import { ExtensionInterface } from './chart-extension';

export default class VideoExtension implements ExtensionInterface {
  readonly name = 'video';
  readonly version = '1.0.0';
  readonly supportedTypes = ['VideoFrame', 'Video', 'MediaObject'];

  private aspose: any;

  constructor(dependencies: { aspose?: any } = {}) {
    this.aspose = dependencies.aspose;
    logger.info('VideoExtension instance created');
  }

  async initialize(): Promise<void> {
    logger.info('VideoExtension initialized');
  }

  async extract(shape: any, options: any = {}): Promise<any> {
    try {
      logger.info('VideoExtension processing video shape');

      if (!shape.getVideoData && !shape.getEmbeddedVideo) {
        return null;
      }

      const videoInfo = {
        type: 'video',
        properties: await this.extractVideoProperties(shape),
        playbackSettings: await this.extractPlaybackSettings(shape),
        thumbnail: await this.extractVideoThumbnail(shape),
        format: await this.extractVideoFormat(shape),
        metadata: {
          extractedBy: 'VideoExtension',
          version: this.version,
          extractedAt: new Date().toISOString()
        }
      };

      logger.info('Video extraction completed', { 
        hasProperties: !!videoInfo.properties,
        hasPlayback: !!videoInfo.playbackSettings
      });

      return videoInfo;

    } catch (error) {
      logger.error('Video extraction failed', { error: (error as Error).message });
      return null;
    }
  }

  // Subcomponent: extractVideoProperties
  async extractVideoProperties(shape: any): Promise<any> {
    try {
      const properties: any = {};

      if (shape.getVideoData) {
        const videoData = shape.getVideoData();
        
        properties.duration = videoData.getDuration ? videoData.getDuration() : 0;
        properties.frameRate = videoData.getFrameRate ? videoData.getFrameRate() : 0;
        properties.resolution = {
          width: videoData.getWidth ? videoData.getWidth() : 0,
          height: videoData.getHeight ? videoData.getHeight() : 0
        };
      }

      if (shape.getEmbeddedVideo) {
        const embeddedVideo = shape.getEmbeddedVideo();
        properties.embedded = true;
        properties.contentType = embeddedVideo.getContentType ? embeddedVideo.getContentType() : 'unknown';
      }

      return properties;

    } catch (error) {
      logger.warn('Failed to extract video properties', { error: (error as Error).message });
      return {};
    }
  }

  // Subcomponent: extractPlaybackSettings
  async extractPlaybackSettings(shape: any): Promise<any> {
    try {
      const playback: any = {};

      if (shape.getPlayMode) {
        playback.playMode = shape.getPlayMode().toString();
      }

      if (shape.getVolume) {
        playback.volume = shape.getVolume();
      }

      if (shape.getRewindMovie) {
        playback.rewind = shape.getRewindMovie();
      }

      if (shape.getFullScreenMode) {
        playback.fullScreen = shape.getFullScreenMode();
      }

      if (shape.getHideAtShowing) {
        playback.hideWhenNotPlaying = shape.getHideAtShowing();
      }

      return playback;

    } catch (error) {
      logger.warn('Failed to extract video playback settings', { error: (error as Error).message });
      return {};
    }
  }

  // Subcomponent: extractVideoThumbnail
  async extractVideoThumbnail(shape: any): Promise<any> {
    try {
      const thumbnail: any = {};

      if (shape.getPictureFormat && shape.getPictureFormat().getPicture()) {
        const picture = shape.getPictureFormat().getPicture();
        
        thumbnail.hasCustomThumbnail = true;
        thumbnail.format = picture.getImageFormat ? picture.getImageFormat().toString() : 'unknown';
        
        // Get thumbnail dimensions from shape geometry
        if (shape.getFrame) {
          const frame = shape.getFrame();
          thumbnail.dimensions = {
            width: frame.getWidth(),
            height: frame.getHeight(),
            x: frame.getX(),
            y: frame.getY()
          };
        }
      } else {
        thumbnail.hasCustomThumbnail = false;
      }

      return thumbnail;

    } catch (error) {
      logger.warn('Failed to extract video thumbnail', { error: (error as Error).message });
      return {};
    }
  }

  // Subcomponent: extractVideoFormat
  async extractVideoFormat(shape: any): Promise<any> {
    try {
      const format: any = {};

      if (shape.getEmbeddedVideo) {
        const embeddedVideo = shape.getEmbeddedVideo();
        
        format.embedded = true;
        format.contentType = embeddedVideo.getContentType ? embeddedVideo.getContentType() : 'unknown';
        format.size = embeddedVideo.getBinaryData ? embeddedVideo.getBinaryData().length : 0;
      }

      if (shape.getLinkPathLong) {
        format.external = true;
        format.path = shape.getLinkPathLong();
      }

      // Detect format from content type or file extension
      if (format.contentType) {
        format.codec = this.detectVideoCodec(format.contentType);
      } else if (format.path) {
        format.extension = this.extractFileExtension(format.path);
        format.codec = this.detectCodecFromExtension(format.extension);
      }

      return format;

    } catch (error) {
      logger.warn('Failed to extract video format', { error: (error as Error).message });
      return {};
    }
  }

  private detectVideoCodec(contentType: string): string {
    const codecMap: { [key: string]: string } = {
      'video/mp4': 'H.264',
      'video/avi': 'Various',
      'video/wmv': 'WMV',
      'video/mov': 'QuickTime',
      'video/webm': 'VP8/VP9'
    };

    return codecMap[contentType.toLowerCase()] || 'Unknown';
  }

  private extractFileExtension(path: string): string {
    const lastDot = path.lastIndexOf('.');
    return lastDot !== -1 ? path.substring(lastDot + 1).toLowerCase() : '';
  }

  private detectCodecFromExtension(extension: string): string {
    const extensionMap: { [key: string]: string } = {
      'mp4': 'H.264',
      'avi': 'Various',
      'wmv': 'WMV',
      'mov': 'QuickTime',
      'webm': 'VP8/VP9',
      'mkv': 'Various',
      'flv': 'Flash Video'
    };

    return extensionMap[extension] || 'Unknown';
  }

  async dispose(): Promise<void> {
    logger.info('VideoExtension disposed');
  }
} 