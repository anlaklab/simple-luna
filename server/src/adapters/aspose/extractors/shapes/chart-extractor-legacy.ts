/**
 * Chart Extractor - Specialized Shape Extractor for Chart Objects
 * 
 * Handles comprehensive extraction of chart data including:
 * - Categories and series data
 * - Chart formatting and styles  
 * - Axes configuration
 * - Legend and data table settings
 */

import { BaseShapeExtractor, ExtractorMetadata, ExtractionResult, ExtractionContext } from '../base/base-shape-extractor';
import { ConversionOptions } from '../../types/interfaces';
import { ChartExtractionResult, ChartCategory, ChartSeries, ChartDataPoint, ChartAxis } from '../base/extraction-interfaces';

// ✅ ROBUST IMPORT: Use AsposeDriverFactory for unified access
const asposeDriver = require('/app/lib/AsposeDriverFactory');

export class ChartExtractor extends BaseShapeExtractor {
  protected metadata: ExtractorMetadata = {
    name: 'ChartExtractor',
    version: '1.0.0',
    supportedShapeTypes: ['Chart', 'ChartObject'],
    extractorType: 'complex'
  };

  // =============================================================================
  // MAIN EXTRACTION METHOD
  // =============================================================================

  async extract(
    shape: any, 
    options: ConversionOptions, 
    context?: ExtractionContext
  ): Promise<ExtractionResult> {
    const startTime = Date.now();

    try {
      if (!(await this.canHandle(shape))) {
        return this.createErrorResult('Shape is not a valid chart', Date.now() - startTime);
      }

      // Extract basic shape properties
      const baseProperties = this.extractBasicProperties(shape);
      
      // Extract chart-specific data
      const chartData = await this.extractChartData(shape, options);

      const result = {
        ...baseProperties,
        shapeType: 'Chart',
        chartProperties: chartData
      };

      this.logSuccess('chart extraction', result, Date.now() - startTime);
      return this.createSuccessResult(result, Date.now() - startTime);

    } catch (error) {
      this.handleError(error as Error, 'extract');
      return this.createErrorResult((error as Error).message, Date.now() - startTime);
    }
  }

  async canHandle(shape: any): Promise<boolean> {
    try {
      // ✅ REFACTORED: Use AsposeDriverFactory instead of direct import
      await asposeDriver.initialize();
      const ShapeType = await asposeDriver.getShapeTypes();
      const shapeType = shape.getShapeType();
      return shapeType === ShapeType.Chart;
    } catch (error) {
      this.handleError(error as Error, 'canHandle');
      return false;
    }
  }

  // =============================================================================
  // CHART DATA EXTRACTION (Refactored from original)
  // =============================================================================

  private async extractChartData(shape: any, options: ConversionOptions): Promise<ChartExtractionResult> {
    try {
      const chartData = shape.getChartData();
      if (!chartData) {
        throw new Error('Chart data not available');
      }

      const result: ChartExtractionResult = {
        chartType: this.getChartType(chartData),
        hasDataTable: this.hasDataTable(chartData),
        hasLegend: this.hasLegend(chartData),
        title: this.getChartTitle(chartData),
        categories: await this.extractCategories(chartData),
        series: await this.extractSeries(chartData)
      };

      // Extract axes information if available
      if (options.includeMetadata) {
        result.axes = this.extractAxes(chartData);
        result.plotArea = this.extractPlotArea(chartData);
      }

      return result;

    } catch (error) {
      this.handleError(error as Error, 'extractChartData');
      return {
        chartType: 'Unknown',
        hasDataTable: false,
        hasLegend: false,
        categories: [],
        series: []
      };
    }
  }

  // =============================================================================
  // CHART METADATA EXTRACTION
  // =============================================================================

  private getChartType(chartData: any): string {
    try {
      const chartType = chartData.getChartType ? chartData.getChartType() : 0;
      const typeMap: Record<number, string> = {
        0: 'Column',
        1: 'Bar',
        2: 'Line',
        3: 'Pie',
        4: 'Scatter',
        5: 'Area',
        6: 'Doughnut',
        7: 'Radar',
        8: 'Surface',
        9: 'Bubble'
      };
      return typeMap[chartType] || `Type_${chartType}`;
    } catch (error) {
      this.handleError(error as Error, 'getChartType');
      return 'Unknown';
    }
  }

  private hasDataTable(chartData: any): boolean {
    try {
      return chartData.getDataTable ? chartData.getDataTable().hasTable() : false;
    } catch (error) {
      return false;
    }
  }

