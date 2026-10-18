import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { type App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/common/app-setup';
import { provisionDevelopmentAdmin } from '../src/dev/admin-bootstrap';
import { DevelopmentSmsProvider } from '../src/modules/auth/sms/development-sms.provider';
import { SMS_PROVIDER } from '../src/modules/auth/sms/sms-provider';
import { PrismaService } from '../src/prisma/prisma.service';
import { createFakePrisma, type FakePrisma } from './support/fake-prisma';

describe('Admin bootstrap auth (e2e)', () => {
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

  it('lets a bootstrapped admin complete OTP sign-in for website staff APIs but not dashboard console APIs', async () => {
    const mobile = '01088887777';
    await provisionDevelopmentAdmin(db, { mobile, fullName: 'Bootstrap Admin' });

    await http().post('/api/v1/auth/otp/request').send({ mobile }).expect(200);
    const code = sms.lastCodeFor('+201088887777');
    expect(code).toBeDefined();

    const verify = await http()
      .post('/api/v1/auth/otp/verify')
      .send({ mobile, code, deviceName: 'Website test' })
      .expect(200);
    const token = verify.body.accessToken as string;

    const me = await http().get('/api/v1/staff/me').set('Authorization', `Bearer ${token}`).expect(200);
    expect(me.body.roles).toContain('admin');

    await http()
      .get('/api/v1/staff/admin/dashboard/overview')
      .set('Authorization', `Bearer ${token}`)
      .expect(401);
  });

  it('denies dashboard console APIs to website sessions without staff membership', async () => {
    await http().post('/api/v1/auth/otp/request').send({ mobile: '01011112222' }).expect(200);
    const code = sms.lastCodeFor('+201011112222') as string;
    const verify = await http()
      .post('/api/v1/auth/otp/verify')
      .send({ mobile: '01011112222', code })
      .expect(200);
    await http()
      .post('/api/v1/auth/profile/complete')
      .set('Authorization', `Bearer ${verify.body.accessToken}`)
      .send({ fullName: 'Regular User' })
      .expect(200);

    await http()
      .get('/api/v1/staff/admin/dashboard/overview')
      .set('Authorization', `Bearer ${verify.body.accessToken}`)
      .expect(401);
  });

  it('denies dashboard console APIs to website sessions for caseAgent-only staff', async () => {
    const user = await db.user.create({
      data: {
        mobileE164: '+201033344455',
        fullName: 'Case Agent',
        accountStatus: 'active',
        mobileVerifiedAt: new Date(),
      },
    });
    await db.staffMembership.create({
      data: { userId: user.id, staffRole: 'caseAgent', status: 'active' },
    });

    await http().post('/api/v1/auth/otp/request').send({ mobile: '01033344455' }).expect(200);
    const code = sms.lastCodeFor('+201033344455') as string;
    const verify = await http()
      .post('/api/v1/auth/otp/verify')
      .send({ mobile: '01033344455', code })
      .expect(200);

    await http()
      .get('/api/v1/staff/admin/dashboard/overview')
      .set('Authorization', `Bearer ${verify.body.accessToken}`)
      .expect(401);
  });
});
