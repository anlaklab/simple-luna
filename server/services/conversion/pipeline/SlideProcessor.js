/**
 * Slide Processor
 * 
 * Processes individual slides with comprehensive shape extraction and error recovery
 */

class SlideProcessor {
  constructor(asposeAdapter, logger) {
    this.asposeAdapter = asposeAdapter;
    this.logger = logger;
    this.processedShapeCount = 0;
    this.failedShapeCount = 0;
  }

  /**
   * Process a single slide and extract all its content
   */
  async processSlide(slide, slideIndex) {
    const slideStartTime = Date.now();
    
    try {
      this.logger.logSlide(slideIndex, 'slide_processing_started', {
        slideIndex,
        timestamp: new Date().toISOString()
      });

      // Extract basic slide information
      const slideInfo = this._extractSlideBasicInfo(slide, slideIndex);
      
      // Extract slide background
      const background = this._extractSlideBackground(slide, slideIndex);
      
      // Extract all shapes from the slide
      const shapes = await this._extractAllShapes(slide, slideIndex);
      
      // Extract slide notes (if any)
      const notes = this._extractSlideNotes(slide, slideIndex);
      
      // Extract slide transitions
      const transition = this._extractSlideTransition(slide, slideIndex);

      const processingTime = Date.now() - slideStartTime;
      
      const processedSlide = {
        slideId: slideIndex + 1,
        slideIndex,
        name: slideInfo.name,
        slideType: slideInfo.slideType,
        shapes,
        background,
        notes,
        transition,
        processingMetadata: {
          processingTime,
          shapeCount: shapes.length,
          successfulShapes: shapes.filter(s => !s.error).length,
          failedShapes: shapes.filter(s => s.error).length,
          timestamp: new Date().toISOString()
        }
      };

      this.logger.logSlide(slideIndex, 'slide_processing_completed', {
        slideIndex,
        shapeCount: shapes.length,
        processingTime,
        successRate: shapes.length > 0 ? (shapes.filter(s => !s.error).length / shapes.length) * 100 : 100
      });

      return processedSlide;

    } catch (error) {
      this.logger.logError('SLIDE', error, {
        slideIndex,
        processingTime: Date.now() - slideStartTime
      });

      // Return error slide with fallback data
      return this._createErrorSlide(slideIndex, error);
    }
  }

  /**
   * Get processing statistics
   */
  getProcessingStats() {
    return {
      totalShapesProcessed: this.processedShapeCount,
      failedShapes: this.failedShapeCount,
      successRate: this.processedShapeCount > 0 ? 
        ((this.processedShapeCount - this.failedShapeCount) / this.processedShapeCount) * 100 : 100
    };
  }

  // =============================================================================
  // PRIVATE METHODS
  // =============================================================================

  _extractSlideBasicInfo(slide, slideIndex) {
    try {
      return {
        name: this.asposeAdapter._safeCall(() => slide.getName(), `Slide ${slideIndex + 1}`),
        slideType: "Slide"
      };
    } catch (error) {
      this.logger.logError('SLIDE', error, {
        slideIndex,
        action: 'extract_basic_info'
      });
      return {
        name: `Slide ${slideIndex + 1}`,
        slideType: "Slide"
      };
    }
  }

  _extractSlideBackground(slide, slideIndex) {
    try {
      const background = slide.getBackground();
      
      if (!background) {
        return {
          type: "Solid",
          solidFillColor: { type: "RGB", r: 255, g: 255, b: 255 }
        };
      }

      const fillFormat = background.getFillFormat();
      
      if (fillFormat && fillFormat.getFillType().toString() === 'Solid') {
        const solidFill = fillFormat.getSolidFillColor();
        if (solidFill) {
          const color = solidFill.getColor();
          return {
            type: "Solid",
            solidFillColor: {
              type: "RGB",
              r: color.getRed(),
              g: color.getGreen(),
              b: color.getBlue()
            }
          };
        }
      }

      // Default background
      return {
        type: "Solid",
        solidFillColor: { type: "RGB", r: 255, g: 255, b: 255 }
      };

    } catch (error) {
      this.logger.logError('SLIDE', error, {
        slideIndex,
        action: 'extract_background'
      });
      
      return {
        type: "Solid",
        solidFillColor: { type: "RGB", r: 255, g: 255, b: 255 }
      };
    }
  }

