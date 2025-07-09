/**
 * PlaceholderGenerator - Local thumbnail placeholder generation
 * 
 * Creates thumbnail images locally without depending on external services like via.placeholder.com
 * Generates simple but effective placeholder images with slide titles and numbers
 */

const fs = require('fs').promises;
const path = require('path');

class PlaceholderGenerator {
  constructor() {
    this.canvas = null;
    this.isNodeCanvasAvailable = false;
    this.tempDir = path.join(__dirname, '../temp/placeholders');
    
    // Try to initialize canvas if available
    this.initializeCanvas();
    this.ensureTempDirectory();
  }

  async ensureTempDirectory() {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      console.warn('⚠️ Could not create temp placeholders directory:', error.message);
    }
  }

  initializeCanvas() {
    try {
      // Try to load node-canvas if available
      const { createCanvas } = require('canvas');
      this.createCanvas = createCanvas;
      this.isNodeCanvasAvailable = true;
      console.log('✅ PlaceholderGenerator: Canvas support available');
    } catch (error) {
      console.log('📝 PlaceholderGenerator: Canvas not available, using SVG generation');
      this.isNodeCanvasAvailable = false;
    }
  }

  /**
   * Generate a placeholder thumbnail
   */
  async generatePlaceholder(options) {
    const {
      slideNumber = 1,
      slideTitle = `Slide ${slideNumber}`,
      width = 800,
      height = 600,
      format = 'png',
      backgroundColor = '#f0f0f0',
      textColor = '#333333',
      borderColor = '#cccccc'
    } = options;

    if (this.isNodeCanvasAvailable) {
      return await this.generateCanvasPlaceholder({
        slideNumber,
        slideTitle,
        width,
        height,
        format,
        backgroundColor,
        textColor,
        borderColor
      });
    } else {
      return await this.generateSVGPlaceholder({
        slideNumber,
        slideTitle,
        width,
        height,
        format,
        backgroundColor,
        textColor,
        borderColor
      });
    }
  }

  /**
   * Generate placeholder using Canvas (if available)
   */
  async generateCanvasPlaceholder(options) {
    const { slideNumber, slideTitle, width, height, format, backgroundColor, textColor, borderColor } = options;

    try {
      const canvas = this.createCanvas(width, height);
      const ctx = canvas.getContext('2d');

      // Background
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, width, height);

      // Border
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 2;
      ctx.strokeRect(1, 1, width - 2, height - 2);

      // Title text
      const titleFontSize = Math.min(width / 15, height / 10, 48);
      ctx.fillStyle = textColor;
      ctx.font = `bold ${titleFontSize}px Arial, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Title (truncated if too long)
      const maxTitleLength = Math.floor(width / (titleFontSize * 0.6));
      const displayTitle = slideTitle.length > maxTitleLength 
        ? slideTitle.substring(0, maxTitleLength - 3) + '...'
        : slideTitle;

      ctx.fillText(displayTitle, width / 2, height / 2 - titleFontSize / 2);

      // Slide number
      const numberFontSize = Math.min(width / 20, height / 15, 32);
      ctx.font = `${numberFontSize}px Arial, sans-serif`;
      ctx.fillStyle = '#666666';
      ctx.fillText(`Slide ${slideNumber}`, width / 2, height / 2 + titleFontSize);

      // Convert to buffer
      const buffer = canvas.toBuffer(`image/${format}`);
      const dataUrl = `data:image/${format};base64,${buffer.toString('base64')}`;

      return {
        success: true,
        data: buffer,
        dataUrl: dataUrl,
        format: format,
        width: width,
        height: height,
        method: 'canvas'
      };

    } catch (error) {
      console.error('❌ Canvas placeholder generation failed:', error);
      throw error;
    }
  }

  /**
   * Generate placeholder using SVG (fallback)
   */
  async generateSVGPlaceholder(options) {
    const { slideNumber, slideTitle, width, height, backgroundColor, textColor, borderColor } = options;

    try {
      // Calculate responsive font sizes
      const titleFontSize = Math.min(width / 15, height / 10, 48);
      const numberFontSize = Math.min(width / 20, height / 15, 32);

      // Truncate title if necessary
      const maxTitleLength = Math.floor(width / (titleFontSize * 0.6));
      const displayTitle = slideTitle.length > maxTitleLength 
        ? slideTitle.substring(0, maxTitleLength - 3) + '...'
        : slideTitle;

      // Generate SVG
      const svg = `
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="${backgroundColor}" stroke="${borderColor}" stroke-width="2"/>
          <text x="50%" y="${height/2 - titleFontSize/2}" 
                font-family="Arial, sans-serif" 
                font-size="${titleFontSize}" 
                font-weight="bold"
                fill="${textColor}" 
                text-anchor="middle" 
                dominant-baseline="middle">
            ${this.escapeXml(displayTitle)}
          </text>
          <text x="50%" y="${height/2 + titleFontSize}" 
                font-family="Arial, sans-serif" 
                font-size="${numberFontSize}" 
                fill="#666666" 
                text-anchor="middle" 
                dominant-baseline="middle">
            Slide ${slideNumber}
          </text>
        </svg>
      `.trim();

      // Convert SVG to data URL
      const dataUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;

      return {
        success: true,
        data: svg,
        dataUrl: dataUrl,
        format: 'svg',
        width: width,
        height: height,
        method: 'svg'
      };

    } catch (error) {
      console.error('❌ SVG placeholder generation failed:', error);
      throw error;
    }
  }

  /**
   * Generate multiple placeholders
   */
  async generateMultiplePlaceholders(slides, options = {}) {
    const {
      width = 800,
      height = 600,
      format = 'png'
    } = options;

    console.log(`📝 PlaceholderGenerator: Generating ${slides.length} local placeholders`);
    
    const placeholders = [];

    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i];
      const slideNumber = i + 1;
      const slideTitle = this.extractSlideTitle(slide, slideNumber);

      try {
        const placeholder = await this.generatePlaceholder({
          slideNumber,
          slideTitle,
          width,
          height,
          format
        });

        placeholders.push({
          slideIndex: i,
          slideNumber: slideNumber,
          title: slideTitle,
          url: placeholder.dataUrl,
          data: placeholder.data,
          format: placeholder.format,
          width: placeholder.width,
          height: placeholder.height,
          method: placeholder.method,
          generatedAt: new Date().toISOString(),
          type: 'placeholder',
          source: 'local-generator'
        });

        console.log(`✅ Generated local placeholder ${slideNumber}/${slides.length}: "${slideTitle}"`);

      } catch (error) {
        console.error(`❌ Failed to generate placeholder for slide ${slideNumber}:`, error);
        
        // Fallback to simple text placeholder
        placeholders.push({
          slideIndex: i,
          slideNumber: slideNumber,
          title: slideTitle,
          url: this.generateSimpleTextUrl(slideTitle, width, height),
          data: null,
          format: 'url',
          width: width,
          height: height,
          method: 'text-fallback',
          generatedAt: new Date().toISOString(),
          type: 'placeholder',
          source: 'fallback'
        });
      }
    }

    return {
      success: true,
      placeholders: placeholders,
      totalGenerated: placeholders.length,
      method: this.isNodeCanvasAvailable ? 'canvas' : 'svg'
    };
  }

  /**
   * Extract slide title from slide data
   */
  extractSlideTitle(slide, slideNumber) {
    // Try various methods to get slide title
    if (slide?.name && slide.name.trim()) {
      return slide.name.trim();
    }

    if (slide?.title && slide.title.trim()) {
      return slide.title.trim();
    }

    // Look for title in shapes
    if (slide?.shapes && Array.isArray(slide.shapes)) {
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
    return `Slide ${slideNumber}`;
  }

  /**
   * Generate simple text-based URL (final fallback)
   */
  generateSimpleTextUrl(title, width, height) {
    // Use a different placeholder service or create a data URL
    const canvas = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#f5f5f5" stroke="#ddd" stroke-width="1"/>
      <text x="50%" y="50%" font-family="Arial" font-size="24" fill="#333" text-anchor="middle" dominant-baseline="middle">
        ${this.escapeXml(title)}
      </text>
    </svg>`;
    
    return `data:image/svg+xml;base64,${Buffer.from(canvas).toString('base64')}`;
  }

  /**
   * Escape XML characters
   */
  escapeXml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Check if generator is available
   */
  isAvailable() {
    return true; // Always available with SVG fallback
  }

  /**
   * Get capabilities
   */
  getCapabilities() {
    return {
      canvas: this.isNodeCanvasAvailable,
      svg: true,
      formats: this.isNodeCanvasAvailable ? ['png', 'jpg', 'svg'] : ['svg'],
      fallback: true
    };
  }
}

module.exports = PlaceholderGenerator; 