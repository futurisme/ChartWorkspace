'use client';

import React, { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  Background,
  BackgroundVariant,
  type Connection,
  ConnectionLineType,
  Controls,
  MiniMap,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type OnMove,
  type OnSelectionChangeParams,
  ReactFlow,
  type ReactFlowInstance,
  type XYPosition,
  addEdge,
  useEdgesState,
  useNodesState,
} from 'reactflow';
import 'reactflow/dist/style.css';
import * as Y from 'yjs';
import { useRealtime } from '@/components/RealtimeProvider';
import { applyYjsSnapshot, getCurrentSnapshot } from '@/features/maps/shared/map-snapshot';
import { decodeFadhilArchive, encodeFadhilArchive } from '@/features/maps/shared/fadhil-archive';
import {
  EDGE_STYLE,
  COLOR_OPTIONS,
  AUTO_SHIFT,
  DEFAULT_NODE_SIZE,
  GRID_SIZE,
  NODE_GAP,
  ROUTE_GRID_SIZE,
  UNBOUNDED_TRANSLATE_EXTENT,
} from './flow-constants';
import { FlowEdgeHierarchy } from './flow-edge-hierarchy';
import {
  applyRoutedEdgeGeometry,
  buildAdaptiveRoutedEdges,
  buildRoutingCacheKey,
  toCompactRouteEdges,
  toCompactRouteNodes,
  type CompactRouteEdge,
  type CompactRouteNode,
  type RoutedEdgeGeometry,
} from './flow-edge-routing';
import { FlowNodeCard, NodeActionContext } from './flow-node-card';
import {
  findOpenPosition,
  snapToGridPosition,
  getNodeSize,
} from './flow-node-placement';
import { FlowToolbarMobile } from './flow-toolbar-mobile';
import type {
  ConceptNode,
  ConceptNodeData,
  NodeActionContextValue,
  PersistedEdgeRecord,
  PersistedNodeRecord,
} from './flow-types';

type YRecordMap = Y.Map<unknown>;
type YNodeStore = Y.Map<YRecordMap>;
type YEdgeStore = Y.Map<YRecordMap>;

const GRADIENT_COLOR_OPTIONS = [
  'linear-gradient(135deg, #06b6d4 0%, #8b5cf6 100%)',
  'linear-gradient(135deg, #ec4899 0%, #f97316 100%)',
  'linear-gradient(135deg, #84cc16 0%, #14b8a6 100%)',
  'linear-gradient(135deg, #3b82f6 0%, #22c55e 100%)',
  'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
  'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)',
  'linear-gradient(135deg, #0ea5e9 0%, #10b981 100%)',
  'linear-gradient(135deg, #fb7185 0%, #f43f5e 100%)',
  'linear-gradient(135deg, #14b8a6 0%, #0ea5e9 100%)',
  'linear-gradient(135deg, #a855f7 0%, #3b82f6 100%)',
  'linear-gradient(135deg, #22c55e 0%, #84cc16 100%)',
  'linear-gradient(135deg, #64748b 0%, #0f172a 100%)',
  'linear-gradient(135deg, #f97316 0%, #eab308 100%)',
  'linear-gradient(135deg, #06b6d4 0%, #22c55e 100%)',
  'linear-gradient(135deg, #8b5cf6 0%, #ef4444 100%)',
  'linear-gradient(135deg, #f43f5e 0%, #f59e0b 100%)',
  'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)',
  'linear-gradient(135deg, #10b981 0%, #3b82f6 100%)',
];


const COMPACT_COLOR_OPTIONS = [
  ...GRADIENT_COLOR_OPTIONS.map((color) => ({
    key: `gradient-${color}`,
    color,
    style: { backgroundImage: color } as const,
    ariaLabel: `Set gradient color ${color}`,
  })),
  ...COLOR_OPTIONS.map((color) => ({
    key: color,
    color,
    style: { backgroundColor: color } as const,
    ariaLabel: `Set primary color ${color}`,
  })),
];

const FlowToolbarDesktop = dynamic(
  () => import('./flow-toolbar-desktop').then((module) => module.FlowToolbarDesktop),
  {
    ssr: false,
    loading: () => null,
  }
);

interface PositionUpdate {
  id: string;
  position: XYPosition;
}

interface WorkerRouteResult {
  type: 'route-result';
  hash: string;
  edges: RoutedEdgeGeometry[];
}

interface RefreshAlertBroadcast {
  id: string;
  reason: string;
  mandatory: boolean;
}

type NodeVariant = 'default' | 'descript';

interface WorkspaceArchiveFile {
  magic: string;
  version: number;
  exportedAt: string;
  sourceMapId: string;
  snapshot: string;
  viewport?: {
    x: number;
    y: number;
    zoom: number;
  };
}

const FRAME_BUDGET_MS = 16.7;
const PRESENCE_MOVE_CADENCE_MS = 120;
const NODE_DRAG_HANDLE_SELECTOR = '.flow-node-drag-handle';
const WORKSPACE_ARCHIVE_MAGIC = 'chartworkspace/archive';
const WORKSPACE_ARCHIVE_VERSION = 1;
const DENSE_GRAPH_NODE_THRESHOLD = 180;
const MINIMAP_MAX_NODE_THRESHOLD = 220;
const EDGE_SIMPLIFICATION_NODE_THRESHOLD = 260;
const EDGE_SIMPLIFICATION_EDGE_THRESHOLD = 900;
const EDGE_SIMPLIFICATION_ZOOM_THRESHOLD = 0.78;
const FLOW_TELEMETRY_ENABLED = process.env.NEXT_PUBLIC_DEBUG_FLOW_TELEMETRY === '1';
const MOBILE_MIN_ZOOM = 0.7;
const MOBILE_SNAP_ZOOM_THRESHOLD = 0.85;

type SchedulerWithPostTask = {
  postTask?: (callback: () => void, options?: { priority?: 'background' | 'user-visible' | 'user-blocking'; delay?: number }) => Promise<void>;
};

function scheduleNonUrgentWork(callback: () => void) {
  if (typeof window === 'undefined') {
    callback();
    return;
  }

  const schedulerApi = (globalThis as { scheduler?: SchedulerWithPostTask }).scheduler;
  if (schedulerApi?.postTask) {
    void schedulerApi.postTask(callback, { priority: 'background' });
    return;
  }

  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(callback, { timeout: 120 });
    return;
  }

  window.setTimeout(callback, 0);
}

type NodeAddOrResetChange = Extract<NodeChange, { type: 'add' | 'reset'; item: Node<ConceptNodeData> }>;
type NodeRemoveChange = Extract<NodeChange, { type: 'remove' }>;
type EdgeAddOrResetChange = Extract<EdgeChange, { type: 'add' | 'reset'; item: Edge }>;
type EdgeRemoveChange = Extract<EdgeChange, { type: 'remove' }>;

function readString(data: YRecordMap, key: string) {
  const value = data.get(key);
  return typeof value === 'string' ? value : undefined;
}


function readNodeVariant(data: YRecordMap, key: string): NodeVariant {
  const value = data.get(key);
  return value === 'descript' ? 'descript' : 'default';
}

function readBoolean(data: YRecordMap, key: string): boolean | undefined {
  const value = data.get(key);
  return typeof value === 'boolean' ? value : undefined;
}

function readPosition(data: YRecordMap, key: string): XYPosition | null {
  const value = data.get(key);
  if (!value || typeof value !== 'object') {
    return null;
  }

  const next = value as { x?: unknown; y?: unknown };
  if (typeof next.x !== 'number' || typeof next.y !== 'number') {
    return null;
  }

  return { x: next.x, y: next.y };
}

function toPersistedNodeRecord(nodeId: string, nodeData: YRecordMap): PersistedNodeRecord {
  return {
    id: nodeId,
    label: readString(nodeData, 'label') ?? 'Node',
    position: readPosition(nodeData, 'position') ?? { x: 0, y: 0 },
    color: readString(nodeData, 'color'),
    description: readString(nodeData, 'description'),
    variant: readNodeVariant(nodeData, 'variant'),
    descriptionExpanded: readBoolean(nodeData, 'descriptionExpanded') ?? false,
  };
}

