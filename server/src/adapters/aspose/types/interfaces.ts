/**
 * Aspose Adapter Service Interfaces
 * 
 * Defines contracts for modular Aspose.Slides services
 */

// Import from existing schema - will be resolved during implementation

// =============================================================================
// PLACEHOLDER TYPES (to be replaced with actual imports)
// =============================================================================

export interface UniversalPresentation {
  metadata?: any;
  slides?: any[];
  [key: string]: any;
}

// =============================================================================
// CORE CONFIGURATION
// =============================================================================

export interface AsposeConfig {
  licenseFilePath?: string;
  tempDirectory?: string;
  maxFileSize?: number;
  enableLogging?: boolean;
  timeoutMs?: number;
}

// =============================================================================
// CONVERSION SERVICE INTERFACE
// =============================================================================

export interface ConversionOptions {
  includeAssets?: boolean;
  includeMetadata?: boolean;
  includeAnimations?: boolean;
  includeComments?: boolean;
  enableValidation?: boolean;
  preserveFormatting?: boolean;
  extractImages?: boolean; // Added for backward compatibility
  outputFormat?: 'pptx' | 'pptm' | 'pdf' | 'html' | 'png' | 'jpg' | 'jpeg' | 'svg' | 'bmp' | 'gif' | 'tiff'; // Expanded output formats
}

export interface ConversionResult {
  success: boolean;
  data?: {
    presentation?: UniversalPresentation;
    originalFilename?: string;
    processingStats?: ProcessingStats;
    slides?: any[]; // For backward compatibility
    slideSize?: any; // For backward compatibility
    documentProperties?: any; // For backward compatibility
    security?: any; // For backward compatibility
  };
  error?: string;
  processingTimeMs?: number;
  processingStats?: ProcessingStats; // Direct access for backward compatibility
}

export interface ProcessingStats {
  slideCount: number;
  shapeCount: number;
  animationCount: number;
  commentCount: number;
  assetCount: number;
  textLength: number;
  processingTimeMs: number;
  imageCount?: number; // For backward compatibility
  chartCount?: number; // For backward compatibility
  tableCount?: number; // For backward compatibility
}

export interface IConversionService {
  convertPptxToJson(filePath: string, options?: ConversionOptions): Promise<ConversionResult>;
  convertJsonToPptx(presentationData: UniversalPresentation, outputPath: string, options?: FileGenerationOptions): Promise<FileGenerationResult>;
  validateFile(filePath: string): Promise<boolean>;
  getFileStats(filePath: string): Promise<FileStats>;
}

// =============================================================================
// THUMBNAIL SERVICE INTERFACE
// =============================================================================

export interface ThumbnailOptions {
  slideIndices?: number[];
  size?: { width: number; height: number };
  format?: 'png' | 'jpg' | 'svg' | 'webp' | 'jpeg'; // Expanded format types
  quality?: 'low' | 'medium' | 'high' | 'ultra'; // Expanded quality types
  returnFormat?: 'base64' | 'urls' | 'buffers';
  uploadToStorage?: boolean;
  width?: number; // For backward compatibility
  height?: number; // For backward compatibility
  backgroundColor?: string; // For backward compatibility
  includeNotes?: boolean; // For backward compatibility
  strategy?: string; // For backward compatibility
}

export interface ThumbnailResult {
  slideIndex: number;
  thumbnail?: string | Buffer; // Made optional for backward compatibility
  format: string;
  size: { width: number; height: number };
  fileSize?: number;
  url?: string;
  buffer?: Buffer; // For backward compatibility
  slideId?: number; // For backward compatibility
  generatedAt?: Date; // For backward compatibility
  strategy?: string; // For backward compatibility
  presentationId?: string; // For backward compatibility
  id?: string; // For backward compatibility
  metadata?: Record<string, any>; // For backward compatibility
  createdAt?: Date; // For backward compatibility
}

export interface IThumbnailService {
  generateThumbnails(input: string | UniversalPresentation, options?: ThumbnailOptions): Promise<ThumbnailResult[]>;
  generateSingleThumbnail(slideIndex: number, input: string | UniversalPresentation, options?: ThumbnailOptions): Promise<ThumbnailResult>;
}

// =============================================================================
// ASSET SERVICE INTERFACE
// =============================================================================

export interface AssetOptions {
  assetTypes?: ('images' | 'videos' | 'audio' | 'documents')[];
  returnFormat?: 'base64' | 'urls' | 'buffers';
  generateThumbnails?: boolean;
  uploadToStorage?: boolean;
  preserveOriginalNames?: boolean;
}

