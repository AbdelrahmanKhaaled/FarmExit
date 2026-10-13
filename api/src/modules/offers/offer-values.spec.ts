import { BadRequestException } from '@nestjs/common';
import {
  ExchangeAssetType,
  ExchangePreferenceScope,
  ProposalComponentType,
  ProposalKind,
  SaleMode,
} from '../../generated/prisma/enums';
import { poundsDecimal, resolveSaleTerms, shareDecimal, assertProposalShape } from './offer-values';

describe('sale terms and proposal values', () => {
  it('keeps standard cash to cash, and quick sale open to installment and exchange', () => {
    expect(resolveSaleTerms({ saleMode: SaleMode.standardCash })).toMatchObject({
      acceptsCashProposals: true,
      acceptsInstallmentProposals: false,
      acceptsExchangeProposals: false,
    });
    expect(() => resolveSaleTerms({ saleMode: SaleMode.standardCash, acceptsInstallmentProposals: true })).toThrow(
      BadRequestException,
    );
    expect(
      resolveSaleTerms({
        saleMode: SaleMode.quickSale,
        exchangePreferenceScope: ExchangePreferenceScope.selected,
        exchangeAssetTypes: [ExchangeAssetType.car, ExchangeAssetType.villa],
      }),
    ).toMatchObject({
      acceptsInstallmentProposals: true,
      acceptsExchangeProposals: true,
      exchangeAssetTypes: [ExchangeAssetType.car, ExchangeAssetType.villa],
    });
    expect(() =>
      resolveSaleTerms({ saleMode: SaleMode.quickSale, exchangePreferenceScope: ExchangePreferenceScope.selected }),
    ).toThrow(BadRequestException);
  });

  it('rejects a mixed total that is not the Decimal sum of its parts', () => {
    const terms = resolveSaleTerms({
      saleMode: SaleMode.quickSale,
      exchangePreferenceScope: ExchangePreferenceScope.any,
    });
    expect(() =>
      assertProposalShape(
        ProposalKind.mixed,
        terms,
        [
          { componentType: ProposalComponentType.cash, proposedValue: 5_000_000 },
          { componentType: ProposalComponentType.exchangeAsset, proposedValue: 5_000_000, assetType: ExchangeAssetType.car },
        ],
        null,
        poundsDecimal(9_000_000, 'proposedTotalValue'),
      ),
    ).toThrow(BadRequestException);
    expect(() =>
      assertProposalShape(
        ProposalKind.mixed,
        terms,
        [
          { componentType: ProposalComponentType.cash, proposedValue: 5_000_000 },
          { componentType: ProposalComponentType.exchangeAsset, proposedValue: 5_000_000, assetType: ExchangeAssetType.car },
        ],
        null,
        poundsDecimal(10_000_000, 'proposedTotalValue'),
      ),
    ).not.toThrow();
  });

  it('requires a co-purchase share inside 0 and 100, and not on a cash proposal', () => {
    expect(shareDecimal(40, 'requestedSharePercent').toFixed(2)).toBe('40.00');
    expect(shareDecimal(0.5, 'requestedSharePercent').toFixed(2)).toBe('0.50');
    expect(() => shareDecimal(0, 'requestedSharePercent')).toThrow(BadRequestException);
    expect(() => shareDecimal(100.01, 'requestedSharePercent')).toThrow(BadRequestException);
    const cashOnly = resolveSaleTerms({ saleMode: SaleMode.standardCash });
    expect(() =>
      assertProposalShape(ProposalKind.installment, cashOnly, [{ componentType: ProposalComponentType.installments, proposedValue: 1000, installmentCount: 2 }], null, null),
    ).toThrow(BadRequestException);
    expect(() =>
      assertProposalShape(ProposalKind.coPurchase, cashOnly, [], shareDecimal(25, 'requestedSharePercent'), null),
    ).not.toThrow();
  });
});
