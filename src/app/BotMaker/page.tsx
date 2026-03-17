'use client';

import { useEffect, useMemo, useState } from 'react';
import type { BotMakerBot, BotStylePreset, BotMakerState } from '@/features/botmaker/shared/schema';

interface ApiPayload {
  data: BotMakerState;
  version: number;
  updatedAt: string;
}

const EMPTY_BOT: BotMakerBot = {
  id: '',
  name: '',
  token: '',
  hasToken: false,
  tokenUpdatedAt: null,
  applicationId: '',
  guildId: '',
  channelId: '',
  messageTemplate: 'Halo dari BotMaker!',
  intervalSeconds: 300,
  enabled: false,
  deployedAt: null,
  lastDeployStatus: '',
  useEmbed: true,
  mentionEveryone: false,
  stylePreset: 'minimal',
};

const PRESET_LIBRARY: Record<BotStylePreset, { label: string; template: string; useEmbed: boolean; mentionEveryone: boolean }> = {
  minimal: { label: 'Minimal Update', template: 'Update terbaru sudah online. Cek sekarang.', useEmbed: true, mentionEveryone: false },
  alert: { label: 'Critical Alert', template: 'Terjadi incident penting. Tim diminta segera cek dashboard.', useEmbed: true, mentionEveryone: true },
  release: { label: 'Product Release', template: 'Versi baru sudah rilis dengan peningkatan performa.', useEmbed: true, mentionEveryone: false },
  community: { label: 'Community Pulse', template: 'Halo komunitas! Event mingguan sudah dibuka.', useEmbed: false, mentionEveryone: false },
};

