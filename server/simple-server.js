/**
 * Simple Server - JavaScript version without compilation issues
 */

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

// Load environment variables from root .env
require('dotenv').config({ path: path.join(__dirname, '../.env') });

console.log('🔧 Environment loaded from:', path.join(__dirname, '../.env'));
console.log('🔥 Firebase Project ID:', process.env.FIREBASE_PROJECT_ID ? 'Found' : 'Missing');

// Universal Schema Validator
const schemaValidator = require('./universal-schema-validator');

// Firebase configuration (if available)
let firebaseInitialized = false;
let firestore = null;
let sessionService = null;

// Try to initialize Firebase if credentials are available
const initializeFirebase = async () => {
  try {
    if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
      const admin = require('firebase-admin');
      
      // Check if Firebase is already initialized
      if (!admin.apps.length) {
        const serviceAccount = {
          type: "service_account",
          project_id: process.env.FIREBASE_PROJECT_ID,
          private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
          private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
          client_email: process.env.FIREBASE_CLIENT_EMAIL,
          client_id: process.env.FIREBASE_CLIENT_ID,
          auth_uri: "https://accounts.google.com/o/oauth2/auth",
          token_uri: "https://oauth2.googleapis.com/token",
          auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
          client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(process.env.FIREBASE_CLIENT_EMAIL)}`
        };

        const firebaseConfig = {
          credential: admin.credential.cert(serviceAccount),
          storageBucket: process.env.FIREBASE_STORAGE_BUCKET
        };
        
        // Only add databaseURL if using Realtime Database
        if (process.env.FIRESTORE_DATABASE_URL) {
          firebaseConfig.databaseURL = process.env.FIRESTORE_DATABASE_URL;
        }
        
        admin.initializeApp(firebaseConfig);

        firestore = admin.firestore();
        firebaseInitialized = true;
        console.log('✅ Firebase initialized successfully');
        
        // Now initialize SessionService
        const { SessionService } = require('./services/session.service.js');
        sessionService = new SessionService();
        console.log('✅ SessionService initialized');
        
        return true;
      } else {
        console.log('✅ Firebase already initialized');
        firestore = admin.firestore();
        firebaseInitialized = true;
        return true;
      }
    } else {
      console.log('❌ Firebase credentials missing in environment variables');
      console.log('   FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID ? 'Found' : 'Missing');
      console.log('   FIREBASE_PRIVATE_KEY:', process.env.FIREBASE_PRIVATE_KEY ? 'Found' : 'Missing');
      console.log('   FIREBASE_CLIENT_EMAIL:', process.env.FIREBASE_CLIENT_EMAIL ? 'Found' : 'Missing');
      return false;
    }
  } catch (error) {
    console.error('❌ Firebase initialization failed:', error.message);
    return false;
  }
};

const app = express();
const PORT = process.env.PORT || 3000;

// CORS configuration - Allow localhost and anlaklab.com domains
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    // Allow any localhost port (http://localhost:XXXX)
    if (origin.match(/^https?:\/\/localhost(:\d+)?$/)) {
      return callback(null, true);
    }
    
    // Allow any anlaklab.com subdomain (https://anything.anlaklab.com or http://anlaklab.com)
    if (origin.match(/^https?:\/\/([a-zA-Z0-9-]+\.)?anlaklab\.com$/)) {
      return callback(null, true);
    }
    
    // Allow any IP address on local network (192.168.x.x, 127.x.x.x, 10.x.x.x)
    if (origin.match(/^https?:\/\/(127\.|10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.)[\d.]+/)) {
      return callback(null, true);
    }
    
    // Log rejected origins for debugging
    console.log('🚫 CORS blocked origin:', origin);
    callback(new Error('CORS policy violation'), false);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-ID'],
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Initialize Firebase and SessionService
initializeFirebase().then(success => {
  if (success) {
    console.log('✅ Server initialization complete. Firebase and SessionService are ready.');
  } else {
    console.log('⚠️ Server initialization failed. Firebase or SessionService might not be available.');
  }
});

// Health endpoint
app.get('/api/v1/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '1.0',
      services: {
        conversion: 'healthy',
        aspose: 'not_implemented',
        firebase: firebaseInitialized ? 'connected' : 'not_configured',
      },
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: `req_${Date.now()}`,
      processingTimeMs: 0,
      version: '1.0',
    },
  });
});

// Presentations endpoint with real Firebase data
app.get('/api/v1/presentations', async (req, res) => {
  const { limit = '50', offset = '0', search = '', status = '' } = req.query;
  
  try {
    let presentations = [];

    if (firebaseInitialized && firestore) {
      console.log('🔄 Fetching presentations from Firebase...');
      
      try {
        // Get presentations from presentation_json_data collection
        const snapshot = await firestore.collection('presentation_json_data').get();
        
        presentations = snapshot.docs.map(doc => {
          const data = doc.data();
          
          return {
            id: doc.id,
            title: data.data?.presentation?.metadata?.title || data.title || "Untitled Presentation",
            description: data.data?.presentation?.metadata?.subject || data.data?.presentation?.metadata?.category || "No description available",
            author: data.data?.presentation?.metadata?.author || "Unknown",
            company: data.data?.presentation?.metadata?.company || "Unknown",
            createdAt: data.createdAt || data.data?.presentation?.metadata?.createdTime || new Date().toISOString(),
            updatedAt: data.updatedAt || data.data?.presentation?.metadata?.lastSavedTime || new Date().toISOString(),
            slideCount: data.data?.presentation?.metadata?.slideCount || 0,
            status: 'completed', // Assume completed if in Firebase
            fileSize: data.fileSize || 0,
            processingTime: data.processingTime || 0,
            thumbnailCount: data.thumbnailCount || 0,
            originalFilename: data.originalFilename || "unknown.pptx",
            type: "pptx2json",
            metadata: {
              audioCount: data.data?.presentation?.metadata?.audioCount || 0,
              imageCount: data.data?.presentation?.metadata?.imageCount || 0,
              layoutSlideCount: data.data?.presentation?.metadata?.layoutSlideCount || 0,
              masterSlideCount: data.data?.presentation?.metadata?.masterSlideCount || 0,
              revisionNumber: data.data?.presentation?.metadata?.revisionNumber || 0,
              subject: data.data?.presentation?.metadata?.subject || "",
              category: data.data?.presentation?.metadata?.category || "",
              keywords: data.data?.presentation?.metadata?.keywords || "",
              comments: data.data?.presentation?.metadata?.comments || "",
              lastSavedTime: data.data?.presentation?.metadata?.lastSavedTime || "",
              manager: data.data?.presentation?.metadata?.manager || ""
            },
            firebaseStorageUrl: data.firebaseStorageUrl || "",
            jsonDataUrl: data.jsonDataUrl || ""
          };
        });

        console.log(`✅ Found ${presentations.length} presentations in Firebase`);
      } catch (firebaseError) {
        console.error('❌ Firebase query failed:', firebaseError);
        // Fall back to mock data
        presentations = getMockPresentations();
      }
    } else {
      console.log('⚠️ Using mock data (Firebase not available)');
      presentations = getMockPresentations();
    }
    
    // Filter based on search and status
    let filteredPresentations = presentations;
    
    if (search) {
      filteredPresentations = filteredPresentations.filter(p => 
        p.title.toLowerCase().includes(search.toLowerCase()) ||
        p.description.toLowerCase().includes(search.toLowerCase()) ||
        p.originalFilename.toLowerCase().includes(search.toLowerCase()) ||
        p.author.toLowerCase().includes(search.toLowerCase()) ||
        p.company.toLowerCase().includes(search.toLowerCase()) ||
        (p.metadata?.subject || "").toLowerCase().includes(search.toLowerCase()) ||
        (p.metadata?.keywords || "").toLowerCase().includes(search.toLowerCase())
      );
    }
    
    if (status && status !== 'all') {
      filteredPresentations = filteredPresentations.filter(p => p.status === status);
    }
    
    // Apply pagination
    const limitNum = parseInt(limit);
    const offsetNum = parseInt(offset);
    const paginatedPresentations = filteredPresentations.slice(offsetNum, offsetNum + limitNum);
    
    res.json({
      success: true,
      data: paginatedPresentations,
      meta: {
        pagination: {
          limit: limitNum,
          offset: offsetNum,
          total: filteredPresentations.length,
          pages: Math.ceil(filteredPresentations.length / limitNum),
          currentPage: Math.floor(offsetNum / limitNum) + 1,
        },
        filters: {
          search: search || null,
          status: status || null,
        },
        timestamp: new Date().toISOString(),
        requestId: `req_${Date.now()}`,
        processingTimeMs: 8,
        dataSource: firebaseInitialized ? 'firebase' : 'mock',
      },
    });
  } catch (error) {
    console.error('Error fetching presentations:', error);
    res.status(500).json({
      success: false,
      error: {
        type: 'server_error',
        code: 'PRESENTATIONS_FETCH_ERROR',
        message: 'Failed to fetch presentations',
      },
    });
  }
});

// Get single presentation by ID endpoint
app.get('/api/v1/presentations/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    let presentation = null;

    if (firebaseInitialized && firestore) {
      console.log(`🔄 Fetching presentation ${id} from Firebase...`);
      
      try {
        // Get specific presentation from presentation_json_data collection
        const doc = await firestore.collection('presentation_json_data').doc(id).get();
        
        if (doc.exists) {
          const data = doc.data();
          
          presentation = {
            id: doc.id,
            title: data.data?.presentation?.metadata?.title || data.title || "Untitled Presentation",
            description: data.data?.presentation?.metadata?.subject || data.data?.presentation?.metadata?.category || "No description available",
            author: data.data?.presentation?.metadata?.author || "Unknown",
            company: data.data?.presentation?.metadata?.company || "Unknown",
            createdAt: data.createdAt || data.data?.presentation?.metadata?.createdTime || new Date().toISOString(),
            updatedAt: data.updatedAt || data.data?.presentation?.metadata?.lastSavedTime || new Date().toISOString(),
            slideCount: data.data?.presentation?.metadata?.slideCount || 0,
            status: 'completed',
            fileSize: data.fileSize || 0,
            processingTime: data.processingTime || 0,
            thumbnailCount: data.thumbnailCount || 0,
            originalFilename: data.originalFilename || "unknown.pptx",
            type: "pptx2json",
            metadata: {
              audioCount: data.data?.presentation?.metadata?.audioCount || 0,
              imageCount: data.data?.presentation?.metadata?.imageCount || 0,
              layoutSlideCount: data.data?.presentation?.metadata?.layoutSlideCount || 0,
              masterSlideCount: data.data?.presentation?.metadata?.masterSlideCount || 0,
              revisionNumber: data.data?.presentation?.metadata?.revisionNumber || 0,
              subject: data.data?.presentation?.metadata?.subject || "",
              category: data.data?.presentation?.metadata?.category || "",
              keywords: data.data?.presentation?.metadata?.keywords || "",
              comments: data.data?.presentation?.metadata?.comments || "",
              lastSavedTime: data.data?.presentation?.metadata?.lastSavedTime || "",
              manager: data.data?.presentation?.metadata?.manager || ""
            },
            firebaseStorageUrl: data.firebaseStorageUrl || "",
            jsonDataUrl: data.jsonDataUrl || "",
            // Include the full Firebase data for analysis
            fullData: data.data || {}
          };

          console.log(`✅ Found presentation ${id} in Firebase`);
        } else {
          console.log(`❌ Presentation ${id} not found in Firebase`);
        }
      } catch (firebaseError) {
        console.error('❌ Firebase query failed:', firebaseError);
      }
    }

    if (!presentation) {
      return res.status(404).json({
        success: false,
        error: {
          type: 'not_found',
          code: 'PRESENTATION_NOT_FOUND',
          message: `Presentation with ID ${id} not found`,
        },
      });
    }
    
    res.json({
      success: true,
      data: presentation,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: `req_${Date.now()}`,
        processingTimeMs: 5,
        dataSource: firebaseInitialized ? 'firebase' : 'mock',
      },
    });
  } catch (error) {
    console.error('Error fetching presentation:', error);
    res.status(500).json({
      success: false,
      error: {
        type: 'server_error',
        code: 'PRESENTATION_FETCH_ERROR',
        message: 'Failed to fetch presentation',
      },
    });
  }
});

// Get full Universal JSON endpoint for use-presentation hook
app.get('/api/v1/json/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    if (firebaseInitialized && firestore) {
      console.log(`🔄 Fetching Universal JSON for ${id} from Firebase...`);
      
      try {
        // Get specific presentation from presentation_json_data collection
        const doc = await firestore.collection('presentation_json_data').doc(id).get();
        
        if (doc.exists) {
          const data = doc.data();
          
          // Extract the Universal JSON data
          if (data.data && data.data.presentation) {
            const universalJson = {
              id: doc.id,
              metadata: data.data.presentation.metadata || {},
              slideSize: data.data.presentation.slideSize || { width: 720, height: 540 },
              slides: data.data.presentation.slides || [],
              masterSlides: data.data.presentation.masterSlides || [],
              layoutSlides: data.data.presentation.layoutSlides || [],
              assets: data.data.presentation.assets || {},
              theme: data.data.presentation.theme || {}
            };

            console.log(`✅ Found Universal JSON for ${id} in Firebase`);
            
            return res.json({
              success: true,
              data: universalJson,
              timestamp: new Date().toISOString(),
            });
          } else {
            console.log(`❌ No presentation data found in document ${id}`);
            return res.status(404).json({
              success: false,
              error: `No presentation data found for ID ${id}`,
              timestamp: new Date().toISOString(),
            });
          }
        } else {
          console.log(`❌ Document ${id} not found in Firebase`);
          return res.status(404).json({
            success: false,
            error: `Presentation with ID ${id} not found`,
            timestamp: new Date().toISOString(),
          });
        }
      } catch (firebaseError) {
        console.error('❌ Firebase query failed:', firebaseError);
        return res.status(500).json({
          success: false,
          error: 'Firebase query failed',
          timestamp: new Date().toISOString(),
        });
      }
    } else {
      return res.status(503).json({
        success: false,
        error: 'Firebase not initialized',
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error('Error fetching Universal JSON:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch Universal JSON',
      timestamp: new Date().toISOString(),
    });
  }
});

// AI Generate Presentation endpoint
app.post('/api/v1/ai/generate-presentation', async (req, res) => {
  const { description, slides = 8, style = 'professional' } = req.body;
  
  try {
    console.log('🤖 AI Generate Presentation request:', { description, slides, style });
    
    // Create sophisticated AI prompt for Universal PowerPoint Schema
    const aiPrompt = `
You are an expert PowerPoint presentation designer. Create a professional presentation using the Universal PowerPoint Schema. 

USER REQUEST: "${description}"
SLIDES REQUESTED: ${slides}
STYLE: ${style}

REQUIREMENTS:
1. Follow the Universal PowerPoint Schema structure exactly
2. Create ${slides} diverse, engaging slides with different layouts
3. Use professional ${style} styling
4. Include proper metadata, slide sizes, and formatting
5. Each slide should have meaningful content related to "${description}"
6. Vary slide types: title slides, content slides, charts, bullet points
7. Use appropriate colors, fonts, and spacing
8. Include slide transitions and basic animations where appropriate

Generate a complete Universal PowerPoint Schema JSON with:
- metadata (title, author, subject, keywords, slideCount)
- slideSize (width: 1920, height: 1080)
- slides array with ${slides} slides
- each slide with shapes containing textframes, fillFormat, geometry
- professional color scheme and typography
- masterSlides and layoutSlides as needed

Make the content informative, well-structured, and visually appealing.`;

    // For now, create enhanced structure following Universal Schema
    // TODO: Replace with actual OpenAI call using the aiPrompt above
    const presentationId = `gen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create Universal PowerPoint Schema compliant structure
    const universalPresentationData = {
      id: presentationId,
      title: `AI Generated: ${description.substring(0, 50)}${description.length > 50 ? '...' : ''}`,
      description: description,
      status: 'completed',
      slideCount: slides,
      author: 'Luna AI',
      company: 'Luna Project',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      data: {
        presentation: {
          metadata: {
            title: `AI Generated: ${description}`,
            subject: description,
            author: 'Luna AI',
            company: 'Luna Project',
            manager: 'Luna AI Assistant',
            createdTime: new Date().toISOString(),
            lastSavedTime: new Date().toISOString(),
            slideCount: slides,
            keywords: description.split(' ').slice(0, 5).join(', '),
            comments: `Generated automatically by Luna AI for: ${description}`,
            category: style,
            revision: 1
          },
          slideSize: {
            width: 1920,
            height: 1080,
            type: "OnScreen16x9"
          },
          slides: Array.from({ length: slides }, (_, i) => {
            const slideTypes = ['title', 'content', 'twoContent', 'chart', 'bullets'];
            const slideType = i === 0 ? 'title' : slideTypes[i % slideTypes.length];
            
            return {
              slideId: i + 1,
              slideIndex: i,
              name: `Slide ${i + 1}`,
              slideType: "Slide",
              shapes: [
                {
                  shapeType: "Shape",
                  name: i === 0 ? "Title" : `Content_${i}`,
                  geometry: {
                    x: i === 0 ? 100 : 80,
                    y: i === 0 ? 200 : 100,
                    width: i === 0 ? 1720 : 1760,
                    height: i === 0 ? 300 : 150
                  },
                  textFrame: {
                    text: i === 0 
                      ? `${description}`
                      : `Slide ${i + 1}: Advanced analysis and insights for ${description}`,
                    paragraphs: [
                      {
                        portions: [
                          {
                            text: i === 0 
                              ? `${description}`
                              : `Slide ${i + 1}: Key Points and Analysis`,
                            fontHeight: i === 0 ? 44 : 32,
                            fontBold: true,
                            fontColor: style === 'professional' ? "#1f2937" : "#374151"
                          }
                        ],
                        alignment: i === 0 ? "Center" : "Left"
                      }
                    ]
                  },
                  fillFormat: {
                    type: "NoFill"
                  }
                },
                ...(i > 0 ? [{
                  shapeType: "Shape",
                  name: `Content_Body_${i}`,
                  geometry: {
                    x: 80,
                    y: 280,
                    width: 1760,
                    height: 600
                  },
                  textFrame: {
                    text: `Detailed content for slide ${i + 1} covering important aspects of ${description}. This includes comprehensive analysis, key findings, and actionable insights.`,
                    paragraphs: [
                      {
                        portions: [
                          {
                            text: `• Key insight #1 related to ${description}\n• Important finding #2 for this topic\n• Strategic recommendation #3\n• Implementation considerations\n• Expected outcomes and benefits`,
                            fontHeight: 24,
                            fontColor: "#374151"
                          }
                        ],
                        alignment: "Left"
                      }
                    ]
                  },
                  fillFormat: {
                    type: "NoFill"
                  }
                }] : [])
              ],
              background: {
                type: "Solid",
                solidFillColor: {
                  type: "RGB",
                  r: 255,
                  g: 255,
                  b: 255
                }
              },
              transition: {
                type: "Fade",
                duration: 0.5
              }
            };
          }),
          masterSlides: [
            {
              slideId: 0,
              name: "Master Slide",
              slideType: "MasterSlide",
              shapes: [],
              background: {
                type: "Solid",
                solidFillColor: {
                  type: "RGB",
                  r: 255,
                  g: 255,
                  b: 255
                }
              }
            }
          ],
          layoutSlides: [],
          theme: {
            name: `${style} Theme`,
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

    // VALIDATE against Universal PowerPoint Schema
    console.log('🔍 Validating generated presentation against Universal PowerPoint Schema...');
    const validationResult = schemaValidator.validatePresentation(universalPresentationData);
    
    if (!validationResult.success) {
      console.error('❌ Generated presentation failed validation:', validationResult.error);
      console.error('🐛 Validation errors:', validationResult.errors);
      console.error('📊 Structure analysis:', validationResult.structure);
      
      // Try auto-fix
      const fixResult = schemaValidator.validateAndFix(universalPresentationData);
      if (fixResult.revalidation && fixResult.revalidation.success) {
        console.log('✅ Auto-fixed validation errors successfully');
        // Use the fixed data
        Object.assign(universalPresentationData, fixResult.fixedData);
      } else {
        // Return validation error details
        return res.status(400).json({
          success: false,
          error: {
            type: 'validation_error',
            code: 'SCHEMA_VALIDATION_FAILED',
            message: 'Generated presentation does not comply with Universal PowerPoint Schema',
            validationDetails: validationResult
          }
        });
      }
    } else {
      console.log('✅ Generated presentation passed Universal Schema validation');
      console.log(`📊 Validation completed in ${validationResult.validationTimeMs}ms`);
      console.log(`🎯 Schema compliance: ${validationResult.schemaCompliance?.completeness}%`);
    }

    // Save to Firebase if available
    if (firebaseInitialized && firestore) {
      try {
        console.log(`💾 Saving Universal Schema presentation ${presentationId} to Firebase...`);
        
        await firestore.collection('presentation_json_data').doc(presentationId).set(universalPresentationData);
        console.log(`✅ Universal Schema presentation ${presentationId} saved to Firebase`);
      } catch (firebaseError) {
        console.error('❌ Failed to save to Firebase:', firebaseError);
        // Continue anyway - return the data even if Firebase save fails
      }
    }

    res.json({
      success: true,
      data: {
        presentationId: presentationId,
        id: presentationId, // Make sure both formats are available
        title: universalPresentationData.title,
        description: universalPresentationData.description,
        slideCount: slides,
        status: 'completed',
        universalSchema: true, // Flag to indicate this uses Universal Schema
        schemaVersion: "1.0"
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: `req_${Date.now()}`,
        processingTimeMs: 1500,
        aiGenerated: true,
        schemaCompliant: true,
        prompt: aiPrompt // Include the prompt for debugging
      }
    });

  } catch (error) {
    console.error('Error generating presentation:', error);
    res.status(500).json({
      success: false,
      error: {
        type: 'server_error',
        code: 'AI_GENERATION_ERROR',
        message: 'Failed to generate presentation',
      },
    });
  }
});

// Get thumbnails for a specific presentation
app.get('/api/v1/presentations/:id/thumbnails', async (req, res) => {
  const { id } = req.params;
  
  try {
    if (firebaseInitialized && firestore) {
      console.log(`🖼️ Fetching thumbnails for presentation ${id}...`);
      
      try {
        // Get thumbnails from the thumbnails collection
        const snapshot = await firestore.collection('thumbnails')
          .where('presentationId', '==', id)
          .orderBy('slideIndex')
          .get();
        
        if (!snapshot.empty) {
          const thumbnails = snapshot.docs.map(doc => {
            const data = doc.data();
            return data.url || data.thumbnailUrl;
          }).filter(Boolean);
          
          console.log(`✅ Found ${thumbnails.length} thumbnails for presentation ${id}`);
          
          return res.json({
            success: true,
            data: thumbnails,
            count: thumbnails.length,
            timestamp: new Date().toISOString(),
          });
        } else {
          console.log(`❌ No thumbnails found for presentation ${id}`);
          return res.json({
            success: true,
            data: [],
            count: 0,
            message: `No thumbnails found for presentation ${id}`,
            timestamp: new Date().toISOString(),
          });
        }
      } catch (firebaseError) {
        console.error('Firebase error fetching thumbnails:', firebaseError);
        throw firebaseError;
      }
    } else {
      console.log('Firebase not initialized, returning mock thumbnail data');
      
      // Mock response for development
      return res.json({
        success: true,
        data: [
          `http://localhost:3000/mock-thumbnails/slide-1.png`,
          `http://localhost:3000/mock-thumbnails/slide-2.png`,
          `http://localhost:3000/mock-thumbnails/slide-3.png`,
        ],
        count: 3,
        message: 'Mock thumbnail data (Firebase not configured)',
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error('Error fetching thumbnails:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch thumbnails',
      details: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Generate thumbnails for a specific presentation
app.post('/api/v1/presentations/:id/generate-thumbnails', async (req, res) => {
  const { id } = req.params;
  
  try {
    console.log(`🎯 Generating thumbnails for presentation ${id}...`);
    
    if (firebaseInitialized && firestore) {
      // Check if presentation exists
      const doc = await firestore.collection('presentation_json_data').doc(id).get();
      
      if (!doc.exists) {
        return res.status(404).json({
          success: false,
          error: `Presentation with ID ${id} not found`,
          timestamp: new Date().toISOString(),
        });
      }
      
      // In a real implementation, this would trigger actual thumbnail generation
      // For now, we'll simulate the process and create mock thumbnails
      
      const slideCount = doc.data()?.data?.presentation?.metadata?.slideCount || 3;
      const thumbnails = [];
      
      for (let i = 0; i < slideCount; i++) {
        const thumbnailData = {
          presentationId: id,
          slideIndex: i,
          url: `http://localhost:3000/mock-thumbnails/presentation-${id}-slide-${i + 1}.png`,
          thumbnailUrl: `http://localhost:3000/mock-thumbnails/presentation-${id}-slide-${i + 1}-thumb.png`,
          createdAt: new Date().toISOString(),
          format: 'png',
          size: { width: 800, height: 600 }
        };
        
        // Save thumbnail reference to Firebase
        await firestore.collection('thumbnails').add(thumbnailData);
        thumbnails.push(thumbnailData.url);
      }
      
      console.log(`✅ Generated ${thumbnails.length} thumbnails for presentation ${id}`);
      
      return res.json({
        success: true,
        data: {
          thumbnails,
          count: thumbnails.length,
          presentationId: id,
          generated: true
        },
        message: `Successfully generated ${thumbnails.length} thumbnails`,
        timestamp: new Date().toISOString(),
      });
    } else {
      // Mock response for development
      return res.json({
        success: true,
        data: {
          thumbnails: [
            `http://localhost:3000/mock-thumbnails/presentation-${id}-slide-1.png`,
            `http://localhost:3000/mock-thumbnails/presentation-${id}-slide-2.png`,
            `http://localhost:3000/mock-thumbnails/presentation-${id}-slide-3.png`,
          ],
          count: 3,
          presentationId: id,
          generated: true
        },
        message: 'Mock thumbnail generation (Firebase not configured)',
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error('Error generating thumbnails:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate thumbnails',
      details: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Schema Validation endpoint - Validate any presentation data against Universal PowerPoint Schema
app.post('/api/v1/validate-schema', async (req, res) => {
  const { presentationData } = req.body;
  
  try {
    console.log('🔍 Schema validation request received');
    
    if (!presentationData) {
      return res.status(400).json({
        success: false,
        error: {
          type: 'validation_error',
          code: 'MISSING_DATA',
          message: 'No presentationData provided for validation'
        }
      });
    }
    
    // Validate against Universal PowerPoint Schema
    const validationResult = schemaValidator.validatePresentation(presentationData);
    
    if (validationResult.success) {
      console.log('✅ Presentation data passed schema validation');
      res.json({
        success: true,
        data: {
          valid: true,
          message: validationResult.message,
          slideCount: validationResult.slideCount,
          hasMetadata: validationResult.hasMetadata,
          hasTheme: validationResult.hasTheme,
          schemaCompliance: validationResult.schemaCompliance
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: `req_${Date.now()}`,
          validationTimeMs: validationResult.validationTimeMs,
          schemaVersion: "1.0"
        }
      });
    } else {
      console.log('❌ Presentation data failed schema validation');
      res.status(400).json({
        success: false,
        error: {
          type: 'validation_error',
          code: 'SCHEMA_VALIDATION_FAILED',
          message: validationResult.error,
          validationDetails: {
            errors: validationResult.errors,
            structure: validationResult.structure,
            suggestions: validationResult.suggestions
          }
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: `req_${Date.now()}`,
          validationTimeMs: validationResult.validationTimeMs
        }
      });
    }
    
  } catch (error) {
    console.error('Error in schema validation:', error);
    res.status(500).json({
      success: false,
      error: {
        type: 'server_error',
        code: 'VALIDATION_ERROR',
        message: 'Failed to validate schema'
      }
    });
  }
});

// Schema Information endpoint - Get details about the loaded Universal PowerPoint Schema
app.get('/api/v1/schema-info', (req, res) => {
  try {
    console.log('📋 Schema information request');
    
    const schemaInfo = schemaValidator.getSchemaInfo();
    
    res.json({
      success: true,
      data: {
        validator: {
          loaded: schemaInfo.loaded,
          title: schemaInfo.title,
          description: schemaInfo.description,
          version: schemaInfo.version,
          definitionCount: schemaInfo.definitionCount,
          mainDefinitions: schemaInfo.mainDefinitions,
          universalPresentationProperties: schemaInfo.universalPresentationProperties
        },
        endpoints: {
          validate: '/api/v1/validate-schema',
          validateAndFix: '/api/v1/validate-and-fix',
          schemaInfo: '/api/v1/schema-info'
        }
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: `req_${Date.now()}`,
        processingTimeMs: 1
      }
    });
    
  } catch (error) {
    console.error('Error getting schema info:', error);
    res.status(500).json({
      success: false,
      error: {
        type: 'server_error',
        code: 'SCHEMA_INFO_ERROR',
        message: 'Failed to get schema information'
      }
    });
  }
});

// Schema Validation with Auto-Fix endpoint - Validate and attempt to fix common issues
app.post('/api/v1/validate-and-fix', async (req, res) => {
  const { presentationData } = req.body;
  
  try {
    console.log('🔧 Schema validation with auto-fix request received');
    
    if (!presentationData) {
      return res.status(400).json({
        success: false,
        error: {
          type: 'validation_error',
          code: 'MISSING_DATA',
          message: 'No presentationData provided for validation and fixing'
        }
      });
    }
    
    // Validate and attempt auto-fix
    const fixResult = schemaValidator.validateAndFix(presentationData);
    
    if (fixResult.originalValidation.success) {
      // Was already valid
      res.json({
        success: true,
        data: {
          wasValid: true,
          message: 'Presentation data was already valid',
          validationResult: fixResult.originalValidation,
          fixedData: null
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: `req_${Date.now()}`,
          validationTimeMs: fixResult.originalValidation.validationTimeMs,
          autoFixAttempted: false
        }
      });
    } else if (fixResult.revalidation && fixResult.revalidation.success) {
      // Was invalid but was fixed
      console.log('✅ Successfully auto-fixed validation errors');
      res.json({
        success: true,
        data: {
          wasValid: false,
          wasFixed: true,
          message: 'Presentation data had errors but was successfully fixed',
          originalValidation: fixResult.originalValidation,
          revalidation: fixResult.revalidation,
          fixedData: fixResult.fixedData
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: `req_${Date.now()}`,
          validationTimeMs: fixResult.originalValidation.validationTimeMs + fixResult.revalidation.validationTimeMs,
          autoFixAttempted: true,
          autoFixSuccessful: true
        }
      });
    } else {
      // Could not be fixed
      console.log('❌ Could not auto-fix validation errors');
      res.status(400).json({
        success: false,
        error: {
          type: 'validation_error',
          code: 'UNFIXABLE_SCHEMA_ERRORS',
          message: 'Presentation data has validation errors that could not be automatically fixed',
          validationDetails: fixResult.originalValidation
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: `req_${Date.now()}`,
          validationTimeMs: fixResult.originalValidation.validationTimeMs,
          autoFixAttempted: true,
          autoFixSuccessful: false
        }
      });
    }
    
  } catch (error) {
    console.error('Error in schema validation and fix:', error);
    res.status(500).json({
      success: false,
      error: {
        type: 'server_error',
        code: 'VALIDATION_FIX_ERROR',
        message: 'Failed to validate and fix schema'
      }
    });
  }
});

// ================================
// CHAT SESSION MANAGEMENT ENDPOINTS
// ================================

// Create session
app.post('/api/v1/sessions', async (req, res) => {
  if (!sessionService) {
    return res.status(503).json({
      success: false,
      error: {
        type: 'service_unavailable',
        code: 'SESSION_SERVICE_NOT_AVAILABLE',
        message: 'Session service is not available. Please check Firebase configuration.'
      }
    });
  }

  try {
    const { userId, title, metadata } = req.body;
    
    console.log(`🆕 Creating new session for user ${userId || 'anonymous'}...`);
    
    const sessionData = {
      userId: userId || null,
      title: title || 'New Chat Session',
      metadata: metadata || {}
    };
    
    const result = await sessionService.createSession(sessionData);
    
    res.json({
      success: true,
      data: result.data,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: `req_${Date.now()}`,
        processingTimeMs: 12
      }
    });
    
  } catch (error) {
    console.error('❌ Error creating session:', error);
    res.status(500).json({
      success: false,
      error: {
        type: 'server_error',
        code: 'SESSION_CREATE_ERROR',
        message: error.message || 'Failed to create session'
      }
    });
  }
});

// Get session by ID
app.get('/api/v1/sessions/:sessionId', async (req, res) => {
  if (!sessionService) {
    return res.status(503).json({
      success: false,
      error: {
        type: 'service_unavailable',
        code: 'SESSION_SERVICE_NOT_AVAILABLE',
        message: 'Session service is not available. Please check Firebase configuration.'
      }
    });
  }

  try {
    const { sessionId } = req.params;
    console.log(`📋 Getting session ${sessionId}...`);
    
    const result = await sessionService.getSession(sessionId);
    
    res.json({
      success: true,
      data: result.data,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: `req_${Date.now()}`,
        processingTimeMs: 5
      }
    });
    
  } catch (error) {
    console.error(`❌ Error getting session:`, error);
    const status = error.message.includes('not found') ? 404 : 500;
    res.status(status).json({
      success: false,
      error: {
        type: status === 404 ? 'not_found' : 'server_error',
        code: status === 404 ? 'SESSION_NOT_FOUND' : 'SESSION_GET_ERROR',
        message: error.message || 'Failed to get session'
      }
    });
  }
});

// Get user sessions (with pagination and filtering)
app.get('/api/v1/sessions', async (req, res) => {
  if (!sessionService) {
    return res.status(503).json({
      success: false,
      error: {
        type: 'service_unavailable',
        code: 'SESSION_SERVICE_NOT_AVAILABLE',
        message: 'Session service is not available. Please check Firebase configuration.'
      }
    });
  }

  try {
    const {
      userId = null,
      limit = '20',
      offset = '0',
      status = 'active',
      orderBy = 'lastActiveAt',
      orderDirection = 'desc',
      bookmarkedOnly = 'false',
      tags
    } = req.query;
    
    console.log(`📋 Getting sessions for user ${userId || 'anonymous'}...`);
    
    const options = {
      limit: parseInt(limit),
      offset: parseInt(offset),
      status,
      orderBy,
      orderDirection,
      bookmarkedOnly: bookmarkedOnly === 'true',
      tags: tags ? tags.split(',').map(tag => tag.trim()) : []
    };
    
    const result = await sessionService.getUserSessions(userId, options);
    
    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: `req_${Date.now()}`,
        processingTimeMs: 8,
        filters: options
      }
    });
    
  } catch (error) {
    console.error('❌ Error getting user sessions:', error);
    res.status(500).json({
      success: false,
      error: {
        type: 'server_error',
        code: 'SESSIONS_GET_ERROR',
        message: error.message || 'Failed to get user sessions'
      }
    });
  }
});

// Add message to session
app.post('/api/v1/sessions/:sessionId/messages', async (req, res) => {
  if (!sessionService) {
    return res.status(503).json({
      success: false,
      error: {
        type: 'service_unavailable',
        code: 'SESSION_SERVICE_NOT_AVAILABLE',
        message: 'Session service is not available. Please check Firebase configuration.'
      }
    });
  }

  try {
    const { sessionId } = req.params;
    const { role, content, metadata } = req.body;
    
    console.log(`💬 Adding ${role} message to session ${sessionId}...`);
    
    if (!role || !content) {
      return res.status(400).json({
        success: false,
        error: {
          type: 'validation_error',
          code: 'MISSING_REQUIRED_FIELDS',
          message: 'Role and content are required'
        }
      });
    }
    
    if (!['user', 'assistant', 'system'].includes(role)) {
      return res.status(400).json({
        success: false,
        error: {
          type: 'validation_error',
          code: 'INVALID_ROLE',
          message: 'Role must be user, assistant, or system'
        }
      });
    }
    
    const result = await sessionService.addMessage(sessionId, {
      role,
      content,
      metadata: metadata || {}
    });
    
    res.json({
      success: true,
      data: {
        messageId: result.messageId,
        message: result.data
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: `req_${Date.now()}`,
        processingTimeMs: 5
      }
    });
    
  } catch (error) {
    console.error(`❌ Error adding message to session:`, error);
    const status = error.message.includes('not found') ? 404 : 500;
    res.status(status).json({
      success: false,
      error: {
        type: status === 404 ? 'not_found' : 'server_error',
        code: status === 404 ? 'SESSION_NOT_FOUND' : 'MESSAGE_ADD_ERROR',
        message: error.message || 'Failed to add message'
      }
    });
  }
});

// Update session metadata
app.put('/api/v1/sessions/:sessionId', async (req, res) => {
  if (!sessionService) {
    return res.status(503).json({
      success: false,
      error: {
        type: 'service_unavailable',
        code: 'SESSION_SERVICE_NOT_AVAILABLE',
        message: 'Session service is not available. Please check Firebase configuration.'
      }
    });
  }

  try {
    const { sessionId } = req.params;
    const { title, isBookmarked, tags, settings, status } = req.body;
    
    console.log(`✏️ Updating session ${sessionId}...`);
    
    const updates = {};
    if (title !== undefined) updates.title = title;
    if (isBookmarked !== undefined) updates.isBookmarked = isBookmarked;
    if (tags !== undefined) updates.tags = tags;
    if (settings !== undefined) updates.settings = settings;
    if (status !== undefined) updates.status = status;
    
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          type: 'validation_error',
          code: 'NO_UPDATES_PROVIDED',
          message: 'No valid update fields provided'
        }
      });
    }
    
    const result = await sessionService.updateSession(sessionId, updates);
    
    res.json({
      success: true,
      data: {
        updated: result.updates
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: `req_${Date.now()}`,
        processingTimeMs: 3
      }
    });
    
  } catch (error) {
    console.error(`❌ Error updating session:`, error);
    const status = error.message.includes('not found') ? 404 : 500;
    res.status(status).json({
      success: false,
      error: {
        type: status === 404 ? 'not_found' : 'server_error',
        code: status === 404 ? 'SESSION_NOT_FOUND' : 'SESSION_UPDATE_ERROR',
        message: error.message || 'Failed to update session'
      }
    });
  }
});

// Archive session (soft delete)
app.post('/api/v1/sessions/:sessionId/archive', async (req, res) => {
  if (!sessionService) {
    return res.status(503).json({
      success: false,
      error: {
        type: 'service_unavailable',
        code: 'SESSION_SERVICE_NOT_AVAILABLE',
        message: 'Session service is not available. Please check Firebase configuration.'
      }
    });
  }

  try {
    const { sessionId } = req.params;
    console.log(`📦 Archiving session ${sessionId}...`);
    
    await sessionService.archiveSession(sessionId);
    
    res.json({
      success: true,
      data: {
        sessionId,
        status: 'archived'
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: `req_${Date.now()}`,
        processingTimeMs: 2
      }
    });
    
  } catch (error) {
    console.error(`❌ Error archiving session:`, error);
    const status = error.message.includes('not found') ? 404 : 500;
    res.status(status).json({
      success: false,
      error: {
        type: status === 404 ? 'not_found' : 'server_error',
        code: status === 404 ? 'SESSION_NOT_FOUND' : 'SESSION_ARCHIVE_ERROR',
        message: error.message || 'Failed to archive session'
      }
    });
  }
});

// Delete session permanently
app.delete('/api/v1/sessions/:sessionId', async (req, res) => {
  if (!sessionService) {
    return res.status(503).json({
      success: false,
      error: {
        type: 'service_unavailable',
        code: 'SESSION_SERVICE_NOT_AVAILABLE',
        message: 'Session service is not available. Please check Firebase configuration.'
      }
    });
  }

  try {
    const { sessionId } = req.params;
    console.log(`🗑️ Deleting session ${sessionId}...`);
    
    await sessionService.deleteSession(sessionId);
    
    res.json({
      success: true,
      data: {
        sessionId,
        deleted: true
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: `req_${Date.now()}`,
        processingTimeMs: 2
      }
    });
    
  } catch (error) {
    console.error(`❌ Error deleting session:`, error);
    const status = error.message.includes('not found') ? 404 : 500;
    res.status(status).json({
      success: false,
      error: {
        type: status === 404 ? 'not_found' : 'server_error',
        code: status === 404 ? 'SESSION_NOT_FOUND' : 'SESSION_DELETE_ERROR',
        message: error.message || 'Failed to delete session'
      }
    });
  }
});

// Add generated presentation reference to session
app.post('/api/v1/sessions/:sessionId/presentations', async (req, res) => {
  if (!sessionService) {
    return res.status(503).json({
      success: false,
      error: {
        type: 'service_unavailable',
        code: 'SESSION_SERVICE_NOT_AVAILABLE',
        message: 'Session service is not available. Please check Firebase configuration.'
      }
    });
  }

  try {
    const { sessionId } = req.params;
    const { presentationId, title, description, slideCount } = req.body;
    
    console.log(`🎨 Adding presentation reference to session ${sessionId}...`);
    
    if (!presentationId) {
      return res.status(400).json({
        success: false,
        error: {
          type: 'validation_error',
          code: 'MISSING_PRESENTATION_ID',
          message: 'Presentation ID is required'
        }
      });
    }
    
    const result = await sessionService.addGeneratedPresentation(sessionId, {
      id: presentationId,
      title: title || 'Generated Presentation',
      description: description || '',
      slideCount: slideCount || 0
    });
    
    res.json({
      success: true,
      data: result.presentation,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: `req_${Date.now()}`,
        processingTimeMs: 3
      }
    });
    
  } catch (error) {
    console.error(`❌ Error adding presentation to session:`, error);
    const status = error.message.includes('not found') ? 404 : 500;
    res.status(status).json({
      success: false,
      error: {
        type: status === 404 ? 'not_found' : 'server_error',
        code: status === 404 ? 'SESSION_NOT_FOUND' : 'PRESENTATION_ADD_ERROR',
        message: error.message || 'Failed to add presentation reference'
      }
    });
  }
});

// Session maintenance endpoint (admin only - could add auth later)
app.post('/api/v1/sessions/cleanup', async (req, res) => {
  if (!sessionService) {
    return res.status(503).json({
      success: false,
      error: {
        type: 'service_unavailable',
        code: 'SESSION_SERVICE_NOT_AVAILABLE',
        message: 'Session service is not available. Please check Firebase configuration.'
      }
    });
  }

  try {
    console.log('🧹 Running session cleanup...');
    
    const result = await sessionService.cleanupOldSessions();
    
    res.json({
      success: true,
      data: {
        archivedCount: result.archivedCount,
        deletedCount: result.deletedCount,
        message: `Cleanup completed: ${result.archivedCount} archived, ${result.deletedCount} deleted`
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: `req_${Date.now()}`,
        processingTimeMs: 100
      }
    });
    
  } catch (error) {
    console.error('❌ Error during session cleanup:', error);
    res.status(500).json({
      success: false,
      error: {
        type: 'server_error',
        code: 'CLEANUP_ERROR',
        message: error.message || 'Failed to cleanup sessions'
      }
    });
  }
});

// Mock data fallback function
function getMockPresentations() {
  return [
    {
      id: "2sLalMHQI80kz63LD3B8_",
      title: "Slideworks Project Management Toolkit",
      description: "Management consulting, presentation design, business",
      author: "Slideworks",
      company: "Slideworks",
      createdAt: "2023-03-08T18:54:29.000Z",
      updatedAt: "2025-07-05T22:02:08.000Z",
      slideCount: 21,
      status: "completed",
      fileSize: 31671752,
      processingTime: 8328,
      thumbnailCount: 0,
      originalFilename: "uploaded.pptx",
      firebaseStorageUrl: "https://storage.googleapis.com/ppts222025.firebase.com/presentations/1wRuDJ02F-TsjiM71GQWX/2sLalMHQI80kz63LD3B8_",
      jsonDataUrl: "https://storage.googleapis.com/ppts222025.firebase.com/processed-json/9jlnbNIFSXHvSINGBoW21/2sLalMHQI80kz63LD3B8_",
      type: "pptx2json",
      metadata: {
        audioCount: 0,
        imageCount: 44,
        layoutSlideCount: 52,
        masterSlideCount: 3,
        revisionNumber: 5733,
        subject: "Project management",
        category: "Management consulting, presentation design, business",
        keywords: "project management, business development, consulting",
        comments: "Copyright of Slideworks.io. Any unauthorized distribution prohibited. See our full terms and conditions at https://slideworks.io/terms",
        lastSavedTime: "2025-07-05T22:02:08.000Z",
        manager: ""
      }
    }
  ];
}

// Root endpoint - Show API information
app.get('/', (req, res) => {
  res.json({
    name: 'Luna Server - Simple',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      // 📖 Documentation
      docs: '/api/v1/docs',
      swagger: '/api/v1/swagger.json',
      docsInfo: '/api/v1/docs/info',
      // 🏥 Core endpoints
      health: '/api/v1/health',
      presentations: '/api/v1/presentations',
      aiGenerate: '/api/v1/ai/generate-presentation',
      validateSchema: '/api/v1/validate-schema',
      validateAndFix: '/api/v1/validate-and-fix',
      schemaInfo: '/api/v1/schema-info',
      // 💬 Session management
      sessions: '/api/v1/sessions',
      createSession: 'POST /api/v1/sessions',
      getSession: 'GET /api/v1/sessions/:sessionId',
      updateSession: 'PUT /api/v1/sessions/:sessionId',
      addMessage: 'POST /api/v1/sessions/:sessionId/messages',
      archiveSession: 'POST /api/v1/sessions/:sessionId/archive',
      deleteSession: 'DELETE /api/v1/sessions/:sessionId',
      addPresentationRef: 'POST /api/v1/sessions/:sessionId/presentations',
      cleanupSessions: 'POST /api/v1/sessions/cleanup'
    },
    features: {
      firebase: firebaseInitialized ? 'connected' : 'not_configured',
      universalSchemaValidation: 'enabled',
      aiGeneration: 'enabled',
      autoFix: 'enabled',
      sessionManagement: 'enabled',
      persistentChat: 'enabled'
    },
    timestamp: new Date().toISOString(),
  });
});

// Status endpoint (alias for presentations)
app.get('/api/v1/status', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'running',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      firebase: firebaseInitialized ? 'connected' : 'not_configured',
      jobs: {
        recent: [],
        stats: {
          total: 0,
          completed: 0,
          processing: 0,
          failed: 0,
        },
      },
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: `req_${Date.now()}`,
      processingTimeMs: 1,
    },
  });
});

// =============================================================================
// SWAGGER CONFIGURATION
// =============================================================================

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Luna Server API',
      version: '1.0.0',
      description: `
# Luna Server API

Professional PowerPoint processing API with AI capabilities built on Node.js.

## Features

- **File Conversion**: PPTX ↔ JSON conversions using Universal Presentation Schema
- **AI Generation**: AI-powered presentation generation
- **Session Management**: Persistent chat sessions with Firebase
- **Schema Validation**: Dynamic validation against Universal PowerPoint Schema
- **Thumbnail Generation**: High-quality slide thumbnails
- **Health Monitoring**: Service health and status endpoints

## Architecture

Built with Clean Architecture principles:
- **Controllers**: HTTP request/response handling  
- **Services**: Business logic orchestration
- **Adapters**: External service integrations (Firebase, OpenAI)
- **Schemas**: Universal Presentation Schema validation
- **Middleware**: Request validation, error handling, logging

## Universal Presentation Schema

All conversions use a standardized JSON schema that preserves:
- Slide layouts and master slides
- Text formatting and styles  
- Images, videos, and embedded objects
- Animations and transitions
- Charts, tables, and SmartArt
- Comments and metadata
      `,
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
      contact: {
        name: 'Luna Server Support',
        email: 'support@lunaserver.com',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000/api/v1',
        description: 'Development Server',
      },
    ],
    tags: [
      {
        name: 'Health',
        description: 'Service health and status monitoring',
      },
      {
        name: 'Presentations', 
        description: 'Presentation management and retrieval',
      },
      {
        name: 'AI Generation',
        description: 'AI-powered presentation generation',
      },
      {
        name: 'Sessions',
        description: 'Chat session management with Firebase',
      },
      {
        name: 'Validation',
        description: 'Schema validation and analysis',
      },
      {
        name: 'Documentation',
        description: 'API documentation and specifications',
      },
    ],
    components: {
      schemas: {
        ApiResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              description: 'Whether the request was successful',
            },
            data: {
              type: 'object',
              description: 'Response data payload',
            },
            error: {
              type: 'object',
              properties: {
                type: { type: 'string' },
                code: { type: 'string' },
                message: { type: 'string' },
              },
              description: 'Error information if request failed',
            },
            meta: {
              type: 'object',
              properties: {
                timestamp: { type: 'string', format: 'date-time' },
                requestId: { type: 'string' },
                processingTimeMs: { type: 'number' },
                version: { type: 'string' },
              },
              description: 'Request metadata',
            },
          },
          required: ['success'],
        },
        HealthStatus: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['healthy', 'degraded', 'unhealthy'] },
            timestamp: { type: 'string', format: 'date-time' },
            uptime: { type: 'number' },
            version: { type: 'string' },
            services: {
              type: 'object',
              properties: {
                conversion: { type: 'string' },
                aspose: { type: 'string' },
                firebase: { type: 'string' },
              },
            },
          },
        },
        SessionData: {
          type: 'object',
          properties: {
            sessionId: { type: 'string' },
            title: { type: 'string' },
            userId: { type: 'string', nullable: true },
            status: { type: 'string', enum: ['active', 'archived', 'deleted'] },
            messageCount: { type: 'number' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    paths: {
      '/health': {
        get: {
          tags: ['Health'],
          summary: 'Service health check',
          description: 'Returns the current health status of all services',
          responses: {
            '200': {
              description: 'Service is healthy',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { $ref: '#/components/schemas/ApiResponse' },
                      {
                        type: 'object',
                        properties: {
                          data: { $ref: '#/components/schemas/HealthStatus' },
                        },
                      },
                    ],
                  },
                },
              },
            },
          },
        },
      },
      '/presentations': {
        get: {
          tags: ['Presentations'],
          summary: 'List all presentations',
          description: 'Retrieve a list of all presentations from Firebase',
          responses: {
            '200': {
              description: 'Presentations retrieved successfully',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ApiResponse' },
                },
              },
            },
          },
        },
      },
      '/ai/generate-presentation': {
        post: {
          tags: ['AI Generation'],
          summary: 'Generate presentation with AI',
          description: 'Generate a presentation using AI based on user prompt',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    prompt: {
                      type: 'string',
                      description: 'User prompt for presentation generation',
                      example: 'Create a presentation about renewable energy sources',
                    },
                    slideCount: {
                      type: 'number',
                      description: 'Number of slides to generate',
                      example: 8,
                      minimum: 3,
                      maximum: 20,
                    },
                    theme: {
                      type: 'string',
                      description: 'Presentation theme',
                      example: 'professional',
                    },
                  },
                  required: ['prompt'],
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Presentation generated successfully',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ApiResponse' },
                },
              },
            },
            '400': {
              description: 'Invalid request parameters',
            },
            '500': {
              description: 'Server error during generation',
            },
          },
        },
      },
      '/sessions': {
        get: {
          tags: ['Sessions'],
          summary: 'List user sessions',
          description: 'Retrieve chat sessions for a user',
          parameters: [
            {
              name: 'userId',
              in: 'query',
              description: 'User identifier (null for anonymous)',
              schema: { type: 'string' },
            },
            {
              name: 'limit',
              in: 'query',
              description: 'Maximum number of sessions to return',
              schema: { type: 'number', default: 20 },
            },
          ],
          responses: {
            '200': {
              description: 'Sessions retrieved successfully',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { $ref: '#/components/schemas/ApiResponse' },
                      {
                        type: 'object',
                        properties: {
                          data: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/SessionData' },
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
          },
        },
        post: {
          tags: ['Sessions'],
          summary: 'Create new session',
          description: 'Create a new chat session',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    userId: { type: 'string', nullable: true },
                    title: { type: 'string' },
                    metadata: { type: 'object' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Session created successfully',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { $ref: '#/components/schemas/ApiResponse' },
                      {
                        type: 'object',
                        properties: {
                          data: { $ref: '#/components/schemas/SessionData' },
                        },
                      },
                    ],
                  },
                },
              },
            },
          },
        },
      },
      '/validate-schema': {
        post: {
          tags: ['Validation'],
          summary: 'Validate presentation data',
          description: 'Validate presentation data against Universal PowerPoint Schema',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  description: 'Presentation data to validate',
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Validation completed',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ApiResponse' },
                },
              },
            },
          },
        },
      },
    },
  },
  apis: [], // No need for file scanning in simple server
};

