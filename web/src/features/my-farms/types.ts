export type Farm = {
  id: string;
  name: string;
  farmType: string;
  mainActivity?: string | null;
  areaFeddan: number;
  governorate: string;
  areaName: string | null;
  description: string | null;
  waterSource?: string | null;
  irrigationMethod?: string | null;
  energySource?: string | null;
  soilType?: string | null;
  myRoles: string[];
  createdAt?: string | null;
  updatedAt?: string | null;
};
export type ListingDraft = {
  id: string;
  farmId: string;
  farmName: string;
  requestNumber: string;
  listingType: 'sale' | 'rent';
  status: string;
  visibility: string;
  askingPrice: number | null;
  annualRentPerFeddan: number | null;
  statedSalePricePerFeddan: number | null;
  availability: string | null;
  listingDescription: string | null;
  highlights: string[];
  createdAt: string | null;
  updatedAt: string | null;
  reviews: { decision: string; comment: string | null; createdAt: string | null }[];
};
export type FarmSpecification = {
  cropTypes: string[];
  productionDetails: { currentProduction: string | null; harvestSeasons: string | null; notes: string | null };
  canEdit: boolean;
};
export const editableListing = (status: string) => status === 'draft' || status === 'changesRequested';

export async function jsonRequest<T>(url: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(url, {
    method,
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) throw new Error(String(response.status));
  return (await response.json()) as T;
}
