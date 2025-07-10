import React, { useState } from 'react';
import { usePresentations } from '@/hooks/use-presentations';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  FileText,
  Calendar,
  User,
  Eye,
  Download,
  Trash2,
  Search,
  Plus,
  Grid,
  List,
  Image,
  Clock,
  HardDrive,
  Building,
  Tag,
} from 'lucide-react';

interface Presentation {
  id: string;
  title: string;
  description?: string;
  author?: string;
  company?: string;
  createdAt: string;
  updatedAt: string;
  slideCount: number;
  status: 'completed' | 'processing' | 'failed' | 'draft';
  thumbnailUrl?: string;
  fileSize?: number;
  processingTime?: number;
  thumbnailCount?: number;
  originalFilename?: string;
  type?: string;
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
}

export default function Presentations() {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "title" | "slides">("date");
  const [filterStatus, setFilterStatus] = useState<"all" | "completed" | "processing" | "failed" | "draft">("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Use centralized hook instead of direct fetch
  const { presentations, isLoading } = usePresentations();

  // Filter and sort presentations
  const filteredPresentations = presentations
    .filter((presentation: Presentation) => {
      const matchesSearch = !searchTerm || 
        presentation.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (presentation.description || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (presentation.author || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (presentation.company || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (presentation.metadata?.subject || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (presentation.metadata?.keywords || "").toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesFilter = filterStatus === "all" || presentation.status === filterStatus;
      
      return matchesSearch && matchesFilter;
    })
    .sort((a: Presentation, b: Presentation) => {
      switch (sortBy) {
        case "title":
          return a.title.localeCompare(b.title);
        case "slides":
          return (b.slideCount || 0) - (a.slideCount || 0);
        case "date":
        default:
          const dateA = new Date(a.updatedAt).getTime();
          const dateB = new Date(b.updatedAt).getTime();
          return dateB - dateA;
      }
    });

  const handleViewPresentation = (id: string) => {
    window.open(`/presentations/${id}/analysis`, "_blank");
  };

  const handleDeletePresentation = async (id: string) => {
    // Delete functionality not yet implemented
    console.log("Delete functionality coming soon for presentation:", id);
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return "Unknown";
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const formatDuration = (ms?: number): string => {
    if (!ms) return "Unknown";
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'processing': return 'secondary';
      case 'failed': return 'destructive';
      default: return 'outline';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="bg-white border-b border-border sticky top-0 z-50">
          <div className="px-4 py-4 md:px-6">
            <div className="flex items-center justify-between">
              <div>
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-96 mt-2" />
              </div>
              <Skeleton className="h-10 w-32" />
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="p-6">
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-3 w-1/2 mb-4" />
                <Skeleton className="h-32 w-full mb-4" />
                <Skeleton className="h-8 w-full" />
              </Card>
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header - LUNA Design Pattern */}
      <header className="bg-white border-b border-border sticky top-0 z-50">
        <div className="px-4 py-4 md:px-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-foreground">Presentations</h1>
              <p className="text-sm text-muted-foreground">
                Manage and analyze your PowerPoint presentations from Firebase
              </p>
            </div>
            <Button className="space-x-2">
              <Plus className="w-4 h-4" />
              <span>New Presentation</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content - LUNA Design Pattern */}
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Filters and Search */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search presentations, authors, keywords..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 border border-border rounded-md text-sm bg-background"
            >
              <option value="date">Sort by Date</option>
              <option value="title">Sort by Title</option>
              <option value="slides">Sort by Slides</option>
            </select>
            
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-3 py-2 border border-border rounded-md text-sm bg-background"
            >
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="processing">Processing</option>
              <option value="failed">Failed</option>
              <option value="draft">Draft</option>
            </select>
          </div>
        </div>

        {/* Results Summary and View Toggle */}
        <div className="mb-6 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {filteredPresentations.length} presentations found
          </p>
          <div className="flex items-center space-x-2">
            <Button 
              variant={viewMode === "grid" ? "default" : "outline"} 
              size="sm"
              onClick={() => setViewMode("grid")}
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button 
              variant={viewMode === "list" ? "default" : "outline"} 
              size="sm"
              onClick={() => setViewMode("list")}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Presentations Grid */}
        {filteredPresentations.length > 0 ? (
          <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6" : "space-y-4"}>
            {filteredPresentations.map((presentation: Presentation) => (
              <Card key={presentation.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-base font-medium truncate">
                        {presentation.title}
                      </CardTitle>
                      <CardDescription className="line-clamp-2 mt-1">
                        {presentation.description || presentation.metadata?.category || "No description available"}
                      </CardDescription>
                    </div>
                    <Badge variant={getStatusVariant(presentation.status)} className="ml-2">
                      {presentation.status}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Thumbnail Placeholder */}
                  <div className="aspect-video bg-muted rounded-lg mb-4 flex items-center justify-center border">
                    {presentation.thumbnailUrl ? (
                      <img 
                        src={presentation.thumbnailUrl} 
                        alt={presentation.title}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <div className="text-center text-muted-foreground">
                        <Image className="w-8 h-8 mx-auto mb-2" />
                        <p className="text-xs">No preview available</p>
                      </div>
                    )}
                  </div>

                  {/* Author & Company */}
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    <div className="flex items-center space-x-2">
                      <User className="w-4 h-4" />
                      <span>{presentation.author || "Unknown"}</span>
                    </div>
                    {presentation.company && (
                      <div className="flex items-center space-x-2">
                        <Building className="w-4 h-4" />
                        <span>{presentation.company}</span>
                      </div>
                    )}
                  </div>

                  {/* Date & Basic Stats */}
                  <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(presentation.updatedAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <FileText className="w-4 h-4" />
                      <span>{presentation.slideCount} slides</span>
                    </div>
                  </div>

                  {/* Rich Metadata Grid */}
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
                    {presentation.fileSize && (
                      <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                        <HardDrive className="w-3 h-3" />
                        <span>{formatFileSize(presentation.fileSize)}</span>
                      </div>
                    )}
                    {presentation.processingTime && (
                      <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span>{formatDuration(presentation.processingTime)}</span>
                      </div>
                    )}
                  </div>

                  {/* Subject/Keywords Tags */}
                  {presentation.metadata?.subject && (
                    <div className="flex items-center space-x-2 pt-2 border-t border-border">
                      <Tag className="w-4 h-4 text-muted-foreground" />
                      <Badge variant="outline" className="text-xs">
                        {presentation.metadata.subject}
                      </Badge>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center space-x-2 pt-4">
                    <Button 
                      size="sm" 
                      className="flex-1"
                      onClick={() => handleViewPresentation(presentation.id)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Analyze
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => window.open(presentation.firebaseStorageUrl || "#", "_blank")}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleDeletePresentation(presentation.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Card className="max-w-md mx-auto">
              <CardContent className="pt-6 text-center">
                <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-3">
                  No presentations found
                </h3>
                <p className="text-sm text-muted-foreground mb-6">
                  {searchTerm || filterStatus !== "all" 
                    ? "Try adjusting your search or filters"
                    : "Get started by uploading your first presentation"
                  }
                </p>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Upload Presentation
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
} 