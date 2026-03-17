import { Prisma } from '@prisma/client';
import { activeDatabaseHost, prisma } from '@/lib/prisma';
import { DEFAULT_BOTMAKER_STATE, sanitizeBotMakerState, type BotMakerState } from '@/features/botmaker/shared/schema';

const SYSTEM_BOTMAKER_TITLE = '__SYSTEM__BOTMAKER_V1';
const DISCORD_API = 'https://discord.com/api/v10';
const ACTIVE_TIMERS = new Map<string, ReturnType<typeof setInterval>>();

type DiscordUserResponse = { id: string; username: string };

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

async function postDiscordMessage(token: string, channelId: string, content: string) {
  const response = await fetch(`${DISCORD_API}/channels/${channelId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bot ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ content }),
    cache: 'no-store',
  });

  if (!response.ok) {
    const txt = await response.text();
    throw new Error(`Discord send failed (${response.status}): ${txt.slice(0, 220)}`);
  }
}

function maskToken(token: string) {
  if (!token) return '';
  if (token.length <= 10) return '**********';
  return `${token.slice(0, 4)}...${token.slice(-4)}`;
}

function reconcileRuntime(state: BotMakerState) {
  const activeIds = new Set(state.bots.filter((bot) => bot.enabled && bot.token && bot.channelId).map((bot) => bot.id));

  for (const [botId, timer] of ACTIVE_TIMERS.entries()) {
    if (!activeIds.has(botId)) {
      clearInterval(timer);
      ACTIVE_TIMERS.delete(botId);
    }
  }

  state.bots.forEach((bot) => {
    if (!activeIds.has(bot.id) || ACTIVE_TIMERS.has(bot.id)) {
      return;
    }

    const timer = setInterval(() => {
      void postDiscordMessage(bot.token, bot.channelId, bot.messageTemplate).catch((error) => {
        console.error(`[BotMaker:${bot.id}] interval send failed`, error);
      });
    }, bot.intervalSeconds * 1000);

    ACTIVE_TIMERS.set(bot.id, timer);
  });
}

export async function loadBotMakerState() {
  const existing = await findSystemRecord();

  if (!existing) {
    const created = await withDatabaseRecovery(() =>
      prisma.map.create({
        data: {
          title: SYSTEM_BOTMAKER_TITLE,
          snapshot: toInputJson(DEFAULT_BOTMAKER_STATE),
          version: 1,
        },
        select: { snapshot: true, version: true, updatedAt: true },
      })
    );

    reconcileRuntime(DEFAULT_BOTMAKER_STATE);
    return { data: DEFAULT_BOTMAKER_STATE, version: created.version, updatedAt: created.updatedAt };
  }

  const data = sanitizeBotMakerState(existing.snapshot);
  reconcileRuntime(data);
  return {
    data: {
      bots: data.bots.map((bot) => ({ ...bot, token: maskToken(bot.token) })),
    },
    version: existing.version,
    updatedAt: existing.updatedAt,
  };
}

export async function saveBotMakerState(raw: unknown) {
  const state = sanitizeBotMakerState(raw);
  const existing = await findSystemRecord();

  if (!existing) {
    const created = await withDatabaseRecovery(() =>
      prisma.map.create({
        data: {
          title: SYSTEM_BOTMAKER_TITLE,
          snapshot: toInputJson(state),
          version: 1,
        },
        select: { version: true, updatedAt: true },
      })
    );

    reconcileRuntime(state);
    return { data: state, version: created.version, updatedAt: created.updatedAt };
  }

  const updated = await withDatabaseRecovery(() =>
    prisma.map.update({
      where: { id: existing.id },
      data: {
        snapshot: toInputJson(state),
        version: { increment: 1 },
        updatedAt: new Date(),
      },
      select: { version: true, updatedAt: true },
    })
  );

  reconcileRuntime(state);
  return { data: state, version: updated.version, updatedAt: updated.updatedAt };
}

export async function deployBot(botId: string) {
  const record = await findSystemRecord();
  if (!record) {
    throw new BotMakerServiceError('Data BotMaker belum ada.', 404);
  }

  const state = sanitizeBotMakerState(record.snapshot);
  const bot = state.bots.find((entry) => entry.id === botId);
  if (!bot) {
    throw new BotMakerServiceError('Bot tidak ditemukan.', 404);
  }
  if (!bot.token) {
    throw new BotMakerServiceError('Bot token wajib diisi.', 400);
  }

  const identityRes = await fetch(`${DISCORD_API}/users/@me`, {
    headers: { Authorization: `Bot ${bot.token}` },
    cache: 'no-store',
  });

  if (!identityRes.ok) {
    const txt = await identityRes.text();
    throw new BotMakerServiceError(`Token bot tidak valid (${identityRes.status}): ${txt.slice(0, 160)}`, 400);
  }

  const identity = (await identityRes.json()) as DiscordUserResponse;
  bot.enabled = true;
  bot.deployedAt = new Date().toISOString();
  bot.lastDeployStatus = `Deployed as ${identity.username} (${identity.id})`;

  if (bot.applicationId && bot.guildId) {
    await fetch(`${DISCORD_API}/applications/${bot.applicationId}/guilds/${bot.guildId}/commands`, {
      method: 'PUT',
      headers: {
        Authorization: `Bot ${bot.token}`,
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

  const updated = await withDatabaseRecovery(() =>
    prisma.map.update({
      where: { id: record.id },
      data: {
        snapshot: toInputJson(state),
        version: { increment: 1 },
        updatedAt: new Date(),
      },
      select: { version: true, updatedAt: true },
    })
  );

  reconcileRuntime(state);

  return {
    data: {
      bots: state.bots.map((entry) => ({ ...entry, token: maskToken(entry.token) })),
    },
    version: updated.version,
    updatedAt: updated.updatedAt,
  };
}

export async function sendBotNow(botId: string) {
  const record = await findSystemRecord();
  if (!record) {
    throw new BotMakerServiceError('Data BotMaker belum ada.', 404);
  }
  const state = sanitizeBotMakerState(record.snapshot);
  const bot = state.bots.find((entry) => entry.id === botId);
  if (!bot) throw new BotMakerServiceError('Bot tidak ditemukan.', 404);
  if (!bot.token || !bot.channelId) throw new BotMakerServiceError('Token dan channel ID wajib diisi.', 400);

  await postDiscordMessage(bot.token, bot.channelId, bot.messageTemplate);

  return { ok: true };
}

export { BotMakerServiceError };
