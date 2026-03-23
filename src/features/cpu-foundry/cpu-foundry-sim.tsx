'use client';

import { useEffect, useMemo, useState } from 'react';
import styles from './cpu-foundry-sim.module.css';

type UpgradeKey = 'architecture' | 'lithography' | 'clockSpeed' | 'coreDesign' | 'cacheStack' | 'powerEfficiency';
type TeamKey = 'researchers' | 'marketing' | 'fabrication';
type PanelKey = 'profile' | 'intel';
type CompanyDetailPanelKey = 'overview' | 'operations' | 'ownership' | 'governance' | 'intel';
type CompanyKey = 'cosmic' | 'rmd' | 'heroscop';
type InvestorActionMode = 'buy' | 'sell';
type StrategyStyle = 'value' | 'growth' | 'dividend' | 'activist' | 'balanced';

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

type BoardMember = {
  id: string;
  name: string;
  seatType: 'chair' | 'shareholder' | 'founder' | 'independent' | 'employee';
  voteWeight: number;
  agenda: string;
};

type CompanyState = {
  key: CompanyKey;
  name: string;
  founder: string;
  founderInvestorId: string;
  ceoId: string;
  ceoName: string;
  cash: number;
  research: number;
  marketShare: number;
  reputation: number;
  releaseCount: number;
  bestCpuScore: number;
  revenuePerDay: number;
  researchPerDay: number;
  lastRelease: string;
  focus: string;
  upgrades: Record<UpgradeKey, UpgradeState>;
  teams: Record<TeamKey, TeamState>;
  investors: Record<string, number>;
  sharesOutstanding: number;
  marketPoolShares: number;
  dividendPerShare: number;
  payoutRatio: number;
  ceoSalaryPerDay: number;
  boardMood: number;
  boardMembers: BoardMember[];
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
  strategy: StrategyStyle;
  cash: number;
  focusCompany: CompanyKey;
  boldness: number;
  patience: number;
  horizonDays: number;
  reserveRatio: number;
  analysisNote: string;
  active: boolean;
};

type GameState = {
  elapsedDays: number;
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
  mode: InvestorActionMode;
  sliderPercent: number;
};

type SliderStop = {
  label: string;
  value: number;
};

type TradePreview = {
  valuation: number;
  sharePrice: number;
  marketCap: number;
  currentShares: number;
  requestedValue: number;
  maxTradeValue: number;
  grossTradeValue: number;
  feeValue: number;
  netCashDelta: number;
  sharesMoved: number;
  futureShares: number;
  futureOwnership: number;
  marketLiquidityShares: number;
  marketLiquidityValue: number;
  currentHoldingValue: number;
  futureHoldingValue: number;
};

