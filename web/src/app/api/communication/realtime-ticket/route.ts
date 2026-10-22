import { NextResponse } from 'next/server';
import { fetchFarmExitApi } from '@/lib/api/forward-api';
import { readBffAccessToken } from '@/lib/api/bff-auth';

const NO_STORE = { 'cache-control': 'no-store' };

export async function POST(request: Request) {
  const accessToken = await readBffAccessToken();
  if (!accessToken) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401, headers: NO_STORE });
  }
  const res = await fetchFarmExitApi(request, '/communication/realtime-ticket', {
    method: 'POST',
    accessToken,
  });
  const data = await res.json().catch(() => null);
  return NextResponse.json(data ?? { message: 'error' }, { status: res.status, headers: NO_STORE });
}
