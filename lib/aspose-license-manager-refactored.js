/**
 * Aspose.Slides Global License Manager - Refactored Version
 * 
 * This is the refactored, componentized version of the license manager.
 * It provides the same interface as the original but with better architecture.
 * 
 * CRITICAL: This manager properly coordinates with JAR loading to prevent ClassNotFoundException
 */

const AsposeLicenseManager = require('./aspose/components/AsposeLicenseManager');

// Create singleton instance with default configuration
const licenseManager = new AsposeLicenseManager({
  // Java configuration
  java: {
    maxAttempts: 10,
    delayMs: 1000
  },
  
  // JAR loading configuration
  jar: {
    maxAttempts: 10,
    delayMs: 1000
  },
  
  // License configuration
  license: {
    envVar: 'ASPOSE_LICENSE_CONTENT',
    tempPath: '/tmp/aspose-license.lic',
    cleanupTemp: true
  },
  
  // Logging configuration
  logger: console
});

// Export the singleton instance
module.exports = licenseManager;

// Also export the class for testing or custom instances
module.exports.AsposeLicenseManager = AsposeLicenseManager;

// Export individual components for advanced usage
module.exports.JavaConfigurator = require('./aspose/components/JavaConfigurator');
module.exports.JarLoader = require('./aspose/components/JarLoader');
module.exports.ClassVerifier = require('./aspose/components/ClassVerifier');
module.exports.LicenseLoader = require('./aspose/components/LicenseLoader');
module.exports.LicenseTester = require('./aspose/components/LicenseTester'); 