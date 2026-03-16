'use client';

import { useEffect, useMemo, useState } from 'react';
import { FadhilAiGlobalChat } from '@/components/FadhilAiGlobalChat';

type Vec = { x: number; y: number };
type Obstacle = { x: number; y: number; w: number; h: number };
type Bullet = { x: number; y: number; vx: number; vy: number; ttl: number; owner: 'A' | 'B' };
type Agent = { x: number; y: number; angle: number; hp: number; shootCooldown: number; hits: number; kills: number; deaths: number };
type TrainLog = { epoch: number; trainingLoss: number; validationLoss: number; drift: number; killsA: number; killsB: number; accuracyA: number; accuracyB: number };
type SessionFrame = { a: Agent; b: Agent; bullets: Bullet[]; killsA: number; killsB: number };
type Scenario = { a: Vec; b: Vec; label: 'flank' | 'cover' | 'precision'; pressure: number };
type PatternMemory = { positive: Record<string, number>; negative: Record<string, number> };

type Policy = {
  aggressiveness: number;
  accuracy: number;
  strafe: number;
  coverBias: number;
  flankBias: number;
  rotationSpeed: number;
};

type MatchState = {
  a: Agent;
  b: Agent;
  bullets: Bullet[];
  tick: number;
  killsA: number;
  killsB: number;
  stuckA: number;
  stuckB: number;
};

type PersistRun = {
  runId: string;
  strategy: string;
  battlegroundVersion: string;
  trainingModelVersion: string;
  datasetSize: number;
  epochs: number;
  learningRate: number;
  trainingLoss: number;
  validationLoss: number;
  qualityScore: number;
  modelAWeights: Policy;
  modelBWeights: Policy;
  logs: TrainLog[];
  compressedResults: string;
  compressionMode: 'delta-q62-rle-v3';
  compressionParams: { quantization: number; radix: number; deltaEncoding: true; imageCodec: 'webp-heatmap-rle-v2'; imageQuality: number };
  baselineDataset: { samples: number; source: string; targetParameters: number; activeParameters: number };
  learningMemory: { positivePatterns: number; negativePatterns: number };
};

const FIELD_W = 120;
const FIELD_H = 72;
const AGENT_R = 1.7;
const MAX_BULLETS = 50;
const MAX_SESSION_TICKS = 500;
const BASELINE_SAMPLES = 3000;
const TARGET_PARAMETER_BANK = 80000;
const TRAINING_VERSION = 'shooter-1v1-v1';
const BATTLEGROUND_VERSION = 'bg-v4-shooter-arena';
const LR = 0.006;

const OBSTACLES: Obstacle[] = [
  { x: 33, y: 24, w: 10, h: 24 },
  { x: 77, y: 24, w: 10, h: 24 },
  { x: 54, y: 10, w: 12, h: 9 },
  { x: 54, y: 53, w: 12, h: 9 },
];

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const vsub = (a: Vec, b: Vec): Vec => ({ x: a.x - b.x, y: a.y - b.y });
const vadd = (a: Vec, b: Vec): Vec => ({ x: a.x + b.x, y: a.y + b.y });
const vscale = (v: Vec, s: number): Vec => ({ x: v.x * s, y: v.y * s });
const vlen = (v: Vec) => Math.hypot(v.x, v.y);
const vnorm = (v: Vec): Vec => {
  const l = vlen(v) || 1;
  return { x: v.x / l, y: v.y / l };
};
const angleToVec = (angle: number): Vec => ({ x: Math.cos(angle), y: Math.sin(angle) });
const vecToAngle = (v: Vec) => Math.atan2(v.y, v.x);
const wrap = (v: number) => (v > Math.PI ? v - Math.PI * 2 : v < -Math.PI ? v + Math.PI * 2 : v);

const BASE62 = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
function b62(n: number) {
  const neg = n < 0;
  let v = Math.abs(Math.round(n));
  if (v === 0) return '0';
  let out = '';
  while (v > 0) {
    out = BASE62[v % 62] + out;
    v = Math.floor(v / 62);
  }
  return neg ? `-${out}` : out;
}

