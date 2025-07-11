/**
 * Document Asset Extractor - Real Aspose.Slides Implementation
 * 
 * Extracts real embedded documents from PowerPoint presentations using the local Aspose.Slides library.
 * Processes OLE objects, embedded files, and linked documents.
 */

import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../../../utils/logger';
import {
  DocumentExtractor,
  AssetResult,
  AssetType,
  AssetFormat,
  AssetExtractionOptions,
  AssetMetadata,
  ExtractionMethod
} from '../../types/asset-interfaces';

// Import local Aspose.Slides library
const aspose = require('/app/lib/aspose.slides.js');

export class DocumentAssetExtractor implements DocumentExtractor {
  readonly name = 'DocumentAssetExtractor';
  readonly supportedTypes: AssetType[] = ['document'];
  readonly supportedFormats: AssetFormat[] = [
    'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt'
  ];

  async extractAssets(
    presentation: any,
    options: AssetExtractionOptions
  ): Promise<AssetResult[]> {
    const startTime = Date.now();
    const assets: AssetResult[] = [];
    
    try {
      logger.info('Starting real document extraction with Aspose.Slides', {
        extractorName: this.name,
        slideCount: presentation.getSlides().getCount()
      });

      const slideCount = presentation.getSlides().getCount();
      
      // Process ALL slides - never limit slides
      for (let slideIndex = 0; slideIndex < slideCount; slideIndex++) {
        const slide = presentation.getSlides().get_Item(slideIndex);
        
        // Skip slide range filtering if specified
        if (options.slideRange) {
          if (slideIndex < options.slideRange.start || slideIndex > options.slideRange.end) {
            continue;
          }
        }
        
        const slideAssets = await this.extractDocumentsFromSlide(slide, slideIndex, options);
        assets.push(...slideAssets);
        
        // Log progress for large presentations
        if (slideIndex % 50 === 0) {
          logger.info('Document extraction progress', { 
            slideIndex, 
            totalSlides: slideCount, 
            documentsFound: assets.length 
          });
        }
      }

      const processingTime = Date.now() - startTime;
      logger.info('Document extraction completed', {
        totalSlides: slideCount,
        documentsFound: assets.length,
        processingTimeMs: processingTime
      });

      return assets;

    } catch (error) {
      logger.error('Document extraction failed', { 
        error: (error as Error).message,
        extractorName: this.name
      });
      throw new Error(`Document extraction failed: ${(error as Error).message}`);
    }
  }

  private async extractDocumentsFromSlide(
    slide: any,
    slideIndex: number,
    options: AssetExtractionOptions
  ): Promise<AssetResult[]> {
    const assets: AssetResult[] = [];

    try {
      const shapes = slide.getShapes();
      const shapeCount = shapes.getCount();

      // Extract documents from all shapes in the slide
      for (let shapeIndex = 0; shapeIndex < shapeCount; shapeIndex++) {
        const shape = shapes.get_Item(shapeIndex);
        
        // Check if shape is an OLE object (embedded document)
        if (this.isOleObject(shape)) {
          const documentAsset = await this.extractFromOleObject(shape, slideIndex);
          if (documentAsset) assets.push(documentAsset);
        }
        
        // Check for embedded files
        if (this.isEmbeddedFile(shape)) {
          const embeddedAsset = await this.extractFromEmbeddedFile(shape, slideIndex);
          if (embeddedAsset) assets.push(embeddedAsset);
        }
        
        // Check for grouped shapes that might contain documents
        if (shape.getShapeType() === aspose.ShapeType.GroupShape) {
          const groupAssets = await this.extractFromGroupShape(shape, slideIndex, options);
          assets.push(...groupAssets);
        }
      }

    } catch (error) {
      logger.warn('Failed to extract documents from slide', { 
        slideIndex, 
        error: (error as Error).message 
      });
    }

    return assets;
  }

  async extractFromOleObject(oleObject: any, slideIndex: number): Promise<AssetResult | null> {
    try {
      // Check if this is actually an OLE object
      if (!this.isOleObject(oleObject)) {
        return null;
      }

      const documentData = this.getOleObjectData(oleObject);
      
      if (!documentData || documentData.length === 0) {
        logger.warn('No document data found in OLE object', { slideIndex });
        return null;
      }

      const assetId = uuidv4();
      const documentBuffer = Buffer.from(documentData);
      
      // Detect document format from binary data and OLE object info
      const format = this.detectDocumentFormat(documentBuffer, oleObject);
      const filename = `document-ole-slide-${slideIndex}-${assetId}.${format}`;
      
      // Generate comprehensive metadata
      const metadata = await this.generateDocumentMetadata(
        oleObject, 
        slideIndex, 
        'aspose-embedded',
        documentBuffer
      );

      const asset: AssetResult = {
        id: assetId,
        type: 'document',
        format: format as AssetFormat,
        filename,
        originalName: this.getOleObjectName(oleObject) || filename,
        size: documentBuffer.length,
        slideIndex,
        data: documentBuffer,
        metadata
      };

      return asset;

    } catch (error) {
      logger.warn('Failed to extract OLE object', { 
        slideIndex, 
        error: (error as Error).message 
      });
      return null;
    }
  }

