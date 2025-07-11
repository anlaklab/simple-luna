/**
 * Conversion Controller - HTTP endpoints for file conversions
 * 
 * Handles PPTX ↔ JSON conversions with validation and error handling
 */

import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import { ConversionService } from '../services/conversion.service';
import { HealthCheckService } from '../services/health-check.service';
import { processUploadedFile, createTempFile, cleanupTempFiles } from '../utils/helpers';
import {
  Pptx2JsonRequestSchema,
  Json2PptxRequestSchema,
  ConvertFormatRequestSchema,
  ThumbnailsRequestSchema,
} from '../schemas/api-request.schema';
import { 
  ErrorResponse 
} from '../schemas/api-response.schema';

export interface ConversionControllerConfig {
  conversionService: ConversionService;
  maxFileSize?: number;
  allowedMimeTypes?: string[];
  tempDirectory?: string;
}

export class ConversionController {
  private readonly conversionService: ConversionService;
  private readonly healthCheckService: HealthCheckService;
  private readonly config: ConversionControllerConfig;

  constructor(config: ConversionControllerConfig) {
    this.conversionService = config.conversionService;
    this.healthCheckService = new HealthCheckService();
    this.config = {
      maxFileSize: 50 * 1024 * 1024, // 50MB
      allowedMimeTypes: [
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.slideshow',
      ],
      tempDirectory: './temp',
      ...config,
    };

    logger.info('Conversion controller initialized', {
      maxFileSize: this.config.maxFileSize,
      allowedMimeTypes: this.config.allowedMimeTypes?.length,
    });
  }

  // =============================================================================
  // PPTX TO JSON CONVERSION
  // =============================================================================

  /**
   * POST /pptx2json - Convert PPTX file to Universal Schema JSON
   */
  convertPptxToJson = async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    const requestId = this.generateRequestId();
    
    logger.http('PPTX to JSON conversion request', {
      requestId,
      method: req.method,
      url: req.originalUrl,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
    });

    let tempFilePath: string | undefined;

