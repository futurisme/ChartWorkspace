import { useEffect, useState } from 'react';
import { WORKSPACE_SEARCH_DEBOUNCE_MS, WORKSPACE_SEARCH_LIMIT } from './constants';
import type { MapSearchItem } from './types';

type WorkspaceSearchState = {
  searchResults: MapSearchItem[];
  isSearching: boolean;
  searchError: string;
  searchReady: boolean;
};

export function useWorkspaceSearch(searchQuery: string) {
  const [state, setState] = useState<WorkspaceSearchState>({
    searchResults: [],
    isSearching: false,
    searchError: '',
    searchReady: false,
  });

  const trimmedQuery = searchQuery.trim();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let idleTimer = 0;
    if (typeof window.requestIdleCallback === 'function') {
      const idleId = window.requestIdleCallback(() => {
        setState((current) => ({ ...current, searchReady: true }));
      }, { timeout: 500 });
      return () => window.cancelIdleCallback(idleId);
    }

    idleTimer = window.setTimeout(() => {
      setState((current) => ({ ...current, searchReady: true }));
    }, 350);

    return () => window.clearTimeout(idleTimer);
  }, []);

  useEffect(() => {
    if (!state.searchReady) {
      return;
    }

    const abortController = new AbortController();
    const timeout = window.setTimeout(async () => {
      setState((current) => ({ ...current, isSearching: true, searchError: '' }));

      try {
        const params = new URLSearchParams();
        if (trimmedQuery) {
          params.set('q', trimmedQuery);
        }
        params.set('limit', String(WORKSPACE_SEARCH_LIMIT));

        const response = await fetch(`/api/maps?${params.toString()}`, {
          signal: abortController.signal,
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(payload?.error || 'Failed to load maps');
        }

        const payload = (await response.json()) as { maps?: MapSearchItem[] };
        const incoming = payload.maps ?? [];

        setState((current) => ({
          ...current,
          searchResults: incoming.slice(0, WORKSPACE_SEARCH_LIMIT),
        }));
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;

        setState((current) => ({
          ...current,
          searchError: err instanceof Error ? err.message : 'Failed to load maps',
        }));
      } finally {
        setState((current) => ({ ...current, isSearching: false }));
      }
    }, WORKSPACE_SEARCH_DEBOUNCE_MS);

    return () => {
      abortController.abort();
      window.clearTimeout(timeout);
    };
  }, [state.searchReady, trimmedQuery]);

  return state;
}
