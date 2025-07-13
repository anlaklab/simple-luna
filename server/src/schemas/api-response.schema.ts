import { z } from "zod";
/**
 * API Response Schemas - Zod Validation
 * 
 * Standardized response schemas for all API endpoints
 */

import { z } from 'zod';
import { UniversalPresentationSchema } from './universal-presentation.schema';

// =============================================================================
// COMMON RESPONSE SCHEMAS
// =============================================================================

export const SuccessMetaSchema = z.object({
  timestamp: z.string().datetime(),
  requestId: z.string().uuid(),
  processingTimeMs: z.number().min(0),
  version: z.string().default('1.0'),
});

export const ErrorDetailSchema = z.object({
  code: z.string(),
  message: z.string(),
  field: z.string().optional(),
  value: z.any().optional(),
});

export const ErrorMetaSchema = z.object({
  timestamp: z.string().datetime(),
  requestId: z.string().uuid(),
  error: z.object({
    type: z.string(),
    code: z.string(),
    message: z.string(),
    details: z.array(ErrorDetailSchema).optional(),
    stack: z.string().optional(),
  }),
});

export const PaginationSchema = z.object({
  page: z.number().min(1),
  limit: z.number().min(1).max(100),
  total: z.number().min(0),
  totalPages: z.number().min(0),
  hasNext: z.boolean(),
  hasPrev: z.boolean(),
});

export const FileInfoSchema = z.object({
  filename: z.string(),
  originalName: z.string(),
  size: z.number().min(0),
  mimetype: z.string(),
  url: z.string().url().optional(),
  downloadUrl: z.string().url().optional(),
  previewUrl: z.string().url().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

// =============================================================================
// FIDELITY TRACKING SCHEMAS
// =============================================================================

export const FidelityIssueSchema = z.object({
  type: z.enum(['missing_property', 'unsupported_element', 'conversion_loss', 'format_mismatch']),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  description: z.string(),
  location: z.string(),
  originalValue: z.any().optional(),
  convertedValue: z.any().optional(),
  suggestion: z.string().optional(),
});

export const FidelityReportSchema = z.object({
  reportId: z.string().uuid(),
  timestamp: z.string().datetime(),
  conversionId: z.string().uuid(),
  originalFile: z.string(),
  fidelityScore: z.number().min(0).max(100),
  overallQuality: z.enum(['excellent', 'good', 'fair', 'poor']),
  metrics: z.object({
    slidesProcessed: z.number().min(0),
    shapesProcessed: z.number().min(0),
    textElementsProcessed: z.number().min(0),
    imagesProcessed: z.number().min(0),
    animationsProcessed: z.number().min(0),
    elementsSupported: z.number().min(0),
    elementsPartialSupport: z.number().min(0),
    elementsUnsupported: z.number().min(0),
    propertiesPreserved: z.number().min(0),
    propertiesLost: z.number().min(0),
    propertiesModified: z.number().min(0),
  }),
  issues: z.array(FidelityIssueSchema),
  recommendations: z.array(z.string()),
  processingTime: z.number().min(0),
  memoryUsage: z.number().min(0).optional(),
});

export const AssetMetadataSchema = z.object({
  type: z.enum(['image', 'video', 'audio', 'document', 'excel', 'word', 'pdf', 'ole', 'other']),
  filename: z.string(),
  originalName: z.string(),
  size: z.number().min(0),
  mimetype: z.string(),
  
  // Common metadata
  createdDate: z.string().datetime().optional(),
  modifiedDate: z.string().datetime().optional(),
  
  // Image-specific metadata
  imageMetadata: z.object({
    width: z.number().positive(),
    height: z.number().positive(),
    dpi: z.number().positive().optional(),
    colorDepth: z.number().positive().optional(),
    format: z.string(),
    hasTransparency: z.boolean().optional(),
    compression: z.string().optional(),
  }).optional(),
  
  // Video-specific metadata
  videoMetadata: z.object({
    width: z.number().positive(),
    height: z.number().positive(),
    duration: z.number().positive(), // seconds
    frameRate: z.number().positive().optional(),
    bitrate: z.number().positive().optional(),
    codec: z.string().optional(),
    hasAudio: z.boolean().optional(),
    audioCodec: z.string().optional(),
  }).optional(),
  
  // Audio-specific metadata
  audioMetadata: z.object({
    duration: z.number().positive(), // seconds
    bitrate: z.number().positive().optional(),
    sampleRate: z.number().positive().optional(),
    channels: z.number().positive().optional(),
    codec: z.string().optional(),
  }).optional(),
  
  // Document-specific metadata
  documentMetadata: z.object({
    pageCount: z.number().min(0).optional(),
    author: z.string().optional(),
    title: z.string().optional(),
    subject: z.string().optional(),
    version: z.string().optional(),
    application: z.string().optional(),
  }).optional(),
});

// =============================================================================
// SUCCESS RESPONSE SCHEMAS
// =============================================================================

/**
 * POST /pptx2json Response
 */
export const Pptx2JsonResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    presentation: UniversalPresentationSchema,
    originalFilename: z.string(),
    extractedAssets: z.array(AssetMetadataSchema).optional(),
    processingStats: z.object({
      slideCount: z.number().min(0),
      shapeCount: z.number().min(0),
      imageCount: z.number().min(0),
      animationCount: z.number().min(0),
      conversionTimeMs: z.number().min(0),
    }),
    fidelityReport: FidelityReportSchema.optional(),
  }),
  meta: SuccessMetaSchema.extend({
    fidelityScore: z.number().min(0).max(100).optional(),
    fidelityQuality: z.enum(['excellent', 'good', 'fair', 'poor']).optional(),
  }),
});

