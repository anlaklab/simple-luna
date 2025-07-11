/**
 * Table Cells Extractor - Specialized Component for Table Cell Processing
 * 
 * Handles extraction of individual table cells with formatting and content.
 * Part of the componentized table extraction system.
 */

import { logger } from '../../../../../utils/logger';
import { TableCell } from '../../base/extraction-interfaces';
import { ConversionOptions } from '../../../types/interfaces';

export class TableCellsExtractor {
  
  /**
   * Extract all cells from a table row
   */
  async extractRowCells(row: any, rowIndex: number, options: ConversionOptions): Promise<TableCell[]> {
    try {
      const cells: TableCell[] = [];
      
      if (!row.size || row.size() === 0) {
        return cells;
      }

      const cellCount = row.size();

      for (let c = 0; c < cellCount; c++) {
        try {
          const cell = row.get_Item(c);
          const cellData = await this.extractSingleCell(cell, rowIndex, c, options);
          cells.push(cellData);

        } catch (cellError) {
          this.handleError(cellError as Error, `extractRowCells[${rowIndex}][${c}]`);
          // Continue with empty cell
          cells.push(this.createEmptyCell(rowIndex, c));
        }
      }

      return cells;

    } catch (error) {
      this.handleError(error as Error, 'extractRowCells');
      return [];
    }
  }

  /**
   * Extract individual cell data
   */
  private async extractSingleCell(cell: any, rowIndex: number, colIndex: number, options: ConversionOptions): Promise<TableCell> {
    try {
      const cellData: TableCell = {
        text: this.getCellText(cell),
        colspan: this.getCellColSpan(cell),
        rowspan: this.getCellRowSpan(cell),
        marginTop: this.getCellMargin(cell, 'top'),
        marginBottom: this.getCellMargin(cell, 'bottom'),
        marginLeft: this.getCellMargin(cell, 'left'),
        marginRight: this.getCellMargin(cell, 'right'),
        textAnchor: this.getCellTextAnchor(cell),
        verticalAlignment: this.getCellVerticalAlignment(cell),
        borders: this.extractCellBorders(cell)
      };

      // Extract optional content based on options
      if (options.includeAssets && cell.getTextFrame) {
        cellData.textFrame = this.extractTextFrame(cell.getTextFrame());
      }

      if (options.includeAssets) {
        cellData.fillFormat = this.extractCellFillFormat(cell);
      }

      return cellData;

    } catch (error) {
      this.handleError(error as Error, `extractSingleCell[${rowIndex}][${colIndex}]`);
      return this.createEmptyCell(rowIndex, colIndex);
    }
  }

  /**
   * Extract cell text content
   */
  private getCellText(cell: any): string {
    try {
      if (cell.getTextFrame) {
        const textFrame = cell.getTextFrame();
        return textFrame.getText ? textFrame.getText() : '';
      }
      return '';
    } catch (error) {
      return '';
    }
  }

  /**
   * Get cell column span
   */
  private getCellColSpan(cell: any): number {
    try {
      return cell.getColSpan ? cell.getColSpan() : 1;
    } catch (error) {
      return 1;
    }
  }

  /**
   * Get cell row span
   */
  private getCellRowSpan(cell: any): number {
    try {
      return cell.getRowSpan ? cell.getRowSpan() : 1;
    } catch (error) {
      return 1;
    }
  }

  /**
   * Extract cell margin for specific side
   */
  private getCellMargin(cell: any, side: 'top' | 'bottom' | 'left' | 'right'): number {
    try {
      const cellFormat = cell.getCellFormat();
      if (!cellFormat) return 0;

      const marginMethods = {
        top: () => cellFormat.getMarginTop ? cellFormat.getMarginTop() : 0,
        bottom: () => cellFormat.getMarginBottom ? cellFormat.getMarginBottom() : 0,
        left: () => cellFormat.getMarginLeft ? cellFormat.getMarginLeft() : 0,
        right: () => cellFormat.getMarginRight ? cellFormat.getMarginRight() : 0
      };

      return marginMethods[side]();
    } catch (error) {
      return 0;
    }
  }

  /**
   * Extract cell text anchor
   */
  private getCellTextAnchor(cell: any): string {
    try {
      const cellFormat = cell.getCellFormat();
      if (cellFormat && cellFormat.getTextAnchorType) {
        const anchorType = cellFormat.getTextAnchorType();
        const anchorMap: Record<number, string> = {
          0: 'top', 1: 'center', 2: 'bottom', 3: 'justified', 4: 'distributed'
        };
        return anchorMap[anchorType] || 'top';
      }
      return 'top';
    } catch (error) {
      return 'top';
    }
  }

  /**
   * Extract cell vertical alignment
   */
  private getCellVerticalAlignment(cell: any): string {
    try {
      const cellFormat = cell.getCellFormat();
      if (cellFormat && cellFormat.getTextVerticalType) {
        const verticalType = cellFormat.getTextVerticalType();
        const verticalMap: Record<number, string> = {
          0: 'horizontal', 1: 'vertical', 2: 'vertical270', 3: 'wordart'
        };
        return verticalMap[verticalType] || 'horizontal';
      }
      return 'horizontal';
    } catch (error) {
      return 'horizontal';
    }
  }

  /**
   * Extract cell borders
   */
  private extractCellBorders(cell: any): TableCell['borders'] {
    try {
      const cellFormat = cell.getCellFormat();
      if (!cellFormat) {
        return { top: null, bottom: null, left: null, right: null };
      }

      return {
        top: cellFormat.getBorderTop ? this.extractLineFormat(cellFormat.getBorderTop()) : null,
        bottom: cellFormat.getBorderBottom ? this.extractLineFormat(cellFormat.getBorderBottom()) : null,
        left: cellFormat.getBorderLeft ? this.extractLineFormat(cellFormat.getBorderLeft()) : null,
        right: cellFormat.getBorderRight ? this.extractLineFormat(cellFormat.getBorderRight()) : null
      };
    } catch (error) {
      this.handleError(error as Error, 'extractCellBorders');
      return { top: null, bottom: null, left: null, right: null };
    }
  }

  /**
   * Extract cell fill format
   */
  private extractCellFillFormat(cell: any): any {
    try {
      const cellFormat = cell.getCellFormat();
      if (cellFormat && cellFormat.getFillFormat) {
        return this.extractFillFormat(cellFormat.getFillFormat());
      }
      return null;
    } catch (error) {
      this.handleError(error as Error, 'extractCellFillFormat');
      return null;
    }
  }

  /**
   * Extract text frame (simplified)
   */
  private extractTextFrame(textFrame: any): any {
    try {
      return {
        text: textFrame.getText ? textFrame.getText() : ''
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Extract line format (simplified)
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
   * Extract fill format (simplified)
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
   * Create empty cell fallback
   */
  private createEmptyCell(rowIndex: number, colIndex: number): TableCell {
    return {
      text: '',
      colspan: 1,
      rowspan: 1,
      marginTop: 0,
      marginBottom: 0,
      marginLeft: 0,
      marginRight: 0,
      textAnchor: 'top',
      verticalAlignment: 'top',
      borders: { top: null, bottom: null, left: null, right: null }
    };
  }

  /**
   * Error handling
   */
  private handleError(error: Error, context: string): void {
    logger.error(`TableCellsExtractor - ${context}`, {
      error: error.message,
      context
    });
  }
} 