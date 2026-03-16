'use client';

import { useEffect, useMemo, useState } from 'react';
import { FadhilAiGlobalChat } from '@/components/FadhilAiGlobalChat';
import { FadhilAiFaceSystem, type FaceParams } from '@/features/security/shared/fadhil-ai-face-system';

type Cell = 'A' | 'B' | null;
type Board = Cell[];

type DuelSample = {
  board: Board;
  centerControlA: number;
  centerControlB: number;
  mobilityA: number;
  mobilityB: number;
  targetAWin: number;
};

type Weights = { center: number; mobility: number; progress: number; bias: number };
type TrainLog = { epoch: number; trainingLoss: number; validationLoss: number; drift: number; capturedA: number; capturedB: number };

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
  modelAWeights: Weights;
  modelBWeights: Weights;
  logs: TrainLog[];
  compressedResults: string;
};

const BOARD_SIZE = 8;
const BOARD_CELLS = BOARD_SIZE * BOARD_SIZE;
const BATTLEGROUND_VERSION = 'bg-v2-pawn-duel';
const TRAINING_VERSION = 'dual-pawn-v2';

const clamp = (v: number, min = 0, max = 1) => Math.max(min, Math.min(max, v));
const idx = (r: number, c: number) => r * BOARD_SIZE + c;
const centerCols = [3, 4];

const initialFace: FaceParams = {
  eye_open: 0.92, eye_squint: 0.06, gaze_x: 0, gaze_y: 0, mouth_open: 0.08, mouth_smile: 0.28,
  jaw_rotation: 0.04, lip_width: 0.75, lip_height: 0.24, brow_height: -0.06, head_tilt: 0,
  head_shift_x: 0, head_shift_y: 0, breath: 0, blink: 0,
};

function seededRandom(seed: number) {
  let x = Math.sin(seed) * 10000;
  return () => {
    x = Math.sin(x) * 10000;
    return x - Math.floor(x);
  };
}

function createInitialBoard(): Board {
  const b: Board = new Array(BOARD_CELLS).fill(null);
  for (let c = 0; c < BOARD_SIZE; c += 1) {
    b[idx(1, c)] = 'B';
    b[idx(6, c)] = 'A';
  }
  return b;
}

function legalMoves(board: Board, side: 'A' | 'B') {
  const dir = side === 'A' ? -1 : 1;
  const moves: Array<{ from: number; to: number; capture: boolean }> = [];

  for (let r = 0; r < BOARD_SIZE; r += 1) {
    for (let c = 0; c < BOARD_SIZE; c += 1) {
      const from = idx(r, c);
      if (board[from] !== side) continue;
      const nr = r + dir;
      if (nr < 0 || nr >= BOARD_SIZE) continue;

      const forward = idx(nr, c);
      if (board[forward] === null) moves.push({ from, to: forward, capture: false });

      for (const dc of [-1, 1]) {
        const nc = c + dc;
        if (nc < 0 || nc >= BOARD_SIZE) continue;
        const target = idx(nr, nc);
        if (board[target] && board[target] !== side) moves.push({ from, to: target, capture: true });
      }
    }
  }
  return moves;
}

function evaluateBoard(board: Board, side: 'A' | 'B', w: Weights) {
  const enemy = side === 'A' ? 'B' : 'A';
  let center = 0;
  let progress = 0;
  let own = 0;
  let opp = 0;

  for (let r = 0; r < BOARD_SIZE; r += 1) {
    for (let c = 0; c < BOARD_SIZE; c += 1) {
      const piece = board[idx(r, c)];
      if (piece === side) {
        own += 1;
        if (centerCols.includes(c) && (r === 3 || r === 4)) center += 1;
        progress += side === 'A' ? (7 - r) / 7 : r / 7;
      } else if (piece === enemy) {
        opp += 1;
      }
    }
  }

  const mob = legalMoves(board, side).length / 16;
  const material = (own - opp) / 8;
  return w.bias + center * w.center + progress * w.progress + mob * w.mobility + material * 0.1;
}

function applyMove(board: Board, mv: { from: number; to: number }) {
  const next = [...board];
  next[mv.to] = next[mv.from];
  next[mv.from] = null;
  return next;
}

