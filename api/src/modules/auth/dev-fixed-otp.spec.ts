import { NodeEnv, validateEnv } from '../../config/env.validation';
import {
  buildDevFixedOtpConfig,
  normalizeDevFixedAllowlist,
  pickOtpCode,
  assertDevFixedOtpEnvironment,
} from './dev-fixed-otp';

const DATABASE_URL = 'mysql://farmexit:secret@localhost:3306/farmexit';
const SECRETS = {
  JWT_ACCESS_SECRET: 'test-jwt-secret-test-jwt-secret-1234',
  OTP_HASH_SECRET: 'test-otp-secret-test-otp-secret-1234',
};
const BASE = { DATABASE_URL, ...SECRETS };

describe('dev-fixed-otp', () => {
  it('normalises allowlist mobiles', () => {
    expect(normalizeDevFixedAllowlist(['01012345678', '+201088887777'])).toEqual([
      '+201012345678',
      '+201088887777',
    ]);
  });

  it('builds config only in development when enabled', () => {
    const env = {
      NODE_ENV: NodeEnv.Development,
      DEV_FIXED_OTP_ENABLED: true,
      DEV_FIXED_OTP_CODE: '123456',
      DEV_FIXED_OTP_ALLOWED_MOBILES: ['01012345678'],
    };
    const config = buildDevFixedOtpConfig(env);
    expect(config?.code).toBe('123456');
    expect(config?.allowlist.has('+201012345678')).toBe(true);
    expect(buildDevFixedOtpConfig({ ...env, NODE_ENV: NodeEnv.Test })).toBeNull();
  });

  it('picks fixed code only for allowlisted numbers', () => {
    const config = buildDevFixedOtpConfig({
      NODE_ENV: NodeEnv.Development,
      DEV_FIXED_OTP_ENABLED: true,
      DEV_FIXED_OTP_CODE: '123456',
      DEV_FIXED_OTP_ALLOWED_MOBILES: ['01012345678'],
    });
    expect(pickOtpCode('+201012345678', config, () => '999999')).toBe('123456');
    expect(pickOtpCode('+201099999999', config, () => '999999')).toBe('999999');
  });

  it('rejects enabled fixed OTP in production at env validation', () => {
    expect(() =>
      validateEnv({
        ...BASE,
        NODE_ENV: 'production',
        DEV_FIXED_OTP_ENABLED: 'true',
        DEV_FIXED_OTP_CODE: '123456',
        DEV_FIXED_OTP_ALLOWED_MOBILES: '01012345678',
      }),
    ).toThrow(/DEV_FIXED_OTP_ENABLED/);
  });

  it('rejects enabled fixed OTP outside development', () => {
    expect(() =>
      assertDevFixedOtpEnvironment({
        NODE_ENV: NodeEnv.Test,
        DEV_FIXED_OTP_ENABLED: true,
        DEV_FIXED_OTP_CODE: '123456',
        DEV_FIXED_OTP_ALLOWED_MOBILES: ['01012345678'],
      }),
    ).toThrow(/development/);
  });
});
