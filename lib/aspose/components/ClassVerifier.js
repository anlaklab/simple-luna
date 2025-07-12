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
      
      const slideCount = presentation.getSlides().getCount();
      if (slideCount === 0) {
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