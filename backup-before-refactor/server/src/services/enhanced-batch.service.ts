/**
 * Enhanced Batch Service - High-performance batch processing with concurrency control
 * 
 * Optimized for large-scale operations with memory management and performance monitoring
 */

import pLimit from 'p-limit';
import { EventEmitter } from 'events';
import { logger } from '../utils/logger';
import { FirebaseAdapter } from '../adapters/firebase.adapter';
import { JobsService } from './jobs.service';
import { v4 as uuidv4 } from 'uuid';

// =============================================================================
// TYPES
// =============================================================================

interface EnhancedBatchConfig {
  maxConcurrency?: number;
  chunkSize?: number;
  memoryThreshold?: number; // MB
  retryAttempts?: number;
  retryDelay?: number; // ms
  progressUpdateInterval?: number; // ms
  enableMetrics?: boolean;
  maxMemoryUsage?: number; // MB
  jobTimeout?: number; // ms
  monitoringInterval?: number; // ms
}

interface BatchTask<T = any> {
  id: string;
  data: T;
  priority?: number;
  retryCount?: number;
  estimatedTime?: number; // ms
  memoryEstimate?: number; // MB
}

interface BatchJob<T = any> {
  id: string;
  type: string;
  tasks: BatchTask<T>[];
  config: EnhancedBatchConfig;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  progress: {
    total: number;
    completed: number;
    failed: number;
    skipped: number;
    percentage: number;
    tasksPerSecond: number;
    estimatedTimeRemaining: number;
  };
  metrics: BatchMetrics;
  startTime?: Date;
  endTime?: Date;
  errors: BatchError[];
  warnings: string[];
}

interface BatchMetrics {
  totalMemoryUsed: number; // MB
  peakMemoryUsage: number; // MB
  averageTaskTime: number; // ms
  concurrentTasksRunning: number;
  retryRate: number; // percentage
  throughput: number; // tasks per second
  cpuUsage: number; // percentage
  networkRequests: number;
  cacheHitRate: number; // percentage
}

interface BatchError {
  taskId: string;
  error: string;
  timestamp: Date;
  retryCount: number;
  context?: any;
}

interface BatchPerformanceReport {
  jobId: string;
  summary: {
    totalTasks: number;
    completedTasks: number;
    failedTasks: number;
    totalTime: number;
    averageTaskTime: number;
    throughput: number;
  };
  performance: {
    memoryUsage: {
      peak: number;
      average: number;
      current: number;
    };
    concurrency: {
      maxConcurrent: number;
      averageConcurrent: number;
      utilizationRate: number;
    };
    reliability: {
      successRate: number;
      retryRate: number;
      errorRate: number;
    };
  };
  recommendations: string[];
  bottlenecks: Array<{
    type: string;
    description: string;
    impact: 'low' | 'medium' | 'high';
    recommendation: string;
  }>;
}

// =============================================================================
// ENHANCED BATCH SERVICE
// =============================================================================

export class EnhancedBatchService extends EventEmitter {
  private readonly defaultConfig: EnhancedBatchConfig = {
    maxConcurrency: 5,
    chunkSize: 100,
    memoryThreshold: 500, // 500MB
    retryAttempts: 3,
    retryDelay: 1000, // 1 second
    progressUpdateInterval: 5000, // 5 seconds
    enableMetrics: true,
    maxMemoryUsage: 1024, // 1GB
    jobTimeout: 30 * 60 * 1000, // 30 minutes
    monitoringInterval: 10000, // 10 seconds
  };

  private readonly jobs = new Map<string, BatchJob>();
  private readonly activeLimits = new Map<string, any>();
  private readonly firebaseAdapter?: FirebaseAdapter;
  private readonly jobsService?: JobsService;
  private readonly performanceMonitor: NodeJS.Timeout;

  constructor(
    firebaseAdapter?: FirebaseAdapter,
    jobsService?: JobsService,
    config: Partial<EnhancedBatchConfig> = {}
  ) {
    super();
    
    this.firebaseAdapter = firebaseAdapter;
    this.jobsService = jobsService;
    this.defaultConfig = { ...this.defaultConfig, ...config };

    // Start performance monitoring
    this.performanceMonitor = setInterval(() => {
      this.monitorPerformance();
    }, this.defaultConfig.monitoringInterval!);

    logger.info('Enhanced Batch Service initialized', {
      maxConcurrency: this.defaultConfig.maxConcurrency,
      memoryThreshold: this.defaultConfig.memoryThreshold,
      enableMetrics: this.defaultConfig.enableMetrics,
    });
  }

