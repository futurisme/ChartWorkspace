'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FadhilAiFaceSystem, type FaceParams } from '@/features/security/shared/fadhil-ai-face-system';

type EngineState = 'idle' | 'speaking' | 'unsupported';

type BroadcastPayload = {
  type: 'fadhil-ai-chat-speak';
  text: string;
  id: string;
};

const CHANNEL = 'fadhil-ai-global-face-v1';
const STORAGE_KEY = 'fadhil-ai-global-face-payload';

const initialFace: FaceParams = {
  eye_open: 0.92,
  eye_squint: 0.06,
  gaze_x: 0,
  gaze_y: 0,
  mouth_open: 0.08,
  mouth_smile: 0.28,
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

function splitIntoChunks(text: string): string[] {
  const compact = text.replace(/\s+/g, ' ').trim();
  if (!compact) return [];
  return compact.split(/(?<=[.!?])\s+/).filter(Boolean);
}

function pickBestVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (voices.length === 0) return null;
  const preferredNames = ['Google', 'Microsoft', 'Samantha', 'Natural', 'Enhanced', 'Premium'];
  const preferred = voices.find((voice) => /en|id/i.test(voice.lang) && preferredNames.some((n) => voice.name.toLowerCase().includes(n.toLowerCase())));
  return preferred ?? voices.find((voice) => /en|id/i.test(voice.lang)) ?? voices[0];
}

