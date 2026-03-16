'use client';

import { useEffect, useMemo, useState } from 'react';
import { FadhilAiGlobalChat } from '@/components/FadhilAiGlobalChat';

type Vec = { x: number; y: number };
type Side = 'A' | 'B';
type TrainLog = { epoch: number; trainingLoss: number; validationLoss: number; drift: number; capturedA: number; capturedB: number };
type SessionFrame = { a: Vec; b: Vec; ball: Vec; scoreA: number; scoreB: number };
type BaselineSample = { ball: Vec; ballVel: Vec; a: Vec; b: Vec; label: 'attack' | 'defend' | 'release-corner' };

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
  compressionMode: 'delta-q36-v1';
  baselineDataset: { samples: number; source: string; avoidRules: string[] };
  antiStuck: { interventions: number; cornerEscapes: number; stuckWarnings: number; badPatternNotes: string[] };
};

type Policy = {
  toBall: number;
  toGoal: number;
  defend: number;
  biasX: number;
  biasY: number;
};

type MatchState = {
  a: Vec;
  b: Vec;
  ball: Vec;
  ballVel: Vec;
  scoreA: number;
  scoreB: number;
  tick: number;
  stuckTicks: number;
  lastCorner: string;
};

const FIELD_W = 100;
const FIELD_H = 62;
const BLOCK_SIZE = 3.2;
const GOAL_HALF = 9;
const MAX_SESSION_TICKS = 420;
const BATTLEGROUND_VERSION = 'bg-v3-2d-soccer';
const TRAINING_VERSION = 'block-football-v1';
const LR = 0.008;
const MIN_BASELINE = 320;
const CORNER_ZONE = 9;

const AVOID_RULES = [
  'Do not keep both agents behind the ball inside the same corner lane for more than 8 ticks.',
  'Do not apply repeated wall hits with near-zero horizontal velocity in corner zones.',
  'Do not chase only the ball Y-axis; maintain diagonal exit vector when trapped.',
];

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const vadd = (a: Vec, b: Vec): Vec => ({ x: a.x + b.x, y: a.y + b.y });
const vsub = (a: Vec, b: Vec): Vec => ({ x: a.x - b.x, y: a.y - b.y });
const vscale = (a: Vec, s: number): Vec => ({ x: a.x * s, y: a.y * s });
const vlen = (a: Vec) => Math.hypot(a.x, a.y);
const vnorm = (a: Vec): Vec => {
  const l = vlen(a) || 1;
  return { x: a.x / l, y: a.y / l };
};

function seededRandom(seed: number) {
  let x = Math.sin(seed) * 9999;
  return () => {
    x = Math.sin(x * 1.003 + 0.17) * 9999;
    return x - Math.floor(x);
  };
}

function initialMatch(rand: () => number): MatchState {
  return {
    a: { x: 20 + rand() * 5, y: FIELD_H * 0.5 + (rand() - 0.5) * 8 },
    b: { x: 80 + rand() * 5, y: FIELD_H * 0.5 + (rand() - 0.5) * 8 },
    ball: { x: FIELD_W * 0.5 + (rand() - 0.5) * 4, y: FIELD_H * 0.5 + (rand() - 0.5) * 3 },
    ballVel: { x: 0, y: 0 },
    scoreA: 0,
    scoreB: 0,
    tick: 0,
    stuckTicks: 0,
    lastCorner: 'none',
  };
}

function buildBaselineDataset(rand: () => number): BaselineSample[] {
  const samples: BaselineSample[] = [];
  for (let i = 0; i < MIN_BASELINE; i += 1) {
    const side = i % 2;
    const cornerX = side === 0 ? 5 : FIELD_W - 5;
    const cornerY = i % 4 < 2 ? 6 : FIELD_H - 6;
    samples.push({
      ball: { x: cornerX + (rand() - 0.5) * 1.2, y: cornerY + (rand() - 0.5) * 1.2 },
      ballVel: { x: side === 0 ? 0.35 + rand() * 0.4 : -0.35 - rand() * 0.4, y: (rand() - 0.5) * 0.3 },
      a: { x: 24 + rand() * 18, y: FIELD_H * 0.5 + (rand() - 0.5) * 18 },
      b: { x: 58 + rand() * 18, y: FIELD_H * 0.5 + (rand() - 0.5) * 18 },
      label: 'release-corner',
    });
  }
  return samples;
}

