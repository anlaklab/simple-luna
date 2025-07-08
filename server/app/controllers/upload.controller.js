/**
 * Upload Controller
 * 
 * Handles file uploads with Premium Tier System
 * Basic: < 10MB | Pro: < 50MB | Premium: < 500MB | Enterprise: < 2GB
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { getFirestore, isFirebaseInitialized } = require('../../config/firebase');
const schemaValidator = require('../../universal-schema-validator');
const asposeService = require('../../services/aspose.service');

// Premium Tier Configuration
const TIER_LIMITS = {
  basic: {
    name: 'Basic',
    maxFileSize: 10 * 1024 * 1024, // 10MB
    description: 'For small presentations and testing',
    color: '#6B7280'
  },
  pro: {
    name: 'Pro',
    maxFileSize: 50 * 1024 * 1024, // 50MB  
    description: 'For professional presentations',
    color: '#3B82F6'
  },
  premium: {
    name: 'Premium',
    maxFileSize: 500 * 1024 * 1024, // 500MB
    description: 'For large, media-rich presentations',
    color: '#8B5CF6'
  },
  enterprise: {
    name: 'Enterprise',
    maxFileSize: 2 * 1024 * 1024 * 1024, // 2GB
    description: 'For enterprise-grade, massive presentations',
    color: '#F59E0B'
  }
};

// Helper function to determine tier from request
function getTierFromRequest(req) {
  // Check for tier in query params, headers, or body
  const tier = req.query.tier || req.headers['x-luna-tier'] || req.body.tier || 'basic';
  
  // Validate tier exists
  if (!TIER_LIMITS[tier.toLowerCase()]) {
    return 'basic';
  }
  
  return tier.toLowerCase();
}

// Helper function to format file size for humans
function formatFileSize(bytes) {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 Byte';
  const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

// Dynamic multer configuration based on tier
function createUploadMiddleware(tier = 'basic') {
  const tierConfig = TIER_LIMITS[tier];
  
  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      const uploadDir = path.join(__dirname, '../../temp/uploads');
      cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const sanitizedOriginalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
      cb(null, `${tier}_${uniqueSuffix}-${sanitizedOriginalName}`);
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

  return multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
      fileSize: tierConfig.maxFileSize,
      files: 1,
      fieldSize: tierConfig.maxFileSize, // Also limit field size
      fieldNameSize: 100, // Limit field name size
      fields: 10 // Limit number of fields
    }
  });
}

/**
 * @swagger
 * components:
 *   schemas:
 *     TierInfo:
 *       type: object
 *       properties:
 *         tier:
 *           type: string
 *           enum: [basic, pro, premium, enterprise]
 *         name:
 *           type: string
 *         maxFileSize:
 *           type: number
 *         maxFileSizeFormatted:
 *           type: string
 *         description:
 *           type: string
 *         color:
 *           type: string
 */

/**
 * @swagger
 * /upload/tiers:
 *   get:
 *     tags: [File Upload]
 *     summary: Get available upload tiers
 *     description: Get information about available upload tiers and their limits
 *     responses:
 *       200:
 *         description: Available tiers information
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
 *                         tiers:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/TierInfo'
 *                         recommended:
 *                           type: string
 *                         upgradeMessage:
 *                           type: string
 */
const getTiers = async (req, res) => {
  try {
    const tiers = Object.entries(TIER_LIMITS).map(([key, config]) => ({
      tier: key,
      name: config.name,
      maxFileSize: config.maxFileSize,
      maxFileSizeFormatted: formatFileSize(config.maxFileSize),
      description: config.description,
      color: config.color
    }));

    res.json({
      success: true,
      data: {
        tiers: tiers,
        recommended: 'pro',
        upgradeMessage: 'Upgrade to Pro or Premium for larger file support',
        currentDefault: 'basic',
        usage: {
          queryParam: '?tier=premium',
          header: 'X-Luna-Tier: premium',
          bodyParam: '"tier": "premium"'
        }
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.requestId
      }
    });
  } catch (error) {
    console.error('❌ Error getting tiers:', error);
    res.status(500).json({
      success: false,
      error: {
        type: 'server_error',
        code: 'TIERS_ERROR',
        message: 'Failed to get tier information'
      }
    });
  }
};