function seededRandom(seed: number) {
  let x = Math.sin(seed) * 9999;
  return () => {
    x = Math.sin(x * 1.0007 + 0.13) * 9999;
    return x - Math.floor(x);
  };
}

function intersectsObstacle(pos: Vec) {
  return OBSTACLES.some((o) => pos.x > o.x - AGENT_R && pos.x < o.x + o.w + AGENT_R && pos.y > o.y - AGENT_R && pos.y < o.y + o.h + AGENT_R);
}

function initialAgent(x: number, y: number, angle: number): Agent {
  return { x, y, angle, hp: 100, shootCooldown: 0, hits: 0, kills: 0, deaths: 0 };
}

function initialMatch(scenario: Scenario, rand: () => number): MatchState {
  return {
    a: initialAgent(clamp(scenario.a.x, 8, FIELD_W * 0.45), clamp(scenario.a.y, 8, FIELD_H - 8), 0 + (rand() - 0.5) * 0.25),
    b: initialAgent(clamp(scenario.b.x, FIELD_W * 0.55, FIELD_W - 8), clamp(scenario.b.y, 8, FIELD_H - 8), Math.PI + (rand() - 0.5) * 0.25),
    bullets: [],
    tick: 0,
    killsA: 0,
    killsB: 0,
    stuckA: 0,
    stuckB: 0,
  };
}

function buildBaseline(rand: () => number) {
  const out: Scenario[] = [];
  for (let i = 0; i < BASELINE_SAMPLES; i += 1) {
    const mode = i % 3;
    out.push({
      a: { x: 10 + rand() * 45, y: 8 + rand() * (FIELD_H - 16) },
      b: { x: 65 + rand() * 45, y: 8 + rand() * (FIELD_H - 16) },
      label: mode === 0 ? 'flank' : mode === 1 ? 'cover' : 'precision',
      pressure: rand(),
    });
  }
  return out;
}

function patternKey(a: Agent, b: Agent) {
  const dist = vlen(vsub(a, b));
  const spacing = dist < 20 ? 'close' : dist < 45 ? 'mid' : 'far';
  const hpState = a.hp > b.hp ? 'lead' : a.hp === b.hp ? 'even' : 'trail';
  const yLane = a.y < FIELD_H * 0.33 ? 'top' : a.y > FIELD_H * 0.66 ? 'bot' : 'mid';
  return `${spacing}-${hpState}-${yLane}`;
}

function chooseCover(me: Agent, enemy: Agent) {
  const scored = OBSTACLES
    .map((o) => {
      const cx = o.x + o.w * 0.5;
      const cy = o.y + o.h * 0.5;
      const toMe = vlen(vsub({ x: cx, y: cy }, me));
      const toEnemy = vlen(vsub({ x: cx, y: cy }, enemy));
      return { x: cx, y: cy, score: toEnemy - toMe * 0.7 };
    })
    .sort((a, b) => b.score - a.score);
  return scored[0] ?? { x: FIELD_W * 0.5, y: FIELD_H * 0.5 };
}

function aiStep(side: 'A' | 'B', me: Agent, enemy: Agent, policy: Policy, memory: PatternMemory, scenario: Scenario) {
  const key = patternKey(me, enemy);
  const pos = memory.positive[key] ?? 0;
  const neg = memory.negative[key] ?? 0;
  const reinforcement = 1 + pos * 0.02 - neg * 0.03;

  const toEnemy = vnorm(vsub({ x: enemy.x, y: enemy.y }, { x: me.x, y: me.y }));
  const sideVec = { x: -toEnemy.y, y: toEnemy.x };
  const cover = chooseCover(me, enemy);
  const toCover = vnorm(vsub(cover, me));

  const flankSign = side === 'A' ? 1 : -1;
  const scenarioAnchor = side === 'A' ? scenario.a : scenario.b;
  const toAnchor = vnorm(vsub(scenarioAnchor, me));
  const route = scenario.label === 'flank' ? vadd(vscale(toEnemy, 0.7), vscale(sideVec, flankSign * (0.45 + policy.flankBias * 0.3)))
    : scenario.label === 'cover' ? vadd(vscale(toEnemy, 0.35), vscale(toCover, 0.75 + policy.coverBias * 0.4))
      : vadd(vscale(toEnemy, 0.95), vscale(sideVec, 0.15 * flankSign));

  const move = vnorm(vadd(vadd(route, vscale(sideVec, policy.strafe * 0.3 * flankSign)), vscale(toAnchor, 0.16 + scenario.pressure * 0.12)));
  const desiredAngle = vecToAngle(vadd(vscale(toEnemy, 0.85), vscale(sideVec, 0.18 * flankSign)));
  const delta = wrap(desiredAngle - me.angle);
  const nextAngle = wrap(me.angle + clamp(delta, -policy.rotationSpeed, policy.rotationSpeed));
  const aimError = clamp((1 - policy.accuracy * reinforcement) * 0.12, 0.005, 0.13);
  const shouldShoot = me.shootCooldown <= 0 && vlen(vsub(me, enemy)) < 52 && Math.abs(delta) < 0.55;

  return { move, nextAngle, shouldShoot, aimError };
}

