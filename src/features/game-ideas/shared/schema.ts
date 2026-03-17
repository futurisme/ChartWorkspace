export const GAME_IDEA_STORAGE_KEY = 'CODEX_V5_DATA';

export type GameIdeaNav = 'govt' | 'units' | 'tech' | 'econ';

export interface GameIdeaItem {
  id: string;
  name: string;
  tag: string;
  desc: string;
  stats: Record<string, string>;
  colorGradient?: string;
}

export interface GameIdeaFolder {
  id: string;
  name: string;
  items: GameIdeaItem[];
}

export type GameIdeaRootSlot = {
  kind: 'item' | 'folder';
  id: string;
};

export interface GameIdeaSection {
  title: string;
  categories: string[];
  data: Record<string, GameIdeaItem[]>;
  folders?: Record<string, GameIdeaFolder[]>;
  rootOrder?: Record<string, GameIdeaRootSlot[]>;
  navGradient?: string;
  categoryGradients?: Record<string, string>;
}

export type GameIdeaDatabase = Record<GameIdeaNav, GameIdeaSection>;

export const GAME_IDEA_NAV_ORDER: GameIdeaNav[] = ['govt', 'units', 'tech', 'econ'];

export const DEFAULT_GAME_IDEA_DATA: GameIdeaDatabase = {
  govt: { title: 'CODEX: GOVT', categories: [], data: {} },
  units: { title: 'CODEX: UNITS', categories: [], data: {} },
  tech: { title: 'CODEX: TECH', categories: [], data: {} },
  econ: { title: 'CODEX: ECON', categories: [], data: {} },
};

