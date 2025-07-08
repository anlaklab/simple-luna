/**
 * Assets Extractor - Screaming Architecture Frontend
 * 🎯 RESPONSIBILITY: Extract and categorize assets from Universal JSON
 * 📋 SCOPE: Images, videos, audio, charts, tables, OLE objects
 */

import { UniversalPresentation, UniversalSlide, UniversalShape, AssetSummary } from '@/types/universal-json';

export interface ExtractedAsset {
  id: string;
  type: 'image' | 'video' | 'audio' | 'chart' | 'table' | 'ole';
  name: string;
  slideIndex: number;
  shapeIndex: number;
  mimeType?: string;
  filename?: string;
  size?: number;
  dimensions?: { width: number; height: number };
  duration?: number;
  base64?: string;
  url?: string;
  metadata: Record<string, any>;
}

export interface AssetExtraction {
  totalAssets: number;
  assetsByType: Record<string, ExtractedAsset[]>;
  assetsBySlide: Record<number, ExtractedAsset[]>;
  summary: AssetSummary[];
}

// Extract all assets from presentation
export function extractAllAssets(presentation: UniversalPresentation): AssetExtraction {
  const allAssets: ExtractedAsset[] = [];
  const assetsByType: Record<string, ExtractedAsset[]> = {
    image: [],
    video: [],
    audio: [],
    chart: [],
    table: [],
    ole: [],
  };
  const assetsBySlide: Record<number, ExtractedAsset[]> = {};

  // Process each slide
  presentation.slides?.forEach((slide, slideIndex) => {
    const slideAssets: ExtractedAsset[] = [];
    
    slide.shapes?.forEach((shape, shapeIndex) => {
      const extractedAssets = extractAssetsFromShape(shape, slideIndex, shapeIndex);
      slideAssets.push(...extractedAssets);
      allAssets.push(...extractedAssets);
      
      // Group by type
      extractedAssets.forEach(asset => {
        assetsByType[asset.type].push(asset);
      });
    });
    
    if (slideAssets.length > 0) {
      assetsBySlide[slideIndex] = slideAssets;
    }
  });

  // Create summary
  const summary: AssetSummary[] = Object.entries(assetsByType).map(([type, assets]) => ({
    type: type as AssetSummary['type'],
    count: assets.length,
    totalSize: assets.reduce((sum, asset) => sum + (asset.size || 0), 0),
    items: assets.map(asset => ({
      slideIndex: asset.slideIndex,
      shapeIndex: asset.shapeIndex,
      name: asset.name,
      details: asset.metadata,
    })),
  }));

  return {
    totalAssets: allAssets.length,
    assetsByType,
    assetsBySlide,
    summary,
  };
}

