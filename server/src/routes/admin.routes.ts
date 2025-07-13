import { z } from "zod";
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
 * @swagger
 * /upload:
 *   post:
 *     tags:
 *       - Utility
 *     summary: Upload file to Firebase Storage
 *     description: |
 *       Upload any file to Firebase Storage with automatic indexing in Firestore.
 *       This endpoint creates a job for tracking the upload process and stores
 *       file metadata for easy retrieval and management.
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
 *                 description: File to upload (max 50MB)
 *               folder:
 *                 type: string
 *                 description: Storage folder path
 *                 default: 'uploads'
 *                 example: 'presentations'
 *               makePublic:
 *                 type: boolean
 *                 description: Whether to make the file publicly accessible
 *                 default: false
 *             required:
 *               - file
 *           examples:
 *             presentation:
 *               summary: Upload presentation file
 *               value:
 *                 file: (binary)
 *                 folder: 'presentations'
 *                 makePublic: false
 *             public_document:
 *               summary: Upload public document
 *               value:
 *                 file: (binary)
 *                 folder: 'documents'
 *                 makePublic: true
 *     parameters:
 *       - in: header
 *         name: x-user-id
 *         schema:
 *           type: string
 *         description: User identifier for tracking uploads
 *         example: 'user_123'
 *     responses:
 *       200:
 *         description: File uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     fileId:
 *                       type: string
 *                       description: Unique file identifier in Firestore
 *                       example: 'file_1705316200000_abc12345'
 *                     jobId:
 *                       type: string
 *                       description: Job identifier for tracking the upload
 *                       example: 'job_upload_def67890'
 *                     file:
 *                       type: object
 *                       properties:
 *                         filename:
 *                           type: string
 *                           description: Generated filename in storage
 *                           example: 'presentation_2024-01-15T10-30-00.pptx'
 *                         originalName:
 *                           type: string
 *                           description: Original filename
 *                           example: 'my-presentation.pptx'
 *                         size:
 *                           type: number
 *                           description: File size in bytes
 *                           example: 2048576
 *                         contentType:
 *                           type: string
 *                           description: MIME type
 *                           example: 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
 *                         url:
 *                           type: string
 *                           format: uri
 *                           description: Direct access URL (if public)
 *                         downloadUrl:
 *                           type: string
 *                           format: uri
 *                           description: Signed download URL
 *                     uploadStats:
 *                       type: object
 *                       properties:
 *                         folder:
 *                           type: string
 *                         makePublic:
 *                           type: boolean
 *                         uploadTimeMs:
 *                           type: number
 *                           description: Upload processing time
 *                 meta:
 *                   $ref: '#/components/schemas/SuccessMeta'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       413:
 *         $ref: '#/components/responses/FileTooLarge'
 *       503:
 *         $ref: '#/components/responses/ServiceUnavailable'
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
    const fileId = `file_${Date.now()}_${require('crypto').randomUUID().replace(/-/g, '').substring(0, 8)}`;
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
 * @swagger
 * /file/{id}:
 *   get:
 *     tags:
 *       - Utility
 *     summary: Retrieve file metadata and download URL
 *     description: |
 *       Get comprehensive file metadata and signed download URL for a file stored in Firebase Storage.
 *       This endpoint provides all information needed to access and manage uploaded files.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: File identifier in Firestore
 *         example: 'file_1705316200000_abc12345'
 *     responses:
 *       200:
 *         description: File metadata retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: File identifier
 *                       example: 'file_1705316200000_abc12345'
 *                     filename:
 *                       type: string
 *                       description: Generated filename in storage
 *                       example: 'presentation_2024-01-15T10-30-00.pptx'
 *                     originalName:
 *                       type: string
 *                       description: Original filename when uploaded
 *                       example: 'my-presentation.pptx'
 *                     size:
 *                       type: number
 *                       description: File size in bytes
 *                       example: 2048576
 *                     contentType:
 *                       type: string
 *                       description: MIME type
 *                       example: 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
 *                     url:
 *                       type: string
 *                       format: uri
 *                       description: Direct access URL (if public)
 *                     downloadUrl:
 *                       type: string
 *                       format: uri
 *                       description: Signed download URL (always accessible)
 *                     folder:
 *                       type: string
 *                       description: Storage folder
 *                       example: 'presentations'
 *                     makePublic:
 *                       type: boolean
 *                       description: Whether file is publicly accessible
 *                     userId:
 *                       type: string
 *                       description: User who uploaded the file
 *                     jobId:
 *                       type: string
 *                       description: Associated upload job ID
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       description: Upload timestamp
 *                     metadata:
 *                       type: object
 *                       description: Additional file metadata
 *                 meta:
 *                   $ref: '#/components/schemas/SuccessMeta'
 *       404:
 *         description: File not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       503:
 *         $ref: '#/components/responses/ServiceUnavailable'
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
 * @swagger
 * /job/{id}:
 *   get:
 *     tags:
 *       - Utility
 *     summary: Retrieve job status and results
 *     description: |
 *       Get detailed information about a specific job including status, progress,
 *       results, and metadata. This endpoint is used to track the progress of
 *       asynchronous operations like file uploads and conversions.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Job identifier
 *         example: 'job_upload_def67890'
 *     responses:
 *       200:
 *         description: Job information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     job:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           example: 'job_upload_def67890'
 *                         type:
 *                           type: string
 *                           enum: [upload, pptx2json, json2pptx, convertformat, extract-assets, extract-metadata]
 *                           example: 'upload'
 *                         status:
 *                           type: string
 *                           enum: [pending, processing, completed, failed, cancelled]
 *                           example: 'completed'
 *                         progress:
 *                           type: number
 *                           minimum: 0
 *                           maximum: 100
 *                           description: Progress percentage
 *                           example: 100
 *                         error:
 *                           type: string
 *                           description: Error message (if status is failed)
 *                         inputFileId:
 *                           type: string
 *                           description: Input file identifier
 *                         inputJsonId:
 *                           type: string
 *                           description: Input JSON identifier
 *                         resultFileId:
 *                           type: string
 *                           description: Result file identifier
 *                         resultJsonId:
 *                           type: string
 *                           description: Result JSON identifier
 *                         userId:
 *                           type: string
 *                           description: User who created the job
 *                         createdAt:
 *                           type: string
 *                           format: date-time
 *                           description: Job creation timestamp
 *                         updatedAt:
 *                           type: string
 *                           format: date-time
 *                           description: Last update timestamp
 *                         completedAt:
 *                           type: string
 *                           format: date-time
 *                           description: Completion timestamp
 *                         processingTimeMs:
 *                           type: number
 *                           description: Total processing time in milliseconds
 *                         metadata:
 *                           type: object
 *                           description: Job-specific metadata
 *                 meta:
 *                   $ref: '#/components/schemas/SuccessMeta'
 *       404:
 *         description: Job not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         $ref: '#/components/responses/ServerError'
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
 * @swagger
 * /presentations:
 *   get:
 *     tags:
 *       - Utility
 *     summary: List presentations with filtering
 *     description: |
 *       Retrieve a filtered list of presentations based on job data from Firebase.
 *       This endpoint aggregates presentation-related jobs and provides a unified view
 *       of all presentations processed by the system with search and pagination.
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for presentation titles or filenames
 *         example: 'quarterly'
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, processing, completed, failed, cancelled]
 *         description: Filter by job status
 *         example: 'completed'
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *         description: Maximum number of presentations to return
 *         example: 20
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Number of presentations to skip for pagination
 *         example: 0
 *       - in: query
 *         name: orderBy
 *         schema:
 *           type: string
 *           enum: [createdAt, updatedAt]
 *           default: updatedAt
 *         description: Field to order results by
 *         example: 'updatedAt'
 *       - in: query
 *         name: orderDirection
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Order direction
 *         example: 'desc'
 *     responses:
 *       200:
 *         description: Presentations retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         description: Job/presentation identifier
 *                       type:
 *                         type: string
 *                         enum: [pptx2json, json2pptx, upload, convertformat]
 *                         description: Operation type
 *                       status:
 *                         type: string
 *                         enum: [pending, processing, completed, failed, cancelled]
 *                       title:
 *                         type: string
 *                         description: Presentation title or filename
 *                       description:
 *                         type: string
 *                         description: Presentation description
 *                       author:
 *                         type: string
 *                         description: User who created/uploaded the presentation
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                       completedAt:
 *                         type: string
 *                         format: date-time
 *                       slideCount:
 *                         type: number
 *                         description: Number of slides (if known)
 *                       fileSize:
 *                         type: number
 *                         description: File size in bytes
 *                       processingTimeMs:
 *                         type: number
 *                         description: Processing time in milliseconds
 *                       resultFileId:
 *                         type: string
 *                         description: Result file identifier
 *                       resultJsonId:
 *                         type: string
 *                         description: Result JSON identifier
 *                       error:
 *                         type: string
 *                         description: Error message (if status is failed)
 *                       progress:
 *                         type: number
 *                         description: Progress percentage
 *                       metadata:
 *                         type: object
 *                         description: Additional metadata
 *                 meta:
 *                   type: object
 *                   properties:
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                     requestId:
 *                       type: string
 *                     processingTimeMs:
 *                       type: number
 *                     version:
 *                       type: string
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: number
 *                           description: Total presentations matching filter
 *                         limit:
 *                           type: number
 *                         offset:
 *                           type: number
 *                         hasMore:
 *                           type: boolean
 *                           description: Whether there are more results
 *                     filters:
 *                       type: object
 *                       properties:
 *                         search:
 *                           type: string
 *                         status:
 *                           type: string
 *                         orderBy:
 *                           type: string
 *                         orderDirection:
 *                           type: string
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
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
      orderBy: (orderBy === 'createdAt' || orderBy === 'updatedAt') ? orderBy as 'createdAt' | 'updatedAt' : 'updatedAt',
      orderDirection: orderDirection as 'asc' | 'desc',
    });

    // Filter for presentation-related jobs
    const presentationJobs = jobs.filter(job => 
      job.type === 'pptx2json' || 
      job.type === 'json2pptx' || 
      job.type === 'upload' ||
      job.type === 'convertformat'
    );

    // Apply search filter if provided
    let filteredJobs = presentationJobs;
    if (search) {
      const searchTerm = async (search as string).toLowerCase();
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
 * @swagger
 * /status:
 *   get:
 *     tags:
 *       - Utility
 *     summary: Get system status and recent jobs
 *     description: |
 *       Retrieve comprehensive system status including recent job activity,
 *       performance statistics, and health information for monitoring
 *       the overall state of the Luna processing platform.
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Filter jobs by user ID
 *         example: 'user_123'
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [upload, pptx2json, json2pptx, convertformat, extract-assets, extract-metadata]
 *         description: Filter jobs by type
 *         example: 'pptx2json'
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, processing, completed, failed, cancelled]
 *         description: Filter jobs by status
 *         example: 'completed'
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Maximum number of recent jobs to return
 *         example: 20
 *     responses:
 *       200:
 *         description: System status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     system:
 *                       type: object
 *                       properties:
 *                         status:
 *                           type: string
 *                           enum: [healthy, degraded, unhealthy]
 *                           example: 'healthy'
 *                         services:
 *                           type: object
 *                           properties:
 *                             jobs:
 *                               type: string
 *                               enum: [healthy, degraded, unhealthy]
 *                               description: Jobs service status
 *                             firebase:
 *                               type: string
 *                               enum: [healthy, degraded, unhealthy]
 *                               description: Firebase service status
 *                         uptime:
 *                           type: number
 *                           description: Server uptime in seconds
 *                           example: 86400
 *                         memory:
 *                           type: object
 *                           properties:
 *                             rss:
 *                               type: number
 *                               description: Resident set size in bytes
 *                             heapTotal:
 *                               type: number
 *                               description: Total heap size in bytes
 *                             heapUsed:
 *                               type: number
 *                               description: Used heap size in bytes
 *                             external:
 *                               type: number
 *                               description: External memory usage in bytes
 *                         version:
 *                           type: string
 *                           example: '1.0'
 *                     jobs:
 *                       type: object
 *                       properties:
 *                         recent:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                               type:
 *                                 type: string
 *                                 enum: [upload, pptx2json, json2pptx, convertformat, extract-assets, extract-metadata]
 *                               status:
 *                                 type: string
 *                                 enum: [pending, processing, completed, failed, cancelled]
 *                               progress:
 *                                 type: number
 *                               createdAt:
 *                                 type: string
 *                                 format: date-time
 *                               updatedAt:
 *                                 type: string
 *                                 format: date-time
 *                               processingTimeMs:
 *                                 type: number
 *                               error:
 *                                 type: string
 *                         statistics:
 *                           type: object
 *                           properties:
 *                             total:
 *                               type: number
 *                               description: Total number of recent jobs
 *                             byStatus:
 *                               type: object
 *                               additionalProperties:
 *                                 type: number
 *                               description: Job count by status
 *                             byType:
 *                               type: object
 *                               additionalProperties:
 *                                 type: number
 *                               description: Job count by type
 *                             averageProcessingTime:
 *                               type: number
 *                               description: Average processing time in milliseconds
 *                 meta:
 *                   type: object
 *                   properties:
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                     requestId:
 *                       type: string
 *                     processingTimeMs:
 *                       type: number
 *                     version:
 *                       type: string
 *                     filters:
 *                       type: object
 *                       properties:
 *                         userId:
 *                           type: string
 *                         type:
 *                           type: string
 *                         status:
 *                           type: string
 *                         limit:
 *                           type: string
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
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