const STORAGE_KEY = 'cpu-foundry-profile-sim-v4';
const TICK_MS = 200;
const START_DATE_UTC = Date.UTC(2000, 0, 1);
const NPC_ACTION_EVERY_TICKS = 10;
const PLAYER_STARTING_CASH = 480;
const INITIAL_NPC_COUNT = 20;
const MAX_ACTIVE_NPCS = 35;
const NPC_GROWTH_START_DAY = 180;
const NPC_GROWTH_INTERVAL_DAYS = 60;
const NPC_GROWTH_BATCH = 3;
const TOTAL_SHARES = 1000;
const TRADING_FEE_RATE = 0.02;
const MIN_TRADE_AMOUNT = 0.5;
const COMPANY_KEYS: CompanyKey[] = ['cosmic', 'rmd', 'heroscop'];
const TRANSACTION_SLIDER_STOPS: SliderStop[] = [
  { label: '0%', value: 0 },
  { label: '25%', value: 25 },
  { label: '50%', value: 50 },
  { label: '75%', value: 75 },
  { label: '100%', value: 100 },
];
const PRICE_PRESETS = [
  { label: 'Murah', subtitle: 'Volume tinggi', factor: 0.86, reputationBonus: 0.4, marketBonus: 1.6 },
  { label: 'Seimbang', subtitle: 'Arus utama', factor: 1, reputationBonus: 0.8, marketBonus: 1 },
  { label: 'Mahal', subtitle: 'Flagship premium', factor: 1.28, reputationBonus: 1.25, marketBonus: 0.55 },
] as const;
const DEFAULT_OPEN_PANELS: Record<PanelKey, boolean> = {
  profile: true,
  intel: false,
};
const DEFAULT_COMPANY_DETAIL_PANELS: Record<CompanyDetailPanelKey, boolean> = {
  overview: true,
  operations: true,
  ownership: false,
  governance: true,
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
const STRATEGY_LABELS: Record<StrategyStyle, string> = {
  value: 'Value',
  growth: 'Growth',
  dividend: 'Dividend',
  activist: 'Activist',
  balanced: 'Balanced',
};
const NPC_FIRST_NAMES = ['Iris', 'Marco', 'Sora', 'Nadia', 'Riven', 'Kael', 'Tala', 'Vera', 'Noel', 'Zane', 'Arin', 'Luca', 'Mira', 'Dian', 'Kara', 'Raka', 'Sven', 'Elin', 'Timo', 'Rhea'];
const NPC_LAST_NAMES = ['Vale', 'Zhen', 'Kim', 'Torres', 'Hale', 'Morrow', 'Ishida', 'Quill', 'Sato', 'Reyes', 'Prasetyo', 'Wijaya', 'Sullivan', 'Frost', 'Tanaka'];
const NPC_PERSONAS = [
  'fund manager adaptif',
  'angel investor oportunis',
  'tech whale pemburu efisiensi',
  'operator pasar yang disiplin',
  'pengumpul saham berbasis data',
  'analis growth berani',
  'direktur family office',
  'portfolio architect jangka panjang',
] as const;

function createSeededRandom(seed: string) {
  let state = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    state ^= seed.charCodeAt(index);
    state = Math.imul(state, 16777619);
  }

  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function randomBetween(random: () => number, min: number, max: number) {
  return min + random() * (max - min);
}

function randomInt(random: () => number, min: number, max: number) {
  return Math.floor(randomBetween(random, min, max + 1));
}

function randomFrom<T>(random: () => number, items: readonly T[]) {
  return items[Math.floor(random() * items.length)] as T;
}

function formatNumber(value: number, decimals = 0) {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

function formatDateFromDays(daysElapsed: number) {
  const date = new Date(START_DATE_UTC + Math.floor(daysElapsed) * 24 * 60 * 60 * 1000);
  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const year = String(date.getUTCFullYear()).slice(-2);
  return `${day}/${month}/${year}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

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
      description: 'Menaikkan research point per hari.',
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

function calculateResearchPerDay(teams: Record<TeamKey, TeamState>, upgrades: Record<UpgradeKey, UpgradeState>) {
  return 4.2 + teams.researchers.count * 2.2 + upgrades.architecture.value * 0.8 + (220 - upgrades.lithography.value) * 0.04;
}

function calculateRevenuePerDay(
  teams: Record<TeamKey, TeamState>,
  upgrades: Record<UpgradeKey, UpgradeState>,
  marketShare: number,
  reputation: number,
  boardMood: number
) {
  return 9 + teams.fabrication.count * 3 + teams.marketing.count * 1.9 + calculateCpuScore(upgrades) * 0.018 + marketShare * 0.9 + reputation * 0.22 + boardMood * 1.6;
}

function calculateLaunchRevenue(
  score: number,
  teams: Record<TeamKey, TeamState>,
  marketShare: number,
  reputation: number,
  priceFactor: number
) {
  return score * 0.92 * (1 + teams.fabrication.count * 0.18) * (1 + teams.marketing.count * 0.14) * (1 + marketShare / 10) * (1 + reputation / 32) * priceFactor;
}

function getCompanyInvestmentTotal(company: CompanyState) {
  return Object.values(company.investors).reduce((sum, shares) => sum + shares * getSharePrice(company), 0);
}

function getSharePrice(company: CompanyState) {
  const valuation = getCompanyValuation(company);
  return Math.max(5, valuation / company.sharesOutstanding);
}

function getCompanyValuation(company: CompanyState) {
  const cpuScore = calculateCpuScore(company.upgrades);
  return Math.round((company.cash * 1.15 + company.revenuePerDay * 18 + company.marketShare * 26 + company.reputation * 12 + cpuScore * 0.55 + company.research * 0.35 + company.boardMood * 22) * 10) / 10;
}

function getOwnershipPercent(company: CompanyState, investorId: string) {
  const shares = company.investors[investorId] ?? 0;
  if (!company.sharesOutstanding) return 0;
  return shares / company.sharesOutstanding * 100;
}

function getInvestorCash(game: GameState, investorId: string) {
  if (investorId === game.player.id) return game.player.cash;
  return game.npcs.find((npc) => npc.id === investorId)?.cash ?? 0;
}

function getMaxTradeValue(company: CompanyState, investorCash: number, currentShares: number, mode: InvestorActionMode) {
  return mode === 'buy'
    ? Math.max(0, Math.min(company.marketPoolShares * getSharePrice(company), investorCash / (1 + TRADING_FEE_RATE)))
    : Math.max(0, currentShares * getSharePrice(company));
}

function getRequestedTradeValue(maxTradeValue: number, sliderPercent: number) {
  return maxTradeValue * clamp(sliderPercent, 0, 100) / 100;
}

function getTradePreview(
  company: CompanyState,
  investorCash: number,
  currentShares: number,
  mode: InvestorActionMode,
  requestedValue: number
): TradePreview {
  const valuation = getCompanyValuation(company);
  const sharePrice = getSharePrice(company);
  const marketCap = sharePrice * company.sharesOutstanding;
  const normalizedRequestedValue = Math.max(0, requestedValue);
  const maxTradeValue = getMaxTradeValue(company, investorCash, currentShares, mode);
  const grossTradeValue = Math.min(normalizedRequestedValue, maxTradeValue);
  const sharesMoved = sharePrice > 0 ? grossTradeValue / sharePrice : 0;
  const feeValue = grossTradeValue * TRADING_FEE_RATE;
  const netCashDelta = mode === 'buy' ? -(grossTradeValue + feeValue) : grossTradeValue - feeValue;
  const futureShares = mode === 'buy' ? currentShares + sharesMoved : Math.max(0, currentShares - sharesMoved);
  const futureOwnership = company.sharesOutstanding > 0 ? futureShares / company.sharesOutstanding * 100 : 0;
  const currentHoldingValue = currentShares * sharePrice;
  const futureHoldingValue = futureShares * sharePrice;

  return {
    valuation,
    sharePrice,
    marketCap,
    currentShares,
    requestedValue: normalizedRequestedValue,
    maxTradeValue,
    grossTradeValue,
    feeValue,
    netCashDelta,
    sharesMoved,
    futureShares,
    futureOwnership,
    marketLiquidityShares: company.marketPoolShares,
    marketLiquidityValue: company.marketPoolShares * sharePrice,
    currentHoldingValue,
    futureHoldingValue,
  };
}

function addFeedEntry(feed: string[], message: string) {
  return [message, ...feed].slice(0, 12);
}

function investorDisplayName(game: GameState, investorId: string) {
  if (investorId === game.player.id) return game.player.name;
  const npc = game.npcs.find((entry) => entry.id === investorId);
  if (npc) return npc.name;
  if (investorId.startsWith('founder_')) {
    const companyKey = investorId.replace('founder_', '') as CompanyKey;
    return game.companies[companyKey]?.founder ?? investorId;
  }
  if (investorId.startsWith('institution_')) return investorId.replace('institution_', '').replace(/_/g, ' ');
  return investorId;
}

function createGenerativeNpcs(seed: string, count: number, offset = 0): NpcInvestor[] {
  const random = createSeededRandom(`${seed}-${offset}`);
  const usedNames = new Set<string>();
  const strategies: StrategyStyle[] = ['value', 'growth', 'dividend', 'activist', 'balanced'];

  return Array.from({ length: count }, (_, index) => {
    let name = '';
    while (!name || usedNames.has(name)) {
      name = `${randomFrom(random, NPC_FIRST_NAMES)} ${randomFrom(random, NPC_LAST_NAMES)}`;
    }
    usedNames.add(name);

    const strategy = randomFrom(random, strategies);
    const focusCompany = randomFrom(random, COMPANY_KEYS);

    return {
      id: `npc_${offset + index}_${name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
      name,
      persona: randomFrom(random, NPC_PERSONAS),
      strategy,
      cash: randomInt(random, 180, 380),
      focusCompany,
      boldness: Math.round(randomBetween(random, 0.48, 0.95) * 100) / 100,
      patience: Math.round(randomBetween(random, 0.4, 0.92) * 100) / 100,
      horizonDays: randomInt(random, 120, 720),
      reserveRatio: Math.round(randomBetween(random, 0.14, 0.36) * 100) / 100,
      analysisNote: `Masih membangun tesis awal untuk ${focusCompany.toUpperCase()}.`,
      active: true,
    } satisfies NpcInvestor;
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
  upgrades: Record<UpgradeKey, UpgradeState>;
  teams: Record<TeamKey, TeamState>;
  lastRelease: string;
}) {
  const founderInvestorId = `founder_${config.key}`;
  const boardMood = 0.6;
  const revenuePerDay = calculateRevenuePerDay(config.teams, config.upgrades, config.marketShare, config.reputation, boardMood);
  const researchPerDay = calculateResearchPerDay(config.teams, config.upgrades);
  return {
    company: {
      key: config.key,
      name: config.name,
      founder: config.founder,
      founderInvestorId,
      ceoId: founderInvestorId,
      ceoName: config.founder,
      cash: config.cash,
      research: config.research,
      marketShare: config.marketShare,
      reputation: config.reputation,
      releaseCount: 1,
      bestCpuScore: calculateCpuScore(config.upgrades),
      revenuePerDay,
      researchPerDay,
      lastRelease: config.lastRelease,
      focus: config.focus,
      upgrades: config.upgrades,
      teams: config.teams,
      investors: {
        [founderInvestorId]: 520,
        [`institution_${config.key}_partners`]: 170,
      },
      sharesOutstanding: TOTAL_SHARES,
      marketPoolShares: 310,
      dividendPerShare: 0.05,
      payoutRatio: 0.16,
      ceoSalaryPerDay: 2.4,
      boardMood,
      boardMembers: [],
    } satisfies CompanyState,
  };
}

function getRealInvestorCandidates(company: CompanyState) {
  return Object.entries(company.investors)
    .filter(([, shares]) => shares > 0.01)
    .sort(([, left], [, right]) => right - left)
    .map(([investorId]) => investorId);
}

function createIndependentBoardMember(company: CompanyState, slot: number): BoardMember {
  if (slot === 0) {
    return {
      id: `${company.key}_independent_finance`,
      name: `${company.name} Independent Finance Director`,
      seatType: 'independent',
      voteWeight: 1,
      agenda: 'Menjaga disiplin modal, payout, dan risiko leverage.',
    };
  }

  return {
    id: `${company.key}_employee_voice`,
    name: `${company.name} Employee Representative`,
    seatType: 'employee',
    voteWeight: 1,
    agenda: 'Menjaga eksekusi jangka panjang, talenta, dan budaya operasi.',
  };
}

function getCompanyPerformanceScore(company: CompanyState) {
  const cpuScore = calculateCpuScore(company.upgrades);
  return company.marketShare * 0.34
    + company.reputation * 0.28
    + company.boardMood * 18
    + company.cash * 0.018
    + company.researchPerDay * 2.6
    + cpuScore * 0.004;
}

function getCompanyStressLevel(company: CompanyState) {
  const marketStress = clamp((18 - company.marketShare) / 18, 0, 1);
  const reputationStress = clamp((42 - company.reputation) / 42, 0, 1);
  const cashStress = clamp((260 - company.cash) / 260, 0, 1);
  const boardStress = clamp((0.62 - company.boardMood) / 0.62, 0, 1);
  return marketStress * 0.32 + reputationStress * 0.24 + cashStress * 0.22 + boardStress * 0.22;
}

function getBoardMemberOptions(member: BoardMember, company: CompanyState) {
  const options: string[] = [];
  const stress = getCompanyStressLevel(company);

  if (member.seatType === 'chair') {
    options.push('Review CEO', 'Tetapkan target profit', 'Pantau eksekusi board');
  } else if (member.seatType === 'founder') {
    options.push('Jaga visi produk', 'Naikkan investasi R&D', 'Pertahankan talenta inti');
  } else if (member.seatType === 'shareholder') {
    options.push('Dorong ROI', 'Atur ulang alokasi modal', 'Tinjau struktur dividen');
  } else if (member.seatType === 'independent') {
    options.push('Audit risiko', 'Disiplin kas', 'Minta transparansi CEO');
  } else {
    options.push('Jaga moral tim', 'Lindungi roadmap jangka panjang', 'Tekan eksekusi operasi');
  }

  if (stress > 0.6) options.unshift('Siapkan rapat darurat');
  if (company.boardMood < 0.5) options.unshift('Minta evaluasi CEO');
  if (company.cash < 220) options.unshift('Tekan efisiensi biaya');
  if (company.researchPerDay < 11) options.push('Tambah budget riset');
  if (company.marketShare < 15) options.push('Percepat strategi distribusi');
  if (company.payoutRatio > 0.26) options.push('Turunkan payout sementara');

  return Array.from(new Set(options)).slice(0, 4);
}

function getCandidateLeadershipScore(company: CompanyState, candidateId: string, previousCeoId: string) {
  const ownership = getOwnershipPercent(company, candidateId);
  const continuity = candidateId === previousCeoId ? 4 : 0;
  const founderBonus = candidateId === company.founderInvestorId ? 2.5 : 0;
  const operatingStrength = company.marketShare * 0.18 + company.reputation * 0.14 + company.researchPerDay * 0.6;
  return ownership * 1.15 + continuity + founderBonus + operatingStrength * 0.12;
}

function resolveGovernance(game: GameState) {
  const companies = Object.fromEntries(
    (Object.entries(game.companies) as [CompanyKey, CompanyState][]).map(([key, company]) => {
      const ranked = Object.entries(company.investors)
        .filter(([, shares]) => shares > 0.01)
        .sort(([, left], [, right]) => right - left);
      const majorIds = ranked.slice(0, 4).map(([investorId]) => investorId);
      const boardMembers: BoardMember[] = [];

      if (!majorIds.includes(company.founderInvestorId) && (company.investors[company.founderInvestorId] ?? 0) > 0.01) {
        majorIds.splice(Math.min(majorIds.length, 2), 0, company.founderInvestorId);
      }

      const shareholderSeats = Array.from(new Set(majorIds)).slice(0, 5);
      shareholderSeats.forEach((investorId, index) => {
        boardMembers.push({
          id: `${key}_board_${investorId}`,
          name: investorDisplayName(game, investorId),
          seatType: index === 0 ? 'chair' : investorId === company.founderInvestorId ? 'founder' : 'shareholder',
          voteWeight: 1 + getOwnershipPercent(company, investorId) / 18,
          agenda:
            investorId === company.founderInvestorId
              ? 'Menjaga visi produk, budaya teknik, dan kesinambungan bisnis.'
              : 'Mendorong ROI, disiplin strategi, dan pengawasan CEO.',
        });
      });

      while (boardMembers.length < 7) {
        boardMembers.push(createIndependentBoardMember(company, boardMembers.length % 2));
      }

      const candidateIds = Array.from(new Set([company.ceoId, ...getRealInvestorCandidates(company).slice(0, 4)]));
      const boardVotes = new Map<string, number>();

      boardMembers.forEach((member) => {
        let chosenCandidate = candidateIds[0] ?? company.founderInvestorId;
        let chosenScore = -Infinity;

        candidateIds.forEach((candidateId) => {
          const baseScore = getCandidateLeadershipScore(company, candidateId, company.ceoId);
          const ownership = getOwnershipPercent(company, candidateId);
          const stewardship = company.boardMood * 6 + company.reputation * 0.06 + company.marketShare * 0.05;
          const governanceFit = member.seatType === 'independent' || member.seatType === 'employee'
            ? stewardship + Math.min(ownership, 24) * 0.3
            : stewardship + ownership * 0.65;
          const score = baseScore + governanceFit;
          if (score > chosenScore) {
            chosenScore = score;
            chosenCandidate = candidateId;
          }
        });

        boardVotes.set(chosenCandidate, (boardVotes.get(chosenCandidate) ?? 0) + member.voteWeight);
      });

      const [ceoId] = Array.from(boardVotes.entries()).sort((left, right) => right[1] - left[1])[0] ?? [company.founderInvestorId, 0];
      const boardMood = clamp(
        0.35 + company.cash / 2200 + company.marketShare / 120 + company.reputation / 160 + (ceoId === company.ceoId ? 0.06 : -0.04),
        0.3,
        1.5
      );
      const revenuePerDay = calculateRevenuePerDay(company.teams, company.upgrades, company.marketShare, company.reputation, boardMood);
      const researchPerDay = calculateResearchPerDay(company.teams, company.upgrades);
      const valuation = Math.max(120, getCompanyValuation({ ...company, boardMood, revenuePerDay, researchPerDay }));
      const payoutRatio = clamp(0.08 + company.cash / 9000 + company.marketShare / 240 + company.reputation / 420, 0.08, 0.34);
      const dividendPerShare = Math.max(0.01, ((revenuePerDay * 0.42) * payoutRatio) / company.sharesOutstanding);
      const ceoSalaryPerDay = Math.max(0.6, valuation * 0.0009 + revenuePerDay * 0.022 + getOwnershipPercent(company, ceoId) * 0.04);

      return [
        key,
        {
          ...company,
          ceoId,
          ceoName: investorDisplayName(game, ceoId),
          boardMembers,
          boardMood,
          revenuePerDay,
          researchPerDay,
          payoutRatio,
          dividendPerShare,
          ceoSalaryPerDay,
        },
      ];
    })
  ) as Record<CompanyKey, CompanyState>;

  return {
    ...game,
    companies,
  };
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
    upgrades: createUpgrades({ architecture: 2, lithography: 160, clockSpeed: 1.4, coreDesign: 2, cacheStack: 768, powerEfficiency: 90 }),
    teams: createTeams({ researchers: 2, marketing: 1, fabrication: 2 }),
    lastRelease: 'Heroscop Halo-2 unggul di pasar workstation kecil.',
  });

  const companies = {
    cosmic: cosmic.company,
    rmd: rmd.company,
    heroscop: heroscop.company,
  } satisfies Record<CompanyKey, CompanyState>;

  const npcSeed = `${profile.name.trim()}-${Date.now()}-${Math.random()}`;
  const npcs = createGenerativeNpcs(npcSeed, INITIAL_NPC_COUNT);

  npcs.forEach((npc, index) => {
    const primary = npc.focusCompany;
    const secondaries = COMPANY_KEYS.filter((entry) => entry !== primary);
    const secondary = secondaries[index % secondaries.length];
    const firstBudget = randomInt(createSeededRandom(`${npc.id}-open`), 30, 80);
    const secondBudget = randomInt(createSeededRandom(`${npc.id}-second`), 8, 26);
    const primaryPrice = getSharePrice(companies[primary]);
    const secondaryPrice = getSharePrice(companies[secondary]);
    const primaryShares = Math.min(companies[primary].marketPoolShares, Number((firstBudget / primaryPrice).toFixed(2)));
    const secondaryShares = Math.min(companies[secondary].marketPoolShares, Number((secondBudget / secondaryPrice).toFixed(2)));

    companies[primary].marketPoolShares -= primaryShares;
    companies[primary].investors[npc.id] = (companies[primary].investors[npc.id] ?? 0) + primaryShares;
    companies[secondary].marketPoolShares -= secondaryShares;
    companies[secondary].investors[npc.id] = (companies[secondary].investors[npc.id] ?? 0) + secondaryShares;
    npc.cash -= primaryShares * primaryPrice + secondaryShares * secondaryPrice;
    npc.analysisNote = `Membuka posisi awal di ${companies[primary].name} dan posisi sekunder di ${companies[secondary].name}.`;
  });

  return resolveGovernance({
    elapsedDays: 0,
    tickCount: 0,
    player: {
      id: playerId,
      name: profile.name.trim() || 'Player',
      background: profile.background,
      cash: PLAYER_STARTING_CASH,
      selectedCompany: profile.selectedCompany,
    },
    companies,
    npcs,
    activityFeed: [
      `01/01/00: Profil ${profile.name.trim() || 'Player'} dibuat dengan modal awal $${formatNumber(PLAYER_STARTING_CASH)}M.`,
      `01/01/00: 20 AI NPC aktif dibangkitkan dengan strategi value, growth, dividend, activist, dan balanced.`,
      `01/01/00: Dewan direksi 7 kursi aktif di tiap perusahaan untuk memilih CEO secara dinamis.`,
    ],
  });
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

