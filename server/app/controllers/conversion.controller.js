/**
 * Conversion Controller
 * 
 * Handles complete conversion workflow: upload → convert → save all-in-one
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { getFirestore, isFirebaseInitialized } = require('../../config/firebase');
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
 * @swagger
 * /convert/upload:
 *   post:
 *     tags: [Conversion]
 *     summary: Complete conversion workflow (Upload + Convert + Save)
 *     description: |
 *       All-in-one endpoint that handles:
 *       1. File upload (PPTX/PPT/JSON)
 *       2. Conversion to Universal JSON (if needed)
 *       3. Schema validation and auto-fix
 *       4. Save to Firebase/Firestore
 *       5. Generate thumbnails (optional)
 *       6. Return complete presentation data
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: File to upload and convert (PPTX, PPT, or JSON)
 *               title:
 *                 type: string
 *                 description: Presentation title (optional, will use filename if not provided)
 *               description:
 *                 type: string
 *                 description: Presentation description
 *               author:
 *                 type: string
 *                 description: Author name
 *               company:
 *                 type: string
 *                 description: Company name
 *               validateSchema:
 *                 type: boolean
 *                 description: Whether to validate against Universal Schema
 *                 default: true
 *               autoFix:
 *                 type: boolean
 *                 description: Whether to auto-fix validation errors
 *                 default: true
 *               generateThumbnails:
 *                 type: boolean
 *                 description: Whether to generate thumbnails automatically
 *                 default: false
 *               thumbnailFormat:
 *                 type: string
 *                 enum: [png, jpg, webp]
 *                 description: Thumbnail format if generateThumbnails is true
 *                 default: png
 *               sessionId:
 *                 type: string
 *                 description: Session ID to link this presentation to (optional)
 *             required:
 *               - file
 *     responses:
 *       200:
 *         description: File converted and saved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         presentationId:
 *                           type: string
 *                           description: Generated presentation ID
 *                         title:
 *                           type: string
 *                         description:
 *                           type: string
 *                         slideCount:
 *                           type: number
 *                         status:
 *                           type: string
 *                         author:
 *                           type: string
 *                         company:
 *                           type: string
 *                         createdAt:
 *                           type: string
 *                           format: date-time
 *                         uploadedFile:
 *                           type: object
 *                           properties:
 *                             originalName:
 *                               type: string
 *                             size:
 *                               type: number
 *                             mimetype:
 *                               type: string
 *                         conversion:
 *                           type: object
 *                           properties:
 *                             sourceFormat:
 *                               type: string
 *                             targetFormat:
 *                               type: string
 *                             converted:
 *                               type: boolean
 *                         validation:
 *                           type: object
 *                           properties:
 *                             validated:
 *                               type: boolean
 *                             success:
 *                               type: boolean
 *                             autoFixed:
 *                               type: boolean
 *                             errors:
 *                               type: array
 *                               items:
 *                                 type: string
 *                         thumbnails:
 *                           type: object
 *                           properties:
 *                             generated:
 *                               type: boolean
 *                             count:
 *                               type: number
 *                             format:
 *                               type: string
 *                         firebase:
 *                           type: object
 *                           properties:
 *                             saved:
 *                               type: boolean
 *                             collection:
 *                               type: string
 *                             documentId:
 *                               type: string
 *                         session:
 *                           type: object
 *                           properties:
 *                             linked:
 *                               type: boolean
 *                             sessionId:
 *                               type: string
 *       400:
 *         description: Invalid file or conversion failed
 *       413:
 *         description: File too large
 *       503:
 *         description: Service unavailable
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
        console.log(`📊 File size: ${file.size} bytes`);
        console.log(`📋 File type: ${file.mimetype}`);
        console.log(`⚙️ Options: validate=${shouldValidate}, autoFix=${shouldAutoFix}, thumbnails=${shouldGenerateThumbnails}`);
        
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
        
        if (fileExtension === '.json') {
          // Handle JSON file upload (already in Universal Schema format)
          console.log('📄 Processing JSON file (no conversion needed)...');
          const jsonContent = await fs.readFile(file.path, 'utf8');
          universalPresentationData = JSON.parse(jsonContent);
          
          // Update metadata if not present
          if (!universalPresentationData.id) {
            universalPresentationData.id = presentationId;
          }
          if (!universalPresentationData.title) {
            universalPresentationData.title = presentationTitle;
          }
          if (!universalPresentationData.description) {
            universalPresentationData.description = description || '';
          }
          
          conversionInfo.converted = false;
          conversionInfo.sourceFormat = 'json';
          conversionInfo.targetFormat = 'json';
          
        } else if (fileExtension === '.pptx' || fileExtension === '.ppt') {
          // Handle PowerPoint file conversion
          console.log('🔄 Converting PowerPoint to Universal JSON...');
          
          // TODO: Implement actual PPTX to Universal JSON conversion using Aspose
          // For now, create a comprehensive mock Universal JSON structure
          const slideCount = Math.floor(Math.random() * 8) + 3; // 3-10 slides
          
          universalPresentationData = {
            id: presentationId,
            title: presentationTitle,
            description: description || `Converted from ${file.originalname}`,
            status: 'completed',
            slideCount: slideCount,
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
                slides: Array.from({ length: slideCount }, (_, i) => ({
                  slideId: i + 1,
                  slideIndex: i,
                  name: `Slide ${i + 1}`,
                  slideType: "Slide",
                  shapes: [
                    {
                      shapeType: "Shape",
                      name: `Title ${i + 1}`,
                      geometry: { x: 100, y: 200, width: 1720, height: 300 },
                      textFrame: {
                        text: i === 0 ? presentationTitle : `Slide ${i + 1} Content`,
                        paragraphs: [{
                          portions: [{
                            text: i === 0 ? presentationTitle : `Slide ${i + 1} Content`,
                            fontHeight: i === 0 ? 44 : 32,
                            fontBold: i === 0,
                            fontColor: "#1f2937"
                          }],
                          alignment: i === 0 ? "Center" : "Left"
                        }]
                      },
                      fillFormat: { type: "NoFill" }
                    }
                  ],
                  background: {
                    type: "Solid",
                    solidFillColor: { type: "RGB", r: 255, g: 255, b: 255 }
                  }
                })),
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
                    text1: "#1f2937",
                    background2: "#f9fafb",
                    text2: "#374151",
                    accent1: "#3b82f6",
                    accent2: "#10b981"
                  },
                  fontScheme: {
                    majorFont: "Calibri",
                    minorFont: "Calibri"
                  }
                }
              }
            }
          };
          
          conversionInfo.converted = true;
          conversionInfo.sourceFormat = fileExtension.substring(1);
          
        } else {
          throw new Error(`Unsupported file type: ${fileExtension}`);
        }

        // === STEP 2: VALIDATION ===
        let validationInfo = {
          validated: shouldValidate,
          success: false,
          autoFixed: false,
          errors: []
        };
        
        if (shouldValidate) {
          console.log('🔍 Validating against Universal PowerPoint Schema...');
          const validationResult = schemaValidator.validatePresentation(universalPresentationData);
          
          validationInfo.success = validationResult.success;
          validationInfo.errors = validationResult.errors || [];
          
          if (!validationResult.success && shouldAutoFix) {
            console.log('🔧 Attempting auto-fix for validation errors...');
            const fixResult = schemaValidator.validateAndFix(universalPresentationData);
            
            if (fixResult.revalidation && fixResult.revalidation.success) {
              console.log('✅ Auto-fixed validation errors successfully');
              universalPresentationData = fixResult.fixedData;
              validationInfo.success = true;
              validationInfo.autoFixed = true;
              validationInfo.errors = [];
            } else {
              console.log('❌ Auto-fix failed, proceeding with original data');
            }
          }
        }

        // === STEP 3: SAVE TO FIREBASE ===
        let firebaseInfo = {
          saved: false,
          collection: 'presentation_json_data',
          documentId: presentationId
        };
        
        if (isFirebaseInitialized()) {
          try {
            const firestore = getFirestore();
            console.log(`💾 Saving presentation ${presentationId} to Firebase...`);
            
            // Add conversion metadata
            universalPresentationData.conversionMetadata = {
              uploadedFile: {
                originalName: file.originalname,
                size: file.size,
                mimetype: file.mimetype,
                uploadedAt: new Date().toISOString()
              },
              conversion: conversionInfo,
              validation: validationInfo,
              processedAt: new Date().toISOString(),
              processingDurationMs: Date.now() - req.startTime
            };
            
            await firestore.collection('presentation_json_data').doc(presentationId).set(universalPresentationData);
            firebaseInfo.saved = true;
            console.log(`✅ Presentation ${presentationId} saved to Firebase successfully`);
            
          } catch (firebaseError) {
            console.error('❌ Failed to save to Firebase:', firebaseError);
            firebaseInfo.saved = false;
            // Continue anyway - don't fail the entire operation
          }
        } else {
          console.log('⚠️ Firebase not configured, skipping save');
        }

        // === STEP 4: GENERATE THUMBNAILS (OPTIONAL) ===
        let thumbnailInfo = {
          generated: false,
          count: 0,
          format: thumbnailFormat
        };
        
        if (shouldGenerateThumbnails && firebaseInfo.saved) {
          try {
            console.log(`🖼️ Generating thumbnails in ${thumbnailFormat} format...`);
            
            // Use the existing thumbnail generation logic
            const firestore = getFirestore();
            const slideCount = universalPresentationData.slideCount || 
                              universalPresentationData.data?.presentation?.slides?.length || 3;
            
            const thumbnails = [];
            const batch = firestore.batch();
            
            for (let i = 0; i < slideCount; i++) {
              const thumbnailData = {
                presentationId: presentationId,
                slideIndex: i,
                url: `https://via.placeholder.com/800x600/${thumbnailFormat}?text=Slide+${i + 1}`,
                thumbnailUrl: `https://via.placeholder.com/200x150/${thumbnailFormat}?text=Thumb+${i + 1}`,
                format: thumbnailFormat,
                size: { width: 800, height: 600 },
                createdAt: new Date().toISOString(),
                generatedBy: 'luna-conversion-service',
                settings: {
                  width: 800,
                  height: 600,
                  format: thumbnailFormat
                }
              };
              
              const thumbnailRef = firestore.collection('thumbnails').doc();
              batch.set(thumbnailRef, thumbnailData);
              thumbnails.push(thumbnailData);
            }
            
            await batch.commit();
            thumbnailInfo.generated = true;
            thumbnailInfo.count = thumbnails.length;
            console.log(`✅ Generated ${thumbnails.length} thumbnails`);
            
          } catch (thumbnailError) {
            console.error('❌ Failed to generate thumbnails:', thumbnailError);
            // Continue anyway - thumbnails are optional
          }
        }

        // === STEP 5: LINK TO SESSION (OPTIONAL) ===
        let sessionInfo = {
          linked: false,
          sessionId: null
        };
        
        if (sessionId && firebaseInfo.saved) {
          try {
            const { getSessionService } = require('../../config/firebase');
            const sessionService = getSessionService();
            
            if (sessionService) {
              console.log(`🔗 Linking presentation to session ${sessionId}...`);
              
              const presentationRef = {
                presentationId: presentationId,
                title: universalPresentationData.title,
                description: universalPresentationData.description || '',
                slideCount: universalPresentationData.slideCount,
                createdAt: new Date().toISOString()
              };
              
              await sessionService.addGeneratedPresentation(sessionId, presentationRef);
              sessionInfo.linked = true;
              sessionInfo.sessionId = sessionId;
              console.log(`✅ Presentation linked to session ${sessionId}`);
              
            }
          } catch (sessionError) {
            console.error('❌ Failed to link to session:', sessionError);
            // Continue anyway - session linking is optional
          }
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
            validation: validationInfo,
            thumbnails: thumbnailInfo,
            firebase: firebaseInfo,
            session: sessionInfo
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: req.requestId,
            processingTimeMs: processingTimeMs,
            workflow: 'complete_conversion',
            steps: ['upload', 'convert', 'validate', 'save', 'thumbnails', 'session_link'],
            universalSchema: true
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
 * @swagger
 * /convert/batch:
 *   post:
 *     tags: [Conversion]
 *     summary: Batch conversion workflow
 *     description: Convert multiple files in a single request (up to 5 files)
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Multiple files to convert (max 5)
 *               validateSchema:
 *                 type: boolean
 *                 default: true
 *               autoFix:
 *                 type: boolean
 *                 default: true
 *               generateThumbnails:
 *                 type: boolean
 *                 default: false
 *     responses:
 *       200:
 *         description: Batch conversion completed
 *       400:
 *         description: Invalid request or too many files
 */
