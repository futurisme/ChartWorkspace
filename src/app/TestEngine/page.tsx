'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FadhilAiFaceSystem, type FaceParams } from '@/features/security/shared/fadhil-ai-face-system';

type EngineState = 'idle' | 'speaking' | 'paused' | 'unsupported';
type ScanFinding = { severity: 'high' | 'medium' | 'low'; file: string; line: number; rule: string; snippet: string };
type ScanReport = { ok: boolean; summary: string; scannedFiles: string[]; recentCommits: string[]; findings: ScanFinding[] };

type ReferenceTab = 'architecture' | 'pipeline' | 'runtime';

function splitIntoChunks(text: string): string[] {
  const compact = text.replace(/\s+/g, ' ').trim();
  if (!compact) return [];

  return compact
    .split(/(?<=[.!?])\s+/)
    .flatMap((part) => {
      if (part.length <= 220) return [part];
      const chunks: string[] = [];
      let buffer = '';
      for (const word of part.split(' ')) {
        const candidate = buffer ? `${buffer} ${word}` : word;
        if (candidate.length > 200) {
          if (buffer) chunks.push(buffer);
          buffer = word;
        } else {
          buffer = candidate;
        }
      }
      if (buffer) chunks.push(buffer);
      return chunks;
    })
    .filter(Boolean);
}

function pickBestVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (voices.length === 0) return null;
  const preferredNames = ['Google', 'Microsoft', 'Samantha', 'Natural', 'Enhanced', 'Premium'];
  const preferred = voices.find((voice) => /en|id/i.test(voice.lang) && preferredNames.some((n) => voice.name.toLowerCase().includes(n.toLowerCase())));
  return preferred ?? voices.find((voice) => /en|id/i.test(voice.lang)) ?? voices[0];
}

const initialFace: FaceParams = {
  eye_open: 0.92,
  eye_squint: 0.06,
  gaze_x: 0,
  gaze_y: 0,
  mouth_open: 0.08,
  jaw_rotation: 0.04,
  lip_width: 0.75,
  lip_height: 0.24,
  brow_height: -0.06,
  head_tilt: 0,
  head_shift_x: 0,
  head_shift_y: 0,
  breath: 0,
  blink: 0,
};

