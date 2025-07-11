/**
 * TableExtension - Dynamic Extension for Table Processing
 * 
 * Dynamically loaded extension for table shape processing.
 * Follows the standard extension interface for compatibility.
 */

import { logger } from '../../../utils/logger';
import { ExtensionInterface } from './chart-extension';

export default class TableExtension implements ExtensionInterface {
  readonly name = 'table';
  readonly version = '1.0.0';
  readonly supportedTypes = ['Table', 'TableObject'];

  private aspose: any;

  constructor(dependencies: { aspose?: any } = {}) {
    this.aspose = dependencies.aspose;
    logger.info('TableExtension instance created');
  }

  async initialize(): Promise<void> {
    logger.info('TableExtension initialized');
  }

  async extract(shape: any, options: any = {}): Promise<any> {
    try {
      logger.info('TableExtension processing table shape');

      if (!shape.getTable) {
        return null;
      }

      const table = shape.getTable();
      
      const tableInfo = {
        type: 'table',
        dimensions: {
          rows: table.getRows ? table.getRows().size() : 0,
          columns: table.getColumns ? table.getColumns().size() : 0
        },
        data: await this.extractTableData(table),
        style: await this.extractTableStyle(table),
        headers: await this.extractHeaders(table),
        metadata: {
          extractedBy: 'TableExtension',
          version: this.version,
          extractedAt: new Date().toISOString()
        }
      };

      logger.info('Table extraction completed', { 
        rows: tableInfo.dimensions.rows,
        columns: tableInfo.dimensions.columns
      });

      return tableInfo;

    } catch (error) {
      logger.error('Table extraction failed', { error: (error as Error).message });
      return null;
    }
  }

  // Subcomponent: extractTableData (hook interno)
  async extractTableData(table: any): Promise<any[][]> {
    try {
      const data: any[][] = [];
      
      if (!table.getRows || !table.getColumns) {
        return data;
      }

      const rows = table.getRows();
      const rowCount = rows.size();

      for (let i = 0; i < rowCount; i++) {
        try {
          const row = rows.get_Item(i);
          const rowData: any[] = [];
          
          if (row.getCells) {
            const cells = row.getCells();
            const cellCount = cells.size();
            
            for (let j = 0; j < cellCount; j++) {
              try {
                const cell = cells.get_Item(j);
                const cellData = await this.extractCellData(cell);
                rowData.push(cellData);
              } catch (cellError) {
                logger.warn(`Failed to extract cell [${i}][${j}]`, { error: (cellError as Error).message });
                rowData.push(null);
              }
            }
          }
          
          data.push(rowData);
        } catch (rowError) {
          logger.warn(`Failed to extract row ${i}`, { error: (rowError as Error).message });
        }
      }

      return data;

    } catch (error) {
      logger.warn('Failed to extract table data', { error: (error as Error).message });
      return [];
    }
  }

  // Subcomponent: extractTableStyle
  async extractTableStyle(table: any): Promise<any> {
    try {
      const style: any = {};
      
      if (table.getStylePreset) {
        style.preset = table.getStylePreset().toString();
      }

      if (table.getFirstRow) {
        style.firstRowFormatted = table.getFirstRow();
      }

      if (table.getFirstCol) {
        style.firstColumnFormatted = table.getFirstCol();
      }

      if (table.getLastRow) {
        style.lastRowFormatted = table.getLastRow();
      }

      if (table.getLastCol) {
        style.lastColumnFormatted = table.getLastCol();
      }

      return style;

    } catch (error) {
      logger.warn('Failed to extract table style', { error: (error as Error).message });
      return {};
    }
  }

  // Subcomponent: extractHeaders
  async extractHeaders(table: any): Promise<{ row?: string[]; column?: string[] }> {
    try {
      const headers: { row?: string[]; column?: string[] } = {};

      // Extract first row as headers if formatted
      if (table.getFirstRow && table.getFirstRow()) {
        const rows = table.getRows();
        if (rows.size() > 0) {
          const firstRow = rows.get_Item(0);
          if (firstRow.getCells) {
            const headerCells: string[] = [];
            const cells = firstRow.getCells();
            const cellCount = cells.size();
            
            for (let i = 0; i < cellCount; i++) {
              try {
                const cell = cells.get_Item(i);
                const cellText = await this.extractCellText(cell);
                headerCells.push(cellText);
              } catch (cellError) {
                headerCells.push('');
              }
            }
            headers.row = headerCells;
          }
        }
      }

      // Extract first column as headers if formatted
      if (table.getFirstCol && table.getFirstCol()) {
        const rows = table.getRows();
        const rowCount = rows.size();
        const headerCells: string[] = [];
        
        for (let i = 0; i < rowCount; i++) {
          try {
            const row = rows.get_Item(i);
            if (row.getCells && row.getCells().size() > 0) {
              const firstCell = row.getCells().get_Item(0);
              const cellText = await this.extractCellText(firstCell);
              headerCells.push(cellText);
            }
          } catch (rowError) {
            headerCells.push('');
          }
        }
        headers.column = headerCells;
      }

      return headers;

    } catch (error) {
      logger.warn('Failed to extract table headers', { error: (error as Error).message });
      return {};
    }
  }

  private async extractCellData(cell: any): Promise<any> {
    try {
      const cellData: any = {
        text: await this.extractCellText(cell),
        colspan: cell.getColSpan ? cell.getColSpan() : 1,
        rowspan: cell.getRowSpan ? cell.getRowSpan() : 1
      };

      // Extract cell formatting if available
      if (cell.getFillFormat) {
        cellData.fillFormat = this.extractCellFill(cell.getFillFormat());
      }

      return cellData;

    } catch (error) {
      return { text: '', colspan: 1, rowspan: 1 };
    }
  }

  private async extractCellText(cell: any): Promise<string> {
    try {
      if (cell.getTextFrame && cell.getTextFrame().getText) {
        return cell.getTextFrame().getText() || '';
      }
      return '';
    } catch (error) {
      return '';
    }
  }

  private extractCellFill(fillFormat: any): any {
    try {
      if (!fillFormat) return null;

      return {
        fillType: fillFormat.getFillType ? fillFormat.getFillType().toString() : 'Unknown',
        // Add more fill format extraction as needed
      };
    } catch (error) {
      return null;
    }
  }

  async dispose(): Promise<void> {
    logger.info('TableExtension disposed');
  }
} 