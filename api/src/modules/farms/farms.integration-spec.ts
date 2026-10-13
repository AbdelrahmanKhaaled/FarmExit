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
 * Real MySQL farms flow (opt-in: RUN_DB_INTEGRATION=1). Isolation: two freshly generated random test users (the
 * test refuses to run if their numbers exist). Only rows created by or linked to those users are ever removed:
 * media, facilities, relationships, farms (created_by = test user), sessions, users. A failed setup still
 * removes the users it managed to create. Session hashes are random, so parallel suites cannot collide.
 */
const describeDb = process.env.RUN_DB_INTEGRATION === '1' ? describe : describe.skip;

type Json = Record<string, unknown>;
const json = (res: { body: unknown }): Json => res.body as Json;

describeDb('Farms on real MySQL', () => {
  const mobiles = [0, 1].map(() => `+2015${String(randomInt(0, 100_000_000)).padStart(8, '0')}`) as [string, string];
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let owner: { id: bigint; token: string };
  let stranger: { id: bigint; token: string };
  const http = () => request(app.getHttpServer());
  const as = (u: { token: string }) => ({
    post: (path: string, body: object = {}) => http().post(path).set('Authorization', `Bearer ${u.token}`).send(body),
    get: (path: string) => http().get(path).set('Authorization', `Bearer ${u.token}`),
    patch: (path: string, body: object = {}) => http().patch(path).set('Authorization', `Bearer ${u.token}`).send(body),
  });
  const VALID = { name: 'Integration Farm', farmType: 'fruit', areaFeddan: 12.5, governorate: 'Beheira' };
  const createdUserIds: bigint[] = [];
  const testIds = (): bigint[] => createdUserIds;

  async function makeUser(mobileE164: string): Promise<{ id: bigint; token: string }> {
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
    stranger = await makeUser(mobiles[1]);
  });

  afterAll(async () => {
    try {
      if (createdUserIds.length > 0) {
        const ids = testIds();
        const farms = await prisma.farm.findMany({ where: { createdBy: { in: ids } }, select: { id: true } });
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
              where: { id: { in: facilityIds }, ownerUserId: { in: ids } },
            });
          }
          await prisma.farmMedia.deleteMany({ where: { farmId: { in: farmIds } } });
          await prisma.farmCropType.deleteMany({ where: { farmId: { in: farmIds } } });
          await prisma.farmRelationship.deleteMany({ where: { farmId: { in: farmIds } } });
          await prisma.farm.deleteMany({ where: { id: { in: farmIds }, createdBy: { in: ids } } });
        }
        await prisma.farmRelationship.deleteMany({ where: { userId: { in: ids } } });
        await prisma.userSession.deleteMany({ where: { userId: { in: ids } } });
        await prisma.user.deleteMany({ where: { id: { in: ids }, mobileE164: { in: mobiles } } });
      }
    } finally {
      await app.close();
    }
  });

  it('creates a farm and the owner relationship atomically, with exact decimals', async () => {
    const res = json(
      await as(owner)
        .post('/api/v1/farms', { ...VALID, waterSource: 'well' })
        .expect(201),
    );
    expect(res).toMatchObject({ areaFeddan: 12.5, myRoles: ['owner'], farmStatus: 'active', waterSource: 'well' });
    const farm = await prisma.farm.findUniqueOrThrow({ where: { id: BigInt(res.id as string) } });
    expect(farm.createdBy).toBe(owner.id);
    expect(farm.areaFeddan.toString()).toBe('12.5');
    expect(farm.privatePinLatitude).toBeNull();
    const rels = await prisma.farmRelationship.findMany({ where: { farmId: farm.id } });
    expect(rels).toHaveLength(1);
    expect(rels[0]).toMatchObject({ userId: owner.id, relationshipRole: 'owner', relationshipStatus: 'active' });
    expect(rels[0]?.startsAt).toBeInstanceOf(Date);
  });

  it('rolls back the farm when the relationship insert fails (real transaction)', async () => {
    const before = await prisma.farm.count({ where: { createdBy: owner.id } });
    const original = prisma.$transaction.bind(prisma) as (fn: (tx: unknown) => Promise<unknown>) => Promise<unknown>;
    const spy = jest.spyOn(prisma, '$transaction').mockImplementationOnce(((fn: (tx: unknown) => Promise<unknown>) =>
      original((tx) =>
        fn(
          new Proxy(tx as object, {
            get: (target, prop, receiver) =>
              prop === 'farmRelationship'
                ? { create: () => Promise.reject(new Error('simulated relationship failure')) }
                : (Reflect.get(target, prop, receiver) as unknown),
          }),
        ),
      )) as never);
    await as(owner)
      .post('/api/v1/farms', { ...VALID, name: 'Must Roll Back' })
      .expect(500);
    spy.mockRestore();
    expect(await prisma.farm.count({ where: { createdBy: owner.id } })).toBe(before);
    expect(await prisma.farm.count({ where: { name: 'Must Roll Back' } })).toBe(0);
  });

  it('enforces read/update permissions and hides other users farms', async () => {
    const created = json(
      await as(owner)
        .post('/api/v1/farms', { ...VALID, name: 'Private Farm' })
        .expect(201),
    );
    const id = created.id as string;

    expect(json(await as(owner).get(`/api/v1/farms/${id}`).expect(200)).name).toBe('Private Farm');
    await as(stranger).get(`/api/v1/farms/${id}`).expect(404);
    await as(stranger).patch(`/api/v1/farms/${id}`, { name: 'Hacked' }).expect(404);
    await as(owner).patch(`/api/v1/farms/${id}`, { name: 'Renamed', description: 'Hello' }).expect(200);

    // a tenant can read but not edit; an expired manager role is ignored
    await prisma.farmRelationship.create({
      data: { farmId: BigInt(id), userId: stranger.id, relationshipRole: 'tenant', relationshipStatus: 'active' },
    });
    await as(stranger).get(`/api/v1/farms/${id}`).expect(200);
    await as(stranger).patch(`/api/v1/farms/${id}`, { name: 'Hacked' }).expect(403);
    await prisma.farmRelationship.create({
      data: {
        farmId: BigInt(id),
        userId: stranger.id,
        relationshipRole: 'manager',
        relationshipStatus: 'active',
        endsAt: new Date(Date.now() - 1000),
      },
    });
    await as(stranger).patch(`/api/v1/farms/${id}`, { name: 'Hacked' }).expect(403);

    const farm = await prisma.farm.findUniqueOrThrow({ where: { id: BigInt(id) } });
    expect(farm).toMatchObject({ name: 'Renamed', description: 'Hello', createdBy: owner.id });
  });

  it('lists my farms with pagination and never leaks other users farms', async () => {
    await as(owner)
      .post('/api/v1/farms', { ...VALID, name: 'Third Farm' })
      .expect(201);
    const mine = json(await as(owner).get('/api/v1/farms/mine?pageSize=2').expect(200));
    expect((mine.items as Json[]).length).toBe(2);
    expect(mine.total).toBe(3);
    expect((json(await as(owner).get('/api/v1/farms/mine?pageSize=2&page=2').expect(200)).items as Json[]).length).toBe(
      1,
    );
    const page2 = json(await as(owner).get('/api/v1/farms/mine?pageSize=2&page=2').expect(200));
    const names = [...(mine.items as Json[]), ...(page2.items as Json[])].map((f) => f.id);
    expect(new Set(names).size).toBe(names.length);
    // the stranger holds only a tenant relationship on one farm
    const theirs = json(await as(stranger).get('/api/v1/farms/mine').expect(200));
    expect(theirs.total).toBe(1);
    expect((theirs.items as Json[])[0]?.myRoles).toEqual(['tenant']);
  });

  it('rejects invalid ids and mass assignment without touching data', async () => {
    for (const id of ['abc', '0', '-1', '9223372036854775808', '99999999999999999999']) {
      await as(owner).get(`/api/v1/farms/${id}`).expect(400);
    }
    const before = await prisma.farm.count({ where: { createdBy: { in: testIds() } } });
    await as(stranger)
      .post('/api/v1/farms', { ...VALID, createdBy: String(owner.id) })
      .expect(400);
    await as(stranger)
      .post('/api/v1/farms', { ...VALID, relationshipRole: 'owner' })
      .expect(400);
    expect(await prisma.farm.count({ where: { createdBy: { in: testIds() } } })).toBe(before);
  });
});
