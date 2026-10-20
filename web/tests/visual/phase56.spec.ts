import { test, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { isolatePhase6 } from './phase6-fixtures';
const stage = process.env.FX_CAPTURE_STAGE ?? 'after';
const output = resolve(__dirname, '../../artifacts/phase5-6-fixes', stage);
for (const locale of ['en', 'ar'])
  for (const width of [1440, 1024, 390]) {
    test(`${locale} layout at ${width}`, async ({ page }) => {
      await mkdir(output, { recursive: true });
      await page.setViewportSize({ width, height: width === 1024 ? 1366 : width === 390 ? 844 : 900 });
      await isolatePhase6(page, locale);
      const geometry: Record<string, unknown> = {};
      for (const screen of ['wizard?step=1', 'wizard?step=2', 'wizard?step=3', 'wizard?step=4', 'farms', 'portal']) {
        await page.goto(`/${locale}/${screen === 'portal' ? 'phase5/overview' : 'phase6/' + screen}`, {
          waitUntil: 'networkidle',
        });
        await page.evaluate(() => document.fonts.ready);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBeTruthy();
        const key = screen.replace('?step=', '-');
        const measurement = await page.evaluate(() => {
          const actions = document.querySelector('[data-testid=wizard-actions]');
          const grid =
            actions?.parentElement?.parentElement ?? document.querySelector('[data-testid=my-farmexit] > div');
          return {
            columns: grid ? getComputedStyle(grid).gridTemplateColumns : null,
            children: grid
              ? Array.from(grid.children).map((e) => ({
                  x: e.getBoundingClientRect().x,
                  y: e.getBoundingClientRect().y,
                  width: e.getBoundingClientRect().width,
                  display: getComputedStyle(e).display,
                }))
              : [],
            actionPosition: actions ? getComputedStyle(actions).position : null,
          };
        });
        geometry[key] = measurement;
        if (stage === 'after') {
          const children = measurement.children.filter((c) => c.display !== 'none');
          if (width === 1440) {
            expect(children).toHaveLength(screen.startsWith('wizard') ? 3 : 2);
            expect(new Set(children.map((c) => Math.round(c.y))).size).toBe(1);
            expect(children[0]!.x < children[1]!.x).toBe(locale === 'en');
            expect(measurement.columns).toBe(screen.startsWith('wizard') ? '296px 656px 264px' : '310px 978px');
          }
          if (screen.startsWith('wizard')) {
            expect(measurement.actionPosition).toBe('static');
            const action = page.getByTestId('wizard-actions');
            await action.scrollIntoViewIfNeeded();
            const previous = await action.evaluate(
              (e) => e.previousElementSibling?.getBoundingClientRect().bottom ?? 0,
            );
            expect((await action.boundingBox())!.y).toBeGreaterThanOrEqual(previous);
            await page.evaluate(() => window.scrollTo(0, 0));
          }
          if (screen === 'wizard?step=2') {
            await expect(page.locator('[name=nearestMainRoad]')).toBeEnabled();
            await expect(page.locator('[name=roadDistanceKm]')).toBeEnabled();
            await expect(
              page.getByRole('button', { name: locale === 'ar' ? 'تحديد الموقع' : 'Place pin', exact: true }),
            ).toBeVisible();
          }
          if (screen === 'wizard?step=3') await expect(page.locator('select[name=energySource]')).toHaveCount(0);
          if (screen === 'portal' && locale === 'ar') {
            for (const arrow of await page.locator('.fx-workspace a.group svg').all()) {
              expect(await arrow.evaluate((e) => getComputedStyle(e).rotate)).toBe('none');
              expect(await arrow.evaluate((e) => getComputedStyle(e).scale)).toMatch(/^-/);
            }
          }
        }
        await page.screenshot({ path: resolve(output, `${locale}-${width}-${key}.png`), fullPage: true });
      }
      await writeFile(resolve(output, `${locale}-${width}-geometry.json`), JSON.stringify(geometry, null, 2));
    });
  }

test('supported optional fields persist; unchanged private location never enters a save payload', async ({ page }) => {
  const requests = await isolatePhase6(page);
  await page.goto('/en/phase6/wizard?step=2');
  const land = page.locator('details').filter({ hasText: 'Soil type and anything buyers' });
  await expect(land).not.toHaveAttribute('open');
  await land.locator('summary').click();
  await page.locator('[name=soilType]').fill('Sandy loam');
  await land.locator('summary').click();
  await land.locator('summary').click();
  await expect(page.locator('[name=soilType]')).toHaveValue('Sandy loam');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  const production = page.locator('details').filter({ hasText: 'What is grown today' });
  await production.locator('summary').click();
  await page.locator('[name=currentProduction]').fill('Owner-stated harvest');
  await page.getByRole('checkbox', { name: 'Palms', exact: true }).check();
  const highlights = page.locator('details').filter({ hasText: 'Up to three things' });
  await highlights.locator('summary').click();
  await page.locator('[name=highlight1]').fill('Owner-stated highlight');
  const panel = page.getByTestId('farm-facilities-panel');
  await panel.locator('summary').filter({ hasText: 'Add another facility' }).click();
  await panel.getByRole('radio').nth(1).check();
  await panel.locator('[name=name]').fill('Owner-stated storage');
  await panel.getByRole('button', { name: 'Add facility', exact: true }).click();
  await expect(panel.getByText('Owner-stated storage', { exact: true })).toBeVisible();
  await expect(panel.getByRole('radio').nth(1)).not.toBeChecked();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  expect(requests.find((r) => r.method === 'PATCH' && r.url === '/api/farms/1001')?.body).toMatchObject({
    soilType: 'Sandy loam',
    energySource: 'electricity',
  });
  expect(requests.find((r) => r.url.endsWith('/specifications') && r.method === 'PATCH')?.body).toMatchObject({
    cropTypes: ['citrus', 'palms'],
    productionDetails: { currentProduction: 'Owner-stated harvest' },
  });
  expect(requests.find((r) => r.url === '/api/listing-requests/2001' && r.method === 'PATCH')?.body).toMatchObject({
    highlights: ['Owner-stated highlight'],
  });
  expect(JSON.stringify(requests.filter((r) => r.method !== 'GET'))).not.toMatch(
    /nearestMainRoad|roadDistanceKm|latitude|longitude/,
  );
});