  // =============================================================================
  // PUBLIC API
  // =============================================================================

  /**
   * Create and start a new batch job
   */
  async createBatchJob<T>(
    type: string,
    tasks: Array<{ id: string; data: T }>,
    processor: (task: BatchTask<T>) => Promise<any>,
    config: Partial<EnhancedBatchConfig> = {}
  ): Promise<string> {
    const jobId = uuidv4();
    const jobConfig = { ...this.defaultConfig, ...config };

    // Create batch tasks with priorities and estimates
    const batchTasks: BatchTask<T>[] = tasks.map((task, index) => ({
      id: task.id,
      data: task.data,
      priority: index, // FIFO by default
      retryCount: 0,
      estimatedTime: this.estimateTaskTime(task.data),
      memoryEstimate: this.estimateTaskMemory(task.data),
    }));

    // Create job
    const job: BatchJob<T> = {
      id: jobId,
      type,
      tasks: batchTasks,
      config: jobConfig,
      status: 'pending',
      progress: {
        total: batchTasks.length,
        completed: 0,
        failed: 0,
        skipped: 0,
        percentage: 0,
        tasksPerSecond: 0,
        estimatedTimeRemaining: 0,
      },
      metrics: this.initializeMetrics(),
      errors: [],
      warnings: [],
    };

    this.jobs.set(jobId, job);

    // Save to Firebase if available
    if (this.firebaseAdapter) {
      await this.saveJobToFirebase(job);
    }

    logger.info('Batch job created', {
      jobId,
      type,
      taskCount: batchTasks.length,
      maxConcurrency: jobConfig.maxConcurrency,
    });

    // Start processing
    this.processBatchJob(jobId, processor);

    return jobId;
  }

  /**
   * Pause a running batch job
   */
  async pauseJob(jobId: string): Promise<boolean> {
    const job = this.jobs.get(jobId);
    if (!job || job.status !== 'running') {
      return false;
    }

    job.status = 'paused';
    await this.updateJobInFirebase(job);
    
    logger.info('Batch job paused', { jobId });
    this.emit('jobPaused', { jobId });
    
    return true;
  }

  /**
   * Resume a paused batch job
   */
  async resumeJob(jobId: string): Promise<boolean> {
    const job = this.jobs.get(jobId);
    if (!job || job.status !== 'paused') {
      return false;
    }

    job.status = 'running';
    await this.updateJobInFirebase(job);
    
    logger.info('Batch job resumed', { jobId });
    this.emit('jobResumed', { jobId });
    
    return true;
  }

  /**
   * Cancel a batch job
   */
  async cancelJob(jobId: string): Promise<boolean> {
    const job = this.jobs.get(jobId);
    if (!job) {
      return false;
    }

    job.status = 'cancelled';
    job.endTime = new Date();
    
    // Clear concurrency limit
    const limit = this.activeLimits.get(jobId);
    if (limit) {
      limit.clearQueue();
      this.activeLimits.delete(jobId);
    }

    await this.updateJobInFirebase(job);
    
    logger.info('Batch job cancelled', { jobId });
    this.emit('jobCancelled', { jobId });
    
    return true;
  }

  /**
   * Get job status and progress
   */
  getJobStatus(jobId: string): BatchJob | null {
    return this.jobs.get(jobId) || null;
  }

