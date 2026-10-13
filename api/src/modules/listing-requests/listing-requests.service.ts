import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { Prisma, type Farm, type FarmListingDetail, type Request, type RequestReview } from '../../generated/prisma/client';
import {
  FarmRelationshipRole,
  RequestType,
  RequestVisibility,
  type ListingType as ListingTypeValue,
} from '../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';
import { forbidden } from '../authorization/authorization.errors';
import { FarmAccessService } from '../authorization/farm-access.service';
import { DEFAULT_PAGE_SIZE, type ListFarmsQueryDto } from '../farms/dto/list-farms-query.dto';
import type {
  CreateListingRequestDto,
  ListingRequestListResponseDto,
  ListingRequestResponseDto,
  ListingReviewFeedbackDto,
  UpdateListingRequestDto,
} from './dto/listing-request.dto';
import { assertListingPrices, moneyOut, pounds, type ListingPrices } from './listing-prices';

/** Confirmed owner listing statuses used here. Submit and resubmit enter review and do not publish. */
export const LISTING_DRAFT = 'draft';
export const LISTING_UNDER_REVIEW = 'underFarmExitReview';
export const LISTING_CHANGES_REQUESTED = 'changesRequested';
export const LISTING_APPROVED = 'approved';
export const LISTING_REJECTED = 'rejected';
export const LISTING_PUBLISHED = 'published';
const OWNER_EDITABLE = new Set([LISTING_DRAFT, LISTING_CHANGES_REQUESTED]);

const notFound = (): NotFoundException => new NotFoundException('Listing request not found');
const EDITABLE = [
  'listingType',
  'askingPrice',
  'annualRentPerFeddan',
  'statedSalePricePerFeddan',
  'availability',
  'listingDescription',
  'highlights',
] as const;

/**
 * Private sale/rent listing requests. Creating one does not publish a listing, verify ownership, or open a
 * negotiation: FarmExit staff handle that later. Only an active owner of the farm may create or change one,
 * and only while it is still a draft. Each request is visible only to the user who created it.
 */
