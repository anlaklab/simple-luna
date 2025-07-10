/**
 * ConversionService - Robust PPTX ↔ JSON Conversion
 * 
 * Contains all the working robust shape extraction logic
 */

import { logger } from '../../../utils/logger';
import { randomUUID } from 'crypto';
import { 
  IConversionService, 
  AsposeConfig, 
  ConversionOptions, 
  ConversionResult, 
  ProcessingStats,
  UniversalPresentation,
  FileGenerationOptions,
  FileGenerationResult,
  FileStats,
  ConversionError
} from '../types/interfaces';
import { 
  validateFile, 
  getFileStats, 
  colorToHex, 
  mapShapeType, 
  extractGeometry,
  extractFillFormat,
  extractLineFormat,
  sanitizeText,
  safeDispose,
  measureTimeAsync,
  formatFileSize
} from '../utils/asposeUtils';

export class ConversionService implements IConversionService {
  private config: AsposeConfig;

  constructor(config: AsposeConfig) {
    this.config = {
      licenseFilePath: './Aspose.Slides.Product.Family.lic',
      tempDirectory: './temp/aspose',
      maxFileSize: 62914560, // 60MB
      enableLogging: true,
      timeoutMs: 120000, // 2 minutes
      ...config,
    };
  }

  // =============================================================================
  // PUBLIC INTERFACE METHODS
  // =============================================================================

  async validateFile(filePath: string): Promise<boolean> {
    return validateFile(filePath, this.config.maxFileSize);
  }

  async getFileStats(filePath: string): Promise<FileStats> {
    return getFileStats(filePath);
  }

  // =============================================================================
  // MAIN CONVERSION: PPTX → JSON (ROBUST IMPLEMENTATION)
  // =============================================================================

  async convertPptxToJson(filePath: string, options: ConversionOptions = {}): Promise<ConversionResult> {
    const { result, timeMs } = await measureTimeAsync(async () => {
      return this.performPptxToJsonConversion(filePath, options);
    });

    result.processingTimeMs = timeMs;
    return result;
  }

