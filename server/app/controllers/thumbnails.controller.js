/**
 * Thumbnails Controller - Refactored with ThumbnailManager
 * 
 * Handles thumbnail generation with clear distinction between:
 * 1. PLACEHOLDERS: Text-based thumbnails from Universal JSON
 * 2. REAL THUMBNAILS: Image thumbnails from PPTX using Aspose.Slides
 * 
 * Features:
 * - Clean separation of concerns using ThumbnailManager
 * - Intelligent fallback strategies
 * - Firebase Storage integration
 * - Comprehensive error handling and logging
 */

const { getFirestore, isFirebaseInitialized } = require('../../config/firebase');
const ThumbnailManager = require('../../services/ThumbnailManager');
const path = require('path');
const fs = require('fs').promises;

// Initialize ThumbnailManager
const thumbnailManager = new ThumbnailManager();

/**
 * @swagger
 * /presentations/{id}/generate-thumbnails:
 *   post:
 *     tags: [Thumbnails]
 *     summary: Generate thumbnails for presentation
 *     description: |
 *       Generate thumbnails with intelligent strategy selection:
 *       - **REAL**: Image thumbnails using Aspose.Slides from original PPTX
 *       - **PLACEHOLDER**: Text-based thumbnails from Universal JSON data
 *       - **AUTO**: Automatically choose best strategy based on availability
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Presentation ID
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [auto, real, placeholder]
 *                 default: auto
 *                 description: Generation strategy
 *               format:
 *                 type: string
 *                 enum: [png, jpg, webp]
 *                 default: png
 *               width:
 *                 type: number
 *                 default: 800
 *               height:
 *                 type: number
 *                 default: 600
 *               quality:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 100
 *                 default: 85
 *               forceRegenerate:
 *                 type: boolean
 *                 default: false
 *                 description: Force regeneration even if thumbnails exist
 *     responses:
 *       200:
 *         description: Thumbnails generated successfully
 *       400:
 *         description: Invalid request
 *       404:
 *         description: Presentation not found
 *       500:
 *         description: Generation failed
 */
const generateThumbnails = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      type = 'auto',
      format = 'png', 
      width = 800, 
      height = 600, 
      quality = 85,
      forceRegenerate = false 
    } = req.body;

    console.log(`🖼️ ThumbnailController: Generate request for ${id}`);
    console.log(`🎯 Strategy: ${type}, Format: ${format}, Size: ${width}x${height}, Quality: ${quality}`);
    console.log(`🔄 Force regenerate: ${forceRegenerate}`);

    // Get presentation data from Firebase
    if (!isFirebaseInitialized()) {
      throw new Error('Firebase not initialized');
    }

    const firestore = getFirestore();
    const presentationDoc = await firestore.collection('presentation_json_data').doc(id).get();

    if (!presentationDoc.exists) {
      return res.status(404).json({
        success: false,
        error: {
          type: 'not_found',
          code: 'PRESENTATION_NOT_FOUND',
          message: `Presentation ${id} not found`
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.requestId
        }
      });
    }

    const presentationData = presentationDoc.data();
    console.log(`📊 Found presentation: "${presentationData.title}" (${presentationData.slideCount} slides)`);

    // Determine original file path if available
    let originalFilePath = null;
    if (presentationData.uploadedFile && presentationData.uploadedFile.filename) {
      originalFilePath = path.join(__dirname, '../../temp/uploads', presentationData.uploadedFile.filename);
      
      try {
        await fs.access(originalFilePath);
        console.log(`📁 Original file available: ${path.basename(originalFilePath)}`);
      } catch {
        console.log(`⚠️ Original file not accessible: ${path.basename(originalFilePath)}`);
        originalFilePath = null;
      }
    }

    // Generate thumbnails using ThumbnailManager
    const result = await thumbnailManager.generateThumbnails({
      presentationId: id,
      presentationData,
      originalFilePath,
      type,
      format: { format, width, height, quality },
      forceRegenerate
    });

    // Prepare response
    const response = {
      success: true,
      data: {
        presentationId: id,
        thumbnails: result.thumbnails,
        totalGenerated: result.thumbnails.length,
        type: result.type,
        fromCache: result.fromCache,
        strategy: result.metadata?.strategy || result.type,
        strategyReason: result.metadata?.reason || 'No reason provided',
        realThumbnails: result.type === 'real',
        format,
        size: { width, height },
        quality
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
        processingTimeMs: result.processingTimeMs,
        thumbnailType: result.type,
        generationMethod: result.metadata?.strategy || result.type
      }
    };

    console.log(`✅ ThumbnailController: Generated ${result.thumbnails.length} ${result.type} thumbnails in ${result.processingTimeMs}ms`);

    res.json(response);

  } catch (error) {
    console.error(`❌ ThumbnailController: Generation failed for ${req.params.id}:`, error.message);
    
    res.status(500).json({
      success: false,
      error: {
        type: 'server_error',
        code: 'THUMBNAIL_GENERATION_ERROR',
        message: 'Failed to generate thumbnails',
        details: error.message
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.requestId
      }
    });
  }
};

