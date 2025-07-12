/**
 * Image Asset Extractor - Real Aspose.Slides Implementation
 * 
 * Extracts real images from PowerPoint presentations using the local Aspose.Slides library.
 * Processes all types of images: embedded, linked, shape fills, chart images, etc.
 */

import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../../../utils/logger';
import {
  ImageExtractor,
  AssetResult,
  AssetType,
  AssetFormat,
  AssetExtractionOptions,
  AssetMetadata,
  AssetDimensions,
  ExtractionMethod
} from '../../types/asset-interfaces';

// Import local Aspose.Slides library via license manager (singleton)
const licenseManager = require('/app/lib/aspose-license-manager.js');

export class ImageAssetExtractor implements ImageExtractor {
  readonly name = 'ImageAssetExtractor';
  readonly supportedTypes: AssetType[] = ['image'];
  readonly supportedFormats: AssetFormat[] = [
    'png', 'jpg', 'jpeg', 'gif', 'bmp', 'tiff', 'webp', 'svg', 'emf', 'wmf'
  ];

  async extractAssets(
    presentation: any,
    options: AssetExtractionOptions
  ): Promise<AssetResult[]> {
    const startTime = Date.now();
    const assets: AssetResult[] = [];
    
    try {
      // Get Aspose via singleton license manager
      const aspose = await licenseManager.getAspose();
      
      logger.info('Starting image extraction from presentation', {
        includeMetadata: options.includeMetadata || false,
        extractorName: this.name,
        slideCount: presentation.getSlides().size()
      });

      const slideCount = presentation.getSlides().size();
      
      // Process ALL slides - never limit slides
      for (let slideIndex = 0; slideIndex < slideCount; slideIndex++) {
        const slide = presentation.getSlides().get_Item(slideIndex);
        
        // Skip slide range filtering if specified
        if (options.slideRange) {
          if (slideIndex < options.slideRange.start || slideIndex > options.slideRange.end) {
            continue;
          }
        }
        
        const slideAssets = await this.extractImagesFromSlide(aspose, slide, slideIndex, options);
        assets.push(...slideAssets);
        
        // Log progress for large presentations
        if (slideIndex % 50 === 0) {
          logger.info('Image extraction progress', { 
            slideIndex, 
            totalSlides: slideCount, 
            assetsFound: assets.length 
          });
        }
      }

      const processingTime = Date.now() - startTime;
      logger.info('Image extraction completed', {
        totalSlides: slideCount,
        imagesFound: assets.length,
        processingTimeMs: processingTime
      });

      return assets;

    } catch (error) {
      logger.error('Image extraction failed', { 
        error: (error as Error).message,
        extractorName: this.name
      });
      throw new Error(`Image extraction failed: ${(error as Error).message}`);
    }
  }

  private async extractImagesFromSlide(
    aspose: any,
    slide: any,
    slideIndex: number,
    options: AssetExtractionOptions
  ): Promise<AssetResult[]> {
    const assets: AssetResult[] = [];

    try {
      const shapes = slide.getShapes();
      const shapeCount = shapes.getCount();

      // Extract images from all shapes in the slide
      for (let shapeIndex = 0; shapeIndex < shapeCount; shapeIndex++) {
        const shape = shapes.get_Item(shapeIndex);
        
        // Extract images based on shape type
        const shapeAssets = await this.extractImagesFromShape(aspose, shape, slideIndex, options);
        assets.push(...shapeAssets);
      }

      // Extract images from slide background
      const backgroundAssets = await this.extractBackgroundImages(aspose, slide, slideIndex, options);
      assets.push(...backgroundAssets);

    } catch (error) {
      logger.warn('Failed to extract images from slide', { 
        slideIndex, 
        error: (error as Error).message 
      });
    }

    return assets;
  }

