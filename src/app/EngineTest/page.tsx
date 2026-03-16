'use client';

import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';

type FadhilNode = {
  id: string;
  label: string;
  x: number;
  y: number;
  color: string;
};

type FadhilEdge = {
  id: string;
  source: string;
  target: string;
};

type Point = { x: number; y: number };

type RoutedEdge = {
  id: string;
  path: string;
};

const INITIAL_NODES: FadhilNode[] = [
  { id: 'n-root', label: 'Core Idea', x: 560, y: 300, color: '#22d3ee' },
  { id: 'n-vision', label: 'Vision', x: 840, y: 210, color: '#a78bfa' },
  { id: 'n-plan', label: 'Plan', x: 840, y: 390, color: '#34d399' },
  { id: 'n-risk', label: 'Risks', x: 280, y: 360, color: '#f59e0b' },
  { id: 'n-team', label: 'Team', x: 280, y: 200, color: '#f472b6' },
];

const INITIAL_EDGES: FadhilEdge[] = [
  { id: 'e-root-vision', source: 'n-root', target: 'n-vision' },
  { id: 'e-root-plan', source: 'n-root', target: 'n-plan' },
  { id: 'e-root-risk', source: 'n-root', target: 'n-risk' },
  { id: 'e-root-team', source: 'n-root', target: 'n-team' },
];

const GRID_SIZE = 24;
const NODE_W = 182;
const NODE_H = 62;
const SAME_ROW_TOLERANCE = 18;
const SAME_COL_TOLERANCE = 18;
const BUS_GAP = 22;

