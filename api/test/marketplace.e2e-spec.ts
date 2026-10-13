import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { type App } from 'supertest/types';
import { Prisma } from '../src/generated/prisma/client';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/common/app-setup';
import { DevelopmentSmsProvider } from '../src/modules/auth/sms/development-sms.provider';
import { SMS_PROVIDER } from '../src/modules/auth/sms/sms-provider';
import { PUBLIC_LISTING_FIELDS, PUBLIC_LISTING_FORBIDDEN } from '../src/modules/listing-requests/public-listing-contract';
import { PrismaService } from '../src/prisma/prisma.service';
import { createFakePrisma, type FakePrisma } from './support/fake-prisma';

type Json = Record<string, unknown>;
const json = (res: { body: unknown }): Json => res.body as Json;
const INBOX = '/api/v1/staff/listing-requests';
const LIST = '/api/v1/marketplace/farms';

describe('Public marketplace (e2e)', () => {
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
    const mobile = `0101000${String(7000 + counter++)}`;
    const e164 = `+20${mobile.slice(1)}`;
    await http().post('/api/v1/auth/otp/request').send({ mobile }).expect(200);
    const code = sms.lastCodeFor(e164) as string;
    const session = json(await http().post('/api/v1/auth/otp/verify').send({ mobile, code }).expect(200));
    const token = session.accessToken as string;
    await http().post('/api/v1/auth/profile/complete').set('Authorization', bearer(token)).send({ fullName: 'Test Person' }).expect(200);
    const row = db.user.rows.find((item) => item.mobileE164 === e164);
    row!.email = `${counter}@owner.test`;
    return { id: row?.id as bigint, token };
  }
  const as = (u: U) => ({
    post: (path: string, body: object = {}) => http().post(path).set('Authorization', bearer(u.token)).send(body),
  });
  async function staff(): Promise<U> {
    const person = await user();
    await db.staffMembership.create({ data: { userId: person.id, staffRole: 'admin' } });
    return person;
  }
  async function farm(owner: U, body: object): Promise<string> {
    return json(await as(owner).post('/api/v1/farms', body).expect(201)).id as string;
  }
  async function publish(owner: U, admin: U, farmId: string, body: object): Promise<Json> {
    const created = json(await as(owner).post(`/api/v1/farms/${farmId}/listing-requests`, body).expect(201));
    await as(owner).post(`/api/v1/listing-requests/${created.id as string}/submit`).expect(200);
    await as(admin).post(`${INBOX}/${created.id as string}/decision`, { decision: 'approved' }).expect(200);
    return json(await as(admin).post(`${INBOX}/${created.id as string}/publish`).expect(200));
  }

  it('lists and reads only published public listings, with filters, order, and no private fields', async () => {
    const owner = await user();
    const admin = await staff();
    const beheira = await farm(owner, {
      name: 'Orange Orchard',
      farmType: 'fruit',
      areaFeddan: 12.5,
      governorate: 'Beheira',
      areaName: 'Delengat',
    });
    const giza = await farm(owner, {
      name: 'Giza Plot',
      farmType: 'vegetable',
      areaFeddan: 40,
      governorate: 'Giza',
      areaName: 'Kerdasa',
    });
    db.farm.rows.forEach((row) => {
      row.privatePinLatitude = new Prisma.Decimal('30.50000000');
      row.privatePinLongitude = new Prisma.Decimal('30.60000000');
      row.description = 'private farm description';
    });
    const cheap = await publish(owner, admin, beheira, {
      listingType: 'sale',
      askingPrice: 4000,
      statedSalePricePerFeddan: 320,
      listingDescription: 'A quiet orange grove',
      highlights: ['citrus'],
      availability: 'immediate',
    });
    const large = await publish(owner, admin, giza, { listingType: 'sale', askingPrice: 9000 });
    const rent = await publish(owner, admin, beheira, {
      listingType: 'rent',
      annualRentPerFeddan: 700,
      listingDescription: 'Seasonal rent',
    });
    const hidden = json(
      await as(owner)
        .post(`/api/v1/farms/${giza}/listing-requests`, { listingType: 'rent', annualRentPerFeddan: 50 })
        .expect(201),
    );
    await db.farmMedia.create({
      data: { farmId: BigInt(beheira), uploadedBy: owner.id, mediaType: 'photo', storageKey: `farms/${beheira}/media/private.jpg` },
    });

    await http().get('/api/v1/farms/mine').expect(401);
    const open = json(await http().get(LIST).expect(200));
    expect(open.total).toBe(3);
    expect(open.pageSize).toBe(20);
    const items = open.items as Json[];
    expect(items.map((item) => item.id)).toEqual([rent.id, large.id, cheap.id]);
    for (const item of items) {
      expect(Object.keys(item).sort()).toEqual([...PUBLIC_LISTING_FIELDS].sort());
      for (const field of PUBLIC_LISTING_FORBIDDEN) expect(item).not.toHaveProperty(field);
    }
    expect(JSON.stringify(open)).not.toMatch(/privatePin|30\.5|storageKey|licenceStatus|private\.jpg|@owner\.test|mobile|farmId|score|image/);
    expect(items.every((item) => !('images' in item))).toBe(true);

    const detail = json(await http().get(`${LIST}/${cheap.slug as string}`).expect(200));
    expect(detail).toMatchObject({
      id: cheap.id,
      slug: cheap.slug,
      farmName: 'Orange Orchard',
      governorate: 'Beheira',
      areaName: 'Delengat',
      areaFeddan: 12.5,
      listingType: 'sale',
      askingPrice: 4000,
      statedSalePricePerFeddan: 320,
      annualRentPerFeddan: null,
      currency: 'EGP',
      availability: 'immediate',
      listingDescription: 'A quiet orange grove',
      highlights: ['citrus'],
    });
    expect(Object.keys(detail).sort()).toEqual([...PUBLIC_LISTING_FIELDS].sort());
    await http().get(`${LIST}/${hidden.slug as string}`).expect(404);
    await http().get(`${LIST}/NOT-A-SLUG`).expect(400);
    await http().get(`${LIST}/missing-slug`).expect(404);

    expect(json(await http().get(`${LIST}?listingType=rent`).expect(200)).total).toBe(1);
    expect(json(await http().get(`${LIST}?governorate=Beheira&area=Delengat&listingType=sale`).expect(200)).items).toEqual([
      expect.objectContaining({ id: cheap.id }),
    ]);
    expect(json(await http().get(`${LIST}?minArea=20&maxArea=50`).expect(200)).items).toEqual([
      expect.objectContaining({ id: large.id, areaFeddan: 40 }),
    ]);
    expect(json(await http().get(`${LIST}?listingType=sale&minPrice=1000&maxPrice=5000`).expect(200)).items).toEqual([
      expect.objectContaining({ id: cheap.id, askingPrice: 4000 }),
    ]);
    expect(json(await http().get(`${LIST}?listingType=rent&minPrice=100&maxPrice=800`).expect(200)).total).toBe(1);
    const priced = json(await http().get(`${LIST}?minPrice=600&maxPrice=4500`).expect(200));
    expect(priced.total).toBe(2);
    expect((priced.items as Json[]).map((item) => item.id).sort()).toEqual([rent.id, cheap.id].sort());
    expect((json(await http().get(`${LIST}?q=ORANGE`).expect(200)).items as Json[]).map((item) => item.id).sort()).toEqual(
      [cheap.id, rent.id].sort(),
    );
    expect(json(await http().get(`${LIST}?q=quiet`).expect(200)).items).toEqual([expect.objectContaining({ id: cheap.id })]);

    const byPrice = json(await http().get(`${LIST}?listingType=sale&sort=priceAsc`).expect(200));
    expect((byPrice.items as Json[]).map((item) => item.askingPrice)).toEqual([4000, 9000]);
    const byArea = json(await http().get(`${LIST}?sort=areaDesc`).expect(200));
    expect((byArea.items as Json[]).map((item) => item.areaFeddan)).toEqual([40, 12.5, 12.5]);
    const mixed = json(await http().get(`${LIST}?sort=priceAsc`).expect(200));
    expect((mixed.items as Json[]).map((item) => item.id)).toEqual([rent.id, cheap.id, large.id]);

    const page = json(await http().get(`${LIST}?page=2&pageSize=2&sort=oldest`).expect(200));
    expect(page).toMatchObject({ page: 2, pageSize: 2, total: 3 });
    expect(page.items).toHaveLength(1);

    const detailRow = db.farmListingDetail.rows.find((row) => row.slug === large.slug);
    detailRow!.askingPrice = new Prisma.Decimal('1500.25');
    const precise = json(await http().get(`${LIST}?listingType=sale&sort=priceAsc`).expect(200));
    expect(precise.total).toBe(1);
    expect(precise.items).toEqual([expect.objectContaining({ id: cheap.id, askingPrice: 4000 })]);
    await http().get(`${LIST}/${large.slug as string}`).expect(404);

    expect(json(await http().get(LIST).expect(200)).total).toBe(2);
    db.farm.rows.find((row) => row.id === BigInt(giza))!.deletedAt = new Date();
    expect(json(await http().get(LIST).expect(200)).total).toBe(2);
    expect(db.farmMedia.rows[0]?.licenceStatus).toBe('pending_confirmation');
    const mediaId = db.farmMedia.rows[0]?.id?.toString();
    await http().get(`/api/v1/farms/${beheira}/media/${mediaId}/file`).expect(401);

    await http().get(`${LIST}?sort=score`).expect(400);
    await http().get(`${LIST}?page=0`).expect(400);
    await http().get(`${LIST}?pageSize=51`).expect(400);
    await http().get(`${LIST}?minPrice=10&maxPrice=2`).expect(400);
    await http().get(`${LIST}?minArea=3.333`).expect(400);
    await http().get(`${LIST}?listingType=exchange`).expect(400);
    await http().get(`${LIST}?farmId=1`).expect(400);
    expect(json(await http().get(`${LIST}?minPrice=5000000&maxPrice=100000000`).expect(200)).total).toBe(0);
  });

  it('saves a sale and a rent separately, and hides a listing that is no longer public', async () => {
    const owner = await user();
    const buyer = await user();
    const admin = await staff();
    const farmId = await farm(owner, {
      name: 'Saved Orchard',
      farmType: 'fruit',
      areaFeddan: 8,
      governorate: 'Beheira',
      areaName: 'Delengat',
    });
    const sale = await publish(owner, admin, farmId, { listingType: 'sale', askingPrice: 4000 });
    const rent = await publish(owner, admin, farmId, { listingType: 'rent', annualRentPerFeddan: 700 });
    const draft = json(
      await as(owner).post(`/api/v1/farms/${farmId}/listing-requests`, { listingType: 'sale', askingPrice: 1000 }).expect(201),
    );
    const saved = `/api/v1/marketplace/saved`;
    const auth = (token: string) => ({
      get: (path: string) => http().get(path).set('Authorization', bearer(token)),
      post: (path: string, body: object = {}) => http().post(path).set('Authorization', bearer(token)).send(body),
      del: (path: string) => http().delete(path).set('Authorization', bearer(token)),
    });

    await http().get(saved).expect(401);
    await http().post(`${saved}/${sale.id as string}`).expect(401);
    await auth(buyer.token).post(`${saved}/${draft.id as string}`).expect(404);
    await auth(buyer.token).post(`${saved}/0`).expect(400);
    await auth(buyer.token).post(`${saved}/${sale.id as string}`, { note: 'private' }).expect(400);

    const first = json(await auth(buyer.token).post(`${saved}/${sale.id as string}`).expect(200));
    const again = json(await auth(buyer.token).post(`${saved}/${sale.id as string}`).expect(200));
    expect(first).toEqual(again);
    expect(Object.keys(first).sort()).toEqual([...PUBLIC_LISTING_FIELDS].sort());
    await auth(buyer.token).post(`${saved}/${rent.id as string}`).expect(200);
    expect(db.savedItem.rows.filter((row) => row.userId === buyer.id)).toHaveLength(2);

    const mine = json(await auth(buyer.token).get(saved).expect(200));
    expect((mine.items as Json[]).map((item) => item.id)).toEqual([rent.id, sale.id]);
    expect(json(await auth(owner.token).get(saved).expect(200)).items).toEqual([]);
    await auth(owner.token).del(`${saved}/${sale.id as string}`).expect(404);
    expect(db.savedItem.rows.filter((row) => row.userId === buyer.id)).toHaveLength(2);

    db.request.rows.find((row) => row.id === BigInt(sale.id as string))!.status = 'approved';
    db.request.rows.find((row) => row.id === BigInt(sale.id as string))!.visibility = 'private';
    const visible = json(await auth(buyer.token).get(saved).expect(200));
    expect(visible.items).toEqual([expect.objectContaining({ id: rent.id })]);
    expect(db.savedItem.rows.some((row) => row.listingRequestId === BigInt(sale.id as string))).toBe(true);

    await auth(buyer.token).del(`${saved}/${sale.id as string}`).expect(204);
    await auth(buyer.token).del(`${saved}/${rent.id as string}`).expect(204);
    expect(db.savedItem.rows.filter((row) => row.userId === buyer.id)).toHaveLength(0);
  });
});
