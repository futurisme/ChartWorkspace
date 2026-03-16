'use client';

import { useEffect, useMemo, useState } from 'react';
import { FadhilAiGlobalChat } from '@/components/FadhilAiGlobalChat';
import { FadhilAiFaceSystem, type FaceParams } from '@/features/security/shared/fadhil-ai-face-system';

type DataPoint = {
  terrain: number;
  supply: number;
  morale: number;
  flankRisk: number;
  enemyArmor: number;
  target: number;
};

type Weights = { terrain: number; supply: number; morale: number; flankRisk: number; enemyArmor: number; bias: number };
type LogEntry = { epoch: number; trainingLoss: number; validationLoss: number; drift: number };

type TrainingRun = {
  runId: string;
  strategy: string;
  datasetSize: number;
  epochs: number;
  learningRate: number;
  trainingLoss: number;
  validationLoss: number;
  qualityScore: number;
  modelAWeights: Weights;
  modelBWeights: Weights;
  logs: LogEntry[];
  createdAt?: string;
};

const clamp = (v: number, min = 0, max = 1) => Math.max(min, Math.min(max, v));
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

function buildDuelDataset(size = 420) {
  const rand = seededRandom(42.73);
  const a = { terrain: 0.34, supply: 0.28, morale: 0.33, flankRisk: 0.38, enemyArmor: 0.26, bias: 0.2 };
  const b = { terrain: 0.28, supply: 0.31, morale: 0.26, flankRisk: 0.32, enemyArmor: 0.35, bias: 0.18 };
  const rows: DataPoint[] = [];

  for (let i = 0; i < size; i += 1) {
    const terrain = rand();
    const supply = rand();
    const morale = rand();
    const flankRisk = rand();
    const enemyArmor = rand();

    const scoreA = clamp(a.bias + terrain * a.terrain + supply * a.supply + morale * a.morale - flankRisk * a.flankRisk - enemyArmor * a.enemyArmor);
    const scoreB = clamp(b.bias + terrain * b.terrain + supply * b.supply + morale * b.morale - flankRisk * b.flankRisk - enemyArmor * b.enemyArmor);
    const duelTarget = clamp(0.5 + (scoreA - scoreB) * 0.5 + (rand() - 0.5) * 0.04);

    rows.push({ terrain, supply, morale, flankRisk, enemyArmor, target: duelTarget });
  }

  return rows;
}

function predict(sample: DataPoint, w: Weights) {
  return clamp(w.bias + sample.terrain * w.terrain + sample.supply * w.supply + sample.morale * w.morale - sample.flankRisk * w.flankRisk - sample.enemyArmor * w.enemyArmor);
}

