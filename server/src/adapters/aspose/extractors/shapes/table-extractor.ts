import { z } from "zod";
/**
 * Table Extractor - Delegates to specialized sub-extractors
 */
import { BaseShapeExtractor, ExtractorMetadata, ExtractionResult, ExtractionContext } from '../base/base-shape-extractor';
import { ConversionOptions } from '../../types/interfaces';
import { TableExtractionResult } from '../base/extraction-interfaces';
import { TableRowsExtractor } from './table/table-rows-extractor';
import { TableStyleExtractor } from './table/table-style-extractor';

// ✅ ROBUST IMPORT: Use AsposeDriverFactory for unified access
const asposeDriver = require('/app/lib/AsposeDriverFactory');

export class TableExtractor extends BaseShapeExtractor {
  protected metadata: ExtractorMetadata = {
    name: 'TableExtractor', version: '2.0.0',
    supportedShapeTypes: ['Table', 'TableShape'], extractorType: 'complex'
  };

  private rowsExtractor = new TableRowsExtractor();
  private styleExtractor = new TableStyleExtractor();
  private isInitialized = false;

  constructor() { super(); }

  async extract(shape: any, options: ConversionOptions, context?: ExtractionContext): Promise<ExtractionResult> {
    const startTime = Date.now();
    try {
      // ✅ Ensure driver is initialized before use
      await this.initializeDriver();
      
      if (!this.canHandle(shape)) {
        return this.createErrorResult('Shape is not a valid table', Date.now() - startTime);
      }

      const baseProperties = this.extractBasicProperties(shape);
      const tableData = await this.extractTableData(shape, options);

      const result = { ...baseProperties, shapeType: 'Table', tableProperties: tableData };
      this.logSuccess('table extraction', result, Date.now() - startTime);
      return this.createSuccessResult(result, Date.now() - startTime);

    } catch (error) {
      this.handleError(error as Error, 'extract');
      return this.createErrorResult((error as Error).message, Date.now() - startTime);
    }
  }

  canHandle(shape: any): boolean {
    try {
      // ✅ REFACTORED: Use AsposeDriverFactory (assuming it's already initialized)
      if (!this.isInitialized) {
        console.warn('AsposeDriver not initialized in TableExtractor, attempting sync check');
        return false;
      }
      return shape && shape.getShapeType() === asposeDriver.aspose?.ShapeType?.Table;
    } catch (error) {
      this.handleError(error as Error, 'canHandle');
      return false;
    }
  }

  private async initializeDriver(): Promise<void> {
    if (!this.isInitialized) {
      await asposeDriver.initialize();
      this.isInitialized = true;
    }
  }

  private async extractTableData(shape: any, options: ConversionOptions): Promise<TableExtractionResult> {
    try {
      const table = shape.getTable();
      if (!table) throw new Error('Table data not available');

      const result: TableExtractionResult = {
        columns: this.styleExtractor.extractColumns(table),
        rows: await this.rowsExtractor.extractRows(table, options),
        firstRow: this.styleExtractor.hasFirstRowSpecialFormat(table),
        firstCol: this.styleExtractor.hasFirstColSpecialFormat(table),
        lastRow: this.styleExtractor.hasLastRowSpecialFormat(table),
        lastCol: this.styleExtractor.hasLastColSpecialFormat(table)
      };

      if (options.includeMetadata) {
        result.tableStyle = this.styleExtractor.extractTableStyle(table);
      }

      return result;
    } catch (error) {
      this.handleError(error as Error, 'extractTableData');
      return {
        columns: [], rows: [], firstRow: false, firstCol: false,
        lastRow: false, lastCol: false
      };
    }
  }
} 