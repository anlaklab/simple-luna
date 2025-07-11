/**
 * Extractor Analysis Tool - Phase 6 Componentization
 * 
 * Analyzes TypeScript extractors to identify code smells and suggest componentization.
 * Measures: lines of code, long methods, complexity, and suggests modular splits.
 */

import fs from 'fs';
import path from 'path';

// =============================================================================
// ANALYSIS INTERFACES
// =============================================================================

export interface FileAnalysis {
  filePath: string;
  fileName: string;
  totalLines: number;
  codeLines: number;
  commentLines: number;
  emptyLines: number;
  methods: MethodAnalysis[];
  classes: ClassAnalysis[];
  functions: FunctionAnalysis[];
  imports: string[];
  exports: string[];
  complexity: ComplexityMetrics;
  suggestions: ComponentizationSuggestion[];
}

export interface MethodAnalysis {
  name: string;
  startLine: number;
  endLine: number;
  lineCount: number;
  parameters: number;
  returnType: string;
  isAsync: boolean;
  isPrivate: boolean;
  cyclomaticComplexity: number;
  hasErrorHandling: boolean;
  callsOtherMethods: string[];
}

export interface ClassAnalysis {
  name: string;
  startLine: number;
  endLine: number;
  lineCount: number;
  methods: MethodAnalysis[];
  properties: PropertyAnalysis[];
  dependencies: string[];
}

export interface FunctionAnalysis {
  name: string;
  startLine: number;
  endLine: number;
  lineCount: number;
  isExported: boolean;
  parameters: number;
  returnType: string;
}

export interface PropertyAnalysis {
  name: string;
  type: string;
  isPrivate: boolean;
  isReadonly: boolean;
}

export interface ComplexityMetrics {
  cyclomaticComplexity: number;
  cognitiveComplexity: number;
  maintainabilityIndex: number;
  technicalDebt: 'low' | 'medium' | 'high' | 'critical';
}

export interface ComponentizationSuggestion {
  type: 'split_method' | 'extract_class' | 'create_utility' | 'split_file';
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  targetLines: { start: number; end: number };
  suggestedFileName: string;
  suggestedMethodName?: string;
  reason: string;
  estimatedEffort: 'small' | 'medium' | 'large';
}

export interface ExtractorReport {
  timestamp: string;
  totalFilesAnalyzed: number;
  flaggedFiles: FileAnalysis[];
  summary: {
    totalLines: number;
    averageLinesPerFile: number;
    filesOver200Lines: number;
    methodsOver50Lines: number;
    highComplexityFiles: number;
    totalSuggestions: number;
  };
  recommendations: string[];
}

// =============================================================================
// ANALYSIS THRESHOLDS
// =============================================================================

const THRESHOLDS = {
  FILE_LINES_WARNING: 200,
  FILE_LINES_CRITICAL: 300,
  METHOD_LINES_WARNING: 50,
  METHOD_LINES_CRITICAL: 100,
  CYCLOMATIC_COMPLEXITY_WARNING: 10,
  CYCLOMATIC_COMPLEXITY_CRITICAL: 15,
  PARAMETERS_WARNING: 5,
  PARAMETERS_CRITICAL: 8
};

// =============================================================================
// CORE ANALYSIS FUNCTIONS
// =============================================================================

/**
 * Count lines in a TypeScript file with detailed breakdown
 */
export function countLines(filePath: string): { total: number; code: number; comments: number; empty: number } {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    
    let codeLines = 0;
    let commentLines = 0;
    let emptyLines = 0;
    
    let inMultiLineComment = false;
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed === '') {
        emptyLines++;
      } else if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed === '/**' || trimmed === '*/') {
        commentLines++;
      } else if (trimmed.startsWith('/*')) {
        inMultiLineComment = true;
        commentLines++;
      } else if (trimmed.endsWith('*/')) {
        inMultiLineComment = false;
        commentLines++;
      } else if (inMultiLineComment) {
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
    console.error(`Error counting lines in ${filePath}:`, error);
    return { total: 0, code: 0, comments: 0, empty: 0 };
  }
}

/**
 * Detect long methods in TypeScript files
 */
