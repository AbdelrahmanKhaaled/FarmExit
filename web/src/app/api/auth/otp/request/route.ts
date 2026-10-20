import { NextResponse } from 'next/server';
import { fetchFarmExitApi } from '@/lib/api/forward-api';

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { mobile?: unknown } | null;
  if (typeof body?.mobile !== 'string' || !body.mobile.trim()) {
    return NextResponse.json({ message: 'mobile required' }, { status: 400 });
  }
  const res = await fetchFarmExitApi(request, '/auth/otp/request', {
    method: 'POST',
    json: { mobile: body.mobile.trim() },
  });
  const data = await res.json().catch(() => null);
  return NextResponse.json(data ?? { message: 'request failed' }, { status: res.status });
}
