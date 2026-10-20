import { NextResponse } from 'next/server';
import { fetchFarmExitApi } from '@/lib/api/forward-api';
import { readBffAccessToken } from '@/lib/api/bff-auth';

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const accessToken = await readBffAccessToken();
  if (!accessToken) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const qs = new URL(request.url).search;
  const res = await fetchFarmExitApi(request, `/farms/${id}/media${qs}`, { method: 'GET', accessToken });
  const data = await res.json().catch(() => null);
  return NextResponse.json(data ?? { message: 'error' }, { status: res.status });
}

export async function POST(request: Request, { params }: Params) {
  const accessToken = await readBffAccessToken();
  if (!accessToken) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const formData = await request.formData();
  const res = await fetchFarmExitApi(request, `/farms/${id}/media`, {
    method: 'POST',
    body: formData,
    accessToken,
  });
  const data = await res.json().catch(() => null);
  return NextResponse.json(data ?? { message: 'error' }, { status: res.status });
}
