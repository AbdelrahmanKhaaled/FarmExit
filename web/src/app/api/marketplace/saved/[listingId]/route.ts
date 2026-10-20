import { NextResponse } from 'next/server';
import { fetchFarmExitApi } from '@/lib/api/forward-api';
import { readWebsiteAccessToken } from '@/lib/auth/session.server';

type Params = { params: Promise<{ listingId: string }> };

export async function POST(request: Request, { params }: Params) {
  const { listingId } = await params;
  const accessToken = await readWebsiteAccessToken();
  if (!accessToken) {
    return NextResponse.json({ code: 'UNAUTHORIZED' }, { status: 401 });
  }
  const res = await fetchFarmExitApi(request, `/marketplace/saved/${listingId}`, {
    method: 'POST',
    accessToken,
    json: {},
  });
  const data = await res.json().catch(() => null);
  return NextResponse.json(data ?? { ok: res.ok }, { status: res.status });
}

export async function DELETE(request: Request, { params }: Params) {
  const { listingId } = await params;
  const accessToken = await readWebsiteAccessToken();
  if (!accessToken) {
    return NextResponse.json({ code: 'UNAUTHORIZED' }, { status: 401 });
  }
  const res = await fetchFarmExitApi(request, `/marketplace/saved/${listingId}`, {
    method: 'DELETE',
    accessToken,
  });
  if (res.status === 204) return new NextResponse(null, { status: 204 });
  const data = await res.json().catch(() => null);
  return NextResponse.json(data ?? { message: 'failed' }, { status: res.status });
}
