import { randomBytes, randomInt } from 'node:crypto';
import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { type App } from 'supertest/types';
import { AppModule } from '../../app.module';
import { configureApp } from '../../common/app-setup';
import { PrismaService } from '../../prisma/prisma.service';
import { TokenService } from '../auth/token.service';

/**
 * Real MySQL listing requests (opt-in: RUN_DB_INTEGRATION=1). Isolation: three random users. Cleanup removes only
 * their requests, farms and sessions, including when setup stops part way.
 */
const describeDb = process.env.RUN_DB_INTEGRATION === '1' ? describe : describe.skip;

type Json = Record<string, unknown>;
type U = { id: bigint; token: string };
const json = (res: { body: unknown }): Json => res.body as Json;

describeDb('Farm listing requests on real MySQL', () => {
  const mobiles = [0, 1, 2].map(() => `+2015${String(randomInt(0, 100_000_000)).padStart(8, '0')}`);
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let owner: U;
  let manager: U;
  let stranger: U;
  let farmId: string;
  const createdUserIds: bigint[] = [];
  const http = () => request(app.getHttpServer());
  const as = (u: U) => ({
    get: (path: string) => http().get(path).set('Authorization', `Bearer ${u.token}`),
    post: (path: string, body: object = {}) => http().post(path).set('Authorization', `Bearer ${u.token}`).send(body),
    patch: (path: string, body: object = {}) => http().patch(path).set('Authorization', `Bearer ${u.token}`).send(body),
  });
  const FARM = { name: 'Listing Farm', farmType: 'fruit', areaFeddan: 8, governorate: 'Beheira' };

  async function makeUser(mobileE164: string): Promise<U> {
    const now = new Date();
    const user = await prisma.user.create({
      data: { mobileE164, fullName: 'Integration Test', mobileVerifiedAt: now, createdAt: now },
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
    manager = await makeUser(mobiles[1]);
    stranger = await makeUser(mobiles[2]);
    farmId = json(await as(owner).post('/api/v1/farms', FARM).expect(201)).id as string;
    await prisma.farmRelationship.create({
      data: { farmId: BigInt(farmId), userId: manager.id, relationshipRole: 'manager', relationshipStatus: 'active' },
    });
  });

  afterAll(async () => {
    try {
      if (createdUserIds.length > 0) {
        const ids = createdUserIds;
        const requests = await prisma.request.findMany({ where: { createdBy: { in: ids } }, select: { id: true } });
        const requestIds = requests.map((row) => row.id);
        if (requestIds.length > 0) {
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
        await prisma.farmRelationship.deleteMany({ where: { userId: { in: ids } } });
        await prisma.userSession.deleteMany({ where: { userId: { in: ids } } });
        await prisma.user.deleteMany({ where: { id: { in: ids }, mobileE164: { in: mobiles } } });
      }
    } finally {
      await app?.close();
    }
  });

  it('stores a private draft sale request with whole-pound prices and the farm area', async () => {
    const res = json(
      await as(owner)
        .post(`/api/v1/farms/${farmId}/listing-requests`, {
          listingType: 'sale',
          askingPrice: 12_000_000,
          statedSalePricePerFeddan: 1_500_000,
          listingDescription: 'Citrus',
          highlights: ['Well'],
        })
        .expect(201),
    );
    expect(res).toMatchObject({
      farmId,
      status: 'draft',
      visibility: 'private',
      listingType: 'sale',
      askingPrice: 12_000_000,
      areaFeddan: 8,
      currency: 'EGP',
    });
    const row = await prisma.request.findUniqueOrThrow({ where: { id: BigInt(res.id as string) } });
    expect(row).toMatchObject({
      createdBy: owner.id,
      farmId: BigInt(farmId),
      requestType: 'farmListing',
      status: 'draft',
      visibility: 'private',
      submittedAt: null,
      publishedAt: null,
    });
    const detail = await prisma.farmListingDetail.findUniqueOrThrow({ where: { requestId: row.id } });
    expect(detail.askingPrice?.toFixed(2)).toBe('12000000.00');
    expect(detail.annualRentPerFeddan).toBeNull();
    expect(detail.slug).toBe(res.slug);
    const history = await prisma.requestStatusHistory.findMany({ where: { requestId: row.id } });
    expect(history).toMatchObject([{ fromStatus: null, toStatus: 'draft', changedBy: owner.id }]);
    const farm = await prisma.farm.findUniqueOrThrow({ where: { id: BigInt(farmId) } });
    expect(farm.privatePinLatitude).toBeNull();
    expect(farm.farmStatus).toBe('active');
  });

  it('enforces owner-only creation and hides the request from other users', async () => {
    const mine = json(await as(owner).get('/api/v1/listing-requests/mine').expect(200));
    const id = (mine.items as Json[])[0]?.id as string;
    await as(manager)
      .post(`/api/v1/farms/${farmId}/listing-requests`, { listingType: 'sale', askingPrice: 1 })
      .expect(403);
    await as(stranger).post(`/api/v1/farms/${farmId}/listing-requests`, { listingType: 'rent' }).expect(404);
    await as(manager).get(`/api/v1/listing-requests/${id}`).expect(404);
    await as(stranger).get(`/api/v1/listing-requests/${id}`).expect(404);
    expect(json(await as(manager).get('/api/v1/listing-requests/mine').expect(200)).total).toBe(0);
    const updated = json(
      await as(owner).patch(`/api/v1/listing-requests/${id}`, { askingPrice: 9_000_000 }).expect(200),
    );
    expect(updated.askingPrice).toBe(9_000_000);
    expect(
      (await prisma.farmListingDetail.findUniqueOrThrow({ where: { requestId: BigInt(id) } })).askingPrice?.toFixed(2),
    ).toBe('9000000.00');
  });

  it('submits a draft once when two requests arrive together', async () => {
    const created = json(
      await as(owner).post(`/api/v1/farms/${farmId}/listing-requests`, { listingType: 'rent' }).expect(201),
    );
    const id = created.id as string;
    const [first, second] = await Promise.all([
      as(owner).post(`/api/v1/listing-requests/${id}/submit`, {}),
      as(owner).post(`/api/v1/listing-requests/${id}/submit`, {}),
    ]);
    expect([first.status, second.status].sort()).toEqual([200, 409]);
    const row = await prisma.request.findUniqueOrThrow({ where: { id: BigInt(id) } });
    expect(row).toMatchObject({ status: 'underFarmExitReview', visibility: 'private', publishedAt: null });
    expect(row.submittedAt).toBeInstanceOf(Date);
    const reviewRows = await prisma.requestStatusHistory.findMany({
      where: { requestId: row.id, toStatus: 'underFarmExitReview' },
    });
    expect(reviewRows).toHaveLength(1);
    expect(reviewRows[0]).toMatchObject({ fromStatus: 'draft', changedBy: owner.id });
    await as(manager).post(`/api/v1/listing-requests/${id}/submit`).expect(404);
    await as(owner).patch(`/api/v1/listing-requests/${id}`, { annualRentPerFeddan: 1 }).expect(409);
  });

  it('does not leave a request when the listing detail insert fails', async () => {
    const before = await prisma.request.count({ where: { createdBy: owner.id } });
    const original = prisma.$transaction.bind(prisma);
    const spy = jest.spyOn(prisma, '$transaction').mockImplementationOnce(((fn: (tx: unknown) => Promise<unknown>) =>
      original((tx) =>
        fn(
          new Proxy(tx as object, {
            get: (target, prop, receiver) => {
              if (prop !== 'farmListingDetail') return Reflect.get(target, prop, receiver) as unknown;
              const detail = Reflect.get(target, prop, receiver) as object;
              return new Proxy(detail, {
                get: (detailTarget, detailProp, detailReceiver) =>
                  detailProp === 'create'
                    ? () => Promise.reject(new Error('simulated detail failure'))
                    : (Reflect.get(detailTarget, detailProp, detailReceiver) as unknown),
              });
            },
          }),
        ),
      )) as never);
    await as(owner)
      .post(`/api/v1/farms/${farmId}/listing-requests`, { listingType: 'rent', annualRentPerFeddan: 4000 })
      .expect(500);
    spy.mockRestore();
    expect(await prisma.request.count({ where: { createdBy: owner.id } })).toBe(before);
  });
});
