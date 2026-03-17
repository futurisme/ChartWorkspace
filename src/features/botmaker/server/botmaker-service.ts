import { Prisma } from '@prisma/client';
import { createHash, createHmac, createCipheriv, createDecipheriv, randomBytes, timingSafeEqual } from 'node:crypto';
import { deflateRawSync, inflateRawSync } from 'node:zlib';
import { activeDatabaseHost, prisma } from '@/lib/prisma';
import {
  DEFAULT_BOTMAKER_STATE,
  sanitizeBotMakerState,
  type BotMakerBot,
  type BotMakerState,
} from '@/features/botmaker/shared/schema';

const SYSTEM_BOTMAKER_TITLE = '__SYSTEM__BOTMAKER_V1';
const DISCORD_API = 'https://discord.com/api/v10';
const BOTMAKER_COOKIE = 'botmaker_session';
const BOTMAKER_USER_COOKIE = 'botmaker_user';
const ACTIVE_TIMERS = new Map<string, ReturnType<typeof setTimeout>>();
const BOT_RUNTIME_STATE = new Map<string, { running: boolean; nextAllowedAt: number; backoffMs: number }>();
const MIN_SAFE_DISCORD_INTERVAL_MS = 60_000;
const MAX_BACKOFF_MS = 15 * 60_000;
const STATE_MAGIC = 'botmaker-v2-deflate';

interface PersistedBot extends Omit<BotMakerBot, 'token' | 'hasToken'> {
  tokenCipher: string;
  tokenIv: string;
}

interface PersistedState {
  magic: typeof STATE_MAGIC;
  payload: string;
}

type DiscordUserResponse = { id: string; username: string };

type DiscordSendResponseHeaders = {
  remaining: number | null;
  resetAfterMs: number | null;
  retryAfterMs: number | null;
};

function toInputJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

class BotMakerServiceError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

function getPrismaErrorCode(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError ? error.code : null;
}

function isDatabaseUnavailableError(error: unknown) {
  if (error instanceof Prisma.PrismaClientInitializationError) return true;
  const code = getPrismaErrorCode(error);
  if (code === 'P1001') return true;
  const message = error instanceof Error ? error.message.toLowerCase() : '';
  return message.includes("can't reach database server") || message.includes('connection refused');
}

function isSchemaMissingError(error: unknown) {
  const code = getPrismaErrorCode(error);
  return code === 'P2021' || code === 'P2022';
}

function buildDatabaseUnavailableMessage() {
  const host = activeDatabaseHost ?? 'unknown-host';
  const railwayInternal = host.endsWith('.railway.internal');
  if (railwayInternal && process.env.NODE_ENV === 'production') {
    return `Database tidak bisa diakses (${host}). Host *.railway.internal bersifat private dan tidak bisa diakses dari Vercel.`;
  }
  return `Database belum bisa diakses (${host}). Pastikan service PostgreSQL aktif dan DATABASE_URL benar.`;
}

async function withDatabaseRecovery<T>(operation: () => Promise<T>) {
  if (!process.env.DATABASE_URL && !process.env.DATABASE_PUBLIC_URL && !process.env.DATABASE_URL_PUBLIC && !process.env.POSTGRES_PRISMA_URL && !process.env.POSTGRES_URL_NON_POOLING && !process.env.POSTGRES_URL) {
    throw new BotMakerServiceError('DATABASE_URL belum diset.', 500);
  }

  try {
    return await operation();
  } catch (error) {
    if (isSchemaMissingError(error)) {
      throw new BotMakerServiceError('Schema database belum siap. Jalankan migrasi Prisma.', 503);
    }
    if (isDatabaseUnavailableError(error)) {
      throw new BotMakerServiceError(buildDatabaseUnavailableMessage(), 503);
    }
    throw error;
  }
}

async function findSystemRecord() {
  return withDatabaseRecovery(() =>
    prisma.map.findFirst({
      where: { title: SYSTEM_BOTMAKER_TITLE },
      orderBy: { id: 'asc' },
      select: { id: true, snapshot: true, version: true, updatedAt: true },
    })
  );
}

function getTokenCryptoKey() {
  return createHash('sha256').update(process.env.BOTMAKER_TOKEN_SECRET ?? process.env.DATABASE_URL ?? 'botmaker-dev-secret').digest();
}