export function detectLongMethods(filePath: string): MethodAnalysis[] {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const methods: MethodAnalysis[] = [];
    
    let currentMethod: Partial<MethodAnalysis> | null = null;
    let braceLevel = 0;
    let inClass = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      
      // Detect class start
      if (trimmed.match(/^(export\s+)?class\s+\w+/)) {
        inClass = true;
        continue;
      }
      
      // Detect method start
      const methodMatch = trimmed.match(/^(private\s+|public\s+|protected\s+)?(async\s+)?(\w+)\s*\(/);
      if (methodMatch && inClass) {
        const [, visibility, asyncKeyword, methodName] = methodMatch;
        
        currentMethod = {
          name: methodName,
          startLine: i + 1,
          isAsync: !!asyncKeyword,
          isPrivate: visibility?.includes('private') || false,
          parameters: (line.match(/,/g) || []).length + (line.includes('(') && !line.includes('()') ? 1 : 0),
          cyclomaticComplexity: 1, // Base complexity
          hasErrorHandling: false,
          callsOtherMethods: []
        };
        
        braceLevel = 0;
      }
      
      // Track braces
      if (currentMethod) {
        braceLevel += (line.match(/{/g) || []).length;
        braceLevel -= (line.match(/}/g) || []).length;
        
        // Detect complexity indicators
        if (trimmed.match(/\b(if|else|while|for|switch|case|catch|&&|\|\|)\b/)) {
          currentMethod.cyclomaticComplexity = (currentMethod.cyclomaticComplexity || 1) + 1;
        }
        
        // Detect error handling
        if (trimmed.includes('try') || trimmed.includes('catch') || trimmed.includes('throw')) {
          currentMethod.hasErrorHandling = true;
        }
        
        // Detect method calls
        const methodCalls = trimmed.match(/this\.(\w+)\(/g);
        if (methodCalls) {
          methodCalls.forEach(call => {
            const methodName = call.replace('this.', '').replace('(', '');
            if (!currentMethod!.callsOtherMethods!.includes(methodName)) {
              currentMethod!.callsOtherMethods!.push(methodName);
            }
          });
        }
        
        // Method end
        if (braceLevel === 0 && trimmed.includes('}')) {
          currentMethod.endLine = i + 1;
          currentMethod.lineCount = currentMethod.endLine - currentMethod.startLine! + 1;
          
          methods.push(currentMethod as MethodAnalysis);
          currentMethod = null;
        }
      }
    }
    
    return methods.filter(method => method.lineCount >= THRESHOLDS.METHOD_LINES_WARNING);
    
  } catch (error) {
    console.error(`Error detecting methods in ${filePath}:`, error);
    return [];
  }
}

/**
 * Generate componentization suggestions based on analysis
 */
export function suggestSplits(analysis: FileAnalysis): ComponentizationSuggestion[] {
  const suggestions: ComponentizationSuggestion[] = [];
  
  // File too large
  if (analysis.totalLines > THRESHOLDS.FILE_LINES_CRITICAL) {
    suggestions.push({
      type: 'split_file',
      priority: 'critical',
      description: `File has ${analysis.totalLines} lines - split into multiple files`,
      targetLines: { start: 1, end: analysis.totalLines },
      suggestedFileName: `${analysis.fileName.replace('.ts', '')}-split.ts`,
      reason: 'File exceeds critical size threshold (300 lines)',
      estimatedEffort: 'large'
    });
  } else if (analysis.totalLines > THRESHOLDS.FILE_LINES_WARNING) {
    suggestions.push({
      type: 'split_file',
      priority: 'high',
      description: `File has ${analysis.totalLines} lines - consider splitting`,
      targetLines: { start: 1, end: analysis.totalLines },
      suggestedFileName: `${analysis.fileName.replace('.ts', '')}-refactor.ts`,
      reason: 'File exceeds warning size threshold (200 lines)',
      estimatedEffort: 'medium'
    });
  }
  
  // Long methods
  analysis.methods.forEach(method => {
    if (method.lineCount > THRESHOLDS.METHOD_LINES_CRITICAL) {
      suggestions.push({
        type: 'split_method',
        priority: 'critical',
        description: `Method ${method.name} has ${method.lineCount} lines - split into smaller methods`,
        targetLines: { start: method.startLine, end: method.endLine },
        suggestedFileName: `${analysis.fileName.replace('.ts', '')}-${method.name.toLowerCase()}.ts`,
        suggestedMethodName: `${method.name}Helper`,
        reason: 'Method exceeds critical size threshold (100 lines)',
        estimatedEffort: 'medium'
      });
    } else if (method.lineCount > THRESHOLDS.METHOD_LINES_WARNING) {
      suggestions.push({
        type: 'split_method',
        priority: 'high',
        description: `Method ${method.name} has ${method.lineCount} lines - consider refactoring`,
        targetLines: { start: method.startLine, end: method.endLine },
        suggestedFileName: `${analysis.fileName.replace('.ts', '')}-helpers.ts`,
        suggestedMethodName: `extract${method.name.charAt(0).toUpperCase() + method.name.slice(1)}`,
        reason: 'Method exceeds warning size threshold (50 lines)',
        estimatedEffort: 'small'
      });
    }
  });
  
  // High complexity methods
  analysis.methods.forEach(method => {
    if (method.cyclomaticComplexity > THRESHOLDS.CYCLOMATIC_COMPLEXITY_CRITICAL) {
      suggestions.push({
        type: 'split_method',
        priority: 'critical',
        description: `Method ${method.name} has high complexity (${method.cyclomaticComplexity}) - simplify`,
        targetLines: { start: method.startLine, end: method.endLine },
        suggestedFileName: `${analysis.fileName.replace('.ts', '')}-simplified.ts`,
        suggestedMethodName: `${method.name}Simplified`,
        reason: 'Method has high cyclomatic complexity',
        estimatedEffort: 'medium'
      });
    }
  });
  
  // Too many parameters
  analysis.methods.forEach(method => {
    if (method.parameters > THRESHOLDS.PARAMETERS_CRITICAL) {
      suggestions.push({
        type: 'create_utility',
        priority: 'high',
        description: `Method ${method.name} has ${method.parameters} parameters - create options object`,
        targetLines: { start: method.startLine, end: method.endLine },
        suggestedFileName: `${analysis.fileName.replace('.ts', '')}-interfaces.ts`,
        reason: 'Method has too many parameters',
        estimatedEffort: 'small'
      });
    }
  });
  
  // Shape-specific suggestions for extractors
  if (analysis.fileName.includes('extractor')) {
    if (analysis.fileName.includes('shape-extractor')) {
      suggestions.push({
        type: 'extract_class',
        priority: 'high',
        description: 'Extract type-specific shape processing into separate extractors',
        targetLines: { start: 1, end: analysis.totalLines },
        suggestedFileName: 'chart-extractor.ts, table-extractor.ts, media-extractor.ts',
        reason: 'Shape extractor should be modularized by shape type',
        estimatedEffort: 'large'
      });
    }
  }
  
  return suggestions.sort((a, b) => {
    const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });
}