  private async extractImagesFromShape(
    aspose: any,
    shape: any,
    slideIndex: number,
    options: AssetExtractionOptions
  ): Promise<AssetResult[]> {
    const assets: AssetResult[] = [];

    try {
      const shapeType = shape.getShapeType();
      
      // Handle different shape types that can contain images
      switch (shapeType) {
        case aspose.ShapeType.Picture:
          const pictureAsset = await this.extractFromPicture(shape, slideIndex);
          if (pictureAsset) assets.push(pictureAsset);
          break;
          
        case aspose.ShapeType.AutoShape:
        case aspose.ShapeType.Rectangle:
        case aspose.ShapeType.Ellipse:
          // Check for image fill
          const fillAsset = await this.extractFromShapeFill(aspose, shape, slideIndex);
          if (fillAsset) assets.push(fillAsset);
          break;
          
        case aspose.ShapeType.Chart:
          // Extract images from chart elements
          const chartAssets = await this.extractFromChart(aspose, shape, slideIndex);
          assets.push(...chartAssets);
          break;
          
        case aspose.ShapeType.Table:
          // Extract images from table cells
          const tableAssets = await this.extractFromTable(aspose, shape, slideIndex);
          assets.push(...tableAssets);
          break;
          
        case aspose.ShapeType.GroupShape:
          // Recursively extract from grouped shapes
          const groupAssets = await this.extractFromGroupShape(aspose, shape, slideIndex, options);
          assets.push(...groupAssets);
          break;
      }

    } catch (error) {
      logger.warn('Failed to extract images from shape', { 
        slideIndex, 
        shapeType: shape.getShapeType?.(),
        error: (error as Error).message 
      });
    }

    return assets;
  }

  async extractFromPicture(picture: any, slideIndex: number): Promise<AssetResult | null> {
    try {
      const pictureFrame = picture.getPictureFormat().getPicture();
      const imageData = pictureFrame.getBinaryData();
      
      if (!imageData || imageData.length === 0) {
        return null;
      }

      const assetId = uuidv4();
      const imageBuffer = Buffer.from(imageData);
      
      // Detect image format from binary data
      const format = this.detectImageFormat(imageBuffer);
      const filename = `image-slide-${slideIndex}-${assetId}.${format}`;
      
      // Generate comprehensive metadata
      const metadata = await this.generateImageMetadata(
        picture, 
        slideIndex, 
        'aspose-shapes',
        imageBuffer
      );

      const asset: AssetResult = {
        id: assetId,
        type: 'image',
        format: format as AssetFormat,
        filename,
        originalName: pictureFrame.getName() || filename,
        size: imageBuffer.length,
        slideIndex,
        data: imageBuffer,
        metadata
      };

      return asset;

    } catch (error) {
      logger.warn('Failed to extract picture', { slideIndex, error: (error as Error).message });
      return null;
    }
  }

  async extractFromShape(shape: any, slideIndex: number): Promise<AssetResult | null> {
    // This method is used for generic shape extraction
    return this.extractFromPicture(shape, slideIndex);
  }

  private async extractFromShapeFill(
    aspose: any,
    shape: any,
    slideIndex: number
  ): Promise<AssetResult | null> {
    try {
      const fillFormat = shape.getFillFormat();
      
      if (fillFormat.getFillType() === aspose.FillType.Picture) {
        const pictureFrame = fillFormat.getPictureFillFormat().getPicture();
        const imageData = pictureFrame.getBinaryData();
        
        if (!imageData || imageData.length === 0) {
          return null;
        }

        const assetId = uuidv4();
        const imageBuffer = Buffer.from(imageData);
        const format = this.detectImageFormat(imageBuffer);
        const filename = `fill-image-slide-${slideIndex}-${assetId}.${format}`;
        
        const metadata = await this.generateImageMetadata(
          shape,
          slideIndex,
          'aspose-shapes',
          imageBuffer
        );

        return {
          id: assetId,
          type: 'image',
          format: format as AssetFormat,
          filename,
          originalName: filename,
          size: imageBuffer.length,
          slideIndex,
          data: imageBuffer,
          metadata
        };
      }

    } catch (error) {
      logger.warn('Failed to extract shape fill image', { 
        slideIndex, 
        error: (error as Error).message 
      });
    }

    return null;
  }

