import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { createDocWithSnapshot, getCurrentSnapshot } from '@/features/maps/shared/map-snapshot';
import { formatMapId, parseMapId } from '@/features/maps/shared/map-id';

export const MAPS_LIST_CACHE_CONTROL = 'public, s-maxage=30, stale-while-revalidate=120';
export const MAP_DETAIL_CACHE_CONTROL = 'public, s-maxage=15, stale-while-revalidate=60';
export const NO_STORE_CACHE_CONTROL = 'no-store';

const DEFAULT_LIST_LIMIT = 24;
const MAX_LIST_LIMIT = 50;

type InMemoryMap = {
  id: number;
  title: string;
  snapshot: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
};

const inMemoryMaps = new Map<number, InMemoryMap>();

function isRecoverableDatabaseError(error: unknown) {
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return true;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return ['P1001', 'P2021', 'P2022'].includes(error.code);
  }

  const message = error instanceof Error ? error.message.toLowerCase() : '';
  return message.includes("can't reach database server") || message.includes('database configuration missing');
}

function ensureInMemoryMap(id: number) {
  const existing = inMemoryMaps.get(id);
  if (existing) {
    return existing;
  }

  const now = new Date();
  const doc = createDocWithSnapshot();
  const created: InMemoryMap = {
    id,
    title: `Map ${formatMapId(id)}`,
    snapshot: getCurrentSnapshot(doc),
    version: 1,
    createdAt: now,
    updatedAt: now,
  };
  inMemoryMaps.set(id, created);
  return created;
}

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

  let maps: Array<{ id: number; title: string; updatedAt: Date }> = [];
  try {
    maps = await prisma.map.findMany({
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
  } catch (error) {
    if (!isRecoverableDatabaseError(error)) {
      throw error;
    }

    maps = Array.from(inMemoryMaps.values())
      .filter((map) =>
        normalizedQuery
          ? map.title.toLowerCase().includes(normalizedQuery.toLowerCase())
          : true
      )
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(0, limit)
      .map((map) => ({ id: map.id, title: map.title, updatedAt: map.updatedAt }));
  }

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

  let created: { id: number; title: string };
  try {
    created = await prisma.map.create({
      data: {
        title,
        snapshot: getCurrentSnapshot(doc),
        version: 1,
      },
      select: {
        id: true,
        title: true,
      },
    });
  } catch (error) {
    if (!isRecoverableDatabaseError(error)) {
      throw error;
    }

    const nextId = (Math.max(0, ...inMemoryMaps.keys()) || 0) + 1;
    const now = new Date();
    const fallbackMap: InMemoryMap = {
      id: nextId,
      title,
      snapshot: getCurrentSnapshot(doc),
      version: 1,
      createdAt: now,
      updatedAt: now,
    };
    inMemoryMaps.set(nextId, fallbackMap);
    created = { id: nextId, title };
  }

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

  let map: InMemoryMap | { id: number; title: string; snapshot: unknown; version: number; updatedAt: Date } | null = null;
  try {
    map = await prisma.map.findUnique({ where: { id: numericId } });

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
  } catch (error) {
    if (!isRecoverableDatabaseError(error)) {
      throw error;
    }

    map = ensureMap ? ensureInMemoryMap(numericId) : inMemoryMaps.get(numericId) ?? null;
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

  let updated: { id: number; version: number; updatedAt: Date };
  try {
    updated = await prisma.map.upsert({
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
      select: {
        id: true,
        version: true,
        updatedAt: true,
      },
    });
  } catch (error) {
    if (!isRecoverableDatabaseError(error)) {
      throw error;
    }

    const existing = ensureInMemoryMap(numericId);
    existing.snapshot = rawSnapshot;
    existing.updatedAt = new Date();
    existing.version += 1;
    inMemoryMaps.set(numericId, existing);
    updated = {
      id: existing.id,
      version: existing.version,
      updatedAt: existing.updatedAt,
    };
  }

  return {
    id: formatMapId(updated.id),
    version: updated.version,
    updatedAt: updated.updatedAt,
  };
}
