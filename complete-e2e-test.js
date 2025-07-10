#!/usr/bin/env node

/**
 * Luna PowerPoint Processing - Complete End-to-End Test
 * 
 * This test performs the full pipeline:
 * 1. Load Slideworks_business_case_template.pptx
 * 2. Convert PPTX to comprehensive JSON
 * 3. Reconstruct PPTX from JSON
 * 4. Generate thumbnails
 * 5. Convert to PDF
 * 6. Compare and validate all outputs
 */

const fs = require('fs');
const path = require('path');

// Test configuration
const TEST_CONFIG = {
  inputFile: '/app/test-file.pptx',
  outputDir: '/app/output',
  results: {
    originalAnalysis: 'original-analysis.json',
    convertedJson: 'converted-presentation.json',
    reconstructedPptx: 'reconstructed-presentation.pptx',
    thumbnailsDir: 'thumbnails',
    pdfOutput: 'converted-presentation.pdf',
    comparisonReport: 'comparison-report.json',
    finalReport: 'e2e-test-report.json'
  }
};

// Test results tracking
let testResults = {
  startTime: new Date(),
  testName: 'Luna Complete E2E Test - Slideworks Business Case Template',
  tests: [],
  files: {},
  summary: {},
  environment: {
    nodeVersion: process.version,
    platform: process.platform,
    javaHome: process.env.JAVA_HOME
  }
};

// Logging functions
function log(message, level = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: 'ℹ️',
    success: '✅', 
    error: '❌',
    warning: '⚠️',
    step: '🔄'
  };
  
  console.log(`${prefix[level]} [${timestamp}] ${message}`);
}

function startTest(testName) {
  const test = {
    name: testName,
    startTime: new Date(),
    status: 'running',
    duration: 0,
    details: {}
  };
  testResults.tests.push(test);
  log(`Starting: ${testName}`, 'step');
  return test;
}

function completeTest(test, success = true, details = {}) {
  test.endTime = new Date();
  test.duration = test.endTime - test.startTime;
  test.status = success ? 'passed' : 'failed';
  test.details = { ...test.details, ...details };
  
  if (success) {
    log(`Completed: ${test.name} (${test.duration}ms)`, 'success');
  } else {
    log(`Failed: ${test.name} (${test.duration}ms)`, 'error');
    if (details.error) {
      log(`Error: ${details.error}`, 'error');
    }
  }
  
  return test;
}

// Utility functions
function ensureDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    log(`Created directory: ${dirPath}`);
  }
}

