#!/usr/bin/env node

/**
 * Aspose Import Refactoring Script
 * 
 * This script systematically replaces all direct imports of aspose.slides.js
 * with the unified AsposeDriverFactory to eliminate Java initialization conflicts.
 * 
 * What it does:
 * 1. Finds all files with direct Aspose imports
 * 2. Replaces direct imports with AsposeDriverFactory usage
 * 3. Updates method calls to use the factory pattern
 * 4. Handles async/await patterns properly
 * 5. Maintains functionality while fixing architecture
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Configuration
const CONFIG = {
  rootDir: process.cwd(),
  serverDir: path.join(process.cwd(), 'server'),
  backupDir: path.join(process.cwd(), 'backup-before-refactor'),
  excludePatterns: [
    'node_modules',
    '.git',
    'dist',
    'build',
    'coverage',
    'backup-before-refactor'
  ]
};

// Patterns to match and replace
const PATTERNS = {
  // Direct require patterns
  directRequire: /const\s+aspose\s*=\s*require\s*\(\s*['"`].*?aspose\.slides\.js['"`]\s*\)/g,
  directRequireAlt: /const\s+aspose\s*=\s*require\s*\(\s*['"`].*?lib\/aspose\.slides\.js['"`]\s*\)/g,
  
  // Import patterns
  importStatement: /import.*?from\s*['"`].*?aspose\.slides\.js['"`]/g,
  
  // Usage patterns that need to be made async
  shapeTypeUsage: /aspose\.ShapeType/g,
  fillTypeUsage: /aspose\.FillType/g,
  presentationUsage: /new\s+aspose\.Presentation/g,
  
  // Common class usage patterns
  licenseUsage: /aspose\.License/g,
  saveFormatUsage: /aspose\.SaveFormat/g,
  exportFormatUsage: /aspose\.ExportFormat/g
};

// Replacement templates
const REPLACEMENTS = {
  // Import replacement
  importReplacement: "const asposeDriver = require('../../../lib/AsposeDriverFactory');",
  
  // Usage replacements (these will need async handling)
  shapeTypeReplacement: "await asposeDriver.getShapeTypes()",
  fillTypeReplacement: "await asposeDriver.getFillTypes()",
  presentationReplacement: "await asposeDriver.createPresentation",
  licenseReplacement: "await asposeDriver.getLicense()",
  saveFormatReplacement: "await asposeDriver.getSaveFormat()",
  exportFormatReplacement: "await asposeDriver.getExportFormat()"
};

class AsposeRefactorer {
  constructor() {
    this.processedFiles = [];
    this.errors = [];
    this.stats = {
      filesProcessed: 0,
      filesModified: 0,
      replacementsMade: 0,
      errorsEncountered: 0
    };
  }

  async run() {
    console.log('🚀 Starting Aspose Import Refactoring');
    console.log('====================================');
    
    try {
      // Step 1: Create backup
      await this.createBackup();
      
      // Step 2: Find all files with direct imports
      const filesToProcess = await this.findFilesWithDirectImports();
      
      if (filesToProcess.length === 0) {
        console.log('✅ No files found with direct Aspose imports');
        return;
      }
      
      console.log(`📁 Found ${filesToProcess.length} files to process:`);
      filesToProcess.forEach(file => console.log(`   - ${file}`));
      console.log('');
      
      // Step 3: Process each file
      for (const file of filesToProcess) {
        await this.processFile(file);
      }
      
      // Step 4: Show summary
      this.showSummary();
      
    } catch (error) {
      console.error('❌ Refactoring failed:', error.message);
      process.exit(1);
    }
  }

  async createBackup() {
    console.log('💾 Creating backup...');
    
    try {
      // Create backup directory
      if (!fs.existsSync(CONFIG.backupDir)) {
        fs.mkdirSync(CONFIG.backupDir, { recursive: true });
      }
      
      // Copy server directory to backup (excluding node_modules and problematic dirs)
      await execAsync(`rsync -av --exclude='node_modules' --exclude='dist' --exclude='build' "${CONFIG.serverDir}/" "${CONFIG.backupDir}/server/"`);
      
      // Copy lib directory to backup
      const libDir = path.join(CONFIG.rootDir, 'lib');
      if (fs.existsSync(libDir)) {
        await execAsync(`cp -r "${libDir}" "${CONFIG.backupDir}/lib"`);
      }
      
      console.log(`✅ Backup created at: ${CONFIG.backupDir}`);
      
    } catch (error) {
      throw new Error(`Failed to create backup: ${error.message}`);
    }
  }

  async findFilesWithDirectImports() {
    console.log('🔍 Searching for files with direct Aspose imports...');
    
    const files = [];
    
    try {
      // Use grep to find files with direct imports
      const { stdout } = await execAsync(
        `find "${CONFIG.serverDir}" -name "*.ts" -o -name "*.js" | xargs grep -l "require.*aspose\\.slides\\.js" 2>/dev/null || true`
      );
      
      const grepResults = stdout.trim().split('\n').filter(line => line.length > 0);
      
      for (const file of grepResults) {
        if (fs.existsSync(file)) {
          files.push(file);
        }
      }
      
      return files;
      
    } catch (error) {
      console.warn('⚠️  Error finding files with grep, falling back to manual search');
      return await this.findFilesManually();
    }
  }

  async findFilesManually() {
    const files = [];
    
    const searchDir = (dir) => {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          // Skip excluded directories
          if (CONFIG.excludePatterns.some(pattern => item.includes(pattern))) {
            continue;
          }
          searchDir(fullPath);
        } else if (stat.isFile() && (item.endsWith('.ts') || item.endsWith('.js'))) {
          // Check if file contains direct import
          const content = fs.readFileSync(fullPath, 'utf8');
          if (content.includes('aspose.slides.js')) {
            files.push(fullPath);
          }
        }
      }
    };
    
    searchDir(CONFIG.serverDir);
    return files;
  }

  async processFile(filePath) {
    console.log(`📝 Processing: ${path.relative(CONFIG.rootDir, filePath)}`);
    
    try {
      let content = fs.readFileSync(filePath, 'utf8');
      let modified = false;
      let replacements = 0;
      
      // Track original content for comparison
      const originalContent = content;
      
      // Replace direct require statements
      if (PATTERNS.directRequire.test(content) || PATTERNS.directRequireAlt.test(content)) {
        content = content.replace(PATTERNS.directRequire, REPLACEMENTS.importReplacement);
        content = content.replace(PATTERNS.directRequireAlt, REPLACEMENTS.importReplacement);
        modified = true;
        replacements++;
      }
      
      // Replace import statements
      if (PATTERNS.importStatement.test(content)) {
        content = content.replace(PATTERNS.importStatement, REPLACEMENTS.importReplacement);
        modified = true;
        replacements++;
      }
      
      // Process the file based on its type
      if (filePath.includes('extractors')) {
        content = await this.processExtractorFile(content, filePath);
      } else if (filePath.includes('services')) {
        content = await this.processServiceFile(content, filePath);
      } else if (filePath.includes('controllers')) {
        content = await this.processControllerFile(content, filePath);
      } else {
        content = await this.processGenericFile(content, filePath);
      }
      
      // Check if content was modified
      if (content !== originalContent) {
        modified = true;
      }
      
      // Save the modified file
      if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`  ✅ Modified (${replacements} replacements)`);
        this.stats.filesModified++;
        this.stats.replacementsMade += replacements;
      } else {
        console.log(`  ℹ️  No changes needed`);
      }
      
      this.processedFiles.push(filePath);
      this.stats.filesProcessed++;
      
    } catch (error) {
      const errorMsg = `Failed to process ${filePath}: ${error.message}`;
      console.error(`  ❌ ${errorMsg}`);
      this.errors.push(errorMsg);
      this.stats.errorsEncountered++;
    }
  }

  async processExtractorFile(content, filePath) {
    // Extractor files need special handling for shape type checks
    
    // Replace shape type usages
    content = content.replace(
      /aspose\.ShapeType\.(\w+)/g,
      'await asposeDriver.isShapeOfType(shape, "$1")'
    );
    
    // Replace fill type usages
    content = content.replace(
      /aspose\.FillType\.(\w+)/g,
      'await asposeDriver.isFillOfType(fillFormat, "$1")'
    );
    
    // Replace presentation creation
    content = content.replace(
      /new\s+aspose\.Presentation\s*\(\s*([^)]*)\s*\)/g,
      'await asposeDriver.createPresentation($1)'
    );
    
    // Make sure methods are async
    content = this.ensureAsyncMethods(content);
    
    return content;
  }

  async processServiceFile(content, filePath) {
    // Service files need async handling for presentation operations
    
    // Replace presentation operations
    content = content.replace(
      /new\s+aspose\.Presentation\s*\(\s*([^)]*)\s*\)/g,
      'await asposeDriver.createPresentation($1)'
    );
    
    // Replace license operations
    content = content.replace(
      /aspose\.License/g,
      'await asposeDriver.getLicense()'
    );
    
    // Replace save format operations
    content = content.replace(
      /aspose\.SaveFormat\.(\w+)/g,
      '(await asposeDriver.getSaveFormat()).$1'
    );
    
    // Make sure methods are async
    content = this.ensureAsyncMethods(content);
    
    return content;
  }

  async processControllerFile(content, filePath) {
    // Controller files need async handling for API operations
    
    // Replace presentation operations
    content = content.replace(
      /new\s+aspose\.Presentation\s*\(\s*([^)]*)\s*\)/g,
      'await asposeDriver.loadPresentation($1)'
    );
    
    // Make sure methods are async
    content = this.ensureAsyncMethods(content);
    
    return content;
  }

  async processGenericFile(content, filePath) {
    // Generic file processing - handle common patterns
    
    // Replace common usage patterns
    content = content.replace(PATTERNS.shapeTypeUsage, 'await asposeDriver.getShapeTypes()');
    content = content.replace(PATTERNS.fillTypeUsage, 'await asposeDriver.getFillTypes()');
    content = content.replace(PATTERNS.presentationUsage, 'await asposeDriver.createPresentation');
    content = content.replace(PATTERNS.licenseUsage, 'await asposeDriver.getLicense()');
    content = content.replace(PATTERNS.saveFormatUsage, 'await asposeDriver.getSaveFormat()');
    content = content.replace(PATTERNS.exportFormatUsage, 'await asposeDriver.getExportFormat()');
    
    // Make sure methods are async
    content = this.ensureAsyncMethods(content);
    
    return content;
  }

  ensureAsyncMethods(content) {
    // Find method signatures that need to be async
    const methodPatterns = [
      /(\w+)\s*\(\s*([^)]*)\s*\)\s*:\s*([^{]+)\s*\{/g,
      /(async\s+)?(\w+)\s*\(\s*([^)]*)\s*\)\s*\{/g
    ];
    
    for (const pattern of methodPatterns) {
      content = content.replace(pattern, (match, asyncKeyword, methodName, params, returnType) => {
        // Skip if already async
        if (asyncKeyword && asyncKeyword.includes('async')) {
          return match;
        }
        
        // Skip constructors and special methods
        if (methodName === 'constructor' || methodName.startsWith('get') || methodName.startsWith('set')) {
          return match;
        }
        
        // Check if method uses await
        const methodBodyStart = match.indexOf('{');
        if (methodBodyStart === -1) return match;
        
        const restOfContent = content.substring(content.indexOf(match) + match.length);
        const methodEnd = this.findMethodEnd(restOfContent);
        const methodBody = restOfContent.substring(0, methodEnd);
        
        if (methodBody.includes('await asposeDriver') || methodBody.includes('await this.')) {
          // Make method async
          if (returnType) {
            return `async ${methodName}(${params}): Promise<${returnType.replace(':', '').trim()}> {`;
          } else {
            return `async ${methodName}(${params}) {`;
          }
        }
        
        return match;
      });
    }
    
    return content;
  }

  findMethodEnd(content) {
    let braceCount = 1;
    let i = 0;
    
    while (i < content.length && braceCount > 0) {
      if (content[i] === '{') braceCount++;
      else if (content[i] === '}') braceCount--;
      i++;
    }
    
    return i;
  }

  showSummary() {
    console.log('\n🎯 Refactoring Summary');
    console.log('=====================');
    console.log(`📁 Files processed: ${this.stats.filesProcessed}`);
    console.log(`✏️  Files modified: ${this.stats.filesModified}`);
    console.log(`🔄 Replacements made: ${this.stats.replacementsMade}`);
    console.log(`❌ Errors encountered: ${this.stats.errorsEncountered}`);
    
    if (this.errors.length > 0) {
      console.log('\n⚠️  Errors:');
      this.errors.forEach(error => console.log(`   - ${error}`));
    }
    
    console.log('\n✅ Refactoring completed!');
    console.log('\n📋 Next steps:');
    console.log('   1. Review the modified files');
    console.log('   2. Run tests to ensure functionality is preserved');
    console.log('   3. Run the pre-build check script');
    console.log('   4. Deploy with the enhanced logging script');
    console.log(`\n💾 Backup available at: ${CONFIG.backupDir}`);
  }
}

// Run the refactoring
if (require.main === module) {
  const refactorer = new AsposeRefactorer();
  refactorer.run().catch(error => {
    console.error('❌ Refactoring failed:', error);
    process.exit(1);
  });
}

module.exports = AsposeRefactorer; 