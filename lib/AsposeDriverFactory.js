/**
 * Aspose Driver Factory - Unified Aspose.Slides Interface
 * 
 * This factory provides centralized access to all Aspose.Slides classes and operations.
 * It uses the License Factory to ensure proper Java initialization and eliminates
 * the need for direct imports throughout the codebase.
 * 
 * KEY PRINCIPLES:
 * - Single point of entry for all Aspose operations
 * - Uses License Factory for proper JAR coordination
 * - Singleton pattern to prevent Java initialization conflicts
 * - Lazy loading of classes to improve performance
 * - Comprehensive error handling with built-in logging
 * - Support for all Aspose.Slides classes and operations
 * - No external dependencies to prevent import issues
 */

const licenseFactory = require('./AsposeLicenseFactory');

class AsposeDriverFactory {
  constructor() {
    this.licenseFactory = licenseFactory;
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
      console.log('🚀 Initializing Aspose Driver Factory');
      
      // Initialize the license factory first (this handles JAR coordination)
      const result = await this.licenseFactory.initialize();
      
      if (!result.success) {
        throw new Error(`License factory initialization failed: ${result.error}`);
      }

      this.aspose = result.aspose;
      this.initialized = true;
      
      console.log('✅ Aspose Driver Factory initialized successfully', {
        licenseLoaded: result.licenseLoaded,
        licenseEffective: result.licenseEffective,
        jarLoaded: result.jarLoaded
      });
      
      return this.aspose;

    } catch (error) {
      console.error('❌ Failed to initialize Aspose Driver Factory', { error: error.message });
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
   * Get all shape types for comparison - SYNCHRONOUS VERSION
   */
  getShapeTypes() {
    if (!this.initialized || !this.aspose) {
      throw new Error('AsposeDriverFactory not initialized');
    }
    return this.aspose.ShapeType;
  }

  /**
   * Get all fill types - SYNCHRONOUS VERSION
   */
  getFillTypes() {
    if (!this.initialized || !this.aspose) {
      throw new Error('AsposeDriverFactory not initialized');
    }
    return this.aspose.FillType;
  }

  /**
   * Get all shape types for comparison - ASYNC VERSION
   */
  async getShapeTypesAsync() {
    await this.ensureInitialized();
    return await this.getClass('ShapeType');
  }

  /**
   * Get all fill types - ASYNC VERSION
   */
  async getFillTypesAsync() {
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
        console.warn(`Unknown shape type: ${typeName}`);
        return false;
      }
      
      return shape && shape.getShapeType() === ShapeType[typeName];
    } catch (error) {
      console.warn('Error checking shape type', { error: error.message, typeName });
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
        console.warn(`Unknown fill type: ${typeName}`);
        return false;
      }
      
