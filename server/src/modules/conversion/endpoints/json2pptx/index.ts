/**
 * JSON2PPTX Endpoint - Public API Exports
 * 
 * Centralizes all exports for the JSON2PPTX conversion endpoint.
 */

// Core processor
export { JSON2PPTXProcessor } from './json2pptx.processor';

// Type definitions
export type {
  JSON2PPTXInput,
  JSON2PPTXOutput,
  JSON2PPTXOptions
} from './json2pptx.processor';

// Re-export common interfaces for convenience
export type { FeatureFlags } from '../../../shared/interfaces/base.interfaces'; 