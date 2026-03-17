import { NextRequest, NextResponse } from 'next/server';
import {
  BOTMAKER_COOKIE,
  BOTMAKER_USER_COOKIE,
  BotMakerServiceError,
  appendBotActivityLog,
  clearBotActivityLogs,
  getBotActivityLogs,
  verifySession,
} from '@/features/botmaker/server/botmaker-service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
    const botId = request.nextUrl.searchParams.get('botId') ?? 'all';
    const limitRaw = Number(request.nextUrl.searchParams.get('limit') ?? '200');
    const logs = getBotActivityLogs(botId, limitRaw);
    return NextResponse.json({ logs, botId, limit: limitRaw });
  } catch (error) {
    if (error instanceof BotMakerServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: 'Failed to load logs', message }, { status: 500 });
  }
}


export async function POST(request: NextRequest) {
  try {
    ensureAuth(request);
    const body = (await request.json()) as { botId?: string; level?: 'info' | 'warning' | 'error'; source?: 'internal' | 'external'; message?: string; details?: Record<string, unknown> };
    appendBotActivityLog(body.botId ?? 'client', body.level ?? 'info', body.source ?? 'internal', body.message ?? '-', body.details);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof BotMakerServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: 'Failed to append logs', message }, { status: 500 });
  }
}


export async function DELETE(request: NextRequest) {
  try {
    ensureAuth(request);
    const botId = request.nextUrl.searchParams.get('botId') ?? 'all';
    clearBotActivityLogs(botId);
    return NextResponse.json({ ok: true, botId });
  } catch (error) {
    if (error instanceof BotMakerServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: 'Failed to clear logs', message }, { status: 500 });
  }
}