function encryptToken(token: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', getTokenCryptoKey(), iv);
  const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    tokenCipher: Buffer.concat([encrypted, tag]).toString('base64url'),
    tokenIv: iv.toString('base64url'),
  };
}

function decryptToken(tokenCipher: string, tokenIv: string) {
  if (!tokenCipher || !tokenIv) return '';
  const source = Buffer.from(tokenCipher, 'base64url');
  if (source.length <= 16) return '';
  const data = source.subarray(0, source.length - 16);
  const tag = source.subarray(source.length - 16);
  const decipher = createDecipheriv('aes-256-gcm', getTokenCryptoKey(), Buffer.from(tokenIv, 'base64url'));
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}

function compressState(state: BotMakerState) {
  const text = JSON.stringify(state);
  const compressed = deflateRawSync(Buffer.from(text, 'utf8'));
  return {
    magic: STATE_MAGIC,
    payload: compressed.toString('base64url'),
  } satisfies PersistedState;
}

function decompressState(raw: unknown): BotMakerState {
  if (!raw || typeof raw !== 'object') {
    return DEFAULT_BOTMAKER_STATE;
  }

  const maybePacked = raw as Partial<PersistedState>;
  if (maybePacked.magic === STATE_MAGIC && typeof maybePacked.payload === 'string') {
    const inflated = inflateRawSync(Buffer.from(maybePacked.payload, 'base64url')).toString('utf8');
    return sanitizeBotMakerState(JSON.parse(inflated));
  }

  return sanitizeBotMakerState(raw);
}

function toPersistedBot(bot: BotMakerBot, existing?: PersistedBot): PersistedBot {
  const tokenChanged = bot.token.trim().length > 0;
  const encrypted = tokenChanged ? encryptToken(bot.token.trim()) : {
    tokenCipher: existing?.tokenCipher ?? '',
    tokenIv: existing?.tokenIv ?? '',
  };

  return {
    id: bot.id,
    name: bot.name,
    applicationId: bot.applicationId,
    guildId: bot.guildId,
    channelId: bot.channelId,
    messageTemplate: bot.messageTemplate,
    intervalSeconds: Math.max(bot.intervalSeconds, 60),
    enabled: bot.enabled,
    deployedAt: bot.deployedAt,
    lastDeployStatus: bot.lastDeployStatus,
    useEmbed: bot.useEmbed,
    mentionEveryone: bot.mentionEveryone,
    stylePreset: bot.stylePreset,
    tokenUpdatedAt: tokenChanged ? new Date().toISOString() : (existing?.tokenUpdatedAt ?? bot.tokenUpdatedAt),
    tokenCipher: encrypted.tokenCipher,
    tokenIv: encrypted.tokenIv,
  };
}

function toPublicBot(bot: PersistedBot): BotMakerBot {
  return {
    id: bot.id,
    name: bot.name,
    token: '',
    hasToken: Boolean(bot.tokenCipher),
    tokenUpdatedAt: bot.tokenUpdatedAt,
    applicationId: bot.applicationId,
    guildId: bot.guildId,
    channelId: bot.channelId,
    messageTemplate: bot.messageTemplate,
    intervalSeconds: bot.intervalSeconds,
    enabled: bot.enabled,
    deployedAt: bot.deployedAt,
    lastDeployStatus: bot.lastDeployStatus,
    useEmbed: bot.useEmbed,
    mentionEveryone: bot.mentionEveryone,
    stylePreset: bot.stylePreset,
  };
}

function parsePersistedBots(state: BotMakerState): PersistedBot[] {
  return state.bots
    .map((bot) => {
      const source = bot as unknown as Partial<PersistedBot>;
      return {
        ...bot,
        tokenCipher: typeof source.tokenCipher === 'string' ? source.tokenCipher : '',
        tokenIv: typeof source.tokenIv === 'string' ? source.tokenIv : '',
      } satisfies PersistedBot;
    });
}

