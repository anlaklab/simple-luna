/**
 * Asset Metadata Service - Comprehensive Metadata Generation
 * 
 * Generates detailed metadata for all types of assets extracted from presentations.
 * Provides enrichment capabilities and validation for asset metadata.
 */

import { logger } from '../../../utils/logger';
import {
  AssetMetadataService,
  AssetMetadata,
  ExtractionMethod,
  AssetTransform,
  AssetStyle,
  AssetQuality,
  AssetPosition,
  AssetDimensions
} from '../types/asset-interfaces';

export class AssetMetadataServiceImpl implements AssetMetadataService {
  
  async generateComprehensiveMetadata(
    asset: any,
    slideIndex: number,
    extractionMethod: ExtractionMethod
  ): Promise<AssetMetadata> {
    const startTime = Date.now();
    
    try {
      // Base metadata structure
      const metadata: AssetMetadata = {
        extractedAt: new Date().toISOString(),
        extractionMethod,
        hasData: true,
        slideId: slideIndex.toString(),
        processingTimeMs: 0
      };

      // Extract spatial properties (position, dimensions, transformations)
      metadata.transform = await this.extractTransformProperties(asset);
      
      // Extract visual style properties
      metadata.style = await this.extractStyleProperties(asset);
      
      // Extract quality and technical properties
      metadata.quality = await this.extractQualityProperties(asset);
      
      // Extract Aspose-specific properties
      await this.enrichWithAsposeProperties(metadata, asset);
      
      // Extract relationships and dependencies
      await this.extractRelationshipProperties(metadata, asset);
      
      // Add processing metadata
      metadata.processingTimeMs = Date.now() - startTime;
      
      logger.debug('Generated comprehensive metadata', {
        slideIndex,
        extractionMethod,
        propertiesCount: Object.keys(metadata).length,
        processingTimeMs: metadata.processingTimeMs
      });
      
      return metadata;

    } catch (error) {
      logger.warn('Failed to generate comprehensive metadata', {
        slideIndex,
        extractionMethod,
        error: (error as Error).message
      });
      
      // Return minimal metadata on error
      return {
        extractedAt: new Date().toISOString(),
        extractionMethod,
        hasData: true,
        processingTimeMs: Date.now() - startTime,
        errorCount: 1,
        warnings: [`Metadata generation error: ${(error as Error).message}`]
      };
    }
  }

  async enrichMetadata(
    metadata: AssetMetadata,
    fileData?: Buffer
  ): Promise<AssetMetadata> {
    const startTime = Date.now();
    
    try {
      const enrichedMetadata = { ...metadata };
      
      if (fileData) {
        // Enrich with file-based analysis
        enrichedMetadata.mimeType = this.detectMimeType(fileData);
        
        // Add file signature analysis
        const fileSignature = this.analyzeFileSignature(fileData);
        enrichedMetadata.customProperties = {
          ...enrichedMetadata.customProperties,
          fileSignature
        };
        
        // Add compression analysis
        const compressionInfo = this.analyzeCompression(fileData);
        if (compressionInfo) {
          enrichedMetadata.quality = {
            ...enrichedMetadata.quality,
            ...compressionInfo
          };
        }
        
        // Add size analysis
        const sizeAnalysis = this.analyzeSizeProperties(fileData);
        enrichedMetadata.customProperties = {
          ...enrichedMetadata.customProperties,
          sizeAnalysis
        };
      }
      
      // Add timestamp for enrichment
      enrichedMetadata.customProperties = {
        ...enrichedMetadata.customProperties,
        enrichedAt: new Date().toISOString(),
        enrichmentTimeMs: Date.now() - startTime
      };
      
      return enrichedMetadata;

    } catch (error) {
      logger.warn('Failed to enrich metadata', {
        error: (error as Error).message
      });
      
      // Return original metadata with error info
      return {
        ...metadata,
        warnings: [
          ...(metadata.warnings || []),
          `Enrichment error: ${(error as Error).message}`
        ]
      };
    }
  }

