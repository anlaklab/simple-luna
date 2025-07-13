import { z } from "zod";
/**
 * Fidelity Tracker Service - Round-trip conversion quality monitoring
 * 
 * Tracks data fidelity for PPTX → JSON → PPTX conversions
 */

import _ from 'lodash';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

// =============================================================================
// TYPES
// =============================================================================

interface FidelityIssue {
  type: 'missing_property' | 'unsupported_element' | 'conversion_loss' | 'format_mismatch';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  location: string; // e.g., "slide_1.shape_2.text"
  originalValue?: any;
  convertedValue?: any;
  suggestion?: string;
}

interface ElementSupport {
  isSupported: boolean;
  partialSupport?: boolean;
  supportedFeatures?: string[];
  unsupportedFeatures?: string[];
  fallbackUsed?: boolean;
  fallbackDescription?: string;
}

interface FidelityReport {
  reportId: string;
  timestamp: string;
  conversionId: string;
  originalFile: string;
  
  // Overall metrics
  fidelityScore: number; // 0-100
  overallQuality: 'excellent' | 'good' | 'fair' | 'poor';
  
  // Detailed metrics
  metrics: {
    slidesProcessed: number;
    shapesProcessed: number;
    textElementsProcessed: number;
    imagesProcessed: number;
    animationsProcessed: number;
    
    elementsSupported: number;
    elementsPartialSupport: number;
    elementsUnsupported: number;
    
    propertiesPreserved: number;
    propertiesLost: number;
    propertiesModified: number;
  };
  
  // Issues found
  issues: FidelityIssue[];
  
  // Recommendations
  recommendations: string[];
  
  // Processing stats
  processingTime: number;
  memoryUsage?: number;
}

interface ConversionContext {
  conversionId: string;
  stage: 'pptx_to_json' | 'json_to_pptx' | 'round_trip_complete';
  originalData?: any;
  convertedData?: any;
  issues: FidelityIssue[];
  supportMap: Map<string, ElementSupport>;
}

// =============================================================================
// FIDELITY TRACKER SERVICE
// =============================================================================

export class FidelityTrackerService {
  private readonly activeSessions = new Map<string, ConversionContext>();
  private readonly conversionHistory: FidelityReport[] = [];
  private readonly maxHistorySize = 1000;

  constructor() {
    logger.info('Fidelity Tracker Service initialized');
  }

  // =============================================================================
  // SESSION MANAGEMENT
  // =============================================================================

  /**
   * Start tracking a new conversion session
   */
  startConversionTracking(originalFile: string): string {
    const conversionId = uuidv4();
    
    const context: ConversionContext = {
      conversionId,
      stage: 'pptx_to_json',
      originalData: null,
      convertedData: null,
      issues: [],
      supportMap: new Map(),
    };

    this.activeSessions.set(conversionId, context);
    
    logger.info('Started fidelity tracking', {
      conversionId,
      originalFile,
    });

    return conversionId;
  }

  /**
   * Update conversion stage
   */
  updateConversionStage(conversionId: string, stage: ConversionContext['stage'], data?: any): void {
    const context = this.activeSessions.get(conversionId);
    if (!context) {
      logger.warn('Conversion context not found', { conversionId });
      return;
    }

    context.stage = stage;
    
    if (stage === 'pptx_to_json') {
      context.originalData = data;
    } else if (stage === 'json_to_pptx') {
      context.convertedData = data;
    }

    logger.debug('Updated conversion stage', {
      conversionId,
      stage,
      dataSize: data ? JSON.stringify(data).length : 0,
    });
  }

  // =============================================================================
  // FIDELITY ANALYSIS
  // =============================================================================

