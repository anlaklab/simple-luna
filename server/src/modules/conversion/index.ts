import { z } from "zod";
/**
 * Conversion Module - Main Exports
 * 
 * Provides the primary API for the Conversion module with all its endpoints,
 * factories, and interfaces.
 */

// Module definition
export { ConversionModule } from './conversion.module';

// Factory exports
export { ConversionFactory, conversionFactory } from './factories/conversion.factory';

// All endpoints
export * from './endpoints';

// Convenience re-exports for common interfaces
export type { FeatureFlags } from '../shared/interfaces/base.interfaces'; 