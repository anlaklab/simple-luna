/**
 * Universal JSON Schema Types - Frontend
 * 🎯 RESPONSIBILITY: Type definitions for Universal Presentation JSON
 * 📋 SCOPE: Complete presentation structure, frontend-specific helpers
 * 🔗 SYNC: Must match server/types/universal-json.ts
 */

// Core presentation structure
export interface UniversalPresentation {
  id: string;
  metadata: PresentationMetadata;
  slideSize: SlideSize;
  slides: UniversalSlide[];
  masterSlides?: MasterSlide[];
  layoutSlides?: LayoutSlide[];
  assets?: AssetCollection;
  theme?: PresentationTheme;
}

// Presentation metadata
export interface PresentationMetadata {
  title: string;
  author?: string;
  subject?: string;
  keywords?: string;
  comments?: string;
  category?: string;
  company?: string;
  manager?: string;
  createdTime: string;
  lastSavedTime: string;
  slideCount: number;
  masterSlideCount: number;
  layoutSlideCount: number;
  imageCount: number;
  audioCount: number;
  videoCount: number;
  fileSize?: number;
  version?: string;
  language?: string;
}

// Slide dimensions and orientation
export interface SlideSize {
  width: number;
  height: number;
  orientation: 'Landscape' | 'Portrait';
  type: 'OnScreen16x9' | 'OnScreen4x3' | 'A4Paper' | 'Custom';
}

// Individual slide
export interface UniversalSlide {
  slideId: number;
  slideIndex: number;
  name: string;
  hidden: boolean;
  background: SlideBackground;
  shapes: UniversalShape[];
  notesSlide?: NotesSlide;
  timing?: SlideTiming;
  transition?: SlideTransition;
  animations?: SlideAnimation[];
  layoutSlideId?: string;
  masterSlideId?: string;
}

// Shape definitions
export interface UniversalShape {
  shapeIndex: number;
  name: string;
  shapeType: ShapeType;
  alternativeText?: string;
  hidden: boolean;
  X: number;
  Y: number;
  Width: number;
  Height: number;
  ZOrderPosition: number;
  rotation: number;
  FillFormat: FillFormat;
  LineFormat: LineFormat;
  EffectFormat: EffectFormat;
  ThreeDFormat: ThreeDFormat;
  TextFrame?: TextFrame;
  Table?: Table;
  Chart?: Chart;
  Picture?: Picture;
  Video?: Video;
  Audio?: Audio;
  GroupShapes?: UniversalShape[];
  HyperlinkClick?: Hyperlink;
  HyperlinkMouseOver?: Hyperlink;
}

// Shape types
export type ShapeType = 
  | 'Shape' | 'AutoShape' | 'Group' | 'Connector' 
  | 'Picture' | 'Chart' | 'Table' | 'SmartArt'
  | 'Video' | 'Audio' | 'OleObject' | 'Placeholder';

// Fill format
export interface FillFormat {
  fillType: 'NoFill' | 'Solid' | 'Gradient' | 'Pattern' | 'Picture';
  solidFillColor?: ColorFormat;
  gradientFill?: GradientFill;
  patternFill?: PatternFill;
  pictureFill?: PictureFill;
}

// Color format
export interface ColorFormat {
  type: 'RGB' | 'HSL' | 'Scheme' | 'System';
  r?: number;
  g?: number;
  b?: number;
  alpha: number;
  hue?: number;
  saturation?: number;
  lightness?: number;
  schemeColor?: string;
  systemColor?: string;
}

// Text frame
export interface TextFrame {
  text: string;
  marginLeft: number;
  marginRight: number;
  marginTop: number;
  marginBottom: number;
  wrapText: 'None' | 'Square' | 'Tight' | 'Through';
  anchoringType: 'Top' | 'Center' | 'Bottom' | 'Justified' | 'Distributed';
  centerText: boolean;
  textVerticalType: 'Horizontal' | 'Vertical' | 'Vertical270' | 'WordArtVertical';
  autofit: 'None' | 'Shape' | 'Normal';
  paragraphs: Paragraph[];
  columnCount?: number;
  columnSpacing?: number;
}