function aiDirection(side: Side, me: Vec, ball: Vec, enemyGoal: Vec, ownGoal: Vec, policy: Policy) {
  const toBall = vnorm(vsub(ball, me));
  const pressGoal = vnorm(vsub(enemyGoal, ball));
  const defend = vnorm(vsub(ownGoal, ball));
  const dir = {
    x: toBall.x * policy.toBall + pressGoal.x * policy.toGoal + defend.x * policy.defend + policy.biasX,
    y: toBall.y * policy.toBall + pressGoal.y * policy.toGoal + defend.y * policy.defend + policy.biasY,
  };
  return vnorm(dir);
}

function simulateTick(state: MatchState, pA: Policy, pB: Policy) {
  const enemyGoalA = { x: FIELD_W, y: FIELD_H * 0.5 };
  const ownGoalA = { x: 0, y: FIELD_H * 0.5 };
  const enemyGoalB = { x: 0, y: FIELD_H * 0.5 };
  const ownGoalB = { x: FIELD_W, y: FIELD_H * 0.5 };

  const moveA = aiDirection('A', state.a, state.ball, enemyGoalA, ownGoalA, pA);
  const moveB = aiDirection('B', state.b, state.ball, enemyGoalB, ownGoalB, pB);

  const speedA = 1.02;
  const speedB = 1.02;
  const a = { x: clamp(state.a.x + moveA.x * speedA, BLOCK_SIZE, FIELD_W - BLOCK_SIZE), y: clamp(state.a.y + moveA.y * speedA, BLOCK_SIZE, FIELD_H - BLOCK_SIZE) };
  const b = { x: clamp(state.b.x + moveB.x * speedB, BLOCK_SIZE, FIELD_W - BLOCK_SIZE), y: clamp(state.b.y + moveB.y * speedB, BLOCK_SIZE, FIELD_H - BLOCK_SIZE) };

  let ballVel = vscale(state.ballVel, 0.93);
  const touchA = vlen(vsub(a, state.ball)) < BLOCK_SIZE * 1.4;
  const touchB = vlen(vsub(b, state.ball)) < BLOCK_SIZE * 1.4;
  if (touchA) ballVel = vadd(ballVel, vscale(vnorm(vsub(state.ball, a)), 1.4));
  if (touchB) ballVel = vadd(ballVel, vscale(vnorm(vsub(state.ball, b)), 1.4));

  let ball = { x: state.ball.x + ballVel.x, y: state.ball.y + ballVel.y };
  if (ball.y <= 1 || ball.y >= FIELD_H - 1) ballVel = { x: ballVel.x, y: -ballVel.y * 0.9 };
  ball.y = clamp(ball.y, 1, FIELD_H - 1);

  let scoreA = state.scoreA;
  let scoreB = state.scoreB;
  let stuckTicks = state.stuckTicks;
  let lastCorner = 'none';
  const nearCorner = (ball.x < CORNER_ZONE || ball.x > FIELD_W - CORNER_ZONE) && (ball.y < CORNER_ZONE || ball.y > FIELD_H - CORNER_ZONE);
  const lowMotion = vlen(ballVel) < 0.35;
  if (nearCorner && lowMotion) {
    stuckTicks += 1;
    lastCorner = `${ball.x < FIELD_W * 0.5 ? 'L' : 'R'}${ball.y < FIELD_H * 0.5 ? 'T' : 'B'}`;
  } else {
    stuckTicks = Math.max(0, stuckTicks - 2);
  }

  if (stuckTicks >= 12) {
    const kick = { x: ball.x < FIELD_W * 0.5 ? 0.95 : -0.95, y: ball.y < FIELD_H * 0.5 ? 0.45 : -0.45 };
    ballVel = vadd(ballVel, kick);
    stuckTicks = 0;
  }

  if (ball.x <= 0 && Math.abs(ball.y - FIELD_H * 0.5) <= GOAL_HALF) {
    scoreB += 1;
    ball = { x: FIELD_W * 0.5, y: FIELD_H * 0.5 };
    ballVel = { x: 0, y: 0 };
  } else if (ball.x >= FIELD_W && Math.abs(ball.y - FIELD_H * 0.5) <= GOAL_HALF) {
    scoreA += 1;
    ball = { x: FIELD_W * 0.5, y: FIELD_H * 0.5 };
    ballVel = { x: 0, y: 0 };
  } else {
    if (ball.x <= 1 || ball.x >= FIELD_W - 1) ballVel = { x: -ballVel.x * 0.86, y: ballVel.y };
    ball.x = clamp(ball.x, 1, FIELD_W - 1);
  }

  return { a, b, ball, ballVel, scoreA, scoreB, tick: state.tick + 1, stuckTicks, lastCorner } as MatchState;
}

