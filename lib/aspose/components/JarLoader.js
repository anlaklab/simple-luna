/**
 * JarLoader - Loads Aspose.Slides library and manages JAR loading
 * 
 * Handles loading the Aspose.Slides JavaScript library and coordinates
 * with the underlying Java JAR file loading process
 */

const path = require('path');
const fs = require('fs');

class JarLoader {
  constructor(config = {}) {
    this.logger = config.logger || console;
    this.maxAttempts = config.maxAttempts || 10;
    this.delayMs = config.delayMs || 1000;
    
    // Multiple possible paths for the Aspose library
    this.possiblePaths = config.paths || [
      path.join(__dirname, '../aspose.slides.js'),
      path.join(__dirname, '../../aspose.slides.js'),
      '/app/lib/aspose.slides.js',
      path.join(process.cwd(), 'lib/aspose.slides.js'),
      path.join(process.cwd(), '../lib/aspose.slides.js'),
      path.join(__dirname, 'aspose.slides.js')
    ];
  }

  async loadAspose() {
    this.logger.log('🔍 [JarLoader] Attempting to load Aspose.Slides library...');
    
    for (const asposePath of this.possiblePaths) {
      try {
        this.logger.log(`🔍 [JarLoader] Trying path: ${asposePath}`);
        
        if (fs.existsSync(asposePath)) {
          const aspose = require(asposePath);
          this.logger.log(`✅ [JarLoader] Aspose.Slides loaded successfully from: ${asposePath}`);
          return aspose;
        } else {
          this.logger.log(`⚠️ [JarLoader] Path not found: ${asposePath}`);
        }
      } catch (error) {
        this.logger.log(`⚠️ [JarLoader] Failed to load from ${asposePath}: ${error.message}`);
      }
    }
    
    throw new Error(`Could not load Aspose.Slides library from any of these paths: ${this.possiblePaths.join(', ')}`);
  }

  async waitForJar() {
    this.logger.log('🔍 [JarLoader] Waiting for JAR to be fully loaded...');
    
    const java = require('java');
    
    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      try {
        this.logger.log(`🔍 [JarLoader] JAR loading test attempt ${attempt}/${this.maxAttempts}`);
        
        // Test if we can import a basic Java class first
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
        this.logger.log('🔍 [JarLoader] Testing com.aspose.slides.AdjustValue...');
        const AdjustValue = java.import('com.aspose.slides.AdjustValue');
        
        if (AdjustValue) {
          this.logger.log('✅ [JarLoader] com.aspose.slides.AdjustValue imported successfully');
          return true;
        } else {
          throw new Error('AdjustValue class not found');
        }

      } catch (error) {
        this.logger.log(`⚠️ [JarLoader] JAR loading test attempt ${attempt} failed: ${error.message}`);
        
        if (attempt === this.maxAttempts) {
          throw new Error(`JAR loading failed after ${this.maxAttempts} attempts: ${error.message}`);
        }
        
        // Wait before next attempt
        this.logger.log(`⏳ [JarLoader] Waiting ${this.delayMs}ms before next JAR loading test...`);
        await new Promise(resolve => setTimeout(resolve, this.delayMs));
      }
    }
  }

  async loadAndWait() {
    const aspose = await this.loadAspose();
    await this.waitForJar();
    return aspose;
  }
}

module.exports = JarLoader; 