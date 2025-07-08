/**
 * JSON Tree Tab - Screaming Architecture Frontend
 * 🎯 RESPONSIBILITY: Interactive JSON tree exploration
 * 📋 SCOPE: Expandable tree view, search, node details
 */

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ChevronDown,
  ChevronRight,
  Search,
  Copy,
  FileText,
  Hash,
  Quote,
  ToggleLeft,
  Braces,
  List,
  Eye,
  EyeOff,
  Filter,
} from 'lucide-react';

import { UniversalPresentation } from '@/types/universal-json';

interface JsonTreeTabProps {
  presentation: UniversalPresentation;
}

interface TreeNode {
  id: string;
  key: string;
  value: any;
  type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';
  level: number;
  path: string;
  isExpanded: boolean;
  isVisible: boolean;
  hasChildren: boolean;
  childrenCount?: number;
  parent?: string;
}

export function JsonTreeTab({ presentation }: JsonTreeTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['root']));
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [showOnlyVisible, setShowOnlyVisible] = useState(false);

  // Build tree structure
  const treeNodes = useMemo(() => {
    return buildTreeNodes(presentation, expandedNodes, searchTerm);
  }, [presentation, expandedNodes, searchTerm]);

  // Filter nodes based on search and visibility
  const filteredNodes = useMemo(() => {
    if (!searchTerm && !showOnlyVisible) return treeNodes;

    return treeNodes.filter(node => {
      if (showOnlyVisible && !node.isVisible) return false;
      if (!searchTerm) return true;

      const searchLower = searchTerm.toLowerCase();
      return (
        node.key.toLowerCase().includes(searchLower) ||
        (typeof node.value === 'string' && node.value.toLowerCase().includes(searchLower)) ||
        node.path.toLowerCase().includes(searchLower)
      );
    });
  }, [treeNodes, searchTerm, showOnlyVisible]);

  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };

  const expandAll = () => {
    const allNodeIds = treeNodes.map(node => node.id);
    setExpandedNodes(new Set(allNodeIds));
  };

  const collapseAll = () => {
    setExpandedNodes(new Set(['root']));
  };

  const copyPath = (path: string) => {
    navigator.clipboard.writeText(path);
  };

  const copyValue = (value: any) => {
    navigator.clipboard.writeText(JSON.stringify(value, null, 2));
  };

  const selectedNodeData = selectedNode ? 
    treeNodes.find(node => node.id === selectedNode) : null;

  return (
    <div className="flex h-full">
      {/* Left Panel - Tree View */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">JSON Tree Explorer</h3>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={expandAll}
                className="text-xs"
              >
                Expand All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={collapseAll}
                className="text-xs"
              >
                Collapse All
              </Button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search keys, values, or paths..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant={showOnlyVisible ? "default" : "outline"}
              size="sm"
              onClick={() => setShowOnlyVisible(!showOnlyVisible)}
              className="flex items-center space-x-1"
            >
              {showOnlyVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              <span className="text-xs">Visible Only</span>
            </Button>
          </div>

          {/* Stats */}
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <span>{filteredNodes.length} nodes</span>
            <span>•</span>
            <span>{expandedNodes.size} expanded</span>
            {searchTerm && (
              <>
                <span>•</span>
                <span>Searching: "{searchTerm}"</span>
              </>
            )}
          </div>
        </div>

        {/* Tree Content */}
        <div className="flex-1 overflow-auto p-4">
          <div className="space-y-1">
            {filteredNodes.map((node) => (
              <TreeNodeComponent
                key={node.id}
                node={node}
                isSelected={selectedNode === node.id}
                onToggle={toggleNode}
                onSelect={setSelectedNode}
                onCopyPath={copyPath}
                onCopyValue={copyValue}
              />
            ))}
          </div>

          {filteredNodes.length === 0 && (
            <div className="flex flex-col items-center justify-center h-32 text-gray-500">
              <Filter className="w-8 h-8 mb-2" />
              <p className="text-sm">No nodes match your search criteria</p>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Node Details */}
      {selectedNodeData && (
        <div className="w-80 border-l border-gray-200 bg-gray-50">
          <NodeDetails
            node={selectedNodeData}
            onCopyPath={copyPath}
            onCopyValue={copyValue}
          />
        </div>
      )}
    </div>
  );
}

// Tree Node Component
function TreeNodeComponent({
  node,
  isSelected,
  onToggle,
  onSelect,
  onCopyPath,
  onCopyValue,
}: {
  node: TreeNode;
  isSelected: boolean;
  onToggle: (nodeId: string) => void;
  onSelect: (nodeId: string) => void;
  onCopyPath: (path: string) => void;
  onCopyValue: (value: any) => void;
}) {
  const icon = getNodeIcon(node.type);
  const indentLevel = Math.max(0, node.level - 1);

  return (
    <div
      className={`
        flex items-center space-x-2 py-1 px-2 rounded-md cursor-pointer hover:bg-gray-100
        ${isSelected ? 'bg-blue-100 border border-blue-300' : ''}
      `}
      style={{ paddingLeft: `${8 + indentLevel * 20}px` }}
      onClick={() => onSelect(node.id)}
    >
      {/* Expand/Collapse Button */}
      {node.hasChildren && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggle(node.id);
          }}
          className="p-0.5 hover:bg-gray-200 rounded"
        >
          {node.isExpanded ? (
            <ChevronDown className="w-3 h-3" />
          ) : (
            <ChevronRight className="w-3 h-3" />
          )}
        </button>
      )}

      {/* Icon */}
      <div className="flex-shrink-0 text-gray-500">
        {icon}
      </div>

      {/* Key */}
      <span className="font-medium text-sm text-gray-800 min-w-0 flex-shrink">
        {node.key}
      </span>

      {/* Type Badge */}
      <Badge variant="outline" className="text-xs">
        {node.type}
      </Badge>

      {/* Children Count */}
      {node.hasChildren && node.childrenCount !== undefined && (
        <span className="text-xs text-gray-500">
          ({node.childrenCount})
        </span>
      )}

      {/* Value Preview */}
      {!node.hasChildren && (
        <span className="text-xs text-gray-600 truncate min-w-0 flex-1">
          {getValuePreview(node.value, node.type)}
        </span>
      )}

      {/* Actions */}
      <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onCopyPath(node.path);
          }}
          className="p-1 hover:bg-gray-200 rounded"
          title="Copy path"
        >
          <Copy className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

