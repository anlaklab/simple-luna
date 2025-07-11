# 🎯 PHASE 6: PRÓXIMOS PASOS ESPECÍFICOS
**Guía de Refinamiento para Completar la Componentización**

## 🚀 **ACCIÓN INMEDIATA: REFINAMIENTO DE LÍNEAS**

### **📊 ChartExtractor (496 → <100 líneas)**

#### **Paso 1: Dividir ChartExtractor**
```bash
# Crear subdirectorio para chart components
mkdir -p src/adapters/aspose/extractors/shapes/chart/

# Crear archivos especializados:
touch src/adapters/aspose/extractors/shapes/chart/chart-series-extractor.ts
touch src/adapters/aspose/extractors/shapes/chart/chart-axes-extractor.ts  
touch src/adapters/aspose/extractors/shapes/chart/chart-legend-extractor.ts
```

#### **Paso 2: Extraer Métodos Específicos**
```typescript
// chart-series-extractor.ts (< 80 líneas)
export class ChartSeriesExtractor {
  async extractSeries(chartData: any): Promise<ChartSeries[]> {
    // Mover extractSeries() + extractDataPoints() aquí
  }
}

// chart-axes-extractor.ts (< 60 líneas)  
export class ChartAxesExtractor {
  extractAxes(chartData: any): ChartAxis[] {
    // Mover extractAxes() + extractSingleAxis() aquí
  }
}
```

#### **Paso 3: Refactorizar ChartExtractor Principal**
```typescript
// chart-extractor.ts (< 100 líneas)
import { ChartSeriesExtractor } from './chart/chart-series-extractor';
import { ChartAxesExtractor } from './chart/chart-axes-extractor';

export class ChartExtractor extends BaseShapeExtractor {
  private seriesExtractor = new ChartSeriesExtractor();
  private axesExtractor = new ChartAxesExtractor();
  
  async extract(shape: any, options: ConversionOptions): Promise<ExtractionResult> {
    // Coordinación ligera usando sub-extractors
    const series = await this.seriesExtractor.extractSeries(chartData);
    const axes = this.axesExtractor.extractAxes(chartData);
  }
}
```

### **📋 TableExtractor (492 → <100 líneas)**

#### **Estructura Objetivo**:
```
table/
├── table-rows-extractor.ts     (< 80 líneas)
├── table-columns-extractor.ts  (< 60 líneas)  
├── table-cells-extractor.ts    (< 80 líneas)
└── table-style-extractor.ts    (< 40 líneas)
```

### **🎬 MediaExtractor (508 → <100 líneas)**

#### **Estructura Objetivo**:
```
media/
├── picture-extractor.ts        (< 80 líneas)
├── video-extractor.ts          (< 80 líneas)
├── audio-extractor.ts          (< 80 líneas)
└── media-base-extractor.ts     (< 60 líneas)
```

## 🔄 **REEMPLAZO DEL ARCHIVO ORIGINAL**

### **Paso 1: Backup y Preparación**
```bash
# Backup del archivo original
cp src/adapters/aspose/shape-extractor.ts src/adapters/aspose/shape-extractor-v1-backup.ts

# Verificar importaciones existentes
grep -r "from.*shape-extractor" src/ --include="*.ts"
```

### **Paso 2: Actualizar Imports**
```bash
# Script de reemplazo automático
find src/ -name "*.ts" -exec sed -i '' 's|from '\''.*shape-extractor'\''|from '\''./extractors/shapes/shape-extractor'\''|g' {} \;
```

### **Paso 3: Reemplazar Archivo Principal**
```bash
# Copiar coordinator como nuevo shape-extractor
cp src/adapters/aspose/extractors/shapes/shape-extractor-coordinator.ts src/adapters/aspose/shape-extractor.ts

# Actualizar exports para mantener compatibilidad
echo "export { ShapeExtractor } from './extractors/shapes/shape-extractor-coordinator';" >> src/adapters/aspose/shape-extractor.ts
```

## ➕ **EXTRACTORS FALTANTES**

### **SmartArtExtractor**
```typescript
// src/adapters/aspose/extractors/shapes/smartart-extractor.ts
export class SmartArtExtractor extends BaseShapeExtractor {
  protected metadata: ExtractorMetadata = {
    name: 'SmartArtExtractor',
    supportedShapeTypes: ['SmartArt']
  };
  
  async extract(shape: any, options: ConversionOptions): Promise<ExtractionResult> {
    // Implementar extracción de SmartArt
  }
}
```

