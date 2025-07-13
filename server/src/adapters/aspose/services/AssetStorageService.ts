import { z } from "zod";
/**
 * Asset Storage Service - Firebase Storage Integration
 * 
 * Handles uploading assets to Firebase Storage with proper organization,
 * metadata management, and URL generation for downloaded assets.
 */

import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../../utils/logger';
import { FirebaseAdapter } from '../../firebase.adapter';
import {
  AssetStorageService,
  AssetMetadata,
  AssetExtractionOptions
} from '../types/asset-interfaces';

export class AssetStorageServiceImpl implements AssetStorageService {
  private firebaseAdapter: FirebaseAdapter;
  private readonly defaultConfig = {
    baseFolder: 'extracted-assets',
    thumbnailFolder: 'thumbnails',
    signedUrlExpiration: 7 * 24 * 60 * 60 * 1000, // 7 days
    maxFileSize: 100 * 1024 * 1024, // 100MB
    enableVersioning: true
  };

  constructor(firebaseAdapter: FirebaseAdapter) {
    this.firebaseAdapter = firebaseAdapter;
    logger.info('Asset Storage Service initialized', {
      baseFolder: this.defaultConfig.baseFolder,
      maxFileSize: this.defaultConfig.maxFileSize
    });
  }

  async uploadAsset(
    assetData: Buffer,
    filename: string,
    metadata: AssetMetadata,
    options: AssetExtractionOptions
  ): Promise<{
    firebaseUrl: string;
    firebasePath: string;
    downloadUrl?: string;
  }> {
    const startTime = Date.now();
    
    try {
      // Validate file size
      if (assetData.length > this.defaultConfig.maxFileSize) {
        throw new Error(`Asset size (${assetData.length} bytes) exceeds maximum allowed size (${this.defaultConfig.maxFileSize} bytes)`);
      }

      // Generate storage path
      const storagePath = this.generateStoragePath(filename, metadata, options);
      
      // Prepare metadata for Firebase
      const firebaseMetadata = this.prepareFirebaseMetadata(metadata, options);
      
             // Upload to Firebase Storage
       const uploadResult = await this.firebaseAdapter.uploadFile(
         assetData,
         filename,
         metadata.mimeType || 'application/octet-stream',
         {
           folder: storagePath.folder,
           customName: storagePath.filename,
           makePublic: options.makePublic || false,
           metadata: firebaseMetadata
         }
       );

       let downloadUrl: string | undefined;
       
       // Generate download URL if requested
       if (options.generateDownloadUrls) {
         try {
           downloadUrl = await this.firebaseAdapter.getDownloadUrl(
             uploadResult.path,
             this.defaultConfig.signedUrlExpiration
           );
         } catch (urlError) {
           logger.warn('Failed to generate download URL', {
             path: uploadResult.path,
             error: (urlError as Error).message
           });
         }
       }

      const result = {
        firebaseUrl: uploadResult.url,
        firebasePath: uploadResult.path,
        downloadUrl
      };

      logger.info('Asset uploaded successfully', {
        filename,
        firebasePath: result.firebasePath,
        fileSize: assetData.length,
        uploadTimeMs: Date.now() - startTime,
        hasDownloadUrl: !!downloadUrl
      });

      return result;

    } catch (error) {
      logger.error('Asset upload failed', {
        filename,
        fileSize: assetData.length,
        error: (error as Error).message,
        uploadTimeMs: Date.now() - startTime
      });
      throw new Error(`Failed to upload asset: ${(error as Error).message}`);
    }
  }

  async uploadThumbnail(
    thumbnailData: Buffer,
    assetId: string,
    metadata: AssetMetadata
  ): Promise<{
    url: string;
    path: string;
  }> {
    const startTime = Date.now();
    
    try {
      // Generate thumbnail path
      const thumbnailPath = this.generateThumbnailPath(assetId, metadata);
      
      // Prepare thumbnail metadata
      const thumbnailMetadata = {
        assetId,
        originalAssetType: metadata.extractionMethod,
        slideIndex: metadata.slideId,
        generatedAt: new Date().toISOString(),
        isThumnail: true
      };

             // Upload thumbnail to Firebase Storage
       const uploadResult = await this.firebaseAdapter.uploadFile(
         thumbnailData,
         thumbnailPath.filename,
         'image/png', // Thumbnails are typically PNG
         {
           folder: thumbnailPath.folder,
           customName: thumbnailPath.filename,
           makePublic: true, // Thumbnails are usually public
           metadata: thumbnailMetadata
         }
       );

      logger.info('Thumbnail uploaded successfully', {
        assetId,
        firebasePath: uploadResult.path,
        thumbnailSize: thumbnailData.length,
        uploadTimeMs: Date.now() - startTime
      });

      return {
        url: uploadResult.url,
        path: uploadResult.path
      };

    } catch (error) {
      logger.error('Thumbnail upload failed', {
        assetId,
        thumbnailSize: thumbnailData.length,
        error: (error as Error).message,
        uploadTimeMs: Date.now() - startTime
      });
      throw new Error(`Failed to upload thumbnail: ${(error as Error).message}`);
    }
  }

