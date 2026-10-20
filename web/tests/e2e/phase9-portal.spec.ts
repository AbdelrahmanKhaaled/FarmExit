import { expect, test } from '@playwright/test';

test.describe('phase 9 portal routes', () => {
  test('messages and farm-details requests require sign-in', async ({ page }) => {
    await page.goto('/en/my/messages');
    await expect(page).toHaveURL(/\/en\/sign-in/);
    await page.goto('/en/my/farm-details-requests/new?slug=test');
    await expect(page).toHaveURL(/\/en\/sign-in/);
  });
});