function trainAgainstEachOther(dataset: DataPoint[], epochs = 520, learningRate = 0.04) {
  let wA: Weights = { terrain: 0.2, supply: 0.2, morale: 0.2, flankRisk: 0.2, enemyArmor: 0.2, bias: 0.15 };
  let wB: Weights = { terrain: 0.24, supply: 0.18, morale: 0.19, flankRisk: 0.24, enemyArmor: 0.22, bias: 0.13 };

  const split = Math.floor(dataset.length * 0.82);
  const train = dataset.slice(0, split);
  const val = dataset.slice(split);
  const logs: LogEntry[] = [];

  for (let epoch = 1; epoch <= epochs; epoch += 1) {
    let trainLoss = 0;
    let gradientsA: Weights = { terrain: 0, supply: 0, morale: 0, flankRisk: 0, enemyArmor: 0, bias: 0 };
    let gradientsB: Weights = { terrain: 0, supply: 0, morale: 0, flankRisk: 0, enemyArmor: 0, bias: 0 };

    for (const sample of train) {
      const predA = predict(sample, wA);
      const predB = predict(sample, wB);
      const pred = clamp(0.5 + (predA - predB) * 0.5);
      const err = pred - sample.target;
      trainLoss += err * err;

      gradientsA.terrain += err * sample.terrain;
      gradientsA.supply += err * sample.supply;
      gradientsA.morale += err * sample.morale;
      gradientsA.flankRisk += err * -sample.flankRisk;
      gradientsA.enemyArmor += err * -sample.enemyArmor;
      gradientsA.bias += err;

      gradientsB.terrain -= err * sample.terrain;
      gradientsB.supply -= err * sample.supply;
      gradientsB.morale -= err * sample.morale;
      gradientsB.flankRisk -= err * -sample.flankRisk;
      gradientsB.enemyArmor -= err * -sample.enemyArmor;
      gradientsB.bias -= err;
    }

    const n = train.length;
    trainLoss /= n;

    wA = {
      terrain: wA.terrain - (learningRate * gradientsA.terrain) / n,
      supply: wA.supply - (learningRate * gradientsA.supply) / n,
      morale: wA.morale - (learningRate * gradientsA.morale) / n,
      flankRisk: Math.max(0.01, wA.flankRisk - (learningRate * gradientsA.flankRisk) / n),
      enemyArmor: Math.max(0.01, wA.enemyArmor - (learningRate * gradientsA.enemyArmor) / n),
      bias: wA.bias - (learningRate * gradientsA.bias) / n,
    };

    wB = {
      terrain: wB.terrain - (learningRate * gradientsB.terrain) / n,
      supply: wB.supply - (learningRate * gradientsB.supply) / n,
      morale: wB.morale - (learningRate * gradientsB.morale) / n,
      flankRisk: Math.max(0.01, wB.flankRisk - (learningRate * gradientsB.flankRisk) / n),
      enemyArmor: Math.max(0.01, wB.enemyArmor - (learningRate * gradientsB.enemyArmor) / n),
      bias: wB.bias - (learningRate * gradientsB.bias) / n,
    };

    if (epoch % 6 === 0 || epoch === epochs) {
      let valLoss = 0;
      for (const sample of val) {
        const predA = predict(sample, wA);
        const predB = predict(sample, wB);
        const pred = clamp(0.5 + (predA - predB) * 0.5);
        const err = pred - sample.target;
        valLoss += err * err;
      }
      valLoss /= Math.max(1, val.length);
      const drift = Math.abs(wA.terrain - wB.terrain) + Math.abs(wA.supply - wB.supply) + Math.abs(wA.morale - wB.morale);
      logs.push({ epoch, trainingLoss: trainLoss, validationLoss: valLoss, drift });
    }
  }

  const last = logs[logs.length - 1];
  const qualityScore = Math.max(0, Math.min(100, Math.round((1 - last.validationLoss) * 100 - last.drift * 4)));

  return { weightsA: wA, weightsB: wB, logs, trainingLoss: last.trainingLoss, validationLoss: last.validationLoss, qualityScore };
}