/**
 * POST /json2pptx Response
 */
export const Json2PptxResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    file: FileInfoSchema,
    outputFormat: z.string(),
    processingStats: z.object({
      slideCount: z.number().min(0),
      shapeCount: z.number().min(0),
      fileSize: z.number().min(0),
      conversionTimeMs: z.number().min(0),
    }),
  }),
  meta: SuccessMetaSchema,
});

/**
 * POST /thumbnails Response
 */
export const ThumbnailsResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    thumbnails: z.array(z.object({
      slideIndex: z.number().min(0),
      slideId: z.number().optional(),
      thumbnail: z.string(), // base64, URL, or buffer depending on returnFormat
      format: z.string(),
      size: z.object({
        width: z.number().positive(),
        height: z.number().positive(),
      }),
      url: z.string().url().optional(),
    })),
    totalSlides: z.number().min(0),
    generatedCount: z.number().min(0),
    format: z.string(),
    size: z.object({
      width: z.number().positive(),
      height: z.number().positive(),
    }),
  }),
  meta: SuccessMetaSchema,
});

/**
 * POST /convertformat Response
 */
export const ConvertFormatResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    files: z.array(FileInfoSchema), // Multiple files for image formats (one per slide)
    outputFormat: z.string(),
    slideCount: z.number().min(0),
    processedSlides: z.array(z.number()),
    totalSize: z.number().min(0),
    downloadUrl: z.string().url().optional(), // For ZIP archives
  }),
  meta: SuccessMetaSchema,
});

/**
 * POST /aitranslate Response
 */
export const AiTranslateResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    translatedPresentation: UniversalPresentationSchema,
    translationStats: z.object({
      sourceLanguage: z.string(),
      targetLanguage: z.string(),
      translatedElements: z.object({
        slides: z.number().min(0),
        textShapes: z.number().min(0),
        comments: z.number().min(0),
        chartLabels: z.number().min(0),
        tableContent: z.number().min(0),
        altTexts: z.number().min(0),
      }),
      translationMethod: z.enum(['aspose-ai', 'openai', 'hybrid']),
      confidence: z.number().min(0).max(1).optional(),
      translationTimeMs: z.number().min(0),
    }),
    file: FileInfoSchema.optional(), // If PPTX output was requested
  }),
  meta: SuccessMetaSchema,
});

/**
 * POST /extract-assets Response
 */
export const ExtractAssetsResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    assets: z.array(AssetMetadataSchema.extend({
      extractedUrl: z.string().url().optional(),
      base64Data: z.string().optional(),
      thumbnailUrl: z.string().url().optional(),
    })),
    summary: z.object({
      totalAssets: z.number().min(0),
      assetTypes: z.record(z.string(), z.number()),
      totalSize: z.number().min(0),
      extractedToStorage: z.boolean(),
    }),
    downloadUrl: z.string().url().optional(), // For ZIP archive
  }),
  meta: SuccessMetaSchema,
});

/**
 * POST /extract-metadata Response
 */
