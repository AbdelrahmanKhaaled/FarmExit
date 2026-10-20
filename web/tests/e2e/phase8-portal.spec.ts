import { expect, test } from '@playwright/test';

test.describe('phase 8 portal routes', () => {
  test('partnerships, applications and proposals require sign-in', async ({ page }) => {
    await page.goto('/en/my/partnerships');
    await expect(page).toHaveURL(/\/en\/sign-in/);
    await page.goto('/en/my/applications');
    await expect(page).toHaveURL(/\/en\/sign-in/);
    await page.goto('/en/my/proposals');
    await expect(page).toHaveURL(/\/en\/sign-in/);
  });
});
