/**
 * File Size Formatter - Screaming Architecture Frontend
 * 🎯 RESPONSIBILITY: Format file sizes for display
 * 📋 SCOPE: Bytes to human-readable format
 */

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

export function formatFileSizeDetailed(bytes: number): { value: number; unit: string; formatted: string } {
  if (bytes === 0) return { value: 0, unit: 'B', formatted: '0 B' };
  
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = Math.round(bytes / Math.pow(1024, i) * 100) / 100;
  const unit = sizes[i];
  
  return {
    value,
    unit,
    formatted: `${value} ${unit}`,
  };
}

export function formatBytesToMB(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

export function formatBytesToKB(bytes: number): string {
  return (bytes / 1024).toFixed(2) + ' KB';
} 