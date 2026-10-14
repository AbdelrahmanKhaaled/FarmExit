import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import {
  EvaluationCheckStatus,
  EvaluationStatus,
  RequestStaffAssignmentType,
  StaffRole,
} from '../../generated/prisma/enums';
import type { PrismaService } from '../../prisma/prisma.service';
import type { StaffAuthorizationService } from '../authorization/staff-authorization.service';
import { StaffPermission } from '../authorization/staff-permissions';
import type { StaffContext } from '../authorization/staff.types';
import { EvaluationsService } from './evaluations.service';

type MockPrisma = {
  farm: { findFirst: jest.Mock };
  request: { findFirst: jest.Mock; findMany: jest.Mock };
  requestStaffAssignment: { findFirst: jest.Mock };
  requestDocument: { findUnique: jest.Mock };
  farmEvaluation: {
    create: jest.Mock;
    findFirst: jest.Mock;
    findMany: jest.Mock;
    count: jest.Mock;
    update: jest.Mock;
    updateMany: jest.Mock;
  };
  farmEvaluationCheck: {
    upsert: jest.Mock;
  };
  auditLog: {
    create: jest.Mock;
  };
  $transaction: jest.Mock;
};

type MockStaffAuth = {
  loadContext: jest.Mock<Promise<StaffContext | null>, [bigint]>;
};