function applyCashToInvestor(game: GameState, investorId: string, amount: number) {
  if (amount === 0) return game;
  if (investorId === game.player.id) {
    return {
      ...game,
      player: {
        ...game.player,
        cash: game.player.cash + amount,
      },
    };
  }

  return {
    ...game,
    npcs: game.npcs.map((npc) => (npc.id === investorId ? { ...npc, cash: npc.cash + amount } : npc)),
  };
}

function transactShares(current: GameState, investorId: string, companyKey: CompanyKey, mode: InvestorActionMode, requestedAmount: number) {
  const company = current.companies[companyKey];
  if (requestedAmount <= 0) {
    return { next: current, tradedValue: 0, sharesMoved: 0 };
  }

  const investorCash = getInvestorCash(current, investorId);
  const currentShares = company.investors[investorId] ?? 0;
  const preview = getTradePreview(company, investorCash, currentShares, mode, requestedAmount);
  if (preview.grossTradeValue < MIN_TRADE_AMOUNT || preview.sharesMoved <= 0) {
    return { next: current, tradedValue: 0, sharesMoved: 0 };
  }
  if (mode === 'buy' && preview.netCashDelta * -1 > investorCash + 0.0001) {
    return { next: current, tradedValue: 0, sharesMoved: 0 };
  }

  if (mode === 'buy') {
    let next: GameState = {
      ...current,
      companies: {
        ...current.companies,
        [companyKey]: {
          ...company,
          marketPoolShares: Math.max(0, company.marketPoolShares - preview.sharesMoved),
          investors: {
            ...company.investors,
            [investorId]: currentShares + preview.sharesMoved,
          },
        },
      },
    };
    next = applyCashToInvestor(next, investorId, preview.netCashDelta);
    return { next: resolveGovernance(next), tradedValue: preview.grossTradeValue, sharesMoved: preview.sharesMoved };
  }

  const nextInvestors = { ...company.investors, [investorId]: currentShares - preview.sharesMoved };
  if (nextInvestors[investorId] <= 0.01) {
    delete nextInvestors[investorId];
  }

  let next: GameState = {
    ...current,
    companies: {
      ...current.companies,
      [companyKey]: {
        ...company,
        marketPoolShares: company.marketPoolShares + preview.sharesMoved,
        investors: nextInvestors,
      },
    },
  };
  next = applyCashToInvestor(next, investorId, preview.netCashDelta);
  return { next: resolveGovernance(next), tradedValue: preview.grossTradeValue, sharesMoved: preview.sharesMoved };
}

