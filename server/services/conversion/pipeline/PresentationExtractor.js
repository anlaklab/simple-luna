/**
 * Presentation Extractor
 * 
 * Extracts presentation-level data from PPTX files using Aspose.Slides
 * with comprehensive error handling and logging
 */

class PresentationExtractor {
  constructor(asposeAdapter, logger) {
    this.asposeAdapter = asposeAdapter;
    this.logger = logger;
  }

  /**
   * Extract presentation data from PPTX file
   */
  async extractPresentation(filePath) {
    const extractionStartTime = Date.now();
    
    try {
      this.logger.logPresentation('extraction_started', { 
        filePath,
        phase: 'presentation_extraction'
      });

      // Load presentation using adapter
      const presentation = this.asposeAdapter.createPresentation(filePath);
      
      // Extract basic information
      const slideCount = presentation.getSlides().size();
      this.logger.logPresentation('basic_info_extracted', {
        slideCount,
        fileLoaded: true
      });

      // Extract document properties
      const documentProperties = this.asposeAdapter.extractDocumentProperties(presentation);
      this.logger.logPresentation('document_properties_extracted', {
        title: documentProperties.title,
        author: documentProperties.author,
        company: documentProperties.company
      });

      // Extract slide size
      const slideSize = this.asposeAdapter.extractSlideSize(presentation);
      this.logger.logPresentation('slide_size_extracted', {
        width: slideSize.width,
        height: slideSize.height,
        type: slideSize.type
      });

      // Extract master slides information
      const masterSlidesInfo = this._extractMasterSlidesInfo(presentation);
      this.logger.logPresentation('master_slides_extracted', {
        masterSlideCount: masterSlidesInfo.length
      });

      // Extract layout slides information
      const layoutSlidesInfo = this._extractLayoutSlidesInfo(presentation);
      this.logger.logPresentation('layout_slides_extracted', {
        layoutSlideCount: layoutSlidesInfo.length
      });

      const extractionTime = Date.now() - extractionStartTime;
      this.logger.logPerformance('presentation_extraction_time', extractionTime);

      return {
        success: true,
        data: {
          presentation,
          documentProperties,
          slideSize,
          masterSlidesInfo,
          layoutSlidesInfo,
          extractionMetadata: {
            slideCount,
            extractionTime,
            filePath
          }
        }
      };

    } catch (error) {
      this.logger.logError('PRESENTATION', error, {
        phase: 'presentation_extraction',
        filePath,
        processingTime: Date.now() - extractionStartTime
      });

      return {
        success: false,
        error: error.message,
        details: {
          phase: 'presentation_extraction',
          filePath,
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  /**
   * Validate presentation file before processing
   */
  validatePresentationFile(filePath) {
    try {
      const fs = require('fs');
      const path = require('path');

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        throw new Error(`File does not exist: ${filePath}`);
      }

      // Check file size
      const stats = fs.statSync(filePath);
      if (stats.size === 0) {
        throw new Error('File is empty');
      }

      // Check file extension
      const ext = path.extname(filePath).toLowerCase();
      if (!['.pptx', '.ppt'].includes(ext)) {
        throw new Error(`Unsupported file type: ${ext}`);
      }

      this.logger.logPresentation('file_validation_passed', {
        filePath,
        fileSize: stats.size,
        extension: ext
      });

      return {
        valid: true,
        fileSize: stats.size,
        extension: ext
      };

    } catch (error) {
      this.logger.logError('PRESENTATION', error, {
        phase: 'file_validation',
        filePath
      });

      return {
        valid: false,
        error: error.message
      };
    }
  }

  // =============================================================================
  // PRIVATE HELPER METHODS
  // =============================================================================

  _extractMasterSlidesInfo(presentation) {
    try {
      const masterSlides = presentation.getMasters();
      const masterSlidesInfo = [];

      for (let i = 0; i < masterSlides.size(); i++) {
        try {
          const masterSlide = masterSlides.get_Item(i);
          const shapeCount = masterSlide.getShapes().size();

          masterSlidesInfo.push({
            slideId: i,
            name: masterSlide.getName() || `Master Slide ${i + 1}`,
            slideType: "MasterSlide",
            shapeCount
          });
        } catch (masterSlideError) {
          this.logger.logError('SLIDE', masterSlideError, {
            level: 'MASTER_SLIDE',
            slideIndex: i
          });
        }
      }

      return masterSlidesInfo;
    } catch (error) {
      this.logger.logError('PRESENTATION', error, {
        action: 'extract_master_slides'
      });
      return [];
    }
  }

  _extractLayoutSlidesInfo(presentation) {
    try {
      const layoutSlides = presentation.getLayoutSlides();
      const layoutSlidesInfo = [];

      for (let i = 0; i < layoutSlides.size(); i++) {
        try {
          const layoutSlide = layoutSlides.get_Item(i);
          const shapeCount = layoutSlide.getShapes().size();

          layoutSlidesInfo.push({
            slideId: i,
            name: layoutSlide.getName() || `Layout Slide ${i + 1}`,
            slideType: "LayoutSlide",
            shapeCount
          });
        } catch (layoutSlideError) {
          this.logger.logError('SLIDE', layoutSlideError, {
            level: 'LAYOUT_SLIDE',
            slideIndex: i
          });
        }
      }

      return layoutSlidesInfo;
    } catch (error) {
      this.logger.logError('PRESENTATION', error, {
        action: 'extract_layout_slides'
      });
      return [];
    }
  }
}

module.exports = PresentationExtractor; 