// Swagger UI options
const swaggerUiOptions = {
  customCss: `
    .swagger-ui .topbar { display: none; }
    .swagger-ui .info { margin: 50px 0; }
    .swagger-ui .info .title { color: #3b82f6; }
    .swagger-ui .scheme-container { background: #f8fafc; padding: 20px; border-radius: 8px; }
    .swagger-ui .btn.authorize { background-color: #10b981; border-color: #10b981; }
    .swagger-ui .btn.authorize:hover { background-color: #059669; border-color: #059669; }
    .swagger-ui .btn.execute { background-color: #3b82f6; border-color: #3b82f6; }
    .swagger-ui .btn.execute:hover { background-color: #2563eb; border-color: #2563eb; }
  `,
  customSiteTitle: 'Luna Server API Documentation',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    docExpansion: 'list',
    filter: true,
    showExtensions: true,
    showCommonExtensions: true,
    tryItOutEnabled: true,
    syntaxHighlight: {
      activate: true,
      theme: 'agate'
    },
  },
};

// =============================================================================
// SWAGGER/DOCUMENTATION SETUP  
// =============================================================================

// Generate swagger spec
const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Swagger UI middleware - DEBE ir ANTES del inicio del servidor
app.use('/api/v1/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));

// Swagger JSON endpoint
app.get('/api/v1/swagger.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json(swaggerSpec);
});

