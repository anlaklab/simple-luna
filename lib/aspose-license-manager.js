/**
 * Aspose.Slides Global License Manager
 * 
 * Handles license loading ONCE globally and ensures all parts of the application
 * use the properly licensed Aspose.Slides instance
 * 
 * CRITICAL: This manager now properly coordinates with JAR loading to prevent ClassNotFoundException
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
    this.jarLoaded = false;
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

      // STEP 2: Load Aspose.Slides library with JAR loading coordination
      await this._loadAsposeLibraryWithJarCoordination();

      // STEP 3: Verify critical classes are available
      await this._verifyCriticalClasses();

      // STEP 4: Load and apply license IMMEDIATELY
      await this._loadAndApplyLicense();

      // STEP 5: Verify license effectiveness
      const licenseTest = await this._testLicenseEffectiveness();
      
      this.initialized = true;
      
      console.log(`🎉 [GLOBAL] Aspose.Slides initialization complete:`);
      console.log(`   - JAR loaded: ${this.jarLoaded ? '✅' : '❌'}`);
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
        testResult: licenseTest,
        jarLoaded: this.jarLoaded
      };

    } catch (error) {
      this.licenseError = error.message;
      console.error('❌ [GLOBAL] Aspose.Slides initialization failed:', error.message);
      
      return {
        success: false,
        error: error.message,
        aspose: null,
        licenseLoaded: false,
        jarLoaded: this.jarLoaded
      };
    }
  }

  /**
   * CRITICAL: Load Aspose library with proper JAR coordination
   */
  async _loadAsposeLibraryWithJarCoordination() {
    try {
      console.log('🔍 [GLOBAL] Loading Aspose.Slides library with JAR coordination...');
      
      // Load the Aspose library (this will trigger JAR loading)
      // Try multiple possible paths for the aspose library
      const possibleAsposePaths = [
        path.join(__dirname, 'aspose.slides.js'),
        path.join(__dirname, '../lib/aspose.slides.js'),
        '/app/lib/aspose.slides.js',
        path.join(process.cwd(), 'lib/aspose.slides.js'),
        path.join(process.cwd(), '../lib/aspose.slides.js')
      ];
      
      let asposeLoaded = false;
      for (const asposePath of possibleAsposePaths) {
        try {
          console.log(`🔍 [GLOBAL] Trying to load Aspose from: ${asposePath}`);
          if (require('fs').existsSync(asposePath)) {
            this.aspose = require(asposePath);
            console.log(`✅ [GLOBAL] Aspose loaded successfully from: ${asposePath}`);
            asposeLoaded = true;
            break;
          }
        } catch (error) {
          console.log(`⚠️ [GLOBAL] Failed to load from ${asposePath}: ${error.message}`);
        }
      }
      
      if (!asposeLoaded) {
        throw new Error(`Could not load Aspose.Slides library from any of these paths: ${possibleAsposePaths.join(', ')}`);
      }

      if (!this.aspose) {
        throw new Error('Aspose.Slides library failed to load');
      }

      console.log('✅ [GLOBAL] Aspose.Slides library loaded');

      // CRITICAL: Wait for JAR to be loaded by testing a basic class
      await this._waitForJarLoading();

      console.log('✅ [GLOBAL] JAR loading coordination completed');

    } catch (error) {
      console.error('❌ [GLOBAL] Failed to load Aspose library with JAR coordination:', error.message);
      throw error;
    }
  }

  /**
   * CRITICAL: Wait for JAR to be fully loaded by testing class availability
   */
  async _waitForJarLoading() {
    console.log('🔍 [GLOBAL] Waiting for JAR to be fully loaded...');
    
    const maxAttempts = 10;
    const delayMs = 1000;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`🔍 [GLOBAL] JAR loading test attempt ${attempt}/${maxAttempts}`);
        
        // Test if we can import a basic Java class first
        const java = require('java');
        const JavaString = java.import('java.lang.String');
        
        if (!JavaString) {
          throw new Error('java.lang.String not available');
        }

        // Test if we can create a simple Java object
        const testString = java.newInstanceSync('java.lang.String', 'test');
        if (!testString) {
          throw new Error('Java object creation failed');
        }

        // Test if we can access the critical Aspose class
        console.log('🔍 [GLOBAL] Testing com.aspose.slides.AdjustValue...');
        const AdjustValue = java.import('com.aspose.slides.AdjustValue');
        
        if (AdjustValue) {
          console.log('✅ [GLOBAL] com.aspose.slides.AdjustValue imported successfully');
          this.jarLoaded = true;
          return;
        } else {
          throw new Error('AdjustValue class not found');
        }

      } catch (error) {
        console.log(`⚠️ [GLOBAL] JAR loading test attempt ${attempt} failed: ${error.message}`);
        
        if (attempt === maxAttempts) {
          throw new Error(`JAR loading failed after ${maxAttempts} attempts: ${error.message}`);
        }
        
        // Wait before next attempt
        console.log(`⏳ [GLOBAL] Waiting ${delayMs}ms before next JAR loading test...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  /**
   * Verify that critical Aspose classes are available
   */
  async _verifyCriticalClasses() {
    console.log('🔍 [GLOBAL] Verifying critical Aspose classes...');
    
    const criticalClasses = [
      'Presentation',
      'License',
      'AdjustValue',
      'ShapeType',
      'TextFrame'
    ];

    for (const className of criticalClasses) {
      try {
        if (className === 'Presentation' || className === 'License') {
          if (!this.aspose[className]) {
            throw new Error(`${className} class not available in Aspose library`);
          }
        } else {
          // For other classes, test Java import
          const java = require('java');
          const javaClass = java.import(`com.aspose.slides.${className}`);
          if (!javaClass) {
            throw new Error(`com.aspose.slides.${className} not available`);
          }
        }
        console.log(`✅ [GLOBAL] ${className} class verified`);
      } catch (error) {
        console.error(`❌ [GLOBAL] Critical class ${className} verification failed: ${error.message}`);
        throw new Error(`Critical class ${className} not available: ${error.message}`);
      }
    }

    console.log('✅ [GLOBAL] All critical classes verified');
  }

  async _loadAndApplyLicense() {
    try {
      // Check for license content in environment variable
      const licenseContent = process.env.ASPOSE_LICENSE_CONTENT;
      
      if (!licenseContent) {
        console.warn('⚠️ [GLOBAL] No ASPOSE_LICENSE_CONTENT configured - using evaluation mode');
        this.licenseLoaded = false;
        return;
      }

      console.log('🔑 [GLOBAL] Loading license from ASPOSE_LICENSE_CONTENT environment variable');
      console.log(`🔑 [GLOBAL] License content length: ${licenseContent.length} characters`);
      
      // DEBUG: Log first 200 characters to see what we're getting
      const preview = licenseContent.substring(0, 200);
      console.log(`🔍 [GLOBAL] License content preview: "${preview}"`);
      
      // Check if it looks like XML
      const isXml = licenseContent.trim().startsWith('<?xml') || licenseContent.trim().startsWith('<');
      console.log(`🔍 [GLOBAL] Content appears to be XML: ${isXml}`);
      
      if (!isXml) {
        console.error('❌ [GLOBAL] License content does not appear to be valid XML');
        console.error('❌ [GLOBAL] Expected XML format, got:', preview);
        throw new Error('License content is not valid XML format');
      }
      
      // Verify we have License class
      if (!this.aspose.License) {
        throw new Error('License class not available in Aspose.Slides library');
      }

      // Create and apply license from content
      const License = this.aspose.License;
      const license = new License();
      
      console.log('🔑 [GLOBAL] Creating temporary license file from content...');
      
      // Create a temporary file from the license content
      const tempLicensePath = '/tmp/aspose-license.lic';
      fs.writeFileSync(tempLicensePath, licenseContent, 'utf8');
      
      console.log('🔑 [GLOBAL] Applying license from temporary file...');
      license.setLicense(tempLicensePath);
      
      // Clean up temporary file
      try {
        fs.unlinkSync(tempLicensePath);
        console.log('🔑 [GLOBAL] Temporary license file cleaned up');
      } catch (cleanupError) {
        console.warn('⚠️ [GLOBAL] Failed to cleanup temporary license file:', cleanupError.message);
      }
      
      this.licenseLoaded = true;
      console.log('✅ [GLOBAL] License applied successfully from environment variable');

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
    this.jarLoaded = false;
    console.log('🔄 [GLOBAL] Aspose license manager reset');
  }
}

// Create singleton instance
const licenseManager = new AsposeLicenseManager();

module.exports = licenseManager; 