# ChartMaker - Project Overview & File Structure

## 📂 Complete Project File Structure

```
c:\Users\fadhi\ChartMaker\
│
├── 📋 SETUP_MANUAL.md ..................... PANDUAN LENGKAP SETUP (Baca ini!)
├── 📋 DATABASE_SETUP.md .................. Panduan PostgreSQL detail
├── 📋 QUICK_START.md ..................... Quick reference (5 menit)
├── 📋 README.md .......................... Documentation & deployment
│
├── 📁 src/ ............................... Source code
│   ├── 📁 app/ ........................... Next.js App Router
│   │   ├── 📝 page.tsx .................. Landing page (home)
│   │   ├── 📝 layout.tsx ................ Root layout (wrapper semua page)
│   │   ├── 📝 globals.css ............... Global styles
│   │   │
│   │   ├── 📁 api/ ...................... REST API routes
│   │   │   └── 📁 maps/
│   │   │       ├── 📝 route.ts .......... POST /api/maps (create map)
│   │   │       ├── 📁 [id]/
│   │   │       │   └── 📝 route.ts ..... GET /api/maps/[id] (fetch snapshot)
│   │   │       └── 📁 save/
│   │   │           └── 📝 route.ts ..... POST /api/maps/save (save snapshot)
│   │   │
│   │   ├── 📁 editor/[mapId]/ ........... Editor page (EDIT MODE)
│   │   │   └── 📝 page.tsx
│   │   │       └── Shows RealtimeProvider + ConceptFlow + PresenceBar
│   │   │
│   │   └── 📁 view/[mapId]/ ............. Viewer page (READ-ONLY MODE)
│   │       └── 📝 page.tsx
│   │           └── Shows same UI tapi isReadOnly={true}
│   │
│   ├── 📁 components/ ................... React components
│   │   ├── 📝 RealtimeProvider.tsx ...... Context untuk Yjs + WebRTC
│   │   │   └── Setup doc, provider, awareness, presence sync
│   │   │
│   │   ├── 📝 ConceptFlow.tsx ........... React Flow editor UI
│   │   │   └── Node + edge management, Yjs binding
│   │   │
│   │   └── 📝 PresenceBar.tsx ........... Live user presence
│   │       └── Menampilkan online users dengan avatar & status
│   │
│   └── 📁 lib/ .......................... Business logic
│       ├── 📝 prisma.ts ................. Database client (serverless-safe)
│       │   └── Singleton PrismaClient
│       │
│       ├── 📝 yjs.ts ................... Yjs document operations
│       │   └── addNode(), addEdge(), getNodes(), getEdges()
│       │
│       ├── 📝 snapshot.ts .............. Encode/decode snapshots
│       │   └── getCurrentSnapshot(), createDocWithSnapshot(), applySnapshot()
│       │
│       └── 📝 presence.ts .............. User presence management
│           └── setupAwareness(), getRemoteUsers(), onPresenceChange()
│
├── 📁 prisma/ ............................. Prisma ORM config
│   └── 📝 schema.prisma ................. Database schema
│       └── model Map { ... }
│
├── 📝 package.json ....................... npm dependencies & scripts
├── 📝 tsconfig.json ...................... TypeScript config
├── 📝 next.config.js ..................... Next.js configuration
├── 📝 tailwind.config.ts ................. Tailwind CSS config
├── 📝 postcss.config.js .................. PostCSS config (for Tailwind)
├── 📝 .eslintrc.json ..................... ESLint linting config
│
├── 📝 .env.example ....................... Template environment variables
├── 📝 .env.local (CREATE THIS!) .......... Local environment variables
├── 📝 .gitignore ......................... Git ignore rules
│
└── 📝 next-env.d.ts ...................... Next.js TypeScript definitions

```

---

## 🔑 File-File Penting

### 1. **`.env.local`** (Kritis! Harus dibuat)
```env
DATABASE_URL="postgresql://..."
NEXT_PUBLIC_API_URL="http://localhost:3000"
NEXT_PUBLIC_WEBRTC_URL="wss://signaling.yjs.dev"
```
- Menyimpan credentials sensitif
- JANGAN commit ke Git (sudah di .gitignore)
- Beda untuk development vs production

