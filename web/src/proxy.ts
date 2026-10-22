import createMiddleware from 'next-intl/middleware';
import type { NextRequest } from 'next/server';
import { routing } from './i18n/routing';
import { maybeRefreshWebsiteSessionOnRequest } from './lib/auth/session-middleware';

const intlMiddleware = createMiddleware(routing);

export default async function proxy(request: NextRequest) {
  const response = intlMiddleware(request);
  return maybeRefreshWebsiteSessionOnRequest(request, response);
}

export const config = {
  // All paths except API routes, Next.js internals and files with an extension.
  matcher: '/((?!api|trpc|_next|_vercel|.*\\..*).*)',
};
