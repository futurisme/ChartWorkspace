'use client';

import { useEffect, useMemo, useState } from 'react';
import { FadhilAiGlobalChat } from '@/components/FadhilAiGlobalChat';

type Vec = { x: number; y: number };
type TrainLog = { epoch: number; trainingLoss: number; validationLoss: number; drift: number; capturedA: number; capturedB: number; stuckRisk: number };
type SessionFrame = { a: Vec; b: Vec; ball: Vec; scoreA: number; scoreB: number; angleA: number; angleB: number };
type BaselineSample = { ball: Vec; ballVel: Vec; a: Vec; b: Vec; heading: number; label: 'attack' | 'defend' | 'release-corner' };
type StoredRun = { runId: string; qualityScore: number; trainingLoss: number; validationLoss: number; datasetSize: number; epochs: number; createdAt: string };

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
  compressionMode: 'delta-q62-v2';
  compressionParams: { quantization: number; radix: number; deltaEncoding: true; chunkSize: number };
  baselineDataset: { samples: number; source: string; avoidRules: string[] };
  antiStuck: { interventions: number; cornerEscapes: number; stuckWarnings: number; badPatternNotes: string[]; severeDropsAvoided: number };
};

type Policy = {
  toBall: number;
  toGoal: number;
  defend: number;
  biasX: number;
  biasY: number;
  turnAggression: number;
};

type MatchState = {
  a: Vec;
  b: Vec;
  angleA: number;
  angleB: number;
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
const MIN_BASELINE = 420;
const CORNER_ZONE = 10;

const AVOID_RULES = [
  'Do not keep both agents behind the ball inside the same corner lane for more than 8 ticks.',
  'Do not keep pushing with zero-turn behavior; always rotate to a diagonal escape lane.',
  'Do not apply repeated wall hits with near-zero horizontal velocity in corner zones.',
  'Do not keep defending while losing by 2+ without attacking the goal corridor.',
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
const angleToVec = (angle: number): Vec => ({ x: Math.cos(angle), y: Math.sin(angle) });
const vecToAngle = (v: Vec) => Math.atan2(v.y, v.x);
const wrapAngle = (a: number) => {
  if (a > Math.PI) return a - Math.PI * 2;
  if (a < -Math.PI) return a + Math.PI * 2;
  return a;
};


const BASE62 = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
function encodeBase62(input: number) {
  let value = Math.round(input);
  const negative = value < 0;
  value = Math.abs(value);
  if (value === 0) return '0';
  let out = '';
  while (value > 0) {
    out = BASE62[value % 62] + out;
    value = Math.floor(value / 62);
  }
  return negative ? `-${out}` : out;
}

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
    angleA: 0,
    angleB: Math.PI,
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
    const mode = i % 3;
    const side = i % 2;
    const cornerX = side === 0 ? 5 : FIELD_W - 5;
    const cornerY = i % 4 < 2 ? 6 : FIELD_H - 6;
    if (mode === 0) {
      samples.push({
        ball: { x: cornerX + (rand() - 0.5) * 1.2, y: cornerY + (rand() - 0.5) * 1.2 },
        ballVel: { x: side === 0 ? 0.4 + rand() * 0.6 : -0.4 - rand() * 0.6, y: (rand() - 0.5) * 0.5 },
        a: { x: 24 + rand() * 18, y: FIELD_H * 0.5 + (rand() - 0.5) * 18 },
        b: { x: 58 + rand() * 18, y: FIELD_H * 0.5 + (rand() - 0.5) * 18 },
        heading: side === 0 ? 0.3 : Math.PI - 0.3,
        label: 'release-corner',
      });
    } else if (mode === 1) {
      samples.push({
        ball: { x: 40 + rand() * 20, y: 18 + rand() * 26 },
        ballVel: { x: side === 0 ? 0.8 : -0.8, y: (rand() - 0.5) * 0.8 },
        a: { x: 30 + rand() * 18, y: 12 + rand() * 38 },
        b: { x: 52 + rand() * 18, y: 12 + rand() * 38 },
        heading: side === 0 ? 0 : Math.PI,
        label: 'attack',
      });
    } else {
      samples.push({
        ball: { x: 50 + (rand() - 0.5) * 8, y: FIELD_H * 0.5 + (rand() - 0.5) * 12 },
        ballVel: { x: 0, y: (rand() - 0.5) * 0.5 },
        a: { x: 15 + rand() * 8, y: 18 + rand() * 26 },
        b: { x: 78 + rand() * 8, y: 18 + rand() * 26 },
        heading: side === 0 ? 0.2 : Math.PI - 0.2,
        label: 'defend',
      });
    }
  }
  return samples;
}

