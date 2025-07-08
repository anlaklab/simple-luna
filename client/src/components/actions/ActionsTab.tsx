/**
 * Actions Tab - Screaming Architecture Frontend
 * 🎯 RESPONSIBILITY: User actions and operations
 * 📋 SCOPE: Downloads, regeneration, exports, sharing
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Download,
  RefreshCw,
  Share2,
  FileText,
  Image,
  Video,
  File,
  Printer,
  Mail,
  Link,
  Settings,
  Sparkles,
  Zap,
  Archive,
  Copy,
  ExternalLink,
  Upload,
} from 'lucide-react';

import { UniversalPresentation } from '@/types/universal-json';
import { api } from '@/hooks/use-api';
import { formatFileSize } from '@/lib/formatters/formatFileSize';

interface ActionsTabProps {
  presentation: UniversalPresentation;
  onRefresh: () => void;
}

export function ActionsTab({ presentation, onRefresh }: ActionsTabProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [processingProgress, setProcessingProgress] = useState(0);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h3 className="text-xl font-semibold">Actions & Operations</h3>
        <p className="text-sm text-gray-600 mt-1">
          Download, export, and manage your presentation
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Download Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Download className="w-5 h-5" />
              <span>Downloads</span>
            </CardTitle>
            <CardDescription>
              Export your presentation in different formats
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <DownloadButton
              icon={<FileText className="w-4 h-4" />}
              label="Download PPTX"
              description="Original PowerPoint format"
              onDownload={() => downloadFile('pptx')}
              primary
            />
            <DownloadButton
              icon={<File className="w-4 h-4" />}
              label="Download PDF"
              description="Portable document format"
              onDownload={() => downloadFile('pdf')}
            />
            <DownloadButton
              icon={<FileText className="w-4 h-4" />}
              label="Download JSON"
              description="Universal schema format"
              onDownload={() => downloadFile('json')}
            />
            <DownloadButton
              icon={<Archive className="w-4 h-4" />}
              label="Download Thumbnails"
              description="All slide thumbnails (ZIP)"
              onDownload={() => downloadFile('thumbnails')}
            />
          </CardContent>
        </Card>

        {/* AI Generation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Sparkles className="w-5 h-5" />
              <span>AI Enhancement</span>
            </CardTitle>
            <CardDescription>
              Improve your presentation with AI
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <AIActionButton
              icon={<RefreshCw className="w-4 h-4" />}
              label="Regenerate Presentation"
              description="Create a new version using AI"
              action="regenerate"
              onAction={(action) => handleAIAction(action)}
            />
            <AIActionButton
              icon={<Zap className="w-4 h-4" />}
              label="Enhance Content"
              description="Improve text and structure"
              action="enhance"
              onAction={(action) => handleAIAction(action)}
            />
            <AIActionButton
              icon={<Settings className="w-4 h-4" />}
              label="Optimize for Audience"
              description="Adapt for specific audience"
              action="optimize"
              onAction={(action) => handleAIAction(action)}
            />
          </CardContent>
        </Card>

        {/* Share & Export */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Share2 className="w-5 h-5" />
              <span>Share & Export</span>
            </CardTitle>
            <CardDescription>
              Share your presentation with others
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <ShareButton
              icon={<Link className="w-4 h-4" />}
              label="Get Shareable Link"
              description="Create a link to view online"
              onShare={() => createShareLink()}
            />
            <ShareButton
              icon={<Mail className="w-4 h-4" />}
              label="Send via Email"
              description="Email presentation to others"
              onShare={() => emailPresentation()}
            />
            <ShareButton
              icon={<ExternalLink className="w-4 h-4" />}
              label="Export to Cloud"
              description="Save to Google Drive or OneDrive"
              onShare={() => exportToCloud()}
            />
          </CardContent>
        </Card>

        {/* Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="w-5 h-5" />
              <span>Management</span>
            </CardTitle>
            <CardDescription>
              Manage presentation settings and data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <ManagementButton
              icon={<RefreshCw className="w-4 h-4" />}
              label="Refresh Analysis"
              description="Update AI insights and analysis"
              onAction={onRefresh}
            />
            <ManagementButton
              icon={<Upload className="w-4 h-4" />}
              label="Reprocess File"
              description="Re-extract data from original file"
              onAction={() => reprocessFile()}
            />
            <ManagementButton
              icon={<Copy className="w-4 h-4" />}
              label="Duplicate Presentation"
              description="Create a copy of this presentation"
              onAction={() => duplicatePresentation()}
            />
          </CardContent>
        </Card>
      </div>

      {/* Processing Status */}
      {isProcessing && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
              <div className="min-w-0 flex-1">
                <div className="font-medium text-blue-900">{processingStatus}</div>
                <Progress value={processingProgress} className="mt-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Batch Operations */}
      <Card>
        <CardHeader>
          <CardTitle>Batch Operations</CardTitle>
          <CardDescription>
            Perform operations on multiple elements
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Button variant="outline" className="flex items-center space-x-2">
              <Image className="w-4 h-4" />
              <span>Export All Images</span>
            </Button>
            <Button variant="outline" className="flex items-center space-x-2">
              <Video className="w-4 h-4" />
              <span>Export All Videos</span>
            </Button>
            <Button variant="outline" className="flex items-center space-x-2">
              <FileText className="w-4 h-4" />
              <span>Export All Text</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Custom Export */}
      <Card>
        <CardHeader>
          <CardTitle>Custom Export</CardTitle>
          <CardDescription>
            Create custom exports with specific options
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <CustomExportForm 
            presentation={presentation}
            onExport={(options) => handleCustomExport(options)}
          />
        </CardContent>
      </Card>
    </div>
  );

  // Action Handlers
  async function downloadFile(format: 'pptx' | 'pdf' | 'json' | 'thumbnails') {
    try {
      setIsProcessing(true);
      setProcessingStatus(`Preparing ${format.toUpperCase()} download...`);
      setProcessingProgress(25);

      let response;
      switch (format) {
        case 'pptx':
          response = await api.downloads.getPptx(presentation.id);
          break;
        case 'pdf':
          response = await api.downloads.getPdf(presentation.id);
          break;
        case 'json':
          response = await api.downloads.getJson(presentation.id);
          break;
        case 'thumbnails':
          response = await api.downloads.getThumbnails(presentation.id);
          break;
      }

      setProcessingProgress(75);

      if (response.success && response.data?.downloadUrl) {
        setProcessingProgress(100);
        setProcessingStatus('Download ready!');
        
        // Trigger download
        const link = document.createElement('a');
        link.href = response.data.downloadUrl;
        link.download = response.data.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        throw new Error(response.error || 'Download failed');
      }
    } catch (error) {
      console.error('Download failed:', error);
      setProcessingStatus('Download failed');
    } finally {
      setTimeout(() => {
        setIsProcessing(false);
        setProcessingProgress(0);
        setProcessingStatus('');
      }, 2000);
    }
  }

  async function handleAIAction(action: string) {
    try {
      setIsProcessing(true);
      setProcessingStatus(`Starting ${action}...`);
      setProcessingProgress(20);

      switch (action) {
        case 'regenerate':
          // Call AI regeneration
          setProcessingStatus('Regenerating presentation with AI...');
          setProcessingProgress(60);
          // TODO: Implement regeneration API call
          break;
        case 'enhance':
          setProcessingStatus('Enhancing content...');
          setProcessingProgress(60);
          // TODO: Implement enhancement API call
          break;
        case 'optimize':
          setProcessingStatus('Optimizing for audience...');
          setProcessingProgress(60);
          // TODO: Implement optimization API call
          break;
      }

      setProcessingProgress(100);
      setProcessingStatus('Complete!');
    } catch (error) {
      console.error('AI action failed:', error);
      setProcessingStatus('Action failed');
    } finally {
      setTimeout(() => {
        setIsProcessing(false);
        setProcessingProgress(0);
        setProcessingStatus('');
      }, 2000);
    }
  }

  function createShareLink() {
    const shareUrl = `${window.location.origin}/presentations/${presentation.id}`;
    navigator.clipboard.writeText(shareUrl);
    // TODO: Show toast notification
  }

  function emailPresentation() {
    const subject = encodeURIComponent(`Presentation: ${presentation.metadata.title}`);
    const body = encodeURIComponent(`Check out this presentation: ${window.location.href}`);
    window.open(`mailto:?subject=${subject}&body=${body}`);
  }

  function exportToCloud() {
    // TODO: Implement cloud export
    console.log('Export to cloud not implemented yet');
  }

  function reprocessFile() {
    setIsProcessing(true);
    setProcessingStatus('Reprocessing file...');
    // TODO: Implement reprocessing
    setTimeout(() => {
      setIsProcessing(false);
      onRefresh();
    }, 3000);
  }

  function duplicatePresentation() {
    // TODO: Implement duplication
    console.log('Duplicate presentation not implemented yet');
  }

  function handleCustomExport(options: any) {
    setIsProcessing(true);
    setProcessingStatus('Creating custom export...');
    // TODO: Implement custom export
    setTimeout(() => {
      setIsProcessing(false);
    }, 2000);
  }
}

