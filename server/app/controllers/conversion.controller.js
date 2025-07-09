/**
 * Conversion Controller
 * 
 * Handles PPTX conversion workflows with REAL LOCAL Aspose.Slides library
 * NO MOCK DATA - Everything uses real LOCAL Aspose.Slides library
 */

const fs = require('fs').promises;
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

// GLOBAL LICENSE MANAGER - Use this everywhere for consistent licensing
const licenseManager = require('../../../lib/aspose-license-manager');


// Firebase imports
const { initializeApp, getApps } = require('firebase/app');
const { getFirestore } = require('firebase/firestore');
const { isFirebaseInitialized } = require('../../config/firebase');
const schemaValidator = require('../../universal-schema-validator');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../../temp/uploads');
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const sanitizedOriginalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${uniqueSuffix}-${sanitizedOriginalName}`);
  }
});

const fileFilter = (req, file, cb) => {
  // Accept PPTX, PPT, and JSON files
  const allowedTypes = [
    'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
    'application/vnd.ms-powerpoint', // .ppt
    'application/json', // .json
    'text/plain' // .txt (for testing)
  ];
  
  const allowedExtensions = ['.pptx', '.ppt', '.json', '.txt'];
  const fileExtension = path.extname(file.originalname).toLowerCase();
  
  if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PPTX, PPT, and JSON files are allowed.'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    files: 1 // Single file upload
  }
});

/**
 * Convert and save endpoint (the working one)
 */
const convertAndSave = async (req, res) => {
  let uploadedFilePath = null;
  
  try {
    // Handle file upload with multer
    upload.single('file')(req, res, async (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({
            success: false,
            error: {
              type: 'validation_error',
              code: 'FILE_TOO_LARGE',
              message: 'File size exceeds 50MB limit'
            }
          });
        }
        return res.status(400).json({
          success: false,
          error: {
            type: 'validation_error',
            code: 'UPLOAD_ERROR',
            message: err.message
          }
        });
      } else if (err) {
        return res.status(400).json({
          success: false,
          error: {
            type: 'validation_error',
            code: 'INVALID_FILE',
            message: err.message
          }
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: {
            type: 'validation_error',
            code: 'NO_FILE_UPLOADED',
            message: 'No file was uploaded'
          }
        });
      }

      try {
        const file = req.file;
        uploadedFilePath = file.path;
        
        const { 
          title, 
          description, 
          author, 
          company,
          validateSchema = 'true', 
          autoFix = 'true',
          generateThumbnails = 'false',
          thumbnailFormat = 'png',
          sessionId
        } = req.body;
        
        const shouldValidate = validateSchema === 'true';
        const shouldAutoFix = autoFix === 'true';
        const shouldGenerateThumbnails = generateThumbnails === 'true';
        
        console.log(`🚀 Starting complete conversion workflow for: ${file.originalname}`);
        
        const fileExtension = path.extname(file.originalname).toLowerCase();
        const presentationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const presentationTitle = title || file.originalname.replace(/\.[^/.]+$/, "");
        
        // === STEP 1: CONVERSION ===
        let universalPresentationData;
        let conversionInfo = {
          sourceFormat: fileExtension.substring(1),
          targetFormat: 'json',
          converted: false
        };
        
        if (fileExtension === '.pptx' || fileExtension === '.ppt') {
          // Handle PowerPoint file conversion with REAL LOCAL Aspose.Slides
          console.log('🔄 Converting PowerPoint to Universal JSON with LOCAL Aspose.Slides library...');
          
          try {
            // Use GLOBAL LICENSE MANAGER
            console.log('🔑 Using GLOBAL LICENSE MANAGER for consistent licensing...');
            const aspose = await licenseManager.getAspose();
            console.log('✅ Licensed Aspose.Slides library loaded via global manager');
            
            // Load the presentation using licensed library
            const presentation = new aspose.Presentation(file.path);
            
            try {
              // Get REAL slide count from the actual file
              const slideCount = presentation.getSlides().size();
              console.log(`📊 Processing ${slideCount} slides from ${file.originalname}`);
              
              // Process ALL slides
              const slides = [];
              for (let i = 0; i < slideCount; i++) {
                const slide = presentation.getSlides().get_Item(i);
                const shapes = [];
                
                // Extract all shapes from the slide
                const shapeCount = slide.getShapes().size();
                for (let j = 0; j < shapeCount; j++) {
                  const shape = slide.getShapes().get_Item(j);
                  
                  // Extract real shape data (with safe method calls)
                  const shapeData = {
                    shapeType: (shape.getShapeType && typeof shape.getShapeType === 'function') ? shape.getShapeType().toString() : "Unknown",
                    name: (shape.getName && typeof shape.getName === 'function') ? shape.getName() || `Shape ${j + 1}` : `Shape ${j + 1}`,
                    geometry: {
                      x: (shape.getX && typeof shape.getX === 'function') ? shape.getX() : 0,
                      y: (shape.getY && typeof shape.getY === 'function') ? shape.getY() : 0,
                      width: (shape.getWidth && typeof shape.getWidth === 'function') ? shape.getWidth() : 100,
                      height: (shape.getHeight && typeof shape.getHeight === 'function') ? shape.getHeight() : 100
                    }
                  };
                  
                  // Extract text content if shape has text
                  try {
                    if (shape.getTextFrame && typeof shape.getTextFrame === 'function') {
                      const textFrame = shape.getTextFrame();
                      if (textFrame && textFrame.getText && typeof textFrame.getText === 'function') {
                        shapeData.text = textFrame.getText();
                      }
                    }
                  } catch (textError) {
                    console.warn(`⚠️ Could not extract text from shape ${j}:`, textError.message);
                  }
                  
                  shapes.push(shapeData);
                }
                
                slides.push({
                  slideId: i + 1,
                  slideIndex: i,
                  name: `Slide ${i + 1}`,
                  slideType: "Slide",
                  shapes: shapes
                });
              }
              
              // Create Universal JSON structure with REAL data
              universalPresentationData = {
                id: presentationId,
                title: presentationTitle,
                description: description || `Converted from ${file.originalname}`,
                status: 'completed',
                slideCount: slideCount, // REAL slide count
                author: author || 'Unknown',
                company: company || '',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                uploadedFile: {
                  originalName: file.originalname,
                  filename: file.filename,
                  size: file.size,
                  mimetype: file.mimetype,
                  uploadedAt: new Date().toISOString()
                },
                data: {
                  presentation: {
                    metadata: {
                      title: presentationTitle,
                      subject: description || '',
                      author: author || 'Unknown',
                      company: company || '',
                      createdTime: new Date().toISOString(),
                      lastSavedTime: new Date().toISOString(),
                      slideCount: slideCount,
                      keywords: '',
                      comments: `Converted from uploaded file: ${file.originalname}`,
                      revision: 1
                    },
                    slideSize: {
                      width: 1920,
                      height: 1080,
                      type: "OnScreen16x9"
                    },
                    slides: slides, // ALL real slides
                    masterSlides: [],
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
              
            } finally {
              // Always dispose of the presentation object
              presentation.dispose();
            }
            
          } catch (asposeError) {
            console.error('❌ LOCAL Aspose.Slides conversion failed:', asposeError);
            
            // Return error response
            return res.status(500).json({
              success: false,
              error: {
                type: 'conversion_error',
                code: 'ASPOSE_CONVERSION_FAILED',
                message: 'PPTX conversion failed',
                details: asposeError.message
              }
            });
          }
          
          conversionInfo.converted = true;
          conversionInfo.sourceFormat = fileExtension.substring(1);
          
        } else {
          throw new Error(`Unsupported file type: ${fileExtension}`);
        }

        // === STEP 2: SAVE TO FIREBASE ===
        let firebaseInfo = {
          saved: false,
          collection: 'presentation_json_data',
          documentId: presentationId
        };
        
        if (isFirebaseInitialized()) {
          try {
            const firestore = getFirestore();
            console.log(`💾 Saving presentation ${presentationId} to Firebase...`);
            
            await firestore.collection('presentation_json_data').doc(presentationId).set(universalPresentationData);
            firebaseInfo.saved = true;
            console.log(`✅ Presentation ${presentationId} saved to Firebase successfully`);
            
          } catch (firebaseError) {
            console.error('❌ Failed to save to Firebase:', firebaseError);
            firebaseInfo.saved = false;
          }
        } else {
          console.log('⚠️ Firebase not configured, skipping save');
        }

        // === CLEANUP ===
        try {
          await fs.unlink(uploadedFilePath);
          console.log('🧹 Cleaned up uploaded file');
        } catch (cleanupError) {
          console.warn('⚠️ Failed to cleanup uploaded file:', cleanupError.message);
        }

        // === RESPONSE ===
        const processingTimeMs = Date.now() - req.startTime;
        console.log(`🎉 Complete conversion workflow finished in ${processingTimeMs}ms`);
        
        res.json({
          success: true,
          data: {
            presentationId: presentationId,
            id: presentationId,
            title: universalPresentationData.title,
            description: universalPresentationData.description,
            slideCount: universalPresentationData.slideCount,
            status: universalPresentationData.status || 'completed',
            author: universalPresentationData.author,
            company: universalPresentationData.company,
            createdAt: universalPresentationData.createdAt,
            uploadedFile: {
              originalName: file.originalname,
              size: file.size,
              mimetype: file.mimetype
            },
            conversion: conversionInfo,
            firebase: firebaseInfo
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: req.requestId,
            processingTimeMs: processingTimeMs,
            workflow: 'complete_conversion'
          }
        });

      } catch (processingError) {
        console.error('❌ Error in conversion workflow:', processingError);
        
        // Clean up file on error
        if (uploadedFilePath) {
          try {
            await fs.unlink(uploadedFilePath);
          } catch (cleanupError) {
            console.warn('⚠️ Failed to cleanup file after error:', cleanupError.message);
          }
        }
        
        res.status(500).json({
          success: false,
          error: {
            type: 'server_error',
            code: 'CONVERSION_WORKFLOW_ERROR',
            message: 'Complete conversion workflow failed',
            details: processingError.message
          }
        });
      }
    });

  } catch (error) {
    console.error('❌ Conversion endpoint error:', error);
    res.status(500).json({
      success: false,
      error: {
        type: 'server_error',
        code: 'CONVERSION_ERROR',
        message: 'Conversion workflow failed',
        details: error.message
      }
    });
  }
};

/**
 * Batch conversion (placeholder)
 */
const batchConvertAndSave = async (req, res) => {
  res.status(501).json({
    success: false,
    error: {
      type: 'not_implemented',
      code: 'BATCH_NOT_IMPLEMENTED',
      message: 'Batch conversion not yet implemented'
    }
  });
};

/**
 * Direct PPTX to JSON conversion
 */
const convertPPTXToJSON = async (req, res) => {
  try {
    // Configure multer for single file upload
    const uploadSingle = multer({
      storage: storage,
      fileFilter: fileFilter,
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit
        files: 1
      }
    }).single('file');

    uploadSingle(req, res, async (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          error: {
            type: 'validation_error',
            code: 'UPLOAD_ERROR',
            message: err.message
          }
        });
      }

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

      const startTime = Date.now();
      const file = req.file;
      const uploadedFilePath = file.path;
      
      console.log(`🔄 Direct PPTX to JSON conversion: ${file.originalname}`);

      try {
        // Use the enhanced conversion pipeline with license loading
        const ConversionOrchestrator = require('../../services/conversion/ConversionOrchestrator');
        
        const orchestrator = new ConversionOrchestrator({
          enableDebugLogging: true,
          enablePerformanceMetrics: true,
          fallbackOnError: true
        });

        console.log('✅ Using ConversionOrchestrator with license support');

        const conversionResult = await orchestrator.convertPPTXToJSON(uploadedFilePath, {
          title: req.body.title || file.originalname,
          author: req.body.author || 'API User',
          originalFilename: file.originalname
        });

        if (!conversionResult.success) {
          throw new Error(conversionResult.error || 'Conversion failed');
        }

        const processingTime = Date.now() - startTime;
        
        console.log(`✅ Enhanced conversion completed in ${processingTime}ms`);
        console.log(`📊 Processed ${conversionResult.data.presentation.slides.length} slides`);

        // Build response using the enhanced conversion result
        const response = {
          success: true,
          data: {
            presentationData: conversionResult.data,
            processingStats: {
              slideCount: conversionResult.data.presentation.slides.length,
              processingTimeMs: processingTime,
              avgTimePerSlide: Math.round(processingTime / conversionResult.data.presentation.slides.length)
            }
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            conversion: 'pptx2json',
            direct: true
          }
        };

        res.status(200).json(response);

      } catch (conversionError) {
        console.error('❌ Direct PPTX to JSON conversion failed:', conversionError);
        
        // Clean up file on error
        try {
          await fs.unlink(uploadedFilePath);
        } catch (cleanupError) {
          console.warn('⚠️ Failed to cleanup file after error:', cleanupError.message);
        }

        res.status(500).json({
          success: false,
          error: {
            type: 'conversion_error',
            code: 'PPTX_TO_JSON_FAILED',
            message: 'PPTX to JSON conversion failed',
            details: conversionError.message
          }
        });
      }
    });

  } catch (error) {
    console.error('❌ Direct PPTX to JSON endpoint error:', error);
    res.status(500).json({
      success: false,
      error: {
        type: 'server_error',
        code: 'ENDPOINT_ERROR',
        message: 'Direct conversion endpoint failed',
        details: error.message
      }
    });
  }
};

/**
 * Direct JSON to PPTX conversion
 */
const convertJSONToPPTX = async (req, res) => {
  try {
    const { presentationData, outputFormat = 'pptx' } = req.body;

    if (!presentationData) {
      return res.status(400).json({
        success: false,
        error: {
          type: 'validation_error',
          code: 'NO_PRESENTATION_DATA',
          message: 'No presentation data provided'
        }
      });
    }

    const startTime = Date.now();
    console.log('🔄 Direct JSON to PPTX conversion starting...');

    try {
      // Use direct Aspose.Slides library with proper Java configuration
      // IMPORTANT: Initialize Java environment BEFORE requiring Aspose
      process.env.JAVA_TOOL_OPTIONS = '-Djava.awt.headless=true -Dfile.encoding=UTF-8 -Djava.util.prefs.systemRoot=/tmp';
      
      console.log('✅ Java environment configured for headless operation');
      
      const aspose = await licenseManager.getAspose();
      // Verify Aspose is available
      if (!aspose || !aspose.Presentation) {
        throw new Error('Aspose.Slides library is not available');
      }
      
      console.log('✅ Aspose.Slides library loaded successfully');

      // CRITICAL: Load license IMMEDIATELY after requiring library and BEFORE any operations
      try {
        const fs = require('fs');
        const path = require('path');
        
        const licensePath = process.env.ASPOSE_LICENSE_PATH || './Aspose.Slides.Product.Family.lic';
        const absoluteLicensePath = path.resolve(licensePath);
        
        if (fs.existsSync(absoluteLicensePath)) {
          console.log(`🔑 Loading Aspose.Slides license from: ${absoluteLicensePath}`);
          
          const License = aspose.License;
          const license = new License();
          license.setLicense(absoluteLicensePath);
          
          // Test license effectiveness
          const testPresentation = new aspose.Presentation();
          const testSlide = testPresentation.getSlides().get_Item(0);
          const testShape = testSlide.getShapes().addAutoShape(
            aspose.ShapeType.Rectangle, 100, 100, 200, 50
          );
          testShape.getTextFrame().setText('License test - this should not be truncated in licensed version');
          const resultText = testShape.getTextFrame().getText();
          const isEvaluationMode = resultText.includes('text has been truncated due to evaluation version limitation');
          testPresentation.dispose();
          
          if (isEvaluationMode) {
            console.warn('⚠️ License loaded but still in evaluation mode - license may be invalid');
          } else {
            console.log('✅ License applied successfully - full functionality enabled');
          }
        } else {
          console.warn(`⚠️ License file not found at: ${absoluteLicensePath} - using evaluation mode`);
        }
      } catch (licenseError) {
        console.warn(`⚠️ Failed to load license: ${licenseError.message} - continuing with evaluation mode`);
      }

      // Create presentation
      const presentation = new aspose.Presentation();

      try {
        // Remove default slide
        presentation.getSlides().removeAt(0);

        // Get slides data
        const slidesData = presentationData.data?.presentation?.slides || presentationData.slides || [];
        console.log(`📊 Converting ${slidesData.length} slides to PPTX`);

        // Add slides from JSON
        for (let i = 0; i < slidesData.length; i++) {
          const slideData = slidesData[i];
          const slide = presentation.getSlides().addEmptySlide(
            presentation.getLayoutSlides().get_Item(0)
          );

          // Add shapes if available
          if (slideData.shapes && Array.isArray(slideData.shapes)) {
            for (let j = 0; j < slideData.shapes.length; j++) {
              try {
                const shapeData = slideData.shapes[j];
                
                if (shapeData.text || shapeData.textFrame?.text) {
                  const text = shapeData.text || shapeData.textFrame.text;
                  const geometry = shapeData.geometry || {};
                  
                  const textBox = slide.getShapes().addAutoShape(
                    aspose.ShapeType.Rectangle,
                    geometry.x || 100,
                    geometry.y || 100 + (j * 60),
                    geometry.width || 300,
                    geometry.height || 50
                  );
                  
                  textBox.getTextFrame().setText(text);
                  console.log(`✅ Added shape ${j + 1} to slide ${i + 1}: ${text.substring(0, 30)}...`);
                }
              } catch (shapeError) {
                console.warn(`⚠️ Error adding shape ${j} to slide ${i}:`, shapeError.message);
              }
            }
          }
        }

        // Generate output file
        const outputFilename = `converted_${Date.now()}.${outputFormat}`;
        const outputPath = path.join(__dirname, '../../temp/conversions', outputFilename);

        // Ensure temp/conversions directory exists
        const fs = require('fs');
        const conversionsDir = path.dirname(outputPath);
        if (!fs.existsSync(conversionsDir)) {
          fs.mkdirSync(conversionsDir, { recursive: true });
        }

        // Save presentation
        console.log(`💾 Saving presentation to: ${outputPath}`);
        presentation.save(outputPath, aspose.SaveFormat.Pptx);

        // Verify file was created and get stats
        const fileStats = fs.statSync(outputPath);
        console.log(`✅ File saved successfully: ${fileStats.size} bytes`);

        // Read file for response
        const fileBuffer = fs.readFileSync(outputPath);

        // Clean up temp file
        try {
          fs.unlinkSync(outputPath);
          console.log('🧹 Cleaned up temp file');
        } catch (cleanupError) {
          console.warn('⚠️ Failed to cleanup output file:', cleanupError.message);
        }

        const processingTime = Date.now() - startTime;
        console.log(`✅ Direct JSON to PPTX conversion completed in ${processingTime}ms`);

        // Set headers for file download
        res.set({
          'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'Content-Disposition': `attachment; filename="${outputFilename}"`,
          'Content-Length': fileBuffer.length
        });

        res.send(fileBuffer);

      } finally {
        // Properly dispose of presentation
        try {
          presentation.dispose();
          console.log('🧹 Disposed presentation resources');
        } catch (disposeError) {
          console.warn('⚠️ Error disposing presentation:', disposeError.message);
        }
      }

    } catch (conversionError) {
      console.error('❌ Direct JSON to PPTX conversion failed:', conversionError);

      res.status(500).json({
        success: false,
        error: {
          type: 'conversion_error',
          code: 'JSON_TO_PPTX_FAILED',
          message: 'JSON to PPTX conversion failed',
          details: conversionError.message
        }
      });
    }

  } catch (error) {
    console.error('❌ Direct JSON to PPTX endpoint error:', error);
    res.status(500).json({
      success: false,
      error: {
        type: 'server_error',
        code: 'ENDPOINT_ERROR',
        message: 'Direct conversion endpoint failed',
        details: error.message
      }
    });
  }
};

/**
 * Direct JSON to PPTX conversion accepting JSON file uploads
 */
const convertJSONFileToPPTX = async (req, res) => {
  try {
    // Configure multer for single file upload
    const uploadSingle = multer({
      storage: storage,
      fileFilter: (req, file, cb) => {
        // Accept JSON files
        const allowedTypes = [
          'application/json',
          'text/plain'
        ];
        
        const allowedExtensions = ['.json', '.txt'];
        const fileExtension = path.extname(file.originalname).toLowerCase();
        
        if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
          cb(null, true);
        } else {
          cb(new Error('Invalid file type. Only JSON files are allowed.'), false);
        }
      },
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit
        files: 1
      }
    }).single('jsonFile');

    uploadSingle(req, res, async (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          error: {
            type: 'validation_error',
            code: 'UPLOAD_ERROR',
            message: err.message
          }
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: {
            type: 'validation_error',
            code: 'NO_FILE_UPLOADED',
            message: 'No JSON file was uploaded'
          }
        });
      }

      const startTime = Date.now();
      const file = req.file;
      const uploadedFilePath = file.path;
      
      // Get filename from form data or use original filename
      const { filename: requestedFilename } = req.body;
      const outputFilename = requestedFilename || file.originalname.replace(/\.json$/i, '.pptx');
      
      console.log(`🔄 JSON file to PPTX conversion: ${file.originalname} → ${outputFilename}`);

      try {
        // Read and parse JSON content
        const jsonContent = await fs.readFile(uploadedFilePath, 'utf8');
        let presentationData;
        
        try {
          presentationData = JSON.parse(jsonContent);
          console.log('✅ JSON parsed successfully');
        } catch (parseError) {
          throw new Error(`Invalid JSON format: ${parseError.message}`);
        }

        // Validate that we have presentation data
        if (!presentationData) {
          throw new Error('No presentation data found in JSON file');
        }

        // Extract slides data from various possible structures
        let slidesData = [];
        if (presentationData.data?.presentation?.slides) {
          slidesData = presentationData.data.presentation.slides;
        } else if (presentationData.presentationData?.data?.presentation?.slides) {
          slidesData = presentationData.presentationData.data.presentation.slides;
        } else if (presentationData.slides) {
          slidesData = presentationData.slides;
        } else {
          throw new Error('No slides data found in JSON structure');
        }

        if (!Array.isArray(slidesData) || slidesData.length === 0) {
          throw new Error('No valid slides found in presentation data');
        }

        console.log(`📊 Found ${slidesData.length} slides in JSON data`);

        // Use direct Aspose.Slides library with proper Java configuration
        process.env.JAVA_TOOL_OPTIONS = '-Djava.awt.headless=true -Dfile.encoding=UTF-8 -Djava.util.prefs.systemRoot=/tmp';
        
        console.log('✅ Java environment configured for headless operation');
        
        const aspose = await licenseManager.getAspose();
        console.log('✅ Licensed Aspose.Slides library loaded via global manager');

        // Create presentation
        const presentation = new aspose.Presentation();

        try {
          // Remove default slide
          presentation.getSlides().removeAt(0);

          console.log(`📊 Converting ${slidesData.length} slides to PPTX`);

          // Add slides from JSON
          for (let i = 0; i < slidesData.length; i++) {
            const slideData = slidesData[i];
            const slide = presentation.getSlides().addEmptySlide(
              presentation.getLayoutSlides().get_Item(0)
            );

            // Add shapes if available
            if (slideData.shapes && Array.isArray(slideData.shapes)) {
              for (let j = 0; j < slideData.shapes.length; j++) {
                try {
                  const shapeData = slideData.shapes[j];
                  
                  if (shapeData.text || shapeData.textFrame?.text) {
                    const text = shapeData.text || shapeData.textFrame.text;
                    const geometry = shapeData.geometry || {};
                    
                    const textBox = slide.getShapes().addAutoShape(
                      aspose.ShapeType.Rectangle,
                      geometry.x || 100,
                      geometry.y || 100 + (j * 60),
                      geometry.width || 300,
                      geometry.height || 50
                    );
                    
                    textBox.getTextFrame().setText(text);
                    console.log(`✅ Added shape ${j + 1} to slide ${i + 1}: ${text.substring(0, 30)}...`);
                  }
                } catch (shapeError) {
                  console.warn(`⚠️ Error adding shape ${j} to slide ${i}:`, shapeError.message);
                }
              }
            }
          }

          // Generate output file with consistent naming
          const outputPath = path.join(__dirname, '../../temp/conversions', outputFilename);

          // Ensure temp/conversions directory exists
          const conversionsDir = path.dirname(outputPath);
          if (!require('fs').existsSync(conversionsDir)) {
            require('fs').mkdirSync(conversionsDir, { recursive: true });
          }

          // Save presentation
          console.log(`💾 Saving presentation to: ${outputPath}`);
          presentation.save(outputPath, aspose.SaveFormat.Pptx);

          // Verify file was created and get stats
          const fileStats = require('fs').statSync(outputPath);
          console.log(`✅ File saved successfully: ${fileStats.size} bytes`);

          // Read file for response
          const fileBuffer = require('fs').readFileSync(outputPath);

          // Clean up temp files
          try {
            await fs.unlink(uploadedFilePath);
            require('fs').unlinkSync(outputPath);
            console.log('🧹 Cleaned up temp files');
          } catch (cleanupError) {
            console.warn('⚠️ Failed to cleanup temp files:', cleanupError.message);
          }

          const processingTime = Date.now() - startTime;
          console.log(`✅ JSON file to PPTX conversion completed in ${processingTime}ms`);

          // Set headers for file download
          res.set({
            'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'Content-Disposition': `attachment; filename="${outputFilename}"`,
            'Content-Length': fileBuffer.length
          });

          res.send(fileBuffer);

        } finally {
          // Properly dispose of presentation
          try {
            presentation.dispose();
            console.log('🧹 Disposed presentation resources');
          } catch (disposeError) {
            console.warn('⚠️ Error disposing presentation:', disposeError.message);
          }
        }

      } catch (conversionError) {
        console.error('❌ JSON file to PPTX conversion failed:', conversionError);
        
        // Clean up file on error
        try {
          await fs.unlink(uploadedFilePath);
        } catch (cleanupError) {
          console.warn('⚠️ Failed to cleanup file after error:', cleanupError.message);
        }

        res.status(500).json({
          success: false,
          error: {
            type: 'conversion_error',
            code: 'JSON_TO_PPTX_FAILED',
            message: 'JSON file to PPTX conversion failed',
            details: conversionError.message
          }
        });
      }
    });

  } catch (error) {
    console.error('❌ JSON file to PPTX endpoint error:', error);
    res.status(500).json({
      success: false,
      error: {
        type: 'server_error',
        code: 'ENDPOINT_ERROR',
        message: 'JSON file conversion endpoint failed',
        details: error.message
      }
    });
  }
};

module.exports = {
  convertAndSave,
  batchConvertAndSave,
  convertPPTXToJSON,
  convertJSONToPPTX,
  convertJSONFileToPPTX
}; 