  private hasLegend(chartData: any): boolean {
    try {
      return chartData.getLegend ? chartData.getLegend().hasLegend() : false;
    } catch (error) {
      return false;
    }
  }

  private getChartTitle(chartData: any): string | undefined {
    try {
      const chartTitle = chartData.getChartTitle();
      if (chartTitle && chartTitle.hasTitle()) {
        return chartTitle.getTextFormat().getText();
      }
      return undefined;
    } catch (error) {
      return undefined;
    }
  }

  // =============================================================================
  // CATEGORIES EXTRACTION
  // =============================================================================

  private async extractCategories(chartData: any): Promise<ChartCategory[]> {
    try {
      const categories: ChartCategory[] = [];
      
      if (!chartData.getCategories || chartData.getCategories().size() === 0) {
        return categories;
      }

      const categoryCollection = chartData.getCategories();
      
      for (let i = 0; i < categoryCollection.size(); i++) {
        try {
          const category = categoryCollection.get_Item(i);
          const categoryData: ChartCategory = {
            index: i,
            value: this.getCategoryValue(category)
          };

          // Extract category formatting if available
          if (category.getFormat) {
            categoryData.format = this.extractCategoryFormat(category);
          }

          categories.push(categoryData);

        } catch (categoryError) {
          this.handleError(categoryError as Error, `extractCategories[${i}]`);
          // Continue with next category
          categories.push({
            index: i,
            value: `Category_${i + 1}`
          });
        }
      }

      return categories;

    } catch (error) {
      this.handleError(error as Error, 'extractCategories');
      return [];
    }
  }

  private getCategoryValue(category: any): string | number {
    try {
      if (category.getAsCell) {
        const cell = category.getAsCell();
        return cell.getValue ? cell.getValue() : cell.toString();
      }
      if (category.getValue) {
        return category.getValue();
      }
      return category.toString();
    } catch (error) {
      return 'Unknown';
    }
  }

  private extractCategoryFormat(category: any): any {
    try {
      const format = category.getFormat();
      return {
        fillFormat: format.getFillFormat ? 
          this.fillExtractor.extractFillFormat(format.getFillFormat()) : null,
        lineFormat: format.getLineFormat ? 
          this.extractLineFormat(format.getLineFormat()) : null
      };
    } catch (error) {
      return null;
    }
  }

  // =============================================================================
  // SERIES EXTRACTION
  // =============================================================================

  private async extractSeries(chartData: any): Promise<ChartSeries[]> {
    try {
      const series: ChartSeries[] = [];
      
      if (!chartData.getSeries || chartData.getSeries().size() === 0) {
        return series;
      }

      const seriesCollection = chartData.getSeries();
      
      for (let i = 0; i < seriesCollection.size(); i++) {
        try {
          const serie = seriesCollection.get_Item(i);
          const seriesData: ChartSeries = {
            name: this.getSeriesName(serie, i),
            values: await this.extractDataPoints(serie)
          };

          // Extract series formatting
          seriesData.fillFormat = this.extractSeriesFillFormat(serie);
          seriesData.lineFormat = this.extractSeriesLineFormat(serie);

          series.push(seriesData);

        } catch (seriesError) {
          this.handleError(seriesError as Error, `extractSeries[${i}]`);
          // Continue with next series
          series.push({
            name: `Series_${i + 1}`,
            values: []
          });
        }
      }

      return series;

    } catch (error) {
      this.handleError(error as Error, 'extractSeries');
      return [];
    }
  }

  private getSeriesName(serie: any, index: number): string {
    try {
      if (serie.getName) {
        const name = serie.getName();
        return name.getAsString ? name.getAsString() : name.toString();
      }
      return `Series_${index + 1}`;
    } catch (error) {
      return `Series_${index + 1}`;
    }
  }

  private async extractDataPoints(serie: any): Promise<ChartDataPoint[]> {
    try {
      const dataPoints: ChartDataPoint[] = [];
      
      if (!serie.getDataPoints || serie.getDataPoints().size() === 0) {
        return dataPoints;
      }

      const pointsCollection = serie.getDataPoints();
      
      for (let j = 0; j < pointsCollection.size(); j++) {
        try {
          const point = pointsCollection.get_Item(j);
          const pointData: ChartDataPoint = {
            index: j,
            value: this.getDataPointValue(point)
          };

          // Extract point formatting if available
          if (point.getFormat) {
            pointData.format = this.extractDataPointFormat(point);
          }

          dataPoints.push(pointData);

        } catch (pointError) {
          this.handleError(pointError as Error, `extractDataPoints[${j}]`);
          dataPoints.push({
            index: j,
            value: null
          });
        }
      }

      return dataPoints;

    } catch (error) {
      this.handleError(error as Error, 'extractDataPoints');
      return [];
    }
  }

