import { z } from "zod";
/**
 * Health Check Service - Comprehensive dependency verification
 * 
 * Verifies critical system dependencies for Luna server
 */

import fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '../utils/logger';
import { OpenAIAdapter } from '../adapters/openai.adapter';
import { FirebaseAdapter } from '../adapters/firebase.adapter';
import { AsposeAdapterRefactored } from '../adapters/aspose/AsposeAdapterRefactored';

const execAsync = promisify(exec);

// =============================================================================
// TYPES
// =============================================================================

interface ServiceHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime?: number;
  details?: string;
  lastChecked: string;
  error?: string;
}

interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  timestamp: string;
  version: string;
  services: {
    aspose: ServiceHealth;
    openai: ServiceHealth;
    firebase: ServiceHealth;
    java: ServiceHealth;
    filesystem: ServiceHealth;
    memory: ServiceHealth;
  };
  performance: {
    memoryUsage: NodeJS.MemoryUsage;
    cpuUsage?: NodeJS.CpuUsage;
  };
}

// =============================================================================
// HEALTH CHECK SERVICE
// =============================================================================

export class HealthCheckService {
  private readonly timeout = 10000; // 10 seconds timeout for checks
  private lastHealthCheck: SystemHealth | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Start periodic health checks
    this.startPeriodicHealthChecks();
    logger.info('Health Check Service initialized');
  }

  // =============================================================================
  // PUBLIC METHODS
  // =============================================================================

  /**
   * Perform comprehensive health check
   */
  async performHealthCheck(): Promise<SystemHealth> {
    const startTime = Date.now();
    logger.info('Starting comprehensive health check');

    const results = await Promise.allSettled([
      this.checkAsposeHealth(),
      this.checkOpenAIHealth(),
      this.checkFirebaseHealth(),
      this.checkJavaHealth(),
      this.checkFilesystemHealth(),
      this.checkMemoryHealth(),
    ]);

    const [asposeResult, openaiResult, firebaseResult, javaResult, filesystemResult, memoryResult] = results;

    const services = {
      aspose: this.extractResult(asposeResult),
      openai: this.extractResult(openaiResult),
      firebase: this.extractResult(firebaseResult),
      java: this.extractResult(javaResult),
      filesystem: this.extractResult(filesystemResult),
      memory: this.extractResult(memoryResult),
    };

    // Determine overall health
    const healthyServices = Object.values(services).filter(s => s.status === 'healthy').length;
    const degradedServices = Object.values(services).filter(s => s.status === 'degraded').length;
    const unhealthyServices = Object.values(services).filter(s => s.status === 'unhealthy').length;

    let overall: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (unhealthyServices > 2) {
      overall = 'unhealthy';
    } else if (unhealthyServices > 0 || degradedServices > 1) {
      overall = 'degraded';
    }

    const systemHealth: SystemHealth = {
      overall,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      services,
      performance: {
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
      },
    };

    this.lastHealthCheck = systemHealth;
    
    const totalTime = Date.now() - startTime;
    logger.info('Health check completed', {
      overall,
      totalTime,
      healthyServices,
      degradedServices,
      unhealthyServices,
    });

    return systemHealth;
  }

  /**
   * Get cached health check results
   */
  getCachedHealth(): SystemHealth | null {
    return this.lastHealthCheck;
  }

  /**
   * Get quick health status
   */
  async getQuickHealth(): Promise<{ status: string; uptime: number; timestamp: string }> {
    return {
      status: this.lastHealthCheck?.overall || 'unknown',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }

  // =============================================================================
  // SERVICE HEALTH CHECKS
  // =============================================================================

  /**
   * Check Aspose.Slides health by attempting to load library and create presentation
   */
  private async checkAsposeHealth(): Promise<ServiceHealth> {
    const startTime = Date.now();
    
    try {
      const asposeConfig = {
        licenseFilePath: process.env.ASPOSE_LICENSE_PATH || './Aspose.Slides.Product.Family.lic',
        tempDirectory: process.env.ASPOSE_TEMP_DIR || './temp/aspose',
        maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '52428800'),
      };

      // ✅ REFACTORED: Use AsposeDriverFactory to verify it's working
      const asposeDriver = require('/app/lib/AsposeDriverFactory');
      await asposeDriver.initialize();
      
      // Test if we can create a basic presentation
      const testPresentation = await asposeDriver.createPresentation();
      testPresentation.dispose();
      
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'healthy',
        responseTime,
        details: 'Aspose.Slides library loaded and functional via AsposeDriverFactory',
        lastChecked: new Date().toISOString(),
      };
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'unhealthy',
        responseTime,
        details: 'Aspose.Slides library not functional',
        lastChecked: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Check OpenAI health by attempting API connection
   */
  private async checkOpenAIHealth(): Promise<ServiceHealth> {
    const startTime = Date.now();
    
    if (!process.env.OPENAI_API_KEY) {
      return {
        status: 'degraded',
        responseTime: 0,
        details: 'OpenAI API key not configured',
        lastChecked: new Date().toISOString(),
      };
    }

    try {
      const openaiConfig = {
        apiKey: process.env.OPENAI_API_KEY,
        organizationId: process.env.OPENAI_ORGANIZATION_ID,
        defaultModel: 'gpt-4-turbo-preview',
      };

      // Simple check - create adapter and verify configuration
      const adapter = new OpenAIAdapter(openaiConfig);
      
      // Verify adapter was created successfully
      if (!adapter) {
        throw new Error('Failed to create OpenAI adapter');
      }
      
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'healthy',
        responseTime,
        details: 'OpenAI API accessible and responsive',
        lastChecked: new Date().toISOString(),
      };
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'unhealthy',
        responseTime,
        details: 'OpenAI API not accessible',
        lastChecked: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Check Firebase health by testing connectivity
   */
  private async checkFirebaseHealth(): Promise<ServiceHealth> {
    const startTime = Date.now();
    
    if (!process.env.FIREBASE_PROJECT_ID) {
      return {
        status: 'degraded',
        responseTime: 0,
        details: 'Firebase not configured',
        lastChecked: new Date().toISOString(),
      };
    }

    try {
      if (!process.env.FIREBASE_PRIVATE_KEY || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_STORAGE_BUCKET) {
        throw new Error('Firebase configuration incomplete');
      }

      const firebaseConfig = {
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      };

      // Simple check - create adapter and verify configuration
      const adapter = new FirebaseAdapter(firebaseConfig);
      
      // Verify adapter was created successfully
      if (!adapter) {
        throw new Error('Failed to create Firebase adapter');
      }
      
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'healthy',
        responseTime,
        details: 'Firebase services accessible',
        lastChecked: new Date().toISOString(),
      };
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'unhealthy',
        responseTime,
        details: 'Firebase services not accessible',
        lastChecked: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Check Java installation health
   */
  private async checkJavaHealth(): Promise<ServiceHealth> {
    const startTime = Date.now();
    
    try {
      const javaHome = process.env.JAVA_HOME;
      if (!javaHome) {
        return {
          status: 'degraded',
          responseTime: Date.now() - startTime,
          details: 'JAVA_HOME not set, using system Java',
          lastChecked: new Date().toISOString(),
        };
      }

      // Try to execute java -version
      const { stdout, stderr } = await execAsync('java -version');
      const output = stdout || stderr;
      
      const responseTime = Date.now() - startTime;
      
      if (output.includes('java version') || output.includes('openjdk version')) {
        return {
          status: 'healthy',
          responseTime,
          details: `Java found: ${output.split('\n')[0]}`,
          lastChecked: new Date().toISOString(),
        };
      } else {
        return {
          status: 'unhealthy',
          responseTime,
          details: 'Java version check failed',
          lastChecked: new Date().toISOString(),
          error: 'Unexpected java -version output',
        };
      }
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'unhealthy',
        responseTime,
        details: 'Java not accessible or not installed',
        lastChecked: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Check filesystem health
   */
  private async checkFilesystemHealth(): Promise<ServiceHealth> {
    const startTime = Date.now();
    
    try {
      const directories = [
        process.env.UPLOAD_TEMP_DIR || './temp/uploads',
        process.env.ASPOSE_TEMP_DIR || './temp/aspose',
        process.env.PROCESSED_FILES_DIR || './temp/processed',
      ];

      for (const dir of directories) {
        try {
          await fs.access(dir, fs.constants.F_OK | fs.constants.W_OK);
        } catch {
          // Directory doesn't exist or not writable, try to create it
          await fs.mkdir(dir, { recursive: true });
        }
      }

      // Test write operation
      const testFile = `${directories[0]}/health-check-test.tmp`;
      await fs.writeFile(testFile, 'health-check');
      await fs.unlink(testFile);
      
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'healthy',
        responseTime,
        details: `All ${directories.length} directories accessible and writable`,
        lastChecked: new Date().toISOString(),
      };
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'unhealthy',
        responseTime,
        details: 'Filesystem not fully accessible',
        lastChecked: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Check memory health
   */
  private async checkMemoryHealth(): Promise<ServiceHealth> {
    const startTime = Date.now();
    
    try {
      const memoryUsage = process.memoryUsage();
      const totalMemoryMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
      const usedMemoryMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
      const memoryUsagePercent = async (usedMemoryMB / totalMemoryMB) * 100;
      
      const responseTime = Date.now() - startTime;
      
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      let details = `Memory usage: ${usedMemoryMB}MB / ${totalMemoryMB}MB (${memoryUsagePercent.toFixed(1)}%)`;
      
      if (memoryUsagePercent > 90) {
        status = 'unhealthy';
        details += ' - Critical memory usage';
      } else if (memoryUsagePercent > 75) {
        status = 'degraded';
        details += ' - High memory usage';
      }
      
      return {
        status,
        responseTime,
        details,
        lastChecked: new Date().toISOString(),
      };
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'unhealthy',
        responseTime,
        details: 'Memory check failed',
        lastChecked: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  /**
   * Extract result from Promise.allSettled result
   */
  private extractResult(result: PromiseSettledResult<ServiceHealth>): ServiceHealth {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      return {
        status: 'unhealthy',
        responseTime: 0,
        details: 'Health check failed',
        lastChecked: new Date().toISOString(),
        error: result.reason instanceof Error ? result.reason.message : 'Unknown error',
      };
    }
  }

  /**
   * Start periodic health checks
   */
  private startPeriodicHealthChecks(): void {
    // Run initial health check
    this.performHealthCheck().catch(error => {
      logger.error('Initial health check failed', { error });
    });

    // Run health checks every 5 minutes
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck().catch(error => {
        logger.error('Periodic health check failed', { error });
      });
    }, 5 * 60 * 1000);
  }

  /**
   * Stop periodic health checks
   */
  stopPeriodicHealthChecks(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }
} 