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
import type { FarmDetailsRequestListResponseDto, FarmDetailsRequestResponseDto } from './dto/farm-details-request.dto';
import { FarmDetailsRequestsService } from './farm-details-requests.service';

const notFound = (): NotFoundException => new NotFoundException('Farm details request not found');

@Injectable()
export class StaffFarmDetailsReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly staffAuth: StaffAuthorizationService,
    private readonly details: FarmDetailsRequestsService,
  ) {}

  async list(userId: bigint, query: ListFarmsQueryDto): Promise<FarmDetailsRequestListResponseDto> {
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
    const items = await Promise.all(rows.map((row) => this.details.getById(row.id)));
    return { items, page, pageSize, total };
  }

  async get(userId: bigint, requestId: bigint): Promise<FarmDetailsRequestResponseDto> {
    await this.underReview(requestId);
    await this.assertMayView(userId, requestId);
    return this.details.getById(requestId);
  }

  async decide(userId: bigint, requestId: bigint, dto: DecideListingReviewDto): Promise<FarmDetailsRequestResponseDto> {
    const decision = dto.decision;
    const comment = dto.comment ?? null;
    if (decision !== 'approved' && !comment) {
      throw new BadRequestException('A comment is required when requesting changes or rejecting');
    }
    await this.assertMayDecide(userId, requestId);
    await this.prisma.$transaction((tx) => this.decideOnce(tx, userId, requestId, decision, comment));
    return this.details.getById(requestId);
  }

  private async inboxWhere(userId: bigint, staff: { roles: StaffRole[] }): Promise<Prisma.RequestWhereInput | null> {
    const where: Prisma.RequestWhereInput = {
      requestType: RequestType.farmDetails,
      status: REQUEST_STATUS_UNDER_REVIEW,
    };
    if (staffHasAdminScope(staff.roles)) return where;
    if (!staff.roles.includes(StaffRole.caseAgent)) return null;
    const mine = await this.prisma.requestStaffAssignment.findMany({
      where: { assignedStaffId: userId, assignmentType: RequestStaffAssignmentType.caseAgent },
      select: { requestId: true },
    });
    if (mine.length === 0) return null;
    return { ...where, id: { in: mine.map((r) => r.requestId) } };
  }

  private async underReview(requestId: bigint): Promise<void> {
    const request = await this.prisma.request.findFirst({
      where: { id: requestId, requestType: RequestType.farmDetails, status: REQUEST_STATUS_UNDER_REVIEW },
    });
    if (!request) throw notFound();
  }

  private async assertMayView(userId: bigint, requestId: bigint): Promise<void> {
    const staff = await this.staffAuth.loadContext(userId);
    if (!staff?.permissions.includes(StaffPermission.RequestsRead)) throw forbidden();
    if (staffHasAdminScope(staff.roles)) return;
    const slot = await this.prisma.requestStaffAssignment.findFirst({
      where: { requestId, assignedStaffId: userId, assignmentType: RequestStaffAssignmentType.caseAgent },
    });
    if (!slot) throw notFound();
  }

  private async assertMayDecide(userId: bigint, requestId: bigint): Promise<void> {
    const staff = await this.staffAuth.loadContext(userId);
    if (!staff?.permissions.includes(StaffPermission.RequestsRead)) throw forbidden();
    if (!staffHasAdminScope(staff.roles) && !staff.roles.includes(StaffRole.caseAgent)) throw forbidden();
    if (!staffHasAdminScope(staff.roles)) {
      const slot = await this.prisma.requestStaffAssignment.findFirst({
        where: { requestId, assignedStaffId: userId, assignmentType: RequestStaffAssignmentType.caseAgent },
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
    const locked = await tx.request.updateMany({
      where: { id: requestId, requestType: RequestType.farmDetails, status: REQUEST_STATUS_UNDER_REVIEW },
      data: { status: decision },
    });
    if (locked.count !== 1) throw new ConflictException('This details request is no longer under review');
    await tx.requestReview.create({
      data: { requestId, reviewerId: actorId, decision, comment },
    });
    await tx.requestStatusHistory.create({
      data: {
        requestId,
        fromStatus: REQUEST_STATUS_UNDER_REVIEW,
        toStatus: decision,
        changedBy: actorId,
        reason: comment,
      },
    });
    await tx.auditLog.create({
      data: {
        actorUserId: actorId,
        entityType: 'request',
        entityId: requestId,
        action: 'farm_details_review_decided',
        changes: { decision, comment },
      },
    });
  }
}
