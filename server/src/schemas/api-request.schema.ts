/**
 * API Request Schemas - Zod Validation
 * 
 * Validation schemas for all API endpoint requests
 */

import { z } from 'zod';
import { UniversalPresentationSchema } from './universal-presentation.schema';

// =============================================================================
// COMMON SCHEMAS
// =============================================================================

export const FileUploadSchema = z.object({
  fieldname: z.string(),
  originalname: z.string(),
  encoding: z.string(),
  mimetype: z.string(),
  buffer: z.instanceof(Buffer),
  size: z.number(),
});

export const OutputFormatEnum = z.enum([
  'pptx',
  'pdf',
  'html',
  'png',
  'jpg',
  'jpeg',
  'svg',
  'bmp',
  'gif',
  'tiff',
]);

export const LanguageCodeSchema = z.string()
  .length(2, 'Language code must be 2 characters')
  .regex(/^[a-z]{2}$/, 'Language code must be lowercase letters');

export const QualitySchema = z.enum(['low', 'medium', 'high', 'ultra'])
  .default('medium');

export const ThumbnailSizeSchema = z.object({
  width: z.number().positive().max(2000).optional(),
  height: z.number().positive().max(2000).optional(),
}).optional();

// =============================================================================
// ENDPOINT-SPECIFIC SCHEMAS
// =============================================================================

/**
 * POST /pptx2json - Convert PPTX to Universal Schema JSON
 */
export const Pptx2JsonRequestSchema = z.object({
  includeAssets: z.boolean().optional().default(false),
  includeMetadata: z.boolean().optional().default(true),
  includeAnimations: z.boolean().optional().default(true),
  includeComments: z.boolean().optional().default(true),
  extractImages: z.boolean().optional().default(false),
  optimizeForSize: z.boolean().optional().default(false),
});

/**
 * POST /json2pptx - Convert Universal Schema JSON to PPTX
 */
export const Json2PptxRequestSchema = z.object({
  presentationData: UniversalPresentationSchema,
  outputFormat: OutputFormatEnum.optional().default('pptx'),
  includeMetadata: z.boolean().optional().default(true),
  preserveOriginalAssets: z.boolean().optional().default(true),
  compressionLevel: z.enum(['none', 'fast', 'maximum']).optional().default('fast'),
});

/**
 * POST /thumbnails - Generate slide thumbnails
 */
export const ThumbnailsRequestSchema = z.object({
  slideIndices: z.array(z.number().min(0)).optional(), // If not provided, generate for all slides
  size: ThumbnailSizeSchema.default({ width: 300, height: 225 }),
  format: z.enum(['png', 'jpg', 'webp']).optional().default('png'),
  quality: QualitySchema,
  backgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().default('#FFFFFF'),
  includeNotes: z.boolean().optional().default(false),
  returnFormat: z.enum(['base64', 'url', 'buffer']).optional().default('base64'),
});

/**
 * POST /convertformat - Convert presentation to different formats
 */
export const ConvertFormatRequestSchema = z.object({
  outputFormat: OutputFormatEnum,
  slideIndices: z.array(z.number().min(0)).optional(), // If not provided, convert all slides
  quality: QualitySchema,
  includeMetadata: z.boolean().optional().default(true),
  includeAnimations: z.boolean().optional().default(true),
  
  // PDF-specific options
  pdfOptions: z.object({
    includeComments: z.boolean().optional().default(false),
    includeHiddenSlides: z.boolean().optional().default(false),
    jpegQuality: z.number().min(1).max(100).optional().default(90),
    compliance: z.enum(['PDF15', 'PDF16', 'PDF17', 'PDFA1a', 'PDFA1b']).optional().default('PDF15'),
  }).optional(),
  
  // HTML-specific options
  htmlOptions: z.object({
    includeSlideNotes: z.boolean().optional().default(false),
    responsive: z.boolean().optional().default(true),
    showSlideNumber: z.boolean().optional().default(true),
    embedImages: z.boolean().optional().default(true),
  }).optional(),
  
  // Image-specific options
  imageOptions: z.object({
    width: z.number().positive().max(4000).optional(),
    height: z.number().positive().max(4000).optional(),
    dpi: z.number().min(72).max(600).optional().default(96),
    backgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().default('#FFFFFF'),
  }).optional(),
});

/**
 * POST /aitranslate - AI Translation of presentation
 */
export const AiTranslateRequestSchema = z.object({
  targetLanguage: LanguageCodeSchema,
  sourceLanguage: LanguageCodeSchema.optional(), // Auto-detect if not provided
  
  // Translation scope
  includeSlideText: z.boolean().optional().default(true),
  includeSlideNotes: z.boolean().optional().default(true),
  includeComments: z.boolean().optional().default(false),
  includeChartLabels: z.boolean().optional().default(true),
  includeTableContent: z.boolean().optional().default(true),
  includeAltText: z.boolean().optional().default(true),
  
  // Translation options
  preserveFormatting: z.boolean().optional().default(true),
  useContextualTranslation: z.boolean().optional().default(true),
  translationQuality: z.enum(['fast', 'balanced', 'quality']).optional().default('balanced'),
  
  // Aspose.Slides AI options
  useAsposeAI: z.boolean().optional().default(true),
  asposeApiKey: z.string().optional(),
  
  // OpenAI fallback options
  useOpenAIFallback: z.boolean().optional().default(false),
  customPrompt: z.string().max(1000).optional(),
  temperature: z.number().min(0).max(2).optional().default(0.3),
});

