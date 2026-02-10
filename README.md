# ChartMaker - Real-time Collaborative Concept Map Editor

A Next.js web app for creating and sharing hierarchical concept maps with real-time collaboration, conflict-free editing, and live presence.

## Features

- Real-time collaboration (Yjs + WebRTC)
- Conflict-free editing (CRDT)
- Live presence and editor/viewer modes
- Auto-save with snapshot persistence
- Optimized React Flow editor

## Tech Stack

- Next.js 14 (App Router)
- React + TypeScript
- React Flow
- Yjs + y-webrtc
- PostgreSQL + Prisma
- Tailwind CSS

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 12+
- npm

### 1. Install

```bash
npm install
cp .env.example .env.local
```

### 2. Configure `.env.local`

```env
DATABASE_URL="postgresql://user:password@host:5432/chartmaker"
NEXT_PUBLIC_WEBRTC_URL="wss://signaling.yjs.dev"
NEXT_PUBLIC_API_URL="http://localhost:3000"
```

### 3. Setup Database

```bash
npx prisma generate
npx prisma migrate dev --name init
```

### 4. Run

```bash
npm run dev
```

Open `http://localhost:3000`.

## Map IDs and URLs

Map IDs are numeric in the database and rendered as zero-padded strings in URLs for shorter links, for example:

- `http://localhost:3000/editor/0001`

The API accepts padded IDs and returns padded IDs.

## Architecture Overview

```
User edits -> React Flow
          -> Yjs document (CRDT)
          -> WebRTC provider (p2p sync)
          -> Auto-save snapshots -> PostgreSQL
```

## Key Modules

- `src/components/RealtimeProvider.tsx` - Yjs + WebRTC setup and presence
- `src/components/ConceptFlow.tsx` - React Flow editor and Yjs binding
- `src/components/PresenceBar.tsx` - Live presence UI
- `src/lib/snapshot.ts` - Snapshot encode/decode helpers
- `src/lib/presence.ts` - Presence helpers
- `src/lib/mapId.ts` - Map ID formatting/parsing
- `src/app/api/maps/route.ts` - Create new maps
- `src/app/api/maps/[id]/route.ts` - Fetch snapshot
- `src/app/api/maps/save/route.ts` - Save snapshot

## Data Model

```prisma
model Map {
  id        Int      @id @default(autoincrement())
  title     String
  snapshot  Json
  version   Int      @default(1)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

## API

### `POST /api/maps`

Request:
```json
{ "title": "System Design" }
```

Response:
```json
{ "id": "0001", "title": "System Design" }
```

### `GET /api/maps/[id]`

Response:
```json
{
  "id": "0001",
  "title": "System Design",
  "snapshot": "base64_encoded_yjs_update",
  "version": 5,
  "updatedAt": "2026-02-09T10:00:00Z"
}
```

### `POST /api/maps/save`

Request:
```json
{ "id": "0001", "snapshot": "base64_encoded_update", "version": 5 }
```

Response:
```json
{ "id": "0001", "version": 6, "updatedAt": "2026-02-09T10:05:00Z" }
```

## Development

- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run lint`

## Deployment

- Frontend: Vercel
- Database: Railway or any PostgreSQL provider
- Set env vars in your hosting provider

## License

MIT
