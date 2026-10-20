import { NextResponse } from 'next/server';
import { fetchFarmExitApi } from '@/lib/api/forward-api';
import { readBffAccessToken } from '@/lib/api/bff-auth';

export async function GET(request: Request) {
  const accessToken = await readBffAccessToken();
  if (!accessToken) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  const qs = new URL(request.url).search;
  const res = await fetchFarmExitApi(request, `/partnership-applications${qs}`, { method: 'GET', accessToken });
  const data = await res.json().catch(() => null);
  return NextResponse.json(data ?? { message: 'error' }, { status: res.status });
}

export async function POST(request: Request) {
  const accessToken = await readBffAccessToken();
  if (!accessToken) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  const json = await request.json().catch(() => null);
  const res = await fetchFarmExitApi(request, '/partnership-applications', { method: 'POST', json, accessToken });
  const data = await res.json().catch(() => null);
  return NextResponse.json(data ?? { message: 'error' }, { status: res.status });
}
