/**
 * Presentation Service
 * 
 * Comprehensive service for presentation CRUD operations and management
 */

import { 
  PresentationMetadata,
  PresentationCreateRequest,
  PresentationUpdateRequest,
  PresentationListQuery,
  PresentationListResponse,
  PresentationAnalytics,
  PresentationSearchResult,
  PresentationExportOptions,
  PresentationExportResult,
  PresentationVersionInfo,
  PresentationAccessInfo
} from '../types/presentation.types';
import { AsposeAdapter } from '../adapters/aspose.adapter';
import { FirebaseAdapter, FirebaseConfig } from '../adapters/firebase.adapter';
import { ThumbnailManagerService } from './thumbnail-manager.service';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import * as fs from 'fs/promises';

export class PresentationService {
  private asposeAdapter: AsposeAdapter;
  private firebase: FirebaseAdapter;
  private thumbnailManager: ThumbnailManagerService;
  private readonly presentationsCollectionName = 'presentations';
  private readonly versionsCollectionName = 'presentation_versions';
  private readonly accessCollectionName = 'presentation_access';
  private readonly analyticsCollectionName = 'presentation_analytics';
  private readonly uploadsDir: string;

  constructor() {
    this.asposeAdapter = new AsposeAdapter();
    
    // Create Firebase config from environment variables
    const firebaseConfig: FirebaseConfig = {
      projectId: process.env.FIREBASE_PROJECT_ID!,
      privateKey: process.env.FIREBASE_PRIVATE_KEY!,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET!,
    };
    
    this.firebase = new FirebaseAdapter(firebaseConfig);
    this.thumbnailManager = new ThumbnailManagerService();
    this.uploadsDir = path.join(process.cwd(), 'temp', 'uploads');
    this.ensureUploadDirectory();
    logger.info('PresentationService initialized');
  }

  // =============================================================================
  // PRESENTATION CRUD OPERATIONS
  // =============================================================================

