import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { type App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/common/app-setup';
import { provisionDevelopmentAdmin } from '../src/dev/admin-bootstrap';
import { provisionSuperAdmin } from '../src/dev/super-admin-bootstrap';
import { DevelopmentSmsProvider } from '../src/modules/auth/sms/development-sms.provider';
import { SMS_PROVIDER } from '../src/modules/auth/sms/sms-provider';
import { PrismaService } from '../src/prisma/prisma.service';
import { createFakePrisma, type FakePrisma } from './support/fake-prisma';

describe('Admin auth (e2e)', () => {
  let app: INestApplication<App>;
  let db: FakePrisma;
  let sms: DevelopmentSmsProvider;

  beforeEach(async () => {
    process.env.NODE_ENV = 'test';
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

  const http = () => request(app.getHttpServer());

  it('logs in with email/password and accesses admin dashboard APIs', async () => {
    const boot = await provisionSuperAdmin(db, {
      email: 'superadmin@farmexit.test',
      mobile: '01088887777',
    });
    const password = boot.generatedPassword!;

    const login = await http()
      .post('/api/v1/admin-auth/login')
      .send({ email: 'superadmin@farmexit.test', password })
      .expect(200);
    const loginBody = login.body as {
      accessToken: string;
      refreshToken: string;
      staff: { roles: string[] };
    };
    const token = loginBody.accessToken;
    expect(loginBody.staff.roles).toContain('superAdmin');

    await http()
      .get('/api/v1/staff/admin/dashboard/overview')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const refresh = await http()
      .post('/api/v1/admin-auth/refresh')
      .send({ refreshToken: loginBody.refreshToken })
      .expect(200);
    expect((refresh.body as { accessToken: string }).accessToken).toBeDefined();

    await http().post('/api/v1/admin-auth/logout').set('Authorization', `Bearer ${token}`).expect(204);
  });

  it('returns generic error for invalid password', async () => {
    await provisionSuperAdmin(db, { email: 'superadmin@farmexit.test', mobile: '01088887777' });
    const res = await http()
      .post('/api/v1/admin-auth/login')
      .send({ email: 'superadmin@farmexit.test', password: 'WrongPassword12' })
      .expect(401);
    expect((res.body as { message: string }).message).toMatch(/invalid email or password/i);
  });

  it('denies reviewer-only staff without dashboard credentials', async () => {
    const user = await db.user.create({
      data: { mobileE164: '+201055544433', fullName: 'Reviewer Only', mobileVerifiedAt: new Date() },
    });
    await db.staffMembership.create({
      data: { userId: user.id, staffRole: 'reviewer', status: 'active' },
    });
    await http()
      .post('/api/v1/admin-auth/login')
      .send({ email: 'reviewer@farmexit.test', password: 'AnyPassword12!' })
      .expect(401);
  });

  it('rejects website OTP tokens for admin dashboard APIs', async () => {
    const mobile = '01077776655';
    await provisionDevelopmentAdmin(db, { mobile, fullName: 'Mobile Admin' });
    await http().post('/api/v1/auth/otp/request').send({ mobile }).expect(200);
    const code = sms.lastCodeFor('+201077776655');
    const verify = await http()
      .post('/api/v1/auth/otp/verify')
      .send({ mobile, code, deviceName: 'Web' })
      .expect(200);
    const otpToken = (verify.body as { accessToken: string }).accessToken;
    await http()
      .get('/api/v1/staff/admin/dashboard/overview')
      .set('Authorization', `Bearer ${otpToken}`)
      .expect(401);
  });

  it('website OTP flow still works', async () => {
    const mobile = '01077776666';
    await http().post('/api/v1/auth/otp/request').send({ mobile }).expect(200);
    const code = sms.lastCodeFor('+201077776666');
    await http().post('/api/v1/auth/otp/verify').send({ mobile, code, deviceName: 'Web' }).expect(200);
  });
});
