/**
 * Universal Presentation Schema - Zod Validation
 * 
 * Comprehensive validation schema for PowerPoint presentations
 * Compatible with Aspose.Slides transformations
 */

import { z } from 'zod';

// =============================================================================
// BASIC TYPES & ENUMS
// =============================================================================

export const ColorSchema = z.string()
  .regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex color (e.g., #FF0000)');

export const RGBAColorSchema = z.object({
  red: z.number().min(0).max(255),
  green: z.number().min(0).max(255),
  blue: z.number().min(0).max(255),
  alpha: z.number().min(0).max(1).optional().default(1),
});

export const GeometrySchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
  rotation: z.number().optional().default(0),
});

export const PointSchema = z.object({
  x: z.number(),
  y: z.number(),
});

// =============================================================================
// FILL & LINE FORMATS
// =============================================================================

export const FillTypeEnum = z.enum([
  'NotDefined',
  'NoFill',
  'Solid',
  'Gradient',
  'Pattern',
  'Picture',
  'Group',
]);

export const SolidFillColorSchema = z.object({
  color: ColorSchema,
  transparency: z.number().min(0).max(1).optional().default(0),
});

export const GradientStopSchema = z.object({
  position: z.number().min(0).max(1),
  color: ColorSchema,
  transparency: z.number().min(0).max(1).optional().default(0),
});

export const GradientFillFormatSchema = z.object({
  direction: z.number().optional(),
  shape: z.number().optional(),
  gradientStops: z.array(GradientStopSchema).optional(),
  angle: z.number().optional(),
  focus: z.number().min(0).max(1).optional(),
  scale: z.number().positive().optional(),
});

export const FillFormatSchema = z.object({
  type: FillTypeEnum,
  solidFillColor: SolidFillColorSchema.optional(),
  gradientFillFormat: GradientFillFormatSchema.optional(),
  patternFormat: z.object({
    patternStyle: z.number().optional(),
    foreColor: ColorSchema.optional(),
    backColor: ColorSchema.optional(),
  }).optional(),
  pictureFormat: z.object({
    imagePath: z.string().optional(),
    imageData: z.string().optional(), // Base64
    stretchMode: z.number().optional(),
  }).optional(),
});

export const LineFormatSchema = z.object({
  width: z.number().min(0).optional().default(0),
  style: z.number().optional(),
  dashStyle: z.number().optional(),
  capStyle: z.number().optional(),
  joinStyle: z.number().optional(),
  fillFormat: FillFormatSchema.optional(),
});

export const EffectFormatSchema = z.object({
  hasEffects: z.boolean().optional().default(false),
  shadowEffect: z.object({
    blurRadius: z.number().optional(),
    direction: z.number().optional(),
    distance: z.number().optional(),
    shadowColor: ColorSchema.optional(),
  }).optional(),
  glowEffect: z.object({
    radius: z.number().optional(),
    color: ColorSchema.optional(),
  }).optional(),
  reflectionEffect: z.object({
    blurRadius: z.number().optional(),
    startReflectionOpacity: z.number().min(0).max(1).optional(),
    endReflectionOpacity: z.number().min(0).max(1).optional(),
  }).optional(),
});

export const ThreeDFormatSchema = z.object({
  depth: z.number().optional().default(0),
  contourWidth: z.number().optional().default(0),
  extrusionHeight: z.number().optional().default(0),
  bevelTop: z.object({
    bevelType: z.number().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
  }).optional(),
  bevelBottom: z.object({
    bevelType: z.number().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
  }).optional(),
  lightRig: z.object({
    lightType: z.number().optional(),
    direction: z.number().optional(),
    rotationX: z.number().optional(),
    rotationY: z.number().optional(),
    rotationZ: z.number().optional(),
  }).optional(),
  material: z.number().optional(),
  camera: z.object({
    cameraType: z.number().optional(),
    fieldOfView: z.number().optional(),
    zoom: z.number().optional(),
    rotationX: z.number().optional(),
    rotationY: z.number().optional(),
  }).optional(),
});

// =============================================================================
// TEXT & FONT FORMATS
// =============================================================================

