#!/usr/bin/env node

/**
 * Luna PowerPoint Processing - Test Server
 * 
 * Simple test server that directly uses Aspose.Slides library for integration testing
 */

const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const asposeSlides = require('./lib/aspose.slides');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Multer configuration for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// Ensure temp directories exist
const tempDir = path.join(__dirname, 'temp');
const uploadsDir = path.join(tempDir, 'uploads');
const outputDir = path.join(tempDir, 'outputs');

[tempDir, uploadsDir, outputDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Initialize Aspose.Slides
let asposeInitialized = false;
let asposeError = null;

async function initializeAspose() {
  try {
    console.log('🔧 Initializing Aspose.Slides...');
    
    // Try to load and initialize the library
    const licenseFile = path.join(__dirname, 'Aspose.Slides.Product.Family.lic');
    
    if (fs.existsSync(licenseFile)) {
      console.log('📄 Loading Aspose.Slides license...');
      // Set license if file exists
      try {
        const license = new asposeSlides.License();
        license.setLicense(licenseFile);
        console.log('✅ Aspose.Slides license loaded successfully');
      } catch (licenseError) {
        console.log('⚠️  License loading failed, using evaluation mode:', licenseError.message);
      }
    } else {
      console.log('⚠️  No license file found, using evaluation mode');
    }
    
    asposeInitialized = true;
    console.log('✅ Aspose.Slides initialized successfully');
    
  } catch (error) {
    asposeError = error;
    console.error('❌ Failed to initialize Aspose.Slides:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Initialize Aspose on startup
initializeAspose();

// Health check endpoint
app.get('/api/v1/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '1.0.0',
      services: {
        aspose: asposeInitialized ? 'healthy' : 'failed',
        server: 'healthy'
      },
      asposeStatus: {
        initialized: asposeInitialized,
        error: asposeError ? asposeError.message : null
      }
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: `req_${Date.now()}`,
      processingTimeMs: 0,
      version: '1.0.0'
    }
  });
});

