'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type MapSearchItem = {
  id: string;
  title: string;
  updatedAt: string;
};

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

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setLastMapId(localStorage.getItem('lastMapId'));
    setLastMapTitle(localStorage.getItem('lastMapTitle'));
  }, []);

  useEffect(() => {
    const abortController = new AbortController();
    const timeout = window.setTimeout(async () => {
      try {
        setIsSearching(true);
        setSearchError('');
        const params = new URLSearchParams();
        if (searchQuery.trim()) {
          params.set('q', searchQuery.trim());
        }

        const response = await fetch(`/api/maps${params.toString() ? `?${params.toString()}` : ''}`, {
          signal: abortController.signal,
          cache: 'no-store',
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(payload?.error || 'Failed to load maps');
        }

        const payload = (await response.json()) as { maps?: MapSearchItem[] };
        setSearchResults(payload.maps ?? []);
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        setSearchError(err instanceof Error ? err.message : 'Failed to load maps');
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => {
      abortController.abort();
      window.clearTimeout(timeout);
    };
  }, [searchQuery]);

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
        body: JSON.stringify({ title: mapTitle }),
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
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-2xl">
        <div className="rounded-lg bg-white p-8 shadow-lg">
          <h1 className="mb-2 text-center text-4xl font-bold text-gray-900">ChartMaker</h1>
          <p className="mb-8 text-center text-gray-600">Collaborative Concept Map Editor</p>

          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                Map Title
              </label>
              <input
                id="title"
                type="text"
                value={mapTitle}
                onChange={(e) => {
                  setMapTitle(e.target.value);
                  setError('');
                }}
                placeholder="Enter a name for your map"
                className="mt-1 w-full rounded border border-gray-300 px-4 py-2 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>

            {error && <div className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</div>}

            <button
              type="submit"
              disabled={isCreating}
              className="w-full rounded bg-blue-600 py-2 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              {isCreating ? 'Creating...' : 'Create New Map'}
            </button>

            <button
              type="button"
              onClick={handleLoadLast}
              disabled={!lastMapId}
              className="w-full rounded border border-gray-200 py-2 font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Load My Chart Workspace
            </button>

            {lastMapId && (
              <p className="text-center text-xs text-gray-500">
                Last opened: {lastMapTitle || 'Untitled Map'} (#{lastMapId})
              </p>
            )}

            <button
              type="button"
              onClick={() => router.push('/archive-lab')}
              className="w-full rounded border border-indigo-200 py-2 font-semibold text-indigo-700 transition hover:bg-indigo-50"
            >
              Open Archive Lab (.cws decrypt / encrypt)
            </button>
          </form>

          <div className="mt-8 border-t pt-6">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-gray-700">Search Mindmap</p>
              <span className="text-xs text-gray-500">Latest updated first</span>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title..."
              className="w-full rounded border border-gray-300 px-4 py-2 text-gray-900 placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />

            {isSearching && <p className="mt-3 text-sm text-gray-500">Loading mindmaps...</p>}
            {searchError && <p className="mt-3 rounded bg-red-50 p-2 text-sm text-red-700">{searchError}</p>}

            {!isSearching && !searchError && (
              <ul className="mt-4 max-h-64 space-y-2 overflow-auto">
                {searchResults.map((map) => (
                  <li key={map.id}>
                    <button
                      type="button"
                      onClick={() => router.push(`/editor/${map.id}`)}
                      className="w-full rounded border border-gray-200 bg-gray-50 px-3 py-2 text-left transition hover:border-indigo-300 hover:bg-indigo-50"
                    >
                      <p className="truncate text-sm font-semibold text-gray-900">{map.title}</p>
                      <p className="text-xs text-gray-500">#{map.id} • Updated {new Date(map.updatedAt).toLocaleString()}</p>
                    </button>
                  </li>
                ))}
                {searchResults.length === 0 && <li className="text-sm text-gray-500">No mindmap found.</li>}
              </ul>
            )}
          </div>

          <div className="mt-8 border-t pt-6">
            <p className="text-center text-sm text-gray-600">Features:</p>
            <ul className="mt-3 space-y-2 text-sm text-gray-700">
              <li>Real-time collaboration</li>
              <li>Live presence awareness</li>
              <li>Conflict-free editing (CRDT)</li>
              <li>Auto-save to database</li>
              <li>Editor and viewer modes</li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}