function bestMove(board: Board, side: 'A' | 'B', w: Weights) {
  const moves = legalMoves(board, side);
  if (moves.length === 0) return null;
  let best = moves[0];
  let bestScore = -Infinity;
  for (const mv of moves) {
    const nb = applyMove(board, mv);
    const score = evaluateBoard(nb, side, w) + (mv.capture ? 0.22 : 0);
    if (score > bestScore) {
      bestScore = score;
      best = mv;
    }
  }
  return best;
}

function compressLogs(logs: TrainLog[]) {
  return logs
    .map((l) => `${l.epoch}|${l.trainingLoss.toFixed(5)}|${l.validationLoss.toFixed(5)}|${l.drift.toFixed(3)}|${l.capturedA}|${l.capturedB}`)
    .join(';');
}

function buildTrainingDataset(size = 500) {
  const rand = seededRandom(73.11);
  const data: DuelSample[] = [];

  for (let i = 0; i < size; i += 1) {
    const board = createInitialBoard();
    const jitter = Math.floor(rand() * 7) + 4;
    let mutable = board;

    for (let t = 0; t < jitter; t += 1) {
      const side: 'A' | 'B' = t % 2 === 0 ? 'A' : 'B';
      const mv = bestMove(mutable, side, { center: 0.16, mobility: 0.1, progress: 0.24, bias: 0.08 });
      if (!mv) break;
      mutable = applyMove(mutable, mv);
    }

    const centerControlA = mutable.reduce((acc, v, j) => (v === 'A' && [idx(3, 3), idx(3, 4), idx(4, 3), idx(4, 4)].includes(j) ? acc + 1 : acc), 0);
    const centerControlB = mutable.reduce((acc, v, j) => (v === 'B' && [idx(3, 3), idx(3, 4), idx(4, 3), idx(4, 4)].includes(j) ? acc + 1 : acc), 0);
    const mobilityA = legalMoves(mutable, 'A').length;
    const mobilityB = legalMoves(mutable, 'B').length;

    const targetAWin = clamp(0.5 + (centerControlA - centerControlB) * 0.09 + (mobilityA - mobilityB) * 0.018 + (rand() - 0.5) * 0.04);
    data.push({ board: mutable, centerControlA, centerControlB, mobilityA, mobilityB, targetAWin });
  }

  return data;
}