/**
 * POST /extract-assets - Extract embedded assets
 */
export const ExtractAssetsRequestSchema = z.object({
  assetTypes: z.array(z.enum([
    'image',
    'video',
    'audio',
    'document',
    'excel',
    'word',
    'pdf',
    'ole',
    'shape',
    'chart',
    'all'
  ])).optional().default(['all']),
  
  includeMetadata: z.boolean().optional().default(true),
  extractToStorage: z.boolean().optional().default(false),
  generateThumbnails: z.boolean().optional().default(true),
  
  // Output options
  returnFormat: z.enum(['urls', 'base64', 'metadata-only']).optional().default('urls'),
  
  // Image processing options
  imageOptions: z.object({
    maxWidth: z.number().positive().max(2000).optional(),
    maxHeight: z.number().positive().max(2000).optional(),
    quality: QualitySchema,
    format: z.enum(['original', 'png', 'jpg', 'webp']).optional().default('original'),
  }).optional(),
  
  // Video processing options
  videoOptions: z.object({
    extractFrames: z.boolean().optional().default(true),
    frameCount: z.number().min(1).max(10).optional().default(3),
    includeAudioTrack: z.boolean().optional().default(true),
  }).optional(),
});

/**
 * POST /extract-metadata - Extract comprehensive metadata
 */
export const ExtractMetadataRequestSchema = z.object({
  includeDocumentProperties: z.boolean().optional().default(true),
  includeCustomProperties: z.boolean().optional().default(true),
  includeTechnicalDetails: z.boolean().optional().default(true),
  includeAssetMetadata: z.boolean().optional().default(true),
  includeStatistics: z.boolean().optional().default(true),
  includeFontInfo: z.boolean().optional().default(true),
  includeAnimationDetails: z.boolean().optional().default(true),
  includeSecurityInfo: z.boolean().optional().default(true),
  
  // Analysis depth
  analysisDepth: z.enum(['basic', 'detailed', 'comprehensive']).optional().default('detailed'),
  
  // Return format
  format: z.enum(['json', 'xml', 'csv']).optional().default('json'),
});

/**
 * POST /analyze - AI-powered semantic analysis
 */
export const AnalyzeRequestSchema = z.object({
  analysisTypes: z.array(z.enum([
    'summary',
    'tags',
    'topics',
    'sentiment',
    'readability',
    'suggestions',
    'accessibility',
    'design-critique',
    'content-optimization',
    'audience-targeting'
  ])).optional().default(['summary', 'tags', 'suggestions']),
  
  // OpenAI options
  model: z.enum(['gpt-4', 'gpt-4-turbo-preview', 'gpt-3.5-turbo']).optional().default('gpt-4-turbo-preview'),
  maxTokens: z.number().min(100).max(8000).optional().default(2000),
  temperature: z.number().min(0).max(2).optional().default(0.7),
  
  // Analysis context
  targetAudience: z.string().max(200).optional(),
  presentationPurpose: z.string().max(200).optional(),
  industry: z.string().max(100).optional(),
  
  // Output preferences
  language: LanguageCodeSchema.optional().default('en'),
  includeActionableInsights: z.boolean().optional().default(true),
  includeCitations: z.boolean().optional().default(false),
  
  // Content analysis options
  analyzeSlideContent: z.boolean().optional().default(true),
  analyzeSlideNotes: z.boolean().optional().default(true),
  analyzeVisualElements: z.boolean().optional().default(true),
  analyzeDataVisualization: z.boolean().optional().default(true),
});

// =============================================================================
// MULTIPART FORM SCHEMAS
// =============================================================================

/**
 * Schema for multipart form data with file upload
 */
export const FileUploadRequestSchema = z.object({
  file: FileUploadSchema,
  options: z.string().optional(), // JSON string that will be parsed based on endpoint
});

// =============================================================================
// COMMON VALIDATION HELPERS
// =============================================================================

export const validateFileType = (file: any, allowedTypes: string[]): boolean => {
  return allowedTypes.includes(file.mimetype);
};

export const validateFileSize = (file: any, maxSizeBytes: number): boolean => {
  return file.size <= maxSizeBytes;
};

export const SUPPORTED_PPTX_MIMETYPES = [
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.slideshow',
];

export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

// =============================================================================
// EXPORTS
// =============================================================================

export type Pptx2JsonRequest = z.infer<typeof Pptx2JsonRequestSchema>;
export type Json2PptxRequest = z.infer<typeof Json2PptxRequestSchema>;
export type ThumbnailsRequest = z.infer<typeof ThumbnailsRequestSchema>;
export type ConvertFormatRequest = z.infer<typeof ConvertFormatRequestSchema>;
export type AiTranslateRequest = z.infer<typeof AiTranslateRequestSchema>;
export type ExtractAssetsRequest = z.infer<typeof ExtractAssetsRequestSchema>;
export type ExtractMetadataRequest = z.infer<typeof ExtractMetadataRequestSchema>;
export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;
export type FileUploadRequest = z.infer<typeof FileUploadRequestSchema>; 