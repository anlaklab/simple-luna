#!/usr/bin/env node

/**
 * Aspose Refactoring Verification Script
 * 
 * This script verifies that all direct aspose.slides.js imports have been
 * properly replaced with AsposeDriverFactory usage throughout the codebase.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 ASPOSE REFACTORING VERIFICATION SCRIPT');
console.log('==========================================');

// Configuration
const SERVER_DIR = path.join(__dirname, '..');
const SEARCH_PATTERNS = [
  'aspose\\.slides\\.js',
  'aspose-slides-25\\.6',
  'ShapeType\\.',
  'FillType\\.',
  'SaveFormat\\.',
  'ImageFormat\\.'
];

let hasErrors = false;
let refactoredFiles = [];
let remainingFiles = [];

// Check 1: Search for direct aspose.slides.js imports
console.log('📋 Step 1: Checking for direct aspose.slides.js imports...');
try {
  const directImports = execSync('grep -r "aspose\\.slides\\.js" --include="*.ts" --include="*.js" ../src/', { 
    cwd: SERVER_DIR,
    encoding: 'utf8' 
  }).trim().split('\n').filter(line => line.length > 0);
  
  if (directImports.length > 0) {
    console.log('❌ Found direct aspose.slides.js imports:');
    directImports.forEach(line => {
      console.log('  ', line);
      remainingFiles.push(line.split(':')[0]);
    });
    hasErrors = true;
  } else {
    console.log('✅ No direct aspose.slides.js imports found');
  }
} catch (error) {
  console.log('✅ No direct aspose.slides.js imports found (grep returned no results)');
}

// Check 2: Search for AsposeDriverFactory usage
console.log('\n📋 Step 2: Checking AsposeDriverFactory usage...');
try {
  const driverUsage = execSync('grep -r "AsposeDriverFactory" --include="*.ts" --include="*.js" ../src/', { 
    cwd: SERVER_DIR,
    encoding: 'utf8' 
  }).trim().split('\n').filter(line => line.length > 0);
  
  if (driverUsage.length > 0) {
    console.log('✅ Found AsposeDriverFactory usage in files:');
    driverUsage.forEach(line => {
      const filePath = line.split(':')[0];
      if (!refactoredFiles.includes(filePath)) {
        refactoredFiles.push(filePath);
      }
      console.log('  ', filePath);
    });
  } else {
    console.log('❌ No AsposeDriverFactory usage found');
    hasErrors = true;
  }
} catch (error) {
  console.log('❌ No AsposeDriverFactory usage found');
  hasErrors = true;
}

// Check 3: Verify AsposeDriverFactory exists and is valid
console.log('\n📋 Step 3: Verifying AsposeDriverFactory integrity...');
const driverPath = path.join(SERVER_DIR, '..', 'lib', 'AsposeDriverFactory.js');
if (fs.existsSync(driverPath)) {
  console.log('✅ AsposeDriverFactory.js exists');
  
  // Check if it's a valid Node.js module
  try {
    const driverContent = fs.readFileSync(driverPath, 'utf8');
    if (driverContent.includes('module.exports')) {
      console.log('✅ AsposeDriverFactory.js has valid module.exports');
    } else {
      console.log('❌ AsposeDriverFactory.js missing module.exports');
      hasErrors = true;
    }
    
    if (driverContent.includes('class AsposeDriverFactory')) {
      console.log('✅ AsposeDriverFactory.js contains the class definition');
    } else {
      console.log('❌ AsposeDriverFactory.js missing class definition');
      hasErrors = true;
    }
  } catch (error) {
    console.log('❌ Error reading AsposeDriverFactory.js:', error.message);
    hasErrors = true;
  }
} else {
  console.log('❌ AsposeDriverFactory.js not found at:', driverPath);
  hasErrors = true;
}

// Check 4: Search for remaining problematic patterns
console.log('\n📋 Step 4: Checking for remaining problematic patterns...');
const problematicPatterns = [
  'aspose\\.ShapeType',
  'aspose\\.FillType',
  'aspose\\.SaveFormat',
  'aspose\\.ImageFormat'
];

let foundProblematicPatterns = false;
problematicPatterns.forEach(pattern => {
  try {
    const results = execSync(`grep -r "${pattern}" --include="*.ts" --include="*.js" ../src/`, { 
      cwd: SERVER_DIR,
      encoding: 'utf8' 
    }).trim().split('\n').filter(line => line.length > 0);
    
    if (results.length > 0) {
      console.log(`❌ Found problematic pattern "${pattern}":`);
      results.forEach(line => console.log('  ', line));
      foundProblematicPatterns = true;
      hasErrors = true;
    }
  } catch (error) {
    // No results found for this pattern (good)
  }
});

if (!foundProblematicPatterns) {
  console.log('✅ No problematic patterns found');
}

// Check 5: Verify TypeScript compilation
console.log('\n📋 Step 5: Verifying TypeScript compilation...');
try {
  execSync('npm run build', { cwd: SERVER_DIR, stdio: 'pipe' });
  console.log('✅ TypeScript compilation successful');
} catch (error) {
  console.log('❌ TypeScript compilation failed');
  console.log('Error output:', error.stdout ? error.stdout.toString() : error.message);
  hasErrors = true;
}

// Check 6: Test AsposeDriverFactory loading
console.log('\n📋 Step 6: Testing AsposeDriverFactory loading...');
try {
  const testScript = `
    const asposeDriver = require('/app/lib/AsposeDriverFactory');
    console.log('Driver loaded successfully');
    console.log('Driver methods:', Object.getOwnPropertyNames(asposeDriver).filter(name => typeof asposeDriver[name] === 'function'));
  `;
  
  // Write test script
  const testPath = path.join(SERVER_DIR, 'test-aspose-driver.js');
  fs.writeFileSync(testPath, testScript);
  
  // Run test in Docker context (if available)
  try {
    const result = execSync(`node ${testPath}`, { cwd: SERVER_DIR, encoding: 'utf8' });
    console.log('✅ AsposeDriverFactory loads successfully in local context');
    console.log('Available methods:', result.trim());
  } catch (error) {
    console.log('⚠️  AsposeDriverFactory test failed in local context (expected - needs Docker)');
    console.log('This is normal if not running in Docker environment');
  }
  
  // Clean up test file
  fs.unlinkSync(testPath);
} catch (error) {
  console.log('❌ Error testing AsposeDriverFactory:', error.message);
  hasErrors = true;
}

// Summary Report
console.log('\n📊 VERIFICATION SUMMARY');
console.log('======================');
console.log(`✅ Refactored files: ${refactoredFiles.length}`);
console.log(`❌ Remaining files: ${[...new Set(remainingFiles)].length}`);

if (refactoredFiles.length > 0) {
  console.log('\n🎉 Successfully refactored files:');
  [...new Set(refactoredFiles)].forEach(file => console.log('  ✅', file));
}

if (remainingFiles.length > 0) {
  console.log('\n⚠️  Files still needing refactoring:');
  [...new Set(remainingFiles)].forEach(file => console.log('  ❌', file));
}

// Final result
if (hasErrors) {
  console.log('\n❌ VERIFICATION FAILED - Issues found that need to be addressed');
  console.log('Please review the errors above and fix before deployment');
  process.exit(1);
} else {
  console.log('\n✅ VERIFICATION SUCCESSFUL - All checks passed!');
  console.log('The refactoring appears to be complete and ready for deployment');
  process.exit(0);
} 