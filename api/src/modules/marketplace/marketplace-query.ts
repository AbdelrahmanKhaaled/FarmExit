import { BadRequestException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { ListingType, RequestType, RequestVisibility } from '../../generated/prisma/enums';
import { moneyOut } from '../listing-requests/listing-prices';
import { LISTING_PUBLISHED } from '../listing-requests/listing-requests.service';
import type { PublicListingDto } from './dto/public-listing.dto';

export type MarketplaceFilters = {
  saleMethods?: ('installment' | 'exchange')[];
  exchangeAssetTypes?: ('factory' | 'villa' | 'apartment' | 'car')[];
  q?: string;
  listingType?: 'sale' | 'rent';
  governorate?: string;
  area?: string;
  minArea?: number;
  maxArea?: number;
  minPrice?: number;
  maxPrice?: number;
};

export const MARKETPLACE_SORTS = ['newest', 'oldest', 'priceAsc', 'priceDesc', 'areaAsc', 'areaDesc'] as const;
export type MarketplaceSort = (typeof MARKETPLACE_SORTS)[number];

export type ListedPriceSource = {
  listingType: string;
  askingPrice: unknown;
  annualRentPerFeddan: unknown;
} | null;

export type PublicListingSource = {
  id: bigint;
  publishedAt: Date | null;
  farm: {
    id: bigint;
    name: string;
    governorate: string;
    areaName: string | null;
    areaFeddan: { toString(): string } | number | string;
  } | null;
  listingDetail: {
    saleTerms?: {
      saleMode: string;
      acceptsCashProposals: boolean;
      acceptsInstallmentProposals: boolean;
      acceptsExchangeProposals: boolean;
      exchangePreferenceScope: string;
      exchangePreferences: { assetType: string }[];
    } | null;
    slug: string;
    listingType: string;
    askingPrice: unknown;
    annualRentPerFeddan: unknown;
    statedSalePricePerFeddan: unknown;
    currency: string;
    availability: string | null;
    listingDescription: string | null;
    highlights: unknown;
  } | null;
};

/** The columns a public query may read. Private farm, owner, media and review columns are absent. */
export const publicListingSelect = {
  id: true,
  publishedAt: true,
  farm: { select: { id: true, name: true, governorate: true, areaName: true, areaFeddan: true } },
  listingDetail: {
    select: {
      saleTerms: {
        select: {
          saleMode: true,
          acceptsCashProposals: true,
          acceptsInstallmentProposals: true,
          acceptsExchangeProposals: true,
          exchangePreferenceScope: true,
          exchangePreferences: { select: { assetType: true } },
        },
      },
      slug: true,
      listingType: true,
      askingPrice: true,
      annualRentPerFeddan: true,
      statedSalePricePerFeddan: true,
      currency: true,
      availability: true,
      listingDescription: true,
      highlights: true,
    },
  },
} as const;

export function assertMarketplaceRanges(query: MarketplaceFilters): void {
  if (query.minPrice !== undefined && query.maxPrice !== undefined && query.minPrice > query.maxPrice) {
    throw new BadRequestException('minPrice must not be greater than maxPrice');
  }
  if (query.minArea !== undefined && query.maxArea !== undefined && query.minArea > query.maxArea) {
    throw new BadRequestException('minArea must not be greater than maxArea');
  }
}

/**
 * Published, public farm listings whose farm is still present.
 * A price bound uses asking price for sale and annual rent per feddan for rent. No default price band.
 */
export function buildMarketplaceWhere(query: MarketplaceFilters): Prisma.RequestWhereInput {
  const farm: Prisma.FarmWhereInput = { deletedAt: null };
  if (query.governorate !== undefined) farm.governorate = query.governorate;
  if (query.area !== undefined) farm.areaName = query.area;
  if (query.minArea !== undefined || query.maxArea !== undefined) {
    farm.areaFeddan = {};
    if (query.minArea !== undefined) farm.areaFeddan.gte = query.minArea;
    if (query.maxArea !== undefined) farm.areaFeddan.lte = query.maxArea;
  }

  const detail: Prisma.FarmListingDetailWhereInput = {};
  if (query.listingType !== undefined) detail.listingType = query.listingType;

  const and: Prisma.RequestWhereInput[] = [
    {
      requestType: RequestType.farmListing,
      status: LISTING_PUBLISHED,
      visibility: RequestVisibility.public,
      farm: { is: farm },
      listingDetail: Object.keys(detail).length > 0 ? { is: detail } : { isNot: null },
    },
  ];

  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    const range: Prisma.DecimalFilter = {};
    if (query.minPrice !== undefined) range.gte = query.minPrice;
    if (query.maxPrice !== undefined) range.lte = query.maxPrice;
    if (query.listingType === ListingType.sale) {
      and.push({ listingDetail: { is: { askingPrice: range } } });
    } else if (query.listingType === ListingType.rent) {
      and.push({ listingDetail: { is: { annualRentPerFeddan: range } } });
    } else {
      and.push({
        OR: [
          { listingDetail: { is: { listingType: ListingType.sale, askingPrice: range } } },
          { listingDetail: { is: { listingType: ListingType.rent, annualRentPerFeddan: range } } },
        ],
      });
    }
  }

  if (query.saleMethods?.length)
    and.push({
      listingDetail: {
        is: {
          listingType: ListingType.sale,
          saleTerms: {
            is: {
              OR: query.saleMethods.map((method) =>
                method === 'installment' ? { acceptsInstallmentProposals: true } : { acceptsExchangeProposals: true },
              ),
            },
          },
        },
      },
    });
  if (query.exchangeAssetTypes?.length)
    and.push({
      listingDetail: {
        is: {
          listingType: ListingType.sale,
          saleTerms: {
            is: {
              acceptsExchangeProposals: true,
              OR: [
                { exchangePreferenceScope: 'any' },
                {
                  exchangePreferenceScope: 'selected',
                  exchangePreferences: { some: { assetType: { in: query.exchangeAssetTypes } } },
                },
              ],
            },
          },
        },
      },
    });
  if (query.q !== undefined) {
    const contains = { contains: query.q };
    and.push({
      OR: [
        { farm: { is: { name: contains } } },
        { farm: { is: { governorate: contains } } },
        { farm: { is: { areaName: contains } } },
        { listingDetail: { is: { listingDescription: contains } } },
      ],
    });
  }

  return { AND: and };
}

