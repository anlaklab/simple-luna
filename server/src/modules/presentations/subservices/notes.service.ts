/**
 * NotesService - Notes and Comments Management
 * 
 * Handles extraction and manipulation of speaker notes, comments, and handout notes.
 * Supports toggleable features and round-trip fidelity.
 * Uses common mappers for precise conversion.
 */

import { logger } from '../../../utils/logger';
import { randomUUID } from 'crypto';
import { AsposeAdapterRefactored } from '../../../adapters/aspose/AsposeAdapterRefactored';
import { BaseService, ServiceHealth } from '../../shared/interfaces/base.interfaces';

// ✅ ROBUST IMPORT: Use AsposeDriverFactory for unified access
const asposeDriver = require('/app/lib/AsposeDriverFactory');

// =============================================================================
// NOTES SERVICE INTERFACES
// =============================================================================

export interface NotesOptions {
  includeSpeakerNotes?: boolean;
  includeHandoutNotes?: boolean;
  includeComments?: boolean;
  preserveFormatting?: boolean;
  extractImages?: boolean;
  maxLength?: number;
  mode?: 'local' | 'cloud';
  validateOutput?: boolean;
}

export interface UniversalNotes {
  slideIndex: number;
  slideId?: string;
  speakerNotes?: string;
  handoutNotes?: string;
  comments?: SlideComment[];
  images?: NotesImage[];
  plainText?: string;
  formattedText?: any;
  metadata?: {
    extractedAt: string;
    hasContent: boolean;
    characterCount: number;
    wordCount: number;
    processingTime: number;
  };
}

export interface SlideComment {
  id: string;
  author: string;
  text: string;
  createdAt?: Date;
  position?: {
    x: number;
    y: number;
  };
  replies?: SlideComment[];
}

export interface NotesImage {
  id: string;
  name: string;
  format: string;
  size: {
    width: number;
    height: number;
  };
  data?: string; // base64 or URL
}

export interface NotesMapper {
  extract(slide: any, options: NotesOptions): Promise<UniversalNotes | null>;
  add(slide: any, notes: UniversalNotes, options: NotesOptions): Promise<boolean>;
  update(slide: any, notes: UniversalNotes, options: NotesOptions): Promise<boolean>;
  remove(slide: any, options: NotesOptions): Promise<boolean>;
}

// =============================================================================
// NOTES SERVICE IMPLEMENTATION
// =============================================================================

export class NotesService implements BaseService {
  readonly name = 'notes';
  readonly version = '1.0.0';
  readonly description = 'Notes extraction and management per slide with toggleable features';

  private notesMapper: NotesMapper;
  private isAsposeInitialized = false;

  constructor(private aspose: AsposeAdapterRefactored) {
    this.notesMapper = this.createNotesMapper();
  }

  // =============================================================================
  // INITIALIZATION
  // =============================================================================

  async initialize(): Promise<void> {
    try {
      // Validate Aspose adapter is available
      if (!this.aspose) {
        throw new Error('Aspose adapter not available');
      }

      // ✅ Initialize AsposeDriverFactory
      await this.initializeAsposeDriver();

      logger.info('✅ NotesService initialized successfully');
    } catch (error) {
      logger.error('❌ NotesService initialization failed:', { error: (error as Error).message });
      throw error;
    }
  }

  private async initializeAsposeDriver(): Promise<void> {
    if (!this.isAsposeInitialized) {
      await asposeDriver.initialize();
      this.isAsposeInitialized = true;
      logger.info('✅ AsposeDriverFactory initialized in NotesService');
    }
  }

  async healthCheck(): Promise<ServiceHealth> {
    try {
      const isHealthy = this.isAvailable();
      const lastCheck = new Date();
      
      const details = {
        asposeAdapter: !!this.aspose,
        notesMapper: !!this.notesMapper
      };

      if (!isHealthy) {
        return {
          status: 'unhealthy',
          lastCheck,
          details,
          errors: ['Required dependencies not available']
        };
      }

      return {
        status: 'healthy',
        lastCheck,
        details
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        lastCheck: new Date(),
        errors: [(error as Error).message]
      };
    }
  }

  // =============================================================================
  // CORE NOTES OPERATIONS
  // =============================================================================

