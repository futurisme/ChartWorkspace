'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { BotMakerBot, BotStylePreset, BotMakerState, WorkflowBlock, WorkflowBlockType } from '@/features/botmaker/shared/schema';

interface ApiPayload {
  data: BotMakerState;
  version: number;
  updatedAt: string;
  diagnostics?: { dbHost: string | null; sharedStore: string };
  message?: string;
}

type ActivityLogEntry = {
  ts: string;
  event: string;
  botId: string;
  level?: 'info' | 'warning' | 'error';
  source?: 'internal' | 'external';
  details: Record<string, unknown>;
};

interface ActivityLogPayload {
  logs: ActivityLogEntry[];
}

const PRESET_LIBRARY: Record<BotStylePreset, { label: string; blocks: Array<{ type: WorkflowBlockType; value: string }>; useEmbed: boolean; mentionEveryone: boolean }> = {
  minimal: { label: 'Minimal Update', blocks: [{ type: 'text', value: 'Update terbaru sudah online. Cek sekarang.' }], useEmbed: true, mentionEveryone: false },
  alert: { label: 'Critical Alert', blocks: [{ type: 'emoji', value: '🚨' }, { type: 'text', value: 'Incident penting. Tim diminta cek dashboard sekarang.' }, { type: 'mentionEveryone', value: '' }], useEmbed: true, mentionEveryone: true },
  release: { label: 'Product Release', blocks: [{ type: 'emoji', value: '🚀' }, { type: 'text', value: 'Versi baru sudah rilis dengan peningkatan performa.' }, { type: 'timestamp', value: '' }], useEmbed: true, mentionEveryone: false },
  community: { label: 'Community Pulse', blocks: [{ type: 'emoji', value: '💬' }, { type: 'text', value: 'Halo komunitas! Event mingguan sudah dibuka.' }], useEmbed: false, mentionEveryone: false },
};

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
  workflow: [{ id: 'block-1', type: 'text', value: 'Halo dari BotMaker!' }],
  intervalSeconds: 300,
  enabled: false,
  deployedAt: null,
  lastDeployStatus: '',
  useEmbed: true,
  mentionEveryone: false,
  stylePreset: 'minimal',
  customCode: '',
};

function createBotId() {
  return `bot-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function createBlock(type: WorkflowBlockType): WorkflowBlock {
  return {
    id: `block-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    value: type === 'emoji' ? '✨' : type === 'text' ? 'New text block' : '',
  };
}

function blockLabel(block: WorkflowBlock) {
  if (block.type === 'text') return `Teks: ${block.value || '(kosong)'}`;
  if (block.type === 'emoji') return `Emoji: ${block.value || '✨'}`;
  if (block.type === 'mentionEveryone') return '@everyone';
  if (block.type === 'lineBreak') return 'Baris baru';
  return 'Timestamp relatif';
}

function workflowToPreview(blocks: WorkflowBlock[]) {
  return blocks
    .map((block) => {
      if (block.type === 'text') return block.value;
      if (block.type === 'emoji') return block.value || '✨';
      if (block.type === 'mentionEveryone') return '@everyone';
      if (block.type === 'lineBreak') return '\n';
      return `<t:${Math.floor(Date.now() / 1000)}:R>`;
    })
    .join(' ')
    .replace(/\s+\n/g, '\n')
    .replace(/\n\s+/g, '\n')
    .trim();
}

function buildHybridCode(bot: BotMakerBot) {
  const lines = [
    '# Sintaks Hybrid BotMaker v1 (Bahasa Indonesia)',
    '# Kata kunci: TEKS:, EMOJI:, TAG_SEMUA, BARIS_BARU, WAKTU_RELATIF',
    `NAMA_BOT: ${bot.name || 'Bot Tanpa Nama'}`,
    `INTERVAL_DETIK: ${bot.intervalSeconds}`,
    `MODE_EMBED: ${bot.useEmbed ? 'AKTIF' : 'NONAKTIF'}`,
    '',
    '# Workflow',
    '# Keyword response (contoh):',
    '# RESPON_KATA: halo => Halo juga 👋',
  ];

  for (const block of bot.workflow) {
    if (block.type === 'text') lines.push(`TEKS: ${block.value}`);
    if (block.type === 'emoji') lines.push(`EMOJI: ${block.value || '✨'}`);
    if (block.type === 'mentionEveryone') lines.push('TAG_SEMUA');
    if (block.type === 'lineBreak') lines.push('BARIS_BARU');
    if (block.type === 'timestamp') lines.push('WAKTU_RELATIF');
  }

  if (bot.workflow.length === 0) {
    lines.push('TEKS: Halo dari BotMaker!');
  }

  return lines.join('\n');
}


