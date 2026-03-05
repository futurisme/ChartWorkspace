# Large-Graph Workspace Performance Architecture (500+ Nodes, 1k-10k Edges)

## 1) Root-cause analysis of lag in visual graph editors

### Rendering bottlenecks
- **DOM/SVG overdraw**: Per-node and per-edge SVG/HTML elements scale poorly as counts grow; each element incurs style/layout/paint cost.
- **Expensive edge paths**: Recomputing thousands of Bézier/orthogonal edge paths on every pan/zoom/drag creates frame spikes.
- **Unbounded re-renders**: State updates that touch global graph objects force broad React tree updates.
- **High-frequency pointer events**: Drag, pan, zoom, and selection updates can fire >100 events/sec and trigger synchronous work.

### Layout & recalculation bottlenecks
- **Synchronous auto-layout** (dagre/force) on main thread blocks rendering.
- **Repeated measurement reads** (`getBoundingClientRect`) interleaved with writes causes layout thrash.
- **Viewport transforms applied inefficiently** (per element instead of container transform).

### Data/state bottlenecks
- **Mutable graph updates** copying large arrays/maps each tick.
- **Derived data recomputed globally** (adjacency, visibility, selection, hit targets).
- **No spatial indexing** causing O(N) hit-testing and culling each interaction.

### Memory bottlenecks
- **Per-node closures/object churn** from rebuilt component props and handlers.
- **Large undo/redo snapshots** storing full graph each step instead of patches.
- **Leaky caches** for path geometry, text metrics, thumbnails, or layout results.

---

## 2) Target architecture for scalable responsiveness

## Rendering architecture (hybrid)
Use **layered rendering**:
1. **Background layer (WebGL/Canvas2D)** for bulk nodes/edges.
2. **Interaction layer (minimal DOM)** for selected/hovered/edited items only.
3. **UI overlay** (toolbars, context menus, minimap, lasso) in DOM.

This keeps visual quality while moving heavy drawing to GPU-friendly paths.

### Level-of-detail (LOD) policy
- **Zoomed out**: draw clusters + simplified edges (straight lines, lower alpha).
- **Mid zoom**: draw node shells/icons, skip labels by priority.
- **Zoomed in**: full node components, rich edges, labels, animations.

### Viewport virtualization policy
- Render only nodes/edges intersecting viewport + margin.
- For edges, use endpoint coarse culling and optional segment bbox cache.
- Defer non-critical visuals (shadows, glows, gradients) until idle.

---

## 3) Data model & state management strategy

## Core graph store
- Keep canonical graph in normalized form:
  - `nodesById: Map<NodeId, Node>`
  - `edgesById: Map<EdgeId, Edge>`
  - `outAdj: Map<NodeId, EdgeId[]>`
  - `inAdj: Map<NodeId, EdgeId[]>`
- Use **immutable structural sharing** only at touched nodes/edges.
- Separate state domains:
  - **Graph state** (topology, geometry).
  - **View state** (viewport matrix, zoom).
  - **Interaction state** (selection, drag, hover).

This avoids invalidating everything on interaction updates.

## Derived indexes (incremental)
- **Spatial index** (RBush/quadtree) for viewport culling + hit testing.
- **Label occupancy index** for collision-aware label rendering.
- **Cluster index** for hierarchical grouping and progressive reveal.

Recompute incrementally only for modified entities.

## Undo/redo optimization
- Store **command patches** (insert/remove/update ranges) not full snapshots.
- Periodically checkpoint compressed snapshot (e.g., every 50 operations).

---

## 4) Background processing and scheduling

## Web Worker pipeline
Move expensive computations off main thread:
- Layout computations (dagre, elkjs, force iterations).
- Edge routing simplification.
- Cluster detection / community updates.
- Large import parsing and normalization.

Use binary transfer when possible (`Float32Array`, `Uint32Array`) to reduce serialization overhead.

## Scheduler strategy
- Main thread work split by priority:
  - **Critical**: pointer feedback, drag transform, selection box.
  - **High**: visible set recompute.
  - **Medium**: edge geometry refinement.
  - **Low/Idle**: label detail, thumbnails, shadows.
- Use `requestAnimationFrame` for frame-bound writes and `requestIdleCallback` (fallback timer) for optional work.

---

## 5) Proven libraries/algorithms

