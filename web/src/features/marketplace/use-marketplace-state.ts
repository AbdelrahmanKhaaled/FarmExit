'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { parseState, RESULTS_QUERY_KEY, toSearchParams, type MarketplaceState } from './url-state';

/**
 * Marketplace state with the URL as the source of truth. Updates use `history.replaceState`, which the App Router
 * syncs into `useSearchParams` without a server round trip (cheap while dragging a slider), keeps filtered URLs
 * shareable and restores them on back/forward. Header search and results each use this hook and stay in sync.
 * The latest query is also remembered for the session, so Farm Details "Back to results" returns to it.
 */
export function useMarketplaceState() {
  const searchParams = useSearchParams();
  const key = searchParams.toString();
  const [state, setLocal] = useState<MarketplaceState>(() => parseState(searchParams));
  const [seenKey, setSeenKey] = useState(key);

  // Back/forward or another component changed the URL: follow it (state derived during render).
  if (key !== seenKey) {
    setSeenKey(key);
    setLocal(parseState(new URLSearchParams(key)));
  }

  useEffect(() => {
    try {
      window.sessionStorage.setItem(RESULTS_QUERY_KEY, key);
    } catch {
      // Storage unavailable (private mode, blocked): Back to results falls back to the default results.
    }
  }, [key]);

  const setState = useCallback((next: MarketplaceState) => {
    setLocal(next);
    const query = new URLSearchParams(toSearchParams(next)).toString();
    window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}`);
  }, []);

  return [state, setState] as const;
}
