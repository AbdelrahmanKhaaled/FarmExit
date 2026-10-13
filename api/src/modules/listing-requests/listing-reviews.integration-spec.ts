import { randomBytes, randomInt } from 'node:crypto';
import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { type App } from 'supertest/types';
import { AppModule } from '../../app.module';
import { configureApp } from '../../common/app-setup';
import { PrismaService } from '../../prisma/prisma.service';
import { TokenService } from '../auth/token.service';

/** Real MySQL review decisions (opt-in: RUN_DB_INTEGRATION=1). Cleanup removes only the users this file creates. */
const describeDb = process.env.RUN_DB_INTEGRATION === '1' ? describe : describe.skip;

type Json = Record<string, unknown>;
type U = { id: bigint; token: string };
const json = (res: { body: unknown }): Json => res.body as Json;
const INBOX = '/api/v1/staff/listing-requests';

describeDb('Listing review decisions on real MySQL', () => {
  const mobiles = [0, 1, 2, 3].map(() => `+2015${String(randomInt(0, 100_000_000)).padStart(8, '0')}`);
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let owner: U;
  let admin: U;
  let reviewer: U;
  let agent: U;
  let farmId: string;
  const createdUserIds: bigint[] = [];
  const http = () => request(app.getHttpServer());
  const as = (u: U) => ({
    get: (path: string) => http().get(path).set('Authorization', `Bearer ${u.token}`),
    post: (path: string, body: object = {}) => http().post(path).set('Authorization', `Bearer ${u.token}`).send(body),
    put: (path: string, body: object = {}) => http().put(path).set('Authorization', `Bearer ${u.token}`).send(body),
    patch: (path: string, body: object = {}) => http().patch(path).set('Authorization', `Bearer ${u.token}`).send(body),
  });

  async function makeUser(mobileE164: string, staffRole?: 'admin' | 'reviewer' | 'caseAgent'): Promise<U> {
    const now = new Date();
    const user = await prisma.user.create({
      data: { mobileE164, fullName: 'Review Integration', mobileVerifiedAt: now, createdAt: now, email: `${userIdSafe(mobileE164)}@example.test` },
    });
    createdUserIds.push(user.id);
    if (staffRole) await prisma.staffMembership.create({ data: { userId: user.id, staffRole, status: 'active' } });
    const session = await prisma.userSession.create({
      data: {
        userId: user.id,
        sessionTokenHash: randomBytes(32).toString('hex'),
        expiresAt: new Date(now.getTime() + 3_600_000),
        createdAt: now,
      },
    });
    return { id: user.id, token: app.get(TokenService).signAccessToken(user.id, session.id) };
  }

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    if ((await prisma.user.count({ where: { mobileE164: { in: mobiles } } })) > 0) {
      throw new Error('Test numbers already in use; aborting without changes');
    }
    owner = await makeUser(mobiles[0]);
    admin = await makeUser(mobiles[1], 'admin');
    reviewer = await makeUser(mobiles[2], 'reviewer');
    agent = await makeUser(mobiles[3], 'caseAgent');
    farmId = json(
      await as(owner)
        .post('/api/v1/farms', { name: 'Decision Farm', farmType: 'fruit', areaFeddan: 8, governorate: 'Beheira' })
        .expect(201),
    ).id as string;
  });

  afterAll(async () => {
    try {
      if (createdUserIds.length > 0) {
        const ids = createdUserIds;
        await prisma.auditLog.deleteMany({ where: { actorUserId: { in: ids } } });
        await prisma.requestStaffAssignment.deleteMany({
          where: { OR: [{ assignedStaffId: { in: ids } }, { assignedByUserId: { in: ids } }] },
        });
        const requests = await prisma.request.findMany({ where: { createdBy: { in: ids } }, select: { id: true } });
        const requestIds = requests.map((row) => row.id);
        if (requestIds.length > 0) {
          await prisma.requestReview.deleteMany({ where: { requestId: { in: requestIds } } });
          await prisma.requestStaffAssignment.deleteMany({ where: { requestId: { in: requestIds } } });
          await prisma.requestStatusHistory.deleteMany({ where: { requestId: { in: requestIds } } });
          await prisma.farmListingDetail.deleteMany({ where: { requestId: { in: requestIds } } });
          await prisma.request.deleteMany({ where: { id: { in: requestIds }, createdBy: { in: ids } } });
        }
        const farms = await prisma.farm.findMany({ where: { createdBy: { in: ids } }, select: { id: true } });
        const farmIds = farms.map((farm) => farm.id);
        if (farmIds.length > 0) {
          await prisma.farmRelationship.deleteMany({ where: { farmId: { in: farmIds } } });
          await prisma.farm.deleteMany({ where: { id: { in: farmIds }, createdBy: { in: ids } } });
        }
        await prisma.staffMembership.deleteMany({ where: { userId: { in: ids } } });
        await prisma.userSession.deleteMany({ where: { userId: { in: ids } } });
        await prisma.user.deleteMany({ where: { id: { in: ids }, mobileE164: { in: mobiles } } });
      }
    } finally {
      await app?.close();
    }
  });

  it('keeps one decision when two staff decide together, then one resubmit when the owner sends it twice', async () => {
    const created = json(
      await as(owner)
        .post(`/api/v1/farms/${farmId}/listing-requests`, { listingType: 'sale', askingPrice: 4_000_000 })
        .expect(201),
    );
    const id = created.id as string;
    await as(owner).post(`/api/v1/listing-requests/${id}/submit`).expect(200);
    await as(admin)
      .put(`${INBOX}/${id}/assignments`, { assignmentType: 'reviewer', assignedStaffId: reviewer.id.toString() })
      .expect(200);
    await as(agent).post(`${INBOX}/${id}/decision`, { decision: 'rejected', comment: 'No' }).expect(403);

    const [fromAdmin, fromReviewer] = await Promise.all([
      as(admin).post(`${INBOX}/${id}/decision`, { decision: 'approved' }),
      as(reviewer).post(`${INBOX}/${id}/decision`, { decision: 'changesRequested', comment: 'State the water source' }),
    ]);
    const statuses = [fromAdmin.status, fromReviewer.status].sort();
    expect(statuses).toEqual([200, 409]);

    const requestId = BigInt(id);
    const row = await prisma.request.findUniqueOrThrow({ where: { id: requestId } });
    expect(row.visibility).toBe('private');
    expect(row.publishedAt).toBeNull();
    expect(['approved', 'changesRequested']).toContain(row.status);
    const reviews = await prisma.requestReview.findMany({ where: { requestId }, orderBy: { id: 'asc' } });
    expect(reviews).toHaveLength(1);
    expect(reviews[0]?.decision).toBe(row.status);
    const winner = fromAdmin.status === 200 ? fromAdmin : fromReviewer;
    expect(json(winner).status).toBe(row.status);
    expect(JSON.stringify(json(winner))).not.toMatch(/mobile|@example\.test|privatePin/);
    expect(await prisma.communicationCase.count({ where: { requestId } })).toBe(0);
    const decisionHistory = await prisma.requestStatusHistory.findMany({
      where: { requestId, fromStatus: 'underFarmExitReview' },
    });
    expect(decisionHistory).toHaveLength(1);
    expect(decisionHistory[0]).toMatchObject({ toStatus: row.status, changedBy: reviews[0]?.reviewerId });

    if (row.status !== 'changesRequested') {
      await prisma.$transaction([
        prisma.requestReview.deleteMany({ where: { requestId } }),
        prisma.request.update({ where: { id: requestId }, data: { status: 'underFarmExitReview', publishedAt: null, visibility: 'private' } }),
      ]);
      await as(reviewer)
        .post(`${INBOX}/${id}/decision`, { decision: 'changesRequested', comment: 'State the water source' })
        .expect(200);
    }

    const edited = json(await as(owner).patch(`/api/v1/listing-requests/${id}`, { listingDescription: 'Water is a well' }).expect(200));
    expect(edited.status).toBe('changesRequested');
    const [firstSubmit, secondSubmit] = await Promise.all([
      as(owner).post(`/api/v1/listing-requests/${id}/submit`, {}),
      as(owner).post(`/api/v1/listing-requests/${id}/submit`, {}),
    ]);
    expect([firstSubmit.status, secondSubmit.status].sort()).toEqual([200, 409]);
    const resubmitted = await prisma.request.findUniqueOrThrow({ where: { id: requestId } });
    expect(resubmitted).toMatchObject({ status: 'underFarmExitReview', visibility: 'private', publishedAt: null });
    expect(await prisma.requestReview.count({ where: { requestId } })).toBeGreaterThanOrEqual(1);
    const history = await prisma.requestStatusHistory.findMany({ where: { requestId }, orderBy: { id: 'asc' } });
    expect(history.map((entry) => entry.toStatus)).toEqual(
      expect.arrayContaining(['draft', 'underFarmExitReview', 'changesRequested', 'underFarmExitReview']),
    );
    expect(history.filter((entry) => entry.fromStatus === 'changesRequested' && entry.toStatus === 'underFarmExitReview')).toHaveLength(1);
    const ownerView = json(await as(owner).get(`/api/v1/listing-requests/${id}`).expect(200));
    expect(JSON.stringify(ownerView)).toContain('State the water source');
    expect(JSON.stringify(ownerView)).not.toMatch(/reviewerId|@example\.test|privatePin/);
  });
});

function userIdSafe(mobile: string): string {
  return mobile.replace(/\D/g, '');
}
