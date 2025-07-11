/**
 * Presentation Service - Core presentation management
 */

import { 
  PresentationCreateRequest,
  PresentationUpdateRequest,
  PresentationListQuery,
  PresentationListResponse,
  PresentationGetResponse,
  PresentationAnalytics,
  PresentationExportRequest,
  PresentationExportResponse,
  PresentationSharingRequest,
  PresentationSharingResponse,
  PresentationBulkDeleteRequest,
  PresentationBulkUpdateRequest,
  PresentationMetadata,
  PresentationStatus,
  PresentationVersionInfo,
  PresentationSearchResponse,
  PresentationAnalyticsResponse,
  PresentationAnalyticsSummary,
  PresentationCreateResponse,
  PresentationDeleteResponse,
  PresentationVersionResponse,
  PresentationVersionCreateResponse,
  PresentationVersionRestoreResponse,
  PresentationRenderRequest,
  PresentationRenderResponse,
  PresentationBulkResponse,
  PresentationSharingLinkResponse,
  PresentationVersionsResponse,
  PresentationAssetResponse,
  PresentationSlideResponse,
  PresentationShapeResponse,
  PresentationSlideCreateResponse,
  PresentationSlideUpdateResponse,
  PresentationSlideDeleteResponse,
  PresentationShapeCreateResponse,
  PresentationShapeUpdateResponse,
  PresentationShapeDeleteResponse,
} from '../types/presentation.types';
import { ThumbnailManagerService } from './thumbnail-manager.service';
import { AsposeAdapterRefactored } from '../adapters/aspose/AsposeAdapterRefactored';
import { firestore } from '../config/firebase';
import { logger } from '../utils/logger';

export class PresentationService {
  private thumbnailManager: ThumbnailManagerService;
  private asposeAdapter: AsposeAdapterRefactored;

  constructor(config: any) {
    this.thumbnailManager = new ThumbnailManagerService({
      ...config,
      asposeConfig: {
        licenseFile: process.env.ASPOSE_LICENSE_FILE || '',
        enableLogging: process.env.NODE_ENV === 'development',
      },
    });
    this.asposeAdapter = new AsposeAdapterRefactored();
  }

  // Single implementation of getAllPresentations
  async getAllPresentations(query: PresentationListQuery): Promise<PresentationListResponse> {
    try {
      let collectionRef = firestore.collection('presentations');

      // Apply filters
      if (query.status) {
        collectionRef = collectionRef.where('status', '==', query.status) as any;
      }

      if (query.tags && query.tags.length > 0) {
        collectionRef = collectionRef.where('tags', 'array-contains-any', query.tags) as any;
      }

      if (query.dateFrom) {
        collectionRef = collectionRef.where('createdAt', '>=', query.dateFrom) as any;
      }

      if (query.dateTo) {
        collectionRef = collectionRef.where('createdAt', '<=', query.dateTo) as any;
      }

      // Apply sorting
      if (query.sortBy) {
        collectionRef = collectionRef.orderBy(query.sortBy, query.sortOrder || 'desc') as any;
      }

      // Apply pagination
      const limit = query.limit || 10;
      const offset = ((query.page || 1) - 1) * limit;
      collectionRef = collectionRef.offset(offset).limit(limit) as any;

      const snapshot = await collectionRef.get();
      const presentations = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      return {
        presentations,
        pagination: {
          page: query.page || 1,
          limit,
          total: presentations.length,
          totalPages: Math.ceil(presentations.length / limit),
          hasNextPage: (query.page || 1) * limit < presentations.length,
          hasPreviousPage: (query.page || 1) > 1,
        },
      };
    } catch (error) {
      logger.error('Failed to get presentations', { error });
      throw error;
    }
  }

