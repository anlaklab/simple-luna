import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  Layers, 
  MousePointer,
  Palette,
  Type,
  Move,
  RotateCw,
  Zap,
  Image,
  Box,
  AlignLeft,
  Hash,
  Quote,
  ToggleLeft,
  FileText,
  Braces,
  List,
  ChevronDown,
  ChevronUp,
  Search,
  Filter
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Helper functions for decoding technical values
const decodeShapeType = (shapeType: any): string => {
  if (typeof shapeType === 'string') return shapeType;
  
  const shapeTypeMap: Record<number, string> = {
    1: 'Rectangle',
    2: 'RoundRectangle', 
    3: 'Ellipse',
    4: 'Diamond',
    5: 'Triangle',
    6: 'RightTriangle',
    7: 'Parallelogram',
    8: 'Trapezoid',
    9: 'Hexagon',
    10: 'Octagon',
    11: 'Plus',
    12: 'Star',
    13: 'Arrow',
    65: 'LeftArrow',
    66: 'DownArrow',
    67: 'UpArrow',
    68: 'LeftRightArrow',
    69: 'UpDownArrow',
    73: 'Heart',
    99: 'CustomShape'
  };
  
  return shapeTypeMap[shapeType] || `Shape ${shapeType}`;
};

const decodePlaceholderType = (placeholderType: any): string => {
  if (typeof placeholderType === 'string') return placeholderType;
  
  const placeholderTypeMap: Record<number, string> = {
    0: 'None',
    1: 'Title',
    2: 'Body',
    3: 'CenterTitle',
    4: 'Subtitle',
    5: 'DateAndTime',
    6: 'SlideNumber',
    7: 'Footer',
    8: 'Header',
    9: 'Object',
    10: 'Chart',
    11: 'Table',
    12: 'ClipArt',
    13: 'Diagram',
    14: 'Media',
    15: 'SlideImage',
    16: 'Picture'
  };
  
  return placeholderTypeMap[placeholderType] || `Placeholder ${placeholderType}`;
};

const decodeFillType = (fillType: any): string => {
  if (typeof fillType === 'string') return fillType;
  
  const fillTypeMap: Record<number, string> = {
    0: 'NotDefined',
    1: 'NoFill', 
    2: 'Solid',
    3: 'Gradient',
    4: 'Pattern',
    5: 'Picture',
    6: 'Group'
  };
  
  return fillTypeMap[fillType] || `FillType ${fillType}`;
};

const decodeLineStyle = (lineStyle: any): string => {
  if (typeof lineStyle === 'string') return lineStyle;
  
  const lineStyleMap: Record<number, string> = {
    0: 'NotDefined',
    1: 'Single',
    2: 'ThinThin',
    3: 'ThinThick',
    4: 'ThickThin',
    5: 'ThickBetweenThin'
  };
  
  return lineStyleMap[lineStyle] || `LineStyle ${lineStyle}`;
};

// Additional decoders for more enum types
const decodeTextAlignment = (alignment: any): string => {
  if (typeof alignment === 'string') return alignment;
  
  const alignmentMap: Record<number, string> = {
    0: 'Left',
    1: 'Center', 
    2: 'Right',
    3: 'Justify',
    4: 'JustifyLow',
    5: 'Distributed',
    6: 'ThaiDistributed'
  };
  
  return alignmentMap[alignment] || `Alignment ${alignment}`;
};

const decodeAnchoringType = (anchoring: any): string => {
  if (typeof anchoring === 'string') return anchoring;
  
  const anchoringMap: Record<number, string> = {
    0: 'Top',
    1: 'Center',
    2: 'Bottom', 
    3: 'Justify',
    4: 'Distributed'
  };
  
  return anchoringMap[anchoring] || `Anchoring ${anchoring}`;
};

const decodeBulletType = (bulletType: any): string => {
  if (typeof bulletType === 'string') return bulletType;
  
  const bulletMap: Record<number, string> = {
    0: 'None',
    1: 'Symbol',
    2: 'Numbered',
    3: 'Picture'
  };
  
  return bulletMap[bulletType] || `Bullet ${bulletType}`;
};