// Helper Components
function DownloadButton({
  icon,
  label,
  description,
  onDownload,
  primary = false,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  onDownload: () => void;
  primary?: boolean;
}) {
  return (
    <Button
      variant={primary ? "default" : "outline"}
      className="w-full justify-start h-auto p-3"
      onClick={onDownload}
    >
      <div className="flex items-center space-x-3">
        {icon}
        <div className="text-left">
          <div className="font-medium">{label}</div>
          <div className="text-xs text-gray-500">{description}</div>
        </div>
      </div>
    </Button>
  );
}

function AIActionButton({
  icon,
  label,
  description,
  action,
  onAction,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  action: string;
  onAction: (action: string) => void;
}) {
  return (
    <Button
      variant="outline"
      className="w-full justify-start h-auto p-3"
      onClick={() => onAction(action)}
    >
      <div className="flex items-center space-x-3">
        {icon}
        <div className="text-left">
          <div className="font-medium">{label}</div>
          <div className="text-xs text-gray-500">{description}</div>
        </div>
      </div>
    </Button>
  );
}

function ShareButton({
  icon,
  label,
  description,
  onShare,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  onShare: () => void;
}) {
  return (
    <Button
      variant="outline"
      className="w-full justify-start h-auto p-3"
      onClick={onShare}
    >
      <div className="flex items-center space-x-3">
        {icon}
        <div className="text-left">
          <div className="font-medium">{label}</div>
          <div className="text-xs text-gray-500">{description}</div>
        </div>
      </div>
    </Button>
  );
}

