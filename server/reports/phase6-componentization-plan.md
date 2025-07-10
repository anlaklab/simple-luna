# 🎯 PHASE 6: DETAILED COMPONENTIZATION PLAN
**Based on Code Analysis - Implementation Ready**

## 📊 **SHAPE-EXTRACTOR.TS SURGERY PLAN (730 → ~100 lines)**

### **Current Structure Analysis**:
```typescript
ShapeExtractor (730 lines):
├── Core Methods (120 lines):
│   ├── processShape() - 65 lines
│   ├── extractLineFormat() - 30 lines
│   └── extractHyperlink() - 25 lines
├── Type-Specific Switch (71 lines):
│   └── extractTypeSpecificProperties() - 71 lines
├── Shape Type Extractors (450+ lines):
│   ├── extractPictureProperties() - 25 lines
│   ├── extractChartData() - 64 lines
│   ├── extractTableData() - 64 lines
│   ├── extractVideoProperties() - 55 lines
│   ├── extractAudioProperties() - 55 lines
│   ├── extractSmartArtProperties() - 66 lines
│   ├── extractOleObjectProperties() - 56 lines
│   └── extractConnectorProperties() - 61 lines
└── Utilities (89 lines):
    ├── mapShapeType() - 18 lines
    └── extractImageData() - 12 lines
```

### **🔧 COMPONENTIZATION EXECUTION**:

#### **Step 1: Create Base Structure**
```
server/src/adapters/aspose/extractors/
├── base/
│   ├── base-shape-extractor.ts
│   └── extraction-interfaces.ts
├── shapes/
│   ├── shape-extractor.ts (coordinator)
│   ├── chart-extractor.ts
│   ├── table-extractor.ts
│   ├── media-extractor.ts
│   ├── smartart-extractor.ts
│   ├── ole-extractor.ts
│   └── connector-extractor.ts
└── utils/
    └── shape-type-mapper.ts
```

#### **Step 2: Component Breakdown**

##### **🎯 base-shape-extractor.ts** (<50 lines)
```typescript
export abstract class BaseShapeExtractor {
  protected fillExtractor: FillExtractor;
  protected effectExtractor: EffectExtractor;
  protected textExtractor: TextExtractor;
  protected geometryExtractor: GeometryExtractor;

  constructor() { /* injections */ }
  
  protected extractLineFormat(lineFormat: any): any | null { /* move here */ }
  protected extractHyperlink(hyperlink: any): any | null { /* move here */ }
  protected handleError(error: Error, context: string): any { /* error handling */ }
  
  abstract extract(shape: any, options: ConversionOptions): Promise<any>;
}
```

##### **🎯 shape-extractor.ts (coordinator)** (<100 lines)
```typescript
export class ShapeExtractor extends BaseShapeExtractor {
  private extractors: Map<string, BaseShapeExtractor>;

  constructor() {
    super();
    this.extractors = new Map([
      ['Chart', new ChartExtractor()],
      ['Table', new TableExtractor()],
      ['Picture', new MediaExtractor()],
      ['Video', new MediaExtractor()],
      ['Audio', new MediaExtractor()],
      ['SmartArt', new SmartArtExtractor()],
      ['OleObject', new OleExtractor()],
      ['Connector', new ConnectorExtractor()]
    ]);
  }

  async processShape(shape: any, options: ConversionOptions): Promise<any | null> {
    // Simplified coordinator logic
    const shapeType = this.mapShapeType(shape.getShapeType());
    const extractor = this.extractors.get(shapeType);
    
    if (extractor) {
      return await extractor.extract(shape, options);
    }
    
    return this.extractBasicShape(shape, options);
  }
}
```

##### **🎯 chart-extractor.ts** (<100 lines)
```typescript
export class ChartExtractor extends BaseShapeExtractor {
  async extract(shape: any, options: ConversionOptions): Promise<any> {
    // Move extractChartData() logic here
    // Add chart-specific error handling
    // Modularize categories/series extraction
  }
  
  private extractCategories(chartData: any): any[] { /* <20 lines */ }
  private extractSeries(chartData: any): any[] { /* <30 lines */ }
  private extractChartFormat(chartData: any): any { /* <20 lines */ }
}
```

##### **🎯 table-extractor.ts** (<100 lines)
```typescript
export class TableExtractor extends BaseShapeExtractor {
  async extract(shape: any, options: ConversionOptions): Promise<any> {
    // Move extractTableData() logic here
  }
  
  private extractRows(table: any): any[] { /* <30 lines */ }
  private extractColumns(table: any): any[] { /* <20 lines */ }
  private extractCellData(cell: any): any { /* <25 lines */ }
}
```

