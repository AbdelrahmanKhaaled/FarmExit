import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { RequestStaffAssignmentType, RequestType, StaffRole } from '../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';
import { forbidden } from '../authorization/authorization.errors';
import { StaffAuthorizationService } from '../authorization/staff-authorization.service';
import { staffHasAdminScope, StaffPermission } from '../authorization/staff-permissions';
import { DEFAULT_PAGE_SIZE, type ListFarmsQueryDto } from '../farms/dto/list-farms-query.dto';
import { REQUEST_STATUS_UNDER_REVIEW } from '../requests/request-workflow.policy';
import type { DecideListingReviewDto } from '../listing-requests/dto/staff-listing-review.dto';
import type {
  FarmManagementRequestListResponseDto,
  FarmManagementRequestResponseDto,
} from './dto/farm-management-request.dto';
import { FarmManagementRequestsService } from './farm-management-requests.service';

const notFound = (): NotFoundException => new NotFoundException('Farm management request not found');

@Injectable()
export class StaffFarmManagementReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly staffAuth: StaffAuthorizationService,
    private readonly management: FarmManagementRequestsService,
  ) {}

  async list(userId: bigint, query: ListFarmsQueryDto): Promise<FarmManagementRequestListResponseDto> {
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
    const items: FarmManagementRequestResponseDto[] = [];
    for (const row of rows) {
      if (!row.farmId) continue;
      items.push(await this.management.getById(row.id));
    }
    return { items, page, pageSize, total };
  }

  async get(userId: bigint, requestId: bigint): Promise<FarmManagementRequestResponseDto> {
    const request = await this.prisma.request.findFirst({
      where: { id: requestId, requestType: RequestType.farmManagement },
    });
    if (!request) throw notFound();
    await this.assertMayView(userId, requestId);
    return this.management.getById(requestId);
  }

  async decide(
    userId: bigint,
    requestId: bigint,
    dto: DecideListingReviewDto,
  ): Promise<FarmManagementRequestResponseDto> {
    const decision = dto.decision;
    const comment = dto.comment ?? null;
    if (decision !== 'approved' && !comment) {
      throw new BadRequestException('A comment is required when requesting changes or rejecting');
    }
    await this.assertMayDecide(userId, requestId);
    await this.prisma.$transaction((tx) => this.decideOnce(tx, userId, requestId, decision, comment));
    return this.management.getById(requestId);
  }

  private async inboxWhere(userId: bigint, staff: { roles: StaffRole[] }): Promise<Prisma.RequestWhereInput | null> {
    const where: Prisma.RequestWhereInput = {
      requestType: RequestType.farmManagement,
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

  private async assertMayView(userId: bigint, requestId: bigint): Promise<void> {
    const staff = await this.staffAuth.loadContext(userId);
    if (!staff?.permissions.includes(StaffPermission.RequestsRead)) throw forbidden();
    if (staffHasAdminScope(staff.roles)) return;
    const slot = await this.prisma.requestStaffAssignment.findFirst({
      where: { requestId, assignedStaffId: userId, assignmentType: RequestStaffAssignmentType.reviewer },
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
      where: { id: requestId, requestType: RequestType.farmManagement, status: REQUEST_STATUS_UNDER_REVIEW },
      data: { status },
    });
    if (locked.count !== 1) throw new ConflictException('This management request is no longer under review');
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
        action: 'management_review_decided',
        changes: { decision, comment },
      },
    });
  }
}
