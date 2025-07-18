/**
 * LicenseLoader - Loads and applies Aspose.Slides license
 * 
 * Handles loading license content from environment variables,
 * creating temporary files, and applying the license to Aspose
 */

const fs = require('fs');

class LicenseLoader {
  constructor(config = {}) {
    this.logger = config.logger || console;
    this.envVar = config.envVar || 'ASPOSE_LICENSE_CONTENT';
    this.tempPath = config.tempPath || '/tmp/aspose-license.lic';
    this.cleanupTemp = config.cleanupTemp !== false; // Default to true
  }

  async loadAndApply(aspose) {
    try {
      this.logger.log('🔑 [LicenseLoader] Starting license loading process...');
      
      // Check for license content in environment variable
      const licenseContent = process.env[this.envVar];
      
      if (!licenseContent) {
        this.logger.warn('⚠️ [LicenseLoader] No ASPOSE_LICENSE_CONTENT configured - using evaluation mode');
        return false;
      }

      this.logger.log('🔑 [LicenseLoader] License content found in environment variable');
      this.logger.log(`🔑 [LicenseLoader] License content length: ${licenseContent.length} characters`);
      
      // DEBUG: Log first 200 characters to see what we're getting
      const preview = licenseContent.substring(0, 200);
      this.logger.log(`🔍 [LicenseLoader] License content preview: "${preview}"`);
      
      // Check if it looks like XML
      const isXml = licenseContent.trim().startsWith('<?xml') || licenseContent.trim().startsWith('<');
      this.logger.log(`🔍 [LicenseLoader] Content appears to be XML: ${isXml}`);
      
      if (!isXml) {
        this.logger.error('❌ [LicenseLoader] License content does not appear to be valid XML');
        this.logger.error('❌ [LicenseLoader] Expected XML format, got:', preview);
        throw new Error('License content is not valid XML format');
      }
      
      // Verify we have License class
      if (!aspose.License) {
        throw new Error('License class not available in Aspose.Slides library');
      }

      // Create and apply license from content
      const License = aspose.License;
      const license = new License();
      
      this.logger.log('🔑 [LicenseLoader] Creating temporary license file from content...');
      
      // Create a temporary file from the license content
      // Fix XML declaration by unescaping the content and converting to multiline
      let cleanLicenseContent = licenseContent;
      
      this.logger.log('🔍 [LicenseLoader] Original license content preview:');
      this.logger.log(`   "${licenseContent.substring(0, 200)}..."`);
      
      // Step 1: Fix common XML escaping issues
      cleanLicenseContent = cleanLicenseContent.replace(/\\"/g, '"');
      cleanLicenseContent = cleanLicenseContent.replace(/\\n/g, '\n');
      cleanLicenseContent = cleanLicenseContent.replace(/\\t/g, '\t');
      cleanLicenseContent = cleanLicenseContent.replace(/\\r/g, '\r');
      
      this.logger.log('🔍 [LicenseLoader] After unescaping:');
      this.logger.log(`   "${cleanLicenseContent.substring(0, 200)}..."`);
      
      // Step 2: Fix XML declaration specifically
      // Replace malformed XML declarations like <?xml version=1.0?> with proper ones
      cleanLicenseContent = cleanLicenseContent.replace(
        /<\?xml\s+version\s*=\s*([^"'\s>]+)\s*\?>/g,
        '<?xml version="$1"?>'
      );
      
      // Step 3: Ensure proper XML declaration with quotes
      if (!cleanLicenseContent.trim().startsWith('<?xml version="')) {
        // If no proper XML declaration, add one
        if (cleanLicenseContent.trim().startsWith('<?xml')) {
          // Replace malformed declaration
          cleanLicenseContent = cleanLicenseContent.replace(
            /<\?xml[^>]*\?>/,
            '<?xml version="1.0" encoding="UTF-8"?>'
          );
        } else {
          // Add new declaration
          cleanLicenseContent = '<?xml version="1.0" encoding="UTF-8"?>\n' + cleanLicenseContent;
        }
      }
      
      this.logger.log('🔍 [LicenseLoader] After XML declaration fix:');
      this.logger.log(`   "${cleanLicenseContent.substring(0, 200)}..."`);
      
      // Step 4: Format XML for better readability (optional but helpful for debugging)
      // Add line breaks after major tags
      cleanLicenseContent = cleanLicenseContent
        .replace(/></g, '>\n<')
        .replace(/\n\s*\n/g, '\n') // Remove multiple empty lines
        .trim();
      
      this.logger.log('🔍 [LicenseLoader] Final formatted XML preview:');
      this.logger.log(`   "${cleanLicenseContent.substring(0, 300)}..."`);
      
      this.logger.log('🔑 [LicenseLoader] Writing cleaned license content to temporary file...');
      this.logger.log(`🔍 [LicenseLoader] Cleaned content preview: "${cleanLicenseContent.substring(0, 200)}"`);
      
      fs.writeFileSync(this.tempPath, cleanLicenseContent, 'utf8');
      
      this.logger.log('🔑 [LicenseLoader] Applying license from temporary file...');
      license.setLicense(this.tempPath);
      
      // Clean up temporary file
      if (this.cleanupTemp) {
        try {
          fs.unlinkSync(this.tempPath);
          this.logger.log('🔑 [LicenseLoader] Temporary license file cleaned up');
        } catch (cleanupError) {
          this.logger.warn('⚠️ [LicenseLoader] Failed to cleanup temporary license file:', cleanupError.message);
        }
      }
      
      this.logger.log('✅ [LicenseLoader] License applied successfully from environment variable');
      return true;

    } catch (error) {
      this.logger.error(`❌ [LicenseLoader] License loading failed: ${error.message}`);
      throw error;
    }
  }

  // Alternative method to load from file path
  async loadFromFile(aspose, filePath) {
    try {
      this.logger.log(`🔑 [LicenseLoader] Loading license from file: ${filePath}`);
      
      if (!fs.existsSync(filePath)) {
        throw new Error(`License file not found: ${filePath}`);
      }
      
      const License = aspose.License;
      const license = new License();
      
      license.setLicense(filePath);
      
      this.logger.log('✅ [LicenseLoader] License applied successfully from file');
      return true;
      
    } catch (error) {
      this.logger.error(`❌ [LicenseLoader] License loading from file failed: ${error.message}`);
      throw error;
    }
  }

  // Validate license content without applying
  validateContent(licenseContent) {
    try {
      if (!licenseContent) {
        return { valid: false, reason: 'No license content provided' };
      }
      
      const isXml = licenseContent.trim().startsWith('<?xml') || licenseContent.trim().startsWith('<');
      if (!isXml) {
        return { valid: false, reason: 'Content is not valid XML' };
      }
      
      // Basic XML structure check
      if (!licenseContent.includes('<License>') || !licenseContent.includes('</License>')) {
        return { valid: false, reason: 'Missing License tags' };
      }
      
      return { valid: true, reason: 'License content appears valid' };
      
    } catch (error) {
      return { valid: false, reason: `Validation error: ${error.message}` };
    }
  }
}

module.exports = LicenseLoader; 