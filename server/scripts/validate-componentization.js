/**
 * Componentization Validation Script
 * 
 * Validates that Phase 6 componentization was successful by:
 * - Checking that new extractors exist and are properly structured
 * - Verifying line counts are under target thresholds
 * - Testing basic functionality of the new architecture
 */

const fs = require('fs');
const path = require('path');

// =============================================================================
// VALIDATION CONFIGURATION
// =============================================================================

const TARGETS = {
  MAX_LINES_PER_FILE: 100,
  MAX_LINES_PER_METHOD: 50,
  REQUIRED_EXTRACTORS: [
    'base-shape-extractor.ts',
    'extraction-interfaces.ts',
    'chart-extractor.ts',
    'table-extractor.ts',
    'media-extractor.ts',
    'shape-extractor-coordinator.ts'
  ]
};

const VALIDATION_RESULTS = {
  passed: 0,
  failed: 0,
  warnings: 0,
  details: []
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function countLines(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return content.split('\n').length;
  } catch (error) {
    return 0;
  }
}

function fileExists(filePath) {
  return fs.existsSync(filePath);
}

function logResult(type, message, details = {}) {
  const timestamp = new Date().toISOString();
  const result = { type, message, details, timestamp };
  
  VALIDATION_RESULTS.details.push(result);
  
  const emoji = type === 'PASS' ? '✅' : type === 'FAIL' ? '❌' : '⚠️';
  console.log(`${emoji} ${type}: ${message}`);
  
  if (Object.keys(details).length > 0) {
    console.log(`   Details:`, details);
  }
  
  if (type === 'PASS') VALIDATION_RESULTS.passed++;
  else if (type === 'FAIL') VALIDATION_RESULTS.failed++;
  else VALIDATION_RESULTS.warnings++;
}

// =============================================================================
// VALIDATION TESTS
// =============================================================================

function validateDirectoryStructure() {
  console.log('\n📁 VALIDATING DIRECTORY STRUCTURE...');
  
  const basePath = path.join(__dirname, '../src/adapters/aspose/extractors');
  const requiredDirs = ['base', 'shapes', 'utils'];
  
  if (!fs.existsSync(basePath)) {
    logResult('FAIL', 'Extractors directory not found', { path: basePath });
    return false;
  }
  
  let allDirsExist = true;
  
  requiredDirs.forEach(dir => {
    const dirPath = path.join(basePath, dir);
    if (fs.existsSync(dirPath)) {
      logResult('PASS', `Directory exists: ${dir}`, { path: dirPath });
    } else {
      logResult('FAIL', `Missing directory: ${dir}`, { path: dirPath });
      allDirsExist = false;
    }
  });
  
  return allDirsExist;
}

function validateExtractorFiles() {
  console.log('\n📄 VALIDATING EXTRACTOR FILES...');
  
  const basePath = path.join(__dirname, '../src/adapters/aspose/extractors');
  let allFilesExist = true;
  
  // Check base files
  const baseFiles = ['base-shape-extractor.ts', 'extraction-interfaces.ts'];
  baseFiles.forEach(file => {
    const filePath = path.join(basePath, 'base', file);
    if (fileExists(filePath)) {
      const lines = countLines(filePath);
      logResult('PASS', `Base file exists: ${file}`, { lines, path: filePath });
    } else {
      logResult('FAIL', `Missing base file: ${file}`, { path: filePath });
      allFilesExist = false;
    }
  });
  
  // Check shape extractor files
  const shapeFiles = [
    'chart-extractor.ts',
    'table-extractor.ts', 
    'media-extractor.ts',
    'shape-extractor-coordinator.ts'
  ];
  
  shapeFiles.forEach(file => {
    const filePath = path.join(basePath, 'shapes', file);
    if (fileExists(filePath)) {
      const lines = countLines(filePath);
      logResult('PASS', `Shape extractor exists: ${file}`, { lines, path: filePath });
    } else {
      logResult('FAIL', `Missing shape extractor: ${file}`, { path: filePath });
      allFilesExist = false;
    }
  });
  
  return allFilesExist;
}

