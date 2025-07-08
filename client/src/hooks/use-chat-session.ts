import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export interface ChatMessage {
  messageId: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string | Date;
  metadata?: {
    promptTokens?: number;
    completionTokens?: number;
    model?: string;
    temperature?: number;
    processingTimeMs?: number;
    validationResult?: any;
  };
}

export interface ChatSession {
  sessionId: string;
  title: string;
  userId: string | null;
  status: "active" | "archived" | "deleted";
  isBookmarked: boolean;
  tags: string[];
  messages: ChatMessage[];
  messageCount: number;
  userMessageCount: number;
  assistantMessageCount: number;
  totalTokensUsed: number;
  generatedPresentations: Array<{
    presentationId: string;
    generatedAt: string;
    title: string;
    description: string;
    slideCount: number;
  }>;
  createdAt: string | Date;
  updatedAt: string | Date;
  lastActiveAt: string | Date;
  settings: {
    aiModel: string;
    temperature: number;
    maxTokens: number;
    systemPrompt?: string;
    autoSave: boolean;
    notifications: boolean;
  };
}

interface UseChatSessionProps {
  sessionId?: string | null;
  userId?: string | null;
  autoCreateSession?: boolean;
  onSessionCreate?: (sessionId: string) => void;
  onPresentationCreate?: (presentationId: string) => void;
}

