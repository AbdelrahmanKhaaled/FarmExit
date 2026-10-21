/** Mirrors `api` PublicListingDto (marketplace card fields only). */
export type PublicListingDto = {
  saleEligibility?: {
    saleMode: string;
    acceptsCashProposals: boolean;
    acceptsInstallmentProposals: boolean;
    acceptsExchangeProposals: boolean;
    exchangePreferenceScope: string;
    exchangeAssetTypes: string[];
  } | null;
  id: string;
  slug: string;
  farmName: string;
  governorate: string;
  areaName: string | null;
  areaFeddan: number;
  listingType: 'sale' | 'rent';
  askingPrice: number | null;
  annualRentPerFeddan: number | null;
  statedSalePricePerFeddan: number | null;
  currency: string;
  availability: string | null;
  listingDescription: string | null;
  highlights: string[];
  publishedAt: string | null;
  farmExitScore: number | null;
};

export type PublicListingListDto = {
  items: PublicListingDto[];
  page: number;
  pageSize: number;
  total: number;
};