// PPTX to JSON conversion endpoint
app.post('/api/v1/pptx2json', upload.single('file'), async (req, res) => {
  const requestId = `req_${Date.now()}`;
  const startTime = Date.now();
  
  try {
    console.log(`🔄 [${requestId}] Starting PPTX to JSON conversion`);
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: {
          type: 'validation_error',
          code: 'NO_FILE_UPLOADED',
          message: 'No PPTX file was uploaded'
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: requestId,
          processingTimeMs: Date.now() - startTime
        }
      });
    }
    
    if (!asposeInitialized) {
      return res.status(500).json({
        success: false,
        error: {
          type: 'server_error',
          code: 'ASPOSE_NOT_INITIALIZED',
          message: 'Aspose.Slides library not initialized',
          details: asposeError ? asposeError.message : null
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: requestId,
          processingTimeMs: Date.now() - startTime
        }
      });
    }
    
    console.log(`📁 [${requestId}] File received: ${req.file.originalname} (${req.file.size} bytes)`);
    
    // Save uploaded file temporarily
    const tempFilePath = path.join(uploadsDir, `${requestId}_${req.file.originalname}`);
    fs.writeFileSync(tempFilePath, req.file.buffer);
    
    try {
      console.log(`🔄 [${requestId}] Loading presentation...`);
      
      // Load the presentation
      const presentation = new asposeSlides.Presentation(tempFilePath);
      
      console.log(`📊 [${requestId}] Analyzing presentation structure...`);
      
      // Extract comprehensive presentation data
      const presentationData = {
        metadata: {
          slideCount: presentation.getSlides().size(),
          masterSlideCount: presentation.getMasters().size(),
          layoutSlideCount: presentation.getLayoutSlides().size(),
          fileName: req.file.originalname,
          fileSize: req.file.size,
          processingTimestamp: new Date().toISOString()
        },
        slideSize: {
          width: presentation.getSlideSize().getSize().getWidth(),
          height: presentation.getSlideSize().getSize().getHeight(),
          type: presentation.getSlideSize().getType().toString(),
          orientation: presentation.getSlideSize().getOrientation().toString()
        },
        documentProperties: {},
        slides: [],
        masterSlides: [],
        layoutSlides: [],
        assets: {
          images: [],
          videos: [],
          audios: [],
          fonts: []
        },
        customProperties: {},
        comments: [],
        animations: [],
        transitions: []
      };
      
      // Extract document properties
      const docProps = presentation.getDocumentProperties();
      presentationData.documentProperties = {
        title: docProps.getTitle() || '',
        author: docProps.getAuthor() || '',
        subject: docProps.getSubject() || '',
        keywords: docProps.getKeywords() || '',
        comments: docProps.getComments() || '',
        category: docProps.getCategory() || '',
        manager: docProps.getManager() || '',
        company: docProps.getCompany() || '',
        createdTime: docProps.getCreatedTime() ? docProps.getCreatedTime().toString() : null,
        lastSavedTime: docProps.getLastSavedTime() ? docProps.getLastSavedTime().toString() : null,
        lastPrintedDate: docProps.getLastPrintedDate() ? docProps.getLastPrintedDate().toString() : null,
        revisionNumber: docProps.getRevisionNumber(),
        totalEditingTime: docProps.getTotalEditingTime()
      };
      
      console.log(`📄 [${requestId}] Processing ${presentationData.metadata.slideCount} slides...`);
      
      // Extract slides
      const slides = presentation.getSlides();
      for (let i = 0; i < slides.size(); i++) {
        const slide = slides.get_Item(i);
        const slideData = {
          index: i,
          name: slide.getName() || `Slide ${i + 1}`,
          hidden: slide.getHidden(),
          shapes: [],
          notes: null,
          comments: [],
          animations: [],
          transitions: {},
          background: {}
        };
        
        // Extract shapes
        const shapes = slide.getShapes();
        console.log(`🔍 [${requestId}] Slide ${i + 1}: ${shapes.size()} shapes`);
        
        for (let j = 0; j < shapes.size(); j++) {
          const shape = shapes.get_Item(j);
          const shapeData = {
            index: j,
            name: shape.getName() || `Shape ${j + 1}`,
            type: shape.getShapeType().toString(),
            position: {
              x: shape.getX(),
              y: shape.getY(),
              width: shape.getWidth(),
              height: shape.getHeight()
            },
            rotation: shape.getRotation(),
            hidden: shape.getHidden(),
            properties: {}
          };
          
          // Extract text content if available
          if (shape.getTextFrame && shape.getTextFrame()) {
            const textFrame = shape.getTextFrame();
            shapeData.textFrame = {
              text: textFrame.getText() || '',
              paragraphs: []
            };
            
            // Extract paragraph information
            const paragraphs = textFrame.getParagraphs();
            for (let k = 0; k < paragraphs.size(); k++) {
              const paragraph = paragraphs.get_Item(k);
              shapeData.textFrame.paragraphs.push({
                text: paragraph.getText() || '',
                alignment: paragraph.getAlignment().toString(),
                indent: paragraph.getIndent(),
                bulletType: paragraph.getBulletType().toString()
              });
            }
          }
          
          slideData.shapes.push(shapeData);
        }
        
        // Extract slide notes
        if (slide.getNotesSlideManager() && slide.getNotesSlideManager().getNotesSlide()) {
          const notesSlide = slide.getNotesSlideManager().getNotesSlide();
          slideData.notes = {
            shapes: []
          };
          
          const notesShapes = notesSlide.getShapes();
          for (let k = 0; k < notesShapes.size(); k++) {
            const notesShape = notesShapes.get_Item(k);
            if (notesShape.getTextFrame && notesShape.getTextFrame()) {
              slideData.notes.shapes.push({
                text: notesShape.getTextFrame().getText() || ''
              });
            }
          }
        }
        
        // Extract animations
        const animationSequence = slide.getTimeline().getMainSequence();
        if (animationSequence) {
          for (let k = 0; k < animationSequence.size(); k++) {
            const effect = animationSequence.get_Item(k);
            slideData.animations.push({
              type: effect.getType().toString(),
              subtype: effect.getSubtype().toString(),
              duration: effect.getTiming().getDuration(),
              delay: effect.getTiming().getDelay()
            });
          }
        }
        
        // Extract slide transition
        const transition = slide.getSlideShowTransition();
        slideData.transitions = {
          type: transition.getType().toString(),
          speed: transition.getSpeed().toString(),
          advanceOnClick: transition.getAdvanceOnClick(),
          advanceAfterTime: transition.getAdvanceAfterTime()
        };
        
        presentationData.slides.push(slideData);
      }
      
      console.log(`✅ [${requestId}] Conversion completed successfully`);
      
      // Clean up temporary file
      fs.unlinkSync(tempFilePath);
      
      // Dispose of presentation object
      presentation.dispose();
      
      const processingTime = Date.now() - startTime;
      
      res.json({
        success: true,
        data: presentationData,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: requestId,
          processingTimeMs: processingTime,
          version: '1.0.0',
          fileInfo: {
            originalName: req.file.originalname,
            size: req.file.size,
            mimeType: req.file.mimetype
          }
        }
      });
      
    } catch (asposeError) {
      console.error(`❌ [${requestId}] Aspose processing error:`, asposeError);
      
      // Clean up temporary file
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
      
      res.status(500).json({
        success: false,
        error: {
          type: 'processing_error',
          code: 'ASPOSE_PROCESSING_ERROR',
          message: 'Failed to process PPTX file with Aspose.Slides',
          details: asposeError.message
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: requestId,
          processingTimeMs: Date.now() - startTime
        }
      });
    }
    
  } catch (error) {
    console.error(`❌ [${requestId}] General error:`, error);
    
    res.status(500).json({
      success: false,
      error: {
        type: 'server_error',
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal server error',
        details: error.message
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: requestId,
        processingTimeMs: Date.now() - startTime
      }
    });
  }
});