export const FontFormatSchema = z.object({
  fontName: z.string().optional().default('Arial'),
  fontSize: z.number().positive().optional().default(12),
  fontBold: z.boolean().optional().default(false),
  fontItalic: z.boolean().optional().default(false),
  fontUnderline: z.boolean().optional().default(false),
  fontColor: ColorSchema.optional().default('#000000'),
});

export const ParagraphFormatSchema = z.object({
  alignment: z.number().optional(),
  marginLeft: z.number().optional().default(0),
  marginRight: z.number().optional().default(0),
  marginTop: z.number().optional().default(0),
  marginBottom: z.number().optional().default(0),
  lineSpacing: z.number().optional().default(1),
  bulletType: z.number().optional(),
  bulletChar: z.string().optional(),
  bulletFont: z.string().optional(),
  bulletColor: ColorSchema.optional(),
});

export const TextPortionSchema = z.object({
  text: z.string(),
  fontFormat: FontFormatSchema.optional(),
});

export const TextParagraphSchema = z.object({
  text: z.string(),
  portions: z.array(TextPortionSchema).optional(),
  paragraphFormat: ParagraphFormatSchema.optional(),
});

export const TextFrameSchema = z.object({
  text: z.string(),
  paragraphs: z.array(TextParagraphSchema).optional(),
  autofit: z.number().optional(),
  marginLeft: z.number().optional().default(0),
  marginRight: z.number().optional().default(0),
  marginTop: z.number().optional().default(0),
  marginBottom: z.number().optional().default(0),
  wrapText: z.boolean().optional().default(true),
  anchorType: z.number().optional(),
});

// =============================================================================
// SHAPES
// =============================================================================

export const ShapeTypeEnum = z.enum([
  'Shape',
  'AutoShape',
  'Rectangle',
  'Circle',
  'Ellipse',
  'Line',
  'Connector',
  'Freeform',
  'Chart',
  'Table',
  'GroupShape',
  'PictureFrame',
  'VideoFrame',
  'AudioFrame',
  'SmartArt',
  'OleObjectFrame',
  'PlaceholderShape',
]);

export const HyperlinkSchema = z.object({
  targetSlide: z.number().optional(),
  externalUrl: z.string().url().optional(),
  tooltip: z.string().optional(),
  actionType: z.number().optional(),
});

export const ChartDataSchema = z.object({
  chartType: z.number().optional(),
  categories: z.array(z.object({
    value: z.string(),
    label: z.string().optional(),
  })).optional(),
  series: z.array(z.object({
    name: z.string(),
    values: z.array(z.number()),
    color: ColorSchema.optional(),
  })).optional(),
  hasDataTable: z.boolean().optional().default(false),
  hasLegend: z.boolean().optional().default(true),
  hasTitle: z.boolean().optional().default(false),
  title: z.string().optional(),
});

export const TableCellSchema = z.object({
  text: z.string(),
  fillFormat: FillFormatSchema.optional(),
  textFrame: TextFrameSchema.optional(),
  colspan: z.number().positive().optional().default(1),
  rowspan: z.number().positive().optional().default(1),
});

export const TableRowSchema = z.object({
  cells: z.array(TableCellSchema),
  height: z.number().positive().optional(),
});

export const TableDataSchema = z.object({
  rows: z.array(TableRowSchema),
  columns: z.array(z.object({
    width: z.number().positive(),
  })).optional(),
  firstRow: z.boolean().optional().default(false),
  firstCol: z.boolean().optional().default(false),
  lastRow: z.boolean().optional().default(false),
  lastCol: z.boolean().optional().default(false),
});

export const AnimationSchema = z.object({
  type: z.number(),
  subtype: z.number().optional(),
  duration: z.number().positive().optional().default(1000),
  triggerType: z.number().optional(),
  delay: z.number().min(0).optional().default(0),
  repeatCount: z.number().min(0).optional().default(1),
  autoReverse: z.boolean().optional().default(false),
  targetShapeIndex: z.number().min(0).optional(),
});

