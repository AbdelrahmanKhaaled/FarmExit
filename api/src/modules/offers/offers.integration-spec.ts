import { randomBytes, randomInt } from 'node:crypto';
import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { type App } from 'supertest/types';
import { AppModule } from '../../app.module';
import { configureApp } from '../../common/app-setup';
import { PrismaService } from '../../prisma/prisma.service';
import { TokenService } from '../auth/token.service';

const describeDb = process.env.RUN_DB_INTEGRATION === '1' ? describe : describe.skip;

type Json = Record<string, unknown>;
type U = { id: bigint; token: string };
const json = (res: { body: unknown }): Json => res.body as Json;
const INBOX = '/api/v1/staff/listing-requests';
const LIST = '/api/v1/marketplace/farms';

describeDb('Offers on real MySQL', () => {
  const mobiles = [0, 1, 2, 3, 4].map(() => `+2016${String(randomInt(0, 100_000_000)).padStart(8, '0')}`);
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let owner: U;
  let admin: U;
  let agent: U;
  const createdUserIds: bigint[] = [];
  const http = () => request(app.getHttpServer());
  const as = (u: U) => ({
    get: (path: string) => http().get(path).set('Authorization', `Bearer ${u.token}`),
    post: (path: string, body: object = {}) => http().post(path).set('Authorization', `Bearer ${u.token}`).send(body),
    put: (path: string, body: object = {}) => http().put(path).set('Authorization', `Bearer ${u.token}`).send(body),
  });

  async function makeUser(mobileE164: string, staffRole?: 'admin' | 'caseAgent'): Promise<U> {
    const now = new Date();
    const user = await prisma.user.create({
      data: { mobileE164, fullName: 'Offers Integration', mobileVerifiedAt: now, createdAt: now },
    });
    createdUserIds.push(user.id);
    if (staffRole) await prisma.staffMembership.create({ data: { userId: user.id, staffRole, status: 'active' } });
    const session = await prisma.userSession.create({
      data: {
        userId: user.id,
        sessionTokenHash: randomBytes(32).toString('hex'),
        expiresAt: new Date(now.getTime() + 3_600_000),
        createdAt: now,
      },
    });
    return { id: user.id, token: app.get(TokenService).signAccessToken(user.id, session.id) };
  }

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    if ((await prisma.user.count({ where: { mobileE164: { in: mobiles } } })) > 0) {
      throw new Error('Test numbers already in use; aborting without changes');
    }
    owner = await makeUser(mobiles[0]);
    admin = await makeUser(mobiles[1], 'admin');
    agent = await makeUser(mobiles[2], 'caseAgent');
  });

  afterAll(async () => {
    try {
      if (createdUserIds.length > 0) {
        const ids = createdUserIds;
        const requests = await prisma.request.findMany({ where: { createdBy: { in: ids } }, select: { id: true } });
        const requestIds = requests.map((row) => row.id);
        if (requestIds.length > 0) {
          await prisma.coPurchaseGroupMember.deleteMany({ where: { buyerProposalRequestId: { in: requestIds } } });
          await prisma.farmPurchaseProposalComponent.deleteMany({ where: { proposalRequestId: { in: requestIds } } });
          await prisma.farmPurchaseProposalDetail.deleteMany({ where: { requestId: { in: requestIds } } });
          await prisma.farmExchangePreference.deleteMany({ where: { listingRequestId: { in: requestIds } } });
          const groups = await prisma.coPurchaseGroup.findMany({
            where: { listingRequestId: { in: requestIds } },
            select: { id: true },
          });
          const groupIds = groups.map((row) => row.id);
          if (groupIds.length > 0) {
            await prisma.coPurchaseGroupMember.deleteMany({ where: { groupId: { in: groupIds } } });
          }
          await prisma.coPurchaseGroup.deleteMany({ where: { listingRequestId: { in: requestIds } } });
          await prisma.farmSaleTerms.deleteMany({ where: { listingRequestId: { in: requestIds } } });
          await prisma.requestReview.deleteMany({ where: { requestId: { in: requestIds } } });
          await prisma.requestStaffAssignment.deleteMany({ where: { requestId: { in: requestIds } } });
          await prisma.requestStatusHistory.deleteMany({ where: { requestId: { in: requestIds } } });
          await prisma.farmListingDetail.deleteMany({ where: { requestId: { in: requestIds } } });
          await prisma.request.deleteMany({ where: { id: { in: requestIds } } });
        }
        await prisma.auditLog.deleteMany({ where: { actorUserId: { in: ids } } });
        const farms = await prisma.farm.findMany({ where: { createdBy: { in: ids } }, select: { id: true } });
        const farmIds = farms.map((farm) => farm.id);
        if (farmIds.length > 0) {
          await prisma.farmRelationship.deleteMany({ where: { farmId: { in: farmIds } } });
          await prisma.farm.deleteMany({ where: { id: { in: farmIds } } });
        }
        await prisma.staffMembership.deleteMany({ where: { userId: { in: ids } } });
        await prisma.userSession.deleteMany({ where: { userId: { in: ids } } });
        await prisma.user.deleteMany({ where: { id: { in: ids } } });
      }
    } finally {
      await app?.close();
    }
  });

  it('keeps one proposal when two creates race, and one membership when two adds race', async () => {
    const buyer = await makeUser(mobiles[3]);
    const other = await makeUser(mobiles[4]);
    const farmId = json(
      await as(owner)
        .post('/api/v1/farms', { name: 'Offer Farm', farmType: 'fruit', areaFeddan: 8, governorate: 'Giza', areaName: 'Kerdasa' })
        .expect(201),
    ).id as string;
    const created = json(
      await as(owner).post(`/api/v1/farms/${farmId}/listing-requests`, { listingType: 'sale', askingPrice: 10_000_000 }).expect(201),
    );
    await as(owner)
      .put(`/api/v1/listing-requests/${created.id as string}/sale-terms`, { saleMode: 'standardCash' })
      .expect(200);
    await as(owner).post(`/api/v1/listing-requests/${created.id as string}/submit`).expect(200);
    await as(admin).post(`${INBOX}/${created.id as string}/decision`, { decision: 'approved' }).expect(200);
    const live = json(await as(admin).post(`${INBOX}/${created.id as string}/publish`).expect(200));
    const body = {
      proposalKind: 'coPurchase',
      requestedSharePercent: 60,
      components: [{ componentType: 'cash', proposedValue: 1_000_000 }],
    };
    const path = `${LIST}/${live.slug as string}/purchase-proposals`;
    const [left, right] = await Promise.all([as(buyer).post(path, body), as(buyer).post(path, body)]);
    expect([left.status, right.status].sort()).toEqual([201, 409]);
    expect(await prisma.request.count({ where: { createdBy: buyer.id, parentRequestId: BigInt(live.id as string) } })).toBe(1);

    const second = json(await as(other).post(path, { ...body, requestedSharePercent: 35 }).expect(201));
    const firstId = String(json(left.status === 201 ? left : right).id);
    const group = json(
      await as(admin)
        .post('/api/v1/staff/co-purchase-groups', {
          listingId: live.id,
          assignedStaffId: agent.id.toString(),
        })
        .expect(201),
    );
    const members = `/api/v1/staff/co-purchase-groups/${group.id as string}/members`;
    const [added, duplicate] = await Promise.all([
      as(agent).post(members, { proposalId: firstId }),
      as(agent).post(members, { proposalId: firstId }),
    ]);
    expect([added.status, duplicate.status].sort()).toEqual([201, 409]);
    await as(agent).post(members, { proposalId: second.id, proposedSharePercent: 35 }).expect(201);
    expect(await prisma.coPurchaseGroupMember.count({ where: { groupId: BigInt(group.id as string) } })).toBe(2);
    const card = json(await http().get(LIST).expect(200));
    expect(JSON.stringify(card)).not.toMatch(/saleMode|proposalNotes|mobile/);
  });
});
