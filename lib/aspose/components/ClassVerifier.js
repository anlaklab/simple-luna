/**
 * ClassVerifier - Verifies critical Aspose.Slides classes are available
 * 
 * Ensures all necessary Aspose.Slides classes are properly loaded
 * and accessible before proceeding with license application
 */

class ClassVerifier {
  constructor(config = {}) {
    this.aspose = config.aspose;
    this.java = config.java;
    this.logger = config.logger || console;
    
    // Critical classes that must be available
    this.criticalClasses = [
      'Presentation',
      'License',
      'AdjustValue',
      'ShapeType',
      'TextFrame'
    ];
  }

  verify() {
    this.logger.log('🔍 [ClassVerifier] Verifying critical Aspose classes...');
    
    for (const className of this.criticalClasses) {
      try {
        if (className === 'Presentation' || className === 'License') {
          // These are JavaScript classes in the Aspose library
          if (!this.aspose[className]) {
            throw new Error(`${className} class not available in Aspose library`);
          }
          this.logger.log(`✅ [ClassVerifier] ${className} class verified (JavaScript)`);
        } else {
          // These are Java classes that need to be imported
          const javaClass = this.java.import(`com.aspose.slides.${className}`);
          if (!javaClass) {
            throw new Error(`com.aspose.slides.${className} not available`);
          }
          this.logger.log(`✅ [ClassVerifier] ${className} class verified (Java)`);
        }
      } catch (error) {
        this.logger.error(`❌ [ClassVerifier] Critical class ${className} verification failed: ${error.message}`);
        throw new Error(`Critical class ${className} not available: ${error.message}`);
      }
    }

    this.logger.log('✅ [ClassVerifier] All critical classes verified successfully');
    return true;
  }

  // Additional verification for specific functionality
  verifyPresentationCreation() {
    try {
      this.logger.log('🔍 [ClassVerifier] Testing presentation creation...');
      
      const presentation = new this.aspose.Presentation();
      if (!presentation) {
        throw new Error('Failed to create presentation instance');
      }
      
      this.logger.log('🔍 [ClassVerifier] Presentation created successfully');
      
      // Get slides collection and investigate its structure
      const slides = presentation.getSlides();
      if (!slides) {
        throw new Error('getSlides() returned null or undefined');
      }
      
      this.logger.log(`🔍 [ClassVerifier] Slides object type: ${typeof slides}`);
      this.logger.log(`🔍 [ClassVerifier] Slides object constructor: ${slides.constructor?.name || 'unknown'}`);
      
      // Log all available methods on the slides object
      const availableMethods = Object.getOwnPropertyNames(slides).filter(name => 
        typeof slides[name] === 'function' && !name.startsWith('_')
      );
      this.logger.log(`🔍 [ClassVerifier] Available methods on slides object: ${availableMethods.join(', ')}`);
      
      // Try different approaches to get slide count
      let slideCount = 0;
      let methodUsed = '';
      
      if (typeof slides.getCount === 'function') {
        slideCount = slides.getCount();
        methodUsed = 'getCount()';
      } else if (typeof slides.size === 'function') {
        slideCount = slides.size();
        methodUsed = 'size()';
      } else if (typeof slides.length === 'number') {
        slideCount = slides.length;
        methodUsed = 'length property';
      } else if (typeof slides.count === 'function') {
        slideCount = slides.count();
        methodUsed = 'count()';
      } else {
        // Try to access the underlying Java object
        try {
          if (slides.java && typeof slides.java.getCount === 'function') {
            slideCount = slides.java.getCount();
            methodUsed = 'java.getCount()';
          } else {
            throw new Error('No known method to get slide count found');
          }
        } catch (javaError) {
          throw new Error(`No known method to get slide count found. Available methods: ${availableMethods.join(', ')}`);
        }
      }
      
      this.logger.log(`🔍 [ClassVerifier] Slide count: ${slideCount} (using ${methodUsed})`);
      
      // A new presentation should have at least one slide
      if (slideCount < 1) {
        throw new Error('New presentation should have at least one slide');
      }
      
      presentation.dispose();
      this.logger.log('✅ [ClassVerifier] Presentation creation test passed');
      return true;
    } catch (error) {
      this.logger.error(`❌ [ClassVerifier] Presentation creation test failed: ${error.message}`);
      throw new Error(`Presentation creation verification failed: ${error.message}`);
    }
  }
}

module.exports = ClassVerifier; 