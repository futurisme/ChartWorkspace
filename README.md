# ChartMaker - Real-time Collaborative Concept Map Editor

A production-ready Next.js 14 web application for creating and sharing hierarchical concept maps with true real-time collaboration, conflict-free editing, and live presence awareness.

## Features

✅ **Real-time Collaboration** - Multiple users editing simultaneously with instant sync  
✅ **Conflict-Free Editing (CRDT)** - Powered by Yjs for automatic conflict resolution  
✅ **Live Presence** - See who's online, their cursor position, and edit mode  
✅ **WebRTC P2P Sync** - Decentralized real-time synchronization  
✅ **Auto-Save** - Interval + debounced snapshot persistence to database  
✅ **State Recovery** - Exact state restoration on page reload  
✅ **Editor vs Viewer Modes** - Granular permission control  
✅ **Optimized for Low-End Devices** - Minimal bundle, efficient rendering  
✅ **Production-Grade** - Typesafe, tested, scalable architecture

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React 19, TypeScript
- **Editor**: React Flow 11 (node-based UI)
- **Styling**: Tailwind CSS 3.4
- **Real-time**: Yjs 13.6 (CRDT) + y-webrtc 10.3 (P2P sync)
- **Database**: PostgreSQL (Prisma ORM)
- **Hosting**: Vercel (frontend) + Railway (database)

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 12+ (or Railway account)
- npm or yarn

### 1. Installation

```bash
# Clone repository
git clone https://github.com/yourusername/chartmaker.git
cd chartmaker

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local

# Edit .env.local with your PostgreSQL connection
DATABASE_URL="postgresql://user:password@host:5432/chartmaker"
NEXT_PUBLIC_WEBRTC_URL="wss://signaling.yjs.dev" # or your own signaling server
NEXT_PUBLIC_API_URL="http://localhost:3000"
```

### 2. Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init

# (Optional) Seed database
npx prisma db seed
```

### 3. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 4. Build for Production

```bash
npm run build
npm start
```

## Architecture

### Real-time Sync Flow

```
User Edit → React Flow UI
    ↓
Yjs Document (CRDT)
    ↓
WebRTC Provider (p2p sync)
    ↓
Remote Peers + Local Snapshot
    ↓
Auto-Save Worker
    ↓
PostgreSQL (permanent storage)
```

### Key Modules

**`/lib/yjs.ts`** - Yjs document creation and node/edge management  
**`/lib/snapshot.ts`** - Encode/decode snapshots (base64 serialization)  
**`/lib/presence.ts`** - User awareness API and presence state  
**`/lib/prisma.ts`** - Serverless-safe Prisma client  
**`/components/RealtimeProvider.tsx`** - Context + WebRTC setup  
**`/components/ConceptFlow.tsx`** - React Flow ↔ Yjs binding  
**`/components/PresenceBar.tsx`** - Live user presence UI  
**`/app/api/maps/route.ts`** - Create new maps  
**`/app/api/maps/[id]/route.ts`** - Fetch snapshot  
**`/app/api/maps/save/route.ts`** - Save snapshot with versioning

### Data Model

```prisma
model Map {
  id        String   @id @default(uuid())
  title     String
  snapshot  Json     // base64 Yjs update
  version   Int      @default(1)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@index([updatedAt])
}
```

### Presence Data

Each connected user broadcasts via Yjs Awareness:

```typescript
interface UserPresence {
  userId: string;           // unique ID
  displayName: string;      // user name
  color: string;            // avatar color
  mode: 'edit' | 'view';    // permission level
  currentNodeId?: string;   // selected node
  cursorX?: number;         // optional cursor position
  cursorY?: number;
  lastUpdated: number;      // timestamp
}
```

## Deployment

### Vercel (Frontend)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Configure environment variables in Vercel dashboard
NEXT_PUBLIC_WEBRTC_URL=https://your-signaling-server
DATABASE_URL=postgresql://...
```

### Railway (PostgreSQL)

