/** Best-effort JWT expiry check (no signature verification — middleware hint only). */
export function isAccessTokenExpired(accessToken: string, skewSeconds = 30): boolean {
  try {
    const segment = accessToken.split('.')[1];
    if (!segment) return true;
    const payload = JSON.parse(Buffer.from(segment, 'base64url').toString('utf8')) as { exp?: number };
    if (typeof payload.exp !== 'number') return true;
    return payload.exp * 1000 < Date.now() + skewSeconds * 1000;
  } catch {
    return true;
  }
}