  /**
   * Analyze slide fidelity during conversion
   */
  analyzeSlide(conversionId: string, slideIndex: number, originalSlide: any, convertedSlide?: any): void {
    const context = this.activeSessions.get(conversionId);
    if (!context) return;

    const location = `slide_${slideIndex + 1}`;
    
    // Check slide-level properties
    this.checkSlideProperties(context, location, originalSlide, convertedSlide);
    
    // Analyze shapes
    if (originalSlide.shapes) {
      originalSlide.shapes.forEach((shape: any, shapeIndex: number) => {
        const shapeLocation = `${location}.shape_${shapeIndex + 1}`;
        const convertedShape = convertedSlide?.shapes?.[shapeIndex];
        
        this.analyzeShape(context, shapeLocation, shape, convertedShape);
      });
    }

    logger.debug('Analyzed slide fidelity', {
      conversionId,
      slideIndex: slideIndex + 1,
      shapeCount: originalSlide.shapes?.length || 0,
    });
  }

  /**
   * Analyze shape fidelity
   */
  private analyzeShape(context: ConversionContext, location: string, originalShape: any, convertedShape?: any): void {
    // Check shape support
    const support = this.checkElementSupport('shape', originalShape.type, originalShape);
    context.supportMap.set(location, support);

    if (!support.isSupported) {
      this.addIssue(context, {
        type: 'unsupported_element',
        severity: 'high',
        description: `Unsupported shape type: ${originalShape.type}`,
        location,
        suggestion: 'Consider using a simpler shape type or manual recreation',
      });
    }

    // Compare properties if we have both original and converted
    if (convertedShape) {
      this.compareShapeProperties(context, location, originalShape, convertedShape);
    }

    // Analyze text content
    if (originalShape.text) {
      this.analyzeTextContent(context, `${location}.text`, originalShape.text, convertedShape?.text);
    }

    // Analyze formatting
    if (originalShape.fillFormat) {
      this.analyzeFormatting(context, `${location}.fill`, originalShape.fillFormat, convertedShape?.fillFormat);
    }

    if (originalShape.lineFormat) {
      this.analyzeFormatting(context, `${location}.line`, originalShape.lineFormat, convertedShape?.lineFormat);
    }
  }

  /**
   * Compare shape properties for differences
   */
  private compareShapeProperties(context: ConversionContext, location: string, original: any, converted: any): void {
    const criticalProperties = ['type', 'geometry', 'rotation', 'isVisible'];
    const importantProperties = ['name', 'zOrder', 'isLocked'];

    // Check critical properties
    criticalProperties.forEach(prop => {
      if (!_.isEqual(original[prop], converted[prop])) {
        this.addIssue(context, {
          type: 'conversion_loss',
          severity: 'high',
          description: `Critical property difference: ${prop}`,
          location,
          originalValue: original[prop],
          convertedValue: converted[prop],
          suggestion: `Verify ${prop} handling in conversion logic`,
        });
      }
    });

    // Check important properties
    importantProperties.forEach(prop => {
      if (!_.isEqual(original[prop], converted[prop])) {
        this.addIssue(context, {
          type: 'conversion_loss',
          severity: 'medium',
          description: `Property difference: ${prop}`,
          location,
          originalValue: original[prop],
          convertedValue: converted[prop],
        });
      }
    });

    // Deep diff for geometry if available
    if (original.geometry && converted.geometry) {
      const geometryDiff = this.deepDiff(original.geometry, converted.geometry);
      if (geometryDiff.length > 0) {
        this.addIssue(context, {
          type: 'conversion_loss',
          severity: 'medium',
          description: `Geometry differences found: ${geometryDiff.length} properties`,
          location: `${location}.geometry`,
          suggestion: 'Review geometry extraction and reconstruction logic',
        });
      }
    }
  }

