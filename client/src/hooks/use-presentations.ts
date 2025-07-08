import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import React from 'react';

export interface Presentation {
  id: string; // String ID to match Firebase
  title: string;
  description: string;
  status: "generating" | "completed" | "error";
  slides: any[];
  template?: string;
  userId?: string | null;
  createdAt: string;
  updatedAt: string;
  thumbnailsGenerated?: boolean;
  slideCount: number;
  author?: string;
  company?: string;
}

export function usePresentations() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get all presentations using correct Firebase API
  const { data: presentations = [], isLoading } = useQuery({
    queryKey: ["/api/v1/presentations"],
    queryFn: async () => {
      const response = await fetch("http://localhost:3000/api/v1/presentations");
      if (!response.ok) {
        throw new Error("Failed to fetch presentations");
      }
      const data = await response.json();
      return data.data || [];
    },
    enabled: true,
  });

  // Create presentation mutation using AI generation
  const createPresentationMutation = useMutation({
    mutationFn: async (data: {
      description: string;
      template?: string;
      slides?: number;
      style?: string;
    }) => {
      const response = await apiRequest("POST", "/api/v1/ai/generate-presentation", data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Presentation Created",
        description: "Your presentation is being generated...",
      });
      
      // Invalidate presentations query
      queryClient.invalidateQueries({
        queryKey: ["/api/v1/presentations"],
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create presentation. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Export presentation mutation (placeholder)
  const exportPresentationMutation = useMutation({
    mutationFn: async (presentationId: string) => {
      // TODO: Implement export functionality
      throw new Error("Export functionality not yet implemented");
    },
    onSuccess: (blob, presentationId) => {
      toast({
        title: "Export Successful",
        description: "Your presentation has been downloaded.",
      });
    },
    onError: (error) => {
      toast({
        title: "Export Failed",
        description: "Failed to export presentation. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Generate thumbnails mutation (placeholder)
  const generateThumbnailsMutation = useMutation({
    mutationFn: async (presentationId: string) => {
      // TODO: Implement thumbnail generation
      throw new Error("Thumbnail generation not yet implemented");
    },
    onSuccess: (result, presentationId) => {
      toast({
        title: "Thumbnails Generated",
        description: `Generated slide thumbnails`,
      });
      
      // Invalidate queries to refresh the presentation data
      queryClient.invalidateQueries({
        queryKey: [`/api/v1/presentations/${presentationId}`],
      });
    },
    onError: (error, presentationId) => {
      toast({
        title: "Thumbnail Generation Failed", 
        description: "Could not generate slide thumbnails. They can be generated later.",
        variant: "destructive",
      });
    },
  });

  return {
    presentations,
    isLoading,
    createPresentation: createPresentationMutation.mutate,
    exportPresentation: exportPresentationMutation.mutate,
    generateThumbnails: generateThumbnailsMutation.mutate,
    isCreating: createPresentationMutation.isPending,
    isExporting: exportPresentationMutation.isPending,
    isGeneratingThumbnails: generateThumbnailsMutation.isPending,
  };
}

// Hook to get a specific presentation using correct Firebase API
export function usePresentation(id: string | null) {
  const { generateThumbnails } = usePresentations();
  
  const query = useQuery<Presentation>({
    queryKey: [`/api/v1/presentations/${id}`],
    queryFn: async () => {
      if (!id) throw new Error("No presentation ID provided");
      
      const response = await fetch(`http://localhost:3000/api/v1/presentations/${id}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch presentation: ${response.statusText}`);
      }
      const data = await response.json();
      return data.data;
    },
    enabled: !!id,
    refetchInterval: (query) => {
      // Poll if still generating
      const data = query.state.data;
      return data?.status === "generating" ? 2000 : false;
    },
  });

  return query;
}