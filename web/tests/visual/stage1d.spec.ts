import { test, expect } from '@playwright/test';
import { isolatePhase7 } from './phase7-fixtures';

test('public navbar stays neutral while checking the private session, then shows the real user', async ({ page }) => {
  let release!: () => void;
  const ready = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/api/auth/me', async (route) => {
    await ready;
    await route.fulfill({
      json: {
        id: 'test-only',
        fullName: 'Session Test',
        mobileE164: '+201000000000',
        email: null,
        mobileVerified: true,
        profileCompleted: true,
      },
    });
  });
  await page.goto('/en/phase7/public-navbar');
  await expect(page.getByRole('banner').locator('[aria-busy=true]')).toHaveCount(1);
  await expect(page.getByRole('link', { name: 'Sign in', exact: true })).toHaveCount(0);
  release();
  await expect(page.getByRole('link', { name: 'My FarmExit', exact: true })).toBeAttached();
  await expect(page.getByRole('banner')).toContainText('Session');
});

test('API unavailability does not claim that an authenticated visitor is a guest', async ({ page }) => {
  await page.route('**/api/auth/me', (route) => route.fulfill({ status: 503, json: { code: 'API_UNAVAILABLE' } }));
  await page.goto('/en/phase7/public-navbar');
  await expect(page.getByRole('link', { name: 'Sign in', exact: true })).toHaveCount(0);
  await expect(page.getByRole('banner').locator('[aria-busy=true]')).toHaveCount(1);
});

for (const status of [400, 401, 409])
  test(`management ${status} keeps goals, outcomes and correction text`, async ({ page }) => {
    await isolatePhase7(page);
    await page.route('**/api/farm-management-requests/7001', (route) =>
      route.fulfill({ status, json: { message: 'Test rejection' } }),
    );
    await page.goto('/en/phase7/management-wizard?step=3');
    await page.locator('[name=goals]').fill('Keep my first goal');
    await page.locator('[name=goals]').press('End');
    await page.locator('[name=goals]').press('Enter');
    await page.locator('[name=goals]').pressSequentially('Keep my second goal');
    await page
      .locator('details')
      .filter({ has: page.locator('[name=outcomes]') })
      .locator('summary')
      .click();
    await page.locator('[name=outcomes]').fill('Private expected result');
    await page.getByTestId('phase7-actions').getByRole('button', { name: 'Continue', exact: true }).click();
    await expect(page.locator('[data-phase7-task]').getByRole('alert')).toBeVisible();
    await expect(page.locator('[name=goals]')).toHaveValue('Keep my first goal\nKeep my second goal');
    await expect(page.locator('[name=outcomes]')).toHaveValue('Private expected result');
    await expect(page.locator('[data-complete=true]')).toHaveCount(0);
  });

test('management type is a radio choice and custom goals coexist with Figma goal checkboxes', async ({ page }) => {
  const calls = await isolatePhase7(page);
  await page.goto('/en/phase7/management-wizard?step=2');
  await page.locator('[name=managementTypes][value=productionSupervision]').check();
  await expect(page.locator('[name=managementTypes]:checked')).toHaveCount(1);
  await expect(page.locator('select[name=term]')).toBeVisible();
  await page.getByTestId('phase7-actions').getByRole('button').last().click();
  await page.locator('[name=goals]').fill('Keep this legacy goal');
  await page.getByRole('checkbox', { name: 'Raise yield per feddan', exact: true }).check();
  await expect(page.locator('[name=goals]')).toHaveValue('Keep this legacy goal');
  await page.getByTestId('phase7-actions').getByRole('button').last().click();
  expect(calls.at(-1)?.body).toMatchObject({
    managementTypes: ['productionSupervision'],
    goals: ['Raise yield per feddan', 'Keep this legacy goal'],
  });
});

test('an existing professional request under FarmExit review is resumed without creating another request', async ({
  page,
}) => {
  const calls = await isolatePhase7(page);
  await page.route('**/api/professional-verification-requests?*', (route) =>
    route.fulfill({
      json: {
        items: [
          {
            id: '7301',
            requestNumber: 'FX-VISUAL-7301',
            professionalCapabilityId: '7201',
            professionalType: 'farmManager',
            verificationSummary: 'Private summary',
            status: 'underFarmExitReview',
            reviews: [],
          },
        ],
      },
    }),
  );
  await page.goto('/en/phase7/professional-wizard?step=3');
  await page.getByTestId('phase7-actions').getByRole('button').last().click();
  await expect(page.getByTestId('phase7-tracking')).toBeVisible();
  expect(
    calls.filter((call) => call.url === '/api/professional-verification-requests' && call.method === 'POST'),
  ).toHaveLength(0);
});

test('a first-time professional creates the profile before its capability', async ({ page }) => {
  const calls = await isolatePhase7(page, { requireProfileFirst: true });
  await page.goto('/en/phase7/professional-new');
  await page.getByTestId('phase7-actions').getByRole('button').last().click();
  await expect(page.locator('[name=headline]')).toBeVisible();
  expect(calls.slice(0, 2).map(({ url, method }) => ({ url, method }))).toEqual([
    { url: '/api/professional-profile', method: 'PUT' },
    { url: '/api/professional-profile/capabilities', method: 'POST' },
  ]);
});

test('Arabic review localizes reference goal labels and preserves custom goals in the save payload', async ({ page }) => {
  const calls = await isolatePhase7(page);
  await page.goto('/ar/phase7/management-wizard?step=3');
  await page.locator('[name=goals]').fill('Custom owner goal');
  await page.getByRole('checkbox', { name: 'زيادة إنتاج الفدان', exact: true }).check();
  for (let step = 3; step <= 6; step++) await page.getByTestId('phase7-actions').getByRole('button').last().click();
  const review = page.getByTestId('management-wizard').locator(':scope > fieldset > div:not([hidden])');
  await expect(review).toContainText('زيادة إنتاج الفدان');
  await expect(review).toContainText('Custom owner goal');
  expect(calls.at(-1)?.body).toMatchObject({ goals: ['Raise yield per feddan', 'Custom owner goal'] });
});
