/**
 * Actions Tab - Screaming Architecture Frontend
 * 🎯 RESPONSIBILITY: User actions and operations
 * 📋 SCOPE: Downloads, regeneration, exports, sharing
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { UniversalPresentation } from '@/types/universal-json';
import { api } from '@/hooks/use-api';
import {
  Download,
  FileText,
  ImageIcon,
  RefreshCw,
  Settings,
  Link,
  Copy,
} from 'lucide-react';

interface ActionsTabProps {
  presentation: UniversalPresentation;
  onRefresh: () => void;
}

export function ActionsTab({ presentation, onRefresh }: ActionsTabProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const [processingProgress, setProcessingProgress] = useState(0);

  return (
    <div className="space-y-6">
      {/* Downloads */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Download className="w-5 h-5" />
            <span>Downloads</span>
          </CardTitle>
          <CardDescription>
            Download your presentation in different formats
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <DownloadButton
            icon={<FileText className="w-4 h-4" />}
            label="Download JSON"
            description="Universal JSON schema format"
            onDownload={() => downloadFile('json')}
            primary
          />
          <DownloadButton
            icon={<ImageIcon className="w-4 h-4" />}
            label="Download Thumbnails"
            description="All slide thumbnails (ZIP)"
            onDownload={() => downloadFile('thumbnails')}
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
            Manage presentation data and sharing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <ManagementButton
            icon={<RefreshCw className="w-4 h-4" />}
            label="Refresh Analysis"
            description="Update presentation data"
            onAction={onRefresh}
          />
          <ManagementButton
            icon={<Link className="w-4 h-4" />}
            label="Copy Share Link"
            description="Get shareable link to this presentation"
            onAction={() => createShareLink()}
          />
          <ManagementButton
            icon={<Copy className="w-4 h-4" />}
            label="Copy Presentation ID"
            description="Copy the unique presentation identifier"
            onAction={() => copyPresentationId()}
          />
        </CardContent>
      </Card>

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
    </div>
  );

  // Action Handlers
  async function downloadFile(format: 'json' | 'thumbnails') {
    try {
      setIsProcessing(true);
      setProcessingStatus(`Preparing ${format.toUpperCase()} download...`);
      setProcessingProgress(25);

      let response;
      switch (format) {
        case 'json':
          // Download the Universal JSON data
          const jsonData = JSON.stringify(presentation, null, 2);
          const blob = new Blob([jsonData], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${presentation.metadata.title || 'presentation'}.json`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          setProcessingProgress(100);
          setProcessingStatus('Download complete!');
          break;
        case 'thumbnails':
                     try {
             response = await api.downloads.getThumbnails(presentation.id);
             if (response.success && response.data?.downloadUrl) {
               setProcessingProgress(75);
               // Trigger direct download of thumbnails ZIP
               const link = document.createElement('a');
               link.href = response.data.downloadUrl;
               link.download = response.data.filename;
               document.body.appendChild(link);
               link.click();
               document.body.removeChild(link);
               setProcessingProgress(100);
               setProcessingStatus('Thumbnails downloaded!');
             } else {
               throw new Error('Failed to get thumbnails');
             }
           } catch (error) {
             console.error('Thumbnails download failed:', error);
             setProcessingStatus('Thumbnails not available');
           }
          break;
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

  function createShareLink() {
    const shareUrl = `${window.location.origin}/presentations/${presentation.id}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setProcessingStatus('Share link copied to clipboard!');
      setTimeout(() => setProcessingStatus(''), 3000);
    }).catch(() => {
      setProcessingStatus('Failed to copy link');
      setTimeout(() => setProcessingStatus(''), 3000);
    });
  }

  function copyPresentationId() {
    navigator.clipboard.writeText(presentation.id).then(() => {
      setProcessingStatus('Presentation ID copied to clipboard!');
      setTimeout(() => setProcessingStatus(''), 3000);
    }).catch(() => {
      setProcessingStatus('Failed to copy ID');
      setTimeout(() => setProcessingStatus(''), 3000);
    });
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