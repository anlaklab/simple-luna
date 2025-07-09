/**
 * Advanced Conversion Logger
 * 
 * Provides detailed logging and debugging capabilities for PPTX conversion pipeline
 */

class ConversionLogger {
  constructor(conversionId, options = {}) {
    this.conversionId = conversionId;
    this.startTime = Date.now();
    this.logs = [];
    this.metrics = {
      presentation: {},
      slides: [],
      shapes: [],
      errors: [],
      performance: {}
    };
    this.options = {
      logLevel: options.logLevel || 'INFO', // DEBUG, INFO, WARN, ERROR
      enableMetrics: options.enableMetrics !== false,
      enableShapeDebug: options.enableShapeDebug === true,
      maxShapeLogsPerSlide: options.maxShapeLogsPerSlide || 50
    };
  }

  // =============================================================================
  // MAIN LOGGING METHODS
  // =============================================================================

  /**
   * Log presentation-level information
   */
  logPresentation(action, data, metadata = {}) {
    const logEntry = this._createLogEntry('PRESENTATION', action, data, metadata);
    this._addLog(logEntry);
    
    if (this.options.enableMetrics) {
      this.metrics.presentation[action] = {
        timestamp: logEntry.timestamp,
        data: logEntry.data,
        metadata: logEntry.metadata
      };
    }
    
    this._consoleLog('📊', logEntry);
  }

  /**
   * Log slide-level processing
   */
  logSlide(slideIndex, action, data, metadata = {}) {
    const logEntry = this._createLogEntry('SLIDE', action, data, {
      ...metadata,
      slideIndex,
      slideId: `slide_${slideIndex + 1}`
    });
    this._addLog(logEntry);
    
    if (this.options.enableMetrics) {
      // Ensure slides array has the slot
      while (this.metrics.slides.length <= slideIndex) {
        this.metrics.slides.push({});
      }
      
      this.metrics.slides[slideIndex][action] = {
        timestamp: logEntry.timestamp,
        data: logEntry.data,
        metadata: logEntry.metadata
      };
    }
    
    this._consoleLog('🗂️', logEntry);
  }

  /**
   * Log shape-level processing with enrichment details
   */
  logShape(slideIndex, shapeIndex, action, data, metadata = {}) {
    if (!this.options.enableShapeDebug && this.options.logLevel !== 'DEBUG') {
      return; // Skip shape logging unless explicitly enabled
    }

    // Limit shape logs per slide to prevent spam
    const existingShapeLogs = this.logs.filter(log => 
      log.level === 'SHAPE' && 
      log.metadata.slideIndex === slideIndex
    ).length;
    
    if (existingShapeLogs >= this.options.maxShapeLogsPerSlide) {
      return;
    }

    const logEntry = this._createLogEntry('SHAPE', action, data, {
      ...metadata,
      slideIndex,
      shapeIndex,
      shapeId: `slide_${slideIndex + 1}_shape_${shapeIndex + 1}`
    });
    this._addLog(logEntry);
    
    if (this.options.enableMetrics) {
      this.metrics.shapes.push({
        slideIndex,
        shapeIndex,
        action,
        timestamp: logEntry.timestamp,
        data: logEntry.data,
        metadata: logEntry.metadata
      });
    }
    
    this._consoleLog('🔷', logEntry);
  }

  /**
   * Log errors with categorization and context
   */
  logError(level, error, context = {}, recovery = null) {
    const errorEntry = {
      timestamp: new Date().toISOString(),
      conversionId: this.conversionId,
      level,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: error.code || 'UNKNOWN_ERROR'
      },
      context,
      recovery,
      processingTime: Date.now() - this.startTime
    };
    
    this._addLog({
      ...errorEntry,
      level: 'ERROR',
      action: 'ERROR_OCCURRED'
    });
    
    if (this.options.enableMetrics) {
      this.metrics.errors.push(errorEntry);
    }
    
    this._consoleLog('❌', errorEntry, true);
    
