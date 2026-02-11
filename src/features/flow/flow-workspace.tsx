'use client';

import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  Background,
  BackgroundVariant,
  Connection,
  ConnectionLineType,
  Controls,
  MiniMap,
  Node,
  ReactFlow,
  ReactFlowInstance,
  addEdge,
  useEdgesState,
  useNodesState,
} from 'reactflow';
import 'reactflow/dist/style.css';
import * as Y from 'yjs';
import { useRealtime } from '@/components/RealtimeProvider';
import { EDGE_STYLE, AUTO_SHIFT, DEFAULT_NODE_SIZE, GRID_SIZE, NODE_GAP, ROUTE_GRID_SIZE } from './flow-constants';
import { FlowEdgeHierarchy } from './flow-edge-hierarchy';
import { buildAdaptiveRoutedEdges } from './flow-edge-routing';
import { FlowNodeCard, NodeActionContext } from './flow-node-card';
import {
  findOpenPosition,
  getUpdatedNodePositions,
  getWorkspaceExtent,
  hasSiblingOverlap,
  snapToGridPosition,
  spreadChildrenForAllParents,
  spreadChildrenForParent,
  getNodeSize,
} from './flow-node-placement';
import { FlowToolbarDesktop } from './flow-toolbar-desktop';
import { FlowToolbarMobile } from './flow-toolbar-mobile';
import type { ConceptNode, ConceptNodeData } from './flow-types';

function buildNodeFromMap(nodeId: string, nodeData: Y.Map<any>): Node {
  const position = nodeData.get('position') || { x: 0, y: 0 };
  return {
    id: nodeId,
    type: 'conceptNode',
    data: {
      label: nodeData.get('label') || 'Node',
      color: nodeData.get('color'),
    },
    position,
  } as Node;
}

function buildEdgeFromMap(edgeId: string, edgeData: Y.Map<any>) {
  return {
    id: edgeId,
    source: edgeData.get('source'),
    target: edgeData.get('target'),
    label: edgeData.get('label'),
    style: EDGE_STYLE,
  };
}

function isSameNode(a: Node, b: Node) {
  return (
    a.id === b.id &&
    a.position.x === b.position.x &&
    a.position.y === b.position.y &&
    a.data?.label === b.data?.label &&
    a.data?.color === b.data?.color
  );
}

function isSameEdge(a: any, b: any) {
  return a.id === b.id && a.source === b.source && a.target === b.target && a.label === b.label;
}

interface FlowWorkspaceProps {
  isReadOnly?: boolean;
}