  private getDataPointValue(point: any): number | null {
    try {
      if (point.getValue) {
        const value = point.getValue();
        return value.getData ? value.getData() : Number(value);
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  // =============================================================================
  // FORMATTING EXTRACTION
  // =============================================================================

  private extractSeriesFillFormat(serie: any): any {
    try {
      if (serie.getFormat && serie.getFormat().getFillFormat) {
        return this.fillExtractor.extractFillFormat(serie.getFormat().getFillFormat());
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  private extractSeriesLineFormat(serie: any): any {
    try {
      if (serie.getFormat && serie.getFormat().getLineFormat) {
        return this.extractLineFormat(serie.getFormat().getLineFormat());
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  private extractDataPointFormat(point: any): any {
    try {
      const format = point.getFormat();
      return {
        fillFormat: format.getFillFormat ? 
          this.fillExtractor.extractFillFormat(format.getFillFormat()) : null,
        lineFormat: format.getLineFormat ? 
          this.extractLineFormat(format.getLineFormat()) : null
      };
    } catch (error) {
      return null;
    }
  }

  // =============================================================================
  // AXES & PLOT AREA EXTRACTION
  // =============================================================================

  private extractAxes(chartData: any): ChartAxis[] {
    try {
      const axes: ChartAxis[] = [];
      
      // Extract primary axes
      if (chartData.getAxes) {
        const axesCollection = chartData.getAxes();
        for (let i = 0; i < axesCollection.size(); i++) {
          const axis = axesCollection.get_Item(i);
          axes.push(this.extractSingleAxis(axis));
        }
      }

      return axes;
    } catch (error) {
      this.handleError(error as Error, 'extractAxes');
      return [];
    }
  }

  private extractSingleAxis(axis: any): ChartAxis {
    try {
      return {
        type: this.getAxisType(axis),
        title: this.getAxisTitle(axis),
        visible: axis.isVisible ? axis.isVisible() : true,
        min: axis.getMinValue ? axis.getMinValue() : undefined,
        max: axis.getMaxValue ? axis.getMaxValue() : undefined,
        format: this.extractAxisFormat(axis)
      };
    } catch (error) {
      return {
        type: 'Value',
        visible: true
      };
    }
  }

  private getAxisType(axis: any): 'Category' | 'Value' | 'Series' {
    try {
      const axisType = axis.getAxisType ? axis.getAxisType() : 0;
      const typeMap: Record<number, 'Category' | 'Value' | 'Series'> = {
        0: 'Category',
        1: 'Value',
        2: 'Series'
      };
      return typeMap[axisType] || 'Value';
    } catch (error) {
      return 'Value';
    }
  }

  private getAxisTitle(axis: any): string | undefined {
    try {
      const title = axis.getTitle();
      if (title && title.hasTitle()) {
        return title.getTextFormat().getText();
      }
      return undefined;
    } catch (error) {
      return undefined;
    }
  }

  private extractAxisFormat(axis: any): any {
    try {
      const format = axis.getFormat();
      return {
        lineFormat: format.getLineFormat ? 
          this.extractLineFormat(format.getLineFormat()) : null,
        textFormat: format.getTextFormat ? 
          this.textExtractor.extractTextFrame(format.getTextFormat()) : null
      };
    } catch (error) {
      return null;
    }
  }

  private extractPlotArea(chartData: any): any {
    try {
      const plotArea = chartData.getPlotArea();
      if (!plotArea) return null;

      return {
        x: plotArea.getX ? plotArea.getX() : 0,
        y: plotArea.getY ? plotArea.getY() : 0,
        width: plotArea.getWidth ? plotArea.getWidth() : 0,
        height: plotArea.getHeight ? plotArea.getHeight() : 0,
        fillFormat: plotArea.getFillFormat ? 
          this.fillExtractor.extractFillFormat(plotArea.getFillFormat()) : null,
        lineFormat: plotArea.getLineFormat ? 
          this.extractLineFormat(plotArea.getLineFormat()) : null
      };
    } catch (error) {
      this.handleError(error as Error, 'extractPlotArea');
      return null;
    }
  }
} 