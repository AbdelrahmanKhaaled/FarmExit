import { BadRequestException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import {
  ExchangeAssetType,
  ExchangePreferenceScope,
  ProposalComponentType,
  ProposalKind,
  SaleMode,
} from '../../generated/prisma/enums';
import { MAX_LISTING_POUNDS } from '../listing-requests/listing-prices';

const bad = (message: string): BadRequestException => new BadRequestException(message);

/** Whole Egyptian pounds, stored as Decimal. No binary floating-point money. */
export function poundsDecimal(value: number, field: string): Prisma.Decimal {
  if (!Number.isInteger(value) || value < 1 || value > MAX_LISTING_POUNDS) {
    throw bad(`${field} must be a whole number of Egyptian pounds`);
  }
  return new Prisma.Decimal(value);
}

/** Share of a listing: greater than 0 and at most 100, with at most two decimal places. */
export function shareDecimal(value: number, field: string): Prisma.Decimal {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw bad(`${field} must be a percentage`);
  const scaled = Math.round(value * 100);
  if (Math.abs(value * 100 - scaled) > 1e-6 || scaled < 1 || scaled > 10_000) {
    throw bad(`${field} must be greater than 0 and at most 100, with at most two decimal places`);
  }
  return new Prisma.Decimal(scaled).dividedBy(100);
}

export function decimalEquals(left: Prisma.Decimal, right: Prisma.Decimal): boolean {
  return left.equals(right);
}

export function sumDecimals(values: Prisma.Decimal[]): Prisma.Decimal {
  return values.reduce((total, value) => total.plus(value), new Prisma.Decimal(0));
}

export type SaleTermsInput = {
  saleMode: SaleMode;
  acceptsCashProposals?: boolean;
  acceptsInstallmentProposals?: boolean;
  acceptsExchangeProposals?: boolean;
  exchangePreferenceScope?: ExchangePreferenceScope;
  exchangeAssetTypes?: ExchangeAssetType[];
};

export type ResolvedSaleTerms = {
  saleMode: SaleMode;
  acceptsCashProposals: boolean;
  acceptsInstallmentProposals: boolean;
  acceptsExchangeProposals: boolean;
  exchangePreferenceScope: ExchangePreferenceScope;
  exchangeAssetTypes: ExchangeAssetType[];
};

/**
 * standard_cash is cash offers only. new quick_sale terms explicitly select installments and/or exchange without cash.
 * Those booleans are eligibility to propose, not acceptance of an offer.
 */
export function resolveSaleTerms(input: SaleTermsInput): ResolvedSaleTerms {
  const assets = input.exchangeAssetTypes ?? [];
  if (new Set(assets).size !== assets.length) throw bad('Each exchange asset type can be selected once');
  const scope = input.exchangePreferenceScope ?? ExchangePreferenceScope.any;
  if (input.saleMode === SaleMode.quickSale) {
    if (input.acceptsCashProposals === true) throw bad('New quick sale terms do not accept cash');
    const installment = input.acceptsInstallmentProposals === true;
    const exchange = input.acceptsExchangeProposals === true;
    if (!installment && !exchange) throw bad('Select installments, exchange, or both');
    if (exchange && (scope !== ExchangePreferenceScope.selected || assets.length === 0))
      throw bad('Select at least one accepted exchange asset type');
    if (!exchange && assets.length > 0) throw bad('Installments-only terms cannot contain active exchange assets');
    return {
      saleMode: SaleMode.quickSale,
      acceptsCashProposals: false,
      acceptsInstallmentProposals: installment,
      acceptsExchangeProposals: exchange,
      exchangePreferenceScope: exchange ? ExchangePreferenceScope.selected : ExchangePreferenceScope.any,
      exchangeAssetTypes: exchange ? assets : [],
    };
  }

  if (
    input.acceptsCashProposals === false ||
    input.acceptsInstallmentProposals === true ||
    input.acceptsExchangeProposals === true ||
    assets.length > 0 ||
    scope === ExchangePreferenceScope.selected
  ) {
    throw bad('A standard cash sale accepts cash proposals only');
  }
  return {
    saleMode: SaleMode.standardCash,
    acceptsCashProposals: true,
    acceptsInstallmentProposals: false,
    acceptsExchangeProposals: false,
    exchangePreferenceScope: ExchangePreferenceScope.any,
    exchangeAssetTypes: [],
  };
}

export type ProposalComponentInput = {
  componentType: ProposalComponentType;
  proposedValue: number;
  assetType?: ExchangeAssetType;
  assetDescription?: string;
  installmentCount?: number;
  installmentInterval?: string;
  componentNotes?: string;
};

export function assertProposalShape(
  kind: ProposalKind,
  terms: ResolvedSaleTerms,
  components: ProposalComponentInput[],
  share: Prisma.Decimal | null,
  declaredTotal: Prisma.Decimal | null,
): void {
  if (kind === ProposalKind.coPurchase) {
    if (!terms.acceptsCashProposals) throw bad('Co-purchase requires cash eligibility');
    if (!share) throw bad('A co-purchase interest needs a share percent');
  } else if (share) {
    throw bad('Only a co-purchase interest has a share percent');
  }
  const cash = components.filter((row) => row.componentType === ProposalComponentType.cash);
  const installments = components.filter((row) => row.componentType === ProposalComponentType.installments);
  const assets = components.filter((row) => row.componentType === ProposalComponentType.exchangeAsset);
  if (cash.length > 1 || installments.length > 1)
    throw bad('A proposal has at most one cash part and one installment part');
  if (kind === ProposalKind.cash && (cash.length !== 1 || installments.length > 0 || assets.length > 0)) {
    throw bad('A cash proposal has one cash part');
  }
  if (kind === ProposalKind.installment && (installments.length !== 1 || cash.length > 0 || assets.length > 0)) {
    throw bad('An installment proposal has one installment part');
  }
  if (kind === ProposalKind.exchange && (assets.length < 1 || cash.length > 0 || installments.length > 0)) {
    throw bad('An exchange proposal lists one or more assets and no cash');
  }
  if (kind === ProposalKind.mixed && (cash.length !== 1 || assets.length < 1 || installments.length > 0)) {
    throw bad('A mixed proposal has cash and at least one exchange asset');
  }
  if (kind === ProposalKind.coPurchase && (installments.length > 0 || assets.length > 0 || cash.length > 1)) {
    throw bad('A co-purchase interest has a share and, optionally, one cash part');
  }
  if ((cash.length > 0 || kind === ProposalKind.cash) && !terms.acceptsCashProposals) {
    throw bad('This listing is not open to cash proposals');
  }
  if (installments.length > 0 && !terms.acceptsInstallmentProposals) {
    throw bad('This listing is not open to installment proposals');
  }
  if (assets.length > 0 && !terms.acceptsExchangeProposals) {
    throw bad('This listing is not open to exchange proposals');
  }
  const assetTypes: ExchangeAssetType[] = [];
  for (const asset of assets) {
    if (!asset.assetType) throw bad('An exchange asset needs an asset type');
    assetTypes.push(asset.assetType);
    if (
      terms.exchangePreferenceScope === ExchangePreferenceScope.selected &&
      !terms.exchangeAssetTypes.includes(asset.assetType)
    ) {
      throw bad('This listing is not open to that exchange asset type');
    }
  }
  if (new Set(assetTypes).size !== assetTypes.length)
    throw bad('Each exchange asset type can appear once in a proposal');
  for (const part of installments) {
    if (part.installmentCount === undefined || !Number.isInteger(part.installmentCount) || part.installmentCount < 1) {
      throw bad('An installment part needs a count of at least 1');
    }
  }
  if (declaredTotal) {
    const parts = components.map((row) => poundsDecimal(row.proposedValue, 'proposedValue'));
    if (parts.length > 0 && !decimalEquals(sumDecimals(parts), declaredTotal)) {
      throw bad('The proposed total must equal the sum of its parts');
    }
  }
}
