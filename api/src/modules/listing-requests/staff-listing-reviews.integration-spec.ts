import { randomBytes, randomInt } from 'node:crypto';
import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { type App } from 'supertest/types';
import { AppModule } from '../../app.module';
import { configureApp } from '../../common/app-setup';
import { PrismaService } from '../../prisma/prisma.service';
import { TokenService } from '../auth/token.service';

/** Real MySQL staff assignment (opt-in: RUN_DB_INTEGRATION=1). Cleanup removes only the users this file creates. */
const describeDb = process.env.RUN_DB_INTEGRATION === '1' ? describe : describe.skip;

type Json = Record<string, unknown>;
type U = { id: bigint; token: string };
const json = (res: { body: unknown }): Json => res.body as Json;
const INBOX = '/api/v1/staff/listing-requests';

describeDb('Staff listing assignments on real MySQL', () => {
  const mobiles = [0, 1, 2, 3, 4, 5].map(() => `+2015${String(randomInt(0, 100_000_000)).padStart(8, '0')}`);
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let owner: U;
  let adminA: U;
  let adminB: U;
  let reviewerA: U;
  let reviewerB: U;
  let agent: U;
  let farmId: string;
  const createdUserIds: bigint[] = [];
  const http = () => request(app.getHttpServer());
  const as = (u: U) => ({
    get: (path: string) => http().get(path).set('Authorization', `Bearer ${u.token}`),
    post: (path: string, body: object = {}) => http().post(path).set('Authorization', `Bearer ${u.token}`).send(body),
    put: (path: string, body: object = {}) => http().put(path).set('Authorization', `Bearer ${u.token}`).send(body),
  });

  async function makeUser(mobileE164: string, staffRole?: 'admin' | 'reviewer' | 'caseAgent'): Promise<U> {
    const now = new Date();
    const user = await prisma.user.create({
      data: { mobileE164, fullName: 'Integration Staff', mobileVerifiedAt: now, createdAt: now },
    });
    createdUserIds.push(user.id);
    if (staffRole) {
      await prisma.staffMembership.create({ data: { userId: user.id, staffRole, status: 'active' } });
    }
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
    adminA = await makeUser(mobiles[1], 'admin');
    adminB = await makeUser(mobiles[2], 'admin');
    reviewerA = await makeUser(mobiles[3], 'reviewer');
    reviewerB = await makeUser(mobiles[4], 'reviewer');
    agent = await makeUser(mobiles[5], 'caseAgent');
    farmId = json(
      await as(owner)
        .post('/api/v1/farms', { name: 'Review Farm', farmType: 'fruit', areaFeddan: 8, governorate: 'Beheira' })
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
          await prisma.requestStaffAssignment.deleteMany({ where: { requestId: { in: requestIds } } });
          await prisma.requestReview.deleteMany({ where: { requestId: { in: requestIds } } });
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

  it('keeps one reviewer row when two admins assign together, and leaves the case agent slot independent', async () => {
    const created = json(
      await as(owner)
        .post(`/api/v1/farms/${farmId}/listing-requests`, { listingType: 'sale', askingPrice: 4_000_000 })
        .expect(201),
    );
    const id = created.id as string;
    await as(owner).post(`/api/v1/listing-requests/${id}/submit`).expect(200);
    await as(reviewerA).get(`${INBOX}/${id}`).expect(404);

    const [first, second, caseSlot] = await Promise.all([
      as(adminA).put(`${INBOX}/${id}/assignments`, {
        assignmentType: 'reviewer',
        assignedStaffId: reviewerA.id.toString(),
      }),
      as(adminB).put(`${INBOX}/${id}/assignments`, {
        assignmentType: 'reviewer',
        assignedStaffId: reviewerB.id.toString(),
      }),
      as(adminA).put(`${INBOX}/${id}/assignments`, {
        assignmentType: 'caseAgent',
        assignedStaffId: agent.id.toString(),
      }),
    ]);
    expect([first.status, second.status, caseSlot.status].every((status) => status === 200 || status === 409)).toBe(true);
    expect(caseSlot.status).toBe(200);

    const requestId = BigInt(id);
    const slots = await prisma.requestStaffAssignment.findMany({ where: { requestId } });
    expect(slots).toHaveLength(2);
    const reviewer = slots.find((slot) => slot.assignmentType === 'reviewer');
    const caseAgent = slots.find((slot) => slot.assignmentType === 'caseAgent');
    expect([reviewerA.id, reviewerB.id]).toContain(reviewer?.assignedStaffId);
    expect(caseAgent?.assignedStaffId).toBe(agent.id);
    const row = await prisma.request.findUniqueOrThrow({ where: { id: requestId } });
    expect(row).toMatchObject({ status: 'underFarmExitReview', visibility: 'private', publishedAt: null });
    expect(await prisma.communicationCase.count({ where: { requestId } })).toBe(0);
    expect(await prisma.requestReview.count({ where: { requestId } })).toBe(0);
    const audits = await prisma.auditLog.findMany({
      where: { entityType: 'request_staff_assignment', entityId: { in: slots.map((slot) => slot.id) } },
      orderBy: { id: 'asc' },
    });
    expect(audits.length).toBeGreaterThanOrEqual(2);
    expect(audits.every((entry) => entry.actorUserId === adminA.id || entry.actorUserId === adminB.id)).toBe(true);
    const stored = JSON.stringify(audits.map((entry) => entry.changes));
    expect(stored).not.toMatch(/mobile|email|privatePin/);
    const reviewerAudits = audits.filter(
      (entry) => (entry.changes as { assignmentType?: string } | null)?.assignmentType === 'reviewer',
    );
    const latest = reviewerAudits.at(-1)?.changes as { toStaffId?: string } | null;
    expect(reviewer?.assignedStaffId.toString()).toBe(latest?.toStaffId);
    if (first.status === 200 && second.status === 200) {
      expect(stored).toContain(reviewerA.id.toString());
      expect(stored).toContain(reviewerB.id.toString());
    }

    const winner = reviewer?.assignedStaffId === reviewerA.id ? reviewerA : reviewerB;
    const loser = winner === reviewerA ? reviewerB : reviewerA;
    expect(json(await as(winner).get(`${INBOX}/${id}`).expect(200)).assignments).toHaveLength(1);
    await as(loser).get(`${INBOX}/${id}`).expect(404);
    const agentView = json(await as(agent).get(`${INBOX}/${id}`).expect(200));
    expect(agentView.assignments).toEqual([
      expect.objectContaining({ assignmentType: 'caseAgent', assignedStaffId: agent.id.toString() }),
    ]);
    expect(JSON.stringify(agentView)).not.toMatch(/privatePin|mobile|email|storageKey/);
  });
});
