import { NextResponse } from 'next/server';
import { fetchFarmExitApi } from '@/lib/api/forward-api';
import { readBffAccessToken } from '@/lib/api/bff-auth';

type Params = { params: Promise<{ id: string; documentId: string }> };

export async function GET(request: Request, { params }: Params) {
  const accessToken = await readBffAccessToken();
  if (!accessToken) return new NextResponse('Unauthorized', { status: 401 });
  const { id, documentId } = await params;
  const res = await fetchFarmExitApi(request, `/requests/${id}/documents/${documentId}/download`, {
    method: 'GET',
    accessToken,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    return new NextResponse(text || 'error', { status: res.status });
  }
  const contentType = res.headers.get('content-type') ?? 'application/octet-stream';
  const disposition = res.headers.get('content-disposition');
  const buffer = await res.arrayBuffer();
  const headers: Record<string, string> = {
    'content-type': contentType,
    'cache-control': 'private, no-store',
  };
  if (disposition) headers['content-disposition'] = disposition;
  return new NextResponse(buffer, { status: 200, headers });
}
