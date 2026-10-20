import type { NextRequest, NextResponse } from 'next/server';
import { WEB_ACCESS_COOKIE, WEB_REFRESH_COOKIE, webCookieOptions } from './cookies';
import { refreshWebsiteTokensFromApi } from './refresh-tokens';
import { isAccessTokenExpired } from './session-token';
import type { TokenPair } from './types';

export function applyWebsiteTokenCookies(response: NextResponse, pair: TokenPair): void {
  response.cookies.set(WEB_ACCESS_COOKIE, pair.accessToken, webCookieOptions(pair.accessTokenExpiresInSeconds));
  const refreshMax = Math.max(60, Math.floor((new Date(pair.refreshTokenExpiresAt).getTime() - Date.now()) / 1000));
  response.cookies.set(WEB_REFRESH_COOKIE, pair.refreshToken, webCookieOptions(refreshMax));
}

export function clearWebsiteTokenCookiesOnResponse(response: NextResponse): void {
  response.cookies.delete(WEB_ACCESS_COOKIE);
  response.cookies.delete(WEB_REFRESH_COOKIE);
}

export function isWebsiteAccountPath(pathname: string): boolean {
  return /\/(en|ar)\/(my|sign-in|auth)(\/|$)/.test(pathname);
}

export async function maybeRefreshWebsiteSessionOnRequest(
  request: NextRequest,
  response: NextResponse,
): Promise<NextResponse> {
  if (!isWebsiteAccountPath(request.nextUrl.pathname)) {
    return response;
  }

  const access = request.cookies.get(WEB_ACCESS_COOKIE)?.value;
  const refresh = request.cookies.get(WEB_REFRESH_COOKIE)?.value;
  const needsRefresh = (!access || isAccessTokenExpired(access)) && Boolean(refresh);
  if (!needsRefresh || !refresh) {
    return response;
  }

  const pair = await refreshWebsiteTokensFromApi(refresh);
  if (!pair) {
    // A concurrent refresh may have won (the API rejects its duplicate without
    // revoking the session). Do not overwrite that response's fresh cookies.
    return response;
  }

  applyWebsiteTokenCookies(response, pair);
  // Server components on this request must see the rotated token too.
  request.cookies.set(WEB_ACCESS_COOKIE, pair.accessToken);
  request.cookies.set(WEB_REFRESH_COOKIE, pair.refreshToken);
  response.headers.set('x-middleware-request-cookie', request.cookies.toString());
  const overrides = new Set((response.headers.get('x-middleware-override-headers') ?? '').split(',').filter(Boolean));
  overrides.add('cookie');
  response.headers.set('x-middleware-override-headers', [...overrides].join(','));
  return response;
}
