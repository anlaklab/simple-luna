import { z } from "zod";
/**
 * Table Rows Extractor - Specialized Component for Table Row Processing
 * 
 * Handles extraction of table rows and coordinates with cell extraction.
 * Part of the componentized table extraction system.
 */

import { logger } from '../../../../../utils/logger';
import { TableRow } from '../../base/extraction-interfaces';
import { ConversionOptions } from '../../../types/interfaces';
import { TableCellsExtractor } from './table-cells-extractor';

export class TableRowsExtractor {
  private cellsExtractor: TableCellsExtractor;

  constructor() {
    this.cellsExtractor = new TableCellsExtractor();
  }

  /**
   * Extract all rows from a table
   */
  async extractRows(table: any, options: ConversionOptions): Promise<TableRow[]> {
    try {
      const rows: TableRow[] = [];
      
      if (!table.getRowsCount || table.getRowsCount() === 0) {
        return rows;
      }

      const rowCount = table.getRowsCount();
      const rowsCollection = table.getRows();

      for (let r = 0; r < rowCount; r++) {
        try {
          const row = rowsCollection.get_Item(r);
          const rowData: TableRow = {
            index: r,
            cells: await this.cellsExtractor.extractRowCells(row, r, options),
            height: this.getRowHeight(row)
          };

          rows.push(rowData);

        } catch (rowError) {
          this.handleError(rowError as Error, `extractRows[${r}]`);
          // Continue with empty row
          rows.push({
            index: r,
            cells: [],
            height: 20 // Default height
          });
        }
      }

      return rows;

    } catch (error) {
      this.handleError(error as Error, 'extractRows');
      return [];
    }
  }

  /**
   * Get row height safely
   */
  private getRowHeight(row: any): number {
    try {
      return row.getHeight ? row.getHeight() : 20;
    } catch (error) {
      return 20;
    }
  }

  /**
   * Error handling
   */
  private handleError(error: Error, context: string): void {
    logger.error(`TableRowsExtractor - ${context}`, {
      error: error.message,
      context
    });
  }
} 