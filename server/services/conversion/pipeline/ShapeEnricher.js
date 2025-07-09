/**
 * Shape Enricher
 * 
 * Enriches extracted shape data with additional processing, formatting,
 * and enhanced metadata for better conversion fidelity
 */

class ShapeEnricher {
  constructor(asposeAdapter, logger) {
    this.asposeAdapter = asposeAdapter;
    this.logger = logger;
    this.enrichmentStats = {
      processed: 0,
      enriched: 0,
      failed: 0
    };
  }

  /**
   * Enrich a collection of shapes with enhanced data
   */
  async enrichShapes(shapes, slideIndex, presentation) {
    const enrichmentStartTime = Date.now();
    
    try {
      this.logger.logSlide(slideIndex, 'shape_enrichment_started', {
        slideIndex,
        shapeCount: shapes.length
      });

      const enrichedShapes = [];

      for (let i = 0; i < shapes.length; i++) {
        try {
          const enrichedShape = await this.enrichSingleShape(shapes[i], slideIndex, i, presentation);
          enrichedShapes.push(enrichedShape);
          this.enrichmentStats.enriched++;
        } catch (enrichmentError) {
          this.logger.logError('SHAPE_ENRICHMENT', enrichmentError, {
            slideIndex,
            shapeIndex: i,
            originalShape: shapes[i]
          });

          // Keep original shape if enrichment fails
          enrichedShapes.push({
            ...shapes[i],
            enrichmentError: enrichmentError.message,
            enrichmentStatus: 'failed'
          });
          this.enrichmentStats.failed++;
        }
        this.enrichmentStats.processed++;
      }

      const enrichmentTime = Date.now() - enrichmentStartTime;
      this.logger.logSlide(slideIndex, 'shape_enrichment_completed', {
        slideIndex,
        totalShapes: shapes.length,
        enrichedShapes: this.enrichmentStats.enriched,
        failedShapes: this.enrichmentStats.failed,
        enrichmentTime
      });

      return enrichedShapes;

    } catch (error) {
      this.logger.logError('SHAPE_ENRICHMENT', error, {
        slideIndex,
        action: 'enrich_shapes_collection'
      });

      // Return original shapes if enrichment fails completely
      return shapes.map(shape => ({
        ...shape,
        enrichmentStatus: 'collection_failed',
        enrichmentError: error.message
      }));
    }
  }

  /**
   * Enrich a single shape with enhanced data
   */
  async enrichSingleShape(shape, slideIndex, shapeIndex, presentation) {
    const enrichmentStartTime = Date.now();

    try {
      this.logger.logShape(slideIndex, shapeIndex, 'shape_enrichment_started', {
        shapeType: shape.shapeType,
        hasText: !!shape.text
      });

      // Start with original shape data
      const enrichedShape = {
        ...shape,
        enrichmentMetadata: {
          enrichmentStartTime,
          enrichmentVersion: '1.0.0'
        }
      };

      // Enrich text content
      if (shape.text || shape.textFrame) {
        this._enrichTextContent(enrichedShape, slideIndex, shapeIndex);
      }

      // Enrich geometry and positioning
      this._enrichGeometry(enrichedShape, slideIndex, shapeIndex);

      // Enrich formatting and styles
      this._enrichFormatting(enrichedShape, slideIndex, shapeIndex);

      // Enrich shape-specific properties
      this._enrichShapeSpecificProperties(enrichedShape, slideIndex, shapeIndex);

      // Add computed properties
      this._addComputedProperties(enrichedShape, slideIndex, shapeIndex);

      // Finalize enrichment metadata
      enrichedShape.enrichmentMetadata = {
        ...enrichedShape.enrichmentMetadata,
        enrichmentTime: Date.now() - enrichmentStartTime,
        enrichmentStatus: 'success',
        enrichedAt: new Date().toISOString()
      };

      this.logger.logShape(slideIndex, shapeIndex, 'shape_enrichment_completed', {
        shapeType: enrichedShape.shapeType,
        enrichmentTime: enrichedShape.enrichmentMetadata.enrichmentTime,
        hasEnrichedText: !!enrichedShape.enrichedText
      });

      return enrichedShape;

    } catch (error) {
      this.logger.logError('SHAPE_ENRICHMENT', error, {
        slideIndex,
        shapeIndex,
        originalShape: shape
      });

      return {
        ...shape,
        enrichmentError: error.message,
        enrichmentStatus: 'failed',
        enrichmentMetadata: {
          enrichmentTime: Date.now() - enrichmentStartTime,
          enrichmentStatus: 'failed',
          enrichedAt: new Date().toISOString()
        }
      };
    }
  }

