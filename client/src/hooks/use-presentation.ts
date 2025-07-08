/**
 * Presentation Hook - Screaming Architecture Frontend
 * 🎯 RESPONSIBILITY: Presentation data management and state
 * 📋 SCOPE: Loading, caching, Universal JSON Schema handling
 */

import { useState, useEffect, useCallback } from 'react';
import { UniversalPresentation, PresentationAnalytics, SlideAnalysis } from '@/types/universal-json';
import { api } from './use-api';

export interface PresentationState {
  // Core data
  id: string | null;
  universalJson: UniversalPresentation | null;
  
  // Loading states
  isLoading: boolean;
  isConverting: boolean;
  error: string | null;
  
  // Processed data
  analytics: PresentationAnalytics | null;
  slideAnalyses: SlideAnalysis[];
  
  // Thumbnails
  thumbnails: Array<{
    slideIndex: number;
    url: string;
    filename: string;
  }>;
  
  // Metadata
  lastUpdated: string | null;
  version: string | null;
}

export interface UsePresentation {
  // State
  state: PresentationState;
  
  // Actions
  loadPresentation: (id: string) => Promise<void>;
  convertPptx: (file: File) => Promise<string | null>;
  refreshPresentation: () => Promise<void>;
  
  // Universal JSON operations
  getSlide: (slideIndex: number) => Promise<any>;
  getShape: (slideIndex: number, shapeIndex: number) => Promise<any>;
  
  // Analytics
  generateAnalytics: () => PresentationAnalytics | null;
  analyzeSlide: (slideIndex: number) => SlideAnalysis | null;
  
  // Clear state
  clear: () => void;
}

const initialState: PresentationState = {
  id: null,
  universalJson: null,
  isLoading: false,
  isConverting: false,
  error: null,
  analytics: null,
  slideAnalyses: [],
  thumbnails: [],
  lastUpdated: null,
  version: null,
};

