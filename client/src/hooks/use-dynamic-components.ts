/**
 * Dynamic Components Hook
 * 
 * Manages dynamic loading and registration of components
 * Integrates with the theme system for consistent styling
 */

import React, { useState, useCallback, useMemo } from 'react';
import { useTheme } from '../lib/theme/theme-provider';
import { logger } from '../lib/utils/logger';

// =============================================================================
// TYPES AND INTERFACES
// =============================================================================

export interface ComponentDefinition {
  name: string;
  version: string;
  path?: string;
  lazy?: boolean;
  preload?: boolean;
  dependencies?: string[];
  props?: Record<string, any>;
  variants?: Record<string, string>;
  defaultVariant?: string;
  theme?: {
    extends?: string;
    overrides?: Record<string, any>;
  };
  accessibility?: {
    role?: string;
    ariaLabel?: string;
    tabIndex?: number;
  };
}

export interface ComponentRegistry {
  [key: string]: {
    definition: ComponentDefinition;
    component: React.ComponentType<any> | null;
    loading: boolean;
    error: Error | null;
    loadedAt?: Date;
    usageCount: number;
  };
}

export interface ComponentLoadOptions {
  force?: boolean;
  preloadDependencies?: boolean;
  timeout?: number;
  fallback?: React.ComponentType<any>;
}

export interface DynamicComponentsState {
  registry: ComponentRegistry;
  isLoading: boolean;
  error: string | null;
  loadedCount: number;
  totalCount: number;
}

// =============================================================================
// DYNAMIC COMPONENTS HOOK
// =============================================================================