### 2. **`prisma/schema.prisma`** (Database definition)
```prisma
model Map {
  id        String   @id @default(uuid())
  title     String
  snapshot  Json     // Yjs update as base64
  version   Int      @default(1)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### 3. **`src/components/RealtimeProvider.tsx`** (Core realtime logic)
- Setup Yjs document
- Connect WebRTC provider
- Auto-save scheduler
- Presence synchronization

### 4. **`src/components/ConceptFlow.tsx`** (Editor UI)
- React Flow canvas
- Node + edge operations
- Yjs synchronization
- Handle user interactions

### 5. **`src/lib/snapshot.ts`** (Persistence logic)
- `getCurrentSnapshot()` - Encode Yjs to base64
- `applySnapshot()` - Decode base64 to Yjs
- Save/load dari database

### 6. **`src/app/api/maps/save/route.ts`** (API untuk save)
- POST endpoint untuk save snapshot
- Version checking (conflict detection)
- Database update

---

## 🔄 Data Flow Diagram

### User Creates/Updates Node:

```
┌─ React Flow UI (ConceptFlow.tsx)
│  └─ User click "Add Concept" or move node
│
├─ Update Yjs Document (RealtimeProvider.tsx)
│  └─ doc.getMap('nodes').set(nodeId, nodeData)
│
├─ Auto-sync via WebRTC (y-webrtc)
│  └─ Peer 1 ←→ Peer 2 (instant sync)
│
├─ Debounced Snapshot Save (RealtimeProvider.tsx)
│  └─ Wait 10s after last change
│
├─ POST /api/maps/save
│  └─ Send snapshot + version to server
│
└─ PostgreSQL Database
   └─ Update Map.snapshot + incremented version
```

### User Joins Session:

```
1. Open http://localhost:3000/editor/[mapId]

2. RealtimeProvider.tsx:
   ├─ Fetch snapshot dari GET /api/maps/[mapId]
   ├─ Create Yjs doc
   ├─ Apply snapshot to doc
   ├─ Connect WebRTC provider
   └─ Setup Awareness (presence)

3. ConceptFlow.tsx:
   ├─ Read nodes/edges dari Yjs doc
   ├─ Render React Flow UI

4. PresenceBar.tsx:
   └─ Show online users dari Awareness

5. WebRTC Provider:
   ├─ Discovery peers in room 'chartmaker-[mapId]'
   ├─ Sync latest updates from peers
   └─ Listen untuk changes dari peers
```

---

## 🎯 Key Concepts

### Yjs (CRDT - Conflict-free Replicated Data Type)
- Decentralized data structure
- Automatically resolves conflicts
- Multiple users dapat edit simultaneously tanpa clash
- Stored as binary updates (base64 encoded)

**Example:**
```typescript
const doc = new Y.Doc();
const nodes = doc.getMap('nodes');

// User 1:
nodes.set('node-1', new Y.Map().set('label', 'Concept A'));

// User 2 (same time):
nodes.set('node-2', new Y.Map().set('label', 'Concept B'));

// Result: Both nodes exist (no conflict!)
// CRDT makes this possible
```

### WebRTC (Peer-to-Peer)
- Direct browser-to-browser communication
- No server involvement (async realtime)
- Less latency than client-server
- Works via signaling server (only for connection setup)

**Flow:**
```
Browser 1 ←→ Signaling Server (setup only)
    ↓ (connection established)
Browser 1 ←─────────────→ Browser 2 (direct P2P)
```

### Snapshot Strategy
- Save full state periodically (interval)
- Also save on changes (debounced)
- Version number prevents overwrites
- Base64 encoding untuk JSON storage

**Example:**
```typescript
// Yjs binary update → base64
const snapshot = Y.encodeStateAsUpdate(doc);
const base64 = Buffer.from(snapshot).toString('base64');

// Later: base64 → Yjs document
const update = Buffer.from(base64, 'base64');
Y.applyUpdate(doc, new Uint8Array(update));
```

---

## 🚀 Development Workflow

### Starting Development:
```bash
# 1. Ensure PostgreSQL running
# 2. cd c:\Users\fadhi\ChartMaker
# 3. npm run dev
# 4. Open http://localhost:3000
# 5. Create map
# 6. Open in another browser window → see real-time sync
```

### Making Changes:

**If editing React Component:**
```typescript
// src/components/ConceptFlow.tsx
// Save → Auto hot-reload (no refresh needed)
```

**If editing API Route:**
```typescript
// src/app/api/maps/route.ts
// Save → Need manual refresh (API changes reload required)
```

**If editing Prisma Schema:**
```bash
# prisma/schema.prisma
# 1. Make changes
# 2. npx prisma db push (sync database)
# 3. npx prisma generate (regenerate types)
```

**If editing Environment Variables:**
```bash
# .env.local
# 1. Update file
# 2. STOP npm run dev (Ctrl + C)
# 3. npm run dev (restart with new env)
```

---

## 📊 Component Communication

```
App Layout (src/app/layout.tsx)
     ↓
