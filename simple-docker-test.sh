#!/bin/bash

# Luna PowerPoint Processing - Simple Docker Test
# Tests core Aspose.Slides functionality without complex server dependencies

set -e

echo "🌙 Luna PowerPoint Processing - Simple Docker Integration Test"
echo "=============================================================="

# Configuration
CONTAINER_NAME="luna-simple-test"
IMAGE_NAME="aspose-slides-256-nodejs-luna-server"
TEST_FILE="Slideworks_business_case_template.pptx"
OUTPUT_DIR="./test-outputs"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_step() {
    echo -e "${CYAN}🔄 $1${NC}"
}

# Cleanup function
cleanup() {
    log_step "Cleaning up..."
    docker stop $CONTAINER_NAME 2>/dev/null || true
    docker rm $CONTAINER_NAME 2>/dev/null || true
}

# Set trap for cleanup on exit
trap cleanup EXIT

# Verify test file
log_step "Verifying test file..."
if [ ! -f "$TEST_FILE" ]; then
    log_error "Test file not found: $TEST_FILE"
    exit 1
fi
log_success "Test file found: $TEST_FILE"

# Create output directory
mkdir -p $OUTPUT_DIR

# Create simple test script
log_step "Creating simple test script..."
cat > simple-test.js << 'EOF'
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
EOF

log_success "Simple test script created"

# Run container with direct Aspose test
log_step "Starting container for simple test..."
docker run --rm \
    --name $CONTAINER_NAME \
    -v "$(pwd)/$TEST_FILE:/app/test-file.pptx" \
    -v "$(pwd)/simple-test.js:/app/simple-test.js" \
    -v "$(pwd)/$OUTPUT_DIR:/app/output" \
    $IMAGE_NAME \
    /bin/bash -c "node simple-test.js && cp /app/temp/simple-test-results.json /app/output/ 2>/dev/null || echo 'Results copy failed'; cp /app/temp/test-thumb.png /app/output/ 2>/dev/null || echo 'Thumbnail copy failed'; cp /app/temp/test-output.pdf /app/output/ 2>/dev/null || echo 'PDF copy failed'; cp /app/temp/created-test.pptx /app/output/ 2>/dev/null || echo 'Created PPTX copy failed'"

# Check results
if [ -f "$OUTPUT_DIR/simple-test-results.json" ]; then
    log_step "Analyzing results..."
    
    # Parse results
    if command -v jq >/dev/null 2>&1; then
        SUCCESS_RATE=$(cat $OUTPUT_DIR/simple-test-results.json | jq -r '.summary.successRate')
        PASSED=$(cat $OUTPUT_DIR/simple-test-results.json | jq -r '.summary.passed')
        TOTAL=$(cat $OUTPUT_DIR/simple-test-results.json | jq -r '.summary.total')
    else
        # Fallback parsing without jq
        SUCCESS_RATE=$(grep -o '"successRate":"[^"]*"' $OUTPUT_DIR/simple-test-results.json | cut -d'"' -f4)
        PASSED=$(grep -o '"passed":[0-9]*' $OUTPUT_DIR/simple-test-results.json | cut -d':' -f2)
        TOTAL=$(grep -o '"total":[0-9]*' $OUTPUT_DIR/simple-test-results.json | cut -d':' -f2)
    fi
    
    echo ""
    echo "=============================================================="
    echo "🎯 LUNA SIMPLE INTEGRATION TEST RESULTS"
    echo "=============================================================="
    echo ""
    echo "📊 SUMMARY:"
    echo "   Tests Passed: $PASSED/$TOTAL"
    echo "   Success Rate: $SUCCESS_RATE"
    echo ""
    echo "📁 OUTPUT FILES:"
    echo "   Results: $OUTPUT_DIR/simple-test-results.json"
    [ -f "$OUTPUT_DIR/test-thumb.png" ] && echo "   ✅ Thumbnail: $OUTPUT_DIR/test-thumb.png"
    [ -f "$OUTPUT_DIR/test-output.pdf" ] && echo "   ✅ PDF: $OUTPUT_DIR/test-output.pdf"
    [ -f "$OUTPUT_DIR/created-test.pptx" ] && echo "   ✅ Created PPTX: $OUTPUT_DIR/created-test.pptx"
    echo ""
    
    if [ "$SUCCESS_RATE" = "100.0%" ]; then
        log_success "🎉 ALL TESTS PASSED! Aspose.Slides integration is fully functional!"
    else
        log_error "⚠️ Some tests failed. Check detailed results."
    fi
else
    log_error "Results file not found - test may have failed completely"
    exit 1
fi

echo "=============================================================="
echo "🌙 Simple integration test completed!"
echo "=============================================================="

# Cleanup happens automatically