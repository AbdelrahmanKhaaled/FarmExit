import { expect, test } from '@playwright/test';

test.describe('admin shell layout', () => {
  test('authenticated overview shows sidebar on desktop EN', async ({ page }, testInfo) => {
    test.skip(testInfo.project.metadata.locale !== 'en', 'English project only');
    test.skip(!process.env.DASHBOARD_E2E_EMAIL || !process.env.DASHBOARD_E2E_PASSWORD, 'Set DASHBOARD_E2E_EMAIL/PASSWORD');

    await page.goto('/en/admin/login');
    await page.getByLabel(/Email/i).fill(process.env.DASHBOARD_E2E_EMAIL!);
    await page.getByLabel(/^Password$/i).fill(process.env.DASHBOARD_E2E_PASSWORD!);
    await page.getByRole('button', { name: /Sign in/i }).click();
    await expect(page).toHaveURL(/\/en\/admin\/?$/);

    const sidebar = page.getByTestId('admin-sidebar');
    await expect(sidebar).toBeVisible();
    const box = await sidebar.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeLessThan(80);
  });

  test('authenticated overview shows sidebar on desktop AR (inline-end)', async ({ page }, testInfo) => {
    test.skip(testInfo.project.metadata.locale !== 'ar', 'Arabic project only');
    test.skip(!process.env.DASHBOARD_E2E_EMAIL || !process.env.DASHBOARD_E2E_PASSWORD, 'Set DASHBOARD_E2E_EMAIL/PASSWORD');

    await page.goto('/ar/admin/login');
    await page.getByLabel(/البريد/i).fill(process.env.DASHBOARD_E2E_EMAIL!);
    await page.getByLabel(/كلمة المرور/i).fill(process.env.DASHBOARD_E2E_PASSWORD!);
    await page.getByRole('button', { name: /تسجيل الدخول/i }).click();
    await expect(page).toHaveURL(/\/ar\/admin\/?$/);
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');

    const sidebar = page.getByTestId('admin-sidebar');
    await expect(sidebar).toBeVisible();
    const box = await sidebar.boundingBox();
    const viewport = page.viewportSize();
    expect(box).not.toBeNull();
    expect(viewport).not.toBeNull();
    expect(box!.x + box!.width).toBeGreaterThan(viewport!.width - 80);
  });
});