  async extractFromEmbeddedFile(embeddedFile: any, slideIndex: number): Promise<AssetResult | null> {
    try {
      // Check if this is actually an embedded file
      if (!this.isEmbeddedFile(embeddedFile)) {
        return null;
      }

      const fileData = this.getEmbeddedFileData(embeddedFile);
      
      if (!fileData || fileData.length === 0) {
        logger.warn('No file data found in embedded file', { slideIndex });
        return null;
      }

      const assetId = uuidv4();
      const fileBuffer = Buffer.from(fileData);
      
      // Detect document format from binary data and embedded file info
      const format = this.detectDocumentFormat(fileBuffer, embeddedFile);
      const filename = `document-embedded-slide-${slideIndex}-${assetId}.${format}`;
      
      // Generate comprehensive metadata
      const metadata = await this.generateDocumentMetadata(
        embeddedFile, 
        slideIndex, 
        'aspose-embedded',
        fileBuffer
      );

      const asset: AssetResult = {
        id: assetId,
        type: 'document',
        format: format as AssetFormat,
        filename,
        originalName: this.getEmbeddedFileName(embeddedFile) || filename,
        size: fileBuffer.length,
        slideIndex,
        data: fileBuffer,
        metadata
      };

      return asset;

    } catch (error) {
      logger.warn('Failed to extract embedded file', { 
        slideIndex, 
        error: (error as Error).message 
      });
      return null;
    }
  }

  validateAsset(asset: any): boolean {
    try {
      return (this.isOleObject(asset) || this.isEmbeddedFile(asset)) && 
             (this.getOleObjectData(asset) || this.getEmbeddedFileData(asset)) &&
             (this.getOleObjectData(asset) || this.getEmbeddedFileData(asset)).length > 0;
    } catch {
      return false;
    }
  }

  generateMetadata(asset: any, slideIndex: number): AssetMetadata {
    return {
      extractedAt: new Date().toISOString(),
      extractionMethod: 'aspose-embedded' as ExtractionMethod,
      hasData: true,
      slideId: slideIndex.toString()
    };
  }

  private isOleObject(shape: any): boolean {
    try {
      // Check if shape has OLE object properties
      return shape && (
        shape.getShapeType() === aspose.ShapeType.OleObjectFrame ||
        (shape.hasOleObject && shape.hasOleObject()) ||
        (shape.getOleObjectFrame && shape.getOleObjectFrame())
      );
    } catch {
      return false;
    }
  }

  private isEmbeddedFile(shape: any): boolean {
    try {
      // Check if shape has embedded file properties
      return shape && (
        (shape.hasEmbeddedFile && shape.hasEmbeddedFile()) ||
        (shape.getEmbeddedFile && shape.getEmbeddedFile()) ||
        (shape.getObjectData && shape.getObjectData())
      );
    } catch {
      return false;
    }
  }

  private getOleObjectData(oleObject: any): any {
    try {
      // Try different methods to get OLE object data based on Aspose.Slides API
      if (oleObject.getOleObjectFrame) {
        const oleFrame = oleObject.getOleObjectFrame();
        if (oleFrame && oleFrame.getObjectData) {
          return oleFrame.getObjectData();
        }
      }
      
      if (oleObject.getObjectData) {
        return oleObject.getObjectData();
      }

      if (oleObject.getEmbeddedData) {
        return oleObject.getEmbeddedData();
      }

      // Alternative method for getting binary data
      if (oleObject.getBinaryData) {
        return oleObject.getBinaryData();
      }

      return null;

    } catch (error) {
      logger.warn('Failed to get OLE object data', { error: (error as Error).message });
      return null;
    }
  }

  private getEmbeddedFileData(embeddedFile: any): any {
    try {
      // Try different methods to get embedded file data
      if (embeddedFile.getEmbeddedFile) {
        const file = embeddedFile.getEmbeddedFile();
        if (file && file.getData) {
          return file.getData();
        }
      }
      
      if (embeddedFile.getFileData) {
        return embeddedFile.getFileData();
      }

      if (embeddedFile.getData) {
        return embeddedFile.getData();
      }

      if (embeddedFile.getBinaryData) {
        return embeddedFile.getBinaryData();
      }

      return null;

    } catch (error) {
      logger.warn('Failed to get embedded file data', { error: (error as Error).message });
      return null;
    }
  }

  private getOleObjectName(oleObject: any): string | null {
    try {
      // Try to get the original OLE object name
      if (oleObject.getName) {
        return oleObject.getName();
      }
      
      if (oleObject.getOleObjectFrame) {
        const oleFrame = oleObject.getOleObjectFrame();
        if (oleFrame && oleFrame.getObjectName) {
          return oleFrame.getObjectName();
        }
      }

      if (oleObject.getObjectName) {
        return oleObject.getObjectName();
      }

      return null;

    } catch {
      return null;
    }
  }

