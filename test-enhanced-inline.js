#!/usr/bin/env node

/**
 * Test enhanced conversion with inline PowerPoint creation
 */

const path = require('path');
const fs = require('fs').promises;

async function testEnhancedConversion() {
  console.log('🔍 Testing Enhanced PPTX to JSON Conversion with Aspose.Slides...\n');

  try {
    // Load Aspose.Slides
    const AsposeSlides = require('./lib/aspose.slides.js');
    const { Presentation, SaveFormat, ShapeType, FillType, LineStyle, LineDashStyle } = AsposeSlides;

    // Create a new presentation
    console.log('📝 Creating test presentation...');
    const presentation = new Presentation();

    // Get the first slide
    const slide = presentation.getSlides().get_Item(0);

    // Add a rectangle with fill and border
    const rectangle = slide.getShapes().addAutoShape(ShapeType.Rectangle, 100, 100, 200, 100);
    rectangle.setName('Test Rectangle');
    
    // Set fill properties
    rectangle.getFillFormat().setFillType(FillType.Solid);
    rectangle.getFillFormat().getSolidFillColor().setColor(AsposeSlides.Color.fromArgb(255, 66, 135, 245));
    
    // Set line properties
    rectangle.getLineFormat().setWidth(3);
    rectangle.getLineFormat().setStyle(LineStyle.Single);
    rectangle.getLineFormat().setDashStyle(LineDashStyle.Solid);
    rectangle.getLineFormat().getFillFormat().setFillType(FillType.Solid);
    rectangle.getLineFormat().getFillFormat().getSolidFillColor().setColor(AsposeSlides.Color.fromArgb(255, 255, 0, 0));

    // Add text to rectangle
    rectangle.getTextFrame().setText('Enhanced Properties Test');
    const portion = rectangle.getTextFrame().getParagraphs().get_Item(0).getPortions().get_Item(0);
    portion.getPortionFormat().setFontHeight(18);
    portion.getPortionFormat().setFontBold(1);
    portion.getPortionFormat().getFillFormat().setFillType(FillType.Solid);
    portion.getPortionFormat().getFillFormat().getSolidFillColor().setColor(AsposeSlides.Color.WHITE);

    // Add a circle with gradient fill
    const ellipse = slide.getShapes().addAutoShape(ShapeType.Ellipse, 350, 100, 100, 100);
    ellipse.setName('Gradient Circle');
    ellipse.getFillFormat().setFillType(FillType.Gradient);
    const gradientFormat = ellipse.getFillFormat().getGradientFormat();
    gradientFormat.setGradientShape(1); // Linear

    // Add shadow effect
    const effectFormat = rectangle.getEffectFormat();
    if (effectFormat.getOuterShadowEffect) {
      const shadow = effectFormat.getOuterShadowEffect();
      shadow.setBlurRadius(5);
      shadow.setDistance(3);
      shadow.setDirection(45);
    }

    // Set slide background
    slide.getBackground().setType(1); // Own background
    slide.getBackground().getFillFormat().setFillType(FillType.Solid);
    slide.getBackground().getFillFormat().getSolidFillColor().setColor(AsposeSlides.Color.fromArgb(255, 240, 240, 240));

    // Save the presentation
    const testFile = './test-outputs/enhanced-test.pptx';
    await fs.mkdir('./test-outputs', { recursive: true });
    presentation.save(testFile, SaveFormat.Pptx);
    presentation.dispose();
    
    console.log('✅ Test presentation created: ' + testFile);

    // Now test the conversion
    console.log('\n🔄 Converting to JSON with enhanced properties...');
    
    // Import and use the Aspose adapter
    const { AsposeAdapter } = require('./server/dist/adapters/aspose.adapter');
    const adapter = new AsposeAdapter();

    const result = await adapter.convertPptxToJson(testFile, {
      includeAssets: true,
      includeMetadata: true,
      includeAnimations: true,
      includeComments: true,
      extractImages: true,
    });

    if (result.success && result.data) {
      const presentation = result.data;
      
      console.log('\n📊 Conversion Results:');
      console.log(`  - Slides: ${presentation.slides.length}`);
      console.log(`  - Total Shapes: ${result.processingStats.shapeCount}`);
      console.log(`  - Conversion Time: ${result.processingStats.conversionTimeMs}ms`);

      // Check first slide
      const firstSlide = presentation.slides[0];
      console.log('\n📑 First Slide Analysis:');
      console.log(`  - Shapes: ${firstSlide.shapes?.length || 0}`);
      
      // Check background
      if (firstSlide.background) {
        console.log(`  - Background Fill Type: ${firstSlide.background.type}`);
        if (firstSlide.background.fillFormat?.solidFillColor) {
          console.log(`    Color: ${firstSlide.background.fillFormat.solidFillColor.color}`);
        }
      }

      // Check shapes
      if (firstSlide.shapes && firstSlide.shapes.length > 0) {
        console.log('\n🔷 Shape Properties:');
        firstSlide.shapes.forEach((shape, index) => {
          console.log(`\n  Shape ${index + 1}: ${shape.shapeType} - "${shape.name}"`);
          console.log(`    - Position: (${shape.geometry.x}, ${shape.geometry.y})`);
          console.log(`    - Size: ${shape.geometry.width} x ${shape.geometry.height}`);
          
          // Fill properties
          if (shape.fillFormat) {
            console.log(`    - Fill Type: ${shape.fillFormat.type}`);
            if (shape.fillFormat.solidFillColor) {
              console.log(`      Color: ${shape.fillFormat.solidFillColor.color}`);
              console.log(`      Transparency: ${shape.fillFormat.solidFillColor.transparency}`);
            }
            if (shape.fillFormat.gradientFillFormat) {
              console.log(`      Gradient Shape: ${shape.fillFormat.gradientFillFormat.shape}`);
            }
          }

          // Line properties
          if (shape.lineFormat) {
            console.log(`    - Line Width: ${shape.lineFormat.width}`);
            console.log(`      Line Style: ${shape.lineFormat.style}`);
            console.log(`      Dash Style: ${shape.lineFormat.dashStyle}`);
            if (shape.lineFormat.fillFormat?.solidFillColor) {
              console.log(`      Line Color: ${shape.lineFormat.fillFormat.solidFillColor.color}`);
            }
          }

          // Text properties
          if (shape.textFrame) {
            console.log(`    - Text: "${shape.textFrame.text}"`);
            if (shape.textFrame.paragraphs?.[0]?.portions?.[0]) {
              const font = shape.textFrame.paragraphs[0].portions[0].fontFormat;
              console.log(`      Font: ${font.fontName} ${font.fontSize}pt`);
              console.log(`      Bold: ${font.fontBold}, Color: ${font.fontColor}`);
            }
          }

          // Effect properties
          if (shape.effectFormat?.shadowEffect) {
            console.log(`    - Shadow: Distance ${shape.effectFormat.shadowEffect.distance}, Blur ${shape.effectFormat.shadowEffect.blurRadius}`);
          }
        });
      }

      // Save the enhanced JSON
      const outputPath = './test-outputs/enhanced-test.json';
      await fs.writeFile(outputPath, JSON.stringify(presentation, null, 2), 'utf8');
      console.log(`\n✅ Enhanced JSON saved to: ${outputPath}`);

      // Verify key properties were extracted
      console.log('\n🔍 Property Extraction Verification:');
      const hasGeometry = firstSlide.shapes?.every(s => s.geometry?.x !== undefined);
      const hasFillColors = firstSlide.shapes?.some(s => s.fillFormat?.solidFillColor?.color);
      const hasLineFormat = firstSlide.shapes?.some(s => s.lineFormat?.width !== undefined);
      const hasTextFormat = firstSlide.shapes?.some(s => s.textFrame?.paragraphs?.[0]?.portions?.[0]?.fontFormat);
      const hasBackground = firstSlide.background?.fillFormat !== undefined;

      console.log(`  ✅ Geometry (position, size): ${hasGeometry}`);
      console.log(`  ✅ Fill properties (colors): ${hasFillColors}`);
      console.log(`  ✅ Line/border properties: ${hasLineFormat}`);
      console.log(`  ✅ Text formatting: ${hasTextFormat}`);
      console.log(`  ✅ Slide background: ${hasBackground}`);

    } else {
      console.error('❌ Conversion failed:', result.error);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error(error.stack);
  }
}

// Run the test
testEnhancedConversion();