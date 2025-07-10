import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Download, FileJson, FileImage, Trash2, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";

interface StoredPresentation {
  id: string;
  filename: string;
  uploadedAt: string;
}

interface ThumbnailData {
  slideNumber: number;
  title: string;
  thumbnail: string;
}

export default function Converter() {
  const [jsonData, setJsonData] = useState("");
  const [isConverting, setIsConverting] = useState(false);
  const [presentations, setPresentations] = useState<StoredPresentation[]>([]);
  const [selectedPresentation, setSelectedPresentation] = useState<string | null>(null);
  const [thumbnails, setThumbnails] = useState<ThumbnailData[]>([]);
  const [showThumbnails, setShowThumbnails] = useState(false);
  const { toast } = useToast();

  // Load presentations on mount
  useEffect(() => {
    loadPresentations();
  }, []);

  const loadPresentations = async () => {
    try {
      const response = await apiRequest("GET", "/api/v1/presentations");
      const data = await response.json();
      setPresentations(data || []);
    } catch (error) {
      console.error("Failed to load presentations:", error);
    }
  };

  const handlePptxUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.pptx')) {
      toast({
        title: "Invalid file",
        description: "Please upload a PowerPoint file (.pptx)",
        variant: "destructive",
      });
      return;
    }

    setIsConverting(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/v1/pptx2json', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to convert PPTX');
      }

      const json = await response.json();
      setJsonData(JSON.stringify(json.data, null, 2));
      
      toast({
        title: "Conversion successful",
        description: "PowerPoint converted to JSON",
      });
      
      // Reload presentations list
      loadPresentations();
    } catch (error) {
      toast({
        title: "Conversion failed",
        description: "Failed to convert PowerPoint to JSON",
        variant: "destructive",
      });
    } finally {
      setIsConverting(false);
    }
  };

  const loadPresentationJson = async (id: string) => {
    setIsConverting(true);
    try {
      const response = await apiRequest("GET", `/api/v1/presentations/${id}/json`);
      const data = await response.json();
      setJsonData(JSON.stringify(data.data, null, 2));
      setSelectedPresentation(id);
      setShowThumbnails(false);
      
      toast({
        title: "Loaded successfully",
        description: "Presentation loaded as JSON",
      });
    } catch (error) {
      toast({
        title: "Failed to load",
        description: "Could not load presentation",
        variant: "destructive",
      });
    } finally {
      setIsConverting(false);
    }
  };

  const extractThumbnails = async (id: string) => {
    setIsConverting(true);
    try {
      const response = await apiRequest("POST", `/api/v1/presentations/${id}/thumbnails`);
      const data = await response.json();
      setThumbnails(data.thumbnails);
      setSelectedPresentation(id);
      setShowThumbnails(true);
      
      toast({
        title: "Thumbnails extracted",
        description: `Extracted ${data.thumbnails.length} thumbnails`,
      });
    } catch (error) {
      toast({
        title: "Failed to extract",
        description: "Could not extract thumbnails",
        variant: "destructive",
      });
    } finally {
      setIsConverting(false);
    }
  };

  const deletePresentation = async (id: string) => {
    try {
      await apiRequest("DELETE", `/api/v1/presentations/${id}`);
      toast({
        title: "Deleted",
        description: "Presentation deleted successfully",
      });
      loadPresentations();
      if (selectedPresentation === id) {
        setSelectedPresentation(null);
        setJsonData("");
        setThumbnails([]);
        setShowThumbnails(false);
      }
    } catch (error) {
      toast({
        title: "Failed to delete",
        description: "Could not delete presentation",
        variant: "destructive",
      });
    }
  };

  const handleJsonToPptx = async () => {
    if (!jsonData.trim()) {
      toast({
        title: "No JSON data",
        description: "Please enter JSON data or upload a PowerPoint file first",
        variant: "destructive",
      });
      return;
    }

    setIsConverting(true);
    try {
      // Validate JSON
      const parsedJson = JSON.parse(jsonData);
      
      const response = await apiRequest("POST", "/api/v1/json2pptx", { presentationData: parsedJson });
      const blob = await response.blob();
      
      // Download the file
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${parsedJson.title || 'presentation'}.pptx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Export successful",
        description: "PowerPoint file has been downloaded",
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: error instanceof SyntaxError ? "Invalid JSON format" : "Failed to convert JSON to PowerPoint",
        variant: "destructive",
      });
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-2">PowerPoint Converter</h1>
            <p className="text-muted-foreground">Convert between PowerPoint and JSON formats</p>
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            {/* Upload PPTX Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileImage className="h-5 w-5" />
                  Upload PPTX
                </CardTitle>
                <CardDescription>
                  Upload a PowerPoint file to convert or extract thumbnails
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 hover:border-muted-foreground/50 transition-colors">
                  <Upload className="h-12 w-12 text-muted-foreground mb-4" />
                  <Label htmlFor="pptx-upload" className="cursor-pointer">
                    <Button asChild disabled={isConverting}>
                      <span>
                        {isConverting ? "Processing..." : "Choose PPTX File"}
                      </span>
                    </Button>
                  </Label>
                  <input
                    id="pptx-upload"
                    type="file"
                    accept=".pptx"
                    onChange={handlePptxUpload}
                    className="hidden"
                    disabled={isConverting}
                  />
                  <p className="text-sm text-muted-foreground mt-2">
                    Max file size: 50MB
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Uploaded Presentations */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Uploaded Presentations
                </CardTitle>
                <CardDescription>
                  Select a presentation to convert to JSON or extract thumbnails
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {presentations.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No presentations uploaded yet
                    </p>
                  ) : (
                    presentations.map((presentation) => (
                      <div
                        key={presentation.id}
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          selectedPresentation === presentation.id
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:bg-muted/50'
                        } transition-colors`}
                      >
                        <div className="flex-1">
                          <p className="font-medium">{presentation.filename}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(presentation.uploadedAt).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => loadPresentationJson(presentation.id)}
                            disabled={isConverting}
                          >
                            <FileJson className="h-4 w-4 mr-1" />
                            JSON
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => extractThumbnails(presentation.id)}
                            disabled={isConverting}
                          >
                            <FileImage className="h-4 w-4 mr-1" />
                            Thumbnails
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deletePresentation(presentation.id)}
                            disabled={isConverting}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* JSON Editor / Thumbnails View */}
          <Card className="mt-8">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>
                    {showThumbnails ? 'Slide Thumbnails' : 'JSON Editor'}
                  </CardTitle>
                  <CardDescription>
                    {showThumbnails 
                      ? 'Preview of all slides in the presentation'
                      : 'View and edit the JSON representation of your presentation'
                    }
                  </CardDescription>
                </div>
                {jsonData && !showThumbnails && (
                  <Button 
                    onClick={handleJsonToPptx} 
                    disabled={isConverting || !jsonData.trim()}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {isConverting ? "Converting..." : "Convert to PPTX"}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {showThumbnails ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {thumbnails.map((thumbnail) => (
                    <div key={thumbnail.slideNumber} className="space-y-2">
                      <img
                        src={thumbnail.thumbnail}
                        alt={`Slide ${thumbnail.slideNumber}`}
                        className="w-full rounded-lg border shadow-sm"
                      />
                      <p className="text-sm text-center font-medium">
                        Slide {thumbnail.slideNumber}: {thumbnail.title}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <Textarea
                  value={jsonData}
                  onChange={(e) => setJsonData(e.target.value)}
                  placeholder='{"title": "My Presentation", "slides": [...]}'
                  className="font-mono text-sm min-h-[400px]"
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}