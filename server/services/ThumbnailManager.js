/**
 * ThumbnailManager - Comprehensive thumbnail and placeholder management
 * 
 * Handles two types of thumbnail generation:
 * 1. PLACEHOLDERS: Text-based thumbnails generated from Universal JSON data
 * 2. REAL THUMBNAILS: Image thumbnails generated from original PPTX files using Aspose.Slides
 * 
 * Features:
 * - Clear distinction between placeholder and real thumbnails
 * - Firebase Storage integration for image storage
 * - Intelligent caching and overwrite management
 * - Comprehensive logging and error handling
 */

const fs = require('fs').promises;
const path = require('path');
const ThumbnailStorage = require('./storage/ThumbnailStorage');
const asposeService = require('./aspose.service');

class ThumbnailManager {
  constructor() {
    this.storage = new ThumbnailStorage();
    this.tempDir = path.join(__dirname, '../temp/thumbnails');
    
    // Ensure temp directory exists
    this.ensureTempDirectory();
  }

  async ensureTempDirectory() {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      console.warn('⚠️ Could not create temp thumbnails directory:', error.message);
    }
  }

  /**
   * Generate thumbnails for a presentation
   * @param {Object} options - Generation options
   * @param {string} options.presentationId - Presentation ID
   * @param {Object} options.presentationData - Universal JSON data
   * @param {string} options.originalFilePath - Path to original PPTX file (optional)
   * @param {string} options.type - 'placeholder' | 'real' | 'auto'
   * @param {Object} options.format - Output format options
   * @param {boolean} options.forceRegenerate - Force regeneration even if exists
   */
  async generateThumbnails(options) {
    const {
      presentationId,
      presentationData,
      originalFilePath,
      type = 'auto',
      format = { format: 'png', width: 800, height: 600, quality: 85 },
      forceRegenerate = false
    } = options;

    console.log(`🖼️ ThumbnailManager: Starting generation for ${presentationId}`);
    console.log(`📐 Format: ${format.format}, Size: ${format.width}x${format.height}, Quality: ${format.quality}`);
    console.log(`🎯 Type: ${type}, Force regenerate: ${forceRegenerate}`);

    const startTime = Date.now();

    try {
      // Step 1: Check existing thumbnails
      if (!forceRegenerate) {
        const existing = await this.storage.getThumbnails(presentationId);
        if (existing && existing.length > 0) {
          console.log(`✅ Found ${existing.length} existing thumbnails, returning cached versions`);
          return {
            success: true,
            thumbnails: existing,
            type: existing[0].type || 'unknown',
            fromCache: true,
            processingTimeMs: Date.now() - startTime
          };
        }
      }

      // Step 2: Determine generation strategy
      const strategy = this.determineStrategy(type, originalFilePath, presentationData);
      console.log(`🎯 Selected strategy: ${strategy.type} - ${strategy.reason}`);

      // Step 3: Clear existing thumbnails if regenerating
      if (forceRegenerate) {
        await this.storage.clearThumbnails(presentationId);
        console.log(`🗑️ Cleared existing thumbnails for regeneration`);
      }

      // Step 4: Generate thumbnails based on strategy
      let result;
      switch (strategy.type) {
        case 'real':
          result = await this.generateRealThumbnails(presentationId, originalFilePath, format);
          break;
        case 'placeholder':
          result = await this.generatePlaceholders(presentationId, presentationData, format);
          break;
        default:
          throw new Error(`Unknown generation strategy: ${strategy.type}`);
      }

      // Step 5: Save to storage
      const savedThumbnails = await this.storage.saveThumbnails(presentationId, result.thumbnails);

      const processingTimeMs = Date.now() - startTime;
      console.log(`✅ ThumbnailManager: Generated ${savedThumbnails.length} ${result.type} thumbnails in ${processingTimeMs}ms`);

      return {
        success: true,
        thumbnails: savedThumbnails,
        type: result.type,
        fromCache: false,
        processingTimeMs,
        metadata: {
          strategy: strategy.type,
          reason: strategy.reason,
          realThumbnails: result.type === 'real',
          totalGenerated: savedThumbnails.length
        }
      };

    } catch (error) {
      console.error(`❌ ThumbnailManager: Generation failed for ${presentationId}:`, error.message);
      
      // Fallback to placeholders if real thumbnail generation fails
      if (type === 'real' || type === 'auto') {
        console.log(`🔄 Falling back to placeholder generation...`);
        try {
          const fallbackResult = await this.generatePlaceholders(presentationId, presentationData, format);
          const savedThumbnails = await this.storage.saveThumbnails(presentationId, fallbackResult.thumbnails);
          
          return {
            success: true,
            thumbnails: savedThumbnails,
            type: 'placeholder',
            fromCache: false,
            processingTimeMs: Date.now() - startTime,
            metadata: {
              strategy: 'fallback',
              reason: `Real thumbnail generation failed: ${error.message}`,
              realThumbnails: false,
              totalGenerated: savedThumbnails.length
            }
          };
        } catch (fallbackError) {
          throw new Error(`Both real and fallback generation failed: ${error.message}, ${fallbackError.message}`);
        }
      }
      
      throw error;
    }
  }

  /**
   * Determine the best generation strategy
   */
  determineStrategy(requestedType, originalFilePath, presentationData) {
    if (requestedType === 'placeholder') {
      return {
        type: 'placeholder',
        reason: 'Explicitly requested placeholder generation'
      };
    }

    if (requestedType === 'real') {
      if (!originalFilePath) {
        throw new Error('Real thumbnail generation requested but no original file provided');
      }
      return {
        type: 'real',
        reason: 'Explicitly requested real thumbnail generation'
      };
    }

    // Auto mode - determine best strategy
    if (originalFilePath && asposeService.isAvailable()) {
      return {
        type: 'real',
        reason: 'Original file available and Aspose.Slides ready'
      };
    }

    if (!asposeService.isAvailable()) {
      return {
        type: 'placeholder',
        reason: 'Aspose.Slides not available, using placeholders'
      };
    }

    if (!originalFilePath) {
      return {
        type: 'placeholder',
        reason: 'Original file not available, using placeholders'
      };
    }

    return {
      type: 'placeholder',
      reason: 'Default fallback to placeholders'
    };
  }

  /**
   * Generate real thumbnails using Aspose.Slides
   */
  async generateRealThumbnails(presentationId, originalFilePath, format) {
    console.log(`🎨 Generating REAL THUMBNAILS using Aspose.Slides`);
    console.log(`📁 Source file: ${path.basename(originalFilePath)}`);

    try {
      // Verify file exists
      await fs.access(originalFilePath);
      
      // Initialize Aspose service if needed
      if (!asposeService.isAvailable()) {
        await asposeService.init();
      }

      // Generate thumbnails using Aspose service
      const asposeResult = await asposeService.generateThumbnails(originalFilePath, {
        format: format.format,
        width: format.width,
        height: format.height,
        quality: format.quality
      });

      const thumbnails = asposeResult.thumbnails.map((thumbnail, index) => ({
        slideIndex: index,
        slideNumber: index + 1,
        type: 'real',
        format: format.format,
        width: format.width,
        height: format.height,
        data: thumbnail.data, // Base64 or binary data
        url: null, // Will be set after upload to storage
        generatedAt: new Date().toISOString(),
        metadata: {
          source: 'aspose-slides',
          originalFile: path.basename(originalFilePath),
          realThumbnail: true
        }
      }));

      console.log(`✅ Generated ${thumbnails.length} real thumbnails`);
      
      return {
        type: 'real',
        thumbnails,
        metadata: asposeResult.metadata
      };

    } catch (error) {
      console.error(`❌ Real thumbnail generation failed:`, error.message);
      throw error;
    }
  }

  /**
   * Generate placeholder thumbnails from Universal JSON data
   */
  async generatePlaceholders(presentationId, presentationData, format) {
    console.log(`📝 Generating PLACEHOLDER THUMBNAILS from Universal JSON`);
    
    try {
      const slides = presentationData?.data?.presentation?.slides || [];
      console.log(`📊 Processing ${slides.length} slides for placeholders`);

      const thumbnails = slides.map((slide, index) => {
        // Extract meaningful content from slide
        const slideTitle = this.extractSlideTitle(slide, index);
        const slideContent = this.extractSlideContent(slide);
        const displayText = slideTitle || `Slide ${index + 1}`;

        // Generate placeholder URL
        const placeholderUrl = `https://via.placeholder.com/${format.width}x${format.height}.${format.format}?text=${encodeURIComponent(displayText)}`;

        return {
          slideIndex: index,
          slideNumber: index + 1,
          type: 'placeholder',
          format: format.format,
          width: format.width,
          height: format.height,
          url: placeholderUrl,
          data: null, // Placeholders don't have binary data
          generatedAt: new Date().toISOString(),
          metadata: {
            source: 'universal-json',
            slideTitle: slideTitle,
            slideContent: slideContent ? slideContent.substring(0, 100) : null,
            realThumbnail: false
          }
        };
      });

      console.log(`✅ Generated ${thumbnails.length} placeholder thumbnails`);

      return {
        type: 'placeholder',
        thumbnails,
        metadata: {
          totalSlides: slides.length,
          generatedCount: thumbnails.length,
          source: 'universal-json'
        }
      };

    } catch (error) {
      console.error(`❌ Placeholder generation failed:`, error.message);
      throw error;
    }
  }

  /**
   * Extract slide title from Universal JSON slide data
   */
  extractSlideTitle(slide, index) {
    // Try various methods to get slide title
    if (slide.name && slide.name.trim()) {
      return slide.name.trim();
    }

    if (slide.title && slide.title.trim()) {
      return slide.title.trim();
    }

    // Look for title in shapes
    if (slide.shapes && Array.isArray(slide.shapes)) {
      for (const shape of slide.shapes) {
        if (shape.type === 'title' && shape.text) {
          return shape.text.substring(0, 50);
        }
        if (shape.text && shape.text.length > 0 && shape.text.length < 100) {
          return shape.text.substring(0, 50);
        }
      }
    }

    // Fallback
    return `Slide ${index + 1}`;
  }

  /**
   * Extract content preview from slide
   */
  extractSlideContent(slide) {
    if (!slide.shapes || !Array.isArray(slide.shapes)) {
      return null;
    }

    const textContent = slide.shapes
      .filter(shape => shape.text && shape.type !== 'title')
      .map(shape => shape.text)
      .join(' ')
      .trim();

    return textContent.length > 0 ? textContent : null;
  }

  /**
   * Get existing thumbnails
   */
  async getThumbnails(presentationId) {
    return await this.storage.getThumbnails(presentationId);
  }

  /**
   * Delete thumbnails
   */
  async deleteThumbnails(presentationId) {
    return await this.storage.clearThumbnails(presentationId);
  }

  /**
   * Get thumbnail statistics
   */
  async getStats(presentationId) {
    const thumbnails = await this.storage.getThumbnails(presentationId);
    
    if (!thumbnails || thumbnails.length === 0) {
      return {
        total: 0,
        real: 0,
        placeholder: 0,
        exists: false
      };
    }

    const stats = {
      total: thumbnails.length,
      real: thumbnails.filter(t => t.type === 'real').length,
      placeholder: thumbnails.filter(t => t.type === 'placeholder').length,
      exists: true
    };

    return stats;
  }
}

module.exports = ThumbnailManager; 