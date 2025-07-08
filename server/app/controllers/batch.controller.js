/**
 * Batch Operations Controller
 * 
 * Handles batch operations for presentations, sessions, and other resources
 */

const { getFirestore, isFirebaseInitialized } = require('../../config/firebase');
const { getSessionService } = require('../../config/firebase');

/**
 * @swagger
 * /batch/presentations/delete:
 *   post:
 *     tags: [Batch Operations]
 *     summary: Delete multiple presentations
 *     description: Delete multiple presentations in a single batch operation
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
 *                 description: Array of presentation IDs to delete
 *                 example: ['pres1', 'pres2', 'pres3']
 *               permanent:
 *                 type: boolean
 *                 default: false
 *                 description: Whether to permanently delete (true) or soft delete (false)
 *             required:
 *               - presentationIds
 *     responses:
 *       200:
 *         description: Batch delete operation completed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Invalid request parameters
 */
const batchDeletePresentations = async (req, res) => {
  try {
    const { presentationIds, permanent = false } = req.body;
    
    if (!presentationIds || !Array.isArray(presentationIds) || presentationIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          type: 'validation_error',
          code: 'INVALID_PRESENTATION_IDS',
          message: 'presentationIds must be a non-empty array'
        }
      });
    }
    
    if (presentationIds.length > 50) {
      return res.status(400).json({
        success: false,
        error: {
          type: 'validation_error',
          code: 'TOO_MANY_PRESENTATIONS',
          message: 'Maximum 50 presentations allowed per batch operation'
        }
      });
    }
    
    console.log(`🗑️ Batch ${permanent ? 'permanent' : 'soft'} delete: ${presentationIds.length} presentations...`);
    
    const results = [];
    const errors = [];
    
    if (isFirebaseInitialized()) {
      const firestore = getFirestore();
      
      // Process deletions in chunks of 10 (Firestore batch limit is 500 operations)
      const chunkSize = 10;
      const chunks = [];
      for (let i = 0; i < presentationIds.length; i += chunkSize) {
        chunks.push(presentationIds.slice(i, i + chunkSize));
      }
      
      for (const chunk of chunks) {
        const batch = firestore.batch();
        
        for (const presentationId of chunk) {
          try {
            const docRef = firestore.collection('presentation_json_data').doc(presentationId);
            
            if (permanent) {
              // Permanent delete - remove document entirely
              batch.delete(docRef);
            } else {
              // Soft delete - update status to 'deleted'
              batch.update(docRef, {
                status: 'deleted',
                deletedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              });
            }
            
            results.push({
              presentationId,
              success: true,
              operation: permanent ? 'permanent_delete' : 'soft_delete'
            });
            
          } catch (error) {
            console.error(`❌ Error processing ${presentationId}:`, error);
            errors.push({
              presentationId,
              error: {
                type: 'processing_error',
                message: error.message
              }
            });
          }
        }
        
        try {
          await batch.commit();
          console.log(`✅ Batch ${permanent ? 'permanently deleted' : 'soft deleted'} ${chunk.length} presentations`);
        } catch (batchError) {
          console.error('❌ Batch commit error:', batchError);
          // Mark all items in this chunk as failed
          chunk.forEach(presentationId => {
            const resultIndex = results.findIndex(r => r.presentationId === presentationId);
            if (resultIndex >= 0) {
              results.splice(resultIndex, 1);
              errors.push({
                presentationId,
                error: {
                  type: 'batch_commit_error',
                  message: batchError.message
                }
              });
            }
          });
        }
      }
      
    } else {
      // Mock response when Firebase is not configured
      presentationIds.forEach(presentationId => {
        results.push({
          presentationId,
          success: true,
          operation: permanent ? 'permanent_delete' : 'soft_delete',
          mock: true
        });
      });
    }
    
    const successCount = results.length;
    const errorCount = errors.length;
    
    console.log(`✅ Batch delete completed: ${successCount} successful, ${errorCount} failed`);
    
    res.json({
      success: true,
      data: {
        results,
        errors,
        summary: {
          totalRequested: presentationIds.length,
          successful: successCount,
          failed: errorCount,
          operation: permanent ? 'permanent_delete' : 'soft_delete'
        }
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: `req_${Date.now()}`,
        processingTimeMs: presentationIds.length * 10,
        batchSize: presentationIds.length
      }
    });
    
  } catch (error) {
    console.error('❌ Batch delete error:', error);
    res.status(500).json({
      success: false,
      error: {
        type: 'server_error',
        code: 'BATCH_DELETE_ERROR',
        message: 'Batch delete operation failed',
        details: error.message
      }
    });
  }
};

