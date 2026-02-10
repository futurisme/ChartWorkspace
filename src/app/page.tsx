'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [mapTitle, setMapTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  const [lastMapId, setLastMapId] = useState<string | null>(null);
  const [lastMapTitle, setLastMapTitle] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setLastMapId(localStorage.getItem('lastMapId'));
    setLastMapTitle(localStorage.getItem('lastMapTitle'));
  }, []);

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

      const { id } = await response.json();
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
      <div className="w-full max-w-md">
        <div className="rounded-lg bg-white p-8 shadow-lg">
          <h1 className="mb-2 text-center text-4xl font-bold text-gray-900">
            ChartMaker
          </h1>
          <p className="mb-8 text-center text-gray-600">
            Collaborative Concept Map Editor
          </p>

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

            {error && (
              <div className="rounded bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

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
          </form>

          <div className="mt-8 border-t pt-6">
            <p className="text-center text-sm text-gray-600">
              Features:
            </p>
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
