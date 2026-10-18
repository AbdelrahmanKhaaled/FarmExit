import { ConfigService } from '@nestjs/config';
import { NodeEnv, validateEnv } from '../../config/env.validation';
import { createFakePrisma, type FakePrisma } from '../../../test/support/fake-prisma';
import { DevelopmentSmsProvider } from './sms/development-sms.provider';
import { OtpService } from './otp.service';

const DATABASE_URL = 'mysql://farmexit:secret@localhost:3306/farmexit';

function envWith(overrides: Record<string, string | boolean>) {
  return validateEnv({
    DATABASE_URL,
    JWT_ACCESS_SECRET: 'test-jwt-secret-test-jwt-secret-1234',
    OTP_HASH_SECRET: 'test-otp-secret-test-otp-secret-1234',
    NODE_ENV: NodeEnv.Development,
    ...overrides,
  });
}

function service(env: ReturnType<typeof envWith>, prisma: FakePrisma) {
  const sms = new DevelopmentSmsProvider(true);
  const otp = new OtpService(prisma, new ConfigService(env), sms);
  return { otp, sms, prisma };
}

describe('OtpService dev fixed OTP', () => {
  const allowlisted = '+201012345678';
  const other = '+201099999999';

  it('issues the fixed code for an allowlisted mobile in development', async () => {
    const prisma = createFakePrisma();
    const { otp, sms } = service(
      envWith({
        DEV_FIXED_OTP_ENABLED: true,
        DEV_FIXED_OTP_CODE: '123456',
        DEV_FIXED_OTP_ALLOWED_MOBILES: '01012345678',
      }),
      prisma,
    );
    await otp.issue(allowlisted);
    expect(sms.lastCodeFor(allowlisted)).toBe('123456');
  });

  it('issues random codes when fixed OTP is disabled', async () => {
    const prisma = createFakePrisma();
    const { otp, sms } = service(envWith({ DEV_FIXED_OTP_ENABLED: false }), prisma);
    await otp.issue(allowlisted);
    const code = sms.lastCodeFor(allowlisted);
    expect(code).toMatch(/^\d{6}$/);
    expect(code).not.toBe('123456');
  });

  it('issues random codes for non-allowlisted mobiles when fixed OTP is enabled', async () => {
    const prisma = createFakePrisma();
    const { otp, sms } = service(
      envWith({
        DEV_FIXED_OTP_ENABLED: true,
        DEV_FIXED_OTP_CODE: '123456',
        DEV_FIXED_OTP_ALLOWED_MOBILES: '01012345678',
      }),
      prisma,
    );
    await otp.issue(other);
    expect(sms.lastCodeFor(other)).not.toBe('123456');
  });

  it('verifies, consumes, and rejects reuse for fixed OTP', async () => {
    const prisma = createFakePrisma();
    const { otp, sms } = service(
      envWith({
        DEV_FIXED_OTP_ENABLED: true,
        DEV_FIXED_OTP_CODE: '123456',
        DEV_FIXED_OTP_ALLOWED_MOBILES: '01012345678',
      }),
      prisma,
    );
    await otp.issue(allowlisted);
    const { otpId } = await otp.check(allowlisted, '123456');
    expect(await otp.consume(otpId)).toBe(true);
    await expect(otp.check(allowlisted, '123456')).rejects.toThrow();
  });

  it('rejects wrong codes and expired challenges', async () => {
    const prisma = createFakePrisma();
    const { otp } = service(
      envWith({
        DEV_FIXED_OTP_ENABLED: true,
        DEV_FIXED_OTP_CODE: '123456',
        DEV_FIXED_OTP_ALLOWED_MOBILES: '01012345678',
      }),
      prisma,
    );
    await otp.issue(allowlisted);
    await expect(otp.check(allowlisted, '000000')).rejects.toThrow();
    prisma.otpVerification.rows[0].expiresAt = new Date(Date.now() - 1000);
    await expect(otp.check(allowlisted, '123456')).rejects.toThrow();
  });

  it('does not apply fixed OTP when NODE_ENV is test even if env flags are set', async () => {
    const prisma = createFakePrisma();
    const env = validateEnv({
      DATABASE_URL,
      JWT_ACCESS_SECRET: 'test-jwt-secret-test-jwt-secret-1234',
      OTP_HASH_SECRET: 'test-otp-secret-test-otp-secret-1234',
      NODE_ENV: NodeEnv.Test,
      DEV_FIXED_OTP_ENABLED: 'false',
    });
    const sms = new DevelopmentSmsProvider(false);
    const otpSvc = new OtpService(prisma, new ConfigService(env), sms);
    await otpSvc.issue(allowlisted);
    expect(sms.lastCodeFor(allowlisted)).not.toBe('123456');
  });
});