const ALLOWED_GRADIENTS = new Set([
  'linear-gradient(135deg,#00f5ff 0%,#0066ff 100%)',
  'linear-gradient(135deg,#7c3aed 0%,#06b6d4 100%)',
  'linear-gradient(135deg,#22c55e 0%,#06b6d4 100%)',
  'linear-gradient(135deg,#f59e0b 0%,#ef4444 100%)',
  'linear-gradient(135deg,#ec4899 0%,#8b5cf6 100%)',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function sanitizeGradient(value: unknown) {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  return ALLOWED_GRADIENTS.has(normalized) ? normalized : undefined;
}

function sanitizeId(value: unknown, fallback: string) {
  if (typeof value !== 'string') return fallback;
  const normalized = value.trim();
  return normalized ? normalized.slice(0, 96) : fallback;
}

function sanitizeItem(value: unknown, fallbackId: string): GameIdeaItem | null {
  if (!isRecord(value)) return null;
  const name = typeof value.name === 'string' ? value.name.trim() : '';
  if (!name) return null;

  const tag = typeof value.tag === 'string' ? value.tag.trim().slice(0, 32) : '';
  const desc = typeof value.desc === 'string' ? value.desc.trim() : '';

  const rawStats = isRecord(value.stats) ? value.stats : {};
  const stats: Record<string, string> = {};
  Object.entries(rawStats).forEach(([key, statValue]) => {
    if (typeof statValue !== 'string') return;
    const cleanKey = key.trim();
    const cleanValue = statValue.trim();
    if (!cleanKey || !cleanValue) return;
    stats[cleanKey.slice(0, 32)] = cleanValue.slice(0, 80);
  });

  const colorGradient = sanitizeGradient(value.colorGradient);

  return {
    id: sanitizeId(value.id, fallbackId),
    name: name.slice(0, 120),
    tag,
    desc,
    stats,
    ...(colorGradient ? { colorGradient } : {}),
  };
}

function sanitizeFolder(value: unknown, fallbackId: string): GameIdeaFolder | null {
  if (!isRecord(value)) return null;
  const name = typeof value.name === 'string' ? value.name.trim().slice(0, 80) : '';
  if (!name) return null;

  const folderId = sanitizeId(value.id, fallbackId);
  const rawItems = Array.isArray(value.items) ? value.items : [];
  const items = rawItems
    .map((item, index) => sanitizeItem(item, `item-${folderId}-${index + 1}`))
    .filter((item): item is GameIdeaItem => Boolean(item))
    .slice(0, 500);

  return { id: folderId, name, items };
}

function buildRootOrderForCategory(items: GameIdeaItem[], folders: GameIdeaFolder[], incoming: unknown): GameIdeaRootSlot[] {
  const itemIds = new Set(items.map((item) => item.id));
  const folderIds = new Set(folders.map((folder) => folder.id));
  const used = new Set<string>();
  const next: GameIdeaRootSlot[] = [];

  const incomingSlots = Array.isArray(incoming) ? incoming : [];
  incomingSlots.forEach((slot) => {
    if (!isRecord(slot)) return;
    const kind = slot.kind === 'item' || slot.kind === 'folder' ? slot.kind : null;
    if (!kind) return;
    const id = typeof slot.id === 'string' ? slot.id.trim() : '';
    if (!id) return;
    const key = `${kind}:${id}`;
    if (used.has(key)) return;
    if (kind === 'item' && !itemIds.has(id)) return;
    if (kind === 'folder' && !folderIds.has(id)) return;
    used.add(key);
    next.push({ kind, id });
  });

  items.forEach((item) => {
    const key = `item:${item.id}`;
    if (used.has(key)) return;
    used.add(key);
    next.push({ kind: 'item', id: item.id });
  });

  folders.forEach((folder) => {
    const key = `folder:${folder.id}`;
    if (used.has(key)) return;
    used.add(key);
    next.push({ kind: 'folder', id: folder.id });
  });

  return next;
}

function sanitizeSection(value: unknown, fallback: GameIdeaSection): GameIdeaSection {
  const sectionObj = isRecord(value) ? value : {};
  const title = typeof sectionObj.title === 'string' && sectionObj.title.trim() ? sectionObj.title.trim() : fallback.title;

  const categoriesInput = Array.isArray(sectionObj.categories) ? sectionObj.categories : fallback.categories;
  const categories = Array.from(
    new Set(
      categoriesInput
        .map((entry) => (typeof entry === 'string' ? entry.trim().toUpperCase() : ''))
        .filter(Boolean)
    )
  ).slice(0, 60);

  const data: Record<string, GameIdeaItem[]> = {};
  const rawData = isRecord(sectionObj.data) ? sectionObj.data : {};
  categories.forEach((category) => {
    const incoming = Array.isArray(rawData[category]) ? rawData[category] : [];
    data[category] = incoming
      .map((item, index) => sanitizeItem(item, `item-${category}-${index + 1}`))
      .filter((item): item is GameIdeaItem => Boolean(item))
      .slice(0, 500);
  });

  const folders: Record<string, GameIdeaFolder[]> = {};
  const rawFolders = isRecord(sectionObj.folders) ? sectionObj.folders : {};
  categories.forEach((category) => {
    const incoming = Array.isArray(rawFolders[category]) ? rawFolders[category] : [];
    folders[category] = incoming
      .map((folder, index) => sanitizeFolder(folder, `folder-${category}-${index + 1}`))
      .filter((folder): folder is GameIdeaFolder => Boolean(folder))
      .slice(0, 120);
  });

  const rootOrder: Record<string, GameIdeaRootSlot[]> = {};
  const rawRootOrder = isRecord(sectionObj.rootOrder) ? sectionObj.rootOrder : {};
  categories.forEach((category) => {
    rootOrder[category] = buildRootOrderForCategory(data[category] ?? [], folders[category] ?? [], rawRootOrder[category]);
  });

  const categoryGradientsRaw = isRecord(sectionObj.categoryGradients) ? sectionObj.categoryGradients : {};
  const categoryGradients: Record<string, string> = {};
  categories.forEach((category) => {
    const gradient = sanitizeGradient(categoryGradientsRaw[category]);
    if (gradient) categoryGradients[category] = gradient;
  });

  const navGradient = sanitizeGradient(sectionObj.navGradient);

  return {
    title,
    categories,
    data,
    folders,
    rootOrder,
    ...(Object.keys(categoryGradients).length > 0 ? { categoryGradients } : {}),
    ...(navGradient ? { navGradient } : {}),
  };
}

export function sanitizeGameIdeaDatabase(input: unknown): GameIdeaDatabase {
  const root = isRecord(input) ? input : {};
  return {
    govt: sanitizeSection(root.govt, DEFAULT_GAME_IDEA_DATA.govt),
    units: sanitizeSection(root.units, DEFAULT_GAME_IDEA_DATA.units),
    tech: sanitizeSection(root.tech, DEFAULT_GAME_IDEA_DATA.tech),
    econ: sanitizeSection(root.econ, DEFAULT_GAME_IDEA_DATA.econ),
  };
}
