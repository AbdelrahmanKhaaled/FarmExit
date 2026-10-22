import { getApiBaseUrl } from '@/lib/api/config';

export type PublicOpportunity = {
  id: string;
  farmName: string;
  governorate: string;
  areaName: string | null;
  areaFeddan: number;
  farmType: string | null;
  mainActivity: string | null;
  publishedAt: string | null;
  reviewStatus: 'approved';
  professionalNeed?: string | null;
  managementTypes?: string[] | null;
  goals?: string[] | null;
  term?: string | null;
  experienceLevel?: string | null;
  currentSituation?: string | null;
  outcomes?: string | null;
  responsibilities?: string[] | null;
  resourcesAndFacilities?: string[] | null;
  additionalInformation?: string | null;
  description?: string | null;
  objective?: string[] | null;
  acceptedPartnerTypes?: string[] | null;
  contributionDetails?: string | null;
  operations?: string | null;
  salesChannel?: string | null;
  extraInformation?: string | null;
  lookingFor?: string[] | null;
  contributionSought?: string[] | null;
  partnerBackground?: string[] | null;
};

export type PublicOpportunityList = {
  items: PublicOpportunity[];
  page: number;
  pageSize: number;
  total: number;
};

export type OpportunityFilters = {
  page: number;
  governorate?: string;
  area?: string;
  farmType?: string;
  minArea?: number;
  maxArea?: number;
  professionalNeed?: string;
  managementType?: string;
  experienceLevel?: string;
  objective?: string;
  partnerType?: string;
  q?: string;
  sort?: 'newest' | 'areaAsc' | 'areaDesc';
};

export function parseOpportunityFilters(
  query: Record<string, string | string[] | undefined>,
): OpportunityFilters {
  const page = Number(query.page);
  const num = (key: string) => {
    const v = query[key];
    const raw = Array.isArray(v) ? v[0] : v;
    if (!raw) return undefined;
    const n = Number(raw);
    return Number.isFinite(n) ? n : undefined;
  };
  const str = (key: string) => {
    const v = query[key];
    const raw = Array.isArray(v) ? v[0] : v;
    return raw?.trim() || undefined;
  };
  return {
    page: Number.isSafeInteger(page) && page > 0 ? page : 1,
    governorate: str('governorate'),
    area: str('area'),
    farmType: str('farmType'),
    minArea: num('minArea'),
    maxArea: num('maxArea'),
    professionalNeed: str('professionalNeed'),
    managementType: str('managementType'),
    experienceLevel: str('experienceLevel'),
    objective: str('objective'),
    partnerType: str('partnerType'),
    q: str('q'),
    sort: (str('sort') as OpportunityFilters['sort']) || 'newest',
  };
}

export function filtersToSearchParams(filters: OpportunityFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.page > 1) params.set('page', String(filters.page));
  const set = (key: string, value?: string | number) => {
    if (value === undefined || value === '') return;
    params.set(key, String(value));
  };
  set('governorate', filters.governorate);
  set('area', filters.area);
  set('farmType', filters.farmType);
  set('minArea', filters.minArea);
  set('maxArea', filters.maxArea);
  set('professionalNeed', filters.professionalNeed);
  set('managementType', filters.managementType);
  set('experienceLevel', filters.experienceLevel);
  set('objective', filters.objective);
  set('partnerType', filters.partnerType);
  set('q', filters.q);
  if (filters.sort && filters.sort !== 'newest') set('sort', filters.sort);
  return params;
}

export async function fetchPublicOpportunities(
  kind: 'management' | 'partnerships',
  filters: OpportunityFilters,
): Promise<PublicOpportunityList | null> {
  const params = filtersToSearchParams(filters);
  const url = `${getApiBaseUrl()}/public/${kind}?${params.toString()}`;
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()) as PublicOpportunityList;
  } catch {
    return null;
  }
}

export async function fetchPublicOpportunity(
  kind: 'management' | 'partnerships',
  id: string,
): Promise<PublicOpportunity | null> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/public/${kind}/${id}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()) as PublicOpportunity;
  } catch {
    return null;
  }
}

export const OPPORTUNITY_PLACEHOLDER_IMAGE = '/images/marketplace/listing-placeholder.svg';
