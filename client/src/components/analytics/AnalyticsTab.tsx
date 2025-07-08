/**
 * Analytics Tab - Screaming Architecture Frontend
 * 🎯 RESPONSIBILITY: AI insights and semantic analysis
 * 📋 SCOPE: OpenAI analysis, structure insights, recommendations
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Brain,
  BarChart3,
  TrendingUp,
  Users,
  Target,
  Lightbulb,
  AlertTriangle,
  CheckCircle,
  Clock,
  Eye,
  MessageSquare,
  Sparkles,
  RefreshCw,
} from 'lucide-react';

import { UniversalPresentation, PresentationAnalytics } from '@/types/universal-json';
import { api } from '@/hooks/use-api';

interface AnalyticsTabProps {
  presentation: UniversalPresentation;
  analytics?: PresentationAnalytics | null;
}

interface SemanticAnalysis {
  summary: {
    title: string;
    mainTopics: string[];
    keyPoints: string[];
    slideStructure: {
      introduction: number[];
      mainContent: number[];
      conclusion: number[];
    };
    complexity: 'simple' | 'moderate' | 'complex';
    audience: 'general' | 'technical' | 'executive' | 'academic';
    narrative: {
      flow: 'linear' | 'modular' | 'mixed';
      coherence: number;
      engagement: number;
    };
  };
  analysisTime: number;
}

export function AnalyticsTab({ presentation, analytics }: AnalyticsTabProps) {
  const [semanticAnalysis, setSemanticAnalysis] = useState<SemanticAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Load semantic analysis
  const loadSemanticAnalysis = async () => {
    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      const response = await api.ai.getSemanticDigest(presentation.id);
      
      if (response.success && response.data) {
        setSemanticAnalysis(response.data);
      } else {
        setAnalysisError(response.error || 'Failed to analyze presentation');
      }
    } catch (error) {
      setAnalysisError(error instanceof Error ? error.message : 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Auto-load analysis on mount
  useEffect(() => {
    if (presentation.id && !semanticAnalysis && !isAnalyzing) {
      loadSemanticAnalysis();
    }
  }, [presentation.id]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold">Presentation Analytics</h3>
          <p className="text-sm text-gray-600 mt-1">
            AI-powered insights and semantic analysis
          </p>
        </div>
        <Button 
          onClick={loadSemanticAnalysis}
          disabled={isAnalyzing}
          variant="outline"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isAnalyzing ? 'animate-spin' : ''}`} />
          {isAnalyzing ? 'Analyzing...' : 'Refresh Analysis'}
        </Button>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="semantic">Semantic</TabsTrigger>
          <TabsTrigger value="structure">Structure</TabsTrigger>
          <TabsTrigger value="recommendations">Suggestions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <AnalyticsOverview 
            presentation={presentation}
            analytics={analytics}
            semanticAnalysis={semanticAnalysis}
          />
        </TabsContent>

        <TabsContent value="semantic" className="space-y-6">
          <SemanticAnalysisView 
            analysis={semanticAnalysis}
            isLoading={isAnalyzing}
            error={analysisError}
          />
        </TabsContent>

        <TabsContent value="structure" className="space-y-6">
          <StructureAnalysis 
            presentation={presentation}
            semanticAnalysis={semanticAnalysis}
          />
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-6">
          <RecommendationsView 
            presentation={presentation}
            analytics={analytics}
            semanticAnalysis={semanticAnalysis}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Analytics Overview Component
function AnalyticsOverview({ 
  presentation, 
  analytics, 
  semanticAnalysis 
}: {
  presentation: UniversalPresentation;
  analytics?: PresentationAnalytics | null;
  semanticAnalysis?: SemanticAnalysis | null;
}) {
  const metadata = presentation.metadata;
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Basic Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="w-5 h-5" />
            <span>Key Metrics</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <MetricItem
            label="Total Slides"
            value={metadata.slideCount.toString()}
            icon={<Eye className="w-4 h-4" />}
          />
          <MetricItem
            label="Reading Time"
            value={analytics ? `${analytics.estimatedReadingTime}min` : 'Calculating...'}
            icon={<Clock className="w-4 h-4" />}
          />
          <MetricItem
            label="Complexity"
            value={analytics?.complexity || semanticAnalysis?.summary.complexity || 'Unknown'}
            icon={<TrendingUp className="w-4 h-4" />}
            valueColor={getComplexityColor(analytics?.complexity || semanticAnalysis?.summary.complexity)}
          />
          <MetricItem
            label="Target Audience"
            value={semanticAnalysis?.summary.audience || 'Analyzing...'}
            icon={<Users className="w-4 h-4" />}
          />
        </CardContent>
      </Card>

      {/* Content Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Content Distribution</CardTitle>
          <CardDescription>Breakdown of slide types</CardDescription>
        </CardHeader>
        <CardContent>
          {analytics?.slideTypes ? (
            <div className="space-y-3">
              {Object.entries(analytics.slideTypes).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 capitalize">{type}</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-16 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ 
                          width: `${(count / metadata.slideCount) * 100}%` 
                        }}
                      />
                    </div>
                    <span className="text-sm font-medium w-6 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-4">
              <BarChart3 className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">Analyzing content...</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Narrative Flow */}
      {semanticAnalysis?.summary.narrative && (
        <Card>
          <CardHeader>
            <CardTitle>Narrative Analysis</CardTitle>
            <CardDescription>Story flow and engagement</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Flow Type</span>
                <Badge variant="outline">{semanticAnalysis.summary.narrative.flow}</Badge>
              </div>
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Coherence</span>
                <span className="text-sm text-gray-600">
                  {Math.round(semanticAnalysis.summary.narrative.coherence * 100)}%
                </span>
              </div>
              <Progress 
                value={semanticAnalysis.summary.narrative.coherence * 100} 
                className="h-2"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Engagement</span>
                <span className="text-sm text-gray-600">
                  {Math.round(semanticAnalysis.summary.narrative.engagement * 100)}%
                </span>
              </div>
              <Progress 
                value={semanticAnalysis.summary.narrative.engagement * 100} 
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Accessibility Score */}
      {analytics?.accessibility && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Eye className="w-5 h-5" />
              <span>Accessibility</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <AccessibilityItem
              label="Alt Text"
              status={analytics.accessibility.hasAltText ? 'good' : 'poor'}
              description="Alternative text for images"
            />
            <AccessibilityItem
              label="Color Contrast"
              status={analytics.accessibility.colorContrast}
              description="Text readability"
            />
            <AccessibilityItem
              label="Font Readability"
              status={analytics.accessibility.fontReadability}
              description="Font size and style"
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Semantic Analysis View
function SemanticAnalysisView({ 
  analysis, 
  isLoading, 
  error 
}: {
  analysis: SemanticAnalysis | null;
  isLoading: boolean;
  error: string | null;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Brain className="w-12 h-12 mx-auto mb-4 text-blue-600 animate-pulse" />
          <p className="text-lg font-medium">Analyzing presentation...</p>
          <p className="text-sm text-gray-600">This may take a few moments</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-red-500" />
          <p className="text-lg font-medium text-red-700">Analysis Failed</p>
          <p className="text-sm text-gray-600 mt-2">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!analysis) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-lg font-medium">No Analysis Available</p>
          <p className="text-sm text-gray-600 mt-2">Click refresh to analyze this presentation</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Main Topics */}
      <Card>
        <CardHeader>
          <CardTitle>Main Topics</CardTitle>
          <CardDescription>Key themes identified by AI</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {analysis.summary.mainTopics.map((topic, index) => (
              <div key={index} className="flex items-center space-x-2">
                <Target className="w-4 h-4 text-blue-600" />
                <span className="text-sm">{topic}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Key Points */}
      <Card>
        <CardHeader>
          <CardTitle>Key Points</CardTitle>
          <CardDescription>Important takeaways</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {analysis.summary.keyPoints.map((point, index) => (
              <div key={index} className="flex items-start space-x-2">
                <Lightbulb className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm">{point}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Slide Structure */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Presentation Structure</CardTitle>
          <CardDescription>Logical flow analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <StructureSection
              title="Introduction"
              slides={analysis.summary.slideStructure.introduction}
              color="bg-green-100 text-green-800"
            />
            <StructureSection
              title="Main Content"
              slides={analysis.summary.slideStructure.mainContent}
              color="bg-blue-100 text-blue-800"
            />
            <StructureSection
              title="Conclusion"
              slides={analysis.summary.slideStructure.conclusion}
              color="bg-purple-100 text-purple-800"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Structure Analysis Component
function StructureAnalysis({ 
  presentation, 
  semanticAnalysis 
}: {
  presentation: UniversalPresentation;
  semanticAnalysis: SemanticAnalysis | null;
}) {
  const slides = presentation.slides || [];
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Slide Flow Visualization</CardTitle>
          <CardDescription>Visual representation of presentation structure</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {slides.map((slide, index) => {
              const isIntro = semanticAnalysis?.summary.slideStructure.introduction.includes(index);
              const isConclusion = semanticAnalysis?.summary.slideStructure.conclusion.includes(index);
              const isMainContent = semanticAnalysis?.summary.slideStructure.mainContent.includes(index);
              
              let sectionColor = 'bg-gray-100';
              let sectionLabel = 'Content';
              
              if (isIntro) {
                sectionColor = 'bg-green-100';
                sectionLabel = 'Introduction';
              } else if (isConclusion) {
                sectionColor = 'bg-purple-100';
                sectionLabel = 'Conclusion';
              } else if (isMainContent) {
                sectionColor = 'bg-blue-100';
                sectionLabel = 'Main Content';
              }

              return (
                <div key={slide.slideId} className="flex items-center space-x-4 p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center text-xs font-medium">
                      {index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm">{slide.name}</div>
                      <div className="text-xs text-gray-500">
                        {(slide.shapes || []).length} elements
                      </div>
                    </div>
                  </div>
                  <Badge className={sectionColor}>{sectionLabel}</Badge>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Recommendations View
function RecommendationsView({ 
  presentation, 
  analytics, 
  semanticAnalysis 
}: {
  presentation: UniversalPresentation;
  analytics?: PresentationAnalytics | null;
  semanticAnalysis?: SemanticAnalysis | null;
}) {
  const recommendations = generateRecommendations(presentation, analytics, semanticAnalysis);

  return (
    <div className="space-y-4">
      {recommendations.map((recommendation, index) => (
        <Card key={index}>
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <div className={`p-2 rounded-full ${getRecommendationColor(recommendation.priority)}`}>
                {getRecommendationIcon(recommendation.type)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <h4 className="font-medium">{recommendation.title}</h4>
                  <Badge variant={recommendation.priority === 'high' ? 'destructive' : 'outline'}>
                    {recommendation.priority}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600">{recommendation.description}</p>
                {recommendation.action && (
                  <Button size="sm" className="mt-2">
                    {recommendation.action}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Helper Components
function MetricItem({ 
  label, 
  value, 
  icon, 
  valueColor = 'text-gray-900' 
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  valueColor?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-2">
        <div className="text-gray-400">{icon}</div>
        <span className="text-sm font-medium text-gray-700">{label}</span>
      </div>
      <span className={`text-sm font-medium ${valueColor}`}>{value}</span>
    </div>
  );
}

function AccessibilityItem({ 
  label, 
  status, 
  description 
}: {
  label: string;
  status: 'good' | 'warning' | 'poor';
  description: string;
}) {
  const icons = {
    good: <CheckCircle className="w-4 h-4 text-green-600" />,
    warning: <AlertTriangle className="w-4 h-4 text-yellow-600" />,
    poor: <AlertTriangle className="w-4 h-4 text-red-600" />,
  };

  return (
    <div className="flex items-start space-x-2">
      {icons[status]}
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-gray-500">{description}</div>
      </div>
    </div>
  );
}

function StructureSection({ 
  title, 
  slides, 
  color 
}: {
  title: string;
  slides: number[];
  color: string;
}) {
  return (
    <div className="text-center">
      <div className={`p-3 rounded-lg ${color} mb-2`}>
        <div className="font-medium">{title}</div>
        <div className="text-sm">{slides.length} slides</div>
      </div>
      <div className="text-xs text-gray-600">
        {slides.length > 0 ? `Slides: ${slides.map(s => s + 1).join(', ')}` : 'No slides'}
      </div>
    </div>
  );
}

// Helper Functions
function getComplexityColor(complexity?: string) {
  switch (complexity) {
    case 'simple': return 'text-green-600';
    case 'moderate': return 'text-yellow-600';
    case 'complex': return 'text-red-600';
    default: return 'text-gray-600';
  }
}

function generateRecommendations(
  presentation: UniversalPresentation,
  analytics?: PresentationAnalytics | null,
  semanticAnalysis?: SemanticAnalysis | null
) {
  const recommendations: Array<{
    type: string;
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    action?: string;
  }> = [];

  // Accessibility recommendations
  if (analytics && !analytics.accessibility.hasAltText) {
    recommendations.push({
      type: 'accessibility',
      priority: 'high',
      title: 'Add Alternative Text',
      description: 'Images and media elements are missing alternative text for accessibility.',
      action: 'Fix Accessibility',
    });
  }

  // Structure recommendations
  if (semanticAnalysis && semanticAnalysis.summary.narrative.coherence < 0.7) {
    recommendations.push({
      type: 'structure',
      priority: 'medium',
      title: 'Improve Content Flow',
      description: 'The presentation narrative could be more coherent. Consider reorganizing slides for better flow.',
      action: 'Reorganize Slides',
    });
  }

  // Complexity recommendations
  if (analytics && analytics.complexity === 'complex') {
    recommendations.push({
      type: 'complexity',
      priority: 'medium',
      title: 'Simplify Content',
      description: 'This presentation may be too complex for some audiences. Consider breaking it into smaller sections.',
      action: 'Split Presentation',
    });
  }

  // Default recommendation if none
  if (recommendations.length === 0) {
    recommendations.push({
      type: 'general',
      priority: 'low',
      title: 'Great Job!',
      description: 'Your presentation looks well-structured and accessible. No major issues detected.',
    });
  }

  return recommendations;
}

function getRecommendationColor(priority: string) {
  switch (priority) {
    case 'high': return 'bg-red-100';
    case 'medium': return 'bg-yellow-100';
    case 'low': return 'bg-green-100';
    default: return 'bg-gray-100';
  }
}

function getRecommendationIcon(type: string) {
  switch (type) {
    case 'accessibility': return <Eye className="w-4 h-4" />;
    case 'structure': return <BarChart3 className="w-4 h-4" />;
    case 'complexity': return <Brain className="w-4 h-4" />;
    default: return <Sparkles className="w-4 h-4" />;
  }
} 