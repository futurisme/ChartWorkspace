import { Prisma } from '@prisma/client';
import { createHash, createHmac, createCipheriv, createDecipheriv, randomBytes, timingSafeEqual } from 'node:crypto';
import { brotliCompressSync, brotliDecompressSync, constants as zlibConstants, deflateRawSync, inflateRawSync } from 'node:zlib';
import { activeDatabaseHost, prisma } from '@/lib/prisma';
import { DEFAULT_BOTMAKER_STATE, sanitizeBotMakerState, type BotMakerBot, type BotMakerState } from '@/features/botmaker/shared/schema';

const SYSTEM_BOTMAKER_TITLE = '__SYSTEM__BOTMAKER_V1';
const DISCORD_API = 'https://discord.com/api/v10';
const BOTMAKER_COOKIE = 'botmaker_session';
const BOTMAKER_USER_COOKIE = 'botmaker_user';
const ACTIVE_TIMERS = new Map<string, ReturnType<typeof setTimeout>>();
const BOT_RUNTIME_STATE = new Map<string, { running: boolean; nextAllowedAt: number; backoffMs: number; lastCommandSyncAt: number }>();
const MIN_SAFE_DISCORD_INTERVAL_MS = 60_000;
const MAX_BACKOFF_MS = 15 * 60_000;
const STATE_MAGIC_BROTLI = 'botmaker-v3-br';
const STATE_MAGIC_DEFLATE = 'botmaker-v2-deflate';
const STATE_MAGIC_PLAIN = 'botmaker-v1-plain';
const MAX_COMMAND_SYNC_INTERVAL_MS = 10 * 60_000;
const DISCORD_SNOWFLAKE_REGEX = /^\d{16,22}$/;
const BOTMAKER_RUNTIME_TOKEN_ENV_KEYS = ['BOTMAKER_FALLBACK_TOKEN', 'DISCORD_BOT_TOKEN', 'TOKEN'] as const;
const BOTMAKER_LOG_PREFIX = '[botmaker-runtime]';
const ACTIVITY_LOG_RETENTION_MS = 24 * 60 * 60 * 1000;
const ACTIVITY_LOG_MAX = 4000;

interface PersistedBot extends Omit<BotMakerBot, 'token' | 'hasToken'> {
  tokenCipher: string;
  tokenIv: string;
}

type PersistedStateEnvelope =
  | { magic: typeof STATE_MAGIC_BROTLI; payload: string }
  | { magic: typeof STATE_MAGIC_DEFLATE; payload: string }
  | { magic: typeof STATE_MAGIC_PLAIN; payload: string };

type DiscordUserResponse = { id: string; username: string };

type BotMakerDiagnostics = {
  dbHost: string | null;
  hasFallbackToken: boolean;
  sharedStore: string;
};

type BotActivityLog = {
  ts: string;
  event: string;
  botId: string;
  details: Record<string, unknown>;
};

type CommandSyncResult = {
  ok: boolean;
  status: number;
  warning?: string;
};

const ACTIVITY_LOGS: BotActivityLog[] = [];


function pruneActivityLogs(now = Date.now()) {
  while (ACTIVITY_LOGS.length > 0) {
    const age = now - new Date(ACTIVITY_LOGS[0].ts).getTime();
    if (age <= ACTIVITY_LOG_RETENTION_MS && ACTIVITY_LOGS.length <= ACTIVITY_LOG_MAX) break;
    ACTIVITY_LOGS.shift();
  }
}

function logRuntime(event: string, details: Record<string, unknown> = {}) {
  const ts = new Date().toISOString();
  const botId = typeof details.botId === 'string' && details.botId ? details.botId : 'system';
  const payload = { event, ts, ...details };
  ACTIVITY_LOGS.push({ ts, event, botId, details });
  pruneActivityLogs();
  console.info(BOTMAKER_LOG_PREFIX, JSON.stringify(payload));
}