export const ExtractMetadataResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    documentProperties: z.object({
      title: z.string().optional(),
      subject: z.string().optional(),
      author: z.string().optional(),
      keywords: z.string().optional(),
      comments: z.string().optional(),
      category: z.string().optional(),
      company: z.string().optional(),
      manager: z.string().optional(),
      createdTime: z.string().datetime().optional(),
      lastSavedTime: z.string().datetime().optional(),
      lastPrintedDate: z.string().datetime().optional(),
      revisionNumber: z.number().min(0).optional(),
      totalEditingTime: z.number().min(0).optional(),
    }),
    customProperties: z.record(z.string(), z.any()).optional(),
    technicalDetails: z.object({
      fileSize: z.number().min(0),
      slideCount: z.number().min(0),
      slideSize: z.object({
        width: z.number().positive(),
        height: z.number().positive(),
      }),
      version: z.string().optional(),
      application: z.string().optional(),
      isEncrypted: z.boolean(),
      isPasswordProtected: z.boolean(),
      hasVbaProject: z.boolean(),
      hasDigitalSignature: z.boolean(),
    }),
    statistics: z.object({
      shapes: z.object({
        total: z.number().min(0),
        byType: z.record(z.string(), z.number()),
      }),
      animations: z.object({
        total: z.number().min(0),
        byType: z.record(z.string(), z.number()),
      }),
      multimedia: z.object({
        images: z.number().min(0),
        videos: z.number().min(0),
        audios: z.number().min(0),
        embeddedObjects: z.number().min(0),
      }),
      text: z.object({
        totalWords: z.number().min(0),
        totalCharacters: z.number().min(0),
        averageWordsPerSlide: z.number().min(0),
      }),
    }),
    fontInfo: z.object({
      usedFonts: z.array(z.string()),
      embeddedFonts: z.array(z.string()),
      missingFonts: z.array(z.string()).optional(),
    }),
    securityInfo: z.object({
      isEncrypted: z.boolean(),
      isPasswordProtected: z.boolean(),
      isWriteProtected: z.boolean(),
      hasDigitalSignature: z.boolean(),
      signatureValid: z.boolean().optional(),
      encryptionMethod: z.string().optional(),
    }),
    assetMetadata: z.array(AssetMetadataSchema).optional(),
  }),
  meta: SuccessMetaSchema,
});

/**
 * POST /analyze Response
 */
export const AnalyzeResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    analysis: z.object({
      summary: z.object({
        title: z.string().optional(),
        overview: z.string(),
        keyPoints: z.array(z.string()),
        slideCount: z.number().min(0),
        estimatedDuration: z.string().optional(), // e.g., "15-20 minutes"
      }).optional(),
      
      tags: z.array(z.object({
        tag: z.string(),
        confidence: z.number().min(0).max(1),
        category: z.enum(['topic', 'industry', 'audience', 'format', 'style']).optional(),
      })).optional(),
      
      topics: z.array(z.object({
        topic: z.string(),
        relevance: z.number().min(0).max(1),
        slideReferences: z.array(z.number()),
      })).optional(),
      
      sentiment: z.object({
        overall: z.enum(['positive', 'neutral', 'negative']),
        score: z.number().min(-1).max(1),
        confidence: z.number().min(0).max(1),
        bySlide: z.array(z.object({
          slideIndex: z.number(),
          sentiment: z.enum(['positive', 'neutral', 'negative']),
          score: z.number().min(-1).max(1),
        })),
      }).optional(),
      
      readability: z.object({
        overallScore: z.number().min(0).max(100),
        level: z.enum(['elementary', 'middle-school', 'high-school', 'college', 'graduate']),
        averageWordsPerSlide: z.number().min(0),
        complexSentences: z.number().min(0),
        recommendations: z.array(z.string()),
      }).optional(),
      
      suggestions: z.array(z.object({
        type: z.enum(['content', 'design', 'structure', 'accessibility', 'engagement']),
        priority: z.enum(['low', 'medium', 'high']),
        title: z.string(),
        description: z.string(),
        affectedSlides: z.array(z.number()).optional(),
        implementation: z.string().optional(),
      })).optional(),
      
      accessibility: z.object({
        score: z.number().min(0).max(100),
        issues: z.array(z.object({
          type: z.enum(['alt-text', 'contrast', 'font-size', 'structure', 'navigation']),
          severity: z.enum(['low', 'medium', 'high']),
          description: z.string(),
          slideIndex: z.number().optional(),
          recommendation: z.string(),
        })),
        compliance: z.object({
          wcag2_1: z.enum(['AA', 'AAA', 'partial', 'non-compliant']),
          section508: z.boolean(),
        }),
      }).optional(),
      
      designCritique: z.object({
        overallRating: z.number().min(1).max(10),
        aspects: z.object({
          layout: z.number().min(1).max(10),
          typography: z.number().min(1).max(10),
          colorScheme: z.number().min(1).max(10),
          consistency: z.number().min(1).max(10),
          visualHierarchy: z.number().min(1).max(10),
        }),
        strengths: z.array(z.string()),
        weaknesses: z.array(z.string()),
        recommendations: z.array(z.string()),
      }).optional(),
      
      contentOptimization: z.object({
        wordCount: z.object({
          total: z.number().min(0),
          bySlide: z.array(z.number()),
          recommendation: z.string(),
        }),
        slideStructure: z.object({
          hasTitle: z.boolean(),
          hasConclusion: z.boolean(),
          logicalFlow: z.number().min(1).max(10),
          recommendations: z.array(z.string()),
        }),
        engagement: z.object({
          interactiveElements: z.number().min(0),
          visualElements: z.number().min(0),
          callsToAction: z.number().min(0),
          recommendations: z.array(z.string()),
        }),
      }).optional(),
      
      audienceTargeting: z.object({
        identifiedAudience: z.string().optional(),
        targetingScore: z.number().min(0).max(100),
        recommendations: z.array(z.string()),
        contentAlignment: z.object({
          technicalLevel: z.enum(['beginner', 'intermediate', 'advanced']),
          formalityLevel: z.enum(['casual', 'business', 'academic']),
          industryAlignment: z.string().optional(),
        }),
      }).optional(),
    }),
    
    processingInfo: z.object({
      model: z.string(),
      tokensUsed: z.number().min(0),
      analysisTimeMs: z.number().min(0),
      analyzedSlides: z.number().min(0),
      extractedText: z.number().min(0), // character count
    }),
  }),
  meta: SuccessMetaSchema,
});