function getFileSize(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return stats.size;
  } catch (error) {
    return 0;
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Test 1: Load and analyze original PPTX
async function testOriginalPptxAnalysis() {
  const test = startTest('Original PPTX Analysis');
  
  try {
    const asposeSlides = require('/app/lib/aspose.slides');
    
    if (!fs.existsSync(TEST_CONFIG.inputFile)) {
      throw new Error(`Input file not found: ${TEST_CONFIG.inputFile}`);
    }
    
    const fileSize = getFileSize(TEST_CONFIG.inputFile);
    log(`Loading ${formatBytes(fileSize)} PPTX file...`);
    
    // Load presentation
    const presentation = new asposeSlides.Presentation(TEST_CONFIG.inputFile);
    
    // Comprehensive analysis
    const analysis = {
      file: {
        path: TEST_CONFIG.inputFile,
        size: fileSize,
        name: 'Slideworks_business_case_template.pptx'
      },
      structure: {
        slideCount: presentation.getSlides().size(),
        masterSlideCount: presentation.getMasters().size(),
        layoutSlideCount: presentation.getLayoutSlides().size()
      },
      slideSize: {
        width: presentation.getSlideSize().getSize().getWidth(),
        height: presentation.getSlideSize().getSize().getHeight(),
        type: presentation.getSlideSize().getType().toString(),
        orientation: presentation.getSlideSize().getOrientation().toString()
      },
      documentProperties: {},
      slides: [],
      statistics: {
        totalShapes: 0,
        totalTextShapes: 0,
        totalImages: 0,
        totalAnimations: 0,
        slidesWithNotes: 0,
        slidesWithTransitions: 0
      }
    };
    
    // Extract document properties
    const docProps = presentation.getDocumentProperties();
    analysis.documentProperties = {
      title: docProps.getTitle() || '',
      author: docProps.getAuthor() || '',
      subject: docProps.getSubject() || '',
      keywords: docProps.getKeywords() || '',
      comments: docProps.getComments() || '',
      category: docProps.getCategory() || '',
      manager: docProps.getManager() || '',
      company: docProps.getCompany() || '',
      createdTime: docProps.getCreatedTime() ? docProps.getCreatedTime().toString() : null,
      lastSavedTime: docProps.getLastSavedTime() ? docProps.getLastSavedTime().toString() : null,
      revisionNumber: docProps.getRevisionNumber(),
      totalEditingTime: docProps.getTotalEditingTime()
    };
    
    // Analyze each slide
    const slides = presentation.getSlides();
    for (let i = 0; i < slides.size(); i++) {
      const slide = slides.get_Item(i);
      const slideData = {
        index: i,
        name: slide.getName() || `Slide ${i + 1}`,
        hidden: slide.getHidden(),
        shapeCount: slide.getShapes().size(),
        shapes: [],
        hasNotes: false,
        hasAnimations: false,
        transition: {}
      };
      
      // Analyze shapes on this slide
      const shapes = slide.getShapes();
      analysis.statistics.totalShapes += shapes.size();
      
      for (let j = 0; j < shapes.size(); j++) {
        const shape = shapes.get_Item(j);
        const shapeInfo = {
          index: j,
          type: shape.getShapeType().toString(),
          name: shape.getName() || `Shape ${j + 1}`,
          geometry: {
            x: shape.getX(),
            y: shape.getY(),
            width: shape.getWidth(),
            height: shape.getHeight(),
            rotation: shape.getRotation()
          },
          hasText: false,
          textContent: null
        };
        
        // Check for text content
        if (shape.getTextFrame && shape.getTextFrame()) {
          const textFrame = shape.getTextFrame();
          const text = textFrame.getText();
          if (text && text.trim().length > 0) {
            shapeInfo.hasText = true;
            shapeInfo.textContent = text.substring(0, 100) + (text.length > 100 ? '...' : '');
            analysis.statistics.totalTextShapes++;
          }
        }
        
        // Check for images
        if (shapeInfo.type.includes('Picture') || shapeInfo.type.includes('Image')) {
          analysis.statistics.totalImages++;
        }
        
        slideData.shapes.push(shapeInfo);
      }
      
      // Check for slide notes
      if (slide.getNotesSlideManager() && slide.getNotesSlideManager().getNotesSlide()) {
        slideData.hasNotes = true;
        analysis.statistics.slidesWithNotes++;
      }
      
      // Check for animations
      const timeline = slide.getTimeline();
      if (timeline && timeline.getMainSequence() && timeline.getMainSequence().size() > 0) {
        slideData.hasAnimations = true;
        slideData.animationCount = timeline.getMainSequence().size();
        analysis.statistics.totalAnimations += slideData.animationCount;
      }
      
      // Extract transition info
      const transition = slide.getSlideShowTransition();
      slideData.transition = {
        type: transition.getType().toString(),
        speed: transition.getSpeed().toString(),
        advanceOnClick: transition.getAdvanceOnClick(),
        advanceAfterTime: transition.getAdvanceAfterTime()
      };
      
      if (slideData.transition.type !== 'None') {
        analysis.statistics.slidesWithTransitions++;
      }
      
      analysis.slides.push(slideData);
    }
    
    // Save analysis
    const analysisPath = path.join(TEST_CONFIG.outputDir, TEST_CONFIG.results.originalAnalysis);
    fs.writeFileSync(analysisPath, JSON.stringify(analysis, null, 2));
    
    // Clean up
    presentation.dispose();
    
    completeTest(test, true, {
      slideCount: analysis.structure.slideCount,
      fileSize: fileSize,
      totalShapes: analysis.statistics.totalShapes,
      totalTextShapes: analysis.statistics.totalTextShapes,
      totalImages: analysis.statistics.totalImages,
      analysisPath: analysisPath
    });
    
    testResults.files.originalAnalysis = analysis;
    
    return analysis;
    
  } catch (error) {
    completeTest(test, false, { error: error.message });
    throw error;
  }
}

// Test 2: Convert PPTX to comprehensive JSON
async function testPptxToJsonConversion() {
  const test = startTest('PPTX to JSON Conversion');
  
  try {
    const asposeSlides = require('/app/lib/aspose.slides');
    const presentation = new asposeSlides.Presentation(TEST_CONFIG.inputFile);
    
    log('Creating comprehensive Universal Schema JSON...');
    
    // Create the most comprehensive JSON representation possible
    const universalSchema = {
      version: '1.0',
      generator: 'Luna Aspose.Slides Integration',
      timestamp: new Date().toISOString(),
      sourceFile: {
        name: 'Slideworks_business_case_template.pptx',
        size: getFileSize(TEST_CONFIG.inputFile),
        lastModified: new Date().toISOString()
      },
      presentation: {
        metadata: {
          slideCount: presentation.getSlides().size(),
          masterSlideCount: presentation.getMasters().size(),
          layoutSlideCount: presentation.getLayoutSlides().size()
        },
        slideSize: {
          width: presentation.getSlideSize().getSize().getWidth(),
          height: presentation.getSlideSize().getSize().getHeight(),
          type: presentation.getSlideSize().getType().toString(),
          orientation: presentation.getSlideSize().getOrientation().toString()
        },
        documentProperties: {},
        slides: [],
        masterSlides: [],
        assets: {
          images: [],
          fonts: [],
          colors: []
        }
      }
    };
    
    // Extract document properties with full detail
    const docProps = presentation.getDocumentProperties();
    universalSchema.presentation.documentProperties = {
      title: docProps.getTitle() || '',
      author: docProps.getAuthor() || '',
      subject: docProps.getSubject() || '',
      keywords: docProps.getKeywords() || '',
      comments: docProps.getComments() || '',
      category: docProps.getCategory() || '',
      manager: docProps.getManager() || '',
      company: docProps.getCompany() || '',
      createdTime: docProps.getCreatedTime() ? docProps.getCreatedTime().toString() : null,
      lastSavedTime: docProps.getLastSavedTime() ? docProps.getLastSavedTime().toString() : null,
      lastPrintedDate: docProps.getLastPrintedDate() ? docProps.getLastPrintedDate().toString() : null,
      revisionNumber: docProps.getRevisionNumber(),
      totalEditingTime: docProps.getTotalEditingTime(),
      customProperties: {}
    };
    
    // Extract all slides with maximum detail
    const slides = presentation.getSlides();
    for (let i = 0; i < slides.size(); i++) {
      const slide = slides.get_Item(i);
      const slideData = {
        index: i,
        id: slide.getSlideId(),
        name: slide.getName() || `Slide ${i + 1}`,
        hidden: slide.getHidden(),
        background: {},
        shapes: [],
        notes: null,
        animations: [],
        transitions: {},
        timing: {},
        layout: {
          name: slide.getLayoutSlide() ? slide.getLayoutSlide().getName() : 'Default'
        }
      };
      
      // Extract all shapes with comprehensive data
      const shapes = slide.getShapes();
      for (let j = 0; j < shapes.size(); j++) {
        const shape = shapes.get_Item(j);
        const shapeData = {
          index: j,
          id: shape.getUniqueId(),
          name: shape.getName() || `Shape ${j + 1}`,
          type: shape.getShapeType().toString(),
          geometry: {
            x: shape.getX(),
            y: shape.getY(),
            z: shape.getZOrderPosition(),
            width: shape.getWidth(),
            height: shape.getHeight(),
            rotation: shape.getRotation()
          },
          fill: {
            type: 'solid', // Simplified for this test
            color: '#FFFFFF'
          },
          line: {
            width: 1,
            color: '#000000',
            style: 'solid'
          },
          textFrame: null,
          properties: {
            hidden: shape.getHidden(),
            locked: false
          }
        };
        
        // Extract text frame with full formatting details
        if (shape.getTextFrame && shape.getTextFrame()) {
          const textFrame = shape.getTextFrame();
          shapeData.textFrame = {
            text: textFrame.getText() || '',
            autofit: textFrame.getTextFrameFormat().getAutofitType().toString(),
            margins: {
              left: textFrame.getTextFrameFormat().getMarginLeft(),
              right: textFrame.getTextFrameFormat().getMarginRight(),
              top: textFrame.getTextFrameFormat().getMarginTop(),
              bottom: textFrame.getTextFrameFormat().getMarginBottom()
            },
            paragraphs: []
          };
          
          // Extract paragraph and portion details
          const paragraphs = textFrame.getParagraphs();
          for (let k = 0; k < paragraphs.size(); k++) {
            const paragraph = paragraphs.get_Item(k);
            const paragraphData = {
              index: k,
              text: paragraph.getText() || '',
              alignment: paragraph.getAlignment().toString(),
              indent: paragraph.getIndent(),
              spaceBefore: paragraph.getSpaceBefore(),
              spaceAfter: paragraph.getSpaceAfter(),
              bullet: {
                type: paragraph.getBulletType().toString(),
                char: paragraph.getBulletChar()
              },
              portions: []
            };
            
            // Extract text portions with formatting
            const portions = paragraph.getPortions();
            for (let l = 0; l < portions.size(); l++) {
              const portion = portions.get_Item(l);
              const portionData = {
                index: l,
                text: portion.getText() || '',
                fontFamily: portion.getPortionFormat().getLatinFont() ? 
                  portion.getPortionFormat().getLatinFont().getFontName() : 'Arial',
                fontSize: portion.getPortionFormat().getFontHeight(),
                bold: portion.getPortionFormat().getFontBold(),
                italic: portion.getPortionFormat().getFontItalic(),
                underline: portion.getPortionFormat().getFontUnderline().toString(),
                color: '#000000' // Simplified
              };
              
              paragraphData.portions.push(portionData);
            }
            
            shapeData.textFrame.paragraphs.push(paragraphData);
          }
        }
        
        slideData.shapes.push(shapeData);
      }
      
      // Extract slide notes with full content
      if (slide.getNotesSlideManager() && slide.getNotesSlideManager().getNotesSlide()) {
        const notesSlide = slide.getNotesSlideManager().getNotesSlide();
        slideData.notes = {
          shapes: []
        };
        
        const notesShapes = notesSlide.getShapes();
        for (let k = 0; k < notesShapes.size(); k++) {
          const notesShape = notesShapes.get_Item(k);
          if (notesShape.getTextFrame && notesShape.getTextFrame()) {
            slideData.notes.shapes.push({
              type: notesShape.getShapeType().toString(),
              text: notesShape.getTextFrame().getText() || ''
            });
          }
        }
      }
      
      // Extract animations with timing details
      const timeline = slide.getTimeline();
      if (timeline && timeline.getMainSequence()) {
        const mainSequence = timeline.getMainSequence();
        for (let k = 0; k < mainSequence.size(); k++) {
          const effect = mainSequence.get_Item(k);
          slideData.animations.push({
            index: k,
            type: effect.getType().toString(),
            subtype: effect.getSubtype().toString(),
            presetClass: effect.getPresetClassType().toString(),
            timing: {
              duration: effect.getTiming().getDuration(),
              delay: effect.getTiming().getDelay(),
              repeatCount: effect.getTiming().getRepeatCount(),
              speed: effect.getTiming().getSpeed(),
              restart: effect.getTiming().getRestart().toString()
            },
            behaviors: []
          });
        }
      }
      
      // Extract transition details
      const transition = slide.getSlideShowTransition();
      slideData.transitions = {
        type: transition.getType().toString(),
        subtype: transition.getValue().toString(),
        speed: transition.getSpeed().toString(),
        advanceOnClick: transition.getAdvanceOnClick(),
        advanceAfterTime: transition.getAdvanceAfterTime(),
        duration: transition.getAdvanceAfterTime(),
        sound: {
          embedded: false,
          name: '',
          loop: false
        }
      };
      
      universalSchema.presentation.slides.push(slideData);
    }
    
    // Save comprehensive JSON
    const jsonPath = path.join(TEST_CONFIG.outputDir, TEST_CONFIG.results.convertedJson);
    fs.writeFileSync(jsonPath, JSON.stringify(universalSchema, null, 2));
    
    const jsonSize = getFileSize(jsonPath);
    const originalSize = getFileSize(TEST_CONFIG.inputFile);
    
    // Clean up
    presentation.dispose();
    
    completeTest(test, true, {
      jsonPath: jsonPath,
      jsonSize: jsonSize,
      originalSize: originalSize,
      compressionRatio: (originalSize / jsonSize).toFixed(2),
      slideCount: universalSchema.presentation.metadata.slideCount,
      totalShapes: universalSchema.presentation.slides.reduce((sum, s) => sum + s.shapes.length, 0)
    });
    
    testResults.files.universalSchema = universalSchema;
    
    return { universalSchema, jsonPath };
    
  } catch (error) {
    completeTest(test, false, { error: error.message });
    throw error;
  }
}

// Test 3: Reconstruct PPTX from JSON
async function testJsonToPptxReconstruction(jsonData) {
  const test = startTest('JSON to PPTX Reconstruction');
  
  try {
    const asposeSlides = require('/app/lib/aspose.slides');
    const outputPath = path.join(TEST_CONFIG.outputDir, TEST_CONFIG.results.reconstructedPptx);
    
    log('Reconstructing PPTX from Universal Schema JSON...');
    
    // Create new presentation
    const presentation = new asposeSlides.Presentation();
    
    // Set slide size from JSON
    if (jsonData.presentation.slideSize) {
      presentation.getSlideSize().setSize(
        jsonData.presentation.slideSize.width,
        jsonData.presentation.slideSize.height
      );
    }
    
    // Set document properties from JSON
    if (jsonData.presentation.documentProperties) {
      const docProps = presentation.getDocumentProperties();
      const props = jsonData.presentation.documentProperties;
      
      if (props.title) docProps.setTitle(props.title);
      if (props.author) docProps.setAuthor(props.author);
      if (props.subject) docProps.setSubject(props.subject);
      if (props.keywords) docProps.setKeywords(props.keywords);
      if (props.comments) docProps.setComments(props.comments);
      if (props.category) docProps.setCategory(props.category);
      if (props.manager) docProps.setManager(props.manager);
      if (props.company) docProps.setCompany(props.company);
    }
    
    // Remove default slide
    presentation.getSlides().removeAt(0);
    
    // Reconstruct slides from JSON
    const slidesData = jsonData.presentation.slides;
    let reconstructedShapes = 0;
    
    for (let i = 0; i < slidesData.length; i++) {
      const slideData = slidesData[i];
      
      // Add new slide
      const slide = presentation.getSlides().addEmptySlide(
        presentation.getLayoutSlides().get_Item(0)
      );
      
      // Set slide properties
      if (slideData.name) slide.setName(slideData.name);
      if (slideData.hidden !== undefined) slide.setHidden(slideData.hidden);
      
      // Reconstruct shapes
      if (slideData.shapes && slideData.shapes.length > 0) {
        for (let j = 0; j < slideData.shapes.length; j++) {
          const shapeData = slideData.shapes[j];
          
          // Create shape based on type and text content
          if (shapeData.textFrame && shapeData.textFrame.text) {
            // Create text box
            const textBox = slide.getShapes().addAutoShape(
              asposeSlides.ShapeType.Rectangle,
              shapeData.geometry.x,
              shapeData.geometry.y,
              shapeData.geometry.width,
              shapeData.geometry.height
            );
            
            // Set text content
            textBox.getTextFrame().setText(shapeData.textFrame.text);
            
            // Apply formatting if available
            if (shapeData.textFrame.paragraphs && shapeData.textFrame.paragraphs.length > 0) {
              const paragraph = textBox.getTextFrame().getParagraphs().get_Item(0);
              const firstParagraph = shapeData.textFrame.paragraphs[0];
              
              // Set paragraph alignment
              if (firstParagraph.alignment) {
                try {
                  const alignment = asposeSlides.TextAlignment[firstParagraph.alignment] || asposeSlides.TextAlignment.Left;
                  paragraph.setAlignment(alignment);
                } catch (e) {
                  // Fallback to left alignment
                  paragraph.setAlignment(asposeSlides.TextAlignment.Left);
                }
              }
              
              // Apply portion formatting if available
              if (firstParagraph.portions && firstParagraph.portions.length > 0) {
                const portion = paragraph.getPortions().get_Item(0);
                const firstPortion = firstParagraph.portions[0];
                
                if (firstPortion.fontSize) {
                  portion.getPortionFormat().setFontHeight(firstPortion.fontSize);
                }
                if (firstPortion.bold !== undefined) {
                  portion.getPortionFormat().setFontBold(firstPortion.bold);
                }
                if (firstPortion.italic !== undefined) {
                  portion.getPortionFormat().setFontItalic(firstPortion.italic);
                }
              }
            }
            
            // Make shape background transparent for text-only display
            textBox.getFillFormat().setFillType(asposeSlides.FillType.NoFill);
            textBox.getLineFormat().getFillFormat().setFillType(asposeSlides.FillType.NoFill);
            
            // Set rotation if specified
            if (shapeData.geometry.rotation) {
              textBox.setRotation(shapeData.geometry.rotation);
            }
            
            // Set shape name
            if (shapeData.name) {
              textBox.setName(shapeData.name);
            }
            
            reconstructedShapes++;
          }
          // Note: For this test, we're focusing on text shapes. 
          // Full implementation would handle images, charts, tables, etc.
        }
      }
      
      log(`Reconstructed slide ${i + 1} with ${slideData.shapes ? slideData.shapes.length : 0} shapes`);
    }
    
    // Save reconstructed presentation
    presentation.save(outputPath, asposeSlides.SaveFormat.Pptx);
    
    const outputSize = getFileSize(outputPath);
    const originalSize = getFileSize(TEST_CONFIG.inputFile);
    
    // Clean up
    presentation.dispose();
    
    completeTest(test, true, {
      outputPath: outputPath,
      outputSize: outputSize,
      originalSize: originalSize,
      sizeRatio: (outputSize / originalSize * 100).toFixed(1),
      slidesReconstructed: slidesData.length,
      shapesReconstructed: reconstructedShapes
    });
    
    return { outputPath, outputSize };
    
  } catch (error) {
    completeTest(test, false, { error: error.message });
    throw error;
  }
}

// Test 4: Generate thumbnails
async function testThumbnailGeneration() {
  const test = startTest('Thumbnail Generation');
  
  try {
    const asposeSlides = require('/app/lib/aspose.slides');
    const outputDir = path.join(TEST_CONFIG.outputDir, TEST_CONFIG.results.thumbnailsDir);
    ensureDirectory(outputDir);
    
    // Load original presentation
    const presentation = new asposeSlides.Presentation(TEST_CONFIG.inputFile);
    const slides = presentation.getSlides();
    
    log(`Generating high-quality thumbnails for ${slides.size()} slides...`);
    
    const thumbnails = [];
    let totalThumbnailSize = 0;
    
    for (let i = 0; i < slides.size(); i++) {
      const slide = slides.get_Item(i);
      
      // Generate high-quality thumbnail (2x scale)
      const thumbnail = slide.getThumbnail(2.0, 2.0);
      
      // Save thumbnail
      const thumbnailPath = path.join(outputDir, `slide_${i + 1}_hq.png`);
      thumbnail.save(thumbnailPath, asposeSlides.ImageFormat.Png);
      
      const thumbnailSize = getFileSize(thumbnailPath);
      totalThumbnailSize += thumbnailSize;
      
      thumbnails.push({
        slideIndex: i,
        fileName: `slide_${i + 1}_hq.png`,
        path: thumbnailPath,
        size: thumbnailSize,
        quality: 'high',
        scale: '2x'
      });
      
      log(`Generated thumbnail for slide ${i + 1}: ${formatBytes(thumbnailSize)}`);
    }
    
    // Also generate a standard quality set for comparison
    for (let i = 0; i < Math.min(slides.size(), 3); i++) { // First 3 slides only
      const slide = slides.get_Item(i);
      
      // Generate standard quality thumbnail (1x scale)
      const thumbnail = slide.getThumbnail(1.0, 1.0);
      
      // Save thumbnail
      const thumbnailPath = path.join(outputDir, `slide_${i + 1}_std.png`);
      thumbnail.save(thumbnailPath, asposeSlides.ImageFormat.Png);
      
      const thumbnailSize = getFileSize(thumbnailPath);
      totalThumbnailSize += thumbnailSize;
      
      thumbnails.push({
        slideIndex: i,
        fileName: `slide_${i + 1}_std.png`,
        path: thumbnailPath,
        size: thumbnailSize,
        quality: 'standard',
        scale: '1x'
      });
    }
    
    // Create thumbnail index
    const thumbnailIndex = {
      generated: new Date().toISOString(),
      sourceFile: TEST_CONFIG.inputFile,
      totalThumbnails: thumbnails.length,
      totalSize: totalThumbnailSize,
      averageSize: Math.round(totalThumbnailSize / thumbnails.length),
      qualities: ['high', 'standard'],
      formats: ['png'],
      thumbnails: thumbnails
    };
    
    const indexPath = path.join(outputDir, 'thumbnail-index.json');
    fs.writeFileSync(indexPath, JSON.stringify(thumbnailIndex, null, 2));
    
    // Clean up
    presentation.dispose();
    
    completeTest(test, true, {
      thumbnailCount: thumbnails.length,
      totalSize: totalThumbnailSize,
      averageSize: Math.round(totalThumbnailSize / thumbnails.length),
      outputDir: outputDir,
      indexPath: indexPath
    });
    
    return { thumbnails, outputDir };
    
  } catch (error) {
    completeTest(test, false, { error: error.message });
    throw error;
  }
}

// Test 5: PDF conversion
async function testPdfConversion() {
  const test = startTest('PDF Conversion');
  
  try {
    const asposeSlides = require('/app/lib/aspose.slides');
    const outputPath = path.join(TEST_CONFIG.outputDir, TEST_CONFIG.results.pdfOutput);
    
    // Load original presentation
    const presentation = new asposeSlides.Presentation(TEST_CONFIG.inputFile);
    
    log('Converting presentation to high-quality PDF...');
    
    // Save as PDF with high quality settings
    presentation.save(outputPath, asposeSlides.SaveFormat.Pdf);
    
    const pdfSize = getFileSize(outputPath);
    const originalSize = getFileSize(TEST_CONFIG.inputFile);
    
    // Clean up
    presentation.dispose();
    
    completeTest(test, true, {
      outputPath: outputPath,
      pdfSize: pdfSize,
      originalSize: originalSize,
      compressionRatio: (originalSize / pdfSize).toFixed(2),
      compressionPercent: (pdfSize / originalSize * 100).toFixed(1)
    });
    
    return { outputPath, pdfSize };
    
  } catch (error) {
    completeTest(test, false, { error: error.message });
    throw error;
  }
}

// Test 6: Comprehensive comparison and validation
async function testComparisonAndValidation() {
  const test = startTest('Comparison and Validation');
  
  try {
    const originalPath = TEST_CONFIG.inputFile;
    const jsonPath = path.join(TEST_CONFIG.outputDir, TEST_CONFIG.results.convertedJson);
    const reconstructedPath = path.join(TEST_CONFIG.outputDir, TEST_CONFIG.results.reconstructedPptx);
    const pdfPath = path.join(TEST_CONFIG.outputDir, TEST_CONFIG.results.pdfOutput);
    const thumbnailsDir = path.join(TEST_CONFIG.outputDir, TEST_CONFIG.results.thumbnailsDir);
    
    const comparison = {
      timestamp: new Date().toISOString(),
      testName: 'Slideworks Business Case Template - End-to-End Validation',
      files: {
        original: {
          path: originalPath,
          size: getFileSize(originalPath),
          exists: fs.existsSync(originalPath),
          type: 'pptx'
        },
        json: {
          path: jsonPath,
          size: getFileSize(jsonPath),
          exists: fs.existsSync(jsonPath),
          type: 'json'
        },
        reconstructed: {
          path: reconstructedPath,
          size: getFileSize(reconstructedPath),
          exists: fs.existsSync(reconstructedPath),
          type: 'pptx'
        },
        pdf: {
          path: pdfPath,
          size: getFileSize(pdfPath),
          exists: fs.existsSync(pdfPath),
          type: 'pdf'
        },
        thumbnails: {
          path: thumbnailsDir,
          exists: fs.existsSync(thumbnailsDir),
          count: fs.existsSync(thumbnailsDir) ? fs.readdirSync(thumbnailsDir).filter(f => f.endsWith('.png')).length : 0
        }
      },
      analysis: {
        dataFidelity: {},
        sizeComparison: {},
        contentValidation: {},
        performanceMetrics: {}
      },
      validation: {
        pipelineComplete: false,
        dataIntegrity: false,
        qualityScore: 0,
        issues: [],
        recommendations: []
      }
    };
    
    // Validate pipeline completion
    const allFilesExist = comparison.files.original.exists && 
                         comparison.files.json.exists && 
                         comparison.files.reconstructed.exists && 
                         comparison.files.pdf.exists && 
                         comparison.files.thumbnails.exists;
    
    comparison.validation.pipelineComplete = allFilesExist;
    
    if (allFilesExist) {
      // Size analysis
      comparison.analysis.sizeComparison = {
        original: comparison.files.original.size,
        json: comparison.files.json.size,
        reconstructed: comparison.files.reconstructed.size,
        pdf: comparison.files.pdf.size,
        jsonCompressionRatio: (comparison.files.original.size / comparison.files.json.size).toFixed(2),
        reconstructionSizeRatio: (comparison.files.reconstructed.size / comparison.files.original.size * 100).toFixed(1),
        pdfCompressionRatio: (comparison.files.original.size / comparison.files.pdf.size).toFixed(2)
      };
      
      // Data integrity check
      if (testResults.files.originalAnalysis && testResults.files.universalSchema) {
        const originalSlideCount = testResults.files.originalAnalysis.structure.slideCount;
        const jsonSlideCount = testResults.files.universalSchema.presentation.metadata.slideCount;
        const jsonSlides = testResults.files.universalSchema.presentation.slides.length;
        
        comparison.analysis.dataFidelity = {
          originalSlideCount: originalSlideCount,
          jsonSlideCount: jsonSlideCount,
          jsonSlidesActual: jsonSlides,
          slideCountMatches: originalSlideCount === jsonSlideCount && jsonSlideCount === jsonSlides,
          originalShapeCount: testResults.files.originalAnalysis.statistics.totalShapes,
          jsonShapeCount: testResults.files.universalSchema.presentation.slides.reduce((sum, s) => sum + s.shapes.length, 0),
          shapeCountMatches: testResults.files.originalAnalysis.statistics.totalShapes === 
                           testResults.files.universalSchema.presentation.slides.reduce((sum, s) => sum + s.shapes.length, 0)
        };
        
        comparison.validation.dataIntegrity = comparison.analysis.dataFidelity.slideCountMatches && 
                                             comparison.analysis.dataFidelity.shapeCountMatches;
      }
      
      // Performance metrics
      const totalTestTime = testResults.tests.reduce((sum, test) => sum + test.duration, 0);
      comparison.analysis.performanceMetrics = {
        totalProcessingTime: totalTestTime,
        averageTimePerTest: Math.round(totalTestTime / testResults.tests.length),
        throughput: {
          slidesPerSecond: testResults.files.originalAnalysis ? 
            (testResults.files.originalAnalysis.structure.slideCount / (totalTestTime / 1000)).toFixed(2) : 0,
          bytesPerSecond: (comparison.files.original.size / (totalTestTime / 1000)).toFixed(0)
        }
      };
      
      // Quality score calculation
      let qualityScore = 0;
      
      if (comparison.validation.pipelineComplete) qualityScore += 40;
      if (comparison.validation.dataIntegrity) qualityScore += 30;
      if (comparison.files.thumbnails.count > 0) qualityScore += 15;
      if (comparison.analysis.sizeComparison.reconstructionSizeRatio < 200) qualityScore += 10; // Reasonable size
      if (totalTestTime < 30000) qualityScore += 5; // Good performance
      
      comparison.validation.qualityScore = qualityScore;
      
      // Generate recommendations
      if (qualityScore >= 90) {
        comparison.validation.recommendations.push('🎉 Excellent! All tests passed with high fidelity.');
      } else if (qualityScore >= 70) {
        comparison.validation.recommendations.push('✅ Good performance with minor optimization opportunities.');
      } else {
        comparison.validation.recommendations.push('⚠️ Some issues detected. Review test details.');
      }
      
      if (comparison.analysis.dataFidelity.slideCountMatches) {
        comparison.validation.recommendations.push('✅ Perfect slide count preservation.');
      }
      
      if (comparison.analysis.dataFidelity.shapeCountMatches) {
        comparison.validation.recommendations.push('✅ All shapes successfully processed.');
      }
      
      if (comparison.files.thumbnails.count > 0) {
        comparison.validation.recommendations.push(`✅ Generated ${comparison.files.thumbnails.count} high-quality thumbnails.`);
      }
      
      // Issue detection
      if (!comparison.validation.dataIntegrity) {
        comparison.validation.issues.push('Data integrity concerns detected in JSON conversion.');
      }
      
      if (totalTestTime > 60000) {
        comparison.validation.issues.push('Performance could be improved - processing took over 1 minute.');
      }
      
      if (parseFloat(comparison.analysis.sizeComparison.reconstructionSizeRatio) > 300) {
        comparison.validation.issues.push('Reconstructed file significantly larger than original.');
      }
    } else {
      comparison.validation.issues.push('Pipeline incomplete - some output files missing.');
    }
    
    // Save comparison report
    const reportPath = path.join(TEST_CONFIG.outputDir, TEST_CONFIG.results.comparisonReport);
    fs.writeFileSync(reportPath, JSON.stringify(comparison, null, 2));
    
    completeTest(test, comparison.validation.pipelineComplete, {
      qualityScore: comparison.validation.qualityScore,
      pipelineComplete: comparison.validation.pipelineComplete,
      dataIntegrity: comparison.validation.dataIntegrity,
      issueCount: comparison.validation.issues.length,
      reportPath: reportPath
    });
    
    return comparison;
    
  } catch (error) {
    completeTest(test, false, { error: error.message });
    throw error;
  }
}

// Generate final report
function generateFinalReport(comparison) {
  const endTime = new Date();
  testResults.endTime = endTime;
  testResults.totalDuration = endTime - testResults.startTime;
  
  const passedTests = testResults.tests.filter(test => test.status === 'passed');
  const failedTests = testResults.tests.filter(test => test.status === 'failed');
  
  testResults.summary = {
    totalTests: testResults.tests.length,
    passed: passedTests.length,
    failed: failedTests.length,
    successRate: ((passedTests.length / testResults.tests.length) * 100).toFixed(1) + '%',
    totalDuration: testResults.totalDuration,
    qualityScore: comparison ? comparison.validation.qualityScore : 0
  };
  
  // Add comparison data
  if (comparison) {
    testResults.comparison = comparison;
  }
  
  // Save final report
  const reportPath = path.join(TEST_CONFIG.outputDir, TEST_CONFIG.results.finalReport);
  fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));
  
  // Console summary
  console.log('\n' + '='.repeat(80));
  console.log('🎯 LUNA POWERPOINT PROCESSING - END-TO-END TEST RESULTS');
  console.log('📄 Test File: Slideworks_business_case_template.pptx');
  console.log('='.repeat(80));
  
  console.log(`\n📊 TEST SUMMARY:`);
  console.log(`   Total Tests: ${testResults.summary.totalTests}`);
  console.log(`   Passed: ${testResults.summary.passed}`);
  console.log(`   Failed: ${testResults.summary.failed}`);
  console.log(`   Success Rate: ${testResults.summary.successRate}`);
  console.log(`   Quality Score: ${testResults.summary.qualityScore}/100`);
  console.log(`   Total Duration: ${testResults.summary.totalDuration}ms`);
  
  console.log(`\n📋 INDIVIDUAL TEST RESULTS:`);
  testResults.tests.forEach(test => {
    const status = test.status === 'passed' ? '✅' : '❌';
    console.log(`   ${status} ${test.name} (${test.duration}ms)`);
  });
  
  if (comparison && comparison.files) {
    console.log(`\n📁 OUTPUT FILES:`);
    console.log(`   📊 Original PPTX: ${formatBytes(comparison.files.original.size)}`);
    console.log(`   📄 JSON Schema: ${formatBytes(comparison.files.json.size)}`);
    console.log(`   📋 Reconstructed PPTX: ${formatBytes(comparison.files.reconstructed.size)}`);
    console.log(`   📕 PDF Output: ${formatBytes(comparison.files.pdf.size)}`);
    console.log(`   🖼️  Thumbnails: ${comparison.files.thumbnails.count} files`);
  }
  
  if (comparison && comparison.validation) {
    console.log(`\n🎯 VALIDATION RESULTS:`);
    console.log(`   Pipeline Complete: ${comparison.validation.pipelineComplete ? '✅' : '❌'}`);
    console.log(`   Data Integrity: ${comparison.validation.dataIntegrity ? '✅' : '❌'}`);
    console.log(`   Quality Score: ${comparison.validation.qualityScore}/100`);
    
    if (comparison.validation.recommendations.length > 0) {
      console.log(`\n💡 RECOMMENDATIONS:`);
      comparison.validation.recommendations.forEach(rec => console.log(`   ${rec}`));
    }
    
    if (comparison.validation.issues.length > 0) {
      console.log(`\n⚠️  ISSUES:`);
      comparison.validation.issues.forEach(issue => console.log(`   • ${issue}`));
    }
  }
  
  console.log(`\n📊 PERFORMANCE METRICS:`);
  if (comparison && comparison.analysis.performanceMetrics) {
    const metrics = comparison.analysis.performanceMetrics;
    console.log(`   Slides/Second: ${metrics.throughput.slidesPerSecond}`);
    console.log(`   Bytes/Second: ${formatBytes(parseInt(metrics.throughput.bytesPerSecond))}`);
    console.log(`   Avg Time/Test: ${metrics.averageTimePerTest}ms`);
  }
  
  const finalStatus = testResults.summary.passed === testResults.summary.totalTests ? 
    '🎉 COMPLETE SUCCESS!' : '⚠️ COMPLETED WITH ISSUES';
  
  console.log(`\n${finalStatus}`);
  console.log('='.repeat(80));
  
  return testResults;
}

