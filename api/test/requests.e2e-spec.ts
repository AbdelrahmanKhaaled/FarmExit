import { createHmac } from 'node:crypto';
import { type INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { type App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/common/app-setup';
import { SMS_PROVIDER } from '../src/modules/auth/sms/sms-provider';
import { DevelopmentSmsProvider } from '../src/modules/auth/sms/development-sms.provider';
import { PrismaService } from '../src/prisma/prisma.service';
import { createFakePrisma, type FakePrisma } from './support/fake-prisma';

type Json = Record<string, unknown>;
const json = (res: { body: unknown }): Json => res.body as Json;

describe('Unified Requests, Review & Forwarding E2E', () => {
  let app: INestApplication<App>;
  let fakePrisma: FakePrisma;
  let jwtSecret: string;

  let adminUser: { id: bigint; token: string };
  let reviewerUser: { id: bigint; token: string };
  let otherReviewerUser: { id: bigint; token: string };
  let caseAgentUser: { id: bigint; token: string };
  let requesterUser: { id: bigint; token: string };
  let ownerUser: { id: bigint; token: string };
  let otherUser: { id: bigint; token: string };

  let farmId: bigint;
  let draftRequestId: bigint;
  let underReviewRequestId: bigint;
  let documentId: bigint;
  let forwardingId: bigint;

  const http = () => request(app.getHttpServer());
  const as = (u: { token: string }) => ({
    post: (path: string, body: object = {}) => http().post(path).set('Authorization', `Bearer ${u.token}`).send(body),
    get: (path: string) => http().get(path).set('Authorization', `Bearer ${u.token}`),
    patch: (path: string, body: object = {}) => http().patch(path).set('Authorization', `Bearer ${u.token}`).send(body),
    put: (path: string, body: object = {}) => http().put(path).set('Authorization', `Bearer ${u.token}`).send(body),
  });

  function signToken(userId: bigint, sessionId: bigint): string {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const now = Math.floor(Date.now() / 1000);
    const payload = Buffer.from(
      JSON.stringify({
        sub: userId.toString(),
        sid: sessionId.toString(),
        iss: 'farmexit-api',
        iat: now,
        exp: now + 3600,
      }),
    ).toString('base64url');
    const signature = createHmac('sha256', jwtSecret).update(`${header}.${payload}`).digest('base64url');
    return `${header}.${payload}.${signature}`;
  }

  async function createUser(opts: {
    mobileE164: string;
    fullName: string;
    role?: 'admin' | 'reviewer' | 'caseAgent';
  }): Promise<{ id: bigint; token: string }> {
    const user = await fakePrisma.user.create({
      data: {
        mobileE164: opts.mobileE164,
        fullName: opts.fullName,
        accountStatus: 'active',
        mobileVerifiedAt: new Date(),
      },
    });
    const session = await fakePrisma.userSession.create({
      data: {
        userId: user.id,
        sessionTokenHash: 'hash',
        expiresAt: new Date(Date.now() + 3_600_000),
      },
    });
    if (opts.role) {
      await fakePrisma.staffMembership.create({
        data: {
          userId: user.id,
          staffRole: opts.role,
          status: 'active',
        },
      });
    }
    return {
      id: user.id as bigint,
      token: signToken(user.id as bigint, session.id as bigint),
    };
  }

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    fakePrisma = createFakePrisma();

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(fakePrisma)
      .overrideProvider(SMS_PROVIDER)
      .useClass(DevelopmentSmsProvider)
      .compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    jwtSecret = app.get(ConfigService).get<string>('JWT_ACCESS_SECRET', { infer: true })!;

    // Create actors
    adminUser = await createUser({ mobileE164: '+201011110001', fullName: 'Admin Staff', role: 'admin' });
    reviewerUser = await createUser({ mobileE164: '+201011110002', fullName: 'Assigned Reviewer', role: 'reviewer' });
    otherReviewerUser = await createUser({ mobileE164: '+201011110003', fullName: 'Other Reviewer', role: 'reviewer' });
    caseAgentUser = await createUser({ mobileE164: '+201011110004', fullName: 'Assigned Case Agent', role: 'caseAgent' });
    requesterUser = await createUser({ mobileE164: '+201011110005', fullName: 'Applicant Farmer' });
    ownerUser = await createUser({ mobileE164: '+201011110006', fullName: 'Farm Owner' });
    otherUser = await createUser({ mobileE164: '+201011110007', fullName: 'Unrelated User' });

    // Create farm
    const farm = await fakePrisma.farm.create({
      data: {
        name: 'Unified Request Test Farm',
        farmType: 'fruit',
        areaFeddan: 25,
        governorate: 'Beheira',
        createdBy: ownerUser.id,
      },
    });
    farmId = farm.id as bigint;

    await fakePrisma.farmRelationship.create({
      data: {
        farmId,
        userId: ownerUser.id,
        relationshipRole: 'owner',
        relationshipStatus: 'active',
      },
    });

    // Create draft request (generic partnership workflow — not a specialized listing)
    const r1 = await fakePrisma.request.create({
      data: {
        requestNumber: 'REQ-2026-DRAFT',
        requestType: 'farmPurchaseProposal',
        status: 'draft',
        createdBy: requesterUser.id,
        farmId,
        visibility: 'private',
      },
    });
    draftRequestId = r1.id as bigint;

    // Create under review request
    const r2 = await fakePrisma.request.create({
      data: {
        requestNumber: 'REQ-2026-REVIEW',
        requestType: 'farmPurchaseProposal',
        status: 'underFarmExitReview',
        createdBy: requesterUser.id,
        farmId,
        visibility: 'private',
        submittedAt: new Date(),
      },
    });
    underReviewRequestId = r2.id as bigint;

    await fakePrisma.request.create({
      data: {
        requestNumber: 'REQ-2026-FD-INBOX',
        requestType: 'farmDetails',
        status: 'underFarmExitReview',
        createdBy: requesterUser.id,
        farmId,
        visibility: 'private',
        submittedAt: new Date(),
      },
    });

    // Create document on underReviewRequestId
    const doc = await fakePrisma.requestDocument.create({
      data: {
        requestId: underReviewRequestId,
        uploadedBy: requesterUser.id,
        slotKey: 'title_deed',
        documentType: 'deed',
        originalName: 'deed.pdf',
        storageKey: 'private/req/deed.pdf',
        mimeType: 'application/pdf',
        fileSizeBytes: 2048n,
        reviewStatus: 'uploaded',
      },
    });
    documentId = doc.id as bigint;
  });

  afterAll(async () => {
    await app?.close();
  });

  describe('Authentication & Role Protections', () => {
    it('rejects unauthenticated requests with 401', async () => {
      await http().get('/api/v1/requests').expect(401);
      await http().get('/api/v1/staff/requests').expect(401);
    });

    it('rejects non-staff callers on staff routes with 403', async () => {
      await as(requesterUser).get('/api/v1/staff/requests').expect(403);
      await as(otherUser).put(`/api/v1/staff/requests/${underReviewRequestId}/assignments`).send({}).expect(403);
    });

    it('rejects case agents attempting to record review decisions with 403', async () => {
      await as(caseAgentUser)
        .post(`/api/v1/staff/requests/${underReviewRequestId}/reviews`, { decision: 'approved' })
        .expect(403);
    });

    it('rejects reviewers attempting to forward requests with 403', async () => {
      await as(reviewerUser)
        .post(`/api/v1/staff/requests/${underReviewRequestId}/forwardings`, { recipientUserId: ownerUser.id.toString() })
        .expect(403);
    });
  });

  describe('User Requests Workflow', () => {
    it('lists own requests for requester', async () => {
      const res = json(await as(requesterUser).get('/api/v1/requests').expect(200));
      expect(Array.isArray(res.items)).toBe(true);
      expect((res.items as Json[]).length).toBeGreaterThanOrEqual(2);
      expect((res.items as Json[])[0].creator).toBeDefined();
      expect((res.items as Json[])[0].assignments).toHaveLength(0); // internal assignments hidden
    });

    it('retrieves caller request details', async () => {
      const res = json(await as(requesterUser).get(`/api/v1/requests/${draftRequestId}`).expect(200));
      expect(res.id).toBe(draftRequestId.toString());
      expect(res.status).toBe('draft');
      expect((res.farm as Json)?.name).toBe('Unified Request Test Farm');
    });

    it('prevents cross-user IDOR by returning 404', async () => {
      await as(otherUser).get(`/api/v1/requests/${draftRequestId}`).expect(404);
    });

    it('submits a draft request into review', async () => {
      const res = json(await as(requesterUser).post(`/api/v1/requests/${draftRequestId}/submit`).expect(200));
      expect(res.status).toBe('submitted');
      expect(res.submittedAt).not.toBeNull();
    });

    it('rejects submitting an already submitted request with 409 Conflict', async () => {
      await as(requesterUser).post(`/api/v1/requests/${draftRequestId}/submit`).expect(409);
    });

    it('allows requester to withdraw a pending request', async () => {
      const res = json(
        await as(requesterUser)
          .post(`/api/v1/requests/${draftRequestId}/withdraw`, { reason: 'No longer needed' })
          .expect(200),
      );
      expect(res.status).toBe('withdrawn');
      expect(res.closedAt).not.toBeNull();
    });

    it('rejects withdrawing a closed request with 409 Conflict', async () => {
      await as(requesterUser).post(`/api/v1/requests/${draftRequestId}/withdraw`, {}).expect(409);
    });
  });

  describe('Staff Assignments & Reassignment', () => {
    it('allows admin to assign a reviewer to a request', async () => {
      const res = json(
        await as(adminUser)
          .put(`/api/v1/staff/requests/${underReviewRequestId}/assignments`, {
            assignmentType: 'reviewer',
            assignedStaffId: reviewerUser.id.toString(),
          })
          .expect(200),
      );
      const assignments = res.assignments as Json[];
      expect(assignments.some((a) => a.assignmentType === 'reviewer' && a.assignedStaffId === reviewerUser.id.toString())).toBe(true);
    });

    it('allows admin to assign a case agent to a request', async () => {
      const res = json(
        await as(adminUser)
          .put(`/api/v1/staff/requests/${underReviewRequestId}/assignments`, {
            assignmentType: 'caseAgent',
            assignedStaffId: caseAgentUser.id.toString(),
          })
          .expect(200),
      );
      const assignments = res.assignments as Json[];
      expect(assignments.some((a) => a.assignmentType === 'caseAgent' && a.assignedStaffId === caseAgentUser.id.toString())).toBe(true);
    });

    it('allows admin to reassign reviewer slot atomically', async () => {
      const res = json(
        await as(adminUser)
          .put(`/api/v1/staff/requests/${underReviewRequestId}/assignments`, {
            assignmentType: 'reviewer',
            assignedStaffId: otherReviewerUser.id.toString(),
          })
          .expect(200),
      );
      const assignments = res.assignments as Json[];
      const reviewerAssignment = assignments.find((a) => a.assignmentType === 'reviewer');
      expect(reviewerAssignment?.assignedStaffId).toBe(otherReviewerUser.id.toString());

      // Put it back to reviewerUser for subsequent tests
      await as(adminUser)
        .put(`/api/v1/staff/requests/${underReviewRequestId}/assignments`, {
          assignmentType: 'reviewer',
          assignedStaffId: reviewerUser.id.toString(),
        })
        .expect(200);
    });

    it('rejects non-admin staff assigning personnel with 403', async () => {
      await as(reviewerUser)
        .put(`/api/v1/staff/requests/${underReviewRequestId}/assignments`, {
          assignmentType: 'reviewer',
          assignedStaffId: reviewerUser.id.toString(),
        })
        .expect(403);
    });

    it('rejects assigning staff member to a role they do not hold with 400', async () => {
      await as(adminUser)
        .put(`/api/v1/staff/requests/${underReviewRequestId}/assignments`, {
          assignmentType: 'reviewer',
          assignedStaffId: caseAgentUser.id.toString(), // caseAgent assigned to reviewer slot
        })
        .expect(400);
    });
  });

  describe('Staff Inbox & Request Details Scoping', () => {
    it('allows admin to list all requests with filters in staff inbox', async () => {
      const res = json(
        await as(adminUser)
          .get('/api/v1/staff/requests')
          .query({ requestType: 'farmDetails', status: 'underFarmExitReview' })
          .expect(200),
      );
      expect((res.items as Json[]).length).toBeGreaterThanOrEqual(1);
      expect((res.items as Json[])[0].assignments).toBeDefined();
    });

    it('allows assigned reviewer to view staff request details', async () => {
      const res = json(await as(reviewerUser).get(`/api/v1/staff/requests/${underReviewRequestId}`).expect(200));
      expect(res.id).toBe(underReviewRequestId.toString());
      expect(res.assignments).toBeDefined();
    });

    it('rejects unassigned reviewer accessing restricted request with 403', async () => {
      await as(otherReviewerUser).get(`/api/v1/staff/requests/${underReviewRequestId}`).expect(403);
    });
  });

  describe('Review Decisions', () => {
    it('rejects review on draft request with 409 Conflict', async () => {
      // Re-create a draft
      const draft = await fakePrisma.request.create({
        data: {
          requestNumber: 'REQ-TEST-DRAFT-2',
          requestType: 'farmPurchaseProposal',
          status: 'draft',
          createdBy: requesterUser.id,
        },
      });
      await as(adminUser)
        .post(`/api/v1/staff/requests/${String(draft.id)}/reviews`, { decision: 'approved' })
        .expect(409);
    });

    it('rejects changesRequested decision without a comment with 400', async () => {
      await as(adminUser)
        .post(`/api/v1/staff/requests/${underReviewRequestId}/reviews`, { decision: 'changesRequested' })
        .expect(400);
    });

    it('rejects unassigned reviewer recording review decision with 403', async () => {
      await as(otherReviewerUser)
        .post(`/api/v1/staff/requests/${underReviewRequestId}/reviews`, {
          decision: 'approved',
          comment: 'Approved by other',
        })
        .expect(403);
    });

    it('allows assigned reviewer to approve request', async () => {
      const res = json(
        await as(reviewerUser)
          .post(`/api/v1/staff/requests/${underReviewRequestId}/reviews`, {
            decision: 'approved',
            comment: 'Documents and specifications verified',
          })
          .expect(200),
      );
      expect(res.status).toBe('approved');
      expect((res.reviews as Json[]).some((r) => r.decision === 'approved')).toBe(true);
    });
  });

  describe('Internal Forwarding & Mediated Communication', () => {
    it('allows assigned case agent to forward approved request to farm owner', async () => {
      const res = json(
        await as(caseAgentUser)
          .post(`/api/v1/staff/requests/${underReviewRequestId}/forwardings`, {
            recipientUserId: ownerUser.id.toString(),
            internalNotes: 'Forwarding approved listing to farm owner',
          })
          .expect(200),
      );
      expect(res.status).toBe('sentToOwner');
      const forwardings = res.forwardings as Json[];
      expect(forwardings).toHaveLength(1);
      expect(forwardings[0].recipientUserId).toBe(ownerUser.id.toString());
      expect(forwardings[0].ownerDecision).toBe('pending');
      forwardingId = BigInt(forwardings[0].id as string);
    });

    it('rejects self-forwarding to requester with 400', async () => {
      await as(adminUser)
        .post(`/api/v1/staff/requests/${underReviewRequestId}/forwardings`, {
          recipientUserId: requesterUser.id.toString(),
        })
        .expect(400);
    });

    it('rejects reviewers recording staff-mediated owner decision with 403', async () => {
      await as(reviewerUser)
        .post(`/api/v1/staff/requests/${underReviewRequestId}/forwardings/${forwardingId}/decision`, {
          decision: 'accepted',
        })
        .expect(403);
    });

    it('allows assigned case agent to record mediated owner decision via staff route', async () => {
      const res = json(
        await as(caseAgentUser)
          .post(`/api/v1/staff/requests/${underReviewRequestId}/forwardings/${forwardingId}/decision`, {
            decision: 'accepted',
            reason: 'Listing approved for publication',
          })
          .expect(200),
      );
      expect(res.status).toBe('accepted');
      const forwardings = res.forwardings as Json[];
      const decided = forwardings.find((f) => f.id === forwardingId.toString());
      expect(decided?.ownerDecision).toBe('accepted');
      expect(decided?.decisionReason).toBe('Listing approved for publication');
    });

    it('rejects repeat owner decision on finalized forwarding with 409', async () => {
      await as(ownerUser)
        .post(`/api/v1/requests/${underReviewRequestId}/forwardings/${forwardingId}/decision`, {
          decision: 'declined',
        })
        .expect(409);
    });

    it('rejects repeat staff-mediated decision with 409', async () => {
      await as(caseAgentUser)
        .post(`/api/v1/staff/requests/${underReviewRequestId}/forwardings/${forwardingId}/decision`, {
          decision: 'declined',
        })
        .expect(409);
    });

    it('rejects unrelated user recording owner decision with 403', async () => {
      await as(otherUser)
        .post(`/api/v1/requests/${underReviewRequestId}/forwardings/${forwardingId}/decision`, {
          decision: 'declined',
        })
        .expect(403);
    });
  });

  describe('Document Review & Resource Isolation', () => {
    it('allows staff to review attached document', async () => {
      const res = json(
        await as(reviewerUser)
          .patch(`/api/v1/staff/requests/${underReviewRequestId}/documents/${documentId}`, {
            reviewStatus: 'reviewed',
            reviewNote: 'Title deed confirmed with agricultural registry',
          })
          .expect(200),
      );
      const docs = res.documents as Json[];
      const reviewedDoc = docs.find((d) => d.id === documentId.toString());
      expect(reviewedDoc?.reviewStatus).toBe('reviewed');
      expect(reviewedDoc?.reviewNote).toBe('Title deed confirmed with agricultural registry');
    });

    it('rejects reviewing document belonging to a different request with 404', async () => {
      await as(reviewerUser)
        .patch(`/api/v1/staff/requests/${draftRequestId}/documents/${documentId}`, {
          reviewStatus: 'reviewed',
        })
        .expect(404);
    });
  });
});
