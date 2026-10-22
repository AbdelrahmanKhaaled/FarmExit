function stripTrailingSlash(value: string): string {
  return value.replace(/\/$/, '');
}

function originFromApiBase(apiBase: string): string {
  const url = new URL(stripTrailingSlash(apiBase));
  url.pathname = url.pathname.replace(/\/api\/v1\/?$/, '');
  if (!url.pathname || url.pathname === '/') return url.origin;
  return stripTrailingSlash(`${url.origin}${url.pathname}`);
}

/**
 * Socket.IO server origin for the browser (scheme + host + port).
 * Set `NEXT_PUBLIC_FARMEXIT_REALTIME_ORIGIN` or `NEXT_PUBLIC_FARMEXIT_API_URL`.
 */
export function getRealtimeSocketOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_FARMEXIT_REALTIME_ORIGIN?.trim();
  if (explicit) return stripTrailingSlash(explicit);

  const apiPublic = process.env.NEXT_PUBLIC_FARMEXIT_API_URL?.trim();
  if (apiPublic) return originFromApiBase(apiPublic);

  if (process.env.NODE_ENV === 'development') {
    return 'http://127.0.0.1:4001';
  }

  return '';
}
