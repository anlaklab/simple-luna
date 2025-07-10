/**
 * Async Extraction Service - Background processing for asset and metadata extraction
 * 
 * Handles long-running extraction tasks with job tracking and timeout management
 */

import { logger } from '../utils/logger';
import { JobsService, Job, JobCreateRequest } from './jobs.service';
import { FirebaseAdapter } from '../adapters/firebase.adapter';
import { AsposeAdapterRefactored } from '../adapters/aspose/AsposeAdapterRefactored';
import { UploadTierService } from './upload-tier.service';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import path from 'path';

// =============================================================================
// TYPES
// =============================================================================

interface AsyncExtractionConfig {
  jobsService: JobsService;
  firebaseAdapter?: FirebaseAdapter;
  asposeAdapter: AsposeAdapterRefactored;
  uploadTierService?: UploadTierService;
  defaultTimeout?: number; // Default 5 minutes
  maxConcurrentJobs?: number;
}

interface ExtractionJobData {
  type: 'extract-assets' | 'extract-metadata';
  filePath: string;
  originalFilename: string;
  options: any;
  userId?: string;
  timeoutMs: number;
}

interface ExtractionResult {
  success: boolean;
  data?: any;
  error?: string;
  processingTimeMs: number;
  uploadedAssets?: string[];
  firebaseUrls?: string[];
}

// =============================================================================
// ASYNC EXTRACTION SERVICE
// =============================================================================

export class AsyncExtractionService {
  private readonly jobsService: JobsService;
  private readonly firebaseAdapter?: FirebaseAdapter;
  private readonly asposeAdapter: AsposeAdapterRefactored;
  private readonly uploadTierService?: UploadTierService;
  private readonly config: AsyncExtractionConfig;
  
  // Job tracking
  private readonly activeJobs = new Map<string, NodeJS.Timeout>();
  private readonly jobQueue: string[] = [];
  private processingCount = 0;

  constructor(config: AsyncExtractionConfig) {
    this.config = {
      defaultTimeout: 5 * 60 * 1000, // 5 minutes
      maxConcurrentJobs: 3,
      ...config,
    };
    
    this.jobsService = config.jobsService;
    this.firebaseAdapter = config.firebaseAdapter;
    this.asposeAdapter = config.asposeAdapter;
    this.uploadTierService = config.uploadTierService;

    // Start job processor
    this.startJobProcessor();

    logger.info('Async Extraction Service initialized', {
      defaultTimeoutMs: this.config.defaultTimeout,
      maxConcurrentJobs: this.config.maxConcurrentJobs,
      hasFirebase: !!this.firebaseAdapter,
      hasTierService: !!this.uploadTierService,
    });
  }

  // =============================================================================
  // PUBLIC METHODS
  // =============================================================================

  /**
   * Queue an asset extraction job
   */
  async queueAssetExtraction(
    filePath: string,
    originalFilename: string,
    options: any,
    userId?: string,
    customTimeoutMs?: number
  ): Promise<string> {
    const jobData: ExtractionJobData = {
      type: 'extract-assets',
      filePath,
      originalFilename,
      options,
      userId,
      timeoutMs: customTimeoutMs || this.config.defaultTimeout!,
    };

    const job = await this.jobsService.createJob({
      type: 'extract-assets',
      userId,
      metadata: {
        originalFilename,
        options,
        timeoutMs: jobData.timeoutMs,
        queuedAt: new Date().toISOString(),
      },
    });

    // Store job data temporarily (in a production system, this could be in Redis or database)
    this.storeJobData(job.id, jobData);
    
    // Add to queue
    this.jobQueue.push(job.id);
    
    logger.info('Asset extraction job queued', {
      jobId: job.id,
      filename: originalFilename,
      userId,
      queueLength: this.jobQueue.length,
    });

    return job.id;
  }

  /**
   * Queue a metadata extraction job
   */
  async queueMetadataExtraction(
    filePath: string,
    originalFilename: string,
    options: any,
    userId?: string,
    customTimeoutMs?: number
  ): Promise<string> {
    const jobData: ExtractionJobData = {
      type: 'extract-metadata',
      filePath,
      originalFilename,
      options,
      userId,
      timeoutMs: customTimeoutMs || this.config.defaultTimeout!,
    };

    const job = await this.jobsService.createJob({
      type: 'extract-metadata',
      userId,
      metadata: {
        originalFilename,
        options,
        timeoutMs: jobData.timeoutMs,
        queuedAt: new Date().toISOString(),
      },
    });

    this.storeJobData(job.id, jobData);
    this.jobQueue.push(job.id);
    
    logger.info('Metadata extraction job queued', {
      jobId: job.id,
      filename: originalFilename,
      userId,
      queueLength: this.jobQueue.length,
    });

    return job.id;
  }

  /**
   * Get job status and result
   */
  async getJobStatus(jobId: string): Promise<Job | null> {
    return this.jobsService.getJob(jobId);
  }

