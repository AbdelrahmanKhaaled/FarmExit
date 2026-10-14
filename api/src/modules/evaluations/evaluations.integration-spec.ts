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

describeDb('Farm Evaluations on real MySQL', () => {
  const mobiles = [0, 1].map(() => `+2015${String(randomInt(0, 100_000_000)).padStart(8, '0')}`) as [string, string];
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let admin: { id: bigint; token: string };
  let stranger: { id: bigint; token: string };
  let farmId: bigint;
  const createdUserIds: bigint[] = [];

  const http = () => request(app.getHttpServer());
  const as = (u: { token: string }) => ({
    post: (path: string, body: object = {}) => http().post(path).set('Authorization', `Bearer ${u.token}`).send(body),
    get: (path: string) => http().get(path).set('Authorization', `Bearer ${u.token}`),
    patch: (path: string, body: object = {}) => http().patch(path).set('Authorization', `Bearer ${u.token}`).send(body),
  });

  async function makeUser(mobileE164: string, role?: 'admin' | 'reviewer'): Promise<{ id: bigint; token: string }> {
    const now = new Date();
    const user = await prisma.user.create({
      data: { mobileE164, fullName: 'Integration Evaluation Staff', mobileVerifiedAt: now, createdAt: now },
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

    admin = await makeUser(mobiles[0], 'admin');
    stranger = await makeUser(mobiles[1]);

    const createdFarm = await prisma.farm.create({
      data: {
        name: 'MySQL Evaluation Farm',
        farmType: 'fruit',
        areaFeddan: 10,
        governorate: 'Beheira',
        createdBy: admin.id,
      },
    });
    farmId = createdFarm.id;
  });

  afterAll(async () => {
    try {
      if (createdUserIds.length > 0) {
        const ids = createdUserIds;
        const evals = await prisma.farmEvaluation.findMany({
          where: { farmId },
          select: { id: true },
        });
        const evalIds = evals.map((e) => e.id);
        if (evalIds.length > 0) {
          await prisma.farmEvaluationCheck.deleteMany({ where: { evaluationId: { in: evalIds } } });
          await prisma.farmEvaluation.deleteMany({ where: { id: { in: evalIds } } });
        }
        await prisma.auditLog.deleteMany({ where: { actorUserId: { in: ids } } });
        await prisma.farmRelationship.deleteMany({ where: { farmId } });
        await prisma.farm.deleteMany({ where: { id: farmId } });
        await prisma.staffMembership.deleteMany({ where: { userId: { in: ids } } });
        await prisma.userSession.deleteMany({ where: { userId: { in: ids } } });
        await prisma.user.deleteMany({ where: { id: { in: ids }, mobileE164: { in: mobiles } } });
      }
    } finally {
      await app?.close();
    }
  });

  it('rejects regular non-staff user with 403', async () => {
    await as(stranger).get(`/api/v1/farms/${farmId}/evaluations`).expect(403);
    await as(stranger).post(`/api/v1/farms/${farmId}/evaluations`, { scoreValue: 80, scoreMax: 100 }).expect(403);
  });

  it('creates evaluation, writes checks and audit logs on real MySQL', async () => {
    const res = json(
      await as(admin)
        .post(`/api/v1/farms/${farmId}/evaluations`, {
          scoreValue: 88,
          scoreMax: 100,
          methodologyName: 'MySQL Real Evaluation',
          methodologyVersion: 'v1.0',
          reviewScopeEn: 'Real MySQL scope',
          checks: [
            {
              checkKey: 'soil_check',
              checkStatus: 'reviewed',
              reviewerNotes: 'Passes integration test',
            },
          ],
        })
        .expect(201),
    );

    const evalId = BigInt(res.id as string);
    const inDb = await prisma.farmEvaluation.findUnique({
      where: { id: evalId },
      include: { checks: true },
    });

    expect(inDb).not.toBeNull();
    expect(Number(inDb?.scoreValue)).toBe(88);
    expect(Number(inDb?.scoreMax)).toBe(100);
    expect(inDb?.checks).toHaveLength(1);
    expect(inDb?.checks[0].checkKey).toBe('soil_check');

    // Audit log was recorded
    const audit = await prisma.auditLog.findFirst({
      where: { entityType: 'farm_evaluation', entityId: evalId, action: 'created' },
    });
    expect(audit).not.toBeNull();
    expect(audit?.actorUserId).toBe(admin.id);
  });

  it('retrieves latest evaluation and updates status to published on real MySQL', async () => {
    const latest = json(await as(admin).get(`/api/v1/farms/${farmId}/evaluations/latest`).expect(200));
    expect(latest.scoreValue).toBe(88);

    const updated = json(
      await as(admin)
        .patch(`/api/v1/farms/${farmId}/evaluations/${String(latest.id)}`, {
          status: 'published',
        })
        .expect(200),
    );

    expect(updated.status).toBe('published');
    expect(updated.publishedAt).not.toBeNull();

    // Confirm DB status
    const inDb = await prisma.farmEvaluation.findUnique({
      where: { id: BigInt(latest.id as string) },
    });
    expect(inDb?.status).toBe('published');
  });
});
