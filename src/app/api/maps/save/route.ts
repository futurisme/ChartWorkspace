import { NextRequest, NextResponse } from 'next/server';
import { MapServiceError, NO_STORE_CACHE_CONTROL, saveMap } from '@/features/maps/server/maps-service';
import { decodeServerFadhilWebSnapshot } from '@/features/maps/server/fadhil-web-server';

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

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { id?: string; snapshot?: string; snapshotCompressed?: unknown };
    const inflatedSnapshot = decodeServerFadhilWebSnapshot(body.snapshotCompressed);
    const result = await saveMap(body.id, inflatedSnapshot ?? body.snapshot);

    return NextResponse.json(result, {
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
    return createErrorResponse('Failed to save map', 500, errorMsg);
  }
}
