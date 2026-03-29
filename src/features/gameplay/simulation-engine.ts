import { generateCatalogCompanyName } from '@/features/cpu-foundry/company-name-catalog';

export type UpgradeKey = 'architecture' | 'lithography' | 'clockSpeed' | 'coreDesign' | 'cacheStack' | 'powerEfficiency';
export type TeamKey = 'researchers' | 'marketing' | 'fabrication';
export type PanelKey = 'profile' | 'intel';
export type CompanyDetailPanelKey = 'overview' | 'management' | 'operations' | 'ownership' | 'governance' | 'intel';
export type CompanyKey = 'cosmic' | 'rmd' | 'heroscop' | 'venture4' | 'venture5' | 'venture6' | 'venture7' | 'venture8';
export type InvestorActionMode = 'buy' | 'sell';
export type StrategyStyle = 'value' | 'growth' | 'dividend' | 'activist' | 'balanced';
export type ExecutiveRole = 'coo' | 'cfo' | 'cto' | 'cmo';
export type ExecutiveDomain = 'operations' | 'finance' | 'technology' | 'marketing';
export type TradeRoute = 'auto' | 'company' | 'holders';
export type CompanyField = 'semiconductor' | 'game' | 'software';
export type SoftwareSpecialization = 'app-store' | 'operating-system' | 'entertainment-apps' | 'utility-apps';

export type UpgradeState = {
  label: string;
  unit: string;
  decimals: number;
  value: number;
  step: number;
  baseCost: number;
  costGrowth: number;
  description: string;
};

export type TeamState = {
  label: string;
  description: string;
  count: number;
  baseCost: number;
  costGrowth: number;
};

export type BoardMember = {
  id: string;
  name: string;
  seatType: 'chair' | 'shareholder' | 'founder' | 'independent' | 'employee';
  voteWeight: number;
  agenda: string;
};

export type BoardVoteKind = 'pengangkatan' | 'penggantian' | 'pemecatan' | 'investasi';

export type BoardDecisionAction =
  | { type: 'invest'; sourceCompanyKey: CompanyKey; targetCompanyKey: CompanyKey; amount: number }
  | { type: 'withdraw'; sourceCompanyKey: CompanyKey; targetCompanyKey: CompanyKey; amount: number }
  | { type: 'appoint'; companyKey: CompanyKey; role: ExecutiveRole; candidateId: string }
  | { type: 'dismiss'; companyKey: CompanyKey; role: ExecutiveRole };

export type BoardVoteState = {
  id: string;
  kind: BoardVoteKind;
  proposerId: string;
  subject: string;
  reason: string;
  memberVotes: Record<string, 'yes' | 'no'>;
  investmentValue?: number;
  withdrawalValue?: number;
  decisionAction?: BoardDecisionAction;
  yesWeight: number;
  noWeight: number;
  startDay: number;
  endDay: number;
};

