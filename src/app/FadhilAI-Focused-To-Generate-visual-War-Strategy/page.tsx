'use client';

import { useEffect, useMemo, useState } from 'react';
import { FadhilAiGlobalChat } from '@/components/FadhilAiGlobalChat';
import { FadhilAiFaceSystem, type FaceParams } from '@/features/security/shared/fadhil-ai-face-system';

type DataPoint = { terrain: number; supply: number; morale: number; flankRisk: number; enemyArmor: number; score: number };
type Weights = { terrain: number; supply: number; morale: number; flankRisk: number; enemyArmor: number; bias: number };

const baseFace: FaceParams = {
  eye_open: 0.92, eye_squint: 0.06, gaze_x: 0, gaze_y: 0, mouth_open: 0.08, mouth_smile: 0.28,
  jaw_rotation: 0.04, lip_width: 0.75, lip_height: 0.24, brow_height: -0.06, head_tilt: 0, head_shift_x: 0,
  head_shift_y: 0, breath: 0, blink: 0,
};

const clamp = (v: number, min = 0, max = 1) => Math.max(min, Math.min(max, v));

function generateDataset(size = 260): DataPoint[] {
  const dataset: DataPoint[] = [];
  for (let i = 0; i < size; i += 1) {
    const terrain = Math.random();
    const supply = Math.random();
    const morale = Math.random();
    const flankRisk = Math.random();
    const enemyArmor = Math.random();
    const ideal = clamp(0.28 + terrain * 0.33 + supply * 0.26 + morale * 0.35 - flankRisk * 0.41 - enemyArmor * 0.31);
    const noise = (Math.random() - 0.5) * 0.04;
    dataset.push({ terrain, supply, morale, flankRisk, enemyArmor, score: clamp(ideal + noise) });
  }
  return dataset;
}

function predict(sample: DataPoint, w: Weights): number {
  return clamp(
    w.bias +
      sample.terrain * w.terrain +
      sample.supply * w.supply +
      sample.morale * w.morale -
      sample.flankRisk * w.flankRisk -
      sample.enemyArmor * w.enemyArmor,
  );
}

function trainWeights(dataset: DataPoint[], epochs = 460, lr = 0.05) {
  let w: Weights = { terrain: 0.18, supply: 0.19, morale: 0.2, flankRisk: 0.25, enemyArmor: 0.24, bias: 0.15 };
  const history: number[] = [];

  for (let epoch = 0; epoch < epochs; epoch += 1) {
    let mse = 0;
    let g: Weights = { terrain: 0, supply: 0, morale: 0, flankRisk: 0, enemyArmor: 0, bias: 0 };

    for (const sample of dataset) {
      const y = predict(sample, w);
      const e = y - sample.score;
      mse += e * e;
      g.terrain += e * sample.terrain;
      g.supply += e * sample.supply;
      g.morale += e * sample.morale;
      g.flankRisk += e * -sample.flankRisk;
      g.enemyArmor += e * -sample.enemyArmor;
      g.bias += e;
    }

    const n = dataset.length;
    mse /= n;
    history.push(mse);

    w = {
      terrain: w.terrain - (lr * g.terrain) / n,
      supply: w.supply - (lr * g.supply) / n,
      morale: w.morale - (lr * g.morale) / n,
      flankRisk: Math.max(0.01, w.flankRisk - (lr * g.flankRisk) / n),
      enemyArmor: Math.max(0.01, w.enemyArmor - (lr * g.enemyArmor) / n),
      bias: w.bias - (lr * g.bias) / n,
    };
  }

  return { weights: w, history };
}

