/**
 * Enhanced Presentation Hook - Unified API Integration
 * 🎯 RESPONSIBILITY: Presentation data management and state with unified API
 * 📋 SCOPE: Loading, caching, Universal JSON Schema handling, analytics
 * ⚡ FEATURES: Error handling, caching, real-time updates, progress tracking
 */

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { UniversalPresentation, UniversalSlide, UniversalShape, PresentationAnalytics, AssetSummary } from '../types/universal-json';
import { api, type UploadProgress } from './use-api';

export interface PresentationState {
  // Core data
  id: string | null;
  universalJson: UniversalPresentation | null;
  
  // Loading states
  isLoading: boolean;
  isConverting: boolean;
  isRefreshing: boolean;
  uploadProgress: UploadProgress | null;
  error: string | null;
  
  // Processed data
  analytics: PresentationAnalytics | null;
  slideAnalyses: SlideAnalysis[];
  
  // Assets and thumbnails
  thumbnails: Array<{
    slideIndex: number;
    url: string;
    filename: string;
    format: string;
    width: number;
    height: number;
  }>;
  assets: Array<{
    type: string;
    count: number;
    items: any[];
  }>;
  
  // Metadata
  lastUpdated: string | null;
  version: string | null;
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  
  // Performance
  loadTime: number | null;
  cacheHit: boolean;
}

export interface UsePresentation {
  // State
  state: PresentationState;
  
  // Core actions
  loadPresentation: (id: string, options?: { forceRefresh?: boolean }) => Promise<void>;
  convertPptx: (file: File, options?: { generateThumbnails?: boolean }) => Promise<string | null>;
  refreshPresentation: () => Promise<void>;
  
  // Universal JSON operations
  getSlide: (slideIndex: number) => Promise<any>;
  getShape: (slideIndex: number, shapeId: string) => Promise<any>;
  updateSlide: (slideIndex: number, slideData: any) => Promise<boolean>;
  deleteSlide: (slideIndex: number) => Promise<boolean>;
  
  // Analytics and processing
  generateAnalytics: () => Promise<PresentationAnalytics | null>;
  analyzeSlide: (slideIndex: number) => SlideAnalysis | null;
  regenerateThumbnails: () => Promise<boolean>;
  
  // Export and sharing
  exportPresentation: (format: 'pdf' | 'pptx' | 'html', options?: any) => Promise<string | null>;
  
  // State management
  clear: () => void;
  resetError: () => void;
}

const initialState: PresentationState = {
  id: null,
  universalJson: null,
  isLoading: false,
  isConverting: false,
  isRefreshing: false,
  uploadProgress: null,
  error: null,
  analytics: null,
  slideAnalyses: [],
  thumbnails: [],
  assets: [],
  lastUpdated: null,
  version: null,
  processingStatus: 'pending',
  loadTime: null,
  cacheHit: false,
};

