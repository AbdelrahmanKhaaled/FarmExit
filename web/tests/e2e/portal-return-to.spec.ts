import { expect, test } from '@playwright/test';

test('locale proxy handles extensionless root requests', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/(en|ar)\/?$/);
  await expect(page.locator('select[name=activity]')).toBeDisabled();
});

for (const locale of ['en', 'ar']) {
  test(`protected farm creation preserves its return URL (${locale})`, async ({ page }) => {
    const target = `/${locale}/my/farms/new`;
    await page.goto(target);
    await expect(page).toHaveURL(
      (url) => url.pathname === `/${locale}/sign-in` && url.searchParams.get('returnTo') === target,
    );
    await expect(page.locator('input[type=tel]')).toBeVisible();
  });
}