/**
 * @swagger
 * /presentations/{presentationId}/thumbnails:
 *   get:
 *     tags: [Thumbnails]
 *     summary: Get thumbnails for presentation
 *     description: Retrieve all existing thumbnails with type information
 *     parameters:
 *       - name: presentationId
 *         in: path
 *         required: true
 *         description: Presentation ID
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Thumbnails retrieved successfully
 *       404:
 *         description: No thumbnails found
 */
const getThumbnails = async (req, res) => {
  try {
    const { presentationId } = req.params;

    console.log(`📥 ThumbnailController: Getting thumbnails for ${presentationId}`);

    const thumbnails = await thumbnailManager.getThumbnails(presentationId);
    const stats = await thumbnailManager.getStats(presentationId);

    if (!thumbnails || thumbnails.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          type: 'not_found',
          code: 'THUMBNAILS_NOT_FOUND',
          message: `No thumbnails found for presentation ${presentationId}`
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.requestId
        }
      });
    }

    // Transform for consistent API response
    const responseData = thumbnails.map(thumbnail => thumbnail.url);

    console.log(`✅ ThumbnailController: Retrieved ${thumbnails.length} thumbnails (${stats.real} real, ${stats.placeholder} placeholder)`);

    res.json({
      success: true,
      data: responseData,
      count: thumbnails.length,
      timestamp: new Date().toISOString(),
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
        stats: {
          total: stats.total,
          real: stats.real,
          placeholder: stats.placeholder,
          primaryType: stats.real > 0 ? 'real' : 'placeholder'
        }
      }
    });

  } catch (error) {
    console.error(`❌ ThumbnailController: Get failed for ${req.params.presentationId}:`, error.message);
    
    res.status(500).json({
      success: false,
      error: {
        type: 'server_error',
        code: 'GET_THUMBNAILS_ERROR',
        message: 'Failed to retrieve thumbnails',
        details: error.message
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.requestId
      }
    });
  }
};

/**
 * @swagger
 * /presentations/{presentationId}/thumbnails:
 *   delete:
 *     tags: [Thumbnails]
 *     summary: Delete all thumbnails for presentation
 *     description: Remove all thumbnails and clean up storage
 *     parameters:
 *       - name: presentationId
 *         in: path
 *         required: true
 *         description: Presentation ID
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Thumbnails deleted successfully
 *       404:
 *         description: No thumbnails found
 */
const deleteThumbnails = async (req, res) => {
  try {
    const { presentationId } = req.params;

    console.log(`🗑️ ThumbnailController: Deleting thumbnails for ${presentationId}`);

    const stats = await thumbnailManager.getStats(presentationId);
    
    if (!stats.exists) {
      return res.status(404).json({
        success: false,
        error: {
          type: 'not_found',
          code: 'THUMBNAILS_NOT_FOUND',
          message: `No thumbnails found for presentation ${presentationId}`
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.requestId
        }
      });
    }

    await thumbnailManager.deleteThumbnails(presentationId);

    console.log(`✅ ThumbnailController: Deleted ${stats.total} thumbnails for ${presentationId}`);

    res.json({
      success: true,
      data: {
        presentationId,
        deletedCount: stats.total,
        deletedBreakdown: {
          real: stats.real,
          placeholder: stats.placeholder
        }
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.requestId
      }
    });

  } catch (error) {
    console.error(`❌ ThumbnailController: Delete failed for ${req.params.presentationId}:`, error.message);
    
    res.status(500).json({
      success: false,
      error: {
        type: 'server_error',
        code: 'DELETE_THUMBNAILS_ERROR',
        message: 'Failed to delete thumbnails',
        details: error.message
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.requestId
      }
    });
  }
};

/**
 * @swagger
 * /presentations/{presentationId}/thumbnails/stats:
 *   get:
 *     tags: [Thumbnails]
 *     summary: Get thumbnail statistics
 *     description: Get detailed statistics about thumbnails for a presentation
 *     parameters:
 *       - name: presentationId
 *         in: path
 *         required: true
 *         description: Presentation ID
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 */
const getThumbnailStats = async (req, res) => {
  try {
    const { presentationId } = req.params;

    console.log(`📊 ThumbnailController: Getting stats for ${presentationId}`);

    const stats = await thumbnailManager.getStats(presentationId);

    res.json({
      success: true,
      data: {
        presentationId,
        exists: stats.exists,
        total: stats.total,
        breakdown: {
          real: stats.real,
          placeholder: stats.placeholder
        },
        primaryType: stats.real > 0 ? 'real' : (stats.placeholder > 0 ? 'placeholder' : 'none'),
        lastUpdated: stats.lastUpdated
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.requestId
      }
    });

  } catch (error) {
    console.error(`❌ ThumbnailController: Stats failed for ${req.params.presentationId}:`, error.message);
    
    res.status(500).json({
      success: false,
      error: {
        type: 'server_error',
        code: 'STATS_ERROR',
        message: 'Failed to get thumbnail statistics',
        details: error.message
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.requestId
      }
    });
  }
};

