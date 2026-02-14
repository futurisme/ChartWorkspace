'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRealtime } from '@/components/RealtimeProvider';

export function RefreshAlertSettings() {
  const { doc, localPresence } = useRealtime();
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const normalizedReason = useMemo(() => reason.trim(), [reason]);

  const handleSendRefreshAlert = useCallback(() => {
    if (!doc || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    try {
      const alertsMap = doc.getMap<unknown>('system-alerts');
      const nonce = Date.now();
      const fallbackReason = 'Admin meminta refresh sekarang.';
      doc.transact(() => {
        alertsMap.set('refreshAlertNonce', nonce);
        alertsMap.set('refreshAlertReason', normalizedReason || fallbackReason);
        alertsMap.set('refreshAlertBy', localPresence?.displayName ?? 'Collaborator');
      }, 'local');
      setReason('');
      setIsOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  }, [doc, isSubmitting, localPresence?.displayName, normalizedReason]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="shrink-0 rounded border border-cyan-300/30 bg-slate-900/75 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-cyan-100"
      >
        Settings
      </button>

      {isOpen && (
        <div className="absolute right-0 top-[calc(100%+0.35rem)] z-[70] w-[min(92vw,340px)] rounded-lg border border-cyan-400/30 bg-slate-950/95 p-3 shadow-xl backdrop-blur">
          <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-cyan-100">Workspace settings</h3>
          <p className="mt-1 text-[11px] text-cyan-200/80">Fitur internal untuk semua kolaborator aktif.</p>

          <div className="mt-3 border-t border-cyan-500/20 pt-3">
            <p className="text-[11px] font-semibold text-cyan-100">Give refresh alert sekarang</p>
            <label className="mt-1 block text-[10px] uppercase tracking-[0.06em] text-cyan-200/75" htmlFor="refresh-reason">
              Alasan refresh
            </label>
            <textarea
              id="refresh-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={3}
              placeholder="Contoh: Update sinkronisasi baru sudah aktif."
              className="mt-1 w-full resize-none rounded-md border border-cyan-300/30 bg-slate-900 px-2 py-1.5 text-xs text-cyan-50 outline-none focus:border-cyan-200"
            />
            <button
              type="button"
              onClick={handleSendRefreshAlert}
              disabled={!doc || isSubmitting}
              className="mt-2 w-full rounded-md border border-amber-800/40 bg-amber-500 px-2.5 py-1.5 text-xs font-semibold text-amber-950 transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? 'Sending…' : 'Give refresh alert now'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
