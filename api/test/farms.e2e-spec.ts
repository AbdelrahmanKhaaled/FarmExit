import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { type App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/common/app-setup';
import { DevelopmentSmsProvider } from '../src/modules/auth/sms/development-sms.provider';
import { SMS_PROVIDER } from '../src/modules/auth/sms/sms-provider';
import { PrismaService } from '../src/prisma/prisma.service';
import { createFakePrisma, type FakePrisma } from './support/fake-prisma';

type Json = Record<string, unknown>;
const json = (res: { body: unknown }): Json => res.body as Json;

const VALID = {
  name: 'Wadi Orchard',
  farmType: 'fruit',
  areaFeddan: 12.5,
  governorate: 'Beheira',
};

describe('Farms (e2e)', () => {
  let app: INestApplication<App>;
  let db: FakePrisma;
  let sms: DevelopmentSmsProvider;
  const http = () => request(app.getHttpServer());
  const bearer = (token: unknown) => `Bearer ${token as string}`;

  beforeEach(async () => {
    db = createFakePrisma();
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(db)
      .compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    sms = app.get<DevelopmentSmsProvider>(SMS_PROVIDER);
  });

  afterEach(async () => {
    await app.close();
  });

  let counter = 0;
  async function user(complete = true): Promise<{ id: bigint; token: string }> {
    const mobile = `0101000${String(2000 + counter++)}`;
    const e164 = `+20${mobile.slice(1)}`;
    await http().post('/api/v1/auth/otp/request').send({ mobile }).expect(200);
    const code = sms.lastCodeFor(e164) as string;
    const session = json(await http().post('/api/v1/auth/otp/verify').send({ mobile, code }).expect(200));
    const token = session.accessToken as string;
    if (complete) {
      await http()
        .post('/api/v1/auth/profile/complete')
        .set('Authorization', bearer(token))
        .send({ fullName: 'Test Person' })
        .expect(200);
    }
    return { id: db.user.rows.find((r) => r.mobileE164 === e164)?.id as bigint, token };
  }

  const as = (token: string) => ({
    post: (path: string, body: unknown = {}) =>
      http()
        .post(path)
        .set('Authorization', bearer(token))
        .send(body as object),
    get: (path: string) => http().get(path).set('Authorization', bearer(token)),
    patch: (path: string, body: unknown = {}) =>
      http()
        .patch(path)
        .set('Authorization', bearer(token))
        .send(body as object),
  });
  const createFarm = async (token: string, extra: Json = {}): Promise<Json> =>
    json(
      await as(token)
        .post('/api/v1/farms', { ...VALID, ...extra })
        .expect(201),
    );
  const relate = (userId: bigint, farmId: bigint, relationshipRole: string, extra: Json = {}) =>
    db.farmRelationship.create({ data: { userId, farmId, relationshipRole, ...extra } });
  const makeStaff = (userId: bigint, staffRole: string) => db.staffMembership.create({ data: { userId, staffRole } });

  describe('POST /farms', () => {
    it('creates a farm and the caller becomes its owner (one transaction)', async () => {
      const u = await user();
      const farm = await createFarm(u.token, { name: '  Padded Name  ', waterSource: 'well', soilType: 'Sandy' });
      expect(farm).toMatchObject({
        name: 'Padded Name',
        farmType: 'fruit',
        areaFeddan: 12.5,
        governorate: 'Beheira',
        waterSource: 'well',
        soilType: 'Sandy',
        description: null,
        farmStatus: 'active',
        myRoles: ['owner'],
      });
      expect(db.farm.rows).toHaveLength(1);
      expect(db.farm.rows[0]).toMatchObject({ createdBy: u.id });
      expect(db.farmRelationship.rows).toEqual([
        expect.objectContaining({
          userId: u.id,
          farmId: db.farm.rows[0]?.id,
          relationshipRole: 'owner',
          relationshipStatus: 'active',
        }),
      ]);
      expect(db.staffMembership.rows).toHaveLength(0);
    });

    it('returns only safe fields: no owner/creator ids, contact details or private location', async () => {
      const u = await user();
      const farm = await createFarm(u.token);
      const text = JSON.stringify(farm);
      expect(text).not.toMatch(/createdBy|userId|mobile|email|privatePin|latitude|longitude|201010/i);
      expect(Object.keys(farm).sort()).toEqual(
        [
          'areaFeddan',
          'areaName',
          'createdAt',
          'description',
          'energySource',
          'farmStatus',
          'farmType',
          'governorate',
          'id',
          'irrigationMethod',
          'mainActivity',
          'myRoles',
          'name',
          'soilType',
          'updatedAt',
          'waterSource',
        ].sort(),
      );
    });

    it('rejects mass assignment: owner, creator, roles, statuses, location, ids, staff', async () => {
      const u = await user();
      const other = await user();
      const attacks: Json[] = [
        { createdBy: String(other.id) },
        { userId: String(other.id) },
        { ownerId: String(other.id) },
        { owner: { id: String(other.id) } },
        { relationshipRole: 'owner' },
        { relationshipStatus: 'active' },
        { relationships: [{ userId: String(other.id), relationshipRole: 'owner' }] },
        { farmStatus: 'verified' },
        { id: '1' },
        { privatePinLatitude: 30.1, privatePinLongitude: 31.2 },
        { publicMapLatitude: 30.1 },
        { isVerified: true },
        { farmExitScore: 99 },
        { listed: true },
        { role: 'admin' },
        { staffRole: 'admin' },
        { deletedAt: null },
      ];
      for (const attack of attacks)
        await as(u.token)
          .post('/api/v1/farms', { ...VALID, ...attack })
          .expect(400);
      expect(db.farm.rows).toHaveLength(0);
      expect(db.farmRelationship.rows).toHaveLength(0);
    });

    it('cannot attach the caller to an existing farm', async () => {
      const owner = await user();
      const stranger = await user();
      const farm = await createFarm(owner.token);
      await as(stranger.token)
        .post('/api/v1/farms', { ...VALID, id: farm.id, farmId: farm.id })
        .expect(400);
      expect(db.farmRelationship.rows).toHaveLength(1);
      await as(stranger.token)
        .get(`/api/v1/farms/${farm.id as string}`)
        .expect(404);
    });

    it('validates data', async () => {
      const u = await user();
      const bad: Json[] = [
        { name: '' },
        { name: '   ' },
        { name: 'x'.repeat(201) },
        { name: 5 },
        { farmType: 'castle' },
        { farmType: 'Fruit' },
        { areaFeddan: 0 },
        { areaFeddan: -1 },
        { areaFeddan: '12' },
        { areaFeddan: 1.234 },
        { areaFeddan: 1e12 },
        { areaFeddan: null },
        { governorate: '' },
        { waterSource: 'rain' },
        { irrigationMethod: 'flood' },
        { energySource: 'coal' },
        { description: 'd'.repeat(5001) },
      ];
      for (const patch of bad)
        await as(u.token)
          .post('/api/v1/farms', { ...VALID, ...patch })
          .expect(400);
      for (const key of ['name', 'farmType', 'areaFeddan', 'governorate']) {
        const body: Json = { ...VALID };
        delete body[key];
        await as(u.token).post('/api/v1/farms', body).expect(400);
      }
      await as(u.token).post('/api/v1/farms', {}).expect(400);
      expect(db.farm.rows).toHaveLength(0);
    });

    it('401 without a token, 403 PROFILE_INCOMPLETE with an incomplete profile', async () => {
      await http().post('/api/v1/farms').send(VALID).expect(401);
      const u = await user(false);
      const res = await as(u.token).post('/api/v1/farms', VALID).expect(403);
      expect(json(res).code).toBe('PROFILE_INCOMPLETE');
      expect(db.farm.rows).toHaveLength(0);
    });

    it('rolls back the farm when the owner relationship cannot be created', async () => {
      const u = await user();
      const original = db.farmRelationship.create.bind(db.farmRelationship);
      db.farmRelationship.create = () => Promise.reject(new Error('relationship insert failed'));
      await as(u.token).post('/api/v1/farms', VALID).expect(500);
      db.farmRelationship.create = original;
      expect(db.farm.rows).toHaveLength(0);
      expect(db.farmRelationship.rows).toHaveLength(0);
      await createFarm(u.token); // and the next attempt works
    });
  });

  describe('GET /farms/mine', () => {
    it('lists only my farms with my roles, newest first, with pagination', async () => {
      const a = await user();
      const b = await user();
      for (let i = 1; i <= 3; i++) await createFarm(a.token, { name: `A${i}` });
      await createFarm(b.token, { name: 'B1' });
      const bFarm = db.farm.rows.find((f) => f.name === 'B1');
      await relate(a.id, bFarm?.id as bigint, 'manager'); // a also manages B1

      const all = json(await as(a.token).get('/api/v1/farms/mine').expect(200));
      expect((all.items as Json[]).map((f) => f.name)).toEqual(['B1', 'A3', 'A2', 'A1']);
      expect(all).toMatchObject({ page: 1, pageSize: 20, total: 4 });
      expect((all.items as Json[])[0]?.myRoles).toEqual(['manager']);

      const p2 = json(await as(a.token).get('/api/v1/farms/mine?page=2&pageSize=3').expect(200));
      expect((p2.items as Json[]).map((f) => f.name)).toEqual(['A1']);
      expect(p2).toMatchObject({ page: 2, pageSize: 3, total: 4 });

      const mine = json(await as(b.token).get('/api/v1/farms/mine').expect(200));
      expect((mine.items as Json[]).map((f) => f.name)).toEqual(['B1']);
    });

    it('ignores pending, inactive, expired, not-started relationships and deleted farms', async () => {
      const u = await user();
      const owner = await user();
      const farms = [] as bigint[];
      for (let i = 0; i < 5; i++) farms.push(BigInt((await createFarm(owner.token, { name: `F${i}` })).id as string));
      await relate(u.id, farms[0], 'tenant', { relationshipStatus: 'pending' });
      await relate(u.id, farms[1], 'tenant', { relationshipStatus: 'inactive' });
      await relate(u.id, farms[2], 'tenant', { endsAt: new Date(Date.now() - 1000) });
      await relate(u.id, farms[3], 'tenant', { startsAt: new Date(Date.now() + 86_400_000) });
      await relate(u.id, farms[4], 'tenant');
      expect(
        (json(await as(u.token).get('/api/v1/farms/mine').expect(200)).items as Json[]).map((f) => f.name),
      ).toEqual(['F4']);
      db.farm.rows.find((f) => f.id === farms[4])!.deletedAt = new Date();
      expect(json(await as(u.token).get('/api/v1/farms/mine').expect(200)).total).toBe(0);
    });

    it('validates paging and requires auth and a completed profile', async () => {
      const u = await user();
      for (const q of ['page=0', 'page=-1', 'page=x', 'pageSize=0', 'pageSize=51', 'pageSize=1.5', 'foo=1']) {
        await as(u.token).get(`/api/v1/farms/mine?${q}`).expect(400);
      }
      await http().get('/api/v1/farms/mine').expect(401);
      const incomplete = await user(false);
      await as(incomplete.token).get('/api/v1/farms/mine').expect(403);
    });
  });

  describe('GET /farms/:id', () => {
    it('lets any active farm role read, and nobody else (cross-farm IDOR = 404)', async () => {
      const owner = await user();
      const tenant = await user();
      const stranger = await user();
      const farm = await createFarm(owner.token);
      const farm2 = await createFarm(stranger.token, { name: 'Other' });
      const id = BigInt(farm.id as string);
      await relate(tenant.id, id, 'tenant');

      expect(json(await as(owner.token).get(`/api/v1/farms/${id}`).expect(200)).myRoles).toEqual(['owner']);
      expect(json(await as(tenant.token).get(`/api/v1/farms/${id}`).expect(200)).myRoles).toEqual(['tenant']);
      const denied = await as(stranger.token).get(`/api/v1/farms/${id}`).expect(404);
      const missing = await as(stranger.token).get('/api/v1/farms/99999').expect(404);
      expect(denied.body).toEqual(missing.body); // cannot tell "exists but not yours" from "does not exist"
      // an owner of farm 2 has nothing on farm 1, and vice versa
      await as(owner.token)
        .get(`/api/v1/farms/${farm2.id as string}`)
        .expect(404);
    });

    it('denies pending, inactive, expired relationships and deleted farms', async () => {
      const owner = await user();
      const u = await user();
      const farm = await createFarm(owner.token);
      const id = BigInt(farm.id as string);
      for (const extra of [
        { relationshipStatus: 'pending' },
        { relationshipStatus: 'inactive' },
        { endsAt: new Date(Date.now() - 1000) },
      ]) {
        db.farmRelationship.rows.length = 1;
        await relate(u.id, id, 'owner', extra);
        await as(u.token).get(`/api/v1/farms/${id}`).expect(404);
      }
      db.farm.rows[0].deletedAt = new Date();
      await as(owner.token).get(`/api/v1/farms/${id}`).expect(404);
    });

    it('lets FarmExit staff with requests.read read, others cannot; client-sent roles are ignored', async () => {
      const owner = await user();
      const agent = await user();
      const nobody = await user();
      const farm = await createFarm(owner.token);
      await makeStaff(agent.id, 'caseAgent');
      const res = json(
        await as(agent.token)
          .get(`/api/v1/farms/${farm.id as string}`)
          .expect(200),
      );
      expect(res.myRoles).toEqual([]);
      await http()
        .get(`/api/v1/farms/${farm.id as string}`)
        .set('Authorization', bearer(nobody.token))
        .set('X-Staff-Role', 'admin')
        .set('X-Farm-Role', 'owner')
        .expect(404);
      db.staffMembership.rows[0].status = 'inactive';
      await as(agent.token)
        .get(`/api/v1/farms/${farm.id as string}`)
        .expect(404);
    });

    it('400 for invalid ids, never a server error', async () => {
      const u = await user();
      for (const id of [
        'abc',
        '0',
        '-1',
        '1.5',
        '01',
        '1e3',
        '0x10',
        '9223372036854775808',
        '99999999999999999999',
        '%20',
      ]) {
        await as(u.token).get(`/api/v1/farms/${id}`).expect(400);
        await as(u.token).patch(`/api/v1/farms/${id}`, { name: 'X Y' }).expect(400);
      }
    });

    it('401 unauthenticated and 403 PROFILE_INCOMPLETE', async () => {
      await http().get('/api/v1/farms/1').expect(401);
      const u = await user(false);
      expect(json(await as(u.token).get('/api/v1/farms/1').expect(403)).code).toBe('PROFILE_INCOMPLETE');
    });
  });

  describe('PATCH /farms/:id', () => {
    it('lets the owner and a manager update, and nobody else', async () => {
      const owner = await user();
      const manager = await user();
      const tenant = await user();
      const partner = await user();
      const engineer = await user();
      const stranger = await user();
      const farm = await createFarm(owner.token);
      const id = BigInt(farm.id as string);
      await relate(manager.id, id, 'manager');
      await relate(tenant.id, id, 'tenant');
      await relate(partner.id, id, 'partner');
      await relate(engineer.id, id, 'agriculturalEngineer');

      const res = json(
        await as(owner.token).patch(`/api/v1/farms/${id}`, { name: 'Renamed', areaName: 'North' }).expect(200),
      );
      expect(res).toMatchObject({ name: 'Renamed', areaName: 'North', governorate: 'Beheira' });
      await as(manager.token).patch(`/api/v1/farms/${id}`, { areaFeddan: 20 }).expect(200);
      expect(db.farm.rows[0]).toMatchObject({ name: 'Renamed', areaFeddan: 20 });

      for (const u of [tenant, partner, engineer])
        await as(u.token).patch(`/api/v1/farms/${id}`, { name: 'Hacked' }).expect(403);
      await as(stranger.token).patch(`/api/v1/farms/${id}`, { name: 'Hacked' }).expect(404);
      expect(db.farm.rows[0]?.name).toBe('Renamed');
    });

    it('does not let owners of other farms, staff or pending/expired roles update', async () => {
      const owner = await user();
      const other = await user();
      const agent = await user();
      const pendingOwner = await user();
      const farm = await createFarm(owner.token);
      await createFarm(other.token, { name: 'Other farm' });
      const id = BigInt(farm.id as string);
      await makeStaff(agent.id, 'admin');
      await relate(pendingOwner.id, id, 'owner', { relationshipStatus: 'pending' });

      await as(other.token).patch(`/api/v1/farms/${id}`, { name: 'Hacked' }).expect(404); // owner of ANOTHER farm
      await as(agent.token).patch(`/api/v1/farms/${id}`, { name: 'Hacked' }).expect(403); // staff read-only here
      await as(pendingOwner.token).patch(`/api/v1/farms/${id}`, { name: 'Hacked' }).expect(404);
      expect(db.farm.rows[0]?.name).toBe('Wadi Orchard');
    });

    it('revocation applies immediately', async () => {
      const owner = await user();
      const manager = await user();
      const farm = await createFarm(owner.token);
      const id = BigInt(farm.id as string);
      await relate(manager.id, id, 'manager');
      await as(manager.token).patch(`/api/v1/farms/${id}`, { name: 'Fine Name' }).expect(200);
      db.farmRelationship.rows[1].relationshipStatus = 'inactive';
      await as(manager.token).patch(`/api/v1/farms/${id}`, { name: 'After Revoke' }).expect(404);
    });

    it('rejects mass assignment and cannot change ownership, status or location', async () => {
      const owner = await user();
      const other = await user();
      const farm = await createFarm(owner.token);
      const id = farm.id as string;
      const attacks: Json[] = [
        { createdBy: String(other.id) },
        { userId: String(other.id) },
        { ownerId: String(other.id) },
        { relationshipRole: 'owner' },
        { relationshipStatus: 'active' },
        { farmStatus: 'verified' },
        { id: '999' },
        { privatePinLatitude: 1 },
        { publicMapLongitude: 1 },
        { deletedAt: '2020-01-01' },
        { createdAt: '2020-01-01' },
        { role: 'admin' },
      ];
      for (const attack of attacks)
        await as(owner.token)
          .patch(`/api/v1/farms/${id}`, { name: 'Ok Name', ...attack })
          .expect(400);
      expect(db.farm.rows[0]).toMatchObject({ createdBy: owner.id, farmStatus: 'active', name: 'Wadi Orchard' });
      expect(db.farmRelationship.rows).toHaveLength(1);
    });

    it('validates data, clears optional fields with null, never clears required ones, rejects empty bodies', async () => {
      const owner = await user();
      const farm = await createFarm(owner.token, { description: 'Nice', waterSource: 'canal' });
      const id = farm.id as string;
      for (const bad of [
        { name: null },
        { name: '' },
        { farmType: null },
        { farmType: 'x' },
        { areaFeddan: null },
        { areaFeddan: 0 },
        { areaFeddan: 'a' },
        { governorate: null },
        { waterSource: 'rain' },
      ]) {
        await as(owner.token).patch(`/api/v1/farms/${id}`, bad).expect(400);
      }
      await as(owner.token).patch(`/api/v1/farms/${id}`, {}).expect(400);
      const cleared = json(
        await as(owner.token).patch(`/api/v1/farms/${id}`, { description: null, waterSource: null }).expect(200),
      );
      expect(cleared).toMatchObject({ description: null, waterSource: null, name: 'Wadi Orchard' });
    });

    it('401 unauthenticated and 403 PROFILE_INCOMPLETE', async () => {
      await http().patch('/api/v1/farms/1').send({ name: 'Abc' }).expect(401);
      const u = await user(false);
      expect(json(await as(u.token).patch('/api/v1/farms/1', { name: 'Abc' }).expect(403)).code).toBe(
        'PROFILE_INCOMPLETE',
      );
    });
  });

  it('exposes no DELETE and no way to modify relationships', async () => {
    const u = await user();
    const farm = await createFarm(u.token);
    const id = farm.id as string;
    for (const [method, path] of [
      ['delete', `/api/v1/farms/${id}`],
      ['put', `/api/v1/farms/${id}`],
      ['post', `/api/v1/farms/${id}/relationships`],
      ['post', `/api/v1/farms/${id}`],
    ] as const) {
      const res = await (http() as unknown as Record<string, (p: string) => request.Test>)
        [method](path)
        .set('Authorization', bearer(u.token))
        .send({});
      expect([404, 405]).toContain(res.status);
    }
    expect(db.farm.rows).toHaveLength(1);
  });

  it('documents the farm endpoints in OpenAPI', async () => {
    const doc = json(await http().get('/api/docs-json').expect(200));
    const paths = Object.keys(doc.paths as Json);
    expect(paths).toEqual(expect.arrayContaining(['/api/v1/farms', '/api/v1/farms/mine', '/api/v1/farms/{id}']));
  });
});
