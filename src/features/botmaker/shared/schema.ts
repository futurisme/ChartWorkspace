export type BotStylePreset = 'minimal' | 'alert' | 'release' | 'community';
export type WorkflowBlockType = 'text' | 'emoji' | 'mentionEveryone' | 'lineBreak' | 'timestamp';

export interface WorkflowBlock {
  id: string;
  type: WorkflowBlockType;
  value: string;
}

export interface BotMakerBot {
  id: string;
  name: string;
  token: string;
  hasToken: boolean;
  tokenUpdatedAt: string | null;
  tokenCipher?: string;
  tokenIv?: string;
  applicationId: string;
  guildId: string;
  channelId: string;
  messageTemplate: string;
  workflow: WorkflowBlock[];
  intervalSeconds: number;
  enabled: boolean;
  deployedAt: string | null;
  lastDeployStatus: string;
  useEmbed: boolean;
  mentionEveryone: boolean;
  stylePreset: BotStylePreset;
  customCode: string;
}

export interface BotMakerAuthUser {
  id: string;
  username: string;
  passHash: string;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface BotMakerState {
  bots: BotMakerBot[];
  users: BotMakerAuthUser[];
}

export const DEFAULT_BOTMAKER_STATE: BotMakerState = {
  bots: [],
  users: [],
};

function cleanString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback;
}

function clampInterval(value: unknown) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 300;
  return Math.max(60, Math.min(86_400, Math.round(numeric)));
}

function sanitizePreset(value: unknown): BotStylePreset {
  if (value === 'alert' || value === 'release' || value === 'community') return value;
  return 'minimal';
}

function sanitizeBlockType(value: unknown): WorkflowBlockType {
  if (value === 'emoji' || value === 'mentionEveryone' || value === 'lineBreak' || value === 'timestamp') return value;
  return 'text';
}

function sanitizeWorkflow(raw: unknown): WorkflowBlock[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((entry, index) => {
    const source = (entry && typeof entry === 'object' ? entry : {}) as Partial<WorkflowBlock>;
    return {
      id: cleanString(source.id, `block-${index + 1}`),
      type: sanitizeBlockType(source.type),
      value: cleanString(source.value),
    };
  });
}

function sanitizeBot(raw: unknown, index: number): BotMakerBot {
  const source = (raw && typeof raw === 'object' ? raw : {}) as Partial<BotMakerBot>;
  const id = cleanString(source.id, `bot-${index + 1}`);
  return {
    id,
    name: cleanString(source.name, `Discord Bot ${index + 1}`),
    token: cleanString(source.token),
    hasToken: Boolean(source.hasToken) || cleanString(source.token).length > 0 || cleanString(source.tokenCipher).length > 0,
    tokenUpdatedAt: typeof source.tokenUpdatedAt === 'string' && source.tokenUpdatedAt ? source.tokenUpdatedAt : null,
    tokenCipher: cleanString(source.tokenCipher),
    tokenIv: cleanString(source.tokenIv),
    applicationId: cleanString(source.applicationId),
    guildId: cleanString(source.guildId),
    channelId: cleanString(source.channelId),
    messageTemplate: cleanString(source.messageTemplate, 'Halo dari BotMaker!'),
    workflow: sanitizeWorkflow(source.workflow),
    intervalSeconds: clampInterval(source.intervalSeconds),
    enabled: Boolean(source.enabled),
    deployedAt: typeof source.deployedAt === 'string' && source.deployedAt ? source.deployedAt : null,
    lastDeployStatus: cleanString(source.lastDeployStatus),
    useEmbed: Boolean(source.useEmbed),
    mentionEveryone: Boolean(source.mentionEveryone),
    stylePreset: sanitizePreset(source.stylePreset),
    customCode: cleanString(source.customCode),
  };
}

function sanitizeUser(raw: unknown, index: number): BotMakerAuthUser {
  const source = (raw && typeof raw === 'object' ? raw : {}) as Partial<BotMakerAuthUser>;
  const id = cleanString(source.id, `user-${index + 1}`);
  return {
    id,
    username: cleanString(source.username, `operator-${index + 1}`).toLowerCase(),
    passHash: cleanString(source.passHash),
    createdAt: cleanString(source.createdAt, new Date(0).toISOString()),
    lastLoginAt: typeof source.lastLoginAt === 'string' && source.lastLoginAt ? source.lastLoginAt : null,
  };
}

export function sanitizeBotMakerState(raw: unknown): BotMakerState {
  const source = (raw && typeof raw === 'object' ? raw : {}) as Partial<BotMakerState>;
  const bots = Array.isArray(source.bots) ? source.bots.map((entry, index) => sanitizeBot(entry, index)) : [];
  const users = Array.isArray(source.users) ? source.users.map((entry, index) => sanitizeUser(entry, index)) : [];

  const dedupedBots = new Map<string, BotMakerBot>();
  bots.forEach((bot, index) => {
    const id = bot.id || `bot-${index + 1}`;
    if (!dedupedBots.has(id)) {
      dedupedBots.set(id, { ...bot, id });
    }
  });

  const dedupedUsers = new Map<string, BotMakerAuthUser>();
  users.forEach((user, index) => {
    const id = user.id || `user-${index + 1}`;
    if (!dedupedUsers.has(id)) {
      dedupedUsers.set(id, { ...user, id });
    }
  });

  return { bots: [...dedupedBots.values()], users: [...dedupedUsers.values()] };
}
