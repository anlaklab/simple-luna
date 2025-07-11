import { Request, Response } from 'express';
import * as os from 'os';
import * as fs from 'fs';
import { logger } from '../utils/logger';

// ✅ ROBUST IMPORT: Use AsposeDriverFactory for unified access
const asposeDriver = require('/app/lib/AsposeDriverFactory');

interface SystemMetrics {
  cpu: number;
  memory: number;
  disk: number;
  activeConnections: number;
  queueSize: number;
  uptime: number;
  nodeVersion: string;
  platform: string;
}

interface ServiceStatus {
  name: string;
  status: 'online' | 'error' | 'degraded';
  lastCheck: Date;
  details?: string;
}

interface SessionData {
  id: string;
  userId: string;
  status: 'active' | 'processing' | 'completed' | 'error';
  startTime: Date;
  currentStep: string;
  progress: number;
  errors: string[];
  ipAddress?: string;
  userAgent?: string;
}

interface ConversionJob {
  id: string;
  filename: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  startTime: Date;
  endTime?: Date;
  slideCount: number;
  processedSlides: number;
  extractorErrors: string[];
  fileSize: number;
  userId?: string;
}

// In-memory stores for demo (in production, use Redis/database)
const activeSessions: Map<string, SessionData> = new Map();
const conversionJobs: Map<string, ConversionJob> = new Map();
const recentLogs: Array<{level: string, message: string, timestamp: Date, service?: string}> = [];

// Initialize with some demo data
const initializeDemoData = () => {
  // Demo sessions
  activeSessions.set('sess_001', {
    id: 'sess_001',
    userId: 'user_123',
    status: 'processing',
    startTime: new Date(Date.now() - 300000),
    currentStep: 'Asset Extraction',
    progress: 65,
    errors: [],
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
  });

  activeSessions.set('sess_002', {
    id: 'sess_002', 
    userId: 'user_456',
    status: 'completed',
    startTime: new Date(Date.now() - 600000),
    currentStep: 'Completed',
    progress: 100,
    errors: [],
    ipAddress: '192.168.1.101'
  });

  // Demo conversion jobs
  conversionJobs.set('job_001', {
    id: 'job_001',
    filename: 'presentation-large.pptx',
    status: 'processing',
    progress: 78,
    startTime: new Date(Date.now() - 180000),
    slideCount: 230,
    processedSlides: 179,
    extractorErrors: [],
    fileSize: 15728640, // 15MB
    userId: 'user_123'
  });

  conversionJobs.set('job_002', {
    id: 'job_002',
    filename: 'marketing-deck.pptx', 
    status: 'completed',
    progress: 100,
    startTime: new Date(Date.now() - 450000),
    endTime: new Date(Date.now() - 300000),
    slideCount: 45,
    processedSlides: 45,
    extractorErrors: [],
    fileSize: 8388608, // 8MB
    userId: 'user_456'
  });

  // Demo logs
  recentLogs.push(
    { level: 'INFO', message: 'AssetService initialized successfully', timestamp: new Date(Date.now() - 60000), service: 'AssetService' },
    { level: 'ERROR', message: 'Java bindings module not found', timestamp: new Date(Date.now() - 45000), service: 'AsposeAdapter' },
    { level: 'INFO', message: 'New presentation uploaded: presentation-large.pptx', timestamp: new Date(Date.now() - 30000), service: 'UploadService' },
    { level: 'WARN', message: 'High memory usage detected: 89%', timestamp: new Date(Date.now() - 15000), service: 'SystemMonitor' }
  );
};

// Initialize demo data
initializeDemoData();

export class DebugController {
  
  /**
   * Get comprehensive system metrics
   */
  async getSystemMetrics(req: Request, res: Response) {
    try {
      const metrics: SystemMetrics = {
        cpu: await this.getCpuUsage(),
        memory: this.getMemoryUsage(),
        disk: this.getDiskUsage(),
        activeConnections: activeSessions.size,
        queueSize: Array.from(conversionJobs.values()).filter(job => job.status === 'pending').length,
        uptime: process.uptime(),
        nodeVersion: process.version,
        platform: os.platform()
      };

      res.json({
        success: true,
        data: metrics,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Failed to get system metrics', { error: (error as Error).message });
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve system metrics'
      });
    }
  }

  /**
   * Get service health status
   */
  async getServiceStatus(req: Request, res: Response) {
    try {
      const services: ServiceStatus[] = [
        {
          name: 'Aspose.Slides',
          status: await this.checkAsposeStatus(),
          lastCheck: new Date(),
          details: 'Local library integration'
        },
        {
          name: 'Firebase',
          status: 'online',
          lastCheck: new Date(),
          details: 'Firestore and Storage connected'
        },
        {
          name: 'Java Bindings',
          status: 'error',
          lastCheck: new Date(),
          details: 'Module nodejavabridge_bindings.node not found'
        },
        {
          name: 'Express Server',
          status: 'online',
          lastCheck: new Date(),
          details: `Running on port ${process.env.PORT || 3001}`
        }
      ];

      res.json({
        success: true,
        data: services,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Failed to get service status', { error: (error as Error).message });
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve service status'
      });
    }
  }

