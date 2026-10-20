import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
const output = resolve(__dirname, process.env.FX_VISUAL_OUTPUT ?? '../../artifacts/phase5/screenshots');
for (const locale of ['en', 'ar'])
  for (const width of [1440, 1024, 390]) {
    test(`${locale} authentication and portal at ${width}`, async ({ page }, info) => {
      await mkdir(output, { recursive: true });
      await page.setViewportSize({ width, height: width === 1024 ? 1366 : width === 390 ? 844 : 900 });
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      let requestedMobile = '';
      await page.route('**/api/**', async (route) => {
        const url = new URL(route.request().url());
        if (url.pathname === '/api/auth/otp/request') {
          requestedMobile = route.request().postDataJSON().mobile;
          return route.fulfill({ json: { resendAfterSeconds: 60 } });
        }
        if (url.pathname === '/api/auth/otp/verify')
          return route.fulfill({ status: 400, json: { message: 'Visual test: invalid OTP' } });
        if (url.pathname === '/api/communication/cases/visual-case')
          return route.fulfill({
            json: { id: 'visual-case', requestId: 'FX-VISUAL-001', status: 'open', closedAt: null },
          });
        if (url.pathname.endsWith('/messages'))
          return route.fulfill({
            json: {
              items: [
                {
                  id: 'one',
                  senderId: 'staff',
                  body: locale === 'ar' ? 'التواصل مع فريق FarmExit فقط.' : 'Communication is through FarmExit.',
                  sentAt: null,
                  isRelayedCopy: false,
                },
                {
                  id: 'two',
                  senderId: 'visual-user',
                  body: locale === 'ar' ? 'شكراً لفريق FarmExit.' : 'Thank you, FarmExit.',
                  sentAt: null,
                  isRelayedCopy: false,
                },
              ],
            },
          });
        if (url.pathname === '/api/communication/cases') return route.fulfill({ json: { items: [] } });
        return route.fulfill({ status: 401, json: { message: 'Isolated visual fixture: API unavailable' } });
      });
      const capture = async (name: string) => {
        await page.evaluate(() => document.fonts.ready);
        await page.evaluate(() => {
          for (const image of document.images) image.loading = 'eager';
        });
        await page.evaluate(async () => {
          await Promise.all(Array.from(document.images).map((i) => i.decode().catch(() => undefined)));
          window.scrollTo(0, 0);
        });
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
          `${name} horizontal overflow`,
        ).toBe(true);
        const path = resolve(output, `${locale}-${width}-${name}.png`);
        await page.screenshot({ path, fullPage: true, animations: 'disabled' });
        await info.attach(name, { path, contentType: 'image/png' });
      };
      await page.goto(`/${locale}/phase5/login`, { waitUntil: 'networkidle' });
      await expect(page.getByTestId('sign-in-form')).toBeVisible();
      await capture('login');
      await page.locator('input[type=tel]').fill('1000000000');
      await page.locator('form button[type=submit]').click();
      await expect(page.locator('input[autocomplete=one-time-code]')).toBeVisible();
      expect(requestedMobile).toBe('+201000000000');
      await capture('otp');
      const inputs = page.locator('input[inputmode=numeric]');
      for (let i = 0; i < 6; i++) await inputs.nth(i).fill(String(i + 1));
      await page.locator('form button[type=submit]').click();
      await expect(page.locator('form').getByRole('alert')).toBeVisible();
      await capture('otp-error');
      for (const screen of [
        'modal',
        'profile',
        'overview',
        'requests',
        'empty',
        'messages',
        'conversation',
        'verification',
        'confirmation',
        'success',
        'saved',
        'account-profile',
        'documents',
        'notifications',
      ]) {
        await page.goto(`/${locale}/phase5/${screen}`, { waitUntil: 'networkidle' });
        if (screen === 'modal') await expect(page.getByRole('dialog')).toBeVisible();
        if (screen === 'confirmation') await expect(page.locator('textarea')).toHaveCount(0);
        if (screen === 'messages') await expect(page.getByTestId('messages-empty')).toBeVisible();
        if (screen === 'conversation') await expect(page.getByTestId('message-staff')).toBeVisible();
        if (screen === 'verification' && width === 390) {
          for (const card of await page.getByTestId('verification-card').all()) {
            const heading = await card.getByRole('heading').boundingBox();
            const action = await card.getByRole('link').boundingBox();
            expect(heading && action && action.y > heading.y + heading.height).toBeTruthy();
          }
        }
        await capture(screen);
        if (
          width === 390 &&
          ['overview', 'requests', 'empty', 'messages', 'conversation', 'verification', 'confirmation'].includes(screen)
        ) {
          await expect(page.locator('nav.fixed')).toBeVisible();
          await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
          const footer = await page.locator('footer').boundingBox();
          const nav = await page.locator('nav.fixed').boundingBox();
          expect(footer && nav && footer.y + footer.height <= nav.y + 1).toBeTruthy();
        }
      }
      expect(errors).toEqual([]);
    });
  }
