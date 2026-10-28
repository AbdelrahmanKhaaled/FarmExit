import { expect, test } from '@playwright/test';

for (const locale of ['en', 'ar']) {
  for (const route of ['', '/analytics', '/listing-pipeline', '/farms', '/communications', '/requests']) {
    test(`${locale} ${route || 'overview'} protects unauthenticated runtime data`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      const response = await page.goto(`/${locale}/admin${route}`);
      expect(response?.status()).toBeLessThan(400);
      await expect(page).toHaveURL(new RegExp(`/${locale}/admin/login`));
      await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
      expect(errors).toEqual([]);
    });
  }
}

test('authenticated live navigation preserves the console session', async ({ page }) => {
  test.skip(
    !process.env.DASHBOARD_E2E_EMAIL || !process.env.DASHBOARD_E2E_PASSWORD,
    'Existing staff credentials required',
  );
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (/MISSING_MESSAGE|uncached data|failed: 403/.test(message.text())) errors.push(message.text());
  });
  await page.goto('/en/admin/login');
  await page.getByLabel(/Email/i).fill(process.env.DASHBOARD_E2E_EMAIL!);
  await page.getByLabel(/^Password$/i).fill(process.env.DASHBOARD_E2E_PASSWORD!);
  await page.getByRole('button', { name: /Sign in/i }).click();
  await expect(page).toHaveURL(/\/en\/admin\/?$/);
  for (const href of [
    '/admin/analytics',
    '/admin/farms',
    '/admin/requests',
    '/admin/listing-pipeline',
    '/admin/communications',
    '/admin',
  ]) {
    await page.locator(`a[href="/en${href}"]`).first().click();
    await expect(page).toHaveURL(`/en${href}`);
    await expect(page.locator('main')).toBeVisible();
  }
  await page.goto('/ar/admin/analytics');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  expect(errors).toEqual([]);
});
