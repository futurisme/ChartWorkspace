'use client';

import { useEffect, useMemo, useState } from 'react';
import type { BotMakerBot, BotMakerState } from '@/features/botmaker/shared/schema';

interface ApiPayload {
  data: BotMakerState;
  version: number;
  updatedAt: string;
}

const EMPTY_BOT: BotMakerBot = {
  id: '',
  name: '',
  token: '',
  applicationId: '',
  guildId: '',
  channelId: '',
  messageTemplate: 'Halo dari BotMaker!',
  intervalSeconds: 300,
  enabled: false,
  deployedAt: null,
  lastDeployStatus: '',
};

function createBotId() {
  return `bot-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function BotMakerPage() {
  const [state, setState] = useState<BotMakerState>({ bots: [] });
  const [version, setVersion] = useState<number>(0);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState('');

  const stats = useMemo(() => ({
    total: state.bots.length,
    active: state.bots.filter((bot) => bot.enabled).length,
  }), [state.bots]);

  const refresh = async () => {
    setError('');
    try {
      const response = await fetch('/api/botmaker', { cache: 'no-store' });
      const payload = (await response.json()) as ApiPayload | { error?: string };
      if (!response.ok) {
        throw new Error((payload as { error?: string }).error ?? 'Load failed');
      }

      setState((payload as ApiPayload).data);
      setVersion((payload as ApiPayload).version);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Load failed');
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const persist = async (next: BotMakerState) => {
    setIsBusy(true);
    setError('');
    try {
      const response = await fetch('/api/botmaker', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: next, expectedVersion: version }),
      });
      const payload = (await response.json()) as ApiPayload | { error?: string };
      if (!response.ok) {
        throw new Error((payload as { error?: string }).error ?? 'Save failed');
      }
      setState((payload as ApiPayload).data);
      setVersion((payload as ApiPayload).version);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setIsBusy(false);
    }
  };

  const updateBot = (botId: string, patch: Partial<BotMakerBot>) => {
    setState((prev) => ({
      bots: prev.bots.map((bot) => (bot.id === botId ? { ...bot, ...patch } : bot)),
    }));
  };

  const runAction = async (action: 'deploy' | 'send-now', botId: string) => {
    setIsBusy(true);
    setError('');
    try {
      const response = await fetch('/api/botmaker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, botId }),
      });
      const payload = await response.json() as ApiPayload | { ok?: boolean; error?: string };
      if (!response.ok) {
        throw new Error((payload as { error?: string }).error ?? `${action} failed`);
      }

      if ('data' in payload) {
        setState(payload.data);
        setVersion(payload.version);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : `${action} failed`);
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#030712] px-3 py-4 text-slate-100 sm:px-6">
      <section className="mx-auto max-w-5xl rounded-2xl border border-cyan-400/25 bg-slate-950/80 p-4 shadow-[0_20px_60px_rgba(6,182,212,0.12)]">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-black tracking-tight text-cyan-100 sm:text-3xl">BotMaker</h1>
            <p className="text-xs text-cyan-200/80">Manual URL-only page for isolated Discord bot hosting/deploy workflow.</p>
          </div>
          <div className="text-right text-xs text-slate-300">
            <p>Total bot: {stats.total}</p>
            <p>Active deployed: {stats.active}</p>
          </div>
        </div>

        <div className="mb-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setState((prev) => ({ bots: [...prev.bots, { ...EMPTY_BOT, id: createBotId(), name: `Bot ${prev.bots.length + 1}` }] }))}
            className="rounded-lg border border-cyan-400/40 bg-cyan-500/20 px-3 py-1.5 text-xs font-semibold text-cyan-100"
          >
            Add bot draft
          </button>
          <button
            type="button"
            onClick={() => void persist(state)}
            disabled={isBusy}
            className="rounded-lg border border-emerald-400/40 bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-100 disabled:opacity-50"
          >
            Save all
          </button>
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={isBusy}
            className="rounded-lg border border-violet-400/40 bg-violet-500/20 px-3 py-1.5 text-xs font-semibold text-violet-100 disabled:opacity-50"
          >
            Reload
          </button>
        </div>

        {error && <div className="mb-3 rounded-lg border border-red-500/30 bg-red-900/25 px-3 py-2 text-xs text-red-200">{error}</div>}

        <div className="grid gap-3">
          {state.bots.map((bot) => (
            <article key={bot.id} className="rounded-xl border border-cyan-400/25 bg-slate-900/65 p-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                <strong className="text-cyan-100">{bot.name || bot.id}</strong>
                <span className="text-slate-300">{bot.lastDeployStatus || 'Not deployed'}</span>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <input value={bot.name} onChange={(e) => updateBot(bot.id, { name: e.target.value })} placeholder="Bot name" className="rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs" />
                <input value={bot.token} onChange={(e) => updateBot(bot.id, { token: e.target.value })} placeholder="Discord bot token" className="rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs" />
                <input value={bot.applicationId} onChange={(e) => updateBot(bot.id, { applicationId: e.target.value })} placeholder="Application ID (optional for command setup)" className="rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs" />
                <input value={bot.guildId} onChange={(e) => updateBot(bot.id, { guildId: e.target.value })} placeholder="Guild ID (optional)" className="rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs" />
                <input value={bot.channelId} onChange={(e) => updateBot(bot.id, { channelId: e.target.value })} placeholder="Channel ID" className="rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs" />
                <input type="number" min={30} max={86400} value={bot.intervalSeconds} onChange={(e) => updateBot(bot.id, { intervalSeconds: Number(e.target.value) })} placeholder="Interval seconds" className="rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs" />
              </div>

              <textarea value={bot.messageTemplate} onChange={(e) => updateBot(bot.id, { messageTemplate: e.target.value })} placeholder="Message template" className="mt-2 min-h-16 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs" />

              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" onClick={() => void runAction('deploy', bot.id)} disabled={isBusy} className="rounded border border-cyan-300/50 bg-cyan-500/20 px-2.5 py-1 text-xs font-semibold text-cyan-100 disabled:opacity-50">Deploy + Host</button>
                <button type="button" onClick={() => void runAction('send-now', bot.id)} disabled={isBusy} className="rounded border border-amber-300/50 bg-amber-500/20 px-2.5 py-1 text-xs font-semibold text-amber-100 disabled:opacity-50">Send test now</button>
                <button type="button" onClick={() => setState((prev) => ({ bots: prev.bots.filter((entry) => entry.id !== bot.id) }))} className="rounded border border-red-400/40 bg-red-500/20 px-2.5 py-1 text-xs font-semibold text-red-100">Delete</button>
              </div>
            </article>
          ))}

          {state.bots.length === 0 && <p className="rounded-lg border border-slate-700 bg-slate-900/60 p-3 text-xs text-slate-300">No bot yet. Add bot draft and save.</p>}
        </div>
      </section>
    </main>
  );
}
