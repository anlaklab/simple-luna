const fs = require('fs');
const path = require('path');

async function runContainerTests() {
    console.log('🧪 Running integration tests inside container...');
    
    const results = {
        timestamp: new Date().toISOString(),
        tests: [],
        environment: {
            nodeVersion: process.version,
            platform: process.platform,
            arch: process.arch,
            javaHome: process.env.JAVA_HOME,
            asposeLibPath: '/app/lib'
        }
    };
    
    // Test 1: Environment Check
    console.log('🔄 Testing environment...');
    const envTest = {
        name: 'Environment Check',
        startTime: Date.now()
    };
    
    try {
        // Check Java
        const { execSync } = require('child_process');
        const javaVersion = execSync('java -version', { encoding: 'utf8', stdio: 'pipe' });
        envTest.javaVersion = javaVersion.split('\n')[0];
        
        // Check Aspose files
        const asposeFiles = {
            js: fs.existsSync('/app/lib/aspose.slides.js'),
            jar: fs.existsSync('/app/lib/aspose-slides-25.6-nodejs.jar'),
            license: fs.existsSync('/app/Aspose.Slides.Product.Family.lic')
        };
        envTest.asposeFiles = asposeFiles;
        
        envTest.success = true;
        console.log('✅ Environment check passed');
    } catch (error) {
        envTest.success = false;
        envTest.error = error.message;
        console.log('❌ Environment check failed:', error.message);
    }
    
    envTest.duration = Date.now() - envTest.startTime;
    results.tests.push(envTest);
    
    // Test 2: Aspose.Slides Library Loading
    console.log('🔄 Testing Aspose.Slides library loading...');
    const asposeTest = {
        name: 'Aspose Library Loading',
        startTime: Date.now()
    };
    
    try {
        const asposeSlides = require('/app/lib/aspose.slides');
        
        // Test basic functionality
        const presentation = new asposeSlides.Presentation();
        const slideCount = presentation.getSlides().size();
        
        asposeTest.defaultSlideCount = slideCount;
        asposeTest.libraryLoaded = true;
        
        // Clean up
        presentation.dispose();
        
        asposeTest.success = true;
        console.log('✅ Aspose.Slides library loaded and functional');
    } catch (error) {
        asposeTest.success = false;
        asposeTest.error = error.message;
        console.log('❌ Aspose.Slides library test failed:', error.message);
    }
    
    asposeTest.duration = Date.now() - asposeTest.startTime;
    results.tests.push(asposeTest);
    
    // Test 3: PPTX File Processing
    if (asposeTest.success) {
        console.log('🔄 Testing PPTX file processing...');
        const pptxTest = {
            name: 'PPTX File Processing',
            startTime: Date.now()
        };
        
        try {
            const asposeSlides = require('/app/lib/aspose.slides');
            const inputPath = '/app/Slideworks_business_case_template.pptx';
            
            if (fs.existsSync(inputPath)) {
                // Load and analyze presentation
                const presentation = new asposeSlides.Presentation(inputPath);
                
                pptxTest.analysis = {
                    slideCount: presentation.getSlides().size(),
                    masterSlideCount: presentation.getMasters().size(),
                    layoutSlideCount: presentation.getLayoutSlides().size(),
                    slideSize: {
                        width: presentation.getSlideSize().getSize().getWidth(),
                        height: presentation.getSlideSize().getSize().getHeight()
                    }
                };
                
                // Extract basic slide information
                const slides = presentation.getSlides();
                pptxTest.slideDetails = [];
                
                for (let i = 0; i < Math.min(slides.size(), 3); i++) { // Test first 3 slides
                    const slide = slides.get_Item(i);
                    const shapes = slide.getShapes();
                    
                    pptxTest.slideDetails.push({
                        index: i,
                        name: slide.getName() || `Slide ${i + 1}`,
                        shapeCount: shapes.size(),
                        hidden: slide.getHidden()
                    });
                }
                
                // Test thumbnail generation
                const firstSlide = slides.get_Item(0);
                const thumbnail = firstSlide.getThumbnail(1.0, 1.0);
                thumbnail.save('/app/temp/test-thumbnail.png', asposeSlides.ImageFormat.Png);
                
                pptxTest.thumbnailGenerated = fs.existsSync('/app/temp/test-thumbnail.png');
                
                // Test PDF conversion
                presentation.save('/app/temp/test-output.pdf', asposeSlides.SaveFormat.Pdf);
                pptxTest.pdfGenerated = fs.existsSync('/app/temp/test-output.pdf');
                
                if (pptxTest.pdfGenerated) {
                    pptxTest.pdfSize = fs.statSync('/app/temp/test-output.pdf').size;
                }
                
                // Clean up
                presentation.dispose();
                
                pptxTest.success = true;
                console.log(`✅ PPTX processing successful - ${pptxTest.analysis.slideCount} slides analyzed`);
            } else {
                throw new Error('Test PPTX file not found in container');
            }
            
        } catch (error) {
            pptxTest.success = false;
            pptxTest.error = error.message;
            console.log('❌ PPTX processing failed:', error.message);
        }
        
        pptxTest.duration = Date.now() - pptxTest.startTime;
        results.tests.push(pptxTest);
    }
    
    // Generate summary
    const passedTests = results.tests.filter(t => t.success).length;
    const totalTests = results.tests.length;
    
    results.summary = {
        totalTests: totalTests,
        passedTests: passedTests,
        failedTests: totalTests - passedTests,
        successRate: ((passedTests / totalTests) * 100).toFixed(1) + '%'
    };
    
    console.log('\n📊 CONTAINER TEST RESULTS:');
    console.log(`   Total Tests: ${results.summary.totalTests}`);
    console.log(`   Passed: ${results.summary.passedTests}`);
    console.log(`   Failed: ${results.summary.failedTests}`);
    console.log(`   Success Rate: ${results.summary.successRate}`);
    
    // Save results
    fs.writeFileSync('/app/temp/container-test-results.json', JSON.stringify(results, null, 2));
    
    console.log('\n🎯 Container integration test completed!');
    
    return results;
}

// Run tests
runContainerTests().catch(error => {
    console.error('❌ Container test failed:', error.message);
    process.exit(1);
});
