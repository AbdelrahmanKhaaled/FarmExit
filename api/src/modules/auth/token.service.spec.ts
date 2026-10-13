import type { ConfigService } from '@nestjs/config';
import { createHmac } from 'node:crypto';
import type { Env } from '../../config/env.validation';
import { TokenService } from './token.service';

const SECRET = 'unit-test-secret-unit-test-secret-123';

function service(overrides: Record<string, unknown> = {}): TokenService {
  const values: Record<string, unknown> = {
    JWT_ACCESS_SECRET: SECRET,
    JWT_ISSUER: 'farmexit-api',
    ACCESS_TOKEN_TTL_SECONDS: 900,
    REFRESH_TOKEN_TTL_DAYS: 30,
    ...overrides,
  };
  return new TokenService({ get: (key: string) => values[key] } as unknown as ConfigService<Env, true>);
}

const b64 = (value: unknown): string => Buffer.from(JSON.stringify(value)).toString('base64url');

describe('TokenService access tokens', () => {
  it('signs and verifies a token carrying only user and session ids', () => {
    const tokens = service();
    const claims = tokens.verifyAccessToken(tokens.signAccessToken(12n, 34n));
    expect(claims).toMatchObject({ sub: '12', sid: '34', iss: 'farmexit-api' });
    expect(claims && claims.exp - claims.iat).toBe(900);
    expect(Object.keys(claims ?? {}).sort()).toEqual(['exp', 'iat', 'iss', 'sid', 'sub']);
  });

  it('rejects expired tokens', () => {
    const tokens = service();
    const token = tokens.signAccessToken(1n, 1n, new Date('2026-01-01T00:00:00Z'));
    expect(tokens.verifyAccessToken(token, new Date('2026-01-01T00:14:59Z'))).not.toBeNull();
    expect(tokens.verifyAccessToken(token, new Date('2026-01-01T00:15:00Z'))).toBeNull();
  });

  it('rejects tampered payloads, wrong secrets and wrong issuers', () => {
    const tokens = service();
    const [h, , s] = tokens.signAccessToken(1n, 1n).split('.') as [string, string, string];
    const forged = `${h}.${b64({ sub: '2', sid: '1', iss: 'farmexit-api', iat: 1, exp: 9_999_999_999 })}.${s}`;
    expect(tokens.verifyAccessToken(forged)).toBeNull();
    expect(
      service({ JWT_ACCESS_SECRET: 'another-secret-another-secret-123456' }).verifyAccessToken(
        tokens.signAccessToken(1n, 1n),
      ),
    ).toBeNull();
    expect(service({ JWT_ISSUER: 'other' }).verifyAccessToken(tokens.signAccessToken(1n, 1n))).toBeNull();
  });

  it('rejects alg none and algorithm switching', () => {
    const tokens = service();
    const payload = b64({ sub: '1', sid: '1', iss: 'farmexit-api', iat: 1, exp: 9_999_999_999 });
    expect(tokens.verifyAccessToken(`${b64({ alg: 'none', typ: 'JWT' })}.${payload}.`)).toBeNull();
    const hs512Header = b64({ alg: 'HS512', typ: 'JWT' });
    const sig = createHmac('sha512', SECRET).update(`${hs512Header}.${payload}`).digest('base64url');
    expect(tokens.verifyAccessToken(`${hs512Header}.${payload}.${sig}`)).toBeNull();
  });

  it('never throws on garbage', () => {
    const tokens = service();
    for (const garbage of ['', 'a', 'a.b', 'a.b.c', '...', 'a.b.c.d']) {
      expect(tokens.verifyAccessToken(garbage)).toBeNull();
    }
  });
});

describe('TokenService refresh tokens', () => {
  it('generates unique 256-bit secrets and stores only a hash', () => {
    const tokens = service();
    const a = tokens.generateRefreshSecret();
    const b = tokens.generateRefreshSecret();
    expect(a.secret).not.toBe(b.secret);
    expect(a.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(a.hash).not.toContain(a.secret);
    expect(tokens.hashRefreshSecret(a.secret)).toBe(a.hash);
  });

  it('formats and parses <sessionId>.<secret>', () => {
    const tokens = service();
    const { secret } = tokens.generateRefreshSecret();
    expect(tokens.parseRefreshToken(tokens.formatRefreshToken(77n, secret))).toEqual({ sessionId: 77n, secret });
    expect(tokens.parseRefreshToken('nope')).toBeNull();
    expect(tokens.parseRefreshToken(`x.${secret}`)).toBeNull();
    expect(tokens.parseRefreshToken('1.short')).toBeNull();
    // 19 digits above the BIGINT range must not reach the database (would be a 500 for an anonymous caller)
    expect(tokens.parseRefreshToken('9999999999999999999.' + secret)).toBeNull();
    expect(tokens.parseRefreshToken('9223372036854775807.' + secret)).not.toBeNull();
    expect(tokens.parseRefreshToken('9223372036854775808.' + secret)).toBeNull();
  });
});
