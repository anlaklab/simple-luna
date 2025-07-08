/**
 * Overview Tab - Screaming Architecture Frontend
 * 🎯 RESPONSIBILITY: Presentation overview and metadata display
 * 📋 SCOPE: General info, statistics, health indicators
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  FileText, 
  Calendar, 
  User, 
  BarChart3, 
  Clock, 
  Image, 
  Video, 
  Music,
  Palette,
  Layers,
  Eye,
  CheckCircle,
  AlertTriangle,
  XCircle
} from 'lucide-react';

import { UniversalPresentation, PresentationAnalytics } from '@/types/universal-json';
import { formatDate, formatDateTime, formatDuration } from '@/lib/formatters/formatDate';
import { formatFileSize } from '@/lib/formatters/formatFileSize';

interface OverviewTabProps {
  presentation: UniversalPresentation;
  analytics?: PresentationAnalytics | null;
}

export function OverviewTab({ presentation, analytics }: OverviewTabProps) {
  const metadata = presentation.metadata;
  
  // Calculate health indicators
  const healthIndicators = calculateHealthIndicators(presentation, analytics);
  
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{metadata.title}</h2>
          <p className="text-sm text-gray-500 mt-1">
            Last modified {formatRelativeTime(metadata.lastSavedTime)}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant={getHealthVariant(healthIndicators.overall)}>
            {healthIndicators.overall}
          </Badge>
          <Badge variant="outline">
            v{metadata.version || '1.0'}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Basic Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="w-5 h-5" />
                <span>Basic Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <InfoItem 
                    icon={<User className="w-4 h-4" />}
                    label="Author"
                    value={metadata.author || 'Unknown'}
                  />
                  <InfoItem 
                    icon={<Calendar className="w-4 h-4" />}
                    label="Created"
                    value={formatDate(metadata.createdTime)}
                  />
                  <InfoItem 
                    icon={<Layers className="w-4 h-4" />}
                    label="Slide Count"
                    value={metadata.slideCount.toString()}
                  />
                </div>
                <div className="space-y-3">
                  <InfoItem 
                    icon={<Palette className="w-4 h-4" />}
                    label="Category"
                    value={metadata.category || 'General'}
                  />
                  <InfoItem 
                    icon={<Calendar className="w-4 h-4" />}
                    label="Last Saved"
                    value={formatDateTime(metadata.lastSavedTime)}
                  />
                  <InfoItem 
                    icon={<BarChart3 className="w-4 h-4" />}
                    label="File Size"
                    value={metadata.fileSize ? formatFileSize(metadata.fileSize) : 'Unknown'}
                  />
                </div>
              </div>

              {metadata.subject && (
                <>
                  <Separator />
                  <div>
                    <label className="text-sm font-medium text-gray-700">Subject</label>
                    <p className="text-sm text-gray-600 mt-1">{metadata.subject}</p>
                  </div>
                </>
              )}

              {metadata.keywords && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Keywords</label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {metadata.keywords.split(',').map((keyword, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {keyword.trim()}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Content Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="w-5 h-5" />
                <span>Content Statistics</span>
              </CardTitle>
              <CardDescription>
                Breakdown of content types and complexity
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                  icon={<Image className="w-4 h-4" />}
                  label="Images"
                  value={metadata.imageCount}
                  color="text-blue-600"
                />
                <StatCard
                  icon={<Video className="w-4 h-4" />}
                  label="Videos"
                  value={metadata.videoCount}
                  color="text-purple-600"
                />
                <StatCard
                  icon={<Music className="w-4 h-4" />}
                  label="Audio"
                  value={metadata.audioCount}
                  color="text-green-600"
                />
                <StatCard
                  icon={<Layers className="w-4 h-4" />}
                  label="Master Slides"
                  value={metadata.masterSlideCount}
                  color="text-orange-600"
                />
              </div>

              {analytics && (
                <div className="mt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Complexity Level</span>
                    <Badge variant={getComplexityVariant(analytics.complexity)}>
                      {analytics.complexity}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Estimated Reading Time</span>
                    <span className="text-sm text-gray-600">
                      {formatDuration(analytics.estimatedReadingTime * 60)}
                    </span>
                  </div>

                  {analytics.slideTypes && Object.keys(analytics.slideTypes).length > 0 && (
                    <div>
                      <span className="text-sm font-medium">Slide Types</span>
                      <div className="mt-2 space-y-2">
                        {Object.entries(analytics.slideTypes).map(([type, count]) => (
                          <div key={type} className="flex items-center justify-between">
                            <span className="text-sm text-gray-600 capitalize">{type}</span>
                            <div className="flex items-center space-x-2">
                              <div className="w-20 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-blue-600 h-2 rounded-full" 
                                  style={{ 
                                    width: `${(count / metadata.slideCount) * 100}%` 
                                  }}
                                />
                              </div>
                              <span className="text-sm font-medium w-8 text-right">{count}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Health & Actions */}
        <div className="space-y-6">
          {/* Health Indicators */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Eye className="w-5 h-5" />
                <span>Health Check</span>
              </CardTitle>
              <CardDescription>
                Presentation quality indicators
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <HealthIndicator
                label="Accessibility"
                status={healthIndicators.accessibility}
                description="Alt text and color contrast"
              />
              <HealthIndicator
                label="Structure"
                status={healthIndicators.structure}
                description="Logical slide organization"
              />
              <HealthIndicator
                label="Content Quality"
                status={healthIndicators.content}
                description="Text and media balance"
              />
              <HealthIndicator
                label="Performance"
                status={healthIndicators.performance}
                description="File size and complexity"
              />
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <button className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
                Download Original PPTX
              </button>
              <button className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
                Export as PDF
              </button>
              <button className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
                Download JSON Schema
              </button>
              <button className="w-full px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                Regenerate Presentation
              </button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Helper Components
function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center space-x-2">
      <div className="text-gray-400">{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="text-xs text-gray-500">{label}</div>
        <div className="text-sm font-medium text-gray-900 truncate">{value}</div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { 
  icon: React.ReactNode; 
  label: string; 
  value: number; 
  color: string;
}) {
  return (
    <div className="text-center p-3 bg-gray-50 rounded-lg">
      <div className={`mx-auto w-8 h-8 flex items-center justify-center ${color}`}>
        {icon}
      </div>
      <div className="mt-2">
        <div className="text-lg font-bold text-gray-900">{value}</div>
        <div className="text-xs text-gray-500">{label}</div>
      </div>
    </div>
  );
}

function HealthIndicator({ label, status, description }: {
  label: string;
  status: 'good' | 'warning' | 'poor';
  description: string;
}) {
  const icons = {
    good: <CheckCircle className="w-4 h-4 text-green-600" />,
    warning: <AlertTriangle className="w-4 h-4 text-yellow-600" />,
    poor: <XCircle className="w-4 h-4 text-red-600" />,
  };

  return (
    <div className="flex items-start space-x-3">
      {icons[status]}
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-gray-900">{label}</div>
        <div className="text-xs text-gray-500">{description}</div>
      </div>
    </div>
  );
}

// Helper Functions
function calculateHealthIndicators(
  presentation: UniversalPresentation, 
  analytics?: PresentationAnalytics | null
) {
  const accessibility = analytics?.accessibility?.hasAltText ? 'good' : 'warning';
  const structure = presentation.slides.length > 0 && presentation.slides.length < 50 ? 'good' : 'warning';
  const content = analytics?.complexity === 'simple' ? 'good' : 
                 analytics?.complexity === 'moderate' ? 'warning' : 'poor';
  const performance = (presentation.metadata.fileSize || 0) < 50 * 1024 * 1024 ? 'good' : 'warning';
  
  const scores = { good: 3, warning: 2, poor: 1 };
  const total = scores[accessibility] + scores[structure] + scores[content] + scores[performance];
  const average = total / 4;
  
  const overall = average >= 2.5 ? 'good' : average >= 2 ? 'warning' : 'poor';

  return { accessibility, structure, content, performance, overall };
}

function getHealthVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case 'good': return 'default';
    case 'warning': return 'secondary';
    case 'poor': return 'destructive';
    default: return 'outline';
  }
}

function getComplexityVariant(complexity: string): "default" | "secondary" | "destructive" | "outline" {
  switch (complexity) {
    case 'simple': return 'default';
    case 'moderate': return 'secondary';
    case 'complex': return 'destructive';
    default: return 'outline';
  }
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  
  if (diffInDays === 0) return 'today';
  if (diffInDays === 1) return 'yesterday';
  if (diffInDays < 7) return `${diffInDays} days ago`;
  if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
  return `${Math.floor(diffInDays / 30)} months ago`;
} 