function maybeGenerateMoreNpcs(current: GameState) {
  if (current.npcs.length >= MAX_ACTIVE_NPCS || current.elapsedDays < NPC_GROWTH_START_DAY) {
    return current;
  }

  const targetCount = Math.min(
    MAX_ACTIVE_NPCS,
    INITIAL_NPC_COUNT + Math.floor((current.elapsedDays - NPC_GROWTH_START_DAY) / NPC_GROWTH_INTERVAL_DAYS + 1) * NPC_GROWTH_BATCH
  );

  if (targetCount <= current.npcs.length) {
    return current;
  }

  const newNpcs = createGenerativeNpcs(`late-${current.elapsedDays}`, targetCount - current.npcs.length, current.npcs.length);
  let next = { ...current, npcs: [...current.npcs] };

  newNpcs.forEach((npc, index) => {
    next.npcs.push(npc);
    const targetCompany = COMPANY_KEYS[index % COMPANY_KEYS.length];
    const budget = 28 + index * 3;
    const result = transactShares(next, npc.id, targetCompany, 'buy', budget);
    next = result.next;
    const addedNpc = next.npcs.find((entry) => entry.id === npc.id);
    if (addedNpc) {
      addedNpc.analysisNote = `NPC generasi lanjutan masuk ke pasar ${next.companies[targetCompany].name} setelah tanggal ${formatDateFromDays(next.elapsedDays)}.`;
    }
  });

  return {
    ...next,
    activityFeed: addFeedEntry(next.activityFeed, `${formatDateFromDays(next.elapsedDays)}: Smart generation menambah AI investor aktif menjadi ${next.npcs.length}.`),
  };
}

function simulateTick(current: GameState) {
  const tickDays = TICK_MS / 1000;
  const nextElapsedDays = current.elapsedDays + tickDays;
  const reachedNewDay = Math.floor(nextElapsedDays) > Math.floor(current.elapsedDays);
  const governedCurrent = resolveGovernance(current);

  let nextPlayerCash = governedCurrent.player.cash;
  const npcCashMap = new Map(governedCurrent.npcs.map((npc) => [npc.id, npc.cash]));

  const companies = Object.fromEntries(
    (Object.entries(governedCurrent.companies) as [CompanyKey, CompanyState][]).map(([key, governedCompany]) => {
      const retentionProfit = governedCompany.revenuePerDay * 0.42 * (1 - governedCompany.payoutRatio);
      const dividendPoolPerDay = governedCompany.dividendPerShare * governedCompany.sharesOutstanding;
      const passiveMarketDelta = governedCompany.teams.marketing.count * 0.016 + governedCompany.teams.fabrication.count * 0.011 + governedCompany.boardMood * 0.006;
      const passiveReputationDelta = governedCompany.teams.marketing.count * 0.009 + governedCompany.boardMood * 0.006;
      const stressLevel = getCompanyStressLevel(governedCompany);
      const capitalFlightPerDay = stressLevel * (6 + governedCompany.marketPoolShares / 80);
      const managementDragPerDay = stressLevel * (1.2 + governedCompany.revenuePerDay * 0.08);

      Object.entries(governedCompany.investors).forEach(([investorId, shares]) => {
        const payout = shares * governedCompany.dividendPerShare * tickDays;
        if (investorId === governedCurrent.player.id) nextPlayerCash += payout;
        else npcCashMap.set(investorId, (npcCashMap.get(investorId) ?? 0) + payout);
      });

      const ceoSalary = governedCompany.ceoSalaryPerDay * tickDays;
      if (governedCompany.ceoId === current.player.id) nextPlayerCash += ceoSalary;
      else npcCashMap.set(governedCompany.ceoId, (npcCashMap.get(governedCompany.ceoId) ?? 0) + ceoSalary);

      return [
        key,
        {
          ...governedCompany,
          research: governedCompany.research + governedCompany.researchPerDay * tickDays,
          cash: Math.max(0, governedCompany.cash + retentionProfit * tickDays - dividendPoolPerDay * tickDays - ceoSalary - capitalFlightPerDay * tickDays - managementDragPerDay * tickDays),
          marketShare: clamp(governedCompany.marketShare + passiveMarketDelta * tickDays - stressLevel * 0.75 * tickDays, 3, 75),
          reputation: clamp(governedCompany.reputation + passiveReputationDelta * tickDays - stressLevel * 0.92 * tickDays, 10, 100),
        },
      ];
    })
  ) as Record<CompanyKey, CompanyState>;

  let nextState: GameState = resolveGovernance({
    ...governedCurrent,
    elapsedDays: nextElapsedDays,
    tickCount: governedCurrent.tickCount + 1,
    player: {
      ...governedCurrent.player,
      cash: nextPlayerCash,
    },
    npcs: governedCurrent.npcs.map((npc) => ({
      ...npc,
      cash: npcCashMap.get(npc.id) ?? npc.cash,
      active: true,
    })),
    companies,
  });

  if (nextState.tickCount % NPC_ACTION_EVERY_TICKS === 0) {
    nextState = runNpcTurn(nextState);
  }

  if (reachedNewDay) {
    nextState = maybeGenerateMoreNpcs(nextState);
  }

  return nextState;
}

function scoreCompanyForNpc(npc: NpcInvestor, company: CompanyState) {
  const sharePrice = getSharePrice(company);
  const valuation = getCompanyValuation(company);
  const cpuScore = calculateCpuScore(company.upgrades);
  const dividendYield = (company.dividendPerShare * 365) / Math.max(1, sharePrice);
  const growthSignal = company.marketShare / 28 + company.researchPerDay / 18 + cpuScore / 900;
  const qualitySignal = company.reputation / 42 + company.boardMood + company.cash / 1200;
  const valueSignal = valuation / Math.max(1, sharePrice * company.sharesOutstanding);
  const controlSignal = getOwnershipPercent(company, npc.id) / 14;
  const performanceSignal = getCompanyPerformanceScore(company) / 25;
  const stressLevel = getCompanyStressLevel(company);
  const managementPenalty = stressLevel * 2.6;
  const strategyBias =
    npc.strategy === 'value'
      ? valueSignal * 2.3 + qualitySignal * 0.8 + performanceSignal * 0.5
      : npc.strategy === 'growth'
        ? growthSignal * 2.4 + qualitySignal * 0.9 + performanceSignal * 0.6
        : npc.strategy === 'dividend'
          ? dividendYield * 3.2 + qualitySignal * 0.9 + performanceSignal * 0.3
          : npc.strategy === 'activist'
            ? controlSignal * 2.4 + valueSignal * 1.1 + growthSignal * 0.9 + performanceSignal * 0.45
            : valueSignal * 1.2 + growthSignal * 1.3 + dividendYield * 1.1 + performanceSignal * 0.45;

  const longTermFit = npc.horizonDays / 365 * 0.35 + npc.patience * 0.6;
  return {
    sharePrice,
    valuation,
    cpuScore,
    dividendYield,
    growthSignal,
    qualitySignal,
    performanceSignal,
    stressLevel,
    managementPenalty,
    finalScore: strategyBias + longTermFit - managementPenalty,
  };
}