  /**
   * Analyze text content fidelity
   */
  private analyzeTextContent(context: ConversionContext, location: string, originalText: any, convertedText?: any): void {
    if (!originalText) return;

    // Check if text was preserved
    if (!convertedText) {
      this.addIssue(context, {
        type: 'conversion_loss',
        severity: 'critical',
        description: 'Text content completely lost during conversion',
        location,
        originalValue: originalText.plainText,
        suggestion: 'Check text extraction and reconstruction logic',
      });
      return;
    }

    // Compare plain text
    if (originalText.plainText !== convertedText.plainText) {
      const similarity = this.calculateTextSimilarity(originalText.plainText, convertedText.plainText);
      
      this.addIssue(context, {
        type: 'conversion_loss',
        severity: similarity < 0.9 ? 'high' : 'medium',
        description: `Text content differs (${Math.round(similarity * 100)}% similarity)`,
        location,
        originalValue: originalText.plainText,
        convertedValue: convertedText.plainText,
        suggestion: similarity < 0.5 ? 'Significant text loss - review text extraction' : 'Minor text differences detected',
      });
    }

    // Check formatting if available
    if (originalText.formatting && convertedText.formatting) {
      const formattingDiff = this.deepDiff(originalText.formatting, convertedText.formatting);
      if (formattingDiff.length > 0) {
        this.addIssue(context, {
          type: 'format_mismatch',
          severity: 'low',
          description: `Text formatting differences: ${formattingDiff.length} properties`,
          location: `${location}.formatting`,
        });
      }
    }
  }

  /**
   * Analyze formatting fidelity
   */
  private analyzeFormatting(context: ConversionContext, location: string, originalFormat: any, convertedFormat?: any): void {
    if (!originalFormat) return;

    if (!convertedFormat) {
      this.addIssue(context, {
        type: 'conversion_loss',
        severity: 'medium',
        description: 'Formatting information lost during conversion',
        location,
        suggestion: 'Check formatting extraction and reconstruction',
      });
      return;
    }

    // Compare format properties
    const formatDiff = this.deepDiff(originalFormat, convertedFormat);
    if (formatDiff.length > 0) {
      this.addIssue(context, {
        type: 'format_mismatch',
        severity: formatDiff.length > 5 ? 'medium' : 'low',
        description: `Formatting differences: ${formatDiff.length} properties`,
        location,
        suggestion: formatDiff.length > 10 ? 'Significant formatting loss detected' : 'Minor formatting differences',
      });
    }
  }

  // =============================================================================
  // ELEMENT SUPPORT CHECKING
  // =============================================================================