const decodeCapStyle = (capStyle: any): string => {
  if (typeof capStyle === 'string') return capStyle;
  
  const capMap: Record<number, string> = {
    0: 'Flat',
    1: 'Square', 
    2: 'Round'
  };
  
  return capMap[capStyle] || `Cap ${capStyle}`;
};

const decodeJoinStyle = (joinStyle: any): string => {
  if (typeof joinStyle === 'string') return joinStyle;
  
  const joinMap: Record<number, string> = {
    0: 'Round',
    1: 'Bevel',
    2: 'Miter'
  };
  
  return joinMap[joinStyle] || `Join ${joinStyle}`;
};

const decodeDashStyle = (dashStyle: any): string => {
  if (typeof dashStyle === 'string') return dashStyle;
  
  const dashMap: Record<number, string> = {
    0: 'Solid',
    1: 'Dot',
    2: 'Dash',
    3: 'DashDot',
    4: 'DashDotDot',
    5: 'SystemDash',
    6: 'SystemDot',
    7: 'SystemDashDot'
  };
  
  return dashMap[dashStyle] || `Dash ${dashStyle}`;
};

// Helper to format numeric values and handle -1 cases
const formatNumericValue = (value: any, unit: string = '', defaultValue: string = 'Not Set'): string => {
  if (value === -1 || value === undefined || value === null) return defaultValue;
  if (typeof value === 'number') return `${value}${unit}`;
  return String(value);
};

// Helper to format dimensions with multiple units
const formatDimension = (value: any, showUnits: boolean = true): string => {
  if (value === -1 || value === undefined || value === null) return 'Not Set';
  if (typeof value !== 'number') return String(value);
  
  if (!showUnits) return String(value);
  
  // Convert from EMUs (English Metric Units) if needed
  // 1 point = 12700 EMUs, 1 inch = 914400 EMUs
  const points = value;
  const inches = value / 72; // 72 points per inch
  const cm = inches * 2.54;
  
  return `${points}pt (${inches.toFixed(2)}" / ${cm.toFixed(1)}cm)`;
};

interface SlideData {
  slideId: number;
  slideIndex: number;
  name: string;
  hidden: boolean;
  background: any;
  shapes: ShapeData[];
  notesSlide: any;
  timing: any;
}

interface ShapeData {
  shapeIndex: number;
  name: string;
  shapeType: string;
  alternativeText: string;
  hidden: boolean;
  X: number;
  Y: number;
  Width: number;
  Height: number;
  ZOrderPosition: number;
  rotation: number;
  FillFormat: any;
  LineFormat: any;
  EffectFormat: any;
  ThreeDFormat: any;
  TextFrame: any;
  HyperlinkClick: any;
  HyperlinkMouseOver: any;
  placeholderData?: any;
  autoShapeData?: any;
  groupData?: any;
  chartType?: string;
  chartData?: any;
  tableData?: any;
  pictureData?: any;
  videoData?: any;
  audioData?: any;
  oleData?: any;
  smartArtData?: any;
  connectorData?: any;
}

interface IndividualSlideAnalysisProps {
  jsonData: any;
  className?: string;
}

// Helper functions
const getShapeIcon = (shapeType: string) => {
  if (shapeType.includes('Placeholder')) return <Type className="w-4 h-4" />;
  if (shapeType.includes('AutoShape')) return <Box className="w-4 h-4" />;
  if (shapeType === 'Chart') return <Layers className="w-4 h-4" />;
  if (shapeType === 'Table') return <AlignLeft className="w-4 h-4" />;
  if (shapeType === 'PictureFrame') return <Image className="w-4 h-4" />;
  if (shapeType === 'VideoFrame') return <FileText className="w-4 h-4" />;
  if (shapeType === 'AudioFrame') return <FileText className="w-4 h-4" />;
  if (shapeType === 'SmartArt') return <Braces className="w-4 h-4" />;
  if (shapeType === 'GroupShape') return <List className="w-4 h-4" />;
  if (shapeType === 'Connector') return <Move className="w-4 h-4" />;
  return <MousePointer className="w-4 h-4" />;
};