1. Create account at [railway.app](https://railway.app)
2. Create PostgreSQL plugin
3. Copy `DATABASE_URL` to Vercel environment
4. Run migrations: `npx prisma migrate deploy`

### Custom Signaling Server (Optional)

For production, host your own Yjs signaling server:

```bash
npm install ws yjs lib0

# Use y-webrtc's signaling server or create custom
# See: https://github.com/yjs/y-webrtc#signaling-server

# Set NEXT_PUBLIC_WEBRTC_URL to your server
```

## API Routes

### `POST /api/maps`

Create a new concept map.

**Request:**
```json
{
  "title": "System Design"
}
```

**Response:**
```json
{
  "id": "uuid",
  "title": "System Design"
}
```

### `GET /api/maps/[id]`

Fetch map snapshot.

**Response:**
```json
{
  "id": "uuid",
  "title": "System Design",
  "snapshot": "base64_encoded_yjs_update",
  "version": 5,
  "updatedAt": "2026-02-09T10:00:00Z"
}
```

### `POST /api/maps/save`

Save snapshot with optimistic locking.

**Request:**
```json
{
  "id": "uuid",
  "snapshot": "base64_encoded_update",
  "version": 5
}
```

**Response (Success):**
```json
{
  "id": "uuid",
  "version": 6,
  "updatedAt": "2026-02-09T10:05:00Z"
}
```

**Response (Version Conflict):**
```json
{
  "error": "Version conflict",
  "currentVersion": 7,
  "submittedVersion": 5
}
```

## Save Strategy

### Interval Save
- Every 15 seconds, snapshot is persisted
- Debounced on edits (wait 10s after last change)

### Event Save
- On page unload (`beforeunload`)
- On visibility change
- Manual user trigger

### Versioning
- Incremented on each save
- Prevents overwrite races
- Automatic conflict detection

## Performance Optimizations

1. **React Flow Memoization** - `useCallback`, `useMemo` to prevent re-renders
2. **Yjs Awareness Updates** - Debounced presence broadcasts
3. **Snapshot Encoding** - Binary (base64) for minimal size
4. **Lazy Loading** - Code splitting with Next.js dynamic imports
5. **Database Indexing** - `updatedAt` index for fast queries

## Development

### Running Tests

```bash
npm run test
```

### Type Checking

```bash
npm run type-check
```

### Linting

```bash
npm run lint
```

### Database Inspection

```bash
npx prisma studio
```

## Troubleshooting

### WebRTC Not Connecting

- Check `NEXT_PUBLIC_WEBRTC_URL` is accessible
- Verify firewall allows WebRTC
- Check browser console for network errors
- Try public signaling server: `wss://signaling.yjs.dev`

### Database Migration Issues

```bash
# Reset database (⚠️ deletes all data)
npx prisma migrate reset

# View migration history
npx prisma migrate status
```

### Stale Presence Data

Presence automatically cleans up after 30 seconds of inactivity. Manual cleanup:

```typescript
import { pruneStalePresence } from '@/lib/presence';

pruneStalePresence(awareness, 30000); // 30 second TTL
```

## Security Considerations

- **Authentication**: Currently uses localStorage userId. In production:
  - Integrate with Auth0, NextAuth, or Clerk
  - Validate user permissions on backend
  - Encrypt sensitive data in Yjs update

- **Authorization**: Implement row-level security in Prisma
  ```prisma
  model Map {
    ...
    ownerId   String
    owner     User @relation(fields: [ownerId], references: [id])
    members   User[] @relation("MapMembers")
  }
  ```

- **Rate Limiting**: Add API rate limiting middleware
  ```typescript
  import { Ratelimit } from '@upstash/ratelimit';
  ```

- **Input Validation**: Validate all snapshot sizes and versions

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit changes: `git commit -am 'Add feature'`
4. Push: `git push origin feature/your-feature`
5. Submit a pull request

## License

MIT License - see LICENSE file

## Support

- 📖 [Yjs Docs](https://docs.yjs.dev)
- 🔗 [React Flow Docs](https://reactflow.dev)
- 🚀 [Next.js Docs](https://nextjs.org/docs)
- 📦 [Prisma Docs](https://www.prisma.io/docs)

## Changelog

### v0.1.0 (2026-02-09)
- Initial release
- Real-time CRDT collaboration
- WebRTC P2P sync
- Live presence UI
- Auto-save with versioning
- Editor & viewer modes