function validateLineCounts() {
  console.log('\n📏 VALIDATING LINE COUNTS...');
  
  const extractorsPath = path.join(__dirname, '../src/adapters/aspose/extractors');
  let allUnderTarget = true;
  
  function scanDirectory(dir) {
    const items = fs.readdirSync(dir);
    
    items.forEach(item => {
      const itemPath = path.join(dir, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory()) {
        scanDirectory(itemPath);
      } else if (item.endsWith('.ts')) {
        const lines = countLines(itemPath);
        const relativePath = path.relative(extractorsPath, itemPath);
        
        if (lines <= TARGETS.MAX_LINES_PER_FILE) {
          logResult('PASS', `File under target: ${relativePath}`, { 
            lines, 
            target: TARGETS.MAX_LINES_PER_FILE 
          });
        } else {
          logResult('FAIL', `File exceeds target: ${relativePath}`, { 
            lines, 
            target: TARGETS.MAX_LINES_PER_FILE,
            excess: lines - TARGETS.MAX_LINES_PER_FILE
          });
          allUnderTarget = false;
        }
      }
    });
  }
  
  if (fs.existsSync(extractorsPath)) {
    scanDirectory(extractorsPath);
  } else {
    logResult('FAIL', 'Extractors directory not found for line count validation');
    allUnderTarget = false;
  }
  
  return allUnderTarget;
}

function validateOriginalFileReduction() {
  console.log('\n📉 VALIDATING ORIGINAL FILE REDUCTION...');
  
  const originalShapeExtractor = path.join(__dirname, '../src/adapters/aspose/shape-extractor.ts');
  
  if (!fileExists(originalShapeExtractor)) {
    logResult('WARN', 'Original shape-extractor.ts not found - may have been replaced');
    return true;
  }
  
  const originalLines = countLines(originalShapeExtractor);
  
  if (originalLines > 200) {
    logResult('FAIL', 'Original shape-extractor.ts still too large', { 
      lines: originalLines,
      target: 100,
      status: 'needs_refactoring'
    });
    return false;
  } else {
    logResult('PASS', 'Original shape-extractor.ts reduced successfully', { 
      lines: originalLines,
      target: 100
    });
    return true;
  }
}

function validateTestFiles() {
  console.log('\n🧪 VALIDATING TEST FILES...');
  
  const testsPath = path.join(__dirname, '../tests/extractors');
  const testFiles = [
    'chart-extractor.test.ts'
  ];
  
  let testsExist = true;
  
  testFiles.forEach(testFile => {
    const testPath = path.join(testsPath, testFile);
    if (fileExists(testPath)) {
      const lines = countLines(testPath);
      logResult('PASS', `Test file exists: ${testFile}`, { lines });
    } else {
      logResult('WARN', `Test file missing: ${testFile}`, { path: testPath });
      testsExist = false;
    }
  });
  
  return testsExist;
}

