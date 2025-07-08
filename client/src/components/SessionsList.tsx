import React from "react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  MessageSquare, 
  Star, 
  StarOff, 
  Archive, 
  Trash2, 
  Calendar, 
  MessageCircle,
  Presentation,
  Clock
} from "lucide-react";
import { ChatSession } from "@/hooks/use-chat-session";

interface SessionsListProps {
  sessions: ChatSession[];
  currentSessionId?: string | null;
  isLoading?: boolean;
  onSessionSelect: (sessionId: string) => void;
  onSessionBookmark: (sessionId: string, isBookmarked: boolean) => void;
  onSessionArchive: (sessionId: string) => void;
  onSessionDelete: (sessionId: string) => void;
  onCreateNew: () => void;
}

export function SessionsList({
  sessions,
  currentSessionId,
  isLoading = false,
  onSessionSelect,
  onSessionBookmark,
  onSessionArchive,
  onSessionDelete,
  onCreateNew
}: SessionsListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-9 w-24" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full" />
              <div className="mt-2 flex gap-2">
                <Skeleton className="h-5 w-12" />
                <Skeleton className="h-5 w-12" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const formatDate = (date: string | Date) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return formatDistanceToNow(dateObj, { addSuffix: true });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Chat Sessions</h3>
        <Button 
          onClick={onCreateNew}
          size="sm"
          className="gap-2"
        >
          <MessageSquare className="w-4 h-4" />
          New Chat
        </Button>
      </div>

      {sessions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <MessageCircle className="w-12 h-12 text-muted-foreground mb-4" />
            <h4 className="text-base font-medium text-foreground mb-2">No chat sessions yet</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Start a conversation with Luna to create your first session
            </p>
            <Button onClick={onCreateNew} size="sm">
              Start New Chat
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <Card 
              key={session.sessionId}
              className={`cursor-pointer transition-all hover:shadow-md ${
                currentSessionId === session.sessionId 
                  ? 'ring-2 ring-primary bg-primary/5' 
                  : 'hover:bg-muted/50'
              }`}
              onClick={() => onSessionSelect(session.sessionId)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base font-medium text-foreground truncate">
                      {session.title}
                    </CardTitle>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(session.lastActiveAt)}
                      </div>
                      <div className="flex items-center gap-1">
                        <MessageCircle className="w-3 h-3" />
                        {session.messageCount} messages
                      </div>
                      {session.generatedPresentations?.length > 0 && (
                        <div className="flex items-center gap-1">
                          <Presentation className="w-3 h-3" />
                          {session.generatedPresentations.length}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSessionBookmark(session.sessionId, !session.isBookmarked);
                      }}
                    >
                      {session.isBookmarked ? (
                        <Star className="w-4 h-4 text-yellow-500 fill-current" />
                      ) : (
                        <StarOff className="w-4 h-4 text-muted-foreground" />
                      )}
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSessionArchive(session.sessionId);
                      }}
                    >
                      <Archive className="w-4 h-4 text-muted-foreground" />
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Delete this session permanently?')) {
                          onSessionDelete(session.sessionId);
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                {/* Message preview */}
                {session.messages && session.messages.length > 0 && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                    {session.messages[session.messages.length - 1]?.content?.substring(0, 100)}...
                  </p>
                )}
                
                {/* Tags */}
                {session.tags && session.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {session.tags.slice(0, 3).map((tag, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {session.tags.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{session.tags.length - 3}
                      </Badge>
                    )}
                  </div>
                )}
                
                {/* Generated presentations */}
                {session.generatedPresentations && session.generatedPresentations.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Generated Presentations:</p>
                    {session.generatedPresentations.slice(0, 2).map((presentation, index) => (
                      <div key={index} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Presentation className="w-3 h-3" />
                        <span className="truncate">{presentation.title}</span>
                        <Badge variant="outline" className="text-xs">
                          {presentation.slideCount} slides
                        </Badge>
                      </div>
                    ))}
                    {session.generatedPresentations.length > 2 && (
                      <p className="text-xs text-muted-foreground">
                        +{session.generatedPresentations.length - 2} more
                      </p>
                    )}
                  </div>
                )}
                
                {/* Session stats */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {session.totalTokensUsed || 0} tokens
                    </div>
                    {session.isBookmarked && (
                      <Badge variant="secondary" className="text-xs">
                        Bookmarked
                      </Badge>
                    )}
                  </div>
                  
                  <Badge 
                    variant={session.status === 'active' ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {session.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
} 