// JSON to PPTX conversion endpoint
app.post('/api/v1/json2pptx', async (req, res) => {
  const requestId = `req_${Date.now()}`;
  const startTime = Date.now();
  
  try {
    console.log(`🔄 [${requestId}] Starting JSON to PPTX conversion`);
    
    if (!req.body.presentationData) {
      return res.status(400).json({
        success: false,
        error: {
          type: 'validation_error',
          code: 'NO_PRESENTATION_DATA',
          message: 'No presentation data provided'
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: requestId,
          processingTimeMs: Date.now() - startTime
        }
      });
    }
    
    if (!asposeInitialized) {
      return res.status(500).json({
        success: false,
        error: {
          type: 'server_error',
          code: 'ASPOSE_NOT_INITIALIZED',
          message: 'Aspose.Slides library not initialized'
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: requestId,
          processingTimeMs: Date.now() - startTime
        }
      });
    }
    
    console.log(`📄 [${requestId}] Reconstructing presentation from JSON data`);
    
    const presentationData = req.body.presentationData;
    
    // Create new presentation
    const presentation = new asposeSlides.Presentation();
    
    // Set slide size if provided
    if (presentationData.slideSize) {
      presentation.getSlideSize().setSize(
        presentationData.slideSize.width,
        presentationData.slideSize.height
      );
    }
    
    // Set document properties
    if (presentationData.documentProperties) {
      const docProps = presentation.getDocumentProperties();
      const props = presentationData.documentProperties;
      
      if (props.title) docProps.setTitle(props.title);
      if (props.author) docProps.setAuthor(props.author);
      if (props.subject) docProps.setSubject(props.subject);
      if (props.keywords) docProps.setKeywords(props.keywords);
      if (props.comments) docProps.setComments(props.comments);
      if (props.category) docProps.setCategory(props.category);
      if (props.manager) docProps.setManager(props.manager);
      if (props.company) docProps.setCompany(props.company);
    }
    
    // Clear default slide
    presentation.getSlides().removeAt(0);
    
    // Add slides from JSON data
    if (presentationData.slides) {
      console.log(`📄 [${requestId}] Adding ${presentationData.slides.length} slides`);
      
      for (let i = 0; i < presentationData.slides.length; i++) {
        const slideData = presentationData.slides[i];
        
        // Add new slide
        const slide = presentation.getSlides().addEmptySlide(
          presentation.getLayoutSlides().get_Item(0)
        );
        
        // Set slide properties
        if (slideData.name) slide.setName(slideData.name);
        if (slideData.hidden !== undefined) slide.setHidden(slideData.hidden);
        
        // Add shapes to slide
        if (slideData.shapes) {
          for (let j = 0; j < slideData.shapes.length; j++) {
            const shapeData = slideData.shapes[j];
            
            // Add text shape (simplified - would need more complex logic for other shape types)
            if (shapeData.textFrame && shapeData.textFrame.text) {
              const textBox = slide.getShapes().addAutoShape(
                asposeSlides.ShapeType.Rectangle,
                shapeData.position.x,
                shapeData.position.y,
                shapeData.position.width,
                shapeData.position.height
              );
              
              textBox.getTextFrame().setText(shapeData.textFrame.text);
              
              // Remove shape fill to make it transparent
              textBox.getFillFormat().setFillType(asposeSlides.FillType.NoFill);
              textBox.getLineFormat().getFillFormat().setFillType(asposeSlides.FillType.NoFill);
            }
          }
        }
      }
    }
    
    // Save presentation to temporary file
    const outputPath = path.join(outputDir, `${requestId}_output.pptx`);
    presentation.save(outputPath, asposeSlides.SaveFormat.Pptx);
    
    console.log(`✅ [${requestId}] PPTX reconstruction completed`);
    
    // Read the generated file
    const fileBuffer = fs.readFileSync(outputPath);
    
    // Clean up temporary file
    fs.unlinkSync(outputPath);
    
    // Dispose of presentation object
    presentation.dispose();
    
    const processingTime = Date.now() - startTime;
    
    // Send file as response
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'Content-Disposition': `attachment; filename="reconstructed_${requestId}.pptx"`,
      'Content-Length': fileBuffer.length,
      'X-Processing-Time': processingTime,
      'X-Request-ID': requestId
    });
    
    res.send(fileBuffer);
    
  } catch (error) {
    console.error(`❌ [${requestId}] JSON to PPTX conversion error:`, error);
    
    res.status(500).json({
      success: false,
      error: {
        type: 'processing_error',
        code: 'JSON_TO_PPTX_ERROR',
        message: 'Failed to convert JSON to PPTX',
        details: error.message
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: requestId,
        processingTimeMs: Date.now() - startTime
      }
    });
  }
});

