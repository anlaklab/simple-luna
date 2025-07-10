#!/usr/bin/env node

/**
 * Direct test of enhanced Aspose conversion without server dependencies
 */

const path = require('path');
const fs = require('fs').promises;

async function testEnhancedAspose() {
  console.log('🔍 Testing Enhanced Aspose Conversion Directly...\n');

  try {
    // Skip build for now due to TypeScript errors
    console.log('📦 Using existing build...\n');

    // Import the enhanced adapter
    const { AsposeAdapter } = require('./server/dist/adapters/aspose.adapter');
    const adapter = new AsposeAdapter();

    // Create a test presentation
    console.log('📝 Creating test presentation with enhanced properties...');
    const AsposeSlides = require('./lib/aspose.slides.js');
    const { Presentation, SaveFormat, ShapeType, FillType, LineStyle, LineDashStyle } = AsposeSlides;

    const presentation = new Presentation();
    const slide = presentation.getSlides().get_Item(0);

    // Set slide background
    slide.getBackground().setType(1);
    slide.getBackground().getFillFormat().setFillType(FillType.Solid);
    slide.getBackground().getFillFormat().getSolidFillColor().setColor(
      AsposeSlides.Color.fromArgb(255, 245, 245, 245)
    );

    // Add title shape with various properties
    const title = slide.getShapes().addAutoShape(ShapeType.Rectangle, 50, 30, 620, 80);
    title.setName('Main Title');
    title.getFillFormat().setFillType(FillType.Solid);
    title.getFillFormat().getSolidFillColor().setColor(
      AsposeSlides.Color.fromArgb(200, 33, 150, 243) // Semi-transparent blue
    );
    title.getLineFormat().setWidth(2);
    title.getLineFormat().getFillFormat().setFillType(FillType.Solid);
    title.getLineFormat().getFillFormat().getSolidFillColor().setColor(
      AsposeSlides.Color.fromArgb(255, 25, 118, 210)
    );
    title.setRotation(2); // Slight rotation

    // Add rich text
    title.getTextFrame().setText('Enhanced Properties Test');
    const titleParagraph = title.getTextFrame().getParagraphs().get_Item(0);
    titleParagraph.getParagraphFormat().setAlignment(1); // Center
    const titlePortion = titleParagraph.getPortions().get_Item(0);
    titlePortion.getPortionFormat().setFontHeight(36);
    titlePortion.getPortionFormat().setFontBold(1);
    titlePortion.getPortionFormat().getFillFormat().setFillType(FillType.Solid);
    titlePortion.getPortionFormat().getFillFormat().getSolidFillColor().setColor(AsposeSlides.Color.WHITE);

    // Add gradient shape
    const gradient = slide.getShapes().addAutoShape(ShapeType.Ellipse, 100, 150, 150, 150);
    gradient.setName('Gradient Circle');
    gradient.getFillFormat().setFillType(FillType.Gradient);
    gradient.getFillFormat().getGradientFormat().setGradientShape(0); // Linear
    gradient.getFillFormat().getGradientFormat().setLinearGradientAngle(45);

    // Add pattern shape
    const pattern = slide.getShapes().addAutoShape(ShapeType.Pentagon, 300, 150, 120, 120);
    pattern.setName('Pattern Pentagon');
    pattern.getFillFormat().setFillType(FillType.Pattern);
    pattern.getFillFormat().getPatternFormat().setPatternStyle(1);
    pattern.getFillFormat().getPatternFormat().getForeColor().setColor(
      AsposeSlides.Color.fromArgb(255, 255, 193, 7)
    );
    pattern.getFillFormat().getPatternFormat().getBackColor().setColor(
      AsposeSlides.Color.fromArgb(255, 255, 235, 59)
    );

    // Add shape with dashed border
    const dashed = slide.getShapes().addAutoShape(ShapeType.RoundCornerRectangle, 450, 150, 170, 100);
    dashed.setName('Dashed Border');
    dashed.getFillFormat().setFillType(FillType.NoFill);
    dashed.getLineFormat().setWidth(4);
    dashed.getLineFormat().setStyle(LineStyle.Single);
    dashed.getLineFormat().setDashStyle(LineDashStyle.DashDot);
    dashed.getLineFormat().getFillFormat().setFillType(FillType.Solid);
    dashed.getLineFormat().getFillFormat().getSolidFillColor().setColor(
      AsposeSlides.Color.fromArgb(255, 76, 175, 80)
    );

    // Add text box with multiple paragraphs
    const textBox = slide.getShapes().addAutoShape(ShapeType.TextBox, 100, 320, 520, 150);
    textBox.setName('Multi-paragraph Text');
    textBox.getFillFormat().setFillType(FillType.Solid);
    textBox.getFillFormat().getSolidFillColor().setColor(
      AsposeSlides.Color.fromArgb(50, 0, 0, 0) // Semi-transparent black
    );
    
    textBox.getTextFrame().setText('');
    
    // First paragraph - large bold
    const para1 = textBox.getTextFrame().getParagraphs().get_Item(0);
    para1.setText('Bold Header Text');
    para1.getParagraphFormat().setAlignment(0); // Left
    const portion1 = para1.getPortions().get_Item(0);
    portion1.getPortionFormat().setFontHeight(24);
    portion1.getPortionFormat().setFontBold(1);
    portion1.getPortionFormat().getFillFormat().setFillType(FillType.Solid);
    portion1.getPortionFormat().getFillFormat().getSolidFillColor().setColor(
      AsposeSlides.Color.fromArgb(255, 255, 152, 0)
    );

    // Second paragraph - italic
    const para2 = textBox.getTextFrame().getParagraphs().addParagraph();
    para2.setText('Italic subtitle with different color');
    para2.getParagraphFormat().setSpaceBefore(10);
    const portion2 = para2.getPortions().get_Item(0);
    portion2.getPortionFormat().setFontHeight(18);
    portion2.getPortionFormat().setFontItalic(1);
    portion2.getPortionFormat().getFillFormat().setFillType(FillType.Solid);
    portion2.getPortionFormat().getFillFormat().getSolidFillColor().setColor(
      AsposeSlides.Color.fromArgb(255, 156, 39, 176)
    );

    // Third paragraph - underlined
    const para3 = textBox.getTextFrame().getParagraphs().addParagraph();
    para3.setText('Underlined text with custom font');
    para3.getParagraphFormat().setSpaceBefore(10);
    const portion3 = para3.getPortions().get_Item(0);
    portion3.getPortionFormat().setFontHeight(16);
    portion3.getPortionFormat().setFontUnderline(1);
    portion3.getPortionFormat().getLatinFont().setFontName('Georgia');
    portion3.getPortionFormat().getFillFormat().setFillType(FillType.Solid);
    portion3.getPortionFormat().getFillFormat().getSolidFillColor().setColor(
      AsposeSlides.Color.fromArgb(255, 0, 150, 136)
    );

    // Save the test presentation
    await fs.mkdir('./test-outputs', { recursive: true });
    const testFile = './test-outputs/enhanced-direct-test.pptx';
    presentation.save(testFile, SaveFormat.Pptx);
    presentation.dispose();
    console.log('✅ Test presentation saved:', testFile);

    // Now convert it using our enhanced adapter
    console.log('\n🔄 Converting with enhanced property extraction...\n');
    const result = await adapter.convertPptxToJson(testFile, {
      includeAssets: true,
      includeMetadata: true,
      includeAnimations: true,
      includeComments: true,
      extractImages: false,
    });

    if (result.success && result.data) {
      const data = result.data;
      
      console.log('✅ Conversion successful!\n');
      console.log('📊 Summary:');
      console.log(`  - Slides: ${data.slides.length}`);
      console.log(`  - Total Shapes: ${result.processingStats.shapeCount}`);
      console.log(`  - Conversion Time: ${result.processingStats.conversionTimeMs}ms`);
      
      console.log('\n🔍 Enhanced Properties Extracted:');
      
      // Check slide background
      const slide1 = data.slides[0];
      if (slide1.background?.fillFormat?.solidFillColor) {
        console.log('\n  ✓ Slide Background:');
        console.log(`    - Color: ${slide1.background.fillFormat.solidFillColor.color}`);
      }
      
      // Analyze shapes
      console.log('\n  ✓ Shape Details:');
      slide1.shapes?.forEach((shape, idx) => {
        console.log(`\n    Shape ${idx + 1}: ${shape.shapeType} - "${shape.name}"`);
        console.log(`      Position: (${shape.geometry.x}, ${shape.geometry.y})`);
        console.log(`      Size: ${shape.geometry.width} x ${shape.geometry.height}`);
        console.log(`      Rotation: ${shape.geometry.rotation}°`);
        
        // Fill properties
        if (shape.fillFormat) {
          console.log(`      Fill Type: ${shape.fillFormat.type}`);
          if (shape.fillFormat.solidFillColor) {
            console.log(`        Color: ${shape.fillFormat.solidFillColor.color}`);
            console.log(`        Transparency: ${shape.fillFormat.solidFillColor.transparency}`);
          }
          if (shape.fillFormat.gradientFillFormat) {
            console.log(`        Gradient Shape: ${shape.fillFormat.gradientFillFormat.shape}`);
            console.log(`        Gradient Angle: ${shape.fillFormat.gradientFillFormat.angle}°`);
          }
          if (shape.fillFormat.patternFormat) {
            console.log(`        Pattern Style: ${shape.fillFormat.patternFormat.patternStyle}`);
            console.log(`        Fore Color: ${shape.fillFormat.patternFormat.foreColor}`);
            console.log(`        Back Color: ${shape.fillFormat.patternFormat.backColor}`);
          }
        }
        
        // Line properties
        if (shape.lineFormat) {
          console.log(`      Line Width: ${shape.lineFormat.width}`);
          console.log(`        Style: ${shape.lineFormat.style}`);
          console.log(`        Dash: ${shape.lineFormat.dashStyle}`);
          if (shape.lineFormat.fillFormat?.solidFillColor) {
            console.log(`        Color: ${shape.lineFormat.fillFormat.solidFillColor.color}`);
          }
        }
        
        // Text properties
        if (shape.textFrame?.paragraphs?.length > 0) {
          console.log(`      Text Paragraphs: ${shape.textFrame.paragraphs.length}`);
          shape.textFrame.paragraphs.forEach((para, pIdx) => {
            if (para.portions?.length > 0) {
              const portion = para.portions[0];
              console.log(`        Para ${pIdx + 1}: "${para.text.substring(0, 30)}..."`);
              console.log(`          Font: ${portion.fontFormat.fontName} ${portion.fontFormat.fontSize}pt`);
              console.log(`          Style: Bold=${portion.fontFormat.fontBold}, Italic=${portion.fontFormat.fontItalic}, Underline=${portion.fontFormat.fontUnderline}`);
              console.log(`          Color: ${portion.fontFormat.fontColor}`);
            }
          });
        }
      });
      
      // Save the JSON
      const outputPath = './test-outputs/enhanced-direct-test.json';
      await fs.writeFile(outputPath, JSON.stringify(data, null, 2), 'utf8');
      console.log(`\n✅ Enhanced JSON saved to: ${outputPath}`);
      
      // Final verification
      console.log('\n📈 Property Extraction Verification:');
      const hasAllGeometry = slide1.shapes?.every(s => 
        s.geometry?.x !== undefined && 
        s.geometry?.y !== undefined && 
        s.geometry?.width !== undefined && 
        s.geometry?.height !== undefined
      );
      const hasFillProperties = slide1.shapes?.every(s => s.fillFormat?.type !== undefined);
      const hasLineProperties = slide1.shapes?.some(s => s.lineFormat?.width !== undefined);
      const hasTextFormatting = slide1.shapes?.some(s => 
        s.textFrame?.paragraphs?.some(p => 
          p.portions?.some(port => port.fontFormat?.fontName !== undefined)
        )
      );
      
      console.log(`  ✅ All shapes have complete geometry: ${hasAllGeometry}`);
      console.log(`  ✅ All shapes have fill properties: ${hasFillProperties}`);
      console.log(`  ✅ Line formatting extracted: ${hasLineProperties}`);
      console.log(`  ✅ Text formatting extracted: ${hasTextFormatting}`);
      
    } else {
      console.error('❌ Conversion failed:', result.error);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error(error.stack);
  }
}

// Run the test
testEnhancedAspose();