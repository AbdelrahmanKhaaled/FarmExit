import { randomBytes, randomInt } from 'node:crypto';
import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { type App } from 'supertest/types';
import { AppModule } from '../../app.module';
import { configureApp } from '../../common/app-setup';
import { PrismaService } from '../../prisma/prisma.service';
import { TokenService } from '../auth/token.service';

/** Real MySQL publication (opt-in: RUN_DB_INTEGRATION=1). Cleanup removes only the users this file creates. */
const describeDb = process.env.RUN_DB_INTEGRATION === '1' ? describe : describe.skip;

type Json = Record<string, unknown>;
type U = { id: bigint; token: string };
const json = (res: { body: unknown }): Json => res.body as Json;
const INBOX = '/api/v1/staff/listing-requests';

describeDb('Listing publication on real MySQL', () => {
  const mobiles = [0, 1].map(() => `+2015${String(randomInt(0, 100_000_000)).padStart(8, '0')}`);
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let owner: U;
  let admin: U;
  let farmId: string;
  const createdUserIds: bigint[] = [];
  const http = () => request(app.getHttpServer());
  const as = (u: U) => ({
    post: (path: string, body: object = {}) => http().post(path).set('Authorization', `Bearer ${u.token}`).send(body),
  });

  async function makeUser(mobileE164: string, staffRole?: 'admin'): Promise<U> {
    const now = new Date();
    const user = await prisma.user.create({
      data: { mobileE164, fullName: 'Publication Integration', mobileVerifiedAt: now, createdAt: now },
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

  async function approved(body: object): Promise<string> {
    const created = json(await as(owner).post(`/api/v1/farms/${farmId}/listing-requests`, body).expect(201));
    const id = created.id as string;
    await as(owner).post(`/api/v1/listing-requests/${id}/submit`).expect(200);
    await as(admin).post(`${INBOX}/${id}/decision`, { decision: 'approved' }).expect(200);
    return id;
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
    farmId = json(
      await as(owner)
        .post('/api/v1/farms', {
          name: 'Publication Farm',
          farmType: 'fruit',
          areaFeddan: 8,
          governorate: 'Beheira',
          areaName: 'Delengat',
        })
        .expect(201),
    ).id as string;
    await prisma.farm.update({
      where: { id: BigInt(farmId) },
      data: { privatePinLatitude: 30.5, privatePinLongitude: 30.6 },
    });
  });

  afterAll(async () => {
    try {
      if (createdUserIds.length > 0) {
        const ids = createdUserIds;
        await prisma.auditLog.deleteMany({ where: { actorUserId: { in: ids } } });
        const requests = await prisma.request.findMany({ where: { createdBy: { in: ids } }, select: { id: true } });
        const requestIds = requests.map((row) => row.id);
        if (requestIds.length > 0) {
          await prisma.requestReview.deleteMany({ where: { requestId: { in: requestIds } } });
          await prisma.requestStaffAssignment.deleteMany({ where: { requestId: { in: requestIds } } });
          await prisma.requestStatusHistory.deleteMany({ where: { requestId: { in: requestIds } } });
          await prisma.farmListingDetail.deleteMany({ where: { requestId: { in: requestIds } } });
          await prisma.request.deleteMany({ where: { id: { in: requestIds }, createdBy: { in: ids } } });
        }
        const farms = await prisma.farm.findMany({ where: { createdBy: { in: ids } }, select: { id: true } });
        const farmIds = farms.map((farm) => farm.id);
        if (farmIds.length > 0) {
          await prisma.farmMedia.deleteMany({ where: { farmId: { in: farmIds } } });
          await prisma.farmRelationship.deleteMany({ where: { farmId: { in: farmIds } } });
          await prisma.farm.deleteMany({ where: { id: { in: farmIds }, createdBy: { in: ids } } });
        }
        await prisma.staffMembership.deleteMany({ where: { userId: { in: ids } } });
        await prisma.userSession.deleteMany({ where: { userId: { in: ids } } });
        await prisma.user.deleteMany({ where: { id: { in: ids }, mobileE164: { in: mobiles } } });
      }
    } finally {
      await app?.close();
    }
  });

  it('lets one of two sales publish, and still allows a rent on the same farm', async () => {
    const first = await approved({ listingType: 'sale', askingPrice: 1500 });
    const second = await approved({ listingType: 'sale', askingPrice: 1600 });
    const rent = await approved({ listingType: 'rent', annualRentPerFeddan: 700 });
    const [left, right] = await Promise.all([
      as(admin).post(`${INBOX}/${first}/publish`, {}),
      as(admin).post(`${INBOX}/${second}/publish`, {}),
    ]);
    expect([left.status, right.status].sort()).toEqual([200, 409]);
    const winner = left.status === 200 ? first : second;
    const loser = winner === first ? second : first;
    const published = await prisma.request.findUniqueOrThrow({ where: { id: BigInt(winner) } });
    const waiting = await prisma.request.findUniqueOrThrow({ where: { id: BigInt(loser) } });
    expect(published).toMatchObject({ status: 'published', visibility: 'public' });
    expect(published.publishedAt).toBeInstanceOf(Date);
    expect(waiting).toMatchObject({ status: 'approved', visibility: 'private', publishedAt: null });
    const history = await prisma.requestStatusHistory.findMany({
      where: { requestId: { in: [BigInt(first), BigInt(second)] }, toStatus: 'published' },
    });
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({ requestId: BigInt(winner), fromStatus: 'approved', changedBy: admin.id });
    const audits = await prisma.auditLog.findMany({
      where: { action: 'published', entityId: { in: [BigInt(first), BigInt(second)] } },
    });
    expect(audits).toHaveLength(1);
    expect(audits[0]).toMatchObject({ actorUserId: admin.id, entityType: 'request', entityId: BigInt(winner) });
    expect(JSON.stringify(audits[0]?.changes)).not.toMatch(/mobile|privatePin|30\.5/);

    const rented = json(await as(admin).post(`${INBOX}/${rent}/publish`).expect(200));
    expect(rented).toMatchObject({ status: 'published', visibility: 'public', listingType: 'rent', governorate: 'Beheira', areaName: 'Delengat' });
    expect(JSON.stringify(rented)).not.toMatch(/privatePin|30\.5|mobile/);
    const rentRow = await prisma.request.findUniqueOrThrow({ where: { id: BigInt(rent) } });
    expect(rentRow).toMatchObject({ status: 'published', visibility: 'public' });
    expect(await prisma.communicationCase.count({ where: { requestId: { in: [BigInt(winner), BigInt(rent)] } } })).toBe(0);
  });
});
