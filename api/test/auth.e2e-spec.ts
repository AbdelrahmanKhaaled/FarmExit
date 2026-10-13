import { type INestApplication, Controller, Get } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { type App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/common/app-setup';
import { RequireCompletedProfile } from '../src/modules/auth/auth-guards.decorators';
import { AuthModule } from '../src/modules/auth/auth.module';
import { DevelopmentSmsProvider } from '../src/modules/auth/sms/development-sms.provider';
import { SMS_PROVIDER } from '../src/modules/auth/sms/sms-provider';
import { PrismaService } from '../src/prisma/prisma.service';
import { createFakePrisma, type FakePrisma } from './support/fake-prisma';

type Json = Record<string, unknown>;
const json = (res: { body: unknown }): Json => res.body as Json;

/** Stands in for any future business route: protected for signed-in users with a completed profile. */
@Controller('probe')
@RequireCompletedProfile()
class ProbeController {
  @Get()
  ping(): { ok: true } {
    return { ok: true };
  }
}

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;
  let db: FakePrisma;
  let sms: DevelopmentSmsProvider;
  let http: () => ReturnType<typeof request>;

  beforeEach(async () => {
    db = createFakePrisma();
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule, AuthModule],
      controllers: [ProbeController],
    })
      .overrideProvider(PrismaService)
      .useValue(db)
      .compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    sms = app.get<DevelopmentSmsProvider>(SMS_PROVIDER);
    http = () => request(app.getHttpServer());
  });

  afterEach(async () => {
    await app.close();
  });

  const requestOtp = (mobile: string) => http().post('/api/v1/auth/otp/request').send({ mobile });
  const verify = (mobile: string, code: string, extra: Json = {}) =>
    http()
      .post('/api/v1/auth/otp/verify')
      .send({ mobile, code, ...extra });
  /** Pretend the last code was sent long enough ago to allow another request. */
  const skipCooldown = () => db.otpVerification.rows.forEach((r) => (r.createdAt = new Date(Date.now() - 120_000)));

  const bearer = (token: unknown) => `Bearer ${token as string}`;

  /** Phone -> OTP for +201012345678. The account is created but the profile is NOT completed. */
  async function signUp(): Promise<Json> {
    await requestOtp('01012345678').expect(200);
    const code = sms.lastCodeFor('+201012345678') as string;
    return json(await verify('01012345678', code).expect(200));
  }

  /** Phone -> OTP -> profile completion ("Mona Hassan"). Returns the verify response (tokens are still valid). */
  async function register(): Promise<Json> {
    const session = await signUp();
    await http()
      .post('/api/v1/auth/profile/complete')
      .set('Authorization', bearer(session.accessToken))
      .send({ fullName: 'Mona Hassan' })
      .expect(200);
    return session;
  }

  describe('POST /auth/otp/request', () => {
    it('rejects invalid numbers and unknown fields', async () => {
      await requestOtp('12345').expect(400);
      await requestOtp('').expect(400);
      await http().post('/api/v1/auth/otp/request').send({ mobile: '01012345678', extra: 1 }).expect(400);
    });

    it('sends a 6-digit code, never returns it, and stores only a hash', async () => {
      const res = await requestOtp('0101 234 5678').expect(200);
      expect(json(res)).toEqual({ expiresInSeconds: 300, resendAfterSeconds: 60 });

      const code = sms.lastCodeFor('+201012345678') as string;
      expect(code).toMatch(/^\d{6}$/);
      expect(JSON.stringify(res.body)).not.toContain(code);

      const [row] = db.otpVerification.rows;
      expect(row).toMatchObject({
        mobileE164: '+201012345678',
        purpose: 'registration',
        attempts: 0,
        consumedAt: null,
      });
      expect(row?.codeHash).toMatch(/^[0-9a-f]{64}$/);
      expect(Object.values(row ?? {})).not.toContain(code);
      expect((row?.expiresAt as Date).getTime()).toBeGreaterThan(Date.now());
    });

    it('enforces the resend cooldown', async () => {
      await requestOtp('01012345678').expect(200);
      const res = await requestOtp('01012345678').expect(429);
      expect(json(res).retryAfterSeconds).toBeGreaterThan(0);
      expect(db.otpVerification.rows).toHaveLength(1);
    });

    it('caps codes per number per hour', async () => {
      for (let i = 0; i < 5; i++) {
        await requestOtp('01012345678').expect(200);
        skipCooldown();
      }
      await requestOtp('01012345678').expect(429);
    });

    it('invalidates the previous code when a new one is issued', async () => {
      await requestOtp('01012345678').expect(200);
      const first = sms.lastCodeFor('+201012345678') as string;
      skipCooldown();
      await requestOtp('01012345678').expect(200);
      const second = sms.lastCodeFor('+201012345678') as string;
      if (first !== second) await verify('01012345678', first).expect(400);
      await verify('01012345678', second).expect(200);
    });

    it('applies a per-IP rate limit', async () => {
      for (let i = 0; i < 20; i++) await requestOtp('bad').expect(400);
      const res = await requestOtp('bad').expect(429);
      expect(res.headers['retry-after']).toBeDefined();
    });
  });

  describe('POST /auth/otp/verify', () => {
    it('creates a new account without a name, normalises the number and returns tokens', async () => {
      await requestOtp('01012345678').expect(200);
      const code = sms.lastCodeFor('+201012345678') as string;
      const res = await verify('+20 101 234 5678', code, { deviceName: 'Pixel 8' }).expect(200);
      const body = json(res);

      expect(body).toMatchObject({ tokenType: 'Bearer', accessTokenExpiresInSeconds: 900, isNewUser: true });
      expect(body.user).toMatchObject({
        fullName: null,
        mobileE164: '+201012345678',
        mobileVerified: true,
        profileCompleted: false,
      });
      expect(typeof body.accessToken).toBe('string');
      expect(typeof body.refreshToken).toBe('string');
      expect(Object.keys(body.user as Json)).not.toEqual(expect.arrayContaining(['role', 'roles']));

      const session = db.userSession.rows[0];
      expect(session?.sessionTokenHash).toMatch(/^[0-9a-f]{64}$/);
      expect(body.refreshToken as string).not.toContain(session?.sessionTokenHash as string);
      expect(session?.deviceName).toBe('Pixel 8');
      expect(db.user.rows[0]?.fullName).toBeNull();
    });

    it('signs an existing user in without fullName and keeps the same account', async () => {
      const first = await register();
      skipCooldown();
      await requestOtp('01012345678').expect(200);
      expect(db.otpVerification.rows.at(-1)?.purpose).toBe('sign_in');
      const res = await verify('01012345678', sms.lastCodeFor('+201012345678') as string).expect(200);

      const body = json(res);
      expect(body.isNewUser).toBe(false);
      expect((body.user as Json).id).toBe((first.user as Json).id);
      expect((body.user as Json).fullName).toBe('Mona Hassan');
      expect((body.user as Json).profileCompleted).toBe(true);
      expect(db.user.rows).toHaveLength(1);
      expect(db.userSession.rows).toHaveLength(2);
    });

    it('rejects wrong, expired, reused and unknown codes with the same error', async () => {
      await requestOtp('01012345678').expect(200);
      const code = sms.lastCodeFor('+201012345678') as string;
      const wrong = code === '000000' ? '111111' : '000000';
      const messages = new Set<unknown>();

      messages.add(json(await verify('01012345678', wrong).expect(400)).message);
      messages.add(json(await verify('01099999999', code).expect(400)).message);

      db.otpVerification.rows[0].expiresAt = new Date(Date.now() - 1000);
      messages.add(json(await verify('01012345678', code).expect(400)).message);
      db.otpVerification.rows[0].expiresAt = new Date(Date.now() + 60_000);

      await verify('01012345678', code).expect(200);
      messages.add(json(await verify('01012345678', code).expect(400)).message);
      expect(messages.size).toBe(1);
    });

    it('locks a code after the maximum number of attempts', async () => {
      await requestOtp('01012345678').expect(200);
      const code = sms.lastCodeFor('+201012345678') as string;
      const wrong = code === '000000' ? '111111' : '000000';
      for (let i = 0; i < 5; i++) await verify('01012345678', wrong).expect(400);
      await verify('01012345678', code).expect(429);
      expect(db.user.rows).toHaveLength(0);
    });

    it('validates the payload', async () => {
      await verify('01012345678', '12345').expect(400);
      await verify('01012345678', 'abcdef').expect(400);
      await verify('01012345678', '123456', { fullName: 'Mona Hassan' }).expect(400); // not accepted here any more
      await verify('', '123456').expect(400);
    });

    it('sends no SMS to suspended or blocked accounts, without revealing the status', async () => {
      await register();
      skipCooldown();
      const active = json(await requestOtp('01012345678').expect(200));
      const lastSent = sms.lastCodeFor('+201012345678');
      for (const status of ['suspended', 'blocked']) {
        db.user.rows[0].accountStatus = status;
        skipCooldown();
        const res = json(await requestOtp('01012345678').expect(200));
        expect(res).toEqual(active); // identical body to an active account
        expect(sms.lastCodeFor('+201012345678')).toBe(lastSent); // nothing was sent
        // the cooldown still applies exactly as for active accounts
        await requestOtp('01012345678').expect(429);
        // no code exists for the attacker/owner to use, and the wrong-code answer is the generic one
        await verify('01012345678', lastSent as string).expect(400);
        await verify('01012345678', '000000').expect(400);
      }
    });

    it('still refuses a suspended account at verification (defence in depth)', async () => {
      await register();
      skipCooldown();
      await requestOtp('01012345678').expect(200);
      const code = sms.lastCodeFor('+201012345678') as string;
      db.user.rows[0].accountStatus = 'suspended';
      await verify('01012345678', code).expect(403);
    });
  });
  describe('GET /auth/me and guards', () => {
    it('returns the signed-in user and nothing about roles', async () => {
      const { accessToken, user } = await register();
      const res = await http()
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken as string}`)
        .expect(200);
      expect(json(res)).toEqual({
        id: (user as Json).id,
        fullName: 'Mona Hassan',
        mobileE164: '+201012345678',
        email: null,
        mobileVerified: true,
        profileCompleted: true,
      });
    });

    it('rejects missing, malformed, tampered and expired tokens', async () => {
      const { accessToken } = await register();
      const me = () => http().get('/api/v1/auth/me');
      await me().expect(401);
      await me().set('Authorization', 'Bearer').expect(401);
      await me().set('Authorization', 'Basic abc').expect(401);
      await me().set('Authorization', 'Bearer garbage').expect(401);
      await me()
        .set('Authorization', `Bearer ${(accessToken as string).slice(0, -2)}xx`)
        .expect(401);
    });

    it('stops honouring tokens for a suspended account', async () => {
      const { accessToken } = await register();
      db.user.rows[0].accountStatus = 'suspended';
      await http()
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken as string}`)
        .expect(401);
    });

    it('stops honouring tokens once the session expires', async () => {
      const { accessToken } = await register();
      db.userSession.rows[0].expiresAt = new Date(Date.now() - 1000);
      await http()
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken as string}`)
        .expect(401);
    });
  });

  describe('POST /auth/refresh', () => {
    it('rotates the refresh token and issues a working access token', async () => {
      const first = await register();
      const res = await http().post('/api/v1/auth/refresh').send({ refreshToken: first.refreshToken }).expect(200);
      const second = json(res);
      expect(second.refreshToken).not.toBe(first.refreshToken);
      expect(second.user).toBeUndefined();
      expect(db.userSession.rows).toHaveLength(1);
      await http()
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${second.accessToken as string}`)
        .expect(200);
    });

    it('treats a reused refresh token as theft and revokes the session', async () => {
      const first = await register();
      const second = json(
        await http().post('/api/v1/auth/refresh').send({ refreshToken: first.refreshToken }).expect(200),
      );

      ageConsumedTokens(); // outside the duplicate grace window this is a replay, not a race
      await http().post('/api/v1/auth/refresh').send({ refreshToken: first.refreshToken }).expect(401);
      expect(db.userSession.rows[0]?.revokedAt).toBeInstanceOf(Date);
      await http().post('/api/v1/auth/refresh').send({ refreshToken: second.refreshToken }).expect(401);
      await http()
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${second.accessToken as string}`)
        .expect(401);
    });

    const ageConsumedTokens = () =>
      db.userSessionToken.rows.forEach((r) => (r.consumedAt = new Date(Date.now() - 10_000)));
    const refresh = (refreshToken: unknown) => http().post('/api/v1/auth/refresh').send({ refreshToken });
    const sessionId = (token: unknown) => (token as string).split('.')[0];

    it('401 for a wrong or random secret and does NOT revoke the (guessable) session', async () => {
      const first = await register();
      const id = sessionId(first.refreshToken);
      for (const secret of ['a'.repeat(43), 'B'.repeat(43), '_'.repeat(43)]) {
        await refresh(`${id}.${secret}`).expect(401);
      }
      expect(db.userSession.rows[0]?.revokedAt).toBeNull();
      expect(db.userSessionToken.rows).toHaveLength(0);
      // the real owner is unaffected and can still rotate
      await refresh(first.refreshToken).expect(200);
    });

    it('detects replay of ANY older consumed token, not just the previous one', async () => {
      const first = await register();
      const t1 = json(await refresh(first.refreshToken).expect(200));
      const t2 = json(await refresh(t1.refreshToken).expect(200));
      const t3 = json(await refresh(t2.refreshToken).expect(200));
      expect(db.userSession.rows[0]?.revokedAt).toBeNull();

      await refresh(first.refreshToken).expect(401); // three rotations old
      expect(db.userSession.rows[0]?.revokedAt).toBeInstanceOf(Date);
      await refresh(t3.refreshToken).expect(401); // the legitimate current token is dead too
    });

    it('keeps replay detection isolated per session', async () => {
      const first = await register();
      const rotated = json(await refresh(first.refreshToken).expect(200));
      skipCooldown();
      await requestOtp('01012345678').expect(200);
      await verify('01012345678', sms.lastCodeFor('+201012345678') as string).expect(200);
      const other = db.userSession.rows.find((r) => r.id !== db.userSession.rows[0]?.id);
      expect(other).toBeDefined();
      await refresh(first.refreshToken).expect(401);
      expect(db.userSession.rows.find((r) => r.id === other?.id)?.revokedAt).toBeNull();
      expect(rotated.refreshToken).toBeDefined();
    });

    it('stores only hashes of consumed tokens', async () => {
      const first = await register();
      const rotated = json(await refresh(first.refreshToken).expect(200));
      const [row] = db.userSessionToken.rows;
      expect(row?.tokenHash).toMatch(/^[0-9a-f]{64}$/);
      for (const token of [first.refreshToken, rotated.refreshToken] as string[]) {
        expect(Object.values(row ?? {})).not.toContain(token);
        expect(Object.values(row ?? {})).not.toContain(token.split('.')[1]);
      }
    });

    it('concurrent duplicates: exactly one rotates, the rest get 401 with no tokens, and the winner stays valid', async () => {
      const first = await register();
      const results = await Promise.all(Array.from({ length: 6 }, () => refresh(first.refreshToken)));
      const winners = results.filter((r) => r.status === 200);
      const losers = results.filter((r) => r.status === 401);
      expect(winners).toHaveLength(1);
      expect(losers).toHaveLength(5);
      for (const loser of losers) {
        expect(JSON.stringify(loser.body)).not.toMatch(/accessToken|refreshToken/);
      }
      expect(db.userSession.rows[0]?.revokedAt).toBeNull();

      // the winning tokens are still usable, and keep rotating
      const winner = json(winners[0]);
      await http().get('/api/v1/auth/me').set('Authorization', bearer(winner.accessToken)).expect(200);
      const next = json(await refresh(winner.refreshToken).expect(200));
      await http().get('/api/v1/auth/me').set('Authorization', bearer(next.accessToken)).expect(200);
    });

    it('a late duplicate of the newest consumed token inside the grace window is rejected without revocation', async () => {
      const first = await register();
      const winner = json(await refresh(first.refreshToken).expect(200));
      const dup = await refresh(first.refreshToken).expect(401);
      expect(JSON.stringify(dup.body)).not.toMatch(/accessToken|refreshToken/);
      expect(db.userSession.rows[0]?.revokedAt).toBeNull();
      await refresh(winner.refreshToken).expect(200);
    });

    it('revokes for a duplicate of the newest consumed token outside the grace window', async () => {
      const first = await register();
      const winner = json(await refresh(first.refreshToken).expect(200));
      ageConsumedTokens();
      await refresh(first.refreshToken).expect(401);
      expect(db.userSession.rows[0]?.revokedAt).toBeInstanceOf(Date);
      await refresh(winner.refreshToken).expect(401);
    });

    it('revokes for an older consumed token even inside the grace window', async () => {
      const first = await register();
      const t1 = json(await refresh(first.refreshToken).expect(200));
      await refresh(t1.refreshToken).expect(200); // `first` is no longer the newest consumed token
      await refresh(first.refreshToken).expect(401);
      expect(db.userSession.rows[0]?.revokedAt).toBeInstanceOf(Date);
    });

    it('a grace-window duplicate never gets tokens, even repeatedly', async () => {
      const first = await register();
      await refresh(first.refreshToken).expect(200);
      for (let i = 0; i < 3; i++) await refresh(first.refreshToken).expect(401);
      expect(db.userSession.rows[0]?.revokedAt).toBeNull();
    });
    it('rejects malformed, unknown and expired refresh tokens', async () => {
      const first = await register();
      await http().post('/api/v1/auth/refresh').send({ refreshToken: 'nope' }).expect(401);
      await http()
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: `999.${'a'.repeat(43)}` })
        .expect(401);
      await http().post('/api/v1/auth/refresh').send({}).expect(400);
      db.userSession.rows[0].expiresAt = new Date(Date.now() - 1000);
      await http().post('/api/v1/auth/refresh').send({ refreshToken: first.refreshToken }).expect(401);
    });
  });

  describe('POST /auth/logout', () => {
    it('revokes the session: access and refresh tokens stop working', async () => {
      const { accessToken, refreshToken } = await register();
      await http().post('/api/v1/auth/logout').expect(401);
      await http()
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken as string}`)
        .expect(204);

      await http()
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken as string}`)
        .expect(401);
      await http().post('/api/v1/auth/refresh').send({ refreshToken }).expect(401);
      expect(db.userSession.rows[0]?.revokedAt).toBeInstanceOf(Date);
    });

    it('only revokes the current session', async () => {
      const first = await register();
      skipCooldown();
      await requestOtp('01012345678').expect(200);
      const second = json(await verify('01012345678', sms.lastCodeFor('+201012345678') as string).expect(200));

      await http()
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${first.accessToken as string}`)
        .expect(204);
      await http()
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${second.accessToken as string}`)
        .expect(200);
    });
  });

  describe('profile completion', () => {
    const me = (token: unknown) => http().get('/api/v1/auth/me').set('Authorization', bearer(token));
    const complete = (token: unknown, body: Json) =>
      http().post('/api/v1/auth/profile/complete').set('Authorization', bearer(token)).send(body);

    it('walks a new user through phone -> OTP -> profile', async () => {
      const session = await signUp();
      expect(json(await me(session.accessToken).expect(200)).profileCompleted).toBe(false);
      expect(json(await me(session.accessToken)).fullName).toBeNull();

      const res = await complete(session.accessToken, {
        fullName: '  Mona Hassan ',
        email: ' Mona@Example.com ',
      }).expect(200);
      expect(json(res)).toMatchObject({ fullName: 'Mona Hassan', email: 'mona@example.com', profileCompleted: true });
      expect(json(await me(session.accessToken).expect(200)).profileCompleted).toBe(true);
    });

    it('is a one-time step and validates input', async () => {
      const session = await signUp();
      await complete(session.accessToken, {}).expect(400);
      await complete(session.accessToken, { fullName: 'x' }).expect(400);
      await complete(session.accessToken, { fullName: 'Mona Hassan', email: 'not-an-email' }).expect(400);
      await complete(session.accessToken, { fullName: 'Mona Hassan', role: 'owner' }).expect(400);
      await complete(session.accessToken, { fullName: 'Mona Hassan' }).expect(200);
      await complete(session.accessToken, { fullName: 'Someone Else' }).expect(409);
      expect(db.user.rows[0]?.fullName).toBe('Mona Hassan');
    });

    it('requires authentication', async () => {
      await http().post('/api/v1/auth/profile/complete').send({ fullName: 'Mona Hassan' }).expect(401);
      await http().patch('/api/v1/auth/profile').send({ fullName: 'Mona Hassan' }).expect(401);
    });

    it('rejects an email that belongs to another account', async () => {
      const first = await signUp();
      await complete(first.accessToken, { fullName: 'Mona Hassan', email: 'mona@example.com' }).expect(200);
      db.user.rows.push({ id: 99n, mobileE164: '+201112345678', fullName: 'Other', email: 'taken@example.com' });

      const res = await http()
        .patch('/api/v1/auth/profile')
        .set('Authorization', bearer(first.accessToken))
        .send({ email: 'taken@example.com' });
      expect(res.status).toBe(409);
    });

    it('updates name and email afterwards, and can clear the email', async () => {
      const session = await register();
      const patch = (body: Json) =>
        http().patch('/api/v1/auth/profile').set('Authorization', bearer(session.accessToken)).send(body);
      expect(json(await patch({ fullName: 'Mona H. Hassan' }).expect(200)).fullName).toBe('Mona H. Hassan');
      expect(json(await patch({ email: 'mona@example.com' }).expect(200)).email).toBe('mona@example.com');
      expect(json(await patch({ email: null }).expect(200)).email).toBeNull();
      await patch({}).expect(400);
      await patch({ fullName: '' }).expect(400);
      expect(json(await me(session.accessToken).expect(200)).profileCompleted).toBe(true);
    });

    it('does not let an incomplete profile use PATCH /auth/profile', async () => {
      const session = await signUp();
      const res = await http()
        .patch('/api/v1/auth/profile')
        .set('Authorization', bearer(session.accessToken))
        .send({ fullName: 'Mona Hassan' })
        .expect(403);
      expect(json(res).code).toBe('PROFILE_INCOMPLETE');
    });
  });

  describe('protected business actions', () => {
    it('blocks incomplete profiles with PROFILE_INCOMPLETE and admits completed ones', async () => {
      const session = await signUp();
      const probe = () => http().get('/api/v1/probe').set('Authorization', bearer(session.accessToken));

      const blocked = await probe().expect(403);
      expect(json(blocked)).toMatchObject({ code: 'PROFILE_INCOMPLETE', statusCode: 403 });

      await http()
        .post('/api/v1/auth/profile/complete')
        .set('Authorization', bearer(session.accessToken))
        .send({ fullName: 'Mona Hassan' })
        .expect(200);
      expect(json(await probe().expect(200))).toEqual({ ok: true });
    });

    it('still requires authentication first', async () => {
      await http().get('/api/v1/probe').expect(401);
      await http().get('/api/v1/probe').set('Authorization', 'Bearer garbage').expect(401);
    });
  });

  describe('simultaneous OTP requests', () => {
    it('lets exactly one of many parallel requests for the same number through', async () => {
      const results = await Promise.all(Array.from({ length: 8 }, () => requestOtp('01012345678')));
      const statuses = results.map((r) => r.status).sort();
      expect(statuses.filter((s) => s === 200)).toHaveLength(1);
      expect(statuses.filter((s) => s === 429)).toHaveLength(7);
      expect(db.otpVerification.rows).toHaveLength(1);
      expect(db.otpVerification.rows.filter((r) => r.consumedAt === null)).toHaveLength(1);
    });

    it('does not block different numbers', async () => {
      const results = await Promise.all(['01012345678', '01112345678', '01212345678'].map((m) => requestOtp(m)));
      expect(results.map((r) => r.status)).toEqual([200, 200, 200]);
      expect(db.otpVerification.rows).toHaveLength(3);
    });
  });
  it('documents the auth endpoints in OpenAPI', async () => {
    const res = await http().get('/api/docs-json').expect(200);
    const doc = res.body as { paths: Record<string, unknown> };
    expect(Object.keys(doc.paths)).toEqual(
      expect.arrayContaining([
        '/api/v1/auth/otp/request',
        '/api/v1/auth/otp/verify',
        '/api/v1/auth/refresh',
        '/api/v1/auth/logout',
        '/api/v1/auth/me',
      ]),
    );
  });
});
