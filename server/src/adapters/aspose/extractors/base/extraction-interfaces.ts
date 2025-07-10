/**
 * Extraction Interfaces - TypeScript Definitions for Phase 6 Componentization
 * 
 * Centralized type definitions for all extraction operations,
 * ensuring type safety and consistency across all extractors.
 */

import { ConversionOptions } from '../../types/interfaces';

// =============================================================================
// CORE EXTRACTION INTERFACES
// =============================================================================

export interface ShapeExtractionResult {
  id: string;
  shapeType: string;
  geometry: {
    x: number;
    y: number;
    width: number;
    height: number;
    rotation?: number;
  };
  fillFormat?: any;
  lineFormat?: any;
  hyperlink?: any;
  zOrderPosition?: number;
  // Shape-specific properties
  text?: string;
  textFormat?: any;
  chartProperties?: any;
  tableProperties?: any;
  mediaProperties?: any;
}

export interface BasicShapeProperties {
  id: string;
  shapeType: string;
  geometry: {
    x: number;
    y: number;
    width: number;
    height: number;
    rotation?: number;
  };
  fillFormat?: any;
  lineFormat?: any;
  hyperlink?: any;
  zOrderPosition?: number;
}

export interface ShapeExtractionOptions extends ConversionOptions {
  extractMetadata?: boolean;
  extractFormatting?: boolean;
  extractText?: boolean;
  extractAssets?: boolean;
  includeHidden?: boolean;
  maxDepth?: number;
}

export interface ShapeValidationResult {
  isValid: boolean;
  shapeType: string;
  hasRequiredProperties: boolean;
  missingProperties?: string[];
  warnings?: string[];
}

export interface ExtractorCapabilities {
  canExtractText: boolean;
  canExtractFormatting: boolean;
  canExtractAssets: boolean;
  canExtractAnimations: boolean;
  canExtractInteractivity: boolean;
  supportsNestedShapes: boolean;
}

// =============================================================================
// SHAPE-SPECIFIC INTERFACES
// =============================================================================

// Chart-specific interfaces
export interface ChartExtractionResult {
  chartType: string;
  title?: string;
  hasLegend: boolean;
  hasDataTable: boolean;
  categories: ChartCategory[];
  series: ChartSeries[];
  axes?: ChartAxis[];
  plotArea?: ChartPlotArea;
}

export interface ChartCategory {
  value: string | number;
  index: number;
  format?: any;
}

export interface ChartSeries {
  name: string;
  values: ChartDataPoint[];
  fillFormat?: any;
  lineFormat?: any;
  markerFormat?: any;
}

export interface ChartDataPoint {
  value: number | null;
  index: number;
  category?: string;
  format?: any;
}

export interface ChartAxis {
  type: 'Category' | 'Value' | 'Series';
  title?: string;
  visible: boolean;
  format?: any;
  min?: number;
  max?: number;
}

export interface ChartPlotArea {
  x: number;
  y: number;
  width: number;
  height: number;
  fillFormat?: any;
  lineFormat?: any;
}

// Table-specific interfaces
export interface TableExtractionResult {
  rows: TableRow[];
  columns: TableColumn[];
  firstRow: boolean;
  firstCol: boolean;
  lastRow: boolean;
  lastCol: boolean;
  tableStyle?: any;
}

export interface TableRow {
  cells: TableCell[];
  height?: number;
  index: number;
}

export interface TableColumn {
  width: number;
  index: number;
}

export interface TableCell {
  text: string;
  textFrame?: any;
  fillFormat?: any;
  borders: {
    top?: any;
    bottom?: any;
    left?: any;
    right?: any;
  };
  colspan: number;
  rowspan: number;
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
  textAnchor: string;
  verticalAlignment: string;
}

// Media-specific interfaces
export interface MediaExtractionResult {
  mediaType: 'picture' | 'video' | 'audio';
  fileName?: string;
  originalSize?: {
    width: number;
    height: number;
  };
  embedded: boolean;
  linkPath?: string;
  hasData: boolean;
  dataSize?: number;
}

export interface PictureExtractionResult extends MediaExtractionResult {
  imageData?: string; // base64
  mimeType?: string;
  preserveAspectRatio: boolean;
  cropSettings?: {
    left: number;
    right: number;
    top: number;
    bottom: number;
  };
}

export interface VideoExtractionResult extends MediaExtractionResult {
  autoPlay: boolean;
  loop: boolean;
  volume: number;
  duration?: number;
  thumbnail?: PictureExtractionResult;
}

export interface AudioExtractionResult extends MediaExtractionResult {
  autoPlay: boolean;
  loop: boolean;
  volume: number;
  duration?: number;
}

