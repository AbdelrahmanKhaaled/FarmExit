import { test, expect } from '@playwright/test';
import { isolatePhase6 } from './phase6-fixtures';
test('a staged facility entry survives navigation and cannot be silently dropped by wizard save', async ({ page }) => {
  const requests = await isolatePhase6(page);
  await page.goto('/en/phase6/wizard?step=3');
  const panel = page.getByTestId('farm-facilities-panel');
  await panel.getByRole('radio').first().check();
  await panel.locator('input[name=name]').fill('Owner-stated storage');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByTestId('add-farm-wizard').getByRole('alert')).toContainText('Save or clear the facility');
  expect(requests).toHaveLength(0);
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(panel.locator('input[name=name]')).toHaveValue('Owner-stated storage');
  await panel.getByRole('button', { name: 'Clear facility entry', exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Listing details', exact: true })).toBeVisible();
});
