import { prisma } from '@/lib/prisma';
import { createDocWithSnapshot, getCurrentSnapshot } from '@/features/maps/shared/map-snapshot';
import { formatMapId, parseMapId } from '@/features/maps/shared/map-id';

export const MAPS_LIST_CACHE_CONTROL = 'public, s-maxage=30, stale-while-revalidate=120';
export const MAP_DETAIL_CACHE_CONTROL = 'public, s-maxage=15, stale-while-revalidate=60';
export const NO_STORE_CACHE_CONTROL = 'no-store';

const DEFAULT_LIST_LIMIT = 24;
const MAX_LIST_LIMIT = 50;

type StoredMap = {
  id: number;
  title: string;
  snapshot: unknown;
  version: number;
  createdAt: Date;
  updatedAt: Date;
};

const globalForMapFallback = global as unknown as {
  mapFallbackStore?: Map<number, StoredMap>;
  mapFallbackNextId?: number;
};

const mapFallbackStore = globalForMapFallback.mapFallbackStore ?? new Map<number, StoredMap>();
if (!globalForMapFallback.mapFallbackStore) {
  globalForMapFallback.mapFallbackStore = mapFallbackStore;
}

if (!globalForMapFallback.mapFallbackNextId) {
  globalForMapFallback.mapFallbackNextId = 1;
}

export class MapServiceError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

function isDatabaseConnectionError(error: unknown) {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const candidate = error as { code?: string; name?: string; message?: string };
  const code = candidate.code ?? '';
  const name = candidate.name ?? '';
  const message = candidate.message ?? '';

  return (
    code === 'P1001' ||
    code === 'P1000' ||
    name.includes('PrismaClientInitializationError') ||
    message.includes("Can't reach database server") ||
    message.includes('ECONNREFUSED')
  );
}

async function withDatabaseFallback<T>(databaseOperation: () => Promise<T>, fallbackOperation: () => T): Promise<T> {
  try {
    return await databaseOperation();
  } catch (error) {
    if (!isDatabaseConnectionError(error)) {
      throw error;
    }

    console.warn('[maps-service] Database unreachable, using in-memory map fallback store.');
    return fallbackOperation();
  }
}

function getNextFallbackMapId() {
  const nextId = globalForMapFallback.mapFallbackNextId ?? 1;
  globalForMapFallback.mapFallbackNextId = nextId + 1;
  return nextId;
}

export function parseListLimit(raw: string | null) {
  if (!raw) {
    return DEFAULT_LIST_LIMIT;
  }

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_LIST_LIMIT;
  }

  return Math.min(parsed, MAX_LIST_LIMIT);
}

export async function listMaps(query: string | null, limit: number) {
  const normalizedQuery = query?.trim();

  const maps = await withDatabaseFallback(
    () =>
      prisma.map.findMany({
        where: normalizedQuery
          ? {
              title: {
                contains: normalizedQuery,
                mode: 'insensitive',
              },
            }
          : undefined,
        orderBy: { updatedAt: 'desc' },
        take: limit,
        select: {
          id: true,
          title: true,
          updatedAt: true,
        },
      }),
    () => {
      const allMaps = [...mapFallbackStore.values()]
        .filter((map) => {
          if (!normalizedQuery) {
            return true;
          }

          return map.title.toLowerCase().includes(normalizedQuery.toLowerCase());
        })
        .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
        .slice(0, limit);

      return allMaps.map((map) => ({
        id: map.id,
        title: map.title,
        updatedAt: map.updatedAt,
      }));
    }
  );

  const newestUpdatedAt = maps[0]?.updatedAt;
  const etagSeed = `${normalizedQuery ?? ''}:${limit}:${maps.length}:${newestUpdatedAt?.getTime() ?? 0}`;

  return {
    maps: maps.map((map) => ({
      id: formatMapId(map.id),
      title: map.title,
      updatedAt: map.updatedAt,
    })),
    etag: `W/"maps-${Buffer.from(etagSeed).toString('base64url')}"`,
    lastModified: newestUpdatedAt?.toUTCString(),
    newestUpdatedAt,
  };
}

