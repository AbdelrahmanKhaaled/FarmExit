import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  FarmRelationshipRole,
  FarmRelationshipStatus,
  ListingType,
  RequestType,
  RequestVisibility,
} from '../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';
import { LISTING_CHANGES_REQUESTED, LISTING_DRAFT, LISTING_PUBLISHED } from '../listing-requests/listing-requests.service';
import type { SaleTermsResponseDto, UpsertSaleTermsDto } from './dto/offers.dto';
import { resolveSaleTerms, type ResolvedSaleTerms } from './offer-values';

const notFound = (): NotFoundException => new NotFoundException('Listing request not found');
const EDITABLE = new Set([LISTING_DRAFT, LISTING_CHANGES_REQUESTED]);

export const DEFAULT_SALE_TERMS: ResolvedSaleTerms = resolveSaleTerms({ saleMode: 'standardCash' });

@Injectable()
export class SaleTermsService {
  constructor(private readonly prisma: PrismaService) {}

  async getForOwner(userId: bigint, listingId: bigint): Promise<SaleTermsResponseDto> {
    const listing = await this.ownedSale(userId, listingId);
    const stored = await this.read(listing.id);
    if (!stored) throw new NotFoundException('Sale terms have not been set');
    return present(stored, true);
  }

  async putForOwner(userId: bigint, listingId: bigint, dto: UpsertSaleTermsDto): Promise<SaleTermsResponseDto> {
    const listing = await this.ownedSale(userId, listingId);
    if (!EDITABLE.has(listing.status)) {
      throw new ConflictException('Sale terms can change only while the listing is a draft or changes were requested');
    }
    const resolved = resolveSaleTerms(dto);
    await this.prisma.$transaction(async (tx) => {
      await tx.farmSaleTerms.upsert({
        where: { listingRequestId: listing.id },
        create: {
          listingRequestId: listing.id,
          saleMode: resolved.saleMode,
          acceptsCashProposals: resolved.acceptsCashProposals,
          acceptsInstallmentProposals: resolved.acceptsInstallmentProposals,
          acceptsExchangeProposals: resolved.acceptsExchangeProposals,
          exchangePreferenceScope: resolved.exchangePreferenceScope,
        },
        update: {
          saleMode: resolved.saleMode,
          acceptsCashProposals: resolved.acceptsCashProposals,
          acceptsInstallmentProposals: resolved.acceptsInstallmentProposals,
          acceptsExchangeProposals: resolved.acceptsExchangeProposals,
          exchangePreferenceScope: resolved.exchangePreferenceScope,
        },
      });
      await tx.farmExchangePreference.deleteMany({ where: { listingRequestId: listing.id } });
      for (const assetType of resolved.exchangeAssetTypes) {
        await tx.farmExchangePreference.create({ data: { listingRequestId: listing.id, assetType } });
      }
      await tx.auditLog.create({
        data: {
          actorUserId: userId,
          entityType: 'farm_sale_terms',
          entityId: listing.id,
          action: 'sale_terms_saved',
          changes: {
            saleMode: resolved.saleMode,
            acceptsInstallmentProposals: resolved.acceptsInstallmentProposals,
            acceptsExchangeProposals: resolved.acceptsExchangeProposals,
            exchangePreferenceScope: resolved.exchangePreferenceScope,
            exchangeAssetTypes: resolved.exchangeAssetTypes,
          },
        },
      });
    });
    return present(resolved, true);
  }

  /** Published sale only. Missing stored terms use the schema defaults and are not written. */
  async getPublished(slug: string): Promise<SaleTermsResponseDto> {
    const detail = await this.prisma.farmListingDetail.findUnique({ where: { slug }, select: { requestId: true, listingType: true } });
    if (!detail || detail.listingType !== ListingType.sale) throw notFound();
    const request = await this.prisma.request.findFirst({
      where: {
        id: detail.requestId,
        requestType: RequestType.farmListing,
        status: LISTING_PUBLISHED,
        visibility: RequestVisibility.public,
        farm: { is: { deletedAt: null } },
      },
      select: { id: true },
    });
    if (!request) throw notFound();
    const stored = await this.read(request.id);
    return present(stored ?? DEFAULT_SALE_TERMS, stored !== null);
  }

  async effective(listingId: bigint): Promise<ResolvedSaleTerms> {
    return (await this.read(listingId)) ?? DEFAULT_SALE_TERMS;
  }

  private async read(listingId: bigint): Promise<ResolvedSaleTerms | null> {
    const terms = await this.prisma.farmSaleTerms.findUnique({ where: { listingRequestId: listingId } });
    if (!terms) return null;
    const assets = await this.prisma.farmExchangePreference.findMany({
      where: { listingRequestId: listingId },
      select: { assetType: true },
    });
    return {
      saleMode: terms.saleMode,
      acceptsCashProposals: terms.acceptsCashProposals,
      acceptsInstallmentProposals: terms.acceptsInstallmentProposals,
      acceptsExchangeProposals: terms.acceptsExchangeProposals,
      exchangePreferenceScope: terms.exchangePreferenceScope,
      exchangeAssetTypes: assets.map((row) => row.assetType),
    };
  }

  private async ownedSale(userId: bigint, listingId: bigint): Promise<{ id: bigint; status: string }> {
    const request = await this.prisma.request.findFirst({
      where: { id: listingId, requestType: RequestType.farmListing, createdBy: userId },
      select: { id: true, status: true, farmId: true },
    });
    if (!request?.farmId) throw notFound();
    const detail = await this.prisma.farmListingDetail.findUnique({
      where: { requestId: request.id },
      select: { listingType: true },
    });
    if (!detail || detail.listingType !== ListingType.sale) {
      throw new ConflictException('Sale terms apply only to a sale listing');
    }
    if (!(await isActiveOwner(this.prisma, userId, request.farmId))) throw notFound();
    return request;
  }
}

export async function isActiveOwner(prisma: PrismaService, userId: bigint, farmId: bigint): Promise<boolean> {
  const now = new Date();
  const rows = await prisma.farmRelationship.findMany({
    where: {
      userId,
      farmId,
      relationshipRole: FarmRelationshipRole.owner,
      relationshipStatus: FarmRelationshipStatus.active,
    },
  });
  return rows.some(
    (row) =>
      (row.startsAt === null || row.startsAt.getTime() <= now.getTime()) &&
      (row.endsAt === null || row.endsAt.getTime() > now.getTime()),
  );
}

function present(terms: ResolvedSaleTerms, configured: boolean): SaleTermsResponseDto {
  return { ...terms, configured };
}