function getLogTone(level?: 'info' | 'warning' | 'error') {
  if (level === 'error') return 'text-red-300';
  if (level === 'warning') return 'text-amber-300';
  return 'text-cyan-200';
}

function getLogBadge(level?: 'info' | 'warning' | 'error') {
  if (level === 'error') return 'ERR';
  if (level === 'warning') return 'WRN';
  return 'INF';
}

function parseHybridCode(text: string): WorkflowBlock[] {
  const rows = text.split(/\r?\n/).map((row) => row.trim()).filter(Boolean);
  const result: WorkflowBlock[] = [];

  for (const row of rows) {
    if (row.startsWith('#') || row.startsWith('NAMA_BOT:') || row.startsWith('INTERVAL_DETIK:') || row.startsWith('MODE_EMBED:')) {
      continue;
    }

    if (row.startsWith('TEKS:')) {
      result.push({ id: createBlock('text').id, type: 'text', value: row.slice(5).trim() });
      continue;
    }

    if (row.startsWith('EMOJI:')) {
      result.push({ id: createBlock('emoji').id, type: 'emoji', value: row.slice(6).trim() || '✨' });
      continue;
    }

    if (row === 'TAG_SEMUA') {
      result.push({ id: createBlock('mentionEveryone').id, type: 'mentionEveryone', value: '' });
      continue;
    }

    if (row === 'BARIS_BARU') {
      result.push({ id: createBlock('lineBreak').id, type: 'lineBreak', value: '' });
      continue;
    }

    if (row === 'WAKTU_RELATIF') {
      result.push({ id: createBlock('timestamp').id, type: 'timestamp', value: '' });
    }
  }

  return result;
}

