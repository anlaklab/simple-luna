import { useState, useRef, useEffect } from "react";
import { useChat } from "@/hooks/use-chat";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, Paperclip, FileText, Bot, User, Circle, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ChatInterfaceProps {
  presentationId: string | null;
  onPresentationCreate: (id: string) => void;
}

export function ChatInterface({ presentationId, onPresentationCreate }: ChatInterfaceProps) {
  const [message, setMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const { messages, sendMessage, isLoading } = useChat({
    presentationId,
    onPresentationCreate
  });

  const predefinedMessages = [
    "Can you generate a market research presentation for no code software?",
    "Create a sales pitch deck for a SaaS startup",
    "Make a presentation about AI trends in 2025",
    "Generate an investor pitch deck for a fintech company"
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isLoading) return;

    const currentMessage = message;
    setMessage("");
    setIsTyping(true);

    try {
      await sendMessage(currentMessage);
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.name.endsWith('.pptx')) {
      toast({
        title: "Invalid file",
        description: "Please upload a PowerPoint (.pptx) file",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('generateThumbnails', 'true');
      formData.append('thumbnailFormat', 'png');
      formData.append('validateSchema', 'true');
      formData.append('autoFix', 'true');
      
      // Use the comprehensive conversion endpoint
      const response = await apiRequest('POST', '/api/v1/convert/upload', formData);
      const result = await response.json();
      
      if (result.success && result.data.presentationId) {
        onPresentationCreate(result.data.presentationId);
        toast({
          title: "Success",
          description: `PowerPoint file converted successfully! Generated ${result.data.slideCount} slides.`
        });
      } else {
        throw new Error(result.error?.message || 'Conversion failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload and convert PowerPoint file",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="px-4 py-3 md:px-6 md:py-4 border-b border-border">
        <div className="flex items-center justify-between">
          <h2 className="text-base md:text-lg font-semibold text-foreground">Chat with Luna</h2>
          <div className="flex items-center space-x-2">
            <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              <Circle className="w-2 h-2 text-green-400 mr-1 fill-current" />
              <span className="hidden sm:inline">Online</span>
            </div>
          </div>
        </div>
        <p className="text-xs md:text-sm text-muted-foreground mt-1">
          Describe your presentation needs and I'll help you create it
        </p>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3 md:space-y-4">
        {(messages as any[]).length === 0 && (
          <div className="flex items-start space-x-3">
            <Avatar>
              <AvatarFallback className="bg-gradient-to-br from-primary to-accent">
                <Bot className="w-4 h-4 text-white" />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <Card className="p-4 bg-muted/50">
                <p className="text-foreground">
                  Hi! I'm Luna, your AI presentation assistant. I can help you create professional consulting presentations. What would you like to build today?
                </p>
              </Card>
              <p className="text-xs text-muted-foreground mt-2">Just now</p>
              
              {/* Predefined message suggestions */}
              <div className="mt-4 space-y-2">
                <p className="text-xs text-muted-foreground font-medium">Try one of these:</p>
                <div className="flex flex-wrap gap-2">
                  {predefinedMessages.map((msg, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => {
                        setMessage(msg);
                        textareaRef.current?.focus();
                      }}
                    >
                      {msg}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {(messages as any[]).map((msg: any, index: number) => (
          <div
            key={index}
            className={cn(
              "flex items-start space-x-3",
              msg.role === "user" ? "justify-end" : ""
            )}
          >
            {msg.role === "assistant" && (
              <Avatar>
                <AvatarFallback className="bg-gradient-to-br from-primary to-accent">
                  <Bot className="w-4 h-4 text-white" />
                </AvatarFallback>
              </Avatar>
            )}
            
            <div className={cn("flex-1", msg.role === "user" ? "max-w-[85%] md:max-w-[80%]" : "")}>
              <Card className={cn(
                "p-3 md:p-4",
                msg.role === "user" 
                  ? "bg-primary text-primary-foreground ml-8 md:ml-12" 
                  : "bg-muted/50"
              )}>
                <p className="whitespace-pre-wrap text-sm md:text-base">{msg.content}</p>
              </Card>
              <p className={cn(
                "text-xs text-muted-foreground mt-1 md:mt-2",
                msg.role === "user" ? "text-right" : ""
              )}>
                {new Date(msg.timestamp).toLocaleTimeString()}
              </p>
            </div>

            {msg.role === "user" && (
              <Avatar>
                <AvatarFallback className="bg-muted">
                  <User className="w-4 h-4" />
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        ))}

        {isTyping && (
          <div className="flex items-start space-x-3">
            <Avatar>
              <AvatarFallback className="bg-gradient-to-br from-primary to-accent">
                <Bot className="w-4 h-4 text-white" />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <Card className="p-4 bg-muted/50">
                <div className="flex items-center space-x-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                  </div>
                  <span className="text-sm text-muted-foreground">Luna is typing...</span>
                </div>
              </Card>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input */}
      <div className="p-4 md:p-6 border-t border-border">
        <form onSubmit={handleSubmit} className="flex items-end space-x-2 md:space-x-3">
          <div className="flex-1">
            <Textarea
              ref={textareaRef}
              placeholder="Describe your presentation needs..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={2}
              className="resize-none text-sm md:text-base"
              disabled={isLoading}
            />
          </div>
          <Button 
            type="submit" 
            size="default"
            disabled={!message.trim() || isLoading}
            className="shrink-0 h-auto px-3 py-2 md:px-4 md:py-3"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
        
        <div className="flex items-center justify-between mt-2 md:mt-3">
          <div className="flex items-center space-x-2 md:space-x-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pptx"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-muted-foreground p-1 md:p-2"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              <Upload className="w-3 h-3 md:w-4 md:h-4" />
              <span className="ml-1 hidden md:inline">
                {isUploading ? "Uploading..." : "Upload PPTX"}
              </span>
            </Button>
            <Button variant="ghost" size="sm" className="text-muted-foreground p-1 md:p-2">
              <FileText className="w-3 h-3 md:w-4 md:h-4" />
              <span className="ml-1 hidden md:inline">Templates</span>
            </Button>
          </div>
          <span className="text-xs text-muted-foreground hidden md:inline">Press Enter to send</span>
        </div>
      </div>
    </div>
  );
}
