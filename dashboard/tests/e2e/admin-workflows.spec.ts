import { expect, test } from '@playwright/test';

test.describe('admin workflow pages', () => {
  test('login redirects unauthenticated users from proposals', async ({ page }) => {
    await page.goto('/en/admin/proposals');
    await expect(page).toHaveURL(/\/en\/admin\/login/);
  });

  test('login redirects unauthenticated users from evaluations', async ({ page }) => {
    await page.goto('/en/admin/evaluations');
    await expect(page).toHaveURL(/\/en\/admin\/login/);
  });

  test('login redirects unauthenticated users from analytics', async ({ page }) => {
    await page.goto('/en/admin/analytics');
    await expect(page).toHaveURL(/\/en\/admin\/login/);
  });

  test('authenticated user can open proposals inbox when credentials set', async ({ page }) => {
    test.skip(!process.env.DASHBOARD_E2E_EMAIL || !process.env.DASHBOARD_E2E_PASSWORD, 'Set DASHBOARD_E2E_EMAIL/PASSWORD');

    await page.goto('/en/admin/login');
    await page.getByLabel(/Email/i).fill(process.env.DASHBOARD_E2E_EMAIL!);
    await page.getByLabel(/^Password$/i).fill(process.env.DASHBOARD_E2E_PASSWORD!);
    await page.getByRole('button', { name: /Sign in/i }).click();
    await page.goto('/en/admin/proposals');
    await expect(page.getByRole('heading', { name: /Purchase proposals/i })).toBeVisible();
    await page.goto('/ar/admin/farm-management');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.getByRole('heading', { name: /إدارة المزارع|طلبات إدارة المزارع/ })).toBeVisible();
    await page.goto('/en/admin/evaluations');
    await expect(page.getByRole('heading', { name: /FarmExit evaluations/i })).toBeVisible();
    await page.goto('/en/admin/communications');
    await expect(page.getByRole('heading', { name: /Communication center/i })).toBeVisible();
    await page.goto('/en/admin/analytics');
    await expect(page.getByRole('heading', { name: /Analytics/i })).toBeVisible();
  });
});
