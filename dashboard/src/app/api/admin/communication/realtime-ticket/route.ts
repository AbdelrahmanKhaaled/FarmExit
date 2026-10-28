import { NextResponse } from 'next/server';
import { fetchFarmExitApi } from '@/lib/api/forward-api';
import { readAdminAccessToken } from '@/lib/admin/session.server';

const NO_STORE = { 'cache-control': 'no-store' };

export async function POST(request: Request) {
  const accessToken = await readAdminAccessToken();
  if (!accessToken) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401, headers: NO_STORE });
  }
  const res = await fetchFarmExitApi(request, '/staff/communication/realtime-ticket', {
    method: 'POST',
    headers: { authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json().catch(() => null);
  return NextResponse.json(data ?? { message: 'error' }, { status: res.status, headers: NO_STORE });
}