  private getEmbeddedFileName(embeddedFile: any): string | null {
    try {
      // Try to get the original embedded file name
      if (embeddedFile.getName) {
        return embeddedFile.getName();
      }
      
      if (embeddedFile.getEmbeddedFile) {
        const file = embeddedFile.getEmbeddedFile();
        if (file && file.getName) {
          return file.getName();
        }
      }

      if (embeddedFile.getFileName) {
        return embeddedFile.getFileName();
      }

      return null;

    } catch {
      return null;
    }
  }

  private async extractFromGroupShape(
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
        
        if (this.isOleObject(shape)) {
          const oleAsset = await this.extractFromOleObject(shape, slideIndex);
          if (oleAsset) assets.push(oleAsset);
        }
        
        if (this.isEmbeddedFile(shape)) {
          const embeddedAsset = await this.extractFromEmbeddedFile(shape, slideIndex);
          if (embeddedAsset) assets.push(embeddedAsset);
        }
        
        // Recursively check nested group shapes
        if (shape.getShapeType() === aspose.ShapeType.GroupShape) {
          const nestedAssets = await this.extractFromGroupShape(shape, slideIndex, options);
          assets.push(...nestedAssets);
        }
      }

    } catch (error) {
      logger.warn('Failed to extract documents from group shape', { 
        slideIndex, 
        error: (error as Error).message 
      });
    }

    return assets;
  }

  private async generateDocumentMetadata(
    source: any,
    slideIndex: number,
    method: ExtractionMethod,
    documentBuffer: Buffer
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

      // Extract MIME type from document data
      metadata.mimeType = this.getMimeTypeFromBuffer(documentBuffer);
      
      // Add document-specific metadata
      try {
        const format = this.detectDocumentFormat(documentBuffer, source);
        metadata.quality = {
          compression: format,
          quality: 'medium'
        };

        // Estimate page count for certain document types
        if (['pdf', 'doc', 'docx'].includes(format)) {
          metadata.pages = this.estimatePageCount(documentBuffer);
        }

        // Estimate word count for text documents
        if (['doc', 'docx', 'txt'].includes(format)) {
          metadata.wordCount = this.estimateWordCount(documentBuffer);
        }

      } catch (err) {
        // Ignore document analysis errors
      }

      metadata.processingTimeMs = Date.now() - startTime;
      
      return metadata;

    } catch (error) {
      logger.warn('Failed to generate document metadata', { 
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

  private detectDocumentFormat(buffer: Buffer, source?: any): string {
    // Detect document format from file signature
    if (buffer.length < 8) return 'bin';
    
    const signature = buffer.toString('hex', 0, 8).toUpperCase();
    
    // PDF signature
    if (signature.startsWith('25504446')) return 'pdf';
    
    // Office document signatures
    if (signature.startsWith('504B0304')) {
      // ZIP-based Office documents
      const content = buffer.toString('utf8', 0, Math.min(1024, buffer.length));
      if (content.includes('word/')) return 'docx';
      if (content.includes('xl/')) return 'xlsx';
      if (content.includes('ppt/')) return 'pptx';
      return 'docx'; // Default to docx for ZIP-based documents
    }
    
    // Legacy Office documents (OLE compound documents)
    if (signature.startsWith('D0CF11E0')) {
      // Try to determine type from OLE object info
      if (source && source.getObjectName) {
        const name = source.getObjectName();
        if (name && name.toLowerCase().includes('word')) return 'doc';
        if (name && name.toLowerCase().includes('excel')) return 'xls';
        if (name && name.toLowerCase().includes('powerpoint')) return 'ppt';
      }
      return 'doc'; // Default to doc for OLE documents
    }
    
    // Plain text
    if (this.isPlainText(buffer)) return 'txt';
    
    return 'pdf'; // Default fallback
  }

  private isPlainText(buffer: Buffer): boolean {
    // Simple check for plain text content
    const sample = buffer.toString('utf8', 0, Math.min(256, buffer.length));
    const nonPrintableCount = sample.split('').filter(char => {
      const code = char.charCodeAt(0);
      return code < 32 && code !== 9 && code !== 10 && code !== 13;
    }).length;
    
    return nonPrintableCount / sample.length < 0.1; // Less than 10% non-printable characters
  }

  private getMimeTypeFromBuffer(buffer: Buffer): string {
    const format = this.detectDocumentFormat(buffer);
    
    const mimeTypes: Record<string, string> = {
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'ppt': 'application/vnd.ms-powerpoint',
      'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'txt': 'text/plain'
    };
    
    return mimeTypes[format] || 'application/octet-stream';
  }

  private estimatePageCount(buffer: Buffer): number {
    // Basic page count estimation (would need proper document parsing in real implementation)
    const sizeInKB = buffer.length / 1024;
    return Math.max(1, Math.round(sizeInKB / 50)); // Rough estimate: 50KB per page
  }

  private estimateWordCount(buffer: Buffer): number {
    // Basic word count estimation for text-based documents
    try {
      const text = buffer.toString('utf8');
      const words = text.split(/\s+/).filter(word => word.length > 0);
      return words.length;
    } catch {
      // For binary documents, estimate based on size
      const sizeInKB = buffer.length / 1024;
      return Math.round(sizeInKB * 250); // Rough estimate: 250 words per KB
    }
  }
} 