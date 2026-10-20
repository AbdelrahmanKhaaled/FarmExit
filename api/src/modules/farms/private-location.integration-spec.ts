import { randomBytes, randomInt } from 'node:crypto';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../app.module';
import { configureApp } from '../../common/app-setup';
import { PrismaService } from '../../prisma/prisma.service';
import { TokenService } from '../auth/token.service';

// Explicit opt-in. Creates dedicated test records only, retains them, never deletes or seeds anything.
const db = process.env.RUN_GEO_DB === '1' ? describe : describe.skip;
db('Stage 1B dedicated MySQL location farm (records retained)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let owner: { id: bigint; token: string };
  let stranger: { id: bigint; token: string };
  let farmId: string;
  const http = () => request('http://127.0.0.1:4001');
  const endpoint = () => `/api/v1/farms/${farmId}/private-location`;
  async function user() {
    const now = new Date();
    const mobile = `+2015${String(randomInt(0, 100_000_000)).padStart(8, '0')}`;
    if (await prisma.user.findUnique({ where: { mobileE164: mobile } })) throw new Error('Test identity collision');
    const row = await prisma.user.create({
      data: { mobileE164: mobile, fullName: 'Stage 1B Geolocation Test', mobileVerifiedAt: now, createdAt: now },
    });
    const session = await prisma.userSession.create({
      data: {
        userId: row.id,
        sessionTokenHash: randomBytes(32).toString('hex'),
        createdAt: now,
        expiresAt: new Date(Date.now() + 3600000),
      },
    });
    return { id: row.id, token: app.get(TokenService).signAccessToken(row.id, session.id) };
  }
  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    configureApp(app);
    // Fails if occupied; never terminates/replaces an existing server and never touches port 4000.
    await app.listen(4001, '127.0.0.1');
    prisma = app.get(PrismaService);
    // Prove existing columns before creating any records. A missing column is a blocker, not a migration trigger.
    await prisma.farm.findFirst({
      select: { privatePinLatitude: true, privatePinLongitude: true, accessDetails: true },
    });
    owner = await user();
    stranger = await user();
    const created = await http()
      .post('/api/v1/farms')
      .auth(owner.token, { type: 'bearer' })
      .send({
        name: `Stage 1B location audit ${Date.now()}`,
        farmType: 'fruit',
        areaFeddan: 1,
        governorate: 'Beni Suef',
      })
      .expect(201);
    farmId = (created.body as { id: string }).id;
    await prisma.farm.update({
      where: { id: BigInt(farmId) },
      data: { accessDetails: { legacyTestKey: 'must survive', nested: { retained: true } } },
    });
    console.info(
      `Dedicated test farm ${farmId}; test users ${owner.id}, ${stranger.id}. Records retained; no deletions.`,
    );
  }, 60000);
  afterAll(async () => {
    try {
      const ids = [owner?.id, stranger?.id].filter((id): id is bigint => id !== undefined);
      if (prisma && ids.length) {
        await prisma.userSession.updateMany({ where: { userId: { in: ids } }, data: { revokedAt: new Date() } });
        await prisma.staffMembership.updateMany({ where: { userId: { in: ids } }, data: { status: 'inactive' } });
      }
    } finally {
      await app?.close();
    }
  });

  it('saves/retrieves/edits/clears exact coordinates and road fields in real MySQL', async () => {
    const patch = (body: object) => http().patch(endpoint()).auth(owner.token, { type: 'bearer' }).send(body);
    const initial = {
      privatePinLatitude: 29.12345678,
      privatePinLongitude: 31.12345678,
      nearestMainRoad: 'Stage 1B test road',
      roadDistanceKm: 2.75,
    };
    await patch(initial).expect(200);
    const stored = await prisma.farm.findUniqueOrThrow({ where: { id: BigInt(farmId) } });
    expect(Number(stored.privatePinLatitude)).toBe(initial.privatePinLatitude);
    expect(Number(stored.privatePinLongitude)).toBe(initial.privatePinLongitude);
    expect(stored.accessDetails).toMatchObject({
      legacyTestKey: 'must survive',
      nested: { retained: true },
      nearestMainRoad: initial.nearestMainRoad,
      roadDistanceKm: 2.75,
    });
    expect(stored.publicMapLatitude).toBeNull();
    expect(stored.publicMapLongitude).toBeNull();
    const read = await http().get(endpoint()).auth(owner.token, { type: 'bearer' }).expect(200);
    expect(read.body).toMatchObject(initial);
    expect(read.headers['cache-control']).toContain('no-store');
    expect(read.body).not.toHaveProperty('accessDetails');
    await patch({ privatePinLatitude: 30, privatePinLongitude: 32, roadDistanceKm: 0 }).expect(200);
    expect((await http().get(endpoint()).auth(owner.token, { type: 'bearer' })).body).toMatchObject({
      privatePinLatitude: 30,
      privatePinLongitude: 32,
      roadDistanceKm: 0,
    });
    for (const body of [
      { privatePinLatitude: 29 },
      { privatePinLatitude: null, privatePinLongitude: 31 },
      { privatePinLatitude: 91, privatePinLongitude: 31 },
      { roadDistanceKm: -1 },
      { publicMapLatitude: 29 },
    ])
      await patch(body).expect(400);
    await patch({
      privatePinLatitude: null,
      privatePinLongitude: null,
      nearestMainRoad: null,
      roadDistanceKm: null,
    }).expect(200);
    const cleared = await prisma.farm.findUniqueOrThrow({ where: { id: BigInt(farmId) } });
    expect(cleared.privatePinLatitude).toBeNull();
    expect(cleared.privatePinLongitude).toBeNull();
    expect(cleared.accessDetails).toEqual({ legacyTestKey: 'must survive', nested: { retained: true } });
  });
  it('enforces authentication, owner scope and staff read-only permission; generic/public reads exclude location', async () => {
    await http().get(endpoint()).expect(401);
    await http().get(endpoint()).auth(stranger.token, { type: 'bearer' }).expect(404);
    await http().patch(endpoint()).auth(stranger.token, { type: 'bearer' }).send({ roadDistanceKm: 1 }).expect(404);
    await prisma.farmRelationship.create({
      data: {
        farmId: BigInt(farmId),
        userId: stranger.id,
        relationshipRole: 'manager',
        relationshipStatus: 'active',
        startsAt: new Date(),
      },
    });
    await http().get(`/api/v1/farms/${farmId}`).auth(stranger.token, { type: 'bearer' }).expect(200);
    await http().get(endpoint()).auth(stranger.token, { type: 'bearer' }).expect(404);
    await http().patch(endpoint()).auth(stranger.token, { type: 'bearer' }).send({ roadDistanceKm: 1 }).expect(404);
    await prisma.staffMembership.create({ data: { userId: stranger.id, staffRole: 'caseAgent', status: 'active' } });
    await http().get(endpoint()).auth(stranger.token, { type: 'bearer' }).expect(404);
    await prisma.staffMembership.create({ data: { userId: stranger.id, staffRole: 'admin', status: 'active' } });
    await http().get(endpoint()).auth(stranger.token, { type: 'bearer' }).expect(200);
    await http().patch(endpoint()).auth(stranger.token, { type: 'bearer' }).send({ roadDistanceKm: 1 }).expect(404);
    // Preserve populated private values while checking all ordinary/public response paths.
    await http()
      .patch(endpoint())
      .auth(owner.token, { type: 'bearer' })
      .send({
        privatePinLatitude: 29.12345678,
        privatePinLongitude: 31.12345678,
        nearestMainRoad: 'Private test road',
        roadDistanceKm: 3,
      })
      .expect(200);
    for (const path of [`/api/v1/farms/${farmId}`, '/api/v1/farms/mine', '/api/v1/marketplace/farms']) {
      const response = await http().get(path).auth(owner.token, { type: 'bearer' }).expect(200);
      expect(JSON.stringify(response.body)).not.toMatch(
        /privatePin|publicMap|accessDetails|nearestMainRoad|roadDistanceKm|Private test road/,
      );
    }
  });
  it('optionally verifies map click/save/MySQL/reload through the real API on 4001', async () => {
    if (process.env.RUN_GEO_BROWSER !== '1') return;
    await new Promise<void>((done, reject) => {
      const browserEnv: NodeJS.ProcessEnv = { ...process.env, GEO_OWNER_TOKEN: owner.token, GEO_FARM_ID: farmId };
      delete browserEnv.JEST_WORKER_ID;
      const child = spawn(
        process.execPath,
        [
          resolve('../web/node_modules/playwright/cli.js'),
          'test',
          '--config',
          process.env.RUN_GEO_PRODUCTION === '1'
            ? 'tests/visual/geolocation-production.config.ts'
            : 'tests/visual/geolocation.config.ts',
          '--grep',
          'real MySQL',
        ],
        {
          cwd: resolve('../web'),
          env: browserEnv,
          stdio: 'inherit',
        },
      );
      child.on('error', reject);
      child.on('exit', (code) => (code === 0 ? done() : reject(new Error(`Browser verification exited ${code}`))));
    });
    const saved = await prisma.farm.findUniqueOrThrow({ where: { id: BigInt(farmId) } });
    expect(saved.accessDetails).toMatchObject({
      nearestMainRoad: 'Browser test road',
      roadDistanceKm: 4.25,
      legacyTestKey: 'must survive',
    });
    expect(saved.privatePinLatitude).not.toBeNull();
  }, 240000);
});
