/**
 * Shape Extractor - Handles shape property extraction for Aspose.Slides
 */

import { logger } from '../../utils/logger';
import { ConversionOptions } from './types/interfaces';
import { FillExtractor } from './fill-extractor';
import { EffectExtractor } from './effect-extractor';
import { TextExtractor } from './text-extractor';
import { GeometryExtractor } from './geometry-extractor';

export class ShapeExtractor {
  private fillExtractor: FillExtractor;
  private effectExtractor: EffectExtractor;
  private textExtractor: TextExtractor;
  private geometryExtractor: GeometryExtractor;

  constructor() {
    this.fillExtractor = new FillExtractor();
    this.effectExtractor = new EffectExtractor();
    this.textExtractor = new TextExtractor();
    this.geometryExtractor = new GeometryExtractor();
  }

  /**
   * Process individual shape to Universal Schema format
   */
  async processShape(shape: any, options: ConversionOptions): Promise<any | null> {
    try {
      const AsposeSlides = require('../../../../lib/aspose.slides.js');
      const ShapeType = AsposeSlides.ShapeType;
      const shapeType = shape.getShapeType();
      
      // Extract comprehensive geometry information
      const baseShape: any = {
        shapeType: this.mapShapeType(shapeType),
        name: shape.getName() || '',
        alternativeText: shape.getAlternativeText ? shape.getAlternativeText() : undefined,
        hidden: shape.getHidden(),
        locked: shape.isLocked ? shape.isLocked() : false,
        geometry: this.geometryExtractor.extractGeometry(shape),
      };

      // Extract fill format properties
      const fillFormat = this.fillExtractor.extractFillFormat(shape.getFillFormat());
      if (fillFormat) {
        baseShape.fillFormat = fillFormat;
      }

      // Extract line format properties
      const lineFormat = this.extractLineFormat(shape.getLineFormat());
      if (lineFormat) {
        baseShape.lineFormat = lineFormat;
      }

      // Extract effect format (shadow, glow, etc.)
      const effectFormat = this.effectExtractor.extractEffectFormat(shape.getEffectFormat());
      if (effectFormat) {
        baseShape.effectFormat = effectFormat;
      }

      // Extract 3D format if available
      const threeDFormat = this.effectExtractor.extractThreeDFormat(shape.getThreeDFormat());
      if (threeDFormat) {
        baseShape.threeDFormat = threeDFormat;
      }

      // Process text frame if available
      if (shape.getTextFrame && shape.getTextFrame()) {
        const textFrame = this.textExtractor.extractTextFrame(shape.getTextFrame());
        if (textFrame) {
          baseShape.textFrame = textFrame;
        }
      }

      // Extract hyperlink if available
      if (shape.getHyperlinkClick && shape.getHyperlinkClick()) {
        const hyperlink = this.extractHyperlink(shape.getHyperlinkClick());
        if (hyperlink) {
          baseShape.hyperlink = hyperlink;
        }
      }

      // Process type-specific properties
      this.extractTypeSpecificProperties(baseShape, shape, shapeType, options);

      return baseShape;
    } catch (error) {
      logger.error('Error processing shape', { error });
      return null;
    }
  }

  /**
   * Extract line format properties
   */
  private extractLineFormat(lineFormat: any): any | null {
    try {
      if (!lineFormat || !lineFormat.isVisible()) return null;

      const result: any = {
        width: lineFormat.getWidth ? lineFormat.getWidth() : 0,
        style: lineFormat.getStyle ? lineFormat.getStyle() : undefined,
        dashStyle: lineFormat.getDashStyle ? lineFormat.getDashStyle() : undefined,
        capStyle: lineFormat.getCapStyle ? lineFormat.getCapStyle() : undefined,
        joinStyle: lineFormat.getJoinStyle ? lineFormat.getJoinStyle() : undefined,
      };

      // Extract line fill format
      if (lineFormat.getFillFormat) {
        const fillFormat = this.fillExtractor.extractFillFormat(lineFormat.getFillFormat());
        if (fillFormat) {
          result.fillFormat = fillFormat;
        }
      }

      return result;
    } catch (error) {
      logger.error('Error extracting line format', { error });
      return null;
    }
  }