  validateMetadata(metadata: AssetMetadata): boolean {
    try {
      // Required fields validation
      const requiredFields = ['extractedAt', 'extractionMethod', 'hasData'];
      const hasRequiredFields = requiredFields.every(field => 
        metadata[field as keyof AssetMetadata] !== undefined
      );
      
      if (!hasRequiredFields) {
        logger.warn('Metadata validation failed: missing required fields');
        return false;
      }
      
      // Date format validation
      const extractedAtDate = new Date(metadata.extractedAt);
      if (isNaN(extractedAtDate.getTime())) {
        logger.warn('Metadata validation failed: invalid extractedAt date');
        return false;
      }
      
      // Transform validation
      if (metadata.transform && !this.validateTransform(metadata.transform)) {
        logger.warn('Metadata validation failed: invalid transform properties');
        return false;
      }
      
      // Style validation
      if (metadata.style && !this.validateStyle(metadata.style)) {
        logger.warn('Metadata validation failed: invalid style properties');
        return false;
      }
      
      // Quality validation
      if (metadata.quality && !this.validateQuality(metadata.quality)) {
        logger.warn('Metadata validation failed: invalid quality properties');
        return false;
      }
      
      return true;

    } catch (error) {
      logger.warn('Metadata validation error', {
        error: (error as Error).message
      });
      return false;
    }
  }

  private async extractTransformProperties(asset: any): Promise<AssetTransform | undefined> {
    try {
      if (!asset || typeof asset.getX !== 'function') {
        return undefined;
      }

      const position: AssetPosition = {
        x: asset.getX ? asset.getX() : 0,
        y: asset.getY ? asset.getY() : 0
      };
      
      // Try to get Z-index if available
      if (asset.getZOrderPosition) {
        position.z = asset.getZOrderPosition();
      }

      const dimensions: AssetDimensions = {
        width: asset.getWidth ? asset.getWidth() : 0,
        height: asset.getHeight ? asset.getHeight() : 0,
        aspectRatio: 0
      };
      
      if (dimensions.width > 0 && dimensions.height > 0) {
        dimensions.aspectRatio = dimensions.width / dimensions.height;
      }

      const transform: AssetTransform = {
        position,
        dimensions
      };

      // Extract rotation if available
      if (asset.getRotation) {
        transform.rotation = asset.getRotation();
      }

      // Extract scale factors if available
      if (asset.getScaleX) {
        transform.scaleX = asset.getScaleX();
      }
      if (asset.getScaleY) {
        transform.scaleY = asset.getScaleY();
      }

      return transform;

    } catch (error) {
      logger.debug('Failed to extract transform properties', {
        error: (error as Error).message
      });
      return undefined;
    }
  }

  private async extractStyleProperties(asset: any): Promise<AssetStyle | undefined> {
    try {
      const style: AssetStyle = {};

      // Extract opacity/transparency
      if (asset.getFillFormat) {
        const fillFormat = asset.getFillFormat();
        if (fillFormat && fillFormat.getTransparency) {
          style.opacity = 1 - (fillFormat.getTransparency() / 100);
        }
      }

      // Extract visual effects
      if (asset.getEffectFormat) {
        const effectFormat = asset.getEffectFormat();
        if (effectFormat) {
          style.effects = this.extractEffects(effectFormat);
        }
      }

      // Extract 3D properties if available
      if (asset.getThreeDFormat) {
        const threeDFormat = asset.getThreeDFormat();
        if (threeDFormat) {
          style.filters = this.extract3DProperties(threeDFormat);
        }
      }

      return Object.keys(style).length > 0 ? style : undefined;

    } catch (error) {
      logger.debug('Failed to extract style properties', {
        error: (error as Error).message
      });
      return undefined;
    }
  }

  private async extractQualityProperties(asset: any): Promise<AssetQuality | undefined> {
    try {
      const quality: AssetQuality = {
        quality: 'medium' // Default
      };

      // Extract compression info if available
      if (asset.getPictureFormat) {
        const pictureFormat = asset.getPictureFormat();
        if (pictureFormat && pictureFormat.getCompressLevel) {
          const compressLevel = pictureFormat.getCompressLevel();
          quality.compression = this.mapCompressionLevel(compressLevel);
        }
      }

      // Extract resolution info if available
      if (asset.getResolution) {
        quality.resolution = asset.getResolution();
      }

      // Determine quality level based on available properties
      if (quality.resolution) {
        if (quality.resolution >= 300) quality.quality = 'high';
        else if (quality.resolution >= 150) quality.quality = 'medium';
        else quality.quality = 'low';
      }

      return quality;

    } catch (error) {
      logger.debug('Failed to extract quality properties', {
        error: (error as Error).message
      });
      return {
        quality: 'medium',
        compression: 'unknown'
      };
    }
  }

