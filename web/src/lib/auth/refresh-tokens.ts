import { getApiBaseUrl } from '@/lib/api/config';
import type { TokenPair } from './types';

export async function refreshWebsiteTokensFromApi(refreshToken: string): Promise<TokenPair | null> {
  const res = await fetch(`${getApiBaseUrl()}/auth/refresh`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ refreshToken }),
    cache: 'no-store',
  }).catch(() => null);
  if (!res?.ok) return null;
  return (await res.json()) as TokenPair;
}
