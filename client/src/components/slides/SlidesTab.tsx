/**
 * Slides Tab - Screaming Architecture Frontend
 * 🎯 RESPONSIBILITY: Individual slide exploration and analysis
 * 📋 SCOPE: Slide-by-slide view, thumbnails, content details
 */

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Eye,
  Image,
  Video,
  Music,
  BarChart3,
  Grid,
  FileText,
  Clock,
  Layers,
  Palette,
  Play,
  Pause,
  Download,
} from 'lucide-react';

import { UniversalPresentation, UniversalSlide, UniversalShape } from '@/types/universal-json';
import { formatDuration } from '@/lib/formatters/formatDate';

interface SlidesTabProps {
  presentation: UniversalPresentation;
  thumbnails?: Array<{
    slideIndex: number;
    url: string;
    filename: string;
  }>;
}

export function SlidesTab({ presentation, thumbnails }: SlidesTabProps) {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const slides = presentation.slides || [];
  const currentSlide = slides[currentSlideIndex];

  // Filter slides based on search
  const filteredSlides = useMemo(() => {
    if (!searchTerm) return slides;

    return slides.filter((slide, index) => {
      const searchLower = searchTerm.toLowerCase();
      return (
        slide.name.toLowerCase().includes(searchLower) ||
        (slide.shapes || []).some(shape => 
          shape.TextFrame?.text.toLowerCase().includes(searchLower)
        ) ||
        index.toString().includes(searchTerm)
      );
    });
  }, [slides, searchTerm]);

  const slideAnalysis = useMemo(() => {
    if (!currentSlide) return null;
    return analyzeSlide(currentSlide, currentSlideIndex);
  }, [currentSlide, currentSlideIndex]);

  const goToPrevSlide = () => {
    setCurrentSlideIndex(prev => Math.max(0, prev - 1));
  };

  const goToNextSlide = () => {
    setCurrentSlideIndex(prev => Math.min(slides.length - 1, prev + 1));
  };

  const goToSlide = (index: number) => {
    setCurrentSlideIndex(index);
  };

  return (
    <div className="flex h-full">
      {/* Left Panel - Slide Navigator */}
      <div className="w-80 border-r border-gray-200 bg-gray-50">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Slides</h3>
            <div className="flex items-center space-x-1">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <FileText className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search slides..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="mt-2 text-sm text-gray-600">
            {filteredSlides.length} of {slides.length} slides
          </div>
        </div>

        <div className="overflow-auto h-[calc(100%-140px)]">
          {viewMode === 'grid' ? (
            <SlideGrid
              slides={filteredSlides}
              thumbnails={thumbnails}
              currentSlideIndex={currentSlideIndex}
              onSlideSelect={goToSlide}
            />
          ) : (
            <SlideList
              slides={filteredSlides}
              currentSlideIndex={currentSlideIndex}
              onSlideSelect={goToSlide}
            />
          )}
        </div>
      </div>

      {/* Right Panel - Slide Details */}
      <div className="flex-1 flex flex-col">
        {currentSlide ? (
          <>
            {/* Header */}
            <div className="p-4 border-b border-gray-200 bg-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={goToPrevSlide}
                      disabled={currentSlideIndex === 0}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-sm font-medium">
                      Slide {currentSlideIndex + 1} of {slides.length}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={goToNextSlide}
                      disabled={currentSlideIndex === slides.length - 1}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="text-lg font-semibold">{currentSlide.name}</div>
                </div>

                <div className="flex items-center space-x-2">
                  {slideAnalysis && (
                    <Badge variant="outline">
                      {slideAnalysis.type}
                    </Badge>
                  )}
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-1" />
                    Export
                  </Button>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto">
              <Tabs defaultValue="overview" className="h-full">
                <TabsList className="w-full justify-start border-b rounded-none">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="content">Content</TabsTrigger>
                  <TabsTrigger value="assets">Assets</TabsTrigger>
                  <TabsTrigger value="animation">Animation</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="p-4 space-y-4">
                  <SlideOverview 
                    slide={currentSlide} 
                    analysis={slideAnalysis}
                    thumbnail={thumbnails?.find(t => t.slideIndex === currentSlideIndex)}
                  />
                </TabsContent>

                <TabsContent value="content" className="p-4">
                  <SlideContent slide={currentSlide} />
                </TabsContent>

                <TabsContent value="assets" className="p-4">
                  <SlideAssets slide={currentSlide} slideIndex={currentSlideIndex} />
                </TabsContent>

                <TabsContent value="animation" className="p-4">
                  <SlideAnimations slide={currentSlide} />
                </TabsContent>
              </Tabs>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <FileText className="w-12 h-12 mx-auto mb-2" />
              <p>No slide selected</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Slide Grid Component
function SlideGrid({ 
  slides, 
  thumbnails, 
  currentSlideIndex, 
  onSlideSelect 
}: {
  slides: UniversalSlide[];
  thumbnails?: Array<{ slideIndex: number; url: string; filename: string }>;
  currentSlideIndex: number;
  onSlideSelect: (index: number) => void;
}) {
  return (
    <div className="p-2 grid grid-cols-2 gap-2">
      {slides.map((slide, index) => {
        const thumbnail = thumbnails?.find(t => t.slideIndex === index);
        const isSelected = index === currentSlideIndex;

        return (
          <div
            key={slide.slideId}
            className={`
              p-2 border rounded-lg cursor-pointer transition-all hover:border-blue-300
              ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}
            `}
            onClick={() => onSlideSelect(index)}
          >
            <div className="aspect-video bg-gray-100 rounded mb-2 flex items-center justify-center">
              {thumbnail ? (
                <img 
                  src={thumbnail.url} 
                  alt={`Slide ${index + 1}`}
                  className="w-full h-full object-contain rounded"
                />
              ) : (
                <FileText className="w-6 h-6 text-gray-400" />
              )}
            </div>
            <div className="text-xs font-medium truncate">{slide.name}</div>
            <div className="text-xs text-gray-500">
              {(slide.shapes || []).length} shapes
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Slide List Component  
function SlideList({ slides, currentSlideIndex, onSlideSelect }: {
  slides: UniversalSlide[];
  currentSlideIndex: number;
  onSlideSelect: (index: number) => void;
}) {
  return (
    <div className="p-2 space-y-1">
      {slides.map((slide, index) => {
        const isSelected = index === currentSlideIndex;
        const shapeCount = (slide.shapes || []).length;
        const hasContent = slide.shapes?.some(shape => shape.TextFrame?.text);

        return (
          <div
            key={slide.slideId}
            className={`
              p-3 border rounded-lg cursor-pointer transition-all hover:border-blue-300
              ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}
            `}
            onClick={() => onSlideSelect(index)}
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center text-xs font-medium">
                {index + 1}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{slide.name}</div>
                <div className="text-xs text-gray-500">
                  {shapeCount} shapes
                  {hasContent && ' • Has text'}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Slide Overview Component
function SlideOverview({ 
  slide, 
  analysis, 
  thumbnail 
}: {
  slide: UniversalSlide;
  analysis: any;
  thumbnail?: { slideIndex: number; url: string; filename: string };
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div>
        <Card>
          <CardHeader>
            <CardTitle>Slide Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
              {thumbnail ? (
                <img 
                  src={thumbnail.url} 
                  alt={slide.name}
                  className="w-full h-full object-contain rounded-lg"
                />
              ) : (
                <div className="text-center text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-2" />
                  <p className="text-sm">No thumbnail available</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Properties</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Slide ID</label>
                <div className="text-sm text-gray-600">{slide.slideId}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Index</label>
                <div className="text-sm text-gray-600">{slide.slideIndex}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Hidden</label>
                <div className="text-sm text-gray-600">{slide.hidden ? 'Yes' : 'No'}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Shapes</label>
                <div className="text-sm text-gray-600">{(slide.shapes || []).length}</div>
              </div>
            </div>

            {analysis && (
              <div className="pt-3 border-t">
                <label className="text-sm font-medium text-gray-700">Analysis</label>
                <div className="mt-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Type</span>
                    <Badge variant="outline">{analysis.type}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Complexity</span>
                    <Badge variant="outline">{analysis.complexity}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Assets</span>
                    <span className="text-sm text-gray-600">{analysis.assetCount}</span>
                  </div>
                </div>
              </div>
            )}

            {slide.timing && (
              <div className="pt-3 border-t">
                <label className="text-sm font-medium text-gray-700">Timing</label>
                <div className="mt-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">Advance on click</span>
                    <span className="text-xs text-gray-600">
                      {slide.timing.advanceOnClick ? 'Yes' : 'No'}
                    </span>
                  </div>
                  {slide.timing.advanceAfter && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">Auto advance</span>
                      <span className="text-xs text-gray-600">
                        {formatDuration(slide.timing.advanceAfterTime)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Slide Content Component
function SlideContent({ slide }: { slide: UniversalSlide }) {
  const textShapes = (slide.shapes || []).filter(shape => shape.TextFrame);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Text Content</CardTitle>
          <div className="text-sm text-gray-600">{textShapes.length} text shapes</div>
        </CardHeader>
        <CardContent>
          {textShapes.length > 0 ? (
            <div className="space-y-4">
              {textShapes.map((shape, index) => (
                <div key={index} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Shape {shape.shapeIndex + 1}</span>
                    <Badge variant="outline" className="text-xs">
                      {shape.shapeType}
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-700 whitespace-pre-wrap">
                    {shape.TextFrame?.text || 'No text content'}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              <FileText className="w-8 h-8 mx-auto mb-2" />
              <p>No text content found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Slide Assets Component
function SlideAssets({ slide, slideIndex }: { slide: UniversalSlide; slideIndex: number }) {
  const assets = extractAssetsFromSlide(slide, slideIndex);

  return (
    <div className="space-y-4">
      {assets.length > 0 ? (
        assets.map((asset, index) => (
          <Card key={index}>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                {getAssetIcon(asset.type)}
                <span>{asset.name}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="font-medium text-gray-700">Type</label>
                  <div className="text-gray-600">{asset.type}</div>
                </div>
                <div>
                  <label className="font-medium text-gray-700">Position</label>
                  <div className="text-gray-600">
                    ({Math.round(asset.metadata.shapePosition.x)}, {Math.round(asset.metadata.shapePosition.y)})
                  </div>
                </div>
                <div>
                  <label className="font-medium text-gray-700">Size</label>
                  <div className="text-gray-600">
                    {Math.round(asset.metadata.shapeSize.width)} × {Math.round(asset.metadata.shapeSize.height)}
                  </div>
                </div>
                {asset.dimensions && (
                  <div>
                    <label className="font-medium text-gray-700">Original Size</label>
                    <div className="text-gray-600">
                      {asset.dimensions.width} × {asset.dimensions.height}
                    </div>
                  </div>
                )}
              </div>
              {asset.metadata.alternativeText && (
                <div className="mt-3 pt-3 border-t">
                  <label className="font-medium text-gray-700 text-sm">Alt Text</label>
                  <div className="text-gray-600 text-sm">{asset.metadata.alternativeText}</div>
                </div>
              )}
            </CardContent>
          </Card>
        ))
      ) : (
        <div className="text-center text-gray-500 py-8">
          <Image className="w-8 h-8 mx-auto mb-2" />
          <p>No assets found in this slide</p>
        </div>
      )}
    </div>
  );
}

// Slide Animations Component
function SlideAnimations({ slide }: { slide: UniversalSlide }) {
  const animations = slide.animations || [];

  return (
    <div className="space-y-4">
      {animations.length > 0 ? (
        animations.map((animation, index) => (
          <Card key={index}>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Play className="w-4 h-4" />
                <span>Animation {index + 1}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="font-medium text-gray-700">Type</label>
                  <div className="text-gray-600">{animation.type}</div>
                </div>
                <div>
                  <label className="font-medium text-gray-700">Effect</label>
                  <div className="text-gray-600">{animation.effect}</div>
                </div>
                <div>
                  <label className="font-medium text-gray-700">Trigger</label>
                  <div className="text-gray-600">{animation.trigger}</div>
                </div>
                <div>
                  <label className="font-medium text-gray-700">Duration</label>
                  <div className="text-gray-600">{formatDuration(animation.duration)}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      ) : (
        <div className="text-center text-gray-500 py-8">
          <Play className="w-8 h-8 mx-auto mb-2" />
          <p>No animations found</p>
        </div>
      )}
    </div>
  );
}

// Helper Functions
function extractAssetsFromSlide(slide: UniversalSlide, slideIndex: number) {
  const assets: any[] = [];
  
  (slide.shapes || []).forEach((shape, shapeIndex) => {
    if (shape.Picture) {
      assets.push({
        type: 'image',
        name: shape.Picture.filename || `Image ${shapeIndex + 1}`,
        metadata: {
          shapePosition: { x: shape.X, y: shape.Y },
          shapeSize: { width: shape.Width, height: shape.Height },
          alternativeText: shape.alternativeText,
        },
        dimensions: {
          width: shape.Picture.originalWidth,
          height: shape.Picture.originalHeight,
        },
      });
    }
    
    if (shape.Video) {
      assets.push({
        type: 'video',
        name: shape.Video.filename || `Video ${shapeIndex + 1}`,
        metadata: {
          shapePosition: { x: shape.X, y: shape.Y },
          shapeSize: { width: shape.Width, height: shape.Height },
          alternativeText: shape.alternativeText,
          duration: shape.Video.duration,
        },
        dimensions: {
          width: shape.Video.width,
          height: shape.Video.height,
        },
      });
    }
    
    if (shape.Chart) {
      assets.push({
        type: 'chart',
        name: shape.Chart.title || `Chart ${shapeIndex + 1}`,
        metadata: {
          shapePosition: { x: shape.X, y: shape.Y },
          shapeSize: { width: shape.Width, height: shape.Height },
          alternativeText: shape.alternativeText,
          chartType: shape.Chart.chartType,
        },
      });
    }
  });
  
  return assets;
}

function analyzeSlide(slide: UniversalSlide, slideIndex: number) {
  const shapes = slide.shapes || [];
  const textShapes = shapes.filter(shape => shape.TextFrame);
  const hasChart = shapes.some(shape => shape.Chart);
  const hasTable = shapes.some(shape => shape.Table);
  const hasImage = shapes.some(shape => shape.Picture);
  const assets = extractAssetsFromSlide(slide, slideIndex);

  let type = 'content';
  if (slideIndex === 0) type = 'title';
  else if (hasChart) type = 'chart';
  else if (hasTable) type = 'table';
  else if (hasImage && textShapes.length === 0) type = 'image';
  else if (textShapes.length > 3) type = 'text-heavy';

  let complexity = 'simple';
  if (assets.length > 2 || shapes.length > 6) complexity = 'complex';
  else if (assets.length > 0 || shapes.length > 3) complexity = 'moderate';

  return {
    type,
    complexity,
    assetCount: assets.length,
    shapeCount: shapes.length,
    textShapeCount: textShapes.length,
  };
}

function getAssetIcon(type: string) {
  switch (type) {
    case 'image': return <Image className="w-4 h-4" />;
    case 'video': return <Video className="w-4 h-4" />;
    case 'audio': return <Music className="w-4 h-4" />;
    case 'chart': return <BarChart3 className="w-4 h-4" />;
    default: return <FileText className="w-4 h-4" />;
  }
} 