// =============================================================================
// ERROR RESPONSE SCHEMA
// =============================================================================

export const ErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    type: z.enum([
      'validation_error',
      'file_error',
      'processing_error',
      'conversion_error',
      'translation_error',
      'analysis_error',
      'storage_error',
      'external_api_error',
      'rate_limit_error',
      'authentication_error',
      'authorization_error',
      'server_error',
    ]),
    code: z.string(),
    message: z.string(),
    details: z.array(ErrorDetailSchema).optional(),
    suggestions: z.array(z.string()).optional(),
  }),
  meta: ErrorMetaSchema,
});

// =============================================================================
// HEALTH & STATUS RESPONSES
// =============================================================================

export const HealthResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    status: z.enum(['healthy', 'degraded', 'unhealthy']),
    timestamp: z.string().datetime(),
    uptime: z.number().min(0),
    version: z.string(),
    services: z.object({
      database: z.enum(['healthy', 'degraded', 'unhealthy']),
      storage: z.enum(['healthy', 'degraded', 'unhealthy']),
      aspose: z.enum(['healthy', 'degraded', 'unhealthy']),
      openai: z.enum(['healthy', 'degraded', 'unhealthy']).optional(),
      firebase: z.enum(['healthy', 'degraded', 'unhealthy']),
    }),
    metrics: z.object({
      requestCount: z.number().min(0),
      avgResponseTime: z.number().min(0),
      errorRate: z.number().min(0).max(1),
      memoryUsage: z.number().min(0),
      cpuUsage: z.number().min(0).max(100),
    }),
  }),
  meta: SuccessMetaSchema,
});

// =============================================================================
// EXPORTS
// =============================================================================

export type Pptx2JsonResponse = z.infer<typeof Pptx2JsonResponseSchema>;
export type Json2PptxResponse = z.infer<typeof Json2PptxResponseSchema>;
export type ThumbnailsResponse = z.infer<typeof ThumbnailsResponseSchema>;
export type ConvertFormatResponse = z.infer<typeof ConvertFormatResponseSchema>;
export type AiTranslateResponse = z.infer<typeof AiTranslateResponseSchema>;
export type ExtractAssetsResponse = z.infer<typeof ExtractAssetsResponseSchema>;
export type ExtractMetadataResponse = z.infer<typeof ExtractMetadataResponseSchema>;
export type AnalyzeResponse = z.infer<typeof AnalyzeResponseSchema>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
export type HealthResponse = z.infer<typeof HealthResponseSchema>;
export type AssetMetadata = z.infer<typeof AssetMetadataSchema>;
export type FileInfo = z.infer<typeof FileInfoSchema>; 