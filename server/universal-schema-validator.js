const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const fs = require('fs');
const path = require('path');

class UniversalSchemaValidator {
  constructor() {
    this.ajv = new Ajv({ 
      allErrors: true, 
      verbose: true,
      strict: false, // Allow additional properties
      removeAdditional: false,
      loadSchema: this.loadSchemaFromFile.bind(this) // Add schema loader for $ref resolution
    });
    
    // Add format support
    addFormats(this.ajv);
    
    // Load Universal PowerPoint Schema
    this.schema = null;
    this.validator = null;
    this.loadSchema();
  }

  async loadSchemaFromFile(uri) {
    // This method is called when AJV encounters a $ref
    console.log('Loading schema from URI:', uri);
    return this.schema; // Return the main schema for all references
  }

  loadSchema() {
    try {
      const schemaPath = path.join(__dirname, '..', 'universal_powerpoint_schema.json');
      console.log('📋 Loading Universal PowerPoint Schema from:', schemaPath);
      
      const schemaContent = fs.readFileSync(schemaPath, 'utf8');
      this.schema = JSON.parse(schemaContent);
      
      // Try to compile a simpler schema for presentation validation
      // Look for UniversalPresentation in definitions
      if (this.schema.definitions && this.schema.definitions.UniversalPresentation) {
        console.log('✅ Found UniversalPresentation definition in schema');
        
        // Create a self-contained schema for validation
        const presentationSchema = {
          ...this.schema.definitions.UniversalPresentation,
          definitions: this.schema.definitions // Include all definitions for $ref resolution
        };
        
        try {
          this.validator = this.ajv.compile(presentationSchema);
          console.log('✅ Universal PowerPoint Schema loaded and compiled successfully');
        } catch (compileError) {
          console.warn('⚠️ Could not compile UniversalPresentation, using basic validation:', compileError.message);
          // Create a basic validator as fallback
          this.validator = this.createBasicValidator();
        }
      } else {
        console.warn('⚠️ UniversalPresentation definition not found, creating basic validator');
        this.validator = this.createBasicValidator();
      }
      
      console.log(`📊 Schema contains ${Object.keys(this.schema.definitions || {}).length} definitions`);
      
    } catch (error) {
      console.error('❌ Failed to load Universal PowerPoint Schema:', error.message);
      this.schema = null;
      this.validator = this.createBasicValidator();
    }
  }

  createBasicValidator() {
    // Create a basic schema for presentation validation when the full schema fails
    const basicPresentationSchema = {
      type: "object",
      properties: {
        metadata: {
          type: "object",
          properties: {
            title: { type: "string" },
            author: { type: "string" },
            slideCount: { type: "number" }
          }
        },
        slideSize: {
          type: "object",
          properties: {
            width: { type: "number" },
            height: { type: "number" },
            type: { type: "string" }
          }
        },
        slides: {
          type: "array",
          items: {
            type: "object",
            properties: {
              slideId: { type: "number" },
              slideIndex: { type: "number" },
              shapes: { type: "array" }
            }
          }
        },
        masterSlides: { type: "array" },
        layoutSlides: { type: "array" },
        theme: { type: "object" }
      }
    };

    console.log('📋 Using basic presentation schema for validation');
    return this.ajv.compile(basicPresentationSchema);
  }

  /**
   * Validate a presentation data structure against Universal PowerPoint Schema
   * @param {Object} presentationData - The presentation data to validate
   * @returns {Object} - Validation result with success boolean and detailed errors
   */
  validatePresentation(presentationData) {
    const startTime = Date.now();
    
    if (!this.validator) {
      return {
        success: false,
        error: 'Schema validator not initialized',
        errors: [],
        validationTimeMs: 0
      };
    }

    try {
      // Extract the presentation structure from the data
      const presentation = presentationData?.data?.presentation;
      
      if (!presentation) {
        return {
          success: false,
          error: 'No presentation data found in data.presentation',
          errors: ['Missing data.presentation structure'],
          validationTimeMs: Date.now() - startTime,
          structure: this.analyzeStructure(presentationData)
        };
      }

      // Validate against presentation schema
      const isValid = this.validator(presentation);
      const validationTimeMs = Date.now() - startTime;

      if (isValid) {
        return {
          success: true,
          message: 'Presentation is valid according to Universal PowerPoint Schema',
          validationTimeMs,
          slideCount: presentation.slides?.length || 0,
          hasMetadata: !!presentation.metadata,
          hasTheme: !!presentation.theme,
          schemaCompliance: this.analyzeCompliance(presentation)
        };
      } else {
        return {
          success: false,
          error: 'Presentation does not comply with Universal PowerPoint Schema',
          errors: this.validator.errors?.map(error => ({
            instancePath: error.instancePath,
            schemaPath: error.schemaPath,
            keyword: error.keyword,
            message: error.message,
            data: error.data
          })) || [],
          validationTimeMs,
          structure: this.analyzeStructure(presentation),
          suggestions: this.generateSuggestions(this.validator.errors || [])
        };
      }

    } catch (error) {
      return {
        success: false,
        error: 'Validation process failed',
        exception: error.message,
        validationTimeMs: Date.now() - startTime
      };
    }
  }

