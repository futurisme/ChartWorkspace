import { prisma } from '@/lib/prisma';
import { createDocWithSnapshot, getCurrentSnapshot } from '@/features/maps/shared/map-snapshot';
import { formatMapId, parseMapId } from '@/features/maps/shared/map-id';

export const MAPS_LIST_CACHE_CONTROL = 'public, s-maxage=30, stale-while-revalidate=120';
export const MAP_DETAIL_CACHE_CONTROL = 'public, s-maxage=15, stale-while-revalidate=60';
export const NO_STORE_CACHE_CONTROL = 'no-store';

const DEFAULT_LIST_LIMIT = 24;
const MAX_LIST_LIMIT = 50;

export class MapServiceError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
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

  const maps = await prisma.map.findMany({
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
  });

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

  const created = await prisma.map.create({
    data: {
      title,
      snapshot: getCurrentSnapshot(doc),
      version: 1,
    },
  });

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

  let map = await prisma.map.findUnique({ where: { id: numericId } });

  if (!map && ensureMap) {
    const freshDoc = createDocWithSnapshot();
    map = await prisma.map.upsert({
      where: { id: numericId },
      create: {
        id: numericId,
        title: `Map ${formatMapId(numericId)}`,
        snapshot: getCurrentSnapshot(freshDoc),
        version: 1,
      },
      update: {},
    });
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

  const updated = await prisma.map.upsert({
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
  });

  return {
    id: formatMapId(updated.id),
    version: updated.version,
    updatedAt: updated.updatedAt,
  };
}
