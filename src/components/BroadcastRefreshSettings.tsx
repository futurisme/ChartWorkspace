'use client';

import { useCallback, useState } from 'react';
import { useRealtime } from './RealtimeProvider';

export function BroadcastRefreshSettings() {
  const { doc } = useRealtime();
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState('');

  const handleBroadcast = useCallback(() => {
    if (!doc) {
      return;
    }

    const trimmedReason = reason.trim();
    const broadcastMap = doc.getMap<unknown>('systemBroadcast');
    const refreshAlert = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      reason: trimmedReason || 'Mohon refresh halaman untuk memuat sinkronisasi terbaru.',
      createdAt: new Date().toISOString(),
    };

    doc.transact(() => {
      broadcastMap.set('refreshAlert', refreshAlert);
    }, 'local');

    setReason('');
    setIsOpen(false);
  }, [doc, reason]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="rounded border border-cyan-300/30 bg-slate-900/80 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-cyan-100 hover:bg-slate-800/90 sm:text-[10px]"
      >
        Setting
      </button>

      {isOpen && (
        <div className="absolute left-0 top-7 z-[70] w-[min(92vw,270px)] rounded-lg border border-cyan-500/30 bg-slate-950/95 p-2 shadow-[0_12px_24px_rgba(6,182,212,0.2)] backdrop-blur">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-cyan-100">Broadcast alert refresh</p>
          <label className="mt-1 block text-[10px] text-cyan-200/80" htmlFor="broadcast-refresh-reason">
            Message reason
          </label>
          <input
            id="broadcast-refresh-reason"
            type="text"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Contoh: Update sinkronisasi node"
            className="mt-1 w-full rounded border border-cyan-400/35 bg-slate-900 px-2 py-1 text-[11px] text-cyan-50 outline-none focus:border-cyan-200"
          />
          <button
            type="button"
            onClick={handleBroadcast}
            disabled={!doc}
            className="mt-2 w-full rounded border border-amber-400/40 bg-amber-500 px-2 py-1 text-[10px] font-semibold text-amber-950 transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Broadcast alert
          </button>
        </div>
      )}
    </div>
  );
}
