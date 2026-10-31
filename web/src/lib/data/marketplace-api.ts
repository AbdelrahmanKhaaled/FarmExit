import { contentText } from '@/lib/content/localized';
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

export const GOVERNORATE_AR_LABEL: Record<GovernorateKey, string> = {
  beheira: 'البحيرة',
  ismailia: 'الإسماعيلية',
  menoufia: 'المنوفية',
  qalyubia: 'القليوبية',
  giza: 'الجيزة',
  sharqia: 'الشرقية',
  beniSuef: 'بني سويف',
  minya: 'المنيا',
  fayoum: 'الفيوم',
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
  const activityText = dto.mainActivity || '';
  const name = dto.farmName;
  const govKey = governorateKey(dto.governorate);
  const arabicGov = GOVERNORATE_AR_LABEL[govKey] ?? dto.governorate;
  return {
    slug: dto.slug,
    listingLocalizedContent: dto.listingLocalizedContent,
    saleEligibility: dto.saleEligibility,
    purpose,
    name: {
      en: contentText(dto.localizedContent, 'en', 'name', name),
      ar: contentText(dto.localizedContent, 'ar', 'name', name),
    },
    governorate: govKey,
    governorateDisplay: { en: dto.governorate, ar: arabicGov },
    area: {
      key: areaKey,
      label: {
        en: dto.areaName ?? dto.governorate,
        ar: contentText(dto.localizedContent, 'ar', 'areaName', dto.areaName) || arabicGov,
      },
    },
    areaFeddan: dto.areaFeddan,
    activity: activityText
      ? {
          en: contentText(dto.localizedContent, 'en', 'mainActivity', activityText),
          ar: contentText(dto.localizedContent, 'ar', 'mainActivity', activityText),
        }
      : { en: '—', ar: '—' },
    farmType: (dto.farmType as MarketplaceListing['farmType']) ?? null,
    cropTypes: (dto.cropTypes ?? []) as MarketplaceListing['cropTypes'],
    waterSources: (dto.waterSource ? [dto.waterSource] : []) as MarketplaceListing['waterSources'],
    waterSourceText: null,
    irrigationMethod: (dto.irrigationMethod as MarketplaceListing['irrigationMethod']) ?? null,
    energySource: (dto.energySource as MarketplaceListing['energySource']) ?? null,
    askingPrice: dto.askingPrice,
    pricePerFeddan: dto.statedSalePricePerFeddan,
    annualRentPerFeddan: dto.annualRentPerFeddan,
    image: {
      src:
        '/images/home/' +
        ['farm-wadi-el-natrun', 'farm-nubaria', 'farm-mallawi'][
          Array.from(dto.id).reduce((sum, c) => sum + c.charCodeAt(0), 0) % 3
        ] +
        '.jpg',
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
  return !state;
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
  if (f.quickSale) q.quickSale = 'true';
  for (const key of ['farmTypes', 'waterSources', 'irrigationMethods', 'energySources', 'cropTypes'] as const)
    if (f[key].length) q[key] = f[key].join(',');
  if (f.governorate) q.governorate = GOVERNORATE_API_LABEL[f.governorate as GovernorateKey];
  if (f.area) q.area = f.area;
  if (f.saleMethods?.length) q.saleMethods = f.saleMethods.join(',');
  if (f.exchangeAssetTypes?.length) q.exchangeAssetTypes = f.exchangeAssetTypes.join(',');
  if (f.size[0] !== FARM_SIZE_RANGE.min) q.minArea = String(f.size[0]);
  if (f.size[1] !== FARM_SIZE_RANGE.max) q.maxArea = String(f.size[1]);
  if (f.price[0] !== PRICE_RANGE.min) q.minPrice = String(f.price[0]);
  if (f.price[1] !== PRICE_RANGE.max) q.maxPrice = String(f.price[1]);
  return q;
}

export async function fetchPublicMarketplace(query: Record<string, string>): Promise<PublicListingListDto | null> {
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