  async extractNotes(
    slide: any, 
    options: NotesOptions = { includeSpeakerNotes: true }
  ): Promise<UniversalNotes | null> {
    const startTime = Date.now();
    
    try {
      const slideIndex = slide.getSlideNumber ? slide.getSlideNumber() : 0;
      
      logger.info('Extracting notes from slide', { 
        slideIndex,
        options 
      });

      // Use notes mapper for extraction
      const notes = await this.notesMapper.extract(slide, options);

      if (notes) {
        notes.metadata!.processingTime = Date.now() - startTime;
        
        // Validate output if enabled
        if (options.validateOutput) {
          this.validateNotesSchema(notes);
        }

        logger.info('Notes extraction completed', {
          slideIndex,
          hasContent: notes.metadata!.hasContent,
          characterCount: notes.metadata!.characterCount,
          processingTime: notes.metadata!.processingTime
        });
      } else {
        logger.info('No notes found on slide', { slideIndex });
      }

      return notes;

    } catch (error) {
      logger.error('Notes extraction failed', { 
        error: (error as Error).message,
        slideIndex: slide.getSlideNumber ? slide.getSlideNumber() : 'unknown'
      });
      throw error;
    }
  }

  async addNotes(
    slide: any, 
    text: string,
    options: NotesOptions = { preserveFormatting: false }
  ): Promise<boolean> {
    try {
      const slideIndex = slide.getSlideNumber ? slide.getSlideNumber() : 0;
      
      logger.info('Adding notes to slide', { 
        slideIndex,
        textLength: text.length,
        options 
      });

      // Create notes object
      const notes: UniversalNotes = {
        slideIndex,
        speakerNotes: text,
        plainText: text,
        metadata: {
          extractedAt: new Date().toISOString(),
          hasContent: !!text,
          characterCount: text.length,
          wordCount: text.split(/\s+/).length,
          processingTime: 0
        }
      };

      // Use notes mapper for addition
      const success = await this.notesMapper.add(slide, notes, options);

      if (success) {
        logger.info('Notes added successfully', {
          slideIndex,
          textLength: text.length
        });
      } else {
        logger.warn('Notes addition failed', { slideIndex });
      }

      return success;

    } catch (error) {
      logger.error('Add notes failed', { 
        error: (error as Error).message,
        slideIndex: slide.getSlideNumber ? slide.getSlideNumber() : 'unknown'
      });
      throw error;
    }
  }

  async updateNotes(
    slide: any, 
    notes: UniversalNotes,
    options: NotesOptions = { preserveFormatting: true }
  ): Promise<boolean> {
    try {
      const slideIndex = slide.getSlideNumber ? slide.getSlideNumber() : 0;
      
      logger.info('Updating notes on slide', { 
        slideIndex,
        hasContent: notes.metadata?.hasContent,
        options 
      });

      // Use notes mapper for update
      const success = await this.notesMapper.update(slide, notes, options);

      if (success) {
        logger.info('Notes updated successfully', { slideIndex });
      } else {
        logger.warn('Notes update failed', { slideIndex });
      }

      return success;

    } catch (error) {
      logger.error('Update notes failed', { 
        error: (error as Error).message,
        slideIndex: slide.getSlideNumber ? slide.getSlideNumber() : 'unknown'
      });
      throw error;
    }
  }

  async removeNotes(
    slide: any,
    options: NotesOptions = {}
  ): Promise<boolean> {
    try {
      const slideIndex = slide.getSlideNumber ? slide.getSlideNumber() : 0;
      
      logger.info('Removing notes from slide', { 
        slideIndex,
        options 
      });

      // Use notes mapper for removal
      const success = await this.notesMapper.remove(slide, options);

      if (success) {
        logger.info('Notes removed successfully', { slideIndex });
      } else {
        logger.warn('Notes removal failed', { slideIndex });
      }

      return success;

    } catch (error) {
      logger.error('Remove notes failed', { 
        error: (error as Error).message,
        slideIndex: slide.getSlideNumber ? slide.getSlideNumber() : 'unknown'
      });
      throw error;
    }
  }

  // =============================================================================
  // BATCH OPERATIONS
  // =============================================================================

  async extractNotesFromPresentation(
    presentation: any,
    options: NotesOptions = { includeSpeakerNotes: true }
  ): Promise<UniversalNotes[]> {
    try {
      logger.info('Extracting notes from entire presentation', { options });

      const allNotes: UniversalNotes[] = [];
      
      if (!presentation.getSlides) {
        logger.warn('Presentation does not support slides');
        return allNotes;
      }

      const slides = presentation.getSlides();
      const slideCount = slides.size ? slides.size() : 0;

      logger.info(`Processing notes from ${slideCount} slides`);

      for (let i = 0; i < slideCount; i++) {
        try {
          const slide = slides.get_Item(i);
          if (!slide) continue;

          const notes = await this.extractNotes(slide, options);
          if (notes && notes.metadata?.hasContent) {
            allNotes.push(notes);
          }

        } catch (slideError) {
          logger.warn(`Failed to extract notes from slide ${i}`, { error: (slideError as Error).message });
        }
      }

      logger.info('Presentation notes extraction completed', {
        totalSlides: slideCount,
        slidesWithNotes: allNotes.length
      });

      return allNotes;

    } catch (error) {
      logger.error('Presentation notes extraction failed', { error: (error as Error).message });
      throw error;
    }
  }

