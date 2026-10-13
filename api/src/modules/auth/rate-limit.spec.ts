import { RateLimiter } from './rate-limit';

describe('RateLimiter', () => {
  const options = { limit: 2, windowSeconds: 60 };

  it('allows up to the limit then reports the wait time', () => {
    const limiter = new RateLimiter();
    expect(limiter.hit('a', options, 0)).toBe(0);
    expect(limiter.hit('a', options, 1_000)).toBe(0);
    expect(limiter.hit('a', options, 2_000)).toBe(58);
  });

  it('counts keys independently and resets after the window', () => {
    const limiter = new RateLimiter();
    limiter.hit('a', options, 0);
    limiter.hit('a', options, 0);
    expect(limiter.hit('a', options, 0)).toBeGreaterThan(0);
    expect(limiter.hit('b', options, 0)).toBe(0);
    expect(limiter.hit('a', options, 60_000)).toBe(0);
  });
});
