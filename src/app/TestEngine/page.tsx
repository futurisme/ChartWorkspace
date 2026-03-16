'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type EngineState = 'idle' | 'speaking' | 'paused' | 'unsupported';
type FaceMood = 'idle' | 'talking' | 'excited' | 'calm';

type ScanFinding = { severity: 'high' | 'medium' | 'low'; file: string; line: number; rule: string; snippet: string };
type ScanReport = { ok: boolean; summary: string; scannedFiles: string[]; recentCommits: string[]; findings: ScanFinding[] };

function splitIntoChunks(text: string): string[] {
  const compact = text.replace(/\s+/g, ' ').trim();
  if (!compact) return [];

  const sentenceChunks = compact
    .split(/(?<=[.!?])\s+/)
    .map((line) => line.trim())
    .filter(Boolean);

  const output: string[] = [];
  for (const part of sentenceChunks) {
    if (part.length <= 220) {
      output.push(part);
      continue;
    }

    const words = part.split(' ');
    let buffer = '';
    for (const word of words) {
      const candidate = buffer ? `${buffer} ${word}` : word;
      if (candidate.length > 200) {
        if (buffer) output.push(buffer);
        buffer = word;
      } else {
        buffer = candidate;
      }
    }
    if (buffer) output.push(buffer);
  }

  return output;
}

function pickBestVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (voices.length === 0) return null;

  const preferredNames = ['Google', 'Microsoft', 'Samantha', 'Natural', 'Enhanced', 'Premium'];
  const preferredLang = voices.find((voice) =>
    /en|id/i.test(voice.lang)
    && preferredNames.some((name) => voice.name.toLowerCase().includes(name.toLowerCase()))
  );

  return preferredLang ?? voices.find((voice) => /en|id/i.test(voice.lang)) ?? voices[0];
}

