import { getApiBaseUrl } from '@/lib/api/config';
import type { AdminTokenPair } from './session-cookies.server';

export async function refreshAdminTokensFromApi(refreshToken: string): Promise<AdminTokenPair | null> {
  const res = await fetch(`${getApiBaseUrl()}/admin-auth/refresh`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ refreshToken }),
    cache: 'no-store',
  });
  if (!res.ok) return null;
  return (await res.json()) as AdminTokenPair;
}
