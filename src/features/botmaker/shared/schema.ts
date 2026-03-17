export interface BotMakerBot {
  id: string;
  name: string;
  token: string;
  applicationId: string;
  guildId: string;
  channelId: string;
  messageTemplate: string;
  intervalSeconds: number;
  enabled: boolean;
  deployedAt: string | null;
  lastDeployStatus: string;
}

export interface BotMakerState {
  bots: BotMakerBot[];
}

export const DEFAULT_BOTMAKER_STATE: BotMakerState = {
  bots: [],
};

function cleanString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback;
}

function clampInterval(value: unknown) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 300;
  return Math.max(30, Math.min(86_400, Math.round(numeric)));
}

function sanitizeBot(raw: unknown, index: number): BotMakerBot {
  const source = (raw && typeof raw === 'object' ? raw : {}) as Partial<BotMakerBot>;
  const id = cleanString(source.id, `bot-${index + 1}`);
  return {
    id,
    name: cleanString(source.name, `Discord Bot ${index + 1}`),
    token: cleanString(source.token),
    applicationId: cleanString(source.applicationId),
    guildId: cleanString(source.guildId),
    channelId: cleanString(source.channelId),
    messageTemplate: cleanString(source.messageTemplate, 'Halo dari BotMaker!'),
    intervalSeconds: clampInterval(source.intervalSeconds),
    enabled: Boolean(source.enabled),
    deployedAt: typeof source.deployedAt === 'string' && source.deployedAt ? source.deployedAt : null,
    lastDeployStatus: cleanString(source.lastDeployStatus),
  };
}

export function sanitizeBotMakerState(raw: unknown): BotMakerState {
  const source = (raw && typeof raw === 'object' ? raw : {}) as Partial<BotMakerState>;
  const bots = Array.isArray(source.bots) ? source.bots.map((entry, index) => sanitizeBot(entry, index)) : [];

  const deduped = new Map<string, BotMakerBot>();
  bots.forEach((bot, index) => {
    const id = bot.id || `bot-${index + 1}`;
    if (!deduped.has(id)) {
      deduped.set(id, { ...bot, id });
    }
  });

  return { bots: [...deduped.values()] };
}
