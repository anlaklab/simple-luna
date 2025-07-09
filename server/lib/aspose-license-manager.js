/**
 * Aspose.Slides Global License Manager
 * 
 * Handles license loading ONCE globally and ensures all parts of the application
 * use the properly licensed Aspose.Slides instance
 */

const fs = require('fs');
const path = require('path');

class AsposeLicenseManager {
  constructor() {
    this.aspose = null;
    this.initialized = false;
    this.licenseLoaded = false;
    this.licenseError = null;
    this.initPromise = null;
  }

  /**
   * Initialize Aspose.Slides with license - ONLY called once
   */
  async initialize() {
    // If already initializing, wait for that to complete
    if (this.initPromise) {
      return this.initPromise;
    }

    // If already initialized, return immediately
    if (this.initialized) {
      return {
        success: true,
        aspose: this.aspose,
        licenseLoaded: this.licenseLoaded
      };
    }

    // Start initialization
    this.initPromise = this._performInitialization();
    return this.initPromise;
  }

  async _performInitialization() {
    try {
      console.log('🔑 [GLOBAL] Initializing Aspose.Slides with license...');

      // STEP 1: Configure Java environment FIRST
      process.env.JAVA_TOOL_OPTIONS = [
        '-Djava.awt.headless=true',
        '-Dfile.encoding=UTF-8',
        '-Djava.util.prefs.systemRoot=/tmp',
        '-Duser.timezone=UTC'
      ].join(' ');

      if (!process.env.JAVA_OPTS) {
        process.env.JAVA_OPTS = '-Xmx2g -Xms512m';
      }

      console.log('✅ [GLOBAL] Java environment configured');

      // STEP 2: Load Aspose.Slides library
      const asposeLibPath = path.join(__dirname, '../../lib/aspose.slides.js');
      this.aspose = require(asposeLibPath);

      if (!this.aspose || !this.aspose.Presentation) {
        throw new Error('Aspose.Slides library failed to load or Presentation class not available');
      }

      console.log('✅ [GLOBAL] Aspose.Slides library loaded');

      // STEP 3: Load and apply license IMMEDIATELY
      await this._loadAndApplyLicense();

      // STEP 4: Verify license effectiveness
      const licenseTest = await this._testLicenseEffectiveness();
      
      this.initialized = true;
      
      console.log(`🎉 [GLOBAL] Aspose.Slides initialization complete:`);
      console.log(`   - Library loaded: ✅`);
      console.log(`   - License loaded: ${this.licenseLoaded ? '✅' : '❌'}`);
      console.log(`   - License effective: ${licenseTest.effective ? '✅' : '❌'}`);
      
      if (!licenseTest.effective) {
        console.warn(`⚠️ [GLOBAL] License test failed: ${licenseTest.reason}`);
      }

      return {
        success: true,
        aspose: this.aspose,
        licenseLoaded: this.licenseLoaded,
        licenseEffective: licenseTest.effective,
        testResult: licenseTest
      };

    } catch (error) {
      this.licenseError = error.message;
      console.error('❌ [GLOBAL] Aspose.Slides initialization failed:', error.message);
      
      return {
        success: false,
        error: error.message,
        aspose: null,
        licenseLoaded: false
      };
    }
  }

  async _loadAndApplyLicense() {
    try {
      // Get license path from environment
      const licensePath = process.env.ASPOSE_LICENSE_PATH;
      
      if (!licensePath) {
        console.warn('⚠️ [GLOBAL] No ASPOSE_LICENSE_PATH configured - using evaluation mode');
        this.licenseLoaded = false;
        return;
      }

      // Resolve absolute path
      const absoluteLicensePath = path.resolve(licensePath);
      
      // Check if license file exists
      if (!fs.existsSync(absoluteLicensePath)) {
        throw new Error(`License file not found at: ${absoluteLicensePath}`);
      }

      const fileStats = fs.statSync(absoluteLicensePath);
      console.log(`🔑 [GLOBAL] Loading license from: ${absoluteLicensePath}`);
      console.log(`🔑 [GLOBAL] License file size: ${fileStats.size} bytes`);

      // Verify we have License class
      if (!this.aspose.License) {
        throw new Error('License class not available in Aspose.Slides library');
      }

      // Create and apply license
      const License = this.aspose.License;
      const license = new License();
      
      console.log('🔑 [GLOBAL] Applying license...');
      license.setLicense(absoluteLicensePath);
      
      this.licenseLoaded = true;
      console.log('✅ [GLOBAL] License applied successfully');

    } catch (error) {
      this.licenseLoaded = false;
      console.error(`❌ [GLOBAL] License loading failed: ${error.message}`);
      throw error;
    }
  }

  async _testLicenseEffectiveness() {
    try {
      console.log('🔍 [GLOBAL] Testing license effectiveness...');
      
      // Create test presentation
      const testPresentation = new this.aspose.Presentation();
      const testSlide = testPresentation.getSlides().get_Item(0);
      
      // Add test shape with substantial text
      const testShape = testSlide.getShapes().addAutoShape(
        this.aspose.ShapeType.Rectangle, 100, 100, 400, 100
      );
      
      const testText = 'LICENSE EFFECTIVENESS TEST: This is a long text to verify that the license is working correctly and text is not being truncated due to evaluation version limitations. If you see this complete text, the license is working properly.';
      testShape.getTextFrame().setText(testText);
      
      // Get the text back
      const resultText = testShape.getTextFrame().getText();
      
      // Clean up
      testPresentation.dispose();
      
      // Check if text was truncated
      const isTruncated = resultText.includes('text has been truncated due to evaluation version limitation');
      const isComplete = resultText.includes('license is working properly');
      
      console.log(`🔍 [GLOBAL] License test result:`);
      console.log(`   - Original text length: ${testText.length}`);
      console.log(`   - Retrieved text length: ${resultText.length}`);
      console.log(`   - Text truncated: ${isTruncated ? 'YES ❌' : 'NO ✅'}`);
      console.log(`   - Text complete: ${isComplete ? 'YES ✅' : 'NO ❌'}`);
      
      return {
        effective: !isTruncated && isComplete,
        reason: isTruncated ? 'Text truncation detected' : (isComplete ? 'License working' : 'Incomplete text'),
        originalLength: testText.length,
        resultLength: resultText.length,
        truncated: isTruncated,
        complete: isComplete
      };

    } catch (error) {
      console.error(`❌ [GLOBAL] License test failed: ${error.message}`);
      return {
        effective: false,
        reason: `Test error: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * Get the licensed Aspose instance - initialize if needed
   */
  async getAspose() {
    if (!this.initialized) {
      await this.initialize();
    }
    
    if (!this.aspose) {
      throw new Error(`Aspose.Slides not available: ${this.licenseError || 'Unknown error'}`);
    }
    
    return this.aspose;
  }

  /**
   * Get license status
   */
  getLicenseStatus() {
    return {
      initialized: this.initialized,
      licenseLoaded: this.licenseLoaded,
      error: this.licenseError
    };
  }

  /**
   * Force re-initialization (for testing)
   */
  reset() {
    this.aspose = null;
    this.initialized = false;
    this.licenseLoaded = false;
    this.licenseError = null;
    this.initPromise = null;
    console.log('🔄 [GLOBAL] Aspose license manager reset');
  }
}

// Create singleton instance
const licenseManager = new AsposeLicenseManager();

module.exports = licenseManager; 