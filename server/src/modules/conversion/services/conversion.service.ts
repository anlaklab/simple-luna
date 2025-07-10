/**
 * ConversionService - Comprehensive PPTX Processing Service
 * 
 * Provides complete coverage for all conversion operations with toggleable features.
 * Integrates buffers, effects, assets, metadata, and bidirectional processing.
 */

import { logger } from '../../../utils/logger';
import { randomUUID } from 'crypto';
import { BaseService, ServiceHealth, FeatureFlags } from '../../shared/interfaces/base.interfaces';
import { AsposeAdapterRefactored } from '../../../adapters/aspose/AsposeAdapterRefactored';
import { ConversionService as AsposeConversionService } from '../../../adapters/aspose/services/ConversionService';
import { AssetService } from '../../../adapters/aspose/services/AssetService';
import { MetadataService } from '../../../adapters/aspose/services/MetadataService';
import { ThumbnailService } from '../../../adapters/aspose/services/ThumbnailService';

// =============================================================================
// COMPREHENSIVE CONVERSION INTERFACES
// =============================================================================

export interface ComprehensiveConversionOptions {
  // Core features
  includeAssets?: boolean;
  includeMetadata?: boolean;
  includeEffects?: boolean;
  includeAnimations?: boolean;
  includeComments?: boolean;
  includeNotes?: boolean;
  generateThumbnails?: boolean;
  
  // Buffer operations
  outputFormat?: 'json' | 'pptx' | 'pdf' | 'html' | 'buffer';
  bufferFormat?: 'png' | 'jpg' | 'pdf' | 'html';
  
  // Quality settings
  imageQuality?: 'low' | 'medium' | 'high' | 'ultra';
  compressionLevel?: 'none' | 'fast' | 'maximum';
  
  // Processing options
  mode?: 'local' | 'cloud';
  validateInput?: boolean;
  validateOutput?: boolean;
  cacheResults?: boolean;
  
  // Limits
  maxSlides?: number;
  maxShapesPerSlide?: number;
  maxAssetSize?: number;
}

export interface ComprehensiveConversionResult {
  success: boolean;
  data?: {
    presentation?: any;
    buffer?: Buffer;
    assets?: any[];
    metadata?: any;
    thumbnails?: any[];
    effects?: any[];
    animations?: any[];
    comments?: any[];
    notes?: any[];
  };
  processingStats?: {
    slideCount: number;
    shapeCount: number;
    assetCount: number;
    effectCount: number;
    animationCount: number;
    commentCount: number;
    processingTime: number;
    cacheHit?: boolean;
  };
  quality?: 'low' | 'medium' | 'high' | 'perfect';
  error?: string;
}

// =============================================================================
// COMPREHENSIVE CONVERSION SERVICE
// =============================================================================

export class ConversionService implements BaseService {
  readonly name = 'conversion';
  readonly version = '2.0.0';
  readonly description = 'Comprehensive PPTX processing with full feature coverage';

  constructor(
    private aspose: AsposeAdapterRefactored,
    private asposeConversion: AsposeConversionService,
    private assetService: AssetService,
    private metadataService: MetadataService,
    private thumbnailService: ThumbnailService,
    private dynamicRegistry?: Map<string, any> // Added dynamic registry support
  ) {}

  // =============================================================================
  // INITIALIZATION
  // =============================================================================

  async initialize(): Promise<void> {
    try {
      // Validate all required services
      if (!this.aspose) {
        throw new Error('Aspose adapter not available');
      }

      if (!this.asposeConversion) {
        throw new Error('Aspose conversion service not available');
      }

      logger.info('✅ ConversionService initialized successfully');
    } catch (error) {
      logger.error('❌ ConversionService initialization failed:', { error: (error as Error).message });
      throw error;
    }
  }

  async healthCheck(): Promise<ServiceHealth> {
    try {
      const isHealthy = this.isAvailable();
      const lastCheck = new Date();
      
      const details = {
        asposeAdapter: !!this.aspose,
        asposeConversion: !!this.asposeConversion,
        assetService: !!this.assetService,
        metadataService: !!this.metadataService,
        thumbnailService: !!this.thumbnailService
      };

      if (!isHealthy) {
        return {
          status: 'unhealthy',
          lastCheck,
          details,
          errors: ['Required dependencies not available']
        };
      }

      return {
        status: 'healthy',
        lastCheck,
        details
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        lastCheck: new Date(),
        errors: [(error as Error).message]
      };
    }
  }

