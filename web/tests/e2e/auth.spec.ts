import { test, expect } from '@playwright/test';

test.describe('mobile auth', () => {
  test('sign-in page renders EN', async ({ page }) => {
    await page.goto('/en/sign-in');
    await expect(page.getByRole('heading', { name: /Welcome to FarmExit/i })).toBeVisible();
    await expect(page.getByLabel(/mobile number/i)).toBeVisible();
  });

  test('sign-in page renders AR', async ({ page }) => {
    await page.goto('/ar/sign-in');
    await expect(page.getByRole('heading', { name: /أهلاً بيك في FarmExit/ })).toBeVisible();
  });

  test('my portal redirects to sign-in', async ({ page }) => {
    await page.goto('/en/my');
    await expect(page).toHaveURL(/\/en\/sign-in/);
  });
});
