import { NextResponse } from 'next/server';
import { getApiBaseUrl } from '@/lib/api/config';

type Params = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { slug } = await params;
  const res = await fetch(`${getApiBaseUrl()}/marketplace/farms/${encodeURIComponent(slug)}`, {
    headers: { accept: 'application/json' },
    cache: 'no-store',
  });
  const data = await res.json().catch(() => null);
  return NextResponse.json(data ?? { message: 'not found' }, { status: res.status });
}
