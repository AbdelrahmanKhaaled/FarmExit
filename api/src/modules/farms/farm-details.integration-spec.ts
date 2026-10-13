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
 * Real MySQL farm specifications & facilities (opt-in: RUN_DB_INTEGRATION=1). Isolation: three freshly generated
 * random test users; the test aborts if their numbers exist and only removes rows tied to those users and their farms.
 */
const describeDb = process.env.RUN_DB_INTEGRATION === '1' ? describe : describe.skip;

type Json = Record<string, unknown>;
type U = { id: bigint; token: string };
const json = (res: { body: unknown }): Json => res.body as Json;

describeDb('Farm specifications & facilities on real MySQL', () => {
  const mobiles = [0, 1, 2].map(() => `+2015${String(randomInt(0, 100_000_000)).padStart(8, '0')}`);
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let owner: U;
  let tenant: U;
  let stranger: U;
  let farmId: string;
  let otherFarmId: string;
  const http = () => request(app.getHttpServer());
  const as = (u: U) => ({
    get: (path: string) => http().get(path).set('Authorization', `Bearer ${u.token}`),
    post: (path: string, body: object = {}) => http().post(path).set('Authorization', `Bearer ${u.token}`).send(body),
    patch: (path: string, body: object = {}) => http().patch(path).set('Authorization', `Bearer ${u.token}`).send(body),
  });
  const FARM = { name: 'Spec Farm', farmType: 'fruit', areaFeddan: 5, governorate: 'Beheira' };
  const FACILITY = { facilityType: 'produce_storage', name: 'Store A' };
  const createdUserIds: bigint[] = [];
  const ids = (): bigint[] => createdUserIds;

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
    tenant = await makeUser(mobiles[1]);
    stranger = await makeUser(mobiles[2]);
    farmId = json(await as(owner).post('/api/v1/farms', FARM).expect(201)).id as string;
    otherFarmId = json(
      await as(stranger)
        .post('/api/v1/farms', { ...FARM, name: 'Other' })
        .expect(201),
    ).id as string;
    await prisma.farmRelationship.create({
      data: { farmId: BigInt(farmId), userId: tenant.id, relationshipRole: 'tenant', relationshipStatus: 'active' },
    });
  });

  afterAll(async () => {
    try {
      if (createdUserIds.length > 0) {
        const u = ids();
        const farms = await prisma.farm.findMany({ where: { createdBy: { in: u } }, select: { id: true } });
        const farmIds = farms.map((f) => f.id);
        if (farmIds.length > 0) {
          const facilities = await prisma.agriculturalFacility.findMany({
            where: { farmId: { in: farmIds } },
            select: { id: true },
          });
          const facilityIds = facilities.map((f) => f.id);
          if (facilityIds.length > 0) {
            await prisma.facilityMedia.deleteMany({ where: { facilityId: { in: facilityIds } } });
            await prisma.agriculturalFacility.deleteMany({
              where: { id: { in: facilityIds }, ownerUserId: { in: u } },
            });
          }
          await prisma.farmMedia.deleteMany({ where: { farmId: { in: farmIds } } });
          await prisma.farmCropType.deleteMany({ where: { farmId: { in: farmIds } } });
          await prisma.farmRelationship.deleteMany({ where: { farmId: { in: farmIds } } });
          await prisma.farm.deleteMany({ where: { id: { in: farmIds }, createdBy: { in: u } } });
        }
        await prisma.farmRelationship.deleteMany({ where: { userId: { in: u } } });
        await prisma.userSession.deleteMany({ where: { userId: { in: u } } });
        await prisma.user.deleteMany({ where: { id: { in: u }, mobileE164: { in: mobiles } } });
      }
    } finally {
      await app.close();
    }
  });

  it('merges production details key by key and replaces crop types, preserving everything else', async () => {
    const url = `/api/v1/farms/${farmId}/specifications`;
    await prisma.farm.update({
      where: { id: BigInt(farmId) },
      data: { productionDetails: { legacyKey: 'keep' }, accessDetails: { gate: 'private' }, facilities: { a: 1 } },
    });
    await as(owner)
      .patch(url, {
        waterSource: 'well',
        cropTypes: ['citrus', 'palms'],
        productionDetails: { currentProduction: 'Oranges' },
      })
      .expect(200);
    const res = json(
      await as(owner)
        .patch(url, { productionDetails: { notes: 'Stated by owner' }, soilType: 'Sandy' })
        .expect(200),
    );
    expect(res).toMatchObject({
      waterSource: 'well',
      soilType: 'Sandy',
      cropTypes: ['citrus', 'palms'],
      productionDetails: { currentProduction: 'Oranges', harvestSeasons: null, notes: 'Stated by owner' },
    });
    const row = await prisma.farm.findUniqueOrThrow({ where: { id: BigInt(farmId) } });
    expect(row.productionDetails).toEqual({
      legacyKey: 'keep',
      currentProduction: 'Oranges',
      notes: 'Stated by owner',
    });
    expect(row.accessDetails).toEqual({ gate: 'private' });
    expect(row.facilities).toEqual({ a: 1 });
    expect(row).toMatchObject({ name: 'Spec Farm', farmStatus: 'active' });

    await as(owner)
      .patch(url, { productionDetails: { currentProduction: null }, cropTypes: ['palms'] })
      .expect(200);
    const after = await prisma.farm.findUniqueOrThrow({ where: { id: BigInt(farmId) } });
    expect(after.productionDetails).toEqual({ legacyKey: 'keep', notes: 'Stated by owner' });
    expect((await prisma.farmCropType.findMany({ where: { farmId: BigInt(farmId) } })).map((c) => c.cropType)).toEqual([
      'palms',
    ]);
  });

  it('enforces roles: tenant reads but cannot edit; stranger gets 404', async () => {
    const url = `/api/v1/farms/${farmId}/specifications`;
    expect(json(await as(tenant).get(url).expect(200)).canEdit).toBe(false);
    await as(tenant).patch(url, { soilType: 'Hacked' }).expect(403);
    await as(stranger).get(url).expect(404);
    await as(stranger).patch(url, { soilType: 'Hacked' }).expect(404);
    expect((await prisma.farm.findUniqueOrThrow({ where: { id: BigInt(farmId) } })).soilType).toBe('Sandy');
  });

  it('rolls the whole specification update back on failure (real transaction)', async () => {
    const url = `/api/v1/farms/${farmId}/specifications`;
    const original = prisma.$transaction.bind(prisma) as (fn: (tx: unknown) => Promise<unknown>) => Promise<unknown>;
    const spy = jest.spyOn(prisma, '$transaction').mockImplementationOnce(((fn: (tx: unknown) => Promise<unknown>) =>
      original((tx) =>
        fn(
          new Proxy(tx as object, {
            get: (target, prop, receiver) =>
              prop === 'farmCropType'
                ? {
                    findMany: () => Promise.resolve([]),
                    deleteMany: () => Promise.resolve({ count: 0 }),
                    create: () => Promise.reject(new Error('simulated crop failure')),
                  }
                : (Reflect.get(target, prop, receiver) as unknown),
          }),
        ),
      )) as never);
    await as(owner)
      .patch(url, { soilType: 'MustRollBack', cropTypes: ['fruits'] })
      .expect(500);
    spy.mockRestore();
    expect((await prisma.farm.findUniqueOrThrow({ where: { id: BigInt(farmId) } })).soilType).toBe('Sandy');
    expect((await prisma.farmCropType.findMany({ where: { farmId: BigInt(farmId) } })).map((c) => c.cropType)).toEqual([
      'palms',
    ]);
  });

  it('creates facilities bound to the farm, owned by the caller, always draft', async () => {
    const res = json(await as(owner).post(`/api/v1/farms/${farmId}/facilities`, FACILITY).expect(201));
    expect(res).toMatchObject({ farmId, status: 'draft', facilityType: 'produce_storage' });
    const row = await prisma.agriculturalFacility.findUniqueOrThrow({ where: { id: BigInt(res.id as string) } });
    expect(row).toMatchObject({
      farmId: BigInt(farmId),
      ownerUserId: owner.id,
      status: 'draft',
      latitude: null,
      longitude: null,
    });
    await as(tenant).post(`/api/v1/farms/${farmId}/facilities`, FACILITY).expect(403);
    await as(stranger).post(`/api/v1/farms/${farmId}/facilities`, FACILITY).expect(404);
    await as(owner)
      .post(`/api/v1/farms/${farmId}/facilities`, { ...FACILITY, farmId: otherFarmId, status: 'published' })
      .expect(400);
  });

  it('prevents cross-farm facility reads and writes (IDOR) and supports pagination', async () => {
    const mine = json(await as(owner).get(`/api/v1/farms/${farmId}/facilities`).expect(200));
    const facilityId = (mine.items as Json[])[0]?.id as string;
    // stranger owns another farm; the facility id is only valid under its own farm
    const theirs = json(
      await as(stranger)
        .post(`/api/v1/farms/${otherFarmId}/facilities`, { ...FACILITY, name: 'Theirs' })
        .expect(201),
    ).id as string;
    await as(stranger).get(`/api/v1/farms/${otherFarmId}/facilities/${facilityId}`).expect(404);
    await as(stranger).patch(`/api/v1/farms/${otherFarmId}/facilities/${facilityId}`, { name: 'Hacked' }).expect(404);
    await as(owner).patch(`/api/v1/farms/${farmId}/facilities/${theirs}`, { name: 'Hacked' }).expect(404);
    expect((await prisma.agriculturalFacility.findUniqueOrThrow({ where: { id: BigInt(facilityId) } })).name).toBe(
      'Store A',
    );
    expect((await prisma.agriculturalFacility.findUniqueOrThrow({ where: { id: BigInt(theirs) } })).name).toBe(
      'Theirs',
    );

    await as(owner)
      .post(`/api/v1/farms/${farmId}/facilities`, { ...FACILITY, name: 'Store B' })
      .expect(201);
    await as(owner)
      .post(`/api/v1/farms/${farmId}/facilities`, { ...FACILITY, name: 'Store C' })
      .expect(201);
    const p1 = json(await as(tenant).get(`/api/v1/farms/${farmId}/facilities?pageSize=2`).expect(200));
    const p2 = json(await as(tenant).get(`/api/v1/farms/${farmId}/facilities?pageSize=2&page=2`).expect(200));
    expect(p1.total).toBe(3);
    expect((p1.items as Json[]).map((f) => f.name)).toEqual(['Store C', 'Store B']);
    expect((p2.items as Json[]).map((f) => f.name)).toEqual(['Store A']);
    const patched = json(
      await as(owner)
        .patch(`/api/v1/farms/${farmId}/facilities/${facilityId}`, { name: 'Renamed', description: 'Cool' })
        .expect(200),
    );
    expect(patched).toMatchObject({ name: 'Renamed', description: 'Cool', status: 'draft' });
  });

  it('rejects invalid ids and mass assignment without touching data', async () => {
    for (const id of ['abc', '0', '9223372036854775808']) {
      await as(owner).get(`/api/v1/farms/${farmId}/specifications`.replace(farmId, id)).expect(400);
    }
    const before = await prisma.agriculturalFacility.count({ where: { ownerUserId: { in: ids() } } });
    await as(owner)
      .post(`/api/v1/farms/${farmId}/facilities`, { ...FACILITY, ownerUserId: String(stranger.id) })
      .expect(400);
    await as(owner).patch(`/api/v1/farms/${farmId}/specifications`, { privatePinLatitude: 1 }).expect(400);
    expect(await prisma.agriculturalFacility.count({ where: { ownerUserId: { in: ids() } } })).toBe(before);
  });
});
