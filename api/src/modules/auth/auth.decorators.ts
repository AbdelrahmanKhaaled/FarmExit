import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthContext, ClientContext } from './auth.types';

export type AuthenticatedRequest = Request & { auth?: AuthContext };

/** The authenticated caller. Only valid on routes protected by `AccessTokenGuard`. */
export const CurrentAuth = createParamDecorator((_data: unknown, context: ExecutionContext): AuthContext => {
  const auth = context.switchToHttp().getRequest<AuthenticatedRequest>().auth;
  if (!auth) throw new Error('CurrentAuth used on a route without AccessTokenGuard');
  return auth;
});

/** Client IP and user agent, stored on the session for the user's device list and audits. */
export const Client = createParamDecorator((_data: unknown, context: ExecutionContext): ClientContext => {
  const req = context.switchToHttp().getRequest<Request>();
  const userAgent = req.headers['user-agent'];
  return { ip: req.ip ?? null, userAgent: typeof userAgent === 'string' ? userAgent : null };
});
