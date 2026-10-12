import { expect, test } from '@playwright/test';

// Phase 0.1 smoke test: locale routing, <html lang> and <html dir> only.
// Each Playwright project declares its locale in `metadata.locale` (see playwright.config.ts):
// English runs on desktop, tablet and mobile; Arabic runs on desktop only (phase 1 scope).
const DIRECTION = { en: 'ltr', ar: 'rtl' } as const;
type TestLocale = keyof typeof DIRECTION;

test('locale root loads with the correct lang and dir', async ({ page }, testInfo) => {
  const locale = testInfo.project.metadata.locale as TestLocale;
  const dir = DIRECTION[locale];

  const response = await page.goto(`/${locale}`);
  expect(response?.status()).toBe(200);

  const html = page.locator('html');
  await expect(html).toHaveAttribute('lang', locale);
  await expect(html).toHaveAttribute('dir', dir);
  await expect(page.getByTestId('locale-root')).toBeAttached();
});
