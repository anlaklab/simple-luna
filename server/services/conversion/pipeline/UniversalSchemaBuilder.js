/**
 * Universal Schema Builder
 * 
 * Builds the final Universal Presentation Schema from extracted components
 */

class UniversalSchemaBuilder {
  constructor(logger) {
    this.logger = logger;
  }

  /**
   * Build Universal Schema from extracted components
   */
  async buildSchema(components) {
    const buildStartTime = Date.now();
    
    try {
      this.logger.logPresentation('schema_building_started', {
        slideCount: components.slides.length,
        hasDocumentProperties: !!components.documentProperties,
        hasSlideSize: !!components.slideSize
      });

      // Build base presentation structure
      const universalSchema = {
        id: components.presentationId,
        title: components.title || components.documentProperties?.title || 'Untitled Presentation',
        description: components.description || components.documentProperties?.subject || '',
        slideCount: components.slides.length,
        author: components.author || components.documentProperties?.author || 'Unknown',
        company: components.company || components.documentProperties?.company || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        
        // Universal PowerPoint Schema structure
        data: {
          presentation: {
            metadata: this._buildMetadata(components),
            slideSize: this._buildSlideSize(components.slideSize),
            slides: this._buildSlides(components.slides),
            masterSlides: this._buildMasterSlides(components.masterSlidesInfo),
            layoutSlides: this._buildLayoutSlides(components.layoutSlidesInfo),
            theme: this._buildTheme(components)
          }
        },

        // Conversion metadata for debugging and analysis
        conversionMetadata: {
          ...components.conversionMetadata,
          schemaVersion: '1.0.0',
          buildTime: Date.now() - buildStartTime,
          totalShapes: this._countTotalShapes(components.slides),
          processingStats: this._buildProcessingStats(components.slides)
        }
      };

      const buildTime = Date.now() - buildStartTime;
      this.logger.logPerformance('schema_building_time', buildTime);
      
      this.logger.logPresentation('schema_building_completed', {
        schemaVersion: universalSchema.conversionMetadata.schemaVersion,
        totalShapes: universalSchema.conversionMetadata.totalShapes,
        buildTime
      });

      return universalSchema;

    } catch (error) {
      this.logger.logError('PRESENTATION', error, {
        phase: 'schema_building',
        processingTime: Date.now() - buildStartTime
      });
      
      throw new Error(`Schema building failed: ${error.message}`);
    }
  }

  /**
   * Validate built schema
   */
  validateSchema(schema) {
    try {
      const validationResults = {
        valid: true,
        errors: [],
        warnings: []
      };

      // Basic structure validation
      if (!schema.id) {
        validationResults.errors.push('Missing presentation ID');
        validationResults.valid = false;
      }

      if (!schema.data?.presentation) {
        validationResults.errors.push('Missing presentation data structure');
        validationResults.valid = false;
      }

      if (!Array.isArray(schema.data?.presentation?.slides)) {
        validationResults.errors.push('Slides must be an array');
        validationResults.valid = false;
      }

      // Slide validation
      if (schema.data?.presentation?.slides) {
        schema.data.presentation.slides.forEach((slide, index) => {
          if (!slide.slideId) {
            validationResults.warnings.push(`Slide ${index} missing slideId`);
          }
          if (!Array.isArray(slide.shapes)) {
            validationResults.warnings.push(`Slide ${index} shapes is not an array`);
          }
        });
      }

      this.logger.logPresentation('schema_validation_completed', {
        valid: validationResults.valid,
        errorCount: validationResults.errors.length,
        warningCount: validationResults.warnings.length
      });

      return validationResults;

    } catch (error) {
      this.logger.logError('PRESENTATION', error, {
        action: 'schema_validation'
      });
      
      return {
        valid: false,
        errors: [`Validation failed: ${error.message}`],
        warnings: []
      };
    }
  }

  // =============================================================================
  // PRIVATE BUILDER METHODS
  // =============================================================================

  _buildMetadata(components) {
    const docProps = components.documentProperties || {};
    
    return {
      title: components.title || docProps.title || 'Untitled Presentation',
      subject: components.description || docProps.subject || '',
      author: components.author || docProps.author || 'Unknown',
      company: components.company || docProps.company || '',
      createdTime: docProps.createdTime || new Date().toISOString(),
      lastSavedTime: docProps.lastSavedTime || new Date().toISOString(),
      slideCount: components.slides.length,
      keywords: docProps.keywords || '',
      comments: docProps.comments || `Converted from: ${components.conversionMetadata?.sourceFile || 'unknown'}`,
      revision: docProps.revision || 1,
      
      // Extended metadata for debugging
      extractionMetadata: {
        extractedAt: new Date().toISOString(),
        sourceFile: components.conversionMetadata?.sourceFile,
        asposeVersion: components.conversionMetadata?.asposeVersion,
        pipelineVersion: components.conversionMetadata?.pipelineVersion
      }
    };
  }

  _buildSlideSize(slideSize) {
    return slideSize || {
      width: 1920,
      height: 1080,
      type: "OnScreen16x9"
    };
  }

