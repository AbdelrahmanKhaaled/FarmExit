import { BadRequestException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { ListingType, type ListingType as ListingTypeValue } from '../../generated/prisma/enums';

/** Whole Egyptian pounds. DECIMAL(15,2) can store this; fractional pounds are rejected. */
export const MAX_LISTING_POUNDS = 9_999_999_999_999;

export type ListingPrices = {
  askingPrice: number | null;
  annualRentPerFeddan: number | null;
  statedSalePricePerFeddan: number | null;
};

/**
 * Sale uses asking price (and an optional owner-stated price per feddan). Rent uses annual rent per feddan.
 * The other side must be absent. Nothing is derived: a missing price stays null ("not stated"), and the
 * marketplace's 5m–100m sale filter is not a creation rule.
 */
export function assertListingPrices(listingType: ListingTypeValue, prices: ListingPrices): ListingPrices {
  const askingPrice = wholePounds(prices.askingPrice, 'askingPrice');
  const annualRentPerFeddan = wholePounds(prices.annualRentPerFeddan, 'annualRentPerFeddan');
  const statedSalePricePerFeddan = wholePounds(prices.statedSalePricePerFeddan, 'statedSalePricePerFeddan');
  if (listingType === ListingType.sale && annualRentPerFeddan !== null) {
    throw new BadRequestException('A sale listing has an asking price, not an annual rent');
  }
  if (listingType === ListingType.rent && (askingPrice !== null || statedSalePricePerFeddan !== null)) {
    throw new BadRequestException('A rent listing has an annual rent per feddan, not a sale price');
  }
  return { askingPrice, annualRentPerFeddan, statedSalePricePerFeddan };
}

export function pounds(value: number | null): Prisma.Decimal | null {
  return value === null ? null : new Prisma.Decimal(value);
}

/** Reads a stored decimal back as a whole number of pounds, or null when it was never stated. */
export function moneyOut(
  value: { toFixed(digits: number): string } | number | string | null | undefined,
): number | null {
  if (value == null) return null;
  const raw = typeof value === 'object' ? value.toFixed(2) : String(value);
  if (!/^\d+(\.0+)?$/.test(raw)) return null;
  return Number(raw.split('.')[0]);
}

function wholePounds(value: number | null, field: string): number | null {
  if (value === null) return null;
  if (!Number.isInteger(value) || value < 1 || value > MAX_LISTING_POUNDS) {
    throw new BadRequestException(`${field} must be a whole number of Egyptian pounds`);
  }
  return value;
}