// Universal Shape Schema (recursive for GroupShape)
export const UniversalShapeSchema: z.ZodType<any> = z.lazy(() => z.object({
  shapeType: ShapeTypeEnum,
  name: z.string().optional(),
  alternativeText: z.string().optional(),
  hidden: z.boolean().optional().default(false),
  locked: z.boolean().optional().default(false),
  geometry: GeometrySchema,
  fillFormat: FillFormatSchema.optional(),
  lineFormat: LineFormatSchema.optional(),
  effectFormat: EffectFormatSchema.optional(),
  threeDFormat: ThreeDFormatSchema.optional(),
  textFrame: TextFrameSchema.optional(),
  hyperlink: HyperlinkSchema.optional(),
  
  // Type-specific properties
  chartProperties: ChartDataSchema.optional(),
  tableProperties: TableDataSchema.optional(),
  groupProperties: z.object({
    shapes: z.array(UniversalShapeSchema),
  }).optional(),
  pictureProperties: z.object({
    imagePath: z.string().optional(),
    imageData: z.string().optional(), // Base64
    preserveAspectRatio: z.boolean().optional().default(true),
  }).optional(),
  videoProperties: z.object({
    videoPath: z.string().optional(),
    videoData: z.string().optional(), // Base64
    thumbnailPath: z.string().optional(),
    autoPlay: z.boolean().optional().default(false),
    loop: z.boolean().optional().default(false),
    volume: z.number().min(0).max(100).optional().default(50),
  }).optional(),
  audioProperties: z.object({
    audioPath: z.string().optional(),
    audioData: z.string().optional(), // Base64
    autoPlay: z.boolean().optional().default(false),
    loop: z.boolean().optional().default(false),
    volume: z.number().min(0).max(100).optional().default(50),
  }).optional(),
  smartArtProperties: z.object({
    layout: z.number().optional(),
    nodes: z.array(z.object({
      text: z.string(),
      level: z.number().min(0).optional().default(0),
    })).optional(),
  }).optional(),
  oleObjectProperties: z.object({
    objectData: z.string().optional(), // Base64
    objectType: z.string().optional(),
    iconPath: z.string().optional(),
    displayAsIcon: z.boolean().optional().default(true),
  }).optional(),
  connectorProperties: z.object({
    startShapeIndex: z.number().min(0).optional(),
    endShapeIndex: z.number().min(0).optional(),
    startConnectionSite: z.number().min(0).optional(),
    endConnectionSite: z.number().min(0).optional(),
  }).optional(),
}));

// =============================================================================
// SLIDE SCHEMAS
// =============================================================================

export const SlideTransitionSchema = z.object({
  type: z.number().optional(),
  speed: z.number().optional(),
  advanceOnClick: z.boolean().optional().default(true),
  advanceAfterTime: z.number().min(0).optional(),
  advanceAfterTimeEnabled: z.boolean().optional().default(false),
  sound: z.object({
    soundPath: z.string().optional(),
    soundData: z.string().optional(), // Base64
    loop: z.boolean().optional().default(false),
  }).optional(),
});

export const SlideTimingSchema = z.object({
  mainSequenceCount: z.number().min(0).optional().default(0),
  hasTimeline: z.boolean().optional().default(false),
});

export const CommentSchema = z.object({
  author: z.string(),
  text: z.string(),
  position: PointSchema,
  createdTime: z.date().optional(),
  modifiedTime: z.date().optional(),
});

export const PlaceholderSchema = z.object({
  type: z.number(),
  index: z.number(),
  size: z.number().optional(),
  orientation: z.number().optional(),
  text: z.string().optional(),
});

export const UniversalSlideSchema = z.object({
  slideId: z.number().min(1),
  name: z.string().optional(),
  slideType: z.enum(['Slide', 'Layout', 'Master']).default('Slide'),
  shapes: z.array(UniversalShapeSchema).optional().default([]),
  background: z.object({
    type: FillTypeEnum,
    fillFormat: FillFormatSchema.optional(),
    effectFormat: EffectFormatSchema.optional(),
  }).optional(),
  slideSize: z.object({
    width: z.number().positive(),
    height: z.number().positive(),
    type: z.number().optional(),
    orientation: z.number().optional(),
  }).optional(),
  transition: SlideTransitionSchema.optional(),
  timing: SlideTimingSchema.optional(),
  animations: z.array(AnimationSchema).optional().default([]),
  comments: z.array(CommentSchema).optional().default([]),
  placeholders: z.array(PlaceholderSchema).optional().default([]),
  notes: z.string().optional(),
  hidden: z.boolean().optional().default(false),
});

