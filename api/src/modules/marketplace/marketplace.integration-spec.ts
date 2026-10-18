import { randomBytes, randomInt } from 'node:crypto';
import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { type App } from 'supertest/types';
import { AppModule } from '../../app.module';
import { configureApp } from '../../common/app-setup';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TokenService } from '../auth/token.service';

/** Real MySQL marketplace reads (opt-in: RUN_DB_INTEGRATION=1). Cleanup removes only the users this file creates. */
const describeDb = process.env.RUN_DB_INTEGRATION === '1' ? describe : describe.skip;

type Json = Record<string, unknown>;
type U = { id: bigint; token: string };
const json = (res: { body: unknown }): Json => res.body as Json;
const INBOX = '/api/v1/staff/listing-requests';
const LIST = '/api/v1/marketplace/farms';

describeDb('Public marketplace on real MySQL', () => {
  const mobiles = [0, 1, 2].map(() => `+2015${String(randomInt(0, 100_000_000)).padStart(8, '0')}`);
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let owner: U;
  let admin: U;
  const createdUserIds: bigint[] = [];
  const http = () => request(app.getHttpServer());
  const as = (u: U) => ({
    get: (path: string) => http().get(path).set('Authorization', `Bearer ${u.token}`),
    post: (path: string, body: object = {}) => http().post(path).set('Authorization', `Bearer ${u.token}`).send(body),
    del: (path: string) => http().delete(path).set('Authorization', `Bearer ${u.token}`),
  });

  async function makeUser(mobileE164: string, staffRole?: 'admin'): Promise<U> {
    const now = new Date();
    const user = await prisma.user.create({
      data: { mobileE164, fullName: 'Marketplace Integration', mobileVerifiedAt: now, createdAt: now },
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

  async function published(farmId: string, body: object): Promise<Json> {
    const created = json(await as(owner).post(`/api/v1/farms/${farmId}/listing-requests`, body).expect(201));
    const id = created.id as string;
    await as(owner).post(`/api/v1/listing-requests/${id}/submit`).expect(200);
    await as(admin).post(`${INBOX}/${id}/decision`, { decision: 'approved' }).expect(200);
    return json(await as(admin).post(`${INBOX}/${id}/publish`).expect(200));
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
  });

  afterAll(async () => {
    try {
      if (createdUserIds.length > 0) {
        const ids = createdUserIds;
        await prisma.auditLog.deleteMany({ where: { actorUserId: { in: ids } } });
        await prisma.savedItem.deleteMany({ where: { userId: { in: ids } } });
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

  it('filters, sorts Decimal prices, and hides unpublished or deleted listings', async () => {
    const orchard = json(
      await as(owner)
        .post('/api/v1/farms', { name: 'Orange Orchard', farmType: 'fruit', areaFeddan: 12.5, governorate: 'Beheira', areaName: 'Delengat' })
        .expect(201),
    ).id as string;
    const plot = json(
      await as(owner)
        .post('/api/v1/farms', { name: 'Giza Plot', farmType: 'vegetable', areaFeddan: 40, governorate: 'Giza', areaName: 'Kerdasa' })
        .expect(201),
    ).id as string;
    await prisma.farm.update({
      where: { id: BigInt(orchard) },
      data: { privatePinLatitude: new Prisma.Decimal('30.5'), privatePinLongitude: new Prisma.Decimal('30.6') },
    });
    const sale = await published(orchard, { listingType: 'sale', askingPrice: 4000, listingDescription: 'A quiet orange grove' });
    const bigger = await published(plot, { listingType: 'sale', askingPrice: 9000 });
    const rent = await published(orchard, { listingType: 'rent', annualRentPerFeddan: 700 });
    const draft = json(await as(owner).post(`/api/v1/farms/${plot}/listing-requests`, { listingType: 'rent', annualRentPerFeddan: 50 }).expect(201));

    const open = json(await http().get(LIST).expect(200));
    const createdIds = new Set([String(sale.id), String(bigger.id), String(rent.id)]);
    expect((open.items as Json[]).filter((item) => createdIds.has(String(item.id))).length).toBe(3);
    expect(JSON.stringify(open)).not.toMatch(/privatePin|30\.5|mobile|@|storageKey|farmId/);
    const orangeHits = json(await http().get(`${LIST}?q=orange`).expect(200));
    expect((orangeHits.items as Json[]).filter((item) => createdIds.has(String(item.id))).length).toBe(2);
    const saleSorted = json(await http().get(`${LIST}?listingType=sale&sort=priceAsc`).expect(200));
    expect(
      (saleSorted.items as Json[])
        .filter((item) => createdIds.has(String(item.id)))
        .map((item) => item.askingPrice),
    ).toEqual([4000, 9000]);

    await prisma.farmListingDetail.update({
      where: { requestId: BigInt(bigger.id as string) },
      data: { askingPrice: new Prisma.Decimal('1500.25') },
    });
    const precise = json(await http().get(`${LIST}?listingType=sale&sort=priceAsc`).expect(200));
    const preciseMine = (precise.items as Json[]).filter((item) => createdIds.has(String(item.id)));
    expect(preciseMine).toEqual([expect.objectContaining({ id: sale.id, askingPrice: 4000 })]);
    await http().get(`${LIST}/${bigger.slug as string}`).expect(404);

    const mixed = json(await http().get(`${LIST}?q=orange&sort=priceAsc&pageSize=1`).expect(200));
    expect(mixed.pageSize).toBe(1);
    expect(mixed.items).toEqual([expect.objectContaining({ id: rent.id, annualRentPerFeddan: 700 })]);

    await http().get(`${LIST}/${draft.slug as string}`).expect(404);
    await prisma.farm.update({ where: { id: BigInt(plot) }, data: { deletedAt: new Date() } });
    const afterDelete = json(await http().get(`${LIST}?q=orange`).expect(200));
    expect((afterDelete.items as Json[]).filter((item) => createdIds.has(String(item.id))).length).toBe(2);
    await http().get(`${LIST}/${bigger.slug as string}`).expect(404);
  });

  it('saves a sale and a rent independently, and keeps one row when two saves race', async () => {
    const buyer = await makeUser(mobiles[2]);
    const farmId = json(
      await as(owner)
        .post('/api/v1/farms', { name: 'Bookmark Farm', farmType: 'fruit', areaFeddan: 9, governorate: 'Giza', areaName: 'Kerdasa' })
        .expect(201),
    ).id as string;
    const sale = await published(farmId, { listingType: 'sale', askingPrice: 2500 });
    const rent = await published(farmId, { listingType: 'rent', annualRentPerFeddan: 300 });
    const saved = '/api/v1/marketplace/saved';

    const [left, right] = await Promise.all([
      as(buyer).post(`${saved}/${sale.id as string}`),
      as(buyer).post(`${saved}/${sale.id as string}`),
    ]);
    expect([left.status, right.status]).toEqual([200, 200]);
    expect(await prisma.savedItem.count({ where: { userId: buyer.id, listingRequestId: BigInt(sale.id as string) } })).toBe(1);

    await as(buyer).post(`${saved}/${rent.id as string}`).expect(200);
    const mine = json(await as(buyer).get(saved).expect(200));
    expect((mine.items as Json[]).map((item) => item.listingType).sort()).toEqual(['rent', 'sale']);
    expect(JSON.stringify(mine)).not.toMatch(/privatePin|mobile|farmId|storageKey/);

    await as(owner).del(`${saved}/${sale.id as string}`).expect(404);
    await prisma.request.update({
      where: { id: BigInt(rent.id as string) },
      data: { status: 'approved', visibility: 'private', publishedAt: null },
    });
    const visible = json(await as(buyer).get(saved).expect(200));
    expect(visible.items).toEqual([expect.objectContaining({ id: sale.id, listingType: 'sale' })]);
    expect(await prisma.savedItem.count({ where: { userId: buyer.id } })).toBe(2);
    await as(buyer).del(`${saved}/${rent.id as string}`).expect(204);
    await as(buyer).del(`${saved}/${sale.id as string}`).expect(204);
  });
});
