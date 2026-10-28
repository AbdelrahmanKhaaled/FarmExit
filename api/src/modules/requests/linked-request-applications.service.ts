import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client';
import { StaffRole } from '../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';
import { StaffAuthorizationService } from '../authorization/staff-authorization.service';
import { forbidden } from '../authorization/authorization.errors';
import { staffHasAdminScope, StaffPermission } from '../authorization/staff-permissions';
import { RequestsService } from './requests.service';
import type { LinkedApplicationsQueryDto, LinkedApplicationsResponseDto } from './dto/linked-applications.dto';

@Injectable()
export class LinkedRequestApplicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly requests: RequestsService,
    private readonly staffAuth: StaffAuthorizationService,
  ) {}

  async list(
    actorId: bigint,
    parentId: bigint,
    query: LinkedApplicationsQueryDto,
  ): Promise<LinkedApplicationsResponseDto> {
    // Reuse the existing parent access rule; parent visibility never implies visibility of its children.
    const parent = await this.requests.getStaff(actorId, parentId);
    if (parent.requestType !== 'partnership')
      throw new NotFoundException('This request does not receive partnership applications');
    const staff = await this.staffAuth.loadContext(actorId);
    if (!staff?.permissions.includes(StaffPermission.RequestsRead)) throw forbidden();
    const isAdmin = staffHasAdminScope(staff.roles);
    // Match the dedicated partnership-application detail workflow's case-agent assignment scope.
    if (!isAdmin && !staff.roles.includes(StaffRole.caseAgent)) throw forbidden();
    const scope: Prisma.RequestWhereInput = {
      parentRequestId: parentId,
      requestType: 'partnershipApplication',
      status: { not: 'draft' },
      submittedAt: { not: null },
      applicationDetail: { isNot: null },
      ...(!isAdmin ? { staffAssignments: { some: { assignedStaffId: actorId, assignmentType: 'caseAgent' } } } : {}),
    };
    const search = query.search?.trim();
    const where: Prisma.RequestWhereInput = {
      AND: [
        scope,
        {
          ...(query.status ? { status: query.status } : {}),
          ...(search
            ? { OR: [{ requestNumber: { contains: search } }, { creator: { fullName: { contains: search } } }] }
            : {}),
        },
      ],
    };
    const requestedPage = query.page ?? 1;
    const pageSize = query.pageSize ?? 6;
    const direction = query.sort === 'oldest' ? 'asc' : 'desc';
    const [total, counts] = await Promise.all([
      this.prisma.request.count({ where }),
      this.prisma.request.groupBy({ by: ['status'], where: scope, _count: { _all: true } }),
    ]);
    const page = Math.min(requestedPage, Math.max(1, Math.ceil(total / pageSize)));
    const rows = await this.prisma.request.findMany({
      where,
      orderBy: [{ submittedAt: direction }, { id: direction }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        parentRequestId: true,
        requestNumber: true,
        status: true,
        submittedAt: true,
        creator: { select: { fullName: true } },
        applicationDetail: { select: { applicantKind: true, applicationMessage: true, relevantExperience: true } },
        staffAssignments: { select: { assignmentType: true, assignee: { select: { fullName: true } } } },
      },
    });
    const byStatus = Object.fromEntries(counts.map((row) => [row.status, row._count._all]));
    return {
      total,
      page,
      pageSize,
      summary: {
        total: counts.reduce((sum, row) => sum + row._count._all, 0),
        pending: (byStatus.submitted ?? 0) + (byStatus.underFarmExitReview ?? 0),
        approved: byStatus.approved ?? 0,
        rejected: byStatus.rejected ?? 0,
        byStatus,
      },
      items: rows.map((row) => ({
        id: row.id.toString(),
        parentRequestId: row.parentRequestId!.toString(),
        requestNumber: row.requestNumber,
        status: row.status,
        applicantName: row.creator.fullName,
        applicantKind: row.applicationDetail?.applicantKind ?? null,
        summary:
          (row.applicationDetail?.applicationMessage || row.applicationDetail?.relevantExperience)?.slice(0, 280) ??
          null,
        submittedAt: row.submittedAt?.toISOString() ?? null,
        assignedStaff: row.staffAssignments.map((slot) => ({
          role: slot.assignmentType,
          name: slot.assignee.fullName,
        })),
      })),
    };
  }
}