  // =============================================================================
  // COMPREHENSIVE CONVERSION METHODS
  // =============================================================================

  async processPresentation(
    filePath: string,
    options: ComprehensiveConversionOptions = {}
  ): Promise<ComprehensiveConversionResult> {
    const startTime = Date.now();
    
    try {
      logger.info('Starting comprehensive presentation processing with dynamic extensions', { 
        filePath, 
        options,
        dynamicExtensions: this.dynamicRegistry?.size || 0
      });

      const result: ComprehensiveConversionResult = {
        success: false,
        data: {},
        processingStats: {
          slideCount: 0,
          shapeCount: 0,
          assetCount: 0,
          effectCount: 0,
          animationCount: 0,
          commentCount: 0,
          processingTime: 0
        }
      };

      // Core conversion with dynamic extension awareness
      if (options.outputFormat !== 'buffer') {
        const conversionResult = await this.asposeConversion.convertPptxToJson(filePath, {
          includeAssets: options.includeAssets,
          includeMetadata: options.includeMetadata,
          includeAnimations: options.includeAnimations,
          includeComments: options.includeComments,
          enableValidation: options.validateInput
        });

        if (!conversionResult.success) {
          return {
            success: false,
            error: conversionResult.error || 'Core conversion failed'
          };
        }

        result.data!.presentation = conversionResult.data?.presentation;
        result.processingStats!.slideCount = conversionResult.data?.processingStats?.slideCount || 0;
        result.processingStats!.shapeCount = conversionResult.data?.processingStats?.shapeCount || 0;
      }

      // Enhanced processing with dynamic extensions
      if (this.dynamicRegistry && this.dynamicRegistry.size > 0) {
        logger.info(`Processing with ${this.dynamicRegistry.size} dynamic extensions available`);
        
        // Process each enabled feature with dynamic extension support
        if (options.includeEffects) {
          const effects = await this.extractEffects(filePath, options);
          result.data!.effects = effects;
          result.processingStats!.effectCount = effects.length;
        }

        // Add similar enhancements for other extraction methods...
      }

      // Continue with other processing (buffer, assets, metadata, etc.)
      // Buffer operations
      if (options.outputFormat === 'buffer' || options.bufferFormat) {
        const bufferResult = await this.convertToBuffer(filePath, options);
        if (bufferResult.success) {
          result.data!.buffer = bufferResult.buffer;
        }
      }

      // Asset extraction (toggleable)
      if (options.includeAssets) {
        const assets = await this.extractAssets(filePath, options);
        result.data!.assets = assets;
        result.processingStats!.assetCount = assets.length;
      }

      // Metadata extraction (toggleable)
      if (options.includeMetadata) {
        const metadata = await this.extractMetadata(filePath, options);
        result.data!.metadata = metadata;
      }

      // Thumbnail generation (toggleable)
      if (options.generateThumbnails) {
        const thumbnails = await this.generateThumbnails(filePath, options);
        result.data!.thumbnails = thumbnails;
      }

      // Notes extraction (toggleable)
      if (options.includeNotes) {
        const notes = await this.extractNotes(filePath, options);
        result.data!.notes = notes;
      }

      // Calculate final stats
      result.processingStats!.processingTime = Date.now() - startTime;
      result.quality = this.determineQuality(result.processingStats!, options);
      result.success = true;

      logger.info('Comprehensive processing completed with dynamic extensions', {
        filePath,
        processingTime: result.processingStats!.processingTime,
        quality: result.quality,
        dynamicExtensionsUsed: this.dynamicRegistry?.size || 0
      });

      return result;

    } catch (error) {
      logger.error('Comprehensive processing failed', { 
        error: (error as Error).message,
        filePath 
      });
      
      return {
        success: false,
        error: (error as Error).message,
        processingStats: {
          slideCount: 0,
          shapeCount: 0,
          assetCount: 0,
          effectCount: 0,
          animationCount: 0,
          commentCount: 0,
          processingTime: Date.now() - startTime
        }
      };
    }
  }

