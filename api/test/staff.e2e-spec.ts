import { createHmac } from 'node:crypto';
import { type INestApplication, Controller, Get, Param } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { type App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/common/app-setup';
import { RequireCompletedProfile } from '../src/modules/auth/auth-guards.decorators';
import { CurrentAuth } from '../src/modules/auth/auth.decorators';
import type { AuthContext } from '../src/modules/auth/auth.types';
import { SMS_PROVIDER } from '../src/modules/auth/sms/sms-provider';
import { DevelopmentSmsProvider } from '../src/modules/auth/sms/development-sms.provider';
import { AuthorizationModule } from '../src/modules/authorization/authorization.module';
import { FarmAccessService } from '../src/modules/authorization/farm-access.service';
import { StaffPermission } from '../src/modules/authorization/staff-permissions';
import { StaffOnly, StaffPermissions, StaffRoles } from '../src/modules/authorization/staff.decorators';
import { PrismaService } from '../src/prisma/prisma.service';
import { createFakePrisma, type FakePrisma } from './support/fake-prisma';

type Json = Record<string, unknown>;
const json = (res: { body: unknown }): Json => res.body as Json;

/** Stand-ins for future Admin Dashboard routes. They exist only in this test. */
@Controller('probe-staff')
@StaffOnly()
class StaffProbeController {
  @Get('any')
  any(): { ok: true } {
    return { ok: true };
  }

  @Get('admin')
  @StaffRoles('admin')
  admin(): { ok: true } {
    return { ok: true };
  }

  @Get('review')
  @StaffPermissions(StaffPermission.RequestsReview)
  review(): { ok: true } {
    return { ok: true };
  }
}

/** A farm-scoped resource: farm owner/manager, or staff who may read requests. */
@Controller('probe-farms')
@RequireCompletedProfile()
class FarmProbeController {
  constructor(private readonly farmAccess: FarmAccessService) {}

  @Get(':farmId')
  async farm(@Param('farmId') farmId: string, @CurrentAuth() auth: AuthContext): Promise<{ ok: true }> {
    await this.farmAccess.assertAccess(auth.userId, BigInt(farmId), {
      farmRoles: ['owner', 'manager'],
      staffPermission: StaffPermission.RequestsRead,
    });
    return { ok: true };
  }
}

describe('Staff authorization (e2e)', () => {
  let app: INestApplication<App>;
  let db: FakePrisma;
  let sms: DevelopmentSmsProvider;
  const http = () => request(app.getHttpServer());
  const bearer = (token: unknown) => `Bearer ${token as string}`;

  beforeEach(async () => {
    db = createFakePrisma();
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule, AuthorizationModule],
      controllers: [StaffProbeController, FarmProbeController],
    })
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
  /** A signed-in user. `complete: false` leaves the profile incomplete. */
  async function user(complete = true): Promise<{ id: bigint; token: string }> {
    const mobile = `0101000${String(1000 + counter++)}`;
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
    const row = db.user.rows.find((r) => r.mobileE164 === e164);
    return { id: row?.id as bigint, token };
  }

  const makeStaff = (userId: bigint, ...roles: string[]) =>
    Promise.all(roles.map((staffRole) => db.staffMembership.create({ data: { userId, staffRole } })));
  const get = (path: string, token?: string) => {
    const req = http().get(path);
    return token ? req.set('Authorization', bearer(token)) : req;
  };

  describe('GET /staff/me', () => {
    it('401 without a token, with garbage, or with a tampered token', async () => {
      await get('/api/v1/staff/me').expect(401);
      await get('/api/v1/staff/me', 'garbage').expect(401);
      const u = await user();
      const [h, , s] = u.token.split('.') as [string, string, string];
      const body = Buffer.from(JSON.stringify({ sub: '1', roles: ['admin'] })).toString('base64url');
      await get('/api/v1/staff/me', `${h}.${body}.${s}`).expect(401);
    });

    it('403 for a signed-in non-staff user, with a generic body', async () => {
      const u = await user();
      const res = await get('/api/v1/staff/me', u.token).expect(403);
      expect(json(res)).toMatchObject({ statusCode: 403, code: 'FORBIDDEN' });
    });

    it('403 PROFILE_INCOMPLETE even for staff with an incomplete profile', async () => {
      const u = await user(false);
      await makeStaff(u.id, 'admin');
      const res = await get('/api/v1/staff/me', u.token).expect(403);
      expect(json(res).code).toBe('PROFILE_INCOMPLETE');
    });

    it.each([
      ['admin', ['admin'], Object.values(StaffPermission).sort()],
      ['caseAgent', ['caseAgent'], ['communication.relay', 'requests.forward', 'requests.read']],
      ['reviewer', ['reviewer'], ['evaluations.manage', 'requests.read', 'requests.review']],
    ])('returns identity and permissions for %s', async (_name, roles, permissions) => {
      const u = await user();
      await makeStaff(u.id, ...roles);
      const res = await get('/api/v1/staff/me', u.token).expect(200);
      expect(json(res)).toEqual({ id: u.id.toString(), fullName: 'Test Person', roles, permissions });
    });

    it('merges multiple memberships', async () => {
      const u = await user();
      await makeStaff(u.id, 'caseAgent', 'reviewer');
      const res = json(await get('/api/v1/staff/me', u.token).expect(200));
      expect(res.roles).toEqual(['caseAgent', 'reviewer']);
      expect(res.permissions).toEqual([
        'communication.relay',
        'evaluations.manage',
        'requests.forward',
        'requests.read',
        'requests.review',
      ]);
    });

    it('checks the membership on every request: revocation applies to the same token immediately', async () => {
      const u = await user();
      await makeStaff(u.id, 'admin');
      await get('/api/v1/staff/me', u.token).expect(200);
      db.staffMembership.rows[0].status = 'inactive';
      await get('/api/v1/staff/me', u.token).expect(403);
      db.staffMembership.rows[0].status = 'active';
      await get('/api/v1/staff/me', u.token).expect(200);
    });

    it('is not affected by a suspended account (authentication wins)', async () => {
      const u = await user();
      await makeStaff(u.id, 'admin');
      const row = db.user.rows.find((r) => r.id === u.id) as Json;
      row.accountStatus = 'suspended';
      await get('/api/v1/staff/me', u.token).expect(401);
    });
  });

  describe('privilege escalation and malformed data', () => {
    it('denies memberships with an unknown role or a non-active status', async () => {
      const u = await user();
      for (const [staffRole, status] of [
        ['superadmin', 'active'],
        ['admin', 'Active'],
        ['admin', 'suspended'],
        ['admin', ''],
      ] as const) {
        db.staffMembership.rows.length = 0;
        await db.staffMembership.create({ data: { userId: u.id, staffRole, status } });
        await get('/api/v1/staff/me', u.token).expect(403);
      }
    });

    it("never applies another user's membership, and a revoked admin keeps nothing", async () => {
      const admin = await user();
      const other = await user();
      await makeStaff(admin.id, 'admin');
      await get('/api/v1/staff/me', other.token).expect(403);
      await get('/api/v1/probe-staff/admin', other.token).expect(403);
      db.staffMembership.rows[0].status = 'inactive';
      await get('/api/v1/probe-staff/admin', admin.token).expect(403);
      await get('/api/v1/probe-farms/1', admin.token).expect(403);
    });

    it('answers an out-of-range refresh session id with 401, not a server error', async () => {
      await http()
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: `9999999999999999999.${'a'.repeat(43)}` })
        .expect(401);
    });
  });

  describe('decorators on protected routes', () => {
    it('401 / 403 / 200 per role and permission', async () => {
      const admin = await user();
      const agent = await user();
      const reviewer = await user();
      const nobody = await user();
      await makeStaff(admin.id, 'admin');
      await makeStaff(agent.id, 'caseAgent');
      await makeStaff(reviewer.id, 'reviewer');

      await get('/api/v1/probe-staff/any').expect(401);
      await get('/api/v1/probe-staff/any', nobody.token).expect(403);

      for (const u of [admin, agent, reviewer]) await get('/api/v1/probe-staff/any', u.token).expect(200);

      await get('/api/v1/probe-staff/admin', admin.token).expect(200);
      await get('/api/v1/probe-staff/admin', agent.token).expect(403);
      await get('/api/v1/probe-staff/admin', reviewer.token).expect(403);

      await get('/api/v1/probe-staff/review', admin.token).expect(200);
      await get('/api/v1/probe-staff/review', reviewer.token).expect(200);
      await get('/api/v1/probe-staff/review', agent.token).expect(403);
    });
  });

  describe('client-supplied roles are never trusted', () => {
    it('ignores headers, query and body role values', async () => {
      const u = await user();
      await http()
        .get('/api/v1/staff/me?role=admin&staffRole=admin&roles=admin')
        .set('Authorization', bearer(u.token))
        .set('X-Staff-Role', 'admin')
        .set('X-Role', 'admin')
        .set('X-User-Role', 'admin')
        .send({ role: 'admin', roles: ['admin'] })
        .expect(403);
    });

    it('ignores role claims inside a correctly signed JWT', async () => {
      const u = await user();
      const [h, b] = u.token.split('.') as [string, string, string];
      const claims = JSON.parse(Buffer.from(b, 'base64url').toString()) as Json;
      const body = Buffer.from(
        JSON.stringify({ ...claims, role: 'admin', roles: ['admin'], staffRole: 'admin', isAdmin: true }),
      ).toString('base64url');
      const secret = app.get(ConfigService).get<string>('JWT_ACCESS_SECRET') as string;
      const sig = createHmac('sha256', secret).update(`${h}.${body}`).digest('base64url');
      await get('/api/v1/staff/me', `${h}.${body}.${sig}`).expect(403);
    });

    it('rejects role fields on profile endpoints (no self-promotion)', async () => {
      const u = await user();
      for (const field of ['role', 'roles', 'staffRole', 'isAdmin', 'permissions']) {
        await http()
          .patch('/api/v1/auth/profile')
          .set('Authorization', bearer(u.token))
          .send({ fullName: 'Hacker', [field]: 'admin' })
          .expect(400);
      }
      await http()
        .post('/api/v1/auth/otp/verify')
        .send({ mobile: '01012345678', code: '123456', role: 'admin' })
        .expect(400);
      expect(db.staffMembership.rows).toHaveLength(0);
    });

    it('exposes no route that creates or changes staff memberships', async () => {
      const u = await user();
      const attempts: [string, string][] = [
        ['post', '/api/v1/staff'],
        ['post', '/api/v1/staff/me'],
        ['put', '/api/v1/staff/me'],
        ['patch', '/api/v1/staff/me'],
        ['delete', '/api/v1/staff/me'],
        ['post', '/api/v1/staff/register'],
        ['post', '/api/v1/auth/staff/register'],
        ['post', '/api/v1/auth/promote'],
      ];
      for (const [method, path] of attempts) {
        const res = await (http() as unknown as Record<string, (p: string) => request.Test>)
          [method](path)
          .set('Authorization', bearer(u.token))
          .send({ role: 'admin' });
        expect([404, 405]).toContain(res.status);
      }
      expect(db.staffMembership.rows).toHaveLength(0);
    });
  });

  describe('farm roles are contextual (resource-level foundation)', () => {
    const relate = (userId: bigint, farmId: bigint, relationshipRole: string, extra: Json = {}) =>
      db.farmRelationship.create({ data: { userId, farmId, relationshipRole, ...extra } });

    it('owner of farm 1 can access farm 1 only', async () => {
      const u = await user();
      await relate(u.id, 1n, 'owner');
      await get('/api/v1/probe-farms/1', u.token).expect(200);
      await get('/api/v1/probe-farms/2', u.token).expect(403);
    });

    it('requires a matching role for the resource', async () => {
      const u = await user();
      await relate(u.id, 1n, 'tenant');
      await get('/api/v1/probe-farms/1', u.token).expect(403);
    });

    it('denies pending, inactive and expired relationships', async () => {
      const u = await user();
      await relate(u.id, 1n, 'owner', { relationshipStatus: 'pending' });
      await relate(u.id, 2n, 'owner', { relationshipStatus: 'inactive' });
      await relate(u.id, 3n, 'owner', { endsAt: new Date(Date.now() - 1000) });
      await relate(u.id, 4n, 'owner', { startsAt: new Date(Date.now() + 86_400_000) });
      for (const farm of [1, 2, 3, 4]) await get(`/api/v1/probe-farms/${farm}`, u.token).expect(403);
    });

    it('lets staff with the permission through without a farm relationship', async () => {
      const agent = await user();
      const reviewer = await user();
      await makeStaff(agent.id, 'caseAgent');
      await makeStaff(reviewer.id, 'reviewer');
      await get('/api/v1/probe-farms/9', agent.token).expect(200);
      await get('/api/v1/probe-farms/9', reviewer.token).expect(200);
    });

    it('401 when unauthenticated', async () => {
      await get('/api/v1/probe-farms/1').expect(401);
    });
  });
});
