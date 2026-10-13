import { NodeEnv, validateEnv } from './env.validation';

const DATABASE_URL = 'mysql://farmexit:secret@localhost:3306/farmexit';
const SECRETS = {
  JWT_ACCESS_SECRET: 'test-jwt-secret-test-jwt-secret-1234',
  OTP_HASH_SECRET: 'test-otp-secret-test-otp-secret-1234',
};
const BASE = { DATABASE_URL, ...SECRETS };

describe('validateEnv', () => {
  it('applies defaults and parses typed values', () => {
    const env = validateEnv({
      ...BASE,
      PORT: '4100',
      CORS_ORIGINS: 'http://localhost:3000, https://farmexit.com',
    });
    expect(env.NODE_ENV).toBe(NodeEnv.Development);
    expect(env.PORT).toBe(4100);
    expect(env.CORS_ORIGINS).toEqual(['http://localhost:3000', 'https://farmexit.com']);
    expect(env.SWAGGER_ENABLED).toBe(true);
    expect(env.ACCESS_TOKEN_TTL_SECONDS).toBe(900);
    expect(env.REFRESH_TOKEN_TTL_DAYS).toBe(30);
    expect(env.OTP_TTL_SECONDS).toBe(300);
    expect(env.OTP_RESEND_COOLDOWN_SECONDS).toBe(60);
    expect(env.OTP_MAX_ATTEMPTS).toBe(5);
  });

  it('refuses identical JWT and OTP secrets', () => {
    const same = 'same-secret-same-secret-same-secret-1234';
    expect(() => validateEnv({ ...BASE, JWT_ACCESS_SECRET: same, OTP_HASH_SECRET: same })).toThrow(
      /different from JWT_ACCESS_SECRET/,
    );
  });

  it('disables Swagger in production unless explicitly enabled', () => {
    expect(validateEnv({ ...BASE, NODE_ENV: 'production' }).SWAGGER_ENABLED).toBe(false);
    expect(validateEnv({ ...BASE, NODE_ENV: 'production', SWAGGER_ENABLED: 'true' }).SWAGGER_ENABLED).toBe(true);
  });

  it('rejects a missing or non-MySQL DATABASE_URL', () => {
    expect(() => validateEnv({ ...SECRETS })).toThrow(/DATABASE_URL/);
    expect(() => validateEnv({ ...SECRETS, DATABASE_URL: 'postgres://x@localhost/db' })).toThrow(/DATABASE_URL/);
  });

  it('rejects invalid values', () => {
    expect(() => validateEnv({ ...BASE, PORT: 'abc' })).toThrow(/PORT/);
    expect(() => validateEnv({ ...BASE, NODE_ENV: 'staging' })).toThrow(/NODE_ENV/);
    expect(() => validateEnv({ ...BASE, SWAGGER_ENABLED: 'yes' })).toThrow(/SWAGGER_ENABLED/);
    expect(() => validateEnv({ ...BASE, OTP_MAX_ATTEMPTS: '0' })).toThrow(/OTP_MAX_ATTEMPTS/);
  });

  it('requires strong, distinct auth secrets (no defaults)', () => {
    expect(() => validateEnv({ DATABASE_URL })).toThrow(/JWT_ACCESS_SECRET/);
    expect(() =>
      validateEnv({ DATABASE_URL, JWT_ACCESS_SECRET: 'short', OTP_HASH_SECRET: SECRETS.OTP_HASH_SECRET }),
    ).toThrow(/JWT_ACCESS_SECRET/);
    expect(() => validateEnv({ DATABASE_URL, JWT_ACCESS_SECRET: SECRETS.JWT_ACCESS_SECRET })).toThrow(
      /OTP_HASH_SECRET/,
    );
  });
});
