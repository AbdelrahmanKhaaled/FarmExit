import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type FarmEvaluation, type FarmEvaluationCheck } from '../../generated/prisma/client';
import {
  EvaluationCheckStatus,
  EvaluationStatus,
  RequestStaffAssignmentType,
  RequestType,
  StaffRole,
} from '../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';
import { StaffAuthorizationService } from '../authorization/staff-authorization.service';
import { StaffPermission } from '../authorization/staff-permissions';
import type { StaffContext } from '../authorization/staff.types';
import { DEFAULT_PAGE_SIZE } from '../farms/dto/list-farms-query.dto';
import type { CreateEvaluationDto } from './dto/create-evaluation.dto';
import type {
  EvaluationCheckResponseDto,
  EvaluationListResponseDto,
  EvaluationResponseDto,
} from './dto/evaluation-response.dto';
import type { ListEvaluationsQueryDto } from './dto/list-evaluations-query.dto';
import type { RecordEvaluationCheckDto } from './dto/record-evaluation-check.dto';
import type { UpdateEvaluationDto } from './dto/update-evaluation.dto';

type EvaluationWithDetails = FarmEvaluation & {
  reviewer: { id: bigint; fullName: string | null };
  approver: { id: bigint; fullName: string | null } | null;
  checks: FarmEvaluationCheck[];
};

