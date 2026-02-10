'use client';

import React, {
  useCallback,
  useEffect,
  useState,
  useMemo,
  useRef,
  useContext,
  createContext,
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
  EdgeProps,
  ReactFlowInstance,
  NodeToolbar,
  getSmoothStepPath,
  getStraightPath,
  Handle,
  Position,
  MarkerType,
  ConnectionLineType,
  BaseEdge,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useRealtime } from './RealtimeProvider';
import * as Y from 'yjs';

interface ConceptNodeData {
  label: string;
  color?: string;
}

type ConceptNode = Node<ConceptNodeData>;

interface NodeActionContextValue {
  onChangeColor: (nodeId: string, color: string) => void;
  isReadOnly: boolean;
}

const NodeActionContext = createContext<NodeActionContextValue>({
  onChangeColor: () => {},
  isReadOnly: false,
});

const COLOR_OPTIONS = [
  '#0ea5e9',
  '#22c55e',
  '#eab308',
  '#f97316',
  '#ef4444',
  '#a855f7',
  '#6366f1',
  '#14b8a6',
];

function ConceptNodeComponent({ data, selected, id }: NodeProps<ConceptNodeData>) {
  const { onChangeColor, isReadOnly } = useContext(NodeActionContext);
  const baseBorder = data.color ?? '#3b82f6';
  const panelColor = data.color ? `${data.color}14` : undefined;

  return (
    <div className="relative">
      <NodeToolbar
        isVisible={selected && !isReadOnly}
        position={Position.Right}
        offset={8}
      >
        <div className="nodrag nopan flex items-center gap-1 rounded-full border border-gray-200 bg-white/95 px-2 py-1 shadow-md">
          {COLOR_OPTIONS.map((color) => (
            <button
              key={color}
              type="button"
              className={`h-6 w-6 rounded-full border ${
                data.color === color ? 'border-gray-900' : 'border-white/70'
              } shadow-sm`}
              style={{ backgroundColor: color }}
              onMouseDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                onChangeColor(id, color);
              }}
              aria-label={`Set color ${color}`}
            />
          ))}
        </div>
      </NodeToolbar>

      <div
        className={`relative rounded-lg border-2 bg-white px-3 py-2 shadow-lg max-w-xs cursor-grab active:cursor-grabbing touch-none select-none ${
          selected
            ? 'border-lime-400 ring-2 ring-lime-400/80 shadow-[0_0_14px_rgba(132,204,22,0.55)]'
            : ''
        }`}
        style={{
          borderColor: selected ? undefined : baseBorder,
          backgroundColor: panelColor,
        }}
      >
      {selected && (
        <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-semibold uppercase tracking-wide text-lime-500">
          Editing This
        </div>
      )}
      <Handle type="target" position={Position.Top} id="t-top" className="opacity-0" />
      <Handle type="target" position={Position.Bottom} id="t-bottom" className="opacity-0" />
      <Handle type="target" position={Position.Left} id="t-left" className="opacity-0" />
      <Handle type="target" position={Position.Right} id="t-right" className="opacity-0" />
      <Handle type="source" position={Position.Top} id="s-top" className="opacity-0" />
      <Handle type="source" position={Position.Bottom} id="s-bottom" className="opacity-0" />
      <Handle type="source" position={Position.Left} id="s-left" className="opacity-0" />
      <Handle type="source" position={Position.Right} id="s-right" className="opacity-0" />
      <div className="font-semibold text-gray-900 text-sm sm:text-base break-words pointer-events-none">{data.label}</div>
      </div>
    </div>
  );
}

const EDGE_STYLE = { stroke: '#111827', strokeWidth: 2 };
const EDGE_MARKER = { type: MarkerType.ArrowClosed, color: '#111827' };
const DEFAULT_NODE_SIZE = { width: 176, height: 56 };
const GRID_SIZE = 64;
const ROUTE_GRID_SIZE = 16;
const ROUTE_ALIGN_TOLERANCE = ROUTE_GRID_SIZE * 0.75;
const ROUTE_MIN = 96;
const ROUTE_MAX = 360;
const EDGE_OFFSET = 32;
const NODE_GAP = GRID_SIZE;
const AUTO_GAP = 24;
const AUTO_SHIFT = GRID_SIZE;
const AUTO_MAX_TRIES = 14;
const WORKSPACE_PADDING = 320;
const MIN_WORKSPACE_SIZE = { width: 1200, height: 800 };