const getShapeColor = (shapeType: string) => {
  if (shapeType.includes('Placeholder')) return 'text-blue-600 bg-blue-50 border-blue-200';
  if (shapeType.includes('AutoShape')) return 'text-green-600 bg-green-50 border-green-200';
  if (shapeType === 'Chart') return 'text-purple-600 bg-purple-50 border-purple-200';
  if (shapeType === 'Table') return 'text-orange-600 bg-orange-50 border-orange-200';
  if (shapeType === 'PictureFrame') return 'text-pink-600 bg-pink-50 border-pink-200';
  if (shapeType === 'VideoFrame') return 'text-red-600 bg-red-50 border-red-200';
  if (shapeType === 'AudioFrame') return 'text-yellow-600 bg-yellow-50 border-yellow-200';
  if (shapeType === 'SmartArt') return 'text-indigo-600 bg-indigo-50 border-indigo-200';
  if (shapeType === 'GroupShape') return 'text-gray-600 bg-gray-50 border-gray-200';
  if (shapeType === 'Connector') return 'text-teal-600 bg-teal-50 border-teal-200';
  return 'text-gray-600 bg-gray-50 border-gray-200';
};

const formatColor = (colorObj: any) => {
  if (!colorObj || colorObj.type !== 'RGB') return 'N/A';
  
  // Handle invalid color values (-1, -1, -1, -1)
  const r = colorObj.r >= 0 ? colorObj.r : 0;
  const g = colorObj.g >= 0 ? colorObj.g : 0;  
  const b = colorObj.b >= 0 ? colorObj.b : 0;
  const alpha = colorObj.alpha >= 0 ? colorObj.alpha : 1;
  
  // If all values are invalid, return transparent
  if (colorObj.r < 0 && colorObj.g < 0 && colorObj.b < 0) {
    return 'Transparent';
  }
  
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const ColorSwatch = ({ color }: { color: any }) => {
  if (!color || color.type !== 'RGB') return <div className="w-4 h-4 bg-gray-200 rounded border" />;
  
  const rgba = `rgba(${color.r}, ${color.g}, ${color.b}, ${color.alpha || 1})`;
  return (
    <div 
      className="w-4 h-4 rounded border border-gray-300"
      style={{ backgroundColor: rgba }}
      title={rgba}
    />
  );
};

export default function IndividualSlideAnalysis({ jsonData, className = '' }: IndividualSlideAnalysisProps) {
  const [selectedSlideIndex, setSelectedSlideIndex] = useState(0);
  const [selectedShapeIndex, setSelectedShapeIndex] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [shapeTypeFilter, setShapeTypeFilter] = useState('all');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['basic', 'position']));

  // Extract slides data
  const slides: SlideData[] = useMemo(() => {
    if (!jsonData?.presentation?.slides) return [];
    return jsonData.presentation.slides;
  }, [jsonData]);

  const currentSlide = slides[selectedSlideIndex];
  const currentShape = currentSlide && selectedShapeIndex !== null 
    ? currentSlide.shapes[selectedShapeIndex] 
    : null;

  // Filter shapes based on search and type
  const filteredShapes = useMemo(() => {
    if (!currentSlide?.shapes) return [];
    
    return currentSlide.shapes.filter(shape => {
      const matchesSearch = searchTerm === '' || 
        shape.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        shape.shapeType.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = shapeTypeFilter === 'all' || 
        shape.shapeType.toLowerCase().includes(shapeTypeFilter.toLowerCase());
      
      return matchesSearch && matchesType;
    });
  }, [currentSlide?.shapes, searchTerm, shapeTypeFilter]);

  // Get unique shape types for filter
  const shapeTypes = useMemo(() => {
    if (!currentSlide?.shapes) return [];
    const types = [...new Set(currentSlide.shapes.map(shape => shape.shapeType))];
    return types.sort();
  }, [currentSlide?.shapes]);

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  if (!slides.length) {
    return (
      <div className={`flex items-center justify-center h-64 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 ${className}`}>
        <div className="text-center">
          <Layers className="w-12 h-12 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-500">No slide data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Slide Navigation */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <Layers className="w-5 h-5 mr-2 text-purple-500" />
              Individual Slide Analysis
            </div>
            <Badge variant="outline" className="text-xs">
              {slides.length} slides total
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedSlideIndex(Math.max(0, selectedSlideIndex - 1))}
              disabled={selectedSlideIndex === 0}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>
            
            <div className="text-center">
              <h3 className="font-medium">
                Slide {selectedSlideIndex + 1}: {currentSlide?.name || 'Unnamed'}
              </h3>
              <p className="text-sm text-gray-500">
                {currentSlide?.shapes?.length || 0} shapes
              </p>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedSlideIndex(Math.min(slides.length - 1, selectedSlideIndex + 1))}
              disabled={selectedSlideIndex === slides.length - 1}
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>

          {/* Slide Thumbnails */}
          <div className="grid grid-cols-6 md:grid-cols-10 lg:grid-cols-12 gap-2">
            {slides.map((slide, index) => (
              <div
                key={index}
                className={cn(
                  "aspect-video border-2 rounded cursor-pointer transition-all p-2 flex items-center justify-center",
                  selectedSlideIndex === index 
                    ? "border-blue-500 bg-blue-50" 
                    : "border-gray-200 hover:border-gray-300"
                )}
                onClick={() => {
                  setSelectedSlideIndex(index);
                  setSelectedShapeIndex(null);
                }}
              >
                <div className="text-center">
                  <FileText className="w-4 h-4 mx-auto mb-1 text-gray-400" />
                  <p className="text-xs font-medium">{index + 1}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Main Analysis Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Shapes List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <Box className="w-5 h-5 mr-2 text-green-500" />
                  Shapes
                </div>
                <Badge variant="outline" className="text-xs">
                  {filteredShapes.length}
                </Badge>
              </CardTitle>
              
              {/* Search and Filter */}
              <div className="space-y-2">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search shapes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <select
                  value={shapeTypeFilter}
                  onChange={(e) => setShapeTypeFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Types</option>
                  {shapeTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-96 overflow-y-auto">
                {filteredShapes.map((shape, index) => {
                  const originalIndex = currentSlide.shapes.findIndex(s => s === shape);
                  return (
                    <div
                      key={originalIndex}
                      className={cn(
                        "p-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors",
                        selectedShapeIndex === originalIndex && "bg-blue-50 border-blue-200"
                      )}
                      onClick={() => setSelectedShapeIndex(originalIndex)}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={cn("p-2 rounded border", getShapeColor(shape.shapeType))}>
                          {getShapeIcon(shape.shapeType)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {shape.name || `Shape ${originalIndex + 1}`}
                          </p>
                          <p className="text-xs text-gray-500">
                            {decodeShapeType(shape.shapeType)}
                          </p>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className="text-xs text-gray-400">
                              {Math.round(shape.Width)}×{Math.round(shape.Height)}
                            </span>
                            {shape.rotation !== 0 && (
                              <span className="text-xs text-gray-400 flex items-center">
                                <RotateCw className="w-3 h-3 mr-1" />
                                {Math.round(shape.rotation)}°
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Shape Details */}
        <div className="lg:col-span-2">
          {currentShape ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={cn("p-2 rounded border mr-3", getShapeColor(currentShape.shapeType))}>
                      {getShapeIcon(currentShape.shapeType)}
                    </div>
                    <div>
                      <h3 className="font-medium">
                        {currentShape.name || `Shape ${selectedShapeIndex! + 1}`}
                      </h3>
                      <p className="text-sm text-gray-500">{decodeShapeType(currentShape.shapeType)}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    Index: {selectedShapeIndex}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Basic Properties */}
                <div className="space-y-3">
                  <button
                    onClick={() => toggleSection('basic')}
                    className="flex items-center justify-between w-full text-left"
                  >
                    <h4 className="font-medium flex items-center">
                      <Eye className="w-4 h-4 mr-2 text-blue-500" />
                      Basic Properties
                    </h4>
                    {expandedSections.has('basic') ? 
                      <ChevronUp className="w-4 h-4" /> : 
                      <ChevronDown className="w-4 h-4" />
                    }
                  </button>
                  
                  {expandedSections.has('basic') && (
                    <div className="grid grid-cols-2 gap-4 pl-6">
                      <div>
                        <p className="text-sm text-gray-500">Alternative Text</p>
                        <p className="text-sm font-medium">{currentShape.alternativeText || 'None'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Hidden</p>
                        <Badge variant={currentShape.hidden ? "destructive" : "default"} className="text-xs">
                          {currentShape.hidden ? 'Yes' : 'No'}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Z-Order</p>
                        <p className="text-sm font-medium">{currentShape.ZOrderPosition}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Rotation</p>
                        <p className="text-sm font-medium flex items-center">
                          <RotateCw className="w-3 h-3 mr-1" />
                          {Math.round(currentShape.rotation)}°
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Position & Size */}
                <div className="space-y-3">
                  <button
                    onClick={() => toggleSection('position')}
                    className="flex items-center justify-between w-full text-left"
                  >
                    <h4 className="font-medium flex items-center">
                      <Move className="w-4 h-4 mr-2 text-green-500" />
                      Position & Size
                    </h4>
                    {expandedSections.has('position') ? 
                      <ChevronUp className="w-4 h-4" /> : 
                      <ChevronDown className="w-4 h-4" />
                    }
                  </button>
                  
                  {expandedSections.has('position') && (
                    <div className="grid grid-cols-2 gap-4 pl-6">
                      <div>
                        <p className="text-sm text-gray-500">X Position</p>
                        <p className="text-sm font-medium">{formatDimension(currentShape.X)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Y Position</p>
                        <p className="text-sm font-medium">{formatDimension(currentShape.Y)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Width</p>
                        <p className="text-sm font-medium">{formatDimension(currentShape.Width)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Height</p>
                        <p className="text-sm font-medium">{formatDimension(currentShape.Height)}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Fill Format */}
                {currentShape.FillFormat && (
                  <div className="space-y-3">
                    <button
                      onClick={() => toggleSection('fill')}
                      className="flex items-center justify-between w-full text-left"
                    >
                      <h4 className="font-medium flex items-center">
                        <Palette className="w-4 h-4 mr-2 text-purple-500" />
                        Fill Format
                      </h4>
                      {expandedSections.has('fill') ? 
                        <ChevronUp className="w-4 h-4" /> : 
                        <ChevronDown className="w-4 h-4" />
                      }
                    </button>
                    
                    {expandedSections.has('fill') && (
                      <div className="space-y-3 pl-6">
                        <div>
                          <p className="text-sm text-gray-500">Fill Type</p>
                          <p className="text-sm font-medium">{decodeFillType(currentShape.FillFormat.fillType)}</p>
                        </div>
                        {currentShape.FillFormat.solidFillColor && (
                          <div>
                            <p className="text-sm text-gray-500">Solid Color</p>
                            <div className="flex items-center space-x-2">
                              <ColorSwatch color={currentShape.FillFormat.solidFillColor} />
                              <span className="text-sm font-medium">
                                {formatColor(currentShape.FillFormat.solidFillColor)}
                              </span>
                            </div>
                          </div>
                        )}
                        {currentShape.FillFormat.gradientFormat && (
                          <div>
                            <p className="text-sm text-gray-500">Gradient</p>
                            <div className="space-y-1">
                              <p className="text-xs">Direction: {currentShape.FillFormat.gradientFormat.direction}</p>
                              <p className="text-xs">Shape: {currentShape.FillFormat.gradientFormat.shape}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Line Format */}
                {currentShape.LineFormat && (
                  <div className="space-y-3">
                    <button
                      onClick={() => toggleSection('line')}
                      className="flex items-center justify-between w-full text-left"
                    >
                      <h4 className="font-medium flex items-center">
                        <Box className="w-4 h-4 mr-2 text-orange-500" />
                        Line Format
                      </h4>
                      {expandedSections.has('line') ? 
                        <ChevronUp className="w-4 h-4" /> : 
                        <ChevronDown className="w-4 h-4" />
                      }
                    </button>
                    
                    {expandedSections.has('line') && (
                      <div className="grid grid-cols-2 gap-4 pl-6">
                        <div>
                          <p className="text-sm text-gray-500">Style</p>
                          <p className="text-sm font-medium">{decodeLineStyle(currentShape.LineFormat.style)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Width</p>
                          <p className="text-sm font-medium">{formatNumericValue(currentShape.LineFormat.width, 'pt')}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Dash Style</p>
                          <p className="text-sm font-medium">{decodeDashStyle(currentShape.LineFormat.dashStyle)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Cap Style</p>
                          <p className="text-sm font-medium">{decodeCapStyle(currentShape.LineFormat.capStyle)}</p>
                        </div>
                        {currentShape.LineFormat.joinStyle !== undefined && (
                          <div>
                            <p className="text-sm text-gray-500">Join Style</p>
                            <p className="text-sm font-medium">{decodeJoinStyle(currentShape.LineFormat.joinStyle)}</p>
                          </div>
                        )}
                        {currentShape.LineFormat.fillFormat && (
                          <div>
                            <p className="text-sm text-gray-500">Line Color</p>
                            <div className="flex items-center space-x-2">
                              <ColorSwatch color={currentShape.LineFormat.fillFormat.solidFillColor} />
                              <span className="text-sm font-medium">
                                {formatColor(currentShape.LineFormat.fillFormat.solidFillColor)}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Text Frame */}
                {currentShape.TextFrame && currentShape.TextFrame.text && (
                  <div className="space-y-3">
                    <button
                      onClick={() => toggleSection('text')}
                      className="flex items-center justify-between w-full text-left"
                    >
                      <h4 className="font-medium flex items-center">
                        <Type className="w-4 h-4 mr-2 text-indigo-500" />
                        Text Content
                      </h4>
                      {expandedSections.has('text') ? 
                        <ChevronUp className="w-4 h-4" /> : 
                        <ChevronDown className="w-4 h-4" />
                      }
                    </button>
                    
                    {expandedSections.has('text') && (
                      <div className="space-y-3 pl-6">
                        <div>
                          <p className="text-sm text-gray-500">Text Content</p>
                          <div className="bg-gray-50 p-3 rounded border text-sm">
                            {currentShape.TextFrame.text}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-500">Margin Left</p>
                            <p className="text-sm font-medium">{formatDimension(currentShape.TextFrame.marginLeft)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Margin Right</p>
                            <p className="text-sm font-medium">{formatDimension(currentShape.TextFrame.marginRight)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Margin Top</p>
                            <p className="text-sm font-medium">{formatDimension(currentShape.TextFrame.marginTop)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Margin Bottom</p>
                            <p className="text-sm font-medium">{formatDimension(currentShape.TextFrame.marginBottom)}</p>
                          </div>
                          {currentShape.TextFrame.textAlignment !== undefined && (
                            <div>
                              <p className="text-sm text-gray-500">Text Alignment</p>
                              <p className="text-sm font-medium">{decodeTextAlignment(currentShape.TextFrame.textAlignment)}</p>
                            </div>
                          )}
                          {currentShape.TextFrame.anchoringType !== undefined && (
                            <div>
                              <p className="text-sm text-gray-500">Anchoring</p>
                              <p className="text-sm font-medium">{decodeAnchoringType(currentShape.TextFrame.anchoringType)}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Effects */}
                {currentShape.EffectFormat && (
                  <div className="space-y-3">
                    <button
                      onClick={() => toggleSection('effects')}
                      className="flex items-center justify-between w-full text-left"
                    >
                      <h4 className="font-medium flex items-center">
                        <Zap className="w-4 h-4 mr-2 text-yellow-500" />
                        Effects
                      </h4>
                      {expandedSections.has('effects') ? 
                        <ChevronUp className="w-4 h-4" /> : 
                        <ChevronDown className="w-4 h-4" />
                      }
                    </button>
                    
                    {expandedSections.has('effects') && (
                      <div className="space-y-3 pl-6">
                        {currentShape.EffectFormat.outerShadowEffect && (
                          <div>
                            <p className="text-sm text-gray-500">Outer Shadow</p>
                            <div className="space-y-1">
                              <p className="text-xs">Blur: {formatNumericValue(currentShape.EffectFormat.outerShadowEffect.blurRadius, 'pt')}</p>
                              <p className="text-xs">Distance: {formatNumericValue(currentShape.EffectFormat.outerShadowEffect.distance, 'pt')}</p>
                              <p className="text-xs">Direction: {formatNumericValue(currentShape.EffectFormat.outerShadowEffect.direction, '°')}</p>
                              {currentShape.EffectFormat.outerShadowEffect.shadowColor && (
                                <div className="flex items-center space-x-2 mt-1">
                                  <ColorSwatch color={currentShape.EffectFormat.outerShadowEffect.shadowColor} />
                                  <span className="text-xs">{formatColor(currentShape.EffectFormat.outerShadowEffect.shadowColor)}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        {currentShape.EffectFormat.glowEffect && (
                          <div>
                            <p className="text-sm text-gray-500">Glow Effect</p>
                            <div className="space-y-1">
                              <p className="text-xs">Radius: {formatNumericValue(currentShape.EffectFormat.glowEffect.radius, 'pt')}</p>
                              {currentShape.EffectFormat.glowEffect.color && (
                                <div className="flex items-center space-x-2 mt-1">
                                  <ColorSwatch color={currentShape.EffectFormat.glowEffect.color} />
                                  <span className="text-xs">{formatColor(currentShape.EffectFormat.glowEffect.color)}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        {currentShape.EffectFormat.innerShadowEffect && (
                          <div>
                            <p className="text-sm text-gray-500">Inner Shadow</p>
                            <div className="space-y-1">
                              <p className="text-xs">Blur: {formatNumericValue(currentShape.EffectFormat.innerShadowEffect.blurRadius, 'pt')}</p>
                              <p className="text-xs">Distance: {formatNumericValue(currentShape.EffectFormat.innerShadowEffect.distance, 'pt')}</p>
                              {currentShape.EffectFormat.innerShadowEffect.shadowColor && (
                                <div className="flex items-center space-x-2 mt-1">
                                  <ColorSwatch color={currentShape.EffectFormat.innerShadowEffect.shadowColor} />
                                  <span className="text-xs">{formatColor(currentShape.EffectFormat.innerShadowEffect.shadowColor)}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Shape-specific Properties */}
                {(currentShape.placeholderData || currentShape.autoShapeData || currentShape.chartData || 
                  currentShape.tableData || currentShape.pictureData || currentShape.groupData) && (
                  <div className="space-y-3">
                    <button
                      onClick={() => toggleSection('specific')}
                      className="flex items-center justify-between w-full text-left"
                    >
                      <h4 className="font-medium flex items-center">
                        <Box className="w-4 h-4 mr-2 text-teal-500" />
                        Shape-Specific Data
                      </h4>
                      {expandedSections.has('specific') ? 
                        <ChevronUp className="w-4 h-4" /> : 
                        <ChevronDown className="w-4 h-4" />
                      }
                    </button>
                    
                    {expandedSections.has('specific') && (
                      <div className="space-y-3 pl-6">
                        {currentShape.placeholderData && (
                          <div>
                            <p className="text-sm text-gray-500">Placeholder</p>
                            <div className="space-y-1">
                              <p className="text-xs">Type: {decodePlaceholderType(currentShape.placeholderData.type)}</p>
                              <p className="text-xs">Index: {currentShape.placeholderData.index}</p>
                            </div>
                          </div>
                        )}
                        {currentShape.chartData && (
                          <div>
                            <p className="text-sm text-gray-500">Chart</p>
                            <div className="space-y-1">
                              <p className="text-xs">Has Title: {currentShape.chartData.hasTitle ? 'Yes' : 'No'}</p>
                              <p className="text-xs">Has Legend: {currentShape.chartData.hasLegend ? 'Yes' : 'No'}</p>
                            </div>
                          </div>
                        )}
                        {currentShape.tableData && (
                          <div>
                            <p className="text-sm text-gray-500">Table</p>
                            <div className="space-y-1">
                              <p className="text-xs">Rows: {currentShape.tableData.rowCount}</p>
                              <p className="text-xs">Columns: {currentShape.tableData.columnCount}</p>
                            </div>
                          </div>
                        )}
                        {currentShape.pictureData && (
                          <div>
                            <p className="text-sm text-gray-500">Picture</p>
                            <div className="space-y-1">
                              <p className="text-xs">Content Type: {currentShape.pictureData.contentType}</p>
                              <p className="text-xs">Size: {currentShape.pictureData.imageSize} bytes</p>
                              <p className="text-xs">Dimensions: {currentShape.pictureData.width}×{currentShape.pictureData.height}</p>
                            </div>
                          </div>
                        )}
                        {currentShape.groupData && (
                          <div>
                            <p className="text-sm text-gray-500">Group</p>
                            <div className="space-y-1">
                              <p className="text-xs">Child Shapes: {currentShape.groupData.shapeCount}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-64">
                <div className="text-center">
                  <MousePointer className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">Select a shape to view detailed properties</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Click on any shape from the list to explore its complete structure
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
} 