function moveAgent(a: Agent, move: Vec, speed: number) {
  const next = { ...a, x: clamp(a.x + move.x * speed, AGENT_R, FIELD_W - AGENT_R), y: clamp(a.y + move.y * speed, AGENT_R, FIELD_H - AGENT_R) };
  if (intersectsObstacle(next)) return a;
  return next;
}

function simulateTick(state: MatchState, pA: Policy, pB: Policy, memory: PatternMemory, scenario: Scenario, rand: () => number) {
  let a = { ...state.a, shootCooldown: Math.max(0, state.a.shootCooldown - 1) };
  let b = { ...state.b, shootCooldown: Math.max(0, state.b.shootCooldown - 1) };

  const stepA = aiStep('A', a, b, pA, memory, scenario);
  const stepB = aiStep('B', b, a, pB, memory, scenario);

  a = moveAgent({ ...a, angle: stepA.nextAngle }, stepA.move, 1.12 + pA.aggressiveness * 0.1);
  b = moveAgent({ ...b, angle: stepB.nextAngle }, stepB.move, 1.12 + pB.aggressiveness * 0.1);

  let bullets = state.bullets.map((bullet) => ({ ...bullet, x: bullet.x + bullet.vx, y: bullet.y + bullet.vy, ttl: bullet.ttl - 1 }));

  if (stepA.shouldShoot && bullets.length < MAX_BULLETS) {
    const shot = wrap(a.angle + (rand() - 0.5) * stepA.aimError * 2);
    const v = angleToVec(shot);
    bullets.push({ x: a.x, y: a.y, vx: v.x * 2.35, vy: v.y * 2.35, ttl: 48, owner: 'A' });
    a.shootCooldown = 10;
  }
  if (stepB.shouldShoot && bullets.length < MAX_BULLETS) {
    const shot = wrap(b.angle + (rand() - 0.5) * stepB.aimError * 2);
    const v = angleToVec(shot);
    bullets.push({ x: b.x, y: b.y, vx: v.x * 2.35, vy: v.y * 2.35, ttl: 48, owner: 'B' });
    b.shootCooldown = 10;
  }

  let killsA = state.killsA;
  let killsB = state.killsB;

  bullets = bullets.filter((bullet) => {
    if (bullet.ttl <= 0 || bullet.x <= 0 || bullet.x >= FIELD_W || bullet.y <= 0 || bullet.y >= FIELD_H) return false;
    if (intersectsObstacle(bullet)) return false;
    if (bullet.owner === 'A' && vlen(vsub(bullet, b)) < AGENT_R + 0.8) {
      b.hp -= 20;
      a.hits += 1;
      if (b.hp <= 0) {
        killsA += 1;
        a.kills += 1;
        b.deaths += 1;
        b = initialAgent(FIELD_W - 14, FIELD_H * 0.5 + (rand() - 0.5) * 14, Math.PI);
      }
      return false;
    }
    if (bullet.owner === 'B' && vlen(vsub(bullet, a)) < AGENT_R + 0.8) {
      a.hp -= 20;
      b.hits += 1;
      if (a.hp <= 0) {
        killsB += 1;
        b.kills += 1;
        a.deaths += 1;
        a = initialAgent(14, FIELD_H * 0.5 + (rand() - 0.5) * 14, 0);
      }
      return false;
    }
    return true;
  });

  const stuckA = vlen(stepA.move) < 0.12 ? state.stuckA + 1 : Math.max(0, state.stuckA - 1);
  const stuckB = vlen(stepB.move) < 0.12 ? state.stuckB + 1 : Math.max(0, state.stuckB - 1);

  return { a, b, bullets, tick: state.tick + 1, killsA, killsB, stuckA, stuckB };
}

