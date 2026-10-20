import 'server-only';

import { cookies } from 'next/headers';
import { WEB_ACCESS_COOKIE, WEB_REFRESH_COOKIE, webCookieOptions } from './cookies';
import type { TokenPair } from './types';

export async function setWebsiteTokenCookies(pair: TokenPair): Promise<void> {
  const jar = await cookies();
  jar.set(WEB_ACCESS_COOKIE, pair.accessToken, webCookieOptions(pair.accessTokenExpiresInSeconds));
  const refreshMax = Math.max(
    60,
    Math.floor((new Date(pair.refreshTokenExpiresAt).getTime() - Date.now()) / 1000),
  );
  jar.set(WEB_REFRESH_COOKIE, pair.refreshToken, webCookieOptions(refreshMax));
}

export async function clearWebsiteSessionCookies(): Promise<void> {
  const jar = await cookies();
  jar.delete(WEB_ACCESS_COOKIE);
  jar.delete(WEB_REFRESH_COOKIE);
}
