/**
 * Chart Extractor - Delegates to specialized sub-extractors
 */
import { BaseShapeExtractor, ExtractorMetadata, ExtractionResult, ExtractionContext } from '../base/base-shape-extractor';
import { ConversionOptions } from '../../types/interfaces';
import { ChartExtractionResult } from '../base/extraction-interfaces';
import { ChartSeriesExtractor } from './chart/chart-series-extractor';
import { ChartAxesExtractor } from './chart/chart-axes-extractor';
import { ChartMetadataExtractor } from './chart/chart-metadata-extractor';

// ✅ ROBUST IMPORT: Use AsposeDriverFactory for unified access
const asposeDriver = require('/app/lib/AsposeDriverFactory');

export class ChartExtractor extends BaseShapeExtractor {
  protected metadata: ExtractorMetadata = {
    name: 'ChartExtractor', version: '2.0.0',
    supportedShapeTypes: ['Chart', 'ChartObject'], extractorType: 'complex'
  };

  private seriesExtractor = new ChartSeriesExtractor();
  private axesExtractor = new ChartAxesExtractor();
  private metadataExtractor = new ChartMetadataExtractor();

  constructor() { super(); }

  async extract(shape: any, options: ConversionOptions, context?: ExtractionContext): Promise<ExtractionResult> {
    const startTime = Date.now();
    try {
      if (!(await this.canHandle(shape))) {
        return this.createErrorResult('Shape is not a valid chart', Date.now() - startTime);
      }

      const baseProperties = this.extractBasicProperties(shape);
      const chartData = await this.extractChartData(shape, options);

      const result = { ...baseProperties, shapeType: 'Chart', chartProperties: chartData };
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
      return shape.getShapeType() === ShapeType.Chart;
    } catch (error) {
      this.handleError(error as Error, 'canHandle');
      return false;
    }
  }

  private async extractChartData(shape: any, options: ConversionOptions): Promise<ChartExtractionResult> {
    try {
      const chartData = shape.getChartData();
      if (!chartData) throw new Error('Chart data not available');

      const result: ChartExtractionResult = {
        chartType: this.metadataExtractor.getChartType(chartData),
        hasDataTable: this.metadataExtractor.hasDataTable(chartData),
        hasLegend: this.metadataExtractor.hasLegend(chartData),
        title: this.metadataExtractor.getChartTitle(chartData),
        categories: await this.metadataExtractor.extractCategories(chartData),
        series: await this.seriesExtractor.extractSeries(chartData)
      };

      if (options.includeMetadata) {
        result.axes = this.axesExtractor.extractAxes(chartData);
        result.plotArea = this.metadataExtractor.extractPlotArea(chartData);
      }

      return result;
    } catch (error) {
      this.handleError(error as Error, 'extractChartData');
      return {
        chartType: 'Unknown', hasDataTable: false, hasLegend: false,
        categories: [], series: []
      };
    }
  }
} 