export default function TestEnginePage() {
  const scriptRef = useRef<HTMLDivElement | null>(null);
  const queueRef = useRef<string[]>([]);
  const utteranceIndexRef = useRef(0);
  const watchdogRef = useRef<number | null>(null);
  const faceDecayRef = useRef<number | null>(null);
  const [state, setState] = useState<EngineState>('idle');
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [status, setStatus] = useState('Ready');
  const [scanReport, setScanReport] = useState<ScanReport | null>(null);
  const [scanState, setScanState] = useState<'idle' | 'running'>('idle');

  // Mobile-only expressive face runtime
  const [faceEnergy, setFaceEnergy] = useState(0.08);
  const [faceMood, setFaceMood] = useState<FaceMood>('idle');
  const [faceBlink, setFaceBlink] = useState(false);

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

    const blinkTimer = window.setInterval(() => {
      setFaceBlink(true);
      window.setTimeout(() => setFaceBlink(false), 110);
    }, 2800);

    return () => {
      window.clearInterval(voiceRetry);
      window.clearInterval(blinkTimer);
      window.speechSynthesis.onvoiceschanged = null;
      window.speechSynthesis.cancel();
      if (watchdogRef.current) {
        window.clearTimeout(watchdogRef.current);
      }
      if (faceDecayRef.current) {
        window.clearInterval(faceDecayRef.current);
      }
    };
  }, [syncVoices]);

  const bestVoice = useMemo(() => pickBestVoice(voices), [voices]);

  const clearWatchdog = () => {
    if (watchdogRef.current && typeof window !== 'undefined') {
      window.clearTimeout(watchdogRef.current);
      watchdogRef.current = null;
    }
  };

  const boostFace = useCallback((value: number, text?: string) => {
    setFaceEnergy((prev) => Math.min(1, Math.max(prev, value)));
    if (!text) {
      setFaceMood('talking');
      return;
    }

    if (/[!?]/.test(text)) {
      setFaceMood('excited');
    } else if (text.length > 100) {
      setFaceMood('calm');
    } else {
      setFaceMood('talking');
    }
  }, []);

  const startFaceDecay = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (faceDecayRef.current) {
      window.clearInterval(faceDecayRef.current);
    }

    faceDecayRef.current = window.setInterval(() => {
      setFaceEnergy((prev) => {
        const next = Math.max(0.06, prev - 0.05);
        if (next <= 0.07 && state !== 'speaking') {
          setFaceMood('idle');
        }
        return next;
      });
    }, 120);
  }, [state]);

  const stopFaceDecay = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (faceDecayRef.current) {
      window.clearInterval(faceDecayRef.current);
      faceDecayRef.current = null;
    }
  }, []);

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
      setState('idle');
      setStatus('Reading complete.');
      setFaceMood('idle');
      stopFaceDecay();
      setFaceEnergy(0.08);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(next);
    if (bestVoice) {
      utterance.voice = bestVoice;
      utterance.lang = bestVoice.lang;
    } else {
      utterance.lang = 'en-US';
    }

    utterance.rate = 0.95;
    utterance.pitch = 1.04;
    utterance.volume = 1;

    utterance.onstart = () => {
      setState('speaking');
      setStatus(`Speaking ${index + 1}/${queueRef.current.length}`);
      boostFace(0.34, next);
      startFaceDecay();
    };

    utterance.onboundary = (event) => {
      if (event.name === 'word' || event.charIndex >= 0) {
        const variation = 0.28 + Math.random() * 0.55;
        boostFace(variation, next);
      }
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
    }, 5500);
  }, [bestVoice, boostFace, startFaceDecay, state, stopFaceDecay]);

  const handleStart = useCallback(() => {
    if (!scriptRef.current || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setState('unsupported');
      setStatus('Speech engine unsupported in this browser.');
      return;
    }

    window.speechSynthesis.cancel();
    const warm = new SpeechSynthesisUtterance(' ');
    warm.volume = 0;
    warm.rate = 1;
    warm.pitch = 1;
    window.speechSynthesis.speak(warm);

    utteranceIndexRef.current = 0;
    queueRef.current = splitIntoChunks(scriptRef.current.innerText);

    if (queueRef.current.length === 0) {
      setState('idle');
      setStatus('No readable text found.');
      return;
    }

    setStatus('Initializing live voice...');
    boostFace(0.2);
    window.setTimeout(() => {
      speakNext();
    }, 40);
  }, [boostFace, speakNext]);

  const handlePauseResume = useCallback(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setState('unsupported');
      setStatus('Speech engine unsupported in this browser.');
      return;
    }

    if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
      window.speechSynthesis.pause();
      setState('paused');
      setStatus('Paused');
      setFaceMood('calm');
      return;
    }

    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setState('speaking');
      setStatus('Resumed');
      setFaceMood('talking');
      return;
    }

    if (!window.speechSynthesis.speaking && queueRef.current.length > 0) {
      speakNext();
    }
  }, [speakNext]);

  const handleStop = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    clearWatchdog();
    stopFaceDecay();
    utteranceIndexRef.current = 0;
    queueRef.current = [];
    setState('idle');
    setStatus('Stopped');
    setFaceMood('idle');
    setFaceEnergy(0.08);
  }, [stopFaceDecay]);

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
        findings: [
          { severity: 'high', file: 'runtime', line: 0, rule: 'scan-fetch-error', snippet: message },
        ],
      });
    } finally {
      setScanState('idle');
    }
  }, []);

  const mouthHeight = 8 + faceEnergy * 22;
  const eyeScaleY = faceBlink ? 0.08 : 0.95 - faceEnergy * 0.22;
  const browOffset = faceMood === 'excited' ? -4 : faceMood === 'calm' ? 1 : -1;
  const cheekGlow = 0.2 + faceEnergy * 0.7;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <section className="mx-auto w-full max-w-6xl p-3 sm:p-4">
        <header className="sticky top-2 z-10 mb-3 rounded-xl border border-cyan-400/30 bg-slate-900/90 p-3 backdrop-blur">
          <div className="mb-2 text-[11px] uppercase tracking-[0.2em] text-cyan-200/80">FadhilAiEngine / TestEngine</div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={handleStart} className="rounded border border-cyan-300 bg-cyan-600 px-3 py-1 text-xs font-semibold text-white hover:bg-cyan-500" disabled={state === 'unsupported'}>Start</button>
            <button type="button" onClick={handlePauseResume} className="rounded border border-violet-300 bg-violet-600 px-3 py-1 text-xs font-semibold text-white hover:bg-violet-500" disabled={state === 'unsupported' || state === 'idle'}>
              {state === 'paused' ? 'Resume' : 'Pause'}
            </button>
            <button type="button" onClick={handleStop} className="rounded border border-red-300 bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-500" disabled={state === 'unsupported' || state === 'idle'}>Stop</button>
            <button type="button" onClick={runScan} className="rounded border border-amber-300 bg-amber-500 px-3 py-1 text-xs font-semibold text-slate-950 hover:bg-amber-400" disabled={scanState === 'running'}>{scanState === 'running' ? 'Scanning…' : 'Run FadhilAiEngine Scan'}</button>
          </div>
          <p className="mt-2 text-[11px] text-cyan-100/90">Status: {status}</p>
          <p className="text-[11px] text-slate-300">Voice: {bestVoice ? `${bestVoice.name} (${bestVoice.lang})` : 'Auto / pending'}</p>
          <p className="text-[11px] font-semibold text-amber-200">Required policy: run FadhilAiEngine scan before every push.</p>
        </header>

        {/* Mobile-only expressive AI face */}
        <section className="mb-3 block rounded-2xl border border-cyan-500/20 bg-slate-900/70 p-3 sm:hidden">
          <div className="mb-2 text-[10px] uppercase tracking-[0.2em] text-cyan-200/80">Dynamic Face</div>
          <div className="mx-auto w-full max-w-[280px]">
            <svg viewBox="0 0 280 200" className="w-full" role="img" aria-label="FadhilAiEngine expressive face">
              <defs>
                <radialGradient id="faceCore" cx="50%" cy="35%" r="70%">
                  <stop offset="0%" stopColor="#67e8f9" stopOpacity={0.65 + faceEnergy * 0.2} />
                  <stop offset="100%" stopColor="#0f172a" stopOpacity="1" />
                </radialGradient>
              </defs>

              <ellipse cx="140" cy="100" rx="92" ry="82" fill="url(#faceCore)" stroke="#22d3ee" strokeOpacity="0.55" />

              <circle cx="94" cy="120" r="18" fill="#22d3ee" opacity={cheekGlow} />
              <circle cx="186" cy="120" r="18" fill="#22d3ee" opacity={cheekGlow} />

              <g transform={`translate(86 ${72 + browOffset})`}>
                <rect x="-20" y="0" width="40" height="4" rx="2" fill="#a5f3fc" opacity="0.9" />
              </g>
              <g transform={`translate(194 ${72 + browOffset})`}>
                <rect x="-20" y="0" width="40" height="4" rx="2" fill="#a5f3fc" opacity="0.9" />
              </g>

              <g transform={`translate(86 90) scale(1 ${eyeScaleY})`}>
                <ellipse cx="0" cy="0" rx="15" ry="11" fill="#e0f2fe" />
                <circle cx="0" cy="0" r={5 + faceEnergy * 3} fill="#0e7490" />
              </g>

              <g transform={`translate(194 90) scale(1 ${eyeScaleY})`}>
                <ellipse cx="0" cy="0" rx="15" ry="11" fill="#e0f2fe" />
                <circle cx="0" cy="0" r={5 + faceEnergy * 3} fill="#0e7490" />
              </g>

              <g transform="translate(140 130)">
                <rect x={-26} y={-mouthHeight / 2} width={52} height={mouthHeight} rx={mouthHeight / 2} fill="#082f49" stroke="#38bdf8" />
                <rect x={-18} y={-2} width={36} height={4} rx="2" fill="#67e8f9" opacity={0.6 + faceEnergy * 0.3} />
              </g>
            </svg>
          </div>
        </section>

        <article
          ref={scriptRef}
          className="space-y-3 rounded-2xl border border-slate-700 bg-slate-900/70 p-4 text-sm leading-relaxed sm:text-base"
        >
          <h1 className="text-lg font-bold text-cyan-200 sm:text-xl">FadhilAiEngine Live Voice Script</h1>
          <p>
            This standalone autonomous engine reads all text in this material clearly and continuously once the Start button is pressed.
            It uses independent in-browser synthesis and does not depend on third-party workflow libraries.
          </p>
          <p>
            The voice pipeline is optimized for intelligibility, pacing, and clear sentence boundaries.
            The engine performs segmentation, queue scheduling, progressive utterance playback, and automatic continuation until all text is completed.
          </p>
          <p>
            You can pause and resume to control live narration flow.
            You can also stop at any moment to reset the queue and start over.
          </p>
          <p>
            FadhilAiEngine is intentionally isolated in this secret TestEngine route for controlled development and confidential experimentation.
          </p>
        </article>

        <section className="mt-3 rounded-2xl border border-amber-500/30 bg-slate-900/70 p-4 text-xs sm:text-sm">
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
