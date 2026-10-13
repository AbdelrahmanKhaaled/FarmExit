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
const SALE = {
  listingType: 'sale',
  askingPrice: 12_000_000,
  statedSalePricePerFeddan: 960_000,
  listingDescription: 'Oranges',
};

describe('Farm listing requests (e2e)', () => {
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
    jest.restoreAllMocks();
    await app.close();
  });

  let counter = 0;
  type U = { id: bigint; token: string };
  async function user(complete = true): Promise<U> {
    const mobile = `0101000${String(7000 + counter++)}`;
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
  const path = (farmId: string) => `/api/v1/farms/${farmId}/listing-requests`;

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

  it('creates a private draft sale request and a rent request without publishing', async () => {
    const { owner, farmId } = await setup();
    const sale = json(
      await as(owner)
        .post(path(farmId), { ...SALE, highlights: [' Water well '] })
        .expect(201),
    );
    expect(sale).toMatchObject({
      farmId,
      farmName: 'Wadi Orchard',
      areaFeddan: 12.5,
      listingType: 'sale',
      status: 'draft',
      visibility: 'private',
      askingPrice: 12_000_000,
      annualRentPerFeddan: null,
      statedSalePricePerFeddan: 960_000,
      currency: 'EGP',
      highlights: ['Water well'],
      listingDescription: 'Oranges',
    });
    expect(sale.slug).toMatch(/^sale-[0-9a-f]{32}$/);
    expect(String(sale.slug).startsWith('farm-')).toBe(false);
    expect(sale.requestNumber).toMatch(/^FL[0-9A-F]{24}$/);
    expect(sale.publishedAt).toBeUndefined();
    expect(JSON.stringify(sale)).not.toMatch(/privatePin|mobile|email|storageKey/);

    const rent = json(
      await as(owner).post(path(farmId), { listingType: 'rent', annualRentPerFeddan: 18_000 }).expect(201),
    );
    expect(rent).toMatchObject({
      listingType: 'rent',
      askingPrice: null,
      annualRentPerFeddan: 18_000,
      status: 'draft',
    });

    const row = db.request.rows.find((r) => r.id === BigInt(sale.id as string));
    expect(row).toMatchObject({ status: 'draft', visibility: 'private', createdBy: owner.id, farmId: BigInt(farmId) });
    expect(row?.submittedAt ?? null).toBeNull();
    expect(row?.publishedAt ?? null).toBeNull();
    expect(db.requestStatusHistory.rows.map((r) => r.toStatus)).toEqual(['draft', 'draft']);
    expect(db.farm.rows.find((f) => f.id === BigInt(farmId))?.farmStatus).toBe('active');
  });

  it('rejects the wrong price for the listing type, fractions, and a farm with no area', async () => {
    const { owner, farmId } = await setup();
    await as(owner).post(path(farmId), { listingType: 'sale', annualRentPerFeddan: 1000 }).expect(400);
    await as(owner).post(path(farmId), { listingType: 'rent', askingPrice: 1000 }).expect(400);
    await as(owner).post(path(farmId), { listingType: 'rent', statedSalePricePerFeddan: 1000 }).expect(400);
    await as(owner).post(path(farmId), { listingType: 'sale', askingPrice: 10.5 }).expect(400);
    await as(owner).post(path(farmId), { listingType: 'sale', askingPrice: 0 }).expect(400);
    await as(owner).post(path(farmId), { listingType: 'lease' }).expect(400);
    await as(owner)
      .post(path(farmId), { listingType: 'sale', highlights: ['a', 'b', 'c', 'd'] })
      .expect(400);
    db.farm.rows.find((f) => f.id === BigInt(farmId))!.areaFeddan = 0;
    await as(owner).post(path(farmId), SALE).expect(400);
    expect(db.request.rows).toHaveLength(0);
  });

  it.each([
    'status',
    'visibility',
    'farmId',
    'createdBy',
    'slug',
    'requestNumber',
    'currency',
    'publishedAt',
    'extraDetails',
    'privatePinLatitude',
    'saleMode',
  ])('rejects mass-assigned field %s', async (field) => {
    const { owner, farmId } = await setup();
    await as(owner)
      .post(path(farmId), { ...SALE, [field]: 'public' })
      .expect(400);
    expect(db.request.rows).toHaveLength(0);
  });

  it('lets only an active owner create; other roles are 403 and outsiders are 404', async () => {
    const { owner, farmId, roles } = await setup();
    await as(owner).post(path(farmId), SALE).expect(201);
    for (const role of ['manager', 'tenant', 'partner', 'agriculturalEngineer']) {
      await as(roles[role]).post(path(farmId), SALE).expect(403);
    }
    const other = await user();
    const otherFarm = await newFarm(other, 'Other');
    await as(other).post(path(farmId), SALE).expect(404);
    await as(owner).post(path(otherFarm), SALE).expect(404);
    const admin = await user();
    await db.staffMembership.create({ data: { userId: admin.id, staffRole: 'admin' } });
    await as(admin).post(path(farmId), SALE).expect(404);
    const lapsed = await user();
    await relate(lapsed.id, farmId, 'owner', { relationshipStatus: 'inactive' });
    await as(lapsed).post(path(farmId), SALE).expect(404);
    db.farm.rows.find((f) => f.id === BigInt(farmId))!.deletedAt = new Date();
    await as(owner).post(path(farmId), SALE).expect(404);
    expect(db.request.rows).toHaveLength(1);
  });

  it('lists and reads only the caller’s own requests', async () => {
    const { owner, farmId, roles } = await setup();
    const first = json(await as(owner).post(path(farmId), SALE).expect(201));
    await as(owner).post(path(farmId), { listingType: 'rent', annualRentPerFeddan: 9000 }).expect(201);
    const coOwner = await user();
    await relate(coOwner.id, farmId, 'owner');
    const theirs = json(await as(coOwner).post(path(farmId), { listingType: 'sale', askingPrice: 5000 }).expect(201));

    const page = json(await as(owner).get('/api/v1/listing-requests/mine?pageSize=1').expect(200));
    expect(page).toMatchObject({ page: 1, pageSize: 1, total: 2 });
    expect(page.items as Json[]).toHaveLength(1);
    const ids = (json(await as(owner).get('/api/v1/listing-requests/mine').expect(200)).items as Json[]).map(
      (item) => item.id,
    );
    expect(ids).not.toContain(theirs.id);
    expect(
      json(
        await as(owner)
          .get(`/api/v1/listing-requests/${first.id as string}`)
          .expect(200),
      ).id,
    ).toBe(first.id);

    await as(coOwner)
      .get(`/api/v1/listing-requests/${first.id as string}`)
      .expect(404);
    await as(roles.manager)
      .get(`/api/v1/listing-requests/${first.id as string}`)
      .expect(404);
    await as(roles.manager).get('/api/v1/listing-requests/mine').expect(200);
    expect(json(await as(roles.manager).get('/api/v1/listing-requests/mine').expect(200)).total).toBe(0);
    await as(owner).get('/api/v1/listing-requests/mine?pageSize=500').expect(400);
  });

  it('updates a draft and refuses changes once it is no longer a draft', async () => {
    const { owner, farmId } = await setup();
    const created = json(await as(owner).post(path(farmId), SALE).expect(201));
    const id = created.id as string;
    const updated = json(
      await as(owner)
        .patch(`/api/v1/listing-requests/${id}`, {
          listingType: 'rent',
          annualRentPerFeddan: 15_000,
          availability: 'next season',
        })
        .expect(200),
    );
    expect(updated).toMatchObject({
      listingType: 'rent',
      askingPrice: null,
      statedSalePricePerFeddan: null,
      annualRentPerFeddan: 15_000,
      availability: 'next season',
      status: 'draft',
      visibility: 'private',
    });
    await as(owner).patch(`/api/v1/listing-requests/${id}`, {}).expect(400);
    await as(owner).patch(`/api/v1/listing-requests/${id}`, { status: 'published' }).expect(400);

    db.request.rows.find((r) => r.id === BigInt(id))!.status = 'underFarmExitReview';
    await as(owner).patch(`/api/v1/listing-requests/${id}`, { annualRentPerFeddan: 1 }).expect(409);
    expect(db.farmListingDetail.rows.find((r) => r.requestId === BigInt(id))?.annualRentPerFeddan?.toString()).toBe(
      '15000',
    );
  });

  it('submits a draft for review once, including a listing with no stated price', async () => {
    const { owner, farmId, roles } = await setup();
    const unstated = json(await as(owner).post(path(farmId), { listingType: 'sale' }).expect(201));
    const submitted = json(
      await as(owner)
        .post(`/api/v1/listing-requests/${unstated.id as string}/submit`)
        .expect(200),
    );
    expect(submitted).toMatchObject({ status: 'underFarmExitReview', visibility: 'private', askingPrice: null });
    expect(submitted).not.toHaveProperty('publishedAt');
    const row = db.request.rows.find((r) => r.id === BigInt(unstated.id as string));
    expect(row).toMatchObject({ status: 'underFarmExitReview', visibility: 'private', publishedAt: null });
    expect(row?.submittedAt).toBeInstanceOf(Date);
    expect(db.requestStatusHistory.rows.filter((r) => r.requestId === row?.id).map((r) => r.toStatus)).toEqual([
      'draft',
      'underFarmExitReview',
    ]);

    await as(owner)
      .post(`/api/v1/listing-requests/${unstated.id as string}/submit`)
      .expect(409);
    await as(owner)
      .patch(`/api/v1/listing-requests/${unstated.id as string}`, { askingPrice: 1 })
      .expect(409);
    await as(roles.manager)
      .post(`/api/v1/listing-requests/${unstated.id as string}/submit`)
      .expect(404);
    await as(owner)
      .post(`/api/v1/listing-requests/${unstated.id as string}/submit`, { status: 'published' })
      .expect(400);

    const priced = json(await as(owner).post(path(farmId), SALE).expect(201)).id as string;
    jest.spyOn(db.requestStatusHistory, 'create').mockRejectedValueOnce(new Error('history failed'));
    const res = await as(owner).post(`/api/v1/listing-requests/${priced}/submit`).expect(500);
    expect(JSON.stringify(res.body)).not.toContain('history failed');
    expect(db.request.rows.find((r) => r.id === BigInt(priced))).toMatchObject({ status: 'draft', submittedAt: null });
  });

  it('rolls the request back when the listing detail insert fails', async () => {
    const { owner, farmId } = await setup();
    jest.spyOn(db.farmListingDetail, 'create').mockRejectedValueOnce(new Error('detail failed'));
    const res = await as(owner).post(path(farmId), SALE).expect(500);
    expect(JSON.stringify(res.body)).not.toContain('detail failed');
    expect(db.request.rows).toHaveLength(0);
    expect(db.farmListingDetail.rows).toHaveLength(0);
    expect(db.requestStatusHistory.rows).toHaveLength(0);
  });

  it('requires authentication and a completed profile, and has no public route', async () => {
    const { owner, farmId } = await setup();
    const id = json(await as(owner).post(path(farmId), SALE).expect(201)).id as string;
    await http().post(path(farmId)).send(SALE).expect(401);
    await http().get('/api/v1/listing-requests/mine').expect(401);
    await http().get(`/api/v1/listing-requests/${id}`).expect(401);
    const incomplete = await user(false);
    const res = await as(incomplete).post(path(farmId), SALE);
    expect(res.status).toBe(403);
    expect(json(res).code).toBe('PROFILE_INCOMPLETE');
    await as(owner).get('/api/v1/listing-requests/abc').expect(400);
    await as(owner).post('/api/v1/farms/nope/listing-requests', SALE).expect(400);
  });

  it('documents the endpoints in Swagger', async () => {
    const { SwaggerModule, DocumentBuilder } = await import('@nestjs/swagger');
    const doc = SwaggerModule.createDocument(app, new DocumentBuilder().setTitle('t').build());
    expect(Object.keys(doc.paths)).toEqual(
      expect.arrayContaining([
        '/api/v1/farms/{id}/listing-requests',
        '/api/v1/listing-requests/mine',
        '/api/v1/listing-requests/{id}',
        '/api/v1/listing-requests/{id}/submit',
      ]),
    );
  });
});
