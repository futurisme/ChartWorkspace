'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type MapSearchItem = {
  id: string;
  title: string;
  updatedAt: string;
};

const SEARCH_DEBOUNCE_MS = 220;

export default function WorkspaceHome() {
  const router = useRouter();
  const [mapTitle, setMapTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  const [lastMapId, setLastMapId] = useState<string | null>(null);
  const [lastMapTitle, setLastMapTitle] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MapSearchItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [searchReady, setSearchReady] = useState(false);

  const trimmedQuery = searchQuery.trim();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    setLastMapId(localStorage.getItem('lastMapId'));
    setLastMapTitle(localStorage.getItem('lastMapTitle'));

    let idleTimer = 0;
    if (typeof window.requestIdleCallback === 'function') {
      const idleId = window.requestIdleCallback(() => setSearchReady(true), { timeout: 500 });
      return () => window.cancelIdleCallback(idleId);
    }

    idleTimer = window.setTimeout(() => setSearchReady(true), 350);
    return () => window.clearTimeout(idleTimer);
  }, []);

  useEffect(() => {
    if (!searchReady) {
      return;
    }

    const abortController = new AbortController();
    const timeout = window.setTimeout(async () => {
      try {
        setIsSearching(true);
        setSearchError('');

        const params = new URLSearchParams();
        if (trimmedQuery) {
          params.set('q', trimmedQuery);
        }
        params.set('limit', '24');

        const response = await fetch(`/api/maps?${params.toString()}`, {
          signal: abortController.signal,
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(payload?.error || 'Failed to load maps');
        }

        const payload = (await response.json()) as { maps?: MapSearchItem[] };
        const incoming = payload.maps ?? [];
        setSearchResults(incoming.slice(0, 24));
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        setSearchError(err instanceof Error ? err.message : 'Failed to load maps');
      } finally {
        setIsSearching(false);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      abortController.abort();
      window.clearTimeout(timeout);
    };
  }, [searchReady, trimmedQuery]);

  const quickStats = useMemo(() => {
    const hasRecent = Boolean(lastMapId);
    return {
      hasRecent,
      resultsCount: searchResults.length,
    };
  }, [lastMapId, searchResults.length]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mapTitle.trim()) {
      setError('Please enter a map title');
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch('/api/maps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: mapTitle.trim() }),
      });

      if (!response.ok) throw new Error('Failed to create map');

      const { id } = (await response.json()) as { id: string };
      router.push(`/editor/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create map');
      setIsCreating(false);
    }
  };

  const handleLoadLast = () => {
    if (!lastMapId) return;
    router.push(`/editor/${lastMapId}`);
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#030712] text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_10%,rgba(6,182,212,0.24),transparent_36%),radial-gradient(circle_at_88%_14%,rgba(99,102,241,0.22),transparent_34%),radial-gradient(circle_at_50%_100%,rgba(168,85,247,0.18),transparent_42%)]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl items-start px-2 py-4 sm:items-center sm:px-6 sm:py-6 lg:px-10">
        <div className="grid w-full gap-3 lg:grid-cols-[1.12fr_0.88fr] lg:gap-4">
          <section className="rounded-2xl border border-cyan-300/20 bg-slate-950/75 p-3 shadow-[0_18px_55px_rgba(6,182,212,0.12)] backdrop-blur-xl sm:p-6">
            <div className="mb-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-300/90">ChartWorkspace</p>
              <h1 className="mt-2 text-xl font-black tracking-tight text-cyan-100 sm:text-4xl">Launch Control</h1>
              <p className="mt-2 max-w-xl text-xs text-slate-300 sm:text-base">Created by Fadhil.</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold text-cyan-200">Fast Launch</span>
                <span className="rounded-full border border-violet-400/30 bg-violet-500/10 px-2 py-0.5 text-[10px] font-semibold text-violet-200">Realtime Ready</span>
                <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-200">Mobile Friendly</span>
              </div>
            </div>

            <form onSubmit={handleCreate} className="space-y-2.5 sm:space-y-3">
              <label htmlFor="title" className="block text-xs font-semibold uppercase tracking-[0.12em] text-cyan-200/90">
                New Map Name
              </label>
              <input
                id="title"
                type="text"
                value={mapTitle}
                onChange={(e) => {
                  setMapTitle(e.target.value);
                  setError('');
                }}
                placeholder="e.g. National Strategy 2040"
                className="w-full rounded-xl border border-cyan-500/30 bg-slate-900/85 px-3 py-2.5 text-sm text-slate-100 placeholder-slate-400 outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-500/20"
              />

              {error && <div className="rounded-lg border border-red-500/30 bg-red-900/25 px-3 py-2 text-xs text-red-200">{error}</div>}

              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="submit"
                  disabled={isCreating}
                  className="rounded-xl border border-cyan-200 bg-gradient-to-r from-cyan-400 to-sky-400 px-4 py-2 text-sm font-bold text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isCreating ? 'Creating…' : 'Open New Editor'}
                </button>
                <button
                  type="button"
                  onClick={handleLoadLast}
                  disabled={!lastMapId}
                  className="rounded-xl border border-slate-600 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-cyan-400 hover:bg-slate-800/90 hover:text-cyan-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Resume Last Workspace
                </button>
                <button
                  type="button"
                  onClick={() => router.push('/archive-lab')}
                  className="rounded-xl border border-violet-400/40 bg-violet-500/20 px-4 py-2 text-sm font-semibold text-violet-100 transition hover:bg-violet-500/35"
                >
                  Open Archive (Beta)
                </button>
                <button
                  type="button"
                  onClick={() => router.push('/game-ideas')}
                  className="rounded-xl border border-cyan-400/40 bg-cyan-500/20 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/35"
                >
                  Open FeatureLib
                </button>
              </div>

              {lastMapId && (
                <p className="text-xs text-slate-400">
                  Last opened: <span className="text-slate-200">{lastMapTitle || 'Untitled Map'}</span> (#{lastMapId})
                </p>
              )}
            </form>
          </section>

          <section className="rounded-2xl border border-cyan-300/20 bg-slate-950/75 p-3 shadow-[0_18px_45px_rgba(6,182,212,0.1)] backdrop-blur-xl sm:p-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-200 sm:text-sm">Search Workspace</h2>
              <span className="text-[10px] text-slate-400 sm:text-[11px]">Top {quickStats.resultsCount} shown</span>
            </div>

            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title…"
              className="w-full rounded-xl border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none transition focus:border-cyan-400"
            />

            {!searchReady && <p className="mt-3 text-xs text-slate-500">Preparing lightweight search index…</p>}
            {searchReady && isSearching && <p className="mt-3 text-xs text-slate-400">Loading results…</p>}
            {searchError && <p className="mt-3 rounded-lg border border-red-500/30 bg-red-900/25 p-2 text-xs text-red-200">{searchError}</p>}

            {searchReady && !isSearching && !searchError && (
              <ul className="mt-3 max-h-[44vh] space-y-2 overflow-auto pr-1 sm:max-h-[48vh]">
                {searchResults.map((map) => (
                  <li key={map.id}>
                    <button
                      type="button"
                      onClick={() => router.push(`/editor/${map.id}`)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-left transition hover:border-cyan-400/60 hover:bg-slate-800"
                    >
                      <p className="truncate text-sm font-semibold text-slate-100">{map.title}</p>
                      <p className="text-[11px] text-slate-400">#{map.id} • {new Date(map.updatedAt).toLocaleString()}</p>
                    </button>
                  </li>
                ))}
                {searchResults.length === 0 && (
                  <li className="rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-3 text-xs text-slate-500">
                    No workspace found.
                  </li>
                )}
              </ul>
            )}

            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-lg border border-cyan-500/20 bg-slate-900/70 px-2 py-2 text-center">
                <p className="text-[10px] uppercase text-slate-500">Recent</p>
                <p className="text-sm font-bold text-cyan-200">{quickStats.hasRecent ? 'YES' : 'NO'}</p>
              </div>
              <div className="rounded-lg border border-cyan-500/20 bg-slate-900/70 px-2 py-2 text-center">
                <p className="text-[10px] uppercase text-slate-500">Mode</p>
                <p className="text-sm font-bold text-cyan-200">SYNC</p>
              </div>
              <div className="rounded-lg border border-cyan-500/20 bg-slate-900/70 px-2 py-2 text-center">
                <p className="text-[10px] uppercase text-slate-500">UX</p>
                <p className="text-sm font-bold text-cyan-200">LIGHT</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
