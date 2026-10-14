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

describe('FarmExit Score & Evaluations E2E', () => {
  let app: INestApplication<App>;
  let fakePrisma: FakePrisma;
  let jwtSecret: string;

  let adminUser: { id: bigint; token: string };
  let reviewerUser: { id: bigint; token: string };
  let caseAgentUser: { id: bigint; token: string };
  let regularUser: { id: bigint; token: string };

  let farmId: bigint;
  let farm2Id: bigint;
  let listingRequestId: bigint;

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

    // Create users
    adminUser = await createUser({ mobileE164: '+201011111111', fullName: 'Admin Staff', role: 'admin' });
    reviewerUser = await createUser({ mobileE164: '+201022222222', fullName: 'Reviewer Staff', role: 'reviewer' });
    caseAgentUser = await createUser({ mobileE164: '+201033333333', fullName: 'Case Agent Staff', role: 'caseAgent' });
    regularUser = await createUser({ mobileE164: '+201044444444', fullName: 'Regular Farmer' });

    // Create test farms
    const f1 = await fakePrisma.farm.create({
      data: {
        name: 'Evaluation Test Farm 1',
        farmType: 'fruit',
        areaFeddan: 15,
        governorate: 'Beheira',
        createdBy: regularUser.id,
      },
    });
    farmId = f1.id as bigint;

    const f2 = await fakePrisma.farm.create({
      data: {
        name: 'Evaluation Test Farm 2',
        farmType: 'vegetable',
        areaFeddan: 20,
        governorate: 'Giza',
        createdBy: regularUser.id,
      },
    });
    farm2Id = f2.id as bigint;

    // Create a listing request on farmId
    const req = await fakePrisma.request.create({
      data: {
        requestNumber: 'REQ-EVAL-001',
        requestType: 'farmListing',
        farmId,
        createdBy: regularUser.id,
        status: 'underFarmExitReview',
      },
    });
    listingRequestId = req.id as bigint;

    // Assign reviewerUser as reviewer to listingRequestId
    await fakePrisma.requestStaffAssignment.create({
      data: {
        requestId: listingRequestId,
        assignedStaffId: reviewerUser.id,
        assignedByUserId: adminUser.id,
        assignmentType: 'reviewer',
      },
    });
  });

  afterAll(async () => {
    await app?.close();
  });

  describe('Authentication & Authorization', () => {
    it('rejects unauthenticated requests with 401', async () => {
      await http().get(`/api/v1/farms/${farmId}/evaluations`).expect(401);
      await http().post(`/api/v1/farms/${farmId}/evaluations`).send({}).expect(401);
    });

    it('rejects regular non-staff users with 403', async () => {
      await as(regularUser).get(`/api/v1/farms/${farmId}/evaluations`).expect(403);
      await as(regularUser).post(`/api/v1/farms/${farmId}/evaluations`, {}).expect(403);
    });

    it('rejects case agents (missing evaluations.manage) with 403', async () => {
      await as(caseAgentUser).get(`/api/v1/farms/${farmId}/evaluations`).expect(403);
      await as(caseAgentUser).post(`/api/v1/farms/${farmId}/evaluations`, {}).expect(403);
    });

    it('rejects reviewer creating evaluation without assigned listing request with 403', async () => {
      await as(reviewerUser)
        .post(`/api/v1/farms/${farmId}/evaluations`, { scoreValue: 80, scoreMax: 100 })
        .expect(403);
    });

    it('rejects reviewer creating evaluation on unassigned farm with 403', async () => {
      await as(reviewerUser)
        .post(`/api/v1/farms/${farm2Id}/evaluations`, { listingRequestId: listingRequestId.toString() })
        .expect(400); // request belongs to farmId, not farm2Id
    });

    it('rejects reviewer reading evaluations on an unassigned farm with 403', async () => {
      await as(reviewerUser).get(`/api/v1/farms/${farm2Id}/evaluations`).expect(403);
      await as(reviewerUser).get(`/api/v1/farms/${farm2Id}/evaluations/latest`).expect(403);
    });

    it('allows reviewer reading evaluations on an assigned farm', async () => {
      await as(reviewerUser).get(`/api/v1/farms/${farmId}/evaluations`).expect(200);
    });
  });

  describe('Scoring Validation', () => {
    it('rejects negative scoreValue with 400', async () => {
      const res = await as(adminUser)
        .post(`/api/v1/farms/${farmId}/evaluations`, { scoreValue: -1, scoreMax: 100 })
        .expect(400);
      expect(JSON.stringify(res.body)).toContain('scoreValue cannot be negative');
    });

    it('rejects scoreValue exceeding scoreMax with 400', async () => {
      const res = await as(adminUser)
        .post(`/api/v1/farms/${farmId}/evaluations`, { scoreValue: 105, scoreMax: 100 })
        .expect(400);
      expect(JSON.stringify(res.body)).toContain('scoreValue cannot exceed scoreMax');
    });

    it('rejects scoreMax <= 0 with 400', async () => {
      const res = await as(adminUser)
        .post(`/api/v1/farms/${farmId}/evaluations`, { scoreValue: 0, scoreMax: 0 })
        .expect(400);
      expect(JSON.stringify(res.body)).toContain('scoreMax must be greater than zero');
    });

    it('rejects scoreValue provided without scoreMax with 400', async () => {
      const res = await as(adminUser)
        .post(`/api/v1/farms/${farmId}/evaluations`, { scoreValue: 50 })
        .expect(400);
      expect(JSON.stringify(res.body)).toContain('scoreMax is required when scoreValue is provided');
    });

    it('allows evaluation without any scores (both null)', async () => {
      const res = json(
        await as(adminUser)
          .post(`/api/v1/farms/${farmId}/evaluations`, {
            methodologyName: 'Qualitative Only',
            reviewScopeEn: 'Environmental check only',
          })
          .expect(201),
      );
      expect(res.scoreValue).toBeNull();
      expect(res.scoreMax).toBeNull();
      expect(res.status).toBe('draft');
    });
  });

  describe('Complete Evaluation Lifecycle & History', () => {
    let evaluationId: string;

    it('allows assigned reviewer to create draft evaluation with valid score', async () => {
      const res = json(
        await as(reviewerUser)
          .post(`/api/v1/farms/${farmId}/evaluations`, {
            listingRequestId: listingRequestId.toString(),
            scoreValue: 82.5,
            scoreMax: 100,
            methodologyName: 'Standard FarmExit Score',
            methodologyVersion: 'v1.0',
            reviewScopeEn: 'Verified water rights and soil salinity tests',
            publicSummaryEn: 'Good irrigation infrastructure with standard soil fertility',
            internalNotes: 'Private note: soil test document verified by agronomist',
            status: 'draft',
            checks: [
              {
                checkKey: 'water_source_inspection',
                checkStatus: 'reviewed',
                reviewerNotes: 'Well pump operational',
              },
            ],
          })
          .expect(201),
      );

      evaluationId = res.id as string;
      expect(res.farmId).toBe(farmId.toString());
      expect(res.scoreValue).toBe(82.5);
      expect(res.scoreMax).toBe(100);
      expect(res.status).toBe('draft');
      expect((res.checks as Json[])).toHaveLength(1);
    });

    it('retrieves evaluation details by ID', async () => {
      const res = json(
        await as(adminUser).get(`/api/v1/farms/${farmId}/evaluations/${evaluationId}`).expect(200),
      );
      expect(res.id).toBe(evaluationId);
      expect(res.scoreValue).toBe(82.5);
      expect(res.internalNotes).toBe('Private note: soil test document verified by agronomist');
    });

    it('retrieves the latest evaluation for the farm', async () => {
      const res = json(await as(adminUser).get(`/api/v1/farms/${farmId}/evaluations/latest`).expect(200));
      expect(res.id).toBe(evaluationId);
    });

    it('returns 404 for latest evaluation on farm without evaluations', async () => {
      await as(adminUser).get(`/api/v1/farms/${farm2Id}/evaluations/latest`).expect(404);
    });

    it('retrieves paginated evaluation history for the farm', async () => {
      const history = json(await as(adminUser).get(`/api/v1/farms/${farmId}/evaluations?page=1&pageSize=10`).expect(200));
      expect(Number(history.total)).toBeGreaterThanOrEqual(2);
      expect((history.items as Json[]).some((item) => item.id === evaluationId)).toBe(true);
    });

    it('records an additional evaluation check', async () => {
      const checkRes = json(
        await as(reviewerUser)
          .post(`/api/v1/farms/${farmId}/evaluations/${evaluationId}/checks`, {
            checkKey: 'soil_salinity_check',
            checkStatus: 'reviewed',
            reviewerNotes: 'EC level < 1.5 dS/m',
          })
          .expect(200),
      );

      expect(checkRes.checkKey).toBe('soil_salinity_check');
      expect(checkRes.checkStatus).toBe('reviewed');
    });

    it('allows updating incomplete evaluation (draft / in_review)', async () => {
      const updated = json(
        await as(reviewerUser)
          .patch(`/api/v1/farms/${farmId}/evaluations/${evaluationId}`, {
            scoreValue: 85,
            status: 'inReview',
          })
          .expect(200),
      );

      expect(updated.scoreValue).toBe(85);
      expect(updated.status).toBe('inReview');
    });

    it('rejects reviewer attempting to approve or publish evaluation with 403', async () => {
      await as(reviewerUser)
        .patch(`/api/v1/farms/${farmId}/evaluations/${evaluationId}`, {
          status: 'approved',
        })
        .expect(403);

      await as(reviewerUser)
        .patch(`/api/v1/farms/${farmId}/evaluations/${evaluationId}`, {
          status: 'published',
        })
        .expect(403);
    });

    it('allows admin to approve and publish evaluation', async () => {
      const published = json(
        await as(adminUser)
          .patch(`/api/v1/farms/${farmId}/evaluations/${evaluationId}`, {
            status: 'published',
          })
          .expect(200),
      );

      expect(published.status).toBe('published');
      expect(published.publishedAt).not.toBeNull();
      expect((published.approver as Json)?.id).toBe(adminUser.id.toString());
    });

    it('rejects editing a published evaluation with 409 Conflict', async () => {
      await as(adminUser)
        .patch(`/api/v1/farms/${farmId}/evaluations/${evaluationId}`, {
          scoreValue: 90,
        })
        .expect(409);
    });

    it('rejects adding checks to a published evaluation with 409 Conflict', async () => {
      await as(adminUser)
        .post(`/api/v1/farms/${farmId}/evaluations/${evaluationId}/checks`, {
          checkKey: 'late_check',
        })
        .expect(409);
    });

    it('supersedes older published evaluation when a new one is published', async () => {
      // Admin creates another evaluation on farmId and publishes it
      const ev2 = json(
        await as(adminUser)
          .post(`/api/v1/farms/${farmId}/evaluations`, {
            scoreValue: 92,
            scoreMax: 100,
            methodologyName: 'V2',
          })
          .expect(201),
      );

      await as(adminUser)
        .patch(`/api/v1/farms/${farmId}/evaluations/${String(ev2.id)}`, {
          status: 'published',
        })
        .expect(200);

      // Previous evaluationId must now be superseded
      const prev = json(await as(adminUser).get(`/api/v1/farms/${farmId}/evaluations/${evaluationId}`).expect(200));
      expect(prev.status).toBe('superseded');
    });

    it('prevents cross-farm IDOR by returning 404 when evaluation does not match farmId', async () => {
      // evaluationId belongs to farmId, trying to access it under farm2Id route
      await as(adminUser).get(`/api/v1/farms/${farm2Id}/evaluations/${evaluationId}`).expect(404);
      await as(adminUser)
        .patch(`/api/v1/farms/${farm2Id}/evaluations/${evaluationId}`, { scoreValue: 50 })
        .expect(404);
    });
  });

  describe('Privacy & Public Isolation', () => {
    it('does not expose internal evaluation scores or notes to public marketplace', async () => {
      const publicMarketplace = json(await http().get('/api/v1/marketplace/farms').expect(200));
      const serialized = JSON.stringify(publicMarketplace);
      expect(serialized).not.toContain('Soil & Irrigation Standard');
      expect(serialized).not.toContain('Private note');
      expect(serialized).not.toContain('EC level');
    });
  });
});