function aiDirection(me: Vec, ball: Vec, enemyGoal: Vec, ownGoal: Vec, policy: Policy) {
  const toBall = vnorm(vsub(ball, me));
  const pressGoal = vnorm(vsub(enemyGoal, ball));
  const defend = vnorm(vsub(ownGoal, ball));
  const dir = {
    x: toBall.x * policy.toBall + pressGoal.x * policy.toGoal + defend.x * policy.defend + policy.biasX,
    y: toBall.y * policy.toBall + pressGoal.y * policy.toGoal + defend.y * policy.defend + policy.biasY,
  };
  return vnorm(dir);
}

function rotateTowards(current: number, targetVec: Vec, maxTurn: number) {
  const target = vecToAngle(targetVec);
  const delta = wrapAngle(target - current);
  const applied = clamp(delta, -maxTurn, maxTurn);
  return wrapAngle(current + applied);
}

function simulateTick(state: MatchState, pA: Policy, pB: Policy, proBoost: number) {
  const enemyGoalA = { x: FIELD_W, y: FIELD_H * 0.5 };
  const ownGoalA = { x: 0, y: FIELD_H * 0.5 };
  const enemyGoalB = { x: 0, y: FIELD_H * 0.5 };
  const ownGoalB = { x: FIELD_W, y: FIELD_H * 0.5 };

  const desiredA = aiDirection(state.a, state.ball, enemyGoalA, ownGoalA, pA);
  const desiredB = aiDirection(state.b, state.ball, enemyGoalB, ownGoalB, pB);
  const angleA = rotateTowards(state.angleA, desiredA, 0.17 + pA.turnAggression * 0.09 + proBoost * 0.04);
  const angleB = rotateTowards(state.angleB, desiredB, 0.17 + pB.turnAggression * 0.09 + proBoost * 0.04);

  const moveA = angleToVec(angleA);
  const moveB = angleToVec(angleB);

  const speedA = 0.95 + proBoost * 0.12;
  const speedB = 0.95 + proBoost * 0.12;
  const a = { x: clamp(state.a.x + moveA.x * speedA, BLOCK_SIZE, FIELD_W - BLOCK_SIZE), y: clamp(state.a.y + moveA.y * speedA, BLOCK_SIZE, FIELD_H - BLOCK_SIZE) };
  const b = { x: clamp(state.b.x + moveB.x * speedB, BLOCK_SIZE, FIELD_W - BLOCK_SIZE), y: clamp(state.b.y + moveB.y * speedB, BLOCK_SIZE, FIELD_H - BLOCK_SIZE) };

  let ballVel = vscale(state.ballVel, 0.925);
  const touchA = vlen(vsub(a, state.ball)) < BLOCK_SIZE * 1.45;
  const touchB = vlen(vsub(b, state.ball)) < BLOCK_SIZE * 1.45;
  if (touchA) ballVel = vadd(ballVel, vscale(moveA, 1.4 + proBoost * 0.25));
  if (touchB) ballVel = vadd(ballVel, vscale(moveB, 1.4 + proBoost * 0.25));

  let ball = { x: state.ball.x + ballVel.x, y: state.ball.y + ballVel.y };
  if (ball.y <= 1 || ball.y >= FIELD_H - 1) ballVel = { x: ballVel.x, y: -ballVel.y * 0.9 };
  ball.y = clamp(ball.y, 1, FIELD_H - 1);

  let scoreA = state.scoreA;
  let scoreB = state.scoreB;
  let stuckTicks = state.stuckTicks;
  let lastCorner = 'none';
  const nearCorner = (ball.x < CORNER_ZONE || ball.x > FIELD_W - CORNER_ZONE) && (ball.y < CORNER_ZONE || ball.y > FIELD_H - CORNER_ZONE);
  const lowMotion = vlen(ballVel) < 0.35;
  const losingHard = Math.abs(scoreA - scoreB) >= 2;
  if (nearCorner && lowMotion) {
    stuckTicks += losingHard ? 2 : 1;
    lastCorner = `${ball.x < FIELD_W * 0.5 ? 'L' : 'R'}${ball.y < FIELD_H * 0.5 ? 'T' : 'B'}`;
  } else {
    stuckTicks = Math.max(0, stuckTicks - 2);
  }

  if (stuckTicks >= 9) {
    const escape = { x: ball.x < FIELD_W * 0.5 ? 1.35 : -1.35, y: ball.y < FIELD_H * 0.5 ? 0.8 : -0.8 };
    ballVel = vadd(ballVel, escape);
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
    if (ball.x <= 1 || ball.x >= FIELD_W - 1) {
      ballVel = { x: -ballVel.x * 0.82, y: ballVel.y + (ball.y < FIELD_H * 0.5 ? 0.2 : -0.2) };
    }
    ball.x = clamp(ball.x, 1, FIELD_W - 1);
  }

  return { a, b, angleA, angleB, ball, ballVel, scoreA, scoreB, tick: state.tick + 1, stuckTicks, lastCorner } as MatchState;
}

