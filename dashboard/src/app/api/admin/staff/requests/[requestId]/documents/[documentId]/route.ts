import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getApiBaseUrl } from '@/lib/api/config';
import { ADMIN_ACCESS_COOKIE } from '@/lib/admin/cookies';

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ requestId: string; documentId: string }> },
) {
  const { requestId, documentId } = await ctx.params;
  const jar = await cookies();
  const token = jar.get(ADMIN_ACCESS_COOKIE)?.value;
  if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const upstream = await fetch(`${getApiBaseUrl()}/requests/${requestId}/documents/${documentId}/download`, {
    headers: { authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!upstream.ok) {
    return NextResponse.json({ message: 'Download failed' }, { status: upstream.status });
  }
  const blob = await upstream.arrayBuffer();
  const contentType = upstream.headers.get('content-type') ?? 'application/octet-stream';
  const disposition = upstream.headers.get('content-disposition');
  return new NextResponse(blob, {
    status: 200,
    headers: {
      'content-type': contentType,
      ...(disposition ? { 'content-disposition': disposition } : {}),
    },
  });
}