  _buildSlides(slides) {
    return slides.map((slide, index) => ({
      slideId: slide.slideId || index + 1,
      slideIndex: slide.slideIndex !== undefined ? slide.slideIndex : index,
      name: slide.name || `Slide ${index + 1}`,
      slideType: slide.slideType || "Slide",
      shapes: this._buildShapes(slide.shapes || []),
      background: slide.background || {
        type: "Solid",
        solidFillColor: { type: "RGB", r: 255, g: 255, b: 255 }
      },
      notes: slide.notes || { hasNotes: false, text: '' },
      transition: slide.transition || { type: "None", duration: 0 },
      
      // Processing metadata for debugging
      processingMetadata: slide.processingMetadata || {
        processingTime: 0,
        shapeCount: slide.shapes?.length || 0,
        timestamp: new Date().toISOString()
      }
    }));
  }

  _buildShapes(shapes) {
    return shapes.map((shape, index) => ({
      shapeIndex: shape.shapeIndex !== undefined ? shape.shapeIndex : index,
      shapeType: shape.shapeType || "Unknown",
      name: shape.name || `Shape ${index + 1}`,
      geometry: shape.geometry || { x: 0, y: 0, width: 100, height: 100 },
      
      // Text content
      ...(shape.text && { text: shape.text }),
      ...(shape.textFrame && { textFrame: shape.textFrame }),
      
      // Visual properties
      ...(shape.fillFormat && { fillFormat: shape.fillFormat }),
      
      // Shape-specific properties
      ...(shape.tableProperties && { tableProperties: shape.tableProperties }),
      ...(shape.chartProperties && { chartProperties: shape.chartProperties }),
      ...(shape.pictureProperties && { pictureProperties: shape.pictureProperties }),
      
      // Error information if shape failed to process
      ...(shape.error && {
        error: true,
        errorMessage: shape.errorMessage,
        processingMetadata: {
          failed: true,
          timestamp: new Date().toISOString()
        }
      }),
      
      // Processing metadata
      ...(shape.processingMetadata && { processingMetadata: shape.processingMetadata })
    }));
  }

  _buildMasterSlides(masterSlidesInfo) {
    if (!masterSlidesInfo || !Array.isArray(masterSlidesInfo)) {
      return [{
        slideId: 0,
        name: "Master Slide",
        slideType: "MasterSlide",
        shapes: [],
        background: {
          type: "Solid",
          solidFillColor: { type: "RGB", r: 255, g: 255, b: 255 }
        }
      }];
    }

    return masterSlidesInfo.map(masterSlide => ({
      slideId: masterSlide.slideId,
      name: masterSlide.name,
      slideType: masterSlide.slideType,
      shapes: [], // TODO: Extract master slide shapes
      background: {
        type: "Solid",
        solidFillColor: { type: "RGB", r: 255, g: 255, b: 255 }
      }
    }));
  }

  _buildLayoutSlides(layoutSlidesInfo) {
    if (!layoutSlidesInfo || !Array.isArray(layoutSlidesInfo)) {
      return [];
    }

    return layoutSlidesInfo.map(layoutSlide => ({
      slideId: layoutSlide.slideId,
      name: layoutSlide.name,
      slideType: layoutSlide.slideType,
      shapes: [], // TODO: Extract layout slide shapes
      background: {
        type: "Solid",
        solidFillColor: { type: "RGB", r: 255, g: 255, b: 255 }
      }
    }));
  }

  _buildTheme(components) {
    // Extract theme information from slides or use defaults
    const defaultTheme = {
      name: "Default Theme",
      colorScheme: {
        background1: "#ffffff",
        text1: "#000000",
        background2: "#f8f9fa",
        text2: "#333333",
        accent1: "#007bff",
        accent2: "#28a745"
      },
      fontScheme: {
        majorFont: "Calibri",
        minorFont: "Calibri"
      }
    };

    // TODO: Extract actual theme from presentation
    return defaultTheme;
  }

  _countTotalShapes(slides) {
    return slides.reduce((total, slide) => {
      return total + (slide.shapes ? slide.shapes.length : 0);
    }, 0);
  }

  _buildProcessingStats(slides) {
    const stats = {
      totalSlides: slides.length,
      totalShapes: this._countTotalShapes(slides),
      successfulSlides: 0,
      failedSlides: 0,
      successfulShapes: 0,
      failedShapes: 0,
      avgProcessingTimePerSlide: 0,
      avgShapesPerSlide: 0
    };

    let totalProcessingTime = 0;

    slides.forEach(slide => {
      if (slide.error) {
        stats.failedSlides++;
      } else {
        stats.successfulSlides++;
      }

      if (slide.processingMetadata?.processingTime) {
        totalProcessingTime += slide.processingMetadata.processingTime;
      }

      if (slide.shapes) {
        slide.shapes.forEach(shape => {
          if (shape.error) {
            stats.failedShapes++;
          } else {
            stats.successfulShapes++;
          }
        });
      }
    });

    stats.avgProcessingTimePerSlide = stats.totalSlides > 0 ? 
      Math.round(totalProcessingTime / stats.totalSlides) : 0;
    
    stats.avgShapesPerSlide = stats.totalSlides > 0 ? 
      Math.round(stats.totalShapes / stats.totalSlides) : 0;

    stats.slideSuccessRate = stats.totalSlides > 0 ? 
      Math.round((stats.successfulSlides / stats.totalSlides) * 100) : 100;

    stats.shapeSuccessRate = stats.totalShapes > 0 ? 
      Math.round((stats.successfulShapes / stats.totalShapes) * 100) : 100;

    return stats;
  }
}

module.exports = UniversalSchemaBuilder; 