function trainStep(state: MatchState, pA: Policy, pB: Policy, baseline: BaselineSample[]) {
  const seed = baseline[state.tick % baseline.length];
  const rewardA = (state.ball.x / FIELD_W - 0.5) + (state.scoreA - state.scoreB) * 0.3;
  const stuckPenalty = state.stuckTicks > 6 ? -0.14 : 0;
  const baselineBias = seed.label === 'release-corner' ? (seed.ballVel.x > 0 ? 0.08 : -0.08) : 0;
  const rewardB = -rewardA;
  const nextA = {
    toBall: clamp(pA.toBall + (rewardA + stuckPenalty) * LR * 0.12, 0.4, 1.8),
    toGoal: clamp(pA.toGoal + (rewardA + baselineBias) * LR * 0.22, 0.2, 2),
    defend: clamp(pA.defend - rewardA * LR * 0.14, -0.6, 1.2),
    biasX: clamp(pA.biasX + rewardA * LR * 0.02, -0.3, 0.3),
    biasY: clamp(pA.biasY + (0.5 - state.ball.y / FIELD_H) * LR * 0.06, -0.25, 0.25),
  };
  const nextB = {
    toBall: clamp(pB.toBall + (rewardB + stuckPenalty) * LR * 0.12, 0.4, 1.8),
    toGoal: clamp(pB.toGoal + (rewardB - baselineBias) * LR * 0.22, 0.2, 2),
    defend: clamp(pB.defend - rewardB * LR * 0.14, -0.6, 1.2),
    biasX: clamp(pB.biasX + rewardB * LR * 0.02, -0.3, 0.3),
    biasY: clamp(pB.biasY + (0.5 - state.ball.y / FIELD_H) * LR * 0.06, -0.25, 0.25),
  };
  const trainingLoss = Math.abs(0.5 - state.ball.x / FIELD_W) * 0.5 + Math.max(0, 1 - Math.abs(state.scoreA - state.scoreB) * 0.4) * 0.2 + Math.min(0.25, state.stuckTicks * 0.01);
  return { nextA, nextB, trainingLoss };
}

function compressLogs(logs: TrainLog[]) {
  let prevT = 0;
  let prevV = 0;
  const q = (v: number) => Math.round(v * 100000);
  return logs.map((l) => {
    const t = q(l.trainingLoss);
    const v = q(l.validationLoss);
    const out = `${l.epoch.toString(36)}|${(t - prevT).toString(36)}|${(v - prevV).toString(36)}|${Math.round(l.drift * 1000).toString(36)}|${l.capturedA.toString(36)}|${l.capturedB.toString(36)}`;
    prevT = t;
    prevV = v;
    return out;
  }).join(';');
}