  async generateSignedUrl(firebasePath: string, expirationMs?: number): Promise<string> {
    try {
      const expiration = expirationMs || this.defaultConfig.signedUrlExpiration;
      
      const signedUrl = await this.firebaseAdapter.getDownloadUrl(
        firebasePath,
        expiration
      );

      logger.debug('Generated signed URL', {
        firebasePath,
        expirationMs: expiration
      });

      return signedUrl;

    } catch (error) {
      logger.error('Failed to generate signed URL', {
        firebasePath,
        error: (error as Error).message
      });
      throw new Error(`Failed to generate signed URL: ${(error as Error).message}`);
    }
  }

  private generateStoragePath(
    filename: string,
    metadata: AssetMetadata,
    options: AssetExtractionOptions
  ): { folder: string; filename: string } {
    // Base folder structure
    const baseFolder = options.firebaseFolder || this.defaultConfig.baseFolder;
    
    // Organize by extraction method and date
    const extractionDate = new Date(metadata.extractedAt);
    const datePath = `${extractionDate.getFullYear()}/${String(extractionDate.getMonth() + 1).padStart(2, '0')}/${String(extractionDate.getDate()).padStart(2, '0')}`;
    
    // Organize by extraction method
    const methodFolder = this.mapExtractionMethodToFolder(metadata.extractionMethod);
    
    // Organize by slide if available
    const slideFolder = metadata.slideId ? `slide-${metadata.slideId}` : 'no-slide';
    
    const folder = `${baseFolder}/${datePath}/${methodFolder}/${slideFolder}`;
    
    // Generate unique filename if versioning is enabled
    const finalFilename = this.defaultConfig.enableVersioning 
      ? this.generateVersionedFilename(filename)
      : filename;

    return {
      folder,
      filename: finalFilename
    };
  }

  private generateThumbnailPath(
    assetId: string,
    metadata: AssetMetadata
  ): { folder: string; filename: string } {
    const baseFolder = this.defaultConfig.thumbnailFolder;
    
    // Organize thumbnails by extraction date
    const extractionDate = new Date(metadata.extractedAt);
    const datePath = `${extractionDate.getFullYear()}/${String(extractionDate.getMonth() + 1).padStart(2, '0')}`;
    
    // Organize by slide
    const slideFolder = metadata.slideId ? `slide-${metadata.slideId}` : 'no-slide';
    
    const folder = `${baseFolder}/${datePath}/${slideFolder}`;
    const filename = `${assetId}-thumbnail.png`;

    return {
      folder,
      filename
    };
  }

  private generateVersionedFilename(originalFilename: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const randomId = uuidv4().substring(0, 8);
    
    const lastDotIndex = originalFilename.lastIndexOf('.');
    if (lastDotIndex === -1) {
      return `${originalFilename}-${timestamp}-${randomId}`;
    }
    
    const nameWithoutExtension = originalFilename.substring(0, lastDotIndex);
    const extension = originalFilename.substring(lastDotIndex);
    
    return `${nameWithoutExtension}-${timestamp}-${randomId}${extension}`;
  }

  private mapExtractionMethodToFolder(method: string): string {
    const methodMap: Record<string, string> = {
      'aspose-shapes': 'shapes',
      'aspose-media': 'media',
      'aspose-embedded': 'embedded',
      'aspose-linked': 'linked',
      'aspose-chart': 'charts',
      'aspose-table': 'tables'
    };

    return methodMap[method] || 'other';
  }

