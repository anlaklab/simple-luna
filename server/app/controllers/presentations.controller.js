/**
 * Presentations Controller
 * 
 * Handles presentation CRUD operations and related functionality
 */

const { getFirestore, isFirebaseInitialized } = require('../../config/firebase');

/**
 * @swagger
 * /presentations:
 *   get:
 *     tags: [Presentations]
 *     summary: List all presentations
 *     description: Retrieve a list of all presentations from Firebase
 *     parameters:
 *       - name: limit
 *         in: query
 *         description: Maximum number of presentations to return
 *         schema:
 *           type: number
 *           default: 50
 *       - name: offset
 *         in: query
 *         description: Number of presentations to skip
 *         schema:
 *           type: number
 *           default: 0
 *     responses:
 *       200:
 *         description: Presentations retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
const getAllPresentations = async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    
    if (isFirebaseInitialized()) {
      const firestore = getFirestore();
      console.log('📊 Fetching presentations from Firebase...');
      
      try {
        let query = firestore.collection('presentation_json_data')
          .orderBy('updatedAt', 'desc')
          .limit(parseInt(limit));
        
        if (offset > 0) {
          const offsetSnapshot = await firestore.collection('presentation_json_data')
            .orderBy('updatedAt', 'desc')
            .limit(parseInt(offset))
            .get();
          
          if (!offsetSnapshot.empty) {
            const lastDoc = offsetSnapshot.docs[offsetSnapshot.docs.length - 1];
            query = query.startAfter(lastDoc);
          }
        }
        
        const snapshot = await query.get();
        const presentations = [];
        
        snapshot.forEach(doc => {
          const data = doc.data();
          presentations.push({
            id: doc.id,
            title: data.title || 'Untitled Presentation',
            description: data.description || '',
            status: data.status || 'unknown',
            slideCount: data.slideCount || data.data?.presentation?.metadata?.slideCount || 0,
            author: data.author || 'Unknown',
            company: data.company || '',
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: data.updatedAt || new Date().toISOString(),
            universalSchema: !!data.data?.presentation
          });
        });
        
        console.log(`✅ Found ${presentations.length} presentations in Firebase`);
        
        return res.json({
          success: true,
          data: presentations,
          count: presentations.length,
          pagination: {
            limit: parseInt(limit),
            offset: parseInt(offset),
            hasMore: presentations.length === parseInt(limit)
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: `req_${Date.now()}`,
            processingTimeMs: 50,
            dataSource: 'firebase',
          },
        });
      } catch (firebaseError) {
        console.error('Firebase error:', firebaseError);
        throw firebaseError;
      }
    } else {
      // Mock data when Firebase is not configured
      const mockPresentations = getMockPresentations();
      
      return res.json({
        success: true,
        data: mockPresentations.slice(offset, offset + limit),
        count: mockPresentations.length,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: (offset + limit) < mockPresentations.length
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: `req_${Date.now()}`,
          processingTimeMs: 5,
          dataSource: 'mock',
        },
      });
    }
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
};

/**
 * @swagger
 * /presentations/{id}:
 *   get:
 *     tags: [Presentations]
 *     summary: Get presentation by ID
 *     description: Retrieve a specific presentation by its ID
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Presentation ID
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Presentation retrieved successfully
 *       404:
 *         description: Presentation not found
 */
const getPresentationById = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (isFirebaseInitialized()) {
      const firestore = getFirestore();
      console.log(`📄 Fetching presentation ${id} from Firebase...`);
      
      const doc = await firestore.collection('presentation_json_data').doc(id).get();
      
      if (!doc.exists) {
        return res.status(404).json({
          success: false,
          error: {
            type: 'not_found',
            code: 'PRESENTATION_NOT_FOUND',
            message: `Presentation with ID ${id} not found`,
          },
        });
      }
      
      const data = doc.data();
      const presentation = {
        id: doc.id,
        title: data.title || 'Untitled Presentation',
        description: data.description || '',
        status: data.status || 'unknown',
        slideCount: data.slideCount || data.data?.presentation?.metadata?.slideCount || 0,
        author: data.author || 'Unknown',
        company: data.company || '',
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString(),
        universalSchema: !!data.data?.presentation
      };
      
      return res.json({
        success: true,
        data: presentation,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: `req_${Date.now()}`,
          processingTimeMs: 25,
          dataSource: 'firebase',
        },
      });
    } else {
      // Mock response
      const mockPresentations = getMockPresentations();
      const presentation = mockPresentations.find(p => p.id === id);
      
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
      
      return res.json({
        success: true,
        data: presentation,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: `req_${Date.now()}`,
          processingTimeMs: 5,
          dataSource: 'mock',
        },
      });
    }
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
};

