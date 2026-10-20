import { getApiBaseUrl } from '@/lib/api/config';
import type { TokenPair } from './types';

// Parallel requests in one website server must share the same rotation attempt.
// Entries exist only while the request is in flight; no completed token pair is cached.
const rotations = new Map<string, Promise<TokenPair | null>>();

export function refreshWebsiteTokensFromApi(refreshToken: string): Promise<TokenPair | null> {
  const existing = rotations.get(refreshToken);
  if (existing) return existing;
  const rotation = rotate(refreshToken).finally(() => rotations.delete(refreshToken));
  rotations.set(refreshToken, rotation);
  return rotation;
}

async function rotate(refreshToken: string): Promise<TokenPair | null> {
  const res = await fetch(`${getApiBaseUrl()}/auth/refresh`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ refreshToken }),
    cache: 'no-store',
  }).catch(() => null);
  if (!res?.ok) return null;
  return (await res.json()) as TokenPair;
}
