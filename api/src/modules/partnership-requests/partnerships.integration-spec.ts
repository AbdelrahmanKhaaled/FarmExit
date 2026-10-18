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
    await app?.close();
  });

  it('owner creates and submits a partnership request', async () => {
    const created = await as(owner)
      .post(`/api/v1/farms/${String(farmId)}/partnership-requests`, { description: 'Looking for operating partner' })
      .expect(201);
    const createdBody = created.body as { id: string };
    partnershipRequestId = BigInt(createdBody.id);
    await as(owner).post(`/api/v1/partnership-requests/${String(partnershipRequestId)}/submit`).expect(201);
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
});
