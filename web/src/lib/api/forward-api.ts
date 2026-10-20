import { getApiBaseUrl } from './config';

export function clientIpFromRequest(request: Request): string | undefined {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  return request.headers.get('x-real-ip')?.trim() ?? undefined;
}

export async function fetchFarmExitApi(
  request: Request,
  path: string,
  init: RequestInit & { json?: unknown; accessToken?: string },
): Promise<Response> {
  const headers = new Headers(init.headers);
  const isMultipart = typeof FormData !== 'undefined' && init.body instanceof FormData;
  if (!isMultipart) headers.set('accept', 'application/json');
  if (init.accessToken) headers.set('authorization', `Bearer ${init.accessToken}`);
  if (!headers.has('content-type') && init.json !== undefined) {
    headers.set('content-type', 'application/json');
  }
  const ip = clientIpFromRequest(request);
  if (ip) headers.set('x-forwarded-for', ip);
  const ua = request.headers.get('user-agent');
  if (ua) headers.set('user-agent', ua);

  const url = `${getApiBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`;
  try {
    return await fetch(url, {
      ...init,
      headers,
      body: init.json !== undefined ? JSON.stringify(init.json) : init.body,
      cache: 'no-store',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'fetch failed';
    return new Response(JSON.stringify({ code: 'API_UNAVAILABLE', message }), {
      status: 503,
      headers: { 'content-type': 'application/json' },
    });
  }
}
