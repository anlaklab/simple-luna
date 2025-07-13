import { z } from "zod";
/**
 * Text Extractor - Handles text frame and formatting extraction
 */

import { logger } from '../../utils/logger';
import { ColorUtils } from './color-utils';

export class TextExtractor {
  private colorUtils: ColorUtils;

  constructor() {
    this.colorUtils = new ColorUtils();
  }

  /**
   * Extract text frame with comprehensive formatting
   */
  extractTextFrame(textFrame: any): any | null {
    try {
      if (!textFrame) return null;

      const result: any = {
        text: textFrame.getText(),
        autofit: textFrame.getTextFrameFormat ? textFrame.getTextFrameFormat().getAutofitType() : undefined,
        marginLeft: textFrame.getTextFrameFormat ? textFrame.getTextFrameFormat().getMarginLeft() : 0,
        marginRight: textFrame.getTextFrameFormat ? textFrame.getTextFrameFormat().getMarginRight() : 0,
        marginTop: textFrame.getTextFrameFormat ? textFrame.getTextFrameFormat().getMarginTop() : 0,
        marginBottom: textFrame.getTextFrameFormat ? textFrame.getTextFrameFormat().getMarginBottom() : 0,
        wrapText: textFrame.getTextFrameFormat ? textFrame.getTextFrameFormat().getWrapText() : true,
        anchorType: textFrame.getTextFrameFormat ? textFrame.getTextFrameFormat().getAnchoringType() : undefined,
        paragraphs: this.extractTextParagraphs(textFrame.getParagraphs()),
      };

      return result;
    } catch (error) {
      logger.error('Error extracting text frame', { error });
      return null;
    }
  }

  /**
   * Extract text paragraphs with comprehensive formatting
   */
  extractTextParagraphs(paragraphs: any): any[] {
    const result: any[] = [];
    
    try {
      for (let i = 0; i < paragraphs.size(); i++) {
        const paragraph = paragraphs.get_Item(i);
        const portions = paragraph.getPortions();
        const paragraphFormat = paragraph.getParagraphFormat();
        
        const paragraphData: any = {
          text: paragraph.getText(),
          paragraphFormat: {
            alignment: paragraphFormat.getAlignment ? paragraphFormat.getAlignment() : undefined,
            marginLeft: paragraphFormat.getMarginLeft ? paragraphFormat.getMarginLeft() : 0,
            marginRight: paragraphFormat.getMarginRight ? paragraphFormat.getMarginRight() : 0,
            marginTop: paragraphFormat.getSpaceBefore ? paragraphFormat.getSpaceBefore() : 0,
            marginBottom: paragraphFormat.getSpaceAfter ? paragraphFormat.getSpaceAfter() : 0,
            lineSpacing: paragraphFormat.getSpaceWithin ? paragraphFormat.getSpaceWithin() : 1,
            bulletType: paragraphFormat.getBullet ? paragraphFormat.getBullet().getType() : undefined,
            bulletChar: paragraphFormat.getBullet && paragraphFormat.getBullet().getChar ? paragraphFormat.getBullet().getChar() : undefined,
            bulletColor: paragraphFormat.getBullet && paragraphFormat.getBullet().getColor ? 
              this.colorUtils.colorToHex(paragraphFormat.getBullet().getColor().getColor()) : undefined,
          },
          portions: [],
        };

        for (let j = 0; j < portions.size(); j++) {
          const portion = portions.get_Item(j);
          const portionFormat = portion.getPortionFormat();
          
          const portionData: any = {
            text: portion.getText(),
            fontFormat: {
              fontName: portionFormat.getLatinFont()?.getFontName() || 'Arial',
              fontSize: portionFormat.getFontHeight() || 12,
              fontBold: portionFormat.getFontBold() === 1,
              fontItalic: portionFormat.getFontItalic() === 1,
              fontUnderline: portionFormat.getFontUnderline() !== 0,
              fontColor: this.extractPortionColor(portionFormat),
            },
          };
          
          paragraphData.portions.push(portionData);
        }

        result.push(paragraphData);
      }
    } catch (error) {
      logger.error('Error extracting text paragraphs', { error });
    }

    return result;
  }

  /**
   * Extract portion text color
   */
  private extractPortionColor(portionFormat: any): string {
    try {
      const fillFormat = portionFormat.getFillFormat();
      if (fillFormat && fillFormat.getFillType() === 1) { // Solid fill
        const solidFillColor = fillFormat.getSolidFillColor();
        if (solidFillColor && solidFillColor.getColor) {
          return this.colorUtils.colorToHex(solidFillColor.getColor());
        }
      }
      return '#000000';
    } catch (error) {
      return '#000000';
    }
  }
}