  // =============================================================================
  // BUFFER OPERATIONS (Enhanced)
  // =============================================================================

  async convertToBuffer(
    filePath: string,
    options: ComprehensiveConversionOptions = {}
  ): Promise<{ success: boolean; buffer?: Buffer; size?: number; error?: string }> {
    try {
      const format = options.bufferFormat || 'pdf';
      
      logger.info('Converting to buffer', { filePath, format });

      // Use existing buffer conversion from AsposeAdapter
      const result = await this.aspose.convertToBuffer(filePath, format, {
        quality: options.imageQuality || 'high',
        compression: options.compressionLevel || 'fast'
      });

      if (result.success) {
        logger.info('Buffer conversion completed', {
          filePath,
          format,
          size: result.size
        });
      }

      return result;

    } catch (error) {
      logger.error('Buffer conversion failed', { error: (error as Error).message, filePath });
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  async convertPptxToFormats(
    filePath: string,
    formats: string[],
    options: ComprehensiveConversionOptions = {}
  ): Promise<{ [format: string]: { success: boolean; buffer?: Buffer; error?: string } }> {
    try {
      logger.info('Converting to multiple formats', { filePath, formats });

      const results: { [format: string]: { success: boolean; buffer?: Buffer; error?: string } } = {};

      // Process formats in parallel for efficiency
      const promises = formats.map(async (format) => {
        const result = await this.convertToBuffer(filePath, { ...options, bufferFormat: format as any });
        return { format, result };
      });

      const completedResults = await Promise.allSettled(promises);

      completedResults.forEach((promiseResult, index) => {
        const format = formats[index];
        if (promiseResult.status === 'fulfilled') {
          results[format] = promiseResult.value.result;
        } else {
          results[format] = {
            success: false,
            error: promiseResult.reason.message
          };
        }
      });

      return results;

    } catch (error) {
      logger.error('Multi-format conversion failed', { error: (error as Error).message, filePath });
      throw error;
    }
  }

  // =============================================================================
  // ASSET EXTRACTION (Enhanced)
  // =============================================================================

  async extractAssets(
    filePath: string,
    options: ComprehensiveConversionOptions = {}
  ): Promise<any[]> {
    try {
      logger.info('Extracting assets', { filePath, options });

      // Use AssetService for extraction
      const assets = await this.assetService.extractAssets(filePath, {
        assetTypes: ['images', 'videos', 'audio'],
        returnFormat: 'urls',
        generateThumbnails: options.generateThumbnails,
        preserveOriginalNames: true
      });

      logger.info('Asset extraction completed', {
        filePath,
        assetCount: assets.length
      });

      return assets;

    } catch (error) {
      logger.warn('Asset extraction failed', { error: (error as Error).message, filePath });
      return [];
    }
  }

  // =============================================================================
  // METADATA EXTRACTION (Enhanced)
  // =============================================================================

  async extractMetadata(
    filePath: string,
    options: ComprehensiveConversionOptions = {}
  ): Promise<any> {
    try {
      logger.info('Extracting metadata', { filePath });

      // Use MetadataService for extraction
      const metadata = await this.metadataService.extractMetadata(filePath, {
        includeSystemProperties: true,
        includeCustomProperties: true,
        includeDocumentStatistics: true,
        includeRevisionHistory: true
      });

      logger.info('Metadata extraction completed', { filePath });

      return metadata;

    } catch (error) {
      logger.warn('Metadata extraction failed', { error: (error as Error).message, filePath });
      return null;
    }
  }

  // =============================================================================
  // THUMBNAIL GENERATION (Enhanced)
  // =============================================================================

  async generateThumbnails(
    filePath: string,
    options: ComprehensiveConversionOptions = {}
  ): Promise<any[]> {
    try {
      logger.info('Generating thumbnails', { filePath });

      // Use ThumbnailService for generation
      const thumbnails = await this.thumbnailService.generateThumbnails(filePath, {
        format: 'png',
        quality: options.imageQuality || 'high',
        size: { width: 1920, height: 1080 },
        returnFormat: 'urls'
      });

      logger.info('Thumbnail generation completed', {
        filePath,
        thumbnailCount: thumbnails.length
      });

      return thumbnails;

    } catch (error) {
      logger.warn('Thumbnail generation failed', { error: (error as Error).message, filePath });
      return [];
    }
  }

  // =============================================================================
  // EFFECTS EXTRACTION (New)
  // =============================================================================

  async extractEffects(
    filePath: string,
    options: ComprehensiveConversionOptions = {}
  ): Promise<any[]> {
    try {
      logger.info('Extracting effects with dynamic extensions', { filePath });

      const effects: any[] = [];

      // Load presentation to extract effects
      const aspose = require('/app/lib/aspose.slides.js');
      const presentation = new aspose.Presentation(filePath);

      try {
        const slides = presentation.getSlides();
        const slideCount = slides.size();

        for (let i = 0; i < slideCount; i++) {
          const slide = slides.get_Item(i);
          const shapes = slide.getShapes();
          const shapeCount = shapes.size();

          for (let j = 0; j < shapeCount; j++) {
            try {
              const shape = shapes.get_Item(j);
              const shapeType = this.getShapeTypeName(shape);
              
              // Use dynamic extension if available
              const dynamicExtension = this.getDynamicExtensionForShape(shapeType);
              if (dynamicExtension) {
                logger.info(`Using dynamic extension for shape type: ${shapeType}`);
                const extensionData = await dynamicExtension.extract(shape, options);
                if (extensionData && extensionData.effects) {
                  effects.push({
                    slideIndex: i,
                    shapeIndex: j,
                    shapeName: shape.getName() || `Shape_${j}`,
                    shapeType,
                    effects: extensionData.effects,
                    extractedBy: dynamicExtension.name || 'DynamicExtension'
                  });
                }
              } else {
                // Fallback to base effect extraction
                const effectFormat = shape.getEffectFormat();
                if (effectFormat) {
                  const effect = {
                    slideIndex: i,
                    shapeIndex: j,
                    shapeName: shape.getName() || `Shape_${j}`,
                    shapeType,
                    effects: this.extractShapeEffects(effectFormat),
                    extractedBy: 'BaseExtractor'
                  };

                  if (effect.effects.length > 0) {
                    effects.push(effect);
                  }
                }
              }
            } catch (shapeError) {
              logger.warn(`Failed to extract effects from shape ${j} on slide ${i}`, { error: shapeError });
            }
          }
        }

        logger.info('Effects extraction completed with dynamic extensions', {
          filePath,
          effectCount: effects.length,
          dynamicExtensionsUsed: this.dynamicRegistry?.size || 0
        });

      } finally {
        presentation.dispose();
      }

      return effects;

    } catch (error) {
      logger.warn('Effects extraction failed', { error: (error as Error).message, filePath });
      return [];
    }
  }

  private extractShapeEffects(effectFormat: any): any[] {
    const effects: any[] = [];

    try {
      // Shadow effects
      if (effectFormat.getOuterShadowEffect && effectFormat.getOuterShadowEffect()) {
        effects.push({
          type: 'shadow',
          properties: {
            blurRadius: effectFormat.getOuterShadowEffect().getBlurRadius(),
            direction: effectFormat.getOuterShadowEffect().getDirection(),
            distance: effectFormat.getOuterShadowEffect().getDistance()
          }
        });
      }

      // Glow effects
      if (effectFormat.getGlowEffect && effectFormat.getGlowEffect()) {
        effects.push({
          type: 'glow',
          properties: {
            radius: effectFormat.getGlowEffect().getRadius()
          }
        });
      }

      // Reflection effects
      if (effectFormat.getReflectionEffect && effectFormat.getReflectionEffect()) {
        effects.push({
          type: 'reflection',
          properties: {
            blurRadius: effectFormat.getReflectionEffect().getBlurRadius()
          }
        });
      }

    } catch (error) {
      logger.warn('Failed to extract individual effect', { error: (error as Error).message });
    }

    return effects;
  }

  // =============================================================================
  // ANIMATIONS EXTRACTION (New)
  // =============================================================================

  async extractAnimations(
    filePath: string,
    options: ComprehensiveConversionOptions = {}
  ): Promise<any[]> {
    try {
      logger.info('Extracting animations', { filePath });

      const animations: any[] = [];

      // Load presentation to extract animations
      const aspose = require('/app/lib/aspose.slides.js');
      const presentation = new aspose.Presentation(filePath);

      try {
        const slides = presentation.getSlides();
        const slideCount = slides.size();

        for (let i = 0; i < slideCount; i++) {
          try {
            const slide = slides.get_Item(i);
            
            // Extract slide animations
            if (slide.getTimeline && slide.getTimeline()) {
              const timeline = slide.getTimeline();
              const sequences = timeline.getMainSequence();
              
              if (sequences && sequences.getCount() > 0) {
                const sequenceCount = sequences.getCount();
                
                for (let j = 0; j < sequenceCount; j++) {
                  try {
                    const effect = sequences.get_Item(j);
                    
                    animations.push({
                      slideIndex: i,
                      effectIndex: j,
                      type: effect.getType ? effect.getType().toString() : 'Unknown',
                      duration: effect.getTiming ? effect.getTiming().getDuration() : 0,
                      delay: effect.getTiming ? effect.getTiming().getTriggerDelayTime() : 0
                    });
                  } catch (effectError) {
                    logger.warn(`Failed to extract animation effect ${j} on slide ${i}`, { error: effectError });
                  }
                }
              }
            }
          } catch (slideError) {
            logger.warn(`Failed to extract animations from slide ${i}`, { error: slideError });
          }
        }

        logger.info('Animations extraction completed', {
          filePath,
          animationCount: animations.length
        });

      } finally {
        presentation.dispose();
      }

      return animations;

    } catch (error) {
      logger.warn('Animations extraction failed', { error: (error as Error).message, filePath });
      return [];
    }
  }

  // =============================================================================
  // COMMENTS EXTRACTION (New)
  // =============================================================================

  async extractComments(
    filePath: string,
    options: ComprehensiveConversionOptions = {}
  ): Promise<any[]> {
    try {
      logger.info('Extracting comments', { filePath });

      const comments: any[] = [];

      // Load presentation to extract comments
      const aspose = require('/app/lib/aspose.slides.js');
      const presentation = new aspose.Presentation(filePath);

      try {
        const slides = presentation.getSlides();
        const slideCount = slides.size();

        for (let i = 0; i < slideCount; i++) {
          try {
            const slide = slides.get_Item(i);
            
            // Extract slide comments
            if (slide.getSlideComments && slide.getSlideComments()) {
              const slideComments = slide.getSlideComments();
              const commentCount = slideComments.size();
              
              for (let j = 0; j < commentCount; j++) {
                try {
                  const comment = slideComments.get_Item(j);
                  
                  comments.push({
                    slideIndex: i,
                    commentIndex: j,
                    author: comment.getAuthor ? comment.getAuthor() : 'Unknown',
                    text: comment.getText ? comment.getText() : '',
                    createdTime: comment.getCreatedTime ? new Date(comment.getCreatedTime()) : new Date(),
                    position: {
                      x: comment.getPosition ? comment.getPosition().getX() : 0,
                      y: comment.getPosition ? comment.getPosition().getY() : 0
                    }
                  });
                } catch (commentError) {
                  logger.warn(`Failed to extract comment ${j} on slide ${i}`, { error: commentError });
                }
              }
            }
          } catch (slideError) {
            logger.warn(`Failed to extract comments from slide ${i}`, { error: slideError });
          }
        }

        logger.info('Comments extraction completed', {
          filePath,
          commentCount: comments.length
        });

      } finally {
        presentation.dispose();
      }

      return comments;

    } catch (error) {
      logger.warn('Comments extraction failed', { error: (error as Error).message, filePath });
      return [];
    }
  }

  // =============================================================================
  // NOTES EXTRACTION (New)
  // =============================================================================

  async extractNotes(
    filePath: string,
    options: ComprehensiveConversionOptions = {}
  ): Promise<any[]> {
    try {
      logger.info('Extracting notes', { filePath });

      const notes: any[] = [];

      // Load presentation to extract notes
      const aspose = require('/app/lib/aspose.slides.js');
      const presentation = new aspose.Presentation(filePath);

      try {
        const slides = presentation.getSlides();
        const slideCount = slides.size();

        for (let i = 0; i < slideCount; i++) {
          try {
            const slide = slides.get_Item(i);
            
            if (slide.getNotesSlideManager && slide.getNotesSlideManager().getNotesSlide()) {
              const notesSlide = slide.getNotesSlideManager().getNotesSlide();
              
              if (notesSlide.getNotesTextFrame) {
                const text = notesSlide.getNotesTextFrame().getText();
                
                if (text && text.trim()) {
                  notes.push({
                    slideIndex: i,
                    text: text.trim(),
                    characterCount: text.length,
                    wordCount: text.split(/\s+/).length
                  });
                }
              }
            }
          } catch (slideError) {
            logger.warn(`Failed to extract notes from slide ${i}`, { error: slideError });
          }
        }

        logger.info('Notes extraction completed', {
          filePath,
          notesCount: notes.length
        });

      } finally {
        presentation.dispose();
      }

      return notes;

    } catch (error) {
      logger.warn('Notes extraction failed', { error: (error as Error).message, filePath });
      return [];
    }
  }

  // =============================================================================
  // BIDIRECTIONAL OPERATIONS (New)
  // =============================================================================

  async reconstructFromJson(
    jsonData: any,
    outputPath: string,
    options: ComprehensiveConversionOptions = {}
  ): Promise<{ success: boolean; filePath?: string; size?: number; error?: string }> {
    try {
      logger.info('Reconstructing PPTX from JSON', { outputPath });

      // Use existing JSON to PPTX conversion
      const result = await this.asposeConversion.convertJsonToPptx(jsonData, outputPath, {
        outputFormat: 'pptx',
        includeMetadata: options.includeMetadata,
        preserveOriginalAssets: options.includeAssets,
        compressionLevel: options.compressionLevel || 'fast'
      });

      if (result.success) {
        logger.info('PPTX reconstruction completed', {
          outputPath,
          size: result.size
        });
      }

      return {
        success: result.success,
        filePath: result.filePath,
        size: result.size,
        error: result.error
      };

    } catch (error) {
      logger.error('PPTX reconstruction failed', { error: (error as Error).message, outputPath });
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  private determineQuality(
    stats: { slideCount: number; shapeCount: number; assetCount: number; effectCount: number },
    options: ComprehensiveConversionOptions
  ): 'low' | 'medium' | 'high' | 'perfect' {
    let score = 0;

    // Base score from processing
    if (stats.slideCount > 0) score += 25;
    if (stats.shapeCount > 0) score += 25;

    // Bonus for additional features
    if (options.includeAssets && stats.assetCount > 0) score += 15;
    if (options.includeEffects && stats.effectCount > 0) score += 15;
    if (options.includeMetadata) score += 10;
    if (options.generateThumbnails) score += 10;

    if (score >= 90) return 'perfect';
    if (score >= 70) return 'high';
    if (score >= 50) return 'medium';
    return 'low';
  }

  // =============================================================================
  // DYNAMIC EXTENSION DELEGATION METHODS
  // =============================================================================

  private getDynamicExtensionForShape(shapeType: string): any | null {
    if (!this.dynamicRegistry) {
      return null;
    }

    // Try exact match first
    let extension = this.dynamicRegistry.get(shapeType.toLowerCase());
    if (extension) {
      return extension;
    }

    // Try partial matches for complex shape types
    const typeVariations = [
      shapeType.toLowerCase(),
      shapeType.replace(/object|frame|shape/gi, '').toLowerCase(),
      shapeType.split(/(?=[A-Z])/).join('').toLowerCase()
    ];

    for (const variation of typeVariations) {
      extension = this.dynamicRegistry.get(variation);
      if (extension) {
        return extension;
      }
    }

    // Check if any extension supports this shape type
    for (const [key, ext] of this.dynamicRegistry.entries()) {
      if (ext.supportedTypes && ext.supportedTypes.includes(shapeType)) {
        return ext;
      }
    }

    return null;
  }

  private getShapeTypeName(shape: any): string {
    try {
      if (shape.getShapeType) {
        const shapeType = shape.getShapeType().toString();
        
        // Map common shape types to extension names
        const typeMap: { [key: string]: string } = {
          'Chart': 'chart',
          'Table': 'table',
          'VideoFrame': 'video',
          'AudioFrame': 'audio',
          'Picture': 'image',
          'SmartArt': 'smartart'
        };

        return typeMap[shapeType] || shapeType.toLowerCase();
      }
      return 'unknown';
    } catch (error) {
      return 'unknown';
    }
  }

  // Enhanced shape processing with dynamic extensions
  private async processShapeWithDynamicExtensions(
    shape: any, 
    slideIndex: number, 
    shapeIndex: number,
    options: ComprehensiveConversionOptions
  ): Promise<any> {
    try {
      const shapeType = this.getShapeTypeName(shape);
      
      // Try dynamic extension first
      const dynamicExtension = this.getDynamicExtensionForShape(shapeType);
      if (dynamicExtension) {
        logger.debug(`Using dynamic extension for shape type: ${shapeType}`);
        
        const extractedData = await dynamicExtension.extract(shape, options);
        if (extractedData) {
          return {
            ...extractedData,
            slideIndex,
            shapeIndex,
            extractedBy: dynamicExtension.name || 'DynamicExtension',
            processingMethod: 'dynamic'
          };
        }
      }

      // Fallback to base processing
      logger.debug(`Using base processing for shape type: ${shapeType}`);
      return {
        shapeType,
        slideIndex,
        shapeIndex,
        name: shape.getName() || `Shape_${shapeIndex}`,
        extractedBy: 'BaseExtractor',
        processingMethod: 'base'
        // Add base shape extraction logic here
      };

    } catch (error) {
      logger.warn(`Failed to process shape with dynamic extensions`, { 
        error: (error as Error).message,
        slideIndex,
        shapeIndex 
      });
      return null;
    }
  }

  // =============================================================================
  // DYNAMIC REGISTRY MANAGEMENT
  // =============================================================================

  public setDynamicRegistry(registry: Map<string, any>): void {
    this.dynamicRegistry = registry;
    logger.info('Dynamic registry updated in ConversionService', {
      extensionCount: registry.size,
      extensions: Array.from(registry.keys())
    });
  }

  public getDynamicRegistry(): Map<string, any> | undefined {
    return this.dynamicRegistry;
  }

  public getAvailableDynamicExtensions(): string[] {
    return this.dynamicRegistry ? Array.from(this.dynamicRegistry.keys()) : [];
  }

  // =============================================================================
  // ENHANCED SERVICE INTERFACE METHODS
  // =============================================================================

  getCapabilities(): string[] {
    const baseCapabilities = [
      'process-presentation',
      'convert-to-buffer',
      'convert-to-formats',
      'extract-assets',
      'extract-metadata',
      'generate-thumbnails',
      'extract-effects',
      'extract-animations',
      'extract-comments',
      'extract-notes',
      'reconstruct-from-json',
      'bidirectional-conversion'
    ];

    // Add dynamic extension capabilities
    if (this.dynamicRegistry) {
      const dynamicCapabilities = Array.from(this.dynamicRegistry.keys()).map(
        type => `dynamic-${type}-processing`
      );
      return [...baseCapabilities, ...dynamicCapabilities];
    }

    return baseCapabilities;
  }

  getRequiredDependencies(): string[] {
    return ['aspose', 'aspose-conversion', 'asset-service', 'metadata-service', 'thumbnail-service'];
  }

  isAvailable(): boolean {
    return !!(this.aspose && this.asposeConversion);
  }

  getStats() {
    const baseStats = {
      dependencies: {
        aspose: !!this.aspose,
        asposeConversion: !!this.asposeConversion,
        assetService: !!this.assetService,
        metadataService: !!this.metadataService,
        thumbnailService: !!this.thumbnailService
      }
    };

    // Add dynamic extension stats
    if (this.dynamicRegistry) {
      return {
        ...baseStats,
        dynamicExtensions: {
          available: this.dynamicRegistry.size,
          types: Array.from(this.dynamicRegistry.keys()),
          enabled: true
        }
      };
    }

    return {
      ...baseStats,
      dynamicExtensions: {
        available: 0,
        types: [],
        enabled: false
      }
    };
  }
} 