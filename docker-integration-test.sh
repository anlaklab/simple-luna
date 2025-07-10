#!/bin/bash

# Luna PowerPoint Processing - Docker Integration Test Script
# This script runs comprehensive integration tests inside the Docker container
# where all dependencies (Java, Aspose.Slides) are properly configured

set -e

echo "🌙 Luna PowerPoint Processing - Docker Integration Test Suite"
echo "================================================================================"

# Configuration
CONTAINER_NAME="luna-integration-test"
IMAGE_NAME="aspose-slides-256-nodejs-luna-server"
TEST_FILE="Slideworks_business_case_template.pptx"
OUTPUT_DIR="./test-outputs"
SERVER_PORT=3000

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

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
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
    log_info "Cleanup completed"
}

# Set trap for cleanup on exit
trap cleanup EXIT

# Step 1: Verify input file exists
log_step "Verifying test input file..."
if [ ! -f "$TEST_FILE" ]; then
    log_error "Test file not found: $TEST_FILE"
    exit 1
fi

INPUT_SIZE=$(stat -f%z "$TEST_FILE" 2>/dev/null || stat -c%s "$TEST_FILE" 2>/dev/null)
log_success "Test file found: $TEST_FILE ($(numfmt --to=iec $INPUT_SIZE))"

# Step 2: Build Docker image
log_step "Building Docker image..."
docker build -t $IMAGE_NAME . || {
    log_error "Docker build failed"
    exit 1
}
log_success "Docker image built successfully"

# Step 3: Prepare test environment
log_step "Preparing test environment..."
mkdir -p $OUTPUT_DIR
log_success "Output directory ready: $OUTPUT_DIR"

# Step 4: Create integration test script for container
log_step "Creating container test script..."
cat > container-test.js << 'EOF'
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
EOF

log_success "Container test script created"

# Step 5: Start container with test setup
log_step "Starting Docker container for testing..."
docker run -d \
    --name $CONTAINER_NAME \
    -p $SERVER_PORT:3000 \
    -v "$(pwd)/$TEST_FILE:/app/$TEST_FILE" \
    -v "$(pwd)/container-test.js:/app/container-test.js" \
    -v "$(pwd)/$OUTPUT_DIR:/app/output" \
    $IMAGE_NAME || {
    log_error "Failed to start container"
    exit 1
}

log_success "Container started: $CONTAINER_NAME"

# Step 6: Wait for container to be ready
log_step "Waiting for container to initialize..."
sleep 10

# Step 7: Check container health
log_step "Checking container health..."
CONTAINER_STATUS=$(docker inspect --format='{{.State.Status}}' $CONTAINER_NAME)
if [ "$CONTAINER_STATUS" != "running" ]; then
    log_error "Container is not running (status: $CONTAINER_STATUS)"
    docker logs $CONTAINER_NAME
    exit 1
fi
log_success "Container is running"

# Step 8: Run integration tests inside container
log_step "Running integration tests inside container..."
docker exec $CONTAINER_NAME node container-test.js || {
    log_warning "Container tests encountered issues - checking logs..."
    docker logs $CONTAINER_NAME
}

# Step 9: Copy test results from container
log_step "Copying test results from container..."
docker cp $CONTAINER_NAME:/app/temp/container-test-results.json $OUTPUT_DIR/container-test-results.json 2>/dev/null || {
    log_warning "Could not copy test results file"
}

# Copy generated files if they exist
docker cp $CONTAINER_NAME:/app/temp/test-thumbnail.png $OUTPUT_DIR/test-thumbnail.png 2>/dev/null && {
    log_success "Thumbnail copied from container"
} || log_info "No thumbnail to copy"

docker cp $CONTAINER_NAME:/app/temp/test-output.pdf $OUTPUT_DIR/test-output.pdf 2>/dev/null && {
    log_success "PDF output copied from container"
} || log_info "No PDF to copy"

# Step 10: Display test results
if [ -f "$OUTPUT_DIR/container-test-results.json" ]; then
    log_step "Analyzing test results..."
    
    # Extract key information from results
    SUCCESS_RATE=$(cat $OUTPUT_DIR/container-test-results.json | grep -o '"successRate":"[^"]*"' | cut -d'"' -f4)
    TOTAL_TESTS=$(cat $OUTPUT_DIR/container-test-results.json | grep -o '"totalTests":[0-9]*' | cut -d':' -f2)
    PASSED_TESTS=$(cat $OUTPUT_DIR/container-test-results.json | grep -o '"passedTests":[0-9]*' | cut -d':' -f2)
    
    echo ""
    echo "================================================================================"
    echo "🎯 LUNA DOCKER INTEGRATION TEST RESULTS"
    echo "================================================================================"
    echo ""
    echo "📊 TEST SUMMARY:"
    echo "   Total Tests: $TOTAL_TESTS"
    echo "   Passed Tests: $PASSED_TESTS"
    echo "   Success Rate: $SUCCESS_RATE"
    echo ""
    echo "📁 OUTPUT FILES:"
    echo "   Test Results: $OUTPUT_DIR/container-test-results.json"
    [ -f "$OUTPUT_DIR/test-thumbnail.png" ] && echo "   ✅ Thumbnail: $OUTPUT_DIR/test-thumbnail.png"
    [ -f "$OUTPUT_DIR/test-output.pdf" ] && echo "   ✅ PDF Output: $OUTPUT_DIR/test-output.pdf"
    echo ""
    
    if [ "$SUCCESS_RATE" = "100.0%" ]; then
        log_success "🎉 ALL INTEGRATION TESTS PASSED! Luna PowerPoint processing is fully functional."
    else
        log_warning "⚠️ Some tests failed. Check the detailed results for troubleshooting information."
    fi
else
    log_error "Test results file not found - integration test may have failed"
    log_info "Checking container logs..."
    docker logs $CONTAINER_NAME
    exit 1
fi

echo "================================================================================"
echo "🌙 Docker integration test completed!"
echo "================================================================================"

# Cleanup will happen automatically via trap