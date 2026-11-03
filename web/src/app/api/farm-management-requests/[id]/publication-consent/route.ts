import { NextResponse } from 'next/server';
import { fetchFarmExitApi } from '@/lib/api/forward-api';
import { readBffAccessToken } from '@/lib/api/bff-auth';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const accessToken = await readBffAccessToken();
  if (!accessToken) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const res = await fetchFarmExitApi(request, `/farm-management-requests/${id}/publication-consent`, {
    method: 'POST', json: await request.json(), accessToken,
  });
  return NextResponse.json(await res.json(), { status: res.status });
}
