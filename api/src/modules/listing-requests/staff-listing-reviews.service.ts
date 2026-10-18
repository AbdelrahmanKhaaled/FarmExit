import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type FarmListingDetail, type Request, type RequestStaffAssignment } from '../../generated/prisma/client';
import {
  AccountStatus,
  RequestStaffAssignmentType,
  RequestType,
  RequestVisibility,
  ReviewDecision,
  StaffRole,
} from '../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';
import { forbidden } from '../authorization/authorization.errors';
import { StaffAuthorizationService, STAFF_STATUS_ACTIVE } from '../authorization/staff-authorization.service';
import { staffHasAdminScope, StaffPermission } from '../authorization/staff-permissions';
import { DEFAULT_PAGE_SIZE, type ListFarmsQueryDto } from '../farms/dto/list-farms-query.dto';
import type {
  AssignListingStaffDto,
  DecideListingReviewDto,
  StaffAssignmentDto,
  StaffListingRequestListResponseDto,
  StaffListingRequestResponseDto,
  StaffListingReviewDto,
} from './dto/staff-listing-review.dto';
import { LISTING_DRAFT, LISTING_UNDER_REVIEW } from './listing-requests.service';
import { moneyOut } from './listing-prices';

const notFound = (): NotFoundException => new NotFoundException('Listing request not found');
const assigneeRejected = (): BadRequestException =>
  new BadRequestException('Assignee is not an active staff member for that role');

/** Lost an optimistic update or the unique slot. The caller retries the transaction. */
class AssignmentChanged extends Error {
  constructor() {
    super('Assignment changed');
  }
}

type FarmView = { id: bigint; name: string; areaFeddan: { toString(): string } };
type Access = { kind: 'admin' } | { kind: 'assigned'; types: RequestStaffAssignmentType[] };

/**
 * Staff inbox for submitted sale/rent listing requests. Admin sees every submitted listing and is the only role
 * that can assign. A reviewer or case agent sees a request only when that slot is assigned to them. The two slots
 * are independent. Nothing here approves, rejects, publishes, or opens a communication case.
 */
