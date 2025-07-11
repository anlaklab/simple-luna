/**
 * Table Style Extractor - Specialized Component for Table Styling
 * 
 * Handles extraction of table columns, styling properties, and metadata.
 * Part of the componentized table extraction system.
 */

import { logger } from '../../../../../utils/logger';
import { TableColumn } from '../../base/extraction-interfaces';

export class TableStyleExtractor {
  
  /**
   * Extract table columns information
   */
  extractColumns(table: any): TableColumn[] {
    try {
      const columns: TableColumn[] = [];
      
      if (!table.getColumnsCount || table.getColumnsCount() === 0) {
        return columns;
      }

      const columnCount = table.getColumnsCount();
      const columnsCollection = table.getColumns();

      for (let c = 0; c < columnCount; c++) {
        try {
          const column = columnsCollection.get_Item(c);
          const columnData: TableColumn = {
            index: c,
            width: this.getColumnWidth(column)
          };

          columns.push(columnData);

        } catch (columnError) {
          this.handleError(columnError as Error, `extractColumns[${c}]`);
          // Continue with default column
          columns.push({
            index: c,
            width: 100 // Default width
          });
        }
      }

      return columns;

    } catch (error) {
      this.handleError(error as Error, 'extractColumns');
      return [];
    }
  }

  /**
   * Check if table has special first row formatting
   */
  hasFirstRowSpecialFormat(table: any): boolean {
    try {
      return table.getFirstRow ? table.getFirstRow() : false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if table has special first column formatting
   */
  hasFirstColSpecialFormat(table: any): boolean {
    try {
      return table.getFirstCol ? table.getFirstCol() : false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if table has special last row formatting
   */
  hasLastRowSpecialFormat(table: any): boolean {
    try {
      return table.getLastRow ? table.getLastRow() : false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if table has special last column formatting
   */
  hasLastColSpecialFormat(table: any): boolean {
    try {
      return table.getLastCol ? table.getLastCol() : false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Extract comprehensive table style information
   */
  extractTableStyle(table: any): any {
    try {
      const tableStyle: any = {
        styleId: null,
        bandRows: false,
        bandCols: false
      };

      // Extract table style properties
      if (table.getTableStyleId) {
        tableStyle.styleId = table.getTableStyleId();
      }

      // Band rows/columns (alternating formatting)
      if (table.getBandRows) {
        tableStyle.bandRows = table.getBandRows();
      }

      if (table.getBandCols) {
        tableStyle.bandCols = table.getBandCols();
      }

      return tableStyle;
    } catch (error) {
      this.handleError(error as Error, 'extractTableStyle');
      return null;
    }
  }

  /**
   * Get column width safely
   */
  private getColumnWidth(column: any): number {
    try {
      return column.getWidth ? column.getWidth() : 100;
    } catch (error) {
      return 100;
    }
  }

  /**
   * Error handling
   */
  private handleError(error: Error, context: string): void {
    logger.error(`TableStyleExtractor - ${context}`, {
      error: error.message,
      context
    });
  }
} 