import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type FarmListingDetail, type Request } from '../../generated/prisma/client';
import {
  FarmRelationshipRole,
  FarmRelationshipStatus,
  ListingType,
  RequestType,
  RequestVisibility,
  StaffRole,
} from '../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';
import { forbidden } from '../authorization/authorization.errors';
import { StaffAuthorizationService, STAFF_STATUS_ACTIVE } from '../authorization/staff-authorization.service';
import { DEFAULT_PAGE_SIZE, type ListFarmsQueryDto } from '../farms/dto/list-farms-query.dto';
import type { PublicationListingDto, PublicationQueueResponseDto } from './dto/listing-publication.dto';
import { moneyOut } from './listing-prices';
import { LISTING_APPROVED, LISTING_PUBLISHED } from './listing-requests.service';

const notFound = (): NotFoundException => new NotFoundException('Listing request not found');

type FarmView = {
  id: bigint;
  name: string;
  governorate: string;
  areaName: string | null;
  areaFeddan: { toString(): string };
};

/**
 * Admin publication of an approved sale or rent listing. Publishing makes the request public and sets publishedAt.
 * It does not verify ownership, score the farm, approve image licences, or open a conversation.
 * One published listing of each type is allowed per farm. The farm row is locked so two listings cannot both win.
 */
@Injectable()
export class ListingPublicationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly staffAuth: StaffAuthorizationService,
  ) {}

  async queue(userId: bigint, query: ListFarmsQueryDto): Promise<PublicationQueueResponseDto> {
    await this.requireAdmin(userId);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
    const liveFarms = await this.prisma.farm.findMany({ where: { deletedAt: null }, select: { id: true } });
    if (liveFarms.length === 0) return { items: [], page, pageSize, total: 0 };
    const where: Prisma.RequestWhereInput = {
      requestType: RequestType.farmListing,
      status: LISTING_APPROVED,
      publishedAt: null,
      farmId: { in: liveFarms.map((farm) => farm.id) },
    };
    const [total, rows] = await Promise.all([
      this.prisma.request.count({ where }),
      this.prisma.request.findMany({
        where,
        orderBy: { id: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return { items: await this.present(rows), page, pageSize, total };
  }

  async publish(userId: bigint, requestId: bigint): Promise<PublicationListingDto> {
    await this.requireAdmin(userId);
    const publishedAt = new Date();
    await this.prisma.$transaction((tx) => this.publishOnce(tx, userId, requestId, publishedAt), {
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
    });
    const request = await this.prisma.request.findFirst({
      where: { id: requestId, requestType: RequestType.farmListing },
    });
    if (!request) throw notFound();
    const [item] = await this.present([request]);
    if (!item) throw notFound();
    return item;
  }

  private async publishOnce(
    tx: Prisma.TransactionClient,
    userId: bigint,
    requestId: bigint,
    publishedAt: Date,
  ): Promise<void> {
    const admin = await tx.staffMembership.findFirst({
      where: { userId, staffRole: StaffRole.admin, status: STAFF_STATUS_ACTIVE },
      select: { id: true },
    });
    if (!admin) throw forbidden();

    const request = await tx.request.findFirst({
      where: { id: requestId, requestType: RequestType.farmListing },
    });
    if (!request?.farmId) throw notFound();
    if (request.status === LISTING_PUBLISHED) {
      throw new ConflictException('This listing is already published');
    }
    if (request.status !== LISTING_APPROVED || request.publishedAt !== null) {
      throw new ConflictException('Only an approved listing can be published');
    }

    const detail = await tx.farmListingDetail.findUnique({ where: { requestId } });
    if (!detail) throw notFound();
    this.requirePrice(detail);

    // updateMany matches only a farm that is still present, and locks that row until commit.
    const locked = await tx.farm.updateMany({
      where: { id: request.farmId, deletedAt: null },
      data: { updatedAt: new Date() },
    });
    if (locked.count !== 1) throw new BadRequestException('The farm is no longer available');
    await this.requireCurrentOwner(tx, request.createdBy, request.farmId);

    const siblings = await tx.request.findMany({
      where: {
        farmId: request.farmId,
        requestType: RequestType.farmListing,
        status: LISTING_PUBLISHED,
        id: { not: requestId },
      },
      select: { id: true },
    });
    if (siblings.length > 0) {
      const clash = await tx.farmListingDetail.findFirst({
        where: { requestId: { in: siblings.map((row) => row.id) }, listingType: detail.listingType },
        select: { requestId: true },
      });
      if (clash) throw new ConflictException('This farm already has a published listing of this type');
    }

    const updated = await tx.request.updateMany({
      where: {
        id: requestId,
        requestType: RequestType.farmListing,
        status: LISTING_APPROVED,
        publishedAt: null,
      },
      data: { status: LISTING_PUBLISHED, visibility: RequestVisibility.public, publishedAt },
    });
    if (updated.count !== 1) throw new ConflictException('Only an approved listing can be published');

    await tx.requestStatusHistory.create({
      data: {
        requestId,
        fromStatus: LISTING_APPROVED,
        toStatus: LISTING_PUBLISHED,
        changedBy: userId,
      },
    });
    await tx.auditLog.create({
      data: {
        actorUserId: userId,
        entityType: 'request',
        entityId: requestId,
        action: 'published',
        changes: {
          requestId: requestId.toString(),
          farmId: request.farmId.toString(),
          listingType: detail.listingType,
          fromStatus: LISTING_APPROVED,
          toStatus: LISTING_PUBLISHED,
          visibility: RequestVisibility.public,
        },
      },
    });
  }

  private requirePrice(detail: FarmListingDetail): void {
    const asking = moneyOut(detail.askingPrice);
    const rent = moneyOut(detail.annualRentPerFeddan);
    if (detail.listingType === ListingType.sale && (asking === null || asking < 1)) {
      throw new BadRequestException('A sale listing needs a positive asking price before it can be published');
    }
    if (detail.listingType === ListingType.rent && (rent === null || rent < 1)) {
      throw new BadRequestException('A rent listing needs a positive annual rent per feddan before it can be published');
    }
  }

  private async requireCurrentOwner(tx: Prisma.TransactionClient, userId: bigint, farmId: bigint): Promise<void> {
    const now = new Date();
    const rows = await tx.farmRelationship.findMany({
      where: {
        userId,
        farmId,
        relationshipRole: FarmRelationshipRole.owner,
        relationshipStatus: FarmRelationshipStatus.active,
      },
    });
    const current = rows.some(
      (row) =>
        (row.startsAt === null || row.startsAt.getTime() <= now.getTime()) &&
        (row.endsAt === null || row.endsAt.getTime() > now.getTime()),
    );
    if (!current) throw new BadRequestException('The listing owner is no longer an active owner of this farm');
  }

  private async requireAdmin(userId: bigint): Promise<void> {
    const staff = await this.staffAuth.loadContext(userId);
    if (!staff?.roles.includes(StaffRole.admin)) throw forbidden();
  }

  private async present(rows: Request[]): Promise<PublicationListingDto[]> {
    if (rows.length === 0) return [];
    const requestIds = rows.map((row) => row.id);
    const farmIds = rows.map((row) => row.farmId).filter((id): id is bigint => id !== null);
    const [details, farms] = await Promise.all([
      this.prisma.farmListingDetail.findMany({ where: { requestId: { in: requestIds } } }),
        this.prisma.farm.findMany({
          where: { id: { in: farmIds }, deletedAt: null },
          select: { id: true, name: true, governorate: true, areaName: true, areaFeddan: true },
        }),
    ]);
    const detailByRequest = new Map(details.map((detail) => [detail.requestId, detail]));
    const farmById = new Map(farms.map((farm) => [farm.id, farm]));
    const items: PublicationListingDto[] = [];
    for (const request of rows) {
      const detail = detailByRequest.get(request.id);
      const farm = request.farmId === null ? undefined : farmById.get(request.farmId);
      if (!detail || !farm) continue;
      items.push(toPublication(request, detail, farm));
    }
    return items;
  }
}

function highlightsOut(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

function toPublication(request: Request, detail: FarmListingDetail, farm: FarmView): PublicationListingDto {
  return {
    id: request.id.toString(),
    requestNumber: request.requestNumber,
    farmId: farm.id.toString(),
    farmName: farm.name,
    governorate: farm.governorate,
    areaName: farm.areaName,
    areaFeddan: Number(farm.areaFeddan.toString()),
    listingType: detail.listingType,
    status: request.status,
    visibility: request.visibility,
    askingPrice: moneyOut(detail.askingPrice),
    annualRentPerFeddan: moneyOut(detail.annualRentPerFeddan),
    statedSalePricePerFeddan: moneyOut(detail.statedSalePricePerFeddan),
    currency: detail.currency,
    availability: detail.availability ?? null,
    listingDescription: detail.listingDescription ?? null,
    highlights: highlightsOut(detail.highlights),
    slug: detail.slug,
    publishedAt: request.publishedAt?.toISOString() ?? null,
  };
}
