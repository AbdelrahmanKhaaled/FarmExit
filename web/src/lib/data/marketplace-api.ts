import type { PublicListingDto, PublicListingListDto } from '@/lib/api/public-listing';
import type { GovernorateKey, MarketplaceListing } from './marketplace';
import type { MarketplaceState } from '@/features/marketplace/url-state';
import { FARM_SIZE_RANGE, PRICE_RANGE } from './marketplace';

export const LISTING_PLACEHOLDER_SRC = '/images/marketplace/listing-placeholder.svg';

/** API governorate strings (exact match on farm.governorate). */
export const GOVERNORATE_API_LABEL: Record<GovernorateKey, string> = {
  beheira: 'Beheira',
  ismailia: 'Ismailia',
  menoufia: 'Menoufia',
  qalyubia: 'Qalyubia',
  giza: 'Giza',
  sharqia: 'Sharqia',
  beniSuef: 'Beni Suef',
  minya: 'Minya',
  fayoum: 'Fayoum',
};

function governorateKey(raw: string): GovernorateKey {
  const slug = raw.toLowerCase().replace(/[^a-z]/g, '');
  const map: Record<string, GovernorateKey> = {
    beheira: 'beheira',
    ismailia: 'ismailia',
    menoufia: 'menoufia',
    qalyubia: 'qalyubia',
    giza: 'giza',
    sharqia: 'sharqia',
    benisuef: 'beniSuef',
    minya: 'minya',
    fayoum: 'fayoum',
  };
  return map[slug] ?? 'beheira';
}

export function publicListingToMarketplaceListing(dto: PublicListingDto): MarketplaceListing {
  const purpose = dto.listingType === 'rent' ? 'rent' : 'sale';
  const areaKey = (dto.areaName ?? dto.slug).slice(0, 48);
  const publishedRank = dto.publishedAt ? Date.parse(dto.publishedAt) : 0;
  const desc = dto.listingDescription?.trim() ?? '';
  const activityText = desc || dto.highlights[0] || '';
  const name = dto.farmName;
  return {
    slug: dto.slug,
    purpose,
    name: { en: name, ar: name },
    governorate: governorateKey(dto.governorate),
    governorateDisplay: { en: dto.governorate, ar: dto.governorate },
    area: {
      key: areaKey,
      label: { en: dto.areaName ?? dto.governorate, ar: dto.areaName ?? dto.governorate },
    },
    areaFeddan: dto.areaFeddan,
    activity: activityText ? { en: activityText, ar: activityText } : { en: '—', ar: '—' },
    farmType: null,
    cropTypes: [],
    waterSources: [],
    waterSourceText: null,
    irrigationMethod: null,
    energySource: null,
    askingPrice: dto.askingPrice,
    pricePerFeddan: dto.statedSalePricePerFeddan,
    annualRentPerFeddan: dto.annualRentPerFeddan,
    image: {
      src: LISTING_PLACEHOLDER_SRC,
      alt: { en: name, ar: name },
      isIllustrative: true,
    },
    score: dto.farmExitScore,
    publishedRank,
    listingId: dto.id,
    highlights: dto.highlights,
    listingDescription: desc || null,
    availability: dto.availability,
  };
}

export function hasUnsupportedPublicFilters(state: MarketplaceState): boolean {
  const f = state.filters;
  return (
    f.farmTypes.length > 0 ||
    f.waterSources.length > 0 ||
    f.irrigationMethods.length > 0 ||
    f.energySources.length > 0 ||
    f.cropTypes.length > 0
  );
}

/** Maps UI state to public marketplace query params (server-side filters only). */
export function marketplaceStateToApiQuery(state: MarketplaceState, pageSize: number): Record<string, string> {
  const f = state.filters;
  const q: Record<string, string> = {
    page: String(state.page),
    pageSize: String(pageSize),
    sort: state.sort,
  };
  if (f.purpose === 'rent') q.listingType = 'rent';
  else q.listingType = 'sale';
  if (f.governorate) q.governorate = GOVERNORATE_API_LABEL[f.governorate as GovernorateKey];
  if (f.area) q.area = f.area;
  if (f.size[0] !== FARM_SIZE_RANGE.min) q.minArea = String(f.size[0]);
  if (f.size[1] !== FARM_SIZE_RANGE.max) q.maxArea = String(f.size[1]);
  if (f.price[0] !== PRICE_RANGE.min) q.minPrice = String(f.price[0]);
  if (f.price[1] !== PRICE_RANGE.max) q.maxPrice = String(f.price[1]);
  return q;
}

export async function fetchPublicMarketplace(
  query: Record<string, string>,
): Promise<PublicListingListDto | null> {
  const params = new URLSearchParams(query);
  const res = await fetch(`/api/marketplace/farms?${params}`, { headers: { accept: 'application/json' } });
  if (!res.ok) return null;
  return (await res.json()) as PublicListingListDto;
}

export function mapMarketplaceListResponse(data: PublicListingListDto): {
  items: MarketplaceListing[];
  page: number;
  pageSize: number;
  total: number;
} {
  return {
    items: data.items.map(publicListingToMarketplaceListing),
    page: data.page,
    pageSize: data.pageSize,
    total: data.total,
  };
}
