import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { formatMapId, parseMapId } from '@/lib/mapId';
import { createDocWithSnapshot, getCurrentSnapshot } from '@/lib/snapshot';

const MAP_CACHE_CONTROL = 'public, s-maxage=15, stale-while-revalidate=60';

function createErrorResponse(error: string, status: number, details?: string) {
  return NextResponse.json(
    process.env.NODE_ENV === 'production' || !details
      ? { error }
      : { error, message: details },
    {
      status,
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Validate env
    if (!process.env.DATABASE_URL) {
      console.error('DATABASE_URL is not set in environment variables');
      return createErrorResponse('Database configuration missing', 500);
    }

    const { id } = params;

    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { error: 'Invalid map ID' },
        {
          status: 400,
          headers: {
            'Cache-Control': 'no-store',
          },
        }
      );
    }

    const numericId = parseMapId(id);
    if (!numericId) {
      return NextResponse.json(
        { error: 'Invalid map ID' },
        {
          status: 400,
          headers: {
            'Cache-Control': 'no-store',
          },
        }
      );
    }

    const ensureMap = request.nextUrl.searchParams.get('ensure') === '1';
    let map = await prisma.map.findUnique({
      where: { id: numericId },
    });

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
      return NextResponse.json(
        { error: 'Map not found' },
        {
          status: 404,
          headers: {
            'Cache-Control': 'no-store',
          },
        }
      );
    }

    const lastModified = map.updatedAt.toUTCString();
    const etag = `W/\"map-${map.id}-v${map.version}\"`;
    const ifNoneMatch = request.headers.get('if-none-match');
    const ifModifiedSince = request.headers.get('if-modified-since');

    if (ifNoneMatch === etag || (ifModifiedSince && new Date(ifModifiedSince) >= map.updatedAt)) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: etag,
          'Last-Modified': lastModified,
          'Cache-Control': MAP_CACHE_CONTROL,
        },
      });
    }

    return NextResponse.json(
      {
        id: formatMapId(map.id),
        title: map.title,
        snapshot: map.snapshot,
        version: map.version,
      },
      {
        headers: {
          ETag: etag,
          'Last-Modified': lastModified,
          'Cache-Control': MAP_CACHE_CONTROL,
        },
      }
    );
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : '';
    
    console.error('=== API /maps/[id] GET Error ===');
    console.error('Message:', errorMsg);
    console.error('Stack:', errorStack);
    console.error('DATABASE_URL set:', !!process.env.DATABASE_URL);
    
    return createErrorResponse('Failed to fetch map', 500, errorMsg);
  }
}
