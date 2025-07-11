/**
 * Jobs Service - Job tracking and management with Firestore
 * 
 * Manages job lifecycle, status tracking, and result persistence
 */

import { logger } from '../utils/logger';
import { FirebaseAdapter } from '../adapters/firebase.adapter';

export interface JobConfig {
  firebaseConfig?: {
    projectId: string;
    privateKey: string;
    clientEmail: string;
    storageBucket: string;
    databaseURL?: string;
  };
}

export interface Job {
  id: string;
  type: 'pptx2json' | 'json2pptx' | 'convertformat' | 'thumbnails' | 'aitranslate' | 'analyze' | 'extract-assets' | 'extract-metadata' | 'conversation' | 'upload';
  inputFileId?: string;
  inputJsonId?: string;
  resultFileId?: string;
  resultJsonId?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  userId?: string;
  progress?: number;
  error?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  processingTimeMs?: number;
}

export interface JobCreateRequest {
  type: Job['type'];
  userId?: string;
  inputFileId?: string;
  inputJsonId?: string;
  metadata?: Record<string, any>;
}

export interface JobUpdateRequest {
  status?: Job['status'];
  progress?: number;
  error?: string;
  resultFileId?: string;
  resultJsonId?: string;
  metadata?: Record<string, any>;
  processingTimeMs?: number;
}

export class JobsService {
  private readonly firebaseAdapter?: FirebaseAdapter;
  private readonly config: JobConfig;

  constructor(config: JobConfig) {
    this.config = config;
    
    if (config.firebaseConfig) {
      this.firebaseAdapter = new FirebaseAdapter(config.firebaseConfig);
    }

    logger.info('Jobs service initialized', {
      hasFirebase: !!this.firebaseAdapter,
    });
  }

  // =============================================================================
  // JOB MANAGEMENT
  // =============================================================================

  /**
   * Create a new job
   */
  async createJob(request: JobCreateRequest): Promise<Job> {
    const jobId = this.generateJobId();
    const now = new Date();

    const job: Job = {
      id: jobId,
      type: request.type,
      inputFileId: request.inputFileId,
      inputJsonId: request.inputJsonId,
      status: 'pending',
      userId: request.userId,
      progress: 0,
      metadata: request.metadata || {},
      createdAt: now,
      updatedAt: now,
    };

    // Save to Firestore if configured
    if (this.firebaseAdapter) {
      try {
        await this.firebaseAdapter.saveDocument('jobs', jobId, {
          ...job,
          createdAt: now,
          updatedAt: now,
        });
        
        logger.info('Job created and saved to Firestore', {
          jobId,
          type: job.type,
          userId: job.userId,
        });
      } catch (error) {
        logger.error('Failed to save job to Firestore', { error, jobId });
      }
    }

    return job;
  }

  /**
   * Update job status and metadata
   */
  async updateJob(jobId: string, updates: JobUpdateRequest): Promise<Job | null> {
    if (!this.firebaseAdapter) {
      logger.warn('Firebase not configured, cannot update job', { jobId });
      return null;
    }

    try {
      const now = new Date();
      const updateData: any = {
        ...updates,
        updatedAt: now,
      };

      // Set completion time if job is being completed
      if (updates.status === 'completed' || updates.status === 'failed') {
        updateData.completedAt = now;
      }

      await this.firebaseAdapter.updateDocument('jobs', jobId, updateData);

      // Fetch updated job
      const updatedJob = await this.getJob(jobId);
      
      logger.info('Job updated successfully', {
        jobId,
        status: updates.status,
        progress: updates.progress,
      });

      return updatedJob;
    } catch (error) {
      logger.error('Failed to update job', { error, jobId, updates });
      return null;
    }
  }

  /**
   * Get job by ID
   */
  async getJob(jobId: string): Promise<Job | null> {
    if (!this.firebaseAdapter) {
      logger.warn('Firebase not configured, cannot get job', { jobId });
      return null;
    }

    try {
      const doc = await this.firebaseAdapter.getDocument('jobs', jobId);
      
      if (!doc) {
        return null;
      }

      return {
        id: doc.id,
        type: doc.data.type,
        inputFileId: doc.data.inputFileId,
        inputJsonId: doc.data.inputJsonId,
        resultFileId: doc.data.resultFileId,
        resultJsonId: doc.data.resultJsonId,
        status: doc.data.status,
        userId: doc.data.userId,
        progress: doc.data.progress || 0,
        error: doc.data.error,
        metadata: doc.data.metadata || {},
        createdAt: doc.data.createdAt.toDate ? doc.data.createdAt.toDate() : new Date(doc.data.createdAt),
        updatedAt: doc.data.updatedAt.toDate ? doc.data.updatedAt.toDate() : new Date(doc.data.updatedAt),
        completedAt: doc.data.completedAt ? (doc.data.completedAt.toDate ? doc.data.completedAt.toDate() : new Date(doc.data.completedAt)) : undefined,
        processingTimeMs: doc.data.processingTimeMs,
      };
    } catch (error) {
      logger.error('Failed to get job', { error, jobId });
      return null;
    }
  }

