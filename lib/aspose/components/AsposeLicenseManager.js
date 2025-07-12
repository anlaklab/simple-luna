/**
 * AsposeLicenseManager - Main orchestrator for Aspose.Slides license management
 * 
 * Coordinates all components to provide a unified interface for
 * Aspose.Slides initialization, licensing, and testing
 */

const JavaConfigurator = require('./JavaConfigurator');
const JarLoader = require('./JarLoader');
const ClassVerifier = require('./ClassVerifier');
const LicenseLoader = require('./LicenseLoader');
const LicenseTester = require('./LicenseTester');

class AsposeLicenseManager {
  constructor(config = {}) {
    this.config = {
      java: {
        maxAttempts: 10,
        delayMs: 1000,
        ...config.java
      },
      jar: {
        maxAttempts: 10,
        delayMs: 1000,
        ...config.jar
      },
      license: {
        envVar: 'ASPOSE_LICENSE_CONTENT',
        tempPath: '/tmp/aspose-license.lic',
        cleanupTemp: true,
        ...config.license
      },
      logger: config.logger || console,
      ...config
    };
    
    // State management
    this.aspose = null;
    this.initialized = false;
    this.licenseLoaded = false;
    this.licenseError = null;
    this.initPromise = null;
    this.jarLoaded = false;
    
    // Component instances
    this.javaConfigurator = null;
    this.jarLoader = null;
    this.classVerifier = null;
    this.licenseLoader = null;
    this.licenseTester = null;
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
        licenseLoaded: this.licenseLoaded,
        licenseEffective: this.licenseLoaded
      };
    }

    // Start initialization
    this.initPromise = this._performInitialization();
    return this.initPromise;
  }

  async _performInitialization() {
    try {
      this.config.logger.log('🔑 [AsposeLicenseManager] Initializing Aspose.Slides with license...');

      // STEP 1: Configure Java environment
      this.javaConfigurator = new JavaConfigurator({
        logger: this.config.logger,
        ...this.config.java
      });
      this.javaConfigurator.configure();
      this.javaConfigurator.validate();

      // STEP 2: Load Aspose.Slides library with JAR coordination
      this.jarLoader = new JarLoader({
        logger: this.config.logger,
        ...this.config.jar
      });
      this.aspose = await this.jarLoader.loadAndWait();
      this.jarLoaded = true;

      // STEP 3: Verify critical classes are available
      const java = require('java');
      this.classVerifier = new ClassVerifier({
        aspose: this.aspose,
        java: java,
        logger: this.config.logger
      });
      this.classVerifier.verify();
      this.classVerifier.verifyPresentationCreation();

      // STEP 4: Load and apply license
      this.licenseLoader = new LicenseLoader({
        logger: this.config.logger,
        ...this.config.license
      });
      this.licenseLoaded = await this.licenseLoader.loadAndApply(this.aspose);

      // STEP 5: Verify license effectiveness
      this.licenseTester = new LicenseTester({
        aspose: this.aspose,
        logger: this.config.logger
      });
      const licenseTest = await this.licenseTester.test();
      
      this.initialized = true;
      
      this.config.logger.log(`🎉 [AsposeLicenseManager] Aspose.Slides initialization complete:`);
      this.config.logger.log(`   - JAR loaded: ${this.jarLoaded ? '✅' : '❌'}`);
      this.config.logger.log(`   - Library loaded: ✅`);
      this.config.logger.log(`   - License loaded: ${this.licenseLoaded ? '✅' : '❌'}`);
      this.config.logger.log(`   - License effective: ${licenseTest.effective ? '✅' : '❌'}`);
      
      if (!licenseTest.effective) {
        this.config.logger.warn(`⚠️ [AsposeLicenseManager] License test failed: ${licenseTest.reason}`);
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
      this.config.logger.error('❌ [AsposeLicenseManager] Aspose.Slides initialization failed:', error.message);
      
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
      jarLoaded: this.jarLoaded,
      error: this.licenseError
    };
  }

  /**
   * Test license effectiveness
   */
  async testLicense() {
    if (!this.initialized) {
      await this.initialize();
    }
    
    if (!this.licenseTester) {
      throw new Error('License tester not available');
    }
    
    return await this.licenseTester.comprehensiveTest();
  }

  /**
   * Validate license content without applying
   */
  validateLicenseContent(licenseContent) {
    if (!this.licenseLoader) {
      this.licenseLoader = new LicenseLoader({
        logger: this.config.logger,
        ...this.config.license
      });
    }
    
    return this.licenseLoader.validateContent(licenseContent);
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
    
    // Reset component instances
    this.javaConfigurator = null;
    this.jarLoader = null;
    this.classVerifier = null;
    this.licenseLoader = null;
    this.licenseTester = null;
    
    this.config.logger.log('🔄 [AsposeLicenseManager] Aspose license manager reset');
  }

  /**
   * Get detailed diagnostic information
   */
  getDiagnostics() {
    return {
      initialized: this.initialized,
      licenseLoaded: this.licenseLoaded,
      jarLoaded: this.jarLoaded,
      error: this.licenseError,
      config: {
        java: this.config.java,
        jar: this.config.jar,
        license: {
          ...this.config.license,
          envVar: this.config.license.envVar,
          hasEnvVar: !!process.env[this.config.license.envVar]
        }
      },
      components: {
        javaConfigurator: !!this.javaConfigurator,
        jarLoader: !!this.jarLoader,
        classVerifier: !!this.classVerifier,
        licenseLoader: !!this.licenseLoader,
        licenseTester: !!this.licenseTester
      }
    };
  }
}

module.exports = AsposeLicenseManager; 