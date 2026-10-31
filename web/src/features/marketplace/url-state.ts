import { cropTypes, energySources, farmTypes, irrigationMethods, waterSources } from '@/lib/domain/enums';
import {
  defaultFilters,
  FARM_SIZE_RANGE,
  governorates,
  marketplaceSorts,
  PRICE_RANGE,
  type GovernorateKey,
  type MarketplaceFilters,
  type MarketplaceSort,
} from '@/lib/data/marketplace';

/*
 * Marketplace state <-> URL search params. Defaults are omitted, so /farms is the default view and a filtered URL is
 * shareable and survives back/forward. Unknown or invalid values are ignored.
 * Also accepts the homepage search params: `location` (governorate) and `activity` (vegetables / fieldCrops).
 */
export interface MarketplaceState {
  filters: MarketplaceFilters;
  sort: MarketplaceSort;
  page: number;
}

export const defaultState: MarketplaceState = { filters: defaultFilters, sort: 'newest', page: 1 };

type Params = { get(name: string): string | null };

const list = <T extends string>(value: string | null, allowed: readonly T[]): T[] =>
  value ? [...new Set(value.split(',').filter((v): v is T => (allowed as readonly string[]).includes(v)))] : [];

const one = <T extends string>(value: string | null, allowed: readonly T[]): T | null =>
  value && (allowed as readonly string[]).includes(value) ? (value as T) : null;

function range(min: string | null, max: string | null, bounds: { min: number; max: number }): [number, number] {
  const clamp = (v: number) => Math.min(bounds.max, Math.max(bounds.min, v));
  const lo = min !== null && Number.isFinite(Number(min)) ? clamp(Number(min)) : bounds.min;
  const hi = max !== null && Number.isFinite(Number(max)) ? clamp(Number(max)) : bounds.max;
  return lo <= hi ? [lo, hi] : [bounds.min, bounds.max];
}

export function parseState(params: Params): MarketplaceState {
  const activity = params.get('activity');
  const farmTypeList = list(params.get('type') ?? params.get('activity'), farmTypes);
  const cropList = list(params.get('crop'), cropTypes);
  if ((activity === 'vegetables' || activity === 'vegetable') && !farmTypeList.includes('vegetable'))
    farmTypeList.push('vegetable');
  if (activity === 'fieldCrops' && !cropList.includes('fieldCrops')) cropList.push('fieldCrops');

  const governorate = one<GovernorateKey>(params.get('gov') ?? params.get('location'), governorates);
  const page = Number(params.get('page'));

  return {
    filters: {
      quickSale: params.get('quickSale') === 'true',
      saleMethods: list(params.get('saleMethods'), ['installment', 'exchange'] as const),
      exchangeAssetTypes: list(params.get('exchangeAssetTypes'), ['factory', 'villa', 'apartment', 'car'] as const),
      purpose: params.get('listing') === 'rent' ? 'rent' : 'sale',
      size: range(params.get('sizeMin'), params.get('sizeMax'), FARM_SIZE_RANGE),
      farmTypes: farmTypeList,
      governorate,
      area: governorate ? params.get('area') || null : null,
      waterSources: list(params.get('water'), waterSources),
      irrigationMethods: list(params.get('irrigation'), irrigationMethods),
      energySources: list(params.get('energy'), energySources),
      cropTypes: cropList,
      price: range(params.get('priceMin'), params.get('priceMax'), PRICE_RANGE),
    },
    sort: one(params.get('sort'), marketplaceSorts) ?? 'newest',
    page: Number.isInteger(page) && page > 1 ? page : 1,
  };
}

export function toSearchParams({ filters: f, sort, page }: MarketplaceState): Record<string, string> {
  const q: Record<string, string> = {};
  if (f.quickSale) q.quickSale = 'true';
  for (const [key, param] of Object.entries({
    farmTypes: 'type',
    waterSources: 'water',
    irrigationMethods: 'irrigation',
    energySources: 'energy',
    cropTypes: 'crop',
  })) {
    const v = f[key as keyof typeof f];
    if (Array.isArray(v) && v.length) q[param] = v.join(',');
  }
  if (f.saleMethods?.length) q.saleMethods = f.saleMethods.join(',');
  if (f.exchangeAssetTypes?.length) q.exchangeAssetTypes = f.exchangeAssetTypes.join(',');
  if (f.purpose === 'rent') q.listing = 'rent';
  if (f.size[0] !== FARM_SIZE_RANGE.min) q.sizeMin = String(f.size[0]);
  if (f.size[1] !== FARM_SIZE_RANGE.max) q.sizeMax = String(f.size[1]);
  if (f.governorate) q.gov = f.governorate;
  if (f.governorate && f.area) q.area = f.area;
  if (f.price[0] !== PRICE_RANGE.min) q.priceMin = String(f.price[0]);
  if (f.price[1] !== PRICE_RANGE.max) q.priceMax = String(f.price[1]);
  if (sort !== 'newest') q.sort = sort;
  if (page > 1) q.page = String(page);
  return q;
}

/** Filters a user has applied. Transaction (Buy/Rent) always counts, as in the Figma "Filters · 1" default. */
export function appliedCount(f: MarketplaceFilters): number {
  return supportedAppliedCount(f);
}

/** Count of filters that the public marketplace API can apply (excludes farm profile facets). */
export function supportedAppliedCount(f: MarketplaceFilters): number {
  return (
    1 +
    Number(!!f.quickSale) +
    f.farmTypes.length +
    f.waterSources.length +
    f.irrigationMethods.length +
    f.energySources.length +
    f.cropTypes.length +
    Number(f.size[0] !== FARM_SIZE_RANGE.min || f.size[1] !== FARM_SIZE_RANGE.max) +
    Number(f.governorate !== null) +
    Number(f.area !== null) +
    (f.saleMethods?.length ?? 0) +
    (f.exchangeAssetTypes?.length ?? 0) +
    Number(f.price[0] !== PRICE_RANGE.min || f.price[1] !== PRICE_RANGE.max)
  );
}

/** Session key for the last Marketplace query (read by Farm Details "Back to results"). */
export const RESULTS_QUERY_KEY = 'fx:farms-results';
