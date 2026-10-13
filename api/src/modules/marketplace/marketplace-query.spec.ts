import { Prisma } from '../../generated/prisma/client';
import { PUBLIC_LISTING_FIELDS, PUBLIC_LISTING_FORBIDDEN } from '../listing-requests/public-listing-contract';
import {
  buildMarketplaceWhere,
  compareListedPrice,
  listedPriceCents,
  toPublicListing,
} from './marketplace-query';

describe('public marketplace query', () => {
  it('keeps published public listings and does not apply a default price band', () => {
    const where = buildMarketplaceWhere({});
    expect(JSON.stringify(where)).toContain('"status":"published"');
    expect(JSON.stringify(where)).toContain('"visibility":"public"');
    expect(JSON.stringify(where)).toContain('"deletedAt":null');
    expect(JSON.stringify(where)).not.toContain('5000000');
    expect(JSON.stringify(where)).not.toContain('askingPrice');
  });

  it('filters sale and rent prices on their own columns, including when the type is omitted', () => {
    const sale = JSON.stringify(buildMarketplaceWhere({ listingType: 'sale', minPrice: 1000, maxPrice: 4000 }));
    expect(sale).toContain('askingPrice');
    expect(sale).not.toContain('annualRentPerFeddan');

    const rent = JSON.stringify(buildMarketplaceWhere({ listingType: 'rent', minPrice: 100 }));
    expect(rent).toContain('annualRentPerFeddan');
    expect(rent).not.toContain('askingPrice');

    const either = JSON.stringify(buildMarketplaceWhere({ minPrice: 100, maxPrice: 900 }));
    expect(either).toContain('askingPrice');
    expect(either).toContain('annualRentPerFeddan');
  });

  it('sorts the stated price for the listing type and puts an unstated price last', () => {
    const sale = { listingType: 'sale', askingPrice: new Prisma.Decimal('1500.50'), annualRentPerFeddan: null };
    const rent = { listingType: 'rent', askingPrice: new Prisma.Decimal('999999.00'), annualRentPerFeddan: new Prisma.Decimal('700.00') };
    const missing = { listingType: 'sale', askingPrice: null, annualRentPerFeddan: null };
    expect(listedPriceCents(sale)).toBe(150050n);
    expect(listedPriceCents(rent)).toBe(70000n);
    expect(compareListedPrice(sale, rent, 'asc')).toBeGreaterThan(0);
    expect(compareListedPrice(missing, rent, 'asc')).toBeGreaterThan(0);
    expect(compareListedPrice(missing, rent, 'desc')).toBeGreaterThan(0);
  });

  it('hides a published listing whose required price is not a whole number of pounds', () => {
    expect(
      toPublicListing({
        id: 4n,
        publishedAt: new Date('2026-10-13T12:00:00.000Z'),
        farm: { name: 'North Orchard', governorate: 'Beheira', areaName: 'Delengat', areaFeddan: new Prisma.Decimal('12.50') },
        listingDetail: {
          slug: 'sale-abcdef0123456789abcdef0123456789',
          listingType: 'sale',
          askingPrice: new Prisma.Decimal('1500.50'),
          annualRentPerFeddan: null,
          statedSalePricePerFeddan: new Prisma.Decimal('1000.00'),
          currency: 'EGP',
          availability: null,
          listingDescription: null,
          highlights: [],
        },
      }),
    ).toBeNull();
  });

  it('maps only the approved public fields and keeps an optional fractional price unstated', () => {
    const item = toPublicListing({
      id: 4n,
      publishedAt: new Date('2026-10-13T12:00:00.000Z'),
      farm: { name: 'North Orchard', governorate: 'Beheira', areaName: 'Delengat', areaFeddan: new Prisma.Decimal('12.50') },
      listingDetail: {
        slug: 'farm-4-sale-abcdef0123456789',
        listingType: 'sale',
        askingPrice: new Prisma.Decimal('1500.00'),
        annualRentPerFeddan: null,
        statedSalePricePerFeddan: new Prisma.Decimal('1000.50'),
        currency: 'EGP',
        availability: 'immediate',
        listingDescription: 'Orange grove',
        highlights: ['citrus', 12],
      },
    });
    expect(item).not.toBeNull();
    expect(Object.keys(item as object).sort()).toEqual([...PUBLIC_LISTING_FIELDS].sort());
    for (const field of PUBLIC_LISTING_FORBIDDEN) expect(item).not.toHaveProperty(field);
    expect(item).toMatchObject({
      id: '4',
      slug: 'farm-4-sale-abcdef0123456789',
      farmName: 'North Orchard',
      areaFeddan: 12.5,
      askingPrice: 1500,
      statedSalePricePerFeddan: null,
      highlights: ['citrus'],
      publishedAt: '2026-10-13T12:00:00.000Z',
    });
    expect(JSON.stringify(item)).not.toMatch(/privatePin|storageKey|licenceStatus|mobile|email|score|image/);
  });
});