  /**
   * Create a new presentation
   */
  async createPresentation(request: PresentationCreateRequest): Promise<PresentationMetadata> {
    const startTime = Date.now();
    const presentationId = uuidv4();
    
    try {
      logger.info('Creating presentation', { 
        presentationId, 
        title: request.title, 
        fileSize: request.file.size 
      });

      // Save uploaded file
      const fileName = `${presentationId}-${request.file.originalName}`;
      const filePath = path.join(this.uploadsDir, fileName);
      await fs.writeFile(filePath, request.file.buffer);

      // Process presentation with Aspose.Slides
      const conversionResult = await this.asposeAdapter.convertPptxToJson(filePath, {
        includeAssets: request.options?.extractAssets !== false,
        includeMetadata: true,
        includeAnimations: true,
      });

      if (!conversionResult.success || !conversionResult.data) {
        throw new Error('Failed to process presentation');
      }

      // Upload file to Firebase Storage
      const storageResult = await this.firebase.uploadFile(
        request.file.buffer,
        `presentations/${presentationId}/${fileName}`,
        request.file.mimetype,
        { presentationId, owner: request.owner }
      );

      // Create presentation metadata
      const now = new Date();
      const presentation: PresentationMetadata = {
        id: presentationId,
        title: request.title,
        description: request.description,
        fileName: fileName,
        originalFileName: request.file.originalName,
        fileSize: request.file.size,
        filePath: storageResult.path,
        mimeType: request.file.mimetype,
        
        slideCount: conversionResult.data.slides.length,
        slideSize: {
          width: conversionResult.data.slideSize?.width || 1920,
          height: conversionResult.data.slideSize?.height || 1080,
          type: conversionResult.data.slideSize?.type || 'Custom',
          orientation: (conversionResult.data.slideSize?.width || 1920) > (conversionResult.data.slideSize?.height || 1080) 
            ? 'landscape' : 'portrait',
        },
        
        stats: {
          totalShapes: conversionResult.processingStats.shapeCount,
          totalImages: conversionResult.processingStats.imageCount,
          totalVideos: 0,
          totalAudios: 0,
          totalCharts: 0,
          totalTables: 0,
          totalAnimations: conversionResult.processingStats.animationCount,
          totalWords: 0,
          totalCharacters: 0,
          averageWordsPerSlide: 0,
        },
        
        documentProperties: conversionResult.data.documentProperties || {
          title: request.title,
          author: request.owner,
          subject: '',
          keywords: '',
          comments: '',
          category: '',
          manager: '',
          company: '',
          createdTime: now,
          lastSavedTime: now,
          revisionNumber: 1,
          totalEditingTime: 0,
        },
        
        security: conversionResult.data.security || {
          isEncrypted: false,
          isPasswordProtected: false,
          isWriteProtected: false,
          hasDigitalSignature: false,
          hasVbaProject: false,
        },
        
        processing: {
          status: 'completed',
          conversionStatus: 'completed',
          thumbnailStatus: 'not_started',
          lastProcessed: now,
          processingTime: Date.now() - startTime,
          errors: [],
        },
        
        version: {
          current: 1,
          history: [{
            version: 1,
            createdAt: now,
            createdBy: request.owner,
            changes: 'Initial upload',
            filePath: storageResult.path,
            fileSize: request.file.size,
          }],
        },
        
        access: {
          owner: request.owner,
          createdBy: request.owner,
          lastModifiedBy: request.owner,
          visibility: request.options?.visibility || 'private',
          permissions: {
            canView: [request.owner],
            canEdit: [request.owner],
            canDelete: [request.owner],
            canShare: [request.owner],
          },
        },
        
        organization: {
          tags: request.options?.tags || [],
          categories: request.options?.categories || [],
          collections: [],
          starred: false,
          archived: false,
          favorite: false,
        },
        
        timestamps: {
          created: now,
          updated: now,
          lastViewed: now,
        },
        
        references: {
          universalSchemaId: uuidv4(),
          thumbnailUrls: [],
          exportUrls: {},
          sessionIds: [],
          backupPaths: [],
        },
        
        customFields: {},
      };

      // Save to Firestore
      await this.firebase.createDocument(this.presentationsCollectionName, presentationId, presentation);

      // Store Universal Schema data
      await this.firebase.createDocument(
        'universal_schemas',
        presentation.references.universalSchemaId!,
        {
          presentationId,
          schema: conversionResult.data,
          createdAt: now,
          version: 1,
        }
      );

      // Generate thumbnails if requested
      if (request.options?.generateThumbnails !== false) {
        this.generateThumbnailsAsync(presentationId, filePath);
      }

      // Clean up temp file
      await fs.unlink(filePath).catch(() => {});

      logger.info('Presentation created successfully', {
        presentationId,
        title: request.title,
        slideCount: presentation.slideCount,
        processingTime: presentation.processing.processingTime,
      });

      return presentation;
    } catch (error) {
      logger.error('Failed to create presentation', { error, presentationId, title: request.title });
      throw error;
    }
  }

  /**
   * Get presentation by ID
   */
  async getPresentation(presentationId: string, userId?: string): Promise<PresentationMetadata | null> {
    try {
      const presentation = await this.firebase.getDocument<PresentationMetadata>(
        this.presentationsCollectionName,
        presentationId
      );

      if (!presentation) {
        return null;
      }

      // Check access permissions
      if (userId && !this.hasViewAccess(presentation, userId)) {
        logger.warn('Unauthorized presentation access attempt', { presentationId, userId });
        return null;
      }

      // Update last viewed timestamp
      if (userId) {
        await this.updateLastViewed(presentationId, userId);
      }

      return presentation;
    } catch (error) {
      logger.error('Failed to get presentation', { error, presentationId });
      throw error;
    }
  }

