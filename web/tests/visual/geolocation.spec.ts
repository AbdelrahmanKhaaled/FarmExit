import { test, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { isolatePhase6 } from './phase6-fixtures';

const output = resolve(__dirname, '../../artifacts/stage1b');
for (const locale of ['en', 'ar'])
  for (const width of [1440, 1024, 390]) {
    test(`location ${locale} ${width}: select/save/restore/edit/clear and preserved layout`, async ({ page }) => {
      await mkdir(output, { recursive: true });
      await page.setViewportSize({ width, height: width === 1024 ? 1366 : width === 390 ? 844 : 900 });
      const mutations = await isolatePhase6(page, locale);
      await page.goto(`/${locale}/phase6/wizard?step=2`);
      const map = page.getByRole('region', {
        name: locale === 'en' ? 'Farm location on the map' : 'موقع المزرعة على الخريطة',
      });
      await expect(map).toHaveClass(/leaflet-container/);
      await expect(page.locator('[name=nearestMainRoad]')).toBeEnabled();
      await map.click({ position: { x: 120, y: 140 } });
      await expect(page.getByTestId('selected-coordinates')).toBeVisible();
      const coordinates = await page.getByTestId('selected-coordinates').textContent();
      await page.locator('[name=nearestMainRoad]').fill(locale === 'ar' ? 'طريق الاختبار' : 'Test main road');
      await page.locator('[name=roadDistanceKm]').fill('2.75');
      await page.getByRole('button', { name: locale === 'ar' ? 'متابعة' : 'Continue', exact: true }).click();
      await expect(page.locator('[name=waterSource]')).toBeVisible();
      expect(
        mutations.find((value) => value.url.endsWith('/private-location') && value.method === 'PATCH')?.body,
      ).toMatchObject({ roadDistanceKm: 2.75 });
      // Fresh mount fetches the persisted fixture contract, rather than retaining component state.
      await page.goto(`/${locale}/phase6/wizard?step=2`);
      await expect(page.getByTestId('selected-coordinates')).toHaveText(coordinates!);
      await expect(page.locator('[name=roadDistanceKm]')).toHaveValue('2.75');
      await expect(map).toHaveClass(/leaflet-container/);
      await expect(page.locator('.leaflet-marker-icon')).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(1000);
      await page.evaluate(() => window.scrollTo(0, 0));
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      const geometry = await page.getByTestId('wizard-actions').evaluate((actions) => {
        const grid = actions.parentElement!.parentElement!;
        return {
          columns: getComputedStyle(grid).gridTemplateColumns,
          actionPosition: getComputedStyle(actions).position,
          children: Array.from(grid.children).map((child) => {
            const box = child.getBoundingClientRect();
            return { x: box.x, y: box.y, width: box.width };
          }),
        };
      });
      if (width === 1440) expect(geometry.columns).toBe('296px 656px 264px');
      if (width === 1024) expect(geometry.columns).toBe('680px 240px');
      expect(geometry.actionPosition).toBe('static');
      await writeFile(resolve(output, `${locale}-${width}-geometry.json`), JSON.stringify(geometry, null, 2));
      await page.screenshot({ path: resolve(output, `${locale}-${width}-after.png`), fullPage: true });
      // Moving a marker uses the real Leaflet drag handler.
      const marker = page.locator('.leaflet-marker-icon');
      const box = (await marker.boundingBox())!;
      await page.mouse.move(box.x + 20, box.y + 20);
      await page.mouse.down();
      await page.mouse.move(box.x + 45, box.y + 35, { steps: 8 });
      await page.mouse.up();
      await expect(page.getByTestId('selected-coordinates')).not.toHaveText(coordinates!);
      await page.getByRole('button', { name: locale === 'ar' ? 'مسح الموقع' : 'Clear pin', exact: true }).click();
      await page.locator('[name=nearestMainRoad]').fill('');
      await page.locator('[name=roadDistanceKm]').fill('');
      await page.getByRole('button', { name: locale === 'ar' ? 'متابعة' : 'Continue', exact: true }).click();
      await expect(page.locator('[name=waterSource]')).toBeVisible();
      await page.goto(`/${locale}/phase6/wizard?step=2`);
      await expect(page.locator('[name=nearestMainRoad]')).toBeEnabled();
      await expect(page.getByTestId('selected-coordinates')).toHaveCount(0);
      await expect(page.locator('[name=roadDistanceKm]')).toHaveValue('');
    });
  }

test('location read/save failures remain visible and never claim persistence', async ({ page }) => {
  await isolatePhase6(page);
  let failRead = true;
  await page.route('**/api/farms/*/private-location', async (route) => {
    if (route.request().method() === 'GET' && !failRead) return route.fallback();
    return route.fulfill({ status: 503, json: { message: 'Unavailable' } });
  });
  await page.goto('/en/phase6/wizard?step=2');
  await expect(page.getByText('Saved location could not load. Retry before editing or saving.')).toBeVisible();
  await expect(page.locator('[name=nearestMainRoad]')).toBeDisabled();
  failRead = false;
  await page.getByRole('button', { name: 'Retry loading location' }).click();
  await expect(page.locator('[name=nearestMainRoad]')).toBeEnabled();
  await page.locator('[name=nearestMainRoad]').fill('Unsaved road');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByTestId('add-farm-wizard').getByRole('alert')).toContainText('Could not save');
  await expect(page.locator('[name=nearestMainRoad]')).toHaveValue('Unsaved road');
});

test('real MySQL: map selection and save survive reload through API 4001', async ({ page, request }) => {
  test.skip(
    !process.env.GEO_OWNER_TOKEN || !process.env.GEO_FARM_ID,
    'Launched only by dedicated MySQL integration test',
  );
  await isolatePhase6(page);
  const endpoint = `http://127.0.0.1:4001/api/v1/farms/${process.env.GEO_FARM_ID}/private-location`;
  const headers = { Authorization: `Bearer ${process.env.GEO_OWNER_TOKEN}` };
  await page.route('**/api/farms/*/private-location', async (route) => {
    const response = await request.fetch(endpoint, {
      method: route.request().method(),
      headers,
      ...(route.request().method() === 'PATCH' ? { data: route.request().postDataJSON() } : {}),
    });
    return route.fulfill({ response });
  });
  await page.goto('/en/phase6/wizard?step=2');
  const map = page.getByRole('region', { name: 'Farm location on the map' });
  await expect(page.locator('[name=nearestMainRoad]')).toBeEnabled();
  await expect(map).toHaveClass(/leaflet-container/);
  await map.click({ position: { x: 150, y: 160 } });
  const coordinates = await page.getByTestId('selected-coordinates').textContent();
  await page.locator('[name=nearestMainRoad]').fill('Browser test road');
  await page.locator('[name=roadDistanceKm]').fill('4.25');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.locator('[name=waterSource]')).toBeVisible();
  await page.goto('/en/phase6/wizard?step=2');
  await expect(page.getByTestId('selected-coordinates')).toHaveText(coordinates!);
  await expect(page.locator('[name=nearestMainRoad]')).toHaveValue('Browser test road');
  await expect(page.locator('[name=roadDistanceKm]')).toHaveValue('4.25');
  await mkdir(output, { recursive: true });
  await page.screenshot({ path: resolve(output, 'real-mysql-reload.png'), fullPage: true });
});