    try {
      // Validate file upload
      if (!req.file) {
        res.status(400).json(this.createErrorResponse(
          'validation_error',
          'NO_FILE_UPLOADED',
          'No PPTX file was uploaded',
          requestId,
          Date.now() - startTime
        ));
        return;
      }

      // Process uploaded file
      const fileInfo = processUploadedFile(req.file);
      logger.info('File uploaded successfully', {
        requestId,
        filename: fileInfo.originalName,
        size: fileInfo.size,
        mimeType: fileInfo.mimeType,
      });

      // Validate file type
      if (!this.config.allowedMimeTypes?.includes(fileInfo.mimeType)) {
        res.status(400).json(this.createErrorResponse(
          'validation_error',
          'INVALID_FILE_TYPE',
          `File type ${fileInfo.mimeType} is not supported. Allowed types: ${this.config.allowedMimeTypes?.join(', ')}`,
          requestId,
          Date.now() - startTime
        ));
        return;
      }

      // Validate file size
      if (fileInfo.size > this.config.maxFileSize!) {
        res.status(400).json(this.createErrorResponse(
          'validation_error',
          'FILE_TOO_LARGE',
          `File size (${fileInfo.size} bytes) exceeds maximum allowed size (${this.config.maxFileSize} bytes)`,
          requestId,
          Date.now() - startTime
        ));
        return;
      }

      // Use already-parsed and validated options from middleware
      const options = req.body.options || {};

      const validationResult = Pptx2JsonRequestSchema.safeParse(options);
      if (!validationResult.success) {
        res.status(400).json(this.createErrorResponse(
          'validation_error',
          'INVALID_REQUEST_OPTIONS',
          `Request validation failed: ${validationResult.error.message}`,
          requestId,
          Date.now() - startTime
        ));
        return;
      }

      // Create temporary file
      tempFilePath = await createTempFile(
        fileInfo.buffer,
        fileInfo.name,
        this.config.tempDirectory
      );

      logger.info('Starting PPTX to JSON conversion', {
        requestId,
        tempFilePath,
        options: validationResult.data,
      });

      // Convert using service
      const result = await this.conversionService.convertPptxToJson(
        tempFilePath,
        fileInfo.originalName,
        validationResult.data
      );

      const processingTime = Date.now() - startTime;

      // Log performance metrics
      logger.performance('PPTX to JSON conversion completed', {
        requestId,
        metric: 'conversion_time',
        value: processingTime,
        unit: 'milliseconds',
        threshold: 30000, // 30 seconds
      });

      if (result.success) {
        logger.info('PPTX to JSON conversion successful', {
          requestId,
          slideCount: result.data.processingStats.slideCount,
          processingTimeMs: processingTime,
        });

        res.status(200).json(result);
      } else {
        logger.error('PPTX to JSON conversion failed', {
          requestId,
          error: result.error,
          processingTimeMs: processingTime,
        });

        res.status(500).json(result);
      }

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      logger.error('PPTX to JSON conversion error', {
        requestId,
        error,
        processingTimeMs: processingTime,
      });

      res.status(500).json(this.createErrorResponse(
        'server_error',
        'CONVERSION_ERROR',
        error instanceof Error ? error.message : 'Unknown error occurred',
        requestId,
        processingTime
      ));

    } finally {
      // Cleanup temporary files
      if (tempFilePath) {
        await cleanupTempFiles([tempFilePath]);
      }
    }
  };

  // =============================================================================
  // JSON TO PPTX CONVERSION
  // =============================================================================

  /**
   * POST /json2pptx - Convert Universal Schema JSON to PPTX file
   */
  convertJsonToPptx = async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    const requestId = this.generateRequestId();
    
    logger.http('JSON to PPTX conversion request', {
      requestId,
      method: req.method,
      url: req.originalUrl,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
    });

    try {
      // Validate request body
      const validationResult = Json2PptxRequestSchema.safeParse(req.body);
      if (!validationResult.success) {
        res.status(400).json(this.createErrorResponse(
          'validation_error',
          'INVALID_REQUEST_BODY',
          `Request validation failed: ${validationResult.error.message}`,
          requestId,
          Date.now() - startTime
        ));
        return;
      }

      logger.info('Starting JSON to PPTX conversion', {
        requestId,
        outputFormat: validationResult.data.outputFormat,
        slideCount: validationResult.data.presentationData.slides.length,
      });

      // Convert using service
      const result = await this.conversionService.convertJsonToPptx(validationResult.data);

      const processingTime = Date.now() - startTime;

      // Log performance metrics
      logger.performance('JSON to PPTX conversion completed', {
        requestId,
        metric: 'conversion_time',
        value: processingTime,
        unit: 'milliseconds',
        threshold: 30000, // 30 seconds
      });

      if (result.success) {
        logger.info('JSON to PPTX conversion successful', {
          requestId,
          outputFormat: result.data.outputFormat,
          fileSize: result.data.processingStats.fileSize,
          processingTimeMs: processingTime,
        });

        res.status(200).json(result);
      } else {
        logger.error('JSON to PPTX conversion failed', {
          requestId,
          error: result.error,
          processingTimeMs: processingTime,
        });

        res.status(500).json(result);
      }

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      logger.error('JSON to PPTX conversion error', {
        requestId,
        error,
        processingTimeMs: processingTime,
      });

      res.status(500).json(this.createErrorResponse(
        'server_error',
        'CONVERSION_ERROR',
        error instanceof Error ? error.message : 'Unknown error occurred',
        requestId,
        processingTime
      ));
    }
  };

  // =============================================================================
  // FORMAT CONVERSION
  // =============================================================================

  /**
   * POST /convertformat - Convert presentation to different formats
   */
  convertFormat = async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    const requestId = this.generateRequestId();
    
    logger.http('Format conversion request', {
      requestId,
      method: req.method,
      url: req.originalUrl,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
    });

    let tempFilePath: string | undefined;

    try {
      // Validate file upload
      if (!req.file) {
        res.status(400).json(this.createErrorResponse(
          'validation_error',
          'NO_FILE_UPLOADED',
          'No PPTX file was uploaded',
          requestId,
          Date.now() - startTime
        ));
        return;
      }

      // Process uploaded file
      const fileInfo = processUploadedFile(req.file);
      
      // Validate file type
      if (!this.config.allowedMimeTypes?.includes(fileInfo.mimeType)) {
        res.status(400).json(this.createErrorResponse(
          'validation_error',
          'INVALID_FILE_TYPE',
          `File type ${fileInfo.mimeType} is not supported`,
          requestId,
          Date.now() - startTime
        ));
        return;
      }

      // Use already-parsed and validated options from middleware
      const options = req.body.options || {};

      const validationResult = ConvertFormatRequestSchema.safeParse(options);
      if (!validationResult.success) {
        res.status(400).json(this.createErrorResponse(
          'validation_error',
          'INVALID_REQUEST_OPTIONS',
          `Request validation failed: ${validationResult.error.message}`,
          requestId,
          Date.now() - startTime
        ));
        return;
      }

      // Create temporary file
      tempFilePath = await createTempFile(
        fileInfo.buffer,
        fileInfo.name,
        this.config.tempDirectory
      );

      logger.info('Starting format conversion', {
        requestId,
        outputFormat: validationResult.data.outputFormat,
        tempFilePath,
      });

      // Convert using service
      const result = await this.conversionService.convertFormat(
        tempFilePath,
        validationResult.data
      );

      const processingTime = Date.now() - startTime;

      // Log performance metrics
      logger.performance('Format conversion completed', {
        requestId,
        metric: 'conversion_time',
        value: processingTime,
        unit: 'milliseconds',
        threshold: 45000, // 45 seconds
      });

      if (result.success) {
        logger.info('Format conversion successful', {
          requestId,
          outputFormat: result.data.outputFormat,
          totalSize: result.data.totalSize,
          processingTimeMs: processingTime,
        });

        res.status(200).json(result);
      } else {
        logger.error('Format conversion failed', {
          requestId,
          error: result.error,
          processingTimeMs: processingTime,
        });

        res.status(500).json(result);
      }

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      logger.error('Format conversion error', {
        requestId,
        error,
        processingTimeMs: processingTime,
      });

      res.status(500).json(this.createErrorResponse(
        'server_error',
        'CONVERSION_ERROR',
        error instanceof Error ? error.message : 'Unknown error occurred',
        requestId,
        processingTime
      ));

    } finally {
      // Cleanup temporary files
      if (tempFilePath) {
        await cleanupTempFiles([tempFilePath]);
      }
    }
  };

  // =============================================================================
  // THUMBNAIL GENERATION
  // =============================================================================

  /**
   * POST /thumbnails - Generate slide thumbnails
   */
  generateThumbnails = async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    const requestId = this.generateRequestId();
    
    logger.http('Thumbnail generation request', {
      requestId,
      method: req.method,
      url: req.originalUrl,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
    });

    let tempFilePath: string | undefined;

    try {
      // Validate file upload
      if (!req.file) {
        res.status(400).json(this.createErrorResponse(
          'validation_error',
          'NO_FILE_UPLOADED',
          'No PPTX file was uploaded',
          requestId,
          Date.now() - startTime
        ));
        return;
      }

      // Process uploaded file
      const fileInfo = processUploadedFile(req.file);
      
      // Validate file type
      if (!this.config.allowedMimeTypes?.includes(fileInfo.mimeType)) {
        res.status(400).json(this.createErrorResponse(
          'validation_error',
          'INVALID_FILE_TYPE',
          `File type ${fileInfo.mimeType} is not supported`,
          requestId,
          Date.now() - startTime
        ));
        return;
      }

      // Use already-parsed and validated options from middleware
      const options = req.body.options || {};

      const validationResult = ThumbnailsRequestSchema.safeParse(options);
      if (!validationResult.success) {
        res.status(400).json(this.createErrorResponse(
          'validation_error',
          'INVALID_REQUEST_OPTIONS',
          `Request validation failed: ${validationResult.error.message}`,
          requestId,
          Date.now() - startTime
        ));
        return;
      }

      // Create temporary file
      tempFilePath = await createTempFile(
        fileInfo.buffer,
        fileInfo.name,
        this.config.tempDirectory
      );

      logger.info('Starting thumbnail generation', {
        requestId,
        slideIndices: validationResult.data.slideIndices,
        size: validationResult.data.size,
        format: validationResult.data.format,
      });

      // Generate thumbnails using service
      const result = await this.conversionService.generateThumbnails(
        tempFilePath,
        validationResult.data
      );

      const processingTime = Date.now() - startTime;

      // Log performance metrics
      logger.performance('Thumbnail generation completed', {
        requestId,
        metric: 'generation_time',
        value: processingTime,
        unit: 'milliseconds',
        threshold: 20000, // 20 seconds
      });

      if (result.success) {
        logger.info('Thumbnail generation successful', {
          requestId,
          generatedCount: result.data.generatedCount,
          format: result.data.format,
          processingTimeMs: processingTime,
        });

        res.status(200).json(result);
      } else {
        logger.error('Thumbnail generation failed', {
          requestId,
          error: result.error,
          processingTimeMs: processingTime,
        });

        res.status(500).json(result);
      }

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      logger.error('Thumbnail generation error', {
        requestId,
        error,
        processingTimeMs: processingTime,
      });

      res.status(500).json(this.createErrorResponse(
        'server_error',
        'PROCESSING_ERROR',
        error instanceof Error ? error.message : 'Unknown error occurred',
        requestId,
        processingTime
      ));

    } finally {
      // Cleanup temporary files
      if (tempFilePath) {
        await cleanupTempFiles([tempFilePath]);
      }
    }
  };

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  /**
   * GET /health - Comprehensive health check endpoint
   */
  healthCheck = async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      logger.info('Health check requested', { requestId });

      // Use cached health if available and recent (less than 1 minute old)
      const cachedHealth = this.healthCheckService.getCachedHealth();
      const useCache = cachedHealth && 
        (Date.now() - new Date(cachedHealth.timestamp).getTime()) < 60000;

      let systemHealth;
      if (useCache) {
        systemHealth = cachedHealth;
        logger.debug('Using cached health check results', { requestId });
      } else {
        logger.debug('Performing fresh health check', { requestId });
        systemHealth = await this.healthCheckService.performHealthCheck();
      }

      const processingTime = Date.now() - startTime;

      // Determine HTTP status code based on overall health
      let statusCode = 200;
      if (systemHealth.overall === 'unhealthy') {
        statusCode = 503;
      } else if (systemHealth.overall === 'degraded') {
        statusCode = 200; // Still operational but with warnings
      }

      const response = {
        success: true,
        data: {
          status: systemHealth.overall,
          timestamp: systemHealth.timestamp,
          uptime: systemHealth.uptime,
          version: systemHealth.version,
          services: systemHealth.services,
          performance: {
            memoryUsage: {
              used: Math.round(systemHealth.performance.memoryUsage.heapUsed / 1024 / 1024),
              total: Math.round(systemHealth.performance.memoryUsage.heapTotal / 1024 / 1024),
              external: Math.round(systemHealth.performance.memoryUsage.external / 1024 / 1024),
              rss: Math.round(systemHealth.performance.memoryUsage.rss / 1024 / 1024),
            },
            nodeVersion: process.version,
            platform: process.platform,
          },
          checkDetails: {
            cached: useCache,
            checkTime: processingTime,
            periodicChecksActive: true,
          },
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
          processingTimeMs: processingTime,
          version: '1.0',
        },
      };

      logger.info('Health check completed', {
        requestId,
        status: systemHealth.overall,
        processingTime,
        cached: useCache,
      });

      res.status(statusCode).json(response);

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      logger.error('Health check error', {
        requestId,
        error,
        processingTimeMs: processingTime,
      });

      res.status(500).json(this.createErrorResponse(
        'server_error',
        'HEALTH_CHECK_ERROR',
        error instanceof Error ? error.message : 'Health check failed',
        requestId,
        processingTime
      ));
    }
  };

  // =============================================================================
  // PRIVATE HELPER METHODS
  // =============================================================================

  private generateRequestId(): string {
    return `req_${Date.now()}_${require('crypto').randomUUID().replace(/-/g, '').substring(0, 9)}`;
  }

  private createErrorResponse(
    type: string,
    code: string,
    message: string,
    requestId: string,
    processingTimeMs: number
  ): ErrorResponse {
    return {
      success: false,
      error: {
        type: type as any,
        code,
        message,
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
        error: {
          type,
          code,
          message,
        },
      },
    };
  }
}

export default ConversionController; 