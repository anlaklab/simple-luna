/**
 * Base Interfaces - CrewAI/LangChain Style Architecture
 * 
 * Provides extensible base classes and interfaces for Luna's modular architecture.
 * Each feature module extends these base interfaces for consistency and reusability.
 */

import { Request, Response } from 'express';

// =============================================================================
// BASE PROCESSOR INTERFACE (CrewAI/LangChain Style)
// =============================================================================

export interface BaseProcessor<TInput, TOutput, TOptions = any> {
  name: string;
  version: string;
  description: string;
  
  // Core processing method
  process(input: TInput, options?: TOptions): Promise<TOutput>;
  
  // Lifecycle hooks
  initialize?(): Promise<void>;
  validate?(input: TInput, options?: TOptions): Promise<boolean>;
  cleanup?(): Promise<void>;
  
  // Metadata and introspection
  getCapabilities(): string[];
  getRequiredDependencies(): string[];
  isAvailable(): boolean;
}

// =============================================================================
// BASE SERVICE INTERFACE
// =============================================================================

export interface BaseService {
  readonly name: string;
  readonly version: string;
  
  initialize?(): Promise<void>;
  healthCheck(): Promise<ServiceHealth>;
  dispose?(): Promise<void>;
}

export interface ServiceHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastCheck: Date;
  details?: Record<string, any>;
  errors?: string[];
}

// =============================================================================
// BASE CONTROLLER INTERFACE
// =============================================================================

export interface BaseController {
  readonly module: string;
  readonly endpoints: string[];
  
  // Common handler methods
  handleRequest(req: Request, res: Response): Promise<void>;
  handleError(error: Error, req: Request, res: Response): Promise<void>;
  validateRequest?(req: Request): Promise<boolean>;
}

// =============================================================================
// BASE ADAPTER INTERFACE (External Service Integration)
// =============================================================================

export interface BaseAdapter<TConfig = any> {
  readonly name: string;
  readonly type: 'external_api' | 'database' | 'file_system' | 'library';
  
  initialize(config: TConfig): Promise<void>;
  isConnected(): boolean;
  healthCheck(): Promise<ServiceHealth>;
  disconnect?(): Promise<void>;
}

// =============================================================================
// FACTORY INTERFACES
// =============================================================================

export interface BaseFactory<T> {
  create(type: string, options?: any): T;
  register(type: string, creator: () => T): void;
  getAvailableTypes(): string[];
}

// =============================================================================
// PROCESSING PIPELINE INTERFACES (LangChain Style)
// =============================================================================

export interface PipelineStep<TInput, TOutput> {
  name: string;
  execute(input: TInput, context: PipelineContext): Promise<TOutput>;
  canExecute?(input: TInput, context: PipelineContext): boolean;
}

export interface PipelineContext {
  requestId: string;
  userId?: string;
  metadata: Record<string, any>;
  startTime: Date;
  steps: string[];
}

export interface Pipeline<TInput, TOutput> {
  name: string;
  steps: PipelineStep<any, any>[];
  
  execute(input: TInput, context?: Partial<PipelineContext>): Promise<TOutput>;
  addStep<TStepInput, TStepOutput>(step: PipelineStep<TStepInput, TStepOutput>): Pipeline<TInput, TOutput>;
  validate(): boolean;
}

// =============================================================================
// EXTENSION INTERFACES (Feature Module Extensions)
// =============================================================================

export interface ModuleExtension {
  readonly moduleName: string;
  readonly extensionName: string;
  readonly dependencies: string[];
  
  register(): Promise<void>;
  unregister?(): Promise<void>;
  configure?(config: any): Promise<void>;
}

export interface ProcessorExtension<TInput, TOutput> extends ModuleExtension {
  processor: BaseProcessor<TInput, TOutput>;
  enhance(baseProcessor: BaseProcessor<TInput, TOutput>): BaseProcessor<TInput, TOutput>;
}

// =============================================================================
// COMMON RESPONSE INTERFACES
// =============================================================================

export interface BaseResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    type: string;
    code: string;
    message: string;
    details?: any;
  };
  meta: {
    timestamp: string;
    requestId: string;
    processingTimeMs: number;
    version: string;
  };
}

export interface PaginatedResponse<T> extends BaseResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// =============================================================================
// MODULE REGISTRATION INTERFACE
// =============================================================================

export interface ModuleDefinition {
  name: string;
  version: string;
  description: string;
  dependencies: string[];
  
  services: Map<string, BaseService>;
  controllers: Map<string, BaseController>;
  adapters: Map<string, BaseAdapter>;
  processors: Map<string, BaseProcessor<any, any>>;
  
  initialize(): Promise<void>;
  dispose?(): Promise<void>;
}

// =============================================================================
// TOGGLEABLE FEATURES INTERFACE (for modularidad via params)
// =============================================================================

export interface FeatureFlags {
  extractAssets?: boolean;
  includeMetadata?: boolean;
  enableAI?: boolean;
  cacheResults?: boolean;
  validateInput?: boolean;
  generateThumbnails?: boolean;
  mode?: 'local' | 'cloud' | 'hybrid';
}

export interface ToggleableProcessor<TInput, TOutput, TOptions = any> extends BaseProcessor<TInput, TOutput, TOptions> {
  features: FeatureFlags;
  
  processWithFeatures(
    input: TInput, 
    options?: TOptions, 
    features?: Partial<FeatureFlags>
  ): Promise<TOutput>;
} 