Editor Page (src/app/editor/[mapId]/page.tsx)
     ↓
RealtimeProvider (Context Provider)
├─ Yjs document state
├─ WebRTC provider instance
├─ User presence
├─ Auto-save scheduler
│
└─ Child Components (useRealtime())
   ├── ConceptFlow.tsx (Editor UI)
   │   ├─ Reads: doc, updatePresence()
   │   ├─ Writes: doc edits, node selection
   │   └─ Renders: React Flow with nodes/edges
   │
   └── PresenceBar.tsx (Live Users)
       ├─ Reads: remoteUsers, localPresence, isConnected
       └─ Renders: User avatars + online status
```

---

## ✅ Checklist: Apa Yang Sudah Ada

```
✅ Next.js 14 App Router setup
✅ Tailwind CSS configured
✅ React Flow component created
✅ Yjs document structure defined
✅ WebRTC provider integrated
✅ Presence system implemented
✅ Database schema created
✅ API routes implemented
✅ Auto-save with versioning
✅ Environment configuration
✅ Production build configured
✅ Database migrations setup
✅ Error handling
✅ TypeScript strict mode
✅ ESLint configuration
✅ Documentation complete
```

---

## 🔍 Understanding Key Files by Purpose

### **I want to... → Edit this file**

| Goal | File |
|------|------|
| Add new node type | `src/components/ConceptFlow.tsx` |
| Change UI colors | `src/app/globals.css` or `tailwind.config.ts` |
| Modify API response | `src/app/api/maps/route.ts` |
| Change database fields | `prisma/schema.prisma` |
| Add user presence feature | `src/lib/presence.ts` |
| Change save strategy | `src/components/RealtimeProvider.tsx` |
| Add landing page content | `src/app/page.tsx` |
| Fix Yjs sync | `src/lib/yjs.ts` |
| Encode snapshots differently | `src/lib/snapshot.ts` |
| Add authentication | `src/lib/auth.ts` (create new) |

---

## 📚 File Dependencies

```
Main Flow:
package.json
  ↓ (dependencies)
src/
  ├─ app/editor/[mapId]/page.tsx (main editor page)
  │   ├─ components/RealtimeProvider.tsx (Yjs + WebRTC)
  │   │   ├─ lib/prisma.ts (DB client)
  │   │   ├─ lib/yjs.ts (doc structure)
  │   │   ├─ lib/snapshot.ts (encode/decode)
  │   │   └─ lib/presence.ts (user awareness)
  │   │
  │   ├─ components/ConceptFlow.tsx (React Flow UI)
  │   └─ components/PresenceBar.tsx (live users)
  │
  ├─ app/api/maps/route.ts (create map)
  │   └─ lib/prisma.ts
  │
  ├─ app/api/maps/[id]/route.ts (fetch snapshot)
  │   └─ lib/prisma.ts
  │
  └─ app/api/maps/save/route.ts (save snapshot)
      └─ lib/prisma.ts

prisma/
  └─ schema.prisma (DB definition)
      └─ relies on DATABASE_URL in .env.local

Configuration:
  ├─ .env.local (secret variables)
  ├─ tsconfig.json (TypeScript rules)
  ├─ tailwind.config.ts (CSS framework)
  ├─ next.config.js (Next.js settings)
  └─ package.json (npm scripts & dependencies)
```

---

## 🎓 Next Steps

1. **Read SETUP_MANUAL.md** - Panduan lengkap setup
2. **Read DATABASE_SETUP.md** - Setup PostgreSQL
3. **Run `npm run dev`** - Start development
4. **Play with UI** - Create maps, add nodes
5. **Open DevTools** - See Network/Console for debugging
6. **Read source code** - Understand how realtime works
7. **Deploy** - Follow README.md deployment section

---

**Happy Coding! 🚀**
