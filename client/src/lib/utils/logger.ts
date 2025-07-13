/**
 * Frontend Logger Service - Integrated with PLG Stack
 * 
 * Provides structured logging for React frontend that sends logs to backend/Loki
 */

export interface LogContext {
  requestId?: string;
  userId?: string;
  action?: string;
  resource?: string;
  component?: string;
  correlationId?: string;
  url?: string;
  userAgent?: string;
  [key: string]: any;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  service: string;
  environment: string;
  sessionId: string;
  url: string;
  userAgent: string;
}

class FrontendLogger {
  private sessionId: string;
  private environment: string;
  private apiUrl: string;
  private logBuffer: LogEntry[] = [];
  private bufferSize: number = 50;
  private flushInterval: number = 5000; // 5 seconds
  private flushTimer: number | null = null;
  private isOnline: boolean = navigator.onLine;
  private defaultContext: LogContext = {};

  constructor() {
    this.sessionId = this.generateSessionId();
    this.environment = import.meta.env.MODE || 'development';
    this.apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    
    // Setup online/offline detection
    this.setupNetworkDetection();
    
    // Setup auto-flush timer
    this.setupAutoFlush();
    
    // Setup beforeunload handler to flush logs
    this.setupUnloadHandler();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private setupNetworkDetection(): void {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.flushLogs(); // Flush buffered logs when back online
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  private setupAutoFlush(): void {
    this.flushTimer = window.setInterval(() => {
      this.flushLogs();
    }, this.flushInterval);
  }

  private setupUnloadHandler(): void {
    window.addEventListener('beforeunload', () => {
      this.flushLogs(true); // Synchronous flush on unload
    });
  }

  private createLogEntry(level: LogLevel, message: string, context?: LogContext): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: { ...this.defaultContext, ...context },
      service: 'luna-client',
      environment: this.environment,
      sessionId: this.sessionId,
      url: window.location.href,
      userAgent: navigator.userAgent,
    };
  }

  private addToBuffer(entry: LogEntry): void {
    this.logBuffer.push(entry);
    
    // If buffer is full, flush immediately
    if (this.logBuffer.length >= this.bufferSize) {
      this.flushLogs();
    }
  }

  private async flushLogs(synchronous: boolean = false): Promise<void> {
    if (this.logBuffer.length === 0 || !this.isOnline) {
      return;
    }

    const logsToSend = [...this.logBuffer];
    this.logBuffer = [];

    try {
      const request = fetch(`${this.apiUrl}/api/v1/logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          logs: logsToSend,
          source: 'frontend',
          sessionId: this.sessionId,
        }),
      });

      if (synchronous) {
        // For unload handler, we need to wait
        await request;
      } else {
        // Fire and forget for normal operation
        request.catch(error => {
          console.error('Failed to send logs to backend:', error);
          // Re-add failed logs to buffer for retry
          this.logBuffer.unshift(...logsToSend);
        });
      }
    } catch (error) {
      console.error('Error sending logs:', error);
      // Re-add failed logs to buffer for retry
      this.logBuffer.unshift(...logsToSend);
    }
  }

  // Core logging methods
  debug(message: string, context?: LogContext): void {
    const entry = this.createLogEntry('debug', message, context);
    this.addToBuffer(entry);
    
    if (this.environment === 'development') {
      console.debug(`[${entry.timestamp}] DEBUG:`, message, context);
    }
  }

  info(message: string, context?: LogContext): void {
    const entry = this.createLogEntry('info', message, context);
    this.addToBuffer(entry);
    
    if (this.environment === 'development') {
      console.info(`[${entry.timestamp}] INFO:`, message, context);
    }
  }

  warn(message: string, context?: LogContext): void {
    const entry = this.createLogEntry('warn', message, context);
    this.addToBuffer(entry);
    
    console.warn(`[${entry.timestamp}] WARN:`, message, context);
  }

  error(message: string, context?: LogContext | Error): void {
    let logContext: LogContext;
    
    if (context instanceof Error) {
      logContext = {
        error: {
          name: context.name,
          message: context.message,
          stack: context.stack,
        },
      };
    } else {
      logContext = context || {};
    }

    const entry = this.createLogEntry('error', message, logContext);
    this.addToBuffer(entry);
    
    console.error(`[${entry.timestamp}] ERROR:`, message, logContext);
  }

  // Specialized logging methods
  react(message: string, context: LogContext & {
    component?: string;
    hook?: string;
    prop?: string;
    state?: any;
  }): void {
    this.debug(message, {
      type: 'react_event',
      ...context,
    });
  }

  ui(message: string, context: LogContext & {
    element?: string;
    action?: string;
    value?: any;
  }): void {
    this.info(message, {
      type: 'ui_interaction',
      ...context,
    });
  }

  api(message: string, context: LogContext & {
    method?: string;
    endpoint?: string;
    status?: number;
    duration?: number;
    requestId?: string;
  }): void {
    this.info(message, {
      type: 'api_call',
      ...context,
    });
  }

  navigation(message: string, context: LogContext & {
    from?: string;
    to?: string;
    trigger?: string;
  }): void {
    this.info(message, {
      type: 'navigation',
      ...context,
    });
  }

  performance(message: string, context: LogContext & {
    metric: string;
    value: number;
    unit: string;
    threshold?: number;
  }): void {
    this.info(message, {
      type: 'performance_metric',
      ...context,
    });
  }

  // Utility methods
  setDefaultContext(context: LogContext): void {
    this.defaultContext = { ...this.defaultContext, ...context };
  }

  clearDefaultContext(): void {
    this.defaultContext = {};
  }

  setUserId(userId: string): void {
    this.setDefaultContext({ userId });
  }

  setRequestId(requestId: string): void {
    this.setDefaultContext({ requestId, correlationId: requestId });
  }

  createChild(context: LogContext): FrontendLogger {
    const child = new FrontendLogger();
    child.setDefaultContext({ ...this.defaultContext, ...context });
    return child;
  }

  // Manual flush method
  flush(): Promise<void> {
    return this.flushLogs();
  }

  // Cleanup method
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    
    this.flushLogs(true); // Final flush
  }

  // Get current buffer status
  getBufferStatus(): { count: number; size: number } {
    return {
      count: this.logBuffer.length,
      size: this.bufferSize,
    };
  }
}

// Error boundary integration
export function logErrorBoundary(error: Error, errorInfo: { componentStack: string }): void {
  logger.error('React Error Boundary caught error', {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    componentStack: errorInfo.componentStack,
    type: 'error_boundary',
  });
}

// Performance observer integration
export function setupPerformanceLogging(): void {
  if ('PerformanceObserver' in window) {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'navigation') {
          logger.performance('Page navigation performance', {
            metric: 'navigation',
            value: entry.duration,
            unit: 'ms',
            url: entry.name,
          });
        }
      }
    });
    
    observer.observe({ entryTypes: ['navigation'] });
  }
}

// Create and export singleton instance
export const logger = new FrontendLogger();

// Export class for creating child loggers
export { FrontendLogger };

export default logger; 