  private async performPptxToJsonConversion(filePath: string, options: ConversionOptions): Promise<ConversionResult> {
    let presentation: any = null;

    try {
      // Step 1: Validate file
      await this.validateFile(filePath);
      const fileStats = await this.getFileStats(filePath);
      logger.info('Starting PPTX to JSON conversion', { 
        filePath, 
        fileSize: formatFileSize(fileStats.size),
        options 
      });

      // Step 2: Load Aspose.Slides
      const aspose = require('../../../../lib/aspose.slides.js');
      const Presentation = aspose.Presentation;

      // Step 3: Load presentation with robust error handling
      try {
        presentation = new Presentation(filePath);
        logger.info('Presentation loaded successfully');
      } catch (error) {
        throw new ConversionError('Failed to load presentation file', error as Error);
      }

      // Step 4: Extract document properties (ROBUST)
      const documentProperties = await this.extractDocumentProperties(presentation, options);
      logger.info('Document properties extracted', { 
        title: documentProperties.title,
        slideCount: documentProperties.slideCount 
      });

      // Step 5: Process all slides (ROBUST SHAPE EXTRACTION)
      const slides = await this.processAllSlides(presentation, options);
      logger.info('All slides processed', { 
        slideCount: slides.length,
        totalShapes: slides.reduce((sum, slide) => sum + (slide.shapes?.length || 0), 0)
      });

      // Step 6: Calculate processing stats
      const processingStats = this.calculateProcessingStats(slides, documentProperties);

      // Step 7: Build Universal JSON
      const universalPresentation: UniversalPresentation = {
        metadata: documentProperties,
        slides: slides,
      };

      return {
        success: true,
        data: {
          presentation: universalPresentation,
          originalFilename: filePath.split('/').pop(),
          processingStats,
        },
      };

    } catch (error) {
      logger.error('PPTX to JSON conversion failed', { error, filePath });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown conversion error',
      };
    } finally {
      safeDispose(presentation);
    }
  }

  // =============================================================================
  // DOCUMENT PROPERTIES EXTRACTION (ROBUST)
  // =============================================================================

  private async extractDocumentProperties(presentation: any, options: ConversionOptions): Promise<any> {
    try {
      const documentProperties = presentation.getDocumentProperties();
      const slides = presentation.getSlides();

      const metadata = {
        id: `pres_${Date.now()}`,
        title: this.safeGetProperty(documentProperties, 'getTitle', 'Untitled Presentation'),
        author: this.safeGetProperty(documentProperties, 'getAuthor', 'Unknown'),
        subject: this.safeGetProperty(documentProperties, 'getSubject', ''),
        keywords: this.safeGetProperty(documentProperties, 'getKeywords', ''),
        comments: this.safeGetProperty(documentProperties, 'getComments', ''),
        category: this.safeGetProperty(documentProperties, 'getCategory', ''),
        manager: this.safeGetProperty(documentProperties, 'getManager', ''),
        company: this.safeGetProperty(documentProperties, 'getCompany', ''),
        createdBy: this.safeGetProperty(documentProperties, 'getCreatedBy', ''),
        lastModifiedBy: this.safeGetProperty(documentProperties, 'getLastModifiedBy', ''),
        creationTime: this.safeGetDateProperty(documentProperties, 'getCreationTime'),
        lastModifiedTime: this.safeGetDateProperty(documentProperties, 'getLastModifiedTime'),
        lastPrintedTime: undefined, // getLastPrintedTime doesn't exist
        slideCount: slides ? slides.size() : 0,
        applicationName: this.safeGetProperty(documentProperties, 'getApplicationName', ''),
        revisionNumber: this.safeGetProperty(documentProperties, 'getRevisionNumber', 0),
      };

      return metadata;
    } catch (error) {
      logger.warn('Document properties extraction failed', { error });
      return {
        id: `pres_${Date.now()}`,
        title: 'Untitled Presentation',
        slideCount: 0,
      };
    }
  }

  // =============================================================================
  // SLIDE PROCESSING (ROBUST IMPLEMENTATION)
  // =============================================================================

  private async processAllSlides(presentation: any, options: ConversionOptions): Promise<any[]> {
    try {
      const slides = presentation.getSlides();
      const slideCount = slides.size();
      logger.info(`Processing ${slideCount} slides with robust extraction`);
      
      const processedSlides: any[] = [];

      for (let i = 0; i < slideCount; i++) {
        try {
          const slide = slides.get_Item(i);
          const slideData = await this.processSlide(slide, i, options);
          processedSlides.push(slideData);
          
          if (i % 10 === 0) {
            logger.info(`Processed ${i + 1}/${slideCount} slides`);
          }
        } catch (slideError) {
          logger.warn(`Failed to process slide ${i + 1}`, { error: slideError });
          // Continue with next slide
          processedSlides.push(this.createEmptySlide(i + 1));
        }
      }

      logger.info(`Successfully processed ${processedSlides.length}/${slideCount} slides`);
      return processedSlides;
    } catch (error) {
      logger.error('Failed to process slides', { error });
      return [];
    }
  }

  // =============================================================================
  // INDIVIDUAL SLIDE PROCESSING (ROBUST WITH ALL FIXES)
  // =============================================================================

  private async processSlide(slide: any, index: number, options: ConversionOptions): Promise<any> {
    const slideData: any = {
      slideId: index + 1,
      name: slide.getName() || `Slide ${index + 1}`,
      slideType: 'Slide',
      shapes: [],
      comments: [],
      animations: [],
      placeholders: [],
      hidden: false,
      notes: null,
      background: null,
      transition: null,
      timing: null,
    };

    try {
      // Extract slide properties safely
      try {
        slideData.hidden = slide.getHidden ? slide.getHidden() : false;
      } catch (e) {
        slideData.hidden = false;
      }

      // Extract slide background safely
      try {
        if (slide.getBackground) {
          const background = slide.getBackground();
          if (background && background.getFillFormat) {
            const fillFormat = extractFillFormat(background.getFillFormat());
            if (fillFormat) {
              slideData.background = {
                type: fillFormat.type,
                fillFormat: fillFormat,
              };
            }
          }
        }
      } catch (e) {
        // Skip background if it fails
      }

      // **CRITICAL: ROBUST SHAPE EXTRACTION**
      try {
        if (slide.getShapes) {
          const shapes = slide.getShapes();
          if (shapes && shapes.size) {
            const shapeCount = shapes.size();
            logger.info(`Processing ${shapeCount} shapes on slide ${index + 1}`);
            
            for (let i = 0; i < shapeCount; i++) {
              try {
                const shape = shapes.get_Item(i);
                if (shape) {
                  const shapeData = await this.processShape(shape, options);
                  if (shapeData) {
                    slideData.shapes.push(shapeData);
                  }
                }
              } catch (shapeError) {
                logger.warn(`Failed to process shape ${i} on slide ${index + 1}`, { error: shapeError });
                // Continue with next shape
              }
            }
          }
        }
      } catch (shapesError) {
        logger.warn(`Failed to get shapes for slide ${index + 1}`, { error: shapesError });
      }

      // Extract notes safely
      try {
        if (slide.getNotesSlideManager && slide.getNotesSlideManager().getNotesSlide()) {
          const notesSlide = slide.getNotesSlideManager().getNotesSlide();
          if (notesSlide.getNotesTextFrame) {
            slideData.notes = notesSlide.getNotesTextFrame().getText();
          }
        }
      } catch (e) {
        // Skip notes if it fails
      }

      logger.info(`Slide ${index + 1} processed: ${slideData.shapes.length} shapes extracted`);
      return slideData;

    } catch (error) {
      logger.error('Error processing slide', { error, slideIndex: index });
      return this.createEmptySlide(index + 1);
    }
  }

  // =============================================================================
  // SHAPE PROCESSING (ROBUST IMPLEMENTATION WITH ALL FIXES)
  // =============================================================================

  private async processShape(shape: any, options: ConversionOptions): Promise<any | null> {
    try {
      // Get basic shape properties safely (using crypto.randomUUID for security)
      const shapeId = shape.getUniqueId ? shape.getUniqueId().toString() : randomUUID();
      const shapeName = shape.getName ? shape.getName() : `Shape_${shapeId}`;
      
      // Get shape type safely
      let shapeType = 'Unknown';
      try {
        if (shape.getShapeType) {
          shapeType = mapShapeType(shape.getShapeType());
        }
      } catch (e) {
        // Use default
      }

      // Get shape geometry safely
      const geometry = extractGeometry(shape);
      
      const shapeData: any = {
        shapeId: shapeId,
        name: shapeName,
        type: shapeType,
        geometry: geometry,
        text: null,
        fillFormat: null,
        lineFormat: null,
        effectFormat: null,
        threeDFormat: null,
        hyperlinks: [],
        placeholderType: null,
        isLocked: false,
        isVisible: true,
        rotation: 0,
        zOrder: 0,
      };

      // Extract shape positioning and visibility safely
      try {
        shapeData.isVisible = shape.isVisible ? shape.isVisible() : true;
        shapeData.rotation = shape.getRotation ? shape.getRotation() : 0;
        shapeData.zOrder = shape.getZOrderPosition ? shape.getZOrderPosition() : 0;
      } catch (e) {
        // Use defaults
      }

      // **CRITICAL: ROBUST TEXT EXTRACTION**
      await this.extractShapeText(shape, shapeData);

      // Extract formatting safely
      await this.extractShapeFormats(shape, shapeData);

      // Log successful extraction
      const hasContent = shapeData.text?.plainText || shapeData.fillFormat || shapeData.lineFormat;
      if (hasContent) {
        logger.info(`Shape extracted: ${shapeName} (${shapeType}) - Text: ${shapeData.text?.plainText?.length || 0} chars`);
      }

      return shapeData;

    } catch (error) {
      logger.error('Error processing shape', { error, shapeName: shape.getName ? shape.getName() : 'Unknown' });
      return null;
    }
  }

  // =============================================================================
  // TEXT EXTRACTION (ROBUST)
  // =============================================================================

  private async extractShapeText(shape: any, shapeData: any): Promise<void> {
    try {
      if (shape.getTextFrame) {
        const textFrame = shape.getTextFrame();
        if (textFrame) {
          let fullText = '';
          const textFormats: any[] = [];
          
          try {
            // Get plain text first
            if (textFrame.getText) {
              fullText = sanitizeText(textFrame.getText() || '');
            }
            
            // Get formatted text if available
            if (textFrame.getParagraphs && textFrame.getParagraphs().size) {
              const paragraphs = textFrame.getParagraphs();
              const paragraphCount = paragraphs.size();
              
              for (let p = 0; p < paragraphCount; p++) {
                try {
                  const paragraph = paragraphs.get_Item(p);
                  if (paragraph && paragraph.getPortions) {
                    const portions = paragraph.getPortions();
                    const portionCount = portions.size();
                    
                    for (let pt = 0; pt < portionCount; pt++) {
                      try {
                        const portion = portions.get_Item(pt);
                        if (portion) {
                          const portionText = portion.getText ? portion.getText() : '';
                          if (portionText) {
                            // Extract formatting safely
                            const portionFormat = this.extractPortionFormat(portion);
                            textFormats.push({
                              text: portionText,
                              format: portionFormat,
                              paragraphIndex: p,
                              portionIndex: pt,
                            });
                          }
                        }
                      } catch (e) {
                        // Skip this portion
                      }
                    }
                  }
                } catch (e) {
                  // Skip this paragraph
                }
              }
            }
          } catch (e) {
            // Fallback to basic text extraction
          }

          if (fullText || textFormats.length > 0) {
            shapeData.text = {
              plainText: fullText,
              formattedText: textFormats,
              hasText: true,
            };
          }
        }
      }
    } catch (textError) {
      logger.warn(`Failed to extract text from shape`, { error: textError });
    }
  }

  // =============================================================================
  // FORMAT EXTRACTION (ROBUST)
  // =============================================================================

  private async extractShapeFormats(shape: any, shapeData: any): Promise<void> {
    // Extract fill format safely
    try {
      if (shape.getFillFormat) {
        const fillFormat = extractFillFormat(shape.getFillFormat());
        if (fillFormat) {
          shapeData.fillFormat = fillFormat;
        }
      }
    } catch (e) {
      // Skip fill format
    }

    // Extract line format safely
    try {
      if (shape.getLineFormat) {
        const lineFormat = extractLineFormat(shape.getLineFormat());
        if (lineFormat) {
          shapeData.lineFormat = lineFormat;
        }
      }
    } catch (e) {
      // Skip line format
    }
  }

  private extractPortionFormat(portion: any): any {
    try {
      const result: any = {
        fontName: portion.getLatinFont()?.getFontName() || 'Arial',
        fontSize: portion.getFontHeight() || 12,
        fontBold: portion.getFontBold() === 1,
        fontItalic: portion.getFontItalic() === 1,
        fontUnderline: portion.getFontUnderline() !== 0,
        fontColor: this.extractPortionColor(portion),
      };

      return result;
    } catch (error) {
      logger.error('Error extracting portion format', { error });
      return {};
    }
  }

  private extractPortionColor(portion: any): string {
    try {
      if (portion.getFillFormat) {
        const fillFormat = portion.getFillFormat();
        if (fillFormat && fillFormat.getFillType) {
          // Handle solid color fill
          if (fillFormat.getSolidFillColor && fillFormat.getSolidFillColor()) {
            const color = fillFormat.getSolidFillColor().getColor();
            if (color) {
              return colorToHex(color);
            }
          }
        }
      }
      
      // Fallback: try to get color directly
      if (portion.getFontColor) {
        const color = portion.getFontColor();
        if (color) {
          return colorToHex(color);
        }
      }
      
      return '#000000'; // Default black
    } catch (error) {
      logger.error('Error extracting portion color', { error });
      return '#000000';
    }
  }

  // =============================================================================
  // JSON → PPTX CONVERSION (FUTURE IMPLEMENTATION)
  // =============================================================================

  async convertJsonToPptx(presentationData: UniversalPresentation, outputPath: string, options?: FileGenerationOptions): Promise<FileGenerationResult> {
    // TODO: Implement reverse conversion from Universal Schema to PPTX
    // This will require complex shape reconstruction and Aspose.Slides API integration
    logger.warn('JSON to PPTX conversion will be implemented in Phase 2 of refactoring');
    return {
      success: false,
      error: 'JSON to PPTX conversion scheduled for Phase 2 implementation',
    };
  }

  // =============================================================================
  // HELPER METHODS
  // =============================================================================

  private safeGetProperty(obj: any, method: string, defaultValue: any): any {
    try {
      if (obj && typeof obj[method] === 'function') {
        return obj[method]() || defaultValue;
      }
      return defaultValue;
    } catch {
      return defaultValue;
    }
  }

  private safeGetDateProperty(obj: any, method: string): Date | undefined {
    try {
      if (obj && typeof obj[method] === 'function') {
        const value = obj[method]();
        return value ? new Date(value) : undefined;
      }
      return undefined;
    } catch {
      return undefined;
    }
  }

  private createEmptySlide(slideId: number): any {
    return {
      slideId,
      name: `Slide ${slideId}`,
      slideType: 'Slide',
      shapes: [],
      comments: [],
      animations: [],
      placeholders: [],
      hidden: false,
    };
  }

  private calculateProcessingStats(slides: any[], documentProperties: any): ProcessingStats {
    const stats = {
      slideCount: slides.length,
      shapeCount: slides.reduce((sum, slide) => sum + (slide.shapes?.length || 0), 0),
      animationCount: slides.reduce((sum, slide) => sum + (slide.animations?.length || 0), 0),
      commentCount: slides.reduce((sum, slide) => sum + (slide.comments?.length || 0), 0),
      assetCount: 0, // Will be calculated when AssetService is implemented
      textLength: slides.reduce((sum, slide) => {
        return sum + (slide.shapes || []).reduce((textSum: number, shape: any) => {
          return textSum + (shape.text?.plainText?.length || 0);
        }, 0);
      }, 0),
      processingTimeMs: 0, // Will be set by the caller
    };

    return stats;
  }
} 