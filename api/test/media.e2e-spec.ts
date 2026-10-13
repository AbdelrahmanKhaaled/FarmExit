import { Logger, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { type App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/common/app-setup';
import { DevelopmentSmsProvider } from '../src/modules/auth/sms/development-sms.provider';
import { SMS_PROVIDER } from '../src/modules/auth/sms/sms-provider';
import { MAX_MEDIA_PER_FACILITY } from '../src/modules/media/facility-media.service';
import { MAX_MEDIA_PER_FARM } from '../src/modules/media/farm-media.service';
import { OBJECT_STORAGE } from '../src/modules/media/storage/object-storage';
import { PrismaService } from '../src/prisma/prisma.service';
import { createFakePrisma, type FakePrisma } from './support/fake-prisma';
import { GPS_MARKER, makeJpeg, makePng, makeWebp, MemoryObjectStorage } from './support/images';

type Json = Record<string, unknown>;
const json = (res: { body: unknown }): Json => res.body as Json;
const FARM = { name: 'Wadi Orchard', farmType: 'fruit', areaFeddan: 12.5, governorate: 'Beheira' };
const FACILITY = { facilityType: 'cold_storage_freezing', name: 'Cold Room A' };

describe('Farm & facility media (e2e)', () => {
  let app: INestApplication<App>;
  let db: FakePrisma;
  let storage: MemoryObjectStorage;
  let sms: DevelopmentSmsProvider;
  const http = () => request(app.getHttpServer());
  const bearer = (token: unknown) => `Bearer ${token as string}`;

  beforeEach(async () => {
    db = createFakePrisma();
    storage = new MemoryObjectStorage();
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(db)
      .overrideProvider(OBJECT_STORAGE)
      .useValue(storage)
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
  async function user(complete = true): Promise<U> {
    const mobile = `0101000${String(5000 + counter++)}`;
    const e164 = `+20${mobile.slice(1)}`;
    await http().post('/api/v1/auth/otp/request').send({ mobile }).expect(200);
    const code = sms.lastCodeFor(e164) as string;
    const session = json(await http().post('/api/v1/auth/otp/verify').send({ mobile, code }).expect(200));
    const token = session.accessToken as string;
    if (complete) {
      await http()
        .post('/api/v1/auth/profile/complete')
        .set('Authorization', bearer(token))
        .send({ fullName: 'Test Person' })
        .expect(200);
    }
    return { id: db.user.rows.find((r) => r.mobileE164 === e164)?.id as bigint, token };
  }
  const auth = (u: U, req: request.Test) => req.set('Authorization', bearer(u.token));
  const jpeg = makeJpeg();
  const upload = (u: U, path: string, buf: Buffer = jpeg, filename = 'photo.jpg', contentType = 'image/jpeg') =>
    auth(u, http().post(path)).attach('file', buf, { filename, contentType });
  const get = (u: U, path: string) => auth(u, http().get(path));

  const newFarm = async (u: U): Promise<string> =>
    json(await auth(u, http().post('/api/v1/farms')).send(FARM).expect(201)).id as string;
  const newFacility = async (u: U, farmId: string): Promise<string> =>
    json(
      await auth(u, http().post(`/api/v1/farms/${farmId}/facilities`))
        .send(FACILITY)
        .expect(201),
    ).id as string;
  const relate = (userId: bigint, farmId: string, relationshipRole: string, extra: Json = {}) =>
    db.farmRelationship.create({ data: { userId, farmId: BigInt(farmId), relationshipRole, ...extra } });

  async function setup() {
    const owner = await user();
    const farmId = await newFarm(owner);
    const facilityId = await newFacility(owner, farmId);
    const roles: Record<string, U> = {};
    for (const role of ['manager', 'tenant', 'partner', 'agriculturalEngineer']) {
      roles[role] = await user();
      await relate(roles[role].id, farmId, role);
    }
    return { owner, farmId, facilityId, roles, stranger: await user() };
  }
  const F = (farmId: string) => `/api/v1/farms/${farmId}/media`;
  const FAC = (farmId: string, facilityId: string) => `/api/v1/farms/${farmId}/facilities/${facilityId}/media`;

  describe('uploads', () => {
    it.each([
      ['jpeg', makeJpeg(), 'a.jpg', 'image/jpeg', 'jpg'],
      ['png', makePng(), 'a.png', 'image/png', 'png'],
      ['webp', makeWebp(), 'a.webp', 'image/webp', 'webp'],
    ])('stores a valid %s for a farm and a facility', async (_k, buf, filename, mime, ext) => {
      const { owner, farmId, facilityId } = await setup();
      const farmRes = json(
        await upload(owner, F(farmId), buf, filename, mime).field('altEn', ' Front gate ').expect(201),
      );
      expect(farmRes).toMatchObject({
        farmId,
        mediaType: 'photo',
        contentType: mime,
        altEn: 'Front gate',
        isIllustrative: false,
        licenceStatus: 'pending_confirmation',
        sortOrder: 0,
      });
      const facRes = json(await upload(owner, FAC(farmId, facilityId), buf, filename, mime).expect(201));
      expect(facRes).toMatchObject({ facilityId, farmId, contentType: mime });
      const keys = [...storage.objects.keys()];
      expect(keys).toHaveLength(2);
      expect(keys[0]).toMatch(new RegExp(`^farms/${farmId}/media/[0-9a-f-]{36}\\.${ext}$`));
      expect(keys[1]).toMatch(new RegExp(`^facilities/${facilityId}/media/[0-9a-f-]{36}\\.${ext}$`));
      expect(db.farmMedia.rows[0]).toMatchObject({ uploadedBy: owner.id, farmId: BigInt(farmId), mediaType: 'photo' });
    });

    it('lets the owner flag an illustrative image and ignores nothing silently', async () => {
      const { owner, farmId } = await setup();
      const res = json(await upload(owner, F(farmId)).field('isIllustrative', 'true').expect(201));
      expect(res.isIllustrative).toBe(true);
      await upload(owner, F(farmId)).field('isIllustrative', 'maybe').expect(400);
    });

    it('never uses the client file name or paths in storage keys and responses', async () => {
      const { owner, farmId } = await setup();
      const res = await upload(owner, F(farmId), jpeg, 'My Secret Farm Plan.jpg').expect(201);
      expect(JSON.stringify(res.body)).not.toContain('Secret');
      expect([...storage.objects.keys()][0]).not.toContain('Secret');
    });

    it('neutralizes traversal file names (stripped to a base name or rejected, never used in a path)', async () => {
      const { owner, farmId } = await setup();
      for (const name of ['../../evil.png', '..\\..\\evil.png', '/etc/evil.png']) {
        const res = await upload(owner, F(farmId), makePng(), name, 'image/png');
        expect([201, 400]).toContain(res.status);
      }
      for (const key of storage.objects.keys()) expect(key).toMatch(/^farms\/\d+\/media\/[0-9a-f-]{36}\.png$/);
    });

    it('strips GPS metadata from the stored bytes', async () => {
      const { owner, farmId } = await setup();
      const gps = [
        [makeJpeg({ gps: true }), 'a.jpg', 'image/jpeg'],
        [makePng({ gps: true }), 'a.png', 'image/png'],
        [makeWebp({ gps: true }), 'a.webp', 'image/webp'],
      ] as const;
      for (const [buf, name, mime] of gps) {
        expect(buf.includes(GPS_MARKER)).toBe(true);
        await upload(owner, F(farmId), buf, name, mime).expect(201);
      }
      for (const stored of storage.objects.values()) expect(stored.includes(GPS_MARKER)).toBe(false);
    });

    it('rejects invalid files without storing anything', async () => {
      const { owner, farmId } = await setup();
      const text = Buffer.from('<?php system($_GET["c"]); ?>'.padEnd(64, ' '));
      const cases: [string, Buffer, string, string, number][] = [
        ['text disguised as jpg', text, 'a.jpg', 'image/jpeg', 415],
        ['png content named jpg', makePng(), 'a.jpg', 'image/jpeg', 415],
        ['png content, jpeg content type', makePng(), 'a.png', 'image/jpeg', 415],
        ['gif extension', makePng(), 'a.gif', 'image/gif', 415],
        [
          'svg',
          Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'.padEnd(64, ' ')),
          'a.svg',
          'image/svg+xml',
          415,
        ],
        ['double extension', makePng(), 'shell.php.png', 'image/png', 400],
        ['no extension', makePng(), 'photo', 'image/png', 400],
        ['empty file', Buffer.alloc(0), 'a.png', 'image/png', 400],
        ['truncated image', makePng().subarray(0, 40), 'a.png', 'image/png', 415],
        ['huge dimensions', makePng({ width: 50_000, height: 50_000 }), 'a.png', 'image/png', 415],
      ];
      for (const [label, buf, name, mime, status] of cases) {
        const res = await upload(owner, F(farmId), buf, name, mime);
        expect({ label, status: res.status }).toEqual({ label, status });
      }
      expect(storage.objects.size).toBe(0);
      expect(db.farmMedia.rows).toHaveLength(0);
    });

    it('enforces size limits (413) and does not store the file', async () => {
      const { owner, farmId } = await setup();
      const over = Buffer.concat([makePng(), Buffer.alloc(5_242_880)]);
      await upload(owner, F(farmId), over, 'a.png', 'image/png').expect(413);
      const huge = Buffer.concat([makePng(), Buffer.alloc(11_000_000)]);
      await upload(owner, F(farmId), huge, 'a.png', 'image/png').expect(413);
      expect(storage.objects.size).toBe(0);
    });

    it('rejects missing files, wrong field names and extra files', async () => {
      const { owner, farmId } = await setup();
      await auth(owner, http().post(F(farmId)))
        .field('altEn', 'x')
        .expect(400);
      await auth(owner, http().post(F(farmId)))
        .attach('image', jpeg, { filename: 'a.jpg', contentType: 'image/jpeg' })
        .expect(400);
      await auth(owner, http().post(F(farmId)))
        .attach('file', jpeg, { filename: 'a.jpg', contentType: 'image/jpeg' })
        .attach('file', jpeg, { filename: 'b.jpg', contentType: 'image/jpeg' })
        .expect(400);
      await auth(owner, http().post(F(farmId)))
        .send({ altEn: 'json body' })
        .expect(400);
      expect(storage.objects.size).toBe(0);
    });

    it.each([
      'farmId',
      'uploadedBy',
      'storageKey',
      'mediaType',
      'status',
      'licenceStatus',
      'owner',
      'sortOrder',
      'url',
      'ownerUserId',
    ])('rejects mass-assigned field %s', async (field) => {
      const { owner, farmId, facilityId } = await setup();
      await upload(owner, F(farmId)).field(field, '1').expect(400);
      await upload(owner, FAC(farmId, facilityId)).field(field, '1').expect(400);
      expect(storage.objects.size).toBe(0);
      expect(db.farmMedia.rows).toHaveLength(0);
    });

    it('rejects isIllustrative on facility images and overlong alt text', async () => {
      const { owner, farmId, facilityId } = await setup();
      await upload(owner, FAC(farmId, facilityId)).field('isIllustrative', 'true').expect(400);
      await upload(owner, F(farmId)).field('altEn', 'x'.repeat(256)).expect(400);
    });

    it('caps images per farm and per facility (409) and assigns sort order on the server', async () => {
      const { owner, farmId, facilityId } = await setup();
      for (let i = 0; i < 2; i++) await upload(owner, F(farmId)).expect(201);
      expect(db.farmMedia.rows.map((r) => r.sortOrder)).toEqual([0, 1]);
      for (let i = 0; i < MAX_MEDIA_PER_FARM - 2; i++) {
        await db.farmMedia.create({
          data: {
            farmId: BigInt(farmId),
            uploadedBy: owner.id,
            mediaType: 'photo',
            storageKey: `farms/${farmId}/media/x${i}.jpg`,
            sortOrder: i + 2,
          },
        });
      }
      await upload(owner, F(farmId)).expect(409);
      for (let i = 0; i < MAX_MEDIA_PER_FACILITY; i++) {
        await db.facilityMedia.create({
          data: {
            facilityId: BigInt(facilityId),
            uploadedBy: owner.id,
            mediaType: 'photo',
            storageKey: `facilities/${facilityId}/media/x${i}.jpg`,
            sortOrder: i,
          },
        });
      }
      await upload(owner, FAC(farmId, facilityId)).expect(409);
    });
  });

  describe('authorization', () => {
    it('lets owner and manager upload; other roles view but cannot upload (403)', async () => {
      const { owner, farmId, facilityId, roles } = await setup();
      await upload(owner, F(farmId)).expect(201);
      await upload(roles.manager, F(farmId)).expect(201);
      await upload(roles.manager, FAC(farmId, facilityId)).expect(201);
      for (const role of ['tenant', 'partner', 'agriculturalEngineer']) {
        const u = roles[role];
        await upload(u, F(farmId)).expect(403);
        await upload(u, FAC(farmId, facilityId)).expect(403);
        const list = json(await get(u, F(farmId)).expect(200));
        expect(list.total).toBe(2);
        await get(u, FAC(farmId, facilityId)).expect(200);
        const id = (list.items as Json[])[0]?.id as string;
        await get(u, `${F(farmId)}/${id}`).expect(200);
        await get(u, `${F(farmId)}/${id}/file`).expect(200);
      }
      expect(storage.objects.size).toBe(3);
    });

    it('hides media from strangers, other farm owners, staff and inactive/expired roles (404)', async () => {
      const { owner, farmId, facilityId, roles, stranger } = await setup();
      const id = json(await upload(owner, F(farmId)).expect(201)).id as string;
      const facMedia = json(await upload(owner, FAC(farmId, facilityId)).expect(201)).id as string;
      const otherOwner = await user();
      await newFarm(otherOwner);
      const admin = await user();
      await db.staffMembership.create({ data: { userId: admin.id, staffRole: 'admin' } });
      const lapsed = await user();
      await relate(lapsed.id, farmId, 'owner', { relationshipStatus: 'inactive' });
      const expired = await user();
      await relate(expired.id, farmId, 'manager', { endsAt: new Date(Date.now() - 1000) });
      db.farmRelationship.rows.find((r) => r.userId === roles.tenant?.id)!.relationshipStatus = 'inactive';

      for (const u of [stranger, otherOwner, admin, lapsed, expired, roles.tenant]) {
        await upload(u, F(farmId)).expect(404);
        await upload(u, FAC(farmId, facilityId)).expect(404);
        await get(u, F(farmId)).expect(404);
        await get(u, `${F(farmId)}/${id}`).expect(404);
        await get(u, `${F(farmId)}/${id}/file`).expect(404);
        await get(u, FAC(farmId, facilityId)).expect(404);
        await get(u, `${FAC(farmId, facilityId)}/${facMedia}`).expect(404);
        await get(u, `${FAC(farmId, facilityId)}/${facMedia}/file`).expect(404);
      }
      expect(storage.objects.size).toBe(2);
    });

    it('requires authentication and a completed profile', async () => {
      const { owner, farmId, facilityId } = await setup();
      const id = json(await upload(owner, F(farmId)).expect(201)).id as string;
      await http().get(F(farmId)).expect(401);
      await http()
        .get(`${F(farmId)}/${id}/file`)
        .expect(401);
      await http().post(F(farmId)).attach('file', jpeg, { filename: 'a.jpg', contentType: 'image/jpeg' }).expect(401);
      await http()
        .get(`${FAC(farmId, facilityId)}`)
        .expect(401);
      await http().get(F(farmId)).set('Authorization', 'Bearer garbage').expect(401);
      const incomplete = await user(false);
      for (const res of [await upload(incomplete, F(farmId)), await get(incomplete, `${F(farmId)}/${id}/file`)]) {
        expect(res.status).toBe(403);
        expect(json(res).code).toBe('PROFILE_INCOMPLETE');
      }
    });

    it('prevents cross-farm and cross-facility access (IDOR)', async () => {
      const a = await setup();
      const b = await setup();
      const aMedia = json(await upload(a.owner, F(a.farmId)).expect(201)).id as string;
      await upload(a.owner, FAC(a.farmId, a.facilityId)).expect(201); // keep ids of the two tables distinct
      const aFac = json(await upload(a.owner, FAC(a.farmId, a.facilityId)).expect(201)).id as string;
      const bFacility2 = await newFacility(b.owner, b.farmId);

      // b's owner knows a's media id but only owns farm b
      await get(b.owner, `${F(b.farmId)}/${aMedia}`).expect(404);
      await get(b.owner, `${F(b.farmId)}/${aMedia}/file`).expect(404);
      await get(b.owner, `${F(a.farmId)}/${aMedia}`).expect(404);
      await get(b.owner, `${FAC(b.farmId, b.facilityId)}/${aFac}`).expect(404);
      await get(b.owner, `${FAC(b.farmId, b.facilityId)}/${aFac}/file`).expect(404);
      // a's facility id under b's farm, and facility media id under the farm-media route
      await get(b.owner, FAC(b.farmId, a.facilityId)).expect(404);
      await upload(b.owner, FAC(b.farmId, a.facilityId)).expect(404);
      await get(a.owner, `${F(a.farmId)}/${aFac}`).expect(404);
      await upload(a.owner, F(a.farmId)).expect(201);
      const aMedia3 = json(await upload(a.owner, F(a.farmId)).expect(201)).id as string; // id 3 exists only as farm media
      await get(a.owner, `${FAC(a.farmId, a.facilityId)}/${aMedia3}`).expect(404);
      // sibling facility on the same farm does not see the other facility's media
      await get(b.owner, `${FAC(b.farmId, bFacility2)}/${aFac}`).expect(404);
      // a deleted facility is gone
      db.agriculturalFacility.rows.find((f) => f.id === BigInt(a.facilityId))!.deletedAt = new Date();
      await get(a.owner, FAC(a.farmId, a.facilityId)).expect(404);
      await upload(a.owner, FAC(a.farmId, a.facilityId)).expect(404);
    });

    it('returns 400 for invalid ids', async () => {
      const { owner, farmId } = await setup();
      for (const path of [
        F('abc'),
        `${F(farmId)}/xyz`,
        `${F(farmId)}/0/file`,
        `${F(farmId)}/-1`,
        FAC(farmId, 'nope'),
      ]) {
        await get(owner, path).expect(400);
      }
    });
  });

  describe('metadata and serving', () => {
    it('lists with pagination and never exposes storage keys or uploader ids', async () => {
      const { owner, farmId, facilityId } = await setup();
      for (let i = 0; i < 3; i++) await upload(owner, F(farmId)).expect(201);
      await upload(owner, FAC(farmId, facilityId)).expect(201);
      const page = json(await get(owner, `${F(farmId)}?page=2&pageSize=2`).expect(200));
      expect(page).toMatchObject({ page: 2, pageSize: 2, total: 3 });
      expect(page.items as Json[]).toHaveLength(1);
      const all = await get(owner, F(farmId)).expect(200);
      const facAll = await get(owner, FAC(farmId, facilityId)).expect(200);
      for (const body of [JSON.stringify(all.body), JSON.stringify(facAll.body)]) {
        expect(body).not.toMatch(/storageKey|storage_key|uploadedBy|uploaded_by|\/media\/[0-9a-f]{8}-/);
        expect(body).not.toContain(process.cwd());
      }
      expect((all.body as Json & { items: Json[] }).items[0]?.url).toMatch(/^\/api\/v1\/farms\/\d+\/media\/\d+\/file$/);
      await get(owner, `${F(farmId)}?pageSize=500`).expect(400);
    });

    it('serves the sanitized image with safe private headers', async () => {
      const { owner, farmId, facilityId } = await setup();
      const png = makePng({ gps: true });
      const id = json(await upload(owner, F(farmId), png, 'a.png', 'image/png').expect(201)).id as string;
      const res = await get(owner, `${F(farmId)}/${id}/file`)
        .buffer(true)
        .parse(binary)
        .expect(200);
      expect(res.headers['content-type']).toBe('image/png');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['cache-control']).toBe('private, no-store');
      expect(res.headers['content-disposition']).toBe(`inline; filename="farm-image-${id}.png"`);
      expect(res.headers['content-security-policy']).toContain("default-src 'none'");
      expect((res.body as Buffer).includes(GPS_MARKER)).toBe(false);
      expect((res.body as Buffer).subarray(1, 4).toString()).toBe('PNG');

      const fid = json(await upload(owner, FAC(farmId, facilityId), makeWebp(), 'a.webp', 'image/webp').expect(201))
        .id as string;
      const fres = await get(owner, `${FAC(farmId, facilityId)}/${fid}/file`)
        .buffer(true)
        .parse(binary)
        .expect(200);
      expect(fres.headers['content-type']).toBe('image/webp');
      expect(fres.headers['content-disposition']).toBe(`inline; filename="facility-image-${fid}.webp"`);
    });

    it('never serves files for malicious or missing storage keys', async () => {
      const { owner, farmId } = await setup();
      const evil = [
        '../../../etc/passwd',
        '/etc/passwd',
        'farms/1/media/../../../x.png',
        'C:\\windows\\win.ini',
        'farms/99/media/ab.jpg',
      ];
      for (const storageKey of evil) {
        const row = await db.farmMedia.create({
          data: { farmId: BigInt(farmId), uploadedBy: owner.id, mediaType: 'photo', storageKey },
        });
        await get(owner, `${F(farmId)}/${String(row.id)}/file`).expect(404);
      }
      const missing = await db.farmMedia.create({
        data: {
          farmId: BigInt(farmId),
          uploadedBy: owner.id,
          mediaType: 'photo',
          storageKey: `farms/${farmId}/media/123e4567-e89b-42d3-a456-426614174000.jpg`,
        },
      });
      await get(owner, `${F(farmId)}/${String(missing.id)}/file`).expect(404);
    });

    it('does not stream a well-formed key that belongs to another farm or facility', async () => {
      const a = await setup();
      const b = await setup();
      const foreignFarm = `farms/${b.farmId}/media/123e4567-e89b-42d3-a456-426614174001.jpg`;
      storage.objects.set(foreignFarm, Buffer.from('other-farm-secret-bytes'));
      const farmRow = await db.farmMedia.create({
        data: { farmId: BigInt(a.farmId), uploadedBy: a.owner.id, mediaType: 'photo', storageKey: foreignFarm },
      });
      const denied = await get(a.owner, `${F(a.farmId)}/${String(farmRow.id)}/file`);
      expect(denied.status).toBe(404);
      expect(JSON.stringify(denied.body)).not.toContain('other-farm-secret');

      const foreignFacility = `facilities/${b.facilityId}/media/123e4567-e89b-42d3-a456-426614174002.png`;
      storage.objects.set(foreignFacility, Buffer.from('other-facility-secret'));
      const facilityRow = await db.facilityMedia.create({
        data: {
          facilityId: BigInt(a.facilityId),
          uploadedBy: a.owner.id,
          mediaType: 'photo',
          storageKey: foreignFacility,
        },
      });
      await get(a.owner, `${FAC(a.farmId, a.facilityId)}/${String(facilityRow.id)}/file`).expect(404);

      const own = `farms/${a.farmId}/media/123e4567-e89b-42d3-a456-426614174003.jpg`;
      storage.objects.set(own, Buffer.from('own-bytes'));
      const ownRow = await db.farmMedia.create({
        data: { farmId: BigInt(a.farmId), uploadedBy: a.owner.id, mediaType: 'photo', storageKey: own },
      });
      const ok = await get(a.owner, `${F(a.farmId)}/${String(ownRow.id)}/file`)
        .buffer(true)
        .parse(binary)
        .expect(200);
      expect((ok.body as Buffer).toString()).toBe('own-bytes');
    });
  });

  describe('failures', () => {
    it('storage put failure leaves no database row', async () => {
      const { owner, farmId, facilityId } = await setup();
      storage.failPut = true;
      await upload(owner, F(farmId)).expect(500);
      await upload(owner, FAC(farmId, facilityId)).expect(500);
      expect(db.farmMedia.rows).toHaveLength(0);
      expect(db.facilityMedia.rows).toHaveLength(0);
      expect(storage.objects.size).toBe(0);
    });

    it('database failure deletes the stored object', async () => {
      const { owner, farmId, facilityId } = await setup();
      jest.spyOn(db.farmMedia, 'create').mockRejectedValueOnce(new Error('db down'));
      jest.spyOn(db.facilityMedia, 'create').mockRejectedValueOnce(new Error('db down'));
      const res = await upload(owner, F(farmId)).expect(500);
      await upload(owner, FAC(farmId, facilityId)).expect(500);
      expect(JSON.stringify(res.body)).not.toContain('db down');
      expect(storage.objects.size).toBe(0);
      expect(db.farmMedia.rows).toHaveLength(0);
    });

    it('logs (without leaking) when cleanup also fails', async () => {
      const { owner, farmId } = await setup();
      const log = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
      jest.spyOn(db.farmMedia, 'create').mockRejectedValueOnce(new Error('db down'));
      storage.failDelete = true;
      const res = await upload(owner, F(farmId)).expect(500);
      expect(JSON.stringify(res.body)).not.toMatch(/farms\/\d+\/media|cannot delete/);
      expect(log.mock.calls.some((c) => String(c[0]).includes(`farms/${farmId}/media/`))).toBe(true);
    });
  });

  describe('surface', () => {
    it('has no delete, update or public routes', async () => {
      const { owner, farmId } = await setup();
      const id = json(await upload(owner, F(farmId)).expect(201)).id as string;
      await auth(owner, http().delete(`${F(farmId)}/${id}`)).expect(404);
      await auth(owner, http().patch(`${F(farmId)}/${id}`))
        .send({})
        .expect(404);
      await auth(owner, http().put(`${F(farmId)}/${id}`))
        .send({})
        .expect(404);
      expect(storage.objects.size).toBe(1);
    });

    it('documents the endpoints in Swagger', async () => {
      const { SwaggerModule, DocumentBuilder } = await import('@nestjs/swagger');
      const doc = SwaggerModule.createDocument(app, new DocumentBuilder().setTitle('t').build());
      const paths = Object.keys(doc.paths);
      for (const p of [
        '/api/v1/farms/{id}/media',
        '/api/v1/farms/{id}/media/{mediaId}',
        '/api/v1/farms/{id}/media/{mediaId}/file',
        '/api/v1/farms/{id}/facilities/{facilityId}/media',
        '/api/v1/farms/{id}/facilities/{facilityId}/media/{mediaId}',
        '/api/v1/farms/{id}/facilities/{facilityId}/media/{mediaId}/file',
      ]) {
        expect(paths).toContain(p);
      }
      expect(doc.paths['/api/v1/farms/{id}/media']?.post?.requestBody).toBeDefined();
    });
  });
});

function binary(response: unknown, cb: (err: Error | null, body: Buffer) => void): void {
  const res = response as NodeJS.ReadableStream;
  const chunks: Buffer[] = [];
  res.on('data', (c: Buffer) => chunks.push(c));
  res.on('end', () => cb(null, Buffer.concat(chunks)));
}
