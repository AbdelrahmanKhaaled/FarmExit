import {
  assertClientDemoOtpEnvironment,
  buildClientDemoOtpConfig,
  isClientDemoDatabaseUrl,
} from './client-demo-otp';
import { NodeEnv } from '../../config/env.validation';
import { pickOtpCodeFromConfigs } from './dev-fixed-otp';

const LOCAL_DB = 'mysql://farmexit:secret@127.0.0.1:3306/farmexit';
const DEMO_MOBILE = '+201099887701';

describe('client-demo-otp', () => {
  it('requires explicit opt-in and loopback farmexit database', () => {
    expect(
      buildClientDemoOtpConfig({
        CLIENT_DEMO_OTP_ENABLED: false,
        CLIENT_DEMO_OTP_CODE: '123456',
        CLIENT_DEMO_OTP_ALLOWED_MOBILES: [DEMO_MOBILE],
        NODE_ENV: NodeEnv.Development,
        DATABASE_URL: LOCAL_DB,
      }),
    ).toBeNull();
    expect(
      buildClientDemoOtpConfig({
        CLIENT_DEMO_OTP_ENABLED: true,
        CLIENT_DEMO_OTP_CODE: '123456',
        CLIENT_DEMO_OTP_ALLOWED_MOBILES: [DEMO_MOBILE],
        NODE_ENV: NodeEnv.Production,
        DATABASE_URL: LOCAL_DB,
      }),
    ).toBeNull();
    expect(
      buildClientDemoOtpConfig({
        CLIENT_DEMO_OTP_ENABLED: true,
        CLIENT_DEMO_OTP_CODE: '123456',
        CLIENT_DEMO_OTP_ALLOWED_MOBILES: [DEMO_MOBILE],
        NODE_ENV: NodeEnv.Development,
        DATABASE_URL: 'mysql://farmexit:secret@db.example.com:3306/farmexit',
      }),
    ).toBeNull();
  });

  it('issues fixed code only for allowlisted mobiles', () => {
    const config = buildClientDemoOtpConfig({
      CLIENT_DEMO_OTP_ENABLED: true,
      CLIENT_DEMO_OTP_CODE: '123456',
      CLIENT_DEMO_OTP_ALLOWED_MOBILES: [DEMO_MOBILE],
      NODE_ENV: NodeEnv.Development,
      DATABASE_URL: LOCAL_DB,
    });
    expect(pickOtpCodeFromConfigs(DEMO_MOBILE, [config], () => '999999')).toBe('123456');
    expect(pickOtpCodeFromConfigs('+201099887705', [config], () => '999999')).toBe('999999');
  });

  it('rejects unsafe environment when enabled', () => {
    expect(() =>
      assertClientDemoOtpEnvironment({
        CLIENT_DEMO_OTP_ENABLED: true,
        CLIENT_DEMO_OTP_CODE: '123456',
        CLIENT_DEMO_OTP_ALLOWED_MOBILES: [DEMO_MOBILE],
        NODE_ENV: NodeEnv.Production,
        DATABASE_URL: LOCAL_DB,
      }),
    ).toThrow(/production/);
    expect(isClientDemoDatabaseUrl(LOCAL_DB)).toBe(true);
  });
});