function runNpcTurn(current: GameState) {
  let next = { ...current, companies: { ...current.companies }, npcs: current.npcs.map((npc) => ({ ...npc })) };

  next.npcs.forEach((npc) => {
    const analyses = (Object.entries(next.companies) as [CompanyKey, CompanyState][])
      .map(([key, company]) => ({
        key,
        company,
        ownership: getOwnershipPercent(company, npc.id),
        ...scoreCompanyForNpc(npc, company),
      }))
      .sort((left, right) => right.finalScore - left.finalScore);

    const best = analyses[0];
    const second = analyses[1];
    const currentFocus = analyses.find((entry) => entry.key === npc.focusCompany) ?? best;
    npc.focusCompany = best.key;

    const reserveCash = 20 + npc.cash * npc.reserveRatio;
    const bestOutrunsFocus = best.finalScore - currentFocus.finalScore;
    const shouldTrim = currentFocus.ownership > 4
      && (
        bestOutrunsFocus > 0.85
        || currentFocus.dividendYield < 0.08
        || currentFocus.company.boardMood < 0.45
        || currentFocus.stressLevel > 0.55
      );
    const shouldExit = currentFocus.ownership > 1.2
      && (currentFocus.stressLevel > 0.78 || currentFocus.company.cash < 150 || currentFocus.performanceSignal < 1.55);

    if (shouldTrim || shouldExit) {
      const ownedValue = (currentFocus.company.investors[npc.id] ?? 0) * currentFocus.sharePrice;
      const trimBudget = shouldExit
        ? clamp(ownedValue * (0.45 + npc.boldness * 0.2), MIN_TRADE_AMOUNT, ownedValue * 0.92)
        : clamp(ownedValue * (0.18 + npc.boldness * 0.22), MIN_TRADE_AMOUNT, ownedValue * 0.6);
      const result = transactShares(next, npc.id, currentFocus.key, 'sell', trimBudget);
      if (result.tradedValue > 0) {
        next = {
          ...result.next,
          activityFeed: addFeedEntry(
            result.next.activityFeed,
            `${formatDateFromDays(result.next.elapsedDays)}: ${npc.name} menjual ${formatNumber(result.sharesMoved, 2)} saham ${currentFocus.company.name}${shouldExit ? ' untuk kabur dari manajemen buruk.' : ' demi reposisi jangka panjang.'}`
          ),
        };
        const refreshedCompany = next.companies[currentFocus.key];
        const lostCeo = refreshedCompany.ceoId !== npc.id && currentFocus.company.ceoId === npc.id;
        npc.analysisNote = lostCeo
          ? `${npc.name} melepas saham ${refreshedCompany.name} terlalu jauh dan otomatis turun dari kursi CEO oleh voting dewan.`
          : shouldExit
            ? `${npc.name} keluar agresif dari ${refreshedCompany.name} karena performa CEO dan manajemen dianggap terlalu berisiko.`
            : `${npc.name} mengurangi posisi di ${refreshedCompany.name} karena valuasi dan tata kelola tidak lagi seideal sebelumnya.`;
        return;
      }
    }

    const affordable = npc.cash - reserveCash;
    const conviction = best.finalScore - (second?.finalScore ?? 0);
    if (affordable < MIN_TRADE_AMOUNT || conviction < 0.12) {
      npc.analysisNote = `${best.company.name} tetap dipantau. ${npc.name} memilih menahan kas karena spread peluang belum cukup tebal.`;
      return;
    }

    const budget = clamp(best.sharePrice * (2.2 + npc.boldness * 2.8) + conviction * 20, MIN_TRADE_AMOUNT, affordable * (0.42 + npc.boldness * 0.24));
    const buyResult = transactShares(next, npc.id, best.key, 'buy', budget);
    if (buyResult.tradedValue <= 0) {
      npc.analysisNote = `${best.company.name} menarik, tetapi likuiditas pasar untuk transaksi wajar sedang tipis.`;
      return;
    }

    next = {
      ...buyResult.next,
      activityFeed: addFeedEntry(
        buyResult.next.activityFeed,
        `${formatDateFromDays(buyResult.next.elapsedDays)}: ${npc.name} membeli ${formatNumber(buyResult.sharesMoved, 2)} saham ${best.company.name} berdasarkan analisis ${STRATEGY_LABELS[npc.strategy].toLowerCase()}.`
      ),
    };

    const diversified = second && npc.cash > reserveCash + 30 && second.finalScore >= best.finalScore * 0.92;
    if (diversified) {
      const sideBudget = clamp(affordable * 0.18, MIN_TRADE_AMOUNT, affordable * 0.24);
      const sideResult = transactShares(next, npc.id, second.key, 'buy', sideBudget);
      if (sideResult.tradedValue > 0) {
        next = {
          ...sideResult.next,
          activityFeed: addFeedEntry(
            sideResult.next.activityFeed,
            `${formatDateFromDays(sideResult.next.elapsedDays)}: ${npc.name} juga menambah posisi kecil di ${second.company.name} untuk diversifikasi tanpa cheating.`
          ),
        };
        npc.analysisNote = `${npc.name} memprioritaskan ${best.company.name} dan tetap membuka hedging strategis di ${second.company.name}.`;
        return;
      }
    }

    npc.analysisNote = `${npc.name} membandingkan kinerja, valuasi, mood dewan, riset, dan arus modal sebelum menambah ${best.company.name}.`;
  });

  return resolveGovernance(next);
}

