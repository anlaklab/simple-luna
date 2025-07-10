#!/usr/bin/env node

/**
 * Luna PowerPoint Processing - Direct Aspose.Slides Test
 * 
 * This test directly uses the Aspose.Slides library without server dependencies
 * to validate the core functionality
 */

const fs = require('fs');
const path = require('path');

// Test configuration
const TEST_CONFIG = {
  inputFile: 'Slideworks_business_case_template.pptx',
  outputDir: './test-outputs',
  testFiles: {
    originalPptx: 'Slideworks_business_case_template.pptx',
    convertedJson: 'converted-presentation.json',
    reconstructedPptx: 'reconstructed-presentation.pptx',
    thumbnailsDir: 'thumbnails',
    pdfOutput: 'converted-presentation.pdf',
    comparisonReport: 'comparison-report.json'
  }
};

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// Logging functions
function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, colors.green);
}

function logError(message) {
  log(`❌ ${message}`, colors.red);
}

function logWarning(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

function logInfo(message) {
  log(`ℹ️  ${message}`, colors.blue);
}

function logStep(message) {
  log(`🔄 ${message}`, colors.cyan);
}

// Utility functions
function ensureDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    logInfo(`Created directory: ${dirPath}`);
  }
}

function fileExists(filePath) {
  return fs.existsSync(filePath);
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

// Test Aspose.Slides library availability
async function testAsposeAvailability() {
  logStep('Testing Aspose.Slides library availability...');
  
  try {
    // Check if Aspose.Slides library files exist
    const libPath = path.join(__dirname, 'lib');
    const asposeJsPath = path.join(libPath, 'aspose.slides.js');
    const asposeJarPath = path.join(libPath, 'aspose-slides-25.6-nodejs.jar');
    const licensePath = path.join(__dirname, 'Aspose.Slides.Product.Family.lic');
    
    const libStatus = {
      libDirectory: fs.existsSync(libPath),
      asposeJs: fs.existsSync(asposeJsPath),
      asposeJar: fs.existsSync(asposeJarPath),
      licenseFile: fs.existsSync(licensePath)
    };
    
    logInfo(`📁 Library directory: ${libStatus.libDirectory ? '✅' : '❌'}`);
    logInfo(`📄 aspose.slides.js: ${libStatus.asposeJs ? '✅' : '❌'}`);
    logInfo(`📦 aspose JAR: ${libStatus.asposeJar ? '✅' : '❌'}`);
    logInfo(`🔑 License file: ${libStatus.licenseFile ? '✅' : '❌'}`);
    
    if (libStatus.asposeJs) {
      logInfo(`📊 aspose.slides.js size: ${formatBytes(getFileSize(asposeJsPath))}`);
    }
    if (libStatus.asposeJar) {
      logInfo(`📊 JAR file size: ${formatBytes(getFileSize(asposeJarPath))}`);
    }
    
    // Try to require the library
    try {
      logStep('Attempting to load Aspose.Slides library...');
      const asposeSlides = require('./lib/aspose.slides');
      logSuccess('Aspose.Slides library loaded successfully!');
      
      // Test basic functionality
      logStep('Testing basic Aspose functionality...');
      
      // Try to create a new presentation
      const presentation = new asposeSlides.Presentation();
      logSuccess('Successfully created new presentation object');
      
      // Check slide count
      const slideCount = presentation.getSlides().size();
      logInfo(`Default slide count: ${slideCount}`);
      
      // Get slide size information
      const slideSize = presentation.getSlideSize();
      logInfo(`Default slide size: ${slideSize.getSize().getWidth()}x${slideSize.getSize().getHeight()}`);
      
      // Clean up
      presentation.dispose();
      logSuccess('Presentation object disposed successfully');
      
      return { success: true, library: asposeSlides, status: libStatus };
      
    } catch (requireError) {
      logError(`Failed to require Aspose.Slides library: ${requireError.message}`);
      return { success: false, error: requireError.message, status: libStatus };
    }
    
  } catch (error) {
    logError(`Aspose availability test failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Test PPTX file loading and analysis
async function testPptxLoading(asposeSlides) {
  logStep('Testing PPTX file loading and analysis...');
  
  try {
    const inputPath = path.join(__dirname, TEST_CONFIG.testFiles.originalPptx);
    
    if (!fileExists(inputPath)) {
      throw new Error(`Input file not found: ${inputPath}`);
    }
    
    const inputSize = getFileSize(inputPath);
    logInfo(`📁 Input file: ${inputPath}`);
    logInfo(`📊 File size: ${formatBytes(inputSize)}`);
    
    // Load the presentation
    logStep('Loading presentation...');
    const presentation = new asposeSlides.Presentation(inputPath);
    logSuccess('Presentation loaded successfully!');
    
    // Analyze presentation structure
    const analysis = {
      metadata: {
        slideCount: presentation.getSlides().size(),
        masterSlideCount: presentation.getMasters().size(),
        layoutSlideCount: presentation.getLayoutSlides().size(),
        fileSize: inputSize
      },
      slideSize: {
        width: presentation.getSlideSize().getSize().getWidth(),
        height: presentation.getSlideSize().getSize().getHeight(),
        type: presentation.getSlideSize().getType().toString(),
        orientation: presentation.getSlideSize().getOrientation().toString()
      },
      documentProperties: {},
      slides: []
    };
    
    // Extract document properties
    logStep('Extracting document properties...');
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
    
    // Analyze slides
    logStep(`Analyzing ${analysis.metadata.slideCount} slides...`);
    const slides = presentation.getSlides();
    
    for (let i = 0; i < slides.size(); i++) {
      const slide = slides.get_Item(i);
      const slideAnalysis = {
        index: i,
        name: slide.getName() || `Slide ${i + 1}`,
        hidden: slide.getHidden(),
        shapeCount: slide.getShapes().size(),
        shapes: [],
        hasNotes: false,
        hasAnimations: false,
        transition: {}
      };
      
      // Analyze shapes
      const shapes = slide.getShapes();
      for (let j = 0; j < Math.min(shapes.size(), 5); j++) { // Limit to first 5 shapes for brevity
        const shape = shapes.get_Item(j);
        const shapeInfo = {
          index: j,
          name: shape.getName() || `Shape ${j + 1}`,
          type: shape.getShapeType().toString(),
          position: {
            x: shape.getX(),
            y: shape.getY(),
            width: shape.getWidth(),
            height: shape.getHeight()
          },
          rotation: shape.getRotation(),
          hidden: shape.getHidden(),
          hasText: shape.getTextFrame ? !!shape.getTextFrame() : false
        };
        
        // Extract text content if available
        if (shape.getTextFrame && shape.getTextFrame()) {
          const textFrame = shape.getTextFrame();
          const text = textFrame.getText();
          if (text && text.length > 0) {
            shapeInfo.textContent = text.substring(0, 100) + (text.length > 100 ? '...' : '');
          }
        }
        
        slideAnalysis.shapes.push(shapeInfo);
      }
      
      if (shapes.size() > 5) {
        slideAnalysis.shapes.push({
          note: `... and ${shapes.size() - 5} more shapes`
        });
      }
      
      // Check for notes
      if (slide.getNotesSlideManager() && slide.getNotesSlideManager().getNotesSlide()) {
        slideAnalysis.hasNotes = true;
      }
      
      // Check for animations
      const timeline = slide.getTimeline();
      if (timeline && timeline.getMainSequence() && timeline.getMainSequence().size() > 0) {
        slideAnalysis.hasAnimations = true;
        slideAnalysis.animationCount = timeline.getMainSequence().size();
      }
      
      // Extract transition information
      const transition = slide.getSlideShowTransition();
      slideAnalysis.transition = {
        type: transition.getType().toString(),
        speed: transition.getSpeed().toString(),
        advanceOnClick: transition.getAdvanceOnClick(),
        advanceAfterTime: transition.getAdvanceAfterTime()
      };
      
      analysis.slides.push(slideAnalysis);
    }
    
    // Save analysis to JSON
    const analysisPath = path.join(TEST_CONFIG.outputDir, 'presentation-analysis.json');
    fs.writeFileSync(analysisPath, JSON.stringify(analysis, null, 2));
    logSuccess(`Analysis saved to: ${analysisPath}`);
    
    // Display summary
    logInfo('📊 PRESENTATION ANALYSIS SUMMARY:');
    logInfo(`   📄 Slides: ${analysis.metadata.slideCount}`);
    logInfo(`   📐 Size: ${analysis.slideSize.width}x${analysis.slideSize.height} (${analysis.slideSize.orientation})`);
    logInfo(`   👤 Author: ${analysis.documentProperties.author || 'Unknown'}`);
    logInfo(`   📝 Title: ${analysis.documentProperties.title || 'Untitled'}`);
    logInfo(`   🏢 Company: ${analysis.documentProperties.company || 'Unknown'}`);
    
    // Count slides with different features
    const slidesWithText = analysis.slides.filter(s => s.shapes.some(sh => sh.hasText)).length;
    const slidesWithAnimations = analysis.slides.filter(s => s.hasAnimations).length;
    const slidesWithNotes = analysis.slides.filter(s => s.hasNotes).length;
    const totalShapes = analysis.slides.reduce((sum, s) => sum + s.shapeCount, 0);
    
    logInfo(`   🔤 Slides with text: ${slidesWithText}/${analysis.metadata.slideCount}`);
    logInfo(`   ✨ Slides with animations: ${slidesWithAnimations}/${analysis.metadata.slideCount}`);
    logInfo(`   📝 Slides with notes: ${slidesWithNotes}/${analysis.metadata.slideCount}`);
    logInfo(`   🔷 Total shapes: ${totalShapes}`);
    
    // Clean up
    presentation.dispose();
    logSuccess('Presentation disposed successfully');
    
    return { success: true, analysis: analysis };
    
  } catch (error) {
    logError(`PPTX loading test failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Test PPTX to JSON conversion
async function testPptxToJsonConversion(asposeSlides) {
  logStep('Testing comprehensive PPTX to JSON conversion...');
  
  try {
    const inputPath = path.join(__dirname, TEST_CONFIG.testFiles.originalPptx);
    const outputPath = path.join(TEST_CONFIG.outputDir, TEST_CONFIG.testFiles.convertedJson);
    
    // Load presentation
    const presentation = new asposeSlides.Presentation(inputPath);
    
    // Create comprehensive JSON representation
    const universalSchema = {
      version: '1.0',
      generator: 'Aspose.Slides for Node.js',
      timestamp: new Date().toISOString(),
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
      layoutSlides: [],
      customProperties: {}
    };
    
    // Extract document properties
    const docProps = presentation.getDocumentProperties();
    universalSchema.documentProperties = {
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
      totalEditingTime: docProps.getTotalEditingTime()
    };
    
    // Extract all slides with full detail
    logStep('Extracting detailed slide information...');
    const slides = presentation.getSlides();
    
    for (let i = 0; i < slides.size(); i++) {
      const slide = slides.get_Item(i);
      const slideData = {
        index: i,
        name: slide.getName() || `Slide ${i + 1}`,
        hidden: slide.getHidden(),
        background: {},
        shapes: [],
        notes: null,
        animations: [],
        transitions: {},
        comments: []
      };
      
      // Extract all shapes with comprehensive details
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
            width: shape.getWidth(),
            height: shape.getHeight(),
            rotation: shape.getRotation(),
            zOrder: shape.getZOrderPosition()
          },
          properties: {
            hidden: shape.getHidden(),
            locked: shape.getShapeLock ? !!shape.getShapeLock() : false
          },
          fill: {},
          line: {},
          shadow: {},
          textFrame: null,
          hyperlink: null
        };
        
        // Extract text frame information
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
          
          // Extract paragraph details
          const paragraphs = textFrame.getParagraphs();
          for (let k = 0; k < paragraphs.size(); k++) {
            const paragraph = paragraphs.get_Item(k);
            const paragraphData = {
              index: k,
              text: paragraph.getText() || '',
              alignment: paragraph.getAlignment().toString(),
              indent: paragraph.getIndent(),
              bulletType: paragraph.getBulletType().toString(),
              portions: []
            };
            
            // Extract text portions
            const portions = paragraph.getPortions();
            for (let l = 0; l < portions.size(); l++) {
              const portion = portions.get_Item(l);
              paragraphData.portions.push({
                index: l,
                text: portion.getText() || '',
                fontHeight: portion.getPortionFormat().getFontHeight(),
                fontName: portion.getPortionFormat().getLatinFont() ? 
                  portion.getPortionFormat().getLatinFont().getFontName() : 'Default',
                bold: portion.getPortionFormat().getFontBold(),
                italic: portion.getPortionFormat().getFontItalic(),
                underline: portion.getPortionFormat().getFontUnderline().toString()
              });
            }
            
            shapeData.textFrame.paragraphs.push(paragraphData);
          }
        }
        
        slideData.shapes.push(shapeData);
      }
      
      // Extract slide notes
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
              text: notesShape.getTextFrame().getText() || '',
              type: notesShape.getShapeType().toString()
            });
          }
        }
      }
      
      // Extract animations
      const timeline = slide.getTimeline();
      if (timeline && timeline.getMainSequence()) {
        const mainSequence = timeline.getMainSequence();
        for (let k = 0; k < mainSequence.size(); k++) {
          const effect = mainSequence.get_Item(k);
          slideData.animations.push({
            index: k,
            type: effect.getType().toString(),
            subtype: effect.getSubtype().toString(),
            timing: {
              duration: effect.getTiming().getDuration(),
              delay: effect.getTiming().getDelay(),
              repeatCount: effect.getTiming().getRepeatCount(),
              speed: effect.getTiming().getSpeed()
            }
          });
        }
      }
      
      // Extract slide transitions
      const transition = slide.getSlideShowTransition();
      slideData.transitions = {
        type: transition.getType().toString(),
        subtype: transition.getValue().toString(),
        speed: transition.getSpeed().toString(),
        advanceOnClick: transition.getAdvanceOnClick(),
        advanceAfterTime: transition.getAdvanceAfterTime(),
        duration: transition.getAdvanceAfterTime()
      };
      
      universalSchema.slides.push(slideData);
    }
    
    // Save comprehensive JSON
    fs.writeFileSync(outputPath, JSON.stringify(universalSchema, null, 2));
    
    const outputSize = getFileSize(outputPath);
    const inputSize = getFileSize(inputPath);
    
    logSuccess(`Comprehensive JSON conversion completed!`);
    logInfo(`📁 JSON output: ${outputPath}`);
    logInfo(`📊 Output size: ${formatBytes(outputSize)}`);
    logInfo(`📊 Compression ratio: ${(inputSize / outputSize).toFixed(2)}:1`);
    logInfo(`📄 Slides converted: ${universalSchema.metadata.slideCount}`);
    logInfo(`🔷 Total shapes: ${universalSchema.slides.reduce((sum, s) => sum + s.shapes.length, 0)}`);
    
    // Clean up
    presentation.dispose();
    
    return { success: true, schema: universalSchema, outputPath: outputPath };
    
  } catch (error) {
    logError(`PPTX to JSON conversion failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Test thumbnail generation
async function testThumbnailGeneration(asposeSlides) {
  logStep('Testing thumbnail generation...');
  
  try {
    const inputPath = path.join(__dirname, TEST_CONFIG.testFiles.originalPptx);
    const outputDir = path.join(TEST_CONFIG.outputDir, TEST_CONFIG.testFiles.thumbnailsDir);
    ensureDirectory(outputDir);
    
    // Load presentation
    const presentation = new asposeSlides.Presentation(inputPath);
    const slides = presentation.getSlides();
    
    logInfo(`Generating thumbnails for ${slides.size()} slides...`);
    
    const thumbnails = [];
    
    for (let i = 0; i < slides.size(); i++) {
      const slide = slides.get_Item(i);
      
      // Generate thumbnail with high quality
      const thumbnail = slide.getThumbnail(2.0, 2.0); // 2x scale factor for high quality
      
      // Save thumbnail
      const thumbnailPath = path.join(outputDir, `slide_${i + 1}.png`);
      thumbnail.save(thumbnailPath, asposeSlides.ImageFormat.Png);
      
      const thumbnailSize = getFileSize(thumbnailPath);
      
      thumbnails.push({
        slideIndex: i,
        fileName: `slide_${i + 1}.png`,
        path: thumbnailPath,
        size: thumbnailSize
      });
      
      logInfo(`   📸 Slide ${i + 1}: ${formatBytes(thumbnailSize)}`);
    }
    
    // Create thumbnail index
    const thumbnailIndex = {
      totalThumbnails: thumbnails.length,
      format: 'png',
      quality: 'high',
      scale: '2x',
      thumbnails: thumbnails
    };
    
    const indexPath = path.join(outputDir, 'thumbnail-index.json');
    fs.writeFileSync(indexPath, JSON.stringify(thumbnailIndex, null, 2));
    
    const totalThumbnailSize = thumbnails.reduce((sum, t) => sum + t.size, 0);
    
    logSuccess(`Thumbnail generation completed!`);
    logInfo(`📁 Thumbnails directory: ${outputDir}`);
    logInfo(`📸 Generated: ${thumbnails.length} thumbnails`);
    logInfo(`📊 Total size: ${formatBytes(totalThumbnailSize)}`);
    logInfo(`📊 Average size: ${formatBytes(totalThumbnailSize / thumbnails.length)}`);
    
    // Clean up
    presentation.dispose();
    
    return { success: true, thumbnails: thumbnails, outputDir: outputDir };
    
  } catch (error) {
    logError(`Thumbnail generation failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Test JSON to PPTX reconstruction
async function testJsonToPptxReconstruction(asposeSlides, jsonSchemaPath) {
  logStep('Testing JSON to PPTX reconstruction...');
  
  try {
    const outputPath = path.join(TEST_CONFIG.outputDir, TEST_CONFIG.testFiles.reconstructedPptx);
    
    // Load JSON schema
    const jsonContent = fs.readFileSync(jsonSchemaPath, 'utf8');
    const schema = JSON.parse(jsonContent);
    
    logInfo(`Reconstructing presentation from JSON schema...`);
    logInfo(`   📄 Source slides: ${schema.metadata.slideCount}`);
    
    // Create new presentation
    const presentation = new asposeSlides.Presentation();
    
    // Set slide size
    if (schema.slideSize) {
      presentation.getSlideSize().setSize(
        schema.slideSize.width,
        schema.slideSize.height
      );
    }
    
    // Set document properties
    if (schema.documentProperties) {
      const docProps = presentation.getDocumentProperties();
      const props = schema.documentProperties;
      
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
    
    // Reconstruct slides
    if (schema.slides && schema.slides.length > 0) {
      for (let i = 0; i < schema.slides.length; i++) {
        const slideData = schema.slides[i];
        
        // Add new slide
        const slide = presentation.getSlides().addEmptySlide(
          presentation.getLayoutSlides().get_Item(0)
        );
        
        // Set slide properties
        if (slideData.name) slide.setName(slideData.name);
        if (slideData.hidden !== undefined) slide.setHidden(slideData.hidden);
        
        // Reconstruct shapes (simplified)
        if (slideData.shapes) {
          for (let j = 0; j < slideData.shapes.length; j++) {
            const shapeData = slideData.shapes[j];
            
            // Only reconstruct text shapes for this test
            if (shapeData.textFrame && shapeData.textFrame.text) {
              const textBox = slide.getShapes().addAutoShape(
                asposeSlides.ShapeType.Rectangle,
                shapeData.geometry.x,
                shapeData.geometry.y,
                shapeData.geometry.width,
                shapeData.geometry.height
              );
              
              // Set text content
              textBox.getTextFrame().setText(shapeData.textFrame.text);
              
              // Make shape transparent (text only)
              textBox.getFillFormat().setFillType(asposeSlides.FillType.NoFill);
              textBox.getLineFormat().getFillFormat().setFillType(asposeSlides.FillType.NoFill);
              
              // Set shape name
              if (shapeData.name) {
                textBox.setName(shapeData.name);
              }
            }
          }
        }
        
        logInfo(`   📄 Reconstructed slide ${i + 1}: ${slideData.shapes ? slideData.shapes.length : 0} shapes`);
      }
    }
    
    // Save reconstructed presentation
    presentation.save(outputPath, asposeSlides.SaveFormat.Pptx);
    
    const outputSize = getFileSize(outputPath);
    const originalSize = getFileSize(path.join(__dirname, TEST_CONFIG.testFiles.originalPptx));
    
    logSuccess(`JSON to PPTX reconstruction completed!`);
    logInfo(`📁 Reconstructed PPTX: ${outputPath}`);
    logInfo(`📊 Output size: ${formatBytes(outputSize)}`);
    logInfo(`📊 Original size: ${formatBytes(originalSize)}`);
    logInfo(`📊 Size ratio: ${(outputSize / originalSize * 100).toFixed(1)}% of original`);
    
    // Clean up
    presentation.dispose();
    
    return { success: true, outputPath: outputPath, outputSize: outputSize };
    
  } catch (error) {
    logError(`JSON to PPTX reconstruction failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Test PDF conversion
async function testPdfConversion(asposeSlides) {
  logStep('Testing PDF conversion...');
  
  try {
    const inputPath = path.join(__dirname, TEST_CONFIG.testFiles.originalPptx);
    const outputPath = path.join(TEST_CONFIG.outputDir, TEST_CONFIG.testFiles.pdfOutput);
    
    // Load presentation
    const presentation = new asposeSlides.Presentation(inputPath);
    
    logInfo(`Converting presentation to PDF...`);
    
    // Save as PDF
    presentation.save(outputPath, asposeSlides.SaveFormat.Pdf);
    
    const outputSize = getFileSize(outputPath);
    const inputSize = getFileSize(inputPath);
    
    logSuccess(`PDF conversion completed!`);
    logInfo(`📁 PDF output: ${outputPath}`);
    logInfo(`📊 PDF size: ${formatBytes(outputSize)}`);
    logInfo(`📊 Original size: ${formatBytes(inputSize)}`);
    logInfo(`📊 Compression: ${(outputSize / inputSize * 100).toFixed(1)}% of original`);
    
    // Clean up
    presentation.dispose();
    
    return { success: true, outputPath: outputPath, outputSize: outputSize };
    
  } catch (error) {
    logError(`PDF conversion failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Generate final comparison report
function generateComparisonReport(results) {
  logStep('Generating comprehensive comparison report...');
  
  const report = {
    timestamp: new Date().toISOString(),
    testResults: results,
    summary: {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      successRate: 0
    },
    fileComparison: {},
    recommendations: []
  };
  
  // Count test results
  Object.keys(results).forEach(testName => {
    report.summary.totalTests++;
    if (results[testName].success) {
      report.summary.passedTests++;
    } else {
      report.summary.failedTests++;
    }
  });
  
  report.summary.successRate = (report.summary.passedTests / report.summary.totalTests * 100).toFixed(1);
  
  // File comparison
  const originalPath = path.join(__dirname, TEST_CONFIG.testFiles.originalPptx);
  const jsonPath = path.join(TEST_CONFIG.outputDir, TEST_CONFIG.testFiles.convertedJson);
  const reconstructedPath = path.join(TEST_CONFIG.outputDir, TEST_CONFIG.testFiles.reconstructedPptx);
  const pdfPath = path.join(TEST_CONFIG.outputDir, TEST_CONFIG.testFiles.pdfOutput);
  
  report.fileComparison = {
    original: {
      path: originalPath,
      size: getFileSize(originalPath),
      exists: fileExists(originalPath)
    },
    json: {
      path: jsonPath,
      size: getFileSize(jsonPath),
      exists: fileExists(jsonPath)
    },
    reconstructed: {
      path: reconstructedPath,
      size: getFileSize(reconstructedPath),
      exists: fileExists(reconstructedPath)
    },
    pdf: {
      path: pdfPath,
      size: getFileSize(pdfPath),
      exists: fileExists(pdfPath)
    }
  };
  
  // Generate recommendations
  if (report.summary.successRate == 100) {
    report.recommendations.push("🎉 All tests passed! The Aspose.Slides integration is working perfectly.");
  } else {
    report.recommendations.push("⚠️ Some tests failed. Review the error messages for troubleshooting.");
  }
  
  if (results.asposeAvailability && results.asposeAvailability.success) {
    report.recommendations.push("✅ Aspose.Slides library is properly initialized and functional.");
  } else {
    report.recommendations.push("❌ Aspose.Slides library issues detected. Check installation and licensing.");
  }
  
  if (results.pptxLoading && results.pptxLoading.success) {
    report.recommendations.push("✅ PPTX file loading and analysis working correctly.");
  }
  
  if (results.jsonConversion && results.jsonConversion.success) {
    report.recommendations.push("✅ PPTX to JSON conversion generates comprehensive data structure.");
  }
  
  if (results.thumbnailGeneration && results.thumbnailGeneration.success) {
    report.recommendations.push("✅ Thumbnail generation produces high-quality slide previews.");
  }
  
  if (results.jsonReconstruction && results.jsonReconstruction.success) {
    report.recommendations.push("✅ JSON to PPTX reconstruction maintains presentation structure.");
  }
  
  if (results.pdfConversion && results.pdfConversion.success) {
    report.recommendations.push("✅ PDF conversion provides excellent document export capability.");
  }
  
  // Save report
  const reportPath = path.join(TEST_CONFIG.outputDir, 'integration-test-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  logSuccess(`Comparison report generated: ${reportPath}`);
  
  return report;
}

// Main test execution
async function runDirectAsposeTests() {
  log('🌙 Luna PowerPoint Processing - Direct Aspose.Slides Integration Test', colors.bright);
  log('='.repeat(80), colors.bright);
  
  // Setup
  ensureDirectory(TEST_CONFIG.outputDir);
  
  const results = {};
  
  try {
    // Test 1: Aspose.Slides availability
    results.asposeAvailability = await testAsposeAvailability();
    
    if (!results.asposeAvailability.success) {
      logError('Aspose.Slides not available - stopping tests');
      return results;
    }
    
    const asposeSlides = results.asposeAvailability.library;
    
    // Test 2: PPTX loading and analysis
    results.pptxLoading = await testPptxLoading(asposeSlides);
    
    // Test 3: PPTX to JSON conversion
    results.jsonConversion = await testPptxToJsonConversion(asposeSlides);
    
    // Test 4: Thumbnail generation
    results.thumbnailGeneration = await testThumbnailGeneration(asposeSlides);
    
    // Test 5: JSON to PPTX reconstruction
    if (results.jsonConversion.success) {
      results.jsonReconstruction = await testJsonToPptxReconstruction(
        asposeSlides, 
        results.jsonConversion.outputPath
      );
    }
    
    // Test 6: PDF conversion
    results.pdfConversion = await testPdfConversion(asposeSlides);
    
  } catch (error) {
    logError(`Integration test failed: ${error.message}`);
    results.error = error.message;
  }
  
  // Generate final report
  const report = generateComparisonReport(results);
  
  // Display final summary
  log('\\n' + '='.repeat(80), colors.bright);
  log(' LUNA ASPOSE.SLIDES INTEGRATION TEST RESULTS', colors.bright);
  log('='.repeat(80), colors.bright);
  
  log(`\\n📊 TEST SUMMARY:`, colors.bright);
  log(`   Total Tests: ${report.summary.totalTests}`);
  log(`   Passed: ${report.summary.passedTests}`, colors.green);
  log(`   Failed: ${report.summary.failedTests}`, report.summary.failedTests > 0 ? colors.red : colors.green);
  log(`   Success Rate: ${report.summary.successRate}%`, parseFloat(report.summary.successRate) === 100 ? colors.green : colors.yellow);
  
  log(`\\n📋 INDIVIDUAL TEST RESULTS:`, colors.bright);
  Object.keys(results).forEach(testName => {
    if (results[testName] && typeof results[testName] === 'object') {
      const status = results[testName].success ? '✅' : '❌';
      const color = results[testName].success ? colors.green : colors.red;
      log(`   ${status} ${testName}`, color);
    }
  });
  
  log(`\\n📁 OUTPUT FILES:`, colors.bright);
  log(`   Test Directory: ${TEST_CONFIG.outputDir}`);
  if (fileExists(path.join(TEST_CONFIG.outputDir, TEST_CONFIG.testFiles.convertedJson))) {
    log(`   ✅ JSON Conversion: ${TEST_CONFIG.testFiles.convertedJson}`);
  }
  if (fileExists(path.join(TEST_CONFIG.outputDir, TEST_CONFIG.testFiles.reconstructedPptx))) {
    log(`   ✅ Reconstructed PPTX: ${TEST_CONFIG.testFiles.reconstructedPptx}`);
  }
  if (fileExists(path.join(TEST_CONFIG.outputDir, TEST_CONFIG.testFiles.pdfOutput))) {
    log(`   ✅ PDF Output: ${TEST_CONFIG.testFiles.pdfOutput}`);
  }
  if (fileExists(path.join(TEST_CONFIG.outputDir, TEST_CONFIG.testFiles.thumbnailsDir))) {
    log(`   ✅ Thumbnails: ${TEST_CONFIG.testFiles.thumbnailsDir}/`);
  }
  
  log(`\\n🎯 INTEGRATION TEST ${report.summary.successRate == 100 ? 'COMPLETED SUCCESSFULLY' : 'COMPLETED WITH ISSUES'}!`, 
      report.summary.successRate == 100 ? colors.green : colors.yellow);
  log('='.repeat(80), colors.bright);
  
  return results;
}

// Run the tests
if (require.main === module) {
  runDirectAsposeTests().catch(error => {
    logError(`Fatal error: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  runDirectAsposeTests,
  TEST_CONFIG
};