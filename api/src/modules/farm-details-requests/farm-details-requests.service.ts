import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type Request } from '../../generated/prisma/client';
import { FarmRelationshipRole, RequestType, RequestVisibility } from '../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';
import { FarmAccessService } from '../authorization/farm-access.service';
import { DEFAULT_PAGE_SIZE, type ListFarmsQueryDto } from '../farms/dto/list-farms-query.dto';
import { LISTING_PUBLISHED } from '../listing-requests/listing-requests.service';
import { newRequestNumber } from '../requests/request-number';
import {
  ACTIVE_FARM_DETAILS_REQUEST_STATUSES,
  REQUEST_STATUS_DRAFT,
  REQUEST_STATUS_UNDER_REVIEW,
  REQUEST_STATUS_WITHDRAWN,
} from '../requests/request-workflow.policy';
import type {
  CreateFarmDetailsRequestDto,
  FarmDetailsRequestListResponseDto,
  FarmDetailsRequestResponseDto,
} from './dto/farm-details-request.dto';
import type { FarmManagementReviewFeedbackDto } from '../farm-management-requests/dto/farm-management-request.dto';

const notFound = (): NotFoundException => new NotFoundException('Farm details request not found');

type PublishedListing = { id: bigint; farmId: bigint; createdBy: bigint; slug: string; listingType: string };

