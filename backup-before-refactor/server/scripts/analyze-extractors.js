/**
 * Extractor Analysis Tool - Phase 6 Componentization (JavaScript Version)
 * Quick analysis script to measure lines and detect code smells
 */

const fs = require('fs');
const path = require('path');

// Analysis thresholds
const THRESHOLDS = {
  FILE_LINES_WARNING: 200,
  FILE_LINES_CRITICAL: 300,
  METHOD_LINES_WARNING: 50,
  METHOD_LINES_CRITICAL: 100
};

/**
 * Count lines in a file
 */
function countLines(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    
    let codeLines = 0;
    let commentLines = 0;
    let emptyLines = 0;
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed === '') {
        emptyLines++;
      } else if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.includes('/**') || trimmed.includes('*/')) {
        commentLines++;
      } else {
        codeLines++;
      }
    }
    
    return {
      total: lines.length,
      code: codeLines,
      comments: commentLines,
      empty: emptyLines
    };
    
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error.message);
    return { total: 0, code: 0, comments: 0, empty: 0 };
  }
}

/**
 * Detect long methods in a file
 */
function detectLongMethods(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const methods = [];
    
    let inMethod = false;
    let methodStart = 0;
    let methodName = '';
    let braceCount = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      
      // Detect method start (simplified)
      const methodMatch = trimmed.match(/^\s*(private\s+|public\s+|protected\s+)?(async\s+)?(\w+)\s*\(/);
      if (methodMatch && !inMethod) {
        methodName = methodMatch[3];
        methodStart = i + 1;
        inMethod = true;
        braceCount = 0;
      }
      
      if (inMethod) {
        // Count braces
        braceCount += (line.match(/{/g) || []).length;
        braceCount -= (line.match(/}/g) || []).length;
        
        // Method end
        if (braceCount === 0 && line.includes('}')) {
          const lineCount = i + 1 - methodStart + 1;
          
          if (lineCount >= THRESHOLDS.METHOD_LINES_WARNING) {
            methods.push({
              name: methodName,
              startLine: methodStart,
              endLine: i + 1,
              lineCount: lineCount,
              severity: lineCount > THRESHOLDS.METHOD_LINES_CRITICAL ? 'CRITICAL' : 'WARNING'
            });
          }
          
          inMethod = false;
        }
      }
    }
    
    return methods;
    
  } catch (error) {
    console.error(`Error analyzing methods in ${filePath}:`, error.message);
    return [];
  }
}

/**
 * Analyze a single file
 */
function analyzeFile(filePath) {
  const fileName = path.basename(filePath);
  const lineCount = countLines(filePath);
  const methods = detectLongMethods(filePath);
  
  const severity = lineCount.total > THRESHOLDS.FILE_LINES_CRITICAL ? 'CRITICAL' :
                   lineCount.total > THRESHOLDS.FILE_LINES_WARNING ? 'WARNING' : 'OK';
  
  return {
    fileName,
    filePath,
    totalLines: lineCount.total,
    codeLines: lineCount.code,
    severity,
    longMethods: methods,
    suggestions: generateSuggestions(fileName, lineCount.total, methods)
  };
}

/**
 * Generate suggestions for improvement
 */
function generateSuggestions(fileName, totalLines, methods) {
  const suggestions = [];
  
  if (totalLines > THRESHOLDS.FILE_LINES_CRITICAL) {
    suggestions.push(`🚨 CRITICAL: Split ${fileName} into multiple files (${totalLines} lines)`);
  } else if (totalLines > THRESHOLDS.FILE_LINES_WARNING) {
    suggestions.push(`⚠️ WARNING: Consider refactoring ${fileName} (${totalLines} lines)`);
  }
  
  methods.forEach(method => {
    if (method.severity === 'CRITICAL') {
      suggestions.push(`🚨 METHOD: ${method.name}() is too long (${method.lineCount} lines) - break into smaller methods`);
    } else {
      suggestions.push(`⚠️ METHOD: ${method.name}() should be refactored (${method.lineCount} lines)`);
    }
  });
  
  // Shape-specific suggestions
  if (fileName.includes('shape-extractor')) {
    suggestions.push(`🎯 SHAPE EXTRACTOR: Break into separate extractors by shape type (Chart, Table, Media, etc.)`);
  }
  
  return suggestions;
}

/**
 * Analyze all extractors in directory
 */