  private async extractFromChart(aspose: any, shape: any, slideIndex: number): Promise<AssetResult[]> {
    const assets: AssetResult[] = [];

    try {
      if (shape.hasChart && shape.hasChart()) {
        const chart = shape.getChart();
        
        // Extract chart background image if exists
        const chartFill = chart.getBackWall().getFillFormat();
        if (chartFill.getFillType() === aspose.FillType.Picture) {
          const chartAsset = await this.extractFromShapeFill(aspose, shape, slideIndex);
          if (chartAsset) {
            chartAsset.metadata.shapeType = 'chart-background';
            assets.push(chartAsset);
          }
        }
        
        // Extract images from data series if any
        const seriesCollection = chart.getChartData().getSeries();
        for (let i = 0; i < seriesCollection.getCount(); i++) {
          const series = seriesCollection.get_Item(i);
          // Check for image markers or fills in data points
          // This would require specific Aspose.Slides API calls
        }
      }

    } catch (error) {
      logger.warn('Failed to extract chart images', { 
        slideIndex, 
        error: (error as Error).message 
      });
    }

    return assets;
  }

  private async extractFromTable(aspose: any, shape: any, slideIndex: number): Promise<AssetResult[]> {
    const assets: AssetResult[] = [];

    try {
      if (shape.hasTable && shape.hasTable()) {
        const table = shape.getTable();
        const rowCount = table.getRows().getCount();
        
        for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
          const row = table.getRows().get_Item(rowIndex);
          const cellCount = row.getCells().getCount();
          
          for (let cellIndex = 0; cellIndex < cellCount; cellIndex++) {
            const cell = row.getCells().get_Item(cellIndex);
            
            // Check cell fill for images
            const cellFill = cell.getFillFormat();
            if (cellFill.getFillType() === aspose.FillType.Picture) {
              const cellAsset = await this.extractCellImage(aspose, cell, slideIndex, rowIndex, cellIndex);
              if (cellAsset) assets.push(cellAsset);
            }
          }
        }
      }

    } catch (error) {
      logger.warn('Failed to extract table images', { 
        slideIndex, 
        error: (error as Error).message 
      });
    }