export interface AssetResult {
  id: string;
  type: 'image' | 'video' | 'audio' | 'document';
  filename: string;
  originalName: string;
  size: number;
  format: string;
  slideIndex: number;
  data?: string | Buffer;
  url?: string;
  thumbnailUrl?: string;
  metadata?: Record<string, any>;
}

export interface IAssetService {
  extractAssets(filePath: string, options?: AssetOptions): Promise<AssetResult[]>;
  extractImageAssets(filePath: string, options?: AssetOptions): Promise<AssetResult[]>;
  extractVideoAssets(filePath: string, options?: AssetOptions): Promise<AssetResult[]>;
  extractAudioAssets(filePath: string, options?: AssetOptions): Promise<AssetResult[]>;
}

// =============================================================================
// METADATA SERVICE INTERFACE
// =============================================================================

export interface MetadataOptions {
  includeSystemProperties?: boolean;
  includeCustomProperties?: boolean;
  includeDocumentStatistics?: boolean;
  includeRevisionHistory?: boolean;
}

export interface DocumentMetadata {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string;
  comments?: string;
  category?: string;
  manager?: string;
  company?: string;
  createdBy?: string;
  lastModifiedBy?: string;
  creationTime?: Date;
  lastModifiedTime?: Date;
  lastPrintedTime?: Date;
  totalEditingTime?: number;
  revisionNumber?: number;
  slideCount?: number;
  wordCount?: number;
  characterCount?: number;
  customProperties?: Record<string, any>;
  applicationName?: string;
  applicationVersion?: string;
  documentSecurity?: string;
  template?: string;
}

export interface IMetadataService {
  extractMetadata(filePath: string, options?: MetadataOptions): Promise<DocumentMetadata>;
  updateMetadata(filePath: string, metadata: Partial<DocumentMetadata>): Promise<boolean>;
  getDocumentStatistics(filePath: string): Promise<DocumentStatistics>;
}

// =============================================================================
// UTILITY TYPES
// =============================================================================

export interface FileGenerationOptions {
  outputFormat?: 'pptx' | 'pptm';
  includeMetadata?: boolean;
  preserveOriginalAssets?: boolean;
  compressionLevel?: 'none' | 'fast' | 'maximum';
  quality?: 'low' | 'medium' | 'high';
}

export interface FileGenerationResult {
  success: boolean;
  data?: {
    filePath?: string; // For backward compatibility
    fileSize?: number;
    outputFormat?: string;
    processingStats?: ProcessingStats;
  };
  filePath?: string; // Direct access for backward compatibility
  size?: number; // Direct access for backward compatibility
  processingStats?: ProcessingStats; // Direct access for backward compatibility
  error?: string;
}

export interface FileStats {
  size: number;
  lastModified: Date;
  isValid: boolean;
  mimeType: string;
  slideCount?: number;
}

export interface DocumentStatistics {
  slideCount: number;
  shapeCount: number;
  textLength: number;
  imageCount: number;
  chartCount: number;
  tableCount: number;
  animationCount: number;
  commentCount: number;
  hyperlinkCount: number;
  embeddedObjectCount: number;
  fileSize: number;
}

// =============================================================================
// ERROR TYPES
// =============================================================================

export class AsposeError extends Error {
  public code: string;
  public originalError?: Error;

  constructor(message: string, code: string, originalError?: Error) {
    super(message);
    this.name = 'AsposeError';
    this.code = code;
    this.originalError = originalError;
  }
}

export class ConversionError extends AsposeError {
  constructor(message: string, originalError?: Error) {
    super(message, 'CONVERSION_ERROR', originalError);
    this.name = 'ConversionError';
  }
}

export class ValidationError extends AsposeError {
  constructor(message: string, originalError?: Error) {
    super(message, 'VALIDATION_ERROR', originalError);
    this.name = 'ValidationError';
  }
}

// =============================================================================
// HEALTH CHECK INTERFACE
// =============================================================================

export interface HealthCheckResult {
  isAvailable: boolean;
  hasLicense: boolean;
  tempDirExists: boolean;
  isHealthy: boolean;
  details?: {
    asposeVersion?: string;
    javaVersion?: string;
    memoryUsage?: {
      used: number;
      total: number;
      free: number;
    };
    lastError?: string;
  };
} 