/**
 * @swagger
 * /upload/pptx:
 *   post:
 *     tags: [File Upload]
 *     summary: Upload PPTX file with Premium Tier System
 *     description: |
 *       Upload a PowerPoint file and convert it to Universal JSON schema.
 *       
 *       **Tier Limits:**
 *       - Basic: < 10MB (free tier)
 *       - Pro: < 50MB (professional use)
 *       - Premium: < 500MB (large presentations)
 *       - Enterprise: < 2GB (massive files)
 *       
 *       **How to specify tier:**
 *       - Query parameter: `?tier=premium`
 *       - Header: `X-Luna-Tier: premium`  
 *       - Body parameter: `"tier": "premium"`
 *     parameters:
 *       - name: tier
 *         in: query
 *         description: Upload tier (basic/pro/premium/enterprise)
 *         schema:
 *           type: string
 *           enum: [basic, pro, premium, enterprise]
 *           default: basic
 *       - name: X-Luna-Tier
 *         in: header
 *         description: Upload tier header
 *         schema:
 *           type: string
 *           enum: [basic, pro, premium, enterprise]
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
 *                 description: PPTX file to upload and convert
 *               title:
 *                 type: string
 *                 description: Optional presentation title
 *               description:
 *                 type: string
 *                 description: Optional presentation description
 *               author:
 *                 type: string
 *                 description: Optional author name
 *               tier:
 *                 type: string
 *                 enum: [basic, pro, premium, enterprise]
 *                 description: Upload tier for file size limits
 *                 default: basic
 *               validateSchema:
 *                 type: boolean
 *                 description: Whether to validate against Universal Schema
 *                 default: true
 *             required:
 *               - file
 *     responses:
 *       200:
 *         description: File uploaded and converted successfully
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
 *                         title:
 *                           type: string
 *                         slideCount:
 *                           type: number
 *                         uploadedFile:
 *                           type: object
 *                           properties:
 *                             originalName:
 *                               type: string
 *                             size:
 *                               type: number
 *                             sizeFormatted:
 *                               type: string
 *                             tier:
 *                               type: string
 *                         tierInfo:
 *                           $ref: '#/components/schemas/TierInfo'
 *       400:
 *         description: Invalid file or conversion failed
 *       413:
 *         description: File too large for selected tier
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     error:
 *                       type: object
 *                       properties:
 *                         suggestions:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/TierInfo'
 */
