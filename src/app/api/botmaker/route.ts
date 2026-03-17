import { NextRequest, NextResponse } from 'next/server';
import {
  BOTMAKER_COOKIE,
  BOTMAKER_USER_COOKIE,
  BotMakerServiceError,
  appendBotActivityLog,
  deployBot,
  loadBotMakerState,
  saveBotMakerState,
  sendBotNow,
  stopBot,
  verifySession,
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

function ensureAuth(request: NextRequest) {
  const userId = request.cookies.get(BOTMAKER_USER_COOKIE)?.value ?? null;
  const sig = request.cookies.get(BOTMAKER_COOKIE)?.value ?? null;
  if (!verifySession(userId, sig)) {
    throw new BotMakerServiceError('Unauthorized BotMaker session.', 401);
  }
}

export async function GET(request: NextRequest) {
  try {
    ensureAuth(request);
    const payload = await loadBotMakerState();
    return NextResponse.json(payload, {
      headers: { 'Cache-Control': NO_STORE },
    });
  } catch (error) {
    if (error instanceof BotMakerServiceError) {
      appendBotActivityLog('api', 'error', 'internal', 'api-put-failed', { message: error.message, status: error.status });
      return createErrorResponse(error.message, error.status);
    }

    const msg = error instanceof Error ? error.message : String(error);
    return createErrorResponse('Failed to load BotMaker', 500, msg);
  }
}

export async function PUT(request: NextRequest) {
  try {
    ensureAuth(request);
    const body = (await request.json()) as { data?: unknown };
    const payload = await saveBotMakerState(body.data);
    return NextResponse.json(payload, {
      headers: { 'Cache-Control': NO_STORE },
    });
  } catch (error) {
    if (error instanceof BotMakerServiceError) {
      appendBotActivityLog('api', 'error', 'internal', 'api-get-failed', { message: error.message, status: error.status });
      return createErrorResponse(error.message, error.status);
    }

    const msg = error instanceof Error ? error.message : String(error);
    return createErrorResponse('Failed to save BotMaker', 500, msg);
  }
}

export async function POST(request: NextRequest) {
  try {
    ensureAuth(request);
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

    if (body.action === 'stop') {
      const payload = await stopBot(body.botId);
      return NextResponse.json(payload, {
        headers: { 'Cache-Control': NO_STORE },
      });
    }

    return createErrorResponse('Unsupported action', 400);
  } catch (error) {
    if (error instanceof BotMakerServiceError) {
      appendBotActivityLog('api', 'error', 'external', 'api-post-failed', { message: error.message, status: error.status });
      return createErrorResponse(error.message, error.status);
    }

    const msg = error instanceof Error ? error.message : String(error);
    return createErrorResponse('Failed to execute action', 500, msg);
  }
}
