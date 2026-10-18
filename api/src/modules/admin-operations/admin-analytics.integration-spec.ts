import { randomInt } from 'node:crypto';
import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { type App } from 'supertest/types';
import { AppModule } from '../../app.module';
import { configureApp } from '../../common/app-setup';
import { PrismaService } from '../../prisma/prisma.service';
import { TokenService } from '../auth/token.service';

const describeDb = process.env.RUN_DB_INTEGRATION === '1' ? describe : describe.skip;

describeDb('Admin analytics on real MySQL', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminToken: string;
  const createdUserIds: bigint[] = [];

  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    const tokens = app.get(TokenService);
    const mobile = `+2017${String(randomInt(0, 100_000_000)).padStart(8, '0')}`;
    const user = await prisma.user.create({
      data: { mobileE164: mobile, fullName: 'Analytics Admin', accountStatus: 'active', mobileVerifiedAt: new Date() },
    });
    createdUserIds.push(user.id);
    await prisma.staffMembership.create({
      data: { userId: user.id, staffRole: 'admin', status: 'active' },
    });
    const session = await prisma.userSession.create({
      data: {
        userId: user.id,
        authAudience: 'dashboard',
        sessionTokenHash: 'analytics-test',
        expiresAt: new Date(Date.now() + 3_600_000),
      },
    });
    adminToken = tokens.signAccessToken(user.id, session.id);
  });

  afterAll(async () => {
    for (const id of createdUserIds) {
      await prisma.staffMembership.deleteMany({ where: { userId: id } });
      await prisma.userSession.deleteMany({ where: { userId: id } });
      await prisma.user.deleteMany({ where: { id } });
    }
    await app?.close();
  });

  it('returns analytics report for admin', async () => {
    const res = await http()
      .get('/api/v1/staff/admin/analytics?range=30d')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const body = res.body as { granularity: string; timeseries: { usersRegistered: unknown[] } };
    expect(body.granularity).toBeTruthy();
    expect(Array.isArray(body.timeseries.usersRegistered)).toBe(true);
  });

  it('rejects invalid custom range', async () => {
    await http()
      .get('/api/v1/staff/admin/analytics?from=2026-12-01&to=2026-11-01')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);
  });
});
