import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';

// Only an explicitly selected development account with the EXISTING allowlisted
// fixed OTP configuration may be used. No auth bypass, SMS delivery or saved tokens.
function developmentAccount() {
  const mobile = process.env.FX_E2E_MOBILE;
  if (!mobile) return null;
  try {
    const source = readFileSync(resolve(process.cwd(), '../api/.env'), 'utf8');
    const value = (key: string) =>
      source
        .match(new RegExp(`^${key}=(.*)$`, 'm'))?.[1]
        ?.trim()
        .replace(/^['"]|['"]$/g, '');
    if (value('NODE_ENV') !== 'development' || value('DEV_FIXED_OTP_ENABLED') !== 'true') return null;
    const code = value('DEV_FIXED_OTP_CODE');
    const normalize = (number: string) => number.replace(/^0/, '+20');
    const allowed = (value('DEV_FIXED_OTP_ALLOWED_MOBILES') ?? '').split(',').map((entry) => normalize(entry.trim()));
    if (!code || !/^\d{6}$/.test(code) || !allowed.includes(normalize(mobile))) return null;
    return { mobile, code };
  } catch {
    return null;
  }
}

test.use({ trace: 'off', screenshot: 'off', video: 'off' });

test.describe('Phase 10 authenticated development session', () => {
  test('real OTP, private portal reads, session rotation and logout', async ({ page, context }, info) => {
    test.skip(info.project.name !== 'desktop-en', 'Run once to respect OTP cooldown and hourly limits.');
    const account = developmentAccount();
    test.skip(!account, 'Requires FX_E2E_MOBILE and existing development-only fixed OTP allowlist in api/.env.');
    if (!account) return;
    const issued = await context.request.post('/api/auth/otp/request', { data: { mobile: account.mobile } });
    expect(issued.status()).toBe(200);
    const verified = await context.request.post('/api/auth/otp/verify', { data: account });
    expect(verified.status()).toBe(200);
    const body = await verified.json();
    try {
      expect(body.accessToken).toBeUndefined();
      expect(body.refreshToken).toBeUndefined();
      const cookies = await context.cookies();
      expect(cookies.filter((cookie) => cookie.name.startsWith('fx_web_')).length).toBe(2);
      expect(
        cookies
          .filter((cookie) => cookie.name.startsWith('fx_web_'))
          .every((cookie) => cookie.httpOnly && cookie.sameSite === 'Lax'),
      ).toBeTruthy();
      await page.goto('/en/my');
      if (!body.user.profileCompleted) {
        await page.goto('/en/auth/complete-profile');
        await expect(page.getByRole('heading', { name: 'One last step' })).toBeVisible();
        test.skip(
          true,
          'Profile completion writes require a dedicated new-user fixture; existing account is preserved.',
        );
      }
      for (const path of [
        '/my',
        '/my/farms',
        '/my/management',
        '/my/professional',
        '/my/partnerships',
        '/my/applications',
        '/my/proposals',
        '/my/messages',
        '/my/documents',
        '/my/notifications',
      ]) {
        const response = await page.goto(`/en${path}`);
        expect(response?.status(), path).toBe(200);
        expect(new URL(page.url()).pathname).toBe(`/en${path}`);
      }
      // Remove only the short-lived access cookie, retaining the real refresh secret.
      await context.clearCookies({ name: 'fx_web_at' });
      await page.goto('/en/my');
      await expect(page).toHaveURL(/\/en\/my$/);
      expect((await context.request.get('/api/auth/me')).status()).toBe(200);
      const logout = await context.request.post('/api/auth/logout');
      expect(logout.ok()).toBeTruthy();
      await page.goto('/en/my');
      await expect(page).toHaveURL(/\/en\/sign-in/);
    } finally {
      await context.request.post('/api/auth/logout');
    }
  });
});
