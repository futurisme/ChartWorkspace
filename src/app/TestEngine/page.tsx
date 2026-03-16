'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type EngineState = 'idle' | 'speaking' | 'paused' | 'unsupported';

function splitIntoChunks(text: string): string[] {
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function pickBestVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (voices.length === 0) return null;
  const preferred = voices.find((voice) => /en|id/i.test(voice.lang) && /Google|Microsoft|Samantha|Natural/i.test(voice.name));
  return preferred ?? voices[0];
}

export default function TestEnginePage() {
  const scriptRef = useRef<HTMLDivElement | null>(null);
  const queueRef = useRef<string[]>([]);
  const utteranceIndexRef = useRef(0);
  const [state, setState] = useState<EngineState>('idle');
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setState('unsupported');
      return;
    }

    const syncVoices = () => {
      const list = window.speechSynthesis.getVoices();
      setVoices(list);
    };

    syncVoices();
    window.speechSynthesis.onvoiceschanged = syncVoices;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
      window.speechSynthesis.cancel();
    };
  }, []);

  const bestVoice = useMemo(() => pickBestVoice(voices), [voices]);

  const speakNext = useCallback(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setState('unsupported');
      return;
    }

    const index = utteranceIndexRef.current;
    const next = queueRef.current[index];
    if (!next) {
      setState('idle');
      return;
    }

    const utterance = new SpeechSynthesisUtterance(next);
    if (bestVoice) {
      utterance.voice = bestVoice;
      utterance.lang = bestVoice.lang;
    } else {
      utterance.lang = 'en-US';
    }

    // expressive but clear profile
    utterance.rate = 0.97;
    utterance.pitch = 1.02;
    utterance.volume = 1;

    utterance.onend = () => {
      utteranceIndexRef.current += 1;
      speakNext();
    };

    utterance.onerror = () => {
      utteranceIndexRef.current += 1;
      speakNext();
    };

    setState('speaking');
    window.speechSynthesis.speak(utterance);
  }, [bestVoice]);

  const handleStart = useCallback(() => {
    if (!scriptRef.current || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setState('unsupported');
      return;
    }

    window.speechSynthesis.cancel();
    utteranceIndexRef.current = 0;
    queueRef.current = splitIntoChunks(scriptRef.current.innerText);
    if (queueRef.current.length === 0) {
      setState('idle');
      return;
    }

    speakNext();
  }, [speakNext]);

  const handlePauseResume = useCallback(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setState('unsupported');
      return;
    }

    if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
      window.speechSynthesis.pause();
      setState('paused');
      return;
    }

    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setState('speaking');
    }
  }, []);

  const handleStop = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    utteranceIndexRef.current = 0;
    queueRef.current = [];
    setState('idle');
  }, []);

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
          </div>
        </header>

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
      </section>
    </main>
  );
}