function trainFadhilAIVsFadhilAI(dataset: DuelSample[], epochs = 760, lr = 0.03) {
  let a: Weights = { center: 0.2, mobility: 0.15, progress: 0.27, bias: 0.08 };
  let b: Weights = { center: 0.18, mobility: 0.18, progress: 0.22, bias: 0.1 };

  const split = Math.floor(dataset.length * 0.84);
  const train = dataset.slice(0, split);
  const val = dataset.slice(split);
  const logs: TrainLog[] = [];

  for (let e = 1; e <= epochs; e += 1) {
    let loss = 0;
    let ga: Weights = { center: 0, mobility: 0, progress: 0, bias: 0 };
    let gb: Weights = { center: 0, mobility: 0, progress: 0, bias: 0 };
    let capturedA = 0;
    let capturedB = 0;

    for (const s of train) {
      const centerFeature = (s.centerControlA - s.centerControlB) / 4;
      const mobilityFeature = (s.mobilityA - s.mobilityB) / 12;
      const progressFeature = clamp((s.board.filter((x) => x === 'A').length - s.board.filter((x) => x === 'B').length + 8) / 16);

      const predA = a.bias + centerFeature * a.center + mobilityFeature * a.mobility + progressFeature * a.progress;
      const predB = b.bias - centerFeature * b.center - mobilityFeature * b.mobility + (1 - progressFeature) * b.progress;
      const pred = clamp(0.5 + (predA - predB) * 0.5);
      const err = pred - s.targetAWin;
      loss += err * err;

      ga.center += err * centerFeature;
      ga.mobility += err * mobilityFeature;
      ga.progress += err * progressFeature;
      ga.bias += err;

      gb.center -= err * centerFeature;
      gb.mobility -= err * mobilityFeature;
      gb.progress -= err * (1 - progressFeature);
      gb.bias -= err;

      if (pred > 0.55) capturedA += 1;
      if (pred < 0.45) capturedB += 1;
    }

    const n = train.length;
    loss /= n;

    a = {
      center: a.center - (lr * ga.center) / n,
      mobility: a.mobility - (lr * ga.mobility) / n,
      progress: a.progress - (lr * ga.progress) / n,
      bias: a.bias - (lr * ga.bias) / n,
    };
    b = {
      center: b.center - (lr * gb.center) / n,
      mobility: b.mobility - (lr * gb.mobility) / n,
      progress: b.progress - (lr * gb.progress) / n,
      bias: b.bias - (lr * gb.bias) / n,
    };

    if (e % 8 === 0 || e === epochs) {
      let valLoss = 0;
      for (const s of val) {
        const centerFeature = (s.centerControlA - s.centerControlB) / 4;
        const mobilityFeature = (s.mobilityA - s.mobilityB) / 12;
        const progressFeature = clamp((s.board.filter((x) => x === 'A').length - s.board.filter((x) => x === 'B').length + 8) / 16);
        const predA = a.bias + centerFeature * a.center + mobilityFeature * a.mobility + progressFeature * a.progress;
        const predB = b.bias - centerFeature * b.center - mobilityFeature * b.mobility + (1 - progressFeature) * b.progress;
        const pred = clamp(0.5 + (predA - predB) * 0.5);
        const err = pred - s.targetAWin;
        valLoss += err * err;
      }
      valLoss /= Math.max(1, val.length);
      const drift = Math.abs(a.center - b.center) + Math.abs(a.mobility - b.mobility) + Math.abs(a.progress - b.progress);
      logs.push({ epoch: e, trainingLoss: loss, validationLoss: valLoss, drift, capturedA, capturedB });
    }
  }

  const last = logs[logs.length - 1];
  const qualityScore = clamp((1 - last.validationLoss) * 1.08 - last.drift * 0.15, 0, 1) * 100;
  return { a, b, logs, qualityScore: Math.round(qualityScore), trainingLoss: last.trainingLoss, validationLoss: last.validationLoss };
}

