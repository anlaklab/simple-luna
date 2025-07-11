/**
 * Asset Extraction System - Comprehensive Interfaces
 * 
 * Defines all interfaces and types for the modular asset extraction system
 * that uses real Aspose.Slides library and Firebase integration.
 */

// =============================================================================
// CORE ASSET TYPES
// =============================================================================

export type AssetType = 'image' | 'video' | 'audio' | 'document' | 'shape' | 'chart';

export type AssetFormat = 
  // Images
  | 'png' | 'jpg' | 'jpeg' | 'gif' | 'bmp' | 'tiff' | 'webp' | 'svg' | 'emf' | 'wmf'
  // Videos  
  | 'mp4' | 'avi' | 'mov' | 'wmv' | 'flv' | 'webm' | 'mkv'
  // Audio
  | 'mp3' | 'wav' | 'aac' | 'ogg' | 'm4a' | 'wma' | 'flac'
  // Documents
  | 'pdf' | 'doc' | 'docx' | 'xls' | 'xlsx' | 'ppt' | 'pptx' | 'txt';

export type ExtractionMethod = 
  | 'aspose-shapes' 
  | 'aspose-media' 
  | 'aspose-embedded' 
  | 'aspose-linked'
  | 'aspose-chart'
  | 'aspose-table';

// =============================================================================
// DETAILED METADATA INTERFACES
// =============================================================================

export interface AssetDimensions {
  width: number;
  height: number;
  aspectRatio: number;
}

export interface AssetPosition {
  x: number;
  y: number;
  z?: number; // Z-index for layered assets
}

export interface AssetTransform {
  position: AssetPosition;
  dimensions: AssetDimensions;
  rotation?: number;
  scaleX?: number;
  scaleY?: number;
}

export interface AssetStyle {
  opacity?: number;
  brightness?: number;
  contrast?: number;
  saturation?: number;
  effects?: string[];
  filters?: Record<string, any>;
}

export interface AssetQuality {
  resolution?: number; // DPI for images
  bitrate?: number; // For video/audio
  colorDepth?: number;
  compression?: string;
  quality?: 'low' | 'medium' | 'high' | 'lossless';
}

export interface AssetMetadata {
  // Basic metadata
  extractedAt: string;
  extractionMethod: ExtractionMethod;
  hasData: boolean;
  
  // File properties
  originalPath?: string;
  mimeType?: string;
  encoding?: string;
  
  // Visual properties (for images/videos)
  transform?: AssetTransform;
  style?: AssetStyle;
  quality?: AssetQuality;
  
  // Media-specific metadata
  duration?: number; // For video/audio in seconds
  frameRate?: number; // For videos
  channels?: number; // For audio
  sampleRate?: number; // For audio
  
  // Document-specific metadata
  pages?: number;
  wordCount?: number;
  
  // Aspose-specific metadata
  shapeId?: string;
  shapeType?: string;
  slideId?: string;
  parentGroupId?: string;
  
  // Relationships
  linkedAssets?: string[]; // IDs of related assets
  dependencies?: string[]; // Assets this asset depends on
  
  // Processing metadata
  processingTimeMs?: number;
  errorCount?: number;
  warnings?: string[];
  
  // Custom properties
  customProperties?: Record<string, any>;
}

// =============================================================================
// ASSET RESULT INTERFACE
// =============================================================================

export interface AssetResult {
  // Core identification
  id: string;
  type: AssetType;
  format: AssetFormat;
  
  // File information
  filename: string;
  originalName: string;
  size: number;
  
  // Location information
  slideIndex: number;
  presentationId?: string;
  
  // Content (based on options)
  data?: Buffer;
  base64?: string;
  url?: string;
  
  // Storage information
  firebaseUrl?: string;
  firebasePath?: string;
  localPath?: string;
  
  // Comprehensive metadata
  metadata: AssetMetadata;
  
  // Thumbnail information
  thumbnail?: {
    url?: string;
    base64?: string;
    size: number;
  };
}

// =============================================================================
// EXTRACTION OPTIONS
// =============================================================================

export interface AssetExtractionOptions {
  // Asset type filtering
  assetTypes?: AssetType[];
  formats?: AssetFormat[];
  
  // Return format
  returnFormat?: 'urls' | 'base64' | 'buffers' | 'firebase-urls';
  
  // Processing options
  extractThumbnails?: boolean;
  thumbnailSize?: AssetDimensions;
  generatePreviews?: boolean;
  
  // Quality options
  preserveOriginalQuality?: boolean;
  imageQuality?: number; // 0-100
  videoQuality?: 'low' | 'medium' | 'high';
  
  // Filtering options
  minFileSize?: number;
  maxFileSize?: number;
  slideRange?: { start: number; end: number };
  
  // Metadata options
  includeMetadata?: boolean;
  includeTransforms?: boolean;
  includeStyles?: boolean;
  extractCustomProperties?: boolean;
  
  // Storage options
  saveToFirebase?: boolean;
  firebaseFolder?: string;
  makePublic?: boolean;
  generateDownloadUrls?: boolean;
  
  // Processing options
  preserveOriginalNames?: boolean;
  addTimestamp?: boolean;
  customNaming?: (asset: AssetResult) => string;
}

// =============================================================================
// EXTRACTOR INTERFACES
// =============================================================================

export interface BaseAssetExtractor {
  readonly name: string;
  readonly supportedTypes: AssetType[];
  readonly supportedFormats: AssetFormat[];
  
