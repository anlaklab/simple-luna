/**
 * Admin Routes - File uploads, job management, and system status
 * 
 * Handles file uploads to Firebase Storage, job tracking, and system monitoring
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import { JobsService } from '../services/jobs.service';
import { FirebaseAdapter } from '../adapters/firebase.adapter';
import { logger } from '../utils/logger';
import { handleAsyncErrors } from '../middleware/error.middleware';

// =============================================================================
// ROUTER SETUP
// =============================================================================

const router = Router();

// =============================================================================
// MULTER CONFIGURATION
// =============================================================================

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '52428800'), // 50MB default
  },
});

// =============================================================================
// SERVICES INITIALIZATION
// =============================================================================

const firebaseConfig = process.env.FIREBASE_PROJECT_ID ? {
  projectId: process.env.FIREBASE_PROJECT_ID,
  privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET!,
  
} : undefined;

const firebaseAdapter = firebaseConfig ? new FirebaseAdapter(firebaseConfig) : undefined;
const jobsService = new JobsService({ firebaseConfig });

// =============================================================================
// FILE UPLOAD ENDPOINTS
// =============================================================================

/**
 * POST /upload - Upload any file to Firebase Storage
 * 
 * @route POST /upload
 * @desc Upload file to Firebase Storage and index in Firestore
 * @access Public
 * @param {File} file - File to upload
 * @param {string} [folder] - Storage folder (optional)
 * @param {boolean} [makePublic] - Make file public (default: false)
 * @returns {Object} Upload result with file metadata and URLs
 */
