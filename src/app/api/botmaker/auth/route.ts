import { NextRequest, NextResponse } from 'next/server';
import {
  BOTMAKER_COOKIE,
  BOTMAKER_USER_COOKIE,
  BotMakerServiceError,
  appendBotActivityLog,
  loginBotMaker,
  verifySession,
} from '@/features/botmaker/server/botmaker-service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

function buildCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  };
}

export async function GET(request: NextRequest) {
  const userId = request.cookies.get(BOTMAKER_USER_COOKIE)?.value ?? null;
  const sig = request.cookies.get(BOTMAKER_COOKIE)?.value ?? null;

  if (!verifySession(userId, sig)) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({ authenticated: true, userId });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { username?: string; password?: string };
    const session = await loginBotMaker(body.username ?? '', body.password ?? '');

    const response = NextResponse.json({ authenticated: true, username: session.username });
    response.cookies.set(BOTMAKER_USER_COOKIE, session.userId, buildCookieOptions());
    response.cookies.set(BOTMAKER_COOKIE, session.signature, buildCookieOptions());
    return response;
  } catch (error) {
    if (error instanceof BotMakerServiceError) {
      appendBotActivityLog('auth', 'error', 'internal', 'auth-failed', { message: error.message, status: error.status });
      return NextResponse.json({ authenticated: false, error: error.message }, { status: error.status });
    }

    return NextResponse.json({ authenticated: false, error: 'Login failed' }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(BOTMAKER_USER_COOKIE, '', { path: '/', maxAge: 0 });
  response.cookies.set(BOTMAKER_COOKIE, '', { path: '/', maxAge: 0 });
  return response;
}