    return errorEntry;
  }

  /**
   * Log performance metrics
   */
  logPerformance(metric, value, unit = 'ms', context = {}) {
    const perfEntry = {
      timestamp: new Date().toISOString(),
      conversionId: this.conversionId,
      metric,
      value,
      unit,
      context,
      totalTime: Date.now() - this.startTime
    };
    
    this._addLog({
      ...perfEntry,
      level: 'PERFORMANCE',
      action: 'METRIC_RECORDED'
    });
    
    if (this.options.enableMetrics) {
      this.metrics.performance[metric] = perfEntry;
    }
    
    this._consoleLog('⚡', perfEntry);
  }

  // =============================================================================
  // DEBUGGING AND ANALYSIS METHODS
  // =============================================================================

  /**
   * Get summary of conversion process
   */
  getSummary() {
    const totalTime = Date.now() - this.startTime;
    const errors = this.metrics.errors;
    const slides = this.metrics.slides;
    const shapes = this.metrics.shapes;
    
    return {
      conversionId: this.conversionId,
      totalProcessingTime: totalTime,
      totalLogs: this.logs.length,
      summary: {
        presentation: {
          processed: !!this.metrics.presentation.extracted,
          startTime: this.startTime,
          endTime: Date.now()
        },
        slides: {
          total: slides.length,
          processed: slides.filter(slide => slide.processed).length,
          failed: slides.filter(slide => slide.failed).length,
          avgProcessingTime: slides.length > 0 ? 
            slides.reduce((sum, slide) => sum + (slide.processingTime || 0), 0) / slides.length : 0
        },
        shapes: {
          total: shapes.length,
          successful: shapes.filter(shape => shape.action === 'enriched').length,
          failed: shapes.filter(shape => shape.action === 'failed').length,
          types: this._getShapeTypeDistribution()
        },
        errors: {
          total: errors.length,
          byLevel: this._groupBy(errors, 'level'),
          byContext: this._groupBy(errors, error => error.context?.level || 'unknown')
        },
        performance: this.metrics.performance
      }
    };
  }

  /**
   * Get detailed error analysis
   */
  getErrorAnalysis() {
    const errors = this.metrics.errors;
    
    return {
      conversionId: this.conversionId,
      totalErrors: errors.length,
      errorCategories: {
        presentation: errors.filter(e => e.context?.level === 'PRESENTATION').length,
        slide: errors.filter(e => e.context?.level === 'SLIDE').length,
        shape: errors.filter(e => e.context?.level === 'SHAPE').length,
        aspose: errors.filter(e => e.error.message?.includes('aspose')).length,
        memory: errors.filter(e => e.error.message?.includes('memory')).length,
        timeout: errors.filter(e => e.error.message?.includes('timeout')).length
      },
      commonErrors: this._getMostCommonErrors(),
      errorsBySlide: this._getErrorsBySlide(),
      criticalErrors: errors.filter(e => e.level === 'PRESENTATION' || e.level === 'SLIDE'),
      recommendations: this._generateErrorRecommendations(errors)
    };
  }

  /**
   * Get shape processing insights
   */
  getShapeInsights() {
    const shapes = this.metrics.shapes;
    
    return {
      conversionId: this.conversionId,
      totalShapes: shapes.length,
      shapeTypes: this._getShapeTypeDistribution(),
      problemShapes: shapes.filter(shape => 
        shape.action === 'failed' || 
        shape.metadata?.issues?.length > 0
      ),
      processingStats: {
        avgProcessingTime: shapes.length > 0 ? 
          shapes.reduce((sum, shape) => sum + (shape.metadata?.processingTime || 0), 0) / shapes.length : 0,
        slowestShapes: shapes
          .filter(shape => shape.metadata?.processingTime)
          .sort((a, b) => b.metadata.processingTime - a.metadata.processingTime)
          .slice(0, 10)
      },
      slideDistribution: this._getShapesPerSlide()
    };
  }

  // =============================================================================
  // EXPORT AND PERSISTENCE
  // =============================================================================

  /**
   * Export full logs for debugging
   */
  exportLogs() {
    return {
      conversionId: this.conversionId,
      startTime: this.startTime,
      endTime: Date.now(),
      totalProcessingTime: Date.now() - this.startTime,
      options: this.options,
      logs: this.logs,
      metrics: this.metrics,
      summary: this.getSummary()
    };
  }

  /**
   * Save logs to file (for debugging)
   */
  async saveToFile(filePath) {
    const fs = require('fs').promises;
    const exportData = this.exportLogs();
    
    await fs.writeFile(
      filePath, 
      JSON.stringify(exportData, null, 2),
      'utf8'
    );
    
    return filePath;
  }

  // =============================================================================
  // PRIVATE HELPER METHODS
  // =============================================================================

  _createLogEntry(level, action, data, metadata = {}) {
    return {
      timestamp: new Date().toISOString(),
      conversionId: this.conversionId,
      level,
      action,
      data,
      metadata,
      processingTime: Date.now() - this.startTime
    };
  }

  _addLog(logEntry) {
    this.logs.push(logEntry);
  }

  _consoleLog(emoji, logEntry, isError = false) {
    if (this.options.logLevel === 'NONE') return;
    
    const logLevel = logEntry.level || 'INFO';
    const shouldLog = this._shouldLog(logLevel);
    
    if (!shouldLog) return;
    
    const message = `${emoji} [${logEntry.conversionId}] ${logLevel}:${logEntry.action} - ${JSON.stringify(logEntry.data)}`;
    
    if (isError) {
      console.error(message);
    } else {
      console.log(message);
    }
  }

  _shouldLog(level) {
    const levels = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
    const currentLevelIndex = levels.indexOf(this.options.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    
    return messageLevelIndex >= currentLevelIndex;
  }

  _getShapeTypeDistribution() {
    const shapes = this.metrics.shapes;
    const distribution = {};
    
    shapes.forEach(shape => {
      const shapeType = shape.data?.shapeType || shape.metadata?.shapeType || 'unknown';
      distribution[shapeType] = (distribution[shapeType] || 0) + 1;
    });
    
    return distribution;
  }

  _getMostCommonErrors() {
    const errors = this.metrics.errors;
    const errorCounts = {};
    
    errors.forEach(error => {
      const key = error.error.message || error.error.code;
      errorCounts[key] = (errorCounts[key] || 0) + 1;
    });
    
    return Object.entries(errorCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([message, count]) => ({ message, count }));
  }

  _getErrorsBySlide() {
    const errors = this.metrics.errors;
    const bySlide = {};
    
    errors.forEach(error => {
      const slideIndex = error.context?.slideIndex ?? 'unknown';
      if (!bySlide[slideIndex]) bySlide[slideIndex] = [];
      bySlide[slideIndex].push(error);
    });
    
    return bySlide;
  }

  _getShapesPerSlide() {
    const shapes = this.metrics.shapes;
    const perSlide = {};
    
    shapes.forEach(shape => {
      const slideIndex = shape.slideIndex;
      perSlide[slideIndex] = (perSlide[slideIndex] || 0) + 1;
    });
    
    return perSlide;
  }

  _generateErrorRecommendations(errors) {
    const recommendations = [];
    
    // Analyze error patterns and suggest solutions
    const asposeErrors = errors.filter(e => e.error.message?.includes('aspose')).length;
    const shapeErrors = errors.filter(e => e.context?.level === 'SHAPE').length;
    const memoryErrors = errors.filter(e => e.error.message?.includes('memory')).length;
    
    if (asposeErrors > 0) {
      recommendations.push({
        type: 'aspose_issue',
        priority: 'high',
        message: 'Multiple Aspose.Slides errors detected. Check library installation and licensing.',
        action: 'Verify Aspose.Slides library is properly loaded and licensed'
      });
    }
    
    if (shapeErrors > 5) {
      recommendations.push({
        type: 'shape_processing',
        priority: 'medium',
        message: 'High number of shape processing errors. Consider implementing more defensive programming.',
        action: 'Add more null checks and fallback values for shape properties'
      });
    }
    
    if (memoryErrors > 0) {
      recommendations.push({
        type: 'memory_issue',
        priority: 'high',
        message: 'Memory-related errors detected. Large presentations may need streaming processing.',
        action: 'Implement slide-by-slide processing for large files'
      });
    }
    
    return recommendations;
  }

  _groupBy(array, keyFn) {
    return array.reduce((groups, item) => {
      const key = typeof keyFn === 'function' ? keyFn(item) : item[keyFn];
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
      return groups;
    }, {});
  }
}

module.exports = ConversionLogger; 