function snap(value: number) {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

function center(node: FadhilNode): Point {
  return { x: node.x + NODE_W / 2, y: node.y + NODE_H / 2 };
}

function pointsToPath(points: Point[]): string {
  if (points.length === 0) {
    return '';
  }

  const [start, ...rest] = points;
  return `M ${start.x} ${start.y} ${rest.map((p) => `L ${p.x} ${p.y}`).join(' ')}`;
}

function buildRoutingEngine(nodes: FadhilNode[], edges: FadhilEdge[]): RoutedEdge[] {
  const map = new Map(nodes.map((n) => [n.id, n]));

  const childrenBySource = new Map<string, FadhilEdge[]>();
  for (const edge of edges) {
    const list = childrenBySource.get(edge.source) ?? [];
    list.push(edge);
    childrenBySource.set(edge.source, list);
  }

  const busOffsetByEdgeId = new Map<string, number>();
  childrenBySource.forEach((sourceEdges, sourceId) => {
    const parent = map.get(sourceId);
    if (!parent) return;

    const pc = center(parent);
    const down: FadhilEdge[] = [];
    const up: FadhilEdge[] = [];

    for (const edge of sourceEdges) {
      const child = map.get(edge.target);
      if (!child) continue;
      const cc = center(child);
      if (cc.y >= pc.y) down.push(edge);
      else up.push(edge);
    }

    const assign = (bucket: FadhilEdge[], polarity: 1 | -1) => {
      bucket
        .sort((a, b) => {
          const ta = map.get(a.target);
          const tb = map.get(b.target);
          return (ta?.x ?? 0) - (tb?.x ?? 0);
        })
        .forEach((edge, index) => {
          const row = Math.floor(index / 2) + 1;
          busOffsetByEdgeId.set(edge.id, polarity * BUS_GAP * row);
        });
    };

    assign(down, 1);
    assign(up, -1);
  });

  const routed: RoutedEdge[] = [];

  for (const edge of edges) {
    const source = map.get(edge.source);
    const target = map.get(edge.target);
    if (!source || !target) continue;

    const s = center(source);
    const t = center(target);
    const dx = t.x - s.x;
    const dy = t.y - s.y;

    // Smart mode 1: strict same row -> direct horizontal then vertical correction only if needed
    if (Math.abs(dy) <= SAME_ROW_TOLERANCE) {
      const points: Point[] = [
        s,
        { x: s.x + dx * 0.5, y: s.y },
        { x: s.x + dx * 0.5, y: t.y },
        t,
      ];
      routed.push({ id: edge.id, path: pointsToPath(points) });
      continue;
    }

    // Smart mode 2: near same column -> vertical-first
    if (Math.abs(dx) <= SAME_COL_TOLERANCE) {
      const points: Point[] = [
        s,
        { x: s.x, y: s.y + dy * 0.5 },
        { x: t.x, y: s.y + dy * 0.5 },
        t,
      ];
      routed.push({ id: edge.id, path: pointsToPath(points) });
      continue;
    }

    // Smart mode 3: hierarchy bus routing for siblings from same parent
    const busOffset = busOffsetByEdgeId.get(edge.id) ?? 0;
    if (busOffset !== 0) {
      const busY = s.y + busOffset;
      const points: Point[] = [
        s,
        { x: s.x, y: busY },
        { x: t.x, y: busY },
        t,
      ];
      routed.push({ id: edge.id, path: pointsToPath(points) });
      continue;
    }

    // Smart mode 4: generic orthogonal elbow
    const midX = s.x + dx * 0.5;
    const points: Point[] = [
      s,
      { x: midX, y: s.y },
      { x: midX, y: t.y },
      t,
    ];
    routed.push({ id: edge.id, path: pointsToPath(points) });
  }

  return routed;
}

export default function EngineTestPage() {
  const boardRef = useRef<HTMLDivElement | null>(null);
  const [nodes, setNodes] = useState<FadhilNode[]>(INITIAL_NODES);
  const [edges, setEdges] = useState<FadhilEdge[]>(INITIAL_EDGES);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>('n-root');
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragOffset = useRef({ x: 0, y: 0 });

  const nodeMap = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
  const routedEdges = useMemo(() => buildRoutingEngine(nodes, edges), [nodes, edges]);

  const handleBoardPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!draggingId || !boardRef.current) return;

    const rect = boardRef.current.getBoundingClientRect();
    const nextX = snap(event.clientX - rect.left - dragOffset.current.x);
    const nextY = snap(event.clientY - rect.top - dragOffset.current.y);

    setNodes((prev) => prev.map((node) => (node.id === draggingId ? { ...node, x: nextX, y: nextY } : node)));
  };

  const handlePointerUp = () => {
    setDraggingId(null);
  };

  const handleNodePointerDown = (event: ReactPointerEvent<HTMLButtonElement>, node: FadhilNode) => {
    if (!boardRef.current) return;

    const rect = boardRef.current.getBoundingClientRect();
    dragOffset.current = {
      x: event.clientX - rect.left - node.x,
      y: event.clientY - rect.top - node.y,
    };

    setSelectedNodeId(node.id);
    setDraggingId(node.id);
  };

  const addNode = () => {
    const id = `n-${Date.now().toString(36)}`;
    const index = nodes.length + 1;
    const selected = selectedNodeId ? nodeMap.get(selectedNodeId) : null;
    const baseX = selected ? selected.x + 220 : 560;
    const baseY = selected ? selected.y + 96 : 300;

    const newNode: FadhilNode = {
      id,
      label: `Topic ${index}`,
      x: snap(baseX),
      y: snap(baseY),
      color: ['#22d3ee', '#a78bfa', '#34d399', '#f59e0b', '#f472b6', '#60a5fa'][index % 6],
    };

    setNodes((prev) => [...prev, newNode]);

    if (selected) {
      const edgeId = `e-${selected.id}-${id}`;
      setEdges((prev) => [...prev, { id: edgeId, source: selected.id, target: id }]);
    }

    setSelectedNodeId(id);
  };

  const connectToSelected = () => {
    if (!selectedNodeId) return;
    const others = nodes.filter((node) => node.id !== selectedNodeId);
    if (others.length === 0) return;
    const target = others[others.length - 1];

    const edgeId = `e-${selectedNodeId}-${target.id}-${Date.now().toString(36)}`;
    setEdges((prev) => [...prev, { id: edgeId, source: selectedNodeId, target: target.id }]);
  };

  const deleteSelected = () => {
    if (!selectedNodeId) return;
    setNodes((prev) => prev.filter((node) => node.id !== selectedNodeId));
    setEdges((prev) => prev.filter((edge) => edge.source !== selectedNodeId && edge.target !== selectedNodeId));
    setSelectedNodeId(null);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <section className="mx-auto flex w-full max-w-[1500px] flex-col gap-3 p-3 sm:p-4">
        <div className="rounded-xl border border-cyan-500/30 bg-slate-900/80 p-2 sm:p-3">
          <div className="mb-2 text-[11px] uppercase tracking-[0.2em] text-cyan-200/80">FadhilEngine (Standalone)</div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={addNode} className="rounded border border-cyan-300 bg-cyan-600 px-3 py-1 text-xs font-semibold text-white hover:bg-cyan-500">Add Node</button>
            <button type="button" onClick={connectToSelected} className="rounded border border-violet-300 bg-violet-600 px-3 py-1 text-xs font-semibold text-white hover:bg-violet-500" disabled={!selectedNodeId}>Link Node</button>
            <button type="button" onClick={deleteSelected} className="rounded border border-red-300 bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-500" disabled={!selectedNodeId}>Delete</button>
          </div>
        </div>

        <div
          ref={boardRef}
          onPointerMove={handleBoardPointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          className="relative h-[78vh] overflow-hidden rounded-2xl border border-slate-700 bg-[radial-gradient(circle_at_top,_#0f172a,_#020617_70%)]"
        >
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              backgroundImage: `linear-gradient(to right, rgba(148,163,184,0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.12) 1px, transparent 1px)`,
              backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
            }}
          />

          <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 1500 900" preserveAspectRatio="none">
            {routedEdges.map((edge) => (
              <path key={edge.id} d={edge.path} stroke="#38bdf8" strokeWidth={2.35} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            ))}
          </svg>

          {nodes.map((node) => {
            const selected = node.id === selectedNodeId;
            return (
              <button
                key={node.id}
                type="button"
                onPointerDown={(event) => handleNodePointerDown(event, node)}
                onClick={() => setSelectedNodeId(node.id)}
                className={`absolute rounded-xl border px-3 py-2 text-left shadow-lg backdrop-blur-sm ${selected ? 'border-cyan-300 ring-2 ring-cyan-400/40' : 'border-slate-600 hover:border-cyan-500/70'}`}
                style={{
                  left: node.x,
                  top: node.y,
                  width: NODE_W,
                  height: NODE_H,
                  background: `linear-gradient(135deg, ${node.color}30, rgba(15,23,42,0.92))`,
                }}
              >
                <div className="truncate text-sm font-semibold text-slate-100">{node.label}</div>
                <div className="mt-1 text-[10px] text-slate-300">{node.id}</div>
              </button>
            );
          })}
        </div>
      </section>
    </main>
  );
}
