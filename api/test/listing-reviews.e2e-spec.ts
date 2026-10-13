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
const FARM = { name: 'Review Orchard', farmType: 'fruit', areaFeddan: 12.5, governorate: 'Beheira' };
const SALE = { listingType: 'sale', askingPrice: 12_000_000, listingDescription: 'Oranges' };
const INBOX = '/api/v1/staff/listing-requests';

describe('Listing review decisions (e2e)', () => {
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
    const mobile = `0101000${String(9000 + counter++)}`;
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
    row!.email = `${counter}@staff.test`;
    return { id: row?.id as bigint, token };
  }
  const as = (u: U) => ({
    get: (path: string) => http().get(path).set('Authorization', bearer(u.token)),
    post: (path: string, body: object = {}) => http().post(path).set('Authorization', bearer(u.token)).send(body),
    put: (path: string, body: object = {}) => http().put(path).set('Authorization', bearer(u.token)).send(body),
    patch: (path: string, body: object = {}) => http().patch(path).set('Authorization', bearer(u.token)).send(body),
  });
  const staff = async (role: string): Promise<U> => {
    const person = await user();
    await db.staffMembership.create({ data: { userId: person.id, staffRole: role } });
    return person;
  };
  const decision = (actor: U, id: string, body: object) => as(actor).post(`${INBOX}/${id}/decision`, body);

  async function submitted() {
    const owner = await user();
    const farmId = json(await as(owner).post('/api/v1/farms', FARM).expect(201)).id as string;
    db.farm.rows.find((row) => row.id === BigInt(farmId))!.privatePinLatitude = 30.1;
    const created = json(await as(owner).post(`/api/v1/farms/${farmId}/listing-requests`, SALE).expect(201));
    const id = created.id as string;
    await as(owner).post(`/api/v1/listing-requests/${id}/submit`).expect(200);
    return { owner, id };
  }

  it('lets an assigned reviewer request changes and the owner resubmit without publishing', async () => {
    const { owner, id } = await submitted();
    const admin = await staff('admin');
    const reviewer = await staff('reviewer');
    const agent = await staff('caseAgent');
    const other = await staff('reviewer');
    await as(admin)
      .put(`${INBOX}/${id}/assignments`, { assignmentType: 'reviewer', assignedStaffId: reviewer.id.toString() })
      .expect(200);
    await as(admin)
      .put(`${INBOX}/${id}/assignments`, { assignmentType: 'caseAgent', assignedStaffId: agent.id.toString() })
      .expect(200);

    await decision(agent, id, { decision: 'rejected', comment: 'No' }).expect(403);
    await decision(other, id, { decision: 'rejected', comment: 'No' }).expect(404);
    await decision(reviewer, id, { decision: 'rejected' }).expect(400);
    await decision(reviewer, id, { decision: 'changesRequested', comment: '   ' }).expect(400);
    await decision(reviewer, id, { decision: 'approved', comment: 'Fine', status: 'published' }).expect(400);

    const asked = json(await decision(reviewer, id, { decision: 'changesRequested', comment: ' Add the well depth ' }).expect(200));
    expect(asked).toMatchObject({
      status: 'changesRequested',
      visibility: 'private',
      reviews: [{ decision: 'changesRequested', comment: 'Add the well depth', reviewerId: reviewer.id.toString() }],
    });
    expect(asked.publishedAt).toBeUndefined();
    expect(JSON.stringify(asked)).not.toMatch(/privatePin|mobileE164|@staff\.test|storageKey/);
    expect(db.request.rows.find((row) => row.id === BigInt(id))).toMatchObject({
      status: 'changesRequested',
      visibility: 'private',
      publishedAt: null,
    });
    expect(json(await as(admin).get(INBOX).expect(200)).total).toBe(0);

    const ownerView = json(await as(owner).get(`/api/v1/listing-requests/${id}`).expect(200));
    expect(ownerView.reviews).toEqual([
      expect.objectContaining({ decision: 'changesRequested', comment: 'Add the well depth' }),
    ]);
    expect(JSON.stringify(ownerView.reviews)).not.toMatch(/reviewerId|@staff\.test/);
    const edited = json(await as(owner).patch(`/api/v1/listing-requests/${id}`, { listingDescription: 'Oranges and a well' }).expect(200));
    expect(edited).toMatchObject({ status: 'changesRequested', listingDescription: 'Oranges and a well' });

    const again = json(await as(owner).post(`/api/v1/listing-requests/${id}/submit`).expect(200));
    expect(again).toMatchObject({ status: 'underFarmExitReview', visibility: 'private' });
    expect(again.reviews).toHaveLength(1);
    expect(again.publishedAt).toBeUndefined();
    await as(owner).post(`/api/v1/listing-requests/${id}/submit`).expect(409);
    expect(json(await as(reviewer).get(INBOX).expect(200)).total).toBe(1);

    const approved = json(await decision(admin, id, { decision: 'approved' }).expect(200));
    expect(approved).toMatchObject({ status: 'approved', visibility: 'private' });
    expect(approved.reviews).toHaveLength(2);
    expect(approved.reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ decision: 'changesRequested', comment: 'Add the well depth' }),
        expect.objectContaining({ decision: 'approved', comment: null, reviewerId: admin.id.toString() }),
      ]),
    );
    await as(owner).patch(`/api/v1/listing-requests/${id}`, { askingPrice: 1 }).expect(409);
    await as(owner).post(`/api/v1/listing-requests/${id}/submit`).expect(409);
    await decision(reviewer, id, { decision: 'rejected', comment: 'Too late' }).expect(409);
    expect(db.request.rows.find((row) => row.id === BigInt(id))?.publishedAt ?? null).toBeNull();
    expect(db.requestReview.rows).toHaveLength(2);
    expect(db.requestStatusHistory.rows.filter((row) => row.requestId === BigInt(id)).map((row) => row.toStatus)).toEqual([
      'draft',
      'underFarmExitReview',
      'changesRequested',
      'underFarmExitReview',
      'approved',
    ]);
    expect(db.requestStatusHistory.rows.find((row) => row.toStatus === 'changesRequested')?.reason).toBe('Add the well depth');
  });

  it('rolls back a decision when the review row cannot be stored, and blocks closed listings', async () => {
    const { owner, id } = await submitted();
    const admin = await staff('admin');
    db.requestReview.create = () => Promise.reject(new Error('review failed'));
    await decision(admin, id, { decision: 'rejected', comment: 'Boundary is unclear' }).expect(500);
    expect(db.request.rows.find((row) => row.id === BigInt(id))?.status).toBe('underFarmExitReview');
    expect(db.requestReview.rows).toHaveLength(0);
    expect(db.requestStatusHistory.rows.filter((row) => row.toStatus === 'rejected')).toHaveLength(0);

    db.request.rows.find((row) => row.id === BigInt(id))!.status = 'published';
    await as(owner).patch(`/api/v1/listing-requests/${id}`, { askingPrice: 2 }).expect(409);
    await as(owner).post(`/api/v1/listing-requests/${id}/submit`).expect(409);
    await decision(admin, id, { decision: 'approved' }).expect(409);
  });
});