  /**
   * Generate performance report for a job
   */
  async generatePerformanceReport(jobId: string): Promise<BatchPerformanceReport | null> {
    const job = this.jobs.get(jobId);
    if (!job) {
      return null;
    }

    const totalTime = job.endTime && job.startTime 
      ? job.endTime.getTime() - job.startTime.getTime()
      : Date.now() - (job.startTime?.getTime() || 0);

    const report: BatchPerformanceReport = {
      jobId,
      summary: {
        totalTasks: job.progress.total,
        completedTasks: job.progress.completed,
        failedTasks: job.progress.failed,
        totalTime,
        averageTaskTime: job.metrics.averageTaskTime,
        throughput: job.metrics.throughput,
      },
      performance: {
        memoryUsage: {
          peak: job.metrics.peakMemoryUsage,
          average: job.metrics.totalMemoryUsed / Math.max(job.progress.completed, 1),
          current: this.getCurrentMemoryUsage(),
        },
        concurrency: {
          maxConcurrent: job.config.maxConcurrency!,
          averageConcurrent: job.metrics.concurrentTasksRunning,
          utilizationRate: (job.metrics.concurrentTasksRunning / job.config.maxConcurrency!) * 100,
        },
        reliability: {
          successRate: (job.progress.completed / Math.max(job.progress.total, 1)) * 100,
          retryRate: job.metrics.retryRate,
          errorRate: (job.progress.failed / Math.max(job.progress.total, 1)) * 100,
        },
      },
      recommendations: this.generateRecommendations(job),
      bottlenecks: this.identifyBottlenecks(job),
    };

    return report;
  }

  /**
   * Get system-wide metrics
   */
  getSystemMetrics(): {
    activeJobs: number;
    totalConcurrency: number;
    systemMemoryUsage: number;
    averageThroughput: number;
  } {
    const activeJobs = Array.from(this.jobs.values()).filter(job => job.status === 'running');
    
    return {
      activeJobs: activeJobs.length,
      totalConcurrency: activeJobs.reduce((sum, job) => sum + job.config.maxConcurrency!, 0),
      systemMemoryUsage: this.getCurrentMemoryUsage(),
      averageThroughput: activeJobs.reduce((sum, job) => sum + job.metrics.throughput, 0) / Math.max(activeJobs.length, 1),
    };
  }

  // =============================================================================
  // PRIVATE METHODS
  // =============================================================================

  /**
   * Process batch job with optimized concurrency
   */
  private async processBatchJob<T>(
    jobId: string,
    processor: (task: BatchTask<T>) => Promise<any>
  ): Promise<void> {
    const job = this.jobs.get(jobId) as BatchJob<T>;
    if (!job) {
      return;
    }

    try {
      job.status = 'running';
      job.startTime = new Date();
      
      // Create concurrency limit
      const limit = pLimit(job.config.maxConcurrency!);
      this.activeLimits.set(jobId, limit);

      // Update job in Firebase
      await this.updateJobInFirebase(job);

      logger.info('Starting batch job processing', {
        jobId,
        taskCount: job.tasks.length,
        maxConcurrency: job.config.maxConcurrency,
      });

      // Process tasks in chunks to manage memory
      const chunks = this.chunkTasks(job.tasks, job.config.chunkSize!);
      
             for (const chunk of chunks) {
         // Check if job is paused or cancelled (get fresh status)
         const currentJob = this.jobs.get(jobId);
         if (currentJob?.status === 'paused') {
           await this.waitForJobResume(jobId);
         }
         
         if (currentJob?.status === 'cancelled') {
           break;
         }

        // Check memory usage before processing chunk
        if (await this.shouldPauseForMemory(job)) {
          await this.pauseForMemoryCleanup(jobId);
        }

        // Process chunk with concurrency control
        await this.processChunk(jobId, chunk, processor, limit);
        
        // Update progress
        this.updateJobProgress(job);
        
        // Emit progress event
        this.emit('progress', {
          jobId,
          progress: job.progress,
          metrics: job.metrics,
        });

        // Periodic cleanup
        if (global.gc && job.progress.completed % 100 === 0) {
          global.gc();
        }
      }

      // Complete job
      job.status = job.progress.failed > 0 ? 'failed' : 'completed';
      job.endTime = new Date();
      
      // Cleanup
      this.activeLimits.delete(jobId);
      
      await this.updateJobInFirebase(job);
      
      logger.info('Batch job completed', {
        jobId,
        completed: job.progress.completed,
        failed: job.progress.failed,
        totalTime: job.endTime.getTime() - job.startTime!.getTime(),
      });
      
      this.emit('jobCompleted', { jobId, job });

    } catch (error) {
      job.status = 'failed';
      job.endTime = new Date();
      job.errors.push({
        taskId: 'system',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
        retryCount: 0,
      });

      await this.updateJobInFirebase(job);
      
      logger.error('Batch job failed', { jobId, error });
      this.emit('jobFailed', { jobId, error });
    }
  }

