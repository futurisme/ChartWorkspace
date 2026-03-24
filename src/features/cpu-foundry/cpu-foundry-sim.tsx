'use client';

import { useEffect, useMemo, useState } from 'react';
import styles from './cpu-foundry-sim.module.css';

type UpgradeKey = 'architecture' | 'lithography' | 'clockSpeed' | 'coreDesign' | 'cacheStack' | 'powerEfficiency';
type TeamKey = 'researchers' | 'marketing' | 'fabrication';
type PanelKey = 'profile' | 'intel';
type CompanyDetailPanelKey = 'overview' | 'management' | 'operations' | 'ownership' | 'governance' | 'intel';
type CompanyKey = 'cosmic' | 'rmd' | 'heroscop';
type InvestorActionMode = 'buy' | 'sell';
type StrategyStyle = 'value' | 'growth' | 'dividend' | 'activist' | 'balanced';
type ExecutiveRole = 'coo' | 'cfo' | 'cto' | 'cmo';
type ExecutiveDomain = 'operations' | 'finance' | 'technology' | 'marketing';
type TradeRoute = 'auto' | 'company' | 'holders';

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

type BoardVoteKind = 'pengangkatan' | 'penggantian' | 'pemecatan' | 'investasi';

type BoardVoteState = {
  id: string;
  kind: BoardVoteKind;
  proposerId: string;
  subject: string;
  reason: string;
  investmentValue?: number;
  withdrawalValue?: number;
  yesWeight: number;
  noWeight: number;
  startDay: number;
  endDay: number;
};

type CompanyExecutive = {
  role: ExecutiveRole;
  title: string;
  domain: ExecutiveDomain;
  occupantId: string;
  occupantName: string;
  appointedBy: string;
  salaryPerDay: number;
  effectiveness: number;
  mandate: string;
  note: string;
  appointedDay: number;
};

type ShareListing = {
  sellerId: string;
  sharesAvailable: number;
  priceMultiplier: 2 | 3 | 4;
  openedDay: number;
  note: string;
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
  lastReleaseDay: number;
  lastReleaseCpuScore: number;
  lastReleasePriceIndex: number;
  emergencyReleaseAnchorDay: number | null;
  emergencyReleaseCount: number;
  lastEmergencyReleaseDay: number | null;
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
  executives: Record<ExecutiveRole, CompanyExecutive | null>;
  executivePayrollPerDay: number;
  executivePulse: string;
  nextManagementReviewDay: number;
  capitalStrain: number;
  shareListings: ShareListing[];
  activeBoardVote: BoardVoteState | null;
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
  intelligence: number;
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
  route: TradeRoute;
  sliderPercent: number;
};

type ShareListingDraft = {
  company: CompanyKey;
  shares: string;
  priceMultiplier: 2 | 3 | 4;
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
  feeRate: number;
  netCashDelta: number;
  sharesMoved: number;
  futureShares: number;
  futureOwnership: number;
  marketLiquidityShares: number;
  marketLiquidityValue: number;
  currentHoldingValue: number;
  futureHoldingValue: number;
  route: TradeRoute;
  routeLabel: string;
  companyCashDelta: number;
  companyValueDelta: number;
  counterpartyCount: number;
  counterpartyLabel: string;
};

type NewsCategory = 'investasi-besar' | 'release-cpu' | 'riset-baru' | 'saham-volatil' | 'arus-investor';

type CompanyAiAction = {
  type: 'upgrade' | 'team' | 'payout' | 'release';
  key: UpgradeKey | TeamKey | 'payout-up' | 'payout-down' | 'release';
  resource: 'research' | 'cash';
  cost: number;
  score: number;
  label: string;
  rationale: string;
  priceIndex?: number;
  releaseSeries?: string;
  releaseCpuName?: string;
  releasePriorityBoost?: number;
  forceImmediate?: boolean;
};