function toPersistedEdgeRecord(edgeId: string, edgeData: YRecordMap): PersistedEdgeRecord | null {
  const source = readString(edgeData, 'source');
  const target = readString(edgeData, 'target');
  if (!source || !target) {
    return null;
  }

  return {
    id: edgeId,
    source,
    target,
    label: readString(edgeData, 'label'),
  };
}

function buildNodeFromMap(nodeId: string, nodeData: YRecordMap): Node<ConceptNodeData> {
  const persisted = toPersistedNodeRecord(nodeId, nodeData);
  return {
    id: persisted.id,
    type: 'conceptNode',
    dragHandle: NODE_DRAG_HANDLE_SELECTOR,
    data: {
      label: persisted.label,
      color: persisted.color,
      description: persisted.description,
      variant: persisted.variant,
      descriptionExpanded: persisted.descriptionExpanded,
    },
    position: persisted.position,
  };
}

function buildEdgeFromMap(edgeId: string, edgeData: YRecordMap): Edge {
  const persisted = toPersistedEdgeRecord(edgeId, edgeData);
  if (!persisted) {
    return {
      id: edgeId,
      source: '',
      target: '',
      style: EDGE_STYLE,
    };
  }

  return {
    id: persisted.id,
    source: persisted.source,
    target: persisted.target,
    label: persisted.label,
    style: EDGE_STYLE,
  };
}

function upsertNodeRecord(nodesMap: YNodeStore, node: Node<ConceptNodeData>) {
  let nodeData = nodesMap.get(node.id);
  if (!nodeData) {
    nodeData = new Y.Map<unknown>() as YRecordMap;
    nodesMap.set(node.id, nodeData);
  }

  nodeData.set('id', node.id);
  nodeData.set('label', node.data?.label ?? 'Node');
  nodeData.set('position', node.position);
  if (node.data?.color) {
    nodeData.set('color', node.data.color);
  } else {
    nodeData.delete('color');
  }

  const variant = node.data?.variant === 'descript' ? 'descript' : 'default';
  nodeData.set('variant', variant);

  if (node.data?.description?.trim()) {
    nodeData.set('description', node.data.description.trim());
  } else {
    nodeData.delete('description');
  }

  if (node.data?.descriptionExpanded) {
    nodeData.set('descriptionExpanded', true);
  } else {
    nodeData.delete('descriptionExpanded');
  }
}

function upsertEdgeRecord(edgesMap: YEdgeStore, edge: Edge) {
  if (!edge.source || !edge.target) {
    return;
  }

  let edgeData = edgesMap.get(edge.id);
  if (!edgeData) {
    edgeData = new Y.Map<unknown>() as YRecordMap;
    edgesMap.set(edge.id, edgeData);
  }

  edgeData.set('id', edge.id);
  edgeData.set('source', edge.source);
  edgeData.set('target', edge.target);
  if (typeof edge.label === 'string') {
    edgeData.set('label', edge.label);
  } else {
    edgeData.delete('label');
  }
}

function getNodeLabel(node: Node): string {
  const data = node.data as ConceptNodeData | undefined;
  return data?.label ?? 'Node';
}

function isSameNode(a: Node, b: Node) {
  const aData = a.data as ConceptNodeData | undefined;
  const bData = b.data as ConceptNodeData | undefined;

  return (
    a.id === b.id &&
    a.position.x === b.position.x &&
    a.position.y === b.position.y &&
    (aData?.label ?? '') === (bData?.label ?? '') &&
    (aData?.color ?? '') === (bData?.color ?? '') &&
    (aData?.description ?? '') === (bData?.description ?? '') &&
    (aData?.variant ?? 'default') === (bData?.variant ?? 'default') &&
    Boolean(aData?.descriptionExpanded) === Boolean(bData?.descriptionExpanded)
  );
}

function isSameEdge(a: Edge, b: Edge) {
  return a.id === b.id && a.source === b.source && a.target === b.target && a.label === b.label;
}

type PositionNodeChange = Extract<NodeChange, { type: 'position'; position?: XYPosition }>;

function isPositionChange(change: NodeChange): change is PositionNodeChange {
  return change.type === 'position' && Boolean((change as { position?: XYPosition }).position);
}

function shouldPersistPositionChange(_change: PositionNodeChange) {
  return true;
}

function isNodeAddOrResetChange(change: NodeChange): change is NodeAddOrResetChange {
  return change.type === 'add' || change.type === 'reset';
}

function isNodeRemoveChange(change: NodeChange): change is NodeRemoveChange {
  return change.type === 'remove';
}

function isEdgeAddOrResetChange(change: EdgeChange): change is EdgeAddOrResetChange {
  return change.type === 'add' || change.type === 'reset';
}

function isEdgeRemoveChange(change: EdgeChange): change is EdgeRemoveChange {
  return change.type === 'remove';
}

function buildSimplifiedEdges(edges: Edge[], selectedNodeId: string | null): Edge[] {
  return edges.map((edge) => {
    const connectedToSelected = selectedNodeId ? edge.source === selectedNodeId || edge.target === selectedNodeId : false;

    return {
      ...edge,
      type: 'default',
      label: undefined,
      style: {
        ...EDGE_STYLE,
        strokeWidth: connectedToSelected ? 2 : 1,
        strokeOpacity: connectedToSelected ? 0.95 : 0.52,
      },
    };
  });
}

interface FlowWorkspaceProps {
  isReadOnly?: boolean;
  showDesktopControlsPanel?: boolean;
  showDesktopStatusPanel?: boolean;
  showMobileToolsPanel?: boolean;
  onSelectNode?: (nodeId: string | null) => void;
  snapEnabled?: boolean;
  inviteRequestToken?: number;
}