  /**
   * Cancel a job
   */
  async cancelJob(jobId: string): Promise<boolean> {
    // Clear timeout if active
    const timeout = this.activeJobs.get(jobId);
    if (timeout) {
      clearTimeout(timeout);
      this.activeJobs.delete(jobId);
    }

    // Remove from queue
    const queueIndex = this.jobQueue.indexOf(jobId);
    if (queueIndex > -1) {
      this.jobQueue.splice(queueIndex, 1);
    }

    // Update job status
    await this.jobsService.updateJob(jobId, {
      status: 'failed',
      error: 'Job cancelled by user',
      progress: 0,
    });

    logger.info('Job cancelled', { jobId });
    return true;
  }

  /**
   * Get queue status
   */
  getQueueStatus(): {
    queueLength: number;
    processingCount: number;
    maxConcurrent: number;
    activeJobs: string[];
  } {
    return {
      queueLength: this.jobQueue.length,
      processingCount: this.processingCount,
      maxConcurrent: this.config.maxConcurrentJobs!,
      activeJobs: Array.from(this.activeJobs.keys()),
    };
  }

  // =============================================================================
  // PRIVATE METHODS - JOB PROCESSING
  // =============================================================================

  /**
   * Start the background job processor
   */
  private startJobProcessor(): void {
    setInterval(() => {
      this.processNextJob();
    }, 1000); // Check for jobs every second

    logger.info('Job processor started');
  }

  /**
   * Process the next job in queue
   */
  private async processNextJob(): Promise<void> {
    if (this.processingCount >= this.config.maxConcurrentJobs! || this.jobQueue.length === 0) {
      return;
    }

    const jobId = this.jobQueue.shift();
    if (!jobId) return;

    this.processingCount++;
    
    try {
      await this.processJob(jobId);
    } catch (error) {
      logger.error('Job processing failed', { error, jobId });
    } finally {
      this.processingCount--;
    }
  }

  /**
   * Process a specific job
   */
  private async processJob(jobId: string): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Get job data
      const jobData = this.getJobData(jobId);
      if (!jobData) {
        await this.jobsService.updateJob(jobId, {
          status: 'failed',
          error: 'Job data not found',
        });
        return;
      }

      logger.info('Starting job processing', {
        jobId,
        type: jobData.type,
        filename: jobData.originalFilename,
      });

      // Update job to processing
      await this.jobsService.updateJob(jobId, {
        status: 'processing',
        progress: 10,
      });

      // Set timeout
      const timeout = setTimeout(async () => {
        await this.timeoutJob(jobId);
      }, jobData.timeoutMs);
      
      this.activeJobs.set(jobId, timeout);

      // Process based on type
      let result: ExtractionResult;
      
      if (jobData.type === 'extract-assets') {
        result = await this.processAssetExtraction(jobId, jobData);
      } else {
        result = await this.processMetadataExtraction(jobId, jobData);
      }

      // Clear timeout
      clearTimeout(timeout);
      this.activeJobs.delete(jobId);

      // Complete job
      await this.jobsService.updateJob(jobId, {
        status: result.success ? 'completed' : 'failed',
        progress: 100,
        error: result.error,
        processingTimeMs: Date.now() - startTime,
        metadata: {
          result: result.data,
          uploadedAssets: result.uploadedAssets,
          firebaseUrls: result.firebaseUrls,
        },
      });

