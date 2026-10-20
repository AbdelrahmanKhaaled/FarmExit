import { NextResponse } from 'next/server';
import { fetchFarmExitApi } from '@/lib/api/forward-api';
import { readBffAccessToken } from '@/lib/api/bff-auth';

type Params = { params: Promise<{ id: string; mediaId: string }> };

export async function GET(request: Request, { params }: Params) {
  const accessToken = await readBffAccessToken();
  if (!accessToken) return new NextResponse('Unauthorized', { status: 401 });
  const { id, mediaId } = await params;
  const res = await fetchFarmExitApi(request, `/farms/${id}/media/${mediaId}/file`, {
    method: 'GET',
    accessToken,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    return new NextResponse(text || 'error', { status: res.status });
  }
  const contentType = res.headers.get('content-type') ?? 'application/octet-stream';
  const buffer = await res.arrayBuffer();
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'content-type': contentType,
      'cache-control': 'private, no-store',
    },
  });
}
