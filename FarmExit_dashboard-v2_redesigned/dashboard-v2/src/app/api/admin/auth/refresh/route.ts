import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ADMIN_REFRESH_COOKIE } from '@/lib/admin/cookies';
import { clearAdminSessionCookies, setAdminTokenCookies } from '@/lib/admin/session-cookies.server';
import { refreshAdminTokensFromApi } from '@/lib/admin/refresh-admin-tokens';

/** BFF refresh — cookie mutation allowed in Route Handlers. */
export async function POST() {
  const jar = await cookies();
  const refresh = jar.get(ADMIN_REFRESH_COOKIE)?.value;
  if (!refresh) {
    return NextResponse.json({ ok: false, code: 'NO_REFRESH' }, { status: 401 });
  }
  const pair = await refreshAdminTokensFromApi(refresh);
  if (!pair) {
    await clearAdminSessionCookies();
    return NextResponse.json({ ok: false, code: 'REFRESH_FAILED' }, { status: 401 });
  }
  await setAdminTokenCookies(pair);
  return NextResponse.json({ ok: true });
}