export function FlowWorkspace({
  isReadOnly = false,
  showDesktopControlsPanel = true,
  showDesktopStatusPanel = true,
  showMobileToolsPanel = false,
  onSelectNode,
  snapEnabled = true,
  inviteRequestToken = 0,
}: FlowWorkspaceProps) {
  const { doc, mapId, isConnected, isDatabaseConnected, updatePresence, remoteUsers, saveErrorCount, saveSnapshot } = useRealtime();
  const [nodes, setNodes, onNodesChange] = useNodesState<ConceptNodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [renameNodeId, setRenameNodeId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [connectSourceNodeId, setConnectSourceNodeId] = useState<string | null>(null);
  const [unconnectSourceNodeId, setUnconnectSourceNodeId] = useState<string | null>(null);
  const [isRefreshingPage, setIsRefreshingPage] = useState(false);
  const [refreshAlertBroadcast, setRefreshAlertBroadcast] = useState<RefreshAlertBroadcast | null>(null);
  const [viewportZoom, setViewportZoom] = useState(1);

  const nodeCountRef = useRef(0);
  const undoManagerRef = useRef<Y.UndoManager | null>(null);
  const reactFlowWrapperRef = useRef<HTMLDivElement | null>(null);
  const reactFlowInstanceRef = useRef<ReactFlowInstance | null>(null);
  const persistedPositionsRef = useRef<Map<string, XYPosition>>(new Map());
  const importFileInputRef = useRef<HTMLInputElement | null>(null);

  const nodeTypes = useMemo(() => ({ conceptNode: FlowNodeCard }), []);
  const edgeTypes = useMemo(() => ({ hierarchy: FlowEdgeHierarchy }), []);
  const deferredNodes = useDeferredValue(nodes);
  const deferredEdges = useDeferredValue(edges);
  const [routedEdges, setRoutedEdges] = useState<Edge[]>(() => buildAdaptiveRoutedEdges(deferredEdges, deferredNodes));
  const routingWorkerRef = useRef<Worker | null>(null);
  const routingWorkerFailedRef = useRef(false);
  const latestRouteHashRef = useRef<string | null>(null);
  const latestDeferredEdgesRef = useRef<Edge[]>(deferredEdges);
  const isDenseGraph = nodes.length >= DENSE_GRAPH_NODE_THRESHOLD;
  const shouldSimplifyEdges =
    nodes.length >= EDGE_SIMPLIFICATION_NODE_THRESHOLD
    && edges.length >= EDGE_SIMPLIFICATION_EDGE_THRESHOLD
    && viewportZoom < EDGE_SIMPLIFICATION_ZOOM_THRESHOLD;
  const renderedEdges = useMemo(
    () => (shouldSimplifyEdges ? buildSimplifiedEdges(routedEdges, selectedNodeId) : routedEdges),
    [routedEdges, selectedNodeId, shouldSimplifyEdges]
  );
  const shouldRenderMiniMap = !isMobileViewport && nodes.length <= MINIMAP_MAX_NODE_THRESHOLD;
  const effectiveSnapToGrid = snapEnabled && (!isMobileViewport || viewportZoom >= MOBILE_SNAP_ZOOM_THRESHOLD);
  const telemetryRef = useRef<Record<string, { samples: number; totalDurationMs: number; droppedFrames: number; maxDurationMs: number }>>({});
  const lastMovePresenceUpdateRef = useRef(0);
  const pendingMovePresenceRef = useRef<{
    cursorX: number;
    cursorY: number;
    cameraX: number;
    cameraY: number;
  } | null>(null);
  const movePresenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingDragPresenceRef = useRef<{ nodeId: string; cursorX: number; cursorY: number } | null>(null);
  const dragPresenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastDragPresenceUpdateRef = useRef(0);

  const getParentIdFor = useCallback(
    (childId: string) => edges.find((edge) => edge.target === childId)?.source ?? null,
    [edges]
  );

  const selectedNode = useMemo(
    () => (selectedNodeId ? nodes.find((node) => node.id === selectedNodeId) ?? null : null),
    [nodes, selectedNodeId]
  );

  const selectedParentId = useMemo(
    () => (selectedNodeId ? getParentIdFor(selectedNodeId) : null),
    [selectedNodeId, getParentIdFor]
  );

  const selectedChildCount = useMemo(() => {
    if (!selectedNodeId) {
      return 0;
    }
    return edges.filter((edge) => edge.source === selectedNodeId).length;
  }, [edges, selectedNodeId]);

  const selectedPosition = selectedNode
    ? { x: Math.round(selectedNode.position.x), y: Math.round(selectedNode.position.y) }
    : null;
  const selectedNodeLabel = selectedNode ? getNodeLabel(selectedNode) : null;
  const selectedNodeData = selectedNode?.data as ConceptNodeData | undefined;
  const selectedNodeColor = selectedNodeData?.color ?? COLOR_OPTIONS[0];
  const selectedNodeVariant = selectedNodeData?.variant === 'descript' ? 'descript' : 'default';
  const selectedNodeDescription = selectedNodeData?.description ?? '';


  const remoteEditorsByNode = useMemo(() => {
    const map = new Map<string, string[]>();
    remoteUsers.forEach((user) => {
      if (!user.currentNodeId) return;
      const names = map.get(user.currentNodeId) ?? [];
      names.push(user.displayName);
      map.set(user.currentNodeId, names);
    });
    return map;
  }, [remoteUsers]);

  const nodesWithPresence = useMemo(() => {
    if (remoteEditorsByNode.size === 0) {
      const hasPresenceDecorations = nodes.some((node) => Boolean(node.data.editedByOthers) || (node.data.collaboratorNames?.length ?? 0) > 0);
      if (!hasPresenceDecorations) {
        return nodes;
      }
    }

    return nodes.map((node) => {
      const collaboratorNames = remoteEditorsByNode.get(node.id) ?? [];
      const hasCollaborators = collaboratorNames.length > 0;
      const previousNames = node.data.collaboratorNames ?? [];
      const hasSameCollaborators =
        previousNames.length === collaboratorNames.length &&
        previousNames.every((name, index) => name === collaboratorNames[index]);

      if (!hasCollaborators && !node.data.editedByOthers && previousNames.length === 0) {
        return node;
      }

      if (hasCollaborators && node.data.editedByOthers && hasSameCollaborators) {
        return node;
      }

      return {
        ...node,
        data: {
          ...node.data,
          collaboratorNames,
          editedByOthers: hasCollaborators,
        },
      };
    });
  }, [nodes, remoteEditorsByNode]);

  useEffect(() => {
    latestDeferredEdgesRef.current = deferredEdges;
  }, [deferredEdges]);

  const trackTelemetry = useCallback((handler: string, durationMs: number) => {
    if (!FLOW_TELEMETRY_ENABLED) {
      return;
    }

    const droppedFrames = Math.max(0, Math.floor(durationMs / FRAME_BUDGET_MS) - 1);
    const current = telemetryRef.current[handler] ?? {
      samples: 0,
      totalDurationMs: 0,
      droppedFrames: 0,
      maxDurationMs: 0,
    };

    const next = {
      samples: current.samples + 1,
      totalDurationMs: current.totalDurationMs + durationMs,
      droppedFrames: current.droppedFrames + droppedFrames,
      maxDurationMs: Math.max(current.maxDurationMs, durationMs),
    };

    telemetryRef.current[handler] = next;

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('flow:telemetry', {
        detail: {
          handler,
          durationMs,
          droppedFrames,
          averageDurationMs: next.totalDurationMs / next.samples,
          samples: next.samples,
        },
      }));
    }
  }, []);

  const profileHandler = useCallback(<T,>(handler: string, callback: () => T): T => {
    const start = performance.now();
    const result = callback();
    trackTelemetry(handler, performance.now() - start);
    return result;
  }, [trackTelemetry]);

  const flushMovePresence = useCallback(() => {
    const pending = pendingMovePresenceRef.current;
    if (!pending) {
      return;
    }

    pendingMovePresenceRef.current = null;
    lastMovePresenceUpdateRef.current = Date.now();
    profileHandler('presence.update.move', () => updatePresence(pending));
  }, [profileHandler, updatePresence]);

  const scheduleMovePresenceFlush = useCallback((cameraX: number, cameraY: number) => {
    pendingMovePresenceRef.current = {
      cursorX: cameraX,
      cursorY: cameraY,
      cameraX,
      cameraY,
    };

    const now = Date.now();
    const elapsed = now - lastMovePresenceUpdateRef.current;
    if (elapsed >= PRESENCE_MOVE_CADENCE_MS) {
      flushMovePresence();
      return;
    }

    if (movePresenceTimerRef.current) {
      return;
    }

    movePresenceTimerRef.current = setTimeout(() => {
      movePresenceTimerRef.current = null;
      flushMovePresence();
    }, PRESENCE_MOVE_CADENCE_MS - elapsed);
  }, [flushMovePresence]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof Worker === 'undefined') {
      return;
    }

    try {
      const worker = new Worker(new URL('./workers/edge-routing.worker.ts', import.meta.url), { type: 'module' });
      routingWorkerRef.current = worker;

      worker.onmessage = ({ data }: MessageEvent<WorkerRouteResult>) => {
        if (data.type !== 'route-result' || latestRouteHashRef.current !== data.hash) {
          return;
        }

        setRoutedEdges(applyRoutedEdgeGeometry(latestDeferredEdgesRef.current, data.edges));
      };

      worker.onerror = () => {
        routingWorkerFailedRef.current = true;
        routingWorkerRef.current = null;
      };

      return () => {
        worker.terminate();
        routingWorkerRef.current = null;
      };
    } catch {
      routingWorkerFailedRef.current = true;
    }
  }, []);

  useEffect(() => {
    if (shouldSimplifyEdges) {
      setRoutedEdges(buildSimplifiedEdges(deferredEdges, selectedNodeId));
      return;
    }

    const compactNodes: CompactRouteNode[] = toCompactRouteNodes(deferredNodes);
    const compactEdges: CompactRouteEdge[] = toCompactRouteEdges(deferredEdges);
    const hash = buildRoutingCacheKey(compactEdges, compactNodes);
    latestRouteHashRef.current = hash;

    const worker = routingWorkerRef.current;
    if (!worker || routingWorkerFailedRef.current) {
      setRoutedEdges(buildAdaptiveRoutedEdges(deferredEdges, deferredNodes));
      return;
    }

    let idleCallbackId: number | null = null;
    let debounceTimer: ReturnType<typeof setTimeout> | null = setTimeout(() => {
      const post = () => {
        worker.postMessage({ type: 'route', hash, nodes: compactNodes, edges: compactEdges });
      };

      if (typeof window.requestIdleCallback === 'function') {
        idleCallbackId = window.requestIdleCallback(post, { timeout: 80 });
        return;
      }

      post();
    }, 24);

    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
      }

      if (idleCallbackId !== null && typeof window.cancelIdleCallback === 'function') {
        window.cancelIdleCallback(idleCallbackId);
      }
    };
  }, [deferredEdges, deferredNodes, selectedNodeId, shouldSimplifyEdges]);


  const persistNodePositions = useCallback(
    (updates: PositionUpdate[]) => {
      if (!doc || updates.length === 0) {
        return;
      }

      const deduped = new Map<string, XYPosition>();
      updates.forEach((update) => {
        deduped.set(update.id, update.position);
      });

      const effectiveUpdates = Array.from(deduped.entries())
        .filter(([id, position]) => {
          const previous = persistedPositionsRef.current.get(id);
          return !previous || previous.x !== position.x || previous.y !== position.y;
        })
        .map(([id, position]) => ({ id, position }));

      if (effectiveUpdates.length === 0) {
        return;
      }

      const nodesMap = doc.getMap<YRecordMap>('nodes') as YNodeStore;
      doc.transact(() => {
        effectiveUpdates.forEach((update) => {
          let nodeData = nodesMap.get(update.id);
          if (!nodeData) {
            nodeData = new Y.Map<unknown>() as YRecordMap;
            nodeData.set('id', update.id);
            nodeData.set('label', 'Node');
            nodesMap.set(update.id, nodeData);
          }
          nodeData.set('position', update.position);
        });
      }, 'local');

      effectiveUpdates.forEach((update) => {
        persistedPositionsRef.current.set(update.id, update.position);
      });
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
      if (isReadOnly || !doc) {
        return;
      }

      const nodesMap = doc.getMap<YRecordMap>('nodes') as YNodeStore;
      const nodeData = nodesMap.get(nodeId);
      if (nodeData) {
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

  const handleChangeNodeVariant = useCallback(
    (nodeId: string, variant: NodeVariant) => {
      if (isReadOnly || !doc) {
        return;
      }

      const nodesMap = doc.getMap<YRecordMap>('nodes') as YNodeStore;
      const nodeData = nodesMap.get(nodeId);
      if (nodeData) {
        doc.transact(() => {
          nodeData.set('variant', variant);
          if (variant === 'default') {
            nodeData.delete('descriptionExpanded');
          }
        }, 'local');
      }

      setNodes((prev) =>
        prev.map((node) =>
          node.id === nodeId
            ? { ...node, data: { ...node.data, variant, descriptionExpanded: variant === 'descript' ? node.data.descriptionExpanded : false } }
            : node
        )
      );
    },
    [doc, isReadOnly, setNodes]
  );

  const handleChangeNodeDescription = useCallback(
    (nodeId: string, description: string) => {
      if (isReadOnly || !doc) {
        return;
      }

      const nodesMap = doc.getMap<YRecordMap>('nodes') as YNodeStore;
      const nodeData = nodesMap.get(nodeId);
      if (nodeData) {
        doc.transact(() => {
          const normalizedDescription = description.trim();
          if (normalizedDescription) {
            nodeData.set('description', normalizedDescription);
          } else {
            nodeData.delete('description');
            nodeData.delete('descriptionExpanded');
          }
        }, 'local');
      }

      setNodes((prev) =>
        prev.map((node) =>
          node.id === nodeId
            ? {
                ...node,
                data: {
                  ...node.data,
                  description,
                  descriptionExpanded: description.trim() ? node.data.descriptionExpanded : false,
                },
              }
            : node
        )
      );
    },
    [doc, isReadOnly, setNodes]
  );

  const handleToggleDescriptionPanel = useCallback(
    (nodeId: string) => {
      if (isReadOnly || !doc) {
        return;
      }

      const nodesMap = doc.getMap<YRecordMap>('nodes') as YNodeStore;
      const nodeData = nodesMap.get(nodeId);
      if (!nodeData) {
        return;
      }

      const variant = readNodeVariant(nodeData, 'variant');
      const description = readString(nodeData, 'description')?.trim() ?? '';
      if (variant !== 'descript' || description.length === 0) {
        return;
      }

      const nextExpanded = !(readBoolean(nodeData, 'descriptionExpanded') ?? false);
      doc.transact(() => {
        if (nextExpanded) {
          nodeData.set('descriptionExpanded', true);
        } else {
          nodeData.delete('descriptionExpanded');
        }
      }, 'local');

      setNodes((prev) =>
        prev.map((node) => {
          if (node.id !== nodeId) {
            return node;
          }

          const normalizedDescription = node.data.description?.trim() ?? '';
          if ((node.data.variant ?? 'default') !== 'descript' || normalizedDescription.length === 0) {
            return { ...node, data: { ...node.data, descriptionExpanded: false } };
          }

          return { ...node, data: { ...node.data, descriptionExpanded: nextExpanded } };
        })
      );
    },
    [doc, isReadOnly, setNodes]
  );

  const flushDragPresence = useCallback(() => {
    const pending = pendingDragPresenceRef.current;
    if (!pending) {
      return;
    }

    pendingDragPresenceRef.current = null;
    profileHandler('presence.update.drag', () => {
      updatePresence({
        currentNodeId: pending.nodeId,
        cursorX: pending.cursorX,
        cursorY: pending.cursorY,
      });
    });
  }, [profileHandler, updatePresence]);

  const scheduleDragPresenceFlush = useCallback((nodeId: string, cursorX: number, cursorY: number) => {
    pendingDragPresenceRef.current = { nodeId, cursorX, cursorY };

    const now = Date.now();
    const elapsed = now - lastDragPresenceUpdateRef.current;
    if (elapsed >= PRESENCE_MOVE_CADENCE_MS) {
      lastDragPresenceUpdateRef.current = now;
      flushDragPresence();
      return;
    }

    if (dragPresenceTimerRef.current) {
      return;
    }

    dragPresenceTimerRef.current = setTimeout(() => {
      dragPresenceTimerRef.current = null;
      lastDragPresenceUpdateRef.current = Date.now();
      flushDragPresence();
    }, PRESENCE_MOVE_CADENCE_MS - elapsed);
  }, [flushDragPresence]);

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

  useEffect(() => {
    nodeCountRef.current = Math.max(nodeCountRef.current, nodes.length);
  }, [nodes.length]);

  useEffect(() => {
    if (!selectedNodeId) return;
    const stillExists = nodes.some((node) => node.id === selectedNodeId);
    if (!stillExists) {
      setSelectedNodeId(null);
      scheduleNonUrgentWork(() => {
        profileHandler('presence.update.selection', () => updatePresence({ currentNodeId: undefined }));
      });
    }
  }, [nodes, profileHandler, selectedNodeId, updatePresence]);


  useEffect(() => {
    if (!doc) return;

    const nodesMap = doc.getMap<YRecordMap>('nodes') as YNodeStore;
    const edgesMap = doc.getMap<YRecordMap>('edges') as YEdgeStore;

    const initialNodes: Node<ConceptNodeData>[] = [];
    nodesMap.forEach((nodeData, nodeId) => {
      initialNodes.push(buildNodeFromMap(nodeId, nodeData));
    });

    const initialEdges: Edge[] = [];
    edgesMap.forEach((edgeData, edgeId) => {
      const edge = buildEdgeFromMap(edgeId, edgeData);
      if (edge.source && edge.target) {
        initialEdges.push(edge);
      }
    });

    setNodes(initialNodes);
    nodeCountRef.current = initialNodes.length;
    setEdges(initialEdges);
    persistedPositionsRef.current = new Map(initialNodes.map((node) => [node.id, node.position]));

    const handleNodesDeep = (events: Y.YEvent<Y.AbstractType<unknown>>[], transaction: Y.Transaction) => {
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
          if (!nodeData) {
            if (nextMap.delete(nodeId)) {
              changed = true;
            }
            persistedPositionsRef.current.delete(nodeId);
            return;
          }

          const nextNode = buildNodeFromMap(nodeId, nodeData);
          const existing = nextMap.get(nodeId);
          if (!existing) {
            nextMap.set(nodeId, nextNode);
            persistedPositionsRef.current.set(nodeId, nextNode.position);
            changed = true;
            return;
          }

          if (!isSameNode(existing, nextNode)) {
            nextMap.set(nodeId, { ...existing, ...nextNode, data: nextNode.data, position: nextNode.position });
            persistedPositionsRef.current.set(nodeId, nextNode.position);
            changed = true;
          }
        });

        return changed ? Array.from(nextMap.values()) : prev;
      });
    };

    const handleEdgesDeep = (events: Y.YEvent<Y.AbstractType<unknown>>[], transaction: Y.Transaction) => {
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
          if (!edgeData) {
            if (nextMap.delete(edgeId)) {
              changed = true;
            }
            return;
          }

          const nextEdge = buildEdgeFromMap(edgeId, edgeData);
          const existing = nextMap.get(edgeId);
          if (!existing) {
            if (nextEdge.source && nextEdge.target) {
              nextMap.set(edgeId, nextEdge);
              changed = true;
            }
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
    (changes: NodeChange[]) => profileHandler('nodes.change', () => {
      if (isReadOnly) return;

      onNodesChange(changes);

      if (!doc) return;

      const positionUpdates = changes
        .filter(isPositionChange)
        .filter(shouldPersistPositionChange)
        .map((change) => ({ id: change.id, position: change.position ?? { x: 0, y: 0 } }));

      const removedNodeIds = changes.filter(isNodeRemoveChange).map((change) => change.id);
      const upsertNodes = changes
        .filter(isNodeAddOrResetChange)
        .map((change) => change.item)
        .filter((node): node is Node<ConceptNodeData> => Boolean(node?.id));

      if (removedNodeIds.length > 0 || upsertNodes.length > 0) {
        const nodesMap = doc.getMap<YRecordMap>('nodes') as YNodeStore;
        const edgesMap = doc.getMap<YRecordMap>('edges') as YEdgeStore;
        const removedIdsSet = new Set(removedNodeIds);

        doc.transact(() => {
          upsertNodes.forEach((node) => {
            upsertNodeRecord(nodesMap, node);
          });

          removedNodeIds.forEach((nodeId) => {
            nodesMap.delete(nodeId);
          });

          if (removedIdsSet.size > 0) {
            const danglingEdgeIds: string[] = [];
            edgesMap.forEach((edgeData, edgeId) => {
              const edgeRecord = toPersistedEdgeRecord(edgeId, edgeData);
              if (!edgeRecord) {
                danglingEdgeIds.push(edgeId);
                return;
              }

              if (removedIdsSet.has(edgeRecord.source) || removedIdsSet.has(edgeRecord.target)) {
                danglingEdgeIds.push(edgeId);
              }
            });

            danglingEdgeIds.forEach((edgeId) => {
              edgesMap.delete(edgeId);
            });
          }
        }, 'local');

        removedNodeIds.forEach((nodeId) => {
          persistedPositionsRef.current.delete(nodeId);
        });
      }

      persistNodePositions(positionUpdates);
    }),
    [isReadOnly, doc, onNodesChange, persistNodePositions, profileHandler]
  );

  const handleNodeDragStop = useCallback(
    (_event: React.MouseEvent | React.TouchEvent, node: Node) => {
      if (isReadOnly || !doc) return;
      if (dragPresenceTimerRef.current) {
        clearTimeout(dragPresenceTimerRef.current);
        dragPresenceTimerRef.current = null;
      }
      pendingDragPresenceRef.current = {
        nodeId: node.id,
        cursorX: Math.round(node.position.x),
        cursorY: Math.round(node.position.y),
      };
      flushDragPresence();
      persistNodePositions([{ id: node.id, position: node.position }]);
    },
    [isReadOnly, doc, flushDragPresence, persistNodePositions]
  );

  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      if (isReadOnly) return;
      onEdgesChange(changes);

      if (!doc) return;

      const removedEdgeIds = changes.filter(isEdgeRemoveChange).map((change) => change.id);
      const upsertEdges = changes
        .filter(isEdgeAddOrResetChange)
        .map((change) => change.item)
        .filter((edge): edge is Edge => Boolean(edge?.id));

      if (removedEdgeIds.length === 0 && upsertEdges.length === 0) {
        return;
      }

      const edgesMap = doc.getMap<YRecordMap>('edges') as YEdgeStore;
      doc.transact(() => {
        removedEdgeIds.forEach((edgeId) => {
          edgesMap.delete(edgeId);
        });

        upsertEdges.forEach((edge) => {
          upsertEdgeRecord(edgesMap, edge);
        });
      }, 'local');
    },
    [isReadOnly, doc, onEdgesChange]
  );

  const createConnectionEdge = useCallback(
    (sourceId: string, targetId: string) => {
      if (isReadOnly || !doc || !sourceId || !targetId || sourceId === targetId) return;

      const alreadyConnected = edges.some((edge) => edge.source === sourceId && edge.target === targetId);
      if (alreadyConnected) {
        return;
      }

      const edgeId = `edge-${Date.now()}`;
      const newEdge: Edge = {
        id: edgeId,
        source: sourceId,
        target: targetId,
        style: EDGE_STYLE,
      };

      const baseEdges = addEdge(newEdge, edges);
      const edgesMap = doc.getMap<YRecordMap>('edges') as YEdgeStore;
      doc.transact(() => {
        const edgeDataMap = new Y.Map<unknown>();
        edgeDataMap.set('id', edgeId);
        edgeDataMap.set('source', sourceId);
        edgeDataMap.set('target', targetId);
        edgesMap.set(edgeId, edgeDataMap);
      }, 'local');

      setEdges(baseEdges);
    },
    [isReadOnly, doc, edges, setEdges]
  );

  const handleConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      createConnectionEdge(connection.source, connection.target);
    },
    [createConnectionEdge]
  );

  const removeConnectionEdge = useCallback(
    (sourceId: string, targetId: string) => {
      if (isReadOnly || !doc || !sourceId || !targetId) return;

      const edgeToRemove = edges.find((edge) => edge.source === sourceId && edge.target === targetId);
      if (!edgeToRemove) {
        return;
      }

      const edgesMap = doc.getMap<YRecordMap>('edges') as YEdgeStore;
      doc.transact(() => {
        edgesMap.delete(edgeToRemove.id);
      }, 'local');

      setEdges((prev) => prev.filter((edge) => edge.id !== edgeToRemove.id));
    },
    [isReadOnly, doc, edges, setEdges]
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
      dragHandle: NODE_DRAG_HANDLE_SELECTOR,
      data: {
        label: `Concept ${nodeCountRef.current + 1}`,
        variant: 'default',
      },
      position: safePos,
    };

    const nodesMap = doc.getMap<YRecordMap>('nodes') as YNodeStore;
    doc.transact(() => {
      const nodeDataMap = new Y.Map<unknown>();
      nodeDataMap.set('id', nodeId);
      nodeDataMap.set('label', newNode.data.label);
      nodeDataMap.set('position', newNode.position);
      nodeDataMap.set('variant', 'default');
      nodesMap.set(nodeId, nodeDataMap);
    }, 'local');

    persistedPositionsRef.current.set(nodeId, newNode.position);
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
      dragHandle: NODE_DRAG_HANDLE_SELECTOR,
      data: { label: `Concept ${nodeCountRef.current + 1}`, variant: 'default' },
      position: childPos,
    };

    const edgeId = `edge-${Date.now()}`;
    const edge: Edge = {
      id: edgeId,
      source: selectedNodeId,
      target: childId,
      style: EDGE_STYLE,
    };

    const baseNodes = [...nodes, childNode];
    const baseEdges = [...edges, edge];

    const nodesMap = doc.getMap<YRecordMap>('nodes') as YNodeStore;
    const edgesMap = doc.getMap<YRecordMap>('edges') as YEdgeStore;

    doc.transact(() => {
      const nodeDataMap = new Y.Map<unknown>();
      nodeDataMap.set('id', childId);
      nodeDataMap.set('label', childNode.data.label);
      nodeDataMap.set('position', childNode.position);
      nodeDataMap.set('variant', 'default');
      nodesMap.set(childId, nodeDataMap);

      const edgeDataMap = new Y.Map<unknown>();
      edgeDataMap.set('id', edgeId);
      edgeDataMap.set('source', selectedNodeId);
      edgeDataMap.set('target', childId);
      edgesMap.set(edgeId, edgeDataMap);
    }, 'local');

    persistedPositionsRef.current.set(childId, childNode.position);
    nodeCountRef.current += 1;
    setNodes(baseNodes);
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
      dragHandle: NODE_DRAG_HANDLE_SELECTOR,
      data: { label: `Concept ${nodeCountRef.current + 1}`, variant: 'default' },
      position: siblingPos,
    };

    const edgesMap = doc.getMap<YRecordMap>('edges') as YEdgeStore;
    let parentId: string | null = parentIdFromState;

    if (!parentId) {
      edgesMap.forEach((edgeData, edgeId) => {
        const edgeRecord = toPersistedEdgeRecord(edgeId, edgeData);
        if (edgeRecord && edgeRecord.target === selectedNodeId) {
          parentId = edgeRecord.source;
        }
      });
    }

    const sourceId = parentId || selectedNodeId;
    const edgeId = `edge-${Date.now()}`;
    const edge: Edge = {
      id: edgeId,
      source: sourceId,
      target: siblingId,
      style: EDGE_STYLE,
    };

    const baseNodes = [...nodes, siblingNode];
    const baseEdges = [...edges, edge];

    const nodesMap = doc.getMap<YRecordMap>('nodes') as YNodeStore;

    doc.transact(() => {
      const nodeDataMap = new Y.Map<unknown>();
      nodeDataMap.set('id', siblingId);
      nodeDataMap.set('label', siblingNode.data.label);
      nodeDataMap.set('position', siblingNode.position);
      nodeDataMap.set('variant', 'default');
      nodesMap.set(siblingId, nodeDataMap);

      const edgeDataMap = new Y.Map<unknown>();
      edgeDataMap.set('id', edgeId);
      edgeDataMap.set('source', sourceId);
      edgeDataMap.set('target', siblingId);
      edgesMap.set(edgeId, edgeDataMap);
    }, 'local');

    persistedPositionsRef.current.set(siblingId, siblingNode.position);
    nodeCountRef.current += 1;
    setNodes(baseNodes);
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
      dragHandle: NODE_DRAG_HANDLE_SELECTOR,
      data: { label: `Concept ${nodeCountRef.current + 1}`, variant: 'default' },
      position: parentPos,
    };

    const edgeId = `edge-${Date.now()}`;

    const nodesMap = doc.getMap<YRecordMap>('nodes') as YNodeStore;
    const edgesMap = doc.getMap<YRecordMap>('edges') as YEdgeStore;
    doc.transact(() => {
      const nodeDataMap = new Y.Map<unknown>();
      nodeDataMap.set('id', parentId);
      nodeDataMap.set('label', parentNode.data.label);
      nodeDataMap.set('position', parentNode.position);
      nodeDataMap.set('variant', 'default');
      nodesMap.set(parentId, nodeDataMap);

      const edgeDataMap = new Y.Map<unknown>();
      edgeDataMap.set('id', edgeId);
      edgeDataMap.set('source', parentId);
      edgeDataMap.set('target', selectedNodeId);
      edgesMap.set(edgeId, edgeDataMap);
    }, 'local');

    persistedPositionsRef.current.set(parentId, parentNode.position);
    nodeCountRef.current += 1;
    setNodes((nds) => [...nds, parentNode]);
    setEdges((eds) => [...eds, { id: edgeId, source: parentId, target: selectedNodeId, style: EDGE_STYLE }]);
  }, [isReadOnly, doc, selectedNodeId, nodes, setNodes, setEdges, handleAddNode, getViewportCenter]);

  const handleDeleteNode = useCallback(() => {
    if (isReadOnly || !selectedNodeId || !doc) return;

    const nodesMap = doc.getMap('nodes');
    const edgesMap = doc.getMap<YRecordMap>('edges') as YEdgeStore;

    const edgesToDelete: string[] = [];
    edgesMap.forEach((edgeData, edgeId) => {
      const edgeRecord = toPersistedEdgeRecord(edgeId, edgeData);
      if (!edgeRecord) {
        return;
      }

      if (edgeRecord.source === selectedNodeId || edgeRecord.target === selectedNodeId) {
        edgesToDelete.push(edgeId);
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
    persistedPositionsRef.current.delete(selectedNodeId);
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

  const handleStartConnect = useCallback(() => {
    if (!selectedNodeId || isReadOnly) return;
    setUnconnectSourceNodeId(null);
    setConnectSourceNodeId(selectedNodeId);
  }, [selectedNodeId, isReadOnly]);

  const handleStartUnconnect = useCallback(() => {
    if (!selectedNodeId || isReadOnly) return;
    setConnectSourceNodeId(null);
    setUnconnectSourceNodeId(selectedNodeId);
  }, [selectedNodeId, isReadOnly]);

  const handleRenameStart = useCallback(() => {
    if (!selectedNodeId || isReadOnly) return;
    const node = nodes.find((n) => n.id === selectedNodeId);
    if (node) {
      setRenameNodeId(selectedNodeId);
      setRenameText(getNodeLabel(node));
    }
  }, [selectedNodeId, nodes, isReadOnly]);

  const handleRenameSave = useCallback(() => {
    if (!renameNodeId || !doc || !renameText.trim()) return;

    const nodesMap = doc.getMap<YRecordMap>('nodes') as YNodeStore;
    const nodeData = nodesMap.get(renameNodeId);
    if (nodeData) {
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

  const handleExportWorkspace = useCallback(async () => {
    if (!doc) {
      return;
    }

    try {
      const instance = reactFlowInstanceRef.current;
      const viewport = instance
        ? instance.getViewport()
        : undefined;

      const archivePayload: WorkspaceArchiveFile = {
        magic: WORKSPACE_ARCHIVE_MAGIC,
        version: WORKSPACE_ARCHIVE_VERSION,
        exportedAt: new Date().toISOString(),
        sourceMapId: mapId,
        snapshot: getCurrentSnapshot(doc),
        viewport: viewport
          ? {
              x: viewport.x,
              y: viewport.y,
              zoom: viewport.zoom,
            }
          : undefined,
      };

      const encoded = await encodeFadhilArchive(archivePayload, 'workspace-archive');
      const archiveBlob = new Blob([encoded], { type: 'application/x-fadhil-archive' });
      const downloadUrl = URL.createObjectURL(archiveBlob);
      const anchor = document.createElement('a');
      const timestamp = archivePayload.exportedAt
        .replace(/[:.]/g, '-')
        .replace('T', '_')
        .replace('Z', '');

      anchor.href = downloadUrl;
      anchor.download = `workspace-${mapId}-${timestamp}.fAdHiL`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Gagal mengekspor workspace .fAdHiL:', error);
      window.alert(`Gagal mengekspor workspace: ${message}`);
    }
  }, [doc, mapId]);

  const handleImportWorkspace = useCallback(() => {
    if (isReadOnly) {
      return;
    }
    importFileInputRef.current?.click();
  }, [isReadOnly]);

  const handleWorkspaceFilePicked = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      if (isReadOnly || !doc) {
        return;
      }

      const file = event.target.files?.[0];
      event.target.value = '';
      if (!file) {
        return;
      }

      try {
        const raw = await file.text();
        const decoded = await decodeFadhilArchive(raw);
        if (decoded.contentType !== 'workspace-archive') {
          throw new Error('File .fAdHiL ini bukan arsip workspace editor.');
        }

        const archive = decoded.payload as Partial<WorkspaceArchiveFile>;
        if (archive.magic !== WORKSPACE_ARCHIVE_MAGIC) {
          throw new Error('File bukan format arsip ChartWorkspace.');
        }

        if (archive.version !== WORKSPACE_ARCHIVE_VERSION) {
          throw new Error(`Versi file tidak didukung: ${String(archive.version)}`);
        }

        if (!archive.snapshot || typeof archive.snapshot !== 'string') {
          throw new Error('Snapshot tidak ditemukan di file arsip.');
        }

        const probeDoc = new Y.Doc();
        probeDoc.getMap('nodes');
        probeDoc.getMap('edges');
        probeDoc.getMap('selected');
        probeDoc.getText('title');
        applyYjsSnapshot(probeDoc, archive.snapshot);

        doc.transact(() => {
          doc.getMap('nodes').clear();
          doc.getMap('edges').clear();
          doc.getMap('selected').clear();

          const title = doc.getText('title');
          title.delete(0, title.length);
        }, 'local');

        applyYjsSnapshot(doc, archive.snapshot);

        const importedViewport = archive.viewport;
        if (
          importedViewport
          && typeof importedViewport.x === 'number'
          && typeof importedViewport.y === 'number'
          && typeof importedViewport.zoom === 'number'
        ) {
          reactFlowInstanceRef.current?.setViewport(importedViewport, { duration: 0 });
        }

        await saveSnapshot();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('Gagal memuat arsip workspace:', error);
        window.alert(`Gagal mengimpor workspace: ${message}`);
      }
    },
    [doc, isReadOnly, saveSnapshot]
  );

  const handleMove = useCallback<OnMove>(
    (_event, viewport) => {
      profileHandler('viewport.move', () => {
        scheduleMovePresenceFlush(Math.round(viewport.x), Math.round(viewport.y));
        setViewportZoom(viewport.zoom);
      });
    },
    [profileHandler, scheduleMovePresenceFlush]
  );

  const handleSelectionChange = useCallback(
    (selection: OnSelectionChangeParams) => profileHandler('selection.change', () => {
      const nextSelected = selection.nodes?.[0]?.id ?? null;
      setSelectedNodeId((prev) => {
        if (prev === nextSelected) {
          return prev;
        }

        scheduleNonUrgentWork(() => {
          profileHandler('presence.update.selection', () => updatePresence({ currentNodeId: nextSelected ?? undefined }));
          onSelectNode?.(nextSelected);
        });

        return nextSelected;
      });
    }),
    [onSelectNode, profileHandler, updatePresence]
  );


  useEffect(() => {
    if (inviteRequestToken > 0) {
      setShowInviteModal(true);
    }
  }, [inviteRequestToken]);

  const nodeActionContextValue = useMemo<NodeActionContextValue>(
    () => ({ onChangeColor: handleChangeColor, onToggleDescriptionPanel: handleToggleDescriptionPanel, isReadOnly }),
    [handleChangeColor, handleToggleDescriptionPanel, isReadOnly]
  );
  useEffect(() => () => {
    if (movePresenceTimerRef.current) {
      clearTimeout(movePresenceTimerRef.current);
      movePresenceTimerRef.current = null;
    }
    if (dragPresenceTimerRef.current) {
      clearTimeout(dragPresenceTimerRef.current);
      dragPresenceTimerRef.current = null;
    }
    flushMovePresence();
    flushDragPresence();
  }, [flushDragPresence, flushMovePresence]);


  useEffect(() => {
    if (!doc) {
      setRefreshAlertBroadcast(null);
      return;
    }

    const broadcastMap = doc.getMap<unknown>('systemBroadcast');

    const readRefreshAlert = () => {
      const payload = broadcastMap.get('refreshAlert');
      if (!payload || typeof payload !== 'object') {
        setRefreshAlertBroadcast(null);
        return;
      }

      const nextPayload = payload as { id?: unknown; reason?: unknown; message?: unknown; mandatory?: unknown };
      if (typeof nextPayload.id !== 'string') {
        setRefreshAlertBroadcast(null);
        return;
      }

      setRefreshAlertBroadcast({
        id: nextPayload.id,
        reason:
          typeof nextPayload.reason === 'string' && nextPayload.reason.trim()
            ? nextPayload.reason.trim()
            : typeof nextPayload.message === 'string' && nextPayload.message.trim()
              ? nextPayload.message.trim()
              : 'Wajib refresh halaman untuk sinkronisasi versi terbaru.',
        mandatory: nextPayload.mandatory !== false,
      });
    };

    readRefreshAlert();
    broadcastMap.observe(readRefreshAlert);

    return () => {
      broadcastMap.unobserve(readRefreshAlert);
    };
  }, [doc]);

  const handleRefreshPage = useCallback(async () => {
    if (isRefreshingPage) {
      return;
    }

    if (refreshAlertBroadcast && doc) {
      const broadcastMap = doc.getMap<unknown>('systemBroadcast');
      doc.transact(() => {
        broadcastMap.delete('refreshAlert');
      }, 'local');
      setRefreshAlertBroadcast(null);
    }

    setIsRefreshingPage(true);
    try {
      await saveSnapshot();
      window.setTimeout(() => {
        window.location.reload();
      }, 120);
    } finally {
      window.setTimeout(() => {
        setIsRefreshingPage(false);
      }, 1500);
    }
  }, [doc, isRefreshingPage, refreshAlertBroadcast, saveSnapshot]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const mediaQuery = window.matchMedia('(max-width: 1023px)');
    const handleViewportChange = (event: MediaQueryListEvent) => {
      setIsMobileViewport(event.matches);
    };

    setIsMobileViewport(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleViewportChange, { passive: true });

    return () => {
      mediaQuery.removeEventListener('change', handleViewportChange);
    };
  }, []);

  return (
    <div className="relative flex h-full min-h-0 flex-col bg-slate-50">
      {!isReadOnly && (
        <>
          <FlowToolbarDesktop
            showControlsPanel={showDesktopControlsPanel}
            showStatusPanel={showDesktopStatusPanel}
            selectedNodeId={selectedNodeId}
            selectedNodeLabel={selectedNodeLabel}
            selectedParentId={selectedParentId}
            selectedChildCount={selectedChildCount}
            selectedPosition={selectedPosition}
            canUndo={canUndo}
            canRedo={canRedo}
            snapEnabled={snapEnabled}
            remoteUsersCount={remoteUsers.length}
            isConnected={isConnected}
            saveErrorCount={saveErrorCount}
            onAddNode={handleAddNode}
            onRename={handleRenameStart}
            onDelete={handleDeleteNode}
            onUndo={handleUndo}
            onRedo={handleRedo}
            isConnectArmed={Boolean(connectSourceNodeId)}
            isUnconnectArmed={Boolean(unconnectSourceNodeId)}
            onConnectStart={handleStartConnect}
            onUnconnectStart={handleStartUnconnect}
            onExportWorkspace={handleExportWorkspace}
            onImportWorkspace={handleImportWorkspace}
          />
          <FlowToolbarMobile
            isOpen={showMobileToolsPanel}
            selectedNodeId={selectedNodeId}
            canUndo={canUndo}
            canRedo={canRedo}
            isConnected={isConnected}
            remoteUsersCount={remoteUsers.length}
            onAddNode={handleAddNode}
            onUndo={handleUndo}
            onRedo={handleRedo}
            onRename={handleRenameStart}
            onDelete={handleDeleteNode}
            isConnectArmed={Boolean(connectSourceNodeId)}
            isUnconnectArmed={Boolean(unconnectSourceNodeId)}
            onConnectStart={handleStartConnect}
            onUnconnectStart={handleStartUnconnect}
            onExportWorkspace={handleExportWorkspace}
            onImportWorkspace={handleImportWorkspace}
          />
        </>
      )}

      {refreshAlertBroadcast && (
        <div className="absolute inset-0 z-[160] flex items-start justify-center bg-black/15 px-3 pt-2">
          <div className="pointer-events-auto flex w-[min(96vw,620px)] items-center justify-between gap-3 rounded-lg border border-amber-400/60 bg-amber-50/95 px-3 py-2 text-xs text-amber-950 shadow-lg backdrop-blur">
            <p className="font-semibold">
              {refreshAlertBroadcast.mandatory ? `Wajib refresh: ${refreshAlertBroadcast.reason}` : refreshAlertBroadcast.reason}
            </p>
            <button
              type="button"
              onClick={handleRefreshPage}
              disabled={isRefreshingPage}
              className="shrink-0 rounded-md border border-amber-800/40 bg-amber-500 px-2.5 py-1 font-semibold text-amber-950 transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isRefreshingPage ? 'Saving…' : 'Wajib refresh'}
            </button>
          </div>
        </div>
      )}

      {!isReadOnly && selectedNodeId && (
        <div className="pointer-events-none absolute right-1.5 top-1.5 z-40 flex w-[min(62vw,210px)] flex-col gap-1 rounded-lg border border-cyan-400/25 bg-slate-950/92 p-1 shadow-[0_10px_20px_rgba(34,211,238,0.14)] backdrop-blur sm:right-2 sm:top-2 sm:w-[min(76vw,280px)]">
          <div className="pointer-events-auto flex items-center justify-between gap-1 text-[8px] font-semibold uppercase tracking-[0.08em] text-cyan-100">
            <span>{isDatabaseConnected ? 'DB OK' : 'DB OFF'}</span>
            <span className="truncate text-cyan-200/85">{connectSourceNodeId ? 'Connect' : unconnectSourceNodeId ? 'Unconnect' : `Color: ${selectedNodeLabel ?? selectedNodeId}`}</span>
          </div>
          <div className="pointer-events-auto rounded border border-cyan-500/25 bg-slate-900/80 p-1 text-[8px] text-cyan-100">
            <div className="mb-1 flex items-center justify-between font-semibold uppercase tracking-[0.08em]">
              <span>Node type</span>
              <button
                type="button"
                onClick={() => handleChangeNodeVariant(selectedNodeId, selectedNodeVariant === 'default' ? 'descript' : 'default')}
                className={`relative h-4 w-8 rounded-full transition ${selectedNodeVariant === 'descript' ? 'bg-cyan-400' : 'bg-slate-600'}`}
                aria-label={`Switch node type to ${selectedNodeVariant === 'default' ? 'descript' : 'default'}`}
              >
                <span
                  className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition ${selectedNodeVariant === 'descript' ? 'left-[17px]' : 'left-0.5'}`}
                />
              </button>
            </div>
            <p className="text-[7px] text-cyan-200/80">Left = default, Right = descript</p>
            {selectedNodeVariant === 'descript' && (
              <textarea
                value={selectedNodeDescription}
                onChange={(event) => handleChangeNodeDescription(selectedNodeId, event.target.value)}
                placeholder="Description for expandable panel"
                className="mt-1 min-h-[52px] w-full resize-y rounded border border-cyan-600/30 bg-slate-950/80 px-1 py-1 text-[9px] text-cyan-100 outline-none focus:border-cyan-400"
              />
            )}
          </div>
          <div className="pointer-events-auto rounded border border-cyan-500/25 bg-slate-900/80 px-1 py-0.5 text-[8px] text-cyan-100">
            <p className="mb-0.5 font-semibold uppercase tracking-[0.08em]">Select color</p>
            <div className="max-h-16 overflow-y-scroll overflow-x-hidden pr-px">
              <div className="grid grid-cols-3 justify-items-center gap-x-[2px] gap-y-0.5">
                {COMPACT_COLOR_OPTIONS.map((swatch) => (
                  <button
                    key={swatch.key}
                    type="button"
                    onClick={() => handleChangeColor(selectedNodeId, swatch.color)}
                    className={`h-3 w-3 rounded-[2px] border ${selectedNodeColor === swatch.color ? 'border-white' : 'border-slate-800'}`}
                    style={swatch.style}
                    aria-label={swatch.ariaLabel}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}


      <input
        ref={importFileInputRef}
        type="file"
        accept=".fAdHiL"
        className="hidden"
        onChange={handleWorkspaceFilePicked}
      />

      <div
        ref={reactFlowWrapperRef}
        className={`relative min-h-0 flex-1 overflow-hidden ${!isReadOnly && showMobileToolsPanel ? 'pb-20 lg:pb-0' : 'pb-0'}`}
      >
        <NodeActionContext.Provider value={nodeActionContextValue}>
          <ReactFlow
            nodes={nodesWithPresence}
            edges={renderedEdges}
            onInit={(instance) => {
              reactFlowInstanceRef.current = instance;
            }}
            onNodesChange={handleNodesChange}
            onNodeDrag={(_event, node) => {
              scheduleDragPresenceFlush(node.id, Math.round(node.position.x), Math.round(node.position.y));
            }}
            onNodeDragStop={handleNodeDragStop}
            onEdgesChange={handleEdgesChange}
            onConnect={handleConnect}
            onSelectionChange={handleSelectionChange}
            onMove={handleMove}
            onMoveEnd={flushMovePresence}
            onNodeClick={(_event, node) => {
              if (connectSourceNodeId && connectSourceNodeId !== node.id) {
                createConnectionEdge(connectSourceNodeId, node.id);
                setConnectSourceNodeId(null);
                setUnconnectSourceNodeId(null);
                return;
              }

              if (unconnectSourceNodeId && unconnectSourceNodeId !== node.id) {
                removeConnectionEdge(unconnectSourceNodeId, node.id);
                setUnconnectSourceNodeId(null);
              }
            }}
            onPaneClick={() => {
              setSelectedNodeId((prev) => {
                if (!prev) return prev;
                scheduleNonUrgentWork(() => {
                  profileHandler('presence.update.selection', () => updatePresence({ currentNodeId: undefined }));
                  onSelectNode?.(null);
                });
                setConnectSourceNodeId(null);
                setUnconnectSourceNodeId(null);
                return null;
              });
            }}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            translateExtent={UNBOUNDED_TRANSLATE_EXTENT}
            snapToGrid={effectiveSnapToGrid}
            snapGrid={[GRID_SIZE, GRID_SIZE]}
            attributionPosition="bottom-left"
            connectionLineType={ConnectionLineType.Straight}
            selectionOnDrag={false}
            panOnDrag
            panOnScroll={false}
            zoomOnPinch
            zoomOnScroll
            preventScrolling={false}
            minZoom={isMobileViewport ? MOBILE_MIN_ZOOM : 0.2}
            nodeDragThreshold={isMobileViewport ? 0 : 2}
            onlyRenderVisibleElements
            defaultEdgeOptions={{
              type: 'hierarchy',
              style: EDGE_STYLE,
            }}
          >
            {!isDenseGraph && <Background gap={ROUTE_GRID_SIZE} size={0.5} color="#dbeafe" variant={BackgroundVariant.Lines} />}
            <Background gap={GRID_SIZE} size={isDenseGraph ? 0.75 : 1} color="#cbd5e1" variant={BackgroundVariant.Lines} />
            <div className="hidden lg:block">
              <Controls />
            </div>
            {shouldRenderMiniMap && (
              <div className="hidden lg:block">
                <MiniMap />
              </div>
            )}
          </ReactFlow>
        </NodeActionContext.Provider>
        {doc && nodes.length === 0 && (
          <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center p-4">
            <div className="pointer-events-auto w-full max-w-md rounded-xl border border-slate-200 bg-white/95 p-5 text-center shadow-lg backdrop-blur">
              <h3 className="text-lg font-semibold text-slate-900">Workspace masih kosong</h3>
              <p className="mt-2 text-sm text-slate-600">
                Belum ada node di peta ini. Tambahkan node pertama untuk mulai menyusun konsep.
              </p>
              {!isReadOnly ? (
                <button
                  type="button"
                  onClick={handleAddNode}
                  className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Add First Node
                </button>
              ) : (
                <p className="mt-4 text-xs font-medium uppercase tracking-wide text-slate-500">
                  View only mode
                </p>
              )}
            </div>
          </div>
        )}
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