export async function createMap(rawTitle: unknown) {
  if (typeof rawTitle !== 'string' || !rawTitle.trim()) {
    throw new MapServiceError('Title is required', 400);
  }

  const title = rawTitle.trim();
  const doc = createDocWithSnapshot();
  doc.getText('title').insert(0, title);

  const snapshot = getCurrentSnapshot(doc);
  const created = await withDatabaseFallback(
    () =>
      prisma.map.create({
        data: {
          title,
          snapshot,
          version: 1,
        },
      }),
    () => {
      const id = getNextFallbackMapId();
      const now = new Date();
      const map: StoredMap = { id, title, snapshot, version: 1, createdAt: now, updatedAt: now };
      mapFallbackStore.set(id, map);
      return map;
    }
  );

  return {
    id: formatMapId(created.id),
    title: created.title,
  };
}

export async function getMapById(rawId: string, ensureMap: boolean) {
  const numericId = parseMapId(rawId);
  if (!numericId) {
    throw new MapServiceError('Invalid map ID', 400);
  }

  let map = await withDatabaseFallback(
    () => prisma.map.findUnique({ where: { id: numericId } }),
    () => mapFallbackStore.get(numericId) ?? null
  );

  if (!map && ensureMap) {
    const freshDoc = createDocWithSnapshot();
    const defaultMap: StoredMap = {
      id: numericId,
      title: `Map ${formatMapId(numericId)}`,
      snapshot: getCurrentSnapshot(freshDoc),
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    map = await withDatabaseFallback(
      () =>
        prisma.map.upsert({
          where: { id: numericId },
          create: {
            id: numericId,
            title: defaultMap.title,
            snapshot: defaultMap.snapshot as any,
            version: 1,
          },
          update: {},
        }),
      () => {
        const existing = mapFallbackStore.get(numericId);
        if (existing) {
          return existing;
        }

        mapFallbackStore.set(numericId, defaultMap);
        globalForMapFallback.mapFallbackNextId = Math.max(globalForMapFallback.mapFallbackNextId ?? 1, numericId + 1);
        return defaultMap;
      }
    );
  }

  if (!map) {
    throw new MapServiceError('Map not found', 404);
  }

  return {
    id: formatMapId(map.id),
    title: map.title,
    snapshot: map.snapshot,
    version: map.version,
    updatedAt: map.updatedAt,
    etag: `W/"map-${map.id}-v${map.version}"`,
  };
}

export async function saveMap(rawId: unknown, rawSnapshot: unknown) {
  if (typeof rawId !== 'string') {
    throw new MapServiceError('Invalid map ID', 400);
  }

  const numericId = parseMapId(rawId);
  if (!numericId) {
    throw new MapServiceError('Invalid map ID', 400);
  }

  if (typeof rawSnapshot !== 'string' || !rawSnapshot) {
    throw new MapServiceError('Invalid snapshot', 400);
  }

  try {
    Buffer.from(rawSnapshot, 'base64');
  } catch {
    throw new MapServiceError('Invalid snapshot format', 400);
  }

  const updated = await withDatabaseFallback(
    () =>
      prisma.map.upsert({
        where: { id: numericId },
        create: {
          id: numericId,
          title: `Map ${formatMapId(numericId)}`,
          snapshot: rawSnapshot,
          version: 1,
        },
        update: {
          snapshot: rawSnapshot,
          version: { increment: 1 },
          updatedAt: new Date(),
        },
      }),
    () => {
      const existing = mapFallbackStore.get(numericId);
      const now = new Date();

      if (!existing) {
        const created: StoredMap = {
          id: numericId,
          title: `Map ${formatMapId(numericId)}`,
          snapshot: rawSnapshot,
          version: 1,
          createdAt: now,
          updatedAt: now,
        };
        mapFallbackStore.set(numericId, created);
        globalForMapFallback.mapFallbackNextId = Math.max(globalForMapFallback.mapFallbackNextId ?? 1, numericId + 1);
        return created;
      }

      const next: StoredMap = {
        ...existing,
        snapshot: rawSnapshot,
        version: existing.version + 1,
        updatedAt: now,
      };
      mapFallbackStore.set(numericId, next);
      return next;
    }
  );

  return {
    id: formatMapId(updated.id),
    version: updated.version,
    updatedAt: updated.updatedAt,
  };
}