  /**
   * Process a chunk of tasks with concurrency control
   */
  private async processChunk<T>(
    jobId: string,
    tasks: BatchTask<T>[],
    processor: (task: BatchTask<T>) => Promise<any>,
    limit: any
  ): Promise<void> {
    const job = this.jobs.get(jobId) as BatchJob<T>;
    if (!job) {
      return;
    }

    // Create promises for all tasks in chunk
    const promises = tasks.map(task => 
      limit(async () => {
        if (job.status === 'cancelled') {
          return { task, result: null, skipped: true };
        }

        return this.processTaskWithRetry(task, processor, job);
      })
    );

    // Wait for all tasks in chunk to complete
    const results = await Promise.allSettled(promises);
    
    // Process results
    for (const result of results) {
      if (result.status === 'fulfilled') {
        const { task, result: taskResult, skipped, error } = result.value;
        
        if (skipped) {
          job.progress.skipped++;
        } else if (error) {
          job.progress.failed++;
          job.errors.push({
            taskId: task.id,
            error: error.message,
            timestamp: new Date(),
            retryCount: task.retryCount || 0,
            context: task.data,
          });
        } else {
          job.progress.completed++;
        }
      } else {
        job.progress.failed++;
        job.errors.push({
          taskId: 'unknown',
          error: result.reason?.message || 'Promise rejected',
          timestamp: new Date(),
          retryCount: 0,
        });
      }
    }
  }