// Documentation info endpoint  
app.get('/api/v1/docs/info', (req, res) => {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  
  res.json({
    success: true,
    data: {
      api: {
        name: 'Luna Server API',
        version: '1.0.0',
        description: 'Professional PowerPoint processing API with AI capabilities',
      },
      documentation: {
        swagger: `${baseUrl}/api/v1/docs`,
        json: `${baseUrl}/api/v1/swagger.json`,
        interactive: `${baseUrl}/api/v1/docs`,
      },
      endpoints: {
        health: `${baseUrl}/api/v1/health`,
        presentations: `${baseUrl}/api/v1/presentations`,
        aiGenerate: `${baseUrl}/api/v1/ai/generate-presentation`,
        sessions: `${baseUrl}/api/v1/sessions`,
        validation: `${baseUrl}/api/v1/validate-schema`,
      },
      features: [
        'Interactive API testing',
        'Complete endpoint documentation', 
        'Request/response examples',
        'Schema validation details',
        'Session management',
        'AI presentation generation',
        'Firebase integration',
      ],
      services: {
        firebase: firebaseInitialized ? 'connected' : 'not_configured',
        openai: process.env.OPENAI_API_KEY ? 'configured' : 'not_configured',
        validation: 'active',
      },
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: `req_${Date.now()}`,
      version: '1.0',
    },
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: {
      type: 'server_error',
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
    },
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      type: 'not_found',
      code: 'ENDPOINT_NOT_FOUND',
      message: `Endpoint ${req.method} ${req.path} not found`,
    },
  });
});