  async _extractAllShapes(slide, slideIndex) {
    const shapes = [];
    
    try {
      const shapeCollection = slide.getShapes();
      const shapeCount = shapeCollection.size();

      this.logger.logSlide(slideIndex, 'shape_extraction_started', {
        slideIndex,
        shapeCount
      });

      for (let shapeIndex = 0; shapeIndex < shapeCount; shapeIndex++) {
        try {
          const shape = shapeCollection.get_Item(shapeIndex);
          const extractedShape = await this._extractSingleShape(shape, slideIndex, shapeIndex);
          shapes.push(extractedShape);
          this.processedShapeCount++;

        } catch (shapeError) {
          this.logger.logError('SHAPE', shapeError, {
            slideIndex,
            shapeIndex
          });

          // Add error shape to maintain indexing
          shapes.push({
            shapeIndex,
            error: true,
            errorMessage: shapeError.message,
            shapeType: "Unknown",
            name: `Error Shape ${shapeIndex + 1}`,
            geometry: { x: 0, y: 0, width: 100, height: 100 }
          });
          this.failedShapeCount++;
        }
      }

      this.logger.logSlide(slideIndex, 'shape_extraction_completed', {
        slideIndex,
        totalShapes: shapeCount,
        successfulShapes: shapes.filter(s => !s.error).length,
        failedShapes: shapes.filter(s => s.error).length
      });

    } catch (error) {
      this.logger.logError('SLIDE', error, {
        slideIndex,
        action: 'extract_all_shapes'
      });
    }

    return shapes;
  }

  async _extractSingleShape(shape, slideIndex, shapeIndex) {
    const shapeStartTime = Date.now();
    
    try {
      // Extract basic shape properties with safe calls
      const shapeData = {
        shapeIndex,
        shapeType: this.asposeAdapter._safeCall(() => shape.getShapeType().toString(), "Unknown"),
        name: this.asposeAdapter._safeCall(() => shape.getName() || `Shape ${shapeIndex + 1}`, `Shape ${shapeIndex + 1}`),
        geometry: {
          x: this.asposeAdapter._safeCall(() => shape.getX(), 0),
          y: this.asposeAdapter._safeCall(() => shape.getY(), 0),
          width: this.asposeAdapter._safeCall(() => shape.getWidth(), 100),
          height: this.asposeAdapter._safeCall(() => shape.getHeight(), 100)
        }
      };

      // Extract text content if available
      this._extractShapeText(shape, shapeData, slideIndex, shapeIndex);
      
      // Extract fill format
      this._extractShapeFillFormat(shape, shapeData, slideIndex, shapeIndex);
      
      // Extract shape-specific properties
      this._extractShapeSpecificProperties(shape, shapeData, slideIndex, shapeIndex);

      const processingTime = Date.now() - shapeStartTime;
      shapeData.processingMetadata = {
        processingTime,
        extractedAt: new Date().toISOString()
      };

      this.logger.logShape(slideIndex, shapeIndex, 'shape_extracted_successfully', {
        shapeType: shapeData.shapeType,
        hasText: !!shapeData.text,
        processingTime
      });

      return shapeData;

    } catch (error) {
      this.logger.logError('SHAPE', error, {
        slideIndex,
        shapeIndex,
        processingTime: Date.now() - shapeStartTime
      });

      return {
        shapeIndex,
        error: true,
        errorMessage: error.message,
        shapeType: "Unknown",
        name: `Error Shape ${shapeIndex + 1}`,
        geometry: { x: 0, y: 0, width: 100, height: 100 }
      };
    }
  }

  _extractShapeText(shape, shapeData, slideIndex, shapeIndex) {
    try {
      if (shape.hasTextFrame && shape.hasTextFrame()) {
        const textFrame = shape.getTextFrame();
        if (textFrame) {
          const text = textFrame.getText();
          if (text && text.trim()) {
            shapeData.text = text;
            shapeData.textFrame = {
              text: text,
              paragraphs: this._extractParagraphs(textFrame, slideIndex, shapeIndex)
            };
          }
        }
      }
    } catch (textError) {
      this.logger.logError('SHAPE', textError, {
        slideIndex,
        shapeIndex,
        action: 'extract_text'
      });
    }
  }

  _extractParagraphs(textFrame, slideIndex, shapeIndex) {
    try {
      const paragraphs = [];
      const paragraphCount = textFrame.getParagraphs().size();
      
      for (let p = 0; p < paragraphCount; p++) {
        try {
          const paragraph = textFrame.getParagraphs().get_Item(p);
          const portions = this._extractPortions(paragraph, slideIndex, shapeIndex, p);
          
          paragraphs.push({
            paragraphIndex: p,
            portions,
            alignment: this.asposeAdapter._safeCall(() => paragraph.getAlignment().toString(), "Left")
          });
        } catch (paragraphError) {
          this.logger.logError('SHAPE', paragraphError, {
            slideIndex,
            shapeIndex,
            paragraphIndex: p,
            action: 'extract_paragraph'
          });
        }
      }
      
      return paragraphs;
    } catch (error) {
      return [];
    }
  }

  _extractPortions(paragraph, slideIndex, shapeIndex, paragraphIndex) {
    try {
      const portions = [];
      const portionCount = paragraph.getPortions().size();
      
      for (let pt = 0; pt < portionCount; pt++) {
        try {
          const portion = paragraph.getPortions().get_Item(pt);
          const portionFormat = portion.getPortionFormat();
          
          portions.push({
            portionIndex: pt,
            text: portion.getText(),
            fontHeight: this.asposeAdapter._safeCall(() => portionFormat.getFontHeight(), 12),
            fontBold: this.asposeAdapter._safeCall(() => portionFormat.getFontBold(), false),
            fontItalic: this.asposeAdapter._safeCall(() => portionFormat.getFontItalic(), false),
            fontColor: this.asposeAdapter._safeCall(() => portionFormat.getFillFormat().getSolidFillColor().getColor().toString(), "#000000")
          });
        } catch (portionError) {
          this.logger.logError('SHAPE', portionError, {
            slideIndex,
            shapeIndex,
            paragraphIndex,
            portionIndex: pt,
            action: 'extract_portion'
          });
        }
      }
      
      return portions;
    } catch (error) {
      return [];
    }
  }