  extractAssets(
    presentation: any, // Aspose Presentation object
    options: AssetExtractionOptions
  ): Promise<AssetResult[]>;
  
  validateAsset(asset: any): boolean;
  generateMetadata(asset: any, slideIndex: number): AssetMetadata;
}

export interface ImageExtractor extends BaseAssetExtractor {
  extractFromShape(shape: any, slideIndex: number): Promise<AssetResult | null>;
  extractFromPicture(picture: any, slideIndex: number): Promise<AssetResult | null>;
  generateThumbnail(imageData: Buffer, size: AssetDimensions): Promise<Buffer>;
}

export interface VideoExtractor extends BaseAssetExtractor {
  extractFromVideoFrame(videoFrame: any, slideIndex: number): Promise<AssetResult | null>;
  extractMetadata(videoData: Buffer): Promise<Partial<AssetMetadata>>;
  generatePreview(videoData: Buffer): Promise<Buffer>;
}

export interface AudioExtractor extends BaseAssetExtractor {
  extractFromAudioFrame(audioFrame: any, slideIndex: number): Promise<AssetResult | null>;
  analyzeAudioProperties(audioData: Buffer): Promise<Partial<AssetMetadata>>;
}

export interface DocumentExtractor extends BaseAssetExtractor {
  extractFromOleObject(oleObject: any, slideIndex: number): Promise<AssetResult | null>;
  extractFromEmbeddedFile(embeddedFile: any, slideIndex: number): Promise<AssetResult | null>;
}

// =============================================================================
// SERVICE INTERFACES
// =============================================================================

export interface AssetMetadataService {
  generateComprehensiveMetadata(
    asset: any,
    slideIndex: number,
    extractionMethod: ExtractionMethod
  ): Promise<AssetMetadata>;
  
  enrichMetadata(
    metadata: AssetMetadata,
    fileData?: Buffer
  ): Promise<AssetMetadata>;
  
  validateMetadata(metadata: AssetMetadata): boolean;
}

export interface AssetStorageService {
  uploadAsset(
    assetData: Buffer,
    filename: string,
    metadata: AssetMetadata,
    options: AssetExtractionOptions
  ): Promise<{
    firebaseUrl: string;
    firebasePath: string;
    downloadUrl?: string;
  }>;
  
  uploadThumbnail(
    thumbnailData: Buffer,
    assetId: string,
    metadata: AssetMetadata
  ): Promise<{
    url: string;
    path: string;
  }>;
  
  generateSignedUrl(firebasePath: string, expirationMs?: number): Promise<string>;
}

export interface AssetMetadataRepository {
  saveAssetMetadata(
    assetId: string,
    asset: AssetResult,
    presentationId: string
  ): Promise<void>;
  
  getAssetMetadata(assetId: string): Promise<AssetResult | null>;
  
  getAssetsByPresentation(presentationId: string): Promise<AssetResult[]>;
  
  getAssetsByType(
    presentationId: string,
    assetType: AssetType
  ): Promise<AssetResult[]>;
  
  updateAssetMetadata(
    assetId: string,
    updates: Partial<AssetResult>
  ): Promise<void>;
  
  deleteAssetMetadata(assetId: string): Promise<void>;
  
  searchAssets(
    presentationId: string,
    query: {
      type?: AssetType;
      format?: AssetFormat;
      slideIndex?: number;
      namePattern?: string;
      sizeRange?: { min?: number; max?: number };
    }
  ): Promise<AssetResult[]>;
}

// =============================================================================
// MAIN SERVICE INTERFACE
// =============================================================================

export interface IAssetService {
  extractAssets(
    filePath: string,
    options?: AssetExtractionOptions
  ): Promise<AssetResult[]>;
  
  extractAssetsByType(
    filePath: string,
    assetType: AssetType,
    options?: AssetExtractionOptions
  ): Promise<AssetResult[]>;
  
  extractAssetsFromSlideRange(
    filePath: string,
    startSlide: number,
    endSlide: number,
    options?: AssetExtractionOptions
  ): Promise<AssetResult[]>;
  
  getAssetMetadata(assetId: string): Promise<AssetResult | null>;
  
  searchAssets(
    presentationId: string,
    query: Record<string, any>
  ): Promise<AssetResult[]>;
}

// =============================================================================
// CONFIGURATION INTERFACES
// =============================================================================

export interface AssetServiceConfig {
  aspose: {
    licenseFilePath?: string;
    tempDirectory?: string;
  };
  
  firebase: {
    projectId: string;
    privateKey: string;
    clientEmail: string;
    storageBucket: string;
  };
  
  storage: {
    defaultFolder: string;
    generateThumbnails: boolean;
    thumbnailSize: AssetDimensions;
    maxFileSize: number;
  };
  
  processing: {
    defaultImageQuality: number;
    enableParallelProcessing: boolean;
    maxConcurrentExtractions: number;
    timeoutMs: number;
  };
}

// =============================================================================
// UTILITY TYPES
// =============================================================================

export type AssetExtractorRegistry = Map<AssetType, BaseAssetExtractor>;

export interface ExtractionContext {
  presentationId: string;
  userId?: string;
  extractionId: string;
  startTime: number;
  options: AssetExtractionOptions;
}

export interface ExtractionResult {
  success: boolean;
  assets: AssetResult[];
  totalAssets: number;
  processingTimeMs: number;
  errors: string[];
  warnings: string[];
  context: ExtractionContext;
} 