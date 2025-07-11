/**
 * Presentation Analysis - Screaming Architecture Frontend
 * 🎯 RESPONSIBILITY: Orchestrate all analysis tabs and presentation state
 * 📋 SCOPE: Main entry point for presentation analysis with Universal JSON
 * 🏗️ ARCHITECTURE: Tab-based modular design with centralized state
 */

import React, { useEffect, useState } from 'react';
import { useLocation, useRoute } from 'wouter';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  FileText,
  BarChart3,
  Layers,
  Image,
  Brain,
  Zap,
  Network,
  Edit3,
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  Loader2,
} from 'lucide-react';

// Import all tab components
import { OverviewTab } from '@/components/overview/OverviewTab';
import { JsonTreeTab } from '@/components/json-tree/JsonTreeTab';
import { SlidesTab } from '@/components/slides/SlidesTab';
import { AssetsTab } from '@/components/assets/AssetsTab';
import { AnalyticsTab } from '@/components/analytics/AnalyticsTab';
import { ActionsTab } from '@/components/actions/ActionsTab';

// Import existing JSON Flow Viewer (reuse)
import JsonFlowViewer from '@/components/json-flow-viewer';

// Import hooks
import { usePresentation } from '@/hooks/use-presentation';
import { PresentationTab } from '@/types/universal-json';

interface PresentationAnalysisProps {
  id?: string;
}