// Thumbnail generation endpoint
app.post('/api/v1/thumbnails', upload.single('file'), async (req, res) => {
  const requestId = `req_${Date.now()}`;
  const startTime = Date.now();
  
  try {
    console.log(`🔄 [${requestId}] Starting thumbnail generation`);
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: {
          type: 'validation_error',
          code: 'NO_FILE_UPLOADED',
          message: 'No PPTX file was uploaded'
        }
      });
    }
    
    if (!asposeInitialized) {
      return res.status(500).json({
        success: false,
        error: {
          type: 'server_error',
          code: 'ASPOSE_NOT_INITIALIZED',
          message: 'Aspose.Slides library not initialized'
        }
      });
    }
    
    // Parse options
    const options = req.body.options ? JSON.parse(req.body.options) : {};
    const format = options.format || 'png';
    const width = options.width || 1920;
    const height = options.height || 1080;
    
    // Save uploaded file temporarily
    const tempFilePath = path.join(uploadsDir, `${requestId}_${req.file.originalname}`);
    fs.writeFileSync(tempFilePath, req.file.buffer);
    
    console.log(`📸 [${requestId}] Generating thumbnails (${width}x${height}, ${format})`);
    
    // Load presentation
    const presentation = new asposeSlides.Presentation(tempFilePath);
    const slides = presentation.getSlides();
    
    const thumbnails = [];
    
    // Generate thumbnails for each slide
    for (let i = 0; i < slides.size(); i++) {
      const slide = slides.get_Item(i);
      
      // Generate thumbnail
      const thumbnail = slide.getThumbnail(width / 96, height / 96); // Convert to scale factor
      
      // Save thumbnail
      const thumbnailPath = path.join(outputDir, `${requestId}_slide_${i + 1}.${format}`);
      thumbnail.save(thumbnailPath, asposeSlides.ImageFormat.Png);
      
      // Read thumbnail file
      const thumbnailBuffer = fs.readFileSync(thumbnailPath);
      
      thumbnails.push({
        slideIndex: i,
        fileName: `slide_${i + 1}.${format}`,
        size: thumbnailBuffer.length,
        width: width,
        height: height,
        format: format,
        base64: thumbnailBuffer.toString('base64')
      });
      
      // Clean up thumbnail file
      fs.unlinkSync(thumbnailPath);
    }
    
    // Clean up
    fs.unlinkSync(tempFilePath);
    presentation.dispose();
    
    console.log(`✅ [${requestId}] Generated ${thumbnails.length} thumbnails`);
    
    res.json({
      success: true,
      data: {
        thumbnails: thumbnails,
        totalCount: thumbnails.length,
        format: format,
        resolution: `${width}x${height}`
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: requestId,
        processingTimeMs: Date.now() - startTime
      }
    });
    
  } catch (error) {
    console.error(`❌ [${requestId}] Thumbnail generation error:`, error);
    
    res.status(500).json({
      success: false,
      error: {
        type: 'processing_error',
        code: 'THUMBNAIL_GENERATION_ERROR',
        message: 'Failed to generate thumbnails',
        details: error.message
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: requestId,
        processingTimeMs: Date.now() - startTime
      }
    });
  }
});