export default function TestEnginePage() {
  const scriptRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<FadhilAiFaceSystem>(new FadhilAiFaceSystem());
  const queueRef = useRef<string[]>([]);
  const utteranceIndexRef = useRef(0);
  const watchdogRef = useRef<number | null>(null);
  const frameRef = useRef<number | null>(null);
  const lastTsRef = useRef(0);

  const [state, setState] = useState<EngineState>('idle');
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [status, setStatus] = useState('Ready');
  const [scanReport, setScanReport] = useState<ScanReport | null>(null);
  const [scanState, setScanState] = useState<'idle' | 'running'>('idle');
  const [face, setFace] = useState<FaceParams>(initialFace);
  const [referenceTab, setReferenceTab] = useState<ReferenceTab>('architecture');
  const [isReferenceOpen, setIsReferenceOpen] = useState(true);

  const speakingRef = useRef(false);

  const syncVoices = useCallback(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setState('unsupported');
      return;
    }
    const list = window.speechSynthesis.getVoices();
    setVoices(list);
    setStatus(list.length > 0 ? `Voice engine ready (${list.length} voices)` : 'Voice engine detected, waiting for voices...');
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setState('unsupported');
      setStatus('Speech engine unsupported in this browser.');
      return;
    }

    syncVoices();
    window.speechSynthesis.onvoiceschanged = syncVoices;

    const voiceRetry = window.setInterval(() => {
      if (window.speechSynthesis.getVoices().length > 0) {
        syncVoices();
        window.clearInterval(voiceRetry);
      }
    }, 400);

    const animate = (ts: number) => {
      const last = lastTsRef.current || ts;
      const dt = Math.min(0.05, (ts - last) / 1000);
      lastTsRef.current = ts;
      const step = engineRef.current.step(ts, dt, speakingRef.current);
      if (step.dirty) setFace({ ...step.params });
      frameRef.current = window.requestAnimationFrame(animate);
    };
    frameRef.current = window.requestAnimationFrame(animate);

    return () => {
      window.clearInterval(voiceRetry);
      window.speechSynthesis.onvoiceschanged = null;
      window.speechSynthesis.cancel();
      if (watchdogRef.current) window.clearTimeout(watchdogRef.current);
      if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
    };
  }, [syncVoices]);

  const bestVoice = useMemo(() => pickBestVoice(voices), [voices]);

  const clearWatchdog = () => {
    if (watchdogRef.current && typeof window !== 'undefined') {
      window.clearTimeout(watchdogRef.current);
      watchdogRef.current = null;
    }
  };

  const speakNext = useCallback(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setState('unsupported');
      setStatus('Speech engine unsupported in this browser.');
      return;
    }

    clearWatchdog();

    const index = utteranceIndexRef.current;
    const next = queueRef.current[index];
    if (!next) {
      speakingRef.current = false;
      setState('idle');
      setStatus('Reading complete.');
      return;
    }

    const utterance = new SpeechSynthesisUtterance(next);
    if (bestVoice) {
      utterance.voice = bestVoice;
      utterance.lang = bestVoice.lang;
    } else {
      utterance.lang = 'en-US';
    }

    utterance.rate = 0.98;
    utterance.pitch = 1.02;
    utterance.volume = 1;

    utterance.onstart = () => {
      speakingRef.current = true;
      setState('speaking');
      setStatus(`Speaking ${index + 1}/${queueRef.current.length}`);
    };

    utterance.onend = () => {
      utteranceIndexRef.current += 1;
      speakNext();
    };

    utterance.onerror = () => {
      utteranceIndexRef.current += 1;
      speakNext();
    };

    window.speechSynthesis.speak(utterance);

    watchdogRef.current = window.setTimeout(() => {
      if (!window.speechSynthesis.speaking && state !== 'paused') {
        utteranceIndexRef.current += 1;
        speakNext();
      }
    }, 6000);
  }, [bestVoice, state]);

  const buildScanNarration = useCallback((report: ScanReport) => {
    const intro = `Fadhil AI scan summary. ${report.summary}.`;
    const findings = report.findings.slice(0, 5).map((f, i) => `Finding ${i + 1}. ${f.severity} severity on ${f.file} line ${f.line}. Rule ${f.rule}.`).join(' ');
    const commits = report.recentCommits.slice(0, 3).map((c, i) => `Recent commit ${i + 1}. ${c}.`).join(' ');
    return [intro, findings, commits].filter(Boolean).join(' ');
  }, []);

  const ensureScanReport = useCallback(async () => {
    if (scanReport) return scanReport;
    try {
      const response = await fetch('/api/fadhil-ai/scan', { cache: 'no-store' });
      const data = (await response.json()) as ScanReport;
      setScanReport(data);
      return data;
    } catch {
      return null;
    }
  }, [scanReport]);

  const handleStart = useCallback(async () => {
    if (!scriptRef.current || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setState('unsupported');
      setStatus('Speech engine unsupported in this browser.');
      return;
    }

    window.speechSynthesis.cancel();
    speakingRef.current = false;
    utteranceIndexRef.current = 0;

    const sourceText = scriptRef.current.innerText;
    setStatus('DetectionEngine: analyzing input...');
    await engineRef.current.runDetection(sourceText);

    const report = await ensureScanReport();
    const scanNarration = report ? buildScanNarration(report) : '';
    const fullText = [scanNarration, sourceText].filter(Boolean).join(' ');
    queueRef.current = splitIntoChunks(fullText);

    if (queueRef.current.length === 0) {
      setState('idle');
      setStatus('No readable text found.');
      return;
    }

    setStatus(report ? 'Detection complete. Starting scan-first narration...' : 'Detection complete. Starting narration...');
    window.setTimeout(() => {
      speakNext();
    }, 35);
  }, [buildScanNarration, ensureScanReport, speakNext]);

  const handlePauseResume = useCallback(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setState('unsupported');
      setStatus('Speech engine unsupported in this browser.');
      return;
    }

    if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
      window.speechSynthesis.pause();
      speakingRef.current = false;
      setState('paused');
      setStatus('Paused');
      return;
    }

    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      speakingRef.current = true;
      setState('speaking');
      setStatus('Resumed');
      return;
    }

    if (!window.speechSynthesis.speaking && queueRef.current.length > 0) speakNext();
  }, [speakNext]);

  const handleStop = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
    clearWatchdog();
    speakingRef.current = false;
    utteranceIndexRef.current = 0;
    queueRef.current = [];
    setState('idle');
    setStatus('Stopped');
  }, []);

  const runScan = useCallback(async () => {
    try {
      setScanState('running');
      const response = await fetch('/api/fadhil-ai/scan', { cache: 'no-store' });
      const data = (await response.json()) as ScanReport;
      setScanReport(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setScanReport({
        ok: false,
        summary: `FadhilAiEngine scan request failed: ${message}`,
        scannedFiles: [],
        recentCommits: [],
        findings: [{ severity: 'high', file: 'runtime', line: 0, rule: 'scan-fetch-error', snippet: message }],
      });
    } finally {
      setScanState('idle');
    }
  }, []);

  const eyeScaleY = Math.max(0.04, face.eye_open);
  const browOffset = Math.round(face.brow_height * 22);
  const mouthHeight = 8 + face.mouth_open * 34;
  const mouthWidth = 26 + face.lip_width * 34;
  const jawY = 128 + face.jaw_rotation * 10;
  const cheekGlow = 0.15 + face.breath * 0.22;
  const headTiltDeg = face.head_tilt * 18;
  const headShiftX = face.head_shift_x;
  const headShiftY = face.head_shift_y + face.breath;

  return (
    <main className="h-screen overflow-y-auto bg-slate-950 text-slate-100">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-3 p-3 sm:p-4">
        <header className="sticky top-2 z-20 rounded-xl border border-cyan-400/30 bg-slate-900/90 p-3 backdrop-blur">
          <div className="mb-2 text-[11px] uppercase tracking-[0.2em] text-cyan-200/80">FadhilAiEngine / TestEngine</div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={handleStart} className="rounded border border-cyan-300 bg-cyan-600 px-3 py-1 text-xs font-semibold text-white hover:bg-cyan-500" disabled={state === 'unsupported'}>Start</button>
            <button type="button" onClick={handlePauseResume} className="rounded border border-violet-300 bg-violet-600 px-3 py-1 text-xs font-semibold text-white hover:bg-violet-500" disabled={state === 'unsupported' || state === 'idle'}>{state === 'paused' ? 'Resume' : 'Pause'}</button>
            <button type="button" onClick={handleStop} className="rounded border border-red-300 bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-500" disabled={state === 'unsupported' || state === 'idle'}>Stop</button>
            <button type="button" onClick={runScan} className="rounded border border-amber-300 bg-amber-500 px-3 py-1 text-xs font-semibold text-slate-950 hover:bg-amber-400" disabled={scanState === 'running'}>{scanState === 'running' ? 'Scanning…' : 'Run FadhilAiEngine Scan'}</button>
          </div>
          <p className="mt-2 text-[11px] text-cyan-100/90">Status: {status}</p>
          <p className="text-[11px] text-slate-300">Voice: {bestVoice ? `${bestVoice.name} (${bestVoice.lang})` : 'Auto / pending'}</p>
          <p className="text-[11px] font-semibold text-amber-200">Required policy: run FadhilAiEngine scan before every push.</p>
        </header>

        <section className="rounded-2xl border border-cyan-500/20 bg-slate-900/70 p-3 sm:hidden">
          <div className="mb-2 text-[10px] uppercase tracking-[0.2em] text-cyan-200/80">Dynamic Face</div>
          <div className="mx-auto w-full max-w-[280px]">
            <svg viewBox="0 0 280 200" className="w-full" role="img" aria-label="FadhilAiEngine expressive face">
              <defs>
                <radialGradient id="faceCore" cx="50%" cy="35%" r="70%">
                  <stop offset="0%" stopColor="#67e8f9" stopOpacity={0.58 + face.mouth_open * 0.22} />
                  <stop offset="100%" stopColor="#0f172a" stopOpacity="1" />
                </radialGradient>
              </defs>

              <g transform={`translate(${headShiftX} ${headShiftY}) rotate(${headTiltDeg} 140 100)`}>
                <ellipse cx="140" cy="100" rx="92" ry={82 + face.breath * 1.7} fill="url(#faceCore)" stroke="#22d3ee" strokeOpacity="0.55" />

                <circle cx="94" cy="120" r="18" fill="#22d3ee" opacity={cheekGlow} />
                <circle cx="186" cy="120" r="18" fill="#22d3ee" opacity={cheekGlow} />

                <g transform={`translate(86 ${72 + browOffset})`}>
                  <rect x="-22" y="0" width="44" height="4" rx="2" fill="#a5f3fc" opacity="0.9" />
                </g>
                <g transform={`translate(194 ${72 + browOffset})`}>
                  <rect x="-22" y="0" width="44" height="4" rx="2" fill="#a5f3fc" opacity="0.9" />
                </g>

                <g transform={`translate(86 90) scale(1 ${eyeScaleY})`}>
                  <ellipse cx="0" cy="0" rx="15" ry="11" fill="#e0f2fe" />
                  <circle cx={face.gaze_x} cy={face.gaze_y} r={4.8 + face.eye_squint * 4.2} fill="#0e7490" />
                </g>

                <g transform={`translate(194 90) scale(1 ${eyeScaleY})`}>
                  <ellipse cx="0" cy="0" rx="15" ry="11" fill="#e0f2fe" />
                  <circle cx={face.gaze_x * 0.94} cy={face.gaze_y * 0.88} r={4.8 + face.eye_squint * 4.2} fill="#0e7490" />
                </g>

                <g transform={`translate(140 ${jawY})`}>
                  <rect x={-mouthWidth / 2} y={-mouthHeight / 2} width={mouthWidth} height={mouthHeight} rx={mouthHeight / 2} fill="#082f49" stroke="#38bdf8" />
                  <ellipse cx="0" cy={Math.max(0, mouthHeight * 0.14)} rx={Math.max(6, mouthWidth * 0.2)} ry={Math.max(2, mouthHeight * 0.18)} fill="#fb923c" opacity={0.56 + face.mouth_open * 0.25} />
                  <rect x={-(mouthWidth * 0.35)} y={-2} width={mouthWidth * 0.7} height={4} rx="2" fill="#67e8f9" opacity={0.48 + face.mouth_open * 0.35} />
                </g>
              </g>
            </svg>
          </div>
        </section>

        <section className="rounded-2xl border border-cyan-500/20 bg-slate-900/70">
          <button
            type="button"
            onClick={() => setIsReferenceOpen((prev) => !prev)}
            className="flex w-full items-center justify-between px-4 py-3 text-left"
          >
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200">Reference Panels</span>
            <span className="text-xs text-cyan-100">{isReferenceOpen ? 'Collapse' : 'Expand'}</span>
          </button>

          {isReferenceOpen && (
            <div className="border-t border-cyan-500/20 px-3 pb-3 pt-2">
              <div className="mb-3 flex flex-wrap gap-2">
                {(['architecture', 'pipeline', 'runtime'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setReferenceTab(tab)}
                    className={`rounded px-3 py-1 text-xs font-semibold ${referenceTab === tab ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-cyan-100'}`}
                  >
                    {tab[0].toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>

              {referenceTab === 'architecture' && (
                <div className="space-y-2 text-xs text-slate-300 sm:text-sm">
                  <p>FadhilAiEngine modules: DetectionEngine → EmotionAnalyzer → SpeechAnalyzer → FaceAnimationCore.</p>
                  <p>EyeMovementEngine, LipSyncEngine, and ExpressionController produce blended parameters for the render stage.</p>
                </div>
              )}
              {referenceTab === 'pipeline' && (
                <div className="space-y-2 text-xs text-slate-300 sm:text-sm">
                  <p>Detection runs first, then scan summary narration is injected as first queue content.</p>
                  <p>Event-driven speech state updates feed face motion at animation frame cadence with dirty-state gating.</p>
                </div>
              )}
              {referenceTab === 'runtime' && (
                <div className="space-y-2 text-xs text-slate-300 sm:text-sm">
                  <p>Runtime is mobile-optimized: single SVG layer, parameter cache, and only-dirty redraw updates.</p>
                  <p>Head translation + rotation, eye drift, blink variation, and phoneme mouth shaping remain native and dependency-free.</p>
                </div>
              )}
            </div>
          )}
        </section>

        <article ref={scriptRef} className="space-y-3 rounded-2xl border border-slate-700 bg-slate-900/70 p-4 text-sm leading-relaxed sm:text-base">
          <h1 className="text-lg font-bold text-cyan-200 sm:text-xl">FadhilAiEngine Live Voice Script</h1>
          <p>
            FadhilAiEngine now runs a native modular face pipeline: DetectionEngine, EmotionAnalyzer, SpeechAnalyzer,
            EyeMovementEngine, LipSyncEngine, ExpressionController, FaceAnimationCore, and RenderPipeline.
          </p>
          <p>
            Detection runs first and completes before narration begins. The engine then performs low-latency speech with
            synchronized lip shaping, autonomous micro eye motion, random blink timing, breathing drift, and expression blending.
          </p>
          <p>
            The renderer updates only on dirty state diffs to keep frame cost low and maintain smooth mobile interaction.
          </p>
        </article>

        <section className="rounded-2xl border border-amber-500/30 bg-slate-900/70 p-4 text-xs sm:text-sm">
          <h2 className="mb-2 font-bold text-amber-200">FadhilAiEngine Analysis & Verification</h2>
          {!scanReport && <p className="text-slate-300">No scan report yet. Press <strong>Run FadhilAiEngine Scan</strong> before push.</p>}
          {scanReport && (
            <div className="space-y-2">
              <p className={scanReport.ok ? 'text-emerald-300' : 'text-red-300'}>{scanReport.summary}</p>
              <p className="text-slate-300">Scanned files: {scanReport.scannedFiles.length}</p>
              {scanReport.recentCommits.length > 0 && (
                <div>
                  <p className="font-semibold text-cyan-200">Recent commits</p>
                  <ul className="list-disc space-y-1 pl-5 text-slate-300">
                    {scanReport.recentCommits.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </div>
              )}
              {scanReport.findings.length > 0 && (
                <div>
                  <p className="font-semibold text-cyan-200">Findings</p>
                  <ul className="list-disc space-y-1 pl-5 text-slate-300">
                    {scanReport.findings.map((f, idx) => <li key={`${f.file}-${f.line}-${idx}`}>[{f.severity.toUpperCase()}] {f.rule} — {f.file}:{f.line}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
