# ChartMaker

Real-time collaborative concept-map editor built with Next.js, React Flow, Yjs, Prisma, and PostgreSQL.

## Bahasa Indonesia

### 1) Ringkasan
- Editor peta konsep kolaboratif realtime.
- Routing konektor orthogonal adaptif (hierarki + sibling).
- Auto-save snapshot Yjs ke database.
- UI workspace-first untuk desktop dan mobile.

### 2) Root Cause 404 `/api/maps/0001` dan Fix
Masalah sebelumnya:
- Membuka `/editor/0001` memicu `GET /api/maps/0001` (map belum ada) -> `404`.
- Realtime gagal init karena fetch map gagal.

Perbaikan saat ini:
- `GET /api/maps/[id]?ensure=1` akan auto-create map jika belum ada.
- Editor + Realtime mode edit memakai endpoint `ensure=1`.
- `POST /api/maps/save` sekarang `upsert`, jadi tidak 404 saat save map baru.

### 3) Arsitektur Saat Ini

#### App Routes
- `src/app/page.tsx`: landing/create flow entry.
- `src/app/editor/[mapId]/page.tsx`: editor mode (read-write).
- `src/app/view/[mapId]/page.tsx`: viewer mode (read-only).

#### API
- `src/app/api/maps/route.ts`: `POST` create map baru.
- `src/app/api/maps/[id]/route.ts`: `GET` map by id, support `?ensure=1`.
- `src/app/api/maps/save/route.ts`: `POST` save snapshot (last-write-wins via upsert).

#### Realtime + Presence
- `src/components/RealtimeProvider.tsx`: bootstrap Y.Doc, signaling, awareness, autosave.
- `src/components/PresenceBar.tsx`: status connected/offline + online users.

#### Flow Feature Modules
- `src/features/flow/flow-workspace.tsx`: orchestration canvas + action handlers + Yjs sync.
- `src/features/flow/flow-edge-routing.ts`: adaptive orthogonal routing + sibling bus logic.
- `src/features/flow/flow-edge-hierarchy.tsx`: edge renderer polyline orthogonal.
- `src/features/flow/flow-node-placement.ts`: placement, overlap detection, deterministic spread.
- `src/features/flow/flow-node-card.tsx`: custom node card + color actions.
- `src/features/flow/flow-toolbar-desktop.tsx`: desktop controls/status panels.
- `src/features/flow/flow-toolbar-mobile.tsx`: mobile bottom dock.
- `src/features/flow/flow-constants.ts`: shared constants (grid, route, spacing, extents).
- `src/features/flow/flow-types.ts`: shared types route/node/persisted records.

#### Shared Lib
- `src/lib/snapshot.ts`: snapshot encode/decode/apply/get current/create doc.
- `src/lib/mapId.ts`: `formatMapId`, `parseMapId`.
- `src/lib/presence.ts`: awareness presence helpers.
- `src/lib/prisma.ts`: prisma singleton.

### 4) Peta Fungsi Ekspor (Core)

#### `src/lib/snapshot.ts`
- `encodeYjsSnapshot(doc)`
- `decodeYjsSnapshot(snapshot)`
- `applyYjsSnapshot(doc, snapshot)`
- `getCurrentSnapshot(doc)`
- `createDocWithSnapshot(snapshot?)`

#### `src/lib/mapId.ts`
- `formatMapId(id)`
- `parseMapId(raw)`

#### `src/lib/presence.ts`
- `generateUserColor()`
- `setupAwareness(awareness, presence)`
- `getRemoteUsers(awareness, localClientId?)`

#### `src/components/RealtimeProvider.tsx`
- `useRealtime()`
- `RealtimeProvider(props)`

#### `src/components/PresenceBar.tsx`
- `PresenceBar({ compact })`

#### `src/features/flow/flow-edge-routing.ts`
- `buildAdaptiveRoutedEdges(edges, nodes)`

#### `src/features/flow/flow-node-placement.ts`
- `getNodeSize(node)`
- `getNodeCenter(node)`
- `snapToGridPosition(position)`
- `getWorkspaceExtent(nodes)`
- `findOpenPosition(position, nodes, shift?)`
- `hasSiblingOverlap(parentId, nodes, edges)`
- `spreadChildrenForParent(parentId, nodes, edges)`
- `spreadChildrenForAllParents(nodes, edges)`
- `getUpdatedNodePositions(before, after)`