### **OleObjectExtractor**
```typescript
// src/adapters/aspose/extractors/shapes/ole-extractor.ts
export class OleObjectExtractor extends BaseShapeExtractor {
  protected metadata: ExtractorMetadata = {
    name: 'OleObjectExtractor', 
    supportedShapeTypes: ['OleObject', 'OleObjectFrame']
  };
}
```

## 🧪 **COMPLETAR TESTING**

### **Crear Tests Faltantes**
```bash
# Tests para cada extractor especializado
touch tests/extractors/table-extractor.test.ts
touch tests/extractors/media-extractor.test.ts
touch tests/extractors/smartart-extractor.test.ts
touch tests/extractors/ole-extractor.test.ts

# Integration tests
touch tests/integration/shape-coordinator.integration.test.ts
touch tests/integration/round-trip.test.ts
```

### **Template de Test**
```typescript
// template-extractor.test.ts
import { [ExtractorName] } from '../../src/adapters/aspose/extractors/shapes/[extractor-name]';

describe('[ExtractorName]', () => {
  let extractor: [ExtractorName];
  
  beforeEach(() => {
    extractor = new [ExtractorName]();
  });
  
  test('should extract [shape type] correctly', async () => {
    const mockShape = createMock[ShapeType]();
    const result = await extractor.extract(mockShape, {});
    
    expect(result.success).toBe(true);
    expect(result.data.shapeType).toBe('[ShapeType]');
  });
});
```

## 📊 **VALIDACIÓN CONTINUA**

### **Script de Monitoreo**
```bash
# Ejecutar validación después de cada cambio
npm run validate-phase6() {
  node scripts/validate-componentization.js
  echo "Target: 100% success rate"
}

# Validar líneas de código
npm run check-lines() {
  find src/adapters/aspose/extractors -name "*.ts" -exec wc -l {} \; | awk '$1 > 100 {print "❌ " $2 " has " $1 " lines"}'
}
```

### **Métricas Objetivo Finales**
```bash
✅ Todos los extractors < 100 líneas
✅ Todos los métodos < 50 líneas  
✅ Tests coverage > 80%
✅ Zero breaking changes
✅ Performance maintained
✅ 100% validation success rate
```

## 🎯 **CRONOGRAMA DE REFINAMIENTO**

### **Día 1: Refinamiento Chart & Table**
- [ ] Dividir ChartExtractor en sub-extractors
- [ ] Dividir TableExtractor en sub-extractors  
- [ ] Validar que ambos quedan < 100 líneas

### **Día 2: Refinamiento Media & Coordinator**
- [ ] Dividir MediaExtractor en extractors específicos
- [ ] Refactorizar Coordinator para < 100 líneas
- [ ] Extraer Registry Management

### **Día 3: Reemplazo Original**
- [ ] Backup shape-extractor.ts original
- [ ] Actualizar todos los imports
- [ ] Reemplazar con coordinator
- [ ] Validar funcionamiento

### **Día 4: Extractors Faltantes**
- [ ] Implementar SmartArtExtractor
- [ ] Implementar OleObjectExtractor
- [ ] Implementar ConnectorExtractor

### **Día 5: Testing Completo**
- [ ] Tests para todos los extractors
- [ ] Integration tests
- [ ] Round-trip validation tests

## ✅ **CRITERIOS DE ÉXITO FINAL**

### **Validación Automática**
```bash
node scripts/validate-componentization.js
# Expected: 100% success rate

node scripts/analyze-extractors.js  
# Expected: All files < 100 lines
```

### **Métricas de Calidad**
- [ ] **Líneas**: Todos los archivos < 100 líneas
- [ ] **Métodos**: Todos los métodos < 50 líneas
- [ ] **Tests**: Coverage > 80%
- [ ] **Performance**: Sin degradación
- [ ] **API**: Zero breaking changes
- [ ] **Tipos**: 100% TypeScript sin `any`

### **Validación Manual**
- [ ] Importar shape-extractor funciona igual que antes
- [ ] Todos los tipos de shapes se procesan correctamente
- [ ] Error handling funciona en todos los extractors
- [ ] Logging es consistente y útil

---

**🎊 Al completar estos pasos, Phase 6 alcanzará el 100% de sus objetivos con una arquitectura de clase enterprise totalmente modular y mantenible.** 