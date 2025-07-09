/**
 * Aspose.Slides Adapter
 * 
 * Handles proper initialization and configuration of Aspose.Slides library
 * with correct Java options setup to avoid asyncOptions errors
 */

// GLOBAL LICENSE MANAGER
const licenseManager = require('../../../../lib/aspose-license-manager');

class AsposeAdapter {
  constructor(logger = null) {
    this.logger = logger;
    this.aspose = null;
    this.initialized = false;
    this.version = null;
    this.licenseLoaded = false;
  }

  /**
   * Get properly configured Aspose.Slides instance
   */
  async getAsposeInstance() {
    if (!this.initialized) {
      await this._initializeAspose();
    }
    return this.aspose;
  }

  /**
   * Get Aspose version information
   */
  getVersion() {
    if (!this.version) {
      try {
        // Try to get version info if available
        this.version = 'Aspose.Slides 25.6 for Node.js';
      } catch (error) {
        this.version = 'Unknown';
      }
    }
    return this.version;
  }

  /**
   * Create a new presentation with proper error handling
   */
  async createPresentation(filePath = null) {
    const aspose = await this.getAsposeInstance();
    
    try {
      if (filePath) {
        if (this.logger) {
          this.logger.logPresentation('loading_file', { filePath });
        }
        return new aspose.Presentation(filePath);
      } else {
        if (this.logger) {
          this.logger.logPresentation('creating_empty', {});
        }
        return new aspose.Presentation();
      }
    } catch (error) {
      if (this.logger) {
        this.logger.logError('PRESENTATION', error, { 
          action: 'create_presentation',
          filePath 
        });
      }
      throw error;
    }
  }

  /**
   * Save presentation with proper error handling
   */
  savePresentation(presentation, outputPath, format = null) {
    const aspose = this.getAsposeInstance();
    
    try {
      if (this.logger) {
        this.logger.logPresentation('saving_presentation', { outputPath });
      }
      
      const saveFormat = format || aspose.SaveFormat.Pptx;
      presentation.save(outputPath, saveFormat);
      
      if (this.logger) {
        this.logger.logPresentation('saved_successfully', { outputPath });
      }
      
      return true;
    } catch (error) {
      if (this.logger) {
        this.logger.logError('PRESENTATION', error, {
          action: 'save_presentation',
          outputPath,
          format
        });
      }
      throw error;
    }
  }

  /**
   * Extract document properties safely
   */
  extractDocumentProperties(presentation) {
    try {
      const docProps = presentation.getDocumentProperties();
      
      return {
        title: this._safeCall(() => docProps.getTitle(), ''),
        subject: this._safeCall(() => docProps.getSubject(), ''),
        author: this._safeCall(() => docProps.getAuthor(), ''),
        company: this._safeCall(() => docProps.getCompany(), ''),
        keywords: this._safeCall(() => docProps.getKeywords(), ''),
        comments: this._safeCall(() => docProps.getComments(), ''),
        createdTime: this._safeCall(() => docProps.getCreatedTime(), null),
        lastSavedTime: this._safeCall(() => docProps.getLastSavedTime(), null),
        revision: this._safeCall(() => docProps.getRevisionNumber(), 1)
      };
    } catch (error) {
      if (this.logger) {
        this.logger.logError('PRESENTATION', error, {
          action: 'extract_document_properties'
        });
      }
      return this._getDefaultDocumentProperties();
    }
  }

  /**
   * Extract slide size safely
   */
  extractSlideSize(presentation) {
    try {
      const slideSize = presentation.getSlideSize();
      const size = slideSize.getSize();
      
      return {
        width: this._safeCall(() => size.getWidth(), 1920),
        height: this._safeCall(() => size.getHeight(), 1080),
        type: this._safeCall(() => slideSize.getType().toString(), "OnScreen16x9")
      };
    } catch (error) {
      if (this.logger) {
        this.logger.logError('PRESENTATION', error, {
          action: 'extract_slide_size'
        });
      }
      return {
        width: 1920,
        height: 1080,
        type: "OnScreen16x9"
      };
    }
  }

  /**
   * Check if library is properly loaded
   */
  isAvailable() {
    try {
      const aspose = this.getAsposeInstance();
      return !!(aspose && aspose.Presentation);
    } catch (error) {
      return false;
    }
  }

  // =============================================================================
  // PRIVATE METHODS
  // =============================================================================

  /**
   * Initialize Aspose.Slides with proper Java configuration
   */
  async _initializeAspose() {
    if (this.initialized) {
      return;
    }

    try {
      if (this.logger) {
        this.logger.logPresentation('aspose_initialization_started', {});
      }

      // CRITICAL: Configure Java options BEFORE loading any Java-related modules
      this._configureJavaEnvironment();

      // Use GLOBAL LICENSE MANAGER instead of direct loading
      this.aspose = await licenseManager.getAspose();

      // Verify basic functionality (this will use the licensed version if license loaded)
      this._verifyAsposeInstallation();

      this.initialized = true;

      if (this.logger) {
        this.logger.logPresentation('aspose_initialization_completed', {
          version: this.getVersion(),
          licenseLoaded: this.licenseLoaded
        });
      }

    } catch (error) {
      if (this.logger) {
        this.logger.logError('PRESENTATION', error, {
          action: 'aspose_initialization'
        });
      }
      throw new Error(`Failed to initialize Aspose.Slides: ${error.message}`);
    }
  }

