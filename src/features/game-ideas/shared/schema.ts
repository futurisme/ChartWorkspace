export const GAME_IDEA_STORAGE_KEY = 'CODEX_V5_DATA';

export type GameIdeaNav = 'govt' | 'units' | 'tech' | 'econ';

export interface GameIdeaItem {
  name: string;
  tag: string;
  desc: string;
  stats: Record<string, string>;
}

export interface GameIdeaSection {
  title: string;
  categories: string[];
  data: Record<string, GameIdeaItem[]>;
}

export type GameIdeaDatabase = Record<GameIdeaNav, GameIdeaSection>;

export const GAME_IDEA_NAV_ORDER: GameIdeaNav[] = ['govt', 'units', 'tech', 'econ'];

export const DEFAULT_GAME_IDEA_DATA: GameIdeaDatabase = {
  govt: {
    title: 'CODEX: GOVT',
    categories: ['FEUDAL', 'MODERN'],
    data: {
      FEUDAL: [{ name: 'TRIBAL', tag: 'BASE', desc: 'Primitive structure.', stats: { Stability: '60%' } }],
      MODERN: [],
    },
  },
  units: {
    title: 'CODEX: UNITS',
    categories: ['CYBER'],
    data: {
      CYBER: [],
    },
  },
  tech: {
    title: 'CODEX: TECH',
    categories: ['BIO'],
    data: {
      BIO: [],
    },
  },
  econ: {
    title: 'CODEX: ECON',
    categories: ['TRADE'],
    data: {
      TRADE: [],
    },
  },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function sanitizeItem(value: unknown): GameIdeaItem | null {
  if (!isRecord(value)) return null;
  const name = typeof value.name === 'string' ? value.name.trim() : '';
  if (!name) return null;

  const tag = typeof value.tag === 'string' ? value.tag.trim().slice(0, 32) : '';
  const desc = typeof value.desc === 'string' ? value.desc.trim().slice(0, 1200) : '';

  const rawStats = isRecord(value.stats) ? value.stats : {};
  const stats: Record<string, string> = {};
  Object.entries(rawStats).forEach(([key, statValue]) => {
    if (typeof statValue !== 'string') return;
    const cleanKey = key.trim();
    const cleanValue = statValue.trim();
    if (!cleanKey || !cleanValue) return;
    stats[cleanKey.slice(0, 32)] = cleanValue.slice(0, 80);
  });

  return { name: name.slice(0, 120), tag, desc, stats };
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

  const safeCategories = categories.length > 0 ? categories : fallback.categories;
  const rawData = isRecord(sectionObj.data) ? sectionObj.data : {};
  const data: Record<string, GameIdeaItem[]> = {};

  safeCategories.forEach((category) => {
    const incoming = Array.isArray(rawData[category]) ? rawData[category] : [];
    data[category] = incoming.map(sanitizeItem).filter((item): item is GameIdeaItem => Boolean(item)).slice(0, 500);
  });

  return { title, categories: safeCategories, data };
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