  /**
   * Extract hyperlink information
   */
  private extractHyperlink(hyperlink: any): any | null {
    try {
      if (!hyperlink) return null;

      const result: any = {
        actionType: hyperlink.getActionType ? hyperlink.getActionType() : undefined,
      };

      if (hyperlink.getExternalUrl) {
        result.externalUrl = hyperlink.getExternalUrl();
      }

      if (hyperlink.getTargetSlide) {
        result.targetSlide = hyperlink.getTargetSlide().getSlideNumber();
      }

      if (hyperlink.getTooltip) {
        result.tooltip = hyperlink.getTooltip();
      }

      return result;
    } catch (error) {
      logger.error('Error extracting hyperlink', { error });
      return null;
    }
  }

  /**
   * Extract type-specific properties based on shape type
   */
  private async extractTypeSpecificProperties(
    baseShape: any,
    shape: any,
    shapeType: any,
    options: ConversionOptions
  ): Promise<void> {
    const AsposeSlides = require('../../../../lib/aspose.slides.js');
    const ShapeType = AsposeSlides.ShapeType;

    switch (shapeType) {
      case ShapeType.Picture:
        if (shape.getPictureFormat && shape.getPictureFormat().getPicture()) {
          baseShape.pictureProperties = this.extractPictureProperties(shape.getPictureFormat(), options);
        }
        break;
      
      case ShapeType.Chart:
        if (shape.getChartData) {
          baseShape.chartProperties = this.extractChartData(shape);
        }
        break;
      
      case ShapeType.Table:
        if (shape.getTable) {
          baseShape.tableProperties = this.extractTableData(shape.getTable());
        }
        break;
      
      case ShapeType.GroupShape:
        if (shape.getShapes) {
          const groupShapes = [];
          const shapes = shape.getShapes();
          for (let i = 0; i < shapes.size(); i++) {
            const childShape = await this.processShape(shapes.get_Item(i), options);
            if (childShape) {
              groupShapes.push(childShape);
            }
          }
          baseShape.groupProperties = { shapes: groupShapes };
        }
        break;
      
      case ShapeType.VideoFrame:
        if (shape.getVideoData) {
          baseShape.videoProperties = this.extractVideoProperties(shape);
        }
        break;
      
      case ShapeType.AudioFrame:
        if (shape.getAudioData) {
          baseShape.audioProperties = this.extractAudioProperties(shape);
        }
        break;
      
      case ShapeType.SmartArt:
        if (shape.getSmartArtData) {
          baseShape.smartArtProperties = this.extractSmartArtProperties(shape);
        }
        break;
      
      case ShapeType.OleObjectFrame:
        if (shape.getObjectData) {
          baseShape.oleObjectProperties = this.extractOleObjectProperties(shape);
        }
        break;
      
      case ShapeType.Connector:
        baseShape.connectorProperties = this.extractConnectorProperties(shape);
        break;
    }
  }

  /**
   * Map Aspose shape types to Universal Schema types
   */
  private mapShapeType(asposeShapeType: any): string {
    const typeMap: Record<string, string> = {
      'Rectangle': 'Rectangle',
      'RoundCornerRectangle': 'RoundedRectangle', 
      'Ellipse': 'Ellipse',
      'Triangle': 'Triangle',
      'Line': 'Line',
      'TextBox': 'TextBox',
      'Picture': 'Picture',
      'Chart': 'Chart',
      'Table': 'Table',
      'SmartArt': 'SmartArt',
      'OleObject': 'OleObject',
    };

    return typeMap[asposeShapeType?.toString()] || 'Unknown';
  }

  /**
   * Extract picture properties
   */
  private extractPictureProperties(pictureFormat: any, options: ConversionOptions): any {
    try {
      const picture = pictureFormat.getPicture();
      if (!picture) return null;

      return {
        imageData: options.extractImages ? this.extractImageData(picture) : undefined,
        preserveAspectRatio: pictureFormat.getPictureFillMode ? 
          pictureFormat.getPictureFillMode() === 0 : true, // 0 = Stretch
      };
    } catch (error) {
      logger.error('Error extracting picture properties', { error });
      return null;
    }
  }

