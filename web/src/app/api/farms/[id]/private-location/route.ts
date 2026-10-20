import { NextResponse } from 'next/server';
import { fetchFarmExitApi } from '@/lib/api/forward-api';
import { readBffAccessToken } from '@/lib/api/bff-auth';
type Params = { params: Promise<{ id: string }> };
async function forward(request: Request, { params }: Params) {
  const accessToken = await readBffAccessToken();
  const headers = { 'Cache-Control': 'private, no-store' };
  if (!accessToken) return NextResponse.json({ message: 'Unauthorized' }, { status: 401, headers });
  const { id } = await params;
  const res = await fetchFarmExitApi(request, `/farms/${encodeURIComponent(id)}/private-location`, {
    method: request.method,
    accessToken,
    ...(request.method === 'PATCH' ? { json: await request.json().catch(() => null) } : {}),
  });
  return NextResponse.json(await res.json().catch(() => ({ message: 'error' })), { status: res.status, headers });
}
export const GET = forward;
export const PATCH = forward;