export default function BotMakerPage() {
  const [state, setState] = useState<BotMakerState>({ bots: [], users: [] });
  const [version, setVersion] = useState<number>(0);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [loginUser, setLoginUser] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [dragBlockId, setDragBlockId] = useState<string | null>(null);
  const [activeBotId, setActiveBotId] = useState<string | null>(null);
  const [details, setDetails] = useState('');
  const [diagnostics, setDiagnostics] = useState<{ dbHost: string | null; sharedStore: string } | null>(null);
  const [activityLogs, setActivityLogs] = useState<ActivityLogEntry[]>([]);
  const [scrollHint, setScrollHint] = useState({ show: false, up: false, down: false });
  const contentScrollRef = useRef<HTMLDivElement | null>(null);

  const stats = useMemo(() => ({ total: state.bots.length, active: state.bots.filter((bot) => bot.enabled).length }), [state.bots]);

  const logsText = useMemo(() => (
    activityLogs.length === 0
      ? '[no-logs-yet]'
      : activityLogs
        .map((entry) => `[${entry.ts}] [${getLogBadge(entry.level)}] [${entry.botId}] ${entry.event} ${JSON.stringify(entry.details)}`)
        .join('\n')
  ), [activityLogs]);

  const clearCliLogs = async () => {
    const botId = activeBotId ?? state.bots[0]?.id ?? 'all';
    try {
      await fetch(`/api/botmaker/logs?botId=${encodeURIComponent(botId)}`, { method: 'DELETE' });
      setActivityLogs([]);
    } catch {
      // ignore clear log failures
    }
  };

  const pushCliLog = async (payload: { botId?: string; level?: 'info' | 'warning' | 'error'; source?: 'internal' | 'external'; message: string; details?: Record<string, unknown> }) => {
    try {
      await fetch('/api/botmaker/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch {
      // swallow logging errors to keep UI lightweight
    }
  };


  const refresh = useCallback(async () => {
    setError('');
    setDetails('');
    try {
      const response = await fetch('/api/botmaker', { cache: 'no-store' });
      if (response.status === 401) {
        setAuthenticated(false);
        return;
      }
      const payload = (await response.json()) as ApiPayload | { error?: string; message?: string };
      if (!response.ok) {
        setDetails((payload as { message?: string }).message ?? '');
        throw new Error((payload as { error?: string }).error ?? 'Load gagal');
      }
      setState((payload as ApiPayload).data);
      setVersion((payload as ApiPayload).version);
      setDiagnostics((payload as ApiPayload).diagnostics ?? null);
      setAuthenticated(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Load gagal';
      setError(message);
      void pushCliLog({ level: 'error', source: 'internal', message: 'refresh-gagal', details: { message } });
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const container = contentScrollRef.current;
    if (!container) return;

    const updateHint = () => {
      const maxScroll = Math.max(0, container.scrollHeight - container.clientHeight);
      const top = container.scrollTop;
      setScrollHint({
        show: maxScroll > 48,
        up: top > 10,
        down: top < maxScroll - 10,
      });
    };

    updateHint();
    container.addEventListener('scroll', updateHint, { passive: true });
    window.addEventListener('resize', updateHint);

    return () => {
      container.removeEventListener('scroll', updateHint);
      window.removeEventListener('resize', updateHint);
    };
  }, [state.bots.length, authenticated]);

  useEffect(() => {
    if (!authenticated) return;

    const targetBotId = activeBotId ?? state.bots[0]?.id ?? 'all';

    const loadLogs = async () => {
      try {
        const response = await fetch(`/api/botmaker/logs?botId=${encodeURIComponent(targetBotId)}&limit=220`, { cache: 'no-store' });
        if (!response.ok) return;
        const payload = (await response.json()) as ActivityLogPayload;
        setActivityLogs(payload.logs ?? []);
      } catch {
        // ignore logs polling failures
      }
    };

    void loadLogs();
    const timer = setInterval(() => {
      void loadLogs();
    }, 3500);

    return () => clearInterval(timer);
  }, [authenticated, activeBotId, state.bots]);

  const persist = async (next: BotMakerState) => {
    setIsBusy(true);
    setError('');
    setDetails('');
    try {
      const response = await fetch('/api/botmaker', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: next, expectedVersion: version }),
      });
      const payload = (await response.json()) as ApiPayload | { error?: string; message?: string };
      if (!response.ok) {
        setDetails((payload as { message?: string }).message ?? '');
        throw new Error((payload as { error?: string }).error ?? 'Simpan gagal');
      }
      setState((payload as ApiPayload).data);
      setVersion((payload as ApiPayload).version);
      setDiagnostics((payload as ApiPayload).diagnostics ?? null);
      setNotice('Semua konfigurasi berhasil disimpan.');
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Simpan gagal';
      setError(message);
      void pushCliLog({ level: 'error', source: 'internal', message: 'persist-gagal', details: { message } });
      return false;
    } finally {
      setIsBusy(false);
    }
  };

  const runAction = async (action: 'deploy' | 'send-now' | 'stop', botId: string) => {
    setIsBusy(true);
    setError('');
    try {
      const response = await fetch('/api/botmaker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, botId }),
      });
      const payload = (await response.json()) as ApiPayload | { error?: string; message?: string };
      if (!response.ok) {
        setDetails((payload as { message?: string }).message ?? '');
        throw new Error((payload as { error?: string }).error ?? `${action} gagal`);
      }
      if ('data' in payload) {
        setState(payload.data);
        setVersion(payload.version);
        setDiagnostics(payload.diagnostics ?? null);
      }
      setNotice(action === 'deploy' ? 'Bot berhasil deploy + start.' : action === 'send-now' ? 'Pesan test berhasil dikirim.' : 'Bot dihentikan manual.');
    } catch (err) {
      const message = err instanceof Error ? err.message : `${action} gagal`;
      setError(message);
      void pushCliLog({ level: 'error', source: 'external', botId, message: `${action}-gagal`, details: { message } });
    } finally {
      setIsBusy(false);
    }
  };

  const saveThenRun = async (action: 'deploy' | 'send-now', botId: string) => {
    const ok = await persist(state);
    if (!ok) return;
    await runAction(action, botId);
  };

  const updateBot = (botId: string, patch: Partial<BotMakerBot>) => {
    setNotice('');
    setState((prev) => ({ bots: prev.bots.map((bot) => (bot.id === botId ? { ...bot, ...patch } : bot)), users: prev.users }));
  };

  const deleteBotAndSave = async (botId: string) => {
    if (!confirm('Hapus konfigurasi bot ini secara permanen?')) return;
    const next = { users: state.users, bots: state.bots.filter((entry) => entry.id !== botId) };
    setState(next);
    await persist(next);
  };

  const addBlock = (bot: BotMakerBot, type: WorkflowBlockType) => {
    updateBot(bot.id, { workflow: [...bot.workflow, createBlock(type)] });
  };

  const moveBlock = (bot: BotMakerBot, fromId: string, toId: string) => {
    const list = [...bot.workflow];
    const fromIndex = list.findIndex((block) => block.id === fromId);
    const toIndex = list.findIndex((block) => block.id === toId);
    if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return;
    const [picked] = list.splice(fromIndex, 1);
    list.splice(toIndex, 0, picked);
    updateBot(bot.id, { workflow: list });
  };

  const updateBlock = (bot: BotMakerBot, blockId: string, patch: Partial<WorkflowBlock>) => {
    updateBot(bot.id, {
      workflow: bot.workflow.map((block) => (block.id === blockId ? { ...block, ...patch } : block)),
    });
  };

  const removeBlock = (bot: BotMakerBot, blockId: string) => {
    updateBot(bot.id, { workflow: bot.workflow.filter((block) => block.id !== blockId) });
  };

  const applyPreset = (bot: BotMakerBot, preset: BotStylePreset) => {
    const source = PRESET_LIBRARY[preset];
    const workflow = source.blocks.map((block) => ({ ...createBlock(block.type), value: block.value }));
    updateBot(bot.id, {
      stylePreset: preset,
      workflow,
      messageTemplate: source.blocks.map((entry) => entry.value).join(' ').trim(),
      useEmbed: source.useEmbed,
      mentionEveryone: source.mentionEveryone,
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
      if (!response.ok) throw new Error(payload.error ?? 'Login gagal');
      setAuthenticated(true);
      setLoginPassword('');
      await refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login gagal';
      setError(message);
      void pushCliLog({ level: 'error', source: 'internal', message: 'login-gagal', details: { message } });
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
      <main className="flex min-h-screen items-center justify-center bg-slate-950 p-4 text-slate-100">
        <section className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl">
          <h1 className="text-lg font-semibold text-slate-100">BotMaker Login</h1>
          <p className="mt-1 text-xs text-slate-400">Akses khusus area /BotMaker.</p>
          <div className="mt-3 grid gap-2">
            <input value={loginUser} onChange={(e) => setLoginUser(e.target.value)} placeholder="Username" className="rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs" />
            <input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} placeholder="Password" className="rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs" />
            <button type="button" onClick={() => void doLogin()} disabled={isBusy} className="rounded border border-cyan-400/40 bg-cyan-500/20 px-3 py-1.5 text-xs font-semibold text-cyan-100 disabled:opacity-50">Login / Register</button>
          </div>

        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-y-auto bg-slate-950 px-2 py-3 pb-28 text-slate-100 sm:px-4">
      <div ref={contentScrollRef} className="botmaker-scroll mx-auto max-h-[calc(100dvh-92px)] max-w-6xl overflow-y-scroll rounded-2xl border border-slate-800 bg-slate-900/70 p-3 shadow-xl sm:p-4">
        <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-slate-100 sm:text-3xl">BotMaker</h1>
            <p className="text-[11px] text-slate-400 sm:text-xs">Panel modern, fokus ke konfigurasi dan deploy.</p>
          </div>
          <div className="flex items-center gap-2 text-right text-[11px] text-slate-300 sm:text-xs">
            <div>
              <p>Total bot: {stats.total}</p>
              <p>Active deployed: {stats.active}</p>
            </div>
            <button type="button" onClick={() => void doLogout()} className="rounded border border-slate-600 bg-slate-900 px-2 py-1 text-[11px]">Logout</button>
          </div>
        </div>

        <div className="mb-3 flex flex-wrap gap-2">
          <button type="button" onClick={() => setState((prev) => ({ users: prev.users, bots: [...prev.bots, { ...EMPTY_BOT, id: createBotId(), name: `Bot ${prev.bots.length + 1}` }] }))} className="rounded-lg border border-cyan-400/40 bg-cyan-500/20 px-3 py-1.5 text-xs font-semibold text-cyan-100">Tambah bot</button>
          <button type="button" onClick={() => void persist(state)} disabled={isBusy} className="rounded-lg border border-emerald-400/40 bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-100 disabled:opacity-50">Save semua konfigurasi</button>
          <button type="button" onClick={() => void refresh()} disabled={isBusy} className="rounded-lg border border-violet-400/40 bg-violet-500/20 px-3 py-1.5 text-xs font-semibold text-violet-100 disabled:opacity-50">Reload</button>
        </div>


        <div className="mb-2 rounded border border-slate-700 bg-slate-900/40 px-2 py-1 text-[10px] text-slate-400">Warning/error tersentralisasi di panel logs.</div>

        {diagnostics && (
          <div className="mb-3 rounded-lg border border-cyan-500/30 bg-slate-900/80 px-3 py-2 text-[11px] text-cyan-100">
            <p>DB Host: {diagnostics.dbHost ?? 'tidak terdeteksi'} • Shared store: {diagnostics.sharedStore}</p>
            <p>Token mode: strict database-only (.fAdHiL) tanpa fallback runtime.</p>
          </div>
        )}


        <div className="grid gap-3">
          {state.bots.map((bot) => (
            <article key={bot.id} className="rounded-xl border border-cyan-400/25 bg-slate-900/65 p-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                <strong className="text-cyan-100">{bot.name || bot.id}</strong>
                <span className="rounded bg-slate-800 px-2 py-0.5 text-slate-300">{bot.lastDeployStatus || 'Belum deploy'}</span>
              </div>

              <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-cyan-300">Konfigurasi inti</h3>
              <div className="grid gap-2 md:grid-cols-2">
                <input value={bot.name} onChange={(e) => updateBot(bot.id, { name: e.target.value })} placeholder="Nama bot" className="rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs" />
                <input value={bot.token} onChange={(e) => updateBot(bot.id, { token: e.target.value })} placeholder="Discord bot token" className="rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs" />
                <input value={bot.applicationId} onChange={(e) => updateBot(bot.id, { applicationId: e.target.value })} placeholder="Application ID" className="rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs" />
                <input value={bot.guildId} onChange={(e) => updateBot(bot.id, { guildId: e.target.value })} placeholder="Guild ID" className="rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs" />
                <input value={bot.channelId} onChange={(e) => updateBot(bot.id, { channelId: e.target.value })} placeholder="Channel ID" className="rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs" />
                <input type="number" min={60} max={86400} value={bot.intervalSeconds} onChange={(e) => updateBot(bot.id, { intervalSeconds: Number(e.target.value) })} placeholder="Interval seconds" className="rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs" />
              </div>
              <p className="mt-1 text-[10px] text-cyan-200/80">Status token tersimpan (.fAdHiL): {bot.hasToken ? `YA • update ${bot.tokenUpdatedAt ?? '-'}` : 'BELUM'}</p>

              <div className="mt-2 flex flex-wrap gap-2">
                <select value={bot.stylePreset} onChange={(e) => applyPreset(bot, e.target.value as BotStylePreset)} className="rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs">
                  {(Object.keys(PRESET_LIBRARY) as BotStylePreset[]).map((key) => (
                    <option key={key} value={key}>{PRESET_LIBRARY[key].label}</option>
                  ))}
                </select>
                <label className="flex items-center gap-2 rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs"><input type="checkbox" checked={bot.useEmbed} onChange={(e) => updateBot(bot.id, { useEmbed: e.target.checked })} /> Embed</label>
                <label className="flex items-center gap-2 rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs"><input type="checkbox" checked={bot.mentionEveryone} onChange={(e) => updateBot(bot.id, { mentionEveryone: e.target.checked })} /> @everyone</label>
              </div>

              <h3 className="mt-2 mb-1 text-[11px] font-semibold uppercase tracking-wide text-cyan-300">Workflow visual</h3>
              <div className="mt-1 grid gap-2 lg:grid-cols-[0.9fr_1.1fr]">
                <div className="rounded border border-slate-700 bg-slate-950/80 p-2">
                  <p className="mb-2 text-[11px] font-semibold text-cyan-100">Block Palette</p>
                  <div className="grid grid-cols-2 gap-1">
                    <button type="button" onClick={() => addBlock(bot, 'text')} className="rounded border border-cyan-400/40 bg-cyan-500/20 px-2 py-1 text-[11px]">+ Teks</button>
                    <button type="button" onClick={() => addBlock(bot, 'emoji')} className="rounded border border-cyan-400/40 bg-cyan-500/20 px-2 py-1 text-[11px]">+ Emoji</button>
                    <button type="button" onClick={() => addBlock(bot, 'mentionEveryone')} className="rounded border border-cyan-400/40 bg-cyan-500/20 px-2 py-1 text-[11px]">+ Tag semua</button>
                    <button type="button" onClick={() => addBlock(bot, 'timestamp')} className="rounded border border-cyan-400/40 bg-cyan-500/20 px-2 py-1 text-[11px]">+ Waktu</button>
                    <button type="button" onClick={() => addBlock(bot, 'lineBreak')} className="col-span-2 rounded border border-cyan-400/40 bg-cyan-500/20 px-2 py-1 text-[11px]">+ Baris baru</button>
                  </div>
                </div>

                <div className="rounded border border-cyan-500/30 bg-slate-950/70 p-2">
                  <p className="mb-2 text-[11px] font-semibold text-cyan-100">Workflow Canvas</p>
                  <div className="max-h-[160px] space-y-1 overflow-y-auto rounded border border-slate-700/80 bg-slate-950/60 p-1 pr-1">
                    {bot.workflow.map((block) => (
                      <div
                        key={block.id}
                        draggable
                        onDragStart={() => setDragBlockId(block.id)}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={() => {
                          if (dragBlockId) {
                            moveBlock(bot, dragBlockId, block.id);
                            setDragBlockId(null);
                          }
                        }}
                        className="rounded border border-slate-700 bg-slate-900 p-1.5"
                      >
                        <div className="mb-1 flex items-center justify-between gap-1">
                          <span className="text-[10px] text-slate-300">{blockLabel(block)}</span>
                          <div className="flex gap-1">
                            <button type="button" onClick={() => {
                              const idx = bot.workflow.findIndex((item) => item.id === block.id);
                              if (idx > 0) moveBlock(bot, block.id, bot.workflow[idx - 1].id);
                            }} className="rounded border border-slate-600 px-1 text-[10px]">↑</button>
                            <button type="button" onClick={() => {
                              const idx = bot.workflow.findIndex((item) => item.id === block.id);
                              if (idx >= 0 && idx < bot.workflow.length - 1) moveBlock(bot, block.id, bot.workflow[idx + 1].id);
                            }} className="rounded border border-slate-600 px-1 text-[10px]">↓</button>
                            <button type="button" onClick={() => removeBlock(bot, block.id)} className="rounded border border-red-500/40 px-1 text-[10px] text-red-200">✕</button>
                          </div>
                        </div>
                        {(block.type === 'text' || block.type === 'emoji') && (
                          <input value={block.value} onChange={(e) => updateBlock(bot, block.id, { value: e.target.value })} className="w-full rounded border border-slate-700 bg-slate-950 px-1.5 py-1 text-[11px]" />
                        )}
                      </div>
                    ))}
                    {bot.workflow.length === 0 && <p className="text-[11px] text-slate-400">Belum ada block.</p>}
                  </div>
                </div>
              </div>

              <div className="mt-2 rounded border border-slate-700 bg-slate-950/70 p-2 text-xs">
                <p className="mb-1 font-semibold text-cyan-100">Preview output</p>
                <pre className="whitespace-pre-wrap break-words text-[11px] text-slate-300">{workflowToPreview(bot.workflow) || bot.messageTemplate}</pre>
              </div>

              <h3 className="mt-2 mb-1 text-[11px] font-semibold uppercase tracking-wide text-cyan-300">Hybrid code lanjutan</h3>
              <div className="mt-1 grid gap-2 lg:grid-cols-[1fr_1fr]">
                <div className="rounded border border-slate-700 bg-slate-950/70 p-2">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-[11px] font-semibold text-cyan-100">Hybrid Code Editor (Indonesia)</p>
                    <button type="button" onClick={() => updateBot(bot.id, { customCode: buildHybridCode(bot) })} className="rounded border border-cyan-500/40 px-1.5 py-0.5 text-[10px]">Generate sintaks</button>
                  </div>
                  <textarea value={bot.customCode} onChange={(e) => updateBot(bot.id, { customCode: e.target.value })} placeholder="Tulis sintaks hybrid di sini..." className="min-h-[170px] w-full rounded border border-slate-700 bg-slate-950 p-2 font-mono text-[11px]" />
                  <button type="button" onClick={() => {
                    const parsed = parseHybridCode(bot.customCode);
                    if (parsed.length === 0) {
                      void pushCliLog({ level: 'warning', source: 'internal', botId: bot.id, message: 'syntax-parse-warning', details: { reason: 'format-invalid' } });
                      return;
                    }
                    updateBot(bot.id, { workflow: parsed });
                    void pushCliLog({ level: 'info', source: 'internal', botId: bot.id, message: 'syntax-applied' });
                  }} className="mt-2 rounded border border-emerald-400/40 bg-emerald-500/20 px-2 py-1 text-[11px] font-semibold text-emerald-100">Terapkan sintaks ke workflow</button>
                </div>
                <div className="rounded border border-slate-700 bg-slate-950/70 p-2">
                  <p className="mb-2 text-[11px] font-semibold text-cyan-100">Code Explorer</p>
                  <div className="max-h-[220px] overflow-y-auto rounded border border-slate-700 bg-slate-950 p-2 font-mono text-[11px]">
                    <p className="text-cyan-300">bot://{bot.id}/workflow.botmaker.hybrid</p>
                    <p className="text-violet-300">syntax: indonesia-hybrid-v1</p>
                    <p className="mt-1 text-slate-300">blocks: {bot.workflow.length}</p>
                    <p className="text-slate-300">interval: {bot.intervalSeconds}s</p>
                    <p className="mt-1 text-slate-300">ukuran custom: {bot.customCode.length} karakter</p>
                    <button type="button" onClick={() => setActiveBotId((prev) => (prev === bot.id ? null : bot.id))} className="mt-2 rounded border border-slate-600 px-2 py-0.5 text-[10px]">{activeBotId === bot.id ? 'Sembunyikan isi' : 'Lihat isi'}</button>
                    {activeBotId === bot.id && (
                      <pre className="mt-2 whitespace-pre-wrap break-words text-[10px] text-emerald-200">{bot.customCode || '# explorer: belum ada custom syntax'}</pre>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" onClick={() => void saveThenRun('deploy', bot.id)} disabled={isBusy} className="rounded border border-cyan-300/50 bg-cyan-500/20 px-2.5 py-1 text-xs font-semibold text-cyan-100 disabled:opacity-50">Save + Deploy + Start</button>
                <button type="button" onClick={() => void saveThenRun('send-now', bot.id)} disabled={isBusy} className="rounded border border-amber-300/50 bg-amber-500/20 px-2.5 py-1 text-xs font-semibold text-amber-100 disabled:opacity-50">Save + Send test</button>
                <button type="button" onClick={() => void runAction('stop', bot.id)} disabled={isBusy} className="rounded border border-slate-400/40 bg-slate-500/20 px-2.5 py-1 text-xs font-semibold text-slate-100 disabled:opacity-50">Stop manual</button>
                <button type="button" onClick={() => void deleteBotAndSave(bot.id)} disabled={isBusy} className="rounded border border-red-400/40 bg-red-500/20 px-2.5 py-1 text-xs font-semibold text-red-100 disabled:opacity-50">Delete konfigurasi bot ini</button>
              </div>
            </article>
          ))}
          {state.bots.length === 0 && <p className="rounded-lg border border-slate-700 bg-slate-900/60 p-3 text-xs text-slate-300">Belum ada bot. Tambah bot untuk mulai konfigurasi.</p>}
        </div>

        <section className="mt-3 rounded-xl border border-slate-800 bg-slate-900/70 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-200">CLI Logs</h2>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => void navigator.clipboard.writeText(logsText)} className="rounded border border-slate-700 px-2 py-0.5 text-[10px] text-slate-200">copy</button>
              <button type="button" onClick={() => void clearCliLogs()} className="rounded border border-red-500/40 px-2 py-0.5 text-[10px] text-red-200">clear</button>
              <span className="rounded border border-slate-700 px-2 py-0.5 text-[10px] text-slate-300">3.5s refresh</span>
            </div>
          </div>
          <p className="mb-1 text-[10px] text-slate-400">Retensi 24 jam.</p>
          <div className="max-h-[240px] overflow-y-auto rounded border border-slate-800 bg-[#020617] p-2 font-mono text-[10px]">
            {activityLogs.length === 0 ? (
              <p className="text-slate-500">[no-logs-yet]</p>
            ) : (
              activityLogs.map((entry, index) => (
                <p key={`${entry.ts}-${entry.botId}-${index}`} className={getLogTone(entry.level)}>
                  [{entry.ts}] [{getLogBadge(entry.level)}] [{entry.botId}] {entry.event} {JSON.stringify(entry.details)}
                </p>
              ))
            )}
          </div>
        </section>
        </section>
      </div>

      {scrollHint.show && (
        <div className="botmaker-scroll-indicator" aria-hidden="true">
          <span className={`botmaker-scroll-arrow ${scrollHint.up ? 'on' : ''}`}>▲</span>
          <span className={`botmaker-scroll-arrow ${scrollHint.down ? 'on' : ''}`}>▼</span>
        </div>
      )}


      <style jsx>{`
        .botmaker-scroll {
          scrollbar-gutter: stable both-edges;
          -webkit-overflow-scrolling: touch;
          overscroll-behavior: contain;
          scroll-behavior: smooth;
        }
        .botmaker-scroll-indicator {
          position: fixed;
          right: 8px;
          bottom: 84px;
          z-index: 15;
          display: grid;
          gap: 4px;
          padding: 6px 4px;
          border-radius: 999px;
          border: 1px solid rgba(34, 211, 238, 0.25);
          background: rgba(2, 6, 23, 0.86);
        }
        .botmaker-scroll-arrow {
          font-size: 10px;
          color: rgba(148, 163, 184, 0.75);
          transition: color 160ms ease;
        }
        .botmaker-scroll-arrow.on {
          color: rgba(34, 211, 238, 1);
        }
      `}</style>

      <div className="fixed bottom-0 left-0 right-0 z-10 border-t border-cyan-400/20 bg-slate-950/95 p-2 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2">
          <p className="text-[11px] text-slate-300">Tombol ini menyimpan seluruh konfigurasi semua bot.</p>
          <button type="button" onClick={() => void persist(state)} disabled={isBusy} className="rounded-lg border border-emerald-400/40 bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-100 disabled:opacity-50">Save semua konfigurasi</button>
        </div>
      </div>
    </main>
  );
}