/** Database order for every sort except a mixed sale/rent price sort, which has no single price column. */
export function marketplaceOrder(
  sort: MarketplaceSort,
  listingType: MarketplaceFilters['listingType'],
): Prisma.RequestOrderByWithRelationInput[] | null {
  if (sort === 'oldest') return [{ publishedAt: 'asc' }, { id: 'asc' }];
  if (sort === 'areaAsc') return [{ farm: { areaFeddan: 'asc' } }, { id: 'asc' }];
  if (sort === 'areaDesc') return [{ farm: { areaFeddan: 'desc' } }, { id: 'asc' }];
  if (sort === 'priceAsc' || sort === 'priceDesc') {
    const direction = sort === 'priceAsc' ? 'asc' : 'desc';
    if (listingType === ListingType.rent) return [{ listingDetail: { annualRentPerFeddan: direction } }, { id: 'asc' }];
    if (listingType === ListingType.sale) return [{ listingDetail: { askingPrice: direction } }, { id: 'asc' }];
    return null;
  }
  return [{ publishedAt: 'desc' }, { id: 'desc' }];
}

/** Whole pounds stored on the price column that belongs to this listing type. Null sorts last. */
export function listedPriceCents(detail: ListedPriceSource): bigint | null {
  if (!detail) return null;
  const raw = detail.listingType === ListingType.rent ? detail.annualRentPerFeddan : detail.askingPrice;
  const text = priceText(raw);
  if (!text) return null;
  const match = /^(\d+)\.(\d{2})$/.exec(text);
  if (!match) return null;
  return BigInt(match[1]) * 100n + BigInt(match[2]);
}

function priceText(raw: unknown): string | null {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw.toFixed(2);
  if (typeof raw === 'string') return raw;
  if (raw instanceof Prisma.Decimal) return raw.toFixed(2);
  return null;
}

export function compareListedPrice(
  left: ListedPriceSource,
  right: ListedPriceSource,
  direction: 'asc' | 'desc',
): number {
  const a = listedPriceCents(left);
  const b = listedPriceCents(right);
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  const order = a < b ? -1 : a > b ? 1 : 0;
  return direction === 'asc' ? order : -order;
}

export function toPublicListing(
  source: PublicListingSource,
  farmExitScore: number | null = null,
): PublicListingDto | null {
  const farm = source.farm;
  const detail = source.listingDetail;
  if (!farm || !detail || !hasPublicPrice(detail)) return null;
  return {
    id: source.id.toString(),
    slug: detail.slug,
    farmName: farm.name,
    governorate: farm.governorate,
    areaName: farm.areaName,
    areaFeddan: Number(typeof farm.areaFeddan === 'number' ? farm.areaFeddan : farm.areaFeddan.toString()),
    listingType: detail.listingType,
    askingPrice: moneyOut(detail.askingPrice as Parameters<typeof moneyOut>[0]),
    annualRentPerFeddan: moneyOut(detail.annualRentPerFeddan as Parameters<typeof moneyOut>[0]),
    statedSalePricePerFeddan: moneyOut(detail.statedSalePricePerFeddan as Parameters<typeof moneyOut>[0]),
    currency: detail.currency,
    availability: detail.availability,
    listingDescription: detail.listingDescription,
    highlights: highlightsOut(detail.highlights),
    publishedAt: source.publishedAt?.toISOString() ?? null,
    farmExitScore,
    saleEligibility:
      detail.listingType === 'sale' && detail.saleTerms
        ? {
            saleMode: detail.saleTerms.saleMode,
            acceptsCashProposals: detail.saleTerms.acceptsCashProposals,
            acceptsInstallmentProposals: detail.saleTerms.acceptsInstallmentProposals,
            acceptsExchangeProposals: detail.saleTerms.acceptsExchangeProposals,
            exchangePreferenceScope: detail.saleTerms.exchangePreferenceScope,
            exchangeAssetTypes:
              detail.saleTerms.acceptsExchangeProposals && detail.saleTerms.exchangePreferenceScope === 'selected'
                ? detail.saleTerms.exchangePreferences.map((p) => p.assetType)
                : [],
          }
        : null,
  };
}

function hasPublicPrice(detail: NonNullable<PublicListingSource['listingDetail']>): boolean {
  const required = detail.listingType === ListingType.rent ? detail.annualRentPerFeddan : detail.askingPrice;
  const pounds = moneyOut(required as Parameters<typeof moneyOut>[0]);
  return detail.listingType === ListingType.sale || detail.listingType === ListingType.rent
    ? pounds !== null && pounds >= 1
    : false;
}

function highlightsOut(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}
