import { cookies } from 'next/headers';
import { WEB_ACCESS_COOKIE, WEB_REFRESH_COOKIE } from '@/lib/auth/cookies';
import { isAccessTokenExpired } from '@/lib/auth/session-token';
import { refreshWebsiteTokensFromApi } from '@/lib/auth/refresh-tokens';
import { setWebsiteTokenCookies } from '@/lib/auth/session-cookies.server';

export async function readBffAccessToken(): Promise<string | null> {
  const jar = await cookies();
  const access = jar.get(WEB_ACCESS_COOKIE)?.value;
  if (access && !isAccessTokenExpired(access)) return access;
  const refresh = jar.get(WEB_REFRESH_COOKIE)?.value;
  if (!refresh) return null;
  const pair = await refreshWebsiteTokensFromApi(refresh);
  if (!pair) return null;
  await setWebsiteTokenCookies(pair);
  return pair.accessToken;
}
