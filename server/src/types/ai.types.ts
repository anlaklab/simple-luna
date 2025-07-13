import { z } from "zod";
/**
 * AI Features Types
 * 
 * Type definitions for AI-powered features including analysis, asset extraction, and metadata extraction
 */

// =============================================================================
// ANALYSIS TYPES
// =============================================================================

export interface AnalyzeOptions {
  includeSentiment?: boolean;
  includeAccessibility?: boolean;
  includeDesignCritique?: boolean;
}

export interface AnalysisResult {
  overview: {
    slideCount: number;
    wordCount: number;
    characterCount: number;
    readingLevel: string;
    estimatedDuration: string;
  };
  sentiment: {
    overall: 'positive' | 'negative' | 'neutral';
    confidence: number;
    details: any[];
  };
  accessibility: {
    score: number;
    issues: AccessibilityIssue[];
  };
  content: {
    hasImages: boolean;
    hasCharts: boolean;
    hasTables: boolean;
  };
}

export interface AccessibilityIssue {
  type: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  slideIndex: number;
}

// =============================================================================
// ASSET EXTRACTION TYPES
// =============================================================================

export interface ExtractAssetsOptions {
  assetTypes?: ('images' | 'videos' | 'audio' | 'documents')[];
  returnFormat?: 'base64' | 'urls' | 'buffers';
  generateThumbnails?: boolean;
}

export interface ExtractedAsset {
  id: string;
  type: 'image' | 'video' | 'audio' | 'document';
  filename: string;
  size: number;
  url?: string;
  thumbnailUrl?: string;
  base64?: string;
  buffer?: Buffer;
}

export interface AssetExtractionResult {
  assets: ExtractedAsset[];
  summary: {
    totalAssets: number;
    byType: {
      images: number;
      videos: number;
      audio: number;
      documents: number;
    };
    totalSize: number;
  };
}

// =============================================================================
// METADATA EXTRACTION TYPES
// =============================================================================

export interface ExtractMetadataOptions {
  includeSystemMetadata?: boolean;
  includeCustomProperties?: boolean;
  includeStatistics?: boolean;
}

export interface ExtractedMetadata {
  basic: {
    title?: string;
    author?: string;
    subject?: string;
    category?: string;
    keywords?: string;
    comments?: string;
  };
  system: {
    created?: string;
    modified?: string;
    createdBy?: string;
    lastModifiedBy?: string;
    applicationName?: string;
  };
  statistics: {
    slideCount: number;
    shapeCount: number;
    wordCount: number;
    fileSize: number;
    imageCount: number;
    chartCount: number;
    tableCount: number;
  };
  customProperties: Record<string, any>;
}

// =============================================================================
// TRANSLATION TYPES
// =============================================================================

export interface TranslationOptions {
  sourceLanguage?: string;
  targetLanguage: string;
  translationMethod?: 'openai' | 'aspose-ai' | 'hybrid';
  preserveFormatting?: boolean;
  translateComments?: boolean;
  translateMetadata?: boolean;
}

export interface TranslationResult {
  translatedPresentation: any; // UniversalPresentation type
  translationStats: {
    sourceLanguage: string;
    targetLanguage: string;
    translatedSlides: number;
    translatedShapes: number;
    translationMethod: string;
    processingTimeMs: number;
  };
}

// =============================================================================
// CHAT TYPES
// =============================================================================

export interface ChatOptions {
  message: string;
  sessionId?: string;
  context?: Record<string, any>;
}

export interface ChatResult {
  response: string;
  model: string;
  sessionId?: string;
  context?: Record<string, any>;
} 