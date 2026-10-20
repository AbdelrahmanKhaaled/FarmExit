import { test, expect } from '@playwright/test';
test('standalone OTP keeps Egyptian normalization, error feedback and returnTo', async ({ page }, info) => {
  const locale = info.project.metadata.locale === 'ar' ? 'ar' : 'en';
  const target = `/${locale}/my/requests`;
  let payload: unknown;
  await page.route('**/api/auth/otp/request', (route) => {
    payload = route.request().postDataJSON();
    return route.fulfill({ json: { resendAfterSeconds: 60 } });
  });
  await page.route('**/api/auth/otp/verify', (route) =>
    route.fulfill({ status: 400, json: { message: 'Invalid code' } }),
  );
  await page.goto(`/${locale}/sign-in?returnTo=${encodeURIComponent(target)}`);
  await expect(page.getByTestId('auth-screen')).toBeVisible();
  await page.locator('input[type=tel]').fill('01000000000');
  await page.locator('form button[type=submit]').click();
  expect(payload).toEqual({ mobile: '+201000000000' });
  const digits = page.locator('input[inputmode=numeric]');
  await expect(digits).toHaveCount(6);
  for (let i = 0; i < 6; i++) await digits.nth(i).fill('1');
  await page.locator('form button[type=submit]').click();
  await expect(page.locator('form').getByRole('alert')).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`/${locale}/sign-in\\?returnTo=`));
});
test('soft navigation opens a dismissible login modal; refresh opens standalone login', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop-en', 'Desktop navigation checks interception once.');
  await page.goto('/en');
  await page.locator('header a[href="/en/sign-in"]:visible').click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.locator('main').first()).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page).toHaveURL(/\/en$/);
  await page.locator('header a[href="/en/sign-in"]:visible').click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.reload();
  await expect(page.getByTestId('auth-screen')).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
