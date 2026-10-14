import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  ForwardingStatus,
  OwnerDecision,
  RequestStaffAssignmentType,
  RequestType,
  ReviewDecision,
  StaffRole,
} from '../../generated/prisma/enums';
import type { PrismaService } from '../../prisma/prisma.service';
import type { StaffAuthorizationService } from '../authorization/staff-authorization.service';
import { StaffPermission } from '../authorization/staff-permissions';
import type { StaffContext } from '../authorization/staff.types';
import type { FarmAccessService } from '../authorization/farm-access.service';
import { RequestsService } from './requests.service';

type MockPrisma = {
  request: {
    count: jest.Mock;
    findMany: jest.Mock;
    findFirst: jest.Mock;
    findUnique: jest.Mock;
    update: jest.Mock;
  };
  user: {
    findMany: jest.Mock;
    findUnique: jest.Mock;
  };
  farm: {
    findMany: jest.Mock;
  };
  requestStaffAssignment: {
    findMany: jest.Mock;
    findFirst: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
  requestStatusHistory: {
    findMany: jest.Mock;
    create: jest.Mock;
  };
  requestReview: {
    findMany: jest.Mock;
    create: jest.Mock;
  };
  requestForwarding: {
    findMany: jest.Mock;
    findFirst: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
  requestDocument: {
    findMany: jest.Mock;
    findUnique: jest.Mock;
    update: jest.Mock;
  };
  auditLog: {
    create: jest.Mock;
  };
  $transaction: jest.Mock;
};

describe('RequestsService', () => {
  let service: RequestsService;
  let prisma: MockPrisma;
  let staffAuth: { loadContext: jest.Mock };
  let farmAccess: { hasAnyRole: jest.Mock };

  const adminStaff: StaffContext = {
    userId: 1n,
    roles: [StaffRole.admin],
    permissions: [
      StaffPermission.RequestsRead,
      StaffPermission.RequestsReview,
      StaffPermission.RequestsForward,
      StaffPermission.EvaluationsManage,
      StaffPermission.StaffManage,
    ],
  };

  const reviewerStaff: StaffContext = {
    userId: 2n,
    roles: [StaffRole.reviewer],
    permissions: [
      StaffPermission.RequestsRead,
      StaffPermission.RequestsReview,
      StaffPermission.EvaluationsManage,
    ],
  };

  const caseAgentStaff: StaffContext = {
    userId: 3n,
    roles: [StaffRole.caseAgent],
    permissions: [
      StaffPermission.RequestsRead,
      StaffPermission.RequestsForward,
      StaffPermission.CommunicationRelay,
    ],
  };

  const baseRequest = {
    id: 100n,
    requestNumber: 'REQ-2026-0001',
    requestType: RequestType.farmListing,
    status: 'draft',
    visibility: 'private',
    currentStep: 1,
    createdBy: 10n,
    farmId: 20n,
    parentRequestId: null,
    submittedAt: null,
    publishedAt: null,
    closedAt: null,
    createdAt: new Date('2026-10-14T10:00:00.000Z'),
    updatedAt: new Date('2026-10-14T10:00:00.000Z'),
  };

  beforeEach(() => {
    prisma = {
      request: {
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([baseRequest]),
        findFirst: jest.fn().mockResolvedValue(baseRequest),
        findUnique: jest.fn().mockResolvedValue(baseRequest),
        update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ ...baseRequest, ...data })),
      },
      user: {
        findMany: jest.fn().mockResolvedValue([{ id: 10n, fullName: 'Farmer Ahmed' }]),
        findUnique: jest.fn().mockResolvedValue({ id: 50n, fullName: 'Recipient Owner' }),
      },
      farm: {
        findMany: jest.fn().mockResolvedValue([{ id: 20n, name: 'Delta Farm', governorate: 'Beheira' }]),
      },
      requestStaffAssignment: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 1n }),
        update: jest.fn().mockResolvedValue({ id: 1n }),
      },
      requestStatusHistory: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockResolvedValue({ id: 1n }),
      },
      requestReview: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockResolvedValue({ id: 1n }),
      },
      requestForwarding: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 1n }),
        update: jest.fn().mockResolvedValue({ id: 1n }),
      },
      requestDocument: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue({ id: 200n, requestId: 100n, slotKey: 'ownership_deed' }),
        update: jest.fn().mockResolvedValue({ id: 200n }),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: 1n }),
      },
      $transaction: jest.fn().mockImplementation((cb: (tx: MockPrisma) => Promise<unknown>) => cb(prisma)),
    };

    staffAuth = {
      loadContext: jest.fn().mockResolvedValue(adminStaff),
    };

    farmAccess = {
      hasAnyRole: jest.fn().mockResolvedValue(true),
    };

    service = new RequestsService(
      prisma as unknown as PrismaService,
      staffAuth as unknown as StaffAuthorizationService,
      farmAccess as unknown as FarmAccessService,
    );
  });

  describe('User-Facing Requests Access', () => {
    it('lists own requests with correct pagination and status mapping', async () => {
      const res = await service.listMine(10n, { page: 1, pageSize: 20 });
      expect(res.total).toBe(1);
      expect(res.items).toHaveLength(1);
      expect(res.items[0].id).toBe('100');
      expect(res.items[0].creator.id).toBe('10');
      expect(res.items[0].assignments).toHaveLength(0); // non-staff view hides internal assignments
    });

    it('retrieves caller own request details', async () => {
      const res = await service.getMine(10n, 100n);
      expect(res.id).toBe('100');
      expect(res.requestNumber).toBe('REQ-2026-0001');
      expect(res.farm?.name).toBe('Delta Farm');
    });

    it('rejects access to another user request with 404 (IDOR protection)', async () => {
      prisma.request.findFirst.mockResolvedValue(null);
      await expect(service.getMine(999n, 100n)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects generic submit for specialized farm listing requests', async () => {
      await expect(service.submitDraft(10n, 100n)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('submits a generic draft request for review', async () => {
      prisma.request.findFirst.mockResolvedValue({ ...baseRequest, requestType: RequestType.partnership });
      const res = await service.submitDraft(10n, 100n);
      expect(res.status).toBe('submitted');
      expect(prisma.requestStatusHistory.create).toHaveBeenCalledTimes(1);
      expect(prisma.auditLog.create).toHaveBeenCalledTimes(1);
    });

    it('rejects submitting an already submitted request with 409 Conflict', async () => {
      prisma.request.findFirst.mockResolvedValue({ ...baseRequest, status: 'underFarmExitReview' });
      await expect(service.submitDraft(10n, 100n)).rejects.toBeInstanceOf(ConflictException);
    });

    it('allows requester to withdraw a pending request', async () => {
      prisma.request.findFirst.mockResolvedValue({ ...baseRequest, status: 'submitted' });
      const res = await service.withdraw(10n, 100n, { reason: 'Cancelled by applicant' });
      expect(res.status).toBe('withdrawn');
      expect(prisma.requestStatusHistory.create).toHaveBeenCalledTimes(1);
      expect(prisma.auditLog.create).toHaveBeenCalledTimes(1);
    });

    it('rejects withdrawing an approved or published request with 409 Conflict', async () => {
      prisma.request.findFirst.mockResolvedValue({ ...baseRequest, status: 'published' });
      await expect(service.withdraw(10n, 100n, {})).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('Staff Request Inbox & Access Scoping', () => {
    it('allows admin to list all requests in inbox with internal assignments and forwardings', async () => {
      prisma.requestStaffAssignment.findMany.mockResolvedValue([
        {
          id: 1n,
          requestId: 100n,
          assignmentType: RequestStaffAssignmentType.reviewer,
          assignedStaffId: 2n,
          assignedAt: new Date(),
          assignee: { id: 2n, fullName: 'Reviewer Sarah' },
        },
      ]);

      const res = await service.listStaff(1n, {});
      expect(res.items).toHaveLength(1);
      expect(res.items[0].assignments).toHaveLength(1);
      expect(res.items[0].assignments[0].staffName).toBe('Reviewer Sarah');
    });

    it('rejects non-admin staff querying requests assigned to other staff members with 403', async () => {
      staffAuth.loadContext.mockResolvedValue(reviewerStaff);
      await expect(service.listStaff(2n, { assignedStaffId: '3' })).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('allows assigned reviewer to view staff request details', async () => {
      staffAuth.loadContext.mockResolvedValue(reviewerStaff);
      prisma.requestStaffAssignment.findFirst.mockResolvedValue({
        id: 1n,
        requestId: 100n,
        assignedStaffId: 2n,
        assignmentType: RequestStaffAssignmentType.reviewer,
      });

      const res = await service.getStaff(2n, 100n);
      expect(res.id).toBe('100');
    });

    it('rejects staff when request is assigned to a different staff member with 403', async () => {
      staffAuth.loadContext.mockResolvedValue(reviewerStaff);
      prisma.requestStaffAssignment.findFirst.mockResolvedValue(null); // not assigned to caller
      prisma.requestStaffAssignment.findMany.mockResolvedValue([{ id: 9n }]); // assigned to someone else

      await expect(service.getStaff(2n, 100n)).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('Staff Assignment Rules', () => {
    it('allows admin to assign an active reviewer', async () => {
      staffAuth.loadContext
        .mockResolvedValueOnce(adminStaff) // caller
        .mockResolvedValueOnce(reviewerStaff); // target

      const res = await service.assignStaff(1n, 100n, {
        assignmentType: RequestStaffAssignmentType.reviewer,
        assignedStaffId: '2',
      });

      expect(res.id).toBe('100');
      expect(prisma.requestStaffAssignment.create).toHaveBeenCalledTimes(1);
      expect(prisma.auditLog.create).toHaveBeenCalledTimes(1);
    });

    it('rejects non-admin staff assigning personnel with 403', async () => {
      staffAuth.loadContext.mockResolvedValue(reviewerStaff);
      await expect(
        service.assignStaff(2n, 100n, {
          assignmentType: RequestStaffAssignmentType.reviewer,
          assignedStaffId: '2',
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects assigning a case agent to a reviewer slot with 400', async () => {
      staffAuth.loadContext
        .mockResolvedValueOnce(adminStaff)
        .mockResolvedValueOnce(caseAgentStaff);

      await expect(
        service.assignStaff(1n, 100n, {
          assignmentType: RequestStaffAssignmentType.reviewer,
          assignedStaffId: '3',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects assigning inactive or non-staff user with 400', async () => {
      staffAuth.loadContext
        .mockResolvedValueOnce(adminStaff)
        .mockResolvedValueOnce(null);

      await expect(
        service.assignStaff(1n, 100n, {
          assignmentType: RequestStaffAssignmentType.reviewer,
          assignedStaffId: '99',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('Review Decisions', () => {
    const genericRequest = { ...baseRequest, requestType: RequestType.partnership };

    it('records review approval and transitions request to approved', async () => {
      staffAuth.loadContext.mockResolvedValue(reviewerStaff);
      prisma.request.findUnique.mockResolvedValue({ ...genericRequest, status: 'underFarmExitReview' });
      prisma.requestStaffAssignment.findFirst.mockResolvedValue({
        id: 1n,
        requestId: 100n,
        assignedStaffId: 2n,
        assignmentType: RequestStaffAssignmentType.reviewer,
      });

      const res = await service.recordReview(2n, 100n, {
        decision: ReviewDecision.approved,
        comment: 'All legal documents confirmed',
      });

      expect(res.status).toBe('approved');
      expect(prisma.requestReview.create).toHaveBeenCalledTimes(1);
      expect(prisma.requestStatusHistory.create).toHaveBeenCalledTimes(1);
    });

    it('rejects review on draft request with 409 Conflict', async () => {
      staffAuth.loadContext.mockResolvedValue(adminStaff);
      prisma.request.findUnique.mockResolvedValue({ ...genericRequest, status: 'draft' });

      await expect(
        service.recordReview(1n, 100n, { decision: ReviewDecision.approved }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('rejects changesRequested decision without a comment with 400', async () => {
      staffAuth.loadContext.mockResolvedValue(adminStaff);
      prisma.request.findUnique.mockResolvedValue({ ...genericRequest, status: 'underFarmExitReview' });

      await expect(
        service.recordReview(1n, 100n, { decision: ReviewDecision.changesRequested }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects reviewer who is not assigned to the request with 403', async () => {
      staffAuth.loadContext.mockResolvedValue(reviewerStaff);
      prisma.request.findUnique.mockResolvedValue({ ...genericRequest, status: 'underFarmExitReview' });
      prisma.requestStaffAssignment.findFirst.mockResolvedValue(null);

      await expect(
        service.recordReview(2n, 100n, { decision: ReviewDecision.approved, comment: 'Looks good' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('Internal Request Forwarding', () => {
    it('allows assigned case agent to forward request to farm owner', async () => {
      staffAuth.loadContext.mockResolvedValue(caseAgentStaff);
      prisma.request.findUnique.mockResolvedValue({ ...baseRequest, status: 'approved' });
      prisma.requestStaffAssignment.findFirst.mockResolvedValue({
        id: 1n,
        requestId: 100n,
        assignedStaffId: 3n,
        assignmentType: RequestStaffAssignmentType.caseAgent,
      });

      const res = await service.forwardRequest(3n, 100n, {
        recipientUserId: '50',
        internalNotes: 'Forwarded vetted purchase proposal',
      });

      expect(res.status).toBe('sentToOwner');
      expect(prisma.requestForwarding.create).toHaveBeenCalledTimes(1);
      expect(prisma.auditLog.create).toHaveBeenCalledTimes(1);
    });

    it('rejects forwarding request to the requester themselves with 400', async () => {
      staffAuth.loadContext.mockResolvedValue(adminStaff);
      prisma.request.findUnique.mockResolvedValue({ ...baseRequest, createdBy: 10n, status: 'approved' });

      await expect(
        service.forwardRequest(1n, 100n, { recipientUserId: '10' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('records owner decision on forwarded request', async () => {
      prisma.requestForwarding.findFirst.mockResolvedValue({
        id: 5n,
        requestId: 100n,
        recipientUserId: 50n,
        status: ForwardingStatus.sent,
        ownerDecision: OwnerDecision.pending,
      });
      staffAuth.loadContext.mockResolvedValue(null); // non-staff (owner)

      const res = await service.recordForwardingDecision(50n, 100n, 5n, {
        decision: OwnerDecision.accepted,
        reason: 'Proposal terms acceptable',
      });

      expect(res.status).toBe('accepted');
      expect(prisma.requestForwarding.update).toHaveBeenCalledTimes(1);
      expect(prisma.auditLog.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('Document Review & Isolation', () => {
    it('reviews a document belonging to the request', async () => {
      staffAuth.loadContext.mockResolvedValue(reviewerStaff);
      prisma.requestDocument.findUnique.mockResolvedValue({
        id: 200n,
        requestId: 100n,
        slotKey: 'ownership_deed',
      });

      const res = await service.reviewDocument(2n, 100n, 200n, {
        reviewStatus: 'reviewed',
        reviewNote: 'Notary seal verified',
      });

      expect(res.id).toBe('100');
      expect(prisma.requestDocument.update).toHaveBeenCalledTimes(1);
      expect(prisma.auditLog.create).toHaveBeenCalledTimes(1);
    });

    it('rejects review when document belongs to a different request (cross-request leak prevention)', async () => {
      staffAuth.loadContext.mockResolvedValue(reviewerStaff);
      prisma.requestDocument.findUnique.mockResolvedValue({
        id: 200n,
        requestId: 999n, // belongs to a different request
        slotKey: 'ownership_deed',
      });

      await expect(
        service.reviewDocument(2n, 100n, 200n, { reviewStatus: 'reviewed' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
