import 'server-only';
import { apiFetchWebsite } from '@/lib/auth/session.server';
import type { Farm, ListingDraft } from './types';

export async function loadMyFarms(token: string): Promise<Farm[]> {
  const items: Farm[] = [];
  let page = 1,
    total = 1;
  while (items.length < total) {
    const data = await apiFetchWebsite<{ items: Farm[]; total: number }>(`/farms/mine?page=${page}&pageSize=50`, token);
    items.push(...data.items);
    total = data.total;
    if (!data.items.length) break;
    page++;
  }
  return items;
}
/** Fetch user-scoped pages so status counts never imply an incomplete page is the whole account. */
export async function loadOwnerListings(token: string): Promise<ListingDraft[] | null> {
  try {
    const items: ListingDraft[] = [];
    let page = 1,
      total = 1;
    while (items.length < total) {
      const data = await apiFetchWebsite<{ items: ListingDraft[]; total: number }>(
        `/listing-requests/mine?page=${page}&pageSize=50`,
        token,
      );
      items.push(...data.items);
      total = data.total;
      if (!data.items.length) break;
      page++;
    }
    return items;
  } catch {
    return null;
  }
}