export function CpuFoundrySim() {
  const [game, setGame] = useState<GameState | null>(null);
  const [profileDraft, setProfileDraft] = useState<ProfileDraft>(DEFAULT_PROFILE_DRAFT);
  const [openPanels, setOpenPanels] = useState<Record<PanelKey, boolean>>(DEFAULT_OPEN_PANELS);
  const [companyDetailPanels, setCompanyDetailPanels] = useState<Record<CompanyDetailPanelKey, boolean>>(DEFAULT_COMPANY_DETAIL_PANELS);
  const [releaseDraft, setReleaseDraft] = useState<ReleaseDraft>(DEFAULT_RELEASE_DRAFT);
  const [investmentDraft, setInvestmentDraft] = useState<InvestmentDraft>({ company: 'cosmic', mode: 'buy', sliderPercent: 50 });
  const [statusMessage, setStatusMessage] = useState('Buat profil dulu untuk masuk ke simulasi hidup investor CPU.');
  const [isReleaseMenuOpen, setIsReleaseMenuOpen] = useState(false);
  const [isInvestmentMenuOpen, setIsInvestmentMenuOpen] = useState(false);
  const [isCompaniesFrameOpen, setIsCompaniesFrameOpen] = useState(false);
  const [isInvestorFrameOpen, setIsInvestorFrameOpen] = useState(false);
  const [investorFrameCompanyKey, setInvestorFrameCompanyKey] = useState<CompanyKey>('cosmic');
  const [focusedCompanyKey, setFocusedCompanyKey] = useState<CompanyKey | null>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as GameState;
      const normalized = resolveGovernance({
        ...parsed,
        npcs: parsed.npcs.map((npc) => ({
          ...npc,
          strategy: npc.strategy ?? 'balanced',
          horizonDays: npc.horizonDays ?? 365,
          reserveRatio: npc.reserveRatio ?? 0.2,
          analysisNote: npc.analysisNote ?? 'Masih memetakan ulang peluang pasar.',
          active: true,
        })),
      });
      setGame(normalized);
      setStatusMessage(`Selamat datang kembali, ${parsed.player.name}.`);
      setReleaseDraft((current) => ({
        ...current,
        series: `${parsed.companies[parsed.player.selectedCompany].name} Prime`,
      }));
      setInvestorFrameCompanyKey(parsed.player.selectedCompany);
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    if (!game) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(game));
  }, [game]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setGame((current) => (current ? simulateTick(current) : current));
    }, TICK_MS);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const previousHtmlOverflowY = html.style.overflowY;
    const previousBodyOverflowY = body.style.overflowY;
    const previousBodyTouchAction = body.style.touchAction;

    html.style.overflowY = 'auto';
    body.style.overflowY = 'auto';
    body.style.touchAction = 'pan-y';

    return () => {
      html.style.overflowY = previousHtmlOverflowY;
      body.style.overflowY = previousBodyOverflowY;
      body.style.touchAction = previousBodyTouchAction;
    };
  }, []);


  const togglePanel = (panel: PanelKey) => {
    setOpenPanels((current) => ({ ...current, [panel]: !current[panel] }));
  };

  const toggleCompanyDetailPanel = (panel: CompanyDetailPanelKey) => {
    setCompanyDetailPanels((current) => ({ ...current, [panel]: !current[panel] }));
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
    setInvestmentDraft({ company: profileDraft.selectedCompany, mode: 'buy', sliderPercent: 50 });
    setInvestorFrameCompanyKey(profileDraft.selectedCompany);
  };

  const resetProfile = () => {
    window.localStorage.removeItem(STORAGE_KEY);
    setGame(null);
    setProfileDraft(DEFAULT_PROFILE_DRAFT);
    setReleaseDraft(DEFAULT_RELEASE_DRAFT);
    setInvestmentDraft({ company: 'cosmic', mode: 'buy', sliderPercent: 50 });
    setStatusMessage('Profil dihapus. Kamu bisa membuat akun baru.');
    setIsInvestmentMenuOpen(false);
    setIsReleaseMenuOpen(false);
    setIsCompaniesFrameOpen(false);
    setIsInvestorFrameOpen(false);
    setFocusedCompanyKey(null);
  };

  const activeCompany = game ? game.companies[game.player.selectedCompany] : null;
  const focusedCompany = game && focusedCompanyKey ? game.companies[focusedCompanyKey] : null;
  const activePricePreset = PRICE_PRESETS[releaseDraft.priceIndex];
  const isPlayerCeo = Boolean(game && activeCompany && activeCompany.ceoId === game.player.id);
  const focusedPlayerIsCeo = Boolean(game && focusedCompany && focusedCompany.ceoId === game.player.id);
  const activeCpuScore = activeCompany ? calculateCpuScore(activeCompany.upgrades) : 0;
  const focusedCpuScore = focusedCompany ? calculateCpuScore(focusedCompany.upgrades) : 0;
  const playerNetWorth = useMemo(() => {
    if (!game) return 0;
    const holdings = (Object.values(game.companies) as CompanyState[]).reduce((sum, company) => {
      const ownedShares = company.investors[game.player.id] ?? 0;
      return sum + ownedShares * getSharePrice(company);
    }, 0);
    return game.player.cash + holdings;
  }, [game]);
  const investmentPreview = useMemo(() => {
    if (!game) return null;
    const company = game.companies[investmentDraft.company];
    const currentShares = company.investors[game.player.id] ?? 0;
    const maxTradeValue = getMaxTradeValue(company, game.player.cash, currentShares, investmentDraft.mode);
    return getTradePreview(
      company,
      game.player.cash,
      currentShares,
      investmentDraft.mode,
      getRequestedTradeValue(maxTradeValue, investmentDraft.sliderPercent)
    );
  }, [game, investmentDraft]);

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
    setReleaseDraft((current) => ({ ...current, series: `${game.companies[company].name} Prime` }));
  };

  const closeTransientLayers = () => {
    setIsReleaseMenuOpen(false);
    setIsInvestmentMenuOpen(false);
    setIsCompaniesFrameOpen(false);
    setIsInvestorFrameOpen(false);
    setFocusedCompanyKey(null);
  };

  const openCompaniesFrame = () => {
    closeTransientLayers();
    setIsCompaniesFrameOpen(true);
  };

  const openInvestorFrame = (company: CompanyKey) => {
    closeTransientLayers();
    setInvestorFrameCompanyKey(company);
    setIsInvestorFrameOpen(true);
  };

  const openCompanyDetail = (company: CompanyKey) => {
    switchCompany(company);
    closeTransientLayers();
    setCompanyDetailPanels(DEFAULT_COMPANY_DETAIL_PANELS);
    setFocusedCompanyKey(company);
  };

  const closeCompanyDetail = () => {
    setFocusedCompanyKey(null);
    setIsCompaniesFrameOpen(true);
  };

  const investInCompany = () => {
    if (!game || !investmentPreview) return;
    const company = game.companies[investmentDraft.company];
    const beforeWasCeo = company.ceoId === game.player.id;
    const requestedTradeValue = getRequestedTradeValue(investmentPreview.maxTradeValue, investmentDraft.sliderPercent);
    const result = transactShares(game, game.player.id, investmentDraft.company, investmentDraft.mode, requestedTradeValue);
    if (result.tradedValue <= 0) {
      setStatusMessage(investmentDraft.mode === 'buy' ? 'Dana pribadi atau likuiditas pasar tidak cukup untuk membeli saham.' : 'Jumlah saham yang ingin dijual belum cukup atau terlalu kecil.');
      return;
    }

    const next = {
      ...result.next,
      player: {
        ...result.next.player,
        selectedCompany: investmentDraft.company,
      },
      activityFeed: addFeedEntry(
        result.next.activityFeed,
        `${formatDateFromDays(result.next.elapsedDays)}: ${game.player.name} ${investmentDraft.mode === 'buy' ? 'membeli' : 'menjual'} ${formatNumber(result.sharesMoved, 2)} saham ${company.name}.`
      ),
    };

    const nextCompany = next.companies[investmentDraft.company];
    const playerOwnership = getOwnershipPercent(nextCompany, next.player.id);
    const lostCeo = beforeWasCeo && nextCompany.ceoId !== next.player.id;
    setGame(next);
    setStatusMessage(
      investmentDraft.mode === 'buy'
        ? nextCompany.ceoId === next.player.id
          ? `Kamu sekarang CEO ${nextCompany.name} dengan kepemilikan ${formatNumber(playerOwnership, 1)}%.`
          : `Pembelian selesai. Kepemilikanmu di ${nextCompany.name} sekarang ${formatNumber(playerOwnership, 1)}%.`
        : lostCeo
          ? `Penjualan selesai dan kamu otomatis turun dari posisi CEO ${nextCompany.name} karena voting dewan.`
          : `Penjualan selesai. Kepemilikanmu di ${nextCompany.name} kini ${formatNumber(playerOwnership, 1)}%.`
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
      return resolveGovernance({
        ...current,
        companies: {
          ...current.companies,
          [company.key]: {
            ...nextCompany,
            bestCpuScore: Math.max(nextCompany.bestCpuScore, calculateCpuScore(nextCompany.upgrades)),
          },
        },
      });
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
      return resolveGovernance({
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
      });
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
    const reputationGain = Math.max(1.2, activeCpuScore / 240 + activeCompany.teams.marketing.count * 0.7 + activePricePreset.reputationBonus);
    const marketShareGain = Math.min(4.8, activeCpuScore / 500 + activeCompany.teams.fabrication.count * 0.16 + activePricePreset.marketBonus);

    const next = resolveGovernance({
      ...game,
      companies: {
        ...game.companies,
        [activeCompany.key]: {
          ...activeCompany,
          cash: activeCompany.cash + launchRevenue,
          reputation: clamp(activeCompany.reputation + reputationGain, 10, 100),
          marketShare: clamp(activeCompany.marketShare + marketShareGain, 3, 75),
          releaseCount: activeCompany.releaseCount + 1,
          bestCpuScore: Math.max(activeCompany.bestCpuScore, activeCpuScore),
          lastRelease: `${series} ${cpuName} rilis ${formatDateFromDays(game.elapsedDays)} (${activePricePreset.label.toLowerCase()}).`,
        },
      },
      activityFeed: addFeedEntry(
        game.activityFeed,
        `${formatDateFromDays(game.elapsedDays)}: ${activeCompany.name} merilis ${series} ${cpuName} dan membukukan $${formatNumber(launchRevenue)}M.`
      ),
    });

    setGame(next);
    setStatusMessage(`${series} ${cpuName} sukses dirilis.`);
    setReleaseDraft({ ...releaseDraft, cpuName: `PX-${String(activeCompany.releaseCount + 1).padStart(2, '0')}` });
    setIsReleaseMenuOpen(false);
  };

  if (!game) {
    return (
      <main className={styles.shell}>
        <section className={styles.loginCard}>
          <p className={styles.eyebrow}>/game · profile login</p>
          <h1>Investor CPU Life</h1>
          <p className={styles.subtitle}>Buat profil lalu masuk ke pasar saham CPU yang selalu berjalan realtime.</p>

          <label className={styles.field}>
            <span>Nama profil</span>
            <input value={profileDraft.name} onChange={(event) => setProfileDraft((current) => ({ ...current, name: event.target.value }))} placeholder="Contoh: Arka Vega" />
          </label>

          <label className={styles.field}>
            <span>Latar belakang</span>
            <input value={profileDraft.background} onChange={(event) => setProfileDraft((current) => ({ ...current, background: event.target.value }))} placeholder="Investor dengan visi teknologi" />
          </label>

          <div className={styles.quickGrid}>
            {COMPANY_KEYS.map((company) => (
              <button key={company} type="button" className={profileDraft.selectedCompany === company ? styles.quickButtonActive : styles.quickButton} onClick={() => setProfileDraft((current) => ({ ...current, selectedCompany: company }))}>
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
              <span>Waktu game</span>
              <strong>DD/MM/YY · 1 hari = 1 detik</strong>
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

  const companyCards = (Object.values(game.companies) as CompanyState[]).map((company) => ({
    company,
    playerOwnership: getOwnershipPercent(company, game.player.id),
    sharePrice: getSharePrice(company),
    companyValue: getCompanyValuation(company),
  }));

  const investorRankings = Object.entries(game.companies[investorFrameCompanyKey].investors)
    .map(([investorId, shares]) => ({
      investorId,
      shares,
      amount: shares * getSharePrice(game.companies[investorFrameCompanyKey]),
      ownership: getOwnershipPercent(game.companies[investorFrameCompanyKey], investorId),
      displayName: investorDisplayName(game, investorId),
    }))
    .sort((left, right) => right.shares - left.shares);

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
            <div className={styles.yearBadge}>{formatDateFromDays(game.elapsedDays)}</div>
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
              <span>NPC aktif</span>
              <strong>{game.npcs.length} / {MAX_ACTIVE_NPCS}</strong>
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
                    <strong>{isPlayerCeo ? 'CEO aktif di bawah pengawasan dewan' : 'Sedang akumulasi / distribusi saham'}</strong>
                  </div>
                  <div>
                    <span>Perusahaan fokus</span>
                    <strong>{activeCompany?.name}</strong>
                  </div>
                  <div>
                    <span>Dividen/hari</span>
                    <strong>$ {formatNumber((activeCompany?.dividendPerShare ?? 0) * (activeCompany?.investors[game.player.id] ?? 0), 2)}M</strong>
                  </div>
                  <div>
                    <span>Gaji CEO/hari</span>
                    <strong>$ {formatNumber(isPlayerCeo && activeCompany ? activeCompany.ceoSalaryPerDay : 0, 2)}M</strong>
                  </div>
                  <div>
                    <span>Nilai perusahaan fokus</span>
                    <strong>$ {formatNumber(activeCompany ? getCompanyValuation(activeCompany) : 0, 1)}M</strong>
                  </div>
                  <div>
                    <span>Kepemilikan</span>
                    <strong>{activeCompany ? `${formatNumber(getOwnershipPercent(activeCompany, game.player.id), 1)}%` : '0%'}</strong>
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
                  <button type="button" className={styles.secondaryButton} onClick={() => { closeTransientLayers(); setIsInvestmentMenuOpen(true); }}>
                    Beli / jual saham
                  </button>
                  <button type="button" className={styles.ghostButton} onClick={() => activeCompany && openInvestorFrame(activeCompany.key)}>
                    Investor list
                  </button>
                  <button type="button" className={styles.ghostButton} onClick={() => activeCompany && openCompanyDetail(activeCompany.key)}>
                    Detail fokus
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
                          <p className={styles.itemLabel}>{npc.persona} · {STRATEGY_LABELS[npc.strategy]}</p>
                          <h3>{npc.name}</h3>
                        </div>
                        <span className={styles.costPill}>$ {formatNumber(npc.cash, 1)}M</span>
                      </div>
                      <p className={styles.itemDescription}>{game.companies[npc.focusCompany].name} · {formatNumber(npc.horizonDays)} hari · {npc.analysisNote}</p>
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
                <p>Tap perusahaan untuk cek valuasi, harga saham, dan ownership live.</p>
              </div>

              <div className={styles.companyList}>
                {companyCards.map(({ company, playerOwnership, sharePrice, companyValue }) => (
                  <button key={company.key} type="button" className={styles.companyCardButton} onClick={() => openCompanyDetail(company.key)}>
                    <article className={styles.companyCard}>
                      <div className={styles.itemTop}>
                        <div>
                          <p className={styles.itemLabel}>{company.focus}</p>
                          <h3>{company.name}</h3>
                        </div>
                        <span className={styles.costPill}>$ {formatNumber(sharePrice, 2)} / share</span>
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
                          <span>Market cap</span>
                          <strong>$ {formatNumber(getSharePrice(company) * company.sharesOutstanding, 1)}M</strong>
                        </div>
                      </div>
                      <p className={styles.itemDescription}>Pantau board, investor, dan trade live.</p>
                    </article>
                  </button>
                ))}
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {isInvestorFrameOpen ? (
        <div className={styles.screenFrameOverlay} role="presentation" onClick={() => setIsInvestorFrameOpen(false)}>
          <section className={styles.screenFrameCard} role="dialog" aria-modal="true" aria-label="Daftar investor" onClick={(event) => event.stopPropagation()}>
            <div className={styles.screenFrameHeader}>
              <div>
                <p className={styles.panelTag}>Investor list</p>
                <h2>{game.companies[investorFrameCompanyKey].name} ownership board</h2>
              </div>
              <button type="button" className={styles.closeButton} onClick={() => setIsInvestorFrameOpen(false)} aria-label="Kembali ke halaman utama">
                ←
              </button>
            </div>

            <div className={styles.screenFrameBody}>
              <div className={styles.quickGrid}>
                {COMPANY_KEYS.map((company) => (
                  <button key={company} type="button" className={investorFrameCompanyKey === company ? styles.quickButtonActive : styles.quickButton} onClick={() => setInvestorFrameCompanyKey(company)}>
                    {game.companies[company].name}
                  </button>
                ))}
              </div>

              <div className={styles.memoCard}>
                <p className={styles.panelTag}>Urutan investor</p>
                <p>Jual saham besar bisa langsung menggoyang kursi CEO.</p>
              </div>

              <div className={styles.panel}>
                <div className={styles.panelToggle} role="presentation">
                  <div>
                    <p className={styles.panelTag}>Ranking</p>
                    <h2>Investor terbesar → terkecil</h2>
                  </div>
                  <span>{formatNumber(investorRankings.length)} investor</span>
                </div>
                <div className={styles.panelList}>
                  {investorRankings.map((entry, index) => (
                    <article key={entry.investorId} className={styles.itemCard}>
                      <div className={styles.itemTop}>
                        <div>
                          <p className={styles.itemLabel}>Rank #{index + 1}</p>
                          <h3>{entry.displayName}</h3>
                        </div>
                        <span className={styles.costPill}>{formatNumber(entry.ownership, 1)}%</span>
                      </div>
                      <p className={styles.itemDescription}>Saham {formatNumber(entry.shares, 2)} · Nilai $ {formatNumber(entry.amount, 1)}M · {game.companies[investorFrameCompanyKey].ceoId === entry.investorId ? 'CEO aktif.' : 'Investor aktif.'}</p>
                    </article>
                  ))}
                </div>
              </div>
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
                  <div>
                    <span>Dividen/share/hari</span>
                    <strong>$ {formatNumber(focusedCompany.dividendPerShare, 3)}M</strong>
                  </div>
                  <div>
                    <span>Gaji CEO/hari</span>
                    <strong>$ {formatNumber(focusedCompany.ceoSalaryPerDay, 2)}M</strong>
                  </div>
                </div>
                <div className={styles.actionRow}>
                  <button type="button" className={styles.ghostButton} onClick={closeCompanyDetail}>
                    Go back
                  </button>
                  <button type="button" className={styles.secondaryButton} onClick={() => { switchCompany(focusedCompany.key); setInvestmentDraft((current) => ({ ...current, company: focusedCompany.key })); closeTransientLayers(); setIsInvestmentMenuOpen(true); }}>
                    Beli / jual saham
                  </button>
                  <button type="button" className={styles.primaryButton} onClick={() => { switchCompany(focusedCompany.key); closeTransientLayers(); setIsReleaseMenuOpen(true); }} disabled={!focusedPlayerIsCeo}>
                    {focusedPlayerIsCeo ? 'Release CPU' : 'Harus jadi CEO'}
                  </button>
                  <button type="button" className={styles.ghostButton} onClick={() => openInvestorFrame(focusedCompany.key)}>
                    Investor list
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
                        <span>RP/hari</span>
                        <strong>{formatNumber(focusedCompany.researchPerDay, 1)}</strong>
                      </div>
                      <div>
                        <span>Cash/hari</span>
                        <strong>$ {formatNumber(focusedCompany.revenuePerDay, 1)}M</strong>
                      </div>
                      <div>
                        <span>Harga saham</span>
                        <strong>$ {formatNumber(getSharePrice(focusedCompany), 2)}</strong>
                      </div>
                      <div>
                        <span>Treasury/market</span>
                        <strong>{formatNumber(focusedCompany.marketPoolShares, 2)} saham</strong>
                      </div>
                      <div>
                        <span>Market cap</span>
                        <strong>$ {formatNumber(getSharePrice(focusedCompany) * focusedCompany.sharesOutstanding, 1)}M</strong>
                      </div>
                      <div>
                        <span>Nilai/lembar intrinsik</span>
                        <strong>$ {formatNumber(getCompanyValuation(focusedCompany) / focusedCompany.sharesOutstanding, 2)}</strong>
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
                <button type="button" className={styles.panelToggle} onClick={() => toggleCompanyDetailPanel('governance')}>
                  <div>
                    <p className={styles.panelTag}>Governance</p>
                    <h2>Dewan direksi ala dunia nyata</h2>
                  </div>
                  <span>{companyDetailPanels.governance ? 'Tutup' : 'Buka'}</span>
                </button>
                {companyDetailPanels.governance ? (
                  <div className={styles.panelList}>
                    <div className={styles.memoCard}>
                      <p className={styles.panelTag}>Board system</p>
                      <p>7 kursi dewan memilih CEO dari performa dan ownership.</p>
                    </div>
                    {focusedCompany.boardMembers.map((member) => (
                      <article key={member.id} className={styles.itemCard}>
                        <div className={styles.itemTop}>
                          <div>
                            <p className={styles.itemLabel}>{member.seatType}</p>
                            <h3>{member.name}</h3>
                          </div>
                          <span className={styles.costPill}>Vote {formatNumber(member.voteWeight, 1)}</span>
                        </div>
                        <p className={styles.itemDescription}>{member.agenda}</p>
                        <div className={styles.optionList}>
                          {getBoardMemberOptions(member, focusedCompany).map((option) => (
                            <span key={`${member.id}-${option}`} className={styles.optionPill}>{option}</span>
                          ))}
                        </div>
                      </article>
                    ))}
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
                      .map(([investorId, shares]) => (
                        <article key={investorId} className={styles.itemCard}>
                          <div className={styles.itemTop}>
                            <div>
                              <p className={styles.itemLabel}>Investor</p>
                              <h3>{investorDisplayName(game, investorId)}</h3>
                            </div>
                            <span className={styles.costPill}>{formatNumber(getOwnershipPercent(focusedCompany, investorId), 1)}%</span>
                          </div>
                          <p className={styles.itemDescription}>Saham {formatNumber(shares, 2)} · Nilai $ {formatNumber(shares * getSharePrice(focusedCompany), 1)}M.</p>
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
                          <button type="button" className={styles.secondaryButton} onClick={() => { switchCompany(focusedCompany.key); improveUpgrade(key); }} disabled={!focusedPlayerIsCeo || focusedCompany.research < cost}>
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
                          <button type="button" className={styles.secondaryButton} onClick={() => { switchCompany(focusedCompany.key); hireTeam(key); }} disabled={!focusedPlayerIsCeo || focusedCompany.cash < cost}>
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
                        <span>Payout ratio</span>
                        <strong>{formatNumber(focusedCompany.payoutRatio * 100, 1)}%</strong>
                      </div>
                      <div>
                        <span>Board mood</span>
                        <strong>{formatNumber(focusedCompany.boardMood, 2)}</strong>
                      </div>
                      <div>
                        <span>CEO sekarang</span>
                        <strong>{focusedCompany.ceoName}</strong>
                      </div>
                    </div>
                  </div>
                ) : null}
              </section>
            </div>
          </section>
        </div>
      ) : null}

      {isInvestmentMenuOpen && game && investmentPreview ? (
        <div className={styles.modalOverlay} role="presentation" onClick={() => setIsInvestmentMenuOpen(false)}>
          <section className={styles.modalCard} role="dialog" aria-modal="true" aria-label="Investasi saham" onClick={(event) => event.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <p className={styles.panelTag}>Perdagangan saham</p>
                <h2>Beli atau jual saham realtime</h2>
              </div>
              <button type="button" className={styles.closeButton} onClick={() => setIsInvestmentMenuOpen(false)} aria-label="Tutup menu investasi">
                ✕
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.quickGrid}>
                {COMPANY_KEYS.map((company) => (
                  <button key={company} type="button" className={investmentDraft.company === company ? styles.quickButtonActive : styles.quickButton} onClick={() => setInvestmentDraft((current) => ({ ...current, company }))}>
                    {game.companies[company].name}
                  </button>
                ))}
              </div>

              <div className={styles.quickGrid}>
                <button type="button" className={investmentDraft.mode === 'buy' ? styles.quickButtonActive : styles.quickButton} onClick={() => setInvestmentDraft((current) => ({ ...current, mode: 'buy' }))}>
                  Buy
                </button>
                <button type="button" className={investmentDraft.mode === 'sell' ? styles.quickButtonActive : styles.quickButton} onClick={() => setInvestmentDraft((current) => ({ ...current, mode: 'sell' }))}>
                  Sell
                </button>
                <button type="button" className={styles.quickButton} onClick={() => setInvestmentDraft((current) => ({ ...current, sliderPercent: 50 }))}>
                  Reset
                </button>
              </div>

              <div className={styles.sliderCard}>
                <div className={styles.sliderHeader}>
                  <div>
                    <p className={styles.panelTag}>Slider transaksi</p>
                    <strong>$ {formatNumber(investmentPreview.grossTradeValue, 2)}M · {formatNumber(investmentPreview.sharesMoved / game.companies[investmentDraft.company].sharesOutstanding * 100, 2)}%</strong>
                  </div>
                  <small>
                    {investmentDraft.mode === 'buy' ? 'Max buy' : 'Max sell'}: $ {formatNumber(investmentPreview.maxTradeValue, 2)}M · Live
                  </small>
                </div>
                <input className={styles.slider} type="range" min={0} max={100} step={1} value={investmentDraft.sliderPercent} onChange={(event) => setInvestmentDraft((current) => ({ ...current, sliderPercent: Number(event.target.value) }))} aria-label="Slider nilai transaksi" />
                <div className={styles.sliderLabels}>
                  {TRANSACTION_SLIDER_STOPS.map((stop) => (
                    <span key={stop.value}>{stop.label}</span>
                  ))}
                </div>
                <p className={styles.compactHint}>
                  {investmentDraft.mode === 'buy' ? 'Bayar' : 'Jual'} $ {formatNumber(Math.abs(investmentPreview.netCashDelta), 2)}M untuk {formatNumber(investmentPreview.sharesMoved, 2)} saham · sim live.
                </p>
              </div>

              <div className={styles.releasePreview}>
                <div>
                  <span>1 saham realtime</span>
                  <strong>$ {formatNumber(investmentPreview.sharePrice, 2)}</strong>
                </div>
                <div>
                  <span>Perusahaan</span>
                  <strong>{game.companies[investmentDraft.company].name}</strong>
                </div>
                <div>
                  <span>Nilai perusahaan</span>
                  <strong>$ {formatNumber(investmentPreview.valuation, 1)}M</strong>
                </div>
                <div>
                  <span>Ownership setelah transaksi</span>
                  <strong>{formatNumber(investmentPreview.futureOwnership, 2)}%</strong>
                </div>
              </div>

              <button type="button" className={styles.primaryButton} onClick={investInCompany} disabled={investmentPreview.grossTradeValue < MIN_TRADE_AMOUNT}>
                {investmentPreview.grossTradeValue < MIN_TRADE_AMOUNT
                  ? 'Nilai aktual terlalu kecil'
                  : investmentDraft.mode === 'buy'
                    ? 'Beli saham sekarang'
                    : 'Jual saham sekarang'}
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
                <input className={styles.slider} type="range" min="0" max={PRICE_PRESETS.length - 1} step="1" value={releaseDraft.priceIndex} onChange={(event) => setReleaseDraft((current) => ({ ...current, priceIndex: Number(event.target.value) }))} aria-label="Slider kategori harga CPU" />
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
