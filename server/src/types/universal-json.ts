/**
 * Universal JSON Types
 * Core types for the universal presentation schema
 */

export interface UniversalPresentation {
  id: string;
  title: string;
  author: string;
  createdAt: Date;
  updatedAt: Date;
  slides: UniversalSlide[];
  metadata: PresentationMetadata;
}

export interface UniversalSlide {
  id: string;
  index: number;
  title?: string;
  layout: string;
  background?: SlideBackground;
  shapes: UniversalShape[];
  animations?: Animation[];
  transitions?: Transition[];
}

export interface UniversalShape {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  zOrder?: number;
  properties: Record<string, any>;
}

export interface SlideBackground {
  type: 'solid' | 'gradient' | 'image' | 'pattern';
  color?: string;
  image?: string;
  properties?: Record<string, any>;
}

export interface Animation {
  id: string;
  type: string;
  targetShapeId: string;
  duration: number;
  delay?: number;
  properties: Record<string, any>;
}

export interface Transition {
  type: string;
  duration: number;
  properties?: Record<string, any>;
}

export interface PresentationMetadata {
  title: string;
  author: string;
  subject?: string;
  keywords?: string[];
  description?: string;
  category?: string;
  company?: string;
  slideCount: number;
  fileSize: number;
  version: string;
} 