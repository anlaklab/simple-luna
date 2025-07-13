import { z } from "zod";
/**
 * Chart Metadata Extractor - Specialized Component for Chart Metadata
 * 
 * Handles extraction of chart metadata including type, title, legend, and data table.
 * Part of the componentized chart extraction system.
 */

import { logger } from '../../../../../utils/logger';
import { ChartCategory } from '../../base/extraction-interfaces';

export class ChartMetadataExtractor {
  
  /**
   * Extract chart type with mapping
   */
  getChartType(chartData: any): string {
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

  /**
   * Check if chart has data table
   */
  hasDataTable(chartData: any): boolean {
    try {
      return chartData.getDataTable ? chartData.getDataTable().hasTable() : false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if chart has legend
   */
  hasLegend(chartData: any): boolean {
    try {
      return chartData.getLegend ? chartData.getLegend().hasLegend() : false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Extract chart title
   */
  getChartTitle(chartData: any): string | undefined {
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

  /**
   * Extract chart categories
   */
  async extractCategories(chartData: any): Promise<ChartCategory[]> {
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

  /**
   * Extract plot area information
   */
  extractPlotArea(chartData: any): any {
    try {
      const plotArea = chartData.getPlotArea();
      if (!plotArea) return null;

      return {
        x: plotArea.getX ? plotArea.getX() : 0,
        y: plotArea.getY ? plotArea.getY() : 0,
        width: plotArea.getWidth ? plotArea.getWidth() : 0,
        height: plotArea.getHeight ? plotArea.getHeight() : 0,
        fillFormat: plotArea.getFillFormat ? 
          this.extractFillFormat(plotArea.getFillFormat()) : null,
        lineFormat: plotArea.getLineFormat ? 
          this.extractLineFormat(plotArea.getLineFormat()) : null
      };
    } catch (error) {
      this.handleError(error as Error, 'extractPlotArea');
      return null;
    }
  }

  /**
   * Get category value safely
   */
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

  /**
   * Extract category formatting
   */
  private extractCategoryFormat(category: any): any {
    try {
      const format = category.getFormat();
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
   * Basic fill format extraction
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
   * Basic line format extraction
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
    logger.error(`ChartMetadataExtractor - ${context}`, {
      error: error.message,
      context
    });
  }
} 