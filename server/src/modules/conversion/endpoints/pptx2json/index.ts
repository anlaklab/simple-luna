import { z } from "zod";
/**
 * PPTX2JSON Endpoint - Public API Exports
 * 
 * Centralizes all exports for the PPTX to JSON conversion endpoint.
 */

// Core processor
export { PPTX2JSONProcessor } from './pptx2json.processor';

// Type definitions
export type {
  PPTX2JSONInput,
  PPTX2JSONOutput,
  PPTX2JSONOptions
} from './pptx2json.processor';

// Re-export common interfaces for convenience
export type { FeatureFlags } from '../../../shared/interfaces/base.interfaces'; 