@Injectable()
export class ListingRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly farmAccess: FarmAccessService,
  ) {}

  async create(userId: bigint, farmId: bigint, dto: CreateListingRequestDto): Promise<ListingRequestResponseDto> {
    const farm = await this.ownedFarm(userId, farmId);
    const prices = assertListingPrices(dto.listingType, {
      askingPrice: dto.askingPrice ?? null,
      annualRentPerFeddan: dto.annualRentPerFeddan ?? null,
      statedSalePricePerFeddan: dto.statedSalePricePerFeddan ?? null,
    });
    const highlights = dto.highlights ?? [];
    const created = await this.insert(userId, farm, dto, prices, highlights);
    return toResponse(created.request, created.detail, farm, []);
  }

  async listMine(userId: bigint, query: ListFarmsQueryDto): Promise<ListingRequestListResponseDto> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
    const farmIds = await this.ownedFarmIds(userId);
    if (farmIds.length === 0) return { items: [], page, pageSize, total: 0 };

    const where: Prisma.RequestWhereInput = {
      createdBy: userId,
      requestType: RequestType.farmListing,
      farmId: { in: farmIds },
    };
    const [total, rows] = await Promise.all([
      this.prisma.request.count({ where }),
      this.prisma.request.findMany({ where, orderBy: { id: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
    ]);
    const details = await this.prisma.farmListingDetail.findMany({
      where: { requestId: { in: rows.map((row) => row.id) } },
    });
    const farms = await this.prisma.farm.findMany({
      where: { id: { in: rows.map((row) => row.farmId).filter((id): id is bigint => id !== null) }, deletedAt: null },
    });
    const detailByRequest = new Map(details.map((detail) => [detail.requestId, detail]));
    const farmById = new Map(farms.map((farm) => [farm.id, farm]));
    const reviews = await this.ownerReviews(rows.map((row) => row.id));
    const items = rows.flatMap((row) => {
      const detail = detailByRequest.get(row.id);
      const farm = row.farmId === null ? undefined : farmById.get(row.farmId);
      return detail && farm ? [toResponse(row, detail, farm, reviews.get(row.id) ?? [])] : [];
    });
    return { items, page, pageSize, total };
  }

  async get(userId: bigint, requestId: bigint): Promise<ListingRequestResponseDto> {
    const { request, detail, farm } = await this.ownedDraftOrAny(userId, requestId);
    return this.respond(request, detail, farm);
  }

  async update(userId: bigint, requestId: bigint, dto: UpdateListingRequestDto): Promise<ListingRequestResponseDto> {
    if (!EDITABLE.some((key) => dto[key] !== undefined)) throw new BadRequestException('Nothing to update');
    const { request, detail, farm } = await this.ownedDraftOrAny(userId, requestId);
    if (!OWNER_EDITABLE.has(request.status)) {
      throw new ConflictException('Only a draft or a listing with requested changes can be updated');
    }

    const listingType = dto.listingType ?? detail.listingType;
    const typeChanged = listingType !== detail.listingType;
    const prices = assertListingPrices(listingType, {
      askingPrice: dto.askingPrice !== undefined ? dto.askingPrice : typeChanged ? null : moneyOut(detail.askingPrice),
      annualRentPerFeddan:
        dto.annualRentPerFeddan !== undefined
          ? dto.annualRentPerFeddan
          : typeChanged
            ? null
            : moneyOut(detail.annualRentPerFeddan),
      statedSalePricePerFeddan:
        dto.statedSalePricePerFeddan !== undefined
          ? dto.statedSalePricePerFeddan
          : typeChanged
            ? null
            : moneyOut(detail.statedSalePricePerFeddan),
    });

    const data: Prisma.FarmListingDetailUpdateInput = {
      listingType,
      askingPrice: pounds(prices.askingPrice),
      annualRentPerFeddan: pounds(prices.annualRentPerFeddan),
      statedSalePricePerFeddan: pounds(prices.statedSalePricePerFeddan),
    };
    if (dto.availability !== undefined) data.availability = dto.availability;
    if (dto.listingDescription !== undefined) data.listingDescription = dto.listingDescription;
    if (dto.highlights !== undefined) data.highlights = dto.highlights;

    await this.prisma.$transaction(async (tx) => {
      const locked = await tx.request.updateMany({
        where: { id: request.id, createdBy: userId, status: request.status, requestType: RequestType.farmListing },
        data: { status: request.status },
      });
      if (locked.count !== 1) throw new ConflictException('Only a draft or a listing with requested changes can be updated');
      await tx.farmListingDetail.update({ where: { requestId: request.id }, data });
    });

    const updated = await this.prisma.farmListingDetail.findUnique({ where: { requestId: request.id } });
    const refreshed = await this.prisma.request.findUnique({ where: { id: request.id } });
    if (!updated || !refreshed) throw notFound();
    return this.respond(refreshed, updated, farm);
  }

  /**
   * Submits a private draft, or resubmits after FarmExit requested changes. Both move to underFarmExitReview.
   * Visibility stays private and publishedAt stays null. Another submit of the same state returns 409.
   */
  async submit(userId: bigint, requestId: bigint): Promise<ListingRequestResponseDto> {
    const { request, detail, farm } = await this.ownedDraftOrAny(userId, requestId);
    if (!OWNER_EDITABLE.has(request.status)) {
      throw new ConflictException('This listing request was already submitted');
    }
    const area = Number(farm.areaFeddan.toString());
    if (!Number.isFinite(area) || area <= 0) {
      throw new BadRequestException('The farm needs an area in feddan before a listing request');
    }
    assertListingPrices(detail.listingType, {
      askingPrice: moneyOut(detail.askingPrice),
      annualRentPerFeddan: moneyOut(detail.annualRentPerFeddan),
      statedSalePricePerFeddan: moneyOut(detail.statedSalePricePerFeddan),
    });

    const submittedAt = new Date();
    await this.prisma.$transaction(async (tx) => {
      const locked = await tx.request.updateMany({
        where: {
          id: request.id,
          createdBy: userId,
          requestType: RequestType.farmListing,
          status: request.status,
        },
        data: { status: LISTING_UNDER_REVIEW, submittedAt, visibility: RequestVisibility.private },
      });
      if (locked.count !== 1) throw new ConflictException('This listing request was already submitted');
      await tx.requestStatusHistory.create({
        data: {
          requestId: request.id,
          fromStatus: request.status,
          toStatus: LISTING_UNDER_REVIEW,
          changedBy: userId,
        },
      });
    });

    const refreshed = await this.prisma.request.findUnique({ where: { id: request.id } });
    if (!refreshed) throw notFound();
    return this.respond(refreshed, detail, farm);
  }

  private async respond(
    request: Request,
    detail: FarmListingDetail,
    farm: Farm,
  ): Promise<ListingRequestResponseDto> {
    const reviews = await this.ownerReviews([request.id]);
    return toResponse(request, detail, farm, reviews.get(request.id) ?? []);
  }

  /** Review comments the owner may see. Reviewer identity is not loaded. */
  private async ownerReviews(ids: bigint[]): Promise<Map<bigint, ListingReviewFeedbackDto[]>> {
    const grouped = new Map<bigint, ListingReviewFeedbackDto[]>();
    if (ids.length === 0) return grouped;
    const rows = await this.prisma.requestReview.findMany({
      where: { requestId: { in: ids } },
      orderBy: { id: 'asc' },
      select: { requestId: true, decision: true, comment: true, createdAt: true },
    });
    for (const row of rows) {
      const list = grouped.get(row.requestId) ?? [];
      list.push(toOwnerReview(row));
      grouped.set(row.requestId, list);
    }
    return grouped;
  }

  /** Active owner of a live farm with a positive area. No role is 404; any other farm role is 403. */
  private async ownedFarm(userId: bigint, farmId: bigint): Promise<Farm> {
    const [farm, roles] = await Promise.all([
      this.prisma.farm.findFirst({ where: { id: farmId, deletedAt: null } }),
      this.farmAccess.activeRoles(userId, farmId),
    ]);
    if (!farm || roles.length === 0) throw new NotFoundException('Farm not found');
    if (!roles.includes(FarmRelationshipRole.owner)) throw forbidden();
    const area = Number(farm.areaFeddan.toString());
    if (!Number.isFinite(area) || area <= 0) {
      throw new BadRequestException('The farm needs an area in feddan before a listing request');
    }
    return farm;
  }

  private async ownedFarmIds(userId: bigint): Promise<bigint[]> {
    const rolesByFarm = await this.farmAccess.activeRolesByFarm(userId);
    const owned = [...rolesByFarm.entries()]
      .filter(([, roles]) => roles.includes(FarmRelationshipRole.owner))
      .map(([id]) => id);
    if (owned.length === 0) return [];
    const farms = await this.prisma.farm.findMany({
      where: { id: { in: owned }, deletedAt: null },
      select: { id: true },
    });
    return farms.map((farm) => farm.id);
  }

  private async ownedDraftOrAny(
    userId: bigint,
    requestId: bigint,
  ): Promise<{ request: Request; detail: FarmListingDetail; farm: Farm }> {
    const request = await this.prisma.request.findFirst({
      where: { id: requestId, createdBy: userId, requestType: RequestType.farmListing },
    });
    if (!request?.farmId) throw notFound();
    const farm = await this.prisma.farm.findFirst({ where: { id: request.farmId, deletedAt: null } });
    const roles = await this.farmAccess.activeRoles(userId, request.farmId);
    if (!farm || roles.length === 0) throw notFound();
    if (!roles.includes(FarmRelationshipRole.owner)) throw forbidden();
    const detail = await this.prisma.farmListingDetail.findUnique({ where: { requestId: request.id } });
    if (!detail) throw notFound();
    return { request, detail, farm };
  }

  private async insert(
    userId: bigint,
    farm: Farm,
    dto: CreateListingRequestDto,
    prices: ListingPrices,
    highlights: string[],
  ): Promise<{ request: Request; detail: FarmListingDetail }> {
    for (let attempt = 0; attempt < 3; attempt++) {
      const requestNumber = newRequestNumber();
      const slug = newSlug(dto.listingType);
      try {
        return await this.prisma.$transaction(async (tx) => {
          const request = await tx.request.create({
            data: {
              requestNumber,
              requestType: RequestType.farmListing,
              createdBy: userId,
              farmId: farm.id,
              status: LISTING_DRAFT,
              visibility: RequestVisibility.private,
            },
          });
          const detail = await tx.farmListingDetail.create({
            data: {
              requestId: request.id,
              slug,
              listingType: dto.listingType,
              askingPrice: pounds(prices.askingPrice),
              annualRentPerFeddan: pounds(prices.annualRentPerFeddan),
              statedSalePricePerFeddan: pounds(prices.statedSalePricePerFeddan),
              currency: 'EGP',
              availability: dto.availability ?? null,
              listingDescription: dto.listingDescription ?? null,
              highlights,
            },
          });
          await tx.requestStatusHistory.create({
            data: { requestId: request.id, fromStatus: null, toStatus: LISTING_DRAFT, changedBy: userId },
          });
          return { request, detail };
        });
      } catch (error) {
        if (isUniqueConflict(error) && attempt < 2) continue;
        throw error;
      }
    }
    throw new Error('Could not allocate a listing request number');
  }
}

function newRequestNumber(): string {
  return `FL${randomBytes(12).toString('hex')}`.toUpperCase();
}

/** Opaque public slug. It carries the listing type and a random id, not the farm id or any other internal id. */
function newSlug(listingType: ListingTypeValue): string {
  return `${listingType}-${randomBytes(16).toString('hex')}`;
}

function isUniqueConflict(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
}

function highlightsOut(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

function toOwnerReview(row: Pick<RequestReview, 'decision' | 'comment' | 'createdAt'>): ListingReviewFeedbackDto {
  return {
    decision: row.decision,
    comment: row.comment ?? null,
    createdAt: row.createdAt?.toISOString() ?? null,
  };
}

function toResponse(
  request: Request,
  detail: FarmListingDetail,
  farm: Farm,
  reviews: ListingReviewFeedbackDto[],
): ListingRequestResponseDto {
  return {
    id: request.id.toString(),
    requestNumber: request.requestNumber,
    farmId: farm.id.toString(),
    farmName: farm.name,
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
    createdAt: request.createdAt?.toISOString() ?? null,
    updatedAt: request.updatedAt?.toISOString() ?? null,
    reviews,
  };
}