## Rendering and graph tooling
- **WebGL renderers**: PixiJS, regl, deck.gl (custom layers), sigma.js.
- **Canvas scene graph**: Konva/Fabric (for moderate complexity).
- **Graph UI frameworks**: React Flow (with custom renderer strategy), Cytoscape.js (large graph tuned modes).

## Layout and clustering
- **ELK (elkjs)**: scalable layered layouts with async worker execution.
- **Dagre**: fast DAG layout for medium graphs.
- **ForceAtlas2 / Barnes-Hut**: large force-directed scenes.
- **Louvain/Leiden clustering** for zoom-level aggregation.

## Indexing and utility
- **RBush / flatbush** for 2D spatial indexing.
- **Comlink** for cleaner worker APIs.
- **zustand/redux-toolkit + selectors** for state slicing.

---

## 6) Step-by-step implementation plan

## Phase 0: Baseline profiling (1-2 days)
1. Add runtime perf probes:
   - FPS (rolling avg, p95 frame time).
   - Scripting/layout/paint breakdown via Performance API.
   - Memory snapshots (JS heap trend, retained nodes).
2. Define targets:
   - 60 FPS typical interactions, >=45 FPS worst-case drag at 500+ nodes.
   - Input latency <16ms p95 during pan/drag.

## Phase 1: State slicing + memoization (2-3 days)
- Split store domains and selectors.
- Ensure node components subscribe only to own state.
- Stabilize callbacks with pooled handlers.

```ts
// src/perf/store.ts
import { create } from 'zustand';

type Node = { id: string; x: number; y: number; w: number; h: number; label: string };
type Edge = { id: string; source: string; target: string };

type GraphState = {
  nodesById: Map<string, Node>;
  edgesById: Map<string, Edge>;
  selectedIds: Set<string>;
  updateNodePos: (id: string, x: number, y: number) => void;
};

export const useGraphStore = create<GraphState>((set) => ({
  nodesById: new Map(),
  edgesById: new Map(),
  selectedIds: new Set(),
  updateNodePos: (id, x, y) =>
    set((s) => {
      const node = s.nodesById.get(id);
      if (!node || (node.x === x && node.y === y)) return s;
      const nextNodes = new Map(s.nodesById);
      nextNodes.set(id, { ...node, x, y });
      return { ...s, nodesById: nextNodes };
    }),
}));
```

## Phase 2: Viewport virtualization + LOD (3-5 days)
- Add camera model (`scale`, `tx`, `ty`) and viewport bounds.
- Build spatial index for nodes and edges.
- Draw only visible entities; apply LOD rules by zoom.

```ts
// src/perf/visibility.ts
import RBush from 'rbush';

type Box = { minX: number; minY: number; maxX: number; maxY: number; id: string };

export function queryVisibleNodeIds(index: RBush<Box>, view: Box, overscan = 200): string[] {
  const expanded = {
    minX: view.minX - overscan,
    minY: view.minY - overscan,
    maxX: view.maxX + overscan,
    maxY: view.maxY + overscan,
  };
  return index.search(expanded).map((b) => b.id);
}

export function lodLevel(scale: number): 'cluster' | 'compact' | 'full' {
  if (scale < 0.45) return 'cluster';
  if (scale < 0.9) return 'compact';
  return 'full';
}
```

## Phase 3: Workerized layout and edge geometry (3-5 days)
- Move layout + heavy edge path generation into worker.
- Publish incremental diffs instead of full graph payload.

```ts
// src/perf/layout.worker.ts
import ELK from 'elkjs/lib/elk.bundled.js';

const elk = new ELK();

self.onmessage = async (evt: MessageEvent) => {
  const { graph } = evt.data;
  const result = await elk.layout(graph, {
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'RIGHT',
      'elk.spacing.nodeNode': '40',
    },
  });
  // Return only id + new coordinates (small payload)
  const positions = (result.children ?? []).map((n: any) => ({ id: n.id, x: n.x, y: n.y }));
  (self as any).postMessage({ type: 'layout:positions', positions });
};
```

```ts
// src/perf/layoutClient.ts
import { wrap } from 'comlink';

const worker = new Worker(new URL('./layout.worker.ts', import.meta.url), { type: 'module' });

export function requestLayout(graph: unknown) {
  worker.postMessage({ graph });
}

export function subscribeLayout(onPositions: (positions: Array<{id: string; x: number; y: number}>) => void) {
  worker.onmessage = (e) => {
    if (e.data?.type === 'layout:positions') onPositions(e.data.positions);
  };
}
```