export default function FadhilAIFocusedWarStrategyPage() {
  const [dataset] = useState(() => buildTrainingDataset());
  const trained = useMemo(() => trainFadhilAIVsFadhilAI(dataset), [dataset]);
  const [board, setBoard] = useState<Board>(() => createInitialBoard());
  const [turn, setTurn] = useState<'A' | 'B'>('A');
  const [winner, setWinner] = useState<'A' | 'B' | 'draw' | null>(null);
  const [loopTick, setLoopTick] = useState(0);
  const [savedState, setSavedState] = useState('pending');
  const [storedCount, setStoredCount] = useState(0);
  const [showLogs, setShowLogs] = useState(true);
  const [face, setFace] = useState<FaceParams>(initialFace);

  useEffect(() => {
    if (winner) return;
    const timer = window.setTimeout(() => {
      const w = turn === 'A' ? trained.a : trained.b;
      const mv = bestMove(board, turn, w);
      if (!mv) {
        setWinner(turn === 'A' ? 'B' : 'A');
        return;
      }
      const next = applyMove(board, mv);
      const reachedEnd = next.some((v, i) => (v === 'A' && Math.floor(i / BOARD_SIZE) === 0) || (v === 'B' && Math.floor(i / BOARD_SIZE) === BOARD_SIZE - 1));
      if (reachedEnd) setWinner(turn);
      else setTurn(turn === 'A' ? 'B' : 'A');
      setBoard(next);
      setLoopTick((v) => v + 1);
      if (loopTick > 120) setWinner('draw');
    }, 90);

    return () => window.clearTimeout(timer);
  }, [board, turn, winner, trained, loopTick]);

  useEffect(() => {
    const payload: PersistRun = {
      runId: `run-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      strategy: 'FadhilAI-vs-FadhilAI-pawn-duel',
      battlegroundVersion: BATTLEGROUND_VERSION,
      trainingModelVersion: TRAINING_VERSION,
      datasetSize: dataset.length,
      epochs: 760,
      learningRate: 0.03,
      trainingLoss: trained.trainingLoss,
      validationLoss: trained.validationLoss,
      qualityScore: trained.qualityScore,
      modelAWeights: trained.a,
      modelBWeights: trained.b,
      logs: trained.logs,
      compressedResults: compressLogs(trained.logs),
    };

    const save = async () => {
      if (payload.qualityScore < 80 || payload.validationLoss > 0.1) {
        setSavedState('blocked by strict validation');
        return;
      }
      try {
        const res = await fetch('/api/fadhil-ai/training', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        setSavedState(json.saved ? 'saved and compressed' : `rejected: ${json.reason ?? 'unknown'}`);
      } catch {
        setSavedState('database unavailable');
      }
    };

    const loadFresh = async () => {
      try {
        const res = await fetch('/api/fadhil-ai/training', { cache: 'no-store' });
        const json = await res.json();
        if (json.ok && Array.isArray(json.runs)) setStoredCount(json.runs.length);
      } catch {
        setStoredCount(0);
      }
    };

    void save().then(loadFresh);
  }, [dataset.length, trained]);

  const summary = useMemo(() => {
    const state = winner ? (winner === 'draw' ? 'draw outcome' : `winner is FadhilAI ${winner}`) : 'battle in progress';
    return `FadhilAI pawn duel running. ${state}. Quality score ${trained.qualityScore} percent. Validation loss ${trained.validationLoss.toFixed(4)}. Data compressed for storage efficiency.`;
  }, [winner, trained]);

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const faceEngine = new FadhilAiFaceSystem();
    let frame: number | null = null;
    let last = 0;
    let speaking = false;

    const animate = (ts: number) => {
      const dt = Math.min(0.05, (ts - (last || ts)) / 1000);
      last = ts;
      const step = faceEngine.step(ts, dt, speaking);
      if (step.dirty) setFace({ ...step.params });
      frame = window.requestAnimationFrame(animate);
    };

    void faceEngine.runDetection(summary).then(() => {
      const u = new SpeechSynthesisUtterance(summary);
      u.rate = 1.05;
      u.pitch = 1.02;
      u.onstart = () => { speaking = true; };
      u.onend = () => { speaking = false; };
      u.onerror = () => { speaking = false; };
      window.speechSynthesis.cancel();
      window.speechSynthesis.resume();
      window.speechSynthesis.speak(u);
    });

    frame = window.requestAnimationFrame(animate);
    return () => {
      window.speechSynthesis.cancel();
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [summary]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-2 text-slate-100 sm:p-4">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-3">
        <header className="rounded-xl border border-cyan-400/30 bg-slate-900/85 p-3 shadow-[0_8px_28px_rgba(14,116,144,0.25)]">
          <h1 className="text-base font-bold text-cyan-200 sm:text-lg">FadhilAI Pawn Duel Training Arena</h1>
          <p className="text-[11px] text-cyan-100/80 sm:text-xs">100% home-built pawn system with FadhilAI-vs-FadhilAI autonomous movement, strict versioned data control, and compressed results.</p>
        </header>

        <section className="grid gap-3 lg:grid-cols-[2fr_1fr]">
          <div className="rounded-xl border border-cyan-500/30 bg-slate-900/80 p-3">
            <div className="mb-2 flex items-center justify-between text-xs">
              <h2 className="font-semibold text-cyan-200">Watchable Live Pawn Training Loop</h2>
              <span className="text-cyan-100">Turn: {turn} • {winner ? `Winner: ${winner}` : 'Running'}</span>
            </div>
            <div className="grid grid-cols-8 gap-1">
              {board.map((cell, i) => (
                <div
                  key={i}
                  className={`aspect-square rounded-[4px] border border-slate-700/60 transition-all duration-75 ${((Math.floor(i / 8) + i) % 2 === 0) ? 'bg-slate-800' : 'bg-slate-900'}`}
                >
                  <div className={`flex h-full items-center justify-center text-xs font-bold ${cell === 'A' ? 'text-cyan-300' : 'text-rose-300'}`}>{cell ?? ''}</div>
                </div>
              ))}
            </div>
            <div className="mt-2 text-[11px] text-slate-300 sm:text-xs">Save status: <span className="text-emerald-300">{savedState}</span> • Stored fresh runs: <span className="text-cyan-200">{storedCount}</span></div>
          </div>

          <aside className="rounded-xl border border-violet-500/30 bg-slate-900/80 p-3">
            <h2 className="mb-2 text-xs font-semibold text-violet-200 sm:text-sm">Fast Training Metrics</h2>
            <ul className="space-y-1 text-[11px] sm:text-xs">
              <li>Dataset size: <span className="text-cyan-200">{dataset.length}</span></li>
              <li>Training loss: <span className="text-cyan-200">{trained.trainingLoss.toFixed(5)}</span></li>
              <li>Validation loss: <span className="text-cyan-200">{trained.validationLoss.toFixed(5)}</span></li>
              <li>Quality score: <span className="text-cyan-200">{trained.qualityScore}</span></li>
              <li>Battleground: <span className="text-cyan-200">{BATTLEGROUND_VERSION}</span></li>
              <li>Model: <span className="text-cyan-200">{TRAINING_VERSION}</span></li>
              <li>Compressed bytes: <span className="text-cyan-200">{compressLogs(trained.logs).length}</span></li>
            </ul>
          </aside>
        </section>

        <section className="rounded-xl border border-amber-400/30 bg-slate-900/80 p-3">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-xs font-semibold text-amber-200 sm:text-sm">Training Logs (expand/collapse)</h2>
            <button type="button" onClick={() => setShowLogs((v) => !v)} className="rounded border border-amber-300/70 px-2 py-1 text-[10px] text-amber-100 sm:text-xs">{showLogs ? 'Collapse' : 'Expand'}</button>
          </div>
          {showLogs && (
            <div className="max-h-52 overflow-y-auto rounded border border-slate-700 bg-slate-950/70 p-2 text-[10px] sm:text-xs">
              {trained.logs.map((log) => (
                <div key={log.epoch} className="mb-1 grid grid-cols-6 gap-1 rounded bg-slate-900/70 px-1.5 py-1">
                  <span>Ep {log.epoch}</span>
                  <span>tr {log.trainingLoss.toFixed(5)}</span>
                  <span>val {log.validationLoss.toFixed(5)}</span>
                  <span>dr {log.drift.toFixed(3)}</span>
                  <span>A {log.capturedA}</span>
                  <span>B {log.capturedB}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-teal-400/30 bg-slate-900/80 p-3">
          <h2 className="mb-2 text-xs font-semibold text-teal-200 sm:text-sm">Dynamic Face Explainer</h2>
          <svg viewBox="0 0 280 200" className="mx-auto w-full max-w-sm" role="img" aria-label="FadhilAI dynamic face">
            <g transform={`translate(${face.head_shift_x} ${face.head_shift_y + face.breath}) rotate(${face.head_tilt * 22} 140 100)`}>
              <ellipse cx="140" cy="100" rx="92" ry={82 + face.breath * 1.7} fill="#f59e0b" stroke="#92400e" strokeOpacity="0.62" />
              <g transform={`translate(86 90) scale(1 ${Math.max(0.03, face.eye_open)})`}><ellipse cx="0" cy="0" rx="15" ry="11" fill="#fff7ed" /><circle cx={face.gaze_x} cy={face.gaze_y} r={4.8 + face.eye_squint * 4.2} fill="#1f2937" /></g>
              <g transform={`translate(194 90) scale(1 ${Math.max(0.03, face.eye_open)})`}><ellipse cx="0" cy="0" rx="15" ry="11" fill="#fff7ed" /><circle cx={face.gaze_x * 0.94} cy={face.gaze_y * 0.88} r={4.8 + face.eye_squint * 4.2} fill="#1f2937" /></g>
              <g transform={`translate(140 ${128 + face.jaw_rotation * 10})`}><rect x={-(26 + face.lip_width * 34) / 2} y={-(8 + face.mouth_open * 34) / 2} width={26 + face.lip_width * 34} height={8 + face.mouth_open * 34} rx={(8 + face.mouth_open * 34) / 2} fill="#7c2d12" /></g>
            </g>
          </svg>
        </section>
      </section>
      <FadhilAiGlobalChat />
    </main>
  );
}