  // =============================================================================
  // PRIVATE EXTRACTION METHODS
  // =============================================================================

  private async extractSpeakerNotes(slide: any, options: NotesOptions): Promise<string | undefined> {
    try {
      if (!options.includeSpeakerNotes) {
        return undefined;
      }

      if (!slide.getNotesSlideManager) {
        return undefined;
      }

      const notesSlideManager = slide.getNotesSlideManager();
      const notesSlide = notesSlideManager.getNotesSlide();
      
      if (!notesSlide || !notesSlide.getNotesTextFrame) {
        return undefined;
      }

      const textFrame = notesSlide.getNotesTextFrame();
      const text = textFrame.getText ? textFrame.getText() : '';
      
      // Apply max length if specified
      if (options.maxLength && text.length > options.maxLength) {
        return text.substring(0, options.maxLength) + '...';
      }

      return text || undefined;

    } catch (error) {
      logger.warn('Failed to extract speaker notes', { error: (error as Error).message });
      return undefined;
    }
  }

  private async extractComments(slide: any, options: NotesOptions): Promise<SlideComment[]> {
    try {
      const comments: SlideComment[] = [];
      
      if (!options.includeComments) {
        return comments;
      }

      if (!slide.getSlideComments) {
        return comments;
      }

      const slideComments = slide.getSlideComments();
      const commentCount = slideComments.size ? slideComments.size() : 0;

      for (let i = 0; i < commentCount; i++) {
        try {
          const comment = slideComments.get_Item(i);
          if (!comment) continue;

          const commentData: SlideComment = {
            id: randomUUID(),
            author: comment.getAuthor ? comment.getAuthor() : 'Unknown',
            text: comment.getText ? comment.getText() : '',
            createdAt: comment.getCreatedTime ? new Date(comment.getCreatedTime()) : undefined,
            position: {
              x: comment.getPosition ? comment.getPosition().getX() : 0,
              y: comment.getPosition ? comment.getPosition().getY() : 0
            }
          };

          comments.push(commentData);

        } catch (commentError) {
          logger.warn(`Failed to process comment ${i}`, { error: (commentError as Error).message });
        }
      }

      return comments;

    } catch (error) {
      logger.warn('Failed to extract comments', { error: (error as Error).message });
      return [];
    }
  }

  private async extractNotesImages(slide: any, options: NotesOptions): Promise<NotesImage[]> {
    try {
      const images: NotesImage[] = [];
      
      if (!options.extractImages) {
        return images;
      }

      if (!slide.getNotesSlideManager) {
        return images;
      }

      const notesSlide = slide.getNotesSlideManager().getNotesSlide();
      
      if (!notesSlide || !notesSlide.getShapes) {
        return images;
      }

      const shapes = notesSlide.getShapes();
      const shapeCount = shapes.size ? shapes.size() : 0;

      for (let i = 0; i < shapeCount; i++) {
        try {
          const shape = shapes.get_Item(i);
          if (!shape || !shape.getPictureFormat) continue;

          const pictureFormat = shape.getPictureFormat();
          if (!pictureFormat || !pictureFormat.getPicture()) continue;

          const picture = pictureFormat.getPicture();
          const imageData: NotesImage = {
            id: randomUUID(),
            name: shape.getName ? shape.getName() : `NotesImage_${i}`,
            format: picture.getImageFormat ? picture.getImageFormat().toString() : 'unknown',
            size: {
              width: shape.getWidth ? shape.getWidth() : 0,
              height: shape.getHeight ? shape.getHeight() : 0
            }
          };

          images.push(imageData);

        } catch (imageError) {
          logger.warn(`Failed to process notes image ${i}`, { error: (imageError as Error).message });
        }
      }

      return images;

    } catch (error) {
      logger.warn('Failed to extract notes images', { error: (error as Error).message });
      return [];
    }
  }

  // =============================================================================
  // NOTES MAPPER FOR FIDELITY
  // =============================================================================

