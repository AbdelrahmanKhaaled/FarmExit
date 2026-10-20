import { NextResponse } from 'next/server';
import { fetchAuthMe } from '@/lib/auth/session.server';
import { readBffAccessToken } from '@/lib/api/bff-auth';

export async function GET() {
  const accessToken = await readBffAccessToken();
  if (!accessToken) {
    return NextResponse.json({ code: 'UNAUTHORIZED' }, { status: 401 });
  }
  const user = await fetchAuthMe(accessToken);
  if (!user) {
    return NextResponse.json({ code: 'UNAUTHORIZED' }, { status: 401 });
  }
  return NextResponse.json(user);
}
