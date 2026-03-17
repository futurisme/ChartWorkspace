'use client';

import { useEffect, useMemo, useState } from 'react';
import type { BotMakerBot, BotStylePreset, BotMakerState, WorkflowBlock, WorkflowBlockType } from '@/features/botmaker/shared/schema';

interface ApiPayload {
  data: BotMakerState;
  version: number;
  updatedAt: string;
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
  if (block.type === 'text') return `Text: ${block.value || '(empty)'}`;
  if (block.type === 'emoji') return `Emoji: ${block.value || '✨'}`;
  if (block.type === 'mentionEveryone') return '@everyone';
  if (block.type === 'lineBreak') return 'Line break';
  return 'Relative timestamp';
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

export default function BotMakerPage() {
  const [state, setState] = useState<BotMakerState>({ bots: [], users: [] });
  const [version, setVersion] = useState<number>(0);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [loginUser, setLoginUser] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [dragBlockId, setDragBlockId] = useState<string | null>(null);

  const stats = useMemo(() => ({ total: state.bots.length, active: state.bots.filter((bot) => bot.enabled).length }), [state.bots]);

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
          <p className="mt-1 text-xs text-cyan-200/80">Hanya berlaku di /BotMaker dan tidak memengaruhi area lain.</p>
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
    <main className="min-h-screen bg-[#030712] px-2 py-3 text-slate-100 sm:px-4">
      <section className="mx-auto max-w-6xl rounded-2xl border border-cyan-400/25 bg-slate-950/80 p-3 shadow-[0_20px_60px_rgba(6,182,212,0.12)] sm:p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-lg font-black tracking-tight text-cyan-100 sm:text-3xl">BotMaker No-Code Editor</h1>
            <p className="text-[11px] text-cyan-200/80 sm:text-xs">Drag & drop block editor (Scratch/Blockly style) optimized for narrow mobile screens.</p>
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
          <button type="button" onClick={() => setState((prev) => ({ users: [], bots: [...prev.bots, { ...EMPTY_BOT, id: createBotId(), name: `Bot ${prev.bots.length + 1}` }] }))} className="rounded-lg border border-cyan-400/40 bg-cyan-500/20 px-3 py-1.5 text-xs font-semibold text-cyan-100">Add bot</button>
          <button type="button" onClick={() => void persist(state)} disabled={isBusy} className="rounded-lg border border-emerald-400/40 bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-100 disabled:opacity-50">Save all</button>
          <button type="button" onClick={() => void refresh()} disabled={isBusy} className="rounded-lg border border-violet-400/40 bg-violet-500/20 px-3 py-1.5 text-xs font-semibold text-violet-100 disabled:opacity-50">Reload</button>
        </div>

        {error && <div className="mb-3 rounded-lg border border-red-500/30 bg-red-900/25 px-3 py-2 text-xs text-red-200">{error}</div>}

        <div className="grid gap-3">
          {state.bots.map((bot) => (
            <article key={bot.id} className="rounded-xl border border-cyan-400/25 bg-slate-900/65 p-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                <strong className="text-cyan-100">{bot.name || bot.id}</strong>
                <span className="text-slate-300">{bot.lastDeployStatus || 'Not deployed'}</span>
              </div>

              <div className="grid gap-2 md:grid-cols-2">
                <input value={bot.name} onChange={(e) => updateBot(bot.id, { name: e.target.value })} placeholder="Bot name" className="rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs" />
                <input value={bot.token} onChange={(e) => updateBot(bot.id, { token: e.target.value })} placeholder={bot.hasToken ? `Token tersimpan (${bot.tokenUpdatedAt ?? '-'}) • isi jika ganti` : 'Discord bot token (sekali input)'} className="rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs" />
                <input value={bot.applicationId} onChange={(e) => updateBot(bot.id, { applicationId: e.target.value })} placeholder="Application ID" className="rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs" />
                <input value={bot.guildId} onChange={(e) => updateBot(bot.id, { guildId: e.target.value })} placeholder="Guild ID" className="rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs" />
                <input value={bot.channelId} onChange={(e) => updateBot(bot.id, { channelId: e.target.value })} placeholder="Channel ID" className="rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs" />
                <input type="number" min={60} max={86400} value={bot.intervalSeconds} onChange={(e) => updateBot(bot.id, { intervalSeconds: Number(e.target.value) })} placeholder="Interval seconds" className="rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs" />
              </div>

              <div className="mt-2 flex flex-wrap gap-2">
                <select value={bot.stylePreset} onChange={(e) => applyPreset(bot, e.target.value as BotStylePreset)} className="rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs">
                  {(Object.keys(PRESET_LIBRARY) as BotStylePreset[]).map((key) => (
                    <option key={key} value={key}>{PRESET_LIBRARY[key].label}</option>
                  ))}
                </select>
                <label className="flex items-center gap-2 rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs"><input type="checkbox" checked={bot.useEmbed} onChange={(e) => updateBot(bot.id, { useEmbed: e.target.checked })} /> Embed</label>
                <label className="flex items-center gap-2 rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs"><input type="checkbox" checked={bot.mentionEveryone} onChange={(e) => updateBot(bot.id, { mentionEveryone: e.target.checked })} /> @everyone</label>
              </div>

              <div className="mt-2 grid gap-2 lg:grid-cols-[0.9fr_1.1fr]">
                <div className="rounded border border-slate-700 bg-slate-950/80 p-2">
                  <p className="mb-2 text-[11px] font-semibold text-cyan-100">Block Palette (tap to add)</p>
                  <div className="grid grid-cols-2 gap-1">
                    <button type="button" onClick={() => addBlock(bot, 'text')} className="rounded border border-cyan-400/40 bg-cyan-500/20 px-2 py-1 text-[11px]">+ Text</button>
                    <button type="button" onClick={() => addBlock(bot, 'emoji')} className="rounded border border-cyan-400/40 bg-cyan-500/20 px-2 py-1 text-[11px]">+ Emoji</button>
                    <button type="button" onClick={() => addBlock(bot, 'mentionEveryone')} className="rounded border border-cyan-400/40 bg-cyan-500/20 px-2 py-1 text-[11px]">+ Mention</button>
                    <button type="button" onClick={() => addBlock(bot, 'timestamp')} className="rounded border border-cyan-400/40 bg-cyan-500/20 px-2 py-1 text-[11px]">+ Timestamp</button>
                    <button type="button" onClick={() => addBlock(bot, 'lineBreak')} className="col-span-2 rounded border border-cyan-400/40 bg-cyan-500/20 px-2 py-1 text-[11px]">+ Line break</button>
                  </div>
                </div>

                <div className="rounded border border-cyan-500/30 bg-slate-950/70 p-2">
                  <p className="mb-2 text-[11px] font-semibold text-cyan-100">Drag & Drop Workflow Canvas</p>
                  <div className="max-h-[280px] space-y-1 overflow-y-auto pr-1">
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
                              if (idx > 0) {
                                moveBlock(bot, block.id, bot.workflow[idx - 1].id);
                              }
                            }} className="rounded border border-slate-600 px-1 text-[10px]">↑</button>
                            <button type="button" onClick={() => {
                              const idx = bot.workflow.findIndex((item) => item.id === block.id);
                              if (idx >= 0 && idx < bot.workflow.length - 1) {
                                moveBlock(bot, block.id, bot.workflow[idx + 1].id);
                              }
                            }} className="rounded border border-slate-600 px-1 text-[10px]">↓</button>
                            <button type="button" onClick={() => removeBlock(bot, block.id)} className="rounded border border-red-500/40 px-1 text-[10px] text-red-200">✕</button>
                          </div>
                        </div>
                        {(block.type === 'text' || block.type === 'emoji') && (
                          <input value={block.value} onChange={(e) => updateBlock(bot, block.id, { value: e.target.value })} className="w-full rounded border border-slate-700 bg-slate-950 px-1.5 py-1 text-[11px]" />
                        )}
                      </div>
                    ))}
                    {bot.workflow.length === 0 && <p className="text-[11px] text-slate-400">Drop blocks here.</p>}
                  </div>
                </div>
              </div>

              <div className="mt-2 rounded border border-slate-700 bg-slate-950/70 p-2 text-xs">
                <p className="mb-1 font-semibold text-cyan-100">Preview (no-code output)</p>
                <pre className="whitespace-pre-wrap break-words text-[11px] text-slate-300">{workflowToPreview(bot.workflow) || bot.messageTemplate}</pre>
              </div>

              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" onClick={() => void runAction('deploy', bot.id)} disabled={isBusy} className="rounded border border-cyan-300/50 bg-cyan-500/20 px-2.5 py-1 text-xs font-semibold text-cyan-100 disabled:opacity-50">Deploy + Host</button>
                <button type="button" onClick={() => void runAction('send-now', bot.id)} disabled={isBusy} className="rounded border border-amber-300/50 bg-amber-500/20 px-2.5 py-1 text-xs font-semibold text-amber-100 disabled:opacity-50">Send test now</button>
                <button type="button" onClick={() => setState((prev) => ({ users: [], bots: prev.bots.filter((entry) => entry.id !== bot.id) }))} className="rounded border border-red-400/40 bg-red-500/20 px-2.5 py-1 text-xs font-semibold text-red-100">Delete</button>
              </div>
            </article>
          ))}
          {state.bots.length === 0 && <p className="rounded-lg border border-slate-700 bg-slate-900/60 p-3 text-xs text-slate-300">No bot yet. Add bot and start drag-drop editing.</p>}
        </div>
      </section>
    </main>
  );
}