export function usePresentation(): UsePresentation {
  const [state, setState] = useState<PresentationState>(initialState);

  // Update state helper
  const updateState = useCallback((updates: Partial<PresentationState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // Load presentation by ID
  const loadPresentation = useCallback(async (id: string) => {
    updateState({ 
      isLoading: true, 
      error: null, 
      id 
    });

    try {
      // Get Universal JSON from API
      const jsonResponse = await api.json.getFull(id);
      
      if (!jsonResponse.success || !jsonResponse.data) {
        throw new Error(jsonResponse.error || 'Failed to load presentation JSON');
      }

      const universalJson = jsonResponse.data;

      // Get thumbnails if available
      let thumbnails: typeof state.thumbnails = [];
      try {
        const thumbResponse = await api.conversion.generateThumbnails(
          new File([], `${id}.pptx`), // Mock file for now
          {
            formats: ['png'],
            sizes: [
              { width: 320, height: 240, name: 'small' },
              { width: 640, height: 480, name: 'medium' },
            ],
          }
        );

        if (thumbResponse.success && thumbResponse.data?.thumbnails) {
          thumbnails = thumbResponse.data.thumbnails.map((thumb: any, index: number) => ({
            slideIndex: index,
            url: thumb.url || `/temp/thumbnails/${thumb.filename}`,
            filename: thumb.filename,
          }));
        }
      } catch (thumbError) {
        console.warn('Failed to load thumbnails:', thumbError);
      }

      updateState({
        universalJson,
        thumbnails,
        isLoading: false,
        lastUpdated: new Date().toISOString(),
        version: universalJson.metadata?.version || '1.0',
      });

    } catch (error) {
      console.error('Failed to load presentation:', error);
      updateState({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load presentation',
      });
    }
  }, [updateState]);

  // Convert PPTX file to Universal JSON
  const convertPptx = useCallback(async (file: File): Promise<string | null> => {
    updateState({ 
      isConverting: true, 
      error: null 
    });

    try {
      const response = await api.conversion.pptxToJson(file, {
        includeAssets: true,
        includeHidden: false,
      });

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Conversion failed');
      }

      const universalJson = response.data.presentation;
      const presentationId = universalJson.id;

      updateState({
        id: presentationId,
        universalJson,
        isConverting: false,
        lastUpdated: new Date().toISOString(),
        version: '1.0',
      });

      return presentationId;

    } catch (error) {
      console.error('PPTX conversion failed:', error);
      updateState({
        isConverting: false,
        error: error instanceof Error ? error.message : 'Conversion failed',
      });
      return null;
    }
  }, [updateState]);

  // Refresh current presentation
  const refreshPresentation = useCallback(async () => {
    if (state.id) {
      await loadPresentation(state.id);
    }
  }, [state.id, loadPresentation]);

  // Get specific slide data
  const getSlide = useCallback(async (slideIndex: number) => {
    if (!state.id) return null;

    try {
      const response = await api.json.getSlide(state.id, slideIndex);
      return response.success ? response.data : null;
    } catch (error) {
      console.error('Failed to get slide:', error);
      return null;
    }
  }, [state.id]);

  // Get specific shape data
  const getShape = useCallback(async (slideIndex: number, shapeIndex: number) => {
    if (!state.id) return null;

    try {
      const response = await api.json.getShape(state.id, slideIndex, shapeIndex);
      return response.success ? response.data : null;
    } catch (error) {
      console.error('Failed to get shape:', error);
      return null;
    }
  }, [state.id]);

  // Generate presentation analytics
  const generateAnalytics = useCallback((): PresentationAnalytics | null => {
    if (!state.universalJson) return null;

    const presentation = state.universalJson;
    const slides = presentation.slides || [];
    
    // Count asset types
    const assetCounts = {
      image: 0,
      video: 0,
      audio: 0,
      chart: 0,
      table: 0,
      ole: 0,
    };

    // Analyze slide types
    const slideTypes: Record<string, number> = {};
    
    slides.forEach(slide => {
      // Determine slide type based on content
      const shapes = slide.shapes || [];
      const hasTitle = shapes.some(shape => 
        shape.shapeType === 'Placeholder' || 
        (shape.TextFrame && shape.TextFrame.text.length < 100)
      );
      const hasContent = shapes.some(shape => 
        shape.TextFrame && shape.TextFrame.text.length > 100
      );
      const hasChart = shapes.some(shape => shape.Chart);
      const hasTable = shapes.some(shape => shape.Table);
      const hasImage = shapes.some(shape => shape.Picture);

      let slideType = 'content';
      if (slide.slideIndex === 0) slideType = 'title';
      else if (hasChart) slideType = 'chart';
      else if (hasTable) slideType = 'table';
      else if (hasImage && !hasContent) slideType = 'image';
      else if (hasTitle && !hasContent) slideType = 'section';

      slideTypes[slideType] = (slideTypes[slideType] || 0) + 1;

      // Count assets
      shapes.forEach(shape => {
        if (shape.Picture) assetCounts.image++;
        if (shape.Video) assetCounts.video++;
        if (shape.Audio) assetCounts.audio++;
        if (shape.Chart) assetCounts.chart++;
        if (shape.Table) assetCounts.table++;
        if (shape.shapeType === 'OleObject') assetCounts.ole++;
      });
    });

    // Calculate complexity
    const totalAssets = Object.values(assetCounts).reduce((a, b) => a + b, 0);
    const avgAssetsPerSlide = totalAssets / Math.max(slides.length, 1);
    
    let complexity: 'simple' | 'moderate' | 'complex' = 'simple';
    if (avgAssetsPerSlide > 3 || slides.length > 20) complexity = 'complex';
    else if (avgAssetsPerSlide > 1 || slides.length > 10) complexity = 'moderate';

    // Estimate reading time (rough calculation)
    const totalWords = slides.reduce((total, slide) => {
      return total + (slide.shapes || []).reduce((slideWords, shape) => {
        if (shape.TextFrame) {
          return slideWords + (shape.TextFrame.text.split(' ').length || 0);
        }
        return slideWords;
      }, 0);
    }, 0);
    
    const estimatedReadingTime = Math.ceil(totalWords / 200); // ~200 words per minute

    const analytics: PresentationAnalytics = {
      totalSlides: slides.length,
      slideTypes,
      totalAssets: Object.entries(assetCounts).map(([type, count]) => ({
        type: type as any,
        count,
        items: [], // Would need deeper analysis
      })),
      complexity,
      estimatedReadingTime,
      accessibility: {
        hasAltText: slides.some(slide => 
          slide.shapes?.some(shape => shape.alternativeText)
        ),
        colorContrast: 'good', // Would need color analysis
        fontReadability: 'good', // Would need font analysis
      },
    };

    updateState({ analytics });
    return analytics;
  }, [state.universalJson, updateState]);

  // Analyze individual slide
  const analyzeSlide = useCallback((slideIndex: number): SlideAnalysis | null => {
    if (!state.universalJson || !state.universalJson.slides[slideIndex]) {
      return null;
    }

    const slide = state.universalJson.slides[slideIndex];
    const shapes = slide.shapes || [];

    // Determine slide type and extract main content
    let type: SlideAnalysis['type'] = 'content';
    let mainContent = '';
    let confidence = 0.8;

    const textShapes = shapes.filter(shape => shape.TextFrame);
    const hasChart = shapes.some(shape => shape.Chart);
    const hasTable = shapes.some(shape => shape.Table);
    const hasImage = shapes.some(shape => shape.Picture);

    if (slideIndex === 0) {
      type = 'title';
      confidence = 0.95;
    } else if (hasChart) {
      type = 'chart';
      confidence = 0.9;
    } else if (hasImage && textShapes.length === 0) {
      type = 'image';
      confidence = 0.9;
    } else if (textShapes.length > 2) {
      type = 'mixed';
      confidence = 0.7;
    }

    // Extract main content
    if (textShapes.length > 0) {
      mainContent = textShapes
        .map(shape => shape.TextFrame?.text || '')
        .join(' ')
        .substring(0, 200);
    }

    // Determine complexity
    const assetCount = shapes.filter(shape => 
      shape.Picture || shape.Chart || shape.Table || shape.Video || shape.Audio
    ).length;
    
    let complexity: 'simple' | 'moderate' | 'complex' = 'simple';
    if (assetCount > 2 || shapes.length > 8) complexity = 'complex';
    else if (assetCount > 0 || shapes.length > 4) complexity = 'moderate';

    const analysis: SlideAnalysis = {
      slideIndex,
      type,
      confidence,
      mainContent,
      assets: [], // Would extract detailed asset info
      complexity,
    };

    return analysis;
  }, [state.universalJson]);

  // Clear state
  const clear = useCallback(() => {
    setState(initialState);
  }, []);

  // Auto-generate analytics when universalJson changes
  useEffect(() => {
    if (state.universalJson && !state.analytics) {
      generateAnalytics();
    }
  }, [state.universalJson, state.analytics, generateAnalytics]);

  return {
    state,
    loadPresentation,
    convertPptx,
    refreshPresentation,
    getSlide,
    getShape,
    generateAnalytics,
    analyzeSlide,
    clear,
  };
} 