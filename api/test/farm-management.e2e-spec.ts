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

describe('Farm management requests E2E (Phase 09 regression)', () => {
  let app: INestApplication<App>;
  let fakePrisma: FakePrisma;
  let jwtSecret: string;
  let owner: { id: bigint; token: string };
  let other: { id: bigint; token: string };
  let farmId: bigint;

  const http = () => request(app.getHttpServer());
  const as = (u: { token: string }) => ({
    post: (path: string, body: object = {}) => http().post(path).set('Authorization', `Bearer ${u.token}`).send(body),
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
    const user = await fakePrisma.user.create({
      data: { mobileE164, fullName: 'User', accountStatus: 'active', mobileVerifiedAt: new Date() },
    });
    const session = await fakePrisma.userSession.create({
      data: { userId: user.id, sessionTokenHash: 'hash', expiresAt: new Date(Date.now() + 3_600_000) },
    });
    return { id: user.id as bigint, token: signToken(user.id as bigint, session.id as bigint) };
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
    owner = await createUser('+201091000001');
    other = await createUser('+201091000002');
    const farm = await fakePrisma.farm.create({
      data: { name: 'FM Farm', farmType: 'fruit', areaFeddan: 8, governorate: 'Giza', createdBy: owner.id },
    });
    farmId = farm.id as bigint;
    await fakePrisma.farmRelationship.create({
      data: { farmId, userId: owner.id, relationshipRole: 'owner', relationshipStatus: 'active' },
    });
  });

  afterAll(async () => {
    await app?.close();
  });

  it('allows owner to create a management request', async () => {
    await as(owner)
      .post(`/api/v1/farms/${farmId}/management-requests`, { professionalNeed: 'farmManager' })
      .expect(201);
  });

  it('denies non-owner', async () => {
    await as(other).post(`/api/v1/farms/${farmId}/management-requests`, { professionalNeed: 'farmManager' }).expect(404);
  });
});
