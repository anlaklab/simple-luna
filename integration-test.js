#!/usr/bin/env node

/**
 * Luna PowerPoint Processing - Comprehensive Integration Test
 * 
 * This test validates the complete pipeline:
 * 1. PPTX to JSON conversion with full details
 * 2. JSON to PPTX reconstruction
 * 3. Thumbnail generation
 * 4. PDF conversion
 * 5. Comparison and validation
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Test configuration
const TEST_CONFIG = {
  inputFile: 'Slideworks_business_case_template.pptx',
  outputDir: './test-outputs',
  testFiles: {
    originalPptx: 'Slideworks_business_case_template.pptx',
    convertedJson: 'converted-presentation.json',
    reconstructedPptx: 'reconstructed-presentation.pptx',
    thumbnailsDir: 'thumbnails',
    pdfOutput: 'converted-presentation.pdf',
    comparisonReport: 'comparison-report.json'
  },
  serverUrl: 'http://localhost:3000/api/v1',
  timeout: 120000 // 2 minutes timeout
};

// Test results tracking
let testResults = {
  startTime: new Date(),
  tests: [],
  summary: {},
  errors: [],
  warnings: []
};

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

// Logging functions
function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, colors.green);
}

function logError(message) {
  log(`❌ ${message}`, colors.red);
}

function logWarning(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

function logInfo(message) {
  log(`ℹ️  ${message}`, colors.blue);
}

function logStep(message) {
  log(`🔄 ${message}`, colors.cyan);
}

// Test tracking
function startTest(testName) {
  const test = {
    name: testName,
    startTime: new Date(),
    status: 'running',
    duration: 0,
    details: {}
  };
  testResults.tests.push(test);
  logStep(`Starting: ${testName}`);
  return test;
}

function completeTest(test, success = true, details = {}) {
  test.endTime = new Date();
  test.duration = test.endTime - test.startTime;
  test.status = success ? 'passed' : 'failed';
  test.details = { ...test.details, ...details };
  
  if (success) {
    logSuccess(`Completed: ${test.name} (${test.duration}ms)`);
  } else {
    logError(`Failed: ${test.name} (${test.duration}ms)`);
  }
  
  return test;
}

// Utility functions
function ensureDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    logInfo(`Created directory: ${dirPath}`);
  }
}

function fileExists(filePath) {
  return fs.existsSync(filePath);
}

function getFileSize(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return stats.size;
  } catch (error) {
    return 0;
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Server health check
async function checkServerHealth() {
  const test = startTest('Server Health Check');
  
  try {
    const response = await fetch(`${TEST_CONFIG.serverUrl}/health`);
    const data = await response.json();
    
    if (response.ok && data.success) {
      completeTest(test, true, {
        serverStatus: data.data.status,
        services: data.data.services,
        uptime: data.data.uptime
      });
      return true;
    } else {
      completeTest(test, false, { error: 'Server health check failed', response: data });
      return false;
    }
  } catch (error) {
    completeTest(test, false, { error: error.message });
    return false;
  }
}

// Test 1: PPTX to JSON Conversion
async function testPptxToJson() {
  const test = startTest('PPTX to JSON Conversion');
  
  try {
    const inputPath = path.join(process.cwd(), TEST_CONFIG.testFiles.originalPptx);
    const outputPath = path.join(TEST_CONFIG.outputDir, TEST_CONFIG.testFiles.convertedJson);
    
    if (!fileExists(inputPath)) {
      throw new Error(`Input file not found: ${inputPath}`);
    }
    
    const inputSize = getFileSize(inputPath);
    logInfo(`Input file size: ${formatBytes(inputSize)}`);
    
    // Create form data
    const formData = new FormData();
    const fileBuffer = fs.readFileSync(inputPath);
    const blob = new Blob([fileBuffer], { 
      type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' 
    });
    
    formData.append('file', blob, TEST_CONFIG.testFiles.originalPptx);
    formData.append('options', JSON.stringify({
      includeAssets: true,
      includeMetadata: true,
      includeAnimations: true,
      includeMasterSlides: true,
      includeLayoutSlides: true,
      includeNotes: true,
      includeComments: true,
      extractImages: true,
      extractVideos: true,
      extractAudios: true,
      extractCharts: true,
      extractTables: true,
      extractSmartArt: true,
      includeHyperlinks: true,
      includeCustomProperties: true,
      includeDocumentProperties: true,
      includeSlideTransitions: true,
      includeSlideTimings: true,
      generateThumbnails: false // We'll do this separately
    }));
    
    const response = await fetch(`${TEST_CONFIG.serverUrl}/pptx2json`, {
      method: 'POST',
      body: formData
    });
    
    const result = await response.json();
    
    if (response.ok && result.success) {
      // Save the JSON result
      fs.writeFileSync(outputPath, JSON.stringify(result.data, null, 2));
      const outputSize = getFileSize(outputPath);
      
      completeTest(test, true, {
        inputSize: inputSize,
        outputSize: outputSize,
        compressionRatio: (inputSize / outputSize).toFixed(2),
        slideCount: result.data.slides ? result.data.slides.length : 0,
        processingTime: result.meta.processingTimeMs,
        features: {
          hasAnimations: result.data.slides && result.data.slides.some(slide => slide.animations && slide.animations.length > 0),
          hasImages: result.data.slides && result.data.slides.some(slide => slide.shapes && slide.shapes.some(shape => shape.type === 'Picture')),
          hasCharts: result.data.slides && result.data.slides.some(slide => slide.shapes && slide.shapes.some(shape => shape.type === 'Chart')),
          hasTables: result.data.slides && result.data.slides.some(slide => slide.shapes && slide.shapes.some(shape => shape.type === 'Table')),
          hasText: result.data.slides && result.data.slides.some(slide => slide.shapes && slide.shapes.some(shape => shape.textFrame))
        }
      });
      
      logInfo(`JSON output saved: ${outputPath}`);
      logInfo(`Output size: ${formatBytes(outputSize)}`);
      
      return result.data;
    } else {
      throw new Error(`Conversion failed: ${result.error ? result.error.message : 'Unknown error'}`);
    }
  } catch (error) {
    completeTest(test, false, { error: error.message });
    throw error;
  }
}

// Test 2: JSON to PPTX Reconstruction
async function testJsonToPptx(jsonData) {
  const test = startTest('JSON to PPTX Reconstruction');
  
  try {
    const outputPath = path.join(TEST_CONFIG.outputDir, TEST_CONFIG.testFiles.reconstructedPptx);
    
    const response = await fetch(`${TEST_CONFIG.serverUrl}/json2pptx`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        presentationData: jsonData,
        outputFormat: 'pptx',
        options: {
          preserveAnimations: true,
          preserveTransitions: true,
          preserveNotes: true,
          preserveComments: true,
          preserveHyperlinks: true,
          optimizeFileSize: false
        }
      })
    });
    
    if (response.ok) {
      const buffer = await response.arrayBuffer();
      fs.writeFileSync(outputPath, Buffer.from(buffer));
      
      const outputSize = getFileSize(outputPath);
      
      completeTest(test, true, {
        outputSize: outputSize,
        outputPath: outputPath
      });
      
      logInfo(`PPTX reconstruction saved: ${outputPath}`);
      logInfo(`Reconstructed file size: ${formatBytes(outputSize)}`);
      
      return outputPath;
    } else {
      const errorData = await response.json();
      throw new Error(`Reconstruction failed: ${errorData.error ? errorData.error.message : 'Unknown error'}`);
    }
  } catch (error) {
    completeTest(test, false, { error: error.message });
    throw error;
  }
}

// Test 3: Thumbnail Generation
async function testThumbnailGeneration() {
  const test = startTest('Thumbnail Generation');
  
  try {
    const inputPath = path.join(process.cwd(), TEST_CONFIG.testFiles.originalPptx);
    const outputDir = path.join(TEST_CONFIG.outputDir, TEST_CONFIG.testFiles.thumbnailsDir);
    ensureDirectory(outputDir);
    
    const formData = new FormData();
    const fileBuffer = fs.readFileSync(inputPath);
    const blob = new Blob([fileBuffer], { 
      type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' 
    });
    
    formData.append('file', blob, TEST_CONFIG.testFiles.originalPptx);
    formData.append('options', JSON.stringify({
      format: 'png',
      width: 1920,
      height: 1080,
      quality: 'high',
      allSlides: true,
      includeHidden: false
    }));
    
    const response = await fetch(`${TEST_CONFIG.serverUrl}/thumbnails`, {
      method: 'POST',
      body: formData
    });
    
    const result = await response.json();
    
    if (response.ok && result.success) {
      // Save thumbnail data if provided
      const thumbnailCount = result.data.thumbnails ? result.data.thumbnails.length : 0;
      
      completeTest(test, true, {
        thumbnailCount: thumbnailCount,
        outputDir: outputDir,
        format: 'png',
        resolution: '1920x1080'
      });
      
      logInfo(`Generated ${thumbnailCount} thumbnails`);
      
      return result.data;
    } else {
      throw new Error(`Thumbnail generation failed: ${result.error ? result.error.message : 'Unknown error'}`);
    }
  } catch (error) {
    completeTest(test, false, { error: error.message });
    throw error;
  }
}

// Test 4: PDF Conversion
async function testPdfConversion() {
  const test = startTest('PDF Conversion');
  
  try {
    const inputPath = path.join(process.cwd(), TEST_CONFIG.testFiles.originalPptx);
    const outputPath = path.join(TEST_CONFIG.outputDir, TEST_CONFIG.testFiles.pdfOutput);
    
    const formData = new FormData();
    const fileBuffer = fs.readFileSync(inputPath);
    const blob = new Blob([fileBuffer], { 
      type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' 
    });
    
    formData.append('file', blob, TEST_CONFIG.testFiles.originalPptx);
    formData.append('options', JSON.stringify({
      outputFormat: 'pdf',
      quality: 'high',
      includeNotes: true,
      includeHiddenSlides: false,
      jpegQuality: 95
    }));
    
    const response = await fetch(`${TEST_CONFIG.serverUrl}/convertformat`, {
      method: 'POST',
      body: formData
    });
    
    if (response.ok) {
      const buffer = await response.arrayBuffer();
      fs.writeFileSync(outputPath, Buffer.from(buffer));
      
      const outputSize = getFileSize(outputPath);
      
      completeTest(test, true, {
        outputSize: outputSize,
        outputPath: outputPath
      });
      
      logInfo(`PDF conversion saved: ${outputPath}`);
      logInfo(`PDF file size: ${formatBytes(outputSize)}`);
      
      return outputPath;
    } else {
      const errorData = await response.json();
      throw new Error(`PDF conversion failed: ${errorData.error ? errorData.error.message : 'Unknown error'}`);
    }
  } catch (error) {
    completeTest(test, false, { error: error.message });
    throw error;
  }
}

// Test 5: File Comparison and Validation
async function testFileComparison() {
  const test = startTest('File Comparison and Validation');
  
  try {
    const originalPath = path.join(process.cwd(), TEST_CONFIG.testFiles.originalPptx);
    const reconstructedPath = path.join(TEST_CONFIG.outputDir, TEST_CONFIG.testFiles.reconstructedPptx);
    const jsonPath = path.join(TEST_CONFIG.outputDir, TEST_CONFIG.testFiles.convertedJson);
    const pdfPath = path.join(TEST_CONFIG.outputDir, TEST_CONFIG.testFiles.pdfOutput);
    
    const comparison = {
      files: {
        original: {
          path: originalPath,
          size: getFileSize(originalPath),
          exists: fileExists(originalPath)
        },
        reconstructed: {
          path: reconstructedPath,
          size: getFileSize(reconstructedPath),
          exists: fileExists(reconstructedPath)
        },
        json: {
          path: jsonPath,
          size: getFileSize(jsonPath),
          exists: fileExists(jsonPath)
        },
        pdf: {
          path: pdfPath,
          size: getFileSize(pdfPath),
          exists: fileExists(pdfPath)
        }
      },
      analysis: {
        fidelityCheck: null,
        sizeComparison: null,
        structureValidation: null
      }
    };
    
    // Basic size comparison
    if (comparison.files.original.exists && comparison.files.reconstructed.exists) {
      const sizeDifference = Math.abs(comparison.files.original.size - comparison.files.reconstructed.size);
      const sizeDifferencePercent = (sizeDifference / comparison.files.original.size) * 100;
      
      comparison.analysis.sizeComparison = {
        originalSize: comparison.files.original.size,
        reconstructedSize: comparison.files.reconstructed.size,
        difference: sizeDifference,
        differencePercent: sizeDifferencePercent,
        acceptable: sizeDifferencePercent < 50 // Accept up to 50% difference
      };
    }
    
    // JSON structure validation
    if (comparison.files.json.exists) {
      try {
        const jsonContent = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        comparison.analysis.structureValidation = {
          hasSlides: !!(jsonContent.slides && jsonContent.slides.length > 0),
          slideCount: jsonContent.slides ? jsonContent.slides.length : 0,
          hasMetadata: !!(jsonContent.documentProperties || jsonContent.metadata),
          hasSlideSize: !!(jsonContent.slideSize),
          hasShapes: jsonContent.slides ? jsonContent.slides.some(slide => slide.shapes && slide.shapes.length > 0) : false,
          valid: true
        };
      } catch (error) {
        comparison.analysis.structureValidation = {
          valid: false,
          error: error.message
        };
      }
    }
    
    // Save comparison report
    const reportPath = path.join(TEST_CONFIG.outputDir, TEST_CONFIG.testFiles.comparisonReport);
    fs.writeFileSync(reportPath, JSON.stringify(comparison, null, 2));
    
    const allFilesExist = comparison.files.original.exists && 
                         comparison.files.reconstructed.exists && 
                         comparison.files.json.exists && 
                         comparison.files.pdf.exists;
    
    const structureValid = comparison.analysis.structureValidation && 
                          comparison.analysis.structureValidation.valid;
    
    const sizeAcceptable = comparison.analysis.sizeComparison && 
                          comparison.analysis.sizeComparison.acceptable;
    
    const overallSuccess = allFilesExist && structureValid && sizeAcceptable;
    
    completeTest(test, overallSuccess, comparison);
    
    logInfo(`Comparison report saved: ${reportPath}`);
    
    return comparison;
  } catch (error) {
    completeTest(test, false, { error: error.message });
    throw error;
  }
}

// Generate final report
function generateFinalReport() {
  testResults.endTime = new Date();
  testResults.totalDuration = testResults.endTime - testResults.startTime;
  
  const passedTests = testResults.tests.filter(test => test.status === 'passed');
  const failedTests = testResults.tests.filter(test => test.status === 'failed');
  
  testResults.summary = {
    totalTests: testResults.tests.length,
    passed: passedTests.length,
    failed: failedTests.length,
    successRate: ((passedTests.length / testResults.tests.length) * 100).toFixed(1) + '%',
    totalDuration: testResults.totalDuration
  };
  
  // Save detailed report
  const reportPath = path.join(TEST_CONFIG.outputDir, 'integration-test-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));
  
  // Console summary
  log('\\n' + '='.repeat(80), colors.bright);
  log(' LUNA POWERPOINT PROCESSING - INTEGRATION TEST RESULTS', colors.bright);
  log('='.repeat(80), colors.bright);
  
  log(`\\n📊 TEST SUMMARY:`, colors.bright);
  log(`   Total Tests: ${testResults.summary.totalTests}`);
  log(`   Passed: ${testResults.summary.passed}`, colors.green);
  log(`   Failed: ${testResults.summary.failed}`, failedTests.length > 0 ? colors.red : colors.green);
  log(`   Success Rate: ${testResults.summary.successRate}`, passedTests.length === testResults.tests.length ? colors.green : colors.yellow);
  log(`   Total Duration: ${testResults.summary.totalDuration}ms`);
  
  log(`\\n📋 INDIVIDUAL TEST RESULTS:`, colors.bright);
  testResults.tests.forEach(test => {
    const status = test.status === 'passed' ? '✅' : '❌';
    const color = test.status === 'passed' ? colors.green : colors.red;
    log(`   ${status} ${test.name} (${test.duration}ms)`, color);
  });
  
  if (failedTests.length > 0) {
    log(`\\n🔍 FAILED TEST DETAILS:`, colors.red);
    failedTests.forEach(test => {
      log(`   ❌ ${test.name}:`, colors.red);
      if (test.details.error) {
        log(`      Error: ${test.details.error}`, colors.red);
      }
    });
  }
  
  log(`\\n📁 OUTPUT FILES:`, colors.bright);
  log(`   Test Directory: ${TEST_CONFIG.outputDir}`);
  log(`   Detailed Report: ${reportPath}`);
  
  log(`\\n🎯 INTEGRATION TEST ${testResults.summary.passed === testResults.summary.totalTests ? 'COMPLETED SUCCESSFULLY' : 'COMPLETED WITH ISSUES'}!`, 
      testResults.summary.passed === testResults.summary.totalTests ? colors.green : colors.yellow);
  log('='.repeat(80), colors.bright);
  
  return testResults;
}

// Main test execution
async function runIntegrationTests() {
  log('🌙 Luna PowerPoint Processing - Integration Test Suite', colors.bright);
  log('='.repeat(60), colors.bright);
  
  try {
    // Setup
    ensureDirectory(TEST_CONFIG.outputDir);
    
    // Check input file
    const inputPath = path.join(process.cwd(), TEST_CONFIG.testFiles.originalPptx);
    if (!fileExists(inputPath)) {
      throw new Error(`Input test file not found: ${inputPath}`);
    }
    
    logInfo(`Input file: ${inputPath}`);
    logInfo(`Input size: ${formatBytes(getFileSize(inputPath))}`);
    
    // Step 1: Check server health
    const serverHealthy = await checkServerHealth();
    if (!serverHealthy) {
      logWarning('Server health check failed, but continuing with tests...');
    }
    
    // Step 2: PPTX to JSON conversion
    const jsonData = await testPptxToJson();
    
    // Step 3: JSON to PPTX reconstruction
    await testJsonToPptx(jsonData);
    
    // Step 4: Thumbnail generation
    await testThumbnailGeneration();
    
    // Step 5: PDF conversion
    await testPdfConversion();
    
    // Step 6: File comparison and validation
    await testFileComparison();
    
  } catch (error) {
    logError(`Integration test failed: ${error.message}`);
    testResults.errors.push(error.message);
  }
  
  // Generate final report
  const finalReport = generateFinalReport();
  
  // Exit with appropriate code
  process.exit(finalReport.summary.failed > 0 ? 1 : 0);
}

// Run the integration tests
if (require.main === module) {
  runIntegrationTests().catch(error => {
    logError(`Fatal error: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  runIntegrationTests,
  TEST_CONFIG,
  testResults
};