export default function FadhilAIFocusedWarStrategyPage() {
  const [dataset] = useState(() => buildDuelDataset());
  const training = useMemo(() => trainAgainstEachOther(dataset), [dataset]);
  const [savedState, setSavedState] = useState('pending');
  const [storedRuns, setStoredRuns] = useState<TrainingRun[]>([]);
  const [showLogs, setShowLogs] = useState(true);
  const [face, setFace] = useState<FaceParams>(initialFace);

  const scenario = useMemo(() => {
    const sample = dataset[Math.floor(dataset.length * 0.67)];
    const a = predict(sample, training.weightsA);
    const b = predict(sample, training.weightsB);
    return { ...sample, score: clamp(0.5 + (a - b) * 0.5), advantage: a - b };
  }, [dataset, training.weightsA, training.weightsB]);

  const summary = useMemo(() => {
    const stance = scenario.score > 0.6 ? 'aggressive strike corridor' : scenario.score > 0.48 ? 'balanced pressure lane' : 'defensive containment';
    return `Fadhil AI versus Fadhil AI completed. Quality ${training.qualityScore} percent. Recommended strategy: ${stance}. Validation loss ${training.validationLoss.toFixed(4)}.`;
  }, [scenario.score, training.qualityScore, training.validationLoss]);

  useEffect(() => {
    const runId = `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const payload: TrainingRun = {
      runId,
      strategy: 'FadhilAI-vs-FadhilAI-war-strategy',
      datasetSize: dataset.length,
      epochs: 520,
      learningRate: 0.04,
      trainingLoss: training.trainingLoss,
      validationLoss: training.validationLoss,
      qualityScore: training.qualityScore,
      modelAWeights: training.weightsA,
      modelBWeights: training.weightsB,
      logs: training.logs,
    };

    const persist = async () => {
      if (payload.qualityScore < 75 || payload.validationLoss > 0.12) {
        setSavedState('blocked by strict validation');
        return;
      }
      try {
        const response = await fetch('/api/fadhil-ai/training', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const result = await response.json();
        setSavedState(result.saved ? 'saved with strict controls' : `rejected: ${result.reason ?? 'unknown'}`);
      } catch {
        setSavedState('database unavailable');
      }
    };

    const load = async () => {
      try {
        const response = await fetch('/api/fadhil-ai/training', { cache: 'no-store' });
        const result = await response.json();
        if (result.ok && Array.isArray(result.runs)) setStoredRuns(result.runs as TrainingRun[]);
      } catch {
        setStoredRuns([]);
      }
    };

    void persist().then(load);
  }, [dataset.length, training]);

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
      const utterance = new SpeechSynthesisUtterance(summary);
      utterance.rate = 1.04;
      utterance.pitch = 1.03;
      utterance.onstart = () => {
        speaking = true;
      };
      utterance.onend = () => {
        speaking = false;
      };
      utterance.onerror = () => {
        speaking = false;
      };
      window.speechSynthesis.cancel();
      window.speechSynthesis.resume();
      window.speechSynthesis.speak(utterance);
    });

    frame = window.requestAnimationFrame(animate);
    return () => {
      window.speechSynthesis.cancel();
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [summary]);

  const cells = useMemo(
    () => Array.from({ length: 72 }, (_, i) => ({ id: i, pressure: clamp(scenario.score * 0.5 + Math.sin(i * 0.8) * 0.2 + 0.3) })),
    [scenario.score],
  );

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-2 text-slate-100 sm:p-4">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-3">
        <header className="rounded-xl border border-cyan-400/30 bg-slate-900/85 p-3 shadow-[0_8px_28px_rgba(14,116,144,0.25)]">
          <h1 className="text-base font-bold text-cyan-200 sm:text-lg">FadhilAI Focused To Generate visual War Strategy</h1>
          <p className="text-[11px] text-cyan-100/80 sm:text-xs">FadhilAI-vs-FadhilAI training, strict database validation, fast dynamic visuals, and automated speech + dynamic face narration.</p>
        </header>

        <section className="grid gap-3 lg:grid-cols-[2fr_1fr]">
          <div className="rounded-xl border border-cyan-500/30 bg-slate-900/80 p-3">
            <h2 className="mb-2 text-xs font-semibold text-cyan-200 sm:text-sm">Responsive Visual Battlefield</h2>
            <div className="grid grid-cols-9 gap-1">
              {cells.map((cell) => (
                <div key={cell.id} className="aspect-square rounded-[4px] border border-slate-700/60 transition-transform duration-150 hover:scale-105" style={{ background: `linear-gradient(135deg, rgba(34,211,238,${cell.pressure}), rgba(59,130,246,${Math.max(0.18, cell.pressure - 0.2)}))` }} />
              ))}
            </div>
            <div className="mt-2 text-[11px] text-slate-300 sm:text-xs">Advantage score: <span className="font-semibold text-cyan-200">{(scenario.score * 100).toFixed(2)}%</span> • Save status: <span className="text-emerald-300">{savedState}</span></div>
          </div>

          <aside className="rounded-xl border border-violet-500/30 bg-slate-900/80 p-3">
            <h2 className="mb-2 text-xs font-semibold text-violet-200 sm:text-sm">Strict Validation Snapshot</h2>
            <ul className="space-y-1 text-[11px] sm:text-xs">
              <li>Dataset size: <span className="text-cyan-200">{dataset.length}</span></li>
              <li>Training loss: <span className="text-cyan-200">{training.trainingLoss.toFixed(5)}</span></li>
              <li>Validation loss: <span className="text-cyan-200">{training.validationLoss.toFixed(5)}</span></li>
              <li>Quality score: <span className="text-cyan-200">{training.qualityScore}</span></li>
              <li>Stored fresh runs: <span className="text-cyan-200">{storedRuns.length}</span></li>
            </ul>
          </aside>
        </section>

        <section className="rounded-xl border border-amber-400/30 bg-slate-900/80 p-3">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-xs font-semibold text-amber-200 sm:text-sm">Training Logs (expand/collapse)</h2>
            <button type="button" onClick={() => setShowLogs((v) => !v)} className="rounded border border-amber-300/70 px-2 py-1 text-[10px] text-amber-100 sm:text-xs">{showLogs ? 'Collapse' : 'Expand'}</button>
          </div>
          {showLogs && (
            <div className="max-h-48 overflow-y-auto rounded border border-slate-700 bg-slate-950/70 p-2 text-[10px] sm:text-xs">
              {training.logs.map((log) => (
                <div key={log.epoch} className="mb-1 grid grid-cols-4 gap-1 rounded bg-slate-900/70 px-1.5 py-1">
                  <span>Epoch {log.epoch}</span>
                  <span>train {log.trainingLoss.toFixed(5)}</span>
                  <span>val {log.validationLoss.toFixed(5)}</span>
                  <span>drift {log.drift.toFixed(3)}</span>
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
