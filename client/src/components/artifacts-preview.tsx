import { useState, useEffect } from "react";
import { usePresentation, usePresentations } from "@/hooks/use-presentations";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Download, Loader2, FileText, BarChart3, Image, Quote, FileJson, Presentation, RefreshCw, FileImage, Copy, Check } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SlideRenderer } from "./slide-renderer";

interface ArtifactsPreviewProps {
  presentationId: string | null;
}

export function ArtifactsPreview({ presentationId }: ArtifactsPreviewProps) {
  const { data: presentation, isLoading, error, refetch } = usePresentation(presentationId);
  const { generateThumbnails, isGeneratingThumbnails } = usePresentations();
  const [isExporting, setIsExporting] = useState(false);
  const [universalJson, setUniversalJson] = useState<any>(null);
  const [isLoadingJson, setIsLoadingJson] = useState(false);
  const [copied, setCopied] = useState(false);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [thumbnailsLoaded, setThumbnailsLoaded] = useState(false);
  const [thumbnailRetryCount, setThumbnailRetryCount] = useState(0);
  const { toast } = useToast();
  
  // Auto-refetch while generating
  useEffect(() => {
    if (presentation?.status === "generating") {
      const interval = setInterval(() => {
        refetch();
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [presentation?.status, refetch]);

  // Load Universal JSON when presentation is available
  useEffect(() => {
    if (presentation?.id && presentation?.status === "completed") {
      loadUniversalJson(presentation.id);
    }
  }, [presentation?.id, presentation?.status]);

  // Enhanced thumbnail loading with retry mechanism
  useEffect(() => {
    if (presentation?.status === "completed" && presentation.id) {
      // Reset state when presentation changes
      if (!thumbnailsLoaded) {
        setThumbnailRetryCount(0);
        loadThumbnailsWithRetry(presentation.id);
      }
    }
  }, [presentation?.status, presentation?.id, thumbnailsLoaded]);

  // Reset thumbnail state when presentation ID changes
  useEffect(() => {
    if (presentationId) {
      console.log(`🔄 Presentation ID changed to: ${presentationId}, resetting thumbnail state`);
      setThumbnails([]);
      setThumbnailsLoaded(false);
      setThumbnailRetryCount(0);
    }
  }, [presentationId]);

  // Load Universal JSON from Firebase
  const loadUniversalJson = async (presentationId: string) => {
    setIsLoadingJson(true);
    try {
      console.log(`🔍 Loading Universal JSON for presentation ${presentationId}`);
      
      const response = await fetch(`http://localhost:3000/api/v1/json/${presentationId}`);
      if (response.ok) {
        const data = await response.json();
        setUniversalJson(data.data);
        console.log('✅ Universal JSON loaded:', data.data);
      } else {
        console.error('❌ Failed to load Universal JSON:', response.statusText);
        setUniversalJson(null);
      }
    } catch (error) {
      console.error('❌ Error loading Universal JSON:', error);
      setUniversalJson(null);
    } finally {
      setIsLoadingJson(false);
    }
  };

  // Enhanced thumbnail loading with retry mechanism
  const loadThumbnailsWithRetry = async (presentationId: string, retryCount: number = 0) => {
    const maxRetries = 3;
    const retryDelay = 2000; // 2 seconds
    
    try {
      console.log(`🖼️ Loading thumbnails for presentation ${presentationId} (attempt ${retryCount + 1}/${maxRetries + 1})`);
      
      const response = await fetch(`http://localhost:3000/api/v1/presentations/${presentationId}/thumbnails`);
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data && result.data.length > 0) {
          console.log(`✅ Found ${result.data.length} thumbnails`);
          setThumbnails(result.data);
          setThumbnailsLoaded(true);
          setThumbnailRetryCount(0);
          return;
        }
      }
      
      // If no thumbnails found and we haven't exceeded max retries
      if (retryCount < maxRetries) {
        console.log(`⏳ No thumbnails found, retrying in ${retryDelay}ms (attempt ${retryCount + 1}/${maxRetries})`);
        setThumbnailRetryCount(retryCount + 1);
        setTimeout(() => {
          loadThumbnailsWithRetry(presentationId, retryCount + 1);
        }, retryDelay);
      } else {
        console.log(`❌ No thumbnails found after ${maxRetries + 1} attempts`);
        setThumbnails([]);
        setThumbnailsLoaded(true);
      }
    } catch (error) {
      console.error("Error loading thumbnails:", error);
      if (retryCount < maxRetries) {
        console.log(`⏳ Error loading thumbnails, retrying in ${retryDelay}ms (attempt ${retryCount + 1}/${maxRetries})`);
        setThumbnailRetryCount(retryCount + 1);
        setTimeout(() => {
          loadThumbnailsWithRetry(presentationId, retryCount + 1);
        }, retryDelay);
      } else {
        setThumbnails([]);
        setThumbnailsLoaded(true);
      }
    }
  };

  // Generate thumbnails using the real endpoint
  const handleGenerateThumbnails = async () => {
    if (!presentationId) return;
    
    try {
      console.log(`🎯 Generating thumbnails for presentation ${presentationId}`);
      
      const response = await fetch(`http://localhost:3000/api/v1/presentations/${presentationId}/generate-thumbnails`, {
        method: 'POST'
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Thumbnail generation triggered:', result);
        
        toast({
          title: "Thumbnail generation started",
          description: "Thumbnails will be generated in the background.",
        });
        
        // Reset state and start loading with retry
        setThumbnailsLoaded(false);
        setThumbnailRetryCount(0);
        
        // Wait a moment and try to load generated thumbnails
        setTimeout(() => {
          loadThumbnailsWithRetry(presentationId);
        }, 3000);
      } else {
        console.error('❌ Failed to generate thumbnails:', response.statusText);
        toast({
          title: "Failed to generate thumbnails", 
          description: "Please try again later.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('❌ Error generating thumbnails:', error);
      toast({
        title: "Error generating thumbnails",
        description: "Please check your connection and try again.",
        variant: "destructive",
      });
    }
  };

  // Load thumbnail images from server (kept for backward compatibility)
  const loadThumbnails = async (presentationId: string) => {
    return loadThumbnailsWithRetry(presentationId, 0);
  };

  const handleExport = async () => {
    if (!presentationId) return;

    setIsExporting(true);
    try {
      const response = await apiRequest("POST", `/api/v1/presentations/${presentationId}/export`);
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${presentation?.title || 'presentation'}.pptx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Export successful",
        description: "Your presentation has been downloaded.",
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Failed to export presentation. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const copyJsonToClipboard = async () => {
    if (!universalJson) return;
    
    try {
      const jsonString = JSON.stringify(universalJson, null, 2);
      await navigator.clipboard.writeText(jsonString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      
      toast({
        title: "JSON copied to clipboard",
        description: "The Universal JSON has been copied successfully.",
      });
    } catch (error) {
      toast({
        title: "Failed to copy JSON",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const getSlideIcon = (type: string) => {
    switch (type) {
      case "title":
        return <FileText className="h-4 w-4" />;
      case "bullet":
        return <FileText className="h-4 w-4" />;
      case "chart":
        return <BarChart3 className="h-4 w-4" />;
      case "image":
        return <Image className="h-4 w-4" />;
      case "quote":
        return <Quote className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  if (!presentationId) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center max-w-2xl">
          <h2 className="text-2xl font-semibold mb-4">Welcome to Project Luna</h2>
          <p className="text-muted-foreground mb-8">
            Start by describing your presentation needs in the chat. Luna will help you create
            professional PowerPoint presentations using AI-generated content.
          </p>
          <div className="mt-8 p-6 bg-muted/50 rounded-lg">
            <h3 className="font-semibold mb-2">How it works:</h3>
            <ol className="text-left text-sm text-muted-foreground space-y-2">
              <li>1. Describe your presentation topic and requirements</li>
              <li>2. Luna generates a structured JSON with slide content</li>
              <li>3. Preview slide thumbnails as they're created</li>
              <li>4. Export to PowerPoint when ready</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="h-full p-8">
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="aspect-[16/9]" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Presentation</AlertTitle>
          <AlertDescription>
            Failed to load the presentation. Please try again.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!presentation) {
    return null;
  }

  return (
    <div className="h-full flex flex-col">
      <div className="border-b p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold">{presentation.title}</h2>
            <p className="text-muted-foreground mt-1">{presentation.description}</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={
              presentation.status === "completed" ? "default" : 
              presentation.status === "generating" ? "secondary" : 
              "destructive"
            }>
              {presentation.status}
            </Badge>
            {presentation.status === "completed" && (
              <>
                {/* Thumbnail generation button */}
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleGenerateThumbnails} 
                  disabled={isGeneratingThumbnails}
                >
                  {isGeneratingThumbnails ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      {thumbnails.length > 0 ? "Refresh" : "Generate"} Thumbnails
                    </>
                  )}
                </Button>
                
                <Button onClick={handleExport} disabled={isExporting}>
                  {isExporting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Export PPTX
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6">
          {presentation.status === "generating" ? (
            <div className="flex items-center justify-center h-[400px]">
              <div className="text-center">
                <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
                <p className="text-lg font-medium">Generating your presentation...</p>
                <p className="text-muted-foreground mt-2">Luna is creating your slides</p>
                <Button 
                  onClick={() => window.location.reload()} 
                  variant="outline" 
                  size="sm"
                  className="mt-4"
                >
                  Refresh Status
                </Button>
              </div>
            </div>
          ) : presentation.status === "error" ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Generation Failed</AlertTitle>
              <AlertDescription>
                There was an error generating your presentation. Please try again.
              </AlertDescription>
            </Alert>
          ) : (
            <Tabs defaultValue="slides" className="h-full">
              <TabsList className="mb-4">
                <TabsTrigger value="slides" className="flex items-center gap-2">
                  <Presentation className="h-4 w-4" />
                  Slides
                  {thumbnails.length > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {thumbnails.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="json" className="flex items-center gap-2">
                  <FileJson className="h-4 w-4" />
                  Universal JSON
                  {universalJson && (
                    <Badge variant="secondary" className="ml-1">
                      ✓
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="slides" className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Slide Thumbnails</h3>
                  <span className="text-sm text-muted-foreground">
                    {presentation.slideCount || 0} slides
                    {thumbnails.length > 0 && ` • ${thumbnails.length} thumbnails`}
                  </span>
                </div>
                
                {/* Show actual thumbnails if available, otherwise fallback to SlideRenderer */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {thumbnails.length > 0 ? (
                    // Show actual thumbnail images
                    thumbnails.map((thumbnailUrl, index) => (
                      <Card key={index} className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
                        <div className="aspect-[16/9] relative">
                          <img
                            src={thumbnailUrl}
                            alt={`Slide ${index + 1}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              console.error(`Failed to load thumbnail: ${thumbnailUrl}`);
                              e.currentTarget.src = '/placeholder-slide.png'; // Fallback image
                            }}
                          />
                          <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
                            Slide {index + 1}
                          </div>
                        </div>
                        <div className="p-3">
                          <p className="text-sm font-medium truncate">
                            {universalJson?.slides?.[index]?.name || `Slide ${index + 1}`}
                          </p>
                        </div>
                      </Card>
                    ))
                  ) : presentation.slides && (presentation.slides as any[]).length > 0 ? (
                    // Fallback to SlideRenderer components
                    (presentation.slides as any[]).map((slide, index) => (
                      <SlideRenderer 
                        key={index}
                        slide={slide}
                        index={index}
                        className="hover:shadow-lg transition-shadow cursor-pointer"
                      />
                    ))
                  ) : (
                    <div className="col-span-full text-center py-8 bg-muted/30 rounded-lg">
                      <FileImage className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground mb-4">
                        No slide data available
                      </p>
                    </div>
                  )}
                </div>
                
                {/* Show message if no thumbnails are available */}
                {thumbnails.length === 0 && presentation.status === "completed" && (
                  <div className="text-center py-8 bg-muted/30 rounded-lg mt-4">
                    <FileImage className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground mb-4">
                      Slide thumbnails not available yet
                    </p>
                    <Button 
                      variant="outline" 
                      onClick={handleGenerateThumbnails}
                      disabled={isGeneratingThumbnails}
                    >
                      {isGeneratingThumbnails ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generating Thumbnails...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Generate Thumbnails
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="json" className="h-full flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">Universal PowerPoint Schema JSON</h3>
                    <p className="text-sm text-muted-foreground">
                      Clean, structured data from Firebase representing your presentation
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {!isLoadingJson && universalJson && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={copyJsonToClipboard}
                      >
                        {copied ? (
                          <>
                            <Check className="mr-2 h-4 w-4" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="mr-2 h-4 w-4" />
                            Copy JSON
                          </>
                        )}
                      </Button>
                    )}
                    <Button 
                      size="sm" 
                      onClick={() => loadUniversalJson(presentationId!)}
                      disabled={isLoadingJson}
                    >
                      {isLoadingJson ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Refresh
                        </>
                      )}
                    </Button>
                  </div>
                </div>
                
                {isLoadingJson ? (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                      <p className="text-muted-foreground">Loading Universal JSON...</p>
                    </div>
                  </div>
                ) : universalJson ? (
                  <div className="flex-1 border border-border rounded-lg overflow-hidden min-h-[600px]">
                    <div className="h-full flex">
                      {/* Line numbers */}
                      <div className="bg-muted/30 p-3 border-r border-border min-w-[60px] text-right">
                        {JSON.stringify(universalJson, null, 2).split('\n').map((_, index) => (
                          <div key={index} className="text-xs text-muted-foreground leading-5 font-mono">
                            {index + 1}
                          </div>
                        ))}
                      </div>
                      {/* JSON content */}
                      <ScrollArea className="flex-1">
                        <pre className="p-3 bg-background font-mono text-sm leading-5 text-foreground">
                          {JSON.stringify(universalJson, null, 2)}
                        </pre>
                      </ScrollArea>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center border border-border rounded-lg bg-muted/30">
                    <div className="text-center">
                      <FileJson className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground mb-4">
                        Universal JSON not available
                      </p>
                      <p className="text-sm text-muted-foreground mb-4">
                        This presentation may not have been processed with the Universal Schema yet.
                      </p>
                      <Button 
                        variant="outline" 
                        onClick={() => loadUniversalJson(presentationId!)}
                      >
                        Try Loading Again
                      </Button>
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}