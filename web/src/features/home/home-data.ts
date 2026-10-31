import 'server-only';
import { cache } from 'react';
import { getApiBaseUrl } from '@/lib/api/config';
import type { PublicListingListDto } from '@/lib/api/public-listing';
import type { PublicOpportunity } from '@/lib/opportunities/public-opportunity';
import { loadHomeCompatibility } from './home-compatibility';
import { connection } from 'next/server';
import { unstable_rethrow } from 'next/navigation';

export type HomeData = {
  sale: PublicListingListDto;
  rent: PublicListingListDto;
  management: PublicOpportunity[];
  partnerships: PublicOpportunity[];
  metrics: {
    listings: number;
    farms: number | null;
    feddans: number | null;
    opportunities: number;
    governorates: number;
  };
  insights: { governorate: string; listings: number; salePerFeddan: number | null; rentPerFeddan: number | null }[];
  editorial: null | {
    heroHeadline?: string;
    heroSubhead?: string;
    aboutStatement?: string;
    aboutLead?: string;
    testimonials?: { author: string; quote: string; authorized: boolean }[];
  };
};

/**
 * Server-side loader for the Homepage data.
 *
 * 1. Primary source: calls `GET /marketplace/home/:locale` if available on the backend.
 * 2. Compatibility source: if the aggregate endpoint returns HTTP 404 (due to older deployed API),
 *    it gracefully derives the complete verified Homepage data from authorized public marketplace endpoints.
 * 3. Technical failures (5xx, 401, 403, 429) are logged explicitly and not converted to false zero records.
 */
export const loadHome = cache(async (locale: string): Promise<HomeData | null> => {
  await connection();
  const url = `${getApiBaseUrl()}/marketplace/home/${locale}`;
  try {
    const res = await fetch(url, {
      cache: 'no-store',
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(10000),
    });

    if (res.ok) {
      return (await res.json()) as HomeData;
    }

    if (res.status === 404) {
      console.warn(
        `[loadHome] Aggregate endpoint ${url} returned 404. Falling back to public marketplace compatibility loader.`,
      );
      return await loadHomeCompatibility(getApiBaseUrl(), locale);
    }

    console.error(`[loadHome] Aggregate request ${url} failed with status ${res.status}: ${res.statusText}`);
    return null;
  } catch (err) {
    unstable_rethrow(err);
    console.error('[loadHome] Public data unavailable:', err);
    return null;
  }
});
