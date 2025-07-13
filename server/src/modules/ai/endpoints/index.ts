import { z } from "zod";
/**
 * AI Module Endpoints - Consolidated Exports
 * 
 * Provides a single entry point for all AI endpoints.
 * Each endpoint follows the hybrid granularity pattern with its own subfolder.
 */

// Chat Endpoint
export * from './chat';

// Future endpoints can be added here:
// export * from './translate';  (currently inline in ai.factory.ts)
// export * from './analyze';    (currently inline in ai.factory.ts)  
// export * from './suggestions';
// export * from './enhance'; 