export type CompanyExecutive = {
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

export type ShareListing = {
  sellerId: string;
  sharesAvailable: number;
  priceMultiplier: 2 | 3 | 4;
  openedDay: number;
  note: string;
};

export type AppStoreLicenseStatus = 'pending' | 'approved' | 'rejected';

export type AppStoreLicenseRequest = {
  id: string;
  gameCompanyKey: CompanyKey;
  softwareCompanyKey: CompanyKey;
  requesterId: string;
  requestedDay: number;
  status: AppStoreLicenseStatus;
  decisionDay: number | null;
  revenueShare: number;
  monthlyDownloads: number;
  publishedReleaseCount: number;
  lastPublishedDay: number | null;
  note: string;
};

export type AppStoreProfile = {
  discovery: number;
  infrastructure: number;
  trust: number;
};

export type CompanyState = {
  key: CompanyKey;
  field: CompanyField;
  softwareSpecialization?: SoftwareSpecialization | null;
  name: string;
  founder: string;
  founderInvestorId: string;
  ceoId: string;
  ceoName: string;
  cash: number;
  research: number;
  researchAssetValue?: number;
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
  shareSheetTotal: number;
  lastShareSheetChangeDay: number;
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
  portfolioValue: number;
  shareListings: ShareListing[];
  activeBoardVote: BoardVoteState | null;
  boardVoteWindowStartDay: number;
  boardVoteCountInWindow: number;
  isEstablished: boolean;
  establishedDay: number | null;
  appStorePassiveIncomePerDay: number;
  appStoreDownloadsPerDay: number;
  appStoreProfile: AppStoreProfile;
};

export type PlayerProfile = {
  id: string;
  name: string;
  background: string;
  cash: number;
  selectedCompany: CompanyKey;
  companyType: 'cpu' | 'game' | 'software';
};

export type NpcInvestor = {
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
  lastActionDay?: number;
  convictionBias?: number;
};

export type GameState = {
  elapsedDays: number;
  tickCount: number;
  player: PlayerProfile;
  companies: Record<CompanyKey, CompanyState>;
  plans: Record<CompanyKey, CompanyEstablishmentPlan>;
  communityPlans: CommunityCompanyPlan[];
  appStoreLicenseRequests: AppStoreLicenseRequest[];
  npcs: NpcInvestor[];
  activityFeed: string[];
};

export type CommunityCompanyPlan = {
  id: string;
  field: CompanyField;
  softwareSpecialization?: SoftwareSpecialization | null;
  companyName: string;
  founderId: string;
  founderName: string;
  startDay: number;
  dueDay: number;
  targetCapital: number;
  pledgedCapital: number;
  investorIds: string[];
  status: 'funding' | 'established' | 'expired';
  competesWith: string;
};

export type PlanInvestorPledge = {
  investorId: string;
  amount: number;
  pledgedDay: number;
};

export type CompanyEstablishmentPlan = {
  companyKey: CompanyKey;
  field: CompanyField;
  softwareSpecialization?: SoftwareSpecialization | null;
  companyName: string;
  founderInvestorId: string;
  founderName: string;
  startDay: number;
  dueDay: number;
  targetCapital: number;
  pledgedCapital: number;
  pledges: PlanInvestorPledge[];
  shareSheetTotal?: number;
  isEstablished: boolean;
};

export type ProfileDraft = {
  name: string;
  background: string;
  selectedCompany: CompanyKey;
  companyType: 'cpu' | 'game' | 'software';
};

export type ReleaseDraft = {
  series: string;
  cpuName: string;
  priceIndex: number;
};

export type InvestmentDraft = {
  company: CompanyKey;
  mode: InvestorActionMode;
  route: TradeRoute;
  sliderPercent: number;
};

export type ShareListingDraft = {
  company: CompanyKey;
  shares: string;
  priceMultiplier: 2 | 3 | 4;
};

export type SliderStop = {
  label: string;
  value: number;
};

export type TradePreview = {
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

export type NewsCategory = 'investasi-besar' | 'release-cpu' | 'riset-baru' | 'saham-volatil' | 'arus-investor';

export type CompanyAiAction = {
  type: 'upgrade' | 'team' | 'payout' | 'release' | 'appstore-profile';
  key: UpgradeKey | TeamKey | 'payout-up' | 'payout-down' | 'release' | 'appstore-discovery' | 'appstore-infrastructure' | 'appstore-trust';
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

export type CpuReleaseRating = {
  rating: number;
  salesMultiplier: number;
  reputationMultiplier: number;
  marketShareMultiplier: number;
  summary: string;
};

export const STORAGE_KEY = 'career-simulator-profile-sim-v12';
export const TICK_MS = 200;
export const START_DATE_UTC = Date.UTC(2000, 0, 1);
export const NPC_ACTION_EVERY_TICKS = 10;
export const PLAYER_STARTING_CASH = 140;
export const INITIAL_NPC_COUNT = 75;
export const MAX_ACTIVE_NPCS = 75;
export const NPC_GROWTH_START_DAY = 180;
export const NPC_GROWTH_INTERVAL_DAYS = 60;
export const NPC_GROWTH_BATCH = 3;
export const GOVERNANCE_REFRESH_TICK_INTERVAL = 5;
export const EXECUTIVE_MIN_TENURE_DAYS = 30;
export const BOARD_VOTE_WINDOW_DAYS = 30;
export const BOARD_VOTE_LIMIT_PER_WINDOW = 2;
export const SHARE_SHEET_OPTIONS = [100, 500, 1000] as const;
export const SHARE_SHEET_COOLDOWN_DAYS = 240;
export const INVESTOR_TAX_INTERVAL_DAYS = 30;
export const TOTAL_SHARES = 1000;
export const DOMINANT_HOLDER_THRESHOLD_PERCENT = 40;
export const INITIAL_FOUNDER_OWNERSHIP_RATIO = 0.52;
export const COMPANY_TRADE_FEE_RATE = 0.018;
export const HOLDER_TRADE_FEE_RATE = 0.052;
export const MIN_TRADE_AMOUNT = 0.1;
export const PLAN_DURATION_DAYS = 30;
export const MAX_ACTIVE_COMPANIES = 8;
export const COMPANY_KEYS: CompanyKey[] = ['cosmic', 'rmd', 'heroscop', 'venture4', 'venture5', 'venture6', 'venture7', 'venture8'];
export const CORE_COMPANY_KEYS: CompanyKey[] = ['cosmic', 'rmd', 'heroscop'];
export const DYNAMIC_COMPANY_KEYS: CompanyKey[] = ['venture4', 'venture5', 'venture6', 'venture7', 'venture8'];
export const TRANSACTION_SLIDER_STOPS: SliderStop[] = [
  { label: '0%', value: 0 },
  { label: '25%', value: 25 },
  { label: '50%', value: 50 },
  { label: '75%', value: 75 },
  { label: '100%', value: 100 },
];
export const PRICE_PRESETS = [
  { label: 'Murah', subtitle: 'Volume tinggi', factor: 0.86, reputationBonus: 0.4, marketBonus: 1.6 },
  { label: 'Seimbang', subtitle: 'Arus utama', factor: 1, reputationBonus: 0.8, marketBonus: 1 },
  { label: 'Mahal', subtitle: 'Flagship premium', factor: 1.28, reputationBonus: 1.25, marketBonus: 0.55 },
] as const;
export const DEFAULT_OPEN_PANELS: Record<PanelKey, boolean> = {
  profile: false,
  intel: false,
};
export const DEFAULT_COMPANY_DETAIL_PANELS: Record<CompanyDetailPanelKey, boolean> = {
  overview: false,
  management: false,
  operations: false,
  ownership: false,
  governance: false,
  intel: false,
};
export const DEFAULT_PROFILE_DRAFT: ProfileDraft = {
  name: '',
  background: 'Founder-operator dengan insting produk yang agresif.',
  selectedCompany: 'cosmic',
  companyType: 'cpu',
};
export const DEFAULT_RELEASE_DRAFT: ReleaseDraft = {
  series: 'Nova Series',
  cpuName: 'N-01',
  priceIndex: 1,
};
export const DEFAULT_SHARE_LISTING_DRAFT: ShareListingDraft = {
  company: 'cosmic',
  shares: '',
  priceMultiplier: 2,
};
export const STRATEGY_LABELS: Record<StrategyStyle, string> = {
  value: 'Value',
  growth: 'Growth',
  dividend: 'Dividend',
  activist: 'Activist',
  balanced: 'Balanced',
};
export const EXECUTIVE_ROLE_META: Record<ExecutiveRole, { title: string; domain: ExecutiveDomain; mandate: string; permissionLabel: string }> = {
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
export const EXECUTIVE_ROLES = Object.keys(EXECUTIVE_ROLE_META) as ExecutiveRole[];
export const NPC_FIRST_NAMES = [
  'Aiden', 'Aria', 'Amara', 'Bima', 'Clara', 'Dimas', 'Elena', 'Fajar', 'Gavin', 'Hana',
  'Irfan', 'Jasper', 'Kayla', 'Liam', 'Maya', 'Nadia', 'Owen', 'Putri', 'Quinn', 'Rafi',
  'Sinta', 'Theo', 'Uma', 'Vera', 'Wira', 'Xena', 'Yara', 'Zane', 'Alya', 'Bagas',
  'Celine', 'Dion', 'Evan', 'Farah', 'Galih', 'Hugo', 'Indra', 'Jihan', 'Kevin', 'Luna',
  'Milo', 'Naila', 'Orin', 'Pia', 'Rena', 'Soren', 'Tari', 'Umar', 'Vino', 'Wulan',
  'Ari', 'Bryn', 'Cora', 'Dara', 'Eka', 'Fina', 'Gio', 'Helmi', 'Isha', 'Juna',
  'Kira', 'Lara', 'Mira', 'Niko', 'Olya', 'Pasha', 'Raka', 'Sasha', 'Timo', 'Vanya',
] as const;
export const NPC_LAST_NAMES = [
  'Aditya', 'Basuki', 'Chandra', 'Darma', 'Erlangga', 'Firmansyah', 'Gunawan', 'Hidayat', 'Irawan', 'Jayadi',
  'Kusuma', 'Lestari', 'Mahendra', 'Nugroho', 'Pratama', 'Rahman', 'Saputra', 'Tanjung', 'Utama', 'Wijaya',
  'Prasetyo', 'Keller', 'Torres', 'Nguyen', 'Sullivan', 'Mendoza', 'Bianchi', 'Petrov', 'Reyes', 'Tanaka',
  'Nakamura', 'Ishida', 'Aoki', 'Yamato', 'Sato', 'Nair', 'Hansen', 'Armand', 'Laurent', 'Valencia',
  'Hartono', 'Setiawan', 'Purnama', 'Hakim', 'Atmaja', 'Surya', 'Wardana', 'Permana', 'Putra', 'Fadlan',
  'Halim', 'Santoso', 'Morrow', 'Vale', 'Quill', 'Frost', 'Kim', 'Alvarez', 'Suryana', 'Ramadhan',
] as const;
const NPC_NAME_VARIANT_SUFFIXES = ['a', 'an', 'el', 'er', 'ia', 'in', 'is', 'on', 'or', 'us'] as const;
const toTitleCaseToken = (value: string) => value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
export const NPC_FIRST_NAME_POOL = Array.from(new Set([
  ...NPC_FIRST_NAMES,
  ...NPC_FIRST_NAMES.flatMap((name) => NPC_NAME_VARIANT_SUFFIXES.map((suffix) => toTitleCaseToken(`${name}${suffix}`))),
])).slice(0, 360);
export const NPC_LAST_NAME_POOL = Array.from(new Set([
  ...NPC_LAST_NAMES,
  ...NPC_LAST_NAMES.flatMap((name) => NPC_NAME_VARIANT_SUFFIXES.map((suffix) => toTitleCaseToken(`${name}${suffix}`))),
])).slice(0, 360);
export const NPC_PERSONAS = [
  'fund manager adaptif',
  'angel investor oportunis',
  'tech whale pemburu efisiensi',
  'operator pasar yang disiplin',
  'pengumpul saham berbasis data',
  'analis growth berani',
  'direktur family office',
  'portfolio architect jangka panjang',
] as const;
export function createSeededRandom(seed: string) {
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

export function randomBetween(random: () => number, min: number, max: number) {
  return min + random() * (max - min);
}

export function randomInt(random: () => number, min: number, max: number) {
  return Math.floor(randomBetween(random, min, max + 1));
}

export function randomFrom<T>(random: () => number, items: readonly T[]) {
  return items[Math.floor(random() * items.length)] as T;
}

export function generateUniqueCompanyName(game: GameState, random: () => number, field: CompanyField = 'semiconductor') {
  const usedNames = new Set<string>([
    ...Object.values(game.companies).map((company) => company.name.toLowerCase()),
    ...game.communityPlans.map((plan) => plan.companyName.toLowerCase()),
  ]);
  const usedWords = new Set<string>(
    Array.from(usedNames)
      .flatMap((name) => name.split(/\s+/g).map((part) => part.trim()).filter(Boolean))
  );

  return generateCatalogCompanyName({
    field,
    random,
    usedNames,
    usedWords,
  });
}

export function formatNumber(value: number, decimals = 0) {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatMoneyCompact(valueInMillions: number, decimals = 2) {
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

export function formatDateFromDays(daysElapsed: number) {
  const date = new Date(START_DATE_UTC + Math.floor(daysElapsed) * 24 * 60 * 60 * 1000);
  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const year = String(date.getUTCFullYear()).slice(-2);
  return `${day}/${month}/${year}`;
}

function normalizeCompanyNameWords(value: string) {
  return value
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((part) => part.trim())
    .filter(Boolean);
}

function hasCompanyWordCollision(game: GameState, candidateName: string) {
  const candidateWords = normalizeCompanyNameWords(candidateName).map((word) => word.toLowerCase());
  if (candidateWords.length === 0) return true;
  const usedWords = new Set<string>();
  Object.values(game.companies).forEach((company) => {
    normalizeCompanyNameWords(company.name).forEach((word) => usedWords.add(word.toLowerCase()));
  });
  game.communityPlans.forEach((plan) => {
    if (plan.status === 'expired') return;
    normalizeCompanyNameWords(plan.companyName).forEach((word) => usedWords.add(word.toLowerCase()));
  });
  return candidateWords.some((word) => usedWords.has(word));
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function detectNewsCategory(entry: string): NewsCategory | null {
  const normalized = entry.toLowerCase();
  if (normalized.includes('merilis') || normalized.includes('rilis')) return 'release-cpu';
  if (normalized.includes('membeli') || normalized.includes('investasi') || normalized.includes('listing')) return 'investasi-besar';
  if (normalized.includes('research') || normalized.includes('r&d') || normalized.includes('upgrade') || normalized.includes('rp')) return 'riset-baru';
  if (normalized.includes('harga') || normalized.includes('valuasi') || normalized.includes('anjlok') || normalized.includes('naik')) return 'saham-volatil';
  if (normalized.includes('kabur') || normalized.includes('menjual') || normalized.includes('ramai') || normalized.includes('investor')) return 'arus-investor';
  return null;
}

export function getNewsCategoryLabel(category: NewsCategory) {
  if (category === 'investasi-besar') return 'Investasi besar';
  if (category === 'release-cpu') return 'Release CPU baru';
  if (category === 'riset-baru') return 'Riset baru';
  if (category === 'saham-volatil') return 'Saham naik/anjlok';
  return 'Investor ramai/kabur';
}

export function createUpgrades(seed: { architecture: number; lithography: number; clockSpeed: number; coreDesign: number; cacheStack: number; powerEfficiency: number }) {
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

export function createTeams(seed: { researchers: number; marketing: number; fabrication: number }) {
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

export function getUpgradeLevel(key: UpgradeKey, upgrade: UpgradeState, baseline: number) {
  if (key === 'lithography' || key === 'powerEfficiency') {
    return Math.max(0, Math.round((baseline - upgrade.value) / Math.abs(upgrade.step)));
  }
  return Math.max(0, Math.round((upgrade.value - baseline) / Math.abs(upgrade.step)));
}

export function getUpgradeCost(key: UpgradeKey, upgrade: UpgradeState, company: CompanyState) {
  const baselineSet = INITIAL_BASELINES[company.key as keyof typeof INITIAL_BASELINES] ?? INITIAL_BASELINES.cosmic;
  const baseline = baselineSet.upgrades[key];
  const level = getUpgradeLevel(key, upgrade, baseline);
  return Math.round(upgrade.baseCost * Math.pow(upgrade.costGrowth, level));
}

export function getTeamCost(team: TeamState) {
  return Math.round(team.baseCost * Math.pow(team.costGrowth, team.count));
}

export function getDisplayedUpgradeValue(key: UpgradeKey, upgrade: UpgradeState) {
  if (key === 'architecture') return `Gen ${formatNumber(upgrade.value)}`;
  if (key === 'clockSpeed') return `${formatNumber(upgrade.value, 1)} GHz`;
  if (key === 'coreDesign') return `${formatNumber(upgrade.value)} core${upgrade.value > 1 ? 's' : ''}`;
  if (key === 'cacheStack') return upgrade.value >= 1024 ? `${formatNumber(upgrade.value / 1024, 1)} MB` : `${formatNumber(upgrade.value)} KB`;
  if (key === 'lithography') return `${formatNumber(upgrade.value)} nm`;
  return `${formatNumber(upgrade.value)} W`;
}

export function calculateCpuScore(upgrades: Record<UpgradeKey, UpgradeState>) {
  const architecture = upgrades.architecture.value;
  const clockSpeed = upgrades.clockSpeed.value;
  const coreCount = upgrades.coreDesign.value;
  const cacheMb = upgrades.cacheStack.value / 1024;
  const nodeEfficiency = 220 / upgrades.lithography.value;
  const powerEfficiency = 110 / upgrades.powerEfficiency.value;

  return architecture * 120 + clockSpeed * 90 + coreCount * 88 + cacheMb * 60 + nodeEfficiency * 82 + powerEfficiency * 75;
}

export function calculateResearchPerDay(teams: Record<TeamKey, TeamState>, upgrades: Record<UpgradeKey, UpgradeState>) {
  return 4.2 + teams.researchers.count * 2.2 + upgrades.architecture.value * 0.8 + (220 - upgrades.lithography.value) * 0.04;
}

export function calculateRevenuePerDay(
  teams: Record<TeamKey, TeamState>,
  upgrades: Record<UpgradeKey, UpgradeState>,
  marketShare: number,
  reputation: number,
  boardMood: number
) {
  return 4.8 + teams.fabrication.count * 1.65 + teams.marketing.count * 1.05 + calculateCpuScore(upgrades) * 0.009 + marketShare * 0.42 + reputation * 0.11 + boardMood * 0.8;
}

export function calculateLaunchRevenue(
  score: number,
  teams: Record<TeamKey, TeamState>,
  marketShare: number,
  reputation: number,
  priceFactor: number
) {
  return score * 0.92 * (1 + teams.fabrication.count * 0.18) * (1 + teams.marketing.count * 0.14) * (1 + marketShare / 10) * (1 + reputation / 32) * priceFactor;
}

export function evaluateCpuReleaseRating(game: GameState, company: CompanyState, priceIndex: number, cpuScore?: number): CpuReleaseRating {
  const releaseScore = cpuScore ?? calculateCpuScore(company.upgrades);
  const pricePreset = PRICE_PRESETS[priceIndex] ?? PRICE_PRESETS[1];
  const establishedCompetitors = COMPANY_KEYS
    .filter((key) => key !== company.key)
    .map((key) => game.companies[key])
    .filter((entry) => entry.isEstablished);
  const competitorBench = establishedCompetitors.length
    ? establishedCompetitors.reduce((sum, entry) => sum + Math.max(entry.bestCpuScore, calculateCpuScore(entry.upgrades)), 0) / establishedCompetitors.length
    : releaseScore;
  const strongestCompetitor = establishedCompetitors.reduce((best, entry) => {
    const score = Math.max(entry.bestCpuScore, calculateCpuScore(entry.upgrades));
    return !best || score > best.score ? { score, sharePrice: getSharePrice(entry), name: entry.name } : best;
  }, null as { score: number; sharePrice: number; name: string } | null);
  const ownSharePrice = Math.max(0.08, getSharePrice(company));
  const ownValuePerPrice = releaseScore / Math.max(0.2, pricePreset.factor * ownSharePrice);
  const competitorValuePerPrice = strongestCompetitor
    ? strongestCompetitor.score / Math.max(0.2, strongestCompetitor.sharePrice)
    : ownValuePerPrice;
  const specSignal = clamp((releaseScore - competitorBench) / Math.max(120, competitorBench), -1.2, 1.4);
  const valueSignal = clamp((ownValuePerPrice - competitorValuePerPrice) / Math.max(0.2, competitorValuePerPrice), -1.4, 1.4);
  const cheaperBetterPenalty = strongestCompetitor && strongestCompetitor.score > releaseScore && strongestCompetitor.sharePrice < ownSharePrice
    ? clamp((strongestCompetitor.score - releaseScore) / Math.max(100, strongestCompetitor.score), 0, 0.8)
    : 0;
  const marketingAuthorityBoost = getExecutiveCoverage(company, 'cmo') * 6 + getExecutiveCoverage(company, 'coo') * 2.5;
  const marketingSignal = company.teams.marketing.count * 2.8 + marketingAuthorityBoost + company.reputation * 0.08;
  const rawRating = 56 + specSignal * 23 + valueSignal * 16 + marketingSignal * 0.42 - cheaperBetterPenalty * 22;
  const rating = clamp(rawRating, 18, 98);
  const salesMultiplier = clamp(0.46 + rating / 100, 0.46, 1.62);
  const reputationMultiplier = clamp(0.55 + rating / 140, 0.55, 1.4);
  const marketShareMultiplier = clamp(0.5 + rating / 130, 0.5, 1.45);
  const summary =
    cheaperBetterPenalty > 0.35
      ? `Rating ${formatNumber(rating, 1)}: ${strongestCompetitor?.name ?? 'kompetitor'} lebih murah & lebih canggih; butuh promo kuat.`
      : specSignal > 0.2
        ? `Rating ${formatNumber(rating, 1)}: spesifikasi kompetitif dan value cukup kuat.`
        : `Rating ${formatNumber(rating, 1)}: perlu optimasi harga/promo agar demand stabil.`;
  return { rating, salesMultiplier, reputationMultiplier, marketShareMultiplier, summary };
}

export function getCompanyInvestmentTotal(company: CompanyState) {
  return Object.values(company.investors).reduce((sum, shares) => sum + shares * getSharePrice(company), 0);
}

export function getSharePrice(company: CompanyState) {
  const valuation = getCompanyValuation(company);
  const base = valuation / Math.max(1, company.sharesOutstanding);
  const shareStructureNormalization = clamp(Math.sqrt(TOTAL_SHARES / Math.max(100, company.sharesOutstanding)), 0.72, 1.32);
  const freeFloatRatio = clamp(company.marketPoolShares / Math.max(1, company.sharesOutstanding), 0.05, 0.95);
  const liquidityAdjustment = clamp(0.9 + freeFloatRatio * 0.26, 0.86, 1.16);
  return Math.max(0.08, base * shareStructureNormalization * liquidityAdjustment);
}

export function getCompanyResearchAssetValue(company: CompanyState) {
  const baselineSet = INITIAL_BASELINES[company.key as keyof typeof INITIAL_BASELINES] ?? INITIAL_BASELINES.cosmic;
  const upgradeAssetValue =
    getUpgradeLevel('architecture', company.upgrades.architecture, baselineSet.upgrades.architecture) * 14
    + getUpgradeLevel('coreDesign', company.upgrades.coreDesign, baselineSet.upgrades.coreDesign) * 12
    + getUpgradeLevel('clockSpeed', company.upgrades.clockSpeed, baselineSet.upgrades.clockSpeed) * 10
    + getUpgradeLevel('cacheStack', company.upgrades.cacheStack, baselineSet.upgrades.cacheStack) * 6
    + getUpgradeLevel('powerEfficiency', company.upgrades.powerEfficiency, baselineSet.upgrades.powerEfficiency) * 7
    + getUpgradeLevel('lithography', company.upgrades.lithography, baselineSet.upgrades.lithography) * 8;
  return Math.max(
    0,
    company.research * 0.56
    + company.researchPerDay * 7.2
    + (company.researchAssetValue ?? 0)
    + upgradeAssetValue
  );
}

export function getCompanyValuation(company: CompanyState) {
  return Math.max(
    20,
    Math.round((
      company.cash
      + getCompanyResearchAssetValue(company)
      + company.portfolioValue
      - company.capitalStrain * 0.46
    ) * 10) / 10
  );
}

export function getOwnershipPercent(company: CompanyState, investorId: string) {
  const shares = company.investors[investorId] ?? 0;
  if (!company.sharesOutstanding) return 0;
  return shares / company.sharesOutstanding * 100;
}

export function isDominantIndividualHolder(company: CompanyState, investorId: string) {
  if (!isHumanExecutiveCandidateId(investorId)) return false;
  return getOwnershipPercent(company, investorId) >= DOMINANT_HOLDER_THRESHOLD_PERCENT;
}

export function pickShareSheetTotal(seedCapital: number): number {
  if (seedCapital >= 120) return 1000;
  if (seedCapital >= 52) return 500;
  return 100;
}

export function canChangeShareSheetTotal(company: CompanyState, nextTotal: number, currentDay: number) {
  const dominantCeo = isDominantIndividualHolder(company, company.ceoId);
  if (!SHARE_SHEET_OPTIONS.includes(nextTotal as (typeof SHARE_SHEET_OPTIONS)[number])) {
    return { ok: false, reason: 'Opsi share sheets hanya 100 / 500 / 1000.' };
  }
  if (nextTotal === company.sharesOutstanding) {
    return { ok: false, reason: 'Jumlah share sheets sama dengan konfigurasi saat ini.' };
  }
  const elapsed = currentDay - (company.lastShareSheetChangeDay ?? 0);
  const cooldownDays = dominantCeo ? Math.round(SHARE_SHEET_COOLDOWN_DAYS * 0.25) : SHARE_SHEET_COOLDOWN_DAYS;
  if (elapsed < cooldownDays) {
    return { ok: false, reason: `Perubahan share sheets masih cooldown ${formatNumber(cooldownDays - elapsed)} hari.` };
  }
  if (nextTotal < company.sharesOutstanding && !dominantCeo) {
    const sortedTotals = [...SHARE_SHEET_OPTIONS].sort((a, b) => a - b);
    const currentIndex = sortedTotals.findIndex((value) => value === company.sharesOutstanding);
    const targetIndex = sortedTotals.findIndex((value) => value === nextTotal);
    const downshiftSteps = currentIndex >= 0 && targetIndex >= 0 ? Math.max(0, currentIndex - targetIndex) : 1;
    const ceoShares = company.investors[company.ceoId] ?? 0;
    const baseMajorityRatio = 0.35;
    const requiredCeoShares = company.sharesOutstanding * baseMajorityRatio * downshiftSteps;
    if (ceoShares + 0.0001 < requiredCeoShares) {
      return {
        ok: false,
        reason: `CEO harus pegang minimal ${formatNumber(requiredCeoShares, 2)} saham untuk turun ke ${formatNumber(nextTotal)} lembar (saat ini ${formatNumber(ceoShares, 2)}).`,
      };
    }
    const reduction = company.sharesOutstanding - nextTotal;
    if (company.marketPoolShares + 0.0001 < reduction) {
      return { ok: false, reason: 'Turun share sheets butuh buyback/treasury cukup agar saham beredar yang tersisa tidak melebihi target.' };
    }
  }
  return { ok: true, reason: '' };
}

export function getCorporateInvestorId(companyKey: CompanyKey) {
  return `corp_${companyKey}`;
}

export function getCompanyKeyFromCorporateInvestorId(investorId: string): CompanyKey | null {
  if (!investorId.startsWith('corp_')) return null;
  const key = investorId.replace('corp_', '') as CompanyKey;
  return COMPANY_KEYS.includes(key) ? key : null;
}

export function getInvestorCash(game: GameState, investorId: string) {
  if (investorId === game.player.id) return game.player.cash;
  const corporateCompanyKey = getCompanyKeyFromCorporateInvestorId(investorId);
  if (corporateCompanyKey) return game.companies[corporateCompanyKey].cash;
  return game.npcs.find((npc) => npc.id === investorId)?.cash ?? 0;
}

export function getListingAskPrice(company: CompanyState, listing: ShareListing) {
  return getSharePrice(company) * listing.priceMultiplier;
}

export function getInvestorOpenListedShares(company: CompanyState, investorId: string) {
  return company.shareListings
    .filter((listing) => listing.sellerId === investorId)
    .reduce((sum, listing) => sum + listing.sharesAvailable, 0);
}

export function getAvailableSharesToList(company: CompanyState, investorId: string) {
  return Math.max(0, (company.investors[investorId] ?? 0) - getInvestorOpenListedShares(company, investorId));
}

export function sanitizeShareListings(company: CompanyState) {
  return company.shareListings
    .map((listing) => ({
      ...listing,
      sharesAvailable: Math.max(0, Math.min(listing.sharesAvailable, company.investors[listing.sellerId] ?? 0)),
    }))
    .filter((listing) => listing.sharesAvailable > 0.01);
}

export function upsertShareListing(game: GameState, companyKey: CompanyKey, sellerId: string, sharesAvailable: number, priceMultiplier: 2 | 3 | 4, note: string) {
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

export function clearShareListing(game: GameState, companyKey: CompanyKey, sellerId: string) {
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

export function getVisibleShareListings(company: CompanyState, excludeBuyerId?: string) {
  return sanitizeShareListings(company)
    .filter((listing) => listing.sellerId !== excludeBuyerId)
    .sort((left, right) => {
      if (left.priceMultiplier !== right.priceMultiplier) return left.priceMultiplier - right.priceMultiplier;
      return left.openedDay - right.openedDay;
    });
}

export function allocateHolderBuyFromListings(company: CompanyState, listings: ShareListing[], requestedGrossValue: number) {
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

export function getRequestedTradeValue(maxTradeValue: number, sliderPercent: number) {
  return maxTradeValue * clamp(sliderPercent, 0, 100) / 100;
}

export function getTradeRouteLabel(route: TradeRoute) {
  if (route === 'company') return 'Treasury / perusahaan';
  if (route === 'holders') return 'Sesama pemegang saham';
  return 'Auto';
}

export function getTradeFeeRate(route: TradeRoute) {
  return route === 'holders' ? HOLDER_TRADE_FEE_RATE : COMPANY_TRADE_FEE_RATE;
}

export function getInvestorLiquidityReserve(game: GameState, investorId: string) {
  if (investorId === game.player.id) return 18;
  const npc = getNpcById(game, investorId);
  if (!npc) return Infinity;
  return 10 + npc.cash * npc.reserveRatio;
}

export function getBuyerDemandBudget(game: GameState, company: CompanyState, buyerId: string) {
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

export function getHolderRouteCapacity(game: GameState, company: CompanyState, investorId: string, mode: InvestorActionMode) {
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

export function chooseAutoTradeRoute(game: GameState, company: CompanyState, investorId: string, mode: InvestorActionMode, investorCash: number, currentShares: number) {
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

export function getMaxTradeValue(game: GameState, company: CompanyState, investorId: string, investorCash: number, currentShares: number, mode: InvestorActionMode, route: TradeRoute) {
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

export function getTradePreview(
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

export function addFeedEntry(feed: string[], message: string) {
  const latest = feed[0];
  if (latest) {
    const sameMessage = latest === message;
    const collapsed = latest.match(/^(.*)\s\(x(\d+)\)$/);
    const collapsedBase = collapsed?.[1];
    const collapsedCount = collapsed?.[2];
    if (sameMessage || collapsedBase === message) {
      const base = sameMessage ? message : (collapsedBase ?? message);
      const currentCount = sameMessage ? 1 : Number(collapsedCount);
      const nextCount = Number.isFinite(currentCount) ? currentCount + 1 : 2;
      return [`${base} (x${nextCount})`, ...feed.slice(1)].slice(0, 12);
    }
  }
  return [message, ...feed].slice(0, 12);
}

export function investorDisplayName(game: GameState, investorId: string) {
  if (investorId === game.player.id) return game.player.name;
  const corporateCompanyKey = getCompanyKeyFromCorporateInvestorId(investorId);
  if (corporateCompanyKey) return game.companies[corporateCompanyKey].name;
  const npc = game.npcs.find((entry) => entry.id === investorId);
  if (npc) return npc.name;
  if (investorId.startsWith('founder_')) {
    const companyKey = investorId.replace('founder_', '') as CompanyKey;
    return game.companies[companyKey]?.founder ?? investorId;
  }
  if (investorId.startsWith('institution_')) return investorId.replace('institution_', '').replace(/_/g, ' ');
  return investorId;
}

export function getNpcById(game: GameState, investorId: string) {
  return game.npcs.find((npc) => npc.id === investorId) ?? null;
}

export function getExecutiveAiActor(game: GameState, company: CompanyState, investorId: string): NpcInvestor {
  const existingNpc = getNpcById(game, investorId);
  if (existingNpc) return existingNpc;
  const isFounder = investorId.startsWith('founder_');
  const founderStrategy: StrategyStyle = company.field === 'game'
    ? (company.marketShare > 18 ? 'growth' : 'balanced')
    : company.field === 'software'
      ? (company.softwareSpecialization === 'app-store' ? 'balanced' : 'growth')
      : company.marketShare > 20
        ? 'balanced'
        : company.cash < 24
          ? 'growth'
          : 'value';
  const intelligenceBase = company.field === 'software' && company.softwareSpecialization === 'app-store'
    ? 0.86
    : company.field === 'semiconductor'
      ? 0.82
      : 0.8;
  return {
    id: investorId,
    name: investorDisplayName(game, investorId),
    persona: isFounder ? 'Founder operator AI fallback' : 'Executive fallback AI',
    strategy: investorId === game.player.id ? 'balanced' : founderStrategy,
    cash: getInvestorCash(game, investorId),
    focusCompany: company.key,
    boldness: isFounder ? 0.7 : company.field === 'game' ? 0.66 : 0.6,
    patience: isFounder ? 0.74 : company.field === 'software' ? 0.72 : 0.68,
    horizonDays: isFounder ? 420 : 320,
    reserveRatio: 0.24,
    intelligence: isFounder ? Math.max(0.84, intelligenceBase) : intelligenceBase,
    analysisNote: `${investorDisplayName(game, investorId)} menjalankan fallback AI management untuk menjaga kesinambungan aksi.`,
    active: true,
  };
}

export function isHumanExecutiveCandidateId(investorId: string) {
  return investorId.startsWith('npc_') || investorId.startsWith('player-') || investorId.startsWith('founder_');
}

export function getExecutiveCandidatePool(game: GameState, company: CompanyState, ceoId: string) {
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

export function getManagementCadenceDays(company: CompanyState, ceoNpc: NpcInvestor) {
  const stress = getCompanyStressLevel(company);
  const resourceContext = getManagementResourceContext(company);
  return clamp(
    Math.round(10 - ceoNpc.intelligence * 3.4 - ceoNpc.boldness * 1.6 - stress * 2.8 - resourceContext.managementIntensity * 2.6 + ceoNpc.patience * 1.1),
    2,
    10
  );
}

export function getExecutiveCandidateScore(game: GameState, company: CompanyState, candidateId: string, role: ExecutiveRole) {
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

export function calculateExecutiveNeed(role: ExecutiveRole, company: CompanyState) {
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

export function createExecutiveRecord(
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

export function createEmptyExecutiveMap(): Record<ExecutiveRole, CompanyExecutive | null> {
  return {
    coo: null,
    cfo: null,
    cto: null,
    cmo: null,
  };
}

export function sanitizeExecutiveAssignments(game: GameState, company: CompanyState, ceoId: string) {
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

export function planNpcExecutiveAssignments(game: GameState, company: CompanyState, ceoId: string, boardMembers: BoardMember[]) {
  const ceoNpc = getExecutiveAiActor(game, company, ceoId);
  const voteWindow = getBoardVoteWindowState(company, game.elapsedDays);
  let votesRemaining = canStartBoardVote(company, game.elapsedDays) ? Math.max(0, BOARD_VOTE_LIMIT_PER_WINDOW - voteWindow.count) : 0;

  const intelligence = ceoNpc.intelligence;
  const threshold = 0.26 + (1 - intelligence) * 0.08;
  const pool = getExecutiveCandidatePool(game, company, ceoId);
  const used = new Set<string>();
  const executives = sanitizeExecutiveAssignments(game, company, ceoId);
  EXECUTIVE_ROLES.forEach((role) => {
    if (executives[role]) {
      used.add(executives[role]!.occupantId);
    }
  });
  const chosenRoles: ExecutiveRole[] = [];
  let governanceUpdates = 0;
  let latestBoardVote: BoardVoteState | null = null;
  const rankedNeeds = EXECUTIVE_ROLES
    .map((role) => ({ role, need: calculateExecutiveNeed(role, company) }))
    .sort((left, right) => right.need - left.need);
  const mustFillRoles = rankedNeeds
    .filter((entry) => entry.need > 0.52 && !executives[entry.role])
    .slice(0, 3)
    .map((entry) => entry.role);

  EXECUTIVE_ROLES.forEach((role) => {
    if (votesRemaining <= 0) return;
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

    const strategicTightening = votesRemaining <= 1 ? 0.12 + (1 - ceoNpc.intelligence) * 0.08 : 0;
    if (!candidate || candidate.score < (mustFillRoles.includes(role) ? 0.94 + strategicTightening : 1.08 + strategicTightening)) return;
    const decisionType: 'appoint' | 'replace' = currentExecutive ? 'replace' : 'appoint';
    const decision = boardApproveExecutiveDecision(game, company, boardMembers, role, { type: decisionType, candidateId: candidate.candidateId });
    const proposerId = getBoardProposalActorId(game, company, { preferredRole: role, domain: EXECUTIVE_ROLE_META[role].domain });
    const initialVotes: Record<string, 'yes' | 'no'> = {};
    if (proposerId !== game.player.id && boardMembers.some((member) => member.id === proposerId)) {
      initialVotes[proposerId] = 'yes';
    }
    const tally = tallyBoardVoteWeights(boardMembers, initialVotes);
    if (!latestBoardVote) {
      latestBoardVote = {
        id: `${company.key}-${role}-${game.elapsedDays}`,
        kind: decisionType === 'appoint' ? 'pengangkatan' : 'penggantian',
        proposerId,
        subject: `${EXECUTIVE_ROLE_META[role].title} → ${investorDisplayName(game, candidate.candidateId)}`,
        reason: `${investorDisplayName(game, proposerId)} mengusulkan penyesuaian ${EXECUTIVE_ROLE_META[role].title} untuk kebutuhan ${EXECUTIVE_ROLE_META[role].domain}.`,
        memberVotes: initialVotes,
        yesWeight: tally.yesWeight,
        noWeight: tally.noWeight,
        startDay: game.elapsedDays,
        endDay: game.elapsedDays + 3,
      };
    }
    governanceUpdates += 1;
    votesRemaining = Math.max(0, votesRemaining - 1);
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
    ? votesRemaining <= 0
      ? `${ceoNpc.name} menahan perubahan eksekutif karena kuota voting dewan bulan ini sudah penuh.`
      : governanceUpdates > 0
        ? `${ceoNpc.name} sudah mengajukan perubahan struktur eksekutif dan menunggu keputusan dewan.`
        : `${ceoNpc.name} menilai ${company.name} belum membutuhkan eksekutif tambahan saat ini.`
    : `${ceoNpc.name} merancang struktur ${chosenRoles.map((role) => EXECUTIVE_ROLE_META[role].title).join(', ')} untuk menjaga ${company.name} tetap lincah.`;

  return {
    executives,
    executivePayrollPerDay,
    executivePulse,
    activeBoardVote: latestBoardVote,
  };
}

export function getExecutiveCoverage(company: CompanyState, role: ExecutiveRole) {
  return company.executives[role]?.effectiveness ?? 0;
}

export function getExecutiveRolesForInvestor(company: CompanyState, investorId: string) {
  return EXECUTIVE_ROLES.filter((role) => company.executives[role]?.occupantId === investorId);
}


export function getBoardProposalActorId(
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

export function hasCompanyAuthority(company: CompanyState, investorId: string, domain: ExecutiveDomain | 'release') {
  if (company.ceoId === investorId) return true;
  const roles = getExecutiveRolesForInvestor(company, investorId);
  if (domain === 'release') return roles.includes('cto') || roles.includes('cmo');
  return roles.some((role) => EXECUTIVE_ROLE_META[role].domain === domain);
}

export function getBoardExecutiveSignals(company: CompanyState) {
  const missingRoles = EXECUTIVE_ROLES.filter((role) => !company.executives[role] && calculateExecutiveNeed(role, company) > 0.62);
  const underPressureRoles = EXECUTIVE_ROLES.filter((role) => company.executives[role] && company.executives[role]!.effectiveness < 0.84);
  return { missingRoles, underPressureRoles };
}

export function isExecutiveTenureLocked(executive: CompanyExecutive | null, currentDay: number) {
  if (!executive) return false;
  return currentDay - (executive.appointedDay ?? currentDay) < EXECUTIVE_MIN_TENURE_DAYS;
}

export function boardApproveExecutiveDecision(
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

export function boardApproveCompanyInvestment(sourceCompany: CompanyState, targetCompany: CompanyState, amount: number) {
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

export function getBoardVoteWindowState(company: CompanyState, currentDay: number) {
  const startDay = company.boardVoteWindowStartDay ?? currentDay;
  const count = company.boardVoteCountInWindow ?? 0;
  if (currentDay - startDay >= BOARD_VOTE_WINDOW_DAYS) {
    return { startDay: currentDay, count: 0 };
  }
  return { startDay, count };
}

export function canStartBoardVote(company: CompanyState, currentDay: number) {
  return getBoardVoteWindowState(company, currentDay).count < BOARD_VOTE_LIMIT_PER_WINDOW;
}

export function registerBoardVoteUsage(company: CompanyState, currentDay: number) {
  const windowState = getBoardVoteWindowState(company, currentDay);
  return {
    startDay: windowState.startDay,
    count: windowState.count + 1,
  };
}

export function tallyBoardVoteWeights(boardMembers: BoardMember[], memberVotes: Record<string, 'yes' | 'no'>) {
  return boardMembers.reduce(
    (acc, member) => {
      const choice = memberVotes[member.id];
      if (choice === 'yes') acc.yesWeight += member.voteWeight;
      if (choice === 'no') acc.noWeight += member.voteWeight;
      return acc;
    },
    { yesWeight: 0, noWeight: 0 }
  );
}

export function decideBoardMemberVote(game: GameState, company: CompanyState, vote: BoardVoteState, member: BoardMember) {
  const seatBias =
    member.seatType === 'chair'
      ? 0.08
      : member.seatType === 'founder'
        ? 0.06
        : member.seatType === 'independent'
          ? 0.03
          : member.seatType === 'employee'
            ? 0.02
            : 0.04;
  const boardHealth = company.boardMood * 0.55 + clamp(company.reputation / 100, 0, 1) * 0.22;
  const capitalSignal = vote.kind === 'investasi'
    ? clamp(company.cash / 220, 0, 0.22) - clamp(company.capitalStrain / 240, 0, 0.18)
    : vote.kind === 'penggantian' || vote.kind === 'pemecatan'
      ? -0.04
      : 0.04;
  const random = createSeededRandom(`${vote.id}-${member.id}-${Math.floor(game.elapsedDays)}`)();
  const noise = (random - 0.5) * 0.16;
  return boardHealth + seatBias + capitalSignal + noise >= 0.58 ? 'yes' : 'no';
}

export function progressBoardVotes(game: GameState) {
  const companies = { ...game.companies };
  let changed = false;
  (Object.entries(game.companies) as [CompanyKey, CompanyState][]).forEach(([key, company]) => {
    const vote = company.activeBoardVote;
    if (!vote) return;
    const currentMemberVotes = vote.memberVotes ?? {};
    if (game.elapsedDays > vote.endDay) {
      companies[key] = {
        ...company,
        activeBoardVote: null,
      };
      changed = true;
      return;
    }
    const pendingAiMembers = company.boardMembers.filter((member) => !currentMemberVotes[member.id] && member.id !== game.player.id);
    if (pendingAiMembers.length === 0) return;
    const daysLeft = Math.max(0, Math.ceil(vote.endDay - game.elapsedDays));
    const castCount = daysLeft <= 0 ? pendingAiMembers.length : Math.max(1, Math.ceil(pendingAiMembers.length / (daysLeft + 1)));
    const nextVotes = { ...currentMemberVotes };
    pendingAiMembers.slice(0, castCount).forEach((member) => {
      nextVotes[member.id] = decideBoardMemberVote(game, company, vote, member);
    });
    const tally = tallyBoardVoteWeights(company.boardMembers, nextVotes);
    companies[key] = {
      ...company,
      activeBoardVote: {
        ...vote,
        memberVotes: nextVotes,
        yesWeight: tally.yesWeight,
        noWeight: tally.noWeight,
      },
    };
    changed = true;
  });
  return changed ? { ...game, companies } : game;
}

function normalizeNpcName(firstName: string, lastName: string, sequence?: number) {
  if (sequence === undefined) return `${firstName} ${lastName}`;
  return `${firstName} ${lastName} ${sequence}`;
}

function generateUniqueNpcName(
  random: () => number,
  usedNames: Set<string>,
  usedFirstNames: Set<string>,
  usedLastNames: Set<string>,
  fallbackSeed: number
) {
  const maxUniquePairs = NPC_FIRST_NAME_POOL.length * NPC_LAST_NAME_POOL.length;
  const maxAttempts = Math.max(30, Math.min(maxUniquePairs, 180));

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const first = randomFrom(random, NPC_FIRST_NAME_POOL);
    const last = randomFrom(random, NPC_LAST_NAME_POOL);
    if (usedFirstNames.has(first) || usedLastNames.has(last)) continue;
    const candidate = normalizeNpcName(first, last);
    if (!usedNames.has(candidate)) {
      usedFirstNames.add(first);
      usedLastNames.add(last);
      return candidate;
    }
  }

  const firstName = NPC_FIRST_NAME_POOL[fallbackSeed % NPC_FIRST_NAME_POOL.length];
  const lastName = NPC_LAST_NAME_POOL[Math.floor(fallbackSeed / NPC_FIRST_NAME_POOL.length) % NPC_LAST_NAME_POOL.length];
  let sequence = Math.floor(fallbackSeed / maxUniquePairs) + 2;
  let candidate = normalizeNpcName(firstName, lastName, sequence);
  while (usedNames.has(candidate)) {
    sequence += 1;
    candidate = normalizeNpcName(firstName, lastName, sequence);
  }
  return candidate;
}

export function createGenerativeNpcs(seed: string, count: number, offset = 0, existingNames: Iterable<string> = []): NpcInvestor[] {
  const random = createSeededRandom(`${seed}-${offset}`);
  const usedNames = new Set<string>(existingNames);
  const usedFirstNames = new Set<string>();
  const usedLastNames = new Set<string>();
  Array.from(existingNames).forEach((name) => {
    const [first, last] = name.split(/\s+/g);
    if (first) usedFirstNames.add(first);
    if (last) usedLastNames.add(last);
  });
  const strategies: StrategyStyle[] = ['value', 'growth', 'dividend', 'activist', 'balanced'];

  return Array.from({ length: count }, (_, index) => {
    const name = generateUniqueNpcName(random, usedNames, usedFirstNames, usedLastNames, offset + index);
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
      boldness: Math.round(randomBetween(random, 0.52, 0.96) * 100) / 100,
      patience: Math.round(randomBetween(random, 0.5, 0.95) * 100) / 100,
      intelligence: Math.round(randomBetween(random, 0.76, 0.995) * 100) / 100,
      horizonDays: randomInt(random, 120, 720),
      reserveRatio: Math.round(randomBetween(random, 0.14, 0.36) * 100) / 100,
      analysisNote: `Masih membangun tesis awal untuk ${focusCompany.toUpperCase()}.`,
      active: true,
      lastActionDay: -30,
      convictionBias: Math.round(randomBetween(random, -0.18, 0.2) * 100) / 100,
    } satisfies NpcInvestor;
  });
}

export function createFounderNpc(
  id: string,
  name: string,
  focusCompany: CompanyKey,
  random: () => number,
  existingIds: Set<string>
): NpcInvestor {
  const strategyPool: StrategyStyle[] = ['balanced', 'growth', 'value', 'activist', 'dividend'];
  const selectedStrategy = randomFrom(random, strategyPool);
  existingIds.add(id);
  return {
    id,
    name,
    persona: randomFrom(random, NPC_PERSONAS),
    strategy: selectedStrategy,
    cash: Math.round(randomBetween(random, 44, 128) * 100) / 100,
    focusCompany,
    boldness: Math.round(randomBetween(random, 0.58, 0.98) * 100) / 100,
    patience: Math.round(randomBetween(random, 0.42, 0.9) * 100) / 100,
    intelligence: Math.round(randomBetween(random, 0.78, 0.995) * 100) / 100,
    horizonDays: randomInt(random, 180, 860),
    reserveRatio: Math.round(randomBetween(random, 0.1, 0.28) * 100) / 100,
    analysisNote: `${name} menyiapkan strategi pendirian dan akumulasi lintas emiten tanpa cheating.`,
    active: true,
    lastActionDay: -30,
    convictionBias: Math.round(randomBetween(random, -0.06, 0.24) * 100) / 100,
  };
}

export function createCompany(config: {
  key: CompanyKey;
  field?: CompanyField;
  softwareSpecialization?: SoftwareSpecialization | null;
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
  shareSheetTotal?: number;
}) {
  const founderInvestorId = `founder_${config.key}`;
  const shareSheetTotal = config.shareSheetTotal ?? TOTAL_SHARES;
  const boardMood = 0.6;
  const founderShares = Math.round(shareSheetTotal * INITIAL_FOUNDER_OWNERSHIP_RATIO * 100) / 100;
  const marketPoolShares = Math.max(0, shareSheetTotal - founderShares);
  const revenuePerDay = calculateRevenuePerDay(config.teams, config.upgrades, config.marketShare, config.reputation, boardMood);
  const researchPerDay = calculateResearchPerDay(config.teams, config.upgrades);
  return {
    company: {
      key: config.key,
      field: config.field ?? 'semiconductor',
      softwareSpecialization: config.field === 'software' ? (config.softwareSpecialization ?? 'utility-apps') : null,
      name: config.name,
      founder: config.founder,
      founderInvestorId,
      ceoId: founderInvestorId,
      ceoName: config.founder,
      cash: config.cash,
      research: config.research,
      researchAssetValue: config.research,
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
        [founderInvestorId]: founderShares,
      },
      sharesOutstanding: shareSheetTotal,
      shareSheetTotal,
      lastShareSheetChangeDay: 0,
      marketPoolShares,
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
      portfolioValue: 0,
      shareListings: [],
      activeBoardVote: null,
      boardVoteWindowStartDay: 0,
      boardVoteCountInWindow: 0,
      isEstablished: true,
      establishedDay: 0,
      appStorePassiveIncomePerDay: 0,
      appStoreDownloadsPerDay: 0,
      appStoreProfile: {
        discovery: config.field === 'software' && config.softwareSpecialization === 'app-store' ? 1.2 : 0.8,
        infrastructure: config.field === 'software' && config.softwareSpecialization === 'app-store' ? 1.25 : 0.85,
        trust: config.field === 'software' && config.softwareSpecialization === 'app-store' ? 1.15 : 0.82,
      },
    } satisfies CompanyState,
  };
}

export function getRealInvestorCandidates(company: CompanyState) {
  return Object.entries(company.investors)
    .filter(([investorId, shares]) => shares > 0.01 && isHumanExecutiveCandidateId(investorId))
    .sort(([, left], [, right]) => right - left)
    .map(([investorId]) => investorId);
}

export function createIndependentBoardMember(company: CompanyState, slot: number): BoardMember {
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

export function getCompanyPerformanceScore(company: CompanyState) {
  const cpuScore = calculateCpuScore(company.upgrades);
  return company.marketShare * 0.34
    + company.reputation * 0.28
    + company.boardMood * 18
    + company.cash * 0.018
    + company.researchPerDay * 2.6
    + cpuScore * 0.004;
}

export function getCompanyStressLevel(company: CompanyState) {
  const marketStress = clamp((18 - company.marketShare) / 18, 0, 1);
  const reputationStress = clamp((42 - company.reputation) / 42, 0, 1);
  const cashStress = clamp((110 - company.cash) / 110, 0, 1);
  const boardStress = clamp((0.62 - company.boardMood) / 0.62, 0, 1);
  const strainStress = clamp(company.capitalStrain / Math.max(40, getCompanyValuation(company)), 0, 1);
  return marketStress * 0.28 + reputationStress * 0.22 + cashStress * 0.2 + boardStress * 0.15 + strainStress * 0.15;
}

export function getBoardMemberOptions(member: BoardMember, company: CompanyState) {
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

export function getCandidateLeadershipScore(company: CompanyState, candidateId: string, previousCeoId: string) {
  const ownership = getOwnershipPercent(company, candidateId);
  const continuity = candidateId === previousCeoId ? 4 : 0;
  const founderBonus = candidateId === company.founderInvestorId ? 2.5 : 0;
  const operatingStrength = company.marketShare * 0.18 + company.reputation * 0.14 + company.researchPerDay * 0.6;
  return ownership * 1.15 + continuity + founderBonus + operatingStrength * 0.12;
}

export function resolveGovernance(game: GameState) {
  const ceoOccupancy = new Map<string, number>();
  const companies = Object.fromEntries(
    (Object.entries(game.companies) as [CompanyKey, CompanyState][]).map(([key, company]) => {
      if (!company.isEstablished) {
        return [key, company];
      }
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

      const corporateControllerCandidates = ranked
        .map(([investorId, shares]) => ({ investorId, shares, companyKey: getCompanyKeyFromCorporateInvestorId(investorId) }))
        .filter((entry): entry is { investorId: string; shares: number; companyKey: CompanyKey } => Boolean(entry.companyKey))
        .map((entry) => {
          const parent = game.companies[entry.companyKey];
          return {
            candidateId: parent?.ceoId ?? '',
            weightedShares: entry.shares,
          };
        })
        .filter((entry) => entry.candidateId && isHumanExecutiveCandidateId(entry.candidateId));
      const candidateIds = Array.from(new Set([
        ...(isHumanExecutiveCandidateId(company.ceoId) ? [company.ceoId] : []),
        ...getRealInvestorCandidates(company).slice(0, 4),
        ...corporateControllerCandidates
          .sort((left, right) => right.weightedShares - left.weightedShares)
          .map((entry) => entry.candidateId)
          .slice(0, 2),
      ]));
      if (candidateIds.length === 0) {
        candidateIds.push(company.founderInvestorId);
      }
      const boardVotes = new Map<string, number>();

      boardMembers.forEach((member) => {
        let chosenCandidate = candidateIds[0] ?? company.founderInvestorId;
        let chosenScore = -Infinity;

        candidateIds.forEach((candidateId) => {
          const baseScore = getCandidateLeadershipScore(company, candidateId, company.ceoId);
          const corporateInfluenceBoost = ranked
            .filter(([investorId]) => getCompanyKeyFromCorporateInvestorId(investorId) !== null)
            .reduce((sum, [investorId, shares]) => {
              const sourceCompanyKey = getCompanyKeyFromCorporateInvestorId(investorId);
              if (!sourceCompanyKey) return sum;
              const sourceCompany = game.companies[sourceCompanyKey];
              if (!sourceCompany || sourceCompany.ceoId !== candidateId) return sum;
              return sum + (shares / Math.max(1, company.sharesOutstanding)) * 120;
            }, 0);
          const ownership = getOwnershipPercent(company, candidateId);
          const stewardship = company.boardMood * 6 + company.reputation * 0.06 + company.marketShare * 0.05;
          const governanceFit = member.seatType === 'independent' || member.seatType === 'employee'
            ? stewardship + Math.min(ownership, 24) * 0.3
            : stewardship + ownership * 0.65;
          const score = baseScore + governanceFit + corporateInfluenceBoost;
          if (score > chosenScore) {
            chosenScore = score;
            chosenCandidate = candidateId;
          }
        });

        boardVotes.set(chosenCandidate, (boardVotes.get(chosenCandidate) ?? 0) + member.voteWeight);
      });

      const rankedCeoCandidates = Array.from(boardVotes.entries()).sort((left, right) => right[1] - left[1]);
      let ceoId = rankedCeoCandidates[0]?.[0] ?? company.founderInvestorId;
      if ((ceoOccupancy.get(ceoId) ?? 0) >= 2) {
        const fallback = rankedCeoCandidates.find(([candidateId]) => (ceoOccupancy.get(candidateId) ?? 0) < 2)?.[0];
        ceoId = fallback ?? company.founderInvestorId;
      }
      ceoOccupancy.set(ceoId, (ceoOccupancy.get(ceoId) ?? 0) + 1);
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
      const ongoingBoardVote = company.activeBoardVote && game.elapsedDays <= company.activeBoardVote.endDay
        ? {
          ...company.activeBoardVote,
          memberVotes: company.activeBoardVote.memberVotes ?? {},
        }
        : null;
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
      const voteWindowState = getBoardVoteWindowState(company, game.elapsedDays);
      const hasNewBoardVote = Boolean(
        executivePlan.activeBoardVote
        && executivePlan.activeBoardVote.startDay === game.elapsedDays
        && company.activeBoardVote?.id !== executivePlan.activeBoardVote.id
      );
      const nextVoteWindow = hasNewBoardVote ? registerBoardVoteUsage(company, game.elapsedDays) : voteWindowState;

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
          boardVoteWindowStartDay: nextVoteWindow.startDay,
          boardVoteCountInWindow: nextVoteWindow.count,
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

export function createInitialGameState(profile: ProfileDraft): GameState {
  const playerId = `player-${profile.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'neo'}`;
  const worldSeed = `${profile.name.trim()}-genesis-${Date.now()}-${Math.random()}`;
  const random = createSeededRandom(worldSeed);
  const usedFounderNames = new Set<string>();
  const usedFounderFirstNames = new Set<string>();
  const usedFounderLastNames = new Set<string>();
  const generateFounderName = (seed: number) => {
    const generated = generateUniqueNpcName(random, usedFounderNames, usedFounderFirstNames, usedFounderLastNames, seed);
    usedFounderNames.add(generated);
    return generated;
  };

  const generatedCoreNames = new Set<string>();
  const generateCoreCompanyName = () => {
    const pseudoGame = {
      companies: Object.fromEntries(Array.from(generatedCoreNames).map((name, index) => [`tmp_${index}`, { name }])) as Record<string, { name: string }>,
      communityPlans: [],
    } as unknown as GameState;
    const name = generateUniqueCompanyName(pseudoGame, random, 'semiconductor');
    generatedCoreNames.add(name);
    return name;
  };

  const coreConfigs: Array<{
    key: CompanyKey;
    cash: number;
    research: number;
    marketShare: number;
    reputation: number;
    upgrades: Record<UpgradeKey, UpgradeState>;
    teams: Record<TeamKey, TeamState>;
    focus: string;
  }> = [
    {
      key: 'cosmic',
      cash: 92,
      research: 72,
      marketShare: 12,
      reputation: 29,
      upgrades: createUpgrades({ architecture: 2, lithography: 180, clockSpeed: 1.5, coreDesign: 1, cacheStack: 512, powerEfficiency: 98 }),
      teams: createTeams({ researchers: 2, marketing: 2, fabrication: 2 }),
      focus: 'Mainstream desktop dan supply OEM agresif.',
    },
    {
      key: 'rmd',
      cash: 86,
      research: 78,
      marketShare: 10.5,
      reputation: 27,
      upgrades: createUpgrades({ architecture: 2, lithography: 170, clockSpeed: 1.7, coreDesign: 2, cacheStack: 512, powerEfficiency: 102 }),
      teams: createTeams({ researchers: 3, marketing: 1, fabrication: 1 }),
      focus: 'Performa enthusiast dengan ritme release lebih cepat.',
    },
    {
      key: 'heroscop',
      cash: 81,
      research: 75,
      marketShare: 9.5,
      reputation: 26,
      upgrades: createUpgrades({ architecture: 2, lithography: 160, clockSpeed: 1.4, coreDesign: 2, cacheStack: 768, powerEfficiency: 90 }),
      teams: createTeams({ researchers: 2, marketing: 1, fabrication: 2 }),
      focus: 'Efisiensi daya dan workstation premium.',
    },
  ];

  const [cosmic, rmd, heroscop] = coreConfigs.map((config, index) => {
    const generatedName = generateCoreCompanyName();
    return createCompany({
      key: config.key,
      name: generatedName,
      founder: generateFounderName(index + 1),
      focus: config.focus,
      cash: config.cash,
      research: config.research,
      marketShare: config.marketShare,
      reputation: config.reputation,
      upgrades: config.upgrades,
      teams: config.teams,
      shareSheetTotal: pickShareSheetTotal(config.cash + config.research),
      lastRelease: `${generatedName} Prime-1 membuka babak kompetisi awal.`,
    });
  });

  const ventureSeeds = DYNAMIC_COMPANY_KEYS.reduce((acc, key, index) => {
    acc[key] = {
      name: generateCoreCompanyName(),
      founder: generateFounderName(40 + index),
    };
    return acc;
  }, {} as Record<CompanyKey, { name: string; founder: string }>);

  const companies = {
    cosmic: { ...cosmic.company, isEstablished: false, establishedDay: null, cash: 0, research: 0, researchAssetValue: 0, marketShare: 0, reputation: 0, releaseCount: 0, revenuePerDay: 0, researchPerDay: 0, payoutRatio: 0.08, dividendPerShare: 0 },
    rmd: { ...rmd.company, isEstablished: false, establishedDay: null, cash: 0, research: 0, researchAssetValue: 0, marketShare: 0, reputation: 0, releaseCount: 0, revenuePerDay: 0, researchPerDay: 0, payoutRatio: 0.08, dividendPerShare: 0 },
    heroscop: { ...heroscop.company, isEstablished: false, establishedDay: null, cash: 0, research: 0, researchAssetValue: 0, marketShare: 0, reputation: 0, releaseCount: 0, revenuePerDay: 0, researchPerDay: 0, payoutRatio: 0.08, dividendPerShare: 0 },
    venture4: { ...cosmic.company, key: 'venture4', name: ventureSeeds.venture4.name, founder: ventureSeeds.venture4.founder, founderInvestorId: 'founder_venture4', ceoId: 'founder_venture4', ceoName: ventureSeeds.venture4.founder, focus: 'Belum aktif', lastRelease: 'Menunggu plan pendirian.', isEstablished: false, establishedDay: null, cash: 0, research: 0, researchAssetValue: 0, marketShare: 0, reputation: 0, releaseCount: 0, revenuePerDay: 0, researchPerDay: 0, payoutRatio: 0.08, dividendPerShare: 0, investors: { founder_venture4: 0 }, shareListings: [] },
    venture5: { ...cosmic.company, key: 'venture5', name: ventureSeeds.venture5.name, founder: ventureSeeds.venture5.founder, founderInvestorId: 'founder_venture5', ceoId: 'founder_venture5', ceoName: ventureSeeds.venture5.founder, focus: 'Belum aktif', lastRelease: 'Menunggu plan pendirian.', isEstablished: false, establishedDay: null, cash: 0, research: 0, researchAssetValue: 0, marketShare: 0, reputation: 0, releaseCount: 0, revenuePerDay: 0, researchPerDay: 0, payoutRatio: 0.08, dividendPerShare: 0, investors: { founder_venture5: 0 }, shareListings: [] },
    venture6: { ...cosmic.company, key: 'venture6', name: ventureSeeds.venture6.name, founder: ventureSeeds.venture6.founder, founderInvestorId: 'founder_venture6', ceoId: 'founder_venture6', ceoName: ventureSeeds.venture6.founder, focus: 'Belum aktif', lastRelease: 'Menunggu plan pendirian.', isEstablished: false, establishedDay: null, cash: 0, research: 0, researchAssetValue: 0, marketShare: 0, reputation: 0, releaseCount: 0, revenuePerDay: 0, researchPerDay: 0, payoutRatio: 0.08, dividendPerShare: 0, investors: { founder_venture6: 0 }, shareListings: [] },
    venture7: { ...cosmic.company, key: 'venture7', name: ventureSeeds.venture7.name, founder: ventureSeeds.venture7.founder, founderInvestorId: 'founder_venture7', ceoId: 'founder_venture7', ceoName: ventureSeeds.venture7.founder, focus: 'Belum aktif', lastRelease: 'Menunggu plan pendirian.', isEstablished: false, establishedDay: null, cash: 0, research: 0, researchAssetValue: 0, marketShare: 0, reputation: 0, releaseCount: 0, revenuePerDay: 0, researchPerDay: 0, payoutRatio: 0.08, dividendPerShare: 0, investors: { founder_venture7: 0 }, shareListings: [] },
    venture8: { ...cosmic.company, key: 'venture8', name: ventureSeeds.venture8.name, founder: ventureSeeds.venture8.founder, founderInvestorId: 'founder_venture8', ceoId: 'founder_venture8', ceoName: ventureSeeds.venture8.founder, focus: 'Belum aktif', lastRelease: 'Menunggu plan pendirian.', isEstablished: false, establishedDay: null, cash: 0, research: 0, researchAssetValue: 0, marketShare: 0, reputation: 0, releaseCount: 0, revenuePerDay: 0, researchPerDay: 0, payoutRatio: 0.08, dividendPerShare: 0, investors: { founder_venture8: 0 }, shareListings: [] },
  } satisfies Record<CompanyKey, CompanyState>;

  const plans = {
    cosmic: {
      companyKey: 'cosmic',
      field: 'semiconductor',
      companyName: companies.cosmic.name,
      founderInvestorId: companies.cosmic.founderInvestorId,
      founderName: companies.cosmic.founder,
      startDay: 0,
      dueDay: PLAN_DURATION_DAYS,
      targetCapital: 140,
      pledgedCapital: 44,
      shareSheetTotal: pickShareSheetTotal(140),
      pledges: [{ investorId: companies.cosmic.founderInvestorId, amount: 44, pledgedDay: 0 }],
      isEstablished: false,
    },
    rmd: {
      companyKey: 'rmd',
      field: 'semiconductor',
      companyName: companies.rmd.name,
      founderInvestorId: companies.rmd.founderInvestorId,
      founderName: companies.rmd.founder,
      startDay: 0,
      dueDay: PLAN_DURATION_DAYS,
      targetCapital: 132,
      pledgedCapital: 38,
      shareSheetTotal: pickShareSheetTotal(132),
      pledges: [{ investorId: companies.rmd.founderInvestorId, amount: 38, pledgedDay: 0 }],
      isEstablished: false,
    },
    heroscop: {
      companyKey: 'heroscop',
      field: 'semiconductor',
      companyName: companies.heroscop.name,
      founderInvestorId: companies.heroscop.founderInvestorId,
      founderName: companies.heroscop.founder,
      startDay: 0,
      dueDay: PLAN_DURATION_DAYS,
      targetCapital: 128,
      pledgedCapital: 36,
      shareSheetTotal: pickShareSheetTotal(128),
      pledges: [{ investorId: companies.heroscop.founderInvestorId, amount: 36, pledgedDay: 0 }],
      isEstablished: false,
    },
    venture4: { companyKey: 'venture4', field: 'semiconductor', companyName: companies.venture4.name, founderInvestorId: 'founder_venture4', founderName: companies.venture4.founder, startDay: 0, dueDay: 0, targetCapital: 0, pledgedCapital: 0, pledges: [], isEstablished: true },
    venture5: { companyKey: 'venture5', field: 'semiconductor', companyName: companies.venture5.name, founderInvestorId: 'founder_venture5', founderName: companies.venture5.founder, startDay: 0, dueDay: 0, targetCapital: 0, pledgedCapital: 0, pledges: [], isEstablished: true },
    venture6: { companyKey: 'venture6', field: 'semiconductor', companyName: companies.venture6.name, founderInvestorId: 'founder_venture6', founderName: companies.venture6.founder, startDay: 0, dueDay: 0, targetCapital: 0, pledgedCapital: 0, pledges: [], isEstablished: true },
    venture7: { companyKey: 'venture7', field: 'semiconductor', companyName: companies.venture7.name, founderInvestorId: 'founder_venture7', founderName: companies.venture7.founder, startDay: 0, dueDay: 0, targetCapital: 0, pledgedCapital: 0, pledges: [], isEstablished: true },
    venture8: { companyKey: 'venture8', field: 'semiconductor', companyName: companies.venture8.name, founderInvestorId: 'founder_venture8', founderName: companies.venture8.founder, startDay: 0, dueDay: 0, targetCapital: 0, pledgedCapital: 0, pledges: [], isEstablished: true },
  } satisfies Record<CompanyKey, CompanyEstablishmentPlan>;

  const npcSeed = `${worldSeed}-market`;
  const generatedNpcCount = Math.min(INITIAL_NPC_COUNT, Math.max(0, MAX_ACTIVE_NPCS - CORE_COMPANY_KEYS.length));
  const generatedNpcs = createGenerativeNpcs(npcSeed, generatedNpcCount);
  const founderRandom = createSeededRandom(`${worldSeed}-founders`);
  const existingNpcIds = new Set<string>(generatedNpcs.map((npc) => npc.id));
  const founderNpcs = CORE_COMPANY_KEYS.map((key) => createFounderNpc(
    companies[key].founderInvestorId,
    companies[key].founder,
    key,
    founderRandom,
    existingNpcIds
  ));
  const npcs = [...founderNpcs, ...generatedNpcs];

  npcs.forEach((npc) => {
    npc.analysisNote = `${npc.name} mulai agresif menilai valuasi, arus kas, kualitas manajemen, dan momentum riset untuk membangun posisi besar lintas perusahaan.`;
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
      companyType: profile.companyType,
    },
    companies,
    plans,
    communityPlans: [],
    appStoreLicenseRequests: [],
    npcs,
    activityFeed: [
      `01/01/00: Profil ${profile.name.trim() || 'Player'} dibuat dengan modal awal $${formatMoneyCompact(PLAYER_STARTING_CASH)}.`,
      `01/01/00: ${npcs.length} AI NPC aktif dibangkitkan (termasuk para founder) dengan strategi value, growth, dividend, activist, dan balanced.`,
      `01/01/00: Belum ada perusahaan aktif. Semua entitas masih fase Company Establishment Plan selama 30 hari.`,
      `01/01/00: Dewan direksi akan aktif penuh setelah perusahaan benar-benar berdiri.`,
    ],
  });
}

export const INITIAL_BASELINES = {
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
} satisfies Partial<Record<CompanyKey, { upgrades: Record<UpgradeKey, number> }>>;

export function applyCashToInvestor(game: GameState, investorId: string, amount: number) {
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

export function isIndividualInvestorId(investorId: string) {
  return !getCompanyKeyFromCorporateInvestorId(investorId);
}

export function getInvestorHoldingsValue(game: GameState, investorId: string) {
  return COMPANY_KEYS.reduce((sum, key) => {
    const company = game.companies[key];
    const shares = company.investors[investorId] ?? 0;
    if (shares <= 0.0001) return sum;
    return sum + shares * getSharePrice(company);
  }, 0);
}

export function getInvestorWeeklyIncomeEstimate(game: GameState, investorId: string) {
  const dividendIncomeWeekly = COMPANY_KEYS.reduce((sum, key) => {
    const company = game.companies[key];
    const shares = company.investors[investorId] ?? 0;
    if (shares <= 0.0001) return sum;
    return sum + shares * company.dividendPerShare * 7;
  }, 0);
  const executiveIncomePerDay = COMPANY_KEYS.reduce((sum, key) => {
    const company = game.companies[key];
    if (!company.isEstablished) return sum;
    let perDay = 0;
    if (company.ceoId === investorId) perDay += company.ceoSalaryPerDay;
    EXECUTIVE_ROLES.forEach((role) => {
      if (company.executives[role]?.occupantId === investorId) {
        perDay += company.executives[role]!.salaryPerDay;
      }
    });
    return sum + perDay;
  }, 0);
  return dividendIncomeWeekly + executiveIncomePerDay * 7;
}

export function estimateMonthlyInvestorTax(game: GameState, investorId: string) {
  const cash = getInvestorCash(game, investorId);
  const wealth = cash + getInvestorHoldingsValue(game, investorId);
  const weeklyIncome = getInvestorWeeklyIncomeEstimate(game, investorId);
  const progressiveRate =
    wealth > 1800 ? 0.045
      : wealth > 900 ? 0.035
        : wealth > 320 ? 0.026
          : wealth > 140 ? 0.021
            : 0.016;
  const baseTax = wealth * progressiveRate;
  const incomeFloor = weeklyIncome * 1.18;
  return Math.max(baseTax, incomeFloor, wealth > 18 ? 0.25 : 0.08);
}

export function liquidateInvestorHoldingsForTax(game: GameState, investorId: string, neededCash: number) {
  if (neededCash <= 0) return { next: game, raisedCash: 0 };
  const holdings = COMPANY_KEYS
    .map((key) => {
      const company = game.companies[key];
      const shares = company.investors[investorId] ?? 0;
      return { key, company, shares, value: shares * getSharePrice(company), price: getSharePrice(company) };
    })
    .filter((entry) => entry.shares > 0.0001 && entry.value > 0.0001)
    .sort((left, right) => right.value - left.value);

  if (holdings.length === 0) return { next: game, raisedCash: 0 };

  let next = { ...game, companies: { ...game.companies } };
  let raisedCash = 0;

  holdings.some((holding) => {
    if (raisedCash >= neededCash) return true;
    const company = next.companies[holding.key];
    const currentShares = company.investors[investorId] ?? 0;
    if (currentShares <= 0.0001) return false;
    const neededShares = clamp((neededCash - raisedCash) / Math.max(0.0001, holding.price), 0, currentShares);
    const sharesToSell = Math.min(currentShares, Math.max(0.01, neededShares));
    const cashFromSale = sharesToSell * holding.price;
    raisedCash += cashFromSale;
    const updatedShares = Math.max(0, currentShares - sharesToSell);
    const investors = { ...company.investors, [investorId]: updatedShares };
    if (updatedShares <= 0.0001) delete investors[investorId];
    next.companies[holding.key] = {
      ...company,
      investors,
      marketPoolShares: company.marketPoolShares + sharesToSell,
    };
    return false;
  });

  return { next, raisedCash };
}

export function applyMonthlyInvestorTaxes(game: GameState) {
  const individualIds = new Set<string>([game.player.id, ...game.npcs.map((npc) => npc.id)]);
  COMPANY_KEYS.forEach((key) => {
    Object.keys(game.companies[key].investors).forEach((investorId) => {
      if (isIndividualInvestorId(investorId)) individualIds.add(investorId);
    });
  });

  let next = game;
  individualIds.forEach((investorId) => {
    const taxDue = estimateMonthlyInvestorTax(next, investorId);
    if (taxDue <= 0.01) return;
    const currentCash = getInvestorCash(next, investorId);
    let taxableState = next;
    let taxPaidFromLiquidation = 0;
    if (currentCash + 0.0001 < taxDue) {
      const liquidation = liquidateInvestorHoldingsForTax(next, investorId, taxDue - currentCash);
      taxableState = liquidation.next;
      taxPaidFromLiquidation = liquidation.raisedCash;
    }
    const payable = Math.min(taxDue, getInvestorCash(taxableState, investorId));
    if (payable <= 0.0001) {
      next = taxableState;
      return;
    }
    const taxedState = applyCashToInvestor(taxableState, investorId, -payable);
    const note = taxPaidFromLiquidation > 0
      ? `${formatDateFromDays(taxedState.elapsedDays)}: ${investorDisplayName(taxedState, investorId)} menjual saham kecil otomatis untuk bayar pajak bulanan ${formatMoneyCompact(payable, 2)}.`
      : `${formatDateFromDays(taxedState.elapsedDays)}: ${investorDisplayName(taxedState, investorId)} membayar pajak bulanan ${formatMoneyCompact(payable, 2)} dari kas.`;
    next = { ...taxedState, activityFeed: addFeedEntry(taxedState.activityFeed, note) };
  });

  return next;
}

export function investInCompanyPlan(game: GameState, investorId: string, companyKey: CompanyKey, amount: number) {
  const plan = game.plans[companyKey];
  if (!plan || plan.isEstablished || amount <= 0) return game;
  const investorCash = getInvestorCash(game, investorId);
  const contribution = clamp(amount, 0, investorCash);
  if (contribution < MIN_TRADE_AMOUNT) return game;

  const next = applyCashToInvestor(
    {
      ...game,
      plans: {
        ...game.plans,
        [companyKey]: {
          ...plan,
          pledgedCapital: plan.pledgedCapital + contribution,
          pledges: [...plan.pledges, { investorId, amount: contribution, pledgedDay: game.elapsedDays }],
        },
      },
    },
    investorId,
    -contribution
  );
  return {
    ...next,
    activityFeed: addFeedEntry(next.activityFeed, `${formatDateFromDays(next.elapsedDays)}: ${investorDisplayName(next, investorId)} berkomitmen ${formatMoneyCompact(contribution, 2)} ke plan pendirian ${plan.companyName}.`),
  };
}

export function progressCompanyPlans(game: GameState) {
  let next = game;
  COMPANY_KEYS.forEach((key) => {
    const plan = next.plans[key];
    if (!plan || plan.isEstablished || next.elapsedDays < plan.dueDay) return;
    const company = next.companies[key];
    const targetShareSheets = plan.shareSheetTotal ?? pickShareSheetTotal(plan.targetCapital);
    const sheetRatio = targetShareSheets / Math.max(1, company.sharesOutstanding);
    const establishedCompany: CompanyState = {
      ...company,
      field: plan.field,
      softwareSpecialization: plan.field === 'software' ? (plan.softwareSpecialization ?? 'utility-apps') : null,
      isEstablished: true,
      establishedDay: next.elapsedDays,
      cash: Math.max(18, plan.pledgedCapital * 0.78),
      research: Math.max(14, plan.pledgedCapital * 0.42),
      researchAssetValue: Math.max(14, plan.pledgedCapital * 0.42),
      marketShare: Math.max(2.5, plan.pledgedCapital / 22),
      reputation: Math.max(8, 6 + plan.pledgedCapital / 12),
      releaseCount: 1,
      revenuePerDay: Math.max(2.2, plan.pledgedCapital / 18),
      researchPerDay: Math.max(1.4, plan.pledgedCapital / 28),
      payoutRatio: 0.1,
      dividendPerShare: 0.01,
      sharesOutstanding: targetShareSheets,
      shareSheetTotal: targetShareSheets,
      lastShareSheetChangeDay: 0,
      marketPoolShares: company.marketPoolShares * sheetRatio,
    };
    const planInvestors = new Map<string, number>();
    plan.pledges.forEach((pledge) => {
      planInvestors.set(pledge.investorId, (planInvestors.get(pledge.investorId) ?? 0) + pledge.amount);
    });
    const totalPledge = Math.max(1, plan.pledgedCapital);
    const investors = { ...establishedCompany.investors };
    planInvestors.forEach((pledged, investorId) => {
      const shares = Math.max(0, Math.round((pledged / totalPledge) * establishedCompany.marketPoolShares * 100) / 100);
      if (shares > 0) investors[investorId] = (investors[investorId] ?? 0) + shares;
    });
    next = {
      ...next,
      companies: {
        ...next.companies,
        [key]: { ...establishedCompany, investors },
      },
      plans: {
        ...next.plans,
        [key]: { ...plan, isEstablished: true },
      },
      activityFeed: addFeedEntry(next.activityFeed, `${formatDateFromDays(next.elapsedDays)}: ${plan.companyName} resmi berdiri dengan modal awal ${formatMoneyCompact(plan.pledgedCapital, 2)}.`),
    };
  });
  return next;
}

function getActiveCompanyCount(game: GameState) {
  const baseEstablished = COMPANY_KEYS.filter((key) => game.companies[key].isEstablished).length;
  const communityEstablished = game.communityPlans.filter((plan) => plan.status === 'established').length;
  return baseEstablished + communityEstablished;
}

function getActiveCompanyCountByField(game: GameState, field: CompanyField) {
  const baseEstablished = COMPANY_KEYS.filter((key) => game.companies[key].isEstablished && game.companies[key].field === field).length;
  const communityEstablished = game.communityPlans.filter((plan) => plan.status === 'established' && plan.field === field).length;
  return baseEstablished + communityEstablished;
}

function getTargetActiveCompanyCount(elapsedDays: number) {
  if (elapsedDays <= 365) return 5;
  if (elapsedDays <= 1095) {
    const progress = (elapsedDays - 365) / (1095 - 365);
    return Math.round(5 + progress * 3);
  }
  return 8;
}

export function getCompanyFieldLabel(field: CompanyField) {
  if (field === 'game') return 'Game';
  if (field === 'software') return 'Software';
  return 'Semiconductor';
}

export function mapProfileCompanyTypeToField(companyType: 'cpu' | 'game' | 'software'): CompanyField {
  if (companyType === 'game') return 'game';
  if (companyType === 'software') return 'software';
  return 'semiconductor';
}

export function getActiveAppStoreCompanies(game: GameState) {
  return (Object.values(game.companies) as CompanyState[])
    .filter((company) => company.isEstablished && company.field === 'software' && company.softwareSpecialization === 'app-store');
}

export function requestAppStoreLicense(
  game: GameState,
  requesterId: string,
  gameCompanyKey: CompanyKey,
  softwareCompanyKey: CompanyKey,
  note: string
) {
  const gameCompany = game.companies[gameCompanyKey];
  const softwareCompany = game.companies[softwareCompanyKey];
  if (!gameCompany.isEstablished || !softwareCompany.isEstablished) return game;
  if (gameCompany.field !== 'game') return game;
  if (softwareCompany.field !== 'software' || softwareCompany.softwareSpecialization !== 'app-store') return game;
  const pairRequests = game.appStoreLicenseRequests
    .filter((request) => request.gameCompanyKey === gameCompanyKey && request.softwareCompanyKey === softwareCompanyKey)
    .sort((left, right) => right.requestedDay - left.requestedDay);
  const latestRequest = pairRequests[0];
  if (latestRequest?.status === 'pending' || latestRequest?.status === 'approved') return game;
  if (latestRequest?.status === 'rejected' && latestRequest.decisionDay !== null) {
    const daysSinceRejection = game.elapsedDays - latestRequest.decisionDay;
    if (daysSinceRejection < 30) return game;
  }

  const request: AppStoreLicenseRequest = {
    id: `license-${gameCompanyKey}-${softwareCompanyKey}-${Math.floor(game.elapsedDays)}-${Math.floor(game.tickCount)}`,
    gameCompanyKey,
    softwareCompanyKey,
    requesterId,
    requestedDay: game.elapsedDays,
    status: 'pending',
    decisionDay: null,
    revenueShare: clamp(0.17 + softwareCompany.reputation / 520, 0.12, 0.34),
    monthlyDownloads: 0,
    publishedReleaseCount: 0,
    lastPublishedDay: null,
    note,
  };

  return {
    ...game,
    appStoreLicenseRequests: [request, ...game.appStoreLicenseRequests].slice(0, 220),
    activityFeed: addFeedEntry(
      game.activityFeed,
      `${formatDateFromDays(game.elapsedDays)}: ${gameCompany.name} mengajukan lisensi App Store ke ${softwareCompany.name}.`
    ),
  };
}

export function decideAppStoreLicense(
  game: GameState,
  requestId: string,
  approverId: string,
  decision: 'approved' | 'rejected'
) {
  const request = game.appStoreLicenseRequests.find((entry) => entry.id === requestId);
  if (!request || request.status !== 'pending') return game;
  const softwareCompany = game.companies[request.softwareCompanyKey];
  if (softwareCompany.ceoId !== approverId) return game;
  const updatedRequests = game.appStoreLicenseRequests.map((entry) => {
    if (entry.id !== requestId) return entry;
    return {
      ...entry,
      status: decision,
      decisionDay: game.elapsedDays,
    };
  });
  const gameCompany = game.companies[request.gameCompanyKey];
  const decisionLabel = decision === 'approved' ? 'menyetujui' : 'menolak';
  return {
    ...game,
    appStoreLicenseRequests: updatedRequests,
    activityFeed: addFeedEntry(
      game.activityFeed,
      `${formatDateFromDays(game.elapsedDays)}: ${softwareCompany.name} ${decisionLabel} lisensi ${gameCompany.name} di App Store.`
    ),
  };
}

export function evaluateCompanyFieldCompetition(game: GameState, field: CompanyField) {
  const sameFieldCompanies = (Object.values(game.companies) as CompanyState[]).filter((company) => company.isEstablished && company.field === field);
  const competitors = sameFieldCompanies.length;
  const avgMarketShare = competitors > 0 ? sameFieldCompanies.reduce((sum, company) => sum + company.marketShare, 0) / competitors : 0;
  const topMarketShare = competitors > 0 ? Math.max(...sameFieldCompanies.map((company) => company.marketShare)) : 0;
  const avgReputation = competitors > 0 ? sameFieldCompanies.reduce((sum, company) => sum + company.reputation, 0) / competitors : 0;
  const avgResearch = competitors > 0 ? sameFieldCompanies.reduce((sum, company) => sum + company.researchPerDay, 0) / competitors : 0;
  const saturation = clamp((avgMarketShare / 22) + (topMarketShare / 40) + (avgReputation / 90) + (avgResearch / 60), 0, 3.8);
  const fieldBoost = field === 'game' ? 0.15 : field === 'software' ? 0.2 : 0;
  const opportunity = clamp(1.9 - saturation + (competitors === 0 ? 0.7 : 0) + fieldBoost, 0.15, 2.6);
  return { competitors, avgMarketShare, topMarketShare, saturation, opportunity };
}

export function chooseBestCompanyFieldForNpc(game: GameState, npc: NpcInvestor): CompanyField {
  const semiconductor = evaluateCompanyFieldCompetition(game, 'semiconductor');
  const gameField = evaluateCompanyFieldCompetition(game, 'game');
  const softwareField = evaluateCompanyFieldCompetition(game, 'software');
  const strategyGameBias =
    npc.strategy === 'growth'
      ? 0.18
      : npc.strategy === 'activist'
        ? 0.08
        : npc.strategy === 'dividend'
          ? -0.08
          : 0;
  const strategySemiconductorBias = npc.strategy === 'value' || npc.strategy === 'dividend' ? 0.1 : 0;
  const gamePriorityBoost = 0.22 + npc.intelligence * 0.08 + npc.boldness * 0.06;
  const gameScore =
    gameField.opportunity * (1.08 + npc.intelligence * 0.38)
    + (1 - gameField.saturation / 4) * (0.45 + npc.boldness * 0.32)
    + strategyGameBias
    + clamp((semiconductor.topMarketShare - gameField.topMarketShare) / 100, -0.2, 0.25)
    + gamePriorityBoost;
  const semiconductorScore =
    semiconductor.opportunity * (1.04 + npc.patience * 0.26)
    + (1 - semiconductor.saturation / 4) * (0.52 + npc.intelligence * 0.3)
    + strategySemiconductorBias;
  const softwareScore =
    softwareField.opportunity * (1.1 + npc.intelligence * 0.32)
    + (1 - softwareField.saturation / 4) * (0.5 + npc.boldness * 0.3)
    + (npc.strategy === 'growth' ? 0.14 : 0)
    + (npc.strategy === 'balanced' ? 0.08 : 0);
  if (softwareScore >= gameScore && softwareScore >= semiconductorScore) return 'software';
  return gameScore >= semiconductorScore ? 'game' : 'semiconductor';
}

export function createCommunityCompanyPlan(
  game: GameState,
  founderId: string,
  companyNameRaw: string,
  founderContribution: number,
  field: CompanyField = 'semiconductor',
  softwareSpecialization?: SoftwareSpecialization
) {
  const companyName = companyNameRaw.trim().replace(/\s+/g, ' ');
  const words = normalizeCompanyNameWords(companyName);
  if (!companyName || companyName.length < 3) return game;
  if (words.length < 1 || words.length > 3) return game;
  if (hasCompanyWordCollision(game, companyName)) return game;
  if (game.communityPlans.some((plan) => plan.companyName.toLowerCase() === companyName.toLowerCase() && plan.status !== 'expired')) return game;
  if (getActiveCompanyCount(game) >= MAX_ACTIVE_COMPANIES) return game;
  const activeFundingPlans = game.communityPlans.filter((plan) => plan.status === 'funding').length;
  if (activeFundingPlans >= Math.max(1, MAX_ACTIVE_COMPANIES - getActiveCompanyCount(game))) return game;
  const founderCash = getInvestorCash(game, founderId);
  const contribution = clamp(founderContribution, 0, founderCash);
  if (contribution < 6) return game;
  const competeTarget = (Object.values(game.companies) as CompanyState[])
    .filter((company) => company.isEstablished && company.field === field)
    .sort((left, right) => right.marketShare - left.marketShare)[0]?.name ?? 'pasar umum';
  const targetCapital = Math.max(24, contribution * 2.6);
  const softwareSpecializationPool: SoftwareSpecialization[] = ['app-store', 'operating-system', 'entertainment-apps', 'utility-apps'];
  const specializationSeed = `${founderId}-${companyName}`.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const derivedSoftwareSpecialization = field === 'software'
    ? (softwareSpecialization ?? softwareSpecializationPool[specializationSeed % softwareSpecializationPool.length])
    : null;
  const plan: CommunityCompanyPlan = {
    id: `community-${Math.floor(game.elapsedDays)}-${companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    field,
    softwareSpecialization: derivedSoftwareSpecialization,
    companyName,
    founderId,
    founderName: investorDisplayName(game, founderId),
    startDay: game.elapsedDays,
    dueDay: game.elapsedDays + PLAN_DURATION_DAYS,
    targetCapital,
    pledgedCapital: contribution,
    investorIds: [founderId],
    status: 'funding',
    competesWith: competeTarget,
  };
  const next = applyCashToInvestor({ ...game, communityPlans: [plan, ...game.communityPlans] }, founderId, -contribution);
  return {
    ...next,
    activityFeed: addFeedEntry(next.activityFeed, `${formatDateFromDays(next.elapsedDays)}: ${plan.founderName} membuka plan pendirian ${plan.companyName} (${getCompanyFieldLabel(plan.field)}) untuk menantang ${plan.competesWith}.`),
  };
}

export function investInCommunityPlan(game: GameState, investorId: string, planId: string, amount: number) {
  const planIndex = game.communityPlans.findIndex((plan) => plan.id === planId && plan.status === 'funding');
  if (planIndex < 0) return game;
  const investorCash = getInvestorCash(game, investorId);
  const contribution = clamp(amount, 0, investorCash);
  if (contribution < MIN_TRADE_AMOUNT) return game;
  const plan = game.communityPlans[planIndex];
  const updatedPlan: CommunityCompanyPlan = {
    ...plan,
    pledgedCapital: plan.pledgedCapital + contribution,
    investorIds: plan.investorIds.includes(investorId) ? plan.investorIds : [...plan.investorIds, investorId],
  };
  const nextPlans = [...game.communityPlans];
  nextPlans[planIndex] = updatedPlan;
  const next = applyCashToInvestor({ ...game, communityPlans: nextPlans }, investorId, -contribution);
  return {
    ...next,
    activityFeed: addFeedEntry(next.activityFeed, `${formatDateFromDays(next.elapsedDays)}: ${investorDisplayName(next, investorId)} menambah ${formatMoneyCompact(contribution, 2)} ke plan ${plan.companyName}.`),
  };
}

export function progressCommunityPlans(game: GameState) {
  if (game.communityPlans.length === 0) return game;
  let changed = false;
  const nextPlans = game.communityPlans.map((plan) => {
    if (plan.status !== 'funding' || game.elapsedDays < plan.dueDay) return plan;
    changed = true;
    if (plan.pledgedCapital >= plan.targetCapital * 0.6 && getActiveCompanyCount(game) < MAX_ACTIVE_COMPANIES) {
      return { ...plan, status: 'established' as const };
    }
    return { ...plan, status: 'expired' as const };
  });
  if (!changed) return game;
  const establishedNow = nextPlans.filter((plan, idx) => plan.status === 'established' && game.communityPlans[idx].status === 'funding');
  const expiredNow = nextPlans.filter((plan, idx) => plan.status === 'expired' && game.communityPlans[idx].status === 'funding');
  let next = { ...game, communityPlans: nextPlans, companies: { ...game.companies } };
  establishedNow.forEach((plan) => {
    const availableSlot = DYNAMIC_COMPANY_KEYS.find((key) => !next.companies[key].isEstablished);
    if (availableSlot) {
      const company = next.companies[availableSlot];
      const targetShareSheets = pickShareSheetTotal(plan.targetCapital);
      const founderShares = Math.round(Math.max(0, targetShareSheets * 0.4) * 100) / 100;
      const marketPoolShares = Math.max(0, targetShareSheets - founderShares);
      const seededTeams = createTeams({ researchers: 2, marketing: 1, fabrication: 1 });
      const seededUpgrades = createUpgrades({ architecture: 2, lithography: 170, clockSpeed: 1.5, coreDesign: 2, cacheStack: 512, powerEfficiency: 96 });
      next.companies[availableSlot] = {
        ...company,
        key: availableSlot,
        field: plan.field,
        softwareSpecialization: plan.field === 'software' ? (plan.softwareSpecialization ?? 'utility-apps') : null,
        name: plan.companyName,
        founder: plan.founderName,
        founderInvestorId: plan.founderId,
        ceoId: plan.founderId,
        ceoName: plan.founderName,
        cash: Math.max(16, plan.pledgedCapital * 0.74),
        research: Math.max(10, plan.pledgedCapital * 0.34),
        researchAssetValue: Math.max(10, plan.pledgedCapital * 0.34),
        marketShare: clamp(plan.pledgedCapital / 30, 2.4, 11),
        reputation: clamp(8 + plan.pledgedCapital / 18, 8, 34),
        releaseCount: 1,
        bestCpuScore: calculateCpuScore(seededUpgrades),
        revenuePerDay: Math.max(1.8, plan.pledgedCapital / 24),
        researchPerDay: Math.max(1.1, plan.pledgedCapital / 34),
        lastRelease: `${plan.companyName} menyiapkan lineup pembuka ${plan.field === 'game' ? 'game' : 'chip'} untuk menantang ${plan.competesWith}.`,
        focus: `Pendatang baru sektor ${getCompanyFieldLabel(plan.field).toLowerCase()} yang menantang ${plan.competesWith}.`,
        upgrades: seededUpgrades,
        teams: seededTeams,
        investors: { [plan.founderId]: founderShares },
        sharesOutstanding: targetShareSheets,
        shareSheetTotal: targetShareSheets,
        lastShareSheetChangeDay: next.elapsedDays,
        marketPoolShares,
        dividendPerShare: 0.01,
        payoutRatio: 0.09,
        ceoSalaryPerDay: Math.max(0.7, plan.pledgedCapital * 0.018),
        boardMood: 0.56,
        shareListings: [],
        activeBoardVote: null,
        boardVoteWindowStartDay: next.elapsedDays,
        boardVoteCountInWindow: 0,
        isEstablished: true,
        establishedDay: next.elapsedDays,
      };
    }
    next.activityFeed = addFeedEntry(next.activityFeed, `${formatDateFromDays(next.elapsedDays)}: ${plan.companyName} resmi berdiri sebagai perusahaan ${getCompanyFieldLabel(plan.field)} dan mulai menantang ${plan.competesWith}.`);
  });
  expiredNow.forEach((plan) => {
    next.activityFeed = addFeedEntry(next.activityFeed, `${formatDateFromDays(next.elapsedDays)}: Plan ${plan.companyName} gagal mencapai modal minimum dan ditutup.`);
  });
  return {
    ...next,
    communityPlans: next.communityPlans.filter((plan) => plan.status === 'funding'),
  };
}

export function changeCompanyShareSheetTotal(game: GameState, companyKey: CompanyKey, actorId: string, nextTotal: number) {
  const company = game.companies[companyKey];
  if (company.ceoId !== actorId) {
    return { next: game, changed: false, reason: 'Hanya CEO aktif yang bisa mengubah sistem share sheets.' };
  }
  const permission = canChangeShareSheetTotal(company, nextTotal, game.elapsedDays);
  if (!permission.ok) {
    return { next: game, changed: false, reason: permission.reason };
  }

  const ratio = nextTotal / Math.max(1, company.sharesOutstanding);
  const scaledInvestors = Object.fromEntries(
    Object.entries(company.investors).map(([investorId, shares]) => [investorId, Math.max(0, shares * ratio)])
  );
  const scaledShareListings = company.shareListings
    .map((listing) => ({ ...listing, sharesAvailable: Math.max(0, listing.sharesAvailable * ratio) }))
    .filter((listing) => listing.sharesAvailable > 0.01);
  const scaledMarketPool = Math.max(0, company.marketPoolShares * ratio);
  const scaledDividendPerShare = company.dividendPerShare * (company.sharesOutstanding / nextTotal);

  const updatedCompany: CompanyState = {
    ...company,
    investors: scaledInvestors,
    shareListings: scaledShareListings,
    marketPoolShares: scaledMarketPool,
    sharesOutstanding: nextTotal,
    shareSheetTotal: nextTotal,
    lastShareSheetChangeDay: game.elapsedDays,
    dividendPerShare: scaledDividendPerShare,
  };

  const nextGame = resolveGovernance({
    ...game,
    companies: {
      ...game.companies,
      [companyKey]: updatedCompany,
    },
    activityFeed: addFeedEntry(
      game.activityFeed,
      `${formatDateFromDays(game.elapsedDays)}: ${updatedCompany.name} menetapkan share sheets menjadi ${formatNumber(nextTotal)} oleh CEO ${investorDisplayName(game, actorId)}.`
    ),
  });
  return { next: nextGame, changed: true, reason: '' };
}

export function transactShares(current: GameState, investorId: string, companyKey: CompanyKey, mode: InvestorActionMode, requestedAmount: number, route: TradeRoute = 'auto') {
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

export function maybeGenerateMoreNpcs(current: GameState) {
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

  const newNpcs = createGenerativeNpcs(
    `late-${current.elapsedDays}`,
    targetCount - current.npcs.length,
    current.npcs.length,
    current.npcs.map((npc) => npc.name)
  );
  let next = { ...current, npcs: [...current.npcs] };

  newNpcs.forEach((npc, index) => {
    next.npcs.push(npc);
    const targetCompany = COMPANY_KEYS[index % COMPANY_KEYS.length];
    const budget = 28 + index * 3;
    if (next.companies[targetCompany].isEstablished) {
      const result = transactShares(next, npc.id, targetCompany, 'buy', budget);
      next = result.next;
    } else {
      next = investInCompanyPlan(next, npc.id, targetCompany, Math.min(budget * 0.25, 10));
    }
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

export function runNpcCommunityPlanning(current: GameState) {
  let next = current;
  const getOpenFundingPlans = () => next.communityPlans.filter((plan) => plan.status === 'funding');
  const getOpenFundingCount = () => getOpenFundingPlans().length;
  const lastInitiationDay = next.communityPlans.reduce((max, plan) => Math.max(max, plan.startDay), -Infinity);
  const minInitiationGapDays = next.elapsedDays < 365 ? 40 : next.elapsedDays < 1095 ? 28 : 20;
  const canForceInitiate = !Number.isFinite(lastInitiationDay) || (next.elapsedDays - lastInitiationDay >= minInitiationGapDays);
  const marketNeedsCompetition = (Object.values(next.companies) as CompanyState[])
    .filter((company) => company.isEstablished)
    .some((company) => company.marketShare > 34 || company.boardMood < 0.46 || company.reputation < 26);
  const targetActiveCompanies = getTargetActiveCompanyCount(next.elapsedDays);
  const openFundingLimit = next.elapsedDays < 365 ? 2 : next.elapsedDays < 1095 ? 3 : 4;

  const rankedFounderCandidates = [...next.npcs]
    .sort((left, right) => (
      (right.intelligence * 0.62 + right.boldness * 0.38 + right.cash / 240)
      - (left.intelligence * 0.62 + left.boldness * 0.38 + left.cash / 240)
    ));

  const missingFields = (['semiconductor', 'game', 'software'] as CompanyField[]).filter((field) => (
    getActiveCompanyCountByField(next, field) === 0
    && getOpenFundingPlans().every((plan) => plan.field !== field)
  ));
  missingFields.forEach((field) => {
    if (!canForceInitiate) return;
    if (getActiveCompanyCount(next) >= Math.min(MAX_ACTIVE_COMPANIES, targetActiveCompanies + 1)) return;
    if (getOpenFundingCount() >= openFundingLimit) return;
    const founder = rankedFounderCandidates.find((candidate) => candidate.cash >= 12);
    if (!founder) return;
    const seed = createSeededRandom(`${founder.id}-${Math.floor(next.elapsedDays)}-missing-field-${field}`);
    const contribution = clamp(founder.cash * (0.1 + founder.boldness * 0.1), 0, 26);
    if (contribution < 8) return;
    const candidateName = generateUniqueCompanyName(next, seed, field);
    next = createCommunityCompanyPlan(next, founder.id, candidateName, contribution, field);
  });

  if (
    canForceInitiate
    && marketNeedsCompetition
    && getActiveCompanyCount(next) < Math.min(MAX_ACTIVE_COMPANIES, targetActiveCompanies)
    && getOpenFundingCount() < openFundingLimit
  ) {
    const founder = rankedFounderCandidates[0];
    if (founder) {
      const seed = createSeededRandom(`${founder.id}-${Math.floor(next.elapsedDays)}-forced-community`);
      const contribution = clamp(founder.cash * (0.11 + founder.boldness * 0.12), 0, 28);
      if (contribution >= 8) {
        const field = chooseBestCompanyFieldForNpc(next, founder);
        const candidateName = generateUniqueCompanyName(next, seed, field);
        next = createCommunityCompanyPlan(next, founder.id, candidateName, contribution, field);
      }
    }
  }

  next.npcs.forEach((npc) => {
    const preferredField = chooseBestCompanyFieldForNpc(next, npc);
    const founderChanceBase = next.elapsedDays < 365 ? 0.045 : next.elapsedDays < 1095 ? 0.06 : 0.075;
    const founderChance = founderChanceBase + npc.boldness * 0.06 + npc.intelligence * 0.055 + (marketNeedsCompetition ? 0.025 : 0) + (preferredField === 'game' || preferredField === 'software' ? 0.035 : 0);
    const seed = createSeededRandom(`${npc.id}-${Math.floor(next.elapsedDays)}-community`);
    if (
      seed() < founderChance
      && getActiveCompanyCount(next) < Math.min(MAX_ACTIVE_COMPANIES, targetActiveCompanies + 1)
      && getOpenFundingCount() < openFundingLimit
    ) {
      const contribution = clamp(npc.cash * (0.06 + npc.boldness * 0.1), 0, 18);
      if (contribution >= 8) {
        const candidateName = generateUniqueCompanyName(next, seed, preferredField);
        next = createCommunityCompanyPlan(next, npc.id, candidateName, contribution, preferredField);
      }
    }
    const openFundingByField = next.communityPlans.filter((plan) => plan.status === 'funding' && plan.founderId !== npc.id && plan.field === preferredField);
    const openFunding = openFundingByField.length > 0
      ? openFundingByField
      : next.communityPlans.filter((plan) => plan.status === 'funding' && plan.founderId !== npc.id);
    if (openFunding.length === 0) return;
    const selected = openFunding[Math.floor(seed() * openFunding.length)];
    const contribution = clamp(npc.cash * (0.02 + npc.intelligence * 0.04), 0, 7.5);
    if (contribution >= MIN_TRADE_AMOUNT) {
      next = investInCommunityPlan(next, npc.id, selected.id, contribution);
    }
  });
  return next;
}

export function simulateTick(current: GameState) {
  const tickDays = TICK_MS / 1000;
  const nextElapsedDays = current.elapsedDays + tickDays;
  const reachedNewDay = Math.floor(nextElapsedDays) > Math.floor(current.elapsedDays);
  const reachedNewTaxMonth =
    Math.floor(nextElapsedDays / INVESTOR_TAX_INTERVAL_DAYS) > Math.floor(current.elapsedDays / INVESTOR_TAX_INTERVAL_DAYS);
  const shouldRefreshGovernance =
    reachedNewDay
    || current.tickCount % GOVERNANCE_REFRESH_TICK_INTERVAL === 0
    || (Object.values(current.companies) as CompanyState[]).some((company) => Boolean(company.activeBoardVote));
  const governedCurrent = shouldRefreshGovernance ? resolveGovernance(current) : current;

  let nextPlayerCash = governedCurrent.player.cash;
  const npcCashMap = new Map(governedCurrent.npcs.map((npc) => [npc.id, npc.cash]));
  const corporateCashDelta = new Map<CompanyKey, number>();
  const approvedLicenseByPair = new Map<string, AppStoreLicenseRequest>();
  governedCurrent.appStoreLicenseRequests.forEach((request) => {
    if (request.status !== 'approved') return;
    const pairKey = `${request.gameCompanyKey}:${request.softwareCompanyKey}`;
    const existing = approvedLicenseByPair.get(pairKey);
    if (!existing || (existing.decisionDay ?? -1) < (request.decisionDay ?? -1)) {
      approvedLicenseByPair.set(pairKey, request);
    }
  });
  const getPortfolioValue = (companyKey: CompanyKey) => {
    const investorId = getCorporateInvestorId(companyKey);
    return (Object.values(governedCurrent.companies) as CompanyState[]).reduce((sum, targetCompany) => {
      const shares = targetCompany.investors[investorId] ?? 0;
      if (shares <= 0.0001) return sum;
      return sum + shares * getSharePrice(targetCompany);
    }, 0);
  };

  const companies = Object.fromEntries(
    (Object.entries(governedCurrent.companies) as [CompanyKey, CompanyState][]).map(([key, governedCompany]) => {
      if (!governedCompany.isEstablished) {
        return [key, governedCompany];
      }
      let appStoreRevenuePerDay = 0;
      let appStoreDownloadsPerDay = 0;
      if (governedCompany.field === 'game') {
        approvedLicenseByPair.forEach((license) => {
          if (license.gameCompanyKey !== key) return;
          const store = governedCurrent.companies[license.softwareCompanyKey];
          if (!store.isEstablished) return;
          const monthlyDownloads = Math.max(
            45,
            governedCompany.marketShare * 22
              + governedCompany.reputation * 11
              + governedCompany.releaseCount * 16
              + store.reputation * 5
              + store.appStoreProfile.discovery * 34
              + store.appStoreProfile.infrastructure * 29
              + store.appStoreProfile.trust * 27
          );
          const downloadsPerDay = monthlyDownloads / 30;
          const pricePerDownload = clamp(0.12 + governedCompany.reputation / 850, 0.08, 0.32);
          const gross = downloadsPerDay * pricePerDownload;
          const storeFee = gross * license.revenueShare;
          appStoreRevenuePerDay += Math.max(0, gross - storeFee);
          appStoreDownloadsPerDay += downloadsPerDay;
          corporateCashDelta.set(license.softwareCompanyKey, (corporateCashDelta.get(license.softwareCompanyKey) ?? 0) + storeFee * tickDays);
        });
      }
      const effectiveRevenuePerDay = governedCompany.field === 'game' ? appStoreRevenuePerDay : governedCompany.revenuePerDay;
      const retentionProfit = effectiveRevenuePerDay * 0.42 * (1 - governedCompany.payoutRatio);
      const dividendPoolPerDay = governedCompany.dividendPerShare * governedCompany.sharesOutstanding;
      const passiveMarketDelta = governedCompany.teams.marketing.count * 0.016 + governedCompany.teams.fabrication.count * 0.011 + governedCompany.boardMood * 0.006;
      const passiveReputationDelta = governedCompany.teams.marketing.count * 0.009 + governedCompany.boardMood * 0.006;
      const stressLevel = getCompanyStressLevel(governedCompany);
      const capitalFlightPerDay = stressLevel * (6 + governedCompany.marketPoolShares / 80);
      const managementDragPerDay = stressLevel * (1.2 + effectiveRevenuePerDay * 0.08);

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
          portfolioValue: getPortfolioValue(key),
          appStorePassiveIncomePerDay: governedCompany.field === 'game' ? appStoreRevenuePerDay : governedCompany.appStorePassiveIncomePerDay,
          appStoreDownloadsPerDay: governedCompany.field === 'game' ? appStoreDownloadsPerDay : governedCompany.appStoreDownloadsPerDay,
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
    if (reachedNewTaxMonth) {
      nextState = applyMonthlyInvestorTaxes(nextState);
    }
    nextState = progressCompanyPlans(nextState);
    nextState = progressCommunityPlans(nextState);
    nextState = runNpcCommunityPlanning(nextState);
    nextState = progressBoardVotes(nextState);
    nextState = maybeGenerateMoreNpcs(nextState);
  }

  return nextState;
}

export function scoreCompanyForNpc(npc: NpcInvestor, company: CompanyState) {
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
  const freeFloatRatio = clamp(company.marketPoolShares / Math.max(1, company.sharesOutstanding), 0, 1);
  const nonFounderOwnership = clamp(1 - founderControl, 0, 1);
  const outsideOwnership = clamp(nonFounderOwnership - freeFloatRatio, 0, 1);
  const treasuryLiquidity = clamp(freeFloatRatio * 4.2, 0, 1.4);
  const strainPenalty = company.capitalStrain / Math.max(30, valuation);
  const discoverySignal = clamp((company.marketShare / 30 + company.reputation / 55 + company.researchPerDay / 20) / 3, 0, 1.4);
  const governanceOpenness = clamp((company.boardMood - 0.35) * 1.1 + freeFloatRatio * 0.9, 0, 1.6);
  const momentumSignal = discoverySignal * 0.88 + outsideOwnership * 0.58 + treasuryLiquidity * 0.28 + governanceOpenness * 0.22 + company.releaseCount * 0.08;
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
  const liquidityPenalty = Math.max(0, 0.2 - treasuryLiquidity) * (0.48 + (1 - npc.boldness) * 0.28) - discoverySignal * npc.intelligence * 0.14;
  const crowdConfidence = discoverySignal * (0.4 + npc.intelligence * 0.25) + outsideOwnership * 0.32 + treasuryLiquidity * 0.18;
  const fieldVolatility = company.field === 'game' ? 1.25 : 0.88;
  const riskTolerance = clamp(npc.boldness * 0.72 + npc.intelligence * 0.18 - (1 - npc.patience) * 0.2, 0.1, 1.4);
  const riskPenalty = Math.max(0, fieldVolatility - riskTolerance) * (0.42 + (1 - npc.intelligence) * 0.22);
  const fieldBenefit = company.field === 'game'
    ? (company.reputation / 100) * (0.22 + npc.intelligence * 0.18) + discoverySignal * 0.2
    : (company.researchPerDay / 40) * (0.28 + npc.patience * 0.22) + valueSignal * 0.16;
  const fieldAffinity =
    company.field === 'game'
      ? npc.strategy === 'growth'
        ? 0.28
        : npc.strategy === 'activist'
          ? 0.12
          : -0.04
      : npc.strategy === 'dividend' || npc.strategy === 'value'
        ? 0.18
        : 0.05;
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
    finalScore: strategyBias + longTermFit + crowdConfidence + fieldAffinity + fieldBenefit - managementPenalty - liquidityPenalty - riskPenalty,
  };
}

export function getNpcAdaptiveReserveCash(npc: NpcInvestor, cash: number, diversificationGap: number) {
  const baseReserve = 8 + cash * clamp(npc.reserveRatio, 0.12, 0.74);
  const intelligenceDiscount = 1 - npc.intelligence * 0.22;
  const boldnessDiscount = 1 - npc.boldness * 0.12;
  const diversificationDiscount = 1 - clamp(diversificationGap * 0.35, 0, 0.22);
  return Math.max(6, baseReserve * intelligenceDiscount * boldnessDiscount * diversificationDiscount);
}

export function getNpcDiversificationGap(analyses: Array<{ ownership: number }>) {
  const activePositions = analyses.filter((entry) => entry.ownership > 0.7).length;
  if (activePositions >= 3) return 0;
  if (activePositions === 2) return 0.18;
  if (activePositions === 1) return 0.44;
  return 0.62;
}

export function getNpcStrategyProfile(strategy: StrategyStyle) {
  if (strategy === 'growth') return { tech: 1.34, operations: 1.04, marketing: 1.1, efficiency: 0.82, finance: 0.74 };
  if (strategy === 'value') return { tech: 0.96, operations: 1.02, marketing: 0.78, efficiency: 1.28, finance: 1.08 };
  if (strategy === 'dividend') return { tech: 0.84, operations: 1.08, marketing: 0.88, efficiency: 1.16, finance: 1.28 };
  if (strategy === 'activist') return { tech: 1.08, operations: 1.1, marketing: 0.9, efficiency: 1.04, finance: 1.14 };
  return { tech: 1, operations: 1, marketing: 1, efficiency: 1, finance: 1 };
}

export function getCompanyCompetitiveContext(game: GameState, company: CompanyState) {
  const competitors = (Object.values(game.companies) as CompanyState[]).filter((entry) => entry.key !== company.key && entry.field === company.field);
  const scopedCompetitors = competitors.length > 0 ? competitors : (Object.values(game.companies) as CompanyState[]).filter((entry) => entry.key !== company.key);
  const currentCpuScore = calculateCpuScore(company.upgrades);
  const bestCpuScore = Math.max(currentCpuScore, ...scopedCompetitors.map((entry) => calculateCpuScore(entry.upgrades)));
  const bestResearch = Math.max(company.researchPerDay, ...scopedCompetitors.map((entry) => entry.researchPerDay));
  const bestMarketShare = Math.max(company.marketShare, ...scopedCompetitors.map((entry) => entry.marketShare));
  const bestReputation = Math.max(company.reputation, ...scopedCompetitors.map((entry) => entry.reputation));

  return {
    cpuGap: clamp((bestCpuScore - currentCpuScore) / Math.max(1, bestCpuScore), 0, 1),
    researchGap: clamp((bestResearch - company.researchPerDay) / Math.max(1, bestResearch), 0, 1),
    marketGap: clamp((bestMarketShare - company.marketShare) / Math.max(1, bestMarketShare), 0, 1),
    reputationGap: clamp((bestReputation - company.reputation) / Math.max(1, bestReputation), 0, 1),
  };
}

export function getUpgradeBalancePressure(game: GameState, company: CompanyState) {
  const competitors = (Object.values(game.companies) as CompanyState[])
    .filter((entry) => entry.key !== company.key && entry.field === company.field && entry.isEstablished);
  const scopedCompetitors = competitors.length > 0
    ? competitors
    : (Object.values(game.companies) as CompanyState[]).filter((entry) => entry.key !== company.key && entry.isEstablished);

  const gaps = (Object.keys(company.upgrades) as UpgradeKey[]).reduce((acc, key) => {
    const currentValue = company.upgrades[key].value;
    const bestValue = Math.max(
      currentValue,
      ...scopedCompetitors.map((entry) => entry.upgrades[key].value)
    );
    const lag = clamp((bestValue - currentValue) / Math.max(1, bestValue), 0, 1.2);
    acc[key] = lag;
    return acc;
  }, {} as Record<UpgradeKey, number>);

  const lagValues = Object.values(gaps);
  const averageGap = lagValues.reduce((sum, value) => sum + value, 0) / Math.max(1, lagValues.length);
  const strongestGap = lagValues.length > 0 ? Math.max(...lagValues) : 0;
  const variance = lagValues.reduce((sum, value) => sum + Math.pow(value - averageGap, 2), 0) / Math.max(1, lagValues.length);

  return {
    gaps,
    averageGap,
    strongestGap,
    imbalanceRisk: clamp(Math.sqrt(variance) * 2.6 + strongestGap * 0.45, 0, 2.4),
  };
}

export function getManagementResourceContext(company: CompanyState) {
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

export function previewUpgradeCompany(company: CompanyState, key: UpgradeKey) {
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

export function previewTeamCompany(company: CompanyState, key: TeamKey) {
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

export function scoreNpcUpgradeAction(game: GameState, npc: NpcInvestor, company: CompanyState, key: UpgradeKey): CompanyAiAction {
  const profile = getNpcStrategyProfile(npc.strategy);
  const context = getCompanyCompetitiveContext(game, company);
  const balancePressure = getUpgradeBalancePressure(game, company);
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
  const upgradeGap = balancePressure.gaps[key];
  const catchUpBias = upgradeGap * (2.2 + npc.intelligence * 0.9) + balancePressure.imbalanceRisk * 0.45;
  const leapBias = upgradeGap < 0.08
    ? (1 - upgradeGap) * (0.12 + profile.tech * 0.18 + context.cpuGap * 0.08)
    : 0;
  const score = (
    cpuDelta * (0.0088 + profile.tech * 0.0046)
    + researchDelta * (1.1 + profile.tech * 0.45)
    + revenueDelta * (0.18 + profile.operations * 0.06)
    + context.cpuGap * 2.4
    + context.researchGap * 1.8
    + catchUpBias
    + leapBias
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

export function scoreNpcTeamAction(game: GameState, npc: NpcInvestor, company: CompanyState, key: TeamKey): CompanyAiAction {
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

export function chooseNpcReleasePriceIndex(npc: NpcInvestor, company: CompanyState, cpuDelta: number, cashEmergency: number) {
  if (cashEmergency > 0.55) return 0;
  if (npc.strategy === 'growth' && cpuDelta > 18) return 2;
  if (company.marketShare < 12 || npc.strategy === 'value') return 0;
  if (cpuDelta > 28 || company.reputation > 58) return 2;
  return 1;
}

export function getNpcReleasePressure(game: GameState, npc: NpcInvestor, company: CompanyState) {
  const currentCpuScore = calculateCpuScore(company.upgrades);
  const management = getManagementResourceContext(company);
  const daysSinceRelease = game.elapsedDays - company.lastReleaseDay;
  const cpuDelta = currentCpuScore - company.lastReleaseCpuScore;
  const cashEmergency = clamp((28 - company.cash) / 28, 0, 2.8);
  const cashReserveGap = clamp((management.cashReserveTarget - company.cash) / Math.max(1, management.cashReserveTarget), 0, 2.4);
  const severeCashCrisis = company.cash <= Math.max(2.5, management.cashReserveTarget * 0.08);
  const cashMeltdown = company.cash < 10;
  const nearZeroCash = company.cash <= 2;
  const gameExecutiveManaged = company.field === 'game'
    && (
      !isHumanExecutiveCandidateId(company.ceoId)
      || Object.values(company.executives).some((executive) => executive && !isHumanExecutiveCandidateId(executive.occupantId))
    );
  const baseReleaseWindow = company.field === 'game'
    ? clamp(Math.round(126 + (1 - npc.boldness) * 34 - npc.intelligence * 12), 90, 180)
    : clamp(Math.round(24 - npc.boldness * 6 - npc.intelligence * 3), 14, 30);
  const releaseCadenceTarget = cashMeltdown
    ? 7
    : company.field === 'game'
      ? baseReleaseWindow
      : cpuDelta > 32
      ? 28
      : cpuDelta > 18
        ? 42
        : 56;
  const momentumWindowBias = clamp(Math.round((releaseCadenceTarget - baseReleaseWindow) * 0.8), -10, 10);
  const tunedReleaseWindow = company.field === 'game'
    ? clamp(baseReleaseWindow + Math.round(momentumWindowBias * 0.2), 90, 180)
    : clamp(baseReleaseWindow + momentumWindowBias, 28, 60);
  const releaseWindow = cashMeltdown
    ? 7
    : company.field === 'game'
      ? tunedReleaseWindow
      : (cashEmergency > 0.7 ? Math.max(28, tunedReleaseWindow - 4) : tunedReleaseWindow);
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
    gameExecutiveManaged,
  };
}

export function scoreNpcReleaseAction(game: GameState, npc: NpcInvestor, company: CompanyState): CompanyAiAction | null {
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
    gameExecutiveManaged,
  } = pressure;
  const marketNeed = clamp((18 - company.marketShare) / 18, 0, 1.2);
  const reputationNeed = clamp((50 - company.reputation) / 50, 0, 1);
  const priceIndex = chooseNpcReleasePriceIndex(npc, company, cpuDelta, cashEmergency);
  const staleness = clamp(daysSinceRelease / 90, 0, 2.2);
  const inNormalCadenceMode = !cashMeltdown;
  if (company.field === 'game' && !gameExecutiveManaged) return null;
  if (company.field === 'game' && inNormalCadenceMode && daysSinceRelease < 90) return null;
  if (company.field !== 'game' && inNormalCadenceMode && daysSinceRelease < 28) return null;
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
  const releaseRating = evaluateCpuReleaseRating(game, company, priceIndex, currentCpuScore);
  const launchRevenue = calculateLaunchRevenue(currentCpuScore, company.teams, company.marketShare, company.reputation, pricePreset.factor) * releaseRating.salesMultiplier;
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
    + releaseRating.rating * 0.035
    + crisisBoost
    - repeatedSpecPenalty
  );

  if (score < 0.9 && cashEmergency < 0.45 && cpuDelta < 12 && daysSinceRelease < (company.field === 'game' ? 180 : 70) && !canForceRelease) return null;
  const releaseNumber = company.releaseCount + 1;
  const releaseSeries = company.field === 'game'
    ? `${company.name} Live Ops`
    : company.field === 'software'
      ? `${company.name} Suite`
      : `${company.name} G-Series`;
  const releaseCpuName = company.field === 'game'
    ? `Game Patch ${releaseNumber}`
    : company.field === 'software'
      ? `Software Build ${releaseNumber}`
      : `CPU G${releaseNumber}`;

  return {
    type: 'release',
    key: 'release',
    resource: 'cash',
    cost: 0,
    score,
    label: company.field === 'game'
      ? `Release Game ${releaseCpuName}`
      : company.field === 'software'
        ? `Release Software ${releaseCpuName}`
        : `Release CPU ${releaseCpuName}`,
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

export function applyNpcCompanyAction(game: GameState, companyKey: CompanyKey, action: CompanyAiAction) {
  const company = game.companies[companyKey];
  if (action.type === 'release') {
    const priceIndex = action.priceIndex ?? 1;
    const pricePreset = PRICE_PRESETS[priceIndex];
    const cpuScore = calculateCpuScore(company.upgrades);
    const releaseRating = evaluateCpuReleaseRating(game, company, priceIndex, cpuScore);
    const rawLaunchRevenue = calculateLaunchRevenue(cpuScore, company.teams, company.marketShare, company.reputation, pricePreset.factor) * releaseRating.salesMultiplier;
    const approvedStoreLicenses = company.field === 'game'
      ? game.appStoreLicenseRequests
        .filter((request) => request.gameCompanyKey === companyKey && request.status === 'approved')
        .sort((left, right) => {
          const leftFreshness = (left.lastPublishedDay ?? left.decisionDay ?? left.requestedDay);
          const rightFreshness = (right.lastPublishedDay ?? right.decisionDay ?? right.requestedDay);
          return rightFreshness - leftFreshness;
        })
      : [];
    const selectedStoreLicense = approvedStoreLicenses[0] ?? null;
    const storeFee = selectedStoreLicense ? rawLaunchRevenue * selectedStoreLicense.revenueShare : 0;
    const launchRevenue = rawLaunchRevenue - storeFee;
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
    const reputationGain = Math.max(0.8, (cpuScore / 240 + company.teams.marketing.count * 0.7 + pricePreset.reputationBonus) * releaseRating.reputationMultiplier);
    const marketShareGain = Math.min(5.5, (cpuScore / 500 + company.teams.fabrication.count * 0.16 + pricePreset.marketBonus) * releaseRating.marketShareMultiplier);
    const series = action.releaseSeries ?? (
      company.field === 'game'
        ? `${company.name} Live Ops`
        : company.field === 'software'
          ? `${company.name} Suite`
          : `${company.name} G-Series`
    );
    const cpuName = action.releaseCpuName ?? (
      company.field === 'game'
        ? `Game Patch ${company.releaseCount + 1}`
        : company.field === 'software'
          ? `Software Build ${company.releaseCount + 1}`
          : `CPU G${company.releaseCount + 1}`
    );
    const productLabel = company.field === 'game' ? 'game' : company.field === 'software' ? 'software' : 'CPU';
    const nextLicenseRequests = selectedStoreLicense
      ? game.appStoreLicenseRequests.map((request) => {
        if (request.id !== selectedStoreLicense.id) return request;
        const estimatedDownloads = Math.max(
          request.monthlyDownloads,
          Math.round(clamp(rawLaunchRevenue * 0.9 + releaseRating.rating * 70 + company.marketShare * 120, 200, 200000))
        );
        return {
          ...request,
          monthlyDownloads: estimatedDownloads,
          publishedReleaseCount: request.publishedReleaseCount + 1,
          lastPublishedDay: game.elapsedDays,
        };
      })
      : game.appStoreLicenseRequests;
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
          lastRelease: `${series} ${cpuName} rilis ${formatDateFromDays(game.elapsedDays)} (${pricePreset.label.toLowerCase()})${selectedStoreLicense ? ` via ${game.companies[selectedStoreLicense.softwareCompanyKey].name}` : ''} · ${releaseRating.summary}`,
        },
        ...(selectedStoreLicense
          ? {
            [selectedStoreLicense.softwareCompanyKey]: {
              ...game.companies[selectedStoreLicense.softwareCompanyKey],
              cash: game.companies[selectedStoreLicense.softwareCompanyKey].cash + storeFee,
            },
          }
          : {}),
      },
      appStoreLicenseRequests: nextLicenseRequests,
      activityFeed: addFeedEntry(
        game.activityFeed,
        `${formatDateFromDays(game.elapsedDays)}: ${wasCashCritical ? '🚨 RILIS DARURAT' : 'Update produk'} — ${company.name} merilis ${productLabel} ${series} ${cpuName} (rating ${formatNumber(releaseRating.rating, 1)})${selectedStoreLicense ? ` via ${game.companies[selectedStoreLicense.softwareCompanyKey].name}` : ''} dan membukukan $${formatMoneyCompact(launchRevenue)}.`
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
          researchAssetValue: (company.researchAssetValue ?? 0) + action.cost,
          bestCpuScore: Math.max(company.bestCpuScore, calculateCpuScore(preview.upgrades)),
          executivePulse: `${company.ceoName} memprioritaskan ${company.upgrades[key].label} untuk ${action.rationale}.`,
        },
      },
    };
  }

  if (action.type === 'appstore-profile') {
    const profileKey: keyof AppStoreProfile =
      action.key === 'appstore-discovery'
        ? 'discovery'
        : action.key === 'appstore-infrastructure'
          ? 'infrastructure'
          : 'trust';
    const nextValue = Math.round(clamp(company.appStoreProfile[profileKey] + 0.08 + Math.max(0, company.reputation - 40) * 0.0012, 0.65, 2.5) * 100) / 100;
    return {
      ...game,
      companies: {
        ...game.companies,
        [companyKey]: {
          ...company,
          cash: Math.max(0, company.cash - action.cost),
          appStoreProfile: {
            ...company.appStoreProfile,
            [profileKey]: nextValue,
          },
          executivePulse: `${company.ceoName} memperkuat kapabilitas AppStore (${profileKey}) untuk menjaga kualitas layanan mitra.`,
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

export function scoreNpcPayoutAction(npc: NpcInvestor, company: CompanyState, direction: 'up' | 'down'): CompanyAiAction {
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

export function scoreNpcAppStoreProfileAction(
  npc: NpcInvestor,
  company: CompanyState,
  profileKey: keyof AppStoreProfile
): CompanyAiAction | null {
  if (company.field !== 'software' || company.softwareSpecialization !== 'app-store') return null;
  const management = getManagementResourceContext(company);
  const currentValue = company.appStoreProfile[profileKey];
  if (currentValue >= 2.45) return null;
  const floor = Math.min(company.appStoreProfile.discovery, company.appStoreProfile.infrastructure, company.appStoreProfile.trust);
  const dimensionGap = Math.max(0, currentValue - floor);
  const baseCost = 16 + company.releaseCount * 0.7 + Math.max(0, currentValue - 1) * 12;
  const cost = clamp(baseCost, 14, 120);
  if (company.cash < cost) return null;
  const reservePressure = cost / Math.max(1, company.cash + management.monthlyRetainedCash * 0.45);
  const strategyBoost = profileKey === 'trust'
    ? (npc.strategy === 'dividend' || npc.strategy === 'value' ? 0.2 : 0.08)
    : profileKey === 'discovery'
      ? (npc.strategy === 'growth' ? 0.2 : 0.08)
      : 0.12;
  const score = (
    management.cashOverflow * 0.8
    + management.cashUrgency * 0.12
    + (1.8 - currentValue) * 0.92
    + dimensionGap * -0.7
    + npc.intelligence * 0.34
    + strategyBoost
    - reservePressure * (0.85 + (1 - npc.patience) * 0.2)
  );
  return {
    type: 'appstore-profile',
    key: profileKey === 'discovery' ? 'appstore-discovery' : profileKey === 'infrastructure' ? 'appstore-infrastructure' : 'appstore-trust',
    resource: 'cash',
    cost,
    score,
    label: `Boost AppStore ${profileKey}`,
    rationale: `menguatkan ${profileKey} AppStore agar lisensi dan monetisasi lebih stabil`,
  };
}

export function chooseNpcCompanyActionByDomain(game: GameState, npc: NpcInvestor, company: CompanyState, domain: ExecutiveDomain | 'general') {
  const management = getManagementResourceContext(company);
  const candidates: CompanyAiAction[] = [];

  if (domain === 'technology' || domain === 'general') {
    candidates.push(...(Object.keys(company.upgrades) as UpgradeKey[]).map((key) => scoreNpcUpgradeAction(game, npc, company, key)));
    candidates.push(scoreNpcTeamAction(game, npc, company, 'researchers'));
    if (company.field === 'software' && company.softwareSpecialization === 'app-store') {
      const infraAction = scoreNpcAppStoreProfileAction(npc, company, 'infrastructure');
      if (infraAction) candidates.push(infraAction);
    }
    const releaseAction = scoreNpcReleaseAction(game, npc, company);
    if (releaseAction?.forceImmediate) return releaseAction;
    if (releaseAction) candidates.push({ ...releaseAction, score: releaseAction.score + (releaseAction.releasePriorityBoost ?? 0) });
  }
  if (domain === 'operations' || domain === 'general') {
    candidates.push(scoreNpcTeamAction(game, npc, company, 'fabrication'));
    if (company.field === 'software' && company.softwareSpecialization === 'app-store') {
      const trustAction = scoreNpcAppStoreProfileAction(npc, company, 'trust');
      if (trustAction) candidates.push(trustAction);
    }
  }
  if (domain === 'marketing' || domain === 'general') {
    candidates.push(scoreNpcTeamAction(game, npc, company, 'marketing'));
    if (company.field === 'software' && company.softwareSpecialization === 'app-store') {
      const discoveryAction = scoreNpcAppStoreProfileAction(npc, company, 'discovery');
      if (discoveryAction) candidates.push(discoveryAction);
    }
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

export function applyNpcManagementAction(game: GameState, companyKey: CompanyKey, action: CompanyAiAction) {
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

export function getNpcManagementActionCapacity(company: CompanyState, ceoNpc: NpcInvestor, domain: ExecutiveDomain | 'general') {
  const management = getManagementResourceContext(company);
  const techFieldBias = company.field === 'semiconductor' ? 0.4 : company.field === 'software' ? 0.26 : 0.18;
  const marketingFieldBias = company.field === 'game' ? 0.45 : company.field === 'software' ? 0.3 : 0.12;
  const operationsFieldBias = company.field === 'software' && company.softwareSpecialization === 'app-store' ? 0.35 : 0.2;
  if (domain === 'technology') return clamp(Math.round(1 + management.researchOverflow * 1.8 + management.researchUrgency * 0.45 + ceoNpc.intelligence * (1.4 + techFieldBias)), 1, 6);
  if (domain === 'operations') return clamp(Math.round(1 + management.cashOverflow * 1.2 + management.cashUrgency * 0.35 + ceoNpc.intelligence * (1 + operationsFieldBias)), 1, 4);
  if (domain === 'marketing') return clamp(Math.round(1 + management.cashOverflow * 1 + management.monthlyRevenue / 150 + ceoNpc.boldness + marketingFieldBias), 1, 4);
  if (domain === 'finance') return clamp(Math.round(1 + management.cashOverflow * 0.5 + getCompanyStressLevel(company)), 1, 2);
  return clamp(Math.round(1 + management.managementIntensity * 1.4 + ceoNpc.intelligence), 1, 4);
}

function runNpcAppStoreLicensing(game: GameState, company: CompanyState, ceoNpc: NpcInvestor) {
  let next = game;
  if (!company.isEstablished) return next;

  if (company.field === 'game') {
    const appStores = getActiveAppStoreCompanies(next);
    const candidates = appStores
      .filter((store) => {
        const pairRequests = next.appStoreLicenseRequests
          .filter((request) => request.gameCompanyKey === company.key && request.softwareCompanyKey === store.key)
          .sort((left, right) => right.requestedDay - left.requestedDay);
        const latestRequest = pairRequests[0];
        if (!latestRequest) return true;
        if (latestRequest.status === 'approved' || latestRequest.status === 'pending') return false;
        if (latestRequest.status === 'rejected' && latestRequest.decisionDay !== null) {
          return next.elapsedDays - latestRequest.decisionDay >= 30;
        }
        return true;
      })
      .sort((left, right) => {
        const leftScore = left.reputation * 0.42
          + left.marketShare * 0.44
          + left.appStoreProfile.discovery * 12
          + left.appStoreProfile.infrastructure * 9
          + left.appStoreProfile.trust * 8
          + left.cash * 0.012;
        const rightScore = right.reputation * 0.42
          + right.marketShare * 0.44
          + right.appStoreProfile.discovery * 12
          + right.appStoreProfile.infrastructure * 9
          + right.appStoreProfile.trust * 8
          + right.cash * 0.012;
        return rightScore - leftScore;
      });
    const target = candidates[0];
    if (target) {
      next = requestAppStoreLicense(
        next,
        company.ceoId,
        company.key,
        target.key,
        `${company.name} menawarkan portofolio game dengan roadmap stabil dan live-ops aktif.`
      );
    }
  }

  if (company.field === 'software' && company.softwareSpecialization === 'app-store') {
    const pending = next.appStoreLicenseRequests
      .filter((request) => request.softwareCompanyKey === company.key && request.status === 'pending')
      .sort((left, right) => left.requestedDay - right.requestedDay);
    const request = pending[0];
    if (request) {
      const gameCompany = next.companies[request.gameCompanyKey];
      const recentPublishingSignal = clamp((gameCompany.lastReleaseDay === 0 ? 0 : (next.elapsedDays - gameCompany.lastReleaseDay <= 45 ? 1 : 0)) * 10, 0, 10);
      const qualitySignal =
        gameCompany.reputation * 0.34
        + gameCompany.marketShare * 0.58
        + gameCompany.releaseCount * 3.8
        + recentPublishingSignal
        + ceoNpc.intelligence * 24
        + ceoNpc.boldness * 11;
      const approved = qualitySignal >= 35;
      next = decideAppStoreLicense(next, request.id, company.ceoId, approved ? 'approved' : 'rejected');
    }
  }
  return next;
}

export function runNpcChiefExecutiveTurn(current: GameState) {
  let next = current;

  COMPANY_KEYS.forEach((companyKey) => {
    const company = next.companies[companyKey];
    if (!company.isEstablished) return;
    const ceoNpcRecordIndex = next.npcs.findIndex((npc) => npc.id === company.ceoId);
    const ceoNpc = getExecutiveAiActor(next, company, company.ceoId);
    next = runNpcAppStoreLicensing(next, company, ceoNpc);
    const reviewedCompany = next.companies[companyKey];
    const releasePressure = getNpcReleasePressure(next, ceoNpc, reviewedCompany);
    const isEmergencyReview =
      releasePressure.canForceRelease
      || (reviewedCompany.cash < 10)
      || (releasePressure.cpuDelta > 8 && releasePressure.daysSinceRelease >= 8)
      || (releasePressure.cpuDelta > 3 && releasePressure.daysSinceRelease >= 26);
    if (next.elapsedDays < reviewedCompany.nextManagementReviewDay && !isEmergencyReview) return;

    let workingGame = next;
    let workingCompany = workingGame.companies[companyKey];
    let governanceDirty = false;
    const actionsTaken: string[] = [];
    const actionSignatureSet = new Set<string>();
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
        const actionSignature = `${action.type}:${String(action.key)}`;
        const seenCount = actionCounts.get(actionKey) ?? 0;
        if (actionSignatureSet.has(actionSignature)) break;
        if (action.type === 'payout' && Array.from(actionSignatureSet).some((signature) => signature.startsWith('payout:'))) break;
        if (action.type === 'payout' && seenCount >= 1) break;
        if (action.type === 'release' && seenCount >= 1) break;
        if (seenCount >= 3) break;

        workingGame = applyNpcManagementAction(workingGame, companyKey, action);
        workingCompany = workingGame.companies[companyKey];
        governanceDirty = true;
        actionsTaken.push(`${roleHandlers[domain]}: ${action.label}`);
        actionCounts.set(actionKey, seenCount + 1);
        actionSignatureSet.add(actionSignature);
        domainActions += 1;
        totalActions += 1;

        if (action.type === 'payout' || action.type === 'release') break;
      }
    });

    if (governanceDirty) {
      workingGame = resolveGovernance(workingGame);
      workingCompany = workingGame.companies[companyKey];
      governanceDirty = false;
    }

    const sourceCompany = workingGame.companies[companyKey];
    const boardVotesRemaining = canStartBoardVote(sourceCompany, workingGame.elapsedDays)
      ? Math.max(0, BOARD_VOTE_LIMIT_PER_WINDOW - getBoardVoteWindowState(sourceCompany, workingGame.elapsedDays).count)
      : 0;
    const investableCash = Math.max(0, sourceCompany.cash - 18);
    const shouldProposeCrossInvestment =
      sourceCompany.activeBoardVote === null
      && investableCash > 6
      && sourceCompany.boardMembers.length > 0
      && boardVotesRemaining > 0;
    if (shouldProposeCrossInvestment) {
      const investmentTargets = COMPANY_KEYS
        .filter((targetKey) => targetKey !== companyKey)
        .map((targetKey) => {
          const targetCompany = workingGame.companies[targetKey];
          if (!targetCompany.isEstablished) return null;
          const attractiveness = targetCompany.marketShare * 0.72
            + targetCompany.reputation * 0.46
            + calculateCpuScore(targetCompany.upgrades) * 0.018
            + clamp((targetCompany.cash - sourceCompany.cash * 0.28) / Math.max(1, sourceCompany.cash), -0.22, 0.18)
            + clamp((sourceCompany.boardMood - 0.42) * 8, -0.3, 0.4)
            + ceoNpc.boldness * 0.22;
          return { targetKey, targetCompany, attractiveness };
        })
        .filter((entry): entry is { targetKey: CompanyKey; targetCompany: CompanyState; attractiveness: number } => Boolean(entry))
        .sort((left, right) => right.attractiveness - left.attractiveness);
      const bestTarget = investmentTargets[0];
      if (bestTarget) {
        const riskAwareAllocation = boardVotesRemaining === 1
          ? 0.11 + ceoNpc.intelligence * 0.04 + ceoNpc.boldness * 0.02
          : 0.16 + ceoNpc.intelligence * 0.05 + ceoNpc.boldness * 0.03;
        const proposedAmount = clamp(sourceCompany.cash * riskAwareAllocation, 6, investableCash * 0.82);
        const investmentDecision = boardApproveCompanyInvestment(sourceCompany, bestTarget.targetCompany, proposedAmount);
        const proposerId = getBoardProposalActorId(workingGame, sourceCompany, { preferredRole: 'cfo', domain: 'finance' });
        const initialVotes: Record<string, 'yes' | 'no'> = {};
        if (proposerId !== workingGame.player.id && sourceCompany.boardMembers.some((member) => member.id === proposerId)) {
          initialVotes[proposerId] = 'yes';
        }
        const tally = tallyBoardVoteWeights(sourceCompany.boardMembers, initialVotes);
        const investmentVote: BoardVoteState = {
          id: `${companyKey}-invest-${workingGame.elapsedDays}`,
          kind: 'investasi',
          proposerId,
          subject: `${sourceCompany.name} → ${bestTarget.targetCompany.name}`,
          reason: `${investorDisplayName(workingGame, proposerId)} mengusulkan investasi strategis antar-perusahaan.`,
          memberVotes: initialVotes,
          investmentValue: proposedAmount,
          yesWeight: tally.yesWeight,
          noWeight: tally.noWeight,
          startDay: workingGame.elapsedDays,
          endDay: workingGame.elapsedDays + 3,
        };
        const voteUsage = registerBoardVoteUsage(workingGame.companies[companyKey], workingGame.elapsedDays);
        workingGame = {
          ...workingGame,
          companies: {
            ...workingGame.companies,
            [companyKey]: {
              ...workingGame.companies[companyKey],
              activeBoardVote: investmentVote,
              boardVoteWindowStartDay: voteUsage.startDay,
              boardVoteCountInWindow: voteUsage.count,
            },
          },
        };
        if (investmentDecision.approved) {
          const corporateInvestorId = getCorporateInvestorId(companyKey);
          const investmentTrade = transactShares(workingGame, corporateInvestorId, bestTarget.targetKey, 'buy', proposedAmount, 'company');
          if (investmentTrade.tradedValue > 0) {
            workingGame = investmentTrade.next;
            workingCompany = workingGame.companies[companyKey];
            governanceDirty = false;
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
      if (ceoNpcRecordIndex >= 0) {
        next.npcs[ceoNpcRecordIndex] = {
          ...next.npcs[ceoNpcRecordIndex],
          analysisNote: `${ceoNpc.name} menyelesaikan review manajemen ${workingCompany.name} dan memilih menunggu jendela aksi berikutnya di sekitar ${formatDateFromDays(nextReviewDay)}.`,
        };
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
    if (ceoNpcRecordIndex >= 0) {
      next.npcs[ceoNpcRecordIndex] = {
        ...next.npcs[ceoNpcRecordIndex],
        analysisNote: `${ceoNpc.name} menyelaraskan eksekutif ${workingCompany.name}: ${actionsTaken.join(', ')}. Review berikutnya sekitar ${formatDateFromDays(nextReviewDay)}.`,
      };
    }
  });

  return resolveGovernance(next);
}

export function chooseNpcListingMultiplier(npc: NpcInvestor, ownership: number, convictionGap: number, stressLevel: number): 2 | 3 | 4 {
  if (ownership > 8 || convictionGap < 0.35 || stressLevel < 0.5) return 4;
  if (ownership > 4 || convictionGap < 0.8) return 3;
  return 2;
}

export function manageNpcShareListing(current: GameState, npc: NpcInvestor, target: { key: CompanyKey; company: CompanyState; ownership: number; stressLevel: number; finalScore: number }, bestScore: number, reserveCash: number) {
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

export function runNpcTurn(current: GameState) {
  let next = { ...current, companies: { ...current.companies }, npcs: current.npcs.map((npc) => ({ ...npc })) };
  const establishedCompanyKeys = COMPANY_KEYS.filter((key) => next.companies[key].isEstablished);
  if (establishedCompanyKeys.length === 0) {
    next.npcs.forEach((npc, index) => {
      const planTargets = COMPANY_KEYS.filter((key) => !next.plans[key].isEstablished);
      if (planTargets.length === 0) return;
      const targetKey = planTargets[index % planTargets.length];
      const plan = next.plans[targetKey];
      const budget = clamp(npc.cash * (0.05 + npc.intelligence * 0.06), 0, 8.5);
      if (budget < MIN_TRADE_AMOUNT) return;
      next = investInCompanyPlan(next, npc.id, targetKey, budget);
      npc.analysisNote = `${npc.name} mendukung plan pendirian ${plan.companyName} agar perusahaan lahir dengan kas awal yang sehat.`;
    });
    return next;
  }

  next.npcs.forEach((npc) => {
    const decisionRandom = createSeededRandom(`${npc.id}-${Math.floor(next.elapsedDays)}-${Math.floor(next.tickCount / NPC_ACTION_EVERY_TICKS)}`);
    const patienceCooldown = clamp(1 + npc.patience * 3.4 - npc.boldness * 0.6, 0.8, 4.8);
    const lastActionDay = npc.lastActionDay ?? -30;
    const daysSinceAction = next.elapsedDays - lastActionDay;
    if (daysSinceAction < patienceCooldown) {
      const waitDays = Math.max(0.1, patienceCooldown - daysSinceAction);
      npc.analysisNote = `${npc.name} menunggu setup berikutnya (${formatNumber(waitDays, 1)} hari lagi) agar eksekusi tetap disiplin dan tidak overtrading.`;
      return;
    }

    const analyses = (establishedCompanyKeys.map((key) => [key, next.companies[key]]) as [CompanyKey, CompanyState][])
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
    const daysHeldFocus = Math.max(0, next.elapsedDays - (npc.lastActionDay ?? next.elapsedDays - 30));
    const forcedRotationSignal = daysHeldFocus > 45 ? 0.05 + npc.intelligence * 0.06 : 0;
    const explorationBias = (decisionRandom() - 0.5) * clamp(0.08 + (1 - npc.intelligence) * 0.06, 0.04, 0.12);
    const focusSwitchThreshold = clamp(0.14 + (1 - npc.intelligence) * 0.26 + npc.patience * 0.16 - forcedRotationSignal + explorationBias, 0.06, 0.48);
    const shouldSwitchFocus = best.key !== currentFocus.key && (best.finalScore - currentFocus.finalScore) > focusSwitchThreshold;
    npc.focusCompany = shouldSwitchFocus ? best.key : currentFocus.key;

    const diversificationGap = getNpcDiversificationGap(analyses);
    const reserveCash = Math.max(
      getNpcAdaptiveReserveCash(npc, npc.cash, diversificationGap),
      estimateMonthlyInvestorTax(next, npc.id) * 0.95
    );
    const listingDecision = manageNpcShareListing(next, npc, currentFocus, best.finalScore, reserveCash);
    if (listingDecision.changed) {
      next = listingDecision.next;
    }
    const bestOutrunsFocus = best.finalScore - currentFocus.finalScore;
    const targetCoreOwnership = clamp(6 + currentFocus.discoverySignal * 8 + npc.boldness * 10 + npc.intelligence * 6, 5, 34);
    const shouldTrim = currentFocus.ownership > targetCoreOwnership
      && (
        bestOutrunsFocus > 1.1
        || currentFocus.dividendYield < 0.08
        || currentFocus.company.boardMood < 0.45
        || currentFocus.stressLevel > 0.64
        || currentFocus.liquidityPenalty > 0.3
      );
    const shouldExit = currentFocus.ownership > 2.4
      && (currentFocus.stressLevel > 0.8 || currentFocus.company.cash < 52 || currentFocus.performanceSignal < 1.35 || currentFocus.finalScore < 1.3);

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
        npc.lastActionDay = next.elapsedDays;
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
      ? 0.18 + Math.max(0, 0.2 - best.discoverySignal * 0.12) + Math.max(0, 0.1 - best.momentumSignal * 0.06)
      : 0.12;
    const confidenceNoise = (decisionRandom() - 0.5) * clamp(0.16 - npc.intelligence * 0.08, 0.03, 0.12);
    const convictionWithNoise = conviction + (npc.convictionBias ?? 0) + confidenceNoise;
    if (affordable < MIN_TRADE_AMOUNT || convictionWithNoise < scoutingThreshold) {
      npc.analysisNote = `${best.company.name} tetap dipantau. ${npc.name} memilih menahan kas karena spread peluang belum cukup tebal.`;
      return;
    }

    const desiredOwnership = clamp(
      4 + best.discoverySignal * 7 + best.momentumSignal * 4.4 + npc.boldness * 8 + npc.intelligence * 6.5 + Math.max(0, convictionWithNoise) * 1.6,
      3,
      40
    );
    const ownershipGapRatio = clamp((desiredOwnership - best.ownership) / Math.max(1, desiredOwnership), 0.12, 1);
    const starterDiscipline = isFreshEntry
      ? clamp(0.18 + best.discoverySignal * 0.22 + best.momentumSignal * 0.16, 0.14, 0.56)
      : clamp(0.3 + best.discoverySignal * 0.17 + npc.boldness * 0.14 + ownershipGapRatio * 0.22, 0.22, 0.82);
    const budget = clamp(
      best.sharePrice * (1.4 + npc.boldness * 1.9 + npc.intelligence * 1.1) + convictionWithNoise * (16 + best.discoverySignal * 10),
      MIN_TRADE_AMOUNT,
      affordable * starterDiscipline * ownershipGapRatio
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
    npc.lastActionDay = next.elapsedDays;

    const refreshedNpcCash = next.npcs.find((entry) => entry.id === npc.id)?.cash ?? npc.cash;
    const diversificationCandidates = analyses
      .filter((entry) => entry.key !== best.key)
      .filter((entry) => entry.finalScore >= best.finalScore * clamp(0.76 + npc.intelligence * 0.12, 0.76, 0.9))
      .filter((entry) => entry.ownership < clamp(4 + npc.intelligence * 9 + npc.boldness * 6, 4, 18))
      .slice(0, 3);
    const refreshedDiversificationGap = getNpcDiversificationGap(
      analyses.map((entry) => (
        entry.key === best.key
          ? { ownership: getOwnershipPercent(next.companies[entry.key], npc.id) }
          : { ownership: entry.ownership }
      ))
    );
    const shouldDiversify =
      diversificationCandidates.length > 0
      && refreshedNpcCash > reserveCash + 8
      && (
        refreshedDiversificationGap > 0.16
        || (second && second.finalScore >= best.finalScore * 0.84)
      );
    if (shouldDiversify) {
      const affordableAfterPrimary = Math.max(0, refreshedNpcCash - reserveCash);
      diversificationCandidates.some((candidate, candidateIndex) => {
        const concentrationWeight = candidateIndex === 0 ? 0.2 : candidateIndex === 1 ? 0.13 : 0.09;
        const sideBudget = clamp(affordableAfterPrimary * concentrationWeight, MIN_TRADE_AMOUNT, affordableAfterPrimary * 0.3);
        const sideResult = transactShares(next, npc.id, candidate.key, 'buy', sideBudget, 'auto');
        if (sideResult.tradedValue <= 0) return false;
        next = {
          ...sideResult.next,
          activityFeed: addFeedEntry(
            sideResult.next.activityFeed,
            `${formatDateFromDays(sideResult.next.elapsedDays)}: ${npc.name} menambah posisi taktis di ${candidate.company.name} untuk menjaga diversifikasi portofolio.`
          ),
        };
        npc.lastActionDay = next.elapsedDays;
        return true;
      });
      if (npc.lastActionDay === next.elapsedDays) {
        npc.analysisNote = `${npc.name} memprioritaskan ${best.company.name} sambil memperluas posisi lintas emiten secara bertahap tanpa cheating.`;
        return;
      }
    }

    npc.analysisNote = `${npc.name} membandingkan kinerja, valuasi, mood dewan, riset, dan arus modal sebelum menambah ${best.company.name}.`;
  });

  return resolveGovernance(next);
}
