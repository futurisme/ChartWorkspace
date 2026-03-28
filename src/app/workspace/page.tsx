'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ActionGroup, HeaderShell, Inline, Panel, StatusChip } from '@/lib/fadhilweblib';
import { Button } from '@/lib/fadhilweblib/client';
import { useWorkspaceSearch } from '@/features/workspace-home/use-workspace-search';

export default function WorkspaceHome() {
  const router = useRouter();
  const [mapTitle, setMapTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  const [lastMapId, setLastMapId] = useState<string | null>(null);
  const [lastMapTitle, setLastMapTitle] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const { searchResults, isSearching, searchError, searchReady } = useWorkspaceSearch(searchQuery);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    setLastMapId(localStorage.getItem('lastMapId'));
    setLastMapTitle(localStorage.getItem('lastMapTitle'));
  }, []);

  const quickStats = useMemo(() => {
    const hasRecent = Boolean(lastMapId);
    return {
      hasRecent,
      resultsCount: searchResults.length,
    };
  }, [lastMapId, searchResults.length]);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
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

      if (!response.ok) {
        throw new Error('Failed to create map');
      }

      const { id } = (await response.json()) as { id: string };
      router.push(`/editor/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create map');
      setIsCreating(false);
    }
  };

  const handleLoadLast = () => {
    if (!lastMapId) {
      return;
    }

    router.push(`/editor/${lastMapId}`);
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#030712] text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_10%,rgba(6,182,212,0.24),transparent_36%),radial-gradient(circle_at_88%_14%,rgba(99,102,241,0.22),transparent_34%),radial-gradient(circle_at_50%_100%,rgba(168,85,247,0.18),transparent_42%)]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl items-start px-2 py-4 sm:items-center sm:px-6 sm:py-6 lg:px-10">
        <div className="grid w-full gap-3 lg:grid-cols-[1.12fr_0.88fr] lg:gap-4">
          <Panel as="section" tone="brand" density="spacious" className="h-full">
            <HeaderShell
              eyebrow="ChartWorkspace"
              title="Launch Control"
              subtitle="Created by Fadhil."
              actions={<StatusChip tone={isCreating ? 'warning' : 'brand'} label="state" value={isCreating ? 'creating' : 'ready'} />}
            />

            <ActionGroup gap="sm" wrap className="mt-4">
              <StatusChip tone="brand" label="launch" value="fast" />
              <StatusChip tone="info" label="collab" value="realtime" />
              <StatusChip tone="success" label="mobile" value="ready" />
            </ActionGroup>

            <form onSubmit={handleCreate} className="mt-5 space-y-2.5 sm:space-y-3">
              <label htmlFor="title" className="block text-xs font-semibold uppercase tracking-[0.12em] text-cyan-200/90">
                New Map Name
              </label>
              <input
                id="title"
                type="text"
                value={mapTitle}
                onChange={(event) => {
                  setMapTitle(event.target.value);
                  setError('');
                }}
                placeholder="e.g. National Strategy 2040"
                className="w-full rounded-xl border border-cyan-500/30 bg-slate-900/85 px-3 py-2.5 text-sm text-slate-100 placeholder-slate-400 outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-500/20"
              />

              {error && <div className="rounded-lg border border-red-500/30 bg-red-900/25 px-3 py-2 text-xs text-red-200">{error}</div>}

              <div className="grid gap-2 sm:grid-cols-2">
                <Button
                  type="submit"
                  tone="brand"
                  fullWidth
                  loading={isCreating}
                  trailingVisual={isCreating ? undefined : '->'}
                >
                  {isCreating ? 'Creating...' : 'Open New Editor'}
                </Button>
                <Button
                  type="button"
                  tone="neutral"
                  fullWidth
                  disabled={!lastMapId}
                  onClick={handleLoadLast}
                >
                  Resume Last Workspace
                </Button>
                <Button
                  type="button"
                  tone="info"
                  fullWidth
                  onClick={() => router.push('/archive-lab')}
                >
                  Open FadhilLabEncrypt (BETA)
                </Button>
                <Button
                  type="button"
                  tone="success"
                  fullWidth
                  onClick={() => router.push('/game-ideas')}
                >
                  Open FeatureLib
                </Button>
              </div>

              {lastMapId && (
                <Inline gap="xs" wrap className="text-xs text-slate-400">
                  <span>Last opened:</span>
                  <span className="text-slate-200">{lastMapTitle || 'Untitled Map'}</span>
                  <span>(#{lastMapId})</span>
                </Inline>
              )}
            </form>
          </Panel>

          <Panel as="section" density="comfortable" className="h-full">
            <HeaderShell
              compact
              eyebrow="Search"
              title="Workspace Search"
              subtitle={searchReady ? 'Fast local workspace lookup.' : 'Preparing lightweight search index...'}
              meta={<StatusChip tone="info" label="top" value={String(quickStats.resultsCount)} />}
            />

            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by title..."
              className="mt-4 w-full rounded-xl border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none transition focus:border-cyan-400"
            />

            {searchReady && isSearching && <p className="mt-3 text-xs text-slate-400">Loading results...</p>}
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

            <ActionGroup gap="sm" wrap className="mt-4">
              <StatusChip tone={quickStats.hasRecent ? 'success' : 'warning'} label="recent" value={quickStats.hasRecent ? 'yes' : 'no'} />
              <StatusChip tone="brand" label="mode" value="sync" />
              <StatusChip tone="info" label="ux" value="light" />
            </ActionGroup>
          </Panel>
        </div>
      </div>
    </main>
  );
}
