import { BadRequestException } from '@nestjs/common';
import {
  ExchangeAssetType,
  ExchangePreferenceScope,
  ProposalComponentType,
  ProposalKind,
  SaleMode,
} from '../../generated/prisma/enums';
import { assertProposalShape, resolveSaleTerms, shareDecimal } from './offer-values';
import { buildMarketplaceWhere, toPublicListing, type PublicListingSource } from '../marketplace/marketplace-query';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { MarketplaceQueryDto } from '../marketplace/dto/marketplace-query.dto';
import { SaleTermsService } from './sale-terms.service';
import type { PrismaService } from '../../prisma/prisma.service';

describe('Stage 1E owner eligibility and public discovery', () => {
  it('rechecks editable status under the transaction lock before changing eligibility', async () => {
    const tx = {
      request: {
        findFirst: jest.fn().mockResolvedValue({ id: 1n, farmId: 2n, status: 'draft' }),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      farmListingDetail: { findUnique: jest.fn().mockResolvedValue({ listingType: 'sale' }) },
      farmRelationship: { findMany: jest.fn().mockResolvedValue([{ startsAt: null, endsAt: null }]) },
      farmSaleTerms: { upsert: jest.fn() },
    };
    const prisma = { ...tx, $transaction: jest.fn((work: (db: typeof tx) => Promise<unknown>) => work(tx)) };
    const service = new SaleTermsService(prisma as unknown as PrismaService);
    await expect(service.putForOwner(1n, 1n, { saleMode: SaleMode.standardCash })).rejects.toThrow('draft');
    expect(tx.farmSaleTerms.upsert).not.toHaveBeenCalled();
  });
  for (const [installment, exchange] of [
    [true, false],
    [false, true],
    [true, true],
  ]) {
    it(`stores explicit quick-sale eligibility ${installment}/${exchange} without cash`, () => {
      const terms = resolveSaleTerms({
        saleMode: SaleMode.quickSale,
        acceptsInstallmentProposals: installment,
        acceptsExchangeProposals: exchange,
        exchangePreferenceScope: exchange ? ExchangePreferenceScope.selected : ExchangePreferenceScope.any,
        exchangeAssetTypes: exchange ? [ExchangeAssetType.factory, ExchangeAssetType.villa] : [],
      });
      expect(terms).toMatchObject({
        acceptsCashProposals: false,
        acceptsInstallmentProposals: installment,
        acceptsExchangeProposals: exchange,
      });
      expect(() =>
        assertProposalShape(
          ProposalKind.cash,
          terms,
          [{ componentType: ProposalComponentType.cash, proposedValue: 1 }],
          null,
          null,
        ),
      ).toThrow(BadRequestException);
      expect(() => assertProposalShape(ProposalKind.coPurchase, terms, [], shareDecimal(25, 'share'), null)).toThrow(
        BadRequestException,
      );
      expect(() =>
        assertProposalShape(
          ProposalKind.mixed,
          terms,
          [
            { componentType: ProposalComponentType.cash, proposedValue: 1 },
            {
              componentType: ProposalComponentType.exchangeAsset,
              assetType: ExchangeAssetType.factory,
              proposedValue: 1,
            },
          ],
          null,
          null,
        ),
      ).toThrow(BadRequestException);
      const proposed = () =>
        assertProposalShape(
          ProposalKind.installment,
          terms,
          [{ componentType: ProposalComponentType.installments, proposedValue: 200, installmentCount: 2 }],
          null,
          null,
        );
      if (installment) expect(proposed).not.toThrow();
      else expect(proposed).toThrow();
    });
  }
  for (const assetType of Object.values(ExchangeAssetType))
    it(`validates exact owner-accepted ${assetType}`, () => {
      const terms = resolveSaleTerms({
        saleMode: SaleMode.quickSale,
        acceptsExchangeProposals: true,
        exchangePreferenceScope: ExchangePreferenceScope.selected,
        exchangeAssetTypes: [assetType],
      });
      expect(() =>
        assertProposalShape(
          ProposalKind.exchange,
          terms,
          [{ componentType: ProposalComponentType.exchangeAsset, assetType, proposedValue: 200 }],
          null,
          null,
        ),
      ).not.toThrow();
      const other = Object.values(ExchangeAssetType).find((a) => a !== assetType)!;
      expect(() =>
        assertProposalShape(
          ProposalKind.exchange,
          terms,
          [{ componentType: ProposalComponentType.exchangeAsset, assetType: other, proposedValue: 200 }],
          null,
          null,
        ),
      ).toThrow();
    });
  it('rejects cash, unspecified quick configurations, empty exchange assets, and inactive stale assets', () => {
    for (const input of [
      { acceptsCashProposals: true, acceptsInstallmentProposals: true },
      {},
      { acceptsExchangeProposals: true, exchangePreferenceScope: ExchangePreferenceScope.selected },
      { acceptsInstallmentProposals: true, exchangeAssetTypes: [ExchangeAssetType.car] },
    ])
      expect(() => resolveSaleTerms({ saleMode: SaleMode.quickSale, ...input })).toThrow();
  });
  it('retains legacy cash+exchange mixed eligibility without using the new-write resolver', () => {
    const legacy = {
      saleMode: SaleMode.quickSale,
      acceptsCashProposals: true,
      acceptsInstallmentProposals: true,
      acceptsExchangeProposals: true,
      exchangePreferenceScope: ExchangePreferenceScope.any,
      exchangeAssetTypes: [],
    };
    expect(() =>
      assertProposalShape(
        ProposalKind.mixed,
        legacy,
        [
          { componentType: ProposalComponentType.cash, proposedValue: 1 },
          { componentType: ProposalComponentType.exchangeAsset, assetType: ExchangeAssetType.car, proposedValue: 1 },
        ],
        null,
        null,
      ),
    ).not.toThrow();
    expect(() =>
      assertProposalShape(ProposalKind.coPurchase, legacy, [], shareDecimal(25, 'share'), null),
    ).not.toThrow();
  });
  it('accepts approved comma groups and rejects forged or empty filters', async () => {
    const value = plainToInstance(MarketplaceQueryDto, {
      saleMethods: 'installment,exchange',
      exchangeAssetTypes: 'factory,car',
    });
    expect(await validate(value)).toHaveLength(0);
    expect(value.saleMethods).toEqual(['installment', 'exchange']);
    for (const input of [
      { saleMethods: 'cash' },
      { exchangeAssetTypes: 'land' },
      { saleMethods: '' },
      { saleMethods: 'exchange,exchange' },
    ])
      expect((await validate(plainToInstance(MarketplaceQueryDto, input))).length).toBeGreaterThan(0);
  });
  it('uses AND groups, OR methods, exact assets, and published/public sale constraints', () => {
    const where = JSON.stringify(
      buildMarketplaceWhere({
        saleMethods: ['installment', 'exchange'],
        exchangeAssetTypes: ['factory', 'car'],
        q: 'farm',
        governorate: 'Giza',
      }),
    );
    for (const key of [
      'AND',
      'OR',
      'acceptsInstallmentProposals',
      'acceptsExchangeProposals',
      'factory',
      'car',
      'published',
      'public',
      'Giza',
    ])
      expect(where).toContain(key);
    const assetsOnly = JSON.stringify(buildMarketplaceWhere({ exchangeAssetTypes: ['villa'] }));
    expect(assetsOnly).toContain('acceptsExchangeProposals');
    expect(assetsOnly).toContain('villa');
    expect(assetsOnly).not.toContain('acceptsInstallmentProposals');
  });
  it('only projects approved eligibility and preserves unknown legacy terms as null', () => {
    const row: PublicListingSource = {
      id: 1n,
      publishedAt: null,
      farm: { id: 1n, name: 'Farm', governorate: 'Giza', areaName: null, areaFeddan: 1 },
      listingDetail: {
        slug: 'farm-sale',
        listingType: 'sale',
        askingPrice: 100,
        annualRentPerFeddan: null,
        statedSalePricePerFeddan: null,
        currency: 'EGP',
        availability: null,
        listingDescription: null,
        highlights: [],
      },
    };
    expect(toPublicListing(row)?.saleEligibility).toBeNull();
    row.listingDetail!.saleTerms = {
      saleMode: 'quickSale',
      acceptsCashProposals: false,
      acceptsInstallmentProposals: false,
      acceptsExchangeProposals: true,
      exchangePreferenceScope: 'selected',
      exchangePreferences: [{ assetType: 'car' }],
    };
    const result = toPublicListing(row);
    expect(result?.saleEligibility?.exchangeAssetTypes).toEqual(['car']);
    expect(JSON.stringify(result)).not.toMatch(/privatePin|accessDetails|documents|mobile|createdBy/);
  });
});
