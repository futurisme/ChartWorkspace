'use client';

import { useEffect, useMemo, useState } from 'react';
import styles from './cpu-foundry-sim.module.css';

type UpgradeKey = 'architecture' | 'lithography' | 'clockSpeed' | 'coreDesign' | 'cacheStack' | 'powerEfficiency';
type TeamKey = 'researchers' | 'marketing' | 'fabrication';
type PanelKey = 'profile' | 'intel';
type CompanyDetailPanelKey = 'overview' | 'operations' | 'ownership' | 'intel';
type CompanyKey = 'cosmic' | 'rmd' | 'heroscop';

type UpgradeState = {
  label: string;
  unit: string;
  decimals: number;
  value: number;
  step: number;
  baseCost: number;
  costGrowth: number;
  description: string;
};

type TeamState = {
  label: string;
  description: string;
  count: number;
  baseCost: number;
  costGrowth: number;
};

type CompanyState = {
  key: CompanyKey;
  name: string;
  founder: string;
  ceoName: string;
  cash: number;
  research: number;
  marketShare: number;
  reputation: number;
  releaseCount: number;
  bestCpuScore: number;
  revenuePerSecond: number;
  researchPerSecond: number;
  lastRelease: string;
  focus: string;
  upgrades: Record<UpgradeKey, UpgradeState>;
  teams: Record<TeamKey, TeamState>;
  investors: Record<string, number>;
};

type PlayerProfile = {
  id: string;
  name: string;
  background: string;
  cash: number;
  selectedCompany: CompanyKey;
};

type NpcInvestor = {
  id: string;
  name: string;
  persona: string;
  cash: number;
  focusCompany: CompanyKey;
  boldness: number;
  patience: number;
};

type GameState = {
  year: number;
  secondsElapsed: number;
  tickCount: number;
  player: PlayerProfile;
  companies: Record<CompanyKey, CompanyState>;
  npcs: NpcInvestor[];
  activityFeed: string[];
};

type ProfileDraft = {
  name: string;
  background: string;
  selectedCompany: CompanyKey;
};

type ReleaseDraft = {
  series: string;
  cpuName: string;
  priceIndex: number;
};

type InvestmentDraft = {
  company: CompanyKey;
  amount: number;
};

const STORAGE_KEY = 'cpu-foundry-profile-sim-v3';
const TICK_MS = 200;
const YEAR_LENGTH_SECONDS = 90;
const START_YEAR = 2000;
const NPC_ACTION_EVERY_TICKS = 25;
const PLAYER_STARTING_CASH = 480;
const INVESTMENT_OPTIONS = [20, 40, 80, 120, 180] as const;
const PRICE_PRESETS = [
  { label: 'Murah', subtitle: 'Volume tinggi', factor: 0.86, reputationBonus: 0.3, marketBonus: 1.4 },
  { label: 'Seimbang', subtitle: 'Arus utama', factor: 1, reputationBonus: 0.75, marketBonus: 1 },
  { label: 'Mahal', subtitle: 'Flagship premium', factor: 1.28, reputationBonus: 1.3, marketBonus: 0.58 },
] as const;
const DEFAULT_OPEN_PANELS: Record<PanelKey, boolean> = {
  profile: true,
  intel: false,
};
const DEFAULT_COMPANY_DETAIL_PANELS: Record<CompanyDetailPanelKey, boolean> = {
  overview: true,
  operations: true,
  ownership: false,
  intel: false,
};
const DEFAULT_PROFILE_DRAFT: ProfileDraft = {
  name: '',
  background: 'Founder-operator dengan insting produk yang agresif.',
  selectedCompany: 'cosmic',
};
const DEFAULT_RELEASE_DRAFT: ReleaseDraft = {
  series: 'Nova Series',
  cpuName: 'N-01',
  priceIndex: 1,
};

function createUpgrades(seed: { architecture: number; lithography: number; clockSpeed: number; coreDesign: number; cacheStack: number; powerEfficiency: number }) {
  return {
    architecture: {
      label: 'Microarchitecture',
      unit: 'gen',
      decimals: 0,
      value: seed.architecture,
      step: 1,
      baseCost: 70,
      costGrowth: 1.24,
      description: 'Pipeline, branch predictor, dan IPC jadi lebih matang.',
    },
    lithography: {
      label: 'Process Node',
      unit: 'nm',
      decimals: 0,
      value: seed.lithography,
      step: -10,
      baseCost: 60,
      costGrowth: 1.18,
      description: 'Node lebih kecil menekan daya dan memperbesar headroom.',
    },
    clockSpeed: {
      label: 'Clock Speed',
      unit: 'GHz',
      decimals: 1,
      value: seed.clockSpeed,
      step: 0.2,
      baseCost: 50,
      costGrowth: 1.15,
      description: 'Frekuensi lebih tinggi untuk benchmark dan gaming.',
    },
    coreDesign: {
      label: 'Core Count',
      unit: 'core',
      decimals: 0,
      value: seed.coreDesign,
      step: 1,
      baseCost: 76,
      costGrowth: 1.23,
      description: 'Tambah core untuk multitasking dan workstation.',
    },
    cacheStack: {
      label: 'Cache Stack',
      unit: 'KB',
      decimals: 0,
      value: seed.cacheStack,
      step: 256,
      baseCost: 46,
      costGrowth: 1.14,
      description: 'Cache lebih besar membuat latency terasa lebih jinak.',
    },
    powerEfficiency: {
      label: 'Power Efficiency',
      unit: 'W',
      decimals: 0,
      value: seed.powerEfficiency,
      step: -4,
      baseCost: 54,
      costGrowth: 1.18,
      description: 'TDP lebih terkontrol untuk laptop dan desktop tipis.',
    },
  } satisfies Record<UpgradeKey, UpgradeState>;
}

function createTeams(seed: { researchers: number; marketing: number; fabrication: number }) {
  return {
    researchers: {
      label: 'R&D Cells',
      description: 'Menaikkan research point per detik.',
      count: seed.researchers,
      baseCost: 95,
      costGrowth: 1.34,
    },
    marketing: {
      label: 'Market Intel',
      description: 'Mendorong reputasi, brand awareness, dan permintaan.',
      count: seed.marketing,
      baseCost: 110,
      costGrowth: 1.39,
    },
    fabrication: {
      label: 'Fab Lines',
      description: 'Membesarkan volume produksi dan laba release.',
      count: seed.fabrication,
      baseCost: 138,
      costGrowth: 1.41,
    },
  } satisfies Record<TeamKey, TeamState>;
}