@Injectable()
export class EvaluationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly staffAuth: StaffAuthorizationService,
  ) {}

  /**
   * Create an internal FarmExit evaluation for a specific farm.
   * Admin can create directly on any farm. Reviewers require an assigned listing request.
   */
  async create(staffUserId: bigint, farmId: bigint, dto: CreateEvaluationDto): Promise<EvaluationResponseDto> {
    const staff = await this.assertStaffWithPermission(staffUserId);
    await this.assertFarmActive(farmId);

    const listingRequestId = dto.listingRequestId ? BigInt(dto.listingRequestId) : null;
    await this.assertReviewerAuthorizedForCreate(staff, farmId, listingRequestId);

    this.validateScore(dto.scoreValue, dto.scoreMax);

    if (dto.checks?.length) {
      for (const check of dto.checks) {
        if (check.evidenceDocumentId) {
          await this.assertEvidenceDocumentValid(BigInt(check.evidenceDocumentId), listingRequestId);
        }
      }
    }

    const evaluation = await this.prisma.$transaction(async (tx) => {
      const initialStatus = dto.status ?? EvaluationStatus.draft;
      const created = await tx.farmEvaluation.create({
        data: {
          farmId,
          listingRequestId,
          reviewedBy: staffUserId,
          scoreValue: dto.scoreValue !== undefined && dto.scoreValue !== null ? new Prisma.Decimal(dto.scoreValue) : null,
          scoreMax: dto.scoreMax !== undefined && dto.scoreMax !== null ? new Prisma.Decimal(dto.scoreMax) : null,
          methodologyName: dto.methodologyName?.trim() || null,
          methodologyVersion: dto.methodologyVersion?.trim() || null,
          reviewScopeEn: dto.reviewScopeEn?.trim() || null,
          reviewScopeAr: dto.reviewScopeAr?.trim() || null,
          publicSummaryEn: dto.publicSummaryEn?.trim() || null,
          publicSummaryAr: dto.publicSummaryAr?.trim() || null,
          internalNotes: dto.internalNotes?.trim() || null,
          status: initialStatus,
          reviewedAt: initialStatus === EvaluationStatus.inReview ? new Date() : null,
          checks: dto.checks?.length
            ? {
                create: dto.checks.map((c) => ({
                  checkKey: c.checkKey.trim(),
                  checkStatus: c.checkStatus ?? EvaluationCheckStatus.notReviewed,
                  evidenceDocumentId: c.evidenceDocumentId ? BigInt(c.evidenceDocumentId) : null,
                  reviewerNotes: c.reviewerNotes?.trim() || null,
                  reviewedAt: c.checkStatus && c.checkStatus !== EvaluationCheckStatus.notReviewed ? new Date() : null,
                })),
              }
            : undefined,
        },
        include: {
          reviewer: { select: { id: true, fullName: true } },
          approver: { select: { id: true, fullName: true } },
          checks: true,
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: staffUserId,
          entityType: 'farm_evaluation',
          entityId: created.id,
          action: 'created',
          changes: {
            farmId: farmId.toString(),
            listingRequestId: listingRequestId?.toString() ?? null,
            status: created.status,
            scoreValue: created.scoreValue ? created.scoreValue.toNumber() : null,
            scoreMax: created.scoreMax ? created.scoreMax.toNumber() : null,
            checksCount: dto.checks?.length ?? 0,
          },
        },
      });

      return created;
    });

    return this.present(evaluation);
  }

  /**
   * Retrieve evaluation details by ID for a specific farm.
   */
  async get(staffUserId: bigint, farmId: bigint, evaluationId: bigint): Promise<EvaluationResponseDto> {
    const staff = await this.assertStaffWithPermission(staffUserId);
    await this.assertFarmActive(farmId);

    const evaluation = await this.prisma.farmEvaluation.findFirst({
      where: { id: evaluationId, farmId },
      include: {
        reviewer: { select: { id: true, fullName: true } },
        approver: { select: { id: true, fullName: true } },
        checks: { orderBy: { id: 'asc' } },
      },
    });

    if (!evaluation) {
      throw new NotFoundException('Evaluation not found');
    }

    await this.assertStaffAuthorizedForRead(staff, farmId, evaluation);

    return this.present(evaluation);
  }

  /**
   * Retrieve the latest evaluation for a farm.
   */
  async getLatest(staffUserId: bigint, farmId: bigint): Promise<EvaluationResponseDto> {
    const staff = await this.assertStaffWithPermission(staffUserId);
    await this.assertFarmActive(farmId);
    await this.assertStaffAuthorizedForRead(staff, farmId);

    const evaluation = await this.prisma.farmEvaluation.findFirst({
      where: { farmId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: {
        reviewer: { select: { id: true, fullName: true } },
        approver: { select: { id: true, fullName: true } },
        checks: { orderBy: { id: 'asc' } },
      },
    });

    if (!evaluation) {
      throw new NotFoundException('No evaluation found for this farm');
    }

    return this.present(evaluation);
  }

  /**
   * Retrieve paginated evaluation history for a farm.
   */
  async listHistory(
    staffUserId: bigint,
    farmId: bigint,
    query: ListEvaluationsQueryDto,
  ): Promise<EvaluationListResponseDto> {
    const staff = await this.assertStaffWithPermission(staffUserId);
    await this.assertFarmActive(farmId);
    await this.assertStaffAuthorizedForRead(staff, farmId);

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
    const where: Prisma.FarmEvaluationWhereInput = {
      farmId,
      ...(query.status ? { status: query.status } : {}),
    };

    const [total, rows] = await Promise.all([
      this.prisma.farmEvaluation.count({ where }),
      this.prisma.farmEvaluation.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          reviewer: { select: { id: true, fullName: true } },
          approver: { select: { id: true, fullName: true } },
          checks: { orderBy: { id: 'asc' } },
        },
      }),
    ]);

    return {
      items: rows.map((r) => this.present(r)),
      page,
      pageSize,
      total,
    };
  }

  /**
   * Update an incomplete evaluation (in draft or in_review status only).
   */
  async update(
    staffUserId: bigint,
    farmId: bigint,
    evaluationId: bigint,
    dto: UpdateEvaluationDto,
  ): Promise<EvaluationResponseDto> {
    const staff = await this.assertStaffWithPermission(staffUserId);
    await this.assertFarmActive(farmId);

    const evaluation = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.farmEvaluation.findFirst({
        where: { id: evaluationId, farmId },
        include: {
          reviewer: { select: { id: true, fullName: true } },
          approver: { select: { id: true, fullName: true } },
          checks: { orderBy: { id: 'asc' } },
        },
      });

      if (!existing) {
        throw new NotFoundException('Evaluation not found');
      }

      await this.assertStaffAuthorizedForEdit(staff, existing);

      if (
        existing.status !== EvaluationStatus.draft &&
        existing.status !== EvaluationStatus.inReview
      ) {
        throw new ConflictException(
          'Only incomplete evaluations in draft or in_review status can be modified. Completed, historical, or published assessments are immutable.',
        );
      }

      // Determine effective score
      const newScoreValue = dto.scoreValue !== undefined ? dto.scoreValue : (existing.scoreValue ? existing.scoreValue.toNumber() : null);
      const newScoreMax = dto.scoreMax !== undefined ? dto.scoreMax : (existing.scoreMax ? existing.scoreMax.toNumber() : null);
      this.validateScore(newScoreValue, newScoreMax);

      const data: Prisma.FarmEvaluationUncheckedUpdateInput = {};

      if (dto.scoreValue !== undefined) {
        data.scoreValue = dto.scoreValue !== null ? new Prisma.Decimal(dto.scoreValue) : null;
      }
      if (dto.scoreMax !== undefined) {
        data.scoreMax = dto.scoreMax !== null ? new Prisma.Decimal(dto.scoreMax) : null;
      }
      if (dto.methodologyName !== undefined) {
        data.methodologyName = dto.methodologyName?.trim() || null;
      }
      if (dto.methodologyVersion !== undefined) {
        data.methodologyVersion = dto.methodologyVersion?.trim() || null;
      }
      if (dto.reviewScopeEn !== undefined) {
        data.reviewScopeEn = dto.reviewScopeEn?.trim() || null;
      }
      if (dto.reviewScopeAr !== undefined) {
        data.reviewScopeAr = dto.reviewScopeAr?.trim() || null;
      }
      if (dto.publicSummaryEn !== undefined) {
        data.publicSummaryEn = dto.publicSummaryEn?.trim() || null;
      }
      if (dto.publicSummaryAr !== undefined) {
        data.publicSummaryAr = dto.publicSummaryAr?.trim() || null;
      }
      if (dto.internalNotes !== undefined) {
        data.internalNotes = dto.internalNotes?.trim() || null;
      }

      // Handle status transition
      if (dto.status && dto.status !== existing.status) {
        await this.handleStatusTransition(staff, existing, dto.status, data, tx, farmId);
      }

      const updated = await tx.farmEvaluation.update({
        where: { id: evaluationId },
        data,
        include: {
          reviewer: { select: { id: true, fullName: true } },
          approver: { select: { id: true, fullName: true } },
          checks: { orderBy: { id: 'asc' } },
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: staffUserId,
          entityType: 'farm_evaluation',
          entityId: evaluationId,
          action: dto.status && dto.status !== existing.status ? `status_${dto.status}` : 'updated',
          changes: {
            fromStatus: existing.status,
            toStatus: updated.status,
            farmId: farmId.toString(),
            scoreValue: updated.scoreValue ? updated.scoreValue.toNumber() : null,
            scoreMax: updated.scoreMax ? updated.scoreMax.toNumber() : null,
          },
        },
      });

      return updated;
    });

    return this.present(evaluation);
  }

  /**
   * Record or update a check on an incomplete evaluation.
   */
  async recordCheck(
    staffUserId: bigint,
    farmId: bigint,
    evaluationId: bigint,
    dto: RecordEvaluationCheckDto,
  ): Promise<EvaluationCheckResponseDto> {
    const staff = await this.assertStaffWithPermission(staffUserId);
    await this.assertFarmActive(farmId);

    const check = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.farmEvaluation.findFirst({
        where: { id: evaluationId, farmId },
      });

      if (!existing) {
        throw new NotFoundException('Evaluation not found');
      }

      await this.assertStaffAuthorizedForEdit(staff, existing);

      if (
        existing.status !== EvaluationStatus.draft &&
        existing.status !== EvaluationStatus.inReview
      ) {
        throw new ConflictException('Cannot record checks on a locked or completed evaluation');
      }

      const evidenceDocId = dto.evidenceDocumentId ? BigInt(dto.evidenceDocumentId) : null;
      if (evidenceDocId) {
        await this.assertEvidenceDocumentValid(evidenceDocId, existing.listingRequestId);
      }

      const checkKey = dto.checkKey.trim();
      const checkStatus = dto.checkStatus ?? EvaluationCheckStatus.notReviewed;
      const reviewedAt = checkStatus !== EvaluationCheckStatus.notReviewed ? new Date() : null;

      const upserted = await tx.farmEvaluationCheck.upsert({
        where: {
          evaluationId_checkKey: {
            evaluationId,
            checkKey,
          },
        },
        create: {
          evaluationId,
          checkKey,
          checkStatus,
          evidenceDocumentId: evidenceDocId,
          reviewerNotes: dto.reviewerNotes?.trim() || null,
          reviewedAt,
        },
        update: {
          checkStatus,
          evidenceDocumentId: evidenceDocId,
          reviewerNotes: dto.reviewerNotes !== undefined ? dto.reviewerNotes?.trim() || null : undefined,
          reviewedAt,
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: staffUserId,
          entityType: 'farm_evaluation',
          entityId: evaluationId,
          action: 'check_recorded',
          changes: {
            checkKey,
            checkStatus: upserted.checkStatus,
            evidenceDocumentId: evidenceDocId?.toString() ?? null,
          },
        },
      });

      return upserted;
    });

    return this.presentCheck(check);
  }

  // ==========================================
  // HELPER & VALIDATION METHODS
  // ==========================================

  private async assertStaffWithPermission(userId: bigint): Promise<StaffContext> {
    const staff = await this.staffAuth.loadContext(userId);
    if (!staff || !staff.permissions.includes(StaffPermission.EvaluationsManage)) {
      throw new ForbiddenException('Active FarmExit staff with evaluations.manage permission required');
    }
    return staff;
  }

  private async assertFarmActive(farmId: bigint): Promise<void> {
    const farm = await this.prisma.farm.findFirst({
      where: { id: farmId, deletedAt: null },
      select: { id: true },
    });
    if (!farm) {
      throw new NotFoundException('Farm not found');
    }
  }

  private async assertReviewerAuthorizedForCreate(
    staff: StaffContext,
    farmId: bigint,
    listingRequestId: bigint | null,
  ): Promise<void> {
    if (staff.roles.includes(StaffRole.admin)) {
      return;
    }

    if (staff.roles.includes(StaffRole.reviewer)) {
      if (!listingRequestId) {
        throw new ForbiddenException(
          'Reviewers require an assigned listing request for this farm to create an evaluation. Direct unassigned farm evaluations require admin privileges.',
        );
      }

      const request = await this.prisma.request.findFirst({
        where: { id: listingRequestId, farmId, requestType: RequestType.farmListing },
        select: { id: true },
      });

      if (!request) {
        throw new BadRequestException('Listing request does not exist or does not belong to this farm');
      }

      const assignment = await this.prisma.requestStaffAssignment.findFirst({
        where: {
          requestId: listingRequestId,
          assignedStaffId: staff.userId,
          assignmentType: RequestStaffAssignmentType.reviewer,
        },
      });

      if (!assignment) {
        throw new ForbiddenException('Reviewer is not assigned to this listing request');
      }
      return;
    }

    throw new ForbiddenException('Forbidden');
  }

  private async assertStaffAuthorizedForEdit(
    staff: StaffContext,
    evaluation: { reviewedBy: bigint; listingRequestId: bigint | null },
  ): Promise<void> {
    if (staff.roles.includes(StaffRole.admin)) {
      return;
    }

    if (staff.roles.includes(StaffRole.reviewer)) {
      if (evaluation.reviewedBy === staff.userId) {
        return;
      }
      if (evaluation.listingRequestId) {
        const assignment = await this.prisma.requestStaffAssignment.findFirst({
          where: {
            requestId: evaluation.listingRequestId,
            assignedStaffId: staff.userId,
            assignmentType: RequestStaffAssignmentType.reviewer,
          },
        });
        if (assignment) return;
      }
      throw new ForbiddenException('Reviewer is not authorized to edit this evaluation');
    }

    throw new ForbiddenException('Forbidden');
  }

  private async assertStaffAuthorizedForRead(
    staff: StaffContext,
    farmId: bigint,
    evaluation?: { listingRequestId: bigint | null; reviewedBy: bigint },
  ): Promise<void> {
    if (staff.roles.includes(StaffRole.admin)) {
      return;
    }

    if (staff.roles.includes(StaffRole.reviewer)) {
      if (evaluation && evaluation.reviewedBy === staff.userId) {
        return;
      }
      if (evaluation?.listingRequestId) {
        const specificAssignment = await this.prisma.requestStaffAssignment.findFirst({
          where: {
            requestId: evaluation.listingRequestId,
            assignedStaffId: staff.userId,
            assignmentType: RequestStaffAssignmentType.reviewer,
          },
          select: { id: true },
        });
        if (specificAssignment) {
          return;
        }
      }

      const listingRequests = await this.prisma.request.findMany({
        where: { farmId, requestType: RequestType.farmListing },
        select: { id: true },
      });

      if (listingRequests.length > 0) {
        const farmAssignment = await this.prisma.requestStaffAssignment.findFirst({
          where: {
            requestId: { in: listingRequests.map((r) => r.id) },
            assignedStaffId: staff.userId,
            assignmentType: RequestStaffAssignmentType.reviewer,
          },
          select: { id: true },
        });

        if (farmAssignment) {
          return;
        }
      }

      throw new ForbiddenException(
        'Reviewers may only access evaluations for farms where they have an authorized listing assignment',
      );
    }

    throw new ForbiddenException('Forbidden');
  }

  private validateScore(scoreValue?: number | null, scoreMax?: number | null): void {
    if (scoreValue !== undefined && scoreValue !== null) {
      if (scoreValue < 0) {
        throw new BadRequestException('scoreValue cannot be negative');
      }
      if (scoreMax === undefined || scoreMax === null) {
        throw new BadRequestException('scoreMax is required when scoreValue is provided');
      }
    }

    if (scoreMax !== undefined && scoreMax !== null) {
      if (scoreMax <= 0) {
        throw new BadRequestException('scoreMax must be greater than zero');
      }
      if (scoreValue !== undefined && scoreValue !== null && scoreValue > scoreMax) {
        throw new BadRequestException('scoreValue cannot exceed scoreMax');
      }
    }
  }

  private async assertEvidenceDocumentValid(docId: bigint, listingRequestId: bigint | null): Promise<void> {
    const doc = await this.prisma.requestDocument.findUnique({
      where: { id: docId },
      select: { id: true, requestId: true },
    });
    if (!doc) {
      throw new BadRequestException(`Evidence document #${docId} does not exist`);
    }
    if (listingRequestId && doc.requestId !== listingRequestId) {
      throw new BadRequestException(`Evidence document #${docId} belongs to a different request`);
    }
  }

  private async handleStatusTransition(
    staff: StaffContext,
    existing: FarmEvaluation,
    targetStatus: EvaluationStatus,
    data: Prisma.FarmEvaluationUncheckedUpdateInput,
    tx: Prisma.TransactionClient,
    farmId: bigint,
  ): Promise<void> {
    if (targetStatus === EvaluationStatus.approved || targetStatus === EvaluationStatus.published) {
      if (!staff.roles.includes(StaffRole.admin)) {
        throw new ForbiddenException('Only administrators can approve or publish farm evaluations');
      }
    }

    data.status = targetStatus;

    if (targetStatus === EvaluationStatus.inReview && !existing.reviewedAt) {
      data.reviewedAt = new Date();
    }

    if (targetStatus === EvaluationStatus.approved) {
      data.approvedBy = staff.userId;
      data.approvedAt = new Date();
      if (!existing.reviewedAt) {
        data.reviewedAt = new Date();
      }
    }

    if (targetStatus === EvaluationStatus.published) {
      data.publishedAt = new Date();
      if (!existing.approvedBy) {
        data.approvedBy = staff.userId;
        data.approvedAt = new Date();
      }
      if (!existing.reviewedAt) {
        data.reviewedAt = new Date();
      }
      // When publishing, any previously published evaluations for this farm become superseded
      await tx.farmEvaluation.updateMany({
        where: {
          farmId,
          status: EvaluationStatus.published,
          id: { not: existing.id },
        },
        data: { status: EvaluationStatus.superseded },
      });
    }
  }

  private present(evaluation: EvaluationWithDetails): EvaluationResponseDto {
    return {
      id: evaluation.id.toString(),
      farmId: evaluation.farmId.toString(),
      listingRequestId: evaluation.listingRequestId ? evaluation.listingRequestId.toString() : null,
      reviewer: {
        id: evaluation.reviewer.id.toString(),
        fullName: evaluation.reviewer.fullName,
      },
      approver: evaluation.approver
        ? {
            id: evaluation.approver.id.toString(),
            fullName: evaluation.approver.fullName,
          }
        : null,
      scoreValue: evaluation.scoreValue !== null ? evaluation.scoreValue.toNumber() : null,
      scoreMax: evaluation.scoreMax !== null ? evaluation.scoreMax.toNumber() : null,
      methodologyName: evaluation.methodologyName,
      methodologyVersion: evaluation.methodologyVersion,
      reviewScopeEn: evaluation.reviewScopeEn,
      reviewScopeAr: evaluation.reviewScopeAr,
      publicSummaryEn: evaluation.publicSummaryEn,
      publicSummaryAr: evaluation.publicSummaryAr,
      internalNotes: evaluation.internalNotes,
      status: evaluation.status,
      reviewedAt: evaluation.reviewedAt ? evaluation.reviewedAt.toISOString() : null,
      approvedAt: evaluation.approvedAt ? evaluation.approvedAt.toISOString() : null,
      publishedAt: evaluation.publishedAt ? evaluation.publishedAt.toISOString() : null,
      checks: (evaluation.checks || []).map((c) => this.presentCheck(c)),
      createdAt: evaluation.createdAt ? evaluation.createdAt.toISOString() : null,
      updatedAt: evaluation.updatedAt ? evaluation.updatedAt.toISOString() : null,
    };
  }

  private presentCheck(check: FarmEvaluationCheck): EvaluationCheckResponseDto {
    return {
      id: check.id.toString(),
      checkKey: check.checkKey,
      checkStatus: check.checkStatus,
      evidenceDocumentId: check.evidenceDocumentId ? check.evidenceDocumentId.toString() : null,
      reviewerNotes: check.reviewerNotes,
      reviewedAt: check.reviewedAt ? check.reviewedAt.toISOString() : null,
    };
  }
}
