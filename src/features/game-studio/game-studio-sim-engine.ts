export type CompanyCategory = 'semiconductor' | 'game';
export type GameMode = 'online' | 'offline' | 'hybrid';

export type ProfileDraft = {
  name: string;
  background: string;
  selectedCompany: CompanyKey;
  category: CompanyCategory;
};

export type CompanyKey = 'nova' | 'pixelforge' | 'dreamline';

export type CompanyPanelKey = 'management' | 'games' | 'research';
export type GameDetailPanelKey = 'community' | 'criticism' | 'engine';

export type Executive = {
  name: string;
  role: string;
  experienceYears: number;
};

export type Staff = {
  leadDeveloper: string;
  leadEngineer: string;
  totalEmployees: number;
};

export type CommunityState = {
  serverName: string;
  members: number;
  activityRate: number;
};

export type GameTitle = {
  id: string;
  title: string;
  genre: string;
  mode: GameMode;
  releasedDay: number;
  version: number;
  downloads: number;
  popularity: number;
  lastUpdateDay: number;
  community: CommunityState;
  criticisms: string[];
  releaseStatus: 'active' | 'archived';
};

export type ResearchTrack = {
  key: string;
  label: string;
  level: number;
  cap: number;
  researchCost: number;
  impact: string;
};

export type GameCompanyState = {
  key: CompanyKey;
  name: string;
  founder: string;
  establishedDay: number;
  cash: number;
  ceo: string;
  executives: Executive[];
  staff: Staff;
  releasedGames: GameTitle[];
  activeGameIds: string[];
  researchTracks: ResearchTrack[];
  firstReleaseDay: number;
  lastReleaseDay: number;
};

export type GameState = {
  elapsedDays: number;
  tickCount: number;
  player: {
    id: string;
    name: string;
    background: string;
    companyCategory: CompanyCategory;
    selectedCompany: CompanyKey;
  };
  companies: Record<CompanyKey, GameCompanyState>;
  feed: string[];
};

export const STORAGE_KEY = 'mindmapper-game-company-sim-v1';
export const TICK_MS = 1000;
export const RELEASE_INTERVAL_DAYS = 365 * 3;

export const COMPANY_KEYS: CompanyKey[] = ['nova', 'pixelforge', 'dreamline'];

export const DEFAULT_PROFILE_DRAFT: ProfileDraft = {
  name: '',
  background: '',
  selectedCompany: 'nova',
  category: 'game'
};

export const DEFAULT_COMPANY_PANELS: Record<CompanyPanelKey, boolean> = {
  management: true,
  games: true,
  research: false
};

export const DEFAULT_GAME_DETAIL_PANELS: Record<GameDetailPanelKey, boolean> = {
  community: true,
  criticism: true,
  engine: false
};

