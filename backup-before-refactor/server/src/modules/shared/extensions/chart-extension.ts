/**
 * ChartExtension - Dynamic Extension for Chart Processing
 * 
 * Dynamically loaded extension for chart shape processing.
 * Follows the standard extension interface for compatibility.
 */

import { logger } from '../../../utils/logger';

export interface ExtensionInterface {
  readonly name: string;
  readonly version: string;
  readonly supportedTypes: string[];
  extract(shape: any, options?: any): Promise<any>;
  initialize?(): Promise<void>;
  dispose?(): Promise<void>;
}

export default class ChartExtension implements ExtensionInterface {
  readonly name = 'chart';
  readonly version = '1.0.0';
  readonly supportedTypes = ['Chart', 'ChartObject'];

  private aspose: any;

  constructor(dependencies: { aspose?: any } = {}) {
    this.aspose = dependencies.aspose;
    logger.info('ChartExtension instance created');
  }

  async initialize(): Promise<void> {
    logger.info('ChartExtension initialized');
  }

  async extract(shape: any, options: any = {}): Promise<any> {
    try {
      logger.info('ChartExtension processing chart shape');

      if (!shape.getChartData) {
        return null;
      }

      const chartData = shape.getChartData();
      
      const chartInfo = {
        type: 'chart',
        chartType: chartData.getChartType ? chartData.getChartType().toString() : 'Unknown',
        title: this.extractChartTitle(chartData),
        series: await this.extractSeries(chartData),
        categories: await this.extractCategories(chartData),
        axes: await this.extractAxes(chartData),
        legend: await this.extractLegend(chartData),
        metadata: {
          extractedBy: 'ChartExtension',
          version: this.version,
          extractedAt: new Date().toISOString()
        }
      };

      logger.info('Chart extraction completed', { 
        chartType: chartInfo.chartType,
        seriesCount: chartInfo.series?.length || 0
      });

      return chartInfo;

    } catch (error) {
      logger.error('Chart extraction failed', { error: (error as Error).message });
      return null;
    }
  }

  // Subcomponent: extractSeries (hook interno)
  async extractSeries(chartData: any): Promise<any[]> {
    try {
      const series: any[] = [];
      
      if (!chartData.getSeries) {
        return series;
      }

      const chartSeries = chartData.getSeries();
      const seriesCount = chartSeries.size ? chartSeries.size() : 0;

      for (let i = 0; i < seriesCount; i++) {
        try {
          const serie = chartSeries.get_Item(i);
          const serieData = {
            index: i,
            name: serie.getName ? serie.getName() : `Series ${i}`,
            type: serie.getType ? serie.getType().toString() : 'Unknown',
            dataPoints: await this.extractDataPoints(serie)
          };
          series.push(serieData);
        } catch (serieError) {
          logger.warn(`Failed to extract series ${i}`, { error: (serieError as Error).message });
        }
      }

      return series;

    } catch (error) {
      logger.warn('Failed to extract chart series', { error: (error as Error).message });
      return [];
    }
  }

  // Subcomponent: extractCategories
  async extractCategories(chartData: any): Promise<any[]> {
    try {
      const categories: any[] = [];
      
      if (!chartData.getCategories) {
        return categories;
      }

      const chartCategories = chartData.getCategories();
      const categoryCount = chartCategories.size ? chartCategories.size() : 0;

      for (let i = 0; i < categoryCount; i++) {
        try {
          const category = chartCategories.get_Item(i);
          categories.push({
            index: i,
            value: category.getValue ? category.getValue() : `Category ${i}`
          });
        } catch (categoryError) {
          logger.warn(`Failed to extract category ${i}`, { error: (categoryError as Error).message });
        }
      }

      return categories;

    } catch (error) {
      logger.warn('Failed to extract chart categories', { error: (error as Error).message });
      return [];
    }
  }

  // Subcomponent: extractAxes
  async extractAxes(chartData: any): Promise<any> {
    try {
      const axes: any = {};
      
      if (chartData.getAxes) {
        const chartAxes = chartData.getAxes();
        
        // Primary axes
        if (chartAxes.getPrimaryHorizontalAxis) {
          const hAxis = chartAxes.getPrimaryHorizontalAxis();
          axes.horizontal = {
            title: hAxis.getTitle ? hAxis.getTitle().getText() : '',
            type: hAxis.getAxisType ? hAxis.getAxisType().toString() : 'Unknown'
          };
        }

        if (chartAxes.getPrimaryVerticalAxis) {
          const vAxis = chartAxes.getPrimaryVerticalAxis();
          axes.vertical = {
            title: vAxis.getTitle ? vAxis.getTitle().getText() : '',
            type: vAxis.getAxisType ? vAxis.getAxisType().toString() : 'Unknown'
          };
        }
      }

      return axes;

    } catch (error) {
      logger.warn('Failed to extract chart axes', { error: (error as Error).message });
      return {};
    }
  }

  private extractChartTitle(chartData: any): string {
    try {
      if (chartData.getChartTitle && chartData.getChartTitle().getTextFrame) {
        return chartData.getChartTitle().getTextFrame().getText() || '';
      }
      return '';
    } catch (error) {
      return '';
    }
  }

  private async extractLegend(chartData: any): Promise<any> {
    try {
      if (!chartData.getLegend) {
        return null;
      }

      const legend = chartData.getLegend();
      return {
        position: legend.getPosition ? legend.getPosition().toString() : 'Unknown',
        visible: legend.getOverlay ? !legend.getOverlay() : true
      };

    } catch (error) {
      return null;
    }
  }

  private async extractDataPoints(serie: any): Promise<any[]> {
    try {
      const dataPoints: any[] = [];
      
      if (!serie.getDataPoints) {
        return dataPoints;
      }

      const points = serie.getDataPoints();
      const pointCount = points.size ? points.size() : 0;

      for (let i = 0; i < Math.min(pointCount, 100); i++) { // Limit for performance
        try {
          const point = points.get_Item(i);
          dataPoints.push({
            index: i,
            value: point.getValue ? point.getValue().getData() : null,
            label: point.getLabel ? point.getLabel() : undefined
          });
        } catch (pointError) {
          logger.warn(`Failed to extract data point ${i}`, { error: (pointError as Error).message });
        }
      }

      return dataPoints;

    } catch (error) {
      return [];
    }
  }

  async dispose(): Promise<void> {
    logger.info('ChartExtension disposed');
  }
} 