  private prepareFirebaseMetadata(
    assetMetadata: AssetMetadata,
    options: AssetExtractionOptions
  ): Record<string, any> {
    const firebaseMetadata: Record<string, any> = {
      // Core asset metadata
      extractedAt: assetMetadata.extractedAt,
      extractionMethod: assetMetadata.extractionMethod,
      slideId: assetMetadata.slideId,
      hasData: assetMetadata.hasData,
      
      // Technical metadata
      mimeType: assetMetadata.mimeType,
      processingTimeMs: assetMetadata.processingTimeMs,
      
      // Asset identification
      shapeId: assetMetadata.shapeId,
      shapeType: assetMetadata.shapeType,
      parentGroupId: assetMetadata.parentGroupId,
      
      // Extraction options used
      returnFormat: options.returnFormat,
      saveToFirebase: options.saveToFirebase,
      generateThumbnails: options.extractThumbnails,
      
      // Timestamps
      uploadedAt: new Date().toISOString(),
      version: '1.0'
    };

    // Add transform properties if available
    if (assetMetadata.transform) {
      firebaseMetadata.position = assetMetadata.transform.position;
      firebaseMetadata.dimensions = assetMetadata.transform.dimensions;
      firebaseMetadata.rotation = assetMetadata.transform.rotation;
    }

    // Add quality properties if available
    if (assetMetadata.quality) {
      firebaseMetadata.quality = assetMetadata.quality.quality;
      firebaseMetadata.compression = assetMetadata.quality.compression;
      firebaseMetadata.resolution = assetMetadata.quality.resolution;
    }

    // Add media-specific metadata
    if (assetMetadata.duration) {
      firebaseMetadata.duration = assetMetadata.duration;
    }
    
    if (assetMetadata.channels) {
      firebaseMetadata.audioChannels = assetMetadata.channels;
    }
    
    if (assetMetadata.sampleRate) {
      firebaseMetadata.audioSampleRate = assetMetadata.sampleRate;
    }

    // Add document-specific metadata
    if (assetMetadata.pages) {
      firebaseMetadata.documentPages = assetMetadata.pages;
    }
    
    if (assetMetadata.wordCount) {
      firebaseMetadata.documentWordCount = assetMetadata.wordCount;
    }

    // Add relationships
    if (assetMetadata.linkedAssets) {
      firebaseMetadata.linkedAssets = assetMetadata.linkedAssets;
    }
    
    if (assetMetadata.dependencies) {
      firebaseMetadata.dependencies = assetMetadata.dependencies;
    }

    // Add warnings and error counts
    if (assetMetadata.warnings) {
      firebaseMetadata.warnings = assetMetadata.warnings;
    }
    
    if (assetMetadata.errorCount) {
      firebaseMetadata.errorCount = assetMetadata.errorCount;
    }

    // Add custom properties (flattened for Firebase)
    if (assetMetadata.customProperties) {
      Object.keys(assetMetadata.customProperties).forEach(key => {
        firebaseMetadata[`custom_${key}`] = assetMetadata.customProperties![key];
      });
    }

    return firebaseMetadata;
  }

  // Utility methods for file management

  async deleteAsset(firebasePath: string): Promise<void> {
    try {
      await this.firebaseAdapter.deleteFile(firebasePath);
      logger.info('Asset deleted successfully', { firebasePath });
    } catch (error) {
      logger.error('Failed to delete asset', {
        firebasePath,
        error: (error as Error).message
      });
      throw new Error(`Failed to delete asset: ${(error as Error).message}`);
    }
  }

  async getAssetMetadata(firebasePath: string): Promise<Record<string, any> | null> {
    try {
      // Note: This functionality requires implementing file metadata retrieval
      // For now, return null to indicate metadata is not available
      logger.debug('Asset metadata retrieval not implemented yet', { firebasePath });
      return null;
    } catch (error) {
      logger.warn('Failed to get asset metadata', {
        firebasePath,
        error: (error as Error).message
      });
      return null;
    }
  }

  async listAssetsByFolder(folderPath: string): Promise<string[]> {
    try {
      // Note: This functionality requires implementing file listing
      // For now, return empty array
      logger.debug('Asset listing not implemented yet', { folderPath });
      return [];
    } catch (error) {
      logger.error('Failed to list assets in folder', {
        folderPath,
        error: (error as Error).message
      });
      throw new Error(`Failed to list assets: ${(error as Error).message}`);
    }
  }

  // Bulk operations

  async uploadMultipleAssets(
    assets: Array<{
      data: Buffer;
      filename: string;
      metadata: AssetMetadata;
    }>,
    options: AssetExtractionOptions
  ): Promise<Array<{
    filename: string;
    firebaseUrl: string;
    firebasePath: string;
    success: boolean;
    error?: string;
  }>> {
    const results = [];
    
    logger.info('Starting bulk asset upload', { 
      assetCount: assets.length 
    });

    for (const asset of assets) {
      try {
        const uploadResult = await this.uploadAsset(
          asset.data,
          asset.filename,
          asset.metadata,
          options
        );
        
        results.push({
          filename: asset.filename,
          firebaseUrl: uploadResult.firebaseUrl,
          firebasePath: uploadResult.firebasePath,
          success: true
        });
      } catch (error) {
        results.push({
          filename: asset.filename,
          firebaseUrl: '',
          firebasePath: '',
          success: false,
          error: (error as Error).message
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    logger.info('Bulk asset upload completed', {
      totalAssets: assets.length,
      successCount,
      failureCount: assets.length - successCount
    });

    return results;
  }
} 