import 'server-only';

import { cookies } from 'next/headers';
import { ADMIN_ACCESS_COOKIE, ADMIN_REFRESH_COOKIE, adminCookieOptions } from './cookies';

export type AdminTokenPair = {
  accessToken: string;
  accessTokenExpiresInSeconds: number;
  refreshToken: string;
  refreshTokenExpiresAt: string;
};

/** Cookie mutations — use only in Route Handlers, Server Actions, or Middleware. */
export async function setAdminTokenCookies(pair: AdminTokenPair): Promise<void> {
  const jar = await cookies();
  jar.set(ADMIN_ACCESS_COOKIE, pair.accessToken, adminCookieOptions(pair.accessTokenExpiresInSeconds));
  const refreshMax = Math.max(
    60,
    Math.floor((new Date(pair.refreshTokenExpiresAt).getTime() - Date.now()) / 1000),
  );
  jar.set(ADMIN_REFRESH_COOKIE, pair.refreshToken, adminCookieOptions(refreshMax));
}

export async function clearAdminSessionCookies(): Promise<void> {
  const jar = await cookies();
  jar.delete(ADMIN_ACCESS_COOKIE);
  jar.delete(ADMIN_REFRESH_COOKIE);
}
