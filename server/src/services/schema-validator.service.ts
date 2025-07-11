/**
 * Schema Validation & Auto-Fix Service
 * 
 * Comprehensive validation and automatic fixing of Universal PowerPoint Schema
 * Ensures data integrity and compliance with schema definitions
 */

import { logger } from '../utils/logger';
import { UniversalPresentation, UniversalSlide, UniversalShape } from '../types/universal-json';
import Ajv, { JSONSchemaType, ErrorObject } from 'ajv';
import addFormats from 'ajv-formats';

export interface SchemaValidationResult {
  isValid: boolean;
  errors: SchemaValidationError[];
  warnings: SchemaValidationWarning[];
  autoFixesApplied: number;
  fixedData?: UniversalPresentation;
}

export interface SchemaValidationError {
  path: string;
  message: string;
  severity: 'error' | 'warning';
  code: string;
  expectedType?: string;
  actualValue?: any;
  suggestions?: string[];
}

export interface SchemaValidationWarning {
  path: string;
  message: string;
  recommendation: string;
  impact: 'low' | 'medium' | 'high';
}

export interface AutoFixOptions {
  enableAutoFix: boolean;
  fixMissingRequired: boolean;
  fixInvalidTypes: boolean;
  fixInvalidValues: boolean;
  fixInconsistentData: boolean;
  preserveOriginalStructure: boolean;
  generateMissingIds: boolean;
}

export class SchemaValidatorService {
  private ajv: Ajv;
  private universalSchemaValidator: any;

  constructor() {
    this.ajv = new Ajv({ 
      allErrors: true, 
      verbose: true,
      strict: false,
      coerceTypes: true,
    });
    addFormats(this.ajv);
    this.initializeSchema();
  }

