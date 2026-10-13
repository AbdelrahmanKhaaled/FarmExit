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
const FARM = { name: 'Wadi Orchard', farmType: 'fruit', areaFeddan: 12.5, governorate: 'Beheira' };
const FACILITY = { facilityType: 'cold_storage_freezing', name: 'Cold Room A' };

describe('Farm specifications & facilities (e2e)', () => {
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
  type U = { id: bigint; token: string };
  async function user(complete = true): Promise<U> {
    const mobile = `0101000${String(3000 + counter++)}`;
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
  const as = (u: U) => ({
    get: (path: string) => http().get(path).set('Authorization', bearer(u.token)),
    post: (path: string, body: object = {}) => http().post(path).set('Authorization', bearer(u.token)).send(body),
    patch: (path: string, body: object = {}) => http().patch(path).set('Authorization', bearer(u.token)).send(body),
  });
  const newFarm = async (u: U, name = 'Wadi Orchard'): Promise<string> =>
    json(
      await as(u)
        .post('/api/v1/farms', { ...FARM, name })
        .expect(201),
    ).id as string;
  const relate = (userId: bigint, farmId: string, relationshipRole: string, extra: Json = {}) =>
    db.farmRelationship.create({ data: { userId, farmId: BigInt(farmId), relationshipRole, ...extra } });
  const makeStaff = (userId: bigint, staffRole: string) => db.staffMembership.create({ data: { userId, staffRole } });
  const farmRow = (id: string) => db.farm.rows.find((f) => f.id === BigInt(id)) as Json;

  /** owner + one user per role on a farm */
  async function setup() {
    const owner = await user();
    const farmId = await newFarm(owner);
    const roles: Record<string, U> = {};
    for (const role of ['manager', 'tenant', 'partner', 'agriculturalEngineer']) {
      roles[role] = await user();
      await relate(roles[role].id, farmId, role);
    }
    return { owner, farmId, roles, stranger: await user() };
  }

  describe('specifications', () => {
    it('reads defaults and returns only safe, allow-listed fields', async () => {
      const { owner, farmId } = await setup();
      const res = json(await as(owner).get(`/api/v1/farms/${farmId}/specifications`).expect(200));
      expect(res).toEqual({
        farmId,
        waterSource: null,
        irrigationMethod: null,
        energySource: null,
        soilType: null,
        cropTypes: [],
        productionDetails: { currentProduction: null, harvestSeasons: null, notes: null },
        canEdit: true,
        updatedAt: expect.any(String) as unknown,
      });
      expect(JSON.stringify(res)).not.toMatch(
        /createdBy|userId|mobile|email|pin|latitude|longitude|accessDetails|facilities|score|verified/i,
      );
    });

    it('supports partial updates and never overwrites unspecified properties', async () => {
      const { owner, farmId } = await setup();
      const url = `/api/v1/farms/${farmId}/specifications`;
      farmRow(farmId).accessDetails = { gateCode: 'secret' };
      farmRow(farmId).facilities = { legacy: true };
      farmRow(farmId).productionDetails = { legacyKey: 'keep me' };

      await as(owner)
        .patch(url, {
          waterSource: 'well',
          soilType: 'Sandy',
          cropTypes: ['citrus', 'palms'],
          productionDetails: { currentProduction: 'Oranges', harvestSeasons: 'Winter' },
        })
        .expect(200);
      // second patch touches one JSON key and one column only
      const res = json(
        await as(owner)
          .patch(url, { productionDetails: { notes: 'Organic practices stated by owner' }, energySource: 'solar' })
          .expect(200),
      );
      expect(res).toMatchObject({
        waterSource: 'well',
        soilType: 'Sandy',
        energySource: 'solar',
        cropTypes: ['citrus', 'palms'],
        productionDetails: {
          currentProduction: 'Oranges',
          harvestSeasons: 'Winter',
          notes: 'Organic practices stated by owner',
        },
      });
      // unknown stored keys survive but are not returned; unrelated JSON columns and basic fields are untouched
      expect(farmRow(farmId).productionDetails).toEqual({
        legacyKey: 'keep me',
        currentProduction: 'Oranges',
        harvestSeasons: 'Winter',
        notes: 'Organic practices stated by owner',
      });
      expect(JSON.stringify(res)).not.toContain('keep me');
      expect(farmRow(farmId).accessDetails).toEqual({ gateCode: 'secret' });
      expect(farmRow(farmId).facilities).toEqual({ legacy: true });
      expect(farmRow(farmId)).toMatchObject({ name: 'Wadi Orchard', governorate: 'Beheira', farmStatus: 'active' });

      // null removes exactly one key / clears one column
      const cleared = json(
        await as(owner)
          .patch(url, { productionDetails: { harvestSeasons: null }, waterSource: null })
          .expect(200),
      );
      expect(cleared).toMatchObject({
        waterSource: null,
        soilType: 'Sandy',
        productionDetails: {
          currentProduction: 'Oranges',
          harvestSeasons: null,
          notes: 'Organic practices stated by owner',
        },
      });
    });

    it('replaces the stated crop type set and rejects invalid sets', async () => {
      const { owner, farmId } = await setup();
      const url = `/api/v1/farms/${farmId}/specifications`;
      await as(owner)
        .patch(url, { cropTypes: ['fruits', 'citrus', 'palms'] })
        .expect(200);
      expect(
        json(
          await as(owner)
            .patch(url, { cropTypes: ['palms', 'exportCrops'] })
            .expect(200),
        ).cropTypes,
      ).toEqual(['exportCrops', 'palms']);
      expect(db.farmCropType.rows.map((r) => r.cropType).sort()).toEqual(['exportCrops', 'palms']);
      expect(json(await as(owner).patch(url, { cropTypes: [] }).expect(200)).cropTypes).toEqual([]);
      for (const bad of [
        ['wheat'],
        ['citrus', 'citrus'],
        'citrus',
        [1],
        ['fruits', 'citrus', 'fieldCrops', 'palms', 'exportCrops', 'fruits'],
      ]) {
        await as(owner).patch(url, { cropTypes: bad }).expect(400);
      }
    });

    it('validates input strictly and rejects mass assignment', async () => {
      const { owner, farmId } = await setup();
      const url = `/api/v1/farms/${farmId}/specifications`;
      const bad: Json[] = [
        {},
        { waterSource: 'rain' },
        { irrigationMethod: 'flood' },
        { energySource: 'coal' },
        { soilType: '' },
        { soilType: 'x'.repeat(121) },
        { productionDetails: 'text' },
        { productionDetails: { currentProduction: '' } },
        { productionDetails: { currentProduction: 'x'.repeat(1001) } },
        { productionDetails: { currentProduction: 5 } },
        { productionDetails: { unknownKey: 'x' } },
        { productionDetails: { gateCode: '1234' } },
        { productionDetails: [] },
        // fields that must never be client-writable here
        { farmId: '1' },
        { id: '1' },
        { name: 'Renamed' },
        { areaFeddan: 5 },
        { farmStatus: 'verified' },
        { createdBy: '1' },
        { accessDetails: { gate: 'x' } },
        { facilities: { a: 1 } },
        { privatePinLatitude: 30.1 },
        { publicMapLatitude: 30.1 },
        { isVerified: true },
        { farmExitScore: 99 },
        { role: 'admin' },
      ];
      for (const body of bad) await as(owner).patch(url, body).expect(400);
      expect(farmRow(farmId)).toMatchObject({ name: 'Wadi Orchard', farmStatus: 'active', waterSource: null });
      expect(db.farmCropType.rows).toHaveLength(0);
    });

    it('lets owner and manager edit; other farm roles read only', async () => {
      const { owner, farmId, roles } = await setup();
      const url = `/api/v1/farms/${farmId}/specifications`;
      await as(owner).patch(url, { soilType: 'Clay' }).expect(200);
      await as(roles.manager).patch(url, { soilType: 'Loam' }).expect(200);
      expect(json(await as(roles.tenant).get(url).expect(200)).canEdit).toBe(false);
      for (const role of ['tenant', 'partner', 'agriculturalEngineer']) {
        const u = roles[role];
        expect(json(await as(u).get(url).expect(200)).soilType).toBe('Loam');
        await as(u).patch(url, { soilType: 'Hacked' }).expect(403);
      }
      expect(farmRow(farmId).soilType).toBe('Loam');
    });

    it('blocks strangers, other farms owners, inactive roles and revoked access (IDOR)', async () => {
      const { owner, farmId, roles, stranger } = await setup();
      const otherOwner = await user();
      await newFarm(otherOwner, 'Other');
      const url = `/api/v1/farms/${farmId}/specifications`;
      for (const u of [stranger, otherOwner]) {
        await as(u).get(url).expect(404);
        await as(u).patch(url, { soilType: 'Hacked' }).expect(404);
      }
      const missing = await as(stranger).get('/api/v1/farms/99999/specifications').expect(404);
      expect((await as(stranger).get(url).expect(404)).body).toEqual(missing.body);

      const late = await user();
      for (const extra of [
        { relationshipStatus: 'pending' },
        { relationshipStatus: 'inactive' },
        { endsAt: new Date(Date.now() - 1000) },
        { startsAt: new Date(Date.now() + 86_400_000) },
      ]) {
        const rel = await relate(late.id, farmId, 'owner', extra);
        await as(late).get(url).expect(404);
        await as(late).patch(url, { soilType: 'Hacked' }).expect(404);
        db.farmRelationship.rows = db.farmRelationship.rows.filter((r) => r.id !== rel.id);
      }
      await as(roles.manager).patch(url, { soilType: 'Fine' }).expect(200);
      db.farmRelationship.rows.find((r) => r.userId === roles.manager.id)!.relationshipStatus = 'inactive';
      await as(roles.manager).patch(url, { soilType: 'Revoked' }).expect(404);
      expect(farmRow(farmId).soilType).toBe('Fine');
      void owner;
    });

    it('gives FarmExit staff NO access merely through requests.read', async () => {
      const { farmId } = await setup();
      const admin = await user();
      const agent = await user();
      await makeStaff(admin.id, 'admin');
      await makeStaff(agent.id, 'caseAgent');
      for (const u of [admin, agent]) {
        // staff can still read the BASIC farm (Phase 04A) but not the sensitive details
        await as(u).get(`/api/v1/farms/${farmId}`).expect(200);
        await as(u).get(`/api/v1/farms/${farmId}/specifications`).expect(404);
        await as(u).patch(`/api/v1/farms/${farmId}/specifications`, { soilType: 'x' }).expect(404);
        await as(u).get(`/api/v1/farms/${farmId}/facilities`).expect(404);
        await as(u).post(`/api/v1/farms/${farmId}/facilities`, FACILITY).expect(404);
      }
    });

    it('401, PROFILE_INCOMPLETE and invalid ids', async () => {
      const { owner, farmId } = await setup();
      await http().get(`/api/v1/farms/${farmId}/specifications`).expect(401);
      const incomplete = await user(false);
      expect(json(await as(incomplete).get(`/api/v1/farms/${farmId}/specifications`).expect(403)).code).toBe(
        'PROFILE_INCOMPLETE',
      );
      for (const id of ['abc', '0', '-1', '1.5', '9223372036854775808']) {
        await as(owner).get(`/api/v1/farms/${id}/specifications`).expect(400);
        await as(owner).patch(`/api/v1/farms/${id}/specifications`, { soilType: 'x' }).expect(400);
        await as(owner).get(`/api/v1/farms/${id}/facilities`).expect(400);
      }
    });

    it('rolls everything back when a part of the update fails', async () => {
      const { owner, farmId } = await setup();
      const url = `/api/v1/farms/${farmId}/specifications`;
      await as(owner)
        .patch(url, { cropTypes: ['citrus'], soilType: 'Clay' })
        .expect(200);
      const original = db.farmCropType.create.bind(db.farmCropType);
      db.farmCropType.create = () => Promise.reject(new Error('crop insert failed'));
      await as(owner)
        .patch(url, { soilType: 'Changed', cropTypes: ['palms'], productionDetails: { notes: 'x' } })
        .expect(500);
      db.farmCropType.create = original;
      expect(farmRow(farmId)).toMatchObject({ soilType: 'Clay' });
      expect(farmRow(farmId).productionDetails ?? null).toBeNull();
      expect(db.farmCropType.rows.map((r) => r.cropType)).toEqual(['citrus']);
    });

    it('answers a concurrent modification with 409 instead of overwriting', async () => {
      const { owner, farmId } = await setup();
      const original = db.farm.updateMany.bind(db.farm);
      db.farm.updateMany = () => Promise.resolve({ count: 0 });
      await as(owner)
        .patch(`/api/v1/farms/${farmId}/specifications`, { soilType: 'Lost', cropTypes: ['palms'] })
        .expect(409);
      db.farm.updateMany = original;
      expect(farmRow(farmId).soilType).toBeNull();
      expect(db.farmCropType.rows).toHaveLength(0);
    });

    it('keeps the Phase 04A farm endpoints and contract intact', async () => {
      const { owner, farmId } = await setup();
      const res = json(await as(owner).get(`/api/v1/farms/${farmId}`).expect(200));
      expect(Object.keys(res).sort()).toEqual(
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
      await as(owner).patch(`/api/v1/farms/${farmId}`, { name: 'Renamed' }).expect(200);
    });
  });

  describe('facilities', () => {
    it('creates a draft facility owned by the caller and bound to the farm in the URL', async () => {
      const { owner, farmId } = await setup();
      const res = json(
        await as(owner)
          .post(`/api/v1/farms/${farmId}/facilities`, {
            ...FACILITY,
            description: 'Small cold room',
            governorate: 'Beheira',
            areaName: 'Natrun',
          })
          .expect(201),
      );
      expect(res).toMatchObject({
        farmId,
        facilityType: 'cold_storage_freezing',
        name: 'Cold Room A',
        status: 'draft',
        governorate: 'Beheira',
      });
      expect(Object.keys(res).sort()).toEqual([
        'areaName',
        'createdAt',
        'description',
        'facilityType',
        'farmId',
        'governorate',
        'id',
        'name',
        'status',
        'updatedAt',
      ]);
      expect(db.agriculturalFacility.rows[0]).toMatchObject({
        farmId: BigInt(farmId),
        ownerUserId: owner.id,
        status: 'draft',
      });
      expect(JSON.stringify(res)).not.toMatch(/owner|latitude|longitude|score|verified|published/i);
    });

    it('lists, reads and updates facilities with pagination', async () => {
      const { owner, farmId, roles } = await setup();
      for (let i = 1; i <= 3; i++)
        await as(owner)
          .post(`/api/v1/farms/${farmId}/facilities`, { ...FACILITY, name: `F${i}` })
          .expect(201);
      const list = json(await as(roles.tenant).get(`/api/v1/farms/${farmId}/facilities?pageSize=2`).expect(200));
      expect((list.items as Json[]).map((f) => f.name)).toEqual(['F3', 'F2']);
      expect(list).toMatchObject({ page: 1, pageSize: 2, total: 3 });
      expect(
        (
          json(await as(owner).get(`/api/v1/farms/${farmId}/facilities?pageSize=2&page=2`).expect(200)).items as Json[]
        ).map((f) => f.name),
      ).toEqual(['F1']);
      const id = (list.items as Json[])[0]?.id as string;
      expect(json(await as(roles.partner).get(`/api/v1/farms/${farmId}/facilities/${id}`).expect(200)).name).toBe('F3');
      const patched = json(
        await as(roles.manager)
          .patch(`/api/v1/farms/${farmId}/facilities/${id}`, {
            name: 'Renamed',
            description: null,
            facilityType: 'produce_storage',
          })
          .expect(200),
      );
      expect(patched).toMatchObject({ name: 'Renamed', facilityType: 'produce_storage', status: 'draft' });
    });

    it('only owner/manager can create or edit; read-only roles get 403, strangers 404', async () => {
      const { owner, farmId, roles, stranger } = await setup();
      const facility = json(await as(owner).post(`/api/v1/farms/${farmId}/facilities`, FACILITY).expect(201))
        .id as string;
      await as(roles.manager)
        .post(`/api/v1/farms/${farmId}/facilities`, { ...FACILITY, name: 'By manager' })
        .expect(201);
      for (const role of ['tenant', 'partner', 'agriculturalEngineer']) {
        await as(roles[role]).post(`/api/v1/farms/${farmId}/facilities`, FACILITY).expect(403);
        await as(roles[role]).patch(`/api/v1/farms/${farmId}/facilities/${facility}`, { name: 'Hacked' }).expect(403);
      }
      await as(stranger).get(`/api/v1/farms/${farmId}/facilities`).expect(404);
      await as(stranger).post(`/api/v1/farms/${farmId}/facilities`, FACILITY).expect(404);
      await as(stranger).patch(`/api/v1/farms/${farmId}/facilities/${facility}`, { name: 'Hacked' }).expect(404);
      expect(db.agriculturalFacility.rows).toHaveLength(2);
      expect(db.agriculturalFacility.rows.find((f) => f.id === BigInt(facility))?.name).toBe('Cold Room A');
    });

    it('prevents cross-farm facility access and modification (IDOR)', async () => {
      const a = await user();
      const b = await user();
      const farmA = await newFarm(a, 'A');
      const farmB = await newFarm(b, 'B');
      const farmA2 = await newFarm(a, 'A2'); // a owns two farms
      const facB = json(await as(b).post(`/api/v1/farms/${farmB}/facilities`, FACILITY).expect(201)).id as string;

      // a facility id of farm B, through farm A's route (a owns A) or through B's route (a has no role there)
      await as(a).get(`/api/v1/farms/${farmA}/facilities/${facB}`).expect(404);
      await as(a).patch(`/api/v1/farms/${farmA}/facilities/${facB}`, { name: 'Hacked' }).expect(404);
      await as(a).get(`/api/v1/farms/${farmB}/facilities/${facB}`).expect(404);
      await as(a).patch(`/api/v1/farms/${farmB}/facilities/${facB}`, { name: 'Hacked' }).expect(404);
      // even an owner of both farms cannot reach it through the wrong farm
      await as(a).get(`/api/v1/farms/${farmA2}/facilities/${facB}`).expect(404);
      expect(db.agriculturalFacility.rows[0]?.name).toBe('Cold Room A');
      expect(json(await as(a).get(`/api/v1/farms/${farmA}/facilities`).expect(200)).total).toBe(0);
    });

    it('rejects mass assignment and invalid data', async () => {
      const { owner, farmId } = await setup();
      const other = await user();
      const facility = json(await as(owner).post(`/api/v1/farms/${farmId}/facilities`, FACILITY).expect(201))
        .id as string;
      const attacks: Json[] = [
        { farmId: '999' },
        { ownerUserId: String(other.id) },
        { owner: String(other.id) },
        { status: 'published' },
        { latitude: 30.1 },
        { longitude: 31.2 },
        { capacityDetails: { tons: 5 } },
        { services: ['x'] },
        { deletedAt: '2020-01-01' },
        { id: '1' },
        { media: [] },
        { isVerified: true },
        { role: 'admin' },
      ];
      for (const a of attacks) {
        await as(owner)
          .post(`/api/v1/farms/${farmId}/facilities`, { ...FACILITY, ...a })
          .expect(400);
        await as(owner)
          .patch(`/api/v1/farms/${farmId}/facilities/${facility}`, { name: 'Ok name', ...a })
          .expect(400);
      }
      const bad: Json[] = [
        { facilityType: 'spaceport' },
        { name: '' },
        { name: 'x'.repeat(201) },
        { name: 5 },
        { description: 'd'.repeat(5001) },
        { governorate: 'g'.repeat(121) },
        { facilityType: undefined },
      ];
      for (const b of bad)
        await as(owner)
          .post(`/api/v1/farms/${farmId}/facilities`, { ...FACILITY, ...b })
          .expect(400);
      await as(owner).patch(`/api/v1/farms/${farmId}/facilities/${facility}`, {}).expect(400);
      await as(owner).patch(`/api/v1/farms/${farmId}/facilities/${facility}`, { name: null }).expect(400);
      expect(db.agriculturalFacility.rows).toHaveLength(1);
      expect(db.agriculturalFacility.rows[0]).toMatchObject({
        farmId: BigInt(farmId),
        ownerUserId: owner.id,
        status: 'draft',
        name: 'Cold Room A',
      });
    });

    it('hides deleted facilities, validates ids and offers no DELETE', async () => {
      const { owner, farmId } = await setup();
      const facility = json(await as(owner).post(`/api/v1/farms/${farmId}/facilities`, FACILITY).expect(201))
        .id as string;
      for (const id of ['abc', '0', '-1', '9223372036854775808']) {
        await as(owner).get(`/api/v1/farms/${farmId}/facilities/${id}`).expect(400);
      }
      await as(owner).get(`/api/v1/farms/${farmId}/facilities/99999`).expect(404);
      for (const q of ['page=0', 'pageSize=51', 'x=1'])
        await as(owner).get(`/api/v1/farms/${farmId}/facilities?${q}`).expect(400);
      const res = await (http() as unknown as Record<string, (p: string) => request.Test>)
        ['delete'](`/api/v1/farms/${farmId}/facilities/${facility}`)
        .set('Authorization', bearer(owner.token));
      expect([404, 405]).toContain(res.status);
      db.agriculturalFacility.rows[0].deletedAt = new Date();
      await as(owner).get(`/api/v1/farms/${farmId}/facilities/${facility}`).expect(404);
      await as(owner).patch(`/api/v1/farms/${farmId}/facilities/${facility}`, { name: 'Zombie' }).expect(404);
      expect(json(await as(owner).get(`/api/v1/farms/${farmId}/facilities`).expect(200)).total).toBe(0);
    });

    it('401 and PROFILE_INCOMPLETE; farm deleted hides facilities', async () => {
      const { owner, farmId } = await setup();
      await http().get(`/api/v1/farms/${farmId}/facilities`).expect(401);
      const incomplete = await user(false);
      await as(incomplete).post(`/api/v1/farms/${farmId}/facilities`, FACILITY).expect(403);
      farmRow(farmId).deletedAt = new Date();
      await as(owner).get(`/api/v1/farms/${farmId}/facilities`).expect(404);
    });
  });

  it('documents the new endpoints in OpenAPI', async () => {
    const doc = json(await http().get('/api/docs-json').expect(200));
    expect(Object.keys(doc.paths as Json)).toEqual(
      expect.arrayContaining([
        '/api/v1/farms/{id}/specifications',
        '/api/v1/farms/{id}/facilities',
        '/api/v1/farms/{id}/facilities/{facilityId}',
      ]),
    );
  });
});