  /**
   * Get jobs with filters
   */
  async getJobs(options: {
    userId?: string;
    type?: Job['type'];
    status?: Job['status'];
    limit?: number;
    offset?: number;
    orderBy?: 'createdAt' | 'updatedAt';
    orderDirection?: 'asc' | 'desc';
  } = {}): Promise<Job[]> {
    if (!this.firebaseAdapter) {
      logger.warn('Firebase not configured, cannot get jobs');
      return [];
    }

    try {
      const filters = [];
      
      if (options.userId) {
        filters.push({ field: 'userId', operator: '==', value: options.userId });
      }
      
      if (options.type) {
        filters.push({ field: 'type', operator: '==', value: options.type });
      }
      
      if (options.status) {
        filters.push({ field: 'status', operator: '==', value: options.status });
      }

      const docs = await this.firebaseAdapter.queryDocuments(
        'jobs',
        filters as any,
        options.limit || 50,
        options.orderBy ? { field: options.orderBy, direction: options.orderDirection || 'desc' } : undefined
      );

      return docs.map(doc => ({
        id: doc.id,
        type: doc.data.type,
        inputFileId: doc.data.inputFileId,
        inputJsonId: doc.data.inputJsonId,
        resultFileId: doc.data.resultFileId,
        resultJsonId: doc.data.resultJsonId,
        status: doc.data.status,
        userId: doc.data.userId,
        progress: doc.data.progress || 0,
        error: doc.data.error,
        metadata: doc.data.metadata || {},
        createdAt: doc.data.createdAt.toDate ? doc.data.createdAt.toDate() : new Date(doc.data.createdAt),
        updatedAt: doc.data.updatedAt.toDate ? doc.data.updatedAt.toDate() : new Date(doc.data.updatedAt),
        completedAt: doc.data.completedAt ? (doc.data.completedAt.toDate ? doc.data.completedAt.toDate() : new Date(doc.data.completedAt)) : undefined,
        processingTimeMs: doc.data.processingTimeMs,
      }));
    } catch (error) {
      logger.error('Failed to get jobs', { error, options });
      return [];
    }
  }

  /**
   * Delete job
   */
  async deleteJob(jobId: string): Promise<boolean> {
    if (!this.firebaseAdapter) {
      logger.warn('Firebase not configured, cannot delete job', { jobId });
      return false;
    }

    try {
      await this.firebaseAdapter.deleteDocument('jobs', jobId);
      
      logger.info('Job deleted successfully', { jobId });
      return true;
    } catch (error) {
      logger.error('Failed to delete job', { error, jobId });
      return false;
    }
  }

  /**
   * Calculate processing time and update job
   */
  async completeJob(jobId: string, result: { success: boolean; data?: any; error?: string }): Promise<Job | null> {
    const job = await this.getJob(jobId);
    if (!job) {
      return null;
    }

    const processingTimeMs = Date.now() - job.createdAt.getTime();
    
    const updates: JobUpdateRequest = {
      status: result.success ? 'completed' : 'failed',
      progress: 100,
      processingTimeMs,
    };

    if (result.error) {
      updates.error = result.error;
    }

    return this.updateJob(jobId, updates);
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  /**
   * Generate unique job ID
   */
  private generateJobId(): string {
    const timestamp = Date.now().toString(36);
    const randomStr = require('crypto').randomUUID().replace(/-/g, '').substring(0, 8);
    return `job_${timestamp}_${randomStr}`;
  }

  /**
   * Health check for jobs service
   */
  async healthCheck(): Promise<{
    service: boolean;
    firebase: boolean;
    overall: boolean;
  }> {
    const health = {
      service: true,
      firebase: false,
      overall: false,
    };

    try {
      // Test Firebase connection if configured
      if (this.firebaseAdapter) {
        const firebaseHealth = await this.firebaseAdapter.healthCheck();
        health.firebase = firebaseHealth.overall;
      } else {
        health.firebase = true; // Not configured, so not a failure
      }

      health.overall = health.service && health.firebase;
    } catch (error) {
      logger.error('Jobs service health check failed', { error });
      health.service = false;
      health.overall = false;
    }

    return health;
  }
} 