/**
 * @swagger
 * /presentations/{id}/thumbnails:
 *   get:
 *     tags: [Presentations]
 *     summary: Get presentation thumbnails
 *     description: Retrieve thumbnails for a specific presentation
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Presentation ID
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Thumbnails retrieved successfully
 */
const getPresentationThumbnails = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (isFirebaseInitialized()) {
      const firestore = getFirestore();
      console.log(`🖼️ Fetching thumbnails for presentation ${id}...`);
      
      // Remove orderBy to avoid composite index requirement
      const snapshot = await firestore.collection('thumbnails')
        .where('presentationId', '==', id)
        .get();
      
      if (!snapshot.empty) {
        // Sort results by slideIndex in JavaScript instead of Firebase
        const thumbnailData = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            slideIndex: data.slideIndex || 0,
            url: data.url || data.thumbnailUrl,
            thumbnailUrl: data.thumbnailUrl || data.url,
            format: data.format || 'png',
            size: data.size || { width: 800, height: 600 },
            createdAt: data.createdAt
          };
        }).sort((a, b) => a.slideIndex - b.slideIndex);
        
        // Extract just the URLs for the response
        const thumbnails = thumbnailData.map(thumb => thumb.url).filter(Boolean);
        
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
    } else {
      // Mock response
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
    console.error('Firebase error fetching thumbnails:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch thumbnails',
      details: error.message,
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * @swagger
 * /json/{id}:
 *   get:
 *     tags: [Presentations]
 *     summary: Get Universal JSON for presentation
 *     description: Retrieve the Universal JSON schema data for a presentation
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Presentation ID
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Universal JSON retrieved successfully
 *       404:
 *         description: Presentation not found
 */
const getPresentationUniversalJson = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (isFirebaseInitialized()) {
      const firestore = getFirestore();
      console.log(`🔄 Fetching Universal JSON for ${id} from Firebase...`);
      
      const doc = await firestore.collection('presentation_json_data').doc(id).get();
      
      if (doc.exists) {
        const data = doc.data();
        
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
};

// Mock data function
function getMockPresentations() {
  return [
    {
      id: "mock_presentation_1",
      title: "Business Strategy 2024",
      description: "Annual business strategy presentation for 2024",
      status: "completed",
      slideCount: 25,
      author: "John Smith",
      company: "TechCorp Inc.",
      createdAt: "2024-01-15T10:00:00.000Z",
      updatedAt: "2024-01-15T14:30:00.000Z"
    },
    {
      id: "mock_presentation_2", 
      title: "Q1 Financial Results",
      description: "First quarter financial performance review",
      status: "completed",
      slideCount: 18,
      author: "Sarah Johnson",
      company: "FinanceGlobal Ltd.",
      createdAt: "2024-02-01T09:15:00.000Z",
      updatedAt: "2024-02-01T16:45:00.000Z"
    },
    {
      id: "mock_presentation_3",
      title: "Product Launch Campaign",
      description: "Marketing strategy for new product launch",
      status: "processing",
      slideCount: 32,
      author: "Mike Chen",
      company: "MarketingPro Agency",
      createdAt: "2024-02-10T11:30:00.000Z",
      updatedAt: "2024-02-10T13:20:00.000Z"
    }
  ];
}

module.exports = {
  getAllPresentations,
  getPresentationById,
  getPresentationThumbnails,
  getPresentationUniversalJson
}; 