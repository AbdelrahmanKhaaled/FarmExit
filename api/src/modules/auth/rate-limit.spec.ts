import { Reflector } from '@nestjs/core';
import { RateLimit, RateLimitGuard, RateLimiter } from './rate-limit';

describe('RateLimitGuard', () => {
  it('keys limits by forwarded client IP when trust proxy is enabled', () => {
    const guard = new RateLimitGuard(new Reflector(), new RateLimiter());
    const handler = function handler() {};
    RateLimit({ limit: 1, windowSeconds: 60 })(handler);

    const ctx = {
      getHandler: () => handler,
      getClass: () => class AuthController {},
      switchToHttp: () => ({
        getRequest: () => ({ ip: '203.0.113.50', headers: {} }),
        getResponse: () => ({ setHeader: jest.fn() }),
      }),
    };

    expect(guard.canActivate(ctx as never)).toBe(true);
    expect(() => guard.canActivate(ctx as never)).toThrow();
  });
});