// Node Details Panel
function NodeDetails({ 
  node, 
  onCopyPath, 
  onCopyValue 
}: { 
  node: TreeNode; 
  onCopyPath: (path: string) => void;
  onCopyValue: (value: any) => void;
}) {
  return (
    <div className="p-4 h-full overflow-auto">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center space-x-2">
            {getNodeIcon(node.type)}
            <span>Node Details</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-700">Key</label>
            <div className="mt-1 p-2 bg-gray-100 rounded text-sm font-mono">
              {node.key}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-700">Type</label>
            <div className="mt-1">
              <Badge variant="outline">{node.type}</Badge>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-700">Path</label>
            <div className="mt-1 p-2 bg-gray-100 rounded text-xs font-mono break-all">
              {node.path}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onCopyPath(node.path)}
              className="mt-1 text-xs"
            >
              <Copy className="w-3 h-3 mr-1" />
              Copy Path
            </Button>
          </div>

          {node.hasChildren && (
            <div>
              <label className="text-xs font-medium text-gray-700">Children</label>
              <div className="mt-1 text-sm text-gray-600">
                {node.childrenCount} items
              </div>
            </div>
          )}

          {!node.hasChildren && (
            <div>
              <label className="text-xs font-medium text-gray-700">Value</label>
              <div className="mt-1 p-2 bg-gray-100 rounded text-xs font-mono max-h-40 overflow-auto">
                {JSON.stringify(node.value, null, 2)}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onCopyValue(node.value)}
                className="mt-1 text-xs"
              >
                <Copy className="w-3 h-3 mr-1" />
                Copy Value
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Helper Functions
function getNodeIcon(type: string) {
  switch (type) {
    case 'object': return <Braces className="w-4 h-4" />;
    case 'array': return <List className="w-4 h-4" />;
    case 'string': return <Quote className="w-4 h-4" />;
    case 'number': return <Hash className="w-4 h-4" />;
    case 'boolean': return <ToggleLeft className="w-4 h-4" />;
    default: return <FileText className="w-4 h-4" />;
  }
}

function getValuePreview(value: any, type: string): string {
  if (type === 'string') {
    return `"${value.length > 50 ? value.substring(0, 50) + '...' : value}"`;
  }
  if (type === 'number' || type === 'boolean') {
    return String(value);
  }
  if (value === null) {
    return 'null';
  }
  return String(value);
}

function buildTreeNodes(
  obj: any, 
  expandedNodes: Set<string>, 
  searchTerm: string
): TreeNode[] {
  const nodes: TreeNode[] = [];

  function traverse(
    value: any,
    key: string,
    path: string,
    level: number,
    parentId?: string
  ): void {
    const nodeId = path;
    const type = getValueType(value);
    const hasChildren = type === 'object' || type === 'array';
    const isExpanded = expandedNodes.has(nodeId);
    const isVisible = !searchTerm || 
      key.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (typeof value === 'string' && value.toLowerCase().includes(searchTerm.toLowerCase()));

    let childrenCount = 0;
    if (hasChildren) {
      if (type === 'object' && value !== null) {
        childrenCount = Object.keys(value).length;
      } else if (type === 'array') {
        childrenCount = value.length;
      }
    }

    const node: TreeNode = {
      id: nodeId,
      key,
      value,
      type,
      level,
      path,
      isExpanded,
      isVisible,
      hasChildren,
      childrenCount,
      parent: parentId,
    };

    nodes.push(node);

    // Add children if expanded
    if (hasChildren && isExpanded) {
      if (type === 'object' && value !== null) {
        Object.entries(value).forEach(([childKey, childValue]) => {
          const childPath = path === 'root' ? childKey : `${path}.${childKey}`;
          traverse(childValue, childKey, childPath, level + 1, nodeId);
        });
      } else if (type === 'array') {
        value.forEach((item: any, index: number) => {
          const childPath = `${path}[${index}]`;
          traverse(item, `[${index}]`, childPath, level + 1, nodeId);
        });
      }
    }
  }

  traverse(obj, 'presentation', 'root', 0);
  return nodes;
}

function getValueType(value: any): TreeNode['type'] {
  if (Array.isArray(value)) return 'array';
  if (value === null) return 'null';
  return typeof value as TreeNode['type'];
} 