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

describe('Farm details requests E2E', () => {
  let app: INestApplication<App>;
  let fakePrisma: FakePrisma;
  let jwtSecret: string;
  let buyer: { id: bigint; token: string };
  let owner: { id: bigint; token: string };
  let other: { id: bigint; token: string };
  let listingSlug: string;
  let detailsId: bigint;

  const http = () => request(app.getHttpServer());
  const as = (u: { token: string }) => ({
    post: (path: string, body: object = {}) => http().post(path).set('Authorization', `Bearer ${u.token}`).send(body),
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
      data: { mobileE164, fullName: 'User', accountStatus: 'active', mobileVerifiedAt: new Date() },
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
    buyer = await createUser('+201081000001');
    owner = await createUser('+201081000002');
    other = await createUser('+201081000003');

    const farm = await fakePrisma.farm.create({
      data: { name: 'Details Farm', farmType: 'fruit', areaFeddan: 8, governorate: 'Giza', createdBy: owner.id },
    });
    await fakePrisma.farmRelationship.create({
      data: { farmId: farm.id, userId: owner.id, relationshipRole: 'owner', relationshipStatus: 'active' },
    });
    const listing = await fakePrisma.request.create({
      data: {
        requestNumber: 'LST-FD-1',
        requestType: 'farmListing',
        status: 'published',
        visibility: 'public',
        createdBy: owner.id,
        farmId: farm.id,
      },
    });
    listingSlug = 'details-listing-sale';
    await fakePrisma.farmListingDetail.create({
      data: { requestId: listing.id, slug: listingSlug, listingType: 'sale', askingPrice: 5000 },
    });
  });

  afterAll(async () => {
    await app?.close();
  });

  it('creates and submits a details request without private farm fields', async () => {
    const created = await as(buyer)
      .post('/api/v1/farm-details-requests', { listingSlug })
      .expect(201);
    detailsId = BigInt((created.body as { id: string }).id);
    const body = created.body as Record<string, unknown>;
    expect(body.message).toBeNull();
    expect(body).not.toHaveProperty('ownerPhone');
    await as(buyer).post(`/api/v1/farm-details-requests/${detailsId}/submit`).expect(200);
    const view = await as(buyer).get(`/api/v1/farm-details-requests/${detailsId}`).expect(200);
    expect((view.body as { status: string }).status).toBe('underFarmExitReview');
  });

  it('denies owner self-request and cross-user access', async () => {
    await as(owner).post('/api/v1/farm-details-requests', { listingSlug }).expect(409);
    await as(other).get(`/api/v1/farm-details-requests/${detailsId}`).expect(404);
  });

  it('blocks generic submit bypass for farm details', async () => {
    await as(buyer).post(`/api/v1/requests/${detailsId}/submit`).expect(409);
  });
});
