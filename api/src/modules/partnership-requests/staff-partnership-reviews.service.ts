import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { RequestStaffAssignmentType, RequestType, StaffRole } from '../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';
import { forbidden } from '../authorization/authorization.errors';
import { StaffAuthorizationService } from '../authorization/staff-authorization.service';
import { staffHasAdminScope, StaffPermission } from '../authorization/staff-permissions';
import { DEFAULT_PAGE_SIZE, type ListFarmsQueryDto } from '../farms/dto/list-farms-query.dto';
import type { DecideListingReviewDto } from '../listing-requests/dto/staff-listing-review.dto';
import { REQUEST_STATUS_UNDER_REVIEW } from '../requests/request-workflow.policy';
import type { PartnershipRequestListResponseDto, PartnershipRequestResponseDto } from './dto/partnership-request.dto';
import { PartnershipRequestsService } from './partnership-requests.service';

const notFound = (): NotFoundException => new NotFoundException('Partnership request not found');

@Injectable()
export class StaffPartnershipReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly staffAuth: StaffAuthorizationService,
    private readonly partnerships: PartnershipRequestsService,
  ) {}

  async list(userId: bigint, query: ListFarmsQueryDto): Promise<PartnershipRequestListResponseDto> {
    const staff = await this.staffAuth.loadContext(userId);
    if (!staff?.permissions.includes(StaffPermission.RequestsRead)) throw forbidden();
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
    const where = await this.inboxWhere(userId, staff);
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
    const items = await Promise.all(rows.map((row) => this.partnerships.getById(row.id)));
    return { items, page, pageSize, total };
  }

  async get(userId: bigint, requestId: bigint): Promise<PartnershipRequestResponseDto> {
    await this.underReview(requestId);
    await this.assertMayView(userId, requestId);
    return this.partnerships.getById(requestId);
  }

  async decide(userId: bigint, requestId: bigint, dto: DecideListingReviewDto): Promise<PartnershipRequestResponseDto> {
    const decision = dto.decision;
    const comment = dto.comment ?? null;
    if (decision !== 'approved' && !comment) {
      throw new BadRequestException('A comment is required when requesting changes or rejecting');
    }
    await this.assertMayDecide(userId, requestId);
    await this.prisma.$transaction((tx) => this.decideOnce(tx, userId, requestId, decision, comment));
    return this.partnerships.getById(requestId);
  }

  async listLinkedApplications(
    staffUserId: bigint,
    partnershipRequestId: bigint,
    query: ListFarmsQueryDto,
  ): Promise<{ items: { id: string; status: string; createdAt: string | null }[]; page: number; pageSize: number; total: number }> {
    await this.assertMayViewAnyPartnership(staffUserId, partnershipRequestId);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
    const where = {
      requestType: RequestType.partnershipApplication,
      parentRequestId: partnershipRequestId,
    };
    const [total, rows] = await Promise.all([
      this.prisma.request.count({ where }),
      this.prisma.request.findMany({
        where,
        orderBy: { id: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: { id: true, status: true, createdAt: true },
      }),
    ]);
    return {
      items: rows.map((r) => ({
        id: r.id.toString(),
        status: r.status,
        createdAt: r.createdAt?.toISOString() ?? null,
      })),
      page,
      pageSize,
      total,
    };
  }

  private async inboxWhere(userId: bigint, staff: { roles: StaffRole[] }): Promise<Prisma.RequestWhereInput | null> {
    const where: Prisma.RequestWhereInput = {
      requestType: RequestType.partnership,
      status: REQUEST_STATUS_UNDER_REVIEW,
    };
    if (staffHasAdminScope(staff.roles)) return where;
    if (!staff.roles.includes(StaffRole.reviewer)) return null;
    const mine = await this.prisma.requestStaffAssignment.findMany({
      where: { assignedStaffId: userId, assignmentType: RequestStaffAssignmentType.reviewer },
      select: { requestId: true },
    });
    if (mine.length === 0) return null;
    return { ...where, id: { in: mine.map((r) => r.requestId) } };
  }

  private async underReview(requestId: bigint): Promise<void> {
    const request = await this.prisma.request.findFirst({
      where: { id: requestId, requestType: RequestType.partnership, status: REQUEST_STATUS_UNDER_REVIEW },
    });
    if (!request) throw notFound();
  }

  private async assertMayView(userId: bigint, requestId: bigint): Promise<void> {
    const staff = await this.staffAuth.loadContext(userId);
    if (!staff?.permissions.includes(StaffPermission.RequestsRead)) throw forbidden();
    if (staffHasAdminScope(staff.roles)) return;
    const slot = await this.prisma.requestStaffAssignment.findFirst({
      where: { requestId, assignedStaffId: userId, assignmentType: RequestStaffAssignmentType.reviewer },
    });
    if (!slot) throw notFound();
  }

  private async assertMayViewAnyPartnership(staffUserId: bigint, partnershipRequestId: bigint): Promise<void> {
    const parent = await this.prisma.request.findFirst({
      where: { id: partnershipRequestId, requestType: RequestType.partnership },
    });
    if (!parent) throw notFound();
    const staff = await this.staffAuth.loadContext(staffUserId);
    if (!staff?.permissions.includes(StaffPermission.RequestsRead)) throw forbidden();
    if (staffHasAdminScope(staff.roles)) return;
    const slot = await this.prisma.requestStaffAssignment.findFirst({
      where: {
        requestId: partnershipRequestId,
        assignedStaffId: staffUserId,
        assignmentType: { in: [RequestStaffAssignmentType.reviewer, RequestStaffAssignmentType.caseAgent] },
      },
    });
    if (!slot) throw notFound();
  }

  private async assertMayDecide(userId: bigint, requestId: bigint): Promise<void> {
    const staff = await this.staffAuth.loadContext(userId);
    if (!staff?.permissions.includes(StaffPermission.RequestsReview)) throw forbidden();
    if (!staffHasAdminScope(staff.roles) && !staff.roles.includes(StaffRole.reviewer)) throw forbidden();
    if (!staffHasAdminScope(staff.roles)) {
      const slot = await this.prisma.requestStaffAssignment.findFirst({
        where: { requestId, assignedStaffId: userId, assignmentType: RequestStaffAssignmentType.reviewer },
      });
      if (!slot) throw notFound();
    }
  }

  private async decideOnce(
    tx: Prisma.TransactionClient,
    actorId: bigint,
    requestId: bigint,
    decision: DecideListingReviewDto['decision'],
    comment: string | null,
  ): Promise<void> {
    const status = decision;
    const locked = await tx.request.updateMany({
      where: { id: requestId, requestType: RequestType.partnership, status: REQUEST_STATUS_UNDER_REVIEW },
      data: { status },
    });
    if (locked.count !== 1) throw new ConflictException('This partnership request is no longer under review');
    await tx.requestReview.create({
      data: { requestId, reviewerId: actorId, decision, comment },
    });
    await tx.requestStatusHistory.create({
      data: {
        requestId,
        fromStatus: REQUEST_STATUS_UNDER_REVIEW,
        toStatus: status,
        changedBy: actorId,
        reason: comment,
      },
    });
    await tx.auditLog.create({
      data: {
        actorUserId: actorId,
        entityType: 'request',
        entityId: requestId,
        action: 'partnership_review_decided',
        changes: { decision, comment },
      },
    });
  }
}
