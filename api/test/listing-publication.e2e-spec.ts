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
const FARM = { name: 'Publish Orchard', farmType: 'fruit', areaFeddan: 12.5, governorate: 'Beheira', areaName: 'Wadi El Natrun' };
const INBOX = '/api/v1/staff/listing-requests';
const QUEUE = `${INBOX}/publication-queue`;

describe('Listing publication (e2e)', () => {
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
  async function user(): Promise<U> {
    const mobile = `0101000${String(6000 + counter++)}`;
    const e164 = `+20${mobile.slice(1)}`;
    await http().post('/api/v1/auth/otp/request').send({ mobile }).expect(200);
    const code = sms.lastCodeFor(e164) as string;
    const session = json(await http().post('/api/v1/auth/otp/verify').send({ mobile, code }).expect(200));
    const token = session.accessToken as string;
    await http()
      .post('/api/v1/auth/profile/complete')
      .set('Authorization', bearer(token))
      .send({ fullName: 'Test Person' })
      .expect(200);
    const row = db.user.rows.find((item) => item.mobileE164 === e164);
    row!.email = `${counter}@owner.test`;
    return { id: row?.id as bigint, token };
  }
  const as = (u: U) => ({
    get: (path: string) => http().get(path).set('Authorization', bearer(u.token)),
    post: (path: string, body: object = {}) => http().post(path).set('Authorization', bearer(u.token)).send(body),
    patch: (path: string, body: object = {}) => http().patch(path).set('Authorization', bearer(u.token)).send(body),
  });
  const staff = async (role: string): Promise<U> => {
    const person = await user();
    await db.staffMembership.create({ data: { userId: person.id, staffRole: role } });
    return person;
  };

  async function approved(owner: U, admin: U, farmId: string, body: object): Promise<string> {
    const created = json(await as(owner).post(`/api/v1/farms/${farmId}/listing-requests`, body).expect(201));
    const id = created.id as string;
    await as(owner).post(`/api/v1/listing-requests/${id}/submit`).expect(200);
    await as(admin).post(`${INBOX}/${id}/decision`, { decision: 'approved' }).expect(200);
    return id;
  }

  it('publishes an approved sale and rent, and refuses the wrong state or a missing price', async () => {
    const owner = await user();
    const admin = await staff('admin');
    const reviewer = await staff('reviewer');
    const agent = await staff('caseAgent');
    const farmId = json(await as(owner).post('/api/v1/farms', FARM).expect(201)).id as string;
    const farm = db.farm.rows.find((row) => row.id === BigInt(farmId));
    farm!.privatePinLatitude = 30.0444;
    farm!.publicMapLatitude = 30.05;
    await db.farmMedia.create({
      data: {
        farmId: BigInt(farmId),
        uploadedBy: owner.id,
        mediaType: 'photo',
        storageKey: `farms/${farmId}/media/secret.jpg`,
      },
    });

    const draft = json(
      await as(owner).post(`/api/v1/farms/${farmId}/listing-requests`, { listingType: 'sale', askingPrice: 1000 }).expect(201),
    );
    await as(admin).post(`${INBOX}/${draft.id as string}/publish`).expect(409);
    await as(owner).post(`/api/v1/listing-requests/${draft.id as string}/submit`).expect(200);
    await as(admin).post(`${INBOX}/${draft.id as string}/publish`).expect(409);

    const unpriced = await approved(owner, admin, farmId, { listingType: 'sale' });
    await as(admin).post(`${INBOX}/${unpriced}/publish`).expect(400);
    expect(db.request.rows.find((row) => row.id === BigInt(unpriced))).toMatchObject({
      status: 'approved',
      visibility: 'private',
      publishedAt: null,
    });

    const sale = await approved(owner, admin, farmId, { listingType: 'sale', askingPrice: 1000 });
    const rent = await approved(owner, admin, farmId, { listingType: 'rent', annualRentPerFeddan: 500 });
    const queue = json(await as(admin).get(QUEUE).expect(200));
    expect(queue.total).toBe(3);
    expect(JSON.stringify(queue)).not.toMatch(/privatePin|publicMap|mobile|@owner\.test|storageKey|secret\.jpg/);
    expect(JSON.stringify(queue)).toContain('Beheira');
    expect(JSON.stringify(queue)).toContain('Wadi El Natrun');

    await as(reviewer).post(`${INBOX}/${sale}/publish`).expect(403);
    await as(agent).post(`${INBOX}/${sale}/publish`).expect(403);
    await as(reviewer).get(QUEUE).expect(403);
    await as(admin).post(`${INBOX}/${sale}/publish`, { status: 'published' }).expect(400);

    const published = json(await as(admin).post(`${INBOX}/${sale}/publish`).expect(200));
    expect(published).toMatchObject({
      id: sale,
      status: 'published',
      visibility: 'public',
      askingPrice: 1000,
      governorate: 'Beheira',
      areaName: 'Wadi El Natrun',
      currency: 'EGP',
    });
    expect(published.publishedAt).toEqual(expect.any(String));
    expect(JSON.stringify(published)).not.toMatch(/privatePin|publicMap|@owner\.test|storageKey/);
    expect(db.farmMedia.rows[0]).toMatchObject({ licenceStatus: 'pending_confirmation' });
    expect(db.request.rows.find((row) => row.id === BigInt(sale))).toMatchObject({
      status: 'published',
      visibility: 'public',
    });
    expect(db.requestStatusHistory.rows.find((row) => row.requestId === BigInt(sale) && row.toStatus === 'published')).toMatchObject({
      fromStatus: 'approved',
      changedBy: admin.id,
    });
    expect(db.auditLog.rows.find((row) => row.action === 'published')).toMatchObject({
      actorUserId: admin.id,
      entityType: 'request',
      entityId: BigInt(sale),
      changes: { fromStatus: 'approved', toStatus: 'published', visibility: 'public', listingType: 'sale' },
    });
    await as(admin).post(`${INBOX}/${sale}/publish`).expect(409);
    await as(owner).patch(`/api/v1/listing-requests/${sale}`, { askingPrice: 2 }).expect(409);

    const rented = json(await as(admin).post(`${INBOX}/${rent}/publish`).expect(200));
    expect(rented).toMatchObject({ listingType: 'rent', status: 'published', annualRentPerFeddan: 500 });
    expect(db.request.rows.filter((row) => row.status === 'published')).toHaveLength(2);

    const rejected = await approved(owner, admin, farmId, { listingType: 'sale', askingPrice: 2000 });
    db.request.rows.find((row) => row.id === BigInt(rejected))!.status = 'rejected';
    await as(admin).post(`${INBOX}/${rejected}/publish`).expect(409);

    const held = await approved(owner, admin, farmId, { listingType: 'sale', askingPrice: 3000 });
    await db.farmRelationship.updateMany({
      where: { farmId: BigInt(farmId), relationshipRole: 'owner' },
      data: { relationshipStatus: 'inactive' },
    });
    await as(admin).post(`${INBOX}/${held}/publish`).expect(400);
    expect(db.request.rows.find((row) => row.id === BigInt(held))).toMatchObject({
      status: 'approved',
      visibility: 'private',
      publishedAt: null,
    });
    await as(admin).get(`${QUEUE}?page=0`).expect(400);
  });

  it('rolls publication back when the audit row cannot be stored', async () => {
    const owner = await user();
    const admin = await staff('admin');
    const farmId = json(await as(owner).post('/api/v1/farms', FARM).expect(201)).id as string;
    const id = await approved(owner, admin, farmId, { listingType: 'sale', askingPrice: 2500 });
    db.auditLog.create = () => Promise.reject(new Error('audit failed'));
    await as(admin).post(`${INBOX}/${id}/publish`).expect(500);
    expect(db.request.rows.find((row) => row.id === BigInt(id))).toMatchObject({
      status: 'approved',
      visibility: 'private',
      publishedAt: null,
    });
    expect(db.requestStatusHistory.rows.some((row) => row.toStatus === 'published')).toBe(false);
    expect(db.auditLog.rows.some((row) => row.action === 'published')).toBe(false);
  });

  it('does not publish a soft-deleted farm, a revoked admin, or a client-supplied status', async () => {
    const owner = await user();
    const admin = await staff('admin');
    const farmId = json(await as(owner).post('/api/v1/farms', FARM).expect(201)).id as string;
    const id = await approved(owner, admin, farmId, { listingType: 'sale', askingPrice: 4000 });
    await db.farmMedia.create({
      data: {
        farmId: BigInt(farmId),
        uploadedBy: owner.id,
        mediaType: 'photo',
        storageKey: `farms/${farmId}/media/private.jpg`,
      },
    });
    const mediaId = db.farmMedia.rows[0]?.id?.toString();

    db.farm.rows.find((row) => row.id === BigInt(farmId))!.deletedAt = new Date();
    await as(admin).post(`${INBOX}/${id}/publish`).expect(400);
    expect(json(await as(admin).get(QUEUE).expect(200)).total).toBe(0);
    expect(db.request.rows.find((row) => row.id === BigInt(id))).toMatchObject({
      status: 'approved',
      visibility: 'private',
      publishedAt: null,
    });

    db.farm.rows.find((row) => row.id === BigInt(farmId))!.deletedAt = null;
    await db.staffMembership.updateMany({ where: { userId: admin.id }, data: { status: 'inactive' } });
    await as(admin).post(`${INBOX}/${id}/publish`).expect(403);
    await db.staffMembership.updateMany({ where: { userId: admin.id }, data: { status: 'active' } });

    await as(owner).patch(`/api/v1/listing-requests/${id}`, { status: 'published', visibility: 'public' }).expect(400);
    await as(admin).post(`${INBOX}/${id}/decision`, { decision: 'published' }).expect(400);
    expect(db.request.rows.find((row) => row.id === BigInt(id))?.status).toBe('approved');

    const published = json(await as(admin).post(`${INBOX}/${id}/publish`).expect(200));
    expect(published).not.toHaveProperty('images');
    expect(JSON.stringify(published)).not.toMatch(/storageKey|licenceStatus|private\.jpg/);
    expect(db.farmMedia.rows[0]?.licenceStatus).toBe('pending_confirmation');
    await http().get(`/api/v1/farms/${farmId}/media/${mediaId}/file`).expect(401);
  });
});