// SmartArt-specific interfaces
export interface SmartArtExtractionResult {
  layoutType: string;
  colorStyle?: string;
  quickStyle?: string;
  nodes: SmartArtNode[];
}

export interface SmartArtNode {
  text: string;
  level: number;
  position: number;
}

// OLE Object-specific interfaces
export interface OleObjectExtractionResult {
  objectProgId?: string;
  linkPath?: string;
  embedded: boolean;
  hasData: boolean;
  fileName?: string;
  dataSize?: number;
}

// Connector-specific interfaces
export interface ConnectorExtractionResult {
  connectorType: string;
  startConnection?: ConnectionSite;
  endConnection?: ConnectionSite;
  routingMode?: string;
  adjustValues?: number[];
}

export interface ConnectionSite {
  shapeId?: string;
  connectionIndex: number;
  x: number;
  y: number;
}

// =============================================================================
// EXTRACTOR REGISTRY INTERFACES
// =============================================================================

export interface ExtractorRegistryEntry {
  extractor: any; // BaseShapeExtractor instance
  metadata: {
    name: string;
    version: string;
    supportedShapeTypes: string[];
    priority: number;
    capabilities: ExtractorCapabilities;
  };
  isActive: boolean;
  loadedAt: Date;
}

export interface ExtractorSelectionCriteria {
  shapeType: string;
  requiredCapabilities?: Partial<ExtractorCapabilities>;
  preferredExtractor?: string;
  fallbackToGeneric?: boolean;
}

// =============================================================================
// PERFORMANCE & MONITORING INTERFACES
// =============================================================================

export interface ExtractionMetrics {
  startTime: number;
  endTime: number;
  processingTime: number;
  memoryUsage?: {
    before: number;
    after: number;
    peak: number;
  };
  shapeComplexity: 'simple' | 'medium' | 'complex';
  dataSize: number;
}

export interface ExtractorPerformanceProfile {
  extractorName: string;
  totalExtractions: number;
  averageProcessingTime: number;
  minProcessingTime: number;
  maxProcessingTime: number;
  successRate: number;
  errorRate: number;
  lastUsed: Date;
}

// =============================================================================
// ERROR HANDLING INTERFACES
// =============================================================================

export interface ExtractionError {
  code: string;
  message: string;
  context: string;
  extractorName: string;
  shapeType?: string;
  recoverable: boolean;
  timestamp: Date;
  stack?: string;
}

export interface ErrorRecoveryStrategy {
  canRecover: boolean;
  fallbackExtractor?: string;
  skipProperty?: string;
  useDefault?: any;
  retryCount?: number;
}

// =============================================================================
// VALIDATION INTERFACES
// =============================================================================

export interface ValidationRule {
  name: string;
  validator: (data: any) => ValidationResult;
  required: boolean;
  category: 'structure' | 'content' | 'format' | 'performance';
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  score: number; // 0-100
}

export interface SchemaValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  validatedAgainst: string; // schema version
  timestamp: Date;
}

// =============================================================================
// UTILITY TYPE DEFINITIONS
// =============================================================================

export type ShapeTypeMapping = Record<string, string>;
export type ExtractorFactory<T> = () => T;
export type AsyncExtractorFactory<T> = () => Promise<T>;

export interface ExtractorConfiguration {
  enabledExtractors: string[];
  defaultOptions: ShapeExtractionOptions;
  performanceMode: 'speed' | 'quality' | 'balanced';
  errorHandling: 'strict' | 'permissive' | 'fail-fast';
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    includeStackTrace: boolean;
    includeTimings: boolean;
  };
}

// =============================================================================
// EXTRACTION PIPELINE INTERFACES
// =============================================================================

export interface ExtractionPipeline {
  stages: ExtractionStage[];
  configuration: ExtractorConfiguration;
  middleware: ExtractionMiddleware[];
}

export interface ExtractionStage {
  name: string;
  extractor: string;
  enabled: boolean;
  parallel: boolean;
  dependencies: string[];
  timeout: number;
}

export interface ExtractionMiddleware {
  name: string;
  before?: (shape: any, options: ShapeExtractionOptions) => Promise<any>;
  after?: (result: any, shape: any, options: ShapeExtractionOptions) => Promise<any>;
  onError?: (error: ExtractionError, shape: any, options: ShapeExtractionOptions) => Promise<any>;
}

// =============================================================================
// EXPORT CONSOLIDATED TYPES
// =============================================================================

export type AnyExtractionResult = 
  | ChartExtractionResult 
  | TableExtractionResult 
  | PictureExtractionResult 
  | VideoExtractionResult 
  | AudioExtractionResult 
  | SmartArtExtractionResult 
  | OleObjectExtractionResult 
  | ConnectorExtractionResult;

export type AnyShapeData = any; // Will be replaced with specific Aspose shape types 