  /**
   * Update presentation
   */
  async updatePresentation(
    presentationId: string,
    updates: PresentationUpdateRequest,
    userId: string
  ): Promise<PresentationMetadata | null> {
    try {
      const presentation = await this.getPresentation(presentationId, userId);
      if (!presentation) {
        return null;
      }

      // Check edit permissions
      if (!this.hasEditAccess(presentation, userId)) {
        throw new Error('Insufficient permissions to edit presentation');
      }

      const now = new Date();
      const updateData: Partial<PresentationMetadata> = {
        ...updates,
        access: {
          ...presentation.access,
          lastModifiedBy: userId,
        },
        timestamps: {
          ...presentation.timestamps,
          updated: now,
        },
      };

      // Update organization fields
      if (updates.tags || updates.categories || updates.starred !== undefined || 
          updates.archived !== undefined || updates.favorite !== undefined) {
        updateData.organization = {
          ...presentation.organization,
          ...(updates.tags && { tags: updates.tags }),
          ...(updates.categories && { categories: updates.categories }),
          ...(updates.starred !== undefined && { starred: updates.starred }),
          ...(updates.archived !== undefined && { archived: updates.archived }),
          ...(updates.favorite !== undefined && { favorite: updates.favorite }),
        };
      }

      // Update custom fields
      if (updates.customFields) {
        updateData.customFields = {
          ...presentation.customFields,
          ...updates.customFields,
        };
      }

      await this.firebase.updateDocument(this.presentationsCollectionName, presentationId, updateData);

      const updatedPresentation = await this.getPresentation(presentationId, userId);
      
      logger.info('Presentation updated successfully', { presentationId, userId, updates });
      return updatedPresentation;
    } catch (error) {
      logger.error('Failed to update presentation', { error, presentationId, updates });
      throw error;
    }
  }

  /**
   * Delete presentation
   */
  async deletePresentation(presentationId: string, userId: string, hardDelete: boolean = false): Promise<boolean> {
    try {
      const presentation = await this.getPresentation(presentationId, userId);
      if (!presentation) {
        return false;
      }

      // Check delete permissions
      if (!this.hasDeleteAccess(presentation, userId)) {
        throw new Error('Insufficient permissions to delete presentation');
      }

      if (hardDelete) {
        // Hard delete - remove completely
        await this.performHardDelete(presentation);
      } else {
        // Soft delete - mark as deleted
        await this.performSoftDelete(presentation, userId);
      }

      logger.info('Presentation deleted successfully', { 
        presentationId, 
        userId, 
        hardDelete 
      });

      return true;
    } catch (error) {
      logger.error('Failed to delete presentation', { error, presentationId, userId });
      throw error;
    }
  }

