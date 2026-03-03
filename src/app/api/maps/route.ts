import { NextRequest, NextResponse } from 'next/server';
import {
  createMap,
  listMaps,
  MAPS_LIST_CACHE_CONTROL,
  MapServiceError,
  NO_STORE_CACHE_CONTROL,
  parseListLimit,
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

export async function GET(request: NextRequest) {
  try {
    const query = request.nextUrl.searchParams.get('q');
    const limit = parseListLimit(request.nextUrl.searchParams.get('limit'));
    const result = await listMaps(query, limit);

    const ifNoneMatch = request.headers.get('if-none-match');
    const ifModifiedSince = request.headers.get('if-modified-since');
    const modifiedSince = ifModifiedSince ? new Date(ifModifiedSince) : null;
    const hasValidModifiedSince = modifiedSince && !Number.isNaN(modifiedSince.getTime());

    if (
      ifNoneMatch === result.etag ||
      (result.lastModified &&
        hasValidModifiedSince &&
        result.newestUpdatedAt &&
        result.newestUpdatedAt.getTime() <= modifiedSince.getTime())
    ) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: result.etag,
          ...(result.lastModified ? { 'Last-Modified': result.lastModified } : {}),
          'Cache-Control': MAPS_LIST_CACHE_CONTROL,
        },
      });
    }

    return NextResponse.json(
      { maps: result.maps },
      {
        headers: {
          ETag: result.etag,
          ...(result.lastModified ? { 'Last-Modified': result.lastModified } : {}),
          'Cache-Control': MAPS_LIST_CACHE_CONTROL,
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
    const body = (await request.json()) as { title?: string };
    const map = await createMap(body.title);

    return NextResponse.json(map, {
      status: 201,
      headers: {
        'Cache-Control': NO_STORE_CACHE_CONTROL,
      },
    });
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
    return createErrorResponse('Failed to create map', 500, errorMsg);
  }
}