// =============================================================================
// PRESENTATION SCHEMA
// =============================================================================

export const DocumentPropertiesSchema = z.object({
  title: z.string().optional(),
  subject: z.string().optional(),
  author: z.string().optional(),
  keywords: z.string().optional(),
  comments: z.string().optional(),
  category: z.string().optional(),
  company: z.string().optional(),
  manager: z.string().optional(),
  createdTime: z.date().optional(),
  lastSavedTime: z.date().optional(),
  lastPrintedDate: z.date().optional(),
  revisionNumber: z.number().min(0).optional(),
  totalEditingTime: z.number().min(0).optional(),
  customProperties: z.record(z.string(), z.any()).optional(),
});

export const PresentationSecuritySchema = z.object({
  isEncrypted: z.boolean().optional().default(false),
  isPasswordProtected: z.boolean().optional().default(false),
  isWriteProtected: z.boolean().optional().default(false),
  hasDigitalSignature: z.boolean().optional().default(false),
  hasVbaProject: z.boolean().optional().default(false),
});

export const UniversalPresentationSchema = z.object({
  documentProperties: DocumentPropertiesSchema.optional(),
  security: PresentationSecuritySchema.optional(),
  slides: z.array(UniversalSlideSchema).min(1, 'Presentation must have at least one slide'),
  slideSize: z.object({
    width: z.number().positive(),
    height: z.number().positive(),
    type: z.number().optional(),
    orientation: z.number().optional(),
  }),
  defaultTextStyle: FontFormatSchema.optional(),
  masterSlides: z.array(UniversalSlideSchema).optional().default([]),
  layoutSlides: z.array(UniversalSlideSchema).optional().default([]),
  version: z.string().optional().default('1.0'),
  generator: z.string().optional().default('Luna Server'),
  metadata: z.object({
    slideCount: z.number().min(0),
    animationCount: z.number().min(0).optional().default(0),
    shapeCount: z.number().min(0).optional().default(0),
    imageCount: z.number().min(0).optional().default(0),
    videoCount: z.number().min(0).optional().default(0),
    audioCount: z.number().min(0).optional().default(0),
    chartCount: z.number().min(0).optional().default(0),
    tableCount: z.number().min(0).optional().default(0),
    embeddedObjects: z.number().min(0).optional().default(0),
    fonts: z.array(z.string()).optional().default([]),
    fileSize: z.number().min(0).optional(),
    lastModified: z.date().optional(),
  }).optional(),
});

// =============================================================================
// EXPORTS
// =============================================================================

export type UniversalPresentation = z.infer<typeof UniversalPresentationSchema>;
export type UniversalSlide = z.infer<typeof UniversalSlideSchema>;
export type UniversalShape = z.infer<typeof UniversalShapeSchema>;
export type DocumentProperties = z.infer<typeof DocumentPropertiesSchema>;
export type FillFormat = z.infer<typeof FillFormatSchema>;
export type LineFormat = z.infer<typeof LineFormatSchema>;
export type TextFrame = z.infer<typeof TextFrameSchema>;
export type ChartData = z.infer<typeof ChartDataSchema>;
export type TableData = z.infer<typeof TableDataSchema>;
export type Animation = z.infer<typeof AnimationSchema>;
export type SlideTransition = z.infer<typeof SlideTransitionSchema>;
export type Comment = z.infer<typeof CommentSchema>;
export type Geometry = z.infer<typeof GeometrySchema>;
export type Point = z.infer<typeof PointSchema>;
export type Hyperlink = z.infer<typeof HyperlinkSchema>;
export type EffectFormat = z.infer<typeof EffectFormatSchema>;
export type ThreeDFormat = z.infer<typeof ThreeDFormatSchema>; 