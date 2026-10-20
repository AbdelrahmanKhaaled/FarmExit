import { NextResponse } from 'next/server';
import { fetchFarmExitApi } from '@/lib/api/forward-api';
import { readBffAccessToken } from '@/lib/api/bff-auth';

export async function GET(request: Request) {
  const accessToken = await readBffAccessToken();
  if (!accessToken) {
    return NextResponse.json(
      { code: 'UNAUTHORIZED' },
      { status: 401, headers: { 'Cache-Control': 'private, no-store' } },
    );
  }
  const response = await fetchFarmExitApi(request, '/auth/me', { method: 'GET', accessToken });
  if (!response.ok) {
    const status = response.status === 401 ? 401 : 503;
    return NextResponse.json(
      { code: status === 401 ? 'UNAUTHORIZED' : 'API_UNAVAILABLE' },
      { status, headers: { 'Cache-Control': 'private, no-store' } },
    );
  }
  const user = await response.json();
  return NextResponse.json(user, { headers: { 'Cache-Control': 'private, no-store' } });
}