  /**
   * Enrich text content with additional metadata and formatting
   */
  _enrichTextContent(shape, slideIndex, shapeIndex) {
    try {
      const originalText = shape.text || shape.textFrame?.text || '';
      
      if (originalText) {
        shape.enrichedText = {
          raw: originalText,
          cleaned: this._cleanText(originalText),
          wordCount: this._countWords(originalText),
          characterCount: originalText.length,
          hasFormatting: !!shape.textFrame,
          textMetrics: {
            lines: originalText.split('\n').length,
            paragraphs: originalText.split('\n\n').length,
            isEmpty: originalText.trim() === '',
            language: this._detectLanguage(originalText)
          }
        };

        // Enhance text frame if exists
        if (shape.textFrame) {
          shape.enrichedTextFrame = {
            ...shape.textFrame,
            hasMultipleParagraphs: shape.textFrame.paragraphs?.length > 1,
            totalPortions: this._countTextPortions(shape.textFrame),
            dominantFont: this._extractDominantFont(shape.textFrame),
            averageFontSize: this._calculateAverageFontSize(shape.textFrame)
          };
        }
      }

    } catch (error) {
      this.logger.logError('TEXT_ENRICHMENT', error, {
        slideIndex,
        shapeIndex,
        action: 'enrich_text_content'
      });
    }
  }

  /**
   * Enrich geometry with additional calculations
   */
  _enrichGeometry(shape, slideIndex, shapeIndex) {
    try {
      const geometry = shape.geometry || {};
      
      shape.enrichedGeometry = {
        ...geometry,
        // Add computed properties
        centerX: (geometry.x || 0) + (geometry.width || 0) / 2,
        centerY: (geometry.y || 0) + (geometry.height || 0) / 2,
        area: (geometry.width || 0) * (geometry.height || 0),
        aspectRatio: geometry.width && geometry.height ? geometry.width / geometry.height : 1,
        
        // Position descriptors
        position: this._describePosition(geometry),
        size: this._describeSize(geometry),
        
        // Bounding box
        boundingBox: {
          left: geometry.x || 0,
          top: geometry.y || 0,
          right: (geometry.x || 0) + (geometry.width || 0),
          bottom: (geometry.y || 0) + (geometry.height || 0)
        }
      };

    } catch (error) {
      this.logger.logError('GEOMETRY_ENRICHMENT', error, {
        slideIndex,
        shapeIndex,
        action: 'enrich_geometry'
      });
    }
  }

  /**
   * Enrich formatting with enhanced style information
   */
  _enrichFormatting(shape, slideIndex, shapeIndex) {
    try {
      if (shape.fillFormat) {
        shape.enrichedFillFormat = {
          ...shape.fillFormat,
          cssColor: this._convertToCSSColor(shape.fillFormat),
          contrastRatio: this._calculateContrastRatio(shape.fillFormat),
          colorFamily: this._getColorFamily(shape.fillFormat)
        };
      }

    } catch (error) {
      this.logger.logError('FORMATTING_ENRICHMENT', error, {
        slideIndex,
        shapeIndex,
        action: 'enrich_formatting'
      });
    }
  }

  /**
   * Enrich shape-specific properties
   */
  _enrichShapeSpecificProperties(shape, slideIndex, shapeIndex) {
    try {
      const shapeType = shape.shapeType || '';

      if (shapeType.includes('Table')) {
        this._enrichTableShape(shape, slideIndex, shapeIndex);
      } else if (shapeType.includes('Chart')) {
        this._enrichChartShape(shape, slideIndex, shapeIndex);
      } else if (shapeType.includes('Picture') || shapeType.includes('Image')) {
        this._enrichPictureShape(shape, slideIndex, shapeIndex);
      } else {
        this._enrichGenericShape(shape, slideIndex, shapeIndex);
      }

    } catch (error) {
      this.logger.logError('SPECIFIC_ENRICHMENT', error, {
        slideIndex,
        shapeIndex,
        shapeType: shape.shapeType,
        action: 'enrich_shape_specific'
      });
    }
  }

