/**
 * Chart Extractor Tests - Unit Tests for Componentized Chart Processing
 * 
 * Validates that the new ChartExtractor properly extracts chart data
 * and maintains compatibility with the Universal Schema.
 */

import { ChartExtractor } from '../../src/adapters/aspose/extractors/shapes/chart-extractor';
import { ConversionOptions } from '../../src/adapters/aspose/types/interfaces';

// =============================================================================
// MOCK ASPOSE OBJECTS
// =============================================================================

function createMockAsposeChart() {
  return {
    getShapeType: () => ({
      toString: () => 'Chart'
    }),
    getName: () => 'Test Chart',
    getAlternativeText: () => 'Chart alternative text',
    getHidden: () => false,
    isLocked: () => false,
    getZOrderPosition: () => 1,
    getFrame: () => ({
      getX: () => 100,
      getY: () => 50,
      getWidth: () => 400,
      getHeight: () => 300
    }),
    getRotation: () => 0,
    getFillFormat: () => null,
    getLineFormat: () => null,
    getEffectFormat: () => null,
    getThreeDFormat: () => null,
    getHyperlinkClick: () => null,
    getHyperlinkMouseOver: () => null,
    getChartData: () => createMockChartData()
  };
}

function createMockChartData() {
  return {
    getChartType: () => 0, // Column chart
    getDataTable: () => ({
      hasTable: () => false
    }),
    getLegend: () => ({
      hasLegend: () => true
    }),
    getChartTitle: () => ({
      hasTitle: () => true,
      getTextFormat: () => ({
        getText: () => 'Sales Data'
      })
    }),
    getCategories: () => ({
      size: () => 3,
      get_Item: (index: number) => createMockCategory(index)
    }),
    getSeries: () => ({
      size: () => 2,
      get_Item: (index: number) => createMockSeries(index)
    }),
    getAxes: () => ({
      size: () => 2,
      get_Item: (index: number) => createMockAxis(index)
    })
  };
}

function createMockCategory(index: number) {
  const categories = ['Q1', 'Q2', 'Q3'];
  return {
    getAsCell: () => ({
      getValue: () => categories[index] || `Category ${index + 1}`
    }),
    getValue: () => categories[index] || `Category ${index + 1}`,
    getFormat: () => null
  };
}

function createMockSeries(index: number) {
  const seriesNames = ['Product A', 'Product B'];
  return {
    getName: () => ({
      getAsString: () => seriesNames[index] || `Series ${index + 1}`
    }),
    getDataPoints: () => ({
      size: () => 3,
      get_Item: (pointIndex: number) => createMockDataPoint(index, pointIndex)
    }),
    getFormat: () => ({
      getFillFormat: () => null,
      getLineFormat: () => null
    })
  };
}

function createMockDataPoint(seriesIndex: number, pointIndex: number) {
  // Mock data values
  const values = [
    [100, 150, 120], // Product A
    [80, 200, 180]   // Product B
  ];
  
  return {
    getValue: () => ({
      getData: () => values[seriesIndex]?.[pointIndex] || 0
    }),
    getFormat: () => null
  };
}

function createMockAxis(index: number) {
  const axisTypes = ['Category', 'Value'];
  return {
    getAxisType: () => index,
    isVisible: () => true,
    getTitle: () => ({
      hasTitle: () => false
    }),
    getMinValue: () => 0,
    getMaxValue: () => 250,
    getFormat: () => ({
      getLineFormat: () => null,
      getTextFormat: () => null
    })
  };
}

// =============================================================================
// TEST SUITE
// =============================================================================