// PDF conversion endpoint
app.post('/api/v1/convertformat', upload.single('file'), async (req, res) => {
  const requestId = `req_${Date.now()}`;
  const startTime = Date.now();
  
  try {
    console.log(`🔄 [${requestId}] Starting format conversion`);
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: {
          type: 'validation_error',
          code: 'NO_FILE_UPLOADED',
          message: 'No PPTX file was uploaded'
        }
      });
    }
    
    if (!asposeInitialized) {
      return res.status(500).json({
        success: false,
        error: {
          type: 'server_error',
          code: 'ASPOSE_NOT_INITIALIZED',
          message: 'Aspose.Slides library not initialized'
        }
      });
    }
    
    // Parse options
    const options = req.body.options ? JSON.parse(req.body.options) : {};
    const outputFormat = options.outputFormat || 'pdf';
    
    // Save uploaded file temporarily
    const tempFilePath = path.join(uploadsDir, `${requestId}_${req.file.originalname}`);
    fs.writeFileSync(tempFilePath, req.file.buffer);
    
    console.log(`📄 [${requestId}] Converting to ${outputFormat.toUpperCase()}`);
    
    // Load presentation
    const presentation = new asposeSlides.Presentation(tempFilePath);
    
    // Set output path
    const outputPath = path.join(outputDir, `${requestId}_output.${outputFormat}`);
    
    // Convert based on format
    switch (outputFormat.toLowerCase()) {
      case 'pdf':
        presentation.save(outputPath, asposeSlides.SaveFormat.Pdf);
        break;
      case 'html':
        presentation.save(outputPath, asposeSlides.SaveFormat.Html);
        break;
      case 'png':
        // Export each slide as PNG
        const slides = presentation.getSlides();
        for (let i = 0; i < slides.size(); i++) {
          const slide = slides.get_Item(i);
          const thumbnail = slide.getThumbnail(1.0, 1.0);
          const slidePath = path.join(outputDir, `${requestId}_slide_${i + 1}.png`);
          thumbnail.save(slidePath, asposeSlides.ImageFormat.Png);
        }
        break;
      default:
        throw new Error(`Unsupported output format: ${outputFormat}`);
    }
    
    // Read the generated file
    const fileBuffer = fs.readFileSync(outputPath);
    
    // Clean up temporary files
    fs.unlinkSync(tempFilePath);
    fs.unlinkSync(outputPath);
    
    // Dispose of presentation object
    presentation.dispose();
    
    console.log(`✅ [${requestId}] Format conversion completed`);
    
    // Determine content type
    const contentTypes = {
      pdf: 'application/pdf',
      html: 'text/html',
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg'
    };
    
    const contentType = contentTypes[outputFormat.toLowerCase()] || 'application/octet-stream';
    
    // Send file as response
    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="converted_${requestId}.${outputFormat}"`,
      'Content-Length': fileBuffer.length,
      'X-Processing-Time': Date.now() - startTime,
      'X-Request-ID': requestId
    });
    
    res.send(fileBuffer);
    
  } catch (error) {
    console.error(`❌ [${requestId}] Format conversion error:`, error);
    
    res.status(500).json({
      success: false,
      error: {
        type: 'processing_error',
        code: 'FORMAT_CONVERSION_ERROR',
        message: 'Failed to convert file format',
        details: error.message
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: requestId,
        processingTimeMs: Date.now() - startTime
      }
    });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Luna Test Server',
    version: '1.0.0',
    description: 'Direct Aspose.Slides Integration Test Server',
    status: 'running',
    aspose: {
      initialized: asposeInitialized,
      error: asposeError ? asposeError.message : null
    },
    endpoints: {
      health: '/api/v1/health',
      pptx2json: '/api/v1/pptx2json',
      json2pptx: '/api/v1/json2pptx',
      thumbnails: '/api/v1/thumbnails',
      convertformat: '/api/v1/convertformat'
    },
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      type: 'not_found',
      code: 'ENDPOINT_NOT_FOUND',
      message: `Endpoint ${req.method} ${req.originalUrl} not found`
    }
  });
});

// Error handler
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  
  res.status(500).json({
    success: false,
    error: {
      type: 'server_error',
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Internal server error',
      details: error.message
    }
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log('🌙 Luna Test Server started!');
  console.log(`📍 Port: ${PORT}`);
  console.log(`🔧 Aspose.Slides: ${asposeInitialized ? '✅ Initialized' : '❌ Failed'}`);
  console.log('');
  console.log('🔗 Available endpoints:');
  console.log(`   Health: http://localhost:${PORT}/api/v1/health`);
  console.log(`   PPTX→JSON: http://localhost:${PORT}/api/v1/pptx2json`);
  console.log(`   JSON→PPTX: http://localhost:${PORT}/api/v1/json2pptx`);
  console.log(`   Thumbnails: http://localhost:${PORT}/api/v1/thumbnails`);
  console.log(`   Convert: http://localhost:${PORT}/api/v1/convertformat`);
  console.log('');
  console.log('✅ Server ready for integration tests!');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed successfully');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed successfully');
    process.exit(0);
  });
});

module.exports = app;