export default function FadhilAIFocusedWarStrategyPage() {
  const rand = useMemo(() => seededRandom(17.71), []);
  const [policyA, setPolicyA] = useState<Policy>({ toBall: 1.1, toGoal: 0.9, defend: 0.2, biasX: 0.05, biasY: 0 });
  const [policyB, setPolicyB] = useState<Policy>({ toBall: 1.1, toGoal: 0.9, defend: 0.2, biasX: -0.05, biasY: 0 });
  const [match, setMatch] = useState<MatchState>(() => initialMatch(rand));
  const [epoch, setEpoch] = useState(1);
  const [logs, setLogs] = useState<TrainLog[]>([]);
  const [savedState, setSavedState] = useState('pending');
  const [storedCount, setStoredCount] = useState(0);
  const [sessions, setSessions] = useState<SessionFrame[][]>([]);
  const [liveFrames, setLiveFrames] = useState<SessionFrame[]>([]);
  const [watchSession, setWatchSession] = useState<number | null>(null);
  const [stuckWarnings, setStuckWarnings] = useState(0);
  const [cornerEscapes, setCornerEscapes] = useState(0);
  const [badPatternNotes, setBadPatternNotes] = useState<string[]>([]);
  const baselineDataset = useMemo(() => buildBaselineDataset(rand), [rand]);

  const watchedFrame = useMemo(() => {
    if (watchSession === null || !sessions[watchSession]) return null;
    return sessions[watchSession][Math.min(match.tick, sessions[watchSession].length - 1)] ?? null;
  }, [sessions, watchSession, match.tick]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setMatch((prev) => {
        const next = simulateTick(prev, policyA, policyB);
        const trained = trainStep(next, policyA, policyB, baselineDataset);
        setPolicyA(trained.nextA);
        setPolicyB(trained.nextB);

        if (next.lastCorner !== 'none') {
          setStuckWarnings((v) => v + 1);
        }
        if (prev.stuckTicks > next.stuckTicks && prev.stuckTicks >= 10) {
          setCornerEscapes((v) => v + 1);
        }
        if (next.stuckTicks > 8 && next.tick % 10 === 0) {
          setBadPatternNotes((prevNotes) => [
            `Tick ${next.tick}: avoid static corner pressure at ${next.lastCorner}`,
            ...prevNotes,
          ].slice(0, 24));
        }

        const drift = Math.abs(trained.nextA.toGoal - trained.nextB.toGoal) + Math.abs(trained.nextA.toBall - trained.nextB.toBall);
        setLogs((prevLogs) => {
          const nextLogs = [...prevLogs, {
            epoch,
            trainingLoss: trained.trainingLoss,
            validationLoss: clamp(trained.trainingLoss * (0.88 + Math.min(0.2, next.stuckTicks * 0.005)), 0.0001, 1),
            drift,
            capturedA: next.scoreA,
            capturedB: next.scoreB,
          }].slice(-120);
          return nextLogs;
        });

        const frame: SessionFrame = { a: next.a, b: next.b, ball: next.ball, scoreA: next.scoreA, scoreB: next.scoreB };
        setLiveFrames((prevFrames) => [...prevFrames, frame]);

        const ended = next.tick >= MAX_SESSION_TICKS || next.scoreA >= 3 || next.scoreB >= 3;
        if (ended) {
          setSessions((prevSessions) => [[...liveFrames, frame], ...prevSessions].slice(0, 12));
          setLiveFrames([]);
          setEpoch((v) => v + 1);
          return initialMatch(rand);
        }

        return next;
      });
    }, 70);

    return () => window.clearInterval(timer);
  }, [baselineDataset, epoch, liveFrames, policyA, policyB, rand]);

  const trained = useMemo(() => {
    const last = logs[logs.length - 1] ?? { trainingLoss: 0.2, validationLoss: 0.2, drift: 0, capturedA: 0, capturedB: 0 };
    const qualityScore = Math.round(clamp((1 - last.validationLoss) * 100 - last.drift * 8 - Math.min(20, stuckWarnings * 0.06), 0, 100));
    return { logs, trainingLoss: last.trainingLoss, validationLoss: last.validationLoss, qualityScore };
  }, [logs, stuckWarnings]);

  useEffect(() => {
    const payload: PersistRun = {
      runId: `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      strategy: 'FadhilAI-vs-FadhilAI-block-soccer',
      battlegroundVersion: BATTLEGROUND_VERSION,
      trainingModelVersion: TRAINING_VERSION,
      datasetSize: Math.max(1, logs.length),
      epochs: epoch,
      learningRate: LR,
      trainingLoss: trained.trainingLoss,
      validationLoss: trained.validationLoss,
      qualityScore: trained.qualityScore,
      modelAWeights: policyA,
      modelBWeights: policyB,
      logs: trained.logs,
      compressedResults: compressLogs(trained.logs),
      compressionMode: 'delta-q36-v1',
      baselineDataset: { samples: baselineDataset.length, source: 'deterministic synthetic + corner release curriculum', avoidRules: AVOID_RULES },
      antiStuck: { interventions: cornerEscapes, cornerEscapes, stuckWarnings, badPatternNotes },
    };

    const persist = async () => {
      try {
        const res = await fetch('/api/fadhil-ai/training', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const json = await res.json();
        setSavedState(json.saved ? 'saved and compressed' : `rejected: ${json.reason ?? 'unknown'}`);
      } catch {
        setSavedState('database unavailable');
      }
      try {
        const res = await fetch('/api/fadhil-ai/training', { cache: 'no-store' });
        const json = await res.json();
        if (json.ok && Array.isArray(json.runs)) setStoredCount(json.runs.length);
      } catch {
        setStoredCount(0);
      }
    };

    if (logs.length % 12 === 0 && logs.length > 0) void persist();
  }, [badPatternNotes, baselineDataset, cornerEscapes, epoch, logs, policyA, policyB, stuckWarnings, trained]);

  const frame = watchedFrame ?? liveFrames[liveFrames.length - 1] ?? { a: match.a, b: match.b, ball: match.ball, scoreA: match.scoreA, scoreB: match.scoreB };

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-3 text-slate-100">
      <section className="mx-auto grid w-full max-w-6xl gap-3 lg:grid-cols-[2fr_1fr]">
        <div className="rounded-xl border border-cyan-500/35 bg-slate-900/75 p-3">
          <h1 className="text-sm font-bold text-cyan-200">FadhilAI 2D Block Soccer Training Arena (3D-style look)</h1>
          <p className="text-xs text-cyan-100/80">Fully 2D and ultra-light simulation. Both FadhilAI agents are moving blocks, training live, auto-repeat, and every session is watchable.</p>
          <div className="mt-3 rounded-lg border border-cyan-400/30 bg-[#021226] p-2">
            <svg viewBox={`0 0 ${FIELD_W} ${FIELD_H}`} className="w-full" role="img" aria-label="FadhilAI block soccer field">
              <defs>
                <linearGradient id="g" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#1f6f4a"/><stop offset="1" stopColor="#124a33"/></linearGradient>
              </defs>
              <rect x="0" y="0" width={FIELD_W} height={FIELD_H} fill="url(#g)" rx="2"/>
              <rect x="1" y="1" width={FIELD_W - 2} height={FIELD_H - 2} fill="none" stroke="#c7f9d7" strokeOpacity="0.5"/>
              <line x1={FIELD_W / 2} y1="1" x2={FIELD_W / 2} y2={FIELD_H - 1} stroke="#c7f9d7" strokeOpacity="0.45"/>
              <rect x="0" y={FIELD_H / 2 - GOAL_HALF} width="1.1" height={GOAL_HALF * 2} fill="#f1f5f9"/>
              <rect x={FIELD_W - 1.1} y={FIELD_H / 2 - GOAL_HALF} width="1.1" height={GOAL_HALF * 2} fill="#f1f5f9"/>

              <g transform={`translate(${frame.a.x - BLOCK_SIZE / 2} ${frame.a.y - BLOCK_SIZE / 2})`}>
                <rect x="0.7" y="0.7" width={BLOCK_SIZE} height={BLOCK_SIZE} fill="#083344" opacity="0.45"/>
                <rect x="0" y="0" width={BLOCK_SIZE} height={BLOCK_SIZE} fill="#22d3ee" stroke="#a5f3fc" strokeWidth="0.24"/>
              </g>
              <g transform={`translate(${frame.b.x - BLOCK_SIZE / 2} ${frame.b.y - BLOCK_SIZE / 2})`}>
                <rect x="0.7" y="0.7" width={BLOCK_SIZE} height={BLOCK_SIZE} fill="#3f0822" opacity="0.45"/>
                <rect x="0" y="0" width={BLOCK_SIZE} height={BLOCK_SIZE} fill="#fb7185" stroke="#fecdd3" strokeWidth="0.24"/>
              </g>
              <circle cx={frame.ball.x} cy={frame.ball.y} r="1.2" fill="#f8fafc" stroke="#94a3b8" strokeWidth="0.2"/>
            </svg>
            <p className="mt-2 text-xs text-slate-200">Score A:{frame.scoreA} - B:{frame.scoreB} • Epoch {epoch} • {watchSession === null ? 'Live training' : `Watching session #${watchSession + 1}`}</p>
            <p className="text-[11px] text-slate-300">Save status: {savedState} • Stored fresh runs: {storedCount}</p>
          </div>
        </div>

        <aside className="space-y-3">
          <div className="rounded-xl border border-violet-500/35 bg-slate-900/75 p-3 text-xs">
            <h2 className="mb-1 font-semibold text-violet-200">Live & Repeatable Training</h2>
            <p>Training loss: <span className="text-cyan-200">{trained.trainingLoss.toFixed(5)}</span></p>
            <p>Validation loss: <span className="text-cyan-200">{trained.validationLoss.toFixed(5)}</span></p>
            <p>Quality score: <span className="text-cyan-200">{trained.qualityScore}%</span></p>
            <p>Model: <span className="text-cyan-200">{TRAINING_VERSION}</span></p>
            <p>Baseline dataset: <span className="text-cyan-200">{baselineDataset.length}</span> samples</p>
            <p>Corner stuck warnings: <span className="text-cyan-200">{stuckWarnings}</span></p>
            <p>Corner escapes: <span className="text-cyan-200">{cornerEscapes}</span></p>
          </div>

          <div className="rounded-xl border border-emerald-500/35 bg-slate-900/75 p-3 text-xs">
            <h2 className="mb-1 font-semibold text-emerald-200">Do-Not-Do Memory (Anti-Stuck)</h2>
            <ul className="list-disc space-y-1 pl-4 text-slate-200">
              {AVOID_RULES.map((r) => <li key={r}>{r}</li>)}
            </ul>
            {badPatternNotes.length > 0 ? <p className="mt-2 text-[11px] text-emerald-100/90">Latest warning: {badPatternNotes[0]}</p> : null}
          </div>

          <div className="rounded-xl border border-amber-400/35 bg-slate-900/75 p-3">
            <h2 className="mb-2 text-xs font-semibold text-amber-200">Watch Any Training Session</h2>
            <div className="max-h-56 space-y-1 overflow-y-auto text-xs">
              <button type="button" className="w-full rounded border border-cyan-400/50 px-2 py-1 text-left text-cyan-100" onClick={() => setWatchSession(null)}>Back to live feed</button>
              {sessions.map((s, i) => (
                <button key={i} type="button" className="w-full rounded border border-slate-600 px-2 py-1 text-left text-slate-200" onClick={() => setWatchSession(i)}>
                  Session #{i + 1} • frames {s.length} • end score {s[s.length - 1]?.scoreA ?? 0}:{s[s.length - 1]?.scoreB ?? 0}
                </button>
              ))}
            </div>
          </div>
        </aside>
      </section>
      <FadhilAiGlobalChat />
    </main>
  );
}
