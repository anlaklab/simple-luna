#!/usr/bin/env node

/**
 * Test script for enhanced PPTX to JSON conversion
 * Tests the comprehensive property extraction from PowerPoint files
 */

const path = require('path');
const fs = require('fs').promises;

// Import the Aspose adapter
const { AsposeAdapter } = require('./server/dist/adapters/aspose.adapter');

async function testEnhancedConversion() {
  console.log('🔍 Testing Enhanced PPTX to JSON Conversion...\n');

  // Initialize the adapter
  const adapter = new AsposeAdapter({
    tempDirectory: './temp/aspose',
    maxFileSize: 50 * 1024 * 1024, // 50MB
  });

  // Test files
  const testFiles = [
    './test-outputs/sample.pptx',
    './uploads/test-presentation.pptx',
  ];

  for (const testFile of testFiles) {
    try {
      // Check if file exists
      await fs.access(testFile);
      
      console.log(`\n📄 Processing: ${testFile}`);
      console.log('─'.repeat(50));

      // Convert PPTX to JSON with all options enabled
      const result = await adapter.convertPptxToJson(testFile, {
        includeAssets: true,
        includeMetadata: true,
        includeAnimations: true,
        includeComments: true,
        extractImages: true,
      });

      if (result.success && result.data) {
        const presentation = result.data;
        
        // Display presentation info
        console.log('\n📊 Presentation Info:');
        console.log(`  - Title: ${presentation.documentProperties?.title || 'Untitled'}`);
        console.log(`  - Author: ${presentation.documentProperties?.author || 'Unknown'}`);
        console.log(`  - Slides: ${presentation.slides.length}`);
        console.log(`  - Total Shapes: ${result.processingStats.shapeCount}`);
        console.log(`  - Total Images: ${result.processingStats.imageCount}`);
        console.log(`  - Total Animations: ${result.processingStats.animationCount}`);
        console.log(`  - Conversion Time: ${result.processingStats.conversionTimeMs}ms`);

        // Analyze each slide
        console.log('\n📑 Slide Analysis:');
        presentation.slides.forEach((slide, index) => {
          console.log(`\n  Slide ${index + 1}: ${slide.name}`);
          console.log(`    - Shapes: ${slide.shapes?.length || 0}`);
          console.log(`    - Hidden: ${slide.hidden}`);
          
          // Check for background
          if (slide.background) {
            console.log(`    - Background: ${slide.background.type}`);
            if (slide.background.fillFormat?.solidFillColor) {
              console.log(`      Color: ${slide.background.fillFormat.solidFillColor.color}`);
            }
          }

          // Check for transitions
          if (slide.transition) {
            console.log(`    - Transition: Type ${slide.transition.type}, Speed ${slide.transition.speed}`);
          }

          // Analyze shapes
          if (slide.shapes && slide.shapes.length > 0) {
            console.log(`    - Shape Details:`);
            slide.shapes.forEach((shape, shapeIndex) => {
              console.log(`      Shape ${shapeIndex + 1}: ${shape.shapeType}`);
              console.log(`        - Position: (${shape.geometry.x}, ${shape.geometry.y})`);
              console.log(`        - Size: ${shape.geometry.width} x ${shape.geometry.height}`);
              console.log(`        - Rotation: ${shape.geometry.rotation}°`);
              
              // Fill properties
              if (shape.fillFormat) {
                console.log(`        - Fill: ${shape.fillFormat.type}`);
                if (shape.fillFormat.solidFillColor) {
                  console.log(`          Color: ${shape.fillFormat.solidFillColor.color}`);
                  console.log(`          Transparency: ${shape.fillFormat.solidFillColor.transparency}`);
                }
                if (shape.fillFormat.gradientFillFormat) {
                  console.log(`          Gradient Stops: ${shape.fillFormat.gradientFillFormat.gradientStops?.length || 0}`);
                }
              }

              // Line properties
              if (shape.lineFormat) {
                console.log(`        - Line Width: ${shape.lineFormat.width}`);
                if (shape.lineFormat.fillFormat?.solidFillColor) {
                  console.log(`          Line Color: ${shape.lineFormat.fillFormat.solidFillColor.color}`);
                }
              }

              // Effect properties
              if (shape.effectFormat) {
                if (shape.effectFormat.shadowEffect) {
                  console.log(`        - Shadow: Distance ${shape.effectFormat.shadowEffect.distance}, Blur ${shape.effectFormat.shadowEffect.blurRadius}`);
                }
                if (shape.effectFormat.glowEffect) {
                  console.log(`        - Glow: Radius ${shape.effectFormat.glowEffect.radius}`);
                }
              }

              // Text properties
              if (shape.textFrame) {
                console.log(`        - Text: "${shape.textFrame.text.substring(0, 50)}${shape.textFrame.text.length > 50 ? '...' : ''}"`);
                if (shape.textFrame.paragraphs && shape.textFrame.paragraphs.length > 0) {
                  const firstParagraph = shape.textFrame.paragraphs[0];
                  if (firstParagraph.portions && firstParagraph.portions.length > 0) {
                    const firstPortion = firstParagraph.portions[0];
                    console.log(`          Font: ${firstPortion.fontFormat.fontName} ${firstPortion.fontFormat.fontSize}pt`);
                    console.log(`          Style: ${firstPortion.fontFormat.fontBold ? 'Bold ' : ''}${firstPortion.fontFormat.fontItalic ? 'Italic ' : ''}${firstPortion.fontFormat.fontUnderline ? 'Underline' : ''}`);
                    console.log(`          Color: ${firstPortion.fontFormat.fontColor}`);
                  }
                }
              }

              // 3D properties
              if (shape.threeDFormat) {
                console.log(`        - 3D: Depth ${shape.threeDFormat.depth}, Extrusion ${shape.threeDFormat.extrusionHeight}`);
              }
            });
          }
        });

        // Save the enhanced JSON output
        const outputPath = path.join(
          './test-outputs',
          `${path.basename(testFile, '.pptx')}-enhanced.json`
        );
        await fs.mkdir('./test-outputs', { recursive: true });
        await fs.writeFile(
          outputPath,
          JSON.stringify(presentation, null, 2),
          'utf8'
        );
        console.log(`\n✅ Saved enhanced JSON to: ${outputPath}`);

      } else {
        console.error(`\n❌ Conversion failed: ${result.error}`);
      }

    } catch (error) {
      console.error(`\n⚠️  Skipping ${testFile}: File not found or error occurred`);
      console.error(`   Error: ${error.message}`);
    }
  }

  console.log('\n✨ Enhanced conversion test completed!\n');
}

// Run the test
testEnhancedConversion().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});