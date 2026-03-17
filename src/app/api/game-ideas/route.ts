import { NextResponse } from 'next/server';
import {
  GameIdeasConflictError,
  GameIdeasServiceError,
  loadGameIdeas,
  loadGameIdeasMeta,
  saveGameIdeas,
} from '@/features/game-ideas/server/game-ideas-service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_STORE = 'no-store';

function createErrorResponse(error: string, status: number, details?: string) {
  return NextResponse.json(
    process.env.NODE_ENV === 'production' || !details ? { error } : { error, message: details },
    {
      status,
      headers: { 'Cache-Control': NO_STORE },
    }
  );
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    if (searchParams.get('meta') === '1') {
      const payload = await loadGameIdeasMeta();
      return NextResponse.json(payload, {
        headers: { 'Cache-Control': NO_STORE },
      });
    }

    const payload = await loadGameIdeas();
    return NextResponse.json(payload, {
      headers: { 'Cache-Control': NO_STORE },
    });
  } catch (error) {
    if (error instanceof GameIdeasServiceError) {
      return createErrorResponse(error.message, error.status);
    }

    const msg = error instanceof Error ? error.message : String(error);
    return createErrorResponse('Failed to load game ideas', 500, msg);
  }
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as { data?: unknown; expectedVersion?: unknown };
    const expectedVersion = typeof body.expectedVersion === 'number' ? body.expectedVersion : null;
    const payload = await saveGameIdeas(body.data, expectedVersion);

    return NextResponse.json(payload, {
      headers: { 'Cache-Control': NO_STORE },
    });
  } catch (error) {
    if (error instanceof GameIdeasConflictError) {
      return NextResponse.json(
        {
          error: error.message,
          conflict: true,
          data: error.data,
          version: error.version,
          updatedAt: error.updatedAt,
        },
        {
          status: 409,
          headers: { 'Cache-Control': NO_STORE },
        }
      );
    }

    if (error instanceof GameIdeasServiceError) {
      return createErrorResponse(error.message, error.status);
    }

    const msg = error instanceof Error ? error.message : String(error);
    return createErrorResponse('Failed to save game ideas', 500, msg);
  }
}
