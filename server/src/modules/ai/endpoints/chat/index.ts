import { z } from "zod";
/**
 * Chat Endpoint - Public API Exports
 * 
 * Centralizes all exports for the AI chat endpoint.
 */

// Core processor
export { ChatProcessor } from './chat.processor';

// Type definitions
export type {
  ChatInput,
  ChatOutput,
  ChatOptions,
  ChatContext,
  ChatMessage,
  ChatRequestOptions
} from './chat.processor';

// Re-export common interfaces for convenience
export type { FeatureFlags } from '../../../shared/interfaces/base.interfaces'; 