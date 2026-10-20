import { NextResponse } from 'next/server';
import { fetchFarmExitApi } from '@/lib/api/forward-api';
import { clearWebsiteSessionCookies } from '@/lib/auth/session-cookies.server';
import { readBffAccessToken } from '@/lib/api/bff-auth';

export async function POST(request: Request) {
  const accessToken = await readBffAccessToken();
  if (accessToken) {
    await fetchFarmExitApi(request, '/auth/logout', { method: 'POST', accessToken });
  }
  await clearWebsiteSessionCookies();
  return NextResponse.json({ ok: true });
}