  /**
   * Configure Java environment before loading Aspose
   */
  _configureJavaEnvironment() {
    try {
      // Set Java system properties for headless operation
      process.env.JAVA_TOOL_OPTIONS = [
        '-Djava.awt.headless=true',
        '-Dfile.encoding=UTF-8',
        '-Djava.util.prefs.systemRoot=/tmp',
        '-Duser.timezone=UTC'
      ].join(' ');

      // Configure Java heap if not set
      if (!process.env.JAVA_OPTS) {
        process.env.JAVA_OPTS = '-Xmx2g -Xms512m';
      }

      if (this.logger) {
        this.logger.logPresentation('java_environment_configured', {
          javaHome: process.env.JAVA_HOME,
          javaOpts: process.env.JAVA_OPTS,
          javaToolOptions: process.env.JAVA_TOOL_OPTIONS
        });
      }

    } catch (error) {
      console.warn('⚠️ Failed to configure Java environment:', error.message);
    }
  }

  /**
   * Load Aspose.Slides license if available
   */
  _loadLicense() {
    try {
      const fs = require('fs');
      const path = require('path');
      
      // Check for license path from environment variable
      const licensePath = process.env.ASPOSE_LICENSE_PATH;
      
      if (!licensePath) {
        if (this.logger) {
          this.logger.logPresentation('license_not_configured', {});
        }
        console.log('ℹ️ No license path configured - using evaluation mode');
        return;
      }

      // Resolve absolute path
      const absoluteLicensePath = path.resolve(licensePath);
      
      // Check if license file exists
      if (!fs.existsSync(absoluteLicensePath)) {
        if (this.logger) {
          this.logger.logPresentation('license_file_not_found', { licensePath: absoluteLicensePath });
        }
        console.warn(`⚠️ License file not found: ${absoluteLicensePath}`);
        return;
      }

      console.log(`🔑 Attempting to load Aspose.Slides license from: ${absoluteLicensePath}`);

      // Verify library is loaded
      if (!this.aspose || !this.aspose.License) {
        throw new Error('Aspose.Slides library not loaded or License class not available');
      }

      // Load and apply the license
      const License = this.aspose.License;
      const license = new License();
      
      console.log('🔑 Creating license instance and applying...');
      license.setLicense(absoluteLicensePath);
      
      // Test that license is working by creating a test presentation
      console.log('🔑 Testing license effectiveness...');
      const testPresentation = new this.aspose.Presentation();
      const testSlide = testPresentation.getSlides().get_Item(0);
      const textBox = testSlide.getShapes().addAutoShape(
        this.aspose.ShapeType.Rectangle, 100, 100, 200, 50
      );
      textBox.getTextFrame().setText('License Test - This should not be truncated in licensed version');
      
      // Check if text is truncated (evaluation mode indicator)
      const resultText = textBox.getTextFrame().getText();
      const isEvaluationMode = resultText.includes('text has been truncated due to evaluation version limitation');
      
      testPresentation.dispose();
      
      if (isEvaluationMode) {
        console.warn('⚠️ License applied but still in evaluation mode - license may be invalid or expired');
        this.licenseLoaded = false;
      } else {
        this.licenseLoaded = true;
        console.log('✅ License applied successfully - full functionality enabled');
      }
      
      if (this.logger) {
        this.logger.logPresentation('license_loaded_successfully', { 
          licensePath: absoluteLicensePath,
          fileSize: fs.statSync(absoluteLicensePath).size,
          isEvaluationMode: isEvaluationMode,
          effectiveLicense: this.licenseLoaded
        });
      }
      
    } catch (error) {
      if (this.logger) {
        this.logger.logError('PRESENTATION', error, {
          action: 'load_license',
          licensePath: process.env.ASPOSE_LICENSE_PATH
        });
      }
      console.warn(`⚠️ Failed to load license: ${error.message}`);
      console.log('ℹ️ Continuing with evaluation mode...');
      this.licenseLoaded = false;
    }
  }

  /**
   * Verify Aspose installation works
   */
  _verifyAsposeInstallation() {
    try {
      // Test basic functionality
      const testPresentation = new this.aspose.Presentation();
      const slideCount = testPresentation.getSlides().size();
      testPresentation.dispose();

      if (this.logger) {
        this.logger.logPresentation('aspose_verification_passed', {
          testSlideCount: slideCount,
          classes: Object.keys(this.aspose).slice(0, 5)
        });
      }

    } catch (error) {
      throw new Error(`Aspose.Slides verification failed: ${error.message}`);
    }
  }

  /**
   * Safe method call with fallback
   */
  _safeCall(fn, fallback = null) {
    try {
      return fn();
    } catch (error) {
      return fallback;
    }
  }

  /**
   * Get default document properties
   */
  _getDefaultDocumentProperties() {
    return {
      title: '',
      subject: '',
      author: 'Unknown',
      company: '',
      keywords: '',
      comments: '',
      createdTime: new Date().toISOString(),
      lastSavedTime: new Date().toISOString(),
      revision: 1
    };
  }
}

module.exports = AsposeAdapter; 