export default function PresentationAnalysis({ id }: PresentationAnalysisProps) {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState('overview');
  
  // Get presentation ID from URL params using wouter
  const [match, params] = useRoute('/presentations/:id/analysis');
  const [matchAnalysis, paramsAnalysis] = useRoute('/analysis/:id');
  
  // Extract the correct ID from route parameters
  const presentationId = id || params?.id || paramsAnalysis?.id || '';

  // Use central presentation hook
  const {
    state,
    loadPresentation,
    refreshPresentation,
    generateAnalytics,
  } = usePresentation();

  // Load presentation on mount
  useEffect(() => {
    if (presentationId && presentationId !== state.id) {
      loadPresentation(presentationId);
    }
  }, [presentationId, state.id, loadPresentation]);

  // Define tabs configuration
  const tabs: PresentationTab[] = [
    {
      id: 'overview',
      name: 'Overview',
      icon: 'FileText',
      component: OverviewTab,
      badge: undefined,
    },
    {
      id: 'json-tree',
      name: 'JSON Tree',
      icon: 'Network',
      component: JsonTreeTab,
      badge: undefined,
    },
    {
      id: 'json-flow',
      name: 'JSON Flow',
      icon: 'BarChart3',
      component: JsonFlowViewer,
      badge: undefined,
    },
    {
      id: 'slides',
      name: 'Slides',
      icon: 'Layers',
      component: SlidesTab,
      badge: state.universalJson?.slides?.length,
    },
    {
      id: 'assets',
      name: 'Assets',
      icon: 'Image',
      component: AssetsTab,
      badge: state.analytics?.totalAssets.reduce((total, asset) => total + asset.count, 0),
    },
    {
      id: 'analytics',
      name: 'Analytics',
      icon: 'Brain',
      component: AnalyticsTab,
      badge: undefined,
    },
    {
      id: 'actions',
      name: 'Actions',
      icon: 'Zap',
      component: ActionsTab,
      badge: undefined,
    },
  ];

  // Handle refresh
  const handleRefresh = async () => {
    await refreshPresentation();
    generateAnalytics();
  };

  // Render loading state
  if (state.isLoading || state.isConverting) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6">
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-spin" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                {state.isConverting ? 'Converting Presentation' : 'Loading Analysis'}
              </h2>
              <p className="text-sm text-gray-600">
                {state.isConverting 
                  ? 'Processing your PPTX file and extracting content...'
                  : 'Loading presentation data and generating insights...'
                }
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render error state
  if (state.error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Failed to Load Presentation
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                {state.error}
              </p>
              <div className="space-y-2">
                <Button onClick={handleRefresh} className="w-full">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setLocation('/')} 
                  className="w-full"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Go Back
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render empty state
  if (!state.universalJson) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6">
            <div className="text-center">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                No Presentation Found
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                The presentation you're looking for doesn't exist or hasn't been processed yet.
              </p>
              <Button 
                variant="outline" 
                onClick={() => setLocation('/')} 
                className="w-full"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const presentation = state.universalJson;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="px-4 py-4 md:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLocation('/')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  {presentation.metadata.title}
                </h1>
                <div className="flex items-center space-x-2 mt-1">
                  <Badge variant="outline">
                    {presentation.slides.length} slides
                  </Badge>
                  {state.version && (
                    <Badge variant="outline">
                      v{state.version}
                    </Badge>
                  )}
                  {state.lastUpdated && (
                    <span className="text-xs text-gray-500">
                      Updated {new Date(state.lastUpdated).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={state.isLoading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${state.isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              
              {/* Quick stats */}
              <div className="hidden md:flex items-center space-x-4 text-sm text-gray-600">
                <span>{presentation.metadata.slideCount} slides</span>
                <span>•</span>
                <span>{presentation.metadata.imageCount} images</span>
                <span>•</span>
                <span>{state.analytics?.complexity || 'Unknown'} complexity</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="h-[calc(100vh-80px)]">
        <Tabs 
          value={activeTab} 
          onValueChange={setActiveTab}
          className="h-full flex flex-col"
        >
          {/* Tab Navigation */}
          <div className="bg-white border-b border-gray-200">
            <div className="px-4 md:px-6">
              <TabsList className="h-12 w-full justify-start bg-transparent border-0 rounded-none">
                {tabs.map((tab) => (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className="flex items-center space-x-2 px-4 py-2 border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent rounded-none"
                  >
                    <TabIcon name={tab.icon} />
                    <span>{tab.name}</span>
                    {tab.badge !== undefined && (
                      <Badge variant="secondary" className="ml-1 text-xs">
                        {tab.badge}
                      </Badge>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-hidden">
            <TabsContent value="overview" className="h-full m-0 overflow-auto">
              <OverviewTab 
                presentation={presentation}
                analytics={state.analytics}
              />
            </TabsContent>

            <TabsContent value="json-tree" className="h-full m-0">
              <JsonTreeTab presentation={presentation} />
            </TabsContent>

            <TabsContent value="json-flow" className="h-full m-0 p-6">
              <JsonFlowViewer 
                data={presentation}
                className="h-full"
              />
            </TabsContent>

            <TabsContent value="slides" className="h-full m-0">
              <SlidesTab 
                presentation={presentation}
                thumbnails={state.thumbnails}
              />
            </TabsContent>

            <TabsContent value="assets" className="h-full m-0">
              <AssetsTab presentation={presentation} />
            </TabsContent>

            <TabsContent value="analytics" className="h-full m-0 overflow-auto">
              <AnalyticsTab 
                presentation={presentation}
                analytics={state.analytics}
              />
            </TabsContent>

            <TabsContent value="actions" className="h-full m-0 overflow-auto">
              <ActionsTab 
                presentation={presentation}
                onRefresh={handleRefresh}
              />
            </TabsContent>
          </div>
        </Tabs>
      </main>
    </div>
  );
}

// Tab Icon Component
function TabIcon({ name }: { name: string }) {
  const iconProps = { className: "w-4 h-4" };
  
  switch (name) {
    case 'FileText':
      return <FileText {...iconProps} />;
    case 'Network':
      return <Network {...iconProps} />;
    case 'BarChart3':
      return <BarChart3 {...iconProps} />;
    case 'Layers':
      return <Layers {...iconProps} />;
    case 'Image':
      return <Image {...iconProps} />;
    case 'Brain':
      return <Brain {...iconProps} />;
    case 'Zap':
      return <Zap {...iconProps} />;
    case 'Edit3':
      return <Edit3 {...iconProps} />;
    default:
      return <FileText {...iconProps} />;
  }
} 