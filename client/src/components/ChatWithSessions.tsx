import React, { useState } from "react";
import { useChatSession } from "@/hooks/use-chat-session";
import { SessionsList } from "./SessionsList";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Send, 
  Bot, 
  User, 
  Settings, 
  PanelLeftOpen, 
  PanelLeftClose,
  MessageSquare,
  Sparkles,
  Clock
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ChatWithSessionsProps {
  userId?: string | null;
  onPresentationCreate?: (presentationId: string) => void;
}

export function ChatWithSessions({ 
  userId = null, 
  onPresentationCreate 
}: ChatWithSessionsProps) {
  const [message, setMessage] = useState("");
  const [showSidebar, setShowSidebar] = useState(true);

  const {
    session,
    sessionId,
    messages,
    sessions,
    isLoadingSession,
    isLoadingSessions,
    createSession,
    sendMessage,
    switchSession,
    updateSession,
    archiveSession,
    deleteSession,
    isSendingMessage,
    isCreatingSession
  } = useChatSession({
    userId,
    autoCreateSession: true,
    onPresentationCreate
  });

  const handleSendMessage = async () => {
    if (!message.trim() || isSendingMessage) return;
    
    const messageToSend = message;
    setMessage("");
    
    try {
      await sendMessage(messageToSend);
    } catch (error) {
      console.error("Failed to send message:", error);
      // Restore message on error
      setMessage(messageToSend);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatMessageTime = (timestamp: string | Date) => {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    return formatDistanceToNow(date, { addSuffix: true });
  };

  const renderMessage = (msg: any, index: number) => {
    const isUser = msg.role === 'user';
    const isSystem = msg.role === 'system';
    
    return (
      <div
        key={msg.messageId || index}
        className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
      >
        {!isUser && (
          <div className="flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              {isSystem ? (
                <Settings className="w-4 h-4 text-primary" />
              ) : (
                <Bot className="w-4 h-4 text-primary" />
              )}
            </div>
          </div>
        )}
        
        <div className={`max-w-[70%] ${isUser ? 'order-first' : ''}`}>
          <div
            className={`rounded-lg px-4 py-3 ${
              isUser
                ? 'bg-primary text-primary-foreground'
                : isSystem
                ? 'bg-muted border text-muted-foreground'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {msg.content}
            </p>
            
            {/* Message metadata */}
            {msg.metadata && (
              <div className="mt-2 pt-2 border-t border-current/20">
                <div className="flex items-center gap-2 text-xs opacity-70">
                  {msg.metadata.model && (
                    <Badge variant="outline" className="text-xs">
                      {msg.metadata.model}
                    </Badge>
                  )}
                  {msg.metadata.processingTimeMs && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {msg.metadata.processingTimeMs}ms
                    </div>
                  )}
                  {msg.metadata.validationResult && (
                    <Badge 
                      variant={msg.metadata.validationResult === 'valid' ? 'default' : 'destructive'}
                      className="text-xs"
                    >
                      {msg.metadata.validationResult}
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </div>
          
          <div className={`mt-1 text-xs text-muted-foreground ${isUser ? 'text-right' : 'text-left'}`}>
            {formatMessageTime(msg.timestamp)}
          </div>
        </div>
        
        {isUser && (
          <div className="flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-4 h-4 text-primary" />
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      {showSidebar && (
        <div className="w-80 border-r border-border bg-card flex flex-col">
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Chat Sessions</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSidebar(false)}
              >
                <PanelLeftClose className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full p-4">
              <SessionsList
                sessions={sessions}
                currentSessionId={sessionId}
                isLoading={isLoadingSessions}
                onSessionSelect={switchSession}
                onSessionBookmark={(id, bookmarked) => 
                  updateSession({ isBookmarked: bookmarked })
                }
                onSessionArchive={archiveSession}
                onSessionDelete={deleteSession}
                onCreateNew={() => createSession()}
              />
            </ScrollArea>
          </div>
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="px-6 py-4 border-b border-border bg-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {!showSidebar && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSidebar(true)}
                >
                  <PanelLeftOpen className="w-4 h-4" />
                </Button>
              )}
              
              <div>
                {isLoadingSession ? (
                  <Skeleton className="h-6 w-48" />
                ) : session ? (
                  <>
                    <h1 className="text-xl font-semibold text-foreground">
                      {session.title}
                    </h1>
                    <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <MessageSquare className="w-4 h-4" />
                        {session.messageCount} messages
                      </div>
                      {session.generatedPresentations?.length > 0 && (
                        <div className="flex items-center gap-1">
                          <Sparkles className="w-4 h-4" />
                          {session.generatedPresentations.length} presentations
                        </div>
                      )}
                      <Badge variant="outline">
                        {session.status}
                      </Badge>
                    </div>
                  </>
                ) : (
                  <div>
                    <h1 className="text-xl font-semibold text-foreground">
                      Welcome to Luna
                    </h1>
                    <p className="text-sm text-muted-foreground">
                      Start a conversation to create your first session
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-6">
              {isLoadingSession ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className={`flex gap-3 ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                      <Skeleton className="w-8 h-8 rounded-full" />
                      <Skeleton className="h-16 w-64 rounded-lg" />
                    </div>
                  ))}
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <Bot className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    Hi! I'm Luna, your AI presentation assistant
                  </h3>
                  <p className="text-muted-foreground mb-6 max-w-md">
                    I can help you create professional presentations. Just describe what you need, 
                    and I'll generate a beautiful presentation for you using the Universal PowerPoint Schema.
                  </p>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>Try asking me to:</p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      <Badge variant="secondary">Create a sales presentation</Badge>
                      <Badge variant="secondary">Generate slides about AI</Badge>
                      <Badge variant="secondary">Make a project proposal</Badge>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {messages.map(renderMessage)}
                  
                  {/* Loading message while sending */}
                  {isSendingMessage && (
                    <div className="flex gap-3 justify-start">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <Bot className="w-4 h-4 text-primary animate-pulse" />
                        </div>
                      </div>
                      <div className="max-w-[70%]">
                        <div className="rounded-lg px-4 py-3 bg-muted text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <div className="flex gap-1">
                              <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                              <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                              <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                            <span className="text-sm">Luna is thinking...</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Message Input */}
        <div className="p-6 border-t border-border bg-card">
          <div className="flex gap-3">
            <div className="flex-1">
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Describe your presentation needs..."
                className="min-h-[60px] resize-none"
                disabled={isSendingMessage || isCreatingSession}
              />
            </div>
            <Button
              onClick={handleSendMessage}
              disabled={!message.trim() || isSendingMessage || isCreatingSession}
              size="lg"
              className="h-[60px]"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          
          {(isSendingMessage || isCreatingSession) && (
            <div className="mt-2 text-sm text-muted-foreground flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              {isCreatingSession ? "Creating new session..." : "Sending message..."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 