  /**
   * Extract image data from picture
   */
  private extractImageData(picture: any): string | null {
    try {
      const imageData = picture.getBinaryData();
      return Buffer.from(imageData).toString('base64');
    } catch (error) {
      logger.error('Error extracting image data', { error });
      return null;
    }
  }

  /**
   * Extract chart data
   */
  private extractChartData(shape: any): any | null {
    try {
      const chartData = shape.getChartData();
      if (!chartData) return null;

      const result: any = {
        chartType: chartData.getChartType ? chartData.getChartType() : 0,
        hasDataTable: chartData.getDataTable ? chartData.getDataTable().hasTable() : false,
        hasLegend: chartData.getLegend ? chartData.getLegend().hasLegend() : false,
        hasTitle: chartData.getChartTitle ? chartData.getChartTitle().hasTitle() : false,
        categories: [],
        series: [],
      };

      // Extract categories if available
      if (chartData.getCategories && chartData.getCategories().size() > 0) {
        const categories = chartData.getCategories();
        for (let i = 0; i < categories.size(); i++) {
          const category = categories.get_Item(i);
          result.categories.push({
            value: category.getAsCell ? category.getAsCell().getValue() : category.getValue(),
          });
        }
      }

      // Extract series data if available
      if (chartData.getSeries && chartData.getSeries().size() > 0) {
        const series = chartData.getSeries();
        for (let i = 0; i < series.size(); i++) {
          const serie = series.get_Item(i);
          const serieData: any = {
            name: serie.getName ? serie.getName().getAsString() : `Series ${i + 1}`,
            values: [],
          };

          // Extract data points
          if (serie.getDataPoints && serie.getDataPoints().size() > 0) {
            const dataPoints = serie.getDataPoints();
            for (let j = 0; j < dataPoints.size(); j++) {
              const point = dataPoints.get_Item(j);
              serieData.values.push({
                value: point.getValue ? point.getValue().getData() : null,
                index: j,
              });
            }
          }

          result.series.push(serieData);
        }
      }

      return result;
    } catch (error) {
      logger.error('Error extracting chart data', { error });
      return {
        chartType: 0,
        hasDataTable: false,
        hasLegend: false,
        hasTitle: false,
        categories: [],
        series: [],
      };
    }
  }

  /**
   * Extract table data
   */
  private extractTableData(table: any): any | null {
    try {
      const rows: any[] = [];
      const columns: any[] = [];

      // Extract columns
      for (let c = 0; c < table.getColumnsCount(); c++) {
        const column = table.getColumns().get_Item(c);
        columns.push({
          width: column.getWidth(),
        });
      }

      // Extract rows and cells
      for (let r = 0; r < table.getRowsCount(); r++) {
        const row = table.getRows().get_Item(r);
        const cells: any[] = [];

        for (let c = 0; c < row.size(); c++) {
          const cell = row.get_Item(c);
          const cellData: any = {
            text: cell.getTextFrame() ? cell.getTextFrame().getText() : '',
            colspan: cell.getColSpan ? cell.getColSpan() : 1,
            rowspan: cell.getRowSpan ? cell.getRowSpan() : 1,
          };

          // Extract cell fill format
          if (cell.getCellFormat && cell.getCellFormat().getFillFormat) {
            const fillFormat = this.fillExtractor.extractFillFormat(cell.getCellFormat().getFillFormat());
            if (fillFormat) {
              cellData.fillFormat = fillFormat;
            }
          }

          // Extract cell text frame
          if (cell.getTextFrame) {
            const textFrame = this.textExtractor.extractTextFrame(cell.getTextFrame());
            if (textFrame) {
              cellData.textFrame = textFrame;
            }
          }

          cells.push(cellData);
        }

        rows.push({
          cells,
          height: row.getHeight ? row.getHeight() : undefined,
        });
      }

      return {
        rows,
        columns,
        firstRow: table.getFirstRow ? table.getFirstRow() : false,
        firstCol: table.getFirstCol ? table.getFirstCol() : false,
        lastRow: table.getLastRow ? table.getLastRow() : false,
        lastCol: table.getLastCol ? table.getLastCol() : false,
      };
    } catch (error) {
      logger.error('Error extracting table data', { error });
      return null;
    }
  }