function parseDiscordHeaders(headers: Headers, responseBody: unknown): DiscordSendResponseHeaders {
  const retryFromBody = typeof responseBody === 'object' && responseBody && 'retry_after' in responseBody
    ? Number((responseBody as { retry_after?: unknown }).retry_after)
    : NaN;

  const retryFromHeader = Number(headers.get('retry-after'));
  const resetAfterSeconds = Number(headers.get('x-ratelimit-reset-after'));
  const remaining = Number(headers.get('x-ratelimit-remaining'));

  return {
    remaining: Number.isFinite(remaining) ? remaining : null,
    resetAfterMs: Number.isFinite(resetAfterSeconds) ? Math.max(0, Math.round(resetAfterSeconds * 1000)) : null,
    retryAfterMs: Number.isFinite(retryFromBody)
      ? Math.max(0, Math.round(retryFromBody * 1000))
      : Number.isFinite(retryFromHeader)
        ? Math.max(0, Math.round(retryFromHeader * 1000))
        : null,
  };
}

function getPresetPrefix(preset: BotMakerBot['stylePreset']) {
  switch (preset) {
    case 'alert':
      return '🚨 ALERT';
    case 'release':
      return '🚀 RELEASE';
    case 'community':
      return '💬 COMMUNITY';
    default:
      return '🤖 BOT';
  }
}

function buildMessagePayload(bot: BotMakerBot) {
  const mention = bot.mentionEveryone ? '@everyone ' : '';
  const title = `${getPresetPrefix(bot.stylePreset)} • ${bot.name}`;
  const content = `${mention}${bot.messageTemplate}`.trim();

  if (!bot.useEmbed) {
    return {
      content: `${title}\n${content}`.slice(0, 1900),
    };
  }

  return {
    content: mention || undefined,
    embeds: [
      {
        title,
        description: content.slice(0, 3900),
        color: bot.stylePreset === 'alert' ? 0xef4444 : bot.stylePreset === 'release' ? 0x22c55e : bot.stylePreset === 'community' ? 0x3b82f6 : 0x06b6d4,
        timestamp: new Date().toISOString(),
      },
    ],
  };
}

async function sendDiscordMessage(bot: BotMakerBot, token: string) {
  const response = await fetch(`${DISCORD_API}/channels/${bot.channelId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bot ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(buildMessagePayload(bot)),
    cache: 'no-store',
  });

  let parsed: unknown = null;
  try {
    parsed = await response.json();
  } catch {
    parsed = null;
  }

  const limits = parseDiscordHeaders(response.headers, parsed);

  if (response.status === 429) {
    const waitMs = limits.retryAfterMs ?? 5_000;
    throw new BotMakerServiceError(`Discord rate limited bot ${bot.name}. Retry in ${Math.ceil(waitMs / 1000)}s.`, 429);
  }

  if (!response.ok) {
    throw new BotMakerServiceError(`Discord send failed (${response.status})`, 502);
  }

  return limits;
}

function scheduleBotSend(botId: string, delayMs: number, runner: () => Promise<void>) {
  const existing = ACTIVE_TIMERS.get(botId);
  if (existing) {
    clearTimeout(existing);
  }
  const timer = setTimeout(() => {
    void runner();
  }, Math.max(1_000, delayMs));
  ACTIVE_TIMERS.set(botId, timer);
}

function stopBotTimer(botId: string) {
  const timer = ACTIVE_TIMERS.get(botId);
  if (timer) {
    clearTimeout(timer);
    ACTIVE_TIMERS.delete(botId);
  }
  BOT_RUNTIME_STATE.delete(botId);
}

function getSessionSecret() {
  return process.env.BOTMAKER_AUTH_SECRET ?? process.env.DATABASE_URL ?? 'botmaker-auth-dev-secret';
}

function hashPassword(value: string) {
  return createHash('sha256').update(`botmaker:${value}`).digest('base64url');
}

function signSession(userId: string) {
  return createHmac('sha256', getSessionSecret()).update(userId).digest('base64url');
}

function constantSafeEqual(a: string, b: string) {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

export function verifySession(userId: string | null | undefined, signature: string | null | undefined) {
  if (!userId || !signature) return false;
  const expected = signSession(userId);
  return constantSafeEqual(expected, signature);
}

async function readPersistedState() {
  const existing = await findSystemRecord();
  if (!existing) {
    return {
      recordId: null as number | null,
      version: 0,
      state: DEFAULT_BOTMAKER_STATE,
    };
  }

  return {
    recordId: existing.id,
    version: existing.version,
    state: decompressState(existing.snapshot),
  };
}

async function persistState(recordId: number | null, state: BotMakerState) {
  const packed = compressState(state);

  if (!recordId) {
    const created = await withDatabaseRecovery(() =>
      prisma.map.create({
        data: {
          title: SYSTEM_BOTMAKER_TITLE,
          snapshot: toInputJson(packed),
          version: 1,
        },
        select: { id: true, version: true, updatedAt: true },
      })
    );
    return created;
  }

  const updated = await withDatabaseRecovery(() =>
    prisma.map.update({
      where: { id: recordId },
      data: {
        snapshot: toInputJson(packed),
        version: { increment: 1 },
        updatedAt: new Date(),
      },
      select: { id: true, version: true, updatedAt: true },
    })
  );

  return updated;
}

export async function loginBotMaker(usernameRaw: string, passwordRaw: string) {
  const username = usernameRaw.trim().toLowerCase();
  const password = passwordRaw.trim();
  if (!username || !password) {
    throw new BotMakerServiceError('Username dan password wajib diisi.', 400);
  }

  const { recordId, state } = await readPersistedState();
  const users = state.users ?? [];
  const existingUser = users.find((entry) => entry.username === username);

  if (!existingUser) {
    const newUser = {
      id: `user-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      username,
      passHash: hashPassword(password),
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };

    const nextState: BotMakerState = {
      ...state,
      users: [...users, newUser],
    };

    await persistState(recordId, nextState);
    return {
      userId: newUser.id,
      username: newUser.username,
      signature: signSession(newUser.id),
    };
  }

  if (!constantSafeEqual(existingUser.passHash, hashPassword(password))) {
    throw new BotMakerServiceError('Username/password tidak valid.', 401);
  }

  existingUser.lastLoginAt = new Date().toISOString();
  await persistState(recordId, state);

  return {
    userId: existingUser.id,
    username: existingUser.username,
    signature: signSession(existingUser.id),
  };
}