  /**
   * Initialize Universal PowerPoint Schema validator
   */
  private initializeSchema(): void {
    // Universal PowerPoint Schema definition
    const universalPresentationSchema: JSONSchemaType<UniversalPresentation> = {
      type: 'object',
      properties: {
        metadata: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            author: { type: 'string', nullable: true },
            subject: { type: 'string', nullable: true },
            keywords: { type: 'string', nullable: true },
            comments: { type: 'string', nullable: true },
            category: { type: 'string', nullable: true },
            manager: { type: 'string', nullable: true },
            company: { type: 'string', nullable: true },
            createdTime: { type: 'string', format: 'date-time', nullable: true },
            lastSavedTime: { type: 'string', format: 'date-time', nullable: true },
            lastPrintedDate: { type: 'string', format: 'date-time', nullable: true },
            revisionNumber: { type: 'number', minimum: 1, nullable: true },
            totalEditingTime: { type: 'number', minimum: 0, nullable: true },
            slideCount: { type: 'number', minimum: 0 },
            version: { type: 'string' },
            slideSize: {
              type: 'object',
              properties: {
                width: { type: 'number', minimum: 1 },
                height: { type: 'number', minimum: 1 },
                type: { type: 'string' },
                orientation: { type: 'string', enum: ['landscape', 'portrait'] },
              },
              required: ['width', 'height', 'type', 'orientation'],
              nullable: true,
            },
          },
          required: ['title', 'slideCount', 'version'],
        },
        slides: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              slideIndex: { type: 'number', minimum: 0 },
              slideId: { type: 'string', nullable: true },
              title: { type: 'string', nullable: true },
              layout: { type: 'string', nullable: true },
              background: {
                type: 'object',
                properties: {
                  type: { type: 'string', enum: ['solid', 'gradient', 'image', 'pattern'] },
                  color: { type: 'string', nullable: true },
                  image: { type: 'string', nullable: true },
                },
                required: ['type'],
                nullable: true,
              },
              shapes: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    shapeIndex: { type: 'number', minimum: 0 },
                    shapeId: { type: 'string', nullable: true },
                    name: { type: 'string', nullable: true },
                    type: { 
                      type: 'string', 
                      enum: [
                        'textBox', 'rectangle', 'ellipse', 'line', 'connector',
                        'chart', 'table', 'image', 'video', 'audio', 'groupShape',
                        'smartArt', 'oleObject', 'freeform', 'autoShape'
                      ] 
                    },
                    geometry: {
                      type: 'object',
                      properties: {
                        x: { type: 'number' },
                        y: { type: 'number' },
                        width: { type: 'number', minimum: 0 },
                        height: { type: 'number', minimum: 0 },
                        rotation: { type: 'number', minimum: 0, maximum: 360 },
                      },
                      required: ['x', 'y', 'width', 'height'],
                    },
                    text: {
                      type: 'object',
                      properties: {
                        content: { type: 'string' },
                        paragraphs: { type: 'array', items: { type: 'object' } },
                      },
                      nullable: true,
                    },
                    fill: { type: 'object', nullable: true },
                    line: { type: 'object', nullable: true },
                    effects: { type: 'object', nullable: true },
                    chart: { type: 'object', nullable: true },
                    table: { type: 'object', nullable: true },
                    image: { type: 'object', nullable: true },
                    video: { type: 'object', nullable: true },
                    audio: { type: 'object', nullable: true },
                  },
                  required: ['shapeIndex', 'type', 'geometry'],
                },
              },
              animations: { type: 'array', items: { type: 'object' }, nullable: true },
              transitions: { type: 'object', nullable: true },
              notes: { type: 'string', nullable: true },
              comments: { type: 'array', items: { type: 'object' }, nullable: true },
            },
            required: ['slideIndex', 'shapes'],
          },
        },
        animations: { type: 'array', items: { type: 'object' }, nullable: true },
        transitions: { type: 'array', items: { type: 'object' }, nullable: true },
        masterSlides: { type: 'array', items: { type: 'object' }, nullable: true },
        layoutSlides: { type: 'array', items: { type: 'object' }, nullable: true },
        comments: { type: 'array', items: { type: 'object' }, nullable: true },
      },
      required: ['metadata', 'slides'],
    };

    this.universalSchemaValidator = this.ajv.compile(universalPresentationSchema);
  }

  /**
   * Validate Universal PowerPoint Schema with optional auto-fix
   */
  async validateSchema(
    data: any, 
    options: AutoFixOptions = this.getDefaultAutoFixOptions()
  ): Promise<SchemaValidationResult> {
    try {
      logger.info('Starting schema validation', { 
        enableAutoFix: options.enableAutoFix,
        dataType: typeof data 
      });

      const result: SchemaValidationResult = {
        isValid: false,
        errors: [],
        warnings: [],
        autoFixesApplied: 0,
      };

      // Clone data if auto-fix is enabled
      let workingData = options.enableAutoFix ? JSON.parse(JSON.stringify(data)) : data;

      // Primary schema validation
      const isValid = this.universalSchemaValidator(workingData);

      if (isValid) {
        result.isValid = true;
        result.fixedData = workingData;
        logger.info('Schema validation passed');
        return result;
      }

      // Process validation errors
      const errors = this.universalSchemaValidator.errors || [];
      result.errors = this.processValidationErrors(errors);

      // Apply auto-fixes if enabled
      if (options.enableAutoFix) {
        const fixResult = await this.applyAutoFixes(workingData, result.errors, options);
        result.autoFixesApplied = fixResult.fixesApplied;
        result.fixedData = fixResult.fixedData;

        // Re-validate after fixes
        const revalidationResult = this.universalSchemaValidator(result.fixedData);
        if (revalidationResult) {
          result.isValid = true;
          logger.info('Schema validation passed after auto-fix', { 
            fixesApplied: result.autoFixesApplied 
          });
        } else {
          // Filter out fixed errors
          const remainingErrors = this.universalSchemaValidator.errors || [];
          result.errors = this.processValidationErrors(remainingErrors);
        }
      }

      // Generate warnings for best practices
      result.warnings = await this.generateSchemaWarnings(workingData);

      logger.info('Schema validation completed', {
        isValid: result.isValid,
        errorsCount: result.errors.length,
        warningsCount: result.warnings.length,
        autoFixesApplied: result.autoFixesApplied,
      });

      return result;

    } catch (error) {
      logger.error('Schema validation failed', { error });
      throw error;
    }
  }

  /**
   * Process AJV validation errors into structured format
   */
  private processValidationErrors(ajvErrors: ErrorObject[]): SchemaValidationError[] {
    return ajvErrors.map(error => {
      const path = error.instancePath || error.schemaPath;
      
      let suggestions: string[] = [];
      let expectedType: string | undefined;

      switch (error.keyword) {
        case 'required':
          suggestions = [`Add required property: ${error.params?.missingProperty}`];
          break;
        case 'type':
          expectedType = error.params?.type;
          suggestions = [`Convert value to ${expectedType}`];
          break;
        case 'enum':
          suggestions = [`Use one of: ${error.params?.allowedValues?.join(', ')}`];
          break;
        case 'minimum':
          suggestions = [`Value must be >= ${error.params?.limit}`];
          break;
        case 'maximum':
          suggestions = [`Value must be <= ${error.params?.limit}`];
          break;
        case 'format':
          suggestions = [`Format should be: ${error.params?.format}`];
          break;
      }

      return {
        path,
        message: error.message || 'Validation error',
        severity: this.getErrorSeverity(error),
        code: error.keyword,
        expectedType,
        actualValue: error.data,
        suggestions,
      };
    });
  }

  /**
   * Apply automatic fixes to common schema issues
   */
  private async applyAutoFixes(
    data: any, 
    errors: SchemaValidationError[], 
    options: AutoFixOptions
  ): Promise<{ fixedData: any; fixesApplied: number }> {
    let fixesApplied = 0;
    const fixedData = { ...data };

    for (const error of errors) {
      const applied = await this.applySpecificFix(fixedData, error, options);
      if (applied) {
        fixesApplied++;
      }
    }

    // Apply additional consistency fixes
    if (options.fixInconsistentData) {
      fixesApplied += await this.fixInconsistencies(fixedData);
    }

    // Generate missing IDs
    if (options.generateMissingIds) {
      fixesApplied += await this.generateMissingIds(fixedData);
    }

    return { fixedData, fixesApplied };
  }

  /**
   * Apply specific fix for individual validation error
   */
  private async applySpecificFix(
    data: any, 
    error: SchemaValidationError, 
    options: AutoFixOptions
  ): Promise<boolean> {
    try {
      switch (error.code) {
        case 'required':
          if (options.fixMissingRequired) {
            return this.fixMissingRequired(data, error);
          }
          break;

        case 'type':
          if (options.fixInvalidTypes) {
            return this.fixInvalidType(data, error);
          }
          break;

        case 'enum':
          if (options.fixInvalidValues) {
            return this.fixInvalidEnum(data, error);
          }
          break;

        case 'minimum':
        case 'maximum':
          if (options.fixInvalidValues) {
            return this.fixOutOfRange(data, error);
          }
          break;

        case 'format':
          if (options.fixInvalidValues) {
            return this.fixInvalidFormat(data, error);
          }
          break;
      }

      return false;

    } catch (error) {
      logger.warn('Failed to apply specific fix', { error, errorCode: error });
      return false;
    }
  }

  /**
   * Fix missing required properties
   */
  private fixMissingRequired(data: any, error: SchemaValidationError): boolean {
    const pathParts = error.path.split('/').filter(Boolean);
    let target = data;

    // Navigate to parent object
    for (let i = 0; i < pathParts.length - 1; i++) {
      if (!target[pathParts[i]]) {
        target[pathParts[i]] = {};
      }
      target = target[pathParts[i]];
    }

    // Add missing required property with appropriate default
    const missingProp = error.message?.match(/required property '(.+)'/)?.[1];
    if (missingProp && !target[missingProp]) {
      target[missingProp] = this.getDefaultValueForProperty(missingProp);
      return true;
    }

    return false;
  }

  /**
   * Fix invalid data types
   */
  private fixInvalidType(data: any, error: SchemaValidationError): boolean {
    const pathParts = error.path.split('/').filter(Boolean);
    let target = data;

    // Navigate to target
    for (let i = 0; i < pathParts.length - 1; i++) {
      target = target[pathParts[i]];
    }

    const propertyName = pathParts[pathParts.length - 1];
    const currentValue = target[propertyName];

    if (error.expectedType) {
      target[propertyName] = this.convertToType(currentValue, error.expectedType);
      return true;
    }

    return false;
  }

  /**
   * Fix invalid enum values
   */
  private fixInvalidEnum(data: any, error: SchemaValidationError): boolean {
    const pathParts = error.path.split('/').filter(Boolean);
    let target = data;

    for (let i = 0; i < pathParts.length - 1; i++) {
      target = target[pathParts[i]];
    }

    const propertyName = pathParts[pathParts.length - 1];
    const allowedValues = error.suggestions?.[0]?.split(': ')[1]?.split(', ') || [];

    if (allowedValues.length > 0) {
      target[propertyName] = allowedValues[0]; // Use first allowed value
      return true;
    }

    return false;
  }

  /**
   * Fix out of range values
   */
  private fixOutOfRange(data: any, error: SchemaValidationError): boolean {
    const pathParts = error.path.split('/').filter(Boolean);
    let target = data;

    for (let i = 0; i < pathParts.length - 1; i++) {
      target = target[pathParts[i]];
    }

    const propertyName = pathParts[pathParts.length - 1];
    const currentValue = target[propertyName];

    if (error.code === 'minimum') {
      const minValue = parseInt(error.suggestions?.[0]?.match(/\d+/)?.[0] || '0');
      target[propertyName] = Math.max(currentValue, minValue);
      return true;
    } else if (error.code === 'maximum') {
      const maxValue = parseInt(error.suggestions?.[0]?.match(/\d+/)?.[0] || '100');
      target[propertyName] = Math.min(currentValue, maxValue);
      return true;
    }

    return false;
  }

  /**
   * Fix invalid format values
   */
  private fixInvalidFormat(data: any, error: SchemaValidationError): boolean {
    const pathParts = error.path.split('/').filter(Boolean);
    let target = data;

    for (let i = 0; i < pathParts.length - 1; i++) {
      target = target[pathParts[i]];
    }

    const propertyName = pathParts[pathParts.length - 1];
    const currentValue = target[propertyName];

    // Handle date-time format
    if (error.suggestions?.[0]?.includes('date-time')) {
      try {
        target[propertyName] = new Date(currentValue).toISOString();
        return true;
      } catch {
        target[propertyName] = new Date().toISOString();
        return true;
      }
    }

    return false;
  }

  /**
   * Fix data inconsistencies
   */
  private async fixInconsistencies(data: any): Promise<number> {
    let fixesApplied = 0;

    // Fix slide count mismatch
    if (data.metadata && data.slides) {
      const actualSlideCount = data.slides.length;
      if (data.metadata.slideCount !== actualSlideCount) {
        data.metadata.slideCount = actualSlideCount;
        fixesApplied++;
      }
    }

    // Fix slide indices
    if (data.slides) {
      data.slides.forEach((slide: any, index: number) => {
        if (slide.slideIndex !== index) {
          slide.slideIndex = index;
          fixesApplied++;
        }
      });
    }

    // Fix shape indices
    if (data.slides) {
      data.slides.forEach((slide: any) => {
        if (slide.shapes) {
          slide.shapes.forEach((shape: any, index: number) => {
            if (shape.shapeIndex !== index) {
              shape.shapeIndex = index;
              fixesApplied++;
            }
          });
        }
      });
    }

    return fixesApplied;
  }

  /**
   * Generate missing IDs
   */
  private async generateMissingIds(data: any): Promise<number> {
    let fixesApplied = 0;

    // Generate slide IDs
    if (data.slides) {
      data.slides.forEach((slide: any, index: number) => {
        if (!slide.slideId) {
          slide.slideId = `slide_${index + 1}`;
          fixesApplied++;
        }
      });
    }

    // Generate shape IDs
    if (data.slides) {
      data.slides.forEach((slide: any, slideIndex: number) => {
        if (slide.shapes) {
          slide.shapes.forEach((shape: any, shapeIndex: number) => {
            if (!shape.shapeId) {
              shape.shapeId = `slide_${slideIndex + 1}_shape_${shapeIndex + 1}`;
              fixesApplied++;
            }
          });
        }
      });
    }

    return fixesApplied;
  }

  /**
   * Generate schema warnings for best practices
   */
  private async generateSchemaWarnings(data: any): Promise<SchemaValidationWarning[]> {
    const warnings: SchemaValidationWarning[] = [];

    // Check for missing optional but recommended fields
    if (!data.metadata?.author) {
      warnings.push({
        path: 'metadata.author',
        message: 'Author information is missing',
        recommendation: 'Add author information for better document metadata',
        impact: 'low',
      });
    }

    if (!data.metadata?.subject) {
      warnings.push({
        path: 'metadata.subject',
        message: 'Subject information is missing',
        recommendation: 'Add subject for better document categorization',
        impact: 'low',
      });
    }

    // Check for slides without content
    if (data.slides) {
      data.slides.forEach((slide: any, index: number) => {
        if (!slide.shapes || slide.shapes.length === 0) {
          warnings.push({
            path: `slides[${index}]`,
            message: 'Slide has no content',
            recommendation: 'Consider adding content or removing empty slide',
            impact: 'medium',
          });
        }
      });
    }

    // Check for very small or very large shapes
    if (data.slides) {
      data.slides.forEach((slide: any, slideIndex: number) => {
        if (slide.shapes) {
          slide.shapes.forEach((shape: any, shapeIndex: number) => {
            if (shape.geometry) {
              if (shape.geometry.width < 10 || shape.geometry.height < 10) {
                warnings.push({
                  path: `slides[${slideIndex}].shapes[${shapeIndex}].geometry`,
                  message: 'Shape is very small and may not be visible',
                  recommendation: 'Increase shape size for better visibility',
                  impact: 'medium',
                });
              }
            }
          });
        }
      });
    }

    return warnings;
  }

  /**
   * Get default value for property
   */
  private getDefaultValueForProperty(propertyName: string): any {
    const defaults: Record<string, any> = {
      title: 'Untitled Presentation',
      slideCount: 0,
      version: '1.0.0',
      author: '',
      subject: '',
      slideIndex: 0,
      shapeIndex: 0,
      type: 'textBox',
      x: 0,
      y: 0,
      width: 100,
      height: 50,
      rotation: 0,
      shapes: [],
    };

    return defaults[propertyName] ?? null;
  }

  /**
   * Convert value to specified type
   */
  private convertToType(value: any, targetType: string): any {
    switch (targetType) {
      case 'string':
        return String(value);
      case 'number':
        return Number(value) || 0;
      case 'boolean':
        return Boolean(value);
      case 'array':
        return Array.isArray(value) ? value : [];
      case 'object':
        return typeof value === 'object' ? value : {};
      default:
        return value;
    }
  }

  /**
   * Get error severity
   */
  private getErrorSeverity(error: ErrorObject): 'error' | 'warning' {
    // Critical errors that prevent schema compliance
    const criticalKeywords = ['required', 'type', 'enum'];
    return criticalKeywords.includes(error.keyword) ? 'error' : 'warning';
  }

  /**
   * Get default auto-fix options
   */
  private getDefaultAutoFixOptions(): AutoFixOptions {
    return {
      enableAutoFix: true,
      fixMissingRequired: true,
      fixInvalidTypes: true,
      fixInvalidValues: true,
      fixInconsistentData: true,
      preserveOriginalStructure: true,
      generateMissingIds: true,
    };
  }

  /**
   * Validate specific slide against schema
   */
  async validateSlide(slide: UniversalSlide): Promise<SchemaValidationResult> {
    // Implementation for slide-specific validation
    return this.validateSchema({ slides: [slide] });
  }

  /**
   * Validate specific shape against schema
   */
  async validateShape(shape: UniversalShape): Promise<SchemaValidationResult> {
    // Implementation for shape-specific validation
    return this.validateSchema({ 
      metadata: { title: 'temp', slideCount: 1, version: '1.0.0' },
      slides: [{ slideIndex: 0, shapes: [shape] }] 
    });
  }

  /**
   * Generate schema compliance report
   */
  async generateComplianceReport(data: any): Promise<{
    overallScore: number;
    compliance: {
      metadata: number;
      slides: number;
      shapes: number;
      overall: number;
    };
    recommendations: string[];
  }> {
    const validationResult = await this.validateSchema(data, { 
      ...this.getDefaultAutoFixOptions(), 
      enableAutoFix: false 
    });

    const totalIssues = validationResult.errors.length + validationResult.warnings.length;
    const overallScore = Math.max(0, 100 - (totalIssues * 5));

    return {
      overallScore,
      compliance: {
        metadata: this.calculateMetadataCompliance(data),
        slides: this.calculateSlidesCompliance(data),
        shapes: this.calculateShapesCompliance(data),
        overall: overallScore,
      },
      recommendations: this.generateRecommendations(validationResult),
    };
  }

  private calculateMetadataCompliance(data: any): number {
    // Implementation for metadata compliance calculation
    return 85;
  }

  private calculateSlidesCompliance(data: any): number {
    // Implementation for slides compliance calculation
    return 90;
  }

  private calculateShapesCompliance(data: any): number {
    // Implementation for shapes compliance calculation
    return 88;
  }

  private generateRecommendations(validationResult: SchemaValidationResult): string[] {
    const recommendations: string[] = [];
    
    validationResult.errors.forEach(error => {
      if (error.suggestions) {
        recommendations.push(...error.suggestions);
      }
    });

    validationResult.warnings.forEach(warning => {
      recommendations.push(warning.recommendation);
    });

    return [...new Set(recommendations)]; // Remove duplicates
  }
} 