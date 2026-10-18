import { type INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { type App } from 'supertest/types';
import { NodeEnv, validateEnv } from '../src/config/env.validation';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/common/app-setup';
import { provisionDevelopmentAdmin } from '../src/dev/admin-bootstrap';
import { DevelopmentSmsProvider } from '../src/modules/auth/sms/development-sms.provider';
import { SMS_PROVIDER } from '../src/modules/auth/sms/sms-provider';
import { PrismaService } from '../src/prisma/prisma.service';
import { createFakePrisma, type FakePrisma } from './support/fake-prisma';

const DATABASE_URL = 'mysql://farmexit:secret@localhost:3306/farmexit';
const SECRETS = {
  JWT_ACCESS_SECRET: 'e2e-only-jwt-secret-e2e-only-jwt-secret',
  OTP_HASH_SECRET: 'e2e-only-otp-secret-e2e-only-otp-secret',
};

function devEnv(overrides: Record<string, string | boolean> = {}) {
  return validateEnv({
    DATABASE_URL,
    ...SECRETS,
    NODE_ENV: NodeEnv.Development,
    DEV_FIXED_OTP_ENABLED: true,
    DEV_FIXED_OTP_CODE: '123456',
    DEV_FIXED_OTP_ALLOWED_MOBILES: '01088887777',
    ...overrides,
  });
}

describe('Dev fixed OTP (e2e)', () => {
  let app: INestApplication<App>;
  let db: FakePrisma;

  async function boot(env: ReturnType<typeof devEnv>) {
    db = createFakePrisma();
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(db)
      .overrideProvider(ConfigService)
      .useValue(new ConfigService(env))
      .compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
  }

  afterEach(async () => {
    await app?.close();
  });

  const http = () => request(app.getHttpServer());

  it('authenticates an admin with fixed OTP through the real auth endpoints', async () => {
    await boot(devEnv());
    await provisionDevelopmentAdmin(db, { mobile: '01088887777', fullName: 'Fixed OTP Admin' });

    await http().post('/api/v1/auth/otp/request').send({ mobile: '01088887777' }).expect(200);

    const sms = app.get<DevelopmentSmsProvider>(SMS_PROVIDER);
    expect(sms.lastCodeFor('+201088887777')).toBe('123456');

    const verify = await http()
      .post('/api/v1/auth/otp/verify')
      .send({ mobile: '01088887777', code: '123456' })
      .expect(200);

    await http().get('/api/v1/staff/me').set('Authorization', `Bearer ${verify.body.accessToken}`).expect(200);

    await http()
      .get('/api/v1/staff/admin/dashboard/overview')
      .set('Authorization', `Bearer ${verify.body.accessToken}`)
      .expect(401);

    const reused = await http()
      .post('/api/v1/auth/otp/verify')
      .send({ mobile: '01088887777', code: '123456' })
      .expect(400);
    expect(reused.body.message).toMatch(/Invalid or expired/i);
  });

  it('rejects fixed code for a non-allowlisted mobile', async () => {
    await boot(devEnv());
    await http().post('/api/v1/auth/otp/request').send({ mobile: '01011112222' }).expect(200);
    await http().post('/api/v1/auth/otp/verify').send({ mobile: '01011112222', code: '123456' }).expect(400);
  });

  it('denies admin dashboard routes to case agents after OTP sign-in', async () => {
    await boot(devEnv({ DEV_FIXED_OTP_ALLOWED_MOBILES: '01033344455' }));
    const user = await db.user.create({
      data: {
        mobileE164: '+201033344455',
        fullName: 'Agent',
        accountStatus: 'active',
        mobileVerifiedAt: new Date(),
      },
    });
    await db.staffMembership.create({
      data: { userId: user.id, staffRole: 'caseAgent', status: 'active' },
    });
    await http().post('/api/v1/auth/otp/request').send({ mobile: '01033344455' }).expect(200);
    const verify = await http()
      .post('/api/v1/auth/otp/verify')
      .send({ mobile: '01033344455', code: '123456' })
      .expect(200);
    await http()
      .get('/api/v1/staff/admin/dashboard/overview')
      .set('Authorization', `Bearer ${verify.body.accessToken}`)
      .expect(401);
  });
});