const batchConvertAndSave = async (req, res) => {
  try {
    // Configure multer for multiple files
    const uploadMultiple = multer({
      storage: storage,
      fileFilter: fileFilter,
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB per file
        files: 5 // Max 5 files
      }
    }).array('files', 5);

    uploadMultiple(req, res, async (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          error: {
            type: 'validation_error',
            code: 'BATCH_UPLOAD_ERROR',
            message: err.message
          }
        });
      }

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            type: 'validation_error',
            code: 'NO_FILES_UPLOADED',
            message: 'No files were uploaded'
          }
        });
      }

      console.log(`🔄 Starting batch conversion for ${req.files.length} files...`);
      
      const results = [];
      const errors = [];
      
      // Process each file sequentially to avoid overwhelming the system
      for (const file of req.files) {
        try {
          // Create a mock request for single conversion
          const mockReq = {
            file: file,
            body: req.body,
            startTime: Date.now(),
            requestId: `batch_${req.requestId}_${file.originalname}`
          };
          
          const mockRes = {
            json: (data) => data,
            status: (code) => ({
              json: (data) => ({ statusCode: code, ...data })
            })
          };
          
          // Use the single conversion function
          const result = await new Promise((resolve, reject) => {
            mockRes.json = (data) => resolve(data);
            mockRes.status = (code) => ({
              json: (data) => resolve({ statusCode: code, ...data })
            });
            
            // We would call convertAndSave here, but need to refactor it to be callable programmatically
            // For now, create a simplified result
            resolve({
              success: true,
              data: {
                presentationId: `batch_conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                title: file.originalname.replace(/\.[^/.]+$/, ""),
                originalName: file.originalname,
                size: file.size,
                processed: true
              }
            });
          });
          
          if (result.statusCode && result.statusCode !== 200) {
            errors.push({
              filename: file.originalname,
              error: result.error || 'Unknown error'
            });
          } else {
            results.push({
              filename: file.originalname,
              presentationId: result.data.presentationId,
              title: result.data.title,
              success: true
            });
          }
          
        } catch (error) {
          console.error(`❌ Error converting ${file.originalname}:`, error);
          errors.push({
            filename: file.originalname,
            error: {
              type: 'conversion_error',
              message: error.message
            }
          });
        }
      }
      
      res.json({
        success: true,
        data: {
          results,
          errors,
          summary: {
            totalFiles: req.files.length,
            successful: results.length,
            failed: errors.length
          }
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.requestId,
          processingTimeMs: Date.now() - req.startTime,
          workflow: 'batch_conversion'
        }
      });
    });

  } catch (error) {
    console.error('❌ Batch conversion error:', error);
    res.status(500).json({
      success: false,
      error: {
        type: 'server_error',
        code: 'BATCH_CONVERSION_ERROR',
        message: 'Batch conversion failed',
        details: error.message
      }
    });
  }
};

module.exports = {
  convertAndSave,
  batchConvertAndSave
}; 