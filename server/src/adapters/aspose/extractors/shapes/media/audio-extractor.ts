import { z } from "zod";
/**
 * Audio Extractor - Specialized Component for Audio Frame Processing
 * 
 * Handles extraction of audio frames, playback settings, and audio data.
 * Part of the componentized media extraction system.
 */

import { logger } from '../../../../../utils/logger';
import { AudioExtractionResult } from '../../base/extraction-interfaces';
import { ConversionOptions } from '../../../types/interfaces';

export class AudioExtractor {
  
  /**
   * Extract audio data from shape
   */
  async extractAudioData(shape: any, options: ConversionOptions): Promise<AudioExtractionResult> {
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

  /**
   * Get audio file name
   */
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

  /**
   * Check if audio is embedded
   */
  private isAudioEmbedded(audioData: any): boolean {
    try {
      return audioData.getEmbeddedAudio() !== null;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if audio has data
   */
  private hasAudioData(audioData: any): boolean {
    try {
      const embeddedAudio = audioData.getEmbeddedAudio();
      return embeddedAudio && embeddedAudio.getBinaryData();
    } catch (error) {
      return false;
    }
  }

  /**
   * Get auto play setting
   */
  private getAudioAutoPlay(shape: any): boolean {
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
  private getAudioLoop(shape: any): boolean {
    try {
      return shape.getRewindAudio ? shape.getRewindAudio() : false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get volume setting
   */
  private getAudioVolume(shape: any): number {
    try {
      return shape.getVolume ? shape.getVolume() : 50;
    } catch (error) {
      return 50;
    }
  }

  /**
   * Get audio data size
   */
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

  /**
   * Get audio duration (placeholder - may need additional Aspose methods)
   */
  private getAudioDuration(audioData: any): number | undefined {
    try {
      // Duration extraction logic would go here
      // This may require additional Aspose.Slides methods
      return undefined;
    } catch (error) {
      return undefined;
    }
  }

  /**
   * Error handling
   */
  private handleError(error: Error, context: string): void {
    logger.error(`AudioExtractor - ${context}`, {
      error: error.message,
      context
    });
  }
} 