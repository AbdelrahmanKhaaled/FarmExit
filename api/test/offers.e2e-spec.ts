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
type U = { id: bigint; token: string };
const json = (res: { body: unknown }): Json => res.body as Json;
const INBOX = '/api/v1/staff/listing-requests';
const LIST = '/api/v1/marketplace/farms';

describe('Sale terms, proposals and co-purchase (e2e)', () => {
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
  async function user(): Promise<U> {
    const mobile = `0101000${String(8000 + counter++)}`;
    const e164 = `+20${mobile.slice(1)}`;
    await http().post('/api/v1/auth/otp/request').send({ mobile }).expect(200);
    const code = sms.lastCodeFor(e164) as string;
    const session = json(await http().post('/api/v1/auth/otp/verify').send({ mobile, code }).expect(200));
    const token = session.accessToken as string;
    await http().post('/api/v1/auth/profile/complete').set('Authorization', bearer(token)).send({ fullName: 'Test Person' }).expect(200);
    const row = db.user.rows.find((item) => item.mobileE164 === e164);
    row!.email = `${counter}@buyer.test`;
    return { id: row?.id as bigint, token };
  }
  const as = (u: U) => ({
    get: (path: string) => http().get(path).set('Authorization', bearer(u.token)),
    post: (path: string, body: object = {}) => http().post(path).set('Authorization', bearer(u.token)).send(body),
    put: (path: string, body: object = {}) => http().put(path).set('Authorization', bearer(u.token)).send(body),
    patch: (path: string, body: object = {}) => http().patch(path).set('Authorization', bearer(u.token)).send(body),
  });
  async function staff(role: 'admin' | 'caseAgent' | 'reviewer' = 'admin'): Promise<U> {
    const person = await user();
    await db.staffMembership.create({ data: { userId: person.id, staffRole: role } });
    return person;
  }
  async function farm(owner: U): Promise<string> {
    return json(
      await as(owner)
        .post('/api/v1/farms', { name: 'Offer Farm', farmType: 'fruit', areaFeddan: 12.5, governorate: 'Beheira', areaName: 'Delengat' })
        .expect(201),
    ).id as string;
  }
  async function draft(owner: U, farmId: string, body: object): Promise<Json> {
    return json(await as(owner).post(`/api/v1/farms/${farmId}/listing-requests`, body).expect(201));
  }
  async function publish(owner: U, admin: U, created: Json): Promise<Json> {
    await as(owner).post(`/api/v1/listing-requests/${created.id as string}/submit`).expect(200);
    await as(admin).post(`${INBOX}/${created.id as string}/decision`, { decision: 'approved' }).expect(200);
    return json(await as(admin).post(`${INBOX}/${created.id as string}/publish`).expect(200));
  }

  const quick = {
    saleMode: 'quick_sale',
    exchangePreferenceScope: 'selected',
    exchangeAssetTypes: ['car', 'villa'],
  };
  const mixed = {
    proposalKind: 'mixed',
    proposedTotalValue: 10_000_000,
    components: [
      { componentType: 'cash', proposedValue: 5_000_000 },
      { componentType: 'exchange_asset', proposedValue: 5_000_000, assetType: 'car', assetDescription: 'Buyer-stated car' },
    ],
  };

  it('stores standard and quick sale terms only while the sale listing is editable', async () => {
    const owner = await user();
    const admin = await staff();
    const other = await user();
    const farmId = await farm(owner);
    const sale = await draft(owner, farmId, { listingType: 'sale', askingPrice: 10_000_000 });
    const rent = await draft(owner, farmId, { listingType: 'rent', annualRentPerFeddan: 500 });
    const terms = `/api/v1/listing-requests/${sale.id as string}/sale-terms`;

    await as(owner).get(terms).expect(404);
    await as(owner).put(terms, { saleMode: 'standard_cash', acceptsInstallmentProposals: true }).expect(400);
    await as(owner).put(terms, { saleMode: 'quickSale', exchangePreferenceScope: 'selected', exchangeAssetTypes: ['car', 'car'] }).expect(400);
    await as(owner).put(`/api/v1/listing-requests/${rent.id as string}/sale-terms`, { saleMode: 'standardCash' }).expect(409);
    await as(other).put(terms, { saleMode: 'standardCash' }).expect(404);

    const saved = json(await as(owner).put(terms, quick).expect(200));
    expect(saved).toMatchObject({
      saleMode: 'quickSale',
      acceptsCashProposals: true,
      acceptsInstallmentProposals: true,
      acceptsExchangeProposals: true,
      exchangePreferenceScope: 'selected',
      exchangeAssetTypes: ['car', 'villa'],
      configured: true,
    });

    await as(owner).post(`/api/v1/listing-requests/${sale.id as string}/submit`).expect(200);
    await as(admin).post(`${INBOX}/${sale.id as string}/decision`, { decision: 'changesRequested', comment: 'Add a note' }).expect(200);
    await as(owner).put(terms, { saleMode: 'standardCash' }).expect(200);
    await as(owner).put(terms, quick).expect(200);
    const live = await publish(owner, admin, sale);
    await as(owner).put(terms, { saleMode: 'standardCash' }).expect(409);

    const buyer = await user();
    const visible = json(await as(buyer).get(`${LIST}/${live.slug as string}/sale-terms`).expect(200));
    expect(visible.saleMode).toBe('quickSale');
    expect(JSON.stringify(json(await http().get(LIST).expect(200)))).not.toMatch(/saleMode|acceptsInstallment|exchangeAsset|proposalNotes|mobile|farmId/);
    await http().get(`${LIST}/${live.slug as string}/sale-terms`).expect(401);
  });

  it('accepts cash and mixed proposals and keeps them private', async () => {
    const owner = await user();
    const admin = await staff();
    const buyer = await user();
    const stranger = await user();
    const farmId = await farm(owner);
    const created = await draft(owner, farmId, { listingType: 'sale', askingPrice: 10_000_000 });
    await as(owner).put(`/api/v1/listing-requests/${created.id as string}/sale-terms`, quick).expect(200);
    const live = await publish(owner, admin, created);
    const path = `${LIST}/${live.slug as string}/purchase-proposals`;
    const otherFarm = await farm(owner);
    const cashOnly = await draft(owner, otherFarm, { listingType: 'sale', askingPrice: 2000 });
    await as(owner).put(`/api/v1/listing-requests/${cashOnly.id as string}/sale-terms`, { saleMode: 'standardCash' }).expect(200);
    const standard = await publish(owner, admin, cashOnly);

    await as(buyer).post(path, { ...mixed, proposedTotalValue: 9_000_000 }).expect(400);
    await as(buyer).post(path, { ...mixed, components: [{ componentType: 'cash', proposedValue: 1.5 }] }).expect(400);
    await as(buyer)
      .post(`${LIST}/${standard.slug as string}/purchase-proposals`, {
        proposalKind: 'installment',
        components: [{ componentType: 'installments', proposedValue: 2000, installmentCount: 4 }],
      })
      .expect(400);
    await as(owner).post(path, mixed).expect(409);
    const unpublished = await draft(owner, otherFarm, { listingType: 'rent', annualRentPerFeddan: 80 });
    await as(buyer).post(`${LIST}/${unpublished.slug as string}/purchase-proposals`, mixed).expect(404);

    const proposal = json(await as(buyer).post(path, mixed).expect(201));
    expect(proposal).toMatchObject({
      listingId: live.id,
      proposalKind: 'mixed',
      proposedTotalValue: 10_000_000,
      currency: 'EGP',
      status: 'submitted',
    });
    expect(JSON.stringify(proposal)).not.toMatch(/mobile|@buyer|farmId|privatePin|assignedStaff/);
    await as(buyer).post(path, mixed).expect(409);
    await as(stranger).get(`/api/v1/purchase-proposals/${proposal.id as string}`).expect(404);
    const mine = json(await as(buyer).get('/api/v1/purchase-proposals').expect(200));
    expect(mine.total).toBe(1);

    const original = db.auditLog.create.bind(db.auditLog);
    db.auditLog.create = () => Promise.reject(new Error('audit failed'));
    await as(stranger).post(path, mixed).expect(500);
    db.auditLog.create = original;
    expect(db.request.rows.filter((row) => row.createdBy === stranger.id && row.requestType === 'farmPurchaseProposal')).toHaveLength(0);
  });

  it('limits proposal access to the assigned case agent and revokes it immediately', async () => {
    const owner = await user();
    const admin = await staff();
    const agent = await staff('caseAgent');
    const reviewer = await staff('reviewer');
    const buyer = await user();
    const farmId = await farm(owner);
    const created = await draft(owner, farmId, { listingType: 'sale', askingPrice: 10_000_000 });
    await as(owner).put(`/api/v1/listing-requests/${created.id as string}/sale-terms`, quick).expect(200);
    await as(owner).post(`/api/v1/listing-requests/${created.id as string}/submit`).expect(200);
    await as(admin)
      .put(`${INBOX}/${created.id as string}/assignments`, { assignmentType: 'caseAgent', assignedStaffId: agent.id.toString() })
      .expect(200);
    await as(admin)
      .put(`${INBOX}/${created.id as string}/assignments`, { assignmentType: 'reviewer', assignedStaffId: reviewer.id.toString() })
      .expect(200);
    await as(admin).post(`${INBOX}/${created.id as string}/decision`, { decision: 'approved' }).expect(200);
    const live = json(await as(admin).post(`${INBOX}/${created.id as string}/publish`).expect(200));
    const proposal = json(await as(buyer).post(`${LIST}/${live.slug as string}/purchase-proposals`, mixed).expect(201));
    const staffPath = `/api/v1/staff/purchase-proposals/${proposal.id as string}`;

    await as(reviewer).get(staffPath).expect(403);
    await as(agent).get(staffPath).expect(404);
    await as(admin).put(`${staffPath}/assignments`, { assignedStaffId: agent.id.toString() }).expect(200);
    expect(json(await as(agent).get(staffPath).expect(200)).id).toBe(proposal.id);
    expect(json(await as(agent).get('/api/v1/staff/purchase-proposals').expect(200)).total).toBe(1);
    await db.staffMembership.update({ where: { userId: agent.id }, data: { status: 'inactive' } });
    await as(agent).get(staffPath).expect(403);
  });

  it('coordinates co-purchase interest without treating shares as a completed sale', async () => {
    const owner = await user();
    const admin = await staff();
    const agent = await staff('caseAgent');
    const first = await user();
    const second = await user();
    const farmId = await farm(owner);
    const created = await draft(owner, farmId, { listingType: 'sale', askingPrice: 10_000_000 });
    await as(owner).put(`/api/v1/listing-requests/${created.id as string}/sale-terms`, { saleMode: 'standardCash' }).expect(200);
    const live = await publish(owner, admin, created);
    const interest = (buyer: U, share: number) =>
      as(buyer).post(`${LIST}/${live.slug as string}/purchase-proposals`, {
        proposalKind: 'co_purchase',
        requestedSharePercent: share,
        components: [{ componentType: 'cash', proposedValue: 1_000_000 }],
      });
    const left = json(await interest(first, 60).expect(201));
    const right = json(await interest(second, 60).expect(201));
    await interest(first, 0).expect(400);

    const group = json(
      await as(admin)
        .post('/api/v1/staff/co-purchase-groups', { listingId: live.id, assignedStaffId: agent.id.toString(), targetSharePercent: 100 })
        .expect(201),
    );
    const members = `/api/v1/staff/co-purchase-groups/${group.id as string}/members`;
    const added = json(await as(agent).post(members, { proposalId: left.id }).expect(201));
    expect(added.members).toEqual([expect.objectContaining({ proposalId: left.id, proposedSharePercent: '60.00' })]);
    const both = json(await as(agent).post(members, { proposalId: right.id, proposedSharePercent: 60 }).expect(201));
    expect(both.members).toHaveLength(2);
    await as(agent).post(members, { proposalId: left.id }).expect(409);
    await as(first).patch(`/api/v1/purchase-proposals/${left.id as string}`, {
      proposalKind: 'coPurchase',
      requestedSharePercent: 40,
      components: [{ componentType: 'cash', proposedValue: 1_000_000 }],
    }).expect(409);

    const tight = json(
      await as(admin)
        .post('/api/v1/staff/co-purchase-groups', { listingId: live.id, assignedStaffId: agent.id.toString(), targetSharePercent: 30 })
        .expect(201),
    );
    await as(agent).post(`/api/v1/staff/co-purchase-groups/${tight.id as string}/members`, { proposalId: left.id }).expect(400);
    await as(agent).patch(`/api/v1/staff/co-purchase-groups/${group.id as string}`, { groupStatus: 'closed' }).expect(200);
    await as(agent).post(members, { proposalId: left.id }).expect(409);
    await as(first).get('/api/v1/staff/co-purchase-groups').expect(403);
    expect(JSON.stringify(both)).not.toMatch(/mobile|@buyer|farmId/);
  });
});
