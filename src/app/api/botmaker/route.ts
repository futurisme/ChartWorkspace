import { NextResponse } from 'next/server';
import {
  BotMakerServiceError,
  deployBot,
  loadBotMakerState,
  saveBotMakerState,
  sendBotNow,
} from '@/features/botmaker/server/botmaker-service';

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

export async function GET() {
  try {
    const payload = await loadBotMakerState();
    return NextResponse.json(payload, {
      headers: { 'Cache-Control': NO_STORE },
    });
  } catch (error) {
    if (error instanceof BotMakerServiceError) {
      return createErrorResponse(error.message, error.status);
    }

    const msg = error instanceof Error ? error.message : String(error);
    return createErrorResponse('Failed to load BotMaker', 500, msg);
  }
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as { data?: unknown };
    const payload = await saveBotMakerState(body.data);
    return NextResponse.json(payload, {
      headers: { 'Cache-Control': NO_STORE },
    });
  } catch (error) {
    if (error instanceof BotMakerServiceError) {
      return createErrorResponse(error.message, error.status);
    }

    const msg = error instanceof Error ? error.message : String(error);
    return createErrorResponse('Failed to save BotMaker', 500, msg);
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { action?: string; botId?: string };

    if (!body.botId) {
      return createErrorResponse('botId is required', 400);
    }

    if (body.action === 'deploy') {
      const payload = await deployBot(body.botId);
      return NextResponse.json(payload, {
        headers: { 'Cache-Control': NO_STORE },
      });
    }

    if (body.action === 'send-now') {
      const payload = await sendBotNow(body.botId);
      return NextResponse.json(payload, {
        headers: { 'Cache-Control': NO_STORE },
      });
    }

    return createErrorResponse('Unsupported action', 400);
  } catch (error) {
    if (error instanceof BotMakerServiceError) {
      return createErrorResponse(error.message, error.status);
    }

    const msg = error instanceof Error ? error.message : String(error);
    return createErrorResponse('Failed to execute action', 500, msg);
  }
}
