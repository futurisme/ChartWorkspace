# ChartMaker - Real-time Collaborative Concept Map Editor

## Bahasa Indonesia

### Ringkasan
ChartMaker adalah editor peta konsep kolaboratif real-time berbasis Next.js, React Flow, Yjs, dan Prisma.

### Fitur Utama
- Kolaborasi real-time (Yjs + WebRTC)
- Auto-save snapshot ke PostgreSQL
- Presence (online, mode edit/view)
- Routing garis orthogonal adaptif
- Auto-spread child ketika sibling berdekatan
- Workspace-first UI dengan panel/dock collapsible (desktop + mobile)

### Aturan Routing Garis (Auto Connector)
- Vertikal: `middle-to-middle` (bottom-center source ke top-center target)
- Horizontal: `side-to-side` (center side source ke center side target)
- Parent dengan >= 2 child:
  - Parent menuju jalur bus horizontal
  - Bus horizontal ke posisi atas tiap child
  - Lalu drop vertikal tepat ke top-center child
- Semua edge mengikuti adaptive orthogonal routing

### Arsitektur Baru (Flow Feature Modules)
- `src/features/flow/flow-workspace.tsx`
  Orkestrator editor flow, binding Yjs, modal, panel, React Flow canvas.
- `src/features/flow/flow-edge-routing.ts`
  Engine adaptive orthogonal routing + bus sibling.
- `src/features/flow/flow-edge-hierarchy.tsx`
  Renderer edge polyline orthogonal dari route points.
- `src/features/flow/flow-node-placement.ts`
  Utility node placement, workspace extent, overlap detection, auto-spread sibling.
- `src/features/flow/flow-node-card.tsx`
  Komponen node + color toolbar.
- `src/features/flow/flow-toolbar-desktop.tsx`
  Panel aksi desktop collapsible.
- `src/features/flow/flow-toolbar-mobile.tsx`
  Bottom dock mobile collapsible.
- `src/features/flow/flow-constants.ts`
  Konstanta flow.
- `src/features/flow/flow-types.ts`
  Type shared flow.

### Peta File Kunci
- Realtime provider: `src/components/RealtimeProvider.tsx`
- Presence bar: `src/components/PresenceBar.tsx`
- Editor page: `src/app/editor/[mapId]/page.tsx`
- Viewer page: `src/app/view/[mapId]/page.tsx`
- API create map: `src/app/api/maps/route.ts`
- API get map: `src/app/api/maps/[id]/route.ts`
- API save map: `src/app/api/maps/save/route.ts`
- Map ID utils: `src/lib/mapId.ts`
- Snapshot utils: `src/lib/snapshot.ts`
- Prisma schema: `prisma/schema.prisma`

### Unit Test Baru
- `src/features/flow/flow-edge-routing.test.ts`
- `src/features/flow/flow-node-placement.test.ts`

### Setup Cepat
1. Install
```bash
npm install
cp .env.example .env.local
```

2. Isi `.env.local`
```env
DATABASE_URL="postgresql://user:password@host:5432/chartmaker"
NEXT_PUBLIC_WEBRTC_URL="wss://your-signaling-server"
NEXT_PUBLIC_API_URL="http://localhost:3000"
```

3. Generate Prisma + migrasi local
```bash
npx prisma generate
npx prisma migrate dev --name init
```

4. Jalankan aplikasi
```bash
npm run dev
```

### Validation & Safety Checks (Anti Domino Error)
Jalankan setiap selesai perubahan besar:
```bash
npm run lint
npm run test:unit
npm run build
```

---

## English

### Summary
ChartMaker is a real-time collaborative concept-map editor built with Next.js, React Flow, Yjs, and Prisma.

### Highlights
- Real-time collaboration (Yjs + WebRTC)
- Snapshot auto-save to PostgreSQL
- Live presence (edit/view modes)
- Adaptive orthogonal connector routing
- Automatic child spreading for crowded sibling nodes
- Workspace-focused UI with collapsible desktop/mobile controls

### Connector Routing Rules
- Vertical relation: middle-to-middle (source bottom-center to target top-center)
- Horizontal relation: side-to-side (source side-center to target side-center)
- Parent with >=2 children:
  - Parent goes to a shared horizontal bus
  - Bus routes over each child top center
  - Vertical drop to each child top center
- Applied to all edges in adaptive mode

### New Architecture (Flow Modules)
- `src/features/flow/flow-workspace.tsx`
- `src/features/flow/flow-edge-routing.ts`
- `src/features/flow/flow-edge-hierarchy.tsx`
- `src/features/flow/flow-node-placement.ts`
- `src/features/flow/flow-node-card.tsx`
- `src/features/flow/flow-toolbar-desktop.tsx`
- `src/features/flow/flow-toolbar-mobile.tsx`
- `src/features/flow/flow-constants.ts`
- `src/features/flow/flow-types.ts`

### Key Commands
```bash
npm run dev
npm run lint
npm run test:unit
npm run build
npm run start
```

### License
MIT
