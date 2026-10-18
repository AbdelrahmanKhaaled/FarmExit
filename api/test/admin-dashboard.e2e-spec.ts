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

describe('Admin dashboard E2E', () => {
  let app: INestApplication<App>;
  let fakePrisma: FakePrisma;
  let jwtSecret: string;
  let admin: { token: string };
  let user: { token: string };

  const http = () => request(app.getHttpServer());

  function signToken(userId: bigint, sessionId: bigint): string {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const now = Math.floor(Date.now() / 1000);
    const payload = Buffer.from(
      JSON.stringify({ sub: userId.toString(), sid: sessionId.toString(), iss: 'farmexit-api', iat: now, exp: now + 3600 }),
    ).toString('base64url');
    const signature = createHmac('sha256', jwtSecret).update(`${header}.${payload}`).digest('base64url');
    return `${header}.${payload}.${signature}`;
  }

  async function userWithRole(mobile: string, role?: 'admin' | 'caseAgent'): Promise<{ token: string }> {
    const row = await fakePrisma.user.create({
      data: { mobileE164: mobile, fullName: 'Staff', accountStatus: 'active', mobileVerifiedAt: new Date() },
    });
    const session = await fakePrisma.userSession.create({
      data: {
        userId: row.id,
        authAudience: role === 'admin' ? 'dashboard' : 'website',
        sessionTokenHash: 'hash',
        expiresAt: new Date(Date.now() + 3_600_000),
      },
    });
    if (role) {
      await fakePrisma.staffMembership.create({ data: { userId: row.id, staffRole: role, status: 'active' } });
    }
    return { token: signToken(row.id as bigint, session.id as bigint) };
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
    admin = await userWithRole('+201082000001', 'admin');
    user = await userWithRole('+201082000002');
    await fakePrisma.user.create({
      data: { mobileE164: '+201082000099', fullName: 'Extra', accountStatus: 'active', mobileVerifiedAt: new Date() },
    });
    await fakePrisma.farm.create({
      data: { name: 'Count Farm', farmType: 'mixed', areaFeddan: 1, governorate: 'Cairo', createdBy: 1n },
    });
  });

  afterAll(async () => {
    await app?.close();
  });

  it('returns overview for admin without leaking PII fields', async () => {
    const res = await http()
      .get('/api/v1/staff/admin/dashboard/overview')
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(200);
    const body = res.body as Record<string, unknown>;
    expect(typeof body.registeredUsers).toBe('number');
    expect(body).not.toHaveProperty('users');
    expect(body).not.toHaveProperty('email');
  });

  it('denies non-admin staff', async () => {
    await http().get('/api/v1/staff/admin/dashboard/overview').set('Authorization', `Bearer ${user.token}`).expect(401);
  });

  it('lists platform users without password fields', async () => {
    const res = await http()
      .get('/api/v1/staff/admin/users?tab=users&page=1&pageSize=10')
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(200);
    const body = res.body as { userItems: Record<string, unknown>[] };
    expect(body.userItems.length).toBeGreaterThan(0);
    expect(body.userItems[0]).not.toHaveProperty('passwordHash');
  });

  it('returns platform user detail with farm relationships', async () => {
    const list = await http()
      .get('/api/v1/staff/admin/users?tab=users&page=1&pageSize=1')
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(200);
    const id = (list.body as { userItems: { id: string }[] }).userItems[0]?.id;
    expect(id).toBeDefined();
    const detail = await http()
      .get(`/api/v1/staff/admin/users/${id}`)
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(200);
    const row = detail.body as { farmRelationships: unknown[]; requestsCreatedCount: number };
    expect(Array.isArray(row.farmRelationships)).toBe(true);
    expect(typeof row.requestsCreatedCount).toBe('number');
    expect(detail.body).not.toHaveProperty('passwordHash');
  });

  it('lists evaluations inbox for admin', async () => {
    await http()
      .get('/api/v1/staff/admin/evaluations?page=1&pageSize=5')
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(200);
  });

  it('returns analytics report with granularity for admin', async () => {
    const res = await http()
      .get('/api/v1/staff/admin/analytics?range=7d')
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(200);
    const body = res.body as { granularity: string; timeseries: unknown };
    expect(body.granularity).toBe('day');
    expect(body.timeseries).toBeTruthy();
  });
});