export function usePresentation(): UsePresentation {
  const [state, setState] = useState<PresentationState>(initialState);
  const { toast } = useToast();

  // Update state helper
  const updateState = useCallback((updates: Partial<PresentationState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // Load presentation by ID with enhanced error handling
  const loadPresentation = useCallback(async (
    id: string, 
    options: { forceRefresh?: boolean } = {}
  ) => {
    const startTime = Date.now();
    
    updateState({ 
      isLoading: true, 
      error: null, 
      id,
      cacheHit: false,
    });

    try {
      // Get presentation metadata first
      const metadataResponse = await api.presentations.get(id, {
        includeVersions: true,
        includeAnalytics: true,
      });

      if (!metadataResponse.success) {
        throw new Error(metadataResponse.error || 'Failed to load presentation metadata');
      }

      const metadata = metadataResponse.data;

      // Get Universal JSON
      const jsonResponse = await api.granular.getSlide(id, -1); // -1 for full presentation
      
      if (!jsonResponse.success) {
        // Fallback to regular JSON endpoint
        const fallbackResponse = await fetch(`/api/v1/presentations/${id}/json`);
        if (!fallbackResponse.ok) {
          throw new Error('Failed to load presentation JSON');
        }
        const jsonData = await fallbackResponse.json();
        
        if (!jsonData.success) {
          throw new Error(jsonData.error || 'Invalid JSON response');
        }
        
        const universalJson = jsonData.data;
        
        updateState({
          universalJson,
          isLoading: false,
          lastUpdated: metadata.updatedAt || new Date().toISOString(),
          version: metadata.version || '1.0',
          processingStatus: metadata.processing?.status || 'completed',
          loadTime: Date.now() - startTime,
        });
        
        return;
      }

      const universalJson = jsonResponse.data;

      // Load thumbnails in parallel
      const thumbnailsPromise = loadThumbnails(id);
      
      // Load assets in parallel
      const assetsPromise = loadAssets(id);

      const [thumbnails, assets] = await Promise.allSettled([
        thumbnailsPromise,
        assetsPromise,
      ]);

      updateState({
        universalJson,
        thumbnails: thumbnails.status === 'fulfilled' ? thumbnails.value : [],
        assets: assets.status === 'fulfilled' ? assets.value : [],
        isLoading: false,
        lastUpdated: metadata.updatedAt || new Date().toISOString(),
        version: metadata.version || '1.0',
        processingStatus: metadata.processing?.status || 'completed',
        loadTime: Date.now() - startTime,
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load presentation';
      console.error('Failed to load presentation:', error);
      
      updateState({
        isLoading: false,
        error: errorMessage,
        loadTime: Date.now() - startTime,
      });

      toast({
        title: "Loading Failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }, [updateState, toast]);

  // Helper: Load thumbnails
  const loadThumbnails = async (id: string) => {
    try {
      const response = await fetch(`/api/v1/presentations/${id}/thumbnails`);
      if (!response.ok) return [];
      
      const data = await response.json();
      return data.data?.thumbnails?.map((thumb: any) => ({
        slideIndex: thumb.slideIndex,
        url: thumb.url,
        filename: thumb.filename,
        format: thumb.format,
        width: thumb.width,
        height: thumb.height,
      })) || [];
    } catch (error) {
      console.warn('Failed to load thumbnails:', error);
      return [];
    }
  };

  // Helper: Load assets
  const loadAssets = async (id: string) => {
    try {
      const response = await api.assets.getAll(id);
      if (!response.success) return [];
      
      return response.data.assets || [];
    } catch (error) {
      console.warn('Failed to load assets:', error);
      return [];
    }
  };

  // Convert PPTX file with progress tracking
  const convertPptx = useCallback(async (
    file: File, 
    options: { generateThumbnails?: boolean } = { generateThumbnails: true }
  ): Promise<string | null> => {
    updateState({ 
      isConverting: true, 
      error: null,
      uploadProgress: null,
    });

    try {
      const response = await api.conversion.pptxToJson(
        file,
        {
          includeAssets: true,
          includeHidden: false,
          generateThumbnails: options.generateThumbnails,
        },
        (progress) => {
          updateState({ uploadProgress: progress });
        }
      );

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Conversion failed');
      }

      const universalJson = response.data.presentation;
      const presentationId = universalJson.id;
      const thumbnails = response.data.thumbnails || [];

      updateState({
        id: presentationId,
        universalJson,
        thumbnails: thumbnails.map((thumb: any, index: number) => ({
          slideIndex: index,
          url: thumb.url,
          filename: thumb.filename || `slide-${index}.png`,
          format: thumb.format || 'png',
          width: thumb.width || 320,
          height: thumb.height || 240,
        })),
        isConverting: false,
        uploadProgress: null,
        lastUpdated: new Date().toISOString(),
        version: '1.0',
        processingStatus: 'completed',
      });

      toast({
        title: "Conversion Successful",
        description: `Converted ${universalJson.slides?.length || 0} slides successfully.`,
      });

      return presentationId;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Conversion failed';
      console.error('PPTX conversion failed:', error);
      
      updateState({
        isConverting: false,
        uploadProgress: null,
        error: errorMessage,
      });

      toast({
        title: "Conversion Failed",
        description: errorMessage,
        variant: "destructive",
      });

      return null;
    }
  }, [updateState, toast]);

  // Refresh current presentation
  const refreshPresentation = useCallback(async () => {
    if (!state.id) return;
    
    updateState({ isRefreshing: true });
    await loadPresentation(state.id, { forceRefresh: true });
    updateState({ isRefreshing: false });
  }, [state.id, loadPresentation, updateState]);

  // Get specific slide data with granular API
  const getSlide = useCallback(async (slideIndex: number) => {
    if (!state.id) {
      throw new Error('No presentation loaded');
    }

    try {
      const response = await api.granular.getSlide(state.id, slideIndex);
      if (!response.success) {
        throw new Error(response.error || 'Failed to get slide');
      }
      return response.data;
    } catch (error) {
      console.error('Failed to get slide:', error);
      toast({
        title: "Failed to Load Slide",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive",
      });
      throw error;
    }
  }, [state.id, toast]);

  // Get specific shape data
  const getShape = useCallback(async (slideIndex: number, shapeId: string) => {
    if (!state.id) {
      throw new Error('No presentation loaded');
    }

    try {
      const response = await api.granular.getShape(state.id, slideIndex, shapeId);
      if (!response.success) {
        throw new Error(response.error || 'Failed to get shape');
      }
      return response.data;
    } catch (error) {
      console.error('Failed to get shape:', error);
      throw error;
    }
  }, [state.id]);

  // Update slide data
  const updateSlide = useCallback(async (slideIndex: number, slideData: any): Promise<boolean> => {
    if (!state.id) return false;

    try {
      const response = await api.granular.updateSlide(state.id, slideIndex, slideData);
      if (response.success) {
        // Update local state
        if (state.universalJson) {
          const updatedSlides = [...state.universalJson.slides];
          updatedSlides[slideIndex] = { ...updatedSlides[slideIndex], ...slideData };
          
          updateState({
            universalJson: {
              ...state.universalJson,
              slides: updatedSlides,
            },
            lastUpdated: new Date().toISOString(),
          });
        }
        
        toast({
          title: "Slide Updated",
          description: `Slide ${slideIndex + 1} has been updated successfully.`,
        });
        
        return true;
      }
      
      throw new Error(response.error || 'Update failed');
    } catch (error) {
      console.error('Failed to update slide:', error);
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : 'Failed to update slide',
        variant: "destructive",
      });
      return false;
    }
  }, [state.id, state.universalJson, updateState, toast]);

  // Delete slide
  const deleteSlide = useCallback(async (slideIndex: number): Promise<boolean> => {
    if (!state.id) return false;

    try {
      const response = await api.granular.deleteSlide(state.id, slideIndex);
      if (response.success) {
        // Update local state
        if (state.universalJson) {
          const updatedSlides = state.universalJson.slides.filter((_, index) => index !== slideIndex);
          
          updateState({
            universalJson: {
              ...state.universalJson,
              slides: updatedSlides,
            },
            lastUpdated: new Date().toISOString(),
          });
        }
        
        toast({
          title: "Slide Deleted",
          description: `Slide ${slideIndex + 1} has been deleted.`,
        });
        
        return true;
      }
      
      throw new Error(response.error || 'Delete failed');
    } catch (error) {
      console.error('Failed to delete slide:', error);
      toast({
        title: "Delete Failed",
        description: error instanceof Error ? error.message : 'Failed to delete slide',
        variant: "destructive",
      });
      return false;
    }
  }, [state.id, state.universalJson, updateState, toast]);

  // Generate comprehensive analytics
  const generateAnalytics = useCallback(async (): Promise<PresentationAnalytics | null> => {
    if (!state.universalJson || !state.id) return null;

    try {
      // Try to get analytics from API first
      const apiResponse = await api.presentations.getAnalytics(state.id);
      if (apiResponse.success && apiResponse.data) {
        const analytics = apiResponse.data;
        updateState({ analytics });
        return analytics;
      }
    } catch (error) {
      console.warn('API analytics failed, generating locally:', error);
    }

    // Fallback to local generation
    const presentation = state.universalJson;
    const slides = presentation.slides || [];
    
    // Enhanced asset counting
    const assetCounts = {
      image: 0,
      video: 0,
      audio: 0,
      chart: 0,
      table: 0,
      ole: 0,
    };

    // Enhanced slide type analysis
    const slideTypes: Record<string, number> = {};
    
    slides.forEach((slide, index) => {
      const shapes = slide.shapes || [];
      
      // Advanced slide classification
      const textShapes = shapes.filter(shape => shape.TextFrame);
      const hasTitle = textShapes.some(shape => 
        shape.shapeType === 'Placeholder' || 
        (shape.TextFrame && shape.TextFrame.text.length < 100)
      );
      const hasContent = textShapes.some(shape => 
        shape.TextFrame && shape.TextFrame.text.length > 100
      );
      const hasChart = shapes.some(shape => shape.Chart);
      const hasTable = shapes.some(shape => shape.Table);
      const hasImage = shapes.some(shape => shape.Picture);
      const hasMedia = shapes.some(shape => shape.Video || shape.Audio);

      let slideType = 'content';
      if (index === 0) slideType = 'title';
      else if (index === slides.length - 1 && !hasContent) slideType = 'conclusion';
      else if (hasChart && !hasContent) slideType = 'chart';
      else if (hasTable && !hasContent) slideType = 'table';
      else if (hasImage && !hasContent) slideType = 'image';
      else if (hasMedia) slideType = 'media';
      else if (hasTitle && !hasContent) slideType = 'section';
      else if (hasChart || hasTable || hasImage) slideType = 'mixed';

      slideTypes[slideType] = (slideTypes[slideType] || 0) + 1;

      // Count assets with detailed analysis
      shapes.forEach(shape => {
        if (shape.Picture) assetCounts.image++;
        if (shape.Video) assetCounts.video++;
        if (shape.Audio) assetCounts.audio++;
        if (shape.Chart) assetCounts.chart++;
        if (shape.Table) assetCounts.table++;
        if (shape.shapeType === 'OleObject') assetCounts.ole++;
      });
    });

    // Enhanced complexity calculation
    const totalAssets = Object.values(assetCounts).reduce((a, b) => a + b, 0);
    const avgAssetsPerSlide = totalAssets / Math.max(slides.length, 1);
    const avgShapesPerSlide = slides.reduce((sum, slide) => sum + (slide.shapes?.length || 0), 0) / slides.length;
    
    let complexity: 'simple' | 'moderate' | 'complex' = 'simple';
    if (avgAssetsPerSlide > 2 || avgShapesPerSlide > 8 || slides.length > 25) {
      complexity = 'complex';
    } else if (avgAssetsPerSlide > 0.5 || avgShapesPerSlide > 4 || slides.length > 12) {
      complexity = 'moderate';
    }

    // Enhanced reading time calculation
    const totalWords = slides.reduce((total, slide) => {
      return total + (slide.shapes || []).reduce((slideWords, shape) => {
        if (shape.TextFrame?.text) {
          return slideWords + shape.TextFrame.text.split(/\s+/).length;
        }
        return slideWords;
      }, 0);
    }, 0);
    
    const estimatedReadingTime = Math.max(1, Math.ceil(totalWords / 150 + slides.length * 0.5));

    // Enhanced accessibility analysis
    const accessibility = {
      hasAltText: slides.some(slide => 
        slide.shapes?.some(shape => shape.alternativeText)
      ),
      colorContrast: 'unknown', // Would need color analysis
      fontReadability: 'unknown', // Would need font analysis
      hasHeadings: slides.some(slide =>
        slide.shapes?.some(shape => 
          shape.TextFrame && shape.shapeType === 'Placeholder'
        )
      ),
    };

    const analytics: PresentationAnalytics = {
      totalSlides: slides.length,
      slideTypes,
      totalAssets: Object.entries(assetCounts).map(([type, count]) => ({
        type: type as any,
        count,
        items: [], // Detailed items would come from assets API
      })),
      complexity,
      estimatedReadingTime,
      accessibility,
      performance: {
        loadTime: state.loadTime || 0,
        cacheHit: state.cacheHit,
      },
    };

    updateState({ analytics });
    return analytics;
  }, [state.universalJson, state.id, state.loadTime, state.cacheHit, updateState]);

  // Enhanced slide analysis
  const analyzeSlide = useCallback((slideIndex: number): SlideAnalysis | null => {
    if (!state.universalJson?.slides[slideIndex]) return null;

    const slide = state.universalJson.slides[slideIndex];
    const shapes = slide.shapes || [];

    // Enhanced classification
    const textShapes = shapes.filter(shape => shape.TextFrame);
    const assetShapes = shapes.filter(shape => 
      shape.Picture || shape.Chart || shape.Table || shape.Video || shape.Audio
    );

    let type: SlideAnalysis['type'] = 'content';
    let confidence = 0.8;

    if (slideIndex === 0) {
      type = 'title';
      confidence = 0.95;
    } else if (assetShapes.length > textShapes.length) {
      if (shapes.some(shape => shape.Chart)) {
        type = 'chart';
        confidence = 0.9;
      } else if (shapes.some(shape => shape.Picture)) {
        type = 'image';
        confidence = 0.85;
      } else {
        type = 'mixed';
        confidence = 0.7;
      }
    } else if (textShapes.length > 3) {
      type = 'mixed';
      confidence = 0.75;
    }

    // Extract enhanced content
    const mainContent = textShapes
      .map(shape => shape.TextFrame?.text || '')
      .filter(text => text.length > 0)
      .join(' ')
      .substring(0, 300);

    // Enhanced complexity assessment
    const totalElements = shapes.length;
    const assetCount = assetShapes.length;
    const wordCount = mainContent.split(/\s+/).length;
    
    let complexity: 'simple' | 'moderate' | 'complex' = 'simple';
    if (totalElements > 8 || assetCount > 3 || wordCount > 200) {
      complexity = 'complex';
    } else if (totalElements > 4 || assetCount > 1 || wordCount > 100) {
      complexity = 'moderate';
    }

    // Extract asset information
    const assets = assetShapes.map(shape => ({
      type: shape.Picture ? 'image' : 
            shape.Chart ? 'chart' :
            shape.Table ? 'table' :
            shape.Video ? 'video' :
            shape.Audio ? 'audio' : 'unknown',
      id: shape.name || `shape-${Math.random()}`,
      properties: {
        width: shape.width,
        height: shape.height,
        x: shape.x,
        y: shape.y,
      },
    }));

    return {
      slideIndex,
      type,
      confidence,
      mainContent,
      assets,
      complexity,
      wordCount,
      elementCount: totalElements,
    };
  }, [state.universalJson]);

  // Regenerate thumbnails
  const regenerateThumbnails = useCallback(async (): Promise<boolean> => {
    if (!state.id) return false;

    try {
      const response = await fetch(`/api/v1/presentations/${state.id}/thumbnails`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to regenerate thumbnails');
      }

      const data = await response.json();
      if (data.success) {
        // Reload thumbnails
        const thumbnails = await loadThumbnails(state.id);
        updateState({ thumbnails });
        
        toast({
          title: "Thumbnails Generated",
          description: "Slide thumbnails have been regenerated successfully.",
        });
        
        return true;
      }
      
      throw new Error(data.error || 'Generation failed');
    } catch (error) {
      console.error('Failed to regenerate thumbnails:', error);
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : 'Failed to generate thumbnails',
        variant: "destructive",
      });
      return false;
    }
  }, [state.id, updateState, toast]);

  // Export presentation
  const exportPresentation = useCallback(async (
    format: 'pdf' | 'pptx' | 'html',
    options: any = {}
  ): Promise<string | null> => {
    if (!state.id) return null;

    try {
      const response = await api.presentations.export(state.id, {
        format,
        ...options,
      });

      if (response.success && response.data) {
        toast({
          title: "Export Ready",
          description: `Your ${format.toUpperCase()} export is ready for download.`,
        });
        
        return response.data.downloadUrl;
      }
      
      throw new Error(response.error || 'Export failed');
    } catch (error) {
      console.error('Export failed:', error);
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : 'Export operation failed',
        variant: "destructive",
      });
      return null;
    }
  }, [state.id, toast]);

  // Clear state
  const clear = useCallback(() => {
    setState(initialState);
  }, []);

  // Reset error
  const resetError = useCallback(() => {
    updateState({ error: null });
  }, [updateState]);

  // Auto-generate analytics when presentation loads
  useEffect(() => {
    if (state.universalJson && !state.analytics && !state.isLoading) {
      generateAnalytics();
    }
  }, [state.universalJson, state.analytics, state.isLoading, generateAnalytics]);

  return {
    state,
    loadPresentation,
    convertPptx,
    refreshPresentation,
    getSlide,
    getShape,
    updateSlide,
    deleteSlide,
    generateAnalytics,
    analyzeSlide,
    regenerateThumbnails,
    exportPresentation,
    clear,
    resetError,
  };
} 