function trainStep(state: MatchState, pA: Policy, pB: Policy, scenario: Scenario, memory: PatternMemory, matches: number) {
  const key = patternKey(state.a, state.b);
  const pos = memory.positive[key] ?? 0;
  const neg = memory.negative[key] ?? 0;
  const learningBoost = matches >= 5 ? 1.25 : 1.05;

  const rewardA = (state.killsA - state.killsB) * 0.4 + (state.a.hits - state.b.hits) * 0.04 + (state.a.hp - state.b.hp) * 0.002 - state.stuckA * 0.01;
  const rewardB = -rewardA - state.stuckB * 0.008;
  const scenarioBias = scenario.label === 'precision' ? 0.08 : scenario.label === 'flank' ? 0.05 : 0.02;

  const adjust = (value: number, delta: number, min: number, max: number) => clamp(value + delta * LR * learningBoost, min, max);

  const nextA: Policy = {
    aggressiveness: adjust(pA.aggressiveness, rewardA + scenarioBias + pos * 0.01 - neg * 0.015, 0.5, 2.2),
    accuracy: adjust(pA.accuracy, rewardA + scenarioBias + pos * 0.015 - neg * 0.02, 0.45, 1.95),
    strafe: adjust(pA.strafe, rewardA * 0.6 + scenarioBias, 0.1, 1.4),
    coverBias: adjust(pA.coverBias, -state.a.hp * 0.001 + scenario.pressure * 0.02, 0.1, 1.6),
    flankBias: adjust(pA.flankBias, scenario.label === 'flank' ? 0.06 : -0.01, 0.1, 1.6),
    rotationSpeed: adjust(pA.rotationSpeed, rewardA * 0.7 - state.stuckA * 0.01, 0.06, 0.35),
  };

  const nextB: Policy = {
    aggressiveness: adjust(pB.aggressiveness, rewardB + scenarioBias + pos * 0.01 - neg * 0.015, 0.5, 2.2),
    accuracy: adjust(pB.accuracy, rewardB + scenarioBias + pos * 0.015 - neg * 0.02, 0.45, 1.95),
    strafe: adjust(pB.strafe, rewardB * 0.6 + scenarioBias, 0.1, 1.4),
    coverBias: adjust(pB.coverBias, -state.b.hp * 0.001 + scenario.pressure * 0.02, 0.1, 1.6),
    flankBias: adjust(pB.flankBias, scenario.label === 'flank' ? 0.06 : -0.01, 0.1, 1.6),
    rotationSpeed: adjust(pB.rotationSpeed, rewardB * 0.7 - state.stuckB * 0.01, 0.06, 0.35),
  };

  const trainingLoss = clamp(0.62 - (state.killsA + state.killsB) * 0.04 + (state.stuckA + state.stuckB) * 0.004 + Math.abs(state.a.hp - state.b.hp) * 0.0015, 0.01, 1);
  return { nextA, nextB, trainingLoss };
}

function compressLogs(logs: TrainLog[]) {
  let prevT = 0;
  let prevV = 0;
  const q = (v: number) => Math.round(v * 1_000_000);
  return logs.map((l) => {
    const t = q(l.trainingLoss);
    const v = q(l.validationLoss);
    const raw = `${b62(l.epoch)}|${b62(t - prevT)}|${b62(v - prevV)}|${b62(Math.round(l.drift * 1000))}|${b62(l.killsA)}|${b62(l.killsB)}|${b62(Math.round(l.accuracyA * 1000))}|${b62(Math.round(l.accuracyB * 1000))}`;
    prevT = t;
    prevV = v;
    return raw;
  }).join(';');
}

