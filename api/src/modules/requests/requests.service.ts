import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma, Request } from '../../generated/prisma/client';
import {
  ForwardingStatus,
  OwnerDecision,
  RequestStaffAssignmentType,
  ReviewDecision,
  StaffRole,
} from '../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';
import { FarmAccessService } from '../authorization/farm-access.service';
import { StaffAuthorizationService } from '../authorization/staff-authorization.service';
import { staffHasAdminScope, StaffPermission } from '../authorization/staff-permissions';
import type { StaffContext } from '../authorization/staff.types';
import {
  FORWARDING_RECIPIENT_ROLES,
  SPECIALIZED_WORKFLOW_TYPES,
  specializedWorkflowMessage,
  staffInboxRequestTypes,
} from './request-workflow.policy';
import { DEFAULT_PAGE_SIZE } from '../farms/dto/list-farms-query.dto';
import type { AssignRequestStaffDto } from './dto/assign-request-staff.dto';
import type { DecideRequestReviewDto } from './dto/decide-request-review.dto';
import type { ForwardRequestDto } from './dto/forward-request.dto';
import type { ForwardingDecisionDto } from './dto/forwarding-decision.dto';
import type { ListRequestsQueryDto } from './dto/list-requests-query.dto';
import type {
  RequestListResponseDto,
  RequestResponseDto,
} from './dto/request-response.dto';
import type { ReviewRequestDocumentDto } from './dto/review-request-document.dto';
import type { StaffListRequestsQueryDto } from './dto/staff-list-requests-query.dto';
import type { TransitionRequestStatusDto } from './dto/transition-request-status.dto';
import type { WithdrawRequestDto } from './dto/withdraw-request.dto';

const notFound = (): NotFoundException => new NotFoundException('Request not found');

export const REQUEST_STATUS_DRAFT = 'draft';
export const REQUEST_STATUS_SUBMITTED = 'submitted';
export const REQUEST_STATUS_UNDER_REVIEW = 'underFarmExitReview';
export const REQUEST_STATUS_CHANGES_REQUESTED = 'changesRequested';
export const REQUEST_STATUS_APPROVED = 'approved';
export const REQUEST_STATUS_REJECTED = 'rejected';
export const REQUEST_STATUS_PUBLISHED = 'published';
export const REQUEST_STATUS_SENT_TO_OWNER = 'sentToOwner';
export const REQUEST_STATUS_ACCEPTED = 'accepted';
export const REQUEST_STATUS_DECLINED = 'declined';
export const REQUEST_STATUS_WITHDRAWN = 'withdrawn';
export const REQUEST_STATUS_CLOSED = 'closed';

const WITHDRAWABLE_STATUSES = new Set([
  REQUEST_STATUS_DRAFT,
  REQUEST_STATUS_SUBMITTED,
  REQUEST_STATUS_UNDER_REVIEW,
  REQUEST_STATUS_CHANGES_REQUESTED,
  'shortlisted',
]);

const FINAL_STATUSES = new Set([
  REQUEST_STATUS_PUBLISHED,
  REQUEST_STATUS_CLOSED,
  REQUEST_STATUS_REJECTED,
  REQUEST_STATUS_DECLINED,
  REQUEST_STATUS_WITHDRAWN,
]);