function analyzeExtractorsDirectory(directoryPath) {
  console.log(`🔍 Analyzing extractors in: ${directoryPath}`);
  console.log('='.repeat(60));
  
  const results = [];
  let totalLines = 0;
  let filesAnalyzed = 0;
  
  try {
    function scanDirectory(dir) {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const itemPath = path.join(dir, item);
        const stat = fs.statSync(itemPath);
        
        if (stat.isDirectory()) {
          scanDirectory(itemPath);
        } else if (item.endsWith('.ts') && !item.endsWith('.d.ts')) {
          const analysis = analyzeFile(itemPath);
          results.push(analysis);
          totalLines += analysis.totalLines;
          filesAnalyzed++;
        }
      }
    }
    
    scanDirectory(directoryPath);
    
    // Sort by severity and lines
    results.sort((a, b) => {
      const severityOrder = { CRITICAL: 3, WARNING: 2, OK: 1 };
      return (severityOrder[b.severity] - severityOrder[a.severity]) || (b.totalLines - a.totalLines);
    });
    
    // Display results
    console.log(`\n📊 ANALYSIS SUMMARY:`);
    console.log(`Files analyzed: ${filesAnalyzed}`);
    console.log(`Total lines: ${totalLines}`);
    console.log(`Average lines per file: ${Math.round(totalLines / filesAnalyzed)}`);
    
    const criticalFiles = results.filter(r => r.severity === 'CRITICAL');
    const warningFiles = results.filter(r => r.severity === 'WARNING');
    
    console.log(`Critical files (>300 lines): ${criticalFiles.length}`);
    console.log(`Warning files (>200 lines): ${warningFiles.length}`);
    
    console.log(`\n🚨 FLAGGED FILES:`);
    results.filter(r => r.severity !== 'OK').forEach(file => {
      console.log(`\n📁 ${file.fileName} (${file.totalLines} lines) - ${file.severity}`);
      console.log(`   Code: ${file.codeLines} lines`);
      console.log(`   Long methods: ${file.longMethods.length}`);
      
      if (file.longMethods.length > 0) {
        file.longMethods.forEach(method => {
          console.log(`   • ${method.name}(): ${method.lineCount} lines (${method.severity})`);
        });
      }
      
      if (file.suggestions.length > 0) {
        console.log(`   Suggestions:`);
        file.suggestions.forEach(suggestion => {
          console.log(`   • ${suggestion}`);
        });
      }
    });
    
    console.log(`\n💡 TOP RECOMMENDATIONS:`);
    
    if (criticalFiles.length > 0) {
      console.log(`1. 🚨 IMMEDIATE: Refactor ${criticalFiles.length} critical files (>300 lines)`);
      criticalFiles.slice(0, 3).forEach(file => {
        console.log(`   • ${file.fileName}: ${file.totalLines} lines`);
      });
    }
    
    if (warningFiles.length > 0) {
      console.log(`2. ⚠️ SCHEDULE: Plan refactoring for ${warningFiles.length} warning files (>200 lines)`);
    }
    
    const longMethodsTotal = results.reduce((sum, file) => sum + file.longMethods.length, 0);
    if (longMethodsTotal > 0) {
      console.log(`3. 📏 METHODS: Break down ${longMethodsTotal} long methods (>50 lines)`);
    }
    
    console.log(`4. 🎯 PHASE 6: Execute systematic componentization plan`);
    
    // Save report
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        filesAnalyzed,
        totalLines,
        averageLinesPerFile: Math.round(totalLines / filesAnalyzed),
        criticalFiles: criticalFiles.length,
        warningFiles: warningFiles.length,
        longMethods: longMethodsTotal
      },
      files: results
    };
    
    const reportPath = path.join(__dirname, '../reports/extractor-analysis-baseline.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n💾 Detailed report saved: ${reportPath}`);
    
    return report;
    
  } catch (error) {
    console.error('Analysis failed:', error.message);
    return null;
  }
}

// Main execution
function main() {
  const extractorsPath = path.join(__dirname, '../src/adapters/aspose');
  
  if (!fs.existsSync(extractorsPath)) {
    console.error(`❌ Directory not found: ${extractorsPath}`);
    process.exit(1);
  }
  
  console.log('🚀 Phase 6: Extractor Analysis Tool');
  console.log('Goal: Identify files >200 lines and methods >50 lines for componentization\n');
  
  const report = analyzeExtractorsDirectory(extractorsPath);
  
  if (report) {
    console.log('\n✅ Analysis completed successfully!');
    console.log('Next step: Execute componentization based on findings');
  } else {
    console.log('\n❌ Analysis failed');
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  main();
}

module.exports = {
  countLines,
  detectLongMethods,
  analyzeFile,
  analyzeExtractorsDirectory
}; 