import { NodeEnv, validateEnv } from './env.validation';

const DATABASE_URL = 'mysql://farmexit:secret@localhost:3306/farmexit';

describe('validateEnv', () => {
  it('applies defaults and parses typed values', () => {
    const env = validateEnv({
      DATABASE_URL,
      PORT: '4100',
      CORS_ORIGINS: 'http://localhost:3000, https://farmexit.com',
    });
    expect(env.NODE_ENV).toBe(NodeEnv.Development);
    expect(env.PORT).toBe(4100);
    expect(env.CORS_ORIGINS).toEqual(['http://localhost:3000', 'https://farmexit.com']);
    expect(env.SWAGGER_ENABLED).toBe(true);
  });

  it('disables Swagger in production unless explicitly enabled', () => {
    expect(validateEnv({ DATABASE_URL, NODE_ENV: 'production' }).SWAGGER_ENABLED).toBe(false);
    expect(validateEnv({ DATABASE_URL, NODE_ENV: 'production', SWAGGER_ENABLED: 'true' }).SWAGGER_ENABLED).toBe(true);
  });

  it('rejects a missing or non-MySQL DATABASE_URL', () => {
    expect(() => validateEnv({})).toThrow(/DATABASE_URL/);
    expect(() => validateEnv({ DATABASE_URL: 'postgres://x@localhost/db' })).toThrow(/DATABASE_URL/);
  });

  it('rejects invalid values', () => {
    expect(() => validateEnv({ DATABASE_URL, PORT: 'abc' })).toThrow(/PORT/);
    expect(() => validateEnv({ DATABASE_URL, NODE_ENV: 'staging' })).toThrow(/NODE_ENV/);
    expect(() => validateEnv({ DATABASE_URL, SWAGGER_ENABLED: 'yes' })).toThrow(/SWAGGER_ENABLED/);
  });
});