function getNodeCenter(node: Node) {
  const width = node.width ?? DEFAULT_NODE_SIZE.width;
  const height = node.height ?? DEFAULT_NODE_SIZE.height;
  return {
    x: node.position.x + width / 2,
    y: node.position.y + height / 2,
  };
}

function getNodeSize(node: Node) {
  return {
    width: node.width ?? DEFAULT_NODE_SIZE.width,
    height: node.height ?? DEFAULT_NODE_SIZE.height,
  };
}

function getWorkspaceExtent(nodes: Node[]) {
  if (nodes.length === 0) {
    const halfWidth = MIN_WORKSPACE_SIZE.width / 2;
    const halfHeight = MIN_WORKSPACE_SIZE.height / 2;
    return [
      [-halfWidth, -halfHeight],
      [halfWidth, halfHeight],
    ] as [[number, number], [number, number]];
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  nodes.forEach((node) => {
    const width = node.width ?? DEFAULT_NODE_SIZE.width;
    const height = node.height ?? DEFAULT_NODE_SIZE.height;
    minX = Math.min(minX, node.position.x);
    minY = Math.min(minY, node.position.y);
    maxX = Math.max(maxX, node.position.x + width);
    maxY = Math.max(maxY, node.position.y + height);
  });

  const width = Math.max(maxX - minX, MIN_WORKSPACE_SIZE.width);
  const height = Math.max(maxY - minY, MIN_WORKSPACE_SIZE.height);
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  return [
    [centerX - width / 2 - WORKSPACE_PADDING, centerY - height / 2 - WORKSPACE_PADDING],
    [centerX + width / 2 + WORKSPACE_PADDING, centerY + height / 2 + WORKSPACE_PADDING],
  ] as [[number, number], [number, number]];
}

function snapToGridPosition(position: { x: number; y: number }) {
  return {
    x: Math.round(position.x / GRID_SIZE) * GRID_SIZE,
    y: Math.round(position.y / GRID_SIZE) * GRID_SIZE,
  };
}

function snapToRouteGrid(value: number) {
  return Math.round(value / ROUTE_GRID_SIZE) * ROUTE_GRID_SIZE;
}

function findOpenPosition(
  start: { x: number; y: number },
  nodes: Node[],
  step: { x: number; y: number }
) {
  let candidate = { ...start };
  const newWidth = DEFAULT_NODE_SIZE.width;
  const newHeight = DEFAULT_NODE_SIZE.height;

  for (let i = 0; i < AUTO_MAX_TRIES; i += 1) {
    const overlaps = nodes.some((node) => {
      const nodeWidth = node.width ?? DEFAULT_NODE_SIZE.width;
      const nodeHeight = node.height ?? DEFAULT_NODE_SIZE.height;
      return (
        candidate.x < node.position.x + nodeWidth + AUTO_GAP &&
        candidate.x + newWidth + AUTO_GAP > node.position.x &&
        candidate.y < node.position.y + nodeHeight + AUTO_GAP &&
        candidate.y + newHeight + AUTO_GAP > node.position.y
      );
    });

    if (!overlaps) {
      return candidate;
    }

    candidate = { x: candidate.x + step.x, y: candidate.y + step.y };
  }

  return candidate;
}

function HierarchyEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  style,
  data,
}: EdgeProps) {
  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);
  const alignedHorizontal = absDy <= ROUTE_ALIGN_TOLERANCE;
  const alignedVertical = absDx <= ROUTE_ALIGN_TOLERANCE;

  const [edgePath] = alignedHorizontal || alignedVertical
    ? getStraightPath({ sourceX, sourceY, targetX, targetY })
    : getSmoothStepPath({
        sourceX,
        sourceY,
        targetX,
        targetY,
        sourcePosition,
        targetPosition,
        borderRadius: 16,
        offset: EDGE_OFFSET,
        centerX: typeof data?.centerX === 'number' ? data.centerX : undefined,
        centerY: typeof data?.centerY === 'number' ? data.centerY : undefined,
      });

  return <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} style={style} />;
}

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