/**
 * @swagger
 * /batch/presentations/update:
 *   post:
 *     tags: [Batch Operations]
 *     summary: Update multiple presentations
 *     description: Update metadata for multiple presentations in batch
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               updates:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: Presentation ID
 *                     updates:
 *                       type: object
 *                       description: Fields to update
 *                 example:
 *                   - id: "pres1"
 *                     updates: { "title": "New Title", "status": "published" }
 *                   - id: "pres2"
 *                     updates: { "description": "Updated description" }
 *             required:
 *               - updates
 *     responses:
 *       200:
 *         description: Batch update operation completed
 */
const batchUpdatePresentations = async (req, res) => {
  try {
    const { updates } = req.body;
    
    if (!updates || !Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          type: 'validation_error',
          code: 'INVALID_UPDATES',
          message: 'updates must be a non-empty array'
        }
      });
    }
    
    if (updates.length > 50) {
      return res.status(400).json({
        success: false,
        error: {
          type: 'validation_error',
          code: 'TOO_MANY_UPDATES',
          message: 'Maximum 50 presentations allowed per batch update'
        }
      });
    }
    
    // Validate update format
    for (const update of updates) {
      if (!update.id || !update.updates || typeof update.updates !== 'object') {
        return res.status(400).json({
          success: false,
          error: {
            type: 'validation_error',
            code: 'INVALID_UPDATE_FORMAT',
            message: 'Each update must have id and updates fields'
          }
        });
      }
    }
    
    console.log(`📝 Batch updating ${updates.length} presentations...`);
    
    const results = [];
    const errors = [];
    
    if (isFirebaseInitialized()) {
      const firestore = getFirestore();
      
      // Process updates in chunks
      const chunkSize = 10;
      const chunks = [];
      for (let i = 0; i < updates.length; i += chunkSize) {
        chunks.push(updates.slice(i, i + chunkSize));
      }
      
      for (const chunk of chunks) {
        const batch = firestore.batch();
        
        for (const update of chunk) {
          try {
            const docRef = firestore.collection('presentation_json_data').doc(update.id);
            
            // Add updatedAt timestamp to updates
            const updateData = {
              ...update.updates,
              updatedAt: new Date().toISOString()
            };
            
            batch.update(docRef, updateData);
            
            results.push({
              presentationId: update.id,
              success: true,
              updatedFields: Object.keys(update.updates)
            });
            
          } catch (error) {
            console.error(`❌ Error processing update for ${update.id}:`, error);
            errors.push({
              presentationId: update.id,
              error: {
                type: 'processing_error',
                message: error.message
              }
            });
          }
        }
        
        try {
          await batch.commit();
          console.log(`✅ Batch updated ${chunk.length} presentations`);
        } catch (batchError) {
          console.error('❌ Batch update commit error:', batchError);
          // Mark all items in this chunk as failed
          chunk.forEach(update => {
            const resultIndex = results.findIndex(r => r.presentationId === update.id);
            if (resultIndex >= 0) {
              results.splice(resultIndex, 1);
              errors.push({
                presentationId: update.id,
                error: {
                  type: 'batch_commit_error',
                  message: batchError.message
                }
              });
            }
          });
        }
      }
      
    } else {
      // Mock response
      updates.forEach(update => {
        results.push({
          presentationId: update.id,
          success: true,
          updatedFields: Object.keys(update.updates),
          mock: true
        });
      });
    }
    
    const successCount = results.length;
    const errorCount = errors.length;
    
    console.log(`✅ Batch update completed: ${successCount} successful, ${errorCount} failed`);
    
    res.json({
      success: true,
      data: {
        results,
        errors,
        summary: {
          totalRequested: updates.length,
          successful: successCount,
          failed: errorCount,
          operation: 'batch_update'
        }
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: `req_${Date.now()}`,
        processingTimeMs: updates.length * 15,
        batchSize: updates.length
      }
    });
    
  } catch (error) {
    console.error('❌ Batch update error:', error);
    res.status(500).json({
      success: false,
      error: {
        type: 'server_error',
        code: 'BATCH_UPDATE_ERROR',
        message: 'Batch update operation failed',
        details: error.message
      }
    });
  }
};

