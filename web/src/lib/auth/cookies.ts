export const WEB_ACCESS_COOKIE = 'fx_web_at';
export const WEB_REFRESH_COOKIE = 'fx_web_rt';

export const webCookieOptions = (maxAgeSeconds: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: maxAgeSeconds,
});