function createInitialGameState(profile: ProfileDraft): GameState {
  const playerId = `player-${profile.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'neo'}`;
  const cosmic = createCompany({
    key: 'cosmic',
    name: 'Cosmic',
    founder: 'Lena Voss',
    focus: 'Mainstream desktop dan supply OEM agresif.',
    cash: 560,
    research: 165,
    marketShare: 27,
    reputation: 46,
    investors: {
      founder_cosmic: 300,
      npc_iris: 180,
      npc_marco: 120,
    },
    upgrades: createUpgrades({ architecture: 2, lithography: 180, clockSpeed: 1.5, coreDesign: 1, cacheStack: 512, powerEfficiency: 98 }),
    teams: createTeams({ researchers: 2, marketing: 2, fabrication: 2 }),
    lastRelease: 'Cosmic Sol-1 masih mendominasi OEM murah.',
  });
  const rmd = createCompany({
    key: 'rmd',
    name: 'RMD',
    founder: 'Mika Ren',
    focus: 'Performa enthusiast dengan ritme release lebih cepat.',
    cash: 520,
    research: 190,
    marketShare: 21,
    reputation: 43,
    investors: {
      founder_rmd: 280,
      npc_sora: 165,
      npc_marco: 90,
    },
    upgrades: createUpgrades({ architecture: 2, lithography: 170, clockSpeed: 1.7, coreDesign: 2, cacheStack: 512, powerEfficiency: 102 }),
    teams: createTeams({ researchers: 3, marketing: 1, fabrication: 1 }),
    lastRelease: 'RMD Ember-2 populer di komunitas builder.',
  });
  const heroscop = createCompany({
    key: 'heroscop',
    name: 'Heroscop',
    founder: 'Rafi Helion',
    focus: 'Efisiensi daya dan workstation premium.',
    cash: 500,
    research: 175,
    marketShare: 18,
    reputation: 41,
    investors: {
      founder_heroscop: 290,
      npc_iris: 135,
      npc_sora: 95,
    },
    upgrades: createUpgrades({ architecture: 2, lithography: 160, clockSpeed: 1.4, coreDesign: 2, cacheStack: 768, powerEfficiency: 90 }),
    teams: createTeams({ researchers: 2, marketing: 1, fabrication: 2 }),
    lastRelease: 'Heroscop Halo-2 unggul di pasar workstation kecil.',
  });

  const companies = {
    cosmic: cosmic.company,
    rmd: rmd.company,
    heroscop: heroscop.company,
  } satisfies Record<CompanyKey, CompanyState>;

  return resolveLeadership({
    year: START_YEAR,
    secondsElapsed: 0,
    tickCount: 0,
    player: {
      id: playerId,
      name: profile.name.trim() || 'Player',
      background: profile.background,
      cash: PLAYER_STARTING_CASH,
      selectedCompany: profile.selectedCompany,
    },
    companies,
    npcs: [
      { id: 'npc_iris', name: 'Iris Vale', persona: 'Fund manager super teliti', cash: 250, focusCompany: 'cosmic', boldness: 0.88, patience: 0.55 },
      { id: 'npc_marco', name: 'Marco Zhen', persona: 'Angel investor oportunis', cash: 220, focusCompany: 'rmd', boldness: 0.78, patience: 0.45 },
      { id: 'npc_sora', name: 'Sora Kim', persona: 'Tech whale pemburu efisiensi', cash: 260, focusCompany: 'heroscop', boldness: 0.92, patience: 0.6 },
    ],
    activityFeed: [
      `${START_YEAR}: Profil ${profile.name.trim() || 'Player'} dibuat dengan modal awal $${formatNumber(PLAYER_STARTING_CASH)}M.`,
      `${START_YEAR}: Cosmic, RMD, dan Heroscop masih dipimpin para pendirinya.`,
    ],
  });
}

function createCompany(config: {
  key: CompanyKey;
  name: string;
  founder: string;
  focus: string;
  cash: number;
  research: number;
  marketShare: number;
  reputation: number;
  investors: Record<string, number>;
  upgrades: Record<UpgradeKey, UpgradeState>;
  teams: Record<TeamKey, TeamState>;
  lastRelease: string;
}) {
  const revenuePerSecond = calculateRevenuePerSecond(config.teams, config.upgrades, config.marketShare, config.reputation);
  const researchPerSecond = calculateResearchPerSecond(config.teams, config.upgrades);
  return {
    company: {
      key: config.key,
      name: config.name,
      founder: config.founder,
      ceoName: config.founder,
      cash: config.cash,
      research: config.research,
      marketShare: config.marketShare,
      reputation: config.reputation,
      releaseCount: 1,
      bestCpuScore: calculateCpuScore(config.upgrades),
      revenuePerSecond,
      researchPerSecond,
      lastRelease: config.lastRelease,
      focus: config.focus,
      upgrades: config.upgrades,
      teams: config.teams,
      investors: config.investors,
    } satisfies CompanyState,
  };
}

