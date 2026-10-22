import { test, expect } from '@playwright/test';

test.describe('stage9c communication case open', () => {
  test('opens case and navigates with locale', async ({ page }) => {
    let posts = 0;
    await page.route('**/api/communication/cases', async (route) => {
      if (route.request().method() === 'POST') {
        posts += 1;
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: '77',
            requestId: '9001',
            status: 'open',
            assignedStaffId: '1',
            createdAt: null,
            closedAt: null,
          }),
        });
        return;
      }
      await route.continue();
    });
    await page.goto('/ar/stage9c', { waitUntil: 'networkidle' });
    const button = page.getByTestId('open-communication-case').getByRole('button');
    await button.click();
    await expect(page).toHaveURL(/\/ar\/my\/messages\/77/);
    expect(posts).toBe(1);
  });

  test('dedupes overlapping open calls', async ({ page }) => {
    let posts = 0;
    await page.route('**/api/communication/cases', async (route) => {
      if (route.request().method() === 'POST') {
        posts += 1;
        await new Promise((r) => setTimeout(r, 200));
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ id: '88', requestId: '9001', status: 'open', assignedStaffId: '1', createdAt: null, closedAt: null }),
        });
        return;
      }
      await route.continue();
    });
    await page.goto('/en/stage9c');
    const button = page.getByTestId('open-communication-case').getByRole('button');
    await Promise.all([button.click(), button.click()]);
    await expect.poll(() => posts).toBe(1);
  });

  test('no case agent shows localized error', async ({ page }) => {
    await page.route('**/api/communication/cases', (route) =>
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'A case agent must be assigned to this request before communication can begin' }),
      }),
    );
    await page.goto('/en/stage9c');
    await page.getByTestId('open-communication-case').getByRole('button').click();
    await expect(page.getByTestId('open-communication-case').getByRole('alert')).toContainText(/case agent/i);
    await expect(page).toHaveURL(/\/en\/stage9c/);
  });

  test('403 stays on page', async ({ page }) => {
    await page.route('**/api/communication/cases', (route) =>
      route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ message: 'Forbidden' }) }),
    );
    await page.goto('/en/stage9c');
    await page.getByTestId('open-communication-case').getByRole('button').click();
    await expect(page.getByTestId('open-communication-case').getByRole('alert')).toBeVisible();
    await expect(page).toHaveURL(/\/en\/stage9c/);
  });
});