export function useChatSession({
  sessionId: initialSessionId,
  userId = null,
  autoCreateSession = true,
  onSessionCreate,
  onPresentationCreate
}: UseChatSessionProps = {}) {
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(initialSessionId || null);
  const queryClient = useQueryClient();

  // Get current session data
  const { 
    data: session, 
    isLoading: isLoadingSession,
    error: sessionError 
  } = useQuery({
    queryKey: ["/api/v1/sessions", currentSessionId],
    queryFn: async () => {
      if (!currentSessionId) return null;
      const response = await apiRequest("GET", `/api/v1/sessions/${currentSessionId}`);
      const data = await response.json();
      return data.data as ChatSession;
    },
    enabled: !!currentSessionId,
    retry: (failureCount, error: any) => {
      // Don't retry if session not found
      return error?.message?.includes('404') ? false : failureCount < 3;
    }
  });

  // Get user sessions list
  const {
    data: sessionsData,
    isLoading: isLoadingSessions
  } = useQuery({
    queryKey: ["/api/v1/sessions", "list", userId],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/v1/sessions", {
        userId: userId || null,
        limit: 50,
        status: "active",
        orderBy: "lastActiveAt",
        orderDirection: "desc"
      });
      const data = await response.json();
      return data;
    },
    staleTime: 30000, // 30 seconds
  });

  // Create new session mutation
  const createSessionMutation = useMutation({
    mutationFn: async (options: {
      title?: string;
      firstMessage?: string;
      tags?: string[];
      settings?: Partial<ChatSession['settings']>;
    } = {}) => {
      const response = await apiRequest("POST", "/api/v1/sessions", {
        userId,
        title: options.title,
        firstMessage: options.firstMessage,
        tags: options.tags || [],
        settings: options.settings || {}
      });
      return response.json();
    },
    onSuccess: (data) => {
      const newSessionId = data.data.sessionId;
      console.log("✅ Created new chat session:", newSessionId);
      
      setCurrentSessionId(newSessionId);
      onSessionCreate?.(newSessionId);
      
      // Invalidate sessions list
      queryClient.invalidateQueries({
        queryKey: ["/api/v1/sessions", "list", userId]
      });
    },
    onError: (error) => {
      console.error("❌ Failed to create session:", error);
    }
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ content, sessionId: targetSessionId }: { content: string; sessionId?: string }) => {
      const useSessionId = targetSessionId || currentSessionId;
      
      if (!useSessionId) {
        throw new Error("No session available to send message");
      }

      // Add user message
      const userMessageResponse = await apiRequest("POST", `/api/v1/sessions/${useSessionId}/messages`, {
        role: "user",
        content,
        metadata: {}
      });

      const userMessageData = await userMessageResponse.json();
      
      // Generate AI response - check if this is a presentation request
      const isPresentationRequest = content.toLowerCase().includes('presentation') || 
                                  content.toLowerCase().includes('slides') ||
                                  content.toLowerCase().includes('generate') ||
                                  content.toLowerCase().includes('create');

      if (isPresentationRequest) {
        // Generate presentation using AI
        const aiResponse = await apiRequest("POST", "/api/v1/ai/generate-presentation", {
          description: content,
          slides: 8,
          style: "professional"
        });
        
        const aiData = await aiResponse.json();
        
        if (aiData.success) {
          const presentationId = aiData.data.presentationId || aiData.data.id;
          
          // Add AI response message
          const aiMessageResponse = await apiRequest("POST", `/api/v1/sessions/${useSessionId}/messages`, {
            role: "assistant",
            content: `I've created a presentation for you: "${aiData.data.title}". It contains ${aiData.data.slideCount} slides and follows the ${aiData.data.style || 'professional'} style. The presentation has been generated using the Universal PowerPoint Schema and is ready for use.`,
            metadata: {
              model: "gpt-4",
              processingTimeMs: aiData.meta?.processingTimeMs || 0,
              validationResult: aiData.meta?.schemaCompliant ? "valid" : "invalid"
            }
          });

          // Add presentation reference to session
          await apiRequest("POST", `/api/v1/sessions/${useSessionId}/presentations`, {
            presentationId,
            title: aiData.data.title,
            description: aiData.data.description,
            slideCount: aiData.data.slideCount
          });

          onPresentationCreate?.(presentationId);
          
          // Invalidate presentations list
          queryClient.invalidateQueries({
            queryKey: ["/api/v1/presentations"]
          });

          return {
            userMessage: userMessageData,
            aiMessage: await aiMessageResponse.json(),
            presentation: aiData.data
          };
        }
      } else {
        // Regular AI conversation (would need OpenAI integration)
        const aiMessageResponse = await apiRequest("POST", `/api/v1/sessions/${useSessionId}/messages`, {
          role: "assistant",
          content: `I understand you're asking about: "${content}". I'm Luna, your AI presentation assistant. I can help you create professional presentations. Would you like me to generate a presentation on this topic?`,
          metadata: {
            model: "gpt-4-mock",
            processingTimeMs: 100
          }
        });

        return {
          userMessage: userMessageData,
          aiMessage: await aiMessageResponse.json()
        };
      }
    },
    onSuccess: () => {
      // Refresh current session to show new messages
      queryClient.invalidateQueries({
        queryKey: ["/api/v1/sessions", currentSessionId]
      });
      
      // Update sessions list to show recent activity
      queryClient.invalidateQueries({
        queryKey: ["/api/v1/sessions", "list", userId]
      });
    },
    onError: (error) => {
      console.error("❌ Failed to send message:", error);
    }
  });

  // Update session mutation
  const updateSessionMutation = useMutation({
    mutationFn: async (updates: {
      title?: string;
      isBookmarked?: boolean;
      tags?: string[];
      settings?: Partial<ChatSession['settings']>;
      status?: string;
    }) => {
      if (!currentSessionId) throw new Error("No session to update");
      
      const response = await apiRequest("PUT", `/api/v1/sessions/${currentSessionId}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/v1/sessions", currentSessionId]
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/v1/sessions", "list", userId]
      });
    }
  });

  // Archive session mutation
  const archiveSessionMutation = useMutation({
    mutationFn: async (sessionIdToArchive?: string) => {
      const targetId = sessionIdToArchive || currentSessionId;
      if (!targetId) throw new Error("No session to archive");
      
      const response = await apiRequest("POST", `/api/v1/sessions/${targetId}/archive`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/v1/sessions", "list", userId]
      });
      
      // If we archived the current session, clear it
      if (currentSessionId) {
        setCurrentSessionId(null);
      }
    }
  });

  // Delete session mutation
  const deleteSessionMutation = useMutation({
    mutationFn: async (sessionIdToDelete?: string) => {
      const targetId = sessionIdToDelete || currentSessionId;
      if (!targetId) throw new Error("No session to delete");
      
      const response = await apiRequest("DELETE", `/api/v1/sessions/${targetId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/v1/sessions", "list", userId]
      });
      
      // If we deleted the current session, clear it
      if (currentSessionId) {
        setCurrentSessionId(null);
      }
    }
  });

  // Auto-create session if needed
  useEffect(() => {
    if (!currentSessionId && autoCreateSession && !isLoadingSessions && !createSessionMutation.isPending) {
      // Only auto-create if we don't have any existing sessions
      const existingSessions = sessionsData?.data || [];
      if (existingSessions.length === 0) {
        createSessionMutation.mutate({
          title: "New Chat Session"
        });
      }
    }
  }, [currentSessionId, autoCreateSession, isLoadingSessions, sessionsData, createSessionMutation]);

  // Main functions
  const createSession = useCallback((options?: {
    title?: string;
    firstMessage?: string;
    tags?: string[];
    settings?: Partial<ChatSession['settings']>;
  }) => {
    return createSessionMutation.mutate(options || {});
  }, [createSessionMutation]);

  const sendMessage = useCallback((content: string) => {
    if (!content.trim()) return;
    
    return sendMessageMutation.mutate({ content });
  }, [sendMessageMutation]);

  const switchSession = useCallback((sessionId: string) => {
    setCurrentSessionId(sessionId);
  }, []);

  const updateSession = useCallback((updates: Parameters<typeof updateSessionMutation.mutate>[0]) => {
    return updateSessionMutation.mutate(updates);
  }, [updateSessionMutation]);

  const archiveSession = useCallback((sessionId?: string) => {
    return archiveSessionMutation.mutate(sessionId);
  }, [archiveSessionMutation]);

  const deleteSession = useCallback((sessionId?: string) => {
    return deleteSessionMutation.mutate(sessionId);
  }, [deleteSessionMutation]);

  return {
    // Current session
    session,
    sessionId: currentSessionId,
    messages: session?.messages || [],
    isLoadingSession,
    sessionError,

    // Sessions list
    sessions: sessionsData?.data || [],
    sessionsMetadata: sessionsData?.pagination,
    isLoadingSessions,

    // Actions
    createSession,
    sendMessage,
    switchSession,
    updateSession,
    archiveSession,
    deleteSession,

    // Loading states
    isCreatingSession: createSessionMutation.isPending,
    isSendingMessage: sendMessageMutation.isPending,
    isUpdatingSession: updateSessionMutation.isPending,
    isArchivingSession: archiveSessionMutation.isPending,
    isDeletingSession: deleteSessionMutation.isPending
  };
} 