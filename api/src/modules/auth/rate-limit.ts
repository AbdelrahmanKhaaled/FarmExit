import {
  type CanActivate,
  type ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';

export type RateLimitOptions = { limit: number; windowSeconds: number };

const RATE_LIMIT_KEY = 'auth:rate-limit';

/** Per-client-IP limit for one route (in-memory, per process). */
export const RateLimit = (options: RateLimitOptions): MethodDecorator => SetMetadata(RATE_LIMIT_KEY, options);

/** Fixed-window counter store. Entries expire with their window; the map is swept so it cannot grow unbounded. */
@Injectable()
export class RateLimiter {
  private readonly windows = new Map<string, { count: number; resetAt: number }>();

  /** Returns 0 when allowed, otherwise the seconds until the window resets. */
  hit(key: string, { limit, windowSeconds }: RateLimitOptions, now = Date.now()): number {
    if (this.windows.size > 10_000) this.sweep(now);
    const current = this.windows.get(key);
    if (!current || current.resetAt <= now) {
      this.windows.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
      return 0;
    }
    current.count += 1;
    return current.count > limit ? Math.ceil((current.resetAt - now) / 1000) : 0;
  }

  private sweep(now: number): void {
    for (const [key, value] of this.windows) if (value.resetAt <= now) this.windows.delete(key);
  }
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly limiter: RateLimiter,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const options = this.reflector.get<RateLimitOptions | undefined>(RATE_LIMIT_KEY, context.getHandler());
    if (!options) return true;

    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const key = `${context.getClass().name}.${context.getHandler().name}:${req.ip ?? 'unknown'}`;
    const retryAfter = this.limiter.hit(key, options);
    if (retryAfter === 0) return true;

    http.getResponse<Response>().setHeader('Retry-After', String(retryAfter));
    throw new HttpException(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        error: 'Too Many Requests',
        message: 'Too many requests. Try again later',
        retryAfterSeconds: retryAfter,
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