/**
 * @swagger
 * /thumbnails/batch-generate:
 *   post:
 *     tags: [Thumbnails]
 *     summary: Batch generate thumbnails for multiple presentations
 *     description: Generate thumbnails for multiple presentations with the same settings
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               presentationIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 maxItems: 10
 *                 description: Array of presentation IDs (max 10)
 *               type:
 *                 type: string
 *                 enum: [auto, real, placeholder]
 *                 default: auto
 *               format:
 *                 type: string
 *                 enum: [png, jpg, webp]
 *                 default: png
 *               width:
 *                 type: number
 *                 default: 800
 *               height:
 *                 type: number
 *                 default: 600
 *               quality:
 *                 type: number
 *                 default: 85
 *               forceRegenerate:
 *                 type: boolean
 *                 default: false
 *             required: ['presentationIds']
 *     responses:
 *       200:
 *         description: Batch generation completed
 *       400:
 *         description: Invalid request parameters
 */
const batchGenerateThumbnails = async (req, res) => {
  try {
    const { 
      presentationIds, 
      type = 'auto',
      format = 'png', 
      width = 800, 
      height = 600, 
      quality = 85, 
      forceRegenerate = false 
    } = req.body;

    if (!Array.isArray(presentationIds) || presentationIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          type: 'validation_error',
          code: 'INVALID_PRESENTATION_IDS',
          message: 'presentationIds must be a non-empty array'
        }
      });
    }

    if (presentationIds.length > 10) {
      return res.status(400).json({
        success: false,
        error: {
          type: 'validation_error',
          code: 'TOO_MANY_PRESENTATIONS',
          message: 'Maximum 10 presentations allowed per batch request'
        }
      });
    }

    console.log(`🖼️ ThumbnailController: Batch generating for ${presentationIds.length} presentations`);
    const startTime = Date.now();
    const results = [];

    // Process each presentation
    for (const presentationId of presentationIds) {
      try {
        console.log(`📄 Processing presentation ${presentationId}...`);
        
        // Create mock request/response for individual generation
        const mockReq = {
          params: { id: presentationId },
          body: { type, format, width, height, quality, forceRegenerate },
          requestId: `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        };

        let result = null;
        const mockRes = {
          json: (data) => { result = data; },
          status: (code) => ({ 
            json: (data) => { 
              result = { statusCode: code, ...data }; 
            } 
          })
        };

        await generateThumbnails(mockReq, mockRes);
        
        results.push({
          presentationId,
          success: result?.success || false,
          thumbnailCount: result?.data?.totalGenerated || 0,
          type: result?.data?.type || 'unknown',
          error: result?.error?.message || null
        });

      } catch (error) {
        console.error(`❌ Failed to process ${presentationId}:`, error);
        results.push({
          presentationId,
          success: false,
          thumbnailCount: 0,
          type: 'error',
          error: error.message
        });
      }
    }

    const processingTimeMs = Date.now() - startTime;
    const successCount = results.filter(r => r.success).length;
    const totalThumbnails = results.reduce((sum, r) => sum + r.thumbnailCount, 0);

    console.log(`🎉 ThumbnailController: Batch completed: ${successCount}/${presentationIds.length} successful`);

    res.json({
      success: true,
      data: {
        batchId: `batch_${Date.now()}`,
        totalPresentations: presentationIds.length,
        successfulPresentations: successCount,
        failedPresentations: presentationIds.length - successCount,
        totalThumbnailsGenerated: totalThumbnails,
        results: results,
        settings: { type, format, width, height, quality }
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
        processingTimeMs: processingTimeMs,
        batchOperation: true
      }
    });

  } catch (error) {
    console.error('❌ ThumbnailController: Batch generation failed:', error);
    res.status(500).json({
      success: false,
      error: {
        type: 'server_error',
        code: 'BATCH_THUMBNAIL_ERROR',
        message: 'Batch thumbnail generation failed',
        details: error.message
      }
    });
  }
};

module.exports = {
  generateThumbnails,
  getThumbnails,
  deleteThumbnails,
  getThumbnailStats,
  batchGenerateThumbnails
}; 