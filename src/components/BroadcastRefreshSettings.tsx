'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRealtime } from './RealtimeProvider';

export function BroadcastRefreshSettings() {
  const { doc } = useRealtime();
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [reason, setReason] = useState('');
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (!panelRef.current) {
        return;
      }

      if (event.target instanceof Node && !panelRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('pointerdown', handlePointerDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [isOpen]);

  const handleBroadcast = useCallback(() => {
    if (!doc) {
      return;
    }

    const trimmedReason = reason.trim();
    const broadcastMap = doc.getMap<unknown>('systemBroadcast');
    const refreshAlert = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      reason: trimmedReason || 'Wajib refresh halaman untuk memuat pembaruan internal terbaru.',
      createdAt: new Date().toISOString(),
      mandatory: true,
    };

    doc.transact(() => {
      broadcastMap.set('refreshAlert', refreshAlert);
    }, 'local');

    setReason('');
    setIsOpen(false);
  }, [doc, reason]);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="rounded border border-cyan-300/30 bg-slate-900/80 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-cyan-100 hover:bg-slate-800/90 sm:text-[10px]"
      >
        Setting
      </button>

      {isMounted && isOpen && createPortal(
        <div className="fixed inset-0 z-[180]">
          <div className="absolute inset-0 bg-black/25" aria-hidden="true" />
          <div ref={panelRef} className="absolute left-2 top-9 w-[min(92vw,300px)] rounded-lg border border-cyan-500/30 bg-slate-950/98 p-2.5 shadow-[0_18px_40px_rgba(6,182,212,0.35)] backdrop-blur">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-cyan-100">Broadcast refresh wajib</p>
            <label className="mt-1 block text-[10px] text-cyan-200/80" htmlFor="broadcast-refresh-reason">
              Message reason
            </label>
            <input
              id="broadcast-refresh-reason"
              type="text"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Contoh: Hotfix sinkronisasi realtime"
              className="mt-1 w-full rounded border border-cyan-400/35 bg-slate-900 px-2 py-1 text-[11px] text-cyan-50 outline-none focus:border-cyan-200"
            />
            <button
              type="button"
              onClick={handleBroadcast}
              disabled={!doc}
              className="mt-2 w-full rounded border border-amber-400/40 bg-amber-500 px-2 py-1 text-[10px] font-semibold text-amber-950 transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Broadcast alert wajib refresh
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