  /**
   * Process single task with retry logic
   */
  private async processTaskWithRetry<T>(
    task: BatchTask<T>,
    processor: (task: BatchTask<T>) => Promise<any>,
    job: BatchJob<T>
  ): Promise<{ task: BatchTask<T>; result?: any; skipped?: boolean; error?: Error }> {
    const maxRetries = job.config.retryAttempts!;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const startTime = Date.now();
        const result = await processor(task);
        const processingTime = Date.now() - startTime;
        
        // Update metrics
        job.metrics.averageTaskTime = 
          (job.metrics.averageTaskTime * job.progress.completed + processingTime) / 
          (job.progress.completed + 1);
        
        return { task, result };
        
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        task.retryCount = attempt + 1;
        
        if (attempt < maxRetries) {
          // Wait before retry
          await this.delay(job.config.retryDelay! * Math.pow(2, attempt)); // Exponential backoff
          
          logger.warn('Task retry', {
            taskId: task.id,
            attempt: attempt + 1,
            maxRetries,
            error: lastError.message,
          });
        }
      }
    }

    return { task, error: lastError! };
  }

  /**
   * Memory management methods
   */
  private async shouldPauseForMemory(job: BatchJob): Promise<boolean> {
    const currentMemory = this.getCurrentMemoryUsage();
    return currentMemory > job.config.memoryThreshold!;
  }

  private async pauseForMemoryCleanup(jobId: string): Promise<void> {
    logger.warn('Pausing job for memory cleanup', { 
      jobId, 
      currentMemory: this.getCurrentMemoryUsage() 
    });
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
    
    // Wait for memory to be freed
    await this.delay(5000);
    
    logger.info('Memory cleanup completed', { 
      jobId, 
      currentMemory: this.getCurrentMemoryUsage() 
    });
  }

  /**
   * Utility methods
   */
  private chunkTasks<T>(tasks: BatchTask<T>[], chunkSize: number): BatchTask<T>[][] {
    const chunks: BatchTask<T>[][] = [];
    for (let i = 0; i < tasks.length; i += chunkSize) {
      chunks.push(tasks.slice(i, i + chunkSize));
    }
    return chunks;
  }

  private updateJobProgress(job: BatchJob): void {
    const total = job.progress.total;
    const processed = job.progress.completed + job.progress.failed + job.progress.skipped;
    
    job.progress.percentage = total > 0 ? Math.round((processed / total) * 100) : 0;
    
    // Calculate throughput
    if (job.startTime) {
      const elapsedSeconds = (Date.now() - job.startTime.getTime()) / 1000;
      job.progress.tasksPerSecond = elapsedSeconds > 0 ? processed / elapsedSeconds : 0;
      job.metrics.throughput = job.progress.tasksPerSecond;
      
      // Estimate remaining time
      const remainingTasks = total - processed;
      job.progress.estimatedTimeRemaining = 
        job.progress.tasksPerSecond > 0 ? remainingTasks / job.progress.tasksPerSecond * 1000 : 0;
    }
  }

  private getCurrentMemoryUsage(): number {
    const usage = process.memoryUsage();
    return Math.round(usage.heapUsed / 1024 / 1024); // MB
  }

  private estimateTaskTime(data: any): number {
    // Simple estimation based on data size
    const dataSize = JSON.stringify(data).length;
    return Math.max(100, dataSize / 1000); // 100ms minimum
  }

  private estimateTaskMemory(data: any): number {
    // Simple estimation based on data size
    const dataSize = JSON.stringify(data).length;
    return Math.max(1, dataSize / 1024 / 1024); // 1MB minimum
  }

  private initializeMetrics(): BatchMetrics {
    return {
      totalMemoryUsed: 0,
      peakMemoryUsage: 0,
      averageTaskTime: 0,
      concurrentTasksRunning: 0,
      retryRate: 0,
      throughput: 0,
      cpuUsage: 0,
      networkRequests: 0,
      cacheHitRate: 0,
    };
  }

  private generateRecommendations(job: BatchJob): string[] {
    const recommendations: string[] = [];
    
    if (job.metrics.retryRate > 10) {
      recommendations.push('High retry rate detected. Consider improving task reliability or increasing retry delays.');
    }
    
    if (job.metrics.peakMemoryUsage > job.config.memoryThreshold! * 0.8) {
      recommendations.push('High memory usage detected. Consider reducing chunk size or enabling more aggressive garbage collection.');
    }
    
    if (job.progress.failed / job.progress.total > 0.05) {
      recommendations.push('High failure rate detected. Review error patterns and improve error handling.');
    }
    
    return recommendations;
  }

  private identifyBottlenecks(job: BatchJob): Array<{
    type: string;
    description: string;
    impact: 'low' | 'medium' | 'high';
    recommendation: string;
  }> {
    const bottlenecks = [];
    
    if (job.metrics.averageTaskTime > 10000) {
      bottlenecks.push({
        type: 'slow_tasks',
        description: 'Tasks are taking longer than expected to complete',
        impact: 'high' as const,
        recommendation: 'Profile task execution to identify performance bottlenecks',
      });
    }
    
    return bottlenecks;
  }

  private async waitForJobResume(jobId: string): Promise<void> {
    return new Promise((resolve) => {
      const checkStatus = () => {
        const job = this.jobs.get(jobId);
        if (job && job.status === 'running') {
          resolve();
        } else {
          setTimeout(checkStatus, 1000);
        }
      };
      checkStatus();
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private monitorPerformance(): void {
    const currentMemory = this.getCurrentMemoryUsage();
    
    // Update peak memory for all active jobs
    for (const job of this.jobs.values()) {
      if (job.status === 'running') {
        job.metrics.peakMemoryUsage = Math.max(job.metrics.peakMemoryUsage, currentMemory);
        job.metrics.totalMemoryUsed = currentMemory;
      }
    }
  }

  private async saveJobToFirebase(job: BatchJob): Promise<void> {
    if (!this.firebaseAdapter) return;
    
    try {
      await this.firebaseAdapter.createDocument('enhanced_batch_jobs', job.id, {
        ...job,
        startTime: job.startTime,
        endTime: job.endTime,
      });
    } catch (error) {
      logger.warn('Failed to save job to Firebase', { jobId: job.id, error });
    }
  }

  private async updateJobInFirebase(job: BatchJob): Promise<void> {
    if (!this.firebaseAdapter) return;
    
    try {
      await this.firebaseAdapter.updateDocument('enhanced_batch_jobs', job.id, {
        status: job.status,
        progress: job.progress,
        metrics: job.metrics,
        errors: job.errors,
        warnings: job.warnings,
        endTime: job.endTime,
      });
    } catch (error) {
      logger.warn('Failed to update job in Firebase', { jobId: job.id, error });
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.performanceMonitor) {
      clearInterval(this.performanceMonitor);
    }
    
    // Cancel all active jobs
    for (const jobId of this.jobs.keys()) {
      this.cancelJob(jobId);
    }
    
    this.jobs.clear();
    this.activeLimits.clear();
  }
} 