## Phase 4: Hybrid renderer (5-8 days)
- Keep React components for editable/selected nodes.
- Render bulk nodes/edges using WebGL/Canvas layer.
- Promote entities from GPU layer to interactive DOM layer on hover/selection.

```ts
// src/perf/renderLoop.ts
let pending = false;

export function scheduleFrame(draw: () => void) {
  if (pending) return;
  pending = true;
  requestAnimationFrame(() => {
    pending = false;
    draw();
  });
}
```

## Phase 5: Input smoothing and event pressure control (1-2 days)
- Coalesce pointer moves to one update/frame.
- Debounce expensive recompute (e.g., 60-120ms) while dragging.

```ts
// src/perf/events.ts
export function rafThrottle<T extends (...args: any[]) => void>(fn: T): T {
  let queued = false;
  let lastArgs: any[] = [];
  return ((...args: any[]) => {
    lastArgs = args;
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      fn(...lastArgs);
    });
  }) as T;
}

export function debounce<T extends (...args: any[]) => void>(fn: T, ms: number): T {
  let t: ReturnType<typeof setTimeout> | undefined;
  return ((...args: any[]) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  }) as T;
}
```

## Phase 6: Visual quality safeguards (ongoing)
- Keep anti-aliased lines/text for active region only.
- Use signed-distance-field text for crisp scalable labels in WebGL.
- Keep motion design but gate expensive effects by frame budget.

---

## 7) Repaint optimization patterns

- Apply camera transform once at container/layer root instead of per node.
- Keep static edge buffer and update only dirty ranges.
- Track dirty rectangles and redraw subregions (Canvas2D mode).
- Cache path geometry by `(sourcePos,targetPos,style)` hash.

```ts
// src/perf/dirtyRegion.ts
export type Rect = { x: number; y: number; w: number; h: number };

export function union(a: Rect, b: Rect): Rect {
  const x1 = Math.min(a.x, b.x);
  const y1 = Math.min(a.y, b.y);
  const x2 = Math.max(a.x + a.w, b.x + b.w);
  const y2 = Math.max(a.y + a.h, b.y + b.h);
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
}
```

---

## 8) Benchmarks, targets, and trade-offs

## Example expected gains (typical modern laptop)
- **Before** (DOM-heavy SVG):
  - 250 nodes / 700 edges: 20-35 FPS during drag.
  - 500 nodes / 2000 edges: 8-18 FPS; input lag 70-150ms.
- **After** (hybrid + virtualization + worker layout):
  - 500 nodes / 2000 edges: 45-60 FPS, input lag 10-22ms.
  - 1000 nodes / 5000 edges: 30-50 FPS depending on label density.

## Trade-offs
- WebGL/canvas adds complexity and custom hit-testing.
- LOD/clustered zoom can hide detail at low zoom (needs good UX cues).
- Worker architecture requires careful data versioning and reconciliation.
- Best results often require design constraints (edge styles, label rules).

---

## 9) Practical integration in a React Flow-style app

1. Keep React Flow interaction model for editing semantics.
2. Replace default edge renderer for bulk edges with canvas/WebGL overlay.
3. Render only interactive subset as React nodes (`selected`, `hovered`, `editing`).
4. Introduce worker-backed layout service and incremental updates.
5. Add adaptive quality controller:
   - If frame budget exceeded, reduce edge detail and postpone labels.
   - Restore full quality on idle.

---

## 10) Rollout checklist

- [ ] Instrument FPS, latency, memory, long tasks.
- [ ] Establish synthetic benchmark graphs (500/1000/2000 nodes).
- [ ] Implement state slicing and selector hygiene.
- [ ] Add spatial index + viewport culling.
- [ ] Enable LOD rendering policy.
- [ ] Move layout and heavy geometry to workers.
- [ ] Introduce hybrid renderer path (feature flag).
- [ ] Tune quality controller thresholds.
- [ ] Run regression/perf tests in CI and track p95 frame time.

This architecture is robust enough for 500+ nodes and thousands of edges while preserving visual quality and interaction smoothness when implemented incrementally with profiling gates at each phase.