function createBotId() {
  return `bot-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function BotMakerPage() {
  const [state, setState] = useState<BotMakerState>({ bots: [], users: [] });
  const [version, setVersion] = useState<number>(0);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [loginUser, setLoginUser] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const stats = useMemo(
    () => ({ total: state.bots.length, active: state.bots.filter((bot) => bot.enabled).length }),
    [state.bots]
  );

  const refresh = async () => {
    setError('');
    try {
      const response = await fetch('/api/botmaker', { cache: 'no-store' });
      if (response.status === 401) {
        setAuthenticated(false);
        return;
      }
      const payload = (await response.json()) as ApiPayload | { error?: string };
      if (!response.ok) throw new Error((payload as { error?: string }).error ?? 'Load failed');
      setState((payload as ApiPayload).data);
      setVersion((payload as ApiPayload).version);
      setAuthenticated(true);
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
      if (!response.ok) throw new Error((payload as { error?: string }).error ?? 'Save failed');
      setState((payload as ApiPayload).data);
      setVersion((payload as ApiPayload).version);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setIsBusy(false);
    }
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
      const payload = (await response.json()) as ApiPayload | { error?: string };
      if (!response.ok) throw new Error((payload as { error?: string }).error ?? `${action} failed`);
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

  const updateBot = (botId: string, patch: Partial<BotMakerBot>) => {
    setState((prev) => ({ bots: prev.bots.map((bot) => (bot.id === botId ? { ...bot, ...patch } : bot)), users: [] }));
  };

  const applyPreset = (bot: BotMakerBot, preset: BotStylePreset) => {
    const library = PRESET_LIBRARY[preset];
    updateBot(bot.id, {
      stylePreset: preset,
      messageTemplate: library.template,
      useEmbed: library.useEmbed,
      mentionEveryone: library.mentionEveryone,
    });
  };

  const doLogin = async () => {
    setError('');
    setIsBusy(true);
    try {
      const response = await fetch('/api/botmaker/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUser, password: loginPassword }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? 'Login failed');
      setAuthenticated(true);
      setLoginPassword('');
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsBusy(false);
    }
  };

  const doLogout = async () => {
    await fetch('/api/botmaker/auth', { method: 'DELETE' });
    setAuthenticated(false);
    setState({ bots: [], users: [] });
  };

  if (!authenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#030712] p-4 text-slate-100">
        <section className="w-full max-w-sm rounded-xl border border-cyan-400/30 bg-slate-950/85 p-4">
          <h1 className="text-lg font-black text-cyan-100">BotMaker Login</h1>
          <p className="mt-1 text-xs text-cyan-200/80">Scope hanya untuk /BotMaker. User yang sama akan dipertahankan via cookie login.</p>
          <div className="mt-3 grid gap-2">
            <input value={loginUser} onChange={(e) => setLoginUser(e.target.value)} placeholder="Username" className="rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs" />
            <input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} placeholder="Password" className="rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs" />
            <button type="button" onClick={() => void doLogin()} disabled={isBusy} className="rounded border border-cyan-400/40 bg-cyan-500/20 px-3 py-1.5 text-xs font-semibold text-cyan-100 disabled:opacity-50">Login / Register</button>
          </div>
          {error && <p className="mt-2 rounded border border-red-500/30 bg-red-900/30 p-2 text-xs text-red-200">{error}</p>}
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#030712] px-3 py-4 text-slate-100 sm:px-6">
      <section className="mx-auto max-w-6xl rounded-2xl border border-cyan-400/25 bg-slate-950/80 p-4 shadow-[0_20px_60px_rgba(6,182,212,0.12)]">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-black tracking-tight text-cyan-100 sm:text-3xl">BotMaker Studio</h1>
            <p className="text-xs text-cyan-200/80">Token hanya dimasukkan sekali, disimpan aman, dan tidak perlu diinput ulang.</p>
          </div>
          <div className="flex items-center gap-3 text-right text-xs text-slate-300">
            <div>
              <p>Total bot: {stats.total}</p>
              <p>Active deployed: {stats.active}</p>
            </div>
            <button type="button" onClick={() => void doLogout()} className="rounded border border-slate-600 bg-slate-900 px-2 py-1 text-xs">Logout</button>
          </div>
        </div>

        <div className="mb-3 flex flex-wrap gap-2">
          <button type="button" onClick={() => setState((prev) => ({ users: [], bots: [...prev.bots, { ...EMPTY_BOT, id: createBotId(), name: `Bot ${prev.bots.length + 1}` }] }))} className="rounded-lg border border-cyan-400/40 bg-cyan-500/20 px-3 py-1.5 text-xs font-semibold text-cyan-100">Add bot draft</button>
          <button type="button" onClick={() => void persist(state)} disabled={isBusy} className="rounded-lg border border-emerald-400/40 bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-100 disabled:opacity-50">Save all</button>
          <button type="button" onClick={() => void refresh()} disabled={isBusy} className="rounded-lg border border-violet-400/40 bg-violet-500/20 px-3 py-1.5 text-xs font-semibold text-violet-100 disabled:opacity-50">Reload</button>
        </div>

        {error && <div className="mb-3 rounded-lg border border-red-500/30 bg-red-900/25 px-3 py-2 text-xs text-red-200">{error}</div>}

        <div className="grid gap-3">
          {state.bots.map((bot) => {
            const presetMeta = PRESET_LIBRARY[bot.stylePreset];
            return (
              <article key={bot.id} className="rounded-xl border border-cyan-400/25 bg-slate-900/65 p-3">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <strong className="text-cyan-100">{bot.name || bot.id}</strong>
                  <span className="text-slate-300">{bot.lastDeployStatus || 'Not deployed'}</span>
                </div>

                <div className="grid gap-2 lg:grid-cols-[1.2fr_0.8fr]">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input value={bot.name} onChange={(e) => updateBot(bot.id, { name: e.target.value })} placeholder="Bot name" className="rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs" />
                    <input value={bot.token} onChange={(e) => updateBot(bot.id, { token: e.target.value })} placeholder={bot.hasToken ? `Token tersimpan (${bot.tokenUpdatedAt ?? '-'}) • isi jika ingin ganti` : 'Discord bot token (sekali input)'} className="rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs" />
                    <input value={bot.applicationId} onChange={(e) => updateBot(bot.id, { applicationId: e.target.value })} placeholder="Application ID (optional)" className="rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs" />
                    <input value={bot.guildId} onChange={(e) => updateBot(bot.id, { guildId: e.target.value })} placeholder="Guild ID (optional)" className="rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs" />
                    <input value={bot.channelId} onChange={(e) => updateBot(bot.id, { channelId: e.target.value })} placeholder="Channel ID" className="rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs" />
                    <input type="number" min={60} max={86400} value={bot.intervalSeconds} onChange={(e) => updateBot(bot.id, { intervalSeconds: Number(e.target.value) })} placeholder="Interval seconds" className="rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs" />

                    <select value={bot.stylePreset} onChange={(e) => applyPreset(bot, e.target.value as BotStylePreset)} className="rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs">
                      {(Object.keys(PRESET_LIBRARY) as BotStylePreset[]).map((key) => (
                        <option key={key} value={key}>{PRESET_LIBRARY[key].label}</option>
                      ))}
                    </select>

                    <label className="flex items-center gap-2 rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs"><input type="checkbox" checked={bot.useEmbed} onChange={(e) => updateBot(bot.id, { useEmbed: e.target.checked })} /> Use embed</label>
                    <label className="flex items-center gap-2 rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs"><input type="checkbox" checked={bot.mentionEveryone} onChange={(e) => updateBot(bot.id, { mentionEveryone: e.target.checked })} /> Mention @everyone</label>
                  </div>

                  <div className="rounded border border-cyan-500/30 bg-slate-950/70 p-2 text-xs">
                    <p className="mb-1 font-semibold text-cyan-100">Visual editor preview</p>
                    <p className="mb-1 text-[10px] text-cyan-200/80">Preset: {presetMeta.label}</p>
                    <div className="rounded border border-slate-700 bg-slate-900 p-2">
                      <p className="font-semibold">{bot.name || 'Bot Name'}</p>
                      <p className="mt-1 whitespace-pre-wrap text-slate-300">{bot.mentionEveryone ? '@everyone ' : ''}{bot.messageTemplate || '(empty message)'}</p>
                    </div>
                  </div>
                </div>

                <textarea value={bot.messageTemplate} onChange={(e) => updateBot(bot.id, { messageTemplate: e.target.value })} placeholder="Message template" className="mt-2 min-h-20 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs" />

                <div className="mt-2 flex flex-wrap gap-2">
                  <button type="button" onClick={() => void runAction('deploy', bot.id)} disabled={isBusy} className="rounded border border-cyan-300/50 bg-cyan-500/20 px-2.5 py-1 text-xs font-semibold text-cyan-100 disabled:opacity-50">Deploy + Host</button>
                  <button type="button" onClick={() => void runAction('send-now', bot.id)} disabled={isBusy} className="rounded border border-amber-300/50 bg-amber-500/20 px-2.5 py-1 text-xs font-semibold text-amber-100 disabled:opacity-50">Send test now</button>
                  <button type="button" onClick={() => setState((prev) => ({ users: [], bots: prev.bots.filter((entry) => entry.id !== bot.id) }))} className="rounded border border-red-400/40 bg-red-500/20 px-2.5 py-1 text-xs font-semibold text-red-100">Delete</button>
                </div>
              </article>
            );
          })}

          {state.bots.length === 0 && <p className="rounded-lg border border-slate-700 bg-slate-900/60 p-3 text-xs text-slate-300">No bot yet. Add bot draft and save.</p>}
        </div>
      </section>
    </main>
  );
}