  /**
   * Add computed properties for analysis
   */
  _addComputedProperties(shape, slideIndex, shapeIndex) {
    try {
      shape.computedProperties = {
        complexity: this._calculateShapeComplexity(shape),
        importance: this._calculateShapeImportance(shape),
        readability: this._calculateReadability(shape),
        category: this._categorizeShape(shape),
        tags: this._generateShapeTags(shape)
      };

    } catch (error) {
      this.logger.logError('COMPUTED_PROPERTIES', error, {
        slideIndex,
        shapeIndex,
        action: 'add_computed_properties'
      });
    }
  }

  // =============================================================================
  // HELPER METHODS
  // =============================================================================

  _cleanText(text) {
    return text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\s+/g, ' ')
      .trim();
  }

  _countWords(text) {
    return text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
  }

  _detectLanguage(text) {
    // Simple language detection - could be enhanced
    const englishWords = /\b(the|and|or|but|in|on|at|to|for|of|with|by)\b/gi;
    const spanishWords = /\b(el|la|y|o|pero|en|de|para|con|por)\b/gi;
    
    const englishMatches = (text.match(englishWords) || []).length;
    const spanishMatches = (text.match(spanishWords) || []).length;
    
    if (englishMatches > spanishMatches) return 'en';
    if (spanishMatches > englishMatches) return 'es';
    return 'unknown';
  }

  _countTextPortions(textFrame) {
    try {
      if (textFrame.paragraphs && Array.isArray(textFrame.paragraphs)) {
        return textFrame.paragraphs.reduce((total, paragraph) => {
          return total + (paragraph.portions ? paragraph.portions.length : 0);
        }, 0);
      }
      return 0;
    } catch {
      return 0;
    }
  }

  _extractDominantFont(textFrame) {
    try {
      // Extract most common font from text frame
      const fonts = [];
      if (textFrame.paragraphs) {
        textFrame.paragraphs.forEach(paragraph => {
          if (paragraph.portions) {
            paragraph.portions.forEach(portion => {
              if (portion.fontName) {
                fonts.push(portion.fontName);
              }
            });
          }
        });
      }
      
      // Find most common font
      const fontCounts = {};
      fonts.forEach(font => {
        fontCounts[font] = (fontCounts[font] || 0) + 1;
      });
      
      return Object.keys(fontCounts).reduce((a, b) => 
        fontCounts[a] > fontCounts[b] ? a : b, 'Arial'
      );
    } catch {
      return 'Arial';
    }
  }

  _calculateAverageFontSize(textFrame) {
    try {
      const sizes = [];
      if (textFrame.paragraphs) {
        textFrame.paragraphs.forEach(paragraph => {
          if (paragraph.portions) {
            paragraph.portions.forEach(portion => {
              if (portion.fontSize) {
                sizes.push(portion.fontSize);
              }
            });
          }
        });
      }
      
      return sizes.length > 0 ? 
        sizes.reduce((sum, size) => sum + size, 0) / sizes.length : 12;
    } catch {
      return 12;
    }
  }

  _describePosition(geometry) {
    const x = geometry.x || 0;
    const y = geometry.y || 0;
    
    let description = '';
    if (y < 200) description += 'top';
    else if (y > 400) description += 'bottom';
    else description += 'middle';
    
    description += '-';
    
    if (x < 200) description += 'left';
    else if (x > 400) description += 'right';
    else description += 'center';
    
    return description;
  }

  _describeSize(geometry) {
    const area = (geometry.width || 0) * (geometry.height || 0);
    
    if (area < 10000) return 'small';
    if (area < 50000) return 'medium';
    if (area < 100000) return 'large';
    return 'extra-large';
  }

  _convertToCSSColor(fillFormat) {
    try {
      if (fillFormat.color && fillFormat.color.type === 'RGB') {
        const { r, g, b } = fillFormat.color;
        return `rgb(${r}, ${g}, ${b})`;
      }
      return '#000000';
    } catch {
      return '#000000';
    }
  }

  _calculateContrastRatio(fillFormat) {
    // Simplified contrast calculation
    try {
      if (fillFormat.color && fillFormat.color.type === 'RGB') {
        const { r, g, b } = fillFormat.color;
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        return luminance > 0.5 ? 'light' : 'dark';
      }
      return 'unknown';
    } catch {
      return 'unknown';
    }
  }

  _getColorFamily(fillFormat) {
    try {
      if (fillFormat.color && fillFormat.color.type === 'RGB') {
        const { r, g, b } = fillFormat.color;
        
        if (r > g && r > b) return 'red';
        if (g > r && g > b) return 'green';
        if (b > r && b > g) return 'blue';
        if (r === g && g === b) return 'gray';
        
        return 'mixed';
      }
      return 'unknown';
    } catch {
      return 'unknown';
    }
  }

  _enrichTableShape(shape, slideIndex, shapeIndex) {
    if (!shape.enrichedTableProperties) {
      shape.enrichedTableProperties = {
        category: 'table',
        complexity: 'high',
        interactivity: 'static'
      };
    }
  }

  _enrichChartShape(shape, slideIndex, shapeIndex) {
    if (!shape.enrichedChartProperties) {
      shape.enrichedChartProperties = {
        category: 'chart',
        complexity: 'high',
        dataVisualization: true
      };
    }
  }

  _enrichPictureShape(shape, slideIndex, shapeIndex) {
    if (!shape.enrichedPictureProperties) {
      shape.enrichedPictureProperties = {
        category: 'image',
        complexity: 'medium',
        decorative: this._isPictureDecorative(shape)
      };
    }
  }

  _enrichGenericShape(shape, slideIndex, shapeIndex) {
    if (!shape.enrichedGenericProperties) {
      shape.enrichedGenericProperties = {
        category: 'generic',
        complexity: this._calculateShapeComplexity(shape)
      };
    }
  }

  _calculateShapeComplexity(shape) {
    let complexity = 0;
    
    if (shape.text) complexity += shape.text.length > 100 ? 2 : 1;
    if (shape.fillFormat) complexity += 1;
    if (shape.textFrame && shape.textFrame.paragraphs) {
      complexity += shape.textFrame.paragraphs.length;
    }
    
    if (complexity < 2) return 'low';
    if (complexity < 5) return 'medium';
    return 'high';
  }

  _calculateShapeImportance(shape) {
    let importance = 0;
    
    // Text content importance
    if (shape.text) {
      if (shape.text.length > 200) importance += 3;
      else if (shape.text.length > 50) importance += 2;
      else importance += 1;
    }
    
    // Size importance
    const area = (shape.geometry?.width || 0) * (shape.geometry?.height || 0);
    if (area > 50000) importance += 2;
    else if (area > 20000) importance += 1;
    
    if (importance < 2) return 'low';
    if (importance < 4) return 'medium';
    return 'high';
  }

  _calculateReadability(shape) {
    if (!shape.text) return 'n/a';
    
    const wordCount = this._countWords(shape.text);
    if (wordCount < 10) return 'high';
    if (wordCount < 30) return 'medium';
    return 'low';
  }

  _categorizeShape(shape) {
    const shapeType = shape.shapeType || '';
    
    if (shapeType.includes('Text') || shape.text) return 'text';
    if (shapeType.includes('Picture') || shapeType.includes('Image')) return 'image';
    if (shapeType.includes('Table')) return 'table';
    if (shapeType.includes('Chart')) return 'chart';
    if (shapeType.includes('Rectangle') || shapeType.includes('Circle')) return 'shape';
    
    return 'other';
  }

  _generateShapeTags(shape) {
    const tags = [];
    
    if (shape.text) tags.push('has-text');
    if (shape.fillFormat) tags.push('has-fill');
    if (shape.geometry?.width > 400) tags.push('wide');
    if (shape.geometry?.height > 300) tags.push('tall');
    
    const category = this._categorizeShape(shape);
    tags.push(category);
    
    return tags;
  }

  _isPictureDecorative(shape) {
    // Simple heuristic to determine if picture is decorative
    const area = (shape.geometry?.width || 0) * (shape.geometry?.height || 0);
    return area < 20000; // Small images are likely decorative
  }

  /**
   * Get enrichment statistics
   */
  getStats() {
    return {
      ...this.enrichmentStats,
      successRate: this.enrichmentStats.processed > 0 ? 
        (this.enrichmentStats.enriched / this.enrichmentStats.processed) * 100 : 0
    };
  }
}

module.exports = ShapeEnricher; 