  /**
   * List presentations with filtering and pagination
   */
  async listPresentations(query: PresentationListQuery = {}): Promise<PresentationListResponse> {
    try {
      const {
        owner,
        visibility,
        tags,
        categories,
        search,
        starred,
        archived,
        favorite,
        status,
        limit = 20,
        offset = 0,
        sortBy = 'updated',
        sortOrder = 'desc',
        dateFrom,
        dateTo,
        minFileSize,
        maxFileSize,
        minSlideCount,
        maxSlideCount,
      } = query;

      // Build Firestore query
      let firebaseQuery = this.firebase.getCollection(this.presentationsCollectionName);

      // Apply filters
      if (owner) {
        firebaseQuery = firebaseQuery.where('access.owner', '==', owner);
      }
      if (visibility) {
        firebaseQuery = firebaseQuery.where('access.visibility', '==', visibility);
      }
      if (status) {
        firebaseQuery = firebaseQuery.where('processing.status', '==', status);
      }
      if (starred !== undefined) {
        firebaseQuery = firebaseQuery.where('organization.starred', '==', starred);
      }
      if (archived !== undefined) {
        firebaseQuery = firebaseQuery.where('organization.archived', '==', archived);
      }
      if (favorite !== undefined) {
        firebaseQuery = firebaseQuery.where('organization.favorite', '==', favorite);
      }
      if (tags && tags.length > 0) {
        firebaseQuery = firebaseQuery.where('organization.tags', 'array-contains-any', tags);
      }
      if (categories && categories.length > 0) {
        firebaseQuery = firebaseQuery.where('organization.categories', 'array-contains-any', categories);
      }
      if (dateFrom) {
        firebaseQuery = firebaseQuery.where('timestamps.created', '>=', dateFrom);
      }
      if (dateTo) {
        firebaseQuery = firebaseQuery.where('timestamps.created', '<=', dateTo);
      }
      if (minFileSize) {
        firebaseQuery = firebaseQuery.where('fileSize', '>=', minFileSize);
      }
      if (maxFileSize) {
        firebaseQuery = firebaseQuery.where('fileSize', '<=', maxFileSize);
      }
      if (minSlideCount) {
        firebaseQuery = firebaseQuery.where('slideCount', '>=', minSlideCount);
      }
      if (maxSlideCount) {
        firebaseQuery = firebaseQuery.where('slideCount', '<=', maxSlideCount);
      }

      // Apply sorting
      firebaseQuery = firebaseQuery.orderBy(`timestamps.${sortBy}`, sortOrder);

      // Apply pagination
      firebaseQuery = firebaseQuery.limit(limit).offset(offset);

      // Execute query
      const presentations = await this.firebase.queryDocuments<PresentationMetadata>(firebaseQuery);

      // Apply text search if provided (client-side filtering for now)
      let filteredPresentations = presentations;
      if (search) {
        const searchLower = search.toLowerCase();
        filteredPresentations = presentations.filter(p =>
          p.title.toLowerCase().includes(searchLower) ||
          p.description?.toLowerCase().includes(searchLower) ||
          p.organization.tags.some(tag => tag.toLowerCase().includes(searchLower))
        );
      }

      // Calculate aggregations
      const aggregations = this.calculateAggregations(filteredPresentations);

      // Get total count (simplified for this implementation)
      const total = filteredPresentations.length;

      return {
        presentations: filteredPresentations,
        total,
        page: Math.floor(offset / limit) + 1,
        limit,
        hasMore: offset + filteredPresentations.length < total,
        aggregations,
      };
    } catch (error) {
      logger.error('Failed to list presentations', { error, query });
      throw error;
    }
  }

  // =============================================================================
  // EXPORT AND CONVERSION
  // =============================================================================

  /**
   * Export presentation to different formats
   */
  async exportPresentation(
    presentationId: string,
    options: PresentationExportOptions,
    userId: string
  ): Promise<PresentationExportResult> {
    const startTime = Date.now();
    
    try {
      const presentation = await this.getPresentation(presentationId, userId);
      if (!presentation) {
        throw new Error('Presentation not found');
      }

      // Check view permissions
      if (!this.hasViewAccess(presentation, userId)) {
        throw new Error('Insufficient permissions to export presentation');
      }

      logger.info('Starting presentation export', { 
        presentationId, 
        format: options.format, 
        userId 
      });

      // Get the original file from Firebase Storage
      const fileBuffer = await this.firebase.downloadFile(presentation.filePath);
      
      // Create temp file for processing
      const tempFilePath = path.join(this.uploadsDir, `export-${presentationId}-${Date.now()}.pptx`);
      await fs.writeFile(tempFilePath, fileBuffer);

      let result: PresentationExportResult;

      try {
        switch (options.format) {
          case 'pptx':
            result = await this.exportToPPTX(presentation, tempFilePath, options);
            break;
          case 'pdf':
            result = await this.exportToPDF(presentation, tempFilePath, options);
            break;
          case 'html':
            result = await this.exportToHTML(presentation, tempFilePath, options);
            break;
          case 'images':
            result = await this.exportToImages(presentation, tempFilePath, options);
            break;
          case 'json':
            result = await this.exportToJSON(presentation, options);
            break;
          default:
            throw new Error(`Unsupported export format: ${options.format}`);
        }

        // Store export URL reference
        await this.updateExportReference(presentationId, options.format, result.downloadUrl || '');

        logger.info('Presentation export completed', {
          presentationId,
          format: options.format,
          fileSize: result.fileSize,
          processingTime: result.processingTime,
        });

        return result;
      } finally {
        // Clean up temp file
        await fs.unlink(tempFilePath).catch(() => {});
      }
    } catch (error) {
      logger.error('Failed to export presentation', { error, presentationId, options });
      return {
        success: false,
        presentationId,
        format: options.format,
        fileSize: 0,
        processingTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          slideCount: 0,
          quality: options.quality || 'medium',
        },
      };
    }
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  /**
   * Check if user has view access to presentation
   */
  private hasViewAccess(presentation: PresentationMetadata, userId: string): boolean {
    return presentation.access.visibility === 'public' ||
           presentation.access.owner === userId ||
           presentation.access.permissions.canView.includes(userId);
  }

