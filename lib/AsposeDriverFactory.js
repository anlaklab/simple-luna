/**
 * Aspose Driver Factory - Unified Aspose.Slides Interface
 * 
 * This factory provides centralized access to all Aspose.Slides classes and operations.
 * It extends the existing AsposeLicenseManager to ensure proper Java initialization
 * and eliminates the need for direct imports throughout the codebase.
 * 
 * KEY PRINCIPLES:
 * - Single point of entry for all Aspose operations
 * - Singleton pattern to prevent Java initialization conflicts
 * - Lazy loading of classes to improve performance
 * - Comprehensive error handling and logging
 * - Support for all Aspose.Slides classes and operations
 */

const AsposeManager = require('./aspose-license-manager');
const { logger } = require('../server/src/utils/logger');

class AsposeDriverFactory {
  constructor() {
    this.licenseManager = AsposeManager;
    this.aspose = null;
    this.classes = new Map(); // Cache for Aspose classes
    this.initialized = false;
  }

  /**
   * Initialize the Aspose driver - must be called before using any Aspose functionality
   */
  async initialize() {
    if (this.initialized) {
      return this.aspose;
    }

    try {
      logger.info('🚀 Initializing Aspose Driver Factory');
      
      // Initialize the license manager first
      const result = await this.licenseManager.initialize();
      
      if (!result.success) {
        throw new Error(`Aspose license manager initialization failed: ${result.error}`);
      }

      this.aspose = result.aspose;
      this.initialized = true;
      
      logger.info('✅ Aspose Driver Factory initialized successfully', {
        licenseLoaded: result.licenseLoaded,
        licenseEffective: result.licenseEffective
      });
      
      return this.aspose;

    } catch (error) {
      logger.error('❌ Failed to initialize Aspose Driver Factory', { error: error.message });
      throw error;
    }
  }

  /**
   * Get an Aspose class by name - with caching for performance
   */
  async getClass(className) {
    await this.ensureInitialized();
    
    // Check cache first
    if (this.classes.has(className)) {
      return this.classes.get(className);
    }

    // Get class from Aspose
    if (!this.aspose[className]) {
      throw new Error(`Aspose class '${className}' not found`);
    }

    const asposeClass = this.aspose[className];
    this.classes.set(className, asposeClass);
    
    return asposeClass;
  }

  /**
   * Create a new presentation instance
   */
  async createPresentation(filePath = null) {
    await this.ensureInitialized();
    
    const Presentation = await this.getClass('Presentation');
    return filePath ? new Presentation(filePath) : new Presentation();
  }

  /**
   * Get all shape types for comparison
   */
  async getShapeTypes() {
    await this.ensureInitialized();
    return await this.getClass('ShapeType');
  }

  /**
   * Get all fill types
   */
  async getFillTypes() {
    await this.ensureInitialized();
    return await this.getClass('FillType');
  }

  /**
   * Get presentation format types
   */
  async getPresentationFormat() {
    await this.ensureInitialized();
    return await this.getClass('PresentationFormat');
  }

  /**
   * Get license class for license operations
   */
  async getLicense() {
    await this.ensureInitialized();
    return await this.getClass('License');
  }

  /**
   * Get save format types
   */
  async getSaveFormat() {
    await this.ensureInitialized();
    return await this.getClass('SaveFormat');
  }

  /**
   * Get export format types
   */
  async getExportFormat() {
    await this.ensureInitialized();
    return await this.getClass('ExportFormat');
  }

  // =============================================================================
  // COMMONLY USED CLASSES - Direct access methods
  // =============================================================================

  /**
   * Get AutoShape class
   */
  async getAutoShape() {
    return await this.getClass('AutoShape');
  }

  /**
   * Get GroupShape class
   */
  async getGroupShape() {
    return await this.getClass('GroupShape');
  }

  /**
   * Get PictureFrame class
   */
  async getPictureFrame() {
    return await this.getClass('PictureFrame');
  }

  /**
   * Get VideoFrame class
   */
  async getVideoFrame() {
    return await this.getClass('VideoFrame');
  }

  /**
   * Get AudioFrame class
   */
  async getAudioFrame() {
    return await this.getClass('AudioFrame');
  }

