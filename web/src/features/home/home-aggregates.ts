import type { PublicListingDto, PublicListingListDto } from '@/lib/api/public-listing';
import type { PublicOpportunity } from '@/lib/opportunities/public-opportunity';
import { localizeOpportunity } from '@/lib/opportunities/public-opportunity';
import type { HomeData } from './home-data';

export type RawHomepageSources = {
  allListings: PublicListingDto[];
  managementOpportunities: PublicOpportunity[];
  managementTotal: number;
  partnershipOpportunities: PublicOpportunity[];
  partnershipTotal: number;
  locale: string;
};

/**
 * Known Egyptian governorates in English to Arabic translation.
 * Matches normalized lowercase letters without whitespace or special characters.
 */
export const GOVERNORATE_AR_MAP: Record<string, string> = {
  beheira: 'البحيرة',
  ismailia: 'الإسماعيلية',
  menoufia: 'المنوفية',
  qalyubia: 'القليوبية',
  giza: 'الجيزة',
  sharqia: 'الشرقية',
  benisuef: 'بني سويف',
  minya: 'المنيا',
  fayoum: 'الفيوم',
  dakahlia: 'الدقهلية',
  gharbia: 'الغربية',
  kafrelsheikh: 'كفر الشيخ',
  matrouh: 'مطروح',
  newvalley: 'الوادي الجديد',
  alexandria: 'الإسكندرية',
  suez: 'السويس',
  cairo: 'القاهرة',
  aswan: 'أسوان',
  asyut: 'أسيوط',
  sohag: 'سوهاج',
  qena: 'قنا',
  luxor: 'الأقصر',
  redsea: 'البحر الأحمر',
  northsinai: 'شمال سيناء',
  southsinai: 'جنوب سيناء',
  damietta: 'دمياط',
  portsaid: 'بورسعيد',
};

export function localizeGovernorate(governorate: string, locale: string): string {
  if (locale !== 'ar') return governorate;
  const key = governorate.toLowerCase().replace(/[^a-z]/g, '');
  return GOVERNORATE_AR_MAP[key] ?? governorate;
}

/**
 * Pure aggregation function calculating verified metrics and market insights from raw public records.
 * Adheres strictly to business rules:
 * - Unique farms and their area remain unavailable without authoritative farm identity
 * - Arithmetic mean of asking price per feddan for valid sale listings
 * - Arithmetic mean of annual rent per feddan for valid rent listings
 * - Stable ranking of governorates: listings descending, then governorate alphabetical
 * - Up to 5 governorates displayed
 */
export function computeHomepageAggregates({
  allListings,
  managementOpportunities,
  managementTotal,
  partnershipOpportunities,
  partnershipTotal,
  locale,
}: RawHomepageSources): HomeData {
  // The legacy public contract has no farm identity. Names cannot prove uniqueness.
  const uniqueGovs = new Set(allListings.map((f) => f.governorate).filter(Boolean));

  // 2. Compute Market Insights by governorate
  const govMap = new Map<
    string,
    {
      governorate: string;
      listings: number;
      sales: number[];
      rents: number[];
    }
  >();

  for (const item of allListings) {
    const g = item.governorate;
    if (!g) continue;
    const entry = govMap.get(g) ?? { governorate: g, listings: 0, sales: [], rents: [] };
    entry.listings++;

    // Average sale asking price per feddan: valid askingPrice and positive areaFeddan
    if (item.listingType === 'sale' && typeof item.askingPrice === 'number' && item.askingPrice > 0) {
      const area = Number(item.areaFeddan);
      if (Number.isFinite(area) && area > 0) {
        entry.sales.push(item.askingPrice / area);
      }
    }

    // Average annual rent asking price per feddan: valid positive annualRentPerFeddan
    if (item.listingType === 'rent' && typeof item.annualRentPerFeddan === 'number' && item.annualRentPerFeddan > 0) {
      entry.rents.push(item.annualRentPerFeddan);
    }

    govMap.set(g, entry);
  }

  // Stable ranking: listings count descending, then governorate name ascending
  const insights = [...govMap.values()]
    .sort((a, b) => b.listings - a.listings || a.governorate.localeCompare(b.governorate))
    .slice(0, 5)
    .map((g) => ({
      governorate: g.governorate,
      listings: g.listings,
      salePerFeddan: g.sales.length ? Math.round(g.sales.reduce((a, b) => a + b, 0) / g.sales.length) : null,
      rentPerFeddan: g.rents.length ? Math.round(g.rents.reduce((a, b) => a + b, 0) / g.rents.length) : null,
    }));

  // 3. Partition listings into sale & rent
  const saleListings = allListings.filter((x) => x.listingType === 'sale');
  const rentListings = allListings.filter((x) => x.listingType === 'rent');

  const sale: PublicListingListDto = {
    items: saleListings.slice(0, 6),
    total: saleListings.length,
    page: 1,
    pageSize: 6,
  };

  const rent: PublicListingListDto = {
    items: rentListings.slice(0, 6),
    total: rentListings.length,
    page: 1,
    pageSize: 6,
  };

  // 4. Localize opportunities (exactly 3 for management)
  const management = managementOpportunities.slice(0, 3).map((item) => localizeOpportunity(item, locale));
  const partnerships = partnershipOpportunities.slice(0, 3).map((item) => localizeOpportunity(item, locale));

  return {
    sale,
    rent,
    management,
    partnerships,
    metrics: {
      listings: allListings.length,
      farms: null,
      feddans: null,
      opportunities: (managementTotal || 0) + (partnershipTotal || 0),
      governorates: uniqueGovs.size,
    },
    insights,
    editorial: null,
  };
}