  /**
   * Check if user has edit access to presentation
   */
  private hasEditAccess(presentation: PresentationMetadata, userId: string): boolean {
    return presentation.access.owner === userId ||
           presentation.access.permissions.canEdit.includes(userId);
  }

  /**
   * Check if user has delete access to presentation
   */
  private hasDeleteAccess(presentation: PresentationMetadata, userId: string): boolean {
    return presentation.access.owner === userId ||
           presentation.access.permissions.canDelete.includes(userId);
  }

  /**
   * Update last viewed timestamp
   */
  private async updateLastViewed(presentationId: string, userId: string): Promise<void> {
    try {
      await this.firebase.updateDocument(this.presentationsCollectionName, presentationId, {
        'timestamps.lastViewed': new Date(),
      });
    } catch (error) {
      logger.warn('Failed to update last viewed timestamp', { error, presentationId, userId });
    }
  }

  /**
   * Generate thumbnails asynchronously
   */
  private async generateThumbnailsAsync(presentationId: string, filePath: string): Promise<void> {
    try {
      const result = await this.thumbnailManager.generateThumbnails(presentationId, filePath, {
        strategy: 'auto',
        width: 300,
        height: 225,
        format: 'png',
      });

      // Update presentation with thumbnail URLs
      if (result.success && result.thumbnails.length > 0) {
        const thumbnailUrls = result.thumbnails.map(t => t.url);
        await this.firebase.updateDocument(this.presentationsCollectionName, presentationId, {
          'references.thumbnailUrls': thumbnailUrls,
          'processing.thumbnailStatus': 'completed',
        });
      }
    } catch (error) {
      logger.error('Failed to generate thumbnails asynchronously', { error, presentationId });
      await this.firebase.updateDocument(this.presentationsCollectionName, presentationId, {
        'processing.thumbnailStatus': 'failed',
        'processing.errors': [error instanceof Error ? error.message : 'Thumbnail generation failed'],
      });
    }
  }

  /**
   * Perform hard delete
   */
  private async performHardDelete(presentation: PresentationMetadata): Promise<void> {
    // Delete from Firestore
    await this.firebase.deleteDocument(this.presentationsCollectionName, presentation.id);

    // Delete file from storage
    if (presentation.filePath) {
      await this.firebase.deleteFile(presentation.filePath);
    }

    // Delete thumbnails
    await this.thumbnailManager.deleteThumbnails(presentation.id);

    // Delete Universal Schema
    if (presentation.references.universalSchemaId) {
      await this.firebase.deleteDocument('universal_schemas', presentation.references.universalSchemaId);
    }

    // Delete export files
    for (const exportUrl of Object.values(presentation.references.exportUrls)) {
      if (exportUrl) {
        const exportPath = this.extractPathFromUrl(exportUrl);
        if (exportPath) {
          await this.firebase.deleteFile(exportPath);
        }
      }
    }
  }

  /**
   * Perform soft delete
   */
  private async performSoftDelete(presentation: PresentationMetadata, userId: string): Promise<void> {
    await this.firebase.updateDocument(this.presentationsCollectionName, presentation.id, {
      'access.visibility': 'private',
      'organization.archived': true,
      'timestamps.deleted': new Date(),
      'access.lastModifiedBy': userId,
    });
  }

