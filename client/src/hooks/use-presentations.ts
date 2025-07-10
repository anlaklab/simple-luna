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

  return {
    presentations,
    isLoading,
    createPresentation: createPresentationMutation.mutate,
    isCreating: createPresentationMutation.isPending,
  };
}

// Hook to get a specific presentation using correct Firebase API
export function usePresentation(id: string | null) {  
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