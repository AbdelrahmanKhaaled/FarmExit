import type { NextRequest, NextResponse } from 'next/server';
import { ADMIN_ACCESS_COOKIE, ADMIN_REFRESH_COOKIE, adminCookieOptions } from './cookies';
import { isAdminConsoleDocumentPath } from './admin-console-path';
import { refreshAdminTokensFromApi } from './refresh-admin-tokens';
import { isAccessTokenExpired } from './session-token';
import type { AdminTokenPair } from './session-cookies.server';

export function applyAdminTokenCookies(response: NextResponse, pair: AdminTokenPair): void {
  response.cookies.set(ADMIN_ACCESS_COOKIE, pair.accessToken, adminCookieOptions(pair.accessTokenExpiresInSeconds));
  const refreshMax = Math.max(
    60,
    Math.floor((new Date(pair.refreshTokenExpiresAt).getTime() - Date.now()) / 1000),
  );
  response.cookies.set(ADMIN_REFRESH_COOKIE, pair.refreshToken, adminCookieOptions(refreshMax));
}

export function clearAdminTokenCookiesOnResponse(response: NextResponse): void {
  response.cookies.delete(ADMIN_ACCESS_COOKIE);
  response.cookies.delete(ADMIN_REFRESH_COOKIE);
}

/**
 * Refresh or clear session cookies on the middleware response (never during RSC render).
 */
export async function maybeRefreshAdminSessionOnRequest(
  request: NextRequest,
  response: NextResponse,
): Promise<NextResponse> {
  if (!isAdminConsoleDocumentPath(request.nextUrl.pathname)) {
    return response;
  }

  const access = request.cookies.get(ADMIN_ACCESS_COOKIE)?.value;
  const refresh = request.cookies.get(ADMIN_REFRESH_COOKIE)?.value;

  const needsRefresh = (!access || isAccessTokenExpired(access)) && Boolean(refresh);
  if (!needsRefresh) {
    return response;
  }

  if (!refresh) {
    return response;
  }

  const pair = await refreshAdminTokensFromApi(refresh);
  if (!pair) {
    clearAdminTokenCookiesOnResponse(response);
    return response;
  }

  applyAdminTokenCookies(response, pair);
  return response;
}