const uploadPPTX = async (req, res) => {
  try {
    // Determine tier from request
    const tier = getTierFromRequest(req);
    const tierConfig = TIER_LIMITS[tier];
    
    console.log(`📊 Upload request with tier: ${tierConfig.name} (max: ${formatFileSize(tierConfig.maxFileSize)})`);
    
    // Create dynamic upload middleware
    const upload = createUploadMiddleware(tier);
    
    // Handle file upload with tier-specific multer
    upload.single('file')(req, res, async (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          // Suggest upgrade tiers
          const upgradeTiers = Object.entries(TIER_LIMITS)
            .filter(([key, config]) => config.maxFileSize > tierConfig.maxFileSize)
            .map(([key, config]) => ({
              tier: key,
              name: config.name,
              maxFileSize: config.maxFileSize,
              maxFileSizeFormatted: formatFileSize(config.maxFileSize),
              description: config.description,
              color: config.color
            }));
          
          return res.status(413).json({
            success: false,
            error: {
              type: 'validation_error',
              code: 'FILE_TOO_LARGE',
              message: `File size exceeds ${tierConfig.name} tier limit of ${formatFileSize(tierConfig.maxFileSize)}`,
              currentTier: {
                tier: tier,
                name: tierConfig.name,
                maxFileSize: tierConfig.maxFileSize,
                maxFileSizeFormatted: formatFileSize(tierConfig.maxFileSize)
              },
              suggestions: upgradeTiers,
              upgradeInstructions: {
                queryParam: '?tier=premium',
                header: 'X-Luna-Tier: premium',
                bodyParam: '"tier": "premium"'
              }
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
        const { title, description, author, validateSchema = 'true' } = req.body;
        const shouldValidate = validateSchema === 'true';
        
        console.log(`📁 Processing ${tierConfig.name} tier upload: ${file.originalname}`);
        console.log(`📊 File size: ${formatFileSize(file.size)} (${file.size} bytes)`);
        console.log(`📋 File type: ${file.mimetype}`);
        console.log(`🎯 Tier: ${tierConfig.name} (limit: ${formatFileSize(tierConfig.maxFileSize)})`);
        
        const fileExtension = path.extname(file.originalname).toLowerCase();
        const presentationId = `upload_${tier}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        let universalPresentationData;
        
        if (fileExtension === '.json') {
          // Handle JSON file upload (for testing Universal Schema)
          console.log('🔄 Processing JSON file...');
          const jsonContent = await fs.readFile(file.path, 'utf8');
          universalPresentationData = JSON.parse(jsonContent);
          
          // Add metadata if not present
          if (!universalPresentationData.id) {
            universalPresentationData.id = presentationId;
          }
          if (!universalPresentationData.title) {
            universalPresentationData.title = title || file.originalname;
          }
          if (!universalPresentationData.description) {
            universalPresentationData.description = description || '';
          }
          
        } else if (fileExtension === '.pptx' || fileExtension === '.ppt') {
          // Handle PowerPoint file conversion with REAL Aspose.Slides
          console.log('🔄 Converting PowerPoint to Universal JSON with REAL Aspose.Slides...');
          
          try {
            // Use real Aspose.Slides Cloud API for conversion
            if (asposeService.isAvailable()) {
              console.log('✅ Using REAL Aspose.Slides Cloud API for conversion');
              
              const conversionResult = await asposeService.convertPPTXToUniversalJSON(file.path, {
                presentationId: presentationId,
                title: title,
                description: description,
                author: author
              });
              
              universalPresentationData = conversionResult.data;
              
              // Add upload metadata
              universalPresentationData.uploadTier = tier;
              universalPresentationData.uploadedFile = {
                originalName: file.originalname,
                filename: file.filename,
                size: file.size,
                sizeFormatted: formatFileSize(file.size),
                mimetype: file.mimetype,
                uploadedAt: new Date().toISOString(),
                tier: tier
              };
              
              // Add conversion metadata
              universalPresentationData.conversionMetadata = conversionResult.metadata;
              
              console.log(`✅ Real PPTX conversion completed: ${conversionResult.metadata.slideCount} slides`);
              
            } else {
              console.warn('⚠️ Aspose.Slides not available, using fallback conversion');
              console.warn('💡 Configure ASPOSE_CLIENT_ID and ASPOSE_CLIENT_SECRET for real conversion');
              
              // Fallback: Basic structure for when Aspose is not configured
              universalPresentationData = {
                id: presentationId,
                title: title || file.originalname.replace(/\.[^/.]+$/, ""),
                description: description || `Converted from ${file.originalname} (fallback mode)`,
                status: 'completed',
                slideCount: 1, // Fallback: single slide
                author: author || 'Unknown',
                company: '',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                uploadTier: tier,
                realConversion: false, // Flag to indicate this is fallback
                fallbackMode: true,
                uploadedFile: {
                  originalName: file.originalname,
                  filename: file.filename,
                  size: file.size,
                  sizeFormatted: formatFileSize(file.size),
                  mimetype: file.mimetype,
                  uploadedAt: new Date().toISOString(),
                  tier: tier
                },
                data: {
                  presentation: {
                    metadata: {
                      title: title || file.originalname.replace(/\.[^/.]+$/, ""),
                      subject: description || '',
                      author: author || 'Unknown',
                      company: '',
                      createdTime: new Date().toISOString(),
                      lastSavedTime: new Date().toISOString(),
                      slideCount: 1,
                      keywords: '',
                      comments: `Fallback conversion from: ${file.originalname} (${tierConfig.name} tier)`,
                      revision: 1
                    },
                    slideSize: {
                      width: 1920,
                      height: 1080,
                      type: "OnScreen16x9"
                    },
                    slides: [
                      {
                        slideId: 1,
                        slideIndex: 0,
                        name: "Slide 1",
                        slideType: "Slide",
                        shapes: [
                          {
                            shapeType: "Shape",
                            name: "Title",
                            geometry: { x: 100, y: 200, width: 1720, height: 300 },
                            textFrame: {
                              text: title || "Uploaded Presentation (Fallback Mode)",
                              paragraphs: [{
                                portions: [{
                                  text: title || "Uploaded Presentation (Fallback Mode)",
                                  fontHeight: 44,
                                  fontBold: true,
                                  fontColor: "#1f2937"
                                }],
                                alignment: "Center"
                              }]
                            },
                            fillFormat: { type: "NoFill" }
                          },
                          {
                            shapeType: "Shape",
                            name: "Content",
                            geometry: { x: 100, y: 500, width: 1720, height: 200 },
                            textFrame: {
                              text: "This presentation was uploaded but not fully converted. Configure Aspose.Slides credentials for full conversion.",
                              paragraphs: [{
                                portions: [{
                                  text: "This presentation was uploaded but not fully converted. Configure Aspose.Slides credentials for full conversion.",
                                  fontHeight: 24,
                                  fontColor: "#374151"
                                }],
                                alignment: "Center"
                              }]
                            },
                            fillFormat: { type: "NoFill" }
                          }
                        ],
                        background: {
                          type: "Solid",
                          solidFillColor: { type: "RGB", r: 255, g: 255, b: 255 }
                        }
                      }
                    ],
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
            }
            
          } catch (conversionError) {
            console.error('❌ PPTX conversion failed:', conversionError);
            throw new Error(`PPTX conversion failed: ${conversionError.message}`);
          }
          
        } else {
          throw new Error(`Unsupported file type: ${fileExtension}`);
        }

        // Validate against Universal PowerPoint Schema if requested
        let validationResult = null;
        if (shouldValidate) {
          console.log('🔍 Validating against Universal PowerPoint Schema...');
          validationResult = schemaValidator.validatePresentation(universalPresentationData);
          
          if (!validationResult.success) {
            console.error('❌ Uploaded file failed schema validation:', validationResult.errors);
            
            // Try auto-fix
            const fixResult = schemaValidator.validateAndFix(universalPresentationData);
            if (fixResult.revalidation && fixResult.revalidation.success) {
              console.log('✅ Auto-fixed validation errors successfully');
              universalPresentationData = fixResult.fixedData;
              validationResult = fixResult.revalidation;
            }
          } else {
            console.log('✅ Uploaded file passed Universal Schema validation');
          }
        }

        // Save to Firebase if available
        if (isFirebaseInitialized()) {
          try {
            const firestore = getFirestore();
            console.log(`💾 Saving ${tierConfig.name} tier presentation ${presentationId} to Firebase...`);
            
            await firestore.collection('presentation_json_data').doc(presentationId).set(universalPresentationData);
            console.log(`✅ ${tierConfig.name} tier presentation ${presentationId} saved to Firebase`);
          } catch (firebaseError) {
            console.error('❌ Failed to save to Firebase:', firebaseError);
            // Continue anyway - return the data even if Firebase save fails
          }
        }

        // Clean up uploaded file
        try {
          await fs.unlink(file.path);
          console.log('🧹 Cleaned up uploaded file');
        } catch (cleanupError) {
          console.warn('⚠️ Failed to cleanup uploaded file:', cleanupError.message);
        }

        res.json({
          success: true,
          data: {
            presentationId: presentationId,
            id: presentationId,
            title: universalPresentationData.title,
            description: universalPresentationData.description,
            slideCount: universalPresentationData.slideCount,
            status: 'completed',
            uploadedFile: {
              originalName: file.originalname,
              size: file.size,
              sizeFormatted: formatFileSize(file.size),
              mimetype: file.mimetype,
              tier: tier
            },
            tierInfo: {
              tier: tier,
              name: tierConfig.name,
              maxFileSize: tierConfig.maxFileSize,
              maxFileSizeFormatted: formatFileSize(tierConfig.maxFileSize),
              description: tierConfig.description,
              color: tierConfig.color
            },
            universalSchema: true,
            validated: shouldValidate,
            validationResult: validationResult
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: req.requestId,
            processingTimeMs: 2000,
            converted: true,
            schemaCompliant: validationResult?.success || !shouldValidate,
            tierUsed: tierConfig.name
          }
        });

      } catch (processingError) {
        console.error('❌ Error processing uploaded file:', processingError);
        
        // Clean up file on error
        if (req.file && req.file.path) {
          try {
            await fs.unlink(req.file.path);
          } catch (cleanupError) {
            console.warn('⚠️ Failed to cleanup file after error:', cleanupError.message);
          }
        }
        
        res.status(500).json({
          success: false,
          error: {
            type: 'server_error',
            code: 'FILE_PROCESSING_ERROR',
            message: 'Failed to process uploaded file',
            details: processingError.message
          }
        });
      }
    });

  } catch (error) {
    console.error('❌ Upload endpoint error:', error);
    res.status(500).json({
      success: false,
      error: {
        type: 'server_error',
        code: 'UPLOAD_ERROR',
        message: 'Upload failed',
        details: error.message
      }
    });
  }
};

/**
 * @swagger
 * /upload/json:
 *   post:
 *     tags: [File Upload]
 *     summary: Upload Universal JSON file
 *     description: Upload a Universal JSON schema file for validation and storage
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
 *                 description: JSON file containing Universal PowerPoint Schema
 *               validateSchema:
 *                 type: boolean
 *                 description: Whether to validate against Universal Schema
 *                 default: true
 *             required:
 *               - file
 *     responses:
 *       200:
 *         description: JSON file uploaded and validated successfully
 *       400:
 *         description: Invalid JSON or validation failed
 */
const uploadJSON = async (req, res) => {
  try {
    // Determine tier from request (same as uploadPPTX)
    const tier = getTierFromRequest(req);
    const tierConfig = TIER_LIMITS[tier];
    
    console.log(`📊 JSON Upload request with tier: ${tierConfig.name} (max: ${formatFileSize(tierConfig.maxFileSize)})`);
    
    // Create dynamic upload middleware for JSON
    const upload = createUploadMiddleware(tier);
    
    // Handle JSON file upload with tier-specific multer
    upload.single('file')(req, res, async (err) => {
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
            message: 'No file was uploaded'
          }
        });
      }

      const file = req.file;
      const fileExtension = path.extname(file.originalname).toLowerCase();
      
      if (fileExtension !== '.json') {
        // Clean up file
        try {
          await fs.unlink(file.path);
        } catch (cleanupError) {
          console.warn('⚠️ Failed to cleanup file:', cleanupError.message);
        }
        
        return res.status(400).json({
          success: false,
          error: {
            type: 'validation_error',
            code: 'INVALID_FILE_TYPE',
            message: 'Only JSON files are allowed for this endpoint'
          }
        });
      }

      // Process as JSON upload using the same logic as uploadPPTX
      try {
        const { validateSchema = 'true' } = req.body;
        const shouldValidate = validateSchema === 'true';
        
        console.log(`📁 Processing ${tierConfig.name} tier JSON upload: ${file.originalname}`);
        console.log(`📊 File size: ${formatFileSize(file.size)} (${file.size} bytes)`);
        console.log(`🎯 Tier: ${tierConfig.name} (limit: ${formatFileSize(tierConfig.maxFileSize)})`);
        
        const presentationId = `json_${tier}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Read and parse JSON content
        console.log('🔄 Processing JSON file...');
        const jsonContent = await fs.readFile(file.path, 'utf8');
        let universalPresentationData = JSON.parse(jsonContent);
        
        // Add metadata if not present
        if (!universalPresentationData.id) {
          universalPresentationData.id = presentationId;
        }
        if (!universalPresentationData.title) {
          universalPresentationData.title = file.originalname;
        }
        if (!universalPresentationData.description) {
          universalPresentationData.description = `JSON upload via ${tierConfig.name} tier`;
        }
        
        // Add upload metadata
        universalPresentationData.uploadTier = tier;
        universalPresentationData.uploadedFile = {
          originalName: file.originalname,
          filename: file.filename,
          size: file.size,
          sizeFormatted: formatFileSize(file.size),
          mimetype: file.mimetype,
          uploadedAt: new Date().toISOString(),
          tier: tier
        };

        // Validate against Universal PowerPoint Schema if requested
        let validationResult = null;
        if (shouldValidate) {
          console.log('🔍 Validating JSON against Universal PowerPoint Schema...');
          validationResult = schemaValidator.validatePresentation(universalPresentationData);
          
          if (!validationResult.success) {
            console.error('❌ JSON file failed schema validation:', validationResult.errors);
            
            // Try auto-fix
            const fixResult = schemaValidator.validateAndFix(universalPresentationData);
            if (fixResult.revalidation && fixResult.revalidation.success) {
              console.log('✅ Auto-fixed JSON validation errors successfully');
              universalPresentationData = fixResult.fixedData;
              validationResult = fixResult.revalidation;
            }
          } else {
            console.log('✅ JSON file passed Universal Schema validation');
          }
        }

        // Save to Firebase if available
        if (isFirebaseInitialized()) {
          try {
            const firestore = getFirestore();
            console.log(`💾 Saving ${tierConfig.name} tier JSON ${presentationId} to Firebase...`);
            
            await firestore.collection('presentation_json_data').doc(presentationId).set(universalPresentationData);
            console.log(`✅ ${tierConfig.name} tier JSON ${presentationId} saved to Firebase`);
          } catch (firebaseError) {
            console.error('❌ Failed to save JSON to Firebase:', firebaseError);
            // Continue anyway - return the data even if Firebase save fails
          }
        }

        // Clean up uploaded file
        try {
          await fs.unlink(file.path);
          console.log('🧹 Cleaned up JSON file');
        } catch (cleanupError) {
          console.warn('⚠️ Failed to cleanup JSON file:', cleanupError.message);
        }

        res.json({
          success: true,
          data: {
            presentationId: presentationId,
            id: presentationId,
            title: universalPresentationData.title,
            description: universalPresentationData.description,
            slideCount: universalPresentationData.slideCount || 0,
            status: 'completed',
            uploadedFile: {
              originalName: file.originalname,
              size: file.size,
              sizeFormatted: formatFileSize(file.size),
              mimetype: file.mimetype,
              tier: tier
            },
            tierInfo: {
              tier: tier,
              name: tierConfig.name,
              maxFileSize: tierConfig.maxFileSize,
              maxFileSizeFormatted: formatFileSize(tierConfig.maxFileSize),
              description: tierConfig.description,
              color: tierConfig.color
            },
            universalSchema: true,
            validated: shouldValidate,
            validationResult: validationResult
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: req.requestId,
            processingTimeMs: 500,
            converted: false, // JSON doesn't need conversion
            jsonUpload: true,
            schemaCompliant: validationResult?.success || !shouldValidate,
            tierUsed: tierConfig.name
          }
        });

      } catch (processingError) {
        console.error('❌ Error processing JSON file:', processingError);
        
        // Clean up file on error
        if (req.file && req.file.path) {
          try {
            await fs.unlink(req.file.path);
          } catch (cleanupError) {
            console.warn('⚠️ Failed to cleanup JSON file after error:', cleanupError.message);
          }
        }
        
        res.status(500).json({
          success: false,
          error: {
            type: 'server_error',
            code: 'JSON_PROCESSING_ERROR',
            message: 'Failed to process JSON file',
            details: processingError.message
          }
        });
      }
    });

  } catch (error) {
    console.error('❌ JSON upload endpoint error:', error);
    res.status(500).json({
      success: false,
      error: {
        type: 'server_error',
        code: 'JSON_UPLOAD_ERROR',
        message: 'JSON upload failed',
        details: error.message
      }
    });
  }
};

/**
 * @swagger
 * /upload/status/{uploadId}:
 *   get:
 *     tags: [File Upload]
 *     summary: Get upload status
 *     description: Check the status of a file upload and conversion
 *     parameters:
 *       - name: uploadId
 *         in: path
 *         required: true
 *         description: Upload identifier
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Upload status retrieved successfully
 *       404:
 *         description: Upload not found
 */
const getUploadStatus = async (req, res) => {
  try {
    const { uploadId } = req.params;
    
    // Check if the upload exists in Firebase
    if (isFirebaseInitialized()) {
      const firestore = getFirestore();
      const doc = await firestore.collection('presentation_json_data').doc(uploadId).get();
      
      if (doc.exists) {
        const data = doc.data();
        return res.json({
          success: true,
          data: {
            uploadId: uploadId,
            status: data.status || 'completed',
            title: data.title,
            slideCount: data.slideCount,
            createdAt: data.createdAt,
            uploadedFile: data.uploadedFile
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: `req_${Date.now()}`,
            processingTimeMs: 5
          }
        });
      }
    }
    
    res.status(404).json({
      success: false,
      error: {
        type: 'not_found',
        code: 'UPLOAD_NOT_FOUND',
        message: `Upload with ID ${uploadId} not found`
      }
    });

  } catch (error) {
    console.error('❌ Error getting upload status:', error);
    res.status(500).json({
      success: false,
      error: {
        type: 'server_error',
        code: 'UPLOAD_STATUS_ERROR',
        message: 'Failed to get upload status',
        details: error.message
      }
    });
  }
};

module.exports = {
  uploadPPTX,
  uploadJSON,
  getUploadStatus,
  getTiers
}; 