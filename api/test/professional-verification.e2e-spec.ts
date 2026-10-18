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

describe('Professional verification E2E (Phase 09 regression)', () => {
  let app: INestApplication<App>;
  let fakePrisma: FakePrisma;
  let jwtSecret: string;
  let user: { id: bigint; token: string };
  let other: { id: bigint; token: string };
  let capabilityId: bigint;

  const http = () => request(app.getHttpServer());
  const as = (u: { token: string }) => ({
    post: (path: string, body: object = {}) => http().post(path).set('Authorization', `Bearer ${u.token}`).send(body),
    put: (path: string, body: object = {}) => http().put(path).set('Authorization', `Bearer ${u.token}`).send(body),
    get: (path: string) => http().get(path).set('Authorization', `Bearer ${u.token}`),
  });

  function signToken(userId: bigint, sessionId: bigint): string {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const now = Math.floor(Date.now() / 1000);
    const payload = Buffer.from(
      JSON.stringify({ sub: userId.toString(), sid: sessionId.toString(), iss: 'farmexit-api', iat: now, exp: now + 3600 }),
    ).toString('base64url');
    const signature = createHmac('sha256', jwtSecret).update(`${header}.${payload}`).digest('base64url');
    return `${header}.${payload}.${signature}`;
  }

  async function createUser(mobileE164: string): Promise<{ id: bigint; token: string }> {
    const row = await fakePrisma.user.create({
      data: { mobileE164, fullName: 'Pro', accountStatus: 'active', mobileVerifiedAt: new Date() },
    });
    const session = await fakePrisma.userSession.create({
      data: { userId: row.id, sessionTokenHash: 'hash', expiresAt: new Date(Date.now() + 3_600_000) },
    });
    return { id: row.id as bigint, token: signToken(row.id as bigint, session.id as bigint) };
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
    user = await createUser('+201092000001');
    other = await createUser('+201092000002');
    const profile = await fakePrisma.professionalProfile.create({ data: { userId: user.id } });
    const cap = await fakePrisma.professionalCapability.create({
      data: { professionalProfileId: profile.id, professionalType: 'farmManager' },
    });
    capabilityId = cap.id as bigint;
  });

  afterAll(async () => {
    await app?.close();
  });

  it('creates profile and verification request', async () => {
    await as(user).put('/api/v1/professional-profile', { headline: 'Manager' }).expect(200);
    const res = await as(user)
      .post('/api/v1/professional-verification-requests', { professionalCapabilityId: capabilityId.toString() })
      .expect(201);
    expect((res.body as { status: string }).status).toBe('draft');
  });

  it('denies other user from reading verification request', async () => {
    const row = await fakePrisma.request.findFirst({ where: { requestType: 'professionalVerification' } });
    await as(other).get(`/api/v1/professional-verification-requests/${String(row?.id)}`).expect(404);
  });
});
