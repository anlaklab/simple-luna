/**
 * Presentations Page - Enhanced with Complete Functionality
 * 🎯 RESPONSIBILITY: Full presentation management with CRUD operations
 * 📋 SCOPE: List, search, filter, edit, delete, export presentations
 * ⚡ FEATURES: Advanced search, bulk operations, metadata editing, real exports
 */

import React, { useState, useCallback } from 'react';
import { useLocation } from 'wouter';
import { usePresentations, usePresentationSearch, usePresentationActions } from '@/hooks/use-presentations';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
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
  Edit3,
  Filter,
  MoreHorizontal,
  Settings,
  Share,
  Copy,
  FileDown,
  Archive,
  RefreshCw,
  CheckSquare,
  Square,
  X,
  ChevronDown,
  SortAsc,
  SortDesc,
} from 'lucide-react';
import type { Presentation, PresentationFilters, UpdatePresentationData } from '@/hooks/use-presentations';

export default function Presentations() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Search and filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [searchMode, setSearchMode] = useState<'simple' | 'advanced'>('simple');
  const [filters, setFilters] = useState<PresentationFilters>({
    page: 1,
    limit: 20,
    sortBy: 'updatedAt',
    sortOrder: 'desc',
  });
  
  // View and selection state
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedPresentations, setSelectedPresentations] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  
  // Dialog states
  const [editingPresentation, setEditingPresentation] = useState<Presentation | null>(null);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Data hooks
  const {
    presentations: presentationsData,
    isLoading,
    updatePresentation,
    deletePresentation,
    bulkDelete,
    isUpdating,
    isDeleting,
    isBulkDeleting,
    refetch,
  } = usePresentations(filters);

  const { exportPresentation, isExporting } = usePresentationActions();

  // Fix pagination access
  const pagination = presentationsData?.data?.pagination || {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  };

  // Fix data access
  const presentationsArray = Array.isArray(presentationsData?.data) 
    ? presentationsData.data 
    : presentationsData?.data?.items || [];

  // Search functionality
  const searchQuery = searchTerm.length > 0 ? {
    q: searchTerm,
    page: filters.page,
    limit: filters.limit,
    searchIn: ['title', 'content', 'tags', 'author', 'company'] as ('title' | 'content' | 'tags' | 'author' | 'company')[],
  } : null;

  const { data: searchResults, isLoading: isSearching } = usePresentationSearch(searchQuery || { q: '' });

  // Get current data source
  const currentPresentations = searchQuery ? (searchResults?.data || []) : presentationsArray;
  const currentPagination = searchQuery ? searchResults?.pagination : pagination;
  const currentIsLoading = searchQuery ? isSearching : isLoading;

  // Selection handlers
  const handleSelectPresentation = useCallback((id: string, checked: boolean) => {
    const newSelected = new Set(selectedPresentations);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedPresentations(newSelected);
    setSelectAll(newSelected.size === currentPresentations.length && currentPresentations.length > 0);
  }, [selectedPresentations, currentPresentations.length]);

  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedPresentations(new Set(currentPresentations.map((p: Presentation) => p.id)));
    } else {
      setSelectedPresentations(new Set());
    }
    setSelectAll(checked);
  }, [currentPresentations]);

  // Navigation handlers
  const handleNewPresentation = () => {
    setLocation('/converter');
  };

  const handleViewPresentation = (id: string) => {
    setLocation(`/presentations/${id}/analysis`);
  };

  // CRUD operations
  const handleEditPresentation = async (id: string, data: UpdatePresentationData) => {
    try {
      await updatePresentation({ id, data });
      setEditingPresentation(null);
      await refetch();
    } catch (error) {
      console.error('Failed to update presentation:', error);
    }
  };

  const handleDeletePresentation = async (id: string) => {
    try {
      await deletePresentation(id);
      setSelectedPresentations(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
      await refetch();
    } catch (error) {
      console.error('Failed to delete presentation:', error);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedPresentations.size === 0) return;
    
    try {
      await bulkDelete(Array.from(selectedPresentations));
      setSelectedPresentations(new Set());
      setSelectAll(false);
      await refetch();
    } catch (error) {
      console.error('Failed to bulk delete presentations:', error);
    }
  };

  // Export handlers
  const handleExportPresentation = async (id: string, format: 'pdf' | 'pptx') => {
    try {
      const downloadUrl = await exportPresentation({ id, format });
      if (downloadUrl) {
        window.open(downloadUrl, '_blank');
      }
    } catch (error) {
      console.error('Failed to export presentation:', error);
    }
  };

  // Filter handlers
  const handleFilterChange = (key: keyof PresentationFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: key === 'page' ? value : 1, // Reset page when other filters change
    }));
  };

  const handleSortChange = (sortBy: string) => {
    const newSortOrder = filters.sortBy === sortBy && filters.sortOrder === 'asc' ? 'desc' : 'asc';
    setFilters(prev => ({
      ...prev,
      sortBy: sortBy as any,
      sortOrder: newSortOrder,
      page: 1,
    }));
  };

  // Utility functions
  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return 'Unknown';
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
    if (!ms) return 'Unknown';
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
      case 'draft': return 'outline';
      default: return 'secondary';
    }
  };

  // Loading state
  if (currentIsLoading && currentPresentations.length === 0) {
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
                {currentPagination?.total || 0} presentations • {selectedPresentations.size} selected
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" onClick={() => refetch()} disabled={currentIsLoading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${currentIsLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button onClick={handleNewPresentation}>
                <Plus className="w-4 h-4 mr-2" />
                New Presentation
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - LUNA Design Pattern */}
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Search and Filters Bar */}
        <div className="mb-6 space-y-4">
          {/* Main Search */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search presentations, authors, content, keywords..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              >
                <Filter className="w-4 h-4 mr-2" />
                Filters
                <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} />
              </Button>
              
              <Select value={`${filters.sortBy}_${filters.sortOrder}`} onValueChange={(value) => {
                const [sortBy, sortOrder] = value.split('_');
                handleFilterChange('sortBy', sortBy);
                handleFilterChange('sortOrder', sortOrder);
              }}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="updatedAt_desc">Latest First</SelectItem>
                  <SelectItem value="updatedAt_asc">Oldest First</SelectItem>
                  <SelectItem value="title_asc">Title A-Z</SelectItem>
                  <SelectItem value="title_desc">Title Z-A</SelectItem>
                  <SelectItem value="slideCount_desc">Most Slides</SelectItem>
                  <SelectItem value="slideCount_asc">Fewest Slides</SelectItem>
                  <SelectItem value="fileSize_desc">Largest Files</SelectItem>
                  <SelectItem value="fileSize_asc">Smallest Files</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Advanced Filters */}
          {showAdvancedFilters && (
            <Card className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="status-filter">Status</Label>
                  <Select value={filters.status || 'all'} onValueChange={(value) => 
                    handleFilterChange('status', value === 'all' ? undefined : value)
                  }>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="processing">Processing</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="author-filter">Author</Label>
                  <Input
                    id="author-filter"
                    placeholder="Filter by author..."
                    value={filters.author || ''}
                    onChange={(e) => handleFilterChange('author', e.target.value || undefined)}
                  />
                </div>

                <div>
                  <Label htmlFor="company-filter">Company</Label>
                  <Input
                    id="company-filter"
                    placeholder="Filter by company..."
                    value={filters.company || ''}
                    onChange={(e) => handleFilterChange('company', e.target.value || undefined)}
                  />
                </div>

                <div>
                  <Label htmlFor="slides-filter">Slide Count</Label>
                  <div className="flex space-x-2">
                    <Input
                      placeholder="Min"
                      type="number"
                      value={filters.minSlideCount || ''}
                      onChange={(e) => handleFilterChange('minSlideCount', e.target.value ? parseInt(e.target.value) : undefined)}
                    />
                    <Input
                      placeholder="Max"
                      type="number"
                      value={filters.maxSlideCount || ''}
                      onChange={(e) => handleFilterChange('maxSlideCount', e.target.value ? parseInt(e.target.value) : undefined)}
                    />
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Bulk Actions */}
        {selectedPresentations.size > 0 && (
          <Card className="mb-6 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <span className="text-sm font-medium">
                  {selectedPresentations.size} selected
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedPresentations(new Set());
                    setSelectAll(false);
                  }}
                >
                  Clear Selection
                </Button>
              </div>
              
              <div className="flex items-center space-x-2">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" disabled={isBulkDeleting}>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Selected
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Presentations</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete {selectedPresentations.size} presentation(s)? 
                        This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground">
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </Card>
        )}

        {/* Results Summary and View Toggle */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={selectAll}
                onCheckedChange={handleSelectAll}
                disabled={currentPresentations.length === 0}
              />
              <p className="text-sm text-muted-foreground">
                {currentPagination?.total || 0} presentations found
                {searchTerm && (
                  <span className="text-foreground font-medium"> for "{searchTerm}"</span>
                )}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button 
              variant={viewMode === 'grid' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button 
              variant={viewMode === 'list' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Presentations Grid/List */}
        {currentPresentations.length > 0 ? (
          <>
            <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6' : 'space-y-4'}>
              {currentPresentations.map((presentation: Presentation) => (
                <Card key={presentation.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 min-w-0 flex-1">
                        <Checkbox
                          checked={selectedPresentations.has(presentation.id)}
                          onCheckedChange={(checked) => handleSelectPresentation(presentation.id, checked as boolean)}
                        />
                        <div className="min-w-0 flex-1">
                          <CardTitle className="text-base font-medium truncate">
                            {presentation.title}
                          </CardTitle>
                          <CardDescription className="line-clamp-2 mt-1">
                            {presentation.description || presentation.metadata?.category || 'No description available'}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 ml-2">
                        <Badge variant={getStatusVariant(presentation.status)}>
                          {presentation.status}
                        </Badge>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" onClick={() => setEditingPresentation(presentation)}>
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                        </Dialog>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Thumbnail */}
                    <div className="aspect-video bg-muted rounded-lg mb-4 flex items-center justify-center border overflow-hidden">
                      {presentation.thumbnailUrl ? (
                        <img 
                          src={presentation.thumbnailUrl} 
                          alt={presentation.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-center text-muted-foreground">
                          <Image className="w-8 h-8 mx-auto mb-2" />
                          <p className="text-xs">No preview available</p>
                        </div>
                      )}
                    </div>

                    {/* Metadata */}
                    <div className="space-y-2">
                      {/* Author & Company */}
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <div className="flex items-center space-x-2">
                          <User className="w-4 h-4" />
                          <span>{presentation.author || 'Unknown'}</span>
                        </div>
                        {presentation.company && (
                          <div className="flex items-center space-x-2">
                            <Building className="w-4 h-4" />
                            <span className="truncate">{presentation.company}</span>
                          </div>
                        )}
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4" />
                          <span>{new Date(presentation.updatedAt).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <FileText className="w-4 h-4" />
                          <span>{presentation.slideCount} slides</span>
                        </div>
                        {presentation.fileSize && (
                          <div className="flex items-center space-x-2">
                            <HardDrive className="w-4 h-4" />
                            <span>{formatFileSize(presentation.fileSize)}</span>
                          </div>
                        )}
                        {presentation.processing?.processingTime && (
                          <div className="flex items-center space-x-2">
                            <Clock className="w-4 h-4" />
                            <span>{formatDuration(presentation.processing.processingTime)}</span>
                          </div>
                        )}
                      </div>

                      {/* Tags */}
                      {(presentation.tags?.length || 0) > 0 && (
                        <div className="flex items-center space-x-2">
                          <Tag className="w-4 h-4 text-muted-foreground" />
                          <div className="flex flex-wrap gap-1">
                            {presentation.tags?.slice(0, 3).map((tag, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {(presentation.tags?.length || 0) > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{(presentation.tags?.length || 0) - 3}
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2 pt-4 border-t border-border">
                      <Button 
                        size="sm" 
                        className="flex-1"
                        onClick={() => handleViewPresentation(presentation.id)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Analyze
                      </Button>
                      
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <FileDown className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Export Presentation</DialogTitle>
                            <DialogDescription>
                              Choose the format you want to export "{presentation.title}"
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <Button
                              className="w-full justify-start"
                              variant="outline"
                              onClick={() => handleExportPresentation(presentation.id, 'pdf')}
                              disabled={isExporting}
                            >
                              <FileText className="w-4 h-4 mr-2" />
                              Export as PDF
                            </Button>
                            <Button
                              className="w-full justify-start"
                              variant="outline"
                              onClick={() => handleExportPresentation(presentation.id, 'pptx')}
                              disabled={isExporting}
                            >
                              <FileDown className="w-4 h-4 mr-2" />
                              Export as PPTX
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                      
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" onClick={() => setEditingPresentation(presentation)}>
                            <Edit3 className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                      </Dialog>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Presentation</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{presentation.title}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleDeletePresentation(presentation.id)}
                              className="bg-destructive text-destructive-foreground"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            {currentPagination && currentPagination.totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center space-x-2">
                <Button
                  variant="outline"
                  disabled={!currentPagination.hasPreviousPage}
                  onClick={() => handleFilterChange('page', Math.max(1, filters.page! - 1))}
                >
                  Previous
                </Button>
                
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, currentPagination.totalPages) }, (_, i) => {
                    const page = Math.max(1, Math.min(
                      currentPagination.totalPages - 4,
                      Math.max(1, (filters.page || 1) - 2)
                    )) + i;
                    
                    return (
                      <Button
                        key={page}
                        variant={page === filters.page ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleFilterChange('page', page)}
                      >
                        {page}
                      </Button>
                    );
                  })}
                </div>
                
                <Button
                  variant="outline"
                  disabled={!currentPagination.hasNextPage}
                  onClick={() => handleFilterChange('page', (filters.page || 1) + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16">
            <Card className="max-w-md mx-auto">
              <CardContent className="pt-6 text-center">
                <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-3">
                  No presentations found
                </h3>
                <p className="text-sm text-muted-foreground mb-6">
                  {searchTerm || Object.values(filters).some(v => v !== undefined && v !== 1 && v !== 20 && v !== 'updatedAt' && v !== 'desc')
                    ? 'Try adjusting your search or filters'
                    : 'Get started by uploading your first presentation'
                  }
                </p>
                <Button onClick={handleNewPresentation}>
                  <Plus className="w-4 h-4 mr-2" />
                  Upload Presentation
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      {/* Edit Presentation Dialog */}
      {editingPresentation && (
        <Dialog open={!!editingPresentation} onOpenChange={() => setEditingPresentation(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Presentation</DialogTitle>
              <DialogDescription>
                Update presentation metadata and settings
              </DialogDescription>
            </DialogHeader>
            <EditPresentationForm
              presentation={editingPresentation}
              onSave={handleEditPresentation}
              onCancel={() => setEditingPresentation(null)}
              isLoading={isUpdating}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// Edit Presentation Form Component
interface EditPresentationFormProps {
  presentation: Presentation;
  onSave: (id: string, data: UpdatePresentationData) => void;
  onCancel: () => void;
  isLoading: boolean;
}

function EditPresentationForm({ presentation, onSave, onCancel, isLoading }: EditPresentationFormProps) {
  const [formData, setFormData] = useState<UpdatePresentationData>({
    title: presentation.title,
    description: presentation.description || '',
    tags: presentation.tags || [],
    category: presentation.metadata?.category || '',
    isPublic: presentation.isPublic || false,
    allowDownload: presentation.allowDownload || false,
  });

  const [newTag, setNewTag] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(presentation.id, formData);
  };

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags?.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...(prev.tags || []), newTag.trim()],
      }));
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags?.filter(tag => tag !== tagToRemove) || [],
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
          required
        />
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          rows={3}
        />
      </div>

      <div>
        <Label htmlFor="category">Category</Label>
        <Input
          id="category"
          value={formData.category}
          onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
          placeholder="e.g., Business, Education, Marketing"
        />
      </div>

      <div>
        <Label>Tags</Label>
        <div className="flex space-x-2 mb-2">
          <Input
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            placeholder="Add a tag..."
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
          />
          <Button type="button" variant="outline" onClick={handleAddTag}>
            Add
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {formData.tags?.map((tag, index) => (
            <Badge key={index} variant="secondary" className="flex items-center space-x-1">
              <span>{tag}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0"
                onClick={() => handleRemoveTag(tag)}
              >
                <X className="w-3 h-3" />
              </Button>
            </Badge>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="isPublic"
            checked={formData.isPublic}
            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isPublic: checked as boolean }))}
          />
          <Label htmlFor="isPublic">Make presentation public</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="allowDownload"
            checked={formData.allowDownload}
            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, allowDownload: checked as boolean }))}
          />
          <Label htmlFor="allowDownload">Allow downloads</Label>
        </div>
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
} 