@Injectable()
export class RequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly staffAuth: StaffAuthorizationService,
    private readonly farmAccess: FarmAccessService,
  ) {}

  // ==========================================
  // USER-FACING ENDPOINTS
  // ==========================================

  /**
   * List caller's own requests with optional filtering.
   */
  async listMine(userId: bigint, query: ListRequestsQueryDto): Promise<RequestListResponseDto> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;

    const where: Prisma.RequestWhereInput = {
      createdBy: userId,
      ...(query.requestType ? { requestType: query.requestType } : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    const [total, rows] = await Promise.all([
      this.prisma.request.count({ where }),
      this.prisma.request.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const items = await this.presentMany(rows, false);
    return { items, page, pageSize, total };
  }

  /**
   * Retrieve a specific request owned by the caller.
   */
  async getMine(userId: bigint, requestId: bigint): Promise<RequestResponseDto> {
    const request = await this.prisma.request.findFirst({
      where: { id: requestId, createdBy: userId },
    });
    if (!request) {
      throw notFound();
    }

    const [item] = await this.presentMany([request], false);
    if (!item) throw notFound();
    return item;
  }

  /**
   * Submit a draft request into review.
   */
  async submitDraft(userId: bigint, requestId: bigint): Promise<RequestResponseDto> {
    const request = await this.prisma.request.findFirst({
      where: { id: requestId, createdBy: userId },
    });
    if (!request) throw notFound();

    if (request.status !== REQUEST_STATUS_DRAFT) {
      throw new ConflictException('Only draft requests can be submitted for review');
    }

    if (SPECIALIZED_WORKFLOW_TYPES.has(request.requestType)) {
      throw new BadRequestException(specializedWorkflowMessage(request.requestType));
    }

    const targetStatus = REQUEST_STATUS_SUBMITTED;

    const submittedAt = new Date();

    const updated = await this.prisma.$transaction(async (tx) => {
      const saved = await tx.request.update({
        where: { id: requestId },
        data: {
          status: targetStatus,
          submittedAt,
          updatedAt: submittedAt,
        },
      });

      await tx.requestStatusHistory.create({
        data: {
          requestId,
          fromStatus: REQUEST_STATUS_DRAFT,
          toStatus: targetStatus,
          changedBy: userId,
          reason: 'Submitted by requester',
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: userId,
          entityType: 'request',
          entityId: requestId,
          action: 'submitted',
          changes: { fromStatus: REQUEST_STATUS_DRAFT, toStatus: targetStatus },
        },
      });

      return saved;
    });

    const [item] = await this.presentMany([updated], false);
    return item;
  }

  /**
   * Withdraw a request when permitted by its workflow.
   */
  async withdraw(userId: bigint, requestId: bigint, dto: WithdrawRequestDto): Promise<RequestResponseDto> {
    const request = await this.prisma.request.findFirst({
      where: { id: requestId, createdBy: userId },
    });
    if (!request) throw notFound();

    if (!WITHDRAWABLE_STATUSES.has(request.status)) {
      throw new ConflictException(
        `Requests in '${request.status}' status cannot be withdrawn`,
      );
    }

    const closedAt = new Date();
    const reason = dto.reason?.trim() || 'Withdrawn by requester';

    const updated = await this.prisma.$transaction(async (tx) => {
      const saved = await tx.request.update({
        where: { id: requestId },
        data: {
          status: REQUEST_STATUS_WITHDRAWN,
          closedAt,
          updatedAt: closedAt,
        },
      });

      await tx.requestStatusHistory.create({
        data: {
          requestId,
          fromStatus: request.status,
          toStatus: REQUEST_STATUS_WITHDRAWN,
          changedBy: userId,
          reason,
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: userId,
          entityType: 'request',
          entityId: requestId,
          action: 'withdrawn',
          changes: { fromStatus: request.status, toStatus: REQUEST_STATUS_WITHDRAWN, reason },
        },
      });

      return saved;
    });

    const [item] = await this.presentMany([updated], false);
    return item;
  }

  // ==========================================
  // STAFF-FACING ENDPOINTS
  // ==========================================

  /**
   * Staff inbox for unified requests with filtering.
   */
  async listStaff(staffUserId: bigint, query: StaffListRequestsQueryDto): Promise<RequestListResponseDto> {
    const staff = await this.assertStaffWithPermission(staffUserId, StaffPermission.RequestsRead);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;

    const where: Prisma.RequestWhereInput = {
      ...(query.requestType ? { requestType: query.requestType } : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    if (query.createdFrom || query.createdTo) {
      where.createdAt = {
        ...(query.createdFrom ? { gte: new Date(query.createdFrom) } : {}),
        ...(query.createdTo ? { lte: new Date(query.createdTo) } : {}),
      };
    }

    // Role scoping
    const isAdmin = staffHasAdminScope(staff.roles);
    if (!isAdmin) {
      if (query.assignedStaffId && query.assignedStaffId !== staffUserId.toString()) {
        throw new ForbiddenException('Non-admin staff may only filter requests assigned to themselves');
      }

      // Reviewers and case agents see their assigned requests or unassigned submitted requests
      const assignedRows = await this.prisma.requestStaffAssignment.findMany({
        where: { assignedStaffId: staffUserId },
        select: { requestId: true },
      });
      const assignedIds = assignedRows.map((r) => r.requestId);

      const allowedTypes = staffInboxRequestTypes(staff);
      const unassigned: Prisma.RequestWhereInput = {
        staffAssignments: { none: {} },
        status: { notIn: [REQUEST_STATUS_DRAFT, REQUEST_STATUS_WITHDRAWN, REQUEST_STATUS_CLOSED] },
      };
      if (allowedTypes !== null) {
        if (allowedTypes.length === 0) {
          where.id = { in: assignedIds };
        } else {
          unassigned.requestType = { in: allowedTypes };
          where.OR = [{ id: { in: assignedIds } }, unassigned];
        }
      } else {
        where.OR = [{ id: { in: assignedIds } }, unassigned];
      }
    } else if (query.assignedStaffId) {
      const assignedRows = await this.prisma.requestStaffAssignment.findMany({
        where: { assignedStaffId: BigInt(query.assignedStaffId) },
        select: { requestId: true },
      });
      where.id = { in: assignedRows.map((r) => r.requestId) };
    }

    const [total, rows] = await Promise.all([
      this.prisma.request.count({ where }),
      this.prisma.request.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const items = await this.presentMany(rows, true);
    return { items, page, pageSize, total };
  }

  /**
   * Staff request details. Prevents unassigned staff from accessing restricted requests.
   */
  async getStaff(staffUserId: bigint, requestId: bigint): Promise<RequestResponseDto> {
    const staff = await this.assertStaffWithPermission(staffUserId, StaffPermission.RequestsRead);

    const request = await this.prisma.request.findUnique({
      where: { id: requestId },
    });
    if (!request) throw notFound();

    await this.assertStaffCanAccessRequest(staff, requestId);

    const [item] = await this.presentMany([request], true);
    if (!item) throw notFound();
    return item;
  }

  /**
   * Assign or reassign responsible staff slot on a request.
   * Admin only. Validates target staff membership and matching role.
   */
  async assignStaff(actorId: bigint, requestId: bigint, dto: AssignRequestStaffDto): Promise<RequestResponseDto> {
    const staff = await this.staffAuth.loadContext(actorId);
    if (!staff || !staffHasAdminScope(staff.roles)) {
      throw new ForbiddenException('Only administrators can assign or reassign staff');
    }

    const request = await this.prisma.request.findUnique({ where: { id: requestId } });
    if (!request) throw notFound();

    const targetStaffId = BigInt(dto.assignedStaffId);
    const targetStaff = await this.staffAuth.loadContext(targetStaffId);
    if (!targetStaff) {
      throw new BadRequestException('Target assignee is not an active FarmExit staff member');
    }

    if (dto.assignmentType === RequestStaffAssignmentType.reviewer) {
      if (!targetStaff.roles.includes(StaffRole.reviewer) && !staffHasAdminScope(targetStaff.roles)) {
        throw new BadRequestException('Target staff member does not hold the reviewer role');
      }
    } else if (dto.assignmentType === RequestStaffAssignmentType.caseAgent) {
      if (!targetStaff.roles.includes(StaffRole.caseAgent) && !staffHasAdminScope(targetStaff.roles)) {
        throw new BadRequestException('Target staff member does not hold the case agent role');
      }
    }

    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.requestStaffAssignment.findFirst({
        where: {
          requestId,
          assignmentType: dto.assignmentType,
        },
      });

      if (existing) {
        await tx.requestStaffAssignment.update({
          where: { id: existing.id },
          data: {
            assignedStaffId: targetStaffId,
            assignedByUserId: actorId,
            updatedAt: new Date(),
          },
        });
      } else {
        await tx.requestStaffAssignment.create({
          data: {
            requestId,
            assignmentType: dto.assignmentType,
            assignedStaffId: targetStaffId,
            assignedByUserId: actorId,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          actorUserId: actorId,
          entityType: 'request',
          entityId: requestId,
          action: 'staff_assigned',
          changes: {
            assignmentType: dto.assignmentType,
            assignedStaffId: targetStaffId.toString(),
            previousStaffId: existing ? existing.assignedStaffId.toString() : null,
          },
        },
      });
    });

    const [item] = await this.presentMany([request], true);
    return item;
  }

  /**
   * Record a staff review decision on a request.
   */
  async recordReview(actorId: bigint, requestId: bigint, dto: DecideRequestReviewDto): Promise<RequestResponseDto> {
    const staff = await this.assertStaffWithPermission(actorId, StaffPermission.RequestsReview);
    const request = await this.prisma.request.findUnique({ where: { id: requestId } });
    if (!request) throw notFound();

    if (SPECIALIZED_WORKFLOW_TYPES.has(request.requestType)) {
      throw new BadRequestException(specializedWorkflowMessage(request.requestType));
    }

    if (request.status === REQUEST_STATUS_DRAFT) {
      throw new ConflictException('Cannot review a draft request');
    }

    // Role check: Admin or assigned reviewer
    if (!staffHasAdminScope(staff.roles)) {
      if (!staff.roles.includes(StaffRole.reviewer)) {
        throw new ForbiddenException('Reviewers only');
      }
      const assignment = await this.prisma.requestStaffAssignment.findFirst({
        where: {
          requestId,
          assignedStaffId: actorId,
          assignmentType: RequestStaffAssignmentType.reviewer,
        },
      });
      if (!assignment) {
        throw new ForbiddenException('Only the assigned reviewer or an administrator may decide this review');
      }
    }

    const comment = dto.comment?.trim() || null;
    if (dto.decision !== ReviewDecision.approved && !comment) {
      throw new BadRequestException('A comment is required when requesting changes or rejecting a request');
    }

    const targetStatus =
      dto.targetStatus?.trim() ||
      (dto.decision === ReviewDecision.approved
        ? REQUEST_STATUS_APPROVED
        : dto.decision === ReviewDecision.changesRequested
          ? REQUEST_STATUS_CHANGES_REQUESTED
          : REQUEST_STATUS_REJECTED);

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.requestReview.create({
        data: {
          requestId,
          reviewerId: actorId,
          decision: dto.decision,
          comment,
        },
      });

      const saved = await tx.request.update({
        where: { id: requestId },
        data: {
          status: targetStatus,
          updatedAt: new Date(),
        },
      });

      await tx.requestStatusHistory.create({
        data: {
          requestId,
          fromStatus: request.status,
          toStatus: targetStatus,
          changedBy: actorId,
          reason: comment || `Review decision: ${dto.decision}`,
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: actorId,
          entityType: 'request',
          entityId: requestId,
          action: 'review_decided',
          changes: {
            decision: dto.decision,
            comment,
            fromStatus: request.status,
            toStatus: targetStatus,
          },
        },
      });

      return saved;
    });

    const [item] = await this.presentMany([updated], true);
    return item;
  }

  /**
   * Internal request forwarding mediated by FarmExit.
   * Direct requester-to-owner contact is strictly prohibited.
   */
  async forwardRequest(actorId: bigint, requestId: bigint, dto: ForwardRequestDto): Promise<RequestResponseDto> {
    const staff = await this.assertStaffWithPermission(actorId, StaffPermission.RequestsForward);
    const request = await this.prisma.request.findUnique({ where: { id: requestId } });
    if (!request) throw notFound();

    if (request.status === REQUEST_STATUS_DRAFT || FINAL_STATUSES.has(request.status)) {
      throw new ConflictException(`Cannot forward request in '${request.status}' status`);
    }

    await this.assertStaffMayMediateRequestForwarding(staff, actorId, requestId);

    const recipientUserId = BigInt(dto.recipientUserId);
    if (recipientUserId === request.createdBy) {
      throw new BadRequestException('Cannot forward request to the requester themselves');
    }

    const recipient = await this.prisma.user.findUnique({
      where: { id: recipientUserId },
      select: { id: true },
    });
    if (!recipient) {
      throw new BadRequestException('Recipient user does not exist');
    }

    if (!request.farmId) {
      throw new ConflictException('This request type cannot be forwarded to a farm owner');
    }
    const recipientIsOwner = await this.farmAccess.hasAnyRole(
      recipientUserId,
      request.farmId,
      FORWARDING_RECIPIENT_ROLES,
    );
    if (!recipientIsOwner) {
      throw new BadRequestException('Recipient must be an active owner of the request farm');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.requestForwarding.findFirst({
        where: { requestId, recipientUserId },
      });

      if (existing) {
        await tx.requestForwarding.update({
          where: { id: existing.id },
          data: {
            status: ForwardingStatus.sent,
            ownerDecision: OwnerDecision.pending,
            forwardedBy: actorId,
            decisionReason: null,
            decidedBy: null,
            decidedAt: null,
          },
        });
      } else {
        await tx.requestForwarding.create({
          data: {
            requestId,
            recipientUserId,
            forwardedBy: actorId,
            status: ForwardingStatus.sent,
            ownerDecision: OwnerDecision.pending,
          },
        });
      }

      const targetStatus = REQUEST_STATUS_SENT_TO_OWNER;
      const saved = await tx.request.update({
        where: { id: requestId },
        data: {
          status: targetStatus,
          updatedAt: new Date(),
        },
      });

      await tx.requestStatusHistory.create({
        data: {
          requestId,
          fromStatus: request.status,
          toStatus: targetStatus,
          changedBy: actorId,
          reason: 'Forwarded to recipient party by FarmExit staff',
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: actorId,
          entityType: 'request',
          entityId: requestId,
          action: 'request_forwarded',
          changes: {
            recipientUserId: recipientUserId.toString(),
            internalNotes: dto.internalNotes?.trim() || null,
          },
        },
      });

      return saved;
    });

    const [item] = await this.presentMany([updated], true);
    return item;
  }

  /**
   * Record owner decision on a forwarded request.
   * Can be performed by the recipient owner or staff recording the mediated decision.
   */
  async recordForwardingDecision(
    actorOrOwnerId: bigint,
    requestId: bigint,
    forwardingId: bigint,
    dto: ForwardingDecisionDto,
  ): Promise<RequestResponseDto> {
    const forwarding = await this.prisma.requestForwarding.findFirst({
      where: { id: forwardingId, requestId },
    });
    if (!forwarding) {
      throw new NotFoundException('Forwarding record not found');
    }

    const isRecipient = forwarding.recipientUserId === actorOrOwnerId;
    if (!isRecipient) {
      const staff = await this.assertStaffWithPermission(actorOrOwnerId, StaffPermission.RequestsForward);
      await this.assertStaffMayMediateRequestForwarding(staff, actorOrOwnerId, requestId);
    }

    if (!this.isForwardingEligibleForFirstDecision(forwarding)) {
      throw new ConflictException('Forwarding decision has already been recorded or forwarding is not eligible');
    }

    const targetStatus =
      dto.decision === OwnerDecision.accepted ? REQUEST_STATUS_ACCEPTED : REQUEST_STATUS_DECLINED;
    const decidedAt = new Date();
    const reason = dto.reason?.trim() || `Owner decision: ${dto.decision}`;

    const updated = await this.prisma.$transaction(async (tx) => {
      const applied = await tx.requestForwarding.updateMany({
        where: {
          id: forwardingId,
          requestId,
          status: { in: [ForwardingStatus.sent, ForwardingStatus.viewed] },
          OR: [{ ownerDecision: null }, { ownerDecision: OwnerDecision.pending }],
        },
        data: {
          ownerDecision: dto.decision,
          decisionReason: dto.reason?.trim() || null,
          decidedBy: actorOrOwnerId,
          decidedAt,
          status: ForwardingStatus.decided,
        },
      });
      if (applied.count !== 1) {
        throw new ConflictException('Forwarding decision has already been recorded or forwarding is not eligible');
      }

      const request = await tx.request.findUnique({ where: { id: requestId } });
      if (!request) throw notFound();

      const saved = await tx.request.update({
        where: { id: requestId },
        data: {
          status: targetStatus,
          updatedAt: decidedAt,
        },
      });

      await tx.requestStatusHistory.create({
        data: {
          requestId,
          fromStatus: request.status,
          toStatus: targetStatus,
          changedBy: actorOrOwnerId,
          reason,
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: actorOrOwnerId,
          entityType: 'request_forwarding',
          entityId: forwardingId,
          action: 'forwarding_decided',
          changes: {
            decision: dto.decision,
            reason: dto.reason || null,
          },
        },
      });

      return saved;
    });

    const [item] = await this.presentMany([updated], true);
    return item;
  }

  /**
   * Controlled request status transition by authorized staff.
   */
  async transitionStatus(
    actorId: bigint,
    requestId: bigint,
    dto: TransitionRequestStatusDto,
  ): Promise<RequestResponseDto> {
    const staff = await this.assertStaffWithPermission(actorId, StaffPermission.RequestsReview);
    const request = await this.prisma.request.findUnique({ where: { id: requestId } });
    if (!request) throw notFound();

    if (SPECIALIZED_WORKFLOW_TYPES.has(request.requestType)) {
      throw new BadRequestException(specializedWorkflowMessage(request.requestType));
    }

    const targetStatus = dto.status.trim();
    if (targetStatus === request.status) {
      const [item] = await this.presentMany([request], true);
      return item;
    }

    // Validate valid transitions
    if (FINAL_STATUSES.has(request.status) && !staffHasAdminScope(staff.roles)) {
      throw new ConflictException(`Cannot transition request from final status '${request.status}'`);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const saved = await tx.request.update({
        where: { id: requestId },
        data: {
          status: targetStatus,
          updatedAt: new Date(),
          ...(targetStatus === REQUEST_STATUS_CLOSED || targetStatus === REQUEST_STATUS_WITHDRAWN
            ? { closedAt: new Date() }
            : {}),
        },
      });

      await tx.requestStatusHistory.create({
        data: {
          requestId,
          fromStatus: request.status,
          toStatus: targetStatus,
          changedBy: actorId,
          reason: dto.reason?.trim() || `Status updated to ${targetStatus}`,
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: actorId,
          entityType: 'request',
          entityId: requestId,
          action: 'status_transitioned',
          changes: { fromStatus: request.status, toStatus: targetStatus, reason: dto.reason || null },
        },
      });

      return saved;
    });

    const [item] = await this.presentMany([updated], true);
    return item;
  }

  /**
   * Review a document attached to a request.
   * Enforces request-level document access to prevent cross-request leakage.
   */
  async reviewDocument(
    actorId: bigint,
    requestId: bigint,
    documentId: bigint,
    dto: ReviewRequestDocumentDto,
  ): Promise<RequestResponseDto> {
    await this.assertStaffWithPermission(actorId, StaffPermission.RequestsReview);

    const doc = await this.prisma.requestDocument.findUnique({
      where: { id: documentId },
    });
    if (!doc || doc.requestId !== requestId) {
      throw new NotFoundException('Document does not belong to this request');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.requestDocument.update({
        where: { id: documentId },
        data: {
          reviewStatus: dto.reviewStatus.trim(),
          reviewedBy: actorId,
          reviewedAt: new Date(),
          reviewNote: dto.reviewNote?.trim() || null,
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: actorId,
          entityType: 'request_document',
          entityId: documentId,
          action: 'document_reviewed',
          changes: {
            requestId: requestId.toString(),
            reviewStatus: dto.reviewStatus.trim(),
            reviewNote: dto.reviewNote?.trim() || null,
          },
        },
      });
    });

    const request = await this.prisma.request.findUnique({ where: { id: requestId } });
    if (!request) throw notFound();

    const [item] = await this.presentMany([request], true);
    return item;
  }

  // ==========================================
  // HELPER & PRESENTATION METHODS
  // ==========================================

  private async assertStaffWithPermission(userId: bigint, permission: StaffPermission): Promise<StaffContext> {
    const staff = await this.staffAuth.loadContext(userId);
    if (!staff || !staff.permissions.includes(permission)) {
      throw new ForbiddenException(`Active staff membership with '${permission}' permission required`);
    }
    return staff;
  }

  private async assertStaffMayMediateRequestForwarding(
    staff: StaffContext,
    actorId: bigint,
    requestId: bigint,
  ): Promise<void> {
    if (staffHasAdminScope(staff.roles)) return;

    if (!staff.roles.includes(StaffRole.caseAgent)) {
      throw new ForbiddenException('Case agents only');
    }

    const assignment = await this.prisma.requestStaffAssignment.findFirst({
      where: {
        requestId,
        assignedStaffId: actorId,
        assignmentType: RequestStaffAssignmentType.caseAgent,
      },
    });
    if (!assignment) {
      throw new ForbiddenException('Only the assigned case agent or an administrator may forward this request');
    }
  }

  private isForwardingEligibleForFirstDecision(forwarding: {
    status: ForwardingStatus;
    ownerDecision: OwnerDecision | null;
  }): boolean {
    const openStatus =
      forwarding.status === ForwardingStatus.sent || forwarding.status === ForwardingStatus.viewed;
    const pendingDecision =
      forwarding.ownerDecision === null || forwarding.ownerDecision === OwnerDecision.pending;
    return openStatus && pendingDecision;
  }

  private async assertStaffCanAccessRequest(staff: StaffContext, requestId: bigint): Promise<void> {
    if (staffHasAdminScope(staff.roles)) return;

    const assignment = await this.prisma.requestStaffAssignment.findFirst({
      where: {
        requestId,
        assignedStaffId: staff.userId,
      },
    });

    if (assignment) return;

    // Check if request is currently unassigned and in a reviewable status
    const allAssignments = await this.prisma.requestStaffAssignment.findMany({
      where: { requestId },
      select: { id: true },
    });

    if (allAssignments.length === 0) {
      const request = await this.prisma.request.findUnique({
        where: { id: requestId },
        select: { requestType: true },
      });
      if (!request) throw notFound();
      const allowedTypes = staffInboxRequestTypes(staff);
      if (allowedTypes !== null && !allowedTypes.includes(request.requestType)) {
        throw new ForbiddenException('Not authorized for this request type');
      }
      return;
    }

    throw new ForbiddenException('This request is assigned to another staff member');
  }

  private async presentMany(requests: Request[], isStaff: boolean): Promise<RequestResponseDto[]> {
    if (requests.length === 0) return [];

    const requestIds = requests.map((r) => r.id);
    const farmIds = requests.map((r) => r.farmId).filter((id): id is bigint => id !== null);
    const creatorIds = requests.map((r) => r.createdBy);

    const [farms, creators, assignments, statusHistories, reviews, forwardings, documents] =
      await Promise.all([
        this.prisma.farm.findMany({
          where: { id: { in: farmIds } },
          select: { id: true, name: true, governorate: true },
        }),
        this.prisma.user.findMany({
          where: { id: { in: creatorIds } },
          select: { id: true, fullName: true },
        }),
        this.prisma.requestStaffAssignment.findMany({
          where: { requestId: { in: requestIds } },
          include: { assignee: { select: { id: true, fullName: true } } },
        }),
        this.prisma.requestStatusHistory.findMany({
          where: { requestId: { in: requestIds } },
          orderBy: { createdAt: 'desc' },
          include: { changer: { select: { id: true, fullName: true } } },
        }),
        this.prisma.requestReview.findMany({
          where: { requestId: { in: requestIds } },
          orderBy: { createdAt: 'desc' },
          include: { reviewer: { select: { id: true, fullName: true } } },
        }),
        this.prisma.requestForwarding.findMany({
          where: { requestId: { in: requestIds } },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.requestDocument.findMany({
          where: { requestId: { in: requestIds } },
          orderBy: { createdAt: 'desc' },
        }),
      ]);

    const farmMap = new Map(farms.map((f) => [f.id, f]));
    const creatorMap = new Map(creators.map((c) => [c.id, c]));

    const assignmentsByReq = new Map<bigint, typeof assignments>();
    for (const a of assignments) {
      const list = assignmentsByReq.get(a.requestId) ?? [];
      list.push(a);
      assignmentsByReq.set(a.requestId, list);
    }

    const historiesByReq = new Map<bigint, typeof statusHistories>();
    for (const h of statusHistories) {
      const list = historiesByReq.get(h.requestId) ?? [];
      list.push(h);
      historiesByReq.set(h.requestId, list);
    }

    const reviewsByReq = new Map<bigint, typeof reviews>();
    for (const r of reviews) {
      const list = reviewsByReq.get(r.requestId) ?? [];
      list.push(r);
      reviewsByReq.set(r.requestId, list);
    }

    const forwardingsByReq = new Map<bigint, typeof forwardings>();
    for (const f of forwardings) {
      const list = forwardingsByReq.get(f.requestId) ?? [];
      list.push(f);
      forwardingsByReq.set(f.requestId, list);
    }

    const documentsByReq = new Map<bigint, typeof documents>();
    for (const d of documents) {
      const list = documentsByReq.get(d.requestId) ?? [];
      list.push(d);
      documentsByReq.set(d.requestId, list);
    }

    return requests.map((req) => {
      const farm = req.farmId ? farmMap.get(req.farmId) : null;
      const creator = creatorMap.get(req.createdBy);
      const reqAssignments = assignmentsByReq.get(req.id) ?? [];
      const reqHistories = historiesByReq.get(req.id) ?? [];
      const reqReviews = reviewsByReq.get(req.id) ?? [];
      const reqForwardings = forwardingsByReq.get(req.id) ?? [];
      const reqDocs = documentsByReq.get(req.id) ?? [];

      return {
        id: req.id.toString(),
        requestNumber: req.requestNumber,
        requestType: req.requestType,
        status: req.status,
        visibility: req.visibility,
        currentStep: req.currentStep,
        submittedAt: req.submittedAt ? req.submittedAt.toISOString() : null,
        publishedAt: req.publishedAt ? req.publishedAt.toISOString() : null,
        closedAt: req.closedAt ? req.closedAt.toISOString() : null,
        createdAt: req.createdAt ? req.createdAt.toISOString() : new Date().toISOString(),
        updatedAt: req.updatedAt ? req.updatedAt.toISOString() : new Date().toISOString(),
        farm: farm
          ? {
              id: farm.id.toString(),
              name: farm.name,
              governorate: farm.governorate,
            }
          : null,
        creator: {
          id: req.createdBy.toString(),
          fullName: creator?.fullName ?? null,
        },
        parentRequestId: req.parentRequestId ? req.parentRequestId.toString() : null,
        assignments: isStaff
          ? reqAssignments.map((a) => ({
              id: a.id.toString(),
              assignmentType: a.assignmentType,
              assignedStaffId: a.assignedStaffId.toString(),
              staffName: a.assignee?.fullName ?? null,
              assignedAt: a.assignedAt.toISOString(),
            }))
          : [],
        statusHistory: reqHistories.map((h) => ({
          id: h.id.toString(),
          fromStatus: h.fromStatus,
          toStatus: h.toStatus,
          changedBy: h.changedBy.toString(),
          changerName: isStaff ? h.changer?.fullName ?? null : null,
          reason: h.reason,
          createdAt: h.createdAt ? h.createdAt.toISOString() : null,
        })),
        reviews: reqReviews.map((r) => ({
          id: r.id.toString(),
          reviewerId: r.reviewerId.toString(),
          reviewerName: isStaff ? r.reviewer?.fullName ?? null : null,
          decision: r.decision,
          comment: r.comment,
          createdAt: r.createdAt ? r.createdAt.toISOString() : null,
        })),
        forwardings: isStaff
          ? reqForwardings.map((f) => ({
              id: f.id.toString(),
              recipientUserId: f.recipientUserId.toString(),
              status: f.status,
              ownerDecision: f.ownerDecision,
              decisionReason: f.decisionReason,
              createdAt: f.createdAt ? f.createdAt.toISOString() : null,
              decidedAt: f.decidedAt ? f.decidedAt.toISOString() : null,
            }))
          : [],
        documents: reqDocs.map((d) => ({
          id: d.id.toString(),
          slotKey: d.slotKey,
          documentType: d.documentType,
          originalName: d.originalName,
          mimeType: d.mimeType,
          fileSizeBytes: d.fileSizeBytes ? d.fileSizeBytes.toString() : null,
          reviewStatus: d.reviewStatus,
          reviewNote: d.reviewNote,
          createdAt: d.createdAt ? d.createdAt.toISOString() : null,
        })),
      };
    });
  }
}
