'use client';

import { useEffect, useMemo, useState } from 'react';
import styles from './cpu-foundry-sim.module.css';

type UpgradeKey = 'architecture' | 'lithography' | 'clockSpeed' | 'coreDesign' | 'cacheStack' | 'powerEfficiency';
type TeamKey = 'researchers' | 'marketing' | 'fabrication';
type PanelKey = 'overview' | 'release' | 'research' | 'operations';

type UpgradeState = {
  label: string;
  shortLabel: string;
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

type Snapshot = {
  year: number;
  companyName: string;
  funds: number;
  research: number;
  marketShare: number;
  reputation: number;
  releaseCount: number;
  bestCpuScore: number;
  revenuePerSecond: number;
  researchPerSecond: number;
  upgrades: Record<UpgradeKey, UpgradeState>;
  teams: Record<TeamKey, TeamState>;
};

type ReleaseDraft = {
  series: string;
  cpuName: string;
  priceIndex: number;
};

const TICK_MS = 200;
const YEAR_LENGTH_SECONDS = 90;
const START_YEAR = 2000;
const PRICE_PRESETS = [
  { label: 'Murah', subtitle: 'Entry market', factor: 0.82, reputationBonus: 0.2, marketBonus: 1.4 },
  { label: 'Seimbang', subtitle: 'Mainstream', factor: 1, reputationBonus: 0.6, marketBonus: 1 },
  { label: 'Mahal', subtitle: 'Flagship', factor: 1.24, reputationBonus: 1.3, marketBonus: 0.65 },
] as const;
const DEFAULT_OPEN_PANELS: Record<PanelKey, boolean> = {
  overview: true,
  release: true,
  research: false,
  operations: false,
};

const STARTING_STATE: Snapshot = {
  year: START_YEAR,
  companyName: 'Aurora Microforge',
  funds: 180,
  research: 90,
  marketShare: 1.4,
  reputation: 5,
  releaseCount: 0,
  bestCpuScore: 0,
  revenuePerSecond: 7,
  researchPerSecond: 3.8,
  upgrades: {
    architecture: {
      label: 'Microarchitecture',
      shortLabel: 'Gen 1',
      unit: 'gen',
      decimals: 0,
      value: 1,
      step: 1,
      baseCost: 80,
      costGrowth: 1.26,
      description: 'Instruksi lebih efisien dan pipeline lebih modern untuk lompatan performa besar.',
    },
    lithography: {
      label: 'Process Node',
      shortLabel: '180 nm',
      unit: 'nm',
      decimals: 0,
      value: 180,
      step: -10,
      baseCost: 65,
      costGrowth: 1.19,
      description: 'Node lebih kecil menurunkan konsumsi daya dan membuka ruang frekuensi lebih tinggi.',
    },
    clockSpeed: {
      label: 'Clock Speed',
      shortLabel: '1.4 GHz',
      unit: 'GHz',
      decimals: 1,
      value: 1.4,
      step: 0.2,
      baseCost: 55,
      costGrowth: 1.16,
      description: 'Tingkatkan frekuensi inti supaya produk terasa makin kencang di benchmark.',
    },
    coreDesign: {
      label: 'Core Count',
      shortLabel: '1 core',
      unit: 'core',
      decimals: 0,
      value: 1,
      step: 1,
      baseCost: 72,
      costGrowth: 1.24,
      description: 'Tambah jumlah core untuk multitasking, workstation, dan masa depan gaming.',
    },
    cacheStack: {
      label: 'L2/L3 Cache',
      shortLabel: '256 KB',
      unit: 'KB',
      decimals: 0,
      value: 256,
      step: 256,
      baseCost: 48,
      costGrowth: 1.14,
      description: 'Cache lebih besar mengurangi bottleneck memori dan meningkatkan efisiensi per siklus.',
    },
    powerEfficiency: {
      label: 'Power Efficiency',
      shortLabel: '95 W',
      unit: 'W',
      decimals: 0,
      value: 95,
      step: -4,
      baseCost: 52,
      costGrowth: 1.18,
      description: 'Optimasi daya menjaga suhu tetap masuk akal saat performa CPU terus naik.',
    },
  },
  teams: {
    researchers: {
      label: 'R&D Cells',
      description: 'Menaikkan riset per detik untuk membuka peningkatan spesifikasi lebih cepat.',
      count: 1,
      baseCost: 90,
      costGrowth: 1.35,
    },
    marketing: {
      label: 'Market Intel',
      description: 'Meningkatkan pemasukan pasif dan reputasi tiap kali CPU baru dirilis.',
      count: 0,
      baseCost: 110,
      costGrowth: 1.4,
    },
    fabrication: {
      label: 'Fab Lines',
      description: 'Memperbesar laba dari peluncuran CPU dan membuat pangsa pasar tumbuh lebih cepat.',
      count: 0,
      baseCost: 140,
      costGrowth: 1.42,
    },
  },
};

function formatNumber(value: number, decimals = 0) {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

function getUpgradeLevel(key: UpgradeKey, upgrade: UpgradeState) {
  const startingValue = STARTING_STATE.upgrades[key].value;

  if (key === 'lithography' || key === 'powerEfficiency') {
    return Math.max(0, Math.round((startingValue - upgrade.value) / Math.abs(upgrade.step)));
  }

  return Math.max(0, Math.round((upgrade.value - startingValue) / Math.abs(upgrade.step)));
}

function getUpgradeCost(key: UpgradeKey, upgrade: UpgradeState) {
  const level = getUpgradeLevel(key, upgrade);
  return Math.round(upgrade.baseCost * Math.pow(upgrade.costGrowth, level));
}

function getTeamCost(team: TeamState) {
  return Math.round(team.baseCost * Math.pow(team.costGrowth, team.count));
}

function getDisplayedUpgradeValue(key: UpgradeKey, upgrade: UpgradeState) {
  if (key === 'architecture') {
    return `Gen ${formatNumber(upgrade.value)}`;
  }

  if (key === 'clockSpeed') {
    return `${formatNumber(upgrade.value, 1)} GHz`;
  }

  if (key === 'coreDesign') {
    return `${formatNumber(upgrade.value)} core${upgrade.value > 1 ? 's' : ''}`;
  }

  if (key === 'cacheStack') {
    return upgrade.value >= 1024 ? `${formatNumber(upgrade.value / 1024, 1)} MB` : `${formatNumber(upgrade.value)} KB`;
  }

  if (key === 'lithography') {
    return `${formatNumber(upgrade.value)} nm`;
  }

  return `${formatNumber(upgrade.value)} W`;
}

function calculateCpuScore(upgrades: Snapshot['upgrades']) {
  const architecture = upgrades.architecture.value;
  const clockSpeed = upgrades.clockSpeed.value;
  const coreCount = upgrades.coreDesign.value;
  const cacheGb = upgrades.cacheStack.value / 1024;
  const nodeEfficiency = 220 / upgrades.lithography.value;
  const powerEfficiency = 110 / upgrades.powerEfficiency.value;

  return architecture * 120 + clockSpeed * 85 + coreCount * 95 + cacheGb * 60 + nodeEfficiency * 80 + powerEfficiency * 70;
}

function calculateResearchPerSecond(teams: Snapshot['teams'], upgrades: Snapshot['upgrades']) {
  const researcherBoost = teams.researchers.count * 1.8;
  const architectureBoost = upgrades.architecture.value * 0.55;
  const nodeBoost = (220 - upgrades.lithography.value) * 0.03;
  return 3.8 + researcherBoost + architectureBoost + nodeBoost;
}

function calculateRevenuePerSecond(teams: Snapshot['teams'], upgrades: Snapshot['upgrades'], marketShare: number) {
  const base = 7;
  const fabBoost = teams.fabrication.count * 2.2;
  const marketingBoost = teams.marketing.count * 1.4;
  const cpuBoost = calculateCpuScore(upgrades) * 0.018;
  return base + fabBoost + marketingBoost + marketShare * 0.7 + cpuBoost;
}

function calculateLaunchRevenue(score: number, teams: Snapshot['teams'], marketShare: number, reputation: number, priceFactor: number) {
  const fabMultiplier = 1 + teams.fabrication.count * 0.18;
  const marketingMultiplier = 1 + teams.marketing.count * 0.12;
  const marketMultiplier = 1 + marketShare / 12;
  const reputationMultiplier = 1 + reputation / 30;

  return score * 0.9 * fabMultiplier * marketingMultiplier * marketMultiplier * reputationMultiplier * priceFactor;
}

export function CpuFoundrySim() {
  const [state, setState] = useState<Snapshot>(STARTING_STATE);
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [lastReleaseLabel, setLastReleaseLabel] = useState('Belum ada release CPU. Siapkan seri pertamamu.');
  const [openPanels, setOpenPanels] = useState<Record<PanelKey, boolean>>(DEFAULT_OPEN_PANELS);
  const [releaseDraft, setReleaseDraft] = useState<ReleaseDraft>({
    series: 'Aurora Edge',
    cpuName: 'Nova-1',
    priceIndex: 1,
  });

  useEffect(() => {
    const interval = window.setInterval(() => {
      setState((current) => {
        const researchPerSecond = calculateResearchPerSecond(current.teams, current.upgrades);
        const revenuePerSecond = calculateRevenuePerSecond(current.teams, current.upgrades, current.marketShare);
        const tickSeconds = TICK_MS / 1000;

        return {
          ...current,
          researchPerSecond,
          revenuePerSecond,
          research: current.research + researchPerSecond * tickSeconds,
          funds: current.funds + revenuePerSecond * tickSeconds,
          marketShare: Math.min(54, current.marketShare + current.teams.marketing.count * 0.0025 + current.teams.fabrication.count * 0.0015),
        };
      });

      setSecondsElapsed((current) => current + TICK_MS / 1000);
    }, TICK_MS);

    return () => window.clearInterval(interval);
  }, []);

  const displayYear = useMemo(() => START_YEAR + Math.floor(secondsElapsed / YEAR_LENGTH_SECONDS), [secondsElapsed]);
  const cpuScore = useMemo(() => calculateCpuScore(state.upgrades), [state.upgrades]);
  const cpuBlueprintName = useMemo(() => {
    const generation = state.upgrades.architecture.value;
    const nano = Math.max(5, state.upgrades.lithography.value);
    const tier = Math.round(cpuScore / 55);
    return `AUR-${generation}${nano}-${tier}`;
  }, [cpuScore, state.upgrades.architecture.value, state.upgrades.lithography.value]);
  const activePricePreset = PRICE_PRESETS[releaseDraft.priceIndex];

  useEffect(() => {
    setState((current) => ({
      ...current,
      year: displayYear,
    }));
  }, [displayYear]);

  useEffect(() => {
    setReleaseDraft((current) => {
      if (current.cpuName.trim().length > 0) {
        return current;
      }

      return {
        ...current,
        cpuName: cpuBlueprintName,
      };
    });
  }, [cpuBlueprintName]);

  const togglePanel = (panel: PanelKey) => {
    setOpenPanels((current) => ({
      ...current,
      [panel]: !current[panel],
    }));
  };

  const updateReleaseDraft = <K extends keyof ReleaseDraft>(key: K, value: ReleaseDraft[K]) => {
    setReleaseDraft((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const launchCpu = () => {
    const series = releaseDraft.series.trim();
    const cpuName = releaseDraft.cpuName.trim();

    if (!series || !cpuName) {
      setLastReleaseLabel('Isi nama seri dan nama CPU dulu sebelum release.');
      setOpenPanels((current) => ({ ...current, release: true }));
      return;
    }

    const launchRevenue = calculateLaunchRevenue(
      cpuScore,
      state.teams,
      state.marketShare,
      state.reputation,
      activePricePreset.factor
    );
    const reputationGain = Math.max(1.5, cpuScore / 240 + state.teams.marketing.count * 0.8 + activePricePreset.reputationBonus);
    const marketShareGain = Math.min(4.5, cpuScore / 500 + state.teams.fabrication.count * 0.15 + activePricePreset.marketBonus);

    setState((current) => ({
      ...current,
      funds: current.funds + launchRevenue,
      reputation: Math.min(100, current.reputation + reputationGain),
      marketShare: Math.min(68, current.marketShare + marketShareGain),
      releaseCount: current.releaseCount + 1,
      bestCpuScore: Math.max(current.bestCpuScore, cpuScore),
    }));

    setLastReleaseLabel(
      `${series} ${cpuName} dirilis (${activePricePreset.label.toLowerCase()}) pada ${state.year}. Pendapatan +$${formatNumber(launchRevenue, 0)}M.`
    );
    setOpenPanels((current) => ({
      ...current,
      overview: true,
      release: false,
    }));
    setReleaseDraft((current) => ({
      ...current,
      cpuName: `${cpuBlueprintName}-${state.releaseCount + 2}`,
    }));
  };

  const improveUpgrade = (key: UpgradeKey) => {
    const upgrade = state.upgrades[key];
    const cost = getUpgradeCost(key, upgrade);

    if (state.research < cost) {
      return;
    }

    const nextValue = key === 'lithography' || key === 'powerEfficiency'
      ? Math.max(key === 'lithography' ? 3 : 25, upgrade.value + upgrade.step)
      : upgrade.value + upgrade.step;

    setState((current) => ({
      ...current,
      research: current.research - cost,
      upgrades: {
        ...current.upgrades,
        [key]: {
          ...current.upgrades[key],
          value: nextValue,
          shortLabel: getDisplayedUpgradeValue(key, { ...current.upgrades[key], value: nextValue }),
        },
      },
    }));
  };

  const hireTeam = (key: TeamKey) => {
    const cost = getTeamCost(state.teams[key]);

    if (state.funds < cost) {
      return;
    }

    setState((current) => ({
      ...current,
      funds: current.funds - cost,
      teams: {
        ...current.teams,
        [key]: {
          ...current.teams[key],
          count: current.teams[key].count + 1,
        },
      },
    }));
  };

  const compactStats = [
    { label: 'Dana', value: `$${formatNumber(state.funds, 1)}M` },
    { label: 'Riset', value: `${formatNumber(state.research, 1)} RP` },
    { label: 'RP/s', value: `${formatNumber(state.researchPerSecond, 1)}` },
    { label: 'Cash/s', value: `$${formatNumber(state.revenuePerSecond, 1)}M` },
    { label: 'Market', value: `${formatNumber(state.marketShare, 1)}%` },
    { label: 'Reputasi', value: `${formatNumber(state.reputation, 1)}` },
  ] as const;

  return (
    <main className={styles.shell}>
      <section className={styles.heroCard}>
        <p className={styles.eyebrow}>/game · cpu company sim · mobile first</p>
        <div className={styles.heroTopRow}>
          <div>
            <h1>{state.companyName}</h1>
            <p className={styles.subtitle}>Mulai dari tahun 2000, kumpulkan RP per detik, dan bangun lini CPU lewat panel yang bisa dibuka-tutup.</p>
          </div>
          <div className={styles.yearBadge}>{state.year}</div>
        </div>

        <div className={styles.inlineHighlights}>
          <div>
            <span>Blueprint</span>
            <strong>{cpuBlueprintName}</strong>
          </div>
          <div>
            <span>CPU score</span>
            <strong>{formatNumber(cpuScore, 0)}</strong>
          </div>
          <div>
            <span>Release</span>
            <strong>{formatNumber(state.releaseCount)}</strong>
          </div>
        </div>

        <div className={styles.statGrid}>
          {compactStats.map((entry) => (
            <article key={entry.label} className={styles.statChip}>
              <span>{entry.label}</span>
              <strong>{entry.value}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.panelStack}>
        <section className={styles.panel}>
          <button type="button" className={styles.panelToggle} onClick={() => togglePanel('overview')}>
            <div>
              <p className={styles.panelTag}>Overview</p>
              <h2>Ringkasan perusahaan</h2>
            </div>
            <span>{openPanels.overview ? 'Tutup' : 'Buka'}</span>
          </button>
          {openPanels.overview ? (
            <div className={styles.panelBody}>
              <div className={styles.infoRow}>
                <div>
                  <span>Best score</span>
                  <strong>{formatNumber(Math.max(cpuScore, state.bestCpuScore), 0)}</strong>
                </div>
                <div>
                  <span>CPU aktif</span>
                  <strong>{releaseDraft.series} {releaseDraft.cpuName}</strong>
                </div>
              </div>
              <div className={styles.memoCard}>
                <p className={styles.panelTag}>Memo terbaru</p>
                <p>{lastReleaseLabel}</p>
              </div>
            </div>
          ) : null}
        </section>

        <section className={styles.panel}>
          <button type="button" className={styles.panelToggle} onClick={() => togglePanel('release')}>
            <div>
              <p className={styles.panelTag}>Release studio</p>
              <h2>Release CPU baru</h2>
            </div>
            <span>{openPanels.release ? 'Tutup' : 'Buka'}</span>
          </button>
          {openPanels.release ? (
            <div className={styles.panelBody}>
              <div className={styles.formStack}>
                <label className={styles.field}>
                  <span>Seri</span>
                  <input value={releaseDraft.series} onChange={(event) => updateReleaseDraft('series', event.target.value)} placeholder="Contoh: Aurora Edge" />
                </label>
                <label className={styles.field}>
                  <span>Nama CPU</span>
                  <input value={releaseDraft.cpuName} onChange={(event) => updateReleaseDraft('cpuName', event.target.value)} placeholder="Contoh: Nova-1" />
                </label>
              </div>

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
                  onChange={(event) => updateReleaseDraft('priceIndex', Number(event.target.value))}
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
                  <span>Estimasi hasil</span>
                  <strong>$ {formatNumber(calculateLaunchRevenue(cpuScore, state.teams, state.marketShare, state.reputation, activePricePreset.factor), 0)}M</strong>
                </div>
              </div>

              <button type="button" className={styles.primaryButton} onClick={launchCpu}>
                Release CPU sekarang
              </button>
            </div>
          ) : null}
        </section>

        <section className={styles.panel}>
          <button type="button" className={styles.panelToggle} onClick={() => togglePanel('research')}>
            <div>
              <p className={styles.panelTag}>R&D lab</p>
              <h2>Upgrade spesifikasi CPU</h2>
            </div>
            <span>{openPanels.research ? 'Tutup' : 'Buka'}</span>
          </button>
          {openPanels.research ? (
            <div className={styles.panelBodyCompact}>
              {(Object.entries(state.upgrades) as [UpgradeKey, UpgradeState][]).map(([key, upgrade]) => {
                const cost = getUpgradeCost(key, upgrade);
                const afford = state.research >= cost;

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
                    <button type="button" className={styles.secondaryButton} onClick={() => improveUpgrade(key)} disabled={!afford}>
                      {afford ? 'Upgrade' : 'RP kurang'}
                    </button>
                  </article>
                );
              })}
            </div>
          ) : null}
        </section>

        <section className={styles.panel}>
          <button type="button" className={styles.panelToggle} onClick={() => togglePanel('operations')}>
            <div>
              <p className={styles.panelTag}>Operations</p>
              <h2>Tim & fasilitas</h2>
            </div>
            <span>{openPanels.operations ? 'Tutup' : 'Buka'}</span>
          </button>
          {openPanels.operations ? (
            <div className={styles.panelBodyCompact}>
              {(Object.entries(state.teams) as [TeamKey, TeamState][]).map(([key, team]) => {
                const cost = getTeamCost(team);
                const afford = state.funds >= cost;

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
                    <button type="button" className={styles.secondaryButton} onClick={() => hireTeam(key)} disabled={!afford}>
                      {afford ? 'Expand' : 'Dana kurang'}
                    </button>
                  </article>
                );
              })}
            </div>
          ) : null}
        </section>
      </section>
    </main>
  );
}