  // Single implementation of createPresentation
  async createPresentation(request: PresentationCreateRequest): Promise<PresentationCreateResponse> {
    try {
      const { file, title, description, tags = [], metadata = {} } = request;
      
      // Validate file
      if (!file.originalName.endsWith('.pptx')) {
        throw new Error('Only PPTX files are supported');
      }

      // Generate unique ID
      const presentationId = firestore.collection('presentations').doc().id;
      const fileName = `${presentationId}-${file.originalName}`;

      // Convert PPTX to JSON
      const conversionResult = await this.asposeAdapter.convertPptxToJson(
        file.buffer,
        fileName,
        {
          includeAssets: true,
          includeHidden: false,
          includeNotes: true,
          generateThumbnails: true,
        }
      );

      if (!conversionResult.success) {
        throw new Error(`Conversion failed: ${conversionResult.error}`);
      }

      // Calculate analytics
      const slides = conversionResult.data.slides || [];
      const analytics = this.calculateAnalytics(slides);

      // Create presentation document
      const presentationData = {
        id: presentationId,
        title,
        description,
        tags,
        metadata: {
          ...metadata,
          originalFilename: file.originalName,
          fileSize: file.size,
          mimeType: file.mimetype,
        },
        status: 'active' as PresentationStatus,
        slideCount: slides.length,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1,
        analytics,
        universalJson: conversionResult.data,
      };

      // Generate thumbnails if requested
      if (request.generateThumbnails) {
        const thumbnails = await this.thumbnailManager.generateThumbnails(
          file.buffer,
          file.originalName,
          {
            format: 'png',
            quality: 'medium',
            size: { width: 800, height: 600 },
          }
        );

        presentationData.metadata.thumbnails = thumbnails;
      }

      // Save to Firestore
      await firestore.collection('presentations').doc(presentationId).set(presentationData);

      logger.info('Presentation created successfully', { 
        id: presentationId, 
        title, 
        slideCount: slides.length 
      });

      return {
        id: presentationId,
        title,
        description,
        slideCount: slides.length,
        status: 'active',
        createdAt: presentationData.createdAt,
        analytics,
      };
    } catch (error) {
      logger.error('Failed to create presentation', { error });
      throw error;
    }
  }

  // Single implementation of getPresentation
  async getPresentation(id: string): Promise<PresentationGetResponse> {
    try {
      const doc = await firestore.collection('presentations').doc(id).get();
      
      if (!doc.exists) {
        throw new Error('Presentation not found');
      }

      const data = doc.data();
      return {
        id: doc.id,
        ...data,
      } as PresentationGetResponse;
    } catch (error) {
      logger.error('Failed to get presentation', { id, error });
      throw error;
    }
  }

  // Single implementation of updatePresentation
  async updatePresentation(id: string, request: PresentationUpdateRequest): Promise<PresentationGetResponse> {
    try {
      const updateData = {
        ...request,
        updatedAt: new Date().toISOString(),
      };

      await firestore.collection('presentations').doc(id).update(updateData);

      return await this.getPresentation(id);
    } catch (error) {
      logger.error('Failed to update presentation', { id, error });
      throw error;
    }
  }

  // Single implementation of deletePresentation
  async deletePresentation(id: string): Promise<PresentationDeleteResponse> {
    try {
      await firestore.collection('presentations').doc(id).delete();

      return {
        success: true,
        message: 'Presentation deleted successfully',
      };
    } catch (error) {
      logger.error('Failed to delete presentation', { id, error });
      throw error;
    }
  }

  // Single implementation of searchPresentations
  async searchPresentations(query: PresentationListQuery): Promise<PresentationSearchResponse> {
    try {
      // For now, use the same logic as getAllPresentations
      const result = await this.getAllPresentations(query);
      return {
        presentations: result.presentations,
        pagination: result.pagination,
        searchQuery: query.q || '',
      };
    } catch (error) {
      logger.error('Failed to search presentations', { query, error });
      throw error;
    }
  }

  // Helper method to calculate analytics
  private calculateAnalytics(slides: any[]): PresentationAnalytics {
    const totalShapes = slides.reduce((sum, slide) => sum + (slide.shapes?.length || 0), 0);
    const totalImages = slides.reduce((sum, slide) => {
      return sum + (slide.shapes?.filter((s: any) => s.type === 'Picture').length || 0);
    }, 0);
    const totalCharts = slides.reduce((sum, slide) => {
      return sum + (slide.shapes?.filter((s: any) => s.type === 'Chart').length || 0);
    }, 0);
    const totalTables = slides.reduce((sum, slide) => {
      return sum + (slide.shapes?.filter((s: any) => s.type === 'Table').length || 0);
    }, 0);

    return {
      slideCount: slides.length,
      shapeCount: totalShapes,
      imageCount: totalImages,
      chartCount: totalCharts,
      tableCount: totalTables,
      textBoxCount: slides.reduce((sum, slide) => {
        return sum + (slide.shapes?.filter((s: any) => s.type === 'TextBox').length || 0);
      }, 0),
      averageShapesPerSlide: totalShapes / slides.length,
      accessibility: {
        hasAltText: false,
        colorContrast: 'poor',
        fontReadability: 'poor',
        hasHeadings: false,
      },
      readabilityScore: 0,
      engagementScore: 0,
      designScore: 0,
      assets: [],
    };
  }
}

// Export single class without duplicates
export default PresentationService;