  private async enrichWithAsposeProperties(metadata: AssetMetadata, asset: any): Promise<void> {
    try {
      // Extract shape ID
      if (asset.getUniqueId) {
        metadata.shapeId = asset.getUniqueId().toString();
      } else if (asset.getId) {
        metadata.shapeId = asset.getId().toString();
      }

      // Extract shape type
      if (asset.getShapeType) {
        const shapeType = asset.getShapeType();
        metadata.shapeType = this.mapShapeTypeToString(shapeType);
      }

      // Extract parent group information
      if (asset.getParentGroup) {
        const parentGroup = asset.getParentGroup();
        if (parentGroup && parentGroup.getUniqueId) {
          metadata.parentGroupId = parentGroup.getUniqueId().toString();
        }
      }

      // Extract custom properties
      if (asset.getCustomProperties) {
        const customProps = asset.getCustomProperties();
        if (customProps) {
          metadata.customProperties = this.extractCustomProperties(customProps);
        }
      }

    } catch (error) {
      logger.debug('Failed to enrich with Aspose properties', {
        error: (error as Error).message
      });
    }
  }

  private async extractRelationshipProperties(metadata: AssetMetadata, asset: any): Promise<void> {
    try {
      const linkedAssets: string[] = [];
      const dependencies: string[] = [];

      // Extract hyperlinks
      if (asset.getHyperlinkClick) {
        const hyperlink = asset.getHyperlinkClick();
        if (hyperlink && hyperlink.getTargetSlide) {
          const targetSlide = hyperlink.getTargetSlide();
          if (targetSlide) {
            linkedAssets.push(`slide-${targetSlide.getSlideNumber()}`);
          }
        }
      }

      // Extract animation dependencies
      if (asset.getAnimations) {
        const animations = asset.getAnimations();
        // Process animation dependencies
        // Implementation depends on specific Aspose API
      }

      if (linkedAssets.length > 0) {
        metadata.linkedAssets = linkedAssets;
      }

      if (dependencies.length > 0) {
        metadata.dependencies = dependencies;
      }

    } catch (error) {
      logger.debug('Failed to extract relationship properties', {
        error: (error as Error).message
      });
    }
  }

  private detectMimeType(fileData: Buffer): string {
    const signature = fileData.toString('hex', 0, 8).toUpperCase();
    
    // Image signatures
    if (signature.startsWith('89504E47')) return 'image/png';
    if (signature.startsWith('FFD8FF')) return 'image/jpeg';
    if (signature.startsWith('47494638')) return 'image/gif';
    if (signature.startsWith('424D')) return 'image/bmp';
    
    // Video signatures
    if (signature.includes('66747970')) return 'video/mp4';
    if (signature.startsWith('52494646')) return 'video/avi';
    
    // Audio signatures
    if (signature.startsWith('494433')) return 'audio/mpeg';
    if (signature.startsWith('52494646')) return 'audio/wav';
    
    // Document signatures
    if (signature.startsWith('25504446')) return 'application/pdf';
    if (signature.startsWith('504B0304')) return 'application/zip';
    
    return 'application/octet-stream';
  }

  private analyzeFileSignature(fileData: Buffer): Record<string, any> {
    const signature = fileData.toString('hex', 0, 16).toUpperCase();
    
    return {
      hexSignature: signature,
      signatureLength: Math.min(16, fileData.length),
      detectedFormat: this.detectMimeType(fileData),
      fileSize: fileData.length
    };
  }

  private analyzeCompression(fileData: Buffer): Partial<AssetQuality> | null {
    try {
      const compressionRatio = this.estimateCompressionRatio(fileData);
      
      return {
        compression: compressionRatio > 0.8 ? 'high' : compressionRatio > 0.5 ? 'medium' : 'low',
        // Additional compression metrics could be added here
      };
    } catch {
      return null;
    }
  }

  private analyzeSizeProperties(fileData: Buffer): Record<string, any> {
    return {
      sizeBytes: fileData.length,
      sizeKB: Math.round(fileData.length / 1024 * 100) / 100,
      sizeMB: Math.round(fileData.length / (1024 * 1024) * 100) / 100,
      sizeCategory: this.categorizeSizeSize(fileData.length)
    };
  }

  private validateTransform(transform: AssetTransform): boolean {
    try {
      const { position, dimensions } = transform;
      
      // Validate position
      if (typeof position.x !== 'number' || typeof position.y !== 'number') {
        return false;
      }
      
      // Validate dimensions
      if (typeof dimensions.width !== 'number' || 
          typeof dimensions.height !== 'number' ||
          typeof dimensions.aspectRatio !== 'number') {
        return false;
      }
      
      // Validate optional properties
      if (transform.rotation !== undefined && typeof transform.rotation !== 'number') {
        return false;
      }
      
      return true;
    } catch {
      return false;
    }
  }

