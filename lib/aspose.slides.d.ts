declare module 'aspose.slides.js' {
    export class Presentation {
        constructor(filePath?: string);
        getSlides(): SlideCollection;
        save(path: string, format: number): void;
        dispose(): void;
    }
    
    export class SlideCollection {
        getCount(): number;
        get_Item(index: number): Slide;
    }
    
    export class Slide {
        getShapes(): ShapeCollection;
        getSlideNumber(): number;
        getLayoutSlide(): LayoutSlide;
    }
    
    export class ShapeCollection {
        getCount(): number;
        get_Item(index: number): Shape;
    }
    
    export class Shape {
        getTextFrame(): TextFrame;
        getName(): string;
        getAlternativeText(): string;
        getFillFormat(): FillFormat;
    }
    
    export class TextFrame {
        getText(): string;
        getParagraphs(): ParagraphCollection;
    }
    
    export class ParagraphCollection {
        getCount(): number;
        get_Item(index: number): Paragraph;
    }
    
    export class Paragraph {
        getText(): string;
        getPortions(): PortionCollection;
    }
    
    export class PortionCollection {
        getCount(): number;
        get_Item(index: number): Portion;
    }
    
    export class Portion {
        getText(): string;
        getPortionFormat(): PortionFormat;
    }
    
    export class PortionFormat {
        getFontHeight(): number;
        getFontBold(): boolean;
        getFontItalic(): boolean;
        getFontUnderline(): boolean;
        getFillFormat(): FillFormat;
    }
    
    export class FillFormat {
        getFillType(): number;
        getSolidFillColor(): Color;
    }
    
    export class Color {
        getR(): number;
        getG(): number;
        getB(): number;
    }
    
    export class LayoutSlide {
        getName(): string;
        getLayoutType(): number;
    }
    
    export class License {
        constructor();
        setLicense(path: string): void;
    }
    
    export enum SaveFormat {
        Pdf = 1,
        Html = 2,
        Pptx = 3,
        Json = 24
    }
}
