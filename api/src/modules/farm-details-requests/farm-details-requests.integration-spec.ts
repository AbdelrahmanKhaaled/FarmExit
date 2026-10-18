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

describeDb('Farm details requests on real MySQL', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let buyer: { id: bigint; token: string };
  let owner: { id: bigint; token: string };
  let slug: string;
  let listingId: bigint;
  let farmId: bigint;
  const userIds: bigint[] = [];

  const as = (token: string) => ({
    post: (path: string, body: object = {}) =>
      request(app.getHttpServer()).post(path).set('Authorization', `Bearer ${token}`).send(body),
  });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    const tokens = app.get(TokenService);

    async function user(mobile: string): Promise<{ id: bigint; token: string }> {
      const row = await prisma.user.create({
        data: { mobileE164: mobile, fullName: 'FD', mobileVerifiedAt: new Date() },
      });
      userIds.push(row.id);
      const session = await prisma.userSession.create({
        data: {
          userId: row.id,
          sessionTokenHash: randomBytes(16).toString('hex'),
          expiresAt: new Date(Date.now() + 3_600_000),
        },
      });
      return { id: row.id, token: tokens.signAccessToken(row.id, session.id) };
    }

    buyer = await user(`+2017${String(randomInt(0, 100_000_000)).padStart(8, '0')}`);
    owner = await user(`+2017${String(randomInt(0, 100_000_000)).padStart(8, '0')}`);
    const farm = await prisma.farm.create({
      data: { name: 'FD Farm', farmType: 'fruit', areaFeddan: 5, governorate: 'Luxor', createdBy: owner.id },
    });
    farmId = farm.id;
    await prisma.farmRelationship.create({
      data: { farmId: farm.id, userId: owner.id, relationshipRole: 'owner', relationshipStatus: 'active' },
    });
    slug = `fd-${randomBytes(5).toString('hex')}`;
    const listing = await prisma.request.create({
      data: {
        requestNumber: `L-${randomBytes(4).toString('hex')}`,
        requestType: 'farmListing',
        status: 'published',
        visibility: 'public',
        createdBy: owner.id,
        farmId: farm.id,
      },
    });
    listingId = listing.id;
    await prisma.farmListingDetail.create({
      data: { requestId: listing.id, slug, listingType: 'rent', annualRentPerFeddan: 400 },
    });
  });

  afterAll(async () => {
    if (prisma) {
      const details = await prisma.request.findMany({ where: { parentRequestId: listingId }, select: { id: true } });
      for (const row of details) {
        await prisma.requestStatusHistory.deleteMany({ where: { requestId: row.id } });
        await prisma.request.deleteMany({ where: { id: row.id } });
      }
      await prisma.farmListingDetail.deleteMany({ where: { requestId: listingId } });
      await prisma.requestStatusHistory.deleteMany({ where: { requestId: listingId } });
      await prisma.request.deleteMany({ where: { id: listingId } });
      await prisma.farmRelationship.deleteMany({ where: { farmId } });
      await prisma.farm.deleteMany({ where: { id: farmId } });
      for (const id of userIds) {
        await prisma.userSession.deleteMany({ where: { userId: id } });
        await prisma.user.deleteMany({ where: { id } });
      }
    }
    await app?.close();
  });

  it('prevents duplicate active details requests for the same listing', async () => {
    await as(buyer.token).post('/api/v1/farm-details-requests', { listingSlug: slug }).expect(201);
    await as(buyer.token).post('/api/v1/farm-details-requests', { listingSlug: slug }).expect(409);
  });
});
