import { NextResponse } from 'next/server';
import { fetchFarmExitApi } from '@/lib/api/forward-api';
import { readBffAccessToken } from '@/lib/api/bff-auth';
type Params = { params: Promise<{ id: string }> };
export async function GET(request: Request, { params }: Params) {
  const accessToken = await readBffAccessToken();
  if (!accessToken) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const res = await fetchFarmExitApi(request, `/listing-requests/${id}${new URL(request.url).search}`, {
    method: 'GET',
    accessToken,
  });
  const data = await res.json().catch(() => null);
  return NextResponse.json(data ?? { message: 'error' }, { status: res.status });
}
export async function PATCH(request: Request, { params }: Params) {
  const accessToken = await readBffAccessToken();
  if (!accessToken) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const res = await fetchFarmExitApi(request, `/listing-requests/${id}`, {
    method: 'PATCH',
    accessToken,
    json: await request.json().catch(() => null),
  });
  const data = await res.json().catch(() => null);
  return NextResponse.json(data ?? { message: 'error' }, { status: res.status });
}