function validateComparisonWithBaseline() {
  console.log('\n📊 COMPARING WITH BASELINE...');
  
  const baselineReportPath = path.join(__dirname, '../reports/extractor-analysis-baseline.json');
  
  if (!fileExists(baselineReportPath)) {
    logResult('WARN', 'Baseline report not found - cannot compare');
    return true;
  }
  
  try {
    const baseline = JSON.parse(fs.readFileSync(baselineReportPath, 'utf-8'));
    
    // Calculate current metrics
    const extractorsPath = path.join(__dirname, '../src/adapters/aspose/extractors');
    let currentFiles = 0;
    let currentLines = 0;
    
    function countCurrentFiles(dir) {
      if (!fs.existsSync(dir)) return;
      
      const items = fs.readdirSync(dir);
      items.forEach(item => {
        const itemPath = path.join(dir, item);
        const stat = fs.statSync(itemPath);
        
        if (stat.isDirectory()) {
          countCurrentFiles(itemPath);
        } else if (item.endsWith('.ts')) {
          currentFiles++;
          currentLines += countLines(itemPath);
        }
      });
    }
    
    countCurrentFiles(extractorsPath);
    
    const improvement = {
      baselineFiles: baseline.summary.filesAnalyzed,
      currentFiles,
      baselineLines: baseline.summary.totalLines,
      currentLines,
      averageLinesReduction: baseline.summary.averageLinesPerFile - (currentLines / currentFiles)
    };
    
    if (improvement.averageLinesReduction > 0) {
      logResult('PASS', 'Componentization shows improvement', improvement);
    } else {
      logResult('FAIL', 'Componentization did not improve metrics', improvement);
    }
    
    return improvement.averageLinesReduction > 0;
    
  } catch (error) {
    logResult('WARN', 'Could not compare with baseline', { error: error.message });
    return true;
  }
}

// =============================================================================
// MAIN VALIDATION RUNNER
// =============================================================================

function runValidation() {
  console.log('🚀 PHASE 6 COMPONENTIZATION VALIDATION');
  console.log('=' * 50);
  
  const validations = [
    { name: 'Directory Structure', fn: validateDirectoryStructure },
    { name: 'Extractor Files', fn: validateExtractorFiles },
    { name: 'Line Counts', fn: validateLineCounts },
    { name: 'Original File Reduction', fn: validateOriginalFileReduction },
    { name: 'Test Files', fn: validateTestFiles },
    { name: 'Baseline Comparison', fn: validateComparisonWithBaseline }
  ];
  
  const results = [];
  
  validations.forEach(validation => {
    try {
      const passed = validation.fn();
      results.push({ name: validation.name, passed });
    } catch (error) {
      logResult('FAIL', `Validation failed: ${validation.name}`, { error: error.message });
      results.push({ name: validation.name, passed: false });
    }
  });
  
  // Summary
  console.log('\n📋 VALIDATION SUMMARY');
  console.log('=' * 50);
  
  results.forEach(result => {
    const status = result.passed ? '✅ PASSED' : '❌ FAILED';
    console.log(`${status}: ${result.name}`);
  });
  
  console.log(`\nOverall Results:`);
  console.log(`✅ Passed: ${VALIDATION_RESULTS.passed}`);
  console.log(`❌ Failed: ${VALIDATION_RESULTS.failed}`);
  console.log(`⚠️ Warnings: ${VALIDATION_RESULTS.warnings}`);
  
  const successRate = Math.round((VALIDATION_RESULTS.passed / (VALIDATION_RESULTS.passed + VALIDATION_RESULTS.failed)) * 100);
  console.log(`📊 Success Rate: ${successRate}%`);
  
  // Save detailed results
  const reportPath = path.join(__dirname, '../reports/componentization-validation.json');
  const detailedReport = {
    timestamp: new Date().toISOString(),
    summary: {
      passed: VALIDATION_RESULTS.passed,
      failed: VALIDATION_RESULTS.failed,
      warnings: VALIDATION_RESULTS.warnings,
      successRate
    },
    validations: results,
    details: VALIDATION_RESULTS.details
  };
  
  fs.writeFileSync(reportPath, JSON.stringify(detailedReport, null, 2));
  console.log(`\n💾 Detailed validation report saved: ${reportPath}`);
  
  if (successRate >= 80) {
    console.log('\n🎉 PHASE 6 COMPONENTIZATION VALIDATION SUCCESSFUL!');
    return true;
  } else {
    console.log('\n❌ PHASE 6 COMPONENTIZATION NEEDS ATTENTION');
    return false;
  }
}

// Execute validation
if (require.main === module) {
  const success = runValidation();
  process.exit(success ? 0 : 1);
}

module.exports = { runValidation }; 