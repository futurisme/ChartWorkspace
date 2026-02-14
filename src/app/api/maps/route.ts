import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createDocWithSnapshot, getCurrentSnapshot } from '@/lib/snapshot';
import { formatMapId } from '@/lib/mapId';

const LIST_CACHE_CONTROL = 'public, s-maxage=30, stale-while-revalidate=120';
const NO_STORE = 'no-store';

function createErrorResponse(error: string, status: number, details?: string) {
  return NextResponse.json(
    process.env.NODE_ENV === 'production' || !details
      ? { error }
      : { error, message: details },
    {
      status,
      headers: {
        'Cache-Control': NO_STORE,
      },
    }
  );
}

export async function GET(request: NextRequest) {
  try {
    if (!process.env.DATABASE_URL) {
      return createErrorResponse('Database configuration missing', 500);
    }

    const query = request.nextUrl.searchParams.get('q')?.trim();
    const maps = await prisma.map.findMany({
      where: query
        ? {
            title: {
              contains: query,
              mode: 'insensitive',
            },
          }
        : undefined,
      orderBy: { updatedAt: 'desc' },
      take: 100,
      select: {
        id: true,
        title: true,
        updatedAt: true,
      },
    });

    
    const formattedMaps = maps.map((map) => ({
      id: formatMapId(map.id),
      title: map.title,
      updatedAt: map.updatedAt,
    }));
    const newestUpdatedAt = maps[0]?.updatedAt;
    const lastModified = newestUpdatedAt?.toUTCString();
    const etagSeed = `${query ?? ''}:${maps.length}:${newestUpdatedAt?.getTime() ?? 0}`;
    const etag = `W/\"maps-${Buffer.from(etagSeed).toString('base64url')}\"`;
    const ifNoneMatch = request.headers.get('if-none-match');
    const ifModifiedSince = request.headers.get('if-modified-since');
    const modifiedSince = ifModifiedSince ? new Date(ifModifiedSince) : null;
    const hasValidModifiedSince = modifiedSince && !Number.isNaN(modifiedSince.getTime());

    if (ifNoneMatch === etag || (lastModified && hasValidModifiedSince && newestUpdatedAt.getTime() <= modifiedSince.getTime())) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: etag,
          ...(lastModified ? { 'Last-Modified': lastModified } : {}),
          'Cache-Control': LIST_CACHE_CONTROL,
        },
      });
    }

    return NextResponse.json(
      { maps: formattedMaps },
      {
        headers: {
          ETag: etag,
          ...(lastModified ? { 'Last-Modified': lastModified } : {}),
          'Cache-Control': LIST_CACHE_CONTROL,
        },
      }
    );
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return createErrorResponse('Failed to fetch maps', 500, errorMsg);
  }
}

export async function POST(request: NextRequest) {
  try {
    // Validate env
    if (!process.env.DATABASE_URL) {
      console.error('DATABASE_URL is not set in environment variables');
      return createErrorResponse('Database configuration missing', 500);
    }

    const body = await request.json();
    const { title } = body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json(
        { error: 'Title is required' },
        {
          status: 400,
          headers: {
            'Cache-Control': NO_STORE,
          },
        }
      );
    }

    // Create a fresh Yjs doc with initial state
    const doc = createDocWithSnapshot();
    doc.getText('title').insert(0, title.trim());
    
    const snapshot = getCurrentSnapshot(doc);

    // Store in database
    const map = await prisma.map.create({
      data: {
        title: title.trim(),
        snapshot: snapshot,
        version: 1,
      },
    });

    return NextResponse.json(
      { id: formatMapId(map.id), title: map.title },
      {
        status: 201,
        headers: {
          'Cache-Control': NO_STORE,
        },
      }
    );
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : '';
    
    console.error('=== API /maps POST Error ===');
    console.error('Message:', errorMsg);
    console.error('Stack:', errorStack);
    console.error('DATABASE_URL set:', !!process.env.DATABASE_URL);
    console.error('NODE_ENV:', process.env.NODE_ENV);
    
    return createErrorResponse('Failed to create map', 500, errorMsg);
  }
}