  private createNotesMapper(): NotesMapper {
    return {
      extract: async (slide: any, options: NotesOptions): Promise<UniversalNotes | null> => {
        try {
          const slideIndex = slide.getSlideNumber ? slide.getSlideNumber() : 0;
          const slideId = slide.getSlideId ? slide.getSlideId().toString() : randomUUID();

          // Extract different types of notes
          const speakerNotes = await this.extractSpeakerNotes(slide, options);
          const comments = await this.extractComments(slide, options);
          const images = await this.extractNotesImages(slide, options);

          // Determine if we have any content
          const hasContent = !!(speakerNotes || comments.length > 0 || images.length > 0);

          if (!hasContent) {
            return null;
          }

          // Create plain text version
          let plainText = speakerNotes || '';
          if (comments.length > 0) {
            const commentTexts = comments.map(c => `${c.author}: ${c.text}`).join('\n');
            plainText = plainText ? `${plainText}\n\nComments:\n${commentTexts}` : commentTexts;
          }

          const notes: UniversalNotes = {
            slideIndex,
            slideId,
            speakerNotes,
            comments: comments.length > 0 ? comments : undefined,
            images: images.length > 0 ? images : undefined,
            plainText,
            metadata: {
              extractedAt: new Date().toISOString(),
              hasContent,
              characterCount: plainText.length,
              wordCount: plainText.split(/\s+/).filter(word => word.length > 0).length,
              processingTime: 0
            }
          };

          return notes;

        } catch (error) {
          logger.error('Notes mapper extraction failed', { error: (error as Error).message });
          return null;
        }
      },

      add: async (slide: any, notes: UniversalNotes, options: NotesOptions): Promise<boolean> => {
        try {
          // ✅ Ensure AsposeDriverFactory is initialized
          await this.initializeAsposeDriver();

          if (notes.speakerNotes) {
            const notesSlideManager = slide.getNotesSlideManager();
            let notesSlide = notesSlideManager.getNotesSlide();
            
            if (!notesSlide) {
              notesSlide = notesSlideManager.addNotesSlide();
            }

            if (notesSlide.getNotesTextFrame) {
              notesSlide.getNotesTextFrame().setText(notes.speakerNotes);
            }
          }

          return true;

        } catch (error) {
          logger.error('Notes mapper addition failed', { error: (error as Error).message });
          return false;
        }
      },

      update: async (slide: any, notes: UniversalNotes, options: NotesOptions): Promise<boolean> => {
        try {
          // ✅ Ensure AsposeDriverFactory is initialized
          await this.initializeAsposeDriver();

          if (notes.speakerNotes) {
            const notesSlideManager = slide.getNotesSlideManager();
            let notesSlide = notesSlideManager.getNotesSlide();
            
            if (!notesSlide) {
              notesSlide = notesSlideManager.addNotesSlide();
            }

            if (notesSlide.getNotesTextFrame) {
              notesSlide.getNotesTextFrame().setText(notes.speakerNotes);
            }
          }

          return true;

        } catch (error) {
          logger.error('Notes mapper update failed', { error: (error as Error).message });
          return false;
        }
      },

      remove: async (slide: any, options: NotesOptions): Promise<boolean> => {
        try {
          if (!slide.getNotesSlideManager) {
            return true; // No notes to remove
          }

          const notesSlideManager = slide.getNotesSlideManager();
          const notesSlide = notesSlideManager.getNotesSlide();
          
          if (notesSlide) {
            // Clear notes text
            if (notesSlide.getNotesTextFrame) {
              notesSlide.getNotesTextFrame().setText('');
            }
          }

          return true;

        } catch (error) {
          logger.error('Notes mapper removal failed', { error: (error as Error).message });
          return false;
        }
      }
    };
  }

  // =============================================================================
  // VALIDATION
  // =============================================================================

  private validateNotesSchema(notes: UniversalNotes): void {
    if (notes.slideIndex < 0) {
      throw new Error('Slide index must be non-negative');
    }

    if (notes.metadata && !notes.metadata.extractedAt) {
      throw new Error('Extraction timestamp is required in metadata');
    }

    if (notes.metadata && typeof notes.metadata.hasContent !== 'boolean') {
      throw new Error('hasContent must be a boolean in metadata');
    }
  }

  // =============================================================================
  // SERVICE INTERFACE METHODS
  // =============================================================================

  getCapabilities(): string[] {
    return [
      'extract-notes',
      'add-notes',
      'update-notes',
      'remove-notes',
      'extract-speaker-notes',
      'extract-comments',
      'extract-notes-images',
      'batch-extract-notes'
    ];
  }

  getRequiredDependencies(): string[] {
    return ['aspose'];
  }

  isAvailable(): boolean {
    return !!this.aspose;
  }

  getStats() {
    return {
      notesMapper: !!this.notesMapper,
      dependencies: {
        aspose: !!this.aspose
      }
    };
  }
} 