  /**
   * Get active sessions
   */
  async getActiveSessions(req: Request, res: Response) {
    try {
      const sessions = Array.from(activeSessions.values()).map(session => ({
        ...session,
        // Don't expose sensitive data
        userAgent: session.userAgent ? session.userAgent.substring(0, 50) + '...' : undefined
      }));

      res.json({
        success: true,
        data: sessions,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Failed to get active sessions', { error: (error as Error).message });
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve active sessions'
      });
    }
  }

  /**
   * Get conversion jobs
   */
  async getConversionJobs(req: Request, res: Response) {
    try {
      const jobs = Array.from(conversionJobs.values());
      
      res.json({
        success: true,
        data: jobs,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Failed to get conversion jobs', { error: (error as Error).message });
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve conversion jobs'
      });
    }
  }

  /**
   * Get recent logs
   */
  async getRecentLogs(req: Request, res: Response) {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const logs = recentLogs
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, limit);

      res.json({
        success: true,
        data: logs,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Failed to get recent logs', { error: (error as Error).message });
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve recent logs'
      });
    }
  }

  /**
   * Get complete debug data
   */
  async getDebugData(req: Request, res: Response) {
    try {
      const [metrics, services, sessions, jobs, logs] = await Promise.all([
        this.getSystemMetricsData(),
        this.getServiceStatusData(), 
        this.getActiveSessionsData(),
        this.getConversionJobsData(),
        this.getRecentLogsData()
      ]);

      res.json({
        success: true,
        data: {
          metrics,
          services,
          sessions,
          jobs,
          logs
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Failed to get debug data', { error: (error as Error).message });
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve debug data'
      });
    }
  }

  // Helper methods
  private async getCpuUsage(): Promise<number> {
    return new Promise((resolve) => {
      const startUsage = process.cpuUsage();
      const startTime = process.hrtime.bigint();
      
      setTimeout(() => {
        const deltaUsage = process.cpuUsage(startUsage);
        const deltaTime = process.hrtime.bigint() - startTime;
        
        const cpuPercent = ((deltaUsage.user + deltaUsage.system) / Number(deltaTime)) * 100;
        resolve(Math.min(100, Math.max(0, cpuPercent * os.cpus().length)));
      }, 100);
    });
  }

  private getMemoryUsage(): number {
    const used = process.memoryUsage();
    const total = os.totalmem();
    return (used.rss / total) * 100;
  }

  private getDiskUsage(): number {
    try {
      const stats = fs.statSync('.');
      // This is a simplified calculation - in production use a proper disk usage library
      return Math.random() * 30 + 10; // Mock value between 10-40%
    } catch {
      return 0;
    }
  }

  private async checkAsposeStatus(): Promise<'online' | 'error' | 'degraded'> {
    try {
      // ✅ REFACTORED: Use AsposeDriverFactory to check status
      if (asposeDriver.isInitialized()) {
        return 'online';
      }
      
      // Try to initialize if not already initialized
      await asposeDriver.initialize();
      return asposeDriver.isInitialized() ? 'online' : 'error';
    } catch (error) {
      logger.error('Failed to check Aspose status', { error: (error as Error).message });
      return 'error';
    }
  }

  // Data fetcher methods for combined endpoint
  private async getSystemMetricsData(): Promise<SystemMetrics> {
    return {
      cpu: await this.getCpuUsage(),
      memory: this.getMemoryUsage(),
      disk: this.getDiskUsage(),
      activeConnections: activeSessions.size,
      queueSize: Array.from(conversionJobs.values()).filter(job => job.status === 'pending').length,
      uptime: process.uptime(),
      nodeVersion: process.version,
      platform: os.platform()
    };
  }

  private async getServiceStatusData(): Promise<ServiceStatus[]> {
    return [
      {
        name: 'Aspose.Slides',
        status: await this.checkAsposeStatus(),
        lastCheck: new Date()
      },
      {
        name: 'Firebase',
        status: 'online',
        lastCheck: new Date()
      },
      {
        name: 'Java Bindings',
        status: 'error',
        lastCheck: new Date()
      }
    ];
  }

  private getActiveSessionsData(): SessionData[] {
    return Array.from(activeSessions.values());
  }

  private getConversionJobsData(): ConversionJob[] {
    return Array.from(conversionJobs.values());
  }

  private getRecentLogsData(): Array<{level: string, message: string, timestamp: Date, service?: string}> {
    return recentLogs.slice(-20);
  }

  // Utility methods for updating data (for real implementations)
  static addLog(level: string, message: string, service?: string) {
    recentLogs.push({
      level,
      message,
      timestamp: new Date(),
      service
    });

    // Keep only last 100 logs
    if (recentLogs.length > 100) {
      recentLogs.shift();
    }
  }

  static updateSession(sessionId: string, updates: Partial<SessionData>) {
    const session = activeSessions.get(sessionId);
    if (session) {
      activeSessions.set(sessionId, { ...session, ...updates });
    }
  }

  static updateConversionJob(jobId: string, updates: Partial<ConversionJob>) {
    const job = conversionJobs.get(jobId);
    if (job) {
      conversionJobs.set(jobId, { ...job, ...updates });
    }
  }
} 