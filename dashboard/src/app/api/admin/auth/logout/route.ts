import { NextResponse } from 'next/server';
import { getApiBaseUrl } from '@/lib/api/config';
import { readAdminAccessToken } from '@/lib/admin/session.server';
import { clearAdminSessionCookies } from '@/lib/admin/session-cookies.server';

export async function POST() {
  const token = await readAdminAccessToken();
  if (token) {
    await fetch(`${getApiBaseUrl()}/admin-auth/logout`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, accept: 'application/json' },
    }).catch(() => undefined);
  }
  await clearAdminSessionCookies();
  return NextResponse.json({ ok: true });
}
