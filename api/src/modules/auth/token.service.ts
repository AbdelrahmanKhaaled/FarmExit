import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { Env } from '../../config/env.validation';

export type AccessTokenClaims = {
  /** User id (decimal string). */
  sub: string;
  /** Session id (decimal string): the access token dies with its session. */
  sid: string;
  iss: string;
  iat: number;
  exp: number;
};

export type ParsedRefreshToken = { sessionId: bigint; secret: string };

const HEADER = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
const MAX_BIGINT = 9223372036854775807n;
const REFRESH_TOKEN_PATTERN = /^(\d{1,19})\.([A-Za-z0-9_-]{43})$/;

/**
 * Short-lived access tokens (JWT, HS256 with a fixed algorithm, so `alg: none` and algorithm switching are
 * impossible) and opaque refresh tokens (`<sessionId>.<256-bit secret>`; only the SHA-256 hash is stored).
 */
@Injectable()
export class TokenService {
  private readonly secret: string;
  private readonly issuer: string;
  readonly accessTtlSeconds: number;
  readonly refreshTtlMs: number;

  constructor(config: ConfigService<Env, true>) {
    this.secret = config.get('JWT_ACCESS_SECRET', { infer: true });
    this.issuer = config.get('JWT_ISSUER', { infer: true });
    this.accessTtlSeconds = config.get('ACCESS_TOKEN_TTL_SECONDS', { infer: true });
    this.refreshTtlMs = config.get('REFRESH_TOKEN_TTL_DAYS', { infer: true }) * 24 * 60 * 60 * 1000;
  }

  signAccessToken(userId: bigint, sessionId: bigint, now = new Date()): string {
    const iat = Math.floor(now.getTime() / 1000);
    const claims: AccessTokenClaims = {
      sub: userId.toString(),
      sid: sessionId.toString(),
      iss: this.issuer,
      iat,
      exp: iat + this.accessTtlSeconds,
    };
    const body = Buffer.from(JSON.stringify(claims)).toString('base64url');
    return `${HEADER}.${body}.${this.signature(`${HEADER}.${body}`)}`;
  }

  /** Returns the claims of a valid, unexpired token, otherwise null. Never throws on malformed input. */
  verifyAccessToken(token: string, now = new Date()): AccessTokenClaims | null {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, body, signature] = parts as [string, string, string];
    if (header !== HEADER) return null;

    const expected = Buffer.from(this.signature(`${header}.${body}`));
    const actual = Buffer.from(signature);
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;

    let claims: unknown;
    try {
      claims = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    } catch {
      return null;
    }
    if (!isClaims(claims) || claims.iss !== this.issuer) return null;
    if (claims.exp <= Math.floor(now.getTime() / 1000)) return null;
    return claims;
  }

  /** New refresh secret and its storable hash. The caller prefixes the secret with the session id. */
  generateRefreshSecret(): { secret: string; hash: string } {
    const secret = randomBytes(32).toString('base64url');
    return { secret, hash: this.hashRefreshSecret(secret) };
  }

  hashRefreshSecret(secret: string): string {
    return createHash('sha256').update(secret).digest('hex');
  }

  formatRefreshToken(sessionId: bigint, secret: string): string {
    return `${sessionId.toString()}.${secret}`;
  }

  parseRefreshToken(token: string): ParsedRefreshToken | null {
    const match = REFRESH_TOKEN_PATTERN.exec(token);
    if (!match) return null;
    const sessionId = BigInt(match[1]);
    if (sessionId > MAX_BIGINT) return null; // 19 digits can exceed a BIGINT column: reject instead of erroring
    return { sessionId, secret: match[2] };
  }

  private signature(data: string): string {
    return createHmac('sha256', this.secret).update(data).digest('base64url');
  }
}

function isClaims(value: unknown): value is AccessTokenClaims {
  if (typeof value !== 'object' || value === null) return false;
  const c = value as Record<string, unknown>;
  return (
    typeof c.sub === 'string' &&
    /^\d+$/.test(c.sub) &&
    typeof c.sid === 'string' &&
    /^\d+$/.test(c.sid) &&
    typeof c.iss === 'string' &&
    typeof c.iat === 'number' &&
    typeof c.exp === 'number'
  );
}