      logger.info('Job completed successfully', {
        jobId,
        success: result.success,
        processingTimeMs: result.processingTimeMs,
        assetsUploaded: result.uploadedAssets?.length || 0,
      });

    } catch (error) {
      // Clear timeout
      const timeout = this.activeJobs.get(jobId);
      if (timeout) {
        clearTimeout(timeout);
        this.activeJobs.delete(jobId);
      }

      await this.jobsService.updateJob(jobId, {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTimeMs: Date.now() - startTime,
      });

      logger.error('Job failed', { error, jobId });
    } finally {
      // Clean up job data
      this.cleanupJobData(jobId);
    }
  }

  /**
   * Process asset extraction
   */
  private async processAssetExtraction(jobId: string, jobData: ExtractionJobData): Promise<ExtractionResult> {
    const startTime = Date.now();
    
    try {
      // Update progress
      await this.jobsService.updateJob(jobId, { progress: 20 });

      // Extract assets using Aspose
      const assets = await this.asposeAdapter.extractAssets(jobData.filePath, {
        assetTypes: jobData.options.assetTypes || ['images', 'videos', 'audio'],
        returnFormat: 'urls',
        generateThumbnails: jobData.options.generateThumbnails || false,
      });

      await this.jobsService.updateJob(jobId, { progress: 60 });

      // Upload assets to Firebase if configured
      const uploadedAssets: string[] = [];
      const firebaseUrls: string[] = [];

      if (this.firebaseAdapter && assets.length > 0) {
        logger.info('Uploading assets to Firebase', { 
          jobId, 
          assetCount: assets.length 
        });

                 for (let i = 0; i < assets.length; i++) {
           const asset = assets[i];
           
           try {
             // Upload asset data if available
             if (asset.data && Buffer.isBuffer(asset.data)) {
               // Upload to Firebase
               const uploadPath = `extracted-assets/${jobId}/${asset.filename}`;
               const uploadResult = await this.firebaseAdapter.uploadFile(
                 asset.data,
                 asset.filename,
                 `image/${asset.format}`, // Create mimetype from format
                 {
                   metadata: {
                     originalName: asset.originalName,
                     extractionJobId: jobId,
                     assetType: asset.type,
                     slideIndex: asset.slideIndex,
                   },
                 }
               );

               uploadedAssets.push(asset.filename);
               firebaseUrls.push(uploadResult.url);
               
               // Update asset with Firebase URL
               asset.url = uploadResult.url;
             }
           } catch (uploadError) {
             logger.warn('Failed to upload asset', { 
               error: uploadError, 
               assetName: asset.filename,
               jobId 
             });
           }

          // Update progress
          const progress = 60 + Math.round((i + 1) / assets.length * 30);
          await this.jobsService.updateJob(jobId, { progress });
        }
      }

      const summary = {
        totalAssets: assets.length,
        byType: {
          images: assets.filter(a => a.type === 'image').length,
          videos: assets.filter(a => a.type === 'video').length,
          audio: assets.filter(a => a.type === 'audio').length,
          documents: assets.filter(a => a.type === 'document').length,
        },
        totalSize: assets.reduce((sum, asset) => sum + asset.size, 0),
        uploadedToFirebase: uploadedAssets.length,
      };

      return {
        success: true,
        data: {
          assets,
          summary,
        },
        processingTimeMs: Date.now() - startTime,
        uploadedAssets,
        firebaseUrls,
      };

    } catch (error) {
      logger.error('Asset extraction failed', { error, jobId });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Asset extraction failed',
        processingTimeMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Process metadata extraction
   */
  private async processMetadataExtraction(jobId: string, jobData: ExtractionJobData): Promise<ExtractionResult> {
    const startTime = Date.now();
    
    try {
      // Update progress
      await this.jobsService.updateJob(jobId, { progress: 30 });

             // Extract metadata using Aspose
       const metadata = await this.asposeAdapter.extractMetadata(jobData.filePath, {
         includeSystemProperties: jobData.options.includeSystemProperties !== false,
         includeCustomProperties: jobData.options.includeCustomProperties !== false,
         includeDocumentStatistics: jobData.options.includeDocumentStatistics !== false,
         includeRevisionHistory: jobData.options.includeRevisionHistory !== false,
       });

      await this.jobsService.updateJob(jobId, { progress: 80 });

      // Store metadata in Firebase if configured
      let metadataDocId: string | undefined;
      
      if (this.firebaseAdapter) {
        try {
          metadataDocId = uuidv4();
          await this.firebaseAdapter.createDocument('extracted_metadata', metadataDocId, {
            jobId,
            originalFilename: jobData.originalFilename,
            extractedAt: new Date(),
            userId: jobData.userId,
            metadata,
          });

          logger.info('Metadata stored in Firebase', { 
            jobId, 
            metadataDocId 
          });
        } catch (storageError) {
          logger.warn('Failed to store metadata in Firebase', {
            error: storageError,
            jobId,
          });
        }
      }

      return {
        success: true,
        data: {
          ...metadata,
          metadataDocId,
        },
        processingTimeMs: Date.now() - startTime,
      };

    } catch (error) {
      logger.error('Metadata extraction failed', { error, jobId });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Metadata extraction failed',
        processingTimeMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Handle job timeout
   */
  private async timeoutJob(jobId: string): Promise<void> {
    this.activeJobs.delete(jobId);
    
    await this.jobsService.updateJob(jobId, {
      status: 'failed',
      error: 'Job timed out - processing took too long',
      progress: 0,
    });

    logger.warn('Job timed out', { jobId });
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  /**
   * Store job data temporarily (in production, use Redis or database)
   */
  private readonly jobDataStore = new Map<string, ExtractionJobData>();

  private storeJobData(jobId: string, data: ExtractionJobData): void {
    this.jobDataStore.set(jobId, data);
  }

  private getJobData(jobId: string): ExtractionJobData | undefined {
    return this.jobDataStore.get(jobId);
  }

  private cleanupJobData(jobId: string): void {
    this.jobDataStore.delete(jobId);
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    service: boolean;
    queue: boolean;
    firebase: boolean;
    overall: boolean;
    stats: {
      queueLength: number;
      processingCount: number;
      activeJobs: number;
    };
  }> {
    const health = {
      service: true,
      queue: this.jobQueue.length < 100, // Consider unhealthy if queue too long
      firebase: true,
      overall: false,
      stats: {
        queueLength: this.jobQueue.length,
        processingCount: this.processingCount,
        activeJobs: this.activeJobs.size,
      },
    };

    try {
      // Test Firebase if configured
      if (this.firebaseAdapter) {
        const firebaseHealth = await this.firebaseAdapter.healthCheck();
        health.firebase = firebaseHealth.overall;
      }

      health.overall = health.service && health.queue && health.firebase;
    } catch (error) {
      logger.error('Async extraction service health check failed', { error });
      health.service = false;
      health.overall = false;
    }

    return health;
  }
} 