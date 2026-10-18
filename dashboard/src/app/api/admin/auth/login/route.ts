import { NextResponse } from 'next/server';
import { fetchFarmExitApi } from '@/lib/api/forward-api';
import { clearAdminSessionCookies, setAdminTokenCookies } from '@/lib/admin/session-cookies.server';
import { staffHasDashboardConsoleAccess } from '@/lib/admin/session.server';

export async function POST(request: Request) {
  const body = (await request.json()) as { email?: string; password?: string };
  if (!body.email?.trim() || !body.password) {
    return NextResponse.json({ message: 'email and password required' }, { status: 400 });
  }
  const loginRes = await fetchFarmExitApi(request, '/admin-auth/login', {
    method: 'POST',
    json: {
      email: body.email.trim(),
      password: body.password,
    },
  });
  const loginData = await loginRes.json().catch(() => null);
  if (!loginRes.ok) {
    return NextResponse.json(loginData ?? { message: 'login failed' }, { status: loginRes.status });
  }
  const pair = loginData as {
    accessToken: string;
    accessTokenExpiresInSeconds: number;
    refreshToken: string;
    refreshTokenExpiresAt: string;
    staff: { roles: string[]; fullName: string | null; userId: string };
  };
  if (!staffHasDashboardConsoleAccess(pair.staff?.roles ?? [])) {
    await clearAdminSessionCookies();
    return NextResponse.json({ code: 'NOT_ADMIN' }, { status: 403 });
  }
  await setAdminTokenCookies(pair);
  return NextResponse.json({
    ok: true,
    staff: {
      id: pair.staff.userId,
      fullName: pair.staff.fullName,
      roles: pair.staff.roles,
    },
  });
}
