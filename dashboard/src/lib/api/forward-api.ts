import { getApiBaseUrl } from './config';

/** Client IP for upstream rate limits when the dashboard BFF calls the Nest API. */
export function clientIpFromRequest(request: Request): string | undefined {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get('x-real-ip')?.trim();
  if (realIp) return realIp;
  return undefined;
}

export async function fetchFarmExitApi(
  request: Request,
  path: string,
  init: RequestInit & { json?: unknown },
): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set('accept', 'application/json');
  if (!headers.has('content-type') && init.json !== undefined) {
    headers.set('content-type', 'application/json');
  }
  const ip = clientIpFromRequest(request);
  if (ip) headers.set('x-forwarded-for', ip);

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
