import { NextRequest, NextResponse } from 'next/server';
import {
  getMapById,
  MAP_DETAIL_CACHE_CONTROL,
  MapServiceError,
  NO_STORE_CACHE_CONTROL,
} from '@/features/maps/server/maps-service';

function createErrorResponse(error: string, status: number, details?: string) {
  return NextResponse.json(
    process.env.NODE_ENV === 'production' || !details
      ? { error }
      : { error, message: details },
    {
      status,
      headers: {
        'Cache-Control': NO_STORE_CACHE_CONTROL,
      },
    }
  );
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const ensureMap = request.nextUrl.searchParams.get('ensure') === '1';
    const map = await getMapById(params.id, ensureMap);

    const cacheControl = ensureMap ? NO_STORE_CACHE_CONTROL : MAP_DETAIL_CACHE_CONTROL;

    if (!ensureMap) {
      const ifNoneMatch = request.headers.get('if-none-match');
      const ifModifiedSince = request.headers.get('if-modified-since');
      const modifiedSince = ifModifiedSince ? new Date(ifModifiedSince) : null;
      const hasValidModifiedSince = modifiedSince && !Number.isNaN(modifiedSince.getTime());

      if (ifNoneMatch === map.etag || (hasValidModifiedSince && map.updatedAt.getTime() <= modifiedSince.getTime())) {
        return new NextResponse(null, {
          status: 304,
          headers: {
            ETag: map.etag,
            'Last-Modified': map.updatedAt.toUTCString(),
            'Cache-Control': cacheControl,
          },
        });
      }
    }

    return NextResponse.json(
      {
        id: map.id,
        title: map.title,
        snapshot: map.snapshot,
        version: map.version,
      },
      {
        headers: {
          ETag: map.etag,
          'Last-Modified': map.updatedAt.toUTCString(),
          'Cache-Control': cacheControl,
        },
      }
    );
  } catch (error) {
    if (error instanceof MapServiceError) {
      return NextResponse.json(
        { error: error.message },
        {
          status: error.status,
          headers: {
            'Cache-Control': NO_STORE_CACHE_CONTROL,
          },
        }
      );
    }

    const errorMsg = error instanceof Error ? error.message : String(error);
    return createErrorResponse('Failed to fetch map', 500, errorMsg);
  }
}
