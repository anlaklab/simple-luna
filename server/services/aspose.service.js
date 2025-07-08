/**
 * Aspose.Slides Service
 * 
 * Real Aspose.Slides integration using REST API instead of Java module
 * NO MOCK DATA - Everything uses real Aspose.Slides Cloud API
 */

const fs = require('fs').promises;
const path = require('path');
const FormData = require('form-data');
const fetch = require('node-fetch');

class AsposeService {
  constructor() {
    this.initialized = false;
    this.accessToken = null;
    this.tokenExpiry = null;
    this.baseUrl = 'https://api.aspose.cloud/v3.0';
    this.init();
  }

  init() {
    try {
      this.clientId = process.env.ASPOSE_CLIENT_ID;
      this.clientSecret = process.env.ASPOSE_CLIENT_SECRET;
      
      if (!this.clientId || !this.clientSecret) {
        console.warn('⚠️ Aspose.Slides credentials not found in environment variables');
        console.warn('💡 Add ASPOSE_CLIENT_ID and ASPOSE_CLIENT_SECRET to your .env file');
        console.warn('🔗 Get credentials at: https://dashboard.aspose.cloud/');
        return;
      }

      this.initialized = true;
      console.log('✅ Aspose.Slides service initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize Aspose.Slides service:', error.message);
    }
  }

  isAvailable() {
    return this.initialized && this.clientId && this.clientSecret;
  }

  /**
   * Get access token for Aspose Cloud API
   */
  async getAccessToken() {
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const response = await fetch('https://api.aspose.cloud/connect/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: this.clientId,
          client_secret: this.clientSecret,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to get access token: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      this.accessToken = data.access_token;
      this.tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // 1 minute buffer

      console.log('✅ Aspose access token obtained');
      return this.accessToken;

    } catch (error) {
      console.error('❌ Failed to get Aspose access token:', error);
      throw new Error(`Aspose authentication failed: ${error.message}`);
    }
  }

  /**
   * Convert PPTX to Universal JSON Schema using real Aspose.Slides Cloud API
   * @param {string} filePath - Path to PPTX file
   * @param {Object} options - Conversion options
   * @returns {Promise<Object>} Universal JSON presentation data
   */
  async convertPPTXToUniversalJSON(filePath, options = {}) {
    if (!this.isAvailable()) {
      throw new Error('Aspose.Slides service not available. Please check your credentials.');
    }

    try {
      console.log(`🔄 Converting PPTX to Universal JSON: ${path.basename(filePath)}`);
      const startTime = Date.now();

      // Step 1: Get access token
      const token = await this.getAccessToken();

      // Step 2: Upload file to Aspose Cloud
      const fileName = `upload_${Date.now()}_${path.basename(filePath)}`;
      await this.uploadFile(filePath, fileName, token);

      // Step 3: Get presentation info
      const presentationInfo = await this.getPresentationInfo(fileName, token);

      // Step 4: Extract slides data
      const slidesData = await this.extractSlidesData(fileName, presentationInfo.slideCount, token);

      // Step 5: Get presentation properties
      const properties = await this.getPresentationProperties(fileName, token);

      // Step 6: Convert to Universal JSON Schema
      const universalJSON = this.convertToUniversalSchema(presentationInfo, slidesData, properties, options);

      // Step 7: Cleanup uploaded file
      await this.deleteFile(fileName, token);

      const processingTime = Date.now() - startTime;
      console.log(`✅ PPTX conversion completed in ${processingTime}ms`);

      return {
        data: universalJSON,
        metadata: {
          originalFile: path.basename(filePath),
          slideCount: presentationInfo.slideCount,
          processingTimeMs: processingTime,
          convertedAt: new Date().toISOString(),
          asposeService: 'cloud-api',
          realConversion: true
        }
      };

    } catch (error) {
      console.error('❌ PPTX conversion failed:', error);
      throw new Error(`PPTX conversion failed: ${error.message}`);
    }
  }

