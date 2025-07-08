/**
 * Color Formatter - Screaming Architecture Frontend
 * 🎯 RESPONSIBILITY: Format colors from Universal JSON Schema
 * 📋 SCOPE: ColorFormat to CSS/display format
 */

import { ColorFormat } from '@/types/universal-json';

export function formatColorToCss(color: ColorFormat): string {
  switch (color.type) {
    case 'RGB':
      return `rgba(${color.r || 0}, ${color.g || 0}, ${color.b || 0}, ${color.alpha})`;
    
    case 'HSL':
      return `hsla(${color.hue || 0}, ${color.saturation || 0}%, ${color.lightness || 0}%, ${color.alpha})`;
    
    case 'Scheme':
      // Map scheme colors to approximate CSS equivalents
      const schemeMap: Record<string, string> = {
        'accent1': '#4F46E5',
        'accent2': '#06B6D4',
        'accent3': '#10B981',
        'accent4': '#F59E0B',
        'accent5': '#EF4444',
        'accent6': '#8B5CF6',
        'dark1': '#1F2937',
        'dark2': '#374151',
        'light1': '#F9FAFB',
        'light2': '#F3F4F6',
        'hyperlink': '#2563EB',
        'followedHyperlink': '#7C3AED',
      };
      return schemeMap[color.schemeColor || 'accent1'] || '#4F46E5';
    
    case 'System':
      // Map system colors to CSS equivalents
      const systemMap: Record<string, string> = {
        'windowText': '#000000',
        'window': '#FFFFFF',
        'highlight': '#0078D4',
        'highlightText': '#FFFFFF',
      };
      return systemMap[color.systemColor || 'windowText'] || '#000000';
    
    default:
      return '#000000';
  }
}

export function formatColorToHex(color: ColorFormat): string {
  const cssColor = formatColorToCss(color);
  
  // Convert rgba to hex if possible
  if (cssColor.startsWith('rgba(')) {
    const match = cssColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (match) {
      const r = parseInt(match[1]);
      const g = parseInt(match[2]);
      const b = parseInt(match[3]);
      
      return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }
  }
  
  return cssColor;
}

export function formatColorName(color: ColorFormat): string {
  switch (color.type) {
    case 'RGB':
      return `RGB(${color.r}, ${color.g}, ${color.b})`;
    
    case 'HSL':
      return `HSL(${color.hue}°, ${color.saturation}%, ${color.lightness}%)`;
    
    case 'Scheme':
      return color.schemeColor || 'Unknown Scheme';
    
    case 'System':
      return color.systemColor || 'Unknown System';
    
    default:
      return 'Unknown Color';
  }
}

export function getColorLuminance(color: ColorFormat): number {
  // Convert to RGB first
  let r = 0, g = 0, b = 0;
  
  if (color.type === 'RGB') {
    r = color.r || 0;
    g = color.g || 0;
    b = color.b || 0;
  } else if (color.type === 'HSL') {
    // Convert HSL to RGB
    const h = (color.hue || 0) / 360;
    const s = (color.saturation || 0) / 100;
    const l = (color.lightness || 0) / 100;
    
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    
    if (s === 0) {
      r = g = b = l; // achromatic
    } else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3) * 255;
      g = hue2rgb(p, q, h) * 255;
      b = hue2rgb(p, q, h - 1/3) * 255;
    }
  }
  
  // Calculate relative luminance
  const sRGB = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  
  return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
}

export function getContrastRatio(color1: ColorFormat, color2: ColorFormat): number {
  const lum1 = getColorLuminance(color1);
  const lum2 = getColorLuminance(color2);
  
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  
  return (lighter + 0.05) / (darker + 0.05);
}

export function isColorDark(color: ColorFormat): boolean {
  return getColorLuminance(color) < 0.5;
}

export function getReadableTextColor(backgroundColor: ColorFormat): string {
  return isColorDark(backgroundColor) ? '#FFFFFF' : '#000000';
} 