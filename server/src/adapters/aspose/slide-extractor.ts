/**
 * Slide Extractor - Handles slide-level extraction for Aspose.Slides
 */

import { logger } from '../../utils/logger';
import { ConversionOptions } from './types/interfaces';
import { ShapeExtractor } from './shape-extractor';
import { FillExtractor } from './fill-extractor';
import { EffectExtractor } from './effect-extractor';

export class SlideExtractor {
  private shapeExtractor: ShapeExtractor;
  private fillExtractor: FillExtractor;
  private effectExtractor: EffectExtractor;

  constructor() {
    this.shapeExtractor = new ShapeExtractor();
    this.fillExtractor = new FillExtractor();
    this.effectExtractor = new EffectExtractor();
  }

  /**
   * Process individual slide to Universal Schema format
   */
  async processSlide(slide: any, index: number, options: ConversionOptions): Promise<any> {
    try {
      const slideData: any = {
        slideId: index + 1,
        name: slide.getName() || `Slide ${index + 1}`,
        slideType: 'Slide',
        shapes: [],
        comments: [],
        animations: [],
        placeholders: [],
        hidden: slide.getHidden(),
        notes: null,
        background: null,
        transition: null,
        timing: null,
      };

      // Extract slide background
      if (slide.getBackground) {
        const background = slide.getBackground();
        if (background && background.getFillFormat) {
          const fillFormat = this.fillExtractor.extractFillFormat(background.getFillFormat());
          if (fillFormat) {
            slideData.background = {
              type: fillFormat.type,
              fillFormat: fillFormat,
            };

            // Extract background effect format
            if (background.getEffectFormat) {
              const effectFormat = this.effectExtractor.extractEffectFormat(background.getEffectFormat());
              if (effectFormat) {
                slideData.background.effectFormat = effectFormat;
              }
            }
          }
        }
      }

      // Extract slide transition
      if (slide.getSlideShowTransition) {
        const transition = slide.getSlideShowTransition();
        slideData.transition = {
          type: transition.getType ? transition.getType() : undefined,
          speed: transition.getSpeed ? transition.getSpeed() : undefined,
          advanceOnClick: transition.getAdvanceOnClick ? transition.getAdvanceOnClick() : true,
          advanceAfterTime: transition.getAdvanceAfterTime ? transition.getAdvanceAfterTime() : undefined,
          advanceAfterTimeEnabled: transition.getAdvanceAfter ? transition.getAdvanceAfter() : false,
        };

        // Extract transition sound
        if (transition.getSound && transition.getSound()) {
          slideData.transition.sound = {
            loop: transition.getSound().getLoop ? transition.getSound().getLoop() : false,
          };
        }
      }

      // Extract slide timing
      if (slide.getTimeline) {
        const timeline = slide.getTimeline();
        slideData.timing = {
          mainSequenceCount: timeline.getMainSequence ? timeline.getMainSequence().size() : 0,
          hasTimeline: true,
        };
      }

      // Extract notes
      if (slide.getNotesSlideManager && slide.getNotesSlideManager().getNotesSlide()) {
        const notesSlide = slide.getNotesSlideManager().getNotesSlide();
        if (notesSlide.getNotesTextFrame) {
          slideData.notes = notesSlide.getNotesTextFrame().getText();
        }
      }

      // Process shapes if requested
      if (options.includeAssets !== false) {
        const shapes = slide.getShapes();
        for (let i = 0; i < shapes.size(); i++) {
          const shape = shapes.get_Item(i);
          const shapeData = await this.shapeExtractor.processShape(shape, options);
          if (shapeData) {
            slideData.shapes.push(shapeData);
          }
        }
      }

      // Process placeholders
      const placeholders = slide.getPlaceholders ? slide.getPlaceholders() : null;
      if (placeholders) {
        for (let i = 0; i < placeholders.size(); i++) {
          const placeholder = placeholders.get_Item(i);
          slideData.placeholders.push({
            type: placeholder.getType ? placeholder.getType() : undefined,
            index: placeholder.getIndex ? placeholder.getIndex() : i,
            size: placeholder.getSize ? placeholder.getSize() : undefined,
            orientation: placeholder.getOrientation ? placeholder.getOrientation() : undefined,
          });
        }
      }

      // Process animations if requested
      if (options.includeAnimations) {
        const mainSequence = slide.getTimeline().getMainSequence();
        for (let i = 0; i < mainSequence.size(); i++) {
          const effect = mainSequence.get_Item(i);
          const animationData = this.processAnimation(effect);
          if (animationData) {
            slideData.animations.push(animationData);
          }
        }
      }

      // Process comments if requested
      if (options.includeComments) {
        const comments = slide.getComments ? slide.getComments() : null;
        if (comments) {
          for (let i = 0; i < comments.size(); i++) {
            const comment = comments.get_Item(i);
            const commentData = this.processComment(comment);
            if (commentData) {
              slideData.comments.push(commentData);
            }
          }
        }
      }

      return slideData;
    } catch (error) {
      logger.error('Error processing slide', { error, slideIndex: index });
      return {
        slideId: index + 1,
        name: `Slide ${index + 1}`,
        slideType: 'Slide',
        shapes: [],
        comments: [],
        animations: [],
        placeholders: [],
        hidden: false,
      };
    }
  }

  /**
   * Process animation effect
   */
  private processAnimation(effect: any): any {
    try {
      const timing = effect.getTiming();
      const result: any = {
        type: effect.getType ? effect.getType() : undefined,
        subtype: effect.getSubtype ? effect.getSubtype() : undefined,
        duration: timing && timing.getDuration ? timing.getDuration() : 1000,
        triggerType: timing && timing.getTriggerType ? timing.getTriggerType() : undefined,
        delay: timing && timing.getTriggerDelayTime ? timing.getTriggerDelayTime() : 0,
        repeatCount: timing && timing.getRepeatCount ? timing.getRepeatCount() : 1,
        autoReverse: timing && timing.getAutoReverse ? timing.getAutoReverse() : false,
      };

      // Extract target shape index
      if (effect.getTargetShape) {
        const targetShape = effect.getTargetShape();
        if (targetShape) {
          // Try to find the shape index in the slide
          result.targetShapeIndex = targetShape.getZOrderPosition ? targetShape.getZOrderPosition() : 0;
        }
      }

      return result;
    } catch (error) {
      logger.error('Error processing animation', { error });
      return null;
    }
  }

  /**
   * Process slide comment
   */
  private processComment(comment: any): any {
    try {
      const result: any = {
        author: comment.getAuthor ? comment.getAuthor() : 'Unknown',
        text: comment.getText ? comment.getText() : '',
        position: {
          x: 0,
          y: 0,
        },
      };

      // Extract position
      if (comment.getPosition) {
        const position = comment.getPosition();
        result.position = {
          x: position.getX ? position.getX() : 0,
          y: position.getY ? position.getY() : 0,
        };
      }

      // Extract timestamps
      if (comment.getCreatedTime) {
        result.createdTime = new Date(comment.getCreatedTime().getTime());
      }

      if (comment.getModifiedTime) {
        result.modifiedTime = new Date(comment.getModifiedTime().getTime());
      }

      return result;
    } catch (error) {
      logger.error('Error processing comment', { error });
      return null;
    }
  }
}