  /**
   * Check if an element type is supported
   */
  private checkElementSupport(category: string, type: string, element: any): ElementSupport {
    // Define support matrix
    const supportMatrix = {
      shape: {
        'AutoShape': { supported: true, features: ['geometry', 'text', 'formatting'] },
        'Rectangle': { supported: true, features: ['geometry', 'text', 'formatting'] },
        'Ellipse': { supported: true, features: ['geometry', 'text', 'formatting'] },
        'Line': { supported: true, features: ['geometry', 'formatting'] },
        'Chart': { supported: false, fallback: 'Shape with placeholder text' },
        'Table': { supported: false, fallback: 'Group of text shapes' },
        'SmartArt': { supported: false, fallback: 'Group of basic shapes' },
        'Video': { supported: false, fallback: 'Placeholder rectangle' },
        'Audio': { supported: false, fallback: 'Placeholder rectangle' },
        'OleObject': { supported: false, fallback: 'Placeholder rectangle' },
      },
      text: {
        'plainText': { supported: true },
        'richText': { supported: true, partial: ['some formatting may be lost'] },
        'hyperlinks': { supported: true },
        'bulletPoints': { supported: true },
      },
      animation: {
        'entrance': { supported: false, fallback: 'Animation removed' },
        'exit': { supported: false, fallback: 'Animation removed' },
        'emphasis': { supported: false, fallback: 'Animation removed' },
        'motion': { supported: false, fallback: 'Animation removed' },
      },
    };

    const categorySupport = supportMatrix[category as keyof typeof supportMatrix];
    if (!categorySupport) {
      return { isSupported: false };
    }

    const typeSupport = async (categorySupport as any)[type];
    if (!typeSupport) {
      return { isSupported: false };
    }

    if (typeSupport.supported === false) {
      return {
        isSupported: false,
        fallbackUsed: true,
        fallbackDescription: typeSupport.fallback,
      };
    }

    return {
      isSupported: true,
      supportedFeatures: typeSupport.features,
      partialSupport: !!typeSupport.partial,
      unsupportedFeatures: typeSupport.partial,
    };
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  /**
   * Add an issue to the context
   */
  private addIssue(context: ConversionContext, issue: FidelityIssue): void {
    context.issues.push(issue);
    
    logger.debug('Fidelity issue detected', {
      conversionId: context.conversionId,
      type: issue.type,
      severity: issue.severity,
      location: issue.location,
      description: issue.description,
    });
  }

  /**
   * Check slide-level properties
   */
  private checkSlideProperties(context: ConversionContext, location: string, original: any, converted?: any): void {
    const slideProperties = ['name', 'slideType', 'hidden', 'background', 'transition'];
    
    slideProperties.forEach(prop => {
      if (original[prop] !== undefined && converted && !_.isEqual(original[prop], converted[prop])) {
        this.addIssue(context, {
          type: 'conversion_loss',
          severity: prop === 'background' ? 'medium' : 'low',
          description: `Slide property difference: ${prop}`,
          location,
          originalValue: original[prop],
          convertedValue: converted[prop],
        });
      }
    });
  }

  /**
   * Calculate text similarity between two strings
   */
  private calculateTextSimilarity(text1: string, text2: string): number {
    if (!text1 && !text2) return 1;
    if (!text1 || !text2) return 0;
    
    const len1 = text1.length;
    const len2 = text2.length;
    const maxLen = Math.max(len1, len2);
    
    if (maxLen === 0) return 1;
    
    // Simple similarity based on common characters
    let common = 0;
    const shorter = len1 < len2 ? text1 : text2;
    const longer = len1 >= len2 ? text1 : text2;
    
    for (let i = 0; i < shorter.length; i++) {
      if (longer.includes(shorter[i])) {
        common++;
      }
    }
    
    return common / maxLen;
  }

  /**
   * Deep diff between two objects
   */
  private deepDiff(obj1: any, obj2: any): string[] {
    const differences: string[] = [];
    
    const compare = async (a: any, b: any, path: string = '') => {
      if (_.isObject(a) && _.isObject(b)) {
        const allKeys = _.union(Object.keys(a), Object.keys(b));
        allKeys.forEach((key: string) => {
          const newPath = path ? `${path}.${key}` : key;
          compare((a as any)[key], (b as any)[key], newPath);
        });
      } else if (!_.isEqual(a, b)) {
        differences.push(path);
      }
    };
    
    compare(obj1, obj2);
    return differences;
  }

  // =============================================================================
  // REPORT GENERATION
  // =============================================================================

  /**
   * Generate final fidelity report
   */
  generateFidelityReport(conversionId: string, originalFile: string, processingTime: number): FidelityReport | null {
    const context = this.activeSessions.get(conversionId);
    if (!context) {
      logger.warn('Cannot generate report - context not found', { conversionId });
      return null;
    }

    // Calculate metrics
    const metrics = this.calculateMetrics(context);
    const fidelityScore = this.calculateFidelityScore(context, metrics);
    const quality = this.determineQuality(fidelityScore);
    const recommendations = this.generateRecommendations(context);

    const report: FidelityReport = {
      reportId: uuidv4(),
      timestamp: new Date().toISOString(),
      conversionId,
      originalFile,
      fidelityScore,
      overallQuality: quality,
      metrics,
      issues: context.issues,
      recommendations,
      processingTime,
      memoryUsage: process.memoryUsage().heapUsed,
    };

    // Store in history
    this.conversionHistory.push(report);
    if (this.conversionHistory.length > this.maxHistorySize) {
      this.conversionHistory.shift();
    }

    // Clean up session
    this.activeSessions.delete(conversionId);

    logger.info('Fidelity report generated', {
      conversionId,
      fidelityScore,
      quality,
      issueCount: context.issues.length,
    });

    return report;
  }

  /**
   * Calculate conversion metrics
   */
  private calculateMetrics(context: ConversionContext): FidelityReport['metrics'] {
    const supportArray = Array.from(context.supportMap.values());
    
    return {
      slidesProcessed: 0, // Will be set by caller
      shapesProcessed: supportArray.length,
      textElementsProcessed: 0, // Could be enhanced
      imagesProcessed: 0, // Could be enhanced
      animationsProcessed: 0, // Could be enhanced
      
      elementsSupported: supportArray.filter(s => s.isSupported).length,
      elementsPartialSupport: supportArray.filter(s => s.partialSupport).length,
      elementsUnsupported: supportArray.filter(s => !s.isSupported).length,
      
      propertiesPreserved: 0, // Could be calculated from deep comparison
      propertiesLost: context.issues.filter(i => i.type === 'conversion_loss').length,
      propertiesModified: context.issues.filter(i => i.type === 'format_mismatch').length,
    };
  }

  /**
   * Calculate overall fidelity score (0-100)
   */
  private calculateFidelityScore(context: ConversionContext, metrics: FidelityReport['metrics']): number {
    let score = 100;
    
    // Deduct for unsupported elements
    const unsupportedPenalty = async (metrics.elementsUnsupported / Math.max(metrics.shapesProcessed, 1)) * 30;
    score -= unsupportedPenalty;
    
    // Deduct for issues by severity
    context.issues.forEach(issue => {
      switch (issue.severity) {
        case 'critical': score -= 10; break;
        case 'high': score -= 5; break;
        case 'medium': score -= 2; break;
        case 'low': score -= 0.5; break;
      }
    });
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Determine quality rating
   */
  private determineQuality(score: number): FidelityReport['overallQuality'] {
    if (score >= 90) return 'excellent';
    if (score >= 75) return 'good';
    if (score >= 60) return 'fair';
    return 'poor';
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(context: ConversionContext): string[] {
    const recommendations: string[] = [];
    
    const criticalIssues = context.issues.filter(i => i.severity === 'critical').length;
    const highIssues = context.issues.filter(i => i.severity === 'high').length;
    const unsupportedElements = Array.from(context.supportMap.values()).filter(s => !s.isSupported).length;
    
    if (criticalIssues > 0) {
      recommendations.push('Critical data loss detected - review extraction logic immediately');
    }
    
    if (highIssues > 5) {
      recommendations.push('Multiple high-severity issues found - consider preprocessing input file');
    }
    
    if (unsupportedElements > 0) {
      recommendations.push(`${unsupportedElements} unsupported elements detected - consider manual conversion for these elements`);
    }
    
    const textIssues = context.issues.filter(i => i.location.includes('.text')).length;
    if (textIssues > 0) {
      recommendations.push('Text content issues detected - verify text extraction and encoding');
    }
    
    const formattingIssues = context.issues.filter(i => i.type === 'format_mismatch').length;
    if (formattingIssues > 10) {
      recommendations.push('Significant formatting differences - consider improving format mapping');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Conversion completed with high fidelity - no specific recommendations');
    }
    
    return recommendations;
  }

  /**
   * Get conversion history
   */
  getConversionHistory(limit: number = 50): FidelityReport[] {
    return this.conversionHistory.slice(-limit);
  }

  /**
   * Get fidelity statistics
   */
  getFidelityStatistics(): {
    totalConversions: number;
    averageFidelityScore: number;
    qualityDistribution: Record<string, number>;
    commonIssues: Array<{ type: string; count: number }>;
  } {
    const reports = this.conversionHistory;
    
    if (reports.length === 0) {
      return {
        totalConversions: 0,
        averageFidelityScore: 0,
        qualityDistribution: {},
        commonIssues: [],
      };
    }
    
    const avgScore = reports.reduce((sum, r) => sum + r.fidelityScore, 0) / reports.length;
    
    const qualityDist: Record<string, number> = {};
    reports.forEach(r => {
      qualityDist[r.overallQuality] = (qualityDist[r.overallQuality] || 0) + 1;
    });
    
    // Count common issues
    const issueTypes: Record<string, number> = {};
    reports.forEach(r => {
      r.issues.forEach(issue => {
        issueTypes[issue.type] = (issueTypes[issue.type] || 0) + 1;
      });
    });
    
    const commonIssues = Object.entries(issueTypes)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    return {
      totalConversions: reports.length,
      averageFidelityScore: Math.round(avgScore * 100) / 100,
      qualityDistribution: qualityDist,
      commonIssues,
    };
  }
} 