export function FlowWorkspace({ isReadOnly = false }: FlowWorkspaceProps) {
  const { doc, isConnected, updatePresence, remoteUsers, saveErrorCount } = useRealtime();
  const [nodes, setNodes, onNodesChange] = useNodesState([] as Node[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([] as any[]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [renameNodeId, setRenameNodeId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [snapEnabled, setSnapEnabled] = useState(true);

  const nodeCountRef = useRef(0);
  const undoManagerRef = useRef<Y.UndoManager | null>(null);
  const reactFlowWrapperRef = useRef<HTMLDivElement | null>(null);
  const reactFlowInstanceRef = useRef<ReactFlowInstance | null>(null);

  const nodeTypes = useMemo(() => ({ conceptNode: FlowNodeCard }), []);
  const edgeTypes = useMemo(() => ({ hierarchy: FlowEdgeHierarchy }), []);
  const workspaceExtent = useMemo(() => getWorkspaceExtent(nodes), [nodes]);

  const persistNodePositions = useCallback(
    (updates: Array<{ id: string; position: { x: number; y: number } }>) => {
      if (!doc || updates.length === 0) {
        return;
      }

      const nodesMap = doc.getMap('nodes') as Y.Map<Y.Map<any>>;
      doc.transact(() => {
        updates.forEach((update) => {
          const nodeData = nodesMap.get(update.id);
          if (nodeData && nodeData instanceof Y.Map) {
            nodeData.set('position', update.position);
          }
        });
      }, 'local');
    },
    [doc]
  );

  const getViewportCenter = useCallback(() => {
    const wrapper = reactFlowWrapperRef.current;
    const instance = reactFlowInstanceRef.current;
    if (!wrapper || !instance) {
      return { x: 0, y: 0 };
    }

    const rect = wrapper.getBoundingClientRect();
    return instance.screenToFlowPosition({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    });
  }, []);

  const handleChangeColor = useCallback(
    (nodeId: string, color: string) => {
      if (isReadOnly || !doc) return;

      const nodesMap = doc.getMap('nodes') as Y.Map<Y.Map<any>>;
      const nodeData = nodesMap.get(nodeId);
      if (nodeData && nodeData instanceof Y.Map) {
        doc.transact(() => {
          nodeData.set('color', color);
        }, 'local');
      }

      setNodes((prev) =>
        prev.map((node) =>
          node.id === nodeId
            ? { ...node, data: { ...node.data, color } }
            : node
        )
      );
    },
    [doc, isReadOnly, setNodes]
  );

  useEffect(() => {
    if (!doc) return;

    const nodesMap = doc.getMap('nodes');
    const edgesMap = doc.getMap('edges');
    const undoManager = new Y.UndoManager([nodesMap, edgesMap], {
      trackedOrigins: new Set(['local']),
    });
    undoManagerRef.current = undoManager;

    const updateUndoState = () => {
      setCanUndo(undoManager.canUndo());
      setCanRedo(undoManager.canRedo());
    };

    updateUndoState();

    undoManager.on('stack-item-added', updateUndoState);
    undoManager.on('stack-item-updated', updateUndoState);
    undoManager.on('stack-item-popped', updateUndoState);

    return () => {
      undoManager.off('stack-item-added', updateUndoState);
      undoManager.off('stack-item-updated', updateUndoState);
      undoManager.off('stack-item-popped', updateUndoState);
      undoManager.destroy();
      undoManagerRef.current = null;
    };
  }, [doc]);

  const routedEdges = useMemo(() => buildAdaptiveRoutedEdges(edges, nodes), [edges, nodes]);

  useEffect(() => {
    nodeCountRef.current = Math.max(nodeCountRef.current, nodes.length);
  }, [nodes.length]);

  useEffect(() => {
    if (!selectedNodeId) return;
    const stillExists = nodes.some((node) => node.id === selectedNodeId);
    if (!stillExists) {
      setSelectedNodeId(null);
      updatePresence({ currentNodeId: undefined });
    }
  }, [nodes, selectedNodeId, updatePresence]);

  const getParentIdFor = useCallback(
    (childId: string) => edges.find((edge) => edge.target === childId)?.source ?? null,
    [edges]
  );

  useEffect(() => {
    if (!doc) return;

    const nodesMap = doc.getMap<Y.Map<any>>('nodes');
    const edgesMap = doc.getMap<Y.Map<any>>('edges');

    const initialNodes: Node[] = [];
    nodesMap.forEach((nodeData, nodeId) => {
      if (nodeData instanceof Y.Map) {
        initialNodes.push(buildNodeFromMap(nodeId, nodeData));
      }
    });

    const initialEdges: any[] = [];
    edgesMap.forEach((edgeData, edgeId) => {
      if (edgeData instanceof Y.Map) {
        initialEdges.push(buildEdgeFromMap(edgeId, edgeData));
      }
    });

    const spreadNodes = spreadChildrenForAllParents(initialNodes, initialEdges);

    setNodes(spreadNodes);
    nodeCountRef.current = spreadNodes.length;
    setEdges(initialEdges);

    const handleNodesDeep = (events: Y.YEvent<any>[], transaction: Y.Transaction) => {
      if (transaction.origin === 'local') return;

      const changedIds = new Set<string>();
      events.forEach((event) => {
        if (event.target === nodesMap) {
          event.changes.keys.forEach((_change, key) => {
            changedIds.add(String(key));
          });
        }
        if (event.path.length > 0) {
          changedIds.add(String(event.path[0]));
        }
      });

      if (changedIds.size === 0) return;

      setNodes((prev) => {
        let changed = false;
        const nextMap = new Map(prev.map((node) => [node.id, node]));

        changedIds.forEach((nodeId) => {
          const nodeData = nodesMap.get(nodeId);
          if (!nodeData || !(nodeData instanceof Y.Map)) {
            if (nextMap.delete(nodeId)) {
              changed = true;
            }
            return;
          }

          const nextNode = buildNodeFromMap(nodeId, nodeData);
          const existing = nextMap.get(nodeId);
          if (!existing) {
            nextMap.set(nodeId, nextNode);
            changed = true;
            return;
          }

          if (!isSameNode(existing, nextNode)) {
            nextMap.set(nodeId, { ...existing, ...nextNode, data: nextNode.data, position: nextNode.position });
            changed = true;
          }
        });

        if (!changed) {
          return prev;
        }

        return Array.from(nextMap.values());
      });
    };

    const handleEdgesDeep = (events: Y.YEvent<any>[], transaction: Y.Transaction) => {
      if (transaction.origin === 'local') return;

      const changedIds = new Set<string>();
      events.forEach((event) => {
        if (event.target === edgesMap) {
          event.changes.keys.forEach((_change, key) => {
            changedIds.add(String(key));
          });
        }
        if (event.path.length > 0) {
          changedIds.add(String(event.path[0]));
        }
      });

      if (changedIds.size === 0) return;

      setEdges((prev) => {
        let changed = false;
        const nextMap = new Map(prev.map((edge) => [edge.id, edge]));

        changedIds.forEach((edgeId) => {
          const edgeData = edgesMap.get(edgeId);
          if (!edgeData || !(edgeData instanceof Y.Map)) {
            if (nextMap.delete(edgeId)) {
              changed = true;
            }
            return;
          }

          const nextEdge = buildEdgeFromMap(edgeId, edgeData);
          const existing = nextMap.get(edgeId);
          if (!existing) {
            nextMap.set(edgeId, nextEdge);
            changed = true;
            return;
          }

          if (!isSameEdge(existing, nextEdge)) {
            nextMap.set(edgeId, { ...existing, ...nextEdge });
            changed = true;
          }
        });

        return changed ? Array.from(nextMap.values()) : prev;
      });
    };

    nodesMap.observeDeep(handleNodesDeep);
    edgesMap.observeDeep(handleEdgesDeep);

    return () => {
      nodesMap.unobserveDeep(handleNodesDeep);
      edgesMap.unobserveDeep(handleEdgesDeep);
    };
  }, [doc, setNodes, setEdges]);

  const handleNodesChange = useCallback(
    (changes: any) => {
      if (isReadOnly) return;

      onNodesChange(changes);

      if (!doc) return;

      const positionUpdates = changes
        .filter((change: any) => change.type === 'position' && change.position)
        .map((change: any) => ({ id: change.id, position: change.position }));

      persistNodePositions(positionUpdates);
    },
    [isReadOnly, doc, onNodesChange, persistNodePositions]
  );

  const handleNodeDragStop = useCallback(
    (_event: React.MouseEvent | React.TouchEvent, node: Node) => {
      if (isReadOnly || !doc) return;

      const parentId = getParentIdFor(node.id);
      if (!parentId) return;
      if (!hasSiblingOverlap(parentId, nodes, edges)) return;

      const nextNodes = spreadChildrenForParent(parentId, nodes, edges);
      const updates = getUpdatedNodePositions(nodes, nextNodes);
      if (updates.length === 0) return;

      setNodes(nextNodes);
      persistNodePositions(updates);
    },
    [isReadOnly, doc, getParentIdFor, nodes, edges, setNodes, persistNodePositions]
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
      const newEdge: any = {
        id: edgeId,
        source: connection.source!,
        target: connection.target!,
        style: EDGE_STYLE,
      };

      const edgesMap = doc.getMap('edges');
      doc.transact(() => {
        const edgeDataMap = new Y.Map();
        edgeDataMap.set('id', edgeId);
        edgeDataMap.set('source', connection.source!);
        edgeDataMap.set('target', connection.target!);
        edgesMap.set(edgeId, edgeDataMap);
      }, 'local');

      setEdges((eds) => addEdge(newEdge, eds));
    },
    [isReadOnly, doc, setEdges]
  );

  const handleAddNode = useCallback(() => {
    if (isReadOnly || !doc) return;

    const nodeId = `node-${Date.now()}`;
    const viewCenter = getViewportCenter();
    const basePos = snapToGridPosition({
      x: viewCenter.x - DEFAULT_NODE_SIZE.width / 2,
      y: viewCenter.y - DEFAULT_NODE_SIZE.height / 2,
    });
    const safePos = findOpenPosition(basePos, nodes, { x: AUTO_SHIFT, y: AUTO_SHIFT });

    const newNode: ConceptNode = {
      id: nodeId,
      type: 'conceptNode',
      data: {
        label: `Concept ${nodeCountRef.current + 1}`,
      },
      position: safePos,
    };

    const nodesMap = doc.getMap('nodes');
    doc.transact(() => {
      const nodeDataMap = new Y.Map();
      nodeDataMap.set('id', nodeId);
      nodeDataMap.set('label', newNode.data.label);
      nodeDataMap.set('position', newNode.position);
      nodesMap.set(nodeId, nodeDataMap);
    }, 'local');

    nodeCountRef.current += 1;
    setNodes((nds) => [...nds, newNode]);
  }, [isReadOnly, doc, nodes, setNodes, getViewportCenter]);

  const handleAddChild = useCallback(() => {
    if (isReadOnly || !doc) return;
    if (!selectedNodeId) {
      handleAddNode();
      return;
    }

    const parentNode = nodes.find((n) => n.id === selectedNodeId);
    const childId = `node-${Date.now()}`;

    let baseChildPos = { x: 0, y: 0 };
    if (parentNode) {
      const parentSize = getNodeSize(parentNode);
      baseChildPos = {
        x: parentNode.position.x + (parentSize.width - DEFAULT_NODE_SIZE.width) / 2,
        y: parentNode.position.y + parentSize.height + NODE_GAP,
      };
    } else {
      const viewCenter = getViewportCenter();
      baseChildPos = {
        x: viewCenter.x - DEFAULT_NODE_SIZE.width / 2,
        y: viewCenter.y - DEFAULT_NODE_SIZE.height / 2,
      };
    }

    const childPos = findOpenPosition(snapToGridPosition(baseChildPos), nodes, { x: 0, y: AUTO_SHIFT });

    const childNode: ConceptNode = {
      id: childId,
      type: 'conceptNode',
      data: { label: `Concept ${nodeCountRef.current + 1}` },
      position: childPos,
    };

    const edgeId = `edge-${Date.now()}`;
    const edge = {
      id: edgeId,
      source: selectedNodeId,
      target: childId,
      style: EDGE_STYLE,
    };

    const baseNodes = [...nodes, childNode];
    const baseEdges = [...edges, edge];
    const nextNodes = hasSiblingOverlap(selectedNodeId, baseNodes, baseEdges)
      ? spreadChildrenForParent(selectedNodeId, baseNodes, baseEdges)
      : baseNodes;
    const positionUpdates = getUpdatedNodePositions(baseNodes, nextNodes);

    const nodesMap = doc.getMap('nodes') as Y.Map<Y.Map<any>>;
    const edgesMap = doc.getMap('edges');

    doc.transact(() => {
      const nodeDataMap = new Y.Map();
      nodeDataMap.set('id', childId);
      nodeDataMap.set('label', childNode.data.label);
      nodeDataMap.set('position', childNode.position);
      nodesMap.set(childId, nodeDataMap);

      positionUpdates.forEach((update) => {
        const nodeData = nodesMap.get(update.id);
        if (nodeData && nodeData instanceof Y.Map) {
          nodeData.set('position', update.position);
        }
      });

      const edgeDataMap = new Y.Map();
      edgeDataMap.set('id', edgeId);
      edgeDataMap.set('source', selectedNodeId);
      edgeDataMap.set('target', childId);
      edgesMap.set(edgeId, edgeDataMap);
    }, 'local');

    nodeCountRef.current += 1;
    setNodes(nextNodes);
    setEdges(baseEdges);
  }, [isReadOnly, doc, selectedNodeId, nodes, edges, setNodes, setEdges, handleAddNode, getViewportCenter]);

  const handleAddSibling = useCallback(() => {
    if (isReadOnly || !doc) return;
    if (!selectedNodeId) {
      handleAddNode();
      return;
    }

    const refNode = nodes.find((n) => n.id === selectedNodeId);
    const siblingId = `node-${Date.now()}`;
    const parentIdFromState = getParentIdFor(selectedNodeId);
    const parentNode = parentIdFromState ? nodes.find((n) => n.id === parentIdFromState) : undefined;
    const anchorNode = parentNode ?? refNode;

    let baseSiblingPos = { x: 0, y: 0 };
    if (anchorNode) {
      const anchorSize = getNodeSize(anchorNode);
      baseSiblingPos = {
        x: anchorNode.position.x + anchorSize.width + NODE_GAP,
        y: anchorNode.position.y + (anchorSize.height - DEFAULT_NODE_SIZE.height) / 2,
      };
    } else {
      const viewCenter = getViewportCenter();
      baseSiblingPos = {
        x: viewCenter.x - DEFAULT_NODE_SIZE.width / 2,
        y: viewCenter.y - DEFAULT_NODE_SIZE.height / 2,
      };
    }

    const siblingPos = findOpenPosition(snapToGridPosition(baseSiblingPos), nodes, { x: 0, y: AUTO_SHIFT });

    const siblingNode: ConceptNode = {
      id: siblingId,
      type: 'conceptNode',
      data: { label: `Concept ${nodeCountRef.current + 1}` },
      position: siblingPos,
    };

    const edgesMap = doc.getMap('edges') as Y.Map<Y.Map<any>>;
    let parentId: string | null = parentIdFromState;

    if (!parentId) {
      edgesMap.forEach((edgeData) => {
        if (edgeData && edgeData instanceof Y.Map && edgeData.get('target') === selectedNodeId) {
          parentId = edgeData.get('source');
        }
      });
    }

    const sourceId = parentId || selectedNodeId;
    const edgeId = `edge-${Date.now()}`;
    const edge = {
      id: edgeId,
      source: sourceId,
      target: siblingId,
      style: EDGE_STYLE,
    };

    const baseNodes = [...nodes, siblingNode];
    const baseEdges = [...edges, edge];
    const nextNodes = hasSiblingOverlap(sourceId, baseNodes, baseEdges)
      ? spreadChildrenForParent(sourceId, baseNodes, baseEdges)
      : baseNodes;
    const positionUpdates = getUpdatedNodePositions(baseNodes, nextNodes);

    const nodesMap = doc.getMap('nodes') as Y.Map<Y.Map<any>>;

    doc.transact(() => {
      const nodeDataMap = new Y.Map();
      nodeDataMap.set('id', siblingId);
      nodeDataMap.set('label', siblingNode.data.label);
      nodeDataMap.set('position', siblingNode.position);
      nodesMap.set(siblingId, nodeDataMap);

      positionUpdates.forEach((update) => {
        const nodeData = nodesMap.get(update.id);
        if (nodeData && nodeData instanceof Y.Map) {
          nodeData.set('position', update.position);
        }
      });

      const edgeDataMap = new Y.Map();
      edgeDataMap.set('id', edgeId);
      edgeDataMap.set('source', sourceId);
      edgeDataMap.set('target', siblingId);
      edgesMap.set(edgeId, edgeDataMap);
    }, 'local');

    nodeCountRef.current += 1;
    setNodes(nextNodes);
    setEdges(baseEdges);
  }, [isReadOnly, doc, selectedNodeId, nodes, edges, setNodes, setEdges, handleAddNode, getParentIdFor, getViewportCenter]);

  const handleAddParent = useCallback(() => {
    if (isReadOnly || !doc) return;
    if (!selectedNodeId) {
      handleAddNode();
      return;
    }

    const child = nodes.find((n) => n.id === selectedNodeId);
    const parentId = `node-${Date.now()}`;

    let baseParentPos = { x: 0, y: 0 };
    if (child) {
      const childSize = getNodeSize(child);
      baseParentPos = {
        x: child.position.x + (childSize.width - DEFAULT_NODE_SIZE.width) / 2,
        y: child.position.y - DEFAULT_NODE_SIZE.height - NODE_GAP,
      };
    } else {
      const viewCenter = getViewportCenter();
      baseParentPos = {
        x: viewCenter.x - DEFAULT_NODE_SIZE.width / 2,
        y: viewCenter.y - DEFAULT_NODE_SIZE.height / 2,
      };
    }

    const parentPos = findOpenPosition(snapToGridPosition(baseParentPos), nodes, { x: 0, y: -AUTO_SHIFT });

    const parentNode: ConceptNode = {
      id: parentId,
      type: 'conceptNode',
      data: { label: `Concept ${nodeCountRef.current + 1}` },
      position: parentPos,
    };

    const edgeId = `edge-${Date.now()}`;

    const nodesMap = doc.getMap('nodes');
    const edgesMap = doc.getMap('edges');
    doc.transact(() => {
      const nodeDataMap = new Y.Map();
      nodeDataMap.set('id', parentId);
      nodeDataMap.set('label', parentNode.data.label);
      nodeDataMap.set('position', parentNode.position);
      nodesMap.set(parentId, nodeDataMap);

      const edgeDataMap = new Y.Map();
      edgeDataMap.set('id', edgeId);
      edgeDataMap.set('source', parentId);
      edgeDataMap.set('target', selectedNodeId);
      edgesMap.set(edgeId, edgeDataMap);
    }, 'local');

    nodeCountRef.current += 1;
    setNodes((nds) => [...nds, parentNode]);
    setEdges((eds) => [...eds, { id: edgeId, source: parentId, target: selectedNodeId, style: EDGE_STYLE }]);
  }, [isReadOnly, doc, selectedNodeId, nodes, setNodes, setEdges, handleAddNode, getViewportCenter]);

  const handleDeleteNode = useCallback(() => {
    if (isReadOnly || !selectedNodeId || !doc) return;

    const nodesMap = doc.getMap('nodes');
    const edgesMap = doc.getMap('edges') as Y.Map<Y.Map<any>>;

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

    doc.transact(() => {
      nodesMap.delete(selectedNodeId);
      edgesToDelete.forEach((edgeId) => {
        edgesMap.delete(edgeId);
      });
    }, 'local');

    setNodes((nds) => nds.filter((n) => n.id !== selectedNodeId));
    setEdges((eds) => eds.filter((e) => e.source !== selectedNodeId && e.target !== selectedNodeId));
    setSelectedNodeId(null);
  }, [isReadOnly, selectedNodeId, doc, setNodes, setEdges]);

  const handleUndo = useCallback(() => {
    const undoManager = undoManagerRef.current;
    if (undoManager?.canUndo()) {
      undoManager.undo();
    }
  }, []);

  const handleRedo = useCallback(() => {
    const undoManager = undoManagerRef.current;
    if (undoManager?.canRedo()) {
      undoManager.redo();
    }
  }, []);

  const handleRenameStart = useCallback(() => {
    if (!selectedNodeId || isReadOnly) return;
    const node = nodes.find((n) => n.id === selectedNodeId);
    if (node) {
      setRenameNodeId(selectedNodeId);
      setRenameText(node.data.label);
    }
  }, [selectedNodeId, nodes, isReadOnly]);

  const handleRenameSave = useCallback(() => {
    if (!renameNodeId || !doc || !renameText.trim()) return;

    const nodesMap = doc.getMap('nodes') as Y.Map<Y.Map<any>>;
    const nodeData = nodesMap.get(renameNodeId);
    if (nodeData && nodeData instanceof Y.Map) {
      doc.transact(() => {
        nodeData.set('label', renameText.trim());
      }, 'local');
    }

    setNodes((nds) =>
      nds.map((n) => (n.id === renameNodeId ? { ...n, data: { ...n.data, label: renameText.trim() } } : n))
    );

    setRenameNodeId(null);
    setRenameText('');
  }, [renameNodeId, doc, renameText, setNodes]);

  const handleRenameCancel = useCallback(() => {
    setRenameNodeId(null);
    setRenameText('');
  }, []);

  const handleSelectionChange = useCallback(
    (selection: { nodes?: Node<ConceptNodeData>[] }) => {
      const nextSelected = selection.nodes?.[0]?.id ?? null;
      setSelectedNodeId((prev) => {
        if (prev === nextSelected) {
          return prev;
        }
        updatePresence({ currentNodeId: nextSelected ?? undefined });
        return nextSelected;
      });
    },
    [updatePresence]
  );

  const handleInvite = useCallback(() => {
    setShowInviteModal(true);
  }, []);

  return (
    <div className="relative flex h-full flex-col bg-slate-50">
      {!isReadOnly && (
        <>
          <FlowToolbarDesktop
            selectedNodeId={selectedNodeId}
            canUndo={canUndo}
            canRedo={canRedo}
            snapEnabled={snapEnabled}
            remoteUsersCount={remoteUsers.length}
            isConnected={isConnected}
            saveErrorCount={saveErrorCount}
            onAddNode={handleAddNode}
            onAddChild={handleAddChild}
            onAddSibling={handleAddSibling}
            onAddParent={handleAddParent}
            onRename={handleRenameStart}
            onDelete={handleDeleteNode}
            onUndo={handleUndo}
            onRedo={handleRedo}
            onInvite={handleInvite}
            onToggleSnap={() => setSnapEnabled((prev) => !prev)}
          />
          <FlowToolbarMobile
            selectedNodeId={selectedNodeId}
            canUndo={canUndo}
            canRedo={canRedo}
            snapEnabled={snapEnabled}
            isConnected={isConnected}
            remoteUsersCount={remoteUsers.length}
            onAddNode={handleAddNode}
            onAddChild={handleAddChild}
            onAddSibling={handleAddSibling}
            onAddParent={handleAddParent}
            onUndo={handleUndo}
            onRedo={handleRedo}
            onRename={handleRenameStart}
            onDelete={handleDeleteNode}
            onToggleSnap={() => setSnapEnabled((prev) => !prev)}
            onInvite={handleInvite}
          />
        </>
      )}

      <div ref={reactFlowWrapperRef} className="flex-1 pb-16 sm:pb-0">
        <NodeActionContext.Provider value={{ onChangeColor: handleChangeColor, isReadOnly }}>
          <ReactFlow
            nodes={nodes}
            edges={routedEdges}
            onInit={(instance) => {
              reactFlowInstanceRef.current = instance;
            }}
            onNodesChange={handleNodesChange}
            onNodeDragStop={handleNodeDragStop}
            onEdgesChange={handleEdgesChange}
            onConnect={handleConnect}
            onSelectionChange={handleSelectionChange}
            onPaneClick={() => {
              setSelectedNodeId((prev) => {
                if (!prev) return prev;
                updatePresence({ currentNodeId: undefined });
                return null;
              });
            }}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            translateExtent={workspaceExtent}
            snapToGrid={snapEnabled}
            snapGrid={[GRID_SIZE, GRID_SIZE]}
            attributionPosition="bottom-left"
            connectionLineType={ConnectionLineType.Straight}
            selectionOnDrag={false}
            panOnDrag
            panOnScroll
            zoomOnPinch
            onlyRenderVisibleElements
            defaultEdgeOptions={{
              type: 'hierarchy',
              style: EDGE_STYLE,
            }}
          >
            <Background gap={ROUTE_GRID_SIZE} size={0.5} color="#dbeafe" variant={BackgroundVariant.Lines} />
            <Background gap={GRID_SIZE} size={1} color="#cbd5e1" variant={BackgroundVariant.Lines} />
            <Controls />
            <div className="hidden sm:block">
              <MiniMap />
            </div>
          </ReactFlow>
        </NodeActionContext.Provider>
      </div>

      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
            <h2 className="mb-4 text-xl font-bold">Share map</h2>
            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-gray-700">Map link</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={typeof window !== 'undefined' ? window.location.href : ''}
                  className="flex-1 rounded border border-gray-300 bg-gray-50 px-3 py-2 text-sm"
                />
                <button
                  onClick={() => {
                    const url = typeof window !== 'undefined' ? window.location.href : '';
                    if (navigator.clipboard && url) {
                      navigator.clipboard.writeText(url);
                    }
                  }}
                  className="rounded bg-blue-500 px-3 py-2 text-white hover:bg-blue-600"
                >
                  Copy
                </button>
              </div>
            </div>
            <button
              onClick={() => setShowInviteModal(false)}
              className="w-full rounded bg-gray-200 px-4 py-2 hover:bg-gray-300"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {renameNodeId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
            <h2 className="mb-4 text-xl font-bold">Rename Node</h2>
            <input
              type="text"
              value={renameText}
              onChange={(event) => setRenameText(event.target.value)}
              placeholder="Enter new name"
              className="mb-4 w-full rounded border border-gray-300 px-3 py-2"
              autoFocus
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  handleRenameSave();
                } else if (event.key === 'Escape') {
                  handleRenameCancel();
                }
              }}
            />
            <div className="flex gap-2">
              <button
                onClick={handleRenameSave}
                className="flex-1 rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
              >
                Rename
              </button>
              <button
                onClick={handleRenameCancel}
                className="flex-1 rounded bg-gray-200 px-4 py-2 hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