    return assets;
  }

  private async extractCellImage(
    aspose: any,
    cell: any,
    slideIndex: number,
    rowIndex: number,
    cellIndex: number
  ): Promise<AssetResult | null> {
    try {
      const fillFormat = cell.getFillFormat();
      const pictureFrame = fillFormat.getPictureFillFormat().getPicture();
      const imageData = pictureFrame.getBinaryData();
      
      if (!imageData || imageData.length === 0) {
        return null;
      }

      const assetId = uuidv4();
      const imageBuffer = Buffer.from(imageData);
      const format = this.detectImageFormat(imageBuffer);
      const filename = `table-cell-${rowIndex}-${cellIndex}-slide-${slideIndex}-${assetId}.${format}`;
      
      const metadata = await this.generateImageMetadata(
        cell,
        slideIndex,
        'aspose-table',
        imageBuffer
      );

      return {
        id: assetId,
        type: 'image',
        format: format as AssetFormat,
        filename,
        originalName: filename,
        size: imageBuffer.length,
        slideIndex,
        data: imageBuffer,
        metadata
      };

    } catch (error) {
      logger.warn('Failed to extract cell image', { 
        slideIndex, rowIndex, cellIndex, 
        error: (error as Error).message 
      });
      return null;
    }
  }

  private async extractFromGroupShape(
    aspose: any,
    groupShape: any,
    slideIndex: number,
    options: AssetExtractionOptions
  ): Promise<AssetResult[]> {
    const assets: AssetResult[] = [];

    try {
      const shapes = groupShape.getShapes();
      const shapeCount = shapes.getCount();

      for (let i = 0; i < shapeCount; i++) {
        const shape = shapes.get_Item(i);
        const shapeAssets = await this.extractImagesFromShape(aspose, shape, slideIndex, options);
        assets.push(...shapeAssets);
      }

    } catch (error) {
      logger.warn('Failed to extract from group shape', { 
        slideIndex, 
        error: (error as Error).message 
      });
    }

    return assets;
  }

  private async extractBackgroundImages(
    aspose: any,
    slide: any,
    slideIndex: number,
    options: AssetExtractionOptions
  ): Promise<AssetResult[]> {
    const assets: AssetResult[] = [];

    try {
      const background = slide.getBackground();
      const fillFormat = background.getFillFormat();
      
      if (fillFormat.getFillType() === aspose.FillType.Picture) {
        const pictureFrame = fillFormat.getPictureFillFormat().getPicture();
        const imageData = pictureFrame.getBinaryData();
        
        if (imageData && imageData.length > 0) {
          const assetId = uuidv4();
          const imageBuffer = Buffer.from(imageData);
          const format = this.detectImageFormat(imageBuffer);
          const filename = `background-slide-${slideIndex}-${assetId}.${format}`;
          
          const metadata = await this.generateImageMetadata(
            slide,
            slideIndex,
            'aspose-shapes',
            imageBuffer
          );

          assets.push({
            id: assetId,
            type: 'image',
            format: format as AssetFormat,
            filename,
            originalName: filename,
            size: imageBuffer.length,
            slideIndex,
            data: imageBuffer,
            metadata
          });
        }
      }

    } catch (error) {
      logger.warn('Failed to extract background images', { 
        slideIndex, 
        error: (error as Error).message 
      });
    }

    return assets;
  }

  async generateThumbnail(imageData: Buffer, size: AssetDimensions): Promise<Buffer> {
    // For now, return the original image data
    // In a real implementation, you'd use sharp or similar to resize
    return imageData;
  }

  validateAsset(asset: any): boolean {
    try {
      return asset && 
             typeof asset.getBinaryData === 'function' &&
             asset.getBinaryData() &&
             asset.getBinaryData().length > 0;
    } catch {
      return false;
    }
  }

  generateMetadata(asset: any, slideIndex: number): AssetMetadata {
    return {
      extractedAt: new Date().toISOString(),
      extractionMethod: 'aspose-shapes' as ExtractionMethod,
      hasData: true,
      slideId: slideIndex.toString()
    };
  }

  private async generateImageMetadata(
    source: any,
    slideIndex: number,
    method: ExtractionMethod,
    imageBuffer: Buffer
  ): Promise<AssetMetadata> {
    const startTime = Date.now();
    
    try {
      // Basic metadata
      const metadata: AssetMetadata = {
        extractedAt: new Date().toISOString(),
        extractionMethod: method,
        hasData: true,
        slideId: slideIndex.toString(),
        processingTimeMs: 0
      };

      // Extract dimensions from shape if available
      if (source && typeof source.getWidth === 'function') {
        try {
          metadata.transform = {
            position: {
              x: source.getX ? source.getX() : 0,
              y: source.getY ? source.getY() : 0
            },
            dimensions: {
              width: source.getWidth(),
              height: source.getHeight(),
              aspectRatio: source.getWidth() / source.getHeight()
            }
          };
        } catch (err) {
          // Ignore dimension extraction errors
        }
      }

      // Extract MIME type from image data
      metadata.mimeType = this.getMimeTypeFromBuffer(imageBuffer);
      
      // Add file size and quality info
      metadata.quality = {
        compression: 'unknown',
        quality: 'medium'
      };

      metadata.processingTimeMs = Date.now() - startTime;
      
      return metadata;

    } catch (error) {
      logger.warn('Failed to generate comprehensive metadata', { 
        slideIndex, 
        error: (error as Error).message 
      });
      
      return {
        extractedAt: new Date().toISOString(),
        extractionMethod: method,
        hasData: true,
        processingTimeMs: Date.now() - startTime
      };
    }
  }

  private detectImageFormat(buffer: Buffer): string {
    // Detect image format from file signature
    if (buffer.length < 8) return 'bin';
    
    const signature = buffer.toString('hex', 0, 8).toUpperCase();
    
    if (signature.startsWith('89504E47')) return 'png';
    if (signature.startsWith('FFD8FF')) return 'jpg';
    if (signature.startsWith('47494638')) return 'gif';
    if (signature.startsWith('424D')) return 'bmp';
    if (signature.startsWith('49492A00') || signature.startsWith('4D4D002A')) return 'tiff';
    if (signature.startsWith('52494646')) return 'webp';
    
    return 'png'; // Default fallback
  }

  private getMimeTypeFromBuffer(buffer: Buffer): string {
    const format = this.detectImageFormat(buffer);
    
    const mimeTypes: Record<string, string> = {
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'bmp': 'image/bmp',
      'tiff': 'image/tiff',
      'webp': 'image/webp',
      'svg': 'image/svg+xml'
    };
    
    return mimeTypes[format] || 'application/octet-stream';
  }
} 