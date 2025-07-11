/**
 * Asset Metadata Repository - Firestore Integration
 * 
 * Handles persistence and querying of asset metadata in Firestore.
 * Provides CRUD operations and search capabilities for asset metadata.
 */

import { logger } from '../../../utils/logger';
import { FirebaseAdapter } from '../../firebase.adapter';
import {
  AssetMetadataRepository,
  AssetResult,
  AssetType,
  AssetFormat
} from '../types/asset-interfaces';

export class AssetMetadataRepositoryImpl implements AssetMetadataRepository {
  private firebaseAdapter: FirebaseAdapter;
  private readonly collectionName = 'asset_metadata';
  private readonly presentationAssetsCollectionName = 'presentation_assets';

  constructor(firebaseAdapter: FirebaseAdapter) {
    this.firebaseAdapter = firebaseAdapter;
    logger.info('Asset Metadata Repository initialized', {
      collection: this.collectionName,
      presentationAssetsCollection: this.presentationAssetsCollectionName
    });
  }

  async saveAssetMetadata(
    assetId: string,
    asset: AssetResult,
    presentationId: string
  ): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Prepare asset metadata document
      const assetDocument = this.prepareAssetDocument(asset, presentationId);
      
      // Save individual asset metadata
      await this.firebaseAdapter.saveDocument(
        this.collectionName,
        assetId,
        assetDocument
      );

      // Update presentation assets index
      await this.updatePresentationAssetsIndex(presentationId, assetId, asset);