export function getBotActivityLogs(botId: string, limit = 200) {
  pruneActivityLogs();
  const safeLimit = Math.max(10, Math.min(1000, Math.trunc(limit)));
  const selected = botId === 'all' ? ACTIVITY_LOGS : ACTIVITY_LOGS.filter((entry) => entry.botId === botId);
  return selected.slice(-safeLimit);
}

function getFallbackToken() {
  for (const key of BOTMAKER_RUNTIME_TOKEN_ENV_KEYS) {
    const value = process.env[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }
  return '';
}

function getBotMakerDiagnostics(): BotMakerDiagnostics {
  return {
    dbHost: activeDatabaseHost,
    hasFallbackToken: Boolean(getFallbackToken()),
    sharedStore: 'prisma.map (/Editor,/Game-ideas,/BotMaker)',
  };
}

function resolveRuntimeToken(bot: PersistedBot, override?: string) {
  if (override && override.trim()) return override.trim();
  const persisted = decryptToken(bot.tokenCipher, bot.tokenIv).trim();
  if (persisted) return persisted;
  return getFallbackToken();
}

class BotMakerServiceError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

function toInputJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
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

function compressState(state: BotMakerState): PersistedStateEnvelope {
  const text = JSON.stringify(state);
  const source = Buffer.from(text, 'utf8');

  if (source.length < 1_024) {
    return {
      magic: STATE_MAGIC_PLAIN,
      payload: source.toString('base64url'),
    };
  }

  const compressed = brotliCompressSync(source, {
    params: {
      [zlibConstants.BROTLI_PARAM_QUALITY]: 4,
      [zlibConstants.BROTLI_PARAM_MODE]: zlibConstants.BROTLI_MODE_TEXT,
    },
  });

  if (compressed.length >= source.length * 0.98) {
    const fallback = deflateRawSync(source, { level: 1 });
    if (fallback.length >= source.length * 0.98) {
      return {
        magic: STATE_MAGIC_PLAIN,
        payload: source.toString('base64url'),
      };
    }
    return {
      magic: STATE_MAGIC_DEFLATE,
      payload: fallback.toString('base64url'),
    };
  }

  return {
    magic: STATE_MAGIC_BROTLI,
    payload: compressed.toString('base64url'),
  };
}

function decompressState(raw: unknown): BotMakerState {
  if (!raw || typeof raw !== 'object') {
    return DEFAULT_BOTMAKER_STATE;
  }

  const envelope = raw as Partial<PersistedStateEnvelope>;
  if (typeof envelope.payload === 'string' && envelope.magic === STATE_MAGIC_BROTLI) {
    const inflated = brotliDecompressSync(Buffer.from(envelope.payload, 'base64url')).toString('utf8');
    return sanitizeBotMakerState(JSON.parse(inflated));
  }

  if (typeof envelope.payload === 'string' && envelope.magic === STATE_MAGIC_DEFLATE) {
    const inflated = inflateRawSync(Buffer.from(envelope.payload, 'base64url')).toString('utf8');
    return sanitizeBotMakerState(JSON.parse(inflated));
  }

  if (typeof envelope.payload === 'string' && envelope.magic === STATE_MAGIC_PLAIN) {
    const text = Buffer.from(envelope.payload, 'base64url').toString('utf8');
    return sanitizeBotMakerState(JSON.parse(text));
  }

  return sanitizeBotMakerState(raw);
}


function looksLikeDiscordToken(value: string) {
  const token = value.trim();
  return token.length >= 40 && token.includes('.');
}

function validateBotConfiguration(bot: BotMakerBot, options?: { requireToken?: boolean; strict?: boolean }) {
  const requireToken = Boolean(options?.requireToken);
  const strict = Boolean(options?.strict);

  if ((strict || bot.enabled) && !bot.name.trim()) {
    throw new BotMakerServiceError('Nama bot wajib diisi.', 400);
  }

  if ((strict || bot.enabled) && (!bot.channelId || !DISCORD_SNOWFLAKE_REGEX.test(bot.channelId.trim()))) {
    throw new BotMakerServiceError('Channel ID tidak valid. Gunakan angka snowflake Discord.', 400);
  }

  if (bot.guildId && !DISCORD_SNOWFLAKE_REGEX.test(bot.guildId.trim())) {
    throw new BotMakerServiceError('Guild ID tidak valid. Gunakan angka snowflake Discord.', 400);
  }

  if (bot.applicationId && !DISCORD_SNOWFLAKE_REGEX.test(bot.applicationId.trim())) {
    throw new BotMakerServiceError('Application ID tidak valid. Gunakan angka snowflake Discord.', 400);
  }

  if (requireToken && !bot.token.trim()) {
    throw new BotMakerServiceError('Token bot belum tersimpan.', 400);
  }

  if (bot.token.trim() && !looksLikeDiscordToken(bot.token)) {
    throw new BotMakerServiceError('Format token Discord tidak valid.', 400);
  }
}

function toPersistedBot(bot: BotMakerBot, existing?: PersistedBot): PersistedBot {
  const tokenChanged = bot.token.trim().length > 0;
  const encrypted = tokenChanged
    ? encryptToken(bot.token.trim())
    : {
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
    workflow: bot.workflow,
    intervalSeconds: Math.max(bot.intervalSeconds, 60),
    enabled: bot.enabled,
    deployedAt: bot.deployedAt,
    lastDeployStatus: bot.lastDeployStatus,
    useEmbed: bot.useEmbed,
    mentionEveryone: bot.mentionEveryone,
    stylePreset: bot.stylePreset,
    customCode: bot.customCode,
    tokenUpdatedAt: tokenChanged ? new Date().toISOString() : (existing?.tokenUpdatedAt ?? bot.tokenUpdatedAt),
    tokenCipher: encrypted.tokenCipher,
    tokenIv: encrypted.tokenIv,
  };
}

function toPublicBot(bot: PersistedBot, revealToken = false): BotMakerBot {
  return {
    id: bot.id,
    name: bot.name,
    token: revealToken ? decryptToken(bot.tokenCipher, bot.tokenIv) : '',
    hasToken: Boolean(bot.tokenCipher),
    tokenUpdatedAt: bot.tokenUpdatedAt,
    applicationId: bot.applicationId,
    guildId: bot.guildId,
    channelId: bot.channelId,
    messageTemplate: bot.messageTemplate,
    workflow: bot.workflow,
    intervalSeconds: bot.intervalSeconds,
    enabled: bot.enabled,
    deployedAt: bot.deployedAt,
    lastDeployStatus: bot.lastDeployStatus,
    useEmbed: bot.useEmbed,
    mentionEveryone: bot.mentionEveryone,
    stylePreset: bot.stylePreset,
    customCode: (bot as unknown as { customCode?: string }).customCode ?? '',
  };
}

function syncRuntimeTokenOnBot(bot: PersistedBot, runtimeTokenRaw?: string) {
  const runtimeToken = runtimeTokenRaw?.trim() ?? '';
  if (!runtimeToken) return false;

  const persisted = decryptToken(bot.tokenCipher, bot.tokenIv);
  if (persisted === runtimeToken) return false;

  const encrypted = encryptToken(runtimeToken);
  bot.tokenCipher = encrypted.tokenCipher;
  bot.tokenIv = encrypted.tokenIv;
  bot.tokenUpdatedAt = new Date().toISOString();
  return true;
}

function parsePersistedBots(state: BotMakerState): PersistedBot[] {
  return state.bots.map((bot) => {
    const source = bot as unknown as Partial<PersistedBot>;
    return {
      ...bot,
      tokenCipher: typeof source.tokenCipher === 'string' ? source.tokenCipher : '',
      tokenIv: typeof source.tokenIv === 'string' ? source.tokenIv : '',
    };
  });
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

function renderWorkflowMessage(bot: BotMakerBot) {
  if (bot.workflow.length === 0) {
    return bot.messageTemplate;
  }

  return bot.workflow
    .map((block) => {
      if (block.type === 'text') return block.value;
      if (block.type === 'emoji') return block.value || '✨';
      if (block.type === 'mentionEveryone') return '@everyone';
      if (block.type === 'lineBreak') return '\n';
      if (block.type === 'timestamp') return `<t:${Math.floor(Date.now() / 1000)}:R>`;
      return '';
    })
    .join(' ')
    .replace(/\s+\n/g, '\n')
    .replace(/\n\s+/g, '\n')
    .trim();
}

function buildMessagePayload(bot: BotMakerBot) {
  const mention = bot.mentionEveryone ? '@everyone ' : '';
  const title = `${getPresetPrefix(bot.stylePreset)} • ${bot.name}`;
  const generated = renderWorkflowMessage(bot) || bot.messageTemplate;
  const content = `${mention}${generated}`.trim();

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

function parseLimitHeaders(headers: Headers, body: unknown) {
  const retryFromBody = typeof body === 'object' && body && 'retry_after' in body ? Number((body as { retry_after?: unknown }).retry_after) : NaN;
  const retryFromHeader = Number(headers.get('retry-after'));
  const resetAfterSeconds = Number(headers.get('x-ratelimit-reset-after'));

  return {
    retryAfterMs: Number.isFinite(retryFromBody)
      ? Math.max(0, Math.round(retryFromBody * 1000))
      : Number.isFinite(retryFromHeader)
        ? Math.max(0, Math.round(retryFromHeader * 1000))
        : null,
    resetAfterMs: Number.isFinite(resetAfterSeconds) ? Math.max(0, Math.round(resetAfterSeconds * 1000)) : null,
  };
}

async function syncGuildCommands(bot: BotMakerBot, token: string): Promise<CommandSyncResult> {
  if (!bot.applicationId || !bot.guildId) {
    return { ok: false, status: 0, warning: 'Application ID / Guild ID belum diisi, command sync dilewati.' };
  }

  const response = await fetch(`${DISCORD_API}/applications/${bot.applicationId}/guilds/${bot.guildId}/commands`, {
    method: 'PUT',
    headers: {
      Authorization: `Bot ${token}`,
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

  if (response.status === 404) {
    return { ok: false, status: 404, warning: 'Command sync 404: Application ID/Guild ID tidak cocok atau bot belum ada di guild target.' };
  }

  if (response.status === 403) {
    return { ok: false, status: 403, warning: 'Command sync 403: scope atau permission bot belum sesuai.' };
  }

  if (!response.ok) {
    throw new BotMakerServiceError(`Command sync failed (${response.status})`, 502);
  }

  return { ok: true, status: response.status };
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

  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  const limits = parseLimitHeaders(response.headers, body);

  if (response.status === 429) {
    const waitMs = limits.retryAfterMs ?? 10_000;
    throw new BotMakerServiceError(`Discord rate limited. Retry in ${Math.ceil(waitMs / 1000)}s.`, 429);
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
    return { recordId: null as number | null, version: 0, state: DEFAULT_BOTMAKER_STATE };
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
    return withDatabaseRecovery(() =>
      prisma.map.create({
        data: {
          title: SYSTEM_BOTMAKER_TITLE,
          snapshot: toInputJson(packed),
          version: 1,
        },
        select: { id: true, version: true, updatedAt: true },
      })
    );
  }

  return withDatabaseRecovery(() =>
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
}

export async function loginBotMaker(usernameRaw: string, passwordRaw: string) {
  const username = usernameRaw.trim().toLowerCase();
  const password = passwordRaw.trim();
  if (!username || !password) throw new BotMakerServiceError('Username dan password wajib diisi.', 400);

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

    await persistState(recordId, { ...state, users: [...users, newUser] });
    return { userId: newUser.id, username: newUser.username, signature: signSession(newUser.id) };
  }

  if (!constantSafeEqual(existingUser.passHash, hashPassword(password))) {
    throw new BotMakerServiceError('Username/password tidak valid.', 401);
  }

  existingUser.lastLoginAt = new Date().toISOString();
  await persistState(recordId, state);
  return { userId: existingUser.id, username: existingUser.username, signature: signSession(existingUser.id) };
}

export async function loadBotMakerState() {
  const { state, version } = await readPersistedState();
  const persistedBots = parsePersistedBots(state);

  return {
    data: {
      bots: persistedBots.map((bot) => toPublicBot(bot, true)),
      users: [],
    },
    version,
    updatedAt: new Date().toISOString(),
    diagnostics: getBotMakerDiagnostics(),
  };
}

export async function saveBotMakerState(raw: unknown) {
  const incoming = sanitizeBotMakerState(raw);
  const { recordId, state } = await readPersistedState();

  const existingById = new Map(parsePersistedBots(state).map((bot) => [bot.id, bot]));
  incoming.bots.forEach((bot) => validateBotConfiguration(bot, { strict: false }));
  const mergedPersistedBots = incoming.bots.map((bot) => toPersistedBot(bot, existingById.get(bot.id)));

  const storageState: BotMakerState = {
    bots: mergedPersistedBots as unknown as BotMakerBot[],
    users: state.users,
  };

  const persisted = await persistState(recordId, storageState);
  reconcileRuntime(storageState);

  return {
    data: {
      bots: mergedPersistedBots.map((bot) => toPublicBot(bot, true)),
      users: [],
    },
    version: persisted.version,
    updatedAt: persisted.updatedAt,
    diagnostics: getBotMakerDiagnostics(),
  };
}

async function loadBotById(botId: string, runtimeTokenRaw?: string) {
  const { recordId, state } = await readPersistedState();
  const persistedBots = parsePersistedBots(state);
  const bot = persistedBots.find((entry) => entry.id === botId);
  if (!bot) throw new BotMakerServiceError('Bot tidak ditemukan.', 404);

  const token = resolveRuntimeToken(bot, runtimeTokenRaw);
  if (!token) throw new BotMakerServiceError('Token bot belum tersimpan dan fallback token env belum tersedia.', 400);

  return { recordId, state, bot, token };
}

export async function deployBot(botId: string, runtimeTokenRaw?: string) {
  const loaded = await loadBotById(botId, runtimeTokenRaw);
  logRuntime('deploy:start', { botId, fromRuntimeInput: Boolean(runtimeTokenRaw?.trim()) });

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

  const tokenSyncApplied = syncRuntimeTokenOnBot(target, runtimeTokenRaw);
  if (tokenSyncApplied) {
    logRuntime('deploy:token-sync', { botId, reason: 'runtime-input-token' });
  }

  validateBotConfiguration(toPublicBot(target, true), { requireToken: true, strict: true });
  target.enabled = true;
  target.deployedAt = new Date().toISOString();
  target.lastDeployStatus = `Deployed as ${identity.username} (${identity.id})`;


  if (target.applicationId && target.guildId) {
    logRuntime('deploy:sync-commands:start', { botId, guildId: target.guildId });
    const syncResult = await syncGuildCommands(toPublicBot(target), loaded.token);
    if (!syncResult.ok && syncResult.warning) {
      target.lastDeployStatus = `Deployed as ${identity.username} (${identity.id}) • ${syncResult.warning}`;
      logRuntime('deploy:sync-commands:warning', { botId, status: syncResult.status, warning: syncResult.warning });
    } else {
      logRuntime('deploy:sync-commands:done', { botId, guildId: target.guildId });
    }
  }

  const nextState: BotMakerState = { bots: persistedBots as unknown as BotMakerBot[], users: loaded.state.users };
  const persisted = await persistState(loaded.recordId, nextState);
  reconcileRuntime(nextState);
  logRuntime('deploy:success', { botId, version: persisted.version, enabled: true });

  return {
    data: {
      bots: persistedBots.map((bot) => toPublicBot(bot, true)),
      users: [],
    },
    version: persisted.version,
    updatedAt: persisted.updatedAt,
    diagnostics: getBotMakerDiagnostics(),
  };
}

export async function sendBotNow(botId: string, runtimeTokenRaw?: string) {
  const loaded = await loadBotById(botId, runtimeTokenRaw);
  validateBotConfiguration(toPublicBot(loaded.bot, true), { requireToken: true, strict: true });
  const limits = await sendDiscordMessage(toPublicBot(loaded.bot), loaded.token);
  logRuntime('send-now:success', { botId, hasRetryAfter: Boolean(limits.retryAfterMs), hasResetAfter: Boolean(limits.resetAfterMs) });
  return { ok: true, limits };
}

function reconcileRuntime(state: BotMakerState) {
  const persistedBots = parsePersistedBots(state);
  const activeIds = new Set(
    persistedBots.filter((bot) => bot.enabled && bot.channelId && bot.tokenCipher).map((bot) => bot.id)
  );

  for (const botId of [...ACTIVE_TIMERS.keys()]) {
    if (!activeIds.has(botId)) {
      stopBotTimer(botId);
    }
  }

  persistedBots.forEach((persistedBot) => {
    if (!activeIds.has(persistedBot.id)) return;

    const bot = toPublicBot(persistedBot);
    const token = decryptToken(persistedBot.tokenCipher, persistedBot.tokenIv);
    if (!token) return;

    const runtime = BOT_RUNTIME_STATE.get(persistedBot.id) ?? { running: false, nextAllowedAt: 0, backoffMs: 0, lastCommandSyncAt: 0 };
    BOT_RUNTIME_STATE.set(persistedBot.id, runtime);

    const run = async () => {
      if (runtime.running) {
        scheduleBotSend(persistedBot.id, Math.max(5_000, bot.intervalSeconds * 1000), run);
        return;
      }

      runtime.running = true;
      try {
        const now = Date.now();
        if (now < runtime.nextAllowedAt) {
          scheduleBotSend(persistedBot.id, runtime.nextAllowedAt - now, run);
          return;
        }

        if (Date.now() - runtime.lastCommandSyncAt > MAX_COMMAND_SYNC_INTERVAL_MS) {
          const syncResult = await syncGuildCommands(bot, token);
          runtime.lastCommandSyncAt = Date.now();
          if (!syncResult.ok && syncResult.warning) {
            logRuntime('runtime:sync-commands:warning', { botId: persistedBot.id, status: syncResult.status, warning: syncResult.warning });
          }
        }

        const limits = await sendDiscordMessage(bot, token);
        const intervalMs = Math.max(MIN_SAFE_DISCORD_INTERVAL_MS, bot.intervalSeconds * 1000);
        const resetMs = limits.resetAfterMs ?? 0;
        runtime.backoffMs = 0;
        runtime.nextAllowedAt = Date.now() + Math.max(intervalMs, resetMs);
        scheduleBotSend(persistedBot.id, Math.max(intervalMs, resetMs), run);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logRuntime('runtime:send-error', { botId: persistedBot.id, message: message.slice(0, 160) });
        const hintedRateLimit = message.toLowerCase().includes('rate') || message.includes('429');
        const nextBackoff = runtime.backoffMs === 0 ? 15_000 : Math.min(MAX_BACKOFF_MS, runtime.backoffMs * 2);
        runtime.backoffMs = hintedRateLimit ? Math.max(nextBackoff, 60_000) : nextBackoff;
        runtime.nextAllowedAt = Date.now() + runtime.backoffMs;
        scheduleBotSend(persistedBot.id, runtime.backoffMs, run);
      } finally {
        runtime.running = false;
      }
    };

    const firstDelay = Math.max(MIN_SAFE_DISCORD_INTERVAL_MS, bot.intervalSeconds * 1000);
    if (!ACTIVE_TIMERS.has(persistedBot.id)) {
      scheduleBotSend(persistedBot.id, firstDelay, run);
    }
  });
}

export { BOTMAKER_COOKIE, BOTMAKER_USER_COOKIE, BotMakerServiceError };