/**
 * Analyze a single TypeScript file comprehensively
 */
export function analyzeFile(filePath: string): FileAnalysis {
  const fileName = path.basename(filePath);
  const lineCount = countLines(filePath);
  const methods = detectLongMethods(filePath);
  
  // Calculate complexity metrics
  const complexity: ComplexityMetrics = {
    cyclomaticComplexity: methods.reduce((sum, method) => sum + method.cyclomaticComplexity, 0),
    cognitiveComplexity: methods.length * 2, // Simplified calculation
    maintainabilityIndex: Math.max(0, 100 - (lineCount.total / 10) - (methods.length * 2)),
    technicalDebt: lineCount.total > 300 ? 'critical' : lineCount.total > 200 ? 'high' : lineCount.total > 100 ? 'medium' : 'low'
  };
  
  const analysis: FileAnalysis = {
    filePath,
    fileName,
    totalLines: lineCount.total,
    codeLines: lineCount.code,
    commentLines: lineCount.comments,
    emptyLines: lineCount.empty,
    methods,
    classes: [], // TODO: Implement class detection
    functions: [], // TODO: Implement function detection
    imports: [], // TODO: Implement import detection
    exports: [], // TODO: Implement export detection
    complexity,
    suggestions: []
  };
  
  analysis.suggestions = suggestSplits(analysis);
  
  return analysis;
}

/**
 * Analyze all extractors in a directory
 */