function ManagementButton({
  icon,
  label,
  description,
  onAction,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  onAction: () => void;
}) {
  return (
    <Button
      variant="outline"
      className="w-full justify-start h-auto p-3"
      onClick={onAction}
    >
      <div className="flex items-center space-x-3">
        {icon}
        <div className="text-left">
          <div className="font-medium">{label}</div>
          <div className="text-xs text-gray-500">{description}</div>
        </div>
      </div>
    </Button>
  );
}

function CustomExportForm({
  presentation,
  onExport,
}: {
  presentation: UniversalPresentation;
  onExport: (options: any) => void;
}) {
  const [format, setFormat] = useState('pptx');
  const [quality, setQuality] = useState('high');
  const [includeNotes, setIncludeNotes] = useState(true);
  const [customName, setCustomName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onExport({
      format,
      quality,
      includeNotes,
      filename: customName || `${presentation.metadata.title}_custom`,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="format">Export Format</Label>
          <select
            id="format"
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            className="w-full mt-1 p-2 border border-gray-300 rounded-md"
          >
            <option value="pptx">PowerPoint (.pptx)</option>
            <option value="pdf">PDF Document</option>
            <option value="images">Images (ZIP)</option>
            <option value="json">JSON Schema</option>
          </select>
        </div>
        
        <div>
          <Label htmlFor="quality">Quality</Label>
          <select
            id="quality"
            value={quality}
            onChange={(e) => setQuality(e.target.value)}
            className="w-full mt-1 p-2 border border-gray-300 rounded-md"
          >
            <option value="high">High Quality</option>
            <option value="medium">Medium Quality</option>
            <option value="low">Low Quality (Smaller file)</option>
          </select>
        </div>
      </div>

      <div>
        <Label htmlFor="filename">Custom Filename (optional)</Label>
        <Input
          id="filename"
          value={customName}
          onChange={(e) => setCustomName(e.target.value)}
          placeholder={`${presentation.metadata.title}_custom`}
        />
      </div>

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="includeNotes"
          checked={includeNotes}
          onChange={(e) => setIncludeNotes(e.target.checked)}
        />
        <Label htmlFor="includeNotes">Include speaker notes</Label>
      </div>

      <Button type="submit" className="w-full">
        <Download className="w-4 h-4 mr-2" />
        Create Custom Export
      </Button>
    </form>
  );
} 