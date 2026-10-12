/**
 * Farm Marketplace read model and query contract. The UI depends on these types and on `FarmMarketplaceSource`
 * only; `src/lib/data/sample/farm-listings.ts` is the sample adapter until the API exists.
 */
import type {
  CropType,
  EnergySource,
  FarmType,
  IrrigationMethod,
  ListingPurpose,
  WaterSource,
} from '@/lib/domain/enums';
import type { Egp, Localized } from '@/lib/domain/types';

/**
 * One marketplace card. Structured fields drive filtering; `null` / `[]` mean "Not stated in listing".
 * Nothing is computed for display: price per feddan is shown only when the listing states it.
 */
export interface MarketplaceListing {
  slug: string;
  purpose: ListingPurpose;
  name: Localized;
  governorate: GovernorateKey;
  /** Town / area inside the governorate (Location › Area filter). */
  area: { key: string; label: Localized };
  areaFeddan: number;
  /** Activity as stated in the listing. */
  activity: Localized;
  farmType: FarmType | null;
  cropTypes: CropType[];
  waterSources: WaterSource[];
  /** Water source as worded in the listing, e.g. "Well (2 wells)". Null = not stated. */
  waterSourceText: Localized | null;
  irrigationMethod: IrrigationMethod | null;
  energySource: EnergySource | null;
  /** Sale: total asking price. */
  askingPrice: Egp | null;
  /** Sale: price per feddan as stated in the listing (never derived). */
  pricePerFeddan: Egp | null;
  /** Rent: annual rent per feddan as stated in the listing. */
  annualRentPerFeddan: Egp | null;
  image: { src: string; alt: Localized; isIllustrative: boolean };
  /**
   * FarmExit Score out of 5: FarmExit's own evaluation of the farm, never a customer rating. Only approved sample
   * values are set (Source of Truth: homepage farms); `null` = no approved value yet. The methodology is open
   * (Business/content validation required), so no factors, weights or formula are modelled here.
   */
  score: number | null;
  /** Order of "Newest listings" (higher = newer). */
  publishedRank: number;
}

/** Governorates present in the sample data (labels in messages/<locale>/marketplace.json). */
export const governorates = [
  'beheira',
  'ismailia',
  'menoufia',
  'qalyubia',
  'giza',
  'sharqia',
  'beniSuef',
  'minya',
  'fayoum',
] as const;
export type GovernorateKey = (typeof governorates)[number];

export const marketplaceSorts = ['newest', 'priceAsc', 'priceDesc'] as const;
export type MarketplaceSort = (typeof marketplaceSorts)[number];

/** Approved ranges (Source of Truth 4o / 4p and the Figma Filter Panel). */
export const FARM_SIZE_RANGE = { min: 10, max: 500, step: 5 } as const;
export const PRICE_RANGE = { min: 5_000_000, max: 100_000_000, step: 500_000 } as const;

export interface MarketplaceFilters {
  purpose: ListingPurpose;
  size: [number, number];
  farmTypes: FarmType[];
  governorate: GovernorateKey | null;
  area: string | null;
  waterSources: WaterSource[];
  irrigationMethods: IrrigationMethod[];
  energySources: EnergySource[];
  cropTypes: CropType[];
  price: [number, number];
}

export interface MarketplaceQuery {
  filters: MarketplaceFilters;
  sort: MarketplaceSort;
}

export const defaultFilters: MarketplaceFilters = {
  purpose: 'sale',
  size: [FARM_SIZE_RANGE.min, FARM_SIZE_RANGE.max],
  farmTypes: [],
  governorate: null,
  area: null,
  waterSources: [],
  irrigationMethods: [],
  energySources: [],
  cropTypes: [],
  price: [PRICE_RANGE.min, PRICE_RANGE.max],
};

export interface FarmMarketplaceSource {
  /** Every published listing (sample adapter: in-memory). */
  all(): MarketplaceListing[];
}

const overlaps = <T>(selected: T[], values: T[]) => selected.length === 0 || selected.some((v) => values.includes(v));
const within = ([min, max]: [number, number], value: number, full: [number, number]) =>
  (min === full[0] && max === full[1]) || (value >= min && value <= max);

/**
 * Applies filters (AND across groups, OR inside a group) and sort. A listing whose value is "Not stated" never
 * matches a filter that asks for that attribute. Price range applies to sale prices only; rentals are priced per
 * feddan per year (Business/content validation required: price filter for rentals).
 */
export function queryListings(source: FarmMarketplaceSource, { filters: f, sort }: MarketplaceQuery) {
  const sizeFull: [number, number] = [FARM_SIZE_RANGE.min, FARM_SIZE_RANGE.max];
  const priceFull: [number, number] = [PRICE_RANGE.min, PRICE_RANGE.max];

  const items = source
    .all()
    .filter(
      (l) =>
        l.purpose === f.purpose &&
        within(f.size, l.areaFeddan, sizeFull) &&
        (f.farmTypes.length === 0 || (l.farmType !== null && f.farmTypes.includes(l.farmType))) &&
        (f.governorate === null || l.governorate === f.governorate) &&
        (f.area === null || l.area.key === f.area) &&
        overlaps(f.waterSources, l.waterSources) &&
        (f.irrigationMethods.length === 0 ||
          (l.irrigationMethod !== null && f.irrigationMethods.includes(l.irrigationMethod))) &&
        (f.energySources.length === 0 || (l.energySource !== null && f.energySources.includes(l.energySource))) &&
        overlaps(f.cropTypes, l.cropTypes) &&
        (l.purpose !== 'sale' || l.askingPrice === null || within(f.price, l.askingPrice, priceFull)),
    );

  const price = (l: MarketplaceListing) => (l.purpose === 'sale' ? l.askingPrice : l.annualRentPerFeddan);
  const sorted = [...items].sort((a, b) => {
    if (sort === 'newest') return b.publishedRank - a.publishedRank;
    const pa = price(a);
    const pb = price(b);
    // Listings without a stated price go last in either direction.
    if (pa === null || pb === null) return pa === null ? (pb === null ? 0 : 1) : -1;
    return sort === 'priceAsc' ? pa - pb : pb - pa;
  });

  return sorted;
}

/** Areas available for the Location › Area select (inside the chosen governorate, or all). */
export function areaOptions(source: FarmMarketplaceSource, governorate: GovernorateKey | null) {
  const seen = new Map<string, Localized>();
  for (const l of source.all()) {
    if (governorate === null || l.governorate === governorate) seen.set(l.area.key, l.area.label);
  }
  return [...seen].map(([key, label]) => ({ key, label }));
}
