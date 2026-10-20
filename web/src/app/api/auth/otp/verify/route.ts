import { NextResponse } from 'next/server';
import { fetchFarmExitApi } from '@/lib/api/forward-api';
import { setWebsiteTokenCookies } from '@/lib/auth/session-cookies.server';
import type { VerifyOtpResponse } from '@/lib/auth/types';

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    mobile?: unknown;
    code?: unknown;
    deviceName?: unknown;
  } | null;
  if (typeof body?.mobile !== 'string' || !body.mobile.trim() || typeof body.code !== 'string' || !body.code.trim()) {
    return NextResponse.json({ message: 'mobile and code required' }, { status: 400 });
  }
  const res = await fetchFarmExitApi(request, '/auth/otp/verify', {
    method: 'POST',
    json: {
      mobile: body.mobile.trim(),
      code: body.code.trim(),
      deviceName: typeof body.deviceName === 'string' ? body.deviceName.trim() || 'FarmExit Web' : 'FarmExit Web',
    },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    return NextResponse.json(data ?? { message: 'verify failed' }, { status: res.status });
  }
  const pair = data as VerifyOtpResponse;
  await setWebsiteTokenCookies(pair);
  return NextResponse.json({ user: pair.user, isNewUser: pair.isNewUser });
}
