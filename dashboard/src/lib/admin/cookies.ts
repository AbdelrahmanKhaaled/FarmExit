export const ADMIN_ACCESS_COOKIE = 'fx_admin_at';
export const ADMIN_REFRESH_COOKIE = 'fx_admin_rt';

export const adminCookieOptions = (maxAgeSeconds: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: maxAgeSeconds,
});
