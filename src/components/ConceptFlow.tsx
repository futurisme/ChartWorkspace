'use client';

import React, {
  useCallback,
  useEffect,
  useState,
  useMemo,
  useRef,
} from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  Connection,
  addEdge,
  useNodesState,
  useEdgesState,
  NodeProps,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useRealtime } from './RealtimeProvider';
import * as Y from 'yjs';

interface ConceptNodeData {
  label: string;
  color?: string;
}

type ConceptNode = Node<ConceptNodeData>;

function ConceptNodeComponent({ data }: NodeProps<ConceptNodeData>) {
  return (
    <div className="rounded-lg border-2 border-blue-500 bg-white px-4 py-2 shadow-lg">
      <div className="font-semibold text-gray-900">{data.label}</div>
    </div>
  );
}

interface ConceptFlowProps {
  isReadOnly?: boolean;
}

export function ConceptFlow({ isReadOnly = false }: ConceptFlowProps) {
  const { doc, isConnected, updatePresence } = useRealtime();
  const [nodes, setNodes, onNodesChange] = useNodesState([] as Node[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([] as Edge[]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const nodeCountRef = useRef(0);

  // Initialize from Yjs doc
  useEffect(() => {
    if (!doc) return;

    const nodesMap = doc.getMap<Y.Map<any>>('nodes');
    const edgesMap = doc.getMap<Y.Map<any>>('edges');

    // Load initial nodes
    const initialNodes: Node[] = [];
    nodesMap.forEach((nodeData, nodeId) => {
      const position = nodeData.get('position');
      initialNodes.push({
        id: nodeId,
        data: {
          label: nodeData.get('label') || 'Node',
          color: nodeData.get('color'),
        },
        position: position || { x: 0, y: 0 },
      } as Node);
    });

    setNodes(initialNodes);
    nodeCountRef.current = initialNodes.length;

    // Load initial edges
    const initialEdges: Edge[] = [];
    edgesMap.forEach((edgeData, edgeId) => {
      initialEdges.push({
        id: edgeId,
        source: edgeData.get('source'),
        target: edgeData.get('target'),
        label: edgeData.get('label'),
      });
    });

    setEdges(initialEdges);

    // Listen for updates
    const handleUpdate = (update: Uint8Array, origin: any) => {
      if (origin === 'local') return;

      // Rebuild from Yjs state
      const updatedNodes: Node[] = [];
      nodesMap.forEach((nodeData, nodeId) => {
        const position = nodeData.get('position');
        updatedNodes.push({
          id: nodeId,
          data: {
            label: nodeData.get('label') || 'Node',
            color: nodeData.get('color'),
          },
          position: position || { x: 0, y: 0 },
        } as Node);
      });

      const updatedEdges: Edge[] = [];
      edgesMap.forEach((edgeData, edgeId) => {
        updatedEdges.push({
          id: edgeId,
          source: edgeData.get('source'),
          target: edgeData.get('target'),
          label: edgeData.get('label'),
        });
      });

      setNodes(updatedNodes);
      setEdges(updatedEdges);
    };

    doc.on('update', handleUpdate);

    return () => {
      doc.off('update', handleUpdate);
    };
  }, [doc, setNodes, setEdges]);

  const handleNodesChange = useCallback(
    (changes: any) => {
      if (isReadOnly) return;

      onNodesChange(changes);

      // Update Yjs on position changes
      if (!doc) return;

      const nodesMap = doc.getMap('nodes') as Y.Map<Y.Map<any>>;

      changes.forEach((change: any) => {
        if (change.type === 'position' && change.position) {
          const nodeData = nodesMap.get(change.id);
          if (nodeData && nodeData instanceof Y.Map) {
            nodeData.set('position', change.position);
          }
        }

        if (change.type === 'select') {
          setSelectedNodeId(change.id);
          updatePresence({ currentNodeId: change.id });
        }
      });
    },
    [isReadOnly, doc, onNodesChange, updatePresence]
  );

  const handleEdgesChange = useCallback(
    (changes: any) => {
      if (isReadOnly) return;
      onEdgesChange(changes);
    },
    [isReadOnly, onEdgesChange]
  );

  const handleConnect = useCallback(
    (connection: Connection) => {
      if (isReadOnly || !doc) return;

      const edgeId = `edge-${Date.now()}`;
      const newEdge: Edge = {
        id: edgeId,
        source: connection.source!,
        target: connection.target!,
      };

      const edgesMap = doc.getMap('edges');
      const edgeDataMap = new Y.Map();
      edgeDataMap.set('id', edgeId);
      edgeDataMap.set('source', connection.source!);
      edgeDataMap.set('target', connection.target!);
      edgesMap.set(edgeId, edgeDataMap);

      setEdges((eds) => addEdge(newEdge, eds));
    },
    [isReadOnly, doc, setEdges]
  );

  const handleAddNode = useCallback(() => {
    if (isReadOnly || !doc) return;

    const nodeId = `node-${Date.now()}`;
    const newNode: ConceptNode = {
      id: nodeId,
      data: {
        label: `Concept ${nodeCountRef.current + 1}`,
      },
      position: {
        x: Math.random() * 400,
        y: Math.random() * 400,
      },
    };

    const nodesMap = doc.getMap('nodes');
    const nodeDataMap = new Y.Map();
    nodeDataMap.set('id', nodeId);
    nodeDataMap.set('label', newNode.data.label);
    nodeDataMap.set('position', newNode.position);
    nodesMap.set(nodeId, nodeDataMap);

    nodeCountRef.current++;
    setNodes((nds) => [...nds, newNode]);
  }, [isReadOnly, doc, setNodes]);

  const handleDeleteNode = useCallback(() => {
    if (isReadOnly || !selectedNodeId || !doc) return;

    const nodesMap = doc.getMap('nodes');
    const edgesMap = doc.getMap('edges') as Y.Map<Y.Map<any>>;

    nodesMap.delete(selectedNodeId);

    // Delete connected edges
    const edgesToDelete: string[] = [];
    edgesMap.forEach((edgeData, edgeId) => {
      if (edgeData && edgeData instanceof Y.Map) {
        const source = edgeData.get('source');
        const target = edgeData.get('target');
        if (source === selectedNodeId || target === selectedNodeId) {
          edgesToDelete.push(edgeId);
        }
      }
    });

    edgesToDelete.forEach((edgeId) => {
      edgesMap.delete(edgeId);
    });

    setNodes((nds) => nds.filter((n) => n.id !== selectedNodeId));
    setEdges((eds) =>
      eds.filter(
        (e) =>
          e.source !== selectedNodeId && e.target !== selectedNodeId
      )
    );
    setSelectedNodeId(null);
  }, [isReadOnly, selectedNodeId, doc, setNodes, setEdges]);

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      {!isReadOnly && (
        <div className="border-b border-gray-200 bg-white px-4 py-2">
          <div className="flex gap-2">
            <button
              onClick={handleAddNode}
              className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              + Add Concept
            </button>
            {selectedNodeId && (
              <button
                onClick={handleDeleteNode}
                className="rounded bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
              >
                × Delete
              </button>
            )}
            {!isConnected && (
              <div className="flex items-center gap-2 text-sm text-red-600">
                <div className="h-2 w-2 rounded-full bg-red-500" />
                Offline
              </div>
            )}
          </div>
        </div>
      )}

      {/* Flow Canvas */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={handleConnect}
        nodeTypes={{ conceptNode: ConceptNodeComponent }}
        fitView
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
}
