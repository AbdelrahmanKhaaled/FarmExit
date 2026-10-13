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
const SALE = { listingType: 'sale', askingPrice: 12_000_000, listingDescription: 'Oranges' };
const INBOX = '/api/v1/staff/listing-requests';

describe('Staff listing review inbox (e2e)', () => {
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
  async function user(): Promise<U> {
    const mobile = `0101000${String(8000 + counter++)}`;
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
    return { id: db.user.rows.find((r) => r.mobileE164 === e164)?.id as bigint, token };
  }
  const as = (u: U) => ({
    get: (path: string) => http().get(path).set('Authorization', bearer(u.token)),
    post: (path: string, body: object = {}) => http().post(path).set('Authorization', bearer(u.token)).send(body),
    put: (path: string, body: object = {}) => http().put(path).set('Authorization', bearer(u.token)).send(body),
  });
  const staff = async (role: string): Promise<U> => {
    const person = await user();
    await db.staffMembership.create({ data: { userId: person.id, staffRole: role } });
    return person;
  };
  const assign = (admin: U, id: string, assignmentType: string, assignedStaffId: bigint) =>
    as(admin).put(`${INBOX}/${id}/assignments`, { assignmentType, assignedStaffId: assignedStaffId.toString() });

  async function submittedListing() {
    const owner = await user();
    const farmId = json(await as(owner).post('/api/v1/farms', FARM).expect(201)).id as string;
    db.farm.rows.find((row) => row.id === BigInt(farmId))!.privatePinLatitude = 30.0444;
    const created = json(await as(owner).post(`/api/v1/farms/${farmId}/listing-requests`, SALE).expect(201));
    const id = created.id as string;
    await as(owner).post(`/api/v1/listing-requests/${id}/submit`).expect(200);
    return { owner, farmId, id };
  }

  it('shows submitted listings to admin and only the matching slot to each assignee', async () => {
    const { owner, id } = await submittedListing();
    const otherFarmId = json(await as(owner).post('/api/v1/farms', { ...FARM, name: 'Other' }).expect(201)).id as string;
    const draft = json(
      await as(owner)
        .post(`/api/v1/farms/${otherFarmId}/listing-requests`, { listingType: 'rent', annualRentPerFeddan: 18000 })
        .expect(201),
    );
    const admin = await staff('admin');
    const reviewer = await staff('reviewer');
    const agent = await staff('caseAgent');

    const inbox = json(await as(admin).get(INBOX).expect(200));
    expect(inbox.total).toBe(1);
    expect(inbox.items).toHaveLength(1);
    expect(JSON.stringify(inbox)).not.toMatch(/privatePin|mobile|email|storageKey|createdBy/);
    await as(admin).get(`${INBOX}/${draft.id as string}`).expect(404);
    await as(reviewer).get(INBOX).expect(200).expect({ items: [], page: 1, pageSize: 20, total: 0 });
    await as(reviewer).get(`${INBOX}/${id}`).expect(404);
    await as(agent).get(`${INBOX}/${id}`).expect(404);

    const assigned = json(await assign(admin, id, 'reviewer', reviewer.id).expect(200));
    expect(assigned).toMatchObject({
      id,
      status: 'underFarmExitReview',
      visibility: 'private',
      askingPrice: 12_000_000,
      currency: 'EGP',
      assignments: [{ assignmentType: 'reviewer', assignedStaffId: reviewer.id.toString() }],
    });
    expect(assigned.submittedAt).toEqual(expect.any(String));
    expect(db.request.rows.find((row) => row.id === BigInt(id))).toMatchObject({
      status: 'underFarmExitReview',
      visibility: 'private',
      publishedAt: null,
    });
    expect(db.requestStatusHistory.rows.filter((row) => row.requestId === BigInt(id)).map((row) => row.toStatus)).toEqual([
      'draft',
      'underFarmExitReview',
    ]);
    expect(db.auditLog.rows).toMatchObject([
      {
        actorUserId: admin.id,
        entityType: 'request_staff_assignment',
        action: 'assigned',
        changes: { assignmentType: 'reviewer', fromStaffId: null, toStaffId: reviewer.id.toString(), requestId: id },
      },
    ]);

    const reviewerView = json(await as(reviewer).get(`${INBOX}/${id}`).expect(200));
    expect(reviewerView.assignments).toEqual([
      expect.objectContaining({ assignmentType: 'reviewer', assignedStaffId: reviewer.id.toString() }),
    ]);
    await as(agent).get(`${INBOX}/${id}`).expect(404);

    await assign(admin, id, 'case_agent', agent.id).expect(200);
    const adminView = json(await as(admin).get(`${INBOX}/${id}`).expect(200));
    expect(adminView.assignments).toHaveLength(2);
    expect(json(await as(reviewer).get(`${INBOX}/${id}`).expect(200)).assignments).toHaveLength(1);
    expect(json(await as(agent).get(INBOX).expect(200)).total).toBe(1);
    expect(db.requestStaffAssignment.rows).toHaveLength(2);

    const ownerView = json(await as(owner).get(`/api/v1/listing-requests/${id}`).expect(200));
    expect(ownerView.assignments).toBeUndefined();
    expect(ownerView.submittedAt).toBeUndefined();
    expect(ownerView.status).toBe('underFarmExitReview');
  });

  it('reassigns one slot without granting the role or exposing another request', async () => {
    const first = await submittedListing();
    const second = await submittedListing();
    const admin = await staff('admin');
    const reviewer = await staff('reviewer');
    const replacement = await staff('reviewer');
    const agent = await staff('caseAgent');
    await assign(admin, first.id, 'reviewer', reviewer.id).expect(200);
    await assign(admin, first.id, 'caseAgent', agent.id).expect(200);

    await assign(admin, first.id, 'reviewer', reviewer.id).expect(200);
    expect(db.auditLog.rows.filter((row) => row.action === 'assigned')).toHaveLength(2);
    expect(db.auditLog.rows.some((row) => row.action === 'reassigned')).toBe(false);

    const moved = json(await assign(admin, first.id, 'reviewer', replacement.id).expect(200));
    expect(moved.assignments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ assignmentType: 'reviewer', assignedStaffId: replacement.id.toString() }),
        expect.objectContaining({ assignmentType: 'caseAgent', assignedStaffId: agent.id.toString() }),
      ]),
    );
    expect(db.requestStaffAssignment.rows.filter((row) => row.assignmentType === 'reviewer')).toHaveLength(1);
    const reassigned = db.auditLog.rows.find((row) => row.action === 'reassigned');
    expect(reassigned?.actorUserId).toBe(admin.id);
    expect(reassigned?.changes).toMatchObject({
      fromStaffId: reviewer.id.toString(),
      toStaffId: replacement.id.toString(),
      assignmentType: 'reviewer',
    });
    await as(reviewer).get(`${INBOX}/${first.id}`).expect(404);
    await as(reviewer).get(INBOX).expect(200).expect({ items: [], page: 1, pageSize: 20, total: 0 });
    await as(replacement).get(`${INBOX}/${second.id}`).expect(404);
    expect(json(await as(agent).get(`${INBOX}/${first.id}`).expect(200)).assignments).toHaveLength(1);

    const page = json(await as(admin).get(`${INBOX}?page=1&pageSize=1`).expect(200));
    expect(page).toMatchObject({ page: 1, pageSize: 1, total: 2 });
    expect(page.items).toHaveLength(1);

    await assign(admin, first.id, 'reviewer', admin.id).expect(400);
    await assign(admin, first.id, 'reviewer', agent.id).expect(400);
    await db.staffMembership.updateMany({ where: { userId: replacement.id }, data: { status: 'inactive' } });
    await assign(admin, first.id, 'reviewer', replacement.id).expect(400);
    await as(reviewer).put(`${INBOX}/${first.id}/assignments`, {
      assignmentType: 'reviewer',
      assignedStaffId: reviewer.id.toString(),
    }).expect(403);
    await as(agent).put(`${INBOX}/${first.id}/assignments`, {
      assignmentType: 'caseAgent',
      assignedStaffId: agent.id.toString(),
    }).expect(403);
    await as(first.owner).get(INBOX).expect(403);
    await http().get(INBOX).expect(401);
    await as(admin).get(`${INBOX}/0`).expect(400);
    await as(admin).put(`${INBOX}/${first.id}/assignments`, { assignmentType: 'reviewer', assignedStaffId: '0' }).expect(400);
    await as(admin)
      .put(`${INBOX}/${first.id}/assignments`, {
        assignmentType: 'reviewer',
        assignedStaffId: reviewer.id.toString(),
        status: 'approved',
      })
      .expect(400);
    await as(admin).get(`${INBOX}/999999`).expect(404);
    expect(db.request.rows.every((row) => row.status === 'underFarmExitReview' || row.status === 'draft')).toBe(true);
    expect(db.request.rows.find((row) => row.id === BigInt(first.id))?.status).toBe('underFarmExitReview');
  });

  it('drops access on the next request when the matching staff role is no longer active', async () => {
    const { id } = await submittedListing();
    const other = await submittedListing();
    const admin = await staff('admin');
    const reviewer = await staff('reviewer');
    await db.staffMembership.create({ data: { userId: reviewer.id, staffRole: 'caseAgent' } });
    await assign(admin, id, 'reviewer', reviewer.id).expect(200);
    await db.requestStaffAssignment.create({
      data: {
        requestId: BigInt(other.id),
        assignmentType: 'caseAgent',
        assignedStaffId: reviewer.id,
        assignedByUserId: admin.id,
        assignedAt: new Date(),
      },
    });

    await db.staffMembership.updateMany({
      where: { userId: reviewer.id, staffRole: 'reviewer' },
      data: { status: 'inactive' },
    });
    await as(reviewer).get(`${INBOX}/${id}`).expect(404);
    expect(json(await as(reviewer).get(INBOX).expect(200)).items).toEqual([
      expect.objectContaining({ id: other.id }),
    ]);
    expect(json(await as(reviewer).get(`${INBOX}/${other.id}`).expect(200)).assignments).toEqual([
      expect.objectContaining({ assignmentType: 'caseAgent' }),
    ]);

    await db.staffMembership.updateMany({ where: { userId: reviewer.id }, data: { status: 'inactive' } });
    await as(reviewer).get(INBOX).expect(403);
    await as(reviewer).get(`${INBOX}/${other.id}`).expect(403);

    await db.user.update({ where: { id: reviewer.id }, data: { accountStatus: 'suspended' } });
    await db.staffMembership.updateMany({
      where: { userId: reviewer.id, staffRole: 'reviewer' },
      data: { status: 'active' },
    });
    await assign(admin, id, 'reviewer', reviewer.id).expect(400);

    await db.staffMembership.updateMany({ where: { userId: admin.id }, data: { status: 'inactive' } });
    await as(admin).get(INBOX).expect(403);
    await as(admin).get(`${INBOX}/${id}`).expect(403);
  });
});
