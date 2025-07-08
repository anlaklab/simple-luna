import React, { useState, useCallback, useMemo } from 'react';
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  Connection,
  NodeTypes,
  Handle,
  Position,
  BackgroundVariant,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { ChevronDown, ChevronRight, FileText, Hash, Quote, ToggleLeft, Braces, List } from 'lucide-react';

// Tipos de datos personalizados para diferentes nodos
const getNodeIcon = (type: string) => {
  switch (type) {
    case 'object': return <Braces className="w-4 h-4" />;
    case 'array': return <List className="w-4 h-4" />;
    case 'string': return <Quote className="w-4 h-4" />;
    case 'number': return <Hash className="w-4 h-4" />;
    case 'boolean': return <ToggleLeft className="w-4 h-4" />;
    default: return <FileText className="w-4 h-4" />;
  }
};

const getNodeColor = (type: string) => {
  switch (type) {
    case 'object': return { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800' };
    case 'array': return { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800' };
    case 'string': return { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-800' };
    case 'number': return { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-800' };
    case 'boolean': return { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-800' };
    default: return { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-800' };
  }
};

// Componente de nodo personalizado
const JsonNode = ({ data }: { data: any }) => {
  const { bg, border, text } = getNodeColor(data.type);
  const icon = getNodeIcon(data.type);
  
  const canExpand = data.type === 'object' || data.type === 'array';
  const isExpanded = data.isExpanded || false;

  const handleToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (canExpand && data.onToggle) {
      data.onToggle(data.nodeId, !isExpanded);
    }
  }, [isExpanded, canExpand, data]);

  return (
    <div className={`${bg} ${border} border-2 rounded-lg p-3 min-w-[200px] max-w-[300px] shadow-sm hover:shadow-md transition-shadow`}>
      {/* Handle de entrada */}
      <Handle type="target" position={Position.Top} className="w-2 h-2" />
      
      <div className="flex items-center space-x-2">
        {canExpand && (
          <button
            onClick={handleToggle}
            className={`${text} hover:opacity-70 transition-opacity flex-shrink-0`}
            type="button"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        )}
        
        <div className={`${text} flex items-center space-x-2 min-w-0`}>
          {icon}
          <span className="font-medium text-sm truncate">
            {data.label}
          </span>
        </div>
      </div>

      {/* Información adicional */}
      <div className="mt-1 text-xs text-gray-600">
        {data.type === 'object' && (
          <span>{data.keyCount} {data.keyCount === 1 ? 'key' : 'keys'}</span>
        )}
        {data.type === 'array' && (
          <span>{data.length} {data.length === 1 ? 'item' : 'items'}</span>
        )}
        {data.type === 'string' && data.value && (
          <span className="truncate block max-w-[250px]">"{data.value}"</span>
        )}
        {(data.type === 'number' || data.type === 'boolean') && data.value !== undefined && (
          <span>{String(data.value)}</span>
        )}
      </div>

      {/* Handle de salida */}
      {canExpand && (
        <Handle type="source" position={Position.Bottom} className="w-2 h-2" />
      )}
    </div>
  );
};

// Tipo personalizado de nodos
const nodeTypes: NodeTypes = {
  jsonNode: JsonNode,
};

interface JsonFlowViewerProps {
  data: any;
  className?: string;
}

export default function JsonFlowViewer({ data, className = '' }: JsonFlowViewerProps) {
  // Use path-based keys for consistent node identification
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['root']));
  
  // Handle node toggle with proper state management
  const handleNodeToggle = useCallback((nodeId: string, expanded: boolean) => {
    setExpandedNodes(prev => {
      const newExpanded = new Set(prev);
      if (expanded) {
        newExpanded.add(nodeId);
      } else {
        newExpanded.delete(nodeId);
        // Also collapse all children
        for (const key of newExpanded) {
          if (key.startsWith(nodeId + '.') || key.startsWith(nodeId + '[')) {
            newExpanded.delete(key);
          }
        }
      }
      return newExpanded;
    });
  }, []);
  
  // Generar nodos y edges del JSON
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    const generateNodes = (
      obj: any, 
      parentId: string | null = null, 
      key: string = 'root', 
      path: string = 'root',
      level: number = 0
    ): string => {
      const nodeId = path;
      const isExpanded = expandedNodes.has(nodeId) || level < 2; // Auto-expand first 2 levels
      
      const getType = (value: any): string => {
        if (Array.isArray(value)) return 'array';
        if (value === null) return 'null';
        return typeof value;
      };

      const type = getType(obj);
      let nodeData: any = {
        nodeId: nodeId,
        label: key,
        type,
        level,
        isExpanded,
        onToggle: handleNodeToggle,
      };

      // Datos específicos por tipo
      if (type === 'object' && obj !== null) {
        nodeData.keyCount = Object.keys(obj).length;
      } else if (type === 'array') {
        nodeData.length = obj.length;
      } else {
        nodeData.value = obj;
      }

      // Posición del nodo calculada en base al nivel y posición
      const node: Node = {
        id: nodeId,
        type: 'jsonNode',
        data: nodeData,
        position: { 
          x: level * 350, 
          y: nodes.length * 120 
        },
        draggable: true,
      };

      nodes.push(node);

      // Crear edges y nodos hijos si está expandido
      if (isExpanded && (type === 'object' || type === 'array')) {
        if (type === 'object' && obj !== null) {
          Object.entries(obj).forEach(([childKey, childValue], index) => {
            const childPath = `${path}.${childKey}`;
            const childNodeId = generateNodes(childValue, nodeId, childKey, childPath, level + 1);
            edges.push({
              id: `${nodeId}-${childNodeId}`,
              source: nodeId,
              target: childNodeId,
              type: 'smoothstep',
              animated: false,
              style: { stroke: '#6b7280', strokeWidth: 2 },
            });
          });
        } else if (type === 'array') {
          obj.forEach((item: any, index: number) => {
            const childPath = `${path}[${index}]`;
            const childNodeId = generateNodes(item, nodeId, `[${index}]`, childPath, level + 1);
            edges.push({
              id: `${nodeId}-${childNodeId}`,
              source: nodeId,
              target: childNodeId,
              type: 'smoothstep',
              animated: false,
              style: { stroke: '#6b7280', strokeWidth: 2 },
            });
          });
        }
      }

      return nodeId;
    };

    if (data) {
      generateNodes(data);
    }
    
    return { nodes, edges };
  }, [data, expandedNodes, handleNodeToggle]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes and edges when initial values change
  React.useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  const onConnect = useCallback(
    (params: Edge | Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  if (!data) {
    return (
      <div className={`flex items-center justify-center h-64 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 ${className}`}>
        <div className="text-center">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-500">No data to visualize</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Braces className="w-5 h-5 text-blue-600" />
          <h3 className="font-medium text-gray-900">Interactive JSON Flow</h3>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <span>{nodes.length} nodes</span>
          <span>•</span>
          <span>{edges.length} connections</span>
        </div>
      </div>

      {/* ReactFlow Container */}
      <div className="h-[600px] w-full">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          attributionPosition="bottom-left"
          className="bg-gray-50"
        >
          <Controls 
            position="top-right"
            className="bg-white border border-gray-300 rounded-lg shadow-sm"
          />
          <Background 
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1}
            color="#e5e7eb"
          />
        </ReactFlow>
      </div>

      {/* Footer con instrucciones */}
      <div className="bg-gray-50 px-4 py-2 border-t border-gray-200">
        <div className="flex items-center justify-between text-xs text-gray-600">
          <div className="flex items-center space-x-4">
            <span>💡 <strong>Tip:</strong> Click the arrow icons to expand/collapse nodes</span>
          </div>
          <div className="flex items-center space-x-4">
            <span className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-blue-200 rounded-full"></div>
              <span>Objects</span>
            </span>
            <span className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-200 rounded-full"></div>
              <span>Arrays</span>
            </span>
            <span className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-purple-200 rounded-full"></div>
              <span>Strings</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
} 