      logger.info('Asset metadata saved successfully', {
        assetId,
        presentationId,
        assetType: asset.type,
        saveTimeMs: Date.now() - startTime
      });

    } catch (error) {
      logger.error('Failed to save asset metadata', {
        assetId,
        presentationId,
        error: (error as Error).message,
        saveTimeMs: Date.now() - startTime
      });
      throw new Error(`Failed to save asset metadata: ${(error as Error).message}`);
    }
  }

  async getAssetMetadata(assetId: string): Promise<AssetResult | null> {
    try {
      const document = await this.firebaseAdapter.getDocument<any>(
        this.collectionName,
        assetId
      );

      if (!document) {
        logger.debug('Asset metadata not found', { assetId });
        return null;
      }

      const asset = this.documentToAssetResult(document);
      
      logger.debug('Asset metadata retrieved', { 
        assetId, 
        assetType: asset.type 
      });
      
      return asset;

    } catch (error) {
      logger.error('Failed to get asset metadata', {
        assetId,
        error: (error as Error).message
      });
      throw new Error(`Failed to get asset metadata: ${(error as Error).message}`);
    }
  }

  async getAssetsByPresentation(presentationId: string): Promise<AssetResult[]> {
    try {
      const assets = await this.firebaseAdapter.queryDocuments<any>(
        this.collectionName,
        [
          { field: 'presentationId', operator: '==', value: presentationId }
        ],
        undefined, // no limit
        { field: 'createdAt', direction: 'desc' }
      );

      const assetResults = assets.map(doc => this.documentToAssetResult(doc));
      
      logger.info('Retrieved assets by presentation', {
        presentationId,
        assetCount: assetResults.length
      });

      return assetResults;

    } catch (error) {
      logger.error('Failed to get assets by presentation', {
        presentationId,
        error: (error as Error).message
      });
      throw new Error(`Failed to get assets by presentation: ${(error as Error).message}`);
    }
  }

  async getAssetsByType(
    presentationId: string,
    assetType: AssetType
  ): Promise<AssetResult[]> {
    try {
      const assets = await this.firebaseAdapter.queryDocuments<any>(
        this.collectionName,
        [
          { field: 'presentationId', operator: '==', value: presentationId },
          { field: 'type', operator: '==', value: assetType }
        ],
        undefined, // no limit
        { field: 'createdAt', direction: 'desc' }
      );

      const assetResults = assets.map(doc => this.documentToAssetResult(doc));
      
      logger.info('Retrieved assets by type', {
        presentationId,
        assetType,
        assetCount: assetResults.length
      });

      return assetResults;

    } catch (error) {
      logger.error('Failed to get assets by type', {
        presentationId,
        assetType,
        error: (error as Error).message
      });
      throw new Error(`Failed to get assets by type: ${(error as Error).message}`);
    }
  }

  async updateAssetMetadata(
    assetId: string,
    updates: Partial<AssetResult>
  ): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Prepare update document
      const updateDocument = this.preparePartialAssetDocument(updates);
      
      // Update asset metadata
      await this.firebaseAdapter.updateDocument(
        this.collectionName,
        assetId,
        updateDocument
      );

      logger.info('Asset metadata updated successfully', {
        assetId,
        updatedFields: Object.keys(updates),
        updateTimeMs: Date.now() - startTime
      });

    } catch (error) {
      logger.error('Failed to update asset metadata', {
        assetId,
        updates: Object.keys(updates),
        error: (error as Error).message,
        updateTimeMs: Date.now() - startTime
      });
      throw new Error(`Failed to update asset metadata: ${(error as Error).message}`);
    }
  }

  async deleteAssetMetadata(assetId: string): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Get asset info before deletion for cleanup
      const asset = await this.getAssetMetadata(assetId);
      
      // Delete asset metadata
      await this.firebaseAdapter.deleteDocument(this.collectionName, assetId);

      // Remove from presentation assets index if asset exists
      if (asset && asset.presentationId) {
        await this.removeFromPresentationAssetsIndex(asset.presentationId, assetId);
      }

      logger.info('Asset metadata deleted successfully', {
        assetId,
        deleteTimeMs: Date.now() - startTime
      });

    } catch (error) {
      logger.error('Failed to delete asset metadata', {
        assetId,
        error: (error as Error).message,
        deleteTimeMs: Date.now() - startTime
      });
      throw new Error(`Failed to delete asset metadata: ${(error as Error).message}`);
    }
  }

  async searchAssets(
    presentationId: string,
    query: {
      type?: AssetType;
      format?: AssetFormat;
      slideIndex?: number;
      namePattern?: string;
      sizeRange?: { min?: number; max?: number };
    }
  ): Promise<AssetResult[]> {
    try {
      const filters: Array<{
        field: string;
        operator: any;
        value: any;
      }> = [
        { field: 'presentationId', operator: '==', value: presentationId }
      ];

      // Add type filter
      if (query.type) {
        filters.push({ field: 'type', operator: '==', value: query.type });
      }

      // Add format filter
      if (query.format) {
        filters.push({ field: 'format', operator: '==', value: query.format });
      }

      // Add slide index filter
      if (query.slideIndex !== undefined) {
        filters.push({ field: 'slideIndex', operator: '==', value: query.slideIndex });
      }

      // Add size range filters
      if (query.sizeRange) {
        if (query.sizeRange.min !== undefined) {
          filters.push({ field: 'size', operator: '>=', value: query.sizeRange.min });
        }
        if (query.sizeRange.max !== undefined) {
          filters.push({ field: 'size', operator: '<=', value: query.sizeRange.max });
        }
      }

      let assets = await this.firebaseAdapter.queryDocuments<any>(
        this.collectionName,
        filters,
        undefined, // no limit
        { field: 'createdAt', direction: 'desc' }
      );

      // Apply name pattern filter in memory (Firestore doesn't support regex)
      if (query.namePattern) {
        const pattern = new RegExp(query.namePattern, 'i');
        assets = assets.filter(doc => 
          pattern.test(doc.filename) || pattern.test(doc.originalName)
        );
      }

      const assetResults = assets.map(doc => this.documentToAssetResult(doc));
      
      logger.info('Search assets completed', {
        presentationId,
        query,
        resultCount: assetResults.length
      });

      return assetResults;

    } catch (error) {
      logger.error('Failed to search assets', {
        presentationId,
        query,
        error: (error as Error).message
      });
      throw new Error(`Failed to search assets: ${(error as Error).message}`);
    }
  }

  // Additional utility methods

  async getAssetStatistics(presentationId: string): Promise<{
    totalAssets: number;
    assetsByType: Record<AssetType, number>;
    assetsByFormat: Record<string, number>;
    totalSize: number;
    averageSize: number;
  }> {
    try {
      const assets = await this.getAssetsByPresentation(presentationId);
      
      const statistics = {
        totalAssets: assets.length,
        assetsByType: {} as Record<AssetType, number>,
        assetsByFormat: {} as Record<string, number>,
        totalSize: 0,
        averageSize: 0
      };

      // Initialize counters
      const assetTypes: AssetType[] = ['image', 'video', 'audio', 'document', 'shape', 'chart'];
      assetTypes.forEach(type => {
        statistics.assetsByType[type] = 0;
      });

      // Calculate statistics
      assets.forEach(asset => {
        statistics.assetsByType[asset.type]++;
        statistics.assetsByFormat[asset.format] = (statistics.assetsByFormat[asset.format] || 0) + 1;
        statistics.totalSize += asset.size;
      });

      statistics.averageSize = assets.length > 0 ? statistics.totalSize / assets.length : 0;

      logger.info('Asset statistics calculated', {
        presentationId,
        totalAssets: statistics.totalAssets,
        totalSize: statistics.totalSize
      });

      return statistics;

    } catch (error) {
      logger.error('Failed to get asset statistics', {
        presentationId,
        error: (error as Error).message
      });
      throw new Error(`Failed to get asset statistics: ${(error as Error).message}`);
    }
  }

  async bulkDeleteAssets(assetIds: string[]): Promise<{
    deletedCount: number;
    failedDeletes: Array<{ assetId: string; error: string }>;
  }> {
    const result = {
      deletedCount: 0,
      failedDeletes: [] as Array<{ assetId: string; error: string }>
    };

    logger.info('Starting bulk asset deletion', { assetCount: assetIds.length });

    for (const assetId of assetIds) {
      try {
        await this.deleteAssetMetadata(assetId);
        result.deletedCount++;
      } catch (error) {
        result.failedDeletes.push({
          assetId,
          error: (error as Error).message
        });
      }
    }

    logger.info('Bulk asset deletion completed', {
      totalAssets: assetIds.length,
      deletedCount: result.deletedCount,
      failedCount: result.failedDeletes.length
    });

    return result;
  }

  private prepareAssetDocument(asset: AssetResult, presentationId: string): Record<string, any> {
    return {
      // Core asset properties
      id: asset.id,
      type: asset.type,
      format: asset.format,
      filename: asset.filename,
      originalName: asset.originalName,
      size: asset.size,
      slideIndex: asset.slideIndex,
      presentationId,
      
      // Storage information
      firebaseUrl: asset.firebaseUrl,
      firebasePath: asset.firebasePath,
      localPath: asset.localPath,
      
      // Metadata (flattened for Firestore)
      extractedAt: asset.metadata.extractedAt,
      extractionMethod: asset.metadata.extractionMethod,
      hasData: asset.metadata.hasData,
      mimeType: asset.metadata.mimeType,
      
      // Transform properties
      ...(asset.metadata.transform && {
        transformPosition: asset.metadata.transform.position,
        transformDimensions: asset.metadata.transform.dimensions,
        transformRotation: asset.metadata.transform.rotation,
        transformScaleX: asset.metadata.transform.scaleX,
        transformScaleY: asset.metadata.transform.scaleY
      }),
      
      // Style properties
      ...(asset.metadata.style && {
        styleOpacity: asset.metadata.style.opacity,
        styleEffects: asset.metadata.style.effects,
        styleFilters: asset.metadata.style.filters
      }),
      
      // Quality properties
      ...(asset.metadata.quality && {
        qualityResolution: asset.metadata.quality.resolution,
        qualityBitrate: asset.metadata.quality.bitrate,
        qualityColorDepth: asset.metadata.quality.colorDepth,
        qualityCompression: asset.metadata.quality.compression,
        qualityLevel: asset.metadata.quality.quality
      }),
      
      // Media-specific properties
      duration: asset.metadata.duration,
      frameRate: asset.metadata.frameRate,
      channels: asset.metadata.channels,
      sampleRate: asset.metadata.sampleRate,
      
      // Document-specific properties
      pages: asset.metadata.pages,
      wordCount: asset.metadata.wordCount,
      
      // Aspose-specific properties
      shapeId: asset.metadata.shapeId,
      shapeType: asset.metadata.shapeType,
      slideId: asset.metadata.slideId,
      parentGroupId: asset.metadata.parentGroupId,
      
      // Relationships
      linkedAssets: asset.metadata.linkedAssets,
      dependencies: asset.metadata.dependencies,
      
      // Processing metadata
      processingTimeMs: asset.metadata.processingTimeMs,
      errorCount: asset.metadata.errorCount,
      warnings: asset.metadata.warnings,
      
      // Custom properties (flattened)
      ...(asset.metadata.customProperties && 
          Object.keys(asset.metadata.customProperties).reduce((acc, key) => {
            acc[`custom_${key}`] = asset.metadata.customProperties![key];
            return acc;
          }, {} as Record<string, any>)
      ),
      
      // Thumbnail information
      ...(asset.thumbnail && {
        thumbnailUrl: asset.thumbnail.url,
        thumbnailBase64: asset.thumbnail.base64,
        thumbnailSize: asset.thumbnail.size
      }),
      
      // Timestamps
      createdAt: this.firebaseAdapter.getServerTimestamp(),
      updatedAt: this.firebaseAdapter.getServerTimestamp()
    };
  }

  private preparePartialAssetDocument(updates: Partial<AssetResult>): Record<string, any> {
    const updateDoc: Record<string, any> = {};
    
    // Update simple properties
    const simpleProps = ['filename', 'originalName', 'size', 'firebaseUrl', 'firebasePath', 'localPath'];
    simpleProps.forEach(prop => {
      if (updates[prop as keyof AssetResult] !== undefined) {
        updateDoc[prop] = updates[prop as keyof AssetResult];
      }
    });
    
    // Update metadata properties if provided
    if (updates.metadata) {
      Object.keys(updates.metadata).forEach(key => {
        updateDoc[key] = updates.metadata![key as keyof typeof updates.metadata];
      });
    }
    
    // Update thumbnail if provided
    if (updates.thumbnail) {
      updateDoc.thumbnailUrl = updates.thumbnail.url;
      updateDoc.thumbnailBase64 = updates.thumbnail.base64;
      updateDoc.thumbnailSize = updates.thumbnail.size;
    }
    
    return updateDoc;
  }

  private documentToAssetResult(document: any): AssetResult {
    // Reconstruct asset from flattened document
    return {
      id: document.id || document.assetId,
      type: document.type,
      format: document.format,
      filename: document.filename,
      originalName: document.originalName,
      size: document.size,
      slideIndex: document.slideIndex,
      presentationId: document.presentationId,
      
      firebaseUrl: document.firebaseUrl,
      firebasePath: document.firebasePath,
      localPath: document.localPath,
      
      metadata: {
        extractedAt: document.extractedAt,
        extractionMethod: document.extractionMethod,
        hasData: document.hasData,
        mimeType: document.mimeType,
        
        // Reconstruct transform
        ...(document.transformPosition && {
          transform: {
            position: document.transformPosition,
            dimensions: document.transformDimensions,
            rotation: document.transformRotation,
            scaleX: document.transformScaleX,
            scaleY: document.transformScaleY
          }
        }),
        
        // Reconstruct style
        ...(document.styleOpacity !== undefined && {
          style: {
            opacity: document.styleOpacity,
            effects: document.styleEffects,
            filters: document.styleFilters
          }
        }),
        
        // Reconstruct quality
        ...(document.qualityLevel && {
          quality: {
            resolution: document.qualityResolution,
            bitrate: document.qualityBitrate,
            colorDepth: document.qualityColorDepth,
            compression: document.qualityCompression,
            quality: document.qualityLevel
          }
        }),
        
        duration: document.duration,
        frameRate: document.frameRate,
        channels: document.channels,
        sampleRate: document.sampleRate,
        pages: document.pages,
        wordCount: document.wordCount,
        shapeId: document.shapeId,
        shapeType: document.shapeType,
        slideId: document.slideId,
        parentGroupId: document.parentGroupId,
        linkedAssets: document.linkedAssets,
        dependencies: document.dependencies,
        processingTimeMs: document.processingTimeMs,
        errorCount: document.errorCount,
        warnings: document.warnings,
        
        // Reconstruct custom properties
        customProperties: this.extractCustomProperties(document)
      },
      
      // Reconstruct thumbnail
      ...(document.thumbnailUrl && {
        thumbnail: {
          url: document.thumbnailUrl,
          base64: document.thumbnailBase64,
          size: document.thumbnailSize
        }
      })
    };
  }

  private extractCustomProperties(document: any): Record<string, any> | undefined {
    const customProps: Record<string, any> = {};
    let hasCustomProps = false;
    
    Object.keys(document).forEach(key => {
      if (key.startsWith('custom_')) {
        const propName = key.substring(7); // Remove 'custom_' prefix
        customProps[propName] = document[key];
        hasCustomProps = true;
      }
    });
    
    return hasCustomProps ? customProps : undefined;
  }

  private async updatePresentationAssetsIndex(
    presentationId: string,
    assetId: string,
    asset: AssetResult
  ): Promise<void> {
    try {
      // Get existing index or create new one
      let indexDoc = await this.firebaseAdapter.getDocument<any>(
        this.presentationAssetsCollectionName,
        presentationId
      );

      if (!indexDoc) {
        indexDoc = {
          presentationId,
          assets: [],
          totalAssets: 0,
          assetsByType: {},
          totalSize: 0,
          lastUpdated: new Date().toISOString()
        };
      }

      // Add asset to index
      indexDoc.assets = indexDoc.assets || [];
      indexDoc.assets.push({
        assetId,
        type: asset.type,
        format: asset.format,
        size: asset.size,
        slideIndex: asset.slideIndex,
        addedAt: new Date().toISOString()
      });

      // Update statistics
      indexDoc.totalAssets = indexDoc.assets.length;
      indexDoc.assetsByType = indexDoc.assetsByType || {};
      indexDoc.assetsByType[asset.type] = (indexDoc.assetsByType[asset.type] || 0) + 1;
      indexDoc.totalSize = (indexDoc.totalSize || 0) + asset.size;
      indexDoc.lastUpdated = new Date().toISOString();

      // Save updated index
      await this.firebaseAdapter.saveDocument(
        this.presentationAssetsCollectionName,
        presentationId,
        indexDoc
      );

    } catch (error) {
      logger.warn('Failed to update presentation assets index', {
        presentationId,
        assetId,
        error: (error as Error).message
      });
      // Don't throw error as this is supplementary functionality
    }
  }

  private async removeFromPresentationAssetsIndex(
    presentationId: string,
    assetId: string
  ): Promise<void> {
    try {
      const indexDoc = await this.firebaseAdapter.getDocument<any>(
        this.presentationAssetsCollectionName,
        presentationId
      );

      if (!indexDoc || !indexDoc.assets) {
        return;
      }

      // Remove asset from index
      const assetIndex = indexDoc.assets.findIndex((a: any) => a.assetId === assetId);
      if (assetIndex !== -1) {
        const removedAsset = indexDoc.assets[assetIndex];
        indexDoc.assets.splice(assetIndex, 1);

        // Update statistics
        indexDoc.totalAssets = indexDoc.assets.length;
        indexDoc.assetsByType[removedAsset.type] = Math.max(0, (indexDoc.assetsByType[removedAsset.type] || 1) - 1);
        indexDoc.totalSize = Math.max(0, (indexDoc.totalSize || removedAsset.size) - removedAsset.size);
        indexDoc.lastUpdated = new Date().toISOString();

        // Save updated index
        await this.firebaseAdapter.saveDocument(
          this.presentationAssetsCollectionName,
          presentationId,
          indexDoc
        );
      }

    } catch (error) {
      logger.warn('Failed to remove from presentation assets index', {
        presentationId,
        assetId,
        error: (error as Error).message
      });
      // Don't throw error as this is supplementary functionality
    }
  }
} 