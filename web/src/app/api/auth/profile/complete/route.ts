import { NextResponse } from 'next/server';
import { fetchFarmExitApi } from '@/lib/api/forward-api';
import { readBffAccessToken } from '@/lib/api/bff-auth';
import type { AuthUser } from '@/lib/auth/types';

export async function POST(request: Request) {
  const accessToken = await readBffAccessToken();
  if (!accessToken) {
    return NextResponse.json({ code: 'UNAUTHORIZED' }, { status: 401 });
  }
  const body = (await request.json()) as { fullName?: string; email?: string };
  if (!body.fullName?.trim()) {
    return NextResponse.json({ message: 'fullName required' }, { status: 400 });
  }
  const res = await fetchFarmExitApi(request, '/auth/profile/complete', {
    method: 'POST',
    accessToken,
    json: { fullName: body.fullName.trim(), email: body.email?.trim() || undefined },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    return NextResponse.json(data ?? { message: 'failed' }, { status: res.status });
  }
  return NextResponse.json(data as AuthUser);
}