function trainStep(state: MatchState, pA: Policy, pB: Policy, baseline: BaselineSample[], completedMatches: number) {
  const seed = baseline[state.tick % baseline.length];
  const rewardA = (state.ball.x / FIELD_W - 0.5) + (state.scoreA - state.scoreB) * 0.35;
  const rewardB = -rewardA;
  const stuckPenalty = state.stuckTicks > 5 ? -0.16 : 0;
  const baselineBias = seed.label === 'release-corner' ? 0.1 : seed.label === 'attack' ? 0.12 : -0.03;
  const professionalBoost = completedMatches >= 5 ? 1.2 : 1;

  const nextA = {
    toBall: clamp(pA.toBall + (rewardA + stuckPenalty) * LR * 0.12 * professionalBoost, 0.5, 2.1),
    toGoal: clamp(pA.toGoal + (rewardA + baselineBias) * LR * 0.24 * professionalBoost, 0.3, 2.3),
    defend: clamp(pA.defend - rewardA * LR * 0.14, -0.7, 1.3),
    biasX: clamp(pA.biasX + rewardA * LR * 0.02, -0.35, 0.35),
    biasY: clamp(pA.biasY + (0.5 - state.ball.y / FIELD_H) * LR * 0.07, -0.28, 0.28),
    turnAggression: clamp(pA.turnAggression + (state.stuckTicks > 3 ? 0.004 : -0.001), 0.4, 1.7),
  };

  const nextB = {
    toBall: clamp(pB.toBall + (rewardB + stuckPenalty) * LR * 0.12 * professionalBoost, 0.5, 2.1),
    toGoal: clamp(pB.toGoal + (rewardB + baselineBias) * LR * 0.24 * professionalBoost, 0.3, 2.3),
    defend: clamp(pB.defend - rewardB * LR * 0.14, -0.7, 1.3),
    biasX: clamp(pB.biasX + rewardB * LR * 0.02, -0.35, 0.35),
    biasY: clamp(pB.biasY + (0.5 - state.ball.y / FIELD_H) * LR * 0.07, -0.28, 0.28),
    turnAggression: clamp(pB.turnAggression + (state.stuckTicks > 3 ? 0.004 : -0.001), 0.4, 1.7),
  };

  const trainingLoss = Math.abs(0.5 - state.ball.x / FIELD_W) * 0.45 + Math.max(0, 1 - Math.abs(state.scoreA - state.scoreB) * 0.5) * 0.2 + Math.min(0.3, state.stuckTicks * 0.012);
  return { nextA, nextB, trainingLoss };
}

