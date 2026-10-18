import { Injectable, NotFoundException } from '@nestjs/common';
import type { CommunicationCase, Request } from '../../generated/prisma/client';
import {
  FarmRelationshipRole,
  RequestStaffAssignmentType,
  RequestType,
} from '../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';
import { forbidden } from '../authorization/authorization.errors';
import { FarmAccessService } from '../authorization/farm-access.service';
import { StaffAuthorizationService } from '../authorization/staff-authorization.service';
import { staffHasAdminScope, StaffPermission } from '../authorization/staff-permissions';

const DRAFT_LIKE = new Set(['draft', 'withdrawn']);

@Injectable()
export class CommunicationAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly farmAccess: FarmAccessService,
    private readonly staffAuth: StaffAuthorizationService,
  ) {}

  async loadRequest(requestId: bigint): Promise<Request> {
    const request = await this.prisma.request.findUnique({ where: { id: requestId } });
    if (!request) throw new NotFoundException('Request not found');
    return request;
  }

  /** External user may open or use a case tied to this request. */
  async assertExternalParticipant(userId: bigint, request: Request): Promise<void> {
    if (DRAFT_LIKE.has(request.status)) throw forbidden();
    if (request.createdBy === userId) return;

    if (request.requestType === RequestType.farmPurchaseProposal && request.farmId) {
      if (await this.farmAccess.hasAnyRole(userId, request.farmId, [FarmRelationshipRole.owner])) return;
    }

    if (request.requestType === RequestType.partnershipApplication && request.parentRequestId) {
      const parent = await this.prisma.request.findUnique({ where: { id: request.parentRequestId } });
      if (parent?.farmId && (await this.farmAccess.hasAnyRole(userId, parent.farmId, [FarmRelationshipRole.owner]))) {
        return;
      }
    }

    const forwarding = await this.prisma.requestForwarding.findFirst({
      where: { requestId: request.id, recipientUserId: userId },
    });
    if (forwarding) return;

    throw forbidden();
  }

  async assertCaseParticipant(userId: bigint, caseRow: CommunicationCase): Promise<void> {
    const conv = await this.prisma.conversation.findFirst({
      where: { caseId: caseRow.id, externalUserId: userId },
    });
    if (conv) return;
    const request = await this.prisma.request.findUnique({ where: { id: caseRow.requestId } });
    if (!request) throw new NotFoundException('Communication case not found');
    if (request.createdBy === userId) return;
    await this.assertExternalParticipant(userId, request);
  }

  async assertStaffCaseAccess(userId: bigint, caseRow: CommunicationCase): Promise<void> {
    const staff = await this.staffAuth.loadContext(userId);
    if (!staff?.permissions.includes(StaffPermission.CommunicationRelay)) throw forbidden();
    if (staffHasAdminScope(staff.roles)) return;
    if (caseRow.assignedStaffId === userId) return;

    const onRequest = await this.prisma.requestStaffAssignment.findFirst({
      where: {
        requestId: caseRow.requestId,
        assignedStaffId: userId,
        assignmentType: RequestStaffAssignmentType.caseAgent,
      },
    });
    if (onRequest) return;
    throw forbidden();
  }

  async resolveCaseAgentId(requestId: bigint): Promise<bigint | null> {
    const slot = await this.prisma.requestStaffAssignment.findFirst({
      where: { requestId, assignmentType: RequestStaffAssignmentType.caseAgent },
      orderBy: { assignedAt: 'desc' },
    });
    return slot?.assignedStaffId ?? null;
  }

  /** External parties staff may message or relay to for this case (never arbitrary user IDs). */
  async assertStaffMessageRecipient(caseRow: CommunicationCase, externalUserId: bigint): Promise<void> {
    const request = await this.prisma.request.findUnique({ where: { id: caseRow.requestId } });
    if (!request) throw new NotFoundException('Communication case not found');
    if (request.createdBy === externalUserId) return;
    try {
      await this.assertExternalParticipant(externalUserId, request);
    } catch {
      throw forbidden();
    }
  }
}