router.post('/upload', upload.single('file'), handleAsyncErrors(async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();
  const requestId = `req_${Date.now()}`;

  try {
    if (!firebaseAdapter) {
      res.status(503).json({
        success: false,
        error: {
          type: 'service_unavailable',
          code: 'FIREBASE_NOT_CONFIGURED',
          message: 'Firebase Storage is not configured',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
          processingTimeMs: Date.now() - startTime,
        },
      });
      return;
    }

    if (!req.file) {
      res.status(400).json({
        success: false,
        error: {
          type: 'validation_error',
          code: 'NO_FILE_UPLOADED',
          message: 'No file was uploaded',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
          processingTimeMs: Date.now() - startTime,
        },
      });
      return;
    }

    const { folder = 'uploads', makePublic = false } = req.body;
    const userId = req.headers['x-user-id'] as string;

    // Create job for tracking
    const job = await jobsService.createJob({
      type: 'upload',
      userId,
      metadata: {
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
        folder,
        makePublic: Boolean(makePublic),
      },
    });

    // Update job status to processing
    await jobsService.updateJob(job.id, { status: 'processing', progress: 50 });

    // Upload file to Firebase Storage
    const uploadResult = await firebaseAdapter.uploadFile(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      {
        folder,
        makePublic: Boolean(makePublic),
        metadata: {
          jobId: job.id,
          userId,
          uploadedAt: new Date().toISOString(),
        },
      }
    );

    // Save file metadata to Firestore
    const fileId = `file_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    await firebaseAdapter.saveDocument('files', fileId, {
      filename: uploadResult.filename,
      originalName: req.file.originalname,
      path: uploadResult.path,
      url: uploadResult.url,
      downloadUrl: uploadResult.downloadUrl,
      size: uploadResult.size,
      contentType: uploadResult.contentType,
      folder,
      makePublic: Boolean(makePublic),
      userId,
      jobId: job.id,
      metadata: uploadResult.metadata,
      createdAt: new Date(),
    });

    // Complete job
    await jobsService.completeJob(job.id, {
      success: true,
      data: { fileId, uploadResult },
    });

    const processingTime = Date.now() - startTime;

    const response = {
      success: true,
      data: {
        fileId,
        jobId: job.id,
        file: {
          filename: uploadResult.filename,
          originalName: req.file.originalname,
          size: uploadResult.size,
          contentType: uploadResult.contentType,
          url: uploadResult.url,
          downloadUrl: uploadResult.downloadUrl,
        },
        uploadStats: {
          folder,
          makePublic: Boolean(makePublic),
          uploadTimeMs: processingTime,
        },
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
        processingTimeMs: processingTime,
        version: '1.0',
      },
    };

    logger.info('File uploaded successfully', {
      requestId,
      fileId,
      jobId: job.id,
      originalName: req.file.originalname,
      size: uploadResult.size,
      processingTimeMs: processingTime,
    });

    res.status(200).json(response);
  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    logger.error('File upload failed', { error, requestId, processingTimeMs: processingTime });

    res.status(500).json({
      success: false,
      error: {
        type: 'upload_error',
        code: 'UPLOAD_FAILED',
        message: error instanceof Error ? error.message : 'Upload failed',
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
        processingTimeMs: processingTime,
      },
    });
  }
}));

// =============================================================================
// FILE RETRIEVAL ENDPOINTS
// =============================================================================

/**
 * GET /file/:id - Retrieve file metadata and download URL by ID
 * 
 * @route GET /file/:id
 * @desc Get file metadata and signed download URL
 * @access Public
 * @param {string} id - File ID
 * @returns {Object} File metadata and download information
 */
router.get('/file/:id', handleAsyncErrors(async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();
  const requestId = `req_${Date.now()}`;
  const { id } = req.params;

  try {
    if (!firebaseAdapter) {
      res.status(503).json({
        success: false,
        error: {
          type: 'service_unavailable',
          code: 'FIREBASE_NOT_CONFIGURED',
          message: 'Firebase Storage is not configured',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
          processingTimeMs: Date.now() - startTime,
        },
      });
      return;
    }

    const fileDoc = await firebaseAdapter.getDocument('files', id);
    
    if (!fileDoc) {
      res.status(404).json({
        success: false,
        error: {
          type: 'not_found',
          code: 'FILE_NOT_FOUND',
          message: `File with ID ${id} not found`,
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
          processingTimeMs: Date.now() - startTime,
        },
      });
      return;
    }

    const fileData = fileDoc.data;
    const processingTime = Date.now() - startTime;

    const response = {
      success: true,
      data: {
        id: fileDoc.id,
        filename: fileData.filename,
        originalName: fileData.originalName,
        size: fileData.size,
        contentType: fileData.contentType,
        url: fileData.url,
        downloadUrl: fileData.downloadUrl,
        folder: fileData.folder,
        makePublic: fileData.makePublic,
        userId: fileData.userId,
        jobId: fileData.jobId,
        createdAt: fileData.createdAt?.toDate?.() || fileData.createdAt,
        metadata: fileData.metadata || {},
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
        processingTimeMs: processingTime,
        version: '1.0',
      },
    };

    logger.info('File retrieved successfully', {
      requestId,
      fileId: id,
      originalName: fileData.originalName,
      processingTimeMs: processingTime,
    });

    res.status(200).json(response);
  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    logger.error('File retrieval failed', { error, requestId, fileId: id, processingTimeMs: processingTime });

    res.status(500).json({
      success: false,
      error: {
        type: 'retrieval_error',
        code: 'FILE_RETRIEVAL_FAILED',
        message: error instanceof Error ? error.message : 'File retrieval failed',
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
        processingTimeMs: processingTime,
      },
    });
  }
}));

// =============================================================================
// JOB MANAGEMENT ENDPOINTS
// =============================================================================

/**
 * GET /job/:id - Retrieve job status and results by ID
 * 
 * @route GET /job/:id
 * @desc Get job status, progress, and results
 * @access Public
 * @param {string} id - Job ID
 * @returns {Object} Job information and status
 */
router.get('/job/:id', handleAsyncErrors(async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();
  const requestId = `req_${Date.now()}`;
  const { id } = req.params;

  try {
    const job = await jobsService.getJob(id);
    
    if (!job) {
      res.status(404).json({
        success: false,
        error: {
          type: 'not_found',
          code: 'JOB_NOT_FOUND',
          message: `Job with ID ${id} not found`,
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
          processingTimeMs: Date.now() - startTime,
        },
      });
      return;
    }

    const processingTime = Date.now() - startTime;

    const response = {
      success: true,
      data: {
        job: {
          id: job.id,
          type: job.type,
          status: job.status,
          progress: job.progress,
          error: job.error,
          inputFileId: job.inputFileId,
          inputJsonId: job.inputJsonId,
          resultFileId: job.resultFileId,
          resultJsonId: job.resultJsonId,
          userId: job.userId,
          createdAt: job.createdAt,
          updatedAt: job.updatedAt,
          completedAt: job.completedAt,
          processingTimeMs: job.processingTimeMs,
          metadata: job.metadata,
        },
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
        processingTimeMs: processingTime,
        version: '1.0',
      },
    };

    logger.info('Job retrieved successfully', {
      requestId,
      jobId: id,
      status: job.status,
      type: job.type,
      processingTimeMs: processingTime,
    });

    res.status(200).json(response);
  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    logger.error('Job retrieval failed', { error, requestId, jobId: id, processingTimeMs: processingTime });

    res.status(500).json({
      success: false,
      error: {
        type: 'retrieval_error',
        code: 'JOB_RETRIEVAL_FAILED',
        message: error instanceof Error ? error.message : 'Job retrieval failed',
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
        processingTimeMs: processingTime,
      },
    });
  }
}));

/**
 * GET /presentations - List all presentations (alias for status with specific filters)
 * 
 * @route GET /presentations
 * @desc Get all presentations stored in Firebase with pagination and filtering
 * @access Public
 * @query {string} [search] - Search term for presentation names
 * @query {string} [status] - Filter by status
 * @query {number} [limit] - Limit number of results (default: 50)
 * @query {number} [offset] - Offset for pagination
 * @returns {Object} List of presentations
 */
router.get('/presentations', handleAsyncErrors(async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();
  const requestId = `req_${Date.now()}`;

  try {
    const { 
      search, 
      status, 
      limit = '50', 
      offset = '0',
      orderBy = 'updatedAt',
      orderDirection = 'desc'
    } = req.query;

    // Get all jobs but filter for presentation-related types
    const jobs = await jobsService.getJobs({
      type: undefined, // Get all types, we'll filter client-side
      status: status as any,
      limit: parseInt(limit as string) + parseInt(offset as string), // Get more to account for filtering
      orderBy: orderBy as string,
      orderDirection: orderDirection as 'asc' | 'desc',
    });

    // Filter for presentation-related jobs
    const presentationJobs = jobs.filter(job => 
      job.type === 'pptx2json' || 
      job.type === 'json2pptx' || 
      job.type === 'upload' ||
      job.type === 'conversion'
    );

    // Apply search filter if provided
    let filteredJobs = presentationJobs;
    if (search) {
      const searchTerm = (search as string).toLowerCase();
      filteredJobs = presentationJobs.filter(job =>
        job.metadata?.originalName?.toLowerCase().includes(searchTerm) ||
        job.id.toLowerCase().includes(searchTerm) ||
        job.userId?.toLowerCase().includes(searchTerm)
      );
    }

    // Apply pagination
    const offsetNum = parseInt(offset as string);
    const limitNum = parseInt(limit as string);
    const paginatedJobs = filteredJobs.slice(offsetNum, offsetNum + limitNum);

    // Transform jobs to presentation format
    const presentations = paginatedJobs.map(job => ({
      id: job.id,
      type: job.type,
      status: job.status,
      title: job.metadata?.originalName || `Presentation ${job.id.slice(-8)}`,
      description: job.metadata?.description || '',
      author: job.userId || 'Anonymous',
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      completedAt: job.completedAt,
      slideCount: job.metadata?.slideCount || 0,
      fileSize: job.metadata?.fileSize || 0,
      processingTimeMs: job.processingTimeMs,
      resultFileId: job.resultFileId,
      resultJsonId: job.resultJsonId,
      error: job.error,
      progress: job.progress,
      metadata: job.metadata,
    }));

    const processingTime = Date.now() - startTime;

    const response = {
      success: true,
      data: presentations,
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
        processingTimeMs: processingTime,
        version: '1.0',
        pagination: {
          total: filteredJobs.length,
          limit: limitNum,
          offset: offsetNum,
          hasMore: offsetNum + limitNum < filteredJobs.length,
        },
        filters: { search, status, orderBy, orderDirection },
      },
    };

    logger.info('Presentations retrieved successfully', {
      requestId,
      presentationsCount: presentations.length,
      totalAvailable: filteredJobs.length,
      processingTimeMs: processingTime,
    });

    res.status(200).json(response);
  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    logger.error('Presentations retrieval failed', { error, requestId, processingTimeMs: processingTime });

    res.status(500).json({
      success: false,
      error: {
        type: 'retrieval_error',
        code: 'PRESENTATIONS_RETRIEVAL_FAILED',
        message: error instanceof Error ? error.message : 'Presentations retrieval failed',
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
        processingTimeMs: processingTime,
      },
    });
  }
}));

/**
 * GET /status - List recent jobs and system status
 * 
 * @route GET /status
 * @desc Get recent jobs and system health information
 * @access Public
 * @query {string} [userId] - Filter by user ID
 * @query {string} [type] - Filter by job type
 * @query {string} [status] - Filter by job status
 * @query {number} [limit] - Limit number of results (default: 20)
 * @returns {Object} System status and recent jobs
 */
router.get('/status', handleAsyncErrors(async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();
  const requestId = `req_${Date.now()}`;

  try {
    const { userId, type, status, limit = '20' } = req.query;

    // Get recent jobs
    const jobs = await jobsService.getJobs({
      userId: userId as string,
      type: type as any,
      status: status as any,
      limit: parseInt(limit as string),
      orderBy: 'updatedAt',
      orderDirection: 'desc',
    });

    // Calculate statistics
    const stats = {
      total: jobs.length,
      byStatus: jobs.reduce((acc, job) => {
        acc[job.status] = (acc[job.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      byType: jobs.reduce((acc, job) => {
        acc[job.type] = (acc[job.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      averageProcessingTime: jobs
        .filter(job => job.processingTimeMs)
        .reduce((sum, job) => sum + (job.processingTimeMs || 0), 0) / 
        Math.max(jobs.filter(job => job.processingTimeMs).length, 1),
    };

    // System health check
    const jobsHealth = await jobsService.healthCheck();
    const systemStatus = {
      status: jobsHealth.overall ? 'healthy' : 'degraded',
      services: {
        jobs: jobsHealth.service,
        firebase: jobsHealth.firebase,
      },
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: '1.0',
    };

    const processingTime = Date.now() - startTime;

    const response = {
      success: true,
      data: {
        system: systemStatus,
        jobs: {
          recent: jobs.map(job => ({
            id: job.id,
            type: job.type,
            status: job.status,
            progress: job.progress,
            createdAt: job.createdAt,
            updatedAt: job.updatedAt,
            processingTimeMs: job.processingTimeMs,
            error: job.error,
          })),
          statistics: stats,
        },
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
        processingTimeMs: processingTime,
        version: '1.0',
        filters: { userId, type, status, limit },
      },
    };

    logger.info('Status retrieved successfully', {
      requestId,
      jobsCount: jobs.length,
      systemStatus: systemStatus.status,
      processingTimeMs: processingTime,
    });

    res.status(200).json(response);
  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    logger.error('Status retrieval failed', { error, requestId, processingTimeMs: processingTime });

    res.status(500).json({
      success: false,
      error: {
        type: 'retrieval_error',
        code: 'STATUS_RETRIEVAL_FAILED',
        message: error instanceof Error ? error.message : 'Status retrieval failed',
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
        processingTimeMs: processingTime,
      },
    });
  }
}));

export default router; 