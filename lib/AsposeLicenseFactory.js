/**
 * Aspose License Factory - Centralized License Management
 * 
 * This factory ensures proper coordination between JAR loading and license initialization
 * to prevent ClassNotFoundException errors. It acts as the single point of entry
 * for all Aspose.Slides operations that require licensing.
 * 
 * CRITICAL: This factory ensures JAR is loaded before any license operations
 */

const licenseManager = require('./aspose-license-manager');

class AsposeLicenseFactory {
  constructor() {
    this.licenseManager = licenseManager;
    this.initialized = false;
    this.aspose = null;
    this.initPromise = null;
  }

  /**
   * Initialize the license factory - must be called before any Aspose operations
   */
  async initialize() {
    if (this.initialized) {
      return {
        success: true,
        aspose: this.aspose,
        licenseLoaded: this.licenseManager.licenseLoaded,
        jarLoaded: this.licenseManager.jarLoaded
      };
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this._performInitialization();
    return this.initPromise;
  }

  async _performInitialization() {
    try {
      console.log('🏭 [LICENSE FACTORY] Initializing Aspose License Factory...');

      // STEP 1: Initialize the license manager (this handles JAR coordination)
      const licenseResult = await this.licenseManager.initialize();
      
      if (!licenseResult.success) {
        throw new Error(`License manager initialization failed: ${licenseResult.error}`);
      }

      // STEP 2: Get the licensed Aspose instance
      this.aspose = await this.licenseManager.getAspose();
      
      if (!this.aspose) {
        throw new Error('Failed to get licensed Aspose instance');
      }

      // STEP 3: Verify critical functionality
      await this._verifyCriticalFunctionality();

      this.initialized = true;

      console.log('🎉 [LICENSE FACTORY] Aspose License Factory initialized successfully');
      console.log(`   - JAR loaded: ${licenseResult.jarLoaded ? '✅' : '❌'}`);
      console.log(`   - License loaded: ${licenseResult.licenseLoaded ? '✅' : '❌'}`);
      console.log(`   - License effective: ${licenseResult.licenseEffective ? '✅' : '❌'}`);

      return {
        success: true,
        aspose: this.aspose,
        licenseLoaded: licenseResult.licenseLoaded,
        licenseEffective: licenseResult.licenseEffective,
        jarLoaded: licenseResult.jarLoaded,
        testResult: licenseResult.testResult
      };

    } catch (error) {
      console.error('❌ [LICENSE FACTORY] Initialization failed:', error.message);
      this.initPromise = null;
      throw error;
    }
  }

  /**
   * Verify that critical Aspose functionality is working
   */
  async _verifyCriticalFunctionality() {
    console.log('🔍 [LICENSE FACTORY] Verifying critical functionality...');

    try {
      // Test 1: Create a presentation
      const testPresentation = new this.aspose.Presentation();
      if (!testPresentation) {
        throw new Error('Failed to create test presentation');
      }

      // Test 2: Access slides
      const slides = testPresentation.getSlides();
      if (!slides) {
        throw new Error('Failed to access slides collection');
      }

      // Test 3: Create a shape
      const testSlide = slides.get_Item(0);
      const testShape = testSlide.getShapes().addAutoShape(
        this.aspose.ShapeType.Rectangle, 100, 100, 200, 100
      );
      if (!testShape) {
        throw new Error('Failed to create test shape');
      }

      // Test 4: Access text frame
      const textFrame = testShape.getTextFrame();
      if (!textFrame) {
        throw new Error('Failed to access text frame');
      }

      // Test 5: Set and get text
      const testText = 'LICENSE FACTORY TEST';
      textFrame.setText(testText);
      const resultText = textFrame.getText();
      
      if (resultText !== testText) {
        throw new Error(`Text mismatch: expected "${testText}", got "${resultText}"`);
      }

      // Clean up
      testPresentation.dispose();

      console.log('✅ [LICENSE FACTORY] Critical functionality verified');

    } catch (error) {
      console.error('❌ [LICENSE FACTORY] Critical functionality test failed:', error.message);
      throw new Error(`Critical functionality verification failed: ${error.message}`);
    }
  }

  /**
   * Get the licensed Aspose instance
   */
  async getAspose() {
    if (!this.initialized) {
      await this.initialize();
    }
    return this.aspose;
  }

  /**
   * Create a new presentation with proper licensing
   */
  async createPresentation() {
    const aspose = await this.getAspose();
    return new aspose.Presentation();
  }

  /**
   * Load a presentation from file with proper licensing
   */
  async loadPresentation(filePath) {
    const aspose = await this.getAspose();
    return new aspose.Presentation(filePath);
  }

  /**
   * Get license status
   */
  getLicenseStatus() {
    return this.licenseManager.getLicenseStatus();
  }

  /**
   * Get detailed initialization status
   */
  getInitializationStatus() {
    return {
      initialized: this.initialized,
      licenseManager: this.licenseManager.getLicenseStatus(),
      aspose: this.aspose ? 'available' : 'not available'
    };
  }

  /**
   * Reset the factory (for testing)
   */
  reset() {
    this.initialized = false;
    this.aspose = null;
    this.initPromise = null;
    this.licenseManager.reset();
    console.log('🔄 [LICENSE FACTORY] Factory reset');
  }
}

// Create singleton instance
const licenseFactory = new AsposeLicenseFactory();

module.exports = licenseFactory; 