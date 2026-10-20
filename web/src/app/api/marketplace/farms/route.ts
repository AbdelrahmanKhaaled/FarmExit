import { NextResponse } from 'next/server';
import { fetchFarmExitApi } from '@/lib/api/forward-api';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const qs = url.searchParams.toString();
  const path = qs ? `/marketplace/farms?${qs}` : '/marketplace/farms';
  const res = await fetchFarmExitApi(request, path, { method: 'GET' });
  const data = await res.json().catch(() => null);
  return NextResponse.json(data ?? { message: 'unavailable' }, { status: res.status });
}
