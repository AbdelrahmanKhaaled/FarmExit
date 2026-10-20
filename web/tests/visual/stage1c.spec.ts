import { test, expect } from '@playwright/test';
import { isolatePhase6 } from './phase6-fixtures';
for (const locale of ['en', 'ar'])
  for (const width of [1440, 1024, 390]) {
    test(`Figma controls ${locale} ${width}: multi-select amenities and availability radios`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      const mutations = await isolatePhase6(page, locale);
      await page.goto(`/${locale}/phase6/wizard?step=2`);
      await expect(page.locator('select[name=governorate]')).toHaveValue('Beni Suef');
      await expect(page.locator('[name=nearestMainRoad]')).toBeEnabled();
      await page.getByTestId('wizard-actions').getByRole('button').last().click();
      await expect(page.locator('input[name=amenities]')).toHaveCount(6);
      await page.locator('input[name=amenities][value=irrigationNetwork]').check();
      await page.locator('input[name=amenities][value=powerConnection]').check();
      await page.getByTestId('wizard-actions').getByRole('button').last().click();
      await expect(page.locator('input[name=availability]').first()).toBeVisible();
      expect(
        mutations.find((value) => value.url.endsWith('/specifications') && value.method === 'PATCH')?.body,
      ).toMatchObject({ amenities: ['irrigationNetwork', 'powerConnection'] });
      await expect(page.locator('input[name=availability]')).toHaveCount(2);
      for (const radio of await page.locator('input[name=availability]').all())
        await expect(radio).toHaveAttribute('type', 'radio');
      await page.locator('input[name=availability][value="From a later date"]').check();
      await page.locator('input[name=availabilityDate]').fill('2026-11-01');
      await page.getByTestId('wizard-actions').getByRole('button').last().click();
      await expect(page.getByTestId('farm-media-panel')).toBeVisible();
      expect(
        mutations.filter((value) => value.url.includes('/listing-requests/') && value.method === 'PATCH').at(-1)?.body,
      ).toMatchObject({ availability: 'From 2026-11-01' });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    });
  }
test('invalid basics and a missing later availability date show field validation', async ({ page }) => {
  await isolatePhase6(page);
  await page.goto('/en/phase6/new');
  await page.locator('input[name=name]').fill('Validation test');
  await page.locator('input[name=areaFeddan]').fill('0');
  await page.getByTestId('wizard-actions').getByRole('button').last().click();
  await expect(page.locator('input[name=areaFeddan]')).toHaveAttribute('aria-invalid', 'true');
  await expect(
    page
      .locator('label')
      .filter({ has: page.locator('input[name=farmType]') })
      .first(),
  ).toHaveClass(/border-status-favorite/);
  await page.goto('/en/phase6/wizard?step=4');
  await page.locator('input[name=availability][value="From a later date"]').check();
  await page.getByTestId('wizard-actions').getByRole('button').last().click();
  await expect(page.locator('input[name=availabilityDate]')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('input[name=availabilityDate]')).toBeVisible();
});

test('confirmed document upload remains confirmed if only its metadata refresh fails', async ({ page }) => {
  const mutations = await isolatePhase6(page);
  let uploaded = false;
  await page.route('**/api/requests/*/documents', async (route) => {
    if (uploaded && route.request().method() === 'GET')
      return route.fulfill({ status: 503, json: { message: 'Unavailable' } });
    if (route.request().method() === 'POST') uploaded = true;
    return route.fallback();
  });
  await page.goto('/en/phase6/wizard?step=6');
  const panel = page.getByTestId('request-documents-panel');
  await panel.locator('summary').filter({ hasText: 'Additional documents' }).click();
  await expect(panel.locator('input[name=slotKey]')).toHaveCount(0);
  await panel
    .getByTestId('document-file')
    .setInputFiles({ name: 'confirmed.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\nunit test') });
  await panel.locator('button[type=submit]').click();
  await expect(panel.getByRole('alert')).toContainText('Upload confirmed');
  await expect(panel.getByRole('status')).toHaveText('Uploaded');
  await expect(panel.getByTestId('document-file')).toHaveValue('');
  expect(mutations.filter((value) => value.url.endsWith('/documents') && value.method === 'POST')).toHaveLength(1);
});
test('malformed successful upload responses never claim storage confirmation', async ({ page }) => {
  await isolatePhase6(page);
  await page.route('**/api/requests/*/documents', async (route) =>
    route.request().method() === 'POST' ? route.fulfill({ json: { id: '12' } }) : route.fallback(),
  );
  await page.goto('/en/phase6/wizard?step=6');
  const panel = page.getByTestId('request-documents-panel');
  await panel.locator('summary').filter({ hasText: 'Additional documents' }).click();
  await panel.getByTestId('document-file').setInputFiles({
    name: 'unconfirmed.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4\nunit test'),
  });
  await panel.locator('button[type=submit]').click();
  await expect(panel.getByRole('alert')).toContainText('Upload was not confirmed');
  await expect(panel.getByTestId('document-file')).not.toHaveValue('');
});
