'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { APPSTORE_ICON_SET, GAME_NAME_DATASET, type GameReleaseCard } from '../appstore-catalog';
import * as Engine from '@/features/gameplay/simulation-engine';
import type {
  UpgradeKey,
  TeamKey,
  CompanyKey,
  ExecutiveRole,
  ExecutiveDomain,
  TradeRoute,
  UpgradeState,
  TeamState,
  BoardVoteKind,
  BoardVoteState,
  BoardDecisionAction,
  CompanyState,
  GameState,
  AppStoreLicenseRequest,
  ProfileDraft,
  ReleaseDraft,
  InvestmentDraft,
  ShareListingDraft,
  NewsCategory,
  SoftwareSpecialization,
  CompanyEstablishmentPlan,
  CommunityCompanyPlan
} from '@/features/gameplay/simulation-engine';

const {
  STORAGE_KEY,
  TICK_MS,
  START_DATE_UTC,
  NPC_ACTION_EVERY_TICKS,
  PLAYER_STARTING_CASH,
  INITIAL_NPC_COUNT,
  MAX_ACTIVE_NPCS,
  NPC_GROWTH_START_DAY,
  NPC_GROWTH_INTERVAL_DAYS,
  NPC_GROWTH_BATCH,
  EXECUTIVE_MIN_TENURE_DAYS,
  BOARD_VOTE_WINDOW_DAYS,
  BOARD_VOTE_LIMIT_PER_WINDOW,
  SHARE_SHEET_OPTIONS,
  SHARE_SHEET_COOLDOWN_DAYS,
  TOTAL_SHARES,
  INITIAL_FOUNDER_OWNERSHIP_RATIO,
  COMPANY_TRADE_FEE_RATE,
  HOLDER_TRADE_FEE_RATE,
  MIN_TRADE_AMOUNT,
  COMPANY_KEYS,
  TRANSACTION_SLIDER_STOPS,
  PRICE_PRESETS,
  DEFAULT_OPEN_PANELS,
  DEFAULT_COMPANY_DETAIL_PANELS,
  DEFAULT_PROFILE_DRAFT,
  DEFAULT_RELEASE_DRAFT,
  DEFAULT_SHARE_LISTING_DRAFT,
  STRATEGY_LABELS,
  EXECUTIVE_ROLE_META,
  EXECUTIVE_ROLES,
  NPC_FIRST_NAMES,
  NPC_LAST_NAMES,
  NPC_PERSONAS,
  createSeededRandom,
  randomBetween,
  randomInt,
  randomFrom,
  formatNumber,
  formatMoneyCompact,
  formatDateFromDays,
  clamp,
  detectNewsCategory,
  getNewsCategoryLabel,
  createUpgrades,
  createTeams,
  getUpgradeLevel,
  getUpgradeCost,
  getTeamCost,
  getDisplayedUpgradeValue,
  calculateCpuScore,
  calculateResearchPerDay,
  calculateRevenuePerDay,
  calculateLaunchRevenue,
  evaluateCpuReleaseRating,
  getCompanyInvestmentTotal,
  getSharePrice,
  getCompanyValuation,
  getCompanyResearchAssetValue,
  getOwnershipPercent,
  getCorporateInvestorId,
  getCompanyKeyFromCorporateInvestorId,
  getInvestorCash,
  getListingAskPrice,
  getInvestorOpenListedShares,
  getAvailableSharesToList,
  sanitizeShareListings,
  upsertShareListing,
  clearShareListing,
  getVisibleShareListings,
  allocateHolderBuyFromListings,
  getRequestedTradeValue,
  getTradeRouteLabel,
  getTradeFeeRate,
  getInvestorLiquidityReserve,
  getBuyerDemandBudget,
  getHolderRouteCapacity,
  chooseAutoTradeRoute,
  getMaxTradeValue,
  getTradePreview,
  addFeedEntry,
  investorDisplayName,
  getNpcById,
  getExecutiveAiActor,
  isHumanExecutiveCandidateId,
  getExecutiveCandidatePool,
  getManagementCadenceDays,
  getExecutiveCandidateScore,
  calculateExecutiveNeed,
  createExecutiveRecord,
  createEmptyExecutiveMap,
  sanitizeExecutiveAssignments,
  planNpcExecutiveAssignments,
  getExecutiveCoverage,
  getExecutiveRolesForInvestor,
  getBoardProposalActorId,
  hasCompanyAuthority,
  getBoardExecutiveSignals,
  isExecutiveTenureLocked,
  boardApproveExecutiveDecision,
  boardApproveCompanyInvestment,
  getBoardVoteWindowState,
  canStartBoardVote,
  registerBoardVoteUsage,
  tallyBoardVoteWeights,
  decideBoardMemberVote,
  progressBoardVotes,
  createGenerativeNpcs,
  createCompany,
  getRealInvestorCandidates,
  createIndependentBoardMember,
  getCompanyPerformanceScore,
  getCompanyStressLevel,
  getBoardMemberOptions,
  getCandidateLeadershipScore,
  resolveGovernance,
  createInitialGameState,
  INITIAL_BASELINES,
  applyCashToInvestor,
  transactShares,
  maybeGenerateMoreNpcs,
  simulateTick,
  scoreCompanyForNpc,
  getNpcStrategyProfile,
  getCompanyCompetitiveContext,
  getManagementResourceContext,
  previewUpgradeCompany,
  previewTeamCompany,
  scoreNpcUpgradeAction,
  scoreNpcTeamAction,
  chooseNpcReleasePriceIndex,
  getNpcReleasePressure,
  scoreNpcReleaseAction,
  applyNpcCompanyAction,
  scoreNpcPayoutAction,
  chooseNpcCompanyActionByDomain,
  applyNpcManagementAction,
  getNpcManagementActionCapacity,
  runNpcChiefExecutiveTurn,
  chooseNpcListingMultiplier,
  manageNpcShareListing,
  runNpcTurn,
  investInCompanyPlan,
  createCommunityCompanyPlan,
  getCompanyFieldLabel,
  mapProfileCompanyTypeToField,
  investInCommunityPlan,
  changeCompanyShareSheetTotal,
  MAX_ACTIVE_COMPANIES,
  requestAppStoreLicense,
  decideAppStoreLicense
} = Engine;

const STORAGE_PERSIST_INTERVAL_MS = 5000;
const STATISTICS_COLORS = ['#0ea5e9', '#38bdf8', '#6366f1', '#8b5cf6', '#ec4899', '#f97316', '#f59e0b', '#84cc16', '#14b8a6', '#06b6d4', '#22c55e', '#a855f7'];
const RESET_NOTICE_DISMISS_KEY = 'career-simulator-command-deck-reset-notice-v1';

type StatisticsTab = 'wealth' | 'investments' | 'ownership';
type PieSlice = { label: string; value: number; color: string };
type TopLevelTab = 'command' | 'company' | 'market' | 'intel';
type CompanyWorkspaceTab = 'overview' | 'operations' | 'ownership' | 'management' | 'board' | 'releases';
type MarketView = 'trade' | 'investors' | 'forbes' | 'statistics';
type IntelView = 'news' | 'releases' | 'communities' | 'licenses';
type GameCommunityCard = {
  id: string;
  name: string;
  games: string[];
  leadership: { owner: string; coOwner: string; admin: string; moderator: string; helper: string };
  messages: string[];
};
type DecisionMode = 'invest' | 'withdraw' | 'appoint' | 'dismiss' | 'payout-up' | 'payout-down';

const SOFTWARE_SPECIALIZATIONS: Array<{ key: SoftwareSpecialization; label: string; description: string }> = [
  { key: 'app-store', label: 'App Store', description: 'Application and game marketplace with publisher-facing distribution channels.' },
  { key: 'operating-system', label: 'Operating System', description: 'Core operating system platform and runtime ecosystem.' },
  { key: 'entertainment-apps', label: 'Entertainment Apps', description: 'Consumer media, streaming, and social engagement apps.' },
  { key: 'utility-apps', label: 'Utility Apps', description: 'Everyday productivity and utility software for broad audiences.' },
];

const getSoftwareSpecializationLabel = (value?: SoftwareSpecialization | null) => (
  SOFTWARE_SPECIALIZATIONS.find((entry) => entry.key === value)?.label ?? 'Utility Apps'
);

const COMPANY_FIELD_LABELS = {
  semiconductor: 'Semiconductor',
  game: 'Game Studio',
  software: 'Software',
} as const;

const NEWS_CATEGORY_LABELS: Record<NewsCategory, string> = {
  'investasi-besar': 'Major investment',
  'release-cpu': 'Release',
  'riset-baru': 'Research',
  'saham-volatil': 'Market volatility',
  'arus-investor': 'Investor movement',
};

const NARRATIVE_REPLACEMENTS: Array<[RegExp, string]> = [
  [/Selamat datang kembali/gi, 'Welcome back'],
  [/Selamat datang di #general!/gi, 'Welcome to #general!'],
  [/Patch baru sudah live, share feedback kalian\./gi, 'A new patch is live. Share your feedback.'],
  [/Scrim night jam 20:00 UTC\./gi, 'Scrim night starts at 20:00 UTC.'],
  [/Masukkan nama profil dulu\./gi, 'Enter a profile name first.'],
  [/berhasil login/gi, 'signed in successfully'],
  [/Kamu mulai sebagai investor independen di jalur/gi, 'You are starting as an independent investor on the'],
  [/Profil dihapus\. Kamu bisa membuat akun baru\./gi, 'Profile removed. You can create a new profile now.'],
  [/Dana tidak cukup atau plan sudah selesai\./gi, 'Not enough funds, or the plan has already completed.'],
  [/berhasil dibuat/gi, 'created successfully'],
  [/Pengajuan lisensi App Store dikirim\./gi, 'App Store license request submitted.'],
  [/Lisensi disetujui\./gi, 'License approved.'],
  [/Lisensi ditolak\./gi, 'License rejected.'],
  [/Kamu memilih SETUJU\./gi, 'You voted YES.'],
  [/Kamu memilih TOLAK\./gi, 'You voted NO.'],
  [/Masih memetakan ulang peluang pasar\./gi, 'Still remapping market opportunities.'],
  [/Dana awal/gi, 'Initial funding'],
  [/disalurkan\./gi, 'was allocated.'],
  [/Masukkan jumlah saham yang valid untuk dibuka ke sesama investor\./gi, 'Enter a valid share amount for the holder listing.'],
  [/Jumlah saham yang dibuka melebihi saham bebas yang belum sedang kamu listing\./gi, 'The requested listing size exceeds your currently available free shares.'],
  [/Listing holder dibuka di/gi, 'Holder listing opened at'],
  [/harga normal/gi, 'normal price'],
  [/ditutup\./gi, 'closed.'],
  [/Perubahan share sheets ditolak\./gi, 'Share sheet change was rejected.'],
  [/Share sheets diubah ke/gi, 'Share sheets changed to'],
  [/Hanya CEO atau CTO yang bisa mengubah roadmap teknologi\./gi, 'Only the CEO or CTO can change the technology roadmap.'],
  [/Research point perusahaan belum cukup\./gi, 'The company does not have enough research points.'],
  [/Hanya eksekutif teknologi AppStore yang dapat meningkatkan AppStore specs\./gi, 'Only App Store technology executives can upgrade App Store specs.'],
  [/Research point belum cukup untuk upgrade AppStore specs\./gi, 'Not enough research points to upgrade App Store specs.'],
  [/Hanya CEO atau CMO yang bisa ekspansi marketing\./gi, 'Only the CEO or CMO can expand marketing.'],
  [/Hanya CEO atau CTO yang bisa ekspansi R&D\./gi, 'Only the CEO or CTO can expand R&D.'],
  [/Hanya CEO atau COO yang bisa ekspansi operasi\./gi, 'Only the CEO or COO can expand operations.'],
  [/Kas perusahaan belum cukup untuk ekspansi tim\./gi, 'The company does not have enough cash to expand the team.'],
  [/Kamu harus menjadi CEO, CTO, atau CMO untuk merilis/gi, 'You must be the CEO, CTO, or CMO to release'],
  [/Game harus punya lisensi AppStore aktif sebelum release\./gi, 'A game company needs an active App Store license before release.'],
  [/Hanya CEO atau CFO yang bisa mengubah payout policy\./gi, 'Only the CEO or CFO can change the payout policy.'],
  [/Payout policy dinaikkan sedikit\./gi, 'Payout policy increased slightly.'],
  [/Payout policy dibuat lebih defensif\./gi, 'Payout policy shifted to a more defensive setting.'],
  [/Hanya CEO perusahaan game yang dapat mengajukan lisensi App Store\./gi, 'Only the CEO of a game company can request an App Store license.'],
  [/Pengajuan lisensi gagal atau sudah ada request aktif\./gi, 'The license request failed, or an active request already exists.'],
  [/Keputusan lisensi gagal diproses\./gi, 'The license decision could not be processed.'],
  [/Menu Decision hanya untuk eksekutif atau Board of Directors\./gi, 'The Decision desk is only available to executives or the Board of Directors.'],
  [/Masih ada voting dewan aktif di perusahaan ini\./gi, 'There is still an active board vote for this company.'],
  [/Proposal investasi/gi, 'Investment proposal'],
  [/Proposal withdrawal/gi, 'Withdrawal proposal'],
  [/Pilih kandidat eksekutif terlebih dahulu\./gi, 'Choose an executive candidate first.'],
  [/Nomination proposal dikirim ke Board\./gi, 'Nomination proposal sent to the Board.'],
  [/Proposal pemecatan eksekutif dikirim ke Board\./gi, 'Executive dismissal proposal sent to the Board.'],
  [/lebih agresif/gi, 'more aggressive'],
  [/lebih defensif/gi, 'more defensive'],
  [/Proposal perubahan payout policy dikirim ke Board\./gi, 'Payout policy change proposal sent to the Board.'],
  [/Hanya anggota Dewan Direksi yang dapat memberi vote\./gi, 'Only Board of Directors members can vote.'],
];

function translateNarrative(value: string) {
  return NARRATIVE_REPLACEMENTS.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), value);
}

function getFieldLabel(field: CompanyState['field']) {
  return COMPANY_FIELD_LABELS[field];
}

function getNewsCategoryLabelEnglish(category: NewsCategory) {
  return NEWS_CATEGORY_LABELS[category];
}

type GameCommandDeckControllerOptions = {
  initialProfileDraft?: ProfileDraft | null;
  autoCreateProfile?: boolean;
};

