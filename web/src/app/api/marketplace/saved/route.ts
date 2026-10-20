import { NextResponse } from 'next/server';
import { fetchFarmExitApi } from '@/lib/api/forward-api';
import { readWebsiteAccessToken } from '@/lib/auth/session.server';

export async function GET(request: Request) {
  const accessToken = await readWebsiteAccessToken();
  if (!accessToken) {
    return NextResponse.json({ code: 'UNAUTHORIZED' }, { status: 401 });
  }
  const res = await fetchFarmExitApi(request, '/marketplace/saved', { method: 'GET', accessToken });
  const data = await res.json().catch(() => null);
  return NextResponse.json(data ?? { message: 'failed' }, { status: res.status });
}