export function FadhilAiGlobalChat() {
  const engineRef = useRef(new FadhilAiFaceSystem());
  const frameRef = useRef<number | null>(null);
  const lastTsRef = useRef(0);
  const queueRef = useRef<string[]>([]);
  const idxRef = useRef(0);
  const speakingRef = useRef(false);
  const seenRef = useRef(new Set<string>());
  const channelRef = useRef<BroadcastChannel | null>(null);
  const canBroadcastRef = useRef(false);

  const [face, setFace] = useState<FaceParams>(initialFace);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [state, setState] = useState<EngineState>('idle');
  const [openInput, setOpenInput] = useState(false);
  const [chatInput, setChatInput] = useState('');

  const bestVoice = useMemo(() => pickBestVoice(voices), [voices]);

  const speakNext = useCallback(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setState('unsupported');
      return;
    }

    const next = queueRef.current[idxRef.current];
    if (!next) {
      speakingRef.current = false;
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
    utterance.rate = 0.98;
    utterance.pitch = 1.02;
    utterance.volume = 1;

    utterance.onstart = () => {
      speakingRef.current = true;
      setState('speaking');
    };
    utterance.onend = () => {
      idxRef.current += 1;
      speakNext();
    };
    utterance.onerror = () => {
      idxRef.current += 1;
      speakNext();
    };

    window.speechSynthesis.speak(utterance);
  }, [bestVoice]);

  const playPayload = useCallback(async (payload: BroadcastPayload) => {
    if (seenRef.current.has(payload.id)) return;
    seenRef.current.add(payload.id);
    idxRef.current = 0;
    queueRef.current = splitIntoChunks(payload.text);
    await engineRef.current.runDetection(payload.text);
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
    speakNext();
  }, [speakNext]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('speechSynthesis' in window)) {
      setState('unsupported');
      return;
    }

    const syncVoices = () => setVoices(window.speechSynthesis.getVoices());
    syncVoices();
    window.speechSynthesis.onvoiceschanged = syncVoices;

    const anim = (ts: number) => {
      const last = lastTsRef.current || ts;
      const dt = Math.min(0.05, (ts - last) / 1000);
      lastTsRef.current = ts;
      const step = engineRef.current.step(ts, dt, speakingRef.current);
      if (step.dirty) setFace({ ...step.params });
      frameRef.current = window.requestAnimationFrame(anim);
    };
    frameRef.current = window.requestAnimationFrame(anim);

    canBroadcastRef.current = typeof window.BroadcastChannel !== 'undefined';
    if (canBroadcastRef.current) {
      try {
        channelRef.current = new BroadcastChannel(CHANNEL);
        channelRef.current.onmessage = (event: MessageEvent<BroadcastPayload>) => {
          if (event.data?.type === 'fadhil-ai-chat-speak') void playPayload(event.data);
        };
      } catch {
        canBroadcastRef.current = false;
      }
    }

    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY || !event.newValue) return;
      try {
        const payload = JSON.parse(event.newValue) as BroadcastPayload;
        if (payload?.type === 'fadhil-ai-chat-speak') void playPayload(payload);
      } catch {
        // ignore malformed payload
      }
    };
    window.addEventListener('storage', onStorage);

    return () => {
      window.speechSynthesis.cancel();
      window.speechSynthesis.onvoiceschanged = null;
      if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
      window.removeEventListener('storage', onStorage);
      channelRef.current?.close();
    };
  }, [playPayload]);

  const sendChat = async () => {
    const text = chatInput.trim();
    if (!text) return;
    setChatInput('');
    setOpenInput(false);
    const payload: BroadcastPayload = {
      type: 'fadhil-ai-chat-speak',
      text,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    };
    if (canBroadcastRef.current && channelRef.current) {
      channelRef.current.postMessage(payload);
    } else if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      } catch {
        // storage may be unavailable in private mode
      }
    }
    await playPayload(payload);
  };

  const eyeScaleY = Math.max(0.03, face.eye_open);
  const eyelidDrop = Math.max(0, 1 - face.eye_open);
  const browOffset = Math.round(face.brow_height * 22);
  const mouthHeight = 8 + face.mouth_open * 34;
  const mouthWidth = 26 + face.lip_width * 34;
  const smileLift = face.mouth_smile * 9;
  const jawY = 128 + face.jaw_rotation * 10;
  const cheekGlow = 0.15 + face.breath * 0.22;
  const headTiltDeg = face.head_tilt * 22;
  const headShiftX = face.head_shift_x;
  const headShiftY = face.head_shift_y + face.breath;

  return (
    <>
      <div className="fixed bottom-3 right-3 z-40 flex items-center gap-2">
        {openInput && (
          <div className="flex items-center gap-1 rounded-full border border-cyan-300/50 bg-slate-900/95 px-2 py-1 shadow-xl">
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void sendChat();
              }}
              className="w-28 rounded bg-slate-800 px-2 py-1 text-[11px] text-cyan-100 outline-none"
              placeholder="chat"
            />
            <button type="button" onClick={() => void sendChat()} className="rounded bg-cyan-600 px-2 py-1 text-[11px] font-semibold text-white">Go</button>
          </div>
        )}
        <button type="button" onClick={() => setOpenInput((v) => !v)} className="h-9 w-9 rounded-full bg-cyan-600 text-sm font-bold text-white shadow-xl">💬</button>
      </div>

      <div className={`pointer-events-none fixed inset-0 z-30 flex items-start justify-center transition-transform duration-300 ${state === 'speaking' ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}>
        <div className="mt-8 w-[290px] rounded-2xl border border-amber-300/50 bg-slate-900/85 p-2 shadow-2xl backdrop-blur">
          <svg viewBox="0 0 280 200" className="w-full" role="img" aria-label="FadhilAiEngine global dynamic face">
            <defs>
              <radialGradient id="globalFaceCore" cx="50%" cy="35%" r="70%">
                <stop offset="0%" stopColor="#fde68a" stopOpacity={0.68 + face.mouth_open * 0.22} />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.92" />
              </radialGradient>
            </defs>
            <g transform={`translate(${headShiftX} ${headShiftY}) rotate(${headTiltDeg} 140 100)`}>
              <path d="M66,84 C76,38 204,34 214,84 L214,90 C204,70 76,70 66,90 Z" fill="#111827" opacity="0.92" />
              <ellipse cx="140" cy="100" rx="92" ry={82 + face.breath * 1.7} fill="url(#globalFaceCore)" stroke="#92400e" strokeOpacity="0.62" />
              <circle cx="94" cy="120" r="18" fill="#f97316" opacity={cheekGlow} />
              <circle cx="186" cy="120" r="18" fill="#f97316" opacity={cheekGlow} />
              <g transform={`translate(86 ${72 + browOffset})`}><rect x="-22" y="0" width="44" height="4" rx="2" fill="#1f2937" opacity="0.9" /></g>
              <g transform={`translate(194 ${72 + browOffset})`}><rect x="-22" y="0" width="44" height="4" rx="2" fill="#1f2937" opacity="0.9" /></g>
              <g transform={`translate(86 90) scale(1 ${eyeScaleY})`}>
                <ellipse cx="0" cy="0" rx="15" ry="11" fill="#fff7ed" />
                <rect x={-15} y={-11} width={30} height={22 * eyelidDrop} fill="#f59e0b" opacity={0.92} />
                <circle cx={face.gaze_x} cy={face.gaze_y} r={4.8 + face.eye_squint * 4.2} fill="#1f2937" />
              </g>
              <g transform={`translate(194 90) scale(1 ${eyeScaleY})`}>
                <ellipse cx="0" cy="0" rx="15" ry="11" fill="#fff7ed" />
                <rect x={-15} y={-11} width={30} height={22 * eyelidDrop} fill="#f59e0b" opacity={0.92} />
                <circle cx={face.gaze_x * 0.94} cy={face.gaze_y * 0.88} r={4.8 + face.eye_squint * 4.2} fill="#1f2937" />
              </g>
              <g transform={`translate(140 ${jawY})`}>
                <rect x={-mouthWidth / 2} y={-mouthHeight / 2} width={mouthWidth} height={mouthHeight} rx={mouthHeight / 2} fill="#7c2d12" stroke="#fbbf24" />
                <ellipse cx="0" cy={Math.max(0, mouthHeight * 0.14)} rx={Math.max(6, mouthWidth * 0.2)} ry={Math.max(2, mouthHeight * 0.18)} fill="#fb923c" opacity={0.56 + face.mouth_open * 0.25} />
                <path d={`M ${-mouthWidth * 0.34} ${2 - smileLift} Q 0 ${8 - smileLift - face.mouth_open * 2} ${mouthWidth * 0.34} ${2 - smileLift}`} stroke="#fde68a" strokeWidth="3" fill="none" strokeLinecap="round" />
              </g>
            </g>
          </svg>
        </div>
      </div>
    </>
  );
}
