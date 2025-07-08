/**
 * Assets Tab - Screaming Architecture Frontend
 * 🎯 RESPONSIBILITY: Asset exploration and management
 * 📋 SCOPE: Images, videos, audio, charts, tables organized by type
 */

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Image,
  Video,
  Music,
  BarChart3,
  Grid,
  List,
  Search,
  Download,
  Eye,
  FileText,
  Table,
  Layers,
  Filter,
  ExternalLink,
} from 'lucide-react';

import { UniversalPresentation } from '@/types/universal-json';
import { extractAllAssets, ExtractedAsset } from '@/lib/extractors/getAssets';
import { formatFileSize } from '@/lib/formatters/formatFileSize';
import { formatDuration } from '@/lib/formatters/formatDate';

interface AssetsTabProps {
  presentation: UniversalPresentation;
}

export function AssetsTab({ presentation }: AssetsTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAssetType, setSelectedAssetType] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedAsset, setSelectedAsset] = useState<ExtractedAsset | null>(null);

  // Extract all assets
  const assetExtraction = useMemo(() => {
    return extractAllAssets(presentation);
  }, [presentation]);

  // Filter assets
  const filteredAssets = useMemo(() => {
    let assets: ExtractedAsset[] = [];
    
    if (selectedAssetType === 'all') {
      assets = Object.values(assetExtraction.assetsByType).flat();
    } else {
      assets = assetExtraction.assetsByType[selectedAssetType] || [];
    }

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      assets = assets.filter(asset => 
        asset.name.toLowerCase().includes(searchLower) ||
        asset.type.toLowerCase().includes(searchLower) ||
        (asset.filename && asset.filename.toLowerCase().includes(searchLower))
      );
    }

    return assets;
  }, [assetExtraction, selectedAssetType, searchTerm]);

  const assetTypeCounts = useMemo(() => {
    return Object.entries(assetExtraction.assetsByType).reduce((acc, [type, assets]) => {
      acc[type] = assets.length;
      return acc;
    }, {} as Record<string, number>);
  }, [assetExtraction]);

  return (
    <div className="flex h-full">
      {/* Left Panel - Asset Browser */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Assets</h3>
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

          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search assets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Asset Type Filters */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedAssetType === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedAssetType('all')}
            >
              All ({assetExtraction.totalAssets})
            </Button>
            {Object.entries(assetTypeCounts).map(([type, count]) => (
              <Button
                key={type}
                variant={selectedAssetType === type ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedAssetType(type)}
                className="flex items-center space-x-1"
              >
                {getAssetTypeIcon(type)}
                <span className="capitalize">{type} ({count})</span>
              </Button>
            ))}
          </div>

          <div className="text-sm text-gray-600">
            {filteredAssets.length} assets found
          </div>
        </div>

        {/* Asset Content */}
        <div className="flex-1 overflow-auto p-4">
          {filteredAssets.length > 0 ? (
            viewMode === 'grid' ? (
              <AssetGrid
                assets={filteredAssets}
                selectedAsset={selectedAsset}
                onAssetSelect={setSelectedAsset}
              />
            ) : (
              <AssetList
                assets={filteredAssets}
                selectedAsset={selectedAsset}
                onAssetSelect={setSelectedAsset}
              />
            )
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <Filter className="w-12 h-12 mb-4" />
              <p className="text-lg font-medium">No assets found</p>
              <p className="text-sm">Try adjusting your search or filters</p>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Asset Details */}
      {selectedAsset && (
        <div className="w-80 border-l border-gray-200 bg-gray-50">
          <AssetDetails
            asset={selectedAsset}
            onClose={() => setSelectedAsset(null)}
          />
        </div>
      )}
    </div>
  );
}