describe('ChartExtractor', () => {
  let chartExtractor: ChartExtractor;
  let mockChart: any;
  let defaultOptions: ConversionOptions;

  beforeEach(() => {
    chartExtractor = new ChartExtractor();
    mockChart = createMockAsposeChart();
    defaultOptions = {
      extractImages: false,
      includeAssets: true,
      includeMetadata: true
    };
  });

  afterEach(async () => {
    if (chartExtractor.dispose) {
      await chartExtractor.dispose();
    }
  });

  // =============================================================================
  // BASIC FUNCTIONALITY TESTS
  // =============================================================================

  describe('Basic Functionality', () => {
    test('should identify chart shapes correctly', () => {
      expect(chartExtractor.canHandle(mockChart)).toBe(true);
    });

    test('should reject non-chart shapes', () => {
      const nonChart = {
        getShapeType: () => ({
          toString: () => 'Rectangle'
        })
      };
      expect(chartExtractor.canHandle(nonChart)).toBe(false);
    });

    test('should have correct metadata', () => {
      const metadata = chartExtractor.getMetadata();
      expect(metadata.name).toBe('ChartExtractor');
      expect(metadata.version).toBe('1.0.0');
      expect(metadata.supportedShapeTypes).toContain('Chart');
      expect(metadata.extractorType).toBe('complex');
    });

    test('should support chart shape type', () => {
      expect(chartExtractor.supportsShapeType('Chart')).toBe(true);
      expect(chartExtractor.supportsShapeType('Table')).toBe(false);
    });
  });

  // =============================================================================
  // EXTRACTION TESTS
  // =============================================================================

  describe('Chart Extraction', () => {
    test('should extract basic chart properties', async () => {
      const result = await chartExtractor.extract(mockChart, defaultOptions);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.shapeType).toBe('Chart');
      expect(result.data.name).toBe('Test Chart');
      expect(result.metadata.extractorUsed).toBe('ChartExtractor');
    });

    test('should extract chart metadata', async () => {
      const result = await chartExtractor.extract(mockChart, defaultOptions);
      
      expect(result.success).toBe(true);
      const chartProps = result.data.chartProperties;
      
      expect(chartProps).toBeDefined();
      expect(chartProps.chartType).toBe('Column');
      expect(chartProps.hasLegend).toBe(true);
      expect(chartProps.hasDataTable).toBe(false);
      expect(chartProps.title).toBe('Sales Data');
    });

    test('should extract categories correctly', async () => {
      const result = await chartExtractor.extract(mockChart, defaultOptions);
      
      expect(result.success).toBe(true);
      const categories = result.data.chartProperties.categories;
      
      expect(categories).toHaveLength(3);
      expect(categories[0].value).toBe('Q1');
      expect(categories[1].value).toBe('Q2');
      expect(categories[2].value).toBe('Q3');
      expect(categories[0].index).toBe(0);
    });

    test('should extract series data correctly', async () => {
      const result = await chartExtractor.extract(mockChart, defaultOptions);
      
      expect(result.success).toBe(true);
      const series = result.data.chartProperties.series;
      
      expect(series).toHaveLength(2);
      expect(series[0].name).toBe('Product A');
      expect(series[1].name).toBe('Product B');
      
      // Check data points
      expect(series[0].values).toHaveLength(3);
      expect(series[0].values[0].value).toBe(100);
      expect(series[0].values[1].value).toBe(150);
      expect(series[0].values[2].value).toBe(120);
    });

    test('should extract axes when metadata is enabled', async () => {
      const result = await chartExtractor.extract(mockChart, { 
        ...defaultOptions, 
        includeMetadata: true 
      });
      
      expect(result.success).toBe(true);
      const axes = result.data.chartProperties.axes;
      
      expect(axes).toBeDefined();
      expect(axes).toHaveLength(2);
      expect(axes[0].type).toBe('Category');
      expect(axes[1].type).toBe('Value');
    });
  });

  // =============================================================================
  // ERROR HANDLING TESTS
  // =============================================================================

  describe('Error Handling', () => {
    test('should handle missing chart data gracefully', async () => {
      const brokenChart = {
        ...mockChart,
        getChartData: () => null
      };

      const result = await chartExtractor.extract(brokenChart, defaultOptions);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Chart data not available');
    });

    test('should handle extraction errors gracefully', async () => {
      const errorChart = {
        ...mockChart,
        getChartData: () => {
          throw new Error('Chart data access failed');
        }
      };

      const result = await chartExtractor.extract(errorChart, defaultOptions);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Chart data access failed');
    });

    test('should handle missing categories gracefully', async () => {
      const chartWithoutCategories = {
        ...mockChart,
        getChartData: () => ({
          ...createMockChartData(),
          getCategories: () => ({
            size: () => 0
          })
        })
      };

      const result = await chartExtractor.extract(chartWithoutCategories, defaultOptions);
      
      expect(result.success).toBe(true);
      expect(result.data.chartProperties.categories).toHaveLength(0);
    });

    test('should handle missing series gracefully', async () => {
      const chartWithoutSeries = {
        ...mockChart,
        getChartData: () => ({
          ...createMockChartData(),
          getSeries: () => ({
            size: () => 0
          })
        })
      };

      const result = await chartExtractor.extract(chartWithoutSeries, defaultOptions);
      
      expect(result.success).toBe(true);
      expect(result.data.chartProperties.series).toHaveLength(0);
    });
  });

  // =============================================================================
  // SCHEMA VALIDATION TESTS
  // =============================================================================

  describe('Schema Validation', () => {
    test('should produce data that matches Universal Schema structure', async () => {
      const result = await chartExtractor.extract(mockChart, defaultOptions);
      
      expect(result.success).toBe(true);
      const data = result.data;
      
      // Validate basic shape structure
      expect(data).toHaveProperty('shapeType');
      expect(data).toHaveProperty('name');
      expect(data).toHaveProperty('geometry');
      expect(data).toHaveProperty('chartProperties');
      
      // Validate chart-specific structure
      const chartProps = data.chartProperties;
      expect(chartProps).toHaveProperty('chartType');
      expect(chartProps).toHaveProperty('categories');
      expect(chartProps).toHaveProperty('series');
      expect(chartProps).toHaveProperty('hasLegend');
      expect(chartProps).toHaveProperty('hasDataTable');
    });

    test('should include all required chart fields', async () => {
      const result = await chartExtractor.extract(mockChart, defaultOptions);
      
      expect(result.success).toBe(true);
      const chartProps = result.data.chartProperties;
      
      expect(typeof chartProps.chartType).toBe('string');
      expect(typeof chartProps.hasLegend).toBe('boolean');
      expect(typeof chartProps.hasDataTable).toBe('boolean');
      expect(Array.isArray(chartProps.categories)).toBe(true);
      expect(Array.isArray(chartProps.series)).toBe(true);
    });
  });

  // =============================================================================
  // PERFORMANCE TESTS
  // =============================================================================

  describe('Performance', () => {
    test('should extract chart data within reasonable time', async () => {
      const startTime = Date.now();
      const result = await chartExtractor.extract(mockChart, defaultOptions);
      const endTime = Date.now();
      
      expect(result.success).toBe(true);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
      expect(result.metadata.processingTime).toBeLessThan(1000);
    });

    test('should handle large charts efficiently', async () => {
      // Create a larger chart with more data points
      const largeChart = {
        ...mockChart,
        getChartData: () => ({
          ...createMockChartData(),
          getCategories: () => ({
            size: () => 20,
            get_Item: (index: number) => createMockCategory(index)
          }),
          getSeries: () => ({
            size: () => 10,
            get_Item: (index: number) => createMockSeries(index)
          })
        })
      };

      const startTime = Date.now();
      const result = await chartExtractor.extract(largeChart, defaultOptions);
      const endTime = Date.now();
      
      expect(result.success).toBe(true);
      expect(endTime - startTime).toBeLessThan(2000); // Should still complete within 2 seconds
    });
  });

  // =============================================================================
  // INTEGRATION TESTS
  // =============================================================================

  describe('Integration', () => {
    test('should work with minimal options', async () => {
      const minimalOptions: ConversionOptions = {};
      const result = await chartExtractor.extract(mockChart, minimalOptions);
      
      expect(result.success).toBe(true);
      expect(result.data.chartProperties).toBeDefined();
    });

    test('should respect extraction options', async () => {
      const optionsWithoutMetadata: ConversionOptions = {
        includeMetadata: false
      };
      
      const result = await chartExtractor.extract(mockChart, optionsWithoutMetadata);
      
      expect(result.success).toBe(true);
      expect(result.data.chartProperties.axes).toBeUndefined();
      expect(result.data.chartProperties.plotArea).toBeUndefined();
    });
  });
}); 