describe('EvaluationsService (Unit)', () => {
  let prisma: MockPrisma;
  let staffAuth: MockStaffAuth;
  let service: EvaluationsService;

  const adminStaff: StaffContext = {
    userId: 1n,
    roles: [StaffRole.admin],
    permissions: [StaffPermission.EvaluationsManage],
  };

  const reviewerStaff: StaffContext = {
    userId: 2n,
    roles: [StaffRole.reviewer],
    permissions: [StaffPermission.EvaluationsManage],
  };

  const caseAgentStaff: StaffContext = {
    userId: 3n,
    roles: [StaffRole.caseAgent],
    permissions: [StaffPermission.RequestsRead],
  };

  const farm = { id: 10n, name: 'Test Farm', deletedAt: null };

  beforeEach(() => {
    prisma = {
      farm: {
        findFirst: jest.fn().mockResolvedValue(farm),
      },
      request: {
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
      },
      requestStaffAssignment: {
        findFirst: jest.fn(),
      },
      requestDocument: {
        findUnique: jest.fn(),
      },
      farmEvaluation: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      farmEvaluationCheck: {
        upsert: jest.fn(),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: 1n }),
      },
      $transaction: jest.fn().mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => callback(prisma)),
    };

    staffAuth = {
      loadContext: jest.fn<Promise<StaffContext | null>, [bigint]>(),
    };

    service = new EvaluationsService(
      prisma as unknown as PrismaService,
      staffAuth as unknown as StaffAuthorizationService,
    );
  });

  describe('Authorization & Staff Context', () => {
    it('rejects unauthenticated or non-staff users with ForbiddenException', async () => {
      staffAuth.loadContext.mockResolvedValue(null);
      await expect(service.create(99n, 10n, {})).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects staff missing evaluations.manage permission (e.g. case agent)', async () => {
      staffAuth.loadContext.mockResolvedValue(caseAgentStaff);
      await expect(service.create(3n, 10n, {})).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects evaluation creation on a non-existent or deleted farm', async () => {
      staffAuth.loadContext.mockResolvedValue(adminStaff);
      prisma.farm.findFirst.mockResolvedValue(null);
      await expect(service.create(1n, 999n, {})).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects reviewer creating evaluation without an assigned listing request', async () => {
      staffAuth.loadContext.mockResolvedValue(reviewerStaff);
      await expect(service.create(2n, 10n, {})).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects reviewer when listing request does not belong to the farm', async () => {
      staffAuth.loadContext.mockResolvedValue(reviewerStaff);
      prisma.request.findFirst.mockResolvedValue(null);
      await expect(service.create(2n, 10n, { listingRequestId: '50' })).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects reviewer when reviewer is not assigned to the listing request', async () => {
      staffAuth.loadContext.mockResolvedValue(reviewerStaff);
      prisma.request.findFirst.mockResolvedValue({ id: 50n, farmId: 10n });
      prisma.requestStaffAssignment.findFirst.mockResolvedValue(null);
      await expect(service.create(2n, 10n, { listingRequestId: '50' })).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('allows reviewer when assigned to the listing request on the farm', async () => {
      staffAuth.loadContext.mockResolvedValue(reviewerStaff);
      prisma.request.findFirst.mockResolvedValue({ id: 50n, farmId: 10n });
      prisma.requestStaffAssignment.findFirst.mockResolvedValue({
        requestId: 50n,
        assignedStaffId: 2n,
        assignmentType: RequestStaffAssignmentType.reviewer,
      });
      prisma.farmEvaluation.create.mockResolvedValue({
        id: 100n,
        farmId: 10n,
        listingRequestId: 50n,
        reviewedBy: 2n,
        approvedBy: null,
        scoreValue: null,
        scoreMax: null,
        methodologyName: null,
        methodologyVersion: null,
        reviewScopeEn: null,
        reviewScopeAr: null,
        publicSummaryEn: null,
        publicSummaryAr: null,
        internalNotes: null,
        status: EvaluationStatus.draft,
        reviewedAt: null,
        approvedAt: null,
        publishedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        reviewer: { id: 2n, fullName: 'Reviewer Staff' },
        approver: null,
        checks: [],
      });

      const res = await service.create(2n, 10n, { listingRequestId: '50' });
      expect(res.id).toBe('100');
      expect(res.farmId).toBe('10');
      expect(prisma.auditLog.create).toHaveBeenCalledTimes(1);
      const auditCalls = prisma.auditLog.create.mock.calls as [
        { data: { actorUserId: bigint; action: string } },
      ][];
      expect(auditCalls[0][0].data.actorUserId).toBe(2n);
      expect(auditCalls[0][0].data.action).toBe('created');
    });
  });

  describe('Scoring Validation', () => {
    beforeEach(() => {
      staffAuth.loadContext.mockResolvedValue(adminStaff);
    });

    it('allows evaluation without any scores (both null)', async () => {
      prisma.farmEvaluation.create.mockResolvedValue({
        id: 101n,
        farmId: 10n,
        listingRequestId: null,
        reviewedBy: 1n,
        approvedBy: null,
        scoreValue: null,
        scoreMax: null,
        methodologyName: null,
        methodologyVersion: null,
        reviewScopeEn: null,
        reviewScopeAr: null,
        publicSummaryEn: null,
        publicSummaryAr: null,
        internalNotes: null,
        status: EvaluationStatus.draft,
        reviewedAt: null,
        approvedAt: null,
        publishedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        reviewer: { id: 1n, fullName: 'Admin Staff' },
        approver: null,
        checks: [],
      });

      const res = await service.create(1n, 10n, {});
      expect(res.scoreValue).toBeNull();
      expect(res.scoreMax).toBeNull();
    });

    it('rejects negative scoreValue', async () => {
      await expect(service.create(1n, 10n, { scoreValue: -5, scoreMax: 100 })).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('rejects scoreValue provided without scoreMax', async () => {
      await expect(service.create(1n, 10n, { scoreValue: 80 })).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects non-positive scoreMax', async () => {
      await expect(service.create(1n, 10n, { scoreValue: 0, scoreMax: 0 })).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('rejects scoreValue exceeding scoreMax', async () => {
      await expect(service.create(1n, 10n, { scoreValue: 105, scoreMax: 100 })).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('accepts valid score within bounds (e.g. 85 / 100)', async () => {
      prisma.farmEvaluation.create.mockResolvedValue({
        id: 102n,
        farmId: 10n,
        listingRequestId: null,
        reviewedBy: 1n,
        approvedBy: null,
        scoreValue: new Prisma.Decimal(85),
        scoreMax: new Prisma.Decimal(100),
        methodologyName: 'Standard',
        methodologyVersion: '1.0',
        reviewScopeEn: null,
        reviewScopeAr: null,
        publicSummaryEn: null,
        publicSummaryAr: null,
        internalNotes: null,
        status: EvaluationStatus.draft,
        reviewedAt: null,
        approvedAt: null,
        publishedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        reviewer: { id: 1n, fullName: 'Admin Staff' },
        approver: null,
        checks: [],
      });

      const res = await service.create(1n, 10n, { scoreValue: 85, scoreMax: 100 });
      expect(res.scoreValue).toBe(85);
      expect(res.scoreMax).toBe(100);
    });
  });

  describe('History, Latest & Pagination', () => {
    beforeEach(() => {
      staffAuth.loadContext.mockResolvedValue(adminStaff);
    });

    it('returns 404 when getting latest evaluation for farm without evaluations', async () => {
      prisma.farmEvaluation.findFirst.mockResolvedValue(null);
      await expect(service.getLatest(1n, 10n)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('returns latest evaluation correctly', async () => {
      prisma.farmEvaluation.findFirst.mockResolvedValue({
        id: 105n,
        farmId: 10n,
        listingRequestId: null,
        reviewedBy: 1n,
        approvedBy: null,
        scoreValue: new Prisma.Decimal(90),
        scoreMax: new Prisma.Decimal(100),
        methodologyName: 'Latest Standard',
        methodologyVersion: '2.0',
        reviewScopeEn: 'Full',
        reviewScopeAr: null,
        publicSummaryEn: 'Summary',
        publicSummaryAr: null,
        internalNotes: null,
        status: EvaluationStatus.inReview,
        reviewedAt: new Date(),
        approvedAt: null,
        publishedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        reviewer: { id: 1n, fullName: 'Admin' },
        approver: null,
        checks: [],
      });

      const res = await service.getLatest(1n, 10n);
      expect(res.id).toBe('105');
      expect(res.scoreValue).toBe(90);
    });

    it('returns paginated evaluation history with totals', async () => {
      prisma.farmEvaluation.count.mockResolvedValue(2);
      prisma.farmEvaluation.findMany.mockResolvedValue([
        {
          id: 105n,
          farmId: 10n,
          listingRequestId: null,
          reviewedBy: 1n,
          approvedBy: null,
          scoreValue: new Prisma.Decimal(90),
          scoreMax: new Prisma.Decimal(100),
          methodologyName: 'Latest',
          methodologyVersion: '2.0',
          reviewScopeEn: null,
          reviewScopeAr: null,
          publicSummaryEn: null,
          publicSummaryAr: null,
          internalNotes: null,
          status: EvaluationStatus.inReview,
          reviewedAt: null,
          approvedAt: null,
          publishedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          reviewer: { id: 1n, fullName: 'Admin' },
          approver: null,
          checks: [],
        },
        {
          id: 100n,
          farmId: 10n,
          listingRequestId: null,
          reviewedBy: 1n,
          approvedBy: null,
          scoreValue: new Prisma.Decimal(80),
          scoreMax: new Prisma.Decimal(100),
          methodologyName: 'Old',
          methodologyVersion: '1.0',
          reviewScopeEn: null,
          reviewScopeAr: null,
          publicSummaryEn: null,
          publicSummaryAr: null,
          internalNotes: null,
          status: EvaluationStatus.draft,
          reviewedAt: null,
          approvedAt: null,
          publishedAt: null,
          createdAt: new Date(Date.now() - 10000),
          updatedAt: new Date(Date.now() - 10000),
          reviewer: { id: 1n, fullName: 'Admin' },
          approver: null,
          checks: [],
        },
      ]);

      const history = await service.listHistory(1n, 10n, { page: 1, pageSize: 20 });
      expect(history.total).toBe(2);
      expect(history.items).toHaveLength(2);
      expect(history.items[0].id).toBe('105');
      expect(history.items[1].id).toBe('100');
    });
  });

  describe('Immutability of Locked Evaluations & Status Transitions', () => {
    beforeEach(() => {
      staffAuth.loadContext.mockResolvedValue(adminStaff);
    });

    it('rejects modifying an approved evaluation with ConflictException', async () => {
      prisma.farmEvaluation.findFirst.mockResolvedValue({
        id: 103n,
        farmId: 10n,
        status: EvaluationStatus.approved,
        scoreValue: new Prisma.Decimal(80),
        scoreMax: new Prisma.Decimal(100),
      });

      await expect(service.update(1n, 10n, 103n, { scoreValue: 85 })).rejects.toBeInstanceOf(ConflictException);
    });

    it('rejects modifying a published evaluation with ConflictException', async () => {
      prisma.farmEvaluation.findFirst.mockResolvedValue({
        id: 104n,
        farmId: 10n,
        status: EvaluationStatus.published,
        scoreValue: new Prisma.Decimal(80),
        scoreMax: new Prisma.Decimal(100),
      });

      await expect(service.update(1n, 10n, 104n, { scoreValue: 85 })).rejects.toBeInstanceOf(ConflictException);
    });

    it('rejects modifying a superseded evaluation with ConflictException', async () => {
      prisma.farmEvaluation.findFirst.mockResolvedValue({
        id: 99n,
        farmId: 10n,
        status: EvaluationStatus.superseded,
        scoreValue: new Prisma.Decimal(70),
        scoreMax: new Prisma.Decimal(100),
      });

      await expect(service.update(1n, 10n, 99n, { scoreValue: 75 })).rejects.toBeInstanceOf(ConflictException);
    });

    it('supersedes previously published evaluations when publishing a new one', async () => {
      prisma.farmEvaluation.findFirst.mockResolvedValue({
        id: 110n,
        farmId: 10n,
        status: EvaluationStatus.inReview,
        scoreValue: new Prisma.Decimal(88),
        scoreMax: new Prisma.Decimal(100),
        reviewedBy: 1n,
        approvedBy: null,
      });

      prisma.farmEvaluation.update.mockResolvedValue({
        id: 110n,
        farmId: 10n,
        status: EvaluationStatus.published,
        scoreValue: new Prisma.Decimal(88),
        scoreMax: new Prisma.Decimal(100),
        methodologyName: 'V2',
        methodologyVersion: '2.0',
        reviewScopeEn: null,
        reviewScopeAr: null,
        publicSummaryEn: null,
        publicSummaryAr: null,
        internalNotes: null,
        reviewedAt: new Date(),
        approvedAt: new Date(),
        publishedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        reviewer: { id: 1n, fullName: 'Admin' },
        approver: { id: 1n, fullName: 'Admin' },
        checks: [],
      });

      await service.update(1n, 10n, 110n, { status: EvaluationStatus.published });

      expect(prisma.farmEvaluation.updateMany).toHaveBeenCalledWith({
        where: {
          farmId: 10n,
          status: EvaluationStatus.published,
          id: { not: 110n },
        },
        data: { status: EvaluationStatus.superseded },
      });
    });
  });

  describe('Evaluation Checks Recording', () => {
    beforeEach(() => {
      staffAuth.loadContext.mockResolvedValue(adminStaff);
    });

    it('rejects recording checks on locked evaluation', async () => {
      prisma.farmEvaluation.findFirst.mockResolvedValue({
        id: 120n,
        farmId: 10n,
        status: EvaluationStatus.published,
      });

      await expect(
        service.recordCheck(1n, 10n, 120n, {
          checkKey: 'soil_check',
          checkStatus: EvaluationCheckStatus.reviewed,
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('rejects recording checks with non-existent evidence document', async () => {
      prisma.farmEvaluation.findFirst.mockResolvedValue({
        id: 121n,
        farmId: 10n,
        status: EvaluationStatus.draft,
        listingRequestId: 50n,
      });
      prisma.requestDocument.findUnique.mockResolvedValue(null);

      await expect(
        service.recordCheck(1n, 10n, 121n, {
          checkKey: 'water_check',
          evidenceDocumentId: '999',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('upserts evaluation check successfully and logs audit', async () => {
      prisma.farmEvaluation.findFirst.mockResolvedValue({
        id: 122n,
        farmId: 10n,
        status: EvaluationStatus.draft,
        listingRequestId: null,
      });

      prisma.farmEvaluationCheck.upsert.mockResolvedValue({
        id: 1n,
        evaluationId: 122n,
        checkKey: 'crop_rotation',
        checkStatus: EvaluationCheckStatus.reviewed,
        evidenceDocumentId: null,
        reviewerNotes: 'Verified crop rotation plan',
        reviewedAt: new Date(),
      });

      const check = await service.recordCheck(1n, 10n, 122n, {
        checkKey: 'crop_rotation',
        checkStatus: EvaluationCheckStatus.reviewed,
        reviewerNotes: 'Verified crop rotation plan',
      });

      expect(check.checkKey).toBe('crop_rotation');
      expect(check.checkStatus).toBe(EvaluationCheckStatus.reviewed);
      expect(prisma.auditLog.create).toHaveBeenCalledTimes(1);
      const auditCalls = prisma.auditLog.create.mock.calls as [
        { data: { action: string; entityType: string; entityId: bigint } },
      ][];
      expect(auditCalls[0][0].data.action).toBe('check_recorded');
      expect(auditCalls[0][0].data.entityType).toBe('farm_evaluation');
      expect(auditCalls[0][0].data.entityId).toBe(122n);
    });
  });

  describe('IDOR & Cross-Farm Protections', () => {
    beforeEach(() => {
      staffAuth.loadContext.mockResolvedValue(adminStaff);
    });

    it('returns 404 when evaluation belongs to a different farm', async () => {
      prisma.farmEvaluation.findFirst.mockResolvedValue(null);
      await expect(service.get(1n, 10n, 999n)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('Phase 07 Security Verification: Reviewer Read Scoping', () => {
    it('rejects reviewer reading evaluation details if unassigned to farm listing', async () => {
      staffAuth.loadContext.mockResolvedValue(reviewerStaff);
      prisma.farmEvaluation.findFirst.mockResolvedValue({
        id: 100n,
        farmId: 10n,
        listingRequestId: 50n,
        reviewedBy: 99n, // different reviewer
        scoreValue: null,
        scoreMax: null,
        methodologyName: null,
        methodologyVersion: null,
        reviewScopeEn: null,
        reviewScopeAr: null,
        publicSummaryEn: null,
        publicSummaryAr: null,
        internalNotes: null,
        status: EvaluationStatus.draft,
        reviewedAt: null,
        approvedAt: null,
        publishedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        reviewer: { id: 99n, fullName: 'Other' },
        approver: null,
        checks: [],
      });
      prisma.requestStaffAssignment.findFirst.mockResolvedValue(null);

      await expect(service.get(2n, 10n, 100n)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('allows reviewer reading evaluation details if assigned to the listing request', async () => {
      staffAuth.loadContext.mockResolvedValue(reviewerStaff);
      prisma.farmEvaluation.findFirst.mockResolvedValue({
        id: 100n,
        farmId: 10n,
        listingRequestId: 50n,
        reviewedBy: 99n,
        scoreValue: null,
        scoreMax: null,
        methodologyName: null,
        methodologyVersion: null,
        reviewScopeEn: null,
        reviewScopeAr: null,
        publicSummaryEn: null,
        publicSummaryAr: null,
        internalNotes: null,
        status: EvaluationStatus.draft,
        reviewedAt: null,
        approvedAt: null,
        publishedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        reviewer: { id: 99n, fullName: 'Other' },
        approver: null,
        checks: [],
      });
      prisma.requestStaffAssignment.findFirst.mockResolvedValue({
        requestId: 50n,
        assignedStaffId: 2n,
        assignmentType: RequestStaffAssignmentType.reviewer,
      });

      const res = await service.get(2n, 10n, 100n);
      expect(res.id).toBe('100');
    });

    it('rejects reviewer reading latest evaluation if unassigned to farm listing', async () => {
      staffAuth.loadContext.mockResolvedValue(reviewerStaff);
      prisma.requestStaffAssignment.findFirst.mockResolvedValue(null);

      await expect(service.getLatest(2n, 10n)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects reviewer reading evaluation history if unassigned to farm listing', async () => {
      staffAuth.loadContext.mockResolvedValue(reviewerStaff);
      prisma.requestStaffAssignment.findFirst.mockResolvedValue(null);

      await expect(service.listHistory(2n, 10n, {})).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});

