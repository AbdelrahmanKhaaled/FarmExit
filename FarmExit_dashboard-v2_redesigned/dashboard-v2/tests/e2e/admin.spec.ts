import { expect, test } from '@playwright/test';

test('admin console redirects unauthenticated users to login', async ({ page }) => {
  const response = await page.goto('/en/admin');
  expect(response?.status()).toBeLessThan(400);
  await expect(page).toHaveURL(/\/en\/admin\/login/);
});

test('arabic admin console redirects unauthenticated users to login', async ({ page }) => {
  const response = await page.goto('/ar/admin');
  expect(response?.status()).toBeLessThan(400);
  await expect(page).toHaveURL(/\/ar\/admin\/login/);
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
});

test('admin login page renders branded form', async ({ page }) => {
  const response = await page.goto('/en/admin/login');
  expect(response?.status()).toBe(200);
  await expect(page.getByRole('heading', { name: /Administration/i })).toBeVisible();
  await expect(page.getByLabel(/Email/i)).toBeVisible();
  await expect(page.getByLabel(/^Password$/i)).toBeVisible();
});

test('admin login shows invalid email validation', async ({ page }) => {
  await page.goto('/en/admin/login');
  await page.getByLabel(/Email/i).fill('not-an-email');
  await page.getByLabel(/^Password$/i).fill('SecretPassword1');
  await page.getByRole('button', { name: /Sign in/i }).click();
  await expect(page.locator('p[role="alert"]')).toContainText(/valid email/i);
});

test('admin login shows rate limit message from API', async ({ page }) => {
  await page.route('**/api/admin/auth/login', async (route) => {
    await route.fulfill({
      status: 429,
      contentType: 'application/json',
      body: JSON.stringify({
        message: 'Too many requests. Try again later',
        retryAfterSeconds: 120,
      }),
    });
  });
  await page.goto('/en/admin/login');
  await page.getByLabel(/Email/i).fill('admin@farmexit.test');
  await page.getByLabel(/^Password$/i).fill('SecretPassword1');
  await page.getByRole('button', { name: /Sign in/i }).click();
  await expect(page.locator('p[role="alert"]')).toContainText(/120/);
});

test('admin login RTL', async ({ page }, testInfo) => {
  test.skip(testInfo.project.metadata.locale !== 'ar', 'Arabic locale project only');
  await page.goto('/ar/admin/login');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.getByRole('heading', { name: 'لوحة الإدارة' })).toBeVisible();
});