// Paragraph
export interface Paragraph {
  alignment: 'Left' | 'Center' | 'Right' | 'Justify' | 'JustifyLow' | 'Distributed';
  marginLeft: number;
  marginRight: number;
  spaceBefore: number;
  spaceAfter: number;
  spaceWithin: number;
  indent: number;
  hangingIndent?: number;
  bulletType?: 'None' | 'Symbol' | 'Numbered' | 'Picture';
  bulletChar?: string;
  bulletFont?: FontData;
  portions: TextPortion[];
}

// Text portion
export interface TextPortion {
  text: string;
  fontData: FontData;
  fillFormat: FillFormat;
  highlightColor?: ColorFormat;
  hyperlink?: Hyperlink;
}

// Font data
export interface FontData {
  fontName: string;
  fontSize: number;
  bold: boolean;
  italic: boolean;
  underline: 'None' | 'Single' | 'Double' | 'Heavy' | 'Dotted' | 'Dashed';
  strikethrough: 'None' | 'Single' | 'Double';
  superscript: boolean;
  subscript: boolean;
  spacing?: number;
  kerning?: number;
}

// Media types
export interface Picture {
  base64: string;
  mimeType: string;
  filename: string;
  originalWidth: number;
  originalHeight: number;
  cropLeft?: number;
  cropRight?: number;
  cropTop?: number;
  cropBottom?: number;
}

export interface Video {
  base64: string;
  mimeType: string;
  filename: string;
  duration: number;
  width: number;
  height: number;
  thumbnail?: Picture;
}

export interface Audio {
  base64: string;
  mimeType: string;
  filename: string;
  duration: number;
}

// Complex content types
export interface Table {
  rows: TableRow[];
  columns: TableColumn[];
  firstRow: boolean;
  firstCol: boolean;
  lastRow: boolean;
  lastCol: boolean;
  bandRows: boolean;
  bandCols: boolean;
}

export interface TableRow {
  height: number;
  cells: TableCell[];
}

export interface TableColumn {
  width: number;
}

export interface TableCell {
  text: string;
  textFrame: TextFrame;
  fillFormat: FillFormat;
  borderTop: LineFormat;
  borderBottom: LineFormat;
  borderLeft: LineFormat;
  borderRight: LineFormat;
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
  textAnchorType: 'Top' | 'Center' | 'Bottom';
  textVerticalType: 'Horizontal' | 'Vertical';
  colSpan: number;
  rowSpan: number;
}

export interface Chart {
  chartType: string;
  hasTitle: boolean;
  title?: string;
  hasLegend: boolean;
  legendPosition?: string;
  categories: string[];
  series: ChartSeries[];
  plotArea: ChartPlotArea;
}

export interface ChartSeries {
  name: string;
  values: number[];
  fillFormat: FillFormat;
  lineFormat: LineFormat;
}

export interface ChartPlotArea {
  fillFormat: FillFormat;
  lineFormat: LineFormat;
  width: number;
  height: number;
  x: number;
  y: number;
}

// Supporting interfaces
export interface LineFormat {
  style: 'Single' | 'Double' | 'Dotted' | 'Dashed' | 'NotDefined';
  width: number;
  dashStyle?: 'Solid' | 'Dot' | 'Dash' | 'DashDot' | 'DashDotDot';
  fillFormat?: FillFormat;
  joinStyle?: 'Round' | 'Bevel' | 'Miter';
  capStyle?: 'Round' | 'Square' | 'Flat';
}

export interface EffectFormat {
  outerShadowEffect: ShadowEffect;
  innerShadowEffect: ShadowEffect;
  glowEffect: GlowEffect;
  softEdgeEffect: SoftEdgeEffect;
  reflection: ReflectionEffect;
  blur: BlurEffect;
}

export interface ShadowEffect {
  enabled: boolean;
  distance?: number;
  direction?: number;
  blurRadius?: number;
  color?: ColorFormat;
}

export interface GlowEffect {
  enabled: boolean;
  radius?: number;
  color?: ColorFormat;
}

export interface SoftEdgeEffect {
  enabled: boolean;
  radius?: number;
}

export interface ReflectionEffect {
  enabled: boolean;
  transparency?: number;
  size?: number;
  distance?: number;
  direction?: number;
}

export interface BlurEffect {
  enabled: boolean;
  radius?: number;
}

