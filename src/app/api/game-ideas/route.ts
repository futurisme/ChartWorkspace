import { NextResponse } from 'next/server';
import { GameIdeasServiceError, loadGameIdeas, saveGameIdeas } from '@/features/game-ideas/server/game-ideas-service';

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

export async function GET() {
  try {
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
    const body = (await request.json()) as { data?: unknown };
    const payload = await saveGameIdeas(body.data);

    return NextResponse.json(payload, {
      headers: { 'Cache-Control': NO_STORE },
    });
  } catch (error) {
    if (error instanceof GameIdeasServiceError) {
      return createErrorResponse(error.message, error.status);
    }

    const msg = error instanceof Error ? error.message : String(error);
    return createErrorResponse('Failed to save game ideas', 500, msg);
  }
}