export async function loadBotMakerState() {
  const { state, version } = await readPersistedState();
  const persistedBots = parsePersistedBots(state);
  const publicBots = persistedBots.map(toPublicBot);

  return {
    data: {
      bots: publicBots,
      users: [],
    },
    version,
    updatedAt: new Date().toISOString(),
  };
}

export async function saveBotMakerState(raw: unknown) {
  const incoming = sanitizeBotMakerState(raw);
  const { recordId, state } = await readPersistedState();

  const existingPersisted = new Map(parsePersistedBots(state).map((bot) => [bot.id, bot]));
  const mergedPersistedBots = incoming.bots.map((bot) => toPersistedBot(bot, existingPersisted.get(bot.id)));

  const nextState: BotMakerState = {
    bots: mergedPersistedBots.map(toPublicBot),
    users: state.users,
  };

  const storageState: BotMakerState = {
    bots: mergedPersistedBots as unknown as BotMakerBot[],
    users: state.users,
  };

  const persisted = await persistState(recordId, storageState);
  reconcileRuntime(storageState);

  return {
    data: nextState,
    version: persisted.version,
    updatedAt: persisted.updatedAt,
  };
}

async function loadBotById(botId: string) {
  const { recordId, state } = await readPersistedState();
  const persistedBots = parsePersistedBots(state);
  const bot = persistedBots.find((entry) => entry.id === botId);
  if (!bot) {
    throw new BotMakerServiceError('Bot tidak ditemukan.', 404);
  }

  const token = decryptToken(bot.tokenCipher, bot.tokenIv);
  if (!token) {
    throw new BotMakerServiceError('Token bot belum tersimpan.', 400);
  }

  return {
    recordId,
    state,
    bot,
    token,
  };
}

