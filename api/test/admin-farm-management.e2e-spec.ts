import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/common/app-setup';
import { provisionSuperAdmin } from '../src/dev/super-admin-bootstrap';
import { PrismaService } from '../src/prisma/prisma.service';
import { createFakePrisma, type FakePrisma } from './support/fake-prisma';

/** Entirely in memory. No real users, database seeds or customer records. */
describe('Super Admin farm management', () => {
  let app: INestApplication<App>;
  let db: FakePrisma;
  let token: string;
  let ownerId: string;
  beforeEach(async () => {
    db = createFakePrisma();
    Object.assign(db, { siteVisit: { count: () => Promise.resolve(0) } });
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(db)
      .compile();
    app = module.createNestApplication();
    configureApp(app);
    await app.init();
    const boot = await provisionSuperAdmin(db, { email: 'batch-super@farmexit.test', mobile: '01088887777' });
    const login = await request(app.getHttpServer())
      .post('/api/v1/admin-auth/login')
      .send({ email: 'batch-super@farmexit.test', password: boot.generatedPassword })
      .expect(200);
    token = (login.body as { accessToken: string }).accessToken;
    const owner = await db.user.create({
      data: {
        fullName: 'Isolated farm owner',
        mobileE164: '+201055500111',
        accountStatus: 'active',
        mobileVerifiedAt: new Date(),
      },
    });
    ownerId = owner.id.toString();
  });
  afterEach(async () => {
    await app.close();
  });
  const farm = () => ({
    name: 'Isolated Batch Farm',
    farmType: 'fruit',
    areaFeddan: 12.5,
    governorate: 'Beheira',
    ownerUserId: ownerId,
  });
  const http = () => request(app.getHttpServer());
  const auth = () => ({ Authorization: `Bearer ${token}` });
  it('creates for the declared owner, updates without replacing relationships, and safely archives', async () => {
    const created = await http().post('/api/v1/staff/admin/farms').set(auth()).send(farm()).expect(201);
    const id = (created.body as { id: string }).id;
    expect(db.farmRelationship.rows.filter((r) => r.farmId === BigInt(id))).toEqual([
      expect.objectContaining({ userId: BigInt(ownerId), relationshipRole: 'owner' }),
    ]);
    await http()
      .patch(`/api/v1/staff/admin/farms/${id}`)
      .set(auth())
      .send({ name: 'Updated test farm', soilType: 'Clay' })
      .expect(200);
    const editable = await http().get(`/api/v1/staff/admin/farms/${id}/edit`).set(auth()).expect(200);
    expect(editable.body).toMatchObject({ name: 'Updated test farm', soilType: 'Clay' });
    expect(db.farmRelationship.rows.filter((r) => r.farmId === BigInt(id))).toHaveLength(1);
    await http().post(`/api/v1/staff/admin/farms/${id}/archive`).set(auth()).send({ confirmed: true }).expect(200);
    expect(db.farm.rows.find((r) => r.id === BigInt(id))?.deletedAt).toBeInstanceOf(Date);
    expect(db.farmRelationship.rows.filter((r) => r.farmId === BigInt(id))).toHaveLength(1);
    expect(db.auditLog.rows.map((r) => r.action)).toEqual(
      expect.arrayContaining(['created_by_staff', 'updated_by_staff', 'archived']),
    );
    await http().get(`/api/v1/staff/admin/farms/${id}/edit`).set(auth()).expect(404);
  });
  it('rejects invalid owners and mass assignment, and blocks archive when workflows exist', async () => {
    await http()
      .post('/api/v1/staff/admin/farms')
      .set(auth())
      .send({ ...farm(), ownerUserId: 'FL123' })
      .expect(400);
    await http()
      .post('/api/v1/staff/admin/farms')
      .set(auth())
      .send({ ...farm(), ownerUserId: '99999' })
      .expect(400);
    await http()
      .post('/api/v1/staff/admin/farms')
      .set(auth())
      .send({ ...farm(), privatePinLatitude: 12 })
      .expect(400);
    const created = await http().post('/api/v1/staff/admin/farms').set(auth()).send(farm()).expect(201);
    const id = (created.body as { id: string }).id;
    await db.request.create({
      data: { farmId: BigInt(id), createdBy: BigInt(ownerId), requestType: 'farmListing', status: 'draft' },
    });
    await http().post(`/api/v1/staff/admin/farms/${id}/archive`).set(auth()).send({ confirmed: true }).expect(409);
    expect(db.farm.rows.find((r) => r.id === BigInt(id))?.deletedAt).toBeNull();
    expect(db.request.rows).toHaveLength(1);
  });
  it('requires dashboard authentication and active Super Admin membership', async () => {
    await http().post('/api/v1/staff/admin/farms').send(farm()).expect(401);
    const membership = db.staffMembership.rows.find((r) => r.staffRole === 'superAdmin');
    membership!.staffRole = 'reviewer';
    await http().post('/api/v1/staff/admin/farms').set(auth()).send(farm()).expect(403);
    await http().patch('/api/v1/staff/admin/farms/1').set(auth()).send({ name: 'Forbidden' }).expect(403);
  });
  it('publishes a separately approved listing into the marketplace without duplicating its farm', async () => {
    const created = await http().post('/api/v1/staff/admin/farms').set(auth()).send(farm()).expect(201);
    const farmId = (created.body as { id: string }).id;
    const listing = await db.request.create({
      data: {
        farmId: BigInt(farmId),
        createdBy: BigInt(ownerId),
        requestType: 'farmListing',
        status: 'approved',
        visibility: 'private',
      },
    });
    await db.farmListingDetail.create({
      data: {
        requestId: listing.id,
        listingType: 'sale',
        askingPrice: 1200000,
        currency: 'EGP',
        slug: 'isolated-batch-publication',
      },
    });
    await http()
      .post(`/api/v1/staff/listing-requests/${listing.id.toString()}/publish`)
      .set(auth())
      .send({})
      .expect(200);
    expect(db.request.rows.find((r) => r.id === listing.id)).toMatchObject({
      status: 'published',
      visibility: 'public',
      publishedAt: expect.any(Date),
    });
    const market = await http().get('/api/v1/marketplace/farms').expect(200);
    expect(JSON.stringify(market.body)).toContain('isolated-batch-publication');
    const registry = await http().get('/api/v1/staff/admin/farms').set(auth()).expect(200);
    expect(JSON.stringify(registry.body)).toContain('publishedListings');
    expect(
      (registry.body as { items: { id: string; publishedListings: unknown[] }[] }).items.find((f) => f.id === farmId)
        ?.publishedListings,
    ).toHaveLength(1);
    expect(db.farm.rows).toHaveLength(1);
    await http().post(`/api/v1/staff/admin/farms/${farmId}/archive`).set(auth()).send({ confirmed: true }).expect(409);
  });
});
