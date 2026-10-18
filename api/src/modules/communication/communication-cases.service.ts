import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type CommunicationCase } from '../../generated/prisma/client';
import { CommunicationCaseStatus } from '../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';
import { StaffAuthorizationService } from '../authorization/staff-authorization.service';
import { staffHasAdminScope, StaffPermission } from '../authorization/staff-permissions';
import { forbidden } from '../authorization/authorization.errors';
import { DEFAULT_PAGE_SIZE, type ListFarmsQueryDto } from '../farms/dto/list-farms-query.dto';
import { CommunicationAccessService } from './communication-access.service';
import type {
  CommunicationCaseListResponseDto,
  CommunicationCaseResponseDto,
  OpenCommunicationCaseDto,
  UpdateCaseStatusDto,
} from './dto/communication.dto';

const notFound = (): NotFoundException => new NotFoundException('Communication case not found');

@Injectable()
export class CommunicationCasesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: CommunicationAccessService,
    private readonly staffAuth: StaffAuthorizationService,
  ) {}

  async open(userId: bigint, dto: OpenCommunicationCaseDto): Promise<CommunicationCaseResponseDto> {
    const requestId = BigInt(dto.requestId);
    const request = await this.access.loadRequest(requestId);
    await this.access.assertExternalParticipant(userId, request);

    const open = await this.prisma.communicationCase.findFirst({
      where: { requestId, status: { not: CommunicationCaseStatus.closed } },
    });
    if (open) {
      await this.ensureConversation(open.id, userId);
      return toCase(open);
    }

    const agentId = await this.access.resolveCaseAgentId(requestId);
    if (!agentId) {
      throw new BadRequestException('A case agent must be assigned to this request before communication can begin');
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const caseRow = await tx.communicationCase.create({
        data: {
          requestId,
          assignedStaffId: agentId,
          status: CommunicationCaseStatus.open,
        },
      });
      await tx.conversation.create({
        data: { caseId: caseRow.id, externalUserId: userId, status: 'open' },
      });
      await tx.auditLog.create({
        data: {
          actorUserId: userId,
          entityType: 'communication_case',
          entityId: caseRow.id,
          action: 'case_opened',
          changes: { requestId: requestId.toString(), assignedStaffId: agentId.toString() },
        },
      });
      return caseRow;
    });
    return toCase(created);
  }

  async listMine(userId: bigint, query: ListFarmsQueryDto): Promise<CommunicationCaseListResponseDto> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
    const convs = await this.prisma.conversation.findMany({
      where: { externalUserId: userId },
      select: { caseId: true },
    });
    const caseIds = [...new Set(convs.map((c) => c.caseId))];
    const owned = await this.prisma.request.findMany({
      where: { createdBy: userId },
      select: { id: true },
    });
    const requestIds = owned.map((r) => r.id);
    const fromRequests =
      requestIds.length === 0
        ? []
        : await this.prisma.communicationCase.findMany({
            where: { requestId: { in: requestIds } },
            select: { id: true },
          });
    const allIds = [...new Set([...caseIds, ...fromRequests.map((c) => c.id)])];
    if (allIds.length === 0) return { items: [], page, pageSize, total: 0 };

    const where = { id: { in: allIds } };
    const [total, rows] = await Promise.all([
      this.prisma.communicationCase.count({ where }),
      this.prisma.communicationCase.findMany({
        where,
        orderBy: { id: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return { items: rows.map(toCase), page, pageSize, total };
  }

  async getMine(userId: bigint, caseId: bigint): Promise<CommunicationCaseResponseDto> {
    const caseRow = await this.prisma.communicationCase.findUnique({ where: { id: caseId } });
    if (!caseRow) throw notFound();
    await this.access.assertCaseParticipant(userId, caseRow);
    return toCase(caseRow);
  }

  async listStaff(
    userId: bigint,
    query: ListFarmsQueryDto & { status?: string; requestId?: string },
  ): Promise<CommunicationCaseListResponseDto> {
    const staff = await this.staffAuth.loadContext(userId);
    if (!staff?.permissions.includes(StaffPermission.CommunicationRelay)) throw forbidden();

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
    const where: Prisma.CommunicationCaseWhereInput = staffHasAdminScope(staff.roles) ? {} : { assignedStaffId: userId };
    if (query.status) where.status = query.status as never;
    if (query.requestId) where.requestId = BigInt(query.requestId);
    const [total, rows] = await Promise.all([
      this.prisma.communicationCase.count({ where }),
      this.prisma.communicationCase.findMany({
        where,
        orderBy: { id: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return { items: rows.map(toCase), page, pageSize, total };
  }

  async getStaff(userId: bigint, caseId: bigint): Promise<CommunicationCaseResponseDto> {
    const caseRow = await this.prisma.communicationCase.findUnique({ where: { id: caseId } });
    if (!caseRow) throw notFound();
    await this.access.assertStaffCaseAccess(userId, caseRow);
    return toCase(caseRow);
  }

  async listConversationsStaff(userId: bigint, caseId: bigint) {
    const caseRow = await this.prisma.communicationCase.findUnique({ where: { id: caseId } });
    if (!caseRow) throw notFound();
    await this.access.assertStaffCaseAccess(userId, caseRow);
    const rows = await this.prisma.conversation.findMany({
      where: { caseId },
      orderBy: { id: 'asc' },
      include: { externalUser: { select: { id: true, fullName: true } } },
    });
    return rows.map((c) => ({
      id: c.id.toString(),
      externalUserId: c.externalUserId.toString(),
      externalUserName: c.externalUser.fullName,
    }));
  }

  async updateStatusStaff(
    userId: bigint,
    caseId: bigint,
    dto: UpdateCaseStatusDto,
  ): Promise<CommunicationCaseResponseDto> {
    const caseRow = await this.prisma.communicationCase.findUnique({ where: { id: caseId } });
    if (!caseRow) throw notFound();
    await this.access.assertStaffCaseAccess(userId, caseRow);
    if (caseRow.status === CommunicationCaseStatus.closed && dto.status !== CommunicationCaseStatus.closed) {
      throw new ConflictException('Reopening a closed case is not supported');
    }
    const closedAt = dto.status === CommunicationCaseStatus.closed ? new Date() : null;
    const updated = await this.prisma.communicationCase.update({
      where: { id: caseId },
      data: { status: dto.status, closedAt },
    });
    await this.prisma.auditLog.create({
      data: {
        actorUserId: userId,
        entityType: 'communication_case',
        entityId: caseId,
        action: 'case_status_updated',
        changes: { status: dto.status },
      },
    });
    return toCase(updated);
  }

  private async ensureConversation(caseId: bigint, userId: bigint): Promise<void> {
    const existing = await this.prisma.conversation.findFirst({
      where: { caseId, externalUserId: userId },
    });
    if (existing) return;
    await this.prisma.conversation.create({
      data: { caseId, externalUserId: userId, status: 'open' },
    });
  }
}

function toCase(row: CommunicationCase): CommunicationCaseResponseDto {
  return {
    id: row.id.toString(),
    requestId: row.requestId.toString(),
    status: row.status,
    assignedStaffId: row.assignedStaffId.toString(),
    createdAt: row.createdAt?.toISOString() ?? null,
    closedAt: row.closedAt?.toISOString() ?? null,
  };
}
