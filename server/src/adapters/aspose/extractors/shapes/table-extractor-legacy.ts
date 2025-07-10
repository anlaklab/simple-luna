/**
 * Table Extractor - Specialized Shape Extractor for Table Objects
 * 
 * Handles comprehensive extraction of table data including:
 * - Row and column structure
 * - Cell content and formatting
 * - Table styling and properties
 * - Merged cells and spans
 */

import { BaseShapeExtractor, ExtractorMetadata, ExtractionResult, ExtractionContext } from '../base/base-shape-extractor';
import { ConversionOptions } from '../../types/interfaces';
import { TableExtractionResult, TableRow, TableColumn, TableCell } from '../base/extraction-interfaces';

export class TableExtractor extends BaseShapeExtractor {
  protected metadata: ExtractorMetadata = {
    name: 'TableExtractor',
    version: '1.0.0',
    supportedShapeTypes: ['Table', 'TableShape'],
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
      if (!this.canHandle(shape)) {
        return this.createErrorResult('Shape is not a valid table', Date.now() - startTime);
      }

      // Extract basic shape properties
      const baseProperties = this.extractBasicProperties(shape);
      
      // Extract table-specific data
      const tableData = await this.extractTableData(shape, options);

      const result = {
        ...baseProperties,
        shapeType: 'Table',
        tableProperties: tableData
      };

      this.logSuccess('table extraction', result, Date.now() - startTime);
      return this.createSuccessResult(result, Date.now() - startTime);

    } catch (error) {
      this.handleError(error as Error, 'extract');
      return this.createErrorResult((error as Error).message, Date.now() - startTime);
    }
  }

  canHandle(shape: any): boolean {
    try {
      const AsposeSlides = require('../../../../../lib/aspose.slides.js');
      const ShapeType = AsposeSlides.ShapeType;
      const shapeType = shape.getShapeType();
      return shapeType === ShapeType.Table;
    } catch (error) {
      this.handleError(error as Error, 'canHandle');
      return false;
    }
  }

  // =============================================================================
  // TABLE DATA EXTRACTION (Refactored from original)
  // =============================================================================

  private async extractTableData(shape: any, options: ConversionOptions): Promise<TableExtractionResult> {
    try {
      const table = shape.getTable();
      if (!table) {
        throw new Error('Table data not available');
      }

      const result: TableExtractionResult = {
        columns: this.extractColumns(table),
        rows: await this.extractRows(table, options),
        firstRow: this.hasFirstRowSpecialFormat(table),
        firstCol: this.hasFirstColSpecialFormat(table),
        lastRow: this.hasLastRowSpecialFormat(table),
        lastCol: this.hasLastColSpecialFormat(table)
      };

      // Extract table style if available and requested
      if (options.includeMetadata) {
        result.tableStyle = this.extractTableStyle(table);
      }

      return result;

    } catch (error) {
      this.handleError(error as Error, 'extractTableData');
      return {
        columns: [],
        rows: [],
        firstRow: false,
        firstCol: false,
        lastRow: false,
        lastCol: false
      };
    }
  }

  // =============================================================================
  // COLUMNS EXTRACTION
  // =============================================================================

  private extractColumns(table: any): TableColumn[] {
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

  private getColumnWidth(column: any): number {
    try {
      return column.getWidth ? column.getWidth() : 100;
    } catch (error) {
      return 100;
    }
  }

  // =============================================================================
  // ROWS EXTRACTION
  // =============================================================================

  private async extractRows(table: any, options: ConversionOptions): Promise<TableRow[]> {
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
            cells: await this.extractRowCells(row, table, r, options),
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

  private getRowHeight(row: any): number {
    try {
      return row.getHeight ? row.getHeight() : 20;
    } catch (error) {
      return 20;
    }
  }

  // =============================================================================
  // CELLS EXTRACTION
  // =============================================================================

  private async extractRowCells(row: any, table: any, rowIndex: number, options: ConversionOptions): Promise<TableCell[]> {
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

      // Extract text frame if available and requested
      if (options.includeAssets && cell.getTextFrame) {
        cellData.textFrame = this.textExtractor.extractTextFrame(cell.getTextFrame());
      }

      // Extract cell fill format
      if (options.includeAssets) {
        cellData.fillFormat = this.extractCellFillFormat(cell);
      }

      return cellData;

    } catch (error) {
      this.handleError(error as Error, `extractSingleCell[${rowIndex}][${colIndex}]`);
      return this.createEmptyCell(rowIndex, colIndex);
    }
  }

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
      borders: {
        top: null,
        bottom: null,
        left: null,
        right: null
      }
    };
  }

  // =============================================================================
  // CELL PROPERTY EXTRACTION
  // =============================================================================

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

  private getCellColSpan(cell: any): number {
    try {
      return cell.getColSpan ? cell.getColSpan() : 1;
    } catch (error) {
      return 1;
    }
  }

  private getCellRowSpan(cell: any): number {
    try {
      return cell.getRowSpan ? cell.getRowSpan() : 1;
    } catch (error) {
      return 1;
    }
  }

  private getCellMargin(cell: any, side: 'top' | 'bottom' | 'left' | 'right'): number {
    try {
      const cellFormat = cell.getCellFormat();
      if (!cellFormat) return 0;

      switch (side) {
        case 'top': return cellFormat.getMarginTop ? cellFormat.getMarginTop() : 0;
        case 'bottom': return cellFormat.getMarginBottom ? cellFormat.getMarginBottom() : 0;
        case 'left': return cellFormat.getMarginLeft ? cellFormat.getMarginLeft() : 0;
        case 'right': return cellFormat.getMarginRight ? cellFormat.getMarginRight() : 0;
        default: return 0;
      }
    } catch (error) {
      return 0;
    }
  }

  private getCellTextAnchor(cell: any): string {
    try {
      const cellFormat = cell.getCellFormat();
      if (cellFormat && cellFormat.getTextAnchorType) {
        const anchorType = cellFormat.getTextAnchorType();
        const anchorMap: Record<number, string> = {
          0: 'top',
          1: 'center',
          2: 'bottom',
          3: 'justified',
          4: 'distributed'
        };
        return anchorMap[anchorType] || 'top';
      }
      return 'top';
    } catch (error) {
      return 'top';
    }
  }

  private getCellVerticalAlignment(cell: any): string {
    try {
      const cellFormat = cell.getCellFormat();
      if (cellFormat && cellFormat.getTextVerticalType) {
        const verticalType = cellFormat.getTextVerticalType();
        const verticalMap: Record<number, string> = {
          0: 'horizontal',
          1: 'vertical',
          2: 'vertical270',
          3: 'wordart'
        };
        return verticalMap[verticalType] || 'horizontal';
      }
      return 'horizontal';
    } catch (error) {
      return 'horizontal';
    }
  }

  // =============================================================================
  // CELL FORMATTING EXTRACTION
  // =============================================================================

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

  private extractCellFillFormat(cell: any): any {
    try {
      const cellFormat = cell.getCellFormat();
      if (cellFormat && cellFormat.getFillFormat) {
        return this.fillExtractor.extractFillFormat(cellFormat.getFillFormat());
      }
      return null;
    } catch (error) {
      this.handleError(error as Error, 'extractCellFillFormat');
      return null;
    }
  }

  // =============================================================================
  // TABLE STYLE EXTRACTION
  // =============================================================================

  private hasFirstRowSpecialFormat(table: any): boolean {
    try {
      return table.getFirstRow ? table.getFirstRow() : false;
    } catch (error) {
      return false;
    }
  }

  private hasFirstColSpecialFormat(table: any): boolean {
    try {
      return table.getFirstCol ? table.getFirstCol() : false;
    } catch (error) {
      return false;
    }
  }

  private hasLastRowSpecialFormat(table: any): boolean {
    try {
      return table.getLastRow ? table.getLastRow() : false;
    } catch (error) {
      return false;
    }
  }

  private hasLastColSpecialFormat(table: any): boolean {
    try {
      return table.getLastCol ? table.getLastCol() : false;
    } catch (error) {
      return false;
    }
  }

  private extractTableStyle(table: any): any {
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
} 