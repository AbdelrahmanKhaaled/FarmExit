'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { MarketplaceListing } from '@/lib/data/marketplace';
import {
  fetchPublicMarketplace,
  hasUnsupportedPublicFilters,
  mapMarketplaceListResponse,
  marketplaceStateToApiQuery,
} from '@/lib/data/marketplace-api';
import type { MarketplaceState } from './url-state';

const PAGE_SIZE = 9;

export function useMarketplaceListings(state: MarketplaceState) {
  const [items, setItems] = useState<MarketplaceListing[]>([]);
  const [total, setTotal] = useState(0);
  const [loadedKey, setLoadedKey] = useState('');
  const [unavailable, setUnavailable] = useState(false);
  const unsupported = hasUnsupportedPublicFilters(state);
  const [mobile, setMobile] = useState(false);
  const previous = useRef({ key: '', page: 0 });
  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)');
    const update = () => setMobile(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  const queryKey = useMemo(() => JSON.stringify([marketplaceStateToApiQuery(state, PAGE_SIZE), mobile]), [state, mobile]);

  useEffect(() => {
    let cancelled = false;
    const query = marketplaceStateToApiQuery(state, PAGE_SIZE);
    fetchPublicMarketplace(query)
      .then((data) => {
        if (cancelled) return;
        if (!data) {
          setUnavailable(true);
          setItems([]);
          setTotal(0);
          return;
        }
        setUnavailable(false);
        const mapped = mapMarketplaceListResponse(data);
        const key = JSON.stringify({ filters: state.filters, sort: state.sort });
        const append = mobile && previous.current.key === key && previous.current.page === state.page - 1;
        setItems((current) =>
          append
            ? [...current, ...mapped.items.filter((item) => !current.some((row) => row.slug === item.slug))]
            : mapped.items,
        );
        previous.current = { key, page: state.page };
        setTotal(mapped.total);
      })
      .catch(() => {
        if (!cancelled) {
          setUnavailable(true);
          setItems([]);
          setTotal(0);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadedKey(queryKey);
      });
    return () => {
      cancelled = true;
    };
  }, [queryKey, state, mobile]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return { items, total, loading: loadedKey !== queryKey, unavailable, unsupported, pageCount, mobile, pageSize: PAGE_SIZE };
}