  /**
   * Analyze the structure of the presentation for debugging
   */
  analyzeStructure(data) {
    const analysis = {
      hasData: !!data,
      hasPresentation: !!(data?.data?.presentation),
      topLevelKeys: data ? Object.keys(data) : [],
      presentationKeys: data?.data?.presentation ? Object.keys(data.data.presentation) : [],
      slideCount: data?.data?.presentation?.slides?.length || 0,
      metadataKeys: data?.data?.presentation?.metadata ? Object.keys(data.data.presentation.metadata) : []
    };

    return analysis;
  }

  /**
   * Analyze schema compliance level
   */
  analyzeCompliance(presentation) {
    const compliance = {
      hasMetadata: !!presentation.metadata,
      hasSlides: !!presentation.slides,
      hasMasterSlides: !!presentation.masterSlides,
      hasLayoutSlides: !!presentation.layoutSlides,
      hasTheme: !!presentation.theme,
      slideCount: presentation.slides?.length || 0,
      completeness: 0
    };

    // Calculate completeness score
    const checks = [
      compliance.hasMetadata,
      compliance.hasSlides,
      compliance.hasTheme,
      presentation.slides?.every(slide => slide.shapes?.length > 0),
      presentation.metadata?.title,
      presentation.metadata?.slideCount > 0
    ];

    compliance.completeness = (checks.filter(Boolean).length / checks.length) * 100;
    
    return compliance;
  }

  /**
   * Generate suggestions for fixing validation errors
   */
  generateSuggestions(errors) {
    const suggestions = [];

    for (const error of errors) {
      switch (error.keyword) {
        case 'required':
          suggestions.push(`Add required property: ${error.params?.missingProperty} at ${error.instancePath}`);
          break;
        case 'type':
          suggestions.push(`Fix type mismatch: expected ${error.params?.type} at ${error.instancePath}`);
          break;
        case 'enum':
          suggestions.push(`Use valid enum value. Allowed: ${error.params?.allowedValues?.join(', ')} at ${error.instancePath}`);
          break;
        case 'format':
          suggestions.push(`Fix format: expected ${error.params?.format} at ${error.instancePath}`);
          break;
        default:
          suggestions.push(`Fix ${error.keyword} validation error at ${error.instancePath}: ${error.message}`);
      }
    }

    return suggestions;
  }

  /**
   * Get schema information for debugging
   */
  getSchemaInfo() {
    if (!this.schema) {
      return { 
        loaded: false,
        validatorType: 'none'
      };
    }

    return {
      loaded: true,
      title: this.schema.title || 'Universal PowerPoint Schema',
      description: this.schema.description || 'Schema for PowerPoint presentations',
      version: this.schema.$id || 'unknown',
      definitionCount: Object.keys(this.schema.definitions || {}).length,
      mainDefinitions: Object.keys(this.schema.definitions || {}).slice(0, 10),
      universalPresentationProperties: this.schema.definitions?.UniversalPresentation?.properties ? 
        Object.keys(this.schema.definitions.UniversalPresentation.properties) : [],
      validatorType: this.schema.definitions?.UniversalPresentation ? 'full' : 'basic'
    };
  }

  /**
   * Validate and auto-fix common issues
   */
  validateAndFix(presentationData) {
    const validation = this.validatePresentation(presentationData);
    
    if (!validation.success && validation.errors) {
      console.log('🔧 Attempting to auto-fix validation errors...');
      
      // Clone the data to avoid mutations
      const fixedData = JSON.parse(JSON.stringify(presentationData));
      let fixed = false;

      for (const error of validation.errors) {
        if (error.keyword === 'required' && error.params?.missingProperty) {
          console.log(`🔧 Auto-fixing missing required property: ${error.params.missingProperty}`);
          
          // Add default values for common missing properties
          const target = this.getNestedProperty(fixedData, error.instancePath);
          if (target && error.params.missingProperty) {
            switch (error.params.missingProperty) {
              case 'slideSize':
                target.slideSize = { width: 1920, height: 1080, type: "OnScreen16x9" };
                fixed = true;
                break;
              case 'metadata':
                target.metadata = { 
                  title: "Generated Presentation", 
                  author: "Luna AI",
                  slideCount: target.slides?.length || 0
                };
                fixed = true;
                break;
              case 'slides':
                target.slides = [];
                fixed = true;
                break;
            }
          }
        }
      }

      if (fixed) {
        console.log('✅ Auto-fixed validation errors, re-validating...');
        return {
          originalValidation: validation,
          fixedData,
          revalidation: this.validatePresentation(fixedData)
        };
      }
    }

    return { originalValidation: validation };
  }

  getNestedProperty(obj, path) {
    if (!path) return obj;
    return path.split('/').filter(Boolean).reduce((current, key) => current?.[key], obj);
  }
}

// Export singleton instance
module.exports = new UniversalSchemaValidator(); 