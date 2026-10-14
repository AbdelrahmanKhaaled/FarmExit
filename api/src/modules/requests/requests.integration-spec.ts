import { randomBytes, randomInt } from 'node:crypto';
import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { type App } from 'supertest/types';
import { AppModule } from '../../app.module';
import { configureApp } from '../../common/app-setup';
import { PrismaService } from '../../prisma/prisma.service';
import { TokenService } from '../auth/token.service';

const describeDb = process.env.RUN_DB_INTEGRATION === '1' ? describe : describe.skip;

type Json = Record<string, unknown>;
const json = (res: { body: unknown }): Json => res.body as Json;

describeDb('Unified Requests on real MySQL', () => {
  const mobiles = [0, 1, 2, 3].map(
    () => `+2016${String(randomInt(0, 100_000_000)).padStart(8, '0')}`,
  ) as [string, string, string, string];

  let app: INestApplication<App>;
  let prisma: PrismaService;
  let admin: { id: bigint; token: string };
  let reviewer: { id: bigint; token: string };
  let requester: { id: bigint; token: string };
  let owner: { id: bigint; token: string };
  let farmId: bigint;
  let requestId: bigint;
  const createdUserIds: bigint[] = [];

  const http = () => request(app.getHttpServer());
  const as = (u: { token: string }) => ({
    post: (path: string, body: object = {}) => http().post(path).set('Authorization', `Bearer ${u.token}`).send(body),
    get: (path: string) => http().get(path).set('Authorization', `Bearer ${u.token}`),
    put: (path: string, body: object = {}) => http().put(path).set('Authorization', `Bearer ${u.token}`).send(body),
    patch: (path: string, body: object = {}) => http().patch(path).set('Authorization', `Bearer ${u.token}`).send(body),
  });

  async function makeUser(
    mobileE164: string,
    fullName: string,
    role?: 'admin' | 'reviewer' | 'caseAgent',
  ): Promise<{ id: bigint; token: string }> {
    const now = new Date();
    const user = await prisma.user.create({
      data: { mobileE164, fullName, mobileVerifiedAt: now, createdAt: now },
    });
    createdUserIds.push(user.id);
    const session = await prisma.userSession.create({
      data: {
        userId: user.id,
        sessionTokenHash: randomBytes(32).toString('hex'),
        expiresAt: new Date(now.getTime() + 3_600_000),
        createdAt: now,
      },
    });
    if (role) {
      await prisma.staffMembership.create({
        data: { userId: user.id, staffRole: role, status: 'active', createdAt: now },
      });
    }
    return { id: user.id, token: app.get(TokenService).signAccessToken(user.id, session.id) };
  }

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);

    admin = await makeUser(mobiles[0], 'Integration Admin', 'admin');
    reviewer = await makeUser(mobiles[1], 'Integration Reviewer', 'reviewer');
    requester = await makeUser(mobiles[2], 'Integration Requester');
    owner = await makeUser(mobiles[3], 'Integration Farm Owner');

    const farm = await prisma.farm.create({
      data: {
        name: 'MySQL Integration Request Farm',
        farmType: 'mixed',
        areaFeddan: 30,
        governorate: 'Ismailia',
        createdBy: owner.id,
      },
    });
    farmId = farm.id;
    await prisma.farmRelationship.create({
      data: {
        farmId,
        userId: owner.id,
        relationshipRole: 'owner',
        relationshipStatus: 'active',
      },
    });
  });

  afterAll(async () => {
    if (prisma) {
      if (requestId) {
        await prisma.requestForwarding.deleteMany({ where: { requestId } });
        await prisma.requestReview.deleteMany({ where: { requestId } });
        await prisma.requestStaffAssignment.deleteMany({ where: { requestId } });
        await prisma.requestStatusHistory.deleteMany({ where: { requestId } });
        await prisma.auditLog.deleteMany({ where: { entityType: 'request', entityId: requestId } });
        await prisma.request.deleteMany({ where: { id: requestId } });
      }
      if (farmId) {
        await prisma.farm.deleteMany({ where: { id: farmId } });
      }
      for (const uid of createdUserIds) {
        await prisma.staffMembership.deleteMany({ where: { userId: uid } });
        await prisma.userSession.deleteMany({ where: { userId: uid } });
        await prisma.user.deleteMany({ where: { id: uid } });
      }
    }
    await app?.close();
  });

  it('rejects regular non-staff user accessing staff request inbox with 403 on real MySQL', async () => {
    await as(requester).get('/api/v1/staff/requests').expect(403);
  });

  it('creates draft request and submits it through user endpoint on real MySQL', async () => {
    // Create draft request in database
    const req = await prisma.request.create({
      data: {
        requestNumber: `REQ-MYSQL-${String(randomInt(1000, 9999))}`,
        requestType: 'partnership',
        status: 'draft',
        createdBy: requester.id,
        farmId,
        visibility: 'private',
      },
    });
    requestId = req.id;

    // Caller submits draft request
    const submitted = json(await as(requester).post(`/api/v1/requests/${String(requestId)}/submit`).expect(200));
    expect(submitted.status).toBe('submitted');

    // Confirm DB status and history record
    const inDb = await prisma.request.findUnique({ where: { id: requestId } });
    expect(inDb?.status).toBe('submitted');

    const history = await prisma.requestStatusHistory.findFirst({ where: { requestId } });
    expect(history?.toStatus).toBe('submitted');
  });

  it('admin assigns reviewer, reviewer approves, and owner accepts forwarding on real MySQL', async () => {
    // 1. Admin assigns reviewer
    const assigned = json(
      await as(admin)
        .put(`/api/v1/staff/requests/${String(requestId)}/assignments`, {
          assignmentType: 'reviewer',
          assignedStaffId: String(reviewer.id),
        })
        .expect(200),
    );
    expect(Array.isArray(assigned.assignments)).toBe(true);

    // 2. Reviewer approves request
    const reviewed = json(
      await as(reviewer)
        .post(`/api/v1/staff/requests/${String(requestId)}/reviews`, {
          decision: 'approved',
          comment: 'Legal and technical criteria verified on real MySQL',
        })
        .expect(200),
    );
    expect(reviewed.status).toBe('approved');

    // 3. Admin forwards to owner
    const forwarded = json(
      await as(admin)
        .post(`/api/v1/staff/requests/${String(requestId)}/forwardings`, {
          recipientUserId: String(owner.id),
          internalNotes: 'Forwarded approved listing to farm owner on real MySQL',
        })
        .expect(200),
    );
    expect(forwarded.status).toBe('sentToOwner');
    const fId = (forwarded.forwardings as Json[])[0].id as string;

    // 4. Owner accepts forwarding
    const decided = json(
      await as(owner)
        .post(`/api/v1/requests/${String(requestId)}/forwardings/${fId}/decision`, {
          decision: 'accepted',
          reason: 'Terms approved by farm owner on real MySQL',
        })
        .expect(200),
    );
    expect(decided.status).toBe('accepted');

    // Confirm DB state
    const finalInDb = await prisma.request.findUnique({ where: { id: requestId } });
    expect(finalInDb?.status).toBe('accepted');
  });
});