function buildEdgeFromMap(edgeId: string, edgeData: Y.Map<any>): Edge {
  return {
    id: edgeId,
    source: edgeData.get('source'),
    target: edgeData.get('target'),
    label: edgeData.get('label'),
    style: EDGE_STYLE,
    markerEnd: EDGE_MARKER,
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

function isSameEdge(a: Edge, b: Edge) {
  return (
    a.id === b.id &&
    a.source === b.source &&
    a.target === b.target &&
    a.label === b.label
  );
}

interface ConceptFlowProps {
  isReadOnly?: boolean;
}

export function ConceptFlow({ isReadOnly = false }: ConceptFlowProps) {
  const { doc, isConnected, updatePresence, remoteUsers, saveErrorCount } = useRealtime();
  const [nodes, setNodes, onNodesChange] = useNodesState([] as Node[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([] as Edge[]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [renameNodeId, setRenameNodeId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const nodeCountRef = useRef(0);
  const undoManagerRef = useRef<Y.UndoManager | null>(null);
  const reactFlowWrapperRef = useRef<HTMLDivElement | null>(null);
  const reactFlowInstanceRef = useRef<ReactFlowInstance | null>(null);

  const nodeTypes = useMemo(() => ({ conceptNode: ConceptNodeComponent }), []);
  const edgeTypes = useMemo(() => ({ hierarchy: HierarchyEdge }), []);
  const workspaceExtent = useMemo(() => getWorkspaceExtent(nodes), [nodes]);

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

  const routedEdges = useMemo(() => {
    if (edges.length === 0) return edges;

    const nodeMap = new Map(nodes.map((node) => [node.id, node]));
    const groups = new Map<
      string,
      {
        orientation: 'horizontal' | 'vertical';
        sign: 1 | -1;
        sourceCenter: { x: number; y: number };
        minAbsDelta: number;
        minGap: number;
      }
    >();

    const edgeMeta = edges.map((edge) => {
      const sourceNode = nodeMap.get(edge.source);
      const targetNode = nodeMap.get(edge.target);
      if (!sourceNode || !targetNode) {
        return { edge, horizontal: true, sign: 1 as 1 | -1 };
      }

      const sourceCenter = getNodeCenter(sourceNode);
      const targetCenter = getNodeCenter(targetNode);
      const sourceSize = getNodeSize(sourceNode);
      const targetSize = getNodeSize(targetNode);
      const dx = targetCenter.x - sourceCenter.x;
      const dy = targetCenter.y - sourceCenter.y;
      const normDx = Math.abs(dx) / Math.max(1, sourceSize.width + targetSize.width);
      const normDy = Math.abs(dy) / Math.max(1, sourceSize.height + targetSize.height);
      const horizontal = normDx >= normDy;
      const sign = (horizontal ? (dx >= 0 ? 1 : -1) : (dy >= 0 ? 1 : -1)) as 1 | -1;
      const absDelta = horizontal ? Math.abs(dx) : Math.abs(dy);
      const minGap = horizontal
        ? (sourceSize.width + targetSize.width) / 2 + NODE_GAP
        : (sourceSize.height + targetSize.height) / 2 + NODE_GAP;
      const key = `${edge.source}:${horizontal ? 'h' : 'v'}:${sign}`;

      const existing = groups.get(key);
      if (existing) {
        existing.minAbsDelta = Math.min(existing.minAbsDelta, absDelta);
        existing.minGap = Math.max(existing.minGap, minGap);
      } else {
        groups.set(key, {
          orientation: horizontal ? 'horizontal' : 'vertical',
          sign,
          sourceCenter,
          minAbsDelta: absDelta,
          minGap,
        });
      }

      return { edge, horizontal, sign };
    });

    const pivots = new Map<string, number>();
    const nodePadding = Math.max(DEFAULT_NODE_SIZE.width, DEFAULT_NODE_SIZE.height) * 0.5;
    groups.forEach((group, key) => {
      const base = group.orientation === 'horizontal' ? group.sourceCenter.x : group.sourceCenter.y;
      const rawDistance = group.minAbsDelta * 0.7 + nodePadding;
      const distance = Math.max(ROUTE_MIN, Math.min(ROUTE_MAX, Math.max(rawDistance, group.minGap)));
      const pivot = snapToRouteGrid(base + group.sign * distance);
      pivots.set(key, pivot);
    });

    return edgeMeta.map(({ edge, horizontal, sign }) => {
      const key = `${edge.source}:${horizontal ? 'h' : 'v'}:${sign}`;
      const pivot = pivots.get(key);
      const sourcePosition = horizontal
        ? sign >= 0
          ? Position.Right
          : Position.Left
        : sign >= 0
          ? Position.Bottom
          : Position.Top;
      const targetPosition = horizontal
        ? sign >= 0
          ? Position.Left
          : Position.Right
        : sign >= 0
          ? Position.Top
          : Position.Bottom;
      const sourceHandle = horizontal ? (sign >= 0 ? 's-right' : 's-left') : sign >= 0 ? 's-bottom' : 's-top';
      const targetHandle = horizontal ? (sign >= 0 ? 't-left' : 't-right') : sign >= 0 ? 't-top' : 't-bottom';

      return {
        ...edge,
        type: 'hierarchy',
        sourcePosition,
        targetPosition,
        sourceHandle,
        targetHandle,
        style: edge.style ?? EDGE_STYLE,
        markerEnd: edge.markerEnd ?? EDGE_MARKER,
        data: {
          ...edge.data,
          centerX: horizontal ? pivot : undefined,
          centerY: horizontal ? undefined : pivot,
        },
      };
    });
  }, [edges, nodes]);

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

  // Initialize from Yjs doc
  useEffect(() => {
    if (!doc) return;

    const nodesMap = doc.getMap<Y.Map<any>>('nodes');
    const edgesMap = doc.getMap<Y.Map<any>>('edges');

    // Load initial nodes
    const initialNodes: Node[] = [];
    nodesMap.forEach((nodeData, nodeId) => {
      if (nodeData instanceof Y.Map) {
        initialNodes.push(buildNodeFromMap(nodeId, nodeData));
      }
    });

    setNodes(initialNodes);
    nodeCountRef.current = initialNodes.length;

    // Load initial edges
    const initialEdges: Edge[] = [];
    edgesMap.forEach((edgeData, edgeId) => {
      if (edgeData instanceof Y.Map) {
        initialEdges.push(buildEdgeFromMap(edgeId, edgeData));
      }
    });

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

        return changed ? Array.from(nextMap.values()) : prev;
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

      // Update Yjs on position changes
      if (!doc) return;

      const nodesMap = doc.getMap('nodes') as Y.Map<Y.Map<any>>;

      doc.transact(() => {
        changes.forEach((change: any) => {
          if (change.type === 'position' && change.position) {
            const nodeData = nodesMap.get(change.id);
            if (nodeData && nodeData instanceof Y.Map) {
              nodeData.set('position', change.position);
            }
          }
        });
      }, 'local');
    },
    [isReadOnly, doc, onNodesChange]
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
        style: EDGE_STYLE,
        markerEnd: EDGE_MARKER,
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

    nodeCountRef.current++;
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
    baseChildPos = snapToGridPosition(baseChildPos);
    const childPos = findOpenPosition(baseChildPos, nodes, { x: 0, y: AUTO_SHIFT });

    const childNode: ConceptNode = {
      id: childId,
      type: 'conceptNode',
      data: { label: `Concept ${nodeCountRef.current + 1}` },
      position: childPos,
    };

    // Save node in Yjs
    const nodesMap = doc.getMap('nodes');
    const edgesMap = doc.getMap('edges');
    const edgeId = `edge-${Date.now()}`;
    doc.transact(() => {
      const nodeDataMap = new Y.Map();
      nodeDataMap.set('id', childId);
      nodeDataMap.set('label', childNode.data.label);
      nodeDataMap.set('position', childNode.position);
      nodesMap.set(childId, nodeDataMap);

      const edgeDataMap = new Y.Map();
      edgeDataMap.set('id', edgeId);
      edgeDataMap.set('source', selectedNodeId);
      edgeDataMap.set('target', childId);
      edgesMap.set(edgeId, edgeDataMap);
    }, 'local');

    nodeCountRef.current++;
    setNodes((nds) => [...nds, childNode]);
    setEdges((eds) => [
      ...eds,
      {
        id: edgeId,
        source: selectedNodeId!,
        target: childId,
        style: EDGE_STYLE,
        markerEnd: EDGE_MARKER,
      },
    ]);
  }, [isReadOnly, doc, selectedNodeId, nodes, setNodes, setEdges, handleAddNode, getViewportCenter]);

  const handleAddSibling = useCallback(() => {
    if (isReadOnly || !doc) return;
    if (!selectedNodeId) {
      handleAddNode();
      return;
    }

    const refNode = nodes.find((n) => n.id === selectedNodeId);
    const siblingId = `node-${Date.now()}`;
    const parentIdFromState = getParentIdFor(selectedNodeId);
    const parentNode = parentIdFromState
      ? nodes.find((n) => n.id === parentIdFromState)
      : undefined;
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
    baseSiblingPos = snapToGridPosition(baseSiblingPos);
    const siblingPos = findOpenPosition(baseSiblingPos, nodes, { x: 0, y: AUTO_SHIFT });

    const siblingNode: ConceptNode = {
      id: siblingId,
      type: 'conceptNode',
      data: { label: `Concept ${nodeCountRef.current + 1}` },
      position: siblingPos,
    };

    const nodesMap = doc.getMap('nodes');
    const edgesMap = doc.getMap('edges') as Y.Map<Y.Map<any>>;
    let parentId: string | null = parentIdFromState;

    if (!parentId) {
      // Find parent (incoming edge where target is selectedNodeId)
      edgesMap.forEach((edgeData) => {
        if (edgeData && edgeData instanceof Y.Map) {
          if (edgeData.get('target') === selectedNodeId) {
            parentId = edgeData.get('source');
          }
        }
      });
    }

    // Create edge: parent -> sibling (if parent exists), else selected -> sibling
    const sourceId = parentId || selectedNodeId;
    const edgeId = `edge-${Date.now()}`;
    doc.transact(() => {
      const nodeDataMap = new Y.Map();
      nodeDataMap.set('id', siblingId);
      nodeDataMap.set('label', siblingNode.data.label);
      nodeDataMap.set('position', siblingNode.position);
      nodesMap.set(siblingId, nodeDataMap);

      const edgeDataMap = new Y.Map();
      edgeDataMap.set('id', edgeId);
      edgeDataMap.set('source', sourceId);
      edgeDataMap.set('target', siblingId);
      edgesMap.set(edgeId, edgeDataMap);
    }, 'local');

    nodeCountRef.current++;
    setNodes((nds) => [...nds, siblingNode]);
    setEdges((eds) => [
      ...eds,
      {
        id: edgeId,
        source: sourceId,
        target: siblingId,
        style: EDGE_STYLE,
        markerEnd: EDGE_MARKER,
      },
    ]);
  }, [isReadOnly, doc, selectedNodeId, nodes, setNodes, setEdges, handleAddNode, getParentIdFor, getViewportCenter]);

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
    baseParentPos = snapToGridPosition(baseParentPos);
    const parentPos = findOpenPosition(baseParentPos, nodes, { x: 0, y: -AUTO_SHIFT });

    const parentNode: ConceptNode = {
      id: parentId,
      type: 'conceptNode',
      data: { label: `Concept ${nodeCountRef.current + 1}` },
      position: parentPos,
    };

    const nodesMap = doc.getMap('nodes');
    const edgesMap = doc.getMap('edges');
    const edgeId = `edge-${Date.now()}`;
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

    nodeCountRef.current++;
    setNodes((nds) => [...nds, parentNode]);
    setEdges((eds) => [
      ...eds,
      {
        id: edgeId,
        source: parentId,
        target: selectedNodeId!,
        style: EDGE_STYLE,
        markerEnd: EDGE_MARKER,
      },
    ]);
  }, [isReadOnly, doc, selectedNodeId, nodes, setNodes, setEdges, handleAddNode, getViewportCenter]);

  const handleDeleteNode = useCallback(() => {
    if (isReadOnly || !selectedNodeId || !doc) return;

    const nodesMap = doc.getMap('nodes');
    const edgesMap = doc.getMap('edges') as Y.Map<Y.Map<any>>;

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

    doc.transact(() => {
      nodesMap.delete(selectedNodeId);
      edgesToDelete.forEach((edgeId) => {
        edgesMap.delete(edgeId);
      });
    }, 'local');

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
    setShowInviteModal(true);
  }, []);

  const handleUndo = useCallback(() => {
    const undoManager = undoManagerRef.current;
    if (undoManager && undoManager.canUndo()) {
      undoManager.undo();
    }
  }, []);

  const handleRedo = useCallback(() => {
    const undoManager = undoManagerRef.current;
    if (undoManager && undoManager.canRedo()) {
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
        nodeData.set('label', renameText);
      }, 'local');
    }

    // Update local state
    setNodes((nds) =>
      nds.map((n) =>
        n.id === renameNodeId ? { ...n, data: { ...n.data, label: renameText } } : n
      )
    );

    setRenameNodeId(null);
    setRenameText('');
  }, [renameNodeId, doc, renameText, setNodes]);

  const handleRenameCancel = useCallback(() => {
    setRenameNodeId(null);
    setRenameText('');
  }, []);

  const handleSelectionChange = useCallback(
    (selection: { nodes?: Node[] }) => {
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

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      {!isReadOnly && (
        <>
          <div className="hidden sm:block border-b border-gray-200 bg-white">
            <div className="flex flex-wrap items-center gap-2 px-4 py-2">
              <button
                onClick={handleAddNode}
                className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 active:bg-blue-800"
              >
                + Add Concept
              </button>

              {selectedNodeId && (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleAddChild}
                    className="rounded bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 active:bg-indigo-800"
                  >
                    Add Child
                  </button>
                  <button
                    onClick={handleAddSibling}
                    className="rounded bg-indigo-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-indigo-600 active:bg-indigo-700"
                  >
                    Add Sibling
                  </button>
                  <button
                    onClick={handleAddParent}
                    className="rounded bg-indigo-400 px-3 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 active:bg-indigo-600"
                  >
                    Add Parent
                  </button>
                </div>
              )}

              {selectedNodeId && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleRenameStart}
                    className="rounded bg-yellow-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-yellow-700 active:bg-yellow-800"
                  >
                    Rename
                  </button>
                  <button
                    onClick={handleDeleteNode}
                    className="rounded bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 active:bg-red-800"
                  >
                    Delete
                  </button>
                </div>
              )}

              <div className="flex-1" />

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={handleUndo}
                  disabled={!canUndo}
                  className="rounded border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Undo
                </button>
                <button
                  onClick={handleRedo}
                  disabled={!canRedo}
                  className="rounded border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Redo
                </button>
                {remoteUsers.length > 0 && (
                  <div className="flex items-center gap-1 rounded bg-yellow-100 px-2 py-1 text-xs font-semibold text-yellow-800">
                    <span className="inline-block h-2 w-2 rounded-full bg-yellow-600 animate-pulse" />
                    {remoteUsers.length + 1} editing
                  </div>
                )}

                <button
                  onClick={handleInvite}
                  className="rounded border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100"
                >
                  Invite
                </button>

                {!isConnected && (
                  <div className="flex items-center gap-2 text-sm text-red-600">
                    <div className="h-2 w-2 rounded-full bg-red-500" />
                    Offline
                  </div>
                )}

                {saveErrorCount > 0 && (
                  <div className="text-xs font-medium text-orange-600">
                    {saveErrorCount > 0
                      ? `Warning: ${saveErrorCount} save${saveErrorCount > 1 ? 's' : ''} syncing`
                      : ''}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Mobile toolbar fixed bottom */}
          <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white px-2 py-2">
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                onClick={handleAddNode}
                className="flex-1 min-w-[72px] rounded-full bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition active:bg-blue-700"
              >
                Add
              </button>
              {selectedNodeId && (
                <button
                  onClick={handleAddChild}
                  className="flex-1 min-w-[72px] rounded-full bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition active:bg-indigo-700"
                >
                  Child
                </button>
              )}
              {selectedNodeId && (
                <button
                  onClick={handleAddSibling}
                  className="flex-1 min-w-[72px] rounded-full bg-indigo-500 px-3 py-2 text-sm font-semibold text-white transition active:bg-indigo-600"
                >
                  Sibling
                </button>
              )}
              {selectedNodeId && (
                <button
                  onClick={handleAddParent}
                  className="flex-1 min-w-[72px] rounded-full bg-indigo-400 px-3 py-2 text-sm font-semibold text-white transition active:bg-indigo-500"
                >
                  Parent
                </button>
              )}
              <button
                onClick={handleUndo}
                disabled={!canUndo}
                className="flex-1 min-w-[72px] rounded-full border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition disabled:cursor-not-allowed disabled:opacity-50"
              >
                Undo
              </button>
              <button
                onClick={handleRedo}
                disabled={!canRedo}
                className="flex-1 min-w-[72px] rounded-full border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition disabled:cursor-not-allowed disabled:opacity-50"
              >
                Redo
              </button>
              {selectedNodeId && (
                <button
                  onClick={handleRenameStart}
                  className="flex-1 min-w-[72px] rounded-full bg-yellow-600 px-3 py-2 text-sm font-semibold text-white transition active:bg-yellow-700"
                >
                  Rename
                </button>
              )}
              {selectedNodeId && (
                <button
                  onClick={handleDeleteNode}
                  className="flex-1 min-w-[72px] rounded-full bg-red-600 px-3 py-2 text-sm font-semibold text-white transition active:bg-red-700"
                >
                  Delete
                </button>
              )}
              <button
                onClick={handleInvite}
                className="flex-1 min-w-[72px] rounded-full bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-800 transition active:bg-gray-200"
              >
                Invite
              </button>
              {remoteUsers.length > 0 && (
                <div className="flex min-w-[72px] flex-1 items-center justify-center rounded-full bg-yellow-100 px-3 py-2 text-sm font-semibold text-yellow-800">
                  {remoteUsers.length + 1} online
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Flow Canvas */}
      <div ref={reactFlowWrapperRef} className="flex-1 pb-24 sm:pb-0">
        <NodeActionContext.Provider value={{ onChangeColor: handleChangeColor, isReadOnly }}>
          <ReactFlow
            nodes={nodes}
            edges={routedEdges}
            onInit={(instance) => {
              reactFlowInstanceRef.current = instance;
            }}
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
            onConnect={handleConnect}
            onSelectionChange={handleSelectionChange}
            onPaneClick={() => {
              setSelectedNodeId((prev) => {
                if (!prev) {
                  return prev;
                }
                updatePresence({ currentNodeId: undefined });
                return null;
              });
            }}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            translateExtent={workspaceExtent}
            snapToGrid
            snapGrid={[GRID_SIZE, GRID_SIZE]}
            attributionPosition="bottom-left"
            connectionLineType={ConnectionLineType.SmoothStep}
            selectionOnDrag={false}
            panOnDrag
            panOnScroll
            zoomOnPinch
            onlyRenderVisibleElements
            defaultEdgeOptions={{
              type: 'hierarchy',
              style: EDGE_STYLE,
              markerEnd: EDGE_MARKER,
            }}
          >
            <Background gap={ROUTE_GRID_SIZE} size={0.5} color="#f1f5f9" variant="lines" />
            <Background gap={GRID_SIZE} size={1} color="#e2e8f0" variant="lines" />
            <Controls />
            <div className="hidden sm:block">
              <MiniMap />
            </div>
          </ReactFlow>
        </NodeActionContext.Provider>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
            <h2 className="mb-4 text-xl font-bold">Share map</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Map link</label>
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

      {/* Rename Modal */}
      {renameNodeId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
            <h2 className="mb-4 text-xl font-bold">Rename Node</h2>
            <input
              type="text"
              value={renameText}
              onChange={(e) => setRenameText(e.target.value)}
              placeholder="Enter new name"
              className="mb-4 w-full rounded border border-gray-300 px-3 py-2"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleRenameSave();
                } else if (e.key === 'Escape') {
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

