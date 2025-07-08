import React, { useState, useEffect } from 'react';
import { useRoute, useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, FileText, RefreshCw, Loader2, Database, Calendar, User, HardDrive, Clock, Image, Layers } from 'lucide-react';
import JsonFlowViewer from '@/components/json-flow-viewer';

export default function PresentationAnalysis() {
  const [match, params] = useRoute('/presentations/:id/analysis');
  const id = params?.id;
  const [, setLocation] = useLocation();
  
  // State management for Firebase data
  const [isLoading, setIsLoading] = useState(false);
  const [presentationData, setPresentationData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Load data function - now using Firebase data
  const loadPresentationData = async () => {
    if (!id) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('🔍 Loading presentation data from Firebase for:', id);
      
      // Get presentation data from our Firebase endpoint
      const response = await fetch(`http://localhost:3000/api/v1/presentations/${id}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch presentation: ${response.status} - ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.success && result.data) {
        setPresentationData(result.data);
        console.log('✅ Presentation data loaded from Firebase:', result.data);
      } else {
        throw new Error(result.error?.message || 'Failed to load presentation data');
      }
      
    } catch (err: any) {
      console.error('❌ Error loading presentation data:', err);
      setError(err.message || 'Failed to load presentation data');
    } finally {
      setIsLoading(false);
    }
  };

  // Load data on mount
  useEffect(() => {
    loadPresentationData();
  }, [id]);

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

  if (!id) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <p>No presentation ID provided</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setLocation('/presentations')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Presentations
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Presentation Analysis</h1>
            <p className="text-muted-foreground">
              {presentationData ? (
                <>
                  <strong>{presentationData.title}</strong>
                  {presentationData.originalFilename && (
                    <> • <code>{presentationData.originalFilename}</code></>
                  )}
                </>
              ) : (
                `ID: ${id}`
              )}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadPresentationData} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </>
            )}
          </Button>
          {presentationData && (
            <Badge variant="secondary" className="flex items-center space-x-1">
              <Database className="w-3 h-3" />
              <span>{presentationData.slideCount || 0} slides</span>
            </Badge>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <span>❌</span>
              <span className="text-red-700">{error}</span>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={loadPresentationData}
              className="mt-2"
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {isLoading && !presentationData && (
        <Card>
          <CardContent className="p-6 text-center">
            <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin" />
            <p>Loading presentation from Firebase...</p>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      {presentationData && (
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="metadata">Metadata</TabsTrigger>
            <TabsTrigger value="json">JSON Data</TabsTrigger>
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center space-x-2">
                    <FileText className="w-5 h-5" />
                    <span>Basic Info</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center space-x-2">
                      <User className="w-4 h-4 text-gray-500" />
                      <span><strong>Author:</strong> {presentationData.author}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <span><strong>Updated:</strong> {new Date(presentationData.updatedAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Database className="w-4 h-4 text-gray-500" />
                      <span><strong>Slides:</strong> {presentationData.slideCount}</span>
                    </div>
                    <div>
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        {presentationData.status}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center space-x-2">
                    <HardDrive className="w-5 h-5" />
                    <span>File Details</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center space-x-2">
                      <HardDrive className="w-4 h-4 text-gray-500" />
                      <span><strong>Size:</strong> {formatFileSize(presentationData.fileSize)}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <span><strong>Processing:</strong> {formatDuration(presentationData.processingTime)}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <FileText className="w-4 h-4 text-gray-500" />
                      <span><strong>Type:</strong> {presentationData.type || 'PPTX'}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center space-x-2">
                    <Image className="w-5 h-5" />
                    <span>Content Stats</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center space-x-2">
                      <Image className="w-4 h-4 text-gray-500" />
                      <span><strong>Images:</strong> {presentationData.metadata?.imageCount || 0}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Layers className="w-4 h-4 text-gray-500" />
                      <span><strong>Masters:</strong> {presentationData.metadata?.masterSlideCount || 0}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Database className="w-4 h-4 text-gray-500" />
                      <span><strong>Layouts:</strong> {presentationData.metadata?.layoutSlideCount || 0}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Description */}
            {presentationData.description && (
              <Card>
                <CardHeader>
                  <CardTitle>📝 Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700">{presentationData.description}</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Metadata Tab */}
          <TabsContent value="metadata" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>📊 Presentation Metadata</CardTitle>
                <CardDescription>Complete metadata from Firebase</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-semibold text-lg">Basic Information</h4>
                    <div className="space-y-2 text-sm">
                      <div><strong>Subject:</strong> {presentationData.metadata?.subject || 'Not specified'}</div>
                      <div><strong>Category:</strong> {presentationData.metadata?.category || 'Not specified'}</div>
                      <div><strong>Keywords:</strong> {presentationData.metadata?.keywords || 'None'}</div>
                      <div><strong>Manager:</strong> {presentationData.metadata?.manager || 'Not specified'}</div>
                      <div><strong>Company:</strong> {presentationData.company || 'Not specified'}</div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h4 className="font-semibold text-lg">Technical Details</h4>
                    <div className="space-y-2 text-sm">
                      <div><strong>Audio Count:</strong> {presentationData.metadata?.audioCount || 0}</div>
                      <div><strong>Revision Number:</strong> {presentationData.metadata?.revisionNumber || 0}</div>
                      <div><strong>Last Saved:</strong> {presentationData.metadata?.lastSavedTime ? new Date(presentationData.metadata.lastSavedTime).toLocaleString() : 'Unknown'}</div>
                      <div><strong>Thumbnail Count:</strong> {presentationData.thumbnailCount || 0}</div>
                    </div>
                  </div>
                </div>

                {presentationData.metadata?.comments && (
                  <div className="mt-6 pt-6 border-t">
                    <h4 className="font-semibold text-lg mb-2">Comments</h4>
                    <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
                      {presentationData.metadata.comments}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* JSON Data Tab */}
          <TabsContent value="json" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Complete Firebase Data
                </CardTitle>
                <CardDescription>
                  Full presentation data structure from Firebase
                </CardDescription>
              </CardHeader>
              <CardContent>
                {presentationData.fullData ? (
                  <JsonFlowViewer data={presentationData.fullData} />
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    <p>No detailed JSON data available</p>
                    <p className="text-sm mt-2">Basic metadata is shown in other tabs</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analysis Tab */}
          <TabsContent value="analysis" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>📈 Presentation Analysis</CardTitle>
                <CardDescription>
                  Insights and statistics about this presentation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-3">Content Distribution</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Total Slides:</span>
                        <Badge variant="outline">{presentationData.slideCount}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Images:</span>
                        <Badge variant="outline">{presentationData.metadata?.imageCount || 0}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Master Slides:</span>
                        <Badge variant="outline">{presentationData.metadata?.masterSlideCount || 0}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Layout Templates:</span>
                        <Badge variant="outline">{presentationData.metadata?.layoutSlideCount || 0}</Badge>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-3">Data Sources</h4>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Badge variant="default" className="bg-green-100 text-green-800">Firebase</Badge>
                        <span className="text-sm">Real-time data</span>
                      </div>
                      {presentationData.firebaseStorageUrl && (
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">Storage</Badge>
                          <span className="text-sm">File available</span>
                        </div>
                      )}
                      {presentationData.jsonDataUrl && (
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">JSON</Badge>
                          <span className="text-sm">Processed data</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Links */}
                <div className="mt-6 pt-6 border-t">
                  <h4 className="font-semibold mb-3">External Resources</h4>
                  <div className="flex flex-wrap gap-2">
                    {presentationData.firebaseStorageUrl && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={presentationData.firebaseStorageUrl} target="_blank" rel="noopener noreferrer">
                          View Original File
                        </a>
                      </Button>
                    )}
                    {presentationData.jsonDataUrl && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={presentationData.jsonDataUrl} target="_blank" rel="noopener noreferrer">
                          Download JSON Data
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Data Source Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Database className="w-5 h-5" />
            <span>Data Source</span>
          </CardTitle>
          <CardDescription>Information about where this data comes from</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Firebase Connection:</strong>
              <ul className="mt-1 space-y-1 text-muted-foreground">
                <li>✅ Collection: <code>presentation_json_data</code></li>
                <li>✅ Document ID: <code>{id}</code></li>
                <li>✅ Real-time sync: Active</li>
              </ul>
            </div>
            <div>
              <strong>API Endpoints:</strong>
              <ul className="mt-1 space-y-1 text-muted-foreground">
                <li>✅ Individual: <code>/api/v1/presentations/{id}</code></li>
                <li>✅ List: <code>/api/v1/presentations</code></li>
                <li>✅ Status: <code>/api/v1/status</code></li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 