export async function deployBot(botId: string) {
  const loaded = await loadBotById(botId);
  const bot = toPublicBot(loaded.bot);

  const identityRes = await fetch(`${DISCORD_API}/users/@me`, {
    headers: { Authorization: `Bot ${loaded.token}` },
    cache: 'no-store',
  });

  if (!identityRes.ok) {
    const txt = await identityRes.text();
    throw new BotMakerServiceError(`Token bot tidak valid (${identityRes.status}): ${txt.slice(0, 120)}`, 400);
  }

  const identity = (await identityRes.json()) as DiscordUserResponse;

  const persistedBots = parsePersistedBots(loaded.state);
  const target = persistedBots.find((entry) => entry.id === botId);
  if (!target) throw new BotMakerServiceError('Bot tidak ditemukan.', 404);
  target.enabled = true;
  target.deployedAt = new Date().toISOString();
  target.lastDeployStatus = `Deployed as ${identity.username} (${identity.id})`;

  if (target.applicationId && target.guildId) {
    await fetch(`${DISCORD_API}/applications/${target.applicationId}/guilds/${target.guildId}/commands`, {
      method: 'PUT',
      headers: {
        Authorization: `Bot ${loaded.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        {
          name: 'ping',
          description: 'BotMaker health command',
          type: 1,
        },
      ]),
      cache: 'no-store',
    });
  }

  const nextState: BotMakerState = {
    bots: persistedBots as unknown as BotMakerBot[],
    users: loaded.state.users,
  };

  const persisted = await persistState(loaded.recordId, nextState);
  reconcileRuntime(nextState);

  return {
    data: {
      bots: persistedBots.map(toPublicBot),
      users: [],
    },
    version: persisted.version,
    updatedAt: persisted.updatedAt,
    bot,
  };
}

export async function sendBotNow(botId: string) {
  const loaded = await loadBotById(botId);
  const limits = await sendDiscordMessage(toPublicBot(loaded.bot), loaded.token);
  return { ok: true, limits };
}

function reconcileRuntime(state: BotMakerState) {
  const persistedBots = parsePersistedBots(state);
  const activeIds = new Set(
    persistedBots
      .filter((bot) => bot.enabled && bot.channelId && bot.tokenCipher)
      .map((bot) => bot.id)
  );

  for (const botId of [...ACTIVE_TIMERS.keys()]) {
    if (!activeIds.has(botId)) {
      stopBotTimer(botId);
    }
  }

  persistedBots.forEach((persistedBot) => {
    if (!activeIds.has(persistedBot.id)) return;

    const publicBot = toPublicBot(persistedBot);
    const token = decryptToken(persistedBot.tokenCipher, persistedBot.tokenIv);
    if (!token) return;

    const runtime = BOT_RUNTIME_STATE.get(persistedBot.id) ?? {
      running: false,
      nextAllowedAt: 0,
      backoffMs: 0,
    };
    BOT_RUNTIME_STATE.set(persistedBot.id, runtime);

    const run = async () => {
      if (runtime.running) {
        scheduleBotSend(persistedBot.id, Math.max(5_000, publicBot.intervalSeconds * 1000), run);
        return;
      }

      runtime.running = true;
      try {
        const now = Date.now();
        if (now < runtime.nextAllowedAt) {
          scheduleBotSend(persistedBot.id, runtime.nextAllowedAt - now, run);
          return;
        }

        const limits = await sendDiscordMessage(publicBot, token);
        const intervalMs = Math.max(MIN_SAFE_DISCORD_INTERVAL_MS, publicBot.intervalSeconds * 1000);
        const resetMs = limits.resetAfterMs ?? 0;
        runtime.backoffMs = 0;
        runtime.nextAllowedAt = Date.now() + Math.max(intervalMs, resetMs);
        scheduleBotSend(persistedBot.id, Math.max(intervalMs, resetMs), run);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const hintedRateLimit = message.toLowerCase().includes('rate') || message.includes('429');
        const nextBackoff = runtime.backoffMs === 0 ? 15_000 : Math.min(MAX_BACKOFF_MS, runtime.backoffMs * 2);
        runtime.backoffMs = hintedRateLimit ? Math.max(nextBackoff, 60_000) : nextBackoff;
        runtime.nextAllowedAt = Date.now() + runtime.backoffMs;
        scheduleBotSend(persistedBot.id, runtime.backoffMs, run);
      } finally {
        runtime.running = false;
      }
    };

    const firstDelay = Math.max(MIN_SAFE_DISCORD_INTERVAL_MS, publicBot.intervalSeconds * 1000);
    if (!ACTIVE_TIMERS.has(persistedBot.id)) {
      scheduleBotSend(persistedBot.id, firstDelay, run);
    }
  });
}

export { BOTMAKER_COOKIE, BOTMAKER_USER_COOKIE, BotMakerServiceError };
