import { randomInt } from 'node:crypto';
import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { type App } from 'supertest/types';
import { AppModule } from '../../app.module';
import { configureApp } from '../../common/app-setup';
import { PrismaService } from '../../prisma/prisma.service';
import { TokenService } from '../auth/token.service';

const describeDb = process.env.RUN_DB_INTEGRATION === '1' ? describe : describe.skip;

describeDb('Partnership workflows on real MySQL', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let owner: { id: bigint; token: string };
  let applicant: { id: bigint; token: string };
  let company: { id: bigint; token: string };
  let staff: { id: bigint; token: string };
  let farmId: bigint;
  let partnershipRequestId: bigint;

  const http = () => request(app.getHttpServer());
  const as = (u: { token: string }) => ({
    post: (path: string, body: object = {}) => http().post(path).set('Authorization', `Bearer ${u.token}`).send(body),
    get: (path: string) => http().get(path).set('Authorization', `Bearer ${u.token}`),
    patch: (path: string, body: object = {}) => http().patch(path).set('Authorization', `Bearer ${u.token}`).send(body),
  });

  async function makeUser(mobileE164: string, fullName: string): Promise<{ id: bigint; token: string }> {
    const now = new Date();
    const user = await prisma.user.create({
      data: { mobileE164, fullName, mobileVerifiedAt: now, createdAt: now },
    });
    const session = await prisma.userSession.create({
      data: {
        userId: user.id,
        sessionTokenHash: `hash-${mobileE164}`,
        expiresAt: new Date(now.getTime() + 3_600_000),
        createdAt: now,
      },
    });
    return { id: user.id, token: app.get(TokenService).signAccessToken(user.id, session.id) };
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);

    owner = await makeUser(`+2017${String(randomInt(0, 100_000_000)).padStart(8, '0')}`, 'Partner Owner');
    applicant = await makeUser(`+2018${String(randomInt(0, 100_000_000)).padStart(8, '0')}`, 'Partner Applicant');
    company = await makeUser(`+2015${String(randomInt(0, 100_000_000)).padStart(8, '0')}`, 'Company Applicant');
    staff = await makeUser(`+2012${String(randomInt(0, 100_000_000)).padStart(8, '0')}`, 'Private Test Reviewer');
    await prisma.staffMembership.create({ data: { userId: staff.id, staffRole: 'admin' } });

    const farm = await prisma.farm.create({
      data: {
        name: 'Partnership Integration Farm',
        farmType: 'mixed',
        areaFeddan: 20,
        governorate: 'Giza',
        createdBy: owner.id,
      },
    });
    farmId = farm.id;
    await prisma.farmRelationship.create({
      data: { farmId, userId: owner.id, relationshipRole: 'owner', relationshipStatus: 'active' },
    });
  });

  afterAll(async () => {
    if (prisma && staff)
      await prisma.staffMembership.updateMany({ where: { userId: staff.id }, data: { status: 'inactive' } });
    if (prisma)
      await prisma.userSession.updateMany({
        where: { userId: { in: [owner, applicant, company, staff].filter(Boolean).map((u) => u.id) } },
        data: { revokedAt: new Date() },
      });
    await app?.close();
  });

  it('owner creates and submits a partnership request', async () => {
    const created = await as(owner)
      .post(`/api/v1/farms/${String(farmId)}/partnership-requests`, { description: 'Looking for operating partner' })
      .expect(201);
    const createdBody = created.body as { id: string };
    partnershipRequestId = BigInt(createdBody.id);
    const fields = {
      objective: ['Expand cultivation'],
      acceptedPartnerTypes: ['individual', 'company'],
      contributionDetails: 'Technical expertise',
      operations: 'Existing operations',
      salesChannel: 'Local nurseries and traders',
      extraInformation: 'Private test information',
    };
    await as(owner).patch(`/api/v1/partnership-requests/${partnershipRequestId}`, fields).expect(200);
    const reloaded = await as(owner).get(`/api/v1/partnership-requests/${partnershipRequestId}`).expect(200);
    expect(reloaded.body).toMatchObject(fields);
    const stored = await prisma.partnershipDetail.findUniqueOrThrow({ where: { requestId: partnershipRequestId } });
    expect(stored).toMatchObject(fields);
    await as(owner)
      .post(`/api/v1/partnership-requests/${String(partnershipRequestId)}/submit`)
      .expect(201);
    const row = await prisma.request.findUniqueOrThrow({ where: { id: partnershipRequestId } });
    expect(row.status).toBe('underFarmExitReview');
  });

  it('applicant cannot apply before partnership is approved', async () => {
    await as(applicant)
      .post('/api/v1/partnership-applications', {
        parentPartnershipRequestId: String(partnershipRequestId),
        applicantKind: 'individual',
      })
      .expect(409);
  });

  it('enforces private reads/updates and saves corrections without public publication', async () => {
    await as(applicant).get(`/api/v1/partnership-requests/${partnershipRequestId}`).expect(404);
    await as(applicant)
      .patch(`/api/v1/partnership-requests/${partnershipRequestId}`, { description: 'Unauthorized' })
      .expect(404);
    await as(owner)
      .patch(`/api/v1/partnership-requests/${partnershipRequestId}`, { description: 'Locked' })
      .expect(409);
    await as(staff)
      .post(`/api/v1/staff/partnership-requests/${partnershipRequestId}/decide`, {
        decision: 'changesRequested',
        comment: 'Clarify the objective',
      })
      .expect(201);
    await as(owner)
      .patch(`/api/v1/partnership-requests/${partnershipRequestId}`, {
        description: 'Corrected objective',
        extraInformation: '',
      })
      .expect(200);
    const reloaded = await as(owner).get(`/api/v1/partnership-requests/${partnershipRequestId}`).expect(200);
    expect((reloaded.body as { extraInformation: string }).extraInformation).toBe('');
    expect((reloaded.body as { reviews: unknown[] }).reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ decision: 'changesRequested', comment: 'Clarify the objective' }),
      ]),
    );
    await as(owner).post(`/api/v1/partnership-requests/${partnershipRequestId}/submit`).expect(201);
    await as(staff)
      .post(`/api/v1/staff/partnership-requests/${partnershipRequestId}/decide`, { decision: 'approved' })
      .expect(201);
    const row = await prisma.request.findUniqueOrThrow({ where: { id: partnershipRequestId } });
    expect(row.visibility).toBe('private');
    expect(row.status).toBe('approved');
  });

  for (const kind of ['individual', 'company'] as const)
    it(`${kind}: save/reload, private document upload, submission and correction persist in MySQL`, async () => {
      const user = kind === 'individual' ? applicant : company;
      const created = await as(user)
        .post('/api/v1/partnership-applications', {
          parentPartnershipRequestId: String(partnershipRequestId),
          applicantKind: kind,
        })
        .expect(201);
      const id = (created.body as { id: string }).id;
      const values = {
        applicationMessage: 'Private proposal',
        whyGoodFit: 'Relevant skills',
        relevantExperience: 'Agriculture',
        approach: 'Practical approach',
        ...(kind === 'company'
          ? {
              companyName: 'Private Test Company',
              companyRegistrationNumber: 'TEST-8',
              companySector: 'Agriculture',
              companyContactName: 'Authorized representative',
              companyContactRole: 'Director',
            }
          : {}),
      };
      await as(user).patch(`/api/v1/partnership-applications/${id}`, values).expect(200);
      const reloaded = await as(user).get(`/api/v1/partnership-applications/${id}`).expect(200);
      expect(reloaded.body).toMatchObject(values);
      expect(
        await prisma.requestApplicationDetail.findUniqueOrThrow({ where: { requestId: BigInt(id) } }),
      ).toMatchObject(values);
      await as(owner).get(`/api/v1/partnership-applications/${id}`).expect(404);
      await as(owner).patch(`/api/v1/partnership-applications/${id}`, { whyGoodFit: 'Unauthorized' }).expect(404);
      await as(user).post(`/api/v1/partnership-applications/${id}/submit`).expect(400);
      const uploaded = await http()
        .post(`/api/v1/requests/${id}/documents`)
        .set('Authorization', `Bearer ${user.token}`)
        .field('slotKey', 'supporting_test')
        .attach('file', Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF'), {
          filename: 'phase8-private.pdf',
          contentType: 'application/pdf',
        })
        .expect(201);
      await as(owner).get(`/api/v1/requests/${id}/documents`).expect(404);
      await as(user).get(`/api/v1/requests/${id}/documents`).expect(200);
      expect((uploaded.body as { id: string }).id).toBeDefined();
      await as(user).post(`/api/v1/partnership-applications/${id}/submit`).expect(201);
      expect((await prisma.request.findUniqueOrThrow({ where: { id: BigInt(id) } })).status).toBe(
        'underFarmExitReview',
      );
      await as(staff)
        .post(`/api/v1/staff/partnership-applications/${id}/decide`, {
          decision: 'changesRequested',
          comment: 'Clarify experience',
        })
        .expect(201);
      await as(user)
        .patch(`/api/v1/partnership-applications/${id}`, {
          relevantExperience: 'Corrected experience',
          applicationMessage: '',
        })
        .expect(200);
      await as(user).post(`/api/v1/partnership-applications/${id}/submit`).expect(201);
      const final = await as(user).get(`/api/v1/partnership-applications/${id}`).expect(200);
      expect(final.body).toMatchObject({
        relevantExperience: 'Corrected experience',
        applicationMessage: '',
        status: 'underFarmExitReview',
      });
      expect((await prisma.request.findUniqueOrThrow({ where: { id: BigInt(id) } })).visibility).toBe('private');
      await as(user)
        .post('/api/v1/partnership-applications', {
          parentPartnershipRequestId: String(partnershipRequestId),
          applicantKind: kind,
        })
        .expect(409);
    });
});
