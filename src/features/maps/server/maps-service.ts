import { activeDatabaseHost, prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
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

function getPrismaErrorCode(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError ? error.code : null;
}

function isDatabaseUnavailableError(error: unknown) {
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return true;
  }

  const code = getPrismaErrorCode(error);
  if (code === 'P1001') {
    return true;
  }

  const message = error instanceof Error ? error.message.toLowerCase() : '';
  return message.includes("can't reach database server") || message.includes('connection refused');
}

function isSchemaMissingError(error: unknown) {
  const code = getPrismaErrorCode(error);
  return code === 'P2021' || code === 'P2022';
}

function buildDatabaseUnavailableMessage() {
  const host = activeDatabaseHost ?? 'unknown-host';
  const railwayInternal = host.endsWith('.railway.internal');

  if (railwayInternal && process.env.NODE_ENV === 'production') {
    return `Database tidak bisa diakses (${host}). Host *.railway.internal bersifat private dan tidak bisa diakses dari Vercel. ` +
      'Gunakan DATABASE_URL/DATABASE_PUBLIC_URL dengan public Railway host (proxy).';
  }

  return `Database belum bisa diakses (${host}). Pastikan service PostgreSQL aktif dan variabel DATABASE_URL benar.`;
}

async function withDatabaseRecovery<T>(operation: () => Promise<T>) {
  if (!process.env.DATABASE_URL && !process.env.DATABASE_PUBLIC_URL && !process.env.DATABASE_URL_PUBLIC && !process.env.POSTGRES_PRISMA_URL && !process.env.POSTGRES_URL_NON_POOLING && !process.env.POSTGRES_URL) {
    throw new MapServiceError('DATABASE_URL belum diset. Konfigurasikan URL database Postgres yang dapat diakses runtime.', 500);
  }

  try {
    return await operation();
  } catch (error) {
    if (isSchemaMissingError(error)) {
      throw new MapServiceError(
        'Schema database belum siap (tabel/kolom belum ada). Jalankan `npx prisma migrate deploy` pada environment production.',
        503
      );
    }

    if (isDatabaseUnavailableError(error)) {
      throw new MapServiceError(buildDatabaseUnavailableMessage(), 503);
    }

    throw error;
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

  const maps = await withDatabaseRecovery(() =>
    prisma.map.findMany({
      where: normalizedQuery
        ? {
            AND: [
              {
                title: {
                  contains: normalizedQuery,
                  mode: 'insensitive',
                },
              },
              {
                NOT: {
                  title: {
                    startsWith: '__SYSTEM__',
                  },
                },
              },
            ],
          }
        : {
            NOT: {
              title: {
                startsWith: '__SYSTEM__',
              },
            },
          },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      select: {
        id: true,
        title: true,
        updatedAt: true,
      },
    })
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

  const created = await withDatabaseRecovery(() =>
    prisma.map.create({
      data: {
        title,
        snapshot: getCurrentSnapshot(doc),
        version: 1,
      },
      select: {
        id: true,
        title: true,
      },
    })
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

  let map = await withDatabaseRecovery(() => prisma.map.findUnique({ where: { id: numericId } }));

  if (!map && ensureMap) {
    const freshDoc = createDocWithSnapshot();
    map = await withDatabaseRecovery(() =>
      prisma.map.upsert({
        where: { id: numericId },
        create: {
          id: numericId,
          title: `Map ${formatMapId(numericId)}`,
          snapshot: getCurrentSnapshot(freshDoc),
          version: 1,
        },
        update: {},
      })
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

  const updated = await withDatabaseRecovery(() =>
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
      select: {
        id: true,
        version: true,
        updatedAt: true,
      },
    })
  );

  return {
    id: formatMapId(updated.id),
    version: updated.version,
    updatedAt: updated.updatedAt,
  };
}
