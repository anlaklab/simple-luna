/**
 * LicenseTester - Tests Aspose.Slides license effectiveness
 * 
 * Verifies that the applied license is working correctly by
 * testing functionality that would be limited in evaluation mode
 */

class LicenseTester {
  constructor(config = {}) {
    this.aspose = config.aspose;
    this.logger = config.logger || console;
    
    // Test text that would be truncated in evaluation mode
    this.testText = 'LICENSE EFFECTIVENESS TEST: This is a long text to verify that the license is working correctly and text is not being truncated due to evaluation version limitations. If you see this complete text, the license is working properly. This text should be long enough to trigger evaluation mode truncation if the license is not working.';
  }

  async test() {
    try {
      this.logger.log('🔍 [LicenseTester] Testing license effectiveness...');
      
      // Create test presentation
      const testPresentation = new this.aspose.Presentation();
      const testSlide = testPresentation.getSlides().get_Item(0);
      
      // Add test shape with substantial text
      const testShape = testSlide.getShapes().addAutoShape(
        this.aspose.ShapeType.Rectangle, 100, 100, 400, 100
      );
      
      testShape.getTextFrame().setText(this.testText);
      
      // Get the text back
      const resultText = testShape.getTextFrame().getText();
      
      // Clean up
      testPresentation.dispose();
      
      // Check if text was truncated
      const isTruncated = resultText.includes('text has been truncated due to evaluation version limitation');
      const isComplete = resultText.includes('license is working properly');
      
      this.logger.log(`🔍 [LicenseTester] License test result:`);
      this.logger.log(`   - Original text length: ${this.testText.length}`);
      this.logger.log(`   - Retrieved text length: ${resultText.length}`);
      this.logger.log(`   - Text truncated: ${isTruncated ? 'YES ❌' : 'NO ✅'}`);
      this.logger.log(`   - Text complete: ${isComplete ? 'YES ✅' : 'NO ❌'}`);
      
      const result = {
        effective: !isTruncated && isComplete,
        reason: isTruncated ? 'Text truncation detected' : (isComplete ? 'License working' : 'Incomplete text'),
        originalLength: this.testText.length,
        resultLength: resultText.length,
        truncated: isTruncated,
        complete: isComplete,
        resultText: resultText.substring(0, 100) + '...' // First 100 chars for debugging
      };
      
      if (result.effective) {
        this.logger.log('✅ [LicenseTester] License effectiveness test passed');
      } else {
        this.logger.warn(`⚠️ [LicenseTester] License effectiveness test failed: ${result.reason}`);
      }
      
      return result;

    } catch (error) {
      this.logger.error(`❌ [LicenseTester] License test failed: ${error.message}`);
      return {
        effective: false,
        reason: `Test error: ${error.message}`,
        error: error.message
      };
    }
  }

  // Additional test for specific features
  async testAdvancedFeatures() {
    try {
      this.logger.log('🔍 [LicenseTester] Testing advanced features...');
      
      const testPresentation = new this.aspose.Presentation();
      const testSlide = testPresentation.getSlides().get_Item(0);
      
      // Test chart creation (often limited in evaluation)
      const chart = testSlide.getShapes().addChart(
        this.aspose.ShapeType.Column, 100, 200, 300, 200
      );
      
      if (!chart) {
        throw new Error('Chart creation failed');
      }
      
      // Test animation (often limited in evaluation)
      const animation = testSlide.getTimeline().getMainSequence();
      if (!animation) {
        throw new Error('Animation sequence not available');
      }
      
      testPresentation.dispose();
      
      this.logger.log('✅ [LicenseTester] Advanced features test passed');
      return { effective: true, reason: 'Advanced features working' };
      
    } catch (error) {
      this.logger.error(`❌ [LicenseTester] Advanced features test failed: ${error.message}`);
      return { effective: false, reason: `Advanced features error: ${error.message}` };
    }
  }

  // Comprehensive test combining all tests
  async comprehensiveTest() {
    const basicTest = await this.test();
    const advancedTest = await this.testAdvancedFeatures();
    
    const comprehensive = {
      effective: basicTest.effective && advancedTest.effective,
      basicTest,
      advancedTest,
      overall: {
        effective: basicTest.effective && advancedTest.effective,
        reason: basicTest.effective && advancedTest.effective ? 
          'All tests passed' : 
          `Basic: ${basicTest.reason}, Advanced: ${advancedTest.reason}`
      }
    };
    
    if (comprehensive.effective) {
      this.logger.log('✅ [LicenseTester] Comprehensive license test passed');
    } else {
      this.logger.warn(`⚠️ [LicenseTester] Comprehensive license test failed: ${comprehensive.overall.reason}`);
    }
    
    return comprehensive;
  }
}

module.exports = LicenseTester; 