function formatNumber(value: number, decimals = 0) {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getUpgradeLevel(key: UpgradeKey, upgrade: UpgradeState, baseline: number) {
  if (key === 'lithography' || key === 'powerEfficiency') {
    return Math.max(0, Math.round((baseline - upgrade.value) / Math.abs(upgrade.step)));
  }

  return Math.max(0, Math.round((upgrade.value - baseline) / Math.abs(upgrade.step)));
}

function getUpgradeCost(key: UpgradeKey, upgrade: UpgradeState, company: CompanyState) {
  const baseline = INITIAL_BASELINES[company.key].upgrades[key];
  const level = getUpgradeLevel(key, upgrade, baseline);
  return Math.round(upgrade.baseCost * Math.pow(upgrade.costGrowth, level));
}

function getTeamCost(team: TeamState) {
  return Math.round(team.baseCost * Math.pow(team.costGrowth, team.count));
}

function getDisplayedUpgradeValue(key: UpgradeKey, upgrade: UpgradeState) {
  if (key === 'architecture') return `Gen ${formatNumber(upgrade.value)}`;
  if (key === 'clockSpeed') return `${formatNumber(upgrade.value, 1)} GHz`;
  if (key === 'coreDesign') return `${formatNumber(upgrade.value)} core${upgrade.value > 1 ? 's' : ''}`;
  if (key === 'cacheStack') return upgrade.value >= 1024 ? `${formatNumber(upgrade.value / 1024, 1)} MB` : `${formatNumber(upgrade.value)} KB`;
  if (key === 'lithography') return `${formatNumber(upgrade.value)} nm`;
  return `${formatNumber(upgrade.value)} W`;
}

function calculateCpuScore(upgrades: Record<UpgradeKey, UpgradeState>) {
  const architecture = upgrades.architecture.value;
  const clockSpeed = upgrades.clockSpeed.value;
  const coreCount = upgrades.coreDesign.value;
  const cacheMb = upgrades.cacheStack.value / 1024;
  const nodeEfficiency = 220 / upgrades.lithography.value;
  const powerEfficiency = 110 / upgrades.powerEfficiency.value;

  return architecture * 120 + clockSpeed * 90 + coreCount * 88 + cacheMb * 60 + nodeEfficiency * 82 + powerEfficiency * 75;
}

function calculateResearchPerSecond(teams: Record<TeamKey, TeamState>, upgrades: Record<UpgradeKey, UpgradeState>) {
  return 3.6 + teams.researchers.count * 1.9 + upgrades.architecture.value * 0.55 + (220 - upgrades.lithography.value) * 0.03;
}

function calculateRevenuePerSecond(
  teams: Record<TeamKey, TeamState>,
  upgrades: Record<UpgradeKey, UpgradeState>,
  marketShare: number,
  reputation: number
) {
  return 6.5 + teams.fabrication.count * 2 + teams.marketing.count * 1.5 + calculateCpuScore(upgrades) * 0.014 + marketShare * 0.62 + reputation * 0.18;
}

function calculateLaunchRevenue(
  score: number,
  teams: Record<TeamKey, TeamState>,
  marketShare: number,
  reputation: number,
  priceFactor: number
) {
  return score * 0.82 * (1 + teams.fabrication.count * 0.16) * (1 + teams.marketing.count * 0.13) * (1 + marketShare / 11) * (1 + reputation / 34) * priceFactor;
}

function getOwnershipPercent(company: CompanyState, investorId: string) {
  const total = Object.values(company.investors).reduce((sum, value) => sum + value, 0);
  if (!total) return 0;
  return (company.investors[investorId] ?? 0) / total * 100;
}

function getLeadingInvestorId(company: CompanyState) {
  let leaderId = company.founder;
  let highest = -1;

  Object.entries(company.investors).forEach(([investorId, amount]) => {
    if (amount > highest) {
      highest = amount;
      leaderId = investorId;
    }
  });

  return leaderId;
}

function investorDisplayName(game: GameState, investorId: string) {
  if (investorId === game.player.id) return game.player.name;
  const npc = game.npcs.find((entry) => entry.id === investorId);
  if (npc) return npc.name;

  if (investorId.startsWith('founder_')) {
    const companyKey = investorId.replace('founder_', '') as CompanyKey;
    return game.companies[companyKey]?.founder ?? investorId;
  }

  return investorId;
}

function resolveLeadership(game: GameState) {
  const companies = Object.fromEntries(
    (Object.entries(game.companies) as [CompanyKey, CompanyState][]).map(([key, company]) => {
      const leaderId = getLeadingInvestorId(company);
      return [
        key,
        {
          ...company,
          ceoName: investorDisplayName(game, leaderId),
        },
      ];
    })
  ) as Record<CompanyKey, CompanyState>;

  return {
    ...game,
    companies,
  };
}

const INITIAL_BASELINES = {
  cosmic: {
    upgrades: {
      architecture: 2,
      lithography: 180,
      clockSpeed: 1.5,
      coreDesign: 1,
      cacheStack: 512,
      powerEfficiency: 98,
    },
  },
  rmd: {
    upgrades: {
      architecture: 2,
      lithography: 170,
      clockSpeed: 1.7,
      coreDesign: 2,
      cacheStack: 512,
      powerEfficiency: 102,
    },
  },
  heroscop: {
    upgrades: {
      architecture: 2,
      lithography: 160,
      clockSpeed: 1.4,
      coreDesign: 2,
      cacheStack: 768,
      powerEfficiency: 90,
    },
  },
} satisfies Record<CompanyKey, { upgrades: Record<UpgradeKey, number> }>;

function getSharePrice(company: CompanyState) {
  return Math.max(12, Math.round((company.cash * 0.08 + company.marketShare * 2.6 + company.reputation * 1.8 + company.bestCpuScore * 0.04) * 10) / 10);
}

function getCompanyInvestmentTotal(company: CompanyState) {
  return Object.values(company.investors).reduce((sum, value) => sum + value, 0);
}

function getCompanyValuation(company: CompanyState) {
  return Math.round((company.cash * 1.35 + getCompanyInvestmentTotal(company) * 1.1 + company.marketShare * 20 + company.reputation * 9 + company.bestCpuScore * 0.32) * 10) / 10;
}

function addFeedEntry(feed: string[], message: string) {
  return [message, ...feed].slice(0, 8);
}

function simulateTick(current: GameState) {
  const tickSeconds = TICK_MS / 1000;
  const nextYear = START_YEAR + Math.floor((current.secondsElapsed + tickSeconds) / YEAR_LENGTH_SECONDS);

  const companies = Object.fromEntries(
    (Object.entries(current.companies) as [CompanyKey, CompanyState][]).map(([key, company]) => {
      const researchPerSecond = calculateResearchPerSecond(company.teams, company.upgrades);
      const revenuePerSecond = calculateRevenuePerSecond(company.teams, company.upgrades, company.marketShare, company.reputation);
      const passiveMarketDelta = company.teams.marketing.count * 0.002 + company.teams.fabrication.count * 0.0015;

      return [
        key,
        {
          ...company,
          researchPerSecond,
          revenuePerSecond,
          research: company.research + researchPerSecond * tickSeconds,
          cash: company.cash + revenuePerSecond * tickSeconds,
          marketShare: clamp(company.marketShare + passiveMarketDelta, 3, 70),
          reputation: clamp(company.reputation + company.teams.marketing.count * 0.0009, 10, 100),
        },
      ];
    })
  ) as Record<CompanyKey, CompanyState>;

  let playerCash = current.player.cash;
  (Object.values(companies) as CompanyState[]).forEach((company) => {
    const ownership = getOwnershipPercent(company, current.player.id) / 100;
    const dividend = company.revenuePerSecond * ownership * 0.12 * tickSeconds;
    const ceoBonus = company.ceoName === current.player.name ? 0.24 * tickSeconds : 0;
    playerCash += dividend + ceoBonus;
  });

  let nextState: GameState = resolveLeadership({
    ...current,
    year: nextYear,
    secondsElapsed: current.secondsElapsed + tickSeconds,
    tickCount: current.tickCount + 1,
    player: {
      ...current.player,
      cash: playerCash,
    },
    companies,
  });

  if (nextState.tickCount % NPC_ACTION_EVERY_TICKS === 0) {
    nextState = runNpcTurn(nextState);
  }

  return nextState;
}

function runNpcTurn(current: GameState) {
  let next = { ...current, companies: { ...current.companies }, npcs: current.npcs.map((npc) => ({ ...npc })) };

  next.npcs.forEach((npc) => {
    const company = next.companies[npc.focusCompany];
    const score = calculateCpuScore(company.upgrades);
    const price = getSharePrice(company);
    const urgency = company.ceoName === npc.name ? 1.1 : 1;
    const appetite = (company.marketShare / 26 + company.reputation / 55 + score / 520) * npc.boldness * urgency;
    const shouldInvest = npc.cash > 18 && appetite > 1.35;

    if (!shouldInvest) {
      npc.cash += 6 * npc.patience;
      return;
    }

    const spend = clamp(Math.round(price * npc.boldness * 0.8), 16, Math.min(72, npc.cash));
    npc.cash -= spend;
    company.cash += spend;
    company.investors[npc.id] = (company.investors[npc.id] ?? 0) + spend;
    next.activityFeed = addFeedEntry(next.activityFeed, `${next.year}: ${npc.name} menambah investasi $${formatNumber(spend)}M ke ${company.name}.`);
  });

  return resolveLeadership(next);
}

export function CpuFoundrySim() {
  const [game, setGame] = useState<GameState | null>(null);
  const [profileDraft, setProfileDraft] = useState<ProfileDraft>(DEFAULT_PROFILE_DRAFT);
  const [openPanels, setOpenPanels] = useState<Record<PanelKey, boolean>>(DEFAULT_OPEN_PANELS);
  const [companyDetailPanels, setCompanyDetailPanels] = useState<Record<CompanyDetailPanelKey, boolean>>(DEFAULT_COMPANY_DETAIL_PANELS);
  const [releaseDraft, setReleaseDraft] = useState<ReleaseDraft>(DEFAULT_RELEASE_DRAFT);
  const [investmentDraft, setInvestmentDraft] = useState<InvestmentDraft>({ company: 'cosmic', amount: 40 });
  const [statusMessage, setStatusMessage] = useState('Buat profil dulu untuk masuk ke simulasi hidup investor CPU.');
  const [isReleaseMenuOpen, setIsReleaseMenuOpen] = useState(false);
  const [isInvestmentMenuOpen, setIsInvestmentMenuOpen] = useState(false);
  const [isCompaniesFrameOpen, setIsCompaniesFrameOpen] = useState(false);
  const [focusedCompanyKey, setFocusedCompanyKey] = useState<CompanyKey | null>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as GameState;
      setGame(resolveLeadership(parsed));
      setStatusMessage(`Selamat datang kembali, ${parsed.player.name}.`);
      setReleaseDraft((current) => ({
        ...current,
        series: `${parsed.companies[parsed.player.selectedCompany].name} Prime`,
      }));
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    if (!game) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(game));
  }, [game]);

  useEffect(() => {
    if (!game) return;

    const interval = window.setInterval(() => {
      setGame((current) => (current ? simulateTick(current) : current));
    }, TICK_MS);

    return () => window.clearInterval(interval);
  }, [game]);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const previousHtmlOverflow = html.style.overflow;
    const previousBodyOverflow = body.style.overflow;
    const previousBodyTouchAction = body.style.touchAction;

    const isModalOpen = isReleaseMenuOpen || isInvestmentMenuOpen || isCompaniesFrameOpen || focusedCompanyKey !== null;
    html.style.overflow = isModalOpen ? 'hidden' : 'auto';
    body.style.overflow = isModalOpen ? 'hidden' : 'auto';
    body.style.touchAction = 'pan-y';

    return () => {
      html.style.overflow = previousHtmlOverflow;
      body.style.overflow = previousBodyOverflow;
      body.style.touchAction = previousBodyTouchAction;
    };
  }, [focusedCompanyKey, isCompaniesFrameOpen, isReleaseMenuOpen, isInvestmentMenuOpen]);

  const togglePanel = (panel: PanelKey) => {
    setOpenPanels((current) => ({
      ...current,
      [panel]: !current[panel],
    }));
  };

  const toggleCompanyDetailPanel = (panel: CompanyDetailPanelKey) => {
    setCompanyDetailPanels((current) => ({
      ...current,
      [panel]: !current[panel],
    }));
  };

  const createProfile = () => {
    const trimmedName = profileDraft.name.trim();
    if (!trimmedName) {
      setStatusMessage('Masukkan nama profil dulu.');
      return;
    }

    const nextGame = createInitialGameState({ ...profileDraft, name: trimmedName });
    setGame(nextGame);
    setStatusMessage(`${trimmedName} berhasil login. Kamu mulai sebagai investor independen.`);
    setReleaseDraft({
      series: `${nextGame.companies[nextGame.player.selectedCompany].name} Prime`,
      cpuName: 'PX-01',
      priceIndex: 1,
    });
    setInvestmentDraft({ company: profileDraft.selectedCompany, amount: 40 });
  };

  const resetProfile = () => {
    window.localStorage.removeItem(STORAGE_KEY);
    setGame(null);
    setProfileDraft(DEFAULT_PROFILE_DRAFT);
    setReleaseDraft(DEFAULT_RELEASE_DRAFT);
    setInvestmentDraft({ company: 'cosmic', amount: 40 });
    setStatusMessage('Profil dihapus. Kamu bisa membuat akun baru.');
    setIsInvestmentMenuOpen(false);
    setIsReleaseMenuOpen(false);
    setIsCompaniesFrameOpen(false);
    setFocusedCompanyKey(null);
  };

  const activeCompany = game ? game.companies[game.player.selectedCompany] : null;
  const focusedCompany = game && focusedCompanyKey ? game.companies[focusedCompanyKey] : null;
  const activePricePreset = PRICE_PRESETS[releaseDraft.priceIndex];
  const isPlayerCeo = Boolean(game && activeCompany && activeCompany.ceoName === game.player.name);
  const focusedPlayerIsCeo = Boolean(game && focusedCompany && focusedCompany.ceoName === game.player.name);
  const activeCpuScore = activeCompany ? calculateCpuScore(activeCompany.upgrades) : 0;
  const focusedCpuScore = focusedCompany ? calculateCpuScore(focusedCompany.upgrades) : 0;
  const playerNetWorth = useMemo(() => {
    if (!game) return 0;
    const holdings = (Object.values(game.companies) as CompanyState[]).reduce((sum, company) => {
      const ownedCapital = company.investors[game.player.id] ?? 0;
      return sum + ownedCapital;
    }, 0);
    return game.player.cash + holdings;
  }, [game]);

  const switchCompany = (company: CompanyKey) => {
    if (!game) return;
    setGame({
      ...game,
      player: {
        ...game.player,
        selectedCompany: company,
      },
    });
    setInvestmentDraft((current) => ({ ...current, company }));
    setReleaseDraft((current) => ({
      ...current,
      series: `${game.companies[company].name} Prime`,
    }));
  };

  const openCompaniesFrame = () => {
    setFocusedCompanyKey(null);
    setIsCompaniesFrameOpen(true);
  };

  const openCompanyDetail = (company: CompanyKey) => {
    switchCompany(company);
    setFocusedCompanyKey(company);
    setCompanyDetailPanels(DEFAULT_COMPANY_DETAIL_PANELS);
    setIsCompaniesFrameOpen(false);
  };

  const closeCompanyDetail = () => {
    setFocusedCompanyKey(null);
    setIsCompaniesFrameOpen(true);
  };

  const investInCompany = () => {
    if (!game) return;
    const amount = investmentDraft.amount;
    const company = game.companies[investmentDraft.company];

    if (amount <= 0 || game.player.cash < amount) {
      setStatusMessage('Dana personal tidak cukup untuk membeli saham.');
      return;
    }

    const next = resolveLeadership({
      ...game,
      player: {
        ...game.player,
        cash: game.player.cash - amount,
        selectedCompany: investmentDraft.company,
      },
      companies: {
        ...game.companies,
        [investmentDraft.company]: {
          ...company,
          cash: company.cash + amount,
          investors: {
            ...company.investors,
            [game.player.id]: (company.investors[game.player.id] ?? 0) + amount,
          },
        },
      },
      activityFeed: addFeedEntry(
        game.activityFeed,
        `${game.year}: ${game.player.name} membeli saham ${company.name} senilai $${formatNumber(amount)}M.`
      ),
    });

    const nextCompany = next.companies[investmentDraft.company];
    const playerOwnership = getOwnershipPercent(nextCompany, next.player.id);
    setGame(next);
    setStatusMessage(
      nextCompany.ceoName === next.player.name
        ? `Kamu sekarang CEO ${nextCompany.name} dengan kepemilikan ${formatNumber(playerOwnership, 1)}%.`
        : `Investasi masuk. Kepemilikanmu di ${nextCompany.name} sekarang ${formatNumber(playerOwnership, 1)}%.`
    );
    setIsInvestmentMenuOpen(false);
  };

  const improveUpgrade = (key: UpgradeKey) => {
    if (!game || !activeCompany || !isPlayerCeo) return;
    const upgrade = activeCompany.upgrades[key];
    const cost = getUpgradeCost(key, upgrade, activeCompany);
    if (activeCompany.research < cost) {
      setStatusMessage('Research point perusahaan belum cukup.');
      return;
    }

    const nextValue = key === 'lithography' || key === 'powerEfficiency'
      ? Math.max(key === 'lithography' ? 5 : 28, upgrade.value + upgrade.step)
      : upgrade.value + upgrade.step;

    setGame((current) => {
      if (!current) return current;
      const company = current.companies[current.player.selectedCompany];
      const nextCompany: CompanyState = {
        ...company,
        research: company.research - cost,
        upgrades: {
          ...company.upgrades,
          [key]: {
            ...company.upgrades[key],
            value: nextValue,
          },
        },
      };
      return {
        ...current,
        companies: {
          ...current.companies,
          [company.key]: {
            ...nextCompany,
            bestCpuScore: Math.max(nextCompany.bestCpuScore, calculateCpuScore(nextCompany.upgrades)),
          },
        },
      };
    });
    setStatusMessage(`${activeCompany.name}: ${upgrade.label} berhasil ditingkatkan.`);
  };

  const hireTeam = (key: TeamKey) => {
    if (!game || !activeCompany || !isPlayerCeo) return;
    const cost = getTeamCost(activeCompany.teams[key]);
    if (activeCompany.cash < cost) {
      setStatusMessage('Kas perusahaan belum cukup untuk ekspansi tim.');
      return;
    }

    setGame((current) => {
      if (!current) return current;
      const company = current.companies[current.player.selectedCompany];
      return {
        ...current,
        companies: {
          ...current.companies,
          [company.key]: {
            ...company,
            cash: company.cash - cost,
            teams: {
              ...company.teams,
              [key]: {
                ...company.teams[key],
                count: company.teams[key].count + 1,
              },
            },
          },
        },
      };
    });
    setStatusMessage(`${activeCompany.name}: ${activeCompany.teams[key].label} diperbesar.`);
  };

  const launchCpu = () => {
    if (!game || !activeCompany || !isPlayerCeo) {
      setStatusMessage('Kamu harus menjadi CEO untuk merilis CPU perusahaan ini.');
      return;
    }

    const series = releaseDraft.series.trim();
    const cpuName = releaseDraft.cpuName.trim();
    if (!series || !cpuName) {
      setStatusMessage('Isi nama seri dan nama CPU dulu.');
      return;
    }

    const launchRevenue = calculateLaunchRevenue(
      activeCpuScore,
      activeCompany.teams,
      activeCompany.marketShare,
      activeCompany.reputation,
      activePricePreset.factor
    );
    const reputationGain = Math.max(1.2, activeCpuScore / 260 + activeCompany.teams.marketing.count * 0.7 + activePricePreset.reputationBonus);
    const marketShareGain = Math.min(4.4, activeCpuScore / 520 + activeCompany.teams.fabrication.count * 0.16 + activePricePreset.marketBonus);

    const next = {
      ...game,
      companies: {
        ...game.companies,
        [activeCompany.key]: {
          ...activeCompany,
          cash: activeCompany.cash + launchRevenue,
          reputation: clamp(activeCompany.reputation + reputationGain, 10, 100),
          marketShare: clamp(activeCompany.marketShare + marketShareGain, 3, 72),
          releaseCount: activeCompany.releaseCount + 1,
          bestCpuScore: Math.max(activeCompany.bestCpuScore, activeCpuScore),
          lastRelease: `${series} ${cpuName} rilis ${game.year} (${activePricePreset.label.toLowerCase()}).`,
        },
      },
      activityFeed: addFeedEntry(
        game.activityFeed,
        `${game.year}: ${activeCompany.name} merilis ${series} ${cpuName} dan membukukan $${formatNumber(launchRevenue)}M.`
      ),
    };

    setGame(next);
    setStatusMessage(`${series} ${cpuName} sukses dirilis.`);
    setReleaseDraft({
      ...releaseDraft,
      cpuName: `PX-${String(activeCompany.releaseCount + 1).padStart(2, '0')}`,
    });
    setIsReleaseMenuOpen(false);
  };

  if (!game) {
    return (
      <main className={styles.shell}>
        <section className={styles.loginCard}>
          <p className={styles.eyebrow}>/game · profile login</p>
          <h1>Investor CPU Life</h1>
          <p className={styles.subtitle}>Masuk dulu, buat profil, lalu mulai hidup sebagai investor yang bisa merebut kursi CEO dari pendiri perusahaan CPU di tahun 2000.</p>

          <label className={styles.field}>
            <span>Nama profil</span>
            <input
              value={profileDraft.name}
              onChange={(event) => setProfileDraft((current) => ({ ...current, name: event.target.value }))}
              placeholder="Contoh: Arka Vega"
            />
          </label>

          <label className={styles.field}>
            <span>Latar belakang</span>
            <input
              value={profileDraft.background}
              onChange={(event) => setProfileDraft((current) => ({ ...current, background: event.target.value }))}
              placeholder="Investor dengan visi teknologi"
            />
          </label>

          <div className={styles.quickGrid}>
            {(['cosmic', 'rmd', 'heroscop'] as CompanyKey[]).map((company) => (
              <button
                key={company}
                type="button"
                className={profileDraft.selectedCompany === company ? styles.quickButtonActive : styles.quickButton}
                onClick={() => setProfileDraft((current) => ({ ...current, selectedCompany: company }))}
              >
                {company.toUpperCase()}
              </button>
            ))}
          </div>

          <div className={styles.loginPreview}>
            <div>
              <span>Modal awal</span>
              <strong>$ {formatNumber(PLAYER_STARTING_CASH)}M</strong>
            </div>
            <div>
              <span>Target awal</span>
              <strong>{profileDraft.selectedCompany.toUpperCase()}</strong>
            </div>
          </div>

          <button type="button" className={styles.primaryButton} onClick={createProfile}>
            Login & buat akun
          </button>

          <div className={styles.memoCard}>
            <p className={styles.panelTag}>Status</p>
            <p>{statusMessage}</p>
          </div>
        </section>
      </main>
    );
  }

  const companyCards = (Object.values(game.companies) as CompanyState[]).map((company) => {
    const playerOwnership = getOwnershipPercent(company, game.player.id);
    const leaderId = getLeadingInvestorId(company);
    const leadingOwner = investorDisplayName(game, leaderId);
    const sharePrice = getSharePrice(company);
    const companyValue = getCompanyValuation(company);
    return {
      company,
      playerOwnership,
      leadingOwner,
      sharePrice,
      companyValue,
    };
  });

  return (
    <>
      <main className={styles.shell}>
        <section className={styles.heroCard}>
          <div className={styles.heroHeader}>
            <div>
              <p className={styles.eyebrow}>/game · semi life investor sim</p>
              <h1>{game.player.name}</h1>
              <p className={styles.subtitle}>{game.player.background}</p>
            </div>
            <div className={styles.yearBadge}>{game.year}</div>
          </div>

          <div className={styles.topStrip}>
            <div>
              <span>Cash pribadi</span>
              <strong>$ {formatNumber(game.player.cash, 1)}M</strong>
            </div>
            <div>
              <span>Net worth</span>
              <strong>$ {formatNumber(playerNetWorth, 1)}M</strong>
            </div>
            <button type="button" className={styles.releaseTrigger} onClick={openCompaniesFrame}>
              Companies
            </button>
          </div>

          <div className={styles.statGrid}>
            <article className={styles.statChip}>
              <span>Fokus aktif</span>
              <strong>{activeCompany?.name}</strong>
            </article>
            <article className={styles.statChip}>
              <span>Role</span>
              <strong>{isPlayerCeo ? `CEO ${activeCompany?.name}` : 'Investor'}</strong>
            </article>
            <article className={styles.statChip}>
              <span>Kepemilikan</span>
              <strong>{activeCompany ? `${formatNumber(getOwnershipPercent(activeCompany, game.player.id), 1)}%` : '0%'}</strong>
            </article>
            <article className={styles.statChip}>
              <span>Status</span>
              <strong>{statusMessage}</strong>
            </article>
          </div>
        </section>

        <section className={styles.panelStack}>
          <section className={styles.panel}>
            <button type="button" className={styles.panelToggle} onClick={() => togglePanel('profile')}>
              <div>
                <p className={styles.panelTag}>Profile</p>
                <h2>Akun ringkas & aksi cepat</h2>
              </div>
              <span>{openPanels.profile ? 'Tutup' : 'Buka'}</span>
            </button>
            {openPanels.profile ? (
              <div className={styles.panelBody}>
                <div className={styles.infoRow}>
                  <div>
                    <span>Status</span>
                    <strong>{isPlayerCeo ? 'Mengendalikan perusahaan' : 'Sedang akumulasi saham'}</strong>
                  </div>
                  <div>
                    <span>Perusahaan fokus</span>
                    <strong>{activeCompany?.name}</strong>
                  </div>
                  <div>
                    <span>Dividen/s</span>
                    <strong>$ {formatNumber((activeCompany?.revenuePerSecond ?? 0) * (getOwnershipPercent(activeCompany!, game.player.id) / 100) * 0.12, 2)}M</strong>
                  </div>
                  <div>
                    <span>Nilai perusahaan fokus</span>
                    <strong>$ {formatNumber(activeCompany ? getCompanyValuation(activeCompany) : 0, 1)}M</strong>
                  </div>
                </div>
                <div className={styles.memoCard}>
                  <p className={styles.panelTag}>Memo singkat</p>
                  <p>{activeCompany?.lastRelease}</p>
                </div>
                <div className={styles.actionRow}>
                  <button type="button" className={styles.primaryButton} onClick={openCompaniesFrame}>
                    Companies
                  </button>
                  <button type="button" className={styles.secondaryButton} onClick={() => setIsInvestmentMenuOpen(true)}>
                    Beli saham
                  </button>
                  <button type="button" className={styles.ghostButton} onClick={() => activeCompany && openCompanyDetail(activeCompany.key)}>
                    Buka detail fokus
                  </button>
                  <button type="button" className={styles.ghostButton} onClick={resetProfile}>
                    Reset profil
                  </button>
                </div>
              </div>
            ) : null}
          </section>

          <section className={styles.panel}>
            <button type="button" className={styles.panelToggle} onClick={() => togglePanel('intel')}>
              <div>
                <p className={styles.panelTag}>NPC intel</p>
                <h2>Feed ringkas & tekanan investor</h2>
              </div>
              <span>{openPanels.intel ? 'Tutup' : 'Buka'}</span>
            </button>
            {openPanels.intel ? (
              <div className={styles.panelList}>
                <div className={styles.npcList}>
                  {game.npcs.map((npc) => (
                    <article key={npc.id} className={styles.itemCard}>
                      <div className={styles.itemTop}>
                        <div>
                          <p className={styles.itemLabel}>{npc.persona}</p>
                          <h3>{npc.name}</h3>
                        </div>
                        <span className={styles.costPill}>$ {formatNumber(npc.cash, 1)}M</span>
                      </div>
                      <p className={styles.itemDescription}>Fokus saat ini: {game.companies[npc.focusCompany].name}. Mereka akan terus menambah saham agar kursi CEO tidak mudah direbut.</p>
                    </article>
                  ))}
                </div>

                <div className={styles.feedList}>
                  {game.activityFeed.map((entry) => (
                    <div key={entry} className={styles.feedItem}>
                      {entry}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </section>
        </section>
      </main>

      {isCompaniesFrameOpen ? (
        <div className={styles.screenFrameOverlay} role="presentation" onClick={() => setIsCompaniesFrameOpen(false)}>
          <section className={styles.screenFrameCard} role="dialog" aria-modal="true" aria-label="Daftar perusahaan" onClick={(event) => event.stopPropagation()}>
            <div className={styles.screenFrameHeader}>
              <div>
                <p className={styles.panelTag}>Companies</p>
                <h2>Pantau 3 perusahaan CPU</h2>
              </div>
              <button type="button" className={styles.closeButton} onClick={() => setIsCompaniesFrameOpen(false)} aria-label="Tutup daftar perusahaan">
                ✕
              </button>
            </div>

            <div className={styles.screenFrameBody}>
              <div className={styles.memoCard}>
                <p className={styles.panelTag}>Instruksi</p>
                <p>Tap salah satu card perusahaan untuk membuka frame penuh yang menampilkan semua data penting, nilai perusahaan, kepemilikan, upgrade, tim, dan akses aksi.</p>
              </div>

              <div className={styles.companyList}>
                {companyCards.map(({ company, playerOwnership, leadingOwner, sharePrice, companyValue }) => (
                  <button key={company.key} type="button" className={styles.companyCardButton} onClick={() => openCompanyDetail(company.key)}>
                    <article className={styles.companyCard}>
                      <div className={styles.itemTop}>
                        <div>
                          <p className={styles.itemLabel}>{company.focus}</p>
                          <h3>{company.name}</h3>
                        </div>
                        <span className={styles.costPill}>$ {formatNumber(sharePrice, 1)} / share</span>
                      </div>
                      <div className={styles.infoRowCompact}>
                        <div>
                          <span>CEO</span>
                          <strong>{company.ceoName}</strong>
                        </div>
                        <div>
                          <span>Value</span>
                          <strong>$ {formatNumber(companyValue, 1)}M</strong>
                        </div>
                        <div>
                          <span>Kepemilikanmu</span>
                          <strong>{formatNumber(playerOwnership, 1)}%</strong>
                        </div>
                        <div>
                          <span>Owner terbesar</span>
                          <strong>{leadingOwner}</strong>
                        </div>
                      </div>
                    </article>
                  </button>
                ))}
              </div>

              <button type="button" className={styles.ghostButton} onClick={() => setIsCompaniesFrameOpen(false)}>
                Go back
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {focusedCompany && game ? (
        <div className={styles.screenFrameOverlay} role="presentation" onClick={closeCompanyDetail}>
          <section className={styles.screenFrameCard} role="dialog" aria-modal="true" aria-label={`Detail perusahaan ${focusedCompany.name}`} onClick={(event) => event.stopPropagation()}>
            <div className={styles.screenFrameHeader}>
              <div>
                <p className={styles.panelTag}>Company detail</p>
                <h2>{focusedCompany.name} full frame</h2>
              </div>
              <button type="button" className={styles.closeButton} onClick={closeCompanyDetail} aria-label="Kembali ke daftar perusahaan">
                ←
              </button>
            </div>

            <div className={styles.screenFrameBody}>
              <div className={styles.heroMiniCard}>
                <div className={styles.infoRow}>
                  <div>
                    <span>Founder</span>
                    <strong>{focusedCompany.founder}</strong>
                  </div>
                  <div>
                    <span>CEO</span>
                    <strong>{focusedCompany.ceoName}</strong>
                  </div>
                  <div>
                    <span>Value</span>
                    <strong>$ {formatNumber(getCompanyValuation(focusedCompany), 1)}M</strong>
                  </div>
                  <div>
                    <span>CPU score</span>
                    <strong>{formatNumber(focusedCpuScore, 0)}</strong>
                  </div>
                </div>
                <div className={styles.actionRow}>
                  <button type="button" className={styles.ghostButton} onClick={closeCompanyDetail}>
                    Go back
                  </button>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() => {
                      switchCompany(focusedCompany.key);
                      setInvestmentDraft((current) => ({ ...current, company: focusedCompany.key }));
                      setIsInvestmentMenuOpen(true);
                    }}
                  >
                    Beli saham
                  </button>
                  <button
                    type="button"
                    className={styles.primaryButton}
                    onClick={() => {
                      switchCompany(focusedCompany.key);
                      setIsReleaseMenuOpen(true);
                    }}
                    disabled={!focusedPlayerIsCeo}
                  >
                    {focusedPlayerIsCeo ? 'Release CPU' : 'Harus jadi CEO'}
                  </button>
                  <button type="button" className={styles.ghostButton} onClick={() => switchCompany(focusedCompany.key)}>
                    Jadikan fokus aktif
                  </button>
                </div>
              </div>

              <section className={styles.panel}>
                <button type="button" className={styles.panelToggle} onClick={() => toggleCompanyDetailPanel('overview')}>
                  <div>
                    <p className={styles.panelTag}>Overview</p>
                    <h2>Kondisi perusahaan</h2>
                  </div>
                  <span>{companyDetailPanels.overview ? 'Tutup' : 'Buka'}</span>
                </button>
                {companyDetailPanels.overview ? (
                  <div className={styles.panelBody}>
                    <div className={styles.infoRow}>
                      <div>
                        <span>Kas</span>
                        <strong>$ {formatNumber(focusedCompany.cash, 1)}M</strong>
                      </div>
                      <div>
                        <span>Research</span>
                        <strong>{formatNumber(focusedCompany.research, 1)} RP</strong>
                      </div>
                      <div>
                        <span>Market share</span>
                        <strong>{formatNumber(focusedCompany.marketShare, 1)}%</strong>
                      </div>
                      <div>
                        <span>Reputasi</span>
                        <strong>{formatNumber(focusedCompany.reputation, 1)}</strong>
                      </div>
                      <div>
                        <span>RP/s</span>
                        <strong>{formatNumber(focusedCompany.researchPerSecond, 1)}</strong>
                      </div>
                      <div>
                        <span>Cash/s</span>
                        <strong>$ {formatNumber(focusedCompany.revenuePerSecond, 1)}M</strong>
                      </div>
                    </div>
                    <div className={styles.memoCard}>
                      <p className={styles.panelTag}>Memo terbaru</p>
                      <p>{focusedCompany.lastRelease}</p>
                    </div>
                  </div>
                ) : null}
              </section>

              <section className={styles.panel}>
                <button type="button" className={styles.panelToggle} onClick={() => toggleCompanyDetailPanel('ownership')}>
                  <div>
                    <p className={styles.panelTag}>Ownership</p>
                    <h2>Investor & kendali CEO</h2>
                  </div>
                  <span>{companyDetailPanels.ownership ? 'Tutup' : 'Buka'}</span>
                </button>
                {companyDetailPanels.ownership ? (
                  <div className={styles.panelList}>
                    {Object.entries(focusedCompany.investors)
                      .sort(([, left], [, right]) => right - left)
                      .map(([investorId, amount]) => (
                        <article key={investorId} className={styles.itemCard}>
                          <div className={styles.itemTop}>
                            <div>
                              <p className={styles.itemLabel}>Investor</p>
                              <h3>{investorDisplayName(game, investorId)}</h3>
                            </div>
                            <span className={styles.costPill}>{formatNumber(getOwnershipPercent(focusedCompany, investorId), 1)}%</span>
                          </div>
                          <p className={styles.itemDescription}>Modal tertanam: $ {formatNumber(amount, 1)}M. Investor terbesar otomatis memegang kursi CEO.</p>
                        </article>
                      ))}
                  </div>
                ) : null}
              </section>

              <section className={styles.panel}>
                <button type="button" className={styles.panelToggle} onClick={() => toggleCompanyDetailPanel('operations')}>
                  <div>
                    <p className={styles.panelTag}>Operations</p>
                    <h2>Upgrade CPU & tim</h2>
                  </div>
                  <span>{companyDetailPanels.operations ? 'Tutup' : 'Buka'}</span>
                </button>
                {companyDetailPanels.operations ? (
                  <div className={styles.panelList}>
                    {(Object.entries(focusedCompany.upgrades) as [UpgradeKey, UpgradeState][]).map(([key, upgrade]) => {
                      const cost = getUpgradeCost(key, upgrade, focusedCompany);
                      return (
                        <article key={key} className={styles.itemCard}>
                          <div className={styles.itemTop}>
                            <div>
                              <p className={styles.itemLabel}>{upgrade.label}</p>
                              <h3>{getDisplayedUpgradeValue(key, upgrade)}</h3>
                            </div>
                            <span className={styles.costPill}>{formatNumber(cost)} RP</span>
                          </div>
                          <p className={styles.itemDescription}>{upgrade.description}</p>
                          <button
                            type="button"
                            className={styles.secondaryButton}
                            onClick={() => {
                              switchCompany(focusedCompany.key);
                              improveUpgrade(key);
                            }}
                            disabled={!focusedPlayerIsCeo || focusedCompany.research < cost}
                          >
                            {!focusedPlayerIsCeo ? 'CEO only' : focusedCompany.research >= cost ? 'Upgrade' : 'RP kurang'}
                          </button>
                        </article>
                      );
                    })}

                    {(Object.entries(focusedCompany.teams) as [TeamKey, TeamState][]).map(([key, team]) => {
                      const cost = getTeamCost(team);
                      return (
                        <article key={key} className={styles.itemCard}>
                          <div className={styles.itemTop}>
                            <div>
                              <p className={styles.itemLabel}>{team.label}</p>
                              <h3>{formatNumber(team.count)} aktif</h3>
                            </div>
                            <span className={styles.costPill}>$ {formatNumber(cost)}M</span>
                          </div>
                          <p className={styles.itemDescription}>{team.description}</p>
                          <button
                            type="button"
                            className={styles.secondaryButton}
                            onClick={() => {
                              switchCompany(focusedCompany.key);
                              hireTeam(key);
                            }}
                            disabled={!focusedPlayerIsCeo || focusedCompany.cash < cost}
                          >
                            {!focusedPlayerIsCeo ? 'CEO only' : focusedCompany.cash >= cost ? 'Expand' : 'Dana kurang'}
                          </button>
                        </article>
                      );
                    })}
                  </div>
                ) : null}
              </section>

              <section className={styles.panel}>
                <button type="button" className={styles.panelToggle} onClick={() => toggleCompanyDetailPanel('intel')}>
                  <div>
                    <p className={styles.panelTag}>Intel</p>
                    <h2>Release & tekanan pasar</h2>
                  </div>
                  <span>{companyDetailPanels.intel ? 'Tutup' : 'Buka'}</span>
                </button>
                {companyDetailPanels.intel ? (
                  <div className={styles.panelBody}>
                    <div className={styles.infoRow}>
                      <div>
                        <span>Release count</span>
                        <strong>{formatNumber(focusedCompany.releaseCount)}</strong>
                      </div>
                      <div>
                        <span>Best score</span>
                        <strong>{formatNumber(focusedCompany.bestCpuScore, 0)}</strong>
                      </div>
                      <div>
                        <span>Total investasi</span>
                        <strong>$ {formatNumber(getCompanyInvestmentTotal(focusedCompany), 1)}M</strong>
                      </div>
                      <div>
                        <span>Harga saham</span>
                        <strong>$ {formatNumber(getSharePrice(focusedCompany), 1)}</strong>
                      </div>
                    </div>
                  </div>
                ) : null}
              </section>
            </div>
          </section>
        </div>
      ) : null}
      {isInvestmentMenuOpen && game ? (
        <div className={styles.modalOverlay} role="presentation" onClick={() => setIsInvestmentMenuOpen(false)}>
          <section className={styles.modalCard} role="dialog" aria-modal="true" aria-label="Investasi saham" onClick={(event) => event.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <p className={styles.panelTag}>Beli saham</p>
                <h2>Ambil kursi CEO lewat kepemilikan</h2>
              </div>
              <button type="button" className={styles.closeButton} onClick={() => setIsInvestmentMenuOpen(false)} aria-label="Tutup menu investasi">
                ✕
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.quickGrid}>
                {(['cosmic', 'rmd', 'heroscop'] as CompanyKey[]).map((company) => (
                  <button
                    key={company}
                    type="button"
                    className={investmentDraft.company === company ? styles.quickButtonActive : styles.quickButton}
                    onClick={() => setInvestmentDraft((current) => ({ ...current, company }))}
                  >
                    {game.companies[company].name}
                  </button>
                ))}
              </div>

              <div className={styles.sliderCard}>
                <div className={styles.sliderHeader}>
                  <div>
                    <p className={styles.panelTag}>Nilai investasi</p>
                    <strong>$ {formatNumber(investmentDraft.amount)}M</strong>
                  </div>
                  <small>Cash tersedia: $ {formatNumber(game.player.cash, 1)}M</small>
                </div>
                <input
                  className={styles.slider}
                  type="range"
                  min={0}
                  max={INVESTMENT_OPTIONS.length - 1}
                  step={1}
                  value={Math.max(0, INVESTMENT_OPTIONS.indexOf(investmentDraft.amount as (typeof INVESTMENT_OPTIONS)[number]))}
                  onChange={(event) => setInvestmentDraft((current) => ({ ...current, amount: INVESTMENT_OPTIONS[Number(event.target.value)] }))}
                  aria-label="Slider nilai investasi"
                />
                <div className={styles.sliderLabels}>
                  {INVESTMENT_OPTIONS.map((value) => (
                    <span key={value}>{value}</span>
                  ))}
                </div>
              </div>

              <div className={styles.releasePreview}>
                <div>
                  <span>Perusahaan</span>
                  <strong>{game.companies[investmentDraft.company].name}</strong>
                </div>
                <div>
                  <span>Estimasi ownership</span>
                  <strong>
                    {formatNumber(
                      getOwnershipPercent(game.companies[investmentDraft.company], game.player.id) +
                        investmentDraft.amount /
                          Object.values(game.companies[investmentDraft.company].investors).reduce((sum, value) => sum + value, 0) *
                          100,
                      1
                    )}
                    %
                  </strong>
                </div>
              </div>

              <button type="button" className={styles.primaryButton} onClick={investInCompany}>
                Invest sekarang
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {isReleaseMenuOpen && activeCompany ? (
        <div className={styles.modalOverlay} role="presentation" onClick={() => setIsReleaseMenuOpen(false)}>
          <section className={styles.modalCard} role="dialog" aria-modal="true" aria-label="Release CPU" onClick={(event) => event.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <p className={styles.panelTag}>Release CPU</p>
                <h2>{activeCompany.name} launch studio</h2>
              </div>
              <button type="button" className={styles.closeButton} onClick={() => setIsReleaseMenuOpen(false)} aria-label="Tutup menu release CPU">
                ✕
              </button>
            </div>

            <div className={styles.modalBody}>
              <label className={styles.field}>
                <span>Seri</span>
                <input value={releaseDraft.series} onChange={(event) => setReleaseDraft((current) => ({ ...current, series: event.target.value }))} placeholder="Contoh: Cosmic Prime" />
              </label>
              <label className={styles.field}>
                <span>Nama CPU</span>
                <input value={releaseDraft.cpuName} onChange={(event) => setReleaseDraft((current) => ({ ...current, cpuName: event.target.value }))} placeholder="Contoh: PX-02" />
              </label>

              <div className={styles.sliderCard}>
                <div className={styles.sliderHeader}>
                  <div>
                    <p className={styles.panelTag}>Kategori harga</p>
                    <strong>{activePricePreset.label}</strong>
                  </div>
                  <small>{activePricePreset.subtitle}</small>
                </div>
                <input
                  className={styles.slider}
                  type="range"
                  min="0"
                  max={PRICE_PRESETS.length - 1}
                  step="1"
                  value={releaseDraft.priceIndex}
                  onChange={(event) => setReleaseDraft((current) => ({ ...current, priceIndex: Number(event.target.value) }))}
                  aria-label="Slider kategori harga CPU"
                />
                <div className={styles.sliderLabels}>
                  <span>Murah</span>
                  <span>Seimbang</span>
                  <span>Mahal</span>
                </div>
              </div>

              <div className={styles.releasePreview}>
                <div>
                  <span>Nama release</span>
                  <strong>{releaseDraft.series.trim() || 'Seri'} {releaseDraft.cpuName.trim() || 'Nama CPU'}</strong>
                </div>
                <div>
                  <span>Estimasi laba</span>
                  <strong>$ {formatNumber(calculateLaunchRevenue(activeCpuScore, activeCompany.teams, activeCompany.marketShare, activeCompany.reputation, activePricePreset.factor), 0)}M</strong>
                </div>
              </div>

              <button type="button" className={styles.primaryButton} onClick={launchCpu}>
                Release CPU sekarang
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