@Injectable()
export class StaffListingReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly staffAuth: StaffAuthorizationService,
  ) {}

  async list(userId: bigint, query: ListFarmsQueryDto): Promise<StaffListingRequestListResponseDto> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
    const access = await this.access(userId);
    const where = await this.inboxWhere(userId, access);
    if (!where) return { items: [], page, pageSize, total: 0 };

    const [total, rows] = await Promise.all([
      this.prisma.request.count({ where }),
      this.prisma.request.findMany({
        where,
        orderBy: [{ submittedAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return { items: await this.presentMany(userId, access, rows), page, pageSize, total };
  }

  async get(userId: bigint, requestId: bigint): Promise<StaffListingRequestResponseDto> {
    const request = await this.submitted(requestId);
    const access = await this.access(userId);
    await this.assertAssigned(userId, requestId, access);
    const [item] = await this.presentMany(userId, access, [request]);
    if (!item) throw notFound();
    return item;
  }

  async assign(
    actorId: bigint,
    requestId: bigint,
    dto: AssignListingStaffDto,
  ): Promise<StaffListingRequestResponseDto> {
    const assignmentType =
      dto.assignmentType === 'reviewer' ? RequestStaffAssignmentType.reviewer : RequestStaffAssignmentType.caseAgent;
    const assignedStaffId = BigInt(dto.assignedStaffId);
    await this.writeAssignment(actorId, requestId, assignmentType, assignedStaffId);
    return this.get(actorId, requestId);
  }

  async decide(
    actorId: bigint,
    requestId: bigint,
    dto: DecideListingReviewDto,
  ): Promise<StaffListingRequestResponseDto> {
    const decision = dto.decision;
    const comment = dto.comment ?? null;
    if (decision !== 'approved' && !comment) {
      throw new BadRequestException('A comment is required when requesting changes or rejecting a listing');
    }
    await this.assertMayDecide(actorId, requestId);
    await this.prisma.$transaction((tx) => this.decideOnce(tx, actorId, requestId, decision, comment));
    return this.presentDecided(actorId, requestId);
  }

  private async assertMayDecide(actorId: bigint, requestId: bigint): Promise<void> {
    const staff = await this.staffAuth.loadContext(actorId);
    if (!staff?.permissions.includes(StaffPermission.RequestsReview)) throw forbidden();
    const request = await this.prisma.request.findFirst({
      where: { id: requestId, requestType: RequestType.farmListing },
      select: { id: true, status: true },
    });
    if (!request || request.status === LISTING_DRAFT) throw notFound();
    const admin = staffHasAdminScope(staff.roles);
    if (!admin) {
      if (!staff.roles.includes(StaffRole.reviewer)) throw forbidden();
      const slot = await this.prisma.requestStaffAssignment.findFirst({
        where: {
          requestId,
          assignedStaffId: actorId,
          assignmentType: RequestStaffAssignmentType.reviewer,
        },
        select: { id: true },
      });
      if (!slot) throw notFound();
    }
    if (request.status !== LISTING_UNDER_REVIEW) {
      throw new ConflictException('This listing request is no longer under review');
    }
  }

  private async decideOnce(
    tx: Prisma.TransactionClient,
    actorId: bigint,
    requestId: bigint,
    decision: DecideListingReviewDto['decision'],
    comment: string | null,
  ): Promise<void> {
    const admin = await tx.staffMembership.findFirst({
      where: { userId: actorId, staffRole: StaffRole.admin, status: STAFF_STATUS_ACTIVE },
      select: { id: true },
    });
    const reviewer = admin
      ? null
      : await tx.staffMembership.findFirst({
          where: { userId: actorId, staffRole: StaffRole.reviewer, status: STAFF_STATUS_ACTIVE },
          select: { id: true },
        });
    if (!admin && !reviewer) throw forbidden();

    const status = decision;
    const locked = await tx.request.updateMany({
      where: { id: requestId, requestType: RequestType.farmListing, status: LISTING_UNDER_REVIEW },
      data: { status, visibility: RequestVisibility.private },
    });
    if (locked.count !== 1) {
      const current = await tx.request.findFirst({
        where: { id: requestId, requestType: RequestType.farmListing },
        select: { status: true },
      });
      if (!current || current.status === LISTING_DRAFT) throw notFound();
      throw new ConflictException('This listing request is no longer under review');
    }
    if (!admin) {
      const slot = await tx.requestStaffAssignment.findFirst({
        where: {
          requestId,
          assignedStaffId: actorId,
          assignmentType: RequestStaffAssignmentType.reviewer,
        },
        select: { id: true },
      });
      if (!slot) throw notFound();
    }
    await tx.requestReview.create({
      data: {
        requestId,
        reviewerId: actorId,
        decision,
        comment,
      },
    });
    await tx.requestStatusHistory.create({
      data: {
        requestId,
        fromStatus: LISTING_UNDER_REVIEW,
        toStatus: status,
        changedBy: actorId,
        reason: comment,
      },
    });
  }

  private async presentDecided(actorId: bigint, requestId: bigint): Promise<StaffListingRequestResponseDto> {
    const request = await this.prisma.request.findFirst({
      where: { id: requestId, requestType: RequestType.farmListing },
    });
    if (!request?.farmId) throw notFound();
    const access = await this.access(actorId);
    const [item] = await this.presentMany(actorId, access, [request]);
    if (!item) throw notFound();
    return item;
  }

  private async writeAssignment(
    actorId: bigint,
    requestId: bigint,
    assignmentType: RequestStaffAssignmentType,
    assignedStaffId: bigint,
  ): Promise<void> {
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        await this.prisma.$transaction((tx) =>
          this.writeOnce(tx, actorId, requestId, assignmentType, assignedStaffId),
        );
        return;
      } catch (error) {
        if (attempt < 4 && isRetryable(error)) continue;
        if (isRetryable(error)) throw new ConflictException('This assignment changed. Retry the request.');
        throw error;
      }
    }
    throw new ConflictException('This assignment changed. Retry the request.');
  }

  private async writeOnce(
    tx: Prisma.TransactionClient,
    actorId: bigint,
    requestId: bigint,
    assignmentType: RequestStaffAssignmentType,
    assignedStaffId: bigint,
  ): Promise<void> {
    const admin = await tx.staffMembership.findFirst({
      where: { userId: actorId, staffRole: StaffRole.admin, status: STAFF_STATUS_ACTIVE },
      select: { id: true },
    });
    if (!admin) throw forbidden();

    const request = await tx.request.findFirst({
      where: { id: requestId, requestType: RequestType.farmListing, status: LISTING_UNDER_REVIEW },
      select: { id: true },
    });
    if (!request) throw notFound();

    const requiredRole =
      assignmentType === RequestStaffAssignmentType.reviewer ? StaffRole.reviewer : StaffRole.caseAgent;
    const assignee = await tx.user.findFirst({
      where: { id: assignedStaffId, accountStatus: AccountStatus.active },
      select: { id: true },
    });
    const membership = assignee
      ? await tx.staffMembership.findFirst({
          where: { userId: assignedStaffId, staffRole: requiredRole, status: STAFF_STATUS_ACTIVE },
          select: { id: true },
        })
      : null;
    if (!membership) throw assigneeRejected();

    const existing = await tx.requestStaffAssignment.findFirst({ where: { requestId, assignmentType } });
    const now = new Date();
    if (existing?.assignedStaffId === assignedStaffId) return;

    const saved = existing
      ? await this.replaceAssignment(tx, existing, actorId, assignedStaffId, now)
      : await tx.requestStaffAssignment.create({
          data: { requestId, assignmentType, assignedStaffId, assignedByUserId: actorId, assignedAt: now },
        });

    await tx.auditLog.create({
      data: {
        actorUserId: actorId,
        entityType: 'request_staff_assignment',
        entityId: saved.id,
        action: existing ? 'reassigned' : 'assigned',
        changes: {
          requestId: requestId.toString(),
          assignmentType,
          fromStaffId: existing ? existing.assignedStaffId.toString() : null,
          toStaffId: assignedStaffId.toString(),
        },
      },
    });
  }

  private async replaceAssignment(
    tx: Prisma.TransactionClient,
    existing: RequestStaffAssignment,
    actorId: bigint,
    assignedStaffId: bigint,
    now: Date,
  ): Promise<RequestStaffAssignment> {
    const updated = await tx.requestStaffAssignment.updateMany({
      where: { id: existing.id, assignedStaffId: existing.assignedStaffId, assignmentType: existing.assignmentType },
      data: { assignedStaffId, assignedByUserId: actorId, assignedAt: now },
    });
    if (updated.count !== 1) throw new AssignmentChanged();
    const saved = await tx.requestStaffAssignment.findFirst({ where: { id: existing.id } });
    if (!saved || saved.assignedStaffId !== assignedStaffId) throw new AssignmentChanged();
    return saved;
  }

  private async access(userId: bigint): Promise<Access> {
    const staff = await this.staffAuth.loadContext(userId);
    if (!staff?.permissions.includes(StaffPermission.RequestsRead)) throw forbidden();
    if (staffHasAdminScope(staff.roles)) return { kind: 'admin' };
    const types: RequestStaffAssignmentType[] = [];
    if (staff.roles.includes(StaffRole.reviewer)) types.push(RequestStaffAssignmentType.reviewer);
    if (staff.roles.includes(StaffRole.caseAgent)) types.push(RequestStaffAssignmentType.caseAgent);
    if (types.length === 0) throw forbidden();
    return { kind: 'assigned', types };
  }

  private async inboxWhere(userId: bigint, access: Access): Promise<Prisma.RequestWhereInput | null> {
    const where: Prisma.RequestWhereInput = {
      requestType: RequestType.farmListing,
      status: LISTING_UNDER_REVIEW,
    };
    if (access.kind === 'admin') return where;
    const mine = await this.prisma.requestStaffAssignment.findMany({
      where: { assignedStaffId: userId, assignmentType: { in: access.types } },
      select: { requestId: true },
    });
    if (mine.length === 0) return null;
    return { ...where, id: { in: mine.map((row) => row.requestId) } };
  }

  private async assertAssigned(userId: bigint, requestId: bigint, access: Access): Promise<void> {
    if (access.kind === 'admin') return;
    const match = await this.prisma.requestStaffAssignment.findFirst({
      where: { requestId, assignedStaffId: userId, assignmentType: { in: access.types } },
      select: { id: true },
    });
    if (!match) throw notFound();
  }

  private async submitted(requestId: bigint): Promise<Request> {
    const request = await this.prisma.request.findFirst({
      where: { id: requestId, requestType: RequestType.farmListing, status: LISTING_UNDER_REVIEW },
    });
    if (!request?.farmId) throw notFound();
    return request;
  }

  private async presentMany(
    userId: bigint,
    access: Access,
    rows: Request[],
  ): Promise<StaffListingRequestResponseDto[]> {
    if (rows.length === 0) return [];
    const requestIds = rows.map((row) => row.id);
    const farmIds = rows.map((row) => row.farmId).filter((id): id is bigint => id !== null);
    const [details, farms, assignments, reviews] = await Promise.all([
      this.prisma.farmListingDetail.findMany({ where: { requestId: { in: requestIds } } }),
      this.prisma.farm.findMany({ where: { id: { in: farmIds } }, select: { id: true, name: true, areaFeddan: true } }),
      this.prisma.requestStaffAssignment.findMany({
        where: {
          requestId: { in: requestIds },
          ...(access.kind === 'admin' ? {} : { assignedStaffId: userId, assignmentType: { in: access.types } }),
        },
      }),
      this.prisma.requestReview.findMany({
        where: { requestId: { in: requestIds } },
        orderBy: { id: 'asc' },
        select: { requestId: true, reviewerId: true, decision: true, comment: true, createdAt: true },
      }),
    ]);
    const detailByRequest = new Map(details.map((detail) => [detail.requestId, detail]));
    const farmById = new Map(farms.map((farm) => [farm.id, farm]));
    const items: StaffListingRequestResponseDto[] = [];
    for (const request of rows) {
      const detail = detailByRequest.get(request.id);
      const farm = request.farmId === null ? undefined : farmById.get(request.farmId);
      if (!detail || !farm) continue;
      items.push(
        toStaffResponse(
          request,
          detail,
          farm,
          assignments.filter((row) => row.requestId === request.id),
          reviews.filter((row) => row.requestId === request.id),
        ),
      );
    }
    return items;
  }
}

function isRetryable(error: unknown): boolean {
  if (error instanceof AssignmentChanged) return true;
  if (typeof error !== 'object' || error === null || !('code' in error)) return false;
  return error.code === 'P2002' || error.code === 'P2034';
}

function highlightsOut(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

function toAssignment(row: RequestStaffAssignment): StaffAssignmentDto {
  return {
    assignmentType: row.assignmentType,
    assignedStaffId: row.assignedStaffId.toString(),
    assignedByUserId: row.assignedByUserId.toString(),
    assignedAt: row.assignedAt.toISOString(),
  };
}

function toStaffReview(row: {
  reviewerId: bigint;
  decision: ReviewDecision;
  comment: string | null;
  createdAt: Date | null;
}): StaffListingReviewDto {
  return {
    decision: row.decision,
    reviewerId: row.reviewerId.toString(),
    comment: row.comment,
    createdAt: row.createdAt?.toISOString() ?? null,
  };
}

function toStaffResponse(
  request: Request,
  detail: FarmListingDetail,
  farm: FarmView,
  assignments: RequestStaffAssignment[],
  reviews: {
    reviewerId: bigint;
    decision: ReviewDecision;
    comment: string | null;
    createdAt: Date | null;
  }[],
): StaffListingRequestResponseDto {
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
    submittedAt: request.submittedAt?.toISOString() ?? null,
    createdAt: request.createdAt?.toISOString() ?? null,
    updatedAt: request.updatedAt?.toISOString() ?? null,
    assignments: assignments.map(toAssignment),
    reviews: reviews.map(toStaffReview),
  };
}