export function useGameCommandDeckController(options?: GameCommandDeckControllerOptions) {
  const [game, setGame] = useState<GameState | null>(null);
  const [profileDraft, setProfileDraft] = useState<ProfileDraft>(options?.initialProfileDraft ?? DEFAULT_PROFILE_DRAFT);
  const [topLevelTab, setTopLevelTab] = useState<TopLevelTab>('command');
  const [companyWorkspaceTab, setCompanyWorkspaceTab] = useState<CompanyWorkspaceTab>('overview');
  const [marketView, setMarketView] = useState<MarketView>('trade');
  const [intelView, setIntelView] = useState<IntelView>('news');
  const [releaseDraft, setReleaseDraft] = useState<ReleaseDraft>(DEFAULT_RELEASE_DRAFT);
  const [investmentDraft, setInvestmentDraft] = useState<InvestmentDraft>({ company: 'cosmic', mode: 'buy', route: 'auto', sliderPercent: 50 });
  const [shareListingDraft, setShareListingDraft] = useState<ShareListingDraft>(DEFAULT_SHARE_LISTING_DRAFT);
  const [statusMessage, setStatusMessage] = useState('Create a profile to enter the career simulator.');
  const [isReleaseDialogOpen, setIsReleaseDialogOpen] = useState(false);
  const [releaseStoreCompanyKey, setReleaseStoreCompanyKey] = useState<CompanyKey | null>(null);
  const [isInvestmentDialogOpen, setIsInvestmentDialogOpen] = useState(false);
  const [isCreateCompanyDialogOpen, setIsCreateCompanyDialogOpen] = useState(false);
  const [isLicenseRequestDialogOpen, setIsLicenseRequestDialogOpen] = useState(false);
  const [isCompanyDrawerOpen, setIsCompanyDrawerOpen] = useState(false);
  const [isMarketFilterDrawerOpen, setIsMarketFilterDrawerOpen] = useState(false);
  const [isIntelFilterDrawerOpen, setIsIntelFilterDrawerOpen] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [createCompanyDraft, setCreateCompanyDraft] = useState<{ name: string; percent: number; companyType: 'cpu' | 'game' | 'software'; softwareSpecialization: SoftwareSpecialization }>({
    name: '',
    percent: 12,
    companyType: 'cpu',
    softwareSpecialization: 'app-store',
  });
  const [newsCompanyFilter, setNewsCompanyFilter] = useState<'all' | CompanyKey>('all');
  const [forbesCategory, setForbesCategory] = useState<'individual' | 'business'>('individual');
  const [statisticsTab, setStatisticsTab] = useState<StatisticsTab>('wealth');
  const [decisionMode, setDecisionMode] = useState<DecisionMode>('invest');
  const [decisionTargetCompanyKey, setDecisionTargetCompanyKey] = useState<CompanyKey>('cosmic');
  const [decisionRole, setDecisionRole] = useState<ExecutiveRole>('cto');
  const [decisionNomineeId, setDecisionNomineeId] = useState('');
  const [decisionAmountPercent, setDecisionAmountPercent] = useState(8);
  const [isLicenseDeskOpen, setIsLicenseDeskOpen] = useState(true);
  const [selectedGameReleaseId, setSelectedGameReleaseId] = useState<string | null>(null);
  const [appStoreSelectedRelease, setAppStoreSelectedRelease] = useState<GameReleaseCard | null>(null);
  const [selectedGameCommunityId, setSelectedGameCommunityId] = useState<string | null>(null);
  const [communityChatDraft, setCommunityChatDraft] = useState('');
  const [communityChatMessages, setCommunityChatMessages] = useState<Record<string, string[]>>({});
  const [appStoreShelf, setAppStoreShelf] = useState<'featured' | 'new' | 'trending'>('featured');
  const [softwareUpgradeCategory, setSoftwareUpgradeCategory] = useState<'core' | 'scale' | 'appstore'>('core');
  const [communityPanelOpen, setCommunityPanelOpen] = useState({ games: true, leadership: true, social: true });
  const [isResetNoticeVisible, setIsResetNoticeVisible] = useState(false);
  const autoCreateProfileRef = useRef(false);
  const pausedRef = useRef(false);
  const latestGameRef = useRef<GameState | null>(null);
  const pendingPersistTimeoutRef = useRef<number | null>(null);
  const lastPersistedAtRef = useRef(0);
  const hasPendingPlayerBoardVote = useMemo(() => {
    if (!game) return false;
    return COMPANY_KEYS.some((key) => {
      const company = game.companies[key];
      const vote = company.activeBoardVote;
      if (!vote) return false;
      if (!company.boardMembers.some((member) => member.id === game.player.id)) return false;
      if (game.elapsedDays > vote.endDay) return false;
      return !(vote.memberVotes ?? {})[game.player.id];
    });
  }, [game]);
  const activeCompanyType = game?.player.companyType ?? profileDraft.companyType;
  const productLabel = activeCompanyType === 'game' ? 'Game' : activeCompanyType === 'software' ? 'Software' : 'CPU';
  const productLabelLower = productLabel.toLowerCase();
  const rendererMode = useMemo(() => {
    if (typeof navigator === 'undefined') return 'SSR';
    return 'gpu' in navigator ? 'WebGPU-ready' : 'CPU fallback';
  }, []);

  useEffect(() => {
    setCreateCompanyDraft((current) => ({ ...current, companyType: activeCompanyType }));
  }, [activeCompanyType]);
  const simulatorTitle = 'Career Simulator';
  const isGamePaused = isInvestmentDialogOpen || hasPendingPlayerBoardVote;

  useEffect(() => {
    pausedRef.current = isGamePaused;
  }, [isGamePaused]);

  useEffect(() => {
    if (!game || !hasPendingPlayerBoardVote) return;
    const hasPendingAiVotesForPlayer = COMPANY_KEYS.some((companyKey) => {
      const company = game.companies[companyKey];
      const vote = company.activeBoardVote;
      if (!vote) return false;
      if (game.elapsedDays > vote.endDay) return false;
      const playerIsBoardMember = company.boardMembers.some((member) => member.id === game.player.id);
      if (!playerIsBoardMember) return false;
      if ((vote.memberVotes ?? {})[game.player.id]) return false;
      return company.boardMembers.some((member) => member.id !== game.player.id && !(vote.memberVotes ?? {})[member.id]);
    });
    if (!hasPendingAiVotesForPlayer) return;

    setGame((current) => {
      if (!current) return current;
      let next = current;
      let guard = 0;
      const maxLoops = 48;
      while (guard < maxLoops) {
        const unresolved = COMPANY_KEYS.some((companyKey) => {
          const company = next.companies[companyKey];
          const vote = company.activeBoardVote;
          if (!vote) return false;
          if (next.elapsedDays > vote.endDay) return false;
          const playerIsBoardMember = company.boardMembers.some((member) => member.id === next.player.id);
          if (!playerIsBoardMember) return false;
          if ((vote.memberVotes ?? {})[next.player.id]) return false;
          return company.boardMembers.some((member) => member.id !== next.player.id && !(vote.memberVotes ?? {})[member.id]);
        });
        if (!unresolved) break;
        const progressed = progressBoardVotes(next);
        if (progressed === next) break;
        next = progressed;
        guard += 1;
      }
      return next === current ? current : next;
    });
  }, [game, hasPendingPlayerBoardVote]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as GameState;
      const parsedCompanies = parsed.companies as Partial<Record<CompanyKey, CompanyState>>;
      const fallbackCompany = (parsedCompanies.cosmic ?? Object.values(parsedCompanies)[0]) as CompanyState | undefined;
      if (!fallbackCompany) return;
      const normalized = resolveGovernance({
        ...parsed,
        player: {
          ...parsed.player,
          companyType: parsed.player.companyType === 'game' || parsed.player.companyType === 'software' ? parsed.player.companyType : 'cpu',
        },
        companies: COMPANY_KEYS.reduce((acc, key) => {
          const company = parsedCompanies[key] ?? {
            ...fallbackCompany,
            key,
            name: key.toUpperCase(),
            founder: 'Pending Founder',
            founderInvestorId: `founder_${key}`,
            ceoId: `founder_${key}`,
            ceoName: 'Pending Founder',
            isEstablished: false,
            establishedDay: null,
            cash: 0,
            research: 0,
            marketShare: 0,
            reputation: 0,
            releaseCount: 0,
            revenuePerDay: 0,
            researchPerDay: 0,
            shareListings: [],
            field: parsed.player.companyType === 'game'
              ? 'game'
              : parsed.player.companyType === 'software'
                ? 'software'
                : 'semiconductor',
          };
          acc[key] = {
            ...company,
            field: company.field === 'game' || company.field === 'software' ? company.field : 'semiconductor',
            softwareSpecialization: company.softwareSpecialization ?? null,
            shareSheetTotal: company.shareSheetTotal ?? company.sharesOutstanding ?? TOTAL_SHARES,
            lastShareSheetChangeDay: company.lastShareSheetChangeDay ?? 0,
            portfolioValue: company.portfolioValue ?? 0,
            researchAssetValue: company.researchAssetValue ?? company.research ?? 0,
            capitalStrain: company.capitalStrain ?? 0,
            lastReleaseDay: company.lastReleaseDay ?? 0,
            lastReleaseCpuScore: company.lastReleaseCpuScore ?? calculateCpuScore(company.upgrades),
            lastReleasePriceIndex: company.lastReleasePriceIndex ?? 1,
            emergencyReleaseAnchorDay: company.emergencyReleaseAnchorDay ?? null,
            emergencyReleaseCount: company.emergencyReleaseCount ?? 0,
            lastEmergencyReleaseDay: company.lastEmergencyReleaseDay ?? null,
            activeBoardVote: company.activeBoardVote
              ? {
                ...company.activeBoardVote,
                memberVotes: company.activeBoardVote.memberVotes ?? {},
              }
              : null,
            boardVoteWindowStartDay: company.boardVoteWindowStartDay ?? 0,
            boardVoteCountInWindow: company.boardVoteCountInWindow ?? 0,
            shareListings: sanitizeShareListings({
              ...company,
              shareListings: company.shareListings ?? [],
            }),
            isEstablished: company.isEstablished ?? false,
            establishedDay: company.establishedDay ?? null,
            appStorePassiveIncomePerDay: company.appStorePassiveIncomePerDay ?? 0,
            appStoreDownloadsPerDay: company.appStoreDownloadsPerDay ?? 0,
            appStoreProfile: {
              discovery: company.appStoreProfile?.discovery ?? (company.softwareSpecialization === 'app-store' ? 1.2 : 0.8),
              infrastructure: company.appStoreProfile?.infrastructure ?? (company.softwareSpecialization === 'app-store' ? 1.25 : 0.85),
              trust: company.appStoreProfile?.trust ?? (company.softwareSpecialization === 'app-store' ? 1.15 : 0.82),
            },
          };
          return acc;
        }, {} as Record<CompanyKey, CompanyState>),
        plans: COMPANY_KEYS.reduce((acc, key) => {
          const company = parsedCompanies[key] ?? fallbackCompany;
          const sourcePlan = parsed.plans?.[key];
          acc[key] = {
            companyKey: key,
            field: sourcePlan?.field === 'game' || sourcePlan?.field === 'software'
              ? sourcePlan.field
              : company.field === 'game' || company.field === 'software'
                ? company.field
                : 'semiconductor',
            softwareSpecialization: sourcePlan?.softwareSpecialization ?? (company.softwareSpecialization ?? null),
            companyName: sourcePlan?.companyName ?? company.name,
            founderInvestorId: sourcePlan?.founderInvestorId ?? company.founderInvestorId,
            founderName: sourcePlan?.founderName ?? company.founder,
            startDay: sourcePlan?.startDay ?? 0,
            dueDay: sourcePlan?.dueDay ?? 0,
            targetCapital: sourcePlan?.targetCapital ?? company.cash,
            pledgedCapital: sourcePlan?.pledgedCapital ?? company.cash,
            shareSheetTotal: sourcePlan?.shareSheetTotal ?? (company.shareSheetTotal ?? company.sharesOutstanding),
            pledges: Array.isArray(sourcePlan?.pledges) ? sourcePlan!.pledges : [],
            isEstablished: sourcePlan?.isEstablished ?? (company.isEstablished ?? true),
          };
          return acc;
        }, {} as Record<CompanyKey, CompanyEstablishmentPlan>),
        communityPlans: Array.isArray(parsed.communityPlans)
          ? parsed.communityPlans
            .filter((plan): plan is CommunityCompanyPlan => Boolean(plan?.id && plan?.companyName))
            .map((plan) => ({
              ...plan,
              field: plan.field === 'game' || plan.field === 'software' ? plan.field : 'semiconductor',
              softwareSpecialization: plan.softwareSpecialization ?? null,
              investorIds: Array.isArray(plan.investorIds) ? plan.investorIds : [],
              status: plan.status === 'established' || plan.status === 'expired' ? plan.status : 'funding',
              pledgedCapital: Number.isFinite(plan.pledgedCapital) ? plan.pledgedCapital : 0,
              targetCapital: Number.isFinite(plan.targetCapital) ? plan.targetCapital : 0,
              dueDay: Number.isFinite(plan.dueDay) ? plan.dueDay : 0,
              startDay: Number.isFinite(plan.startDay) ? plan.startDay : 0,
            }))
          : [],
        appStoreLicenseRequests: Array.isArray((parsed as GameState).appStoreLicenseRequests)
          ? ((parsed as GameState).appStoreLicenseRequests as AppStoreLicenseRequest[])
            .filter((request) => Boolean(request?.id && request.gameCompanyKey && request.softwareCompanyKey))
            .map((request) => ({
              ...request,
              status: request.status === 'approved' || request.status === 'rejected' ? request.status : 'pending',
              decisionDay: request.decisionDay ?? null,
              revenueShare: clamp(request.revenueShare ?? 0.2, 0.1, 0.36),
              monthlyDownloads: Math.max(0, request.monthlyDownloads ?? 0),
              publishedReleaseCount: Math.max(0, request.publishedReleaseCount ?? 0),
              lastPublishedDay: request.lastPublishedDay ?? null,
              note: request.note ?? '',
            }))
          : [],
        npcs: parsed.npcs.map((npc) => ({
          ...npc,
          strategy: npc.strategy ?? 'balanced',
          horizonDays: npc.horizonDays ?? 365,
          reserveRatio: npc.reserveRatio ?? 0.2,
          intelligence: npc.intelligence ?? 0.72,
          analysisNote: npc.analysisNote ?? 'Masih memetakan ulang peluang pasar.',
          active: true,
          lastActionDay: npc.lastActionDay ?? -30,
          convictionBias: npc.convictionBias ?? 0,
        })),
      });
      setGame(normalized);
      setStatusMessage(`Welcome back, ${parsed.player.name}.`);
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
    latestGameRef.current = game;

    const persistNow = () => {
      if (!latestGameRef.current) return;
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(latestGameRef.current));
      lastPersistedAtRef.current = Date.now();
      pendingPersistTimeoutRef.current = null;
    };

    const elapsed = Date.now() - lastPersistedAtRef.current;
    if (elapsed >= STORAGE_PERSIST_INTERVAL_MS) {
      persistNow();
      return;
    }

    if (pendingPersistTimeoutRef.current !== null) return;
    pendingPersistTimeoutRef.current = window.setTimeout(persistNow, STORAGE_PERSIST_INTERVAL_MS - elapsed);
  }, [game]);

  useEffect(() => (
    () => {
      if (pendingPersistTimeoutRef.current !== null) {
        window.clearTimeout(pendingPersistTimeoutRef.current);
      }
      if (latestGameRef.current) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(latestGameRef.current));
      }
    }
  ), []);

  useEffect(() => {
    if (isGamePaused) return undefined;
    const interval = window.setInterval(() => {
      if (pausedRef.current) return;
      setGame((current) => (current ? simulateTick(current) : current));
    }, TICK_MS);
    return () => window.clearInterval(interval);
  }, [isGamePaused]);

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

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setIsResetNoticeVisible(!window.localStorage.getItem(RESET_NOTICE_DISMISS_KEY));
  }, []);
  const activateProfile = (draft: ProfileDraft) => {
    const trimmedName = draft.name.trim();
    if (!trimmedName) {
      setStatusMessage('Enter a profile name first.');
      return;
    }

    const nextGame = createInitialGameState({ ...draft, name: trimmedName });
    setGame(nextGame);
    const companyPathLabel = nextGame.player.companyType === 'game' ? 'Game Company' : nextGame.player.companyType === 'software' ? 'Software Company' : 'CPU Company';
    setStatusMessage(`${trimmedName} is live. You are starting as an independent investor on the ${companyPathLabel} path.`);
    setReleaseDraft({
      series: `${nextGame.companies[nextGame.player.selectedCompany].name} Prime`,
      cpuName: nextGame.player.companyType === 'game' ? 'Launch-01' : nextGame.player.companyType === 'software' ? 'SW-01' : 'PX-01',
      priceIndex: 1,
    });
    setProfileDraft({ ...draft, name: trimmedName });
    setInvestmentDraft({ company: draft.selectedCompany, mode: 'buy', route: 'auto', sliderPercent: 50 });
    setShareListingDraft({ ...DEFAULT_SHARE_LISTING_DRAFT, company: draft.selectedCompany });
    setTopLevelTab('command');
    setCompanyWorkspaceTab('overview');
    setMarketView('trade');
    setIntelView('news');
  };

  const createProfile = () => {
    activateProfile(profileDraft);
  };

  useEffect(() => {
    if (!options?.autoCreateProfile || !options.initialProfileDraft || game || autoCreateProfileRef.current) {
      return;
    }
    autoCreateProfileRef.current = true;
    activateProfile(options.initialProfileDraft);
  }, [game, options?.autoCreateProfile, options?.initialProfileDraft]);

  const resetProfile = () => {
    window.localStorage.removeItem(STORAGE_KEY);
    setGame(null);
    setProfileDraft(DEFAULT_PROFILE_DRAFT);
    setReleaseDraft(DEFAULT_RELEASE_DRAFT);
    setInvestmentDraft({ company: 'cosmic', mode: 'buy', route: 'auto', sliderPercent: 50 });
    setShareListingDraft(DEFAULT_SHARE_LISTING_DRAFT);
    setStatusMessage('Profile removed. You can create a new profile now.');
    setIsInvestmentDialogOpen(false);
    setIsReleaseDialogOpen(false);
    setIsCreateCompanyDialogOpen(false);
    setIsLicenseRequestDialogOpen(false);
    setIsCompanyDrawerOpen(false);
    setIsMarketFilterDrawerOpen(false);
    setIsIntelFilterDrawerOpen(false);
    setSelectedGameReleaseId(null);
    setSelectedGameCommunityId(null);
    setAppStoreSelectedRelease(null);
    setCommunityChatDraft('');
    setCommunityChatMessages({});
    setIsResetConfirmOpen(false);
    setTopLevelTab('command');
  };

  const activeCompany = game ? game.companies[game.player.selectedCompany] : null;
  const focusedCompany = activeCompany;
  const focusedGameReleaseCards = useMemo<GameReleaseCard[]>(() => {
    if (!game || !focusedCompany || (focusedCompany.field !== 'game' && focusedCompany.field !== 'software')) return [];
    if (focusedCompany.field === 'software') {
      const partnerNames = Object.values(game.companies)
        .filter((company) => company.key !== focusedCompany.key && company.isEstablished && (company.field === 'game' || company.field === 'software'))
        .slice(0, 4)
        .map((company) => company.name);
      const softwareProducts = [
        { kind: 'App Store', name: `${focusedCompany.name} App Store`, communities: [`${focusedCompany.name} Store Partners`, ...partnerNames] },
        { kind: 'Operating System', name: `${focusedCompany.name} OS`, communities: [`${focusedCompany.name} Kernel Labs`, `${focusedCompany.name} Device Alliance`] },
        { kind: 'Entertainment App', name: `${focusedCompany.name} Stream`, communities: [`${focusedCompany.name} Creator Hub`, `${focusedCompany.name} Media Community`] },
        { kind: 'Utility App', name: `${focusedCompany.name} Utility Suite`, communities: [`${focusedCompany.name} Productivity Circle`, `${focusedCompany.name} Automation Builders`] },
      ];
      return softwareProducts.map((product, index) => {
        const seeded = createSeededRandom(`${focusedCompany.key}-software-${product.kind}-${index}`);
        return {
          id: `${focusedCompany.key}-software-${index}`,
          name: product.name,
          genre: product.kind,
          releaseDate: formatDateFromDays(Math.max(0, game.elapsedDays - index * 18)),
          popularity: Math.round(clamp((focusedCompany.reputation / 100) * 70 + seeded() * 30, 10, 99) * 10) / 10,
          communities: product.communities.slice(0, 3),
        };
      });
    }
    const releaseCount = Math.max(1, Math.min(18, focusedCompany.releaseCount));
    return Array.from({ length: releaseCount }).map((_, index) => {
      const releaseNo = releaseCount - index;
      const seeded = createSeededRandom(`${focusedCompany.key}-release-${releaseNo}-${focusedCompany.lastReleaseDay}`);
      const datasetEntry = GAME_NAME_DATASET[Math.floor(seeded() * GAME_NAME_DATASET.length)] ?? GAME_NAME_DATASET[0];
      const releaseDate = formatDateFromDays(Math.max(0, focusedCompany.lastReleaseDay - index * 16));
      const name = `${datasetEntry.name} ${releaseNo > 1 ? `S${String(releaseNo).padStart(2, '0')}` : ''}`.trim();
      const communities = [`${name} ${datasetEntry.theme} Hub`, `${name} ${datasetEntry.era} Society`, `${name} Global Guild`];
      return {
        id: `${focusedCompany.key}-game-${releaseNo}`,
        name,
        genre: datasetEntry.genre,
        releaseDate,
        popularity: Math.round(clamp((focusedCompany.reputation / 100) * 72 + seeded() * 28, 12, 99) * 10) / 10,
        communities,
      };
    });
  }, [focusedCompany, game]);
  const selectedGameRelease = useMemo(
    () => focusedGameReleaseCards.find((entry) => entry.id === selectedGameReleaseId) ?? appStoreSelectedRelease ?? null,
    [appStoreSelectedRelease, focusedGameReleaseCards, selectedGameReleaseId]
  );
  const nonEntrepreneurNpcPool = useMemo(() => {
    if (!game) return [];
    return game.npcs.filter((npc) => {
      const hasCorporateIdentity = Object.values(game.companies).some((company) => (
        company.founderInvestorId === npc.id
        || company.ceoId === npc.id
        || Object.values(company.executives).some((executive) => executive?.occupantId === npc.id)
      ));
      return !hasCorporateIdentity;
    });
  }, [game]);
  const selectedGameCommunities = useMemo<GameCommunityCard[]>(() => {
    if (!selectedGameRelease || !game) return [];
    return selectedGameRelease.communities.slice(0, 3).map((name, index) => {
      const seeded = createSeededRandom(`${selectedGameRelease.id}-${name}`);
      const getNpcName = (offset: number) => nonEntrepreneurNpcPool[(index * 7 + offset) % Math.max(1, nonEntrepreneurNpcPool.length)]?.name ?? `Gamer-${index + 1}-${offset}`;
      return {
        id: `${selectedGameRelease.id}-community-${index}`,
        name,
        games: [selectedGameRelease.name, focusedCompany?.name ?? 'Studio Project', `Side Quest ${Math.round(seeded() * 100)}`],
        leadership: {
          owner: getNpcName(0),
          coOwner: getNpcName(1),
          admin: getNpcName(2),
          moderator: getNpcName(3),
          helper: getNpcName(4),
        },
        messages: [`[${name}] Selamat datang di #general!`, 'Patch baru sudah live, share feedback kalian.', 'Scrim night jam 20:00 UTC.'],
      };
    });
  }, [selectedGameRelease, game, focusedCompany, nonEntrepreneurNpcPool]);
  const selectedGameCommunity = useMemo(
    () => selectedGameCommunities.find((entry) => entry.id === selectedGameCommunityId) ?? null,
    [selectedGameCommunities, selectedGameCommunityId]
  );
  const focusedAppStoreListings = useMemo(() => {
    if (!game || !focusedCompany || focusedCompany.field !== 'software' || focusedCompany.softwareSpecialization !== 'app-store') return [];
    const approved = game.appStoreLicenseRequests
      .filter((request) => (
        request.softwareCompanyKey === focusedCompany.key
        && request.status === 'approved'
        && (
          request.publishedReleaseCount > 0
          || game.companies[request.gameCompanyKey].releaseCount > 0
        )
      ))
      .sort((left, right) => (
        (right.lastPublishedDay ?? right.decisionDay ?? 0) - (left.lastPublishedDay ?? left.decisionDay ?? 0)
      ));
    return approved.map((request, index) => {
      const gameCompany = game.companies[request.gameCompanyKey];
      const seeded = createSeededRandom(`${focusedCompany.key}-appstore-${request.id}-${index}`);
      const icon = APPSTORE_ICON_SET[Math.floor(seeded() * APPSTORE_ICON_SET.length)] ?? '🎮';
      const datasetEntry = GAME_NAME_DATASET[Math.floor(seeded() * GAME_NAME_DATASET.length)] ?? GAME_NAME_DATASET[0];
      const estimatedDownloads = Math.max(
        120,
        request.monthlyDownloads,
        gameCompany.marketShare * 140 + gameCompany.reputation * 110 + gameCompany.releaseCount * 90
      );
      const releaseCard: GameReleaseCard = {
        id: `${request.id}-partner-game`,
        name: `${datasetEntry.name} ${Math.max(1, gameCompany.releaseCount)}`,
        genre: datasetEntry.genre,
        releaseDate: formatDateFromDays(Math.max(0, game.elapsedDays - index * 5)),
        popularity: Math.round(clamp((gameCompany.reputation / 100) * 74 + seeded() * 24, 8, 99) * 10) / 10,
        communities: [`${gameCompany.name} Players`, `${datasetEntry.theme} Fans`, `${datasetEntry.era} Club`],
      };
      return {
        id: request.id,
        icon,
        gameName: releaseCard.name,
        studioName: gameCompany.name,
        genre: releaseCard.genre,
        monthlyDownloads: estimatedDownloads,
        quality: clamp(gameCompany.reputation + gameCompany.marketShare * 0.6, 10, 100),
        releaseCard,
      };
    });
  }, [focusedCompany, game]);
  const visibleAppStoreListings = useMemo(() => {
    if (focusedAppStoreListings.length === 0) return [];
    if (appStoreShelf === 'new') return [...focusedAppStoreListings].sort((left, right) => right.quality - left.quality).slice(0, 6);
    if (appStoreShelf === 'trending') return [...focusedAppStoreListings].sort((left, right) => right.monthlyDownloads - left.monthlyDownloads).slice(0, 6);
    return focusedAppStoreListings.slice(0, 6);
  }, [appStoreShelf, focusedAppStoreListings]);
  useEffect(() => {
    setSelectedGameReleaseId(null);
    setAppStoreSelectedRelease(null);
    setSelectedGameCommunityId(null);
    setCommunityChatDraft('');
    setCommunityPanelOpen({ games: true, leadership: true, social: true });
  }, [game?.player.selectedCompany]);
  const companyStatisticsSlices = useMemo(() => {
    if (!game || !focusedCompany) {
      return {
        wealth: [] as PieSlice[],
        investments: [] as PieSlice[],
        ownership: [] as PieSlice[],
      };
    }

    const researchWealth = Math.max(0, getCompanyResearchAssetValue(focusedCompany));
    const investmentWealth = Math.max(0, focusedCompany.portfolioValue);
    const latestSalesWealth = Math.max(0, calculateLaunchRevenue(
      Math.max(1, focusedCompany.lastReleaseCpuScore),
      focusedCompany.teams,
      focusedCompany.marketShare,
      focusedCompany.reputation,
      PRICE_PRESETS[focusedCompany.lastReleasePriceIndex]?.factor ?? 1
    ));
    const wealth: PieSlice[] = [
      { label: 'Research assets', value: researchWealth, color: STATISTICS_COLORS[0] },
      { label: 'Company investments', value: investmentWealth, color: STATISTICS_COLORS[2] },
      { label: 'Latest release sales', value: latestSalesWealth, color: STATISTICS_COLORS[4] },
    ];

    const corporateInvestorId = getCorporateInvestorId(focusedCompany.key);
    const investments = COMPANY_KEYS
      .filter((key) => key !== focusedCompany.key)
      .map((key) => {
        const target = game.companies[key];
        const shares = target.investors[corporateInvestorId] ?? 0;
        return { label: target.name, value: shares * getSharePrice(target) };
      })
      .filter((entry) => entry.value > 0.01)
      .map((entry, index) => ({ ...entry, color: STATISTICS_COLORS[index % STATISTICS_COLORS.length] }));

    const ceoShares = focusedCompany.investors[focusedCompany.ceoId] ?? 0;
    const corporateShares = Object.entries(focusedCompany.investors)
      .filter(([investorId]) => Boolean(getCompanyKeyFromCorporateInvestorId(investorId)))
      .reduce((sum, [, shares]) => sum + shares, 0);
    const externalShares = Object.entries(focusedCompany.investors)
      .filter(([investorId]) => investorId !== focusedCompany.ceoId && !getCompanyKeyFromCorporateInvestorId(investorId))
      .reduce((sum, [, shares]) => sum + shares, 0);
    const openShares = Math.max(0, focusedCompany.marketPoolShares);
    const ownership: PieSlice[] = [
      { label: `CEO shares (${focusedCompany.ceoName})`, value: ceoShares, color: STATISTICS_COLORS[1] },
      { label: 'External investors', value: externalShares, color: STATISTICS_COLORS[6] },
      { label: 'Corporate holders', value: corporateShares, color: STATISTICS_COLORS[9] },
      { label: 'Treasury / open shares', value: openShares, color: STATISTICS_COLORS[11] },
    ];

    return { wealth, investments, ownership };
  }, [game, focusedCompany]);
  const statisticsTabConfig: Array<{ key: StatisticsTab; label: string; title: string; slices: PieSlice[] }> = useMemo(() => ([
    { key: 'wealth', label: 'Wealth', title: 'Company wealth mix', slices: companyStatisticsSlices.wealth },
    { key: 'investments', label: 'Investments', title: 'Company investment spread', slices: companyStatisticsSlices.investments },
    { key: 'ownership', label: 'Ownership', title: 'Share ownership mix', slices: companyStatisticsSlices.ownership },
  ]), [companyStatisticsSlices]);
  const activeStatisticsConfig = statisticsTabConfig.find((entry) => entry.key === statisticsTab) ?? statisticsTabConfig[0];
  const establishedCompanies = game ? COMPANY_KEYS.filter((key) => game.companies[key].isEstablished).map((key) => game.companies[key]) : [];
  const openPlans = game
    ? COMPANY_KEYS
      .filter((key) => !game.plans[key].isEstablished && game.elapsedDays <= game.plans[key].dueDay)
      .map((key) => game.plans[key])
    : [];
  const communityPlans = game ? game.communityPlans.filter((plan) => plan.status === 'funding') : [];
  const formatCurrencyCompact = (valueInMillions: number, decimals = 2) => `$ ${formatMoneyCompact(valueInMillions, decimals)}`;
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
  const forbesIndividualList = useMemo(() => {
    if (!game) return [];

    const candidateInvestorIds = new Set<string>();
    candidateInvestorIds.add(game.player.id);
    game.npcs.forEach((npc) => candidateInvestorIds.add(npc.id));
    COMPANY_KEYS.forEach((key) => {
      const company = game.companies[key];
      candidateInvestorIds.add(company.founderInvestorId);
      Object.keys(company.investors).forEach((investorId) => candidateInvestorIds.add(investorId));
    });

    return Array.from(candidateInvestorIds)
      .filter((investorId) => !getCompanyKeyFromCorporateInvestorId(investorId))
      .map((investorId) => {
        const cash = getInvestorCash(game, investorId);
        const holdings = COMPANY_KEYS
          .map((key) => {
            const company = game.companies[key];
            const shares = company.investors[investorId] ?? 0;
            return { companyName: company.name, shares, value: shares * getSharePrice(company) };
          })
          .filter((holding) => holding.shares > 0.0001);
        const equity = holdings.reduce((sum, holding) => sum + holding.value, 0);
        const total = cash + equity;
        const uniqueCompanyNames = Array.from(new Set(holdings.map((holding) => holding.companyName)));
        return {
          investorId,
          name: investorDisplayName(game, investorId),
          wealth: total,
          companyNames: uniqueCompanyNames,
        };
      })
      .sort((left, right) => (
        right.wealth - left.wealth
        || right.companyNames.length - left.companyNames.length
        || left.name.localeCompare(right.name)
      ));
  }, [game]);
  const forbesBusinessList = useMemo(() => {
    if (!game) return [];
    return COMPANY_KEYS
      .map((key) => game.companies[key])
      .filter((company) => company.isEstablished)
      .map((company) => ({
        companyKey: company.key,
        name: company.name,
        valuation: getCompanyValuation(company),
        category: getFieldLabel(company.field),
        field: company.field,
        investorsCount: Object.values(company.investors).filter((shares) => shares > 0.01).length,
      }))
      .sort((left, right) => right.valuation - left.valuation || left.name.localeCompare(right.name));
  }, [game]);
  const activePlayerBoardVote = useMemo(() => {
    if (!game) return null;
    const votes = COMPANY_KEYS
      .map((key) => {
        const company = game.companies[key];
        const playerIsBoardMember = company.boardMembers.some((member) => member.id === game.player.id);
        if (!playerIsBoardMember || !company.activeBoardVote) return null;
        if (game.elapsedDays > company.activeBoardVote.endDay) return null;
        if ((company.activeBoardVote.memberVotes ?? {})[game.player.id]) return null;
        return { companyKey: key, company, vote: company.activeBoardVote };
      })
      .filter((entry): entry is { companyKey: CompanyKey; company: CompanyState; vote: BoardVoteState } => Boolean(entry))
      .sort((left, right) => right.vote.startDay - left.vote.startDay);
    return votes[0] ?? null;
  }, [game]);
  const activePlayerBoardVoteMeta = useMemo(() => {
    if (!activePlayerBoardVote || !game) return null;
    const memberVotes = activePlayerBoardVote.vote.memberVotes ?? {};
    const aiBoardMembers = activePlayerBoardVote.company.boardMembers.filter((member) => member.id !== game.player.id);
    const aiVotesCast = aiBoardMembers.filter((member) => memberVotes[member.id]).length;
    const totalVotesCast = Object.keys(memberVotes).length;
    return {
      aiVotesCast,
      aiTotalVoters: aiBoardMembers.length,
      totalVotesCast,
      totalVoters: activePlayerBoardVote.company.boardMembers.length,
      playerCanVote: aiVotesCast >= aiBoardMembers.length,
    };
  }, [activePlayerBoardVote, game]);
  const activePricePreset = PRICE_PRESETS[releaseDraft.priceIndex];
  const isPlayerCeo = Boolean(game && activeCompany && activeCompany.ceoId === game.player.id);
  const focusedPlayerIsCeo = Boolean(game && focusedCompany && focusedCompany.ceoId === game.player.id);
  const focusedIsGameField = focusedCompany?.field === 'game';
  const focusedIsSoftwareField = focusedCompany?.field === 'software';
  const activePlayerExecutiveRoles = activeCompany && game ? getExecutiveRolesForInvestor(activeCompany, game.player.id) : [];
  const focusedPlayerExecutiveRoles = focusedCompany && game ? getExecutiveRolesForInvestor(focusedCompany, game.player.id) : [];
  const focusedPlayerIsBoardMember = Boolean(focusedCompany && game && focusedCompany.boardMembers.some((member) => member.id === game.player.id));
  const focusedPlayerCanUseDecision = Boolean(focusedCompany && (focusedPlayerIsBoardMember || focusedPlayerExecutiveRoles.length > 0));
  const focusedCanManageTechnology = Boolean(focusedCompany && game && hasCompanyAuthority(focusedCompany, game.player.id, 'technology'));
  const focusedCanManageFinance = Boolean(focusedCompany && game && hasCompanyAuthority(focusedCompany, game.player.id, 'finance'));
  const focusedCanReleaseCpu = Boolean(focusedCompany && game && hasCompanyAuthority(focusedCompany, game.player.id, 'release'));
  const activeCpuScore = activeCompany ? calculateCpuScore(activeCompany.upgrades) : 0;
  const activeReleaseRating = game && activeCompany
    ? evaluateCpuReleaseRating(game, activeCompany, releaseDraft.priceIndex, activeCpuScore)
    : null;
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
    if (!company.isEstablished) return null;
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
      return (Object.values(game.companies) as CompanyState[]).filter((company) => company.isEstablished).map((company) => ({
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
      if (!game || !activeCompany) return [];
      if (!activeCompany.isEstablished) return [];
      return Object.entries(activeCompany.investors)
        .map(([investorId, shares]) => ({
          investorId,
          shares,
          amount: shares * getSharePrice(activeCompany),
          ownership: getOwnershipPercent(activeCompany, investorId),
          displayName: investorDisplayName(game, investorId),
        }))
        .sort((left, right) => right.shares - left.shares);
    },
    [activeCompany, game]
  );
  const focusedExecutiveCandidatePool = useMemo(
    () => (focusedCompany && game ? getExecutiveCandidatePool(game, focusedCompany, focusedCompany.ceoId) : []),
    [focusedCompany, game]
  );
  const focusedPlayerListing = useMemo(
    () => (focusedCompany && game ? focusedCompany.shareListings.find((listing) => listing.sellerId === game.player.id) ?? null : null),
    [focusedCompany, game]
  );
  const playerOwnedAppStoreCompanies = useMemo(
    () => (
      game
        ? COMPANY_KEYS
          .map((key) => game.companies[key])
          .filter((company) => company.isEstablished && company.field === 'software' && company.softwareSpecialization === 'app-store' && company.ceoId === game.player.id)
        : []
    ),
    [game]
  );
  const pendingPlayerLicenseRequests = useMemo(
    () => (
      game
        ? game.appStoreLicenseRequests
          .filter((request) => request.status === 'pending' && playerOwnedAppStoreCompanies.some((company) => company.key === request.softwareCompanyKey))
          .sort((left, right) => left.requestedDay - right.requestedDay)
        : []
    ),
    [game, playerOwnedAppStoreCompanies]
  );
  const availableAppStoreCompanies = useMemo(
    () => (game
      ? COMPANY_KEYS
        .map((key) => game.companies[key])
        .filter((company) => company.isEstablished && company.field === 'software' && company.softwareSpecialization === 'app-store')
      : []),
    [game]
  );
  const activeApprovedReleaseStores = useMemo(() => {
    if (!game || !activeCompany || activeCompany.field !== 'game') return [];
    return availableAppStoreCompanies.filter((store) => game.appStoreLicenseRequests.some((request) => (
      request.gameCompanyKey === activeCompany.key
      && request.softwareCompanyKey === store.key
      && request.status === 'approved'
    )));
  }, [activeCompany, availableAppStoreCompanies, game]);
  const focusedPlayerIsGameExecutive = Boolean(
    focusedCompany
    && focusedCompany.field === 'game'
    && (focusedPlayerIsCeo || focusedPlayerExecutiveRoles.length > 0)
  );
  const focusedGameLicenseMatrix = useMemo(() => {
    if (!game || !focusedCompany || focusedCompany.field !== 'game') return [];
    return availableAppStoreCompanies.map((store) => {
      const pairRequests = game.appStoreLicenseRequests
        .filter((request) => request.gameCompanyKey === focusedCompany.key && request.softwareCompanyKey === store.key)
        .sort((left, right) => right.requestedDay - left.requestedDay);
      const latest = pairRequests[0] ?? null;
      const daysSinceDecision = latest?.decisionDay !== null && latest?.decisionDay !== undefined
        ? game.elapsedDays - latest.decisionDay
        : null;
      const canApply = !latest || (latest.status === 'rejected' && (daysSinceDecision ?? 0) >= 30);
      return { store, latest, canApply, cooldownDaysLeft: latest?.status === 'rejected' && daysSinceDecision !== null ? Math.max(0, 30 - daysSinceDecision) : 0 };
    });
  }, [availableAppStoreCompanies, focusedCompany, game]);
  const isMonthlyLicenseWindow = Boolean(game && Math.floor(game.elapsedDays) % 30 <= 1);

  useEffect(() => {
    if (!focusedCompany) return;
    const fallbackTarget = COMPANY_KEYS.find((key) => key !== focusedCompany.key && game?.companies[key].isEstablished) ?? focusedCompany.key;
    setDecisionTargetCompanyKey(fallbackTarget);
  }, [focusedCompany, game]);

  useEffect(() => {
    if (isMonthlyLicenseWindow && pendingPlayerLicenseRequests.length > 0) {
      setIsLicenseDeskOpen(true);
    }
  }, [isMonthlyLicenseWindow, pendingPlayerLicenseRequests.length]);

  useEffect(() => {
    if (!activeCompany || activeCompany.field !== 'game') {
      setReleaseStoreCompanyKey(null);
      return;
    }
    const preferred = activeApprovedReleaseStores[0]?.key ?? null;
    setReleaseStoreCompanyKey((current) => (current && activeApprovedReleaseStores.some((store) => store.key === current) ? current : preferred));
  }, [activeApprovedReleaseStores, activeCompany]);

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
    setTopLevelTab('company');
    setCompanyWorkspaceTab('overview');
    setMarketView('trade');
    setIntelView('news');
  };

  const closeTransientLayers = () => {
    setIsReleaseDialogOpen(false);
    setIsInvestmentDialogOpen(false);
    setIsCreateCompanyDialogOpen(false);
    setIsLicenseRequestDialogOpen(false);
    setIsCompanyDrawerOpen(false);
    setIsMarketFilterDrawerOpen(false);
    setIsIntelFilterDrawerOpen(false);
    setIsResetConfirmOpen(false);
  };

  const dismissResetNotice = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(RESET_NOTICE_DISMISS_KEY, 'dismissed');
    }
    setIsResetNoticeVisible(false);
  };

  const investInPlan = (companyKey: CompanyKey, ratio: number) => {
    if (!game) return;
    const contribution = clamp(game.player.cash * ratio, MIN_TRADE_AMOUNT, game.player.cash);
    const next = investInCompanyPlan(game, game.player.id, companyKey, contribution);
    if (next === game) {
      setStatusMessage('Not enough funds, or the company plan has already completed.');
      return;
    }
    setGame(next);
    setStatusMessage(`You committed ${formatCurrencyCompact(contribution, 2)} to ${next.plans[companyKey].companyName}.`);
  };

  const createCompanyPlanByPlayer = () => {
    if (!game) return;
    const contribution = clamp(game.player.cash * (createCompanyDraft.percent / 100), 0, game.player.cash);
    const field = mapProfileCompanyTypeToField(createCompanyDraft.companyType);
    const next = createCommunityCompanyPlan(
      game,
      game.player.id,
      createCompanyDraft.name,
      contribution,
      field,
      field === 'software' ? createCompanyDraft.softwareSpecialization : undefined
    );
    if (next === game) {
      setStatusMessage(`Plan creation failed. Use a unique name, enough capital, and keep active companies under ${MAX_ACTIVE_COMPANIES}.`);
      return;
    }
    setGame(next);
    setIsCreateCompanyDialogOpen(false);
    setCreateCompanyDraft({ name: '', percent: 12, companyType: activeCompanyType, softwareSpecialization: 'app-store' });
    const specializationSuffix = field === 'software' ? ` · ${getSoftwareSpecializationLabel(createCompanyDraft.softwareSpecialization)}` : '';
    setStatusMessage(`Plan ${createCompanyDraft.name.trim()} (${getCompanyFieldLabel(field)}${specializationSuffix}) berhasil dibuat. Dana awal ${formatCurrencyCompact(contribution, 2)} disalurkan.`);
  };

  const investInCompany = () => {
    if (!game || !investmentPreview) return;
    if (investmentDraft.mode === 'sell' && investmentDraft.route === 'holders') {
      setStatusMessage('Use "Open listing" in Ownership to sell shares to other holders at 2x, 3x, or 4x.');
      return;
    }
    const company = game.companies[investmentDraft.company];
    const beforeWasCeo = company.ceoId === game.player.id;
    const requestedTradeValue = getRequestedTradeValue(investmentPreview.maxTradeValue, investmentDraft.sliderPercent);
    const result = transactShares(game, game.player.id, investmentDraft.company, investmentDraft.mode, requestedTradeValue, investmentDraft.route);
    if (result.tradedValue <= 0) {
      setStatusMessage(investmentDraft.mode === 'buy' ? 'Not enough personal cash or route liquidity to buy shares.' : 'Not enough shares or holder demand in the selected route.');
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
        `${formatDateFromDays(result.next.elapsedDays)}: ${game.player.name} ${investmentDraft.mode === 'buy' ? 'bought' : 'sold'} ${formatNumber(result.sharesMoved, 2)} shares of ${company.name} via ${getTradeRouteLabel(result.route).toLowerCase()}.`
      ),
    };

    const nextCompany = next.companies[investmentDraft.company];
    const playerOwnership = getOwnershipPercent(nextCompany, next.player.id);
    const lostCeo = beforeWasCeo && nextCompany.ceoId !== next.player.id;
    setGame(next);
    setStatusMessage(
      investmentDraft.mode === 'buy'
        ? nextCompany.ceoId === next.player.id
          ? `You are now the CEO of ${nextCompany.name} with ${formatNumber(playerOwnership, 1)}% ownership.`
          : `Buy complete. Your ownership in ${nextCompany.name} is now ${formatNumber(playerOwnership, 1)}%.`
        : lostCeo
          ? `Sale complete. You were automatically removed as CEO of ${nextCompany.name} after the board review.`
          : `Sale complete. Your ownership in ${nextCompany.name} is now ${formatNumber(playerOwnership, 1)}%.`
    );
    setIsInvestmentDialogOpen(false);
    setTopLevelTab('market');
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

  const updateShareSheetOption = (companyKey: CompanyKey, nextTotal: number) => {
    if (!game) return;
    const result = changeCompanyShareSheetTotal(game, companyKey, game.player.id, nextTotal);
    if (!result.changed) {
      setStatusMessage(result.reason || 'Perubahan share sheets ditolak.');
      return;
    }
    setGame(result.next);
    setStatusMessage(`${result.next.companies[companyKey].name}: Share sheets diubah ke ${formatNumber(nextTotal)}.`);
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
        researchAssetValue: (company.researchAssetValue ?? 0) + cost,
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

  const improveAppStoreProfile = (profileKey: 'discovery' | 'infrastructure' | 'trust', companyKey?: CompanyKey) => {
    const targetCompany = game ? game.companies[companyKey ?? game.player.selectedCompany] : null;
    if (!game || !targetCompany || targetCompany.field !== 'software' || targetCompany.softwareSpecialization !== 'app-store' || !hasCompanyAuthority(targetCompany, game.player.id, 'technology')) {
      setStatusMessage('Hanya eksekutif teknologi AppStore yang dapat meningkatkan AppStore specs.');
      return;
    }
    const currentValue = targetCompany.appStoreProfile[profileKey];
    const cost = Math.round(22 + currentValue * 18);
    if (targetCompany.research < cost) {
      setStatusMessage('Research point belum cukup untuk upgrade AppStore specs.');
      return;
    }
    setGame((current) => {
      if (!current) return current;
      const resolvedKey = companyKey ?? current.player.selectedCompany;
      const company = current.companies[resolvedKey];
      return resolveGovernance({
        ...current,
        companies: {
          ...current.companies,
          [resolvedKey]: {
            ...company,
            research: company.research - cost,
            appStoreProfile: {
              ...company.appStoreProfile,
              [profileKey]: Math.round((company.appStoreProfile[profileKey] + 0.12) * 100) / 100,
            },
            appStorePassiveIncomePerDay: company.appStorePassiveIncomePerDay * 1.02,
          },
        },
      });
    });
    setStatusMessage(`AppStore spec ${profileKey} berhasil ditingkatkan.`);
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
      setStatusMessage(`Kamu harus menjadi CEO, CTO, atau CMO untuk merilis ${productLabel} perusahaan ini.`);
      return;
    }

    const series = releaseDraft.series.trim();
    const cpuName = releaseDraft.cpuName.trim();
    if (!series || !cpuName) {
      setStatusMessage(`Isi nama seri dan nama ${productLabel} dulu.`);
      return;
    }

    const releaseRating = evaluateCpuReleaseRating(game, activeCompany, releaseDraft.priceIndex, activeCpuScore);
    const baseLaunchRevenue = calculateLaunchRevenue(
      activeCpuScore,
      activeCompany.teams,
      activeCompany.marketShare,
      activeCompany.reputation,
      activePricePreset.factor
    ) * releaseRating.salesMultiplier;
    const selectedReleaseStore = activeCompany.field === 'game'
      ? activeApprovedReleaseStores.find((store) => store.key === releaseStoreCompanyKey) ?? activeApprovedReleaseStores[0] ?? null
      : null;
    if (activeCompany.field === 'game' && !selectedReleaseStore) {
      setStatusMessage('Game harus punya lisensi AppStore aktif sebelum release.');
      return;
    }
    const launchRevenue = activeCompany.field === 'game' ? baseLaunchRevenue * 0.22 : baseLaunchRevenue;
    const storeLaunchFee = activeCompany.field === 'game' ? launchRevenue * 0.2 : 0;
    const reputationGain = Math.max(0.8, (activeCpuScore / 240 + activeCompany.teams.marketing.count * 0.7 + activePricePreset.reputationBonus) * releaseRating.reputationMultiplier);
    const marketShareGain = Math.min(5.5, (activeCpuScore / 500 + activeCompany.teams.fabrication.count * 0.16 + activePricePreset.marketBonus) * releaseRating.marketShareMultiplier);

    const nextReleaseCount = activeCompany.releaseCount + 1;
    const appStoreLicenseRequests = selectedReleaseStore
      ? game.appStoreLicenseRequests.map((request) => {
        if (
          request.gameCompanyKey !== activeCompany.key
          || request.softwareCompanyKey !== selectedReleaseStore.key
          || request.status !== 'approved'
        ) return request;
        const estimatedMonthlyDownloads = Math.max(
          request.monthlyDownloads,
          Math.round(clamp(baseLaunchRevenue * 0.9 + activeCpuScore * 9 + activeCompany.marketShare * 130, 220, 250000))
        );
        return {
          ...request,
          monthlyDownloads: estimatedMonthlyDownloads,
          publishedReleaseCount: Math.max(request.publishedReleaseCount, nextReleaseCount),
          lastPublishedDay: game.elapsedDays,
        };
      })
      : game.appStoreLicenseRequests;
    const next = resolveGovernance({
      ...game,
      companies: {
        ...game.companies,
        [activeCompany.key]: {
          ...activeCompany,
          cash: activeCompany.cash + launchRevenue - storeLaunchFee,
          reputation: clamp(activeCompany.reputation + reputationGain, 10, 100),
          marketShare: clamp(activeCompany.marketShare + marketShareGain, 3, 75),
          releaseCount: activeCompany.releaseCount + 1,
          bestCpuScore: Math.max(activeCompany.bestCpuScore, activeCpuScore),
          lastReleaseDay: game.elapsedDays,
          lastReleaseCpuScore: activeCpuScore,
          lastReleasePriceIndex: releaseDraft.priceIndex,
          lastRelease: `${series} ${cpuName} rilis ${formatDateFromDays(game.elapsedDays)} (${activePricePreset.label.toLowerCase()})${selectedReleaseStore ? ` via ${selectedReleaseStore.name}` : ''} · ${releaseRating.summary}`,
        },
        ...(selectedReleaseStore
          ? {
            [selectedReleaseStore.key]: {
              ...game.companies[selectedReleaseStore.key],
              cash: game.companies[selectedReleaseStore.key].cash + storeLaunchFee,
            },
          }
          : {}),
      },
      appStoreLicenseRequests,
      activityFeed: addFeedEntry(
        game.activityFeed,
        `${formatDateFromDays(game.elapsedDays)}: ${activeCompany.name} merilis ${series} ${cpuName} (rating ${formatNumber(releaseRating.rating, 1)})${selectedReleaseStore ? ` via ${selectedReleaseStore.name}` : ''} dan membukukan $${formatMoneyCompact(launchRevenue - storeLaunchFee)}.`
      ),
    });

    setGame(next);
    setStatusMessage(`${series} ${cpuName} launched successfully with a ${formatNumber(releaseRating.rating, 1)} rating.`);
    setReleaseDraft({
      ...releaseDraft,
      cpuName: activeCompany.field === 'game'
        ? `Launch-${String(activeCompany.releaseCount + 1).padStart(2, '0')}`
        : `PX-${String(activeCompany.releaseCount + 1).padStart(2, '0')}`,
    });
    setIsReleaseDialogOpen(false);
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

  const submitGameLicenseRequest = (gameCompanyKey: CompanyKey, softwareCompanyKey: CompanyKey) => {
    if (!game) return;
    const source = game.companies[gameCompanyKey];
    if (!source.isEstablished || source.field !== 'game' || source.ceoId !== game.player.id) {
      setStatusMessage('Hanya CEO perusahaan game yang dapat mengajukan lisensi App Store.');
      return;
    }
    const next = requestAppStoreLicense(
      game,
      game.player.id,
      gameCompanyKey,
      softwareCompanyKey,
      `${game.player.name} mengajukan lisensi distribusi App Store untuk passive income berbasis download.`
    );
    if (next === game) {
      setStatusMessage('Pengajuan lisensi gagal atau sudah ada request aktif.');
      return;
    }
    setGame(next);
    setStatusMessage('Pengajuan lisensi App Store dikirim.');
  };

  const processPlayerLicenseRequest = (requestId: string, decision: 'approved' | 'rejected') => {
    if (!game) return;
    const next = decideAppStoreLicense(game, requestId, game.player.id, decision);
    if (next === game) {
      setStatusMessage('Keputusan lisensi gagal diproses.');
      return;
    }
    setGame(next);
    setStatusMessage(decision === 'approved' ? 'Lisensi disetujui.' : 'Lisensi ditolak.');
  };

  const queueDecisionBoardVote = (
    companyKey: CompanyKey,
    kind: BoardVoteKind,
    subject: string,
    reason: string,
    payload: {
      investmentValue?: number;
      withdrawalValue?: number;
      decisionAction?: BoardDecisionAction;
    }
  ) => {
    setGame((current) => {
      if (!current) return current;
      const company = current.companies[companyKey];
      if (company.activeBoardVote && current.elapsedDays <= company.activeBoardVote.endDay) return current;
      const vote: BoardVoteState = {
        id: `${companyKey}-decision-${Math.floor(current.elapsedDays)}-${Math.floor(current.tickCount)}`,
        kind,
        proposerId: current.player.id,
        subject,
        reason,
        memberVotes: {},
        investmentValue: payload.investmentValue,
        withdrawalValue: payload.withdrawalValue,
        decisionAction: payload.decisionAction,
        yesWeight: 0,
        noWeight: 0,
        startDay: current.elapsedDays,
        endDay: current.elapsedDays + 3,
      };
      return {
        ...current,
        companies: {
          ...current.companies,
          [companyKey]: {
            ...company,
            activeBoardVote: vote,
          },
        },
      };
    });
  };

  const submitDecision = () => {
    if (!game || !focusedCompany) return;
    if (!focusedPlayerCanUseDecision) {
      setStatusMessage('Menu Decision hanya untuk eksekutif atau Board of Directors.');
      return;
    }
    if (focusedCompany.activeBoardVote && game.elapsedDays <= focusedCompany.activeBoardVote.endDay) {
      setStatusMessage('Masih ada voting dewan aktif di perusahaan ini.');
      return;
    }

    if (decisionMode === 'invest') {
      const target = game.companies[decisionTargetCompanyKey];
      const rawAmount = focusedCompany.cash * (decisionAmountPercent / 100);
      const amount = clamp(rawAmount, MIN_TRADE_AMOUNT, Math.max(MIN_TRADE_AMOUNT, focusedCompany.cash * 0.8));
      queueDecisionBoardVote(
        focusedCompany.key,
        'investasi',
        `${focusedCompany.name} → ${target.name}`,
        `${game.player.name} meminta persetujuan Board untuk investasi strategis ke ${target.name}.`,
        {
          investmentValue: amount,
          decisionAction: { type: 'invest', sourceCompanyKey: focusedCompany.key, targetCompanyKey: target.key, amount },
        }
      );
      setStatusMessage(`Proposal investasi $${formatMoneyCompact(amount, 2)} dikirim ke Board.`);
      return;
    }

    if (decisionMode === 'withdraw') {
      const amount = clamp(focusedCompany.portfolioValue * (decisionAmountPercent / 100), MIN_TRADE_AMOUNT, Math.max(MIN_TRADE_AMOUNT, focusedCompany.portfolioValue));
      queueDecisionBoardVote(
        focusedCompany.key,
        'investasi',
        `${focusedCompany.name} treasury withdrawal`,
        `${game.player.name} meminta Board menarik sebagian portofolio investasi untuk menjaga likuiditas.`,
        {
          withdrawalValue: amount,
          decisionAction: { type: 'withdraw', sourceCompanyKey: focusedCompany.key, targetCompanyKey: decisionTargetCompanyKey, amount },
        }
      );
      setStatusMessage(`Proposal withdrawal $${formatMoneyCompact(amount, 2)} dikirim ke Board.`);
      return;
    }

    if (decisionMode === 'appoint') {
      if (!decisionNomineeId) {
        setStatusMessage('Pilih kandidat eksekutif terlebih dahulu.');
        return;
      }
      const kind: BoardVoteKind = focusedCompany.executives[decisionRole] ? 'penggantian' : 'pengangkatan';
      queueDecisionBoardVote(
        focusedCompany.key,
        kind,
        `${EXECUTIVE_ROLE_META[decisionRole].title} · ${investorDisplayName(game, decisionNomineeId)}`,
        `${game.player.name} menominasikan ${investorDisplayName(game, decisionNomineeId)} sebagai ${EXECUTIVE_ROLE_META[decisionRole].title}.`,
        { decisionAction: { type: 'appoint', companyKey: focusedCompany.key, role: decisionRole, candidateId: decisionNomineeId } }
      );
      setStatusMessage('Nomination proposal dikirim ke Board.');
      return;
    }

    if (decisionMode === 'dismiss') {
      if (!focusedCompany.executives[decisionRole]) {
        setStatusMessage(`Kursi ${EXECUTIVE_ROLE_META[decisionRole].title} saat ini kosong.`);
        return;
      }
      queueDecisionBoardVote(
        focusedCompany.key,
        'pemecatan',
        `Vacate ${EXECUTIVE_ROLE_META[decisionRole].title}`,
        `${game.player.name} mengusulkan pengosongan kursi ${EXECUTIVE_ROLE_META[decisionRole].title} untuk restrukturisasi.`,
        { decisionAction: { type: 'dismiss', companyKey: focusedCompany.key, role: decisionRole } }
      );
      setStatusMessage('Proposal pemecatan eksekutif dikirim ke Board.');
      return;
    }

    if (decisionMode === 'payout-up' || decisionMode === 'payout-down') {
      queueDecisionBoardVote(
        focusedCompany.key,
        'investasi',
        `${focusedCompany.name} payout policy`,
        `${game.player.name} mengusulkan perubahan payout policy (${decisionMode === 'payout-up' ? 'lebih agresif' : 'lebih defensif'}).`,
        {}
      );
      setStatusMessage('Proposal perubahan payout policy dikirim ke Board.');
    }
  };

  const castPlayerBoardVote = (companyKey: CompanyKey, choice: 'yes' | 'no') => {
    if (!game) return;
    const company = game.companies[companyKey];
    const vote = company.activeBoardVote;
    if (!vote) return;
    if (!company.boardMembers.some((member) => member.id === game.player.id)) {
      setStatusMessage('Hanya anggota Dewan Direksi yang dapat memberi vote.');
      return;
    }
    if (game.elapsedDays > vote.endDay) {
      setStatusMessage('Voting ini sudah berakhir.');
      return;
    }
    setGame((current) => {
      if (!current) return current;
      const currentCompany = current.companies[companyKey];
      const currentVote = currentCompany.activeBoardVote;
      if (!currentVote) return current;
      const memberVotes = {
        ...(currentVote.memberVotes ?? {}),
        [current.player.id]: choice,
      };
      const tally = tallyBoardVoteWeights(currentCompany.boardMembers, memberVotes);
      let nextState: GameState = {
        ...current,
        companies: {
          ...current.companies,
          [companyKey]: {
            ...currentCompany,
            activeBoardVote: {
              ...currentVote,
              memberVotes,
              yesWeight: tally.yesWeight,
              noWeight: tally.noWeight,
            },
          },
        },
      };
      const everyoneVoted = currentCompany.boardMembers.every((member) => Boolean(memberVotes[member.id]));
      const approved = tally.yesWeight >= tally.noWeight;
      const decisionAction = currentVote.decisionAction;
      if (everyoneVoted && approved && decisionAction) {
        if (decisionAction.type === 'invest') {
          const corporateInvestorId = getCorporateInvestorId(decisionAction.sourceCompanyKey);
          const trade = transactShares(nextState, corporateInvestorId, decisionAction.targetCompanyKey, 'buy', decisionAction.amount, 'company');
          nextState = trade.next;
        } else if (decisionAction.type === 'withdraw') {
          const source = nextState.companies[decisionAction.sourceCompanyKey];
          const holdings = COMPANY_KEYS
            .filter((key) => key !== decisionAction.sourceCompanyKey)
            .map((key) => ({ key, shares: source.investors[getCorporateInvestorId(key)] ?? 0 }))
            .filter((entry) => entry.shares > 0.001)
            .sort((left, right) => right.shares - left.shares);
          const highestHolding = holdings[0];
          if (highestHolding) {
            const corporateInvestorId = getCorporateInvestorId(decisionAction.sourceCompanyKey);
            const trade = transactShares(nextState, corporateInvestorId, highestHolding.key, 'sell', decisionAction.amount, 'company');
            nextState = trade.next;
          }
        } else if (decisionAction.type === 'appoint') {
          const company = nextState.companies[decisionAction.companyKey];
          nextState = resolveGovernance({
            ...nextState,
            companies: {
              ...nextState.companies,
              [decisionAction.companyKey]: {
                ...company,
                executives: {
                  ...company.executives,
                  [decisionAction.role]: createExecutiveRecord(
                    nextState,
                    company,
                    decisionAction.role,
                    decisionAction.candidateId,
                    nextState.player.id,
                    `${nextState.player.name} mengeksekusi hasil voting Board untuk posisi ${EXECUTIVE_ROLE_META[decisionAction.role].title}.`
                  ),
                },
              },
            },
          });
        } else if (decisionAction.type === 'dismiss') {
          const company = nextState.companies[decisionAction.companyKey];
          nextState = resolveGovernance({
            ...nextState,
            companies: {
              ...nextState.companies,
              [decisionAction.companyKey]: {
                ...company,
                executives: {
                  ...company.executives,
                  [decisionAction.role]: null,
                },
              },
            },
          });
        }
      }
      return nextState;
    });
    setStatusMessage(choice === 'yes' ? 'Kamu memilih SETUJU.' : 'Kamu memilih TOLAK.');
  };

  const translatedNewsItems = useMemo(
    () => newsItems.map((item) => ({
      ...item,
      label: getNewsCategoryLabelEnglish(item.category),
      entry: translateNarrative(item.entry),
      companyName: item.companyKey && game ? game.companies[item.companyKey].name : 'Global',
    })),
    [game, newsItems]
  );

  const sendCommunityMessage = () => {
    if (!selectedGameCommunity) return;
    const message = communityChatDraft.trim();
    if (!message) return;
    setCommunityChatMessages((current) => ({
      ...current,
      [selectedGameCommunity.id]: [...(current[selectedGameCommunity.id] ?? []), `${game?.player.name ?? 'Player'}: ${message}`],
    }));
    setCommunityChatDraft('');
    setStatusMessage(`Message sent to ${selectedGameCommunity.name}.`);
  };

  return {
    game,
    simulatorTitle,
    rendererMode,
    statusMessage: translateNarrative(statusMessage),
    rawStatusMessage: statusMessage,
    isGamePaused,
    isResetNoticeVisible,
    dismissResetNotice,
    hasPendingPlayerBoardVote,
    activeCompanyType,
    productLabel,
    productLabelLower,
    profileDraft,
    setProfileDraft,
    createProfile,
    resetProfile,
    topLevelTab,
    setTopLevelTab,
    companyWorkspaceTab,
    setCompanyWorkspaceTab,
    marketView,
    setMarketView,
    intelView,
    setIntelView,
    releaseDraft,
    setReleaseDraft,
    investmentDraft,
    setInvestmentDraft,
    shareListingDraft,
    setShareListingDraft,
    createCompanyDraft,
    setCreateCompanyDraft,
    newsCompanyFilter,
    setNewsCompanyFilter,
    forbesCategory,
    setForbesCategory,
    statisticsTab,
    setStatisticsTab,
    decisionMode,
    setDecisionMode,
    decisionTargetCompanyKey,
    setDecisionTargetCompanyKey,
    decisionRole,
    setDecisionRole,
    decisionNomineeId,
    setDecisionNomineeId,
    decisionAmountPercent,
    setDecisionAmountPercent,
    isReleaseDialogOpen,
    setIsReleaseDialogOpen,
    releaseStoreCompanyKey,
    setReleaseStoreCompanyKey,
    isInvestmentDialogOpen,
    setIsInvestmentDialogOpen,
    isCreateCompanyDialogOpen,
    setIsCreateCompanyDialogOpen,
    isLicenseRequestDialogOpen,
    setIsLicenseRequestDialogOpen,
    isCompanyDrawerOpen,
    setIsCompanyDrawerOpen,
    isMarketFilterDrawerOpen,
    setIsMarketFilterDrawerOpen,
    isIntelFilterDrawerOpen,
    setIsIntelFilterDrawerOpen,
    isResetConfirmOpen,
    setIsResetConfirmOpen,
    isLicenseDeskOpen,
    setIsLicenseDeskOpen,
    selectedGameReleaseId,
    setSelectedGameReleaseId,
    appStoreSelectedRelease,
    setAppStoreSelectedRelease,
    selectedGameCommunityId,
    setSelectedGameCommunityId,
    communityChatDraft,
    setCommunityChatDraft,
    communityChatMessages,
    appStoreShelf,
    setAppStoreShelf,
    softwareUpgradeCategory,
    setSoftwareUpgradeCategory,
    communityPanelOpen,
    setCommunityPanelOpen,
    activeCompany,
    focusedCompany,
    establishedCompanies,
    openPlans,
    communityPlans,
    companyCards,
    investmentPreview,
    investorRankings,
    forbesIndividualList,
    forbesBusinessList,
    statisticsTabConfig,
    activeStatisticsConfig,
    newsItems: translatedNewsItems,
    rawNewsItems: newsItems,
    activePlayerBoardVote,
    activePlayerBoardVoteMeta,
    activePricePreset,
    activeReleaseRating,
    activeApprovedReleaseStores,
    availableAppStoreCompanies,
    pendingPlayerLicenseRequests,
    playerOwnedAppStoreCompanies,
    focusedGameLicenseMatrix,
    focusedGameReleaseCards,
    selectedGameRelease,
    selectedGameCommunities,
    selectedGameCommunity,
    focusedAppStoreListings,
    visibleAppStoreListings,
    focusedExecutiveCandidatePool,
    focusedPlayerListing,
    playerNetWorth,
    activePlayerExecutiveRoles,
    focusedPlayerExecutiveRoles,
    isPlayerCeo,
    focusedPlayerIsCeo,
    focusedPlayerIsBoardMember,
    focusedPlayerCanUseDecision,
    focusedPlayerIsGameExecutive,
    focusedCanManageTechnology,
    focusedCanManageFinance,
    focusedCanReleaseCpu,
    focusedIsGameField,
    focusedIsSoftwareField,
    activeCpuScore,
    focusedCpuScore,
    isMonthlyLicenseWindow,
    switchCompany,
    closeTransientLayers,
    investInPlan,
    createCompanyPlanByPlayer,
    investInCompany,
    openPlayerShareListing,
    cancelPlayerShareListing,
    updateShareSheetOption,
    improveUpgrade,
    improveAppStoreProfile,
    hireTeam,
    launchCpu,
    rotateExecutiveAppointment,
    clearExecutiveAppointment,
    adjustPayoutBias,
    submitGameLicenseRequest,
    processPlayerLicenseRequest,
    submitDecision,
    castPlayerBoardVote,
    sendCommunityMessage,
    constants: {
      STORAGE_KEY,
      RESET_NOTICE_DISMISS_KEY,
      PLAYER_STARTING_CASH,
      MIN_TRADE_AMOUNT,
      COMPANY_KEYS,
      SHARE_SHEET_OPTIONS,
      TRANSACTION_SLIDER_STOPS,
      PRICE_PRESETS,
      EXECUTIVE_ROLE_META,
      EXECUTIVE_ROLES,
      SOFTWARE_SPECIALIZATIONS,
      STATISTICS_COLORS,
    },
    formatters: {
      formatNumber,
      formatMoneyCompact,
      formatCurrencyCompact,
      formatDateFromDays,
      translateNarrative,
      getFieldLabel,
      getNewsCategoryLabelEnglish,
      getSoftwareSpecializationLabel,
      getTradeRouteLabel,
    },
    helpers: {
      clamp,
      calculateResearchPerDay,
      calculateRevenuePerDay,
      calculateLaunchRevenue,
      getCompanyInvestmentTotal,
      getSharePrice,
      getCompanyValuation,
      getCompanyResearchAssetValue,
      getOwnershipPercent,
      getInvestorCash,
      getListingAskPrice,
      getInvestorOpenListedShares,
      getAvailableSharesToList,
      getRequestedTradeValue,
      getTradePreview,
      investorDisplayName,
      getManagementCadenceDays,
      getCandidateLeadershipScore,
      getDisplayedUpgradeValue,
      getUpgradeCost,
      getTeamCost,
      getCompanyFieldLabel,
      mapProfileCompanyTypeToField,
    },
  };

/*
  if (!game) {
    return (
      <main className={styles.shell}>
        <GameCardSurface as="section" className={styles.loginCard}>
          <p className={styles.eyebrow}>/game · unified career gameplay</p>
          <h1>{simulatorTitle}</h1>
          <p className={styles.subtitle}>Satu simulasi terpadu untuk investor, manajemen perusahaan, dan perilisan produk tanpa mode terpisah.</p>
              <label className={styles.field}>
              <span>Nama profil</span>
              <input value={profileDraft.name} onChange={(event) => setProfileDraft((current) => ({ ...current, name: event.target.value }))} placeholder="Contoh: Arka Vega" />
          </label>
              <label className={styles.field}>
              <span>Latar belakang</span>
              <input value={profileDraft.background} onChange={(event) => setProfileDraft((current) => ({ ...current, background: event.target.value }))} placeholder="Investor dengan visi teknologi" />
          </label>
              <div className={styles.field}>
              <span>Tipe perusahaan (mekanik sama)</span>
              <div className={styles.quickGrid}>
              <GameButton type="button" className={profileDraft.companyType === 'cpu' ? styles.quickButtonActive : styles.quickButton} onClick={() => setProfileDraft((current) => ({ ...current, companyType: 'cpu' }))}>
                CPU Company
              </GameButton>
              <GameButton type="button" className={profileDraft.companyType === 'game' ? styles.quickButtonActive : styles.quickButton} onClick={() => setProfileDraft((current) => ({ ...current, companyType: 'game' }))}>
                Game Company
              </GameButton>
              <GameButton type="button" className={profileDraft.companyType === 'software' ? styles.quickButtonActive : styles.quickButton} onClick={() => setProfileDraft((current) => ({ ...current, companyType: 'software' }))}>
                Software Company
              </GameButton>
              </div>
          </div>
              <div className={styles.quickGrid}>
            {COMPANY_KEYS.map((company) => (
              <GameButton key={company} type="button" className={profileDraft.selectedCompany === company ? styles.quickButtonActive : styles.quickButton} onClick={() => setProfileDraft((current) => ({ ...current, selectedCompany: company }))}>
                {company.toUpperCase()}
              </GameButton>
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
              <GameButton type="button" className={styles.primaryButton} onClick={createProfile}>
            Login & buat akun
          </GameButton>
              <div className={styles.memoCard}>
            <p className={styles.panelTag}>Status</p>
            <p>{statusMessage}</p>
          </div>
        </GameCardSurface>
      </main>
    );
  }

  return (
    <>
      <main className={styles.shell}>
        <GameCardSurface as="section" className={styles.heroCard}>
          <div className={styles.heroHeader}>
              <div>
              <p className={styles.eyebrow}>/game · {simulatorTitle.toLowerCase()}</p>
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
              <GameButton type="button" className={styles.releaseTrigger} onClick={openCompaniesFrame}>
              Companies
            </GameButton>
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
        </GameCardSurface>

        <GameSurface as="section" className={styles.panelStack}>
          <GameCardSurface as="section" className={styles.panel}>
            <GameButton type="button" className={styles.panelToggle} onClick={() => togglePanel('profile')}>
              <div>
                <p className={styles.panelTag}>Profile</p>
                <h2>Akun ringkas & aksi cepat</h2>
              </div>
              <span>{openPanels.profile ? 'Tutup' : 'Buka'}</span>
              </GameButton>
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
                  <GameButton type="button" className={styles.primaryButton} onClick={openCompaniesFrame}>
                    Companies
                  </GameButton>
                  <GameButton type="button" className={styles.secondaryButton} onClick={() => { closeTransientLayers(); setIsCreateCompanyOpen(true); }}>
                    Create a company
                  </GameButton>
                  <GameButton type="button" className={styles.secondaryButton} onClick={() => { closeTransientLayers(); setIsInvestmentMenuOpen(true); }}>
                    Beli / jual saham
                  </GameButton>
                  <GameButton type="button" className={styles.ghostButton} onClick={() => activeCompany && openInvestorFrame(activeCompany.key)}>
                    Investor list
                  </GameButton>
                  <GameButton type="button" className={styles.ghostButton} onClick={() => activeCompany && openCompanyDetail(activeCompany.key, 'game')}>
                    Detail fokus
                  </GameButton>
                  <GameButton type="button" className={styles.ghostButton} onClick={resetProfile}>
                    Reset profil
                  </GameButton>
                </div>
              </div>
            ) : null}
          </GameCardSurface>

          <GameCardSurface as="section" className={styles.panel}>
            <GameButton type="button" className={styles.panelToggle} onClick={() => togglePanel('intel')}>
              <div>
                <p className={styles.panelTag}>NPC intel</p>
                <h2>Feed ringkas & tekanan investor</h2>
              </div>
              <span>{openPanels.intel ? 'Tutup' : 'Buka'}</span>
              </GameButton>
            {openPanels.intel ? (
              <div className={styles.panelBody}>
                <div className={styles.actionRow}>
                  <GameButton type="button" className={styles.primaryButton} onClick={() => setIsNewsFrameOpen(true)}>
                    Buka News
                  </GameButton>
                  <GameButton type="button" className={styles.secondaryButton} onClick={() => { setForbesCategory('individual'); setIsForbesFrameOpen(true); }}>
                    Forbes ranking
                  </GameButton>
                </div>
                <div className={styles.memoCard}>
                  <p className={styles.panelTag}>Intel split frame</p>
                  <p>
                    News memuat 5 berita terbaru (dengan filter perusahaan). Forbes ranking memuat ranking kekayaan semua investor unik tanpa duplikasi identitas.
                  </p>
                </div>
              </div>
            ) : null}
          </GameCardSurface>
        </GameSurface>
      </main>

      {isCreateCompanyOpen && game ? (
        <GameDialog
          open
          ariaLabel="Create company plan"
          eyebrow="Create a company"
          title="Buka plan pendirian perusahaan"
          onClose={() => setIsCreateCompanyOpen(false)}
          closeLabel="Tutup create company"
        >
          <label className={styles.field}>
            <span>Company name</span>
            <input value={createCompanyDraft.name} onChange={(event) => setCreateCompanyDraft((current) => ({ ...current, name: event.target.value }))} placeholder="Contoh: Aurora Logic" />
          </label>
          <label className={styles.field}>
            <span>Personal funds disalurkan (%)</span>
            <input type="range" min={5} max={45} step={1} value={createCompanyDraft.percent} onChange={(event) => setCreateCompanyDraft((current) => ({ ...current, percent: Number(event.target.value) }))} />
          </label>
          <div className={styles.field}>
            <span>Company type for this plan</span>
            <div className={styles.quickGrid}>
              <GameButton type="button" className={createCompanyDraft.companyType === 'cpu' ? styles.quickButtonActive : styles.quickButton} onClick={() => setCreateCompanyDraft((current) => ({ ...current, companyType: 'cpu' }))}>
                CPU Company
              </GameButton>
              <GameButton type="button" className={createCompanyDraft.companyType === 'game' ? styles.quickButtonActive : styles.quickButton} onClick={() => setCreateCompanyDraft((current) => ({ ...current, companyType: 'game' }))}>
                Game Company
              </GameButton>
              <GameButton type="button" className={createCompanyDraft.companyType === 'software' ? styles.quickButtonActive : styles.quickButton} onClick={() => setCreateCompanyDraft((current) => ({ ...current, companyType: 'software' }))}>
                Software Company
              </GameButton>
            </div>
          </div>
          {createCompanyDraft.companyType === 'software' ? (
            <label className={styles.field}>
              <span>Software focus</span>
              <select value={createCompanyDraft.softwareSpecialization} onChange={(event) => setCreateCompanyDraft((current) => ({ ...current, softwareSpecialization: event.target.value as SoftwareSpecialization }))}>
                {SOFTWARE_SPECIALIZATIONS.map((entry) => (
                  <option key={entry.key} value={entry.key}>{entry.label}</option>
                ))}
              </select>
              <small>{SOFTWARE_SPECIALIZATIONS.find((entry) => entry.key === createCompanyDraft.softwareSpecialization)?.description}</small>
            </label>
          ) : null}
          <div className={styles.memoCard}>
            <p className={styles.panelTag}>Preview</p>
            <p>
              Dana awal pendiri: {formatCurrencyCompact(game.player.cash * (createCompanyDraft.percent / 100), 2)} · Batas perusahaan aktif: {MAX_ACTIVE_COMPANIES}.
            </p>
          </div>
          <GameButton type="button" className={styles.primaryButton} onClick={createCompanyPlanByPlayer}>
            Buat plan sekarang
          </GameButton>
        </GameDialog>
      ) : null}
      {isCompaniesFrameOpen ? (
        <GameScreenFrame
          open
          ariaLabel="Daftar perusahaan"
          frameName="Companies"
          subtitle={`Plans & perusahaan ${productLabel}`}
          onClose={() => setIsCompaniesFrameOpen(false)}
          backLabel="Tutup daftar perusahaan"
        >
          <div className={styles.memoCard}>
            <p className={styles.panelTag}>Instruksi</p>
            <p>
              {establishedCompanies.length > 0
                ? 'Tap perusahaan untuk cek valuasi, harga saham, dan ownership live.'
                : 'Belum ada perusahaan aktif. Buka Company Establishment Plan untuk membantu pendanaan awal hingga perusahaan resmi berdiri.'}
            </p>
          </div>

          <div className={styles.companyList}>
            {openPlans.map((plan) => (
              <GameButton key={`plan-${plan.companyKey}`} type="button" className={styles.companyCardButton} onClick={() => openPlanDetail(plan.companyKey)}>
                <article className={styles.companyCard}>
                  <div className={styles.itemTop}>
                    <div>
                      <p className={styles.itemLabel}>Company Establishment Plan</p>
                      <h3>{plan.companyName}</h3>
                    </div>
                    <span className={styles.costPill}>
                      {getCompanyFieldLabel(plan.field)}
                      {plan.field === 'software' ? ` · ${getSoftwareSpecializationLabel(plan.softwareSpecialization)}` : ''}
                      {' · 1 bulan pendanaan'}
                    </span>
                  </div>
                  <div className={styles.infoRowCompact}>
                    <div>
                      <span>Capital</span>
                      <strong>{formatCurrencyCompact(plan.pledgedCapital, 2)}</strong>
                    </div>
                    <div>
                      <span>Target</span>
                      <strong>{formatCurrencyCompact(plan.targetCapital, 2)}</strong>
                    </div>
                    <div>
                      <span>Jumlah investor</span>
                      <strong>{formatNumber(new Set(plan.pledges.map((pledge) => pledge.investorId)).size)}</strong>
                    </div>
                    <div>
                      <span>Sisa hari</span>
                      <strong>{formatNumber(Math.max(0, plan.dueDay - game.elapsedDays), 0)}</strong>
                    </div>
                  </div>
                  <p className={styles.itemDescription}>Tekan kartu untuk membuka full frame detail plan pendirian perusahaan.</p>
                </article>
              </GameButton>
            ))}
            {communityPlans.map((plan) => (
              <article key={plan.id} className={styles.companyCard}>
                <div className={styles.itemTop}>
                  <div>
                    <p className={styles.itemLabel}>Open Market Plan</p>
                    <h3>{plan.companyName}</h3>
                  </div>
                  <span className={styles.costPill}>{plan.status}</span>
                </div>
                <div className={styles.infoRowCompact}>
                  <div>
                    <span>Field</span>
                    <strong>{getCompanyFieldLabel(plan.field)}{plan.field === 'software' ? ` · ${getSoftwareSpecializationLabel(plan.softwareSpecialization)}` : ''}</strong>
                  </div>
                  <div>
                    <span>Capital</span>
                    <strong>{formatCurrencyCompact(plan.pledgedCapital, 2)}</strong>
                  </div>
                  <div>
                    <span>Investors</span>
                    <strong>{formatNumber(plan.investorIds.length)}</strong>
                  </div>
                  <div>
                    <span>Kompetitor target</span>
                    <strong>{plan.competesWith}</strong>
                  </div>
                </div>
                {plan.status === 'funding' ? (
                  <div className={styles.actionRow}>
                    <GameButton type="button" className={styles.secondaryButton} onClick={() => game && setGame(investInCommunityPlan(game, game.player.id, plan.id, clamp(game.player.cash * 0.04, MIN_TRADE_AMOUNT, game.player.cash)))}>
                      Invest 4% cash
                    </GameButton>
                  </div>
                ) : null}
              </article>
            ))}
            {companyCards.map(({ company, playerOwnership, sharePrice, companyValue }) => (
              <GameButton key={company.key} type="button" className={styles.companyCardButton} onClick={() => openCompanyDetail(company.key, 'companies')}>
                <article className={styles.companyCard}>
                  <div className={styles.itemTop}>
                    <div>
                      <p className={styles.itemLabel}>{company.focus}</p>
                      <h3>{company.name}</h3>
                    </div>
                    <span className={styles.costPill}>{formatCurrencyCompact(sharePrice, 2)} / share</span>
                  </div>
                  <div className={styles.infoRowCompact}>
                    <div>
                      <span>CEO</span>
                      <strong>{company.ceoName}</strong>
                    </div>
                    <div>
                      <span>Value</span>
                      <strong>{formatCurrencyCompact(companyValue, 2)}</strong>
                    </div>
                    <div>
                      <span>Kepemilikanmu</span>
                      <strong>{formatNumber(playerOwnership, 1)}%</strong>
                    </div>
                    <div>
                      <span>Market cap</span>
                      <strong>{formatCurrencyCompact(getSharePrice(company) * company.sharesOutstanding, 2)}</strong>
                    </div>
                    <div>
                      <span>Exec seats</span>
                      <strong>{formatNumber(EXECUTIVE_ROLES.filter((role) => company.executives[role]).length)}</strong>
                    </div>
                  </div>
                  <p className={styles.itemDescription}>Pantau board, investor, dan trade live.</p>
                </article>
              </GameButton>
            ))}
          </div>
        </GameScreenFrame>
      ) : null}
      {isInvestorFrameOpen ? (
        <GameScreenFrame
          open
          ariaLabel="Daftar investor"
          frameName="Investor list"
          subtitle={`${game.companies[investorFrameCompanyKey].name} ownership board`}
          onClose={() => setIsInvestorFrameOpen(false)}
          backLabel="Kembali ke halaman utama"
        >
          <div className={styles.quickGrid}>
            {COMPANY_KEYS.filter((company) => game.companies[company].isEstablished).map((company) => (
              <GameButton key={company} type="button" className={investorFrameCompanyKey === company ? styles.quickButtonActive : styles.quickButton} onClick={() => setInvestorFrameCompanyKey(company)}>
                {game.companies[company].name}
              </GameButton>
            ))}
          </div>

          <div className={styles.memoCard}>
            <p className={styles.panelTag}>Urutan investor</p>
            <p>Jual saham besar bisa langsung menggoyang kursi CEO.</p>
          </div>

          <GameCardSurface as="section" className={styles.panel}>
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
                  <p className={styles.itemDescription}>Saham {formatNumber(entry.shares, 2)} · Nilai {formatCurrencyCompact(entry.amount, 2)} · {game.companies[investorFrameCompanyKey].ceoId === entry.investorId ? 'CEO aktif.' : 'Investor aktif.'}</p>
                </article>
              ))}
            </div>
          </GameCardSurface>
        </GameScreenFrame>
      ) : null}
      {isNewsFrameOpen ? (
        <GameScreenFrame
          open
          ariaLabel="News frame"
          frameName="News"
          subtitle={`5 berita terbaru pasar ${productLabel}`}
          onClose={() => setIsNewsFrameOpen(false)}
          backLabel="Kembali dari news"
        >
          <div className={styles.quickGrid}>
            <GameButton type="button" className={newsCompanyFilter === 'all' ? styles.quickButtonActive : styles.quickButton} onClick={() => setNewsCompanyFilter('all')}>
              Semua
            </GameButton>
            {COMPANY_KEYS.map((companyKey) => (
              <GameButton key={companyKey} type="button" className={newsCompanyFilter === companyKey ? styles.quickButtonActive : styles.quickButton} onClick={() => setNewsCompanyFilter(companyKey)}>
                {game.companies[companyKey].name}
              </GameButton>
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
        </GameScreenFrame>
      ) : null}
      {isForbesFrameOpen ? (
        <GameScreenFrame
          open
          ariaLabel="Forbes ranking frame"
          frameName="Forbes Ranking"
          subtitle="Nama · Wealth · Company name"
          onClose={() => setIsForbesFrameOpen(false)}
          backLabel="Kembali dari forbes"
        >
          <div className={styles.rankingFilterRow}>
            <GameButton
              type="button"
              className={forbesCategory === 'individual' ? styles.rankingFilterButtonActive : styles.rankingFilterButton}
              onClick={() => setForbesCategory('individual')}
            >
              Individual
            </GameButton>
            <GameButton
              type="button"
              className={forbesCategory === 'business' ? styles.rankingFilterButtonActive : styles.rankingFilterButton}
              onClick={() => setForbesCategory('business')}
            >
              Business
            </GameButton>
          </div>
          {forbesCategory === 'individual' ? (
            <div className={styles.forbesList}>
              {forbesIndividualList.map((entry, index) => (
                <article key={entry.investorId} className={styles.forbesCard}>
                  <p className={styles.forbesRank}>#{index + 1}</p>
                  <p className={styles.forbesName}>{entry.name}</p>
                  <p className={styles.forbesWealth}>{formatMoneyCompact(entry.wealth, 2)}</p>
                  <p className={styles.forbesCompanies}>{entry.companyNames.length ? entry.companyNames.join(', ') : '-'}</p>
                </article>
              ))}
            </div>
          ) : (
            <div className={styles.forbesList}>
              {forbesBusinessList.map((entry, index) => (
                <article key={entry.companyKey} className={styles.forbesBusinessCard}>
                  <p className={styles.forbesRank}>#{index + 1}</p>
                  <div className={styles.forbesBusinessMain}>
                    <p className={styles.forbesName}>{entry.name}</p>
                    <div className={styles.forbesBusinessLine}>
                      <p className={styles.forbesWealth}>{formatMoneyCompact(entry.valuation, 2)}</p>
                      <p className={styles.forbesBusinessCategory}>{entry.category}</p>
                    </div>
                    <p className={styles.forbesCompanies}>{formatNumber(entry.investorsCount)} Investors</p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </GameScreenFrame>
      ) : null}
      {isStatisticsFrameOpen && focusedCompany ? (
        <GameScreenFrame
          open
          ariaLabel={`Statistik ${focusedCompany.name}`}
          frameName="Company statistics"
          subtitle={focusedCompany.name}
          onClose={() => setIsStatisticsFrameOpen(false)}
          backLabel="Tutup statistik"
          overlayClassName={styles.statisticsOverlay}
        >
              <div className={styles.statisticsSwitchRow}>
                {statisticsTabConfig.map((option) => (
                  <GameButton
                    key={option.key}
                    type="button"
                    className={statisticsTab === option.key ? styles.rankingFilterButtonActive : styles.rankingFilterButton}
                    onClick={() => setStatisticsTab(option.key)}
                  >
                    {option.label}
                  </GameButton>
                ))}
              </div>
              <article className={styles.statisticsCard}>
                <p className={styles.panelTag}>{activeStatisticsConfig?.label}</p>
                <h3 className={styles.statisticsTitle}>{activeStatisticsConfig?.title}</h3>
                <ReusablePieDiagram title={activeStatisticsConfig?.title ?? 'Diagram statistik'} slices={activeStatisticsConfig?.slices ?? []} />
              </article>
        </GameScreenFrame>
      ) : null}
      {isDecisionFrameOpen && focusedCompany && focusedPlayerCanUseDecision ? (
        <GameScreenFrame
          open
          ariaLabel={`Decision ${focusedCompany.name}`}
          frameName="Decision"
          subtitle={`${focusedCompany.name} board actions`}
          onClose={() => setIsDecisionFrameOpen(false)}
          backLabel="Tutup decision"
          overlayClassName={styles.statisticsOverlay}
        >
              <div className={styles.quickGrid}>
                {([
                  { key: 'invest', label: 'Invest' },
                  { key: 'withdraw', label: 'Withdraw' },
                  { key: 'appoint', label: 'Nominate Exec' },
                  { key: 'dismiss', label: 'Dismiss Exec' },
                  { key: 'payout-up', label: 'Raise Payout' },
                  { key: 'payout-down', label: 'Lower Payout' },
                ] as Array<{ key: DecisionMode; label: string }>).map((entry) => (
                  <GameButton key={entry.key} type="button" className={decisionMode === entry.key ? styles.quickButtonActive : styles.quickButton} onClick={() => setDecisionMode(entry.key)}>
                    {entry.label}
                  </GameButton>
                ))}
              </div>

              {(decisionMode === 'invest' || decisionMode === 'withdraw') ? (
                <article className={styles.sliderCard}>
                  <div className={styles.itemTop}>
                    <div>
                      <p className={styles.itemLabel}>Options bar</p>
                      <h3>{decisionMode === 'invest' ? 'Invest in specific company' : 'Withdraw investment exposure'}</h3>
                    </div>
                  </div>
                  <div className={styles.quickGrid}>
                    {COMPANY_KEYS.filter((key) => key !== focusedCompany.key && game.companies[key].isEstablished).map((key) => (
                      <GameButton key={key} type="button" className={decisionTargetCompanyKey === key ? styles.quickButtonActive : styles.quickButton} onClick={() => setDecisionTargetCompanyKey(key)}>
                        {game.companies[key].name}
                      </GameButton>
                    ))}
                  </div>
                  <div className={styles.sliderLabels}>
                    <span>Alokasi proposal {formatNumber(decisionAmountPercent)}%</span>
                    <span>{decisionMode === 'invest' ? `$${formatMoneyCompact(focusedCompany.cash * decisionAmountPercent / 100, 2)}` : `$${formatMoneyCompact(focusedCompany.portfolioValue * decisionAmountPercent / 100, 2)}`}</span>
                  </div>
                  <input className={styles.slider} type="range" min={4} max={40} step={1} value={decisionAmountPercent} onChange={(event) => setDecisionAmountPercent(Number(event.target.value))} aria-label="Persentase nominal decision" />
                </article>
              ) : null}

              {(decisionMode === 'appoint' || decisionMode === 'dismiss') ? (
                <article className={styles.panel}>
                  <div className={styles.panelBody}>
                    <div className={styles.quickGrid}>
                      {EXECUTIVE_ROLES.map((role) => (
                        <GameButton key={role} type="button" className={decisionRole === role ? styles.quickButtonActive : styles.quickButton} onClick={() => setDecisionRole(role)}>
                          {EXECUTIVE_ROLE_META[role].title}
                        </GameButton>
                      ))}
                    </div>
                    {decisionMode === 'appoint' ? (
                      <div className={styles.quickGrid}>
                        {focusedExecutiveCandidatePool.map((candidateId) => (
                          <GameButton key={candidateId} type="button" className={decisionNomineeId === candidateId ? styles.quickButtonActive : styles.quickButton} onClick={() => setDecisionNomineeId(candidateId)}>
                            {investorDisplayName(game, candidateId)}
                          </GameButton>
                        ))}
                      </div>
                    ) : (
                      <div className={styles.memoCard}>
                        <p className={styles.panelTag}>Executive seat</p>
                        <p>{focusedCompany.executives[decisionRole]?.occupantName ?? `Kursi ${EXECUTIVE_ROLE_META[decisionRole].title} masih kosong.`}</p>
                      </div>
                    )}
                  </div>
                </article>
              ) : null}

              <div className={styles.memoCard}>
                <p className={styles.panelTag}>Policy</p>
                <p>Semua proposal dari panel Decision langsung memicu Board voting popup dan dikecualikan dari limit voting bulanan.</p>
              </div>
              <GameButton type="button" className={styles.primaryButton} onClick={submitDecision}>
                Submit to Board Voting
              </GameButton>
        </GameScreenFrame>
      ) : null}
      {isGameLicenseFrameOpen && focusedCompany && focusedPlayerIsGameExecutive ? (
        <GameScreenFrame
          open
          ariaLabel="Game license frame"
          frameName="License"
          subtitle={`${focusedCompany.name} · AppStore contracts`}
          onClose={() => setIsGameLicenseFrameOpen(false)}
          backLabel="Tutup lisensi"
          overlayClassName={styles.statisticsOverlay}
        >
              <div className={styles.memoCard}>
                <p className={styles.panelTag}>Policy</p>
                <p>Bisa apply ke AppStore yang belum melisensikan game kamu kapan saja. Jika ditolak, apply ulang tersedia setelah 30 hari.</p>
              </div>
              <div className={styles.panelList}>
                {focusedGameLicenseMatrix.map((entry) => (
                  <article key={entry.store.key} className={styles.itemCard}>
                    <div className={styles.itemTop}>
                      <div>
                        <p className={styles.itemLabel}>AppStore</p>
                        <h3>{entry.store.name}</h3>
                      </div>
                      <span className={styles.costPill}>
                        {entry.latest ? entry.latest.status.toUpperCase() : 'NEW'}
                      </span>
                    </div>
                    <p className={styles.itemDescription}>
                      {entry.latest?.status === 'approved'
                        ? `Sudah licensed · rev share ${formatNumber(entry.latest.revenueShare * 100, 1)}%`
                        : entry.latest?.status === 'pending'
                          ? 'Menunggu keputusan CEO AppStore.'
                          : entry.latest?.status === 'rejected'
                            ? `Rejected · bisa apply lagi ${formatNumber(entry.cooldownDaysLeft, 0)} hari lagi.`
                            : 'Belum pernah apply.'}
                    </p>
                    <GameButton
                      type="button"
                      className={styles.secondaryButton}
                      onClick={() => submitGameLicenseRequest(focusedCompany.key, entry.store.key)}
                      disabled={!entry.canApply}
                    >
                      {entry.canApply ? 'Apply License' : 'Cooldown aktif'}
                    </GameButton>
                  </article>
                ))}
              </div>
        </GameScreenFrame>
      ) : null}
      {isLicenseDeskOpen && isMonthlyLicenseWindow && pendingPlayerLicenseRequests.length > 0 && game ? (
        <GameDialog
          open
          ariaLabel="AppStore license desk"
          eyebrow="License & Permission"
          title={`${game.companies[pendingPlayerLicenseRequests[0].softwareCompanyKey].name} AppStore`}
          dismissOnOverlay={false}
        >
              <div className={styles.memoCard}>
                <p className={styles.panelTag}>Pemohon</p>
                <p>{game.companies[pendingPlayerLicenseRequests[0].gameCompanyKey].name} meminta izin distribusi game di AppStore kamu.</p>
                <p className={styles.itemDescription}>Batch ini muncul pada jendela submission bulanan.</p>
              </div>
              <div className={styles.infoRow}>
                <div>
                  <span>Revenue share store</span>
                  <strong>{formatNumber(pendingPlayerLicenseRequests[0].revenueShare * 100, 1)}%</strong>
                </div>
                <div>
                  <span>Requested day</span>
                  <strong>{formatDateFromDays(pendingPlayerLicenseRequests[0].requestedDay)}</strong>
                </div>
              </div>
              <div className={styles.actionRow}>
                <GameButton type="button" className={styles.secondaryButton} onClick={() => processPlayerLicenseRequest(pendingPlayerLicenseRequests[0].id, 'approved')}>
                  Approve License
                </GameButton>
                <GameButton type="button" className={styles.ghostButton} onClick={() => processPlayerLicenseRequest(pendingPlayerLicenseRequests[0].id, 'rejected')}>
                  Reject
                </GameButton>
                <GameButton type="button" className={styles.quickButton} onClick={() => setIsLicenseDeskOpen(false)}>
                  Close desk
                </GameButton>
              </div>
        </GameDialog>
      ) : null}
      {activePlayerBoardVote ? (
        <GameDialog
          open
          ariaLabel="Voting dewan direksi"
          eyebrow="Board voting (3 hari)"
          title={activePlayerBoardVote.company.name}
          dismissOnOverlay={false}
        >
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
                  <span>Total vote masuk</span>
                  <strong>{formatNumber(activePlayerBoardVoteMeta?.totalVotesCast ?? 0)} / {formatNumber(activePlayerBoardVoteMeta?.totalVoters ?? 0)} anggota</strong>
                </div>
                <div>
                  <span>Vote AI masuk</span>
                  <strong>{formatNumber(activePlayerBoardVoteMeta?.aiVotesCast ?? 0)} / {formatNumber(activePlayerBoardVoteMeta?.aiTotalVoters ?? 0)} anggota</strong>
                </div>
                <div>
                  <span>Setuju</span>
                  <strong>{formatNumber(activePlayerBoardVote.vote.yesWeight, 2)} bobot</strong>
                </div>
                <div>
                  <span>Tidak setuju</span>
                  <strong>{formatNumber(activePlayerBoardVote.vote.noWeight, 2)} bobot</strong>
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
                {activePlayerBoardVoteMeta && !activePlayerBoardVoteMeta.playerCanVote ? (
                  <p className={styles.itemDescription}>
                    Tunggu semua direktur AI selesai voting dulu. Kamu akan voting terakhir setelah total suara AI terkumpul.
                  </p>
                ) : null}
              </div>
              <div className={styles.actionRow}>
                <GameButton
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => castPlayerBoardVote(activePlayerBoardVote.companyKey, 'yes')}
                  disabled={game.elapsedDays > activePlayerBoardVote.vote.endDay || !activePlayerBoardVoteMeta?.playerCanVote}
                >
                  Setuju
                </GameButton>
                <GameButton
                  type="button"
                  className={styles.ghostButton}
                  onClick={() => castPlayerBoardVote(activePlayerBoardVote.companyKey, 'no')}
                  disabled={game.elapsedDays > activePlayerBoardVote.vote.endDay || !activePlayerBoardVoteMeta?.playerCanVote}
                >
                  Tolak
                </GameButton>
              </div>
        </GameDialog>
      ) : null}
      {focusedPlan && game ? (
        <GameScreenFrame
          open
          ariaLabel={`Detail plan pendirian ${focusedPlan.companyName}`}
          frameName="Company Establishment Plan"
          subtitle={`${focusedPlan.companyName} full frame`}
          onClose={() => setFocusedPlanKey(null)}
          backLabel="Tutup detail plan"
        >
              <div className={styles.infoRow}>
                <div>
                  <span>Company Name</span>
                  <strong>{focusedPlan.companyName}</strong>
                </div>
                <div>
                  <span>Capital</span>
                  <strong>{formatCurrencyCompact(focusedPlan.pledgedCapital, 2)}</strong>
                </div>
                <div>
                  <span>Target Capital</span>
                  <strong>{formatCurrencyCompact(focusedPlan.targetCapital, 2)}</strong>
                </div>
                <div>
                  <span>Number of Investors</span>
                  <strong>{formatNumber(new Set(focusedPlan.pledges.map((pledge) => pledge.investorId)).size)}</strong>
                </div>
                <div>
                  <span>Sisa hari listing plan</span>
                  <strong>{formatNumber(Math.max(0, focusedPlan.dueDay - game.elapsedDays), 0)} hari</strong>
                </div>
                {focusedPlan.field === 'software' ? (
                  <div>
                    <span>Software focus</span>
                    <strong>{getSoftwareSpecializationLabel(focusedPlan.softwareSpecialization)}</strong>
                  </div>
                ) : null}
              </div>
              <div className={styles.memoCard}>
                <p className={styles.panelTag}>Tujuan plan</p>
                <p>
                  Plan ini dirancang untuk meyakinkan investor agar perusahaan lahir dengan modal kuat, bukan mulai dari kondisi miskin.
                  Setelah masa listing 1 bulan selesai, plan akan otomatis membentuk perusahaan.
                </p>
              </div>
              <div className={styles.actionRow}>
                <GameButton type="button" className={styles.secondaryButton} onClick={() => investInPlan(focusedPlan.companyKey, 0.08)} disabled={focusedPlan.isEstablished}>
                  Invest 8% cash
                </GameButton>
                <GameButton type="button" className={styles.primaryButton} onClick={() => investInPlan(focusedPlan.companyKey, 0.2)} disabled={focusedPlan.isEstablished}>
                  Invest 20% cash
                </GameButton>
              </div>
        </GameScreenFrame>
      ) : null}
      {focusedCompany && game ? (
        <GameScreenFrame
          open
          ariaLabel={`Detail perusahaan ${focusedCompany.name}`}
          frameName="Company detail"
          subtitle={`${focusedCompany.name} full frame`}
          onClose={closeCompanyDetail}
          backLabel="Kembali ke daftar perusahaan"
        >
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
                    <span>{productLabel} score</span>
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
                  {focusedCompany.field === 'software' ? (
                    <div>
                      <span>Software focus</span>
                      <strong>{getSoftwareSpecializationLabel(focusedCompany.softwareSpecialization)}</strong>
                    </div>
                  ) : null}
                </div>
                <div className={styles.actionRow}>
                  <GameButton type="button" className={styles.ghostButton} onClick={closeCompanyDetail}>
                    Go back
                  </GameButton>
                  <GameButton type="button" className={styles.secondaryButton} onClick={() => { switchCompany(focusedCompany.key); setInvestmentDraft((current) => ({ ...current, company: focusedCompany.key })); closeTransientLayers(); setIsInvestmentMenuOpen(true); }}>
                    Beli / jual saham
                  </GameButton>
                  <GameButton type="button" className={styles.primaryButton} onClick={() => { switchCompany(focusedCompany.key); closeTransientLayers(); setIsReleaseMenuOpen(true); }} disabled={!focusedCanReleaseCpu}>
                    {focusedCanReleaseCpu ? `Release ${productLabel}` : 'Butuh CEO/CTO/CMO'}
                  </GameButton>
                  <GameButton type="button" className={styles.ghostButton} onClick={() => openInvestorFrame(focusedCompany.key)}>
                    Investor list
                  </GameButton>
                </div>
              </div>

              <section className={styles.panel}>
                <GameButton type="button" className={styles.panelToggle} onClick={() => toggleCompanyDetailPanel('overview')}>
                  <div>
                    <p className={styles.panelTag}>Overview</p>
                    <h2>{(focusedIsGameField || focusedIsSoftwareField) ? 'Company Overview' : 'Kondisi perusahaan'}</h2>
                  </div>
                  <span>{companyDetailPanels.overview ? 'Tutup' : 'Buka'}</span>
                </GameButton>
                {companyDetailPanels.overview ? (
                  <div className={`${styles.panelBody} ${styles.overviewCompactBody}`}>
                    <div className={`${styles.infoRow} ${styles.overviewCompactGrid}`}>
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
                      {focusedCompany.field === 'game' ? (
                        <div>
                          <span>AppStore passive/day</span>
                          <strong>$ {formatMoneyCompact(focusedCompany.appStorePassiveIncomePerDay, 2)} · {formatNumber(focusedCompany.appStoreDownloadsPerDay, 1)} dl/day</strong>
                        </div>
                      ) : null}
                      <div>
                        <span>Harga saham</span>
                        <strong>{formatCurrencyCompact(getSharePrice(focusedCompany), 2)}</strong>
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
                        <strong>{formatCurrencyCompact(getCompanyValuation(focusedCompany) / focusedCompany.sharesOutstanding, 2)}</strong>
                      </div>
                      <div>
                        <span>Capital strain</span>
                        <strong>$ {formatMoneyCompact(focusedCompany.capitalStrain, 2)}</strong>
                      </div>
                      <div>
                        <span>Renderer path</span>
                        <strong>{rendererMode}</strong>
                      </div>
                    </div>
                    <div className={styles.actionRow}>
                      <GameButton type="button" className={styles.slimActionButton} onClick={() => setIsStatisticsFrameOpen(true)}>
                        Open Statistics
                      </GameButton>
                      {focusedPlayerCanUseDecision ? (
                        <GameButton type="button" className={styles.slimActionButton} onClick={() => setIsDecisionFrameOpen(true)}>
                          Decision
                        </GameButton>
                      ) : null}
                      {focusedPlayerIsGameExecutive && availableAppStoreCompanies.length > 0 ? (
                        <GameButton type="button" className={styles.slimActionButton} onClick={() => setIsGameLicenseFrameOpen(true)}>
                          License
                        </GameButton>
                      ) : null}
                    </div>
                    <div className={styles.memoCard}>
                      <p className={styles.panelTag}>{focusedIsSoftwareField ? 'Company vision & tech stack' : 'Memo terbaru'}</p>
                      <p>
                        {focusedIsSoftwareField
                          ? `${focusedCompany.name} fokus membangun platform ${getSoftwareSpecializationLabel(focusedCompany.softwareSpecialization)} dengan stack cloud-native, observability real-time, dan delivery pipeline yang berorientasi zero-downtime release.`
                          : focusedCompany.lastRelease}
                      </p>
                    </div>
                  </div>
                ) : null}
              </section>

              <section className={styles.panel}>
                <GameButton type="button" className={styles.panelToggle} onClick={() => toggleCompanyDetailPanel('governance')}>
                  <div>
                    <p className={styles.panelTag}>{focusedIsSoftwareField ? 'Board' : 'Governance'}</p>
                    <h2>{(focusedIsGameField || focusedIsSoftwareField) ? 'Board of Directors' : 'Dewan direksi ala dunia nyata'}</h2>
                  </div>
                  <span>{companyDetailPanels.governance ? 'Tutup' : 'Buka'}</span>
                </GameButton>
                {companyDetailPanels.governance ? (
                  <div className={styles.panelList}>
                    <div className={styles.memoCard}>
                      <p className={styles.panelTag}>Board system</p>
                      <p>7 kursi dewan memilih CEO dari performa dan ownership, lalu ikut menekan/usul struktur COO, CFO, CTO, dan CMO bila perusahaan membutuhkannya.</p>
                    </div>
                    {focusedIsSoftwareField ? (
                      <div className={styles.memoCard}>
                        <p className={styles.panelTag}>Interactive leadership profiles</p>
                        <p>Profil direksi software memperlihatkan fokus keputusan: platform scale, product reliability, dan governance terhadap siklus release mingguan.</p>
                      </div>
                    ) : null}
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
                          <span className={styles.costPill}>{focusedIsSoftwareField ? 'Leadership Profile' : 'Vote'} {formatNumber(member.voteWeight, 1)}</span>
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
                <GameButton type="button" className={styles.panelToggle} onClick={() => toggleCompanyDetailPanel('management')}>
                  <div>
                    <p className={styles.panelTag}>Management</p>
                    <h2>{(focusedIsGameField || focusedIsSoftwareField) ? 'Executive Management' : 'CEO & jabatan eksekutif opsional'}</h2>
                  </div>
                  <span>{companyDetailPanels.management ? 'Tutup' : 'Buka'}</span>
                </GameButton>
                {companyDetailPanels.management ? (
                  <div className={styles.panelList}>
                    <div className={styles.memoCard}>
                      <p className={styles.panelTag}>Executive pulse</p>
                      <p>{focusedCompany.executivePulse}</p>
                    </div>
                    <div className={styles.infoRow}>
                      <div>
                        <span>Payroll eksekutif</span>
                        <strong>{formatCurrencyCompact(focusedCompany.executivePayrollPerDay, 2)}/hari</strong>
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
                              <GameButton type="button" className={styles.secondaryButton} onClick={() => rotateExecutiveAppointment(focusedCompany.key, role)}>
                                {executive ? 'Rotasi kandidat' : 'Tunjuk kandidat'}
                              </GameButton>
                              <GameButton type="button" className={styles.ghostButton} onClick={() => clearExecutiveAppointment(focusedCompany.key, role)} disabled={!executive}>
                                Kosongkan kursi
                              </GameButton>
                            </div>
                          ) : null}
                        </article>
                      );
                    })}

                    <div className={styles.actionRow}>
                      <GameButton type="button" className={styles.secondaryButton} onClick={() => adjustPayoutBias('down', focusedCompany.key)} disabled={!focusedCanManageFinance}>
                        {focusedCanManageFinance ? 'Turunkan payout' : 'Butuh CEO/CFO'}
                      </GameButton>
                      <GameButton type="button" className={styles.ghostButton} onClick={() => adjustPayoutBias('up', focusedCompany.key)} disabled={!focusedCanManageFinance}>
                        {focusedCanManageFinance ? 'Naikkan payout' : 'Butuh CEO/CFO'}
                      </GameButton>
                    </div>
                  </div>
                ) : null}
              </section>

              <section className={styles.panel}>
                <GameButton type="button" className={styles.panelToggle} onClick={() => toggleCompanyDetailPanel('ownership')}>
                  <div>
                    <p className={styles.panelTag}>Ownership</p>
                    <h2>{(focusedIsGameField || focusedIsSoftwareField) ? 'Ownership & CEO Control' : 'Investor & kendali CEO'}</h2>
                  </div>
                  <span>{companyDetailPanels.ownership ? 'Tutup' : 'Buka'}</span>
                </GameButton>
                {companyDetailPanels.ownership ? (
                  <div className={styles.panelList}>
                    <article className={styles.itemCard}>
                      <div className={styles.itemTop}>
                        <div>
                          <p className={styles.itemLabel}>Share sheets system</p>
                          <h3>{formatNumber(focusedCompany.sharesOutstanding, 2)} sheets</h3>
                        </div>
                        <span className={styles.costPill}>
                          Circulating {formatNumber(Math.max(0, focusedCompany.sharesOutstanding - focusedCompany.marketPoolShares), 2)}
                        </span>
                      </div>
                      <p className={styles.itemDescription}>
                        Opsi: 100 / 500 / 1000. Hanya CEO aktif yang boleh mengganti. Cooldown perubahan {formatNumber(SHARE_SHEET_COOLDOWN_DAYS)} hari.
                        Turun jumlah sheets hanya valid jika treasury (market pool) cukup untuk menutup selisih.
                      </p>
                      <div className={styles.quickGrid}>
                        {SHARE_SHEET_OPTIONS.map((option) => (
                          <GameButton
                            key={option}
                            type="button"
                            className={focusedCompany.sharesOutstanding === option ? styles.quickButtonActive : styles.quickButton}
                            disabled={!focusedPlayerIsCeo || focusedCompany.sharesOutstanding === option}
                            onClick={() => updateShareSheetOption(focusedCompany.key, option)}
                          >
                            {formatNumber(option)} sheets
                          </GameButton>
                        ))}
                      </div>
                    </article>

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
                            <GameButton
                              key={multiplier}
                              type="button"
                              className={(shareListingDraft.company === focusedCompany.key ? shareListingDraft.priceMultiplier : 2) === multiplier ? styles.quickButtonActive : styles.quickButton}
                              onClick={() => setShareListingDraft((current) => ({ ...current, company: focusedCompany.key, priceMultiplier: multiplier }))}
                            >
                              {multiplier}x normal
                            </GameButton>
                          ))}
                        </div>
                        <div className={styles.actionRow}>
                          <GameButton type="button" className={styles.secondaryButton} onClick={() => openPlayerShareListing(focusedCompany.key)}>
                            Buka saham
                          </GameButton>
                          <GameButton type="button" className={styles.ghostButton} onClick={() => cancelPlayerShareListing(focusedCompany.key)} disabled={!focusedPlayerListing}>
                            Tutup listing
                          </GameButton>
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
                          <p className={styles.itemDescription}>Saham {formatNumber(shares, 2)} · Nilai {formatCurrencyCompact(shares * getSharePrice(focusedCompany), 2)}.</p>
                        </article>
                      ))}
                  </div>
                ) : null}
              </section>

              <section className={styles.panel}>
                <GameButton type="button" className={styles.panelToggle} onClick={() => toggleCompanyDetailPanel('operations')}>
                  <div>
                    <p className={styles.panelTag}>Operations</p>
                    <h2>{focusedIsGameField ? 'Game Studio Pipeline & tim' : focusedIsSoftwareField ? 'Company Operations' : `Upgrade ${productLabel} & tim`}</h2>
                  </div>
                  <span>{companyDetailPanels.operations ? 'Tutup' : 'Buka'}</span>
                </GameButton>
                {companyDetailPanels.operations ? (
                  focusedIsGameField ? (
                    <div className={styles.panelList}>
                      <article className={styles.memoCard}>
                        <p className={styles.panelTag}>Game Engine Upgrades</p>
                        <p>Arsitektur engine inti, optimasi render, dan cache performa untuk stabilitas gameplay live.</p>
                      </article>
                      {(Object.entries(focusedCompany.upgrades) as [UpgradeKey, UpgradeState][])
                        .filter(([key]) => key === 'architecture' || key === 'coreDesign' || key === 'cacheStack')
                        .map(([key, upgrade]) => {
                          const cost = getUpgradeCost(key, upgrade, focusedCompany);
                          return (
                            <article key={key} className={styles.itemCard}>
                              <div className={styles.itemTop}><strong>{upgrade.label}</strong><span className={styles.costPill}>{formatNumber(cost)} RP</span></div>
                              <p className={styles.itemDescription}>{upgrade.description}</p>
                              <GameButton type="button" className={styles.secondaryButton} onClick={() => improveUpgrade(key, focusedCompany.key)} disabled={!focusedCanManageTechnology || focusedCompany.research < cost}>
                                {!focusedCanManageTechnology ? 'CEO/CTO only' : focusedCompany.research >= cost ? 'Develop Feature' : 'RP kurang'}
                              </GameButton>
                            </article>
                          );
                        })}

                      <article className={styles.memoCard}>
                        <p className={styles.panelTag}>Game Technology Upgrades</p>
                        <p>Pipeline build, respons input, dan efisiensi runtime untuk kualitas experience pemain.</p>
                      </article>
                      {(Object.entries(focusedCompany.upgrades) as [UpgradeKey, UpgradeState][])
                        .filter(([key]) => key === 'lithography' || key === 'clockSpeed' || key === 'powerEfficiency')
                        .map(([key, upgrade]) => {
                          const cost = getUpgradeCost(key, upgrade, focusedCompany);
                          return (
                            <article key={key} className={styles.itemCard}>
                              <div className={styles.itemTop}><strong>{upgrade.label}</strong><span className={styles.costPill}>{formatNumber(cost)} RP</span></div>
                              <p className={styles.itemDescription}>{upgrade.description}</p>
                              <GameButton type="button" className={styles.secondaryButton} onClick={() => improveUpgrade(key, focusedCompany.key)} disabled={!focusedCanManageTechnology || focusedCompany.research < cost}>
                                {!focusedCanManageTechnology ? 'CEO/CTO only' : focusedCompany.research >= cost ? 'Develop Tech' : 'RP kurang'}
                              </GameButton>
                            </article>
                          );
                        })}

                      <article className={styles.memoCard}>
                        <p className={styles.panelTag}>Studio Building Management</p>
                        <p>Kelola kapasitas studio melalui perekrutan tim riset, marketing, dan operasi produksi.</p>
                      </article>
                      {(Object.entries(focusedCompany.teams) as [TeamKey, TeamState][]).map(([key, team]) => {
                        const cost = getTeamCost(team);
                        const isAllowed =
                          (
                            key === 'researchers'
                              ? focusedCanManageTechnology
                              : key === 'marketing'
                                ? Boolean(focusedCompany && game && hasCompanyAuthority(focusedCompany, game.player.id, 'marketing'))
                                : Boolean(focusedCompany && game && hasCompanyAuthority(focusedCompany, game.player.id, 'operations'))
                          )
                          && focusedCompany.cash >= cost;
                        return (
                          <article key={key} className={styles.itemCard}>
                            <div className={styles.itemTop}><strong>{team.label}</strong><span className={styles.costPill}>{formatCurrencyCompact(cost, 2)}</span></div>
                            <p className={styles.itemDescription}>{team.description}</p>
                            <GameButton type="button" className={styles.secondaryButton} onClick={() => hireTeam(key, focusedCompany.key)} disabled={!isAllowed}>
                              {isAllowed ? 'Scale Studio' : 'Syarat belum terpenuhi'}
                            </GameButton>
                          </article>
                        );
                      })}

                      <article className={styles.memoCard}>
                        <p className={styles.panelTag}>Monthly Marketing Fund Management</p>
                        <p>Kelola agresivitas belanja marketing bulanan melalui payout policy (lebih rendah payout = alokasi marketing lebih tinggi).</p>
                        <div className={styles.actionRow}>
                          <GameButton type="button" className={styles.secondaryButton} onClick={() => adjustPayoutBias('down', focusedCompany.key)} disabled={!focusedCanManageFinance}>
                            Naikkan Marketing Fund
                          </GameButton>
                          <GameButton type="button" className={styles.ghostButton} onClick={() => adjustPayoutBias('up', focusedCompany.key)} disabled={!focusedCanManageFinance}>
                            Turunkan Marketing Fund
                          </GameButton>
                        </div>
                      </article>
                    </div>
                  ) : focusedIsSoftwareField ? (
                    <div className={styles.panelList}>
                      <div className={styles.rankingFilterRow}>
                        <GameButton type="button" className={softwareUpgradeCategory === 'core' ? styles.rankingFilterButtonActive : styles.rankingFilterButton} onClick={() => setSoftwareUpgradeCategory('core')}>
                          Core
                        </GameButton>
                        <GameButton type="button" className={softwareUpgradeCategory === 'scale' ? styles.rankingFilterButtonActive : styles.rankingFilterButton} onClick={() => setSoftwareUpgradeCategory('scale')}>
                          Scale
                        </GameButton>
                        {focusedCompany.softwareSpecialization === 'app-store' ? (
                          <GameButton type="button" className={softwareUpgradeCategory === 'appstore' ? styles.rankingFilterButtonActive : styles.rankingFilterButton} onClick={() => setSoftwareUpgradeCategory('appstore')}>
                            AppStore
                          </GameButton>
                        ) : null}
                      </div>
                      {(softwareUpgradeCategory === 'core'
                        ? (Object.entries(focusedCompany.upgrades) as [UpgradeKey, UpgradeState][])
                          .filter(([key]) => key === 'architecture' || key === 'coreDesign' || key === 'cacheStack')
                        : softwareUpgradeCategory === 'scale'
                          ? (Object.entries(focusedCompany.upgrades) as [UpgradeKey, UpgradeState][])
                            .filter(([key]) => key === 'lithography' || key === 'clockSpeed' || key === 'powerEfficiency')
                          : []) .map(([key, upgrade]) => {
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
                            <GameButton type="button" className={styles.secondaryButton} onClick={() => improveUpgrade(key, focusedCompany.key)} disabled={!focusedCanManageTechnology || focusedCompany.research < cost}>
                              {!focusedCanManageTechnology ? 'CEO/CTO only' : focusedCompany.research >= cost ? 'Upgrade' : 'RP kurang'}
                            </GameButton>
                          </article>
                        );
                      })}
                      {softwareUpgradeCategory === 'appstore' && focusedCompany.softwareSpecialization === 'app-store' ? (
                        <>
                          {(['discovery', 'infrastructure', 'trust'] as const).map((specKey) => {
                            const value = focusedCompany.appStoreProfile[specKey];
                            const cost = Math.round(22 + value * 18);
                            return (
                              <article key={specKey} className={styles.itemCard}>
                                <div className={styles.itemTop}>
                                  <div>
                                    <p className={styles.itemLabel}>AppStore Spec</p>
                                    <h3>{specKey}</h3>
                                  </div>
                                  <span className={styles.costPill}>{formatNumber(cost)} RP</span>
                                </div>
                                <p className={styles.itemDescription}>Level {formatNumber(value, 2)} · Mempengaruhi download & popularitas partner game.</p>
                                <GameButton type="button" className={styles.secondaryButton} onClick={() => improveAppStoreProfile(specKey, focusedCompany.key)} disabled={!focusedCanManageTechnology || focusedCompany.research < cost}>
                                  {!focusedCanManageTechnology ? 'CEO/CTO only' : 'Upgrade AppStore'}
                                </GameButton>
                              </article>
                            );
                          })}
                        </>
                      ) : null}
                    </div>
                  ) : (
                    <div className={styles.panelList}>
                      <article className={styles.memoCard}>
                        <p className={styles.panelTag}>Semiconductor R&D Matrix</p>
                        <p>Mekanisme semiconductor: upgrade hanya bisa dieksekusi jika target RP tercapai, lalu tim fab/operations mengonversi riset menjadi output pasar.</p>
                      </article>
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
                            <GameButton type="button" className={styles.secondaryButton} onClick={() => improveUpgrade(key, focusedCompany.key)} disabled={!focusedCanManageTechnology || focusedCompany.research < cost}>
                              {!focusedCanManageTechnology ? 'CEO/CTO only' : focusedCompany.research >= cost ? 'Upgrade' : 'RP kurang'}
                            </GameButton>
                          </article>
                        );
                      })}

                      {(Object.entries(focusedCompany.teams) as [TeamKey, TeamState][]).map(([key, team]) => {
                        const cost = getTeamCost(team);
                        const isAllowed =
                          (
                            key === 'researchers'
                              ? focusedCanManageTechnology
                              : key === 'marketing'
                                ? Boolean(focusedCompany && game && hasCompanyAuthority(focusedCompany, game.player.id, 'marketing'))
                                : Boolean(focusedCompany && game && hasCompanyAuthority(focusedCompany, game.player.id, 'operations'))
                          )
                          && focusedCompany.cash >= cost;
                        return (
                          <article key={key} className={styles.itemCard}>
                            <div className={styles.itemTop}>
                              <div>
                                <p className={styles.itemLabel}>{team.label}</p>
                                <h3>{formatNumber(team.count)} aktif</h3>
                              </div>
                              <span className={styles.costPill}>{formatCurrencyCompact(cost, 2)}</span>
                            </div>
                            <p className={styles.itemDescription}>{team.description}</p>
                            <GameButton type="button" className={styles.secondaryButton} onClick={() => hireTeam(key, focusedCompany.key)} disabled={!isAllowed}>
                              {isAllowed ? 'Expand' : 'Syarat belum terpenuhi'}
                            </GameButton>
                          </article>
                        );
                      })}
                    </div>
                  )
                ) : null}
              </section>

              <section className={styles.panel}>
                <GameButton type="button" className={styles.panelToggle} onClick={() => toggleCompanyDetailPanel('intel')}>
                  <div>
                    <p className={styles.panelTag}>{focusedIsGameField ? 'Games' : focusedIsSoftwareField ? 'Software' : 'Intel'}</p>
                    <h2>{focusedIsGameField ? 'Games' : focusedIsSoftwareField ? 'Released Apps/Software' : 'Release & tekanan pasar'}</h2>
                  </div>
                  <span>{companyDetailPanels.intel ? 'Tutup' : 'Buka'}</span>
                </GameButton>
                {companyDetailPanels.intel ? (
                  (focusedIsGameField || focusedIsSoftwareField) ? (
                    <div className={styles.panelList}>
                      {focusedGameReleaseCards.map((entry, index) => (
                        <GameButton key={entry.id} type="button" className={styles.companyCardButton} onClick={() => { setSelectedGameReleaseId(entry.id); setSelectedGameCommunityId(null); }}>
                          <article className={styles.itemCard}>
                            <div className={styles.itemTop}>
                              <p className={styles.itemLabel}>{focusedIsSoftwareField ? `Released App/Software Card #${index + 1}` : `Game Name Card #${index + 1}`}</p>
                              <span className={styles.costPill}>{entry.releaseDate}</span>
                            </div>
                            <p className={styles.itemDescription}><strong>{entry.name}</strong> · {entry.genre} · Popularity {formatNumber(entry.popularity, 1)}%</p>
                            {focusedPlayerIsGameExecutive && availableAppStoreCompanies.length > 0 ? (
                              <div className={styles.actionRow}>
                                <GameButton
                                  type="button"
                                  className={styles.slimActionButton}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setIsGameLicenseFrameOpen(true);
                                  }}
                                >
                                  License
                                </GameButton>
                              </div>
                            ) : null}
                          </article>
                        </GameButton>
                      ))}
                    </div>
                  ) : (
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
                          <strong>{formatCurrencyCompact(getCompanyInvestmentTotal(focusedCompany), 2)}</strong>
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
                  )
                ) : null}
              </section>
        </GameScreenFrame>
      ) : null}
      {selectedGameRelease && focusedCompany ? (
        <GameScreenFrame
          open
          ariaLabel={`About the ${appStoreSelectedRelease ? 'Game' : focusedCompany.field === 'software' ? 'Product' : 'Game'} ${selectedGameRelease.name}`}
          frameName={appStoreSelectedRelease ? 'About the Game' : focusedCompany.field === 'software' ? 'About the Product' : 'About the Game'}
          subtitle={selectedGameRelease.name}
          onClose={() => { setSelectedGameReleaseId(null); setAppStoreSelectedRelease(null); }}
          backLabel="Back from about the game"
        >
              <div className={styles.memoCard}>
                <p className={styles.panelTag}>Brief Specifications</p>
                <p>Type: {selectedGameRelease.genre} · Release Date: {selectedGameRelease.releaseDate} · Popularity: {formatNumber(selectedGameRelease.popularity, 1)}%</p>
              </div>
              <div className={styles.panelList}>
                {selectedGameCommunities.map((community) => (
                  <GameButton key={community.id} type="button" className={styles.companyCardButton} onClick={() => setSelectedGameCommunityId(community.id)}>
                    <article className={styles.itemCard}>
                      <div className={styles.itemTop}>
                        <p className={styles.itemLabel}>Community</p>
                        <span className={styles.costPill}>Active</span>
                      </div>
                      <h3>{community.name}</h3>
                    </article>
                  </GameButton>
                ))}
              </div>
        </GameScreenFrame>
      ) : null}
      {selectedGameCommunity ? (
        <GameScreenFrame
          open
          ariaLabel={`About the Community ${selectedGameCommunity.name}`}
          frameName="About the Community"
          subtitle={selectedGameCommunity.name}
          onClose={() => setSelectedGameCommunityId(null)}
          backLabel="Back from community"
        >
              <GamePanelSection
                label="Panel"
                title={focusedCompany?.field === 'software' ? 'Apps and products in this community' : 'Games the community plays'}
                open={communityPanelOpen.games}
                onToggle={() => runViewTransition(() => uiSignalStoreRef.current.update((current) => ({
                  ...current,
                  communityPanelOpen: { ...current.communityPanelOpen, games: !current.communityPanelOpen.games },
                })))}
                bodyClassName={styles.panelList}
              >
                {selectedGameCommunity.games.map((gameName) => <article className={styles.itemCard} key={gameName}><p className={styles.itemDescription}>{gameName}</p></article>)}
              </GamePanelSection>
              <GamePanelSection
                label="Panel"
                title="Leadership"
                open={communityPanelOpen.leadership}
                onToggle={() => runViewTransition(() => uiSignalStoreRef.current.update((current) => ({
                  ...current,
                  communityPanelOpen: { ...current.communityPanelOpen, leadership: !current.communityPanelOpen.leadership },
                })))}
                bodyClassName={styles.infoRow}
              >
                <div><span>Owner</span><strong>{selectedGameCommunity.leadership.owner}</strong></div>
                <div><span>Co-Owner</span><strong>{selectedGameCommunity.leadership.coOwner}</strong></div>
                <div><span>Admin</span><strong>{selectedGameCommunity.leadership.admin}</strong></div>
                <div><span>Moderator</span><strong>{selectedGameCommunity.leadership.moderator}</strong></div>
                <div><span>Helper</span><strong>{selectedGameCommunity.leadership.helper}</strong></div>
              </GamePanelSection>
              <section className={styles.panel}>
                <GameButton
                  type="button"
                  className={styles.panelToggle}
                  onClick={() => runViewTransition(() => uiSignalStoreRef.current.update((current) => ({
                    ...current,
                    communityPanelOpen: { ...current.communityPanelOpen, social: !current.communityPanelOpen.social },
                  })))}
                >
                  <div><p className={styles.panelTag}>Panel</p><h2>Community Interface (#general)</h2></div>
                  <span>{communityPanelOpen.social ? 'Tutup' : 'Buka'}</span>
                </GameButton>
                {communityPanelOpen.social ? (
                  focusedCompany?.field === 'software' && focusedCompany.softwareSpecialization === 'app-store' ? (
                    <div className={styles.panelBody}>
                      <div className={styles.rankingFilterRow}>
                        <GameButton type="button" className={appStoreShelf === 'featured' ? styles.rankingFilterButtonActive : styles.rankingFilterButton} onClick={() => setAppStoreShelf('featured')}>
                          Featured
                        </GameButton>
                        <GameButton type="button" className={appStoreShelf === 'new' ? styles.rankingFilterButtonActive : styles.rankingFilterButton} onClick={() => setAppStoreShelf('new')}>
                          New
                        </GameButton>
                        <GameButton type="button" className={appStoreShelf === 'trending' ? styles.rankingFilterButtonActive : styles.rankingFilterButton} onClick={() => setAppStoreShelf('trending')}>
                          Trending
                        </GameButton>
                      </div>
                      <div className={`${styles.panelList} ${styles.appStoreShelfGrid}`}>
                        {visibleAppStoreListings.length > 0 ? visibleAppStoreListings.map((listing) => (
                          <GameButton
                            key={listing.id}
                            type="button"
                            className={styles.companyCardButton}
                            title={`${listing.gameName} · ${listing.studioName}`}
                            onClick={() => {
                              setAppStoreSelectedRelease(listing.releaseCard);
                            }}
                          >
                            <article className={styles.itemCard}>
                              <div className={styles.itemTop}>
                                <div className={styles.appIcon}>{listing.icon}</div>
                                <span className={styles.costPill}>{formatNumber(listing.monthlyDownloads, 0)} dl/mo</span>
                              </div>
                            </article>
                          </GameButton>
                        )) : (
                          <article className={styles.memoCard}>
                            <p className={styles.panelTag}>AppStore Engineering</p>
                            <p>Belum ada game berlisensi pada AppStore ini.</p>
                          </article>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className={styles.panelBody}>
                      <div className={styles.memoCard}>
                        <p className={styles.panelTag}>Discord-style container · #general</p>
                        {[...(selectedGameCommunity.messages ?? []), ...(communityChatMessages[selectedGameCommunity.id] ?? [])].map((message, index) => (
                          <p key={`${message}-${index}`} className={styles.kv}>• {message}</p>
                        ))}
                      </div>
                      <div className={styles.actionRow}>
                        <input className={styles.input} value={communityChatDraft} onChange={(event) => setCommunityChatDraft(event.target.value)} placeholder="Kirim pesan ke #general" />
                        <GameButton
                          type="button"
                          className={styles.secondaryButton}
                          onClick={() => {
                            if (!communityChatDraft.trim()) return;
                            setCommunityChatMessages((current) => ({
                              ...current,
                              [selectedGameCommunity.id]: [...(current[selectedGameCommunity.id] ?? []), `${game?.player.name ?? 'Player'}: ${communityChatDraft.trim()}`],
                            }));
                            setCommunityChatDraft('');
                          }}
                        >
                          Send
                        </GameButton>
                      </div>
                    </div>
                  )
                ) : null}
              </section>
        </GameScreenFrame>
      ) : null}
      {isInvestmentMenuOpen && game && investmentPreview ? (
        <GameDialog
          open
          ariaLabel="Investasi saham"
          eyebrow="Perdagangan saham"
          title="Beli atau jual saham realtime"
          onClose={() => setIsInvestmentMenuOpen(false)}
          closeLabel="Tutup menu investasi"
        >
              <div className={styles.quickGrid}>
                {COMPANY_KEYS.map((company) => (
                  <GameButton key={company} type="button" className={investmentDraft.company === company ? styles.quickButtonActive : styles.quickButton} onClick={() => setInvestmentDraft((current) => ({ ...current, company }))}>
                    {game.companies[company].name}
                  </GameButton>
                ))}
              </div>

              <div className={styles.quickGrid}>
                <GameButton type="button" className={investmentDraft.mode === 'buy' ? styles.quickButtonActive : styles.quickButton} onClick={() => setInvestmentDraft((current) => ({ ...current, mode: 'buy' }))}>
                  Buy
                </GameButton>
                <GameButton type="button" className={investmentDraft.mode === 'sell' ? styles.quickButtonActive : styles.quickButton} onClick={() => setInvestmentDraft((current) => ({ ...current, mode: 'sell' }))}>
                  Sell
                </GameButton>
                <GameButton type="button" className={styles.quickButton} onClick={() => setInvestmentDraft((current) => ({ ...current, sliderPercent: 50 }))}>
                  Reset
                </GameButton>
              </div>

              <div className={styles.quickGrid}>
                {(['auto', 'company', 'holders'] as TradeRoute[]).map((route) => (
                  <GameButton key={route} type="button" className={investmentDraft.route === route ? styles.quickButtonActive : styles.quickButton} onClick={() => setInvestmentDraft((current) => ({ ...current, route }))}>
                    {route === 'auto' ? 'Auto' : route === 'company' ? 'Perusahaan' : 'Holder'}
                  </GameButton>
                ))}
              </div>

              <div className={styles.sliderCard}>
                <div className={styles.sliderHeader}>
                  <div>
                    <p className={styles.panelTag}>Slider transaksi</p>
                    <strong>{formatCurrencyCompact(investmentPreview.grossTradeValue, 2)} · {formatNumber(investmentPreview.sharesMoved / game.companies[investmentDraft.company].sharesOutstanding * 100, 2)}%</strong>
                  </div>
                  <small>
                    {investmentDraft.mode === 'buy' ? 'Max buy' : 'Max sell'}: {formatCurrencyCompact(investmentPreview.maxTradeValue, 2)} · {investmentPreview.routeLabel}
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
                    : `${investmentDraft.mode === 'buy' ? 'Bayar' : 'Jual'} ${formatCurrencyCompact(Math.abs(investmentPreview.netCashDelta), 2)} untuk ${formatNumber(investmentPreview.sharesMoved, 2)} saham · fee ${formatNumber(investmentPreview.feeRate * 100, 1)}% · ${investmentPreview.counterpartyLabel}`}
                </p>
              </div>

              <div className={styles.releasePreview}>
                <div>
                  <span>1 saham realtime</span>
                  <strong>{formatCurrencyCompact(investmentPreview.sharePrice, 2)}</strong>
                </div>
                <div>
                  <span>Perusahaan</span>
                  <strong>{game.companies[investmentDraft.company].name}</strong>
                </div>
                <div>
                  <span>Nilai perusahaan</span>
                  <strong>{formatCurrencyCompact(investmentPreview.valuation, 2)}</strong>
                </div>
                <div>
                  <span>Ownership setelah transaksi</span>
                  <strong>{formatNumber(investmentPreview.futureOwnership, 2)}%</strong>
                </div>
                <div>
                  <span>Delta kas perusahaan</span>
                  <strong>{formatCurrencyCompact(investmentPreview.companyCashDelta, 2)}</strong>
                </div>
                <div>
                  <span>Delta nilai perusahaan</span>
                  <strong>{formatCurrencyCompact(investmentPreview.companyValueDelta, 2)}</strong>
                </div>
              </div>

              <GameButton type="button" className={styles.primaryButton} onClick={investInCompany} disabled={investmentPreview.grossTradeValue < MIN_TRADE_AMOUNT}>
                {investmentPreview.grossTradeValue < MIN_TRADE_AMOUNT
                  ? 'Nilai aktual terlalu kecil'
                  : investmentDraft.mode === 'sell' && investmentDraft.route === 'holders'
                    ? 'Gunakan Buka saham'
                  : investmentDraft.mode === 'buy'
                    ? 'Beli saham sekarang'
                    : 'Jual saham sekarang'}
              </GameButton>
        </GameDialog>
      ) : null}
      {isReleaseMenuOpen && activeCompany ? (
        <GameDialog
          open
          ariaLabel={`Release ${productLabel}`}
          eyebrow={`Release ${productLabel}`}
          title={`${activeCompany.name} launch studio`}
          onClose={() => setIsReleaseMenuOpen(false)}
          closeLabel={`Tutup menu release ${productLabelLower}`}
        >
              <label className={styles.field}>
                <span>Seri</span>
                <input value={releaseDraft.series} onChange={(event) => setReleaseDraft((current) => ({ ...current, series: event.target.value }))} placeholder="Contoh: Cosmic Prime" />
              </label>
              <label className={styles.field}>
                <span>Nama {productLabel}</span>
                <input value={releaseDraft.cpuName} onChange={(event) => setReleaseDraft((current) => ({ ...current, cpuName: event.target.value }))} placeholder={productLabel === 'Game' ? 'Contoh: Launch-02' : productLabel === 'Software' ? 'Contoh: SW-02' : 'Contoh: PX-02'} />
              </label>
              {activeCompany.field === 'game' ? (
                <div className={styles.field}>
                  <span>Release via AppStore</span>
                  <div className={styles.quickGrid}>
                    {activeApprovedReleaseStores.length > 0 ? activeApprovedReleaseStores.map((store) => (
                      <GameButton key={store.key} type="button" className={releaseStoreCompanyKey === store.key ? styles.quickButtonActive : styles.quickButton} onClick={() => setReleaseStoreCompanyKey(store.key)}>
                        {store.name}
                      </GameButton>
                    )) : (
                      <p className={styles.itemDescription}>Belum ada lisensi AppStore aktif. Gunakan tombol License lebih dulu.</p>
                    )}
                  </div>
                </div>
              ) : null}

              <div className={styles.sliderCard}>
                <div className={styles.sliderHeader}>
                  <div>
                    <p className={styles.panelTag}>Kategori harga</p>
                    <strong>{activePricePreset.label}</strong>
                  </div>
                  <small>{activePricePreset.subtitle}</small>
                </div>
                <input className={styles.slider} type="range" min="0" max={PRICE_PRESETS.length - 1} step="1" value={releaseDraft.priceIndex} onChange={(event) => setReleaseDraft((current) => ({ ...current, priceIndex: Number(event.target.value) }))} aria-label={`Slider kategori harga ${productLabelLower}`} />
                <div className={styles.sliderLabels}>
                  <span>Murah</span>
                  <span>Seimbang</span>
                  <span>Mahal</span>
                </div>
              </div>

              <div className={styles.releasePreview}>
                <div>
                  <span>Nama release</span>
                  <strong>{releaseDraft.series.trim() || 'Seri'} {releaseDraft.cpuName.trim() || `Nama ${productLabel}`}</strong>
                </div>
                <div>
                  <span>{activeCompany.field === 'game' ? 'Estimasi kas bersih (via AppStore)' : 'Estimasi laba'}</span>
                  <strong>
                    {formatCurrencyCompact(
                      (calculateLaunchRevenue(activeCpuScore, activeCompany.teams, activeCompany.marketShare, activeCompany.reputation, activePricePreset.factor)
                      * (activeReleaseRating?.salesMultiplier ?? 1))
                      * (activeCompany.field === 'game' ? 0.176 : 1),
                      2
                    )}
                  </strong>
                </div>
                <div>
                  <span>Rating konsumen</span>
                  <strong>{formatNumber(activeReleaseRating?.rating ?? 0, 1)} / 100</strong>
                </div>
              </div>

              <GameButton type="button" className={styles.primaryButton} onClick={launchCpu} disabled={activeCompany.field === 'game' && activeApprovedReleaseStores.length === 0}>
                Release {productLabel} sekarang
              </GameButton>
        </GameDialog>
      ) : null}
    </>
  );
*/
}

export type GameCommandDeckController = ReturnType<typeof useGameCommandDeckController>;
