/**
 * Media Extractor - Delegates to specialized media sub-extractors
 */
import { BaseShapeExtractor, ExtractorMetadata, ExtractionResult, ExtractionContext } from '../base/base-shape-extractor';
import { ConversionOptions } from '../../types/interfaces';
import { MediaExtractionResult } from '../base/extraction-interfaces';
import { PictureExtractor } from './media/picture-extractor';
import { VideoExtractor } from './media/video-extractor';
import { AudioExtractor } from './media/audio-extractor';

export class MediaExtractor extends BaseShapeExtractor {
  protected metadata: ExtractorMetadata = {
    name: 'MediaExtractor', version: '2.0.0',
    supportedShapeTypes: ['Picture', 'VideoFrame', 'AudioFrame'], extractorType: 'media'
  };

  private pictureExtractor = new PictureExtractor();
  private videoExtractor = new VideoExtractor();
  private audioExtractor = new AudioExtractor();

  constructor() { super(); }

  async extract(shape: any, options: ConversionOptions, context?: ExtractionContext): Promise<ExtractionResult> {
    const startTime = Date.now();
    try {
      if (!this.canHandle(shape)) {
        return this.createErrorResult('Shape is not a valid media object', Date.now() - startTime);
      }

      const baseProperties = this.extractBasicProperties(shape);
      const shapeType = this.getMediaShapeType(shape);
      let mediaData: MediaExtractionResult;

      switch (shapeType) {
        case 'Picture': mediaData = await this.pictureExtractor.extractPictureData(shape, options); break;
        case 'VideoFrame': mediaData = await this.videoExtractor.extractVideoData(shape, options); break;
        case 'AudioFrame': mediaData = await this.audioExtractor.extractAudioData(shape, options); break;
        default: throw new Error(`Unsupported media type: ${shapeType}`);
      }

      const result = { ...baseProperties, shapeType, mediaProperties: mediaData };
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
      return shapeType === ShapeType.Picture || shapeType === ShapeType.VideoFrame || shapeType === ShapeType.AudioFrame;
    } catch (error) {
      this.handleError(error as Error, 'canHandle');
      return false;
    }
  }

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
} 