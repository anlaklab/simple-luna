import { z } from "zod";
/**
 * Chart Series Extractor - Specialized Component for Chart Series Data
 * 
 * Handles extraction of chart series, data points, and related formatting.
 * Part of the componentized chart extraction system.
 */

import { logger } from '../../../../../utils/logger';
import { ChartSeries, ChartDataPoint } from '../../base/extraction-interfaces';

export class ChartSeriesExtractor {
  
  /**
   * Extract all series from chart data
   */
  async extractSeries(chartData: any): Promise<ChartSeries[]> {
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

  /**
   * Extract data points from a series
   */
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

  /**
   * Get series name with fallback
   */
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

  /**
   * Extract data point value safely
   */
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

  /**
   * Extract series fill format
   */
  private extractSeriesFillFormat(serie: any): any {
    try {
      if (serie.getFormat && serie.getFormat().getFillFormat) {
        return this.extractFillFormat(serie.getFormat().getFillFormat());
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Extract series line format
   */
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

  /**
   * Extract data point formatting
   */
  private extractDataPointFormat(point: any): any {
    try {
      const format = point.getFormat();
      return {
        fillFormat: format.getFillFormat ? 
          this.extractFillFormat(format.getFillFormat()) : null,
        lineFormat: format.getLineFormat ? 
          this.extractLineFormat(format.getLineFormat()) : null
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Basic fill format extraction (simplified)
   */
  private extractFillFormat(fillFormat: any): any {
    try {
      return {
        fillType: fillFormat.getFillType ? fillFormat.getFillType() : 'NoFill'
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Basic line format extraction (simplified)
   */
  private extractLineFormat(lineFormat: any): any {
    try {
      return {
        style: lineFormat.getStyle ? lineFormat.getStyle() : 'Single',
        width: lineFormat.getWidth ? lineFormat.getWidth() : 1
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Error handling
   */
  private handleError(error: Error, context: string): void {
    logger.error(`ChartSeriesExtractor - ${context}`, {
      error: error.message,
      context
    });
  }
} 