export default function FadhilAIFocusedWarStrategyPage() {
  const [dataset] = useState<DataPoint[]>(() => generateDataset());
  const [face, setFace] = useState<FaceParams>(baseFace);
  const [state, setState] = useState<'idle' | 'speaking' | 'unsupported'>('idle');

  const model = useMemo(() => trainWeights(dataset), [dataset]);
  const scenario = useMemo(() => {
    const sample = dataset[Math.floor(Math.random() * dataset.length)];
    const strategicScore = predict(sample, model.weights);
    return { ...sample, strategicScore };
  }, [dataset, model.weights]);

  const analysisText = useMemo(() => {
    const confidence = Math.round((1 - model.history[model.history.length - 1]) * 100);
    const posture = scenario.strategicScore > 0.62 ? 'offensive breakthrough' : scenario.strategicScore > 0.45 ? 'controlled pressure' : 'defensive stabilization';
    return `Fadhil AI war-strategy analysis complete. Model trained from scratch on ${dataset.length} internal battlefield samples. Recommended posture: ${posture}. Confidence ${confidence} percent. Terrain ${Math.round(scenario.terrain * 100)} percent, supply ${Math.round(scenario.supply * 100)} percent, morale ${Math.round(scenario.morale * 100)} percent, flank risk ${Math.round(scenario.flankRisk * 100)} percent, enemy armor ${Math.round(scenario.enemyArmor * 100)} percent.`;
  }, [dataset.length, model.history, scenario]);

  useEffect(() => {
    const engine = new FadhilAiFaceSystem();
    let frame: number | null = null;
    let last = 0;
    let speaking = false;

    const animate = (ts: number) => {
      const dt = Math.min(0.05, (ts - (last || ts)) / 1000);
      last = ts;
      const step = engine.step(ts, dt, speaking);
      if (step.dirty) setFace({ ...step.params });
      frame = window.requestAnimationFrame(animate);
    };

    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setState('unsupported');
      return () => undefined;
    }

    void engine.runDetection(analysisText).then(() => {
      const utterance = new SpeechSynthesisUtterance(analysisText);
      utterance.rate = 0.96;
      utterance.pitch = 1.03;
      utterance.onstart = () => {
        speaking = true;
        setState('speaking');
      };
      utterance.onend = () => {
        speaking = false;
        setState('idle');
      };
      utterance.onerror = () => {
        speaking = false;
        setState('idle');
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
  }, [analysisText]);

  const grid = useMemo(() => {
    return Array.from({ length: 64 }, (_, i) => {
      const pressure = clamp(scenario.strategicScore * 0.65 + Math.random() * 0.35);
      return { id: i, pressure };
    });
  }, [scenario.strategicScore]);

  return (
    <main className="min-h-screen bg-slate-950 p-4 text-slate-100">
      <section className="mx-auto max-w-6xl space-y-4">
        <header className="rounded-xl border border-cyan-400/30 bg-slate-900/80 p-4">
          <h1 className="text-lg font-bold text-cyan-200">FadhilAI Focused To Generate visual War Strategy</h1>
          <p className="text-xs text-cyan-100/80">Built from scratch in-browser: synthetic dataset generation, autonomous parameter training, strategy inference, speech explanation, and dynamic face feedback.</p>
        </header>

        <section className="grid gap-4 lg:grid-cols-[2fr_1fr]">
          <div className="rounded-xl border border-cyan-500/30 bg-slate-900/80 p-4">
            <h2 className="mb-2 text-sm font-semibold text-cyan-200">Visual Strategy Battlefield</h2>
            <div className="grid grid-cols-8 gap-1">
              {grid.map((cell) => (
                <div key={cell.id} className="aspect-square rounded-sm border border-slate-700" style={{ backgroundColor: `rgba(34, 211, 238, ${cell.pressure})` }} />
              ))}
            </div>
            <p className="mt-3 text-xs text-slate-300">Real-time inferred strategic score: <span className="font-semibold text-cyan-200">{(scenario.strategicScore * 100).toFixed(1)}%</span></p>
          </div>

          <aside className="rounded-xl border border-violet-500/30 bg-slate-900/80 p-4">
            <h2 className="mb-3 text-sm font-semibold text-violet-200">Autonomous Model Training</h2>
            <ul className="space-y-1 text-xs">
              <li>Dataset size: <span className="text-cyan-200">{dataset.length}</span></li>
              <li>Final loss: <span className="text-cyan-200">{model.history[model.history.length - 1].toFixed(5)}</span></li>
              <li>Terrain weight: <span className="text-cyan-200">{model.weights.terrain.toFixed(3)}</span></li>
              <li>Supply weight: <span className="text-cyan-200">{model.weights.supply.toFixed(3)}</span></li>
              <li>Morale weight: <span className="text-cyan-200">{model.weights.morale.toFixed(3)}</span></li>
              <li>Flank risk weight: <span className="text-cyan-200">{model.weights.flankRisk.toFixed(3)}</span></li>
              <li>Enemy armor weight: <span className="text-cyan-200">{model.weights.enemyArmor.toFixed(3)}</span></li>
              <li>Speech state: <span className="text-cyan-200">{state}</span></li>
            </ul>
          </aside>
        </section>

        <section className="rounded-xl border border-amber-400/30 bg-slate-900/80 p-4">
          <h2 className="mb-2 text-sm font-semibold text-amber-200">Dynamic Face Narrator</h2>
          <svg viewBox="0 0 280 200" className="mx-auto w-full max-w-md" role="img" aria-label="Fadhil AI dynamic face">
            <g transform={`translate(${face.head_shift_x} ${face.head_shift_y + face.breath}) rotate(${face.head_tilt * 22} 140 100)`}>
              <ellipse cx="140" cy="100" rx="92" ry={82 + face.breath * 1.7} fill="#f59e0b" stroke="#92400e" strokeOpacity="0.62" />
              <g transform={`translate(86 90) scale(1 ${Math.max(0.03, face.eye_open)})`}><ellipse cx="0" cy="0" rx="15" ry="11" fill="#fff7ed" /><circle cx={face.gaze_x} cy={face.gaze_y} r={4.8 + face.eye_squint * 4.2} fill="#1f2937" /></g>
              <g transform={`translate(194 90) scale(1 ${Math.max(0.03, face.eye_open)})`}><ellipse cx="0" cy="0" rx="15" ry="11" fill="#fff7ed" /><circle cx={face.gaze_x * 0.94} cy={face.gaze_y * 0.88} r={4.8 + face.eye_squint * 4.2} fill="#1f2937" /></g>
              <g transform={`translate(140 ${128 + face.jaw_rotation * 10})`}>
                <rect x={-(26 + face.lip_width * 34) / 2} y={-(8 + face.mouth_open * 34) / 2} width={26 + face.lip_width * 34} height={8 + face.mouth_open * 34} rx={(8 + face.mouth_open * 34) / 2} fill="#7c2d12" />
              </g>
            </g>
          </svg>
        </section>
      </section>
      <FadhilAiGlobalChat />
    </main>
  );
}