export interface ThreeDFormat {
  depth: number;
  extrusionHeight: number;
  contourWidth: number;
  material?: string;
  lighting?: string;
  bevelTop?: BevelFormat;
  bevelBottom?: BevelFormat;
}

export interface BevelFormat {
  type: string;
  width: number;
  height: number;
}

export interface GradientFill {
  direction: 'Horizontal' | 'Vertical' | 'Diagonal' | 'Radial';
  gradientStops: GradientStop[];
}

export interface GradientStop {
  position: number;
  color: ColorFormat;
}

export interface PatternFill {
  patternType: string;
  foregroundColor: ColorFormat;
  backgroundColor: ColorFormat;
}

export interface PictureFill {
  base64: string;
  mimeType: string;
  fillMode: 'Stretch' | 'Tile' | 'Center';
}

export interface Hyperlink {
  targetUrl: string;
  tooltip?: string;
  action?: string;
}

export interface SlideBackground {
  type: 'Solid' | 'Gradient' | 'Picture' | 'Pattern' | 'None';
  fillFormat?: FillFormat;
  picture?: BackgroundPicture;
}

export interface BackgroundPicture {
  base64: string;
  mimeType: string;
  filename: string;
  width: number;
  height: number;
}

export interface SlideTiming {
  advanceOnClick: boolean;
  advanceAfterTime: number;
  advanceAfter: boolean;
}

export interface SlideTransition {
  type: string;
  advanceOnClick: boolean;
  advanceAfterTime: number;
  speed: 'Fast' | 'Medium' | 'Slow';
  sound?: Audio;
}

export interface SlideAnimation {
  type: string;
  effect: string;
  trigger: 'OnClick' | 'WithPrevious' | 'AfterPrevious';
  delay: number;
  duration: number;
  targetShapeIndex: number;
}

export interface MasterSlide {
  name: string;
  background: SlideBackground;
  shapes: UniversalShape[];
  layoutSlides: string[];
  theme: PresentationTheme;
}

export interface LayoutSlide {
  name: string;
  type: string;
  background: SlideBackground;
  shapes: UniversalShape[];
  masterSlideId: string;
}

export interface PresentationTheme {
  name: string;
  colorScheme: ThemeColorScheme;
  fontScheme: ThemeFontScheme;
  effectScheme?: string;
}

export interface ThemeColorScheme {
  accent1: ColorFormat;
  accent2: ColorFormat;
  accent3: ColorFormat;
  accent4: ColorFormat;
  accent5: ColorFormat;
  accent6: ColorFormat;
  dark1: ColorFormat;
  dark2: ColorFormat;
  light1: ColorFormat;
  light2: ColorFormat;
  hyperlink: ColorFormat;
  followedHyperlink: ColorFormat;
}

export interface ThemeFontScheme {
  major: FontData;
  minor: FontData;
}

export interface NotesSlide {
  text: string;
  shapes?: UniversalShape[];
}

export interface AssetCollection {
  images: Picture[];
  videos: Video[];
  audios: Audio[];
  documents: Document[];
}

export interface Document {
  base64: string;
  mimeType: string;
  filename: string;
  type: 'Excel' | 'Word' | 'PDF' | 'Other';
}

// Frontend-specific helper types
export interface PresentationTab {
  id: string;
  name: string;
  icon: string;
  component: React.ComponentType<any>;
  badge?: number;
}

export interface AssetSummary {
  type: 'image' | 'video' | 'audio' | 'chart' | 'table' | 'ole';
  count: number;
  totalSize?: number;
  items: Array<{
    slideIndex: number;
    shapeIndex: number;
    name: string;
    details: any;
  }>;
}

export interface SlideAnalysis {
  slideIndex: number;
  type: 'title' | 'content' | 'section' | 'agenda' | 'conclusion' | 'image' | 'chart' | 'mixed';
  confidence: number;
  mainContent: string;
  assets: AssetSummary[];
  complexity: 'simple' | 'moderate' | 'complex';
}

export interface PresentationAnalytics {
  totalSlides: number;
  slideTypes: Record<string, number>;
  totalAssets: AssetSummary[];
  complexity: 'simple' | 'moderate' | 'complex';
  estimatedReadingTime: number;
  accessibility: {
    hasAltText: boolean;
    colorContrast: 'good' | 'warning' | 'poor';
    fontReadability: 'good' | 'warning' | 'poor';
  };
} 