##### **🎯 media-extractor.ts** (<100 lines)
```typescript
export class MediaExtractor extends BaseShapeExtractor {
  async extract(shape: any, options: ConversionOptions): Promise<any> {
    const shapeType = shape.getShapeType().toString();
    
    switch (shapeType) {
      case 'Picture': return this.extractPictureProperties(shape, options);
      case 'VideoFrame': return this.extractVideoProperties(shape);
      case 'AudioFrame': return this.extractAudioProperties(shape);
    }
  }
  
  private extractPictureProperties(shape: any, options: any): any { /* <25 lines */ }
  private extractVideoProperties(shape: any): any { /* <35 lines */ }
  private extractAudioProperties(shape: any): any { /* <35 lines */ }
}
```

## 📋 **IMPLEMENTATION SCHEDULE**

### **🔥 Day 2.1: Core Infrastructure (2 hours)**
1. Create base structure directories
2. Implement `BaseShapeExtractor` abstract class
3. Create `extraction-interfaces.ts` with TypeScript interfaces
4. Setup error handling and logging standards

### **🔥 Day 2.2: Chart Extractor (1.5 hours)**
1. Create `chart-extractor.ts`
2. Move `extractChartData()` logic
3. Break into `extractCategories()`, `extractSeries()`, `extractChartFormat()`
4. Add error handling and tests

### **🔥 Day 2.3: Table Extractor (1.5 hours)**
1. Create `table-extractor.ts`
2. Move `extractTableData()` logic
3. Break into `extractRows()`, `extractColumns()`, `extractCellData()`
4. Add error handling and tests

### **🔥 Day 2.4: Media Extractor (1 hour)**
1. Create `media-extractor.ts`
2. Combine picture, video, audio extraction
3. Common media utilities
4. Add error handling and tests

## 🧪 **TESTING STRATEGY**

### **Unit Tests per Component**:
```typescript
// chart-extractor.test.ts
describe('ChartExtractor', () => {
  test('extracts chart data with categories and series', async () => {
    const mockChart = createMockAsposeChart();
    const extractor = new ChartExtractor();
    const result = await extractor.extract(mockChart, {});
    
    expect(result.categories).toBeDefined();
    expect(result.series).toHaveLength(2);
    expect(result.chartType).toBe('Column');
  });
});
```

### **Integration Tests**:
```typescript
// shape-extractor.integration.test.ts
describe('ShapeExtractor Integration', () => {
  test('processes all shape types correctly', async () => {
    const shapes = [mockChart, mockTable, mockVideo];
    const extractor = new ShapeExtractor();
    
    for (const shape of shapes) {
      const result = await extractor.processShape(shape, {});
      expect(result).toBeDefined();
      expect(result.shapeType).toBeTruthy();
    }
  });
});
```

## 📊 **METRICS TRACKING**

### **Before Componentization**:
- shape-extractor.ts: 730 lines
- Methods >50 lines: 9 methods
- Single responsibility: ❌
- Testability: Low
- Maintainability: Poor

### **After Componentization Target**:
- shape-extractor.ts: <100 lines (coordinator)
- 6 specialized extractors: <100 lines each
- Methods >50 lines: 0 methods
- Single responsibility: ✅
- Testability: High
- Maintainability: Excellent

## 🔄 **DYNAMIC REGISTRY INTEGRATION**

### **Updated Dynamic Loading**:
```typescript
// dynamic-loading.config.ts
allowedExtensionTypes: [
  'chart', 'table', 'media', 'smartart', 'ole', 'connector',
  'picture', 'video', 'audio', 'shape-base'
]
```

### **Registry Update**:
```typescript
// Shape extractors auto-registration
const shapeExtractors = [
  ChartExtractor, TableExtractor, MediaExtractor,
  SmartArtExtractor, OleExtractor, ConnectorExtractor
];

shapeExtractors.forEach(ExtractorClass => {
  dynamicRegistry.set(ExtractorClass.name.toLowerCase(), new ExtractorClass());
});
```

## ✅ **SUCCESS CRITERIA VALIDATION**

### **Phase 6 Day 2 Complete When**:
- [ ] All shape extractors <100 lines
- [ ] All methods <50 lines
- [ ] Zero breaking changes to `ShapeExtractor.processShape()` API
- [ ] Unit tests >80% coverage
- [ ] Integration tests passing
- [ ] Error handling robust
- [ ] Performance maintained or improved

---

**Next**: Day 3 - Slide Extractor & Services Componentization 