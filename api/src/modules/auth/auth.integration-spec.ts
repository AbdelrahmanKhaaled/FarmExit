import { randomInt } from 'node:crypto';
import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { type App } from 'supertest/types';
import { AppModule } from '../../app.module';
import { configureApp } from '../../common/app-setup';
import { PrismaService } from '../../prisma/prisma.service';
import { DevelopmentSmsProvider } from './sms/development-sms.provider';
import { SMS_PROVIDER } from './sms/sms-provider';

/**
 * Real MySQL auth flow (opt-in: RUN_DB_INTEGRATION=1, needs the migrated local database and api/.env).
 * Isolation: one randomly generated test number. The test refuses to run if that number already exists, only ever
 * writes rows for that number, and deletes exactly those rows (sessions, OTPs, user) in `afterAll`.
 * The SMS adapter is the in-memory development one, so nothing is sent and no code is logged.
 */
const describeDb = process.env.RUN_DB_INTEGRATION === '1' ? describe : describe.skip;

type Json = Record<string, unknown>;
const json = (res: { body: unknown }): Json => res.body as Json;

describeDb('Auth flow on real MySQL', () => {
  // +2015xxxxxxxx: a valid Egyptian mobile pattern, random so parallel runs cannot collide.
  const national = `015${String(randomInt(0, 100_000_000)).padStart(8, '0')}`;
  const mobile = `+20${national.slice(1)}`;

  let app: INestApplication<App>;
  let prisma: PrismaService;
  let sms: DevelopmentSmsProvider;
  const http = () => request(app.getHttpServer());
  const bearer = (token: unknown) => `Bearer ${token as string}`;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    sms = app.get<DevelopmentSmsProvider>(SMS_PROVIDER);

    const existing = await prisma.user.count({ where: { mobileE164: mobile } });
    const otps = await prisma.otpVerification.count({ where: { mobileE164: mobile } });
    if (existing + otps > 0) throw new Error(`Test number ${mobile} is already in use; aborting without changes`);
  });

  afterAll(async () => {
    try {
      // Only rows that belong to the generated test number are removed.
      const user = await prisma.user.findUnique({ where: { mobileE164: mobile } });
      if (user && user.mobileE164 === mobile) {
        await prisma.userSessionToken.deleteMany({ where: { session: { userId: user.id } } });
        await prisma.userSession.deleteMany({ where: { userId: user.id } });
      }
      await prisma.otpVerification.deleteMany({ where: { mobileE164: mobile } });
      if (user && user.mobileE164 === mobile) await prisma.user.delete({ where: { id: user.id } });
    } finally {
      await app.close();
    }
  });

  const requestOtp = () => http().post('/api/v1/auth/otp/request').send({ mobile: national });
  const verify = (code: string) => http().post('/api/v1/auth/otp/verify').send({ mobile: national, code });
  /** Pretend the token was consumed long ago (outside the grace window). Only touches this test's own session. */
  const ageConsumed = (refreshToken: unknown) =>
    prisma.userSessionToken.updateMany({
      where: { sessionId: BigInt((refreshToken as string).split('.')[0]) },
      data: { consumedAt: new Date(Date.now() - 10_000) },
    });
  /** Move this number's OTP history out of the hourly cap window. */
  const skipHourlyCap = () =>
    prisma.otpVerification.updateMany({
      where: { mobileE164: mobile },
      data: { createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000) },
    });
  const skipCooldown = () =>
    prisma.otpVerification.updateMany({
      where: { mobileE164: mobile },
      data: { createdAt: new Date(Date.now() - 120_000) },
    });

  it('admits exactly one of several simultaneous OTP requests (atomic cooldown)', async () => {
    const results = await Promise.all(Array.from({ length: 6 }, () => requestOtp()));
    const statuses = results.map((r) => r.status);
    expect(statuses.filter((s) => s === 200)).toHaveLength(1);
    expect(statuses.filter((s) => s === 429)).toHaveLength(5);

    const rows = await prisma.otpVerification.findMany({ where: { mobileE164: mobile } });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ purpose: 'registration', attempts: 0, userId: null, consumedAt: null });
    expect(rows[0]?.expiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(rows[0]?.codeHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('phone -> OTP -> profile: a new user starts with no name, then completes the profile', async () => {
    const code = sms.lastCodeFor(mobile) as string;
    expect(code).toMatch(/^\d{6}$/);
    const verified = json(await verify(code).expect(200));
    expect(verified).toMatchObject({ isNewUser: true });
    expect(verified.user).toMatchObject({ mobileE164: mobile, fullName: null, profileCompleted: false });

    const row = await prisma.user.findUniqueOrThrow({ where: { mobileE164: mobile } });
    expect(row.fullName).toBeNull();
    expect(row.mobileVerifiedAt).toBeInstanceOf(Date);

    const token = verified.accessToken;
    expect(json(await http().get('/api/v1/auth/me').set('Authorization', bearer(token)).expect(200))).toMatchObject({
      profileCompleted: false,
    });

    const done = await http()
      .post('/api/v1/auth/profile/complete')
      .set('Authorization', bearer(token))
      .send({ fullName: 'Integration Test User' })
      .expect(200);
    expect(json(done)).toMatchObject({ fullName: 'Integration Test User', profileCompleted: true });
    await http()
      .post('/api/v1/auth/profile/complete')
      .set('Authorization', bearer(token))
      .send({ fullName: 'Someone Else' })
      .expect(409);
    expect((await prisma.user.findUniqueOrThrow({ where: { mobileE164: mobile } })).fullName).toBe(
      'Integration Test User',
    );
  });

  it('the used code cannot be replayed', async () => {
    await verify(sms.lastCodeFor(mobile) as string).expect(400);
  });

  it('rotates and revokes sessions in the database', async () => {
    await skipCooldown();
    await requestOtp().expect(200);
    const signedIn = json(await verify(sms.lastCodeFor(mobile) as string).expect(200));
    expect(signedIn).toMatchObject({ isNewUser: false });
    expect(signedIn.user).toMatchObject({ fullName: 'Integration Test User', profileCompleted: true });

    const rotated = json(
      await http().post('/api/v1/auth/refresh').send({ refreshToken: signedIn.refreshToken }).expect(200),
    );
    expect(rotated.refreshToken).not.toBe(signedIn.refreshToken);
    await http().get('/api/v1/auth/me').set('Authorization', bearer(rotated.accessToken)).expect(200);

    // Reusing the old refresh token (outside the 3 s duplicate grace window) revokes the session.
    await ageConsumed(signedIn.refreshToken);
    await http().post('/api/v1/auth/refresh').send({ refreshToken: signedIn.refreshToken }).expect(401);
    await http().get('/api/v1/auth/me').set('Authorization', bearer(rotated.accessToken)).expect(401);

    const user = await prisma.user.findUniqueOrThrow({ where: { mobileE164: mobile } });
    const sessions = await prisma.userSession.findMany({ where: { userId: user.id } });
    expect(sessions.length).toBeGreaterThanOrEqual(2);
    expect(sessions.some((s) => s.revokedAt !== null)).toBe(true);
    expect(sessions.every((s) => /^[0-9a-f]{64}$/.test(s.sessionTokenHash))).toBe(true);
  });

  it('logout revokes the current session', async () => {
    await skipCooldown();
    await requestOtp().expect(200);
    const session = json(await verify(sms.lastCodeFor(mobile) as string).expect(200));
    await http().post('/api/v1/auth/logout').set('Authorization', bearer(session.accessToken)).expect(204);
    await http().get('/api/v1/auth/me').set('Authorization', bearer(session.accessToken)).expect(401);
    await http().post('/api/v1/auth/refresh').send({ refreshToken: session.refreshToken }).expect(401);
  });

  it('refresh: random secrets never revoke, concurrent duplicates are benign, real replays revoke', async () => {
    await skipCooldown();
    await requestOtp().expect(200);
    const signedIn = json(await verify(sms.lastCodeFor(mobile) as string).expect(200));
    const refresh = (token: unknown) => http().post('/api/v1/auth/refresh').send({ refreshToken: token });
    const id = (signedIn.refreshToken as string).split('.')[0];
    const session = () => prisma.userSession.findUniqueOrThrow({ where: { id: BigInt(id) } });

    await refresh(`${id}.${'x'.repeat(43)}`).expect(401);
    expect((await session()).revokedAt).toBeNull();

    const t1 = json(await refresh(signedIn.refreshToken).expect(200));
    const t2 = json(await refresh(t1.refreshToken).expect(200));
    await refresh(signedIn.refreshToken).expect(401); // two rotations old
    expect((await session()).revokedAt).not.toBeNull();
    await refresh(t2.refreshToken).expect(401);

    // concurrency on a fresh session: exactly one winner, nobody else gets tokens, the winner stays valid
    await skipCooldown();
    await requestOtp().expect(200);
    const second = json(await verify(sms.lastCodeFor(mobile) as string).expect(200));
    const results = await Promise.all(Array.from({ length: 6 }, () => refresh(second.refreshToken)));
    const winners = results.filter((r) => r.status === 200);
    const losers = results.filter((r) => r.status === 401);
    expect(winners).toHaveLength(1);
    expect(losers).toHaveLength(5);
    for (const loser of losers) expect(JSON.stringify(loser.body)).not.toMatch(/accessToken|refreshToken/);

    const secondId = BigInt((second.refreshToken as string).split('.')[0]);
    expect((await prisma.userSession.findUniqueOrThrow({ where: { id: secondId } })).revokedAt).toBeNull();
    const history = await prisma.userSessionToken.findMany({ where: { sessionId: secondId } });
    expect(history).toHaveLength(1);
    expect(history[0]?.tokenHash).toMatch(/^[0-9a-f]{64}$/);

    const winner = json(winners[0]);
    await http().get('/api/v1/auth/me').set('Authorization', bearer(winner.accessToken)).expect(200);
    const next = json(await refresh(winner.refreshToken).expect(200));

    // a late duplicate of the (now older) token is no longer the newest consumed one: strict revocation
    await refresh(second.refreshToken).expect(401);
    expect((await prisma.userSession.findUniqueOrThrow({ where: { id: secondId } })).revokedAt).not.toBeNull();
    await refresh(next.refreshToken).expect(401);

    // outside the grace window a duplicate of the newest consumed token is a replay too
    await skipHourlyCap();
    await requestOtp().expect(200);
    const third = json(await verify(sms.lastCodeFor(mobile) as string).expect(200));
    const thirdId = BigInt((third.refreshToken as string).split('.')[0]);
    await refresh(third.refreshToken).expect(200);
    await refresh(third.refreshToken).expect(401); // inside the window: benign
    expect((await prisma.userSession.findUniqueOrThrow({ where: { id: thirdId } })).revokedAt).toBeNull();
    await prisma.userSessionToken.updateMany({
      where: { sessionId: thirdId },
      data: { consumedAt: new Date(Date.now() - 10_000) },
    });
    await refresh(third.refreshToken).expect(401);
    expect((await prisma.userSession.findUniqueOrThrow({ where: { id: thirdId } })).revokedAt).not.toBeNull();
  });
});