#### `src/features/flow/flow-workspace.tsx`
- `FlowWorkspace(props)`

#### `src/features/flow/flow-node-card.tsx`
- `NodeActionContext`
- `FlowNodeCard(props)`

#### `src/features/flow/flow-edge-hierarchy.tsx`
- `FlowEdgeHierarchy(props)`

#### `src/features/flow/flow-toolbar-desktop.tsx`
- `FlowToolbarDesktop(props)`

#### `src/features/flow/flow-toolbar-mobile.tsx`
- `FlowToolbarMobile(props)`

### 5) Aturan Routing Konektor (Current Behavior)
- Same-row ketat: side-to-side langsung (horizontal direct).
- Tidak sejajar: elbow orthogonal (horizontal lalu naik/turun).
- Parent multi-child vertikal: bus horizontal bersama + drop vertikal ke child.
- Plain orthogonal line (tanpa arrowhead).

### 6) Aturan Placement
- Posisi node hasil simpan dipertahankan saat reload.
- Overlap node tidak lagi memicu auto-reposition massal, agar layout asli tidak tiba-tiba berubah.
- Utility spread tetap tersedia di modul placement untuk kebutuhan manual/terkontrol.
- Update posisi saat drag dipersist saat drag selesai (lebih ringan dan mengurangi lag realtime).

### 7) Environment Variables
```env
DATABASE_URL="postgresql://user:password@host:5432/chartmaker"
NEXT_PUBLIC_WEBRTC_URL="wss://your-signaling-service.up.railway.app"
NEXT_PUBLIC_API_URL="http://localhost:3000"
```

### 8) Menjalankan Lokal
```bash
npm install
npm run install:signaling
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```

Jalankan signaling lokal:
```bash
npm run dev:signaling
```

### 9) Validation Gate (Anti Domino Error)
Jalankan sebelum push:
```bash
npm run lint
npm run test:unit
npm run build
```

### 10) Railway (Satu Repo, Dua Service)
Gunakan repo yang sama, pisah service:
- Web app service:
  - Root directory: `/`
  - Build: `npm run build`
  - Start: `npm run start`
- Signaling service:
  - Root directory: `/signaling-server`
  - Build: `npm install`
  - Start: `npm run start`

Set env di web app:
```env
NEXT_PUBLIC_WEBRTC_URL="wss://<service-signaling>.up.railway.app"
```

---

## English

### 1) Overview
- Real-time collaborative concept-map editor.
- Adaptive orthogonal connectors with hierarchy-aware routing.
- Yjs snapshot persistence to PostgreSQL.
- Workspace-first responsive UI.

### 2) 404 `/api/maps/0001` Root Cause and Fix
Previous issue:
- Opening `/editor/0001` requested a map that did not exist yet, causing `404`.
- Realtime init then failed due to failed map fetch.

Current fix:
- `GET /api/maps/[id]?ensure=1` auto-creates missing map IDs.
- Editor and edit-mode realtime now use `ensure=1`.
- `POST /api/maps/save` uses upsert to prevent save-time 404 for newly opened IDs.

### 3) Current Architecture
- App routes: `src/app/editor/[mapId]/page.tsx`, `src/app/view/[mapId]/page.tsx`
- APIs: `src/app/api/maps/route.ts`, `src/app/api/maps/[id]/route.ts`, `src/app/api/maps/save/route.ts`
- Realtime: `src/components/RealtimeProvider.tsx`
- Presence UI: `src/components/PresenceBar.tsx`
- Flow modules: `src/features/flow/*`
- Shared libs: `src/lib/snapshot.ts`, `src/lib/mapId.ts`, `src/lib/presence.ts`, `src/lib/prisma.ts`

### 4) Core Runtime Rules
- Strict same-row sibling alignment -> direct side-to-side connector.
- Non-aligned nodes -> orthogonal elbow connector.
- Multi-child vertical hierarchy -> shared bus + vertical drops.
- Persisted layout is preserved on reload, and overlap does not trigger automatic mass re-layout.

### 5) Local Commands
```bash
npm run dev
npm run dev:signaling
npm run lint
npm run test:unit
npm run build
npm run start
```

### 6) Deployment Notes
- Vercel for web app.
- Railway signaling service with `wss://...up.railway.app`.
- Set `NEXT_PUBLIC_WEBRTC_URL` in production and redeploy web app.
