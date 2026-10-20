import 'server-only';

import { cookies } from 'next/headers';
import { getApiBaseUrl } from '@/lib/api/config';
import { WEB_ACCESS_COOKIE } from './cookies';
import type { AuthUser } from './types';

export async function readWebsiteAccessToken(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(WEB_ACCESS_COOKIE)?.value ?? null;
}

export async function fetchAuthMe(accessToken: string): Promise<AuthUser | null> {
  const res = await fetch(`${getApiBaseUrl()}/auth/me`, {
    headers: { authorization: `Bearer ${accessToken}`, accept: 'application/json' },
    cache: 'no-store',
  }).catch(() => null);
  if (!res?.ok) return null;
  return (await res.json()) as AuthUser;
}

export type WebsiteSession = {
  accessToken: string;
  user: AuthUser;
};

export async function getWebsiteSession(): Promise<WebsiteSession | null> {
  const accessToken = await readWebsiteAccessToken();
  if (!accessToken) return null;
  const user = await fetchAuthMe(accessToken);
  if (!user) return null;
  return { accessToken, user };
}

export async function apiFetchWebsite<T>(path: string, accessToken: string): Promise<T> {
  const res = await fetch(`${getApiBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`, {
    headers: { authorization: `Bearer ${accessToken}`, accept: 'application/json' },
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`API ${path} failed: ${res.status}`);
  }
  return (await res.json()) as T;
}
