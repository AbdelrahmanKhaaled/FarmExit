import { getApiBaseUrl } from '@/lib/api/config';
import type { PublicListingListDto } from '@/lib/api/public-listing';
import {
  mapMarketplaceListResponse,
  marketplaceStateToApiQuery,
  publicListingToMarketplaceListing,
} from './marketplace-api';
import type { MarketplaceListing } from './marketplace';
import type { MarketplaceState } from '@/features/marketplace/url-state';

export async function loadFarmMarketplacePage(
  state: MarketplaceState,
  pageSize: number,
): Promise<{ items: MarketplaceListing[]; total: number; page: number; pageSize: number; unavailable: boolean }> {
  const query = marketplaceStateToApiQuery(state, pageSize);
  const params = new URLSearchParams(query);
  try {
    const res = await fetch(`${getApiBaseUrl()}/marketplace/farms?${params}`, {
      headers: { accept: 'application/json' },
      cache: 'no-store',
    });
    if (!res.ok) {
      return { items: [], total: 0, page: state.page, pageSize, unavailable: true };
    }
    const data = (await res.json()) as PublicListingListDto;
    const mapped = mapMarketplaceListResponse(data);
    return { ...mapped, unavailable: false };
  } catch {
    return { items: [], total: 0, page: state.page, pageSize, unavailable: true };
  }
}

export async function loadPublicListingBySlug(slug: string): Promise<MarketplaceListing | null> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/marketplace/farms/${encodeURIComponent(slug)}`, {
      headers: { accept: 'application/json' },
      cache: 'no-store',
    });
    if (res.status === 404) return null;
    if (!res.ok) return null;
    const dto = (await res.json()) as import('@/lib/api/public-listing').PublicListingDto;
    return publicListingToMarketplaceListing(dto);
  } catch {
    return null;
  }
}