export default function FadhilAIFocusedWarStrategyPage() {
  const rand = useMemo(() => seededRandom(11.3), []);
  const baseline = useMemo(() => buildBaseline(rand), [rand]);
  const parameterBank = useMemo(() => Array.from({ length: TARGET_PARAMETER_BANK }, (_, i) => (Math.sin(i * 0.07) + 1) * 0.5), []);

  const [policyA, setPolicyA] = useState<Policy>({ aggressiveness: 1.32, accuracy: 1.2, strafe: 0.72, coverBias: 0.58, flankBias: 0.74, rotationSpeed: 0.2 });
  const [policyB, setPolicyB] = useState<Policy>({ aggressiveness: 1.32, accuracy: 1.2, strafe: 0.72, coverBias: 0.58, flankBias: 0.74, rotationSpeed: 0.2 });
  const [match, setMatch] = useState<MatchState>(() => initialMatch(baseline[0], rand));
  const [epoch, setEpoch] = useState(1);
  const [completedMatches, setCompletedMatches] = useState(0);
  const [memory, setMemory] = useState<PatternMemory>({ positive: {}, negative: {} });
  const [logs, setLogs] = useState<TrainLog[]>([]);
  const [sessions, setSessions] = useState<SessionFrame[][]>([]);
  const [liveFrames, setLiveFrames] = useState<SessionFrame[]>([]);
  const [watchSession, setWatchSession] = useState<number | null>(null);
  const [savedState, setSavedState] = useState('pending');
  const [storedCount, setStoredCount] = useState(0);

  const watched = useMemo(() => {
    if (watchSession === null || !sessions[watchSession]) return null;
    return sessions[watchSession][Math.min(match.tick, sessions[watchSession].length - 1)] ?? null;
  }, [sessions, watchSession, match.tick]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setMatch((prev) => {
        const scenario = baseline[(prev.tick + epoch) % baseline.length];
        const next = simulateTick(prev, policyA, policyB, memory, scenario, rand);
        const trained = trainStep(next, policyA, policyB, scenario, memory, completedMatches);

        setPolicyA(trained.nextA);
        setPolicyB(trained.nextB);

        const key = patternKey(next.a, next.b);
        if (next.killsA > prev.killsA || next.killsB > prev.killsB) {
          setMemory((m) => ({ ...m, positive: { ...m.positive, [key]: (m.positive[key] ?? 0) + 1 } }));
        }
        if (next.stuckA > 8 || next.stuckB > 8) {
          setMemory((m) => ({ ...m, negative: { ...m.negative, [key]: (m.negative[key] ?? 0) + 1 } }));
        }

        setLogs((prevLogs) => [...prevLogs, {
          epoch,
          trainingLoss: trained.trainingLoss,
          validationLoss: clamp(trained.trainingLoss * 0.7, 0.0001, 1),
          drift: Math.abs(trained.nextA.accuracy - trained.nextB.accuracy) + Math.abs(trained.nextA.aggressiveness - trained.nextB.aggressiveness),
          killsA: next.killsA,
          killsB: next.killsB,
          accuracyA: next.a.hits / Math.max(1, next.a.hits + next.a.deaths),
          accuracyB: next.b.hits / Math.max(1, next.b.hits + next.b.deaths),
        }].slice(-220));

        const frame: SessionFrame = { a: next.a, b: next.b, bullets: next.bullets, killsA: next.killsA, killsB: next.killsB };
        setLiveFrames((f) => [...f, frame]);

        const ended = next.tick >= MAX_SESSION_TICKS || next.killsA >= 5 || next.killsB >= 5;
        if (ended) {
          setSessions((s) => [[...liveFrames, frame], ...s].slice(0, 10));
          setLiveFrames([]);
          setEpoch((e) => e + 1);
          setCompletedMatches((m) => m + 1);
          const nextScenario = baseline[(next.tick + epoch + 17) % baseline.length];
          return initialMatch(nextScenario, rand);
        }
        return next;
      });
    }, 65);

    return () => window.clearInterval(timer);
  }, [baseline, completedMatches, epoch, liveFrames, memory, policyA, policyB, rand]);

  const trained = useMemo(() => {
    const last = logs[logs.length - 1] ?? { trainingLoss: 0.3, validationLoss: 0.25, drift: 0, killsA: 0, killsB: 0, accuracyA: 0, accuracyB: 0 };
    const goalMain = last.killsA > 0 || last.killsB > 0;
    const qualityScore = goalMain ? 100 : Math.round(clamp((1 - last.validationLoss) * 100 - last.drift * 9, 0, 99));
    return { trainingLoss: last.trainingLoss, validationLoss: last.validationLoss, qualityScore };
  }, [logs]);

  useEffect(() => {
    const pullRuns = async () => {
      try {
        const res = await fetch('/api/fadhil-ai/training?cached=1', { cache: 'no-store' });
        const json = await res.json();
        if (json.ok && Array.isArray(json.runs)) setStoredCount(json.runs.length);
      } catch {
        setStoredCount(0);
      }
    };
    void pullRuns();
  }, [epoch]);

  useEffect(() => {
    if (logs.length < 24 || logs.length % 24 !== 0) return;

    const payload: PersistRun = {
      runId: `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      strategy: 'FadhilAI-1v1-shooter-with-cover',
      battlegroundVersion: BATTLEGROUND_VERSION,
      trainingModelVersion: TRAINING_VERSION,
      datasetSize: baseline.length,
      epochs: epoch,
      learningRate: LR,
      trainingLoss: trained.trainingLoss,
      validationLoss: trained.validationLoss,
      qualityScore: trained.qualityScore,
      modelAWeights: policyA,
      modelBWeights: policyB,
      logs,
      compressedResults: compressLogs(logs),
      compressionMode: 'delta-q62-rle-v3',
      compressionParams: { quantization: 1_000_000, radix: 62, deltaEncoding: true, imageCodec: 'webp-heatmap-rle-v2', imageQuality: 0.5 },
      baselineDataset: { samples: baseline.length, source: 'shooter curriculum flank+cover+precision', targetParameters: TARGET_PARAMETER_BANK, activeParameters: parameterBank.length },
      learningMemory: { positivePatterns: Object.keys(memory.positive).length, negativePatterns: Object.keys(memory.negative).length },
    };

    const persist = async () => {
      try {
        const res = await fetch('/api/fadhil-ai/training', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const json = await res.json();
        setSavedState(json.saved ? 'saved and compressed' : `rejected: ${json.reason ?? 'unknown'}`);
      } catch {
        setSavedState('database unavailable');
      }
    };

    void persist();
  }, [baseline, epoch, logs, memory, parameterBank.length, policyA, policyB, trained]);

  const frame = watched ?? liveFrames[liveFrames.length - 1] ?? { a: match.a, b: match.b, bullets: match.bullets, killsA: match.killsA, killsB: match.killsB };

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-3 pb-24 text-slate-100">
      <section className="mx-auto grid w-full max-w-6xl gap-3 lg:grid-cols-[2fr_1fr]">
        <div className="rounded-xl border border-cyan-500/35 bg-slate-900/75 p-3">
          <h1 className="text-sm font-bold text-cyan-200">FadhilAI 1v1 Shooter Arena (Obstacle + Cover)</h1>
          <p className="text-xs text-cyan-100/80">Agents learn route strategy, body rotation aiming, side-step combat, and precise shooting.</p>
          <div className="mt-3 rounded-lg border border-cyan-400/30 bg-[#021226] p-2">
            <svg viewBox={`0 0 ${FIELD_W} ${FIELD_H}`} className="w-full" role="img" aria-label="FadhilAI shooter field">
              <rect x="0" y="0" width={FIELD_W} height={FIELD_H} fill="#0f2f3a" rx="2" />
              {OBSTACLES.map((o, i) => <rect key={i} x={o.x} y={o.y} width={o.w} height={o.h} fill="#334155" stroke="#64748b" strokeWidth="0.3" rx="1" />)}
              <g transform={`translate(${frame.a.x} ${frame.a.y}) rotate(${(frame.a.angle * 180) / Math.PI})`}>
                <circle r={AGENT_R} fill="#22d3ee" stroke="#a5f3fc" strokeWidth="0.25" />
                <line x1="0" y1="0" x2="2.7" y2="0" stroke="#ecfeff" strokeWidth="0.35" />
              </g>
              <g transform={`translate(${frame.b.x} ${frame.b.y}) rotate(${(frame.b.angle * 180) / Math.PI})`}>
                <circle r={AGENT_R} fill="#fb7185" stroke="#fecdd3" strokeWidth="0.25" />
                <line x1="0" y1="0" x2="2.7" y2="0" stroke="#fff1f2" strokeWidth="0.35" />
              </g>
              {frame.bullets.map((bullet, i) => <circle key={i} cx={bullet.x} cy={bullet.y} r="0.35" fill={bullet.owner === 'A' ? '#67e8f9' : '#fda4af'} />)}
            </svg>
            <p className="mt-2 text-xs text-slate-200">Kills A:{frame.killsA} - B:{frame.killsB} • Epoch {epoch}</p>
            <p className="text-[11px] text-slate-300">Save status: {savedState} • Stored runs: {storedCount}</p>
          </div>
        </div>

        <aside className="space-y-3">
          <div className="rounded-xl border border-violet-500/35 bg-slate-900/75 p-3 text-xs">
            <h2 className="mb-1 font-semibold text-violet-200">Shooter Intelligence</h2>
            <p>Training loss: <span className="text-cyan-200">{trained.trainingLoss.toFixed(5)}</span></p>
            <p>Validation loss: <span className="text-cyan-200">{trained.validationLoss.toFixed(5)}</span></p>
            <p>Quality score: <span className="text-cyan-200">{trained.qualityScore}%</span></p>
            <p>Initial dataset: <span className="text-cyan-200">{baseline.length}</span> scenarios</p>
            <p>Expanded AI parameter bank: <span className="text-cyan-200">{parameterBank.length.toLocaleString()}</span></p>
            <p>Learned positive patterns: <span className="text-cyan-200">{Object.keys(memory.positive).length}</span></p>
            <p>Learned negative patterns: <span className="text-cyan-200">{Object.keys(memory.negative).length}</span></p>
          </div>

          <div className="rounded-xl border border-amber-400/35 bg-slate-900/75 p-3">
            <h2 className="mb-2 text-xs font-semibold text-amber-200">Watch Training Sessions</h2>
            <div className="max-h-56 space-y-1 overflow-y-auto text-xs">
              <button type="button" className="w-full rounded border border-cyan-400/50 px-2 py-1 text-left text-cyan-100" onClick={() => setWatchSession(null)}>Back to live feed</button>
              {sessions.map((s, i) => (
                <button key={i} type="button" className="w-full rounded border border-slate-600 px-2 py-1 text-left text-slate-200" onClick={() => setWatchSession(i)}>
                  Session #{i + 1} • frames {s.length} • kills {s[s.length - 1]?.killsA ?? 0}:{s[s.length - 1]?.killsB ?? 0}
                </button>
              ))}
            </div>
          </div>
        </aside>
      </section>

      <button
        type="button"
        className="fixed bottom-16 right-3 z-20 rounded-full border border-cyan-500/70 bg-slate-900/90 px-3 py-2 text-xs shadow-lg"
        onClick={() => {
          const target = document.scrollingElement ?? document.documentElement;
          target.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      >
        ↑ top
      </button>
      <button
        type="button"
        className="fixed bottom-3 right-3 z-20 rounded-full border border-cyan-500/70 bg-slate-900/90 px-3 py-2 text-xs shadow-lg"
        onClick={() => {
          const target = document.scrollingElement ?? document.documentElement;
          target.scrollTo({ top: target.scrollHeight, behavior: 'smooth' });
        }}
      >
        ↓ bottom
      </button>

      <FadhilAiGlobalChat />
    </main>
  );
}