  /**
   * Extract video properties
   */
  private extractVideoProperties(shape: any): any | null {
    try {
      const videoData = shape.getVideoData();
      if (!videoData) return null;

      const result: any = {
        autoPlay: false,
        loop: false,
        volume: 50,
        fileName: '',
        mediaType: 'video',
      };

      // Extract video frame properties
      if (shape.getPlayMode) {
        result.autoPlay = shape.getPlayMode() === 1; // 1 = Auto
      }

      if (shape.getRewindVideo) {
        result.loop = shape.getRewindVideo();
      }

      if (shape.getVolume) {
        result.volume = shape.getVolume();
      }

      // Extract embedded video data
      if (videoData.getEmbeddedVideo && videoData.getEmbeddedVideo()) {
        const embeddedVideo = videoData.getEmbeddedVideo();
        if (embeddedVideo.getName) {
          result.fileName = embeddedVideo.getName();
        }
        if (embeddedVideo.getBinaryData) {
          result.hasEmbeddedData = true;
          result.dataSize = embeddedVideo.getBinaryData().length;
        }
      }

      // Extract linked video path
      if (videoData.getLinkPathLong) {
        result.linkPath = videoData.getLinkPathLong();
      }

      return result;
    } catch (error) {
      logger.error('Error extracting video properties', { error });
      return {
        autoPlay: false,
        loop: false,
        volume: 50,
        fileName: '',
        mediaType: 'video',
      };
    }
  }

  /**
   * Extract audio properties
   */
  private extractAudioProperties(shape: any): any | null {
    try {
      const audioData = shape.getAudioData();
      if (!audioData) return null;

      const result: any = {
        autoPlay: false,
        loop: false,
        volume: 50,
        fileName: '',
        mediaType: 'audio',
      };

      // Extract audio frame properties
      if (shape.getPlayMode) {
        result.autoPlay = shape.getPlayMode() === 1; // 1 = Auto
      }

      if (shape.getRewindAudio) {
        result.loop = shape.getRewindAudio();
      }

      if (shape.getVolume) {
        result.volume = shape.getVolume();
      }

      // Extract embedded audio data
      if (audioData.getEmbeddedAudio && audioData.getEmbeddedAudio()) {
        const embeddedAudio = audioData.getEmbeddedAudio();
        if (embeddedAudio.getName) {
          result.fileName = embeddedAudio.getName();
        }
        if (embeddedAudio.getBinaryData) {
          result.hasEmbeddedData = true;
          result.dataSize = embeddedAudio.getBinaryData().length;
        }
      }

      // Extract linked audio path
      if (audioData.getLinkPathLong) {
        result.linkPath = audioData.getLinkPathLong();
      }

      return result;
    } catch (error) {
      logger.error('Error extracting audio properties', { error });
      return {
        autoPlay: false,
        loop: false,
        volume: 50,
        fileName: '',
        mediaType: 'audio',
      };
    }
  }

  /**
   * Extract SmartArt properties
   */
  private extractSmartArtProperties(shape: any): any | null {
    try {
      const smartArtData = shape.getSmartArtData();
      if (!smartArtData) return null;

      const result: any = {
        layout: 0,
        nodes: [],
        isReversed: false,
      };

      // Extract layout information
      if (smartArtData.getLayout) {
        result.layout = smartArtData.getLayout();
      }

      if (smartArtData.isReversed) {
        result.isReversed = smartArtData.isReversed();
      }

      // Extract SmartArt nodes
      if (smartArtData.getAllNodes && smartArtData.getAllNodes().size() > 0) {
        const nodes = smartArtData.getAllNodes();
        for (let i = 0; i < nodes.size(); i++) {
          const node = nodes.get_Item(i);
          const nodeData: any = {
            level: node.getLevel ? node.getLevel() : 0,
            position: node.getPosition ? node.getPosition() : i,
            isAssistant: node.isAssistant ? node.isAssistant() : false,
            textFrame: null,
          };

          // Extract node text
          if (node.getTextFrame && node.getTextFrame()) {
            nodeData.textFrame = this.textExtractor.extractTextFrame(node.getTextFrame());
          }

          // Extract child nodes
          if (node.getChildNodes && node.getChildNodes().size() > 0) {
            nodeData.childNodes = [];
            const childNodes = node.getChildNodes();
            for (let j = 0; j < childNodes.size(); j++) {
              const childNode = childNodes.get_Item(j);
              nodeData.childNodes.push({
                level: childNode.getLevel ? childNode.getLevel() : nodeData.level + 1,
                position: j,
                textFrame: childNode.getTextFrame ? 
                  this.textExtractor.extractTextFrame(childNode.getTextFrame()) : null,
              });
            }
          }

          result.nodes.push(nodeData);
        }
      }

      return result;
    } catch (error) {
      logger.error('Error extracting SmartArt properties', { error });
      return {
        layout: 0,
        nodes: [],
        isReversed: false,
      };
    }
  }