  /**
   * Get OleObjectFrame class
   */
  async getOleObjectFrame() {
    return await this.getClass('OleObjectFrame');
  }

  /**
   * Get Table class
   */
  async getTable() {
    return await this.getClass('Table');
  }

  /**
   * Get Chart class
   */
  async getChart() {
    return await this.getClass('Chart');
  }

  /**
   * Get SmartArt class
   */
  async getSmartArt() {
    return await this.getClass('SmartArt');
  }

  /**
   * Get Connector class
   */
  async getConnector() {
    return await this.getClass('Connector');
  }

  // =============================================================================
  // SHAPE DETECTION UTILITIES
  // =============================================================================

  /**
   * Check if shape is a specific type
   */
  async isShapeOfType(shape, typeName) {
    await this.ensureInitialized();
    
    try {
      const ShapeType = await this.getShapeTypes();
      
      if (!ShapeType[typeName]) {
        logger.warn(`Unknown shape type: ${typeName}`);
        return false;
      }
      
      return shape && shape.getShapeType() === ShapeType[typeName];
    } catch (error) {
      logger.warn('Error checking shape type', { error: error.message, typeName });
      return false;
    }
  }

  /**
   * Check if shape is an AutoShape
   */
  async isAutoShape(shape) {
    return await this.isShapeOfType(shape, 'AutoShape');
  }

  /**
   * Check if shape is a GroupShape
   */
  async isGroupShape(shape) {
    return await this.isShapeOfType(shape, 'GroupShape');
  }

  /**
   * Check if shape is a PictureFrame
   */
  async isPictureFrame(shape) {
    return await this.isShapeOfType(shape, 'PictureFrame');
  }

  /**
   * Check if shape is a VideoFrame
   */
  async isVideoFrame(shape) {
    return await this.isShapeOfType(shape, 'VideoFrame');
  }

  /**
   * Check if shape is an AudioFrame
   */
  async isAudioFrame(shape) {
    return await this.isShapeOfType(shape, 'AudioFrame');
  }

  /**
   * Check if shape is a Table
   */
  async isTable(shape) {
    return await this.isShapeOfType(shape, 'Table');
  }

  /**
   * Check if shape is a Chart
   */
  async isChart(shape) {
    return await this.isShapeOfType(shape, 'Chart');
  }

  /**
   * Check if shape is SmartArt
   */
  async isSmartArt(shape) {
    return await this.isShapeOfType(shape, 'SmartArt');
  }

  /**
   * Check if shape is an OleObjectFrame
   */
  async isOleObjectFrame(shape) {
    return await this.isShapeOfType(shape, 'OleObjectFrame');
  }

  /**
   * Check if shape is a Connector
   */
  async isConnector(shape) {
    return await this.isShapeOfType(shape, 'Connector');
  }

  // =============================================================================
  // FILL TYPE DETECTION
  // =============================================================================

  /**
   * Check if fill is a specific type
   */
  async isFillOfType(fillFormat, typeName) {
    await this.ensureInitialized();
    
    try {
      const FillType = await this.getFillTypes();
      
      if (!FillType[typeName]) {
        logger.warn(`Unknown fill type: ${typeName}`);
        return false;
      }
      
      return fillFormat && fillFormat.getFillType() === FillType[typeName];
    } catch (error) {
      logger.warn('Error checking fill type', { error: error.message, typeName });
      return false;
    }
  }

  /**
   * Check if fill is solid
   */
  async isSolidFill(fillFormat) {
    return await this.isFillOfType(fillFormat, 'Solid');
  }

  /**
   * Check if fill is gradient
   */
  async isGradientFill(fillFormat) {
    return await this.isFillOfType(fillFormat, 'Gradient');
  }

  /**
   * Check if fill is pattern
   */
  async isPatternFill(fillFormat) {
    return await this.isFillOfType(fillFormat, 'Pattern');
  }

  /**
   * Check if fill is picture
   */
  async isPictureFill(fillFormat) {
    return await this.isFillOfType(fillFormat, 'Picture');
  }

  // =============================================================================
  // PRESENTATION OPERATIONS
  // =============================================================================

