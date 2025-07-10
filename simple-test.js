const fs = require('fs');
const path = require('path');

async function runSimpleTest() {
    console.log('🧪 Running simple Aspose.Slides test...');
    
    const results = {
        timestamp: new Date().toISOString(),
        environment: {
            nodeVersion: process.version,
            platform: process.platform,
            javaHome: process.env.JAVA_HOME
        },
        tests: []
    };
    
    // Test 1: Environment Check
    console.log('🔄 Checking environment...');
    const envTest = { name: 'Environment', success: false, startTime: Date.now() };
    
    try {
        // Check Java
        const { execSync } = require('child_process');
        const javaVersion = execSync('java -version', { encoding: 'utf8', stderr: 'pipe' });
        envTest.javaInfo = javaVersion.split('\n')[0];
        
        // Check Aspose files
        const asposeJsExists = fs.existsSync('/app/lib/aspose.slides.js');
        const asposeJarExists = fs.existsSync('/app/lib/aspose-slides-25.6-nodejs.jar');
        
        envTest.asposeFiles = {
            js: asposeJsExists,
            jar: asposeJarExists
        };
        
        if (asposeJsExists && asposeJarExists) {
            envTest.success = true;
            console.log('✅ Environment check passed');
        } else {
            throw new Error('Aspose files not found');
        }
    } catch (error) {
        envTest.error = error.message;
        console.log('❌ Environment check failed:', error.message);
    }
    
    envTest.duration = Date.now() - envTest.startTime;
    results.tests.push(envTest);
    
    // Test 2: Aspose Library Loading
    if (envTest.success) {
        console.log('🔄 Testing Aspose library loading...');
        const libTest = { name: 'Library Loading', success: false, startTime: Date.now() };
        
        try {
            // Try to load Aspose.Slides
            const asposeSlides = require('/app/lib/aspose.slides');
            
            // Test basic functionality
            const presentation = new asposeSlides.Presentation();
            const slideCount = presentation.getSlides().size();
            
            libTest.defaultSlideCount = slideCount;
            presentation.dispose();
            
            libTest.success = true;
            console.log('✅ Aspose library loaded successfully');
        } catch (error) {
            libTest.error = error.message;
            console.log('❌ Aspose library loading failed:', error.message);
        }
        
        libTest.duration = Date.now() - libTest.startTime;
        results.tests.push(libTest);
        
        // Test 3: PPTX Processing
        if (libTest.success) {
            console.log('🔄 Testing PPTX file processing...');
            const pptxTest = { name: 'PPTX Processing', success: false, startTime: Date.now() };
            
            try {
                const asposeSlides = require('/app/lib/aspose.slides');
                const inputPath = '/app/test-file.pptx';
                
                if (fs.existsSync(inputPath)) {
                    // Load presentation
                    const presentation = new asposeSlides.Presentation(inputPath);
                    
                    // Get basic info
                    const slideCount = presentation.getSlides().size();
                    const slideSize = presentation.getSlideSize().getSize();
                    
                    pptxTest.analysis = {
                        slideCount: slideCount,
                        slideWidth: slideSize.getWidth(),
                        slideHeight: slideSize.getHeight()
                    };
                    
                    // Test thumbnail generation
                    if (slideCount > 0) {
                        const firstSlide = presentation.getSlides().get_Item(0);
                        const thumbnail = firstSlide.getThumbnail(1.0, 1.0);
                        thumbnail.save('/app/temp/test-thumb.png', asposeSlides.ImageFormat.Png);
                        
                        pptxTest.thumbnailGenerated = fs.existsSync('/app/temp/test-thumb.png');
                        if (pptxTest.thumbnailGenerated) {
                            pptxTest.thumbnailSize = fs.statSync('/app/temp/test-thumb.png').size;
                        }
                    }
                    
                    // Test PDF conversion
                    presentation.save('/app/temp/test-output.pdf', asposeSlides.SaveFormat.Pdf);
                    pptxTest.pdfGenerated = fs.existsSync('/app/temp/test-output.pdf');
                    
                    if (pptxTest.pdfGenerated) {
                        pptxTest.pdfSize = fs.statSync('/app/temp/test-output.pdf').size;
                    }
                    
                    // Test JSON extraction (basic)
                    const slides = presentation.getSlides();
                    const slideInfo = [];
                    
                    for (let i = 0; i < Math.min(slideCount, 2); i++) {
                        const slide = slides.get_Item(i);
                        slideInfo.push({
                            index: i,
                            shapeCount: slide.getShapes().size(),
                            hidden: slide.getHidden()
                        });
                    }
                    
                    pptxTest.slideInfo = slideInfo;
                    
                    // Test PPTX creation from scratch
                    const newPresentation = new asposeSlides.Presentation();
                    const newSlide = newPresentation.getSlides().get_Item(0);
                    
                    // Add a text box
                    const textBox = newSlide.getShapes().addAutoShape(
                        asposeSlides.ShapeType.Rectangle,
                        100, 100, 400, 100
                    );
                    textBox.getTextFrame().setText('Test slide created by Luna Integration Test');
                    
                    // Remove fill and border to make it text-only
                    textBox.getFillFormat().setFillType(asposeSlides.FillType.NoFill);
                    textBox.getLineFormat().getFillFormat().setFillType(asposeSlides.FillType.NoFill);
                    
                    // Save new presentation
                    newPresentation.save('/app/temp/created-test.pptx', asposeSlides.SaveFormat.Pptx);
                    pptxTest.newPptxCreated = fs.existsSync('/app/temp/created-test.pptx');
                    
                    if (pptxTest.newPptxCreated) {
                        pptxTest.newPptxSize = fs.statSync('/app/temp/created-test.pptx').size;
                    }
                    
                    // Clean up
                    presentation.dispose();
                    newPresentation.dispose();
                    
                    pptxTest.success = true;
                    console.log(`✅ PPTX processing completed - ${slideCount} slides processed`);
                } else {
                    throw new Error('Test PPTX file not found');
                }
            } catch (error) {
                pptxTest.error = error.message;
                console.log('❌ PPTX processing failed:', error.message);
            }
            
            pptxTest.duration = Date.now() - pptxTest.startTime;
            results.tests.push(pptxTest);
        }
    }
    
    // Summary
    const passed = results.tests.filter(t => t.success).length;
    const total = results.tests.length;
    results.summary = {
        passed: passed,
        total: total,
        successRate: total > 0 ? ((passed / total) * 100).toFixed(1) + '%' : '0%'
    };
    
    console.log('\n📊 TEST SUMMARY:');
    console.log(`   Passed: ${passed}/${total}`);
    console.log(`   Success Rate: ${results.summary.successRate}`);
    
    // Save results
    fs.writeFileSync('/app/temp/simple-test-results.json', JSON.stringify(results, null, 2));
    
    if (passed === total) {
        console.log('\n🎉 ALL TESTS PASSED! Luna Aspose.Slides integration is working!');
    } else {
        console.log('\n⚠️ Some tests failed. Check results for details.');
    }
    
    return results;
}

runSimpleTest().catch(error => {
    console.error('❌ Simple test failed:', error.message);
    process.exit(1);
});