      return fillFormat && fillFormat.getFillType() === FillType[typeName];
    } catch (error) {
      console.warn('Error checking fill type', { error: error.message, typeName });
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
  // FILL TYPE METHODS - CLEANUP DUPLICATES
  // =============================================================================

  /**
   * Check if fill is solid type - ASYNC VERSION
   */
  async isSolidFillAsync(fillFormat) {
    await this.initialize();
    return fillFormat && fillFormat.getFillType() === this.aspose.FillType.Solid;
  }

  /**
   * Check if fill is gradient type - ASYNC VERSION
   */
  async isGradientFillAsync(fillFormat) {
    await this.initialize();
    return fillFormat && fillFormat.getFillType() === this.aspose.FillType.Gradient;
  }

  /**
   * Check if fill is pattern type - ASYNC VERSION
   */
  async isPatternFillAsync(fillFormat) {
    await this.initialize();
    return fillFormat && fillFormat.getFillType() === this.aspose.FillType.Pattern;
  }

  /**
   * Check if fill is picture type - ASYNC VERSION
   */
  async isPictureFillAsync(fillFormat) {
    await this.initialize();
    return fillFormat && fillFormat.getFillType() === this.aspose.FillType.Picture;
  }

  // =============================================================================
  // SHAPE TYPE METHODS - CLEANUP DUPLICATES
  // =============================================================================

  /**
   * Get shape types for shape detection - ASYNC VERSION
   */
  async getShapeTypesAsync() {
    await this.initialize();
    return this.aspose.ShapeType;
  }

  /**
   * Check if shape is of specific type - ASYNC VERSION
   */
  async isShapeOfTypeAsync(shape, shapeType) {
    await this.initialize();
    return shape && shape.getShapeType() === shapeType;
  }

  /**
   * Get shape type as string - ASYNC VERSION
   */
  async getShapeTypeStringAsync(shape) {
    await this.initialize();
    const shapeType = shape.getShapeType();
    const ShapeType = this.aspose.ShapeType;
    
    // Map common shape types
    const typeMap = {
      [ShapeType.Chart]: 'Chart',
      [ShapeType.Table]: 'Table',
      [ShapeType.Picture]: 'Picture',
      [ShapeType.VideoFrame]: 'VideoFrame',
      [ShapeType.AudioFrame]: 'AudioFrame',
      [ShapeType.SmartArt]: 'SmartArt',
      [ShapeType.OleObjectFrame]: 'OleObject',
      [ShapeType.GroupShape]: 'GroupShape',
      [ShapeType.Rectangle]: 'Rectangle',
      [ShapeType.Ellipse]: 'Ellipse',
      [ShapeType.Line]: 'Line',
      [ShapeType.TextBox]: 'TextBox',
      [ShapeType.AutoShape]: 'AutoShape'
    };
    
    return typeMap[shapeType] || `Unknown_${shapeType}`;
  }

  /**
   * Check if shape is table type - ASYNC VERSION
   */
  async isTableShapeAsync(shape) {
    await this.initialize();
    return shape && shape.getShapeType() === this.aspose.ShapeType.Table;
  }

  /**
   * Check if shape is SmartArt type - ASYNC VERSION
   */
  async isSmartArtShapeAsync(shape) {
    await this.initialize();
    return shape && shape.getShapeType() === this.aspose.ShapeType.SmartArt;
  }

  /**
   * Check if shape is OLE object type - ASYNC VERSION
   */
  async isOleObjectShapeAsync(shape) {
    await this.initialize();
    return shape && shape.getShapeType() === this.aspose.ShapeType.OleObjectFrame;
  }

  /**
   * Check if shape is connector type - ASYNC VERSION
   */
  async isConnectorShapeAsync(shape) {
    await this.initialize();
    return shape && shape.getShapeType() === this.aspose.ShapeType.Connector;
  }

  // =============================================================================
  // INITIALIZATION STATUS
  // =============================================================================

  /**
   * Check if AsposeDriverFactory is initialized
   */
  isInitialized() {
    return !!this.aspose;
  }

  /**
   * Get initialization status with details
   */
  getInitializationStatus() {
    return {
      initialized: !!this.aspose,
      hasClasses: !!this.aspose?.Presentation,
      hasShapeTypes: !!this.aspose?.ShapeType,
      hasFillTypes: !!this.aspose?.FillType,
      timestamp: this.initializationTime
    };
  }

  // =============================================================================
  // PRESENTATION OPERATIONS
  // =============================================================================

  /**
   * Load presentation from file path
   */
  async loadPresentation(filePath) {
    await this.initialize();
    try {
      const presentation = new this.aspose.Presentation(filePath);
      console.log('Presentation loaded successfully', { filePath });
      return presentation;
    } catch (error) {
      console.error('Failed to load presentation', { filePath, error: error.message });
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
      
      console.log('Saving presentation', { filePath, format });
      presentation.save(filePath, SaveFormat[format]);
      console.log('Presentation saved successfully', { filePath });
      
    } catch (error) {
      console.error('Failed to save presentation', { 
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
        console.warn('Error checking for notes', { error: error.message });
      }

      // Check for comments
      try {
        const commentAuthors = presentation.getCommentAuthors();
        metadata.hasComments = commentAuthors.getCount() > 0;
      } catch (error) {
        console.warn('Error checking for comments', { error: error.message });
      }

      return metadata;
      
    } catch (error) {
      console.error('Failed to get presentation metadata', { error: error.message });
      throw error;
    }
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  /**
   * Ensure the driver is initialized
   */
  async ensureInitialized() {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * Get multiple classes at once
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
   * Execute multiple operations with error handling
   */
  async batchOperation(operations, errorPolicy = 'continue') {
    const results = [];
    
    for (const operation of operations) {
      try {
        const result = await operation();
        results.push({ success: true, result });
      } catch (error) {
        results.push({ success: false, error: error.message });
        
        if (errorPolicy === 'stop') {
          throw error;
        }
      }
    }
    
    return results;
  }

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
      licenseStatus: this.licenseFactory.getLicenseStatus(),
      cachedClasses: this.classes.size,
      availableClasses: (await this.getAllAvailableClasses()).length
    };
    
    return info;
  }

  /**
   * Clear cache and reset (for debugging)
   */
  async reset() {
    console.log('Resetting Aspose Driver Factory');
    this.classes.clear();
    this.initialized = false;
    this.aspose = null;
  }
}

// Export singleton instance
module.exports = new AsposeDriverFactory(); 