// Extract assets from a single shape
function extractAssetsFromShape(
  shape: UniversalShape, 
  slideIndex: number, 
  shapeIndex: number
): ExtractedAsset[] {
  const assets: ExtractedAsset[] = [];

  // Images
  if (shape.Picture) {
    assets.push({
      id: `slide-${slideIndex}-shape-${shapeIndex}-image`,
      type: 'image',
      name: shape.Picture.filename || `Image ${shapeIndex + 1}`,
      slideIndex,
      shapeIndex,
      mimeType: shape.Picture.mimeType,
      filename: shape.Picture.filename,
      dimensions: {
        width: shape.Picture.originalWidth,
        height: shape.Picture.originalHeight,
      },
      base64: shape.Picture.base64,
      metadata: {
        originalWidth: shape.Picture.originalWidth,
        originalHeight: shape.Picture.originalHeight,
        cropLeft: shape.Picture.cropLeft,
        cropRight: shape.Picture.cropRight,
        cropTop: shape.Picture.cropTop,
        cropBottom: shape.Picture.cropBottom,
        shapePosition: { x: shape.X, y: shape.Y },
        shapeSize: { width: shape.Width, height: shape.Height },
        alternativeText: shape.alternativeText,
      },
    });
  }

  // Videos
  if (shape.Video) {
    assets.push({
      id: `slide-${slideIndex}-shape-${shapeIndex}-video`,
      type: 'video',
      name: shape.Video.filename || `Video ${shapeIndex + 1}`,
      slideIndex,
      shapeIndex,
      mimeType: shape.Video.mimeType,
      filename: shape.Video.filename,
      duration: shape.Video.duration,
      dimensions: {
        width: shape.Video.width,
        height: shape.Video.height,
      },
      base64: shape.Video.base64,
      metadata: {
        duration: shape.Video.duration,
        thumbnail: shape.Video.thumbnail,
        shapePosition: { x: shape.X, y: shape.Y },
        shapeSize: { width: shape.Width, height: shape.Height },
        alternativeText: shape.alternativeText,
      },
    });
  }

  // Audio
  if (shape.Audio) {
    assets.push({
      id: `slide-${slideIndex}-shape-${shapeIndex}-audio`,
      type: 'audio',
      name: shape.Audio.filename || `Audio ${shapeIndex + 1}`,
      slideIndex,
      shapeIndex,
      mimeType: shape.Audio.mimeType,
      filename: shape.Audio.filename,
      duration: shape.Audio.duration,
      base64: shape.Audio.base64,
      metadata: {
        duration: shape.Audio.duration,
        shapePosition: { x: shape.X, y: shape.Y },
        shapeSize: { width: shape.Width, height: shape.Height },
        alternativeText: shape.alternativeText,
      },
    });
  }

  // Charts
  if (shape.Chart) {
    assets.push({
      id: `slide-${slideIndex}-shape-${shapeIndex}-chart`,
      type: 'chart',
      name: shape.Chart.title || `Chart ${shapeIndex + 1}`,
      slideIndex,
      shapeIndex,
      metadata: {
        chartType: shape.Chart.chartType,
        hasTitle: shape.Chart.hasTitle,
        title: shape.Chart.title,
        hasLegend: shape.Chart.hasLegend,
        legendPosition: shape.Chart.legendPosition,
        categoriesCount: shape.Chart.categories?.length || 0,
        seriesCount: shape.Chart.series?.length || 0,
        categories: shape.Chart.categories,
        series: shape.Chart.series?.map(s => ({
          name: s.name,
          valueCount: s.values?.length || 0,
        })),
        plotArea: shape.Chart.plotArea,
        shapePosition: { x: shape.X, y: shape.Y },
        shapeSize: { width: shape.Width, height: shape.Height },
        alternativeText: shape.alternativeText,
      },
    });
  }

  // Tables
  if (shape.Table) {
    assets.push({
      id: `slide-${slideIndex}-shape-${shapeIndex}-table`,
      type: 'table',
      name: `Table ${shapeIndex + 1}`,
      slideIndex,
      shapeIndex,
      metadata: {
        rowCount: shape.Table.rows?.length || 0,
        columnCount: shape.Table.columns?.length || 0,
        firstRow: shape.Table.firstRow,
        firstCol: shape.Table.firstCol,
        lastRow: shape.Table.lastRow,
        lastCol: shape.Table.lastCol,
        bandRows: shape.Table.bandRows,
        bandCols: shape.Table.bandCols,
        cellData: shape.Table.rows?.map((row, rowIndex) => 
          row.cells?.map((cell, colIndex) => ({
            row: rowIndex,
            col: colIndex,
            text: cell.text,
            colSpan: cell.colSpan,
            rowSpan: cell.rowSpan,
          }))
        ),
        shapePosition: { x: shape.X, y: shape.Y },
        shapeSize: { width: shape.Width, height: shape.Height },
        alternativeText: shape.alternativeText,
      },
    });
  }

  // OLE Objects
  if (shape.shapeType === 'OleObject') {
    assets.push({
      id: `slide-${slideIndex}-shape-${shapeIndex}-ole`,
      type: 'ole',
      name: shape.name || `OLE Object ${shapeIndex + 1}`,
      slideIndex,
      shapeIndex,
      metadata: {
        shapeType: shape.shapeType,
        shapePosition: { x: shape.X, y: shape.Y },
        shapeSize: { width: shape.Width, height: shape.Height },
        alternativeText: shape.alternativeText,
        fillFormat: shape.FillFormat,
        effectFormat: shape.EffectFormat,
      },
    });
  }

  return assets;
}

// Get assets by type
export function getAssetsByType(
  presentation: UniversalPresentation, 
  type: ExtractedAsset['type']
): ExtractedAsset[] {
  const extraction = extractAllAssets(presentation);
  return extraction.assetsByType[type] || [];
}

// Get assets by slide
export function getAssetsBySlide(
  presentation: UniversalPresentation, 
  slideIndex: number
): ExtractedAsset[] {
  const extraction = extractAllAssets(presentation);
  return extraction.assetsBySlide[slideIndex] || [];
}

// Check if presentation has assets of specific type
export function hasAssetsOfType(
  presentation: UniversalPresentation, 
  type: ExtractedAsset['type']
): boolean {
  return getAssetsByType(presentation, type).length > 0;
}

// Get asset statistics
export function getAssetStatistics(presentation: UniversalPresentation) {
  const extraction = extractAllAssets(presentation);
  
  return {
    totalAssets: extraction.totalAssets,
    typeBreakdown: Object.entries(extraction.assetsByType).reduce((acc, [type, assets]) => {
      acc[type] = {
        count: assets.length,
        percentage: extraction.totalAssets > 0 
          ? Math.round((assets.length / extraction.totalAssets) * 100) 
          : 0,
      };
      return acc;
    }, {} as Record<string, { count: number; percentage: number }>),
    slidesWithAssets: Object.keys(extraction.assetsBySlide).length,
    averageAssetsPerSlide: extraction.totalAssets / Math.max(presentation.slides?.length || 1, 1),
  };
} 