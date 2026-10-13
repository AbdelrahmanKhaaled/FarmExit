import { randomBytes, randomInt, randomUUID } from 'node:crypto';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { type App } from 'supertest/types';
import { GPS_MARKER, makeJpeg, makePng } from '../../../test/support/images';
import { AppModule } from '../../app.module';
import { configureApp } from '../../common/app-setup';
import { PrismaService } from '../../prisma/prisma.service';
import { TokenService } from '../auth/token.service';
import { MAX_MEDIA_PER_FACILITY } from './facility-media.service';
import { MAX_MEDIA_PER_FARM } from './farm-media.service';
import { LocalObjectStorage } from './storage/local-object-storage';
import { OBJECT_STORAGE } from './storage/object-storage';

/**
 * Real MySQL + real local file storage (opt-in: RUN_DB_INTEGRATION=1). Isolation: four random test users, a
 * temporary storage directory, and cleanup limited to rows tied to those users and their farms.
 */
const describeDb = process.env.RUN_DB_INTEGRATION === '1' ? describe : describe.skip;

type Json = Record<string, unknown>;
type U = { id: bigint; token: string };
const json = (res: { body: unknown }): Json => res.body as Json;

describeDb('Farm & facility media on real MySQL and local storage', () => {
  const mobiles = [0, 1, 2, 3].map(() => `+2015${String(randomInt(0, 100_000_000)).padStart(8, '0')}`);
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let dir: string;
  let owner: U;
  let tenant: U;
  let stranger: U;
  let other: U;
  let farmId: string;
  let facilityId: string;
  let otherFarmId: string;
  const http = () => request(app.getHttpServer());
  const as = (u: U) => ({
    get: (path: string) => http().get(path).set('Authorization', `Bearer ${u.token}`),
    post: (path: string, body: object = {}) => http().post(path).set('Authorization', `Bearer ${u.token}`).send(body),
    upload: (path: string, buf: Buffer, name: string, type: string) =>
      http()
        .post(path)
        .set('Authorization', `Bearer ${u.token}`)
        .attach('file', buf, { filename: name, contentType: type }),
  });
  const FARM = { name: 'Media Farm', farmType: 'fruit', areaFeddan: 5, governorate: 'Beheira' };
  const createdUserIds: bigint[] = [];
  const ids = (): bigint[] => createdUserIds;

  async function filesOnDisk(): Promise<string[]> {
    const entries = await readdir(dir, { recursive: true, withFileTypes: true });
    return entries.filter((e) => e.isFile()).map((e) => join(e.parentPath, e.name));
  }

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
    dir = await mkdtemp(join(tmpdir(), 'farmexit-media-it-'));
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(OBJECT_STORAGE)
      .useValue(new LocalObjectStorage(dir))
      .compile();
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
    other = await makeUser(mobiles[3]);
    farmId = json(await as(owner).post('/api/v1/farms', FARM).expect(201)).id as string;
    otherFarmId = json(
      await as(other)
        .post('/api/v1/farms', { ...FARM, name: 'Other' })
        .expect(201),
    ).id as string;
    facilityId = json(
      await as(owner)
        .post(`/api/v1/farms/${farmId}/facilities`, { facilityType: 'produce_storage', name: 'Store' })
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
      await app?.close();
      if (dir) await rm(dir, { recursive: true, force: true });
    }
  });

  it('uploads a farm image: sanitized bytes on disk, a row with the server key, authorized serving', async () => {
    const res = json(
      await as(owner)
        .upload(`/api/v1/farms/${farmId}/media`, makeJpeg({ gps: true }), 'gate.jpg', 'image/jpeg')
        .expect(201),
    );
    expect(res).toMatchObject({
      farmId,
      mediaType: 'photo',
      contentType: 'image/jpeg',
      licenceStatus: 'pending_confirmation',
    });
    const row = await prisma.farmMedia.findUniqueOrThrow({ where: { id: BigInt(res.id as string) } });
    expect(row).toMatchObject({
      farmId: BigInt(farmId),
      uploadedBy: owner.id,
      mediaType: 'photo',
      width: 8,
      height: 8,
    });
    expect(row.storageKey).toMatch(new RegExp(`^farms/${farmId}/media/[0-9a-f-]{36}\\.jpg$`));
    const stored = await readFile(join(dir, ...row.storageKey.split('/')));
    expect(stored.includes(GPS_MARKER)).toBe(false);

    const served = await as(tenant)
      .get(`/api/v1/farms/${farmId}/media/${String(res.id)}/file`)
      .buffer(true)
      .parse((r, cb) => {
        const chunks: Buffer[] = [];
        r.on('data', (c: Buffer) => chunks.push(c));
        r.on('end', () => cb(null, Buffer.concat(chunks)));
      })
      .expect(200);
    expect((served.body as Buffer).equals(stored)).toBe(true);
    expect(served.headers['cache-control']).toBe('private, no-store');
    expect(JSON.stringify(res)).not.toContain(row.storageKey);
  });

  it('uploads a facility image bound to its facility and farm', async () => {
    const res = json(
      await as(owner)
        .upload(`/api/v1/farms/${farmId}/facilities/${facilityId}/media`, makePng(), 'a.png', 'image/png')
        .expect(201),
    );
    const row = await prisma.facilityMedia.findUniqueOrThrow({ where: { id: BigInt(res.id as string) } });
    expect(row).toMatchObject({ facilityId: BigInt(facilityId), uploadedBy: owner.id, mediaType: 'photo' });
    expect(row.storageKey).toMatch(new RegExp(`^facilities/${facilityId}/media/[0-9a-f-]{36}\\.png$`));
    const list = json(await as(tenant).get(`/api/v1/farms/${farmId}/facilities/${facilityId}/media`).expect(200));
    expect(list.total).toBe(1);
  });

  it('enforces roles and cross-farm/facility isolation', async () => {
    const farmMedia = await prisma.farmMedia.findFirstOrThrow({ where: { farmId: BigInt(farmId) } });
    const facMedia = await prisma.facilityMedia.findFirstOrThrow({ where: { facilityId: BigInt(facilityId) } });
    const before = await filesOnDisk();
    await as(tenant).upload(`/api/v1/farms/${farmId}/media`, makeJpeg(), 'a.jpg', 'image/jpeg').expect(403);
    await as(stranger).upload(`/api/v1/farms/${farmId}/media`, makeJpeg(), 'a.jpg', 'image/jpeg').expect(404);
    await as(stranger).get(`/api/v1/farms/${farmId}/media`).expect(404);
    await as(stranger)
      .get(`/api/v1/farms/${farmId}/media/${String(farmMedia.id)}/file`)
      .expect(404);
    // the other farm's owner cannot reach this farm's media through their own farm or facility ids
    await as(other)
      .get(`/api/v1/farms/${otherFarmId}/media/${String(farmMedia.id)}`)
      .expect(404);
    await as(other).get(`/api/v1/farms/${otherFarmId}/facilities/${facilityId}/media`).expect(404);
    await as(other)
      .upload(`/api/v1/farms/${otherFarmId}/facilities/${facilityId}/media`, makePng(), 'a.png', 'image/png')
      .expect(404);
    await as(owner)
      .get(`/api/v1/farms/${farmId}/facilities/${facilityId}/media/${String(farmMedia.id + 1000n)}`)
      .expect(404);
    await as(owner)
      .get(`/api/v1/farms/${farmId}/media/${String(facMedia.id + 1000n)}`)
      .expect(404);
    expect(await filesOnDisk()).toEqual(before);
  });

  it('rejects invalid uploads without leaving files or rows', async () => {
    const files = await filesOnDisk();
    const rows = await prisma.farmMedia.count({ where: { farmId: BigInt(farmId) } });
    await as(owner)
      .upload(`/api/v1/farms/${farmId}/media`, Buffer.from('<?php ?>'.padEnd(64)), 'a.jpg', 'image/jpeg')
      .expect(415);
    await as(owner).upload(`/api/v1/farms/${farmId}/media`, makePng(), 'a.jpg', 'image/jpeg').expect(415);
    await as(owner).upload(`/api/v1/farms/${farmId}/media`, makeJpeg(), 'x.php.jpg', 'image/jpeg').expect(400);
    expect(await filesOnDisk()).toEqual(files);
    expect(await prisma.farmMedia.count({ where: { farmId: BigInt(farmId) } })).toBe(rows);
  });

  it('removes the stored file when the database insert fails', async () => {
    const files = await filesOnDisk();
    const original = prisma.$transaction.bind(prisma);
    const spy = jest.spyOn(prisma, '$transaction').mockImplementationOnce(((fn: (tx: unknown) => Promise<unknown>) =>
      original((tx) =>
        fn(
          new Proxy(tx as object, {
            get: (target, prop, receiver) => {
              if (prop !== 'farmMedia') return Reflect.get(target, prop, receiver) as unknown;
              const media = Reflect.get(target, prop, receiver) as object;
              return new Proxy(media, {
                get: (mediaTarget, mediaProp, mediaReceiver) =>
                  mediaProp === 'create'
                    ? () => Promise.reject(new Error('simulated db failure'))
                    : (Reflect.get(mediaTarget, mediaProp, mediaReceiver) as unknown),
              });
            },
          }),
        ),
      )) as never);
    await as(owner).upload(`/api/v1/farms/${farmId}/media`, makeJpeg(), 'a.jpg', 'image/jpeg').expect(500);
    spy.mockRestore();
    expect(await filesOnDisk()).toEqual(files);
  });

  it('lets only one of two concurrent uploads take the last slot', async () => {
    const farm = BigInt(farmId);
    const have = await prisma.farmMedia.count({ where: { farmId: farm } });
    for (let i = have; i < MAX_MEDIA_PER_FARM - 1; i++) {
      await prisma.farmMedia.create({
        data: {
          farmId: farm,
          uploadedBy: owner.id,
          mediaType: 'photo',
          storageKey: `farms/${farmId}/media/${randomUUID()}.jpg`,
          sortOrder: i,
        },
      });
    }
    const facilityHave = await prisma.facilityMedia.count({ where: { facilityId: BigInt(facilityId) } });
    for (let i = facilityHave; i < MAX_MEDIA_PER_FACILITY - 1; i++) {
      await prisma.facilityMedia.create({
        data: {
          facilityId: BigInt(facilityId),
          uploadedBy: owner.id,
          mediaType: 'photo',
          storageKey: `facilities/${facilityId}/media/${randomUUID()}.png`,
          sortOrder: i,
        },
      });
    }
    const filesBefore = await filesOnDisk();
    const uploadFarm = () => as(owner).upload(`/api/v1/farms/${farmId}/media`, makeJpeg(), 'a.jpg', 'image/jpeg');
    const uploadFacility = () =>
      as(owner).upload(`/api/v1/farms/${farmId}/facilities/${facilityId}/media`, makePng(), 'a.png', 'image/png');
    const [farmA, farmB, facilityA, facilityB] = await Promise.all([
      uploadFarm(),
      uploadFarm(),
      uploadFacility(),
      uploadFacility(),
    ]);
    expect([farmA.status, farmB.status].sort()).toEqual([201, 409]);
    expect([facilityA.status, facilityB.status].sort()).toEqual([201, 409]);
    expect(await prisma.farmMedia.count({ where: { farmId: farm } })).toBe(MAX_MEDIA_PER_FARM);
    expect(await prisma.facilityMedia.count({ where: { facilityId: BigInt(facilityId) } })).toBe(
      MAX_MEDIA_PER_FACILITY,
    );
    expect((await filesOnDisk()).length).toBe(filesBefore.length + 2);
  });

  it('never serves a tampered storage key', async () => {
    const row = await prisma.farmMedia.create({
      data: {
        farmId: BigInt(farmId),
        uploadedBy: owner.id,
        mediaType: 'photo',
        storageKey: '../../../../etc/hosts',
        sortOrder: 99,
      },
    });
    await as(owner)
      .get(`/api/v1/farms/${farmId}/media/${String(row.id)}/file`)
      .expect(404);
  });
});