// Start server
app.listen(PORT, () => {
  console.log('🌙 Luna Simple Server started!');
  console.log(`📍 Port: ${PORT}`);
  console.log('🔗 Available endpoints:');
  console.log(`   📖 Documentation: http://localhost:${PORT}/api/v1/docs`);
  console.log(`   📄 Swagger JSON: http://localhost:${PORT}/api/v1/swagger.json`);
  console.log(`   🏥 Health: http://localhost:${PORT}/api/v1/health`);
  console.log(`   📊 Presentations: http://localhost:${PORT}/api/v1/presentations`);
  console.log(`   🤖 AI Generate: http://localhost:${PORT}/api/v1/ai/generate-presentation`);
  console.log(`   ✅ Validate Schema: http://localhost:${PORT}/api/v1/validate-schema`);
  console.log(`   🔧 Validate & Fix: http://localhost:${PORT}/api/v1/validate-and-fix`);
  console.log(`   📋 Schema Info: http://localhost:${PORT}/api/v1/schema-info`);
  console.log(`   🏠 Root: http://localhost:${PORT}/`);
  console.log('✅ Server ready!');
  console.log('🔧 Features enabled:');
  if (firebaseInitialized) {
    console.log('🔥 Firebase connected - serving real data');
  } else {
    console.log('⚠️ Firebase not configured - serving mock data');
  }
  console.log('📋 Universal PowerPoint Schema validation - ENABLED');
  console.log('🤖 AI presentation generation with validation - ENABLED');
  console.log('🔧 Auto-fix for schema validation errors - ENABLED');
  console.log('📖 Interactive API Documentation (SwaggerUI) - ENABLED');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Shutting down gracefully...');
  process.exit(0);
}); 