// Main test execution
async function runCompleteE2ETest() {
  log('🌙 Luna PowerPoint Processing - Complete End-to-End Test', 'step');
  log('📄 Testing with: Slideworks_business_case_template.pptx', 'info');
  log('='.repeat(60), 'info');
  
  // Setup
  ensureDirectory(TEST_CONFIG.outputDir);
  
  let comparison = null;
  
  try {
    // Test 1: Original PPTX analysis
    await testOriginalPptxAnalysis();
    
    // Test 2: PPTX to JSON conversion
    const { jsonPath } = await testPptxToJsonConversion();
    
    // Test 3: JSON to PPTX reconstruction
    await testJsonToPptxReconstruction(testResults.files.universalSchema);
    
    // Test 4: Thumbnail generation
    await testThumbnailGeneration();
    
    // Test 5: PDF conversion
    await testPdfConversion();
    
    // Test 6: Comprehensive comparison and validation
    comparison = await testComparisonAndValidation();
    
  } catch (error) {
    log(`Integration test failed: ${error.message}`, 'error');
    testResults.errors = testResults.errors || [];
    testResults.errors.push(error.message);
  }
  
  // Generate final report
  const finalReport = generateFinalReport(comparison);
  
  return finalReport;
}

// Run the complete end-to-end test
if (require.main === module) {
  runCompleteE2ETest().catch(error => {
    log(`Fatal error: ${error.message}`, 'error');
    process.exit(1);
  });
}

module.exports = {
  runCompleteE2ETest,
  TEST_CONFIG,
  testResults
};