@Injectable()
export class FarmDetailsRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly farmAccess: FarmAccessService,
  ) {}

  async create(userId: bigint, dto: CreateFarmDetailsRequestDto): Promise<FarmDetailsRequestResponseDto> {
    const listing = await this.publishedListing(dto.listingSlug);
    if (listing.createdBy === userId || (await this.farmAccess.hasAnyRole(userId, listing.farmId, [FarmRelationshipRole.owner]))) {
      throw new ConflictException('Farm owners cannot request details on their own listing');
    }
    await this.assertNoConflictingActive(userId, listing.id);
    const created = await this.insert(userId, listing);
    return this.present(created.id);
  }

  async listMine(userId: bigint, query: ListFarmsQueryDto): Promise<FarmDetailsRequestListResponseDto> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
    const where: Prisma.RequestWhereInput = { createdBy: userId, requestType: RequestType.farmDetails };
    const [total, rows] = await Promise.all([
      this.prisma.request.count({ where }),
      this.prisma.request.findMany({ where, orderBy: { id: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
    ]);
    const items = await Promise.all(rows.map((row) => this.present(row.id)));
    return { items, page, pageSize, total };
  }

  async get(userId: bigint, requestId: bigint): Promise<FarmDetailsRequestResponseDto> {
    await this.owned(userId, requestId);
    return this.present(requestId);
  }

  async getById(requestId: bigint): Promise<FarmDetailsRequestResponseDto> {
    const request = await this.prisma.request.findFirst({
      where: { id: requestId, requestType: RequestType.farmDetails },
    });
    if (!request?.parentRequestId || !request.farmId) throw notFound();
    return this.present(requestId);
  }

  async submit(userId: bigint, requestId: bigint): Promise<FarmDetailsRequestResponseDto> {
    const request = await this.owned(userId, requestId);
    if (request.status !== REQUEST_STATUS_DRAFT && request.status !== 'changesRequested') {
      throw new ConflictException('This details request was already submitted');
    }
    const parentOk = await this.parentStillPublished(request.parentRequestId!);
    if (!parentOk) throw new ConflictException('This listing is no longer published');

    const submittedAt = new Date();
    await this.prisma.$transaction(async (tx) => {
      const locked = await tx.request.updateMany({
        where: {
          id: requestId,
          createdBy: userId,
          requestType: RequestType.farmDetails,
          status: { in: [REQUEST_STATUS_DRAFT, 'changesRequested'] },
        },
        data: { status: REQUEST_STATUS_UNDER_REVIEW, submittedAt, visibility: RequestVisibility.private },
      });
      if (locked.count !== 1) throw new ConflictException('This details request was already submitted');
      await tx.requestStatusHistory.create({
        data: {
          requestId,
          fromStatus: request.status,
          toStatus: REQUEST_STATUS_UNDER_REVIEW,
          changedBy: userId,
          reason: 'Submitted for FarmExit review',
        },
      });
      await tx.auditLog.create({
        data: {
          actorUserId: userId,
          entityType: 'request',
          entityId: requestId,
          action: 'farm_details_submitted',
          changes: { listingRequestId: request.parentRequestId!.toString() },
        },
      });
    });
    return this.present(requestId);
  }

  async withdraw(userId: bigint, requestId: bigint): Promise<FarmDetailsRequestResponseDto> {
    const request = await this.owned(userId, requestId);
    const withdrawable = new Set([REQUEST_STATUS_DRAFT, REQUEST_STATUS_UNDER_REVIEW, 'changesRequested', 'submitted']);
    if (!withdrawable.has(request.status)) {
      throw new ConflictException(`Details requests in '${request.status}' status cannot be withdrawn`);
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.request.update({
        where: { id: requestId },
        data: { status: REQUEST_STATUS_WITHDRAWN, closedAt: new Date() },
      });
      await tx.requestStatusHistory.create({
        data: {
          requestId,
          fromStatus: request.status,
          toStatus: REQUEST_STATUS_WITHDRAWN,
          changedBy: userId,
          reason: 'Withdrawn by requester',
        },
      });
    });
    return this.present(requestId);
  }

  private async owned(userId: bigint, requestId: bigint): Promise<Request> {
    const request = await this.prisma.request.findFirst({
      where: { id: requestId, createdBy: userId, requestType: RequestType.farmDetails },
    });
    if (!request?.parentRequestId) throw notFound();
    return request;
  }

  private async assertNoConflictingActive(userId: bigint, listingRequestId: bigint): Promise<void> {
    const active = await this.prisma.request.findFirst({
      where: {
        createdBy: userId,
        parentRequestId: listingRequestId,
        requestType: RequestType.farmDetails,
        status: { in: [...ACTIVE_FARM_DETAILS_REQUEST_STATUSES] },
      },
      select: { id: true },
    });
    if (active) {
      throw new ConflictException('You already have an active details request for this listing');
    }
  }

  private async publishedListing(slug: string): Promise<PublishedListing> {
    const detail = await this.prisma.farmListingDetail.findUnique({
      where: { slug },
      select: { requestId: true, slug: true, listingType: true },
    });
    if (!detail) throw new NotFoundException('Listing not found');
    const request = await this.prisma.request.findFirst({
      where: {
        id: detail.requestId,
        requestType: RequestType.farmListing,
        status: LISTING_PUBLISHED,
        visibility: RequestVisibility.public,
        farm: { is: { deletedAt: null } },
      },
      select: { id: true, farmId: true, createdBy: true },
    });
    if (!request?.farmId) throw new NotFoundException('Listing not found');
    return {
      id: request.id,
      farmId: request.farmId,
      createdBy: request.createdBy,
      slug: detail.slug,
      listingType: detail.listingType,
    };
  }

  private async parentStillPublished(listingRequestId: bigint): Promise<boolean> {
    const row = await this.prisma.request.findFirst({
      where: {
        id: listingRequestId,
        requestType: RequestType.farmListing,
        status: LISTING_PUBLISHED,
        visibility: RequestVisibility.public,
      },
      select: { id: true },
    });
    return row !== null;
  }

  private async insert(userId: bigint, listing: PublishedListing): Promise<Request> {
    for (let attempt = 0; attempt < 3; attempt++) {
      const requestNumber = newRequestNumber('FD');
      try {
        return await this.prisma.$transaction(async (tx) => {
          const request = await tx.request.create({
            data: {
              requestNumber,
              requestType: RequestType.farmDetails,
              createdBy: userId,
              farmId: listing.farmId,
              parentRequestId: listing.id,
              status: REQUEST_STATUS_DRAFT,
              visibility: RequestVisibility.private,
            },
          });
          await tx.requestStatusHistory.create({
            data: { requestId: request.id, fromStatus: null, toStatus: REQUEST_STATUS_DRAFT, changedBy: userId },
          });
          await tx.auditLog.create({
            data: {
              actorUserId: userId,
              entityType: 'request',
              entityId: request.id,
              action: 'farm_details_created',
              changes: { listingRequestId: listing.id.toString(), listingType: listing.listingType },
            },
          });
          return request;
        });
      } catch (error) {
        if (isUnique(error) && attempt < 2) continue;
        throw error;
      }
    }
    throw new Error('Could not allocate request number');
  }

  private async present(requestId: bigint): Promise<FarmDetailsRequestResponseDto> {
    const request = await this.prisma.request.findFirst({
      where: { id: requestId, requestType: RequestType.farmDetails },
    });
    if (!request?.parentRequestId || !request.farmId) throw notFound();
    const listingDetail = await this.prisma.farmListingDetail.findUnique({
      where: { requestId: request.parentRequestId },
      select: { slug: true, listingType: true },
    });
    if (!listingDetail) throw notFound();
    const reviews = await this.ownerReviews([requestId]);
    return {
      id: request.id.toString(),
      requestNumber: request.requestNumber,
      status: request.status,
      farmId: request.farmId.toString(),
      listing: {
        listingRequestId: request.parentRequestId.toString(),
        listingSlug: listingDetail.slug,
        listingType: listingDetail.listingType,
      },
      message: null,
      reviews: reviews.get(requestId) ?? [],
      submittedAt: request.submittedAt?.toISOString() ?? null,
      createdAt: request.createdAt?.toISOString() ?? null,
    };
  }

  private async ownerReviews(requestIds: bigint[]): Promise<Map<bigint, FarmManagementReviewFeedbackDto[]>> {
    if (requestIds.length === 0) return new Map();
    const rows = await this.prisma.requestReview.findMany({
      where: { requestId: { in: requestIds } },
      orderBy: { id: 'asc' },
      include: { reviewer: { select: { fullName: true } } },
    });
    const map = new Map<bigint, FarmManagementReviewFeedbackDto[]>();
    for (const row of rows) {
      const list = map.get(row.requestId) ?? [];
      list.push({
        decision: row.decision,
        comment: row.comment,
        createdAt: row.createdAt?.toISOString() ?? null,
      });
      map.set(row.requestId, list);
    }
    return map;
  }
}

function isUnique(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
}