  /**
   * Extract OLE object properties
   */
  private extractOleObjectProperties(shape: any): any | null {
    try {
      const objectData = shape.getObjectData();
      if (!objectData) return null;

      const result: any = {
        objectType: 'Unknown',
        displayAsIcon: true,
        fileName: '',
        progId: '',
      };

      // Extract OLE object information
      if (objectData.getEmbeddedFileLabel) {
        result.fileName = objectData.getEmbeddedFileLabel();
      }

      if (objectData.getEmbeddedFileExtension) {
        result.fileExtension = objectData.getEmbeddedFileExtension();
      }

      if (objectData.getSubType) {
        result.objectType = objectData.getSubType().toString();
      }

      if (objectData.getProgId) {
        result.progId = objectData.getProgId();
      }

      // Check if displayed as icon
      if (shape.getDisplayAsIcon) {
        result.displayAsIcon = shape.getDisplayAsIcon();
      }

      // Extract embedded data size
      if (objectData.getEmbeddedFileData) {
        result.hasEmbeddedData = true;
        result.dataSize = objectData.getEmbeddedFileData().length;
      }

      // Extract object name
      if (shape.getObjectName) {
        result.objectName = shape.getObjectName();
      }

      return result;
    } catch (error) {
      logger.error('Error extracting OLE object properties', { error });
      return {
        objectType: 'Unknown',
        displayAsIcon: true,
        fileName: '',
        progId: '',
      };
    }
  }

  /**
   * Extract connector properties
   */
  private extractConnectorProperties(shape: any): any | null {
    try {
      const result: any = {
        startShapeIndex: -1,
        endShapeIndex: -1,
        startConnectionSiteIndex: 0,
        endConnectionSiteIndex: 0,
        connectorType: 'Straight',
      };

      // Extract start shape connection
      if (shape.getStartShapeConnectedTo && shape.getStartShapeConnectedTo()) {
        const startShape = shape.getStartShapeConnectedTo();
        // Get shape index from parent collection
        result.hasStartConnection = true;
        if (shape.getStartShapeConnectionSiteIndex) {
          result.startConnectionSiteIndex = shape.getStartShapeConnectionSiteIndex();
        }
      }

      // Extract end shape connection  
      if (shape.getEndShapeConnectedTo && shape.getEndShapeConnectedTo()) {
        const endShape = shape.getEndShapeConnectedTo();
        result.hasEndConnection = true;
        if (shape.getEndShapeConnectionSiteIndex) {
          result.endConnectionSiteIndex = shape.getEndShapeConnectionSiteIndex();
        }
      }

      // Extract connector type
      if (shape.getConnectorType) {
        const connectorType = shape.getConnectorType();
        const typeMap: Record<number, string> = {
          0: 'Straight',
          1: 'Elbow',
          2: 'Curved',
        };
        result.connectorType = typeMap[connectorType] || 'Straight';
      }

      // Extract rerouting information
      if (shape.getAdjustments && shape.getAdjustments().size() > 0) {
        result.adjustments = [];
        const adjustments = shape.getAdjustments();
        for (let i = 0; i < adjustments.size(); i++) {
          result.adjustments.push(adjustments.get_Item(i).getRawValue());
        }
      }

      return result;
    } catch (error) {
      logger.error('Error extracting connector properties', { error });
      return {
        startShapeIndex: -1,
        endShapeIndex: -1,
        startConnectionSiteIndex: 0,
        endConnectionSiteIndex: 0,
        connectorType: 'Straight',
      };
    }
  }
}