// Asset Grid Component
function AssetGrid({
  assets,
  selectedAsset,
  onAssetSelect,
}: {
  assets: ExtractedAsset[];
  selectedAsset: ExtractedAsset | null;
  onAssetSelect: (asset: ExtractedAsset) => void;
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {assets.map((asset) => {
        const isSelected = selectedAsset?.id === asset.id;

        return (
          <div
            key={asset.id}
            className={`
              border rounded-lg overflow-hidden cursor-pointer transition-all hover:border-blue-300
              ${isSelected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'}
            `}
            onClick={() => onAssetSelect(asset)}
          >
            <div className="aspect-square bg-gray-100 flex items-center justify-center">
              <AssetPreview asset={asset} size="medium" />
            </div>
            <div className="p-3">
              <div className="flex items-center space-x-2 mb-1">
                {getAssetTypeIcon(asset.type)}
                <Badge variant="outline" className="text-xs">
                  {asset.type}
                </Badge>
              </div>
              <div className="text-sm font-medium truncate">{asset.name}</div>
              <div className="text-xs text-gray-500">
                Slide {asset.slideIndex + 1}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Asset List Component
function AssetList({
  assets,
  selectedAsset,
  onAssetSelect,
}: {
  assets: ExtractedAsset[];
  selectedAsset: ExtractedAsset | null;
  onAssetSelect: (asset: ExtractedAsset) => void;
}) {
  return (
    <div className="space-y-2">
      {assets.map((asset) => {
        const isSelected = selectedAsset?.id === asset.id;

        return (
          <div
            key={asset.id}
            className={`
              flex items-center space-x-4 p-3 border rounded-lg cursor-pointer transition-all hover:border-blue-300
              ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}
            `}
            onClick={() => onAssetSelect(asset)}
          >
            <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
              <AssetPreview asset={asset} size="small" />
            </div>
            
            <div className="min-w-0 flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-sm font-medium truncate">{asset.name}</span>
                <Badge variant="outline" className="text-xs">
                  {asset.type}
                </Badge>
              </div>
              <div className="text-xs text-gray-500">
                Slide {asset.slideIndex + 1} • Shape {asset.shapeIndex + 1}
                {asset.size && ` • ${formatFileSize(asset.size)}`}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm">
                <Eye className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm">
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Asset Preview Component
function AssetPreview({ asset, size }: { asset: ExtractedAsset; size: 'small' | 'medium' | 'large' }) {
  const iconSize = size === 'small' ? 'w-4 h-4' : size === 'medium' ? 'w-6 h-6' : 'w-8 h-8';
  
  if (asset.type === 'image' && asset.base64) {
    return (
      <img
        src={`data:${asset.mimeType};base64,${asset.base64}`}
        alt={asset.name}
        className="w-full h-full object-cover rounded"
      />
    );
  }

  return (
    <div className="text-gray-400">
      {getAssetTypeIcon(asset.type, iconSize)}
    </div>
  );
}

// Asset Details Panel
function AssetDetails({ asset, onClose }: { asset: ExtractedAsset; onClose: () => void }) {
  return (
    <div className="p-4 h-full overflow-auto">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-lg font-semibold">Asset Details</h4>
        <Button variant="ghost" size="sm" onClick={onClose}>
          ×
        </Button>
      </div>

      <div className="space-y-4">
        {/* Preview */}
        <Card>
          <CardContent className="p-4">
            <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center mb-3">
              <AssetPreview asset={asset} size="large" />
            </div>
            <div className="text-center">
              <div className="font-medium">{asset.name}</div>
              <Badge variant="outline" className="mt-1">
                {asset.type}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoItem label="Type" value={asset.type} />
            <InfoItem label="Slide" value={`${asset.slideIndex + 1}`} />
            <InfoItem label="Shape" value={`${asset.shapeIndex + 1}`} />
            {asset.filename && <InfoItem label="Filename" value={asset.filename} />}
            {asset.mimeType && <InfoItem label="MIME Type" value={asset.mimeType} />}
            {asset.size && <InfoItem label="Size" value={formatFileSize(asset.size)} />}
          </CardContent>
        </Card>

        {/* Dimensions */}
        {asset.dimensions && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Dimensions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <InfoItem 
                label="Original Size" 
                value={`${asset.dimensions.width} × ${asset.dimensions.height}`} 
              />
              <InfoItem 
                label="Position" 
                value={`(${Math.round(asset.metadata.shapePosition.x)}, ${Math.round(asset.metadata.shapePosition.y)})`} 
              />
              <InfoItem 
                label="Shape Size" 
                value={`${Math.round(asset.metadata.shapeSize.width)} × ${Math.round(asset.metadata.shapeSize.height)}`} 
              />
            </CardContent>
          </Card>
        )}

        {/* Duration for video/audio */}
        {asset.duration && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Media Properties</CardTitle>
            </CardHeader>
            <CardContent>
              <InfoItem label="Duration" value={formatDuration(asset.duration)} />
            </CardContent>
          </Card>
        )}

        {/* Chart specific info */}
        {asset.type === 'chart' && asset.metadata.chartType && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Chart Properties</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <InfoItem label="Chart Type" value={asset.metadata.chartType} />
              {asset.metadata.categoriesCount && (
                <InfoItem label="Categories" value={asset.metadata.categoriesCount.toString()} />
              )}
              {asset.metadata.seriesCount && (
                <InfoItem label="Series" value={asset.metadata.seriesCount.toString()} />
              )}
              {asset.metadata.hasLegend && (
                <InfoItem label="Legend" value={asset.metadata.hasLegend ? 'Yes' : 'No'} />
              )}
            </CardContent>
          </Card>
        )}

        {/* Table specific info */}
        {asset.type === 'table' && asset.metadata.rowCount && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Table Properties</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <InfoItem label="Rows" value={asset.metadata.rowCount.toString()} />
              <InfoItem label="Columns" value={asset.metadata.columnCount.toString()} />
              <InfoItem label="First Row Header" value={asset.metadata.firstRow ? 'Yes' : 'No'} />
              <InfoItem label="Banded Rows" value={asset.metadata.bandRows ? 'Yes' : 'No'} />
            </CardContent>
          </Card>
        )}

        {/* Alt Text */}
        {asset.metadata.alternativeText && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Accessibility</CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <label className="text-xs font-medium text-gray-700">Alternative Text</label>
                <div className="mt-1 text-sm text-gray-600">{asset.metadata.alternativeText}</div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="space-y-2 pt-4">
          <Button className="w-full" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Download Asset
          </Button>
          <Button variant="outline" className="w-full" size="sm">
            <ExternalLink className="w-4 h-4 mr-2" />
            Go to Slide
          </Button>
        </div>
      </div>
    </div>
  );
}

// Info Item Component
function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-xs font-medium text-gray-700">{label}</span>
      <span className="text-xs text-gray-600">{value}</span>
    </div>
  );
}

// Helper Functions
function getAssetTypeIcon(type: string, className = 'w-4 h-4') {
  switch (type) {
    case 'image':
      return <Image className={className} />;
    case 'video':
      return <Video className={className} />;
    case 'audio':
      return <Music className={className} />;
    case 'chart':
      return <BarChart3 className={className} />;
    case 'table':
      return <Table className={className} />;
    case 'ole':
      return <Layers className={className} />;
    default:
      return <FileText className={className} />;
  }
} 