  _extractShapeFillFormat(shape, shapeData, slideIndex, shapeIndex) {
    try {
      const fillFormat = shape.getFillFormat();
      if (fillFormat) {
        shapeData.fillFormat = {
          type: this.asposeAdapter._safeCall(() => fillFormat.getFillType().toString(), "NoFill")
        };
        
        if (shapeData.fillFormat.type === 'Solid') {
          const solidFill = fillFormat.getSolidFillColor();
          if (solidFill) {
            const color = solidFill.getColor();
            shapeData.fillFormat.solidFillColor = {
              type: "RGB",
              r: color.getRed(),
              g: color.getGreen(),
              b: color.getBlue()
            };
          }
        }
      }
    } catch (fillError) {
      this.logger.logError('SHAPE', fillError, {
        slideIndex,
        shapeIndex,
        action: 'extract_fill_format'
      });
    }
  }

  _extractShapeSpecificProperties(shape, shapeData, slideIndex, shapeIndex) {
    try {
      // Add shape-specific properties based on shape type
      const shapeType = shapeData.shapeType;
      
      if (shapeType.includes('Table')) {
        this._extractTableProperties(shape, shapeData, slideIndex, shapeIndex);
      } else if (shapeType.includes('Chart')) {
        this._extractChartProperties(shape, shapeData, slideIndex, shapeIndex);
      } else if (shapeType.includes('Picture')) {
        this._extractPictureProperties(shape, shapeData, slideIndex, shapeIndex);
      }
      
    } catch (error) {
      this.logger.logError('SHAPE', error, {
        slideIndex,
        shapeIndex,
        action: 'extract_specific_properties'
      });
    }
  }

  _extractTableProperties(shape, shapeData, slideIndex, shapeIndex) {
    try {
      // Placeholder for table-specific extraction
      shapeData.tableProperties = {
        extractionStatus: 'basic',
        note: 'Table extraction requires specialized handling'
      };
    } catch (error) {
      this.logger.logError('SHAPE', error, {
        slideIndex,
        shapeIndex,
        action: 'extract_table_properties'
      });
    }
  }

  _extractChartProperties(shape, shapeData, slideIndex, shapeIndex) {
    try {
      // Placeholder for chart-specific extraction
      shapeData.chartProperties = {
        extractionStatus: 'basic',
        note: 'Chart extraction requires specialized handling'
      };
    } catch (error) {
      this.logger.logError('SHAPE', error, {
        slideIndex,
        shapeIndex,
        action: 'extract_chart_properties'
      });
    }
  }

  _extractPictureProperties(shape, shapeData, slideIndex, shapeIndex) {
    try {
      // Placeholder for picture-specific extraction
      shapeData.pictureProperties = {
        extractionStatus: 'basic',
        note: 'Picture extraction requires specialized handling'
      };
    } catch (error) {
      this.logger.logError('SHAPE', error, {
        slideIndex,
        shapeIndex,
        action: 'extract_picture_properties'
      });
    }
  }

  _extractSlideNotes(slide, slideIndex) {
    try {
      // Placeholder for slide notes extraction
      return {
        hasNotes: false,
        text: '',
        extractionStatus: 'not_implemented'
      };
    } catch (error) {
      this.logger.logError('SLIDE', error, {
        slideIndex,
        action: 'extract_notes'
      });
      return { hasNotes: false, text: '' };
    }
  }

  _extractSlideTransition(slide, slideIndex) {
    try {
      // Placeholder for slide transition extraction
      return {
        type: "None",
        duration: 0,
        extractionStatus: 'not_implemented'
      };
    } catch (error) {
      this.logger.logError('SLIDE', error, {
        slideIndex,
        action: 'extract_transition'
      });
      return { type: "None", duration: 0 };
    }
  }

  _createErrorSlide(slideIndex, error) {
    return {
      slideId: slideIndex + 1,
      slideIndex,
      name: `Slide ${slideIndex + 1} (Error)`,
      slideType: "Slide",
      error: true,
      errorMessage: error.message,
      shapes: [
        {
          shapeType: "Shape",
          name: "Error Message",
          geometry: { x: 100, y: 100, width: 600, height: 100 },
          text: `Error processing slide ${slideIndex + 1}: ${error.message}`,
          fillFormat: { type: "Solid", color: "#ffebee" }
        }
      ],
      background: {
        type: "Solid",
        solidFillColor: { type: "RGB", r: 255, g: 235, b: 238 }
      },
      processingMetadata: {
        error: true,
        timestamp: new Date().toISOString()
      }
    };
  }
}

module.exports = SlideProcessor; 