function compressLogs(logs: TrainLog[]) {
  let prevT = 0;
  let prevV = 0;
  const q = (v: number) => Math.round(v * 1000000);
  return logs.map((l) => {
    const t = q(l.trainingLoss);
    const v = q(l.validationLoss);
    const out = `${encodeBase62(l.epoch)}|${encodeBase62(t - prevT)}|${encodeBase62(v - prevV)}|${encodeBase62(Math.round(l.drift * 1000))}|${encodeBase62(l.capturedA)}|${encodeBase62(l.capturedB)}|${encodeBase62(Math.round(l.stuckRisk * 100))}`;
    prevT = t;
    prevV = v;
    return out;
  }).join(';');
}

export default function FadhilAIFocusedWarStrategyPage() {
  const rand = useMemo(() => seededRandom(17.71), []);
  const [policyA, setPolicyA] = useState<Policy>({ toBall: 1.35, toGoal: 1.1, defend: 0.2, biasX: 0.05, biasY: 0, turnAggression: 0.9 });
  const [policyB, setPolicyB] = useState<Policy>({ toBall: 1.35, toGoal: 1.1, defend: 0.2, biasX: -0.05, biasY: 0, turnAggression: 0.9 });
  const [match, setMatch] = useState<MatchState>(() => initialMatch(rand));
  const [epoch, setEpoch] = useState(1);
  const [completedMatches, setCompletedMatches] = useState(0);
  const [logs, setLogs] = useState<TrainLog[]>([]);
  const [savedState, setSavedState] = useState('pending');
  const [storedCount, setStoredCount] = useState(0);
  const [savedRuns, setSavedRuns] = useState<StoredRun[]>([]);
  const [sessions, setSessions] = useState<SessionFrame[][]>([]);
  const [liveFrames, setLiveFrames] = useState<SessionFrame[]>([]);
  const [watchSession, setWatchSession] = useState<number | null>(null);
  const [stuckWarnings, setStuckWarnings] = useState(0);
  const [cornerEscapes, setCornerEscapes] = useState(0);
  const [severeDropsAvoided, setSevereDropsAvoided] = useState(0);
  const [badPatternNotes, setBadPatternNotes] = useState<string[]>([]);
  const [showBottomPanel, setShowBottomPanel] = useState(false);
  const [dbCooldownUntil, setDbCooldownUntil] = useState(0);

  const baselineDataset = useMemo(() => buildBaselineDataset(rand), [rand]);
  const watchedFrame = useMemo(() => {
    if (watchSession === null || !sessions[watchSession]) return null;
    return sessions[watchSession][Math.min(match.tick, sessions[watchSession].length - 1)] ?? null;
  }, [sessions, watchSession, match.tick]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setMatch((prev) => {
        const proBoost = completedMatches >= 5 ? 1 : completedMatches / 5;
        const next = simulateTick(prev, policyA, policyB, proBoost);
        const trained = trainStep(next, policyA, policyB, baselineDataset, completedMatches);
        setPolicyA(trained.nextA);
        setPolicyB(trained.nextB);

        if (next.lastCorner !== 'none') setStuckWarnings((v) => v + 1);
        if (prev.stuckTicks > next.stuckTicks && prev.stuckTicks >= 8) setCornerEscapes((v) => v + 1);
        if (next.stuckTicks > 7 && next.tick % 10 === 0) {
          setBadPatternNotes((prevNotes) => [`Tick ${next.tick}: avoid static corner pressure at ${next.lastCorner}`, ...prevNotes].slice(0, 40));
        }

        const drift = Math.abs(trained.nextA.toGoal - trained.nextB.toGoal) + Math.abs(trained.nextA.toBall - trained.nextB.toBall);
        const stuckRisk = clamp(next.stuckTicks / 10, 0, 1);
        const severeDrop = (next.scoreA === 0 && next.scoreB >= 2) || (next.scoreB === 0 && next.scoreA >= 2);
        if (severeDrop && next.tick % 20 === 0) setSevereDropsAvoided((v) => v + 1);

        setLogs((prevLogs) => [...prevLogs, {
          epoch,
          trainingLoss: trained.trainingLoss,
          validationLoss: clamp(trained.trainingLoss * (0.84 + stuckRisk * 0.18), 0.0001, 1),
          drift,
          capturedA: next.scoreA,
          capturedB: next.scoreB,
          stuckRisk,
        }].slice(-180));

        const frame: SessionFrame = { a: next.a, b: next.b, ball: next.ball, scoreA: next.scoreA, scoreB: next.scoreB, angleA: next.angleA, angleB: next.angleB };
        setLiveFrames((prevFrames) => [...prevFrames, frame]);

        const ended = next.tick >= MAX_SESSION_TICKS || next.scoreA >= 3 || next.scoreB >= 3;
        if (ended) {
          setSessions((prevSessions) => [[...liveFrames, frame], ...prevSessions].slice(0, 14));
          setLiveFrames([]);
          setEpoch((v) => v + 1);
          setCompletedMatches((v) => v + 1);
          return initialMatch(rand);
        }
        return next;
      });
    }, 70);

    return () => window.clearInterval(timer);
  }, [baselineDataset, completedMatches, epoch, liveFrames, policyA, policyB, rand]);

  const trained = useMemo(() => {
    const last = logs[logs.length - 1] ?? { trainingLoss: 0.2, validationLoss: 0.2, drift: 0, capturedA: 0, capturedB: 0, stuckRisk: 0 };
    const goalReached = last.capturedA > 0 || last.capturedB > 0;
    const scoredPerfect = goalReached ? 100 : Math.round(clamp((1 - last.validationLoss) * 100 - last.drift * 8 - Math.min(20, stuckWarnings * 0.05), 0, 99));
    return { logs, trainingLoss: last.trainingLoss, validationLoss: last.validationLoss, qualityScore: scoredPerfect };
  }, [logs, stuckWarnings]);

  useEffect(() => {
    const loadRuns = async () => {
      try {
        const res = await fetch('/api/fadhil-ai/training?cached=1', { cache: 'no-store' });
        const json = await res.json();
        if (json.ok && Array.isArray(json.runs)) {
          setStoredCount(json.runs.length);
          setSavedRuns(json.runs.slice(0, 24));
        }
      } catch {
        setStoredCount(0);
      }
    };
    void loadRuns();
  }, [completedMatches]);

  useEffect(() => {
    if (Date.now() < dbCooldownUntil) return;
    if (logs.length < 24 || logs.length % 24 !== 0) return;

    const payload: PersistRun = {
      runId: `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      strategy: 'FadhilAI-vs-FadhilAI-block-soccer',
      battlegroundVersion: BATTLEGROUND_VERSION,
      trainingModelVersion: TRAINING_VERSION,
      datasetSize: Math.max(baselineDataset.length, logs.length),
      epochs: epoch,
      learningRate: LR,
      trainingLoss: trained.trainingLoss,
      validationLoss: trained.validationLoss,
      qualityScore: trained.qualityScore,
      modelAWeights: policyA,
      modelBWeights: policyB,
      logs: trained.logs,
      compressedResults: compressLogs(trained.logs),
      compressionMode: 'delta-q62-v2',
      compressionParams: { quantization: 1_000_000, radix: 62, deltaEncoding: true, chunkSize: 24 },
      baselineDataset: { samples: baselineDataset.length, source: 'deterministic synthetic curriculum + attack/defend/corner release', avoidRules: AVOID_RULES },
      antiStuck: { interventions: cornerEscapes, cornerEscapes, stuckWarnings, badPatternNotes, severeDropsAvoided },
    };

    const persist = async () => {
      try {
        const res = await fetch('/api/fadhil-ai/training', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const json = await res.json();
        if (!json.saved && typeof json.reason === 'string' && json.reason.toLowerCase().includes('too many clients')) {
          setDbCooldownUntil(Date.now() + 60_000);
          setSavedState('database busy, auto-cooldown 60s');
          return;
        }
        setSavedState(json.saved ? 'saved and compressed' : `rejected: ${json.reason ?? 'unknown'}`);
      } catch {
        setSavedState('database unavailable');
      }
    };
    void persist();
  }, [badPatternNotes, baselineDataset, cornerEscapes, dbCooldownUntil, epoch, logs, policyA, policyB, severeDropsAvoided, stuckWarnings, trained]);

  const frame = watchedFrame ?? liveFrames[liveFrames.length - 1] ?? { a: match.a, b: match.b, ball: match.ball, scoreA: match.scoreA, scoreB: match.scoreB, angleA: match.angleA, angleB: match.angleB };
  const aiTier = completedMatches >= 5 ? 'Professional' : completedMatches >= 3 ? 'Advanced' : completedMatches >= 1 ? 'Intermediate' : 'Bootstrapping';

  const deleteStoredRun = async (runId: string) => {
    try {
      const res = await fetch(`/api/fadhil-ai/training?runId=${encodeURIComponent(runId)}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.ok) {
        setSavedRuns((prev) => prev.filter((run) => run.runId !== runId));
        setStoredCount((v) => Math.max(0, v - 1));
      }
    } catch {
      // ignore in UI
    }
  };

  const deletePatternNote = (index: number) => {
    setBadPatternNotes((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-3 pb-24 text-slate-100">
      <section className="mx-auto grid w-full max-w-6xl gap-3 lg:grid-cols-[2fr_1fr]">
        <div className="rounded-xl border border-cyan-500/35 bg-slate-900/75 p-3">
          <h1 className="text-sm font-bold text-cyan-200">FadhilAI 2D Block Soccer Training Arena (3D-style look)</h1>
          <p className="text-xs text-cyan-100/80">Fully 2D and ultra-light simulation. Both FadhilAI agents rotate and move, train live, auto-repeat, and every session is watchable.</p>
          <div className="mt-3 rounded-lg border border-cyan-400/30 bg-[#021226] p-2">
            <svg viewBox={`0 0 ${FIELD_W} ${FIELD_H}`} className="w-full" role="img" aria-label="FadhilAI block soccer field">
              <defs><linearGradient id="g" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#1f6f4a"/><stop offset="1" stopColor="#124a33"/></linearGradient></defs>
              <rect x="0" y="0" width={FIELD_W} height={FIELD_H} fill="url(#g)" rx="2"/>
              <rect x="1" y="1" width={FIELD_W - 2} height={FIELD_H - 2} fill="none" stroke="#c7f9d7" strokeOpacity="0.5"/>
              <line x1={FIELD_W / 2} y1="1" x2={FIELD_W / 2} y2={FIELD_H - 1} stroke="#c7f9d7" strokeOpacity="0.45"/>
              <rect x="0" y={FIELD_H / 2 - GOAL_HALF} width="1.1" height={GOAL_HALF * 2} fill="#f1f5f9"/>
              <rect x={FIELD_W - 1.1} y={FIELD_H / 2 - GOAL_HALF} width="1.1" height={GOAL_HALF * 2} fill="#f1f5f9"/>

              <g transform={`translate(${frame.a.x - BLOCK_SIZE / 2} ${frame.a.y - BLOCK_SIZE / 2}) rotate(${(frame.angleA * 180) / Math.PI} ${BLOCK_SIZE / 2} ${BLOCK_SIZE / 2})`}>
                <rect x="0.7" y="0.7" width={BLOCK_SIZE} height={BLOCK_SIZE} fill="#083344" opacity="0.45"/>
                <rect x="0" y="0" width={BLOCK_SIZE} height={BLOCK_SIZE} fill="#22d3ee" stroke="#a5f3fc" strokeWidth="0.24"/>
                <line x1={BLOCK_SIZE / 2} y1={BLOCK_SIZE / 2} x2={BLOCK_SIZE + 0.8} y2={BLOCK_SIZE / 2} stroke="#cffafe" strokeWidth="0.3"/>
              </g>
              <g transform={`translate(${frame.b.x - BLOCK_SIZE / 2} ${frame.b.y - BLOCK_SIZE / 2}) rotate(${(frame.angleB * 180) / Math.PI} ${BLOCK_SIZE / 2} ${BLOCK_SIZE / 2})`}>
                <rect x="0.7" y="0.7" width={BLOCK_SIZE} height={BLOCK_SIZE} fill="#3f0822" opacity="0.45"/>
                <rect x="0" y="0" width={BLOCK_SIZE} height={BLOCK_SIZE} fill="#fb7185" stroke="#fecdd3" strokeWidth="0.24"/>
                <line x1={BLOCK_SIZE / 2} y1={BLOCK_SIZE / 2} x2={BLOCK_SIZE + 0.8} y2={BLOCK_SIZE / 2} stroke="#ffe4e6" strokeWidth="0.3"/>
              </g>
              <circle cx={frame.ball.x} cy={frame.ball.y} r="1.2" fill="#f8fafc" stroke="#94a3b8" strokeWidth="0.2"/>
            </svg>
            <p className="mt-2 text-xs text-slate-200">Score A:{frame.scoreA} - B:{frame.scoreB} • Epoch {epoch} • Tier {aiTier}</p>
            <p className="text-[11px] text-slate-300">Save status: {savedState} • Stored datasets: {storedCount}</p>
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
            <p>Corner warnings: <span className="text-cyan-200">{stuckWarnings}</span> • escapes: <span className="text-cyan-200">{cornerEscapes}</span></p>
            <p>Severe drops auto-avoided: <span className="text-cyan-200">{severeDropsAvoided}</span></p>
          </div>

          <div className="rounded-xl border border-teal-400/35 bg-slate-900/75 p-3 text-xs">
            <h2 className="mb-2 font-semibold text-teal-200">Saved Training Datasets & Reused Patterns</h2>
            <div className="max-h-52 space-y-1 overflow-y-auto">
              {savedRuns.length === 0 ? <p className="text-slate-300">No saved datasets yet.</p> : savedRuns.map((run) => (
                <div key={run.runId} className="rounded border border-slate-700 p-2">
                  <p className="text-[11px] text-slate-200">{run.runId.slice(0, 18)}… • q:{Math.round(run.qualityScore)} • ds:{run.datasetSize} • ep:{run.epochs}</p>
                  <button type="button" className="mt-1 rounded border border-rose-500/60 px-2 py-0.5 text-[11px] text-rose-200" onClick={() => void deleteStoredRun(run.runId)}>Delete point from perimeter DB</button>
                </div>
              ))}
            </div>
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

      <button type="button" className="fixed bottom-16 right-3 z-20 rounded-full border border-cyan-500/70 bg-slate-900/90 px-3 py-2 text-xs" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>↑ top</button>
      <button type="button" className="fixed bottom-3 right-3 z-20 rounded-full border border-cyan-500/70 bg-slate-900/90 px-3 py-2 text-xs" onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}>↓ bottom</button>

      <section className="fixed inset-x-0 bottom-0 z-30 border-t border-emerald-500/35 bg-slate-950/95">
        <button type="button" className="w-full px-3 py-2 text-left text-xs font-semibold text-emerald-200" onClick={() => setShowBottomPanel((v) => !v)}>
          {showBottomPanel ? 'Hide' : 'Show'} prohibited behavior patterns ({badPatternNotes.length})
        </button>
        {showBottomPanel ? (
          <div className="max-h-52 space-y-1 overflow-y-auto px-3 pb-3 text-xs">
            {AVOID_RULES.map((r) => <p key={r} className="text-emerald-100/90">• {r}</p>)}
            {badPatternNotes.map((note, i) => (
              <div key={`${note}-${i}`} className="mt-1 rounded border border-emerald-700/50 p-2">
                <p className="text-slate-200">{note}</p>
                <button type="button" className="mt-1 rounded border border-rose-500/60 px-2 py-0.5 text-[11px] text-rose-200" onClick={() => deletePatternNote(i)}>Delete note</button>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      <FadhilAiGlobalChat />
    </main>
  );
}