  /**
   * Load presentation from file
   */
  async loadPresentation(filePath) {
    await this.ensureInitialized();
    
    try {
      logger.info('Loading presentation', { filePath });
      const presentation = await this.createPresentation(filePath);
      logger.info('Presentation loaded successfully', { 
        slideCount: presentation.getSlides().getCount() 
      });
      return presentation;
    } catch (error) {
      logger.error('Failed to load presentation', { 
        filePath, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Save presentation to file
   */
  async savePresentation(presentation, filePath, format = 'Pptx') {
    await this.ensureInitialized();
    
    try {
      const SaveFormat = await this.getSaveFormat();
      
      if (!SaveFormat[format]) {
        throw new Error(`Unknown save format: ${format}`);
      }
      
      logger.info('Saving presentation', { filePath, format });
      presentation.save(filePath, SaveFormat[format]);
      logger.info('Presentation saved successfully', { filePath });
      
    } catch (error) {
      logger.error('Failed to save presentation', { 
        filePath, 
        format, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Get presentation metadata
   */
  async getPresentationMetadata(presentation) {
    await this.ensureInitialized();
    
    try {
      const metadata = {
        slideCount: presentation.getSlides().getCount(),
        masterSlideCount: presentation.getMasters().getCount(),
        hasNotes: false,
        hasComments: false,
        hasAnimations: false
      };

      // Check for notes
      try {
        for (let i = 0; i < metadata.slideCount; i++) {
          const slide = presentation.getSlides().get_Item(i);
          if (slide.getNotesSlideManager().getNotesSlide()) {
            metadata.hasNotes = true;
            break;
          }
        }
      } catch (error) {
        logger.warn('Error checking for notes', { error: error.message });
      }

      // Check for comments
      try {
        const commentAuthors = presentation.getCommentAuthors();
        metadata.hasComments = commentAuthors.getCount() > 0;
      } catch (error) {
        logger.warn('Error checking for comments', { error: error.message });
      }

      return metadata;
      
    } catch (error) {
      logger.error('Failed to get presentation metadata', { error: error.message });
      throw error;
    }
  }

  // =============================================================================
  // ADVANCED OPERATIONS
  // =============================================================================

  /**
   * Get all available Aspose classes for debugging
   */
  async getAllAvailableClasses() {
    await this.ensureInitialized();
    
    const classes = Object.keys(this.aspose).filter(key => {
      return typeof this.aspose[key] === 'function' || 
             (this.aspose[key] && typeof this.aspose[key] === 'object');
    });
    
    return classes.sort();
  }

  /**
   * Get detailed information about the Aspose library
   */
  async getLibraryInfo() {
    await this.ensureInitialized();
    
    const info = {
      initialized: this.initialized,
      licenseStatus: this.licenseManager.getLicenseStatus(),
      cachedClasses: this.classes.size,
      availableClasses: (await this.getAllAvailableClasses()).length
    };
    
    return info;
  }

  /**
   * Clear cache and reset (for debugging)
   */
  async reset() {
    logger.info('Resetting Aspose Driver Factory');
    this.classes.clear();
    this.initialized = false;
    this.aspose = null;
    this.licenseManager.reset();
  }

  // =============================================================================
  // PRIVATE METHODS
  // =============================================================================

  /**
   * Ensure the driver is initialized before any operation
   */
  async ensureInitialized() {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * Get multiple classes at once for efficiency
   */
  async getClasses(classNames) {
    await this.ensureInitialized();
    
    const classes = {};
    
    for (const className of classNames) {
      classes[className] = await this.getClass(className);
    }
    
    return classes;
  }

  /**
   * Batch operation wrapper with error handling
   */
  async batchOperation(operations, errorPolicy = 'continue') {
    const results = [];
    const errors = [];
    
    for (let i = 0; i < operations.length; i++) {
      try {
        const result = await operations[i]();
        results.push({ index: i, success: true, result });
      } catch (error) {
        const errorInfo = { index: i, success: false, error: error.message };
        errors.push(errorInfo);
        results.push(errorInfo);
        
        if (errorPolicy === 'stop') {
          break;
        }
      }
    }
    
    return {
      results,
      errors,
      successCount: results.filter(r => r.success).length,
      errorCount: errors.length
    };
  }
}

// Create singleton instance
const asposeDriver = new AsposeDriverFactory();

module.exports = asposeDriver; 