  /**
   * Calculate aggregations for presentation list
   */
  private calculateAggregations(presentations: PresentationMetadata[]) {
    return {
      totalSize: presentations.reduce((sum, p) => sum + p.fileSize, 0),
      totalSlides: presentations.reduce((sum, p) => sum + p.slideCount, 0),
      averageFileSize: presentations.length > 0 
        ? presentations.reduce((sum, p) => sum + p.fileSize, 0) / presentations.length 
        : 0,
      averageSlideCount: presentations.length > 0 
        ? presentations.reduce((sum, p) => sum + p.slideCount, 0) / presentations.length 
        : 0,
      statusCounts: presentations.reduce((acc, p) => {
        acc[p.processing.status] = (acc[p.processing.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      tagCounts: presentations.reduce((acc, p) => {
        p.organization.tags.forEach(tag => {
          acc[tag] = (acc[tag] || 0) + 1;
        });
        return acc;
      }, {} as Record<string, number>),
      categoryCounts: presentations.reduce((acc, p) => {
        p.organization.categories.forEach(category => {
          acc[category] = (acc[category] || 0) + 1;
        });
        return acc;
      }, {} as Record<string, number>),
    };
  }

  /**
   * Export methods (simplified implementations)
   */
  private async exportToPPTX(
    presentation: PresentationMetadata,
    filePath: string,
    options: PresentationExportOptions
  ): Promise<PresentationExportResult> {
    // For PPTX export, we can return the original file or process it
    const fileBuffer = await fs.readFile(filePath);
    const exportPath = `exports/${presentation.id}/export.pptx`;
    
    const uploadResult = await this.firebase.uploadFile(
      fileBuffer,
      exportPath,
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      { presentationId: presentation.id, format: 'pptx' }
    );

    return {
      success: true,
      presentationId: presentation.id,
      format: 'pptx',
      downloadUrl: uploadResult.url,
      fileSize: fileBuffer.length,
      processingTime: 100,
      metadata: {
        slideCount: presentation.slideCount,
        quality: options.quality || 'medium',
      },
    };
  }

  private async exportToPDF(
    presentation: PresentationMetadata,
    filePath: string,
    options: PresentationExportOptions
  ): Promise<PresentationExportResult> {
    // Use Aspose.Slides to convert to PDF
    const result = await this.asposeAdapter.convertToBuffer(filePath, 'pdf', {
      quality: options.quality,
      includeNotes: options.includeNotes,
    });

    if (!result.success || !result.buffer) {
      throw new Error('Failed to convert to PDF');
    }

    const exportPath = `exports/${presentation.id}/export.pdf`;
    const uploadResult = await this.firebase.uploadFile(
      result.buffer,
      exportPath,
      'application/pdf',
      { presentationId: presentation.id, format: 'pdf' }
    );

    return {
      success: true,
      presentationId: presentation.id,
      format: 'pdf',
      downloadUrl: uploadResult.url,
      fileSize: result.buffer.length,
      processingTime: result.processingStats.conversionTimeMs,
      metadata: {
        slideCount: result.processingStats.slideCount,
        quality: options.quality || 'medium',
      },
    };
  }

  private async exportToHTML(
    presentation: PresentationMetadata,
    filePath: string,
    options: PresentationExportOptions
  ): Promise<PresentationExportResult> {
    // Use Aspose.Slides to convert to HTML
    const result = await this.asposeAdapter.convertToBuffer(filePath, 'html', {
      quality: options.quality,
      includeAnimations: options.includeAnimations,
    });

    if (!result.success || !result.buffer) {
      throw new Error('Failed to convert to HTML');
    }

    const exportPath = `exports/${presentation.id}/export.html`;
    const uploadResult = await this.firebase.uploadFile(
      result.buffer,
      exportPath,
      'text/html',
      { presentationId: presentation.id, format: 'html' }
    );

    return {
      success: true,
      presentationId: presentation.id,
      format: 'html',
      downloadUrl: uploadResult.url,
      fileSize: result.buffer.length,
      processingTime: result.processingStats.conversionTimeMs,
      metadata: {
        slideCount: result.processingStats.slideCount,
        quality: options.quality || 'medium',
      },
    };
  }

  private async exportToImages(
    presentation: PresentationMetadata,
    filePath: string,
    options: PresentationExportOptions
  ): Promise<PresentationExportResult> {
    // Generate thumbnails as images
    const result = await this.thumbnailManager.generateThumbnails(presentation.id, filePath, {
      strategy: 'real',
      width: 1920,
      height: 1080,
      format: 'png',
      quality: options.quality,
    });

    if (!result.success) {
      throw new Error('Failed to generate images');
    }

    // Create a ZIP file with all images (simplified - would use actual ZIP library)
    const zipBuffer = Buffer.from('Mock ZIP file with images');
    const exportPath = `exports/${presentation.id}/images.zip`;
    
    const uploadResult = await this.firebase.uploadFile(
      zipBuffer,
      exportPath,
      'application/zip',
      { presentationId: presentation.id, format: 'images' }
    );

    return {
      success: true,
      presentationId: presentation.id,
      format: 'images',
      downloadUrl: uploadResult.url,
      fileSize: zipBuffer.length,
      processingTime: result.stats.totalProcessingTime,
      metadata: {
        slideCount: result.stats.generatedCount,
        quality: options.quality || 'medium',
        resolution: { width: 1920, height: 1080 },
      },
    };
  }

  private async exportToJSON(
    presentation: PresentationMetadata,
    options: PresentationExportOptions
  ): Promise<PresentationExportResult> {
    // Get Universal Schema data
    if (!presentation.references.universalSchemaId) {
      throw new Error('Universal Schema not available for this presentation');
    }

    const schemaDoc = await this.firebase.getDocument(
      'universal_schemas',
      presentation.references.universalSchemaId
    );

    if (!schemaDoc) {
      throw new Error('Universal Schema data not found');
    }

    const jsonBuffer = Buffer.from(JSON.stringify(schemaDoc.schema, null, 2), 'utf8');
    const exportPath = `exports/${presentation.id}/schema.json`;
    
    const uploadResult = await this.firebase.uploadFile(
      jsonBuffer,
      exportPath,
      'application/json',
      { presentationId: presentation.id, format: 'json' }
    );

    return {
      success: true,
      presentationId: presentation.id,
      format: 'json',
      downloadUrl: uploadResult.url,
      fileSize: jsonBuffer.length,
      processingTime: 50,
      metadata: {
        slideCount: presentation.slideCount,
        quality: 'lossless',
      },
    };
  }

  /**
   * Update export reference
   */
  private async updateExportReference(
    presentationId: string,
    format: string,
    downloadUrl: string
  ): Promise<void> {
    try {
      await this.firebase.updateDocument(this.presentationsCollectionName, presentationId, {
        [`references.exportUrls.${format}`]: downloadUrl,
      });
    } catch (error) {
      logger.warn('Failed to update export reference', { error, presentationId, format });
    }
  }

  /**
   * Extract path from Firebase Storage URL
   */
  private extractPathFromUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);
      return urlObj.pathname.substring(1); // Remove leading slash
    } catch {
      return null;
    }
  }

  /**
   * Ensure upload directory exists
   */
  private async ensureUploadDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.uploadsDir, { recursive: true });
    } catch (error) {
      logger.error('Failed to create upload directory', { error, uploadsDir: this.uploadsDir });
    }
  }

  /**
   * Health check for presentation service
   */
  async healthCheck(): Promise<boolean> {
    try {
      const asposeHealthy = await this.asposeAdapter.healthCheck();
      const thumbnailHealthy = await this.thumbnailManager.healthCheck();
      
      return asposeHealthy && thumbnailHealthy;
    } catch (error) {
      logger.error('Presentation service health check failed', { error });
      return false;
    }
  }
}