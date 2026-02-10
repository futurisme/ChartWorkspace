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
    <div className="rounded-lg border-2 border-blue-500 bg-white px-3 py-2 shadow-lg max-w-xs cursor-grab active:cursor-grabbing touch-none select-none">
      <div className="font-semibold text-gray-900 text-sm sm:text-base break-words pointer-events-none">{data.label}</div>
    </div>
  );
}

interface ConceptFlowProps {
  isReadOnly?: boolean;
}

export function ConceptFlow({ isReadOnly = false }: ConceptFlowProps) {
  const { doc, isConnected, updatePresence, remoteUsers, localPresence, saveErrorCount } = useRealtime();
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
        type: 'conceptNode',
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
          type: 'conceptNode',
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
      type: 'conceptNode',
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

  const handleAddChild = useCallback(() => {
    if (isReadOnly || !doc) return;
    if (!selectedNodeId) {
      handleAddNode();
      return;
    }

    const parentNode = nodes.find((n) => n.id === selectedNodeId);
    const childId = `node-${Date.now()}`;
    const childPos = parentNode
      ? { x: parentNode.position.x + 160, y: parentNode.position.y + 40 }
      : { x: Math.random() * 400, y: Math.random() * 400 };

    const childNode: ConceptNode = {
      id: childId,
      type: 'conceptNode',
      data: { label: `Concept ${nodeCountRef.current + 1}` },
      position: childPos,
    };

    // Save node in Yjs
    const nodesMap = doc.getMap('nodes');
    const nodeDataMap = new Y.Map();
    nodeDataMap.set('id', childId);
    nodeDataMap.set('label', childNode.data.label);
    nodeDataMap.set('position', childNode.position);
    nodesMap.set(childId, nodeDataMap);

    // Create edge
    const edgeId = `edge-${Date.now()}`;
    const edgesMap = doc.getMap('edges');
    const edgeDataMap = new Y.Map();
    edgeDataMap.set('id', edgeId);
    edgeDataMap.set('source', selectedNodeId);
    edgeDataMap.set('target', childId);
    edgesMap.set(edgeId, edgeDataMap);

    nodeCountRef.current++;
    setNodes((nds) => [...nds, childNode]);
    setEdges((eds) => [...eds, { id: edgeId, source: selectedNodeId!, target: childId }]);
  }, [isReadOnly, doc, selectedNodeId, nodes, setNodes, setEdges, handleAddNode]);

  const handleAddSibling = useCallback(() => {
    if (isReadOnly || !doc) return;
    if (!selectedNodeId) {
      handleAddNode();
      return;
    }

    const refNode = nodes.find((n) => n.id === selectedNodeId);
    const siblingId = `node-${Date.now()}`;
    const siblingPos = refNode
      ? { x: refNode.position.x, y: refNode.position.y + 120 }
      : { x: Math.random() * 400, y: Math.random() * 400 };

    const siblingNode: ConceptNode = {
      id: siblingId,
      type: 'conceptNode',
      data: { label: `Concept ${nodeCountRef.current + 1}` },
      position: siblingPos,
    };

    const nodesMap = doc.getMap('nodes');
    const nodeDataMap = new Y.Map();
    nodeDataMap.set('id', siblingId);
    nodeDataMap.set('label', siblingNode.data.label);
    nodeDataMap.set('position', siblingNode.position);
    nodesMap.set(siblingId, nodeDataMap);

    nodeCountRef.current++;
    setNodes((nds) => [...nds, siblingNode]);
  }, [isReadOnly, doc, selectedNodeId, nodes, setNodes, handleAddNode]);

  const handleAddParent = useCallback(() => {
    if (isReadOnly || !doc) return;
    if (!selectedNodeId) {
      handleAddNode();
      return;
    }

    const child = nodes.find((n) => n.id === selectedNodeId);
    const parentId = `node-${Date.now()}`;
    const parentPos = child
      ? { x: child.position.x - 160, y: child.position.y - 40 }
      : { x: Math.random() * 400, y: Math.random() * 400 };

    const parentNode: ConceptNode = {
      id: parentId,
      type: 'conceptNode',
      data: { label: `Concept ${nodeCountRef.current + 1}` },
      position: parentPos,
    };

    const nodesMap = doc.getMap('nodes');
    const nodeDataMap = new Y.Map();
    nodeDataMap.set('id', parentId);
    nodeDataMap.set('label', parentNode.data.label);
    nodeDataMap.set('position', parentNode.position);
    nodesMap.set(parentId, nodeDataMap);

    // Connect parent -> child
    const edgeId = `edge-${Date.now()}`;
    const edgesMap = doc.getMap('edges');
    const edgeDataMap = new Y.Map();
    edgeDataMap.set('id', edgeId);
    edgeDataMap.set('source', parentId);
    edgeDataMap.set('target', selectedNodeId);
    edgesMap.set(edgeId, edgeDataMap);

    nodeCountRef.current++;
    setNodes((nds) => [...nds, parentNode]);
    setEdges((eds) => [...eds, { id: edgeId, source: parentId, target: selectedNodeId! }]);
  }, [isReadOnly, doc, selectedNodeId, nodes, setNodes, setEdges, handleAddNode]);

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

  const handleInvite = useCallback(() => {
    try {
      const url = typeof window !== 'undefined' ? window.location.href : '';
      if (navigator.clipboard && url) {
        navigator.clipboard.writeText(url);
        alert('Invite link copied to clipboard');
      } else {
        alert('Copy this link to invite: ' + url);
      }
    } catch (e) {
      console.warn('Invite copy failed', e);
      alert('Unable to copy invite link');
    }
  }, []);

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      {!isReadOnly && (
        <>
          <div className="hidden sm:block border-b border-gray-200 bg-white px-4 py-2">
            <div className="flex items-center gap-2 flex-wrap md:flex-nowrap">
              <button
                onClick={handleAddNode}
                className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 active:bg-blue-800"
              >
                + Add Concept
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleAddChild}
                  className="rounded bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 active:bg-indigo-800"
                >
                  + Child
                </button>
                <button
                  onClick={handleAddSibling}
                  className="rounded bg-indigo-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-indigo-600 active:bg-indigo-700"
                >
                  + Sibling
                </button>
                <button
                  onClick={handleAddParent}
                  className="rounded bg-indigo-400 px-3 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 active:bg-indigo-600"
                >
                  + Parent
                </button>
              </div>

              {selectedNodeId && (
                <button
                  onClick={handleDeleteNode}
                  className="rounded bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 active:bg-red-800"
                >
                  × Delete
                </button>
              )}

              <div className="flex-1" />

              {/* Multi-user indicator */}
              <div className="flex items-center gap-2">
                {remoteUsers.length > 0 && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-yellow-100 rounded text-xs font-semibold text-yellow-800">
                    <span className="inline-block h-2 w-2 rounded-full bg-yellow-600 animate-pulse" />
                    {remoteUsers.length + 1} editing
                  </div>
                )}
              </div>

              <button
                onClick={handleInvite}
                className="rounded border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100"
              >
                Invite to collab
              </button>

              {!isConnected && (
                <div className="flex items-center gap-2 text-sm text-red-600">
                  <div className="h-2 w-2 rounded-full bg-red-500" />
                  Offline
                </div>
              )}

              {saveErrorCount > 0 && (
                <div className="text-xs font-medium text-orange-600">
                  {saveErrorCount > 0 ? `⚠ ${saveErrorCount} save${saveErrorCount > 1 ? 's' : ''} syncing` : ''}
                </div>
              )}
            </div>
          </div>

          {/* Mobile toolbar fixed bottom */}
          <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white px-2 py-2">
            <div className="flex items-center justify-around">
              <button onClick={handleAddNode} className="rounded-full bg-blue-600 p-3 text-white text-lg transition active:bg-blue-700" title="Add">＋</button>
              <button onClick={handleAddChild} className="rounded-full bg-indigo-600 p-3 text-white text-lg transition active:bg-indigo-700" title="Child">↳</button>
              <button onClick={handleAddSibling} className="rounded-full bg-indigo-500 p-3 text-white text-lg transition active:bg-indigo-600" title="Sibling">≡</button>
              <button onClick={handleAddParent} className="rounded-full bg-indigo-400 p-3 text-white text-lg transition active:bg-indigo-500" title="Parent">↶</button>
              <button onClick={handleInvite} className="rounded-full bg-gray-100 p-3 text-lg transition active:bg-gray-200" title="Invite">🔗</button>
              {remoteUsers.length > 0 && (
                <div className="rounded-full bg-yellow-100 p-3 text-sm font-bold text-yellow-800">{remoteUsers.length + 1}</div>
              )}
            </div>
          </div>
        </>
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
        attributionPosition="bottom-left"
      >
        <Background />
        <Controls />
        <div className="hidden sm:block">
          <MiniMap />
        </div>
      </ReactFlow>
    </div>
  );
}
