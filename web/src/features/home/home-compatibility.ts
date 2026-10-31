import type { PublicListingDto, PublicListingListDto } from '@/lib/api/public-listing';
import type { PublicOpportunityList } from '@/lib/opportunities/public-opportunity';
import { computeHomepageAggregates } from './home-aggregates';

/** Legacy public reads must be complete; never convert a failed page/source to zero. */
export async function loadHomeCompatibility(base: string, locale: string, fetcher: typeof fetch = fetch) {
  async function read<T>(path: string): Promise<T> {
    const response = await fetcher(base + path, {
      cache: 'no-store',
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error(`Homepage source ${path} failed: ${response.status}`);
    return response.json() as Promise<T>;
  }
  const first = await read<PublicListingListDto>('/marketplace/farms?pageSize=50&page=1');
  if (!Number.isSafeInteger(first.total) || first.total < 0 || first.total > 500)
    throw new Error('Homepage complete listing dataset exceeds the legacy read limit or has an invalid total');
  const listings: PublicListingDto[] = [];
  const pages = Math.max(1, Math.ceil(first.total / 50));
  for (let page = 1; page <= pages; page++) {
    const result = page === 1 ? first : await read<PublicListingListDto>(`/marketplace/farms?pageSize=50&page=${page}`);
    const expected = Math.min(50, Math.max(0, first.total - (page - 1) * 50));
    if (
      result.total !== first.total ||
      result.page !== page ||
      !Array.isArray(result.items) ||
      result.items.length !== expected
    )
      throw new Error('Homepage pagination changed or returned an incomplete page');
    listings.push(...result.items);
  }
  if (new Set(listings.map((item) => item.id)).size !== first.total)
    throw new Error('Homepage pagination contains duplicate listing identities');
  const [management, partnerships] = await Promise.all([
    read<PublicOpportunityList>('/public/management?pageSize=50&page=1'),
    read<PublicOpportunityList>('/public/partnerships?pageSize=50&page=1'),
  ]);
  for (const source of [management, partnerships]) {
    if (
      !Number.isSafeInteger(source.total) ||
      source.total < 0 ||
      !Array.isArray(source.items) ||
      source.items.length !== Math.min(50, source.total)
    )
      throw new Error('Homepage opportunity source is incomplete');
  }
  return computeHomepageAggregates({
    allListings: listings,
    managementOpportunities: management.items,
    managementTotal: management.total,
    partnershipOpportunities: partnerships.items,
    partnershipTotal: partnerships.total,
    locale,
  });
}
