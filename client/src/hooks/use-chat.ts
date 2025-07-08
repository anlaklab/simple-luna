import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface ChatMessage {
  id: number;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
  presentationId: string | null;
}

interface UseChatProps {
  presentationId: string | null;
  onPresentationCreate: (id: string) => void;
}

export function useChat({ presentationId, onPresentationCreate }: UseChatProps) {
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);
  const queryClient = useQueryClient();

  // Fetch existing messages if we have a presentation ID
  const { data: existingMessages = [] } = useQuery({
    queryKey: ["/api/v1/presentations", presentationId, "messages"],
    queryFn: async () => {
      if (!presentationId) return [];
      
      // For now, return empty array - we'll implement conversation endpoints later
      // const response = await apiRequest("GET", `/api/v1/presentations/${presentationId}/messages`);
      // return response.json();
      return [];
    },
    enabled: !!presentationId,
  });

  // Combine server messages with local messages
  const messages = presentationId ? existingMessages : localMessages;

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (presentationId) {
        // For existing presentations, add to conversation (TODO: implement conversation endpoint)
        throw new Error("Conversation with existing presentations not yet implemented");
      } else {
        // Create new presentation using AI generation
        const response = await apiRequest("POST", "/api/v1/ai/generate-presentation", {
          description: content,
          slides: 8,
          style: "professional",
        });
        return response.json();
      }
    },
    onSuccess: (data) => {
      console.log("📥 AI Generation Response:", data);
      
      if (presentationId) {
        // Invalidate messages query to refetch
        queryClient.invalidateQueries({
          queryKey: ["/api/v1/presentations", presentationId, "messages"],
        });
      } else {
        // New presentation created - extract ID from response
        const responseData = data.data || data;
        const newId = responseData.presentationId || responseData.id || data.presentationId || data.id;
        
        if (newId) {
          console.log("✅ Presentation created with ID:", newId);
          onPresentationCreate(newId);
          
          // Clear local messages since we're switching to server-managed conversation
          setLocalMessages([]);
          
          // Invalidate presentations list to show the new one
          queryClient.invalidateQueries({
            queryKey: ["/api/v1/presentations"],
          });
          
          // Also invalidate the specific presentation query
          queryClient.invalidateQueries({
            queryKey: [`/api/v1/presentations/${newId}`],
          });
          
          console.log("🔄 Invalidated presentation queries for live update");
        } else {
          console.error("❌ No presentation ID found in response:", data);
        }
      }
    },
    onError: (error) => {
      console.error("Error sending message:", error);
    },
  });

  // Send a message
  const sendMessage = useCallback(async (content: string) => {
    if (!presentationId) {
      // For new conversations, add to local state immediately
      const userMessage: ChatMessage = {
        id: Date.now(),
        content,
        role: "user",
        timestamp: new Date(),
        presentationId: null,
      };
      setLocalMessages(prev => [...prev, userMessage]);
    }

    try {
      await sendMessageMutation.mutateAsync(content);
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  }, [presentationId, sendMessageMutation]);

  return {
    messages,
    sendMessage,
    isLoading: sendMessageMutation.isPending,
  };
}