export const useDynamicComponents = () => {
  const { registerComponent } = useTheme();
  
  const [state, setState] = useState<DynamicComponentsState>({
    registry: {},
    isLoading: false,
    error: null,
    loadedCount: 0,
    totalCount: 0,
  });

  // =============================================================================
  // COMPONENT LOADING UTILITIES
  // =============================================================================

  /**
   * Load component dynamically
   */
  const loadComponent = useCallback(async (
    definition: ComponentDefinition,
    options: ComponentLoadOptions = {}
  ): Promise<React.ComponentType<any> | null> => {
    const { name, path, lazy = true } = definition;
    const { force = false, timeout = 10000, fallback } = options;

    try {
      // Check if already loaded and not forcing reload
      if (state.registry[name]?.component && !force) {
        setState(prev => ({
          ...prev,
          registry: {
            ...prev.registry,
            [name]: {
              ...prev.registry[name],
              usageCount: prev.registry[name].usageCount + 1,
            },
          },
        }));
        return state.registry[name].component;
      }

      // Update loading state
      setState(prev => ({
        ...prev,
        isLoading: true,
        registry: {
          ...prev.registry,
          [name]: {
            definition,
            component: null,
            loading: true,
            error: null,
            usageCount: (prev.registry[name]?.usageCount || 0) + 1,
          },
        },
      }));

      logger.info('Loading dynamic component', { name, path, lazy });

      let ComponentClass: React.ComponentType<any>;

      if (path) {
        // Load from external path
        const response = await fetch(path, { 
          signal: AbortSignal.timeout(timeout),
        });
        
        if (!response.ok) {
          throw new Error(`Failed to load component: ${response.statusText}`);
        }

        const componentCode = await response.text();
        
        // Evaluate component code (in production, use safer evaluation)
        const module = eval(`(${componentCode})`);
        ComponentClass = module.default || module;
        
      } else {
        // Load from local registry or lazy import
        const importPath = `../components/dynamic/${name}`;
        
        if (lazy) {
          const module = await import(importPath);
          ComponentClass = module.default || module[name];
        } else {
          // Direct import for non-lazy components
          ComponentClass = require(importPath).default;
        }
      }

      // Register theme variants if provided
      if (definition.variants) {
        registerComponent(name, {
          variants: definition.variants,
          defaultVariant: definition.defaultVariant || 'default',
        });
      }

      // Update registry
      setState(prev => ({
        ...prev,
        isLoading: false,
        registry: {
          ...prev.registry,
          [name]: {
            definition,
            component: ComponentClass,
            loading: false,
            error: null,
            loadedAt: new Date(),
            usageCount: prev.registry[name]?.usageCount || 1,
          },
        },
        loadedCount: prev.loadedCount + 1,
      }));

      logger.info('Component loaded successfully', { 
        name, 
        loadTime: Date.now() 
      });

      return ComponentClass;

    } catch (error) {
      const errorMessage = `Failed to load component ${name}: ${error}`;
      logger.error('Component loading failed', { name, error });

      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
        registry: {
          ...prev.registry,
          [name]: {
            definition,
            component: fallback || null,
            loading: false,
            error: error as Error,
            usageCount: prev.registry[name]?.usageCount || 0,
          },
        },
      }));

      return fallback || null;
    }
  }, [state.registry, registerComponent]);

  /**
   * Load multiple components
   */
  const loadComponents = useCallback(async (
    definitions: ComponentDefinition[],
    options: ComponentLoadOptions = {}
  ): Promise<Record<string, React.ComponentType<any> | null>> => {
    const { preloadDependencies = true } = options;

    try {
      setState(prev => ({ ...prev, isLoading: true, totalCount: definitions.length }));

      const results: Record<string, React.ComponentType<any> | null> = {};

      // Sort by dependencies if preloading
      const sortedDefinitions = preloadDependencies 
        ? sortByDependencies(definitions)
        : definitions;

      // Load components in parallel or sequence based on dependencies
      if (preloadDependencies) {
        // Sequential loading respecting dependencies
        for (const definition of sortedDefinitions) {
          const component = await loadComponent(definition, options);
          results[definition.name] = component;
        }
      } else {
        // Parallel loading
        const promises = sortedDefinitions.map(async (definition) => {
          const component = await loadComponent(definition, options);
          return { name: definition.name, component };
        });

        const loadedComponents = await Promise.all(promises);
        loadedComponents.forEach(({ name, component }) => {
          results[name] = component;
        });
      }

      setState(prev => ({ ...prev, isLoading: false }));

      return results;

    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: `Batch loading failed: ${error}` 
      }));
      return {};
    }
  }, [loadComponent]);

  /**
   * Get component by name
   */
  const getComponent = useCallback((name: string): React.ComponentType<any> | null => {
    return state.registry[name]?.component || null;
  }, [state.registry]);

  /**
   * Check if component is loaded
   */
  const isComponentLoaded = useCallback((name: string): boolean => {
    return !!state.registry[name]?.component;
  }, [state.registry]);

  /**
   * Get component loading state
   */
  const getComponentState = useCallback((name: string) => {
    return state.registry[name] || null;
  }, [state.registry]);

  // =============================================================================
  // UTILITY FUNCTIONS
  // =============================================================================

  /**
   * Sort components by dependencies
   */
  const sortByDependencies = (definitions: ComponentDefinition[]): ComponentDefinition[] => {
    const sorted: ComponentDefinition[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (definition: ComponentDefinition) => {
      if (visiting.has(definition.name)) {
        throw new Error(`Circular dependency detected: ${definition.name}`);
      }
      
      if (visited.has(definition.name)) {
        return;
      }

      visiting.add(definition.name);

      // Visit dependencies first
      if (definition.dependencies) {
        for (const depName of definition.dependencies) {
          const depDef = definitions.find(d => d.name === depName);
          if (depDef) {
            visit(depDef);
          }
        }
      }

      visiting.delete(definition.name);
      visited.add(definition.name);
      sorted.push(definition);
    };

    definitions.forEach(visit);
    return sorted;
  };

  /**
   * Get component statistics
   */
  const getStatistics = useMemo(() => ({
    total: state.totalCount,
    loaded: state.loadedCount,
    loading: Object.values(state.registry).filter(entry => entry.loading).length,
    failed: Object.values(state.registry).filter(entry => entry.error).length,
    usage: Object.entries(state.registry).reduce((acc, [name, entry]) => {
      acc[name] = entry.usageCount;
      return acc;
    }, {} as Record<string, number>),
    loadingProgress: state.totalCount > 0 ? (state.loadedCount / state.totalCount) * 100 : 0,
  }), [state]);

  // =============================================================================
  // RETURN HOOK INTERFACE
  // =============================================================================

  return {
    // State
    state,
    statistics: getStatistics,
    
    // Component management
    loadComponent,
    loadComponents,
    getComponent,
    isComponentLoaded,
    getComponentState,
    
    // Registry access
    registry: state.registry,
    availableComponents: Object.keys(state.registry),
    loadedComponents: Object.entries(state.registry)
      .filter(([, entry]) => entry.component)
      .map(([name]) => name),
  };
};

export default useDynamicComponents; 