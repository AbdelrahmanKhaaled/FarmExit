import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import {
  FarmRelationshipRole,
  FarmRelationshipStatus,
  RequestType,
  RequestVisibility,
} from '../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';
import { forbidden } from '../authorization/authorization.errors';
import { StaffAuthorizationService } from '../authorization/staff-authorization.service';
import { staffHasAdminScope } from '../authorization/staff-permissions';
import { REQUEST_STATUS_APPROVED } from './request-workflow.policy';

const notFound = (label: string): NotFoundException => new NotFoundException(`${label} not found`);

/**
 * Explicit staff publication for approved management and partnership opportunities.
 * Approval alone stays private; this sets visibility public and publishedAt without changing approved status.
 */
@Injectable()
export class OpportunityPublicationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly staffAuth: StaffAuthorizationService,
  ) {}

  async publishManagement(userId: bigint, requestId: bigint): Promise<void> {
    await this.requireAdminScope(userId);
    await this.prisma.$transaction(
      (tx) => this.publishOnce(tx, userId, requestId, RequestType.farmManagement, 'Farm management'),
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
    );
  }

  async publishPartnership(userId: bigint, requestId: bigint): Promise<void> {
    await this.requireAdminScope(userId);
    await this.prisma.$transaction(
      (tx) => this.publishOnce(tx, userId, requestId, RequestType.partnership, 'Partnership'),
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
    );
  }

  private async requireAdminScope(userId: bigint): Promise<void> {
    const staff = await this.staffAuth.loadContext(userId);
    if (!staff || !staffHasAdminScope(staff.roles)) throw forbidden();
  }

  private async publishOnce(
    tx: Prisma.TransactionClient,
    userId: bigint,
    requestId: bigint,
    requestType: typeof RequestType.farmManagement | typeof RequestType.partnership,
    label: string,
  ): Promise<void> {
    const request = await tx.request.findFirst({
      where: { id: requestId, requestType },
    });
    if (!request?.farmId) throw notFound(label);

    if (request.visibility === RequestVisibility.public && request.publishedAt !== null) {
      throw new ConflictException('This opportunity is already published');
    }
    if (request.status !== REQUEST_STATUS_APPROVED) {
      throw new ConflictException('Only an approved opportunity can be published');
    }
    if (request.submittedAt === null) {
      throw new BadRequestException('The owner has not submitted this opportunity for FarmExit review');
    }
    if (request.publishedAt !== null) {
      throw new ConflictException('This opportunity is already published');
    }

    const approvedReview = await tx.requestReview.findFirst({
      where: { requestId, decision: 'approved' },
      select: { id: true },
    });
    if (!approvedReview) {
      throw new BadRequestException('FarmExit approval is required before publication');
    }

    if (requestType === RequestType.farmManagement) {
      const detail = await tx.farmManagementDetail.findUnique({ where: { requestId } });
      if (!detail?.professionalNeed) {
        throw new BadRequestException('Management details are incomplete for publication');
      }
    } else {
      const detail = await tx.partnershipDetail.findUnique({ where: { requestId } });
      if (!detail) throw new BadRequestException('Partnership details are incomplete for publication');
    }

    const locked = await tx.farm.updateMany({
      where: { id: request.farmId, deletedAt: null },
      data: { updatedAt: new Date() },
    });
    if (locked.count !== 1) throw new BadRequestException('The farm is no longer available');
    await this.requireCurrentOwner(tx, request.createdBy, request.farmId);

    const publishedAt = new Date();
    const updated = await tx.request.updateMany({
      where: {
        id: requestId,
        requestType,
        status: REQUEST_STATUS_APPROVED,
        publishedAt: null,
        visibility: RequestVisibility.private,
      },
      data: { visibility: RequestVisibility.public, publishedAt },
    });
    if (updated.count !== 1) {
      throw new ConflictException('Only a private approved opportunity can be published');
    }

    await tx.requestStatusHistory.create({
      data: {
        requestId,
        fromStatus: REQUEST_STATUS_APPROVED,
        toStatus: REQUEST_STATUS_APPROVED,
        changedBy: userId,
        reason: 'published_to_public_marketplace',
      },
    });
    await tx.auditLog.create({
      data: {
        actorUserId: userId,
        entityType: 'request',
        entityId: requestId,
        action: 'opportunity_published',
        changes: {
          requestId: requestId.toString(),
          requestType,
          farmId: request.farmId.toString(),
          visibility: RequestVisibility.public,
          publishedAt: publishedAt.toISOString(),
        },
      },
    });
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
    if (!current) {
      throw new BadRequestException('The opportunity owner is no longer an active owner of this farm');
    }
  }
}