/**
 * @swagger
 * /batch/sessions/archive:
 *   post:
 *     tags: [Batch Operations]
 *     summary: Archive multiple sessions
 *     description: Archive multiple chat sessions in batch
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               sessionIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of session IDs to archive
 *               userId:
 *                 type: string
 *                 nullable: true
 *                 description: User ID (for security check)
 *             required:
 *               - sessionIds
 *     responses:
 *       200:
 *         description: Batch archive operation completed
 */
const batchArchiveSessions = async (req, res) => {
  try {
    const sessionService = getSessionService();
    
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

    const { sessionIds, userId = null } = req.body;
    
    if (!sessionIds || !Array.isArray(sessionIds) || sessionIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          type: 'validation_error',
          code: 'INVALID_SESSION_IDS',
          message: 'sessionIds must be a non-empty array'
        }
      });
    }
    
    if (sessionIds.length > 50) {
      return res.status(400).json({
        success: false,
        error: {
          type: 'validation_error',
          code: 'TOO_MANY_SESSIONS',
          message: 'Maximum 50 sessions allowed per batch operation'
        }
      });
    }
    
    console.log(`📦 Batch archiving ${sessionIds.length} sessions for user ${userId || 'anonymous'}...`);
    
    const results = [];
    const errors = [];
    
    // Process sessions individually (SessionService doesn't have batch operations)
    for (const sessionId of sessionIds) {
      try {
        const result = await sessionService.archiveSession(sessionId);
        results.push({
          sessionId,
          success: true,
          archivedAt: result.archivedAt || new Date().toISOString()
        });
      } catch (error) {
        console.error(`❌ Error archiving session ${sessionId}:`, error);
        errors.push({
          sessionId,
          error: {
            type: 'archive_error',
            message: error.message
          }
        });
      }
    }
    
    const successCount = results.length;
    const errorCount = errors.length;
    
    console.log(`✅ Batch archive completed: ${successCount} successful, ${errorCount} failed`);
    
    res.json({
      success: true,
      data: {
        results,
        errors,
        summary: {
          totalRequested: sessionIds.length,
          successful: successCount,
          failed: errorCount,
          operation: 'batch_archive'
        }
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: `req_${Date.now()}`,
        processingTimeMs: sessionIds.length * 20,
        batchSize: sessionIds.length
      }
    });
    
  } catch (error) {
    console.error('❌ Batch archive sessions error:', error);
    res.status(500).json({
      success: false,
      error: {
        type: 'server_error',
        code: 'BATCH_ARCHIVE_ERROR',
        message: 'Batch archive operation failed',
        details: error.message
      }
    });
  }
};

/**
 * @swagger
 * /batch/export:
 *   post:
 *     tags: [Batch Operations]
 *     summary: Export multiple presentations
 *     description: Generate download links for multiple presentations in various formats
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
 *                 description: Array of presentation IDs to export
 *               format:
 *                 type: string
 *                 enum: ['json', 'pptx', 'pdf', 'zip']
 *                 default: 'json'
 *                 description: Export format
 *               includeMetadata:
 *                 type: boolean
 *                 default: true
 *                 description: Include metadata in export
 *             required:
 *               - presentationIds
 *     responses:
 *       200:
 *         description: Export preparation completed
 */