const DEFAULT_CRITICISMS = [
  'Monetisasi terlalu pay-to-win.',
  'Masih banyak bug di update terbaru.',
  'Ritme update konten dianggap terlalu lambat.'
];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function randomBetween(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function randomInt(min: number, max: number) {
  return Math.floor(randomBetween(min, max + 1));
}

function createGame(id: string, title: string, genre: string, mode: GameMode, releasedDay: number): GameTitle {
  return {
    id,
    title,
    genre,
    mode,
    releasedDay,
    version: 1,
    downloads: randomInt(120_000, 420_000),
    popularity: randomBetween(46, 81),
    lastUpdateDay: releasedDay,
    community: {
      serverName: `${title} Community Hub`,
      members: randomInt(9_000, 72_000),
      activityRate: randomBetween(38, 79)
    },
    criticisms: [...DEFAULT_CRITICISMS],
    releaseStatus: 'active'
  };
}

function createCompany(key: CompanyKey, name: string, ceo: string, founder: string, firstReleaseDay: number, starterGame: GameTitle): GameCompanyState {
  return {
    key,
    name,
    founder,
    establishedDay: 0,
    cash: randomInt(16_000_000, 38_000_000),
    ceo,
    executives: [
      { name: `${ceo}`, role: 'CEO', experienceYears: randomInt(8, 22) },
      { name: `${name} COO`, role: 'COO', experienceYears: randomInt(7, 19) },
      { name: `${name} CTO`, role: 'CTO', experienceYears: randomInt(9, 20) }
    ],
    staff: {
      leadDeveloper: `${name} Lead Developer`,
      leadEngineer: `${name} Lead Engineer`,
      totalEmployees: randomInt(140, 950)
    },
    releasedGames: [starterGame],
    activeGameIds: [starterGame.id],
    researchTracks: [
      { key: 'rendering', label: 'Rendering Pipeline', level: 1, cap: 8, researchCost: 2_400_000, impact: 'FPS stabilitas, visual fidelity.' },
      { key: 'netcode', label: 'Netcode Scalability', level: 1, cap: 8, researchCost: 2_900_000, impact: 'Latency rendah dan server reliability.' },
      { key: 'tooling', label: 'Live Ops Tooling', level: 1, cap: 8, researchCost: 1_700_000, impact: 'Patch pipeline dan analytics lebih cepat.' }
    ],
    firstReleaseDay,
    lastReleaseDay: firstReleaseDay
  };
}

export function createInitialGameState(profile: ProfileDraft): GameState {
  const novaStarter = createGame('nova-skyline', 'Skyline Raid', 'Action RPG', 'hybrid', 20);
  const pixelStarter = createGame('pixel-rivals', 'Pixel Rivals', 'Competitive Shooter', 'online', 120);
  const dreamStarter = createGame('dream-odyssey', 'Dream Odyssey', 'Narrative Adventure', 'offline', 180);

  return {
    elapsedDays: 365,
    tickCount: 0,
    player: {
      id: 'player',
      name: profile.name.trim(),
      background: profile.background.trim(),
      selectedCompany: profile.selectedCompany,
      companyCategory: profile.category
    },
    companies: {
      nova: createCompany('nova', 'Nova Arcadia', 'Ari Wijaya', 'Ari Wijaya', 20, novaStarter),
      pixelforge: createCompany('pixelforge', 'PixelForge Works', 'Kei Santoso', 'Kei Santoso', 120, pixelStarter),
      dreamline: createCompany('dreamline', 'Dreamline Interactive', 'Mira Halim', 'Mira Halim', 180, dreamStarter)
    },
    feed: ['Profil siap. Simulasi perusahaan game berjalan.']
  };
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US').format(Math.round(value));
}

export function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

export function formatDateFromDays(elapsedDays: number) {
  const start = Date.UTC(2026, 0, 1);
  const date = new Date(start + elapsedDays * 86400000);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function maybeReleaseNewGame(company: GameCompanyState, elapsedDays: number): { updated: GameCompanyState; releasedTitle?: string } {
  const sinceLast = elapsedDays - company.lastReleaseDay;
  if (sinceLast < RELEASE_INTERVAL_DAYS) return { updated: company };

  const shouldRelease = Math.random() < 0.12;
  if (!shouldRelease) return { updated: company };

  const id = `${company.key}-${elapsedDays}`;
  const seq = company.releasedGames.length + 1;
  const title = `${company.name} Project ${seq}`;
  const genrePool = ['Action RPG', 'Survival', 'Strategy', 'MMO', 'Sports', 'Cozy Sim'];
  const modePool: GameMode[] = ['online', 'offline', 'hybrid'];
  const newGame = createGame(id, title, genrePool[randomInt(0, genrePool.length - 1)], modePool[randomInt(0, modePool.length - 1)], elapsedDays);

  return {
    updated: {
      ...company,
      releasedGames: [newGame, ...company.releasedGames],
      activeGameIds: [newGame.id, ...company.activeGameIds.slice(0, 3)],
      lastReleaseDay: elapsedDays,
      cash: company.cash - 4_200_000
    },
    releasedTitle: newGame.title
  };
}

function updateLiveGames(company: GameCompanyState, elapsedDays: number): GameCompanyState {
  const releasedGames = company.releasedGames.map((game) => {
    const growthFactor = clamp((game.popularity / 100) + randomBetween(0.18, 0.56), 0.1, 1.5);
    const newDownloads = game.downloads + Math.round(800 * growthFactor + randomInt(600, 2200));
    const popularityShift = randomBetween(-2.5, 2.8);
    const nextPopularity = clamp(game.popularity + popularityShift, 8, 98);
    const shouldPatch = elapsedDays - game.lastUpdateDay > randomInt(12, 40);
    const nextVersion = shouldPatch ? game.version + 0.1 : game.version;

    return {
      ...game,
      downloads: newDownloads,
      popularity: nextPopularity,
      version: Number(nextVersion.toFixed(1)),
      lastUpdateDay: shouldPatch ? elapsedDays : game.lastUpdateDay,
      community: {
        ...game.community,
        members: game.community.members + randomInt(30, 480),
        activityRate: clamp(game.community.activityRate + randomBetween(-3, 3), 12, 95)
      }
    };
  });

  const maintenanceCost = releasedGames.length * 48_000;
  const totalRevenue = releasedGames.reduce((sum, game) => sum + game.downloads * 0.05, 0);

  return {
    ...company,
    releasedGames,
    cash: company.cash + totalRevenue - maintenanceCost
  };
}

export function upgradeResearchTrack(company: GameCompanyState, key: string): GameCompanyState {
  const updatedTracks = company.researchTracks.map((track) => {
    if (track.key !== key || track.level >= track.cap || company.cash < track.researchCost) {
      return track;
    }
    return { ...track, level: track.level + 1, researchCost: Math.round(track.researchCost * 1.35) };
  });

  const selected = company.researchTracks.find((track) => track.key === key);
  const upgraded = updatedTracks.find((track) => track.key === key);
  const spent = selected && upgraded && upgraded.level > selected.level ? selected.researchCost : 0;

  return {
    ...company,
    researchTracks: updatedTracks,
    cash: company.cash - spent
  };
}

export function simulateTick(state: GameState): GameState {
  const elapsedDays = state.elapsedDays + 1;
  const feed = [...state.feed];

  const companies = COMPANY_KEYS.reduce((acc, key) => {
    let company = updateLiveGames(state.companies[key], elapsedDays);
    const releaseResult = maybeReleaseNewGame(company, elapsedDays);
    company = releaseResult.updated;
    if (releaseResult.releasedTitle) {
      feed.unshift(`${company.name} merilis game baru: ${releaseResult.releasedTitle}.`);
    }

    acc[key] = company;
    return acc;
  }, {} as Record<CompanyKey, GameCompanyState>);

  return {
    ...state,
    elapsedDays,
    tickCount: state.tickCount + 1,
    companies,
    feed: feed.slice(0, 90)
  };
}
