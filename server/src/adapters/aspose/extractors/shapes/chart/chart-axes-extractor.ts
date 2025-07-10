/**
 * Chart Axes Extractor - Specialized Component for Chart Axes
 * 
 * Handles extraction of chart axes, including category, value, and series axes.
 * Part of the componentized chart extraction system.
 */

import { logger } from '../../../../../utils/logger';
import { ChartAxis } from '../../base/extraction-interfaces';

export class ChartAxesExtractor {
  
  /**
   * Extract all axes from chart data
   */
  extractAxes(chartData: any): ChartAxis[] {
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

  /**
   * Extract individual axis properties
   */
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

  /**
   * Get axis type with mapping
   */
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

  /**
   * Extract axis title
   */
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

  /**
   * Extract axis formatting
   */
  private extractAxisFormat(axis: any): any {
    try {
      const format = axis.getFormat();
      return {
        lineFormat: format.getLineFormat ? 
          this.extractLineFormat(format.getLineFormat()) : null,
        textFormat: format.getTextFormat ? 
          this.extractTextFormat(format.getTextFormat()) : null
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
   * Basic text format extraction
   */
  private extractTextFormat(textFormat: any): any {
    try {
      return {
        text: textFormat.getText ? textFormat.getText() : ''
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Error handling
   */
  private handleError(error: Error, context: string): void {
    logger.error(`ChartAxesExtractor - ${context}`, {
      error: error.message,
      context
    });
  }
} 