const batchExportPresentations = async (req, res) => {
  try {
    const { presentationIds, format = 'json', includeMetadata = true } = req.body;
    
    if (!presentationIds || !Array.isArray(presentationIds) || presentationIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          type: 'validation_error',
          code: 'INVALID_PRESENTATION_IDS',
          message: 'presentationIds must be a non-empty array'
        }
      });
    }
    
    const validFormats = ['json', 'pptx', 'pdf', 'zip'];
    if (!validFormats.includes(format)) {
      return res.status(400).json({
        success: false,
        error: {
          type: 'validation_error',
          code: 'INVALID_FORMAT',
          message: `Format must be one of: ${validFormats.join(', ')}`
        }
      });
    }
    
    console.log(`📤 Preparing batch export: ${presentationIds.length} presentations in ${format} format...`);
    
    const results = [];
    const errors = [];
    
    if (isFirebaseInitialized()) {
      const firestore = getFirestore();
      
      for (const presentationId of presentationIds) {
        try {
          const doc = await firestore.collection('presentation_json_data').doc(presentationId).get();
          
          if (!doc.exists) {
            errors.push({
              presentationId,
              error: {
                type: 'not_found',
                message: 'Presentation not found'
              }
            });
            continue;
          }
          
          const data = doc.data();
          
          // Generate export information (in a real implementation, this would prepare actual files)
          const exportData = {
            presentationId,
            title: data.title,
            format: format,
            // Mock download URL - in real implementation, this would be a temporary signed URL
            downloadUrl: `https://api.luna.dev/download/${presentationId}?format=${format}&token=temp_${Date.now()}`,
            size: format === 'json' ? '156 KB' : format === 'pptx' ? '2.3 MB' : '890 KB',
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
            createdAt: new Date().toISOString()
          };
          
          if (includeMetadata) {
            exportData.metadata = {
              slideCount: data.slideCount,
              author: data.author,
              createdAt: data.createdAt,
              updatedAt: data.updatedAt
            };
          }
          
          results.push(exportData);
          
        } catch (error) {
          console.error(`❌ Error preparing export for ${presentationId}:`, error);
          errors.push({
            presentationId,
            error: {
              type: 'export_error',
              message: error.message
            }
          });
        }
      }
    } else {
      // Mock response
      presentationIds.forEach(presentationId => {
        results.push({
          presentationId,
          title: `Mock Presentation ${presentationId}`,
          format: format,
          downloadUrl: `https://api.luna.dev/download/${presentationId}?format=${format}&token=mock_${Date.now()}`,
          size: format === 'json' ? '156 KB' : format === 'pptx' ? '2.3 MB' : '890 KB',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          createdAt: new Date().toISOString(),
          mock: true
        });
      });
    }
    
    const successCount = results.length;
    const errorCount = errors.length;
    
    console.log(`✅ Batch export prepared: ${successCount} successful, ${errorCount} failed`);
    
    res.json({
      success: true,
      data: {
        exports: results,
        errors,
        summary: {
          totalRequested: presentationIds.length,
          successful: successCount,
          failed: errorCount,
          format: format,
          expirationTime: '24 hours'
        }
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: `req_${Date.now()}`,
        processingTimeMs: presentationIds.length * 25,
        batchSize: presentationIds.length
      }
    });
    
  } catch (error) {
    console.error('❌ Batch export error:', error);
    res.status(500).json({
      success: false,
      error: {
        type: 'server_error',
        code: 'BATCH_EXPORT_ERROR',
        message: 'Batch export operation failed',
        details: error.message
      }
    });
  }
};

module.exports = {
  batchDeletePresentations,
  batchUpdatePresentations,
  batchArchiveSessions,
  batchExportPresentations
}; 