/**
 * DIRECT LICENSE TEST
 * Test Aspose.Slides license loading directly without any other dependencies
 */

const fs = require('fs');
const path = require('path');

async function testLicenseDirectly() {
  console.log('🔑 DIRECT LICENSE TEST');
  console.log('======================');
  
  try {
    // STEP 1: Configure Java environment
    process.env.JAVA_TOOL_OPTIONS = [
      '-Djava.awt.headless=true',
      '-Dfile.encoding=UTF-8',
      '-Djava.util.prefs.systemRoot=/tmp',
      '-Duser.timezone=UTC'
    ].join(' ');

    if (!process.env.JAVA_OPTS) {
      process.env.JAVA_OPTS = '-Xmx2g -Xms512m';
    }

    console.log('✅ Java environment configured');

    // STEP 2: Load Aspose.Slides
    console.log('📦 Loading Aspose.Slides library...');
    const aspose = require('./lib/aspose.slides.js');
    
    if (!aspose || !aspose.Presentation) {
      throw new Error('Aspose.Slides failed to load');
    }
    console.log('✅ Aspose.Slides loaded');

    // STEP 3: Check license file
    const licensePath = process.env.ASPOSE_LICENSE_PATH || './Aspose.Slides.Product.Family.lic';
    const absoluteLicensePath = path.resolve(licensePath);
    
    console.log(`🔍 License path: ${absoluteLicensePath}`);
    
    if (!fs.existsSync(absoluteLicensePath)) {
      console.error(`❌ License file not found: ${absoluteLicensePath}`);
      return false;
    }
    
    const fileStats = fs.statSync(absoluteLicensePath);
    console.log(`✅ License file found (${fileStats.size} bytes)`);

    // STEP 4: Read license content (first few bytes to verify it's valid)
    const licenseData = fs.readFileSync(absoluteLicensePath);
    console.log(`📄 License starts with: ${licenseData.toString('utf8', 0, 50)}...`);

    // STEP 5: Apply license
    console.log('🔑 Applying license...');
    
    if (!aspose.License) {
      console.error('❌ License class not available');
      return false;
    }

    const License = aspose.License;
    const license = new License();
    
    try {
      license.setLicense(absoluteLicensePath);
      console.log('✅ License.setLicense() called without error');
    } catch (licenseError) {
      console.error(`❌ License.setLicense() failed: ${licenseError.message}`);
      return false;
    }

    // STEP 6: Test effectiveness with minimal presentation
    console.log('🧪 Testing license effectiveness...');
    
    const testPres = new aspose.Presentation();
    const slide = testPres.getSlides().get_Item(0);
    
    // Add shape with text that would be truncated in evaluation mode
    const shape = slide.getShapes().addAutoShape(
      aspose.ShapeType.Rectangle, 100, 100, 400, 100
    );
    
    const longText = 'This is a very long text that should be fully preserved if the license is working correctly. In evaluation mode, this text would be truncated with a message about evaluation version limitations. If you can read this complete sentence, the license is working properly and all content should be extracted without limitations.';
    
    shape.getTextFrame().setText(longText);
    
    // Get text back
    const resultText = shape.getTextFrame().getText();
    
    console.log(`📝 Original text length: ${longText.length}`);
    console.log(`📝 Result text length: ${resultText.length}`);
    console.log(`📝 First 100 chars: ${resultText.substring(0, 100)}`);
    
    const isTruncated = resultText.includes('text has been truncated due to evaluation version limitation');
    const isComplete = resultText.length >= longText.length - 10; // Allow small margin
    
    console.log(`🔍 Is truncated: ${isTruncated ? 'YES ❌' : 'NO ✅'}`);
    console.log(`🔍 Is complete: ${isComplete ? 'YES ✅' : 'NO ❌'}`);
    
    // Clean up
    testPres.dispose();
    
    // FINAL RESULT
    const licenseWorking = !isTruncated && isComplete;
    console.log('');
    console.log('🎯 FINAL RESULT:');
    console.log(`   License working: ${licenseWorking ? 'YES ✅' : 'NO ❌'}`);
    
    if (!licenseWorking) {
      console.log('');
      console.log('❌ POSSIBLE ISSUES:');
      console.log('   - License file may be corrupted');
      console.log('   - License may be for wrong Aspose.Slides version');
      console.log('   - License may have expired');
      console.log('   - Java environment may be interfering');
      console.log('   - Library may not be loading license correctly');
    }
    
    return licenseWorking;

  } catch (error) {
    console.error(`❌ Test failed: ${error.message}`);
    console.error(error.stack);
    return false;
  }
}

// Run the test
testLicenseDirectly().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('❌ Test crashed:', error.message);
  process.exit(1);
}); 