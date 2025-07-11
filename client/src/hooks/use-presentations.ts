/**
 * Presentations Hook - Unified API Layer
 * 🎯 RESPONSIBILITY: Presentation data management and operations
 * 📋 SCOPE: CRUD operations, search, filtering, state management
 * ⚡ USES: Unified API layer from use-api.ts
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/hooks/use-api";
import type { ApiResponse, PaginatedResponse } from "@/hooks/use-api";
import { useMemo, useState, useCallback } from "react";

export interface Presentation {
  id: string;
  title: string;
  description?: string;
  author?: string;
  company?: string;
  status: "pending" | "processing" | "completed" | "failed" | "draft";
  slideCount: number;
  fileSize?: number;
  thumbnailUrl?: string;
  createdAt: string;
  updatedAt: string;
  processing?: {
    status: string;
    conversionStatus: string;
    thumbnailStatus: string;
    lastProcessed: string;
    processingTime: number;
    errors: string[];
  };
  metadata?: {
    audioCount?: number;
    imageCount?: number;
    layoutSlideCount?: number;
    masterSlideCount?: number;
    revisionNumber?: number;
    subject?: string;
    category?: string;
    keywords?: string;
    comments?: string;
    lastSavedTime?: string;
    manager?: string;
  };
  firebaseStorageUrl?: string;
  jsonDataUrl?: string;
  thumbnailCount?: number;
  originalFilename?: string;
  type?: string;
  tags?: string[];
  isPublic?: boolean;
  allowDownload?: boolean;
}

export interface PresentationFilters {
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'title' | 'slideCount' | 'fileSize';
  sortOrder?: 'asc' | 'desc';
  author?: string;
  company?: string;
  status?: Presentation['status'];
  minSlideCount?: number;
  maxSlideCount?: number;
  tags?: string[];
  dateFrom?: string;
  dateTo?: string;
}

export interface SearchParams {
  q: string;
  page?: number;
  limit?: number;
  searchIn?: ('title' | 'content' | 'tags' | 'author' | 'company')[];
}

export interface CreatePresentationData {
  file: File;
  title?: string;
  description?: string;
  tags?: string[];
  generateThumbnails?: boolean;
  processImmediately?: boolean;
}

export interface UpdatePresentationData {
  title?: string;
  description?: string;
  tags?: string[];
  category?: string;
  isPublic?: boolean;
  allowDownload?: boolean;
}

// =============================================================================
// MAIN PRESENTATIONS HOOK
// =============================================================================

export function usePresentations(filters: PresentationFilters = {}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Default filters
  const defaultFilters: PresentationFilters = {
    page: 1,
    limit: 20,
    sortBy: 'updatedAt',
    sortOrder: 'desc',
    ...filters,
  };

  // Get presentations list with filtering and pagination
  const {
    data: presentationsResponse,
    isLoading: isPresentationsLoading,
    error: presentationsError,
    refetch: refetchPresentations,
  } = useQuery({
    queryKey: ['presentations', defaultFilters],
    queryFn: async () => {
      const response = await api.presentations.list(defaultFilters);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch presentations');
      }
      return response;
    },
    staleTime: 30000, // Consider data fresh for 30 seconds
    gcTime: 300000,   // Keep in cache for 5 minutes
  });

  // Fix data and pagination extraction
  const presentations = presentationsResponse?.data || [];
  const pagination = presentationsResponse?.data?.pagination || {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  };

  // Fix computed properties
  const computed = useMemo(() => ({
    // Fix pagination property access
    totalCount: pagination.total || 0,
    pageCount: pagination.totalPages || 0,
    hasNextPage: pagination.hasNextPage || false,
    hasPreviousPage: pagination.hasPreviousPage || false,
    
    // Other computed properties
    isLoading: isPresentationsLoading,
    error: presentationsError,
    
    // Ensure presentations is always an array
    presentations: Array.isArray(presentations) ? presentations : [],
  }), [presentations, pagination, isPresentationsLoading, presentationsError]);

  // Create presentation mutation
  const createPresentationMutation = useMutation({
    mutationFn: async (data: CreatePresentationData) => {
      const formData = new FormData();
      formData.append('file', data.file);
      if (data.title) formData.append('title', data.title);
      if (data.description) formData.append('description', data.description);
      if (data.tags) formData.append('tags', data.tags.join(','));
      formData.append('generateThumbnails', String(data.generateThumbnails ?? true));
      formData.append('processImmediately', String(data.processImmediately ?? true));

      const response = await fetch('/api/v1/presentations', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to create presentation');
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Presentation Created",
        description: `"${data.data?.title || 'New presentation'}" has been uploaded and is being processed.`,
      });
      
      // Invalidate and refetch presentations
      queryClient.invalidateQueries({ queryKey: ['presentations'] });
      queryClient.invalidateQueries({ queryKey: ['presentations-search'] });
    },
    onError: (error) => {
      console.error('Create presentation error:', error);
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to create presentation. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update presentation mutation
  const updatePresentationMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdatePresentationData }) => {
      const response = await fetch(`/api/v1/presentations/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to update presentation');
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      toast({
        title: "Presentation Updated",
        description: "Presentation metadata has been updated successfully.",
      });
      
      // Update specific presentation in cache
      queryClient.setQueryData(['presentation', variables.id], data.data);
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: ['presentations'] });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update presentation. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete presentation mutation
  const deletePresentationMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/v1/presentations/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to delete presentation');
      }

      return response.json();
    },
    onSuccess: (_, id) => {
      toast({
        title: "Presentation Deleted",
        description: "Presentation has been permanently deleted.",
      });
      
      // Remove from cache
      queryClient.removeQueries({ queryKey: ['presentation', id] });
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: ['presentations'] });
    },
    onError: (error) => {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete presentation. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const response = await fetch('/api/v1/presentations/bulk/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ presentationIds: ids }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to delete presentations');
      }

      return response.json();
    },
    onSuccess: (data) => {
      const deletedCount = data.data?.successful?.length || 0;
      toast({
        title: "Presentations Deleted",
        description: `${deletedCount} presentation(s) have been deleted.`,
      });
      
      // Invalidate all presentation queries
      queryClient.invalidateQueries({ queryKey: ['presentations'] });
    },
    onError: (error) => {
      toast({
        title: "Bulk Delete Failed",
        description: error.message || "Failed to delete presentations. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Fix the presentations data access
  const {
    data: searchResponse,
    isLoading: isSearchLoading,
    error: searchError,
  } = useQuery({
    queryKey: ['presentations-search', defaultFilters],
    queryFn: async () => {
      const response = await api.presentations.search(defaultFilters);
      if (!response.success) {
        throw new Error(response.error || 'Search failed');
      }
      return response;
    },
    enabled: !!defaultFilters.q && defaultFilters.q.length > 0,
    staleTime: 30000,
  });

  // Fix search results pagination
  const searchResults = searchResponse?.data;
  const searchPagination = searchResponse?.data?.pagination || {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  };

  // Add generateThumbnails method
  const generateThumbnails = useCallback(async (presentationId: string) => {
    try {
      setIsGeneratingThumbnails(true);
      const response = await api.presentations.generateThumbnails(presentationId);
      return response.data;
    } catch (error) {
      console.error('Failed to generate thumbnails:', error);
      throw error;
    } finally {
      setIsGeneratingThumbnails(false);
    }
  }, []);

  // Add isGeneratingThumbnails state
  const [isGeneratingThumbnails, setIsGeneratingThumbnails] = useState(false);

  return {
    // Data
    presentations: computed.presentations,
    pagination: computed.pagination,
    
    // Loading states
    isLoading: computed.isLoading,
    isCreating: createPresentationMutation.isPending,
    isUpdating: updatePresentationMutation.isPending,
    isDeleting: deletePresentationMutation.isPending,
    isBulkDeleting: bulkDeleteMutation.isPending,
    isGeneratingThumbnails,
    
    // Error states
    error: computed.error,
    
    // Actions
    createPresentation: createPresentationMutation.mutate,
    updatePresentation: updatePresentationMutation.mutate,
    deletePresentation: deletePresentationMutation.mutate,
    bulkDelete: bulkDeleteMutation.mutate,
    refetch: refetchPresentations,
    
    // Statistics
    totalCount: computed.totalCount,
    pageCount: computed.pageCount,
    hasNextPage: computed.hasNextPage,
    hasPreviousPage: computed.hasPreviousPage,
    generateThumbnails,
  };
}

// =============================================================================
// INDIVIDUAL PRESENTATION HOOK
// =============================================================================

export function usePresentation(id: string | null) {
  const { toast } = useToast();

  const query = useQuery<Presentation>({
    queryKey: ['presentation', id],
    queryFn: async () => {
      if (!id) throw new Error('No presentation ID provided');
      
      const response = await api.presentations.get(id);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch presentation');
      }
      return response.data;
    },
    enabled: !!id,
    staleTime: 60000, // Consider data fresh for 1 minute
    retry: (failureCount, error) => {
      // Don't retry on 404 errors
      if (error.message.includes('404')) return false;
      return failureCount < 3;
    },
    refetchInterval: (query) => {
      // Poll if still processing
      const data = query.state.data;
      return data?.status === 'processing' ? 5000 : false;
    },
  });

  return {
    presentation: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    isRefetching: query.isRefetching,
  };
}

// =============================================================================
// SEARCH HOOK
// =============================================================================

export function usePresentationSearch(params: SearchParams) {
  const defaultParams: SearchParams = {
    page: 1,
    limit: 20,
    searchIn: ['title', 'content', 'tags'],
    ...params,
  };

  return useQuery({
    queryKey: ['presentations-search', defaultParams],
    queryFn: async () => {
      const response = await api.presentations.search(defaultParams);
      if (!response.success) {
        throw new Error(response.error || 'Search failed');
      }
      return response;
    },
    enabled: !!params.q && params.q.length > 0,
    staleTime: 30000,
  });
}

// =============================================================================
// ANALYTICS HOOK
// =============================================================================

export function usePresentationAnalytics(id: string | null) {
  return useQuery({
    queryKey: ['presentation-analytics', id],
    queryFn: async () => {
      if (!id) throw new Error('No presentation ID provided');
      
      const response = await fetch(`/api/v1/presentations/${id}/analytics`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to fetch analytics');
      }
      return response.json();
    },
    enabled: !!id,
    staleTime: 300000, // 5 minutes
  });
}

// =============================================================================
// VERSIONS HOOK
// =============================================================================

export function usePresentationVersions(id: string | null) {
  return useQuery({
    queryKey: ['presentation-versions', id],
    queryFn: async () => {
      if (!id) throw new Error('No presentation ID provided');
      
      const response = await api.presentations.getVersions(id);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch versions');
      }
      return response.data;
    },
    enabled: !!id,
    staleTime: 60000, // 1 minute
  });
}

// =============================================================================
// UTILITY HOOKS
// =============================================================================

export function usePresentationActions() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const generateThumbnails = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/v1/presentations/${id}/thumbnails`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to generate thumbnails');
      }
      
      return response.json();
    },
    onSuccess: (_, id) => {
      toast({
        title: "Thumbnails Generated",
        description: "Slide thumbnails are being generated in the background.",
      });
      
      // Invalidate presentation data
      queryClient.invalidateQueries({ queryKey: ['presentation', id] });
    },
    onError: (error) => {
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate thumbnails.",
        variant: "destructive",
      });
    },
  });

  const exportPresentation = useMutation({
    mutationFn: async ({ id, format }: { id: string; format: 'pdf' | 'pptx' | 'json' }) => {
      const response = await fetch(`/api/v1/presentations/${id}/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ format }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to export presentation');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Export Ready",
        description: "Your presentation export is ready for download.",
      });
    },
    onError: (error) => {
      toast({
        title: "Export Failed",
        description: error.message || "Failed to export presentation.",
        variant: "destructive",
      });
    },
  });

  return {
    generateThumbnails: generateThumbnails.mutate,
    exportPresentation: exportPresentation.mutate,
    isGeneratingThumbnails: generateThumbnails.isPending,
    isExporting: exportPresentation.isPending,
  };
}