/**
 * JavaConfigurator - Configures Java environment for Aspose.Slides
 * 
 * Handles all Java-related environment variables and configuration
 * needed for proper Aspose.Slides operation in Node.js
 */

class JavaConfigurator {
  constructor(config = {}) {
    this.env = config.env || process.env;
    this.logger = config.logger || console;
    this.defaultOpts = {
      JAVA_TOOL_OPTIONS: [
        '-Djava.awt.headless=true',
        '-Dfile.encoding=UTF-8',
        '-Djava.util.prefs.systemRoot=/tmp',
        '-Duser.timezone=UTC'
      ].join(' '),
      JAVA_OPTS: '-Xmx2g -Xms512m'
    };
  }

  configure() {
    try {
      this.logger.log('🔧 [JavaConfigurator] Configuring Java environment...');
      
      // Set Java tool options
      this.env.JAVA_TOOL_OPTIONS = this.defaultOpts.JAVA_TOOL_OPTIONS;
      
      // Set Java options if not already set
      if (!this.env.JAVA_OPTS) {
        this.env.JAVA_OPTS = this.defaultOpts.JAVA_OPTS;
      }

      this.logger.log('✅ [JavaConfigurator] Java environment configured successfully');
      this.logger.log(`   - JAVA_TOOL_OPTIONS: ${this.env.JAVA_TOOL_OPTIONS}`);
      this.logger.log(`   - JAVA_OPTS: ${this.env.JAVA_OPTS}`);
      
      return true;
    } catch (error) {
      this.logger.error('❌ [JavaConfigurator] Failed to configure Java environment:', error.message);
      throw new Error(`Java configuration failed: ${error.message}`);
    }
  }

  validate() {
    try {
      const java = require('java');
      if (!java) {
        throw new Error('Java module not available');
      }
      
      // Test basic Java functionality
      const JavaString = java.import('java.lang.String');
      if (!JavaString) {
        throw new Error('java.lang.String not available');
      }
      
      this.logger.log('✅ [JavaConfigurator] Java environment validation passed');
      return true;
    } catch (error) {
      this.logger.error('❌ [JavaConfigurator] Java environment validation failed:', error.message);
      throw new Error(`Java validation failed: ${error.message}`);
    }
  }
}

module.exports = JavaConfigurator; 