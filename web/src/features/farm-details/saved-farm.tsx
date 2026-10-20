'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useRouter } from '@/i18n/navigation';
import { accountLinks } from '@/components/layout/site-links';
import { intentStore } from '@/lib/intent/store';

type SavedFarmContextValue = {
  saved: boolean;
  loading: boolean;
  toggle: () => void;
};

const SavedFarmContext = createContext<SavedFarmContextValue | null>(null);

export function SavedFarmProvider({
  listingSlug,
  listingId,
  returnTo,
  children,
}: {
  listingSlug: string;
  listingId?: string;
  returnTo: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const [listingRequestId, setListingRequestId] = useState<string | null>(listingId ?? null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (listingId) return;
    void fetch(`/api/marketplace/farms/${encodeURIComponent(listingSlug)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { id?: string } | null) => {
        if (data?.id) setListingRequestId(data.id);
      })
      .catch(() => undefined);
  }, [listingSlug, listingId]);

  useEffect(() => {
    if (!listingRequestId) return;
    void fetch('/api/auth/me')
      .then((r) => (r.ok ? fetch('/api/marketplace/saved') : null))
      .then((r) => r?.json())
      .then((data: { items?: { id: string }[] } | undefined) => {
        if (data?.items?.some((i) => i.id === listingRequestId)) setSaved(true);
      })
      .catch(() => undefined);
  }, [listingRequestId]);

  const toggle = useCallback(async () => {
    if (!listingRequestId) return;
    setLoading(true);
    try {
      const me = await fetch('/api/auth/me');
      if (!me.ok) {
        intentStore.save({
          action: 'saveItem',
          targetId: listingRequestId,
          returnTo,
          draftRef: null,
          createdAt: new Date().toISOString(),
        });
        router.push(`${accountLinks.signIn}?returnTo=${encodeURIComponent(returnTo)}`);
        return;
      }
      if (saved) {
        const res = await fetch(`/api/marketplace/saved/${listingRequestId}`, { method: 'DELETE' });
        if (res.ok || res.status === 204) setSaved(false);
      } else {
        const res = await fetch(`/api/marketplace/saved/${listingRequestId}`, { method: 'POST' });
        if (res.ok) setSaved(true);
      }
    } finally {
      setLoading(false);
    }
  }, [listingRequestId, returnTo, router, saved]);

  return <SavedFarmContext.Provider value={{ saved, loading, toggle }}>{children}</SavedFarmContext.Provider>;
}

export function useSavedFarm(): SavedFarmContextValue {
  const ctx = useContext(SavedFarmContext);
  if (!ctx) {
    return {
      saved: false,
      loading: false,
      toggle: () => undefined,
    };
  }
  return ctx;
}