const STORAGE_KEY = 'cpu-foundry-profile-sim-v9';
const TICK_MS = 200;
const START_DATE_UTC = Date.UTC(2000, 0, 1);
const NPC_ACTION_EVERY_TICKS = 10;
const PLAYER_STARTING_CASH = 140;
const INITIAL_NPC_COUNT = 20;
const MAX_ACTIVE_NPCS = 35;
const NPC_GROWTH_START_DAY = 180;
const NPC_GROWTH_INTERVAL_DAYS = 60;
const NPC_GROWTH_BATCH = 3;
const EXECUTIVE_MIN_TENURE_DAYS = 30;
const TOTAL_SHARES = 1000;
const COMPANY_TRADE_FEE_RATE = 0.018;
const HOLDER_TRADE_FEE_RATE = 0.052;
const MIN_TRADE_AMOUNT = 0.1;
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
  profile: false,
  intel: false,
};
const DEFAULT_COMPANY_DETAIL_PANELS: Record<CompanyDetailPanelKey, boolean> = {
  overview: false,
  management: false,
  operations: false,
  ownership: false,
  governance: false,
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
const DEFAULT_SHARE_LISTING_DRAFT: ShareListingDraft = {
  company: 'cosmic',
  shares: '',
  priceMultiplier: 2,
};
const STRATEGY_LABELS: Record<StrategyStyle, string> = {
  value: 'Value',
  growth: 'Growth',
  dividend: 'Dividend',
  activist: 'Activist',
  balanced: 'Balanced',
};
const EXECUTIVE_ROLE_META: Record<ExecutiveRole, { title: string; domain: ExecutiveDomain; mandate: string; permissionLabel: string }> = {
  coo: {
    title: 'COO',
    domain: 'operations',
    mandate: 'Mengelola eksekusi operasi, kapasitas fab, dan disiplin delivery.',
    permissionLabel: 'Boleh ekspansi operasi/fabrication.',
  },
  cfo: {
    title: 'CFO',
    domain: 'finance',
    mandate: 'Menjaga kas, payout, dan struktur modal tetap sehat.',
    permissionLabel: 'Boleh atur payout dan ritme alokasi modal.',
  },
  cto: {
    title: 'CTO',
    domain: 'technology',
    mandate: 'Memimpin roadmap arsitektur, node, dan readiness product.',
    permissionLabel: 'Boleh upgrade teknologi dan release CPU.',
  },
  cmo: {
    title: 'CMO',
    domain: 'marketing',
    mandate: 'Mengatur go-to-market, brand pressure, dan momentum demand.',
    permissionLabel: 'Boleh ekspansi marketing dan dukung peluncuran.',
  },
};
const EXECUTIVE_ROLES = Object.keys(EXECUTIVE_ROLE_META) as ExecutiveRole[];
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

function formatMoneyCompact(valueInMillions: number, decimals = 2) {
  const absoluteDollars = Math.abs(valueInMillions) * 1_000_000;
  const units: Array<{ suffix: 'QA' | 'T' | 'B' | 'M' | 'K'; value: number }> = [
    { suffix: 'QA', value: 1_000_000_000_000_000 },
    { suffix: 'T', value: 1_000_000_000_000 },
    { suffix: 'B', value: 1_000_000_000 },
    { suffix: 'M', value: 1_000_000 },
    { suffix: 'K', value: 1_000 },
  ];
  const matched = units.find((unit) => absoluteDollars >= unit.value);
  if (!matched) return `${valueInMillions < 0 ? '-' : ''}${formatNumber(absoluteDollars, 0)}`;
  const normalized = absoluteDollars / matched.value;
  return `${valueInMillions < 0 ? '-' : ''}${formatNumber(normalized, decimals)}${matched.suffix}`;
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

function detectNewsCategory(entry: string): NewsCategory | null {
  const normalized = entry.toLowerCase();
  if (normalized.includes('merilis') || normalized.includes('rilis')) return 'release-cpu';
  if (normalized.includes('membeli') || normalized.includes('investasi') || normalized.includes('listing')) return 'investasi-besar';
  if (normalized.includes('research') || normalized.includes('r&d') || normalized.includes('upgrade') || normalized.includes('rp')) return 'riset-baru';
  if (normalized.includes('harga') || normalized.includes('valuasi') || normalized.includes('anjlok') || normalized.includes('naik')) return 'saham-volatil';
  if (normalized.includes('kabur') || normalized.includes('menjual') || normalized.includes('ramai') || normalized.includes('investor')) return 'arus-investor';
  return null;
}

function getNewsCategoryLabel(category: NewsCategory) {
  if (category === 'investasi-besar') return 'Investasi besar';
  if (category === 'release-cpu') return 'Release CPU baru';
  if (category === 'riset-baru') return 'Riset baru';
  if (category === 'saham-volatil') return 'Saham naik/anjlok';
  return 'Investor ramai/kabur';
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
  return 4.8 + teams.fabrication.count * 1.65 + teams.marketing.count * 1.05 + calculateCpuScore(upgrades) * 0.009 + marketShare * 0.42 + reputation * 0.11 + boardMood * 0.8;
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
  return Math.max(0.08, valuation / company.sharesOutstanding);
}

function getCompanyValuation(company: CompanyState) {
  const cpuScore = calculateCpuScore(company.upgrades);
  return Math.max(
    20,
    Math.round((
      company.cash
      + company.revenuePerDay * 6.2
      + company.marketShare * 7
      + company.reputation * 4.1
      + cpuScore * 0.082
      + company.research * 0.08
      + company.boardMood * 6
      - company.capitalStrain
    ) * 10) / 10
  );
}

function getOwnershipPercent(company: CompanyState, investorId: string) {
  const shares = company.investors[investorId] ?? 0;
  if (!company.sharesOutstanding) return 0;
  return shares / company.sharesOutstanding * 100;
}

function getCorporateInvestorId(companyKey: CompanyKey) {
  return `corp_${companyKey}`;
}

function getCompanyKeyFromCorporateInvestorId(investorId: string): CompanyKey | null {
  if (!investorId.startsWith('corp_')) return null;
  const key = investorId.replace('corp_', '') as CompanyKey;
  return COMPANY_KEYS.includes(key) ? key : null;
}

function getInvestorCash(game: GameState, investorId: string) {
  if (investorId === game.player.id) return game.player.cash;
  const corporateCompanyKey = getCompanyKeyFromCorporateInvestorId(investorId);
  if (corporateCompanyKey) return game.companies[corporateCompanyKey].cash;
  return game.npcs.find((npc) => npc.id === investorId)?.cash ?? 0;
}

function getListingAskPrice(company: CompanyState, listing: ShareListing) {
  return getSharePrice(company) * listing.priceMultiplier;
}

function getInvestorOpenListedShares(company: CompanyState, investorId: string) {
  return company.shareListings
    .filter((listing) => listing.sellerId === investorId)
    .reduce((sum, listing) => sum + listing.sharesAvailable, 0);
}

function getAvailableSharesToList(company: CompanyState, investorId: string) {
  return Math.max(0, (company.investors[investorId] ?? 0) - getInvestorOpenListedShares(company, investorId));
}

function sanitizeShareListings(company: CompanyState) {
  return company.shareListings
    .map((listing) => ({
      ...listing,
      sharesAvailable: Math.max(0, Math.min(listing.sharesAvailable, company.investors[listing.sellerId] ?? 0)),
    }))
    .filter((listing) => listing.sharesAvailable > 0.01);
}

function upsertShareListing(game: GameState, companyKey: CompanyKey, sellerId: string, sharesAvailable: number, priceMultiplier: 2 | 3 | 4, note: string) {
  const company = game.companies[companyKey];
  const nextListing: ShareListing = {
    sellerId,
    sharesAvailable: Math.max(0, Math.min(sharesAvailable, company.investors[sellerId] ?? 0)),
    priceMultiplier,
    openedDay: game.elapsedDays,
    note,
  };
  const filtered = company.shareListings.filter((listing) => listing.sellerId !== sellerId);
  return {
    ...game,
    companies: {
      ...game.companies,
      [companyKey]: {
        ...company,
        shareListings: sanitizeShareListings({
          ...company,
          shareListings: nextListing.sharesAvailable > 0.01 ? [...filtered, nextListing] : filtered,
        }),
      },
    },
  };
}

function clearShareListing(game: GameState, companyKey: CompanyKey, sellerId: string) {
  const company = game.companies[companyKey];
  return {
    ...game,
    companies: {
      ...game.companies,
      [companyKey]: {
        ...company,
        shareListings: company.shareListings.filter((listing) => listing.sellerId !== sellerId),
      },
    },
  };
}

function getVisibleShareListings(company: CompanyState, excludeBuyerId?: string) {
  return sanitizeShareListings(company)
    .filter((listing) => listing.sellerId !== excludeBuyerId)
    .sort((left, right) => {
      if (left.priceMultiplier !== right.priceMultiplier) return left.priceMultiplier - right.priceMultiplier;
      return left.openedDay - right.openedDay;
    });
}

function allocateHolderBuyFromListings(company: CompanyState, listings: ShareListing[], requestedGrossValue: number) {
  let remainingValue = Math.max(0, requestedGrossValue);
  let grossTradeValue = 0;
  let sharesMoved = 0;
  const fills: Array<{ sellerId: string; shares: number; value: number; priceMultiplier: 2 | 3 | 4 }> = [];

  listings.forEach((listing) => {
    if (remainingValue <= 0.0001) return;
    const askPrice = getListingAskPrice(company, listing);
    const maxListingValue = listing.sharesAvailable * askPrice;
    const valueTaken = Math.min(maxListingValue, remainingValue);
    if (valueTaken <= 0.0001) return;
    const sharesTaken = valueTaken / askPrice;
    remainingValue -= valueTaken;
    grossTradeValue += valueTaken;
    sharesMoved += sharesTaken;
    fills.push({
      sellerId: listing.sellerId,
      shares: sharesTaken,
      value: valueTaken,
      priceMultiplier: listing.priceMultiplier,
    });
  });

  return {
    grossTradeValue,
    sharesMoved,
    fills,
    counterpartyCount: fills.length,
  };
}

function getRequestedTradeValue(maxTradeValue: number, sliderPercent: number) {
  return maxTradeValue * clamp(sliderPercent, 0, 100) / 100;
}

function getTradeRouteLabel(route: TradeRoute) {
  if (route === 'company') return 'Treasury / perusahaan';
  if (route === 'holders') return 'Sesama pemegang saham';
  return 'Auto';
}

function getTradeFeeRate(route: TradeRoute) {
  return route === 'holders' ? HOLDER_TRADE_FEE_RATE : COMPANY_TRADE_FEE_RATE;
}

function getInvestorLiquidityReserve(game: GameState, investorId: string) {
  if (investorId === game.player.id) return 18;
  const npc = getNpcById(game, investorId);
  if (!npc) return Infinity;
  return 10 + npc.cash * npc.reserveRatio;
}

function getBuyerDemandBudget(game: GameState, company: CompanyState, buyerId: string) {
  const cash = getInvestorCash(game, buyerId);
  if (cash <= 0.01) return 0;
  const npc = getNpcById(game, buyerId);
  const reserve = getInvestorLiquidityReserve(game, buyerId);
  const disposable = Math.max(0, cash - reserve);
  if (disposable <= 0) return 0;
  const strategicBias =
    buyerId === game.player.id
      ? 0.55
      : npc
        ? clamp(0.24 + npc.intelligence * 0.25 + npc.boldness * 0.2 + (npc.focusCompany === company.key ? 0.16 : 0), 0.18, 0.92)
        : 0;
  return disposable * strategicBias;
}

function getHolderRouteCapacity(game: GameState, company: CompanyState, investorId: string, mode: InvestorActionMode) {
  if (mode === 'buy') {
    const listings = getVisibleShareListings(company, investorId);
    return {
      maxTradeValue: listings.reduce((sum, listing) => sum + listing.sharesAvailable * getListingAskPrice(company, listing), 0),
      counterpartyCount: listings.length,
      counterpartyLabel: listings.length > 0 ? 'Membeli dari listing holder yang sedang dibuka, dimulai dari harga termudah.' : 'Belum ada holder yang membuka saham untuk dijual.',
    };
  }

  const buyers = Object.keys(company.investors)
    .filter((holderId) => holderId !== investorId)
    .map((holderId) => getBuyerDemandBudget(game, company, holderId));
  return {
    maxTradeValue: buyers.reduce((sum, budget) => sum + budget, 0),
    counterpartyCount: buyers.filter((budget) => budget >= MIN_TRADE_AMOUNT).length,
    counterpartyLabel: buyers.some((budget) => budget >= MIN_TRADE_AMOUNT) ? 'Likuiditas datang dari holder lain yang punya kas dan keyakinan.' : 'Belum ada holder lain yang siap menyerap penjualan ini.',
  };
}

function chooseAutoTradeRoute(game: GameState, company: CompanyState, investorId: string, mode: InvestorActionMode, investorCash: number, currentShares: number) {
  const sharePrice = getSharePrice(company);
  if (mode === 'buy') {
    const companyLimit = Math.max(0, Math.min(company.marketPoolShares * sharePrice, investorCash / (1 + COMPANY_TRADE_FEE_RATE)));
    return companyLimit >= MIN_TRADE_AMOUNT ? 'company' : 'holders';
  }
  const companyLimit = Math.max(0, currentShares * sharePrice);
  const holderCapacity = getHolderRouteCapacity(game, company, investorId, mode).maxTradeValue;
  const companyBuybackPenalty = mode === 'sell' ? clamp((sharePrice * currentShares - company.cash) / Math.max(1, sharePrice * currentShares), 0, 1) : 0;
  const companyScore = companyLimit > 0 ? companyLimit * 0.9 - COMPANY_TRADE_FEE_RATE * 100 - companyBuybackPenalty * 24 : -Infinity;
  const holderScore = holderCapacity > 0
    ? holderCapacity * 0.82 - HOLDER_TRADE_FEE_RATE * 100 + (mode === 'sell' && company.cash < sharePrice * currentShares * 0.55 ? 8 : 0)
    : -Infinity;
  return holderScore > companyScore ? 'holders' : 'company';
}

function getMaxTradeValue(game: GameState, company: CompanyState, investorId: string, investorCash: number, currentShares: number, mode: InvestorActionMode, route: TradeRoute) {
  if (route === 'auto' && mode === 'buy') {
    const companyCapacity = Math.max(0, Math.min(company.marketPoolShares * getSharePrice(company), investorCash / (1 + COMPANY_TRADE_FEE_RATE)));
    const remainingCash = Math.max(0, investorCash - companyCapacity * (1 + COMPANY_TRADE_FEE_RATE));
    const holderCapacity = getHolderRouteCapacity(game, company, investorId, mode).maxTradeValue;
    return companyCapacity + Math.max(0, Math.min(holderCapacity, remainingCash / (1 + HOLDER_TRADE_FEE_RATE)));
  }
  const resolvedRoute = route === 'auto' ? chooseAutoTradeRoute(game, company, investorId, mode, investorCash, currentShares) : route;
  if (resolvedRoute === 'holders') {
    const holderCapacity = getHolderRouteCapacity(game, company, investorId, mode).maxTradeValue;
    return mode === 'buy'
      ? Math.max(0, Math.min(holderCapacity, investorCash / (1 + HOLDER_TRADE_FEE_RATE)))
      : Math.max(0, Math.min(currentShares * getSharePrice(company), holderCapacity));
  }
  return mode === 'buy'
    ? Math.max(0, Math.min(company.marketPoolShares * getSharePrice(company), investorCash / (1 + COMPANY_TRADE_FEE_RATE)))
    : Math.max(0, currentShares * getSharePrice(company));
}

function getTradePreview(
  game: GameState,
  company: CompanyState,
  investorId: string,
  investorCash: number,
  currentShares: number,
  mode: InvestorActionMode,
  requestedValue: number,
  route: TradeRoute
): TradePreview {
  if (route === 'auto' && mode === 'buy') {
    const valuation = getCompanyValuation(company);
    const sharePrice = getSharePrice(company);
    const marketCap = sharePrice * company.sharesOutstanding;
    const normalizedRequestedValue = Math.max(0, requestedValue);
    const companyCapacity = Math.max(0, Math.min(company.marketPoolShares * sharePrice, investorCash / (1 + COMPANY_TRADE_FEE_RATE)));
    const companyGrossValue = Math.min(normalizedRequestedValue, companyCapacity);
    const companyShares = sharePrice > 0 ? companyGrossValue / sharePrice : 0;
    const companyFeeValue = companyGrossValue * COMPANY_TRADE_FEE_RATE;
    const remainingCash = Math.max(0, investorCash - companyGrossValue - companyFeeValue);
    const remainingRequestedValue = Math.max(0, normalizedRequestedValue - companyGrossValue);
    const holderListings = getVisibleShareListings(company, investorId);
    const holderCapacity = getHolderRouteCapacity(game, company, investorId, 'buy').maxTradeValue;
    const holderBudget = Math.max(0, Math.min(holderCapacity, remainingRequestedValue, remainingCash / (1 + HOLDER_TRADE_FEE_RATE)));
    const holderAllocation = allocateHolderBuyFromListings(company, holderListings, holderBudget);
    const holderFeeValue = holderAllocation.grossTradeValue * HOLDER_TRADE_FEE_RATE;
    const grossTradeValue = companyGrossValue + holderAllocation.grossTradeValue;
    const feeValue = companyFeeValue + holderFeeValue;
    const sharesMoved = companyShares + holderAllocation.sharesMoved;
    const futureShares = currentShares + sharesMoved;
    const futureOwnership = company.sharesOutstanding > 0 ? futureShares / company.sharesOutstanding * 100 : 0;
    const currentHoldingValue = currentShares * sharePrice;
    const futureHoldingValue = futureShares * sharePrice;
    return {
      valuation,
      sharePrice,
      marketCap,
      currentShares,
      requestedValue: normalizedRequestedValue,
      maxTradeValue: getMaxTradeValue(game, company, investorId, investorCash, currentShares, mode, route),
      grossTradeValue,
      feeValue,
      feeRate: grossTradeValue > 0 ? feeValue / grossTradeValue : 0,
      netCashDelta: -(grossTradeValue + feeValue),
      sharesMoved,
      futureShares,
      futureOwnership,
      marketLiquidityShares: company.marketPoolShares,
      marketLiquidityValue: company.marketPoolShares * sharePrice,
      currentHoldingValue,
      futureHoldingValue,
      route: 'auto',
      routeLabel: holderAllocation.grossTradeValue > 0 ? 'Auto (perusahaan → holder)' : 'Auto (perusahaan)',
      companyCashDelta: companyGrossValue,
      companyValueDelta: companyGrossValue,
      counterpartyCount: holderAllocation.counterpartyCount + (companyGrossValue > 0 ? 1 : 0),
      counterpartyLabel: holderAllocation.counterpartyCount > 0
        ? `Treasury dipakai lebih dulu, sisanya menyapu ${holderAllocation.counterpartyCount} listing holder termurah.`
        : 'Treasury perusahaan dipakai lebih dulu; belum perlu sentuh listing holder.',
    };
  }

  const resolvedRoute = route === 'auto' ? chooseAutoTradeRoute(game, company, investorId, mode, investorCash, currentShares) : route;
  const valuation = getCompanyValuation(company);
  const sharePrice = getSharePrice(company);
  const marketCap = sharePrice * company.sharesOutstanding;
  const normalizedRequestedValue = Math.max(0, requestedValue);
  const routeCapacity = resolvedRoute === 'holders'
    ? getHolderRouteCapacity(game, company, investorId, mode)
    : {
        maxTradeValue: mode === 'buy' ? company.marketPoolShares * sharePrice : currentShares * sharePrice,
        counterpartyCount: 1,
        counterpartyLabel: mode === 'buy'
          ? 'Transaksi menambah kas perusahaan lewat treasury stock.'
          : 'Transaksi buyback mengurangi kas perusahaan terlebih dahulu.',
      };
  const feeRate = getTradeFeeRate(resolvedRoute);
  const maxTradeValue = mode === 'buy'
    ? Math.max(0, Math.min(routeCapacity.maxTradeValue, investorCash / (1 + feeRate)))
    : Math.max(0, Math.min(currentShares * sharePrice, routeCapacity.maxTradeValue));
  const grossTradeValue = Math.min(normalizedRequestedValue, maxTradeValue);
  const sharesMoved = resolvedRoute === 'holders' && mode === 'buy'
    ? allocateHolderBuyFromListings(company, getVisibleShareListings(company, investorId), grossTradeValue).sharesMoved
    : sharePrice > 0 ? grossTradeValue / sharePrice : 0;
  const feeValue = grossTradeValue * feeRate;
  const netCashDelta = mode === 'buy' ? -(grossTradeValue + feeValue) : grossTradeValue - feeValue;
  const futureShares = mode === 'buy' ? currentShares + sharesMoved : Math.max(0, currentShares - sharesMoved);
  const futureOwnership = company.sharesOutstanding > 0 ? futureShares / company.sharesOutstanding * 100 : 0;
  const currentHoldingValue = currentShares * sharePrice;
  const futureHoldingValue = futureShares * sharePrice;
  const companyCashDelta = resolvedRoute === 'company'
    ? mode === 'buy'
      ? grossTradeValue
      : -Math.min(company.cash, grossTradeValue)
    : 0;
  const companyValueDelta = resolvedRoute === 'company'
    ? mode === 'buy'
      ? grossTradeValue
      : -grossTradeValue
    : 0;

  return {
    valuation,
    sharePrice,
    marketCap,
    currentShares,
    requestedValue: normalizedRequestedValue,
    maxTradeValue,
    grossTradeValue,
    feeValue,
    feeRate,
    netCashDelta,
    sharesMoved,
    futureShares,
    futureOwnership,
    marketLiquidityShares: company.marketPoolShares,
    marketLiquidityValue: company.marketPoolShares * sharePrice,
    currentHoldingValue,
    futureHoldingValue,
    route: resolvedRoute,
    routeLabel: getTradeRouteLabel(resolvedRoute),
    companyCashDelta,
    companyValueDelta,
    counterpartyCount: routeCapacity.counterpartyCount,
    counterpartyLabel: routeCapacity.counterpartyLabel,
  };
}

function addFeedEntry(feed: string[], message: string) {
  return [message, ...feed].slice(0, 12);
}

function investorDisplayName(game: GameState, investorId: string) {
  if (investorId === game.player.id) return game.player.name;
  const corporateCompanyKey = getCompanyKeyFromCorporateInvestorId(investorId);
  if (corporateCompanyKey) return `${game.companies[corporateCompanyKey].name}*`;
  const npc = game.npcs.find((entry) => entry.id === investorId);
  if (npc) return npc.name;
  if (investorId.startsWith('founder_')) {
    const companyKey = investorId.replace('founder_', '') as CompanyKey;
    return game.companies[companyKey]?.founder ?? investorId;
  }
  if (investorId.startsWith('institution_')) return investorId.replace('institution_', '').replace(/_/g, ' ');
  return investorId;
}

function getNpcById(game: GameState, investorId: string) {
  return game.npcs.find((npc) => npc.id === investorId) ?? null;
}

function getExecutiveAiActor(game: GameState, company: CompanyState, investorId: string): NpcInvestor {
  const existingNpc = getNpcById(game, investorId);
  if (existingNpc) return existingNpc;
  const isFounder = investorId.startsWith('founder_');
  const founderStrategy: StrategyStyle = company.marketShare > 20 ? 'balanced' : company.cash < 24 ? 'growth' : 'value';
  return {
    id: investorId,
    name: investorDisplayName(game, investorId),
    persona: isFounder ? 'Founder operator AI fallback' : 'Executive fallback AI',
    strategy: investorId === game.player.id ? 'balanced' : founderStrategy,
    cash: getInvestorCash(game, investorId),
    focusCompany: company.key,
    boldness: isFounder ? 0.7 : 0.62,
    patience: isFounder ? 0.74 : 0.68,
    horizonDays: isFounder ? 420 : 320,
    reserveRatio: 0.24,
    intelligence: isFounder ? 0.84 : 0.8,
    analysisNote: `${investorDisplayName(game, investorId)} menjalankan fallback AI management untuk menjaga kesinambungan aksi.`,
    active: true,
  };
}

function isHumanExecutiveCandidateId(investorId: string) {
  return investorId.startsWith('npc_') || investorId.startsWith('player-') || investorId.startsWith('founder_');
}

function getExecutiveCandidatePool(game: GameState, company: CompanyState, ceoId: string) {
  const rankedInvestors = Object.entries(company.investors)
    .filter(([investorId, shares]) => shares > 0.01 && isHumanExecutiveCandidateId(investorId) && investorId !== ceoId)
    .sort(([, left], [, right]) => right - left)
    .map(([investorId]) => investorId);
  const externalNpcTalent = game.npcs
    .filter((npc) => npc.id !== ceoId && !rankedInvestors.includes(npc.id))
    .filter((npc) => npc.focusCompany === company.key || npc.intelligence > 0.86)
    .sort((left, right) => {
      const leftScore = left.intelligence * 1.3 + left.patience * 0.4 + left.boldness * 0.2;
      const rightScore = right.intelligence * 1.3 + right.patience * 0.4 + right.boldness * 0.2;
      return rightScore - leftScore;
    })
    .slice(0, 4)
    .map((npc) => npc.id);
  const playerCandidate = company.investors[game.player.id] ?? 0;
  const merged = Array.from(
    new Set([
      ...(playerCandidate > 0.01 && game.player.id !== ceoId ? [game.player.id] : []),
      ...rankedInvestors,
      ...externalNpcTalent,
    ])
  );
  return merged.slice(0, 6);
}

function getManagementCadenceDays(company: CompanyState, ceoNpc: NpcInvestor) {
  const stress = getCompanyStressLevel(company);
  const resourceContext = getManagementResourceContext(company);
  return clamp(
    Math.round(10 - ceoNpc.intelligence * 3.4 - ceoNpc.boldness * 1.6 - stress * 2.8 - resourceContext.managementIntensity * 2.6 + ceoNpc.patience * 1.1),
    2,
    10
  );
}

function getExecutiveCandidateScore(game: GameState, company: CompanyState, candidateId: string, role: ExecutiveRole) {
  const ownership = getOwnershipPercent(company, candidateId);
  const npc = getNpcById(game, candidateId);
  const isFounder = candidateId === company.founderInvestorId;
  const isPlayer = candidateId === game.player.id;
  const intelligence = npc?.intelligence ?? (isPlayer ? 0.84 : isFounder ? 0.78 : 0.7);
  const patience = npc?.patience ?? 0.7;
  const boldness = npc?.boldness ?? 0.62;
  const alignment = npc?.focusCompany === company.key ? 0.1 : 0;
  const strategyFit =
    role === 'cfo'
      ? patience * 0.8 + (npc?.strategy === 'dividend' || npc?.strategy === 'value' ? 0.16 : 0)
      : role === 'cto'
        ? intelligence * 0.85 + (isFounder ? 0.18 : 0)
        : role === 'coo'
          ? patience * 0.42 + boldness * 0.28 + (isFounder ? 0.12 : 0)
          : boldness * 0.55 + (npc?.strategy === 'growth' ? 0.18 : 0);

  return ownership * 0.07 + intelligence * 1.2 + strategyFit + alignment;
}

function calculateExecutiveNeed(role: ExecutiveRole, company: CompanyState) {
  const stress = getCompanyStressLevel(company);
  const management = getManagementResourceContext(company);
  const researchGap = clamp((16 - company.researchPerDay) / 16, 0, 1);
  const marketGap = clamp((24 - company.marketShare) / 24, 0, 1);
  const reputationGap = clamp((48 - company.reputation) / 48, 0, 1);
  const cashStress = clamp((management.cashReserveTarget - company.cash) / Math.max(1, management.cashReserveTarget), 0, 1);
  const fabGap = clamp((4 - company.teams.fabrication.count) / 4, 0, 1);
  const marketingGap = clamp((4 - company.teams.marketing.count) / 4, 0, 1);

  if (role === 'cto') return clamp(0.2 + researchGap * 0.7 + stress * 0.2 + management.researchOverflow * 0.14 + (company.releaseCount < 4 ? 0.08 : 0), 0, 1.4);
  if (role === 'coo') return clamp(0.16 + fabGap * 0.58 + stress * 0.36 + company.marketShare / 160 + management.cashOverflow * 0.12, 0, 1.4);
  if (role === 'cfo') return clamp(0.14 + cashStress * 0.74 + stress * 0.28 + company.payoutRatio + management.cashOverflow * 0.18, 0, 1.4);
  return clamp(0.14 + marketGap * 0.56 + reputationGap * 0.34 + marketingGap * 0.38 + management.cashOverflow * 0.08, 0, 1.4);
}

function createExecutiveRecord(
  game: GameState,
  company: CompanyState,
  role: ExecutiveRole,
  occupantId: string,
  appointedBy: string,
  note: string,
  appointedDay: number = game.elapsedDays
): CompanyExecutive {
  const meta = EXECUTIVE_ROLE_META[role];
  const baseScore = getExecutiveCandidateScore(game, company, occupantId, role);
  const effectiveness = clamp(0.62 + baseScore * 0.16, 0.65, 1.35);
  const salaryPerDay = Math.max(0.25, getCompanyValuation(company) * 0.00022 * effectiveness + getOwnershipPercent(company, occupantId) * 0.006);
  return {
    role,
    title: meta.title,
    domain: meta.domain,
    occupantId,
    occupantName: investorDisplayName(game, occupantId),
    appointedBy,
    salaryPerDay,
    effectiveness,
    mandate: meta.mandate,
    note,
    appointedDay,
  };
}

function createEmptyExecutiveMap(): Record<ExecutiveRole, CompanyExecutive | null> {
  return {
    coo: null,
    cfo: null,
    cto: null,
    cmo: null,
  };
}

function sanitizeExecutiveAssignments(game: GameState, company: CompanyState, ceoId: string) {
  const assignments = createEmptyExecutiveMap();
  EXECUTIVE_ROLES.forEach((role) => {
    const current = company.executives?.[role];
    if (!current || !isHumanExecutiveCandidateId(current.occupantId) || current.occupantId === ceoId) return;
    assignments[role] = createExecutiveRecord(
      game,
      company,
      role,
      current.occupantId,
      current.appointedBy || ceoId,
      current.note || `${EXECUTIVE_ROLE_META[role].title} menjaga ${company.name} tetap disiplin.`,
      current.appointedDay ?? game.elapsedDays
    );
  });
  return assignments;
}

function planNpcExecutiveAssignments(game: GameState, company: CompanyState, ceoId: string, boardMembers: BoardMember[]) {
  const ceoNpc = getExecutiveAiActor(game, company, ceoId);

  const intelligence = ceoNpc.intelligence;
  const threshold = 0.34 + (1 - intelligence) * 0.12;
  const pool = getExecutiveCandidatePool(game, company, ceoId);
  const used = new Set<string>();
  const executives = sanitizeExecutiveAssignments(game, company, ceoId);
  EXECUTIVE_ROLES.forEach((role) => {
    if (executives[role]) {
      used.add(executives[role]!.occupantId);
    }
  });
  const chosenRoles: ExecutiveRole[] = [];
  let latestBoardVote: BoardVoteState | null = null;
  const rankedNeeds = EXECUTIVE_ROLES
    .map((role) => ({ role, need: calculateExecutiveNeed(role, company) }))
    .sort((left, right) => right.need - left.need);
  const mustFillRoles = rankedNeeds
    .filter((entry) => entry.need > 0.56 && !executives[entry.role])
    .slice(0, 2)
    .map((entry) => entry.role);

  EXECUTIVE_ROLES.forEach((role) => {
    const need = calculateExecutiveNeed(role, company);
    if (need < threshold && !mustFillRoles.includes(role)) return;
    const currentOccupantId = company.executives?.[role]?.occupantId;
    const currentExecutive = company.executives?.[role] ?? null;
    if (currentExecutive && isExecutiveTenureLocked(currentExecutive, game.elapsedDays) && currentExecutive.effectiveness >= 0.82) {
      return;
    }
    const candidate = pool
      .filter((candidateId) => !used.has(candidateId))
      .map((candidateId) => ({
        candidateId,
        score: getExecutiveCandidateScore(game, company, candidateId, role) + need * 0.8 + (candidateId === currentOccupantId ? 0.24 : 0),
      }))
      .sort((left, right) => right.score - left.score)[0];

    if (!candidate || candidate.score < (mustFillRoles.includes(role) ? 1.05 : 1.2)) return;
    const decisionType: 'appoint' | 'replace' = currentExecutive ? 'replace' : 'appoint';
    const decision = boardApproveExecutiveDecision(game, company, boardMembers, role, { type: decisionType, candidateId: candidate.candidateId });
    const proposerId = getBoardProposalActorId(game, company, { preferredRole: role, domain: EXECUTIVE_ROLE_META[role].domain });
    latestBoardVote = {
      id: `${company.key}-${role}-${game.elapsedDays}`,
      kind: decisionType === 'appoint' ? 'pengangkatan' : 'penggantian',
      proposerId,
      subject: `${EXECUTIVE_ROLE_META[role].title} → ${investorDisplayName(game, candidate.candidateId)}`,
      reason: `${investorDisplayName(game, proposerId)} mengusulkan penyesuaian ${EXECUTIVE_ROLE_META[role].title} untuk kebutuhan ${EXECUTIVE_ROLE_META[role].domain}.`,
      yesWeight: decision.yesWeight,
      noWeight: decision.noWeight,
      startDay: game.elapsedDays,
      endDay: game.elapsedDays + 7,
    };
    if (!decision.approved) {
      return;
    }
    used.add(candidate.candidateId);
    chosenRoles.push(role);
    executives[role] = createExecutiveRecord(
      game,
      company,
      role,
      candidate.candidateId,
      ceoId,
      `${ceoNpc.name} menunjuk ${investorDisplayName(game, candidate.candidateId)} sebagai ${EXECUTIVE_ROLE_META[role].title} melalui persetujuan dewan karena kebutuhan ${EXECUTIVE_ROLE_META[role].domain}.`,
      game.elapsedDays
    );
  });

  const executivePayrollPerDay = EXECUTIVE_ROLES.reduce((sum, role) => sum + (executives[role]?.salaryPerDay ?? 0), 0);
  const executivePulse = chosenRoles.length === 0
    ? `${ceoNpc.name} menilai ${company.name} belum membutuhkan eksekutif tambahan saat ini.`
    : `${ceoNpc.name} merancang struktur ${chosenRoles.map((role) => EXECUTIVE_ROLE_META[role].title).join(', ')} untuk menjaga ${company.name} tetap lincah.`;

  return {
    executives,
    executivePayrollPerDay,
    executivePulse,
    activeBoardVote: latestBoardVote,
  };
}

function getExecutiveCoverage(company: CompanyState, role: ExecutiveRole) {
  return company.executives[role]?.effectiveness ?? 0;
}

function getExecutiveRolesForInvestor(company: CompanyState, investorId: string) {
  return EXECUTIVE_ROLES.filter((role) => company.executives[role]?.occupantId === investorId);
}


function getBoardProposalActorId(
  game: GameState,
  company: CompanyState,
  opts?: { preferredRole?: ExecutiveRole; domain?: ExecutiveDomain }
) {
  const preferredRole = opts?.preferredRole;
  if (preferredRole) {
    const preferredOccupantId = company.executives[preferredRole]?.occupantId;
    if (preferredOccupantId && isHumanExecutiveCandidateId(preferredOccupantId)) return preferredOccupantId;
  }
  const domain = opts?.domain;
  if (domain) {
    const domainRole = EXECUTIVE_ROLES.find((role) => EXECUTIVE_ROLE_META[role].domain === domain);
    const domainOccupantId = domainRole ? company.executives[domainRole]?.occupantId : null;
    if (domainOccupantId && isHumanExecutiveCandidateId(domainOccupantId)) return domainOccupantId;
  }
  if (isHumanExecutiveCandidateId(company.ceoId)) return company.ceoId;
  const boardNpc = company.boardMembers.find((member) => member.id !== company.ceoId && game.npcs.some((npc) => npc.id === member.id));
  return boardNpc?.id ?? company.ceoId;
}

function hasCompanyAuthority(company: CompanyState, investorId: string, domain: ExecutiveDomain | 'release') {
  if (company.ceoId === investorId) return true;
  const roles = getExecutiveRolesForInvestor(company, investorId);
  if (domain === 'release') return roles.includes('cto') || roles.includes('cmo');
  return roles.some((role) => EXECUTIVE_ROLE_META[role].domain === domain);
}

function getBoardExecutiveSignals(company: CompanyState) {
  const missingRoles = EXECUTIVE_ROLES.filter((role) => !company.executives[role] && calculateExecutiveNeed(role, company) > 0.62);
  const underPressureRoles = EXECUTIVE_ROLES.filter((role) => company.executives[role] && company.executives[role]!.effectiveness < 0.84);
  return { missingRoles, underPressureRoles };
}

function isExecutiveTenureLocked(executive: CompanyExecutive | null, currentDay: number) {
  if (!executive) return false;
  return currentDay - (executive.appointedDay ?? currentDay) < EXECUTIVE_MIN_TENURE_DAYS;
}

function boardApproveExecutiveDecision(
  game: GameState,
  company: CompanyState,
  boardMembers: BoardMember[],
  role: ExecutiveRole,
  proposal: { type: 'appoint' | 'replace' | 'dismiss'; candidateId?: string }
) {
  const currentExecutive = company.executives[role];
  const totalWeight = boardMembers.reduce((sum, member) => sum + member.voteWeight, 0) || 1;
  const supportWeight = boardMembers.reduce((sum, member) => {
    const seatBias = member.seatType === 'independent' ? 0.08 : member.seatType === 'employee' ? 0.03 : 0;
    const need = calculateExecutiveNeed(role, company);
    const candidateScore = proposal.candidateId ? getExecutiveCandidateScore(game, company, proposal.candidateId, role) : 0;
    const continuityPenalty = proposal.type === 'dismiss' || proposal.type === 'replace'
      ? Math.max(0, EXECUTIVE_MIN_TENURE_DAYS - (game.elapsedDays - (currentExecutive?.appointedDay ?? game.elapsedDays))) / EXECUTIVE_MIN_TENURE_DAYS
      : 0;
    const voteSignal = need * 0.9 + candidateScore * 0.55 + seatBias - continuityPenalty * 0.85;
    return voteSignal >= 0.72 ? sum + member.voteWeight : sum;
  }, 0);
  return {
    approved: supportWeight / totalWeight >= 0.5,
    yesWeight: supportWeight,
    noWeight: Math.max(0, totalWeight - supportWeight),
  };
}

function boardApproveCompanyInvestment(sourceCompany: CompanyState, targetCompany: CompanyState, amount: number) {
  const totalWeight = sourceCompany.boardMembers.reduce((sum, member) => sum + member.voteWeight, 0) || 1;
  const supportWeight = sourceCompany.boardMembers.reduce((sum, member) => {
    const targetQuality = targetCompany.marketShare * 0.015 + targetCompany.reputation * 0.012 + calculateCpuScore(targetCompany.upgrades) * 0.00018;
    const sourceSafety = clamp((sourceCompany.cash - amount) / Math.max(1, sourceCompany.cash), 0, 1);
    const seatBias = member.seatType === 'independent' ? 0.1 : member.seatType === 'employee' ? -0.04 : 0.02;
    const voteSignal = targetQuality + sourceSafety * 0.72 + seatBias;
    return voteSignal >= 0.62 ? sum + member.voteWeight : sum;
  }, 0);
  return {
    approved: supportWeight / totalWeight >= 0.5,
    yesWeight: supportWeight,
    noWeight: Math.max(0, totalWeight - supportWeight),
  };
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
      cash: randomInt(random, 55, 190),
      focusCompany,
      boldness: Math.round(randomBetween(random, 0.48, 0.95) * 100) / 100,
      patience: Math.round(randomBetween(random, 0.4, 0.92) * 100) / 100,
      intelligence: Math.round(randomBetween(random, 0.68, 0.99) * 100) / 100,
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
      lastReleaseDay: 0,
      lastReleaseCpuScore: calculateCpuScore(config.upgrades),
      lastReleasePriceIndex: 1,
      emergencyReleaseAnchorDay: null,
      emergencyReleaseCount: 0,
      lastEmergencyReleaseDay: null,
      upgrades: config.upgrades,
      teams: config.teams,
      investors: {
        [founderInvestorId]: 940,
      },
      sharesOutstanding: TOTAL_SHARES,
      marketPoolShares: 60,
      dividendPerShare: 0.01,
      payoutRatio: 0.1,
      ceoSalaryPerDay: 2.4,
      boardMood,
      boardMembers: [],
      executives: createEmptyExecutiveMap(),
      executivePayrollPerDay: 0,
      executivePulse: 'Belum ada jabatan eksekutif tambahan.',
      nextManagementReviewDay: 3,
      capitalStrain: 0,
      shareListings: [],
      activeBoardVote: null,
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
  const cashStress = clamp((110 - company.cash) / 110, 0, 1);
  const boardStress = clamp((0.62 - company.boardMood) / 0.62, 0, 1);
  const strainStress = clamp(company.capitalStrain / Math.max(40, getCompanyValuation(company)), 0, 1);
  return marketStress * 0.28 + reputationStress * 0.22 + cashStress * 0.2 + boardStress * 0.15 + strainStress * 0.15;
}

function getBoardMemberOptions(member: BoardMember, company: CompanyState) {
  const options: string[] = [];
  const stress = getCompanyStressLevel(company);
  const executiveSignals = getBoardExecutiveSignals(company);

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
  if (company.cash < 95) options.unshift('Tekan efisiensi biaya');
  if (company.researchPerDay < 11) options.push('Tambah budget riset');
  if (company.marketShare < 15) options.push('Percepat strategi distribusi');
  if (company.payoutRatio > 0.26) options.push('Turunkan payout sementara');
  if (executiveSignals.missingRoles.length > 0) {
    options.unshift(`Usul angkat ${EXECUTIVE_ROLE_META[executiveSignals.missingRoles[0]].title}`);
  }
  if (executiveSignals.underPressureRoles.length > 0) {
    options.push(`Tinjau kinerja ${EXECUTIVE_ROLE_META[executiveSignals.underPressureRoles[0]].title}`);
  }

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
          id: investorId,
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
      const sanitizedExecutives = sanitizeExecutiveAssignments(game, company, ceoId);
      const ceoNpc = ceoId === game.player.id ? null : getExecutiveAiActor(game, company, ceoId);
      const executivePlan = ceoId !== game.player.id
        ? planNpcExecutiveAssignments(game, company, ceoId, boardMembers)
        : {
            executives: sanitizedExecutives,
            executivePayrollPerDay: EXECUTIVE_ROLES.reduce((sum, role) => sum + (sanitizedExecutives[role]?.salaryPerDay ?? 0), 0),
            executivePulse: company.executivePulse || `${investorDisplayName(game, ceoId)} menjaga struktur eksekutif secara manual.`,
            activeBoardVote: null as BoardVoteState | null,
          };
      const ongoingBoardVote = company.activeBoardVote && game.elapsedDays <= company.activeBoardVote.endDay ? company.activeBoardVote : null;
      const activeBoardVote = executivePlan.activeBoardVote ?? ongoingBoardVote;
      const executiveCoverage =
        getExecutiveCoverage({ ...company, executives: executivePlan.executives }, 'coo')
        + getExecutiveCoverage({ ...company, executives: executivePlan.executives }, 'cfo')
        + getExecutiveCoverage({ ...company, executives: executivePlan.executives }, 'cto')
        + getExecutiveCoverage({ ...company, executives: executivePlan.executives }, 'cmo');
      const boardMood = clamp(
        0.35 + company.cash / 2200 + company.marketShare / 120 + company.reputation / 160 + (ceoId === company.ceoId ? 0.06 : -0.04) + executiveCoverage * 0.028,
        0.3,
        1.5
      );
      const baseRevenuePerDay = calculateRevenuePerDay(company.teams, company.upgrades, company.marketShare, company.reputation, boardMood);
      const baseResearchPerDay = calculateResearchPerDay(company.teams, company.upgrades);
      const revenuePerDay = baseRevenuePerDay * (
        1
        + getExecutiveCoverage({ ...company, executives: executivePlan.executives }, 'coo') * 0.04
        + getExecutiveCoverage({ ...company, executives: executivePlan.executives }, 'cfo') * 0.015
        + getExecutiveCoverage({ ...company, executives: executivePlan.executives }, 'cmo') * 0.035
      );
      const researchPerDay = baseResearchPerDay * (
        1
        + getExecutiveCoverage({ ...company, executives: executivePlan.executives }, 'cto') * 0.07
        + getExecutiveCoverage({ ...company, executives: executivePlan.executives }, 'coo') * 0.018
      );
      const valuation = Math.max(20, getCompanyValuation({ ...company, boardMood, revenuePerDay, researchPerDay }));
      const cfoCoverage = getExecutiveCoverage({ ...company, executives: executivePlan.executives }, 'cfo');
      const management = getManagementResourceContext({ ...company, boardMood, revenuePerDay, researchPerDay });
      const targetPayoutRatio = 0.08 + company.cash / 6000 + company.marketShare / 280 + company.reputation / 520;
      const payoutRatio = clamp(
        (company.payoutRatio || targetPayoutRatio) * 0.7 + targetPayoutRatio * 0.3 - clamp((management.cashReserveTarget - company.cash) / Math.max(1, management.cashReserveTarget), 0, 1) * cfoCoverage * 0.06,
        0.08,
        0.34
      );
      const dividendPerShare = Math.max(0.01, ((revenuePerDay * 0.42) * payoutRatio) / company.sharesOutstanding);
      const ceoSalaryPerDay = Math.max(0.6, valuation * 0.0009 + revenuePerDay * 0.022 + getOwnershipPercent(company, ceoId) * 0.04);
      const resetEmergencyRelease = company.cash > 10;

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
          executives: executivePlan.executives,
          executivePayrollPerDay: executivePlan.executivePayrollPerDay,
          executivePulse: executivePlan.executivePulse,
          nextManagementReviewDay: company.nextManagementReviewDay ?? game.elapsedDays + (ceoNpc ? getManagementCadenceDays(company, ceoNpc) : 14),
          emergencyReleaseAnchorDay: resetEmergencyRelease ? null : company.emergencyReleaseAnchorDay,
          emergencyReleaseCount: resetEmergencyRelease ? 0 : company.emergencyReleaseCount,
          lastEmergencyReleaseDay: resetEmergencyRelease ? null : company.lastEmergencyReleaseDay,
          activeBoardVote,
          shareListings: sanitizeShareListings(company),
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
    cash: 92,
    research: 72,
    marketShare: 12,
    reputation: 29,
    upgrades: createUpgrades({ architecture: 2, lithography: 180, clockSpeed: 1.5, coreDesign: 1, cacheStack: 512, powerEfficiency: 98 }),
    teams: createTeams({ researchers: 2, marketing: 2, fabrication: 2 }),
    lastRelease: 'Cosmic Sol-1 masih mendominasi OEM murah.',
  });
  const rmd = createCompany({
    key: 'rmd',
    name: 'RMD',
    founder: 'Mika Ren',
    focus: 'Performa enthusiast dengan ritme release lebih cepat.',
    cash: 86,
    research: 78,
    marketShare: 10.5,
    reputation: 27,
    upgrades: createUpgrades({ architecture: 2, lithography: 170, clockSpeed: 1.7, coreDesign: 2, cacheStack: 512, powerEfficiency: 102 }),
    teams: createTeams({ researchers: 3, marketing: 1, fabrication: 1 }),
    lastRelease: 'RMD Ember-2 populer di komunitas builder.',
  });
  const heroscop = createCompany({
    key: 'heroscop',
    name: 'Heroscop',
    founder: 'Rafi Helion',
    focus: 'Efisiensi daya dan workstation premium.',
    cash: 81,
    research: 75,
    marketShare: 9.5,
    reputation: 26,
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

  npcs.forEach((npc) => {
    npc.analysisNote = `${npc.name} masih observasi dan belum berani masuk besar karena mayoritas perusahaan masih founder-led serta free float sangat tipis.`;
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
      `01/01/00: Profil ${profile.name.trim() || 'Player'} dibuat dengan modal awal $${formatMoneyCompact(PLAYER_STARTING_CASH)}.`,
      `01/01/00: 20 AI NPC aktif dibangkitkan dengan strategi value, growth, dividend, activist, dan balanced.`,
      `01/01/00: Dewan direksi 7 kursi aktif di tiap perusahaan untuk memilih CEO secara dinamis.`,
      `01/01/00: Semua perusahaan mulai dari valuasi rendah, kas terbatas, dan free float tipis sehingga setiap suntikan modal terasa nyata.`,
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
  const corporateCompanyKey = getCompanyKeyFromCorporateInvestorId(investorId);
  if (corporateCompanyKey) {
    return {
      ...game,
      companies: {
        ...game.companies,
        [corporateCompanyKey]: {
          ...game.companies[corporateCompanyKey],
          cash: Math.max(0, game.companies[corporateCompanyKey].cash + amount),
        },
      },
    };
  }

  return {
    ...game,
    npcs: game.npcs.map((npc) => (npc.id === investorId ? { ...npc, cash: npc.cash + amount } : npc)),
  };
}

function transactShares(current: GameState, investorId: string, companyKey: CompanyKey, mode: InvestorActionMode, requestedAmount: number, route: TradeRoute = 'auto') {
  const company = current.companies[companyKey];
  if (requestedAmount <= 0) {
    return { next: current, tradedValue: 0, sharesMoved: 0, route: 'company' as TradeRoute };
  }

  const investorCash = getInvestorCash(current, investorId);
  const currentShares = company.investors[investorId] ?? 0;
  const preview = getTradePreview(current, company, investorId, investorCash, currentShares, mode, requestedAmount, route);
  if (preview.grossTradeValue < MIN_TRADE_AMOUNT || preview.sharesMoved <= 0) {
    return { next: current, tradedValue: 0, sharesMoved: 0, route: preview.route };
  }
  if (mode === 'buy' && preview.netCashDelta * -1 > investorCash + 0.0001) {
    return { next: current, tradedValue: 0, sharesMoved: 0, route: preview.route };
  }

  if (route === 'auto' && mode === 'buy') {
    const sharePrice = preview.sharePrice;
    const companyCapacity = Math.max(0, Math.min(company.marketPoolShares * sharePrice, requestedAmount, investorCash / (1 + COMPANY_TRADE_FEE_RATE)));
    const companyShares = sharePrice > 0 ? companyCapacity / sharePrice : 0;
    const companyFee = companyCapacity * COMPANY_TRADE_FEE_RATE;
    let next: GameState = current;

    if (companyCapacity >= MIN_TRADE_AMOUNT && companyShares > 0.0001) {
      next = applyCashToInvestor(
        {
          ...next,
          companies: {
            ...next.companies,
            [companyKey]: {
              ...next.companies[companyKey],
              cash: next.companies[companyKey].cash + companyCapacity,
              capitalStrain: Math.max(0, next.companies[companyKey].capitalStrain - companyCapacity * 0.45),
              marketPoolShares: Math.max(0, next.companies[companyKey].marketPoolShares - companyShares),
              investors: {
                ...next.companies[companyKey].investors,
                [investorId]: (next.companies[companyKey].investors[investorId] ?? 0) + companyShares,
              },
            },
          },
        },
        investorId,
        -(companyCapacity + companyFee)
      );
    }

    const remainingRequested = Math.max(0, requestedAmount - companyCapacity);
    const refreshedCompany = next.companies[companyKey];
    const remainingCash = getInvestorCash(next, investorId);
    const listingBudget = Math.max(0, Math.min(remainingRequested, remainingCash / (1 + HOLDER_TRADE_FEE_RATE)));
    const holderAllocation = allocateHolderBuyFromListings(refreshedCompany, getVisibleShareListings(refreshedCompany, investorId), listingBudget);

    if (holderAllocation.grossTradeValue >= MIN_TRADE_AMOUNT && holderAllocation.sharesMoved > 0.0001) {
      let companyAfterListings = refreshedCompany;
      let feed = next.activityFeed;
      holderAllocation.fills.forEach((fill) => {
        const treasuryFee = fill.value * 0.12;
        const sellerProceed = fill.value - treasuryFee;
        companyAfterListings = {
          ...companyAfterListings,
          cash: companyAfterListings.cash + treasuryFee,
          capitalStrain: Math.max(0, companyAfterListings.capitalStrain - treasuryFee * 0.4),
          investors: {
            ...companyAfterListings.investors,
            [fill.sellerId]: Math.max(0, (companyAfterListings.investors[fill.sellerId] ?? 0) - fill.shares),
            [investorId]: (companyAfterListings.investors[investorId] ?? 0) + fill.shares,
          },
          shareListings: companyAfterListings.shareListings
            .map((listing) => listing.sellerId === fill.sellerId
              ? { ...listing, sharesAvailable: Math.max(0, listing.sharesAvailable - fill.shares) }
              : listing)
            .filter((listing) => listing.sharesAvailable > 0.01),
        };
        if ((companyAfterListings.investors[fill.sellerId] ?? 0) <= 0.01) {
          delete companyAfterListings.investors[fill.sellerId];
        }
        next = applyCashToInvestor(next, fill.sellerId, sellerProceed);
        feed = addFeedEntry(
          feed,
          `${formatDateFromDays(current.elapsedDays)}: ${investorDisplayName(current, fill.sellerId)} menjual ${formatNumber(fill.shares, 2)} saham ${company.name} via listing ${fill.priceMultiplier}x, menerima $${formatMoneyCompact(sellerProceed)} (fee treasury $${formatMoneyCompact(treasuryFee)}).`
        );
      });

      next = applyCashToInvestor(
        {
          ...next,
          activityFeed: feed,
          companies: {
            ...next.companies,
            [companyKey]: companyAfterListings,
          },
        },
        investorId,
        -(holderAllocation.grossTradeValue + holderAllocation.grossTradeValue * HOLDER_TRADE_FEE_RATE)
      );
    }

    const totalTradedValue = companyCapacity + holderAllocation.grossTradeValue;
    const totalSharesMoved = companyShares + holderAllocation.sharesMoved;
    return {
      next: resolveGovernance(next),
      tradedValue: totalTradedValue,
      sharesMoved: totalSharesMoved,
      route: 'auto' as TradeRoute,
    };
  }

  if (preview.route === 'company') {
    if (mode === 'buy') {
      let next: GameState = {
        ...current,
        companies: {
          ...current.companies,
          [companyKey]: {
            ...company,
            cash: company.cash + preview.grossTradeValue,
            capitalStrain: Math.max(0, company.capitalStrain - preview.grossTradeValue * 0.45),
            marketPoolShares: Math.max(0, company.marketPoolShares - preview.sharesMoved),
            investors: {
              ...company.investors,
              [investorId]: currentShares + preview.sharesMoved,
            },
          },
        },
      };
      next = applyCashToInvestor(next, investorId, preview.netCashDelta);
      return { next: resolveGovernance(next), tradedValue: preview.grossTradeValue, sharesMoved: preview.sharesMoved, route: preview.route };
    }

    const nextInvestors = { ...company.investors, [investorId]: currentShares - preview.sharesMoved };
    if (nextInvestors[investorId] <= 0.01) {
      delete nextInvestors[investorId];
    }

    const cashUsed = Math.min(company.cash, preview.grossTradeValue);
    const uncoveredValue = Math.max(0, preview.grossTradeValue - cashUsed);
    let next: GameState = {
      ...current,
      companies: {
        ...current.companies,
        [companyKey]: {
          ...company,
          cash: Math.max(0, company.cash - cashUsed),
          capitalStrain: company.capitalStrain + uncoveredValue,
          marketPoolShares: company.marketPoolShares + preview.sharesMoved,
          investors: nextInvestors,
        },
      },
    };
    next = applyCashToInvestor(next, investorId, preview.netCashDelta);
    return { next: resolveGovernance(next), tradedValue: preview.grossTradeValue, sharesMoved: preview.sharesMoved, route: preview.route };
  }

  const sharePrice = preview.sharePrice;
  let remainingShares = preview.sharesMoved;
  let consumedValue = 0;
  let next = {
    ...current,
    companies: {
      ...current.companies,
      [companyKey]: {
        ...company,
        investors: {
          ...company.investors,
        },
      },
    },
  };

  if (mode === 'buy') {
    const holderAllocation = allocateHolderBuyFromListings(company, getVisibleShareListings(company, investorId), preview.grossTradeValue);
    let feed = next.activityFeed;
    let treasuryInjection = 0;
    holderAllocation.fills.forEach((fill) => {
      if (fill.shares <= 0.0001) return;
      const treasuryFee = fill.value * 0.12;
      const sellerProceed = fill.value - treasuryFee;
      remainingShares -= fill.shares;
      consumedValue += fill.value;
      treasuryInjection += treasuryFee;
      const holderCurrentShares = next.companies[companyKey].investors[fill.sellerId] ?? 0;
      next.companies[companyKey].investors[fill.sellerId] = holderCurrentShares - fill.shares;
      if (next.companies[companyKey].investors[fill.sellerId] <= 0.01) {
        delete next.companies[companyKey].investors[fill.sellerId];
      }
      next.companies[companyKey].shareListings = next.companies[companyKey].shareListings
        .map((listing) => listing.sellerId === fill.sellerId
          ? { ...listing, sharesAvailable: Math.max(0, listing.sharesAvailable - fill.shares) }
          : listing)
        .filter((listing) => listing.sharesAvailable > 0.01);
      next = applyCashToInvestor(next, fill.sellerId, sellerProceed);
      feed = addFeedEntry(
        feed,
        `${formatDateFromDays(current.elapsedDays)}: ${investorDisplayName(current, fill.sellerId)} menjual ${formatNumber(fill.shares, 2)} saham ${company.name} via listing ${fill.priceMultiplier}x, menerima $${formatMoneyCompact(sellerProceed)} (fee treasury $${formatMoneyCompact(treasuryFee)}).`
      );
    });

    next.companies[companyKey].investors[investorId] = (next.companies[companyKey].investors[investorId] ?? 0) + preview.sharesMoved - remainingShares;
    next.companies[companyKey].cash += treasuryInjection;
    next.companies[companyKey].capitalStrain = Math.max(0, next.companies[companyKey].capitalStrain - treasuryInjection * 0.4);
    next = applyCashToInvestor(next, investorId, -(consumedValue + consumedValue * preview.feeRate));
    next = {
      ...next,
      activityFeed: feed,
    };
    return {
      next: resolveGovernance(next),
      tradedValue: consumedValue,
      sharesMoved: preview.sharesMoved - remainingShares,
      route: preview.route,
    };
  }

  const buyers = Object.keys(company.investors)
    .filter((holderId) => holderId !== investorId)
    .map((holderId) => ({ holderId, budget: getBuyerDemandBudget(current, company, holderId) }))
    .filter((entry) => entry.budget >= MIN_TRADE_AMOUNT)
    .sort((left, right) => right.budget - left.budget);

  buyers.forEach(({ holderId, budget }) => {
    if (remainingShares <= 0.0001) return;
    const sharesAbsorbed = Math.min(remainingShares, budget / sharePrice);
    if (sharesAbsorbed <= 0.0001) return;
    const valueMoved = sharesAbsorbed * sharePrice;
    remainingShares -= sharesAbsorbed;
    consumedValue += valueMoved;
    next.companies[companyKey].investors[holderId] = (next.companies[companyKey].investors[holderId] ?? 0) + sharesAbsorbed;
    next = applyCashToInvestor(next, holderId, -valueMoved);
  });

  next.companies[companyKey].investors[investorId] = Math.max(0, (next.companies[companyKey].investors[investorId] ?? 0) - (preview.sharesMoved - remainingShares));
  if (next.companies[companyKey].investors[investorId] <= 0.01) {
    delete next.companies[companyKey].investors[investorId];
  }
  next = applyCashToInvestor(next, investorId, consumedValue - consumedValue * preview.feeRate);
  return {
    next: resolveGovernance(next),
    tradedValue: consumedValue,
    sharesMoved: preview.sharesMoved - remainingShares,
    route: preview.route,
  };
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
  const corporateCashDelta = new Map<CompanyKey, number>();

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
        else {
          const corporateCompanyKey = getCompanyKeyFromCorporateInvestorId(investorId);
          if (corporateCompanyKey) {
            corporateCashDelta.set(corporateCompanyKey, (corporateCashDelta.get(corporateCompanyKey) ?? 0) + payout);
          } else {
            npcCashMap.set(investorId, (npcCashMap.get(investorId) ?? 0) + payout);
          }
        }
      });

      const ceoSalary = governedCompany.ceoSalaryPerDay * tickDays;
      if (governedCompany.ceoId === current.player.id) nextPlayerCash += ceoSalary;
      else npcCashMap.set(governedCompany.ceoId, (npcCashMap.get(governedCompany.ceoId) ?? 0) + ceoSalary);
      const executivePayroll = governedCompany.executivePayrollPerDay * tickDays;
      EXECUTIVE_ROLES.forEach((role) => {
        const executive = governedCompany.executives[role];
        if (!executive) return;
        if (executive.occupantId === current.player.id) nextPlayerCash += executive.salaryPerDay * tickDays;
        else npcCashMap.set(executive.occupantId, (npcCashMap.get(executive.occupantId) ?? 0) + executive.salaryPerDay * tickDays);
      });

      return [
        key,
        {
          ...governedCompany,
          research: governedCompany.research + governedCompany.researchPerDay * tickDays,
          cash: Math.max(0, governedCompany.cash + retentionProfit * tickDays - dividendPoolPerDay * tickDays - ceoSalary - executivePayroll - capitalFlightPerDay * tickDays - managementDragPerDay * tickDays),
          capitalStrain: Math.max(0, governedCompany.capitalStrain - Math.max(0, retentionProfit - managementDragPerDay) * tickDays * 0.65),
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

  if (corporateCashDelta.size > 0) {
    nextState = {
      ...nextState,
      companies: {
        ...nextState.companies,
      },
    };
    corporateCashDelta.forEach((delta, companyKey) => {
      nextState.companies[companyKey] = {
        ...nextState.companies[companyKey],
        cash: Math.max(0, nextState.companies[companyKey].cash + delta),
      };
    });
  }

  if (nextState.tickCount % NPC_ACTION_EVERY_TICKS === 0) {
    nextState = runNpcTurn(nextState);
    nextState = runNpcChiefExecutiveTurn(nextState);
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
  const founderControl = getOwnershipPercent(company, company.founderInvestorId) / 100;
  const outsideOwnership = clamp(1 - founderControl - company.marketPoolShares / company.sharesOutstanding, 0, 1);
  const treasuryLiquidity = clamp(company.marketPoolShares / 90, 0, 1.2);
  const strainPenalty = company.capitalStrain / Math.max(30, valuation);
  const discoverySignal = clamp((company.marketShare / 30 + company.reputation / 55 + company.researchPerDay / 20) / 3, 0, 1.4);
  const entryFriction = founderControl > 0.84 && company.marketShare < 24 ? (founderControl - 0.84) * 2.2 : 0;
  const momentumSignal = discoverySignal * 0.9 + outsideOwnership * 0.65 + treasuryLiquidity * 0.24 + company.releaseCount * 0.08;
  const managementPenalty = stressLevel * 2.6 + strainPenalty * 1.8;
  const strategyBias =
    npc.strategy === 'value'
      ? valueSignal * 2.3 + qualitySignal * 0.8 + performanceSignal * 0.5 + momentumSignal * 0.2
      : npc.strategy === 'growth'
        ? growthSignal * 2.4 + qualitySignal * 0.9 + performanceSignal * 0.6 + momentumSignal * 0.42
        : npc.strategy === 'dividend'
          ? dividendYield * 3.2 + qualitySignal * 0.9 + performanceSignal * 0.3 + momentumSignal * 0.18
          : npc.strategy === 'activist'
            ? controlSignal * 2.4 + valueSignal * 1.1 + growthSignal * 0.9 + performanceSignal * 0.45 + momentumSignal * 0.16
            : valueSignal * 1.2 + growthSignal * 1.3 + dividendYield * 1.1 + performanceSignal * 0.45 + momentumSignal * 0.24;

  const longTermFit = npc.horizonDays / 365 * 0.35 + npc.patience * 0.6 + npc.intelligence * 0.34;
  const liquidityPenalty = entryFriction * Math.max(0.2, 1 - npc.boldness * 0.6) + Math.max(0, 0.25 - treasuryLiquidity) * 0.65 - discoverySignal * npc.intelligence * 0.12;
  const crowdConfidence = discoverySignal * (0.4 + npc.intelligence * 0.25) + outsideOwnership * 0.32 + treasuryLiquidity * 0.18;
  return {
    sharePrice,
    valuation,
    cpuScore,
    dividendYield,
    growthSignal,
    qualitySignal,
    performanceSignal,
    stressLevel,
    discoverySignal,
    momentumSignal,
    crowdConfidence,
    founderControl,
    liquidityPenalty,
    managementPenalty,
    finalScore: strategyBias + longTermFit + crowdConfidence - managementPenalty - liquidityPenalty,
  };
}

function getNpcStrategyProfile(strategy: StrategyStyle) {
  if (strategy === 'growth') return { tech: 1.34, operations: 1.04, marketing: 1.1, efficiency: 0.82, finance: 0.74 };
  if (strategy === 'value') return { tech: 0.96, operations: 1.02, marketing: 0.78, efficiency: 1.28, finance: 1.08 };
  if (strategy === 'dividend') return { tech: 0.84, operations: 1.08, marketing: 0.88, efficiency: 1.16, finance: 1.28 };
  if (strategy === 'activist') return { tech: 1.08, operations: 1.1, marketing: 0.9, efficiency: 1.04, finance: 1.14 };
  return { tech: 1, operations: 1, marketing: 1, efficiency: 1, finance: 1 };
}

function getCompanyCompetitiveContext(game: GameState, company: CompanyState) {
  const competitors = (Object.values(game.companies) as CompanyState[]).filter((entry) => entry.key !== company.key);
  const currentCpuScore = calculateCpuScore(company.upgrades);
  const bestCpuScore = Math.max(currentCpuScore, ...competitors.map((entry) => calculateCpuScore(entry.upgrades)));
  const bestResearch = Math.max(company.researchPerDay, ...competitors.map((entry) => entry.researchPerDay));
  const bestMarketShare = Math.max(company.marketShare, ...competitors.map((entry) => entry.marketShare));
  const bestReputation = Math.max(company.reputation, ...competitors.map((entry) => entry.reputation));

  return {
    cpuGap: clamp((bestCpuScore - currentCpuScore) / Math.max(1, bestCpuScore), 0, 1),
    researchGap: clamp((bestResearch - company.researchPerDay) / Math.max(1, bestResearch), 0, 1),
    marketGap: clamp((bestMarketShare - company.marketShare) / Math.max(1, bestMarketShare), 0, 1),
    reputationGap: clamp((bestReputation - company.reputation) / Math.max(1, bestReputation), 0, 1),
  };
}

function getManagementResourceContext(company: CompanyState) {
  const maxUpgradeCost = Math.max(...(Object.entries(company.upgrades) as [UpgradeKey, UpgradeState][]).map(([key, upgrade]) => getUpgradeCost(key, upgrade, company)));
  const maxTeamCost = Math.max(...(Object.values(company.teams) as TeamState[]).map((team) => getTeamCost(team)));
  const monthlyRevenue = company.revenuePerDay * 30;
  const monthlyRetainedCash = Math.max(8, monthlyRevenue * 0.42 * (1 - company.payoutRatio));
  const monthlyResearchOutput = Math.max(10, company.researchPerDay * 30);
  const researchReserveTarget = Math.max(maxUpgradeCost * 2.1, company.researchPerDay * 9);
  const cashReserveTarget = Math.max(maxTeamCost * 1.75, monthlyRetainedCash * 1.2, 32);
  const researchOverflow = clamp((company.research - researchReserveTarget) / Math.max(1, researchReserveTarget), 0, 4);
  const cashOverflow = clamp((company.cash - cashReserveTarget) / Math.max(1, cashReserveTarget), 0, 4);
  const researchUrgency = clamp(company.research / Math.max(1, monthlyResearchOutput * 0.75), 0, 6);
  const cashUrgency = clamp(company.cash / Math.max(1, monthlyRetainedCash * 1.4), 0, 6);
  const managementIntensity = clamp(Math.max(researchOverflow, cashOverflow) * 0.8 + Math.max(researchUrgency, cashUrgency) * 0.22, 0, 4);

  return {
    maxUpgradeCost,
    maxTeamCost,
    monthlyRevenue,
    monthlyRetainedCash,
    monthlyResearchOutput,
    researchReserveTarget,
    cashReserveTarget,
    researchOverflow,
    cashOverflow,
    researchUrgency,
    cashUrgency,
    managementIntensity,
  };
}

function previewUpgradeCompany(company: CompanyState, key: UpgradeKey) {
  const current = company.upgrades[key];
  const nextValue = key === 'lithography' || key === 'powerEfficiency'
    ? Math.max(key === 'lithography' ? 5 : 28, current.value + current.step)
    : current.value + current.step;
  const nextUpgrades = {
    ...company.upgrades,
    [key]: {
      ...current,
      value: nextValue,
    },
  };
  return {
    ...company,
    upgrades: nextUpgrades,
  };
}

function previewTeamCompany(company: CompanyState, key: TeamKey) {
  return {
    ...company,
    teams: {
      ...company.teams,
      [key]: {
        ...company.teams[key],
        count: company.teams[key].count + 1,
      },
    },
  };
}

function scoreNpcUpgradeAction(game: GameState, npc: NpcInvestor, company: CompanyState, key: UpgradeKey): CompanyAiAction {
  const profile = getNpcStrategyProfile(npc.strategy);
  const context = getCompanyCompetitiveContext(game, company);
  const management = getManagementResourceContext(company);
  const preview = previewUpgradeCompany(company, key);
  const currentCpuScore = calculateCpuScore(company.upgrades);
  const nextCpuScore = calculateCpuScore(preview.upgrades);
  const cpuDelta = nextCpuScore - currentCpuScore;
  const researchDelta = calculateResearchPerDay(company.teams, preview.upgrades) - company.researchPerDay;
  const revenueDelta = calculateRevenuePerDay(company.teams, preview.upgrades, company.marketShare, company.reputation, company.boardMood) - company.revenuePerDay;
  const cost = getUpgradeCost(key, company.upgrades[key], company);
  const reservePressure = cost / Math.max(1, company.research + management.monthlyResearchOutput * 0.3);
  const longTermBias = npc.intelligence * 0.4 + npc.patience * 0.24;
  const efficiencyBias = key === 'lithography' || key === 'powerEfficiency' ? profile.efficiency * (0.7 + context.marketGap * 0.35) : 0;
  const architectureBias = key === 'architecture' ? profile.tech * (0.55 + context.cpuGap * 0.6) : 0;
  const backlogBias = management.researchOverflow * (0.75 + npc.intelligence * 0.4) + management.researchUrgency * 0.18;
  const score = (
    cpuDelta * (0.0088 + profile.tech * 0.0046)
    + researchDelta * (1.1 + profile.tech * 0.45)
    + revenueDelta * (0.18 + profile.operations * 0.06)
    + context.cpuGap * 2.4
    + context.researchGap * 1.8
    + longTermBias
    + backlogBias
    + efficiencyBias
    + architectureBias
    - reservePressure * (0.82 + (1 - npc.boldness) * 0.22)
  );

  return {
    type: 'upgrade',
    key,
    resource: 'research',
    cost,
    score,
    label: company.upgrades[key].label,
    rationale: cpuDelta > 0 ? 'mengejar gap teknologi' : 'menjaga efisiensi jangka panjang',
  };
}

function scoreNpcTeamAction(game: GameState, npc: NpcInvestor, company: CompanyState, key: TeamKey): CompanyAiAction {
  const profile = getNpcStrategyProfile(npc.strategy);
  const context = getCompanyCompetitiveContext(game, company);
  const management = getManagementResourceContext(company);
  const preview = previewTeamCompany(company, key);
  const researchDelta = calculateResearchPerDay(preview.teams, company.upgrades) - company.researchPerDay;
  const revenueDelta = calculateRevenuePerDay(preview.teams, company.upgrades, company.marketShare, company.reputation, company.boardMood) - company.revenuePerDay;
  const launchDelta = calculateLaunchRevenue(calculateCpuScore(company.upgrades), preview.teams, company.marketShare, company.reputation, 1) - calculateLaunchRevenue(calculateCpuScore(company.upgrades), company.teams, company.marketShare, company.reputation, 1);
  const cost = getTeamCost(company.teams[key]);
  const reservePressure = cost / Math.max(1, company.cash + management.monthlyRetainedCash * 0.75);
  const backlogBias = management.cashOverflow * (0.68 + npc.intelligence * 0.34) + management.cashUrgency * 0.16;
  const score = (
    (key === 'researchers' ? researchDelta * (1.22 + profile.tech * 0.34) + context.researchGap * 1.6 : 0)
    + (key === 'fabrication' ? revenueDelta * (0.24 + profile.operations * 0.08) + launchDelta * 0.004 + context.cpuGap * 0.65 : 0)
    + (key === 'marketing' ? revenueDelta * (0.2 + profile.marketing * 0.08) + context.marketGap * 1.9 + context.reputationGap * 1.2 : 0)
    + npc.intelligence * 0.38
    + backlogBias
    - reservePressure * (0.94 + (1 - npc.patience) * 0.18)
  );

  return {
    type: 'team',
    key,
    resource: 'cash',
    cost,
    score,
    label: company.teams[key].label,
    rationale: key === 'researchers' ? 'menguatkan output R&D' : key === 'fabrication' ? 'membesarkan kapasitas eksekusi' : 'menambah tekanan brand & demand',
  };
}

function chooseNpcReleasePriceIndex(npc: NpcInvestor, company: CompanyState, cpuDelta: number, cashEmergency: number) {
  if (cashEmergency > 0.55) return 0;
  if (npc.strategy === 'growth' && cpuDelta > 18) return 2;
  if (company.marketShare < 12 || npc.strategy === 'value') return 0;
  if (cpuDelta > 28 || company.reputation > 58) return 2;
  return 1;
}

function getNpcReleasePressure(game: GameState, npc: NpcInvestor, company: CompanyState) {
  const currentCpuScore = calculateCpuScore(company.upgrades);
  const management = getManagementResourceContext(company);
  const daysSinceRelease = game.elapsedDays - company.lastReleaseDay;
  const cpuDelta = currentCpuScore - company.lastReleaseCpuScore;
  const cashEmergency = clamp((28 - company.cash) / 28, 0, 2.8);
  const cashReserveGap = clamp((management.cashReserveTarget - company.cash) / Math.max(1, management.cashReserveTarget), 0, 2.4);
  const severeCashCrisis = company.cash <= Math.max(2.5, management.cashReserveTarget * 0.08);
  const cashMeltdown = company.cash < 10;
  const nearZeroCash = company.cash <= 2;
  const baseReleaseWindow = clamp(Math.round(24 - npc.boldness * 6 - npc.intelligence * 3), 14, 30);
  const releaseCadenceTarget = cashMeltdown
    ? 7
    : cpuDelta > 32
      ? 28
      : cpuDelta > 18
        ? 42
        : 56;
  const momentumWindowBias = clamp(Math.round((releaseCadenceTarget - baseReleaseWindow) * 0.8), -10, 10);
  const tunedReleaseWindow = clamp(baseReleaseWindow + momentumWindowBias, 28, 60);
  const releaseWindow = cashMeltdown ? 7 : (cashEmergency > 0.7 ? Math.max(28, tunedReleaseWindow - 4) : tunedReleaseWindow);
  const emergencyAnchorDay = company.emergencyReleaseAnchorDay;
  const emergencyReleaseCount = company.emergencyReleaseCount ?? 0;
  const weeksSinceEmergencyAnchor = emergencyAnchorDay === null ? 0 : Math.floor(Math.max(0, game.elapsedDays - emergencyAnchorDay) / 7);
  const allowedEmergencyReleaseCount = emergencyAnchorDay === null ? 1 : weeksSinceEmergencyAnchor + 1;
  const emergencyCadenceReady = cashMeltdown && emergencyReleaseCount < allowedEmergencyReleaseCount;
  const canForceRelease = emergencyCadenceReady && (severeCashCrisis || nearZeroCash || (cashEmergency > 0.52 && cashReserveGap > 0.32));
  const releaseDistance =
    Math.max(0, cpuDelta) * 0.68
    + Math.max(0, daysSinceRelease - releaseWindow) * 0.12
    + (company.lastReleasePriceIndex === chooseNpcReleasePriceIndex(npc, company, cpuDelta, cashEmergency) ? 0 : 2.6);

  return {
    currentCpuScore,
    management,
    daysSinceRelease,
    cpuDelta,
    cashEmergency,
    cashReserveGap,
    cashMeltdown,
    nearZeroCash,
    emergencyCadenceReady,
    releaseWindow,
    releaseCadenceTarget,
    canForceRelease,
    releaseDistance,
  };
}

function scoreNpcReleaseAction(game: GameState, npc: NpcInvestor, company: CompanyState): CompanyAiAction | null {
  const pressure = getNpcReleasePressure(game, npc, company);
  const {
    currentCpuScore,
    management,
    daysSinceRelease,
    cpuDelta,
    cashEmergency,
    cashReserveGap,
    cashMeltdown,
    nearZeroCash,
    emergencyCadenceReady,
    releaseWindow,
    releaseCadenceTarget,
    canForceRelease,
    releaseDistance,
  } = pressure;
  const marketNeed = clamp((18 - company.marketShare) / 18, 0, 1.2);
  const reputationNeed = clamp((50 - company.reputation) / 50, 0, 1);
  const priceIndex = chooseNpcReleasePriceIndex(npc, company, cpuDelta, cashEmergency);
  const staleness = clamp(daysSinceRelease / 90, 0, 2.2);
  const inNormalCadenceMode = !cashMeltdown;
  if (inNormalCadenceMode && daysSinceRelease < 28) return null;
  if (cashMeltdown && !emergencyCadenceReady) return null;
  const tooSoonWithNoDistance =
    daysSinceRelease < releaseWindow
    && releaseDistance < 5.4
    && cashEmergency < 0.6
    && !emergencyCadenceReady
    && !canForceRelease;
  if (tooSoonWithNoDistance) return null;
  const repeatedSpecPenalty = daysSinceRelease < 28 && cpuDelta < 10 && priceIndex === company.lastReleasePriceIndex
    ? 3.8
    : daysSinceRelease < 18 && cpuDelta < 18 && priceIndex === company.lastReleasePriceIndex
      ? 2
      : daysSinceRelease < 12 && cpuDelta < 8
        ? 1.2
        : 0;
  const pricePreset = PRICE_PRESETS[priceIndex];
  const launchRevenue = calculateLaunchRevenue(currentCpuScore, company.teams, company.marketShare, company.reputation, pricePreset.factor);
  const launchRevenueSignal = Math.log10(1 + Math.max(0, launchRevenue));
  const releaseCadencePressure = clamp((daysSinceRelease - releaseWindow) / Math.max(8, releaseWindow), 0, 2.4);
  const upgradeMomentumPressure = clamp((releaseCadenceTarget - daysSinceRelease) / Math.max(6, releaseCadenceTarget), 0, 1.2) * (cpuDelta > 6 ? 1 : 0);
  const urgentCashPressure = Math.max(cashEmergency, cashReserveGap * 0.9);
  const crisisBoost = canForceRelease ? 9 + Math.max(0, 1.6 - company.cash) * 0.7 : 0;
  const normalCadenceBoost = inNormalCadenceMode ? clamp((daysSinceRelease - 28) / 32, 0, 1.8) : 0;
  const score = (
    urgentCashPressure * 7.6
    + cpuDelta * 0.042
    + staleness * 1.65
    + releaseCadencePressure * 2.1
    + normalCadenceBoost * 1.6
    + upgradeMomentumPressure * 1.7
    + marketNeed * 1.4
    + reputationNeed * 0.8
    + management.researchOverflow * 0.32
    + npc.intelligence * 0.44
    + launchRevenueSignal * 0.9
    + crisisBoost
    - repeatedSpecPenalty
  );

  if (score < 0.9 && cashEmergency < 0.45 && cpuDelta < 12 && daysSinceRelease < 70 && !canForceRelease) return null;
  const releaseNumber = company.releaseCount + 1;
  const releaseSeries = `${company.name} G-Series`;
  const releaseCpuName = `CPU G${releaseNumber}`;

  return {
    type: 'release',
    key: 'release',
    resource: 'cash',
    cost: 0,
    score,
    label: `Release CPU ${releaseCpuName}`,
    rationale: canForceRelease
      ? 'kas < $10M: rilis darurat mingguan aktif untuk menyelamatkan runway'
      : cashEmergency > 0.6
        ? 'mengisi kas darurat lewat produk terbaik yang siap dijual'
      : cpuDelta > 18
        ? 'mengunci lonjakan spesifikasi menjadi pendapatan baru'
        : 'menjaga ritme pasar tanpa terlalu menunggu roadmap sempurna',
    priceIndex,
    releaseSeries,
    releaseCpuName,
    releasePriorityBoost: releaseCadencePressure + upgradeMomentumPressure * 0.9 + urgentCashPressure * 1.6 + (canForceRelease ? 9 : 0),
    forceImmediate: canForceRelease || nearZeroCash,
  };
}

function applyNpcCompanyAction(game: GameState, companyKey: CompanyKey, action: CompanyAiAction) {
  const company = game.companies[companyKey];
  if (action.type === 'release') {
    const priceIndex = action.priceIndex ?? 1;
    const pricePreset = PRICE_PRESETS[priceIndex];
    const cpuScore = calculateCpuScore(company.upgrades);
    const launchRevenue = calculateLaunchRevenue(cpuScore, company.teams, company.marketShare, company.reputation, pricePreset.factor);
    const wasCashCritical = company.cash <= 0.5;
    const isEmergencyRelease = action.forceImmediate && company.cash < 10;
    const nextCash = company.cash + launchRevenue;
    const emergencyAnchorDay = isEmergencyRelease
      ? (company.emergencyReleaseAnchorDay ?? game.elapsedDays)
      : (nextCash > 10 ? null : company.emergencyReleaseAnchorDay);
    const emergencyReleaseCount = isEmergencyRelease
      ? (company.emergencyReleaseCount ?? 0) + 1
      : (nextCash > 10 ? 0 : company.emergencyReleaseCount);
    const lastEmergencyReleaseDay = isEmergencyRelease
      ? game.elapsedDays
      : (nextCash > 10 ? null : company.lastEmergencyReleaseDay);
    const reputationGain = Math.max(1.2, cpuScore / 240 + company.teams.marketing.count * 0.7 + pricePreset.reputationBonus);
    const marketShareGain = Math.min(4.8, cpuScore / 500 + company.teams.fabrication.count * 0.16 + pricePreset.marketBonus);
    const series = action.releaseSeries ?? `${company.name} G-Series`;
    const cpuName = action.releaseCpuName ?? `CPU G${company.releaseCount + 1}`;
    return {
      ...game,
      companies: {
        ...game.companies,
        [companyKey]: {
          ...company,
          cash: nextCash,
          reputation: clamp(company.reputation + reputationGain, 10, 100),
          marketShare: clamp(company.marketShare + marketShareGain, 3, 75),
          releaseCount: company.releaseCount + 1,
          bestCpuScore: Math.max(company.bestCpuScore, cpuScore),
          lastReleaseDay: game.elapsedDays,
          lastReleaseCpuScore: cpuScore,
          lastReleasePriceIndex: priceIndex,
          emergencyReleaseAnchorDay: emergencyAnchorDay,
          emergencyReleaseCount: emergencyReleaseCount,
          lastEmergencyReleaseDay: lastEmergencyReleaseDay,
          lastRelease: `${series} ${cpuName} rilis ${formatDateFromDays(game.elapsedDays)} (${pricePreset.label.toLowerCase()}).`,
        },
      },
      activityFeed: addFeedEntry(
        game.activityFeed,
        `${formatDateFromDays(game.elapsedDays)}: ${wasCashCritical ? '🚨 RILIS DARURAT' : 'Update produk'} — ${company.name} merilis ${series} ${cpuName} dan membukukan $${formatMoneyCompact(launchRevenue)}.`
      ),
    };
  }

  if (action.type === 'upgrade') {
    const key = action.key as UpgradeKey;
    const preview = previewUpgradeCompany(company, key);
    return {
      ...game,
      companies: {
        ...game.companies,
        [companyKey]: {
          ...preview,
          research: company.research - action.cost,
          bestCpuScore: Math.max(company.bestCpuScore, calculateCpuScore(preview.upgrades)),
          executivePulse: `${company.ceoName} memprioritaskan ${company.upgrades[key].label} untuk ${action.rationale}.`,
        },
      },
    };
  }

  const key = action.key as TeamKey;
  const preview = previewTeamCompany(company, key);
  return {
    ...game,
    companies: {
      ...game.companies,
      [companyKey]: {
        ...preview,
        cash: company.cash - action.cost,
        executivePulse: `${company.ceoName} memperbesar ${company.teams[key].label} untuk ${action.rationale}.`,
      },
    },
  };
}

function scoreNpcPayoutAction(npc: NpcInvestor, company: CompanyState, direction: 'up' | 'down'): CompanyAiAction {
  const stress = getCompanyStressLevel(company);
  const management = getManagementResourceContext(company);
  const richCash = clamp((company.cash - management.cashReserveTarget * 1.55) / Math.max(1, management.cashReserveTarget * 2.2), 0, 1.2);
  const lowCash = clamp((management.cashReserveTarget - company.cash) / Math.max(1, management.cashReserveTarget), 0, 1.2);
  const score = direction === 'up'
    ? richCash * (0.9 + npc.patience * 0.35) + management.cashOverflow * 0.26 + (npc.strategy === 'dividend' ? 0.8 : 0.18) - stress * 0.9
    : lowCash * (1.05 + npc.intelligence * 0.3) + stress * 0.55 + (npc.strategy === 'value' || npc.strategy === 'activist' ? 0.22 : 0);
  return {
    type: 'payout',
    key: direction === 'up' ? 'payout-up' : 'payout-down',
    resource: 'cash',
    cost: 0,
    score,
    label: direction === 'up' ? 'Naikkan payout' : 'Turunkan payout',
    rationale: direction === 'up' ? 'menghadiahi investor saat kas kuat' : 'menjaga runway dan fleksibilitas modal',
  };
}

function chooseNpcCompanyActionByDomain(game: GameState, npc: NpcInvestor, company: CompanyState, domain: ExecutiveDomain | 'general') {
  const management = getManagementResourceContext(company);
  const candidates: CompanyAiAction[] = [];

  if (domain === 'technology' || domain === 'general') {
    candidates.push(...(Object.keys(company.upgrades) as UpgradeKey[]).map((key) => scoreNpcUpgradeAction(game, npc, company, key)));
    candidates.push(scoreNpcTeamAction(game, npc, company, 'researchers'));
    const releaseAction = scoreNpcReleaseAction(game, npc, company);
    if (releaseAction?.forceImmediate) return releaseAction;
    if (releaseAction) candidates.push({ ...releaseAction, score: releaseAction.score + (releaseAction.releasePriorityBoost ?? 0) });
  }
  if (domain === 'operations' || domain === 'general') {
    candidates.push(scoreNpcTeamAction(game, npc, company, 'fabrication'));
  }
  if (domain === 'marketing' || domain === 'general') {
    candidates.push(scoreNpcTeamAction(game, npc, company, 'marketing'));
    if (domain === 'marketing') {
      const releaseAction = scoreNpcReleaseAction(game, npc, company);
      if (releaseAction?.forceImmediate) return releaseAction;
      if (releaseAction) {
        candidates.push({
          ...releaseAction,
          score: releaseAction.score + 0.18 + (releaseAction.releasePriorityBoost ?? 0) * 0.75,
        });
      }
    }
  }
  if (domain === 'finance') {
    candidates.push(scoreNpcPayoutAction(npc, company, 'up'), scoreNpcPayoutAction(npc, company, 'down'));
  }

  const hasResearchOverflow = company.research > management.researchReserveTarget;
  const hasCashOverflow = company.cash > management.cashReserveTarget;

  const reservePolicy = getManagementResourceContext(company);
  const requiredCashBuffer = Math.max(5, reservePolicy.cashReserveTarget * 0.16);
  const requiredResearchBuffer = Math.max(10, reservePolicy.researchReserveTarget * 0.08);
  const affordable = candidates
    .filter((action) => {
      if (action.resource === 'research') {
        const remaining = company.research - action.cost;
        return action.cost <= company.research && (action.type === 'release' || remaining >= requiredResearchBuffer || action.type === 'upgrade');
      }
      const remaining = company.cash - action.cost;
      if (action.type === 'release' || action.type === 'payout') return action.cost <= company.cash;
      return action.cost <= company.cash && remaining >= requiredCashBuffer;
    })
    .sort((left, right) => {
      const leftBoost = left.resource === 'research'
        ? management.researchOverflow * 0.7 + management.researchUrgency * 0.12
        : management.cashOverflow * 0.55 + management.cashUrgency * 0.1;
      const rightBoost = right.resource === 'research'
        ? management.researchOverflow * 0.7 + management.researchUrgency * 0.12
        : management.cashOverflow * 0.55 + management.cashUrgency * 0.1;
      return (right.score + rightBoost) - (left.score + leftBoost);
    });

  const best = affordable[0] ?? null;
  if (!best) return null;
  const executionThreshold = (best.type === 'upgrade' || best.type === 'team')
    ? 0.32 - management.managementIntensity * 0.05 - npc.intelligence * 0.04
    : best.type === 'release'
      ? 0.82 - management.managementIntensity * 0.08 - npc.intelligence * 0.05
      : 0.52 - management.cashOverflow * 0.05;
  if ((best.type === 'upgrade' || best.type === 'team') && best.score < executionThreshold && !hasResearchOverflow && !hasCashOverflow) return null;
  if (best.type === 'release' && best.score < executionThreshold) return null;
  if (best.type === 'payout' && best.score < 0.55) return null;
  return best;
}

function applyNpcManagementAction(game: GameState, companyKey: CompanyKey, action: CompanyAiAction) {
  if (action.type !== 'payout') return applyNpcCompanyAction(game, companyKey, action);
  const company = game.companies[companyKey];
  const delta = action.key === 'payout-up' ? 0.015 : -0.02;
  return {
    ...game,
    companies: {
      ...game.companies,
      [companyKey]: {
        ...company,
        payoutRatio: clamp(company.payoutRatio + delta, 0.08, 0.34),
        executivePulse: `${company.ceoName} ${action.rationale}.`,
      },
    },
  };
}

function getNpcManagementActionCapacity(company: CompanyState, ceoNpc: NpcInvestor, domain: ExecutiveDomain | 'general') {
  const management = getManagementResourceContext(company);
  if (domain === 'technology') return clamp(Math.round(1 + management.researchOverflow * 1.8 + management.researchUrgency * 0.45 + ceoNpc.intelligence * 1.6), 1, 6);
  if (domain === 'operations') return clamp(Math.round(1 + management.cashOverflow * 1.2 + management.cashUrgency * 0.35 + ceoNpc.intelligence * 1.1), 1, 4);
  if (domain === 'marketing') return clamp(Math.round(1 + management.cashOverflow * 1 + management.monthlyRevenue / 150 + ceoNpc.boldness), 1, 4);
  if (domain === 'finance') return clamp(Math.round(1 + management.cashOverflow * 0.5 + getCompanyStressLevel(company)), 1, 2);
  return clamp(Math.round(1 + management.managementIntensity * 1.4 + ceoNpc.intelligence), 1, 4);
}

function runNpcChiefExecutiveTurn(current: GameState) {
  let next = current;

  COMPANY_KEYS.forEach((companyKey) => {
    const company = next.companies[companyKey];
    const ceoNpcRecord = getNpcById(next, company.ceoId);
    const ceoNpc = getExecutiveAiActor(next, company, company.ceoId);
    const releasePressure = getNpcReleasePressure(next, ceoNpc, company);
    const isEmergencyReview =
      releasePressure.canForceRelease
      || (company.cash < 10)
      || (releasePressure.cpuDelta > 8 && releasePressure.daysSinceRelease >= 8)
      || (releasePressure.cpuDelta > 3 && releasePressure.daysSinceRelease >= 26);
    if (next.elapsedDays < company.nextManagementReviewDay && !isEmergencyReview) return;

    let workingGame = next;
    let workingCompany = workingGame.companies[companyKey];
    const actionsTaken: string[] = [];
    const roleOrder: Array<ExecutiveDomain | 'general'> = ['technology', 'operations', 'marketing', 'finance', 'general'];
    const actionCounts = new Map<string, number>();
    const roleHandlers: Record<ExecutiveDomain | 'general', string> = {
      technology: workingCompany.executives.cto?.occupantName ?? ceoNpc.name,
      operations: workingCompany.executives.coo?.occupantName ?? ceoNpc.name,
      marketing: workingCompany.executives.cmo?.occupantName ?? ceoNpc.name,
      finance: workingCompany.executives.cfo?.occupantName ?? ceoNpc.name,
      general: ceoNpc.name,
    };
    const maxTotalActions = clamp(Math.round(4 + getManagementResourceContext(workingCompany).managementIntensity * 3 + ceoNpc.intelligence * 3), 4, 16);
    let totalActions = 0;

    roleOrder.forEach((domain) => {
      if (totalActions >= maxTotalActions) return;
      const actor = domain === 'general'
        ? ceoNpc
        : getExecutiveAiActor(workingGame, workingCompany, workingCompany.executives[domain === 'technology' ? 'cto' : domain === 'operations' ? 'coo' : domain === 'marketing' ? 'cmo' : 'cfo']?.occupantId ?? ceoNpc.id);
      const domainCapacity = getNpcManagementActionCapacity(workingCompany, ceoNpc, domain);
      let domainActions = 0;

      while (domainActions < domainCapacity && totalActions < maxTotalActions) {
        const action = chooseNpcCompanyActionByDomain(workingGame, actor, workingCompany, domain);
        if (!action) break;
        const actionKey = `${domain}:${action.key}`;
        const seenCount = actionCounts.get(actionKey) ?? 0;
        if (action.type === 'payout' && seenCount >= 1) break;
        if (action.type === 'release' && seenCount >= 1) break;
        if (seenCount >= 3) break;

        workingGame = resolveGovernance(applyNpcManagementAction(workingGame, companyKey, action));
        workingCompany = workingGame.companies[companyKey];
        actionsTaken.push(`${roleHandlers[domain]}: ${action.label}`);
        actionCounts.set(actionKey, seenCount + 1);
        domainActions += 1;
        totalActions += 1;

        if (action.type === 'payout' || action.type === 'release') break;
      }
    });

    const sourceCompany = workingGame.companies[companyKey];
    const investableCash = Math.max(0, sourceCompany.cash - 18);
    if (investableCash > 8 && sourceCompany.boardMembers.length > 0) {
      const investmentTargets = COMPANY_KEYS
        .filter((targetKey) => targetKey !== companyKey)
        .map((targetKey) => {
          const targetCompany = workingGame.companies[targetKey];
          const attractiveness = targetCompany.marketShare * 0.7 + targetCompany.reputation * 0.45 + calculateCpuScore(targetCompany.upgrades) * 0.02;
          return { targetKey, targetCompany, attractiveness };
        })
        .sort((left, right) => right.attractiveness - left.attractiveness);
      const bestTarget = investmentTargets[0];
      if (bestTarget) {
        const proposedAmount = clamp(sourceCompany.cash * 0.14, 8, investableCash * 0.82);
        const investmentDecision = boardApproveCompanyInvestment(sourceCompany, bestTarget.targetCompany, proposedAmount);
        const proposerId = getBoardProposalActorId(workingGame, sourceCompany, { preferredRole: 'cfo', domain: 'finance' });
        const investmentVote: BoardVoteState = {
          id: `${companyKey}-invest-${workingGame.elapsedDays}`,
          kind: 'investasi',
          proposerId,
          subject: `${sourceCompany.name} → ${bestTarget.targetCompany.name}`,
          reason: `${investorDisplayName(workingGame, proposerId)} mengusulkan investasi strategis antar-perusahaan.`,
          investmentValue: proposedAmount,
          yesWeight: investmentDecision.yesWeight,
          noWeight: investmentDecision.noWeight,
          startDay: workingGame.elapsedDays,
          endDay: workingGame.elapsedDays + 7,
        };
        workingGame = {
          ...workingGame,
          companies: {
            ...workingGame.companies,
            [companyKey]: {
              ...workingGame.companies[companyKey],
              activeBoardVote: investmentVote,
            },
          },
        };
        if (investmentDecision.approved) {
          const corporateInvestorId = getCorporateInvestorId(companyKey);
          const investmentTrade = transactShares(workingGame, corporateInvestorId, bestTarget.targetKey, 'buy', proposedAmount, 'company');
          if (investmentTrade.tradedValue > 0) {
            workingGame = investmentTrade.next;
            workingCompany = workingGame.companies[companyKey];
            actionsTaken.push(`Board ${sourceCompany.name}: Investasi ke ${bestTarget.targetCompany.name}`);
          }
        }
      }
    }

    const nextReviewDay = workingGame.elapsedDays + getManagementCadenceDays(workingCompany, ceoNpc);
    workingGame = resolveGovernance({
      ...workingGame,
      companies: {
        ...workingGame.companies,
        [companyKey]: {
          ...workingGame.companies[companyKey],
          nextManagementReviewDay: nextReviewDay,
        },
      },
    });

    if (actionsTaken.length === 0) {
      next = workingGame;
      if (ceoNpcRecord) {
        ceoNpcRecord.analysisNote = `${ceoNpc.name} menyelesaikan review manajemen ${workingCompany.name} dan memilih menunggu jendela aksi berikutnya di sekitar ${formatDateFromDays(nextReviewDay)}.`;
      }
      return;
    }

    next = {
      ...workingGame,
      activityFeed: addFeedEntry(
        workingGame.activityFeed,
        `${formatDateFromDays(workingGame.elapsedDays)}: Tim manajemen ${workingCompany.name} mengeksekusi ${actionsTaken.join(' · ')}.`
      ),
    };
    if (ceoNpcRecord) {
      ceoNpcRecord.analysisNote = `${ceoNpc.name} menyelaraskan eksekutif ${workingCompany.name}: ${actionsTaken.join(', ')}. Review berikutnya sekitar ${formatDateFromDays(nextReviewDay)}.`;
    }
  });

  return resolveGovernance(next);
}

function chooseNpcListingMultiplier(npc: NpcInvestor, ownership: number, convictionGap: number, stressLevel: number): 2 | 3 | 4 {
  if (ownership > 8 || convictionGap < 0.35 || stressLevel < 0.5) return 4;
  if (ownership > 4 || convictionGap < 0.8) return 3;
  return 2;
}

function manageNpcShareListing(current: GameState, npc: NpcInvestor, target: { key: CompanyKey; company: CompanyState; ownership: number; stressLevel: number; finalScore: number }, bestScore: number, reserveCash: number) {
  const existingListing = target.company.shareListings.find((listing) => listing.sellerId === npc.id) ?? null;
  const convictionGap = bestScore - target.finalScore;
  const availableShares = getAvailableSharesToList(target.company, npc.id);
  const urgentExit = target.stressLevel > 0.82 || npc.cash < reserveCash * 0.55;
  const shouldOpenListing = target.ownership > 1.5 && (convictionGap > 0.45 || target.stressLevel > 0.48);

  if (!shouldOpenListing) {
    if (!existingListing) return { next: current, changed: false };
    return {
      next: {
        ...clearShareListing(current, target.key, npc.id),
        activityFeed: addFeedEntry(current.activityFeed, `${formatDateFromDays(current.elapsedDays)}: ${npc.name} menarik kembali listing saham ${target.company.name} karena valuasi dianggap belum cocok.`),
      },
      changed: true,
    };
  }

  if (urgentExit) return { next: current, changed: false };
  const listingShares = clamp(
    (target.company.investors[npc.id] ?? 0) * (convictionGap > 1 ? 0.42 : 0.24 + target.stressLevel * 0.18),
    MIN_TRADE_AMOUNT / Math.max(0.08, getSharePrice(target.company)),
    Math.max(MIN_TRADE_AMOUNT / Math.max(0.08, getSharePrice(target.company)), availableShares)
  );
  if (listingShares <= 0.01 || availableShares <= 0.01) return { next: current, changed: false };
  const priceMultiplier = chooseNpcListingMultiplier(npc, target.ownership, convictionGap, target.stressLevel);
  const normalizedShares = Math.min(listingShares, availableShares);
  if (existingListing && Math.abs(existingListing.sharesAvailable - normalizedShares) < 0.02 && existingListing.priceMultiplier === priceMultiplier) {
    return { next: current, changed: false };
  }
  const next = upsertShareListing(
    current,
    target.key,
    npc.id,
    normalizedShares,
    priceMultiplier,
    `${npc.name} hanya mau melepas saham ${target.company.name} di ${priceMultiplier}x harga normal.`
  );
  return {
    next: {
      ...next,
      activityFeed: addFeedEntry(next.activityFeed, `${formatDateFromDays(next.elapsedDays)}: ${npc.name} membuka ${formatNumber(normalizedShares, 2)} saham ${target.company.name} di ${priceMultiplier}x harga normal.`),
    },
    changed: true,
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
    const listingDecision = manageNpcShareListing(next, npc, currentFocus, best.finalScore, reserveCash);
    if (listingDecision.changed) {
      next = listingDecision.next;
    }
    const bestOutrunsFocus = best.finalScore - currentFocus.finalScore;
    const shouldTrim = currentFocus.ownership > 4
      && (
        bestOutrunsFocus > 0.85
        || currentFocus.dividendYield < 0.08
        || currentFocus.company.boardMood < 0.45
        || currentFocus.stressLevel > 0.55
        || currentFocus.liquidityPenalty > 0.22
      );
    const shouldExit = currentFocus.ownership > 1.2
      && (currentFocus.stressLevel > 0.72 || currentFocus.company.cash < 70 || currentFocus.performanceSignal < 1.55 || currentFocus.finalScore < 1.55);

    if (shouldTrim || shouldExit) {
      const urgentExit = shouldExit && (currentFocus.stressLevel > 0.82 || npc.cash < reserveCash * 0.55);
      if (!urgentExit) {
        npc.analysisNote = `${npc.name} belum mau menjual murah ${currentFocus.company.name}; ia membuka/menjaga listing holder premium sambil menunggu bid yang lebih menarik.`;
        return;
      }
      const ownedValue = (currentFocus.company.investors[npc.id] ?? 0) * currentFocus.sharePrice;
      const trimBudget = shouldExit
        ? clamp(ownedValue * (0.45 + npc.boldness * 0.2), MIN_TRADE_AMOUNT, ownedValue * 0.92)
        : clamp(ownedValue * (0.18 + npc.boldness * 0.22), MIN_TRADE_AMOUNT, ownedValue * 0.6);
      const sellPreview = getTradePreview(next, currentFocus.company, npc.id, npc.cash, currentFocus.company.investors[npc.id] ?? 0, 'sell', trimBudget, 'auto');
      const result = transactShares(next, npc.id, currentFocus.key, 'sell', trimBudget, 'auto');
      if (result.tradedValue > 0) {
        next = {
          ...result.next,
          activityFeed: addFeedEntry(
            result.next.activityFeed,
            `${formatDateFromDays(result.next.elapsedDays)}: ${npc.name} menjual ${formatNumber(result.sharesMoved, 2)} saham ${currentFocus.company.name} via ${sellPreview.routeLabel.toLowerCase()}${shouldExit ? ' untuk kabur dari manajemen buruk.' : ' demi reposisi jangka panjang.'}`
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
    const isFreshEntry = (best.company.investors[npc.id] ?? 0) < 0.01;
    const scoutingThreshold = isFreshEntry
      ? 0.2 + Math.max(0, 0.24 - best.discoverySignal * 0.12) + Math.max(0, best.founderControl - 0.88) * 0.9
      : 0.12;
    if (affordable < MIN_TRADE_AMOUNT || conviction < scoutingThreshold) {
      npc.analysisNote = `${best.company.name} tetap dipantau. ${npc.name} memilih menahan kas karena spread peluang belum cukup tebal.`;
      return;
    }

    const starterDiscipline = isFreshEntry
      ? clamp(0.18 + best.discoverySignal * 0.22 + best.momentumSignal * 0.12 - Math.max(0, best.founderControl - 0.9) * 0.5, 0.12, 0.46)
      : clamp(0.32 + best.discoverySignal * 0.18 + npc.boldness * 0.12, 0.22, 0.68);
    const budget = clamp(
      best.sharePrice * (1.4 + npc.boldness * 1.9 + npc.intelligence * 1.1) + conviction * (16 + best.discoverySignal * 10),
      MIN_TRADE_AMOUNT,
      affordable * starterDiscipline
    );
    const buyPreview = getTradePreview(next, best.company, npc.id, npc.cash, best.company.investors[npc.id] ?? 0, 'buy', budget, 'auto');
    const buyResult = transactShares(next, npc.id, best.key, 'buy', budget, 'auto');
    if (buyResult.tradedValue <= 0) {
      npc.analysisNote = `${best.company.name} menarik, tetapi likuiditas pasar untuk transaksi wajar sedang tipis.`;
      return;
    }

    next = {
      ...buyResult.next,
      activityFeed: addFeedEntry(
        buyResult.next.activityFeed,
        `${formatDateFromDays(buyResult.next.elapsedDays)}: ${npc.name} membeli ${formatNumber(buyResult.sharesMoved, 2)} saham ${best.company.name} via ${buyPreview.routeLabel.toLowerCase()} berdasarkan analisis ${STRATEGY_LABELS[npc.strategy].toLowerCase()}.`
      ),
    };

    const diversified = second && npc.cash > reserveCash + 30 && second.finalScore >= best.finalScore * (0.88 + npc.intelligence * 0.06);
    if (diversified) {
      const sideBudget = clamp(affordable * 0.18, MIN_TRADE_AMOUNT, affordable * 0.24);
      const sideResult = transactShares(next, npc.id, second.key, 'buy', sideBudget, 'auto');
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
  const [investmentDraft, setInvestmentDraft] = useState<InvestmentDraft>({ company: 'cosmic', mode: 'buy', route: 'auto', sliderPercent: 50 });
  const [shareListingDraft, setShareListingDraft] = useState<ShareListingDraft>(DEFAULT_SHARE_LISTING_DRAFT);
  const [statusMessage, setStatusMessage] = useState('Buat profil dulu untuk masuk ke simulasi hidup investor CPU.');
  const [isReleaseMenuOpen, setIsReleaseMenuOpen] = useState(false);
  const [isInvestmentMenuOpen, setIsInvestmentMenuOpen] = useState(false);
  const [isCompaniesFrameOpen, setIsCompaniesFrameOpen] = useState(false);
  const [isInvestorFrameOpen, setIsInvestorFrameOpen] = useState(false);
  const [isNewsFrameOpen, setIsNewsFrameOpen] = useState(false);
  const [isForbesFrameOpen, setIsForbesFrameOpen] = useState(false);
  const [investorFrameCompanyKey, setInvestorFrameCompanyKey] = useState<CompanyKey>('cosmic');
  const [focusedCompanyKey, setFocusedCompanyKey] = useState<CompanyKey | null>(null);
  const [newsCompanyFilter, setNewsCompanyFilter] = useState<'all' | CompanyKey>('all');
  const [companyDetailBackTarget, setCompanyDetailBackTarget] = useState<'game' | 'companies' | 'investor' | 'news' | 'forbes'>('companies');

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as GameState;
      const normalized = resolveGovernance({
        ...parsed,
        companies: Object.fromEntries(
          (Object.entries(parsed.companies) as [CompanyKey, CompanyState][]).map(([key, company]) => [
            key,
            {
              ...company,
              capitalStrain: company.capitalStrain ?? 0,
              lastReleaseDay: company.lastReleaseDay ?? 0,
              lastReleaseCpuScore: company.lastReleaseCpuScore ?? calculateCpuScore(company.upgrades),
              lastReleasePriceIndex: company.lastReleasePriceIndex ?? 1,
              emergencyReleaseAnchorDay: company.emergencyReleaseAnchorDay ?? null,
              emergencyReleaseCount: company.emergencyReleaseCount ?? 0,
              lastEmergencyReleaseDay: company.lastEmergencyReleaseDay ?? null,
              activeBoardVote: company.activeBoardVote ?? null,
              shareListings: sanitizeShareListings({
                ...company,
                shareListings: company.shareListings ?? [],
              }),
            },
          ])
        ) as Record<CompanyKey, CompanyState>,
        npcs: parsed.npcs.map((npc) => ({
          ...npc,
          strategy: npc.strategy ?? 'balanced',
          horizonDays: npc.horizonDays ?? 365,
          reserveRatio: npc.reserveRatio ?? 0.2,
          intelligence: npc.intelligence ?? 0.72,
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
    setInvestmentDraft({ company: profileDraft.selectedCompany, mode: 'buy', route: 'auto', sliderPercent: 50 });
    setShareListingDraft({ ...DEFAULT_SHARE_LISTING_DRAFT, company: profileDraft.selectedCompany });
    setInvestorFrameCompanyKey(profileDraft.selectedCompany);
  };

  const resetProfile = () => {
    window.localStorage.removeItem(STORAGE_KEY);
    setGame(null);
    setProfileDraft(DEFAULT_PROFILE_DRAFT);
    setReleaseDraft(DEFAULT_RELEASE_DRAFT);
    setInvestmentDraft({ company: 'cosmic', mode: 'buy', route: 'auto', sliderPercent: 50 });
    setShareListingDraft(DEFAULT_SHARE_LISTING_DRAFT);
    setStatusMessage('Profil dihapus. Kamu bisa membuat akun baru.');
    setIsInvestmentMenuOpen(false);
    setIsReleaseMenuOpen(false);
    setIsCompaniesFrameOpen(false);
    setIsInvestorFrameOpen(false);
    setIsNewsFrameOpen(false);
    setIsForbesFrameOpen(false);
    setFocusedCompanyKey(null);
  };

  const activeCompany = game ? game.companies[game.player.selectedCompany] : null;
  const focusedCompany = game && focusedCompanyKey ? game.companies[focusedCompanyKey] : null;
  const newsItems = useMemo(() => {
    if (!game) return [];
    const parsed = game.activityFeed
      .map((entry, index) => {
        const category = detectNewsCategory(entry);
        if (!category) return null;
        const companyKey = COMPANY_KEYS.find((key) => entry.includes(game.companies[key].name)) ?? null;
        return { id: `${game.elapsedDays}-${index}`, entry, category, companyKey };
      })
      .filter((item): item is { id: string; entry: string; category: NewsCategory; companyKey: CompanyKey | null } => Boolean(item));
    const filtered = newsCompanyFilter === 'all' ? parsed : parsed.filter((item) => item.companyKey === newsCompanyFilter);
    return filtered.slice(0, 5);
  }, [game, newsCompanyFilter]);
  const forbesList = useMemo(() => {
    if (!game) return [];
    const buildEntry = (investorId: string) => {
      const cash = getInvestorCash(game, investorId);
      const nonCash = COMPANY_KEYS.reduce((sum, key) => {
        const company = game.companies[key];
        return sum + (company.investors[investorId] ?? 0) * getSharePrice(company);
      }, 0);
      return {
        investorId,
        name: investorDisplayName(game, investorId),
        cash,
        nonCash,
        total: cash + nonCash,
      };
    };
    return [buildEntry(game.player.id), ...game.npcs.map((npc) => buildEntry(npc.id))]
      .sort((left, right) => right.total - left.total);
  }, [game]);
  const activePlayerBoardVote = useMemo(() => {
    if (!game) return null;
    const votes = COMPANY_KEYS
      .map((key) => {
        const company = game.companies[key];
        const playerIsBoardMember = company.boardMembers.some((member) => member.id === game.player.id);
        if (!playerIsBoardMember || !company.activeBoardVote) return null;
        if (game.elapsedDays > company.activeBoardVote.endDay) return null;
        return { companyKey: key, company, vote: company.activeBoardVote };
      })
      .filter((entry): entry is { companyKey: CompanyKey; company: CompanyState; vote: BoardVoteState } => Boolean(entry))
      .sort((left, right) => right.vote.startDay - left.vote.startDay);
    return votes[0] ?? null;
  }, [game]);
  const activePricePreset = PRICE_PRESETS[releaseDraft.priceIndex];
  const isPlayerCeo = Boolean(game && activeCompany && activeCompany.ceoId === game.player.id);
  const focusedPlayerIsCeo = Boolean(game && focusedCompany && focusedCompany.ceoId === game.player.id);
  const activePlayerExecutiveRoles = activeCompany && game ? getExecutiveRolesForInvestor(activeCompany, game.player.id) : [];
  const focusedPlayerExecutiveRoles = focusedCompany && game ? getExecutiveRolesForInvestor(focusedCompany, game.player.id) : [];
  const focusedPlayerIsBoardMember = Boolean(focusedCompany && game && focusedCompany.boardMembers.some((member) => member.id === game.player.id));
  const focusedCanManageTechnology = Boolean(focusedCompany && game && hasCompanyAuthority(focusedCompany, game.player.id, 'technology'));
  const focusedCanManageFinance = Boolean(focusedCompany && game && hasCompanyAuthority(focusedCompany, game.player.id, 'finance'));
  const focusedCanReleaseCpu = Boolean(focusedCompany && game && hasCompanyAuthority(focusedCompany, game.player.id, 'release'));
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
    const maxTradeValue = getMaxTradeValue(game, company, game.player.id, game.player.cash, currentShares, investmentDraft.mode, investmentDraft.route);
    return getTradePreview(
      game,
      company,
      game.player.id,
      game.player.cash,
      currentShares,
      investmentDraft.mode,
      getRequestedTradeValue(maxTradeValue, investmentDraft.sliderPercent),
      investmentDraft.route
    );
  }, [game, investmentDraft]);
  const companyCards = useMemo(
    () => {
      if (!game) return [];
      return (Object.values(game.companies) as CompanyState[]).map((company) => ({
        company,
        playerOwnership: getOwnershipPercent(company, game.player.id),
        sharePrice: getSharePrice(company),
        companyValue: getCompanyValuation(company),
      }));
    },
    [game]
  );
  const investorRankings = useMemo(
    () => {
      if (!game) return [];
      return Object.entries(game.companies[investorFrameCompanyKey].investors)
        .map(([investorId, shares]) => ({
          investorId,
          shares,
          amount: shares * getSharePrice(game.companies[investorFrameCompanyKey]),
          ownership: getOwnershipPercent(game.companies[investorFrameCompanyKey], investorId),
          displayName: investorDisplayName(game, investorId),
        }))
        .sort((left, right) => right.shares - left.shares);
    },
    [game, investorFrameCompanyKey]
  );
  const focusedExecutiveCandidatePool = useMemo(
    () => (focusedCompany && game ? getExecutiveCandidatePool(game, focusedCompany, focusedCompany.ceoId) : []),
    [focusedCompany, game]
  );
  const focusedPlayerListing = useMemo(
    () => (focusedCompany && game ? focusedCompany.shareListings.find((listing) => listing.sellerId === game.player.id) ?? null : null),
    [focusedCompany, game]
  );

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
    setShareListingDraft((current) => ({ ...current, company }));
    setReleaseDraft((current) => ({ ...current, series: `${game.companies[company].name} Prime` }));
  };

  const closeTransientLayers = () => {
    setIsReleaseMenuOpen(false);
    setIsInvestmentMenuOpen(false);
    setIsCompaniesFrameOpen(false);
    setIsInvestorFrameOpen(false);
    setIsNewsFrameOpen(false);
    setIsForbesFrameOpen(false);
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

  const openCompanyDetail = (company: CompanyKey, backTarget: 'game' | 'companies' | 'investor' | 'news' | 'forbes' = 'companies') => {
    switchCompany(company);
    closeTransientLayers();
    setCompanyDetailPanels(DEFAULT_COMPANY_DETAIL_PANELS);
    setCompanyDetailBackTarget(backTarget);
    setFocusedCompanyKey(company);
  };

  const closeCompanyDetail = () => {
    setFocusedCompanyKey(null);
    if (companyDetailBackTarget === 'companies') setIsCompaniesFrameOpen(true);
    else if (companyDetailBackTarget === 'investor') setIsInvestorFrameOpen(true);
    else if (companyDetailBackTarget === 'news') setIsNewsFrameOpen(true);
    else if (companyDetailBackTarget === 'forbes') setIsForbesFrameOpen(true);
  };

  const investInCompany = () => {
    if (!game || !investmentPreview) return;
    if (investmentDraft.mode === 'sell' && investmentDraft.route === 'holders') {
      setStatusMessage('Gunakan tombol "Buka saham" di panel Ownership untuk menjual ke sesama investor dengan harga 2x/3x/4x.');
      return;
    }
    const company = game.companies[investmentDraft.company];
    const beforeWasCeo = company.ceoId === game.player.id;
    const requestedTradeValue = getRequestedTradeValue(investmentPreview.maxTradeValue, investmentDraft.sliderPercent);
    const result = transactShares(game, game.player.id, investmentDraft.company, investmentDraft.mode, requestedTradeValue, investmentDraft.route);
    if (result.tradedValue <= 0) {
      setStatusMessage(investmentDraft.mode === 'buy' ? 'Dana pribadi atau likuiditas di rute yang dipilih tidak cukup untuk membeli saham.' : 'Jumlah saham atau demand holder di rute yang dipilih belum cukup.');
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
        `${formatDateFromDays(result.next.elapsedDays)}: ${game.player.name} ${investmentDraft.mode === 'buy' ? 'membeli' : 'menjual'} ${formatNumber(result.sharesMoved, 2)} saham ${company.name} via ${getTradeRouteLabel(result.route).toLowerCase()}.`
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

  const openPlayerShareListing = (companyKey: CompanyKey) => {
    if (!game) return;
    const company = game.companies[companyKey];
    const desiredShares = Number(shareListingDraft.shares);
    const availableShares = getAvailableSharesToList(company, game.player.id);
    if (!Number.isFinite(desiredShares) || desiredShares <= 0) {
      setStatusMessage('Masukkan jumlah saham yang valid untuk dibuka ke sesama investor.');
      return;
    }
    if (desiredShares > availableShares + 0.0001) {
      setStatusMessage('Jumlah saham yang dibuka melebihi saham bebas yang belum sedang kamu listing.');
      return;
    }

    const next = upsertShareListing(
      game,
      companyKey,
      game.player.id,
      desiredShares,
      shareListingDraft.priceMultiplier,
      `${game.player.name} membuka ${formatNumber(desiredShares, 2)} saham ${company.name} di ${shareListingDraft.priceMultiplier}x harga normal.`
    );
    const enriched = {
      ...next,
      activityFeed: addFeedEntry(
        next.activityFeed,
        `${formatDateFromDays(next.elapsedDays)}: ${game.player.name} membuka ${formatNumber(desiredShares, 2)} saham ${company.name} untuk holder lain di ${shareListingDraft.priceMultiplier}x harga normal.`
      ),
    };
    setGame(enriched);
    setStatusMessage(`Listing holder dibuka di ${shareListingDraft.priceMultiplier}x harga normal.`);
    setShareListingDraft((current) => ({ ...current, shares: '' }));
  };

  const cancelPlayerShareListing = (companyKey: CompanyKey) => {
    if (!game) return;
    const company = game.companies[companyKey];
    const next = clearShareListing(game, companyKey, game.player.id);
    setGame({
      ...next,
      activityFeed: addFeedEntry(
        next.activityFeed,
        `${formatDateFromDays(next.elapsedDays)}: ${game.player.name} menutup listing holder untuk saham ${company.name}.`
      ),
    });
    setStatusMessage(`Listing holder ${company.name} ditutup.`);
  };

  const improveUpgrade = (key: UpgradeKey, companyKey?: CompanyKey) => {
    const targetCompany = game ? game.companies[companyKey ?? game.player.selectedCompany] : null;
    if (!game || !targetCompany || !hasCompanyAuthority(targetCompany, game.player.id, 'technology')) {
      setStatusMessage('Hanya CEO atau CTO yang bisa mengubah roadmap teknologi.');
      return;
    }
    const upgrade = targetCompany.upgrades[key];
    const cost = getUpgradeCost(key, upgrade, targetCompany);
    if (targetCompany.research < cost) {
      setStatusMessage('Research point perusahaan belum cukup.');
      return;
    }

    const nextValue = key === 'lithography' || key === 'powerEfficiency'
      ? Math.max(key === 'lithography' ? 5 : 28, upgrade.value + upgrade.step)
      : upgrade.value + upgrade.step;

    setGame((current) => {
      if (!current) return current;
      const resolvedCompanyKey = companyKey ?? current.player.selectedCompany;
      const company = current.companies[resolvedCompanyKey];
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
    setStatusMessage(`${targetCompany.name}: ${upgrade.label} berhasil ditingkatkan.`);
  };

  const hireTeam = (key: TeamKey, companyKey?: CompanyKey) => {
    const targetCompany = game ? game.companies[companyKey ?? game.player.selectedCompany] : null;
    if (!game || !targetCompany) return;
    const requiredDomain: ExecutiveDomain = key === 'marketing' ? 'marketing' : key === 'researchers' ? 'technology' : 'operations';
    if (!hasCompanyAuthority(targetCompany, game.player.id, requiredDomain)) {
      setStatusMessage(
        requiredDomain === 'marketing'
          ? 'Hanya CEO atau CMO yang bisa ekspansi marketing.'
          : requiredDomain === 'technology'
            ? 'Hanya CEO atau CTO yang bisa ekspansi R&D.'
            : 'Hanya CEO atau COO yang bisa ekspansi operasi.'
      );
      return;
    }
    const cost = getTeamCost(targetCompany.teams[key]);
    if (targetCompany.cash < cost) {
      setStatusMessage('Kas perusahaan belum cukup untuk ekspansi tim.');
      return;
    }

    setGame((current) => {
      if (!current) return current;
      const resolvedCompanyKey = companyKey ?? current.player.selectedCompany;
      const company = current.companies[resolvedCompanyKey];
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
    setStatusMessage(`${targetCompany.name}: ${targetCompany.teams[key].label} diperbesar.`);
  };

  const launchCpu = () => {
    if (!game || !activeCompany || !hasCompanyAuthority(activeCompany, game.player.id, 'release')) {
      setStatusMessage('Kamu harus menjadi CEO, CTO, atau CMO untuk merilis CPU perusahaan ini.');
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
          lastReleaseDay: game.elapsedDays,
          lastReleaseCpuScore: activeCpuScore,
          lastReleasePriceIndex: releaseDraft.priceIndex,
          lastRelease: `${series} ${cpuName} rilis ${formatDateFromDays(game.elapsedDays)} (${activePricePreset.label.toLowerCase()}).`,
        },
      },
      activityFeed: addFeedEntry(
        game.activityFeed,
        `${formatDateFromDays(game.elapsedDays)}: ${activeCompany.name} merilis ${series} ${cpuName} dan membukukan $${formatMoneyCompact(launchRevenue)}.`
      ),
    });

    setGame(next);
    setStatusMessage(`${series} ${cpuName} sukses dirilis.`);
    setReleaseDraft({ ...releaseDraft, cpuName: `PX-${String(activeCompany.releaseCount + 1).padStart(2, '0')}` });
    setIsReleaseMenuOpen(false);
  };

  const rotateExecutiveAppointment = (companyKey: CompanyKey, role: ExecutiveRole) => {
    setGame((current) => {
      if (!current) return current;
      const company = current.companies[companyKey];
      if (company.ceoId !== current.player.id) return current;
      const pool = getExecutiveCandidatePool(current, company, company.ceoId);
      if (pool.length === 0) return current;
      const currentOccupantId = company.executives[role]?.occupantId;
      const currentIndex = currentOccupantId ? pool.indexOf(currentOccupantId) : -1;
      const nextOccupantId = pool[(currentIndex + 1 + pool.length) % pool.length];
      return resolveGovernance({
        ...current,
        companies: {
          ...current.companies,
          [companyKey]: {
            ...company,
            executives: {
              ...company.executives,
              [role]: createExecutiveRecord(
                current,
                company,
                role,
                nextOccupantId,
                current.player.id,
                `${current.player.name} mendelegasikan domain ${EXECUTIVE_ROLE_META[role].domain} kepada ${investorDisplayName(current, nextOccupantId)}.`
              ),
            },
            executivePulse: `${current.player.name} sedang merapikan struktur eksekutif ${company.name}.`,
          },
        },
      });
    });
    setStatusMessage(`${EXECUTIVE_ROLE_META[role].title} diputar ke kandidat berikutnya.`);
  };

  const clearExecutiveAppointment = (companyKey: CompanyKey, role: ExecutiveRole) => {
    setGame((current) => {
      if (!current) return current;
      const company = current.companies[companyKey];
      if (company.ceoId !== current.player.id) return current;
      return resolveGovernance({
        ...current,
        companies: {
          ...current.companies,
          [companyKey]: {
            ...company,
            executives: {
              ...company.executives,
              [role]: null,
            },
            executivePulse: `${current.player.name} mengosongkan kursi ${EXECUTIVE_ROLE_META[role].title} untuk menjaga struktur tetap lean.`,
          },
        },
      });
    });
    setStatusMessage(`${EXECUTIVE_ROLE_META[role].title} dikosongkan.`);
  };

  const adjustPayoutBias = (direction: 'up' | 'down', companyKey?: CompanyKey) => {
    const targetCompany = game ? game.companies[companyKey ?? game.player.selectedCompany] : null;
    if (!game || !targetCompany || !hasCompanyAuthority(targetCompany, game.player.id, 'finance')) {
      setStatusMessage('Hanya CEO atau CFO yang bisa mengubah payout policy.');
      return;
    }

    setGame((current) => {
      if (!current) return current;
      const resolvedCompanyKey = companyKey ?? current.player.selectedCompany;
      const company = current.companies[resolvedCompanyKey];
      const delta = direction === 'up' ? 0.015 : -0.02;
      return resolveGovernance({
        ...current,
        companies: {
          ...current.companies,
          [company.key]: {
            ...company,
            payoutRatio: clamp(company.payoutRatio + delta, 0.08, 0.34),
            executivePulse: `${investorDisplayName(current, current.player.id)} ${direction === 'up' ? 'menaikkan' : 'menurunkan'} payout policy ${company.name}.`,
          },
        },
      });
    });
    setStatusMessage(direction === 'up' ? 'Payout policy dinaikkan sedikit.' : 'Payout policy dibuat lebih defensif.');
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
              <strong>$ {formatMoneyCompact(PLAYER_STARTING_CASH)}</strong>
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
              <strong>$ {formatMoneyCompact(game.player.cash, 2)}</strong>
            </div>
            <div>
              <span>Net worth</span>
              <strong>$ {formatMoneyCompact(playerNetWorth, 2)}</strong>
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
              <strong>
                {isPlayerCeo
                  ? `CEO ${activeCompany?.name}`
                  : activePlayerExecutiveRoles.length > 0
                    ? activePlayerExecutiveRoles.map((role) => EXECUTIVE_ROLE_META[role].title).join(' / ')
                    : 'Investor'}
              </strong>
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
                    <strong>$ {formatMoneyCompact((activeCompany?.dividendPerShare ?? 0) * (activeCompany?.investors[game.player.id] ?? 0), 2)}</strong>
                  </div>
                  <div>
                    <span>Gaji CEO/hari</span>
                    <strong>$ {formatMoneyCompact(isPlayerCeo && activeCompany ? activeCompany.ceoSalaryPerDay : 0, 2)}</strong>
                  </div>
                  <div>
                    <span>Nilai perusahaan fokus</span>
                    <strong>$ {formatMoneyCompact(activeCompany ? getCompanyValuation(activeCompany) : 0, 2)}</strong>
                  </div>
                  <div>
                    <span>Kepemilikan</span>
                    <strong>{activeCompany ? `${formatNumber(getOwnershipPercent(activeCompany, game.player.id), 1)}%` : '0%'}</strong>
                  </div>
                  <div>
                    <span>Akses eksekutif</span>
                    <strong>
                      {isPlayerCeo
                        ? 'CEO full access'
                        : activePlayerExecutiveRoles.length > 0
                          ? activePlayerExecutiveRoles.map((role) => EXECUTIVE_ROLE_META[role].title).join(' · ')
                          : 'Belum punya mandat'}
                    </strong>
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
                  <button type="button" className={styles.ghostButton} onClick={() => activeCompany && openCompanyDetail(activeCompany.key, 'game')}>
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
              <div className={styles.panelBody}>
                <div className={styles.actionRow}>
                  <button type="button" className={styles.primaryButton} onClick={() => setIsNewsFrameOpen(true)}>
                    Buka News
                  </button>
                  <button type="button" className={styles.secondaryButton} onClick={() => setIsForbesFrameOpen(true)}>
                    Buka Forbes
                  </button>
                </div>
                <div className={styles.memoCard}>
                  <p className={styles.panelTag}>Intel split frame</p>
                  <p>
                    News memuat 5 berita terbaru (dengan filter perusahaan). Forbes memuat ranking kekayaan gabungan 35 AI NPC + 1 pemain.
                  </p>
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
                  <button key={company.key} type="button" className={styles.companyCardButton} onClick={() => openCompanyDetail(company.key, 'companies')}>
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
                        <div>
                          <span>Exec seats</span>
                          <strong>{formatNumber(EXECUTIVE_ROLES.filter((role) => company.executives[role]).length)}</strong>
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

      {isNewsFrameOpen ? (
        <div className={styles.screenFrameOverlay} role="presentation" onClick={() => setIsNewsFrameOpen(false)}>
          <section className={styles.screenFrameCard} role="dialog" aria-modal="true" aria-label="News frame" onClick={(event) => event.stopPropagation()}>
            <div className={styles.screenFrameHeader}>
              <div>
                <p className={styles.panelTag}>News</p>
                <h2>5 berita terbaru pasar CPU</h2>
              </div>
              <button type="button" className={styles.closeButton} onClick={() => setIsNewsFrameOpen(false)} aria-label="Kembali dari news">
                ←
              </button>
            </div>
            <div className={styles.screenFrameBody}>
              <div className={styles.quickGrid}>
                <button type="button" className={newsCompanyFilter === 'all' ? styles.quickButtonActive : styles.quickButton} onClick={() => setNewsCompanyFilter('all')}>
                  Semua
                </button>
                {COMPANY_KEYS.map((companyKey) => (
                  <button key={companyKey} type="button" className={newsCompanyFilter === companyKey ? styles.quickButtonActive : styles.quickButton} onClick={() => setNewsCompanyFilter(companyKey)}>
                    {game.companies[companyKey].name}
                  </button>
                ))}
              </div>
              <div className={styles.panelList}>
                {newsItems.length > 0 ? newsItems.map((item) => (
                  <article key={item.id} className={styles.itemCard}>
                    <div className={styles.itemTop}>
                      <p className={styles.itemLabel}>{getNewsCategoryLabel(item.category)}</p>
                      <span className={styles.costPill}>{item.companyKey ? game.companies[item.companyKey].name : 'Global'}</span>
                    </div>
                    <p className={styles.itemDescription}>{item.entry}</p>
                  </article>
                )) : (
                  <div className={styles.memoCard}>
                    <p className={styles.panelTag}>News kosong</p>
                    <p>Belum ada event yang memenuhi kategori berita untuk filter saat ini.</p>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {isForbesFrameOpen ? (
        <div className={styles.screenFrameOverlay} role="presentation" onClick={() => setIsForbesFrameOpen(false)}>
          <section className={styles.screenFrameCard} role="dialog" aria-modal="true" aria-label="Forbes frame" onClick={(event) => event.stopPropagation()}>
            <div className={styles.screenFrameHeader}>
              <div>
                <p className={styles.panelTag}>Forbes</p>
                <h2>Investor terkaya dunia (35 AI + 1 pemain)</h2>
              </div>
              <button type="button" className={styles.closeButton} onClick={() => setIsForbesFrameOpen(false)} aria-label="Kembali dari forbes">
                ←
              </button>
            </div>
            <div className={styles.screenFrameBody}>
              <div className={styles.panelList}>
                {forbesList.map((entry, index) => (
                  <article key={entry.investorId} className={styles.itemCard}>
                    <div className={styles.itemTop}>
                      <div>
                        <p className={styles.itemLabel}>Forbes #{index + 1}</p>
                        <h3>{entry.name}</h3>
                      </div>
                      <span className={styles.costPill}>$ {formatMoneyCompact(entry.total, 2)}</span>
                    </div>
                    <p className={styles.itemDescription}>
                      Tunai $ {formatMoneyCompact(entry.cash, 2)} · Non tunai $ {formatMoneyCompact(entry.nonCash, 2)}.
                    </p>
                  </article>
                ))}
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {activePlayerBoardVote ? (
        <div className={styles.modalOverlay} role="presentation" onClick={() => {}}>
          <section className={styles.modalCard} role="dialog" aria-modal="true" aria-label="Voting dewan direksi" onClick={(event) => event.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <p className={styles.panelTag}>Board voting (7 hari)</p>
                <h2>{activePlayerBoardVote.company.name}</h2>
              </div>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.infoRow}>
                <div>
                  <span>Jenis voting</span>
                  <strong>{activePlayerBoardVote.vote.kind}</strong>
                </div>
                <div>
                  <span>Pengusul</span>
                  <strong>{investorDisplayName(game, activePlayerBoardVote.vote.proposerId)}</strong>
                </div>
                <div>
                  <span>Subjek</span>
                  <strong>{activePlayerBoardVote.vote.subject}</strong>
                </div>
                <div>
                  <span>Sisa hari</span>
                  <strong>{formatNumber(Math.max(0, activePlayerBoardVote.vote.endDay - game.elapsedDays), 1)}</strong>
                </div>
                <div>
                  <span>Setuju</span>
                  <strong>{formatNumber(activePlayerBoardVote.vote.yesWeight, 2)}</strong>
                </div>
                <div>
                  <span>Tidak setuju</span>
                  <strong>{formatNumber(activePlayerBoardVote.vote.noWeight, 2)}</strong>
                </div>
                {activePlayerBoardVote.vote.investmentValue ? (
                  <div>
                    <span>Kas diinvestasikan</span>
                    <strong>$ {formatMoneyCompact(activePlayerBoardVote.vote.investmentValue, 2)}</strong>
                  </div>
                ) : null}
                {activePlayerBoardVote.vote.withdrawalValue ? (
                  <div>
                    <span>Kas ditarik</span>
                    <strong>$ {formatMoneyCompact(activePlayerBoardVote.vote.withdrawalValue, 2)}</strong>
                  </div>
                ) : null}
              </div>
              <div className={styles.memoCard}>
                <p className={styles.panelTag}>Alasan</p>
                <p>{activePlayerBoardVote.vote.reason}</p>
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
                    <strong>$ {formatMoneyCompact(getCompanyValuation(focusedCompany), 2)}</strong>
                  </div>
                  <div>
                    <span>CPU score</span>
                    <strong>{formatNumber(focusedCpuScore, 0)}</strong>
                  </div>
                  <div>
                    <span>Dividen/share/hari</span>
                    <strong>$ {formatMoneyCompact(focusedCompany.dividendPerShare, 2)}</strong>
                  </div>
                  <div>
                    <span>Gaji CEO/hari</span>
                    <strong>$ {formatMoneyCompact(focusedCompany.ceoSalaryPerDay, 2)}</strong>
                  </div>
                  <div>
                    <span>Eksekutif aktif</span>
                    <strong>{formatNumber(EXECUTIVE_ROLES.filter((role) => focusedCompany.executives[role]).length)} kursi</strong>
                  </div>
                  <div>
                    <span>Payroll eksekutif</span>
                    <strong>$ {formatMoneyCompact(focusedCompany.executivePayrollPerDay, 2)}</strong>
                  </div>
                </div>
                <div className={styles.actionRow}>
                  <button type="button" className={styles.ghostButton} onClick={closeCompanyDetail}>
                    Go back
                  </button>
                  <button type="button" className={styles.secondaryButton} onClick={() => { switchCompany(focusedCompany.key); setInvestmentDraft((current) => ({ ...current, company: focusedCompany.key })); closeTransientLayers(); setIsInvestmentMenuOpen(true); }}>
                    Beli / jual saham
                  </button>
                  <button type="button" className={styles.primaryButton} onClick={() => { switchCompany(focusedCompany.key); closeTransientLayers(); setIsReleaseMenuOpen(true); }} disabled={!focusedCanReleaseCpu}>
                    {focusedCanReleaseCpu ? 'Release CPU' : 'Butuh CEO/CTO/CMO'}
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
                        <strong>$ {formatMoneyCompact(focusedCompany.cash, 2)}</strong>
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
                        <strong>$ {formatMoneyCompact(focusedCompany.revenuePerDay, 2)}</strong>
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
                        <strong>$ {formatMoneyCompact(getSharePrice(focusedCompany) * focusedCompany.sharesOutstanding, 2)}</strong>
                      </div>
                      <div>
                        <span>Nilai/lembar intrinsik</span>
                        <strong>$ {formatNumber(getCompanyValuation(focusedCompany) / focusedCompany.sharesOutstanding, 2)}</strong>
                      </div>
                      <div>
                        <span>Capital strain</span>
                        <strong>$ {formatMoneyCompact(focusedCompany.capitalStrain, 2)}</strong>
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
                <button type="button" className={styles.panelToggle} onClick={() => toggleCompanyDetailPanel('management')}>
                  <div>
                    <p className={styles.panelTag}>Management</p>
                    <h2>CEO & jabatan eksekutif opsional</h2>
                  </div>
                  <span>{companyDetailPanels.management ? 'Tutup' : 'Buka'}</span>
                </button>
                {companyDetailPanels.management ? (
                  <div className={styles.panelList}>
                    <div className={styles.memoCard}>
                      <p className={styles.panelTag}>Executive pulse</p>
                      <p>{focusedCompany.executivePulse}</p>
                    </div>
                    <div className={styles.infoRow}>
                      <div>
                        <span>Payroll eksekutif</span>
                        <strong>$ {formatNumber(focusedCompany.executivePayrollPerDay, 2)}M/hari</strong>
                      </div>
                      <div>
                        <span>Kandidat manusia</span>
                        <strong>{formatNumber(focusedExecutiveCandidatePool.length)} orang</strong>
                      </div>
                      <div>
                        <span>Mandat player</span>
                        <strong>{focusedPlayerIsCeo ? 'CEO' : focusedPlayerExecutiveRoles.map((role) => EXECUTIVE_ROLE_META[role].title).join(' / ') || 'Belum ada'}</strong>
                      </div>
                      <div>
                        <span>Payout policy</span>
                        <strong>{formatNumber(focusedCompany.payoutRatio * 100, 1)}%</strong>
                      </div>
                    </div>

                    {EXECUTIVE_ROLES.map((role) => {
                      const meta = EXECUTIVE_ROLE_META[role];
                      const executive = focusedCompany.executives[role];
                      return (
                        <article key={role} className={styles.itemCard}>
                          <div className={styles.itemTop}>
                            <div>
                              <p className={styles.itemLabel}>{meta.domain}</p>
                              <h3>{meta.title}</h3>
                            </div>
                            <span className={styles.costPill}>{executive ? executive.occupantName : 'Vacant'}</span>
                          </div>
                          <p className={styles.itemDescription}>{executive ? executive.note : `CEO dapat membiarkan kursi ${meta.title} kosong jika belum dibutuhkan.`}</p>
                          <div className={styles.optionList}>
                            <span className={styles.optionPill}>{meta.permissionLabel}</span>
                            <span className={styles.optionPill}>{meta.mandate}</span>
                            {executive ? <span className={styles.optionPill}>Efektivitas {formatNumber(executive.effectiveness, 2)}x</span> : null}
                          </div>
                          {focusedPlayerIsCeo ? (
                            <div className={styles.actionRow}>
                              <button type="button" className={styles.secondaryButton} onClick={() => rotateExecutiveAppointment(focusedCompany.key, role)}>
                                {executive ? 'Rotasi kandidat' : 'Tunjuk kandidat'}
                              </button>
                              <button type="button" className={styles.ghostButton} onClick={() => clearExecutiveAppointment(focusedCompany.key, role)} disabled={!executive}>
                                Kosongkan kursi
                              </button>
                            </div>
                          ) : null}
                        </article>
                      );
                    })}

                    <div className={styles.actionRow}>
                      <button type="button" className={styles.secondaryButton} onClick={() => adjustPayoutBias('down', focusedCompany.key)} disabled={!focusedCanManageFinance}>
                        {focusedCanManageFinance ? 'Turunkan payout' : 'Butuh CEO/CFO'}
                      </button>
                      <button type="button" className={styles.ghostButton} onClick={() => adjustPayoutBias('up', focusedCompany.key)} disabled={!focusedCanManageFinance}>
                        {focusedCanManageFinance ? 'Naikkan payout' : 'Butuh CEO/CFO'}
                      </button>
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
                      <p>7 kursi dewan memilih CEO dari performa dan ownership, lalu ikut menekan/usul struktur COO, CFO, CTO, dan CMO bila perusahaan membutuhkannya.</p>
                    </div>
                    {focusedPlayerIsBoardMember ? (
                      <div className={styles.memoCard}>
                        <p className={styles.panelTag}>Mandat dewan player</p>
                        <p>
                          Kamu sedang duduk sebagai anggota Dewan Direksi {focusedCompany.name}. Proposal aktif akan muncul sebagai pop-up voting sampai 7 hari berakhir.
                        </p>
                      </div>
                    ) : null}
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
                    {(focusedCompany.investors[game.player.id] ?? 0) > 0.01 ? (
                      <article className={styles.itemCard}>
                        <div className={styles.itemTop}>
                          <div>
                            <p className={styles.itemLabel}>Holder listing</p>
                            <h3>Buka saham</h3>
                          </div>
                          <span className={styles.costPill}>
                            {focusedPlayerListing ? `${formatNumber(focusedPlayerListing.sharesAvailable, 2)} saham @ ${focusedPlayerListing.priceMultiplier}x` : 'Belum ada listing'}
                          </span>
                        </div>
                        <p className={styles.itemDescription}>
                          Buka sebagian sahammu agar sesama investor bisa membeli lot yang benar-benar kamu tawarkan, tanpa auto menjual semuanya sekaligus.
                        </p>
                        <label className={styles.field}>
                          <span>Nominal saham dibuka</span>
                          <input
                            value={shareListingDraft.company === focusedCompany.key ? shareListingDraft.shares : ''}
                            onChange={(event) => setShareListingDraft((current) => ({ ...current, company: focusedCompany.key, shares: event.target.value }))}
                            placeholder={`Maks ${formatNumber(getAvailableSharesToList(focusedCompany, game.player.id), 2)} saham`}
                          />
                        </label>
                        <div className={styles.quickGrid}>
                          {([2, 3, 4] as const).map((multiplier) => (
                            <button
                              key={multiplier}
                              type="button"
                              className={(shareListingDraft.company === focusedCompany.key ? shareListingDraft.priceMultiplier : 2) === multiplier ? styles.quickButtonActive : styles.quickButton}
                              onClick={() => setShareListingDraft((current) => ({ ...current, company: focusedCompany.key, priceMultiplier: multiplier }))}
                            >
                              {multiplier}x normal
                            </button>
                          ))}
                        </div>
                        <div className={styles.actionRow}>
                          <button type="button" className={styles.secondaryButton} onClick={() => openPlayerShareListing(focusedCompany.key)}>
                            Buka saham
                          </button>
                          <button type="button" className={styles.ghostButton} onClick={() => cancelPlayerShareListing(focusedCompany.key)} disabled={!focusedPlayerListing}>
                            Tutup listing
                          </button>
                        </div>
                      </article>
                    ) : null}

                    {focusedCompany.shareListings.length > 0 ? (
                      <article className={styles.itemCard}>
                        <div className={styles.itemTop}>
                          <div>
                            <p className={styles.itemLabel}>Listing aktif</p>
                            <h3>Order book holder</h3>
                          </div>
                          <span className={styles.costPill}>{formatNumber(focusedCompany.shareListings.length)} listing</span>
                        </div>
                        <div className={styles.optionList}>
                          {getVisibleShareListings(focusedCompany).map((listing) => (
                            <span key={`${listing.sellerId}-${listing.openedDay}`} className={styles.optionPill}>
                              {investorDisplayName(game, listing.sellerId)} · {formatNumber(listing.sharesAvailable, 2)} saham · {listing.priceMultiplier}x
                            </span>
                          ))}
                        </div>
                      </article>
                    ) : null}

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
                          <button type="button" className={styles.secondaryButton} onClick={() => improveUpgrade(key, focusedCompany.key)} disabled={!focusedCanManageTechnology || focusedCompany.research < cost}>
                            {!focusedCanManageTechnology ? 'CEO/CTO only' : focusedCompany.research >= cost ? 'Upgrade' : 'RP kurang'}
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
                            onClick={() => hireTeam(key, focusedCompany.key)}
                            disabled={
                              !(
                                (key === 'researchers'
                                  ? focusedCanManageTechnology
                                  : key === 'marketing'
                                    ? Boolean(focusedCompany && game && hasCompanyAuthority(focusedCompany, game.player.id, 'marketing'))
                                    : Boolean(focusedCompany && game && hasCompanyAuthority(focusedCompany, game.player.id, 'operations')))
                                && focusedCompany.cash >= cost
                              )
                            }
                          >
                            {key === 'researchers'
                              ? focusedCanManageTechnology
                                ? focusedCompany.cash >= cost ? 'Expand' : 'Dana kurang'
                                : 'CEO/CTO only'
                              : key === 'marketing'
                                ? (focusedCompany && game && hasCompanyAuthority(focusedCompany, game.player.id, 'marketing'))
                                  ? focusedCompany.cash >= cost ? 'Expand' : 'Dana kurang'
                                  : 'CEO/CMO only'
                                : (focusedCompany && game && hasCompanyAuthority(focusedCompany, game.player.id, 'operations'))
                                  ? focusedCompany.cash >= cost ? 'Expand' : 'Dana kurang'
                                  : 'CEO/COO only'}
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

              <div className={styles.quickGrid}>
                {(['auto', 'company', 'holders'] as TradeRoute[]).map((route) => (
                  <button key={route} type="button" className={investmentDraft.route === route ? styles.quickButtonActive : styles.quickButton} onClick={() => setInvestmentDraft((current) => ({ ...current, route }))}>
                    {route === 'auto' ? 'Auto' : route === 'company' ? 'Perusahaan' : 'Holder'}
                  </button>
                ))}
              </div>

              <div className={styles.sliderCard}>
                <div className={styles.sliderHeader}>
                  <div>
                    <p className={styles.panelTag}>Slider transaksi</p>
                    <strong>$ {formatNumber(investmentPreview.grossTradeValue, 2)}M · {formatNumber(investmentPreview.sharesMoved / game.companies[investmentDraft.company].sharesOutstanding * 100, 2)}%</strong>
                  </div>
                  <small>
                    {investmentDraft.mode === 'buy' ? 'Max buy' : 'Max sell'}: $ {formatNumber(investmentPreview.maxTradeValue, 2)}M · {investmentPreview.routeLabel}
                  </small>
                </div>
                <input className={styles.slider} type="range" min={0} max={100} step={1} value={investmentDraft.sliderPercent} onChange={(event) => setInvestmentDraft((current) => ({ ...current, sliderPercent: Number(event.target.value) }))} aria-label="Slider nilai transaksi" />
                <div className={styles.sliderLabels}>
                  {TRANSACTION_SLIDER_STOPS.map((stop) => (
                    <span key={stop.value}>{stop.label}</span>
                  ))}
                </div>
                <p className={styles.compactHint}>
                  {investmentDraft.mode === 'sell' && investmentDraft.route === 'holders'
                    ? 'Penjualan ke holder dilakukan lewat listing “Buka saham” agar order bisa dibeli parsial oleh beberapa investor.'
                    : `${investmentDraft.mode === 'buy' ? 'Bayar' : 'Jual'} $ ${formatNumber(Math.abs(investmentPreview.netCashDelta), 2)}M untuk ${formatNumber(investmentPreview.sharesMoved, 2)} saham · fee ${formatNumber(investmentPreview.feeRate * 100, 1)}% · ${investmentPreview.counterpartyLabel}`}
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
                <div>
                  <span>Delta kas perusahaan</span>
                  <strong>$ {formatNumber(investmentPreview.companyCashDelta, 2)}M</strong>
                </div>
                <div>
                  <span>Delta nilai perusahaan</span>
                  <strong>$ {formatNumber(investmentPreview.companyValueDelta, 2)}M</strong>
                </div>
              </div>

              <button type="button" className={styles.primaryButton} onClick={investInCompany} disabled={investmentPreview.grossTradeValue < MIN_TRADE_AMOUNT}>
                {investmentPreview.grossTradeValue < MIN_TRADE_AMOUNT
                  ? 'Nilai aktual terlalu kecil'
                  : investmentDraft.mode === 'sell' && investmentDraft.route === 'holders'
                    ? 'Gunakan Buka saham'
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