export function analyzeExtractorsDirectory(directoryPath: string): ExtractorReport {
  const timestamp = new Date().toISOString();
  const flaggedFiles: FileAnalysis[] = [];
  let totalLines = 0;
  
  try {
    const files = fs.readdirSync(directoryPath, { recursive: true })
      .filter(file => typeof file === 'string' && file.endsWith('.ts'))
      .map(file => path.join(directoryPath, file as string));
    
    for (const filePath of files) {
      const analysis = analyzeFile(filePath);
      totalLines += analysis.totalLines;
      
      // Flag files that need attention
      if (analysis.totalLines > THRESHOLDS.FILE_LINES_WARNING || 
          analysis.methods.some(m => m.lineCount > THRESHOLDS.METHOD_LINES_WARNING) ||
          analysis.suggestions.length > 0) {
        flaggedFiles.push(analysis);
      }
    }
    
    const summary = {
      totalLines,
      averageLinesPerFile: Math.round(totalLines / files.length),
      filesOver200Lines: flaggedFiles.filter(f => f.totalLines > 200).length,
      methodsOver50Lines: flaggedFiles.reduce((sum, f) => sum + f.methods.filter(m => m.lineCount > 50).length, 0),
      highComplexityFiles: flaggedFiles.filter(f => f.complexity.technicalDebt === 'high' || f.complexity.technicalDebt === 'critical').length,
      totalSuggestions: flaggedFiles.reduce((sum, f) => sum + f.suggestions.length, 0)
    };
    
    const recommendations = generateRecommendations(flaggedFiles);
    
    return {
      timestamp,
      totalFilesAnalyzed: files.length,
      flaggedFiles,
      summary,
      recommendations
    };
    
  } catch (error) {
    console.error(`Error analyzing directory ${directoryPath}:`, error);
    return {
      timestamp,
      totalFilesAnalyzed: 0,
      flaggedFiles: [],
      summary: {
        totalLines: 0,
        averageLinesPerFile: 0,
        filesOver200Lines: 0,
        methodsOver50Lines: 0,
        highComplexityFiles: 0,
        totalSuggestions: 0
      },
      recommendations: ['Analysis failed - check directory path and permissions']
    };
  }
}

/**
 * Generate high-level recommendations based on analysis
 */
function generateRecommendations(flaggedFiles: FileAnalysis[]): string[] {
  const recommendations: string[] = [];
  
  const criticalFiles = flaggedFiles.filter(f => f.totalLines > 300);
  if (criticalFiles.length > 0) {
    recommendations.push(`🚨 CRITICAL: ${criticalFiles.length} files exceed 300 lines - immediate refactoring required`);
  }
  
  const warningFiles = flaggedFiles.filter(f => f.totalLines > 200 && f.totalLines <= 300);
  if (warningFiles.length > 0) {
    recommendations.push(`⚠️ WARNING: ${warningFiles.length} files exceed 200 lines - schedule refactoring`);
  }
  
  const longMethods = flaggedFiles.reduce((sum, f) => sum + f.methods.filter(m => m.lineCount > 50).length, 0);
  if (longMethods > 0) {
    recommendations.push(`📏 METHOD SIZE: ${longMethods} methods exceed 50 lines - break into smaller functions`);
  }
  
  const highComplexityMethods = flaggedFiles.reduce((sum, f) => sum + f.methods.filter(m => m.cyclomaticComplexity > 10).length, 0);
  if (highComplexityMethods > 0) {
    recommendations.push(`🧠 COMPLEXITY: ${highComplexityMethods} methods have high complexity - simplify logic`);
  }
  
  if (flaggedFiles.some(f => f.fileName.includes('shape-extractor'))) {
    recommendations.push(`🎯 SHAPE EXTRACTOR: Detected monolithic shape extractor - split by shape type (Chart, Table, Media, etc.)`);
  }
  
  recommendations.push(`📊 PHASE 6: Execute componentization plan to achieve <100 lines per file target`);
  
  return recommendations;
}

// =============================================================================
// CLI EXECUTION
// =============================================================================

export function runAnalysis() {
  console.log('🔍 Starting Extractor Analysis - Phase 6 Componentization');
  console.log('=' * 60);
  
  const extractorsPath = path.join(__dirname, '../src/adapters/aspose');
  const report = analyzeExtractorsDirectory(extractorsPath);
  
  console.log(`\n📊 ANALYSIS SUMMARY`);
  console.log(`Files analyzed: ${report.totalFilesAnalyzed}`);
  console.log(`Total lines: ${report.summary.totalLines}`);
  console.log(`Average lines per file: ${report.summary.averageLinesPerFile}`);
  console.log(`Files >200 lines: ${report.summary.filesOver200Lines}`);
  console.log(`Methods >50 lines: ${report.summary.methodsOver50Lines}`);
  console.log(`Total suggestions: ${report.summary.totalSuggestions}`);
  
  console.log(`\n🚨 FLAGGED FILES:`);
  report.flaggedFiles.forEach(file => {
    console.log(`  ${file.fileName}: ${file.totalLines} lines, ${file.methods.length} long methods, ${file.suggestions.length} suggestions`);
  });
  
  console.log(`\n💡 RECOMMENDATIONS:`);
  report.recommendations.forEach(rec => console.log(`  ${rec}`));
  
  // Save detailed report
  const reportPath = path.join(__dirname, '../reports/extractor-analysis-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n💾 Detailed report saved to: ${reportPath}`);
  
  return report;
}

// Run analysis if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAnalysis();
} 