  private validateStyle(style: AssetStyle): boolean {
    try {
      // Validate opacity
      if (style.opacity !== undefined && 
          (typeof style.opacity !== 'number' || style.opacity < 0 || style.opacity > 1)) {
        return false;
      }
      
      // Validate effects array
      if (style.effects !== undefined && !Array.isArray(style.effects)) {
        return false;
      }
      
      return true;
    } catch {
      return false;
    }
  }

  private validateQuality(quality: AssetQuality): boolean {
    try {
      // Validate quality enum
      if (quality.quality && !['low', 'medium', 'high', 'lossless'].includes(quality.quality)) {
        return false;
      }
      
      // Validate resolution
      if (quality.resolution !== undefined && 
          (typeof quality.resolution !== 'number' || quality.resolution < 0)) {
        return false;
      }
      
      return true;
    } catch {
      return false;
    }
  }

  private extractEffects(effectFormat: any): string[] {
    const effects: string[] = [];
    
    try {
      // Extract shadow effects
      if (effectFormat.getShadowEffect && effectFormat.getShadowEffect()) {
        effects.push('shadow');
      }
      
      // Extract glow effects
      if (effectFormat.getGlowEffect && effectFormat.getGlowEffect()) {
        effects.push('glow');
      }
      
      // Extract reflection effects
      if (effectFormat.getReflectionEffect && effectFormat.getReflectionEffect()) {
        effects.push('reflection');
      }
      
      // Extract blur effects
      if (effectFormat.getBlurEffect && effectFormat.getBlurEffect()) {
        effects.push('blur');
      }
    } catch (error) {
      logger.debug('Failed to extract effects', { error: (error as Error).message });
    }
    
    return effects;
  }

  private extract3DProperties(threeDFormat: any): Record<string, any> {
    const properties: Record<string, any> = {};
    
    try {
      if (threeDFormat.getDepth) {
        properties.depth = threeDFormat.getDepth();
      }
      
      if (threeDFormat.getBevelTop) {
        properties.bevelTop = threeDFormat.getBevelTop();
      }
      
      if (threeDFormat.getContourWidth) {
        properties.contourWidth = threeDFormat.getContourWidth();
      }
    } catch (error) {
      logger.debug('Failed to extract 3D properties', { error: (error as Error).message });
    }
    
    return properties;
  }

  private mapCompressionLevel(level: number): string {
    if (level >= 80) return 'high';
    if (level >= 50) return 'medium';
    return 'low';
  }

  private mapShapeTypeToString(shapeType: any): string {
    // Map Aspose shape types to string representations
    // This would need to be implemented based on actual Aspose.Slides enums
    return shapeType?.toString() || 'unknown';
  }

  private extractCustomProperties(customProps: any): Record<string, any> {
    const properties: Record<string, any> = {};
    
    try {
      // Extract custom properties based on Aspose.Slides API
      // Implementation depends on the specific API structure
      
      if (customProps.getCount && customProps.get_Item) {
        const count = customProps.getCount();
        for (let i = 0; i < count; i++) {
          const prop = customProps.get_Item(i);
          if (prop.getName && prop.getValue) {
            properties[prop.getName()] = prop.getValue();
          }
        }
      }
    } catch (error) {
      logger.debug('Failed to extract custom properties', { error: (error as Error).message });
    }
    
    return properties;
  }

  private estimateCompressionRatio(fileData: Buffer): number {
    // Basic compression ratio estimation
    // In a real implementation, you'd use proper compression analysis
    const entropy = this.calculateEntropy(fileData.slice(0, 1024));
    return entropy / 8; // Normalize to 0-1 range
  }

  private calculateEntropy(data: Buffer): number {
    const frequency: Record<number, number> = {};
    
    for (let i = 0; i < data.length; i++) {
      const byte = data[i];
      frequency[byte] = (frequency[byte] || 0) + 1;
    }
    
    let entropy = 0;
    const length = data.length;
    
    for (const count of Object.values(frequency)) {
      const probability = count / length;
      entropy -= probability * Math.log2(probability);
    }
    
    return entropy;
  }

  private categorizeSizeSize(sizeBytes: number): string {
    if (sizeBytes < 1024) return 'tiny';
    if (sizeBytes < 1024 * 1024) return 'small';
    if (sizeBytes < 10 * 1024 * 1024) return 'medium';
    if (sizeBytes < 100 * 1024 * 1024) return 'large';
    return 'huge';
  }
} 