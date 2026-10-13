import { BadRequestException } from '@nestjs/common';
import { ListingType } from '../../generated/prisma/enums';
import { assertListingPrices, MAX_LISTING_POUNDS, moneyOut } from './listing-prices';

const none = { askingPrice: null, annualRentPerFeddan: null, statedSalePricePerFeddan: null };

describe('assertListingPrices', () => {
  it('accepts a sale with an asking price and an optional stated price per feddan', () => {
    expect(
      assertListingPrices(ListingType.sale, { ...none, askingPrice: 12_000_000, statedSalePricePerFeddan: 240_000 }),
    ).toEqual({
      askingPrice: 12_000_000,
      annualRentPerFeddan: null,
      statedSalePricePerFeddan: 240_000,
    });
  });

  it('accepts a rent with an annual rent and unstated sale prices', () => {
    expect(assertListingPrices(ListingType.rent, { ...none, annualRentPerFeddan: 18_000 })).toEqual({
      askingPrice: null,
      annualRentPerFeddan: 18_000,
      statedSalePricePerFeddan: null,
    });
  });

  it('allows both prices to be unstated', () => {
    expect(assertListingPrices(ListingType.sale, none)).toEqual(none);
    expect(assertListingPrices(ListingType.rent, none)).toEqual(none);
  });

  it('rejects the price that belongs to the other listing type', () => {
    expect(() => assertListingPrices(ListingType.sale, { ...none, annualRentPerFeddan: 1000 })).toThrow(
      BadRequestException,
    );
    expect(() => assertListingPrices(ListingType.rent, { ...none, askingPrice: 1000 })).toThrow(BadRequestException);
    expect(() => assertListingPrices(ListingType.rent, { ...none, statedSalePricePerFeddan: 1000 })).toThrow(
      BadRequestException,
    );
  });

  it('rejects fractions, zero, negatives and values above the column', () => {
    for (const bad of [1.5, 0, -10, MAX_LISTING_POUNDS + 1]) {
      expect(() => assertListingPrices(ListingType.sale, { ...none, askingPrice: bad })).toThrow(BadRequestException);
    }
  });
});

describe('moneyOut', () => {
  it('returns whole pounds and null for an unstated price', () => {
    expect(moneyOut(null)).toBeNull();
    expect(moneyOut('18000.00')).toBe(18000);
    expect(moneyOut(12_000_000)).toBe(12_000_000);
    expect(moneyOut({ toFixed: () => '12000000.00' })).toBe(12_000_000);
  });

  it('does not invent a number from a fractional stored value', () => {
    expect(moneyOut('10.50')).toBeNull();
  });
});
