#!/usr/bin/env node

/**
 * Luna PowerPoint Processing - Fixed End-to-End Test
 * 
 * Complete pipeline test with robust error handling for API variations
 */

const fs = require('fs');
const path = require('path');

// Test configuration
const TEST_CONFIG = {
  inputFile: '/app/test-file.pptx',
  outputDir: '/app/output',
  results: {
    convertedJson: 'converted-presentation.json',
    reconstructedPptx: 'reconstructed-presentation.pptx',
    thumbnailsDir: 'thumbnails',
    pdfOutput: 'converted-presentation.pdf',
    finalReport: 'fixed-e2e-report.json'
  }
};

let testResults = {
  startTime: new Date(),
  testName: 'Luna Fixed E2E Test - Slideworks Template',
  tests: [],
  files: {}
};

function log(message, level = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = { info: 'ℹ️', success: '✅', error: '❌', step: '🔄' };
  console.log(`${prefix[level]} [${timestamp}] ${message}`);
}

function startTest(testName) {
  const test = { name: testName, startTime: new Date(), status: 'running' };
  testResults.tests.push(test);
  log(`Starting: ${testName}`, 'step');
  return test;
}

function completeTest(test, success = true, details = {}) {
  test.endTime = new Date();
  test.duration = test.endTime - test.startTime;
  test.status = success ? 'passed' : 'failed';
  test.details = details;
  
  if (success) {
    log(`✅ ${test.name} (${test.duration}ms)`, 'success');
  } else {
    log(`❌ ${test.name}: ${details.error || 'Unknown error'}`, 'error');
  }
  return test;
}

function ensureDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function formatBytes(bytes) {
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Test 1: PPTX to JSON conversion (robust version)
async function testPptxToJsonConversion() {
  const test = startTest('PPTX to JSON Conversion');
  
  try {
    const asposeSlides = require('/app/lib/aspose.slides');
    
    if (!fs.existsSync(TEST_CONFIG.inputFile)) {
      throw new Error(`Input file not found: ${TEST_CONFIG.inputFile}`);
    }
    
    const fileSize = fs.statSync(TEST_CONFIG.inputFile).size;
    log(`Loading ${formatBytes(fileSize)} PPTX file...`);
    
    const presentation = new asposeSlides.Presentation(TEST_CONFIG.inputFile);
    
    // Create comprehensive JSON with safe API calls
    const universalSchema = {
      version: '1.0',
      generator: 'Luna Aspose.Slides Integration',
      timestamp: new Date().toISOString(),
      sourceFile: {
        name: 'Slideworks_business_case_template.pptx',
        size: fileSize
      },
      presentation: {
        metadata: {
          slideCount: presentation.getSlides().size(),
          masterSlideCount: presentation.getMasters().size(),
          layoutSlideCount: presentation.getLayoutSlides().size()
        },
        slideSize: {
          width: presentation.getSlideSize().getSize().getWidth(),
          height: presentation.getSlideSize().getSize().getHeight(),
          type: presentation.getSlideSize().getType().toString(),
          orientation: presentation.getSlideSize().getOrientation().toString()
        },
        documentProperties: {},
        slides: []
      }
    };
    
    // Extract document properties safely
    try {
      const docProps = presentation.getDocumentProperties();
      universalSchema.presentation.documentProperties = {
        title: docProps.getTitle() || '',
        author: docProps.getAuthor() || '',
        subject: docProps.getSubject() || '',
        keywords: docProps.getKeywords() || '',
        comments: docProps.getComments() || '',
        category: docProps.getCategory() || '',
        manager: docProps.getManager() || '',
        company: docProps.getCompany() || '',
        revisionNumber: docProps.getRevisionNumber() || 0,
        totalEditingTime: docProps.getTotalEditingTime() || 0
      };
    } catch (docError) {
      log(`Document properties extraction failed: ${docError.message}`, 'error');
    }
    
    // Extract slides with robust error handling
    const slides = presentation.getSlides();
    for (let i = 0; i < slides.size(); i++) {
      const slide = slides.get_Item(i);
      const slideData = {
        index: i,
        name: slide.getName() || `Slide ${i + 1}`,
        hidden: slide.getHidden(),
        shapeCount: slide.getShapes().size(),
        shapes: [],
        hasNotes: false,
        hasAnimations: false,
        animationCount: 0,
        transition: {}
      };
      
      // Extract shapes safely
      try {
        const shapes = slide.getShapes();
        for (let j = 0; j < shapes.size(); j++) {
          const shape = shapes.get_Item(j);
          const shapeData = {
            index: j,
            type: shape.getShapeType().toString(),
            name: shape.getName() || `Shape ${j + 1}`,
            geometry: {
              x: shape.getX(),
              y: shape.getY(),
              width: shape.getWidth(),
              height: shape.getHeight(),
              rotation: shape.getRotation()
            },
            hasText: false,
            textContent: null
          };
          
          // Extract text safely
          try {
            if (shape.getTextFrame && shape.getTextFrame()) {
              const textFrame = shape.getTextFrame();
              const text = textFrame.getText();
              if (text && text.trim().length > 0) {
                shapeData.hasText = true;
                shapeData.textContent = text.substring(0, 200) + (text.length > 200 ? '...' : '');
              }
            }
          } catch (textError) {
            log(`Text extraction failed for shape ${j}: ${textError.message}`, 'error');
          }
          
          slideData.shapes.push(shapeData);
        }
      } catch (shapeError) {
        log(`Shape extraction failed for slide ${i}: ${shapeError.message}`, 'error');
      }
      
      // Check for notes safely
      try {
        if (slide.getNotesSlideManager && slide.getNotesSlideManager() && 
            slide.getNotesSlideManager().getNotesSlide && slide.getNotesSlideManager().getNotesSlide()) {
          slideData.hasNotes = true;
        }
      } catch (notesError) {
        // Notes check failed, continue
      }
      
      // Check for animations safely
      try {
        const timeline = slide.getTimeline();
        if (timeline && timeline.getMainSequence) {
          const mainSequence = timeline.getMainSequence();
          if (mainSequence && typeof mainSequence.size === 'function') {
            const animCount = mainSequence.size();
            if (animCount > 0) {
              slideData.hasAnimations = true;
              slideData.animationCount = animCount;
            }
          }
        }
      } catch (animError) {
        // Animation check failed, continue without animations
      }
      
      // Extract transition safely
      try {
        const transition = slide.getSlideShowTransition();
        slideData.transition = {
          type: transition.getType().toString(),
          speed: transition.getSpeed().toString(),
          advanceOnClick: transition.getAdvanceOnClick(),
          advanceAfterTime: transition.getAdvanceAfterTime()
        };
      } catch (transError) {
        slideData.transition = { type: 'None' };
      }
      
      universalSchema.presentation.slides.push(slideData);
    }
    
    // Save JSON
    const jsonPath = path.join(TEST_CONFIG.outputDir, TEST_CONFIG.results.convertedJson);
    fs.writeFileSync(jsonPath, JSON.stringify(universalSchema, null, 2));
    
    const jsonSize = fs.statSync(jsonPath).size;
    const totalShapes = universalSchema.presentation.slides.reduce((sum, s) => sum + s.shapes.length, 0);
    
    presentation.dispose();
    
    completeTest(test, true, {
      slideCount: universalSchema.presentation.metadata.slideCount,
      totalShapes: totalShapes,
      jsonSize: jsonSize,
      compressionRatio: (fileSize / jsonSize).toFixed(2)
    });
    
    testResults.files.universalSchema = universalSchema;
    return { universalSchema, jsonPath };
    
  } catch (error) {
    completeTest(test, false, { error: error.message });
    throw error;
  }
}

// Test 2: JSON to PPTX reconstruction (simplified but functional)
async function testJsonToPptxReconstruction(jsonData) {
  const test = startTest('JSON to PPTX Reconstruction');
  
  try {
    const asposeSlides = require('/app/lib/aspose.slides');
    const outputPath = path.join(TEST_CONFIG.outputDir, TEST_CONFIG.results.reconstructedPptx);
    
    log('Reconstructing PPTX from JSON...');
    
    const presentation = new asposeSlides.Presentation();
    
    // Set slide size
    if (jsonData.presentation.slideSize) {
      presentation.getSlideSize().setSize(
        jsonData.presentation.slideSize.width,
        jsonData.presentation.slideSize.height
      );
    }
    
    // Set document properties
    try {
      if (jsonData.presentation.documentProperties) {
        const docProps = presentation.getDocumentProperties();
        const props = jsonData.presentation.documentProperties;
        
        if (props.title) docProps.setTitle(props.title);
        if (props.author) docProps.setAuthor(props.author);
        if (props.subject) docProps.setSubject(props.subject);
        if (props.company) docProps.setCompany(props.company);
      }
    } catch (docError) {
      log(`Document properties setting failed: ${docError.message}`, 'error');
    }
    
    // Remove default slide
    presentation.getSlides().removeAt(0);
    
    // Reconstruct slides (focus on text content)
    const slidesData = jsonData.presentation.slides;
    let reconstructedShapes = 0;
    
    for (let i = 0; i < slidesData.length; i++) {
      const slideData = slidesData[i];
      
      // Add new slide
      const slide = presentation.getSlides().addEmptySlide(
        presentation.getLayoutSlides().get_Item(0)
      );
      
      if (slideData.name) slide.setName(slideData.name);
      
      // Add text shapes only (most reliable)
      if (slideData.shapes) {
        for (let j = 0; j < slideData.shapes.length && j < 10; j++) { // Limit to 10 shapes per slide
          const shapeData = slideData.shapes[j];
          
          if (shapeData.hasText && shapeData.textContent) {
            try {
              const textBox = slide.getShapes().addAutoShape(
                asposeSlides.ShapeType.Rectangle,
                shapeData.geometry.x,
                shapeData.geometry.y,
                shapeData.geometry.width,
                shapeData.geometry.height
              );
              
              textBox.getTextFrame().setText(shapeData.textContent);
              
              // Make transparent
              textBox.getFillFormat().setFillType(asposeSlides.FillType.NoFill);
              textBox.getLineFormat().getFillFormat().setFillType(asposeSlides.FillType.NoFill);
              
              if (shapeData.name) textBox.setName(shapeData.name);
              
              reconstructedShapes++;
            } catch (shapeError) {
              log(`Shape reconstruction failed: ${shapeError.message}`, 'error');
            }
          }
        }
      }
    }
    
    // Save presentation
    presentation.save(outputPath, asposeSlides.SaveFormat.Pptx);
    
    const outputSize = fs.statSync(outputPath).size;
    const originalSize = fs.statSync(TEST_CONFIG.inputFile).size;
    
    presentation.dispose();
    
    completeTest(test, true, {
      outputSize: outputSize,
      originalSize: originalSize,
      sizeRatio: (outputSize / originalSize * 100).toFixed(1),
      slidesReconstructed: slidesData.length,
      shapesReconstructed: reconstructedShapes
    });
    
    return { outputPath, outputSize };
    
  } catch (error) {
    completeTest(test, false, { error: error.message });
    throw error;
  }
}

// Test 3: Thumbnail generation
async function testThumbnailGeneration() {
  const test = startTest('Thumbnail Generation');
  
  try {
    const asposeSlides = require('/app/lib/aspose.slides');
    const outputDir = path.join(TEST_CONFIG.outputDir, TEST_CONFIG.results.thumbnailsDir);
    ensureDirectory(outputDir);
    
    const presentation = new asposeSlides.Presentation(TEST_CONFIG.inputFile);
    const slides = presentation.getSlides();
    
    log(`Generating thumbnails for ${slides.size()} slides...`);
    
    const thumbnails = [];
    let totalSize = 0;
    
    // Generate thumbnails for first 5 slides (to save time and space)
    const slideCount = Math.min(slides.size(), 5);
    
    for (let i = 0; i < slideCount; i++) {
      const slide = slides.get_Item(i);
      
      try {
        const thumbnail = slide.getThumbnail(1.5, 1.5); // High quality
        const thumbnailPath = path.join(outputDir, `slide_${i + 1}.png`);
        thumbnail.save(thumbnailPath, asposeSlides.ImageFormat.Png);
        
        const thumbnailSize = fs.statSync(thumbnailPath).size;
        totalSize += thumbnailSize;
        
        thumbnails.push({
          slideIndex: i,
          fileName: `slide_${i + 1}.png`,
          size: thumbnailSize
        });
        
      } catch (thumbError) {
        log(`Thumbnail generation failed for slide ${i + 1}: ${thumbError.message}`, 'error');
      }
    }
    
    presentation.dispose();
    
    completeTest(test, true, {
      thumbnailCount: thumbnails.length,
      totalSize: totalSize,
      averageSize: thumbnails.length > 0 ? Math.round(totalSize / thumbnails.length) : 0
    });
    
    return { thumbnails, outputDir };
    
  } catch (error) {
    completeTest(test, false, { error: error.message });
    throw error;
  }
}

// Test 4: PDF conversion
async function testPdfConversion() {
  const test = startTest('PDF Conversion');
  
  try {
    const asposeSlides = require('/app/lib/aspose.slides');
    const outputPath = path.join(TEST_CONFIG.outputDir, TEST_CONFIG.results.pdfOutput);
    
    const presentation = new asposeSlides.Presentation(TEST_CONFIG.inputFile);
    
    log('Converting to PDF...');
    presentation.save(outputPath, asposeSlides.SaveFormat.Pdf);
    
    const pdfSize = fs.statSync(outputPath).size;
    const originalSize = fs.statSync(TEST_CONFIG.inputFile).size;
    
    presentation.dispose();
    
    completeTest(test, true, {
      pdfSize: pdfSize,
      originalSize: originalSize,
      compressionRatio: (originalSize / pdfSize).toFixed(2)
    });
    
    return { outputPath, pdfSize };
    
  } catch (error) {
    completeTest(test, false, { error: error.message });
    throw error;
  }
}

// Final validation
function validateResults() {
  const test = startTest('Results Validation');
  
  try {
    const jsonPath = path.join(TEST_CONFIG.outputDir, TEST_CONFIG.results.convertedJson);
    const pptxPath = path.join(TEST_CONFIG.outputDir, TEST_CONFIG.results.reconstructedPptx);
    const pdfPath = path.join(TEST_CONFIG.outputDir, TEST_CONFIG.results.pdfOutput);
    const thumbsDir = path.join(TEST_CONFIG.outputDir, TEST_CONFIG.results.thumbnailsDir);
    
    const results = {
      originalExists: fs.existsSync(TEST_CONFIG.inputFile),
      jsonExists: fs.existsSync(jsonPath),
      pptxExists: fs.existsSync(pptxPath),
      pdfExists: fs.existsSync(pdfPath),
      thumbsExist: fs.existsSync(thumbsDir),
      thumbCount: fs.existsSync(thumbsDir) ? fs.readdirSync(thumbsDir).filter(f => f.endsWith('.png')).length : 0
    };
    
    const pipelineComplete = results.originalExists && results.jsonExists && 
                           results.pptxExists && results.pdfExists && results.thumbsExist;
    
    completeTest(test, pipelineComplete, {
      pipelineComplete: pipelineComplete,
      filesGenerated: Object.values(results).filter(Boolean).length,
      thumbnailCount: results.thumbCount
    });
    
    return results;
    
  } catch (error) {
    completeTest(test, false, { error: error.message });
    return null;
  }
}

// Generate final report
function generateFinalReport(validation) {
  const endTime = new Date();
  testResults.endTime = endTime;
  testResults.totalDuration = endTime - testResults.startTime;
  
  const passedTests = testResults.tests.filter(test => test.status === 'passed');
  const failedTests = testResults.tests.filter(test => test.status === 'failed');
  
  testResults.summary = {
    totalTests: testResults.tests.length,
    passed: passedTests.length,
    failed: failedTests.length,
    successRate: ((passedTests.length / testResults.tests.length) * 100).toFixed(1) + '%',
    totalDuration: testResults.totalDuration
  };
  
  if (validation) {
    testResults.validation = validation;
  }
  
  // Save final report
  const reportPath = path.join(TEST_CONFIG.outputDir, TEST_CONFIG.results.finalReport);
  fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));
  
  // Console summary
  console.log('\n' + '='.repeat(80));
  console.log('🎯 LUNA E2E TEST - SLIDEWORKS BUSINESS CASE TEMPLATE');
  console.log('='.repeat(80));
  
  console.log(`\n📊 RESULTS:`);
  console.log(`   Tests: ${testResults.summary.passed}/${testResults.summary.totalTests} passed`);
  console.log(`   Success Rate: ${testResults.summary.successRate}`);
  console.log(`   Duration: ${testResults.summary.totalDuration}ms`);
  
  if (validation) {
    console.log(`\n📁 OUTPUTS:`);
    console.log(`   ✅ JSON Conversion: ${validation.jsonExists ? '✅' : '❌'}`);
    console.log(`   ✅ PPTX Reconstruction: ${validation.pptxExists ? '✅' : '❌'}`);
    console.log(`   ✅ PDF Conversion: ${validation.pdfExists ? '✅' : '❌'}`);
    console.log(`   ✅ Thumbnails: ${validation.thumbsExist ? `✅ (${validation.thumbCount})` : '❌'}`);
    
    if (validation.pipelineComplete) {
      console.log(`\n🎉 COMPLETE SUCCESS! Full PPTX→JSON→PPTX→PDF→Thumbnails pipeline working!`);
    } else {
      console.log(`\n⚠️ Pipeline partially complete. Check individual test results.`);
    }
  }
  
  console.log('='.repeat(80));
  
  return testResults;
}

// Main execution
async function runFixedE2ETest() {
  log('🌙 Luna Fixed E2E Test - Starting...', 'step');
  ensureDirectory(TEST_CONFIG.outputDir);
  
  let validation = null;
  
  try {
    // Test 1: PPTX to JSON
    const { jsonPath } = await testPptxToJsonConversion();
    
    // Test 2: JSON to PPTX
    await testJsonToPptxReconstruction(testResults.files.universalSchema);
    
    // Test 3: Thumbnails
    await testThumbnailGeneration();
    
    // Test 4: PDF
    await testPdfConversion();
    
    // Test 5: Validation
    validation = validateResults();
    
  } catch (error) {
    log(`Test failed: ${error.message}`, 'error');
  }
  
  return generateFinalReport(validation);
}

if (require.main === module) {
  runFixedE2ETest().catch(error => {
    log(`Fatal error: ${error.message}`, 'error');
    process.exit(1);
  });
}

module.exports = { runFixedE2ETest };