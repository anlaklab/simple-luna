/**
 * Conversion Orchestrator
 * 
 * Main coordinator for PPTX ↔ JSON conversions with robust error handling
 * and comprehensive logging for debugging
 */

const ConversionLogger = require('./diagnostics/ConversionLogger');
const PresentationExtractor = require('./pipeline/PresentationExtractor');
const SlideProcessor = require('./pipeline/SlideProcessor');
const ShapeEnricher = require('./pipeline/ShapeEnricher');
const UniversalSchemaBuilder = require('./pipeline/UniversalSchemaBuilder');
const AsposeAdapter = require('./adapters/AsposeAdapter');

class ConversionOrchestrator {
  constructor(options = {}) {
    this.options = {
      enableDebugLogging: options.enableDebugLogging !== false,
      enableShapeDebug: options.enableShapeDebug === true,
      maxProcessingTime: options.maxProcessingTime || 300000, // 5 minutes
      enablePerformanceMetrics: options.enablePerformanceMetrics !== false,
      fallbackOnError: options.fallbackOnError !== false,
      saveDebugLogs: options.saveDebugLogs === true,
      ...options
    };
  }

  /**
   * Convert PPTX to Universal JSON Schema
   */
  async convertPPTXToJSON(filePath, metadata = {}) {
    const conversionId = `pptx2json_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const logger = new ConversionLogger(conversionId, {
      logLevel: this.options.enableDebugLogging ? 'DEBUG' : 'INFO',
      enableShapeDebug: this.options.enableShapeDebug,
      enableMetrics: this.options.enablePerformanceMetrics
    });

    const startTime = Date.now();
    
    try {
      logger.logPresentation('conversion_started', {
        filePath,
        metadata,
        options: this.options
      });

      // =============================================================================
      // PHASE 1: PRESENTATION EXTRACTION
      // =============================================================================
      
      logger.logPresentation('phase_1_starting', { phase: 'presentation_extraction' });
      
      const asposeAdapter = new AsposeAdapter(logger);
      const extractor = new PresentationExtractor(asposeAdapter, logger);
      
      const extractionResult = await this._executeWithTimeout(
        () => extractor.extractPresentation(filePath),
        this.options.maxProcessingTime,
        'Presentation extraction timed out'
      );

      if (!extractionResult.success) {
        throw new Error(`Presentation extraction failed: ${extractionResult.error}`);
      }

      const { presentation, documentProperties, slideSize } = extractionResult.data;
      
      logger.logPresentation('phase_1_completed', {
        slideCount: presentation.getSlides().size(),
        documentProperties: this._sanitizeDocumentProperties(documentProperties),
        slideSize,
        processingTime: Date.now() - startTime
      });

      // =============================================================================
      // PHASE 2: SLIDE PROCESSING
      // =============================================================================

      logger.logPresentation('phase_2_starting', { phase: 'slide_processing' });
      
      const slideProcessor = new SlideProcessor(asposeAdapter, logger);
      const slides = [];
      const slideCount = presentation.getSlides().size();
      
      for (let i = 0; i < slideCount; i++) {
        const slideStartTime = Date.now();
        
        try {
          logger.logSlide(i, 'processing_started', { slideIndex: i });
          
          const slide = presentation.getSlides().get_Item(i);
          const processedSlide = await slideProcessor.processSlide(slide, i);
          
          slides.push(processedSlide);
          
          const slideProcessingTime = Date.now() - slideStartTime;
          logger.logSlide(i, 'processing_completed', {
            slideIndex: i,
            shapeCount: processedSlide.shapes.length,
            processingTime: slideProcessingTime
          });
          
          logger.logPerformance(`slide_${i}_processing_time`, slideProcessingTime);
          
        } catch (slideError) {
          logger.logError('SLIDE', slideError, { slideIndex: i });
          
          if (this.options.fallbackOnError) {
            // Create fallback slide
            const fallbackSlide = this._createFallbackSlide(i, slideError);
            slides.push(fallbackSlide);
            logger.logSlide(i, 'fallback_created', { slideIndex: i, error: slideError.message });
          } else {
            throw slideError;
          }
        }
        
        // Progress logging for large presentations
        if (slideCount > 50 && (i + 1) % 25 === 0) {
          logger.logPresentation('progress_update', {
            processed: i + 1,
            total: slideCount,
            percentage: Math.round(((i + 1) / slideCount) * 100)
          });
        }
      }

      logger.logPresentation('phase_2_completed', {
        totalSlides: slideCount,
        processedSlides: slides.length,
        failedSlides: slideCount - slides.length,
        processingTime: Date.now() - startTime
      });

      // =============================================================================
      // PHASE 3: UNIVERSAL SCHEMA BUILDING
      // =============================================================================

      logger.logPresentation('phase_3_starting', { phase: 'schema_building' });
      
      const schemaBuilder = new UniversalSchemaBuilder(logger);
      const universalSchema = await schemaBuilder.buildSchema({
        presentationId: metadata.presentationId || conversionId,
        title: metadata.title,
        description: metadata.description,
        author: metadata.author,
        company: metadata.company,
        slides,
        documentProperties,
        slideSize,
        conversionMetadata: {
          conversionId,
          sourceFile: filePath,
          processingTime: Date.now() - startTime,
          asposeVersion: asposeAdapter.getVersion(),
          pipelineVersion: '1.0.0'
        }
      });

      logger.logPresentation('phase_3_completed', {
        schemaValid: !!universalSchema,
        totalProcessingTime: Date.now() - startTime
      });

      // =============================================================================
      // CLEANUP AND RESPONSE
      // =============================================================================

      presentation.dispose();
      logger.logPresentation('cleanup_completed', { disposedResources: true });

      const totalTime = Date.now() - startTime;
      logger.logPerformance('total_conversion_time', totalTime);
      
      const summary = logger.getSummary();
      
      // Save debug logs if enabled
      if (this.options.saveDebugLogs) {
        await this._saveDebugLogs(logger, conversionId);
      }
      
      return {
        success: true,
        data: {
          universalSchema,
          conversionId,
          processingStats: {
            totalTime,
            slideCount,
            avgTimePerSlide: Math.round(totalTime / slideCount),
            pipelinePhases: {
              extraction: summary.summary.presentation.processingTime || 0,
              slideProcessing: summary.summary.slides.avgProcessingTime || 0,
              schemaBuilding: summary.summary.performance.schema_building_time?.value || 0
            }
          },
          debugSummary: this.options.enableDebugLogging ? summary : null
        }
      };

    } catch (error) {
      const errorDetails = logger.logError('PRESENTATION', error, {
        phase: 'conversion',
        filePath,
        metadata
      });

      const errorAnalysis = logger.getErrorAnalysis();
      
      if (this.options.saveDebugLogs) {
        await this._saveDebugLogs(logger, conversionId);
      }

      return {
        success: false,
        error: {
          message: error.message,
          code: error.code || 'CONVERSION_FAILED',
          details: errorDetails,
          analysis: this.options.enableDebugLogging ? errorAnalysis : null,
          conversionId
        }
      };
    }
  }

  /**
   * Convert Universal JSON to PPTX
   */
  async convertJSONToPPTX(jsonData, outputPath, options = {}) {
    const conversionId = `json2pptx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const logger = new ConversionLogger(conversionId, {
      logLevel: this.options.enableDebugLogging ? 'DEBUG' : 'INFO',
      enableMetrics: this.options.enablePerformanceMetrics
    });

    const startTime = Date.now();

    try {
      logger.logPresentation('reverse_conversion_started', {
        outputPath,
        slideCount: jsonData.data?.presentation?.slides?.length || 0,
        options
      });

      // =============================================================================
      // PHASE 1: JSON VALIDATION
      // =============================================================================

      logger.logPresentation('json_validation_started', { phase: 'validation' });
      
      const slides = jsonData.data?.presentation?.slides || jsonData.slides || [];
      if (!slides || slides.length === 0) {
        throw new Error('No slides found in JSON data');
      }

      logger.logPresentation('json_validation_completed', {
        slideCount: slides.length,
        hasMetadata: !!jsonData.data?.presentation?.metadata
      });

      // =============================================================================
      // PHASE 2: ASPOSE PRESENTATION CREATION
      // =============================================================================

      logger.logPresentation('aspose_creation_started', { phase: 'creation' });
      
      const asposeAdapter = new AsposeAdapter(logger);
      const aspose = asposeAdapter.getAsposeInstance();
      
      // Create presentation with proper error handling
      const presentation = new aspose.Presentation();
      
      try {
        // Remove default slide
        presentation.getSlides().removeAt(0);
        
        // Add slides from JSON
        for (let i = 0; i < slides.length; i++) {
          const slideStartTime = Date.now();
          
          try {
            logger.logSlide(i, 'creating_slide', { slideIndex: i });
            
            const slideData = slides[i];
            const slide = presentation.getSlides().addEmptySlide(
              presentation.getLayoutSlides().get_Item(0)
            );

            // Add shapes with error handling
            if (slideData.shapes && Array.isArray(slideData.shapes)) {
              for (let j = 0; j < slideData.shapes.length; j++) {
                try {
                  const shapeData = slideData.shapes[j];
                  
                  if (shapeData.text || shapeData.textFrame?.text) {
                    const text = shapeData.text || shapeData.textFrame.text;
                    const geometry = shapeData.geometry || {};
                    
                    const textBox = slide.getShapes().addAutoShape(
                      aspose.ShapeType.Rectangle,
                      geometry.x || 100,
                      geometry.y || 100 + (j * 60),
                      geometry.width || 300,
                      geometry.height || 50
                    );
                    
                    textBox.getTextFrame().setText(text);
                    
                    logger.logShape(i, j, 'shape_added', {
                      shapeType: 'text',
                      text: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
                      geometry
                    });
                  }
                } catch (shapeError) {
                  logger.logError('SHAPE', shapeError, {
                    slideIndex: i,
                    shapeIndex: j,
                    shapeData: slideData.shapes[j]
                  });
                }
              }
            }
            
            const slideProcessingTime = Date.now() - slideStartTime;
            logger.logSlide(i, 'slide_created', {
              slideIndex: i,
              shapeCount: slideData.shapes?.length || 0,
              processingTime: slideProcessingTime
            });
            
          } catch (slideError) {
            logger.logError('SLIDE', slideError, { slideIndex: i });
            
            if (!this.options.fallbackOnError) {
              throw slideError;
            }
          }
        }

        // =============================================================================
        // PHASE 3: SAVE PRESENTATION
        // =============================================================================

        logger.logPresentation('saving_started', { outputPath });
        
        // Ensure output directory exists
        const fs = require('fs');
        const path = require('path');
        const outputDir = path.dirname(outputPath);
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }

        // Save with error handling
        presentation.save(outputPath, aspose.SaveFormat.Pptx);
        
        // Verify file was created
        const fileStats = fs.statSync(outputPath);
        
        logger.logPresentation('saving_completed', {
          outputPath,
          fileSize: fileStats.size,
          fileSizeFormatted: this._formatFileSize(fileStats.size)
        });

        const totalTime = Date.now() - startTime;
        logger.logPerformance('total_reverse_conversion_time', totalTime);

        return {
          success: true,
          data: {
            outputPath,
            fileSize: fileStats.size,
            fileSizeFormatted: this._formatFileSize(fileStats.size),
            slideCount: slides.length,
            conversionId,
            processingTime: totalTime
          }
        };

      } finally {
        presentation.dispose();
        logger.logPresentation('cleanup_completed', { disposedResources: true });
      }

    } catch (error) {
      const errorDetails = logger.logError('PRESENTATION', error, {
        phase: 'reverse_conversion',
        outputPath,
        jsonData: { slideCount: jsonData.data?.presentation?.slides?.length || 0 }
      });

      if (this.options.saveDebugLogs) {
        await this._saveDebugLogs(logger, conversionId);
      }

      return {
        success: false,
        error: {
          message: error.message,
          code: error.code || 'REVERSE_CONVERSION_FAILED',
          details: errorDetails,
          conversionId
        }
      };
    }
  }

  // =============================================================================
  // PRIVATE HELPER METHODS
  // =============================================================================

  async _executeWithTimeout(fn, timeout, timeoutMessage) {
    return Promise.race([
      fn(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error(timeoutMessage)), timeout)
      )
    ]);
  }

  _createFallbackSlide(slideIndex, error) {
    return {
      slideId: slideIndex + 1,
      slideIndex,
      name: `Slide ${slideIndex + 1} (Error)`,
      slideType: "Slide",
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
      error: {
        message: error.message,
        timestamp: new Date().toISOString()
      }
    };
  }

  _sanitizeDocumentProperties(props) {
    if (!props) return {};
    
    return {
      title: props.getTitle ? props.getTitle() : '',
      subject: props.getSubject ? props.getSubject() : '',
      author: props.getAuthor ? props.getAuthor() : '',
      company: props.getCompany ? props.getCompany() : '',
      keywords: props.getKeywords ? props.getKeywords() : '',
      comments: props.getComments ? props.getComments() : ''
    };
  }

  _formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async _saveDebugLogs(logger, conversionId) {
    try {
      const fs = require('fs').promises;
      const path = require('path');
      
      const logsDir = path.join(__dirname, '../../temp/logs');
      await fs.mkdir(logsDir, { recursive: true });
      
      const logFile = path.join(logsDir, `${conversionId}.json`);
      await logger.saveToFile(logFile);
      
      console.log(`🔍 Debug logs saved to: ${logFile}`);
    } catch (error) {
      console.warn('⚠️ Failed to save debug logs:', error.message);
    }
  }
}

module.exports = ConversionOrchestrator; 