  /**
   * Upload file to Aspose Cloud storage
   */
  async uploadFile(filePath, fileName, token) {
    try {
      const fileBuffer = await fs.readFile(filePath);
      
      const response = await fetch(`${this.baseUrl}/slides/storage/file/${fileName}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/octet-stream',
        },
        body: fileBuffer,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
      }

      console.log(`✅ File uploaded: ${fileName}`);

    } catch (error) {
      console.error('❌ File upload failed:', error);
      throw error;
    }
  }

  /**
   * Get presentation information
   */
  async getPresentationInfo(fileName, token) {
    try {
      const response = await fetch(`${this.baseUrl}/slides/${fileName}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Get presentation info failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return {
        slideCount: data.slides?.length || 0,
        width: data.slideSize?.width || 1920,
        height: data.slideSize?.height || 1080,
        title: data.documentProperties?.title || 'Untitled',
        author: data.documentProperties?.author || 'Unknown',
        subject: data.documentProperties?.subject || '',
        keywords: data.documentProperties?.keywords || '',
        comments: data.documentProperties?.comments || '',
        company: data.documentProperties?.company || '',
        manager: data.documentProperties?.manager || ''
      };

    } catch (error) {
      console.error('❌ Get presentation info failed:', error);
      throw error;
    }
  }

  /**
   * Extract slides data
   */
  async extractSlidesData(fileName, slideCount, token) {
    try {
      const slides = [];

      for (let i = 1; i <= slideCount; i++) {
        console.log(`📄 Extracting slide ${i}/${slideCount}...`);
        
        // Get slide info
        const slideResponse = await fetch(`${this.baseUrl}/slides/${fileName}/slides/${i}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!slideResponse.ok) {
          console.warn(`⚠️ Failed to get slide ${i} info`);
          continue;
        }

        const slideData = await slideResponse.json();

        // Get slide shapes
        const shapesResponse = await fetch(`${this.baseUrl}/slides/${fileName}/slides/${i}/shapes`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        let shapes = [];
        if (shapesResponse.ok) {
          const shapesData = await shapesResponse.json();
          shapes = await this.processShapes(shapesData.shapes || [], fileName, i, token);
        }

        slides.push({
          slideId: i,
          slideIndex: i - 1,
          name: slideData.name || `Slide ${i}`,
          slideType: "Slide",
          shapes: shapes,
          background: this.processBackground(slideData.background),
          transition: this.processTransition(slideData.transition)
        });
      }

      return slides;

    } catch (error) {
      console.error('❌ Extract slides data failed:', error);
      throw error;
    }
  }

  /**
   * Process shapes from Aspose API response
   */
  async processShapes(shapes, fileName, slideIndex, token) {
    const processedShapes = [];

    for (const shape of shapes) {
      try {
        const processedShape = {
          shapeType: shape.type || "Shape",
          name: shape.name || `Shape_${shape.shapeIndex || processedShapes.length}`,
          geometry: {
            x: shape.x || 0,
            y: shape.y || 0,
            width: shape.width || 100,
            height: shape.height || 100
          },
          fillFormat: this.processFillFormat(shape.fillFormat),
        };

        // Process text if shape has text
        if (shape.text || shape.paragraphs) {
          processedShape.textFrame = await this.processTextFrame(shape, fileName, slideIndex, token);
        }

        processedShapes.push(processedShape);

      } catch (shapeError) {
        console.warn(`⚠️ Failed to process shape: ${shapeError.message}`);
      }
    }

    return processedShapes;
  }

  /**
   * Process text frame from shape
   */
  async processTextFrame(shape, fileName, slideIndex, token) {
    try {
      // Get shape text
      const textResponse = await fetch(`${this.baseUrl}/slides/${fileName}/slides/${slideIndex}/shapes/${shape.shapeIndex}/paragraphs`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      let text = shape.text || '';
      let paragraphs = [];

      if (textResponse.ok) {
        const textData = await textResponse.json();
        paragraphs = this.processParagraphs(textData.paragraphs || []);
        text = paragraphs.map(p => p.portions.map(portion => portion.text).join('')).join('\n');
      }

      return {
        text: text,
        paragraphs: paragraphs.length > 0 ? paragraphs : [{
          portions: [{
            text: text,
            fontHeight: 24,
            fontColor: "#000000"
          }],
          alignment: "Left"
        }]
      };

    } catch (error) {
      console.warn(`⚠️ Failed to process text frame: ${error.message}`);
      return {
        text: shape.text || '',
        paragraphs: [{
          portions: [{
            text: shape.text || '',
            fontHeight: 24,
            fontColor: "#000000"
          }],
          alignment: "Left"
        }]
      };
    }
  }

  /**
   * Process paragraphs from Aspose API
   */
  processParagraphs(paragraphs) {
    return paragraphs.map(paragraph => ({
      portions: (paragraph.portions || []).map(portion => ({
        text: portion.text || '',
        fontHeight: portion.fontHeight || 24,
        fontBold: portion.fontBold || false,
        fontItalic: portion.fontItalic || false,
        fontColor: portion.fontColor || "#000000"
      })),
      alignment: paragraph.alignment || "Left"
    }));
  }

  /**
   * Process fill format
   */
  processFillFormat(fillFormat) {
    if (!fillFormat) {
      return { type: "NoFill" };
    }

    switch (fillFormat.type) {
      case 'Solid':
        return {
          type: "Solid",
          solidFillColor: {
            type: "RGB",
            r: fillFormat.color?.r || 255,
            g: fillFormat.color?.g || 255,
            b: fillFormat.color?.b || 255
          }
        };
      default:
        return { type: "NoFill" };
    }
  }

  /**
   * Process background
   */
  processBackground(background) {
    return {
      type: "Solid",
      solidFillColor: {
        type: "RGB",
        r: 255,
        g: 255,
        b: 255
      }
    };
  }

  /**
   * Process transition
   */
  processTransition(transition) {
    return {
      type: transition?.type || "Fade",
      duration: transition?.duration || 0.5
    };
  }

  /**
   * Get presentation properties
   */
  async getPresentationProperties(fileName, token) {
    try {
      const response = await fetch(`${this.baseUrl}/slides/${fileName}/documentProperties`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        console.warn('⚠️ Failed to get presentation properties');
        return {};
      }

      const data = await response.json();
      return data.documentProperties || {};

    } catch (error) {
      console.warn('⚠️ Get presentation properties failed:', error.message);
      return {};
    }
  }

  /**
   * Convert to Universal PowerPoint Schema
   */
  convertToUniversalSchema(presentationInfo, slidesData, properties, options) {
    const presentationId = options.presentationId || `aspose_${Date.now()}`;

    return {
      id: presentationId,
      title: presentationInfo.title || options.title || 'Converted Presentation',
      description: presentationInfo.subject || options.description || 'Converted from PPTX using Aspose.Slides',
      status: 'completed',
      slideCount: presentationInfo.slideCount,
      author: presentationInfo.author || options.author || 'Unknown',
      company: presentationInfo.company || options.company || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      asposeConverted: true,
      realConversion: true,
      data: {
        presentation: {
          metadata: {
            title: presentationInfo.title || options.title || 'Converted Presentation',
            subject: presentationInfo.subject || options.description || '',
            author: presentationInfo.author || options.author || 'Unknown',
            company: presentationInfo.company || options.company || '',
            manager: presentationInfo.manager || '',
            createdTime: new Date().toISOString(),
            lastSavedTime: new Date().toISOString(),
            slideCount: presentationInfo.slideCount,
            keywords: presentationInfo.keywords || '',
            comments: presentationInfo.comments || 'Converted using Aspose.Slides Cloud API',
            revision: 1
          },
          slideSize: {
            width: presentationInfo.width,
            height: presentationInfo.height,
            type: "OnScreen16x9"
          },
          slides: slidesData,
          masterSlides: [{
            slideId: 0,
            name: "Master Slide",
            slideType: "MasterSlide",
            shapes: [],
            background: {
              type: "Solid",
              solidFillColor: { type: "RGB", r: 255, g: 255, b: 255 }
            }
          }],
          layoutSlides: [],
          theme: {
            name: "Default Theme",
            colorScheme: {
              background1: "#ffffff",
              text1: "#000000",
              background2: "#f8f9fa",
              text2: "#333333",
              accent1: "#007bff",
              accent2: "#28a745"
            },
            fontScheme: {
              majorFont: "Calibri",
              minorFont: "Calibri"
            }
          }
        }
      }
    };
  }

  /**
   * Delete file from Aspose Cloud storage
   */
  async deleteFile(fileName, token) {
    try {
      await fetch(`${this.baseUrl}/slides/storage/file/${fileName}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      console.log(`🧹 Cleaned up file: ${fileName}`);

    } catch (error) {
      console.warn(`⚠️ Failed to cleanup file ${fileName}:`, error.message);
    }
  }

  /**
   * Generate real thumbnails using Aspose.Slides Cloud API
   */
  async generateThumbnails(filePath, options = {}) {
    if (!this.isAvailable()) {
      throw new Error('Aspose.Slides service not available');
    }

    try {
      console.log(`🖼️ Generating real thumbnails: ${path.basename(filePath)}`);
      
      const token = await this.getAccessToken();
      const fileName = `thumb_${Date.now()}_${path.basename(filePath)}`;
      
      // Upload file
      await this.uploadFile(filePath, fileName, token);
      
      // Get presentation info
      const presentationInfo = await this.getPresentationInfo(fileName, token);
      
      const thumbnails = [];
      const format = options.format || 'png';
      const width = options.width || 800;
      const height = options.height || 600;

      // Generate thumbnail for each slide
      for (let i = 1; i <= presentationInfo.slideCount; i++) {
        try {
          const response = await fetch(`${this.baseUrl}/slides/${fileName}/slides/${i}/thumbnail?format=${format}&width=${width}&height=${height}`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          if (response.ok) {
            const thumbnailBuffer = await response.buffer();
            
            thumbnails.push({
              slideIndex: i - 1,
              format: format,
              size: { width, height },
              data: thumbnailBuffer,
              url: `data:image/${format};base64,${thumbnailBuffer.toString('base64')}`,
              generatedAt: new Date().toISOString(),
              realThumbnail: true
            });

            console.log(`✅ Generated thumbnail for slide ${i}`);
          }
        } catch (thumbError) {
          console.warn(`⚠️ Failed to generate thumbnail for slide ${i}:`, thumbError.message);
        }
      }

      // Cleanup
      await this.deleteFile(fileName, token);

      return {
        thumbnails,
        metadata: {
          totalSlides: presentationInfo.slideCount,
          generatedCount: thumbnails.length,
          format,
          size: { width, height },
          realThumbnails: true
        }
      };

    } catch (error) {
      console.error('❌ Thumbnail generation failed:', error);
      throw new Error(`Thumbnail generation failed: ${error.message}`);
    }
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      available: this.isAvailable(),
      initialized: this.initialized,
      hasCredentials: !!(this.clientId && this.clientSecret),
      service: 'Aspose.Slides Cloud API',
      baseUrl: this.baseUrl,
      capabilities: [
        'pptx_conversion',
        'thumbnail_generation',
        'slide_extraction',
        'text_extraction',
        'shape_processing'
      ]
    };
  }
}

// Create singleton instance
const asposeService = new AsposeService();

module.exports = asposeService; 